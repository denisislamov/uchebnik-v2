/** Each task reads itself aloud when opened; a new step interrupts; parents can turn automatic reading off. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const { spokenForm } = await import("../src/lib/spoken.ts");
  const page = pages.find((p) => p.number === 11);
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    const ctx = await newTestContext(browser, { viewport: { width: 1280, height: 900 } });
    // Headless Chromium has no voices: stand in for the synthesizer and record what is said.
    await ctx.addInitScript(() => {
      window.__spoken = [];
      window.__cancels = 0;
      const synth = {
        speaking: false, pending: false, paused: false,
        speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend({}), 20); },
        cancel() { window.__cancels++; },
        getVoices() { return []; }, pause() {}, resume() {},
        addEventListener() {}, removeEventListener() {},
      };
      Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => report.errors.push(e.message));
    const spoken = () => p.evaluate(() => window.__spoken.slice());
    await p.goto(baseURL + "/metadata.json");
    await p.evaluate(({ KEY, n }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 3, page: n, block: 0, answers: {} })), { KEY, n: page.number });
    await p.goto(baseURL);
    await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
    await p.waitForFunction(() => window.__spoken.length >= 2);
    const first = await spoken();
    assert.equal(first[0], spokenForm(page.blocks[0].title), "the heading is read first, in its spoken form");
    assert.ok(first.some((t) => t.includes(spokenForm(page.blocks[0].prompt).slice(0, 30))), "the task is read");
    report.checks.push({ step: 1, lines: first.length });
    const before = (await spoken()).length;
    await p.getByRole("button", { name: `Шаг 2: ${page.blocks[1].title}`, exact: true }).click();
    await p.waitForFunction((n) => window.__spoken.length > n, before);
    assert.ok((await p.evaluate(() => window.__cancels)) > 0, "opening another step cancels the previous voice");
    assert.equal((await spoken())[before], spokenForm(page.blocks[1].title));
    report.checks.push({ step: 2, cancelled: true });
    await p.getByRole("button", { name: "Информация для родителей", exact: true }).click();
    await p.getByRole("button", { name: "Выключить автоозвучивание", exact: true }).click();
    await p.getByRole("button", { name: "Вернуться к учебнику", exact: true }).click();
    const quiet = (await spoken()).length;
    await p.getByRole("button", { name: `Шаг 3: ${page.blocks[2].title}`, exact: true }).click();
    await p.waitForTimeout(600);
    assert.equal((await spoken()).length, quiet, "with automatic reading off, a new step stays silent");
    await p.getByRole("button", { name: "Послушать задание", exact: true }).click();
    await p.waitForFunction((n) => window.__spoken.length > n, quiet);
    assert.equal((await spoken())[quiet], spokenForm(page.blocks[2].title), "the button still reads the task");
    await p.reload();
    await p.getByRole("button", { name: /^Продолжить занятие/ }).click();
    await p.waitForTimeout(600);
    assert.equal((await spoken()).length, 0, "the setting survives a reload");
    report.checks.push({ step: 3, manualOnly: true, persisted: true });
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/narration-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS narration: ${report.checks.length} checks`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
