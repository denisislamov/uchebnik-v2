import test from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import type { Block } from "../src/content/types.ts";
import { taskTeaching } from "../src/lib/taskTeaching.ts";

const get = (id: string) => {
  const block = allBlocks.find((b) => b.id === id);
  assert.ok(block, id);
  return block;
};
const teaching = (id: string) => taskTeaching(get(id));

test("every runtime block has an explicit, useful semantic lesson", () => {
  assert.ok(allBlocks.length >= 1300);
  const families = new Map<string, string>();
  for (const block of allBlocks) {
    const plan = taskTeaching(block);
    assert.ok(
      plan.family && !/unknown|generic|fallback/.test(plan.family),
      block.id,
    );
    assert.ok(plan.title.length > 4, block.id);
    assert.ok(plan.steps.length >= 2, block.id);
    assert.ok(
      plan.steps.some((s) => s.focus !== "check"),
      block.id,
    );
    for (const s of plan.steps) {
      assert.ok(s.text.length > 8, `${block.id}: ${s.text}`);
      if (s.example) {
        assert.ok(s.example.values.length > 0, block.id);
        assert.ok(s.example.values.every(Number.isFinite), block.id);
        assert.ok(
          s.example.label === "Пример" || s.example.label === "В этом задании",
          block.id,
        );
      }
    }
    if (!families.has(plan.family)) families.set(plan.family, block.id);
  }
  assert.ok(
    families.size > 70,
    "a gesture-only grouping would erase the teaching distinctions",
  );
});

test("first occurrences preserve different mathematical meanings even with the same UI", () => {
  const expected: Record<string, string> = {
    "picture.find-digit": "p001-block02",
    "picture.compare-size": "p003-block02",
    "picture.compare-length": "p003-block04",
    "picture.compare-quantity": "p007-block02",
    "picture.mark-many": "p008-block01",
    "number.count-picture": "p004-block02",
    "counters.same-amount": "p004-block05",
    "draw.line-and-dot": "p003-block06",
    "draw.closed": "p004-block07",
    "draw.open.bidirectional": "p004-block08",
    "draw.open": "p006-block07",
    "draw.numeral": "p007-block09",
    "activity.coins.sum": "p011-lesson04",
    "activity.coins.exchange": "p110-source07",
    "activity.ruler.measure": "p054-source04",
    "activity.place-value": "p059-source05",
    "number-game.hidden": "p058-source04",
    "number-game.read": "p061-source02",
    "practical.digit-cards.multi": "p061-source01",
    "target-game": "p142-play892",
  };
  const first = new Map<string, string>();
  for (const block of allBlocks) {
    const { family } = taskTeaching(block);
    if (!first.has(family)) first.set(family, block.id);
  }
  for (const [family, id] of Object.entries(expected))
    assert.equal(first.get(family), id, family);
});

test("a count demonstration counts one object once, in order", () => {
  const steps = teaching("p004-block02").steps.filter(
    (s) => s.example?.kind === "count",
  );
  assert.deepEqual(
    steps.map((s) => s.example!.active),
    Array.from({ length: 10 }, (_, i) => i),
  );
  assert.deepEqual(
    steps.map((s) => s.example!.expression),
    Array.from({ length: 10 }, (_, i) => String(i + 1)),
  );
  assert.match(steps.at(-1)!.text, /сколько всего/);
});

test("read screens explain what to do and how to continue", () => {
  const text = teaching("p001-block01")
    .steps.map((s) => s.text)
    .join(" ");
  assert.match(text, /Рассмотри/);
  assert.match(text, /послушай/);
  assert.match(text, /«Дальше»/);
});

test("all four operations have different explanations, including groups for multiplication and division", () => {
  const base = { id: "fixture", title: "", prompt: "Реши пример", images: [] };
  const plans = ["3 + 2 =", "5 − 2 =", "2 × 3 =", "6 : 2 ="].map((label) =>
    taskTeaching({
      ...base,
      kind: "work",
      fields: [{ id: "a", label, expected: "0" }],
    }),
  );
  assert.equal(new Set(plans.map((p) => p.family)).size, 4);
  assert.match(
    plans[2].steps.map((s) => s.text).join(" "),
    /по 2 взять 3 раза/i,
  );
  assert.match(
    plans[3].steps.map((s) => s.text).join(" "),
    /каждую по очереди/,
  );
});

test("image descriptions do not turn pine needles or carrot bundles into tens", () => {
  assert.equal(teaching("p033-source08").family, "work.word-reasoning.add");
  assert.equal(teaching("p105-source03").family, "work.chain.add-multiply");
  assert.equal(teaching("p060-source02").family, "work.place-value");
});

test("mixed word problems teach both operations instead of using only the last question", () => {
  assert.equal(
    teaching("p025-lesson02").family,
    "work.word-reasoning.add-subtract",
  );
  assert.equal(
    teaching("p035-source06").family,
    "work.word-reasoning.add-subtract",
  );
});

test("recipe formulas recognize ASCII subtraction and division of variables", () => {
  assert.equal(teaching("p075-source05").family, "recipe.subtract.similar");
  assert.equal(
    teaching("p124-source07").family,
    "recipe.multiply-divide.similar",
  );
  assert.equal(teaching("p141-source08").family, "recipe.add-divide.similar");
  assert.match(
    teaching("p075-source05")
      .steps.map((s) => s.text)
      .join(" "),
    /убрать два/,
  );
});

test("practical stages distinguish adding, removing, building, and measuring", () => {
  assert.match(teaching("p044-source08").family, /add\+remove/);
  assert.equal(
    teaching("p100-source05").family,
    "practical.construct-triangle",
  );
  assert.equal(teaching("p103-source04").family, "practical.construct-square");
  assert.equal(teaching("p129-source11").family, "practical.draw-length");
  assert.equal(teaching("p129-source14").family, "practical.cut-length");
  assert.equal(teaching("p129-source15").family, "practical.divide-length");
});

test("story completion, required variants, and sequential solving get distinct lessons", () => {
  assert.match(teaching("p057-source03").family, /single\.complete\.choose/);
  assert.match(teaching("p078-source05").family, /multi\.complete\.choose/);
  assert.match(teaching("p090-source06").family, /given\.all/);
  assert.match(
    teaching("p078-source05")
      .steps.map((s) => s.text)
      .join(" "),
    /ответ понадобится/,
  );
});

test("unused union choice is supported; invalid content cannot silently fall back", () => {
  const choice: Block = {
    id: "test-choice",
    kind: "choice",
    title: "Ответ",
    prompt: "Выбери",
    images: [],
    options: ["да", "нет"],
    expected: "да",
  };
  assert.equal(taskTeaching(choice).family, "choice.reason");
  assert.throws(
    () => taskTeaching({ ...choice, kind: "new-kind" } as unknown as Block),
    /Нет учебного сценария/,
  );
});

test("explanations respect the source order: tens on 59, multiplication on 97, division on 113", () => {
  // These boundaries come from the first actual introduction in the runtime
  // source blocks, not from a guessed age or an arbitrary early-page cutoff.
  assert.match(get("p059-source03").prompt, /десяток/);
  assert.match(get("p097-source04").prompt, /2×2/);
  assert.match(get("p113-source04").prompt, /Разделить поровну/);
  for (const block of allBlocks) {
    const page = Number(block.id.slice(1, 4));
    const plan = taskTeaching(block);
    const prose = plan.steps.map((s) => s.text).join(" ");
    const expressions = plan.steps
      .map((s) => s.example?.expression ?? "")
      .join(" ");
    if (page < 59)
      assert.ok(
        plan.steps.every((s) => s.example?.kind !== "placeValue"),
        block.id,
      );
    if (page < 97) {
      assert.doesNotMatch(expressions, /[×÷]|\d\s*:\s*\d/, block.id);
      assert.doesNotMatch(prose, /умножени/i, block.id);
    }
    if (page < 113) {
      assert.doesNotMatch(expressions, /[÷]|\d\s*:\s*\d/, block.id);
      // 'Деления линейки' describe ruler marks, not arithmetic division.
      assert.doesNotMatch(
        prose,
        /деление|при делении|деления выполняем/i,
        block.id,
      );
    }
    if (page >= 59 && page < 126) {
      for (const s of plan.steps)
        if (s.example?.kind === "placeValue") {
          const [tens, ones] = s.example.values;
          assert.ok(
            tens * 10 + ones <= 20,
            `${block.id}: premature number beyond twenty`,
          );
        }
    }
  }
});

test("missing addends and subtrahends explain the actual unknown position", () => {
  const a = teaching("p079-source05"),
    b = teaching("p084-source06"),
    c = teaching("p095-source04");
  assert.equal(new Set([a.family, b.family, c.family]).size, 3);
  assert.equal(a.steps[0].example?.expression, "3 + □ = 5");
  assert.equal(b.steps[0].example?.expression, "5 − □ = 3");
  assert.match(b.steps[1].text, /убрали 5 − 3 = 2/);
  assert.equal(c.steps[0].example?.expression, "□ + 2 = 5");
  assert.match(c.steps[1].text, /5 − 2 = 3/);
});

test("check steps name the controls that actually exist in each task UI", () => {
  const ending = (id: string) => teaching(id).steps.at(-1)!.text;
  assert.match(ending("p004-block05"), /«Проверить ответ»/);
  assert.match(ending("p008-block06"), /«Проверить ответ»/);
  assert.match(ending("p037-source02"), /«Проверить задачу»/);
  assert.match(ending("p090-source06"), /«Проверить все задачи»/);
  assert.match(ending("p058-source04"), /«Открыть карточку»/);
});

const prose = (id: string) =>
  teaching(id)
    .steps.map((s) => s.text)
    .join(" ");

test("hyphens in words are not subtraction, while arithmetic minus remains supported", () => {
  assert.equal(teaching("p081-source05").family, "work.word-reasoning.add");
  assert.equal(teaching("p075-source05").family, "recipe.subtract.similar");
});

test("comparison rows begin with placing the first row, not removing from an empty field", () => {
  assert.equal(teaching("p067-source08").family, "practical.compare-more");
  assert.equal(teaching("p074-source06").family, "practical.compare-less");
  assert.match(prose("p074-source06"), /перв.*ряд/i);
  assert.doesNotMatch(prose("p074-source06"), /Убери нужные предметы с поля/);
  assert.equal(teaching("p048-source10").family, "practical.add.multi");
});

test("number lists and multiple counting runs never promise one constant increment", () => {
  for (const id of [
    "p066-source11",
    "p087-source02",
    "p127-source08",
    "p128-source02",
    "p128-source04",
  ])
    assert.doesNotMatch(
      prose(id),
      /каждый раз прибавляем столько же|каждое следующее число меньше/,
    );
  assert.notEqual(
    teaching("p066-source11").family,
    teaching("p097-source03").family,
  );
  assert.match(prose("p128-source02"), /страниц/);
});

test("less-than visual agrees with the subtractive explanation", () => {
  assert.equal(
    teaching("p076-source10").steps[0].example?.expression,
    "5 − 2 = 3",
  );
  assert.deepEqual(teaching("p076-source10").steps[0].example?.values, [5, 3]);
});

test("recipe lessons include the required subject or unit choice", () => {
  for (const b of allBlocks.filter((b) => b.kind === "recipe"))
    assert.match(
      taskTeaching(b)
        .steps.map((s) => s.text)
        .join(" "),
      /Выбери.*(единиц|счит|задач)/,
      b.id,
    );
});

test("ruler lessons explain fine adjustment when numbers between tens are needed", () => {
  assert.match(prose("p129-source07"), /«\+».*«−»/);
  assert.notEqual(
    teaching("p129-source07").family,
    teaching("p129-source06").family,
  );
});

test("dividing a square teaches equal areas instead of cutting a strip", () => {
  assert.equal(teaching("p136-source05").family, "practical.divide-shape");
  assert.match(prose("p136-source05"), /клеток.*част|част.*клеток/);
  assert.doesNotMatch(prose("p136-source05"), /полоск/);
});

test("practical completion names the two actual buttons and only existing questions", () => {
  assert.match(prose("p129-source11"), /«Проверить действие»/);
  assert.match(prose("p129-source11"), /«Проверить ответ»/);
  assert.doesNotMatch(prose("p129-source11"), /ответь на вопросы/);
  assert.match(prose("p129-source14"), /ответь на вопросы/);
});

test("bidirectional open strokes get their own first lesson and explain both starting ends", () => {
  assert.match(teaching("p004-block08").family, /bidirectional/);
  assert.match(prose("p004-block08"), /любого конца/);
});

test("mixed multiplication and division teach left-to-right order within precedence", () => {
  assert.match(prose("p129-source02"), /слева направо/);
  assert.match(prose("p124-source07"), /слева направо/);
});

test("number-order example highlights the missing number, not an arrow", () => {
  const e = teaching("p019-lesson08").steps[0].example!;
  assert.equal((e.labels ?? e.expression!.split(/\s+/))[e.active!], "□");
});

test("drawing a comparison row computes the count instead of looking for an absent picture", () => {
  for (const id of ["p068-source03", "p074-source05"]) {
    assert.match(prose(id), /больше.*прибав|меньше.*выч/);
    assert.doesNotMatch(prose(id), /Сначала сосчитай предметы на рисунке/);
    assert.notEqual(teaching(id).family, teaching("p022-lesson02").family);
  }
});

test("multiple constructed examples and figures explain that all must be completed", () => {
  assert.match(prose("p034-source13"), /не повторяй|разные примеры/i);
  assert.match(prose("p100-source05"), /все.*фигур|фигур.*все/i);
  assert.match(prose("p103-source04"), /все.*фигур|фигур.*все/i);
});

test("composition introductions explain the current number and source parts", () => {
  for (const id of [
    "p011-lesson02",
    "p011-lesson03",
    "p013-lesson03",
    "p015-lesson02",
    "p019-lesson02",
    "p023-lesson02",
    "p025-lesson03",
    "p027-lesson03",
    "p029-lesson02",
  ]) {
    const b = get(id);
    assert.ok(b.kind === "activity");
    const parts = b.activity.fixedParts ?? b.activity.differentFrom;
    assert.ok(parts);
    const example = teaching(id).steps.find((s) => s.example)?.example;
    assert.deepEqual(example?.values, parts, id);
    assert.equal(
      example?.expression,
      Number(id.slice(1, 4)) < 16
        ? undefined
        : `${parts[0]} + ${parts[1]} = ${b.activity.targets[0]}`,
    );
  }
});
