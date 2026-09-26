import { writeFileSync } from "node:fs";
import { countingTutorials } from "../src/content/countingTutorials.ts";

// Render annotations separately; the textbook illustration itself is never changed.
const panels = [
  ["p004-block02", "Дети: 10", "#a514b5"],
  ["p004-block03", "Деревья: 5 (выделены отдельные стволы)", "#075ecc"],
  ["p004-block04", "Лодочка: 1", "#a514b5"],
].map(([id, title, color]) => {
  const { objects } = countingTutorials[id];
  return `<section><h2>${title}</h2><svg viewBox="0 0 810 615" role="img" aria-label="${title}">
  <image href="../assets/book/p004_boys_river_bathing.jpg" width="810" height="615" />
  ${objects
    .map((object, index) => {
      const x = object.x * 810;
      const y = object.y * 615;
      return `<g><rect x="${x}" y="${y}" width="${object.w * 810}" height="${object.h * 615}" fill="none" stroke="${color}" stroke-width="3"/><circle cx="${x + 11}" cy="${y + 11}" r="12" fill="white" stroke="${color}" stroke-width="2"/><text x="${x + 11}" y="${y + 16}" text-anchor="middle" font-size="14" font-weight="bold" fill="${color}">${index + 1}</text></g>`;
    })
    .join(
      "\n",
    )}</svg><ol>${objects.map((object) => `<li>${object.label}</li>`).join("")}</ol></section>`;
});

writeFileSync(
  new URL("../docs/counting-tutorial-source-qa.html", import.meta.url),
  `<!doctype html>
<html lang="ru"><meta charset="utf-8"><title>Проверка областей счёта: страница 4</title>
<style>body{font:16px system-ui;margin:24px;background:#faf8ef;color:#212121}main{max-width:900px;margin:auto}section{margin:30px 0;padding:16px;background:white;border:1px solid #ddd;border-radius:12px}svg{display:block;width:100%;height:auto}li{margin:5px 0}</style>
<main><h1>Страница 4: области для показа счёта</h1><p>Неизменённая картинка 810 × 615 из assets/book. Рамки добавлены отдельным SVG-слоем; номера показывают порядок анимации. Это проверка координат, не экран приложения.</p>
${panels.join("\n")}</main></html>`,
);
