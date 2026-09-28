/**
 * Lints what the child actually sees on all 144 pages, after runtime adjustments.
 * Rules and examples: docs/TEXT_RULES.md.
 * Usage: node --experimental-strip-types scripts/content/lint_texts.mjs [--report docs/TEXT_LINT.md] [--check]
 */
import fs from "node:fs";
import { pages } from "../../src/content/book.ts";
import { lintBlock, lintPage } from "./text_rules.mjs";

const issues = [];
for (const page of pages) {
  const pageIssues = lintPage(page);
  if (pageIssues.length)
    issues.push([page.number, page.id, "page", page.title, pageIssues]);
  for (const b of page.blocks) {
    const found = lintBlock(b);
    if (found.length)
      issues.push([page.number, b.id, b.kind, b.title.slice(0, 60), found]);
  }
}
const counts = {};
for (const [, , , , found] of issues)
  for (const f of found)
    counts[f.slice(0, 2)] = (counts[f.slice(0, 2)] ?? 0) + 1;
const total = pages.reduce((n, p) => n + p.blocks.length, 0);
const cell = (v) => String(v).replace(/\|/g, "\\|").replace(/\n/g, " ");
const report = [
  "# Проверка заголовков и текстов заданий",
  "",
  "Сгенерировано `npm run lint:texts`. Правила и примеры — [TEXT_RULES.md](TEXT_RULES.md).",
  "",
  `Страниц: ${pages.length}, шагов: ${total}. С замечаниями: ${issues.length}. По правилам: ${
    Object.keys(counts)
      .sort()
      .map((k) => `${k} — ${counts[k]}`)
      .join(", ") || "нет"
  }.`,
  "",
  ...(issues.length
    ? [
        "| стр. | блок | вид | заголовок | замечания |",
        "| --- | --- | --- | --- | --- |",
        ...issues.map(
          ([n, id, kind, title, found]) =>
            `| ${n} | \`${id}\` | ${kind} | ${cell(title)} | ${cell(found.join("; "))} |`,
        ),
      ]
    : ["Замечаний нет."]),
  "",
].join("\n");
const at = process.argv.indexOf("--report");
if (at > 0) fs.writeFileSync(process.argv[at + 1], report);
console.log(
  `${issues.length} of ${total} steps with issues: ${JSON.stringify(counts)}`,
);
if (process.argv.includes("--check") && issues.length) {
  for (const [n, id, , , found] of issues.slice(0, 20))
    console.error(`стр. ${n} ${id}: ${found.join("; ")}`);
  process.exit(1);
}
