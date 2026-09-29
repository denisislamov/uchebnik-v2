import test from "node:test";
import assert from "node:assert/strict";
import { pages } from "../src/content/book.ts";
import {
  HELP_AFTER,
  offerHelp,
  plural,
  retryLine,
  successLine,
} from "../src/lib/feedback.ts";

const blocks = pages.flatMap((p) => p.blocks);
const first = (kind: string) => blocks.find((b) => b.kind === kind)!;

test("plural follows Russian number agreement", () => {
  const word = (n: number) => plural(n, "палочка", "палочки", "палочек");
  assert.deepEqual([1, 2, 4, 5, 11, 12, 21, 22, 25, 101, 111].map(word), [
    "палочка",
    "палочки",
    "палочки",
    "палочек",
    "палочек",
    "палочек",
    "палочка",
    "палочки",
    "палочек",
    "палочка",
    "палочек",
  ]);
});

test("success names what was done and keeps the teacher's mark", () => {
  for (const block of blocks) {
    const line = successLine(block, { value: 3, checked: true });
    assert.match(line, /^✓ Верно! \S/, block.id);
    assert.ok(line.length > "✓ Верно! ".length + 5, block.id);
    assert.ok(
      !/следующему шагу/.test(line),
      "says what was done, not where to go",
    );
  }
  const number = first("number");
  if (number.kind !== "number") throw Error();
  assert.equal(
    successLine(number, { value: number.expected }),
    `✓ Верно! Получилось ${number.expected}.`,
  );
  const counters = blocks.find(
    (b) => b.kind === "counters" && b.expected !== undefined,
  )!;
  assert.match(
    successLine(counters, { value: 5 }),
    /^✓ Верно! На поле 5 (палочек|кружков)\.$/,
  );
});

test("a miss says where to look and never names the answer", () => {
  for (const block of blocks.filter((b) => b.kind === "number")) {
    if (block.kind !== "number") continue;
    for (const value of [block.expected - 1, block.expected + 1]) {
      if (value < 0) continue;
      const line = retryLine(block, { value, checked: true });
      assert.match(line, /^Пока не совпало\. /);
      assert.match(line, value > block.expected ? /больше/ : /меньше/);
      assert.ok(
        !new RegExp(`(^|\\D)${block.expected}(\\D|$)`).test(
          line.replace(String(value), ""),
        ),
        `${block.id}: the answer is not given away`,
      );
    }
  }
  for (const block of blocks)
    assert.match(retryLine(block, { value: "x" }), /^Пока не совпало\. \S/);
});

test("help is offered after the second miss, not before", () => {
  assert.equal(offerHelp({}), false);
  assert.equal(offerHelp({ attempts: HELP_AFTER - 1 }), false);
  assert.equal(offerHelp({ attempts: HELP_AFTER }), true);
});

test("coins put into the purse are named as the sum they make", () => {
  const coins = blocks.find(
    (b) => b.kind === "activity" && b.activity.mode === "coins",
  )!;
  assert.equal(
    successLine(coins, { responses: { "0": "3", "0coins": "1,2" } }),
    "✓ Верно! 1 + 2 = 3 копейки.",
  );
  assert.equal(
    successLine(coins, { responses: { "0": "3", "0coins": "3" } }),
    "✓ Верно! В кошельке 3 копейки.",
  );
});
