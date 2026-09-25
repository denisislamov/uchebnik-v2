/** A solved task reads as solved: the check button goes flat and inert, a red tick joins the heading. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const id = "p011-lesson01";
  const page = pages.find((p) => p.blocks.some((b) => b.id === id));
  const block = page.blocks.find((b) => b.id === id);
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const ctx = await newTestContext(browser, { viewport });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(baseURL + "/metadata.json");
      await p.evaluate(({ KEY, n, i }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 3, page: n, block: i, answers: {} })), { KEY, n: page.number, i: page.blocks.indexOf(block) });
      await p.goto(baseURL);
      await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
      const check = p.getByRole("button", { name: "Проверить", exact: true });
      assert.equal(await p.getByTestId("done-mark").count(), 0, "no tick before solving");
      const lip = await check.evaluate((e) => getComputedStyle(e).borderBottomWidth);
      assert.equal(lip, "3px", "an active button has its pen lip");
      for (const field of block.fields)
        await p.getByRole("textbox", { name: new RegExp(field.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).fill(field.expected);
      await check.click();
      const done = p.getByRole("button", { name: "✓ Получилось!", exact: true });
      await done.waitFor();
      assert.equal(await done.getAttribute("aria-disabled"), "true", "the solved button is inert");
      // Browsers round 1.5px borders to device pixels; the point is that the 3px pen lip is gone.
      const flat = Number.parseFloat(await done.evaluate((e) => getComputedStyle(e).borderBottomWidth));
      assert.ok(flat <= 2, `the solved button is flat (${flat}px)`);
      await p.getByTestId("done-mark").waitFor();
      const height = await p.getByRole("button", { name: "Дальше →", exact: true }).evaluate((e) => e.getBoundingClientRect().height);
      assert.ok(Math.abs(height - Math.round(height)) < 0.01 && height >= 50, `buttons are integer-high (${height})`);
      report.checks.push({ viewport, lipBefore: lip, doneMark: true, nextHeight: height });
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/status-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS status: ${report.checks.length} viewports`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
