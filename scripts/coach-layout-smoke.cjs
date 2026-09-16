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
      const image = await box(),
        hole = await p.getByTestId("coach-highlight").boundingBox(),
        card = await p.getByTestId("coach-card").boundingBox();
      const target = {
        x: image.x + region.x * image.width,
        y: image.y + region.y * image.height,
        width: region.w * image.width,
        height: region.h * image.height,
      };
      assert.ok(
        hole &&
          hole.x <= target.x + 1 &&
          hole.y <= target.y + 1 &&
          hole.x + hole.width >= target.x + target.width - 1 &&
          hole.y + hole.height >= target.y + target.height - 1,
        `${label}: cropped image/target ${JSON.stringify({ target, hole, card })}`,
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
        `${viewport.width}x${viewport.height}: whole picture and both balls visible, no answers changed`,
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
