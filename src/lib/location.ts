import type { Answer, Block } from "../content/types.ts";

export type LocationBlock = Extract<Block, { kind: "location" }>;
export type LocationAxis = "vertical" | "horizontal";
export const locationOptions = {
  vertical: ["Вверху", "Внизу"],
  horizontal: ["Слева", "Справа"],
} as const;

export function locationCorrect(
  block: LocationBlock,
  answer?: Answer,
): boolean {
  return (
    answer?.responses?.vertical === block.location.vertical &&
    answer?.responses?.horizontal === block.location.horizontal
  );
}

export function locationStage(
  block: LocationBlock,
  answer: Answer,
): LocationAxis | "complete" {
  if (answer.responses?.vertical !== block.location.vertical) return "vertical";
  return locationCorrect(block, answer) ? "complete" : "horizontal";
}

export function selectLocationAnswer(
  block: LocationBlock,
  answer: Answer,
  axis: LocationAxis,
  value: string,
): Answer {
  if (!(locationOptions[axis] as readonly string[]).includes(value))
    return answer;
  if (axis === "horizontal" && locationStage(block, answer) === "vertical")
    return answer;
  const responses = { ...answer.responses, [axis]: value };
  if (axis === "vertical") delete responses.horizontal;
  return {
    ...answer,
    value: undefined,
    responses,
    reviewed: false,
    checked: axis === "horizontal",
  };
}
