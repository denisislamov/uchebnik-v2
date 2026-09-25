import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { colors as c, fonts as f } from "../theme";
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
  return (
    <Pressable
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
  button: {
    backgroundColor: c.pen,
    borderRadius: 6,
    borderBottomWidth: 3,
    borderBottomColor: c.penDark,
    paddingHorizontal: 22,
    paddingVertical: 13,
    minHeight: 50,
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
  },
  secondaryPressed: { backgroundColor: c.wash },
  small: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 40 },
  done: {
    backgroundColor: c.wash,
    borderWidth: 1.5,
    borderColor: c.pen,
    borderBottomWidth: 1.5,
    borderBottomColor: c.pen,
  },
  // An explicit line height keeps button heights integer (40 / 50 px): text
  // metrics alone left them fractional and made scroll rounding drift.
  label: { fontFamily: f.bold, color: c.white, fontSize: 17, lineHeight: 24 },
  secondaryLabel: { color: c.pen },
  doneLabel: { color: c.pen },
  track: {
    height: 8,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: { height: 8, backgroundColor: c.pen },
  cells: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  cell: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 2,
    backgroundColor: c.card,
  },
  cellDone: { backgroundColor: c.pen, borderColor: c.pen },
});
