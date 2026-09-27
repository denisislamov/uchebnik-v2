/** A step the child has just solved glides to «Дальше»; a step that was already solved when it opened stays put. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const page = pages.find((p) => p.number === 4);
  const index = page.blocks.findIndex((b) => b.kind === "number");
  const block = page.blocks[index];
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    const viewport = { width: 320, height: 568 };
    const ctx = await newTestContext(browser, { viewport, hasTouch: true });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => report.errors.push(e.message));
    const open = async (answers) => {
      await p.goto(baseURL + "/metadata.json");
      await p.evaluate(({ KEY, n, i, answers }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 3, page: n, block: i, answers })), { KEY, n: page.number, i: index, answers });
      await p.goto(baseURL);
      await p.getByRole("button", { name: /^Продолжить занятие/ }).click();
      await p.getByTestId("exercise-card").getByText(block.title, { exact: true }).waitFor();
      await p.waitForTimeout(600);
    };
    const pane = p.getByTestId("lesson-scroll-pane");
    const next = p.getByRole("button", { name: "Дальше →", exact: true });
    const inView = async () => {
      const b = await next.boundingBox();
      return b.y >= 0 && b.y + b.height <= viewport.height;
    };
    await open({});
    const answer = p.getByRole("button", { name: `Ответ ${block.expected}`, exact: true });
    // The answer at the bottom edge of the screen, «Дальше» under it.
    const box = await answer.boundingBox();
    await pane.evaluate((e, d) => (e.scrollTop += d), box.y + box.height - (viewport.height - 8));
    await p.waitForTimeout(200);
    assert.equal(await inView(), false, "«Дальше» starts under the fold");
    const before = await pane.evaluate((e) => e.scrollTop);
    await answer.click();
    await p.waitForTimeout(1200);
    assert.equal(await inView(), true, "solving the step glides to «Дальше»");
    const after = await pane.evaluate((e) => e.scrollTop);
    assert.ok(after > before, "the page moved down, not up");
    report.checks.push({ solved: { before, after } });
    // The same step reopened already solved: no glide.
    await open({ [block.id]: { value: block.expected, checked: true, reviewed: false } });
    assert.equal(await pane.evaluate((e) => e.scrollTop), 0, "a solved step opens at the top");
    report.checks.push({ reopened: 0 });
    await ctx.close();
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/next-glide-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS next glide: ${report.checks.length} checks`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
