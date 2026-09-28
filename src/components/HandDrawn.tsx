import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors as c } from "../theme";
import { handLine, handRandom, handRect, type HandStroke } from "../lib/grid";

// Strokes may run past the corner; the drawing is that much larger than the box.
const BLEED = 4;
/**
 * A frame drawn with a pen around its parent, in place of a CSS border: the
 * parent keeps its size and its place on the grid, the line is a little
 * uneven. Put it first among the children.
 */
export function HandFrame({
  seed,
  color = c.line,
  strokeWidth = 1.5,
  dashed = false,
  ...stroke
}: {
  seed: string;
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
} & HandStroke) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="hand-frame"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== size.width || height !== size.height)
          setSize({ width, height });
      }}
    >
      {size.width > 0 && (
        <Svg
          width={size.width + BLEED * 2}
          height={size.height + BLEED * 2}
          viewBox={`${-BLEED} ${-BLEED} ${size.width + BLEED * 2} ${size.height + BLEED * 2}`}
          style={{ position: "absolute", left: -BLEED, top: -BLEED }}
        >
          <Path
            d={handRect(size.width, size.height, seed, stroke)}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={dashed ? "7 5" : undefined}
            fill="none"
          />
        </Svg>
      )}
    </View>
  );
}
/** A line drawn under a heading along the ruled line of the page. */
export function HandRule({
  seed,
  width,
  color = c.pen,
  strokeWidth = 1.5,
}: {
  seed: string;
  width: number;
  color?: string;
  strokeWidth?: number;
}) {
  if (width <= 0) return null;
  return (
    <Svg
      pointerEvents="none"
      width={width + BLEED * 2}
      height={BLEED * 2}
      viewBox={`${-BLEED} ${-BLEED} ${width + BLEED * 2} ${BLEED * 2}`}
      style={{ position: "absolute", left: -BLEED, bottom: -BLEED }}
    >
      <Path
        d={handLine(0, 0, width, 0, handRandom(seed), { wobble: 1.2 })}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
