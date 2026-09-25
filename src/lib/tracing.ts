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
export const DRAWING_COLORS = ["#111111", "#d62828", "#1565c0"];
/**
 * Tolerances are expressed in cells so they scale with the notebook, but on a
 * phone a cell is ~29 px and a fingertip cannot hit a 9 px target. A stroke that
 * knows its on-screen cell size gets these physical minimums as well.
 */
export const TOUCH_MIN_PX = {
  dotRadius: 24,
  dotTravel: 32,
  endpoint: 18,
  meanError: 12,
  outlier: 22,
  closeGap: 22,
};
export const drawingColor = (color: string) =>
  ({
    "#23594e": "#1565c0",
    "#2563a6": "#1565c0",
    "#232d2b": "#111111",
    "#ce6548": "#d62828",
  })[color] ?? color;
export function isClosedTrace(
  target: TraceTarget,
  grid: { columns: number; rows: number },
) {
  const a = target.points[0],
    b = target.points.at(-1);
  return (
    !target.dot &&
    target.points.length > 2 &&
    !!a &&
    !!b &&
    Math.hypot((a.x - b.x) * grid.columns, (a.y - b.y) * grid.rows) < 0.05
  );
}
export function matchesTrace(
  stroke: Stroke,
  target: TraceTarget,
  grid: { columns: number; rows: number } = { columns: 12, rows: 8 },
): boolean {
  if (target.bidirectional) {
    const oneWay = { ...target, bidirectional: false };
    return (
      matchesTrace(stroke, oneWay, grid) ||
      matchesTrace(
        stroke,
        { ...oneWay, points: [...oneWay.points].reverse() },
        grid,
      )
    );
  }
  const closed = isClosedTrace(target, grid);
  const toCells = (p: Point): Point => ({
    x: p.x * grid.columns,
    y: p.y * grid.rows,
  });
  stroke = { ...stroke, points: stroke.points.map(toCells) };
  target = { ...target, points: target.points.map(toCells) };
  const atLeast = (cells: number, px: number) =>
    stroke.cellPx ? Math.max(cells, px / stroke.cellPx) : cells;
  if (
    drawingColor(stroke.color) !== drawingColor(target.color) ||
    !stroke.points.length ||
    stroke.points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    return false;
  if (target.dot)
    return (
      length(stroke.points) < atLeast(0.65, TOUCH_MIN_PX.dotTravel) &&
      stroke.points.every(
        (p) =>
          dist(p, target.points[0]) <= atLeast(0.48, TOUCH_MIN_PX.dotRadius),
      )
    );
  if (stroke.points.length < 2) return false;
  const actualLength = length(stroke.points),
    expectedLength = length(target.points);
  if (
    actualLength < expectedLength * 0.7 ||
    actualLength > expectedLength * 1.5
  )
    return false;
  if (closed) {
    if (
      dist(stroke.points[0], stroke.points.at(-1)!) >
      atLeast(target.grid ? 0.4 : 0.6, TOUCH_MIN_PX.closeGap)
    )
      return false;
    const actual = resample(stroke.points, 81).slice(0, -1),
      expected = resample(target.points, 81).slice(0, -1);
    for (const route of [expected, [...expected].reverse()]) {
      for (let shift = 0; shift < route.length; shift++) {
        const errors = actual.map((p, i) =>
          dist(p, route[(i + shift) % route.length]),
        );
        if (
          errors.reduce((n, e) => n + e, 0) / errors.length <
            atLeast(target.grid ? 0.22 : 0.42, TOUCH_MIN_PX.meanError) &&
          errors.filter(
            (e) => e > atLeast(target.grid ? 0.4 : 0.7, TOUCH_MIN_PX.outlier),
          ).length <
            errors.length * 0.1
        )
          return true;
      }
    }
    return false;
  }
  const endpoint = atLeast(target.grid ? 0.3 : 0.65, TOUCH_MIN_PX.endpoint);
  if (
    dist(stroke.points[0], target.points[0]) > endpoint ||
    dist(stroke.points.at(-1)!, target.points.at(-1)!) > endpoint
  )
    return false;
  const actual = resample(stroke.points),
    expected = resample(target.points);
  const errors = actual.map((p, i) => dist(p, expected[i]));
  return (
    errors.reduce((s, e) => s + e, 0) / errors.length <
      atLeast(target.grid ? 0.22 : 0.42, TOUCH_MIN_PX.meanError) &&
    errors.filter(
      (e) => e > atLeast(target.grid ? 0.4 : 0.7, TOUCH_MIN_PX.outlier),
    ).length <
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
