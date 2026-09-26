import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import { courseCorrect } from "../src/lib/courseAssessment.ts";
import type { Answer } from "../src/content/types.ts";

type Inputs = { a: number; b: number; c?: number };
const cases: {
  number: number;
  unit: string;
  source: Inputs;
  result: number;
  changed: Inputs;
  oneChanged: Inputs;
  oneResult: number;
  context: RegExp[];
}[] = [
  {
    number: 278,
    unit: "рубли",
    source: { a: 12, b: 6 },
    result: 18,
    changed: { a: 11, b: 7 },
    oneChanged: { a: 13, b: 6 },
    oneResult: 19,
    context: [/варежк/i, /платок/i, /дороже/],
  },
  {
    number: 280,
    unit: "годы",
    source: { a: 10, b: 3 },
    result: 13,
    changed: { a: 9, b: 4 },
    oneChanged: { a: 11, b: 3 },
    oneResult: 14,
    context: [/брат/i, /сестр/i, /старше/],
  },
  {
    number: 293,
    unit: "метры",
    source: { a: 4, b: 3 },
    result: 7,
    changed: { a: 5, b: 2 },
    oneChanged: { a: 5, b: 3 },
    oneResult: 8,
    context: [/бревн/i, /длиннее/],
  },
  {
    number: 296,
    unit: "метры",
    source: { a: 6, b: 14 },
    result: 20,
    changed: { a: 7, b: 13 },
    oneChanged: { a: 6, b: 13 },
    oneResult: 19,
    context: [/дом/i, /выше/],
  },
  {
    number: 645,
    unit: "метры",
    source: { a: 20, b: 8 },
    result: 4,
    changed: { a: 18, b: 6 },
    oneChanged: { a: 17, b: 8 },
    oneResult: 3,
    context: [/сосн/i, /короче/, /3 равные части/],
  },
  {
    number: 715,
    unit: "бобы",
    source: { a: 9, b: 2, c: 3 },
    result: 6,
    changed: { a: 6, b: 3, c: 3 },
    oneChanged: { a: 9, b: 2, c: 2 },
    oneResult: 9,
    context: [/ученик/i, /боб/i, /ряд/i],
  },
  {
    number: 720,
    unit: "яблони",
    source: { a: 7, b: 11, c: 2 },
    result: 9,
    changed: { a: 8, b: 10, c: 2 },
    oneChanged: { a: 7, b: 9, c: 2 },
    oneResult: 8,
    context: [/яблон/i, /потом/, /ряд/i],
  },
  {
    number: 811,
    unit: "парты",
    source: { a: 80, b: 6, c: 10 },
    result: 20,
    changed: { a: 90, b: 7, c: 10 },
    oneChanged: { a: 81, b: 6, c: 10 },
    oneResult: 21,
    context: [/мастерск/i, /парт/i, /день/, /остал/i],
  },
  {
    number: 851,
    unit: "рисунки",
    source: { a: 4, b: 2, c: 3 },
    result: 11,
    changed: { a: 3, b: 3, c: 2 },
    oneChanged: { a: 4, b: 2, c: 4 },
    oneResult: 12,
    context: [/пионер/i, /рисунк/i, /ещё один/i],
  },
  {
    number: 883,
    unit: "дети",
    source: { a: 9, b: 7, c: 2 },
    result: 8,
    changed: { a: 8, b: 8, c: 2 },
    oneChanged: { a: 9, b: 9, c: 2 },
    oneResult: 9,
    context: [/мальчик/i, /девоч/i, /равные группы/],
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
  const block = allBlocks.find((b) => b.exerciseNumber === c.number)!;
  test(`similar №${c.number} rejects the unchanged source numbers, including zero-padded input`, () => {
    assert.equal(
      courseCorrect(
        block,
        answer(c.source, c.result, (block as any).unit ?? "яблоки"),
      ),
      false,
    );
    const padded = answer(c.source, c.result, c.unit);
    padded.responses!.a = "0" + padded.responses!.a;
    assert.equal(courseCorrect(block, padded), false);
  });
  test(`similar №${c.number} rejects an unrelated apple story even with valid new arithmetic`, () => {
    assert.equal(
      courseCorrect(block, answer(c.changed, c.result, "яблоки")),
      false,
    );
  });
  test(`similar №${c.number} accepts new givens with the same result and only one changed given`, () => {
    assert.equal(
      courseCorrect(block, answer(c.changed, c.result, c.unit)),
      true,
    );
    assert.equal(
      courseCorrect(block, answer(c.oneChanged, c.oneResult, c.unit)),
      true,
    );
    assert.equal(
      courseCorrect(block, answer(c.changed, c.result + 1, c.unit)),
      false,
    );
  });
  test(`similar №${c.number} keeps the source situation and names every input role`, () => {
    const b = block as any;
    assert.equal(b.unit, c.unit);
    assert.deepEqual(b.excludedInputs, c.source);
    for (const relation of c.context) assert.match(b.context, relation);
    const keys = [...new Set(b.formula.match(/[abc]/g))] as string[];
    assert.deepEqual(Object.keys(b.inputLabels).sort(), keys.sort());
    for (const key of keys) {
      assert.ok(b.inputLabels[key].length > 8);
      assert.ok(
        b.context.includes(`{${key}}`),
        `missing context placeholder ${key}`,
      );
    }
  });
}
