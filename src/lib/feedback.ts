import type { Answer, Block } from "../content/types";

/** Russian plural: 1 палочка, 2 палочки, 5 палочек. */
export function plural(n: number, one: string, few: string, many: string) {
  const tens = Math.abs(n) % 100,
    units = tens % 10;
  if (tens > 10 && tens < 20) return many;
  if (units === 1) return one;
  if (units >= 2 && units <= 4) return few;
  return many;
}
const tokens: Record<"stick" | "circle", [string, string, string]> = {
  stick: ["палочка", "палочки", "палочек"],
  circle: ["кружок", "кружка", "кружков"],
};
/** After this many answers that did not fit, the help is offered by name. */
export const HELP_AFTER = 2;
/**
 * What is said when a task is solved: what the child has done, in the words
 * of the task, not only that it is right. «✓ Верно!» opens every line, so
 * the mark itself stays the same from task to task.
 */
export function successLine(block: Block, answer: Answer): string {
  const said = (() => {
    switch (block.kind) {
      case "number":
        return `Получилось ${block.expected}.`;
      case "choice":
        return `Ответ: ${block.expected.toLowerCase()}.`;
      case "counters": {
        const n = Number(answer.value) || 0;
        return `На поле ${n} ${plural(n, ...tokens[block.token])}.`;
      }
      case "picture":
        return block.expected.length > 1
          ? `Ты нашёл все нужные рисунки: ${block.expected.length}.`
          : "Ты нашёл нужный рисунок.";
      case "location":
        return `Рисунок ${block.location.vertical.toLowerCase()} ${block.location.horizontal.toLowerCase()}.`;
      case "shape": {
        const n = block.edges.length;
        return `Фигура сложена из ${n} ${plural(n, "палочки", "палочек", "палочек")}.`;
      }
      case "draw":
        return "Все линии проведены.";
      case "work":
        return block.fields.length > 1
          ? `Все ответы записаны верно: ${block.fields.length}.`
          : "Ответ записан верно.";
      default:
        return "Задание выполнено.";
    }
  })();
  return `✓ Верно! ${said}`;
}
/**
 * What is said when an answer does not fit: where to look again. It never
 * names the answer. After a second miss the help is offered (see HELP_AFTER).
 */
export function retryLine(block: Block, answer: Answer): string {
  const said = (() => {
    switch (block.kind) {
      case "number": {
        const n = Number(answer.value);
        if (!Number.isFinite(n)) break;
        return n > block.expected
          ? `${n} — больше, чем нужно. Посчитай ещё раз.`
          : `${n} — меньше, чем нужно. Посчитай ещё раз.`;
      }
      case "counters": {
        const n = Number(answer.value) || 0;
        if (block.expected === undefined) break;
        return n > block.expected
          ? "На поле больше, чем нужно. Убери лишнее."
          : "На поле меньше, чем нужно. Добавь ещё.";
      }
      case "choice":
        return "Прочитай вопрос ещё раз.";
      case "picture":
        return "Это другой рисунок. Найди нужный.";
      case "shape":
        return "Положи палочку на каждый пунктир.";
    }
    return "Посмотри ещё раз — у тебя получится.";
  })();
  return `Пока не совпало. ${said}`;
}
/** Whether to offer the help by name: the answer has missed more than once. */
export const offerHelp = (answer: Answer) =>
  (answer.attempts ?? 0) >= HELP_AFTER;
