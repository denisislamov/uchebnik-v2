import assert from "node:assert/strict";
import test from "node:test";
import { allBlocks } from "../src/content/book.ts";
import { isCorrect, isDone } from "../src/lib/assessment.ts";
import { execFileSync } from "node:child_process";
import {
  storyCorrect,
  selectStoryVariant,
} from "../src/lib/storyAssessment.ts";
import type { StorySpec } from "../src/content/storyTypes.ts";
const fixture: StorySpec = {
  story: {
    unit: "литры",
    max: 20,
    variants: [
      {
        id: "milk",
        label: "Молоко",
        description: "Два бидона по 9 л и ещё 2 л",
        steps: [
          {
            id: "first",
            question: "В двух бидонах?",
            operator: "×",
            left: 9,
            right: 2,
          },
          {
            id: "second",
            question: "Всего?",
            operator: "+",
            left: { result: "first" },
            right: 2,
          },
        ],
      },
    ],
  },
};
test("linked story accepts both correct operations with common source unit", () => {
  assert.equal(
    storyCorrect(fixture, {
      responses: {
        storyVariant: "milk",
        storyUnit: "литры",
        firstOperator: "×",
        firstResult: "18",
        secondOperator: "+",
        secondResult: "20",
      },
    }),
    true,
  );
});
test("an unrelated story, incompatible unit or missing intermediate answer cannot pass", () => {
  const r = {
    storyVariant: "milk",
    storyUnit: "литры",
    firstOperator: "×",
    firstResult: "18",
    secondOperator: "+",
    secondResult: "20",
  };
  for (const patch of [
    { storyVariant: "apples" },
    { storyUnit: "яблоки" },
    { firstResult: "" },
    { firstResult: "17" },
    { secondOperator: "−" },
    { secondResult: "19" },
  ])
    assert.equal(
      storyCorrect(fixture, { responses: { ...r, ...patch } }),
      false,
    );
});
// Mapping checks are lazy so absence of a new map does not hide the evaluator RED above.
const mapping = () =>
  JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        'import json,sys; sys.path.insert(0,"scripts/content"); from story_tasks import STORY; print(json.dumps(STORY))',
      ],
      { encoding: "utf8" },
    ),
  ) as Record<string, StorySpec>;
function solve(
  n: number,
  variant: string,
  unit: string,
  values: Record<string, string>,
) {
  return storyCorrect(mapping()[n], {
    responses: { storyVariant: variant, storyUnit: unit, ...values },
  });
}
test("№149 accepts source prices as sum and difference", () => {
  assert.equal(
    solve(149, "total", "рубли", { firstOperator: "+", firstResult: "10" }),
    true,
  );
  assert.equal(
    solve(149, "difference", "рубли", { firstOperator: "−", firstResult: "4" }),
    true,
  );
});
test("№360 accepts soap and bandage for 3 rubles and change from 5", () => {
  assert.equal(
    solve(360, "soap-bandage", "рубли", {
      paid: "5",
      firstOperator: "+",
      firstResult: "3",
      secondOperator: "−",
      secondResult: "2",
    }),
    true,
  );
  assert.equal(
    solve(360, "soap-bandage", "рубли", {
      paid: "2",
      firstOperator: "+",
      firstResult: "3",
      secondOperator: "−",
      secondResult: "1",
    }),
    false,
  );
});
test("№875 measures two independent sides using one selected measure", () => {
  const values = {
    measure: "5",
    lengthTimes: "8",
    widthTimes: "3",
    lengthOperator: "×",
    lengthResult: "40",
    widthOperator: "×",
    widthResult: "15",
  };
  assert.equal(solve(875, "garden", "метры", values), true);
  assert.equal(
    solve(875, "garden", "метры", { ...values, widthResult: "" }),
    false,
  );
  assert.equal(
    solve(875, "garden", "метры", { ...values, measure: "6" }),
    false,
  );
});
test("№853 permits each learned operation within school garden context", () => {
  for (const [variant, a, b, op, result] of [
    ["plant", "8", "3", "+", "11"],
    ["remaining", "12", "4", "−", "8"],
    ["rows", "4", "3", "×", "12"],
    ["share", "12", "3", ":", "4"],
  ]) {
    assert.equal(
      solve(853, variant, "деревья", {
        a,
        b,
        firstOperator: op,
        firstResult: result,
      }),
      true,
    );
  }
  assert.equal(
    solve(853, "share", "деревья", {
      a: "11",
      b: "3",
      firstOperator: ":",
      firstResult: "3",
    }),
    false,
  );
});
test("№49/186/187 preserve currency and length with no arbitrary apples", () => {
  for (const [n, unit, op, value] of [
    [49, "рубли", "+", "4"],
    [186, "метры", "+", "9"],
    [187, "метры", "−", "5"],
  ] as const) {
    assert.equal(
      solve(n, "first", unit, { firstOperator: op, firstResult: value }),
      true,
    );
    assert.equal(
      solve(n, "first", "яблоки", { firstOperator: op, firstResult: value }),
      false,
    );
  }
});
test("№598/680/702 retain exactly two connected operations and source units", () => {
  for (const [n, unit, op1, v1, op2, v2] of [
    [598, "литры", "×", "18", "+", "20"],
    [680, "рубли", "−", "12", ":", "6"],
    [702, "килограммы", "+", "14", ":", "2"],
  ] as const) {
    const spec = mapping()[n];
    const steps = spec.story.variants[0].steps;
    assert.deepEqual(steps[1].left, { result: "first" });
    assert.equal(
      solve(n, "first", unit, {
        firstOperator: op1,
        firstResult: v1,
        secondOperator: op2,
        secondResult: v2,
      }),
      true,
    );
  }
});
test("source-permitted alternative contexts retain the same constrained mathematics", () => {
  for (const [n, variant, unit, op1, v1, op2, v2] of [
    [49, "purchase", "рубли", "+", "4", null, null],
    [186, "path", "метры", "+", "9", null, null],
    [187, "path", "метры", "−", "5", null, null],
    [598, "water", "литры", "×", "18", "+", "20"],
    [680, "albums", "рубли", "−", "12", ":", "6"],
    [702, "hens", "килограммы", "+", "14", ":", "2"],
  ] as const) {
    const r: Record<string, string> = { firstOperator: op1, firstResult: v1 };
    if (op2 && v2) {
      r.secondOperator = op2;
      r.secondResult = v2;
    }
    assert.equal(solve(n, variant, unit, r), true);
  }
  for (const [variant, paid, total, change] of [
    ["soap-brush", "10", "5", "5"],
    ["brush-bandage", "5", "4", "1"],
  ]) {
    assert.equal(
      solve(360, variant, "рубли", {
        paid,
        firstOperator: "+",
        firstResult: total,
        secondOperator: "−",
        secondResult: change,
      }),
      true,
    );
  }
});
test("child-created story quantities must be integers and remain inside the studied range", () => {
  const values = { a: "8", b: "3", firstOperator: "+", firstResult: "11" };
  for (const a of ["", "-8", "2.5", "1e1", "101", "0"])
    assert.equal(solve(853, "plant", "деревья", { ...values, a }), false);
  assert.equal(
    solve(853, "plant", "деревья", {
      a: "90",
      b: "20",
      firstOperator: "+",
      firstResult: "110",
    }),
    false,
  );
});
test("garden contexts and related second operations are explicit in the data", () => {
  const map = mapping();
  assert.ok(
    map[853].story.variants.every((v) => /школьном саду/.test(v.description)),
  );
  assert.match(map[875].story.variants[0].description, /школьный огород/);
  assert.equal(map[875].story.variants[0].steps.length, 2);
  assert.deepEqual(map[360].story.variants[1].steps[1].right, {
    result: "first",
  });
  assert.deepEqual(
    map[598].story.variants[0].steps.map((s) => s.operator),
    ["×", "+"],
  );
  assert.deepEqual(
    map[680].story.variants[0].steps.map((s) => s.operator),
    ["−", ":"],
  );
  assert.deepEqual(
    map[702].story.variants[0].steps.map((s) => s.operator),
    ["+", ":"],
  );
});

test("runtime connects all ten source stories to isCorrect and requires complete checked answers", () => {
  const sourceAnswers: Record<number, Record<string, string>> = {
    49: {
      storyVariant: "first",
      storyUnit: "рубли",
      firstOperator: "+",
      firstResult: "4",
    },
    149: {
      storyVariant: "difference",
      storyUnit: "рубли",
      firstOperator: "−",
      firstResult: "4",
    },
    186: {
      storyVariant: "first",
      storyUnit: "метры",
      firstOperator: "+",
      firstResult: "9",
    },
    187: {
      storyVariant: "first",
      storyUnit: "метры",
      firstOperator: "−",
      firstResult: "5",
    },
    360: {
      storyVariant: "soap-bandage",
      storyUnit: "рубли",
      paid: "5",
      firstOperator: "+",
      firstResult: "3",
      secondOperator: "−",
      secondResult: "2",
    },
    598: {
      storyVariant: "first",
      storyUnit: "литры",
      firstOperator: "×",
      firstResult: "18",
      secondOperator: "+",
      secondResult: "20",
    },
    680: {
      storyVariant: "first",
      storyUnit: "рубли",
      firstOperator: "−",
      firstResult: "12",
      secondOperator: ":",
      secondResult: "6",
    },
    702: {
      storyVariant: "first",
      storyUnit: "килограммы",
      firstOperator: "+",
      firstResult: "14",
      secondOperator: ":",
      secondResult: "2",
    },
    853: {
      storyVariant: "rows",
      storyUnit: "деревья",
      a: "4",
      b: "3",
      firstOperator: "×",
      firstResult: "12",
    },
    875: {
      storyVariant: "garden",
      storyUnit: "метры",
      measure: "5",
      lengthTimes: "8",
      widthTimes: "3",
      lengthOperator: "×",
      lengthResult: "40",
      widthOperator: "×",
      widthResult: "15",
    },
  };
  assert.equal(Object.keys(sourceAnswers).length, 10);
  for (const [n, responses] of Object.entries(sourceAnswers)) {
    const matching = allBlocks.filter((b) => b.exerciseNumber === Number(n));
    assert.equal(matching.length, 1, `№${n} has one runtime task`);
    const block = matching[0];
    assert.equal(block.kind, "story", `№${n} uses story runtime`);
    assert.ok(block.kind === "story");
    assert.equal(
      isCorrect(block, { responses }),
      true,
      `№${n} accepts source-correct solution`,
    );
    assert.equal(
      isDone(block, { responses }),
      false,
      `№${n} requires child check`,
    );
    assert.equal(
      isDone(block, { responses, checked: true }),
      true,
      `№${n} checked solution completes task`,
    );
    assert.equal(
      isCorrect(block, { responses: { ...responses, storyUnit: "яблоки" } }),
      false,
      `№${n} rejects unrelated units`,
    );
    const variant = block.story.variants.find(
      (v) => v.id === responses.storyVariant,
    )!;
    const last = variant.steps.at(-1)!;
    assert.equal(
      isCorrect(block, {
        responses: { ...responses, [`${last.id}Result`]: "" },
        checked: true,
      }),
      false,
      `№${n} rejects partial answer`,
    );
    assert.equal(
      isCorrect(block, {
        responses: { ...responses, [`${last.id}Result`]: "99" },
        checked: true,
      }),
      false,
      `№${n} revalidates edited results`,
    );
  }
});

test("required picture stories cannot pass by completing only one of their independent tasks", () => {
  const multiple = {
    story: {
      ...fixture.story,
      requiredVariants: true,
      variants: [
        fixture.story.variants[0],
        { ...fixture.story.variants[0], id: "other" },
      ],
    },
  };
  const r = {
    storyVariant: "milk",
    storyUnit: "литры",
    firstOperator: "×",
    firstResult: "18",
    secondOperator: "+",
    secondResult: "20",
  };
  assert.equal(storyCorrect(multiple, { responses: r }), false);
  const nested = Object.fromEntries(
    Object.entries(r).map(([k, v]) => [`milk__${k}`, v]),
  );
  assert.equal(storyCorrect(multiple, { responses: nested }), false);
  const all = {
    ...nested,
    ...Object.fromEntries(
      Object.entries({ ...r, storyVariant: "other" }).map(([k, v]) => [
        `other__${k}`,
        v,
      ]),
    ),
  };
  assert.equal(storyCorrect(multiple, { responses: all }), true);
});
test("all additional source stories have appropriate contexts and complete mappings", () => {
  for (const n of [
    191, 192, 193, 243, 448, 465, 541, 591, 605, 606, 695, 697, 711, 712, 823,
    890,
  ])
    assert.ok(mapping()[n], `№${n} mapped`);
});

test("source-specific completed conditions retain numbers, units and subjects", () => {
  const cases: [
    number,
    string,
    Record<string, string>,
    string,
    string,
    string,
  ][] = [
    [191, "карандаши", { colored: "3" }, "+", "5", "Лены"],
    [192, "рубли", { book: "2" }, "+", "8", "альбом"],
    [193, "рубли", { bucket: "4", spade: "3" }, "+", "7", "ведёрко"],
    [243, "картины", { pictures: "4" }, "+", "15", "школе"],
    [448, "строки", { lines: "16" }, "−", "8", "Саше"],
    [605, "рубли", { pupils: "5" }, "×", "10", "кино"],
    [606, "метры", { cloth: "4" }, "×", "12", "платье"],
    [695, "килограммы", {}, ":", "1", "крупы"],
    [697, "метры", {}, ":", "2", "рубашек"],
    [711, "рубли", {}, ":", "2", "книги"],
    [712, "рубли", {}, "×", "18", "книги"],
    [823, "ученики", {}, ":", "20", "школьном огороде"],
    [890, "книги", { books: "4" }, "×", "12", "каникулы"],
  ];
  const map = mapping();
  for (const [n, unit, inputs, operator, result, subject] of cases) {
    assert.ok(
      map[n].story.variants[0].description.includes(subject),
      `№${n} source subject`,
    );
    const responses = {
      storyVariant: "first",
      storyUnit: unit,
      ...inputs,
      firstOperator: operator,
      firstResult: result,
    };
    assert.equal(
      storyCorrect(map[n], { responses }),
      true,
      `№${n} source answer`,
    );
    assert.equal(
      storyCorrect(map[n], {
        responses: { ...responses, storyUnit: "яблоки" },
      }),
      false,
      `№${n} inappropriate unit`,
    );
  }
});
test("№465 requires both stories and №541 requires cups and plates with separate units", () => {
  const map = mapping();
  const answer465 = {
    add__storyVariant: "add",
    add__storyUnit: "килограммы",
    add__firstOperator: "+",
    add__firstResult: "19",
    subtract__storyVariant: "subtract",
    subtract__storyUnit: "килограммы",
    subtract__firstOperator: "−",
    subtract__firstResult: "4",
  };
  assert.equal(storyCorrect(map[465], { responses: answer465 }), true);
  assert.equal(
    storyCorrect(map[465], {
      responses: { ...answer465, subtract__firstResult: "" },
    }),
    false,
  );
  const answer541 = {
    cups__storyVariant: "cups",
    cups__storyUnit: "чашки",
    cups__firstOperator: "×",
    cups__firstResult: "10",
    plates__storyVariant: "plates",
    plates__storyUnit: "тарелки",
    plates__firstOperator: "×",
    plates__firstResult: "12",
  };
  assert.equal(storyCorrect(map[541], { responses: answer541 }), true);
  assert.equal(
    storyCorrect(map[541], {
      responses: { ...answer541, plates__firstResult: "" },
    }),
    false,
  );
  assert.equal(
    storyCorrect(map[541], {
      responses: { ...answer541, plates__storyUnit: "чашки" },
    }),
    false,
  );
});
test("№591 requires all three pictured prices and three independently completed stories", () => {
  const spec = mapping()[591];
  const responses = {
    spoons__storyVariant: "spoons",
    spoons__storyUnit: "рубли",
    spoons__count: "2",
    spoons__firstOperator: "×",
    spoons__firstResult: "12",
    forks__storyVariant: "forks",
    forks__storyUnit: "рубли",
    forks__count: "3",
    forks__firstOperator: "×",
    forks__firstResult: "12",
    knives__storyVariant: "knives",
    knives__storyUnit: "рубли",
    knives__count: "2",
    knives__firstOperator: "×",
    knives__firstResult: "6",
  };
  assert.equal(storyCorrect(spec, { responses }), true);
  for (const variant of ["spoons", "forks", "knives"])
    assert.equal(
      storyCorrect(spec, {
        responses: { ...responses, [`${variant}__firstResult`]: "" },
      }),
      false,
    );
  assert.deepEqual(
    spec.story.variants.map((v) => v.steps[0].left),
    [6, 4, 3],
  );
});
test("earlier chapters never offer multiplication or division before they are introduced", () => {
  for (const n of [49, 149, 186, 187, 191, 192, 193, 243, 360, 448, 465])
    assert.deepEqual(mapping()[n].story.operationChoices, ["+", "−"]);
});

test("reselecting the current story preserves entered work while a different story clears it", () => {
  const responses = {
    storyVariant: "first",
    storyUnit: "метры",
    firstResult: "9",
  };
  assert.strictEqual(selectStoryVariant(responses, "first"), responses);
  assert.deepEqual(selectStoryVariant(responses, "path"), {
    storyVariant: "path",
  });
});
