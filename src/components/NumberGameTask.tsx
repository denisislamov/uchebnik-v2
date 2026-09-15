import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { NumberGameSpec } from "../content/numberGameTypes";
import type { Answer } from "../content/types";
import {
  confirmNumberGameRound,
  numberGameCorrect,
  numberGameRoundCorrect,
  setNumberGameResponse,
} from "../lib/numberGame";
import { colors as c, fonts as f } from "../theme";
import { Button } from "./Controls";

export function NumberGameTask({
  block,
  answer,
  onAnswer,
}: {
  block: NumberGameSpec;
  answer: Answer;
  onAnswer: (answer: Answer) => void;
}) {
  const [message, setMessage] = useState("");
  const spec = block.numberGame;
  const responses = answer.responses ?? {};
  const update = (id: string, value: string) => {
    setMessage("");
    onAnswer(setNumberGameResponse(block, answer, id, value));
  };
  const check = () => onAnswer({ ...answer, checked: true });
  if (spec.mode === "readNumbers") {
    return (
      <View testID="number-reading-task" style={s.stack}>
        <Text style={s.instruction}>
          Прочитай каждое число. Выбери, как оно называется.
        </Text>
        {spec.items.map((item) => (
          <View
            key={item.id}
            testID={`number-name-${item.value}`}
            style={s.card}
          >
            <Text
              accessibilityLabel={`Прочитай число ${item.value}`}
              style={s.digit}
            >
              {item.value}
            </Text>
            <View style={s.stack}>
              {item.options.map((option) => {
                const selected = responses[item.id] === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.value}: ${option}`}
                    accessibilityState={{ selected }}
                    onPress={() => update(item.id, option)}
                    style={[s.option, selected && s.selected]}
                  >
                    <Text style={s.optionText}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
            {answer.checked && (
              <Text accessibilityLiveRegion="polite" style={s.feedback}>
                {responses[item.id] === item.expected
                  ? "✓ Верно"
                  : "Прочитай число ещё раз и выбери его название."}
              </Text>
            )}
          </View>
        ))}
        <Button onPress={check}>Проверить</Button>
      </View>
    );
  }

  const current = spec.rounds.findIndex(
    (round) =>
      responses[`${round.id}:confirmed`] !== "yes" ||
      !numberGameRoundCorrect(round, responses[round.id]),
  );
  const round = spec.rounds[current];
  return (
    <View testID="hidden-card-game" style={s.stack}>
      {spec.rounds
        .slice(0, current < 0 ? undefined : current)
        .map((previous) => (
          <View key={previous.id} style={s.completed}>
            <Text style={s.instruction}>✓ {previous.label}</Text>
            <Text style={s.equation}>
              {previous.visible} + {responses[previous.id]} = {previous.total}
            </Text>
            <Button small secondary onPress={() => update(previous.id, "")}>
              Сыграть этот раунд ещё раз
            </Button>
          </View>
        ))}
      {round && (
        <View testID={`hidden-card-${round.id}`} style={s.card}>
          <Text style={s.instruction}>{round.label}</Text>
          <Text style={s.note}>
            К числу на открытой карточке прибавили число с закрытой карточки.
            Найди, какое число закрыто.
          </Text>
          <View
            accessibilityLabel={`${round.visible} плюс неизвестное число равно ${round.total}`}
            style={s.row}
          >
            <View style={s.numberCard}>
              <Text style={s.cardNumber}>{round.visible}</Text>
            </View>
            <Text style={s.equation}>+</Text>
            <View style={[s.numberCard, s.hiddenCard]}>
              <Text style={s.cardNumber}>?</Text>
            </View>
            <Text style={s.equation}>= {round.total}</Text>
          </View>
          <Text style={s.note}>Какое число на закрытой карточке?</Text>
          <TextInput
            accessibilityLabel="Число на закрытой карточке"
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={3}
            value={responses[round.id] ?? ""}
            onChangeText={(value) =>
              update(round.id, value.replace(/[^0-9]/g, ""))
            }
            style={s.input}
          />
          <Button
            onPress={() => {
              if (!numberGameRoundCorrect(round, responses[round.id])) {
                setMessage(
                  "Пока не подходит. Проверь: если прибавить это число, получится нужная сумма?",
                );
                return;
              }
              setMessage("");
              onAnswer(confirmNumberGameRound(block, answer, round.id));
            }}
          >
            Открыть карточку
          </Button>
          {!!message && (
            <Text accessibilityLiveRegion="polite" style={s.feedback}>
              {message}
            </Text>
          )}
        </View>
      )}
      {numberGameCorrect(block, answer) && (
        <Text accessibilityLiveRegion="polite" style={s.feedback}>
          Обе загадки разгаданы!
        </Text>
      )}
      {answer.checked && !numberGameCorrect(block, answer) && (
        <Text accessibilityLiveRegion="polite" style={s.feedback}>
          Сначала разгадай и открой карточки в обеих загадках.
        </Text>
      )}
      <Button onPress={check}>Проверить</Button>
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: 14 },
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    gap: 14,
  },
  completed: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: c.mint,
    gap: 10,
  },
  instruction: { color: c.ink, fontFamily: f.bold, fontSize: 20 },
  note: { color: c.ink, fontFamily: f.regular, fontSize: 18 },
  digit: {
    color: c.green,
    fontFamily: f.heavy,
    fontSize: 44,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  numberCard: {
    minHeight: 64,
    minWidth: 54,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: c.green,
    borderRadius: 12,
    backgroundColor: c.white,
  },
  hiddenCard: { backgroundColor: c.sand },
  cardNumber: { color: c.ink, fontFamily: f.heavy, fontSize: 32 },
  equation: { color: c.ink, fontFamily: f.bold, fontSize: 26 },
  input: {
    minHeight: 56,
    minWidth: 100,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.line,
    color: c.ink,
    fontFamily: f.bold,
    fontSize: 26,
    alignSelf: "flex-start",
    backgroundColor: c.white,
  },
  option: {
    minHeight: 52,
    minWidth: 48,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.line,
    backgroundColor: c.white,
    justifyContent: "center",
    alignItems: "center",
  },
  selected: { borderColor: c.green, backgroundColor: c.mint },
  optionText: { color: c.ink, fontFamily: f.bold, fontSize: 18 },
  feedback: { color: c.green, fontFamily: f.bold, fontSize: 18 },
});
