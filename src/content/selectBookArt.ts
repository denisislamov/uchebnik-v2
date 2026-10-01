/** Prefer a revised vector, but keep source comparison tied to the original. */
export function selectBookArt<O, R, V>(
  original: O | undefined,
  revised: R | undefined,
  vector: V | undefined,
  originalMode: boolean,
): O | R | V | undefined {
  return originalMode ? original : (vector ?? revised ?? original);
}

/** The old token card stays in the original view; revised rails render as art. */
export function usesLegacyCountingCard(
  id: string,
  art: object | undefined,
): boolean {
  return /abacus_\d+$/.test(id) && !!art && !("xml" in art);
}
