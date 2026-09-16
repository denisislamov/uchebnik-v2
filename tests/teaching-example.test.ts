import test from "node:test";
import assert from "node:assert/strict";
import { exampleGroups, exampleSelected } from "../src/lib/teachingExample.ts";
test("subtracting two from five shows five original counters and two crossed out, never seven", () =>
  assert.deepEqual(exampleGroups("count", [5, 2], "5 − 2"), [
    { count: 5, removed: 2 },
  ]));
test("counting highlights one successive counter, while equal groups highlight a whole group", () => {
  for (let active = 0; active < 3; active++)
    assert.deepEqual(
      [0, 1, 2].map((i) => exampleSelected("count", 0, i, active)),
      [0, 1, 2].map((i) => i === active),
    );
  assert.equal(exampleSelected("groups", 2, 0, 2), true);
});
test("a ruler active value selects a tick, never a word in the caption", () => {
  assert.equal(exampleSelected("ruler", 3, 0, 3), false);
  assert.equal(exampleSelected("sequence", 2, 0, 2), true);
});
