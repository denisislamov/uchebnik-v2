/**
 * The lesson is written on the ruling of the sheet (cells of 24 px).
 *
 * One task of every kind — 57 of them — is opened on a phone, a tablet and a computer, and everything
 * written or pressed in it is measured against the lines:
 *  - a line of text takes a whole row of cells and starts on a line;
 *  - a button, a chip or an answer box is a whole number of cells high and wide and starts on a line;
 *  - the writing itself starts on a line and is a whole number of cells wide.
 * Inside a button, a white card or another opaque box the ruling is not seen, so words there are spaced
 * by the box, not by the rows. Things lying on the sheet — a board with counters, a drawing, a picture —
 * place their own parts; only the rows they take are counted. Hand-drawn strokes may stray, the boxes
 * they outline may not: a pixel is the tolerance. Words beside a button in the same row stand in the
 * middle of the button's height, on a half line; so do the words of an example beside the box for its answer.
 *
 * On the grid is not enough: nothing may touch and nothing may gape.
 *  - clearance: a line of text keeps at least 6 px from a button, a box for an answer, a picture or a
 *    filled panel next to it (unless it is written inside that thing);
 *  - gaps: between the page's name and «Дальше» there is no empty band taller than three rows.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { baseURL, newTestContext, stepShown } = require("./browser-context.cjs");
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
        await p.evaluate(({ KEY, page, index }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 7, page, block: index, answers: {} })), { KEY, page, index });
        await p.goto(baseURL);
        await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
        await stepShown(p);
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
            // Words beside a button in one row are centred on it.
            const besideButton =
              text &&
              [...(el.parentElement?.parentElement?.children ?? []), ...(el.parentElement?.children ?? [])].some(
                (sib) => sib !== el && !sib.contains(el) && (sib.matches('[role="button"], input') || sib.querySelector?.(':scope > [role="button"], :scope > input')),
              );
            const name = (el.innerText || el.getAttribute("aria-label") || el.tagName).slice(0, 30).replace(/\n/g, " ");
            // A heading is moved down to its line; its row is where it would stand unmoved.
            const top = r.top - paper.top - (style.position === "relative" ? parseFloat(style.top) || 0 : 0);
            const left = r.left - paper.left - shift;
            const wrong = [];
            measured++;
            if (text) {
              if (off(parseFloat(style.lineHeight), CELL) > 0.6) wrong.push(`a line is ${style.lineHeight} high`);
              // The note under «Дальше» stands half a cell below the button.
              const caption = el.closest('[data-testid="next-locked-note"]');
              // Inside a white card or a button the ruling is not seen: there
              // the words are spaced by the box, not by the rows.
              if (!box && off(top, besideButton || caption ? CELL / 2 : CELL) > 1) wrong.push(`${Math.round(off(top, CELL))} px off its row`);
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
          // Clearance between words and the things beside them.
          const visible = (e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden";
          };
          const things = [...main.querySelectorAll('[role="button"], input, img, div')].filter((e) => {
            if (!visible(e) || e.closest('[data-sheet="object"]') !== null && !e.matches('[data-sheet="object"]')) return false;
            if (e.matches('[role="button"], input, img, [data-sheet="object"]')) return true;
            const st = getComputedStyle(e);
            const bg = st.backgroundColor.match(/[\d.]+/g);
            const filled = bg && (bg.length < 4 || Number(bg[3]) > 0.3);
            const bordered = parseFloat(st.borderTopWidth) > 0 && st.borderTopStyle !== "none";
            return (filled || bordered) && e.getBoundingClientRect().height < 900;
          });
          const words = [...main.querySelectorAll('div[dir="auto"]')].filter((e) => visible(e) && !e.closest('[data-sheet="object"]') && e.innerText.trim());
          for (const w of words) {
            // Where the letters are: the text's own boxes, not its line height.
            const range = document.createRange();
            range.selectNodeContents(w);
            const lines = [...range.getClientRects()].filter((r) => r.width > 0);
            if (!lines.length) continue;
            const ink = {
              top: Math.min(...lines.map((r) => r.top)) + 2,
              bottom: Math.max(...lines.map((r) => r.bottom)) - 2,
              left: Math.min(...lines.map((r) => r.left)),
              right: Math.max(...lines.map((r) => r.right)),
            };
            for (const t of things) {
              if (t.contains(w) || w.contains(t)) continue;
              const b = t.getBoundingClientRect();
              const across = Math.min(ink.right, b.right) - Math.max(ink.left, b.left);
              const along = Math.min(ink.bottom, b.bottom) - Math.max(ink.top, b.top);
              const gapV = along > 0 ? -1 : Math.max(b.top - ink.bottom, ink.top - b.bottom);
              const gapH = across > 0 ? -1 : Math.max(b.left - ink.right, ink.left - b.right);
              const name = (w.innerText || "").slice(0, 26).replace(/\n/g, " ");
              const what = (t.innerText || t.getAttribute("aria-label") || t.tagName).slice(0, 20).replace(/\n/g, " ");
              if (across > 0 && along > 0) out.push(`«${name}» lies on «${what}»`);
              else if (across > 0 && gapV < 6) out.push(`«${name}» is ${Math.round(gapV)} px from «${what}» above or below`);
              else if (along > 0 && gapH < 6) out.push(`«${name}» is ${Math.round(gapH)} px from «${what}» beside it`);
            }
          }
          // Empty bands between the page's name and «Дальше».
          const nav = [...main.querySelectorAll('[role="button"]')].find((b) => /^(Дальше|К страницам) →$/.test(b.innerText.trim()));
          const from = main.getBoundingClientRect().top, to = nav ? nav.getBoundingClientRect().top : main.getBoundingClientRect().bottom;
          const spans = [...words, ...things].map((e) => e.getBoundingClientRect()).filter((r) => r.bottom > from && r.top < to).map((r) => [Math.max(r.top, from), Math.min(r.bottom, to)]).sort((x, y) => x[0] - y[0]);
          let reach = from;
          for (const [top, bottom] of spans) {
            if (top - reach > CELL * 3 + 1) out.push(`an empty band of ${Math.round(top - reach)} px at ${Math.round(reach - from)} px`);
            reach = Math.max(reach, bottom);
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
