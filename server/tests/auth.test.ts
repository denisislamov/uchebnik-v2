import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/security.ts";
import { withAuth, ownerPassword } from "./helpers.ts";
import { buildApp } from "../src/app.ts";

test("password hashes use separate salts and refuse an incorrect password", async () => {
  const first = await hashPassword(ownerPassword),
    second = await hashPassword(ownerPassword);
  assert.notEqual(first, second);
  assert.ok(!first.includes(ownerPassword));
  assert.equal(await verifyPassword(ownerPassword, first), true);
  assert.equal(
    await verifyPassword("incorrect-but-long-password", first),
    false,
  );
  assert.equal(
    await verifyPassword(ownerPassword, "invalid-serialized-hash"),
    false,
  );
});
test("anonymous session endpoint returns 401 with no private data", () =>
  withAuth(async (h) => {
    const response = await h.request({ url: "/v1/auth/session" });
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { error: "unauthorized" });
    assert.equal(response.headers["cache-control"], "no-store");
  }));
test("production login uses host-only secure cookie and stores only token hashes", () =>
  withAuth(async (h) => {
    const response = await h.request({
      method: "POST",
      url: "/v1/auth/login",
      payload: { username: "test-owner", password: ownerPassword },
    });
    assert.equal(response.statusCode, 200);
    const header = String(response.headers["set-cookie"]);
    assert.match(header, /^__Host-shelf_admin=/);
    for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/"])
      assert.ok(header.includes(flag));
    assert.ok(!header.includes("Domain="));
    const token = header.split(";")[0].split("=")[1];
    assert.ok(!response.body.includes(token));
    const session = (await h.pool.query("SELECT * FROM admin_sessions"))
      .rows[0];
    assert.notEqual(session.token_hash, token);
    assert.notEqual(session.csrf_hash, response.json().csrfToken);
    assert.equal(response.json().expiresAt, "2026-10-14T12:00:00.000Z");
  }, true));
test("session survives API restart but expires after 24 hours", () =>
  withAuth(async (h) => {
    const { cookie, csrfToken } = await h.login();
    const response = await h.request({
      url: "/v1/auth/session",
      headers: { cookie },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().csrfToken, csrfToken);
    const restarted = await buildApp(h.config, h.deps);
    try {
      const afterRestart = await restarted.inject({
        url: "/v1/auth/session",
        headers: { cookie, origin: h.config.webOrigin },
      });
      assert.equal(afterRestart.statusCode, 200);
      assert.equal(afterRestart.json().csrfToken, csrfToken);
    } finally {
      await restarted.close();
    }
    h.advance(24 * 60 * 60 * 1000);
    assert.equal(
      (await h.request({ url: "/v1/auth/session", headers: { cookie } }))
        .statusCode,
      401,
    );
  }));
test("logout requires CSRF and revokes a replayed cookie", () =>
  withAuth(async (h) => {
    const { cookie, csrfToken } = await h.login();
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/auth/logout",
          headers: { cookie },
        })
      ).statusCode,
      403,
    );
    const logout = await h.request({
      method: "POST",
      url: "/v1/auth/logout",
      headers: { cookie, "x-csrf-token": csrfToken },
    });
    assert.equal(logout.statusCode, 204);
    assert.match(String(logout.headers["set-cookie"]), /Max-Age=0/);
    assert.equal(
      (await h.request({ url: "/v1/auth/session", headers: { cookie } }))
        .statusCode,
      401,
    );
  }));
test("foreign and missing Origin cannot authenticate or read owner session", () =>
  withAuth(async (h) => {
    const { cookie } = await h.login();
    for (const origin of ["https://attacker.example", "null", ""]) {
      assert.equal(
        (
          await h.request({
            url: "/v1/auth/session",
            headers: { origin, cookie },
          })
        ).statusCode,
        403,
      );
      assert.equal(
        (
          await h.request({
            method: "POST",
            url: "/v1/auth/login",
            headers: { origin },
            payload: { username: "test-owner", password: ownerPassword },
          })
        ).statusCode,
        403,
      );
    }
  }));
test("wrong usernames and passwords return the same failure", () =>
  withAuth(async (h) => {
    const responses = [];
    for (const username of ["test-owner", "unknown"])
      responses.push(
        await h.request({
          method: "POST",
          url: "/v1/auth/login",
          payload: { username, password: "incorrect-password" },
        }),
      );
    assert.equal(responses[0].statusCode, 401);
    assert.equal(responses[1].statusCode, 401);
    assert.equal(responses[0].body, responses[1].body);
    assert.equal(
      (await h.pool.query("SELECT * FROM admin_sessions")).rowCount,
      0,
    );
  }));
test("login throttling survives a fresh connection and ignores forged forwarded IP", () =>
  withAuth(async (h) => {
    for (let i = 0; i < 11; i++) {
      const response = await h.request({
        method: "POST",
        url: "/v1/auth/login",
        headers: { "x-forwarded-for": `203.0.113.${i}` },
        payload: { username: "test-owner", password: "incorrect-password" },
      });
      assert.equal(response.statusCode, i < 10 ? 401 : 429);
    }
    const rows = await h.pool.query(
      "SELECT key_hash FROM rate_limits WHERE scope='login:ip'",
    );
    assert.equal(rows.rowCount, 1);
    assert.ok(!rows.rows[0].key_hash.includes("127.0.0.1"));
    const restarted = await buildApp(h.config, h.deps);
    try {
      assert.equal(
        (
          await restarted.inject({
            method: "POST",
            url: "/v1/auth/login",
            headers: { origin: h.config.webOrigin },
            payload: { username: "test-owner", password: ownerPassword },
          })
        ).statusCode,
        429,
      );
    } finally {
      await restarted.close();
    }
  }));
test("malformed or oversized login is rejected before password work", () =>
  withAuth(async (h) => {
    const payloads = [
      { username: "test-owner", password: "x", extra: true },
      { username: "test-owner", password: "x".repeat(33000) },
    ];
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/auth/login",
          payload: payloads[0],
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/auth/login",
          payload: payloads[1],
        })
      ).statusCode,
      413,
    );
  }));
