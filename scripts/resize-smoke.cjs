/**
 * A window dragged to a new size does not shake the lesson.
 *
 * While the window goes on changing, the sheet keeps the layout it had: it is not laid out anew at every
 * step of the drag. When the window stands still, the sheet is laid out for it at once and then holds:
 * nothing moves a moment later. The page is not scrolled by any of this, and a window that changes once —
 * a phone turned on its side — is followed without waiting.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  // A picture with answers, a board beside its sample, a drawing sheet, a list of questions.
  const tasks = ["number", "counters", "draw", "work"].map((kind) => {
    for (const page of pages.filter((p) => p.number >= 3))
      for (const [index, b] of page.blocks.entries())
        if (b.kind === kind && (kind === "work" || b.images.length)) return { kind, page: page.number, index };
    throw Error(`no ${kind} task`);
  });
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, tasks: [], errors: [] };
  try {
    for (const task of tasks) {
      const ctx = await newTestContext(browser, { viewport: { width: 1280, height: 800 } });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(baseURL + "/metadata.json");
      await p.evaluate(({ KEY, page, index }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 5, page, block: index, answers: {} })), { KEY, page: task.page, index: task.index });
      await p.goto(baseURL);
      await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
      await p.getByTestId("exercise-card").waitFor();
      await p.waitForTimeout(1800);
      // Every frame: the window, and where the parts of the task stand.
      await p.evaluate(() => {
        window.__frames = [];
        const box = (e) => {
          const r = e?.getBoundingClientRect();
          return r ? [r.left, r.top, r.width, r.height].map(Math.round).join(" ") : "-";
        };
        let last = "";
        const tick = () => {
          const pane = document.querySelector('[data-testid="lesson-scroll-pane"]');
          const layout = [
            box(document.querySelector('[data-testid="exercise-card"]')),
            box(document.querySelector('[data-testid="picture-frame"]')),
            box(document.querySelector('[data-testid="lesson-nav"]')),
            box(document.querySelector('[aria-label="Поле для рисования"]')),
            pane.scrollTop,
          ].join(" | ");
          const now = `${innerWidth}x${innerHeight} | ${layout}`;
          if (now !== last) window.__frames.push({ at: performance.now(), window: `${innerWidth}x${innerHeight}`, layout });
          last = now;
          requestAnimationFrame(tick);
        };
        tick();
      });
      const before = await p.evaluate(() => window.__frames.at(-1).layout);
      // A hand drags the corner of the window: narrower and lower, a step every few frames.
      const steps = [];
      for (let w = 1280, h = 800; w >= 1040; w -= 8, h -= 4) steps.push({ width: w, height: h });
      for (const size of steps.slice(1)) {
        await p.setViewportSize(size);
        await p.waitForTimeout(40);
      }
      const dragEnd = await p.evaluate(() => performance.now());
      await p.waitForTimeout(2200);
      const frames = await p.evaluate(() => window.__frames);
      const last = steps.at(-1),
        lastWindow = `${last.width}x${last.height}`,
        second = `${steps[12].width}x${steps[12].height}`;
      // The first step of a drag is followed as any single change is. From then on — here from
      // half a second into the drag — to its last step, the layout is one and the same.
      const from = frames.findIndex((f) => f.window === second);
      assert.ok(from > 0, `${task.kind}: the drag was recorded`);
      const during = new Set(frames.slice(from).filter((f) => f.window !== lastWindow).map((f) => f.layout));
      assert.ok(during.size <= 1, `${task.kind}: the sheet was laid out ${during.size} times while the window was dragged`);
      // Once the window stands still the sheet is laid out for it, and then holds.
      const settled = frames.filter((f) => f.window === lastWindow);
      const final = settled.at(-1);
      assert.notEqual(final.layout, before, `${task.kind}: the sheet follows the window once it stands still`);
      const took = final.at - dragEnd;
      assert.ok(took < 700, `${task.kind}: the sheet went on moving ${Math.round(took)} ms after the window stood still`);
      assert.equal(Number(final.layout.split(" | ").at(-1)), 0, `${task.kind}: the page was scrolled`);
      const width = Number(final.layout.split(" | ")[0].split(" ")[2]);
      assert.equal(width % 24, 0, `${task.kind}: the writing is ${width} px wide`);
      // A window that changes once is followed without waiting.
      const t0 = await p.evaluate(() => performance.now());
      await p.setViewportSize({ width: 820, height: 1180 });
      await p.waitForFunction(() => {
        const r = document.querySelector('[data-testid="exercise-card"]').getBoundingClientRect();
        return r.width <= 820 && r.width % 24 === 0;
      }, null, { timeout: 2000 });
      const once = (await p.evaluate(() => performance.now())) - t0;
      report.tasks.push({ ...task, layoutsDuringDrag: during.size, settledInMs: Math.max(0, Math.round(took)), followedOnceInMs: Math.round(once) });
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/resize-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS resize: ${report.tasks.length} tasks hold still while the window is dragged`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
