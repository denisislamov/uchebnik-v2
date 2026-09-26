import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import type { Answer, Block, PracticalState } from "../content/types";
import {
  practicalCorrect,
  practicalShape,
  practicalStepCorrect,
  practicalTrace,
  updatePractical,
} from "../lib/practical";
import { CounterBoard } from "./CounterBoard";
import { DrawingPad } from "./DrawingPad";
import { ShapeBoard } from "./ShapeBoard";
import { Button, RetryNote } from "./Controls";
import { colors as c, fonts as f } from "../theme";
import { traceProgress } from "../lib/tracing";
import { DigitCards } from "./DigitCards";
import { PracticalPreview } from "./PracticalPreview";

export function PracticalTask({
  block,
  answer,
  onAnswer,
  onDrawing,
}: {
  block: Extract<Block, { kind: "practical" }>;
  answer: Answer;
  onAnswer: (answer: Answer) => void;
  onDrawing: (value: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const current = block.steps.findIndex(
    (step) =>
      !answer.practical?.[step.id]?.confirmed ||
      !practicalStepCorrect(step, answer.practical[step.id]),
  );
  const step = block.steps[current];
  const stored = step ? answer.practical?.[step.id] : undefined;
  const initial = step?.carryFrom
    ? answer.practical?.[step.carryFrom]?.counts
    : step?.initialCounts;
  const state: PracticalState = stored ?? {
    counts: initial ?? step?.counts.map(() => (step.mode === "cards" ? -1 : 0)),
  };
  const update = (next: PracticalState) => {
    setMessage("");
    onAnswer(
      updatePractical(block, answer, step.id, { ...next, confirmed: false }),
    );
  };
  const choiceKeys = step
    ? [
        ...(step.chooseCounts ?? []).map((i) => ({
          key: `count${i}`,
          label: `Сколько предметов нарисуешь в ряду ${i + 1}?`,
        })),
        ...(step.chooseLengths ?? []).map((i) => ({
          key: `length${i}`,
          label: `Какой длины будет отрезок ${i + 1}, в сантиметрах?`,
        })),
      ]
    : [];
  const choiceReady = choiceKeys.every(
    ({ key }) =>
      Number.isInteger(state.choices?.[key]) &&
      state.choices![key] > 0 &&
      state.choices![key] <= 100,
  );
  const trace =
    step?.mode === "draw" && choiceReady
      ? practicalTrace(step, state)
      : undefined;
  const progress = trace ? traceProgress(trace, state.strokes) : undefined;
  const target =
    progress && !progress.done
      ? trace!.stages[progress.stage][progress.index]
      : undefined;
  const correct = practicalCorrect(block, answer);
  const sideBySide =
    step?.groupLabels?.[0] === "Слева" && step?.groupLabels?.[1] === "Справа";
  const rowLayout = !!step && /ряд/.test(step.instruction);
  return (
    <View testID="practical-task" style={{ gap: 18 }}>
      {block.steps
        .slice(0, current < 0 ? undefined : current)
        .map((previous, i) => (
          <View
            key={previous.id}
            style={{
              backgroundColor: c.wash,
              padding: 12,
              borderRadius: 6,
              gap: 8,
            }}
          >
            <Text style={{ fontFamily: f.bold, color: c.pen }}>
              ✓ {i + 1}. {previous.instruction}
            </Text>
            <PracticalPreview
              step={previous}
              state={answer.practical?.[previous.id] ?? {}}
            />
            <Button
              small
              secondary
              onPress={() => {
                setMessage("");
                onAnswer(
                  updatePractical(block, answer, previous.id, {
                    ...answer.practical?.[previous.id],
                    confirmed: false,
                  }),
                );
              }}
            >
              Изменить действие {i + 1}
            </Button>
          </View>
        ))}
      {step && (
        <View testID={`practical-step-${step.id}`} style={{ gap: 14 }}>
          <Text style={{ fontFamily: f.bold, fontSize: 20, color: c.ink }}>
            {current + 1}. {step.instruction}
          </Text>
          {choiceKeys.map(({ key, label }) => (
            <View key={key} style={{ gap: 8 }}>
              <Text style={{ fontFamily: f.bold, color: c.ink }}>
                {label} Сначала выбери число, затем нарисуй.
              </Text>
              <TextInput
                accessibilityLabel={label}
                value={
                  state.choices?.[key] === undefined
                    ? ""
                    : String(state.choices[key])
                }
                keyboardType="number-pad"
                inputMode="numeric"
                onChangeText={(v) => {
                  const value = v.replace(/[^0-9]/g, "").slice(0, 2);
                  update({
                    ...state,
                    choices: { ...state.choices, [key]: Number(value) },
                    strokes: [],
                  });
                }}
                style={{
                  borderWidth: 1,
                  borderColor: c.line,
                  borderRadius: 6,
                  padding: 14,
                  fontSize: 24,
                  color: c.ink,
                  minWidth: 90,
                  alignSelf: "flex-start",
                }}
              />
            </View>
          ))}
          {step.mode === "place" && (
            <View
              style={{ flexDirection: sideBySide ? "row" : "column", gap: 16 }}
            >
              {step.counts.map((target, group) => (
                <View
                  key={group}
                  style={{
                    gap: 8,
                    ...(sideBySide ? { flex: 1, minWidth: 0 } : {}),
                  }}
                >
                  {(step.counts.length > 1 || step.groupLabels?.[group]) && (
                    <Text
                      style={{ fontFamily: f.bold, color: c.ink, fontSize: 18 }}
                    >
                      {step.groupLabels?.[group] ??
                        `${rowLayout ? "Ряд" : "Группа"} ${group + 1}`}
                    </Text>
                  )}
                  {(step.groupValues?.[group] ?? step.tokenValue ?? 1) > 1 && (
                    <Text style={{ fontFamily: f.regular, color: c.muted }}>
                      Один пучок —{" "}
                      {step.groupValues?.[group] ?? step.tokenValue} палочек.
                    </Text>
                  )}
                  <CounterBoard
                    layout={rowLayout ? "row" : "groups"}
                    token={step.token}
                    objectLabel={step.objectLabel}
                    tokenValue={step.groupValues?.[group] ?? step.tokenValue}
                    value={state.counts?.[group] ?? 0}
                    max={Math.max(12, target + 4, initial?.[group] ?? 0)}
                    onDrawing={onDrawing}
                    onChange={(count) => {
                      const counts = [
                        ...(state.counts ?? step.counts.map(() => 0)),
                      ];
                      counts[group] = count;
                      update({ ...state, counts });
                    }}
                  />
                </View>
              ))}
            </View>
          )}
          {step.mode === "draw" && trace && (
            <View testID="practical-sheet" style={{ gap: 10 }}>
              {!!step.lengths && (
                <Text style={{ fontFamily: f.regular, color: c.muted }}>
                  Экранная модель: одна клетка — 1 см. Размер на экране зависит
                  от устройства. Проведи отрезок по клеткам; короткими штрихами
                  отметь деления.
                </Text>
              )}
              {trace.columns > 16 && (
                <Text style={{ fontFamily: f.regular, color: c.muted }}>
                  Длинную линию проводи по частям. Лист сам передвинется к
                  следующему пунктиру.
                </Text>
              )}
              {/* The pad owns the sheet: fingertip cells and sideways scrolling to the current line. */}
              <DrawingPad
                strokes={state.strokes ?? []}
                trace={trace}
                onDrawing={onDrawing}
                onChange={(strokes) => update({ ...state, strokes })}
              />
            </View>
          )}
          {step.mode === "construct" && (
            <ShapeBoard
              block={practicalShape(step)}
              value={state.edges ?? []}
              onDrawing={onDrawing}
              onChange={(edges) => update({ ...state, edges })}
            />
          )}
          {step.mode === "cards" && (
            <DigitCards
              expected={step.counts}
              value={state.counts ?? [-1, -1]}
              onDrawing={onDrawing}
              onChange={(counts) => update({ ...state, counts })}
            />
          )}
          <Button
            onPress={() => {
              if (!practicalStepCorrect(step, state)) {
                setMessage(
                  "Пока не совпало. Проверь количество и выполни действие до конца.",
                );
                return;
              }
              setMessage("");
              onAnswer(
                updatePractical(block, answer, step.id, {
                  ...state,
                  confirmed: true,
                }),
              );
            }}
          >
            Проверить действие
          </Button>
          {!!message && <RetryNote>{message}</RetryNote>}
        </View>
      )}
      {current < 0 && (
        <View style={{ gap: 14 }}>
          {block.fields.map((field) => (
            <View key={field.id} style={{ gap: 8 }}>
              <Text style={{ fontFamily: f.bold, color: c.ink, fontSize: 19 }}>
                {field.label}
              </Text>
              {field.options ? (
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {field.options.map((option) => (
                    <Button
                      key={option}
                      secondary={answer.responses?.[field.id] !== option}
                      onPress={() =>
                        onAnswer({
                          ...answer,
                          checked: false,
                          responses: {
                            ...answer.responses,
                            [field.id]: option,
                          },
                        })
                      }
                    >
                      {option}
                    </Button>
                  ))}
                </View>
              ) : (
                <TextInput
                  accessibilityLabel={field.label}
                  value={answer.responses?.[field.id] ?? ""}
                  onChangeText={(value) =>
                    onAnswer({
                      ...answer,
                      checked: false,
                      responses: {
                        ...answer.responses,
                        [field.id]: value.replace(/[^0-9]/g, "").slice(0, 3),
                      },
                    })
                  }
                  keyboardType="number-pad"
                  inputMode="numeric"
                  style={{
                    borderColor: c.line,
                    borderWidth: 2,
                    borderRadius: 6,
                    padding: 14,
                    fontSize: 24,
                    color: c.ink,
                    fontFamily: f.bold,
                    minWidth: 90,
                    alignSelf: "flex-start",
                  }}
                />
              )}
            </View>
          ))}
          <Button
            done={answer.checked && correct}
            onPress={() =>
              onAnswer({
                ...answer,
                checked: true,
                attempts: (answer.attempts ?? 0) + 1,
              })
            }
          >
            {answer.checked && correct ? "✓ Верно" : "Проверить ответ"}
          </Button>
        </View>
      )}
    </View>
  );
}
