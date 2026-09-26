import type {
  Answer,
  Block,
  PracticalStep,
  PracticalState,
  TracePlan,
  TraceTarget,
} from "../content/types.ts";
import { traceProgress } from "./tracing.ts";

export function practicalTrace(
  step: PracticalStep,
  state?: PracticalState,
): TracePlan {
  const lengths = step.lengths?.map((n, i) =>
    step.chooseLengths?.includes(i) ? (state?.choices?.[`length${i}`] ?? n) : n,
  );
  const counts = step.counts.map((n, i) =>
    step.chooseCounts?.includes(i) ? (state?.choices?.[`count${i}`] ?? n) : n,
  );
  const square = step.token === "square";
  const width = lengths
    ? Math.max(...lengths)
    : Math.max(1, ...counts) * (square ? 1 : 1.5);
  const height = lengths
    ? lengths.length * 2
    : counts.length * (square ? 1 : 2);
  const columns = Math.max(width + 2, step.grid?.columns ?? 0, 6);
  const rows = Math.max(height + 2, step.grid?.rows ?? 0, 4);
  const targets: TraceTarget[] = [];
  const line = (points: number[][], label: string, grid = true) =>
    targets.push({
      label,
      color: "#111111",
      grid,
      bidirectional: true,
      points: points.map(([x, y]) => ({ x: x / columns, y: y / rows })),
    });
  if (lengths) {
    lengths.forEach((length, i) => {
      const y = 1 + i * 2;
      // Long worksheets scroll between completed sections; each gesture fits a phone.
      for (let start = 0; start < length; start += 8)
        line(
          [
            [1 + start, y],
            [1 + Math.min(length, start + 8), y],
          ],
          "Начерти отрезок по линейке",
        );
      const marks =
        step.cutAt !== undefined
          ? [step.cutAt]
          : step.divisions
            ? Array.from(
                { length: step.divisions - 1 },
                (_, j) => (length * (j + 1)) / step.divisions!,
              )
            : [];
      for (const at of marks)
        line(
          [
            [1 + at, y - 0.35],
            [1 + at, y + 0.35],
          ],
          "Отметь место деления",
          false,
        );
    });
  } else {
    counts.forEach((count, row) => {
      const y = 1 + row * (square ? 1 : 2);
      if (square) {
        line(
          [
            [1, y],
            [1 + count, y],
            [1 + count, y + 1],
            [1, y + 1],
            [1, y],
          ],
          "Обведи ряд клеток",
        );
      } else
        for (let i = 0; i < count; i++) {
          const x = 1 + i * 1.5;
          if (step.token === "stick")
            line(
              [
                [x, y],
                [x, y + 1],
              ],
              "Проведи палочку по линии клетки",
            );
          else
            line(
              Array.from({ length: 49 }, (_, j) => [
                x + 0.5 + 0.45 * Math.cos((j * Math.PI) / 24),
                y + 0.5 + 0.45 * Math.sin((j * Math.PI) / 24),
              ]),
              "Нарисуй кружок",
              false,
            );
        }
    });
    if (step.divisions && step.counts.length) {
      for (let j = 1; j < step.divisions; j++) {
        const x = 1 + (step.counts[0] * j) / step.divisions;
        line(
          [
            [x, 1],
            [x, 1 + step.counts.length],
          ],
          "Раздели фигуру на равные части",
        );
      }
    }
  }
  return { columns, rows, stages: [targets] };
}

export function practicalShape(
  step: PracticalStep,
): Extract<Block, { kind: "shape" }> {
  const count = step.counts.reduce((a, b) => a + b, 0);
  const cols = Math.ceil(Math.sqrt(count)),
    rows = Math.ceil(count / cols);
  const cell = 0.9 / Math.max(cols, rows),
    w = cell * 0.72;
  const vertices: { x: number; y: number }[] = [],
    edges: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const x = 0.05 + (i % cols) * cell,
      y = 0.05 + Math.floor(i / cols) * cell;
    const points =
      step.shape === "triangle"
        ? [
            { x, y: y + (w * Math.sqrt(3)) / 2 },
            { x: x + w / 2, y },
            { x: x + w, y: y + (w * Math.sqrt(3)) / 2 },
          ]
        : [
            { x, y },
            { x: x + w, y },
            { x: x + w, y: y + w },
            { x, y: y + w },
          ];
    const start = vertices.length;
    vertices.push(...points);
    for (let j = 0; j < points.length; j++)
      edges.push([start + j, start + ((j + 1) % points.length)]);
  }
  return {
    id: step.id,
    kind: "shape",
    title: step.instruction,
    prompt: step.instruction,
    images: [],
    vertices,
    edges,
  };
}
export function practicalStepCorrect(
  step: PracticalStep,
  state?: PracticalState,
): boolean {
  if (!state) return false;
  if (step.mode === "place" || step.mode === "cards")
    return (
      !!state.counts &&
      state.counts.length === step.counts.length &&
      step.counts.every(
        (n, i) => Number.isInteger(state.counts![i]) && state.counts![i] === n,
      )
    );
  if (step.mode === "draw")
    return (
      (step.chooseCounts ?? []).every(
        (i) => state.choices?.[`count${i}`] === step.counts[i],
      ) &&
      (step.chooseLengths ?? []).every(
        (i) => state.choices?.[`length${i}`] === step.lengths?.[i],
      ) &&
      traceProgress(practicalTrace(step, state), state.strokes).done
    );
  const shape = practicalShape(step);
  const expected = shape.edges.map(([a, b]) =>
    [a, b].sort((a, b) => a - b).join("-"),
  );
  return (
    !!state.edges &&
    state.edges.length === expected.length &&
    new Set(state.edges).size === expected.length &&
    expected.every((e) => state.edges!.includes(e))
  );
}
export function practicalCorrect(
  block: Extract<Block, { kind: "practical" }>,
  answer?: Answer,
): boolean {
  return (
    block.steps.length > 0 &&
    block.steps.every(
      (step) =>
        answer?.practical?.[step.id]?.confirmed === true &&
        practicalStepCorrect(step, answer.practical[step.id]),
    ) &&
    block.fields.every(
      (f) =>
        answer?.responses?.[f.id]?.trim().toLocaleLowerCase("ru") ===
        f.expected.toLocaleLowerCase("ru"),
    )
  );
}
/** Earlier edits invalidate dependent actions and final answers, never silently retain completion. */
export function updatePractical(
  block: Extract<Block, { kind: "practical" }>,
  answer: Answer,
  id: string,
  state: PracticalState,
): Answer {
  const index = block.steps.findIndex((s) => s.id === id),
    practical = { ...answer.practical };
  for (const later of block.steps.slice(index + 1)) delete practical[later.id];
  practical[id] = state;
  return { ...answer, practical, responses: {}, checked: false };
}
