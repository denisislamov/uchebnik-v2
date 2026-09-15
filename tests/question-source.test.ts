import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import { courseCorrect } from "../src/lib/courseAssessment.ts";

// Printed source/MD fixtures: F037-13, F111-QUESTION, R085-02, R096-01.
// Independent of question_tasks.py: missing actions or changed story keys must fail.
const sourceCases: [number, string[], string[]][] = [
  [90, ["3"], ["Сколько тарелок осталось на полке?"]],
  [102, ["10"], ["Сколько всего картин повесили в школьном зале?"]],
  [110, ["2"], ["Сколько дощечек осталось у Пети?"]],
  [116, ["2"], ["Сколько флажков Мане осталось сделать?"]],
  [132, ["4"], ["Сколько квадратиков Володе осталось вырезать?"]],
  [151, ["3"], ["Сколько рублей сдачи получила мама?"]],
  [159, ["1"], ["Сколько звёздочек Васе осталось вырезать?"]],
  [165, ["10", "1"], ["Сколько лоскутков осталось у Сони после шитья одеяла?"]],
  [177, ["5", "1"], ["Сколько всего метров отпилил столяр за два раза?"]],
  [242, ["18"], ["Сколько всего молотков купили для школы?"]],
  [
    255,
    ["19"],
    ["Сколько всего учеников первого класса записалось в библиотеку?"],
  ],
  [260, ["16"], ["Сколько всего кур было у девочки?"]],
  [261, ["20"], ["Сколько всего лыжников отправилось на прогулку?"]],
  [304, ["11"], ["Сколько дверей маляру осталось покрасить?"]],
  [307, ["12"], ["Сколько страниц девочке осталось прочитать?"]],
  [313, ["12"], ["Сколько звёздочек сделал Юра?"]],
  [419, ["4"], ["Сколько кисточек дежурному осталось выдать?"]],
  [447, ["7"], ["Сколько платков выгладила Нина?"]],
  [461, ["5"], ["Сколько всего килограммов овощей донёс Миша?"]],
  [486, ["6"], ["Сколько листов красной бумаги купили?"]],
  [
    515,
    ["9", "20"],
    [
      "Сколько книг было у сестры?",
      "Сколько всего книг было у брата и сестры?",
    ],
  ],
  [607, ["12"], ["Сколько всего человек ехало в четырёх машинах?"]],
  [611, ["9"], ["Сколько уток принёс охотник в другой раз?"]],
  [612, ["9", "16"], ["Сколько всего зайцев принесли охотники за два раза?"]],
  [761, ["40"], ["Сколько человек стало в пионерском отряде?"]],
  [788, ["60"], ["Сколько детей во втором детском саду?"]],
  [789, ["30", "70"], ["Сколько всего человек в обоих отрядах?"]],
  [809, ["80"], ["Сколько всего деревьев посадили пионеры?"]],
  [833, ["11"], ["Сколько кустов смородины окопал Лёня?"]],
  [834, ["5", "14"], ["Сколько всего деревьев окопали папа и Костя?"]],
  [835, ["80"], ["Сколько лошадей в колхозе в этом году?"]],
];

for (const [n, numbers, questions] of sourceCases) {
  const block = allBlocks.find((b) => b.exerciseNumber === n)!;
  test(`exercise ${n} cannot pass with numeric answers alone`, () => {
    assert.equal(block.kind, "work");
    if (block.kind !== "work") return;
    const numeric = block.fields.filter((f) => !f.id.startsWith("question"));
    assert.equal(numeric.length, numbers.length);
    const responses = Object.fromEntries(
      numeric.map((f, i) => [f.id, numbers[i]]),
    );
    assert.equal(courseCorrect(block, { responses }), false);
  });

  test(`exercise ${n} requires the source question before all retained numeric parts`, () => {
    assert.equal(block.kind, "work");
    if (block.kind !== "work") return;
    const choices = block.fields.filter((f) => f.id.startsWith("question"));
    assert.deepEqual(
      choices.map((f) => f.expected),
      questions,
    );
    assert.deepEqual(block.fields.slice(0, choices.length), choices);
    for (const field of choices) {
      assert.ok(field.options && field.options.length >= 3);
      assert.equal(new Set(field.options).size, field.options.length);
      assert.ok(field.options.includes(field.expected));
      assert.ok(
        field.options.every((option) => !/\d/.test(option)),
        "Choices must not disclose calculated answers",
      );
    }
    const numeric = block.fields.filter((f) => !f.id.startsWith("question"));
    const responses = Object.fromEntries([
      ...numeric.map((f, i) => [f.id, numbers[i]]),
      ...choices.map((f, i) => [f.id, questions[i]]),
    ]);
    assert.equal(courseCorrect(block, { responses }), true);
    for (const choice of choices) {
      for (const wrong of choice.options!.filter(
        (q) => q !== choice.expected,
      )) {
        assert.equal(
          courseCorrect(block, {
            responses: { ...responses, [choice.id]: wrong },
          }),
          false,
        );
      }
    }
  });
}

test("two-action requests keep the final combined question, and the two stories in 165/177 stay distinct", () => {
  const fields = (n: number) => {
    const b = allBlocks.find((b) => b.exerciseNumber === n)!;
    assert.ok(b.kind === "work");
    return b.fields.filter((f) => f.id.startsWith("question"));
  };
  assert.match(fields(165)[0].label, /втор/);
  assert.match(fields(177)[0].label, /перв/);
  assert.match(fields(515)[0].label, /одн/);
  assert.match(fields(515)[1].label, /дв/);
  for (const n of [612, 789, 834]) assert.match(fields(n)[0].label, /дв/);
  for (const n of [486, 611, 788, 833]) assert.match(fields(n)[0].label, /одн/);
});
