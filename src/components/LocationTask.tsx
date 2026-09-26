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
  const choices = (axis: LocationAxis) => (
    <View style={s.options}>
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
            style={[s.option, selected && s.selected]}
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
        <Text style={s.step}>1. Вверху или внизу?</Text>
        <Text style={s.prompt}>{block.verticalPrompt}</Text>
        {choices("vertical")}
        {verticalWrong && (
          <RetryNote>
            Посмотри ещё раз: рисунок ближе к верху или к низу доски?
          </RetryNote>
        )}
      </View>
      {stage !== "vertical" && (
        <View testID="location-horizontal-question" style={s.question}>
          <Text style={s.step}>2. Слева или справа?</Text>
          <Text style={s.prompt}>{block.horizontalPrompt}</Text>
          {choices("horizontal")}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  task: { gap: 24 },
  question: { gap: 12 },
  step: { fontFamily: f.bold, color: c.muted, fontSize: 16 },
  prompt: { fontFamily: f.bold, color: c.ink, fontSize: 22, lineHeight: 30 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  option: {
    minHeight: 60,
    minWidth: 120,
    flexGrow: 1,
    flexBasis: 120,
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.wash,
    borderWidth: 2,
    borderColor: c.wash,
  },
  selected: { backgroundColor: c.pen, borderColor: c.pen },
  optionText: { fontFamily: f.heavy, fontSize: 22, color: c.ink },
  selectedText: { color: c.white },
});
