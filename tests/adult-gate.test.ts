import test from "node:test";
import assert from "node:assert/strict";
import { gatePassed, gateQuestion } from "../src/lib/adultGate.ts";

test("every question is a two-digit number written in words", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 72; i++) {
    const q = gateQuestion(i / 72);
    assert.match(q.answer, /^[2-9][1-9]$/);
    assert.match(q.words, /^[а-я]+ [а-я]+$/);
    seen.add(q.answer);
  }
  assert.equal(seen.size, 72, "each pick asks its own number");
  assert.deepEqual(gateQuestion(0), { words: "двадцать один", answer: "21" });
  assert.deepEqual(gateQuestion(0.9999), {
    words: "девяносто девять",
    answer: "99",
  });
});

test("only the number asked for opens the way", () => {
  const q = gateQuestion(0.5);
  assert.equal(gatePassed(q, q.answer), true);
  assert.equal(gatePassed(q, ""), false);
  assert.equal(gatePassed(q, q.answer.split("").reverse().join("")), false);
  assert.equal(gatePassed(q, `${q.answer}0`), false);
});
