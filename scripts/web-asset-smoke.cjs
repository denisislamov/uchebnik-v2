const { openBook } = require("./browser-context.cjs");
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await newTestContext(browser, {
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(baseURL);
    await openBook(page);
    await page.getByRole("button", { name: /^Страница 3\./ }).waitFor();
    await page.waitForFunction(() =>
      [...document.images]
        .filter((image) => image.currentSrc.includes("assets/book2/"))
        .every((image) => image.complete && image.naturalWidth > 0),
    );
    const sources = await page.locator("img").evaluateAll((images) =>
      images.map((image) => image.currentSrc).filter((src) => src.includes("assets/book2/")),
    );
    assert.ok(sources.length >= 20, `only ${sources.length} revised previews rendered`);
    assert.ok(sources.every((src) => src.includes(".webp")), "a revised preview still loads PNG");
    assert.deepEqual(errors, []);
    console.log(`PASS web assets: ${sources.length} revised previews use WebP`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
