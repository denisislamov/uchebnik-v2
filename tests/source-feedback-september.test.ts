import test from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import { taskTeaching } from "../src/lib/taskTeaching.ts";
import { compositionLayout } from "../src/lib/compositionLayout.ts";
const get = (id: string) => allBlocks.find((b) => b.id === id)!;
test("seven cucumbers require seven counters", () => {
  const b = get("p005-block02");
  assert.ok(b.kind === "counters");
  assert.equal(b.expected, 7);
});
test("early bird onboarding keeps the actual one-and-one story without later arithmetic", () => {
  const t = taskTeaching(get("p009-block01"));
  const prose = t.steps.map((s) => s.text).join(" ");
  assert.match(prose, /1 птичка/);
  assert.match(prose, /ещё 1/);
  assert.doesNotMatch(JSON.stringify(t.steps), /3 \+ 2|2 \+ 3|= 5|кружка/);
});
test("before printed arithmetic is introduced, tutorials do not introduce equations", () => {
  for (const b of allBlocks.filter((b) => Number(b.id.slice(1, 4)) < 16)) {
    const t = taskTeaching(b);
    for (const s of t.steps)
      assert.doesNotMatch(
        s.text + " " + (s.example?.expression ?? ""),
        /\d\s*[+−×=]\s*\d/,
        b.id,
      );
  }
});
test("early word problems explain the question even when the prompt is only a title", () => {
  const prose = taskTeaching(get("p013-lesson01"))
    .steps.map((s) => s.text)
    .join(" ");
  assert.match(prose, /Для вопроса «Сколько осталось/);
  assert.doesNotMatch(prose, /3 \+ 2/);
});
test("three source squares form a vertical pair and one lower right square", () => {
  const b = get("p011-lesson02");
  assert.ok(b.kind === "activity");
  assert.deepEqual(b.activity.compositionPattern, [
    [0, 0],
    [0, 1],
    [1, 1],
  ]);
  const g = compositionLayout(300, 3, b.activity.compositionPattern);
  assert.equal(g.center(0).x, g.center(1).x);
  assert.equal(g.center(1).y, g.center(2).y);
  assert.ok(g.center(0).y < g.center(1).y);
});
test("hook has a continuous inward curl and reaches two notebook cells", () => {
  const b = get("p006-block07");
  assert.ok(b.kind === "draw");
  const p = b.trace!.stages[0][0].points.map((p) => ({
    x: p.x * 12,
    y: p.y * 8,
  }));
  assert.ok(
    Math.max(...p.map((p) => p.y)) - Math.min(...p.map((p) => p.y)) > 1.95,
  );
  for (let i = 1; i < p.length; i++)
    assert.ok(
      Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y) < 0.15,
      "no jump between curl and main arc",
    );
  assert.ok(
    p[0].x < p[5].x && p[0].y > p[5].y,
    "inner tip turns up and right before the outer arc",
  );
});
