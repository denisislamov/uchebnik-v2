const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { fork, spawn } = require("node:child_process");
const { once } = require("node:events");
const base = "http://127.0.0.1:8096";
function guard() {
  let url;
  try {
    url = new URL(process.env.TEST_DATABASE_URL);
  } catch {}
  if (
    !url ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !url.pathname.startsWith("/shelfsmart_test")
  )
    throw Error("Set TEST_DATABASE_URL to a loopback shelfsmart_test database");
  const dir = "dist/_expo/static/js/web";
  if (
    !fs.existsSync(dir) ||
    !fs
      .readdirSync(dir)
      .some(
        (file) =>
          file.endsWith(".js") &&
          fs
            .readFileSync(path.join(dir, file), "utf8")
            .includes("http://127.0.0.1:8097"),
      )
  )
    throw Error(
      "Export web with EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8097 first",
    );
}
function staticServer() {
  const root = path.resolve("dist");
  const mime = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".json": "application/json",
    ".ttf": "font/ttf",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };
  return http.createServer((req, res) => {
    let name;
    try {
      name = decodeURIComponent(new URL(req.url, base).pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (/^\/(admin(\/reset)?\/?)?$/.test(name)) name = "/index.html";
    const file = path.resolve(root, `.${name}`);
    if (!file.startsWith(`${root}/`)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, body) => {
      if (error) res.writeHead(404).end();
      else {
        res.writeHead(200, {
          "Content-Type":
            mime[path.extname(file)] || "application/octet-stream",
          "Cache-Control": "no-store",
        });
        res.end(body);
      }
    });
  });
}
async function run(file) {
  const child = spawn(process.execPath, [file], {
    stdio: "inherit",
    env: { ...process.env, BASE_URL: base },
  });
  const [code] = await once(child, "exit");
  if (code) throw Error(`${file} failed`);
}
(async () => {
  guard();
  const web = staticServer();
  await new Promise((resolve, reject) => {
    web.once("error", reject);
    web.listen(8096, "127.0.0.1", resolve);
  });
  const fixture = fork("server/tests/e2e-fixture.ts", [], {
    execArgv: ["--experimental-strip-types"],
    env: { ...process.env, SHELF_ADMIN_E2E: "1" },
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  const pending = new Map();
  let id = 0;
  fixture.on("message", (message) => {
    const entry = pending.get(message.id);
    if (entry) {
      pending.delete(message.id);
      clearTimeout(entry.timer);
      message.error
        ? entry.reject(Error(message.error))
        : entry.resolve(message.result);
    }
  });
  const call = (command) =>
    new Promise((resolve, reject) => {
      const key = ++id;
      const timer = setTimeout(() => {
        pending.delete(key);
        reject(Error("Fixture command timed out"));
      }, 10000);
      pending.set(key, { resolve, reject, timer });
      fixture.send({ id: key, command });
    });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Fixture startup timed out")),
        15000,
      );
      fixture.once("error", reject);
      fixture.once("exit", (code) => {
        clearTimeout(timer);
        reject(Error(`Fixture exited (${code})`));
      });
      fixture.on("message", (message) => {
        if (message.ready) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    await run("scripts/admin-smoke.cjs");
    await run("scripts/feedback-smoke.cjs");
    await run("scripts/analytics-smoke.cjs");
    await require("./admin-real-smoke.cjs")({ call, base });
  } finally {
    for (const entry of pending.values()) clearTimeout(entry.timer);
    const ended = once(fixture, "exit");
    if (fixture.connected) fixture.disconnect();
    const killer = setTimeout(() => fixture.kill("SIGTERM"), 5000);
    if (fixture.exitCode === null) await ended;
    clearTimeout(killer);
    await new Promise((resolve) => web.close(resolve));
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
