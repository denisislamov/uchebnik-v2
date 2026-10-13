import Fastify from "fastify";
import type { Config, Dependencies } from "./config.ts";
import { SCHEMA_VERSION } from "./migrate.ts";

export async function buildApp(_config: Config, deps: Dependencies) {
  const app = Fastify({
    bodyLimit: 32 * 1024,
    requestTimeout: 15000,
    logger: false,
    trustProxy: false,
    ajv: { customOptions: { removeAdditional: false } },
  });
  app.setErrorHandler((error, _request, reply) => {
    if ((error as { validation?: unknown }).validation)
      return reply.code(400).send({ error: "invalid_input" });
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 413 || status === 415 || status === 400)
      return reply.code(status).send({ error: "invalid_input" });
    return reply.code(503).send({ error: "unavailable" });
  });
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
