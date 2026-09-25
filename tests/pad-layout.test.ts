import test from "node:test";
import assert from "node:assert/strict";
import {
  padCellSize,
  targetSpanCells,
  MIN_CELL_PX,
} from "../src/lib/padLayout.ts";

test("a phone gets fingertip cells for ordinary targets", () => {
  assert.equal(padCellSize(362, 12, 2.4), MIN_CELL_PX);
  assert.equal(padCellSize(362, 42, 1), MIN_CELL_PX);
});

test("a target wider than the screen shrinks the cells just enough to fit", () => {
  const cell = padCellSize(362, 12, 10);
  assert.ok(cell < MIN_CELL_PX && cell * 10 <= 362 - 16, String(cell));
  assert.ok(cell >= 362 / 12, "never below the container rule");
});

test("wide screens keep their own larger cells", () => {
  assert.equal(padCellSize(780, 12, 10), 65);
  assert.equal(padCellSize(1200, 12, 2), 100);
});

test("target span is measured in cells", () => {
  assert.ok(Math.abs(targetSpanCells([{ x: 0.1 }, { x: 0.6 }], 12) - 6) < 1e-9);
  assert.equal(targetSpanCells([], 12), 0);
});
