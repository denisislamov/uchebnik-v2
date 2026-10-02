import assert from "node:assert/strict";
import test from "node:test";
import {
  libraryCopy,
  libraryLanguages,
  libraryLocale,
  libraryText,
} from "../src/localization/library.ts";

test("unknown or corrupt saved language falls back to Russian", () => {
  for (const saved of [null, "", "ja", "{broken}", "EN"])
    assert.equal(libraryLocale(saved), "ru");
  for (const language of libraryLanguages)
    assert.equal(libraryLocale(language.code), language.code);
});
test("all translations preserve formatting placeholders and have nonempty book names", () => {
  for (const language of libraryLanguages) {
    const copy = libraryCopy[language.code];
    for (const [key, reference] of Object.entries(libraryCopy.ru)) {
      if (typeof reference !== "string") continue;
      const text = copy[key as keyof Omit<typeof copy, "books">];
      assert.ok(text.trim(), `${language.code}.${key}`);
      const placeholders = (value: string) =>
        [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      assert.deepEqual(
        placeholders(text),
        placeholders(reference),
        `${language.code}.${key}`,
      );
    }
    for (const name of Object.values(copy.books)) assert.ok(name.trim());
  }
});
test("formatting preserves zero completed pages and locale-specific number strings", () => {
  assert.equal(
    libraryText(libraryCopy.en.progress, { completed: 0, total: 140 }),
    "0 of 140 pages completed",
  );
  assert.equal(
    libraryText(libraryCopy.de.funding, {
      raised: "12.500 ₽",
      goal: "60.000 ₽",
    }),
    "12.500 ₽ von 60.000 ₽",
  );
});
