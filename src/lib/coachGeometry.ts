import type { Point } from "../content/types.ts";
import type { CoachRect } from "./gestureCoach.ts";

/** Position only the floating card; the lesson is never moved to make room. */
export function coachCardPosition(
  focus: CoachRect | null,
  viewport: { width: number; height: number },
  card: { width: number; height: number },
): Point {
  const left = 12,
    right = Math.max(left, viewport.width - card.width - 12);
  const top = 12,
    bottom = Math.max(top, viewport.height - card.height - 12);
  const center = (viewport.width - card.width) / 2;
  const candidates = [
    { x: center, y: bottom },
    { x: left, y: bottom },
    { x: right, y: bottom },
    { x: center, y: top },
    { x: left, y: top },
    { x: right, y: top },
  ];
  const overlap = ({ x, y }: Point) =>
    !focus
      ? 0
      : Math.max(
          0,
          Math.min(x + card.width, focus.x + focus.width + 12) -
            Math.max(x, focus.x - 12),
        ) *
        Math.max(
          0,
          Math.min(y + card.height, focus.y + focus.height + 12) -
            Math.max(y, focus.y - 12),
        );
  return candidates.reduce((best, p) =>
    overlap(p) < overlap(best) ? p : best,
  );
}
/** A single scale preserves square cells, angles and lengths in a shape preview. */
export function shapeDemoPoint(
  point: Point,
  width: number,
  height: number,
): Point {
  const scale = Math.min(width * 0.8, height * 0.56);
  return {
    x: (width - scale) / 2 + point.x * scale,
    y: height * 0.04 + point.y * scale,
  };
}
export function shapeDemoEdge(
  a: Point,
  b: Point,
  width: number,
  height: number,
) {
  const start = shapeDemoPoint(a, width, height),
    end = shapeDemoPoint(b, width, height);
  return {
    center: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    angle: (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI,
    length: Math.hypot(end.x - start.x, end.y - start.y),
  };
}
