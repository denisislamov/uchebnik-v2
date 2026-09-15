const { baseURL, newTestContext } = require("./browser-context.cjs");
const assert = require("node:assert/strict"),
  fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages, allBlocks } = await import("../src/content/book.ts");
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_CHANNEL
      ? { channel: process.env.BROWSER_CHANNEL }
      : {}),
  });
  const report = { passed: false, scenarios: [], errors: [] };
  try {
    const context = await newTestContext(browser, {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      }),
      p = await context.newPage();
    p.setDefaultTimeout(12000);
    p.on("pageerror", (e) => report.errors.push(e.message));
    const btn = (name) => p.getByRole("button", { name, exact: true });
    await p.goto(baseURL);
    const open = async (b) => {
      const page = pages.find((p) => p.blocks.includes(b)),
        index = page.blocks.indexOf(b);
      // Seed with no React save effect running, then load the application.
      await p.goto(`${baseURL}/metadata.json`);
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
        { KEY, n: page.number, index },
      );
      await p.goto(baseURL);
      await btn("Продолжить занятие  →").click();
      await p.getByText(b.title, { exact: true }).last().waitFor();
    };
    const placeToken = async (board, slot) => {
      const from = board.getByTestId("token-source"),
        to = board.getByTestId(
          slot === undefined ? "token-dropzone" : `token-slot-${slot}`,
        );
      await from.scrollIntoViewIfNeeded();
      await from.hover();
      const a = await from.boundingBox(),
        b = await to.boundingBox();
      await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await p.mouse.down();
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 18 });
      await p.mouse.up();
    };
    const finish = async (name) => {
      await btn("Проверить").click();
      await btn("✓ Получилось!").waitFor();
      assert.deepEqual(report.errors, []);
      report.scenarios.push(name);
    };
    let b = allBlocks.find((b) => b.exerciseNumber === 49);
    await open(b);
    await btn("Сюжет: Копилка").click();
    await btn("рубли").click();
    await btn("+").click();
    await p
      .getByRole("textbox", {
        name: "Ответ: Сколько рублей стало в копилке?",
        exact: true,
      })
      .fill("5");
    await btn("Проверить задачу").click();
    assert.equal(await btn("✓ Получилось!").count(), 0);
    await p
      .getByRole("textbox", {
        name: "Ответ: Сколько рублей стало в копилке?",
        exact: true,
      })
      .fill("4");
    await btn("Проверить задачу").click();
    await btn("✓ Верно").waitFor();
    report.scenarios.push("story-builder: source rubles, wrong then correct");
    b = allBlocks.find(
      (b) => b.kind === "activity" && b.activity.mode === "composition",
    );
    await open(b);
    await placeToken(p.getByTestId("counter-board").nth(0));
    await p
      .getByTestId("counter-board")
      .nth(0)
      .getByText("На поле: 1", { exact: true })
      .waitFor();
    for (let n = 0; n < b.activity.targets[0] - 1; n++) {
      const group = p.getByTestId("counter-board").nth(1);
      await placeToken(group);
      await group.getByText(`На поле: ${n + 1}`, { exact: true }).waitFor();
    }
    await finish("two-part number composition");
    b = allBlocks.find(
      (b) => b.kind === "activity" && b.activity.mode === "count",
    );
    await open(b);
    for (let n = 0; n < b.activity.targets[0]; n++) {
      const board = p.getByTestId("counter-board");
      await placeToken(board, b.activity.slots ? n : undefined);
      await board.getByText(`На поле: ${n + 1}`, { exact: true }).waitFor();
    }
    await finish("counting");
    b = allBlocks.find((b) => b.exerciseNumber === 202);
    await open(b);
    for (const counts of [[4], [1, 4]]) {
      for (const [i, count] of counts.entries())
        for (let n = 1; n <= count; n++) {
          const board = p.getByTestId("counter-board").nth(i);
          await placeToken(board);
          await board.getByText(`На поле: ${n}`, { exact: true }).waitFor();
        }
      await btn("Проверить действие").click();
    }
    await p
      .getByRole("textbox", {
        name: "Сколько десятков в четырнадцати?",
        exact: true,
      })
      .fill("1");
    await p
      .getByRole("textbox", {
        name: "Сколько единиц в четырнадцати?",
        exact: true,
      })
      .fill("4");
    await btn("Проверить ответ").click();
    await btn("✓ Верно").waitFor();
    report.scenarios.push(
      "tens and ones: four sticks, then a ten and four units",
    );
    b = allBlocks.find((b) => b.exerciseNumber === 457);
    await open(b);
    for (let i = 0; i < 2; i++)
      await p
        .getByRole("button", { name: "Гири, кг: добавить", exact: true })
        .nth(i)
        .click();
    await finish("balance");
    b = allBlocks.find((b) => b.exerciseNumber === 491);
    await open(b);
    for (let i = 0; i < 5; i++) await btn("Налить мерку: добавить").click();
    await finish("five 200ml measures");
    b = allBlocks.find((b) => b.exerciseNumber === 739);
    await open(b);
    for (const n of b.activity.targets) await btn(`Число ${n}`).click();
    await finish("hundred table");
    b = allBlocks.find((b) => b.exerciseNumber === 737);
    await open(b);
    for (const n of b.activity.targets) await btn(`Число ${n}`).click();
    await finish("find textbook pages");
    await p
      .getByRole("img", { name: "Оригинал страницы 92", exact: true })
      .last()
      .waitFor();
    // Reload must restore a completed answer and its current page.
    await p.reload();
    await btn("Продолжить занятие  →").click();
    await btn("✓ Получилось!").waitFor();
    report.scenarios.push("mobile persisted completion");
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    report.passed = true;
  } finally {
    fs.writeFileSync(
      "docs/activity-browser-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
  console.log(`PASS: ${report.scenarios.length} additional mobile scenarios`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
