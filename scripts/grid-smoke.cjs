/**
 * The furniture of a lesson lies on the ruling of the sheet: the writing starts on a line and is a whole
 * number of cells wide, step squares stand two cells apart, the first box of the task starts on a line.
 * Hand-drawn strokes may stray, the boxes they outline may not: a pixel is the tolerance.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
const CELL = 24;
const off = (v) => {
  const m = ((v % CELL) + CELL) % CELL;
  return Math.min(m, CELL - m);
};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { checked: 0, cases: [], errors: [], passed: false };
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 820, height: 1180 },
      { width: 1280, height: 800 },
      { width: 1920, height: 1080 },
    ]) {
      const ctx = await newTestContext(browser, { viewport });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      // A task with questions and a task with a picture, both with a one-line prompt.
      for (const [page, block, box] of [
        [13, 5, '[data-testid="exercise-card"] [data-testid="hand-frame"]'],
        [3, 2, '[aria-label="Рисунок задания"]'],
      ]) {
        await p.goto(baseURL + "/metadata.json");
        await p.evaluate(
          ({ KEY, page, block }) =>
            localStorage.setItem(
              KEY,
              JSON.stringify({
                version: 1,
                contentRevision: 5,
                page,
                block,
                answers: {},
              }),
            ),
          { KEY, page, block },
        );
        await p.goto(baseURL);
        await p
          .getByRole("button", {
            name: /^(Продолжить занятие|Начать заниматься)/,
          })
          .click();
        await p.getByTestId("exercise-card").waitFor();
        await p.locator(box).first().waitFor();
        await p.waitForTimeout(700);
        const m = await p.evaluate((box) => {
          const paper = document.querySelector(
            '[data-testid="lesson-scroll-pane"] [data-testid="notebook-paper"]',
          );
          const sheet = paper.getBoundingClientRect();
          // Lines of the ruling stand at the pattern's shift, counted from the sheet's left edge.
          const shift = Number(
            paper.querySelector("pattern").getAttribute("x"),
          );
          const rect = (el) => {
            const r = el.getBoundingClientRect();
            return {
              x: r.left - sheet.left - shift,
              y: r.top - sheet.top,
              width: r.width,
              height: r.height,
            };
          };
          const card = document.querySelector('[data-testid="exercise-card"]');
          return {
            card: rect(card),
            title: rect(card.querySelector('[data-testid="block-title"]')),
            steps: [
              ...document.querySelectorAll(
                '[role="button"][aria-label^="Шаг "]',
              ),
            ].map(rect),
            first: rect(document.querySelector(box)),
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        }, box);
        const name = `${viewport.width}x${viewport.height} p${page}`;
        const on = (value, what) => {
          report.checked++;
          assert.ok(
            off(value) <= 1,
            `${name}: ${what} is ${off(value).toFixed(1)} px off the ruling (${value.toFixed(1)})`,
          );
        };
        assert.equal(m.overflow, false, `${name}: no sideways scroll`);
        on(m.card.x, "left edge of the writing");
        on(m.card.width, "width of the writing");
        on(m.title.y, "top of the heading");
        m.steps.slice(0, 6).forEach((s, i) => {
          on(s.x, `left edge of step ${i + 1}`);
          // A square is outlined a little inside its two cells.
          on(s.y - 4, `row of step ${i + 1}`);
          assert.ok(
            s.width >= 40 && s.height >= 40,
            `${name}: step ${i + 1} keeps a fingertip size`,
          );
        });
        on(m.first.x, "left edge of the first box");
        on(m.first.x + m.first.width, "right edge of the first box");
        on(m.first.y, "top of the first box");
        report.cases.push({
          viewport: name,
          writing: m.card.width / CELL,
          firstBoxRow: m.first.y / CELL,
        });
      }
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
    console.log(
      `PASS grid: ${report.checked} edges on the ruling, ${report.cases.length} screens`,
    );
  } finally {
    fs.writeFileSync(
      "docs/grid-browser-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
