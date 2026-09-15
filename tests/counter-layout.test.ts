import { test } from "node:test";
import assert from "node:assert/strict";
import {
  counterBoardLayout,
  counterSupplyCenter,
} from "../src/lib/counterLayout.ts";

test("six counters form one literal row with nonoverlapping 48px drag targets", () => {
  const board = counterBoardLayout(300, 6, "row");
  assert.equal(board.fieldHeight, 100);
  assert.equal(board.width, 362);
  assert.deepEqual(
    board.centers.map((p) => p.y),
    [50, 50, 50, 50, 50, 50],
  );
  assert.deepEqual(
    board.centers.map((p) => p.x),
    [36, 94, 152, 210, 268, 326],
  );
  assert.ok(board.centers.every((p) => p.x >= 24 && p.x + 24 <= board.width));
});

test("row width follows actual placed counters, and undo shrinks the worksheet", () => {
  assert.equal(counterBoardLayout(300, 0, "row").width, 300);
  assert.equal(counterBoardLayout(300, 4, "row").width, 300);
  assert.equal(counterBoardLayout(300, 6, "row").width, 362);
  assert.equal(counterBoardLayout(300, 5, "row").width, 304);
  assert.equal(counterBoardLayout(300, 0, "row").centers.length, 0);
});

test("supply remains centered in the visible part of a long row at every scroll position", () => {
  const board = counterBoardLayout(150, 12, "row");
  assert.equal(board.width, 710);
  assert.equal(board.scrollX, 560);
  for (const offset of [0, 100, 560]) {
    const supply = counterSupplyCenter(board, 150, offset);
    assert.equal(supply.x - offset, 75);
    assert.equal(supply.y, 177);
    assert.ok(supply.x - offset - 24 >= 0);
    assert.ok(supply.x - offset + 24 <= 150);
  }
  assert.equal(counterSupplyCenter(board, 150, 999).x, 635);
  assert.equal(counterSupplyCenter(board, 150, -20).x, 75);
});

test("the last placed counter and source are both reachable after automatic end scrolling", () => {
  const board = counterBoardLayout(150, 20, "row");
  const last = board.centers.at(-1)!;
  const supply = counterSupplyCenter(board, 150, board.scrollX);
  assert.ok(last.x - board.scrollX - 24 >= 0);
  assert.ok(last.x - board.scrollX + 24 <= 150);
  assert.ok(supply.x - board.scrollX - 24 >= 0);
  assert.ok(supply.x - board.scrollX + 24 <= 150);
});

test("default groups on a 150px side-by-side board keep 48px hit targets separate", () => {
  const board = counterBoardLayout(150, 8);
  assert.equal(board.columns, 2);
  assert.deepEqual(board.centers.slice(0, 4), [
    { x: 37.5, y: 34 },
    { x: 112.5, y: 34 },
    { x: 37.5, y: 92 },
    { x: 112.5, y: 92 },
  ]);
  for (let i = 0; i < board.centers.length; i++) {
    const a = board.centers[i];
    assert.ok(a.x - 24 >= 0 && a.x + 24 <= 150);
    for (const b of board.centers.slice(i + 1)) {
      assert.ok(Math.abs(a.x - b.x) >= 48 || Math.abs(a.y - b.y) >= 48);
    }
  }
});

test("wide default groups preserve four columns and existing board geometry", () => {
  const board = counterBoardLayout(300, 12);
  assert.equal(board.columns, 4);
  assert.equal(board.width, 300);
  assert.equal(board.fieldHeight, 190);
  assert.deepEqual(board.centers[4], { x: 37.5, y: 92 });
  assert.deepEqual(counterSupplyCenter(board, 300), { x: 150, y: 267 });
  assert.equal(counterBoardLayout(300, 13).fieldHeight, 248);
});
