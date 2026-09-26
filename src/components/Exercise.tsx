import { useTaskCoach } from "./TaskCoach";
import {
  GestureCoachProvider,
  CoachButton,
  useCoachAnchor,
} from "./GestureCoach";
import { LocationTask } from "./LocationTask";
import { CounterBoard } from "./CounterBoard";
import { CourseTask } from "./CourseTask";
import { PictureTask } from "./PictureTask";
import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Answer, Block } from "../content/types";
import { colors as c, fonts as f } from "../theme";
import { isCorrect, isDone, hasInk } from "../lib/assessment";
import { promptRepeatsTitle } from "../lib/blockText";
import { BookImage } from "./BookImage";
import { useTaskSize } from "./taskSize";
import { Button, RetryNote } from "./Controls";
import { DrawingPad } from "./DrawingPad";
import { ShapeBoard } from "./ShapeBoard";
import { PracticalTask } from "./PracticalTask";
import { StoryTask } from "./StoryTask";
import { NumberGameTask } from "./NumberGameTask";
type ExerciseProps = {
  block: Block;
  answer: Answer;
  onAnswer: (a: Answer) => void;
  onDrawing: (v: boolean) => void;
  onCoachActiveChange?: (active: boolean) => void;
  revealCoachTarget?: (target: View) => Promise<void>;
};
export function Exercise(props: ExerciseProps) {
  return (
    <GestureCoachProvider
      key={props.block.id}
      revealTarget={props.revealCoachTarget}
      onActiveChange={props.onCoachActiveChange}
    >
      <ExerciseBody {...props} />
    </GestureCoachProvider>
  );
}
function ExerciseBody({ block, answer, onAnswer, onDrawing }: ExerciseProps) {
  const instructionRef = useRef<View>(null),
    imagesRef = useRef<View>(null),
    answerRef = useRef<View>(null);
  const showTaskCoach = useTaskCoach(block, {
    instruction: instructionRef,
    images: imagesRef,
    answer: answerRef,
  });
  // On a phone a full-height illustration pushes the answer off screen; keep
  // the picture and the place to answer within one view.
  const size = useTaskSize();
  // A laptop window is wide but low: the sample goes to the left of the work
  // instead of above it, so both fit under the lesson header.
  const beside =
    size.wide &&
    size.short &&
    block.kind !== "picture" &&
    block.kind !== "read" &&
    block.images.length > 0;
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
    <View style={{ gap: size.short ? 10 : size.compact ? 14 : 22 }}>
      {size.compact && <CoachButton onPress={showTaskCoach} />}
      {/* On wider screens the button sits beside the heading: a row of its own
          pushed the task a whole line down. */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
        <View
          ref={instructionRef}
          collapsable={false}
          style={{ gap: 10, flex: 1, minWidth: 0 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text
              testID="block-title"
              style={[
                s.title,
                size.wide && !size.short && { fontSize: 30, lineHeight: 36 },
              ]}
            >
              {block.title}
            </Text>
            {done && (
              <Text
                testID="done-mark"
                accessibilityLabel="выполнено"
                style={s.doneMark}
              >
                ✓
              </Text>
            )}
          </View>
          {block.kind !== "read" && !promptRepeatsTitle(block) && (
            <Text
              testID="block-prompt"
              style={[
                s.prompt,
                size.wide && !size.short && { fontSize: 24, lineHeight: 34 },
              ]}
            >
              {block.prompt}
            </Text>
          )}
        </View>
        {!size.compact && <CoachButton onPress={showTaskCoach} />}
      </View>
      <View
        style={
          beside
            ? { flexDirection: "row", alignItems: "flex-start", gap: 28 }
            : { gap: size.compact || size.short ? 14 : 22 }
        }
      >
        <View
          ref={imagesRef}
          collapsable={false}
          style={[{ gap: 14 }, beside && { flex: 5, minWidth: 0 }]}
        >
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
              {block.images
                .filter((id) => id !== "p011_balls_row_3_groups")
                .map((id) => (
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
                      maxHeight={
                        beside
                          ? size.beside
                          : block.kind === "read"
                            ? size.read
                            : size.picture
                      }
                    />
                  </View>
                ))}
            </View>
          )}
        </View>
        <View
          ref={answerRef}
          collapsable={false}
          style={[{ gap: 22 }, beside && { flex: 6, minWidth: 0 }]}
        >
          {block.kind === "location" && (
            <LocationTask block={block} answer={answer} onAnswer={onAnswer} />
          )}
          {block.kind === "read" && <Text style={s.body}>{block.body}</Text>}
          {block.kind === "story" && (
            <StoryTask block={block} answer={answer} onAnswer={onAnswer} />
          )}
          {block.kind === "numberGame" && (
            <NumberGameTask block={block} answer={answer} onAnswer={onAnswer} />
          )}
          {block.kind === "practical" && (
            <PracticalTask
              block={block}
              answer={answer}
              onAnswer={onAnswer}
              onDrawing={onDrawing}
            />
          )}
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
                <AnswerAnchor key={n} value={n}>
                  <Pressable
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
                    <Text
                      style={[
                        s.digit,
                        answer.value === n && { color: c.white },
                      ]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                </AnswerAnchor>
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
                      answer.value === v && { color: "#c7d3f0" },
                    ]}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                  <Text
                    style={[
                      s.optionText,
                      answer.value === v && { color: c.white },
                    ]}
                  >
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {block.kind === "counters" && (
            <CounterBoard
              value={numeric}
              token={block.token}
              onChange={(value) => update({ value })}
              onDrawing={onDrawing}
            />
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
              disabled={!hasValue}
              done={done}
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
              <RetryNote>
                Пока не совпало. Посмотри ещё раз — у тебя получится.
              </RetryNote>
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
        </View>
      </View>
    </View>
  );
}
function AnswerAnchor({
  value,
  children,
}: {
  value: number;
  children: React.ReactNode;
}) {
  const ref = useRef<View>(null);
  useCoachAnchor(`answer:${value}`, ref);
  return (
    <View ref={ref} collapsable={false}>
      {children}
    </View>
  );
}
const s = StyleSheet.create({
  title: { fontFamily: f.bold, fontSize: 26, lineHeight: 32, color: c.ink },
  doneMark: { fontFamily: f.hand, fontSize: 32, lineHeight: 32, color: c.red },
  prompt: { fontFamily: f.regular, fontSize: 21, lineHeight: 30, color: c.ink },
  source: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 19,
    color: c.muted,
    marginTop: 7,
  },
  body: { fontFamily: f.regular, fontSize: 18, lineHeight: 29, color: c.ink },
  // Картинка из книги вклеена на лист: белая рамка, тонкая линия.
  images: {
    gap: 12,
    backgroundColor: c.card,
    padding: 12,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 6,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  number: {
    width: 54,
    height: 58,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: { fontFamily: f.heavy, color: c.pen, fontSize: 25 },
  selected: { backgroundColor: c.pen, borderColor: c.pen },
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
    borderRadius: 6,
    minHeight: 62,
  },
  optionIndex: { fontFamily: f.bold, color: c.muted, fontSize: 13 },
  optionText: { fontFamily: f.bold, color: c.ink, fontSize: 17, flexShrink: 1 },
  tray: {
    minHeight: 112,
    padding: 20,
    backgroundColor: c.wash,
    borderRadius: 6,
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
    borderRadius: 4,
    backgroundColor: "#bb8052",
    transform: [{ rotate: "8deg" }],
  },
  counter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.pen,
    borderWidth: 3,
    borderColor: "#c7d3f0",
  },
  counterTools: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  count: { fontFamily: f.heavy, fontSize: 28, color: c.pen },
  review: {
    padding: 18,
    gap: 12,
    borderRadius: 6,
    backgroundColor: c.washWarm,
  },
  reviewTitle: { fontFamily: f.bold, color: c.ink, fontSize: 15 },
  reviewBody: {
    fontFamily: f.regular,
    color: c.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  // Отметка учителя: написана красной ручкой прямо на листе.
  success: { paddingVertical: 4 },
  successText: {
    fontFamily: f.hand,
    color: c.red,
    fontSize: 26,
    lineHeight: 32,
  },
  hint: { fontFamily: f.regular, fontSize: 16, lineHeight: 24, color: c.muted },
});
