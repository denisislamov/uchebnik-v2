/** Lists every early-page hint next to its task and first teaching step, for editorial review (E6.3). */
import fs from "node:fs";
import { pages } from "../../src/content/book.ts";
import { taskTeaching } from "../../src/lib/taskTeaching.ts";
const rows = [];
for (const page of pages.filter((p) => p.number >= 3 && p.number <= 29))
  for (const b of page.blocks) {
    const steps = taskTeaching(b).steps;
    rows.push([page.number, b.id, b.title, (b.prompt ?? "").replace(/\s+/g, " ").slice(0, 90), (b.hint ?? "—").slice(0, 120), (steps[0]?.text ?? "—").slice(0, 120)]);
  }
const cell = (v) => String(v).replace(/\|/g, "\\|");
fs.writeFileSync(
  "docs/HINTS_AUDIT.md",
  [
    "# Подсказки ранних страниц (3–29): что видит ребёнок",
    "",
    "Сгенерировано `npm run audit:hints`. Правило редактуры (E6.3): подсказка отвечает на вопрос задания, а не пересказывает картинку. Пометки редактора — в колонке «замечание».",
    "",
    "| стр. | блок | заголовок | задание | подсказка (`hint`) | первый шаг объяснения | замечание |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((r) => "| " + r.map(cell).join(" | ") + " |  |"),
    "",
  ].join("\n"),
);
console.log(`${rows.length} early-page blocks → docs/HINTS_AUDIT.md`);
