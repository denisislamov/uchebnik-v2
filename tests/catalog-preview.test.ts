import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";
import { pages, lessonPages } from "../src/content/book.ts";
import { catalogPreviewId } from "../src/content/catalogPreview.ts";

const revisedIds = new Set(
  readdirSync("assets/book2")
    .filter((name) => name.endsWith(".png"))
    .map((name) => name.slice(0, -4)),
);
const vectorIds = new Set(
  readdirSync("assets/book2/vector")
    .filter((name) => name.endsWith(".svg"))
    .map((name) => name.slice(0, -4)),
);

test("catalog uses a modern lesson illustration instead of a scanned page", () => {
  const page11 = pages.find((page) => page.number === 11)!;
  assert.equal(
    catalogPreviewId(page11, revisedIds, vectorIds, false),
    "p011_children_tricycles",
  );
  assert.equal(
    catalogPreviewId(page11, revisedIds, vectorIds, true),
    "page_011",
  );
});

test("text-only lessons have no scanned thumbnail", () => {
  const page30 = pages.find((page) => page.number === 30)!;
  const page37 = pages.find((page) => page.number === 37)!;
  assert.equal(
    catalogPreviewId(page30, revisedIds, vectorIds, false),
    "p030_fir_trees_10",
  );
  assert.equal(catalogPreviewId(page37, revisedIds, vectorIds, false), undefined);
});

test("every modern catalog thumbnail comes from its own lesson", () => {
  for (const page of lessonPages) {
    const preview = catalogPreviewId(page, revisedIds, vectorIds, false);
    if (!preview) continue;
    assert.ok(!preview.startsWith("page_"), `page ${page.number}`);
    assert.ok(
      page.blocks.some((block) => block.images?.includes(preview)),
      `page ${page.number}: ${preview}`,
    );
  }
});
