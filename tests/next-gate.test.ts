import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks, pages } from "../src/content/book.ts";
import { canAdvance } from "../src/lib/assessment.ts";

test("«Дальше» opens only after the step is solved", () => {
  const b = pages[2].blocks.find((x) => x.kind === "picture")!;
  assert.equal(b.kind, "picture");
  if (b.kind !== "picture") return;
  assert.equal(canAdvance(b, undefined), false);
  assert.equal(canAdvance(b, { value: ["miss"], checked: true }), false);
  assert.ok(canAdvance(b, { value: b.expected, checked: true }));
});

test("reading and free practice are finished by pressing «Дальше»", () => {
  const read = allBlocks.find((b) => b.kind === "read")!;
  assert.ok(canAdvance(read, undefined));
  const free = allBlocks.find(
    (b) => b.kind === "counters" && b.expected === undefined,
  )!;
  assert.equal(canAdvance(free, undefined), false);
  assert.ok(canAdvance(free, { value: 2 }));
});
