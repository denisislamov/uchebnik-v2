import { test } from "node:test";
import assert from "node:assert/strict";
import {
  traceDirections,
  traceArrowGeometry,
} from "../src/lib/traceDirections.ts";
import { allBlocks } from "../src/content/book.ts";
import type { TraceTarget } from "../src/content/types.ts";
const grid = { columns: 12, rows: 8 };
const target = (points: [number, number][]): TraceTarget => ({
  label: "test",
  color: "#232d2b",
  points: points.map(([x, y]) => ({ x: x / 12, y: y / 8 })),
});
test("arrows follow line direction and each side of a closed square", () => {
  for (const [a, b] of [
    [
      [1, 1],
      [2, 1],
    ],
    [
      [2, 1],
      [1, 1],
    ],
    [
      [1, 1],
      [1, 2],
    ],
    [
      [1, 2],
      [2, 1],
    ],
  ] as [number, number][][]) {
    const arrows = traceDirections(target([a, b]), grid);
    assert.ok(arrows.length);
    for (const arrow of arrows) {
      assert.ok(
        arrow.direction.x * (b[0] - a[0]) + arrow.direction.y * (b[1] - a[1]) >
          0,
      );
    }
  }
  const arrows = traceDirections(
    target([
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 2],
      [1, 1],
    ]),
    grid,
  );
  assert.equal(arrows.length, 4);
  assert.deepEqual(
    arrows.map((a) => a.direction),
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ],
  );
});
test("every non-dot textbook trace has finite arrows, including curves and digits", () => {
  for (const block of allBlocks) {
    if (block.kind !== "draw" || !block.trace) continue;
    for (const t of block.trace.stages.flat()) {
      const arrows = traceDirections(t, block.trace);
      if (t.dot) assert.deepEqual(arrows, []);
      else {
        assert.ok(arrows.length > 0, block.id);
        for (const a of arrows)
          assert.ok(
            [a.point.x, a.point.y, a.direction.x, a.direction.y].every(
              Number.isFinite,
            ),
          );
      }
    }
  }
});
test("tall notebook grids retain vertical direction; duplicate points are harmless", () => {
  const t = target([
    [1, 1],
    [1, 1],
    [1, 2],
  ]);
  const arrows = traceDirections(t, { columns: 12, rows: 22 });
  assert.ok(arrows.every((a) => a.direction.x === 0 && a.direction.y === 1));
  assert.deepEqual(
    traceDirections(
      target([
        [1, 1],
        [1, 1],
      ]),
      grid,
    ),
    [],
  );
});

test("bidirectional trunk guides show two opposite arrows on separate sides", () => {
  const trunk = {
    ...target([
      [6, 1],
      [6, 6],
    ]),
    bidirectional: true,
  };
  const arrows = traceDirections(trunk, grid);
  assert.equal(arrows.length, 2, "one clear arrow for each drawing direction");
  assert.deepEqual(arrows.map((a) => a.direction.y).sort(), [-1, 1]);
  assert.ok(arrows.every((a) => a.direction.x === 0));
  assert.ok(
    Math.abs(arrows[0].point.x - arrows[1].point.x) >= 0.7,
    "opposite arrows need separate lanes so the heads never form a cross",
  );
  assert.deepEqual(
    trunk.points,
    target([
      [6, 1],
      [6, 6],
    ]).points,
    "guidance must not move the actual textbook stroke",
  );
});

test("mobile guidance has a visible shaft and a broad arrow head", () => {
  const shape = traceArrowGeometry(
    { point: { x: 6, y: 3 }, direction: { x: 0, y: -1 } },
    20,
  );
  assert.ok(
    Math.hypot(shape.tip.x - shape.tail.x, shape.tip.y - shape.tail.y) >= 22,
  );
  assert.ok(
    Math.hypot(shape.left.x - shape.right.x, shape.left.y - shape.right.y) >=
      12,
  );
  assert.ok(
    shape.tail.y > shape.left.y && shape.left.y > shape.tip.y,
    "shaft extends beyond the head to read as an arrow rather than a chevron",
  );
});
