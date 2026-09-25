/** A mobile tutorial must reveal its target without covering it or moving the card mid-gesture. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const browser = await chromium.launch();
  const report = { passed: false, checks: [] };
  try {
    const { pages } = await import("../src/content/book.ts");
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
      { width: 800, height: 375 },
    ]) {
      const context = await newTestContext(browser, {
        viewport,
        isMobile: true,
        hasTouch: true,
      });
      const p = await context.newPage();
      await p.clock.install();
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      for (const id of [
        "p003-block02",
        "p004-block05",
        "p008-block01",
        "p003-block06",
      ]) {
        const page = pages.find((p) => p.blocks.some((b) => b.id === id));
        assert.ok(page, id);
        await p.goto(baseURL + "/metadata.json");
        await p.evaluate(
          ({ KEY, page, block }) =>
            localStorage.setItem(
              KEY,
              JSON.stringify({
                version: 1,
                contentRevision: 3,
                page,
                block,
                answers: {},
              }),
            ),
          {
            KEY,
            page: page.number,
            block: page.blocks.findIndex((b) => b.id === id),
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
          .click();
        for (let step = 0; step < 12; step++) {
          const modal = p.getByTestId("gesture-coach");
          await modal.waitFor();
          await p.clock.runFor(500);
          const heading = await modal.getByText(/^Смотри, как ·/).innerText();
          // Measuring and placing the card is asynchronous and slower on CI:
          // wait until the highlight exists and the card sits inside the viewport.
          let card = null,
            hole = null;
          for (let i = 0; i < 40; i++) {
            card = await p.getByTestId("coach-card").boundingBox();
            hole = await p.getByTestId("coach-highlight").boundingBox();
            if (
              hole &&
              card &&
              card.y >= 0 &&
              card.y + card.height <= viewport.height + 1
            )
              break;
            await p.clock.runFor(100);
            await p.waitForTimeout(25);
          }
          assert.ok(
            hole,
            `${id} ${heading}: target must be visible automatically`,
          );
          assert.ok(
            hole.x + hole.width <= card.x + 1 ||
              hole.x >= card.x + card.width - 1 ||
              hole.y + hole.height <= card.y + 1 ||
              hole.y >= card.y + card.height - 1,
            `${viewport.width} ${id} ${heading}: card covers target ${JSON.stringify({ card, hole })}`,
          );
          assert.equal(
            await p.getByTestId("coach-offscreen-help").count(),
            0,
            `${id}: should not need a second reveal action`,
          );
          assert.ok(card.y >= 0 && card.y + card.height <= viewport.height + 1);
          const instruction = p.getByTestId("coach-instruction");
          assert.ok(
            Number(
              await instruction.evaluate((e) =>
                getComputedStyle(e).fontSize.replace("px", ""),
              ),
            ) >= 17,
          );
          const next = modal.getByRole("button", {
            name: /^(Дальше|Попробую сам)$/,
          });
          const nb = await next.boundingBox();
          assert.ok(
            nb.y >= card.y && nb.y + nb.height <= card.y + card.height + 1,
            "next action always visible",
          );
          // Check during and after movement, not just the first frame.
          for (let tick = 0; tick < 3; tick++) {
            await p.clock.runFor(300);
            assert.deepEqual(
              await p.getByTestId("coach-card").boundingBox(),
              card,
              "card stays still during demonstration",
            );
          }
          if (step === 0)
            await p.screenshot({
              path: path.join(
                os.tmpdir(),
                `mobile-coach-${viewport.width}-${id}.png`,
              ),
            });
          if (step === 0 && viewport.width === 390 && id === "p003-block02") {
            await p.setViewportSize({ width: 844, height: 390 });
            // Re-measurement after rotation is asynchronous: wait for the
            // highlight to come back instead of a fixed slice of fake time.
            let rotatedHole = null;
            for (let i = 0; i < 40 && !rotatedHole; i++) {
              await p.clock.runFor(100);
              await p.waitForTimeout(25);
              rotatedHole = await p.getByTestId("coach-highlight").boundingBox();
            }
            const rotatedCard = await p.getByTestId("coach-card").boundingBox();
            assert.ok(
              rotatedHole &&
                (rotatedHole.x + rotatedHole.width <= rotatedCard.x + 1 ||
                  rotatedHole.x >= rotatedCard.x + rotatedCard.width - 1 ||
                  rotatedHole.y + rotatedHole.height <= rotatedCard.y + 1 ||
                  rotatedHole.y >= rotatedCard.y + rotatedCard.height - 1),
              "rotation keeps target clear",
            );
            await p.setViewportSize(viewport);
            await p.clock.runFor(700);
          }
          const last = (await next.innerText()) === "Попробую сам";
          await p.clock.runFor(30000);
          await next.click({ timeout: 30000 });
          if (last) {
            await modal.waitFor({ state: "hidden" });
            break;
          }
          await modal
            .getByText(heading, { exact: true })
            .waitFor({ state: "detached" });
        }
        assert.deepEqual(
          await p.evaluate(
            (KEY) => JSON.parse(localStorage.getItem(KEY)).answers,
            KEY,
          ),
          {},
        );
        report.checks.push({ viewport, id });
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    report.passed = true;
  } finally {
    fs.writeFileSync(
      "docs/mobile-coach-browser-result.json",
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
  console.log(
    `PASS mobile onboarding: ${report.checks.length} task/viewport combinations`,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
