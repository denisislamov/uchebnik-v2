export type CounterLayoutMode = "row" | "groups";
export type CounterBoardGeometry = {
  width: number;
  columns: number;
  fieldHeight: number;
  supplyTop: number;
  scrollX: number;
  centers: { x: number; y: number }[];
};

/** The row grows with placed objects only; no expected count enters layout. */
export function counterBoardLayout(
  viewportWidth: number,
  count: number,
  layout: CounterLayoutMode = "groups",
  /** An empty field's height; a laptop window asks for a lower one. */
  minFieldHeight = 190,
): CounterBoardGeometry {
  const viewport = Math.max(48, viewportWidth);
  const placed = Math.max(0, Math.floor(count));
  const row = layout === "row";
  const columns = row
    ? Math.max(1, placed)
    : Math.max(1, Math.min(4, Math.floor(viewport / 52)));
  const width = row ? Math.max(viewport, placed * 58 + 14) : viewport;
  const fieldHeight = row
    ? 100
    : Math.max(
        minFieldHeight,
        Math.ceil(Math.max(placed, 1) / columns) * 58 + 16,
      );
  return {
    width,
    columns,
    fieldHeight,
    supplyTop: fieldHeight + 25,
    scrollX: row ? Math.max(0, width - viewport) : 0,
    centers: Array.from({ length: placed }, (_, i) =>
      row
        ? { x: 36 + i * 58, y: 50 }
        : {
            x: (((i % columns) + 0.5) * viewport) / columns,
            y: 34 + Math.floor(i / columns) * 58,
          },
    ),
  };
}

/** Keep the draggable supply in the viewport while the whole row can scroll. */
export function counterSupplyCenter(
  board: Pick<CounterBoardGeometry, "width" | "supplyTop">,
  viewportWidth: number,
  scrollOffset = 0,
): { x: number; y: number } {
  const viewport = Math.max(48, viewportWidth);
  const offset = Math.max(
    0,
    Math.min(Math.max(0, board.width - viewport), scrollOffset),
  );
  return { x: offset + viewport / 2, y: board.supplyTop + 52 };
}
