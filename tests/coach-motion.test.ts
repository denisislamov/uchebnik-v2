import test from "node:test";
import assert from "node:assert/strict";
import { demoFrame, demoDuration } from "../src/lib/coachMotion.ts";
test("count demonstration dwells on each real object exactly once in order", () => {
  const points = [
    { x: 0.1, y: 0.3 },
    { x: 0.4, y: 0.8 },
    { x: 0.9, y: 0.2 },
  ];
  assert.deepEqual(
    points.map((_, i) => demoFrame("count", points, i * 1200 + 700).index),
    [0, 1, 2],
  );
  assert.deepEqual(demoFrame("count", points, 700).point, points[0]);
  assert.deepEqual(demoFrame("count", points, 1900).point, points[1]);
  assert.equal(
    demoFrame("count", points, demoDuration("count", points)).done,
    true,
  );
  assert.deepEqual(
    demoFrame("count", points, demoDuration("count", points)).point,
    points.at(-1),
  );
});
test("drag holds, travels from the source to the destination, then releases", () => {
  const points = [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
  ];
  assert.deepEqual(demoFrame("drag", points, 300).point, points[0]);
  const middle = demoFrame("drag", points, 1400);
  assert.ok(middle.point.x > 0.2 && middle.point.x < 0.8);
  assert.equal(middle.pressing, true);
  const end = demoFrame("drag", points, 2800);
  assert.deepEqual(end.point, points[1]);
  assert.equal(end.pressing, false);
});
test("trace demonstration follows each bend and never cuts diagonally across a square", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const duration = demoDuration("trace", points);
  for (let t = 0; t < duration; t += 100) {
    const { point } = demoFrame("trace", points, t);
    assert.ok(point.y === 0 || point.x === 1 || point.y === 1);
  }
});
