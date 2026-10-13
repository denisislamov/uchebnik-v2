const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
module.exports = async function ({ call, base }) {
  const browser = await chromium.launch({ headless: true });
  const evidence = path.join(os.tmpdir(), "shelfsmart-admin-evidence");
  fs.mkdirSync(evidence, { recursive: true });
  try {
    for (const width of [390, 1280]) {
      await call("reset");
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await context.route("https://boosty.to/**", (route) =>
        route.fulfill({ status: 200, body: "Local Boosty link test" }),
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await page.getByTestId("feedback-open").waitFor();
      const savedProgress = await page.evaluate(() => {
        const key = "uchebnik:pchelko-1959:pages-001-010:v1";
        const value = localStorage.getItem(key);
        if (!value) throw new Error("Textbook progress was not initialized");
        return value;
      });
      const click = page.waitForResponse(
        (r) =>
          r.url().endsWith("/v1/events") &&
          r.request().postDataJSON()?.kind === "boosty_click",
      );
      const popup = context.waitForEvent("page");
      await page.locator('a[href^="https://boosty.to/"]').click();
      const boosty = await popup;
      await boosty.waitForURL("https://boosty.to/**");
      assert.equal((await click).status(), 204);
      await boosty.close();
      const event = (await call("snapshot")).events.find(
        (e) => e.kind === "boosty_click",
      );
      assert.ok(event);
      const input = {
        id: event.id,
        kind: event.kind,
        visitorId: event.visitor_id,
        sessionId: event.session_id,
        referrerHost: event.referrer_host,
      };
      const duplicate = await page.evaluate(
        async (body) =>
          (
            await fetch("http://127.0.0.1:8097/v1/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          ).status,
        input,
      );
      assert.equal(duplicate, 204);
      assert.equal(
        (await call("snapshot")).events.filter((e) => e.kind === "boosty_click")
          .length,
        1,
      );
      await page.getByTestId("feedback-open").click();
      const message = `Проверка настоящей базы данных, ширина ${width}. <img src=x onerror=alert(1)>`;
      await page.getByTestId("feedback-message").fill(message);
      await page.getByTestId("feedback-name").fill("Тестовый родитель");
      await page.screenshot({
        animations: "disabled",
        path: path.join(evidence, `feedback-${width}.png`),
      });
      await page.getByTestId("feedback-submit").click();
      await page.getByTestId("feedback-success").waitFor();
      assert.equal((await call("snapshot")).messages[0].message, message);
      await page.goto(`${base}/admin`);
      await page.getByTestId("admin-login").waitFor();
      await page.screenshot({
        animations: "disabled",
        path: path.join(evidence, `login-${width}.png`),
      });
      async function login(password = "test-owner-password-with-long-entropy") {
        await page.getByTestId("admin-username").fill("test-owner");
        await page.getByTestId("admin-password").fill(password);
        await page.getByTestId("admin-login-submit").click();
        await page.getByTestId("metric-visitors").waitFor();
      }
      await login();
      await page.reload();
      await page.getByTestId("metric-boostyClicks").waitFor();
      assert.match(
        await page.getByTestId("metric-boostyClicks").innerText(),
        /1/,
      );
      await page.screenshot({
        animations: "disabled",
        path: path.join(evidence, `dashboard-${width}.png`),
        fullPage: true,
      });
      const oldCookies = await context.cookies();
      const eventCount = (await call("snapshot")).events.length;
      await page.getByTestId("admin-messages-tab").click();
      await page.getByText(message, { exact: true }).waitFor();
      await page.screenshot({
        animations: "disabled",
        path: path.join(evidence, `inbox-${width}.png`),
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await call("restart");
      await page.reload();
      await page.getByTestId("admin-messages-tab").click();
      await page.getByText(message, { exact: true }).waitFor();
      await page.getByTestId("message-archive").click();
      await page.getByTestId("filter-archived").click();
      await page.getByText(message, { exact: true }).waitFor();
      await page.getByTestId("message-restore").click();
      await page.getByTestId("filter-new").click();
      await page.getByText(message, { exact: true }).waitFor();
      await page.getByTestId("message-delete").click();
      await page.getByTestId("message-delete-confirm").click();
      await page.getByTestId("inbox-empty").waitFor();
      assert.equal((await call("snapshot")).messages.length, 0);
      await page.getByTestId("admin-logout").click();
      await page.getByTestId("admin-login").waitFor();
      await page.getByTestId("admin-forgot-toggle").click();
      await page
        .getByTestId("admin-recovery-email")
        .fill("islamov.denis@gmail.com");
      await page.getByTestId("admin-forgot-submit").click();
      await page
        .getByText(
          /Если адрес совпадает с почтой владельца, письмо скоро придёт/,
        )
        .waitFor();
      const mail = (await call("snapshot")).mailbox[0];
      assert.equal(mail.to, "islamov.denis@gmail.com");
      await page.goto(mail.resetUrl);
      await page.getByTestId("admin-new-password").waitFor();
      assert.equal(new URL(page.url()).hash, "");
      await page
        .getByTestId("admin-new-password")
        .fill("new-owner-password-for-local-tests");
      await page
        .getByTestId("admin-confirm-password")
        .fill("new-owner-password-for-local-tests");
      await page.getByTestId("admin-reset-submit").click();
      await page.getByTestId("admin-login").waitFor();
      const old = await browser.newContext();
      await old.addCookies(oldCookies);
      const oldPage = await old.newPage();
      await oldPage.goto(`${base}/admin`);
      await oldPage.getByTestId("admin-login").waitFor();
      await old.close();
      await login("new-owner-password-for-local-tests");
      assert.equal((await call("snapshot")).events.length, eventCount);
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("uchebnik:pchelko-1959:pages-001-010:v1"),
        ),
        savedProgress,
      );
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(
      `PASS real Postgres browser flow, restart persistence and reset revocation; screenshots: ${evidence}`,
    );
  } finally {
    await browser.close();
  }
};
