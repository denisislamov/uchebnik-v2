const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const locales = [
  ["ru", "Цифровые учебники", "Русский"],
  ["en", "Digital textbooks", "English"],
  ["de", "Digitale Schulbücher", "Deutsch"],
  ["fr", "Manuels numériques", "Français"],
  ["es", "Libros de texto digitales", "Español"],
  ["it", "Libri di testo digitali", "Italiano"],
];
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 800, 1440]) {
      const context = await newTestContext(browser, {
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(baseURL);
      await page.getByTestId("language-wheel").waitFor({ timeout: 8000 });
      for (let i = 0; i < locales.length; i++) {
        const [locale, title, name] = locales[i];
        if (i) await page.getByTestId("language-next").click();
        await page.getByRole("heading", { name: title, exact: true }).waitFor();
        await page.waitForFunction(
          (code) => document.documentElement.lang === code,
          locale,
        );
        const selected = page.getByTestId(`language-${locale}`);
        assert.equal(await selected.getAttribute("aria-checked"), "true");
        const overflow = await page
          .getByTestId("library-home")
          .evaluate((root) =>
            [...root.querySelectorAll("*")]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
              })
              .map((el) => el.textContent.slice(0, 80)),
          );
        assert.deepEqual(overflow, [], `${locale} overflow ${width}`);
        const clipped = await page
          .getByTestId("planned-cover")
          .evaluateAll((nodes) =>
            nodes
              .filter(
                (el) =>
                  el.scrollWidth > el.clientWidth + 2 ||
                  el.scrollHeight > el.clientHeight + 2,
              )
              .map((el) => el.textContent),
          );
        assert.deepEqual(clipped, [], `${locale} clipped covers ${width}`);
        if (locale !== "ru") {
          const text = await page.getByTestId("library-home").innerText();
          assert.equal(
            /[А-Яа-яЁё]/.test(text.replaceAll("Русский", "")),
            false,
            `${locale} untranslated homepage`,
          );
        }
        await page.getByTestId("library-parents").click();
        const panel = page.getByTestId("library-parent-info");
        await panel.waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: "Начать заново…", exact: true })
            .count(),
          0,
        );
        if (locale !== "ru")
          assert.equal(
            /[А-Яа-яЁё]/.test(
              (await panel.innerText()).replaceAll("Родителям", ""),
            ),
            false,
          );
        await page.getByTestId("library-parent-close").click();
        await panel.waitFor({ state: "hidden" });
        if (width === 390 && locale === "de")
          await page.screenshot({ path: "/tmp/library-language-mobile.png" });
        if (width === 1440 && locale === "en")
          await page.screenshot({ path: "/tmp/library-language-desktop.png" });
      }
      await page.reload();
      await page
        .getByRole("heading", { name: locales[5][1], exact: true })
        .waitFor();
      await page.getByTestId("library-open-book").click();
      await page
        .getByRole("textbox", { name: "Найти страницу или задание" })
        .waitFor();
      await page
        .getByRole("button", { name: "В библиотеку", exact: true })
        .click();
      await page
        .getByRole("heading", { name: locales[5][1], exact: true })
        .waitFor();
      const wheel = page.getByTestId("language-scroll");
      await wheel.press("Home");
      await page
        .getByRole("heading", { name: locales[0][1], exact: true })
        .waitFor();
      await wheel.press("ArrowDown");
      await page
        .getByRole("heading", { name: locales[1][1], exact: true })
        .waitFor();
      await wheel.press("Tab");
      await page.waitForTimeout(350); // Flush deferred scroll events after focus leaves the wheel.
      assert.equal(
        await page.title(),
        locales[1][1],
        "Tab must not change the language",
      );
      await wheel.hover();
      await page.mouse.wheel(0, 112);
      await page
        .getByRole("heading", { name: locales[3][1], exact: true })
        .waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(
      "PASS localization: 6 languages × 4 widths, parents, persistence, keyboard and wheel",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
