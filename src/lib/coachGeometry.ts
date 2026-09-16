import type { Point } from "../content/types.ts";
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
