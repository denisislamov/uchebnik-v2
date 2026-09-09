import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks, pages } from "../src/content/book.ts";
import { calculate } from "../src/lib/arithmetic.ts";
import { isCorrect, isDone, parseProgress } from "../src/lib/assessment.ts";
import { compositionCorrect } from "../src/lib/courseAssessment.ts";
import { matchesTrace } from "../src/lib/tracing.ts";
import type { Answer } from "../src/content/types.ts";
const numbered = (n: number) => allBlocks.find((b) => b.exerciseNumber === n)!;
test("full inventory: every numbered exercise and all continuations are reachable", () => {
  assert.deepEqual(
    [
      ...new Set(
        allBlocks
          .map((b) => b.exerciseNumber)
          .filter((n): n is number => typeof n === "number"),
      ),
    ].sort((a, b) => a - b),
    Array.from({ length: 892 }, (_, i) => i + 1),
  );
  assert.equal(pages.length, 144);
  const allowed = [
    "read",
    "number",
    "choice",
    "counters",
    "draw",
    "picture",
    "shape",
    "work",
    "compose",
    "activity",
    "recipe",
    "relation",
    "targetGame",
  ];
  for (const b of allBlocks) assert.ok(allowed.includes(b.kind), b.id);
  for (const n of [331, 489, 887])
    assert.equal(allBlocks.filter((b) => b.exerciseNumber === n).length, 2);
});
test("arithmetic parser validates precedence and rejects code, incomplete syntax and fractional results", () => {
  for (const [s, n] of [
    ["4+3×2", 10],
    ["(11+3):7", 2],
    ["20−4×3", 8],
    ["100:10", 10],
  ] as const)
    assert.equal(calculate(s), n);
  for (const s of [
    "process.exit()",
    "1/0",
    "3:2",
    "2+",
    "2.5+1",
    "1e2",
    "(2+3",
    "2+3)",
    "",
  ])
    assert.equal(calculate(s), undefined, s);
});
test("every field is required, independently checked, and changing one answer revokes completion", () => {
  for (const b of allBlocks) {
    if (b.kind !== "work") continue;
    assert.ok(b.fields.length > 0, b.id);
    const responses = Object.fromEntries(
      b.fields.map((f) => [f.id, f.expected]),
    );
    assert.ok(isDone(b, { responses, checked: true }), b.id);
    assert.equal(isDone(b, { responses }), false, b.id);
    for (const f of b.fields)
      assert.equal(
        isCorrect(b, { responses: { ...responses, [f.id]: "" } }),
        false,
        `${b.id}/${f.id}`,
      );
  }
});
test("unknown addends, frames, continuation and end-of-book answers match reviewed source cases", () => {
  const expected: Record<number, string[]> = {
    198: ["1", "4", "5", "2", "4", "3", "1", "5", "5", "3", "5", "1"],
    499: ["6", "6", "10", "2", "2", "5"],
    401: ["11", "11"],
    489: ["14", "1"],
    892: ["70", "100", "Галя"],
    678: [
      "2",
      "4",
      "1",
      "3",
      "5",
      "10",
      "3",
      "2",
      "5",
      "1",
      "5",
      "4",
      "6",
      "3",
      "1",
      "3",
    ],
  };
  for (const [n, values] of Object.entries(expected)) {
    const b = numbered(Number(n));
    assert.ok(b.kind === "work");
    assert.deepEqual(
      b.fields.map((f) => f.expected),
      values,
      `№${n}`,
    );
  }
});
test("every open example set has a valid solution and accepts distinct alternatives", () => {
  for (const b of allBlocks) {
    if (b.kind !== "compose") continue;
    const responses: Record<string, string> = {},
      used = new Set<string>();
    b.rules.forEach((rule, i) => {
      let found = false;
      for (let a = 1; a <= rule.max && !found; a++)
        for (let v = 1; v <= rule.max && !found; v++) {
          const z = calculate(`${a}${rule.operator}${v}`),
            key = `${rule.operator}:${a}:${v}`;
          if (
            z !== undefined &&
            !used.has(key) &&
            compositionCorrect(rule, String(a), String(v), String(z))
          ) {
            responses[`${i}a`] = String(a);
            responses[`${i}b`] = String(v);
            responses[`${i}c`] = String(z);
            responses[`${i}story`] = "яблоки";
            used.add(key);
            found = true;
          }
        }
      assert.ok(found, `${b.id}, rule ${i}`);
    });
    assert.ok(isDone(b, { responses, checked: true }), b.id);
  }
});
test("manipulative activities require the complete arrangement, not an adult flag", () => {
  for (const b of allBlocks) {
    if (b.kind !== "activity") continue;
    const r: Record<string, string> = {};
    const a = b.activity;
    a.targets.forEach((n, i) => {
      if (a.mode === "groups")
        for (let g = 0; g < (a.groups ?? 2); g++)
          r[`${i}g${g}`] = String(n / (a.groups ?? 2));
      else if (a.mode === "place") {
        r[`${i}tens`] = String(Math.floor(n / 10));
        r[`${i}ones`] = String(n % 10);
      } else if (a.mode === "composition") {
        r[`${i}left`] = "1";
        r[`${i}right`] = String(n - 1);
      } else if (a.mode === "sequence") r[`${i}visited`] = "yes";
      else r[String(i)] = String(n);
    });
    assert.ok(isDone(b, { responses: r, checked: true }), b.id);
    assert.equal(isDone(b, { reviewed: true }), false, b.id);
  }
});
test("grid strokes follow notebook corners, and half-cell displaced strokes fail", () => {
  const ids = [
    "p003-block06",
    "p004-block07",
    "p004-block08",
    "p004-block09",
    "p005-block04",
    "p009-block06",
  ];
  for (const id of ids) {
    const b = allBlocks.find((b) => b.id === id)!;
    assert.ok(b.kind === "draw" && b.trace);
    for (const t of b.trace.stages.flat())
      if (!t.dot) {
        assert.equal(t.grid, true, `${id}: ${t.label}`);
        for (const p of t.points) {
          assert.ok(Math.abs(p.x * 12 - Math.round(p.x * 12)) < 1e-8, id);
          assert.ok(Math.abs(p.y * 8 - Math.round(p.y * 8)) < 1e-8, id);
        }
        assert.equal(
          matchesTrace(
            {
              color: t.color,
              points: t.points.map((p) => ({ ...p, y: p.y + 0.5 / 8 })),
            },
            t,
          ),
          false,
          id,
        );
      }
  }
  const first = allBlocks.find((b) => b.id === "p003-block06")!;
  assert.ok(first.kind === "draw" && first.trace);
  const t = first.trace.stages[0][0];
  assert.equal(Math.round((t.points[1].x - t.points[0].x) * 12), 1);
});
test("full-course progress preserves multiple answers, selections and numbers above twenty", () => {
  const b = numbered(892),
    answer: Answer = {
      responses: { q1: "70", q2: "100", winner: "Галя" },
      checked: true,
      reviewed: false,
      attempts: 1,
    };
  const state = parseProgress(
    JSON.stringify({
      version: 1,
      page: 142,
      block: 1,
      answers: { [b.id]: answer },
    }),
    pages,
  );
  assert.equal(state.page, 142);
  assert.deepEqual(state.answers[b.id], answer);
  assert.equal(isDone(b, state.answers[b.id]), true);
});

test("draw-more and draw-less require actual geometry as well as the numerical relation", async () => {
  const { relationPlan } = await import("../src/lib/relationDrawing.ts");
  for (const b of allBlocks) {
    if (b.kind !== "relation") continue;
    const left = Math.max(1, 1 - b.difference),
      right = left + b.difference;
    const answer: Answer = {
      responses: { left: String(left), right: String(right) },
      checked: true,
    };
    assert.equal(isDone(b, answer), false, b.id);
    answer.strokes = relationPlan(b, answer)
      .stages.flat()
      .map((t) => ({ color: t.color, points: t.points }));
    assert.ok(isDone(b, answer), b.id);
    answer.strokes.pop();
    assert.equal(isDone(b, answer), false, b.id);
  }
});
