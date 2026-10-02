/** Library navigation must preserve saved work and fit small touch screens. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { baseURL, newTestContext, stepShown } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";

async function openParents(page) {
  await page
    .getByRole("button", { name: "Информация для родителей", exact: true })
    .click();
  const words = (await page.getByTestId("adult-gate-question").innerText())
    .trim()
    .split(" ");
  const tens = [
    "двадцать",
    "тридцать",
    "сорок",
    "пятьдесят",
    "шестьдесят",
    "семьдесят",
    "восемьдесят",
    "девяносто",
  ];
  const units = [
    "один",
    "два",
    "три",
    "четыре",
    "пять",
    "шесть",
    "семь",
    "восемь",
    "девять",
  ];
  for (const digit of String(
    (tens.indexOf(words[0]) + 2) * 10 + units.indexOf(words[1]) + 1,
  )) {
    await page
      .getByRole("button", { name: `Цифра ${digit}`, exact: true })
      .click();
  }
  await page.getByText("Учимся вместе", { exact: true }).waitFor();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 900, height: 1000 },
      { width: 800, height: 1000 },
      { width: 600, height: 800 },
      { width: 390, height: 844 },
      { width: 320, height: 568 },
      { width: 844, height: 390 },
    ]) {
      const context = await newTestContext(browser, { viewport });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(baseURL);
      const book = page.getByRole("button", {
        name: "Открыть учебник Арифметика, 1 класс",
        exact: true,
      });
      await book.waitFor({ timeout: 8000 });
      await page.getByTestId("support-project").waitFor();
      const meter = page.getByRole("progressbar", {
        name: "Сбор на новые учебники и озвучку",
      });
      assert.equal(await meter.getAttribute("aria-valuenow"), "12500");
      assert.equal(await meter.getAttribute("aria-valuemax"), "60000");
      const fill = await page.getByTestId("funding-fill").boundingBox();
      const track = await meter.boundingBox();
      assert.ok(Math.abs(fill.width / track.width - 12500 / 60000) < 0.01);
      assert.equal(await page.getByTestId("planned-cover").count(), 9);
      assert.equal(
        await page.getByRole("link", { name: /Patreon/ }).count(),
        0,
        "An unconfigured donation URL must not send visitors to a fake destination",
      );
      await page.waitForFunction(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      );
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll("[data-testid='library-home'] *")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
          })
          .map((el) => el.textContent.slice(0, 80)),
      );
      assert.deepEqual(overflow, [], `Library overflow at ${viewport.width}px`);
      const clippedCovers = await page
        .getByTestId("planned-cover")
        .evaluateAll((covers) =>
          covers
            .filter(
              (cover) =>
                cover.scrollHeight > cover.clientHeight + 2 ||
                cover.scrollWidth > cover.clientWidth + 2,
            )
            .map((cover) => cover.textContent),
        );
      assert.deepEqual(
        clippedCovers,
        [],
        `Clipped book covers at ${viewport.width}px`,
      );
      if (viewport.width === 1440 || viewport.width === 390) {
        await page.screenshot({
          path: `/tmp/library-${viewport.width}.png`,
          fullPage: true,
        });
      }
      if (viewport.width === 390) {
        await openParents(page);
        assert.equal(
          await page
            .getByRole("button", { name: "Начать заново…", exact: true })
            .count(),
          0,
        );
        await page
          .getByRole("button", { name: "Вернуться в библиотеку", exact: true })
          .click();
      }
      await book.click();
      await page
        .getByRole("textbox", { name: "Найти страницу или задание" })
        .waitFor();
      await page
        .getByRole("button", { name: "Начать заниматься  →", exact: true })
        .click();
      await stepShown(page);
      await page.getByRole("button", { name: "Дальше →", exact: true }).click();
      await page.waitForFunction(
        (key) =>
          JSON.parse(localStorage.getItem(key) || "{}").answers?.[
            "p003-block01"
          ]?.reviewed === true,
        KEY,
      );
      const saved = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)),
        KEY,
      );
      await page
        .getByRole("button", { name: "На главную", exact: true })
        .click();
      await page
        .getByRole("button", { name: "В библиотеку", exact: true })
        .click();
      await page.getByTestId("library-home").waitFor();
      await page.reload();
      await page
        .getByRole("button", { name: "Продолжить занятие  →", exact: true })
        .click();
      await stepShown(page);
      const resumed = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)),
        KEY,
      );
      assert.equal(resumed.page, saved.page);
      assert.equal(resumed.block, saved.block);
      assert.deepEqual(
        Object.keys(resumed.answers),
        Object.keys(saved.answers),
      );
      for (const [id, answer] of Object.entries(saved.answers)) {
        for (const [key, value] of Object.entries(answer)) {
          assert.deepEqual(
            resumed.answers[id][key],
            value,
            `Saved answer ${id}.${key}`,
          );
        }
      }
      if (viewport.width === 390) {
        await page
          .getByRole("button", { name: "На главную", exact: true })
          .click();
        await openParents(page);
        await page
          .getByRole("button", { name: "Начать заново…", exact: true })
          .click();
        await page
          .getByText(
            "Удалить все ответы и рисунки в учебнике «Арифметика · 1 класс»? Это действие нельзя отменить.",
            { exact: true },
          )
          .waitFor();
        await page.getByRole("button", { name: "Отмена", exact: true }).click();
        assert.deepEqual(
          await page.evaluate(
            (key) => JSON.parse(localStorage.getItem(key)),
            KEY,
          ),
          resumed,
        );
        await page
          .getByRole("button", { name: "Начать заново…", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Да, удалить прогресс", exact: true })
          .click();
        await page.waitForFunction(
          (key) =>
            Object.keys(JSON.parse(localStorage.getItem(key)).answers)
              .length === 0,
          KEY,
        );
        await page
          .getByRole("textbox", { name: "Найти страницу или задание" })
          .waitFor();
        assert.equal(await page.getByTestId("library-home").count(), 0);
      }
      assert.deepEqual(errors, []);
      results.push({
        viewport,
        navigation: "passed",
        progress: "preserved",
        overflow: false,
      });
      await context.close();
    }
    fs.writeFileSync(
      "/tmp/library-browser-result.json",
      JSON.stringify(results, null, 2),
    );
    console.log(
      "PASS library: 7 viewports, book navigation, reload/resume, no overflow or page errors",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
