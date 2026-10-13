const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8096";
const api = "http://127.0.0.1:8097";
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({
          viewport: { width, height: 940 },
        }),
        page = await context.newPage();
      const errors = [],
        events = [],
        resetRequests = [];
      let logged = false,
        unavailable = false;
      page.on("pageerror", (error) => errors.push(error.message));
      const dangerous = '<img src=x onerror="window.injected=true">';
      let messages = [
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Родитель",
          email: "parent@example.com",
          message: dangerous,
          status: "new",
          createdAt: new Date().toISOString(),
        },
      ];
      const session = () => ({
        username: "test-owner",
        csrfToken: "test-csrf",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      await page.route(`${api}/v1/**`, async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          method = req.method();
        const headers = {
          "Access-Control-Allow-Origin": base,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers": "Content-Type,X-CSRF-Token",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
        };
        const reply = (status, data) =>
          route.fulfill({
            status,
            headers,
            ...(status === 204
              ? {}
              : {
                  contentType: "application/json",
                  body: JSON.stringify(data),
                }),
          });
        if (method === "OPTIONS") return reply(204);
        if (url.pathname.endsWith("/events")) {
          events.push(req.postDataJSON());
          return reply(204);
        }
        if (url.pathname.endsWith("/auth/login")) {
          logged = true;
          return reply(200, session());
        }
        if (url.pathname.endsWith("/auth/logout")) {
          logged = false;
          return reply(204);
        }
        if (url.pathname.endsWith("/auth/reset")) {
          resetRequests.push(req.postDataJSON());
          logged = false;
          return reply(204);
        }
        if (url.pathname.endsWith("/auth/forgot"))
          return reply(202, { ok: true });
        if (!logged) return reply(401, { error: "unauthorized" });
        if (url.pathname.endsWith("/auth/session"))
          return reply(200, session());
        if (unavailable) return reply(503, { error: "unavailable" });
        if (url.pathname.endsWith("/analytics")) {
          const empty = url.searchParams.get("period") === "30d";
          const counts = {
            visitors: empty ? 0 : 12,
            visits: empty ? 0 : 16,
            bookOpens: empty ? 0 : 3,
            boostyClicks: empty ? 0 : 5,
            boostyVisitors: empty ? 0 : 4,
            boostyConversion: empty ? null : 1 / 3,
          };
          return reply(200, {
            period: url.searchParams.get("period"),
            timezone: "Asia/Makassar",
            totals: counts,
            days: [{ date: "2026-10-14", ...counts }],
            sources: empty ? [] : [{ host: "example.com", visits: 16 }],
          });
        }
        if (method === "PATCH") {
          const entry = messages.find((m) => url.pathname.endsWith(m.id));
          if (entry) entry.status = req.postDataJSON().status;
          return reply(204);
        }
        if (method === "DELETE") {
          messages = messages.filter((m) => !url.pathname.endsWith(m.id));
          return reply(204);
        }
        const status = url.searchParams.get("status");
        return reply(200, {
          items: messages.filter((m) => !status || m.status === status),
          nextCursor: null,
        });
      });
      await page.goto(`${base}/admin`);
      await page.getByTestId("admin-login").waitFor({ timeout: 5000 });
      async function expectPrivateRequestStatus(status) {
        assert.equal(
          await page.evaluate(
            async (origin) =>
              (
                await fetch(`${origin}/v1/admin/feedback`, {
                  credentials: "include",
                })
              ).status,
            api,
          ),
          status,
        );
      }
      await expectPrivateRequestStatus(401);
      async function login() {
        await page.getByTestId("admin-username").fill("test-owner");
        await page.getByTestId("admin-password").fill("test-long-password");
        await page.getByTestId("admin-login-submit").click();
        await page.getByTestId("metric-visitors").waitFor();
      }
      await login();
      assert.match(await page.getByTestId("metric-visitors").innerText(), /12/);
      await page.reload();
      await page.getByTestId("metric-visitors").waitFor();
      await page.getByTestId("period-30d").click();
      await page.waitForFunction(() =>
        document
          .querySelector('[data-testid="metric-visitors"]')
          ?.textContent.includes("0"),
      );
      unavailable = true;
      await page.getByTestId("period-today").click();
      await page.getByTestId("admin-data-error").waitFor();
      unavailable = false;
      await page.getByTestId("admin-data-retry").click();
      await page.getByTestId("metric-visitors").waitFor();
      await page.getByTestId("admin-messages-tab").click();
      await page.getByTestId("feedback-inbox").waitFor();
      await page.getByText(dangerous, { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.injected), undefined);
      await page.getByTestId("message-read").click();
      await page.getByTestId("filter-read").click();
      await page.getByText(dangerous, { exact: true }).waitFor();
      await page.getByTestId("message-archive").click();
      await page.getByTestId("filter-archived").click();
      await page.getByText(dangerous, { exact: true }).waitFor();
      await page.getByTestId("message-restore").click();
      await page.getByTestId("filter-new").click();
      await page.getByText(dangerous, { exact: true }).waitFor();
      await page.getByTestId("message-delete").click();
      assert.equal(messages.length, 1);
      await page.getByTestId("message-delete-confirm").click();
      await page.getByTestId("inbox-empty").waitFor();
      await page.getByTestId("admin-logout").click();
      await page.getByTestId("admin-login").waitFor();
      assert.equal(await page.getByTestId("feedback-inbox").count(), 0);
      await login();
      logged = false;
      await page.getByTestId("period-today").click();
      await page.getByTestId("admin-login").waitFor();
      const resetToken = "a".repeat(43);
      await page.goto(`${base}/admin/reset#token=${resetToken}`);
      await page.getByTestId("admin-reset").waitFor();
      assert.equal(new URL(page.url()).hash, "");
      assert.equal(resetRequests.length, 0);
      assert.equal(
        await page.evaluate(
          (token) =>
            JSON.stringify(Object.entries(localStorage)).includes(token),
          resetToken,
        ),
        false,
      );
      await page
        .getByTestId("admin-new-password")
        .fill("a-new-long-password-for-owner");
      await page
        .getByTestId("admin-confirm-password")
        .fill("a-new-long-password-for-owner");
      await page.getByTestId("admin-reset-submit").click();
      await page.getByTestId("admin-login").waitFor();
      assert.equal(resetRequests.length, 1);
      assert.equal(resetRequests[0].token, resetToken);
      assert.deepEqual(events, []);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(
      "PASS admin UI: login, reload, logout, expiry, metrics, inbox, plain-text HTML and reset on 2 viewports",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
