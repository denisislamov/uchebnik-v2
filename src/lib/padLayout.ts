/** A fingertip target: below this a phone cannot hit a dot or a line end. */
export const MIN_CELL_PX = 44;
/**
 * Cell size for a drawing sheet. Cells never shrink below the container rule,
 * grow to a fingertip on narrow screens, and stay small enough for the widest
 * target of the plan to fit on screen with a cell of margin on each side —
 * the sheet scrolls sideways to the current target, but a target itself must
 * never be wider than the viewport. `fit` keeps a sheet on a wide but short
 * screen within the window, down to `minCell` (a pointer, not a fingertip).
 */
export function padCellSize(
  containerWidth: number,
  columns: number,
  widestTargetCells: number,
  fit?: { height: number; rows: number; minCell: number },
): number {
  const fromContainer = containerWidth / columns;
  const fitWidest =
    widestTargetCells > 0
      ? Math.max(1, (containerWidth - 16) / (widestTargetCells + 1))
      : MIN_CELL_PX;
  const cell = Math.max(fromContainer, Math.min(MIN_CELL_PX, fitWidest));
  if (!fit) return cell;
  return Math.min(cell, Math.max(fit.minCell, fit.height / fit.rows));
}
/** Horizontal extent of a target, in cells. */
export function targetSpanCells(
  points: { x: number }[],
  columns: number,
): number {
  if (!points.length) return 0;
  const xs = points.map((p) => p.x * columns);
  return Math.max(...xs) - Math.min(...xs);
}
