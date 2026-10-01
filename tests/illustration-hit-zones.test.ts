import { test } from "node:test";
import assert from "node:assert/strict";
import { pages } from "../src/content/book.ts";
import { pickTarget } from "../src/lib/hitTesting.ts";

test("the revised page 3 pencils can be tapped where the painted barrels are", () => {
  const pencil = pages[2].blocks[3];
  assert.equal(pencil.kind, "picture");
  if (pencil.kind !== "picture") return;

  // Hand-checked points on the new illustration, in image coordinates.
  assert.equal(pickTarget(pencil.targets, { x: 0.15, y: 0.42 }, 500, 190)?.id, "green");
  assert.equal(pickTarget(pencil.targets, { x: 0.6, y: 0.72 }, 500, 190)?.id, "red");
});
