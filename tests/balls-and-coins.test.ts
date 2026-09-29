import test from "node:test";
import assert from "node:assert/strict";
import { pages } from "../src/content/book.ts";
import { parseProgress, CONTENT_REVISION } from "../src/lib/assessment.ts";

const page = pages[10];
const step = (id: string) => {
  const index = page.blocks.findIndex((b) => b.id === id);
  const block = page.blocks[index];
  if (!block || block.kind !== "work") throw Error(`no work step ${id}`);
  return { index, block };
};

test("the two pictures of balls are two steps, three questions each", () => {
  const first = step("p011-lesson06"),
    second = step("p011-balls-right");
  assert.equal(second.index, first.index + 1);
  for (const [{ block }, picture, counts] of [
    [first, "p011_balls_left_2_and_1", [2, 1, 3]],
    [second, "p011_balls_right_1_and_2", [1, 2, 3]],
  ] as const) {
    // The row with both sets is the same balls once more and is not shown.
    assert.deepEqual(
      block.images.filter((id) => id !== "p011_balls_row_3_groups"),
      [picture],
    );
    assert.deepEqual(
      block.fields.map((f) => f.expected),
      counts.map(String),
    );
    assert.deepEqual(
      block.fields.map((f) => f.label),
      ["Сколько мячей слева?", "Сколько мячей справа?", "Сколько мячей всего?"],
    );
    assert.ok(!/один|два|три|\d/.test(block.title), "the name does not answer");
  }
});

test("every question shows on the picture the balls it asks about", () => {
  for (const id of ["p011-lesson06", "p011-balls-right"]) {
    const { block } = step(id);
    for (const field of block.fields) {
      assert.ok(field.marks, `${id} ${field.id}`);
      assert.ok(block.images.includes(field.marks.image));
      // As many outlines as the answer counts.
      assert.equal(field.marks.shapes.length, Number(field.expected));
      for (const [cx, cy, rx, ry] of field.marks.shapes) {
        assert.ok(cx - rx >= -0.02 && cx + rx <= 1.02, `${id}: ${cx}±${rx}`);
        assert.ok(cy > 0 && cy < 1 && ry > 0.1 && ry < 0.5);
      }
    }
    const [left, right, all] = block.fields.map((f) => f.marks!.shapes);
    // Left of right, and together they are all.
    assert.ok(
      Math.max(...left.map((s) => s[0])) < Math.min(...right.map((s) => s[0])),
    );
    assert.deepEqual(all, [...left, ...right]);
  }
});

test("a lesson saved before the split opens on the same step", () => {
  const saved = (block: number, answers = {}) =>
    parseProgress(
      JSON.stringify({
        version: 1,
        contentRevision: 5,
        page: 11,
        block,
        answers,
      }),
      pages,
    );
  assert.equal(CONTENT_REVISION, 6);
  // The balls were the seventh step and the copybook the eighth.
  assert.equal(page.blocks[saved(6).block].id, "p011-lesson06");
  assert.equal(page.blocks[saved(7).block].id, "p011-lesson07");
  assert.equal(page.blocks[saved(3).block].id, "p011-lesson04");
  // What was answered about the first picture is kept.
  const kept = saved(6, {
    "p011-lesson06": { responses: { q1: "2", q2: "1", q3: "3", q4: "1" } },
  });
  assert.equal(kept.answers["p011-lesson06"].responses?.q1, "2");
  assert.equal(kept.contentRevision, 6);
  // Older lessons find the step too: page 11 had not changed since.
  for (const revision of [3, 4])
    assert.equal(
      page.blocks[
        parseProgress(
          JSON.stringify({
            version: 1,
            contentRevision: revision,
            page: 11,
            block: 7,
            answers: {},
          }),
          pages,
        ).block
      ].id,
      "p011-lesson07",
      `revision ${revision}`,
    );
});
