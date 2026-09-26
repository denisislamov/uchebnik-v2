export type PartColor = "green" | "red";
export const partPalette = {
  green: { fill: "#5d863d", label: "Зелёные" },
  red: { fill: "#cb4538", label: "Красные" },
};
export function compositionCounts(
  left: number,
  right: number,
  total: number,
): [number, number] {
  const safe = (n: number) =>
    Number.isInteger(n) && n >= 0 && n <= total ? n : 0;
  const parts: [number, number] = [safe(left), safe(right)];
  return parts[0] + parts[1] <= total ? parts : [0, 0];
}
/** Source positions or an adjacent strip, within a field whose size stays fixed. */
export function compositionLayout(
  width: number,
  total: number,
  pattern?: [number, number][],
) {
  const positions =
    pattern ??
    Array.from({ length: total }, (_, i): [number, number] => [i, 0]);
  const columns = Math.max(...positions.map((p) => p[0])) + 1;
  const rows = Math.max(...positions.map((p) => p[1])) + 1;
  const cell = Math.min(42, (width - 24) / columns, 84 / rows);
  const x = (width - columns * cell) / 2;
  const y = (rows === 1 ? 68 : 58) - ((rows - 1) * cell) / 2;
  return {
    cell,
    x,
    y,
    center: (index: number) => ({
      x: x + (positions[index][0] + 0.5) * cell,
      y: y + positions[index][1] * cell,
    }),
  };
}
