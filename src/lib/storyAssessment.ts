import type {
  StoryOperand,
  StorySpec,
  StoryVariant,
} from "../content/storyTypes.ts";

type Responses = Record<string, string>;
export const storyNumber = (value?: string): number | undefined =>
  value !== undefined && /^\d+$/.test(value.trim()) ? Number(value) : undefined;

export function storyInputs(spec: StorySpec, variant: StoryVariant) {
  return [...(spec.story.inputs ?? []), ...(variant.inputs ?? [])];
}
export function storyOperand(
  operand: StoryOperand,
  responses: Responses,
): number | undefined {
  if (typeof operand === "number") return operand;
  return storyNumber(
    responses["input" in operand ? operand.input : `${operand.result}Result`],
  );
}
export function storyCorrect(
  spec: StorySpec,
  answer?: { responses?: Responses },
): boolean {
  const r = answer?.responses ?? {};
  if (spec.story.requiredVariants)
    return (
      spec.story.variants.length > 0 &&
      spec.story.variants.every((variant) =>
        storyCorrect(requiredStorySpec(spec, variant), {
          responses: requiredStoryResponses(r, variant.id),
        }),
      )
    );
  const variant = spec.story.variants.find((v) => v.id === r.storyVariant);
  if (!variant || r.storyUnit !== spec.story.unit) return false;
  if (
    !storyInputs(spec, variant).every((input) => {
      const value = storyNumber(r[input.id]);
      return (
        value !== undefined &&
        value >= (input.min ?? 1) &&
        value <= (input.max ?? spec.story.max)
      );
    })
  )
    return false;
  const previous = new Set<string>();
  for (const step of variant.steps) {
    for (const operand of [step.left, step.right]) {
      if (
        typeof operand !== "number" &&
        "result" in operand &&
        !previous.has(operand.result)
      )
        return false;
    }
    const a = storyOperand(step.left, r),
      b = storyOperand(step.right, r);
    const answer = storyNumber(r[`${step.id}Result`]);
    if (
      a === undefined ||
      b === undefined ||
      answer === undefined ||
      r[`${step.id}Operator`] !== step.operator
    )
      return false;
    const result =
      step.operator === "+"
        ? a + b
        : step.operator === "−"
          ? a - b
          : step.operator === "×"
            ? a * b
            : a / b;
    if (
      !Number.isInteger(result) ||
      result < 0 ||
      result > spec.story.max ||
      result !== answer
    )
      return false;
    previous.add(step.id);
  }
  return variant.steps.length > 0;
}

export function requiredStorySpec(
  spec: StorySpec,
  variant: StoryVariant,
): StorySpec {
  return {
    story: {
      ...spec.story,
      requiredVariants: false,
      unit: variant.unit ?? spec.story.unit,
      variants: [variant],
    },
  };
}
export function requiredStoryResponses(
  responses: Responses,
  variantId: string,
): Responses {
  const prefix = `${variantId}__`;
  return Object.fromEntries(
    Object.entries(responses)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]),
  );
}
export function selectStoryVariant(
  responses: Responses,
  variantId: string,
): Responses {
  return responses.storyVariant === variantId
    ? responses
    : { storyVariant: variantId };
}
