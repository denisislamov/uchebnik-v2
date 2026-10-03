import { createContext, useContext } from "react";
import { Platform } from "react-native";
import { useSheetWindow } from "../lib/settledWindow";
const clamp = (v: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, v)));
/**
 * How much of the screen a task's illustration may take. On a tablet or a
 * computer the whole task — header, prompt, picture, answer, «Дальше» — is
 * fitted to the window height, whatever the height: a fixed threshold left a
 * tall MacBook window with the old, roomier layout that did not fit either.
 * A phone scrolls, and keeps its picture to a share of the screen.
 */
/**
 * Room the formulas left unused (or overdrew) on this step, measured once the
 * step is laid out: the budgets below are for the heaviest task, and a lighter
 * one would leave the bottom of the window empty.
 */
export const TaskFitExtra = createContext(0);
export function useTaskSize() {
  const { width, height } = useSheetWindow();
  const measured = useContext(TaskFitExtra);
  const compact = width < 600,
    wide = width >= 1000,
    // Tablet or computer: the lesson header folds and the task fits the window.
    fit = !compact,
    // Only a really tall window can afford the larger headings.
    tall = wide && height >= 1000,
    // Headings take ~40px more on a tall window.
    extra = (tall ? 40 : 0) - (compact ? 0 : measured);
  return {
    compact,
    wide,
    landscape: width > height,
    fit,
    tall,
    measured: compact ? 0 : measured,
    // On a phone a task that can be seen whole — a picture with a few
    // answers under it — is fitted to the screen too (see `fitsPhone`): the
    // picture gives up rows, down to four of them, until the answers are in
    // view, or takes the rows a tall screen leaves. Any other task scrolls,
    // and its picture keeps its share.
    /** Illustration next to something to answer. */
    picture: compact
      ? clamp(
          height * 0.3 + measured,
          measured ? 96 : 170,
          measured ? 420 : 280,
        )
      : clamp(height - 470 - extra, 180, 1400),
    /** Illustration of a step that is only looked at. */
    read: compact
      ? clamp(
          height * 0.4 + measured,
          measured ? 96 : 220,
          measured ? 480 : 360,
        )
      : clamp(height - 400 - extra, 220, 1400),
    /** Picture that is itself the answer: it gets the most room. */
    target: compact
      ? clamp(
          height * 0.42 + measured,
          measured ? 120 : 240,
          measured ? 480 : 420,
        )
      : clamp(height - 470 - extra, 200, 1400),
    /** Sample beside the work on a wide window: the column's height. */
    beside: clamp(height - 330 - extra, 200, 1400),
  };
}
/**
 * Tasks a phone shows whole: what is asked, the picture and every answer are
 * seen at once, because a child who cannot see an answer does not look for
 * it. Boards, drawing sheets and lists of questions are longer than a phone
 * and are scrolled.
 */
export const fitsPhone = (kind: string) =>
  ["number", "choice", "location", "picture", "read"].includes(kind);
/** A mouse or trackpad: targets may be smaller than a fingertip. */
export function finePointer() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(pointer: fine)").matches
  );
}
