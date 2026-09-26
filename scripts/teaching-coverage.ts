import fs from "node:fs";
import { allBlocks } from "../src/content/book.ts";
import { taskTeaching } from "../src/lib/taskTeaching.ts";
const families = new Map<string, { first: string; count: number }>();
for (const block of allBlocks) {
  const key = taskTeaching(block).family;
  const entry = families.get(key);
  if (entry) entry.count++;
  else families.set(key, { first: block.id, count: 1 });
}
const path = "docs/TASK_TEACHING_COVERAGE.md";
const current = fs.readFileSync(path, "utf8");
const header = current
  .split("## Первые вхождения")[0]
  .replace(/\d+ семейств объяснений/, `${families.size} семейств объяснений`);
const table =
  "## Первые вхождения\n\n| Семейство | Первое задание | Всего |\n| --- | --- | ---: |\n" +
  [...families]
    .map(
      ([key, { first, count }]) => `| \`${key}\` | \`${first}\` | ${count} |`,
    )
    .join("\n") +
  "\n";
fs.writeFileSync(path, header + table);
console.log(`${allBlocks.length} blocks, ${families.size} tutorial families`);
