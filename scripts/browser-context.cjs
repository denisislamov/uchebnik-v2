/** All browser requests must stay on the isolated test server, including mobile tabs. */
const baseURL = process.env.BASE_URL || "http://127.0.0.1:8081";
async function newTestContext(browser, options) {
  const { freshTutorials = false, ...browserOptions } = options ?? {};
  const context = await browser.newContext(browserOptions);
  // Existing task regressions start after onboarding; the dedicated coach suite tests first use.
  if (!freshTutorials)
    await context.addInitScript(() => {
      localStorage.setItem(
        "uchebnik:gesture-coach:v1",
        JSON.stringify(["place", "trace", "dot", "sticks", "cards", "picture"]),
      );
    });
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
