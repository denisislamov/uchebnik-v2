import test from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import { isCorrect } from "../src/lib/assessment.ts";
import { composeStory } from "../src/lib/composeStory.ts";
test("an open story includes the chosen objects, quantities, relation and a matching question", () => {
  const story = composeStory("−", "яблоки", "5", "3");
  assert.match(story.condition, /5 яблок/);
  assert.match(story.condition, /3 яблока/);
  assert.match(story.condition, /Забрали/);
  assert.match(story.question, /Сколько яблок осталось/);
});
test("a word and a numerical equation alone do not complete a composed problem", () => {
  const b = allBlocks.find((b) => b.exerciseNumber === 65)!;
  const responses = { "0story": "яблоки", "0a": "5", "0b": "3", "0c": "2" };
  assert.equal(isCorrect(b, { responses }), false);
  assert.ok(
    isCorrect(b, {
      responses: {
        ...responses,
        "0question": composeStory("−", "яблоки", "5", "3").question,
      },
    }),
  );
  assert.equal(
    isCorrect(b, {
      responses: { ...responses, "0question": "Какого цвета предметы?" },
    }),
    false,
  );
});
