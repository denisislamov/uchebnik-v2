export const COACH_STORAGE_KEY = "uchebnik:gesture-coach:v1";
export const COACH_FAMILIES = [
  "place",
  "trace",
  "dot",
  "sticks",
  "cards",
  "picture",
] as const;
export type CoachFamily = (typeof COACH_FAMILIES)[number];
export type CoachRect = { x: number; y: number; width: number; height: number };
export function readSeenCoaches(raw: string | null): CoachFamily[] {
  try {
    const data: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(data)
      ? COACH_FAMILIES.filter((v) => data.includes(v))
      : [];
  } catch {
    return [];
  }
}
/** Clip to the visible target. Never move a spotlight away from the actual object. */
export function coachSpotlight(
  rect: CoachRect,
  width: number,
  height: number,
  cardSpace = 225,
): CoachRect | null {
  const bottom = Math.max(0, height - cardSpace);
  if (
    rect.x >= width - 8 ||
    rect.x + rect.width <= 8 ||
    rect.y >= bottom ||
    rect.y + rect.height <= 12
  )
    return null;
  const x = Math.max(8, rect.x - 8),
    y = Math.max(12, rect.y - 8);
  const right = Math.min(width - 8, rect.x + rect.width + 8);
  const end = Math.min(bottom, rect.y + rect.height + 8);
  return { x, y, width: right - x, height: end - y };
}
