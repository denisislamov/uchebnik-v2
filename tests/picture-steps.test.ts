import test from "node:test";
import assert from "node:assert/strict";
import { pages } from "../src/content/book.ts";
import { parseProgress, CONTENT_REVISION } from "../src/lib/assessment.ts";
import { splitSteps } from "../src/content/legacyStepIds.ts";

const blocks = pages.flatMap((p) => p.blocks);
const work = (id: string) => {
  const block = blocks.find((b) => b.id === id);
  if (!block || block.kind !== "work") throw Error(`no work step ${id}`);
  return block;
};
// Steps that asked about several pictures, one picture to a step now.
const split = {
  11: ["p011-lesson06", "p011-balls-right"],
  13: ["p013-lesson05", "p013-plums-2", "p013-plums-3"],
  15: ["p015-lesson05", "p015-nuts-2", "p015-nuts-3", "p015-nuts-4"],
  18: ["p018-lesson01", "p018-cherry-branch"],
  19: ["p019-lesson05", "p019-domino-2", "p019-domino-3"],
};

test("no step asks about several pictures at once", () => {
  for (const b of blocks) {
    if (b.kind !== "work") continue;
    assert.ok(
      !b.fields.some((f) =>
        /^(Картинка|Костяшка) \d|(Левая|Правая) картинка/.test(f.label),
      ),
      `${b.id}: «${b.fields[0].label}»`,
    );
  }
});

test("every picture is a step of its own, with its questions", () => {
  for (const ids of Object.values(split))
    for (const id of ids) {
      const b = work(id);
      const shown = b.images.filter((i) => i !== "p011_balls_row_3_groups");
      assert.equal(shown.length, 1, id);
      assert.ok(b.fields.length >= 2 && b.fields.length <= 3, id);
      assert.ok(
        !/один|два|три|\d/.test(b.title),
        `${id}: the name does not answer`,
      );
    }
});

test("every question shows on its picture what it asks about", () => {
  for (const ids of Object.values(split))
    for (const id of ids) {
      const b = work(id);
      for (const field of b.fields) {
        assert.ok(field.marks, `${id} ${field.id}`);
        assert.equal(field.marks.image, b.images[0]);
        // One outline for every thing counted.
        assert.equal(
          field.marks.shapes.length,
          Number(field.expected),
          `${id} ${field.label}`,
        );
        for (const [cx, cy, rx, ry] of field.marks.shapes) {
          assert.ok(cx - rx > -0.05 && cx + rx < 1.05, `${id}: ${cx}±${rx}`);
          assert.ok(cy - ry > -0.05 && cy + ry < 1.05, `${id}: ${cy}±${ry}`);
        }
      }
      const byLabel = (re: RegExp) =>
        b.fields.find((f) => re.test(f.label))?.marks?.shapes;
      const [left, right, all] = [
        byLabel(/слева/),
        byLabel(/справа/),
        byLabel(/всего/),
      ];
      if (left && right) {
        // What is on the left stands left of what is on the right.
        assert.ok(
          Math.max(...left.map((s) => s[0])) <
            Math.min(...right.map((s) => s[0])),
          id,
        );
        if (all) assert.deepEqual(all, [...left, ...right], id);
      }
    }
});

test("the steps of a split stand one after another", () => {
  for (const [page, ids] of Object.entries(split)) {
    const order = pages[Number(page) - 1].blocks.map((b) => b.id);
    const first = order.indexOf(ids[0]);
    // On page 18 the cherries are counted next to the step that lays a
    // circle for each of them.
    if (page === "18") {
      const cherries = order.indexOf("p018-cherry-branch");
      assert.equal(order[cherries + 1], "p018-cherries");
      assert.ok(first < cherries);
      continue;
    }
    assert.deepEqual(
      order.slice(first, first + ids.length),
      ids,
      `page ${page}`,
    );
  }
});

test("a lesson saved before the split opens on the same step, its answers kept", () => {
  assert.equal(CONTENT_REVISION, 7);
  const open = (revision: number, page: number, block: number, answers = {}) =>
    parseProgress(
      JSON.stringify({
        version: 1,
        contentRevision: revision,
        page,
        block,
        answers,
      }),
      pages,
    );
  const at = (revision: number, page: number, block: number) =>
    pages[page - 1].blocks[open(revision, page, block).block].id;
  // Revision 6 step lists: the step after the split one, on each page.
  assert.equal(at(6, 13, 5), "p013-lesson06");
  assert.equal(at(6, 15, 5), "p015-lesson06");
  assert.equal(at(6, 18, 1), "p018-lesson02");
  assert.equal(at(6, 18, 2), "p018-cherries");
  assert.equal(at(6, 19, 5), "p019-lesson06");
  assert.equal(at(5, 11, 7), "p011-lesson07");
  for (const revision of [3, 4, 5])
    assert.equal(at(revision, 13, 5), "p013-lesson06");
  // What was answered about each picture goes with it.
  const plums = open(6, 13, 4, {
    "p013-lesson05": {
      checked: true,
      responses: {
        q1: "3",
        q2: "1",
        q3: "4",
        q4: "2",
        q5: "2",
        q6: "4",
        q7: "1",
      },
    },
  }).answers;
  assert.equal(plums["p013-lesson05"].responses?.q1, "3");
  assert.deepEqual(plums["p013-plums-2"].responses, {
    q1: "2",
    q2: "2",
    q3: "4",
  });
  assert.deepEqual(plums["p013-plums-3"].responses, { q1: "1" });
  assert.equal(plums["p013-plums-2"].checked, true);
  const balls = open(5, 11, 6, {
    "p011-lesson06": { responses: { q1: "2", q4: "1", q5: "2", q6: "3" } },
  }).answers;
  assert.deepEqual(balls["p011-balls-right"].responses, {
    q1: "1",
    q2: "2",
    q3: "3",
  });
  // Saved after the split, nothing is moved again.
  const later = open(7, 13, 4, {
    "p013-lesson05": { responses: { q4: "9" } },
    "p013-plums-2": { responses: { q1: "2" } },
  }).answers;
  assert.deepEqual(later["p013-plums-2"].responses, { q1: "2" });
  // Every step answers are moved to exists.
  for (const s of splitSteps) {
    assert.ok(
      blocks.some((b) => b.id === s.from),
      s.from,
    );
    assert.ok(
      blocks.some((b) => b.id === s.to),
      s.to,
    );
  }
});
