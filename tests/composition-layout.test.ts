import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compositionCounts,
  compositionLayout,
} from "../src/lib/compositionLayout.ts";
import { allBlocks } from "../src/content/book.ts";
import { taskTeaching } from "../src/lib/taskTeaching.ts";

test("shared strip fits ten adjacent squares even on a narrow phone", () => {
  for (const width of [232, 270, 340, 700]) {
    for (let total = 3; total <= 10; total++) {
      const layout = compositionLayout(width, total);
      assert.ok(layout.cell >= 20);
      assert.ok(layout.x >= 12 - 0.001);
      assert.ok(
        layout.center(total - 1).x + layout.cell / 2 <= width - 12 + 0.001,
      );
      for (let i = 1; i < total; i++) {
        assert.ok(
          Math.abs(layout.center(i).x - layout.center(i - 1).x - layout.cell) <
            0.001,
        );
        assert.equal(layout.center(i).y, layout.center(0).y);
      }
    }
  }
});
test("malformed saved composition cannot overflow the shared field", () => {
  assert.deepEqual(compositionCounts(5, 5, 10), [5, 5]);
  assert.deepEqual(compositionCounts(8, 8, 10), [0, 0]);
  assert.deepEqual(compositionCounts(-1, NaN, 10), [0, 0]);
  assert.deepEqual(compositionCounts(Infinity, 1.5, 10), [0, 0]);
});
test("all eight source pairs preserve colors and use the same two-color example", () => {
  const affected = allBlocks.filter(
    (b) => b.kind === "activity" && b.activity.partColors,
  );
  assert.equal(affected.length, 21);
  for (const b of affected) {
    assert.ok(b.kind === "activity");
    const page = Number(b.id.slice(1, 4));
    const expected = [15, 25, 27].includes(page)
      ? ["red", "green"]
      : ["green", "red"];
    assert.deepEqual(b.activity.partColors, expected, b.id);
    const intro = taskTeaching(b).steps.find((s) => s.example)!.example!;
    assert.equal(intro.kind, "compositionRow");
    assert.deepEqual(intro.colors, expected);
    assert.equal(intro.token, b.activity.token);
  }
});
