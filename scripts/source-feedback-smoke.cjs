const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages, allBlocks } = await import("../src/content/book.ts");
  const browser = await chromium.launch({ headless: true });
  const context = await newTestContext(browser, {
    viewport: { width: 1280, height: 1000 },
  });
  const p = await context.newPage();
  p.setDefaultTimeout(15000);
  const report = { passed: false, checks: [], errors: [] };
  p.on("pageerror", (e) => report.errors.push(e.message));
  const button = (name) => p.getByRole("button", { name, exact: true });
  async function open(id) {
    const page = pages.find((p) => p.blocks.some((b) => b.id === id));
    await p.goto(baseURL + "/metadata.json");
    await p.evaluate(
      ({ KEY, n, index }) =>
        localStorage.setItem(
          KEY,
          JSON.stringify({
            version: 1,
            contentRevision: 3,
            page: n,
            block: index,
            answers: {},
          }),
        ),
      { KEY, n: page.number, index: page.blocks.findIndex((b) => b.id === id) },
    );
    await p.goto(baseURL);
    await p
      .getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ })
      .click();
  }
  try {
    await open("p005-block02");
    const board = p.getByTestId("counter-board");
    async function put() {
      const source = board.getByTestId("token-source");
      await source.scrollIntoViewIfNeeded();
      const a = await source.boundingBox(),
        b = await board.getByTestId("token-dropzone").boundingBox();
      await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await p.mouse.down();
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
      await p.mouse.up();
    }
    for (let i = 0; i < 6; i++) await put();
    await button("Проверить ответ").click();
    assert.equal(
      await p
        .getByText("✓ Верно! Можно переходить к следующему шагу.", {
          exact: true,
        })
        .count(),
      0,
    );
    await put();
    await button("Проверить ответ").click();
    await p
      .getByText("✓ Верно! Можно переходить к следующему шагу.", {
        exact: true,
      })
      .waitFor();
    report.checks.push(
      "six cucumbers rejected, seven accepted after actual drags",
    );
    await open("p006-block07");
    const pad = p.getByLabel("Поле для рисования", { exact: true });
    await pad.scrollIntoViewIfNeeded();
    await pad.screenshot({ path: "docs/source-hook-before.png" });
    const box = await pad.boundingBox();
    const block = allBlocks.find((b) => b.id === "p006-block07");
    // Follow the first active hook, including the inner curl.
    const target = block.trace.stages[0][0];
    const points = target.points.map((q) => ({
      x: box.x + q.x * box.width,
      y: box.y + q.y * box.height,
    }));
    await p.mouse.move(points[0].x, points[0].y);
    await p.mouse.down();
    for (const q of points.slice(1)) await p.mouse.move(q.x, q.y);
    await p.mouse.up();
    await p.waitForTimeout(200);
    const saved = await p.evaluate(
      (KEY) => JSON.parse(localStorage.getItem(KEY)).answers["p006-block07"],
      KEY,
    );
    assert.ok(saved?.strokes?.length, JSON.stringify(saved));
    await pad.screenshot({ path: "docs/source-hook-after.png" });
    report.checks.push("continuous source hook drawn and saved with mouse");
    await open("p009-block01");
    await button("Покажи, как").click();
    const first = await p.getByTestId("coach-instruction").innerText();
    assert.match(first, /1 птичка.*ещё 1 птичка/);
    assert.doesNotMatch(first, /3 \+ 2|круж/);
    await p.screenshot({
      path: "docs/source-birds-onboarding.png",
      fullPage: true,
    });
    await button("Дальше").click();
    await p
      .getByTestId("coach-instruction")
      .filter({ hasText: "Птичек стало больше" })
      .waitFor();
    assert.equal(await p.getByTestId("coach-example").count(), 0);
    await button("Закрыть подсказку").click();
    const answers = await p.evaluate(
      (KEY) => JSON.parse(localStorage.getItem(KEY)).answers,
      KEY,
    );
    assert.deepEqual(answers, {});
    report.checks.push(
      "bird introduction stays on one bird plus one bird without equations or answer mutation",
    );
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (e) {
    report.errors.push(String(e));
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      "docs/source-feedback-browser-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
  console.log(report);
})();
