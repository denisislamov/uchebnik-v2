import type { Hotspot, Point } from "../content/types.ts";
export function containsPoint(t: Hotspot, p: Point) {
  if (t.polygon) {
    let inside = false;
    const v = t.polygon;
    for (let i = 0, j = v.length - 1; i < v.length; j = i++)
      if (
        v[i].y > p.y !== v[j].y > p.y &&
        p.x < ((v[j].x - v[i].x) * (p.y - v[i].y)) / (v[j].y - v[i].y) + v[i].x
      )
        inside = !inside;
    return inside;
  }
  if (t.ellipse)
    return (
      ((p.x - t.x - t.w / 2) / (t.w / 2)) ** 2 +
        ((p.y - t.y - t.h / 2) / (t.h / 2)) ** 2 <=
      1
    );
  return p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h;
}
// Grow each dimension by 25%, with at least 8 screen pixels of padding per side.
// Exact geometry wins over the halo of a neighbour; halos never depend on answers.
export function pickTarget(
  targets: Hotspot[],
  p: Point,
  width: number,
  height: number,
): Hotspot | undefined {
  if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return undefined;
  const exact = targets.filter((t) => containsPoint(t, p));
  const candidates = exact.length
    ? exact
    : targets.filter((t) => {
        const padX = Math.max(t.w * 0.125, 8 / width),
          padY = Math.max(t.h * 0.125, 8 / height);
        const expandedPoint = {
          x: t.x + t.w / 2 + ((p.x - t.x - t.w / 2) * t.w) / (t.w + padX * 2),
          y: t.y + t.h / 2 + ((p.y - t.y - t.h / 2) * t.h) / (t.h + padY * 2),
        };
        return containsPoint(t, expandedPoint);
      });
  return candidates.sort(
    (a, b) =>
      Math.hypot(
        (p.x - a.x - a.w / 2) * width,
        (p.y - a.y - a.h / 2) * height,
      ) -
      Math.hypot((p.x - b.x - b.w / 2) * width, (p.y - b.y - b.h / 2) * height),
  )[0];
}
