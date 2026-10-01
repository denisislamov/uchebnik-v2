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
