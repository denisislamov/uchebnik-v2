/** Audit every illustrated step; keep evidence out of existing course reports. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const {
  baseURL,
  newTestContext,
  openBook,
  openStep,
  stepShown,
} = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
const out =
  process.env.ILLUSTRATION_REPORT || "/tmp/illustration-size-audit.json";
(async () => {
  const { lessonPages: pages } = await import("../src/content/book.ts");
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, views: [], errors: [] };
  try {
    const viewports =
      process.env.ILLUSTRATION_FOCUS === "short-fields"
        ? [{ width: 844, height: 390 }]
        : process.env.ILLUSTRATION_FOCUS === "fields"
          ? [
              { width: 1280, height: 1000 },
              { width: 1180, height: 820 },
              { width: 844, height: 390 },
            ]
          : process.env.ILLUSTRATION_FOCUS
            ? [
                { width: 1341, height: 1100 },
                { width: 1180, height: 820 },
                { width: 844, height: 390 },
                { width: 390, height: 844 },
                { width: 820, height: 1180 },
              ]
            : [
                { width: 1280, height: 1000 },
                { width: 1180, height: 820 },
                { width: 820, height: 1180 },
              ];
    const jobs = viewports.flatMap((viewport) =>
      (process.env.ILLUSTRATION_FOCUS ? [0] : [0, 1]).map((shard) => ({
        viewport,
        shard,
      })),
    );
    const outcomes = await Promise.allSettled(
      jobs.map(async ({ viewport, shard }) => {
        const ctx = await newTestContext(browser, {
          viewport,
          hasTouch: viewport.width < 1200,
        });
        const p = await ctx.newPage();
        p.on("pageerror", (e) => report.errors.push(e.message));
        const view = { viewport, blocks: [] };
        report.views.push(view);
        for (const pg of pages.filter(
          (pg) =>
            pg.blocks.some((b) => b.images.length) &&
            (process.env.ILLUSTRATION_FOCUS || pg.number % 2 === shard),
        )) {
          const selected = process.env.ILLUSTRATION_FOCUS;
          const focusIds = [
            "p004-block06",
            "p003-block06",
            "p007-block10",
            "p008-block06",
            "p012-lesson05",
            "p012-lesson02",
            "p022-lesson03",
            "p003-block02",
            "p006-block02",
            "p011-lesson01",
            "p059-source03",
            "p031-source-art",
          ];
          const steps = pg.blocks
            .map((b, i) => ({ b, i }))
            .filter(
              ({ b }) =>
                b.images.length &&
                (!selected ||
                  (selected.endsWith("fields")
                    ? ["draw", "counters", "shape", "practical"].includes(
                        b.kind,
                      )
                    : selected === "river"
                      ? b.id === "p004-block06"
                      : focusIds.includes(b.id))),
            );
          if (!steps.length) continue;
          await p.goto(baseURL + "/metadata.json");
          await p.evaluate(
            ({ KEY, n, i }) =>
              localStorage.setItem(
                KEY,
                JSON.stringify({
                  version: 1,
                  contentRevision: 7,
                  page: n,
                  block: i,
                  answers: {},
                }),
              ),
            { KEY, n: pg.number, i: steps[0].i },
          );
          await p.goto(baseURL);
          await openBook(p);
          await p
            .getByRole("button", {
              name: /^(Продолжить занятие|Начать заниматься)/,
            })
            .click();
          await stepShown(p);
          for (const [index, { b, i }] of steps.entries()) {
            if (index) await openStep(p, `Шаг ${i + 1}: ${b.title}`);
            // Wait for the fitter's final image-load pass, then measure the settled artwork.
            await p.waitForTimeout(1150);
            assert.equal(
              await p.getByTestId("block-title").innerText(),
              b.title,
              `${b.id}: correct step opened`,
            );
            const pictures = await p
              .getByTestId("exercise-body")
              .evaluate((el) => {
                const frames = [
                  ...el.querySelectorAll(
                    '[data-testid^="book-image-"],[aria-label="Рисунок задания"],[data-testid^="meaning-"],[data-testid="modern-counting-card"]',
                  ),
                ];
                return frames.map((e) => {
                  const r = e.getBoundingClientRect(),
                    img = e.querySelector("img");
                  return {
                    id:
                      e.getAttribute("data-testid") ||
                      e.getAttribute("aria-label"),
                    width: r.width,
                    height: r.height,
                    aspect: img?.naturalWidth / img?.naturalHeight || null,
                    loaded: !img || (img.complete && img.naturalWidth > 0),
                  };
                });
              });
            assert.ok(pictures.length, `${b.id}: illustration rendered`);
            assert.ok(
              pictures.every((r) => r.loaded && r.width > 0 && r.height > 0),
              `${b.id}: artwork loaded and visible`,
            );
            if (
              viewport.width > viewport.height &&
              ["draw", "counters", "shape", "practical"].includes(b.kind) &&
              pictures.length === 1
            ) {
              assert.ok(
                Math.max(pictures[0].width, pictures[0].height) >= 240,
                `${b.id}: a landscape sample must have a long edge of at least 240px`,
              );
            }
            if (
              viewport.width > viewport.height &&
              ["draw", "counters", "shape", "practical"].includes(b.kind) &&
              pictures.length > 1
            ) {
              assert.ok(
                pictures.every((p) => Math.max(p.width, p.height) >= 144),
                `${b.id}: each landscape sample has a long edge of at least 144px`,
              );
            }
            const overflow = await p.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            );
            assert.equal(overflow, false, `${b.id}: no horizontal overflow`);
            view.blocks.push({ id: b.id, kind: b.kind, pictures });
            if (b.id === "p004-block06") {
              await p.screenshot({
                path: `/tmp/illustration-river-${viewport.width}x${viewport.height}.png`,
              });
              const picture = pictures.find(
                (r) => r.id === "book-image-p004_boys_river_bathing",
              );
              assert.ok(picture, "river scene exists");
              if (viewport.width > viewport.height)
                assert.ok(
                  picture.height >= 240,
                  `river scene in landscape must be at least 240px high; got ${picture.height}`,
                );
              if (viewport.width === 390) {
                assert.equal(
                  picture.width,
                  336,
                  "phone portrait width unchanged",
                );
                assert.equal(
                  picture.height,
                  240,
                  "phone portrait height unchanged",
                );
              }
              if (viewport.width === 820) {
                assert.equal(
                  picture.width,
                  192,
                  "tablet portrait width unchanged",
                );
                assert.equal(
                  picture.height,
                  144,
                  "tablet portrait height unchanged",
                );
              }
              if (viewport.width === 844) {
                const art = p.getByTestId("book-image-p004_boys_river_bathing");
                await art.scrollIntoViewIfNeeded();
                const scene = await art.boundingBox(),
                  pane = await p
                    .getByTestId("lesson-scroll-pane")
                    .boundingBox();
                assert.ok(
                  scene.y >= pane.y - 1 &&
                    scene.y + scene.height <= pane.y + pane.height + 1,
                  "the entire large scene can be seen by scrolling",
                );
                const supply = p.getByRole("button", {
                  name: "Возьми кружок",
                  exact: true,
                });
                await supply.scrollIntoViewIfNeeded();
                await supply.click();
                const drop = p.getByRole("button", {
                  name: "Положить на поле",
                  exact: true,
                });
                await drop.scrollIntoViewIfNeeded();
                await drop.click();
                await p.getByTestId("token-0").waitFor();
              }
            }
          }
          if (pg.number % 20 === 0)
            console.log(`Illustrations ${viewport.width}: page ${pg.number}`);
        }
        await ctx.close();
      }),
    );
    for (const outcome of outcomes)
      if (outcome.status === "rejected")
        report.errors.push(String(outcome.reason));
    report.views = viewports.map((viewport) => ({
      viewport,
      blocks: report.views
        .filter(
          (v) =>
            v.viewport.width === viewport.width &&
            v.viewport.height === viewport.height,
        )
        .flatMap((v) => v.blocks)
        .sort((a, b) => a.id.localeCompare(b.id)),
    }));
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
    await browser.close();
  }
  console.log(
    `PASS illustration sizes: ${report.views.map((v) => `${v.viewport.width}×${v.viewport.height}: ${v.blocks.length} steps`).join(", ")}`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
