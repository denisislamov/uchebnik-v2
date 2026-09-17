/** Visit every first semantic tutorial; fake browser time accelerates demonstration only. */
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1",
  COACH = "uchebnik:gesture-coach:v2";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const { taskTeaching } = await import("../src/lib/taskTeaching.ts");
  const cases = new Map();
  for (const page of pages.filter((p) => p.number !== 2))
    for (const [index, block] of page.blocks.entries()) {
      const family = taskTeaching(block).family;
      if (!cases.has(family))
        cases.set(family, { family, page: page.number, index, block });
    }
  const viewport = {
    width: Number(process.env.AUDIT_WIDTH || 390),
    height: Number(process.env.AUDIT_HEIGHT || 844),
  };
  const report = { passed: false, viewport, cases: [], errors: [] };
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await newTestContext(browser, {
      viewport,
      freshTutorials: true,
    });
    let p = await context.newPage();
    p.setDefaultTimeout(7000);
    p.on("pageerror", (e) => report.errors.push(e.message));
    await p.clock.install();
    for (const entry of [...cases.values()].filter(
      (e) =>
        !process.env.AUDIT_CASES ||
        process.env.AUDIT_CASES.split(",").includes(e.block.id),
    )) {
      if (report.cases.length && report.cases.length % 15 === 0) {
        await p.close();
        p = await context.newPage();
        p.setDefaultTimeout(7000);
        p.on("pageerror", (e) => report.errors.push(e.message));
        await p.clock.install();
      }
      const result = {
        id: entry.block.id,
        family: entry.family,
        steps: [],
        issues: [],
      };
      report.cases.push(result);
      try {
        await p.goto(baseURL + "/metadata.json");
        await p.evaluate(
          ({ KEY, COACH, entry }) => {
            localStorage.setItem(
              KEY,
              JSON.stringify({
                version: 1,
                contentRevision: 3,
                page: entry.page,
                block: entry.index,
                answers:
                  entry.page === 1
                    ? {
                        "p003-block01": {
                          reviewed: true,
                          checked: false,
                          attempts: 0,
                        },
                      }
                    : {},
              }),
            );
            localStorage.removeItem(COACH);
          },
          { KEY, COACH, entry },
        );
        await p.goto(baseURL);
        await p
          .getByRole("button", {
            name: /^(Продолжить занятие|Начать заниматься)/,
          })
          .click();
        await p.getByTestId("gesture-coach").waitFor();
        const initialAnswers = await p.evaluate(
          (KEY) =>
            JSON.stringify(JSON.parse(localStorage.getItem(KEY)).answers),
          KEY,
        );
        for (let n = 0; n < 45; n++) {
          await p.clock.runFor(400);
          await p.waitForTimeout(70);
          await p.getByTestId("gesture-coach").waitFor();
          const modal = p.getByTestId("gesture-coach");
          const action = modal.getByRole("button", {
            name: /^(Дальше|Попробую сам)$/,
          });
          await action.waitFor();
          const heading = await modal.getByText(/^Смотри, как ·/).innerText();
          const [, index, total] = heading.match(/(\d+)\/(\d+)$/);
          const text = await p.getByTestId("coach-instruction").innerText();
          const snapshot = await modal.evaluate((el) => {
            const r = (e) => {
              if (!e) return null;
              const b = e.getBoundingClientRect();
              return { x: b.x, y: b.y, width: b.width, height: b.height };
            };
            const q = (id) => el.querySelector(`[data-testid="${id}"]`);
            return {
              card: r(q("coach-card")),
              hole: r(q("coach-highlight")),
              finger: r(q("coach-finger")),
              surface: r(q("coach-demo-surface")),
              example: !!q("coach-example"),
              offscreenHelp: !!q("coach-offscreen-help"),
              pane: r(
                document.querySelector('[data-testid="lesson-scroll-pane"]'),
              ),
              motion: el
                .querySelector('[data-testid^="coach-motion-"]')
                ?.getAttribute("data-testid"),
            };
          });
          const issues = [];
          if (/Не удалось показать|Этот шаг уже выполнен/.test(text))
            issues.push("unavailable target on untouched task");
          if (!snapshot.hole && !snapshot.example && !snapshot.offscreenHelp)
            issues.push("no visible target or explicit way to reveal it");
          if (snapshot.motion && !snapshot.finger && !snapshot.offscreenHelp)
            issues.push("invisible demonstration finger");
          if (
            snapshot.hole &&
            snapshot.pane &&
            snapshot.hole.y < snapshot.pane.y - 1
          )
            issues.push("highlight leaks over fixed header");
          if (
            snapshot.finger &&
            snapshot.pane &&
            snapshot.finger.y + 3 < snapshot.pane.y - 1
          )
            issues.push("finger points behind fixed header");
          if (snapshot.finger && snapshot.card) {
            const f = { x: snapshot.finger.x + 9, y: snapshot.finger.y + 3 },
              c = snapshot.card;
            if (
              f.x >= c.x &&
              f.x <= c.x + c.width &&
              f.y >= c.y &&
              f.y <= c.y + c.height
            )
              issues.push("finger under card");
          }
          result.steps.push({
            index: Number(index),
            text,
            ...snapshot,
            issues,
          });
          result.issues.push(
            ...issues.map((issue) => `step ${index}: ${issue}`),
          );
          if (
            issues.length &&
            result.steps.filter((s) => s.issues.length).length === 1
          )
            await p.screenshot({
              path: `/tmp/onboarding-${viewport.width}-${entry.block.id}.png`,
            });
          await p.clock.runFor(30000);
          await action.click();
          if (index === total) {
            await modal.waitFor({ state: "hidden" });
            break;
          }
          await modal
            .getByText(heading, { exact: true })
            .waitFor({ state: "detached" });
        }
        await p.waitForTimeout(100);
        const state = await p.evaluate(
          ({ KEY, COACH }) => ({
            answers: JSON.parse(localStorage.getItem(KEY)).answers,
            seen: JSON.parse(localStorage.getItem(COACH) || "[]"),
          }),
          { KEY, COACH },
        );
        if (JSON.stringify(state.answers) !== initialAnswers)
          result.issues.push("tutorial changed answers");
        if (!state.seen.includes("task:" + entry.family))
          result.issues.push("completed family not persisted");
      } catch (e) {
        result.issues.push(e.message);
        await p
          .screenshot({
            path: `/tmp/onboarding-${viewport.width}-${entry.block.id}-error.png`,
          })
          .catch(() => {});
      }
      if (result.issues.length)
        console.log(entry.block.id, result.issues.join("; "));
      if (report.cases.length % 15 === 0)
        console.log(`Audited ${report.cases.length}/${cases.size}`);
    }
    report.passed =
      report.errors.length === 0 && report.cases.every((c) => !c.issues.length);
  } finally {
    fs.writeFileSync(
      process.env.AUDIT_OUTPUT || `docs/onboarding-audit-${viewport.width}.json`,
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
  console.log(
    `${report.passed ? "PASS" : "FAIL"} onboarding audit: ${report.cases.length} families`,
  );
  if (!report.passed) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
