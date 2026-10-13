import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "../src/api/client.ts";
test("API sends cookies only to auth/admin and CSRF only when explicitly supplied", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const api = createApiClient(
    "https://api.shelfsmartacademy.com",
    async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(null, { status: 204 });
    },
  );
  await api("/v1/events", { method: "POST", body: { kind: "page_view" } });
  await api("/v1/auth/session");
  await api("/v1/auth/logout", { method: "POST", csrfToken: "session-csrf" });
  assert.equal(calls[0].init?.credentials, "omit");
  assert.equal(calls[1].init?.credentials, "include");
  assert.equal(
    new Headers(calls[2].init?.headers).get("X-CSRF-Token"),
    "session-csrf",
  );
  assert.equal(
    calls[2].url,
    "https://api.shelfsmartacademy.com/v1/auth/logout",
  );
});
test("API reports server errors without leaking arbitrary provider content", async () => {
  const api = createApiClient(
    "https://api.shelfsmartacademy.com",
    async () => new Response("private error", { status: 503 }),
  );
  await assert.rejects(api("/v1/feedback"), {
    status: 503,
    code: "unavailable",
  });
});
