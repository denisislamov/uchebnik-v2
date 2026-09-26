import type { Point } from "../content/types.ts";

export function nextCounterSlot(
  slots: Point[] | undefined,
  occupied: number[],
) {
  return slots?.find((_, index) => !occupied.includes(index));
}

export function nextDigitCard(value: number[], expected?: number[]) {
  const index = [0, 1].find((i) =>
    expected ? value[i] !== expected[i] : !(value[i] >= 0),
  );
  if (index === undefined) return undefined;
  return { index: index as 0 | 1, digit: expected?.[index] ?? 1 };
}
