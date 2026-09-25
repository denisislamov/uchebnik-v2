import test from "node:test";
import assert from "node:assert/strict";
import { blankRuns, spokenBlanks } from "../src/lib/blanks.ts";
import { promptRepeatsTitle } from "../src/lib/blockText.ts";
import { allBlocks } from "../src/content/book.ts";

test("a blank in an equation becomes a gap run, never a glyph", () => {
  assert.deepEqual(blankRuns("4 + □ = 6"), ["4 + ", { blank: true }, " = 6"]);
  assert.deepEqual(blankRuns("□ + 2 = 5"), [{ blank: true }, " + 2 = 5"]);
  assert.deepEqual(blankRuns("нет пропусков"), ["нет пропусков"]);
  assert.equal(spokenBlanks("4 + □ = 6"), "4 + пропуск = 6");
});

test("the task text is hidden only when it literally repeats the heading", () => {
  assert.equal(
    promptRepeatsTitle({
      kind: "work",
      title: "Разложи 3 квадратика так: 2 и 1.",
      prompt: "Разложи 3 квадратика так: 2 и 1",
    } as never),
    true,
  );
  assert.equal(
    promptRepeatsTitle({
      kind: "work",
      title: "Дети на велосипедах",
      prompt: "Сколько всего детей?",
    } as never),
    false,
  );
  assert.equal(
    promptRepeatsTitle({
      kind: "read",
      title: "Первый десяток",
      prompt: "Первый десяток",
    } as never),
    false,
  );
  const repeats = allBlocks.filter(promptRepeatsTitle).length;
  // 120 generated blocks have title == prompt; 8 of them are read-only cards, which keep their heading.
  assert.ok(
    repeats >= 100 && repeats < 200,
    `${repeats} generated blocks repeat their heading`,
  );
});
