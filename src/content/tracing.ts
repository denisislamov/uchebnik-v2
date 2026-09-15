import { numberTrace } from "./fullBook.ts";
import type { Point, TracePlan, TraceTarget } from "./types.ts";
export const INK = "#111111",
  RED = "#d62828",
  BLUE = "#1565c0";
// Coordinates are in notebook cells: 12 columns by 8 rows on every device.
const point = (x: number, y: number): Point => ({ x: x / 12, y: y / 8 });
const line = (
  coords: number[][],
  label = "Проведи линию",
  color = INK,
): TraceTarget => ({
  label,
  color,
  points: coords.map(([x, y]) => point(x, y)),
  bidirectional: /ствол/.test(label),
  grid: coords.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)),
});
const dot = (x: number, y: number, color = RED): TraceTarget => ({
  label: "Поставь точку",
  color,
  dot: true,
  points: [point(x, y)],
});
const curve = (
  fn: (t: number) => number[],
  label: string,
  color = INK,
): TraceTarget =>
  line(
    Array.from({ length: 49 }, (_, i) => fn(i / 48)),
    label,
    color,
  );
const oval = (x: number, y: number, rx: number, ry: number) =>
  curve(
    (t) => [
      x + rx * Math.cos(-Math.PI / 2 + t * 2 * Math.PI),
      y + ry * Math.sin(-Math.PI / 2 + t * 2 * Math.PI),
    ],
    "Обведи овал",
  );
const wave = (x: number, y: number) =>
  curve((t) => [x + t, y - 0.12 * Math.sin(t * 2 * Math.PI)], "Проведи волну");
const hook = (x: number, y: number) =>
  curve((t) => {
    if (t < 0.6) {
      const angle = Math.PI * 0.6 + (t / 0.6) * Math.PI * 1.65;
      return [
        x + 0.5 + 0.35 * Math.cos(angle),
        y + 0.45 + 0.35 * Math.sin(angle),
      ];
    }
    const u = (t - 0.6) / 0.4;
    return [x + 0.75 * (1 - u), y + 0.7 + 1.3 * u];
  }, "Обведи крючок высотой в две клетки");
function repeated(
  count: number,
  make: (x: number, y: number, i: number) => TraceTarget[],
  perStage = 6,
): TracePlan {
  const stages: TraceTarget[][] = [];
  for (let i = 0; i < count; i++) {
    const slot = i % perStage;
    if (slot === 0) stages.push([]);
    stages
      .at(-1)!
      .push(...make(1 + (slot % 2) * 5, 1 + Math.floor(slot / 2) * 2, i));
  }
  return { columns: 12, rows: 8, stages };
}
const squares: TracePlan = repeated(10, (x, y, i) => [
  line(
    [
      [x, y],
      [x + 1, y],
      [x + 1, y + 1],
      [x, y + 1],
      [x, y],
    ],
    "Обведи квадрат",
  ),
  ...(i >= 5
    ? [
        line(
          [
            [x, y + 1],
            [x + 1, y],
          ],
          "Проведи диагональ",
        ),
      ]
    : []),
]);
const trees: TracePlan = {
  columns: 12,
  rows: 8,
  stages: [4, 3, 2].map((n) => [
    line(
      [
        [6, 1],
        [6, n + 2],
      ],
      "Проведи ствол по вертикальной линии клеток",
    ),
    ...Array.from({ length: n }, (_, i) =>
      line(
        [
          [5, 2 + i],
          [6, 1 + i],
          [7, 2 + i],
        ],
        "Проведи две диагонали соседних клеток",
      ),
    ),
  ]),
};
const marks: TracePlan = {
  columns: 12,
  rows: 8,
  stages: [
    Array.from({ length: 8 }, (_, i) =>
      line(
        [
          [1 + (i % 4) * 2, 2 + Math.floor(i / 4) * 3],
          [2 + (i % 4) * 2, 2 + Math.floor(i / 4) * 3],
        ],
        "Обведи одну горизонтальную сторону клетки",
      ),
    ),
    Array.from({ length: 8 }, (_, i) =>
      dot(2 + (i % 4) * 2, 2 + Math.floor(i / 4) * 3, INK),
    ),
    Array.from({ length: 4 }, (_, i) =>
      line(
        [
          [1 + i * 2, 4],
          [2 + i * 2, 2],
        ],
        "Из нижнего угла — на клетку вправо и две клетки вверх",
      ),
    ),
  ],
};
const fruit = (n: number, mushroom = false): TracePlan => {
  const targets: TraceTarget[] = [];
  for (let i = 0; i < n; i++) {
    const x = 6 + (i - (n - 1) / 2) * 3,
      y = 2.5;
    targets.push(
      ...(mushroom
        ? [
            curve(
              (t) => [
                x - 1.2 * Math.cos(t * Math.PI),
                y - Math.sin(t * Math.PI),
              ],
              "Нарисуй шляпку",
            ),
            line(
              [
                [x + 1.2, y],
                [x - 1.2, y],
              ],
              "Закрой шляпку",
            ),
            line(
              [
                [x - 0.4, y],
                [x - 0.4, y + 1],
                [x + 0.4, y + 1],
                [x + 0.4, y],
              ],
              "Нарисуй ножку",
            ),
          ]
        : [
            oval(x, y, 0.85, n === 2 ? 1 : 0.75),
            line(
              [
                [x, y - (n === 2 ? 1 : 0.75)],
                [x + 0.5, y - 1.6],
              ],
              "Нарисуй черенок",
            ),
          ]),
    );
  }
  targets.push(
    ...numberTrace(n)
      .stages.flat()
      .map((t) => ({
        ...t,
        points: t.points.map((p) => ({ ...p, y: p.y + 3.3 / 8 })),
      })),
  );
  return { columns: 12, rows: 8, stages: [targets] };
};
export const tracePlans: Record<string, TracePlan> = {
  "p003-block06": repeated(12, (x, y, i) => [
    line(
      [
        [x, y],
        [x + 1, y],
      ],
      "Обведи одну горизонтальную сторону клетки",
    ),
    ...(i < 11 ? [dot(x + 1.5, y)] : []),
  ]),
  "p004-block07": squares,
  "p004-block08": trees,
  "p004-block09": repeated(12, (x, y, i) => [
    line(
      [
        [x, y],
        [x + 1, y],
      ],
      "Обведи одну горизонтальную сторону клетки",
    ),
    ...(i < 11 ? [dot(x + 1.5, y)] : []),
  ]),
  "p005-block04": marks,
  "p005-block05": repeated(12, (x, y, i) => [
    wave(x, y),
    ...(i < 11 ? [dot(x + 1.5, y)] : []),
  ]),
  "p006-block06": repeated(12, (x, y) => [
    oval(x + 0.5, y + 0.5, 0.5, 0.5),
    dot(x + 0.5, y + 0.5),
  ]),
  "p006-block07": repeated(12, (x, y) => [hook(x, y)]),
  "p006-block08": repeated(12, (x, y) => [wave(x, y)]),
  "p007-block09": { columns: 12, rows: 8, stages: numberTrace(1).stages },
  "p007-block10": fruit(1, true),
  "p008-block14": { columns: 12, rows: 8, stages: numberTrace(2).stages },
  "p008-block15": fruit(2),
  "p009-block06": {
    columns: 12,
    rows: 8,
    stages: [
      [
        [1, 2],
        [4, 2],
        [7, 1],
        [10, 2],
      ].flatMap(([x, y], i) => {
        const w = i === 1 ? 2 : 1,
          h = i === 2 ? 2 : 1;
        return [
          line(
            [
              [x, y],
              [x + w, y],
              [x + w, y + h],
              [x, y + h],
              [x, y],
            ],
            "Обведи фигуру по клеткам",
          ),
          ...(w === 2
            ? [
                line(
                  [
                    [x + 1, y],
                    [x + 1, y + 1],
                  ],
                  "Обведи общую сторону двух клеток",
                ),
              ]
            : []),
          ...(h === 2
            ? [
                line(
                  [
                    [x, y + 1],
                    [x + 1, y + 1],
                  ],
                  "Обведи общую сторону двух клеток",
                ),
              ]
            : []),
        ];
      }),
    ],
  },
  "p010-block08": { columns: 12, rows: 8, stages: numberTrace(3).stages },
  "p010-block11": fruit(3),
};
