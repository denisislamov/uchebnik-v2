/** A lesson has no app header, only the arrow home (and on a phone a drawing sheet stays put from line to line), the app is sized to the dynamic viewport, a phone keeps the picture near the answer, and «Дальше» waits for a solved task. */
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
      assert.ok(before && before.y >= 0 && before.y < 80, "the arrow home opens the lesson");
      assert.equal(await p.getByText("Арифметика", { exact: true }).count(), 0, `${viewport.width}: no app header inside a lesson`);
      assert.equal(await p.getByText(/^(← Все страницы|Учебник · Арифметика)$/).count(), 0, "the arrow home carries no caption");
      const dvh = await p.evaluate(() => ({
        supported: CSS.supports("height", "100dvh"),
        html: document.documentElement.style.height,
        root: document.getElementById("root")?.style.height,
      }));
      if (dvh.supported) assert.equal(dvh.html, "100dvh", "app sized to the dynamic viewport");
      const image = await p.getByTestId(`book-image-${page.blocks[index].images[0]}`).boundingBox();
      assert.ok(image, "illustration rendered");
      // The picture's share follows the screen height: small enough on a phone to keep the answer in view, not tiny on a monitor.
      if (viewport.width < 600) assert.ok(image.height <= viewport.height * 0.3 + 1, `phone illustration stays compact (${image.height})`);
      if (viewport.width >= 1000) assert.ok(image.height >= 270 - 1, `desktop illustration is not shrunk (${image.height})`);
      const next = p.getByRole("button", { name: "Дальше →", exact: true });
      assert.equal(await next.getAttribute("aria-disabled"), "true", "«Дальше» waits until the task is solved");
      report.checks.push({ viewport, homeArrow: before.y, dvh, imageHeight: image.height });
      await ctx.close();
    }
    {
      // A phone: the next line's hint must not move the sheet under the finger.
      const drawPage = pages.find((pg) => pg.number === 3);
      const di = drawPage.blocks.findIndex((b) => b.kind === "draw" && b.trace);
      const target = drawPage.blocks[di].trace.stages[0][0];
      const ctx = await newTestContext(browser, { viewport: { width: 390, height: 844 }, hasTouch: false });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(baseURL + "/metadata.json");
      await p.evaluate(({ KEY, n, i }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 3, page: n, block: i, answers: {} })), { KEY, n: 3, i: di });
      await p.goto(baseURL);
      await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
      const sheet = p.getByLabel("Поле для рисования");
      await sheet.scrollIntoViewIfNeeded();
      const a = await sheet.boundingBox();
      const pts = target.points.map((q) => ({ x: a.x + q.x * a.width, y: a.y + q.y * a.height }));
      await p.mouse.move(pts[0].x, pts[0].y);
      await p.mouse.down();
      for (let k = 1; k <= 12; k++) {
        const t = k / 12, q = pts[Math.min(pts.length - 1, Math.floor(t * (pts.length - 1)))];
        await p.mouse.move(pts[0].x + (pts.at(-1).x - pts[0].x) * t, pts[0].y + (pts.at(-1).y - pts[0].y) * t);
      }
      await p.mouse.up();
      await p.waitForTimeout(500);
      assert.match(await p.getByText(/· 2 из \d+/).first().innerText(), /2 из/, "the first line was accepted");
      const b = await sheet.boundingBox();
      assert.ok(Math.abs(b.y - a.y) < 1, `sheet stays in place on the next line (${a.y} → ${b.y})`);
      report.checks.push({ phoneSheet: [a.y, b.y] });
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
