import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Config, Dependencies } from "./config.ts";
import {
  HttpError,
  token,
  tokenHash,
  csrfToken,
  cookieName,
  ipKey,
  consumeLimit,
  DUMMY_HASH,
  verifyPassword,
  hashPassword,
  validNewPassword,
} from "./security.ts";

const minute = 60_000;
const string = (maxLength: number) => ({
  type: "string",
  minLength: 1,
  maxLength,
});
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const cookieOptions = (config: Config) => ({
  path: "/",
  httpOnly: true,
  secure: config.environment === "production",
  sameSite: "strict" as const,
});

async function session(
  request: FastifyRequest,
  config: Config,
  deps: Dependencies,
) {
  const value = request.cookies[cookieName(config)];
  if (!value || !/^[\w-]{43}$/.test(value))
    throw new HttpError(401, "unauthorized");
  const result = await deps.pool.query(
    `SELECT s.token_hash,s.csrf_hash,s.auth_version,s.expires_at,o.username
    FROM admin_sessions s JOIN owner_account o ON o.id=s.owner_id AND o.auth_version=s.auth_version
    WHERE s.token_hash=$1 AND s.expires_at>$2`,
    [tokenHash(value), deps.now()],
  );
  if (!result.rowCount) throw new HttpError(401, "unauthorized");
  return { ...result.rows[0], value };
}
export async function requireOwner(
  request: FastifyRequest,
  config: Config,
  deps: Dependencies,
): Promise<{ ownerId: 1; authVersion: number }> {
  const current = await session(request, config, deps);
  if (!["GET", "HEAD"].includes(request.method)) {
    const supplied = request.headers["x-csrf-token"];
    if (
      typeof supplied !== "string" ||
      supplied.length > 100 ||
      tokenHash(supplied) !== current.csrf_hash
    )
      throw new HttpError(403, "forbidden");
  }
  return { ownerId: 1, authVersion: current.auth_version };
}

export async function registerAuth(
  app: FastifyInstance,
  config: Config,
  deps: Dependencies,
): Promise<void> {
  app.post<{ Body: { username: string; password: string } }>(
    "/v1/auth/login",
    {
      schema: {
        body: object({ username: string(128), password: string(256) }),
      },
    },
    async (request, reply) => {
      const now = deps.now();
      const allowed = await consumeLimit(
        deps.pool,
        "login:ip",
        ipKey(request, config, now),
        10,
        15 * minute,
        now,
      );
      const global = await consumeLimit(
        deps.pool,
        "login:global",
        "global",
        30,
        15 * minute,
        now,
      );
      if (!allowed || !global) throw new HttpError(429, "rate_limited");
      const result = await deps.pool.query(
        "SELECT password_hash,auth_version,username FROM owner_account WHERE username=$1",
        [request.body.username],
      );
      const owner = result.rows[0];
      const valid = await verifyPassword(
        request.body.password,
        owner?.password_hash ?? DUMMY_HASH,
      );
      if (!owner || !valid) throw new HttpError(401, "unauthorized");
      const value = token(),
        csrf = csrfToken(value, config),
        expires = new Date(now.getTime() + 24 * 60 * minute);
      const client = await deps.pool.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query(
          "SELECT auth_version FROM owner_account WHERE id=1 FOR UPDATE",
        );
        if (current.rows[0]?.auth_version !== owner.auth_version)
          throw new HttpError(401, "unauthorized");
        await client.query(
          "INSERT INTO admin_sessions(token_hash,owner_id,csrf_hash,auth_version,expires_at) VALUES ($1,1,$2,$3,$4)",
          [tokenHash(value), tokenHash(csrf), owner.auth_version, expires],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      reply.setCookie(cookieName(config), value, {
        ...cookieOptions(config),
        maxAge: 24 * 60 * 60,
      });
      return {
        username: owner.username,
        csrfToken: csrf,
        expiresAt: expires.toISOString(),
      };
    },
  );
  app.get("/v1/auth/session", async (request) => {
    const current = await session(request, config, deps);
    return {
      username: current.username,
      csrfToken: csrfToken(current.value, config),
      expiresAt: current.expires_at.toISOString(),
    };
  });
  app.post("/v1/auth/logout", async (request, reply) => {
    await requireOwner(request, config, deps);
    await deps.pool.query("DELETE FROM admin_sessions WHERE token_hash=$1", [
      tokenHash(request.cookies[cookieName(config)]!),
    ]);
    reply
      .clearCookie(cookieName(config), cookieOptions(config))
      .code(204)
      .send();
  });
  app.post<{ Body: { email: string } }>(
    "/v1/auth/forgot",
    { schema: { body: object({ email: string(254) }) } },
    async (request, reply) => {
      const now = deps.now();
      const allowed = await consumeLimit(
        deps.pool,
        "forgot:ip",
        ipKey(request, config, now),
        5,
        60 * minute,
        now,
      );
      if (
        allowed &&
        request.body.email.trim().toLowerCase() === config.ownerEmail
      ) {
        const recipientAllowed = await consumeLimit(
          deps.pool,
          "forgot:recipient",
          "owner",
          3,
          60 * minute,
          now,
        );
        if (recipientAllowed) {
          const value = token();
          const inserted = await deps.pool.query(
            `WITH owner AS (SELECT id,username FROM owner_account WHERE id=1 AND email=$3),
             inserted AS (INSERT INTO password_reset_tokens(token_hash,owner_id,expires_at)
               SELECT $1,id,$2 FROM owner RETURNING owner_id)
             SELECT owner.username FROM inserted JOIN owner ON owner.id=inserted.owner_id`,
            [
              tokenHash(value),
              new Date(now.getTime() + 30 * minute),
              config.ownerEmail,
            ],
          );
          if (inserted.rowCount) {
            try {
              await deps.mailer.sendReset(
                config.ownerEmail,
                `${config.webOrigin}/admin/reset#token=${value}`,
                inserted.rows[0].username,
              );
            } catch {
              await deps.pool.query(
                "DELETE FROM password_reset_tokens WHERE token_hash=$1",
                [tokenHash(value)],
              );
            }
          }
        }
      }
      reply.code(202).send({ ok: true });
    },
  );
  app.post<{ Body: { token: string; password: string } }>(
    "/v1/auth/reset",
    {
      schema: {
        body: object({
          token: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" },
          password: string(256),
        }),
      },
    },
    async (request, reply) => {
      const now = deps.now();
      if (
        !(await consumeLimit(
          deps.pool,
          "reset:ip",
          ipKey(request, config, now),
          10,
          15 * minute,
          now,
        ))
      )
        throw new HttpError(429, "rate_limited");
      if (!validNewPassword(request.body.password))
        throw new HttpError(400, "invalid_input");
      const hash = tokenHash(request.body.token);
      const existing = await deps.pool.query(
        "SELECT owner_id FROM password_reset_tokens WHERE token_hash=$1 AND expires_at>$2",
        [hash, now],
      );
      if (!existing.rowCount) throw new HttpError(400, "invalid_input");
      const password = await hashPassword(request.body.password);
      const client = await deps.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "SELECT id FROM owner_account WHERE id=1 FOR UPDATE",
        );
        const consumed = await client.query(
          "DELETE FROM password_reset_tokens WHERE token_hash=$1 AND expires_at>$2 RETURNING owner_id",
          [hash, deps.now()],
        );
        if (!consumed.rowCount) throw new HttpError(400, "invalid_input");
        await client.query(
          "UPDATE owner_account SET password_hash=$1,auth_version=auth_version+1 WHERE id=1",
          [password],
        );
        await client.query("DELETE FROM admin_sessions WHERE owner_id=1");
        await client.query(
          "DELETE FROM password_reset_tokens WHERE owner_id=1",
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      reply
        .clearCookie(cookieName(config), cookieOptions(config))
        .code(204)
        .send();
    },
  );
}
