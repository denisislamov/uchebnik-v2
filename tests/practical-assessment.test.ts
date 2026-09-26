import { test } from "node:test";
import assert from "node:assert/strict";
import { isCorrect, parseProgress } from "../src/lib/assessment.ts";
import type { Block, Answer } from "../src/content/types.ts";
import {
  practicalTrace,
  practicalShape,
  updatePractical,
} from "../src/lib/practical.ts";

const task = {
  id: "p012-practical-test",
  title: "Палочки",
  prompt: "Положи 3 палочки и ещё 1.",
  images: [],
  kind: "practical",
  steps: [
    {
      id: "first",
      instruction: "Положи 3 палочки.",
      mode: "place",
      token: "stick",
      counts: [3],
    },
    {
      id: "add",
      instruction: "Положи ещё одну.",
      mode: "place",
      token: "stick",
      counts: [4],
      carryFrom: "first",
    },
  ],
  fields: [{ id: "total", label: "Сколько всего?", expected: "4" }],
} as unknown as Block;
const completed = {
  responses: { total: "4" },
  practical: {
    first: { counts: [3], confirmed: true },
    add: { counts: [4], confirmed: true },
  },
} as Answer;
test("physical placement and the final number are both required", () => {
  assert.equal(isCorrect(task, { responses: { total: "4" } }), false);
  assert.equal(isCorrect(task, completed), true);
  assert.equal(
    isCorrect(task, { ...completed, responses: { total: "3" } }),
    false,
  );
});
test("cannot skip the first placement or confirm the wrong intermediate amount", () => {
  assert.equal(
    isCorrect(task, {
      ...completed,
      practical: { add: { counts: [4], confirmed: true } },
    } as Answer),
    false,
  );
  assert.equal(
    isCorrect(task, {
      ...completed,
      practical: {
        first: { counts: [2], confirmed: true },
        add: { counts: [4], confirmed: true },
      },
    } as Answer),
    false,
  );
});
test("a removed object must be reflected in the actual set, not just the answer", () => {
  const remove = {
    ...task,
    steps: [
      {
        id: "remove",
        instruction: "Убери 3 из 7",
        mode: "place",
        token: "square",
        initialCounts: [7],
        counts: [4],
      },
    ],
    fields: [],
  } as unknown as Block;
  assert.equal(
    isCorrect(remove, {
      practical: { remove: { counts: [7], confirmed: true } },
    } as Answer),
    false,
  );
  assert.equal(
    isCorrect(remove, {
      practical: { remove: { counts: [4], confirmed: true } },
    } as Answer),
    true,
  );
});
test("two rows of seven cells require both traced rows as well as fourteen", () => {
  const step = {
    id: "rows",
    instruction: "Обведи 2 ряда по 7 клеток.",
    mode: "draw" as const,
    token: "square" as const,
    counts: [7, 7],
  };
  const block = {
    ...task,
    steps: [step],
    fields: [{ id: "total", label: "Сколько клеток?", expected: "14" }],
  } as Extract<Block, { kind: "practical" }>;
  const plan = practicalTrace(step);
  assert.equal(plan.columns, 9);
  assert.equal(plan.rows, 4);
  assert.equal(plan.stages[0].length, 2);
  assert.deepEqual(
    plan.stages[0][0].points.map((p) => [p.x * 9, p.y * 4]),
    [
      [1, 1],
      [8, 1],
      [8, 2],
      [1, 2],
      [1, 1],
    ],
  );
  const strokes = plan.stages[0].map((t) => ({
    color: t.color,
    points: t.points,
  }));
  const answer: Answer = {
    responses: { total: "14" },
    practical: { rows: { strokes, confirmed: true } },
  };
  assert.ok(isCorrect(block, answer));
  assert.equal(
    isCorrect(block, { ...answer, responses: { total: "2" } }),
    false,
  );
  assert.equal(
    isCorrect(block, {
      ...answer,
      practical: { rows: { strokes: strokes.slice(0, 1), confirmed: true } },
    }),
    false,
  );
  assert.equal(
    isCorrect(block, {
      ...answer,
      practical: {
        rows: {
          strokes: strokes.map((s) => ({
            ...s,
            points: s.points.map((p) => ({ ...p, y: p.y + 0.5 / 4 })),
          })),
          confirmed: true,
        },
      },
    }),
    false,
  );
});
test("six triangles use eighteen separate equal-length sticks", () => {
  const step = {
    id: "triangles",
    instruction: "Составь 6 треугольников.",
    mode: "construct" as const,
    shape: "triangle" as const,
    counts: [6],
  };
  const model = practicalShape(step);
  assert.equal(model.edges.length, 18);
  for (let i = 0; i < 18; i += 3) {
    const lengths = model.edges
      .slice(i, i + 3)
      .map(([a, b]) =>
        Math.hypot(
          model.vertices[a].x - model.vertices[b].x,
          model.vertices[a].y - model.vertices[b].y,
        ),
      );
    assert.ok(Math.max(...lengths) - Math.min(...lengths) < 1e-9);
  }
  const block = { ...task, steps: [step], fields: [] } as Extract<
    Block,
    { kind: "practical" }
  >;
  const edges = model.edges.map(([a, b]) =>
    [a, b].sort((a, b) => a - b).join("-"),
  );
  assert.ok(
    isCorrect(block, { practical: { triangles: { edges, confirmed: true } } }),
  );
  assert.equal(
    isCorrect(block, {
      practical: { triangles: { edges: edges.slice(1), confirmed: true } },
    }),
    false,
  );
});
test("editing an earlier action invalidates later actions and the numeric result", () => {
  const changed = updatePractical(
    task as Extract<Block, { kind: "practical" }>,
    completed,
    "first",
    { counts: [2], confirmed: false },
  );
  assert.deepEqual(changed.responses, {});
  assert.equal(changed.practical?.add, undefined);
  assert.equal(isCorrect(task, changed), false);
});
test("practical placements and drawings survive a validated reload", () => {
  const book = [
    {
      number: 1,
      id: "page-001",
      title: "test",
      subtitle: "",
      hero: "",
      sourceDoc: "",
      blocks: [task],
    },
  ];
  const saved = parseProgress(
    JSON.stringify({
      version: 1,
      contentRevision: 3,
      page: 1,
      block: 0,
      answers: { [task.id]: completed },
    }),
    book,
  );
  assert.deepEqual(saved.answers[task.id].practical, completed.practical);
  assert.ok(isCorrect(task, saved.answers[task.id]));
  const invalid = parseProgress(
    JSON.stringify({
      version: 1,
      contentRevision: 3,
      page: 1,
      block: 0,
      answers: {
        [task.id]: {
          practical: {
            first: { counts: [-1], confirmed: true },
            add: { counts: [4], confirmed: true },
          },
        },
      },
    }),
    book,
  );
  assert.equal(isCorrect(task, invalid.answers[task.id]), false);
});
test("saved choices cannot change the length of a fixed source line", () => {
  const step = {
    id: "line",
    instruction: "Начерти 10 см",
    mode: "draw" as const,
    lengths: [10],
    counts: [],
  };
  const original = practicalTrace(step),
    forged = practicalTrace(step, { choices: { length0: 1 } });
  assert.deepEqual(forged, original);
});
test("long line gestures fit a mobile viewport and still cover every source centimetre", () => {
  const plan = practicalTrace({
    id: "line",
    instruction: "40 см",
    mode: "draw",
    lengths: [40],
    counts: [],
  });
  const targets = plan.stages[0];
  assert.equal(targets.length, 5);
  assert.equal(targets[0].points[0].x * plan.columns, 1);
  assert.equal(targets.at(-1)!.points.at(-1)!.x * plan.columns, 41);
  for (let i = 0; i < targets.length; i++) {
    assert.ok(
      (targets[i].points[1].x - targets[i].points[0].x) * plan.columns * 28 <=
        225,
    );
    if (i) assert.deepEqual(targets[i - 1].points[1], targets[i].points[0]);
  }
});
