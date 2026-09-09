import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { pages } from "../src/content/book.ts";
import { calculate } from "../src/lib/arithmetic.ts";
const catalog = JSON.parse(fs.readFileSync("textbook/data/pages.json", "utf8"));
const source = JSON.parse(
  fs.readFileSync("scripts/content/source_blocks.json", "utf8"),
);
const normalize = (s: string) =>
  s
    .replace(/[−]/g, "-")
    .replace(/[×·∙]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/[\s=«»`]/g, "");
for (const spec of catalog)
  test(`PDF ${String(spec.pdfPage).padStart(3, "0")}: exercise inventory and illustrations match the page specification`, () => {
    const page = pages[spec.pdfPage - 1];
    assert.equal(page.number, spec.pdfPage);
    assert.equal(page.sourceDoc, `textbook/${spec.document}`);
    assert.ok(fs.existsSync(page.sourceDoc));
    const expected = [...new Set(spec.exerciseNumbers)].sort(
      (a: any, b: any) => a - b,
    );
    const actual = [
      ...new Set(page.blocks.map((b) => b.exerciseNumber).filter(Boolean)),
    ].sort((a: any, b: any) => a - b);
    assert.deepEqual(actual, expected);
    const used = new Set(page.blocks.flatMap((b) => b.images));
    for (const id of spec.assetIds)
      assert.ok(used.has(id), `${page.number}: missing ${id}`);
    for (const id of used)
      assert.ok(
        fs.existsSync(`assets/book/${id}.jpg`),
        `Unresolved illustration ${id}`,
      );
  });
for (const p of source) {
  const arithmetic = p.blocks.filter(
    (b: any) =>
      b.number &&
      /пример|выражени|подготовительн/i.test(b.role) &&
      !/состав|придум/i.test(b.text),
  );
  if (!arithmetic.length) continue;
  test(`PDF ${p.number}: every printed arithmetic item has its own answer`, () => {
    for (const s of arithmetic) {
      const b =
        pages[p.number - 1].blocks.find((b) => b.id === s.id) ??
        pages[p.number - 1].blocks.find((b) => b.exerciseNumber === s.number);
      const text = s.text.replace(
        /(?:[Сс]трока|[Сс]толбик|[Кк]олонка|[Сс]толбец|[Рр]яд)\s*\d+\s*:/g,
        "",
      );
      const expressions = [
        ...text.matchAll(/\d+(?:[ \t]*[+−\-×·∙:÷*][ \t]*\d+)+/g),
      ].filter((m) => !/^\s*=\s*\d/.test(text.slice(m.index! + m[0].length)));
      if (!expressions.length) continue;
      assert.ok(
        b && b.kind === "work",
        `№ ${s.number}: arithmetic requires answer fields`,
      );
      const remaining = b.fields.map((f) => ({
        ...f,
        key: normalize(f.label),
      }));
      for (const m of expressions) {
        const value = calculate(m[0]);
        if (value === undefined) continue;
        const index = remaining.findIndex(
          (f) => f.key === normalize(m[0]) && f.expected === String(value),
        );
        assert.ok(
          index >= 0,
          `№ ${s.number}: missing independent answer for ${m[0]} = ${value}`,
        );
        remaining.splice(index, 1);
      }
    }
  });
}
