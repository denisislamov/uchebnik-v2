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
