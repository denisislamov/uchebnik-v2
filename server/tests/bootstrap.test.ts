import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { bootstrapOwner } from "../scripts/bootstrap-owner.ts";
import { migrate } from "../src/migrate.ts";
import { verifyPassword } from "../src/security.ts";
import { withDatabase } from "./helpers.ts";

test("bootstrap writes private credentials once and never replaces existing owner", () =>
  withDatabase(async (pool) => {
    await migrate(pool);
    const directory = await mkdtemp(join(tmpdir(), "shelfsmart-owner-test-"));
    const output = join(directory, "credentials.json");
    try {
      assert.equal(
        await bootstrapOwner(pool, "islamov.denis@gmail.com", output),
        true,
      );
      const credentials = JSON.parse(await readFile(output, "utf8"));
      assert.match(credentials.username, /^owner-[A-Za-z0-9_-]{22}$/);
      assert.match(credentials.password, /^[A-Za-z0-9_-]{32}$/);
      assert.equal((await stat(output)).mode & 0o777, 0o600);
      const before = (await pool.query("SELECT * FROM owner_account")).rows[0];
      assert.equal(
        await verifyPassword(credentials.password, before.password_hash),
        true,
      );
      assert.equal(
        await bootstrapOwner(
          pool,
          "islamov.denis@gmail.com",
          join(directory, "second.json"),
        ),
        false,
      );
      assert.deepEqual(
        (await pool.query("SELECT * FROM owner_account")).rows[0],
        before,
      );
      await assert.rejects(stat(join(directory, "second.json")), {
        code: "ENOENT",
      });
    } finally {
      await rm(directory, { recursive: true });
    }
  }));
test("bootstrap refuses existing output and paths within the repository", () =>
  withDatabase(async (pool) => {
    await migrate(pool);
    const directory = await mkdtemp(join(tmpdir(), "shelfsmart-owner-test-"));
    const output = join(directory, "existing.json");
    try {
      await writeFile(output, "keep-this-file");
      await assert.rejects(
        bootstrapOwner(pool, "islamov.denis@gmail.com", output),
      );
      assert.equal(await readFile(output, "utf8"), "keep-this-file");
      await assert.rejects(
        bootstrapOwner(
          pool,
          "islamov.denis@gmail.com",
          resolve("credentials-should-not-exist.json"),
        ),
      );
      assert.equal(
        (await pool.query("SELECT * FROM owner_account")).rowCount,
        0,
      );
    } finally {
      await rm(directory, { recursive: true });
    }
  }));
