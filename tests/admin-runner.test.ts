import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
test("admin browser runner refuses missing or nonlocal database before starting servers", () => {
  for (const url of [
    "",
    "postgresql://user:password@example.com/shelfsmart_test",
    "postgresql://localhost/production",
  ]) {
    const result = spawnSync(
      process.execPath,
      ["scripts/run-admin-browser-tests.cjs"],
      { encoding: "utf8", env: { ...process.env, TEST_DATABASE_URL: url } },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /loopback shelfsmart_test database/);
    assert.doesNotMatch(result.stderr, /password@example/);
  }
});
