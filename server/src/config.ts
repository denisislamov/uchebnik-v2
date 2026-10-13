import type { Pool } from "pg";

export type Config = {
  environment: "production" | "development" | "test";
  databaseUrl: string;
  webOrigin: string;
  port: number;
  ownerEmail: string;
  resendApiKey: string;
  mailFrom: string;
  abuseSecret: string;
};
export type Mailer = {
  sendReset(to: string, resetUrl: string, username: string): Promise<void>;
};
export type Dependencies = { pool: Pool; now: () => Date; mailer: Mailer };
const ownerEmail = "islamov.denis@gmail.com";

export function readConfig(env: NodeJS.ProcessEnv): Config {
  const environment = env.NODE_ENV ?? "development";
  if (!["production", "development", "test"].includes(environment))
    throw new Error("Invalid NODE_ENV");
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value) throw new Error(`Missing ${key}`);
    return value;
  };
  const databaseUrl = required("DATABASE_URL");
  try {
    if (!["postgres:", "postgresql:"].includes(new URL(databaseUrl).protocol))
      throw new Error();
  } catch {
    throw new Error("Invalid DATABASE_URL");
  }
  const webOrigin = required("WEB_ORIGIN");
  let origin: URL;
  try {
    origin = new URL(webOrigin);
  } catch {
    throw new Error("Invalid WEB_ORIGIN");
  }
  if (origin.origin !== webOrigin || origin.username || origin.password)
    throw new Error("Invalid WEB_ORIGIN");
  if (
    environment === "production"
      ? webOrigin !== "https://shelfsmartacademy.com"
      : !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
  ) {
    throw new Error("Invalid WEB_ORIGIN for environment");
  }
  if (required("OWNER_EMAIL") !== ownerEmail)
    throw new Error("Invalid OWNER_EMAIL");
  const abuseSecret = required("ABUSE_SECRET");
  if (Buffer.byteLength(abuseSecret) < 32)
    throw new Error("ABUSE_SECRET needs at least 32 bytes");
  const resendApiKey = required("RESEND_API_KEY");
  const mailFrom = required("MAIL_FROM");
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(mailFrom))
    throw new Error("Invalid MAIL_FROM");
  const port = Number(env.PORT ?? 10000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PORT");
  return {
    environment: environment as Config["environment"],
    databaseUrl,
    webOrigin,
    port,
    ownerEmail,
    abuseSecret,
    resendApiKey,
    mailFrom,
  };
}
