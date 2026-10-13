import type { Pool } from "pg";
export async function cleanup(pool: Pool, now: Date): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query(
      "SELECT pg_try_advisory_xact_lock(6284394) AS acquired",
    );
    if (lock.rows[0].acquired) {
      await client.query(
        "DELETE FROM analytics_events WHERE id IN (SELECT id FROM analytics_events WHERE received_at < $1 LIMIT 10000)",
        [new Date(now.getTime() - 90 * 86400000)],
      );
      await client.query(
        "DELETE FROM admin_sessions WHERE token_hash IN (SELECT token_hash FROM admin_sessions WHERE expires_at <= $1 LIMIT 10000)",
        [now],
      );
      await client.query(
        "DELETE FROM password_reset_tokens WHERE token_hash IN (SELECT token_hash FROM password_reset_tokens WHERE expires_at <= $1 LIMIT 10000)",
        [now],
      );
      await client.query(
        "DELETE FROM rate_limits WHERE ctid IN (SELECT ctid FROM rate_limits WHERE expires_at <= $1 LIMIT 10000)",
        [now],
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
