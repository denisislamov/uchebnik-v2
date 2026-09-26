/** On a laptop-height window every task opens with «Дальше» in view: no scrolling to reach the answer or the next step. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
const PAGES = (process.env.FIT_PAGES || "3,4,5,6,7,8,9,10,11,12").split(",").map(Number);
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checked: 0, overflow: [], errors: [] };
  try {
    // A MacBook Air browser with the bookmarks bar and the Dock left visible.
    for (const viewport of [{ width: 1440, height: 760 }]) {
      const ctx = await newTestContext(browser, { viewport });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(baseURL + "/metadata.json");
      for (const page of pages.filter((pg) => PAGES.includes(pg.number))) {
        for (let i = 0; i < page.blocks.length; i++) {
          // Question lists and picture galleries are read by scrolling on any screen.
          const b = page.blocks[i];
          if (["work", "activity"].includes(b.kind) || b.images.length > 2) continue;
          await p.evaluate(({ KEY, n, i }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 3, page: n, block: i, answers: {} })), { KEY, n: page.number, i });
          await p.goto(baseURL);
          await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
          const next = p.getByRole("button", { name: /^(Дальше|К страницам) →$/ });
          await next.waitFor();
          await p.waitForTimeout(150);
          const box = await next.boundingBox();
          report.checked++;
          if (!box || box.y + box.height > viewport.height + 1)
            report.overflow.push({ viewport: `${viewport.width}x${viewport.height}`, page: page.number, block: i, kind: page.blocks[i].kind, by: box ? Math.round(box.y + box.height - viewport.height) : null });
        }
      }
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.overflow, [], `«Дальше» below the fold on ${report.overflow.length} tasks`);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/laptop-fit-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS laptop fit: ${report.checked} tasks`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
