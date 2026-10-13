/** IPC-only fixture: never mounted by the production API. */
import { withDatabase, testConfig, ownerPassword } from "./helpers.ts";
import { migrate } from "../src/migrate.ts";
import { hashPassword } from "../src/security.ts";
import { buildApp } from "../src/app.ts";
import type { Dependencies } from "../src/config.ts";
if (process.env.SHELF_ADMIN_E2E === "1" && process.send) {
  try {
    await withDatabase(async (pool) => {
      await migrate(pool);
      const config = testConfig();
      const mailbox: { to: string; resetUrl: string }[] = [];
      const deps: Dependencies = {
        pool,
        now: () => new Date(),
        mailer: {
          async sendReset(to, resetUrl) {
            mailbox.push({ to, resetUrl });
          },
        },
      };
      const initialHash = await hashPassword(ownerPassword);
      let app = await buildApp(config, deps);
      await app.listen({ host: "127.0.0.1", port: 8097 });
      try {
        await new Promise<void>((resolve) => {
          process.on("disconnect", resolve);
          process.once("SIGTERM", resolve);
          process.on(
            "message",
            async (message: { id: number; command: string }) => {
              try {
                let result: unknown = null;
                if (message.command === "reset") {
                  await pool.query(
                    "TRUNCATE owner_account,admin_sessions,password_reset_tokens,feedback_messages,analytics_events,rate_limits CASCADE",
                  );
                  await pool.query(
                    "INSERT INTO owner_account(id,username,email,password_hash) VALUES (1,'test-owner',$1,$2)",
                    [config.ownerEmail, initialHash],
                  );
                  mailbox.length = 0;
                } else if (message.command === "snapshot") {
                  result = {
                    events: (
                      await pool.query(
                        "SELECT * FROM analytics_events ORDER BY received_at",
                      )
                    ).rows,
                    messages: (
                      await pool.query("SELECT * FROM feedback_messages")
                    ).rows,
                    mailbox,
                  };
                } else if (message.command === "restart") {
                  await app.close();
                  app = await buildApp(config, deps);
                  await app.listen({ host: "127.0.0.1", port: 8097 });
                } else throw new Error("Unknown fixture command");
                process.send?.({ id: message.id, result });
              } catch {
                process.send?.({
                  id: message.id,
                  error: "Fixture operation failed",
                });
              }
            },
          );
          process.send?.({ ready: true });
        });
      } finally {
        await app.close();
      }
    });
  } catch {
    console.error("Local admin fixture failed");
    process.exitCode = 1;
  }
}
