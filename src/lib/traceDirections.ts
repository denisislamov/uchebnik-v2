import type { TraceTarget, Point } from "../content/types.ts";

type TraceArrow = { point: Point; direction: Point };

/** Place guides in notebook cells; opposite directions use separate lanes. */
export function traceDirections(
  target: TraceTarget,
  grid: { columns: number; rows: number },
): TraceArrow[] {
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
  const count = target.bidirectional
    ? 1
    : Math.max(1, Math.min(12, Math.round(length)));
  const arrows = Array.from({ length: count }, (_, i) => {
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
  if (!target.bidirectional) return arrows;
  const { point, direction } = arrows[0];
  // Two separate arrows beside the line, never opposing heads at the same point.
  return [1, -1].map((sign) => ({
    point: {
      x: point.x - direction.y * 0.6 * sign,
      y: point.y + direction.x * 0.6 * sign,
    },
    direction: { x: direction.x * sign, y: direction.y * sign },
  }));
}

/** Pixel geometry keeps arrows legible even on a narrow phone notebook. */
export function traceArrowGeometry(
  { point, direction }: TraceArrow,
  cellSize: number,
) {
  const length = Math.max(22, Math.min(34, cellSize * 0.8));
  const head = length * 0.4;
  const halfWidth = Math.max(6, length * 0.22);
  const center = { x: point.x * cellSize, y: point.y * cellSize };
  const tip = {
    x: center.x + (direction.x * length) / 2,
    y: center.y + (direction.y * length) / 2,
  };
  const tail = {
    x: center.x - (direction.x * length) / 2,
    y: center.y - (direction.y * length) / 2,
  };
  const base = { x: tip.x - direction.x * head, y: tip.y - direction.y * head };
  return {
    tip,
    tail,
    left: {
      x: base.x - direction.y * halfWidth,
      y: base.y + direction.x * halfWidth,
    },
    right: {
      x: base.x + direction.y * halfWidth,
      y: base.y - direction.x * halfWidth,
    },
  };
}
