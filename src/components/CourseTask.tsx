import { CounterBoard } from "./CounterBoard";
import { CompositionBoard } from "./CompositionBoard";
import { composeStory, storySubjects } from "../lib/composeStory";
import { DrawingPad } from "./DrawingPad";
import { relationPlan } from "../lib/relationDrawing";
import { BookImage } from "./BookImage";
import React, { useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { Answer, Block } from "../content/types";
import { courseCorrect, compositionCorrect } from "../lib/courseAssessment";
import { colors as c, fonts as f } from "../theme";
import { Button, CellPressable, RetryNote } from "./Controls";
import { CheckRow, FieldInHand } from "./Result";
import { CoinPurse } from "./CoinPurse";
import { BLANK, TextWithBlanks, spokenBlanks } from "./Blank";
import { HandFrame, Rows } from "./HandDrawn";
import { CELL, cells, written } from "../lib/grid";
import { useSheetWindow } from "../lib/settledWindow";
/**
 * A part of a task — one number to lay out, one example to make up — is
 * written on the sheet itself, as in the book: no frame and no white card
 * around it. Its lines and boards follow one another a row apart; a small
 * button keeps its own width instead of stretching across the sheet.
 */
/** Children one by one, with what stands in fragments taken out of them. */
const parts = (children: React.ReactNode): React.ReactNode[] =>
  React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<{ children?: React.ReactNode }>(child) &&
    child.type === React.Fragment
      ? parts(child.props.children)
      : [child],
  );
function Card({
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View testID="task-part" style={s.part}>
      {parts(children)
        .filter(
          (child) => !(React.isValidElement(child) && child.type === HandFrame),
        )
        .map((child, i) =>
          React.isValidElement<{ small?: boolean }>(child) &&
          child.type === Button &&
          child.props.small ? (
            <View key={child.key ?? i} style={{ alignSelf: "flex-start" }}>
              {child}
            </View>
          ) : React.isValidElement(child) &&
            (child.type === Text || child.type === TextWithBlanks) ? (
            child
          ) : (
            // A board, a row of counters or a box with its name takes whole
            // rows, so the line written under it stands on the ruling.
            <Rows key={(React.isValidElement(child) && child.key) || i}>
              {child}
            </Rows>
          ),
        )}
    </View>
  );
}
// An arithmetic frame such as «4 + □ =», not a worded question.
const isExpression = (label: string) => /^[\d\s+−\-×·:÷□()]+=\s*$/.test(label);
// A long column of + and − examples with nothing to lean on: a number row to
// count along. Only for addition and subtraction within 20.
function numberLine(fields: { label: string }[]) {
  if (fields.length < 6 || !fields.every((f) => isExpression(f.label)))
    return undefined;
  if (fields.some((f) => /[×·:÷]/.test(f.label))) return undefined;
  const top = Math.max(
    ...fields.flatMap((f) => (f.label.match(/\d+/g) ?? []).map(Number)),
  );
  return top <= 10 ? 10 : top <= 20 ? 20 : undefined;
}
type WorkField = { label: string; id: string; context?: string };
/**
 * Fields as they are laid out: examples that follow one another stand in
 * columns, a worded question takes the width of the sheet.
 */
function workGroups<F extends WorkField & { options?: string[] }>(fields: F[]) {
  const groups: {
    examples: boolean;
    labelCells: number;
    fields: { field: F; index: number }[];
  }[] = [];
  fields.forEach((field, index) => {
    const example =
      isExpression(field.label) && !field.options && !field.context;
    const last = groups.at(-1);
    if (last && last.examples && example) last.fields.push({ field, index });
    else
      groups.push({
        examples: example,
        labelCells: 0,
        fields: [{ field, index }],
      });
  });
  // A lone example is a question like any other.
  for (const group of groups) {
    if (group.examples && group.fields.length < 2) group.examples = false;
    // A digit or a sign takes about half a cell, a gap a quarter; a blank
    // is drawn three gaps wide.
    const widest = Math.max(
      ...group.fields.map(({ field }) =>
        [...field.label.trim()].reduce(
          (w, ch) => w + (ch === " " ? 6 : ch === "□" ? 22 : 12.5),
          0,
        ),
      ),
    );
    group.labelCells = Math.max(3, Math.ceil((widest + 14) / CELL));
  }
  return groups;
}
/** «Ещё раз» beside a box too narrow for the words: the sign of the note alone. */
function RetryMark() {
  return (
    <View
      testID="retry-mark"
      accessibilityLabel="Попробуй ещё раз"
      style={s.retryMark}
    >
      <Text style={s.retryMarkText}>↻</Text>
    </View>
  );
}
function NumberLine({ max }: { max: number }) {
  // On a phone the row from 0 to 10 stays one row.
  const narrow = useSheetWindow().width < 600;
  return (
    <View
      testID="number-line"
      // A ruler lying on the sheet: its cells touch each other on purpose.
      {...({ dataSet: { sheet: "object" } } as object)}
      accessibilityLabel={`Числовой ряд от 0 до ${max}`}
      style={s.numberLine}
    >
      {Array.from({ length: max + 1 }, (_, n) => (
        <View key={n} style={[s.numberCell, narrow && { width: 32 }]}>
          <Text style={s.numberText}>{n}</Text>
        </View>
      ))}
    </View>
  );
}
const tokenStyle = {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: c.pen,
  margin: 3,
};
export function CourseTask({
  block,
  answer,
  onAnswer,
  onDrawing,
}: {
  block: Block;
  answer: Answer;
  onAnswer: (a: Answer) => void;
  onDrawing: (value: boolean) => void;
}) {
  const card = s.card;
  const narrow = useSheetWindow().width < 600;
  const takeInHand = useContext(FieldInHand);
  // Follows what stands above it in a card after an empty row.
  const below = { marginTop: CELL };
  const r = answer.responses ?? {};
  const set = (key: string, value: string) =>
    onAnswer({ ...answer, responses: { ...r, [key]: value }, checked: false });
  const input = (key: string, label: string) => (
    <TextInput
      key={key}
      accessibilityLabel={label}
      value={r[key] ?? ""}
      onChangeText={(v) => set(key, v.replace(/[^0-9]/g, "").slice(0, 3))}
      onFocus={() => takeInHand?.(key)}
      keyboardType="number-pad"
      inputMode="numeric"
      maxLength={3}
      // On a phone a box is three cells wide: «□ + □ = □» still fits a row.
      style={[s.input, narrow && { width: cells(3) }]}
    />
  );
  const chips = (key: string, values: (number | string)[], label: string) => (
    <View style={[s.row, s.chips]}>
      {values.map((v) => (
        <CellPressable
          key={v}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${v}`}
          accessibilityState={{ selected: r[key] === String(v) }}
          style={[s.chip, r[key] === String(v) && s.selected]}
          onPress={() => set(key, String(v))}
        >
          <Text
            style={[
              s.text,
              s.chipText,
              r[key] === String(v) && { color: c.white },
            ]}
          >
            {v}
          </Text>
        </CellPressable>
      ))}
    </View>
  );
  // «− 0 +»: the number stands in the middle of the buttons' height.
  const stepper = (key: string, label: string, max: number, step = 1) => (
    <View style={[s.row, { alignItems: "center" }]}>
      <Button
        small
        secondary
        disabled={!(Number(r[key]) > 0)}
        label={`${label}: убрать`}
        onPress={() =>
          set(key, String(Math.max(0, (Number(r[key]) || 0) - step)))
        }
      >
        −
      </Button>
      <Text style={[s.text, s.amount]}>{Number(r[key]) || 0}</Text>
      <Button
        small
        secondary
        disabled={(Number(r[key]) || 0) >= max}
        label={`${label}: добавить`}
        onPress={() =>
          set(key, String(Math.min(max, (Number(r[key]) || 0) + step)))
        }
      >
        +
      </Button>
    </View>
  );
  return (
    <View style={{ gap: CELL }}>
      {block.kind === "targetGame" && (
        <Card style={card}>
          <HandFrame seed="card" />
          <Text style={s.label}>
            Игрок 1: {r.score0 || 0} · Игрок 2: {r.score1 || 0}
          </Text>
          <Text style={s.note}>
            {courseCorrect(block, answer)
              ? `Выиграл игрок ${Number(r.score0) >= 100 ? 1 : 2}!`
              : `Ход игрока ${(Number(r.turn) || 0) + 1}`}
          </Text>
          <Rows object>
            <View
              style={{
                alignSelf: "center",
                width: 240,
                height: 240,
                borderRadius: 120,
                borderWidth: 2,
                borderColor: c.pen,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {[10, 20, 30].map((points, i) => (
                <Pressable
                  key={points}
                  accessibilityRole="button"
                  accessibilityLabel={`Попасть в круг: ${points} очков`}
                  style={{
                    position: "absolute",
                    width: 240 - i * 70,
                    height: 240 - i * 70,
                    borderRadius: 120,
                    borderWidth: 2,
                    borderColor: c.pen,
                    alignItems: "center",
                    backgroundColor:
                      i === 0 ? c.paper : i === 1 ? c.wash : c.washWarm,
                  }}
                  onPress={() => {
                    if (courseCorrect(block, answer)) return;
                    const turn = Number(r.turn) || 0;
                    onAnswer({
                      ...answer,
                      checked: true,
                      responses: {
                        ...r,
                        [`score${turn}`]: String(
                          (Number(r[`score${turn}`]) || 0) + points,
                        ),
                        turn: String(1 - turn),
                      },
                    });
                  }}
                >
                  <Text style={s.text}>{points}</Text>
                </Pressable>
              ))}
            </View>
          </Rows>
          <Button
            secondary
            small
            onPress={() => onAnswer({ responses: {}, checked: false })}
          >
            Новая игра
          </Button>
        </Card>
      )}
      {block.kind === "recipe" && (
        <Card style={card}>
          <HandFrame seed="card" />
          <Text style={s.label}>
            {block.context
              ? "Составь похожую задачу со своими числами"
              : "О чём будет задача?"}
          </Text>
          {block.context && (
            <TextWithBlanks
              style={s.text}
              text={block.context.replace(
                /\{([abc])\}/g,
                (_, key) => r[key] || BLANK,
              )}
            />
          )}
          {block.excludedInputs && (
            <Text style={s.note}>
              Измени хотя бы одно число из исходной задачи. Сохрани её смысл.
            </Text>
          )}
          {chips(
            "story",
            block.unit
              ? [block.unit]
              : [
                  "яблоки",
                  "книги",
                  "карандаши",
                  "метры",
                  "рубли",
                  "литры",
                  "килограммы",
                ],
            "Сюжет",
          )}
          <TextWithBlanks
            style={s.note}
            text={`Выбери свои числа для схемы ${block.formula
              .replace(/[abc]/g, (k) => r[k] || BLANK)
              .replace(/\*/g, "×")
              .replace(
                /\//g,
                ":",
              )}. Результат должен быть целым числом от ${block.minResult ?? 0} до ${block.max}.`}
          />
          {[...new Set(block.formula.match(/[abc]/g) ?? [])].map((k) => (
            // The box stands half a cell under its name: beside it, it would
            // start wherever the words end.
            <View key={k} style={{ gap: CELL / 2 }}>
              <Text style={s.text}>
                {block.inputLabels?.[k] ??
                  { a: "Первое число", b: "Второе число", c: "Третье число" }[
                    k
                  ]}{" "}
                =
              </Text>
              {input(k, block.inputLabels?.[k] ?? `Число ${k}`)}
            </View>
          ))}
          <View style={{ gap: CELL / 2 }}>
            <Text style={s.label}>Результат всей задачи</Text>
            {input("result", "Результат всей задачи")}
          </View>
        </Card>
      )}
      {block.kind === "relation" && (
        <Card style={card}>
          <HandFrame seed="card" />
          {["left", "right"].map((side) => (
            <View key={side} style={{ gap: CELL / 2 }}>
              <Text style={s.label}>
                {side === "left" ? "Первая" : "Вторая"} группа
              </Text>
              {stepper(
                side,
                side === "left" ? "Первая группа" : "Вторая группа",
                20,
              )}
              <View
                style={[
                  s.row,
                  /клет|столбик/.test(block.prompt) && {
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 0,
                  },
                ]}
              >
                {Array.from({ length: Number(r[side]) || 0 }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      tokenStyle,
                      { borderRadius: 0 },
                      /клет|столбик/.test(block.prompt) && {
                        width: 20,
                        height: 20,
                        margin: 0,
                        borderWidth: 0.5,
                        borderColor: c.paper,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}
        </Card>
      )}
      {block.kind === "relation" &&
        Number(r.left) > 0 &&
        Number(r.right) > 0 && (
          <DrawingPad
            key={`${r.left}:${r.right}`}
            strokes={answer.strokes ?? []}
            onChange={(strokes) =>
              onAnswer({ ...answer, strokes, checked: false })
            }
            trace={relationPlan(block, answer)}
            onDrawing={onDrawing}
          />
        )}
      {block.kind === "work" && numberLine(block.fields) && (
        <NumberLine max={numberLine(block.fields)!} />
      )}
      {block.kind === "work" &&
        workGroups(block.fields).map((group) =>
          group.examples ? (
            // Examples stand in columns, as in the book: the sign «=» of
            // each is followed by its box, and the boxes are one under
            // another.
            <View
              key={group.fields[0].field.id}
              testID="work-examples"
              style={s.examples}
            >
              {group.fields.map(({ field, index }) => (
                <View key={field.id} style={s.example}>
                  <View style={{ width: cells(group.labelCells) }}>
                    <TextWithBlanks
                      style={StyleSheet.flatten([s.label, s.exampleLabel])}
                      text={field.label}
                    />
                  </View>
                  {input(
                    field.id,
                    spokenBlanks(`${index + 1}. ${field.label}`),
                  )}
                  <View style={[s.exampleMark, narrow && { width: CELL }]}>
                    {answer.checked &&
                      (r[field.id]?.trim() === field.expected ? (
                        <Text accessibilityLabel="Верно" style={s.feedback}>
                          ✓
                        </Text>
                      ) : (
                        <RetryMark />
                      ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            group.fields.map(({ field, index }) => (
              <React.Fragment key={field.id}>
                {/* The second part of a two-part problem starts right here, not
              in the prompt above, so each condition sits over its question. */}
                {field.context && (
                  <TextWithBlanks
                    testID="field-context"
                    style={s.context}
                    text={field.context}
                  />
                )}
                {/* A question is written on the sheet, its box half a cell
                  under it; the teacher's mark stands beside the box. */}
                <View testID="work-question" style={{ gap: CELL / 2 }}>
                  <TextWithBlanks
                    style={s.label}
                    text={
                      isExpression(field.label)
                        ? field.label
                        : `${index + 1}. ${field.label}`
                    }
                  />
                  <View style={s.row}>
                    {field.options
                      ? chips(
                          field.id,
                          field.options,
                          spokenBlanks(field.label),
                        )
                      : input(
                          field.id,
                          spokenBlanks(`${index + 1}. ${field.label}`),
                        )}
                    {answer.checked &&
                      (r[field.id]?.trim() === field.expected ? (
                        <Text style={s.feedback}>✓ Верно</Text>
                      ) : (
                        <View style={{ flexGrow: 1, flexBasis: cells(8) }}>
                          <RetryNote alert={false}>Попробуй ещё раз</RetryNote>
                        </View>
                      ))}
                  </View>
                </View>
              </React.Fragment>
            ))
          ),
        )}
      {block.kind === "compose" &&
        block.rules.map((rule, i) => (
          <Card key={i} style={card}>
            <HandFrame seed={`card-${i}`} />
            <Text style={s.label}>
              {block.story ? "Придумай задачу" : "Составь пример"} {i + 1}
            </Text>
            {block.story && chips(`${i}story`, storySubjects, "О чём задача")}
            <Text style={s.note}>
              {rule.left !== undefined ? `Первое число: ${rule.left}. ` : ""}
              {rule.right !== undefined ? `Второе число: ${rule.right}. ` : ""}
              {rule.result !== undefined
                ? `Получиться должно ${rule.result}. `
                : ""}
              Числа до {rule.max}.
            </Text>
            <View style={s.sum}>
              {input(`${i}a`, "Первое число")}
              <Text style={s.operator}>{rule.operator}</Text>
              {input(`${i}b`, "Второе число")}
              <Text style={s.operator}>=</Text>
              {input(`${i}c`, "Результат")}
            </View>
            {block.story && r[`${i}story`] && (
              <View style={{ marginTop: CELL }}>
                <Text style={s.text}>
                  {
                    composeStory(
                      rule.operator,
                      r[`${i}story`],
                      r[`${i}a`],
                      r[`${i}b`],
                    ).condition
                  }
                </Text>
                <Text style={s.label}>Выбери вопрос к своей задаче</Text>
                {chips(
                  `${i}question`,
                  composeStory(rule.operator, r[`${i}story`]).options,
                  `Вопрос к задаче ${i + 1}`,
                )}
              </View>
            )}
            {answer.checked &&
              (compositionCorrect(rule, r[`${i}a`], r[`${i}b`], r[`${i}c`]) ? (
                <Text style={s.feedback}>✓ Вычисление верное</Text>
              ) : (
                <RetryNote alert={false}>Проверь числа и действие</RetryNote>
              ))}
          </Card>
        ))}
      {block.kind === "activity" && block.activity.mode === "sequence" && (
        <View style={{ gap: CELL }}>
          <Text style={s.note}>
            Нажимай числа по порядку: {block.activity.targets.join(", ")}.
            Нажатые закрашиваются.
          </Text>
          <View style={s.row}>
            {(block.activity.board
              ? Array.from(
                  { length: block.activity.board === "pages" ? 144 : 100 },
                  (_, i) => i + 1,
                )
              : [...new Set(block.activity.targets)].sort((a, b) => a - b)
            ).map((n) => (
              <CellPressable
                key={n}
                style={[
                  s.chip,
                  block.activity.targets.some(
                    (t, i) => t === n && r[`${i}visited`] === "yes",
                  ) && s.chipDone,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Число ${n}`}
                accessibilityState={{
                  selected: block.activity.targets.some(
                    (t, i) => t === n && r[`${i}visited`] === "yes",
                  ),
                }}
                onPress={() => {
                  const index = block.activity.targets.findIndex(
                    (_, i) => r[`${i}visited`] !== "yes",
                  );
                  if (block.activity.targets[index] === n)
                    set(`${index}visited`, "yes");
                }}
              >
                <Text
                  style={[
                    s.text,
                    block.activity.targets.some(
                      (t, i) => t === n && r[`${i}visited`] === "yes",
                    ) && { color: c.white },
                  ]}
                >
                  {n}
                </Text>
              </CellPressable>
            ))}
          </View>
          {block.activity.board === "pages" &&
            block.activity.targets.some(
              (_, i) => r[`${i}visited`] === "yes",
            ) && (
              <Rows object>
                <BookImage
                  id={`page_${String(block.activity.targets.filter((_, i) => r[`${i}visited`] === "yes").at(-1)).padStart(3, "0")}`}
                  maxHeight={350}
                />
              </Rows>
            )}
          <Text style={s.note}>
            {block.activity.targets
              .filter((_, i) => r[`${i}visited`] === "yes")
              .join(" → ")}
          </Text>
        </View>
      )}
      {block.kind === "activity" &&
        block.activity.mode !== "sequence" &&
        block.activity.targets.map((target, i) => {
          const a = block.activity,
            key = String(i),
            value = Number(r[key]) || 0;
          return (
            <Card key={i} style={card}>
              <HandFrame seed={`card-${i}`} />
              {/* The purse says itself how much is to be put into it. */}
              {a.mode !== "coins" && (
                <Text style={s.label}>
                  {a.labels?.[i] ??
                    (a.measure
                      ? "Измерь предмет на рисунке"
                      : a.mode === "count"
                        ? (a.groupLabels?.[i] ??
                          "Положи столько предметов, сколько на рисунке")
                        : a.mode === "groups"
                          ? `Разложи ${target} предметов поровну между ${a.groups} группами`
                          : a.mode === "place"
                            ? `Число ${target}: десятки и единицы`
                            : a.mode === "composition"
                              ? `Разложи ${target} на две части`
                              : `Набери ${target} ${a.unit ?? ""}`)}
                </Text>
              )}
              {a.mode === "count" && a.token && (
                <CounterBoard
                  value={value}
                  token={a.token}
                  slots={a.slots}
                  occupied={(r[`${i}slots`] || "")
                    .split(",")
                    .filter(Boolean)
                    .map(Number)}
                  onPlaced={(indices) =>
                    onAnswer({
                      ...answer,
                      checked: false,
                      responses: {
                        ...r,
                        [key]: String(indices.length),
                        [`${i}slots`]: indices.join(","),
                      },
                    })
                  }
                  onChange={(v) => set(key, String(v))}
                  onDrawing={onDrawing}
                />
              )}
              {a.mode === "count" && !a.token && (
                <>
                  <View style={s.row}>
                    {Array.from({ length: value }, (_, j) => (
                      <View key={j} style={tokenStyle} />
                    ))}
                  </View>
                  {stepper(key, "Предметы", 12)}
                </>
              )}
              {a.mode === "coins" && (
                <CoinPurse
                  target={target}
                  coins={(r[`${i}coins`] || "")
                    .split(",")
                    .filter(Boolean)
                    .map(Number)}
                  denominations={(
                    a.denominations ?? [1, 2, 3, 5, 10, 15, 20]
                  ).filter((n) => !a.exchange || n < target)}
                  onAdd={(n) => {
                    if (value + n <= 200)
                      onAnswer({
                        ...answer,
                        checked: false,
                        responses: {
                          ...r,
                          [key]: String(value + n),
                          [`${i}coins`]: [r[`${i}coins`], String(n)]
                            .filter(Boolean)
                            .join(","),
                        },
                      });
                  }}
                  onTake={(index) => {
                    const left = (r[`${i}coins`] || "")
                      .split(",")
                      .filter(Boolean)
                      .filter((_, k) => k !== index);
                    onAnswer({
                      ...answer,
                      checked: false,
                      responses: {
                        ...r,
                        [key]: String(
                          left.reduce((sum, v) => sum + Number(v), 0),
                        ),
                        [`${i}coins`]: left.join(","),
                      },
                    });
                  }}
                  onReset={() =>
                    onAnswer({
                      ...answer,
                      checked: false,
                      responses: { ...r, [key]: "0", [`${i}coins`]: "" },
                    })
                  }
                />
              )}
              {a.mode === "groups" && (
                <>
                  <Text style={s.note}>
                    Осталось:{" "}
                    {target -
                      Array.from(
                        { length: a.groups ?? 2 },
                        (_, g) => Number(r[`${i}g${g}`]) || 0,
                      ).reduce((x, y) => x + y, 0)}
                  </Text>
                  <View style={s.row}>
                    {Array.from({ length: a.groups ?? 2 }, (_, g) => {
                      const k = `${i}g${g}`,
                        count = Number(r[k]) || 0;
                      return (
                        // A press adds one; the button under the group takes
                        // one away. Nothing is asked of a long press.
                        <View key={g} style={{ gap: CELL / 2 }}>
                          <CellPressable
                            style={[s.group, { minWidth: cells(4) }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Группа ${g + 1}, предметов ${count}`}
                            onPress={() => {
                              const total = Array.from(
                                { length: a.groups ?? 2 },
                                (_, j) => Number(r[`${i}g${j}`]) || 0,
                              ).reduce((x, y) => x + y, 0);
                              if (total < target) set(k, String(count + 1));
                            }}
                          >
                            <Text style={s.note}>Группа {g + 1}</Text>
                            <View style={s.row}>
                              {Array.from({ length: count }, (_, j) => (
                                <View key={j} style={tokenStyle} />
                              ))}
                            </View>
                          </CellPressable>
                          <Button
                            small
                            secondary
                            disabled={count === 0}
                            label={`Группа ${g + 1}: убрать один`}
                            onPress={() =>
                              set(k, String(Math.max(0, count - 1)))
                            }
                          >
                            − 1
                          </Button>
                        </View>
                      );
                    })}
                  </View>
                  <Button
                    small
                    secondary
                    onPress={() =>
                      onAnswer({
                        ...answer,
                        checked: false,
                        responses: {
                          ...r,
                          ...Object.fromEntries(
                            Array.from({ length: a.groups ?? 2 }, (_, g) => [
                              `${i}g${g}`,
                              "0",
                            ]),
                          ),
                        },
                      })
                    }
                  >
                    Разложить заново
                  </Button>
                </>
              )}
              {a.mode === "place" && (
                <>
                  <Text style={s.note}>Десятки</Text>
                  {stepper(`${i}tens`, "Десятки", 10)}
                  <View style={s.row}>
                    {Array.from(
                      { length: Number(r[`${i}tens`]) || 0 },
                      (_, j) => (
                        <View key={j} style={s.bundle}>
                          <Text style={{ lineHeight: 24, color: c.white }}>
                            10
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                  <Text style={s.note}>Единицы</Text>
                  {stepper(`${i}ones`, "Единицы", 9)}
                  <View style={s.row}>
                    {Array.from(
                      { length: Number(r[`${i}ones`]) || 0 },
                      (_, j) => (
                        <View key={j} style={tokenStyle} />
                      ),
                    )}
                  </View>
                </>
              )}
              {a.mode === "composition" && (
                <>
                  {a.partColors && a.token ? (
                    <CompositionBoard
                      total={target}
                      token={a.token}
                      colors={a.partColors}
                      pattern={a.compositionPattern}
                      showEquation={Number(block.id.slice(1, 4)) >= 16}
                      parts={[
                        Number(r[`${i}left`]) || 0,
                        Number(r[`${i}right`]) || 0,
                      ]}
                      onDrawing={onDrawing}
                      onChange={([left, right]) =>
                        onAnswer({
                          ...answer,
                          checked: false,
                          responses: {
                            ...r,
                            [`${i}left`]: String(left),
                            [`${i}right`]: String(right),
                          },
                        })
                      }
                    />
                  ) : (
                    ["left", "right"].map((side, group) => (
                      <View key={side}>
                        <Text style={s.note}>
                          {a.groupLabels?.[group] ??
                            `${side === "left" ? "Первая" : "Вторая"} часть`}
                        </Text>
                        {a.token ? (
                          <CounterBoard
                            token={a.token}
                            objectLabel={a.objectLabel}
                            value={Number(r[`${i}${side}`]) || 0}
                            max={target - 1}
                            onChange={(v) => set(`${i}${side}`, String(v))}
                            onDrawing={onDrawing}
                          />
                        ) : (
                          stepper(
                            `${i}${side}`,
                            side === "left" ? "Первая часть" : "Вторая часть",
                            target - 1,
                          )
                        )}
                        {!a.token && (
                          <View style={s.row}>
                            {Array.from(
                              { length: Number(r[`${i}${side}`]) || 0 },
                              (_, j) => (
                                <View key={j} style={tokenStyle} />
                              ),
                            )}
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </>
              )}
              {a.mode === "ruler" && (
                <>
                  {a.measure && (
                    <View
                      style={{
                        height: 12,
                        width: `${(target / (target > 10 ? 100 : 10)) * 100}%`,
                        backgroundColor: c.red,
                        marginVertical: 12,
                      }}
                    />
                  )}
                  <Text style={s.note}>
                    Учебная линейка. Единицы на экране заданы моделью.
                  </Text>
                  <Rows object contentStyle={[s.row, { gap: 0 }]}>
                    {Array.from({ length: target > 10 ? 11 : 11 }, (_, n) => {
                      const v = n * (target > 10 ? 10 : 1);
                      return (
                        <Pressable
                          key={n}
                          accessibilityRole="button"
                          accessibilityLabel={`Отметка ${v} ${a.unit ?? "см"}`}
                          onPress={() => set(key, String(v))}
                          style={[
                            s.tick,
                            value === v && { backgroundColor: c.wash },
                          ]}
                        >
                          <Text style={s.note}>│</Text>
                          <Text style={s.note}>{v}</Text>
                        </Pressable>
                      );
                    })}
                  </Rows>
                  {target > 10 && stepper(key, "Передвинуть отметку", 100)}
                  <Text style={s.note}>
                    Выбрано: {value} {a.unit ?? "см"}
                  </Text>
                </>
              )}
              {a.mode === "liquid" && (
                <>
                  <Rows object>
                    <View style={s.vessel}>
                      <View
                        style={{
                          height: `${Math.min(100, (value / (a.unit === "мл" ? 1000 : 3)) * 100)}%`,
                          backgroundColor: "#9acfd5",
                          width: "100%",
                          position: "absolute",
                          bottom: 0,
                        }}
                      />
                      <Text style={s.text}>
                        {value} {a.unit ?? "л"}
                      </Text>
                    </View>
                  </Rows>
                  {stepper(
                    key,
                    "Налить мерку",
                    a.unit === "мл" ? 1000 : 3,
                    a.unit === "мл" ? 200 : 1,
                  )}
                </>
              )}
              {a.mode === "balance" && (
                <>
                  <Text style={s.note}>
                    Слева груз {target} кг. Добавь гири на правую чашу.
                  </Text>
                  <View
                    style={[
                      s.balance,
                      {
                        transform: [
                          {
                            rotate:
                              value === target
                                ? "0deg"
                                : value < target
                                  ? "-8deg"
                                  : "8deg",
                          },
                        ],
                      },
                    ]}
                  />
                  {stepper(key, "Гири, кг", 20)}
                  <Text style={s.note}>
                    {value === target
                      ? "Весы в равновесии"
                      : "Чаши пока на разной высоте"}
                  </Text>
                </>
              )}
            </Card>
          );
        })}
      <CheckRow>
        <Button
          done={answer.checked && courseCorrect(block, answer)}
          onPress={() =>
            onAnswer({
              ...answer,
              checked: true,
              attempts: (answer.attempts ?? 0) + 1,
            })
          }
        >
          {answer.checked && courseCorrect(block, answer)
            ? "✓ Получилось!"
            : "Проверить"}
        </Button>
      </CheckRow>
    </View>
  );
}
const s = StyleSheet.create({
  chipDone: { backgroundColor: c.pen, borderColor: c.pen },
  part: { gap: CELL },
  // Chips take the width they are given and no more: a long one is wrapped.
  chips: { flexShrink: 1, minWidth: 0, maxWidth: "100%" },
  chipText: { textAlign: "center" },
  // Things in a row stand half a cell apart, rows of them a cell apart.
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    columnGap: CELL,
    rowGap: CELL,
  },
  // An example written in a row: boxes four cells wide, a sign in its own
  // cell between them, half a cell at its sides.
  sum: {
    flexDirection: "row",
    flexWrap: "wrap",
    // Signs stand in the middle of the boxes' height.
    alignItems: "center",
    columnGap: CELL / 2,
    rowGap: CELL,
  },
  // A question is written on the sheet and bracketed in pencil: the ruling
  // shows through. A row is left empty above the question and under the
  // answer; lines of the question and the two rows of the answer box follow
  // one another.
  // Even margins inside: the words' line leaves a little air above the
  // letters, so the top is two pixels less than the bottom.
  card: {
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: c.card,
    gap: 16,
  },
  // The row of numbers is ruled like the sheet: a cell and a half by two.
  numberLine: { flexDirection: "row", flexWrap: "wrap" },
  numberCell: {
    width: CELL * 1.5,
    height: CELL * 2,
    borderWidth: 1,
    borderColor: c.line,
    marginLeft: -1,
    alignItems: "center",
    // The number is written on the lower line of the two.
    justifyContent: "flex-end",
    backgroundColor: c.white,
  },
  numberText: {
    fontFamily: f.bold,
    fontSize: 18,
    lineHeight: CELL,
    color: c.pen,
  },
  label: { fontFamily: f.bold, fontSize: 19, lineHeight: CELL, color: c.ink },
  // Columns of examples a cell apart, rows of them too.
  examples: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: CELL,
    rowGap: CELL,
  },
  example: { flexDirection: "row", alignItems: "center" },
  exampleLabel: { textAlign: "right", paddingRight: CELL / 2 },
  // The teacher's mark has two cells after the box.
  exampleMark: {
    width: cells(2),
    height: cells(2),
    alignItems: "center",
    justifyContent: "center",
  },
  retryMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.retry,
    alignItems: "center",
    justifyContent: "center",
  },
  retryMarkText: {
    color: c.white,
    fontFamily: f.bold,
    fontSize: 17,
    lineHeight: CELL,
  },
  text: { fontFamily: f.bold, fontSize: 20, lineHeight: CELL, color: c.pen },
  note: { fontFamily: f.regular, fontSize: 16, lineHeight: CELL, color: c.ink },
  context: {
    fontFamily: f.regular,
    fontSize: 20,
    lineHeight: CELL,
    color: c.ink,
  },
  input: {
    backgroundColor: c.white,
    borderWidth: 1.5,
    borderColor: c.lip,
    borderRadius: 4,
    width: cells(4),
    height: cells(2),
    paddingVertical: 0,
    textAlign: "center",
    fontFamily: f.bold,
    fontSize: 26,
    color: c.ink,
  },
  operator: {
    fontSize: 28,
    lineHeight: CELL,
    width: CELL,
    textAlign: "center",
    color: c.pen,
  },
  // The number between «−» and «+» takes two cells, as the buttons do.
  amount: { minWidth: cells(2), textAlign: "center" },
  chip: {
    paddingVertical: CELL / 2 - 1,
    paddingHorizontal: 12,
    minWidth: cells(2),
    minHeight: cells(2),
    // A long answer takes a second line instead of running off the sheet.
    maxWidth: "100%",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.card,
  },
  selected: { backgroundColor: c.pen },
  feedback: { fontFamily: f.hand, color: c.red, ...written(22, 1, true) },
  group: {
    padding: CELL / 2 - 2,
    borderWidth: 2,
    borderColor: c.pen,
    borderRadius: 6,
    maxWidth: cells(8),
    minHeight: cells(4),
  },
  bundle: {
    width: 30,
    height: 70,
    backgroundColor: c.pen,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
  },
  tick: {
    flex: 1,
    minWidth: 23,
    alignItems: "center",
    minHeight: 60,
    borderBottomWidth: 2,
    borderColor: c.pen,
  },
  vessel: {
    height: 140,
    width: 120,
    borderWidth: 3,
    borderColor: c.pen,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  balance: {
    height: 5,
    width: 200,
    backgroundColor: c.pen,
    marginVertical: 20,
  },
});
