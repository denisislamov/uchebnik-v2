const { openBook } = require("./browser-context.cjs");
/**
 * On any computer window a task opens whole: from its name to its last line it stands between the top of
 * the window and the navigation under the sheet, so nothing has to be scrolled to reach the answer.
 * «Дальше» itself stands under the sheet and is always in view.
 */
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
    // Every computer window, not one threshold: a MacBook Air with the
    // bookmarks bar and the Dock, a MacBook Pro, a scaled-up MacBook screen
    // (the size a child actually reported) and a large monitor.
    for (const viewport of [
      { width: 1440, height: 760 },
      { width: 1512, height: 860 },
      { width: 1960, height: 1100 },
      { width: 1920, height: 1200 },
    ]) {
      const ctx = await newTestContext(browser, { viewport });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(baseURL + "/metadata.json");
      for (const page of pages.filter((pg) => PAGES.includes(pg.number))) {
        for (let i = 0; i < page.blocks.length; i++) {
          // Question lists and picture galleries are read by scrolling on any screen.
          const b = page.blocks[i];
          if (["work", "activity"].includes(b.kind) || b.images.length > 2) continue;
          await p.evaluate(({ KEY, n, i }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 7, page: n, block: i, answers: {} })), { KEY, n: page.number, i });
          await p.goto(baseURL);
          await openBook(p);
          await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
          const next = p.getByRole("button", { name: /^(Дальше|К страницам) →$/ });
          await next.waitFor();
          // A step is fitted to the window before it is shown: it is looked at as the child first sees it.
          const opened = Date.now();
          await p.waitForFunction(() => getComputedStyle(document.querySelector('[data-testid="exercise-body"]')).opacity === "1", null, { timeout: 3000 });
          report.slowest = Math.max(report.slowest ?? 0, Date.now() - opened);
          const box = await next.boundingBox();
          const task = await p.getByTestId("exercise-card").boundingBox();
          const nav = await p.getByTestId("lesson-nav").boundingBox();
          report.checked++;
          if (!box || box.y + box.height > viewport.height + 1)
            report.overflow.push({ viewport: `${viewport.width}x${viewport.height}`, page: page.number, block: i, kind: page.blocks[i].kind, next: box ? Math.round(box.y + box.height - viewport.height) : null });
          else if (!task || !nav || task.y < 0 || task.y + task.height > nav.y + 1)
            report.overflow.push({ viewport: `${viewport.width}x${viewport.height}`, page: page.number, block: i, kind: page.blocks[i].kind, by: task && nav ? Math.round(task.y + task.height - nav.y) : null });
        }
      }
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    assert.ok(report.slowest < 1200, `a step took ${report.slowest} ms to be shown`);
    assert.deepEqual(report.overflow.slice(0, 20), [], `${report.overflow.length} tasks do not fit between the top of the window and the navigation`);
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
