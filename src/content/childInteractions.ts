import type { Block, Hotspot } from "./types.ts";
import { tracePlans } from "./tracing.ts";
const area = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label = id,
  image = 0,
): Hotspot => ({ id, x, y, w, h, label, image });
const polygon = (id: string, coords: number[][], label: string): Hotspot => {
  const xs = coords.map((p) => p[0]),
    ys = coords.map((p) => p[1]);
  return {
    ...area(
      id,
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
      label,
    ),
    polygon: coords.map(([x, y]) => ({ x, y })),
  };
};
const balls = [
  { ...area("left", 0.055, 0.08, 0.39, 0.82, "Левый мяч"), ellipse: true },
  { ...area("right", 0.69, 0.34, 0.235, 0.5, "Правый мяч"), ellipse: true },
];
const pencils = [
  polygon(
    "green",
    [
      [0.04, 0.59],
      [0.95, 0.13],
      [0.97, 0.28],
      [0.07, 0.8],
    ],
    "Зелёный карандаш",
  ),
  polygon(
    "red",
    [
      [0.43, 0.65],
      [0.84, 0.57],
      [0.86, 0.7],
      [0.44, 0.86],
    ],
    "Красный карандаш",
  ),
];
const upperBoard = [
  area("flag", 0.19, 0.15, 0.12, 0.18, "Флажок"),
  area("star", 0.64, 0.16, 0.14, 0.15, "Звёздочка"),
];
const lowerBoard = [
  area("house", 0.13, 0.37, 0.15, 0.16, "Домик"),
  area("tree", 0.57, 0.33, 0.12, 0.23, "Ёлочка"),
];
const maps: Record<
  string,
  { targets: Hotspot[]; expected: string[]; prompt: string }
> = {
  "p003-block02": {
    targets: balls,
    expected: ["left"],
    prompt: "Нажми на большой мяч.",
  },
  "p003-block03": {
    targets: balls,
    expected: ["right"],
    prompt: "Нажми на маленький мяч.",
  },
  "p003-block04": {
    targets: pencils,
    expected: ["green"],
    prompt: "Нажми на длинный карандаш.",
  },
  "p003-block05": {
    targets: pencils,
    expected: ["red"],
    prompt: "Нажми на короткий карандаш.",
  },
  "p006-block02": {
    targets: upperBoard,
    expected: ["flag"],
    prompt: "Нажми на рисунок вверху слева на доске.",
  },
  "p006-block03": {
    targets: upperBoard,
    expected: ["star"],
    prompt: "Нажми на рисунок вверху справа на доске.",
  },
  "p006-block04": {
    targets: lowerBoard,
    expected: ["house"],
    prompt: "Нажми на рисунок внизу слева на доске.",
  },
  "p006-block05": {
    targets: lowerBoard,
    expected: ["tree"],
    prompt: "Нажми на рисунок внизу справа на доске.",
  },
  "p007-block02": {
    targets: [
      area("one", 0.66, 0.2, 0.21, 0.67, "Один мальчик"),
      area("many", 0.3, 0.28, 0.32, 0.18, "Дети в глубине леса"),
    ],
    expected: ["many"],
    prompt: "Где много детей? Нажми на группу.",
  },
};
const digitRects = [
  [0.04, 0.6, 0.19, 0.35],
  [0.35, 0.59, 0.27, 0.29],
  [0.6, 0.64, 0.26, 0.3],
  [0.04, 0.62, 0.22, 0.32],
  [0.72, 0.67, 0.19, 0.29],
  [0.055, 0.68, 0.18, 0.28],
  [0.74, 0.65, 0.2, 0.31],
];
for (let n = 1; n <= 7; n++) {
  maps[`p001-block${String(n + 1).padStart(2, "0")}`] = {
    targets: [
      area(
        "digit",
        ...(digitRects[n - 1] as [number, number, number, number]),
        `Цифра ${n}`,
      ),
    ],
    expected: ["digit"],
    prompt: `Найди и нажми цифру ${n} на картинке.`,
  };
}
for (const [id, n, rect] of [
  ["p007-block08", 1, [0.37, 0.15, 0.24, 0.32]],
  ["p008-block09", 2, [0.35, 0.1, 0.38, 0.4]],
  ["p010-block07", 3, [0.3, 0.1, 0.35, 0.4]],
] as const) {
  maps[id] = {
    targets: [
      area("digit", rect[0], rect[1], rect[2], rect[3], `Цифра ${n} на монете`),
    ],
    expected: ["digit"],
    prompt: `Найди цифру ${n} на монете. Нажми на неё.`,
  };
}
for (const [id, index, n] of [
  ["p007-block07", 1, 1],
  ["p008-block08", 2, 2],
  ["p010-block06", 1, 3],
] as const) {
  maps[id] = {
    targets: [],
    expected: [`card-${index}`],
    prompt: `Найди цифру ${n}. Нажми на карточку с цифрой.`,
  };
}
const counts: Record<string, { label: string; rects: number[][] }> = {
  "p007-block03": { label: "гриб", rects: [[0.21, 0.17, 0.53, 0.65]] },
  "p007-block04": { label: "белку", rects: [[0.21, 0.08, 0.53, 0.74]] },
  "p007-block05": { label: "ежа", rects: [[0.16, 0.12, 0.75, 0.72]] },
  "p008-block02": {
    label: "конёк",
    rects: [
      [0.025, 0.12, 0.46, 0.68],
      [0.49, 0.08, 0.42, 0.81],
    ],
  },
  "p008-block04": {
    label: "колесо",
    rects: [
      [0.05, 0.45, 0.31, 0.51],
      [0.65, 0.44, 0.34, 0.54],
    ],
  },
  "p009-block01": {
    label: "птичку",
    rects: [
      [0.055, 0.23, 0.31, 0.61],
      [0.47, 0.06, 0.51, 0.6],
    ],
  },
  "p009-block04": {
    label: "ухо",
    rects: [
      [0.635, 0.08, 0.095, 0.37],
      [0.728, 0.1, 0.07, 0.34],
    ],
  },
  "p009-block05": {
    label: "крыло",
    rects: [
      [0.4, 0.035, 0.35, 0.54],
      [0.075, 0.59, 0.37, 0.35],
    ],
  },
  "p010-block02": {
    label: "мальчика",
    rects: [
      [0.115, 0.09, 0.11, 0.61],
      [0.28, 0.38, 0.145, 0.44],
      [0.415, 0.34, 0.2, 0.61],
    ],
  },
  "p010-block03": {
    label: "рыбу",
    rects: [
      [0.04, 0.04, 0.41, 0.55],
      [0.64, 0.05, 0.3, 0.6],
      [0.23, 0.53, 0.49, 0.39],
    ],
  },
  "p010-block04": {
    label: "ягоду",
    rects: [
      [0.68, 0.375, 0.115, 0.195],
      [0.865, 0.36, 0.083, 0.19],
      [0.56, 0.63, 0.15, 0.31],
    ],
  },
};
for (const [id, { label, rects }] of Object.entries(counts)) {
  const targets = rects.map((r, i) =>
    area(
      `object-${i}`,
      ...(r as [number, number, number, number]),
      `${label} ${i + 1}`,
    ),
  );
  maps[id] = {
    targets,
    expected: targets.map((t) => t.id),
    prompt: `Нажимай по одному: найди ${({ гриб: "гриб", белку: "белку", ежа: "ежа", конёк: "оба конька", колесо: "оба колеса", птичку: "обеих птичек", ухо: "оба уха", крыло: "оба крыла", мальчика: "всех мальчиков", рыбу: "всех рыб", ягоду: "все красные ягоды" } as Record<string, string>)[label]}.`,
  };
}
// Inclined skis require polygons: rectangular hit boxes would overlap.
maps["p008-block03"] = {
  targets: [
    polygon(
      "ski1",
      [
        [0.025, 0.77],
        [0.88, 0.06],
        [0.925, 0.1],
        [0.08, 0.91],
      ],
      "Верхняя лыжа",
    ),
    polygon(
      "ski2",
      [
        [0.15, 0.9],
        [0.98, 0.39],
        [0.98, 0.55],
        [0.23, 0.99],
      ],
      "Нижняя лыжа",
    ),
  ],
  expected: ["ski1", "ski2"],
  prompt: "Нажми на каждую лыжу.",
};
export function childInteraction(block: Block): Block {
  if (block.kind === "draw")
    return {
      ...block,
      trace: tracePlans[block.id],
      prompt: block.guide
        ? `Обведи цифру ${block.guide} по пунктиру.`
        : `Повтори рисунок по пунктиру. Начинай с яркой точки.`,
      hint: "Смотри на яркую точку: это начало линии. Проведи по пунктиру до конца. Если не получилось, попробуй ещё раз.",
    };
  const map = maps[block.id];
  if (!map) return block;
  const targets = map.targets.length
    ? map.targets
    : block.images.map((_, i) =>
        area(`card-${i}`, 0, 0, 1, 1, `Карточка ${i + 1}`, i),
      );
  return {
    id: block.id,
    title: block.title,
    kind: "picture",
    images: block.images,
    sourceText: block.sourceText,
    prompt: map.prompt,
    targets,
    expected: map.expected,
    adaptation: true,
    hint: "Нажимай прямо на рисунок. Отмеченный предмет подсветится. Нажми ещё раз, чтобы снять отметку.",
  };
}
