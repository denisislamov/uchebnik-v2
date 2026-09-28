import { CELL } from "./grid.ts";

/**
 * Fitting a task to the window, a look at a time.
 *
 * Off a phone a task is laid out so that it ends at the bottom of its pane:
 * the room left under it is handed to its picture or its sheet, an overflow
 * is taken back. What the task does with the room it is given is its own
 * business — a picture grows by as much, a board stops at its largest size,
 * a list of questions takes nothing — so the room is handed over and the
 * task is looked at again, until it fits or there is nothing more to try.
 */
export type Fit = {
  /** Rows handed to the task so far, in px; negative when taken back. */
  extra: number;
  /** Where the task ended at the last look. */
  seen: number;
  /** Looks in a row at which the task had not answered. */
  idle: number;
  /** Whether anything has been handed over since the step was opened. */
  handed: boolean;
};
export const LEAST = -600,
  MOST = 900;
export const startFit = (extra = 0): Fit => ({
  extra,
  seen: -1,
  idle: 0,
  handed: false,
});
/**
 * One look: `bottom` is where the task ends, `pane` how high its pane is.
 * Returns what to hand over now, whether the task may be shown and whether
 * to look again.
 */
export function fitLook(
  fit: Fit,
  bottom: number,
  pane: number,
  looksLeft: number,
): { fit: Fit; show: boolean; again: boolean } {
  // A row is kept empty under the task.
  const slack = pane - bottom - CELL;
  const still = Math.abs(bottom - fit.seen) < 1;
  // The task is laid out in rows of the sheet, so room is handed over a row
  // at a time: less than a row of it stays under the task.
  if (slack > -6 && slack < CELL) {
    // It fits; shown once it has stood still from one look to the next, not
    // while a picture or a frame is still finding its size.
    const show = still || looksLeft <= 0;
    return { fit: { ...fit, seen: bottom, idle: 0 }, show, again: !show };
  }
  let rows = Math.floor(slack / CELL) * CELL,
    idle = 0;
  if (fit.handed && still) {
    idle = fit.idle + 1;
    if (slack > 0) {
      // Room that nothing on this step takes. A board may need a few frames
      // to answer, so it is looked at once more before it is shown.
      const show = idle >= 2 || looksLeft <= 0;
      return { fit: { ...fit, idle }, show, again: !show };
    }
    // It does not fit and nothing has given way yet: a board at its largest
    // size answers only when enough is taken back, so more is taken each time.
    rows *= 2 ** idle;
  }
  const extra = Math.max(LEAST, Math.min(MOST, fit.extra + rows));
  // Nothing more to try: shown as it is, and scrolled if it is too long.
  const spent = extra === fit.extra;
  const show = spent || looksLeft <= 0;
  return {
    fit: { extra, seen: bottom, idle, handed: true },
    show,
    again: !show,
  };
}
