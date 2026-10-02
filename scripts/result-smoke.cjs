const { openBook } = require("./browser-context.cjs");
/**
 * What a task answers with is always seen.
 *
 * «✓ Верно! …» and «Пока не совпало. …» have rows of the sheet kept for them from the start, so they
 * appear in view and move nothing: under the work (beside «Проверить ответ» on a wide screen), over the
 * answers of a number, under a drawing sheet where its hint stood. A task fitted to the screen — any
 * task on a tablet or a computer, a task a phone shows whole — is opened answered, right and wrong, and
 * the words, with the button that offers help after a second miss, must stand over the navigation. A
 * drawing is drawn with the mouse to its last line.
 *
 * Nothing moves while the child answers: on a picture to press, every target is pressed and the
 * background between them, and the picture keeps its size and place through all of it.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext, stepShown } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const { edgeKey } = await import("../src/lib/assessment.ts");
  const early = pages.filter((p) => p.number >= 3 && p.number <= 12);
  const tasks = [];
  const seen = new Set();
  for (const page of early)
    for (const [index, b] of page.blocks.entries()) {
      const right =
        b.kind === "number" || b.kind === "choice" ? { value: b.expected, checked: true }
        : b.kind === "picture" && !b.quantityMeaning ? { value: b.expected, checked: true }
        : b.kind === "counters" && b.expected !== undefined ? { value: b.expected, checked: true }
        : b.kind === "shape" ? { value: b.edges.map(([x, y]) => edgeKey(x, y)), checked: true }
        : b.kind === "location" ? { responses: b.location, checked: true }
        : null;
      if (!right) continue;
      // The first task of every kind, and the board with the most to lay out.
      const most = b.kind === "counters" && b.expected === Math.max(...early.flatMap((p) => p.blocks).filter((x) => x.kind === "counters" && x.expected !== undefined).map((x) => x.expected));
      const kind = `${b.kind}|${b.images.length ? "picture" : ""}`;
      if (seen.has(kind) && !most) continue;
      seen.add(kind);
      const wrong =
        b.kind === "number" ? { value: b.expected === 0 ? 1 : b.expected - 1, checked: true, attempts: 2 }
        : b.kind === "choice" ? { value: b.options.find((o) => o !== b.expected), checked: true, attempts: 2 }
        : b.kind === "counters" ? { value: b.expected + 1, checked: true, attempts: 2 }
        : null;
      tasks.push({ page: page.number, index, b, state: "solved", answer: right });
      if (wrong) tasks.push({ page: page.number, index, b, state: "missed", answer: wrong });
    }
  const whole = (b) => ["number", "choice", "location", "picture"].includes(b.kind);
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, tasks: tasks.length, screens: [], hidden: [], errors: [] };
  try {
    for (const viewport of [
      { width: 2000, height: 1128 },
      { width: 1440, height: 760 },
      { width: 1280, height: 800 },
      { width: 820, height: 1180 },
      { width: 390, height: 664 },
      { width: 360, height: 640 },
    ]) {
      const phone = viewport.width < 600;
      const ctx = await newTestContext(browser, { viewport, hasTouch: viewport.width < 1000 });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(baseURL + "/metadata.json");
      const look = () =>
        p.evaluate(() => {
          const pane = document.querySelector('[data-testid="lesson-scroll-pane"]');
          const view = pane.getBoundingClientRect();
          const slot = [...document.querySelectorAll('[data-testid="task-result"]')].find((e) => e.innerText.trim());
          if (!slot) return { said: "" };
          const parts = [...slot.querySelectorAll('div[dir="auto"], [role="button"]')].map((e) => e.getBoundingClientRect()).filter((r) => r.height);
          const bottom = Math.max(...parts.map((r) => r.bottom)), top = Math.min(...parts.map((r) => r.top));
          return { said: slot.innerText.trim().replace(/\n/g, " "), under: Math.round(bottom - view.bottom), over: Math.round(view.top - top), scrolled: pane.scrollTop };
        });
      for (const t of tasks.filter((t) => !phone || whole(t.b))) {
        await p.evaluate(({ KEY, t }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 7, page: t.page, block: t.index, answers: { [t.b.id]: t.answer } })), { KEY, t: { page: t.page, index: t.index, b: { id: t.b.id }, answer: t.answer } });
        await p.goto(baseURL);
        await openBook(p);
        await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
        await stepShown(p);
        await p.waitForTimeout(150);
        const m = await look();
        const expected = t.state === "solved" ? /^✓ Верно! / : /^Пока не совпало\. .*Показать подсказку$/;
        if (!expected.test(m.said) || m.under > 1 || m.over > 1 || m.scrolled)
          report.hidden.push({ screen: `${viewport.width}×${viewport.height}`, id: t.b.id, kind: t.b.kind, state: t.state, ...m });
      }
      // A picture to press keeps its size and place while it is pressed, hit or missed.
      for (const t of tasks.filter((t) => t.b.kind === "picture" && t.state === "solved")) {
        const block = t.b;
        await p.evaluate(({ KEY, n, i }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 7, page: n, block: i, answers: {} })), { KEY, n: t.page, i: t.index });
        await p.goto(baseURL);
        await openBook(p);
        await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
        await stepShown(p);
        await p.waitForTimeout(300);
        const pic = p.getByRole("button", { name: "Рисунок задания" });
        const place = async () => {
          const r = await p.locator('[data-testid="exercise-card"] img').first().boundingBox();
          return [r.x, r.y, r.width, r.height].map(Math.round).join(",");
        };
        const first = await place();
        const presses = block.targets.map((h) => ({ x: h.x + h.w / 2, y: h.y + h.h / 2 }));
        presses.splice(1, 0, { x: 0.02, y: 0.98 });
        for (const q of presses) {
          const r = await pic.boundingBox();
          await p.mouse.click(r.x + q.x * r.width, r.y + q.y * r.height);
          await p.waitForTimeout(250);
          const now = await place();
          if (now !== first) report.hidden.push({ screen: `${viewport.width}×${viewport.height}`, id: block.id, kind: "picture", state: "pressed", moved: `${first} → ${now}` });
        }
      }
      if (!phone) {
        // A drawing, drawn to its last line: «верно» stands where the hint stood.
        const page = pages.find((pg) => pg.number === 3);
        const index = page.blocks.findIndex((b) => b.kind === "draw" && b.trace);
        const block = page.blocks[index];
        await p.evaluate(({ KEY, n, i }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 7, page: n, block: i, answers: {} })), { KEY, n: 3, i: index });
        await p.goto(baseURL);
        await openBook(p);
        await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
        await stepShown(p);
        const pad = p.getByLabel("Поле для рисования", { exact: true });
        for (const target of block.trace.stages.flat()) {
          await pad.scrollIntoViewIfNeeded();
          const r = await pad.boundingBox();
          await p.mouse.move(r.x + target.points[0].x * r.width, r.y + target.points[0].y * r.height);
          await p.mouse.down();
          for (const pt of target.points.slice(1)) await p.mouse.move(r.x + pt.x * r.width, r.y + pt.y * r.height, { steps: 3 });
          await p.mouse.up();
          // The sheet may glide to the next line.
          await p.waitForTimeout(target === block.trace.stages.flat().at(-1) ? 0 : 320);
        }
        await p.getByText("Все элементы получились!", { exact: true }).waitFor();
        await p.getByText(/^✓ Верно! /).waitFor();
        await p.waitForTimeout(700);
        if (viewport.width === 1280) await p.screenshot({ path: "docs/result-drawing-1280.png" });
        if (process.env.RESULT_SHOT) await p.screenshot({ path: `${process.env.RESULT_SHOT}-${viewport.width}.png` });
        const m = await look();
        const sheet = await pad.boundingBox();
        const words = await p.getByText(/^✓ Верно! /).boundingBox();
        if (!/^✓ Верно! /.test(m.said) || m.under > 1 || m.over > 1)
          report.hidden.push({ screen: `${viewport.width}×${viewport.height}`, id: block.id, kind: "draw", state: "drawn", ...m });
        // No hole between the sheet and the words under it: three rows at most.
        assert.ok(words.y - (sheet.y + sheet.height) <= 72 + 1, `${viewport.width}×${viewport.height}: ${Math.round(words.y - sheet.y - sheet.height)} px of empty paper between the sheet and «верно»`);
      }
      report.screens.push(`${viewport.width}×${viewport.height}`);
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.hidden, [], `${report.hidden.length} answers are not seen`);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/result-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS result: what ${report.tasks} answered tasks and a drawing say is seen on ${report.screens.length} screens`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
