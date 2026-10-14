import { test } from "node:test";
import assert from "node:assert/strict";
import type { FastifyRequest } from "fastify";
import { ipKey, HttpError } from "../src/security.ts";
import { testConfig } from "./helpers.ts";

const config = { ...testConfig(), environment: "production" as const };
const now = new Date("2026-10-14T08:00:00Z");
function request(ip: string | string[] | undefined, extra = {}) {
  return {
    ip: "10.0.0.1",
    headers: { "cf-connecting-ip": ip, "x-forwarded-for": "203.0.113.88" },
    raw: { rawHeaders: ip === undefined ? [] : ["CF-Connecting-IP", ip] },
    ...extra,
  } as unknown as FastifyRequest;
}
test("production keys use the Cloudflare client, ignoring socket and forwarded headers", () => {
  const key = ipKey(request("198.51.100.77"), config, now);
  assert.equal(key, ipKey(request("198.51.100.77", { ip: "10.0.0.2" }), config, now));
  assert.equal(key, ipKey(request("198.51.100.77", { headers: { "cf-connecting-ip": "198.51.100.77", "x-forwarded-for": "1.2.3.4" } }), config, now));
  assert.notEqual(key, ipKey(request("198.51.100.78"), config, now));
  assert.notEqual(key, ipKey(request("198.51.100.77"), config, new Date("2026-10-15")));
});
test("equivalent IPv6 and IPv4-mapped forms share a quota", () => {
  assert.equal(ipKey(request("2001:db8::a"), config, now), ipKey(request("2001:0DB8:0:0:0:0:0:000A"), config, now));
  const ipv4 = ipKey(request("198.51.100.77"), config, now);
  assert.equal(ipv4, ipKey(request("::ffff:198.51.100.77"), config, now));
  assert.equal(ipv4, ipKey(request("::ffff:c633:644d"), config, now));
});
test("missing, ambiguous and non-IP ingress headers fail closed", () => {
  for (const invalid of [undefined, "", " ", "1.2.3.4, 5.6.7.8", ["1.2.3.4"], "127.1", "2130706433", "01.2.3.4", "1.2.3.4:80", "[::1]", "fe80::1%eth0", " 1.2.3.4", "999.2.3.4"]) {
    assert.throws(() => ipKey(request(invalid), config, now), (error) => error instanceof HttpError && error.statusCode === 503);
  }
  assert.throws(() => ipKey(request("1.2.3.4", { raw: { rawHeaders: ["CF-Connecting-IP", "1.2.3.4", "cf-connecting-ip", "1.2.3.4"] } }), config, now), HttpError);
});
test("local development ignores all forwarded headers", () => {
  assert.equal(ipKey(request(undefined), testConfig(), now), ipKey(request("198.51.100.77"), testConfig(), now));
});
