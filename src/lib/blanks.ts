/** The content marker for an unfilled value, e.g. "4 + □ = 6". */
export const BLANK = "□";
export type BlankRun = string | { blank: true };
/** Split text on the marker so every gap can be drawn as an empty field instead of a glyph. */
export function blankRuns(text: string): BlankRun[] {
  const runs: BlankRun[] = [];
  text.split(BLANK).forEach((part, i) => {
    if (i) runs.push({ blank: true });
    if (part) runs.push(part);
  });
  return runs;
}
/** What a screen reader hears instead of "white square". */
export const spokenBlanks = (text: string) => text.replace(/□/g, "пропуск");
