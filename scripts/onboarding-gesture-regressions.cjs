const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";

(async () => {
  const { pages } = await import("../src/content/book.ts");
  const { containsPoint, pickTarget } =
    await import("../src/lib/hitTesting.ts");
  const report = {
    passed: false,
    baseURL,
    checks: [],
    errors: [],
    limitations: [
      "Chromium only; native-device measurement and touch acceptance not run.",
    ],
  };
  const browser = await chromium.launch({ headless: true });
  const ctx = await newTestContext(browser, {
    viewport: { width: 390, height: 844 },
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(15000);
  p.on("pageerror", (e) => report.errors.push(e.message));
  const button = (name) => p.getByRole("button", { name, exact: true });
  async function reveal() {
    if (await button("Показать это место").count()) {
      await button("Показать это место").click();
      await p.waitForTimeout(250);
    }
  }
  const answers = () =>
    p.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).answers, KEY);
  const point = async () => {
    const r = await p.getByTestId("coach-finger").boundingBox();
    assert.ok(r, "visible demonstration finger");
    return { x: r.x + 9, y: r.y + 3 };
  };
  const near = (a, b, label) =>
    assert.ok(
      Math.hypot(a.x - b.x, a.y - b.y) < 3,
      `${label}: ${JSON.stringify({ a, b })}`,
    );
  async function open(id, seeded = {}) {
    const page = pages.find((page) => page.blocks.some((b) => b.id === id));
    await p.goto(baseURL + "/metadata.json");
    await p.evaluate(
      ({ KEY, number, block, seeded }) =>
        localStorage.setItem(
          KEY,
          JSON.stringify({
            version: 1,
            contentRevision: 3,
            page: number,
            block,
            answers: seeded,
          }),
        ),
      {
        KEY,
        number: page.number,
        block: page.blocks.findIndex((b) => b.id === id),
        seeded,
      },
    );
    await p.goto(baseURL);
    await p
      .getByRole("button", { name: /^(Продолжить занятие|Начать заниматься)/ })
      .click();
    await button("Покажи, как").waitFor();
  }
  async function replayDrag(scope = p) {
    await scope
      .getByRole("button", { name: "Покажи подсказку", exact: true })
      .click();
    await p.getByTestId("gesture-coach").waitFor();
    await button("Дальше").click();
    await p.getByTestId("coach-motion-drag").waitFor();
    await reveal();
    await button("Показать ещё раз").waitFor();
    await reveal();
  }
  async function drag(from, to) {
    await from.scrollIntoViewIfNeeded();
    const a = await from.boundingBox(),
      b = await to.boundingBox();
    assert.ok(a && b);
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await p.mouse.down();
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
    await p.mouse.up();
    await p.waitForTimeout(350);
  }
  async function check(name, action) {
    try {
      const evidence = await action();
      report.checks.push({ name, passed: true, evidence });
    } catch (e) {
      report.checks.push({ name, passed: false, error: e.stack });
    }
  }
  try {
    await check(
      "chair tutorial touches actual selectable chair polygons",
      async () => {
        await open("p008-block01");
        const before = await answers();
        const block = pages
          .flatMap((p) => p.blocks)
          .find((b) => b.id === "p008-block01");
        await button("Покажи подсказку").click();
        await button("Дальше").click();
        await p.getByTestId("coach-motion-count").waitFor();
        await reveal();
        const touches = [];
        for (let i = 0; i < 2; i++) {
          await p
            .getByTestId("coach-demonstration-status")
            .filter({ hasText: new RegExp(`^${i + 1} из 6`) })
            .waitFor();
          await p.waitForTimeout(350);
          const finger = await point();
          const surface = p.getByTestId("coach-demo-surface");
          const box = await (
            (await surface.count()) ? surface : button("Рисунок задания")
          ).boundingBox();
          const normalized = {
            x: (finger.x - box.x) / box.width,
            y: (finger.y - box.y) / box.height,
          };
          assert.ok(
            containsPoint(block.targets[i], normalized),
            `${block.targets[i].id} outside polygon`,
          );
          assert.equal(
            pickTarget(block.targets, normalized, box.width, box.height)?.id,
            block.targets[i].id,
          );
          touches.push({ target: block.targets[i].id, normalized });
        }
        await button("Закрыть подсказку").click();
        assert.deepEqual(
          await answers(),
          before,
          "demonstration must preserve answers",
        );
        for (const touch of touches) {
          const frame = button("Рисунок задания");
          await frame.scrollIntoViewIfNeeded();
          const box = await frame.boundingBox();
          await p.mouse.click(
            box.x + touch.normalized.x * box.width,
            box.y + touch.normalized.y * box.height,
          );
        }
        await p.getByText("Отмечено: 2", { exact: true }).waitFor();
        return {
          touches,
          actualAction: "two copied taps select both chairs",
          demonstrationMutatedAnswers: false,
        };
      },
    );
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 800, height: 390 },
    ]) {
      await check(
        `composition replay places the next adjacent square ${viewport.width}x${viewport.height}`,
        async () => {
          await p.setViewportSize(viewport);
          await open("p011-lesson02", {
            "p011-lesson02": {
              responses: { "0left": "1", "0right": "0" },
              checked: false,
            },
          });
          const board = p.getByTestId("composition-board");
          await board.getByTestId("composition-token-0-0").waitFor();
          const before = await answers();
          await replayDrag(board);
          const box = await board
            .getByTestId("composition-field")
            .boundingBox();
          const cell = Math.min(42, (box.width - 24) / 2);
          const expected = {
            x: box.x + (box.width - 2 * cell) / 2 + 0.5 * cell,
            y: box.y + 58 + cell / 2,
          };
          near(await point(), expected, "first part destination");
          await button("Закрыть подсказку").click();
          assert.deepEqual(await answers(), before);
          if (viewport.width === 390) {
            await drag(
              board.getByTestId("composition-source-0"),
              board.getByTestId("composition-field"),
            );
            await board.getByTestId("composition-token-0-1").waitFor();
          }
          return {
            seed: "one square in the first part",
            destination: 1,
            actualSecondSquarePlaced: viewport.width === 390,
            demonstrationMutatedAnswers: false,
          };
        },
      );
    }
    await check(
      "digit tutorial chooses 1 for tens then 4 for units after actual first placement",
      async () => {
        await p.setViewportSize({ width: 390, height: 844 });
        await open("p061-source01");
        const evidence = [];
        for (const [digit, index] of [
          [1, 0],
          [4, 1],
        ]) {
          const before = await answers();
          await replayDrag();
          assert.equal(
            await p.getByTestId("coach-token-label").textContent(),
            String(digit),
          );
          const surface = p.getByTestId("coach-demo-surface");
          let expected;
          if (await surface.count()) {
            const b = await surface.boundingBox();
            expected = {
              x: b.x + b.width * (index ? 0.6 : 0.4),
              y: b.y + b.height * 0.26,
            };
          } else {
            const b = await p.getByTestId(`digit-slot-${index}`).boundingBox();
            expected = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
          }
          near(await point(), expected, "correct digit place");
          await button("Закрыть подсказку").click();
          assert.deepEqual(await answers(), before);
          await drag(
            p.getByTestId(`digit-source-${digit}`),
            p.getByTestId(`digit-slot-${index}`),
          );
          assert.equal(
            await p.getByTestId(`digit-slot-${index}`).innerText(),
            String(digit),
          );
          evidence.push({
            digit,
            index,
            actualDragAccepted: true,
            demonstrationMutatedAnswers: false,
          });
        }
        return evidence;
      },
    );
    await check(
      "landscape shape ghost matches full destination stick and rotated replay explains recovery",
      async () => {
        await p.setViewportSize({ width: 800, height: 390 });
        await open("p008-block06");
        const before = await answers();
        await replayDrag();
        const geometry = await p
          .getByTestId("coach-motion-drag")
          .evaluate((root) => {
            const line = document.querySelector(
              '[data-testid="stick-board"] line',
            );
            const ghost = [
              ...root.querySelectorAll('rect[fill="#bb8052"]'),
            ].find((e) => e.hasAttribute("transform"));
            if (!line || !ghost) throw Error("missing shape line/ghost");
            const n = (e, k) => Number(e.getAttribute(k));
            return {
              x1: n(line, "x1"),
              y1: n(line, "y1"),
              x2: n(line, "x2"),
              y2: n(line, "y2"),
              ghostLength: n(ghost, "height"),
              transform: ghost.getAttribute("transform"),
            };
          });
        const length = Math.hypot(
          geometry.x2 - geometry.x1,
          geometry.y2 - geometry.y1,
        );
        const angle =
          (Math.atan2(geometry.y2 - geometry.y1, geometry.x2 - geometry.x1) *
            180) /
          Math.PI;
        const numbers = geometry.transform
          .match(/-?[\d.]+(?:e[-+]?\d+)?/g)
          .map(Number);
        const ghostAngle = geometry.transform.startsWith("matrix")
          ? (Math.atan2(numbers[1], numbers[0]) * 180) / Math.PI + 90
          : numbers[0] + 90;
        assert.ok(
          Math.abs(length - geometry.ghostLength) < 1,
          "full edge length",
        );
        assert.ok(
          Math.abs(((((ghostAngle - angle) % 180) + 270) % 180) - 90) < 0.5,
          "same edge angle",
        );
        const surface = await p.getByTestId("stick-board").boundingBox();
        near(
          await point(),
          {
            x: surface.x + (geometry.x1 + geometry.x2) / 2,
            y: surface.y + (geometry.y1 + geometry.y2) / 2,
          },
          "stick midpoint",
        );
        await button("Закрыть подсказку").click();
        assert.deepEqual(await answers(), before);
        await button("Повернуть палочку 1").click();
        await button("Покажи подсказку").click();
        await p.getByTestId("coach-instruction").waitFor();
        const instruction = await p
          .getByTestId("coach-instruction")
          .innerText();
        assert.match(instruction, /Повернуть.*3 раза/);
        await button("Закрыть подсказку").click();
        assert.deepEqual(await answers(), before);
        return {
          geometry,
          lineLength: length,
          lineAngle: angle,
          ghostAngle,
          rotationRecovery: instruction,
          demonstrationMutatedAnswers: false,
        };
      },
    );
    await check(
      "completed part replay never asks for a missing source",
      async () => {
        await p.setViewportSize({ width: 390, height: 844 });
        await open("p011-lesson02", {
          "p011-lesson02": {
            responses: { "0left": "2", "0right": "1" },
            checked: false,
          },
        });
        const board = p.getByTestId("composition-board");
        await board.getByTestId("composition-token-0-1").waitFor();
        const before = await answers();
        await board
          .getByRole("button", { name: "Покажи подсказку", exact: true })
          .click();
        await p.getByTestId("coach-instruction").waitFor();
        assert.match(
          await p.getByTestId("coach-instruction").innerText(),
          /Пересчитай каждый цвет/,
        );
        assert.equal(await p.getByTestId("coach-motion-drag").count(), 0);
        await button("Попробую сам").click();
        assert.deepEqual(await answers(), before);
        return {
          completeField: true,
          missingSourceDemonstration: false,
          demonstrationMutatedAnswers: false,
        };
      },
    );
    report.passed =
      report.checks.every((c) => c.passed) && report.errors.length === 0;
  } finally {
    fs.writeFileSync(
      "docs/onboarding-gestures-browser-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
