import type { Point } from "../content/types.ts";
export type DemoKind = "tap" | "count" | "inspect" | "trace" | "drag";
export function demoDuration(kind: DemoKind, points: Point[]) {
  return kind === "count" || kind === "inspect"
    ? Math.max(1, points.length) * 1200
    : kind === "tap"
      ? 1600
      : kind === "drag"
        ? 2800
        : 3600;
}
export function pointAlong(
  points: Point[],
  fraction: number,
): { point: Point; trail: Point[] } {
  if (!points.length) return { point: { x: 0, y: 0 }, trail: [] };
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  const total = lengths.reduce((a, b) => a + b, 0);
  let remaining = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i] > 0) {
      const r = remaining / lengths[i];
      const p = {
        x: points[i].x + (points[i + 1].x - points[i].x) * r,
        y: points[i].y + (points[i + 1].y - points[i].y) * r,
      };
      return { point: p, trail: [...points.slice(0, i + 1), p] };
    }
    remaining -= lengths[i];
  }
  return { point: points.at(-1)!, trail: points };
}
export function demoFrame(kind: DemoKind, points: Point[], elapsed: number) {
  const duration = demoDuration(kind, points),
    done = elapsed >= duration;
  if (kind === "count" || kind === "inspect") {
    const index = Math.min(
      points.length - 1,
      Math.max(0, Math.floor(elapsed / 1200)),
    );
    const previous = points[Math.max(0, index - 1)] ?? { x: 0, y: 0 },
      target = points[index] ?? previous;
    const travel =
      done || index === 0 ? 1 : Math.min(1, (elapsed % 1200) / 280);
    return {
      point:
        travel === 1
          ? target
          : {
              x: previous.x + (target.x - previous.x) * travel,
              y: previous.y + (target.y - previous.y) * travel,
            },
      trail: [],
      index,
      pressing: travel === 1 && !done,
      done,
    };
  }
  const fraction =
    kind === "tap"
      ? 0
      : Math.max(
          0,
          Math.min(1, (elapsed - 450) / (kind === "drag" ? 1800 : 2700)),
        );
  const sample = pointAlong(points, fraction);
  return {
    ...sample,
    index: 0,
    pressing: elapsed < duration - 350 && !done,
    done,
  };
}
