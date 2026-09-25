import test from "node:test";
import assert from "node:assert/strict";
import { matchesTrace } from "../src/lib/tracing.ts";
import { pages } from "../src/content/book.ts";

// Page 3, «Чёрточка и точка»: a horizontal dash on a grid line and a dot.
const block = pages[2].blocks[5];
assert.ok(block.kind === "draw" && block.trace);
const grid = block.trace;
const [line, dot] = grid.stages[0];
const PHONE = 29, // 347 px pad / 12 columns on a 390 px screen
  DESKTOP = 60;
const shifted = (px: number, cellPx: number) => ({
  color: line.color,
  cellPx,
  points: line.points.map((p) => ({
    x: p.x,
    y: p.y + px / cellPx / grid.rows,
  })),
});

test("a phone-sized cell accepts a 10 px finger wobble that a desktop cell rejects", () => {
  assert.equal(matchesTrace(shifted(10, PHONE), line, grid), true);
  // The same wobble is 0.34 of a cell: too far on a desktop cell and by the old cell-only rule.
  const wobbleCells = 10 / PHONE;
  const onDesktop = shifted(wobbleCells * DESKTOP, DESKTOP);
  assert.equal(matchesTrace(onDesktop, line, grid), false);
  const { cellPx: _unused, ...legacy } = onDesktop;
  assert.equal(matchesTrace(legacy, line, grid), false);
});

test("a tap that drifts 20 px on a phone still counts as a dot; the next cell does not", () => {
  const center = dot.points[0];
  const drift = (px: number, cellPx: number) => ({
    color: dot.color,
    cellPx,
    points: [center, { x: center.x + px / cellPx / grid.columns, y: center.y }],
  });
  assert.equal(matchesTrace(drift(20, PHONE), dot, grid), true);
  assert.equal(
    matchesTrace({ ...drift(20, PHONE), cellPx: undefined }, dot, grid),
    false,
    "without a physical scale the old 0.65-cell travel limit still applies",
  );
  assert.equal(matchesTrace(drift(1.2 * PHONE, PHONE), dot, grid), false);
  assert.equal(
    matchesTrace(
      {
        color: dot.color,
        cellPx: PHONE,
        points: [{ x: center.x + 1.2 / grid.columns, y: center.y }],
      },
      dot,
      grid,
    ),
    false,
    "a single tap in the neighbouring cell is not this dot",
  );
});

test("pixel floors never loosen tolerances on large cells", () => {
  const big = { ...shifted(0, 200), cellPx: 200 };
  assert.equal(matchesTrace(big, line, grid), true);
  assert.equal(
    matchesTrace({ ...shifted(0.3 * 200, 200) }, line, grid),
    false,
    "0.3 of a 200 px cell is 60 px: the cell rule, not the pixel floor, decides",
  );
});
