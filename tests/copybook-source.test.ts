import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import { relationPlan } from "../src/lib/relationDrawing.ts";
import { matchesTrace, traceProgress } from "../src/lib/tracing.ts";
test("page 6 has twelve black waves without added dots", () => {
  const b = allBlocks.find((b) => b.id === "p006-block08")!;
  assert.ok(b.kind === "draw" && b.trace);
  const targets = b.trace.stages.flat();
  assert.equal(targets.length, 12);
  assert.ok(targets.every((t) => !t.dot && t.color === "#111111"));
});
test("four flags are two cells wide with inward notches; last flag is mirrored", () => {
  const flags = allBlocks
    .filter((b) => b.kind === "draw" && b.id.startsWith("p012-"))
    .find((b) => b.title.includes("Нарисуй"))!;
  assert.ok(flags.kind === "draw" && flags.trace);
  for (let i = 0; i < 4; i++) {
    const points: { x: number; y: number }[] = flags.trace.stages[
      i
    ][1].points.map((p) => ({
      x: p.x * 12,
      y: p.y * 8,
    }));
    assert.equal(points.length, 5);
    const direction = i === 3 ? -1 : 1;
    assert.equal(points[1].x - points[0].x, 2 * direction);
    assert.equal(points[2].x - points[0].x, 1.5 * direction);
    assert.equal(points[2].y - points[0].y, 0.5);
    assert.equal(points[3].y - points[0].y, 1);
  }
});
test("cell columns stay vertical with a shared baseline, square cells, and consistent validation up to twenty", () => {
  const b = allBlocks.find((b) => b.exerciseNumber === 298)!;
  assert.ok(b.kind === "relation");
  for (const [a, z] of [
    [1, 5],
    [6, 10],
    [16, 20],
  ]) {
    const plan = relationPlan(b, {
        responses: { left: String(a), right: String(z) },
      }),
      ts = plan.stages.flat();
    assert.equal(plan.stages.length, 1);
    assert.equal(ts.length, a + z);
    for (const group of [ts.slice(0, a), ts.slice(a)]) {
      const x = group[0].points[0].x;
      group.forEach((t, i) => {
        assert.equal(t.points[0].x, x);
        if (i)
          assert.ok(
            Math.abs(
              (t.points[0].y - group[i - 1].points[0].y) * plan.rows - 1,
            ) < 1e-8,
          );
        assert.ok(matchesTrace({ color: t.color, points: t.points }, t, plan));
        assert.equal(
          matchesTrace(
            {
              color: t.color,
              points: t.points.map((p) => ({ ...p, y: p.y + 0.5 / plan.rows })),
            },
            t,
            plan,
          ),
          false,
        );
      });
    }
    assert.equal(ts[a - 1].points[2].y, ts.at(-1)!.points[2].y);
    assert.ok(
      traceProgress(
        plan,
        ts.map((t) => ({ color: t.color, points: t.points })),
      ).done,
    );
  }
});
