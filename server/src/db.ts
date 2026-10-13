import pg from "pg";

export function createPool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  pool.on("error", () =>
    process.stderr.write("Database connection unavailable\n"),
  );
  return pool;
}
