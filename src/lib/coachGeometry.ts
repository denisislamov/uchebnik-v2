import type { Point } from "../content/types.ts";
import type { CoachRect } from "./gestureCoach.ts";

/** Reserve separate areas for the explanation and the complete gesture, not its moving finger. */
export function mobileCoachLayout(
  focus: CoachRect,
  viewport: CoachRect,
  cardSize: { width: number; height: number },
  scroll: { top: number; max: number },
) {
  const gap = 12;
  const bottom = viewport.y + viewport.height;
  const right = viewport.x + viewport.width;
  const candidates =
    cardSize.width < viewport.width * 0.6
      ? [
          {
            card: {
              x: right - cardSize.width - gap,
              y: bottom - cardSize.height - gap,
            },
            space: {
              x: viewport.x + gap,
              y: viewport.y + gap,
              width: viewport.width - cardSize.width - gap * 3,
              height: viewport.height - gap * 2,
            },
          },
          {
            card: { x: viewport.x + gap, y: bottom - cardSize.height - gap },
            space: {
              x: viewport.x + cardSize.width + gap * 2,
              y: viewport.y + gap,
              width: viewport.width - cardSize.width - gap * 3,
              height: viewport.height - gap * 2,
            },
          },
        ]
      : [
          {
            card: {
              x: viewport.x + (viewport.width - cardSize.width) / 2,
              y: bottom - cardSize.height - gap,
            },
            space: {
              x: viewport.x + gap,
              y: viewport.y + gap,
              width: viewport.width - gap * 2,
              height: viewport.height - cardSize.height - gap * 3,
            },
          },
          {
            card: {
              x: viewport.x + (viewport.width - cardSize.width) / 2,
              y: viewport.y + gap,
            },
            space: {
              x: viewport.x + gap,
              y: viewport.y + cardSize.height + gap * 2,
              width: viewport.width - gap * 2,
              height: bottom - (viewport.y + cardSize.height + gap * 2) - gap,
            },
          },
        ];
  const layouts = candidates.map(({ card, space }) => {
    space.height = Math.max(1, space.height);
    const delta =
      focus.height > space.height
        ? focus.y - space.y
        : focus.y < space.y || focus.y + focus.height > space.y + space.height
          ? focus.y + focus.height / 2 - (space.y + space.height / 2)
          : 0;
    const scrollDelta = Math.max(
      -scroll.top,
      Math.min(scroll.max - scroll.top, delta),
    );
    const fits =
      focus.x >= space.x &&
      focus.x + focus.width <= space.x + space.width &&
      focus.y - scrollDelta >= space.y - 0.5 &&
      focus.y + focus.height - scrollDelta <= space.y + space.height + 0.5;
    return { card, space, scrollDelta, fits };
  });
  return layouts.reduce((best, next) =>
    (next.fits &&
      (!best.fits ||
        Math.abs(next.scrollDelta) < Math.abs(best.scrollDelta))) ||
    (!next.fits &&
      !best.fits &&
      next.space.width * next.space.height >
        best.space.width * best.space.height)
      ? next
      : best,
  );
}

/** Position only the floating card inside the lesson pane; the lesson is never moved to make room. */
export function coachCardPosition(
  focus: CoachRect | null,
  viewport: { x?: number; y?: number; width: number; height: number },
  card: { width: number; height: number },
): Point {
  const vx = viewport.x ?? 0,
    vy = viewport.y ?? 0;
  const left = vx + 12,
    right = Math.max(left, vx + viewport.width - card.width - 12);
  const top = vy + 12,
    bottom = Math.max(top, vy + viewport.height - card.height - 12);
  const center = vx + (viewport.width - card.width) / 2;
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
