/** Phones and tablets scroll the header away, the app is sized to the dynamic viewport, and a phone keeps the picture near the answer. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const id = "p011-lesson01";
  const page = pages.find((p) => p.blocks.some((b) => b.id === id));
  const index = page.blocks.findIndex((b) => b.id === id);
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1280, height: 900 },
    ]) {
      const ctx = await newTestContext(browser, { viewport });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(baseURL + "/metadata.json");
      await p.evaluate(({ KEY, n, i }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 3, page: n, block: i, answers: {} })), { KEY, n: page.number, i: index });
      await p.goto(baseURL);
      await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
      const home = p.getByRole("button", { name: "На главную", exact: true });
      const before = await home.boundingBox();
      assert.ok(before && before.y >= 0, "header starts visible");
      const pane = p.getByTestId("lesson-scroll-pane");
      await pane.evaluate((e) => (e.scrollTop = 400));
      await p.waitForTimeout(200);
      const after = await home.boundingBox();
      if (viewport.width < 1000)
        assert.ok(!after || after.y + after.height <= 0, `${viewport.width}: header scrolls away with the page (${JSON.stringify(after)})`);
      else assert.ok(after && Math.abs(after.y - before.y) < 1, `${viewport.width}: header stays pinned`);
      const dvh = await p.evaluate(() => ({
        supported: CSS.supports("height", "100dvh"),
        html: document.documentElement.style.height,
        root: document.getElementById("root")?.style.height,
      }));
      if (dvh.supported) assert.equal(dvh.html, "100dvh", "app sized to the dynamic viewport");
      const image = await p.getByTestId(`book-image-${page.blocks[index].images[0]}`).boundingBox();
      assert.ok(image, "illustration rendered");
      if (viewport.width < 600) assert.ok(image.height <= 180 + 1, `phone illustration stays compact (${image.height})`);
      report.checks.push({ viewport, headerBefore: before.y, headerAfter: after && after.y, dvh, imageHeight: image.height });
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/layout-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS layout: ${report.checks.length} viewports`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
