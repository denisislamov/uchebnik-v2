import { courseCorrect } from "./courseAssessment.ts";
import { traceProgress, drawingColor, DRAWING_COLORS } from "./tracing.ts";
import type { Answer, Block, BookPage, Progress } from "../content/types.ts";
export const edgeKey = (a: number, b: number) =>
  [a, b].sort((x, y) => x - y).join("-");
export function hasInk(answer?: Answer): boolean {
  return !!answer?.strokes?.some((s) => s.points.length > 1);
}
export function isCorrect(block: Block, answer?: Answer): boolean {
  if (!answer) return false;
  if (
    [
      "work",
      "compose",
      "activity",
      "recipe",
      "relation",
      "targetGame",
    ].includes(block.kind)
  )
    return courseCorrect(block, answer);
  if (block.kind === "read") return answer.reviewed === true;
  if (block.kind === "draw")
    return block.trace
      ? traceProgress(block.trace, answer.strokes).done
      : hasInk(answer);
  if (block.kind === "picture")
    return (
      Array.isArray(answer.value) &&
      answer.value.length === block.expected.length &&
      new Set(answer.value).size === block.expected.length &&
      block.expected.every((id) => (answer.value as string[]).includes(id))
    );
  if (block.kind === "counters" && block.expected === undefined)
    return (
      typeof answer.value === "number" &&
      answer.value > 0 &&
      answer.reviewed === true
    );
  if (block.kind === "shape") {
    const expected = block.edges.map(([a, b]) => edgeKey(a, b));
    return (
      Array.isArray(answer.value) &&
      answer.value.length === expected.length &&
      new Set(answer.value).size === expected.length &&
      expected.every((e) => (answer.value as string[]).includes(e))
    );
  }
  if (block.kind === "choice") return answer.value === block.expected;
  const value = answer.value;
  return (
    (typeof value === "number" || typeof value === "string") &&
    String(value).trim() !== "" &&
    /^\d+$/.test(String(value)) &&
    Number(value) === ("expected" in block ? block.expected : undefined)
  );
}
export const isDone = (block: Block, answer?: Answer) =>
  isCorrect(block, answer) &&
  (block.kind === "read" ||
    block.kind === "draw" ||
    (block.kind === "counters" && block.expected === undefined) ||
    answer?.checked === true);
export const pageCompleted = (
  page: BookPage,
  answers: Record<string, Answer>,
) => page.blocks.every((b) => isDone(b, answers[b.id]));
export const emptyProgress = (): Progress => ({
  version: 1,
  page: 1,
  block: 0,
  answers: {},
});
/** Validate untrusted persisted data, ignoring malformed fields and IDs from another edition. */
export function parseProgress(raw: string | null, pages: BookPage[]): Progress {
  const fallback = emptyProgress();
  if (!raw) return fallback;
  try {
    const p = JSON.parse(raw);
    if (
      p?.version !== 1 ||
      !p.answers ||
      typeof p.answers !== "object" ||
      Array.isArray(p.answers)
    )
      return fallback;
    const allowed = new Set(pages.flatMap((p) => p.blocks.map((b) => b.id)));
    const answers: Record<string, Answer> = {};
    for (const [id, a] of Object.entries(p.answers) as [string, any][]) {
      if (!allowed.has(id) || !a || typeof a !== "object") continue;
      const answer: Answer = {
        reviewed: a.reviewed === true,
        checked: a.checked === true,
        attempts:
          Number.isInteger(a.attempts) && a.attempts >= 0 ? a.attempts : 0,
      };
      if (typeof a.value === "string" && a.value.length < 100)
        answer.value = a.value;
      if (
        typeof a.value === "number" &&
        Number.isFinite(a.value) &&
        a.value >= 0 &&
        a.value <= 1000
      )
        answer.value = a.value;
      if (
        Array.isArray(a.value) &&
        a.value.length <= 200 &&
        a.value.every((v: unknown) => typeof v === "string")
      )
        answer.value = a.value;
      if (
        a.responses &&
        typeof a.responses === "object" &&
        !Array.isArray(a.responses)
      ) {
        answer.responses = Object.fromEntries(
          Object.entries(a.responses)
            .slice(0, 500)
            .filter(
              ([key, value]) =>
                /^[a-zA-Z0-9_-]{1,40}$/.test(key) &&
                typeof value === "string" &&
                value.length <= 200,
            ),
        ) as Record<string, string>;
      }
      if (Array.isArray(a.strokes))
        answer.strokes = a.strokes
          .slice(0, 100)
          .filter(
            (s: any) =>
              s &&
              DRAWING_COLORS.includes(drawingColor(s.color)) &&
              Array.isArray(s.points),
          )
          .map((s: any) => ({
            color: s.color,
            points: s.points
              .slice(0, 1000)
              .filter(
                (v: any) =>
                  v &&
                  Number.isFinite(v.x) &&
                  Number.isFinite(v.y) &&
                  v.x >= 0 &&
                  v.x <= 1 &&
                  v.y >= 0 &&
                  v.y <= 1,
              ),
          }));
      answers[id] = answer;
    }
    const page =
      Number.isInteger(p.page) && p.page >= 1 && p.page <= pages.length
        ? p.page
        : 1;
    const block =
      Number.isInteger(p.block) &&
      p.block >= 0 &&
      p.block < pages[page - 1].blocks.length
        ? p.block
        : 0;
    return { version: 1, page, block, answers };
  } catch {
    return fallback;
  }
}
