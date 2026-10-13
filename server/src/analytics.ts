import type { Pool } from "pg";
import type { FastifyInstance } from "fastify";
import { isIP } from "node:net";
import type {
  Period,
  Counts,
  DashboardData,
  EventInput,
} from "../../shared/site-api.ts";
import type { Config, Dependencies } from "./config.ts";
import { requireOwner } from "./auth.ts";
import { HttpError, consumeLimit, ipKey } from "./security.ts";

const uuid = {
  type: "string",
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
};
const countColumns = `count(DISTINCT visitor_id)::int AS visitors, count(DISTINCT session_id)::int AS visits,
  count(*) FILTER (WHERE kind='book_open')::int AS book_opens,
  count(*) FILTER (WHERE kind='boosty_click')::int AS boosty_clicks,
  count(DISTINCT visitor_id) FILTER (WHERE kind='boosty_click')::int AS boosty_visitors`;
function counts(row?: Record<string, number>): Counts {
  const visitors = row?.visitors ?? 0,
    boostyVisitors = row?.boosty_visitors ?? 0;
  return {
    visitors,
    visits: row?.visits ?? 0,
    bookOpens: row?.book_opens ?? 0,
    boostyClicks: row?.boosty_clicks ?? 0,
    boostyVisitors,
    boostyConversion: visitors ? boostyVisitors / visitors : null,
  };
}
export async function readDashboard(
  pool: Pool,
  period: Period,
  now: Date,
): Promise<DashboardData> {
  const length = period === "today" ? 1 : period === "7d" ? 7 : 30;
  const localDate = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const start = new Date(
    new Date(`${localDate}T00:00:00+08:00`).getTime() - (length - 1) * 86400000,
  );
  const parameters = [start, now];
  const totals = await pool.query(
    `SELECT ${countColumns} FROM analytics_events WHERE received_at >= $1 AND received_at <= $2`,
    parameters,
  );
  const daily = await pool.query(
    `SELECT to_char(received_at AT TIME ZONE 'Asia/Makassar','YYYY-MM-DD') AS date, ${countColumns}
    FROM analytics_events WHERE received_at >= $1 AND received_at <= $2 GROUP BY date`,
    parameters,
  );
  const sources = await pool.query(
    `WITH active AS (
      SELECT DISTINCT session_id FROM analytics_events WHERE received_at >= $1 AND received_at <= $2
    ), first_event AS (
      SELECT DISTINCT ON (e.session_id) e.session_id, e.referrer_host FROM analytics_events e
      JOIN active a ON a.session_id=e.session_id WHERE e.received_at <= $2 ORDER BY e.session_id,e.received_at,e.id
    ) SELECT coalesce(referrer_host,'direct') AS host, count(*)::int AS visits FROM first_event
      GROUP BY host ORDER BY visits DESC,host LIMIT 50`,
    parameters,
  );
  const days = Array.from({ length }, (_, index) => {
    const date = new Date(
      start.getTime() + index * 86400000 + 8 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);
    return { date, ...counts(daily.rows.find((row) => row.date === date)) };
  });
  return {
    period,
    timezone: "Asia/Makassar",
    totals: counts(totals.rows[0]),
    days,
    sources: sources.rows,
  };
}
export async function registerAnalytics(
  app: FastifyInstance,
  config: Config,
  deps: Dependencies,
): Promise<void> {
  app.post<{ Body: EventInput }>(
    "/v1/events",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["id", "kind", "visitorId", "sessionId", "referrerHost"],
          properties: {
            id: uuid,
            kind: {
              type: "string",
              enum: ["page_view", "book_open", "boosty_click"],
            },
            visitorId: { anyOf: [uuid, { type: "null" }] },
            sessionId: uuid,
            referrerHost: {
              anyOf: [
                { type: "string", minLength: 1, maxLength: 253 },
                { type: "null" },
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const event = request.body,
        now = deps.now();
      let host = event.referrerHost;
      if (host !== null) {
        if (
          !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) ||
          isIP(host) ||
          host.includes("..")
        )
          throw new HttpError(400, "invalid_input");
        const parsed = new URL(`https://${host}`);
        if (parsed.hostname !== host) throw new HttpError(400, "invalid_input");
        if (
          host === new URL(config.webOrigin).hostname ||
          host === `www.${new URL(config.webOrigin).hostname}`
        )
          host = null;
      }
      const allowed = await consumeLimit(
        deps.pool,
        "events:ip",
        ipKey(request, config, now),
        120,
        60000,
        now,
      );
      const global = await consumeLimit(
        deps.pool,
        "events:global",
        "global",
        3000,
        60000,
        now,
      );
      if (!allowed || !global) throw new HttpError(429, "rate_limited");
      await deps.pool.query(
        "INSERT INTO analytics_events(id,kind,visitor_id,session_id,referrer_host,received_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING",
        [event.id, event.kind, event.visitorId, event.sessionId, host, now],
      );
      reply.code(204).send();
    },
  );
  app.get<{ Querystring: { period: Period } }>(
    "/v1/admin/analytics",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          required: ["period"],
          properties: {
            period: { type: "string", enum: ["today", "7d", "30d"] },
          },
        },
      },
    },
    async (request) => {
      await requireOwner(request, config, deps);
      return readDashboard(deps.pool, request.query.period, deps.now());
    },
  );
}
