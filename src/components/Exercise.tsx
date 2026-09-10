import { CourseTask } from "./CourseTask";
import { PictureTask } from "./PictureTask";
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Answer, Block } from "../content/types";
import { colors as c, fonts as f } from "../theme";
import { isCorrect, isDone, hasInk } from "../lib/assessment";
import { BookImage } from "./BookImage";
import { Button } from "./Controls";
import { DrawingPad } from "./DrawingPad";
import { ShapeBoard } from "./ShapeBoard";
export function Exercise({
  block,
  answer,
  onAnswer,
  onDrawing,
}: {
  block: Block;
  answer: Answer;
  onAnswer: (a: Answer) => void;
  onDrawing: (v: boolean) => void;
}) {
  const [hint, setHint] = useState(false);
  const done = isDone(block, answer),
    correct = isCorrect(block, answer);
  const update = (patch: Partial<Answer>) =>
    onAnswer({ ...answer, ...patch, checked: false, reviewed: false });
  const review = block.kind === "counters" && block.expected === undefined;
  const numeric = typeof answer.value === "number" ? answer.value : 0;
  const hasValue =
    block.kind === "shape"
      ? Array.isArray(answer.value) && answer.value.length > 0
      : answer.value !== undefined && answer.value !== "";
  return (
    <View style={{ gap: 22 }}>
      {block.kind !== "read" && (
        <View>
          <Text style={s.prompt}>{block.prompt}</Text>
        </View>
      )}
      {block.kind === "picture" && (
        <PictureTask
          block={block}
          value={Array.isArray(answer.value) ? answer.value : []}
          onChange={(value) =>
            onAnswer({ ...answer, value, checked: true, reviewed: false })
          }
        />
      )}
      {block.kind !== "picture" && !!block.images.length && (
        <View
          style={[
            s.images,
            block.images.length > 1 && {
              flexDirection: "row",
              flexWrap: "wrap",
            },
          ]}
        >
          {block.images.map((id) => (
            <View
              key={id}
              style={
                block.images.length > 1
                  ? { flexGrow: 1, flexBasis: 110, maxWidth: "100%" }
                  : { width: "100%" }
              }
            >
              <BookImage
                id={id}
                maxHeight={block.kind === "read" ? 340 : 270}
              />
            </View>
          ))}
        </View>
      )}
      {block.kind === "read" && <Text style={s.body}>{block.body}</Text>}
      {[
        "work",
        "compose",
        "activity",
        "recipe",
        "relation",
        "targetGame",
      ].includes(block.kind) && (
        <CourseTask
          block={block}
          answer={answer}
          onAnswer={onAnswer}
          onDrawing={onDrawing}
        />
      )}
      {block.kind === "number" && (
        <View style={s.options}>
          {Array.from({ length: 11 }, (_, n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`Ответ ${n}`}
              accessibilityState={{ selected: answer.value === n }}
              onPress={() =>
                onAnswer({
                  ...answer,
                  value: n,
                  checked: true,
                  reviewed: false,
                })
              }
              style={[s.number, answer.value === n && s.selected]}
            >
              <Text style={[s.digit, answer.value === n && { color: c.white }]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {block.kind === "choice" && (
        <View style={s.options}>
          {block.options.map((v, i) => (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityState={{ selected: answer.value === v }}
              onPress={() =>
                onAnswer({
                  ...answer,
                  value: v,
                  checked: true,
                  reviewed: false,
                })
              }
              style={[s.option, answer.value === v && s.selected]}
            >
              <Text
                style={[
                  s.optionIndex,
                  answer.value === v && { color: "#bfd5c9" },
                ]}
              >
                {String(i + 1).padStart(2, "0")}
              </Text>
              <Text
                style={[s.optionText, answer.value === v && { color: c.white }]}
              >
                {v}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {block.kind === "counters" && (
        <View style={{ gap: 14 }}>
          <View style={s.tray}>
            {numeric === 0 ? (
              <Text style={s.trayHint}>
                Положи сюда {block.token === "stick" ? "палочки" : "кружки"}
              </Text>
            ) : (
              Array.from({ length: numeric }, (_, i) => (
                <View
                  key={i}
                  style={block.token === "stick" ? s.stick : s.counter}
                />
              ))
            )}
          </View>
          <View style={s.counterTools}>
            <Button
              secondary
              small
              disabled={numeric === 0}
              onPress={() => update({ value: numeric - 1 })}
              label="Убрать один предмет"
            >
              − Убрать
            </Button>
            <Text style={s.count}>{numeric}</Text>
            <Button
              secondary
              small
              disabled={numeric >= 12}
              onPress={() => update({ value: numeric + 1 })}
              label="Добавить один предмет"
            >
              + Добавить
            </Button>
          </View>
        </View>
      )}
      {block.kind === "draw" && (
        <DrawingPad
          strokes={answer.strokes ?? []}
          onChange={(strokes) => update({ strokes })}
          trace={block.trace}
          onDrawing={onDrawing}
        />
      )}
      {block.kind === "shape" && (
        <ShapeBoard
          onDrawing={onDrawing}
          block={block}
          value={Array.isArray(answer.value) ? answer.value : []}
          onChange={(value) => update({ value })}
        />
      )}
      {review && (
        <Text style={s.hint}>
          Мешки стоят близко друг к другу. Положи палочки для тех мешков,
          которые видишь, и нажми «Дальше».
        </Text>
      )}
      {!review && (block.kind === "counters" || block.kind === "shape") && (
        <Button
          disabled={!hasValue || done}
          onPress={() =>
            onAnswer({
              ...answer,
              checked: true,
              attempts: (answer.attempts ?? 0) + 1,
            })
          }
        >
          {done ? "✓ Получилось!" : "Проверить ответ"}
        </Button>
      )}
      {answer.checked &&
        !correct &&
        (block.kind !== "picture" ||
          (Array.isArray(answer.value) &&
            answer.value.some((id) => !block.expected.includes(id)))) && (
          <View accessibilityRole="alert" style={s.retry}>
            <Text style={s.retryText}>
              Пока не совпало. Посмотри ещё раз — у тебя получится.
            </Text>
          </View>
        )}
      {!review && done && block.kind !== "read" && (
        <View accessibilityLiveRegion="polite" style={s.success}>
          <Text style={s.successText}>
            {review
              ? "✓ Работа проверена вместе. Можно идти дальше."
              : "✓ Верно! Можно переходить к следующему шагу."}
          </Text>
        </View>
      )}
      {block.hint && (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: hint }}
            onPress={() => setHint(!hint)}
            style={{ paddingVertical: 12 }}
          >
            <Text style={s.hintLink}>
              {hint ? "− Скрыть подсказку" : "+ Нужна подсказка?"}
            </Text>
          </Pressable>
          {hint && <Text style={s.hint}>{block.hint}</Text>}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  prompt: { fontFamily: f.bold, fontSize: 23, lineHeight: 32, color: c.ink },
  source: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 19,
    color: c.muted,
    marginTop: 7,
  },
  body: { fontFamily: f.regular, fontSize: 18, lineHeight: 29, color: c.ink },
  images: {
    gap: 12,
    backgroundColor: "#f3ebdc",
    padding: 16,
    borderRadius: 18,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  number: {
    width: 54,
    height: 58,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: { fontFamily: f.heavy, color: c.green, fontSize: 25 },
  selected: { backgroundColor: c.green, borderColor: c.green },
  option: {
    flexBasis: 210,
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    padding: 17,
    borderRadius: 14,
    minHeight: 62,
  },
  optionIndex: { fontFamily: f.bold, color: c.muted, fontSize: 13 },
  optionText: { fontFamily: f.bold, color: c.ink, fontSize: 17, flexShrink: 1 },
  tray: {
    minHeight: 112,
    padding: 20,
    backgroundColor: c.mint,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  trayHint: { fontFamily: f.regular, color: c.muted, fontSize: 16 },
  stick: {
    height: 64,
    width: 8,
    borderRadius: 8,
    backgroundColor: "#bb8052",
    transform: [{ rotate: "8deg" }],
  },
  counter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.green,
    borderWidth: 3,
    borderColor: "#bdd0b9",
  },
  counterTools: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  count: { fontFamily: f.heavy, fontSize: 28, color: c.green },
  review: { padding: 18, gap: 12, borderRadius: 16, backgroundColor: c.sand },
  reviewTitle: { fontFamily: f.bold, color: c.ink, fontSize: 15 },
  reviewBody: {
    fontFamily: f.regular,
    color: c.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  retry: { backgroundColor: "#fff0dc", padding: 16, borderRadius: 12 },
  retryText: { fontFamily: f.bold, color: "#8a4a26", fontSize: 15 },
  success: { backgroundColor: c.mint, padding: 16, borderRadius: 12 },
  successText: { fontFamily: f.bold, color: c.green, fontSize: 15 },
  hintLink: { fontFamily: f.bold, color: c.muted, fontSize: 15 },
  hint: { fontFamily: f.regular, fontSize: 16, lineHeight: 24, color: c.muted },
});
