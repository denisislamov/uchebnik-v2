import test from "node:test";
import assert from "node:assert/strict";
import { shapeDemoPoint, shapeDemoEdge } from "../src/lib/coachGeometry.ts";
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
