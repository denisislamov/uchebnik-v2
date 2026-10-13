import { test } from "node:test";
import assert from "node:assert/strict";
import { withAuth, ownerPassword, type AuthHarness } from "./helpers.ts";

async function requestReset(h: AuthHarness) {
  const response = await h.request({
    method: "POST",
    url: "/v1/auth/forgot",
    payload: { email: h.config.ownerEmail },
  });
  assert.equal(response.statusCode, 202);
  const message = h.mailbox.at(-1)!;
  assert.equal(message.to, "islamov.denis@gmail.com");
  const link = new URL(message.resetUrl);
  assert.equal(link.origin, h.config.webOrigin);
  assert.equal(link.pathname, "/admin/reset");
  assert.equal(link.search, "");
  return new URLSearchParams(link.hash.slice(1)).get("token")!;
}
const newPassword = "new-password-long-enough-for-the-owner";
test("forgot sends only to owner and does not reveal whether email matches", () =>
  withAuth(async (h) => {
    const unknown = await h.request({
      method: "POST",
      url: "/v1/auth/forgot",
      payload: { email: "other@example.com" },
    });
    assert.equal(unknown.statusCode, 202);
    assert.equal(h.mailbox.length, 0);
    const token = await requestReset(h);
    assert.deepEqual(unknown.json(), { ok: true });
    assert.notEqual(
      (await h.pool.query("SELECT token_hash FROM password_reset_tokens"))
        .rows[0].token_hash,
      token,
    );
  }));
test("reset link alone does not change password, reset is single-use and revokes sessions", () =>
  withAuth(async (h) => {
    const { cookie } = await h.login();
    const token = await requestReset(h);
    assert.equal(
      (await h.request({ url: "/v1/auth/session", headers: { cookie } }))
        .statusCode,
      200,
    );
    const response = await h.request({
      method: "POST",
      url: "/v1/auth/reset",
      payload: { token, password: newPassword },
    });
    assert.equal(response.statusCode, 204);
    assert.equal(
      (await h.request({ url: "/v1/auth/session", headers: { cookie } }))
        .statusCode,
      401,
    );
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/auth/reset",
          payload: { token, password: newPassword },
        })
      ).statusCode,
      400,
    );
    for (const [password, status] of [
      [ownerPassword, 401],
      [newPassword, 200],
    ] as const) {
      assert.equal(
        (
          await h.request({
            method: "POST",
            url: "/v1/auth/login",
            payload: { username: "test-owner", password },
          })
        ).statusCode,
        status,
      );
    }
  }));
test("reset token expires exactly after 30 minutes", () =>
  withAuth(async (h) => {
    const token = await requestReset(h);
    h.advance(30 * 60 * 1000);
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/auth/reset",
          payload: { token, password: newPassword },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (await h.pool.query("SELECT auth_version FROM owner_account")).rows[0]
        .auth_version,
      1,
    );
  }));
test("concurrent reset requests can consume a token only once", () =>
  withAuth(async (h) => {
    const token = await requestReset(h);
    const responses = await Promise.all(
      [1, 2].map(() =>
        h.request({
          method: "POST",
          url: "/v1/auth/reset",
          payload: { token, password: newPassword },
        }),
      ),
    );
    assert.deepEqual(responses.map((r) => r.statusCode).sort(), [204, 400]);
    assert.equal(
      (await h.pool.query("SELECT auth_version FROM owner_account")).rows[0]
        .auth_version,
      2,
    );
  }));
test("reset does not permit a concurrent old-password login to remain valid", () =>
  withAuth(async (h) => {
    const token = await requestReset(h);
    const [login, reset] = await Promise.all([
      h.request({
        method: "POST",
        url: "/v1/auth/login",
        payload: { username: "test-owner", password: ownerPassword },
      }),
      h.request({
        method: "POST",
        url: "/v1/auth/reset",
        payload: { token, password: newPassword },
      }),
    ]);
    assert.equal(reset.statusCode, 204);
    if (login.statusCode === 200) {
      const cookie = String(login.headers["set-cookie"]).split(";")[0];
      assert.equal(
        (await h.request({ url: "/v1/auth/session", headers: { cookie } }))
          .statusCode,
        401,
      );
    } else assert.equal(login.statusCode, 401);
  }));
test("mail failure does not invalidate existing access or leak provider errors", () =>
  withAuth(async (h) => {
    const { cookie } = await h.login();
    h.deps.mailer.sendReset = async () => {
      throw new Error("provider-secret-error");
    };
    const response = await h.request({
      method: "POST",
      url: "/v1/auth/forgot",
      payload: { email: h.config.ownerEmail },
    });
    assert.equal(response.statusCode, 202);
    assert.deepEqual(response.json(), { ok: true });
    assert.equal(
      (await h.pool.query("SELECT * FROM password_reset_tokens")).rowCount,
      0,
    );
    assert.equal(
      (await h.request({ url: "/v1/auth/session", headers: { cookie } }))
        .statusCode,
      200,
    );
  }));
test("weak and oversized replacement passwords leave reset token usable", () =>
  withAuth(async (h) => {
    const token = await requestReset(h);
    for (const password of ["short", "я".repeat(129)]) {
      assert.equal(
        (
          await h.request({
            method: "POST",
            url: "/v1/auth/reset",
            payload: { token, password },
          })
        ).statusCode,
        400,
      );
    }
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/auth/reset",
          payload: { token, password: newPassword },
        })
      ).statusCode,
      204,
    );
  }));
