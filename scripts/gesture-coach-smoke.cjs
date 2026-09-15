const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1",
  COACH = "uchebnik:gesture-coach:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, cases: [], errors: [] };
  try {
    for (const width of [390, 1280]) {
      const context = await newTestContext(browser, {
        viewport: { width, height: 844 },
        hasTouch: true,
        freshTutorials: true,
      });
      const p = await context.newPage();
      p.setDefaultTimeout(8000);
      p.on("pageerror", (e) => report.errors.push(e.message));
      const button = (name) => p.getByRole("button", { name, exact: true });
      async function open(id, answers = {}) {
        const source = pages.find((page) =>
          page.blocks.some((b) => b.id === id),
        );
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
            page: source.number,
            block: source.blocks.findIndex((b) => b.id === id),
            answers,
          },
        );
        await p.goto(baseURL);
        await button("Продолжить занятие  →").click();
      }
      async function spotlight(target) {
        await p.getByTestId("gesture-coach").waitFor();
        await p.waitForTimeout(250);
        const hole = await p.getByTestId("coach-highlight").boundingBox(),
          box = await target.boundingBox(),
          card = await p.getByTestId("coach-card").boundingBox();
        assert.ok(hole.width >= 48 && hole.height >= 48);
        assert.ok(
          hole.x < box.x + box.width &&
            hole.x + hole.width > box.x &&
            hole.y < box.y + box.height &&
            hole.y + hole.height > box.y,
          "spotlight must overlap actual target",
        );
        assert.ok(
          hole.y + hole.height <= card.y,
          "card must not hide highlighted target",
        );
        assert.ok(
          card.x >= 0 &&
            card.x + card.width <= p.viewportSize().width + 1 &&
            card.y >= 0 &&
            card.y + card.height <= p.viewportSize().height,
        );
        assert.equal(await p.getByTestId("coach-finger").count(), 1);
      }
      async function finish(count) {
        for (let i = 1; i < count; i++) {
          await button("Дальше").click();
          await p.getByTestId("gesture-coach").waitFor();
        }
        await button("Попробую").click();
        await p.getByTestId("gesture-coach").waitFor({ state: "hidden" });
      }
      await open("p005-block03");
      await spotlight(p.getByTestId("token-source"));
      assert.equal(await p.getByText(/ЗАПАС|в запасе/).count(), 0);
      const before = await p.evaluate((KEY) => localStorage.getItem(KEY), KEY);
      const source = await p.getByTestId("token-source").boundingBox();
      await p.mouse.click(
        source.x + source.width / 2,
        source.y + source.height / 2,
      );
      assert.equal(
        await p.evaluate((KEY) => localStorage.getItem(KEY), KEY),
        before,
        "overlay must block underlying answer edits",
      );
      await button("Дальше").click();
      await spotlight(p.getByTestId("token-dropzone"));
      await p.screenshot({ path: `docs/coach-place-${width}.png` });
      await finish(1);
      await p.waitForFunction(
        (COACH) =>
          JSON.parse(localStorage.getItem(COACH) || "[]").includes("place"),
        COACH,
      );
      await p.reload();
      await button("Продолжить занятие  →").click();
      await button("Покажи, как").waitFor();
      await p.waitForTimeout(400);
      assert.equal(
        await p.getByTestId("gesture-coach").count(),
        0,
        "completed family must not auto-repeat",
      );
      await button("Покажи, как").click();
      await spotlight(p.getByTestId("token-source"));
      await finish(2);
      // Complete the actual task by dragging, without seeding its answer.
      const drag = async () => {
        const from = p.getByTestId("token-source"),
          to = p.getByTestId("token-dropzone");
        await from.scrollIntoViewIfNeeded();
        const a = await from.boundingBox(),
          b = await to.boundingBox();
        const x = a.x + a.width / 2,
          y = a.y + a.height / 2,
          tx = b.x + b.width / 2,
          ty = b.y + b.height / 2;
        const session = await context.newCDPSession(p);
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x, y }],
        });
        for (let i = 1; i <= 20; i++)
          await session.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              { x: x + ((tx - x) * i) / 20, y: y + ((ty - y) * i) / 20 },
            ],
          });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await session.detach();
      };
      for (let i = 1; i <= 8; i++) {
        await drag();
        await p.getByText(`На поле: ${i}`, { exact: true }).waitFor();
        if (i === 7) {
          await button("Проверить ответ").click();
          await p.getByText(/Пока не совпало/).waitFor();
        }
      }
      await button("Проверить ответ").click();
      await p.getByText(/✓ Верно!/).waitFor();
      const samples = [
        ["p004-block08", "trace", "Поле для рисования", 1],
        [
          "p004-block09",
          "dot",
          "Поле для рисования",
          1,
          {
            "p004-block09": {
              strokes: [
                {
                  color: pages[3].blocks.find((b) => b.id === "p004-block09")
                    .trace.stages[0][0].color,
                  points: pages[3].blocks.find((b) => b.id === "p004-block09")
                    .trace.stages[0][0].points,
                },
              ],
            },
          },
        ],
        [
          pages.flatMap((page) => page.blocks).find((b) => b.kind === "shape")
            .id,
          "sticks",
          "stick-board",
          2,
        ],
        [
          pages
            .filter((page) => page.number > 3)
            .flatMap((page) => page.blocks)
            .find((b) => b.kind === "picture").id,
          "picture",
          "Рисунок задания",
          1,
        ],
        [
          pages
            .flatMap((page) => page.blocks)
            .find((b) => b.kind === "practical" && b.steps[0].mode === "cards")
            .id,
          "cards",
          "digit-cards",
          2,
        ],
      ];
      for (const [id, family, targetName, steps, answers] of samples) {
        await open(id, answers);
        await p.getByTestId("gesture-coach").waitFor();
        if (family === "trace") {
          await spotlight(p.getByLabel(targetName, { exact: true }));
          await p.screenshot({ path: `docs/coach-trace-${width}.png` });
        }
        await finish(steps);
        await p.waitForFunction(
          ({ COACH, family }) =>
            JSON.parse(localStorage.getItem(COACH) || "[]").includes(family),
          { COACH, family },
        );
      }
      report.cases.push({
        width,
        firstUse: true,
        replay: true,
        persisted: true,
        blocksUnderlyingTouches: true,
        tomatoes: { sevenRejected: true, eightAccepted: true },
        families: ["place", ...samples.map((x) => x[1])],
      });
      if (width === 390) {
        await p.goto(baseURL + "/metadata.json");
        await p.evaluate((COACH) => localStorage.removeItem(COACH), COACH);
        const shape = pages
          .flatMap((page) => page.blocks)
          .find((b) => b.kind === "shape");
        await open(shape.id, {
          [shape.id]: {
            value: shape.edges.map(([a, b]) =>
              [a, b].sort((x, y) => x - y).join("-"),
            ),
            checked: true,
          },
        });
        await p.getByTestId("gesture-coach").waitFor();
        await button("Попробую").click();
        assert.equal(
          await p.evaluate(
            (COACH) =>
              JSON.parse(localStorage.getItem(COACH) || "[]").includes(
                "sticks",
              ),
            COACH,
          ),
          false,
          "missing source cannot count as completed tutorial",
        );
        await p.setViewportSize({ width: 800, height: 375 });
        await open("p005-block03");
        await spotlight(p.getByTestId("token-source"));
        await p.screenshot({ path: "docs/coach-short-window.png" });
        await finish(2);
        report.shortWindow = true;
        report.missingSourceNotPersisted = true;
      }
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync(
      "docs/gesture-coach-browser-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
  console.log(
    "PASS: first-use/replay/persisted coaching, real touch placement and eight tomatoes at 390/1280px",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
