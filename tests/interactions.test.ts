import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks, pages } from "../src/content/book.ts";
import { matchesTrace, traceProgress } from "../src/lib/tracing.ts";
import { containsPoint } from "../src/lib/hitTesting.ts";
import { isDone } from "../src/lib/assessment.ts";
import type { Stroke } from "../src/content/types.ts";
test("every drawing has a valid, bounded trace plan and all plans can be completed", () => {
  for (const b of allBlocks.filter((b) => b.kind === "draw")) {
    assert.ok(b.trace, b.id);
    const targets = b.trace.stages.flat();
    assert.ok(targets.length < 100);
    for (const t of targets)
      for (const p of t.points)
        assert.ok(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1, b.id);
    const strokes = targets.map((t) => ({ color: t.color, points: t.points }));
    assert.ok(traceProgress(b.trace, strokes).done, b.id);
    assert.ok(isDone(b, { strokes }), b.id);
    assert.equal(
      traceProgress(b.trace, strokes.slice(0, -1)).done,
      false,
      b.id,
    );
  }
});
test("tracing rejects wrong location, color, incomplete line, backwards line and scribbles", () => {
  const b = pages[2].blocks[5];
  assert.ok(b.kind === "draw" && b.trace);
  const target = b.trace.stages[0][0];
  assert.equal(
    matchesTrace({ color: target.color, points: target.points }, target),
    true,
  );
  assert.equal(
    matchesTrace(
      {
        color: target.color,
        points: target.points.map((p) => ({ x: p.x, y: p.y + 0.2 })),
      },
      target,
    ),
    false,
  );
  assert.equal(
    matchesTrace({ color: "#ce6548", points: target.points }, target),
    false,
  );
  assert.equal(
    matchesTrace(
      { color: target.color, points: [...target.points].reverse() },
      target,
    ),
    false,
  );
  assert.equal(
    matchesTrace(
      {
        color: target.color,
        points: [
          target.points[0],
          { x: target.points[0].x + 0.03, y: target.points[0].y },
        ],
      },
      target,
    ),
    false,
  );
  const scribble: Stroke = {
    color: target.color,
    points: Array.from({ length: 80 }, (_, i) => ({
      x: target.points[0].x + (i % 2) * 0.15,
      y: target.points[0].y + (i % 3) * 0.03,
    })),
  };
  assert.equal(matchesTrace(scribble, target), false);
});
test("small natural drawing deviations are tolerated; dots must stay small and near the guide", () => {
  const b = pages[2].blocks[5];
  assert.ok(b.kind === "draw" && b.trace);
  const [line, dot] = b.trace.stages[0];
  assert.equal(
    matchesTrace(
      {
        color: line.color,
        points: line.points.map((p) => ({ x: p.x + 0.009, y: p.y + 0.012 })),
      },
      line,
    ),
    true,
  );
  assert.equal(
    matchesTrace({ color: dot.color, points: [dot.points[0]] }, dot),
    true,
  );
  assert.equal(
    matchesTrace(
      {
        color: dot.color,
        points: [
          dot.points[0],
          { x: dot.points[0].x + 0.15, y: dot.points[0].y },
        ],
      },
      dot,
    ),
    false,
  );
});
test("progress spans worksheets, restores exactly, and ignores unsuccessful strokes", () => {
  const b = pages[2].blocks[5];
  assert.ok(b.kind === "draw" && b.trace);
  const first = b.trace.stages[0].map((t) => ({
    color: t.color,
    points: t.points,
  }));
  const wrong = {
    color: "#232d2b",
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  };
  const p = traceProgress(b.trace, [wrong, ...first]);
  assert.equal(p.completed, first.length);
  assert.equal(p.stage, 1);
  assert.equal(p.index, 0);
  assert.deepEqual(
    traceProgress(b.trace, JSON.parse(JSON.stringify(first))).accepted,
    first,
  );
});
test("picture tasks have valid regions; no duplicate counting or arbitrary background clicks", () => {
  for (const b of allBlocks.filter((b) => b.kind === "picture")) {
    for (const t of b.targets) {
      assert.ok(
        t.x >= 0 && t.y >= 0 && t.x + t.w <= 1.001 && t.y + t.h <= 1.001,
        b.id,
      );
      assert.ok(b.images[t.image]);
    }
    assert.ok(b.expected.every((id) => b.targets.some((t) => t.id === id)));
    assert.equal(isDone(b, { value: b.expected, checked: true }), true);
    assert.equal(isDone(b, { value: ["miss"], checked: true }), false);
    assert.equal(
      isDone(b, { value: [...b.expected, b.expected[0]], checked: true }),
      false,
    );
  }
});
test("slanted pencil regions do not count the space between pencils", () => {
  const b = pages[2].blocks[3];
  assert.ok(b.kind === "picture");
  assert.ok(containsPoint(b.targets[0], { x: 0.5, y: 0.47 }));
  assert.ok(containsPoint(b.targets[1], { x: 0.65, y: 0.7 }));
  assert.equal(
    b.targets.some((t) => containsPoint(t, { x: 0.2, y: 0.2 })),
    false,
  );
});
