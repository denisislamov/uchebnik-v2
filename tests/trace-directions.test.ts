import { test } from "node:test";
import assert from "node:assert/strict";
import { traceDirections } from "../src/lib/traceDirections.ts";
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
