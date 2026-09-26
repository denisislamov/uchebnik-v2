import type { Block, PracticalStep } from "../content/types.ts";

/** Semantic lessons are separate from the gesture needed to enter an answer. */
export type TeachingExample = {
  kind:
    | "count"
    | "compare"
    | "equation"
    | "groups"
    | "compositionRow"
    | "ruler"
    | "trace"
    | "placeValue"
    | "sequence";
  values: number[];
  expression?: string;
  active?: number;
  label?: string;
  labels?: string[];
  colors?: ["green" | "red", "green" | "red"];
  token?: "square" | "circle" | "stick";
  pattern?: [number, number][];
};
export type TaskTeachingStep = {
  text: string;
  focus: "instruction" | "images" | "answer" | "check";
  example?: TeachingExample;
};
export type TaskTeaching = {
  family: string;
  title: string;
  steps: TaskTeachingStep[];
};

const step = (
  text: string,
  focus: TaskTeachingStep["focus"] = "answer",
  example?: TeachingExample,
): TaskTeachingStep => ({ text, focus, ...(example ? { example } : {}) });
const example = (
  kind: TeachingExample["kind"],
  values: number[],
  expression?: string,
  active?: number,
): TeachingExample => ({ kind, values, expression, active, label: "Пример" });
const lesson = (
  family: string,
  title: string,
  ...steps: TaskTeachingStep[]
): TaskTeaching => ({ family, title, steps });
const check = (label = "Проверить") =>
  step(
    `Когда закончишь, нажми «${label}». Если что-то не получилось, пересчитай и исправь ответ.`,
    "check",
  );
type Operation = "add" | "subtract" | "multiply" | "divide";
const operationNames: Record<Operation, string> = {
  add: "Прибавляем",
  subtract: "Вычитаем",
  multiply: "Умножаем",
  divide: "Делим поровну",
};
const operationSteps: Record<Operation, TaskTeachingStep[]> = {
  add: [
    step(
      "Было 3 кружка. Прибавить 2 — значит положить ещё два.",
      "answer",
      example("count", [3, 2], "3 + 2"),
    ),
    step(
      "Считаем вместе: 1, 2, 3, 4, 5. Значит, 3 + 2 = 5.",
      "answer",
      example("equation", [3, 2, 5], "3 + 2 = 5"),
    ),
  ],
  subtract: [
    step(
      "Было 5 кружков. Вычесть 2 — значит убрать два.",
      "answer",
      example("count", [5, 2], "5 − 2"),
    ),
    step(
      "Осталось 3 кружка. Значит, 5 − 2 = 3.",
      "answer",
      example("equation", [5, 2, 3], "5 − 2 = 3"),
    ),
  ],
  multiply: [
    step(
      "В каждой группе по 2 кружка. Таких групп 3.",
      "answer",
      example("groups", [2, 2, 2], "2 + 2 + 2"),
    ),
    step(
      "Всего 6 кружков. По 2 взять 3 раза: 2 × 3 = 6.",
      "answer",
      example("equation", [2, 3, 6], "2 × 3 = 6"),
    ),
  ],
  divide: [
    step(
      "Разделим 6 кружков между двумя группами. Кладём по одному в каждую по очереди.",
      "answer",
      example("groups", [1, 1], "6 : 2"),
    ),
    step(
      "В каждой группе стало по 3. Все кружки разложены поровну: 6 : 2 = 3.",
      "answer",
      example("groups", [3, 3], "6 : 2 = 3"),
    ),
  ],
};
function operations(text: string): Operation[] {
  return (
    [
      ["add", /\+|прибав|сложени/i],
      [
        "subtract",
        /[−]|(?:\d|[abc)])\s*[-–]\s*(?:\d|[abc(])|^\s*[-–]\s*$|вычит|отнять/i,
      ],
      ["multiply", /[×*·]|умнож/i],
      ["divide", /[÷/]|(?:\d|[abc])\s*:\s*(?:\d|[abc])|делени|раздел/i],
    ] as const
  )
    .filter(([, re]) => re.test(text))
    .map(([name]) => name);
}
function arithmetic(
  family: string,
  ops: Operation[],
  intro?: string,
): TaskTeaching {
  if (!ops.length)
    throw new Error(`Не определено арифметическое действие: ${family}`);
  const used = ops;
  return lesson(
    `${family}.${used.join("-")}`,
    used.length === 1 ? operationNames[used[0]] : "Выбираем действие",
    ...(intro ? [step(intro, "instruction")] : []),
    ...used.flatMap((op) => operationSteps[op]),
    step(
      "Теперь реши своё задание. Впиши число в поле рядом с нужным вопросом или примером.",
    ),
    check(),
  );
}
function practicalKind(s: PracticalStep): string {
  if (s.mode === "cards") return "digit-cards";
  if (s.mode === "construct") return `construct-${s.shape}`;
  if (s.mode === "draw") {
    if (s.cutAt !== undefined) return "cut-length";
    if (s.divisions) return s.lengths ? "divide-length" : "divide-shape";
    if (s.lengths) return "draw-length";
    if (s.chooseCounts) {
      if (/больше/i.test(s.instruction)) return "draw-more";
      if (/меньше/i.test(s.instruction)) return "draw-less";
      return "draw-count";
    }
    return "draw-rows";
  }
  if ((s.tokenValue ?? 1) === 10 || s.groupValues?.includes(10))
    return "bundles";
  if (!s.carryFrom && !s.initialCounts && s.counts.length > 1) {
    if (/меньше/i.test(s.instruction)) return "compare-less";
    if (/больше|ещё\s+\d/i.test(s.instruction)) return "compare-more";
  }
  if (/меньше|убери|убрать|возьми|вынь/i.test(s.instruction)) return "remove";
  if (/больше|ещё\s+\d|прибав/i.test(s.instruction)) return "add";
  if (/поровну|равных|одинаковых/i.test(s.instruction)) return "equal-groups";
  if (/столько же/i.test(s.instruction)) return "same-amount";
  if (s.carryFrom) return "add";
  if (s.counts.length > 1) return "two-parts";
  return "place-count";
}
const practicalSteps: Record<string, TaskTeachingStep[]> = {
  "digit-cards": [
    step(
      "В числе 14 цифра 1 слева показывает один десяток, а 4 справа — четыре единицы.",
      "answer",
      example("placeValue", [1, 4], "14 = 10 + 4"),
    ),
    step(
      "Перенеси карточки с цифрами в окошки слева направо. Прочитай получившееся число.",
    ),
  ],
  "construct-triangle": [
    step("У треугольника три стороны. Для каждой стороны возьми одну палочку."),
    step(
      "Соедини три вершины палочками. Фигура должна замкнуться. Собери все фигуры, показанные на поле.",
    ),
  ],
  "construct-square": [
    step(
      "У квадрата четыре равные стороны. Для каждой стороны возьми одну палочку.",
    ),
    step(
      "Соедини соседние вершины палочками. Проверь все четыре стороны. Собери все фигуры, показанные на поле.",
    ),
  ],
  "cut-length": [
    step(
      "Чтобы отрезать 2 клетки от полоски длиной 6 клеток, отсчитай от края две клетки.",
      "answer",
      example("ruler", [0, 2, 6], "6 − 2 = 4", 2),
    ),
    step(
      "Наметь разрез на границе клеток. По другую сторону останется 4 клетки.",
    ),
  ],
  "divide-length": [
    step(
      "Разделим полоску длиной 6 клеток на 3 равные части: в каждой будет по 2 клетки.",
      "answer",
      example("ruler", [0, 2, 4, 6], "6 : 3 = 2", 2),
    ),
    step(
      "Отсчитай равные промежутки и проведи линии по образцу. Все части должны быть одинаковыми.",
    ),
  ],
  "divide-shape": [
    step(
      "Сначала обведи всю фигуру по направляющим. Сосчитай ряды и клетки в каждом ряду.",
    ),
    step(
      "Раздели фигуру по направляющей. В равных частях должно быть одинаковое число клеток.",
    ),
  ],
  "draw-length": [
    step(
      "Начни от нуля и отсчитай нужное число клеток. Одна клетка здесь обозначает одну единицу длины.",
      "answer",
      example("ruler", [0, 1, 2, 3], "3 клетки", 3),
    ),
    step(
      "Если длину надо найти, сначала вычисли её и введи число. Затем проведи линию по направляющей.",
    ),
  ],
  "draw-count": [
    step("Сначала сосчитай предметы на рисунке по одному.", "images"),
    step(
      "Введи, сколько клеток или фигур нужно нарисовать. Затем обведи их по направляющим.",
    ),
  ],
  "draw-more": [
    step(
      "Прочитай, сколько предметов должно быть в первом ряду. Во втором на несколько больше: прибавь указанное число.",
    ),
    step(
      "Введи, сколько предметов будет во втором ряду. Затем обведи оба ряда по направляющим.",
    ),
  ],
  "draw-less": [
    step(
      "Прочитай, сколько предметов должно быть в первом ряду. Во втором на несколько меньше: вычти указанное число.",
    ),
    step(
      "Введи, сколько предметов будет во втором ряду. Затем обведи оба ряда по направляющим.",
    ),
  ],
  "draw-rows": [
    step(
      "В двух рядах по 3 клетки. Сначала обведём один ряд из трёх, потом такой же второй.",
      "answer",
      example("groups", [3, 3], "3 + 3 = 6"),
    ),
    step(
      "Следи за числом рядов и числом клеток в каждом ряду. Обводи по направляющим.",
    ),
  ],
  bundles: [
    step(
      "Один пучок — это 10 палочек. Пучок и 4 отдельные палочки — это 14.",
      "answer",
      example("placeValue", [1, 4], "14 = 10 + 4"),
    ),
    step("Разложи пучки-десятки и отдельные палочки по подписанным местам."),
  ],
  remove: [
    ...operationSteps.subtract,
    step(
      "Убери нужные предметы с поля обратно в коробку. Сосчитай оставшиеся.",
    ),
  ],
  add: [
    ...operationSteps.add,
    step("К уже лежащим предметам добавь нужное количество из коробки."),
  ],
  "compare-more": [
    ...operationSteps.add,
    step(
      "Сначала положи указанное количество в первый ряд. Во второй положи столько же и добавь столько, сколько сказано в задании.",
    ),
  ],
  "compare-less": [
    ...operationSteps.subtract,
    step(
      "Сначала положи указанное количество в первый ряд. Во второй положи столько же, затем убери из второго ряда указанное количество. Пересчитай оба ряда.",
    ),
  ],
  "equal-groups": [
    ...operationSteps.divide,
    step("Разложи предметы в указанные ряды. В каждом должно быть поровну."),
  ],
  "same-amount": [
    step(
      "Чтобы положить столько же, каждому предмету первого ряда поставь в пару один предмет второго.",
      "answer",
      example("groups", [3, 3], "3 = 3"),
    ),
    step("Если у каждого есть пара и лишних нет — предметов поровну."),
  ],
  "two-parts": [
    step(
      "Положим 2 кружка слева и 3 справа. Это две части одного количества.",
      "answer",
      example("groups", [2, 3], "2 + 3 = 5"),
    ),
    step(
      "Прочитай, сколько нужно положить в каждую группу. Разложи и пересчитай отдельно каждую часть.",
    ),
  ],
  "place-count": [
    step(
      "Нужно положить 3 предмета: переносим первый, второй, третий.",
      "answer",
      example("count", [3], "1 → 2 → 3", 2),
    ),
    step(
      "Переноси предметы из коробки и считай каждый один раз. Остановись на нужном числе.",
    ),
  ],
};

/** Every Block variant has an explicit route; adding a kind fails the exhaustive check. */
export function taskTeaching(block: Block): TaskTeaching {
  const plan = buildTaskTeaching(block);
  const page = Number(block.id.slice(1, 4));
  if (!Number.isInteger(page) || page >= 16) return plan;
  // These pages teach quantities before arithmetic signs are introduced on PDF 16.
  if (block.kind === "work")
    return {
      ...plan,
      steps: [
        step(
          `Прочитай условие и вопросы задания. ${block.prompt}`,
          "instruction",
        ),
        step(
          /остал|улетел|взял|сорва/.test(
            [block.prompt, ...block.fields.map((f) => f.label)].join(" "),
          )
            ? "Сначала посчитай, сколько было. Посмотри, что изменилось. Для вопроса «Сколько осталось?» считай оставшиеся предметы."
            : "Рассмотри то, о чём спрашивают. Если нужно узнать, сколько всего, пересчитай обе группы вместе.",
          "images",
        ),
        step(
          "Отвечай на вопросы по очереди. Для каждого вопроса сосчитай нужные предметы и запиши ответ.",
        ),
        check(),
      ],
    };
  if (block.kind === "practical")
    return {
      ...plan,
      steps: [
        ...block.steps.map((s) =>
          step(
            s.instruction +
              (s.carryFrom ? " Предметы предыдущего шага уже на месте." : ""),
            "answer",
          ),
        ),
        step(
          "Выполняй действия по порядку. Когда закончишь, проверь свой ответ.",
        ),
      ],
    };
  if (block.kind === "activity" && block.activity.mode === "coins")
    return {
      ...plan,
      steps: [
        step(
          `Прочитай условие и вопросы задания. ${block.prompt}`,
          "instruction",
        ),
        step(
          "Посмотри, сколько копеек написано на каждой монете. Выбирай монеты так, чтобы вместе получилось столько копеек, сколько нужно в задании.",
          "answer",
        ),
        step(
          "Считай копейки, а не количество монет. Лишнюю монету можно убрать.",
        ),
        check(),
      ],
    };
  return {
    ...plan,
    steps: plan.steps.map((s) => {
      if (s.example?.kind === "compositionRow")
        return {
          ...s,
          example: {
            ...s.example,
            expression: undefined,
            labels: [
              String(s.example.values[0]),
              "и",
              String(s.example.values[1]),
            ],
          },
        };
      if (
        (block.kind === "picture" &&
          plan.family === "picture.compare-quantity") ||
        (block.kind === "activity" && block.activity.mode === "count")
      )
        return { ...s, example: undefined };
      return s;
    }),
  };
}
function buildTaskTeaching(block: Block): TaskTeaching {
  switch (block.kind) {
    case "read":
      return lesson(
        "read",
        "Рассматриваем",
        step("Рассмотри рисунок. Прочитай текст вместе со взрослым.", "images"),
        step(
          "Можно обсудить увиденное со взрослым. Когда разберёшься, нажми «Дальше».",
          "check",
        ),
      );
    case "location":
      return lesson(
        "location",
        "Где находится предмет?",
        step(
          "Сначала посмотри, вверху или внизу страницы находится предмет.",
          "images",
        ),
        step("Затем посмотри, слева он или справа. Это два разных вопроса."),
        step("Выбери ответ для каждого вопроса и проверь оба.", "check"),
      );
    case "number":
      return lesson(
        /подпи[сш]/.test(block.prompt)
          ? "number.quantity-symbol"
          : "number.count-picture",
        "Считаем по одному",
        step(
          "Найди на рисунке именно те предметы, о которых спрашивают.",
          "images",
        ),
        ...Array.from({ length: block.expected }, (_, i) =>
          step(
            `${i === 0 ? "Начинаем" : "Следующий предмет"}: ${i + 1}.${i === block.expected - 1 ? " Последнее число говорит, сколько всего." : " Считай каждый предмет один раз."}`,
            "images",
            example("count", [block.expected], String(i + 1), i),
          ),
        ),
        step("Сосчитай предметы в своём задании и нажми нужную цифру."),
      );
    case "picture": {
      const p = block.prompt;
      if (block.quantityMeaning)
        return lesson(
          `picture.number-meaning.${block.quantityMeaning.number}`,
          "Разные предметы — одно количество",
          step(
            "Рассмотри каждый рисунок. Сосчитай предметы, точки и кружки. Что у них общего?",
            "images",
          ),
          step(block.quantityMeaning.conclusion, "images"),
          step(
            "Коснись каждого рисунка. Здесь нет лишнего: все они помогают познакомиться с одним числом.",
            "images",
          ),
        );
      if (/цифр/.test(p))
        return lesson(
          "picture.find-digit",
          "Находим цифру",
          step(
            "Цифра — это знак для записи числа. Посмотри, какую цифру просят найти.",
            "instruction",
          ),
          step(
            "Рассмотри её форму на картинке и нажми прямо на цифру.",
            "images",
          ),
        );
      if (/длинн|коротк/.test(p))
        return lesson(
          "picture.compare-length",
          "Сравниваем длину",
          step(
            "Мысленно поставь начала карандашей рядом. Сравни, где заканчивается каждый.",
            "images",
          ),
          step(
            "Тот, что тянется дальше, длиннее. Другой короче. Нажми тот, о котором спрашивают.",
            "images",
          ),
        );
      if (/большой|маленький/.test(p))
        return lesson(
          "picture.compare-size",
          "Сравниваем размер",
          step(
            "Посмотри на оба мяча. Один занимает больше места, другой меньше.",
            "images",
          ),
          step(
            "Это большой и маленький мяч. Прочитай, какой нужен, и нажми на него.",
            "images",
          ),
        );
      if (/много|мало/.test(p))
        return lesson(
          "picture.compare-quantity",
          "Один или много?",
          step(
            "В одной группе один ребёнок. В другой несколько детей — их много.",
            "images",
            example("groups", [1, 4], "один — много"),
          ),
          step(
            "Сравни количество детей в группах. Нажми группу, которую просят найти.",
            "images",
          ),
        );
      if (/прилетел|стало/.test(p))
        return lesson(
          "picture.add",
          "Сколько стало?",
          step(
            "На ветке сидела 1 птичка. К ней прилетела ещё 1 птичка.",
            "images",
          ),
          step(
            "Птичек стало больше. Покажи одну птичку, затем другую. Каждую посчитай один раз.",
            "images",
          ),
          step(
            "Теперь рассмотри птиц в задании. Нажми на каждую, чтобы показать, сколько стало.",
            "images",
          ),
        );
      return lesson(
        block.expected.length > 1 ? "picture.mark-many" : "picture.find-object",
        block.expected.length > 1
          ? "Находим все нужные предметы"
          : "Находим предмет",
        step(
          "Прочитай, какие предметы нужно найти. Остальные отмечать не нужно.",
          "instruction",
        ),
        step(
          block.expected.length > 1
            ? "Ищи по порядку и нажимай на каждый подходящий предмет один раз. Проверь, никого ли не пропустил."
            : "Найди нужный предмет на картинке и нажми прямо на него.",
          "images",
        ),
      );
    }
    case "counters":
      return lesson(
        block.expected === undefined
          ? "counters.visible"
          : "counters.same-amount",
        "Показываем количество",
        step(
          "Сосчитай нужные предметы на рисунке. Каждому предмету будет соответствовать одна палочка или кружок.",
          "images",
        ),
        step(
          "Переноси по одному предмету на поле. Остановись, когда каждому предмету на рисунке будет соответствовать один предмет на поле.",
          "answer",
        ),
        block.expected === undefined
          ? step(
              "Некоторые предметы могут заслонять друг друга. Покажи те, которые видишь, и нажми «Дальше».",
              "check",
            )
          : check("Проверить ответ"),
      );
    case "draw": {
      const targets = block.trace?.stages.flat() ?? [];
      const hasDot = targets.some((t) => t.dot);
      const closed = targets.some(
        (t) =>
          t.points.length > 2 &&
          t.points[0].x === t.points.at(-1)!.x &&
          t.points[0].y === t.points.at(-1)!.y,
      );
      const numeral = /Обведи цифру|Напиши \d/.test(block.prompt);
      const labeled = /подпиши/.test(block.prompt);
      const bidirectional = targets.some((t) => t.bidirectional);
      const family = numeral
        ? "numeral"
        : labeled
          ? "picture-and-numeral"
          : closed
            ? hasDot
              ? "closed-and-dot"
              : "closed"
            : hasDot
              ? "line-and-dot"
              : "open";
      return lesson(
        `draw.${family}${family === "open" && bidirectional ? ".bidirectional" : ""}`,
        numeral
          ? "Пишем цифру"
          : labeled
            ? "Рисуем и подписываем число"
            : "Рисуем по образцу",
        step(
          numeral
            ? "Рассмотри, из каких линий состоит цифра. Пиши каждую часть по очереди."
            : labeled
              ? "Сначала нарисуй нужное количество предметов. Затем подпиши число под ними."
              : "Посмотри на образец: какие линии, фигуры и цвета в нём повторяются?",
          "instruction",
        ),
        step(
          closed && !numeral
            ? "Замкнутую фигуру обведи по контуру и вернись к началу."
            : bidirectional && !numeral
              ? "Линию с метками на обоих концах можно начать с любого конца. Остальные линии веди от начальной метки по стрелке."
              : "Веди по пунктиру от начальной метки к концу. Стрелка показывает направление.",
        ),
        ...(hasDot
          ? [
              step(
                "Точку поставь коротким касанием в отмеченном месте. Для следующей линии снова проведи пальцем.",
              ),
            ]
          : []),
        step(
          "Повтори все части образца. Законченная часть уступит место следующей.",
          "check",
        ),
      );
    }
    case "shape":
      return lesson(
        "shape.sticks",
        "Строим фигуру из палочек",
        step(
          "Рассмотри образец. Каждая сторона между двумя соседними вершинами — одна палочка.",
          "images",
        ),
        step(
          "Переноси палочки к сторонам фигуры. Проверь, что все стороны на своих местах.",
        ),
        check("Проверить ответ"),
      );
    case "choice":
      return lesson(
        "choice.reason",
        "Выбираем подходящий ответ",
        step("Прочитай вопрос и подумай, что нужно узнать.", "instruction"),
        step(
          "Прочитай все варианты. Выбери тот, который отвечает именно на этот вопрос.",
        ),
      );
    case "practical": {
      const kinds = [...new Set(block.steps.map(practicalKind))];
      return lesson(
        `practical.${kinds.join("+")}${block.steps.length > 1 ? ".multi" : ""}`,
        "Выполняем действия по порядку",
        step(
          "Прочитай первое действие. Выполни его на поле, затем переходи к следующему.",
          "instruction",
        ),
        ...kinds.flatMap((k) => practicalSteps[k]),
        step(
          "После каждого действия нажми «Проверить действие». " +
            (block.fields.length
              ? "В конце ответь на вопросы о том, что получилось, и нажми «Проверить ответ»."
              : "После всех действий нажми «Проверить ответ»."),
          "check",
        ),
      );
    }
    case "activity":
      return activityTeaching(block);
    case "work":
      return workTeaching(block);
    case "compose": {
      const ops = operations(block.rules.map((r) => r.operator).join(" "));
      // Division symbols without operands still have meaning in a compose rule.
      if (
        block.rules.some((r) => /[:÷/]/.test(r.operator)) &&
        !ops.includes("divide")
      )
        ops.push("divide");
      const result = arithmetic(
        `compose.${block.story ? "story" : "example"}`,
        ops,
        "Прочитай, какие числа уже заданы. Их нужно сохранить, а остальные подобрать самому.",
      );
      result.steps.splice(
        result.steps.length - 2,
        1,
        step(
          "Впиши первое число, второе число и результат. Проверь, что равенство верное." +
            (block.rules.length > 1
              ? " Заполни все примеры и не повторяй один и тот же пример."
              : ""),
        ),
        ...(block.story
          ? [
              step(
                "Выбери, о чём будет задача. Прочитай условие и выбери вопрос, который подходит к действию.",
              ),
            ]
          : []),
      );
      return result;
    }
    case "recipe": {
      const ops = operations(block.formula);
      return lesson(
        `recipe.${ops.join("-")}.${block.context ? "similar" : "own"}`,
        "Придумываем похожую задачу",
        step(
          "Прочитай условие и схему действий. Сохрани смысл задачи, а числа выбери свои.",
          "instruction",
        ),
        ...ops.flatMap((op) => operationSteps[op]),
        step(
          block.unit
            ? "Выбери кнопку с единицами: укажи, что считаешь в задаче."
            : "Выбери, о чём будет задача, нажав на подходящий вариант.",
        ),
        step(
          "Подставь свои числа во все окошки и найди результат всей задачи." +
            (block.formula.includes("(")
              ? " Сначала выполни действие в скобках."
              : "") +
            (ops.includes("divide")
              ? " Умножение и деление выполняем раньше сложения и вычитания. Действия одной ступени выполняем слева направо."
              : ops.includes("multiply")
                ? " Умножение выполняем раньше сложения и вычитания."
                : "") +
            (ops.includes("divide")
              ? " При делении должны получаться целые числа."
              : ""),
        ),
        check(),
      );
    }
    case "relation":
      return lesson(
        `relation.${block.difference < 0 ? "less" : "more"}`,
        block.difference < 0 ? "На несколько меньше" : "На несколько больше",
        step(
          block.difference < 0
            ? "На 2 меньше, чем 5: берём столько же и убираем 2. Получается 3."
            : "На 2 больше, чем 3: берём столько же и добавляем 2. Получается 5.",
          "answer",
          example(
            "groups",
            block.difference < 0 ? [5, 3] : [3, 5],
            block.difference < 0 ? "5 − 2 = 3" : "3 + 2 = 5",
          ),
        ),
        step(
          "Выбери количество в первой группе. Во второй сделай на указанное число больше или меньше. Затем обведи рисунок.",
        ),
        check(),
      );
    case "story": {
      const variants = block.story.variants;
      const ops = [
        ...new Set(variants.flatMap((v) => v.steps.map((s) => s.operator))),
      ].map(
        (o) =>
          ({ "+": "add", "−": "subtract", "×": "multiply", ":": "divide" })[
            o
          ] as Operation,
      );
      const multi = variants.some((v) => v.steps.length > 1);
      const inputs =
        !!block.story.inputs?.length || variants.some((v) => v.inputs?.length);
      return lesson(
        `story.${ops.join("-")}.${multi ? "multi" : "single"}.${inputs ? "complete" : "given"}.${block.story.requiredVariants ? "all" : "choose"}`,
        multi ? "Задача в несколько действий" : "Составляем и решаем задачу",
        step(
          block.story.requiredVariants
            ? "Выполни все предложенные задачи по очереди. У каждой своё условие и вопрос."
            : "Выбери сюжет. Прочитай условие и вопрос: что известно и что нужно узнать?",
          "instruction",
        ),
        ...(inputs
          ? [
              step(
                "Сначала дополни условие своими числами в указанных пределах. Затем прочитай задачу целиком.",
              ),
            ]
          : []),
        ...ops.flatMap((o) => operationSteps[o]),
        ...(multi
          ? [
              step(
                "Сначала ответь на первый вопрос. Его ответ понадобится для следующего действия.",
                "answer",
                example("sequence", [3, 2, 5, 4], "3 + 2 = 5; 5 − 1 = 4"),
              ),
            ]
          : []),
        step(
          "Выбери подходящее действие, впиши результат и укажи, что считали: предметы, рубли или другие единицы.",
        ),
        check(
          block.story.requiredVariants
            ? "Проверить все задачи"
            : "Проверить задачу",
        ),
      );
    }
    case "numberGame":
      return block.numberGame.mode === "guess"
        ? lesson(
            "number-game.hidden",
            "Находим спрятанное число",
            step(
              "Видно 4, а вместе должно быть 6. Сколько не хватает?",
              "answer",
              example("equation", [4, 2, 6], "4 + □ = 6"),
            ),
            step(
              "От 4 досчитаем до 6: пять, шесть. Добавили 2. Впиши спрятанное число в каждом раунде.",
              "answer",
              example("equation", [4, 2, 6], "4 + 2 = 6"),
            ),
            step(
              "Нажми «Открыть карточку», чтобы проверить число. Затем переходи к следующему раунду.",
              "check",
            ),
          )
        : lesson(
            "number-game.read",
            "Читаем числа",
            step(
              "В числе 13 один десяток и три единицы. Оно читается «тринадцать».",
              "answer",
              example("placeValue", [1, 3], "13 — тринадцать"),
            ),
            step("Рассмотри каждое число и выбери его название словами."),
            check(),
          );
    case "targetGame":
      return lesson(
        "target-game",
        "Считаем очки в игре",
        step(
          "Игроки ходят по очереди. Круг показывает, сколько очков даёт попадание: 10, 20 или 30.",
          "instruction",
        ),
        step(
          "Если было 20 очков и попали в круг 30, станет 50.",
          "answer",
          example("equation", [20, 30, 50], "20 + 30 = 50"),
        ),
        step(
          "Нажимай на круг в свой ход. Выиграет тот, кто первым наберёт 100 очков.",
          "answer",
        ),
      );
    default: {
      const exhaustive: never = block;
      throw new Error(`Нет учебного сценария: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function activityTeaching(
  block: Extract<Block, { kind: "activity" }>,
): TaskTeaching {
  const a = block.activity;
  switch (a.mode) {
    case "count":
      return lesson(
        a.slots ? "activity.count-slots" : "activity.count",
        "Кладём столько же",
        step(
          "Сосчитай предметы в задании по одному. Для каждого положи один предмет на поле.",
          "images",
          example("groups", [3, 3], "столько же"),
        ),
        step(
          a.token
            ? "Переноси предметы из коробки. Если есть отмеченные места, заполняй их по одному."
            : "Нажимай «+», чтобы добавить предмет, и «−», чтобы убрать лишний.",
        ),
        check(),
      );
    case "coins":
      return lesson(
        `activity.coins.${a.exchange ? "exchange" : "sum"}`,
        a.exchange ? "Размениваем монету" : "Набираем сумму монетами",
        step(
          "На монете написана её стоимость. Две монеты могут стоить по-разному.",
          "instruction",
        ),
        step(
          "Монета 2 копейки и монета 1 копейка вместе дают 3 копейки.",
          "answer",
          example("equation", [2, 1, 3], "2 + 1 = 3"),
        ),
        step(
          a.exchange
            ? "Замени большую монету несколькими меньшими. Общая сумма должна остаться такой же."
            : "Нажимай на нужные монеты и складывай их стоимость. Набери ровно нужную сумму.",
        ),
        check(),
      );
    case "groups":
      return lesson(
        "activity.equal-groups",
        "Раздаём поровну",
        ...operationSteps.divide,
        step(
          "Нажимай на группы по очереди: каждому по одному. В конце проверь, что предметов поровну и ничего не осталось.",
        ),
        check(),
      );
    case "ruler":
      return lesson(
        `activity.ruler.${a.measure ? "measure" : "mark"}${a.targets.some((n) => n > 10 && n % 10 !== 0) ? ".fine" : ""}`,
        a.measure ? "Измеряем длину" : "Находим отметку на линейке",
        step(
          "Начало предмета совмещаем с нулём. Считаем промежутки между делениями, а не сами чёрточки.",
          "answer",
          example("ruler", [0, 1, 2, 3], "3 единицы длины", 3),
        ),
        step(
          a.measure
            ? "Посмотри, у какой отметки заканчивается полоска. Нажми эту отметку на линейке."
            : "Прочитай нужную длину и найди её отметку. Следи за числами: соседние деления могут отличаться на 10.",
        ),
        ...(a.targets.some((n) => n > 10 && n % 10 !== 0)
          ? [
              step(
                "Если нужное число между подписанными десятками, нажми ближайшую отметку. Кнопками «+» и «−» меняй выбранную длину по одной единице.",
              ),
            ]
          : []),
        check(),
      );
    case "balance":
      return lesson(
        "activity.balance",
        "Уравновешиваем весы",
        step(
          "На одной чаше груз, на другой гири. Более тяжёлая чаша опускается.",
        ),
        step(
          "Добавляй гири кнопкой «+». Когда чаши на одной высоте, массы равны.",
          "answer",
          example("compare", [3, 3], "3 кг = 3 кг"),
        ),
        check(),
      );
    case "liquid":
      return lesson(
        `activity.liquid.${a.unit === "мл" ? "cups" : "litres"}`,
        "Измеряем объём",
        step(
          a.unit === "мл"
            ? "В этой модели один стакан — 200 мл. После двух стаканов будет 400 мл."
            : "Одна мерка здесь — один литр. Две одинаковые мерки — два литра.",
          "answer",
          example(
            "sequence",
            a.unit === "мл" ? [200, 400, 600, 800, 1000] : [1, 2, 3],
            a.unit === "мл" ? "5 стаканов = 1 литр" : "1 + 1 = 2 литра",
          ),
        ),
        step(
          "Каждое нажатие «+» добавляет одну мерку. Считай мерки и остановись на нужном объёме.",
        ),
        check(),
      );
    case "place":
      return lesson(
        "activity.place-value",
        "Десятки и единицы",
        step(
          "В числе 14 один десяток и четыре единицы. Десяток — это сразу 10.",
          "answer",
          example("placeValue", [1, 4], "14 = 10 + 4"),
        ),
        step(
          "Кнопками «+» и «−» набери десятки отдельно и единицы отдельно. Проверь всё число.",
        ),
        check(),
      );
    case "sequence": {
      const direction = a.targets[1] < a.targets[0] ? "backward" : "forward";
      const jump =
        a.targets.length > 1 ? Math.abs(a.targets[1] - a.targets[0]) : 1;
      const constant = a.targets
        .slice(1)
        .every((n, i) => n - a.targets[i] === a.targets[1] - a.targets[0]);
      const listed =
        a.board === "pages" || /Прочитайте числа/i.test(block.prompt);
      return lesson(
        `activity.sequence.${a.board ?? "numbers"}.${listed ? "listed" : !constant ? "runs" : `${direction}.${jump === 1 ? "ones" : "groups"}`}`,
        a.board === "pages"
          ? "Находим страницы"
          : listed
            ? "Читаем числа"
            : "Считаем по порядку",
        step(
          a.board === "pages"
            ? "Найди номер первой указанной страницы, затем остальные номера в порядке задания. Между ними может быть разное число страниц."
            : listed
              ? "Прочитай первое число в списке и найди его на кнопках. Затем так же найди каждое следующее число из списка."
              : !constant
                ? "В задании несколько рядов чисел. Закончи первый ряд, затем начни следующий: начальное число и шаг счёта могут измениться. Сверяйся с порядком чисел над кнопками."
                : direction === "backward"
                  ? `При обратном счёте каждый раз отнимаем ${jump}. Следующее число становится меньше. Считай до конца указанного ряда.`
                  : jump === 1
                    ? "При счёте вперёд каждое следующее число больше на один."
                    : `Здесь считаем через ${jump}: каждый раз прибавляем столько же.`,
          "instruction",
        ),
        step(
          `Нажимай числа в указанном порядке: ${a.targets.slice(0, 5).join(" → ")}${a.targets.length > 5 ? "…" : ""}.`,
          "answer",
          {
            kind: "sequence",
            values: a.targets.slice(0, 5),
            label: "В этом задании",
          },
        ),
        check(),
      );
    }
    case "composition": {
      const total = a.targets[0];
      const parts = a.fixedParts ?? a.differentFrom ?? [1, total - 1];
      return lesson(
        `activity.composition.${a.fixedParts ? "fixed" : a.differentFrom ? "another" : "free"}`,
        "Делим число на две части",
        step(
          `В одной части ${parts[0]}, в другой ${parts[1]}. Вместе ${total}. Разложим предметы на две части.`,
          "answer",
          a.partColors
            ? {
                ...example(
                  "compositionRow",
                  parts,
                  `${parts[0]} + ${parts[1]} = ${total}`,
                ),
                colors: a.partColors,
                token: a.token,
                pattern: a.compositionPattern,
              }
            : example("groups", parts, `${parts[0]} + ${parts[1]} = ${total}`),
        ),
        step(
          (a.partColors
            ? "Переноси предметы двух цветов на одно поле, рядом друг с другом. "
            : "") +
            (a.fixedParts
              ? "Сохрани заданные части. Разложи предметы и проверь их общую сумму."
              : a.differentFrom
                ? "Найди другой способ, чем в образце. В обеих частях должны быть предметы, а сумма — прежняя."
                : "Разложи предметы на две непустые группы. Пересчитай обе части и проверь сумму."),
        ),
        check(),
      );
    }
    default: {
      const exhaustive: never = a.mode;
      throw new Error(`Неизвестное действие ${exhaustive}`);
    }
  }
}

function workTeaching(block: Extract<Block, { kind: "work" }>): TaskTeaching {
  const labels = block.fields.map((f) => f.label).join("\n");
  const text = `${block.prompt}\n${labels}`;
  if (/выбери вопрос/i.test(labels))
    return lesson(
      `work.choose-question.${/двумя|двух/.test(text) ? "multi" : "single"}`,
      "Ставим вопрос к задаче",
      step(
        "Прочитай, что известно. Выбери вопрос, на который можно ответить по этим данным.",
        "instruction",
      ),
      step(
        "Например: было 5 яблок, 2 съели. Можно узнать, сколько осталось: 5 − 2 = 3.",
        "answer",
        example("equation", [5, 2, 3], "5 − 2 = 3"),
      ),
      step(
        "Выбери подходящий вопрос, затем реши все действия под ним. В задаче в два действия первый ответ нужен для второго.",
      ),
      check(),
    );
  if (/десятк|десятков|пучк/.test(labels))
    return lesson(
      "work.place-value",
      "Записываем десятки и единицы",
      step(
        "Один десяток и 4 единицы — это 14. Слева записываем число десятков, справа — единиц.",
        "answer",
        example("placeValue", [1, 4], "14 = 10 + 4"),
      ),
      step(
        "Посмотри, о чём спрашивают в каждом поле: обо всём числе, только десятках или только единицах. Впиши ответ.",
      ),
      check(),
    );
  if (
    /чисел не хватает|числа по порядку|Назовите по порядку|Число на месте|страница.*(следует|после)|страниц.*идёт после/i.test(
      text,
    )
  )
    return lesson(
      "work.number-order",
      "Восстанавливаем порядок чисел",
      step(
        "Числа идут по порядку. После 3 идёт 4, после 4 — 5.",
        "answer",
        example("sequence", [3, 4, 5], "3 → □ → 5", 2),
      ),
      step(
        "Найди соседей каждого пропуска и впиши недостающее число. Для страницы «после» прибавь один.",
      ),
      check(),
    );
  if (/Запишите цифрами числа/i.test(block.prompt))
    return lesson(
      "work.number-words",
      "Записываем число цифрами",
      step(
        "«Двадцать три» — это два десятка и три единицы: 23.",
        "answer",
        example("placeValue", [2, 3], "двадцать три → 23"),
      ),
      step("Прочитай название каждого числа и запиши его цифрами."),
      check(),
    );
  if (
    /сколько (нужно |надо )?(прибавить|отнять)|к какому числу|угадайте.*число/i.test(
      text,
    )
  ) {
    const subtract = /отнять/.test(text);
    const first = /к какому числу/i.test(text);
    return lesson(
      `work.missing-number.${subtract ? "subtrahend" : first ? "first-addend" : "second-addend"}`,
      "Находим неизвестное число",
      step(
        subtract
          ? "В примере 5 − □ = 3 известно, сколько было и сколько осталось. Нужно узнать, сколько убрали."
          : first
            ? "В примере □ + 2 = 5 неизвестно, сколько было сначала. Известно, сколько прибавили и сколько стало."
            : "В примере 3 + □ = 5 известно, сколько было и сколько стало. Нужно узнать, сколько прибавили.",
        "answer",
        example(
          "equation",
          subtract ? [5, 2, 3] : [3, 2, 5],
          subtract ? "5 − □ = 3" : first ? "□ + 2 = 5" : "3 + □ = 5",
        ),
      ),
      step(
        subtract
          ? "Было 5, осталось 3: убрали 5 − 3 = 2. Проверка: 5 − 2 = 3."
          : first
            ? "Из результата уберём то, что прибавили: 5 − 2 = 3. Проверка: 3 + 2 = 5."
            : "Досчитай от 3 до 5: четыре, пять. Прибавили 2. Проверка: 3 + 2 = 5.",
        "answer",
        example(
          "equation",
          subtract ? [5, 2, 3] : [3, 2, 5],
          subtract ? "5 − 2 = 3" : "3 + 2 = 5",
        ),
      ),
      step(
        "Найди неизвестное число в своём задании. Подставь его мысленно и проверь, получается ли нужный результат.",
      ),
      check(),
    );
  }
  if (
    /на сколько|на \d+ .*больше|на \d+ .*меньше|число меньше|число больше/i.test(
      text,
    )
  ) {
    const difference = /на сколько/i.test(text);
    return lesson(
      `work.compare.${difference ? "difference" : /меньше/.test(text) ? "less" : "more"}`,
      difference
        ? "На сколько больше или меньше?"
        : "На несколько больше или меньше",
      step(
        difference
          ? "Поставим 3 кружка в пару к 5. У большей группы останется 2 без пары — на 2 больше."
          : "На 2 больше, чем 3, — это 3 + 2. На 2 меньше, чем 5, — это 5 − 2.",
        "answer",
        example("groups", [3, 5], "5 − 3 = 2"),
      ),
      step(
        "Прочитай, нужно ли найти разницу или новое количество. Реши каждое действие и запиши ответы.",
      ),
      check(),
    );
  }
  const ops = operations(labels);
  if (ops.length) {
    const chained = block.fields.some(
      (f) => (f.label.match(/[+−×]|\d\s*:/g) ?? []).length > 1,
    );
    const wordProblem =
      /[?]|сколько|реши.*задач/i.test(block.prompt) &&
      !/^\s*\d+\s*[+−×:]/.test(block.prompt);
    const result = arithmetic(
      `work.${wordProblem ? "word-problem" : chained ? "chain" : "calculate"}`,
      ops,
      wordProblem
        ? "Прочитай условие и вопрос. Определи, что произошло с количеством и что нужно узнать."
        : chained
          ? ops.some((o) => o === "multiply" || o === "divide")
            ? (labels.includes("(")
                ? "Сначала выполни действия в скобках. "
                : "") +
              (ops.includes("divide")
                ? "Умножение и деление выполняем раньше сложения и вычитания. Действия одной ступени выполняем слева направо."
                : "Умножение выполняем раньше сложения и вычитания.")
            : "В цепочке сложений и вычитаний считай слева направо: ответ первого действия используй в следующем."
          : "Прочитай пример. Знак между числами подскажет, что с ними делать.",
    );
    return result;
  }
  if (block.fields.some((f) => f.options))
    return lesson(
      "work.reasoned-choice",
      "Считаем и выбираем вывод",
      step(
        "Сначала найди числовые ответы. Затем сравни их и прочитай варианты вывода.",
        "instruction",
      ),
      step(
        "Например, если нужно 6 предметов, а есть 8, их хватит и останется 2.",
        "answer",
        example("equation", [8, 6, 2], "8 − 6 = 2"),
      ),
      step("Заполни числовые поля и выбери подходящий вывод."),
      check(),
    );
  const inferred = operations(text);
  if (
    /всего|стало|ещё|вместе|обратно|позже/.test(text) &&
    !inferred.includes("add")
  )
    inferred.push("add");
  if (
    /остал|сорва|улетел|взял|взяли|выда|вышел/.test(text) &&
    !inferred.includes("subtract")
  )
    inferred.push("subtract");
  if (/всего клеток|всего копеек|флажков в связке/.test(text)) {
    return lesson(
      "work.equal-groups-total",
      "Считаем одинаковые группы",
      ...operationSteps.multiply,
      step(
        "Сосчитай, сколько в одной группе и сколько таких групп. Найди общее количество. У монет считай стоимость, а не только их число.",
      ),
      check(),
    );
  }
  if (inferred.length)
    return arithmetic(
      "work.word-reasoning",
      inferred,
      "Прочитай, что известно и что нужно узнать. Представь события по порядку. Для каждого вопроса выбери своё действие.",
    );
  return lesson(
    "work.count-and-record",
    "Считаем и записываем",
    step(
      "Прочитай подпись над первым полем: какие предметы и в какой группе нужно сосчитать?",
      "instruction",
    ),
    step(
      "Считай по одному и не считай один предмет дважды. Затем переходи к следующей группе.",
      "images",
      example("count", [3], "1 → 2 → 3", 2),
    ),
    step(
      "Впиши число в поле под соответствующим вопросом. Ответь на все вопросы.",
    ),
    check(),
  );
}
