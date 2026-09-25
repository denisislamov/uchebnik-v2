/** Every line the narrator can read, with its key and spoken form: the input of generate.py. */
import fs from "node:fs";
import { allBlocks } from "../../src/content/book.ts";
import { taskTeaching } from "../../src/lib/taskTeaching.ts";
import { narrationLines } from "../../src/lib/narrationLines.ts";
import { spokenForm } from "../../src/lib/spoken.ts";
import { phraseKey } from "../../src/lib/narration.ts";
const phrases = new Map();
const add = (text, where) => {
  const t = text.trim();
  if (!t) return;
  const entry = phrases.get(t) ?? { key: phraseKey(t), text: t, spoken: spokenForm(t), uses: [] };
  if (entry.uses.length < 3) entry.uses.push(where);
  phrases.set(t, entry);
};
for (const b of allBlocks) {
  for (const line of narrationLines(b)) add(line, b.id);
  for (const s of taskTeaching(b).steps) add(s.text, `${b.id}:coach`);
  if (b.hint) add(b.hint, `${b.id}:hint`);
}
const list = [...phrases.values()].sort((a, b) => a.text.localeCompare(b.text, "ru"));
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/narration-phrases.json", JSON.stringify(list, null, 2) + "\n");
const chars = list.reduce((n, p) => n + p.spoken.length, 0);
fs.writeFileSync(
  "docs/NARRATION_PHRASES.md",
  [
    "# Фразы диктора",
    "",
    `Сгенерировано \`npm run tts:phrases\`. ${list.length} уникальных фраз, ${chars} символов произносимого текста (для оценки стоимости генерации).`,
    "",
    "| ключ | на экране | для диктора | где |",
    "| --- | --- | --- | --- |",
    ...list.slice(0, 400).map((p) => `| \`${p.key}\` | ${p.text.replace(/\|/g, "\\|").slice(0, 70)} | ${p.spoken.replace(/\|/g, "\\|").slice(0, 90)} | ${p.uses.join(", ")} |`),
    list.length > 400 ? `\n… и ещё ${list.length - 400} фраз в \`docs/narration-phrases.json\`.` : "",
    "",
  ].join("\n"),
);
console.log(`${list.length} phrases, ${chars} spoken characters → docs/narration-phrases.json`);
