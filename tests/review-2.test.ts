import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks, pages } from "../src/content/book.ts";
import { parseProgress, CONTENT_REVISION } from "../src/lib/assessment.ts";
import {
  revision3Steps,
  revision4Steps,
} from "../src/content/legacyStepIds.ts";
import { composeStory, storySubjects } from "../src/lib/composeStory.ts";
import { taskTeaching } from "../src/lib/taskTeaching.ts";

const block = (id: string) => allBlocks.find((b) => b.id === id)!;

test("page descriptions are not steps: no «Блок N», «Заголовки» or «Рисунки страницы»", () => {
  for (const b of allBlocks) {
    assert.doesNotMatch(
      b.title,
      /^Блок \d+\.|^Заголовки?$|^Рисунки страницы$/,
      b.id,
    );
    if (b.kind === "read")
      assert.doesNotMatch(
        b.body,
        /полужирн|по центру|\(черта\)|сигнатур/,
        `${b.id} shows a layout note`,
      );
  }
  // Page 46 had eight domino steps; they are one picture step now.
  const p46 = pages[45].blocks;
  assert.equal(p46.filter((b) => /Домино/.test(b.title)).length, 0);
  assert.ok(p46.length <= 10, `page 46 has ${p46.length} steps`);
  // The table of contents is one step.
  assert.equal(pages[142].blocks.length, 1);
  assert.equal(pages[142].blocks[0].title, "Оглавление");
});

test("page titles are short and have no unclosed brackets", () => {
  for (const p of pages) {
    assert.ok(p.title.length <= 90, `${p.number}: ${p.title}`);
    assert.equal(
      (p.title.match(/\(/g) ?? []).length,
      (p.title.match(/\)/g) ?? []).length,
      `${p.number}: ${p.title}`,
    );
  }
});

test("a two-part problem puts the second condition above its own question", () => {
  const b = block("p035-source06");
  assert.equal(b.kind, "work");
  if (b.kind !== "work") return;
  assert.doesNotMatch(b.prompt, /У Иры было 8/);
  assert.match(b.fields[1].context ?? "", /^У Иры было 8 камешков/);
  assert.equal(b.fields[0].context, undefined);
});

test("questions do not give the answer away and gaps are named by their place", () => {
  const fish = block("p019-lesson01");
  assert.equal(fish.kind, "work");
  if (fish.kind === "work")
    for (const f of fish.fields) assert.doesNotMatch(f.label, /пят|шест/);
  const gaps = block("p019-lesson08");
  assert.equal(gaps.kind, "work");
  if (gaps.kind === "work") {
    assert.match(gaps.prompt, /1, □, □, 4, □, 6/);
    for (const f of gaps.fields) assert.doesNotMatch(f.label, /пропуск/);
  }
});

test("each picture of a two-picture count gets its own step", () => {
  assert.deepEqual(block("p018-lesson02").images, ["p018_beetle"]);
  assert.deepEqual(block("p018-cherries").images, ["p018_cherries_branch"]);
  const ids = pages[19].blocks.map((b) => b.id);
  assert.deepEqual(ids.slice(0, 3), [
    "p020-lesson01",
    "p020-gave-one",
    "p020-picked-one",
  ]);
  assert.deepEqual(block("p029-lesson02").images, ["p029_squares_green_red"]);
});

test("the right question in a composed story is not always first", () => {
  const positions = new Set(
    storySubjects.flatMap((subject) =>
      ["+", "−"].map((op) => {
        const story = composeStory(op, subject, "5", "3");
        return story.options.indexOf(story.question);
      }),
    ),
  );
  assert.ok(positions.size > 1);
});

test("counting hints give the rule before counting starts", () => {
  const b = allBlocks.find((x) => x.kind === "number")!;
  const steps = taskTeaching(b).steps.map((s) => s.text);
  assert.match(steps[0], /Считай каждый предмет один раз/);
  assert.ok(steps.slice(1).every((t) => !/Считай каждый предмет/.test(t)));
});

test("revision-3 and revision-4 saves reopen the same step after steps were folded", () => {
  for (const [revision, steps] of [
    [3, revision3Steps],
    [4, revision4Steps],
    // Page 99 changed only after revision 4; an older save needs the same map.
    [3, revision4Steps],
  ] as const)
    for (const [page, ids] of Object.entries(steps)) {
      const n = Number(page);
      ids.forEach((id, index) => {
        const saved = parseProgress(
          JSON.stringify({
            version: 1,
            contentRevision: revision,
            page: n,
            block: index,
            answers: {},
          }),
          pages,
        );
        assert.equal(saved.contentRevision, CONTENT_REVISION);
        const now = pages[n - 1].blocks.findIndex((b) => b.id === id);
        if (now >= 0) assert.equal(saved.block, now, `${id}`);
      });
    }
});
