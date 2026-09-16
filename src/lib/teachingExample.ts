export function exampleGroups(kind: string, values: number[], expression = "") {
  if (kind === "count" && /[−–-]/.test(expression) && values.length === 2)
    return [{ count: values[0], removed: values[1] }];
  return values.map((count) => ({ count, removed: 0 }));
}
export function exampleSelected(
  kind: string,
  group: number,
  item: number,
  active?: number,
) {
  return (
    kind !== "ruler" &&
    active !== undefined &&
    (kind === "count" ? item === active : group === active)
  );
}
