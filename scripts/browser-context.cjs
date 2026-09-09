/** All browser requests must stay on the isolated test server, including mobile tabs. */
const baseURL = process.env.BASE_URL || "http://127.0.0.1:8081";
async function newTestContext(browser, options) {
  const context = await browser.newContext(options);
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
