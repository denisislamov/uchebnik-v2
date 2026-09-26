import React, { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Line, Path, Pattern, Rect } from "react-native-svg";
import { colors as c } from "../theme";
export const CELL = 24;
export const MARGIN = 40;
/** Клетчатый лист под содержимым. Поля рисуются только на широких экранах. */
export function NotebookPaper({ margin = false }: { margin?: boolean }) {
  const id = `cells${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={id}
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
        {margin && (
          <Line
            x1={MARGIN + 0.5}
            y1={0}
            x2={MARGIN + 0.5}
            y2="100%"
            stroke={c.margin}
            strokeWidth={1.5}
          />
        )}
      </Svg>
    </View>
  );
}
