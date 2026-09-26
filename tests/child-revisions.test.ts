import { numberTrace } from "../src/content/fullBook.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  pages,
  lessonPages,
  extraPages,
  allBlocks,
} from "../src/content/book.ts";
import { digitSamples, sampleDigit } from "../src/content/handwrittenDigits.ts";
import {
  matchesTrace,
  isClosedTrace,
  drawingColor,
  DRAWING_COLORS,
} from "../src/lib/tracing.ts";
import { isDone, parseProgress } from "../src/lib/assessment.ts";
const ink = JSON.parse(
  fs.readFileSync("tests/fixtures/handwriting-ink.json", "utf8"),
);
for (const [n, sample] of Object.entries(digitSamples))
  test(`handwritten ${n} stays on the original scanned ink`, () => {
    const fixture = ink[sample.asset];
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(`textbook/images/${sample.asset}.png`))
        .digest("hex"),
      fixture.sha256,
    );
    const points = sampleDigit(n)
      .flat()
      .map((p) => ({
        x: p.x * sample.cell + sample.origin.x,
        y: p.y * sample.cell + sample.origin.y,
      }));
    const distances = points.map((p) =>
      Math.min(
        ...fixture.ink.map(([x, y]: number[]) => Math.hypot(x - p.x, y - p.y)),
      ),
    );
    assert.ok(
      distances.filter((d) => d <= 3).length / points.length >= 0.98,
      `${n}: trace left source ink`,
    );
  });
test("closed contours accept mid-edge starts in either direction but reject missing sides and displacement", () => {
  for (const b of allBlocks) {
    if (b.kind !== "draw" || !b.trace) continue;
    for (const t of b.trace.stages
      .flat()
      .filter((t) => isClosedTrace(t, b.trace!))) {
      const ring = t.points.slice(0, -1);
      const a = ring[0],
        z = ring[1];
      const middle = { x: (a.x + z.x) / 2, y: (a.y + z.y) / 2 };
      const rotated = [middle, ...ring.slice(1), a, middle];
      for (const points of [rotated, [...rotated].reverse()])
        assert.ok(matchesTrace({ color: t.color, points }, t, b.trace), b.id);
      assert.equal(
        matchesTrace(
          {
            color: t.color,
            points: rotated.map((p): { x: number; y: number } => ({
              ...p,
              x: p.x + 1 / b.trace!.columns,
            })),
          },
          t,
          b.trace,
        ),
        false,
        b.id,
      );
      assert.equal(
        matchesTrace({ color: t.color, points: [middle, z] }, t, b.trace),
        false,
        b.id,
      );
    }
  }
});
test("drawing palette is black red blue and saved old colors map to the new palette", () => {
  const colors = new Set(
    allBlocks.flatMap((b) =>
      b.kind === "draw" && b.trace
        ? b.trace.stages.flat().map((t) => t.color)
        : [],
    ),
  );
  assert.deepEqual(
    [...DRAWING_COLORS].sort(),
    ["#111111", "#1565c0", "#d62828"].sort(),
  );
  assert.ok([...colors].every((c) => DRAWING_COLORS.includes(c)));
  assert.equal(drawingColor("#23594e"), "#1565c0");
});
test("lessons exclude publishing pages; the cover is an optional activity", () => {
  assert.equal(lessonPages.length, 140);
  assert.equal(lessonPages[0].number, 3);
  assert.equal(lessonPages.at(-1)!.number, 142);
  assert.deepEqual(
    extraPages.map((p) => p.number),
    [1, 143, 144],
  );
  assert.equal(pages.length, 144);
});
test("room pair finding needs all six objects and no unrelated click", () => {
  const b = pages[7].blocks[0];
  assert.equal(b.kind, "picture");
  if (b.kind !== "picture") return;
  assert.equal(b.targets.length, 6);
  assert.ok(isDone(b, { value: b.expected, checked: true }));
  assert.equal(isDone(b, { value: b.expected.slice(1), checked: true }), false);
  assert.equal(
    isDone(b, { value: [...b.expected, "miss"], checked: true }),
    false,
  );
});

test("new drawing colors survive reload while legacy colors are retained", () => {
  const strokes = [...DRAWING_COLORS, "#23594e", "#ce6548", "#232d2b"].map(
    (color) => ({
      color,
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 },
      ],
    }),
  );
  const saved = {
    version: 1,
    page: 3,
    block: 5,
    answers: { "p003-block06": { strokes } },
  };
  assert.deepEqual(
    parseProgress(JSON.stringify(saved), pages).answers["p003-block06"].strokes,
    strokes,
  );
});

test("ten preserves the adjacent digit placement in its own sample", () => {
  const fixture = ink.p028_digit_10_sample;
  for (const t of numberTrace(10).stages[0])
    for (const p of t.points) {
      const x = (p.x * 12 - 4) * 29 + 43,
        y = (p.y * 8 - 2) * 29 + 20;
      assert.ok(
        Math.min(
          ...fixture.ink.map(([a, b]: number[]) => Math.hypot(a - x, b - y)),
        ) <= 3,
      );
    }
});
