import type { Pool } from "pg";
import { randomBytes } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hashPassword } from "../src/security.ts";
import { createPool } from "../src/db.ts";
import { migrate } from "../src/migrate.ts";

export async function bootstrapOwner(
  pool: Pool,
  email: string,
  outputFile: string,
): Promise<boolean> {
  if (email !== "islamov.denis@gmail.com")
    throw new Error("Only the configured owner can be created");
  if (!isAbsolute(outputFile))
    throw new Error(
      "Credentials file must be an absolute path outside the repository",
    );
  const directory = await realpath(dirname(outputFile));
  const root = await realpath(
    fileURLToPath(new URL("../../", import.meta.url)),
  );
  const fromRoot = relative(root, directory);
  if (
    fromRoot === "" ||
    (!fromRoot.startsWith(`..${sep}`) &&
      fromRoot !== ".." &&
      !isAbsolute(fromRoot))
  ) {
    throw new Error("Credentials file must be outside the repository");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(6284393)");
    if (
      (await client.query("SELECT id FROM owner_account WHERE id=1")).rowCount
    ) {
      await client.query("COMMIT");
      return false;
    }
    const username = `owner-${randomBytes(16).toString("base64url")}`;
    const password = randomBytes(24).toString("base64url");
    const hash = await hashPassword(password);
    const file = await open(join(directory, basename(outputFile)), "wx", 0o600);
    try {
      await file.writeFile(
        JSON.stringify(
          {
            url: "https://shelfsmartacademy.com/admin",
            username,
            password,
            recoveryEmail: email,
          },
          null,
          2,
        ),
      );
      await file.sync();
    } finally {
      await file.close();
    }
    await client.query(
      "INSERT INTO owner_account(id,username,email,password_hash) VALUES (1,$1,$2,$3)",
      [username, email, hash],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    // Keep a private output file if COMMIT had an uncertain outcome; recovery remains possible.
    throw error;
  } finally {
    client.release();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const index = process.argv.indexOf("--out");
  const output = index >= 0 ? process.argv[index + 1] : undefined;
  if (!process.env.DATABASE_URL || !output)
    throw new Error("Set DATABASE_URL and pass --out /absolute/private/file");
  const pool = createPool(process.env.DATABASE_URL);
  try {
    await migrate(pool);
    const created = await bootstrapOwner(
      pool,
      process.env.OWNER_EMAIL ?? "islamov.denis@gmail.com",
      output,
    );
    process.stdout.write(
      created
        ? "Owner created. Credentials saved to the requested private file.\n"
        : "Owner already exists. Nothing changed.\n",
    );
  } catch {
    process.stderr.write(
      "Owner setup failed. Check the database and private output file.\n",
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
