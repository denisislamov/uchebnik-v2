/** One notebook cell. Sizes and places of the page's furniture are counted in cells. */
export const CELL = 24;
export const cells = (n: number) => n * CELL;
/** The widest whole number of cells that fits into `px`. */
export const wholeCells = (px: number, least = 1) =>
  Math.max(least, Math.floor(px / CELL)) * CELL;

/** The least whole number of cells that holds `px`. */
export const upToCells = (px: number) => Math.ceil((px - 0.5) / CELL) * CELL;
/**
 * Text written on the sheet: a line of text takes one row of cells, a heading
 * two, and the letters stand a little above the ruled line under them, as a
 * hand writes them. Small text fits a row as it is; a heading has to be moved
 * down to its line, by as much as its font leaves above the baseline.
 */
export function written(fontSize: number, rows: 1 | 2 = 1, hand = false) {
  const lineHeight = rows * CELL,
    // Where the font puts the baseline in a line of this height.
    baseline = lineHeight / 2 + fontSize * (hand ? 0.23 : 0.42),
    shift = Math.round(lineHeight - 4 - baseline);
  return {
    fontSize,
    lineHeight,
    ...(shift > 2 && { position: "relative" as const, top: shift }),
  };
}

/** The same seed always draws the same line: a frame must not twitch on re-render. */
export function handRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    // From −1 to 1.
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}
const round = (v: number) => Math.round(v * 10) / 10;
export type HandStroke = {
  /** How far the pen strays from the ruled line, px. */
  wobble?: number;
  /** How far a stroke may run past its corner, px. */
  overshoot?: number;
};
/**
 * A line drawn by hand along a ruled one: it starts and ends a little off,
 * bends slightly and may run past the corner. Never further than `wobble`
 * across and `overshoot` along, so it still reads as the ruled line.
 */
export function handLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  random: () => number,
  { wobble = 1, overshoot = 2.5 }: HandStroke = {},
) {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1,
    ux = (x2 - x1) / length,
    uy = (y2 - y1) / length,
    // Across the line.
    nx = -uy,
    ny = ux;
  const point = (along: number, across: number) =>
    `${round(x1 + ux * along + nx * across)} ${round(y1 + uy * along + ny * across)}`;
  const before = Math.abs(random()) * overshoot,
    after = Math.abs(random()) * overshoot,
    bend = random() * wobble;
  return (
    `M ${point(-before, random() * wobble * 0.6)} ` +
    `C ${point(length / 3, bend)} ${point((length * 2) / 3, -bend * 0.6 + random() * wobble * 0.4)} ` +
    `${point(length + after, random() * wobble * 0.6)}`
  );
}
/** Four strokes of a box, each drawn on its own as a hand does. */
export function handRect(
  width: number,
  height: number,
  seed: string,
  stroke: HandStroke = {},
) {
  const random = handRandom(seed);
  // A small box is drawn with a steadier hand: the pen has less way to stray.
  const small = Math.min(1, Math.min(width, height) / 96);
  stroke = {
    wobble: (stroke.wobble ?? 1) * (0.5 + small / 2),
    overshoot: (stroke.overshoot ?? 2.5) * (0.3 + small * 0.7),
  };
  return [
    handLine(0, 0, width, 0, random, stroke),
    handLine(width, 0, width, height, random, stroke),
    handLine(width, height, 0, height, random, stroke),
    handLine(0, height, 0, 0, random, stroke),
  ].join(" ");
}
