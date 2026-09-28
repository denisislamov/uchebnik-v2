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
    fit,
    tall,
    measured: compact ? 0 : measured,
    /** Illustration next to something to answer. */
    picture: compact
      ? clamp(height * 0.3, 170, 280)
      : clamp(height - 470 - extra, 180, 1400),
    /** Illustration of a step that is only looked at. */
    read: compact
      ? clamp(height * 0.4, 220, 360)
      : clamp(height - 400 - extra, 220, 1400),
    /** Picture that is itself the answer: it gets the most room. */
    target: compact
      ? clamp(height * 0.42, 240, 420)
      : clamp(height - 470 - extra, 200, 1400),
    /** Sample beside the work on a wide window: the column's height. */
    beside: clamp(height - 330 - extra, 200, 1400),
  };
}
/** A mouse or trackpad: targets may be smaller than a fingertip. */
export function finePointer() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(pointer: fine)").matches
  );
}
