import type { FastifyInstance } from "fastify";
import type { Config, Dependencies } from "./config.ts";
import type {
  FeedbackInput,
  FeedbackStatus,
  FeedbackMessage,
  FeedbackPage,
} from "../../shared/site-api.ts";
import {
  feedbackIssue,
  normalizeFeedback,
} from "../../shared/feedback-validation.ts";
import { requireOwner } from "./auth.ts";
import { consumeLimit, ipKey, tokenHash, HttpError } from "./security.ts";

const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
const statuses = ["new", "read", "archived"];
const params = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", pattern: uuidPattern } },
  additionalProperties: false,
};
function cursor(value?: string): { time: string; id: string } | null {
  if (!value) return null;
  try {
    const result = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      typeof result.time !== "string" ||
      new Date(result.time).toISOString() !== result.time ||
      typeof result.id !== "string" ||
      !new RegExp(uuidPattern).test(result.id)
    )
      throw new Error();
    return result;
  } catch {
    throw new HttpError(400, "invalid_input");
  }
}
export async function registerFeedback(
  app: FastifyInstance,
  config: Config,
  deps: Dependencies,
): Promise<void> {
  app.post<{ Body: FeedbackInput }>(
    "/v1/feedback",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["id", "message"],
          properties: {
            id: { type: "string", pattern: uuidPattern },
            message: { type: "string", maxLength: 5000 },
            name: { type: "string", maxLength: 80 },
            email: { type: "string", maxLength: 254 },
            website: { type: "string", maxLength: 200 },
          },
        },
      },
    },
    async (request, reply) => {
      const fields = {
        message: request.body.message,
        name: request.body.name ?? "",
        email: request.body.email ?? "",
        website: request.body.website ?? "",
      };
      if (feedbackIssue(fields)) throw new HttpError(400, "invalid_input");
      const clean = normalizeFeedback(fields);
      if (clean.website) return reply.code(202).send({ ok: true });
      const payloadHash = tokenHash(
          JSON.stringify({
            message: clean.message,
            name: clean.name,
            email: clean.email,
          }),
        ),
        now = deps.now();
      const client = await deps.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [`feedback:${request.body.id}`],
        );
        const existing = await client.query(
          "SELECT payload_hash FROM feedback_messages WHERE id=$1",
          [request.body.id],
        );
        if (existing.rowCount) {
          if (existing.rows[0].payload_hash !== payloadHash)
            throw new HttpError(409, "conflict");
        } else {
          const allowed = await consumeLimit(
            client,
            "feedback:ip",
            ipKey(request, config, now),
            5,
            3600000,
            now,
          );
          const global = await consumeLimit(
            client,
            "feedback:global",
            "global",
            100,
            3600000,
            now,
          );
          if (!allowed || !global) throw new HttpError(429, "rate_limited");
          await client.query(
            "INSERT INTO feedback_messages(id,payload_hash,message,name,email,created_at) VALUES ($1,$2,$3,$4,$5,$6)",
            [
              request.body.id,
              payloadHash,
              clean.message,
              clean.name || null,
              clean.email || null,
              now,
            ],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return reply.code(202).send({ ok: true });
    },
  );
  app.get<{ Querystring: { status?: FeedbackStatus; cursor?: string } }>(
    "/v1/admin/feedback",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            status: { type: "string", enum: statuses },
            cursor: { type: "string", maxLength: 512 },
          },
        },
      },
    },
    async (request) => {
      await requireOwner(request, config, deps);
      const after = cursor(request.query.cursor);
      const rows = await deps.pool.query(
        `SELECT id,message,name,email,status,created_at FROM feedback_messages
      WHERE ($1::text IS NULL OR status=$1) AND ($2::timestamptz IS NULL OR (created_at,id)<($2,$3::uuid))
      ORDER BY created_at DESC,id DESC LIMIT 26`,
        [request.query.status ?? null, after?.time ?? null, after?.id ?? null],
      );
      const items: FeedbackMessage[] = rows.rows
        .slice(0, 25)
        .map((row) => ({
          id: row.id,
          message: row.message,
          name: row.name,
          email: row.email,
          status: row.status,
          createdAt: row.created_at.toISOString(),
        }));
      const last = items.at(-1);
      const result: FeedbackPage = {
        items,
        nextCursor:
          rows.rows.length > 25 && last
            ? Buffer.from(
                JSON.stringify({ time: last.createdAt, id: last.id }),
              ).toString("base64url")
            : null,
      };
      return result;
    },
  );
  app.patch<{ Params: { id: string }; Body: { status: FeedbackStatus } }>(
    "/v1/admin/feedback/:id",
    {
      schema: {
        params,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["status"],
          properties: { status: { type: "string", enum: statuses } },
        },
      },
    },
    async (request, reply) => {
      await requireOwner(request, config, deps);
      const result = await deps.pool.query(
        "UPDATE feedback_messages SET status=$1 WHERE id=$2",
        [request.body.status, request.params.id],
      );
      if (!result.rowCount) throw new HttpError(404, "invalid_input");
      reply.code(204).send();
    },
  );
  app.delete<{ Params: { id: string } }>(
    "/v1/admin/feedback/:id",
    { schema: { params } },
    async (request, reply) => {
      await requireOwner(request, config, deps);
      await deps.pool.query("DELETE FROM feedback_messages WHERE id=$1", [
        request.params.id,
      ]);
      reply.code(204).send();
    },
  );
}
