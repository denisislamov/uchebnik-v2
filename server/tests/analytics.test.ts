import { test } from "node:test";
import assert from "node:assert/strict";
import { withAuth } from "./helpers.ts";
import { readDashboard } from "../src/analytics.ts";
import { cleanup } from "../src/maintenance.ts";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const event = {
  id: id(1),
  kind: "page_view",
  visitorId: id(2),
  sessionId: id(3),
  referrerHost: "example.com",
};
test("events are persisted once on retry and use server time", () =>
  withAuth(async (h) => {
    for (let i = 0; i < 2; i++)
      assert.equal(
        (await h.request({ method: "POST", url: "/v1/events", payload: event }))
          .statusCode,
        204,
      );
    const rows = await h.pool.query("SELECT * FROM analytics_events");
    assert.equal(rows.rowCount, 1);
    assert.equal(
      rows.rows[0].received_at.toISOString(),
      "2026-10-13T12:00:00.000Z",
    );
    assert.equal(rows.rows[0].referrer_host, "example.com");
  }));
test("events reject arbitrary URLs, extra personal fields and unknown kinds", () =>
  withAuth(async (h) => {
    for (const payload of [
      { ...event, email: "secret@example.com" },
      { ...event, kind: "child_answer" },
      { ...event, referrerHost: "example.com/path?token=secret" },
      { ...event, referrerHost: "127.0.0.1" },
      { ...event, visitorId: "invalid" },
    ]) {
      assert.equal(
        (await h.request({ method: "POST", url: "/v1/events", payload }))
          .statusCode,
        400,
      );
    }
    assert.equal(
      (await h.pool.query("SELECT * FROM analytics_events")).rowCount,
      0,
    );
  }));
test("dashboard counts unique browsers across days and visits rather than page views", () =>
  withAuth(async (h) => {
    const fixtures = [
      [1, "page_view", 1, 1, "google.com", "2026-10-11T17:00:00Z"],
      [2, "page_view", 1, 1, "other.example", "2026-10-12T16:00:00Z"],
      [3, "boosty_click", 1, 1, null, "2026-10-12T16:01:00Z"],
      [4, "book_open", 1, 2, null, "2026-10-13T10:00:00Z"],
      [5, "page_view", 2, 3, "t.me", "2026-10-13T11:00:00Z"],
    ];
    for (const [key, kind, visitor, session, host, time] of fixtures)
      await h.pool.query(
        "INSERT INTO analytics_events(id,kind,visitor_id,session_id,referrer_host,received_at) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          id(key as number),
          kind,
          id(visitor as number),
          id(session as number),
          host,
          time,
        ],
      );
    const report = await readDashboard(h.pool, "7d", h.deps.now());
    assert.deepEqual(report.totals, {
      visitors: 2,
      visits: 3,
      bookOpens: 1,
      boostyClicks: 1,
      boostyVisitors: 1,
      boostyConversion: 0.5,
    });
    assert.equal(report.days.length, 7);
    assert.equal(
      report.days.reduce(
        (sum: number, day: { visitors: number }) => sum + day.visitors,
        0,
      ),
      3,
    );
    assert.deepEqual(
      report.sources.map((s: { host: string }) => s.host).sort(),
      ["direct", "google.com", "t.me"],
    );
    const { cookie } = await h.login();
    assert.equal(
      (
        await h.request({
          url: "/v1/admin/analytics?period=7d",
          headers: { cookie },
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (await h.request({ url: "/v1/admin/analytics?period=7d" })).statusCode,
      401,
    );
    assert.equal(
      (
        await h.request({
          url: "/v1/admin/analytics?period=all",
          headers: { cookie },
        })
      ).statusCode,
      400,
    );
  }));
test("today starts at Makassar midnight and empty dates stay visible", () =>
  withAuth(async (h) => {
    h.advance(4 * 60 * 60 * 1000);
    for (const [key, time] of [
      [1, "2026-10-13T15:59:59Z"],
      [2, "2026-10-13T16:00:00Z"],
    ] as const)
      await h.pool.query(
        "INSERT INTO analytics_events(id,kind,visitor_id,session_id,received_at) VALUES ($1,'page_view',$2,$3,$4)",
        [id(key), id(key), id(key), time],
      );
    const today = await readDashboard(h.pool, "today", h.deps.now());
    assert.equal(today.totals.visitors, 1);
    assert.equal(today.days[0].date, "2026-10-14");
    const month = await readDashboard(h.pool, "30d", h.deps.now());
    assert.equal(month.days.length, 30);
    assert.equal(month.days[0].visitors, 0);
    assert.equal(month.days[0].boostyConversion, null);
  }));
test("anonymous storage-blocked events do not invent a unique visitor", () =>
  withAuth(async (h) => {
    assert.equal(
      (
        await h.request({
          method: "POST",
          url: "/v1/events",
          payload: { ...event, visitorId: null, kind: "boosty_click" },
        })
      ).statusCode,
      204,
    );
    const report = await readDashboard(h.pool, "today", h.deps.now());
    assert.equal(report.totals.visitors, 0);
    assert.equal(report.totals.visits, 1);
    assert.equal(report.totals.boostyClicks, 1);
    assert.equal(report.totals.boostyConversion, null);
  }));
test("cleanup expires old analytics and auth data without deleting feedback", () =>
  withAuth(async (h) => {
    await h.pool.query(
      "INSERT INTO analytics_events(id,kind,session_id,received_at) VALUES ($1,'page_view',$1,'2026-01-01'),($2,'page_view',$2,'2026-10-13')",
      [id(1), id(2)],
    );
    await h.pool.query(
      "INSERT INTO feedback_messages(id,payload_hash,message,created_at) VALUES ($1,'fixture','Keep this message','2026-01-01')",
      [id(1)],
    );
    await h.pool.query(
      "INSERT INTO password_reset_tokens(token_hash,owner_id,expires_at) VALUES ('expired',1,'2026-01-01')",
    );
    await cleanup(h.pool, h.deps.now());
    assert.equal(
      (await h.pool.query("SELECT * FROM analytics_events")).rowCount,
      1,
    );
    assert.equal(
      (await h.pool.query("SELECT * FROM feedback_messages")).rowCount,
      1,
    );
    assert.equal(
      (await h.pool.query("SELECT * FROM password_reset_tokens")).rowCount,
      0,
    );
  }));
