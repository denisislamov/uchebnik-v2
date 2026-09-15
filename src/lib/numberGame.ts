import type {
  HiddenCardRound,
  NumberGameSpec,
} from "../content/numberGameTypes.ts";
import type { Answer } from "../content/types.ts";

export function numberGameRoundCorrect(
  round: HiddenCardRound,
  value?: string,
): boolean {
  if (!value || !/^\d+$/.test(value.trim())) return false;
  const hidden = Number(value.trim());
  return (
    Number.isSafeInteger(hidden) &&
    hidden >= 0 &&
    Number.isSafeInteger(round.visible) &&
    round.visible >= 0 &&
    Number.isSafeInteger(round.total) &&
    round.total >= round.visible &&
    round.visible + hidden === round.total
  );
}

export function numberGameCorrect(
  block: NumberGameSpec,
  answer?: Answer,
): boolean {
  const spec = block.numberGame;
  const responses = answer?.responses ?? {};
  if (spec.mode === "guess") {
    return (
      spec.rounds.length > 0 &&
      spec.rounds.every(
        (round) =>
          responses[`${round.id}:confirmed`] === "yes" &&
          numberGameRoundCorrect(round, responses[round.id]),
      )
    );
  }
  return (
    spec.items.length > 0 &&
    spec.items.every(
      (item) =>
        item.options.includes(item.expected) &&
        responses[item.id] === item.expected,
    )
  );
}

export function setNumberGameResponse(
  block: NumberGameSpec,
  answer: Answer,
  id: string,
  value: string,
): Answer {
  const spec = block.numberGame;
  const entries = spec.mode === "guess" ? spec.rounds : spec.items;
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) return answer;
  const responses = { ...answer.responses, [id]: value };
  if (spec.mode === "guess") {
    for (const round of spec.rounds.slice(index)) {
      delete responses[`${round.id}:confirmed`];
      if (round.id !== id) delete responses[round.id];
    }
  }
  return { ...answer, responses, checked: false };
}

export function confirmNumberGameRound(
  block: NumberGameSpec,
  answer: Answer,
  id: string,
): Answer {
  const spec = block.numberGame;
  if (spec.mode !== "guess") return answer;
  const index = spec.rounds.findIndex((round) => round.id === id);
  const responses = answer.responses ?? {};
  if (index < 0 || !numberGameRoundCorrect(spec.rounds[index], responses[id]))
    return answer;
  if (
    !spec.rounds
      .slice(0, index)
      .every(
        (round) =>
          responses[`${round.id}:confirmed`] === "yes" &&
          numberGameRoundCorrect(round, responses[round.id]),
      )
  )
    return answer;
  return {
    ...answer,
    responses: { ...responses, [`${id}:confirmed`]: "yes" },
    checked: false,
  };
}
