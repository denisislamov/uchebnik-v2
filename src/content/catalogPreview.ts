import type { BookPage } from "./types";

/** A lesson card shows an illustration from that lesson, never a page scan. */
export function catalogPreviewId(
  page: Pick<BookPage, "hero" | "blocks">,
  revisedIds: ReadonlySet<string>,
  vectorIds: ReadonlySet<string>,
  originalIllustrations: boolean,
): string | undefined {
  if (originalIllustrations) return page.hero;
  const lessonImages = page.blocks.flatMap((block) => block.images ?? []);
  return (
    lessonImages.find((id) => revisedIds.has(id)) ??
    lessonImages.find((id) => vectorIds.has(id))
  );
}
