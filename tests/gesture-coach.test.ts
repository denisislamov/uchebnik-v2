import test from "node:test";
import assert from "node:assert/strict";
import { readSeenCoaches, coachSpotlight } from "../src/lib/gestureCoach.ts";
test("tutorial history rejects corrupt or unrelated progress and deduplicates families", () => {
  assert.deepEqual(readSeenCoaches("{"), []);
  assert.deepEqual(readSeenCoaches('{"answers":{}}'), []);
  assert.deepEqual(readSeenCoaches('["place","place","unknown","trace"]'), [
    "place",
    "trace",
  ]);
});
test("coach spotlight remains visible above the card on narrow and short screens", () => {
  for (const [w, h] of [
    [390, 844],
    [320, 568],
    [800, 480],
  ]) {
    const rect = coachSpotlight(
      { x: -20, y: 80, width: 1200, height: 800 },
      w,
      h,
    );
    assert.ok(rect);
    assert.ok(rect.x >= 0 && rect.y >= 0);
    assert.ok(rect.x + rect.width <= w);
    assert.ok(rect.y + rect.height <= h - 225);
  }
});

test("an offscreen target never gets a false spotlight somewhere else", () => {
  assert.equal(
    coachSpotlight({ x: 100, y: 163.5, width: 48, height: 48 }, 800, 375),
    null,
  );
  assert.equal(
    coachSpotlight({ x: 100, y: 900, width: 48, height: 48 }, 390, 844),
    null,
  );
});

import { allBlocks } from "../src/content/book.ts";
import { taskTeaching } from "../src/lib/taskTeaching.ts";
test("every actual semantic family, including combined practical modes, survives reload", () => {
  const families = [
    ...new Set(allBlocks.map((b) => `task:${taskTeaching(b).family}`)),
  ];
  assert.deepEqual(readSeenCoaches(JSON.stringify(families)), families);
});
