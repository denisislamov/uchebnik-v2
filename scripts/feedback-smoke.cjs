const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1280]) {
      const context = await newTestContext(browser, {
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const submissions = [];
      let fail = true;
      await page.route("**/v1/**", async (route) => {
        const headers = {
          "Access-Control-Allow-Origin": baseURL.replace(/\/$/, ""),
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        };
        if (route.request().method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        if (route.request().url().endsWith("/feedback")) {
          submissions.push(route.request().postDataJSON());
          if (fail) {
            fail = false;
            return route.abort("failed");
          }
          return route.fulfill({
            status: 202,
            headers,
            contentType: "application/json",
            body: '{"ok":true}',
          });
        }
        return route.fulfill({ status: 204, headers });
      });
      await page.goto(baseURL);
      await page.getByTestId("feedback-open").waitFor({ timeout: 5000 });
      for (const locale of ["ru", "en", "de", "fr", "es", "it"]) {
        await page.getByTestId("language-picker").click();
        await page.getByTestId(`language-${locale}`).click();
        await page.getByTestId("feedback-open").click();
        const dialog = page.getByTestId("feedback-dialog");
        await dialog.waitFor();
        if (locale !== "ru")
          assert.equal(
            /[А-Яа-яЁё]/.test(await dialog.innerText()),
            false,
            `${locale}: untranslated feedback`,
          );
        const text = "Thank you for this useful textbook!";
        await page.getByTestId("feedback-message").fill(text);
        fail = true;
        const before = submissions.length;
        await page.getByTestId("feedback-submit").click();
        await page.getByTestId("feedback-error").waitFor();
        assert.equal(
          await page.getByTestId("feedback-message").inputValue(),
          text,
        );
        await page.getByTestId("feedback-submit").click();
        await page.getByTestId("feedback-success").waitFor();
        assert.equal(submissions[before].id, submissions[before + 1].id);
        await page.getByTestId("feedback-close").click();
        await dialog.waitFor({ state: "hidden" });
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(
      "PASS feedback: 2 viewports, 6 languages, retry keeps message and request ID",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
