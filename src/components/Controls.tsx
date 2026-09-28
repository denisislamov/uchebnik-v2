import React, { useState } from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors as c, fonts as f } from "../theme";
import { CELL, upToCells } from "../lib/grid";
import { HandFrame } from "./HandDrawn";
/** `done`: the action already succeeded — flat, no pen lip, not pressable, still fully legible. */
export function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
  done = false,
  label,
  small = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  done?: boolean;
  label?: string;
  small?: boolean;
}) {
  // A button is two cells high and a whole number of cells wide: once its
  // words are measured, it is widened to the next line of the sheet.
  const words = typeof children === "string" ? children : "";
  const [fit, setFit] = useState({ words, width: 0 });
  return (
    <Pressable
      onLayout={(e) => {
        const width = upToCells(e.nativeEvent.layout.width);
        if (fit.words !== words || Math.abs(width - fit.width) > 0.5)
          setFit({ words, width });
      }}
      testID={done ? "button-done" : undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || done }}
      disabled={disabled || done}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        small && s.small,
        done && s.done,
        fit.words === words && fit.width > 0 && { minWidth: fit.width },
        disabled && !done && { opacity: 0.45 },
        pressed && !done && (secondary ? s.secondaryPressed : s.pressed),
      ]}
    >
      <Text
        style={[s.label, secondary && s.secondaryLabel, done && s.doneLabel]}
      >
        {children}
      </Text>
    </Pressable>
  );
}
/**
 * Anything pressed that holds words — a chip, an option — is widened to a
 * whole number of cells, as a button is.
 */
export function CellPressable({
  style,
  ...props
}: React.ComponentProps<typeof Pressable>) {
  const [width, setWidth] = useState(0);
  return (
    <Pressable
      {...props}
      onLayout={(e) => {
        const w = upToCells(e.nativeEvent.layout.width);
        if (Math.abs(w - width) > 0.5) setWidth(w);
      }}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        width > 0 && { minWidth: width },
      ]}
    />
  );
}
/**
 * «Попробуй ещё раз»: не красная отметка учителя, а заметка карандашом —
 * своя краска, пунктирная рамка и круглый значок со стрелкой по кругу, чтобы
 * «не получилось» нельзя было спутать с галочкой «верно».
 */
export function RetryNote({
  children,
  alert = true,
}: {
  children: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <View
      testID="retry-note"
      accessibilityRole={alert ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={s.retry}
    >
      <HandFrame seed="retry" color={c.retry} dashed />
      <View style={s.retryBadge}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path
            d="M19 12a7 7 0 1 1-2.05-4.95M19 4v4h-4"
            stroke={c.white}
            strokeWidth={2.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text style={s.retryText}>{children}</Text>
    </View>
  );
}
export function ProgressBar({ value }: { value: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={s.track}
    >
      <View
        style={[s.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]}
      />
    </View>
  );
}
/** Ряд клеток: закрашенная клетка — выполненный шаг. */
export function Cells({
  total,
  done,
  size = 12,
}: {
  total: number;
  done: number;
  size?: number;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: done }}
      style={s.cells}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            s.cell,
            { width: size, height: size },
            i < done && s.cellDone,
          ]}
        />
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  // Two cells: a row of text and a quarter of a cell above and below it; the
  // pen's lip under the button is inside the two cells.
  button: {
    backgroundColor: c.pen,
    borderRadius: 6,
    borderBottomWidth: 3,
    borderBottomColor: c.penDark,
    paddingHorizontal: 22,
    paddingTop: 11,
    paddingBottom: 10,
    minHeight: CELL * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: c.penDark },
  secondary: {
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.pen,
    borderBottomWidth: 3,
    borderBottomColor: c.pen,
    paddingTop: 10,
    paddingBottom: 9.5,
  },
  secondaryPressed: { backgroundColor: c.wash },
  // As high as any button — a finger needs the same room — but narrower.
  small: { paddingHorizontal: 14 },
  done: {
    backgroundColor: c.wash,
    borderWidth: 1.5,
    borderColor: c.pen,
    borderBottomWidth: 1.5,
    borderBottomColor: c.pen,
    paddingTop: 10.5,
    paddingBottom: 10.5,
  },
  label: { fontFamily: f.bold, color: c.white, fontSize: 17, lineHeight: CELL },
  secondaryLabel: { color: c.pen },
  doneLabel: { color: c.pen },
  // A note in pencil, two cells high.
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.retryWash,
    borderRadius: 4,
    paddingVertical: CELL / 2,
    paddingHorizontal: 12,
    minHeight: CELL * 2,
  },
  retryBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginVertical: -3,
    backgroundColor: c.retry,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    flex: 1,
    fontFamily: f.bold,
    color: c.retry,
    fontSize: 16,
    lineHeight: CELL,
  },
  // The bar lies in the middle of its row.
  track: {
    height: 8,
    marginVertical: 8,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: { height: 8, backgroundColor: c.pen },
  // Half a cell each, a quarter apart: the strip takes a row.
  cells: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 12,
    paddingVertical: 6,
  },
  cell: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 2,
    backgroundColor: c.card,
  },
  cellDone: { backgroundColor: c.pen, borderColor: c.pen },
});
