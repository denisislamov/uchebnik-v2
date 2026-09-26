import { test } from "node:test";
import assert from "node:assert/strict";
import {
  traceDirections,
  traceArrowGeometry,
} from "../src/lib/traceDirections.ts";
import { isClosedTrace } from "../src/lib/tracing.ts";
import { allBlocks } from "../src/content/book.ts";
import type { TraceTarget } from "../src/content/types.ts";
const grid = { columns: 12, rows: 8 };
const target = (points: [number, number][]): TraceTarget => ({
  label: "test",
  color: "#232d2b",
  points: points.map(([x, y]) => ({ x: x / 12, y: y / 8 })),
});
test("one cue follows each open line; closed figures do not need direction cues", () => {
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
    assert.equal(arrows.length, 1);
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
  assert.deepEqual(arrows, []);
});
test("every open textbook trace has at most two finite cues, including curves and digits", () => {
  for (const block of allBlocks) {
    if (block.kind !== "draw" || !block.trace) continue;
    for (const t of block.trace.stages.flat()) {
      const arrows = traceDirections(
        t,
        block.trace,
        block.trace.stages.find((stage) => stage.includes(t)),
      );
      if (t.dot || isClosedTrace(t, block.trace)) assert.deepEqual(arrows, []);
      else {
        assert.equal(arrows.length, t.bidirectional ? 2 : 1, block.id);
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

test("guidance remains smaller than a notebook cell at phone and desktop widths", () => {
  for (const cellSize of [20, 28, 42, 64]) {
    const shape = traceArrowGeometry(
      { point: { x: 6, y: 3 }, direction: { x: 0, y: -1 } },
      cellSize,
    );
    const length = Math.hypot(
      shape.tip.x - shape.tail.x,
      shape.tip.y - shape.tail.y,
    );
    assert.ok(length >= 8 && length <= 14 && length <= cellSize * 0.5);
    assert.ok(
      shape.tail.y > shape.left.y && shape.left.y > shape.tip.y,
      "the head leaves a visible shaft",
    );
  }
});

test("short dash cues sit beside the trace instead of covering the line or start point", () => {
  const dash = target([
    [1, 1],
    [2, 1],
  ]);
  const [arrow] = traceDirections(dash, grid);
  const shape = traceArrowGeometry(arrow, 20);
  for (const point of Object.values(shape)) {
    assert.ok(
      Math.abs(point.y - 20) > 3,
      "cue stays clear of the horizontal ink",
    );
    assert.ok(
      Math.hypot(point.x - 20, point.y - 20) > 7,
      "start point stays visible",
    );
  }
});

test("digit and turning-path cues do not intersect another part of their outline", () => {
  for (const block of allBlocks) {
    if (block.kind !== "draw" || !block.trace) continue;
    const { columns, rows } = block.trace;
    for (const t of block.trace.stages.flat()) {
      for (const arrow of traceDirections(
        t,
        block.trace,
        block.trace.stages.find((stage) => stage.includes(t)),
      )) {
        const shape = traceArrowGeometry(arrow, 20);
        for (const [a, b] of [
          [shape.tail, shape.tip],
          [shape.left, shape.tip],
          [shape.right, shape.tip],
        ]) {
          for (let k = 0; k <= 8; k++) {
            const x = a.x + ((b.x - a.x) * k) / 8;
            const y = a.y + ((b.y - a.y) * k) / 8;
            for (let i = 1; i < t.points.length; i++) {
              const start = {
                x: t.points[i - 1].x * columns * 20,
                y: t.points[i - 1].y * rows * 20,
              };
              const end = {
                x: t.points[i].x * columns * 20,
                y: t.points[i].y * rows * 20,
              };
              const dx = end.x - start.x,
                dy = end.y - start.y;
              const amount = Math.max(
                0,
                Math.min(
                  1,
                  ((x - start.x) * dx + (y - start.y) * dy) /
                    (dx * dx + dy * dy || 1),
                ),
              );
              assert.ok(
                Math.hypot(
                  x - start.x - amount * dx,
                  y - start.y - amount * dy,
                ) > 2.5,
                `${block.id}: ${t.label} cue leaves ink visible`,
              );
            }
          }
        }
      }
    }
  }
});

test("trunk cues leave the future branches visible as well", () => {
  const trunk = {
    ...target([
      [6, 1],
      [6, 6],
    ]),
    bidirectional: true,
  };
  const branches = [1, 2, 3, 4].map((y) =>
    target([
      [5, y + 1],
      [6, y],
      [7, y + 1],
    ]),
  );
  const arrows = traceDirections(trunk, grid, branches);
  assert.equal(arrows.length, 2);
  for (const { point } of arrows) {
    assert.ok(
      point.y > 5.25,
      "both cues use the open space below the last branch",
    );
  }
});
