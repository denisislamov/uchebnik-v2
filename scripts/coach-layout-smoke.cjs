const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    const ctx = await newTestContext(browser);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => report.errors.push(e.message));
    const button = (name) => p.getByRole("button", { name, exact: true });
    const box = () =>
      p
        .getByTestId("coach-demo-surface")
        .count()
        .then((n) =>
          n
            ? p.getByTestId("coach-demo-surface").boundingBox()
            : button("Рисунок задания").boundingBox(),
        );
    async function visible(region, label) {
      const reveal = button("Показать это место");
      if (await reveal.count()) {
        await reveal.click();
        await p.waitForTimeout(250);
      }
      if (p.viewportSize().width >= 1000)
        assert.equal(
          await p.getByTestId("coach-demo-surface").count(),
          0,
          "desktop retains the original task",
        );
      const image = await box(),
        hole = await p.getByTestId("coach-highlight").boundingBox(),
        card = await p.getByTestId("coach-card").boundingBox();
      const target = {
        x: image.x + region.x * image.width,
        y: image.y + region.y * image.height,
        width: region.w * image.width,
        height: region.h * image.height,
      };
      const viewport = p.viewportSize();
      const pane = await p.getByTestId("lesson-scroll-pane").boundingBox();
      const clipped = {
        x: Math.max(8, pane.x, target.x),
        y: Math.max(12, pane.y, target.y),
        right: Math.min(
          viewport.width - 8,
          pane.x + pane.width,
          target.x + target.width,
        ),
        bottom: Math.min(
          viewport.height - 12,
          pane.y + pane.height,
          target.y + target.height,
        ),
      };
      assert.ok(
        hole &&
          hole.x <= clipped.x + 1 &&
          hole.y <= clipped.y + 1 &&
          hole.x + hole.width >= clipped.right - 1 &&
          hole.y + hole.height >= clipped.bottom - 1,
        `${label}: spotlight not aligned with original ${JSON.stringify({ target, hole, card })}`,
      );
      assert.ok(
        target.x + target.width <= card.x ||
          target.x >= card.x + card.width ||
          target.y + target.height <= card.y ||
          target.y >= card.y + card.height,
        `${label}: instruction card covers target`,
      );
    }
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
      { width: 800, height: 375 },
      { width: 320, height: 568 },
    ]) {
      await p.setViewportSize(viewport);
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
      await button("Покажи, как").click();
      await p.getByTestId("gesture-coach").waitFor();
      await p.waitForTimeout(250);
      await p.screenshot({
        path: `docs/coach-balls-${viewport.width}-overview.png`,
      });
      await visible({ x: 0, y: 0, w: 1, h: 1 }, `${viewport.width} overview`);
      const heading = await p.getByText(/^Смотри, как ·/).innerText();
      await button("Дальше").click();
      await p
        .getByText(heading, { exact: true })
        .waitFor({ state: "detached" });
      await p.getByTestId("gesture-coach").waitFor();
      await p.waitForTimeout(250);
      await visible(
        { x: 0, y: 0, w: 1, h: 1 },
        `${viewport.width} second explanation`,
      );
      await button("Закрыть подсказку").click();
      await button("Покажи подсказку").click();
      await p.getByTestId("coach-motion-inspect").waitFor();
      await button("Пауза").click();
      await visible(
        { x: 0.055, y: 0.08, w: 0.39, h: 0.82 },
        `${viewport.width} whole big ball`,
      );
      await p.screenshot({
        path: `docs/coach-balls-${viewport.width}-object.png`,
      });
      await button("Продолжить показ").click();
      await button("Показать ещё раз").waitFor();
      await visible(
        { x: 0.69, y: 0.34, w: 0.235, h: 0.5 },
        `${viewport.width} whole small ball`,
      );
      await button("Закрыть подсказку").click();
      assert.deepEqual(
        await p.evaluate(
          (KEY) => JSON.parse(localStorage.getItem(KEY)).answers,
          KEY,
        ),
        {},
      );
      report.checks.push(
        `${viewport.width}x${viewport.height}: original picture highlighted without resizing; explicit reveal if offscreen; no answers changed`,
      );
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync(
      "docs/coach-layout-browser-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
  console.log("PASS coach layout: " + report.checks.length + " viewports");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
