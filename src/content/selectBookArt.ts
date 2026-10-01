/** Prefer a revised vector, but keep source comparison tied to the original. */
export function selectBookArt<O, R, V>(
  original: O | undefined,
  revised: R | undefined,
  vector: V | undefined,
  originalMode: boolean,
): O | R | V | undefined {
  return originalMode ? original : (vector ?? revised ?? original);
}
