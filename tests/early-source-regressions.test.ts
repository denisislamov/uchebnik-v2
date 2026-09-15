import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { allBlocks } from "../src/content/book.ts";

// Exercise the authored generator directly so stale generated output cannot hide regressions.
const early = JSON.parse(
  execFileSync(
    "python3",
    [
      "-c",
      `
import sys,json
sys.path.insert(0,'scripts/content')
from early_pages import build
assets=json.load(open('textbook/data/assets.json'))
print(json.dumps(build(assets,lambda s:eval(s.replace('−','-'))),ensure_ascii=False))
`,
    ],
    { encoding: "utf8" },
  ),
);
const block = (id: string): any =>
  Object.values(early)
    .flat()
    .find((b: any) => b.id === id);

test("bird story survives conversion to a picture task without naming the answer", () => {
  const b = allBlocks.find((b) => b.id === "p009-block01")!;
  assert.match(b.prompt, /сидела 1 птичка/);
  assert.match(b.prompt, /прилетела ещё 1 птичка/);
  assert.match(b.prompt, /Сколько стало птичек/);
  assert.doesNotMatch(b.prompt, /обеих|двух птичек/);
});
test("page 25 keeps the two independent stories about Kostya and Yura", () => {
  const b = block("p025-lesson02");
  assert.match(b.fields[0].label, /Костя.*7 цифр.*1 цифру/);
  assert.match(b.fields[1].label, /Юры.*8 голубей.*1 голубь улетел/);
  assert.deepEqual(
    b.fields.map((f: any) => f.expected),
    ["8", "7"],
  );
});
test("drawing instructions name source objects, including apples on page 22", () => {
  for (const [id, name] of [
    ["p012-lesson06", "флажка"],
    ["p014-lesson05", "яблок"],
    ["p018-lesson07", "вишен"],
    ["p022-lesson06", "яблок"],
    ["p024-lesson06", "шаров"],
    ["p026-lesson05", "ёлочек"],
    ["p028-lesson05", "грибов"],
  ]) {
    assert.ok(block(id).prompt.includes(name), id);
  }
});
test("copy the source grouping, then find a different grouping without mandatory equations", () => {
  for (const [p, start, parts, token] of [
    [13, 3, [2, 2], "square"],
    [15, 2, [4, 1], "square"],
    [19, 2, [4, 2], "square"],
    [23, 2, [4, 3], "square"],
    [25, 3, [7, 1], "stick"],
    [27, 3, [8, 1], "circle"],
    [29, 2, [5, 5], "square"],
  ] as const) {
    const id = (n: number) =>
      `p${String(p).padStart(3, "0")}-lesson${String(n).padStart(2, "0")}`;
    assert.deepEqual(block(id(start)).activity.fixedParts, parts);
    assert.equal(block(id(start)).activity.token, token);
    assert.equal(block(id(start + 1)).kind, "activity");
    assert.deepEqual(block(id(start + 1)).activity.differentFrom, parts);
    assert.ok(!early[p].some((b: any) => b.title === "Найди остальные части"));
  }
});
test("open composition retains the named objects and containers", () => {
  for (const [id, object, container] of [
    ["p019-lesson06", "пряники", "блюдце"],
    ["p023-lesson05", "яблоки", "тарелка"],
    ["p025-lesson06", "карандаши", "коробка"],
    ["p027-lesson06", "грибы", "кучка"],
    ["p029-lesson05", "орехи", "блюдце"],
  ]) {
    const b = block(id);
    assert.equal(b.activity.objectLabel, object);
    assert.ok(
      b.activity.groupLabels.every((label: string) =>
        label.includes(container),
      ),
      id,
    );
    assert.ok(b.activity.token, id);
  }
});
test("page 16 separates four teaching examples from four independent blanks", () => {
  for (let i = 1; i <= 4; i++)
    assert.equal(block(`p016-lesson0${i}`).kind, "read");
  const tasks = early[16].filter((b: any) => b.kind === "work");
  assert.equal(tasks.flatMap((b: any) => b.fields).length, 4);
  assert.ok(
    tasks.every((b: any) => b.images.every((im: string) => !/_eq_/.test(im))),
  );
});
test("completed addition and subtraction models are reading, not extra answers", () => {
  for (const id of [
    "p017-lesson03",
    "p020-lesson01",
    "p021-lesson01",
    "p021-lesson02",
  ])
    assert.equal(block(id).kind, "read", id);
  assert.equal(block("p017-lesson04").fields.length, 6);
  assert.equal(block("p021-lesson03").fields.length, 9);
});
test("counting and cell outlining keep the relevant pictures and do not disclose counts", () => {
  for (const [id, images] of [
    ["p018-lesson02", ["p018_beetle", "p018_cherries_branch"]],
    ["p022-lesson02", ["p022_seven_walnuts", "p022_seven_apples"]],
    ["p024-lesson02", ["p024_eight_currants"]],
  ] as const) {
    const b = block(id);
    for (const image of images) assert.ok(b.images.includes(image), id);
    assert.doesNotMatch(b.prompt, /по семь|по 7|Набери [678]/);
  }
});
test("one-more activities require the initial placement and carried addition before the total", () => {
  for (const [id, n] of [
    ["p012-lesson04", 4],
    ["p014-lesson03", 5],
    ["p018-lesson06", 6],
    ["p022-lesson05", 7],
    ["p024-lesson05", 8],
    ["p026-lesson04", 9],
  ] as const) {
    const b = block(id);
    assert.equal(b.kind, "practical", id);
    assert.deepEqual(
      b.steps.map((s: any) => s.counts),
      [[n - 1], [n]],
    );
    assert.equal(b.steps[1].carryFrom, b.steps[0].id);
    assert.equal(b.fields[0].expected, String(n));
  }
});
test("furniture legs require two physical representations using sticks", () => {
  const b = block("p012-lesson05");
  assert.equal(b.kind, "practical");
  assert.deepEqual(
    b.steps.map((s: any) => s.counts),
    [[4], [4]],
  );
  assert.ok(b.steps.every((s: any) => s.token === "stick"));
});
test("modern cards have modern labels in raw content as well as runtime", () => {
  assert.doesNotMatch(JSON.stringify(early), /Бусин на счётах/);
});
test("independent examples do not display completed models beside the blanks", () => {
  for (const id of ["p017-lesson04", "p021-lesson03"])
    assert.deepEqual(block(id).images, [], id);
});
test("the page 8 placement keeps the one-then-one action", () => {
  const b: any = allBlocks.find((b) => b.id === "p008-block05");
  assert.equal(b.kind, "practical");
  assert.deepEqual(
    b.steps.map((s: any) => s.counts),
    [[1], [2]],
  );
  assert.equal(b.steps[1].carryFrom, b.steps[0].id);
});
test("page 22 source illustration remains apples, not the audit transcription error", () => {
  assert.equal(block("p022-lesson06").plan, "apple:7");
});

test("p022 cell guides appear only after the child chooses both picture counts", () => {
  const b = block("p022-lesson02");
  assert.equal(b.kind, "practical");
  assert.deepEqual(b.steps[0].counts, [7, 7]);
  assert.deepEqual(b.steps[0].chooseCounts, [0, 1]);
  assert.equal(b.steps[0].token, "square");
});
