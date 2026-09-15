import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allBlocks } from "../src/content/book.ts";
import { isCorrect, isDone, parseProgress } from "../src/lib/assessment.ts";
import { pages } from "../src/content/book.ts";

const block = (id: string) => allBlocks.find((b) => b.id === id)!;
const positions = [
  ["p006-block02", "Флажок", "Вверху", "Слева", "расположен флажок"],
  ["p006-block03", "Звёздочка", "Вверху", "Справа", "расположена звёздочка"],
  ["p006-block04", "Домик", "Внизу", "Слева", "расположен домик"],
  ["p006-block05", "Ёлочка", "Внизу", "Справа", "расположена ёлочка"],
] as const;

test("all eight tomatoes in the source picture require eight counters", () => {
  const tomatoes = block("p005-block03");
  assert.equal(tomatoes.kind, "counters");
  assert.ok(isCorrect(tomatoes, { value: 8 }));
  assert.equal(isCorrect(tomatoes, { value: 7 }), false);
  const spec = readFileSync(
    new URL(
      "../textbook/page_docs/arithmetic_grade1_pchelko_1959_p005.md",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(spec, /\| Помидоры \| 8 \| Выложить 8 кружков \|/);
});

test("tomato metadata and page generators preserve the corrected count", () => {
  for (const path of [
    "textbook/data/assets.json",
    "textbook/ASSET_INDEX.md",
    "src/content/assets.ts",
    "textbook/data/completed_pages.json",
    "textbook/scripts/complete_pages.py",
  ]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /8 помидоров/, path);
    assert.doesNotMatch(source, /7 помидоров|\| Помидоры \| 7/, path);
  }
});

test("each board object asks vertical position before horizontal position", () => {
  for (const [id, title, vertical, horizontal, wording] of positions) {
    const b = block(id);
    assert.equal(b.kind, "location");
    if (b.kind !== "location") continue;
    assert.equal(b.title, title);
    assert.deepEqual(b.location, { vertical, horizontal });
    assert.equal(b.verticalPrompt, `Где ${wording}: вверху или внизу?`);
    assert.equal(b.horizontalPrompt, `Где ${wording}: слева или справа?`);
    assert.equal(b.prompt, b.verticalPrompt);
  }
});

test("a location answer requires both axes and cannot reuse an old quadrant choice", () => {
  for (const [id, , vertical, horizontal] of positions) {
    const b = block(id);
    assert.equal(isCorrect(b, { responses: { vertical } }), false);
    assert.equal(isCorrect(b, { responses: { horizontal } }), false);
    assert.equal(
      isDone(b, {
        value: `${vertical} ${horizontal.toLowerCase()}`,
        checked: true,
      }),
      false,
    );
    assert.equal(isDone(b, { responses: { vertical, horizontal } }), false);
    assert.ok(
      isDone(b, { responses: { vertical, horizontal }, checked: true }),
    );
    assert.equal(
      isCorrect(b, {
        responses: {
          vertical,
          horizontal: horizontal === "Слева" ? "Справа" : "Слева",
        },
      }),
      false,
    );
    assert.equal(
      isCorrect(b, {
        responses: {
          vertical: vertical === "Вверху" ? "Внизу" : "Вверху",
          horizontal,
        },
      }),
      false,
    );
  }
});

test("saved location answers preserve both independently selected axes", () => {
  const saved = parseProgress(
    JSON.stringify({
      version: 1,
      contentRevision: 3,
      page: 6,
      block: 1,
      answers: {
        "p006-block02": {
          responses: { vertical: "Вверху", horizontal: "Слева" },
          checked: true,
        },
      },
    }),
    pages,
  );
  assert.ok(isDone(block("p006-block02"), saved.answers["p006-block02"]));
});

test("horizontal selection stays locked until vertical is correct and changing vertical clears it", async () => {
  const { selectLocationAnswer, locationStage } =
    await import("../src/lib/location.ts");
  const b = block("p006-block02");
  assert.equal(b.kind, "location");
  if (b.kind !== "location") return;
  assert.equal(locationStage(b, {}), "vertical");
  const tooEarly = selectLocationAnswer(b, {}, "horizontal", "Слева");
  assert.equal(tooEarly.responses?.horizontal, undefined);
  const wrong = selectLocationAnswer(b, {}, "vertical", "Внизу");
  assert.equal(locationStage(b, wrong), "vertical");
  assert.equal(
    selectLocationAnswer(b, wrong, "horizontal", "Слева").responses?.horizontal,
    undefined,
  );
  const first = selectLocationAnswer(b, wrong, "vertical", "Вверху");
  assert.equal(locationStage(b, first), "horizontal");
  assert.equal(isDone(b, first), false);
  const completed = selectLocationAnswer(b, first, "horizontal", "Слева");
  assert.equal(locationStage(b, completed), "complete");
  assert.ok(isDone(b, completed));
  const changed = selectLocationAnswer(b, completed, "vertical", "Внизу");
  assert.deepEqual(changed.responses, { vertical: "Внизу" });
  assert.equal(changed.checked, false);
  assert.equal(isDone(b, changed), false);
  const restored = selectLocationAnswer(b, changed, "vertical", "Вверху");
  assert.equal(isDone(b, restored), false);
  assert.equal(restored.responses?.horizontal, undefined);
});
