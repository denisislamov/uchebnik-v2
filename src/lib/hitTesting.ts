import type { Hotspot, Point } from "../content/types.ts";
// Bounding-box centres can fall in empty space in a concave object (a chair,
// for example). Show a tap inside the same geometry used by hit testing.
export function hotspotTouchPoint(target: Hotspot): Point {
  const center = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
  if (!target.polygon || containsPoint(target, center)) return center;
  const vertices = target.polygon;
  const levels = [...new Set(vertices.map((p) => p.y))].sort((a, b) => a - b);
  const samples = [
    center.y,
    ...levels.slice(1).map((y, i) => (y + levels[i]) / 2),
  ];
  let best = center;
  let widest = 0;
  for (const y of samples) {
    const crossings: number[] = [];
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const a = vertices[j],
        b = vertices[i];
      if (a.y > y !== b.y > y)
        crossings.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const span = crossings[i + 1] - crossings[i];
      const point = { x: (crossings[i] + crossings[i + 1]) / 2, y };
      if (span > widest && containsPoint(target, point)) {
        widest = span;
        best = point;
      }
    }
  }
  return best;
}
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
