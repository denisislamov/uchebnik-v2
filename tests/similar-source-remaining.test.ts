import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import { courseCorrect } from "../src/lib/courseAssessment.ts";
import type { Answer } from "../src/content/types.ts";

type Inputs = { a: number; b: number; c?: number };
const cases: {
  id: string;
  unit: string;
  original: Inputs;
  result: number;
  changed: Inputs;
  changedResult: number;
  mustChange: boolean;
  words: RegExp[];
}[] = [
  {
    id: "p075-source05",
    unit: "рубли",
    original: { a: 20, b: 5 },
    result: 15,
    changed: { a: 18, b: 4 },
    changedResult: 14,
    mustChange: true,
    words: [/кастрюл/i, /чайник/i, /дешевле/],
  },
  {
    id: "p075-source07",
    unit: "годы",
    original: { a: 16, b: 5 },
    result: 11,
    changed: { a: 14, b: 4 },
    changedResult: 10,
    mustChange: true,
    words: [/брат/i, /сестр/i, /моложе/],
  },
  {
    id: "p076-source07",
    unit: "метры",
    original: { a: 9, b: 3 },
    result: 6,
    changed: { a: 8, b: 3 },
    changedResult: 5,
    mustChange: true,
    words: [/доск/i, /короче/],
  },
  {
    id: "p084-source03",
    unit: "птицы",
    original: { a: 7, b: 5 },
    result: 19,
    changed: { a: 6, b: 4 },
    changedResult: 16,
    mustChange: true,
    words: [/кормушк/i, /вороб/i, /синич/i, /больше/],
  },
  {
    id: "p092-source09",
    unit: "палочки",
    original: { a: 20, b: 10, c: 4 },
    result: 6,
    changed: { a: 18, b: 8, c: 3 },
    changedResult: 7,
    mustChange: false,
    words: [/выстрога/i, /сначала/, /потом/, /остал/],
  },
  {
    id: "p104-source04",
    unit: "рыбки",
    original: { a: 4, b: 3, c: 6 },
    result: 18,
    changed: { a: 3, b: 4, c: 5 },
    changedResult: 17,
    mustChange: false,
    words: [/живом уголке/, /банк/i, /аквариум/],
  },
  {
    id: "p104-compose561",
    unit: "примеры",
    original: { a: 4, b: 3, c: 2 },
    result: 14,
    changed: { a: 3, b: 4, c: 3 },
    changedResult: 15,
    mustChange: false,
    words: [/наш.*класс/i, /столбик/i, /пример/i, /больше/],
  },
  {
    id: "p107-source01",
    unit: "килограммы",
    original: { a: 5, b: 2, c: 2 },
    result: 12,
    changed: { a: 4, b: 3, c: 3 },
    changedResult: 15,
    mustChange: true,
    words: [/покупател/i, /капуст/i, /кг/],
  },
  {
    id: "p123-source08",
    unit: "книги",
    original: { a: 5, b: 2 },
    result: 12,
    changed: { a: 4, b: 3 },
    changedResult: 11,
    mustChange: false,
    words: [/феврал/i, /март/i, /Я прочитал/i, /больше/],
  },
  {
    id: "p131-source03",
    unit: "книги",
    original: { a: 20, b: 10 },
    result: 50,
    changed: { a: 15, b: 5 },
    changedResult: 35,
    mustChange: false,
    words: [/библиотечк/i, /первый день/, /второй день/, /больше/],
  },
];
const answer = (values: Inputs, result: number, story: string): Answer => ({
  responses: {
    ...Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, String(v)]),
    ),
    result: String(result),
    story,
  },
});
for (const c of cases) {
  const b = allBlocks.find((b) => b.id === c.id)!;
  test(`${c.id} retains its original subject and input roles`, () => {
    const meta = b as any;
    assert.equal(meta.unit, c.unit);
    for (const word of c.words) assert.match(meta.context, word);
    const keys = [...new Set(meta.formula.match(/[abc]/g))] as string[];
    assert.deepEqual(Object.keys(meta.inputLabels).sort(), keys.sort());
    if (c.mustChange) assert.deepEqual(meta.excludedInputs, c.original);
    else
      assert.equal(
        meta.excludedInputs,
        undefined,
        "source does not require different numbers",
      );
  });
  test(`${c.id} accepts its subject and rejects arbitrary apples`, () => {
    assert.equal(
      courseCorrect(b, answer(c.changed, c.changedResult, "яблоки")),
      false,
    );
    assert.equal(
      courseCorrect(b, answer(c.changed, c.changedResult, c.unit)),
      true,
    );
    assert.equal(
      courseCorrect(b, answer(c.changed, c.changedResult + 1, c.unit)),
      false,
    );
  });
  test(`${c.id} excludes original numbers only when the source explicitly requires a change`, () => {
    assert.equal(
      courseCorrect(
        b,
        answer(c.original, c.result, (b as any).unit ?? "яблоки"),
      ),
      !c.mustChange,
    );
  });
}
test("a shorter pine cannot have zero length", () => {
  const b = allBlocks.find((b) => b.exerciseNumber === 645)!;
  assert.equal(courseCorrect(b, answer({ a: 5, b: 5 }, 0, "метры")), false);
});
test("zero price, age and length are rejected but zero remaining work is meaningful", () => {
  for (const [n, unit] of [
    [335, "рубли"],
    [337, "годы"],
    [349, "метры"],
  ] as const) {
    const b = allBlocks.find((b) => b.exerciseNumber === n)!;
    assert.equal(courseCorrect(b, answer({ a: 5, b: 5 }, 0, unit)), false);
  }
  const sticks = allBlocks.find((b) => b.exerciseNumber === 488)!;
  assert.equal(
    courseCorrect(sticks, answer({ a: 14, b: 10, c: 4 }, 0, "палочки")),
    true,
  );
  const desks = allBlocks.find((b) => b.exerciseNumber === 811)!;
  assert.equal(
    courseCorrect(desks, answer({ a: 60, b: 6, c: 10 }, 0, "парты")),
    true,
  );
});
test("every runtime recipe has a source context and subject", () => {
  for (const b of allBlocks.filter((b) => b.kind === "recipe")) {
    assert.ok((b as any).context, b.id);
    assert.ok((b as any).unit, b.id);
    assert.ok((b as any).inputLabels, b.id);
  }
});
