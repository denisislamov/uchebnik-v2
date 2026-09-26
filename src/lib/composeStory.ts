const nouns: Record<string, [string, string, string]> = {
  яблоки: ["яблоко", "яблока", "яблок"],
  книги: ["книга", "книги", "книг"],
  карандаши: ["карандаш", "карандаша", "карандашей"],
  метры: ["метр ленты", "метра ленты", "метров ленты"],
  рубли: ["рубль", "рубля", "рублей"],
  литры: ["литр воды", "литра воды", "литров воды"],
  килограммы: ["килограмм крупы", "килограмма крупы", "килограммов крупы"],
};
export const storySubjects = Object.keys(nouns);
function quantity(value: string, forms: [string, string, string]) {
  if (!value) return `□ ${forms[2]}`;
  const n = Number(value),
    last = n % 10,
    teen = n % 100;
  return `${value} ${forms[teen >= 11 && teen <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2]}`;
}
export function composeStory(
  operator: string,
  subject: string,
  left = "",
  right = "",
) {
  const forms = nouns[subject] ?? nouns.яблоки,
    a = quantity(left, forms),
    b = quantity(right, forms);
  const condition =
    operator === "+"
      ? `Было ${a}. Добавили ещё ${b}.`
      : operator === "−"
        ? `Было ${a}. Забрали ${b}.`
        : operator === "×"
          ? `В каждой группе — ${a}. Число одинаковых групп: ${right || "□"}.`
          : `${a} разделили поровну. Число равных частей: ${right || "□"}.`;
  const question = `Сколько ${forms[2]} ${operator === "+" ? "стало" : operator === "−" ? "осталось" : operator === "×" ? "всего" : "в каждой части"}?`;
  return {
    condition,
    question,
    options: [question, "Какого цвета предметы?", "Когда это произошло?"],
  };
}
