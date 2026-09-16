/** All browser requests must stay on the isolated test server, including mobile tabs. */
const baseURL = process.env.BASE_URL || "http://127.0.0.1:8081";
async function newTestContext(browser, options) {
  const { freshTutorials = false, ...browserOptions } = options ?? {};
  const context = await browser.newContext(browserOptions);
  // Existing task regressions start after onboarding; the dedicated coach suite tests first use.
  if (!freshTutorials) {
    const { allBlocks } = await import("../src/content/book.ts");
    const { taskTeaching } = await import("../src/lib/taskTeaching.ts");
    const families = [
      "place",
      "trace",
      "dot",
      "sticks",
      "cards",
      "picture",
      ...new Set(
        allBlocks.map((block) => `task:${taskTeaching(block).family}`),
      ),
    ];
    await context.addInitScript(
      (families) =>
        localStorage.setItem(
          "uchebnik:gesture-coach:v2",
          JSON.stringify(families),
        ),
      families,
    );
  }
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
module.exports = { baseURL, newTestContext };
