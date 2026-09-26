/** «№ 500» opens exercise 500 itself and says so; a bare number still finds a page. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    const ctx = await newTestContext(browser, { viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => report.errors.push(e.message));
    await p.goto(baseURL);
    const search = p.getByRole("textbox", { name: "Найти страницу или задание", exact: true });
    for (const number of [500, 50, 5]) {
      const page = pages.find((page) => page.blocks.some((b) => b.exerciseNumber === number));
      const index = page.blocks.findIndex((b) => b.exerciseNumber === number);
      await search.fill(`№ ${number}`);
      const card = p.getByRole("button", { name: `Страница ${page.number}. ${page.title}`, exact: true });
      await card.waitFor();
      assert.equal(await p.getByText(`№ ${number} · шаг ${index + 1}`, { exact: true }).count(), 1);
      await card.click();
      await p.getByText(`Шаг ${index + 1} из ${page.blocks.length} · № ${number}`, { exact: true }).waitFor();
      await p.getByTestId("exercise-card").getByText(page.blocks[index].title, { exact: true }).waitFor();
      report.checks.push({ number, page: page.number, step: index + 1 });
      await p.getByRole("button", { name: "На главную", exact: true }).click();
    }
    await search.fill("50");
    await p.getByRole("button", { name: /^Страница 50\. / }).waitFor();
    assert.equal(await p.getByText(/^№ 50 · шаг/).count(), 0, "a bare number is a page, not an exercise");
    report.checks.push({ page: 50 });
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/search-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS search: ${report.checks.length} lookups`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
