/** A drawing sheet taller than the window glides up or down so that every next line is on screen before the child draws it. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const id = "p026-lesson05";
  const page = pages.find((p) => p.blocks.some((b) => b.id === id));
  const index = page.blocks.findIndex((b) => b.id === id);
  const targets = page.blocks[index].trace.stages[0];
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
      { width: 1440, height: 760 },
    ]) {
      const ctx = await newTestContext(browser, { viewport });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(baseURL + "/metadata.json");
      await p.evaluate(({ KEY, n, i }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 3, page: n, block: i, answers: {} })), { KEY, n: page.number, i: index });
      await p.goto(baseURL);
      await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
      const pad = p.getByLabel("Поле для рисования", { exact: true });
      await pad.waitFor();
      const pane = await p.getByTestId("lesson-scroll-pane").boundingBox();
      const view = { top: Math.max(0, pane.y), bottom: Math.min(viewport.height, pane.y + pane.height) };
      const count = Math.min(targets.length, 12);
      for (let i = 0; i < count; i++) {
        const t = targets[i];
        // Sideways and vertical glides, then settle.
        await p.waitForTimeout(900);
        const r = await pad.boundingBox();
        const ys = t.points.map((q) => r.y + q.y * r.height);
        const top = Math.min(...ys), bottom = Math.max(...ys);
        assert.ok(top >= view.top - 1 && bottom <= view.bottom + 1, `${viewport.width}x${viewport.height}: line ${i + 1} «${t.label}» is on screen (${Math.round(top)}–${Math.round(bottom)} in ${view.top}–${view.bottom})`);
        report.checks.push({ viewport, line: i + 1, top: Math.round(top), bottom: Math.round(bottom) });
        const at = (q) => [r.x + q.x * r.width, r.y + q.y * r.height];
        await p.mouse.move(...at(t.points[0]));
        await p.mouse.down();
        for (const q of t.points.slice(1)) await p.mouse.move(...at(q), { steps: 6 });
        await p.mouse.up();
        await p.getByText(i + 1 < targets.length ? `${i + 2} из ${targets.length}` : "Все элементы получились!", { exact: false }).waitFor({ timeout: 3000 });
      }
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/drawing-follow-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS drawing follow: ${report.checks.length} lines`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
