import { readConfig } from "./config.ts";
import { createPool } from "./db.ts";
import { migrate } from "./migrate.ts";
import { buildApp } from "./app.ts";
import { createMailer } from "./mail.ts";
import { cleanup } from "./maintenance.ts";

const config = readConfig(process.env);
const pool = createPool(config.databaseUrl);
try {
  await migrate(pool);
  await cleanup(pool, new Date());
  const maintenance = setInterval(
    () => {
      void cleanup(pool, new Date()).catch(() =>
        process.stderr.write("Database maintenance unavailable\n"),
      );
    },
    60 * 60 * 1000,
  );
  maintenance.unref();
  const app = await buildApp(config, {
    pool,
    now: () => new Date(),
    mailer: createMailer(config),
  });
  const stop = async () => {
    clearInterval(maintenance);
    await app.close();
    await pool.end();
  };
  process.once("SIGTERM", () => {
    void stop();
  });
  process.once("SIGINT", () => {
    void stop();
  });
  await app.listen({ host: "0.0.0.0", port: config.port });
  process.stdout.write("Shelfsmart API ready\n");
} catch {
  await pool.end();
  process.stderr.write("Shelfsmart API failed to start\n");
  process.exitCode = 1;
}
