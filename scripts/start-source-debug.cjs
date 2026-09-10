// Separate process environment: the debug flag never changes .env or release configuration.
const { spawn } = require("node:child_process");
const args = process.argv.slice(2);
if (!args.some((a) => a === "--port" || a.startsWith("--port=")))
  args.push("--port", "8082");
const child = spawn(
  process.execPath,
  [require.resolve("expo/bin/cli"), "start", "--web", ...args],
  {
    stdio: "inherit",
    env: { ...process.env, EXPO_PUBLIC_SOURCE_DEBUG: "1" },
  },
);
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
