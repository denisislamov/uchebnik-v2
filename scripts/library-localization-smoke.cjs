const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const locales = [
  ["ru", "Умная Полка", "Русский"],
  ["en", "Smart Shelf", "English"],
  ["de", "Smart Shelf", "Deutsch"],
  ["fr", "Smart Shelf", "Français"],
  ["es", "Smart Shelf", "Español"],
  ["it", "Smart Shelf", "Italiano"],
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
      await page.getByTestId("language-picker").waitFor({ timeout: 8000 });
      const loadedFonts = await page.evaluate(() =>
        [...document.fonts]
          .filter((font) => font.status === "loaded")
          .map((font) => font.family.replaceAll('"', "")),
      );
      for (const family of [
        "Inter_400Regular",
        "Inter_700Bold",
        "Inter_800ExtraBold",
      ])
        assert.ok(loadedFonts.includes(family), `${family} failed to load`);
      for (let i = 0; i < locales.length; i++) {
        const [locale, title, name] = locales[i];
        await page.getByTestId("language-picker").click();
        const dialog = page.getByTestId("language-dialog");
        await dialog.waitFor();
        assert.ok(await page.getByRole("dialog").getAttribute("aria-label"));
        const current = await page
          .getByTestId(`language-${locales[Math.max(0, i - 1)][0]}`)
          .getAttribute("aria-pressed");
        assert.equal(current, "true");
        await page.getByTestId(`language-${locale}`).click();
        await dialog.waitFor({ state: "hidden" });
        await page.getByRole("heading", { name: title, exact: true }).waitFor();
        await page.waitForFunction(
          (code) => document.documentElement.lang === code,
          locale,
        );
        const support = page.getByRole("link", { name: /Boosty/ });
        assert.equal(
          await support.getAttribute("href"),
          "https://boosty.to/islamovdenis/single-payment/donation/832184/target?share=target_link",
        );
        assert.match(
          await page.getByTestId("language-picker").innerText(),
          new RegExp(name),
        );
        const bookBox = await page.getByTestId("available-book").boundingBox();
        assert.ok(
          bookBox.y < (width >= 1000 ? 240 : 420),
          `${locale}: header takes too much space at ${width}px`,
        );
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
      const picker = page.getByTestId("language-picker");
      await picker.press("Enter");
      const dialog = page.getByTestId("language-dialog");
      await dialog.waitFor();
      const search = page.getByTestId("language-search");
      await search.fill("francais");
      await page.getByTestId("language-fr").waitFor();
      assert.equal(
        await page.getByTestId("language-options").getByRole("button").count(),
        1,
      );
      await search.fill("zzzz");
      assert.equal(
        await page.getByTestId("language-options").getByRole("button").count(),
        0,
      );
      await page.getByTestId("language-empty").waitFor();
      await search.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(
        await page.title(),
        locales[5][1],
        "Closing search must not change the language",
      );
      await picker.press("Enter"); // Focus returns to the trigger after closing.
      await page.getByTestId("language-search").fill("English");
      await page.getByTestId("language-en").press("Enter");
      await dialog.waitFor({ state: "hidden" });
      await page
        .getByRole("heading", { name: locales[1][1], exact: true })
        .waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(
      "PASS localization: 6 languages × 4 widths, compact header, parents, persistence, searchable picker and keyboard",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
