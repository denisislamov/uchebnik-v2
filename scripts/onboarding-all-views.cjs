const { spawnSync } = require("node:child_process");
for (const [width, height] of [
  [390, 844],
  [800, 375],
]) {
  const result = spawnSync(process.execPath, ["scripts/onboarding-audit.cjs"], {
    stdio: "inherit",
    env: {
      ...process.env,
      AUDIT_WIDTH: String(width),
      AUDIT_HEIGHT: String(height),
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
