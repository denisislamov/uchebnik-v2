import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { colors as c, fonts as f } from "../theme";
export function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
  label,
  small = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  label?: string;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        small && { paddingVertical: 10, paddingHorizontal: 16 },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[s.label, secondary && { color: c.green }]}>{children}</Text>
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
const s = StyleSheet.create({
  button: {
    backgroundColor: c.green,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 15,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: c.mint, borderWidth: 1, borderColor: c.line },
  label: { fontFamily: f.bold, color: c.white, fontSize: 16 },
  track: {
    height: 6,
    backgroundColor: c.line,
    borderRadius: 8,
    overflow: "hidden",
  },
  fill: { height: 6, backgroundColor: c.green, borderRadius: 8 },
});
