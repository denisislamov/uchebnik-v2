const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
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
    const context = await newTestContext(browser, {
        viewport: { width: 1440, height: 1100 },
        hasTouch: true,
      }),
      p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.setDefaultTimeout(15000);
    const btn = (name) => p.getByRole("button", { name, exact: true });
    await p.goto(baseURL);
    await btn("Начать заниматься  →").waitFor();
    assert.equal(await btn("Страница 2. О нашей книге").count(), 0);
    await btn("Страница 1. Здравствуй, арифметика!").waitFor();
    await btn("Начать заниматься  →").click();
    await p.getByText("Больше или меньше?", { exact: true }).last().waitFor();
    assert.equal(await btn("Открыть страницу 2").count(), 0);
    const open = async (b) => {
      const page = pages.find((p) => p.blocks.includes(b)),
        index = page.blocks.indexOf(b);
      await p.goto(baseURL + "/metadata.json");
      await p.evaluate(
        ({ KEY, n, index }) =>
          localStorage.setItem(
            KEY,
            JSON.stringify({ version: 1, page: n, block: index, answers: {} }),
          ),
        { KEY, n: page.number, index },
      );
      await p.goto(baseURL);
      await btn("Продолжить занятие  →").click();
      await p.getByText(b.title, { exact: true }).last().waitFor();
    };
    await open(pages[7].blocks[0]);
    const picture = btn("Рисунок задания");
    await picture.scrollIntoViewIfNeeded();
    await p.waitForFunction(() =>
      [...document.images].every((i) => i.complete && i.naturalWidth > 0),
    );
    const r = await picture.boundingBox();
    for (const [x, y] of [
      [0.26, 0.4],
      [0.78, 0.43],
      [0.53, 0.14],
      [0.88, 0.2],
      [0.14, 0.12],
      [0.125, 0.34],
    ])
      await picture.click({ position: { x: x * r.width, y: y * r.height } });
    await p.getByText("✓ Верно!", { exact: false }).waitFor();
    await p.screenshot({ path: "docs/room-pairs.png", fullPage: true });
    await open(pages[6].blocks[5]);
    await p.getByTestId("modern-counting-card").waitFor();
    await open(pages[2].blocks[5]);
    for (const name of ["чёрный", "красный", "синий"])
      await btn(`Цвет: ${name}`).waitFor();
    assert.equal(await btn("Цвет: зелёный").count(), 0);
    const { isClosedTrace } = await import("../src/lib/tracing.ts");
    const closedBlock = allBlocks.find(
      (b) =>
        b.kind === "draw" &&
        b.trace &&
        b.trace.stages[0][0].points.length === 5 &&
        isClosedTrace(b.trace.stages[0][0], b.trace),
    );
    for (const reverse of [false, true]) {
      await open(closedBlock);
      const t = closedBlock.trace.stages[0][0],
        ring = t.points.slice(0, -1),
        mid = {
          x: (ring[0].x + ring[1].x) / 2,
          y: (ring[0].y + ring[1].y) / 2,
        };
      let points = [mid, ...ring.slice(1), ring[0], mid];
      if (reverse) points.reverse();
      const pad = p.getByLabel("Поле для рисования", { exact: true });
      await pad.scrollIntoViewIfNeeded();
      const box = await pad.boundingBox();
      assert.equal(await p.getByTestId("drawing-direction-arrow").count(), 0);
      await p.mouse.move(
        box.x + points[0].x * box.width,
        box.y + points[0].y * box.height,
      );
      await p.mouse.down();
      for (const point of points.slice(1))
        await p.mouse.move(
          box.x + point.x * box.width,
          box.y + point.y * box.height,
          { steps: 16 },
        );
      await p.mouse.up();
      await p.waitForFunction(
        ({ KEY, id }) =>
          JSON.parse(localStorage.getItem(KEY)).answers[id]?.strokes?.length ===
          1,
        { KEY, id: closedBlock.id },
      );
    }
    const shapes = allBlocks.filter((b) => b.kind === "shape");
    async function drag(index, wrong = false, touch = false) {
      const board = p.getByTestId("stick-board");
      await board.scrollIntoViewIfNeeded();
      const a = await p.getByTestId(`stick-${index}`).boundingBox(),
        b = await p.getByTestId(`stick-target-${index}`).boundingBox(),
        frame = await board.boundingBox();
      const x = a.x + a.width / 2,
        y = a.y + a.height / 2,
        tx = wrong ? frame.x + 8 : b.x + b.width / 2,
        ty = wrong ? frame.y + 8 : b.y + b.height / 2;
      if (touch) {
        const cdp = await context.newCDPSession(p);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x, y }],
        });
        for (let k = 1; k <= 16; k++)
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              { x: x + ((tx - x) * k) / 16, y: y + ((ty - y) * k) / 16 },
            ],
          });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await cdp.detach();
      } else {
        await p.mouse.move(x, y);
        await p.mouse.down();
        await p.mouse.move(tx, ty, { steps: 18 });
        await p.mouse.up();
      }
    }
    for (const [j, b] of shapes.entries()) {
      await open(b);
      if (j === 0) {
        await drag(0, true);
        await p
          .getByText(`Палочек: 0 из ${b.edges.length}`, { exact: true })
          .waitFor();
      }
      for (let i = 0; i < b.edges.length; i++) {
        await drag(i);
        await p
          .getByText(`Палочек: ${i + 1} из ${b.edges.length}`, { exact: true })
          .waitFor();
      }
      await btn("Проверить ответ").click();
      await btn("✓ Получилось!").waitFor();
      if (j === 0) {
        await p.screenshot({
          path: "docs/sticks-drag-drop.png",
          fullPage: true,
        });
        await btn("Убрать последнюю палочку").click();
        assert.equal(await btn("✓ Получилось!").count(), 0);
        await drag(b.edges.length - 1);
        await btn("Проверить ответ").click();
        await btn("✓ Получилось!").waitFor();
        await p.reload();
        await btn("Продолжить занятие  →").click();
        await btn("✓ Получилось!").waitFor();
      }
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await open(shapes[0]);
    await drag(0, false, true);
    await p.getByText("Палочек: 1 из 2", { exact: true }).waitFor();
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS: optional front matter, room pairs, modern counters, drawing palette, all ${shapes.length} stick tasks, wrong drops, undo, save, touch`,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
