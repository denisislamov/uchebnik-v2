import { useTaskCoach } from "./TaskCoach";
import {
  GestureCoachProvider,
  CoachButton,
  useCoachAnchor,
} from "./GestureCoach";
import { LocationTask } from "./LocationTask";
import { locationStage } from "../lib/location";
import { CounterBoard } from "./CounterBoard";
import { CourseTask } from "./CourseTask";
import { PictureTask } from "./PictureTask";
import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import type { Answer, Block } from "../content/types";
import { colors as c, fonts as f } from "../theme";
import { isCorrect, isDone, hasInk } from "../lib/assessment";
import { promptRepeatsTitle } from "../lib/blockText";
import { offerHelp, retryLine, successLine } from "../lib/feedback";
import { BookImage } from "./BookImage";
import { assets } from "../content/assetSet";
import { fitsPhone, useTaskSize } from "./taskSize";
import { scrollbarGutter } from "../lib/scrollbar";
import { useSheetWindow } from "../lib/settledWindow";
import { Button, RetryNote } from "./Controls";
import { TextWithBlanks } from "./Blank";
import { HandFrame, Rows } from "./HandDrawn";
import { CELL, upToCells, wholeCells, written } from "../lib/grid";
import { AsideProvider } from "./Aside";
import { CheckRow, FieldInHand, ResultContext, ResultRows } from "./Result";
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
  /**
   * What stands over the task on every step; it is given the help button,
   * which belongs to the task but has its place up there.
   */
  header?: (help: React.ReactNode) => React.ReactNode;
  /** The task is being fitted to the window and is not shown yet. */
  veiled?: boolean;
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
function ExerciseBody({
  block,
  answer,
  onAnswer,
  onDrawing,
  header,
  veiled = false,
}: ExerciseProps) {
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
  // The question in hand — the one the cursor is in, or the first that is
  // not answered right yet: the picture shows what it asks about.
  const [inHand, setInHand] = useState<string | null>(null);
  const questions = block.kind === "work" ? block.fields : [];
  const asked =
    questions.find((q) => q.id === inHand) ??
    questions.find(
      (q) => (answer.responses?.[q.id] ?? "").trim() !== q.expected,
    );
  // The last press on a picture to press was beside everything on it.
  const [pictureMiss, setPictureMiss] = useState(false);
  // What the work hands to the sample's column (see Aside). Its rows are
  // reckoned, not measured: a hint or a «try again» note that grows by a
  // line must not resize the sample, and with it the sheet under the pen.
  const [asideNode, setAsideNode] = useState<React.ReactNode>(null);
  const asideRows = asideNode ? CELL * 6 : 0;
  const single = block.images.filter((id) => id !== "p011_balls_row_3_groups");
  const asset = single.length === 1 ? assets[single[0]] : undefined;
  // Only where the work itself is a big field; a row of answers or a
  // question list reads better under a full-width picture.
  const field =
    size.fit && ["draw", "counters", "shape", "practical"].includes(block.kind);
  // Next to a big field the sample's pictures stand in one row, and the
  // frame is as wide as that row: how wide it is at a given height.
  const aspects = single.map((id) =>
    assets[id] ? assets[id].width / assets[id].height : 1,
  );
  const across = (height: number) =>
    aspects.reduce((sum, a) => sum + a * height, 0) +
    ((aspects.length - 1) * CELL) / 2 +
    CELL;
  // A laptop window is wide but low: the sample goes to the left of the work
  // instead of above it, so both fit under the lesson header. Its column is
  // just wide enough for the pictures to take the rows the window leaves for
  // the work (less what the work handed over to stand under them). A sample that would need a
  // wider column is a low strip over empty paper: on a tall window it goes
  // above the work, a few rows high; a low one has no rows to spare, so it
  // stays at the side and the work's words fill the paper under it.
  const sideHeight = Math.max(
    size.landscape ? CELL * 10 : CELL * 3,
    size.beside - asideRows,
  );
  // A drawing keeps the width it had: the sheet grows with its column, and a
  // narrower one left rows of empty paper under a smaller sheet. A board
  // needs less, and leaves the sample half the row.
  const widest = wholeCells(
    ((rowWidth - CELL) * (block.kind === "draw" ? 4 : 5.5)) / 11,
  );
  const needed = upToCells(across(sideHeight));
  const sideWidth = Math.max(CELL * 6, Math.min(needed, widest));
  // Until the row is measured the sample is taken to stand beside: laid out
  // full width first, the buttons of the work would keep that width.
  const beside =
    size.wide &&
    field &&
    single.length > 0 &&
    (rowWidth === 0 ||
      needed <= widest ||
      !size.tall ||
      // A tall landscape window still has room for a scene beside the
      // board. Moving it above used to reduce it to six rows (144px).
      (size.landscape && single.length === 1 && aspects[0] < 2.2));
  // Several pictures wrap in the side column and share the
  // window's height; tied to the work's height, a small sheet made them
  // specks.
  const lines = Math.ceil(single.length / 2);
  const pictureHeight = beside
    ? lines > 1
      ? Math.max(
          size.landscape ? CELL * 6 : CELL * 3,
          (size.beside - asideRows - (lines - 1) * CELL) / lines,
        )
      : sideHeight
    : field && single.length
      ? size.landscape
        ? // Below the two-column breakpoint keep the scene large and let
          // the field scroll. A wide strip naturally stays low by its ratio.
          // Reserve one extra row for width/height rounding of narrow art.
          Math.max(CELL * 11, Math.min(size.picture, CELL * 15))
        : Math.min(
            size.picture,
            single.length === 1 && aspects[0] >= 2.2 ? CELL * 3 : CELL * 6,
          )
      : block.kind === "read"
        ? size.read
        : size.picture;
  const pictureWidth = asset
    ? (pictureHeight * asset.width) / asset.height
    : field && !beside && single.length > 1
      ? across(pictureHeight) - CELL
      : undefined;
  const done = isDone(block, answer),
    correct = isCorrect(block, answer);
  // A phone shows this task whole (see `fitsPhone`).
  const whole = size.compact && fitsPhone(block.kind);
  // On a phone the eleven answers take two rows of six, half a cell apart
  // and two cells high: five rows of the sheet in all.
  const sheetWidth = useSheetWindow().width;
  const phone = size.compact
    ? (() => {
        const writing =
            rowWidth || wholeCells(sheetWidth - scrollbarGutter() - CELL / 2),
          gap = CELL / 2;
        return {
          gap,
          box: Math.min(CELL * 3, Math.floor((writing - 5 * gap) / 6)),
          high: CELL * 2,
        };
      })()
    : null;
  // An answer given by a press is checked at once: a miss is counted here.
  const missed = (wrong: boolean) => (answer.attempts ?? 0) + (wrong ? 1 : 0);
  const update = (patch: Partial<Answer>) =>
    onAnswer({ ...answer, ...patch, checked: false, reviewed: false });
  const review = block.kind === "counters" && block.expected === undefined;
  // What the task answers with, if it has been answered.
  const missedIt =
    !!answer.checked &&
    !correct &&
    (block.kind !== "picture" ||
      (Array.isArray(answer.value) &&
        answer.value.some((id) => !block.expected.includes(id))));
  const result = missedIt ? (
    // The words and, after a second miss, the help offered by a button of
    // its own: side by side where there is room, so that both stand in the
    // rows kept for them.
    <View style={s.missed}>
      <View style={s.missedWords}>
        <RetryNote tight>{retryLine(block, answer)}</RetryNote>
      </View>
      {offerHelp(answer) && (
        <View testID="help-offer">
          <Button secondary small onPress={showTaskCoach}>
            Показать подсказку
          </Button>
        </View>
      )}
    </View>
  ) : !review && done && block.kind !== "read" ? (
    <View accessibilityLiveRegion="polite" style={s.success}>
      <Text style={s.successText}>{successLine(block, answer)}</Text>
    </View>
  ) : null;
  const numeric = typeof answer.value === "number" ? answer.value : 0;
  const hasValue =
    block.kind === "shape"
      ? Array.isArray(answer.value) && answer.value.length > 0
      : answer.value !== undefined && answer.value !== "";
  return (
    // No gaps of its own: every part takes whole rows of the sheet, and an
    // empty row is left where one is needed.
    <FieldInHand.Provider value={setInHand}>
      <ResultContext.Provider value={result}>
        <AsideProvider value={beside ? setAsideNode : null}>
          <View>
            {/* The help has one place on every step and every screen: the
          right end of the row over the task. The heading under it is written
          on the lower line of its two rows, which leaves a row between them. */}
            {header ? (
              header(
                <CoachButton dense={size.compact} onPress={showTaskCoach} />,
              )
            ) : (
              <View style={{ height: CELL * 2 }}>
                <CoachButton onPress={showTaskCoach} />
              </View>
            )}
            {/* What stands around the task stays; the task itself comes in. */}
            <View testID="exercise-body" style={[s.body_, veiled && s.veiled]}>
              <View
                style={{
                  // An empty row between the task and what it is about.
                  marginBottom: CELL,
                }}
              >
                <View
                  ref={instructionRef}
                  collapsable={false}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {/* The exercise's number stands before it, as in the book. */}
                    {!!block.exerciseNumber && (
                      <Text testID="exercise-number" style={s.exerciseNumber}>
                        № {block.exerciseNumber}
                      </Text>
                    )}
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
                      // On a phone one question is asked at a time: once the
                      // first of the two about a picture's place is answered,
                      // the second stands here.
                      text={
                        size.compact &&
                        block.kind === "location" &&
                        block.verticalPrompt.trim() === block.prompt.trim() &&
                        locationStage(block, answer) !== "vertical"
                          ? block.horizontalPrompt
                          : block.prompt
                      }
                    />
                  )}
                </View>
              </View>
              <View
                onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
                style={
                  beside
                    ? {
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: CELL,
                      }
                    : { gap: CELL }
                }
              >
                <View
                  ref={imagesRef}
                  collapsable={false}
                  testID="sample-column"
                  style={[
                    { gap: CELL },
                    // The sample's column is a whole number of cells wide, so the
                    // work beside it starts on a line of the sheet.
                    beside &&
                      (rowWidth > 0
                        ? { width: sideWidth }
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
                            attempts: missed(
                              value.some((id) => !block.expected.includes(id)),
                            ),
                          })
                        }
                        onMiss={setPictureMiss}
                      />
                    </Rows>
                  )}
                  {block.kind !== "picture" && !!block.images.length && (
                    <Rows
                      testID="picture-frame"
                      style={[
                        s.images,
                        // On a phone that shows the task whole the rows of the
                        // frame's margins go to the picture.
                        whole && { padding: 0 },
                        // One picture: the frame hugs it instead of leaving wide
                        // white fields at its sides.
                        pictureWidth !== undefined && {
                          maxWidth: pictureWidth + (whole ? 0 : CELL),
                          width: "100%",
                          alignSelf: "center",
                        },
                      ]}
                      frame={<HandFrame seed={`${block.id}-picture`} />}
                      contentStyle={[
                        s.imagesContent,
                        block.images.length > 1 && {
                          flexDirection: "row",
                          flexWrap:
                            field && !beside && !size.landscape
                              ? "nowrap"
                              : "wrap",
                        },
                        size.compact &&
                          block.kind === "read" &&
                          block.images.length >= 3 && {
                            justifyContent: "center",
                          },
                      ]}
                    >
                      {block.images
                        .filter((id) => id !== "p011_balls_row_3_groups")
                        .map((id, i) => (
                          <View
                            key={id}
                            style={
                              block.images.length > 1
                                ? field && !beside
                                  ? {
                                      flexGrow: aspects[i],
                                      flexBasis: size.landscape ? CELL * 11 : 0,
                                      minWidth: 0,
                                    }
                                  : size.compact && block.id === "p108-source06"
                                    ? {
                                        flexGrow: 0,
                                        flexBasis: "47%",
                                        maxWidth: "47%",
                                      }
                                    : size.compact &&
                                        block.kind === "read" &&
                                        (block.id === "p127-source-art" ||
                                          block.id === "p128-source-art" ||
                                          block.id === "p129-source-art")
                                      ? {
                                          flexGrow: 0,
                                          flexBasis: "100%",
                                          maxWidth: "100%",
                                        }
                                    : size.compact &&
                                        block.kind === "read" &&
                                        block.images.length >= 3
                                      ? (block.id === "p093-source-art" ||
                                          block.id === "p105-source-art") &&
                                        aspects[i] >= 2.5
                                        ? {
                                            flexGrow: 0,
                                            flexBasis: "100%",
                                            maxWidth: "100%",
                                          }
                                        : {
                                            flexGrow: 0,
                                            flexBasis: "47%",
                                            maxWidth: "47%",
                                          }
                                      : {
                                          flexGrow: 1,
                                          flexBasis: size.landscape
                                            ? CELL * (beside ? 6 : 11)
                                            : 110,
                                          maxWidth: "100%",
                                        }
                                : { width: "100%" }
                            }
                          >
                            <BookImage
                              id={id}
                              maxHeight={pictureHeight}
                              marks={
                                asked?.marks?.image === id
                                  ? asked.marks.shapes
                                  : undefined
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
                      Мешки стоят близко друг к другу. Положи палочки для тех
                      мешков, которые видишь, и нажми «Дальше».
                    </Text>
                  )}
                  {beside && asideNode && (
                    <View testID="sample-aside">{asideNode}</View>
                  )}
                </View>
                <View
                  ref={answerRef}
                  collapsable={false}
                  testID="work-column"
                  style={[
                    { gap: CELL },
                    beside && { flex: rowWidth > 0 ? 1 : 7, minWidth: 0 },
                  ]}
                >
                  {block.kind === "location" && (
                    <Rows>
                      <LocationTask
                        block={block}
                        answer={answer}
                        onAnswer={onAnswer}
                      />
                    </Rows>
                  )}
                  {block.kind === "read" && (
                    <Text style={s.body}>{block.body}</Text>
                  )}
                  {block.kind === "story" && (
                    <Rows>
                      <StoryTask
                        block={block}
                        answer={answer}
                        onAnswer={onAnswer}
                      />
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
                    // What to do stands here until it is done; then the
                    // answer to it does.
                    <ResultRows>
                      {result ?? (
                        <Text style={s.instruction}>
                          Выбери верное число ниже.
                        </Text>
                      )}
                    </ResultRows>
                  )}
                  {block.kind === "number" && (
                    <Rows
                      testID="number-answers"
                      // On a phone the eleven answers lie in two rows, so that
                      // all of them are seen under the picture; they are laid
                      // out by the width of the screen, not by the cells.
                      object={!!phone}
                      contentStyle={[
                        s.options,
                        !!phone && {
                          columnGap: phone.gap,
                          rowGap: CELL,
                          // Six to a row and no more, whatever is left of
                          // the width after the boxes.
                          maxWidth: phone.box * 6 + phone.gap * 5,
                        },
                      ]}
                    >
                      {Array.from({ length: 11 }, (_, n) => (
                        <AnswerAnchor key={n} value={n}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Ответ ${n}`}
                            accessibilityState={{
                              selected: answer.value === n,
                            }}
                            onPress={() =>
                              onAnswer({
                                ...answer,
                                value: n,
                                checked: true,
                                reviewed: false,
                                attempts: missed(n !== block.expected),
                              })
                            }
                            style={({ pressed }) => [
                              s.number,
                              !!phone && {
                                width: phone.box,
                                height: phone.high,
                              },
                              pressed && s.pressed,
                              answer.value === n && s.selected,
                            ]}
                          >
                            <Text
                              style={[
                                s.digit,
                                !!phone && s.digitPhone,
                                answer.value === n && { color: c.white },
                              ]}
                            >
                              {n}
                            </Text>
                          </Pressable>
                        </AnswerAnchor>
                      ))}
                    </Rows>
                  )}
                  {block.kind === "choice" && (
                    <View style={s.options}>
                      {block.options.map((v) => (
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
                              attempts: missed(v !== block.expected),
                            })
                          }
                          style={({ pressed }) => [
                            s.option,
                            pressed && s.pressed,
                            answer.value === v && s.selected,
                          ]}
                        >
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
                        result={result}
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
                  {/* What the task answers with — «верно» or where to look
                  again — has its own two rows, kept for it from the start:
                  the words appear in view and move nothing. They stand
                  under the work — beside «Проверить ответ» where there is
                  one and the screen is wide; a number's answers have them
                  over them, and a drawing sheet under it, where the hint
                  stood. */}
                  {!review &&
                    (block.kind === "counters" || block.kind === "shape") && (
                      <CheckRow>
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
                      </CheckRow>
                    )}
                  {/* A task checked by a press has no button: the words have
                  their two rows under the answers. */}
                  {["choice", "location"].includes(block.kind) && (
                    <ResultRows />
                  )}
                  {block.kind === "picture" && (
                    // The rows under a picture to press say what the last
                    // press did: a miss, how many are marked, «верно».
                    <ResultRows>
                      {result ??
                        (pictureMiss ? (
                          <RetryNote tight>
                            Нажми прямо на предмет или цифру.
                          </RetryNote>
                        ) : block.expected.length > 1 ? (
                          <Text
                            accessibilityLiveRegion="polite"
                            style={s.marked}
                          >
                            Отмечено:{" "}
                            {Array.isArray(answer.value)
                              ? answer.value.filter((x) => x !== "miss").length
                              : 0}
                          </Text>
                        ) : null)}
                    </ResultRows>
                  )}
                </View>
              </View>
            </View>
          </View>
        </AsideProvider>
      </ResultContext.Provider>
    </FieldInHand.Provider>
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
  body_: Platform.select({
    web: {
      transitionProperty: "opacity",
      transitionDuration: "120ms",
    } as object,
    default: {},
  }) as object,
  veiled: { opacity: 0 },
  // Heading and task take a cell and a quarter each: with the half-cell gap
  // under them a one-line task is three cells, and the picture starts on a line.
  // The heading is written on the second line of its two rows, the task
  // takes a row for every line of it.
  title: {
    fontFamily: f.bold,
    color: c.ink,
    flexShrink: 1,
    ...written(26, 2),
  },
  exerciseNumber: { fontFamily: f.regular, color: c.muted, ...written(16, 2) },
  doneMark: { fontFamily: f.hand, color: c.success, ...written(32, 2, true) },
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
  // A small box gets a plain line: drawn by hand this small it reads as a
  // smudge.
  // An answer is what a finger aims at most: three cells by three, a cell
  // apart from its neighbours, with the lip of a button.
  number: {
    width: CELL * 3,
    height: CELL * 3,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.line,
    borderBottomWidth: 3,
    borderBottomColor: c.lip,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: {
    fontFamily: f.heavy,
    color: c.pen,
    fontSize: 34,
    lineHeight: CELL * 2,
  },
  marked: {
    fontFamily: f.bold,
    color: c.pen,
    fontSize: 20,
    lineHeight: CELL,
  },
  digitPhone: { fontSize: 30, lineHeight: CELL * 2 },
  // Pressed, a box answers at once; chosen, it is filled and framed.
  pressed: { backgroundColor: c.wash },
  selected: {
    backgroundColor: c.pen,
    borderColor: c.penDark,
    borderBottomColor: c.penDark,
  },
  option: {
    flexBasis: CELL * 9,
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.line,
    borderBottomWidth: 3,
    borderBottomColor: c.lip,
    paddingHorizontal: 17,
    paddingVertical: CELL / 2,
    borderRadius: 6,
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
  missed: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: CELL,
    rowGap: CELL / 2,
  },
  missedWords: { flexGrow: 1, flexShrink: 1, flexBasis: CELL * 10 },
  // Верный ответ: зелёный рукописный текст прямо на листе.
  success: {},
  successText: {
    fontFamily: f.hand,
    color: c.success,
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
