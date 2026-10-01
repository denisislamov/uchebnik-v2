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
  page(2, "О нашей книге", "Авторы и история", "p002_title_vignette", [
    read(
      "Арифметика · 1959",
      "АКАДЕМИЯ ПЕДАГОГИЧЕСКИХ НАУК РСФСР\n\nА. С. ПЧЁЛКО и Г. Б. ПОЛЯК\n\nАРИФМЕТИКА\nУЧЕБНИК ДЛЯ ПЕРВОГО КЛАССА НАЧАЛЬНОЙ ШКОЛЫ\n\nУТВЕРЖДЁН МИНИСТЕРСТВОМ ПРОСВЕЩЕНИЯ РСФСР\n\nИЗДАНИЕ ПЯТОЕ\n\nГОСУДАРСТВЕННОЕ УЧЕБНО-ПЕДАГОГИЧЕСКОЕ ИЗДАТЕЛЬСТВО МИНИСТЕРСТВА ПРОСВЕЩЕНИЯ РСФСР\nМОСКВА · 1959",
      [img(2, "title_vignette")],
    ),
  ]),
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
if (!originalIllustrations) {
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
}
for (const p of pages)
  for (const b of p.blocks) {
    if (p.number <= 12) continue;
    if (!b.images.some((id) => id.includes("abacus_"))) continue;
    const modern = (text: string) =>
      text
        .replace(/на (счётах|счетах|проволоке)/gi, "на карточке")
        .replace(/бусин/g, "жетон")
        .replace(/счёты|счеты|абак/gi, "карточка с жетонами");
    b.prompt = modern(b.prompt);
    b.title = modern(b.title);
    if (b.kind === "read") b.body = modern(b.body);
    if (b.kind === "work")
      b.fields = b.fields.map((field) => ({
        ...field,
        label: modern(field.label),
      }));
  }
export const allBlocks = pages.flatMap((p) => p.blocks);

// Source pages stay addressable by PDF number; only these pages count as lessons.
export const lessonPages = pages.filter(
  (p) => p.number >= 3 && p.number <= 142,
);
export const extraPages = pages.filter((p) => [1, 143, 144].includes(p.number));
