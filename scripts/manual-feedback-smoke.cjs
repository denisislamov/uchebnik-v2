const { openBook } = require("./browser-context.cjs");
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { baseURL, newTestContext, stepShown } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_CHANNEL
      ? { channel: process.env.BROWSER_CHANNEL }
      : {}),
  });
  const ctx = await newTestContext(browser, {
    viewport: { width: 1440, height: 1100 },
    hasTouch: true,
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const button = (name) => p.getByRole("button", { name, exact: true });
  async function open(id) {
    const page = pages.find((p) => p.blocks.some((b) => b.id === id));
    const index = page.blocks.findIndex((b) => b.id === id);
    await p.goto(baseURL + "/metadata.json");
    await p.evaluate(
      ({ KEY, n, index }) =>
        localStorage.setItem(
          KEY,
          JSON.stringify({
            version: 1,
            contentRevision: 7,
            page: n,
            block: index,
            answers: {},
          }),
        ),
      { KEY, n: page.number, index },
    );
    await p.goto(baseURL);
    await openBook(p);
    await button("Продолжить занятие  →").click();
    await stepShown(p);
  }
  async function drag(from, to, touch = false) {
    await from.scrollIntoViewIfNeeded();
    await from.hover();
    const a = await from.boundingBox(),
      b = await to.boundingBox();
    const x = a.x + a.width / 2,
      y = a.y + a.height / 2,
      tx = b.x + b.width / 2,
      ty = b.y + b.height / 2;
    if (touch) {
      const c = await ctx.newCDPSession(p);
      await c.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 16; i++)
        await c.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: x + ((tx - x) * i) / 16, y: y + ((ty - y) * i) / 16 },
          ],
        });
      await c.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await c.detach();
    } else {
      await p.mouse.move(x, y);
      await p.mouse.down();
      await p.mouse.move(tx, ty, { steps: 18 });
      await p.mouse.up();
    }
  }
  try {
    await open("p010-block09");
    const shapeBoard = p.getByTestId("stick-board");
    const shapeRect = await shapeBoard.boundingBox();
    assert.ok(
      shapeRect && shapeRect.height < 600,
      "construction board must fit normal screen height",
    );
    await open("p007-block06");
    const board = p.getByTestId("counter-board");
    await board.waitFor();
    // A press takes the object in hand and moves nothing by itself; the next press, on the
    // field, puts it there: nothing has to be carried.
    await board.getByTestId("token-source").click();
    await board.getByText("На поле: 0", { exact: true }).waitFor();
    await board.getByTestId("token-dropzone-press").click();
    await board.getByText("На поле: 1", { exact: true }).waitFor();
    // A press on an object that lies on the field leaves it there: children count by touching.
    await board.getByTestId("token-0").click();
    await board.getByText("На поле: 1", { exact: true }).waitFor();
    // In hand, it goes back with a press on the box.
    await board.getByTestId("token-supply-press").click({ position: { x: 30, y: 60 } });
    await board.getByText("На поле: 0", { exact: true }).waitFor();
    await drag(
      board.getByTestId("token-source"),
      board.getByTestId("token-dropzone"),
    );
    await board.getByText("На поле: 1", { exact: true }).waitFor();
    await button("Проверить ответ").click();
    await p
      .getByText(/^✓ Верно! /)
      .waitFor();
    await drag(board.getByTestId("token-0"), board.getByTestId("token-supply"));
    await board.getByText("На поле: 0", { exact: true }).waitFor();
    await p.setViewportSize({ width: 390, height: 844 });
    await drag(
      board.getByTestId("token-source"),
      board.getByTestId("token-dropzone"),
      true,
    );
    await board.getByText("На поле: 1", { exact: true }).waitFor();
    await p.screenshot({
      path: "docs/counter-drag-mobile.png",
      fullPage: true,
    });
    await p.setViewportSize({ width: 1440, height: 1100 });
    const success = () =>
      p
        .getByText(/^✓ Верно! /)
        .waitFor();
    // Same reusable board must work for sticks and circles. The beetle and the
    // cherries were one two-group board; since review 2 each is its own step.
    for (const [id, amounts] of [
      ["p004-block05", [5]],
      ["p018-lesson02", [6]],
      ["p018-cherries", [6]],
    ]) {
      await open(id);
      for (let g = 0; g < amounts.length; g++) {
        const group = p.getByTestId("counter-board").nth(g);
        for (let i = 1; i <= amounts[g]; i++) {
          await drag(
            group.getByTestId("token-source"),
            group.getByTestId("token-dropzone"),
          );
          await group.getByText(`На поле: ${i}`, { exact: true }).waitFor();
        }
      }
      await p.getByRole("button", { name: /^Проверить(?: ответ)?$/ }).click();
      // CourseTask and Exercise use different success messages.
      await p.waitForFunction(
        ({ KEY, id }) =>
          JSON.parse(localStorage.getItem(KEY)).answers[id]?.checked,
        { KEY, id },
      );
      const { isDone } = await import("../src/lib/assessment.ts");
      const b = pages.flatMap((p) => p.blocks).find((b) => b.id === id);
      assert.ok(
        isDone(
          b,
          await p.evaluate(
            ({ KEY, id }) => JSON.parse(localStorage.getItem(KEY)).answers[id],
            { KEY, id },
          ),
        ),
      );
    }
    await open("p011-lesson02");
    const squareBoard = p.getByTestId("composition-board");
    assert.equal(await squareBoard.count(), 1);
    await squareBoard.getByTestId("composition-source-0").click();
    assert.equal(
      await p.locator('[data-testid^="composition-token-"]').count(),
      0,
      "a tap does not place a square",
    );
    for (const [group, amount] of [2, 1].entries()) {
      for (let n = 1; n <= amount; n++) {
        await drag(
          squareBoard.getByTestId(`composition-source-${group}`),
          squareBoard.getByTestId("composition-field"),
          true,
        );
      }
    }
    await squareBoard
      .getByTestId("composition-total")
      .filter({ hasText: "2 и 1 · Всего 3" })
      .waitFor();
    await p.getByRole("button", { name: /^Проверить(?: ответ)?$/ }).click();
    await button("✓ Получилось!").waitFor();
    await p.screenshot({
      path: "docs/page11-square-layout.png",
      fullPage: true,
    });
    await p.reload();
    await openBook(p);
    await button("Продолжить занятие  →").click();
    await stepShown(p);
    await squareBoard
      .getByTestId("composition-total")
      .filter({ hasText: "2 и 1 · Всего 3" })
      .waitFor();
    // Malformed saved amounts must not produce impossible objects or completion.
    await p.goto(baseURL + "/metadata.json");
    await p.evaluate((KEY) => {
      const s = JSON.parse(localStorage.getItem(KEY));
      s.answers["p011-lesson02"].responses = { "0left": "-1", "0right": "NaN" };
      localStorage.setItem(KEY, JSON.stringify(s));
    }, KEY);
    await p.goto(baseURL);
    await openBook(p);
    await button("Продолжить занятие  →").click();
    await stepShown(p);
    await squareBoard
      .getByTestId("composition-total")
      .filter({ hasText: "0 и 0 · Всего 0" })
      .waitFor();
    assert.equal(await button("✓ Получилось!").count(), 0);
    for (const [id, answer] of [
      ["p006-block02", "Вверху слева"],
      ["p006-block03", "Вверху справа"],
      ["p006-block04", "Внизу слева"],
      ["p006-block05", "Внизу справа"],
    ]) {
      await open(id);
      await p.getByTestId("location-task").waitFor();
      assert.equal(
        await p.getByTestId("location-horizontal-question").count(),
        0,
      );
      const [vertical, horizontal] = answer.split(" ");
      await button(vertical).click();
      assert.equal(await p.getByText("✓ Верно!", { exact: false }).count(), 0);
      await button(horizontal[0].toUpperCase() + horizontal.slice(1)).click();
      await success();
    }
    await open("p010-block04");
    await p.waitForFunction(() =>
      Array.from(document.images).every((i) => i.complete && i.naturalWidth),
    );
    const berryBlock = pages[9].blocks.find((b) => b.id === "p010-block04");
    for (const target of berryBlock.targets) {
      const picture = p.getByRole("button", {
        name: "Рисунок задания",
        exact: true,
      });
      await picture.scrollIntoViewIfNeeded();
      const r = await picture.boundingBox();
      await picture.click({
        position: {
          x: (target.x - target.w * 0.1) * r.width,
          y: (target.y + target.h / 2) * r.height,
        },
      });
    }
    await success();
    async function trace(points) {
      const field = p.getByLabel("Поле для рисования", { exact: true });
      await field.scrollIntoViewIfNeeded();
      const r = await field.boundingBox();
      await p.mouse.move(
        r.x + points[0].x * r.width,
        r.y + points[0].y * r.height,
      );
      await p.mouse.down();
      for (const pt of points.slice(1))
        await p.mouse.move(r.x + pt.x * r.width, r.y + pt.y * r.height, {
          steps: points.length < 4 ? 18 : 1,
        });
      await p.mouse.up();
    }
    const tree = pages[3].blocks.find((b) => b.id === "p004-block08");
    for (const reverse of [false, true]) {
      await open(tree.id);
      const points = tree.trace.stages[0][0].points;
      await trace(reverse ? [...points].reverse() : points);
      await p.waitForFunction(
        (KEY) =>
          JSON.parse(localStorage.getItem(KEY)).answers["p004-block08"]?.strokes
            ?.length === 1,
        KEY,
      );
    }
    const plums = pages[7].blocks.find((b) => b.id === "p008-block15");
    await open(plums.id);
    for (const target of plums.trace.stages.flat()) await trace(target.points);
    await p.getByText("Все элементы получились!", { exact: true }).waitFor();
    await p.screenshot({ path: "docs/plums-together.png", fullPage: true });
    await open("p011-lesson01");
    await p
      .getByRole("textbox", { name: /Сколько/ })
      .first()
      .waitFor();
    assert.equal(await p.getByRole("textbox", { name: /Сколько/ }).count(), 2);
    await p
      .getByText(/2 мальчика и 1 девочка катаются на велосипедах/)
      .waitFor();
    await p.screenshot({ path: "docs/page11-condition.png", fullPage: true });
    // Rendered side lengths, not just model coordinates, must be equilateral.
    for (const width of [390, 1440]) {
      await p.setViewportSize({ width, height: 1100 });
      await open("p010-block09");
      // Off a phone the board takes the room the window leaves: it is measured as the child
      // first sees it, not while it is being fitted.
      await stepShown(p);
      const lines = await p
        .getByTestId("stick-board")
        .locator("svg line")
        .evaluateAll((nodes) =>
          nodes.map((n) => {
            const v = (a) => Number(n.getAttribute(a));
            return Math.hypot(v("x2") - v("x1"), v("y2") - v("y1"));
          }),
        );
      assert.equal(lines.length, 3);
      assert.ok(Math.max(...lines) - Math.min(...lines) < 0.01);
      // A stick is no longer than the board lets it be, and the whole board is in view.
      assert.ok(Math.max(...lines) <= 420, `a stick is ${Math.max(...lines)} px long`);
      const board = await p.getByTestId("stick-board").boundingBox();
      if (width >= 600) {
        const nav = await p.getByTestId("lesson-nav").boundingBox();
        assert.ok(board.y >= 0 && board.y + board.height <= nav.y, "the board stands over the navigation");
      }
    }

    assert.deepEqual(errors, []);
    console.log(
      "PASS manual feedback: counter mouse/touch, sticks, independent groups, square placement/restore, four location questions, berry halos, bidirectional trunks, simultaneous plums, page11 conditions, responsive equilateral triangles",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
