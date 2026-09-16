import test from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import { isDone } from "../src/lib/assessment.ts";
import { taskTeaching } from "../src/lib/taskTeaching.ts";

for (const [id, n] of [
  ["p007-block07", 1],
  ["p008-block08", 2],
  ["p010-block06", 3],
] as const) {
  test(`${id}: objects, dots and numeral express the same quantity`, () => {
    const b = allBlocks.find((b) => b.id === id)!;
    assert.equal(b.kind, "picture");
    if (b.kind !== "picture") return;
    assert.equal(b.quantityMeaning?.number, n);
    assert.equal(b.images.length, n === 2 ? 7 : 6);
    assert.equal(b.expected.length, b.images.length);
    assert.ok(b.images.some((image) => image.includes(`domino_${n}`)));
    assert.ok(b.images.some((image) => image.includes(`digit_${n}_print`)));
    assert.doesNotMatch(b.prompt, /Найди цифру|карточку с цифрой/);
    for (const target of b.targets) assert.ok(b.expected.includes(target.id));
    assert.equal(
      isDone(b, { value: [b.expected.at(-1)!], checked: true }),
      false,
    );
    assert.equal(isDone(b, { value: b.expected, checked: true }), true);
    assert.equal(taskTeaching(b).family, `picture.number-meaning.${n}`);
    assert.doesNotMatch(
      taskTeaching(b)
        .steps.map((s) => s.text)
        .join(" "),
      /найти.*цифру|нажми прямо на цифру/i,
    );
  });
}

test("a genuine hidden digit task retains its search interaction", () => {
  const b = allBlocks.find((b) => b.id === "p001-block02")!;
  assert.equal(taskTeaching(b).family, "picture.find-digit");
  assert.match(b.prompt, /Найди и нажми/);
});
