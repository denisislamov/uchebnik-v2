import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { withAuth } from "./helpers.ts";
import { buildApp } from "../src/app.ts";
const message = () => ({
  id: randomUUID(),
  message: "Спасибо за полезный учебник!",
  name: "",
  email: "",
  website: "",
});

test("feedback boundaries reject malformed input but accept optional empty fields", () =>
  withAuth(async (h) => {
    for (const [length, status] of [
      [9, 400],
      [10, 202],
      [5000, 202],
      [5001, 400],
    ] as const)
      assert.equal(
        (
          await h.request({
            method: "POST",
            url: "/v1/feedback",
            payload: { ...message(), message: "а".repeat(length) },
          })
        ).statusCode,
        status,
      );
    for (const fields of [
      { name: "x".repeat(81) },
      { email: "a".repeat(246) + "@test.com" },
      { email: "not-an-email" },
      { email: "a@b.com\r\nBcc: other@example.com" },
      { admin: true },
    ])
      assert.equal(
        (
          await h.request({
            method: "POST",
            url: "/v1/feedback",
            payload: { ...message(), ...fields },
          })
        ).statusCode,
        400,
      );
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/feedback",
          payload: { ...message(), message: "🙂".repeat(10) },
        })
      ).statusCode,
      202,
    );
  }));
test("feedback retry after a lost response is idempotent and different content conflicts", () =>
  withAuth(async (h) => {
    const payload = message();
    const responses = await Promise.all(
      [1, 2].map(() =>
        h.request({ method: "POST", url: "/v1/feedback", payload }),
      ),
    );
    assert.deepEqual(
      responses.map((r) => r.statusCode),
      [202, 202],
    );
    assert.equal(
      (await h.pool.query("SELECT * FROM feedback_messages")).rowCount,
      1,
    );
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/feedback",
          payload: { ...payload, message: "A different message" },
        })
      ).statusCode,
      409,
    );
    assert.equal(
      (
        await h.pool.query(
          "SELECT count FROM rate_limits WHERE scope='feedback:ip'",
        )
      ).rows[0].count,
      1,
    );
  }));
test("honeypot does not save messages and database errors never report success", () =>
  withAuth(async (h) => {
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/feedback",
          payload: { ...message(), website: "spam.example" },
        })
      ).statusCode,
      202,
    );
    assert.equal(
      (await h.pool.query("SELECT * FROM feedback_messages")).rowCount,
      0,
    );
    await h.pool.query("DROP TABLE feedback_messages");
    const failed = await h.request({
      method: "POST",
      url: "/v1/feedback",
      payload: message(),
    });
    assert.equal(failed.statusCode, 503);
    assert.deepEqual(failed.json(), { error: "unavailable" });
  }));
test("only owner can read and change messages and HTML remains plain data", () =>
  withAuth(async (h) => {
    const payload = {
      ...message(),
      message: '<img src=x onerror="alert(1)">',
      email: "parent@example.com",
    };
    await h.request({ method: "POST", url: "/v1/feedback", payload });
    for (const method of ["GET", "PATCH", "DELETE"] as const) {
      const url =
        method === "GET"
          ? "/v1/admin/feedback"
          : `/v1/admin/feedback/${payload.id}`;
      assert.equal(
        (
          await h.request({
            method,
            url,
            ...(method === "PATCH" ? { payload: { status: "read" } } : {}),
          })
        ).statusCode,
        401,
      );
    }
    const { cookie, csrfToken } = await h.login(),
      headers = { cookie, "x-csrf-token": csrfToken };
    const list = await h.request({
      url: "/v1/admin/feedback?status=new",
      headers,
    });
    assert.equal(list.statusCode, 200);
    assert.equal(list.json().items[0].message, payload.message);
    assert.ok(!list.body.includes("payload_hash"));
    assert.equal(
      (
        await h.request({
          method: "PATCH",
          url: `/v1/admin/feedback/${payload.id}`,
          headers: { cookie },
          payload: { status: "read" },
        })
      ).statusCode,
      403,
    );
    for (const status of ["read", "archived", "new"]) {
      assert.equal(
        (
          await h.request({
            method: "PATCH",
            url: `/v1/admin/feedback/${payload.id}`,
            headers,
            payload: { status },
          })
        ).statusCode,
        204,
      );
      const restarted = await buildApp(h.config, h.deps);
      try {
        const after = await restarted.inject({
          url: `/v1/admin/feedback?status=${status}`,
          headers: { cookie, origin: h.config.webOrigin },
        });
        assert.equal(after.json().items[0].id, payload.id);
      } finally {
        await restarted.close();
      }
    }
    assert.equal(
      (
        await h.request({
          method: "DELETE",
          url: `/v1/admin/feedback/${payload.id}`,
          headers,
        })
      ).statusCode,
      204,
    );
    assert.equal(
      (await h.pool.query("SELECT * FROM feedback_messages")).rowCount,
      0,
    );
  }));
test("pagination has no duplicate or missing rows and invalid cursors are rejected", () =>
  withAuth(async (h) => {
    for (let i = 0; i < 30; i++)
      await h.pool.query(
        "INSERT INTO feedback_messages(id,payload_hash,message,created_at) VALUES ($1,'fixture','Pagination test message',$2)",
        [randomUUID(), h.deps.now()],
      );
    const { cookie } = await h.login();
    const first = await h.request({
      url: "/v1/admin/feedback",
      headers: { cookie },
    });
    assert.equal(first.json().items.length, 25);
    const second = await h.request({
      url: `/v1/admin/feedback?cursor=${encodeURIComponent(first.json().nextCursor)}`,
      headers: { cookie },
    });
    assert.equal(second.json().items.length, 5);
    assert.equal(second.json().nextCursor, null);
    assert.equal(
      new Set([...first.json().items, ...second.json().items].map((i) => i.id))
        .size,
      30,
    );
    assert.equal(
      (
        await h.request({
          url: "/v1/admin/feedback?cursor=broken",
          headers: { cookie },
        })
      ).statusCode,
      400,
    );
  }));
test("feedback quota is durable, retry consumes no quota and failed writes roll back quota", () =>
  withAuth(async (h) => {
    const first = message();
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await h.request({
            method: "POST",
            url: "/v1/feedback",
            payload: i ? message() : first,
          })
        ).statusCode,
        202,
      );
    assert.equal(
      (await h.request({ method: "POST", url: "/v1/feedback", payload: first }))
        .statusCode,
      202,
    );
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/feedback",
          payload: message(),
        })
      ).statusCode,
      429,
    );
    h.advance(3600000);
    await h.pool.query(
      "ALTER TABLE feedback_messages ADD CONSTRAINT forced_failure CHECK (message <> 'reject this insertion')",
    );
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/feedback",
          payload: { ...message(), message: "reject this insertion" },
        })
      ).statusCode,
      503,
    );
    assert.equal(
      (
        await h.pool.query(
          "SELECT count FROM rate_limits WHERE scope='feedback:ip' ORDER BY window_start DESC",
        )
      ).rowCount,
      1,
    );
  }));
