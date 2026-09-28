import { test } from "node:test";
import assert from "node:assert/strict";
import { pages } from "../src/content/book.ts";
// @ts-ignore: the rules are a plain module shared with the report script.
import { lintBlock, lintPage } from "../scripts/content/text_rules.mjs";

const rules = (block: object) =>
  (lintBlock(block) as string[]).map((issue) => issue.slice(0, 2));
const work = (
  title: string,
  prompt: string,
  labels: [string, string][] = [],
) => ({
  kind: "work",
  title,
  prompt,
  fields: labels.map(([label, expected], i) => ({
    id: `q${i}`,
    label,
    expected,
  })),
});

// Each case is a screen the testers marked in review 2, as it was and as it became.
test("a heading alone does not tell what to do", () => {
  assert.deepEqual(rules(work("Два набора мячей", "Два набора мячей")), [
    "T2",
    "P1",
  ]);
  assert.deepEqual(
    rules(work("Два набора мячей", "Посчитай мячи на каждой картинке.")),
    [],
  );
});
test("a heading is a name, not a sentence", () => {
  assert.deepEqual(
    rules({
      kind: "activity",
      title: "Разложи 3 квадратика так: 2 и 1.",
      prompt: "Разложи 3 квадратика так: 2 и 1.",
    }),
    ["T1", "T2"],
  );
  assert.deepEqual(
    rules({
      kind: "activity",
      title: "Состав числа 3",
      prompt: "Разложи 3 квадратика так: 2 и 1.",
    }),
    [],
  );
});
test("an answer field asks a question", () => {
  const was = work("Число четыре", "Посчитай детей, жетоны и точки.", [
    ["Сколько детей?", "4"],
    ["Жетонов на карточке", "4"],
    ["Столбик 1", "1"],
  ]);
  assert.deepEqual(rules(was), ["F1", "F1"]);
  assert.deepEqual(
    rules(
      work("Число четыре", "Посчитай детей, жетоны и точки.", [
        ["Сколько детей?", "4"],
        ["Сколько жетонов на карточке?", "4"],
        ["4 + □ = 6", "2"],
        ["Запиши цифрами: тридцать пять.", "35"],
      ]),
    ),
    [],
  );
});
test("a label must not name the answer, but a longer number word is not a hint", () => {
  assert.deepEqual(
    rules(
      work("Прибавим один", "Ответь на вопросы.", [
        ["Сколько рыбок после добавления пятой?", "5"],
      ]),
    ),
    ["F2"],
  );
  assert.deepEqual(
    rules(
      work("Десятки и единицы", "Ответь на вопросы.", [
        ["Сколько единиц в четырнадцати?", "4"],
        ["Сколько десятков составляет шестьдесят?", "6"],
      ]),
    ),
    [],
  );
});
test("a description of the printed page is not a task", () => {
  for (const prompt of [
    "и четыре столбика по 4 примера:\n7+2, 2+7",
    "рамка: 5 7 4 6 9 8, справа − 3.",
    "Сколько кисточек осталось?\nНиже по центру:\n20 − 12 =\n(черта)",
    "Сколько стоят краски? (дороже жирным)",
  ])
    assert.ok(rules(work("Примеры", prompt)).includes("R1"), prompt);
  assert.deepEqual(
    rules({
      kind: "read",
      title: "Заголовки",
      prompt: "Рассмотри",
      body: "Вверху страницы по центру крупными буквами: Сложение.",
    }),
    ["R1"],
  );
  // Real frames in a picture are not layout.
  assert.deepEqual(
    rules({
      kind: "picture",
      title: "Число 2",
      prompt: "Найди и нажми на оба стула, оба окна и обе рамки на стене.",
    }),
    [],
  );
});
test("the book's own wording counts as an instruction", () => {
  for (const prompt of [
    "Увеличить 40 на 10; 60 на 20; 50 на 30.",
    "От 18 отнимайте по 3, пока не получится 0.",
    "Сколько надо прибавить к 9, чтобы получить 10?",
  ])
    assert.deepEqual(rules(work("Упражнение", prompt)), [], prompt);
});
test("a phrase is short enough to be heard; numbers in it are not words", () => {
  const long =
    "Найдите в первом столбике пример с ответом пять, во втором столбике пример с ответом шесть, в третьем столбике пример с ответом четыре и в четвёртом столбике пример с ответом семь.";
  assert.deepEqual(rules(work("Упражнение", long)), ["P2"]);
  assert.deepEqual(
    rules(
      work(
        "Упражнение",
        "Найдите в таблице числа: 5, 15, 25, 35, 45, 55, 65, 75, 85, 95, 3, 23, 43, 63, 83, 1, 2, 4, 6, 7, 8, 9, 10, 11, 12.",
      ),
    ),
    [],
  );
});
test("page titles are short and carry no bracketed lists", () => {
  assert.equal(
    lintPage({
      title:
        "Задачи по картинкам на сложение (кролики 3 + 1, морковки 4 + 1), схемы с кружками",
    }).length,
    2,
  );
  assert.deepEqual(lintPage({ title: "Задачи по картинкам на сложение" }), []);
});
test("the whole book follows the rules", () => {
  const issues = pages.flatMap((page) => [
    ...lintPage(page).map((issue: string) => `стр. ${page.number}: ${issue}`),
    ...page.blocks.flatMap((b) =>
      lintBlock(b).map((issue: string) => `${b.id}: ${issue}`),
    ),
  ]);
  assert.deepEqual(issues, []);
});
