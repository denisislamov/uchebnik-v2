/** Runs against an isolated local server, without touching the user's open preview or saved progress. */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const port = Number(process.env.TEST_PORT || 8094),
  base = `http://127.0.0.1:${port}`;
async function run(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      stdio: "inherit",
      env: { ...process.env, BASE_URL: base },
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error(`${file} failed (${code})`)),
    );
  });
}
(async () => {
  if (!fs.existsSync("dist/index.html"))
    throw Error("Run npm run export:web first");
  const server = spawn(
    process.env.PYTHON || "python3",
    [
      "-m",
      "http.server",
      String(port),
      "--bind",
      "127.0.0.1",
      "--directory",
      "dist",
    ],
    { stdio: "ignore" },
  );
  let serverError;
  server.on("error", (e) => (serverError = e));
  server.on("exit", (code) => {
    if (code)
      serverError = Error(
        `Test server exited (${code}); port ${port} may be busy`,
      );
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (serverError) throw serverError;
      try {
        ready = (await fetch(base)).ok;
      } catch {}
      if (ready) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    if (serverError) throw serverError;
    if (!ready) throw Error("Test server did not start");
    for (const file of [
      "scripts/browser-smoke.cjs",
      "scripts/full-course-smoke.cjs",
      "scripts/activity-smoke.cjs",
      "scripts/all-pages-smoke.cjs",
    ])
      await run(file);
  } finally {
    server.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
