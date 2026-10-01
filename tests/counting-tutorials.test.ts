import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allBlocks } from "../src/content/book.ts";
import {
  countingTutorials,
  countingTutorialsForMode,
} from "../src/content/countingTutorials.ts";

test("counting tutorials match source counts and the actual lesson image and answer", () => {
  const counts = {
    "p004-block02": 10,
    "p004-block03": 5,
    "p004-block04": 1,
    "p004-block05": 5,
    "p004-block06": 10,
  };
  for (const [id, expected] of Object.entries(counts)) {
    const block = allBlocks.find((entry) => entry.id === id);
    assert.ok(block, id);
    assert.ok(block.kind === "number" || block.kind === "counters", id);
    assert.equal(block.expected, expected, id);
    const scene = countingTutorials[id];
    assert.ok(block.images?.includes(scene.imageId), id);
    assert.equal(scene.objects.length, expected, id);
  }
  const source = readFileSync(
    new URL(
      "../textbook/page_docs/arithmetic_grade1_pchelko_1959_p004.md",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /детей — 10; деревьев — 5; лодочек — 1/);
});

test("every highlighted object has a distinct identity and remains within the source image", () => {
  for (const [id, scene] of Object.entries(countingTutorials)) {
    assert.equal(
      new Set(scene.objects.map((object) => object.id)).size,
      scene.objects.length,
      id,
    );
    for (const object of scene.objects) {
      assert.ok(object.id && object.label, id);
      assert.ok(
        [object.x, object.y, object.w, object.h].every(Number.isFinite),
        object.id,
      );
      assert.ok(object.x >= 0 && object.y >= 0, object.id);
      assert.ok(object.w > 0 && object.h > 0, object.id);
      assert.ok(
        object.x + object.w <= 1 && object.y + object.h <= 1,
        object.id,
      );
    }
  }
});

test("placement demonstrates the same objects in the same order as counting", () => {
  assert.deepEqual(
    countingTutorials["p004-block05"],
    countingTutorials["p004-block03"],
  );
  assert.deepEqual(
    countingTutorials["p004-block06"],
    countingTutorials["p004-block02"],
  );
});

test("the four swimmers have separate regions in both illustration modes", () => {
  const examples = [
    {
      scenes: countingTutorialsForMode(true),
      width: 810,
      height: 615,
      heads: [
        [662, 330],
        [714, 328],
        [745, 357],
        [698, 396],
      ],
    },
    {
      scenes: countingTutorialsForMode(false),
      width: 1448,
      height: 1086,
      heads: [
        [1046, 484],
        [1293, 480],
        [1126, 579],
        [1350, 597],
      ],
    },
  ];
  for (const { scenes, width, height, heads } of examples) {
    const swimmers = scenes["p004-block02"].objects.filter((object) =>
      object.id.startsWith("child-swimmer-"),
    );
    assert.equal(swimmers.length, 4);
    for (const [x, y] of heads) {
      const covering = swimmers.filter(
        (object) =>
          x / width >= object.x &&
          x / width <= object.x + object.w &&
          y / height >= object.y &&
          y / height <= object.y + object.h,
      );
      assert.equal(covering.length, 1, `head at ${x},${y}`);
    }
  }
});

test("the revised lesson uses its own counting regions", () => {
  assert.deepEqual(countingTutorials, countingTutorialsForMode(false));
  assert.notDeepEqual(
    countingTutorialsForMode(false)["p004-block02"],
    countingTutorialsForMode(true)["p004-block02"],
  );
});

test("every countable subject in the revised painting has one guide region", () => {
  const scenes = countingTutorialsForMode(false);
  const samples = [
    [
      "p004-block02",
      [
        [245, 330],
        [583, 470],
        [682, 500],
        [217, 711],
        [413, 738],
        [566, 758],
        [1047, 493],
        [1278, 487],
        [1122, 588],
        [1360, 614],
      ],
    ],
    [
      "p004-block03",
      [
        [174, 285],
        [524, 267],
        [1072, 292],
        [1214, 290],
        [1331, 300],
      ],
    ],
    ["p004-block04", [[751, 565]]],
  ] as const;
  for (const [id, points] of samples) {
    const objects = scenes[id].objects;
    for (const [x, y] of points) {
      const covering = objects.filter(
        (object) =>
          x / 1448 >= object.x &&
          x / 1448 <= object.x + object.w &&
          y / 1086 >= object.y &&
          y / 1086 <= object.y + object.h,
      );
      assert.equal(covering.length, 1, `${id}: ${x},${y}`);
    }
  }
});
