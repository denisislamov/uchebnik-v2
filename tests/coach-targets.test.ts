import test from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import {
  containsPoint,
  hotspotTouchPoint,
  pickTarget,
} from "../src/lib/hitTesting.ts";
import { nextCounterSlot, nextDigitCard } from "../src/lib/coachTargets.ts";

test("picture demonstration touches a selectable part of every runtime object", () => {
  for (const block of allBlocks) {
    if (block.kind !== "picture") continue;
    for (const target of block.targets) {
      const point = hotspotTouchPoint(target);
      assert.ok(containsPoint(target, point), `${block.id}: ${target.id}`);
      for (const width of [260, 650]) {
        assert.equal(
          pickTarget(
            block.targets.filter((t) => t.image === target.image),
            point,
            width,
            width,
          )?.id,
          target.id,
          `${block.id}: ${target.id} at ${width}`,
        );
      }
    }
  }
});

test("replaying square placement points to the next empty slot", () => {
  const slots = [
    { x: 0.42, y: 0.25 },
    { x: 0.42, y: 0.65 },
    { x: 0.62, y: 0.65 },
  ];
  assert.deepEqual(nextCounterSlot(slots, [0]), slots[1]);
  assert.deepEqual(nextCounterSlot(slots, [2, 0, 0, -1, 8]), slots[1]);
  assert.equal(nextCounterSlot(slots, [0, 1, 2]), undefined);
});

test("card tutorial chooses a required digit and the still incorrect place", () => {
  assert.deepEqual(nextDigitCard([-1, -1], [1, 4]), { index: 0, digit: 1 });
  assert.deepEqual(nextDigitCard([1, -1], [1, 4]), { index: 1, digit: 4 });
  assert.deepEqual(nextDigitCard([0, 4], [1, 4]), { index: 0, digit: 1 });
  assert.deepEqual(nextDigitCard([1, 4], [1, 9]), { index: 1, digit: 9 });
  assert.equal(nextDigitCard([1, 9], [1, 9]), undefined);
});
