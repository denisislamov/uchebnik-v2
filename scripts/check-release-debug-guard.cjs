/** Build with the flag intentionally enabled; __DEV__ must still remove the debug UI. */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const output = fs.mkdtempSync(
  path.join(os.tmpdir(), "uchebnik-release-guard-"),
);
try {
  const build = spawnSync(
    process.execPath,
    [
      require.resolve("expo/bin/cli"),
      "export",
      "--platform",
      "all",
      "--output-dir",
      output,
    ],
    {
      stdio: "inherit",
      env: { ...process.env, EXPO_PUBLIC_SOURCE_DEBUG: "1" },
    },
  );
  if (build.error) throw build.error;
  if (build.status !== 0) throw Error("Release export failed");
  let bundles = 0;
  const platforms = new Set();
  function check(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) check(file);
      else if (/\.(js|hbc)$/.test(file)) {
        bundles++;
        for (const platform of ["web", "ios", "android"]) {
          if (file.includes(`${path.sep}${platform}${path.sep}`))
            platforms.add(platform);
        }
        const source = fs.readFileSync(file, "utf8");
        for (const marker of [
          "debug-source-panel",
          "debug-source-page",
          "РЕЖИМ СВЕРКИ",
          "Сверка: увеличить",
        ])
          if (source.includes(marker))
            throw Error(`Debug code leaked into release: ${marker}`);
      }
    }
  }
  check(output);
  if (!bundles || platforms.size !== 3)
    throw Error("Missing production bundles for web, iOS or Android");
  console.log(
    "PASS: production removes source-comparison UI even when EXPO_PUBLIC_SOURCE_DEBUG=1",
  );
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}
