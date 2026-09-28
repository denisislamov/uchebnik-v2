import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Answer } from "../content/types";
import {
  locationOptions,
  locationStage,
  selectLocationAnswer,
  type LocationAxis,
  type LocationBlock,
} from "../lib/location";
import { RetryNote } from "./Controls";
import { useColumns } from "./HandDrawn";
import { colors as c, fonts as f } from "../theme";

export function LocationTask({
  block,
  answer,
  onAnswer,
}: {
  block: LocationBlock;
  answer: Answer;
  onAnswer: (answer: Answer) => void;
}) {
  const stage = locationStage(block, answer);
  const verticalWrong = !!answer.responses?.vertical && stage === "vertical";
  // Two options share the row, each a whole number of cells wide.
  const [measureRow, column] = useColumns(2);
  const asked = block.verticalPrompt.trim() === block.prompt.trim();
  // A row is left empty between a question and its answers.
  const choices = (axis: LocationAxis, under = true) => (
    <View onLayout={measureRow} style={[s.options, under && { marginTop: 24 }]}>
      {locationOptions[axis].map((value) => {
        const selected = answer.responses?.[axis] === value;
        return (
          <Pressable
            key={value}
            testID={`location-${axis}-${value}`}
            accessibilityRole="button"
            accessibilityLabel={value}
            accessibilityState={{ selected }}
            onPress={() =>
              onAnswer(selectLocationAnswer(block, answer, axis, value))
            }
            style={({ pressed }) => [
              s.option,
              !!column && { flexGrow: 0, flexBasis: column },
              pressed && s.pressed,
              selected && s.selected,
            ]}
          >
            <Text style={[s.optionText, selected && s.selectedText]}>
              {value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <View testID="location-task" style={s.task}>
      <View style={s.question}>
        {/* The task over the picture asks this already: it is not said twice. */}
        {!asked && <Text style={s.prompt}>{block.verticalPrompt}</Text>}
        {choices("vertical", !asked)}
        {verticalWrong && (
          <View style={s.note}>
            <RetryNote>
              Посмотри ещё раз: рисунок ближе к верху или к низу доски?
            </RetryNote>
          </View>
        )}
      </View>
      {stage !== "vertical" && (
        <View testID="location-horizontal-question" style={s.question}>
          <Text style={s.prompt}>{block.horizontalPrompt}</Text>
          {choices("horizontal")}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  task: { gap: 24 },
  question: {},
  prompt: { fontFamily: f.bold, color: c.ink, fontSize: 20, lineHeight: 24 },
  // Two options share the row, a cell apart; each is three cells high.
  options: { flexDirection: "row", flexWrap: "wrap", gap: 24 },
  option: {
    minHeight: 72,
    minWidth: 120,
    flexGrow: 1,
    flexBasis: 120,
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    // An answer looks like the other answers: a white box with a lip.
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.line,
    borderBottomWidth: 3,
    borderBottomColor: c.lip,
  },
  note: { marginTop: 24 },
  pressed: { backgroundColor: c.wash },
  selected: {
    backgroundColor: c.pen,
    borderColor: c.penDark,
    borderBottomColor: c.penDark,
  },
  optionText: {
    fontFamily: f.heavy,
    fontSize: 22,
    lineHeight: 24,
    color: c.ink,
  },
  selectedText: { color: c.white },
});
