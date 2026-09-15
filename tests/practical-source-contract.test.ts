import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";

// These literals come from the printed exercises, independently of the generator.
// Replacing child actions with numeric answers, or dropping a subquestion, must fail.
const numbered = (n: number): any => {
  const block = allBlocks.find((b) => b.exerciseNumber === n);
  assert.ok(block, `Missing exercise ${n}`);
  return block;
};
const practical = (n: number): any => {
  const block = numbered(n);
  assert.equal(
    block.kind,
    "practical",
    `Exercise ${n} needs the source action`,
  );
  return block;
};
const answers = (n: number) => {
  const fields = numbered(n).fields;
  assert.ok(
    Array.isArray(fields),
    `Exercise ${n} needs every source subquestion`,
  );
  return fields.map((f: any) => f.expected);
};

test("source placement exercises require the child to build every original group", () => {
  for (const [n, want] of [
    [52, [[3, 3]]],
    [74, [[2, 4]]],
    [
      100,
      [
        [5, 1],
        [1, 5],
      ],
    ],
    [
      122,
      [
        [6, 1],
        [1, 6],
      ],
    ],
    [142, [[8], [8]]],
    [
      156,
      [
        [8, 1],
        [1, 8],
      ],
    ],
    [228, [[4, 10]]],
    [
      251,
      [
        [11, 3],
        [3, 11],
      ],
    ],
    [263, [[7, 7]]],
    [265, [[6, 8]]],
    [266, [[7, 9]]],
    [325, [[6, 4]]],
  ] as const) {
    const b = practical(n);
    assert.deepEqual(
      b.steps.map((s: any) => s.counts),
      want,
      `Exercise ${n}`,
    );
    assert.ok(b.steps.every((s: any) => s.mode === "place"));
  }
});

test("removal and addition preserve the child's preceding arrangement", () => {
  for (const [n, start, finish] of [
    [57, 4, 1],
    [86, 6, 2],
  ] as const) {
    const steps = practical(n).steps;
    assert.deepEqual(steps[0].counts, [start]);
    assert.deepEqual(steps[1].counts, [finish]);
    assert.deepEqual(steps[1].initialCounts, [start]);
    assert.equal(steps[1].carryFrom, steps[0].id);
  }
  const add = practical(197).steps;
  assert.deepEqual(
    add.map((s: any) => s.counts),
    [[3], [4], [6]],
  );
  assert.equal(add[1].carryFrom, add[0].id);
  assert.equal(add[2].carryFrom, add[1].id);
  assert.deepEqual(answers(197), ["1", "2"]);
  const box = practical(107).steps;
  assert.deepEqual(
    box.map((s: any) => s.counts),
    [[1], [6], [1]],
  );
  assert.equal(box[1].carryFrom, box[0].id);
  assert.equal(box[2].carryFrom, box[1].id);
  assert.deepEqual(answers(107), ["6", "1"]);
});

test("drawing comparisons retain unknown quantities in the second row", () => {
  for (const [n, token, counts, expected] of [
    [268, "stick", [5, 8], "8"],
    [324, "circle", [5, 4], "4"],
  ] as const) {
    const s = practical(n).steps[0];
    assert.equal(s.mode, "draw");
    assert.equal(s.token, token);
    assert.deepEqual(s.counts, counts);
    assert.deepEqual(
      s.chooseCounts,
      [1],
      "The child chooses the unknown row before a drawing guide appears",
    );
    assert.deepEqual(answers(n), [expected]);
    assert.equal(new RegExp(`\\b${expected}\\b`).test(s.instruction), false);
  }
});

test("construction and grid exercises retain original dimensions and all totals", () => {
  const triangle = practical(536).steps[0];
  assert.equal(triangle.mode, "construct");
  assert.equal(triangle.shape, "triangle");
  assert.deepEqual(triangle.counts, [6]);
  assert.deepEqual(answers(536), ["18"]);
  assert.equal(practical(554).steps[0].shape, "square");
  assert.deepEqual(practical(554).steps[0].counts, [3]);
  assert.deepEqual(answers(554), ["12", "20"]);
  for (const [n, counts, want] of [
    [551, [3, 3, 3, 3, 3, 3], ["6", "9", "12", "15", "18"]],
    [557, [4, 4, 4, 4], ["8", "12", "16"]],
    [600, [7, 7], ["14"]],
  ] as const) {
    const b = practical(n);
    assert.equal(b.steps[0].mode, "draw");
    assert.equal(b.steps[0].token, "square");
    assert.deepEqual(b.steps[0].counts, counts);
    assert.deepEqual(answers(n), want);
  }
});

test("equal sharing asks the child to construct all requested arrangements", () => {
  for (const [n, rows, want] of [
    [639, [[4, 4, 4]], ["4"]],
    [
      660,
      [
        [6, 6],
        [3, 3, 3, 3],
      ],
      ["6", "3"],
    ],
    [
      676,
      [
        [5, 5, 5, 5],
        [4, 4, 4, 4, 4],
      ],
      ["5", "4"],
    ],
    [
      684,
      [
        [1, 1, 1, 1, 1, 1],
        [2, 2, 2, 2, 2, 2],
        [3, 3, 3, 3, 3, 3],
      ],
      ["1", "2", "3"],
    ],
  ] as const) {
    assert.deepEqual(
      practical(n).steps.map((s: any) => s.counts),
      rows,
    );
    assert.deepEqual(answers(n), want);
  }
});

test("counting diagrams retain every source subquestion and correct answer", () => {
  for (const [n, expected] of [
    [204, ["15", "19", "20"]],
    [546, ["3", "6", "18"]],
    [722, ["10", "100"]],
    [726, ["33", "3", "3"]],
    [728, ["31", "3", "1"]],
  ] as const)
    assert.deepEqual(answers(n), expected, `Exercise ${n}`);
});

test("questions about pictured bundles and coins include the actual source picture", () => {
  for (const [n, image] of [
    [546, "p101_grid_3x6_cells"],
    [722, "p126_ten_bundles_of_sticks"],
    [726, "p126_three_bundles_three_sticks"],
    [728, "p127_coins_three_10_kop_one_1_kop"],
  ] as const)
    assert.ok(numbered(n).images.includes(image), `Exercise ${n}`);
});

test("tens tasks retain all four experiments and both mixed place-value arrangements", () => {
  for (const n of [200, 202, 723, 724, 725]) practical(n);
  assert.deepEqual(
    practical(723).steps.map((s: any) => s.counts),
    [[4], [7], [3], [9]],
  );
  assert.deepEqual(
    practical(724).steps.map((s: any) => s.counts),
    [[2], [4], [6], [9]],
  );
  assert.deepEqual(answers(724), ["2", "4", "6", "9"]);
  assert.deepEqual(answers(725), ["55", "88"]);
  assert.deepEqual(answers(200), ["11", "13"]);
  assert.deepEqual(answers(202), ["1", "4"]);
  assert.deepEqual(
    practical(200).steps.map((s: any) => s.counts),
    [
      [1, 1],
      [1, 3],
    ],
  );
  assert.deepEqual(
    practical(725).steps.map((s: any) => s.counts),
    [
      [5, 5],
      [8, 8],
    ],
  );
  assert.ok(
    practical(725).steps.every(
      (s: any) => JSON.stringify(s.groupValues) === "[10,1]",
    ),
  );
});

test("line drawing preserves both comparisons and equal partition at model scale", () => {
  for (const [n, lengths] of [
    [752, [10]],
    [837, [8, 10]],
    [838, [12, 9]],
    [856, [12]],
  ] as const) {
    const s = practical(n).steps[0];
    assert.equal(s.mode, "draw");
    assert.deepEqual(s.lengths, lengths);
    if (n === 837 || n === 838) assert.deepEqual(s.chooseLengths, [1]);
    assert.match(s.instruction, /1 клетка = 1 см/);
  }
  assert.equal(practical(856).steps[0].divisions, 3);
  assert.deepEqual(answers(856), ["4"]);
  const square = practical(824).steps[0];
  assert.deepEqual(square.counts, [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  assert.equal(square.divisions, 2);
  assert.deepEqual(answers(824), ["50"]);
});

test("paper tasks require child-made divisions, cuts, and ruler marks", () => {
  for (const [n, length, divisions, expected] of [
    [687, 18, 6, "3"],
    [756, 15, 3, "5"],
    [880, 40, 2, "20"],
  ] as const) {
    const step = practical(n).steps[0];
    assert.deepEqual(step.lengths, [length]);
    assert.equal(step.divisions, divisions);
    assert.deepEqual(answers(n), [expected]);
  }
  for (const [n, length, cut, expected] of [
    [755, 18, 4, "14"],
    [782, 40, 10, "30"],
  ] as const) {
    const step = practical(n).steps[0];
    assert.deepEqual(step.lengths, [length]);
    assert.equal(step.cutAt, cut);
    assert.deepEqual(answers(n), [expected]);
  }
  const ruler = practical(754).steps[0];
  assert.deepEqual(ruler.lengths, [20]);
  assert.equal(ruler.divisions, 20);
  assert.match(ruler.instruction, /модел/);
  assert.match(ruler.instruction, /картон|дерев/);
});
