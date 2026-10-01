import type { Block, Hotspot } from "./types.ts";
import { tracePlans } from "./tracing.ts";
import { originalIllustrations } from "./illustrationMode.ts";
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
// Use source image pixels for the hand-checked outlines. This keeps their
// relationship to the painted objects visible when an illustration changes.
const pixelPolygon = (
  id: string,
  coords: number[][],
  width: number,
  height: number,
  label: string,
) =>
  polygon(
    id,
    coords.map(([x, y]) => [x / width, y / height]),
    label,
  );
const revisedIllustrations = !originalIllustrations;
const balls = revisedIllustrations
  ? [
      { ...area("left", 0.08, 0.09, 0.44, 0.81, "Левый мяч"), ellipse: true },
      { ...area("right", 0.68, 0.42, 0.24, 0.48, "Правый мяч"), ellipse: true },
    ]
  : [
      { ...area("left", 0.055, 0.08, 0.39, 0.82, "Левый мяч"), ellipse: true },
      { ...area("right", 0.69, 0.34, 0.235, 0.5, "Правый мяч"), ellipse: true },
    ];
const originalPencils = [
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
const revisedPencils = [
  polygon(
    "green",
    [
      [0.05, 0.31],
      [0.83, 0.31],
      [0.97, 0.4],
      [0.83, 0.52],
      [0.05, 0.52],
    ],
    "Зелёный карандаш",
  ),
  polygon(
    "red",
    [
      [0.35, 0.61],
      [0.75, 0.61],
      [0.87, 0.72],
      [0.75, 0.84],
      [0.35, 0.84],
    ],
    "Красный карандаш",
  ),
];
const pencils = revisedIllustrations ? revisedPencils : originalPencils;
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
  "p007-block02": {
    targets: [
      area("one", 0.66, 0.2, 0.21, 0.67, "Один мальчик"),
      revisedIllustrations
        ? area("many", 0.13, 0.27, 0.24, 0.25, "Дети в глубине леса")
        : area("many", 0.3, 0.28, 0.32, 0.18, "Дети в глубине леса"),
    ],
    expected: ["many"],
    prompt: "Где много детей? Нажми на группу.",
  },
};
const originalDigitRects = [
  [0.04, 0.6, 0.19, 0.35],
  [0.35, 0.59, 0.27, 0.29],
  [0.6, 0.64, 0.26, 0.3],
  [0.04, 0.62, 0.22, 0.32],
  [0.72, 0.67, 0.19, 0.29],
  [0.055, 0.68, 0.18, 0.28],
  [0.74, 0.65, 0.2, 0.31],
];
const revisedDigitRects = [
  [0.09, 0.49, 0.25, 0.43],
  originalDigitRects[1],
  originalDigitRects[2],
  [0.13, 0.61, 0.25, 0.34],
  originalDigitRects[4],
  [0.065, 0.64, 0.25, 0.32],
  [0.742, 0.59, 0.21, 0.4],
];
const digitRects = revisedIllustrations
  ? revisedDigitRects
  : originalDigitRects;
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
    prompt: `Найди и нажми на цифру ${n} на картинке.`,
  };
}
for (const [id, n, rect] of [
  ["p007-block08", 1, [0.37, 0.15, 0.24, 0.32]],
  ["p008-block09", 2, [0.35, 0.1, 0.38, 0.4]],
  ["p010-block07", 3, [0.3, 0.1, 0.35, 0.4]],
] as const) {
  const digitRect: readonly number[] = revisedIllustrations
    ? n === 1
      ? [0.39, 0.25, 0.22, 0.48]
      : [0.32, 0.24, 0.36, 0.5]
    : rect;
  maps[id] = {
    targets: [
      area(
        "digit",
        digitRect[0],
        digitRect[1],
        digitRect[2],
        digitRect[3],
        `Цифра ${n} на монете`,
      ),
    ],
    expected: ["digit"],
    prompt: `Найди цифру ${n} на монете. Нажми на неё.`,
  };
}
// These source rows introduce one quantity in different representations.
// They are not a quiz in which only the printed numeral is correct.
const numberMeanings: Record<
  string,
  {
    number: number;
    page: string;
    cards: [string, string][];
    conclusion: string;
  }
> = {
  "p007-block07": {
    number: 1,
    page: "p007",
    cards: [
      ["one_mushroom", "Один гриб"],
      ["one_squirrel", "Одна белка"],
      ["one_hedgehog", "Один ёж"],
      ["domino_1", "Одна точка"],
      ["one_green_dot", "Один кружок"],
      ["digit_1_print", "Цифра 1"],
    ],
    conclusion:
      "Предметы разные, а на каждом рисунке их по одному. Это число 1.",
  },
  "p008-block08": {
    number: 2,
    page: "p008",
    cards: [
      ["two_skates", "Два конька"],
      ["two_skis", "Две лыжи"],
      ["bicycle_two_wheels", "Два колеса"],
      ["domino_2", "Две точки"],
      ["two_green_dots", "Два кружка"],
      ["abacus_2", "Две бусины на счётной линейке"],
      ["digit_2_print", "Цифра 2"],
    ],
    conclusion: "Предметы разные, а на каждом рисунке их по два. Это число 2.",
  },
  "p010-block06": {
    number: 3,
    page: "p010",
    cards: [
      ["boys_fishing", "Три мальчика"],
      ["three_fish", "Три рыбы"],
      ["three_strawberries", "Три красные ягоды"],
      ["domino_3", "Три точки"],
      ["three_green_dots", "Три кружка"],
      ["digit_3_print", "Цифра 3"],
    ],
    conclusion: "Предметы разные, а на каждом рисунке их по три. Это число 3.",
  },
};
const counts: Record<
  string,
  { label: string; rects: number[][]; ellipse?: boolean }
> = {
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
    rects: revisedIllustrations
      ? [
          [0.46, 0.03, 0.13, 0.4],
          [0.59, 0, 0.13, 0.43],
        ]
      : [
          [0.635, 0.08, 0.095, 0.37],
          [0.728, 0.1, 0.07, 0.34],
        ],
  },
  "p009-block05": {
    label: "крыло",
    rects: revisedIllustrations
      ? [
          [0.075, 0.02, 0.42, 0.53],
          [0.49, 0.39, 0.47, 0.56],
        ]
      : [
          [0.4, 0.035, 0.35, 0.54],
          [0.075, 0.59, 0.37, 0.35],
        ],
  },
  "p010-block02": {
    label: "мальчика",
    rects: revisedIllustrations
      ? [
          [0.13, 0.18, 0.16, 0.59],
          [0.39, 0.37, 0.14, 0.46],
          [0.52, 0.35, 0.16, 0.53],
        ]
      : [
          [0.115, 0.09, 0.11, 0.61],
          [0.28, 0.38, 0.145, 0.44],
          [0.415, 0.34, 0.2, 0.61],
        ],
  },
  "p010-block03": {
    label: "рыбу",
    rects: revisedIllustrations
      ? [
          [0.27, 0.08, 0.47, 0.43],
          [0.02, 0.48, 0.49, 0.43],
          [0.52, 0.4, 0.46, 0.46],
        ]
      : [
          [0.04, 0.04, 0.41, 0.55],
          [0.64, 0.05, 0.3, 0.6],
          [0.23, 0.53, 0.49, 0.39],
        ],
  },
  "p010-block04": {
    label: "ягоду",
    ellipse: revisedIllustrations,
    rects: revisedIllustrations
      ? [
          [0.64, 0.21, 0.17, 0.29],
          [0.8, 0.29, 0.18, 0.3],
          [0.54, 0.57, 0.19, 0.3],
        ]
      : [
          [0.68, 0.375, 0.115, 0.195],
          [0.865, 0.36, 0.083, 0.19],
          [0.56, 0.63, 0.15, 0.31],
        ],
  },
};
for (const [id, { label, rects, ellipse }] of Object.entries(counts)) {
  const targets = rects.map((r, i) => ({
    ...area(
      `object-${i}`,
      ...(r as [number, number, number, number]),
      `${label} ${i + 1}`,
    ),
    ...(ellipse ? { ellipse: true } : {}),
  }));
  maps[id] = {
    targets,
    expected: targets.map((t) => t.id),
    prompt: `Нажимай по одному: найди ${({ гриб: "гриб", белку: "белку", ежа: "ежа", конёк: "оба конька", колесо: "оба колеса", птичку: "обеих птичек", ухо: "оба уха", крыло: "оба крыла", мальчика: "всех мальчиков", рыбу: "всех рыб", ягоду: "все красные ягоды" } as Record<string, string>)[label]}.`,
  };
}
if (revisedIllustrations) {
  maps["p007-block03"].targets = [
    polygon(
      "object-0",
      [
        [0.08, 0.37],
        [0.13, 0.26],
        [0.28, 0.16],
        [0.5, 0.12],
        [0.75, 0.17],
        [0.9, 0.29],
        [0.93, 0.4],
        [0.82, 0.46],
        [0.68, 0.49],
        [0.69, 0.8],
        [0.59, 0.86],
        [0.35, 0.85],
        [0.3, 0.51],
        [0.13, 0.47],
      ],
      "Гриб 1",
    ),
  ];
  maps["p007-block04"].targets = [
    polygon(
      "object-0",
      [
        [0.07, 0.2],
        [0.16, 0.04],
        [0.37, 0.02],
        [0.48, 0.16],
        [0.52, 0.28],
        [0.67, 0.28],
        [0.72, 0.1],
        [0.82, 0.09],
        [0.89, 0.27],
        [0.98, 0.35],
        [0.98, 0.48],
        [0.86, 0.58],
        [0.79, 0.84],
        [0.62, 0.87],
        [0.39, 0.82],
        [0.21, 0.63],
        [0.08, 0.48],
      ],
      "Белка 1",
    ),
  ];
  maps["p007-block05"].targets = [
    { ...area("object-0", 0.04, 0.12, 0.9, 0.8, "Ёж 1"), ellipse: true },
  ];
  maps["p008-block02"].targets = [
    area("object-0", 0.02, 0.1, 0.49, 0.82, "Конёк 1"),
    area("object-1", 0.49, 0.06, 0.5, 0.87, "Конёк 2"),
  ];
  maps["p008-block04"].targets = [
    {
      ...area("object-0", 1 / 170, 42 / 105, 59 / 170, 60 / 105, "Колесо 1"),
      ellipse: true,
    },
    {
      ...area("object-1", 109 / 170, 40 / 105, 60 / 170, 63 / 105, "Колесо 2"),
      ellipse: true,
    },
  ];
  maps["p009-block01"].targets = [
    pixelPolygon(
      "object-0",
      [
        [14, 185],
        [37, 151],
        [49, 114],
        [67, 86],
        [87, 76],
        [110, 83],
        [128, 104],
        [128, 132],
        [109, 157],
        [80, 167],
        [35, 190],
      ],
      300,
      200,
      "Птичка 1",
    ),
    pixelPolygon(
      "object-1",
      [
        [156, 38],
        [181, 52],
        [231, 5],
        [245, 3],
        [271, 40],
        [298, 116],
        [280, 132],
        [252, 117],
        [289, 149],
        [276, 156],
        [240, 138],
        [196, 141],
        [165, 117],
        [154, 82],
      ],
      300,
      200,
      "Птичка 2",
    ),
  ];
  maps["p009-block04"].targets = [
    pixelPolygon(
      "object-0",
      [
        [102, 9],
        [117, 8],
        [139, 27],
        [149, 54],
        [132, 51],
        [108, 35],
      ],
      220,
      147,
      "Ухо 1",
    ),
    pixelPolygon(
      "object-1",
      [
        [128, 7],
        [138, 3],
        [153, 19],
        [154, 51],
        [137, 49],
      ],
      220,
      147,
      "Ухо 2",
    ),
  ];
  maps["p009-block05"].targets = [
    pixelPolygon(
      "object-0",
      [
        [22, 3],
        [66, 17],
        [109, 49],
        [130, 80],
        [110, 95],
        [74, 76],
        [47, 53],
        [20, 32],
      ],
      230,
      153,
      "Крыло 1",
    ),
    pixelPolygon(
      "object-1",
      [
        [119, 75],
        [149, 83],
        [191, 104],
        [218, 134],
        [203, 143],
        [171, 136],
        [136, 117],
      ],
      230,
      153,
      "Крыло 2",
    ),
  ];
  maps["p010-block03"].targets = [
    pixelPolygon(
      "object-0",
      [
        [65, 33],
        [94, 39],
        [105, 21],
        [121, 28],
        [138, 34],
        [169, 39],
        [175, 48],
        [160, 62],
        [124, 72],
        [88, 64],
        [68, 70],
      ],
      240,
      160,
      "Рыба 1",
    ),
    pixelPolygon(
      "object-1",
      [
        [13, 95],
        [37, 87],
        [69, 81],
        [80, 96],
        [118, 106],
        [119, 125],
        [92, 120],
        [73, 133],
        [51, 121],
        [22, 114],
      ],
      240,
      160,
      "Рыба 2",
    ),
    pixelPolygon(
      "object-2",
      [
        [127, 104],
        [158, 94],
        [176, 73],
        [202, 74],
        [228, 86],
        [240, 94],
        [222, 112],
        [190, 119],
        [162, 124],
        [142, 133],
      ],
      240,
      160,
      "Рыба 3",
    ),
  ];
}
// Inclined skis require polygons: rectangular hit boxes would overlap.
maps["p008-block03"] = {
  targets: revisedIllustrations
    ? [
        pixelPolygon(
          "ski1",
          [
            [8, 57],
            [25, 58],
            [185, 10],
            [197, 8],
            [199, 15],
            [191, 26],
            [27, 73],
            [8, 70],
          ],
          210,
          95,
          "Верхняя лыжа",
        ),
        pixelPolygon(
          "ski2",
          [
            [21, 76],
            [190, 35],
            [204, 35],
            [206, 46],
            [190, 60],
            [35, 94],
            [21, 90],
          ],
          210,
          95,
          "Нижняя лыжа",
        ),
      ]
    : [
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
maps["p008-block01"] = {
  targets: revisedIllustrations
    ? [
        pixelPolygon(
          "chair-left",
          [
            [151, 196],
            [185, 194],
            [189, 219],
            [175, 223],
            [180, 285],
            [242, 285],
            [248, 387],
            [235, 387],
            [233, 307],
            [166, 307],
            [162, 376],
            [151, 376],
            [164, 294],
          ],
          715,
          440,
          "Левый стул",
        ),
        pixelPolygon(
          "chair-right",
          [
            [535, 202],
            [573, 207],
            [557, 286],
            [556, 305],
            [566, 388],
            [552, 388],
            [539, 313],
            [480, 313],
            [478, 390],
            [465, 390],
            [464, 295],
            [534, 287],
          ],
          715,
          440,
          "Правый стул",
        ),
        area(
          "window-left",
          267 / 715,
          45 / 440,
          137 / 715,
          154 / 440,
          "Левое окно",
        ),
        area(
          "window-right",
          449 / 715,
          46 / 440,
          155 / 715,
          153 / 440,
          "Правое окно",
        ),
        pixelPolygon(
          "frame-top",
          [
            [72, 46],
            [155, 55],
            [149, 130],
            [68, 120],
          ],
          715,
          440,
          "Верхняя рамка",
        ),
        {
          ...area(
            "frame-bottom",
            68 / 715,
            137 / 440,
            46 / 715,
            63 / 440,
            "Нижняя рамка",
          ),
          ellipse: true,
        },
      ]
    : [
        polygon(
          "chair-left",
          [
            [0.23, 0.34],
            [0.29, 0.35],
            [0.31, 0.61],
            [0.39, 0.65],
            [0.4, 0.72],
            [0.38, 0.88],
            [0.34, 0.86],
            [0.36, 0.74],
            [0.29, 0.74],
            [0.25, 0.84],
            [0.235, 0.835],
            [0.25, 0.66],
          ],
          "Левый стул",
        ),
        polygon(
          "chair-right",
          [
            [0.77, 0.36],
            [0.795, 0.36],
            [0.75, 0.64],
            [0.78, 0.85],
            [0.76, 0.85],
            [0.73, 0.72],
            [0.65, 0.7],
            [0.63, 0.82],
            [0.61, 0.81],
            [0.63, 0.65],
            [0.74, 0.61],
          ],
          "Правый стул",
        ),
        area("window-left", 0.414, 0.065, 0.235, 0.37, "Левое окно"),
        area("window-right", 0.75, 0.05, 0.225, 0.42, "Правое окно"),
        polygon(
          "frame-top",
          [
            [0.09, 0],
            [0.23, 0],
            [0.18, 0.24],
            [0.055, 0.2],
          ],
          "Верхняя рамка",
        ),
        {
          ...area("frame-bottom", 0.09, 0.27, 0.07, 0.16, "Нижняя рамка"),
          ellipse: true,
        },
      ],
  expected: [
    "chair-left",
    "chair-right",
    "window-left",
    "window-right",
    "frame-top",
    "frame-bottom",
  ],
  prompt: "Найди и нажми на оба стула, оба окна и обе рамки на стене.",
};
export function childInteraction(block: Block): Block {
  const meaning = numberMeanings[block.id];
  if (meaning) {
    const targets = meaning.cards.map(([, label], i) =>
      area(`representation-${i}`, 0, 0, 1, 1, label, i),
    );
    return {
      id: block.id,
      title: block.title,
      kind: "picture",
      images: meaning.cards.map(([image]) => `${meaning.page}_${image}`),
      sourceText: block.kind === "read" ? block.body : block.sourceText,
      prompt:
        "Рассмотри рисунки. Что у них общего? Нажимай на каждый рисунок и сравнивай количество.",
      targets,
      expected: targets.map((t) => t.id),
      quantityMeaning: {
        number: meaning.number,
        conclusion: meaning.conclusion,
      },
      adaptation: true,
      hint: meaning.conclusion,
    };
  }
  if (block.kind === "draw")
    return {
      ...block,
      trace: tracePlans[block.id],
      prompt: block.guide
        ? `Обведи цифру ${block.guide} по пунктиру.`
        : block.prompt,
      hint: "Для открытой линии яркая точка показывает начало. Замкнутую фигуру начинай где удобно. Проведи по пунктиру до конца. Если не получилось, попробуй ещё раз.",
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
