import React from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { s } from "./styles";
export function AdminButton({
  children,
  onPress,
  disabled,
  secondary,
  danger,
  testID,
  selected,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  testID?: string;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{
        disabled: !!disabled,
        ...(selected === undefined ? {} : { selected }),
      }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && s.secondary,
        danger && s.danger,
        disabled && { opacity: 0.55 },
      ]}
    >
      <Text style={[s.buttonText, secondary && s.secondaryText]}>
        {children}
      </Text>
    </Pressable>
  );
}
export function AdminField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        style={s.field}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}
