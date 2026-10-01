import { test } from "node:test";
import assert from "node:assert/strict";
import { pages } from "../src/content/book.ts";
import { containsPoint, pickTarget } from "../src/lib/hitTesting.ts";
import { spawnSync } from "node:child_process";

const picture = (id: string) => {
  const block = pages
    .flatMap((page) => page.blocks)
    .find((item) => item.id === id);
  assert.ok(block && block.kind === "picture", id);
  if (!block || block.kind !== "picture") throw new Error(id);
  return block;
};

const tap = (id: string, x: number, y: number) =>
  pickTarget(picture(id).targets, { x, y }, 1000, 600)?.id;

test("the revised page 3 pencils can be tapped where the painted barrels are", () => {
  const pencil = pages[2].blocks[3];
  assert.equal(pencil.kind, "picture");
  if (pencil.kind !== "picture") return;

  // Hand-checked points on the new illustration, in image coordinates.
  assert.equal(
    pickTarget(pencil.targets, { x: 0.15, y: 0.42 }, 500, 190)?.id,
    "green",
  );
  assert.equal(
    pickTarget(pencil.targets, { x: 0.6, y: 0.72 }, 500, 190)?.id,
    "red",
  );
});

test("redrawn balls, chairs and skis keep separate tappable areas", () => {
  for (const [block, x, y, expected] of [
    ["p003-block02", 0.28, 0.46, "left"],
    ["p003-block03", 0.81, 0.63, "right"],
    ["p008-block01", 0.27, 0.52, "chair-left"],
    ["p008-block01", 0.7, 0.68, "chair-right"],
    ["p008-block03", 0.7, 0.23, "ski1"],
    ["p008-block03", 0.75, 0.53, "ski2"],
  ] as const) {
    assert.equal(tap(block, x, y), expected, `${block} at ${x}, ${y}`);
  }
});

test("revised outlines follow the painted ball and the complete coin digits", () => {
  const smallBall = picture("p003-block02").targets.find(
    (target) => target.id === "right",
  );
  assert.ok(smallBall);
  assert.equal(containsPoint(smallBall, { x: 0.8, y: 0.39 }), false);
  assert.equal(containsPoint(smallBall, { x: 0.8, y: 0.45 }), true);

  for (const blockId of ["p007-block08", "p008-block09", "p010-block07"]) {
    const digit = picture(blockId).targets[0];
    assert.equal(
      containsPoint(digit, { x: 0.5, y: 0.65 }),
      true,
      `${blockId}: lower half of the new numeral`,
    );
  }
});

test("revised strawberry targets include each painted berry without old empty regions", () => {
  const targets = picture("p010-block04").targets;
  for (const [index, point] of [
    [0, { x: 0.72, y: 0.3 }],
    [1, { x: 0.86, y: 0.45 }],
    [2, { x: 0.63, y: 0.61 }],
  ] as const) {
    assert.equal(containsPoint(targets[index], point), true, `berry ${index}`);
    assert.equal(
      pickTarget(targets, point, 420, 300)?.id,
      `object-${index}`,
      `berry ${index} is selectable`,
    );
  }
});

test("revised cover numerals and animal silhouettes are fully selectable", () => {
  for (const [blockId, targetIndex, point] of [
    ["p001-block02", 0, { x: 0.3, y: 0.7 }],
    ["p001-block05", 0, { x: 0.32, y: 0.78 }],
    ["p001-block07", 0, { x: 0.28, y: 0.8 }],
    ["p007-block03", 0, { x: 0.135, y: 0.35 }],
    ["p007-block04", 0, { x: 0.83, y: 0.42 }],
    ["p007-block05", 0, { x: 0.12, y: 0.6 }],
    ["p008-block02", 1, { x: 0.95, y: 0.82 }],
    ["p009-block01", 0, { x: 0.39, y: 0.5 }],
  ] as const) {
    assert.equal(
      containsPoint(picture(blockId).targets[targetIndex], point),
      true,
      `${blockId} visibly painted edge`,
    );
  }
});

test("revised page 7 to 10 targets follow the visible people, windows, ears, wings and fish", () => {
  for (const [block, x, y, expected] of [
    ["p007-block02", 0.17, 0.39, "many"],
    ["p008-block01", 0.69, 0.2, "window-right"],
    ["p009-block04", 0.52, 0.2, "object-0"],
    ["p009-block04", 0.65, 0.2, "object-1"],
    ["p009-block05", 0.2, 0.2, "object-0"],
    ["p009-block05", 0.8, 0.65, "object-1"],
    ["p009-block05", 0.8, 0.9, "object-1"],
    ["p010-block02", 0.2, 0.29, "object-0"],
    ["p010-block02", 0.44, 0.58, "object-1"],
    ["p010-block02", 0.6, 0.65, "object-2"],
    ["p010-block03", 0.6, 0.25, "object-0"],
    ["p010-block03", 0.17, 0.72, "object-1"],
    ["p010-block03", 0.87, 0.71, "object-2"],
  ] as const) {
    assert.equal(tap(block, x, y), expected, `${block} at ${x}, ${y}`);
  }
});

test("revised first ball step shows only its three counted balls", () => {
  const block = pages[10].blocks.find((item) => item.id === "p011-lesson06");
  assert.ok(block && block.kind === "work");
  assert.deepEqual(block.images, ["p011_balls_left_2_and_1"]);
});

test("revised ball marks surround each painted ball without covering its neighbour", () => {
  for (const [id, centers] of [
    [
      "p011-lesson06",
      [
        [0.15, 0.5],
        [0.43, 0.5],
        [0.85, 0.5],
      ],
    ],
    [
      "p011-balls-right",
      [
        [0.14, 0.55],
        [0.605, 0.55],
        [0.865, 0.55],
      ],
    ],
  ] as const) {
    const block = pages[10].blocks.find((item) => item.id === id);
    assert.ok(block && block.kind === "work");
    if (!block || block.kind !== "work") continue;
    const shapes: number[][] | undefined = block.fields.find(
      (field) => field.id === "q3",
    )?.marks?.shapes;
    assert.equal(shapes?.length, 3, id);
    if (!shapes) throw new Error(`${id}: missing ball marks`);
    for (let i = 0; i < 3; i++) {
      const mark: number[] = shapes[i];
      assert.ok(
        Math.hypot(mark[0] - centers[i][0], mark[1] - centers[i][1]) < 0.045,
        `${id} ball ${i + 1}`,
      );
      assert.ok(
        mark[2] >= 0.12 &&
          mark[2] <= 0.14 &&
          mark[3] >= 0.33 &&
          mark[3] <= 0.39,
        `${id} outline ${i + 1}`,
      );
    }
    assert.deepEqual(
      block.fields[0].marks?.shapes,
      shapes?.slice(0, id === "p011-lesson06" ? 2 : 1),
    );
    assert.deepEqual(
      block.fields[1].marks?.shapes,
      shapes?.slice(id === "p011-lesson06" ? 2 : 1),
    );
  }
});

test("revised page 12 asks about beads on the visible counting rail", () => {
  const block = pages[11].blocks.find((item) => item.id === "p012-lesson01");
  assert.ok(block && block.kind === "work");
  if (!block || block.kind !== "work") return;
  assert.equal(
    block.fields.find((field) => field.id === "q2")?.label,
    "Сколько бусин отодвинуто на счётной линейке?",
  );
});

test("original illustration mode keeps the source hit zones and composite ball row", () => {
  const script = `
    globalThis.window = { location: { search: "?illustrations=original" } };
    const { pages } = await import("./src/content/book.ts");
    const pick = (id) => pages.flatMap(p => p.blocks).find(b => b.id === id).targets
      .map(({ id, x, y, w, h }) => [id, x, y, w, h]);
    const balls = pages[10].blocks.find(b => b.id === "p011-lesson06").images;
    const ballMarks = ["p011-lesson06", "p011-balls-right"].map(id =>
      pages[10].blocks.find(b => b.id === id).fields.find(f => f.id === "q3").marks.shapes);
    const beadQuestion = pages[11].blocks.find(b => b.id === "p012-lesson01").fields.find(f => f.id === "q2").label;
    console.log(JSON.stringify({
      forest: pick("p007-block02"), windows: pick("p008-block01").filter(t => t[0].startsWith("window")),
      ears: pick("p009-block04"), wings: pick("p009-block05"),
      boys: pick("p010-block02"), fish: pick("p010-block03"),
      coinDigits: ["p007-block08", "p008-block09", "p010-block07"].map(pick),
      berries: pick("p010-block04"), firstBalls: pick("p003-block02"),
      balls, ballMarks, beadQuestion,
    }));
  `;
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", script],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    forest: [
      ["one", 0.66, 0.2, 0.21, 0.67],
      ["many", 0.3, 0.28, 0.32, 0.18],
    ],
    windows: [
      ["window-left", 0.414, 0.065, 0.235, 0.37],
      ["window-right", 0.75, 0.05, 0.225, 0.42],
    ],
    ears: [
      ["object-0", 0.635, 0.08, 0.095, 0.37],
      ["object-1", 0.728, 0.1, 0.07, 0.34],
    ],
    wings: [
      ["object-0", 0.4, 0.035, 0.35, 0.54],
      ["object-1", 0.075, 0.59, 0.37, 0.35],
    ],
    boys: [
      ["object-0", 0.115, 0.09, 0.11, 0.61],
      ["object-1", 0.28, 0.38, 0.145, 0.44],
      ["object-2", 0.415, 0.34, 0.2, 0.61],
    ],
    fish: [
      ["object-0", 0.04, 0.04, 0.41, 0.55],
      ["object-1", 0.64, 0.05, 0.3, 0.6],
      ["object-2", 0.23, 0.53, 0.49, 0.39],
    ],
    coinDigits: [
      [["digit", 0.37, 0.15, 0.24, 0.32]],
      [["digit", 0.35, 0.1, 0.38, 0.4]],
      [["digit", 0.3, 0.1, 0.35, 0.4]],
    ],
    berries: [
      ["object-0", 0.68, 0.375, 0.115, 0.195],
      ["object-1", 0.865, 0.36, 0.083, 0.19],
      ["object-2", 0.56, 0.63, 0.15, 0.31],
    ],
    firstBalls: [
      ["left", 0.055, 0.08, 0.39, 0.82],
      ["right", 0.69, 0.34, 0.235, 0.5],
    ],
    balls: ["p011_balls_left_2_and_1", "p011_balls_row_3_groups"],
    ballMarks: [
      [
        [0.215, 0.27, 0.15, 0.28],
        [0.36, 0.62, 0.15, 0.28],
        [0.8, 0.6, 0.15, 0.28],
      ],
      [
        [0.16, 0.57, 0.135, 0.36],
        [0.585, 0.56, 0.135, 0.36],
        [0.79, 0.31, 0.135, 0.33],
      ],
    ],
    beadQuestion: "Сколько жетонов на карточке?",
  });
});
