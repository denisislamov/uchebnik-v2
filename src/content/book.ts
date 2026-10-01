import { remainingPages } from "./fullBook.ts";
import { childInteraction } from "./childInteractions.ts";
import { originalIllustrations } from "./illustrationMode.ts";
import type { Block, BookPage } from "./types.ts";
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
type BlockDraft = WithoutId<Block>;
const img = (p: number, name: string) =>
  `p${String(p).padStart(3, "0")}_${name}`;
const read = (
  title: string,
  body: string,
  images: string[] = [],
): BlockDraft => ({
  kind: "read",
  title,
  prompt: "Рассмотри страницу",
  body,
  images,
});
const number = (
  title: string,
  prompt: string,
  expected: number,
  images: string[] = [],
  sourceText?: string,
): BlockDraft => ({
  kind: "number",
  title,
  prompt,
  expected,
  images,
  sourceText,
  adaptation: !sourceText,
  hint: "Считай по одному. Не пропускай предметы и не считай один предмет дважды.",
});
const choice = (
  title: string,
  prompt: string,
  options: string[],
  expected: string,
  images: string[],
  sourceText?: string,
): BlockDraft => ({
  kind: "choice",
  title,
  prompt,
  options,
  expected,
  images,
  sourceText,
  adaptation: !sourceText,
  hint: "Внимательно рассмотри рисунок и сравни обе стороны.",
});
const counters = (
  title: string,
  prompt: string,
  expected: number | undefined,
  token: "stick" | "circle",
  images: string[],
  review?: string,
): BlockDraft => ({
  kind: "counters",
  title,
  prompt,
  sourceText: prompt,
  expected,
  token,
  images,
  review,
  hint: "Возьми предмет внизу и перенеси на поле. Чтобы убрать лишний, перетащи его обратно или нажми «Отменить».",
});
const draw = (
  title: string,
  prompt: string,
  image: string,
  rubric: string,
  guide?: string,
): BlockDraft => ({
  kind: "draw",
  title,
  prompt,
  images: [image],
  rubric,
  guide,
  adaptation: true,
  hint: "Можно рисовать пальцем, мышью или стилусом. Не спеши: аккуратность приходит с практикой.",
});
const shape = (
  title: string,
  prompt: string,
  down: boolean,
  triangle: boolean,
  image: string,
): BlockDraft => ({
  kind: "shape",
  title,
  prompt,
  sourceText: triangle ? "Сложи из палочек:" : "Составь из палочек:",
  images: [image],
  vertices: down
    ? [
        { x: 0.15, y: 0.8 - (0.7 * Math.sqrt(3)) / 2 },
        { x: 0.85, y: 0.8 - (0.7 * Math.sqrt(3)) / 2 },
        { x: 0.5, y: 0.8 },
      ]
    : [
        { x: 0.15, y: 0.8 },
        { x: 0.5, y: 0.8 - (0.7 * Math.sqrt(3)) / 2 },
        { x: 0.85, y: 0.8 },
      ],
  edges: triangle
    ? [
        [0, 1],
        [1, 2],
        [0, 2],
      ]
    : down
      ? [
          [0, 2],
          [1, 2],
        ]
      : [
          [0, 1],
          [1, 2],
        ],
  hint: "Перетащи палочки на пунктир, чтобы собрать фигуру.",
});
function page(
  n: number,
  title: string,
  subtitle: string,
  hero: string,
  blocks: BlockDraft[],
): BookPage {
  return {
    id: `p${String(n).padStart(3, "0")}`,
    number: n,
    title,
    subtitle,
    hero,
    sourceDoc: `textbook/page_docs/arithmetic_grade1_pchelko_1959_p${String(n).padStart(3, "0")}.md`,
    blocks: blocks.map((b, i) => {
      const interactive = childInteraction({
        ...b,
        id: `p${String(n).padStart(3, "0")}-block${String(i + 1).padStart(2, "0")}`,
      } as Block);
      if (n === 9 && i === 0)
        interactive.prompt = `${b.prompt} Нажми на птичек, чтобы показать ответ.`;
      return interactive;
    }),
  };
}
export const pages: BookPage[] = [
  page(
    1,
    "Здравствуй, арифметика!",
    "Знакомство с книгой",
    "p001_cover_chicks_5",
    [
      read(
        "Книга, с которой всё начинается",
        "Арифметика · 1 класс\n\nРассмотри картинки на обложке. Рядом с каждой группой предметов написана цифра. Здесь можно познакомиться с числами от одного до семи.",
        [img(1, "cover_title_frame")],
      ),
      ...[
        ["Гриб", "cover_mushroom_1"],
        ["Жёлуди", "cover_acorns_2"],
        ["Ромашки", "cover_daisies_3"],
        ["Рыбки", "cover_fish_4"],
        ["Цыплята", "cover_chicks_5"],
        ["Красная смородина", "cover_red_currants_6"],
        ["Чёрная смородина", "cover_black_currants_7"],
      ].map(([title, image], i) =>
        read(
          title,
          `На картинке ${i + 1} ${["гриб", "жёлудя", "ромашки", "рыбки", "цыплят", "ягод красной смородины", "ягод чёрной смородины"][i]}. Найди эту цифру рядом с рисунком.`,
          [img(1, image)],
        ),
      ),
    ],
  ),
  page(
    2,
    "О нашей книге",
    "Авторы и история",
    originalIllustrations ? "p002_title_vignette" : "p001_cover_title_frame",
    [
      read(
        "Арифметика · 1959",
        "АКАДЕМИЯ ПЕДАГОГИЧЕСКИХ НАУК РСФСР\n\nА. С. ПЧЁЛКО и Г. Б. ПОЛЯК\n\nАРИФМЕТИКА\nУЧЕБНИК ДЛЯ ПЕРВОГО КЛАССА НАЧАЛЬНОЙ ШКОЛЫ\n\nУТВЕРЖДЁН МИНИСТЕРСТВОМ ПРОСВЕЩЕНИЯ РСФСР\n\nИЗДАНИЕ ПЯТОЕ\n\nГОСУДАРСТВЕННОЕ УЧЕБНО-ПЕДАГОГИЧЕСКОЕ ИЗДАТЕЛЬСТВО МИНИСТЕРСТВА ПРОСВЕЩЕНИЯ РСФСР\nМОСКВА · 1959",
        originalIllustrations ? [img(2, "title_vignette")] : [],
      ),
    ],
  ),
  page(3, "Больше или меньше?", "Сравниваем предметы", "p003_school_children", [
    read(
      "Первый десяток",
      "Дети идут в школу. Рассмотри дорожку, деревья и школьное здание. Сегодня будем сравнивать предметы по размеру и длине.",
      [img(3, "school_children")],
    ),
    choice(
      "Большой мяч",
      "Какой мяч больше?",
      ["Левый", "Правый"],
      "Левый",
      [img(3, "balls_bigger_smaller")],
      "Больше — меньше.",
    ),
    choice(
      "Маленький мяч",
      "Какой мяч меньше?",
      ["Левый", "Правый"],
      "Правый",
      [img(3, "balls_bigger_smaller")],
      "Больше — меньше.",
    ),
    choice(
      "Длинный карандаш",
      "Какой карандаш длиннее?",
      ["Зелёный, сверху", "Красный, снизу"],
      "Зелёный, сверху",
      [img(3, "pencils_longer_shorter")],
      "Длиннее — короче.",
    ),
    choice(
      "Короткий карандаш",
      "Какой карандаш короче?",
      ["Зелёный, сверху", "Красный, снизу"],
      "Красный, снизу",
      [img(3, "pencils_longer_shorter")],
      "Длиннее — короче.",
    ),
    draw(
      "Чёрточка и точка",
      "Повтори узор: чёрная чёрточка, красная точка.",
      img(3, "writing_strip_dashes_dots"),
      "Чёрточки и точки чередуются. Линии лежат в клетках. В полном образце 12 чёрточек и 11 точек.",
    ),
  ]),
  page(4, "Считаем у реки", "Предметов столько же", "p004_boys_river_bathing", [
    read(
      "Летний день",
      "На рисунке дети купаются, играют с лодочкой и отдыхают на берегу. Рассмотри также маленькие фигуры вдали.",
      [img(4, "boys_river_bathing")],
    ),
    number(
      "Дети",
      "Сколько детей?",
      10,
      [img(4, "boys_river_bathing")],
      "Сколько детей?",
    ),
    number(
      "Деревья",
      "Сколько деревьев?",
      5,
      [img(4, "boys_river_bathing")],
      "Сколько деревьев?",
    ),
    number(
      "Лодочка",
      "Сколько лодочек?",
      1,
      [img(4, "boys_river_bathing")],
      "Сколько лодочек?",
    ),
    counters(
      "Палочки и деревья",
      "Покажи столько палочек, сколько нарисовано деревьев.",
      5,
      "stick",
      [img(4, "boys_river_bathing")],
    ),
    counters(
      "Кружки и дети",
      "Положи столько кружков, сколько нарисовано детей.",
      10,
      "circle",
      [img(4, "boys_river_bathing")],
    ),
    draw(
      "Квадраты",
      "Нарисуй ряд квадратов по образцу.",
      img(4, "squares_row_sample"),
      "10 квадратов: первые 5 пустые, следующие 5 с диагональю снизу слева вверх направо.",
    ),
    draw(
      "Три ёлочки",
      "Повтори ёлочки: высокую, среднюю и низкую.",
      img(4, "fir_trees_sample"),
      "Три ёлочки с 4, 3 и 2 ярусами веток; высота уменьшается слева направо.",
    ),
    draw(
      "Ритм в клетках",
      "Повтори чёрточки и красные точки.",
      img(4, "dashes_dots_line"),
      "Чередование чёрточки и точки; в образце 12 чёрточек и 11 точек.",
    ),
  ]),
  page(
    5,
    "Собираем урожай",
    "Счёт и соответствие",
    "p005_field_harvest_sacks",
    [
      counters(
        "Ящики с урожаем",
        "Покажи столько палочек, сколько нарисовано ящиков с овощами.",
        6,
        "stick",
        [img(5, "field_harvest_sacks")],
        "На новой иллюстрации шесть отдельных ящиков. Положите по палочке на каждый ящик; старый скан с перекрывающимися мешками остаётся доступным в режиме сравнения.",
      ),
      counters(
        "Огурцы",
        "Положи столько кружков, сколько нарисовано огурцов.",
        7,
        "circle",
        [img(5, "bowl_cucumbers")],
      ),
      counters(
        "Помидоры",
        "Положи столько кружков, сколько нарисовано помидоров.",
        8,
        "circle",
        [img(5, "basket_tomatoes")],
      ),
      draw(
        "Штрихи и точки",
        "Повтори две верхние строчки: штрихи, точки и палочки.",
        img(5, "writing_strip_dashes_dots_slashes"),
        "4 пары горизонтальных штрихов, два ряда по 4 чёрные точки и 4 наклонные палочки.",
      ),
      draw(
        "Волны",
        "Повтори нижний ряд: волнистая линия и красная точка.",
        img(5, "writing_strip_dashes_dots_slashes"),
        "12 волнистых штрихов с 11 красными точками между ними.",
      ),
    ],
  ),
  page(
    6,
    "Слева, справа, вверху",
    "Ориентируемся в пространстве",
    "p006_children_planting_garden",
    [
      read(
        "Школьный сад",
        "Дети работают на участке: сажают деревце, ухаживают за клумбой. Расскажи, кто чем занят.",
        [img(6, "children_planting_garden")],
      ),
      ...(
        [
          ["Флажок", "blackboard_flag_star", "Вверху", "Слева", "расположен"],
          [
            "Звёздочка",
            "blackboard_flag_star",
            "Вверху",
            "Справа",
            "расположена",
          ],
          ["Домик", "blackboard_house_tree", "Внизу", "Слева", "расположен"],
          ["Ёлочка", "blackboard_house_tree", "Внизу", "Справа", "расположена"],
        ] as const
      ).map(([title, im, vertical, horizontal, verb]): BlockDraft => ({
        kind: "location",
        title,
        prompt: `Где ${verb} ${title.toLowerCase()}: вверху или внизу?`,
        verticalPrompt: `Где ${verb} ${title.toLowerCase()}: вверху или внизу?`,
        horizontalPrompt: `Где ${verb} ${title.toLowerCase()}: слева или справа?`,
        location: { vertical, horizontal },
        images: [img(6, im)],
        sourceText:
          title === "Флажок"
            ? "Где расположен флажок: вверху или внизу? слева или справа?"
            : "Где расположены звёздочка? домик? ёлочка?",
        hint: "Рассмотри доску. Сначала выбери верх или низ, затем левую или правую сторону.",
      })),
      draw(
        "Колечки",
        "Нарисуй верхний ряд: кольца с красной точкой внутри.",
        img(6, "writing_strip_circles_hooks_waves"),
        "12 колец с красной точкой в каждом.",
      ),
      draw(
        "Крючки",
        "Повтори средний ряд крючков.",
        img(6, "writing_strip_circles_hooks_waves"),
        "12 наклонных крючков с завитком вверху.",
      ),
      draw(
        "Волны и точки",
        "Повтори нижний ряд волн.",
        img(6, "writing_strip_circles_hooks_waves"),
        "12 волн, между ними 11 бирюзовых точек.",
      ),
    ],
  ),
  page(
    7,
    "Один и много",
    "Знакомимся с числом 1",
    "p007_boy_one_mushroom_forest",
    [
      read(
        "Много и один",
        "Один мальчик стоит на переднем плане. В глубине леса — группа детей. Под деревом один гриб.",
        [img(7, "boy_one_mushroom_forest")],
      ),
      choice(
        "Один и много",
        "Где много детей?",
        ["На переднем плане", "В глубине леса"],
        "В глубине леса",
        [img(7, "boy_one_mushroom_forest")],
        "Много — один.",
      ),
      ...[
        ["Гриб", "one_mushroom"],
        ["Белка", "one_squirrel"],
        ["Ёж", "one_hedgehog"],
      ].map(([t, im]) =>
        number(t, "Сколько предметов на рисунке?", 1, [img(7, im)]),
      ),
      counters(
        "Одна бусина",
        "На счётной линейке отодвинута одна бусина. Положи столько же кружков.",
        1,
        "circle",
        [img(7, "abacus_1")],
      ),
      read(
        "Это число 1",
        "Одна точка, один кружок и цифра 1 обозначают одно и то же количество.",
        [img(7, "domino_1"), img(7, "digit_1_print"), img(7, "one_green_dot")],
      ),
      number("Учебная монета", "Какое число написано на монете?", 1, [
        img(7, "coin_1_kopek"),
      ]),
      draw(
        "Пишем 1",
        "Рассмотри образец. Обведи цифру 1 и напиши рядом свою.",
        img(7, "digit_1_sample"),
        "Есть наклонный входной штрих и длинная палочка. Цифра узнаваема.",
        "1",
      ),
      draw(
        "Нарисуй гриб",
        "Нарисуй один гриб и подпиши под рисунком 1.",
        img(7, "mushroom_draw"),
        "Нарисован ровно один гриб, под ним написано 1.",
      ),
      number(
        "Подпись к рисунку",
        "Какую цифру нужно подписать под одним грибом?",
        1,
        [],
        "Подпиши под рисунком 1.",
      ),
    ],
  ),
  page(
    8,
    "Один и ещё один",
    "Знакомимся с числом 2",
    "p008_two_boys_checkers",
    [
      read(
        "Число 2",
        "Два мальчика играют в шашки. Найди в комнате парные предметы: стулья, окна и рамки.",
        [img(8, "two_boys_checkers")],
      ),
      number("Коньки", "Сколько коньков?", 2, [img(8, "two_skates")]),
      number("Лыжи", "Сколько лыж?", 2, [img(8, "two_skis")]),
      number("Колёса", "Сколько колёс у велосипеда?", 2, [
        img(8, "bicycle_two_wheels"),
      ]),
      {
        kind: "practical",
        title: "Одна и ещё одна",
        prompt:
          "Положи 1 палочку. Положи ещё 1 палочку. Сколько стало палочек?",
        images: [],
        steps: [
          {
            id: "first",
            instruction: "Положи 1 палочку.",
            mode: "place",
            token: "stick",
            counts: [1],
          },
          {
            id: "more",
            instruction: "Положи ещё 1 палочку.",
            mode: "place",
            token: "stick",
            counts: [2],
            carryFrom: "first",
          },
        ],
        fields: [{ id: "q1", label: "Сколько стало палочек?", expected: "2" }],
      },
      shape(
        "Угол вершиной вверх",
        "Составь из двух палочек угол вершиной вверх.",
        false,
        false,
        img(8, "sticks_angle_v"),
      ),
      shape(
        "Угол вершиной вниз",
        "Составь угол вершиной вниз.",
        true,
        false,
        img(8, "sticks_angle_v"),
      ),
      read(
        "Это число 2",
        "Две отодвинутые бусины на счётной линейке, две точки, два зелёных кружка и цифра 2.",
        [
          img(8, "abacus_2"),
          img(8, "domino_2"),
          img(8, "digit_2_print"),
          img(8, "two_green_dots"),
        ],
      ),
      number("Учебная монета", "Какое число написано на монете?", 2, [
        img(8, "coin_2_kopeks"),
      ]),
      ...["рук", "ног", "глаз", "ушей"].map((t) =>
        number(
          `Сколько ${t}?`,
          `Сколько у человека ${t}?`,
          2,
          [],
          `Сколько у человека рук? ног? глаз? ушей?`,
        ),
      ),
      draw(
        "Пишем 2",
        "Обведи цифру 2 и попробуй написать её самостоятельно.",
        img(8, "digit_2_sample"),
        "Цифра 2 узнаваема: закругление сверху, наклонный спуск и основание.",
        "2",
      ),
      draw(
        "Две сливы",
        "Нарисуй две сливы и подпиши под рисунком 2.",
        img(8, "plums_draw"),
        "Две отдельные сливы; под рисунком цифра 2.",
      ),
      number(
        "Подпись к рисунку",
        "Какую цифру подпишем под двумя сливами?",
        2,
        [],
        "Подпиши под рисунком 2.",
      ),
    ],
  ),
  page(
    9,
    "Птички и другие зверята",
    "Считаем до двух",
    "p009_two_bullfinches_branch",
    [
      number(
        "Птички на ветке",
        "На ветке сидела 1 птичка. К ней прилетела ещё 1 птичка. Сколько стало птичек?",
        2,
        [img(9, "two_bullfinches_branch")],
        "На ветке сидела 1 птичка. К ней прилетела ещё 1 птичка. Сколько стало птичек?",
      ),
      number(
        "Петух",
        "Сколько ног у петуха?",
        2,
        [img(9, "rooster")],
        "Сколько ног у петуха? у цыплёнка?",
      ),
      number(
        "Цыплёнок",
        "Сколько ног у цыплёнка?",
        2,
        [img(9, "chick")],
        "Сколько ног у петуха? у цыплёнка?",
      ),
      number(
        "Кролик",
        "Сколько ушей у кролика?",
        2,
        [img(9, "rabbit")],
        "Сколько ушей?",
      ),
      number(
        "Ворона",
        "Сколько крыльев у вороны?",
        2,
        [img(9, "crow_flying")],
        "Сколько крыльев?",
      ),
      draw(
        "Клетка за клеткой",
        "Повтори фигуры слева направо.",
        img(9, "writing_strip_squares_rects"),
        "Одна клетка; две клетки горизонтально; две вертикально; снова одна клетка. Важна ориентация, а не сумма.",
      ),
    ],
  ),
  page(10, "Два и ещё один", "Знакомимся с числом 3", "p010_boys_fishing", [
    read(
      "Число 3",
      "Два мальчика уже рыбачат. Третий подходит к ним с удочкой. Рассмотри, что происходит на берегу.",
      [img(10, "boys_fishing")],
    ),
    number("Рыбаки", "Сколько всего мальчиков?", 3, [img(10, "boys_fishing")]),
    number("Рыбы", "Сколько рыб?", 3, [img(10, "three_fish")]),
    number("Земляника", "Сколько красных ягод?", 3, [
      img(10, "three_strawberries"),
    ]),
    counters(
      "Две и ещё одна",
      "Положи столько кружков, сколько отодвинутых бусин на счётной линейке.",
      3,
      "circle",
      [img(10, "abacus_3")],
    ),
    read(
      "Это число 3",
      "Две точки и ещё одна — три. Три зелёных кружка и печатная цифра 3.",
      [
        img(10, "domino_3"),
        img(10, "digit_3_print"),
        img(10, "three_green_dots"),
      ],
    ),
    number("Учебная монета", "Какое число написано на монете?", 3, [
      img(10, "coin_3_kopeks"),
    ]),
    draw(
      "Пишем 3",
      "Обведи цифру 3 и напиши рядом свою.",
      img(10, "digit_3_sample"),
      "Два закругления открываются влево; цифра 3 узнаваема.",
      "3",
    ),
    shape(
      "Первый треугольник",
      "Сложи треугольник вершиной вверх.",
      false,
      true,
      img(10, "sticks_triangles"),
    ),
    shape(
      "Второй треугольник",
      "Сложи треугольник вершиной вниз.",
      true,
      true,
      img(10, "sticks_triangles"),
    ),
    draw(
      "Три вишни",
      "Нарисуй три вишни и подпиши под рисунком 3.",
      img(10, "cherries_draw"),
      "Три вишни на отдельных черенках; под рисунком цифра 3.",
    ),
    number(
      "Подпись к рисунку",
      "Какую цифру подпишем под тремя вишнями?",
      3,
      [],
      "Подпиши под рисунком 3.",
    ),
  ]),
];
pages.push(...remainingPages);
for (const block of pages[10].blocks) {
  if (block.id !== "p011-lesson04" || block.kind !== "activity") continue;
  block.prompt =
    "Из каких учебных монет можно составить число 3? Набери 3 из монет с цифрами.";
  block.activity.unit = "единицы";
}
for (const block of pages[11].blocks) {
  if (block.id !== "p012-lesson01") continue;
  block.prompt = "Посчитай детей, отодвинутые бусины и точки.";
  if (!originalIllustrations && block.kind === "work") {
    block.fields = block.fields.map((field) =>
      field.id === "q2"
        ? { ...field, label: "Сколько бусин отодвинуто на счётной линейке?" }
        : field,
    );
  }
}
for (const block of pages[14].blocks) {
  if (block.id !== "p015-lesson04" || block.kind !== "activity") continue;
  block.prompt = "Набери число 5 из учебных монет с цифрами.";
  block.activity.unit = "единицы";
}
for (const block of pages[18].blocks) {
  if (block.id === "p019-lesson04" && block.kind === "activity") {
    block.prompt = "Набери число 6 из учебных монет с цифрами.";
    block.activity.unit = "единицы";
  }
  if (block.id === "p019-lesson01" && block.kind === "work") {
    block.fields = block.fields.map((field) => ({
      ...field,
      label:
        field.id === "q1"
          ? "Мальчик добавляет рыбку. Сколько рыбок станет в аквариуме?"
          : "Девочка добавляет горшок. Сколько горшков с растениями станет на подоконнике?",
    }));
  }
}
for (const block of pages[28].blocks) {
  if (block.id !== "p029-lesson07" || block.kind !== "activity") continue;
  block.prompt = "Набери число 10 из учебных монет с цифрами.";
  block.activity.unit = "единицы";
}
if (!originalIllustrations) {
  for (const block of pages[33].blocks) {
    if (block.id !== "p034-source06") continue;
    block.prompt =
      "У Маши было 5 пуговиц. К пальто она пришила 2 пуговицы. Сколько пуговиц осталось у Маши?";
  }
  for (const block of pages[35].blocks) {
    if (block.id !== "p036-source13") continue;
    block.prompt =
      "У Васи две учебные монеты с числами 2 и 3. Какое число получится, если их сложить?";
  }
  const page62Prompts: Record<string, string> = {
    "p062-source07":
      "У Коли две учебные монеты с числами 10 и 2. Сколько получится вместе?",
    "p062-source09":
      "У Нади две учебные монеты с числами 10 и 5. Сколько получится вместе?",
    "p062-source10":
      "У брата учебная монета с числом 10, и у сестры такая же. Сколько получится вместе?",
  };
  for (const block of pages[61].blocks) {
    if (page62Prompts[block.id]) block.prompt = page62Prompts[block.id];
  }
  const page67Prompts: Record<string, string> = {
    "p067-source06":
      "Передвинь на верхнем ряду счётной линейки 7 бусин, а на нижнем — столько же.",
    "p067-source07":
      "На верхнем ряду 5 бусин. На нижнем столько же и ещё 1 бусина. Сколько бусин на нижнем ряду?",
    "p067-source08":
      "Передвинь на верхнем ряду счётной линейки 6 бусин, а на нижнем — столько же и ещё 2 бусины. На нижнем ряду на 2 бусины больше.",
  };
  for (const block of pages[66].blocks) {
    if (page67Prompts[block.id]) block.prompt = page67Prompts[block.id];
  }
  for (const block of pages[77].blocks) {
    if (block.id === "p078-source01") {
      block.prompt =
        "На учебных ценниках зубная щётка стоит 3 жетона, а упаковка пластырей — 1 жетон. Девочка дала кассиру 5 жетонов. Сколько жетонов она получила обратно?";
    } else if (block.id === "p078-source05" && block.kind === "story") {
      block.story.variants = block.story.variants.map((variant) =>
        variant.id.includes("bandage")
          ? {
              ...variant,
              label: variant.label.replace("бинт", "пластыри"),
              description: variant.description.replace(
                "бинт за 1 рубль",
                "упаковку пластырей за 1 жетон",
              ),
            }
          : variant,
      );
    }
  }
  for (const block of pages[80].blocks) {
    if (block.id !== "p081-source07") continue;
    block.prompt =
      "На учебных ценниках глубокая тарелка стоит 7 жетонов, а мелкая — на 3 жетона меньше. Сколько стоит мелкая тарелка? Сколько стоят обе тарелки вместе?";
  }
  const page94Prompts: Record<string, string> = {
    "p094-source01":
      "В школьную столовую привезли два контейнера с молоком. В одном 12 л, а в другом на 4 л меньше. Сколько литров молока привезли всего? На рисунке показаны два современных контейнера: на первом указано 12 л, на втором число нужно найти.",
    "p094-source02":
      "В одном контейнере 7 л воды, а в другом на 3 л больше. Сколько литров воды в двух контейнерах?",
  };
  for (const block of pages[93].blocks) {
    if (page94Prompts[block.id]) block.prompt = page94Prompts[block.id];
  }
  const page96Prompts: Record<string, string> = {
    "p096-source04":
      "В прошлом году ферма купила 8 плугов, а в этом году на 4 плуга больше. Сколько всего плугов купила ферма за два года? На рисунке показаны современные плуг и трактор; один рисунок обозначает вид техники, а не её количество в задаче.",
    "p096-source05":
      "В прошлом году на полях фермы работало 8 тракторов, а в этом году на 3 трактора больше. Сколько тракторов работало в этом году?",
  };
  for (const block of pages[95].blocks) {
    if (page96Prompts[block.id]) block.prompt = page96Prompts[block.id];
  }
  const page99Prompts: Record<string, string> = {
    "p099-source01":
      "На учебном ценнике мяча стоит число 2. Для детского сада купили 5 таких мячей. Сколько жетонов нужно за все мячи? Под каждым из пяти мячей показан ценник с числом 2.",
    "p099-source02":
      "Один мяч стоит 2 учебных жетона. Сколько жетонов нужно за 7 таких мячей?",
    "p099-source03":
      "Чайная ложка стоит 2 учебных жетона. Сколько жетонов нужно за 4 такие ложки?",
    "p099-source04":
      "Мама взяла 3 чайные ложки по 2 учебных жетона и дала 10 жетонов. Сколько жетонов она получила обратно?",
    "p099-source05":
      "Для украшения ёлки Вера выбрала 8 игрушек по 2 учебных жетона и дала 20 жетонов. Сколько жетонов она получила обратно?",
  };
  for (const block of pages[98].blocks) {
    if (page99Prompts[block.id]) block.prompt = page99Prompts[block.id];
  }
  const page102Prompts: Record<string, string> = {
    "p102-source01":
      "На рисунке четыре учебные монеты с числом 3. Сколько получится вместе?",
    "p102-source02":
      "Ира взяла 5 конвертов по 3 учебных жетона. Сколько жетонов она отдала?",
    "p102-source03":
      "Мальчик взял 4 конверта по 3 учебных жетона и дал 20 жетонов. Сколько жетонов он получил обратно?",
    "p102-source04":
      "Мама взяла 6 кг яблок по 3 учебных жетона за килограмм и дала 20 жетонов. Сколько жетонов она получила обратно?",
  };
  for (const block of pages[101].blocks) {
    if (page102Prompts[block.id]) block.prompt = page102Prompts[block.id];
    if (block.id === "p102-source01" && block.kind === "work") {
      block.fields = block.fields.map((field) =>
        field.id === "q1"
          ? { ...field, label: "Сколько получится вместе?" }
          : field,
      );
    }
  }
  for (const block of pages[102].blocks) {
    if (block.id !== "p103-source06") continue;
    block.prompt =
      "Папа взял для детей 3 билета в театр по 4 учебных жетона за билет. Сколько жетонов он отдал?";
  }
  for (const block of pages[104].blocks) {
    if (block.id !== "p105-source04") continue;
    block.prompt =
      "На рисунке три учебные монеты с числом 5. Сколько получится вместе?";
  }
  for (const block of pages[105].blocks) {
    if (block.id !== "p106-source02") continue;
    block.prompt =
      "За набор наклеек девочка отдала 4 учебные монеты с числом 5, а за пуговицы — на 2 жетона меньше. Сколько жетонов стоили пуговицы?";
  }
  for (const block of pages[107].blocks) {
    if (block.id === "p108-source02") {
      block.prompt =
        "Для одного скворечника нужно 6 дощечек. Сколько дощечек нужно для трёх таких скворечников? На рисунке показан один скворечник и две птицы.";
    } else if (block.id === "p108-source03") {
      block.prompt =
        "Для каждого из трёх школьных кружков нужно по 6 наборов бумаги. В школе приготовили 20 наборов. Хватит ли их для всех кружков?";
      if (block.kind === "work") {
        block.fields = block.fields.map((field) => ({
          ...field,
          label:
            field.id === "q1"
              ? "Сколько наборов бумаги нужно для всех кружков?"
              : field.id === "enough"
                ? "Хватит ли приготовленных наборов?"
                : "Сколько наборов останется?",
        }));
      }
    } else if (block.id === "p108-source07") {
      block.prompt =
        "Мама взяла 3 вилки по 4 учебных жетона и кружку за 3 жетона. Сколько жетонов она отдала за покупку?";
    } else if (block.id === "p108-source08") {
      block.prompt =
        "Взяли 2 ложки по 6 учебных жетонов и вилку за 4 жетона. Сколько жетонов нужно всего?";
    }
  }
  for (const block of pages[108].blocks) {
    if (block.id !== "p109-source05") continue;
    block.prompt =
      "Фермер разлил молоко в два пищевых контейнера по 8 л, а в третий — 4 л. Сколько литров молока он разлил?";
  }
  for (const block of pages[109].blocks) {
    if (block.id === "p110-source07" && block.kind === "activity") {
      block.prompt =
        "Какими учебными монетами с числами можно набрать 15? А 20?";
      block.activity.unit = "единицы";
    } else if (block.id === "p110-source08" && block.kind === "story") {
      block.prompt =
        "Учитель взял билеты в кино для ... школьников. Один билет стоит 2 учебных жетона. Сколько жетонов нужно за все билеты? Дополните и решите задачу.";
      block.story.unit = "жетоны";
      block.story.variants = block.story.variants.map((variant) => ({
        ...variant,
        description:
          "Учитель взял билеты в кино для {pupils} школьников. Один билет стоит 2 учебных жетона.",
        steps: variant.steps.map((step) => ({
          ...step,
          question: "Сколько жетонов нужно за все билеты?",
        })),
      }));
    }
  }
  const laterPrompts: Record<number, Record<string, string>> = {
    117: {
      "p117-source01":
        "За 3 одинаковых стакана отдали 3 учебных жетона. Сколько жетонов стоил каждый стакан?",
      "p117-source02":
        "За 3 столовые ложки отдали 15 учебных жетонов. Сколько жетонов стоила каждая ложка?",
      "p117-source03":
        "Папа взял детям 2 одинаковые игрушки и отдал за них учебные монеты с числами 5 и 1. Сколько жетонов стоила каждая игрушка?",
      "p117-source04":
        "Ира взяла 3 кг ягод и отдала учебные монеты с числами 10 и 2. Сколько жетонов стоил килограмм ягод?",
    },
    118: {
      "p118-source04":
        "За 4 одинаковые чашки отдали 20 учебных жетонов. Сколько жетонов стоила каждая чашка?",
      "p118-source05":
        "Мальчик взял 4 одинаковых ластика и отдал за них две учебные монеты с числом 10. Сколько жетонов стоил один ластик? На рисунке справа показаны четыре современных ластика.",
      "p118-source06":
        "За 4 конверта отдали шесть учебных монет с числом 2. Сколько жетонов стоил один конверт?",
    },
    120: {
      "p120-source06":
        "У Серёжи было 19 учебных жетонов, а у Миши на 3 жетона меньше. На свои жетоны Миша взял 4 карандаша. Сколько жетонов стоил один карандаш?",
      "p120-source07":
        "Составьте задачу, похожую на предыдущую, которая решалась бы так: 1) 16 жетонов − 4 жетона = 12 жетонов; 2) 12 жетонов : 2 = 6 жетонов.",
      "p120-source08":
        "У Маруси было 18 учебных жетонов, а у Клавы на 2 жетона больше. На свои жетоны Клава взяла 2 одинаковых карандаша. Сколько жетонов стоил один карандаш?",
    },
    123: {
      "p123-source09":
        "Фермер собрал в прошлом году 16 мешков пшеницы, а в этом году на 4 мешка больше. Сколько мешков пшеницы он собрал в этом году?",
    },
    127: {
      "p127-source02":
        "На рисунке три учебные монеты с числом 10 и одна с числом 1. Какое число они составляют? Сколько в нём десятков и единиц?",
      "p127-source03":
        "За линейку отдали 9 учебных монет с числом 10. Сколько жетонов стоила линейка?",
      "p127-source04":
        "За ручку отдали 6 учебных монет с числом 10 и одну с числом 5. Сколько жетонов стоила ручка?",
      "p127-source05": "Составьте из учебных монет числа 42, 65 и 93.",
    },
    134: {
      "p134-source05":
        "Какое число составляют 2 учебные монеты с числом 20? А 4 такие монеты? А 5?",
      "p134-source06": "Наберите из учебных монет числа 50, 80 и 100.",
    },
    135: {
      "p135-source05":
        "У брата 3 учебные монеты с числом 20, а у сестры на 30 жетонов больше. Сколько жетонов у сестры?",
      "p135-source06":
        "За карандаши отдали 5 учебных монет с числом 20, а за тетради — на 30 жетонов меньше. Сколько жетонов стоили тетради?",
    },
    138: {
      "p138-source05":
        "В мастерской фермы за одну неделю починили 7 современных сеялок, а за другую — 9. Всего нужно было починить 20 сеялок. Сколько осталось?",
      "p138-source06":
        "В фермерском хозяйстве нужно было починить 17 косилок. За одну неделю починили 6, а за другую — 8. Сколько косилок осталось починить?",
      "p138-source09":
        "Механики ремонтировали сельскохозяйственные машины. В первые 5 дней они чинили по 3 машины в день, а в шестой день — 4. Сколько всего машин они починили?",
    },
    141: {
      "p141-source02":
        "Дети посадили 90 кустиков цветочной рассады: 10 на круглой клумбе, а остальные поровну на четырёх треугольных клумбах. Сколько кустиков они посадили на каждой треугольной клумбе?",
    },
  };
  for (const [pageNumber, prompts] of Object.entries(laterPrompts)) {
    for (const block of pages[Number(pageNumber) - 1].blocks) {
      if (prompts[block.id]) block.prompt = prompts[block.id];
    }
  }
  for (const block of pages[126].blocks) {
    if (block.id === "p127-source02" && block.kind === "work") {
      block.fields = block.fields.map((field) =>
        field.id === "q1"
          ? { ...field, label: "Какое число составляют монеты?" }
          : field,
      );
    }
  }
  for (const block of pages[133].blocks) {
    if (block.id === "p134-source06" && block.kind === "activity") {
      block.activity.unit = "единицы";
    }
  }
  for (const block of pages[136].blocks) {
    if (block.id !== "p137-source06" || block.kind !== "work") continue;
    block.prompt =
      "В прошлом году на конной ферме было 60 лошадей, а в этом году на 20 лошадей больше. Выбери вопрос и реши задачу.";
    block.fields = block.fields.map((field) =>
      field.id === "question"
        ? {
            ...field,
            options: [
              "Сколько телег было на ферме?",
              "Сколько жеребят было у лошадей?",
              "Сколько лошадей на ферме в этом году?",
            ],
            expected: "Сколько лошадей на ферме в этом году?",
          }
        : field,
    );
  }
  for (const block of pages[107].blocks) {
    if (block.id !== "p108-source06" || block.kind !== "story") continue;
    block.story.unit = "жетоны";
    block.story.variants = block.story.variants.map((variant) => {
      const item =
        variant.id === "spoons"
          ? ["ложек", "ложку", "ложки", 6]
          : variant.id === "forks"
            ? ["вилок", "вилку", "вилки", 4]
            : ["кружек", "кружку", "кружки", 3];
      return {
        ...variant,
        label: variant.id === "knives" ? "Покупка кружек" : variant.label,
        description: `Взяли {count} ${item[0]} по ${item[3]} учебных жетона за ${item[1]}.`,
        steps: variant.steps.map((step) => ({
          ...step,
          question: `Сколько жетонов стоят эти ${item[2]}?`,
        })),
        inputs: variant.inputs?.map((input) => ({
          ...input,
          label:
            variant.id === "knives" ? "Сколько кружек взяли?" : input.label,
        })),
      };
    });
  }
  for (const block of pages[108].blocks) {
    if (block.id !== "p109-source06" || block.kind !== "story") continue;
    block.story.variants = block.story.variants.map((variant) =>
      variant.id === "first"
        ? {
            ...variant,
            label: "Молоко в контейнерах",
            description:
              "В два пищевых контейнера налили по 9 л молока, а в третий — 2 л.",
            steps: variant.steps.map((step) =>
              step.id === "first"
                ? { ...step, question: "Сколько литров в двух контейнерах?" }
                : step,
            ),
          }
        : variant,
    );
  }
  for (const block of pages[119].blocks) {
    if (block.id !== "p120-source07" || block.kind !== "story") continue;
    block.story.unit = "жетоны";
    block.story.variants = block.story.variants.map((variant) => ({
      ...variant,
      description:
        variant.id === "first"
          ? "У Серёжи 16 учебных жетонов, у Миши на 4 жетона меньше. На все свои жетоны Миша взял две одинаковые книги."
          : "У Оли 16 учебных жетонов, у Нины на 4 жетона меньше. На все свои жетоны Нина взяла два одинаковых альбома.",
      steps: variant.steps.map((step) => ({
        ...step,
        question:
          step.id === "first"
            ? variant.id === "first"
              ? "Сколько жетонов было у Миши?"
              : "Сколько жетонов было у Нины?"
            : variant.id === "first"
              ? "Сколько жетонов стоила одна книга?"
              : "Сколько жетонов стоил один альбом?",
      })),
    }));
  }
  for (const block of pages[123].blocks) {
    if (block.kind !== "story") continue;
    if (block.id === "p124-source03") {
      block.story.unit = "жетоны";
      block.story.variants[0].description =
        "Три одинаковые книги вместе стоят 6 учебных жетонов.";
      block.story.variants[0].steps[0].question =
        "Сколько жетонов стоит одна книга?";
    } else if (block.id === "p124-source04") {
      block.story.unit = "жетоны";
      block.story.variants[0].description =
        "Взяли три книги по 6 учебных жетонов каждая.";
      block.story.variants[0].steps[0].question =
        "Сколько жетонов стоят все три книги?";
    }
  }
  for (const block of pages[126].blocks) {
    if (block.id === "p127-source05" && block.kind === "activity") {
      block.activity.unit = "единицы";
    }
  }
  const currentChildrenPrompts: Record<number, Record<string, string>> = {
    112: {
      "p112-source06":
        "Пять школьников хотели сделать по 2 игрушки для детского сада, но каждый сделал на 2 игрушки больше. Сколько всего игрушек они сделали?",
      "p112-source07":
        "Шесть школьников хотели собрать по 2 кг желудей для посадки, но каждый собрал на 1 кг больше. Сколько килограммов желудей они собрали?",
    },
    125: {
      "p125-source02":
        "Дети делали скворечники: две группы сделали по 6 скворечников, а третья группа — 5. Сколько всего скворечников они сделали?",
    },
    130: {
      "p130-source05":
        "В школьном экологическом клубе было 30 ребят. Позже к ним присоединились ещё 10 школьников. Выбери вопрос и реши задачу.",
      "p130-source06":
        "В одной группе школьного клуба 30 ребят, в другой — столько же. Сколько ребят в двух группах?",
    },
    131: {
      "p131-source07":
        "Ко Дню птиц ребята одной школьной команды сделали 30 скворечников, а другой — на 10 больше. Сколько скворечников сделали обе команды?",
    },
    133: {
      "p133-source01":
        "В школьном летнем лагере две группы: в одной 40 детей, а в другой — на 10 меньше. Выбери вопрос, чтобы решить задачу двумя действиями.",
      "p133-source06":
        "Школьники решили посадить 30 деревьев. В первый день они посадили 4 ряда по 5 деревьев. Сколько деревьев осталось посадить?",
    },
    134: {
      "p134-source12":
        "В селе 4 улицы. Школьники посадили на каждой улице по 20 деревьев. Выбери вопрос и реши задачу.",
    },
    138: {
      "p138-source10":
        "Для школьной выставки четверо ребят нарисовали по 2 рисунка, а ещё один ребёнок — 3 рисунка. Сколько всего рисунков получилось?",
    },
    140: {
      "p140-source06":
        "Школьники посадили осенью 2 ряда берёз, а весной — ещё 3 ряда. Всего посадили 100 берёз, поровну в каждом ряду. Сколько берёз в одном ряду?",
    },
    142: {
      "p142-source03":
        "Четырнадцать детей и один взрослый инструктор пошли кататься на лодках. Они поровну сели в 3 лодки. Сколько человек оказалось в каждой лодке?",
    },
  };
  for (const [pageNumber, prompts] of Object.entries(currentChildrenPrompts)) {
    for (const block of pages[Number(pageNumber) - 1].blocks) {
      if (prompts[block.id]) block.prompt = prompts[block.id];
    }
  }
  for (const block of pages[129].blocks) {
    if (block.id !== "p130-source05" || block.kind !== "work") continue;
    block.fields = block.fields.map((field) =>
      field.id === "question"
        ? {
            ...field,
            options: [
              "Сколько школьников вступило в другой клуб?",
              "Сколько ребят стало в экологическом клубе?",
              "Сколько девочек было в клубе?",
            ],
            expected: "Сколько ребят стало в экологическом клубе?",
          }
        : field,
    );
  }
  for (const block of pages[133].blocks) {
    if (block.id !== "p134-source12" || block.kind !== "work") continue;
    block.fields = block.fields.map((field) =>
      field.id === "question"
        ? {
            ...field,
            options: [
              "Сколько метров длина каждой улицы?",
              "Сколько всего деревьев посадили школьники?",
              "Сколько берёз посадили школьники?",
            ],
            expected: "Сколько всего деревьев посадили школьники?",
          }
        : field,
    );
  }
  for (const block of pages[28].blocks) {
    if (block.id !== "p029-lesson04") continue;
    block.images = ["p029_bars_10_all"];
  }
  for (const block of pages[24].blocks) {
    if (block.id !== "p025-lesson01" || block.kind !== "work") continue;
    block.fields = block.fields.map((field) =>
      field.id === "q2"
        ? {
            ...field,
            label:
              "Одну из восьми книг девочка поставила на нижнюю полку. Сколько книг осталось наверху?",
          }
        : field,
    );
  }
  for (const block of pages[25].blocks) {
    if (block.id !== "p026-lesson01" || block.kind !== "work") continue;
    block.prompt = "Посчитай детей на прогулке, розы и флажки.";
    block.fields = block.fields.map((field) =>
      field.id === "q1"
        ? { ...field, label: "Сколько детей на прогулке?" }
        : field,
    );
  }
  for (const block of pages[26].blocks) {
    if (block.id !== "p027-lesson01" || block.kind !== "work") continue;
    block.title = "Поросята и утки";
    block.prompt = "Посчитай поросят и уток.";
    const labels: Record<string, string> = {
      q1: "Сколько светлых поросят?",
      q2: "Сколько тёмных поросят?",
      q3: "Сколько всего поросят?",
    };
    block.fields = block.fields.map((field) => ({
      ...field,
      label: labels[field.id] ?? field.label,
    }));
  }
  for (const block of pages[27].blocks) {
    if (block.id !== "p028-lesson01" || block.kind !== "work") continue;
    block.fields = block.fields.map((field) =>
      field.id === "q2"
        ? { ...field, label: "Сколько всего людей вместе с учителем?" }
        : field,
    );
  }
  const firstBalls = pages[10].blocks.find(
    (block) => block.id === "p011-lesson06",
  );
  if (firstBalls) {
    firstBalls.images = firstBalls.images.filter(
      (image) => image !== "p011_balls_row_3_groups",
    );
  }
  for (const { id, left, right } of [
    {
      id: "p011-lesson06",
      left: [
        [0.15, 0.5, 0.135, 0.37],
        [0.43, 0.5, 0.135, 0.37],
      ],
      right: [[0.85, 0.5, 0.135, 0.37]],
    },
    {
      id: "p011-balls-right",
      left: [[0.14, 0.55, 0.135, 0.36]],
      right: [
        [0.605, 0.55, 0.135, 0.36],
        [0.865, 0.55, 0.135, 0.36],
      ],
    },
  ]) {
    const block = pages[10].blocks.find((item) => item.id === id);
    if (!block || block.kind !== "work") continue;
    block.fields = block.fields.map((field) => ({
      ...field,
      marks: {
        image: block.images[0],
        shapes:
          field.id === "q1"
            ? left
            : field.id === "q2"
              ? right
              : [...left, ...right],
      },
    }));
  }
  const whiteHens = [
    [0.17, 0.55, 0.1, 0.16],
    [0.28, 0.74, 0.1, 0.14],
    [0.52, 0.65, 0.08, 0.13],
    [0.66, 0.54, 0.1, 0.13],
    [0.88, 0.68, 0.1, 0.15],
  ];
  const darkHen = [[0.62, 0.75, 0.1, 0.15]];
  const leftCherries = [
    [0.38, 0.7, 0.045, 0.17],
    [0.48, 0.72, 0.045, 0.17],
    [0.57, 0.62, 0.045, 0.17],
  ];
  const rightCherries = [
    [0.74, 0.68, 0.045, 0.17],
    [0.84, 0.72, 0.045, 0.17],
    [0.94, 0.62, 0.045, 0.17],
  ];
  for (const block of pages[17].blocks) {
    if (block.kind !== "work") continue;
    const groups =
      block.id === "p018-lesson01"
        ? [whiteHens, darkHen]
        : block.id === "p018-cherry-branch"
          ? [leftCherries, rightCherries]
          : null;
    if (!groups) continue;
    block.fields = block.fields.map((field, index) => ({
      ...field,
      marks: {
        image: block.images[0],
        shapes: index === 2 ? groups.flat() : groups[index],
      },
    }));
  }
  const remainingPeriodPrompts: Record<number, Record<string, string>> = {
    64: {
      "p064-source02":
        "Школьники сделали для детского сада 18 игрушек. Из них 8 игрушек для старшей группы, а остальные — для младшей. Сколько игрушек они сделали для младшей группы?",
    },
    68: {
      "p068-source11":
        "Игрушечная лодка стоит 11 жетонов, а игрушечный катер на 4 жетона дороже. Сколько жетонов стоит катер?",
    },
    73: {
      "p073-source06":
        "В кувшине 10 стаканов молока, а в большом пищевом контейнере на 6 стаканов больше. Сколько стаканов молока в контейнере?",
    },
    86: {
      "p086-source09":
        "Мастера собрали в первый день 4 книжных стеллажа, а во второй — 5. Всего нужно собрать 13 стеллажей. Сколько стеллажей осталось собрать?",
    },
    93: {
      "p093-source07":
        "Фермер получил 16 л молока от коровы и 2 л от козы. Сколько всего литров молока он получил?",
    },
    95: {
      "p095-source07":
        "Ферма отправила в город 18 грузовиков с яблоками и грушами. С яблоками было 9 грузовиков. Сколько грузовиков было с грушами?",
    },
  };
  for (const [pageNumber, prompts] of Object.entries(remainingPeriodPrompts)) {
    for (const block of pages[Number(pageNumber) - 1].blocks) {
      if (prompts[block.id]) block.prompt = prompts[block.id];
    }
  }
  // Prices in the revised lessons use counting tokens. Keep `sourceText` and
  // the original illustration mode verbatim so the book remains comparable.
  const educationalPrice = (value: string) =>
    value
      .replace(/рублях/gi, "жетонах")
      .replace(/рублей/gi, "жетонов")
      .replace(/рубля/gi, "жетона")
      .replace(/рублю/gi, "жетону")
      .replace(/рубли/gi, "жетоны")
      .replace(/рубль/gi, "жетон")
      .replace(/руб\./gi, "жетона")
      .replace(/копейках/gi, "жетонах")
      .replace(/копейками/gi, "жетонами")
      .replace(/копеек/gi, "жетонов")
      .replace(/копейки/gi, "жетона")
      .replace(/копейку/gi, "жетон")
      .replace(/копейка/gi, "жетон");
  for (const block of pages.flatMap((page) => page.blocks)) {
    block.prompt = educationalPrice(block.prompt);
    if (block.kind === "work") {
      block.fields = block.fields.map((field) => ({
        ...field,
        label: educationalPrice(field.label),
        options: field.options?.map(educationalPrice),
        expected: educationalPrice(field.expected),
      }));
    } else if (block.kind === "activity") {
      if (block.activity.unit)
        block.activity.unit = educationalPrice(block.activity.unit);
    } else if (block.kind === "story") {
      block.story.unit = educationalPrice(block.story.unit);
      block.story.inputs = block.story.inputs?.map((input) => ({
        ...input,
        label: educationalPrice(input.label),
      }));
      block.story.variants = block.story.variants.map((variant) => ({
        ...variant,
        description: educationalPrice(variant.description),
        steps: variant.steps.map((step) => ({
          ...step,
          question: educationalPrice(step.question),
        })),
        inputs: variant.inputs?.map((input) => ({
          ...input,
          label: educationalPrice(input.label),
        })),
      }));
    }
  }
}
export const allBlocks = pages.flatMap((p) => p.blocks);

// Source pages stay addressable by PDF number; only these pages count as lessons.
export const lessonPages = pages.filter(
  (p) => p.number >= 3 && p.number <= 142,
);
export const extraPages = pages.filter((p) => [1, 143, 144].includes(p.number));
