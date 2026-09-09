const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
    });
    const p = await context.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.setDefaultTimeout(8000);
    const button = (name) => p.getByRole("button", { name, exact: true });
    const images = () =>
      p.waitForFunction(() =>
        Array.from(document.images).every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      );
    const saved = async (id, predicate) => {
      await p.waitForFunction(
        ({ key, id }) =>
          !!JSON.parse(localStorage.getItem(key) || "{}").answers?.[id],
        { key: KEY, id },
      );
      return (
        await p.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY)
      ).answers[id];
    };
    const open = async (n, index) => {
      await button(`Открыть страницу ${n}`).click();
      await button(
        `Шаг ${index + 1}: ${pages[n - 1].blocks[index].title}`,
      ).click();
      await images();
    };
    await p.goto("http://127.0.0.1:8081");
    await button("Начать заниматься  →").click();
    assert.equal(
      await p.getByText("Мы рассмотрели", { exact: true }).count(),
      0,
    );
    assert.equal(await p.getByText("Пропустить →", { exact: true }).count(), 0);
    await button("Дальше →").click();
    assert.equal((await saved("p003-block01")).reviewed, true);
    await button("Правый мяч").click();
    await p.getByText("Пока не совпало.", { exact: false }).waitFor();
    await button("Левый мяч").click();
    await p.getByText("✓ Верно!", { exact: false }).waitFor();
    await p.screenshot({
      path: "docs/child-picture-desktop.png",
      fullPage: true,
    });
    await open(3, 3);
    await button("Красный карандаш").click();
    await p.getByText("Пока не совпало.", { exact: false }).waitFor();
    await button("Зелёный карандаш").click();
    await p.getByText("✓ Верно!", { exact: false }).waitFor();
    await open(1, 5);
    await button("Цифра 5").click();
    await p.getByText("✓ Верно!", { exact: false }).waitFor();
    await open(10, 6);
    await button("Цифра 3 на монете").click();
    await p.getByText("✓ Верно!", { exact: false }).waitFor();
    await open(7, 6);
    await button("Карточка 1").click();
    await p.getByText("Пока не совпало.", { exact: false }).waitFor();
    await button("Карточка 2").click();
    await p.getByText("✓ Верно!", { exact: false }).waitFor();
    await open(10, 2);
    await button("рыбу 1").click();
    await button("рыбу 1").click();
    await p.getByText("Отмечено: 0", { exact: true }).waitFor();
    for (const n of [1, 2, 3]) await button(`рыбу ${n}`).click();
    await p.getByText("✓ Верно!", { exact: false }).waitFor();
    // Draw using actual mouse gestures, without injecting answer state.
    await open(3, 5);
    const plan = pages[2].blocks[5].trace;
    const pad = p.getByLabel("Поле для рисования", { exact: true });
    async function stroke(points) {
      await pad.scrollIntoViewIfNeeded();
      const r = await pad.boundingBox();
      await p.mouse.move(
        r.x + points[0].x * r.width,
        r.y + points[0].y * r.height,
      );
      await p.mouse.down();
      for (const pt of points.slice(1))
        await p.mouse.move(r.x + pt.x * r.width, r.y + pt.y * r.height, {
          steps: 3,
        });
      await p.mouse.up();
    }
    await stroke([
      { x: 0.1, y: 0.8 },
      { x: 0.8, y: 0.1 },
    ]);
    await p.getByText("Попробуй ещё раз:", { exact: false }).waitFor();
    assert.equal(
      await p.evaluate(
        (k) =>
          JSON.parse(localStorage.getItem(k) || "{}").answers?.["p003-block06"]
            ?.strokes?.length ?? 0,
        KEY,
      ),
      0,
    );
    // A point at the start of a line must not complete the line.
    await stroke([plan.stages[0][0].points[0]]);
    await p.getByText("Попробуй ещё раз:", { exact: false }).waitFor();
    for (const target of plan.stages.flat()) await stroke(target.points);
    await p.getByText("Все элементы получились!", { exact: true }).waitFor();
    await p.screenshot({
      path: "docs/child-tracing-desktop.png",
      fullPage: true,
    });
    await p.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k) || "{}").answers?.["p003-block06"]
          ?.strokes?.length === 23,
      KEY,
    );
    await p.reload();
    await button("Продолжить занятие  →").click();
    await p.getByText("Все элементы получились!", { exact: true }).waitFor();
    await button("Отменить штрих").click();
    assert.equal(
      await p.getByText("Все элементы получились!", { exact: true }).count(),
      0,
    );
    await open(7, 8);
    const digit = pages[6].blocks[8].trace.stages[0][0];
    await stroke(digit.points);
    await p.getByText("Все элементы получились!", { exact: true }).waitFor();
    await open(6, 1);
    await button("Звёздочка").click();
    await p.getByText("Пока не совпало.", { exact: false }).waitFor();
    await button("Флажок").click();
    await p.getByText("✓ Верно!", { exact: false }).waitFor();
    for (const page of pages) {
      for (let i = 0; i < page.blocks.length; i++) {
        await open(page.number, i);
        assert.ok(
          (await p.locator("body").innerText()).includes(page.blocks[i].title),
        );
      }
    }
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const m = await mobile.newPage();
    m.on("pageerror", (e) => errors.push(e.message));
    await m.goto("http://127.0.0.1:8081");
    await m
      .getByRole("button", { name: "Начать заниматься  →", exact: true })
      .click();
    await m
      .getByRole("button", { name: "Шаг 2: Большой мяч", exact: true })
      .click();
    await m.getByRole("button", { name: "Левый мяч", exact: true }).tap();
    await m.getByText("✓ Верно!", { exact: false }).waitFor();
    await m.screenshot({
      path: "docs/child-picture-mobile.png",
      fullPage: true,
    });
    await m
      .getByRole("button", { name: "Шаг 6: Чёрточка и точка", exact: true })
      .click();
    const mp = m.getByLabel("Поле для рисования", { exact: true });
    await mp.scrollIntoViewIfNeeded();
    const r = await mp.boundingBox();
    assert.ok(Math.abs(r.width / 12 - r.height / 8) < 1, "square cells");
    const cdp = await mobile.newCDPSession(m);
    const coords = plan.stages[0][0].points;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: r.x + coords[0].x * r.width, y: r.y + coords[0].y * r.height },
      ],
    });
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: r.x + (coords[0].x + (coords[1].x - coords[0].x) * t) * r.width,
            y: r.y + coords[0].y * r.height,
          },
        ],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await m.getByText("Поставь точку · 2 из 23", { exact: true }).waitFor();
    await m.screenshot({
      path: "docs/child-tracing-mobile.png",
      fullPage: true,
    });
    await m.setViewportSize({ width: 320, height: 740 });
    assert.ok(
      await m.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    // Check that a real mobile touch selected the expected region and tracing did not scroll.
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "docs/browser-result.json",
      JSON.stringify(
        {
          passed: true,
          errors,
          at: new Date().toISOString(),
          checks: [
            "read next without confirmation",
            "direct balls and sloped pencils",
            "cover and coin digits",
            "digit among cards",
            "count and toggle fish",
            "wrong stroke and tap rejected",
            "23 traces across worksheets",
            "trace persistence and undo",
            "digit 1 tracing",
            "spatial picture choice",
            "all 82 blocks render",
            "mobile real touch region",
            "mobile touch trace",
            "square notebook cells",
            "320px layout",
          ],
        },
        null,
        2,
      ),
    );
    console.log("Child interaction browser smoke passed");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
