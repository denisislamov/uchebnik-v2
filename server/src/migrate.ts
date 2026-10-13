import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import type { Pool } from "pg";
import { createPool } from "./db.ts";

export const SCHEMA_VERSION = 1;
export async function migrate(pool: Pool): Promise<void> {
  const sql = await readFile(
    new URL("../migrations/001_admin.sql", import.meta.url),
    "utf8",
  );
  const checksum = createHash("sha256").update(sql).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(6284392)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, checksum text NOT NULL)",
    );
    const existing = await client.query(
      "SELECT checksum FROM schema_migrations WHERE version=$1",
      [SCHEMA_VERSION],
    );
    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum)
        throw new Error("Applied migration was modified");
    } else {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations(version,checksum) VALUES ($1,$2)",
        [SCHEMA_VERSION, checksum],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
  const pool = createPool(process.env.DATABASE_URL);
  try {
    await migrate(pool);
    process.stdout.write("Database migrations applied\n");
  } catch {
    process.stderr.write("Database migration failed\n");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
