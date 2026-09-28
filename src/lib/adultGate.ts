/**
 * The way to the adults' part: a number written in words, to be typed in
 * digits. A child who cannot read yet does not pass by pressing at random:
 * of a hundred two-digit numbers one fits.
 */
const tens = [
  "двадцать",
  "тридцать",
  "сорок",
  "пятьдесят",
  "шестьдесят",
  "семьдесят",
  "восемьдесят",
  "девяносто",
];
const units = [
  "один",
  "два",
  "три",
  "четыре",
  "пять",
  "шесть",
  "семь",
  "восемь",
  "девять",
];
export type GateQuestion = { words: string; answer: string };
/** `pick` is a number from 0 up to, not including, 1: `Math.random()` in the app. */
export function gateQuestion(pick: number): GateQuestion {
  const n = Math.min(71, Math.max(0, Math.floor(pick * 72)));
  const t = Math.floor(n / 9),
    u = n % 9;
  return {
    words: `${tens[t]} ${units[u]}`,
    answer: String((t + 2) * 10 + u + 1),
  };
}
export const gatePassed = (question: GateQuestion, typed: string) =>
  typed === question.answer;
