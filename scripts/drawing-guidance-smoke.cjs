/** Reproduce drawing retries at the page bottom, where disappearing feedback used to move the pad. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
const reportPath = "docs/drawing-guidance-browser-result.json";
const report = {
  status: "running",
  startedAt: new Date().toISOString(),
  mouse: [],
  outlines: [],
  touch: [],
  screenshots: [],
  errors: [],
};

function sameBounds(before, during, description) {
  // The pad must not jump; sub-pixel rounding of the pane scroll (≤ 1 px) is not a jump.
  for (const key of ["x", "y", "width", "height", "scrollTop", "scrollClient"])
    assert.ok(
      Math.abs(during[key] - before[key]) <= 1,
      `${description}: ${key} must stay fixed (${before[key]} → ${during[key]})`,
    );
}

async function metrics(page) {
  return page.evaluate(() => {
    const pad = document.querySelector('[aria-label="Поле для рисования"]');
    const box = pad.getBoundingClientRect();
    const scroll = document.querySelector('[data-testid="lesson-scroll-pane"]');
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      scrollTop: scroll.scrollTop,
      scrollClient: scroll.clientWidth,
      overflow: getComputedStyle(scroll).overflowY,
      gutter: getComputedStyle(scroll).scrollbarGutter,
    };
  });
}

async function drawingStarted(page) {
  // Wait for the responder state and browser layout, not an arbitrary delay.
  await page.waitForFunction(
    () =>
      getComputedStyle(
        document.querySelector('[data-testid="lesson-scroll-pane"]'),
      ).overflowY === "hidden",
  );
  await settle(page);
  assert.equal(
    await page.getByTestId("drawing-direction-arrow").count(),
    0,
    "guidance disappears while the child draws",
  );
}

async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

(async () => {
  const { pages } = await import("../src/content/book.ts");
  const source = pages.find((page) =>
    page.blocks.some((block) => block.id === "p004-block08"),
  );
  const block = source.blocks.find((block) => block.id === "p004-block08");
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_CHANNEL
      ? { channel: process.env.BROWSER_CHANNEL }
      : {}),
  });
  async function open(options, selected = block) {
    const selectedPage = pages.find((page) => page.blocks.includes(selected));
    const context = await newTestContext(browser, options);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => report.errors.push(error.message));
    await page.goto(baseURL + "/metadata.json");
    await page.evaluate(
      ({ KEY, number, index }) =>
        localStorage.setItem(
          KEY,
          JSON.stringify({
            version: 1,
            contentRevision: 3,
            page: number,
            block: index,
            answers: {},
          }),
        ),
      {
        KEY,
        number: selectedPage.number,
        index: selectedPage.blocks.indexOf(selected),
      },
    );
    await page.goto(baseURL);
    await page
      .getByRole("button", { name: "Продолжить занятие  →", exact: true })
      .click();
    const pad = page.getByLabel("Поле для рисования", { exact: true });
    await pad.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await settle(page);
    return { context, page, pad };
  }
  try {
    for (const width of [390, 760]) {
      const { context, page, pad } = await open({
        viewport: { width, height: 900 },
        hasTouch: true,
      });
      try {
        // Exercise a reserved scrollbar gutter even on hosts with overlay scrollbars.
        await page.addStyleTag({
          content:
            "::-webkit-scrollbar { width: 16px; height: 16px } ::-webkit-scrollbar-thumb { background: #777 }",
        });
        await pad.scrollIntoViewIfNeeded();
        await settle(page);
        const arrowBounds = await page
          .getByTestId("drawing-direction-arrow")
          .evaluateAll((elements) =>
            elements.map((element) => {
              const box = element.getBBox();
              return {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
              };
            }),
          );
        assert.equal(
          arrowBounds.length,
          2,
          "trunk has one arrow in each direction",
        );
        assert.ok(
          arrowBounds.every(
            (box) => box.height >= 8 && box.height <= 14 && box.width <= 7,
          ),
          "compact arrows leave the notebook drawing visible",
        );
        assert.ok(
          arrowBounds[0].x + arrowBounds[0].width < arrowBounds[1].x ||
            arrowBounds[1].x + arrowBounds[1].width < arrowBounds[0].x,
          "opposite arrows occupy separate lanes",
        );
        const screenshot = `docs/drawing-guidance-${width}.png`;
        await pad.screenshot({ path: screenshot });
        report.screenshots.push(screenshot);
        const before = await metrics(page);
        assert.equal(before.gutter, "stable");
        const cell = before.width / block.trace.columns;
        assert.ok(
          cell >= 44 - 0.5,
          `${width}px: a grid cell must stay a fingertip target, got ${cell.toFixed(1)} px`,
        );
        assert.ok(
          width < 600 || before.width <= width,
          `a wide screen keeps the sheet inside the viewport (${before.width} of ${width})`,
        );
        report.mouse.push({ width, cellPx: Math.round(cell * 10) / 10 });
        await page.mouse.move(
          before.x + before.width / 2,
          before.y + before.height / 4,
        );
        await page.mouse.down();
        await drawingStarted(page);
        const during = await metrics(page);
        sameBounds(before, during, `First pointer-down at ${width}px`);
        await page.mouse.up();
        await page.getByRole("alert").last().waitFor();
        await settle(page);
        const after = await metrics(page);
        sameBounds(before, after, `Pointer release at ${width}px`);
        await page
          .getByTestId("lesson-scroll-pane")
          .evaluate((element) => (element.scrollTop = element.scrollHeight));
        await settle(page);
        const retryBefore = await metrics(page);
        await page.mouse.move(
          retryBefore.x + retryBefore.width / 2,
          retryBefore.y + retryBefore.height / 2,
        );
        await page.mouse.down();
        await drawingStarted(page);
        const retryDuring = await metrics(page);
        sameBounds(retryBefore, retryDuring, `Retry at bottom at ${width}px`);
        await page.mouse.up();
        report.mouse.push({
          width,
          arrowBounds,
          before,
          during,
          after,
          retryBefore,
          retryDuring,
        });
      } finally {
        await context.close();
      }
    }
    for (const reverse of [false, true]) {
      const { context, page, pad } = await open({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      try {
        const session = await context.newCDPSession(page);
        let box = await pad.boundingBox();
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [
            { x: box.x + box.width * 0.3, y: box.y + box.height * 0.5 },
          ],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await page.getByRole("alert").last().waitFor();
        await page
          .getByTestId("lesson-scroll-pane")
          .evaluate((element) => (element.scrollTop = element.scrollHeight));
        await settle(page);
        const before = await metrics(page);
        box = await pad.boundingBox();
        const points = [...block.trace.stages[0][0].points];
        if (reverse) points.reverse();
        const a = {
          x: box.x + points[0].x * box.width,
          y: box.y + points[0].y * box.height,
        };
        const b = {
          x: box.x + points[1].x * box.width,
          y: box.y + points[1].y * box.height,
        };
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [a],
        });
        await drawingStarted(page);
        const during = await metrics(page);
        sameBounds(before, during, `Touch retry ${reverse ? "up" : "down"}`);
        for (let i = 1; i <= 30; i++)
          await session.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              {
                x: a.x + ((b.x - a.x) * i) / 30,
                y: a.y + ((b.y - a.y) * i) / 30,
              },
            ],
          });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await page.waitForFunction(
          ({ KEY, id }) =>
            JSON.parse(localStorage.getItem(KEY)).answers[id]?.strokes
              ?.length === 1,
          { KEY, id: block.id },
        );
        await session.detach();
        report.touch.push({
          width: 390,
          direction: reverse ? "up" : "down",
          before,
          during,
          acceptedStrokes: 1,
        });
      } finally {
        await context.close();
      }
    }
    for (const id of ["p003-block06", "p007-block09", "p008-block14"]) {
      const selected = pages
        .flatMap((page) => page.blocks)
        .find((item) => item.id === id);
      for (const width of [390, 1280]) {
        const { context, page, pad } = await open(
          { viewport: { width, height: 900 } },
          selected,
        );
        try {
          const arrows = page.getByTestId("drawing-direction-arrow");
          assert.equal(
            await arrows.count(),
            1,
            `${id} shows a single direction cue`,
          );
          const screenshot = `docs/drawing-guidance-${id}-${width}.png`;
          await pad.screenshot({ path: screenshot });
          report.screenshots.push(screenshot);
          const box = await pad.boundingBox();
          const points = selected.trace.stages[0][0].points;
          await page.mouse.move(
            box.x + points[0].x * box.width,
            box.y + points[0].y * box.height,
          );
          await page.mouse.down();
          await drawingStarted(page);
          for (const point of points.slice(1))
            await page.mouse.move(
              box.x + point.x * box.width,
              box.y + point.y * box.height,
              { steps: 8 },
            );
          await page.mouse.up();
          await page.waitForFunction(
            ({ KEY, id }) =>
              JSON.parse(localStorage.getItem(KEY)).answers[id]?.strokes
                ?.length === 1,
            { KEY, id },
          );
          report.outlines.push({ id, width, acceptedStrokes: 1 });
        } finally {
          await context.close();
        }
      }
    }
    assert.deepEqual(report.errors, [], "no browser runtime errors");
    report.status = "passed";
  } catch (error) {
    report.status = "failed";
    report.failure = error.stack || String(error);
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(
    `Drawing guidance: ${report.mouse.length} viewport checks, ${report.touch.length} touch directions, ${report.outlines.length} dash/digit checks passed; ${reportPath}`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
