import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const script = resolve("scripts/illustration-coverage.cjs");

function fixture(
  assets: Array<{ id: string; page: number }>,
  manifest: Array<{ id: string; alt: string }>,
  files: string[],
) {
  const root = mkdtempSync(join(tmpdir(), "illustration-coverage-"));
  const write = (path: string, contents: string) => {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents);
  };
  write("textbook/data/assets.json", JSON.stringify(assets));
  write("assets/book2/manifest.json", JSON.stringify(manifest));
  for (const path of files)
    write(path, path.endsWith(".svg") ? "<svg/>" : "png");
  return root;
}

function run(root: string, ...args: string[]) {
  const result = spawnSync(
    process.execPath,
    [script, "--root", root, ...args],
    {
      encoding: "utf8",
    },
  );
  assert.equal(result.error, undefined);
  return result;
}

test("reports partial raster and vector coverage by source page", () => {
  const root = fixture(
    [
      { id: "p003_school", page: 3 },
      { id: "p003_ball", page: 3 },
      { id: "p004_river", page: 4 },
    ],
    [{ id: "p003_school", alt: "school" }],
    [
      "assets/book2/p003_school.png",
      "assets/book2/p003_school@2x.png",
      "assets/book2/vector/p003_ball.svg",
    ],
  );
  try {
    const json = run(root, "--check", "--json");
    assert.equal(json.status, 0, json.stderr);
    assert.deepEqual(JSON.parse(json.stdout), {
      totalOriginal: 3,
      revisedRasterIds: ["p003_school"],
      revisedVectorIds: ["p003_ball"],
      completeIds: ["p003_ball", "p003_school"],
      remainingCount: 1,
      remainingByPage: { "004": ["p004_river"] },
      errors: [],
    });

    const human = run(root);
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /Remaining: 1/);
    assert.match(human.stdout, /Page 004 \(1\): p004_river/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("check rejects duplicate and invalid IDs and missing declared raster files", () => {
  const root = fixture(
    [{ id: "p003_school", page: 3 }],
    [
      { id: "p003_school", alt: "school" },
      { id: "p003_school", alt: "again" },
      { id: "p099_unknown", alt: "unknown" },
    ],
    ["assets/book2/p003_school.png", "assets/book2/vector/p003_school.svg"],
  );
  try {
    const result = run(root, "--check", "--json");
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.remainingCount, 1);
    assert.match(report.errors.join("\n"), /duplicate raster ID: p003_school/);
    assert.match(report.errors.join("\n"), /unknown raster ID: p099_unknown/);
    assert.match(
      report.errors.join("\n"),
      /missing raster file: p003_school@2x\.png/,
    );
    assert.match(
      report.errors.join("\n"),
      /raster and vector both claim ID: p003_school/,
    );

    const informative = run(root, "--json");
    assert.equal(informative.status, 0);
    assert.ok(JSON.parse(informative.stdout).errors.length > 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("real registry has 488 originals and a consistent partial coverage total", () => {
  const result = run(resolve("."), "--json");
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.totalOriginal, 488);
  assert.equal(report.completeIds.length + report.remainingCount, 488);
});
