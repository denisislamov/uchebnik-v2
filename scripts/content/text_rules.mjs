/**
 * Editorial rules for what the child sees: page titles, step headings, task texts, answer labels.
 * The rules with examples are in docs/TEXT_RULES.md; scripts/content/lint_texts.mjs applies them to the book.
 */
const VERBS =
  "Считай|Реши|Запиши|Прочитай|Назови|Покажи|Составь|Сравни|Найди|Продолжи|Нарисуй|Начерти|Обведи|Положи|Возьми|Отсчитай|Измерь|Разложи|Набери|Сделай|Придумай|Вычисли|Выполни|Заполни|Рассмотри|Посчитай|Сосчитай|Отметь|Проверь|Раскрась|Дополни|Расскажи|Объясни|Напиши|Подбери|Выбери|Узнай|Подумай|Вспомни|Повтори|Расставь|Переставь|Ответь|Дорисуй|Слушай|Смотри|Посмотри|Нажми|Нажимай|Сложи|Проведи|Собери|Поставь|Перенеси|Отложи|Вырежи|Раздели|Увеличь|Уменьши|Сыграй|Играй|Скажи|Вставь|Впиши|Угадай|Отними|Прибавь|Отмерь|Налей|Прогуляйся|Измеряй";
const ASKS = new RegExp(
  `^(?:${VERBS}|[А-ЯЁ][а-яё]+(?:ите|йте|ьте|итесь)|Сколько|Что|Кто|Как|Какой|Какая|Какое|Какие|Каких|Где|Чего|Чем|Кому|Куда|Почему|Чему|На сколько|Во сколько|Хватит ли)(?![а-яё])`,
);
// The 1959 book also instructs with an infinitive («Увеличить 40 на 10») and with a plural
// imperative inside the phrase («От 18 отнимайте по 3»); both tell the child what to do.
const BOOK_ASKS =
  /^[А-ЯЁ][а-яё]+(?:ить|ать|ять|еть|ти)(?![а-яё])|(?<![а-яё])[а-яё]{3,}(?:ите|йте|ьте)(?![а-яё])/;
const tells = (x) => {
  const t = x.replace(/^[«"„(\d.)\s]+/, "");
  return ASKS.test(t) || BOOK_ASKS.test(t) || /\?[»“"]?\s*$/.test(x);
};
const LAYOUT =
  /полужирн|жирн|курсив|по центру|разрядк|\(черта\)|сигнатур|колонцифр|^Блок \d+\.|[Пп]од заголовком|[Вв]верху страницы|набран|далее рисунок|в рамке|от рамки|рамка с числами|рамка:|рамкой|рамках|операнд|окружност|столбик(?:а|ов) по \d|(?:верхняя|нижняя) строка|строка \d|^Схема «|[Сс]права от|[Сс]лева:|[Пп]од костяшками|Строки|Рисунок:|черта (?:завершает|отделяет)|Справа мальчик с карточкой/m;
// «после добавления пятой»: the label names the very number the child is asked for.
// Whole words only: «четырнадцати» does not give away 4.
const NUMBER_WORDS = {
  1: "один|одна|одну|одного|одной|первый|первая|первое|первого|первой|первую",
  2: "два|две|двух|второй|вторая|второе|второго|вторую",
  3: "три|трёх|третий|третья|третье|третьего|третьей|третью",
  4: "четыре|четырёх|четвёртый|четвёртая|четвёртого|четвёртой|четвёртую",
  5: "пять|пяти|пятый|пятая|пятого|пятой|пятую",
  6: "шесть|шести|шестой|шестая|шестого|шестую",
  7: "семь|семи|седьмой|седьмая|седьмого|седьмую",
  8: "восемь|восьми|восьмой|восьмая|восьмого|восьмую",
  9: "девять|девяти|девятый|девятая|девятого|девятой|девятую",
  10: "десять|десяти|десятый|десятая|десятого|десятой|десятую",
};
const words = (t) => t.trim().split(/\s+/).filter(Boolean);
// Numbers and examples in a phrase are looked at, not read aloud as words.
const spoken = (t) => words(t).filter((w) => /[А-Яа-яЁё]/.test(w));
const normalize = (t) =>
  t
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!:]+$/, "")
    .toLowerCase();
const sentences = (t) =>
  t
    .trim()
    .split(/(?<=[.!?])\s+|\n+/)
    .filter(Boolean);
const isExpression = (label) =>
  /[=□]/.test(label) &&
  !/[А-Яа-яЁё]{3}/.test(label.replace(/руб|коп|дес|кг|см|ед/g, ""));
const fieldsOf = (b) => ("fields" in b && b.fields ? b.fields : []);

/** Issues of a page title. */
export function lintPage(page) {
  const pageIssues = [];
  if (page.title.length > 60)
    pageIssues.push(`T3 заголовок страницы из ${page.title.length} знаков`);
  if (/[()]/.test(page.title))
    pageIssues.push("T3 скобки в заголовке страницы");
  return pageIssues;
}
/** Issues of one step: heading, task text, layout notes and answer labels. */
export function lintBlock(b) {
  const found = [];
  const { title, prompt = "" } = b;
  if (/\.\s*$/.test(title)) found.push("T1 заголовок — предложение с точкой");
  if (words(title).length > 7)
    found.push(`T1 заголовок из ${words(title).length} слов`);
  if (b.kind !== "read" && normalize(title) === normalize(prompt))
    found.push(
      "T2 задание повторяет заголовок: на экране под заголовком пусто",
    );
  if (b.kind !== "read") {
    const said = [
      ...sentences(prompt),
      // Steps of a hands-on task tell what to do as well.
      ...("steps" in b && b.steps ? b.steps.map((s) => s.instruction) : []),
    ];
    if (!said.some(tells))
      found.push(
        `P1 ни одна фраза не говорит, что делать: «${(said[0] ?? "").slice(0, 50)}»`,
      );
    for (const x of sentences(prompt))
      if (spoken(x).length > 24)
        found.push(`P2 фраза из ${spoken(x).length} слов`);
    if (/^№\s*\d+\.?$/.test(prompt.trim()))
      found.push("P3 вместо задания только номер");
  }
  if (
    LAYOUT.test(title) ||
    (b.kind !== "read" && LAYOUT.test(prompt)) ||
    (b.kind === "read" && LAYOUT.test(b.body))
  )
    found.push("R1 описание вёрстки страницы вместо текста для ребёнка");
  for (const f of fieldsOf(b)) {
    if (isExpression(f.label)) continue;
    // One answer under a task that is itself a question needs no second question.
    if (f.label === "Ответ" && fieldsOf(b).length === 1 && /\?/.test(prompt))
      continue;
    if (!/\?\s*$/.test(f.label) && !ASKS.test(f.label))
      found.push(`F1 подпись поля — не вопрос: «${f.label.slice(0, 50)}»`);
    const word = NUMBER_WORDS[Number(f.expected)];
    if (
      word &&
      new RegExp(`(?<![а-яё])(?:${word})(?![а-яё])`, "i").test(f.label) &&
      !f.options
    )
      found.push(
        `F2 подпись выдаёт ответ ${f.expected}: «${f.label.slice(0, 50)}»`,
      );
  }
  return found;
}
