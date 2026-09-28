import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors as c, fonts as f } from "../theme";
import { CELL, cells } from "../lib/grid";
import { gatePassed, gateQuestion } from "../lib/adultGate";
import { Button } from "./Controls";

/**
 * Before the adults' part: the progress can be erased there, and the book's
 * pages outside the lessons are opened from it. A number written in words is
 * typed in digits.
 */
export function AdultGate({
  onPass,
  onClose,
}: {
  onPass: () => void;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState(() => gateQuestion(Math.random()));
  const [typed, setTyped] = useState("");
  const [missed, setMissed] = useState(false);
  function press(digit: number) {
    const next = (typed + digit).slice(0, 2);
    setMissed(false);
    setTyped(next);
    if (next.length < 2) return;
    if (gatePassed(question, next)) onPass();
    else {
      // Another number each time: the answer cannot be found by trying.
      setMissed(true);
      setTyped("");
      setQuestion(gateQuestion(Math.random()));
    }
  }
  return (
    <View testID="adult-gate" style={s.gate}>
      <Text style={s.title}>Для взрослых</Text>
      <Text style={s.body}>
        Здесь сведения для родителей и сброс прогресса. Чтобы войти, наберите
        цифрами число:
      </Text>
      <Text testID="adult-gate-question" style={s.words}>
        {question.words}
      </Text>
      <View
        accessibilityLabel={`Набрано: ${typed || "ничего"}`}
        style={s.typed}
      >
        <Text style={s.typedText}>{typed}</Text>
      </View>
      <Text accessibilityLiveRegion="polite" style={s.note}>
        {missed ? "Не то число. Вот другое." : " "}
      </Text>
      <View style={s.keys}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
          <Pressable
            key={digit}
            accessibilityRole="button"
            accessibilityLabel={`Цифра ${digit}`}
            onPress={() => press(digit)}
            style={({ pressed }) => [s.key, pressed && s.keyPressed]}
          >
            <Text style={s.keyText}>{digit}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.actions}>
        <Button secondary onPress={() => setTyped("")}>
          Стереть
        </Button>
        <Button secondary onPress={onClose}>
          Вернуться к учебнику
        </Button>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  gate: { padding: 28, gap: 12 },
  title: { fontFamily: f.hand, fontSize: 30, lineHeight: 34, color: c.pen },
  body: { fontFamily: f.regular, color: c.ink, fontSize: 16, lineHeight: 25 },
  words: { fontFamily: f.bold, color: c.ink, fontSize: 24, lineHeight: 32 },
  typed: {
    width: cells(4),
    height: cells(2),
    borderWidth: 1.5,
    borderColor: c.lip,
    borderRadius: 4,
    backgroundColor: c.white,
    alignItems: "center",
    justifyContent: "center",
  },
  typedText: { fontFamily: f.bold, fontSize: 26, lineHeight: 32, color: c.ink },
  note: {
    fontFamily: f.regular,
    color: c.retry,
    fontSize: 15,
    lineHeight: CELL,
  },
  keys: { flexDirection: "row", flexWrap: "wrap", gap: 12, maxWidth: 5 * 60 },
  key: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.line,
    borderBottomWidth: 2,
    borderBottomColor: c.lip,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  keyPressed: { backgroundColor: c.wash },
  keyText: { fontFamily: f.bold, fontSize: 22, lineHeight: 28, color: c.ink },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
});
