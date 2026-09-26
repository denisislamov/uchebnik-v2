import { relationPlan } from "./relationDrawing.ts";
import { traceProgress } from "./tracing.ts";
import type { Answer, Block, ComposeRule } from "../content/types.ts";
import { calculate } from "./arithmetic.ts";
export const numeric = (v?: string) =>
  v !== undefined && /^\d+$/.test(v.trim()) ? Number(v) : undefined;
export function compositionCorrect(
  rule: ComposeRule,
  a?: string,
  b?: string,
  result?: string,
): boolean {
  const x = numeric(a),
    y = numeric(b),
    z = numeric(result);
  if (
    x === undefined ||
    y === undefined ||
    z === undefined ||
    x < 1 ||
    y < 1 ||
    x > rule.max ||
    y > rule.max ||
    z < 0 ||
    z > rule.max
  )
    return false;
  return (
    (rule.left === undefined || x === rule.left) &&
    (rule.right === undefined || y === rule.right) &&
    (rule.result === undefined || z === rule.result) &&
    calculate(`${x}${rule.operator}${y}`) === z
  );
}
export function courseCorrect(block: Block, answer?: Answer): boolean {
  const r = answer?.responses ?? {};
  if (block.kind === "targetGame")
    return Number(r.score0) >= 100 || Number(r.score1) >= 100;
  if (block.kind === "recipe") {
    if (
      !(
        block.unit
          ? [block.unit]
          : [
              "яблоки",
              "книги",
              "карандаши",
              "метры",
              "рубли",
              "литры",
              "килограммы",
            ]
      ).includes(r.story)
    )
      return false;
    if (block.formula === "a*b/c" && Number(r.a) * Number(r.b) > block.max)
      return false;
    const names = [...new Set(block.formula.match(/[abc]/g) ?? [])];
    if (
      block.excludedInputs &&
      Object.entries(block.excludedInputs).every(
        ([key, value]) => numeric(r[key]) === value,
      )
    )
      return false;
    if (
      !names.every(
        (k) =>
          numeric(r[k]) !== undefined &&
          Number(r[k]) > 0 &&
          Number(r[k]) <= block.max,
      )
    )
      return false;
    const result = calculate(block.formula.replace(/[abc]/g, (k) => r[k]));
    return (
      result !== undefined &&
      result >= (block.minResult ?? 0) &&
      result <= block.max &&
      numeric(r.result) === result
    );
  }
  if (block.kind === "relation") {
    const a = numeric(r.left),
      b = numeric(r.right);
    return (
      a !== undefined &&
      b !== undefined &&
      a > 0 &&
      b > 0 &&
      b === a + block.difference &&
      traceProgress(relationPlan(block, answer!), answer?.strokes).done
    );
  }
  if (block.kind === "work")
    return block.fields.every(
      (f) =>
        r[f.id]?.trim().toLocaleLowerCase("ru") ===
        f.expected.toLocaleLowerCase("ru"),
    );
  if (block.kind === "compose") {
    const seen = new Set<string>();
    return block.rules.every((rule, i) => {
      const ok = compositionCorrect(rule, r[`${i}a`], r[`${i}b`], r[`${i}c`]);
      const key = `${rule.operator}:${r[`${i}a`]}:${r[`${i}b`]}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return (
        ok &&
        (!block.story ||
          (storySubjects.includes(r[`${i}story`]) &&
            r[`${i}question`] ===
              composeStory(rule.operator, r[`${i}story`]).question))
      );
    });
  }
  if (block.kind === "activity") {
    const a = block.activity;
    return a.targets.every((target, i) => {
      if (a.mode === "coins" && a.exchange) {
        const coins = (r[`${i}coins`] ?? "")
          .split(",")
          .filter(Boolean)
          .map(Number);
        return (
          coins.length > 1 &&
          coins.every(
            (n) =>
              Number.isInteger(n) &&
              n > 0 &&
              n < target &&
              (a.denominations ?? [1, 2, 3, 5, 10, 15, 20]).includes(n),
          ) &&
          coins.reduce((x, y) => x + y, 0) === target &&
          numeric(r[String(i)]) === target
        );
      }
      if (a.slots) {
        const indices = (r[`${i}slots`] || "")
          .split(",")
          .filter(Boolean)
          .map(Number);
        return (
          numeric(r[String(i)]) === target &&
          indices.length === a.slots.length &&
          new Set(indices).size === a.slots.length &&
          indices.every(
            (v) => Number.isInteger(v) && v >= 0 && v < a.slots!.length,
          )
        );
      }
      if (a.mode === "groups") {
        const amounts = Array.from(
          { length: a.groups ?? 2 },
          (_, g) => numeric(r[`${i}g${g}`]) ?? 0,
        );
        return (
          amounts.every((v) => v === target / (a.groups ?? 2)) &&
          amounts.reduce((x, y) => x + y, 0) === target
        );
      }
      if (a.mode === "composition") {
        const x = numeric(r[`${i}left`]),
          y = numeric(r[`${i}right`]);
        return (
          x !== undefined &&
          y !== undefined &&
          x > 0 &&
          y > 0 &&
          x + y === target &&
          (!a.fixedParts || (x === a.fixedParts[0] && y === a.fixedParts[1])) &&
          (!a.differentFrom ||
            x !== a.differentFrom[0] ||
            y !== a.differentFrom[1])
        );
      }
      if (a.mode === "place")
        return (
          numeric(r[`${i}tens`]) === Math.floor(target / 10) &&
          numeric(r[`${i}ones`]) === target % 10
        );
      if (a.mode === "sequence") return r[`${i}visited`] === "yes";
      return numeric(r[String(i)]) === target;
    });
  }
  return false;
}
import { composeStory, storySubjects } from "./composeStory.ts";
