import type {
  Point,
  Stroke,
  TracePlan,
  TraceTarget,
} from "../content/types.ts";
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const length = (p: Point[]) =>
  p.slice(1).reduce((sum, v, i) => sum + dist(v, p[i]), 0);
function resample(points: Point[], count = 40): Point[] {
  if (points.length < 2) return points;
  const total = length(points);
  if (!total) return Array(count).fill(points[0]);
  const result: Point[] = [points[0]];
  let cursor = 1,
    travelled = 0;
  for (let i = 1; i < count; i++) {
    const target = (i * total) / (count - 1);
    while (
      cursor < points.length - 1 &&
      travelled + dist(points[cursor - 1], points[cursor]) < target
    ) {
      travelled += dist(points[cursor - 1], points[cursor]);
      cursor++;
    }
    const a = points[cursor - 1],
      b = points[cursor],
      segment = dist(a, b),
      t = segment ? Math.min(1, (target - travelled) / segment) : 0;
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return result;
}
export function matchesTrace(
  stroke: Stroke,
  target: TraceTarget,
  grid: { columns: number; rows: number } = { columns: 12, rows: 8 },
): boolean {
  const toCells = (p: Point): Point => ({
    x: p.x * grid.columns,
    y: p.y * grid.rows,
  });
  stroke = { ...stroke, points: stroke.points.map(toCells) };
  target = { ...target, points: target.points.map(toCells) };
  if (
    stroke.color !== target.color ||
    !stroke.points.length ||
    stroke.points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    return false;
  if (target.dot)
    return (
      length(stroke.points) < 0.65 &&
      stroke.points.every((p) => dist(p, target.points[0]) <= 0.48)
    );
  if (stroke.points.length < 2) return false;
  const actualLength = length(stroke.points),
    expectedLength = length(target.points);
  if (
    actualLength < expectedLength * 0.7 ||
    actualLength > expectedLength * 1.5
  )
    return false;
  if (
    dist(stroke.points[0], target.points[0]) > (target.grid ? 0.3 : 0.65) ||
    dist(stroke.points.at(-1)!, target.points.at(-1)!) >
      (target.grid ? 0.3 : 0.65)
  )
    return false;
  const actual = resample(stroke.points),
    expected = resample(target.points);
  const errors = actual.map((p, i) => dist(p, expected[i]));
  return (
    errors.reduce((s, e) => s + e, 0) / errors.length <
      (target.grid ? 0.22 : 0.42) &&
    errors.filter((e) => e > (target.grid ? 0.4 : 0.7)).length <
      errors.length * 0.1
  );
}
export function traceProgress(plan: TracePlan, strokes: Stroke[] = []) {
  const targets = plan.stages.flat();
  let completed = 0;
  const accepted: Stroke[] = [];
  for (const stroke of strokes) {
    if (
      completed < targets.length &&
      matchesTrace(stroke, targets[completed], plan)
    ) {
      accepted.push(stroke);
      completed++;
    }
  }
  let stage = 0,
    start = 0;
  while (
    stage < plan.stages.length - 1 &&
    completed >= start + plan.stages[stage].length
  ) {
    start += plan.stages[stage].length;
    stage++;
  }
  return {
    completed,
    total: targets.length,
    done: completed === targets.length,
    stage,
    start,
    index: completed - start,
    accepted,
  };
}
