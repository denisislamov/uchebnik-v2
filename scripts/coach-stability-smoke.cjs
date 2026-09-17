/** Catch visible gaps between steps and any tutorial-induced lesson movement. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
      { width: 800, height: 375 },
    ]) {
      const ctx = await newTestContext(browser, { viewport });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(baseURL + "/metadata.json");
      await p.evaluate(
        (KEY) =>
          localStorage.setItem(
            KEY,
            JSON.stringify({
              version: 1,
              contentRevision: 3,
              page: 3,
              block: 1,
              answers: {},
            }),
          ),
        KEY,
      );
      await p.goto(baseURL);
      await p
        .getByRole("button", {
          name: /^(Продолжить занятие|Начать заниматься)/,
        })
        .click();
      const replay = p.getByRole("button", {
        name: "Покажи, как",
        exact: true,
      });
      await replay.scrollIntoViewIfNeeded();
      await p.waitForTimeout(300);
      await p.evaluate(() => {
        const pane = document.querySelector(
          '[data-testid="lesson-scroll-pane"]',
        );
        const picture = document.querySelector(
          '[aria-label="Рисунок задания"]',
        );
        window.lessonSnapshot = () => {
          const b = picture.getBoundingClientRect();
          return {
            scroll: pane.scrollTop,
            height: pane.scrollHeight,
            width: pane.clientWidth,
            x: b.x,
            y: b.y,
            w: b.width,
            h: b.height,
          };
        };
        window.beforeCoach = window.lessonSnapshot();
      });
      await replay.click();
      await p.getByTestId("gesture-coach").waitFor();
      await p.waitForTimeout(350);
      const opened = await p.evaluate(() => ({
        before: window.beforeCoach,
        after: window.lessonSnapshot(),
      }));
      assert.equal(
        await p.getByTestId("coach-demo-surface").count(),
        0,
        "web tutorial must not replace the task with a scaled copy",
      );
      // Observe every animation frame, including the old 180ms measurement gap.
      await p.evaluate(() => {
        window.coachFrames = [];
        window.sampleCoach = true;
        const tick = () => {
          if (!window.sampleCoach) return;
          const overlay = document.querySelector(
            '[data-testid="gesture-coach"]',
          );
          window.coachFrames.push({
            visible: !!overlay && overlay.getBoundingClientRect().height > 0,
            lesson: window.lessonSnapshot(),
          });
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await p.getByRole("button", { name: "Дальше", exact: true }).click();
      await p.waitForTimeout(650);
      const frames = await p.evaluate(() => {
        window.sampleCoach = false;
        return window.coachFrames;
      });
      const gaps = frames.filter((f) => !f.visible).length;
      const movement = frames.filter(
        (f) => JSON.stringify(f.lesson) !== JSON.stringify(opened.before),
      ).length;
      await p
        .getByRole("button", { name: "Закрыть подсказку", exact: true })
        .click();
      await p.waitForTimeout(250);
      const closed = await p.evaluate(() => window.lessonSnapshot());
      report.checks.push({
        viewport,
        opened,
        frames: frames.length,
        gaps,
        movement,
        closed,
      });
      await ctx.close();
    }
    for (const c of report.checks) {
      assert.equal(
        c.gaps,
        0,
        `${c.viewport.width}: uncovered frames between tutorial steps`,
      );
      assert.deepEqual(
        c.opened.after,
        c.opened.before,
        `${c.viewport.width}: opening moved/resized lesson`,
      );
      assert.equal(
        c.movement,
        0,
        `${c.viewport.width}: tutorial moved/resized lesson between steps`,
      );
      assert.deepEqual(
        c.closed,
        c.opened.before,
        `${c.viewport.width}: closing moved/resized lesson`,
      );
    }
    // An offscreen target must be revealed only after an explicit child action.
    const ctx = await newTestContext(browser, {
      viewport: { width: 390, height: 844 },
    });
    const p = await ctx.newPage();
    const { pages } = await import("../src/content/book.ts");
    const page = pages.find((p) => p.number === 4);
    const block = page.blocks.findIndex((b) => b.id === "p004-block05");
    await p.goto(baseURL + "/metadata.json");
    await p.evaluate(
      ({ KEY, block }) =>
        localStorage.setItem(
          KEY,
          JSON.stringify({
            version: 1,
            contentRevision: 3,
            page: 4,
            block,
            answers: {},
          }),
        ),
      { KEY, block },
    );
    await p.goto(baseURL);
    await p.getByRole("button", { name: /^Продолжить занятие/ }).click();
    await p.clock.install();
    await p.getByRole("button", { name: "Покажи, как", exact: true }).click();
    await p.clock.runFor(20000);
    await p.getByRole("button", { name: "Дальше", exact: true }).click();
    await p.clock.runFor(400);
    // Deliberately put the target outside the viewport without changing the lesson layout.
    await p
      .getByTestId("lesson-scroll-pane")
      .evaluate((e) => (e.scrollTop = e.scrollHeight));
    await p.setViewportSize({ width: 391, height: 844 });
    await p.clock.runFor(400);
    await p.getByTestId("coach-offscreen-help").waitFor();
    const pane = p.getByTestId("lesson-scroll-pane");
    const before = await pane.evaluate((e) => ({
      top: e.scrollTop,
      height: e.scrollHeight,
    }));
    await p
      .getByRole("button", { name: "Показать это место", exact: true })
      .click();
    await p.clock.runFor(400);
    await p.getByTestId("coach-highlight").waitFor();
    const after = await pane.evaluate((e) => ({
      top: e.scrollTop,
      height: e.scrollHeight,
    }));
    assert.notEqual(
      after.top,
      before.top,
      "explicit reveal reaches the offscreen target",
    );
    assert.equal(
      after.height,
      before.height,
      "explicit reveal does not add padding or resize the page",
    );
    assert.deepEqual(
      await p.evaluate(
        (KEY) => JSON.parse(localStorage.getItem(KEY)).answers,
        KEY,
      ),
      {},
    );
    report.explicitReveal = { before, after, answersUnchanged: true };
    await ctx.close();
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (e) {
    report.errors.push(String(e));
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      "docs/coach-stability-browser-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
})();
