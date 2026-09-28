/**
 * The lesson is written on the ruling of the sheet (cells of 24 px).
 *
 * One task of every kind — 57 of them — is opened on a phone, a tablet and a computer, and everything
 * written or pressed in it is measured against the lines:
 *  - a line of text takes a whole row of cells and starts on a line;
 *  - a button, a chip or an answer box is a whole number of cells high and wide and starts on a line;
 *  - the writing itself starts on a line and is a whole number of cells wide.
 * Inside a button or another opaque box the ruling is not seen, so its words may stand in the middle of
 * the box, half a cell off. Things lying on the sheet — a board with counters, a drawing, a picture —
 * place their own parts; only the rows they take are counted. Hand-drawn strokes may stray, the boxes
 * they outline may not: a pixel is the tolerance.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  // One task for every way a task can be laid out.
  const kinds = new Map();
  for (const page of pages)
    page.blocks.forEach((b, index) => {
      const kind = [
        b.kind,
        b.activity?.mode,
        b.activity?.board,
        b.story ? "story" : "",
        (b.steps || []).map((s) => s.mode).join("+"),
        b.images.length ? `pictures:${Math.min(b.images.length, 2)}` : "",
        (b.fields || []).some((f) => f.options) ? "choice" : "",
        (b.fields || []).some((f) => f.context) ? "two parts" : "",
        (b.fields || []).length > 5 ? "many" : "",
      ].join("|");
      if (!kinds.has(kind)) kinds.set(kind, { page: page.number, index, id: b.id });
    });
  const browser = await chromium.launch({ headless: true });
  const report = { tasks: kinds.size, screens: [], measured: 0, off: [], errors: [], passed: false };
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 820, height: 1180 },
      { width: 1280, height: 800 },
    ]) {
      const ctx = await newTestContext(browser, { viewport });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      for (const { page, index, id } of kinds.values()) {
        await p.goto(baseURL + "/metadata.json");
        await p.evaluate(({ KEY, page, index }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 5, page, block: index, answers: {} })), { KEY, page, index });
        await p.goto(baseURL);
        await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
        await p.getByTestId("exercise-card").waitFor();
        // Pictures load and the task is fitted to the window; measure once the page holds still.
        let last = "";
        for (let k = 0, still = 0; k < 40 && still < 5; k++) {
          await p.waitForTimeout(100);
          const now = await p.evaluate(() => {
            const r = document.querySelector('[data-testid="exercise-card"]').getBoundingClientRect();
            return `${r.top}:${r.height}:${document.images.length}:${[...document.images].every((i) => i.complete)}`;
          });
          still = now === last && now.endsWith("true") ? still + 1 : 0;
          last = now;
        }
        const found = await p.evaluate(() => {
          const CELL = 24;
          const sheet = document.querySelector('[data-testid="lesson-scroll-pane"] [data-testid="notebook-paper"]');
          const paper = sheet.getBoundingClientRect();
          // Lines of the ruling stand at the pattern's shift from the sheet's left edge.
          const shift = Number(sheet.querySelector("pattern").getAttribute("x"));
          const main = document.querySelector('[data-testid="exercise-card"]').parentElement;
          const off = (v, step) => {
            const m = ((v % step) + step) % step;
            return Math.min(m, step - m);
          };
          const card = document.querySelector('[data-testid="exercise-card"]').getBoundingClientRect();
          const out = [];
          let measured = 2;
          if (off(card.left - paper.left - shift, CELL) > 1) out.push("the writing does not start on a line");
          if (off(card.width, CELL) > 1) out.push(`the writing is ${card.width} px wide`);
          if (document.documentElement.scrollWidth > innerWidth) out.push("the page scrolls sideways");
          for (const el of main.querySelectorAll('div[dir="auto"], [role="button"], input')) {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height || el.closest('[data-sheet="object"]')) continue;
            const style = getComputedStyle(el);
            let box = el.parentElement.closest('[role="button"], svg');
            for (let a = el.parentElement; !box && a && a !== main; a = a.parentElement) {
              const colour = getComputedStyle(a).backgroundColor.match(/[\d.]+/g);
              if (colour && (colour.length < 4 || Number(colour[3]) > 0.9)) box = a;
            }
            const text = el.matches('div[dir="auto"]');
            const name = (el.innerText || el.getAttribute("aria-label") || el.tagName).slice(0, 30).replace(/\n/g, " ");
            // A heading is moved down to its line; its row is where it would stand unmoved.
            const top = r.top - paper.top - (style.position === "relative" ? parseFloat(style.top) || 0 : 0);
            const left = r.left - paper.left - shift;
            const wrong = [];
            measured++;
            if (text) {
              if (off(parseFloat(style.lineHeight), CELL) > 0.6) wrong.push(`a line is ${style.lineHeight} high`);
              if (off(top, box ? CELL / 2 : CELL) > 1) wrong.push(`${Math.round(off(top, CELL))} px off its row`);
            } else if (!box) {
              // Step squares and the arrow home are outlined a little inside their two cells.
              const inset = Math.abs(r.height - 40) < 1 && Math.abs(r.width - 40) < 1;
              if (!inset && off(r.height, CELL) > 1) wrong.push(`${Math.round(r.height)} px high`);
              if (!inset && off(r.width, CELL) > 1) wrong.push(`${Math.round(r.width)} px wide`);
              if (!inset && off(top, CELL / 2) > 1) wrong.push(`${Math.round(off(top, CELL))} px off its row`);
              if (off(left, CELL) > 1) wrong.push(`${Math.round(off(left, CELL))} px off its column`);
              if (r.height < 40 || r.width < 40) wrong.push("smaller than a fingertip");
            }
            if (wrong.length) out.push(`«${name}»: ${wrong.join(", ")}`);
          }
          return { out, measured };
        });
        report.measured += found.measured;
        for (const line of found.out) report.off.push(`${viewport.width}×${viewport.height} ${id}: ${line}`);
      }
      report.screens.push(`${viewport.width}×${viewport.height}`);
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.off.slice(0, 30), [], `${report.off.length} things stand off the ruling`);
    report.passed = true;
    console.log(`PASS grid: ${report.measured} lines, buttons and boxes on the ruling; ${report.tasks} kinds of task, ${report.screens.length} screens`);
  } finally {
    fs.writeFileSync("docs/grid-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
