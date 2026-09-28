/**
 * One task on a screen, and the same frame around every task.
 *
 *  - Nothing but the task shares the screen with it: no list of other pages, no link to the scan, no row
 *    of step squares that look like answers. The steps and the page in the book are a press away.
 *  - The way out and the help stand over the task, «Назад» and «Дальше» under the sheet — in the same
 *    place on every step, and always in view.
 *  - What a finger aims at is large and stands apart: answers three cells by three and a cell apart,
 *    navigation 64 px high, nothing pressed smaller than 48 px.
 *  - A page ends with a word about it and a choice: go on or stop. Stopping keeps the progress.
 *  - The adults' part opens after a question a child does not answer.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext, openStep } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
const words = {
  двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90,
  один: 1, два: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9,
};
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const lesson = pages.find((p) => p.number >= 3 && p.number < 142 && p.blocks.at(-1).kind === "number" && p.blocks.length > 2);
  const last = lesson.blocks.length - 1;
  const numberStep = pages.find((p) => p.number === 4);
  const numberIndex = numberStep.blocks.findIndex((b) => b.kind === "number");
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 820, height: 1180 },
      { width: 1280, height: 800 },
    ]) {
      const ctx = await newTestContext(browser, { viewport, hasTouch: viewport.width < 1000 });
      const p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      const button = (name) => p.getByRole("button", { name, exact: true });
      const open = async (n, i, answers = {}) => {
        await p.goto(baseURL + "/metadata.json");
        await p.evaluate(({ KEY, n, i, answers }) => localStorage.setItem(KEY, JSON.stringify({ version: 1, contentRevision: 5, page: n, block: i, answers })), { KEY, n, i, answers });
        await p.goto(baseURL);
        await p.getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ }).click();
        await p.getByTestId("exercise-card").waitFor();
        await p.waitForTimeout(700);
      };
      const frame = async () => {
        const box = async (l) => {
          const b = (await l.count()) ? await l.boundingBox() : null;
          return b && { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
        };
        return {
          home: await box(button("На главную")),
          steps: await box(p.getByRole("button", { name: /^Шаги страницы/ })),
          help: await box(button("Как это сделать?")),
          back: await box(button("← Назад")),
          next: await box(p.getByRole("button", { name: /^(Дальше|К страницам|Продолжить) →$/ })),
        };
      };
      // The same frame on every step of a page and on another page.
      await open(numberStep.number, numberIndex);
      const first = await frame();
      for (const [name, b] of Object.entries(first)) {
        assert.ok(b, `${viewport.width}: «${name}» is on the screen`);
        assert.ok(b.y >= 0 && b.y + b.height <= viewport.height, `${viewport.width}: «${name}» is in view`);
        assert.ok(b.height >= 48 && b.width >= 48, `${viewport.width}: «${name}» is ${b.width}×${b.height}`);
      }
      assert.ok(first.back.height >= 64 && first.next.height >= 64, `${viewport.width}: navigation is ${first.next.height} px high`);
      assert.ok(first.next.x - (first.back.x + first.back.width) >= 24, "«Назад» and «Дальше» stand apart");
      // Nothing else asks for a press.
      assert.equal(await p.getByText("Соседние страницы").count(), 0, "no list of other pages beside a task");
      assert.equal(await p.getByRole("button", { name: /^Открыть страницу/ }).count(), 0);
      assert.equal(await p.getByText(/Оригинал/).count(), 0, "the scan is not offered on the task's screen");
      assert.equal(await p.getByRole("button", { name: /^Шаг \d+:/ }).count(), 0, "no step squares among the answers");
      // Answers: large, apart, and away from the navigation.
      const answers = await p.getByRole("button", { name: /^Ответ \d+$/ }).evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })));
      assert.equal(answers.length, 11);
      for (const a of answers) assert.ok(a.width >= 72 && a.height >= 72, `${viewport.width}: an answer is ${a.width}×${a.height}`);
      for (const a of answers)
        for (const b of answers)
          if (a !== b) {
            const dx = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width)),
              dy = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height));
            assert.ok(Math.max(dx, dy) >= 24 - 0.5, `${viewport.width}: answers stand ${Math.max(dx, dy)} px apart`);
          }
      for (const other of [numberIndex + 1, 0]) {
        await openStep(p, `Шаг ${other + 1}: ${numberStep.blocks[other].title}`);
        await p.getByTestId("exercise-card").getByText(numberStep.blocks[other].title, { exact: true }).first().waitFor();
        await p.waitForTimeout(500);
        assert.deepEqual(await frame(), first, `${viewport.width}: the frame stays where it was on step ${other + 1}`);
      }
      await open(lesson.number, last);
      const onAnother = await frame();
      for (const name of ["home", "help", "back", "next"]) assert.deepEqual(onAnother[name], first[name], `${viewport.width}: «${name}» stands in the same place on another page`);
      report.checks.push({ viewport, frame: first, answer: answers[0] });

      // The steps and the page in the book: a press away, behind «Шаг … из …».
      await p.getByRole("button", { name: /^Шаги страницы/ }).click();
      const list = p.getByTestId("step-list");
      await list.waitFor();
      assert.equal(await list.getByRole("button", { name: /^Шаг \d+:/ }).count(), lesson.blocks.length);
      const rows = await list.getByRole("button", { name: /^Шаг \d+:/ }).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      assert.ok(Math.min(...rows) >= 48, "a step in the list is a fingertip high");
      await list.getByRole("button", { name: "Страница в книге", exact: true }).click();
      await p.getByText(`Оригинал · страница ${lesson.number}`, { exact: true }).waitFor();
      await list.waitFor({ state: "detached" });
      await button("Закрыть").click();

      // The end of a page: a word about it and a choice.
      const block = lesson.blocks[last];
      await button(`Ответ ${block.expected}`).click();
      await p.getByText(/^✓ Верно! /).waitFor();
      await button("Дальше →").click();
      const done = p.getByTestId("page-done");
      await done.waitFor();
      await done.getByText(new RegExp(`Страница ${lesson.number} — «`)).waitFor();
      await done.getByText("Продолжим или закончим на сегодня?", { exact: true }).waitFor();
      const end = await frame();
      assert.deepEqual(end.back, first.back, "«Назад» stays in its place at the end of a page");
      assert.deepEqual({ ...end.next, x: 0, width: 0 }, { ...first.next, x: 0, width: 0 }, "and «Продолжить» stands where «Дальше» stood");
      // «Назад» returns to the last step, solved as it was left.
      await button("← Назад").click();
      await p.getByTestId("exercise-card").getByText(block.title, { exact: true }).first().waitFor();
      await p.getByText(/^✓ Верно! /).waitFor();
      await button("Дальше →").click();
      await done.waitFor();
      // «Закончить»: home, and the next lesson starts on the next page.
      await button("Закончить").click();
      await button("Продолжить занятие  →").waitFor();
      const saved = await p.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)), KEY);
      assert.equal(saved.page, lesson.number + 1, "the next lesson starts on the next page");
      assert.equal(saved.block, 0);
      assert.equal(saved.answers[block.id].value, block.expected, "the answers are kept");
      // «Продолжить» goes on to the next page at once.
      await open(lesson.number, last, { [block.id]: { value: block.expected, checked: true } });
      await button("Дальше →").click();
      await done.waitFor();
      await button("Продолжить →").click();
      const nextPage = pages[lesson.number];
      await p.getByTestId("exercise-card").getByText(nextPage.blocks[0].title, { exact: true }).first().waitFor();
      report.checks.push({ viewport, pageEnd: lesson.number });

      // The adults' part.
      await button("На главную").click();
      await button("Информация для родителей").click();
      const gate = p.getByTestId("adult-gate");
      await gate.waitFor();
      assert.equal(await p.getByText("Учимся вместе", { exact: true }).count(), 0, "the adults' part is closed");
      assert.equal(await p.getByRole("button", { name: /Начать заново/ }).count(), 0);
      const ask = async () => (await p.getByTestId("adult-gate-question").innerText()).trim();
      const type = async (n) => {
        for (const d of String(n)) await button(`Цифра ${d}`).click();
      };
      const answer = (q) => q.split(" ").reduce((sum, w) => sum + words[w], 0);
      const question = await ask();
      const wrong = answer(question) === 21 ? 22 : 21;
      await type(wrong);
      await gate.getByText("Не то число. Вот другое.", { exact: true }).waitFor();
      assert.equal(await p.getByText("Учимся вместе", { exact: true }).count(), 0, "a wrong number keeps it closed");
      await type(answer(await ask()));
      await p.getByText("Учимся вместе", { exact: true }).waitFor();
      await p.getByRole("button", { name: /Начать заново/ }).waitFor();
      await button("Вернуться к учебнику").click();
      // Asked for again every time.
      await button("Информация для родителей").click();
      await gate.waitFor();
      report.checks.push({ viewport, adultGate: question });
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync("docs/lesson-frame-browser-result.json", JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(`PASS lesson frame: ${report.checks.length} checks on 3 screens`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
