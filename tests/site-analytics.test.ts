import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTracker,
  type TrackerEnvironment,
} from "../src/analytics/core.ts";
import type { EventInput } from "../shared/site-api.ts";
function fixture() {
  let now = 10000000000,
    seq = 0,
    allowed = true,
    pathname = "/";
  const data = new Map<string, string>(),
    events: EventInput[] = [];
  const env: TrackerEnvironment = {
    storage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value);
      },
    },
    now: () => now,
    uuid: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`,
    allowed: () => allowed,
    pathname: () => pathname,
    referrer: () => "https://example.com/private?email=hidden#token",
    origin: "https://shelfsmartacademy.com",
    send: async (event) => {
      events.push(event);
    },
  };
  return {
    env,
    events,
    data,
    advance: (ms: number) => {
      now += ms;
    },
    optOut: () => {
      allowed = false;
    },
    admin: () => {
      pathname = "/admin/reset";
    },
  };
}
test("tracking shares a visit across reloads and tabs and strips referrer details", () => {
  const f = fixture(),
    first = createTracker(f.env),
    second = createTracker(f.env);
  first.track("page_view");
  second.track("book_open");
  assert.equal(f.events.length, 2);
  assert.equal(f.events[0].visitorId, f.events[1].visitorId);
  assert.equal(f.events[0].sessionId, f.events[1].sessionId);
  assert.equal(f.events[0].referrerHost, "example.com");
  assert.ok(!JSON.stringify(f.events).includes("hidden"));
});
test("30 minutes idle starts a visit and 30 days rotates the visitor", () => {
  const f = fixture(),
    tracker = createTracker(f.env);
  tracker.track("page_view");
  f.advance(30 * 60 * 1000);
  tracker.track("book_open");
  assert.notEqual(f.events[0].sessionId, f.events[1].sessionId);
  assert.equal(f.events[0].visitorId, f.events[1].visitorId);
  f.advance(30 * 24 * 60 * 60 * 1000);
  tracker.track("page_view");
  assert.notEqual(f.events[0].visitorId, f.events[2].visitorId);
});
test("DNT/GPC and admin routes send no events", () => {
  const f = fixture(),
    tracker = createTracker(f.env);
  f.optOut();
  tracker.track("page_view");
  assert.equal(f.events.length, 0);
  const other = fixture();
  other.admin();
  createTracker(other.env).track("page_view");
  assert.equal(other.events.length, 0);
});
test("blocked or corrupt storage never interrupts learning", () => {
  const f = fixture();
  f.env.storage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  const tracker = createTracker(f.env);
  assert.doesNotThrow(() => tracker.track("page_view"));
  assert.equal(f.events[0].visitorId, null);
  tracker.track("boosty_click");
  assert.equal(f.events[1].sessionId, f.events[0].sessionId);
  const other = fixture();
  other.env.storage = {
    getItem() {
      return "{broken";
    },
    setItem() {},
  };
  assert.doesNotThrow(() => createTracker(other.env).track("page_view"));
  assert.equal(other.events.length, 1);
});
test("temporary delivery failure retries the same id exactly once", async () => {
  const f = fixture();
  let attempts = 0;
  f.env.send = async (event) => {
    f.events.push(event);
    if (++attempts === 1) throw new Error("offline");
  };
  createTracker(f.env).track("boosty_click");
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(attempts, 2);
  assert.equal(f.events[0].id, f.events[1].id);
});
test("malformed stored identifiers are replaced before sending events", () => {
  const f = fixture();
  f.env.storage = {
    getItem: () =>
      JSON.stringify({
        id: "a".repeat(36),
        createdAt: f.env.now(),
        lastSeen: f.env.now(),
      }),
    setItem() {},
  };
  createTracker(f.env).track("page_view");
  assert.match(
    f.events[0].visitorId!,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
});
