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
import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Answer, Block } from "../content/types";
import { colors as c, fonts as f } from "../theme";
import { isCorrect, isDone, hasInk } from "../lib/assessment";
import { promptRepeatsTitle } from "../lib/blockText";
import { BookImage } from "./BookImage";
import { useTaskSize } from "./taskSize";
import { Button, RetryNote } from "./Controls";
import { TextWithBlanks } from "./Blank";
import { HandFrame, Rows } from "./HandDrawn";
import { CELL, wholeCells, written } from "../lib/grid";
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
  const [rowWidth, setRowWidth] = useState(0);
  // A laptop window is wide but low: the sample goes to the left of the work
  // instead of above it, so both fit under the lesson header.
  const beside =
    size.wide &&
    size.fit &&
    // Only where the work itself is a big field; a row of answers or a
    // question list reads better under a full-width picture.
    ["draw", "counters", "shape", "practical"].includes(block.kind) &&
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
    // No gaps of its own: every part takes whole rows of the sheet, and an
    // empty row is left where one is needed.
    <View>
      {size.compact && (
        // The button's two rows; the heading under it is written on the
        // lower line of its own two, which leaves a row between them.
        <View style={{ height: CELL * 2 }}>
          <CoachButton onPress={showTaskCoach} />
        </View>
      )}
      {/* On wider screens the button sits beside the heading: a row of its own
          pushed the task a whole line down. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: CELL,
          // An empty row between the task and what it is about.
          marginBottom: CELL,
        }}
      >
        <View
          ref={instructionRef}
          collapsable={false}
          style={{ flex: 1, minWidth: 0 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text
              testID="block-title"
              style={[s.title, size.tall && written(30, 2)]}
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
            // A gap in the prompt («1, □, □, 4») is a field, not the glyph.
            <TextWithBlanks
              testID="block-prompt"
              style={StyleSheet.flatten([
                s.prompt,
                size.tall && written(24, 2),
              ])}
              text={block.prompt}
            />
          )}
        </View>
        {!size.compact && <CoachButton onPress={showTaskCoach} />}
      </View>
      <View
        onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
        style={
          beside
            ? { flexDirection: "row", alignItems: "flex-start", gap: CELL }
            : { gap: CELL }
        }
      >
        <View
          ref={imagesRef}
          collapsable={false}
          style={[
            { gap: CELL },
            // The sample's column is a whole number of cells wide, so the
            // work beside it starts on a line of the sheet.
            beside &&
              (rowWidth > 0
                ? { width: wholeCells(((rowWidth - CELL) * 4) / 11) }
                : { flex: 4, minWidth: 0 }),
            // Without a picture the place for it must not push the answers
            // half a cell down.
            block.kind !== "picture" &&
              !block.images.length &&
              !review && { display: "none" },
          ]}
        >
          {block.kind === "picture" && (
            <Rows>
              <PictureTask
                block={block}
                value={Array.isArray(answer.value) ? answer.value : []}
                onChange={(value) =>
                  onAnswer({
                    ...answer,
                    value,
                    checked: true,
                    reviewed: false,
                  })
                }
              />
            </Rows>
          )}
          {block.kind !== "picture" && !!block.images.length && (
            <Rows
              testID="picture-frame"
              style={s.images}
              frame={<HandFrame seed={`${block.id}-picture`} />}
              contentStyle={[
                s.imagesContent,
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
            </Rows>
          )}
          {/* The note is about the picture, so it stays with the picture
              instead of under the answer. */}
          {review && (
            <Text style={s.hint}>
              Мешки стоят близко друг к другу. Положи палочки для тех мешков,
              которые видишь, и нажми «Дальше».
            </Text>
          )}
        </View>
        <View
          ref={answerRef}
          collapsable={false}
          style={[
            { gap: CELL },
            beside && { flex: rowWidth > 0 ? 1 : 7, minWidth: 0 },
            // A picture that is pressed has nothing under it until it is
            // answered: no empty row is kept for that.
            block.kind === "picture" &&
              !done &&
              !(answer.checked && !correct) && { display: "none" },
          ]}
        >
          {block.kind === "location" && (
            <Rows>
              <LocationTask block={block} answer={answer} onAnswer={onAnswer} />
            </Rows>
          )}
          {block.kind === "read" && <Text style={s.body}>{block.body}</Text>}
          {block.kind === "story" && (
            <Rows>
              <StoryTask block={block} answer={answer} onAnswer={onAnswer} />
            </Rows>
          )}
          {block.kind === "numberGame" && (
            <Rows>
              <NumberGameTask
                block={block}
                answer={answer}
                onAnswer={onAnswer}
              />
            </Rows>
          )}
          {block.kind === "practical" && (
            <Rows>
              <PracticalTask
                block={block}
                answer={answer}
                onAnswer={onAnswer}
                onDrawing={onDrawing}
              />
            </Rows>
          )}
          {[
            "work",
            "compose",
            "activity",
            "recipe",
            "relation",
            "targetGame",
          ].includes(block.kind) && (
            <Rows>
              <CourseTask
                block={block}
                answer={answer}
                onAnswer={onAnswer}
                onDrawing={onDrawing}
              />
            </Rows>
          )}
          {block.kind === "number" && (
            <Text style={s.instruction}>Выбери верное число ниже.</Text>
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
                    {answer.value !== n && (
                      <HandFrame seed={`${block.id}-${n}`} />
                    )}
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
                  {answer.value !== v && (
                    <HandFrame seed={`${block.id}-${v}`} />
                  )}
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
            <Rows>
              <CounterBoard
                value={numeric}
                token={block.token}
                onChange={(value) => update({ value })}
                onDrawing={onDrawing}
              />
            </Rows>
          )}
          {block.kind === "draw" && (
            <Rows>
              <DrawingPad
                strokes={answer.strokes ?? []}
                onChange={(strokes) => update({ strokes })}
                trace={block.trace}
                onDrawing={onDrawing}
              />
            </Rows>
          )}
          {block.kind === "shape" && (
            <Rows>
              <ShapeBoard
                onDrawing={onDrawing}
                block={block}
                value={Array.isArray(answer.value) ? answer.value : []}
                onChange={(value) => update({ value })}
              />
            </Rows>
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
  // Heading and task take a cell and a quarter each: with the half-cell gap
  // under them a one-line task is three cells, and the picture starts on a line.
  // The heading is written on the second line of its two rows, the task
  // takes a row for every line of it.
  title: { fontFamily: f.bold, color: c.ink, ...written(26, 2) },
  doneMark: { fontFamily: f.hand, color: c.red, ...written(32, 2, true) },
  prompt: {
    fontFamily: f.regular,
    fontSize: 20,
    lineHeight: CELL,
    color: c.ink,
  },
  source: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 19,
    color: c.muted,
    marginTop: 7,
  },
  body: { fontFamily: f.regular, fontSize: 18, lineHeight: CELL, color: c.ink },
  // Картинка из книги вклеена на лист: белая рамка, тонкая линия.
  images: {
    backgroundColor: c.card,
    padding: CELL / 2,
    justifyContent: "center",
  },
  imagesContent: { columnGap: CELL / 2, rowGap: CELL },
  // Boxes stand three cells apart and are two cells high.
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: CELL,
    rowGap: CELL,
  },
  number: {
    width: CELL * 2,
    height: CELL * 2,
    backgroundColor: c.card,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: { fontFamily: f.heavy, color: c.pen, fontSize: 25, lineHeight: CELL },
  selected: { backgroundColor: c.pen },
  option: {
    flexBasis: CELL * 9,
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: c.card,
    paddingHorizontal: 17,
    paddingVertical: CELL / 2,
    borderRadius: 4,
    minHeight: CELL * 3,
  },
  optionIndex: {
    fontFamily: f.bold,
    color: c.muted,
    fontSize: 13,
    lineHeight: CELL,
  },
  optionText: {
    fontFamily: f.bold,
    color: c.ink,
    fontSize: 17,
    lineHeight: CELL,
    flexShrink: 1,
  },
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
  trayHint: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 16,
    lineHeight: 24,
  },
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
  count: { fontFamily: f.heavy, fontSize: 28, lineHeight: 24, color: c.pen },
  review: {
    padding: 18,
    gap: 12,
    borderRadius: 6,
    backgroundColor: c.washWarm,
  },
  reviewTitle: {
    fontFamily: f.bold,
    color: c.ink,
    fontSize: 15,
    lineHeight: 24,
  },
  reviewBody: {
    fontFamily: f.regular,
    color: c.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  // Отметка учителя: написана красной ручкой прямо на листе.
  success: {},
  successText: {
    fontFamily: f.hand,
    color: c.red,
    ...written(24, 1, true),
  },
  hint: { fontFamily: f.regular, fontSize: 16, lineHeight: 24, color: c.muted },
  instruction: {
    fontFamily: f.regular,
    fontSize: 18,
    lineHeight: CELL,
    color: c.ink,
  },
});
