import test from "node:test";
import assert from "node:assert/strict";
import {
  coachCardPosition,
  mobileCoachLayout,
  shapeDemoPoint,
  shapeDemoEdge,
} from "../src/lib/coachGeometry.ts";

test("floating instructions use available space without covering the original target", () => {
  for (const [viewport, card, focus] of [
    [
      { width: 1440, height: 900 },
      { width: 320, height: 260 },
      { x: 490, y: 100, width: 650, height: 400 },
    ],
    [
      { width: 390, height: 844 },
      { width: 366, height: 250 },
      { x: 35, y: 600, width: 305, height: 160 },
    ],
    [
      { width: 800, height: 375 },
      { width: 368, height: 250 },
      { x: 50, y: 80, width: 250, height: 180 },
    ],
  ] as const) {
    const p = coachCardPosition(focus, viewport, card);
    assert.ok(p.x >= 0 && p.y >= 0);
    assert.ok(
      p.x + card.width <= viewport.width &&
        p.y + card.height <= viewport.height,
    );
    assert.ok(
      p.x + card.width <= focus.x ||
        p.x >= focus.x + focus.width ||
        p.y + card.height <= focus.y ||
        p.y >= focus.y + focus.height,
    );
  }
});
test("stick demonstration preserves triangle angles and uses the whole target length at any aspect ratio", () => {
  for (const [w, h] of [
    [396, 324],
    [300, 150],
    [180, 330],
  ]) {
    const a = { x: 0.2, y: 0.8 },
      b = { x: 0.5, y: 0.8 - Math.sqrt(3) * 0.3 },
      c = { x: 0.8, y: 0.8 };
    const edges = [
      [a, b],
      [b, c],
      [c, a],
    ].map(([p, q]) => shapeDemoEdge(p, q, w, h));
    assert.ok(Math.abs(edges[0].angle + 60) < 1e-8);
    assert.ok(
      Math.max(...edges.map((e) => e.length)) -
        Math.min(...edges.map((e) => e.length)) <
        1e-8,
    );
    const p = shapeDemoPoint(a, w, h),
      q = shapeDemoPoint(b, w, h);
    assert.deepEqual(edges[0].center, {
      x: (p.x + q.x) / 2,
      y: (p.y + q.y) / 2,
    });
  }
});

test("mobile placement reveals an offscreen target above a stationary readable card", async () => {
  const { mobileCoachLayout } = await import("../src/lib/coachGeometry.ts");
  const layout = mobileCoachLayout(
    { x: 35, y: 684, width: 305, height: 184 },
    { x: 0, y: 83, width: 390, height: 761 },
    { width: 366, height: 320 },
    { top: 0, max: 700 },
  );
  assert.ok(layout.fits);
  assert.ok(layout.scrollDelta > 0);
  assert.ok(684 - layout.scrollDelta >= layout.space.y);
  assert.ok(868 - layout.scrollDelta <= layout.space.y + layout.space.height);
  assert.ok(
    layout.space.y + layout.space.height < layout.card.y ||
      layout.space.y > layout.card.y + 320,
  );
});

test("mobile placement uses the top when the page cannot scroll further", async () => {
  const { mobileCoachLayout } = await import("../src/lib/coachGeometry.ts");
  const layout = mobileCoachLayout(
    { x: 35, y: 600, width: 305, height: 200 },
    { x: 0, y: 83, width: 390, height: 761 },
    { width: 366, height: 320 },
    { top: 0, max: 0 },
  );
  assert.ok(layout.fits);
  assert.equal(layout.scrollDelta, 0);
  assert.ok(layout.card.y + 320 < 600);
});

test("landscape layout reports when a full original cannot fit beside instructions", async () => {
  const { mobileCoachLayout } = await import("../src/lib/coachGeometry.ts");
  const layout = mobileCoachLayout(
    { x: 35, y: 300, width: 650, height: 390 },
    { x: 0, y: 83, width: 800, height: 292 },
    { width: 368, height: 351 },
    { top: 0, max: 1000 },
  );
  assert.equal(layout.fits, false);
  assert.ok(layout.space.width > 300 && layout.space.height > 200);
  assert.ok(layout.space.x + layout.space.width < layout.card.x);
});

test("a long task reveals its beginning instead of an arbitrary middle", () => {
  const layout = mobileCoachLayout(
    { x: 35, y: 1000, width: 305, height: 1400 },
    { x: 0, y: 83, width: 390, height: 761 },
    { width: 366, height: 320 },
    { top: 0, max: 2200 },
  );
  assert.equal(1000 - layout.scrollDelta, layout.space.y);
  assert.ok(layout.space.height > 480, "use the larger unobstructed area");
});
