const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8096";
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const mode of ["normal", "dnt", "gpc", "storage-denied", "offline"]) {
      const context = await browser.newContext();
      const events = [];
      await context.addInitScript((mode) => {
        if (mode === "dnt")
          Object.defineProperty(navigator, "doNotTrack", { get: () => "1" });
        if (mode === "gpc")
          Object.defineProperty(navigator, "globalPrivacyControl", {
            get: () => true,
          });
        if (mode === "storage-denied")
          Object.defineProperty(window, "localStorage", {
            get() {
              throw new DOMException("Denied", "SecurityError");
            },
          });
      }, mode);
      await context.route("http://127.0.0.1:8097/v1/**", async (route) => {
        const headers = {
          "Access-Control-Allow-Origin": base,
          "Access-Control-Allow-Headers": "Content-Type",
        };
        if (route.request().method() === "OPTIONS")
          return route.fulfill({ status: 204, headers });
        if (route.request().url().endsWith("/events"))
          events.push(route.request().postDataJSON());
        return mode === "offline"
          ? route.abort()
          : route.fulfill({ status: 204, headers });
      });
      await context.route("https://boosty.to/**", (route) =>
        route.fulfill({ status: 200, body: "Local external link check" }),
      );
      const page = await context.newPage();
      await page.goto(base);
      if (mode === "storage-denied") {
        await page
          .getByText(
            "Не удалось прочитать сохранение. Попробуйте перезапустить приложение.",
          )
          .waitFor();
        assert.equal(events.length, 1);
        assert.equal(events[0].visitorId, null);
        await context.close();
        continue;
      }
      await page.getByTestId("library-home").waitFor();
      const link = page.locator('a[href^="https://boosty.to/"]');
      const target = await link.getAttribute("href");
      const popupPromise = context.waitForEvent("page");
      await link.click();
      const popup = await popupPromise;
      await popup.waitForURL(target);
      await popup.close();
      await page.getByTestId("library-open-book").click();
      await page.getByTestId("library-home").waitFor({ state: "hidden" });
      if (["dnt", "gpc"].includes(mode)) assert.deepEqual(events, []);
      else {
        await page.waitForTimeout(100);
        for (const kind of ["page_view", "boosty_click", "book_open"])
          assert.equal(
            new Set(events.filter((e) => e.kind === kind).map((e) => e.id))
              .size,
            1,
            `${mode}/${kind}`,
          );
        if (mode === "storage-denied")
          assert.ok(events.every((e) => e.visitorId === null));
        if (mode === "normal") {
          const second = await context.newPage();
          await second.goto(base);
          await second.getByTestId("library-home").waitFor();
          const views = events.filter((e) => e.kind === "page_view");
          assert.equal(views.length, 2);
          assert.equal(views[0].visitorId, views[1].visitorId);
          assert.equal(views[0].sessionId, views[1].sessionId);
        }
      }
      await context.close();
    }
    console.log(
      "PASS analytics: DNT, GPC, storage denied, two tabs, offline navigation and Boosty popup",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
