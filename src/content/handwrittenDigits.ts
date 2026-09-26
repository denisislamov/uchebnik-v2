// Centerlines traced in pixel coordinates of the original extracted writing samples.
// Keep source registration for visual comparison instead of substituting a font.
import type { Point } from "./types.ts";
type Command =
  | ["M" | "L", number, number]
  | ["C", number, number, number, number, number, number];
export const digitSamples: Record<
  string,
  { asset: string; origin: Point; cell: number; strokes: Command[][] }
> = {
  "1": {
    asset: "p007_digit_1_sample",
    origin: { x: 54, y: 23 },
    cell: 30,
    strokes: [
      [
        ["M", 56, 43],
        ["L", 79, 23],
        ["L", 58, 83],
      ],
    ],
  },
  "2": {
    asset: "p008_digit_2_sample",
    origin: { x: 43, y: 19 },
    cell: 29,
    strokes: [
      [
        ["M", 63, 31],
        ["C", 53, 52, 43, 27, 62, 21],
        ["C", 76, 14, 78, 29, 63, 47],
        ["L", 43, 77],
        ["C", 53, 64, 58, 79, 65, 76],
        ["C", 69, 75, 71, 73, 73, 70],
      ],
    ],
  },
  "3": {
    asset: "p010_digit_3_sample",
    origin: { x: 48, y: 25 },
    cell: 30,
    strokes: [
      [
        ["M", 59, 33],
        ["C", 75, 17, 83, 29, 75, 42],
        ["C", 72, 47, 64, 50, 60, 50],
        ["C", 86, 48, 75, 73, 63, 82],
        ["C", 52, 91, 45, 80, 52, 76],
        ["C", 57, 77, 52, 81, 50, 79],
      ],
    ],
  },
  "4": {
    asset: "p012_digit_4_sample",
    origin: { x: 48, y: 20 },
    cell: 30,
    strokes: [
      [
        ["M", 63, 19],
        ["L", 47, 53],
        ["L", 64, 53],
      ],
      [
        ["M", 73, 37],
        ["L", 57, 75],
      ],
    ],
  },
  "5": {
    asset: "p014_digit_5_sample",
    origin: { x: 50, y: 27 },
    cell: 30,
    strokes: [
      [
        ["M", 88, 27],
        ["C", 77, 32, 76, 28, 70, 27],
        ["L", 59, 47],
        ["C", 81, 36, 77, 63, 60, 79],
        ["C", 48, 89, 44, 77, 49, 74],
        ["C", 54, 73, 50, 78, 49, 76],
      ],
    ],
  },
  "6": {
    asset: "p018_digit_6_sample",
    origin: { x: 55, y: 30 },
    cell: 30,
    strokes: [
      [
        ["M", 85, 40],
        ["C", 93, 39, 87, 27, 79, 33],
        ["C", 62, 44, 52, 69, 57, 84],
        ["C", 60, 98, 75, 88, 81, 70],
        ["C", 92, 45, 62, 49, 56, 70],
      ],
    ],
  },
  "7": {
    asset: "p022_digit_7_sample",
    origin: { x: 48, y: 23 },
    cell: 29,
    strokes: [
      [
        ["M", 47, 32],
        ["C", 54, 19, 54, 32, 58, 29],
        ["C", 63, 32, 70, 24, 74, 24],
        ["L", 54, 84],
      ],
      [
        ["M", 60, 48],
        ["C", 51, 51, 58, 57, 73, 49],
      ],
    ],
  },
  "8": {
    asset: "p024_digit_8_sample",
    origin: { x: 42, y: 21 },
    cell: 30,
    strokes: [
      [
        ["M", 55, 51],
        ["C", 50, 37, 63, 10, 70, 26],
        ["C", 78, 40, 36, 56, 42, 72],
        ["C", 44, 88, 65, 85, 63, 65],
        ["C", 62, 59, 58, 55, 55, 51],
      ],
    ],
  },
  "9": {
    asset: "p026_digit_9_sample",
    origin: { x: 44, y: 20 },
    cell: 29,
    strokes: [
      [
        ["M", 71, 27],
        ["C", 67, 8, 48, 28, 47, 46],
        ["C", 44, 66, 65, 59, 71, 32],
        ["C", 66, 50, 62, 68, 52, 76],
        ["C", 42, 84, 36, 72, 44, 70],
        ["C", 49, 70, 44, 76, 43, 73],
      ],
    ],
  },
  "0": {
    asset: "p028_digit_10_sample",
    origin: { x: 71, y: 20 },
    cell: 29,
    strokes: [
      [
        ["M", 96, 20],
        ["C", 118, 14, 90, 94, 75, 75],
        ["C", 61, 62, 83, 18, 96, 20],
      ],
    ],
  },
};
export function sampleDigit(digit: string): Point[][] {
  const sample = digitSamples[digit];
  return sample.strokes.map((commands) => {
    const points: Point[] = [];
    for (const command of commands) {
      if (command[0] === "C") {
        const p = points.at(-1)!;
        for (let i = 1; i <= 24; i++) {
          const t = i / 24,
            u = 1 - t;
          points.push({
            x:
              u * u * u * p.x +
              3 * u * u * t * command[1] +
              3 * u * t * t * command[3] +
              t * t * t * command[5],
            y:
              u * u * u * p.y +
              3 * u * u * t * command[2] +
              3 * u * t * t * command[4] +
              t * t * t * command[6],
          });
        }
      } else points.push({ x: command[1], y: command[2] });
    }
    return points.map((p) => ({
      x: (p.x - sample.origin.x) / sample.cell,
      y: (p.y - sample.origin.y) / sample.cell,
    }));
  });
}
