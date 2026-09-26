import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import { isCorrect } from "../src/lib/assessment.ts";
test("207 requires placing the digits in the right order, not entering fourteen", () => {
  const b = allBlocks.find((b) => b.exerciseNumber === 207)!;
  assert.equal(b.kind, "practical");
  assert.equal(isCorrect(b, { responses: { q1: "14", q2: "19" } }), false);
  assert.ok(b.kind === "practical");
  assert.deepEqual(
    b.steps.map((s) => s.counts),
    [
      [1, 4],
      [1, 9],
    ],
  );
  assert.ok(
    isCorrect(b, {
      practical: Object.fromEntries(
        b.steps.map((s) => [s.id, { counts: s.counts, confirmed: true }]),
      ),
      responses: { q1: "14", q2: "19" },
    }),
  );
});
test("321 requires arranging and removing counters", () => {
  const b = allBlocks.find((b) => b.exerciseNumber === 321)!;
  assert.ok(b.kind === "practical");
  assert.deepEqual(
    b.steps.map((s) => s.counts),
    [
      [5, 5],
      [5, 4],
    ],
  );
  assert.equal(
    isCorrect(b, { responses: { q1: "5", q2: "4", q3: "1" } }),
    false,
  );
});
test("604 exchanges a coin for smaller coins, not the unchanged original denomination", () => {
  const b = allBlocks.find((b) => b.exerciseNumber === 604)!;
  assert.equal(isCorrect(b, { responses: { "0": "15", "1": "20" } }), false);
  assert.equal(
    isCorrect(b, {
      responses: { "0": "15", "1": "20", "0coins": "15", "1coins": "20" },
    }),
    false,
  );
  assert.ok(
    isCorrect(b, {
      responses: { "0": "15", "1": "20", "0coins": "10,5", "1coins": "10,10" },
    }),
  );
});

test("207 asks what number was made without announcing it in the placement instructions", () => {
  const b = allBlocks.find((b) => b.exerciseNumber === 207)!;
  assert.ok(b.kind === "practical");
  assert.deepEqual(
    b.fields.map((f) => f.expected),
    ["14", "19"],
  );
  assert.doesNotMatch(
    b.steps.map((s) => s.instruction).join(" "),
    /четырнадцать|девятнадцать/,
  );
  const practical = Object.fromEntries(
    b.steps.map((s) => [s.id, { counts: s.counts, confirmed: true }]),
  );
  assert.equal(isCorrect(b, { practical }), false);
  assert.ok(isCorrect(b, { practical, responses: { q1: "14", q2: "19" } }));
});
