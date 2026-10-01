import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { digitSamples } from "../src/content/handwrittenDigits.ts";
import { pages } from "../src/content/book.ts";

test("revised counting rails and educational coins use the current lesson wording", () => {
  for (const pageNo of [7, 8, 10]) {
    const blocks = pages[pageNo - 1].blocks;
    const rail = blocks.filter((block) =>
      block.images.some((id) =>
        id.endsWith(
          `p${String(pageNo).padStart(3, "0")}_abacus_${pageNo === 7 ? 1 : pageNo === 8 ? 2 : 3}`,
        ),
      ),
    );
    assert.ok(rail.length > 0, `page ${pageNo}: counting rail block missing`);
    const text = (block: (typeof blocks)[number]) =>
      block.prompt +
      " " +
      block.title +
      (block.kind === "read" ? block.body : "") +
      (block.kind === "picture"
        ? block.sourceText +
          block.targets.map((target) => target.label).join(" ")
        : "");
    assert.ok(
      rail.some((block) => /бусин|счётной линейке/.test(text(block))),
      `page ${pageNo}: counting rail wording missing`,
    );
    for (const block of rail) {
      assert.doesNotMatch(text(block), /жетон/);
    }
    const coin = blocks.find((block) => block.title === "Учебная монета");
    assert.ok(coin, `page ${pageNo}: educational coin block missing`);
    assert.match(coin.prompt, /цифру|Какое число/);
    assert.doesNotMatch(coin.prompt, /копеек|рублей/);
  }
});

test("pages 11 and 12 use unitless coins and counting-rail beads", () => {
  const coins = pages[10].blocks.find((block) => block.id === "p011-lesson04");
  assert.ok(coins && coins.kind === "activity");
  assert.equal(coins.activity.unit, "единицы");
  assert.match(coins.prompt, /учебных монет/);
  assert.doesNotMatch(coins.prompt, /копеек|рублей/);

  const rail = pages[11].blocks.find((block) => block.id === "p012-lesson01");
  assert.ok(rail);
  assert.match(rail.prompt, /бусины/);
  assert.doesNotMatch(rail.prompt, /жетоны/);
});

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
  {
    total: number;
    filled: number;
    outlined: number;
    split?: number;
    crossed?: boolean;
  }
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
      [0.13, 0.28],
      [0.39, 0.28],
      [0.27, 0.48],
      [0.13, 0.7],
      [0.39, 0.7],
      [0.67, 0.48],
    ],
    p019_domino_4_2: [
      [0.13, 0.28],
      [0.39, 0.28],
      [0.13, 0.7],
      [0.39, 0.7],
      [0.81, 0.28],
      [0.56, 0.7],
    ],
    p019_domino_3_3: [
      [0.37, 0.25],
      [0.24, 0.48],
      [0.11, 0.7],
      [0.8, 0.25],
      [0.66, 0.48],
      [0.53, 0.7],
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
        dots.some(
          ([dx, dy]) => Math.abs(dx - x) < 0.015 && Math.abs(dy - y) < 0.015,
        ),
        `${id}: old source-question mark at ${x}, ${y} misses the vector dot`,
      );
  }
});

test("the modern cover title is exact Cyrillic text in a standalone SVG", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p001_cover_title_frame;
  assert.ok(art, "modern cover title is missing");
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p001_cover_title_frame.svg", "utf8"),
  );
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

test("pages 5 and 6 writing strips keep the original practice counts", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const expected: Record<string, { width: number; height: number }> = {
    p005_writing_strip_dashes_dots_slashes: { width: 790, height: 170 },
    p006_writing_strip_circles_hooks_waves: { width: 795, height: 185 },
  };
  for (const [id, size] of Object.entries(expected)) {
    const art = vectorAssets[id];
    assert.ok(art, `${id}: missing`);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.equal(art.width, size.width);
    assert.equal(art.height, size.height);
    assert.match(art.xml, /id="notebook-grid"/);
  }
  const page5 = vectorAssets.p005_writing_strip_dashes_dots_slashes.xml;
  assert.equal([...page5.matchAll(/id="p5-dash-\d+"/g)].length, 8);
  assert.equal([...page5.matchAll(/id="p5-black-dot-\d+"/g)].length, 8);
  assert.equal([...page5.matchAll(/id="p5-slash-\d+"/g)].length, 4);
  assert.equal([...page5.matchAll(/id="p5-wave-\d+"/g)].length, 12);
  assert.equal([...page5.matchAll(/id="p5-red-dot-\d+"/g)].length, 11);
  const page6 = vectorAssets.p006_writing_strip_circles_hooks_waves.xml;
  assert.equal([...page6.matchAll(/id="p6-ring-\d+"/g)].length, 12);
  assert.equal([...page6.matchAll(/id="p6-red-dot-\d+"/g)].length, 12);
  assert.equal([...page6.matchAll(/id="p6-hook-\d+"/g)].length, 12);
  assert.equal([...page6.matchAll(/id="p6-wave-\d+"/g)].length, 12);
  assert.equal([...page6.matchAll(/id="p6-teal-dot-\d+"/g)].length, 11);
});

test("page 7 printed and handwritten ones retain their distinct forms", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const print = vectorAssets.p007_digit_1_print;
  const sample = vectorAssets.p007_digit_1_sample;
  assert.ok(print && sample);
  assert.equal(
    print.xml,
    readFileSync("assets/book2/vector/p007_digit_1_print.svg", "utf8"),
  );
  assert.equal(
    sample.xml,
    readFileSync("assets/book2/vector/p007_digit_1_sample.svg", "utf8"),
  );
  assert.deepEqual([print.width, print.height], [75, 85]);
  assert.deepEqual([sample.width, sample.height], [140, 110]);
  assert.match(print.xml, /font-family="Andika_700Bold"[^>]*>1<\/text>/);
  assert.equal(digitSamples["1"].asset, "p007_digit_1_sample");
  assert.deepEqual(digitSamples["1"].strokes, [
    [
      ["M", 56, 43],
      ["L", 79, 23],
      ["L", 58, 83],
    ],
  ]);
  assert.match(sample.xml, /points="56,43 79,23 58,83"/);
  assert.match(sample.xml, /id="notebook-grid"/);
});

test("page 7 counting rail shows one selected bead and nine parked beads", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p007_abacus_1;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p007_abacus_1.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [370, 75]);
  const beads = [...art.xml.matchAll(/<circle id="bead-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.equal(beads.length, 10);
  assert.equal(beads.filter((bead) => bead.fill === "#c8352e").length, 5);
  assert.equal(beads.filter((bead) => bead.fill === "#ffffff").length, 5);
  assert.ok(Number(beads[1].cx) - Number(beads[0].cx) >= 60);
  assert.ok(
    beads.slice(1).every((bead) => Number(bead.cx) > Number(beads[0].cx)),
  );
  assert.match(art.alt, /1 бусина слева, 9 справа/);
});

test("counting rail replaces the legacy token card only in revised mode", async () => {
  const { selectBookArt, usesLegacyCountingCard } =
    await import("../src/content/selectBookArt.ts");
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const original = { kind: "raster", source: "old" };
  const vector = vectorAssets.p007_abacus_1;
  assert.ok(vector);
  assert.equal(
    usesLegacyCountingCard(
      "p007_abacus_1",
      selectBookArt(original, undefined, vector, true),
    ),
    true,
  );
  assert.equal(
    usesLegacyCountingCard(
      "p007_abacus_1",
      selectBookArt(original, undefined, vector, false),
    ),
    false,
  );
  assert.equal(usesLegacyCountingCard("p007_digit_1_print", original), false);
});

test("page 7 drawing sample is one repeatable mushroom outline", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p007_mushroom_draw;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p007_mushroom_draw.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [100, 70]);
  assert.equal([...art.xml.matchAll(/id="mushroom-cap"/g)].length, 1);
  assert.equal([...art.xml.matchAll(/id="mushroom-stem"/g)].length, 1);
  assert.doesNotMatch(art.xml, /<text\b/);
});

test("page 7 educational coin displays only the denomination one", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p007_coin_1_kopek;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p007_coin_1_kopek.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [110, 115]);
  assert.equal([...art.xml.matchAll(/id="coin-body"/g)].length, 1);
  assert.equal([...art.xml.matchAll(/<text\b/g)].length, 1);
  assert.match(art.xml, />1<\/text>/);
  assert.doesNotMatch(art.xml, /коп|руб|₽|195\d|герб|СССР/i);
});

test("page 8 counting rail moves exactly two of ten beads left", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p008_abacus_2;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p008_abacus_2.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [360, 75]);
  const beads = [...art.xml.matchAll(/<circle id="bead-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.equal(beads.length, 10);
  assert.equal(beads.filter((bead) => bead.fill === "#c8352e").length, 5);
  assert.equal(beads.filter((bead) => bead.fill === "#ffffff").length, 5);
  assert.ok(Number(beads[1].cx) - Number(beads[0].cx) < 30);
  assert.ok(Number(beads[2].cx) - Number(beads[1].cx) >= 60);
  assert.match(art.alt, /2 бусины слева, 8 справа/);
});

test("page 8 educational coin keeps denomination two without historical marks", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p008_coin_2_kopeks;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p008_coin_2_kopeks.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [110, 110]);
  assert.equal([...art.xml.matchAll(/id="coin-body"/g)].length, 1);
  assert.equal([...art.xml.matchAll(/<text\b/g)].length, 1);
  assert.match(art.xml, />2<\/text>/);
  assert.doesNotMatch(art.xml, /коп|руб|₽|195\d|герб|СССР/i);
});

test("page 8 printed two and handwritten two retain their distinct forms", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const print = vectorAssets.p008_digit_2_print;
  const sample = vectorAssets.p008_digit_2_sample;
  assert.ok(print && sample);
  assert.equal(
    print.xml,
    readFileSync("assets/book2/vector/p008_digit_2_print.svg", "utf8"),
  );
  assert.equal(
    sample.xml,
    readFileSync("assets/book2/vector/p008_digit_2_sample.svg", "utf8"),
  );
  assert.deepEqual([print.width, print.height], [70, 80]);
  assert.deepEqual([sample.width, sample.height], [125, 110]);
  assert.match(print.xml, /font-family="Andika_700Bold"[^>]*>2<\/text>/);
  assert.equal(digitSamples["2"].asset, "p008_digit_2_sample");
  assert.match(sample.xml, /id="notebook-grid"/);
  assert.match(
    sample.xml,
    /d="M63 31 C53 52 43 27 62 21 C76 14 78 29 63 47 L43 77 C53 64 58 79 65 76 C69 75 71 73 73 70"/,
  );
});

test("page 8 stick sample has two separate two-stick angles", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p008_sticks_angle_v;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p008_sticks_angle_v.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [165, 80]);
  const sticks = [...art.xml.matchAll(/<line id="stick-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.equal(sticks.length, 4);
  assert.deepEqual(
    sticks.map((stick) => [
      Number(stick.x1),
      Number(stick.y1),
      Number(stick.x2),
      Number(stick.y2),
    ]),
    [
      [13, 68, 44, 10],
      [44, 10, 76, 68],
      [94, 10, 126, 68],
      [126, 68, 155, 10],
    ],
  );
});

test("page 8 drawing sample has two separate plums and stems", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p008_plums_draw;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p008_plums_draw.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [110, 80]);
  assert.equal([...art.xml.matchAll(/id="plum-\d+"/g)].length, 2);
  assert.equal([...art.xml.matchAll(/id="plum-stem-\d+"/g)].length, 2);
  assert.match(art.alt, /две отдельные сливы/);
});

test("page 9 writing strip keeps 1, 2 horizontal, 2 vertical, 1 cells", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p009_writing_strip_squares_rects;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync(
      "assets/book2/vector/p009_writing_strip_squares_rects.svg",
      "utf8",
    ),
  );
  assert.deepEqual([art.width, art.height], [415, 100]);
  assert.match(art.xml, /id="notebook-grid"/);
  const cells = [...art.xml.matchAll(/<rect id="p9-cell-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.deepEqual(
    cells.map((cell) => [Number(cell.x), Number(cell.y)]),
    [
      [50, 50],
      [140, 50],
      [170, 50],
      [260, 20],
      [260, 50],
      [340, 50],
    ],
  );
});

test("page 10 counting rail keeps the source's two plus one grouping", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p010_abacus_3;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p010_abacus_3.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [370, 85]);
  const beads = [...art.xml.matchAll(/<circle id="bead-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.equal(beads.length, 10);
  assert.equal(beads.filter((bead) => bead.fill === "#c8352e").length, 5);
  assert.equal(beads.filter((bead) => bead.fill === "#ffffff").length, 5);
  const x = beads.map((bead) => Number(bead.cx));
  assert.ok(x[1] - x[0] < 30, "first two beads must form a pair");
  assert.ok(x[2] - x[1] >= 45, "third bead must be separate");
  assert.ok(x[3] - x[2] >= 60, "seven parked beads must be distinct");
  assert.match(art.alt, /2 рядом и ещё 1/);
});

test("page 10 educational coin keeps denomination three only", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p010_coin_3_kopeks;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p010_coin_3_kopeks.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [125, 120]);
  assert.equal([...art.xml.matchAll(/id="coin-body"/g)].length, 1);
  assert.equal([...art.xml.matchAll(/<text\b/g)].length, 1);
  assert.match(art.xml, />3<\/text>/);
  assert.doesNotMatch(art.xml, /коп|руб|₽|195\d|герб|СССР/i);
});

test("page 10 printed and handwritten threes preserve the trace form", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const print = vectorAssets.p010_digit_3_print;
  const sample = vectorAssets.p010_digit_3_sample;
  assert.ok(print && sample);
  assert.equal(
    print.xml,
    readFileSync("assets/book2/vector/p010_digit_3_print.svg", "utf8"),
  );
  assert.equal(
    sample.xml,
    readFileSync("assets/book2/vector/p010_digit_3_sample.svg", "utf8"),
  );
  assert.deepEqual([print.width, print.height], [75, 90]);
  assert.deepEqual([sample.width, sample.height], [130, 110]);
  assert.match(print.xml, /font-family="Andika_700Bold"[^>]*>3<\/text>/);
  assert.equal(digitSamples["3"].asset, "p010_digit_3_sample");
  assert.match(sample.xml, /id="notebook-grid"/);
  assert.match(
    sample.xml,
    /d="M59 33 C75 17 83 29 75 42 C72 47 64 50 60 50 C86 48 75 73 63 82 C52 91 45 80 52 76 C57 77 52 81 50 79"/,
  );
});

test("page 10 cherry drawing shows three separate berries with stems", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p010_cherries_draw;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p010_cherries_draw.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [165, 85]);
  const berries = [...art.xml.matchAll(/<circle id="cherry-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.equal(berries.length, 3);
  assert.equal([...art.xml.matchAll(/id="cherry-stem-\d+"/g)].length, 3);
  assert.ok(
    berries.every(
      (berry, i) =>
        i === 0 || Number(berry.cx) > Number(berries[i - 1].cx) + 25,
    ),
  );
});

test("page 10 two triangles each use exactly three separate sticks", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p010_sticks_triangles;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p010_sticks_triangles.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [180, 80]);
  const sticks = [...art.xml.matchAll(/<line id="stick-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.equal(sticks.length, 6);
  assert.deepEqual(
    sticks.slice(0, 3).map((s) => [s.x1, s.y1, s.x2, s.y2]),
    [
      ["12", "68", "45", "10"],
      ["45", "10", "78", "68"],
      ["78", "68", "12", "68"],
    ],
  );
  assert.deepEqual(
    sticks.slice(3).map((s) => [s.x1, s.y1, s.x2, s.y2]),
    [
      ["102", "11", "168", "11"],
      ["168", "11", "135", "68"],
      ["135", "68", "102", "11"],
    ],
  );
});

test("page 11 square composition keeps two green left and one red right", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p011_three_squares_2_1;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p011_three_squares_2_1.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [85, 90]);
  const squares = [...art.xml.matchAll(/<rect id="square-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.equal(squares.length, 3);
  assert.deepEqual(
    squares.map((square) => square.fill),
    ["#5d863d", "#5d863d", "#c4695c"],
  );
  assert.equal(squares[0].x, squares[1].x);
  assert.ok(Number(squares[0].y) < Number(squares[1].y));
  assert.equal(squares[1].y, squares[2].y);
  assert.ok(Number(squares[2].x) > Number(squares[1].x));
});

test("page 11 composite ball row keeps two plus one and one plus two", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p011_balls_row_3_groups;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p011_balls_row_3_groups.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [780, 160]);
  const balls = [
    ...art.xml.matchAll(/<circle id="ball-(left|right)-(\d+)"[^>]*\/>/g),
  ]
    .map((match) => ({
      side: match[1],
      index: Number(match[2]),
      x: Number(attributes(match[0]).cx),
      y: Number(attributes(match[0]).cy),
      radius: Number(attributes(match[0]).r),
      color: attributes(match[0]).fill,
    }))
    .sort((a, b) => a.side.localeCompare(b.side) || a.index - b.index);
  assert.deepEqual(
    balls.map(({ side, index }) => [side, index]),
    [
      ["left", 0],
      ["left", 1],
      ["left", 2],
      ["right", 0],
      ["right", 1],
      ["right", 2],
    ],
  );
  assert.equal(new Set(balls.map(({ color }) => color)).size, 6);
  assert.ok(balls.every(({ radius }) => radius >= 35 && radius <= 43));
  const gap = (a: number, b: number) => balls[b].x - balls[a].x;
  assert.ok(gap(0, 1) < gap(1, 2));
  assert.ok(gap(4, 5) < gap(3, 4));
  assert.ok(gap(2, 3) > gap(1, 2) && gap(2, 3) > gap(3, 4));
  assert.ok(balls[0].y < balls[1].y);
  assert.ok(balls[5].y < balls[4].y);
  assert.match(art.alt, /2 \+ 1.*1 \+ 2/);
});

test("page 11 writing strip preserves the 1,2,3,3,2,1 cell groups", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p011_writing_strip_squares_rects;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync(
      "assets/book2/vector/p011_writing_strip_squares_rects.svg",
      "utf8",
    ),
  );
  assert.deepEqual([art.width, art.height], [640, 130]);
  assert.match(art.xml, /id="notebook-grid"/);
  const cells = [
    ...art.xml.matchAll(/<rect id="p11-cell-(\d+)-(\d+)"[^>]*\/>/g),
  ].map((m) => ({
    group: Number(m[1]),
    y: Number(attributes(m[0]).y),
  }));
  assert.equal(cells.length, 12);
  assert.deepEqual(
    Array.from(
      { length: 6 },
      (_, group) => cells.filter((cell) => cell.group === group).length,
    ),
    [1, 2, 3, 3, 2, 1],
  );
  assert.deepEqual(
    cells.filter((cell) => cell.group === 2).map((cell) => cell.y),
    [80, 80, 80],
  );
  assert.deepEqual(
    cells.filter((cell) => cell.group === 3).map((cell) => cell.y),
    [20, 50, 80],
  );
});

test("page 12 counting rail keeps the source's three plus one grouping", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p012_abacus_4;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p012_abacus_4.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [360, 90]);
  const beads = [...art.xml.matchAll(/<circle id="bead-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.equal(beads.length, 10);
  assert.equal(beads.filter((bead) => bead.fill === "#c8352e").length, 5);
  assert.equal(beads.filter((bead) => bead.fill === "#ffffff").length, 5);
  const x = beads.map((bead) => Number(bead.cx));
  assert.ok(x[1] - x[0] < 30 && x[2] - x[1] < 30);
  assert.ok(x[3] - x[2] >= 45 && x[4] - x[3] >= 60);
  assert.match(art.alt, /3 рядом и ещё 1/);
});

test("page 12 printed and handwritten fours match the original trace", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const print = vectorAssets.p012_digit_4_print;
  const sample = vectorAssets.p012_digit_4_sample;
  assert.ok(print && sample);
  assert.equal(
    print.xml,
    readFileSync("assets/book2/vector/p012_digit_4_print.svg", "utf8"),
  );
  assert.equal(
    sample.xml,
    readFileSync("assets/book2/vector/p012_digit_4_sample.svg", "utf8"),
  );
  assert.deepEqual([print.width, print.height], [75, 85]);
  assert.deepEqual([sample.width, sample.height], [125, 95]);
  assert.match(print.xml, /font-family="Andika_700Bold"[^>]*>4<\/text>/);
  assert.equal(digitSamples["4"].asset, "p012_digit_4_sample");
  assert.match(sample.xml, /id="notebook-grid"/);
  assert.match(sample.xml, /d="M63 19 L47 53 L64 53"/);
  assert.match(sample.xml, /d="M73 37 L57 75"/);
});

test("page 12 drawing sample has four differently colored flags, last facing left", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p012_flags_draw_sample;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p012_flags_draw_sample.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [425, 140]);
  assert.match(art.xml, /id="notebook-grid"/);
  const flags = [...art.xml.matchAll(/<path id="flag-\d+"[^>]*\/>/g)].map((m) =>
    attributes(m[0]),
  );
  assert.equal(flags.length, 4);
  assert.equal(new Set(flags.map((flag) => flag.fill)).size, 4);
  assert.equal([...art.xml.matchAll(/id="flag-pole-\d+"/g)].length, 4);
  assert.match(flags[0].d, /^M45 28H105/);
  assert.match(flags[1].d, /^M135 28H195/);
  assert.match(flags[2].d, /^M225 28H285/);
  assert.match(flags[3].d, /^M405 28H345/);
});

test("page 12 square uses four connected wooden sticks", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p012_sticks_square;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p012_sticks_square.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [70, 75]);
  const sticks = [...art.xml.matchAll(/<line id="stick-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.equal(sticks.length, 4);
  assert.deepEqual(
    sticks.map((s) => [s.x1, s.y1, s.x2, s.y2]),
    [
      ["10", "12", "60", "12"],
      ["60", "12", "60", "62"],
      ["60", "62", "10", "62"],
      ["10", "62", "10", "12"],
    ],
  );
});

test("page 13 plum frames keep 3+1, 2+2, and 1+3 with matching fruit", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const expected = [
    {
      id: "p013_plums_frame_1",
      dimensions: [245, 180],
      groups: [3, 1],
      gap: 2,
    },
    {
      id: "p013_plums_frame_2",
      dimensions: [250, 180],
      groups: [2, 2],
      gap: 1,
    },
    {
      id: "p013_plums_frame_3",
      dimensions: [250, 180],
      groups: [1, 3],
      gap: 0,
    },
  ];
  const fruitStyles: string[][] = [];
  for (const { id, dimensions, groups, gap } of expected) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], dimensions);
    assert.match(art.xml, /<rect id="plum-frame"/);
    const plums = [...art.xml.matchAll(/<ellipse id="plum-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    assert.equal(plums.length, 4, id);
    assert.equal([...art.xml.matchAll(/id="plum-stem-\d+"/g)].length, 4);
    fruitStyles.push(plums.map((plum) => `${plum.rx}/${plum.ry}/${plum.fill}`));
    const x = plums.map((plum) => Number(plum.cx));
    const spaces = x.slice(1).map((value, index) => value - x[index]);
    assert.equal(spaces.indexOf(Math.max(...spaces)), gap, `${id} group split`);
    assert.ok(Math.max(...spaces) >= Math.min(...spaces) * 1.7);
    const block = pages[12].blocks.find((candidate) =>
      candidate.images.includes(id),
    );
    if (!block || block.kind !== "work")
      throw new Error(`${id}: work block missing`);
    const marks = block.fields.find((field) => field.id === "q3")?.marks
      ?.shapes;
    assert.equal(marks?.length, 4, `${id}: four question marks`);
    for (let i = 0; i < plums.length; i++) {
      assert.ok(
        Math.abs(x[i] / art.width - marks![i][0]) < 0.012,
        `${id}: plum ${i} x`,
      );
      assert.ok(
        Math.abs(Number(plums[i].cy) / art.height - marks![i][1]) < 0.012,
        `${id}: plum ${i} y`,
      );
    }
    assert.match(art.alt, new RegExp(`${groups[0]} \\+ ${groups[1]}`));
  }
  assert.deepEqual(fruitStyles[0], fruitStyles[1]);
  assert.deepEqual(fruitStyles[1], fruitStyles[2]);
});

test("page 13 four squares keep green left and muted red right", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p013_squares_2_2;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p013_squares_2_2.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [90, 70]);
  const squares = [...art.xml.matchAll(/<rect id="square-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(squares.length, 4);
  assert.deepEqual(
    squares.map((square) => square.fill),
    ["#5d863d", "#c4695c", "#5d863d", "#c4695c"],
  );
  assert.equal(squares[0].x, squares[2].x);
  assert.equal(squares[1].x, squares[3].x);
  assert.equal(squares[0].y, squares[1].y);
  assert.equal(squares[2].y, squares[3].y);
});

test("page 14 rail has four close beads then a fifth separate bead", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p014_abacus_5;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p014_abacus_5.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [370, 80]);
  const beads = [...art.xml.matchAll(/<circle id="bead-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(beads.length, 10);
  assert.equal(beads.filter((bead) => bead.fill === "#c8352e").length, 5);
  assert.equal(beads.filter((bead) => bead.fill === "#ffffff").length, 5);
  const x = beads.map((bead) => Number(bead.cx));
  assert.ok(x[1] - x[0] <= 25 && x[2] - x[1] <= 25 && x[3] - x[2] <= 25);
  assert.ok(x[4] - x[3] >= 60 && x[5] - x[4] >= 45);
  assert.match(art.alt, /4 рядом и ещё 1/);
});

test("page 14 drawing has five separately countable apples", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p014_apples_draw;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p014_apples_draw.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [270, 60]);
  const apples = [...art.xml.matchAll(/<path id="apple-(\d+)"[^>]*\/>/g)].map(
    (match) => ({
      index: Number(match[1]),
      fill: attributes(match[0]).fill,
    }),
  );
  assert.deepEqual(
    apples.map((apple) => apple.index),
    [0, 1, 2, 3, 4],
  );
  assert.equal([...art.xml.matchAll(/id="apple-stem-\d+"/g)].length, 5);
  assert.deepEqual(
    apples.map((apple) => apple.fill),
    Array(5).fill("#c18470"),
  );
});

test("page 14 coin and printed five show denomination without currency", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const coin = vectorAssets.p014_coin_5_kopeks;
  const print = vectorAssets.p014_digit_5_large;
  assert.ok(coin && print);
  assert.equal(
    coin.xml,
    readFileSync("assets/book2/vector/p014_coin_5_kopeks.svg", "utf8"),
  );
  assert.equal(
    print.xml,
    readFileSync("assets/book2/vector/p014_digit_5_large.svg", "utf8"),
  );
  assert.deepEqual([coin.width, coin.height], [150, 150]);
  assert.deepEqual([print.width, print.height], [75, 80]);
  assert.match(coin.xml, /id="coin-body"/);
  assert.match(coin.xml, /font-family="Andika_700Bold"[^>]*>5<\/text>/);
  assert.match(print.xml, /font-family="Andika_700Bold"[^>]*>5<\/text>/);
  assert.doesNotMatch(coin.xml, /коп|руб|1953|СССР|герб/i);
});

test("page 14 handwritten five uses the lesson's exact trace", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p014_digit_5_sample;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p014_digit_5_sample.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [125, 105]);
  assert.equal(digitSamples["5"].asset, "p014_digit_5_sample");
  assert.match(art.xml, /id="notebook-grid"/);
  assert.match(art.xml, /M88 27 C77 32 76 28 70 27 L59 47/);
  assert.match(art.xml, /C48 89 44 77 49 74 C54 73 50 78 49 76/);
});

test("page 14 stars preserve three above two and one five-point outline", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const five = vectorAssets.p014_five_stars;
  const outline = vectorAssets.p014_star_outline;
  assert.ok(five && outline);
  assert.equal(
    five.xml,
    readFileSync("assets/book2/vector/p014_five_stars.svg", "utf8"),
  );
  assert.equal(
    outline.xml,
    readFileSync("assets/book2/vector/p014_star_outline.svg", "utf8"),
  );
  assert.deepEqual([five.width, five.height], [345, 125]);
  assert.deepEqual([outline.width, outline.height], [120, 105]);
  const stars = [...five.xml.matchAll(/<polygon id="star-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(stars.length, 5);
  assert.ok(stars.every((star) => star.points.split(" ").length === 10));
  const centers = stars.map((star) => {
    const match = /^translate\((\d+) (\d+)\)$/.exec(star.transform);
    assert.ok(match);
    return [Number(match[1]), Number(match[2])];
  });
  assert.deepEqual(
    centers.slice(0, 3).map((point) => point[1]),
    [34, 34, 34],
  );
  assert.deepEqual(
    centers.slice(3).map((point) => point[1]),
    [88, 88],
  );
  assert.ok(centers[0][0] < centers[1][0] && centers[1][0] < centers[2][0]);
  const single = /<polygon id="star-outline"[^>]*\/>/.exec(outline.xml);
  assert.ok(single);
  const shape = attributes(single[0]);
  assert.equal(shape.points.split(" ").length, 10);
  assert.equal(shape.fill, "none");
});

test("page 15 nut frames keep 3+2, 2+3, 4+1, 1+4 at existing question marks", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const frames = [
    { id: "p015_nuts_frame_1", size: [195, 150], groups: [3, 2] },
    { id: "p015_nuts_frame_2", size: [187, 150], groups: [2, 3] },
    { id: "p015_nuts_frame_3", size: [190, 150], groups: [4, 1] },
    { id: "p015_nuts_frame_4", size: [192, 150], groups: [1, 4] },
  ];
  const styles: string[][] = [];
  for (const { id, size, groups } of frames) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], size);
    assert.match(art.xml, /<rect id="nut-frame"/);
    const nuts = [...art.xml.matchAll(/<ellipse id="nut-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    assert.equal(nuts.length, 5);
    assert.equal([...art.xml.matchAll(/id="nut-husk-\d+"/g)].length, 5);
    styles.push(nuts.map((nut) => `${nut.rx}/${nut.ry}/${nut.fill}`));
    const block = pages[14].blocks.find((candidate) =>
      candidate.images.includes(id),
    );
    if (!block || block.kind !== "work")
      throw new Error(`${id}: work block missing`);
    const marks = block.fields.find((field) => field.id === "q3")?.marks
      ?.shapes;
    assert.equal(marks?.length, 5);
    for (let i = 0; i < nuts.length; i++) {
      assert.ok(
        Math.abs(Number(nuts[i].cx) / art.width - marks![i][0]) < 0.012,
      );
      assert.ok(
        Math.abs(Number(nuts[i].cy) / art.height - marks![i][1]) < 0.012,
      );
    }
    assert.match(art.alt, new RegExp(`${groups[0]} \\+ ${groups[1]}`));
  }
  for (const style of styles.slice(1)) assert.deepEqual(style, styles[0]);
});

test("page 15 nut ladder has columns of one through five, fifteen total", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p015_nuts_columns_1_5;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p015_nuts_columns_1_5.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [395, 218]);
  const nuts = [
    ...art.xml.matchAll(/<ellipse id="column-nut-(\d+)-(\d+)"[^>]*\/>/g),
  ].map((match) => ({
    col: Number(match[1]),
    row: Number(match[2]),
    x: Number(attributes(match[0]).cx),
    y: Number(attributes(match[0]).cy),
  }));
  assert.equal(nuts.length, 15);
  assert.deepEqual(
    Array.from(
      { length: 5 },
      (_, col) => nuts.filter((nut) => nut.col === col).length,
    ),
    [1, 2, 3, 4, 5],
  );
  for (let col = 0; col < 5; col++) {
    const column = nuts.filter((nut) => nut.col === col);
    assert.deepEqual(
      column.map((nut) => nut.row),
      Array.from({ length: col + 1 }, (_, row) => row),
    );
    assert.ok(column.every((nut) => nut.x === column[0].x));
    assert.equal(column.at(-1)?.y, 184);
    assert.ok(
      col === 0 || column[0].x > nuts.find((nut) => nut.col === col - 1)!.x,
    );
  }
  assert.doesNotMatch(art.xml, /pencil|карандаш|scribble/i);
});

test("page 15 squares show four coral squares and one green square", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p015_squares_4_1;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p015_squares_4_1.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [145, 80]);
  const squares = [...art.xml.matchAll(/<rect id="square-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(squares.length, 5);
  assert.deepEqual(
    squares.map((square) => square.fill),
    ["#c18470", "#c18470", "#c18470", "#c18470", "#5d863d"],
  );
  assert.equal(squares[0].x, squares[2].x);
  assert.equal(squares[1].x, squares[3].x);
  assert.equal(squares[0].y, squares[1].y);
  assert.equal(squares[2].y, squares[3].y);
  assert.ok(Number(squares[4].x) > Number(squares[3].x) + 40);
});

test("page 16 arithmetic cards keep all four addition examples and blank forms", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (let first = 1; first <= 4; first++) {
    for (const complete of [false, true]) {
      const id = `p016_cards_${first}_plus_1_${complete ? `eq_${first + 1}` : "blank"}`;
      const art = vectorAssets[id];
      assert.ok(art, id);
      assert.equal(
        art.xml,
        readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
      );
      assert.deepEqual(
        [art.width, art.height],
        [complete ? (first < 3 ? 270 : 265) : 215, complete ? 80 : 75],
      );
      const cards = [...art.xml.matchAll(/<rect id="card-\d+"[^>]*\/>/g)];
      const glyphs = [
        ...art.xml.matchAll(/<text id="card-label-\d+"[^>]*>([^<]+)<\/text>/g),
      ].map((match) => match[1]);
      assert.equal(cards.length, complete ? 5 : 4, id);
      assert.deepEqual(
        glyphs,
        complete
          ? [String(first), "+", "1", "=", String(first + 1)]
          : [String(first), "+", "1", "="],
      );
      assert.match(art.xml, /font-family="Andika_700Bold"/);
    }
  }
});

test("page 17 notebook sample keeps four complete plus-one sums", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p017_handwritten_sums_plus_1;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync(
      "assets/book2/vector/p017_handwritten_sums_plus_1.svg",
      "utf8",
    ),
  );
  assert.deepEqual([art.width, art.height], [265, 365]);
  assert.match(art.xml, /id="notebook-grid"/);
  const glyphs = [
    ...art.xml.matchAll(/<text id="sum-(\d+)-(\d+)"[^>]*>([^<]+)<\/text>/g),
  ].map((match) => ({
    row: Number(match[1]),
    column: Number(match[2]),
    text: match[3],
    y: Number(attributes(match[0]).y),
  }));
  assert.equal(glyphs.length, 20);
  for (let row = 0; row < 4; row++) {
    const symbols = glyphs.filter((glyph) => glyph.row === row);
    assert.deepEqual(
      symbols.map((glyph) => glyph.column),
      [0, 1, 2, 3, 4],
    );
    assert.deepEqual(
      symbols.map((glyph) => glyph.text),
      [String(row + 1), "+", "1", "=", String(row + 2)],
    );
    assert.ok(symbols.every((glyph) => glyph.y === 70 + row * 90));
  }
  assert.match(art.xml, /font-family="Neucha_400Regular"/);
});

test("page 18 counting rail keeps five close beads and a sixth separate", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p018_abacus_6;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p018_abacus_6.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [365, 80]);
  const beads = [...art.xml.matchAll(/<circle id="bead-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(beads.length, 10);
  assert.equal(beads.filter((bead) => bead.fill === "#c8352e").length, 5);
  assert.equal(beads.filter((bead) => bead.fill === "#ffffff").length, 5);
  const x = beads.map((bead) => Number(bead.cx));
  for (let i = 1; i < 5; i++) assert.ok(x[i] - x[i - 1] <= 25);
  assert.ok(x[5] - x[4] >= 60 && x[6] - x[5] >= 35);
  assert.match(art.alt, /5 рядом и ещё 1/);
});

test("page 18 printed and handwritten six use distinct correct forms", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const print = vectorAssets.p018_digit_6_large;
  const sample = vectorAssets.p018_digit_6_sample;
  assert.ok(print && sample);
  assert.equal(
    print.xml,
    readFileSync("assets/book2/vector/p018_digit_6_large.svg", "utf8"),
  );
  assert.equal(
    sample.xml,
    readFileSync("assets/book2/vector/p018_digit_6_sample.svg", "utf8"),
  );
  assert.deepEqual([print.width, print.height], [70, 85]);
  assert.deepEqual([sample.width, sample.height], [145, 115]);
  assert.match(print.xml, /font-family="Andika_700Bold"[^>]*>6<\/text>/);
  assert.equal(digitSamples["6"].asset, "p018_digit_6_sample");
  assert.match(sample.xml, /id="notebook-grid"/);
  assert.match(sample.xml, /M85 40 C93 39 87 27 79 33/);
  assert.match(sample.xml, /C60 98 75 88 81 70 C92 45 62 49 56 70/);
});

test("page 18 stick samples keep six-stick house and two three-stick triangles", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const house = vectorAssets.p018_sticks_house;
  const triangles = vectorAssets.p018_sticks_two_triangles;
  assert.ok(house && triangles);
  assert.equal(
    house.xml,
    readFileSync("assets/book2/vector/p018_sticks_house.svg", "utf8"),
  );
  assert.equal(
    triangles.xml,
    readFileSync("assets/book2/vector/p018_sticks_two_triangles.svg", "utf8"),
  );
  assert.deepEqual([house.width, house.height], [95, 125]);
  assert.deepEqual([triangles.width, triangles.height], [170, 75]);
  const lines = (xml: string) =>
    [...xml.matchAll(/<line id="stick-\d+"[^>]*\/>/g)].map((match) =>
      attributes(match[0]),
    );
  const houseLines = lines(house.xml);
  const triangleLines = lines(triangles.xml);
  assert.equal(houseLines.length, 6);
  assert.equal(triangleLines.length, 6);
  assert.deepEqual(
    houseLines.map((line) => [line.x1, line.y1, line.x2, line.y2]),
    [
      ["20", "58", "20", "110"],
      ["20", "58", "48", "10"],
      ["48", "10", "75", "58"],
      ["75", "58", "75", "110"],
      ["75", "110", "20", "110"],
      ["20", "58", "75", "58"],
    ],
  );
  assert.deepEqual(
    triangleLines
      .slice(0, 3)
      .map((line) => [line.x1, line.y1, line.x2, line.y2]),
    [
      ["12", "65", "42", "10"],
      ["42", "10", "72", "65"],
      ["72", "65", "12", "65"],
    ],
  );
  assert.deepEqual(
    triangleLines.slice(3).map((line) => [line.x1, line.y1, line.x2, line.y2]),
    [
      ["94", "65", "124", "10"],
      ["124", "10", "154", "65"],
      ["154", "65", "94", "65"],
    ],
  );
});

test("page 19 number strip keeps only 1, 4, 6 printed and three gaps empty", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p019_number_cards_1_6;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p019_number_cards_1_6.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [495, 95]);
  const boxes = [
    ...art.xml.matchAll(/<rect id="number-card-(\d+)"[^>]*\/>/g),
  ].map((match) => ({
    index: Number(match[1]),
    x: Number(attributes(match[0]).x),
  }));
  assert.deepEqual(
    boxes.map((box) => box.index),
    [0, 1, 2, 3, 4, 5],
  );
  assert.ok(
    boxes.every((box, index) => index === 0 || box.x > boxes[index - 1].x),
  );
  const labels = [
    ...art.xml.matchAll(/<text id="number-label-(\d+)"[^>]*>([^<]+)<\/text>/g),
  ].map((match) => [Number(match[1]), match[2]]);
  assert.deepEqual(labels, [
    [0, "1"],
    [3, "4"],
    [5, "6"],
  ]);
  assert.match(pages[18].blocks[8].prompt, /1, □, □, 4, □, 6/);
  assert.match(art.alt, /пустые/);
});

test("page 19 composition keeps four green squares and two red vertically", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p019_squares_4_2;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p019_squares_4_2.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [155, 80]);
  const squares = [...art.xml.matchAll(/<rect id="square-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(squares.length, 6);
  assert.deepEqual(
    squares.map((square) => square.fill),
    ["#5d863d", "#5d863d", "#5d863d", "#5d863d", "#c4695c", "#c4695c"],
  );
  assert.equal(squares[0].x, squares[2].x);
  assert.equal(squares[1].x, squares[3].x);
  assert.equal(squares[0].y, squares[1].y);
  assert.equal(squares[2].y, squares[3].y);
  assert.equal(squares[4].x, squares[5].x);
  assert.ok(Number(squares[4].x) > Number(squares[1].x) + 40);
});

test("page 20 subtraction cards preserve 2−1=1, 3−1=2, 4−1=3", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [first, size] of [
    [2, [269, 78]],
    [3, [269, 82]],
    [4, [266, 84]],
  ] as const) {
    const id = `p020_cards_${first}_minus_1`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], size);
    assert.equal(
      [...art.xml.matchAll(/<rect id="card-\d+"[^>]*\/>/g)].length,
      5,
    );
    const glyphs = [
      ...art.xml.matchAll(/<text id="card-label-\d+"[^>]*>([^<]+)<\/text>/g),
    ].map((match) => match[1]);
    assert.deepEqual(glyphs, [String(first), "−", "1", "=", String(first - 1)]);
    assert.match(art.xml, /font-family="Andika_700Bold"/);
  }
});

test("page 21 cards keep the complete five-minus-one equation", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p021_cards_5_minus_1;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p021_cards_5_minus_1.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [270, 70]);
  assert.equal([...art.xml.matchAll(/<rect id="card-\d+"[^>]*\/>/g)].length, 5);
  const glyphs = [
    ...art.xml.matchAll(/<text id="card-label-\d+"[^>]*>([^<]+)<\/text>/g),
  ].map((match) => match[1]);
  assert.deepEqual(glyphs, ["5", "−", "1", "=", "4"]);
});

test("page 21 notebook sample keeps five complete subtraction rows", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p021_writing_subtract_one;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p021_writing_subtract_one.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [263, 451]);
  assert.match(art.xml, /id="notebook-grid"/);
  const glyphs = [
    ...art.xml.matchAll(/<text id="sub-(\d+)-(\d+)"[^>]*>([^<]+)<\/text>/g),
  ].map((match) => ({
    row: Number(match[1]),
    column: Number(match[2]),
    text: match[3],
    y: Number(attributes(match[0]).y),
  }));
  assert.equal(glyphs.length, 25);
  for (let row = 0; row < 5; row++) {
    const symbols = glyphs.filter((glyph) => glyph.row === row);
    assert.deepEqual(
      symbols.map((glyph) => glyph.column),
      [0, 1, 2, 3, 4],
    );
    assert.deepEqual(
      symbols.map((glyph) => glyph.text),
      [String(row + 2), "−", "1", "=", String(row + 1)],
    );
    assert.ok(symbols.every((glyph) => glyph.y === 73 + row * 89));
  }
  assert.match(art.xml, /font-family="Neucha_400Regular"/);
});

test("page 22 rail keeps six adjacent beads and the seventh separate", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p022_abacus_7;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p022_abacus_7.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [369, 73]);
  const beads = [...art.xml.matchAll(/<circle id="bead-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(beads.length, 10);
  assert.equal(beads.filter((bead) => bead.fill === "#c8352e").length, 5);
  assert.equal(beads.filter((bead) => bead.fill === "#ffffff").length, 5);
  const x = beads.map((bead) => Number(bead.cx));
  for (let i = 1; i < 6; i++) assert.ok(x[i] - x[i - 1] <= 25);
  assert.ok(x[6] - x[5] >= 60 && x[7] - x[6] >= 40);
  assert.match(art.alt, /6 рядом и ещё 1/);
});

test("page 22 printed and handwritten sevens match the source trace", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const print = vectorAssets.p022_digit_7_print;
  const sample = vectorAssets.p022_digit_7_sample;
  assert.ok(print && sample);
  assert.equal(
    print.xml,
    readFileSync("assets/book2/vector/p022_digit_7_print.svg", "utf8"),
  );
  assert.equal(
    sample.xml,
    readFileSync("assets/book2/vector/p022_digit_7_sample.svg", "utf8"),
  );
  assert.deepEqual([print.width, print.height], [51, 67]);
  assert.deepEqual([sample.width, sample.height], [125, 103]);
  assert.match(print.xml, /font-family="Andika_700Bold"[^>]*>7<\/text>/);
  assert.equal(digitSamples["7"].asset, "p022_digit_7_sample");
  assert.match(sample.xml, /id="notebook-grid"/);
  assert.match(
    sample.xml,
    /M47 32 C54 19 54 32 58 29 C63 32 70 24 74 24 L54 84/,
  );
  assert.match(sample.xml, /M60 48 C51 51 58 57 73 49/);
});

test("page 22 separate square and triangle use exactly seven sticks", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p022_sticks_square_triangle;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p022_sticks_square_triangle.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [200, 72]);
  const sticks = [...art.xml.matchAll(/<line id="stick-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(sticks.length, 7);
  assert.deepEqual(
    sticks.slice(0, 4).map((s) => [s.x1, s.y1, s.x2, s.y2]),
    [
      ["13", "10", "68", "10"],
      ["68", "10", "68", "65"],
      ["68", "65", "13", "65"],
      ["13", "65", "13", "10"],
    ],
  );
  assert.deepEqual(
    sticks.slice(4).map((s) => [s.x1, s.y1, s.x2, s.y2]),
    [
      ["120", "65", "151", "10"],
      ["151", "10", "183", "65"],
      ["183", "65", "120", "65"],
    ],
  );
});

test("page 23 squares preserve four green 2×2 and three red 2+1", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p023_squares_4_3;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p023_squares_4_3.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [177, 76]);
  const squares = [...art.xml.matchAll(/<rect id="square-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(squares.length, 7);
  assert.deepEqual(
    squares.map((square) => square.fill),
    [
      "#5d863d",
      "#5d863d",
      "#5d863d",
      "#5d863d",
      "#c4695c",
      "#c4695c",
      "#c4695c",
    ],
  );
  const xy = squares.map((square) => [Number(square.x), Number(square.y)]);
  assert.deepEqual(xy.slice(0, 4), [
    [14, 10],
    [53, 10],
    [14, 46],
    [53, 46],
  ]);
  assert.deepEqual(xy.slice(4), [
    [114, 10],
    [153, 10],
    [114, 46],
  ]);
  assert.match(art.alt, /4 зелёных.*3 красных/);
});

test("page 24 rail keeps seven adjacent beads and the eighth apart", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p024_abacus_8;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p024_abacus_8.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [368, 81]);
  const beads = [...art.xml.matchAll(/<circle id="bead-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(beads.length, 10);
  assert.equal(beads.filter((bead) => bead.fill === "#c8352e").length, 5);
  assert.equal(beads.filter((bead) => bead.fill === "#ffffff").length, 5);
  const x = beads.map((bead) => Number(bead.cx));
  for (let i = 1; i < 7; i++) assert.equal(x[i] - x[i - 1], 24);
  assert.ok(x[7] - x[6] >= 50);
  assert.ok(x[8] - x[7] >= 40);
  assert.equal(x[9] - x[8], 24);
  assert.match(art.alt, /7 рядом и ещё 1/);
});

test("page 24 printed and handwritten eights match the trace target", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const print = vectorAssets.p024_digit_8_print;
  const sample = vectorAssets.p024_digit_8_sample;
  assert.ok(print && sample);
  assert.equal(
    print.xml,
    readFileSync("assets/book2/vector/p024_digit_8_print.svg", "utf8"),
  );
  assert.equal(
    sample.xml,
    readFileSync("assets/book2/vector/p024_digit_8_sample.svg", "utf8"),
  );
  assert.deepEqual([print.width, print.height], [52, 77]);
  assert.deepEqual([sample.width, sample.height], [122, 101]);
  assert.match(print.xml, /font-family="Andika_700Bold"[^>]*>8<\/text>/);
  assert.equal(digitSamples["8"].asset, "p024_digit_8_sample");
  assert.match(sample.xml, /id="notebook-grid"/);
  assert.match(
    sample.xml,
    /M55 51 C50 37 63 10 70 26 C78 40 36 56 42 72 C44 88 65 85 63 65 C62 59 58 55 55 51/,
  );
});

test("page 24 two separate squares use eight individual sticks", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p024_sticks_two_squares;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p024_sticks_two_squares.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [159, 73]);
  const sticks = [...art.xml.matchAll(/<line id="stick-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(sticks.length, 8);
  assert.deepEqual(
    sticks.map((stick) => [stick.x1, stick.y1, stick.x2, stick.y2]),
    [
      ["10", "10", "64", "10"],
      ["64", "10", "64", "64"],
      ["64", "64", "10", "64"],
      ["10", "64", "10", "10"],
      ["95", "10", "149", "10"],
      ["149", "10", "149", "64"],
      ["149", "64", "95", "64"],
      ["95", "64", "95", "10"],
    ],
  );
  assert.ok(Number(sticks[4].x1) - Number(sticks[1].x1) >= 30);
});

test("page 25 four dominoes preserve red and green partitions of eight", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [leftCount, rightCount, size] of [
    [4, 4, [187, 85]],
    [5, 3, [190, 85]],
    [6, 2, [190, 85]],
    [7, 1, [190, 85]],
  ] as const) {
    const id = `p025_domino_8_${leftCount}_${rightCount}`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], size);
    const red = [...art.xml.matchAll(/<circle id="left-dot-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    const green = [
      ...art.xml.matchAll(/<circle id="right-dot-\d+"[^>]*\/>/g),
    ].map((match) => attributes(match[0]));
    assert.equal(red.length, leftCount);
    assert.equal(green.length, rightCount);
    assert.ok(red.every((dot) => dot.fill === "#c4695c"));
    assert.ok(green.every((dot) => dot.fill === "#5d863d"));
    assert.ok(Math.max(...red.map((dot) => Number(dot.cx))) < art.width / 2);
    assert.ok(Math.min(...green.map((dot) => Number(dot.cx))) > art.width / 2);
    assert.match(art.xml, /id="card-divider"/);
  }
  const five = vectorAssets.p025_domino_8_5_3.xml;
  const redFive = [...five.matchAll(/<circle id="left-dot-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  const greenThree = [
    ...five.matchAll(/<circle id="right-dot-\d+"[^>]*\/>/g),
  ].map((match) => attributes(match[0]));
  assert.deepEqual(
    redFive.map((dot) => Number(dot.cy)),
    [31, 31, 44, 57, 57],
  );
  assert.ok(Number(greenThree[0].cy) > Number(greenThree[1].cy));
  assert.ok(Number(greenThree[1].cy) > Number(greenThree[2].cy));
});

test("page 26 rail preserves eight adjacent beads and ninth apart", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p026_abacus_9;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p026_abacus_9.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [370, 76]);
  const beads = [...art.xml.matchAll(/<circle id="bead-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(beads.length, 10);
  assert.equal(beads.filter((bead) => bead.fill === "#c8352e").length, 5);
  assert.equal(beads.filter((bead) => bead.fill === "#ffffff").length, 5);
  const x = beads.map((bead) => Number(bead.cx));
  for (let i = 1; i < 8; i++) assert.equal(x[i] - x[i - 1], 24);
  assert.ok(x[8] - x[7] >= 60 && x[9] - x[8] >= 40);
  assert.match(art.alt, /8 рядом и ещё 1/);
});

test("page 26 printed nine and notebook nine retain exact trace", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const print = vectorAssets.p026_digit_9_large;
  const sample = vectorAssets.p026_digit_9_sample;
  assert.ok(print && sample);
  assert.equal(
    print.xml,
    readFileSync("assets/book2/vector/p026_digit_9_large.svg", "utf8"),
  );
  assert.equal(
    sample.xml,
    readFileSync("assets/book2/vector/p026_digit_9_sample.svg", "utf8"),
  );
  assert.deepEqual([print.width, print.height], [80, 80]);
  assert.deepEqual([sample.width, sample.height], [123, 95]);
  assert.match(print.xml, /font-family="Andika_700Bold"[^>]*>9<\/text>/);
  assert.equal(digitSamples["9"].asset, "p026_digit_9_sample");
  assert.match(sample.xml, /id="notebook-grid"/);
  assert.match(
    sample.xml,
    /M71 27 C67 8 48 28 47 46 C44 66 65 59 71 32 C66 50 62 68 52 76 C42 84 36 72 44 70 C49 70 44 76 43 73/,
  );
});

test("page 26 framed dots stay five above four", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p026_dots_frame_9;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p026_dots_frame_9.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [150, 70]);
  const dots = [...art.xml.matchAll(/<circle id="frame-dot-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(dots.length, 9);
  assert.equal(new Set(dots.slice(0, 5).map((dot) => dot.cy)).size, 1);
  assert.equal(new Set(dots.slice(5).map((dot) => dot.cy)).size, 1);
  assert.ok(Number(dots[0].cy) < Number(dots[5].cy));
  assert.ok(dots.every((dot) => dot.fill === "#2b4ba8"));
});

test("page 26 has three distinct bundles of three red flags", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p026_flags_9;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p026_flags_9.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [360, 164]);
  const flags = [...art.xml.matchAll(/<path id="flag-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  const poles = [...art.xml.matchAll(/<line id="flag-pole-\d+"[^>]*\/>/g)];
  assert.equal(flags.length, 9);
  assert.equal(poles.length, 9);
  assert.deepEqual(
    flags.map((flag) => flag["data-group"]),
    ["0", "0", "0", "1", "1", "1", "2", "2", "2"],
  );
  assert.ok(flags.every((flag) => flag.fill === "#c4695c"));
});

test("page 26 number row leaves precisely 3, 7, 9 blank", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p026_number_row_missing;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p026_number_row_missing.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [750, 100]);
  assert.equal(
    [...art.xml.matchAll(/<rect id="number-card-\d+"[^>]*\/>/g)].length,
    9,
  );
  const labels = [
    ...art.xml.matchAll(/<text id="number-label-(\d+)"[^>]*>([^<]+)<\/text>/g),
  ].map((match) => [Number(match[1]), match[2]]);
  assert.deepEqual(labels, [
    [0, "1"],
    [1, "2"],
    [3, "4"],
    [4, "5"],
    [5, "6"],
    [7, "8"],
  ]);
  assert.match(pages[25].blocks[5].prompt, /1, 2, □, 4, 5, 6, □, 8, □/);
});

test("page 26 three unshared triangles use nine sticks", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p026_sticks_triangles;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p026_sticks_triangles.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [225, 77]);
  const sticks = [...art.xml.matchAll(/<line id="stick-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(sticks.length, 9);
  const groups = [sticks.slice(0, 3), sticks.slice(3, 6), sticks.slice(6, 9)];
  for (const group of groups) {
    assert.equal(group[0].x2, group[1].x1);
    assert.equal(group[0].y2, group[1].y1);
    assert.equal(group[1].x2, group[2].x1);
    assert.equal(group[1].y2, group[2].y1);
    assert.equal(group[2].x2, group[0].x1);
    assert.equal(group[2].y2, group[0].y1);
  }
  assert.ok(Number(groups[1][0].x1) - Number(groups[0][1].x2) >= 15);
  assert.ok(Number(groups[2][0].x1) - Number(groups[1][1].x2) >= 15);
});

test("page 27 four dominoes keep the red-green splits of nine", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [redCount, greenCount, size] of [
    [5, 4, [188, 73]],
    [6, 3, [184, 73]],
    [7, 2, [184, 73]],
    [8, 1, [184, 73]],
  ] as const) {
    const id = `p027_domino_9_${redCount}_${greenCount}`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], size);
    const red = [...art.xml.matchAll(/<circle id="left-dot-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    const green = [
      ...art.xml.matchAll(/<circle id="right-dot-\d+"[^>]*\/>/g),
    ].map((match) => attributes(match[0]));
    assert.equal(red.length, redCount);
    assert.equal(green.length, greenCount);
    assert.ok(red.every((dot) => dot.fill === "#c4695c"));
    assert.ok(green.every((dot) => dot.fill === "#5d863d"));
    assert.ok(Math.max(...red.map((dot) => Number(dot.cx))) < art.width / 2);
    assert.ok(Math.min(...green.map((dot) => Number(dot.cx))) > art.width / 2);
    assert.match(art.xml, /id="card-divider"/);
  }
  const fiveFour = vectorAssets.p027_domino_9_5_4.xml;
  const red = [...fiveFour.matchAll(/<circle id="left-dot-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.deepEqual(
    red.map((dot) => Number(dot.cy)),
    [22, 22, 37, 52, 52],
  );
  const eightOne = vectorAssets.p027_domino_9_8_1.xml;
  const green = [
    ...eightOne.matchAll(/<circle id="right-dot-\d+"[^>]*\/>/g),
  ].map((match) => attributes(match[0]));
  assert.equal(green[0].cy, "37");
});

test("page 28 rail keeps nine adjacent beads and tenth apart", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p028_abacus_10;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p028_abacus_10.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [384, 80]);
  const beads = [...art.xml.matchAll(/<circle id="bead-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(beads.length, 10);
  assert.equal(beads.filter((bead) => bead.fill === "#c8352e").length, 5);
  assert.equal(beads.filter((bead) => bead.fill === "#ffffff").length, 5);
  const x = beads.map((bead) => Number(bead.cx));
  for (let i = 1; i < 9; i++) assert.equal(x[i] - x[i - 1], 24);
  assert.ok(x[9] - x[8] >= 60);
  assert.match(art.alt, /9 рядом и ещё 1/);
});

test("page 28 educational coin displays only denomination 10", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p028_coin_10_kopeks;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p028_coin_10_kopeks.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [110, 110]);
  assert.match(art.xml, /id="coin-body"/);
  assert.match(art.xml, />10<\/text>/);
  assert.doesNotMatch(art.xml, /коп|руб|1952|СССР|герб|₽/i);
  assert.match(art.alt, /Учебная монета.*10/);
});

test("page 28 print 10 and notebook 10 keep both digits and zero trace", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const print = vectorAssets.p028_digit_10_large;
  const sample = vectorAssets.p028_digit_10_sample;
  assert.ok(print && sample);
  assert.equal(
    print.xml,
    readFileSync("assets/book2/vector/p028_digit_10_large.svg", "utf8"),
  );
  assert.equal(
    sample.xml,
    readFileSync("assets/book2/vector/p028_digit_10_sample.svg", "utf8"),
  );
  assert.deepEqual([print.width, print.height], [98, 84]);
  assert.deepEqual([sample.width, sample.height], [126, 90]);
  assert.match(print.xml, /font-family="Andika_700Bold"[^>]*>10<\/text>/);
  assert.equal(digitSamples["0"].asset, "p028_digit_10_sample");
  assert.match(sample.xml, /id="notebook-grid"/);
  assert.match(sample.xml, /id="sample-one"/);
  assert.match(
    sample.xml,
    /id="sample-zero"[^>]*d="M96 20 C118 14 90 94 75 75 C61 62 83 18 96 20"/,
  );
});

test("page 28 framed dots keep two full rows of five", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p028_dots_frame_10;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p028_dots_frame_10.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [150, 80]);
  const dots = [...art.xml.matchAll(/<circle id="frame-dot-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(dots.length, 10);
  assert.deepEqual(
    dots.slice(0, 5).map((dot) => dot.cx),
    dots.slice(5).map((dot) => dot.cx),
  );
  assert.equal(new Set(dots.slice(0, 5).map((dot) => dot.cy)).size, 1);
  assert.equal(new Set(dots.slice(5).map((dot) => dot.cy)).size, 1);
  assert.ok(Number(dots[0].cy) < Number(dots[5].cy));
});

test("page 28 ten number cards leave 3, 5, 7, 9 blank", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p028_number_row_missing;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p028_number_row_missing.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [770, 100]);
  assert.equal(
    [...art.xml.matchAll(/<rect id="number-card-\d+"[^>]*\/>/g)].length,
    10,
  );
  const labels = [
    ...art.xml.matchAll(/<text id="number-label-(\d+)"[^>]*>([^<]+)<\/text>/g),
  ].map((match) => [Number(match[1]), match[2]]);
  assert.deepEqual(labels, [
    [0, "1"],
    [1, "2"],
    [3, "4"],
    [5, "6"],
    [7, "8"],
    [9, "10"],
  ]);
  assert.match(pages[27].blocks[5].prompt, /1, 2, □, 4, □, 6, □, 8, □, 10/);
});

test("page 28 star outline closes with exactly ten sticks", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p028_sticks_star;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p028_sticks_star.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [105, 107]);
  const sticks = [...art.xml.matchAll(/<line id="stick-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(sticks.length, 10);
  for (let i = 0; i < 10; i++) {
    const next = sticks[(i + 1) % 10];
    assert.equal(sticks[i].x2, next.x1);
    assert.equal(sticks[i].y2, next.y1);
  }
  const ys = sticks.map((stick) => Number(stick.y1));
  assert.equal(Math.min(...ys), 10);
  assert.equal(ys.filter((y) => y >= 90).length, 2);
});

test("page 29 each ten-cell bar keeps its blue and yellow partition", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const blueCount of [5, 6, 7, 8, 9]) {
    const yellowCount = 10 - blueCount;
    const id = `p029_bar_10_${blueCount}_${yellowCount}`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], [518, blueCount === 9 ? 63 : 64]);
    const cells = [...art.xml.matchAll(/<rect id="bar-cell-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    assert.equal(cells.length, 10);
    assert.deepEqual(
      cells.map((cell) => cell.fill),
      [
        ...Array(blueCount).fill("#7baab7"),
        ...Array(yellowCount).fill("#e4bd72"),
      ],
    );
    assert.deepEqual(
      cells.map((cell) => Number(cell.x)),
      Array.from({ length: 10 }, (_, i) => 32 + i * 45),
    );
    assert.match(
      art.xml,
      new RegExp(`id="bar-label-left"[^>]*>${blueCount}<\\/text>`),
    );
    assert.match(
      art.xml,
      new RegExp(`id="bar-label-right"[^>]*>${yellowCount}<\\/text>`),
    );
  }
});

test("page 29 composite bar has five distinct rows of ten", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p029_bars_10_all;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p029_bars_10_all.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [518, 430]);
  const cells = [
    ...art.xml.matchAll(/<rect id="bar-row-(\d+)-cell-(\d+)"[^>]*\/>/g),
  ].map((match) => {
    const cell = attributes(match[0]);
    return {
      row: Number(match[1]),
      column: Number(match[2]),
      fill: cell.fill,
      y: cell.y,
    };
  });
  assert.equal(cells.length, 50);
  for (let row = 0; row < 5; row++) {
    const line = cells.filter((cell) => cell.row === row);
    assert.deepEqual(
      line.map((cell) => cell.column),
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    );
    assert.equal(
      line.filter((cell) => cell.fill === "#7baab7").length,
      9 - row,
    );
    assert.equal(
      line.filter((cell) => cell.fill === "#e4bd72").length,
      row + 1,
    );
    assert.ok(line.every((cell) => Number(cell.y) === 13 + row * 90));
  }
  const labels = [
    ...art.xml.matchAll(
      /<text id="bar-row-(\d+)-label-(left|right)"[^>]*>([^<]+)<\/text>/g,
    ),
  ].map((match) => [Number(match[1]), match[2], match[3]]);
  assert.deepEqual(labels, [
    [0, "left", "9"],
    [0, "right", "1"],
    [1, "left", "8"],
    [1, "right", "2"],
    [2, "left", "7"],
    [2, "right", "3"],
    [3, "left", "6"],
    [3, "right", "4"],
    [4, "left", "5"],
    [4, "right", "5"],
  ]);
});

test("page 29 squares preserve two matching 2+1+2 groups", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p029_squares_green_red;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p029_squares_green_red.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [222, 100]);
  const squares = [...art.xml.matchAll(/<rect id="square-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(squares.length, 10);
  assert.deepEqual(
    squares.map((square) => square.fill),
    [...Array(5).fill("#5d863d"), ...Array(5).fill("#c4695c")],
  );
  const green = squares
    .slice(0, 5)
    .map((square) => [Number(square.x), Number(square.y)]);
  const red = squares
    .slice(5)
    .map((square) => [Number(square.x), Number(square.y)]);
  assert.deepEqual(green, [
    [14, 11],
    [70, 11],
    [42, 40],
    [14, 69],
    [70, 69],
  ]);
  assert.deepEqual(
    red,
    green.map(([x, y]) => [x + 118, y]),
  );
});

test("page 30 shows ten identical fir trees at equal spacing", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p030_fir_trees_10;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p030_fir_trees_10.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [782, 115]);
  const trees = [
    ...art.xml.matchAll(
      /<g id="fir-(\d+)" transform="translate\((\d+) 0\)">([\s\S]*?)<\/g>/g,
    ),
  ];
  assert.equal(trees.length, 10);
  assert.deepEqual(
    trees.map((tree) => Number(tree[1])),
    Array.from({ length: 10 }, (_, i) => i),
  );
  assert.deepEqual(
    trees.map((tree) => Number(tree[2])),
    Array.from({ length: 10 }, (_, i) => 41 + i * 78),
  );
  assert.equal(new Set(trees.map((tree) => tree[3])).size, 1);
  assert.ok(
    trees.every(
      (tree) =>
        tree[3].includes('fill="#5d863d"') &&
        tree[3].includes('fill="#a78665"'),
    ),
  );
});

test("page 31 dominoes add exactly two outlined circles after a divider", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [base, width] of [
    [2, 174],
    [4, 174],
    [6, 176],
    [8, 176],
  ] as const) {
    const id = `p031_domino_${base}_2`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], [width, 80]);
    const initial = [
      ...art.xml.matchAll(/<circle id="base-dot-\d+"[^>]*\/>/g),
    ].map((match) => attributes(match[0]));
    const added = [
      ...art.xml.matchAll(/<circle id="added-dot-\d+"[^>]*\/>/g),
    ].map((match) => attributes(match[0]));
    assert.equal(initial.length, base);
    assert.equal(added.length, 2);
    assert.ok(
      [...initial, ...added].every(
        (dot) => dot.fill === "none" && dot.stroke === "#2b4ba8",
      ),
    );
    const dividerTag = art.xml.match(/<line id="card-divider"[^>]*\/>/)?.[0];
    assert.ok(dividerTag);
    const dividerX = Number(attributes(dividerTag).x1);
    assert.ok(Math.max(...initial.map((dot) => Number(dot.cx))) < dividerX);
    assert.ok(Math.min(...added.map((dot) => Number(dot.cx))) > dividerX);
    assert.equal(added[0].cx, added[1].cx);
    assert.deepEqual(
      added.map((dot) => Number(dot.cy)),
      [28, 55],
    );
    assert.match(art.alt, new RegExp(`${base}.*2`));
  }
});

test("page 32 subtraction crosses both circles in the final column", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const count of [4, 6, 8, 10]) {
    const id = `p032_circles_${count}_minus_2`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], [175, 82]);
    const dots = [...art.xml.matchAll(/<circle id="circle-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    const slashes = [...art.xml.matchAll(/<line id="cross-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    assert.equal(dots.length, count);
    assert.equal(slashes.length, 2);
    assert.ok(
      dots.every((dot) => dot.fill === "none" && dot.stroke === "#2b4ba8"),
    );
    assert.ok(slashes.every((slash) => slash.stroke === "#c8352e"));
    const columns = [...new Set(dots.map((dot) => Number(dot.cx)))];
    assert.equal(columns.length, count / 2);
    for (const x of columns) {
      assert.deepEqual(
        dots.filter((dot) => Number(dot.cx) === x).map((dot) => Number(dot.cy)),
        [29, 56],
      );
    }
    const lastX = Math.max(...columns);
    assert.ok(
      slashes.every(
        (slash) => (Number(slash.x1) + Number(slash.x2)) / 2 === lastX,
      ),
    );
    assert.deepEqual(
      slashes.map((slash) => (Number(slash.y1) + Number(slash.y2)) / 2),
      [29, 56],
    );
    assert.match(art.alt, new RegExp(`${count}.*2.*${count - 2}`));
  }
});

test("page 33 diagonal separates the original odd group from two added circles", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const base of [1, 3, 5, 7]) {
    const id = `p033_domino_${base}_plus_2`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], [177, 81]);
    const initial = [
      ...art.xml.matchAll(/<circle id="base-dot-\d+"[^>]*\/>/g),
    ].map((match) => attributes(match[0]));
    const added = [
      ...art.xml.matchAll(/<circle id="added-dot-\d+"[^>]*\/>/g),
    ].map((match) => attributes(match[0]));
    assert.equal(initial.length, base);
    assert.equal(added.length, 2);
    assert.ok(
      [...initial, ...added].every(
        (dot) => dot.fill === "none" && dot.stroke === "#2b4ba8",
      ),
    );
    const separator = art.xml.match(/<line id="group-divider"[^>]*\/>/)?.[0];
    assert.ok(separator);
    const line = attributes(separator);
    assert.ok(Number(line.x1) < Number(line.x2));
    assert.ok(Number(line.y1) > Number(line.y2));
    assert.equal(line.stroke, "#6b7280");
    assert.equal([...art.xml.matchAll(/<line id="cross-\d+"/g)].length, 0);
    const xAt = (y: number) =>
      Number(line.x1) +
      (Number(line.x2) - Number(line.x1)) *
        ((y - Number(line.y1)) / (Number(line.y2) - Number(line.y1)));
    assert.ok(initial.every((dot) => Number(dot.cx) < xAt(Number(dot.cy))));
    assert.ok(added.every((dot) => Number(dot.cx) > xAt(Number(dot.cy))));
    const x1 = Number(line.x1),
      y1 = Number(line.y1);
    const x2 = Number(line.x2),
      y2 = Number(line.y2);
    const lineLength = Math.hypot(x2 - x1, y2 - y1);
    for (const dot of [...initial, ...added]) {
      const x = Number(dot.cx),
        y = Number(dot.cy);
      const distance =
        Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / lineLength;
      assert.ok(distance >= 9.4, `${id}: diagonal touches a circle`);
      assert.equal(dot.r, "7");
    }
    assert.match(art.alt, new RegExp(`${base}.*2.*${base + 2}`));
  }
});

test("page 34 odd subtraction crosses the last circle of each row", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const count of [3, 5, 7, 9]) {
    const id = `p034_circles_${count}_minus_2`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], [177, 79]);
    const dots = [...art.xml.matchAll(/<circle id="circle-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    const slashes = [...art.xml.matchAll(/<line id="cross-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    assert.equal(dots.length, count);
    assert.equal(slashes.length, 2);
    assert.ok(
      dots.every((dot) => dot.fill === "none" && dot.stroke === "#2b4ba8"),
    );
    assert.ok(slashes.every((slash) => slash.stroke === "#c8352e"));
    const top = dots.filter((dot) => dot.cy === "29");
    const bottom = dots.filter((dot) => dot.cy === "56");
    assert.equal(top.length, (count + 1) / 2);
    assert.equal(bottom.length, (count - 1) / 2);
    const slashCenters = slashes.map((slash) => [
      (Number(slash.x1) + Number(slash.x2)) / 2,
      (Number(slash.y1) + Number(slash.y2)) / 2,
    ]);
    assert.deepEqual(slashCenters, [
      [Math.max(...top.map((dot) => Number(dot.cx))), 29],
      [Math.max(...bottom.map((dot) => Number(dot.cx))), 56],
    ]);
    assert.ok(slashCenters[0][0] > slashCenters[1][0]);
    assert.match(art.alt, new RegExp(`${count}.*2.*${count - 2}`));
  }
});

test("pages 35–36 addition cards preserve seven distinct plus-three groups", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const base of [1, 2, 3, 4, 5, 6, 7]) {
    const page = base <= 4 ? "p035" : "p036";
    const id = `${page}_domino_${base}_plus_3`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    const expectedSize =
      base === 1 ? [172, 81] : base <= 4 ? [176, 83] : [175, 83];
    assert.deepEqual([art.width, art.height], expectedSize);
    const initial = [
      ...art.xml.matchAll(/<circle id="base-dot-\d+"[^>]*\/>/g),
    ].map((match) => attributes(match[0]));
    const added = [
      ...art.xml.matchAll(/<circle id="added-dot-\d+"[^>]*\/>/g),
    ].map((match) => attributes(match[0]));
    assert.equal(initial.length, base);
    assert.equal(added.length, 3);
    assert.ok(
      [...initial, ...added].every(
        (dot) => dot.fill === "none" && dot.stroke === "#2b4ba8",
      ),
    );
    assert.equal([...art.xml.matchAll(/<line id="cross-\d+"/g)].length, 0);
    const separator = art.xml.match(/<line id="group-divider"[^>]*\/>/)?.[0];
    assert.ok(separator);
    const line = attributes(separator);
    assert.equal(line.stroke, "#6b7280");
    const x1 = Number(line.x1),
      y1 = Number(line.y1);
    const x2 = Number(line.x2),
      y2 = Number(line.y2);
    if (base % 2 === 0) {
      assert.equal(x1, x2);
      assert.ok(initial.every((dot) => Number(dot.cx) < x1));
      assert.ok(added.every((dot) => Number(dot.cx) > x1));
    } else {
      assert.ok(x1 < x2 && y1 > y2);
      const xAt = (y: number) => x1 + (x2 - x1) * ((y - y1) / (y2 - y1));
      assert.ok(initial.every((dot) => Number(dot.cx) < xAt(Number(dot.cy))));
      assert.ok(added.every((dot) => Number(dot.cx) > xAt(Number(dot.cy))));
      for (const dot of [...initial, ...added]) {
        const x = Number(dot.cx),
          y = Number(dot.cy);
        const distance =
          Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) /
          Math.hypot(x2 - x1, y2 - y1);
        assert.ok(distance >= 9.4, `${id}: divider touches a circle`);
      }
    }
    assert.match(art.alt, new RegExp(`${base}.*3.*${base + 3}`));
  }
});

test("page 36 educational coins contain only the denominations 2 and 3", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [value, size] of [
    [2, [127, 124]],
    [3, [152, 150]],
  ] as const) {
    const id = `p036_coin_${value}_kopeks`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], size);
    assert.match(art.xml, /id="coin-body"/);
    assert.match(art.xml, new RegExp(`>${value}<\\/text>`));
    assert.doesNotMatch(art.xml, /коп|руб|19\d\d|СССР|герб|₽/i);
    assert.match(art.alt, new RegExp(`Учебная монета.*${value}`));
  }
});

test("page 36 drawing samples keep two maple and three birch leaves", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, count, size, kind] of [
    ["p036_two_maple_leaves", 2, [177, 121], "maple"],
    ["p036_three_birch_leaves", 3, [193, 124], "birch"],
  ] as const) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], size);
    const outlines = [
      ...art.xml.matchAll(
        new RegExp(`<path id="${kind}-leaf-\\d+"[^>]*\\/>`, "g"),
      ),
    ].map((match) => attributes(match[0]));
    assert.equal(outlines.length, count);
    assert.ok(
      outlines.every(
        (outline) => outline.fill === "#f1efe9" && outline.stroke === "#486537",
      ),
    );
    assert.equal(
      [...art.xml.matchAll(/<line id="leaf-stem-\d+"[^>]*\/>/g)].length,
      count,
    );
  }
});

test("page 34 five buttons remain a single row of five matte buttons", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p034_five_buttons;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p034_five_buttons.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [273, 60]);
  const buttons = [...art.xml.matchAll(/<circle id="button-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  const holes = [...art.xml.matchAll(/<circle id="hole-\d+-\d+"[^>]*\/>/g)].map(
    (match) => attributes(match[0]),
  );
  assert.equal(buttons.length, 5);
  assert.equal(holes.length, 20);
  assert.deepEqual(
    buttons.map((button) => Number(button.cx)),
    [27, 81, 135, 189, 243],
  );
  assert.ok(buttons.every((button) => button.cy === "30" && button.r === "20"));
  assert.ok(
    buttons.every(
      (button) => button.fill.startsWith("#") && button.fill !== "#000000",
    ),
  );
  assert.match(art.alt, /Пять.*пуговиц/);
});

test("page 38 subtraction of three crosses the source's final three circles", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const widths: Record<number, number> = {
    4: 182,
    5: 175,
    6: 177,
    7: 177,
    8: 175,
    9: 177,
    10: 180,
  };
  for (const count of [4, 5, 6, 7, 8, 9, 10]) {
    const id = `p038_circles_${count}_minus_3`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual(
      [art.width, art.height],
      [widths[count], count === 4 ? 92 : 85],
    );
    const dots = [...art.xml.matchAll(/<circle id="circle-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    const slashes = [...art.xml.matchAll(/<line id="cross-\d+"[^>]*\/>/g)].map(
      (match) => attributes(match[0]),
    );
    assert.equal(dots.length, count);
    assert.equal(slashes.length, 3);
    assert.ok(
      dots.every((dot) => dot.fill === "none" && dot.stroke === "#2b4ba8"),
    );
    assert.ok(slashes.every((slash) => slash.stroke === "#c8352e"));
    const topY = count === 4 ? 32 : 30;
    const bottomY = count === 4 ? 63 : 59;
    const top = dots.filter((dot) => Number(dot.cy) === topY);
    const bottom = dots.filter((dot) => Number(dot.cy) === bottomY);
    assert.equal(top.length, Math.ceil(count / 2));
    assert.equal(bottom.length, Math.floor(count / 2));
    const centers = slashes.map((slash) => [
      (Number(slash.x1) + Number(slash.x2)) / 2,
      (Number(slash.y1) + Number(slash.y2)) / 2,
    ]);
    const topX = top.map((dot) => Number(dot.cx));
    const bottomX = bottom.map((dot) => Number(dot.cx));
    const expected =
      count % 2 === 0
        ? [
            [topX.at(-1), topY],
            [bottomX.at(-2), bottomY],
            [bottomX.at(-1), bottomY],
          ]
        : [
            [topX.at(-2), topY],
            [topX.at(-1), topY],
            [bottomX.at(-1), bottomY],
          ];
    assert.deepEqual(centers, expected, id);
    assert.match(art.alt, new RegExp(`${count}.*3.*${count - 3}`));
  }
});

test("page 40 dominoes retain filled source patterns and four right dots", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const initial: Record<number, number[][]> = {
    1: [[51, 55]],
    2: [
      [80, 34],
      [33, 79],
    ],
    3: [
      [76, 34],
      [51, 55],
      [28, 79],
    ],
    4: [
      [33, 34],
      [79, 34],
      [33, 79],
      [79, 79],
    ],
    5: [
      [33, 34],
      [79, 34],
      [55, 55],
      [33, 79],
      [79, 79],
    ],
    6: [
      [32, 34],
      [55, 34],
      [79, 34],
      [32, 79],
      [55, 79],
      [79, 79],
    ],
  };
  for (const base of [1, 2, 3, 4, 5, 6]) {
    const id = `p040_domino_${base}_plus_4`;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], [195, 110]);
    const left = [
      ...art.xml.matchAll(/<circle id="base-dot-\d+"[^>]*\/>/g),
    ].map((match) => attributes(match[0]));
    const right = [
      ...art.xml.matchAll(/<circle id="added-dot-\d+"[^>]*\/>/g),
    ].map((match) => attributes(match[0]));
    assert.equal(left.length, base);
    assert.equal(right.length, 4);
    assert.deepEqual(
      left.map((dot) => [Number(dot.cx), Number(dot.cy)]),
      initial[base],
    );
    assert.deepEqual(
      right.map((dot) => [Number(dot.cx), Number(dot.cy)]),
      [
        [112, 34],
        [160, 34],
        [112, 79],
        [160, 79],
      ],
    );
    assert.ok([...left, ...right].every((dot) => dot.fill === "#2b4ba8"));
    const separator = art.xml.match(/<line id="card-divider"[^>]*\/>/)?.[0];
    assert.ok(separator);
    assert.equal(attributes(separator).x1, "97");
    assert.match(art.alt, new RegExp(`${base}.*4.*${base + 4}`));
  }
});

test("pages 41–42 subtract four filled dots at the scanned positions", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const layouts: Record<
    string,
    { size: number[]; remaining: number[][]; crossed: number[][] }
  > = {
    p041_circles_6_minus_4: {
      size: [175, 95],
      remaining: [
        [69, 24],
        [26, 69],
      ],
      crossed: [
        [104, 24],
        [149, 24],
        [103, 69],
        [149, 69],
      ],
    },
    p041_circles_8_minus_4: {
      size: [177, 95],
      remaining: [
        [27, 24],
        [72, 24],
        [27, 69],
        [72, 69],
      ],
      crossed: [
        [106, 24],
        [151, 24],
        [106, 69],
        [151, 69],
      ],
    },
    p041_circles_10_minus_4: {
      size: [180, 95],
      remaining: [
        [26, 24],
        [51, 24],
        [77, 24],
        [26, 69],
        [51, 69],
        [77, 69],
      ],
      crossed: [
        [109, 24],
        [153, 24],
        [109, 69],
        [153, 69],
      ],
    },
    p042_circles_5_minus_4: {
      size: [180, 95],
      remaining: [[50, 47]],
      crossed: [
        [104, 25],
        [153, 25],
        [104, 69],
        [153, 69],
      ],
    },
    p042_circles_7_minus_4: {
      size: [180, 95],
      remaining: [
        [72, 25],
        [49, 47],
        [27, 69],
      ],
      crossed: [
        [104, 25],
        [153, 25],
        [104, 69],
        [153, 69],
      ],
    },
    p042_circles_9_minus_4: {
      size: [178, 95],
      remaining: [
        [28, 25],
        [76, 25],
        [52, 47],
        [28, 69],
        [76, 69],
      ],
      crossed: [
        [110, 25],
        [154, 25],
        [110, 69],
        [154, 69],
      ],
    },
  };
  for (const [id, expected] of Object.entries(layouts)) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
    );
    assert.deepEqual([art.width, art.height], expected.size, id);
    const dots = [...art.xml.matchAll(/<circle id="dot-\d+"[^>]*\/>/g)].map(
      (m) => attributes(m[0]),
    );
    const crosses = [...art.xml.matchAll(/<line id="cross-\d+"[^>]*\/>/g)].map(
      (m) => attributes(m[0]),
    );
    assert.equal(dots.length, expected.remaining.length + 4, id);
    assert.equal(crosses.length, 4, id);
    assert.ok(dots.every((dot) => dot.fill === "#2b4ba8"));
    assert.ok(crosses.every((cross) => cross.stroke === "#c8352e"));
    assert.deepEqual(
      dots.map((dot) => [Number(dot.cx), Number(dot.cy)]),
      [...expected.remaining, ...expected.crossed],
      id,
    );
    assert.deepEqual(
      crosses.map((cross) => [
        (Number(cross.x1) + Number(cross.x2)) / 2,
        (Number(cross.y1) + Number(cross.y2)) / 2,
      ]),
      expected.crossed,
      id,
    );
  }
});

test("page 42 tables show their six original inputs and operation", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const cases = [
    {
      id: "p042_table_plus_4",
      size: [280, 130],
      rows: [
        [4, 2, 6],
        [1, 5, 3],
      ],
      operation: "+4",
    },
    {
      id: "p042_table_minus_4",
      size: [285, 130],
      rows: [
        [6, 10, 8],
        [5, 9, 7],
      ],
      operation: "−4",
    },
  ];
  for (const example of cases) {
    const art = vectorAssets[example.id];
    assert.ok(art, example.id);
    assert.equal(
      art.xml,
      readFileSync("assets/book2/vector/" + example.id + ".svg", "utf8"),
    );
    assert.deepEqual([art.width, art.height], example.size);
    const cells = [
      ...art.xml.matchAll(/<text id="cell-(\d)-(\d)"[^>]*>(\d+)<\/text>/g),
    ];
    assert.deepEqual(
      cells.map((cell) => [Number(cell[1]), Number(cell[2]), Number(cell[3])]),
      example.rows.flatMap((row, r) => row.map((value, c) => [r, c, value])),
    );
    assert.match(
      art.xml,
      new RegExp(
        '<text id="operation"[^>]*>' +
          example.operation.replace("+", "\\+") +
          "<\\/text>",
      ),
    );
  }
});

test("page 43 dominoes preserve each filled pip on its original side", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const left: Record<number, number[][]> = {
    1: [[51, 52]],
    2: [
      [74, 32],
      [30, 75],
    ],
    3: [
      [74, 32],
      [51, 52],
      [30, 75],
    ],
    4: [
      [30, 32],
      [74, 32],
      [30, 75],
      [74, 75],
    ],
    5: [
      [30, 32],
      [74, 32],
      [51, 52],
      [30, 75],
      [74, 75],
    ],
  };
  const right: Record<number, number[][]> = {
    1: [[134, 52]],
    2: [
      [155, 32],
      [112, 75],
    ],
    3: [
      [155, 32],
      [134, 52],
      [112, 75],
    ],
    4: [
      [112, 32],
      [155, 32],
      [112, 75],
      [155, 75],
    ],
    5: [
      [112, 32],
      [155, 32],
      [134, 52],
      [112, 75],
      [155, 75],
    ],
  };
  const pairs = [
    [5, 1],
    [1, 5],
    [5, 2],
    [2, 5],
    [5, 3],
    [3, 5],
    [5, 4],
    [4, 5],
    [5, 5],
  ];
  for (const [a, b] of pairs) {
    const id = "p043_domino_" + a + "_plus_" + b;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
    );
    assert.deepEqual(
      [art.width, art.height],
      [a === 5 && b !== 5 ? 187 : 185, 106],
    );
    for (const [side, expected] of [
      ["left", left[a]],
      ["right", right[b]],
    ] as const) {
      const dots = [
        ...art.xml.matchAll(
          new RegExp('<circle id="' + side + '-dot-\\d+"[^>]*\\/>', "g"),
        ),
      ].map((m) => attributes(m[0]));
      assert.deepEqual(
        dots.map((dot) => [Number(dot.cx), Number(dot.cy)]),
        expected,
        id + ": " + side,
      );
      assert.ok(dots.every((dot) => dot.fill === "#2b4ba8"));
    }
    const separator = art.xml.match(/<line id="card-divider"[^>]*\/>/)?.[0];
    assert.ok(separator);
    assert.equal(attributes(separator).x1, "93");
    assert.match(art.alt, new RegExp(a + ".*" + b + ".*" + (a + b)));
  }
});

test("page 46 cards keep filled six-pip rows and the opposing addend", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const pairs = [
    [6, 1],
    [1, 6],
    [6, 2],
    [2, 6],
    [6, 3],
    [3, 6],
    [6, 4],
    [4, 6],
  ];
  const widths: Record<string, number> = {
    "6_1": 187,
    "1_6": 185,
    "6_2": 182,
    "2_6": 180,
    "6_3": 187,
    "3_6": 185,
    "6_4": 182,
    "4_6": 180,
  };
  const sixLeft = [
    [30, 32],
    [52, 32],
    [74, 32],
    [30, 75],
    [52, 75],
    [74, 75],
  ];
  const sixRight = [
    [112, 32],
    [134, 32],
    [156, 32],
    [112, 75],
    [134, 75],
    [156, 75],
  ];
  const leftSmall: Record<number, number[][]> = {
    1: [[51, 53]],
    2: [
      [74, 32],
      [30, 75],
    ],
    3: [
      [74, 32],
      [51, 53],
      [30, 75],
    ],
    4: [
      [30, 32],
      [74, 32],
      [30, 75],
      [74, 75],
    ],
  };
  const rightSmall: Record<number, number[][]> = {
    1: [[134, 53]],
    2: [
      [156, 32],
      [112, 75],
    ],
    3: [
      [156, 32],
      [134, 53],
      [112, 75],
    ],
    4: [
      [112, 32],
      [156, 32],
      [112, 75],
      [156, 75],
    ],
  };
  for (const [a, b] of pairs) {
    const id = "p046_domino_" + a + "_plus_" + b;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
    );
    assert.deepEqual([art.width, art.height], [widths[a + "_" + b], 108]);
    for (const [side, expected] of [
      ["left", a === 6 ? sixLeft : leftSmall[a]],
      ["right", b === 6 ? sixRight : rightSmall[b]],
    ] as const) {
      const dots = [
        ...art.xml.matchAll(
          new RegExp('<circle id="' + side + '-dot-\\d+"[^>]*\\/>', "g"),
        ),
      ].map((m) => attributes(m[0]));
      assert.deepEqual(
        dots.map((dot) => [Number(dot.cx), Number(dot.cy)]),
        expected,
        id + ": " + side,
      );
      assert.ok(dots.every((dot) => dot.fill === "#2b4ba8"));
    }
    assert.match(art.xml, /<line id="card-divider"/);
  }
});

test("page 49 cards retain outline versus filled addend groups", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const layouts: Record<
    string,
    { width: number; outline: number[][]; filled: number[][] }
  > = {
    p049_domino_7_plus_1: {
      width: 185,
      outline: [
        [55, 27],
        [82, 27],
        [119, 27],
        [149, 27],
        [55, 63],
        [82, 63],
        [119, 63],
      ],
      filled: [[149, 63]],
    },
    p049_domino_1_plus_7: {
      width: 178,
      outline: [[52, 27]],
      filled: [
        [80, 27],
        [116, 27],
        [150, 27],
        [52, 63],
        [80, 63],
        [116, 63],
        [150, 63],
      ],
    },
    p049_domino_7_plus_2: {
      width: 186,
      outline: [
        [58, 27],
        [86, 27],
        [119, 27],
        [28, 63],
        [58, 63],
        [88, 63],
        [119, 63],
      ],
      filled: [
        [151, 27],
        [151, 63],
      ],
    },
    p049_domino_2_plus_7: {
      width: 182,
      outline: [
        [56, 27],
        [27, 63],
      ],
      filled: [
        [84, 27],
        [116, 27],
        [149, 27],
        [56, 63],
        [85, 63],
        [117, 63],
        [149, 63],
      ],
    },
    p049_domino_7_plus_3: {
      width: 182,
      outline: [
        [153, 27],
        [119, 63],
        [153, 63],
      ],
      filled: [
        [28, 27],
        [56, 27],
        [91, 27],
        [119, 27],
        [28, 63],
        [56, 63],
        [91, 63],
      ],
    },
    p049_domino_3_plus_7: {
      width: 182,
      outline: [
        [91, 27],
        [119, 27],
        [153, 27],
        [56, 63],
        [91, 63],
        [119, 63],
        [153, 63],
      ],
      filled: [
        [28, 27],
        [56, 27],
        [28, 63],
      ],
    },
  };
  for (const [id, expected] of Object.entries(layouts)) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
    );
    assert.deepEqual([art.width, art.height], [expected.width, 90]);
    for (const [kind, coordinates, fill] of [
      ["outline", expected.outline, "none"],
      ["filled", expected.filled, "#2b4ba8"],
    ] as const) {
      const dots = [
        ...art.xml.matchAll(
          new RegExp('<circle id="' + kind + '-dot-\\d+"[^>]*\\/>', "g"),
        ),
      ].map((m) => attributes(m[0]));
      assert.deepEqual(
        dots.map((dot) => [Number(dot.cx), Number(dot.cy)]),
        coordinates,
        id + ": " + kind,
      );
      assert.ok(dots.every((dot) => dot.fill === fill));
    }
    assert.doesNotMatch(art.xml, /card-divider/);
  }
});

test("page 50 has one saucer, one cup, and only numeric prices 3 and 7", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const id = "p050_saucer_cup_prices";
  const art = vectorAssets[id];
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [400, 172]);
  assert.match(art.xml, /<path id="saucer"/);
  assert.match(art.xml, /<path id="cup-body"/);
  assert.match(art.xml, /<path id="cup-handle"/);
  assert.deepEqual(
    [
      ...art.xml.matchAll(
        /<text id="price-(saucer|cup)"[^>]*>([^<]+)<\/text>/g,
      ),
    ].map((m) => [m[1], m[2]]),
    [
      ["saucer", "3"],
      ["cup", "7"],
    ],
  );
  assert.doesNotMatch(art.xml, /руб|коп|₽|<text[^>]*>[^37<]/i);
});

test("pages 51–52 keep outlined eights and nines separate from filled addends", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const cases = [
    {
      id: "p051_domino_8_plus_1",
      size: [176, 80],
      outline: 8,
      filled: 1,
      divider: "143",
    },
    {
      id: "p051_domino_1_plus_8",
      size: [176, 80],
      outline: 8,
      filled: 1,
      divider: "36",
    },
    {
      id: "p051_domino_8_plus_2",
      size: [178, 80],
      outline: 8,
      filled: 2,
      divider: "143",
    },
    {
      id: "p051_domino_2_plus_8",
      size: [186, 80],
      outline: 8,
      filled: 2,
      divider: "44",
    },
    {
      id: "p052_domino_9_plus_1",
      size: [186, 86],
      outline: 9,
      filled: 1,
      diagonal: [
        [177, 26],
        [132, 78],
      ],
      filledPosition: [153, 60],
    },
    {
      id: "p052_domino_1_plus_9",
      size: [186, 86],
      outline: 9,
      filled: 1,
      diagonal: [
        [8, 60],
        [60, 8],
      ],
      filledPosition: [25, 27],
    },
  ];
  for (const example of cases) {
    const art = vectorAssets[example.id];
    assert.ok(art, example.id);
    assert.equal(
      art.xml,
      readFileSync("assets/book2/vector/" + example.id + ".svg", "utf8"),
    );
    assert.deepEqual([art.width, art.height], example.size);
    const outlines = [
      ...art.xml.matchAll(/<circle id="outline-dot-\d+"[^>]*\/>/g),
    ].map((m) => attributes(m[0]));
    const filled = [
      ...art.xml.matchAll(/<circle id="filled-dot-\d+"[^>]*\/>/g),
    ].map((m) => attributes(m[0]));
    assert.equal(outlines.length, example.outline);
    assert.equal(filled.length, example.filled);
    assert.ok(
      outlines.every((dot) => dot.fill === "none" && dot.stroke === "#2b4ba8"),
    );
    assert.ok(filled.every((dot) => dot.fill === "#2b4ba8"));
    if (example.divider) {
      const line = art.xml.match(/<line id="card-divider"[^>]*\/>/)?.[0];
      assert.ok(line);
      assert.equal(attributes(line).x1, example.divider);
      assert.deepEqual(
        [...new Set(outlines.map((dot) => dot.cy))],
        ["25", "57"],
      );
      assert.deepEqual(outlines.filter((dot) => dot.cy === "25").length, 4);
      assert.deepEqual(outlines.filter((dot) => dot.cy === "57").length, 4);
    } else {
      const line = art.xml.match(/<line id="card-divider"[^>]*\/>/)?.[0];
      assert.ok(line);
      const attrs = attributes(line);
      assert.deepEqual(
        [
          [Number(attrs.x1), Number(attrs.y1)],
          [Number(attrs.x2), Number(attrs.y2)],
        ],
        example.diagonal,
      );
      assert.deepEqual(
        [Number(filled[0].cx), Number(filled[0].cy)],
        example.filledPosition,
      );
    }
  }
});

test("page 54 metre rule preserves the Russian sentence and italic symbol", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const id = "p054_rule_meter_abbrev";
  const art = vectorAssets[id];
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [780, 94]);
  assert.match(
    art.xml,
    /<text id="rule-line-1"[^>]*>Слово „метр“ сокращённо<\/text>/,
  );
  assert.match(
    art.xml,
    /<text id="rule-line-2"[^>]*>записывают <tspan[^>]*font-style="italic"[^>]*>м<\/tspan><\/text>/,
  );
  assert.match(art.alt, /Слово.*метр.*сокращённо.*записывают м/);
});

test("page 56 exercise 183 keeps four numeric columns and their operations", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const id = "p056_columns_plus4_minus4_plus5_minus5";
  const art = vectorAssets[id];
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [743, 158]);
  assert.match(art.xml, /<text id="exercise-number"[^>]*>183\.<\/text>/);
  const source = [
    { values: [4, 6, 3, 5], operation: "+4" },
    { values: [6, 9, 7, 10], operation: "−4" },
    { values: [3, 5, 2, 4], operation: "+5" },
    { values: [10, 8, 7, 9], operation: "−5" },
  ];
  for (const [column, expected] of source.entries()) {
    const numbers = [
      ...art.xml.matchAll(
        new RegExp(
          '<text id="column-' + column + '-row-(\\d)"[^>]*>(\\d+)<\\/text>',
          "g",
        ),
      ),
    ];
    assert.deepEqual(
      numbers.map((m) => [Number(m[1]), Number(m[2])]),
      expected.values.map((value, row) => [row, value]),
    );
    assert.match(
      art.xml,
      new RegExp(
        '<text id="operation-' +
          column +
          '"[^>]*>' +
          expected.operation.replace("+", "\\+") +
          "<\\/text>",
      ),
    );
  }
});

test("page 57 operation circles retain each center and three outside numbers", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const cases = [
    {
      id: "p057_circle_plus6",
      size: [160, 158],
      operation: "+6",
      outer: [3, 2, 4],
    },
    {
      id: "p057_circle_minus6",
      size: [158, 158],
      operation: "−6",
      outer: [10, 7, 9],
    },
    {
      id: "p057_circle_plus7",
      size: [160, 158],
      operation: "+7",
      outer: [1, 3, 2],
    },
    {
      id: "p057_circle_minus7",
      size: [160, 158],
      operation: "−7",
      outer: [9, 8, 7],
    },
  ];
  for (const example of cases) {
    const art = vectorAssets[example.id];
    assert.ok(art, example.id);
    assert.equal(
      art.xml,
      readFileSync("assets/book2/vector/" + example.id + ".svg", "utf8"),
    );
    assert.deepEqual([art.width, art.height], example.size);
    const ring = art.xml.match(/<circle id="operation-ring"[^>]*\/>/)?.[0];
    assert.ok(ring);
    assert.equal(attributes(ring).fill, "none");
    assert.match(
      art.xml,
      new RegExp(
        '<text id="center-operation"[^>]*>' +
          example.operation.replace("+", "\\+") +
          "<\\/text>",
      ),
    );
    const numbers = [
      ...art.xml.matchAll(
        /<text id="outer-(top|left|right)"[^>]*>(\d+)<\/text>/g,
      ),
    ];
    assert.deepEqual(
      numbers.map((m) => [m[1], Number(m[2])]),
      [
        ["top", example.outer[0]],
        ["left", example.outer[1]],
        ["right", example.outer[2]],
      ],
    );
    assert.match(art.alt, new RegExp(example.operation.replace("+", "\\+")));
  }
});

test("page 59 block models contain ten base cubes and one through ten above", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (let number = 11; number <= 20; number++) {
    const id = "p059_blocks_" + number;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
    );
    assert.deepEqual([art.width, art.height], [247, number === 11 ? 67 : 73]);
    const tens = [...art.xml.matchAll(/<rect id="ten-block-\d+"[^>]*\/>/g)].map(
      (m) => attributes(m[0]),
    );
    const units = [
      ...art.xml.matchAll(/<rect id="unit-block-\d+"[^>]*\/>/g),
    ].map((m) => attributes(m[0]));
    assert.equal(tens.length, 10);
    assert.equal(units.length, number - 10);
    assert.deepEqual(
      tens.map((cell) => Number(cell.x)),
      [8, 31, 54, 77, 100, 123, 146, 169, 192, 215],
    );
    assert.deepEqual(
      units.map((cell) => Number(cell.x)),
      tens.slice(0, number - 10).map((cell) => Number(cell.x)),
    );
    assert.ok(units.every((cell) => Number(cell.y) < Number(tens[0].y)));
    assert.match(art.alt, new RegExp("10.*" + (number - 10) + ".*" + number));
  }
});

test("page 59 stick picture keeps a tied ten and two separate groups of three", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const id = "p059_bundle_ten_six_sticks";
  const art = vectorAssets[id];
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [267, 140]);
  const bundle = [
    ...art.xml.matchAll(/<line id="bundle-stick-\d+"[^>]*\/>/g),
  ].map((m) => attributes(m[0]));
  const loose = [
    ...art.xml.matchAll(/<line id="loose-stick-\d+"[^>]*\/>/g),
  ].map((m) => attributes(m[0]));
  assert.equal(bundle.length, 10);
  assert.equal(loose.length, 6);
  assert.deepEqual(
    loose.map((stick) => Number(stick.x1)),
    [122, 145, 168, 210, 233, 256],
  );
  assert.ok(
    Number(loose[3].x1) - Number(loose[2].x1) >
      Number(loose[1].x1) - Number(loose[0].x1),
  );
  assert.match(art.xml, /id="bundle-tie"/);
  assert.match(art.alt, /10.*6.*16/);
});

test("page 60 columns put one ten beside the correct number of bottom units", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (let number = 11; number <= 20; number++) {
    const id = "p060_columns_" + number;
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
    );
    assert.deepEqual([art.width, art.height], [67, number <= 15 ? 286 : 282]);
    const ten = [...art.xml.matchAll(/<rect id="ten-cell-\d+"[^>]*\/>/g)].map(
      (m) => attributes(m[0]),
    );
    const units = [
      ...art.xml.matchAll(/<rect id="unit-cell-\d+"[^>]*\/>/g),
    ].map((m) => attributes(m[0]));
    assert.equal(ten.length, 10);
    assert.equal(units.length, number - 10);
    assert.deepEqual(
      units.map((cell) => Number(cell.y)),
      ten.slice(10 - units.length).map((cell) => Number(cell.y)),
    );
    assert.match(
      art.xml,
      new RegExp('<text id="column-number"[^>]*>' + number + "<\\/text>"),
    );
  }
});

test("page 60 place-value table keeps its two headings and answer area blank", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const id = "p060_table_tens_units";
  const art = vectorAssets[id];
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [348, 119]);
  assert.match(art.xml, /<text id="heading-tens"[^>]*>Десятки\.<\/text>/);
  assert.match(art.xml, /<text id="heading-units"[^>]*>Единицы\.<\/text>/);
  assert.equal([...art.xml.matchAll(/<text\b/g)].length, 2);
  assert.match(art.xml, /id="table-divider"/);
});

test("page 61 number strip leaves exactly 12, 14, 16, 17, and 19 blank", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const id = "p061_strip_11_20_gaps";
  const art = vectorAssets[id];
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [730, 82]);
  const cells = [...art.xml.matchAll(/<rect id="number-cell-\d+"[^>]*\/>/g)];
  const visible = [
    ...art.xml.matchAll(/<text id="visible-number-(\d+)"[^>]*>(\d+)<\/text>/g),
  ];
  assert.equal(cells.length, 10);
  assert.deepEqual(
    visible.map((m) => [Number(m[1]), Number(m[2])]),
    [
      [0, 11],
      [2, 13],
      [4, 15],
      [7, 18],
      [9, 20],
    ],
  );
  assert.equal(art.xml.match(/<text\b/g)?.length, 5);
});

test("page 62 educational coins show only the numbers ten and two", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, value] of [
    ["p062_coin_10_kopeks", "10"],
    ["p062_coin_2_kopeks", "2"],
  ]) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync("assets/book2/vector/" + id + ".svg", "utf8"),
    );
    assert.deepEqual([art.width, art.height], [127, 135]);
    assert.match(art.xml, /id="coin-body"/);
    const texts = [...art.xml.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)];
    assert.deepEqual(
      texts.map((m) => m[1]),
      [value],
    );
    assert.doesNotMatch(art.xml, /коп|руб|₽|герб|СССР/i);
  }
});

test("pages 3 and 4 writing strips alternate twelve dashes with eleven red dots", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, size] of [
    ["p003_writing_strip_dashes_dots", [770, 95]],
    ["p004_dashes_dots_line", [730, 55]],
  ] as const) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.deepEqual([art.width, art.height], size);
    const dashes = [...art.xml.matchAll(/<path id="dash-(\d+)"[^>]*\/>/g)].map(
      (m) => attributes(m[0]),
    );
    const dots = [
      ...art.xml.matchAll(/<circle id="red-dot-(\d+)"[^>]*\/>/g),
    ].map((m) => attributes(m[0]));
    assert.equal(dashes.length, 12);
    assert.equal(dots.length, 11);
    assert.deepEqual(
      dashes.map((dash) => Number(dash.id.split("-")[1])),
      Array.from({ length: 12 }, (_, i) => i),
    );
    assert.deepEqual(
      dots.map((dot) => Number(dot.id.split("-")[2])),
      Array.from({ length: 11 }, (_, i) => i),
    );
    assert.ok(dots.every((dot) => dot.fill === "#c8352e"));
    assert.ok(
      dots.every(
        (dot, i) =>
          Number(dashes[i].d.match(/^M([\d.]+)/)?.[1]) < Number(dot.cx) &&
          Number(dot.cx) < Number(dashes[i + 1].d.match(/^M([\d.]+)/)?.[1]),
      ),
    );
  }
});

test("page 4 copy samples keep five plain squares, five diagonals, and trees of 4, 3, 2 tiers", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const squares = vectorAssets.p004_squares_row_sample;
  assert.ok(squares);
  assert.equal(
    squares.xml,
    readFileSync("assets/book2/vector/p004_squares_row_sample.svg", "utf8"),
  );
  assert.deepEqual([squares.width, squares.height], [670, 75]);
  const boxes = [...squares.xml.matchAll(/<rect id="square-(\d+)"[^>]*\/>/g)];
  const diagonals = [
    ...squares.xml.matchAll(/<path id="diagonal-(\d+)"[^>]*\/>/g),
  ];
  assert.equal(boxes.length, 10);
  assert.deepEqual(
    diagonals.map((m) => Number(m[1])),
    [5, 6, 7, 8, 9],
  );
  const boxX = boxes.map((m) => Number(attributes(m[0]).x));
  assert.ok(boxX.every((x, i) => i === 0 || x > boxX[i - 1]));

  const trees = vectorAssets.p004_fir_trees_sample;
  assert.ok(trees);
  assert.equal(
    trees.xml,
    readFileSync("assets/book2/vector/p004_fir_trees_sample.svg", "utf8"),
  );
  assert.deepEqual([trees.width, trees.height], [600, 185]);
  const branches = [
    ...trees.xml.matchAll(/<path id="tree-(\d+)-tier-(\d+)"[^>]*\/>/g),
  ];
  assert.deepEqual(
    [0, 1, 2].map(
      (tree) => branches.filter((m) => Number(m[1]) === tree).length,
    ),
    [4, 3, 2],
  );
  assert.equal([...trees.xml.matchAll(/<path id="tree-\d+-trunk"/g)].length, 3);
});

test("page 53 addition table shows all forty-five sums in stepped columns", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p053_addition_table;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p053_addition_table.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [683, 683]);
  assert.match(
    art.xml,
    /<text id="table-title"[^>]*>Таблица сложения\.<\/text>/,
  );
  const sums = [
    ...art.xml.matchAll(
      /<text id="sum-(\d+)-(\d+)"[^>]*>(\d+)\+(\d+)=(?: )?(\d+)<\/text>/g,
    ),
  ];
  assert.equal(sums.length, 45);
  for (let addend = 1; addend <= 9; addend++) {
    const column = sums.filter((m) => Number(m[1]) === addend);
    assert.equal(column.length, 10 - addend);
    for (const match of column) {
      const first = Number(match[2]);
      assert.equal(Number(match[3]), first);
      assert.equal(Number(match[4]), addend);
      assert.equal(Number(match[5]), first + addend);
    }
  }
  for (const start of [1, 4, 7]) {
    const ys = [start, start + 1, start + 2].map((addend) =>
      Number(
        attributes(
          sums.find((m) => Number(m[1]) === addend && Number(m[2]) === 1)![0],
        ).y,
      ),
    );
    assert.ok(ys[0] < ys[1] && ys[1] < ys[2]);
  }
  assert.match(art.xml, /id="table-frame"/);
});

test("pages 63, 64, and 71 keep a tied ten and the scanned loose-stick groups", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, groups] of [
    ["p063_bundle_plus_1_stick", [1]],
    ["p063_bundle_plus_3_sticks", [3]],
    ["p064_sticks_bundle_2_plus_2", [2, 2]],
    ["p071_sticks_bundle_4_plus_2", [4, 2]],
  ] as const) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.equal(
      [...art.xml.matchAll(/<line id="bundle-stick-\d+"/g)].length,
      10,
    );
    assert.match(art.xml, /id="bundle-tie"/);
    const sticks = [
      ...art.xml.matchAll(/<line id="loose-stick-(\d+)"[^>]*\/>/g),
    ].map((m) => attributes(m[0]));
    assert.equal(
      sticks.length,
      groups.reduce((sum, group) => sum + group, 0),
    );
    assert.deepEqual(
      groups.map(
        (_, index) =>
          sticks.filter((stick) => Number(stick["data-group"]) === index)
            .length,
      ),
      [...groups],
    );
    if (groups.length === 2) {
      const split = groups[0];
      assert.ok(
        Number(sticks[split].x1) - Number(sticks[split - 1].x1) >
          Number(sticks[1].x1) - Number(sticks[0].x1),
      );
    }
  }
});

test("page 63 and 65 frame models preserve all discs and their partitions", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const buttons = vectorAssets.p063_buttons_frame_10_5;
  assert.ok(buttons);
  assert.equal(
    buttons.xml,
    readFileSync("assets/book2/vector/p063_buttons_frame_10_5.svg", "utf8"),
  );
  assert.equal([...buttons.xml.matchAll(/id="button-left-\d+"/g)].length, 10);
  assert.equal([...buttons.xml.matchAll(/id="button-right-\d+"/g)].length, 5);
  assert.match(buttons.xml, /id="frame-divider"/);
  const circles = vectorAssets.p065_circles_frame_15_5;
  assert.ok(circles);
  assert.equal(
    circles.xml,
    readFileSync("assets/book2/vector/p065_circles_frame_15_5.svg", "utf8"),
  );
  const left = [
    ...circles.xml.matchAll(/<circle id="left-circle-\d+"[^>]*\/>/g),
  ].map((m) => attributes(m[0]));
  const top = [
    ...circles.xml.matchAll(/<circle id="right-top-circle-\d+"[^>]*\/>/g),
  ].map((m) => attributes(m[0]));
  const bottom = [
    ...circles.xml.matchAll(/<circle id="right-bottom-circle-\d+"[^>]*\/>/g),
  ].map((m) => attributes(m[0]));
  assert.deepEqual([left.length, top.length, bottom.length], [10, 5, 5]);
  assert.ok([...left, ...top].every((circle) => circle.fill === "none"));
  assert.ok(bottom.every((circle) => circle.fill === "#1f2433"));
});

test("page 67 two-rail model has five above and five plus one below", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p067_abacus_5_and_6;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p067_abacus_5_and_6.svg", "utf8"),
  );
  assert.deepEqual([art.width, art.height], [404, 225]);
  const top = [...art.xml.matchAll(/<circle id="bead-top-(\d+)"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  const bottom = [
    ...art.xml.matchAll(/<circle id="bead-bottom-(\d+)"[^>]*\/>/g),
  ].map((m) => attributes(m[0]));
  assert.deepEqual([top.length, bottom.length], [5, 6]);
  assert.ok(top.every((bead) => Number(bead.cy) === Number(top[0].cy)));
  assert.ok(bottom.every((bead) => Number(bead.cy) === Number(bottom[0].cy)));
  assert.ok(Number(top[0].cy) < Number(bottom[0].cy));
  assert.deepEqual(
    top.map((bead) => bead.cx),
    bottom.slice(0, 5).map((bead) => bead.cx),
  );
  assert.ok(
    Number(bottom[5].cx) - Number(bottom[4].cx) >
      Number(bottom[1].cx) - Number(bottom[0].cx),
  );
  assert.equal(bottom[4].fill, bottom[5].fill);
});

test("pages 64, 65, 71, and 72 solution cards keep each decomposition", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const expected: Record<string, string[]> = {
    p064_solution_12_plus_2: ["12+2=", "2+2=4", "10+4=14"],
    p065_solution_15_plus_5: ["15+5=", "5+5=10", "10+10=20"],
    p071_solution_16_minus_2: ["16−2=", "6−2=4", "10+4=14"],
    p072_solution_20_minus_5: ["20−5=", "10−5=5", "10+5=15"],
  };
  for (const [id, lines] of Object.entries(expected)) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    const actual = [
      ...art.xml.matchAll(/<text id="solution-line-\d+"[^>]*>([^<]+)<\/text>/g),
    ].map((m) => m[1].replace(/\s/g, ""));
    assert.deepEqual(actual, lines);
    assert.match(art.xml, /id="solution-rule"/);
  }
});

test("pages 72 and 73 keep crossed five and the exact subtraction tables", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const frame = vectorAssets.p072_circles_frame_20_minus_5;
  assert.ok(frame);
  assert.equal(
    frame.xml,
    readFileSync(
      "assets/book2/vector/p072_circles_frame_20_minus_5.svg",
      "utf8",
    ),
  );
  assert.equal(
    [...frame.xml.matchAll(/<circle id="frame-circle-\d+"/g)].length,
    20,
  );
  const crosses = [...frame.xml.matchAll(/<path id="cross-\d+"[^>]*\/>/g)].map(
    (m) => attributes(m[0]),
  );
  assert.equal(crosses.length, 5);
  assert.ok(crosses.every((cross) => cross.stroke === "#1f2433"));
  const expected: Record<string, { numbers: number[][]; operation: string }> = {
    p072_table_minus_3: {
      numbers: [
        [16, 18, 15],
        [19, 14, 17],
      ],
      operation: "−3",
    },
    p072_table_minus_4: {
      numbers: [
        [14, 17, 15],
        [18, 16, 19],
      ],
      operation: "−4",
    },
    p073_frame_minus_5: {
      numbers: [
        [15, 17, 16],
        [18, 20, 19],
      ],
      operation: "−5",
    },
  };
  for (const [id, data] of Object.entries(expected)) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    const entries = [
      ...art.xml.matchAll(
        /<text id="table-cell-(\d+)-(\d+)"[^>]*>(\d+)<\/text>/g,
      ),
    ];
    assert.deepEqual(
      [0, 1].map((row) =>
        [0, 1, 2].map((column) =>
          Number(
            entries.find(
              (m) => Number(m[1]) === row && Number(m[2]) === column,
            )![3],
          ),
        ),
      ),
      data.numbers,
    );
    assert.match(
      art.xml,
      new RegExp(`<text id="table-operation"[^>]*>${data.operation}<\\/text>`),
    );
  }
});

test("pages 79–81 bridge ten with the scanned base and added dots", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, base, addedLeft, addedRight] of [
    ["p079_domino_9_plus_3", 9, 1, 2],
    ["p080_domino_8_plus_3", 8, 2, 1],
    ["p081_domino_7_plus_5", 7, 3, 2],
  ] as const) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    const baseDots = [
      ...art.xml.matchAll(/<circle id="base-dot-\d+"[^>]*\/>/g),
    ].map((m) => attributes(m[0]));
    const left = [
      ...art.xml.matchAll(/<circle id="added-left-\d+"[^>]*\/>/g),
    ].map((m) => attributes(m[0]));
    const right = [
      ...art.xml.matchAll(/<circle id="added-right-\d+"[^>]*\/>/g),
    ].map((m) => attributes(m[0]));
    assert.deepEqual(
      [baseDots.length, left.length, right.length],
      [base, addedLeft, addedRight],
    );
    assert.equal(base + addedLeft, 10);
    assert.ok(baseDots.every((dot) => dot.fill === "#d9e8e9"));
    assert.ok([...left, ...right].every((dot) => dot.fill === "#1f2433"));
    assert.match(art.xml, /id="domino-divider"/);
  }
});

test("pages 79–84 examples keep each exact bridge-through-ten step", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const examples: Record<string, string[]> = {
    p079_sample_9_plus_3: ["9+3=", "9+1=10", "10+2=12"],
    p080_sample_8_plus_3: ["8+3=", "8+2=10", "10+1=11"],
    p081_sample_7_plus_5: ["7+5=", "7+3=10", "10+2=12"],
    p082_sample_5_plus_7: ["5+7=", "5+5=10", "10+2=12"],
    p082_sample_6_plus_5: ["6+5=", "6+4=10", "10+1=11"],
    p083_sample_3_plus_8: ["3+8=", "3+7=10", "10+1=11"],
    p083_sample_4_plus_7: ["4+7=", "4+6=10", "10+1=11"],
    p084_sample_11_minus_2: ["11−2=", "11−1=10", "10−1=9"],
  };
  for (const [id, expected] of Object.entries(examples)) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    const lines = [
      ...art.xml.matchAll(/<text id="sample-line-\d+"[^>]*>([^<]+)<\/text>/g),
    ].map((m) => m[1].replace(/\s/g, ""));
    assert.deepEqual(lines, expected);
    assert.match(art.xml, /id="sample-rule"/);
  }
});

test("page 81 plate prices give seven and leave the answer empty", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const deep = vectorAssets.p081_deep_plate_7_rub;
  const shallow = vectorAssets.p081_shallow_plate_rub;
  for (const [id, art] of [
    ["p081_deep_plate_7_rub", deep],
    ["p081_shallow_plate_rub", shallow],
  ] as const) {
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.match(art.xml, /id="plate-rim"/);
    assert.match(art.xml, /id="price-tag"/);
    assert.doesNotMatch(art.xml, /руб|₽|коп/i);
  }
  assert.deepEqual(
    [...deep.xml.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]),
    ["7"],
  );
  assert.equal([...shallow.xml.matchAll(/<text\b/g)].length, 0);
});

test("pages 82–83 number frames preserve every printed input and operation", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, rows, operation] of [
    [
      "p082_frame_8_plus",
      [
        [4, 8, 6],
        [5, 9, 7],
      ],
      "8+",
    ],
    [
      "p083_frame_3_plus",
      [
        [5, 7, 8],
        [9, 6, 10],
        [12, 15, 13],
      ],
      "3+",
    ],
  ] as const) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    const cells = [
      ...art.xml.matchAll(
        /<text id="frame-cell-(\d+)-(\d+)"[^>]*>(\d+)<\/text>/g,
      ),
    ];
    assert.deepEqual(
      rows.map((row, r) =>
        row.map((_, c) =>
          Number(
            cells.find((m) => Number(m[1]) === r && Number(m[2]) === c)![3],
          ),
        ),
      ),
      rows,
    );
    assert.match(
      art.xml,
      new RegExp(
        `<text id="frame-operation"[^>]*>${operation.replace("+", "\\+")}<\\/text>`,
      ),
    );
  }
});

test("page 84 eleven-circle subtraction crosses one from each compartment", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const art = vectorAssets.p084_sticks_11_minus_2;
  assert.ok(art);
  assert.equal(
    art.xml,
    readFileSync("assets/book2/vector/p084_sticks_11_minus_2.svg", "utf8"),
  );
  assert.equal([...art.xml.matchAll(/<circle id="ten-dot-\d+"/g)].length, 10);
  assert.equal([...art.xml.matchAll(/<circle id="unit-dot-0"/g)].length, 1);
  assert.deepEqual(
    [...art.xml.matchAll(/<path id="cross-([^\"]+)"/g)].map((m) => m[1]),
    ["ten-9", "unit-0"],
  );
});

test("pages 85–87 subtraction frames and pencil boxes retain exact groups", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const frames: Record<string, { rows: number[][]; operation: string }> = {
    p085_frame_minus_2: {
      rows: [
        [4, 8, 6],
        [5, 9, 7],
      ],
      operation: "−2",
    },
    p086_frame_minus_3: {
      rows: [
        [5, 7, 4],
        [6, 9, 8],
      ],
      operation: "−3",
    },
    p087_frame_minus_4: {
      rows: [
        [5, 8, 6],
        [9, 7, 10],
      ],
      operation: "−4",
    },
  };
  for (const [id, data] of Object.entries(frames)) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    const cells = [
      ...art.xml.matchAll(
        /<text id="frame-cell-(\d+)-(\d+)"[^>]*>(\d+)<\/text>/g,
      ),
    ];
    assert.deepEqual(
      data.rows.map((row, r) =>
        row.map((_, c) =>
          Number(
            cells.find((m) => Number(m[1]) === r && Number(m[2]) === c)![3],
          ),
        ),
      ),
      data.rows,
    );
    assert.match(
      art.xml,
      new RegExp(`<text id="frame-operation"[^>]*>${data.operation}<\\/text>`),
    );
  }
  for (const [id, units, crossedTen] of [
    ["p085_pencils_box_12_minus_4", 2, 2],
    ["p086_pencils_box_13_minus_4", 3, 1],
  ] as const) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.equal(
      [...art.xml.matchAll(/<circle id="pencil-ten-\d+"/g)].length,
      10,
    );
    assert.equal(
      [...art.xml.matchAll(/<circle id="pencil-unit-\d+"/g)].length,
      units,
    );
    assert.equal(
      [...art.xml.matchAll(/<path id="cross-ten-\d+"/g)].length,
      crossedTen,
    );
    assert.equal(
      [...art.xml.matchAll(/<path id="cross-unit-\d+"/g)].length,
      units,
    );
    assert.equal(crossedTen + units, 4);
    assert.match(art.xml, /id="pencil-case-divider"/);
  }
});

test("pages 89–99 vector package covers each registered source crop", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const ids = [
    "p089_scales_bread_2kg_1kg",
    "p089_scales_flour_5kg_1kg",
    "p089_rule_kg_frame",
    "p090_sticks_bundle_10_plus_5",
    "p092_frame_minus_14",
    "p093_bottle",
    "p093_glass",
    "p093_one_liter_mug",
    "p093_rule_liter_abbreviation",
    "p094_milk_can_12_l",
    "p094_milk_can_unknown",
    "p096_plough",
    "p096_tractor",
    "p097_strawberries_2x2",
    "p097_strawberries_2x3",
    "p097_strawberries_2x4",
    "p097_strawberries_2x5",
    "p097_acorns_2x6",
    "p097_acorns_2x7",
    "p098_acorns_2x8",
    "p098_acorns_2x9",
    "p098_acorns_2x10",
    "p098_table_mult_2",
    "p099_balls_5_two_rubles",
    "p099_circles_3x2",
    "p099_circles_3x3",
  ];
  assert.equal(ids.length, 26);
  for (const id of ids) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.ok(art.alt.length > 8, id);
  }
});

test("page 89 balanced scales retain the two labelled weights and their object", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, weights, object] of [
    ["p089_scales_bread_2kg_1kg", ["2 кг", "1 кг"], "bread-loaf"],
    ["p089_scales_flour_5kg_1kg", ["5 кг", "1 кг"], "flour-bag"],
  ] as const) {
    const xml = vectorAssets[id].xml;
    assert.equal([...xml.matchAll(/id="scale-pan-(left|right)"/g)].length, 2);
    assert.match(xml, new RegExp(`id="${object}"`));
    assert.deepEqual(
      [
        ...xml.matchAll(/<text id="weight-label-\d+"[^>]*>([^<]+)<\/text>/g),
      ].map((m) => m[1]),
      [...weights],
    );
  }
  const kg = vectorAssets.p089_rule_kg_frame.xml;
  assert.match(kg, /Слово «килограмм» сокращённо/);
  assert.match(kg, /записывают кг/);
});

test("page 90 sticks and page 92 subtraction frame keep their arithmetic", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const sticks = vectorAssets.p090_sticks_bundle_10_plus_5.xml;
  assert.equal([...sticks.matchAll(/id="bundle-stick-\d+"/g)].length, 10);
  assert.equal([...sticks.matchAll(/id="loose-stick-\d+"/g)].length, 5);
  assert.match(sticks, /id="bundle-tie"/);
  const frame = vectorAssets.p092_frame_minus_14.xml;
  const cells = [
    ...frame.matchAll(/<text id="frame-cell-(\d+)-(\d+)"[^>]*>(\d+)<\/text>/g),
  ];
  assert.deepEqual(
    [0, 1].map((row) =>
      [0, 1, 2].map((column) =>
        Number(
          cells.find(
            (m) => Number(m[1]) === row && Number(m[2]) === column,
          )![3],
        ),
      ),
    ),
    [
      [16, 18, 20],
      [15, 19, 17],
    ],
  );
  assert.match(frame, /<text id="frame-operation"[^>]*>−14<\/text>/);
});

test("pages 93–94 vessels label one litre and twelve litres without filling the unknown", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const bottle = vectorAssets.p093_bottle.xml;
  const glass = vectorAssets.p093_glass.xml;
  const mug = vectorAssets.p093_one_liter_mug.xml;
  const rule = vectorAssets.p093_rule_liter_abbreviation.xml;
  assert.match(bottle, /id="bottle-body"/);
  assert.match(bottle, /id="bottle-screw-cap"/);
  assert.equal([...bottle.matchAll(/id="bottle-rib-\d+"/g)].length, 2);
  assert.match(glass, /id="glass-body"/);
  assert.equal([...bottle.matchAll(/<text\b/g)].length, 0);
  assert.equal([...glass.matchAll(/<text\b/g)].length, 0);
  assert.match(mug, /<text id="mug-volume"[^>]*>1 л<\/text>/);
  assert.match(rule, /Слово «литр»/);
  assert.match(rule, /сокращённо/);
  assert.match(rule, /записывают л/);
  const large = vectorAssets.p094_milk_can_12_l.xml;
  const unknown = vectorAssets.p094_milk_can_unknown.xml;
  assert.match(large, /<text id="can-volume"[^>]*>12 л<\/text>/);
  assert.equal([...unknown.matchAll(/<text\b/g)].length, 0);
  assert.match(large, /id="can-handle"/);
  assert.match(unknown, /id="can-handle"/);
});

test("page 96 uses a wheeled tractor and a separate mounted plough drawing", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const tractor = vectorAssets.p096_tractor.xml;
  const plough = vectorAssets.p096_plough.xml;
  assert.equal(
    [...tractor.matchAll(/<circle id="tractor-wheel-\d+"/g)].length,
    2,
  );
  assert.match(tractor, /id="tractor-cab"/);
  assert.match(tractor, /id="tractor-mounted-plough"/);
  assert.match(plough, /id="plough-share"/);
  assert.equal([...plough.matchAll(/id="plough-share-\d+"/g)].length, 3);
  assert.doesNotMatch(tractor, /track|гусениц/i);
});

test("pages 97–98 berries and acorns preserve every pair", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [prefix, values, token] of [
    ["p097_strawberries_2x", [2, 3, 4, 5], "berry"],
    ["p097_acorns_2x", [6, 7], "acorn"],
    ["p098_acorns_2x", [8, 9, 10], "acorn"],
  ] as const) {
    for (const pairs of values) {
      const xml = vectorAssets[prefix + pairs].xml;
      assert.equal([...xml.matchAll(/<g id="pair-\d+">/g)].length, pairs);
      assert.equal(
        [...xml.matchAll(new RegExp(`<path id="${token}-\\d+-\\d+"`, "g"))]
          .length,
        pairs * 2,
      );
      if (token === "berry") {
        assert.equal(
          [...xml.matchAll(/id="berry-calyx-\d+-\d+"/g)].length,
          pairs * 2,
        );
      }
    }
  }
});

test("page 98 table contains nine unsolved multiplication prompts", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const xml = vectorAssets.p098_table_mult_2.xml;
  const expressions = [
    ...xml.matchAll(/<text id="factor-(\d+)"[^>]*>(2×\d+)<\/text>/g),
  ];
  assert.equal(expressions.length, 9);
  assert.deepEqual(
    expressions.map((m) => m[2]),
    ["2×2", "2×3", "2×4", "2×5", "2×6", "2×7", "2×8", "2×9", "2×10"],
  );
  assert.doesNotMatch(xml, /<text\b[^>]*>[^<]*=/);
});

test("page 99 shows five balls priced only two and triangle groups of three", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const balls = vectorAssets.p099_balls_5_two_rubles.xml;
  assert.equal([...balls.matchAll(/<circle id="ball-\d+"/g)].length, 5);
  assert.deepEqual(
    [...balls.matchAll(/<text id="price-\d+"[^>]*>([^<]+)<\/text>/g)].map(
      (m) => m[1],
    ),
    ["2", "2", "2", "2", "2"],
  );
  assert.doesNotMatch(balls, /руб|коп|₽/i);
  for (const groups of [2, 3]) {
    const xml = vectorAssets[`p099_circles_3x${groups}`].xml;
    assert.equal([...xml.matchAll(/<g id="triple-\d+">/g)].length, groups);
    assert.equal(
      [...xml.matchAll(/<circle id="triple-dot-\d+-\d+"/g)].length,
      groups * 3,
    );
  }
});

test("pages 100–110 cover all twenty-eight new vector source crops", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const ids = [
    "p100_circles_3x4",
    "p100_circles_3x5",
    "p100_circles_3x6",
    "p100_table_mult_3",
    "p101_grid_3x6_cells",
    "p102_circles_4x2",
    "p102_circles_4x3",
    "p102_coins_3_kopeks_4",
    "p103_circles_4x4",
    "p103_circles_4x5",
    "p103_sticks_square",
    "p103_table_mult_4",
    "p105_carrots_5x2",
    "p105_carrots_5x3",
    "p105_carrots_5x4",
    "p105_coins_5_kopeks_3",
    "p105_table_mult_5",
    "p106_scales_flour_weights",
    "p107_cells_6x2",
    "p107_cells_6x3",
    "p107_table_mult_6",
    "p108_fork_4_rubles",
    "p108_knife_3_rubles",
    "p108_spoon_6_rubles",
    "p109_frame_mult_7_10",
    "p110_circles_3x2",
    "p110_grid_4x3",
    "p110_mult_table_to_20",
  ];
  assert.equal(ids.length, 28);
  for (const id of ids) {
    const art = vectorAssets[id];
    assert.ok(art, id);
    assert.equal(
      art.xml,
      readFileSync(`assets/book2/vector/${id}.svg`, "utf8"),
    );
    assert.ok(art.alt.length > 8, id);
  }
});

test("pages 100, 102, 103 and 110 preserve each open-circle grouping", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const groups of [4, 5, 6]) {
    const xml = vectorAssets[`p100_circles_3x${groups}`].xml;
    assert.equal([...xml.matchAll(/<g id="triple-\d+">/g)].length, groups);
    assert.equal(
      [...xml.matchAll(/<circle id="triple-dot-\d+-\d+"/g)].length,
      groups * 3,
    );
  }
  for (const [page, groups] of [
    [102, 2],
    [102, 3],
    [103, 4],
    [103, 5],
  ]) {
    const xml = vectorAssets[`p${page}_circles_4x${groups}`].xml;
    assert.equal([...xml.matchAll(/<g id="quad-\d+">/g)].length, groups);
    assert.equal(
      [...xml.matchAll(/<circle id="quad-dot-\d+-\d+"/g)].length,
      groups * 4,
    );
  }
  assert.equal(
    [...vectorAssets.p110_circles_3x2.xml.matchAll(/id="circle-\d+-\d+"/g)]
      .length,
    6,
  );
});

test("pages 101, 107 and 110 retain each source grid cell", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, rows, columns] of [
    ["p101_grid_3x6_cells", 6, 3],
    ["p107_cells_6x2", 2, 6],
    ["p107_cells_6x3", 3, 6],
    ["p110_grid_4x3", 3, 4],
  ] as const) {
    const xml = vectorAssets[id].xml;
    const cells = [...xml.matchAll(/id="cell-(\d+)-(\d+)"/g)];
    assert.equal(cells.length, rows * columns, id);
    assert.deepEqual(new Set(cells.map((m) => m[1])).size, rows, id);
    assert.deepEqual(new Set(cells.map((m) => m[2])).size, columns, id);
  }
});

test("pages 100, 103, 105 and 107 tables keep the exact unsolved source expressions", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, expected] of [
    ["p100_table_mult_3", ["3×2", "3×3", "3×4", "3×5", "3×6"]],
    ["p103_table_mult_4", ["4×2", "4×3", "4×4", "4×5"]],
    ["p105_table_mult_5", ["5×2", "5×3", "5×4"]],
    ["p107_table_mult_6", ["6×2", "6×3"]],
  ] as const) {
    const xml = vectorAssets[id].xml;
    assert.deepEqual(
      [...xml.matchAll(/<text id="expression-\d+"[^>]*>([^<]+)<\/text>/g)].map(
        (m) => m[1],
      ),
      expected,
      id,
    );
  }
});

test("pages 102 and 105 educational coin rows carry only their denomination", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, number, count] of [
    ["p102_coins_3_kopeks_4", "3", 4],
    ["p105_coins_5_kopeks_3", "5", 3],
  ] as const) {
    const xml = vectorAssets[id].xml;
    assert.equal([...xml.matchAll(/id="coin-\d+"/g)].length, count);
    assert.deepEqual(
      [...xml.matchAll(/<text id="coin-label-\d+"[^>]*>([^<]+)<\/text>/g)].map(
        (m) => m[1],
      ),
      Array(count).fill(number),
    );
    assert.doesNotMatch(xml, /коп|руб|₽|1933|герб/i);
  }
});

test("page 103 square has four separate sticks and page 105 carrots form groups of five", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  assert.equal(
    [...vectorAssets.p103_sticks_square.xml.matchAll(/id="stick-\d+"/g)].length,
    4,
  );
  for (const groups of [2, 3, 4]) {
    const xml = vectorAssets[`p105_carrots_5x${groups}`].xml;
    assert.equal([...xml.matchAll(/<g id="bunch-\d+">/g)].length, groups);
    assert.equal([...xml.matchAll(/id="carrot-\d+-\d+"/g)].length, groups * 5);
  }
});

test("page 106 balances flour against two labelled five-kilogram weights", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const xml = vectorAssets.p106_scales_flour_weights.xml;
  assert.match(xml, /id="flour-bag"/);
  assert.equal([...xml.matchAll(/id="scale-pan-(left|right)"/g)].length, 2);
  assert.deepEqual(
    [...xml.matchAll(/<text id="weight-label-\d+"[^>]*>([^<]+)<\/text>/g)].map(
      (m) => m[1],
    ),
    ["5 кг", "5 кг"],
  );
});

test("page 108 uses a mug in the former knife slot and numeric prices only", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, object, price] of [
    ["p108_spoon_6_rubles", "spoon", "6"],
    ["p108_fork_4_rubles", "fork", "4"],
    ["p108_knife_3_rubles", "mug", "3"],
  ] as const) {
    const xml = vectorAssets[id].xml;
    assert.match(xml, new RegExp(`id="${object}"`));
    assert.deepEqual(
      [...xml.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]),
      [price],
    );
    assert.doesNotMatch(xml, /руб|коп|₽|нож|knife/i);
  }
});

test("page 109 frame keeps four factors in the printed two-by-two order", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const xml = vectorAssets.p109_frame_mult_7_10.xml;
  assert.deepEqual(
    [...xml.matchAll(/<text id="expression-\d+"[^>]*>([^<]+)<\/text>/g)].map(
      (m) => m[1],
    ),
    ["7×2", "9×2", "8×2", "10×2"],
  );
});

test("page 110 reference table reproduces all thirty-six visible equalities", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const xml = vectorAssets.p110_mult_table_to_20.xml;
  assert.match(xml, /Таблица умножения до 20/);
  const equations = [
    ...xml.matchAll(/<text id="equation-\d+-\d+"[^>]*>([^<]+)<\/text>/g),
  ].map((m) => m[1]);
  const groups = [
    [1, [2, 3, 4, 5, 6, 7, 8, 9, 10]],
    [2, [2, 3, 4, 5, 6, 7, 8, 9, 10]],
    [3, [2, 3, 4, 5, 6]],
    [4, [2, 3, 4, 5]],
    [5, [2, 3, 4]],
    [6, [2, 3]],
    [7, [2]],
    [8, [2]],
    [9, [2]],
    [10, [2]],
  ] as const;
  const expected = groups.flatMap(([factor, multipliers]) =>
    multipliers.map(
      (multiplier) => `${factor}×${multiplier}=${factor * multiplier}`,
    ),
  );
  assert.equal(expected.length, 36);
  assert.deepEqual(equations, expected);
});

test("final pages register all thirty-eight source crops", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const ids = [
    "p114_frame_div_by_2", "p115_frame_div_by_3", "p116_box_divide_by_3", "p116_pencil_boxes",
    "p117_frame_div_by_4", "p118_fish_hooks", "p119_frame_div_by_5", "p119_strip_15_cells",
    "p120_box_divide_by_5", "p121_frame_division_by_6", "p122_frame_division_7_8_9_10",
    "p124_three_books_6_rub_each", "p124_three_books_brace_6_rub",
    "p126_ten_bundles_of_sticks", "p126_three_bundles_three_sticks",
    "p127_coins_three_10_kop_one_1_kop", "p127_rule_units_tens_frame", "p127_table_tens_units_2_4", "p127_two_bundles_four_sticks",
    "p128_row_40_50_gaps", "p128_table_numbers_1_100",
    "p129_line_to_measure", "p129_rule_cm_abbreviation_frame", "p129_rule_meter_100_cm_frame", "p129_ruler_10_cm",
    "p130_three_bundles_20_plus_10", "p131_buttons_30_minus_10",
    "p132_scheme_100_minus", "p132_scheme_30_plus", "p132_scheme_70_minus",
    "p134_coin_20_kopeks", "p134_stick_bundles_3x2", "p135_circles_40_split_2",
    "p138_mower_machine", "p138_seeder_machine", "p141_flowerbeds_round_triangles",
    "p142_rowing_boat", "p142_target_circles_10_20_30",
  ];
  assert.equal(ids.length, 38);
  for (const id of ids) {
    assert.ok(vectorAssets[id], id);
    assert.equal(vectorAssets[id].xml, readFileSync(`assets/book2/vector/${id}.svg`, "utf8"));
  }
});

test("division frames retain the scanned unsolved expressions and box inputs", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, expected] of [
    ["p114_frame_div_by_2", ["2:2","6:2","10:2","14:2","18:2","4:2","8:2","12:2","16:2","20:2"]],
    ["p115_frame_div_by_3", ["3:3","9:3","15:3","6:3","12:3","18:3"]],
    ["p117_frame_div_by_4", ["4:4","8:4","12:4","16:4","20:4"]],
    ["p119_frame_div_by_5", ["5:5","10:5","15:5","20:5"]],
    ["p121_frame_division_by_6", ["6:6","12:6","18:6"]],
    ["p122_frame_division_7_8_9_10", ["7:7","8:8","9:9","10:10","14:7","16:8","18:9","20:10"]],
  ] as const) {
    const xml = vectorAssets[id].xml;
    assert.deepEqual([...xml.matchAll(/<text id="division-\d+"[^>]*>([^<]+)<\/text>/g)].map(m=>m[1]), expected, id);
    assert.doesNotMatch(xml, /<text\b[^>]*>[^<]*=/);
  }
  assert.deepEqual([...vectorAssets.p116_box_divide_by_3.xml.matchAll(/<text id="box-number-\d+"[^>]*>([^<]+)<\/text>/g)].map(m=>m[1]), ["9","12","6","15","18","9"]);
  assert.deepEqual([...vectorAssets.p120_box_divide_by_5.xml.matchAll(/<text id="corner-\d+"[^>]*>([^<]+)<\/text>/g)].map(m=>m[1]), ["10","20","5","15"]);
});

test("objects preserve source counts while modern replacements keep prices numeric", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const pencils = vectorAssets.p116_pencil_boxes.xml;
  assert.equal([...pencils.matchAll(/id="pencil-\d+"/g)].length, 2);
  assert.equal([...pencils.matchAll(/id="closed-box-\d+"/g)].length, 3);
  assert.equal([...vectorAssets.p118_fish_hooks.xml.matchAll(/id="eraser-\d+"/g)].length, 4);
  for (const [id, expected] of [
    ["p124_three_books_6_rub_each", ["6","6","6"]],
    ["p124_three_books_brace_6_rub", ["6"]],
  ] as const) {
    const xml = vectorAssets[id].xml;
    assert.equal([...xml.matchAll(/id="book-\d+"/g)].length, 3);
    assert.deepEqual([...xml.matchAll(/<text id="book-price-\d+"[^>]*>([^<]+)<\/text>/g)].map(m=>m[1]), expected);
    assert.doesNotMatch(xml, /руб|коп|₽/i);
  }
  assert.match(vectorAssets.p124_three_books_brace_6_rub.xml, /id="book-brace"/);
});

test("stick bundles, cell strip, buttons and split circles preserve exact counts", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const strip = vectorAssets.p119_strip_15_cells.xml;
  assert.equal([...strip.matchAll(/id="strip-cell-\d+"/g)].length, 15);
  assert.equal([...strip.matchAll(/id="strip-divider-\d+"/g)].length, 4);
  for (const [id, bundles, loose] of [
    ["p126_ten_bundles_of_sticks",10,0], ["p126_three_bundles_three_sticks",3,3],
    ["p127_two_bundles_four_sticks",2,4], ["p130_three_bundles_20_plus_10",3,0],
    ["p134_stick_bundles_3x2",6,0],
  ] as const) {
    const xml = vectorAssets[id].xml;
    assert.equal([...xml.matchAll(/<g id="bundle-\d+"/g)].length, bundles, id);
    assert.equal([...xml.matchAll(/id="bundle-stick-\d+-\d+"/g)].length, bundles*10, id);
    assert.equal([...xml.matchAll(/id="loose-stick-\d+"/g)].length, loose, id);
  }
  assert.equal([...vectorAssets.p131_buttons_30_minus_10.xml.matchAll(/id="button-\d+-\d+"/g)].length, 30);
  assert.match(vectorAssets.p131_buttons_30_minus_10.xml, /id="tens-divider"/);
  assert.equal([...vectorAssets.p135_circles_40_split_2.xml.matchAll(/id="split-circle-\d+-\d+"/g)].length, 40);
  assert.match(vectorAssets.p135_circles_40_split_2.xml, /id="twenty-divider"/);
});

test("place value, number gaps, hundred table and learning coins keep their digits", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, values] of [
    ["p127_coins_three_10_kop_one_1_kop", ["10","10","10","1"]],
    ["p134_coin_20_kopeks", ["20"]],
  ] as const) {
    const xml = vectorAssets[id].xml;
    assert.deepEqual([...xml.matchAll(/<text id="coin-label-\d+"[^>]*>([^<]+)<\/text>/g)].map(m=>m[1]), values);
    assert.doesNotMatch(xml, /коп|руб|₽|19\d\d|герб/i);
  }
  assert.match(vectorAssets.p127_rule_units_tens_frame.xml, /Единицы пишутся на первом месте справа/);
  assert.match(vectorAssets.p127_rule_units_tens_frame.xml, /десятки на втором/);
  const place = vectorAssets.p127_table_tens_units_2_4.xml;
  assert.match(place, /Десятки/); assert.match(place, /Единицы/);
  assert.deepEqual([...place.matchAll(/<text id="place-value-\d+"[^>]*>([^<]+)<\/text>/g)].map(m=>m[1]), ["2","4"]);
  const row = vectorAssets.p128_row_40_50_gaps.xml;
  assert.equal([...row.matchAll(/id="number-cell-\d+"/g)].length, 11);
  assert.deepEqual([...row.matchAll(/<text id="number-\d+"[^>]*>([^<]+)<\/text>/g)].map(m=>m[1]), ["40","41","42","44","45","46","47","50"]);
  const table = vectorAssets.p128_table_numbers_1_100.xml;
  assert.deepEqual([...table.matchAll(/<text id="hundred-label-\d+"[^>]*>(\d+)<\/text>/g)].map(m=>Number(m[1])), Array.from({length:100},(_,i)=>i+1));
});

test("centimetre ruler marks zero and ten equal intervals, with the first highlighted", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  const xml = vectorAssets.p129_ruler_10_cm.xml;
  const ticks = [...xml.matchAll(/<line id="cm-tick-\d+" x1="([\d.]+)"/g)].map(m=>Number(m[1]));
  assert.equal(ticks.length, 11);
  assert.ok(ticks.slice(1).every((x,i)=>Math.abs((x-ticks[i])-(ticks[1]-ticks[0]))<0.01));
  assert.deepEqual([...xml.matchAll(/<text id="cm-label-\d+"[^>]*>(\d+)<\/text>/g)].map(m=>Number(m[1])), Array.from({length:11},(_,i)=>i));
  assert.match(xml, /id="first-centimetre"/);
  assert.match(vectorAssets.p129_rule_cm_abbreviation_frame.xml, /сантиметр/);
  assert.match(vectorAssets.p129_rule_cm_abbreviation_frame.xml, /см/);
  assert.match(vectorAssets.p129_rule_meter_100_cm_frame.xml, /1 метре/);
  assert.match(vectorAssets.p129_rule_meter_100_cm_frame.xml, /100 сантиметров/);
});

test("tens schemes, modern machines, flowerbeds, boat and target preserve structure", async () => {
  const { vectorAssets } = await import("../src/content/vectorAssets.ts");
  for (const [id, center, corners] of [
    ["p132_scheme_70_minus", "70−", ["20","40","10","30"]],
    ["p132_scheme_100_minus", "100−", ["20","40","10","30"]],
    ["p132_scheme_30_plus", "30+", ["20","50","40","70"]],
  ] as const) {
    const xml = vectorAssets[id].xml;
    assert.match(xml, new RegExp(center));
    assert.deepEqual([...xml.matchAll(/<text id="scheme-corner-\d+"[^>]*>([^<]+)<\/text>/g)].map(m=>m[1]), corners);
  }
  assert.match(vectorAssets.p138_mower_machine.xml, /id="mower-rotor"/);
  assert.match(vectorAssets.p138_seeder_machine.xml, /id="seed-hopper"/);
  assert.equal([...vectorAssets.p141_flowerbeds_round_triangles.xml.matchAll(/id="triangle-bed-\d+"/g)].length, 4);
  assert.match(vectorAssets.p141_flowerbeds_round_triangles.xml, /id="round-bed"/);
  assert.equal([...vectorAssets.p142_rowing_boat.xml.matchAll(/id="oar-\d+"/g)].length, 2);
  assert.equal([...vectorAssets.p142_target_circles_10_20_30.xml.matchAll(/id="target-ring-\d+"/g)].length, 3);
  assert.deepEqual([...vectorAssets.p142_target_circles_10_20_30.xml.matchAll(/<text id="target-score-\d+"[^>]*>([^<]+)<\/text>/g)].map(m=>m[1]), ["10","20","30"]);
});
