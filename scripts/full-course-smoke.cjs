const assert = require("node:assert/strict");
const fs = require("node:fs");
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
  try {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
      }),
      p = await context.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.setDefaultTimeout(10000);
    await p.goto(process.env.BASE_URL || "http://127.0.0.1:8081");
    const btn = (name) => p.getByRole("button", { name, exact: true });
    const open = async (b) => {
      const page = pages.find((p) => p.blocks.some((v) => v.id === b.id));
      const index = page.blocks.findIndex((v) => v.id === b.id);
      // Seed with no React save effect running, then load the application.
      await p.goto(
        `${process.env.BASE_URL || "http://127.0.0.1:8081"}/metadata.json`,
      );
      await p.evaluate(
        ({ KEY, n, index }) =>
          localStorage.setItem(
            KEY,
            JSON.stringify({ version: 1, page: n, block: index, answers: {} }),
          ),
        { KEY, n: page.number, index },
      );
      await p.goto(process.env.BASE_URL || "http://127.0.0.1:8081");
      await btn("Продолжить занятие  →").click();
      await p.getByText(b.title, { exact: true }).last().waitFor();
    };
    const load = () =>
      p.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)), KEY);
    const work = allBlocks.find((b) => b.exerciseNumber === 198);
    await open(work);
    for (const [i, f] of work.fields.entries())
      await p
        .getByRole("textbox", { name: `${i + 1}. ${f.label}`, exact: true })
        .fill(f.expected);
    await btn("Проверить").click();
    await btn("✓ Получилось!").waitFor();
    await p.screenshot({
      path: "docs/full-course-addends.png",
      fullPage: true,
    });
    const coins = allBlocks.find((b) => b.exerciseNumber === 804);
    await open(coins);
    const cards = p
      .locator("div")
      .filter({ has: p.getByText("В кошельке:", { exact: false }) });
    // Three separate purses; target the matching buttons by row position.
    for (const [i, target] of coins.activity.targets.entries())
      for (let n = 0; n < target / 10; n++)
        await p
          .getByRole("button", { name: "Монета 10 копеек", exact: true })
          .nth(i)
          .click();
    await btn("Проверить").click();
    await btn("✓ Получилось!").waitFor();
    const group = allBlocks.find((b) => b.exerciseNumber === 638);
    await open(group);
    for (let i = 0; i < group.activity.targets.length; i++)
      for (let g = 1; g <= 3; g++)
        for (let n = 0; n < group.activity.targets[i] / 3; n++)
          await p
            .getByRole("button", {
              name: new RegExp(`^Группа ${g}, предметов`),
            })
            .nth(i)
            .click();
    await btn("Проверить").click();
    await btn("✓ Получилось!").waitFor();
    const ruler = allBlocks.find((b) => b.exerciseNumber === 749);
    await open(ruler);
    await p
      .getByRole("button", { name: "Отметка 10 см", exact: true })
      .first()
      .click();
    for (let n = 0; n < 5; n++)
      await p
        .getByRole("button", {
          name: "Передвинуть отметку: добавить",
          exact: true,
        })
        .first()
        .click();
    assert.equal((await load()).answers[ruler.id].responses["0"], "15");
    const recipe = allBlocks.find((b) => b.exerciseNumber === 581);
    await open(recipe);
    await btn("Сюжет: книги").click();
    for (const [key, v] of Object.entries({ a: "2", b: "3", c: "4" }))
      await p
        .getByRole("textbox", { name: `Число ${key}`, exact: true })
        .fill(v);
    await p
      .getByRole("textbox", { name: "Результат всей задачи", exact: true })
      .fill("10");
    await btn("Проверить").click();
    await btn("✓ Получилось!").waitFor();
    const game = allBlocks.find((b) => b.kind === "targetGame");
    await open(game);
    for (let n = 0; n < 7; n++) await btn("Попасть в круг: 30 очков").click();
    await btn("✓ Получилось!").waitFor();
    await p.screenshot({ path: "docs/full-course-game.png", fullPage: true });
    const drawing = allBlocks.find((b) => b.id === "p003-block06");
    await open(drawing);
    await p.setViewportSize({ width: 390, height: 844 });
    const field = p.getByLabel("Поле для рисования", { exact: true });
    await field.scrollIntoViewIfNeeded();
    let box = await field.boundingBox();
    const t = drawing.trace.stages[0][0];
    // Deliberately draw half a cell below the edge: must fail.
    await p.mouse.move(
      box.x + t.points[0].x * box.width,
      box.y + (t.points[0].y + 0.5 / 8) * box.height,
    );
    await p.mouse.down();
    await p.mouse.move(
      box.x + t.points[1].x * box.width,
      box.y + (t.points[1].y + 0.5 / 8) * box.height,
      { steps: 10 },
    );
    await p.mouse.up();
    await p
      .getByText("Попробуй ещё раз: начни с яркой точки", { exact: false })
      .waitFor();
    await p.mouse.move(
      box.x + t.points[0].x * box.width,
      box.y + t.points[0].y * box.height,
    );
    await p.mouse.down();
    await p.mouse.move(
      box.x + t.points[1].x * box.width,
      box.y + t.points[1].y * box.height,
      { steps: 10 },
    );
    await p.mouse.up();
    await p.getByText("2 из 23", { exact: false }).waitFor();
    await p.screenshot({
      path: "docs/full-course-grid-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    const square = allBlocks.find((b) => b.id === "p004-block07");
    await open(square);
    const targets = [
      ...square.trace.stages[0],
      ...square.trace.stages[1].slice(0, 2),
    ];
    for (const target of targets) {
      await field.scrollIntoViewIfNeeded();
      box = await field.boundingBox();
      const points = target.points;
      await p.mouse.move(
        box.x + points[0].x * box.width,
        box.y + points[0].y * box.height,
      );
      await p.mouse.down();
      for (const point of points.slice(1))
        await p.mouse.move(
          box.x + point.x * box.width,
          box.y + point.y * box.height,
          { steps: 12 },
        );
      await p.mouse.up();
    }
    await p.getByText("10 из 15", { exact: false }).waitFor();
    await p.screenshot({
      path: "docs/full-course-square-mobile.png",
      fullPage: true,
    });
    const relation = allBlocks.find((b) => b.exerciseNumber === 298);
    await open(relation);
    await btn("Первая группа: добавить").click();
    for (let i = 0; i < 5; i++) await btn("Вторая группа: добавить").click();
    await btn("Проверить").click();
    assert.equal(await btn("✓ Получилось!").count(), 0);
    const { relationPlan } = await import("../src/lib/relationDrawing.ts");
    for (const target of relationPlan(relation, {
      responses: { left: "1", right: "5" },
    }).stages.flat()) {
      await field.scrollIntoViewIfNeeded();
      box = await field.boundingBox();
      await p.mouse.move(
        box.x + target.points[0].x * box.width,
        box.y + target.points[0].y * box.height,
      );
      await p.mouse.down();
      for (const point of target.points.slice(1))
        await p.mouse.move(
          box.x + point.x * box.width,
          box.y + point.y * box.height,
          { steps: 12 },
        );
      await p.mouse.up();
    }
    await btn("Проверить").click();
    await btn("✓ Получилось!").waitFor();
    // Open every new page using its saved location: catches content/render exceptions and missing assets.
    await p.setViewportSize({ width: 1440, height: 1100 });
    for (const page of pages.slice(10)) {
      await open(page.blocks[0]);
      await p.waitForFunction(() =>
        Array.from(document.images).every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      );
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "docs/full-course-browser-result.json",
      JSON.stringify(
        {
          passed: true,
          pagesOpened: 134,
          mechanics: [
            "missing-addends",
            "coins",
            "equal-groups",
            "ruler",
            "recipe",
            "target-game",
            "grid-mouse-mobile",
            "grid-square-diagonal",
            "draw-quantity-relation",
          ],
          pageErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: 134 new pages, nine mechanics, mobile grid and zero runtime errors",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
