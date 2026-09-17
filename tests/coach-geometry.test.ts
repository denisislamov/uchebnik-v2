import test from "node:test";
import assert from "node:assert/strict";
import {
  coachCardPosition,
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
