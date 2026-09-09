import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { pages, allBlocks } from "../src/content/book.ts";
import {
  emptyProgress,
  hasInk,
  isCorrect,
  isDone,
  pageCompleted,
  parseProgress,
} from "../src/lib/assessment.ts";
import type { Answer, Block } from "../src/content/types.ts";
const by = (kind: string) => allBlocks.find((b) => b.kind === kind)!;
test("all 144 PDF pages and 488 source illustrations are covered", () => {
  assert.deepEqual(
    pages.map((p) => p.number),
    Array.from({ length: 144 }, (_, i) => i + 1),
  );
  assert.equal(new Set(allBlocks.map((b) => b.id)).size, allBlocks.length);
  const used = new Set(allBlocks.flatMap((b) => b.images));
  const source = JSON.parse(
    fs.readFileSync("textbook/data/assets.json", "utf8"),
  );
  assert.equal(source.length, 488);
  for (const asset of source) {
    assert.ok(used.has(asset.id), `Missing source illustration ${asset.id}`);
    assert.ok(fs.existsSync(`assets/book/${asset.id}.jpg`));
  }
  for (const p of pages) {
    assert.ok(fs.existsSync(p.sourceDoc));
    assert.ok(
      fs.existsSync(
        `assets/book/page_${String(p.number).padStart(3, "0")}.jpg`,
      ),
    );
  }
});
test("empty, whitespace, malformed and zero are distinct", () => {
  const b = by("number");
  for (const value of [undefined, "", " ", "garbage", "2+0", "2.0", [], 0])
    assert.equal(isCorrect(b, { value }), false);
  const zero = { ...b, expected: 0 } as Block;
  assert.equal(isCorrect(zero, { value: 0 }), true);
  assert.equal(isCorrect(zero, { value: "" }), false);
});
test("a selected correct answer is not completed until checked; changing answers revokes completion", () => {
  const b = by("number");
  assert.ok(b.kind === "number");
  assert.equal(isCorrect(b, { value: b.expected }), true);
  assert.equal(isDone(b, { value: b.expected }), false);
  assert.equal(isDone(b, { value: b.expected, checked: true }), true);
  assert.equal(isDone(b, { value: b.expected + 1, checked: true }), false);
});
test("all exact answers and each choice are checked independently", () => {
  for (const b of allBlocks) {
    if (
      b.kind === "number" ||
      b.kind === "choice" ||
      (b.kind === "counters" && b.expected !== undefined)
    ) {
      assert.equal(isDone(b, { value: b.expected, checked: true }), true, b.id);
      assert.equal(
        isCorrect(b, {
          value: typeof b.expected === "number" ? b.expected + 1 : "wrong",
        }),
        false,
        b.id,
      );
    }
  }
});
test("shape validation checks exact edges, independent of insertion order", () => {
  const b = allBlocks.find((b) => b.kind === "shape" && b.edges.length === 2)!;
  assert.equal(isCorrect(b, { value: ["1-2", "0-1"] }), true);
  assert.equal(isCorrect(b, { value: ["0-1", "0-2"] }), false);
  assert.equal(isCorrect(b, { value: ["0-1", "1-2", "0-2"] }), false);
  assert.equal(isCorrect(b, { value: ["0-1", "0-1"] }), false);
});
test("tracing is assessed geometrically, not by an adult completion flag", () => {
  const b = by("draw");
  assert.ok(b.kind === "draw" && b.trace);
  assert.equal(
    isDone(b, {
      reviewed: true,
      strokes: [
        {
          color: "#232d2b",
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.8, y: 0.8 },
          ],
        },
      ],
    }),
    false,
  );
  const strokes = b.trace.stages.flat().map((t) => ({
    color: t.color,
    points: t.dot ? [t.points[0], t.points[0]] : t.points,
  }));
  assert.equal(isDone(b, { strokes }), true);
  assert.equal(isDone(b, { strokes: strokes.slice(0, -1) }), false);
});
test("ambiguous sacks have no forced numeric answer", () => {
  const b = pages[4].blocks[0];
  assert.ok(b.kind === "counters");
  assert.equal(b.expected, undefined);
  assert.equal(isDone(b, { value: 6, checked: true }), false);
  assert.equal(isDone(b, { value: 6, reviewed: true }), true);
  assert.equal(isDone(b, { value: 7, reviewed: true }), true);
  assert.equal(isDone(b, { value: 0, reviewed: true }), false);
});
test("skipping or partially completing a page does not finish it", () => {
  const p = pages[2];
  assert.equal(pageCompleted(p, {}), false);
  const answers: Record<string, Answer> = {};
  for (const b of p.blocks) {
    answers[b.id] =
      b.kind === "read"
        ? { reviewed: true }
        : b.kind === "picture"
          ? { value: b.expected, checked: true }
          : b.kind === "draw" && b.trace
            ? {
                strokes: b.trace.stages
                  .flat()
                  .map((t) => ({ color: t.color, points: t.points })),
              }
            : {};
  }
  assert.equal(pageCompleted(p, answers), true);
  delete answers[p.blocks[1].id];
  assert.equal(pageCompleted(p, answers), false);
});
test("versioned progress survives serialization, including drawings and current step", () => {
  const p = emptyProgress();
  p.page = 10;
  p.block = 7;
  p.answers[pages[9].blocks[7].id] = {
    strokes: [
      {
        color: "#23594e",
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.3, y: 0.4 },
        ],
      },
    ],
    reviewed: true,
    checked: false,
    attempts: 2,
  };
  assert.deepEqual(parseProgress(JSON.stringify(p), pages), p);
});
test("corrupt, future, out-of-range and unknown progress does not crash or pollute state", () => {
  for (const raw of [null, "{broken", "null", '{"version":2,"answers":{}}'])
    assert.deepEqual(parseProgress(raw, pages), emptyProgress());
  const p = parseProgress(
    JSON.stringify({
      version: 1,
      page: 999,
      block: -3,
      answers: {
        unknown: { value: 5 },
        [allBlocks[0].id]: { strokes: [{ color: "evil", points: [] }] },
      },
    }),
    pages,
  );
  assert.equal(p.page, 1);
  assert.equal(p.block, 0);
  assert.equal(p.answers.unknown, undefined);
  assert.deepEqual(p.answers[allBlocks[0].id].strokes, []);
});
