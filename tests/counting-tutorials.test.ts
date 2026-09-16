import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allBlocks } from "../src/content/book.ts";
import { countingTutorials } from "../src/content/countingTutorials.ts";

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

test("the four partly submerged swimmers each have their own source region", () => {
  const children = countingTutorials["p004-block02"].objects;
  const swimmers = children.filter((object) =>
    object.id.startsWith("child-swimmer-"),
  );
  assert.equal(swimmers.length, 4);
  // Known visible heads in original 810 × 615 pixels, independently checked in the scan.
  const heads = [
    [662, 330],
    [714, 328],
    [745, 357],
    [698, 396],
  ];
  for (const [x, y] of heads) {
    const covering = swimmers.filter(
      (object) =>
        x / 810 >= object.x &&
        x / 810 <= object.x + object.w &&
        y / 615 >= object.y &&
        y / 615 <= object.y + object.h,
    );
    assert.equal(covering.length, 1, `head at ${x},${y}`);
  }
});
