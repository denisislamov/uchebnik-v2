const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { baseURL, newTestContext } = require("./browser-context.cjs");
const KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
(async () => {
  const { pages } = await import("../src/content/book.ts");
  const cases = [
    [11, 2, 2, 1],
    [13, 3, 2, 2],
    [15, 2, 4, 1],
    [19, 2, 4, 2],
    [23, 2, 4, 3],
    [25, 3, 7, 1],
    [27, 3, 8, 1],
    [29, 2, 5, 5],
  ];
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 800, height: 375 },
      { width: 1280, height: 900 },
    ]) {
      const ctx = await newTestContext(browser, { viewport, hasTouch: true }),
        p = await ctx.newPage();
      p.on("pageerror", (e) => report.errors.push(e.message));
      const btn = (name) => p.getByRole("button", { name, exact: true });
      async function open(id) {
        const page = pages.find((p) => p.blocks.some((b) => b.id === id));
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
        await p.getByTestId("composition-board").waitFor();
        assert.equal(await p.getByTestId("composition-field").count(), 1);
        assert.equal(await p.getByTestId("counter-board").count(), 0);
        assert.equal(await p.getByTestId("token-slot-0").count(), 0);
        assert.equal(await p.getByRole("textbox").count(), 0);
      }
      async function add(group) {
        const source = p.getByTestId("composition-source-" + group);
        await source.scrollIntoViewIfNeeded();
        const a = await source.boundingBox(),
          b = await p.getByTestId("composition-field").boundingBox();
        await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await p.mouse.down();
        await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {
          steps: 12,
        });
        await p.mouse.up();
      }
      async function remove(group) {
        const token = p
          .locator(`[data-testid^="composition-token-${group}-"]`)
          .last();
        await token.scrollIntoViewIfNeeded();
        const a = await token.boundingBox(),
          b = await p.getByTestId("composition-supply").boundingBox();
        await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await p.mouse.down();
        await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {
          steps: 12,
        });
        await p.mouse.up();
      }
      async function checkRow(amounts, page, fixed = false) {
        const patterns = {
          11: [
            [0, 0],
            [0, 1],
            [1, 1],
          ],
          13: [
            [0, 0],
            [0, 1],
            [1, 0],
            [1, 1],
          ],
          15: [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
            [3, 1],
          ],
          19: [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
            [3, 0],
            [3, 1],
          ],
          23: [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
            [3, 0],
            [4, 0],
            [3, 1],
          ],
          29: [
            [0, 0],
            [2, 0],
            [1, 1],
            [0, 2],
            [2, 2],
            [4, 0],
            [6, 0],
            [5, 1],
            [4, 2],
            [6, 2],
          ],
        };
        const pattern = fixed && patterns[page];
        const tiles = p.locator('[data-testid^="composition-token-"]');
        assert.equal(await tiles.count(), amounts[0] + amounts[1]);
        const boxes = await tiles.evaluateAll((els) =>
          els.map((e) => {
            const s = e.firstElementChild,
              b = s.getBoundingClientRect();
            return {
              x: b.x,
              y: b.y,
              w: b.width,
              h: b.height,
              color: getComputedStyle(s).backgroundColor,
            };
          }),
        );
        const colors =
          page === 15 || page === 25 || page === 27
            ? ["rgb(203, 69, 56)", "rgb(93, 134, 61)"]
            : ["rgb(93, 134, 61)", "rgb(203, 69, 56)"];
        boxes.forEach((b, i) => {
          assert.equal(b.color, colors[i < amounts[0] ? 0 : 1]);
          if (pattern) {
            assert.ok(
              Math.abs(b.x - boxes[0].x - pattern[i][0] * b.w) < 1,
              "source column",
            );
            assert.ok(
              Math.abs(b.y - boxes[0].y - pattern[i][1] * b.h) < 1,
              "source row",
            );
          } else if (i) {
            assert.ok(Math.abs(b.y - boxes[0].y) < 1);
            if (![25, 27].includes(page))
              assert.ok(
                Math.abs(b.x - (boxes[i - 1].x + boxes[i - 1].w)) < 1,
                "squares meet edge to edge",
              );
          }
        });
      }
      async function place(amounts) {
        for (let group = 0; group < 2; group++)
          for (let j = 0; j < amounts[group]; j++) await add(group);
      }
      for (const [page, start, left, right] of viewport.width === 390
        ? cases
        : [cases[0], cases[cases.length - 1]]) {
        const id = (n) =>
          `p${String(page).padStart(3, "0")}-lesson${String(n).padStart(2, "0")}`;
        await open(id(start));
        if (page === 11) {
          await place([1, 2]);
          await btn("Проверить").click();
          assert.equal(await btn("✓ Получилось!").count(), 0);
          await remove(1);
          await add(0);
        } else await place([left, right]);
        await btn("Проверить").click();
        await btn("✓ Получилось!").waitFor();
        await checkRow([left, right], page, true);
        if (page === 11)
          await p
            .getByTestId("composition-board")
            .screenshot({
              path: `docs/composition-source-three-${viewport.width}.png`,
            });
        if (page === 29) {
          await add(0);
          await checkRow([left, right], page, true);
          await remove(1);
          await checkRow([left, right - 1], page, true);
          await btn("Отменить").click();
          await checkRow([left, right], page, true);
          await p
            .getByTestId("composition-board")
            .screenshot({ path: `docs/composition-ten-${viewport.width}.png` });
          await btn("Проверить").click();
          await btn("✓ Получилось!").waitFor();
        }
        const firstSize = await p
          .getByTestId("composition-field")
          .boundingBox();
        await open(id(start + 1));
        if (page === 11) {
          await place([2, 1]);
          await btn("Проверить").click();
          assert.equal(await btn("✓ Получилось!").count(), 0);
          await remove(0);
          await add(1);
        } else await place([1, left + right - 1]);
        await btn("Проверить").click();
        await btn("✓ Получилось!").waitFor();
        await checkRow([1, left + right - 1], page);
        const secondSize = await p
          .getByTestId("composition-field")
          .boundingBox();
        assert.equal(firstSize.width, secondSize.width);
        await p.reload();
        await p.getByRole("button", { name: /^Продолжить занятие/ }).click();
        await btn("✓ Получилось!").waitFor();
        if (page === 11)
          await p.screenshot({
            path: `docs/composition-pair-${viewport.width}.png`,
            fullPage: true,
          });
        report.checks.push({
          page,
          viewport,
          copy: [left, right],
          another: [1, left + right - 1],
          singleBoard: true,
          sourcePatternAndAlternativeRow: true,
          noNumericInput: true,
          reload: true,
        });
      }
      if (viewport.width === 390) {
        for (const [id, total] of [
          ["p040-source02", 4],
          ["p043-source05", 5],
          ["p046-source04", 6],
          ["p048-source09", 7],
          ["p051-source02", 8],
        ]) {
          await open(id);
          await place([1, total - 1]);
          await checkRow([1, total - 1], Number(id.slice(1, 4)));
          await btn("Проверить").click();
          await btn("✓ Получилось!").waitFor();
          report.checks.push({
            id,
            viewport,
            parts: [1, total - 1],
            singleBoard: true,
            adjacentTwoColors: true,
          });
        }
      }
      await ctx.close();
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (e) {
    report.errors.push(String(e));
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      "docs/composition-pairs-browser-result.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
})();
