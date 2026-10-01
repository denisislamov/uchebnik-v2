import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Row counts were checked against the eighteen cropped textbook originals.
const diagrams: Record<string, { rows: number[]; color: string }> = {
  p007_domino_1: { rows: [1], color: "#2b4ba8" },
  p008_domino_2: { rows: [1, 1], color: "#2b4ba8" },
  p010_domino_3: { rows: [2, 1], color: "#2b4ba8" },
  p012_domino_4: { rows: [2, 2], color: "#2b4ba8" },
  p014_domino_5: { rows: [3, 2], color: "#2b4ba8" },
  p018_domino_6: { rows: [3, 3], color: "#2b4ba8" },
  p022_domino_7: { rows: [4, 3], color: "#2b4ba8" },
  p024_domino_8: { rows: [4, 4], color: "#2b4ba8" },
  p007_one_green_dot: { rows: [1], color: "#5d863d" },
  p008_two_green_dots: { rows: [2], color: "#5d863d" },
  p010_three_green_dots: { rows: [2, 1], color: "#5d863d" },
  p012_four_green_dots: { rows: [2, 2], color: "#5d863d" },
  p014_circles_5: { rows: [2, 1, 2], color: "#5d863d" },
  p018_circles_6: { rows: [3, 1, 2], color: "#5d863d" },
  p022_seven_green_dots: { rows: [3, 1, 3], color: "#5d863d" },
  p024_eight_green_dots: { rows: [4, 1, 3], color: "#5d863d" },
  p026_green_circles_9: { rows: [4, 1, 4], color: "#5d863d" },
  p028_green_circles_10: { rows: [5, 5], color: "#5d863d" },
};

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries(
    [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}

test("the eighteen revised diagrams preserve each original's count and rows", async () => {
  const module = await import("../src/content/vectorAssets.ts").catch(
    () => null,
  );
  assert.ok(module, "the SVG registry is missing");
  const { vectorAssets } = module;
  assert.ok(
    Object.keys(diagrams).every((id) => id in vectorAssets),
    "an approved first-batch diagram is missing",
  );
  for (const [id, expected] of Object.entries(diagrams)) {
    const asset = vectorAssets[id];
    const svg = readFileSync(`assets/book2/vector/${id}.svg`, "utf8");
    assert.equal(asset.xml, svg, `${id}: shipped SVG differs from source`);
    assert.ok(asset.alt.length > 5, `${id}: accessible description missing`);
    assert.match(svg, /<svg\b[^>]*viewBox="0 0 \d+ \d+"/);
    const circles = [...svg.matchAll(/<circle\b[^>]*\/>/g)].map((m) =>
      attributes(m[0]),
    );
    assert.equal(
      circles.length,
      expected.rows.reduce((sum, n) => sum + n, 0),
      `${id}: wrong number of dots`,
    );
    assert.ok(
      circles.every((circle) => circle.fill === expected.color),
      `${id}: changed the dot's semantic color`,
    );
    const rows = [...new Set(circles.map((circle) => circle.cy))].map(
      (y) => circles.filter((circle) => circle.cy === y).length,
    );
    assert.deepEqual(rows, expected.rows, `${id}: changed the arrangement`);
  }
});

const nextDiagrams: Record<
  string,
  { total: number; filled: number; outlined: number; split?: number; crossed?: boolean }
> = {
  p017_circles_1_plus_1: { total: 2, filled: 1, outlined: 1 },
  p017_circles_2_plus_1: { total: 3, filled: 2, outlined: 1 },
  p017_circles_3_plus_1: { total: 4, filled: 3, outlined: 1 },
  p017_circles_4_plus_1: { total: 5, filled: 4, outlined: 1 },
  p019_domino_5_1: { total: 6, filled: 5, outlined: 1, split: 5 },
  p019_domino_4_2: { total: 6, filled: 4, outlined: 2, split: 4 },
  p019_domino_3_3: { total: 6, filled: 3, outlined: 3, split: 3 },
  p021_circles_2_minus_1: { total: 2, filled: 1, outlined: 1, crossed: true },
  p021_circles_3_minus_1: { total: 3, filled: 2, outlined: 1, crossed: true },
  p021_circles_4_minus_1: { total: 4, filled: 3, outlined: 1, crossed: true },
  p021_circles_5_minus_1: { total: 5, filled: 4, outlined: 1, crossed: true },
  p021_circles_6_minus_1: { total: 6, filled: 5, outlined: 1, crossed: true },
  p023_domino_6_1: { total: 7, filled: 6, outlined: 1, split: 6 },
  p023_domino_5_2: { total: 7, filled: 5, outlined: 2, split: 5 },
  p023_domino_4_3: { total: 7, filled: 4, outlined: 3, split: 4 },
};

test("the next fifteen diagrams preserve addends and crossed subtrahends", async () => {
  const module = await import("../src/content/vectorAssets.ts");
  for (const [id, expected] of Object.entries(nextDiagrams)) {
    const asset = module.vectorAssets[id];
    assert.ok(asset, `${id}: missing revised diagram`);
    const svg = readFileSync(`assets/book2/vector/${id}.svg`, "utf8");
    assert.equal(asset.xml, svg, `${id}: source and registry differ`);
    const dots = [...svg.matchAll(/<circle\b[^>]*\/>/g)].map((m) =>
      attributes(m[0]),
    );
    assert.equal(dots.length, expected.total, `${id}: total changed`);
    assert.equal(
      dots.filter((dot) => dot.fill === "#2b4ba8").length,
      expected.filled,
      `${id}: first group changed`,
    );
    assert.equal(
      dots.filter((dot) => dot.fill === "none").length,
      expected.outlined,
      `${id}: second group changed`,
    );
    if (expected.split !== undefined) {
      const left = dots.filter((dot) => Number(dot.cx) < asset.width * 0.46);
      assert.equal(left.length, expected.split, `${id}: divider changed sides`);
      assert.doesNotMatch(
        svg,
        /<line\b[^>]*stroke="#6b7280"/,
        `${id}: the two groups must be separated by space, not a partition`,
      );
    }
    if (expected.crossed) {
      assert.equal(
        [...svg.matchAll(/<line\b[^>]*stroke="#c8352e"/g)].length,
        1,
        `${id}: exactly one dot must be crossed out`,
      );
      assert.ok(Number(dots.at(-1)?.cx) > Number(dots.at(-2)?.cx));
    }
  }
});

test("page 19 source-question marks remain centered on the new dots", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const centers: Record<string, number[][]> = {
    p019_domino_5_1: [
      [0.13, 0.28], [0.39, 0.28], [0.27, 0.48],
      [0.13, 0.70], [0.39, 0.70], [0.67, 0.48],
    ],
    p019_domino_4_2: [
      [0.13, 0.28], [0.39, 0.28], [0.13, 0.70],
      [0.39, 0.70], [0.81, 0.28], [0.56, 0.70],
    ],
    p019_domino_3_3: [
      [0.37, 0.25], [0.24, 0.48], [0.11, 0.70],
      [0.80, 0.25], [0.66, 0.48], [0.53, 0.70],
    ],
  };
  for (const [id, expected] of Object.entries(centers)) {
    const art = vectorAssets[id];
    assert.ok(art, `${id}: missing`);
    const dots = [...art.xml.matchAll(/<circle\b[^>]*\/>/g)].map((m) => {
      const dot = attributes(m[0]);
      return [Number(dot.cx) / art.width, Number(dot.cy) / art.height];
    });
    for (const [x, y] of expected)
      assert.ok(
        dots.some(([dx, dy]) => Math.abs(dx - x) < 0.015 && Math.abs(dy - y) < 0.015),
        `${id}: old source-question mark at ${x}, ${y} misses the vector dot`,
      );
  }
});

test("the modern cover title is exact Cyrillic text in a standalone SVG", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p001_cover_title_frame;
  assert.ok(art, "modern cover title is missing");
  assert.equal(art.xml, readFileSync("assets/book2/vector/p001_cover_title_frame.svg", "utf8"));
  assert.match(art.xml, />Арифметика · 1 класс<\/text>/);
  assert.doesNotMatch(art.xml, /1959/);
  assert.equal(art.alt, "Арифметика · 1 класс");
});

test("original illustration mode takes precedence over revised vectors", async () => {
  const module = await import("../src/content/selectBookArt.ts").catch(
    () => null,
  );
  assert.ok(module, "the illustration selector is missing");
  const original = { kind: "raster", source: "original" };
  const revised = { kind: "raster", source: "revised" };
  const vector = { kind: "vector", xml: "<svg/>" };
  assert.equal(module.selectBookArt(original, revised, vector, true), original);
  assert.equal(module.selectBookArt(original, revised, vector, false), vector);
  assert.equal(
    module.selectBookArt(original, revised, undefined, false),
    revised,
  );
  assert.equal(
    module.selectBookArt(original, undefined, undefined, false),
    original,
  );
});
