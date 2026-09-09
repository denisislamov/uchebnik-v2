import type {
  Answer,
  Block,
  TracePlan,
  TraceTarget,
} from "../content/types.ts";
/** Columns share a baseline and stay continuous, including quantities above six. */
export function relationPlan(
  block: Extract<Block, { kind: "relation" }>,
  answer: Answer,
): TracePlan {
  const cells = /клет|столбик/.test(block.prompt);
  const counts = ["left", "right"].map((key) =>
    Math.max(1, Math.min(20, Number(answer.responses?.[key]) || 1)),
  );
  const columns = 12,
    rows = cells ? Math.max(8, ...counts.map((n) => n + 2)) : 8;
  const stages: TraceTarget[][] = cells ? [[]] : [];
  counts.forEach((n, group) => {
    const targets: TraceTarget[] = [];
    for (let i = 0; i < n; i++) {
      const x = cells ? 2 + group * 4 : 1 + (i % 10),
        y = cells ? rows - 1 - n + i : 1 + Math.floor(i / 10) * 3;
      const points = cells
        ? [
            [x, y],
            [x + 1, y],
            [x + 1, y + 1],
            [x, y + 1],
            [x, y],
          ]
        : Array.from({ length: 49 }, (_, j) => [
            x + 0.5 + 0.45 * Math.cos((j / 48) * Math.PI * 2),
            y + 0.5 + 0.45 * Math.sin((j / 48) * Math.PI * 2),
          ]);
      targets.push({
        label: `${group === 0 ? "Первая" : "Вторая"} группа: ${cells ? "обведи клетку" : "нарисуй предмет"} ${i + 1}`,
        color: "#232d2b",
        grid: cells,
        points: points.map(([x, y]) => ({ x: x / columns, y: y / rows })),
      });
    }
    if (cells) stages[0].push(...targets);
    else stages.push(targets);
  });
  return { columns, rows, stages };
}
