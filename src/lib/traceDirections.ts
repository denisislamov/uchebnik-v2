import type { TraceTarget, Point } from "../content/types.ts";

/** Place arrowheads along the actual ordered path, in notebook-cell coordinates. */
export function traceDirections(
  target: TraceTarget,
  grid: { columns: number; rows: number },
): { point: Point; direction: Point }[] {
  if (target.dot) return [];
  const points = target.points.map((p) => ({
    x: p.x * grid.columns,
    y: p.y * grid.rows,
  }));
  const segments = points
    .slice(1)
    .map((end, i) => {
      const start = points[i];
      return {
        start,
        end,
        length: Math.hypot(end.x - start.x, end.y - start.y),
      };
    })
    .filter((s) => s.length > 1e-8);
  const length = segments.reduce((n, s) => n + s.length, 0);
  if (!length) return [];
  const count = Math.max(1, Math.min(12, Math.round(length)));
  return Array.from({ length: count }, (_, i) => {
    let distance = (length * (i + 0.5)) / count;
    let segment = segments.at(-1)!;
    for (const s of segments) {
      segment = s;
      if (distance <= s.length) break;
      distance -= s.length;
    }
    const direction = {
      x: (segment.end.x - segment.start.x) / segment.length,
      y: (segment.end.y - segment.start.y) / segment.length,
    };
    return {
      point: {
        x: segment.start.x + direction.x * distance,
        y: segment.start.y + direction.y * distance,
      },
      direction,
    };
  });
}
