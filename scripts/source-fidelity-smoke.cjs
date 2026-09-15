const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages, allBlocks } = await import("../src/content/book.ts");
  const { practicalTrace } = await import("../src/lib/practical.ts");
  const { isDone } = await import("../src/lib/assessment.ts");
  const browser = await chromium.launch({ headless: true });
  const ctx = await newTestContext(browser, {
    viewport: { width: 1440, height: 1100 },
    hasTouch: true,
  });
  const page = await ctx.newPage(),
    errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(10000);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const answer = async (id) =>
    page.evaluate(
      ({ KEY, id }) => JSON.parse(localStorage.getItem(KEY)).answers[id],
      { KEY, id },
    );
  async function open(id) {
    const p = pages.find((p) => p.blocks.some((b) => b.id === id));
    assert.ok(p, id);
    await page.goto(baseURL + "/metadata.json");
    await page.evaluate(
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
      { KEY, n: p.number, index: p.blocks.findIndex((b) => b.id === id) },
    );
    await page.goto(baseURL);
    await button("Продолжить занятие  →").click();
    await page
      .getByText(p.blocks.find((b) => b.id === id).title, { exact: true })
      .last()
      .waitFor();
  }
  async function drag(from, to, touch = false) {
    await from.scrollIntoViewIfNeeded();
    const a = await from.boundingBox(),
      b = await to.boundingBox();
    const x = a.x + a.width / 2,
      y = a.y + a.height / 2,
      tx =
        (Math.max(0, b.x) +
          Math.min(page.viewportSize().width, b.x + b.width)) /
        2,
      ty = b.y + b.height / 2;
    if (touch) {
      const c = await ctx.newCDPSession(page);
      await c.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 12; i++)
        await c.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: x + ((tx - x) * i) / 12, y: y + ((ty - y) * i) / 12 },
          ],
        });
      await c.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await c.detach();
    } else {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(tx, ty, { steps: 14 });
      await page.mouse.up();
    }
  }
  async function trace(points) {
    const pad = page.getByLabel("Поле для рисования", { exact: true });
    const sheet = page.getByTestId("practical-sheet");
    if (await sheet.count()) await sheet.scrollIntoViewIfNeeded();
    else await pad.scrollIntoViewIfNeeded();
    const b = await pad.boundingBox();
    assert.ok(b);
    for (const point of points)
      assert.ok(
        b.x + point.x * b.width >= 0 &&
          b.x + point.x * b.width <= page.viewportSize().width,
        "stroke must remain reachable inside the viewport",
      );
    await page.mouse.move(
      b.x + points[0].x * b.width,
      b.y + points[0].y * b.height,
    );
    await page.mouse.down();
    for (let i = 1; i < points.length; i++)
      await page.mouse.move(
        b.x + points[i].x * b.width,
        b.y + points[i].y * b.height,
        { steps: 8 },
      );
    await page.mouse.up();
  }
  try {
    await open("p009-block01");
    assert.ok(
      (await page.locator("body").innerText()).includes(
        "На ветке сидела 1 птичка",
      ),
    );
    checks.push("p009 original story visible");
    await open("p025-lesson02");
    const text = await page.locator("body").innerText();
    assert.match(text, /Костя/);
    assert.match(text, /Юры/);
    checks.push("p025 original digits and pigeons stories");
    const placement = allBlocks.find((b) => b.id === "p012-lesson04");
    await open(placement.id);
    await button("Проверить действие").click();
    assert.equal(isDone(placement, await answer(placement.id)), false);
    let board = page.getByTestId("counter-board").first();
    for (let n = 1; n <= 3; n++) {
      await drag(
        board.getByTestId("token-source"),
        board.getByTestId("token-dropzone"),
      );
      await board.getByText(`На поле: ${n}`, { exact: true }).waitFor();
    }
    await button("Проверить действие").click();
    board = page.getByTestId("counter-board").first();
    await board.getByText("На поле: 3", { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await drag(
      board.getByTestId("token-source"),
      board.getByTestId("token-dropzone"),
      true,
    );
    await board.getByText("На поле: 4", { exact: true }).waitFor();
    await page.screenshot({
      path: "docs/source-practical-mobile.png",
      fullPage: true,
    });
    await button("Проверить действие").click();
    for (const field of placement.fields)
      await page
        .getByRole("textbox", { name: field.label, exact: true })
        .fill("4");
    await button("Проверить ответ").click();
    assert.ok(isDone(placement, await answer(placement.id)));
    await page.reload();
    await button("Продолжить занятие  →").click();
    assert.ok(isDone(placement, await answer(placement.id)));
    await button("Изменить действие 1").click();
    assert.equal(isDone(placement, await answer(placement.id)), false);
    checks.push(
      "placement 3+1, touch, reload, earlier edit revokes completion",
    );
    await page.setViewportSize({ width: 1440, height: 1100 });
    const grid = allBlocks.find((b) => b.exerciseNumber === 600);
    await open(grid.id);
    assert.equal(
      await page.getByRole("textbox").count(),
      0,
      "number alone cannot replace drawing",
    );
    const plan = practicalTrace(grid.steps[0]);
    await trace(plan.stages[0][0].points);
    await button("Проверить действие").click();
    assert.equal(
      await page.getByRole("textbox").count(),
      0,
      "one row is incomplete",
    );
    await trace(plan.stages[0][1].points);
    await button("Проверить действие").click();
    await page.getByTestId(`practical-result-${grid.steps[0].id}`).waitFor();
    await page.getByRole("textbox").fill("2");
    await button("Проверить ответ").click();
    assert.equal(isDone(grid, await answer(grid.id)), false);
    await page.getByRole("textbox").fill("14");
    await button("Проверить ответ").click();
    assert.ok(isDone(grid, await answer(grid.id)));
    await page.screenshot({
      path: "docs/source-cells-fourteen.png",
      fullPage: true,
    });
    checks.push("600: two drawn rows required; 2 rejected, 14 accepted");
    const coins = allBlocks.find((b) => b.exerciseNumber === 547);
    await open(coins.id);
    await page.getByRole("textbox").fill("4");
    await button("Проверить").click();
    assert.equal(isDone(coins, await answer(coins.id)), false);
    await page.getByRole("textbox").fill("12");
    await button("Проверить").click();
    assert.ok(isDone(coins, await answer(coins.id)));
    checks.push("547: 4 coins rejected as value; 12 kopecks accepted");
    const choose = allBlocks.find((b) => b.exerciseNumber === 324);
    await open(choose.id);
    assert.equal(
      await page.getByLabel("Поле для рисования", { exact: true }).count(),
      0,
      "do not reveal unknown count in guide",
    );
    await page.getByRole("textbox").fill("4");
    const chosenState = { choices: { count1: 4 } };
    for (const target of practicalTrace(choose.steps[0], chosenState).stages[0])
      await trace(target.points);
    await button("Проверить действие").click();
    await page.getByRole("textbox").fill("4");
    await button("Проверить ответ").click();
    assert.ok(isDone(choose, await answer(choose.id)));
    checks.push("324: child chooses second count, then draws 5 and 4");
    const cards = allBlocks.find((b) => b.exerciseNumber === 207);
    await open(cards.id);
    for (const digits of [
      [1, 4],
      [1, 9],
    ]) {
      for (const [i, digit] of digits.entries())
        await drag(
          page.getByTestId(`digit-source-${digit}`),
          page.getByTestId(`digit-slot-${i}`),
        );
      await button("Проверить действие").click();
    }
    for (const field of cards.fields)
      await page
        .getByRole("textbox", { name: field.label, exact: true })
        .fill(field.expected);
    await button("Проверить ответ").click();
    assert.ok(isDone(cards, await answer(cards.id)));
    checks.push("207: digit cards dragged to make 14 and 19");
    const question = allBlocks.find((b) => b.exerciseNumber === 515);
    await open(question.id);
    for (const [i, field] of question.fields.entries())
      if (!field.options)
        await page
          .getByRole("textbox", {
            name: `${i + 1}. ${field.label}`,
            exact: true,
          })
          .fill(field.expected);
    await button("Проверить").click();
    assert.equal(isDone(question, await answer(question.id)), false);
    for (const field of question.fields.filter((f) => f.options))
      await page
        .getByRole("button", {
          name: `${field.label}: ${field.expected}`,
          exact: true,
        })
        .click();
    await button("Проверить").click();
    assert.ok(isDone(question, await answer(question.id)));
    checks.push(
      "515: both source questions required before number-only answer can pass",
    );
    const long = allBlocks.find((b) => b.exerciseNumber === 782);
    await open(long.id);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const target of practicalTrace(long.steps[0]).stages[0])
      await trace(target.points);
    await button("Проверить действие").click();
    await page.getByRole("textbox").fill("30");
    await button("Проверить ответ").click();
    assert.ok(isDone(long, await answer(long.id)));
    checks.push(
      "782: all 40 cm and cut mark reachable through automatic scrolling on mobile viewport",
    );
    await page.setViewportSize({ width: 1440, height: 1100 });
    const garden = allBlocks.find((b) => b.exerciseNumber === 875);
    await open(garden.id);
    await button("Сюжет: Измерим школьный огород").click();
    await page
      .getByRole("textbox", { name: "Длина мерки в метрах", exact: true })
      .fill("5");
    await page
      .getByRole("textbox", {
        name: "Сколько раз мерка уложилась по длине?",
        exact: true,
      })
      .fill("8");
    await page
      .getByRole("textbox", {
        name: "Сколько раз мерка уложилась по ширине?",
        exact: true,
      })
      .fill("3");
    await button("метры").click();
    await page.getByRole("button", { name: "×", exact: true }).nth(0).click();
    await page
      .getByRole("textbox", {
        name: "Ответ: Сколько метров имеет огород в длину?",
        exact: true,
      })
      .fill("40");
    await button("Проверить задачу").click();
    assert.equal(isDone(garden, await answer(garden.id)), false);
    await page.getByRole("button", { name: "×", exact: true }).nth(1).click();
    await page
      .getByRole("textbox", {
        name: "Ответ: Сколько метров имеет огород в ширину?",
        exact: true,
      })
      .fill("15");
    await button("Проверить задачу").click();
    assert.ok(isDone(garden, await answer(garden.id)));
    await button("рубли").click();
    await button("Проверить задачу").click();
    assert.equal(isDone(garden, await answer(garden.id)), false);
    checks.push(
      "875: both garden dimensions required; metres accepted and rubles rejected",
    );
    const similar = allBlocks.find((b) => b.exerciseNumber === 278);
    await open(similar.id);
    await button("Сюжет: рубли").click();
    await page
      .getByRole("textbox", { name: "Стоимость варежек, рубли", exact: true })
      .fill("12");
    await page
      .getByRole("textbox", {
        name: "На сколько рублей платок дороже",
        exact: true,
      })
      .fill("6");
    await page
      .getByRole("textbox", { name: "Результат всей задачи", exact: true })
      .fill("18");
    await button("Проверить").click();
    assert.equal(isDone(similar, await answer(similar.id)), false);
    await page
      .getByRole("textbox", { name: "Стоимость варежек, рубли", exact: true })
      .fill("11");
    await page
      .getByRole("textbox", { name: "Результат всей задачи", exact: true })
      .fill("17");
    await button("Проверить").click();
    assert.ok(isDone(similar, await answer(similar.id)));
    checks.push(
      "278: original context retained and source numbers must change",
    );
    const composed = allBlocks.find((b) => b.exerciseNumber === 65);
    await open(composed.id);
    await button("О чём задача: яблоки").click();
    await page
      .getByRole("textbox", { name: "Первое число", exact: true })
      .fill("5");
    await page
      .getByRole("textbox", { name: "Второе число", exact: true })
      .fill("3");
    await page
      .getByRole("textbox", { name: "Результат", exact: true })
      .fill("2");
    await button("Проверить").click();
    assert.equal(isDone(composed, await answer(composed.id)), false);
    await button("Вопрос к задаче 1: Сколько яблок осталось?").click();
    await button("Проверить").click();
    assert.ok(isDone(composed, await answer(composed.id)));
    checks.push("65: complete apple story and matching question required");
    const guessing = allBlocks.find((b) => b.exerciseNumber === 199);
    await open(guessing.id);
    await page
      .getByRole("textbox", { name: "Число на закрытой карточке", exact: true })
      .fill("6");
    await button("Открыть карточку").click();
    assert.equal(await page.getByTestId("hidden-card-play").count(), 0);
    await page
      .getByRole("textbox", { name: "Число на закрытой карточке", exact: true })
      .fill("2");
    await button("Открыть карточку").click();
    await button("Проверить").click();
    assert.equal(isDone(guessing, await answer(guessing.id)), false);
    await page
      .getByRole("textbox", { name: "Число на закрытой карточке", exact: true })
      .fill("5");
    await button("Открыть карточку").click();
    await button("Проверить").click();
    assert.ok(isDone(guessing, await answer(guessing.id)));
    checks.push("199: hidden 2, not total 6; a second game is required");
    const reading = allBlocks.find((b) => b.exerciseNumber === 208);
    await open(reading.id);
    assert.equal(await page.getByRole("textbox").count(), 0);
    for (const [i, item] of reading.numberGame.items.entries()) {
      if (i === 4) {
        await button("Проверить").click();
        assert.equal(isDone(reading, await answer(reading.id)), false);
      }
      await button(`${item.value}: ${item.expected}`).click();
    }
    await button("Проверить").click();
    assert.ok(isDone(reading, await answer(reading.id)));
    checks.push("208: every digit is read and matched to its name");
    const rows = allBlocks.find((b) => b.exerciseNumber === 660);
    await open(rows.id);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const counts of [
      [6, 6],
      [3, 3, 3, 3],
    ]) {
      for (const [i, count] of counts.entries()) {
        const board = page.getByTestId("counter-board").nth(i);
        for (let n = 1; n <= count; n++) {
          await drag(
            board.getByTestId("token-source"),
            board.getByTestId("token-dropzone"),
            true,
          );
          await board.getByText(`На поле: ${n}`, { exact: true }).waitFor();
        }
        const boxes = await board
          .getByRole("button", { name: /^Предмет [0-9]+ на поле$/ })
          .all();
        const positions = await Promise.all(boxes.map((b) => b.boundingBox()));
        assert.ok(
          positions.every((b) => Math.abs(b.y - positions[0].y) < 1),
          "each source row must remain one visible row",
        );
        assert.ok(
          positions.every((b) => b.width >= 48),
          "child touch targets stay at least 48 px",
        );
      }
      await button("Проверить действие").click();
    }
    for (const field of rows.fields)
      await page
        .getByRole("textbox", { name: field.label, exact: true })
        .fill(field.expected);
    await button("Проверить ответ").click();
    assert.ok(isDone(rows, await answer(rows.id)));
    checks.push(
      "660: touch placement in two rows of six and four rows of three without wrapping",
    );
    await page.setViewportSize({ width: 1440, height: 1100 });
    const pictured = allBlocks.find((b) => b.exerciseNumber === 591);
    await open(pictured.id);
    const purchases = [
      [
        "Покупка ложек",
        "Сколько ложек купили?",
        "Сколько рублей стоят эти ложки?",
        "1",
        "6",
      ],
      [
        "Покупка вилок",
        "Сколько вилок купили?",
        "Сколько рублей стоят эти вилки?",
        "2",
        "8",
      ],
      [
        "Покупка ножей",
        "Сколько ножей купили?",
        "Сколько рублей стоят эти ножи?",
        "3",
        "9",
      ],
    ];
    for (const [
      i,
      [label, input, question, count, result],
    ] of purchases.entries()) {
      const part = page
        .getByTestId("story-task")
        .filter({
          has: page.getByRole("button", {
            name: `Сюжет: ${label}`,
            exact: true,
          }),
        })
        .last();
      await part
        .getByRole("button", { name: `Сюжет: ${label}`, exact: true })
        .click();
      await part.getByRole("textbox", { name: input, exact: true }).fill(count);
      await part.getByRole("button", { name: "рубли", exact: true }).click();
      await part.getByRole("button", { name: "×", exact: true }).click();
      await part
        .getByRole("textbox", { name: `Ответ: ${question}`, exact: true })
        .fill(result);
      await button("Проверить все задачи").click();
      assert.equal(isDone(pictured, await answer(pictured.id)), i === 2);
    }
    await page.reload();
    await button("Продолжить занятие  →").click();
    assert.ok(isDone(pictured, await answer(pictured.id)));
    await page
      .getByRole("textbox", { name: "Сколько ложек купили?", exact: true })
      .fill("2");
    assert.equal(isDone(pictured, await answer(pictured.id)), false);
    await page
      .getByRole("textbox", {
        name: "Ответ: Сколько рублей стоят эти ложки?",
        exact: true,
      })
      .fill("12");
    await button("Проверить все задачи").click();
    assert.ok(isDone(pictured, await answer(pictured.id)));
    checks.push(
      "591: all three pictured problems required, reload and dependent edits preserved",
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "docs/source-fidelity-browser-result.json",
      JSON.stringify(
        {
          date: new Date().toISOString(),
          baseURL,
          checks,
          errors,
          physicalPhone: "NOT RUN",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
