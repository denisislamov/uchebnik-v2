import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { Config, Dependencies } from "./config.ts";
import { SCHEMA_VERSION } from "./migrate.ts";
import { HttpError } from "./security.ts";
import { registerAuth } from "./auth.ts";
import { registerAnalytics } from "./analytics.ts";

export async function buildApp(config: Config, deps: Dependencies) {
  const app = Fastify({
    bodyLimit: 32 * 1024,
    requestTimeout: 15000,
    logger: false,
    trustProxy: false,
    ajv: { customOptions: { removeAdditional: false } },
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      if (error.statusCode === 429) reply.header("Retry-After", "60");
      return reply.code(error.statusCode).send({ error: error.code });
    }
    if ((error as { validation?: unknown }).validation)
      return reply.code(400).send({ error: "invalid_input" });
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 413 || status === 415 || status === 400)
      return reply.code(status).send({ error: "invalid_input" });
    return reply.code(503).send({ error: "unavailable" });
  });
  await app.register(cookie);
  await app.register(cors, {
    origin: config.webOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  });
  app.addHook("onRequest", async (request, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "no-referrer");
    if (request.url.startsWith("/v1/")) {
      reply.header("Cache-Control", "no-store");
      if (
        request.method !== "OPTIONS" &&
        request.headers.origin !== config.webOrigin
      )
        throw new HttpError(403, "forbidden");
    }
  });
  await registerAuth(app, config, deps);
  await registerAnalytics(app, config, deps);
  app.get("/healthz", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    const result = await deps.pool.query(
      "SELECT max(version) AS version FROM schema_migrations",
    );
    if (result.rows[0].version !== SCHEMA_VERSION)
      return reply.code(503).send({ error: "unavailable" });
    return { ok: true };
  });
  return app;
}
