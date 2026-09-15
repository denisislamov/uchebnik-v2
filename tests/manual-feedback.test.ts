import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks, pages } from "../src/content/book.ts";
import { matchesTrace } from "../src/lib/tracing.ts";
const block = (id: string) => allBlocks.find((b) => b.id === id)!;
test("tree trunks accept either direction but reject a displaced stroke", () => {
  for (const b of allBlocks)
    if (b.kind === "draw")
      for (const t of b
        .trace!.stages.flat()
        .filter((t) => /ствол/.test(t.label))) {
        assert.ok(
          matchesTrace(
            { color: t.color, points: [...t.points].reverse() },
            t,
            b.trace,
          ),
          b.id,
        );
        assert.equal(
          matchesTrace(
            {
              color: t.color,
              points: t.points.map((p) => ({ ...p, x: p.x + 0.1 })),
            },
            t,
            b.trace,
          ),
          false,
        );
      }
});
test("location questions ask where the named object is", () => {
  for (const id of [
    "p006-block02",
    "p006-block03",
    "p006-block04",
    "p006-block05",
  ]) {
    const b = block(id);
    assert.equal(b.kind, "location");
    assert.match(b.prompt, /Где/);
  }
});
test("all plums and cherries stay on the same worksheet with their number", () => {
  for (const [id, n] of [
    ["p008-block15", 2],
    ["p010-block11", 3],
  ] as const) {
    const b = block(id);
    assert.ok(b.kind === "draw");
    assert.equal(b.trace!.stages.length, 1);
    const ovals = b.trace!.stages[0].filter((t) => t.label === "Обведи овал");
    assert.equal(ovals.length, n);
    assert.equal(new Set(ovals.map((t) => t.points[0].x)).size, n);
  }
});
test("page 11 preserves given facts, two questions, and the two separate walking instructions", () => {
  const p = pages[10],
    b = block("p011-lesson01");
  assert.ok(b.kind === "work");
  assert.match(b.prompt, /2 мальчика и 1 девочка катаются на велосипедах/);
  assert.match(b.prompt, /спереди 1 колесо, сзади 2/);
  assert.equal(b.fields.length, 2);
  const walks = p.blocks.filter((b) => /шага вперёд/.test(b.prompt));
  assert.equal(walks.length, 2);
  assert.ok(walks.some((b) => b.prompt === "Сделай 2 шага вперёд."));
  assert.ok(walks.some((b) => b.prompt === "Сделай 3 шага вперёд."));
  assert.equal(p.blocks[0].id, "p011-lesson01");
});
test("editorial catch-all title is absent from child lessons", () =>
  assert.ok(!allBlocks.some((b) => b.title === "Образы числа")));
import * as hits from "../src/lib/hitTesting.ts";
test("child hit targets accept near misses and preserve exact hits on neighbours", () => {
  const pick = (hits as any).pickTarget;
  assert.equal(typeof pick, "function", "child-friendly picking is missing");
  const targets = [
    { id: "a", x: 0.2, y: 0.2, w: 0.1, h: 0.1 },
    { id: "b", x: 0.3, y: 0.2, w: 0.1, h: 0.1 },
  ];
  assert.equal(pick(targets, { x: 0.19, y: 0.25 }, 400, 400)?.id, "a");
  assert.equal(pick(targets, { x: 0.301, y: 0.25 }, 400, 400)?.id, "b");
  assert.equal(pick(targets, { x: 0.05, y: 0.05 }, 400, 400), undefined);
  const berry = (block("p010-block04") as any).targets[0];
  assert.equal(
    pick(
      [berry],
      { x: berry.x - berry.w * 0.1, y: berry.y + berry.h / 2 },
      400,
      400,
    )?.id,
    berry.id,
  );
});
test("triangle models have three equal sides", () => {
  for (const id of [
    "p010-block09",
    "p010-block10",
    "p018-lesson05",
    "p026-lesson03",
  ]) {
    const b = block(id);
    assert.ok(b.kind === "shape");
    for (let i = 0; i < b.vertices.length; i += 3) {
      const [a, c, d]: import("../src/content/types").Point[] =
        b.vertices.slice(i, i + 3);
      const lens: number[] = [
        Math.hypot(a.x - c.x, a.y - c.y),
        Math.hypot(a.x - d.x, a.y - d.y),
        Math.hypot(c.x - d.x, c.y - d.y),
      ];
      assert.ok(Math.max(...lens) - Math.min(...lens) < 0.00001, id);
    }
  }
});
import { parseProgress, isDone } from "../src/lib/assessment.ts";
test("old saves resume the same exercise after removal of editorial steps", () => {
  const restored = parseProgress(
    JSON.stringify({ version: 1, page: 14, block: 2, answers: {} }),
    pages,
  );
  assert.equal(pages[13].blocks[restored.block].id, "p014-lesson02");
  const current = parseProgress(
    JSON.stringify({
      version: 1,
      contentRevision: 2,
      page: 14,
      block: 2,
      answers: {},
    }),
    pages,
  );
  assert.equal(current.block, 2);
});
test("square arrangement requires three distinct valid slots and a different second grouping", () => {
  const b = block("p011-lesson02");
  assert.equal(
    isDone(b, { checked: true, responses: { "0": "3", "0slots": "0,0,1" } }),
    false,
  );
  assert.equal(
    isDone(b, { checked: true, responses: { "0": "3", "0slots": "0,1,3" } }),
    false,
  );
  assert.ok(
    isDone(b, { checked: true, responses: { "0": "3", "0slots": "2,0,1" } }),
  );
  assert.equal(
    isDone(block("p011-lesson03"), {
      checked: true,
      responses: { "0left": "2", "0right": "1" },
    }),
    false,
  );
  assert.ok(
    isDone(block("p011-lesson03"), {
      checked: true,
      responses: { "0left": "1", "0right": "2" },
    }),
  );
});
