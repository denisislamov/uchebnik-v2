import type { TraceTarget, Point } from "../content/types.ts";

import { isClosedTrace } from "./tracing.ts";

type TraceArrow = { point: Point; direction: Point };

/** One cue beside the current trace keeps the notebook and child's ink visible. */
export function traceDirections(
  target: TraceTarget,
  grid: { columns: number; rows: number },
  surrounding: TraceTarget[] = [],
): TraceArrow[] {
  if (target.dot || isClosedTrace(target, grid)) return [];
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
  const at = (fraction: number): TraceArrow => {
    let distance = length * fraction;
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
  };
  const beside = (
    { point, direction }: TraceArrow,
    side: number,
  ): TraceArrow => ({
    point: {
      x: point.x - direction.y * 0.55 * side,
      y: point.y + direction.x * 0.55 * side,
    },
    direction,
  });
  const obstacles = [target, ...surrounding].flatMap((trace) => {
    const points = trace.points.map((p) => ({
      x: p.x * grid.columns,
      y: p.y * grid.rows,
    }));
    return points.map((end, i) => {
      const start = points[Math.max(0, i - 1)];
      return {
        start,
        end,
        length: Math.hypot(end.x - start.x, end.y - start.y),
      };
    });
  });
  // A midpoint can be a sharp turn or the inside of a digit. Try both sides
  // and nearby parts of the path, preferring the one with room for the cue.
  const clearance = ({ point }: TraceArrow) =>
    Math.min(
      point.x,
      grid.columns - point.x,
      point.y,
      grid.rows - point.y,
      ...obstacles.map(({ start, end, length }) => {
        const dx = end.x - start.x,
          dy = end.y - start.y;
        const fraction = Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) /
              (length * length || 1),
          ),
        );
        return Math.hypot(
          point.x - start.x - fraction * dx,
          point.y - start.y - fraction * dy,
        );
      }),
    );
  const candidatesAt = (fraction: number, side: number) => {
    const forward = beside(at(fraction), side);
    if (!target.bidirectional) return [forward];
    const backward = beside(at(fraction), -side);
    backward.direction = { x: -backward.direction.x, y: -backward.direction.y };
    return [forward, backward];
  };
  const room = (arrows: TraceArrow[]) => Math.min(...arrows.map(clearance));
  let best = candidatesAt(0.5, 1);
  for (const fraction of [0.5, 0.25, 0.75, 0.125, 0.875]) {
    for (const side of [1, -1]) {
      const candidate = candidatesAt(fraction, side);
      if (room(candidate) > room(best) + 1e-6) best = candidate;
    }
  }
  return best;
}

/** Compact pixel geometry stays legible without filling a notebook cell. */
export function traceArrowGeometry(
  { point, direction }: TraceArrow,
  cellSize: number,
) {
  const length = Math.max(8, Math.min(14, cellSize * 0.4));
  const head = length * 0.4;
  const halfWidth = length * 0.22;
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
