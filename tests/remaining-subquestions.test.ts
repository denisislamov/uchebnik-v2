import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import { courseCorrect } from "../src/lib/courseAssessment.ts";

const block = (n: number) => {
  const b = allBlocks.find((b) => b.exerciseNumber === n)!;
  assert.ok(b.kind === "work");
  return b;
};
test("№584 requires counting by six and both sums before multiplication is complete", () => {
  const b = block(584);
  assert.equal(courseCorrect(b, { responses: { q1: "12", q2: "18" } }), false);
  assert.deepEqual(
    b.fields.map((f) => [f.id, f.expected]),
    [
      ["count1", "6"],
      ["count2", "12"],
      ["count3", "18"],
      ["sum2", "12"],
      ["q1", "12"],
      ["sum3", "18"],
      ["q2", "18"],
    ],
  );
  assert.match(b.fields.find((f) => f.id === "sum2")!.label, /6\s*\+\s*6\s*=/);
  assert.match(
    b.fields.find((f) => f.id === "sum3")!.label,
    /6\s*\+\s*6\s*\+\s*6\s*=/,
  );
  const responses = Object.fromEntries(b.fields.map((f) => [f.id, f.expected]));
  assert.equal(courseCorrect(b, { responses }), true);
  for (const field of b.fields)
    assert.equal(
      courseCorrect(b, { responses: { ...responses, [field.id]: "" } }),
      false,
      field.id,
    );
});
test("№584 keeps the two source grids and the multiplication frame next to the action", () => {
  const b = block(584);
  for (const image of ["p107_cells_6x2", "p107_cells_6x3", "p107_table_mult_6"])
    assert.ok(b.images.includes(image), image);
  assert.doesNotMatch(b.prompt, /ниже|Первый прямоугольник:|Под ними/);
});
test("№589 requires the actual yes/no conclusion, not only 18 required and 2 spare", () => {
  const b = block(589);
  assert.equal(courseCorrect(b, { responses: { q1: "18", q2: "2" } }), false);
  const conclusion = b.fields.find((f) => /Хватит ли/.test(f.label));
  assert.ok(conclusion);
  assert.equal(conclusion.expected, "Да");
  assert.deepEqual(conclusion.options, ["Да", "Нет"]);
  assert.equal(
    courseCorrect(b, {
      responses: { q1: "18", q2: "2", [conclusion.id]: "Да" },
    }),
    true,
  );
  assert.equal(
    courseCorrect(b, {
      responses: { q1: "18", q2: "2", [conclusion.id]: "Нет" },
    }),
    false,
  );
});
test("№589 retains all original quantities and the question about winter", () => {
  const b = block(589);
  assert.match(b.prompt, /3 печи/);
  assert.match(b.prompt, /6 возов/);
  assert.match(b.prompt, /20 возов/);
  assert.ok(
    b.fields.some((f) => /Хватит ли школе этих дров на зиму/.test(f.label)),
  );
});
