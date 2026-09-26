import { locationCorrect } from "./location.ts";
import { courseCorrect } from "./courseAssessment.ts";
import { practicalCorrect } from "./practical.ts";
import { storyCorrect } from "./storyAssessment.ts";
import { numberGameCorrect } from "./numberGame.ts";
import { revision2Steps } from "../content/legacyStepIds.ts";
import { traceProgress, drawingColor, DRAWING_COLORS } from "./tracing.ts";
import type { Answer, Block, BookPage, Progress } from "../content/types.ts";
export const edgeKey = (a: number, b: number) =>
  [a, b].sort((x, y) => x - y).join("-");
export function hasInk(answer?: Answer): boolean {
  return !!answer?.strokes?.some((s) => s.points.length > 1);
}
export function isCorrect(block: Block, answer?: Answer): boolean {
  if (!answer) return false;
  if (block.kind === "location") return locationCorrect(block, answer);
  if (block.kind === "practical") return practicalCorrect(block, answer);
  if (block.kind === "story") return storyCorrect(block, answer);
  if (block.kind === "numberGame") return numberGameCorrect(block, answer);
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
/** «Дальше» opens only after the step is solved; reading and free practice are finished by pressing it. */
export const canAdvance = (block: Block, answer?: Answer) =>
  block.kind === "read" ||
  (block.kind === "counters" &&
    block.expected === undefined &&
    Number(answer?.value) > 0) ||
  isDone(block, answer);
export const pageCompleted = (
  page: BookPage,
  answers: Record<string, Answer>,
) => page.blocks.every((b) => isDone(b, answers[b.id]));
export const emptyProgress = (): Progress => ({
  version: 1,
  contentRevision: 3,
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
      if (
        a.practical &&
        typeof a.practical === "object" &&
        !Array.isArray(a.practical)
      ) {
        answer.practical = {};
        for (const [stepId, value] of Object.entries(a.practical).slice(
          0,
          40,
        ) as [string, any][]) {
          if (
            !/^[a-zA-Z0-9_-]{1,40}$/.test(stepId) ||
            !value ||
            typeof value !== "object"
          )
            continue;
          const state: NonNullable<Answer["practical"]>[string] = {
            confirmed: value.confirmed === true,
          };
          if (
            value.choices &&
            typeof value.choices === "object" &&
            !Array.isArray(value.choices)
          )
            state.choices = Object.fromEntries(
              Object.entries(value.choices).filter(
                ([key, n]) =>
                  /^(count|length)\d+$/.test(key) &&
                  Number.isInteger(n) &&
                  Number(n) > 0 &&
                  Number(n) <= 100,
              ),
            ) as Record<string, number>;
          if (
            Array.isArray(value.counts) &&
            value.counts.length <= 100 &&
            value.counts.every(
              (n: unknown) =>
                Number.isInteger(n) && Number(n) >= -1 && Number(n) <= 100,
            )
          )
            state.counts = value.counts;
          if (
            Array.isArray(value.edges) &&
            value.edges.length <= 500 &&
            value.edges.every(
              (e: unknown) => typeof e === "string" && /^\d+-\d+$/.test(e),
            )
          )
            state.edges = value.edges;
          if (Array.isArray(value.strokes))
            state.strokes = value.strokes
              .slice(0, 200)
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
                    (p: any) =>
                      p &&
                      Number.isFinite(p.x) &&
                      Number.isFinite(p.y) &&
                      p.x >= 0 &&
                      p.x <= 1 &&
                      p.y >= 0 &&
                      p.y <= 1,
                  ),
              }));
          answer.practical[stepId] = state;
        }
      }
      answers[id] = answer;
    }
    const page =
      Number.isInteger(p.page) && p.page >= 1 && p.page <= pages.length
        ? p.page
        : 1;
    let requestedBlock = p.block;
    if (!p.contentRevision || p.contentRevision < 2) {
      const removedIntro = [
        11, 12, 14, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28, 29,
      ];
      if (
        Number.isInteger(requestedBlock) &&
        removedIntro.includes(page) &&
        !(page === 11 && requestedBlock >= 6)
      )
        requestedBlock = Math.max(0, requestedBlock - 1);
      const children = answers["p011-lesson01"];
      if (children?.responses?.q4)
        children.responses = {
          ...children.responses,
          q2: children.responses.q4,
        };
    }
    if (
      p.contentRevision !== 3 &&
      Number.isInteger(requestedBlock) &&
      requestedBlock >= 0 &&
      requestedBlock < (revision2Steps[page]?.length ?? 0)
    ) {
      const previous = revision2Steps[page]?.[requestedBlock];
      const current = pages[page - 1].blocks.findIndex(
        (b) => b.id === previous,
      );
      if (current >= 0) requestedBlock = current;
      else {
        const following = revision2Steps[page]?.slice(requestedBlock + 1) ?? [];
        const next = following
          .map((id) => pages[page - 1].blocks.findIndex((b) => b.id === id))
          .find((i) => i >= 0);
        requestedBlock = next ?? 0;
      }
    }
    const block =
      Number.isInteger(requestedBlock) &&
      requestedBlock >= 0 &&
      requestedBlock < pages[page - 1].blocks.length
        ? requestedBlock
        : 0;
    return { version: 1, contentRevision: 3, page, block, answers };
  } catch {
    return fallback;
  }
}
