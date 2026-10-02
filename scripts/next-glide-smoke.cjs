const { openBook } = require("./browser-context.cjs");
/**
 * «Дальше» stands under the sheet, always in the same place and always in view; a step opens at its top
 * and stays there until the child answers — whether it was solved before or not.
 */
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
  // A task with a check button that can be pressed from the start.
  const workPage = pages.find((p) => p.blocks.some((b) => b.kind === "work" && b.fields.length > 3));
  const workIndex = workPage.blocks.findIndex((b) => b.kind === "work" && b.fields.length > 3);
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    const viewport = { width: 320, height: 568 };
    const ctx = await newTestContext(browser, { viewport, hasTouch: true });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => report.errors.push(e.message));
    const open = async (n, i, answers, title) => {
      await p.goto(baseURL + "/metadata.json");
      await p.evaluate(({ KEY, n, i, answers }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 7, page: n, block: i, answers })), { KEY, n, i, answers });
      await p.goto(baseURL);
      await openBook(p);
      await p.getByRole("button", { name: /^Продолжить занятие/ }).click();
      await p.getByTestId("exercise-card").getByText(title, { exact: true }).waitFor();
      await p.waitForTimeout(900);
    };
    const pane = p.getByTestId("lesson-scroll-pane");
    const next = p.getByRole("button", { name: "Дальше →", exact: true });
    const place = async () => {
      const b = await next.boundingBox();
      return { y: Math.round(b.y), inView: b.y >= 0 && b.y + b.height <= viewport.height };
    };
    await open(page.number, index, {}, block.title);
    assert.equal(await pane.evaluate((e) => e.scrollTop), 0, "an unsolved step opens at the top");
    const before = await place();
    assert.equal(before.inView, true, "«Дальше» is in view before the task is solved");
    assert.equal(await next.getAttribute("aria-disabled"), "true", "and waits for the answer");
    // Pressed too early, it says why.
    await p.getByTestId("next-area").click({ force: true });
    await p.getByTestId("next-locked-note").getByText("Сначала сделай задание").waitFor();
    const answer = p.getByRole("button", { name: `Ответ ${block.expected}`, exact: true });
    await answer.scrollIntoViewIfNeeded();
    const scrolled = await pane.evaluate((e) => e.scrollTop);
    await answer.click();
    await p.waitForTimeout(1200);
    const after = await place();
    assert.equal(after.inView, true, "«Дальше» is in view once the task is solved");
    assert.equal(after.y, before.y, "and has not moved");
    assert.equal(await next.getAttribute("aria-disabled"), null, "now it can be pressed");
    assert.equal(await pane.evaluate((e) => e.scrollTop), scrolled, "solving the step does not move the page");
    report.checks.push({ solved: { before, after } });
    // The same step reopened already solved.
    await open(page.number, index, { [block.id]: { value: block.expected, checked: true, reviewed: false } }, block.title);
    assert.equal(await pane.evaluate((e) => e.scrollTop), 0, "a solved step opens at the top");
    report.checks.push({ reopened: 0 });
    // A list of questions with «Проверить» under it: opening it does not pull the page to the button.
    await open(workPage.number, workIndex, {}, workPage.blocks[workIndex].title);
    assert.equal(await pane.evaluate((e) => e.scrollTop), 0, "a list of questions opens at the top");
    report.checks.push({ questions: 0 });
    await ctx.close();
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/next-glide-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS next in place: ${report.checks.length} checks`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
