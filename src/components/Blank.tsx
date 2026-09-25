import React from "react";
import { StyleSheet, Text, View, type TextStyle } from "react-native";
import { colors as c } from "../theme";
import { BLANK, blankRuns, spokenBlanks } from "../lib/blanks";
export { BLANK, blankRuns, spokenBlanks };
/** Prose or an equation with each blank drawn as an underlined empty gap. */
export function TextWithBlanks({
  text,
  style,
  testID,
}: {
  text: string;
  style?: TextStyle | TextStyle[];
  testID?: string;
}) {
  return (
    <Text testID={testID} style={style} accessibilityLabel={spokenBlanks(text)}>
      {blankRuns(text).map((run, i) =>
        typeof run === "string" ? (
          run
        ) : (
          <Text key={i} style={s.gap}>
            {"   "}
          </Text>
        ),
      )}
    </Text>
  );
}
/** A standalone empty box for equation rows and worked examples. */
export function BlankBox({ size = 28 }: { size?: number }) {
  return (
    <View
      accessibilityLabel="пропуск"
      testID="blank-box"
      style={[s.box, { width: size, height: size }]}
    />
  );
}
const s = StyleSheet.create({
  gap: {
    textDecorationLine: "underline",
    textDecorationColor: c.pen,
    backgroundColor: c.wash,
  },
  box: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: c.pen,
    borderRadius: 4,
    backgroundColor: c.card,
  },
});
