/** All browser requests must stay on the isolated test server, including mobile tabs. */
const baseURL = process.env.BASE_URL || "http://127.0.0.1:8081";
async function newTestContext(browser, options) {
  // Coaching opens only from its button, so no tutorial history is seeded here.
  const context = await browser.newContext(options ?? {});
  const origin = new URL(baseURL).origin;
  await context.route(/^https?:\/\//, (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      console.error(
        `Blocked request outside test server: ${route.request().url()}`,
      );
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  return context;
}
/**
 * Off a phone a step is fitted to the window before it is shown, and comes in a moment after it is
 * opened. Wait for it as a child does: what is measured or carried before that is not yet in its place.
 */
async function stepShown(page) {
  await page.getByTestId("exercise-body").waitFor();
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector('[data-testid="exercise-body"]')).opacity === "1",
    null,
    { timeout: 5000 },
  );
}
/**
 * The steps of a page are listed behind «Шаг 3 из 8» over the task, not on the task's screen:
 * open the list and press the step.
 */
async function openStep(page, name) {
  await page.getByRole("button", { name: /^Шаги страницы/ }).click();
  await page.getByRole("button", { name, exact: true }).click();
  await stepShown(page);
}
module.exports = { baseURL, newTestContext, openStep, stepShown };
