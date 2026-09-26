const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_CHANNEL
      ? { channel: process.env.BROWSER_CHANNEL }
      : {}),
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.setDefaultTimeout(30000);
    await p.goto(process.env.DEBUG_URL || "http://127.0.0.1:8082");
    const btn = (name) => p.getByRole("button", { name, exact: true });
    await btn("Начать заниматься  →").click();
    const panel = p.getByTestId("debug-source-panel");
    await panel.waitFor();
    assert.match(
      await p.getByTestId("debug-source-page").innerText(),
      /страница 3$/,
    );
    const left = await p.getByTestId("lesson-scroll-pane").boundingBox(),
      right = await panel.boundingBox();
    assert.ok(left.x + left.width <= right.x + 2, "panes must be side by side");
    await panel
      .getByRole("img", { name: "Оригинал страницы 3", exact: true })
      .waitFor();
    await btn("Шаг 6: Чёрточка и точка").click();
    await panel.getByText("Чёрточка и точка", { exact: true }).waitFor();
    await p.screenshot({ path: "docs/debug-source-view.png", fullPage: true });
    const img = panel.getByRole("img", {
      name: "Оригинал страницы 3",
      exact: true,
    });
    const before = await img.boundingBox();
    await btn("Сверка: увеличить ×2").click();
    const after = await img.boundingBox();
    assert.ok(after.width > before.width * 1.8);
    const leftScroll = await p
      .getByTestId("lesson-scroll-pane")
      .evaluate((e) => e.scrollTop);
    await p.mouse.move(right.x + right.width / 2, right.y + right.height - 80);
    const sourceTop = (await img.boundingBox()).y;
    await p.mouse.wheel(0, 450);
    await p.waitForFunction(
      (top) =>
        document
          .querySelector('[aria-label="Оригинал страницы 3"]')
          .getBoundingClientRect().top <
        top - 100,
      sourceTop,
    );
    assert.equal(
      await p.getByTestId("lesson-scroll-pane").evaluate((e) => e.scrollTop),
      leftScroll,
      "source scroll must not move the exercise",
    );

    const { pages } = await import("../src/content/book.ts");
    for (const n of [12, 70, 143]) {
      await btn("На главную").click();
      assert.equal(await panel.count(), 0);
      await p
        .getByRole("textbox", {
          name: "Найти страницу или задание",
          exact: true,
        })
        .fill(String(n));
      await btn(`Страница ${n}. ${pages[n - 1].title}`).click();
      await panel
        .getByRole("img", { name: `Оригинал страницы ${n}`, exact: true })
        .waitFor();
      assert.match(
        await p.getByTestId("debug-source-page").innerText(),
        new RegExp(`страница ${n}$`),
      );
      await btn("Сверка: увеличить ×2").waitFor();
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForFunction(() => {
      const left = document
        .querySelector('[data-testid="lesson-scroll-pane"]')
        .getBoundingClientRect();
      const right = document
        .querySelector('[data-testid="debug-source-panel"]')
        .getBoundingClientRect();
      return left.bottom <= right.top + 2;
    });
    const a = await p.getByTestId("lesson-scroll-pane").boundingBox(),
      b = await panel.boundingBox();
    assert.ok(a.y + a.height <= b.y + 2, "narrow view stacks panes");
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: debug split view, page/step sync, zoom, home, narrow layout",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
