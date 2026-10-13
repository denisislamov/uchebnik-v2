import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Config, Dependencies } from "../src/config.ts";
import type {
  FastifyInstance,
  InjectOptions,
  LightMyRequestResponse,
} from "fastify";
import { migrate } from "../src/migrate.ts";
import { buildApp } from "../src/app.ts";
import { hashPassword } from "../src/security.ts";

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

export const ownerPassword = "test-owner-password-with-long-entropy";
let fixtureHash: Promise<string> | undefined;
export type AuthHarness = {
  app: FastifyInstance;
  pool: pg.Pool;
  config: Config;
  deps: Dependencies;
  mailbox: { to: string; resetUrl: string }[];
  advance: (ms: number) => void;
  request: (options: InjectOptions) => Promise<LightMyRequestResponse>;
  login: () => Promise<{ cookie: string; csrfToken: string }>;
};
export async function withAuth(
  run: (h: AuthHarness) => Promise<void>,
  production = false,
) {
  await withDatabase(async (pool) => {
    await migrate(pool);
    const config = testConfig();
    if (production) {
      config.environment = "production";
      config.webOrigin = "https://shelfsmartacademy.com";
    }
    fixtureHash ??= hashPassword(ownerPassword);
    await pool.query(
      "INSERT INTO owner_account(id,username,email,password_hash) VALUES (1,'test-owner',$1,$2)",
      [config.ownerEmail, await fixtureHash],
    );
    let time = new Date("2026-10-13T12:00:00Z").getTime();
    const mailbox: AuthHarness["mailbox"] = [];
    const deps: Dependencies = {
      pool,
      now: () => new Date(time),
      mailer: {
        async sendReset(to, resetUrl) {
          mailbox.push({ to, resetUrl });
        },
      },
    };
    const app = await buildApp(config, deps);
    const request = (options: InjectOptions) =>
      app.inject({
        ...options,
        headers: { origin: config.webOrigin, ...options.headers },
      });
    const login = async () => {
      const response = await request({
        method: "POST",
        url: "/v1/auth/login",
        payload: { username: "test-owner", password: ownerPassword },
      });
      if (response.statusCode !== 200)
        throw new Error(`Fixture login failed: ${response.statusCode}`);
      return {
        cookie: String(response.headers["set-cookie"]).split(";")[0],
        csrfToken: response.json().csrfToken,
      };
    };
    try {
      await run({
        app,
        pool,
        config,
        deps,
        mailbox,
        request,
        login,
        advance: (ms) => {
          time += ms;
        },
      });
    } finally {
      await app.close();
    }
  });
}
