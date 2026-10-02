import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { pages } from "../src/content/book.ts";
import { catalogPreviewId } from "../src/content/catalogPreview.ts";

test("the first catalog section stays small enough to load promptly", () => {
  const manifest = JSON.parse(
    readFileSync("assets/book2/manifest.json", "utf8"),
  ) as { id: string }[];
  const revisedIds = new Set(manifest.map(({ id }) => id));
  const previews = pages
    .filter((page) => page.number >= 1 && page.number <= 29 && page.number !== 2)
    .map((page) => catalogPreviewId(page, revisedIds, new Set(), false))
    .filter((id): id is string => !!id);
  const bytes = previews.reduce(
    (total, id) => total + statSync(`assets/book2/${id}@2x.webp`).size,
    0,
  );
  assert.ok(
    bytes < 8 * 1024 * 1024,
    `28 high-density catalog previews total ${(bytes / 1024 / 1024).toFixed(1)} MiB`,
  );
});
