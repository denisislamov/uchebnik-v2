import React, { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Line, Path, Pattern, Rect } from "react-native-svg";
import { colors as c } from "../theme";
import { CELL } from "../lib/grid";
export { CELL };
/** The red margin stands one cell to the left of the writing. */
export const MARGIN = CELL;
/**
 * Клетчатый лист под содержимым. `origin` — левый край колонки с текстом:
 * линии клеток отсчитываются от него, и всё, что меряется клетками, ложится
 * на линии при любой ширине окна. Поля рисуются только на широких экранах.
 */
export function NotebookPaper({
  margin = false,
  origin = 0,
}: {
  margin?: boolean;
  origin?: number;
}) {
  const id = `cells${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const shift = ((origin % CELL) + CELL) % CELL;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="notebook-paper"
      style={StyleSheet.absoluteFill}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={id}
            x={shift}
            y={0}
            width={CELL}
            height={CELL}
            patternUnits="userSpaceOnUse"
          >
            <Path
              d={`M ${CELL} 0.5 H 0.5 V ${CELL}`}
              fill="none"
              stroke={c.grid}
              strokeWidth={1}
            />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
        {margin && origin >= MARGIN * 2 && (
          <Line
            x1={origin - MARGIN + 0.5}
            y1={0}
            x2={origin - MARGIN + 0.5}
            y2="100%"
            stroke={c.margin}
            strokeWidth={1.5}
          />
        )}
      </Svg>
    </View>
  );
}
