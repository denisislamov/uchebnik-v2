import { test } from "node:test";
import assert from "node:assert/strict";
import { readConfig } from "../src/config.ts";
import { migrate } from "../src/migrate.ts";
import { buildApp } from "../src/app.ts";
import { testConfig, testDependencies, withDatabase } from "./helpers.ts";

const productionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://owner:password@internal/db",
  WEB_ORIGIN: "https://shelfsmartacademy.com",
  OWNER_EMAIL: "islamov.denis@gmail.com",
  RESEND_API_KEY: "fake-key-for-validation",
  MAIL_FROM: "admin@mail.shelfsmartacademy.com",
  ABUSE_SECRET: "a".repeat(48),
};
test("production refuses missing secrets and an unrelated origin", () => {
  for (const key of [
    "DATABASE_URL",
    "RESEND_API_KEY",
    "ABUSE_SECRET",
    "MAIL_FROM",
    "OWNER_EMAIL",
  ]) {
    assert.throws(
      () => readConfig({ ...productionEnv, [key]: "" }),
      new RegExp(key),
    );
  }
  assert.throws(
    () => readConfig({ ...productionEnv, WEB_ORIGIN: "http://localhost:8096" }),
    /WEB_ORIGIN/,
  );
  assert.throws(
    () => readConfig({ ...productionEnv, OWNER_EMAIL: "attacker@example.com" }),
    /OWNER_EMAIL/,
  );
  assert.throws(() => readConfig({ ...productionEnv, PORT: "NaN" }), /PORT/);
  assert.equal(readConfig(productionEnv).port, 10000);
});
test("concurrent migrations are idempotent and preserve existing feedback", () =>
  withDatabase(async (pool) => {
    await Promise.all([migrate(pool), migrate(pool)]);
    assert.equal(
      (await pool.query("SELECT * FROM schema_migrations")).rowCount,
      1,
    );
    await pool.query(
      "INSERT INTO feedback_messages(id,payload_hash,message) VALUES ('11111111-1111-4111-8111-111111111111','fixture','Useful feedback')",
    );
    await migrate(pool);
    assert.equal(
      (await pool.query("SELECT message FROM feedback_messages")).rows[0]
        .message,
      "Useful feedback",
    );
  }));
test("database rejects a second owner account", () =>
  withDatabase(async (pool) => {
    await migrate(pool);
    await pool.query(
      "INSERT INTO owner_account(id,username,email,password_hash) VALUES (1,'owner','owner@example.com','fixture')",
    );
    await assert.rejects(
      pool.query(
        "INSERT INTO owner_account(id,username,email,password_hash) VALUES (2,'other','other@example.com','fixture')",
      ),
      { code: "23514" },
    );
    assert.equal((await pool.query("SELECT * FROM owner_account")).rowCount, 1);
  }));
test("health depends on both database and applied schema", () =>
  withDatabase(async (pool) => {
    const app = await buildApp(testConfig(), testDependencies(pool));
    try {
      assert.equal((await app.inject({ url: "/healthz" })).statusCode, 503);
      await migrate(pool);
      assert.equal((await app.inject({ url: "/healthz" })).statusCode, 200);
      await pool.query("DROP TABLE schema_migrations");
      const failed = await app.inject({ url: "/healthz" });
      assert.equal(failed.statusCode, 503);
      assert.deepEqual(failed.json(), { error: "unavailable" });
      assert.ok(!failed.body.includes("schema_migrations"));
    } finally {
      await app.close();
    }
  }));
