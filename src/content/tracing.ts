import type { Point, TracePlan, TraceTarget } from "./types.ts";
export const INK = "#232d2b",
  RED = "#ce6548",
  GREEN = "#23594e";
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
  curve(
    (t) => [x + t * 2, y - 0.45 * Math.sin(t * 2 * Math.PI)],
    "Проведи волну",
  );
const hook = (x: number, y: number) =>
  curve(
    (t) => [x + t * 1.7, y - Math.sin(t * Math.PI) * 0.8 + t * 0.6],
    "Обведи крючок",
  );
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
      .push(...make(1 + (slot % 2) * 5, 1.5 + Math.floor(slot / 2) * 2.3, i));
  }
  return { columns: 12, rows: 8, stages };
}
const digit = (n: string, x = 4, y = 1): TraceTarget[] => {
  if (n === "1")
    return [
      line(
        [
          [x, y + 1],
          [x + 1, y],
          [x + 1, y + 5],
        ],
        "Напиши цифру 1",
      ),
    ];
  if (n === "2")
    return [
      curve(
        (t) =>
          t < 0.5
            ? [
                x + 1.4 - 1.4 * Math.cos(t * 2 * Math.PI),
                y + 1.2 - 1.2 * Math.sin(t * 2 * Math.PI),
              ]
            : t < 0.85
              ? [
                  x + 2.8 - ((t - 0.5) / 0.35) * 2.8,
                  y + 1.2 + ((t - 0.5) / 0.35) * 3.8,
                ]
              : [x + ((t - 0.85) / 0.15) * 2.8, y + 5],
        "Напиши цифру 2",
      ),
    ];
  return [
    curve(
      (t) => [x + 2.5 * Math.sin((t * 2 * Math.PI) % Math.PI), y + 5 * t],
      "Напиши цифру 3",
    ),
  ];
};
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
        [6, 7],
      ],
      "Проведи ствол",
    ),
    ...Array.from({ length: n }, (_, i) =>
      line(
        [
          [6 - (i + 1) * 0.6, 2 + i],
          [6, 1 + i],
          [6 + (i + 1) * 0.6, 2 + i],
        ],
        "Нарисуй ярус веток",
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
          [1 + (i % 4) * 2.5, 2 + Math.floor(i / 4) * 3],
          [2.5 + (i % 4) * 2.5, 2 + Math.floor(i / 4) * 3],
        ],
        "Проведи чёрточку",
      ),
    ),
    Array.from({ length: 8 }, (_, i) =>
      dot(2 + (i % 4) * 2.5, 2 + Math.floor(i / 4) * 3, INK),
    ),
    Array.from({ length: 4 }, (_, i) =>
      line(
        [
          [1 + i * 2.5, 5],
          [2 + i * 2.5, 2],
        ],
        "Проведи наклонную палочку",
      ),
    ),
  ],
};
const fruit = (n: number, mushroom = false): TracePlan => ({
  columns: 12,
  rows: 8,
  stages: [
    ...Array.from({ length: n }, () =>
      mushroom
        ? [
            curve(
              (t) => [
                6 - 3 * Math.cos(t * Math.PI),
                4 - 2.4 * Math.sin(t * Math.PI),
              ],
              "Нарисуй шляпку",
            ),
            line(
              [
                [9, 4],
                [3, 4],
              ],
              "Закрой шляпку",
            ),
            line(
              [
                [5, 4],
                [5, 6],
                [7, 6],
                [7, 4],
              ],
              "Нарисуй ножку",
            ),
          ]
        : [
            oval(6, 4, 1.7, n === 2 ? 2 : 1.5),
            line(
              [
                [6, 2.5],
                [7, 1],
              ],
              "Нарисуй черенок",
            ),
          ],
    ),
    digit(String(n)),
  ],
});
export const tracePlans: Record<string, TracePlan> = {
  "p003-block06": repeated(12, (x, y, i) => [
    line(
      [
        [x, y],
        [x + 2, y],
      ],
      "Проведи чёрточку",
    ),
    ...(i < 11 ? [dot(x + 3, y)] : []),
  ]),
  "p004-block07": squares,
  "p004-block08": trees,
  "p004-block09": repeated(12, (x, y, i) => [
    line(
      [
        [x, y],
        [x + 2, y],
      ],
      "Проведи чёрточку",
    ),
    ...(i < 11 ? [dot(x + 3, y)] : []),
  ]),
  "p005-block04": marks,
  "p005-block05": repeated(12, (x, y, i) => [
    wave(x, y),
    ...(i < 11 ? [dot(x + 3, y)] : []),
  ]),
  "p006-block06": repeated(12, (x, y) => [
    oval(x + 1, y, 0.65, 0.65),
    dot(x + 1, y),
  ]),
  "p006-block07": repeated(12, (x, y) => [hook(x, y)]),
  "p006-block08": repeated(12, (x, y, i) => [
    wave(x, y),
    ...(i < 11 ? [dot(x + 3, y, GREEN)] : []),
  ]),
  "p007-block09": { columns: 12, rows: 8, stages: [digit("1")] },
  "p007-block10": fruit(1, true),
  "p008-block14": { columns: 12, rows: 8, stages: [digit("2")] },
  "p008-block15": fruit(2),
  "p009-block06": {
    columns: 12,
    rows: 8,
    stages: [
      [
        [1, 1],
        [4, 1],
        [7, 1],
        [10, 1],
      ].map(([x, y], i) => {
        const w = i === 1 ? 2 : 1,
          h = i === 2 ? 2 : 1;
        return line(
          [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h],
            [x, y],
          ],
          "Обведи фигуру по клеткам",
        );
      }),
    ],
  },
  "p010-block08": { columns: 12, rows: 8, stages: [digit("3")] },
  "p010-block11": fruit(3),
};
