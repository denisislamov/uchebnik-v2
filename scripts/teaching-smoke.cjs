const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1",
  COACH = "uchebnik:gesture-coach:v2";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const { countingTutorials } =
    await import("../src/content/countingTutorials.ts");
  const { taskTeaching } = await import("../src/lib/taskTeaching.ts");
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    const ctx = await newTestContext(browser, {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(18000);
    p.on("pageerror", (e) => report.errors.push(e.message));
    const button = (name) => p.getByRole("button", { name, exact: true });
    async function reveal() {
      if (await button("Показать это место").count()) {
        await button("Показать это место").click();
        await p.waitForTimeout(250);
      }
    }
    async function open(id, answers = {}) {
      const page = pages.find((p) => p.blocks.some((b) => b.id === id));
      await p.goto(baseURL + "/metadata.json");
      await p.evaluate(
        ({ KEY, page, block, answers }) =>
          localStorage.setItem(
            KEY,
            JSON.stringify({
              version: 1,
              contentRevision: 3,
              page,
              block,
              answers,
            }),
          ),
        {
          KEY,
          page: page.number,
          block: page.blocks.findIndex((b) => b.id === id),
          answers,
        },
      );
      await p.goto(baseURL);
      await p
        .getByRole("button", {
          name: /^(Продолжить занятие|Начать заниматься)/,
        })
        .click();
      await p
        .getByRole("button", { name: "Как это сделать?", exact: true })
        .waitFor({ state: "attached" });
    }
    const answers = () =>
      p.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).answers, KEY);
    async function next() {
      await p.getByTestId("gesture-coach").waitFor();
      const heading = p.getByText(/^Смотри, как ·/);
      const previousHeading = await heading.innerText();
      const [, currentStep, totalSteps] =
        previousHeading.match(/(\d+)\/(\d+)$/);
      const last = currentStep === totalSteps;
      const action = last ? button("Попробую сам") : button("Дальше");
      await action.click();
      if (last)
        await p.getByTestId("gesture-coach").waitFor({ state: "hidden" });
      else {
        await p
          .getByText(previousHeading, { exact: true })
          .waitFor({ state: "detached" });
        await p
          .getByTestId("gesture-coach")
          .getByRole("button", { name: /^(Дальше|Попробую сам)$/ })
          .waitFor();
      }
      return !!last;
    }
    async function finish() {
      for (let i = 0; i < 40; i++) {
        if (await next()) return;
      }
      throw Error("Tutorial never ends");
    }
    async function advanceTo(kind) {
      for (let i = 0; i < 30; i++) {
        const state = await p.waitForFunction(() => {
          const root = document.querySelector('[data-testid="gesture-coach"]');
          if (
            !root ||
            root.closest('[aria-hidden="true"]') ||
            !root.getBoundingClientRect().height
          )
            return false;
          const action = [
            ...root.querySelectorAll('button,[role="button"]'),
          ].find((b) => /^(Дальше|Попробую сам)$/.test(b.textContent));
          if (!action) return false;
          return {
            motion:
              root
                .querySelector('[data-testid^="coach-motion-"]')
                ?.getAttribute("data-testid") ?? null,
          };
        });
        if ((await state.jsonValue()).motion === `coach-motion-${kind}`) return;
        if (await next()) throw Error("Missing demonstration " + kind);
      }
      throw Error("Missing demo");
    }
    const tip = async () => {
      await reveal();
      await p.getByTestId("coach-finger").waitFor();
      const r = await p.getByTestId("coach-finger").boundingBox();
      assert.ok(r, "finger is visible");
      return { x: r.x + 9, y: r.y + 3 };
    };
    async function withinCard() {
      const r = await p.getByTestId("coach-card").boundingBox();
      assert.ok(
        r.x >= 0 &&
          r.y >= 0 &&
          r.x + r.width <= p.viewportSize().width + 1 &&
          r.y + r.height <= p.viewportSize().height + 1,
        `card must stay inside ${JSON.stringify(p.viewportSize())}: ${JSON.stringify(r)}`,
      );
    }

    await open("p004-block02");
    await button("Как это сделать?").click();
    await p.getByTestId("coach-motion-count").waitFor();
    await reveal();
    const positions = [];
    const scene = countingTutorials["p004-block02"];
    for (let i = 0; i < 10; i++) {
      await p
        .getByTestId("coach-demonstration-status")
        .filter({ hasText: new RegExp(`^${i + 1} из 10`) })
        .waitFor();
      await p.waitForTimeout(330);
      const point = await tip(),
        box = await (
          (await p.getByTestId("coach-demo-surface").count())
            ? p.getByTestId("coach-demo-surface")
            : p.getByTestId(`book-image-${scene.imageId}`)
        ).boundingBox(),
        o = scene.objects[i];
      const expected = {
        x: box.x + (o.x + o.w * 0.5) * box.width,
        y: box.y + (o.y + o.h * 0.85) * box.height,
      };
      assert.ok(
        Math.hypot(point.x - expected.x, point.y - expected.y) < 3,
        `child ${i + 1} pointer must match source object`,
      );
      positions.push(point);
      if (i === 0 || i === 7)
        await p.screenshot({ path: `docs/teaching-children-${i + 1}.png` });
    }
    await button("Показать ещё раз").waitFor();
    assert.ok(
      Math.hypot(
        (await tip()).x - positions[9].x,
        (await tip()).y - positions[9].y,
      ) < 3,
      "finger stays on tenth child",
    );
    await finish();
    assert.deepEqual(await answers(), {});
    await button("Ответ 10").click();
    await p.getByText(/✓ Верно!/).waitFor();
    await open("p004-block02", await answers());
    await p.waitForTimeout(550);
    assert.equal(
      await p.getByTestId("gesture-coach").count(),
      0,
      "a solved task never reopens coaching by itself",
    );
    await open("p004-block03");
    await p.waitForTimeout(550);
    assert.equal(
      await p.getByTestId("gesture-coach").count(),
      0,
      "coaching never opens by itself",
    );
    await button("Как это сделать?").click();
    await p.getByTestId("coach-motion-count").waitFor();
    await button("Пауза").click();
    const frozen = await tip();
    await p.waitForTimeout(400);
    assert.deepEqual(await tip(), frozen);
    await button("Продолжить показ").click();
    await finish();
    report.checks.push(
      "counts all ten actual children in order; correct tip, pause, replay, no answer mutation, same-type persistence",
    );

    for (const id of ["p003-block02", "p003-block04", "p007-block08"]) {
      await open(id);
      await button("Как это сделать?").click();
      await p.getByTestId("gesture-coach").waitFor();
      await withinCard();
      await finish();
      assert.deepEqual(await answers(), {});
      const family = taskTeaching(
        pages.flatMap((p) => p.blocks).find((b) => b.id === id),
      ).family;
      await p.waitForFunction(
        ({ COACH, family }) =>
          JSON.parse(localStorage.getItem(COACH) || "[]").includes(
            "task:" + family,
          ),
        { COACH, family },
      );
    }
    report.checks.push(
      "size, length and finding a digit are distinct first-use tutorials after picture gesture already learned",
    );

    await open("p004-block05");
    await button("Как это сделать?").click();
    await p.getByTestId("gesture-coach").waitFor();
    await advanceTo("drag");
    const start = await tip();
    await p.waitForTimeout(1450);
    const middle = await tip();
    assert.ok(
      Math.hypot(start.x - middle.x, start.y - middle.y) > 25,
      "drag must move visibly",
    );
    await p.screenshot({ path: "docs/teaching-drag-mobile.png" });
    await finish();
    assert.deepEqual(await answers(), {});
    report.checks.push(
      "drag shows hold/move/release between source and target without entering answer",
    );

    await open("p003-block06");
    await button("Как это сделать?").click();
    await p.getByTestId("gesture-coach").waitFor();
    await advanceTo("trace");
    const a = await tip();
    await p.waitForTimeout(2200);
    const b = await tip();
    assert.ok(
      Math.hypot(a.x - b.x, a.y - b.y) > 12,
      JSON.stringify({
        a,
        b,
        trail: await p
          .getByTestId("coach-demonstration-line")
          .getAttribute("d"),
      }),
    );
    assert.equal(await p.getByTestId("coach-demonstration-line").count(), 1);
    await p.screenshot({ path: "docs/teaching-trace-mobile.png" });
    await finish();
    assert.deepEqual(await answers(), {});
    report.checks.push(
      "finger follows real copybook trace; demonstrated ink never becomes accepted child stroke",
    );

    // New conceptual types with concrete worked examples, even though the input gesture is familiar.
    const examples = pages
      .flatMap((p) => p.blocks)
      .filter((b) =>
        ["work", "story", "numberGame", "recipe", "location"].includes(b.kind),
      );
    for (const kind of ["work", "story", "numberGame", "recipe", "location"]) {
      const block = examples.find((b) => b.kind === kind);
      assert.ok(block);
      await open(block.id);
      await button("Как это сделать?").click();
      await p.getByTestId("gesture-coach").waitFor();
      await withinCard();
      assert.ok(
        (await p.getByTestId("coach-instruction").innerText()).length > 20,
      );
      await finish();
      assert.deepEqual(await answers(), {});
    }
    report.checks.push(
      "first arithmetic, story, number-game, recipe and location types have explanatory steps and preserve empty answers",
    );

    // A worked example with a missing number draws an empty box, never the □ glyph.
    const withBlank = pages
      .flatMap((p) => p.blocks)
      .find((b) =>
        taskTeaching(b).steps.some((s) => s.example?.expression?.includes("□")),
      );
    assert.ok(withBlank, "some task teaches with a blank in its example");
    await open(withBlank.id);
    await button("Как это сделать?").click();
    for (let i = 0; i < 30 && !(await p.getByTestId("blank-box").count()); i++)
      if (await next()) throw Error("no example with a blank reached");
    assert.ok(await p.getByTestId("blank-box").count());
    assert.equal(
      await p.getByTestId("gesture-coach").evaluate((e) => e.innerText.includes("□")),
      false,
    );
    await p.getByRole("button", { name: "Закрыть подсказку", exact: true }).click();
    report.checks.push("a blank in a worked example is an empty box");

    // Explicit replay remains visible in a short landscape window; every drag endpoint stays outside the card.
    await p.setViewportSize({ width: 800, height: 375 });
    await open("p004-block05");
    await button("Как это сделать?").click();
    await advanceTo("drag");
    await withinCard();
    for (let i = 0; i < 5; i++) {
      const point = await tip(),
        card = await p.getByTestId("coach-card").boundingBox();
      assert.ok(
        (point.x < card.x ||
          point.x > card.x + card.width ||
          point.y < card.y ||
          point.y > card.y + card.height) &&
          point.y >= 0 &&
          point.y < 375,
      );
      await p.waitForTimeout(400);
    }
    await tip();
    await p.screenshot({ path: "docs/teaching-drag-landscape.png" });
    await finish();
    assert.deepEqual(await answers(), {});
    report.checks.push(
      "short landscape keeps the complete demonstration visible beside the card",
    );
    await open("p004-block02");
    await button("Как это сделать?").click();
    await advanceTo("tap");
    const preview = p.getByTestId("coach-demo-surface");
    const answerBox = (await preview.count())
      ? await preview
          .locator("text")
          .filter({ hasText: /^10$/ })
          .evaluate((e) => {
            const r = e.previousElementSibling.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          })
      : await button("Ответ 10").boundingBox();
    const answerTip = await tip(),
      answerCard = await p.getByTestId("coach-card").boundingBox();
    assert.ok(
      Math.hypot(
        answerTip.x - (answerBox.x + answerBox.width / 2),
        answerTip.y - (answerBox.y + answerBox.height / 2),
      ) < 3,
    );
    assert.ok(
      (answerTip.x < answerCard.x ||
        answerTip.x > answerCard.x + answerCard.width ||
        answerTip.y < answerCard.y ||
        answerTip.y > answerCard.y + answerCard.height) &&
        answerTip.y < 375,
    );
    await p.screenshot({ path: "docs/teaching-answer-landscape.png" });
    await finish();
    assert.deepEqual(await answers(), {});
    report.checks.push(
      "counting answer tap stays visible outside card in landscape; demonstration never selects the answer",
    );
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync(
      "docs/teaching-browser-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
  console.log("PASS teaching: " + report.checks.length + " scenario groups");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
