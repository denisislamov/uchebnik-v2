import { fullBookData } from "./fullBookData.ts";
import type {
  Block,
  BookPage,
  Point,
  TracePlan,
  TraceTarget,
} from "./types.ts";
const pt = (x: number, y: number): Point => ({ x: x / 12, y: y / 8 });
const path = (
  points: number[][],
  label = "Обведи по линиям клеток",
  grid = true,
): TraceTarget => ({
  points: points.map(([x, y]) => pt(x, y)),
  label,
  color: "#232d2b",
  grid,
});
const oval = (x: number, y: number, rx: number, ry: number) =>
  path(
    Array.from({ length: 49 }, (_, i) => [
      x + rx * Math.cos(-Math.PI / 2 + (i / 48) * Math.PI * 2),
      y + ry * Math.sin(-Math.PI / 2 + (i / 48) * Math.PI * 2),
    ]),
    "Обведи овал",
    false,
  );
export function numberTrace(n: number): TracePlan {
  const forms: Record<string, number[][][]> = {
    "1": [
      [
        [0, 0.5],
        [0.5, 0],
        [0.5, 2],
      ],
    ],
    "2": [
      [
        [0, 0.4],
        [0.15, 0.1],
        [0.5, 0],
        [0.85, 0.1],
        [1, 0.4],
        [0.9, 0.7],
        [0, 2],
        [1, 2],
      ],
    ],
    "3": [
      [
        [0, 0.15],
        [0.5, 0],
        [0.9, 0.3],
        [0.85, 0.65],
        [0.45, 0.9],
        [0.9, 1.1],
        [1, 1.5],
        [0.8, 1.85],
        [0.4, 2],
        [0, 1.8],
      ],
    ],
    "4": [
      [
        [0.3, 0],
        [0, 1.15],
        [1, 1.15],
      ],
      [
        [0.8, 0],
        [0.8, 2],
      ],
    ],
    "5": [
      [
        [0.85, 0],
        [0.25, 0],
        [0.1, 0.85],
        [0.65, 0.75],
        [1, 1.05],
        [0.95, 1.55],
        [0.65, 1.9],
        [0.2, 2],
        [0, 1.8],
      ],
    ],
    "6": [
      [
        [0.85, 0],
        [0.4, 0.2],
        [0.1, 0.75],
        [0, 1.4],
        [0.15, 1.9],
        [0.6, 2],
        [0.95, 1.7],
        [1, 1.2],
        [0.7, 0.9],
        [0.2, 1],
        [0, 1.4],
      ],
    ],
    "7": [
      [
        [0, 0],
        [1, 0],
        [0.3, 2],
      ],
      [
        [0.15, 0.9],
        [0.85, 0.9],
      ],
    ],
    "9": [
      [
        [0.9, 0.7],
        [0.8, 0.1],
        [0.4, 0],
        [0.05, 0.2],
        [0, 0.65],
        [0.3, 1],
        [0.7, 0.95],
        [0.9, 0.7],
        [0.85, 1.4],
        [0.55, 1.9],
        [0.1, 2],
      ],
    ],
  };
  const targets: TraceTarget[] = [];
  for (const [i, digit] of [...String(n)].entries()) {
    const x = 4 + i * 2,
      y = 2;
    if (digit === "0") targets.push(oval(x + 0.5, y + 1, 0.5, 1));
    else if (digit === "8")
      targets.push(
        oval(x + 0.5, y + 0.5, 0.45, 0.5),
        oval(x + 0.5, y + 1.5, 0.5, 0.5),
      );
    else
      targets.push(
        ...forms[digit].map((points) =>
          path(
            points.map(([a, b]) => [x + a, y + b]),
            `Напиши ${digit} в клетках`,
            false,
          ),
        ),
      );
  }
  return { columns: 12, rows: 8, stages: [targets] };
}
function cells(spec: string): TracePlan {
  const stages: TraceTarget[][] = [];
  for (const item of spec.split(",")) {
    const n = parseInt(item) || 1,
      vertical = item.endsWith("v"),
      x = 2,
      y = 1,
      targets: TraceTarget[] = [];
    // Each cell side is a distinct child action; shared sides occur only once.
    const edges = new Set<string>();
    for (let i = 0; i < n; i++) {
      const a = x + (vertical ? 0 : i),
        b = y + (vertical ? i : 0);
      for (const points of [
        [
          [a, b],
          [a + 1, b],
        ],
        [
          [a + 1, b],
          [a + 1, b + 1],
        ],
        [
          [a + 1, b + 1],
          [a, b + 1],
        ],
        [
          [a, b + 1],
          [a, b],
        ],
      ]) {
        const key = points
          .map((p) => p.join(","))
          .sort()
          .join("|");
        if (edges.has(key)) continue;
        edges.add(key);
        targets.push(path(points, "Обведи сторону клетки"));
      }
    }
    stages.push(targets);
  }
  return { columns: 12, rows: 8, stages };
}
function drawing(spec: string): TracePlan {
  const [kind, arg] = spec.split(":"),
    n = Number(arg);
  if (kind === "digit") return numberTrace(n);
  if (kind === "cells") return cells(arg);
  const stages: TraceTarget[][] = [];
  for (let i = 0; i < n; i++) {
    const x = 4,
      y = 2;
    if (kind === "flag") {
      const direction = i === n - 1 ? -1 : 1;
      stages.push([
        path(
          [
            [x, y + 3],
            [x, y],
          ],
          "Проведи древко по линии клеток",
        ),
        path(
          [
            [x, y],
            [x + 2 * direction, y],
            [x + 1.5 * direction, y + 0.5],
            [x + 2 * direction, y + 1],
            [x, y + 1],
          ],
          "Обведи флажок: две клетки и вырез",
          false,
        ),
      ]);
    } else if (kind === "tree")
      stages.push([
        path(
          [
            [x + 1, y],
            [x + 1, y + 3],
          ],
          "Проведи ствол",
        ),
        path(
          [
            [x, y + 1],
            [x + 1, y],
            [x + 2, y + 1],
          ],
          "Проведи диагонали",
        ),
        path(
          [
            [x, y + 2],
            [x + 1, y + 1],
            [x + 2, y + 2],
          ],
          "Проведи диагонали",
        ),
      ]);
    else if (kind === "mushroom")
      stages.push([
        path(
          [
            [x, y + 1],
            [x + 1, y],
            [x + 2, y + 1],
            [x, y + 1],
          ],
          "Нарисуй шляпку",
        ),
        path(
          [
            [x + 0.5, y + 1],
            [x + 0.5, y + 2],
            [x + 1.5, y + 2],
            [x + 1.5, y + 1],
          ],
          "Нарисуй ножку",
          false,
        ),
      ]);
    else
      stages.push([
        oval(x + 1, y + 1, 1, 1),
        path(
          [
            [x + 1, y],
            [x + 1.5, y - 1],
          ],
          kind === "ball" ? "Нарисуй ниточку" : "Нарисуй черенок",
          false,
        ),
      ]);
  }
  stages.push(...numberTrace(n).stages);
  return { columns: 12, rows: 8, stages };
}
function construction(
  shapes: string[],
): Pick<Extract<Block, { kind: "shape" }>, "vertices" | "edges"> {
  const vertices: Point[] = [],
    edges: [number, number][] = [];
  shapes.forEach((shape, i) => {
    const x = 0.06 + i * (0.9 / shapes.length),
      w = 0.75 / shapes.length,
      y = 0.25;
    let points: number[][] = [];
    if (shape === "star")
      points = Array.from({ length: 10 }, (_, j) => {
        const a = -Math.PI / 2 + (j * Math.PI) / 5,
          r = j % 2 ? 0.16 : 0.4;
        return [0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r];
      });
    else if (shape === "triangle")
      points = [
        [x, y + 0.4],
        [x + w / 2, y],
        [x + w, y + 0.4],
      ];
    else if (shape === "house")
      points = [
        [0.3, 0.8],
        [0.3, 0.4],
        [0.5, 0.15],
        [0.7, 0.4],
        [0.7, 0.8],
      ];
    else
      points = [
        [x, y],
        [x + w, y],
        [x + w, y + 0.4],
        [x, y + 0.4],
      ];
    const offset = vertices.length;
    vertices.push(...points.map(([x, y]) => ({ x, y })));
    points.forEach((_, j) =>
      edges.push([offset + j, offset + ((j + 1) % points.length)]),
    );
    if (shape === "house") edges.push([offset + 1, offset + 3]);
  });
  return { vertices, edges };
}
export const remainingPages: BookPage[] = fullBookData.map((page) => ({
  ...page,
  blocks: page.blocks.map((raw) => {
    const b = raw as any;
    if (b.kind === "trace")
      return {
        ...b,
        kind: "draw",
        trace: drawing(b.plan),
        rubric: "Линии и количество проверяются по образцу.",
      };
    if (b.kind === "construction")
      return { ...b, kind: "shape", ...construction(b.shapes) };
    return b as Block;
  }),
}));
