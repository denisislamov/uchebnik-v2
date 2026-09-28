import React, { useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors as c } from "../theme";
import {
  handLine,
  handRandom,
  handRect,
  CELL,
  upToCells,
  wholeCells,
  type HandStroke,
} from "../lib/grid";

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

/**
 * Things standing side by side, a cell apart: each is a whole number of cells
 * wide, as many as the row has room for. Returns what to hand to the row's
 * `onLayout` and the width of one column, or nothing until the row is measured.
 */
export function useColumns(count: number) {
  const [width, setWidth] = useState(0);
  return [
    (e: { nativeEvent: { layout: { width: number } } }) => {
      const w = e.nativeEvent.layout.width;
      setWidth((old) => (Math.abs(w - old) > 0.5 ? w : old));
    },
    width > 0 ? wholeCells((width - (count - 1) * CELL) / count) : undefined,
  ] as const;
}
/**
 * A block whose height is its own business — a picture, a drawing sheet, a
 * board with counters — takes a whole number of rows, so that what is written
 * under it starts on a line again. The spare part of the last row stays empty
 * below the block (or around it, when the block is centred in a frame).
 */
export const Rows = React.forwardRef<
  View,
  {
    children: React.ReactNode;
    /** The frame: it is this box that stands on the lines. */
    style?: StyleProp<ViewStyle>;
    /** How the contents are laid out inside. */
    contentStyle?: StyleProp<ViewStyle>;
    /** Drawn around the frame itself, not around the contents. */
    frame?: React.ReactNode;
    /**
     * A thing lying on the sheet — a board, a tray, a drawing — not writing:
     * what is inside it is placed by the thing itself.
     */
    object?: boolean;
    testID?: string;
  }
>(function Rows(
  { children, style, contentStyle, frame: outline, object, testID },
  ref,
) {
  const [height, setHeight] = useState(0);
  const content = useRef<View>(null);
  const frame = StyleSheet.flatten(style) ?? {};
  // The frame's own padding is counted in: it is part of its height.
  const around =
    Number(frame.paddingTop ?? frame.paddingVertical ?? frame.padding ?? 0) +
    Number(frame.paddingBottom ?? frame.paddingVertical ?? frame.padding ?? 0);
  return (
    <View
      ref={ref}
      collapsable={false}
      testID={testID}
      {...(object && ({ dataSet: { sheet: "object" } } as object))}
      style={[style, height > 0 && { minHeight: upToCells(height + around) }]}
    >
      {outline}
      <View
        ref={content}
        style={contentStyle}
        onLayout={(e) => {
          // In a browser the event may report a size the contents have
          // already outgrown (a picture that was still loading): the
          // element itself is asked, now and once the frame has settled.
          const reported = e.nativeEvent.layout.height;
          const measure = () => {
            const node = content.current as unknown as HTMLElement | null;
            const h =
              Platform.OS === "web" && node?.getBoundingClientRect
                ? node.getBoundingClientRect().height
                : reported;
            setHeight((old) => (Math.abs(h - old) > 0.5 ? h : old));
          };
          measure();
          if (Platform.OS === "web") requestAnimationFrame(measure);
        }}
      >
        {children}
      </View>
    </View>
  );
});
