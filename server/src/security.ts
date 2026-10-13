import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { FastifyRequest } from "fastify";
import type { ApiFailure } from "../../shared/site-api.ts";
import type { Config } from "./config.ts";

export class HttpError extends Error {
  statusCode: number;
  code: ApiFailure["error"];
  constructor(statusCode: number, code: ApiFailure["error"]) {
    super(code);
    this.statusCode = statusCode;
    this.code = code;
  }
}
let deriving = false;
const waiting: (() => void)[] = [];
async function derive(password: string, salt: Buffer): Promise<Buffer> {
  if (deriving) {
    if (waiting.length >= 3) throw new HttpError(429, "rate_limited");
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  deriving = true;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        password,
        salt,
        64,
        { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
        (error, key) => (error ? reject(error) : resolve(key)),
      );
    });
  } finally {
    const next = waiting.shift();
    if (next) next();
    else deriving = false;
  }
}
export function validNewPassword(password: string): boolean {
  return (
    Array.from(password).length >= 16 && Buffer.byteLength(password) <= 256
  );
}
export async function hashPassword(password: string): Promise<string> {
  if (!validNewPassword(password)) throw new HttpError(400, "invalid_input");
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt-v1$${salt.toString("hex")}$${key.toString("hex")}`;
}
export const DUMMY_HASH = `scrypt-v1$${"00".repeat(16)}$${"00".repeat(64)}`;
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (Buffer.byteLength(password) > 256) return false;
  const match = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(hash);
  if (!match) return false;
  const actual = await derive(password, Buffer.from(match[1], "hex"));
  return timingSafeEqual(actual, Buffer.from(match[2], "hex"));
}
export const token = () => randomBytes(32).toString("base64url");
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const csrfToken = (sessionToken: string, config: Config) =>
  createHmac("sha256", config.abuseSecret)
    .update(`csrf:${sessionToken}`)
    .digest("base64url");
export const cookieName = (config: Config) =>
  config.environment === "production"
    ? "__Host-shelf_admin"
    : "shelf_admin_local";
export function ipKey(
  request: FastifyRequest,
  config: Config,
  now: Date,
): string {
  // trustProxy remains false until the production proxy chain is verified.
  return createHmac("sha256", config.abuseSecret)
    .update(`ip:${now.toISOString().slice(0, 10)}:${request.ip}`)
    .digest("hex");
}
export async function consumeLimit(
  pool: Pool | PoolClient,
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
  now: Date,
): Promise<boolean> {
  const start = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const result = await pool.query(
    `INSERT INTO rate_limits(scope,key_hash,window_start,count,expires_at)
    VALUES ($1,$2,$3,1,$4) ON CONFLICT (scope,key_hash,window_start)
    DO UPDATE SET count=rate_limits.count+1 WHERE rate_limits.count < $5 RETURNING count`,
    [scope, key, start, new Date(now.getTime() + 24 * 60 * 60 * 1000), limit],
  );
  return result.rowCount === 1;
}
