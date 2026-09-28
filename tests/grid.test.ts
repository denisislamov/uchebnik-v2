import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELL,
  handLine,
  handRandom,
  handRect,
  upToCells,
  wholeCells,
  written,
} from "../src/lib/grid.ts";

const numbers = (path: string) =>
  (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

test("widths are whole cells and never wider than the room", () => {
  for (const px of [24, 47, 48, 361, 724, 1183, 1800]) {
    const w = wholeCells(px);
    assert.equal(w % CELL, 0);
    assert.ok(w <= px && px - w < CELL, `${px} → ${w}`);
  }
  assert.equal(wholeCells(5), CELL, "at least one cell");
});
test("the same seed draws the same line; another seed draws another", () => {
  assert.equal(
    handRect(240, 96, "p013-lesson06"),
    handRect(240, 96, "p013-lesson06"),
  );
  assert.notEqual(
    handRect(240, 96, "p013-lesson06"),
    handRect(240, 96, "p013-lesson05"),
  );
});
test("a hand-drawn line stays within a pen's width of the ruled one", () => {
  for (let i = 0; i < 200; i++) {
    const values = numbers(handLine(0, 0, 480, 0, handRandom(`line-${i}`)));
    const xs = values.filter((_, k) => k % 2 === 0),
      ys = values.filter((_, k) => k % 2 === 1);
    // Across: never more than the wobble. Along: a short run past the ends.
    assert.ok(
      ys.every((y) => Math.abs(y) <= 1),
      `line-${i}: ${ys}`,
    );
    assert.ok(
      Math.min(...xs) >= -2.5 && Math.max(...xs) <= 482.5,
      `line-${i}: ${xs}`,
    );
    assert.ok(
      ys.some((y) => y !== 0),
      "not a ruler-straight line",
    );
  }
});
test("a small box is drawn with a steadier hand than a large one", () => {
  const spread = (w: number, h: number) =>
    Math.max(
      ...Array.from({ length: 50 }, (_, i) => {
        const v = numbers(handRect(w, h, `box-${i}`));
        return Math.max(...v.map((n) => Math.max(-n, n - Math.max(w, h))));
      }),
    );
  assert.ok(spread(40, 40) <= 1.5, String(spread(40, 40)));
  assert.ok(spread(40, 40) < spread(960, 480));
  assert.ok(spread(960, 480) <= 2.5);
});
test("what holds a block is the least whole number of rows", () => {
  assert.equal(upToCells(240), 240);
  assert.equal(upToCells(240.4), 240, "a fraction of a pixel is not a row");
  assert.equal(upToCells(241), 264);
  assert.equal(upToCells(1), CELL);
});
test("written text takes whole rows and stands a little above its line", () => {
  for (const [size, rows, hand] of [
    [14, 1, false],
    [20, 1, false],
    [26, 2, false],
    [30, 2, false],
    [28, 2, true],
    [38, 2, true],
    [22, 1, true],
  ] as const) {
    const style = written(size, rows, hand) as {
      lineHeight: number;
      top?: number;
    };
    assert.equal(style.lineHeight, rows * CELL);
    // Where the font puts the baseline, measured in the browser for both fonts.
    const baseline =
      style.lineHeight / 2 + size * (hand ? 0.23 : 0.42) + (style.top ?? 0);
    assert.ok(
      baseline <= style.lineHeight - 2 && baseline >= style.lineHeight - 8,
      `${size}px in ${rows} rows stands ${style.lineHeight - baseline} px above the line`,
    );
  }
});
