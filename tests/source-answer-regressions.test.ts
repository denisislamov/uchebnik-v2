import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fullBookData } from "../src/content/fullBookData.ts";

// Independent keys transcribed from textbook/pages/page_NNN.png during the source review.
// These constants deliberately do not use the generated answers or the Markdown key tables.
const blocks = (fullBookData as unknown as { blocks: any[] }[]).flatMap(
  (p) => p.blocks,
);
const task = (n: number) => blocks.filter((b) => b.exerciseNumber === n);
const answers = (n: number) =>
  task(n)
    .flatMap((b) => b.fields ?? [])
    .map((f) => f.expected);
const keys: Record<number, number[]> = {
  26: [7],
  37: [8, 6],
  211: [12, 17, 19],
  235: [1, 2, 1, 6, 1, 8, 1, 9],
  252: [14, 14, 18, 18, 20, 20],
  275: [13, 16, 17, 18, 16, 18],
  282: [14, 18, 15, 19, 20, 20, 14, 16],
  287: [18, 20, 18, 16, 14, 20],
  291: [10, 14, 19, 15, 17, 20],
  95: [8, 6, 10, 5, 9, 7, 2, 6, 4, 1, 5, 3],
  306: [13, 15, 12, 16, 11, 14, 10, 13, 11, 14, 12, 15],
  320: [15, 20, 20, 19, 14, 15, 12, 13, 14, 13, 11, 3],
  324: [4],
  325: [4],
  332: [12, 14, 14],
  393: [4, 5],
  399: [6, 7],
  422: [2, 6, 4, 3, 7, 5, 8, 5, 6, 3],
  430: [2, 4, 1, 3, 6, 5, 9, 7, 8, 5, 4, 6],
  437: [1, 4, 2, 5, 3, 6, 8, 7, 5, 6],
  444: [6, 7, 8],
  451: [13, 18, 18, 20, 13, 9, 8, 8],
  546: [3, 6, 18],
  547: [12],
  551: [6, 9, 12, 15, 18],
  557: [8, 12, 16],
  723: [40, 70, 30, 90],
  724: [2, 4, 6, 9],
  726: [33, 3, 3],
  728: [31, 3, 1],
  867: [80],
};
for (const [n, expected] of Object.entries(keys)) {
  test(`scan key and complete subquestions for № ${n}`, () => {
    assert.deepEqual(answers(+n), expected.map(String));
  });
}
test("compositions accept child-chosen addends for 4 through 8", () => {
  for (const [n, sum] of [
    [72, 4],
    [99, 5],
    [121, 6],
    [141, 7],
    [155, 8],
  ]) {
    assert.equal(task(n)[0].kind, "activity");
    assert.equal(task(n)[0].activity.mode, "composition");
    assert.deepEqual(task(n)[0].activity.targets, [sum]);
    assert.equal(task(n)[0].activity.token, "square");
  }
});
test("story labels preserve pebbles and counting counters", () => {
  assert.ok(task(37)[0].fields.every((f: any) => /камеш/.test(f.label)));
  assert.ok(task(321)[0].fields.every((f: any) => !/птиц/i.test(f.label)));
});
test("continuation of № 489 is one required exercise across pages 92 and 93", () => {
  assert.equal(task(489).filter((b) => b.kind !== "read").length, 1);
});
test("№ 773 answers a date in March", () => {
  assert.match(task(773)[0].fields[0].label, /марта/);
  assert.deepEqual(answers(773), ["30"]);
});

test("extractor keeps split frame keys local and excludes layout annotations", () => {
  const source = JSON.parse(
    readFileSync(
      new URL("../scripts/content/source_blocks.json", import.meta.url),
      "utf8",
    ),
  );
  const sourceTask = (n: number) =>
    source.flatMap((p: any) => p.blocks).filter((b: any) => b.number === n);
  assert.equal(sourceTask(95).length, 2);
  assert.match(sourceTask(95)[0].solution, /4\+4=8/);
  assert.doesNotMatch(sourceTask(95)[0].solution, /6−4=2/);
  assert.match(sourceTask(306)[0].solution, /16 − 3 = 13/);
  assert.doesNotMatch(sourceTask(306)[0].solution, /14 − 4 = 10/);
  assert.doesNotMatch(sourceTask(320)[0].text, /выровнены/);
});
