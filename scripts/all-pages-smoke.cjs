const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_CHANNEL
      ? { channel: process.env.BROWSER_CHANNEL }
      : {}),
  });
  const report = {
    passed: false,
    pages: [],
    errors: [],
    viewport: { width: 1280, height: 1000 },
  };
  try {
    const context = await browser.newContext({ viewport: report.viewport }),
      p = await context.newPage();
    p.setDefaultTimeout(12000);
    p.on("pageerror", (e) => report.errors.push(e.message));
    await p.goto(process.env.BASE_URL || "http://127.0.0.1:8081");
    for (const page of pages) {
      await p.getByRole("button", { name: "На главную", exact: true }).click();
      await p
        .getByRole("textbox", {
          name: "Найти страницу или задание",
          exact: true,
        })
        .fill(String(page.number));
      await p
        .getByRole("button", {
          name: `Страница ${page.number}. ${page.title}`,
          exact: true,
        })
        .click();
      const row = { page: page.number, blocks: [] };
      report.pages.push(row);
      for (const [i, b] of page.blocks.entries()) {
        await p
          .getByRole("button", {
            name: `Шаг ${i + 1}: ${b.title}`,
            exact: true,
          })
          .click();
        await p.getByText(b.title, { exact: true }).last().waitFor();
        await p.waitForFunction(() =>
          [...document.images].every((i) => i.complete && i.naturalWidth > 0),
        );
        if (b.kind === "work")
          assert.equal(
            await p.getByRole("textbox").count(),
            b.fields.filter((f) => !f.options).length,
            b.id,
          );
        if (b.kind === "draw")
          assert.equal(
            await p.getByLabel("Поле для рисования", { exact: true }).count(),
            1,
            b.id,
          );
        assert.equal(
          await p.getByText("Мы рассмотрели", { exact: true }).count(),
          0,
        );
        assert.equal(
          await p.getByText("Пропустить →", { exact: true }).count(),
          0,
        );
        assert.deepEqual(report.errors, [], b.id);
        row.blocks.push({ id: b.id, kind: b.kind, passed: true });
      }
      if (page.number % 12 === 0)
        console.log(`Rendered ${page.number}/144 pages`);
    }
    report.passed = true;
  } finally {
    fs.writeFileSync(
      "docs/all-pages-browser-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
  console.log(
    `PASS: ${report.pages.length} pages, ${report.pages.reduce((n, p) => n + p.blocks.length, 0)} blocks`,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
