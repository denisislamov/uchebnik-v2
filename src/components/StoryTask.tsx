import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { Answer } from "../content/types";
import type { StoryOperand, StorySpec } from "../content/storyTypes";
import {
  storyCorrect,
  storyInputs,
  storyOperand,
  requiredStorySpec,
  requiredStoryResponses,
  selectStoryVariant,
} from "../lib/storyAssessment";
import { Button, CellPressable, RetryNote } from "./Controls";
import { CheckRow } from "./Result";
import { HandFrame, Pasted } from "./HandDrawn";
import { BLANK, TextWithBlanks } from "./Blank";
import { colors as c, fonts as f } from "../theme";

export function StoryTask({
  block,
  answer,
  onAnswer,
  embedded = false,
}: {
  block: StorySpec;
  embedded?: boolean;
  answer: Answer;
  onAnswer: (answer: Answer) => void;
}) {
  const r = answer.responses ?? {};
  const variant = block.story.variants.find((v) => v.id === r.storyVariant);
  const set = (key: string, value: string, resetResults = false) => {
    const responses = { ...r };
    if (resetResults)
      for (const name of Object.keys(responses))
        if (name.endsWith("Result")) delete responses[name];
    onAnswer({
      ...answer,
      checked: false,
      responses: { ...responses, [key]: value },
    });
  };
  const chip = (key: string, value: string, label: string) => (
    <CellPressable
      key={value}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: r[key] === value }}
      onPress={() => set(key, value)}
      style={[s.chip, r[key] === value && s.selected]}
    >
      <Text style={[s.text, r[key] === value && { color: c.white }]}>
        {label}
      </Text>
    </CellPressable>
  );
  const input = (key: string, label: string, reset = false) => (
    <TextInput
      accessibilityLabel={label}
      keyboardType="number-pad"
      inputMode="numeric"
      value={r[key] ?? ""}
      maxLength={3}
      onChangeText={(v) => set(key, v.replace(/[^0-9]/g, ""), reset)}
      style={s.input}
    />
  );
  const operand = (value: StoryOperand) => {
    const n = storyOperand(value, r);
    if (n !== undefined) return String(n);
    if (typeof value !== "number" && "result" in value)
      return "ответ первого действия";
    return BLANK;
  };
  if (block.story.requiredVariants)
    return (
      <View testID="story-task" style={{ gap: 24 }}>
        <Text style={s.label}>
          Составь и реши все задачи: {block.story.variants.length}.
        </Text>
        {block.story.variants.map((v, i) => (
          <Pasted key={v.id} style={s.card} frame={<HandFrame seed={v.id} />}>
            <Text style={s.label}>
              Задача {i + 1}. {v.label}
            </Text>
            <StoryTask
              embedded
              block={requiredStorySpec(block, v)}
              answer={{
                ...answer,
                checked: false,
                responses: requiredStoryResponses(r, v.id),
              }}
              onAnswer={(next) => {
                const responses = Object.fromEntries(
                  Object.entries(r).filter(
                    ([key]) => !key.startsWith(`${v.id}__`),
                  ),
                );
                for (const [key, value] of Object.entries(next.responses ?? {}))
                  responses[`${v.id}__${key}`] = value;
                onAnswer({ ...answer, checked: false, responses });
              }}
            />
          </Pasted>
        ))}
        <CheckRow
          note={
            answer.checked &&
            !storyCorrect(block, answer) && (
              <RetryNote tight>
                Проверь каждую задачу: условия, действия, единицы и ответы.
              </RetryNote>
            )
          }
        >
          <Button
            onPress={() =>
              onAnswer({
                ...answer,
                checked: true,
                attempts: (answer.attempts ?? 0) + 1,
              })
            }
          >
            Проверить все задачи
          </Button>
        </CheckRow>
      </View>
    );
  return (
    <View testID="story-task" style={{ gap: 24 }}>
      <Text style={s.label}>Выбери, о чём будет задача.</Text>
      <View style={s.choices}>
        {block.story.variants.map((v) => (
          <CellPressable
            key={v.id}
            accessibilityRole="button"
            accessibilityLabel={`Сюжет: ${v.label}`}
            accessibilityState={{ selected: r.storyVariant === v.id }}
            style={[s.chip, r.storyVariant === v.id && s.selected]}
            onPress={() =>
              r.storyVariant !== v.id &&
              onAnswer({
                ...answer,
                checked: false,
                responses: selectStoryVariant(r, v.id),
              })
            }
          >
            <Text
              style={[s.text, r.storyVariant === v.id && { color: c.white }]}
            >
              {v.label}
            </Text>
          </CellPressable>
        ))}
      </View>
      {variant && (
        <>
          {storyInputs(block, variant).map((item) => (
            <View key={item.id}>
              <Text style={s.label}>{item.label}</Text>
              <Text style={s.note}>
                Выбери целое число от {item.min ?? 1} до{" "}
                {item.max ?? block.story.max}.
              </Text>
              {input(item.id, item.label, true)}
            </View>
          ))}
          {!!storyInputs(block, variant).length && (
            <Text style={s.note}>
              В этом задании считаем до {block.story.max}: выбери числа так,
              чтобы ответы не были больше {block.story.max}.{" "}
              {variant.steps.some((step) => step.operator === ":")
                ? "При делении каждая группа должна получить поровну, без остатка."
                : ""}
            </Text>
          )}
          <Pasted style={s.card} frame={<HandFrame seed="story" />}>
            <Text style={s.label}>Твоя задача</Text>
            <TextWithBlanks
              style={s.text}
              text={variant.description.replace(
                /\{(\w+)\}/g,
                (_, id: string) => r[id] || BLANK,
              )}
            />
            {variant.steps.map((step) => (
              <Text key={step.id} style={s.text}>
                {step.question}
              </Text>
            ))}
          </Pasted>
          <Text style={s.label}>Что будем считать в ответе?</Text>
          <View style={s.choices}>
            {[
              ...new Set([
                block.story.unit,
                "рубли",
                "метры",
                "литры",
                "килограммы",
                "деревья",
              ]),
            ].map((unit) => chip("storyUnit", unit, unit))}
          </View>
          {variant.steps.map((step, i) => (
            <Pasted
              key={step.id}
              style={s.card}
              frame={<HandFrame seed={step.id} />}
            >
              <Text style={s.label}>
                {i + 1}. {step.question}
              </Text>
              {[step.left, step.right].some(
                (v) => typeof v !== "number" && "result" in v,
              ) && (
                <Text style={s.note}>
                  Используй свой ответ из первого действия.
                </Text>
              )}
              <Text style={s.text}>Выбери действие.</Text>
              <View style={s.choices}>
                {(block.story.operationChoices ?? ["+", "−", "×", ":"]).map(
                  (op) => chip(`${step.id}Operator`, op, op),
                )}
              </View>
              <View style={s.equation}>
                <TextWithBlanks
                  style={s.text}
                  text={`${operand(step.left)} ${r[`${step.id}Operator`] || BLANK} ${operand(step.right)} =`}
                />
                {input(`${step.id}Result`, `Ответ: ${step.question}`)}
                <Text style={s.text}>{r.storyUnit ?? ""}</Text>
              </View>
            </Pasted>
          ))}
          {!embedded && (
            <CheckRow
              note={
                answer.checked &&
                !storyCorrect(block, answer) && (
                  <RetryNote tight>
                    Проверь числа, действия, ответы и единицу.
                  </RetryNote>
                )
              }
            >
              <Button
                done={answer.checked && storyCorrect(block, answer)}
                onPress={() =>
                  onAnswer({
                    ...answer,
                    checked: true,
                    attempts: (answer.attempts ?? 0) + 1,
                  })
                }
              >
                {answer.checked && storyCorrect(block, answer)
                  ? "✓ Верно"
                  : "Проверить задачу"}
              </Button>
            </CheckRow>
          )}
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  text: { fontFamily: f.regular, fontSize: 20, lineHeight: 24, color: c.ink },
  label: { fontFamily: f.bold, fontSize: 20, lineHeight: 24, color: c.ink },
  note: { fontFamily: f.regular, fontSize: 17, lineHeight: 24, color: c.muted },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 24 },
  chip: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 6,
    backgroundColor: c.paper,
    justifyContent: "center",
    alignItems: "center",
  },
  selected: { backgroundColor: c.pen, borderColor: c.pen },
  input: {
    fontFamily: f.bold,
    fontSize: 25,
    color: c.ink,
    textAlign: "center",
    backgroundColor: c.white,
    borderWidth: 1.5,
    borderColor: c.lip,
    borderRadius: 4,
    width: 96,
    height: 48,
    paddingVertical: 0,
    alignSelf: "flex-start",
  },
  // Written on the sheet: the ruling shows through, rows follow rows.
  card: {
    backgroundColor: c.card,
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  equation: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 24,
    rowGap: 24,
    alignItems: "flex-end",
  },
});
