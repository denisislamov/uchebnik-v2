import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Config, Dependencies } from "../src/config.ts";

export async function withDatabase(run: (pool: pg.Pool) => Promise<void>) {
  const url = process.env.TEST_DATABASE_URL;
  if (!url)
    throw new Error("Set TEST_DATABASE_URL to an isolated local test database");
  const parsed = new URL(url);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
    !parsed.pathname.startsWith("/shelfsmart_test")
  ) {
    throw new Error("Tests require a loopback shelfsmart_test database");
  }
  const schema = `test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: url });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({
    connectionString: url,
    max: 5,
    options: `-c search_path=${schema}`,
  });
  try {
    await run(pool);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
}

export function testConfig(): Config {
  return {
    environment: "test",
    databaseUrl: process.env.TEST_DATABASE_URL!,
    webOrigin: "http://127.0.0.1:8096",
    port: 8097,
    ownerEmail: "islamov.denis@gmail.com",
    resendApiKey: "test-no-network",
    mailFrom: "test@example.com",
    abuseSecret: "test-only-abuse-secret-32-bytes-long",
  };
}

export function testDependencies(pool: pg.Pool): Dependencies {
  return {
    pool,
    now: () => new Date("2026-10-13T12:00:00Z"),
    mailer: {
      async sendReset() {
        throw new Error("Unexpected email in this test");
      },
    },
  };
}
