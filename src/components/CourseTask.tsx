import { DrawingPad } from "./DrawingPad";
import { relationPlan } from "../lib/relationDrawing";
import { BookImage } from "./BookImage";
import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { Answer, Block } from "../content/types";
import { courseCorrect, compositionCorrect } from "../lib/courseAssessment";
import { colors as c, fonts as f } from "../theme";
import { Button } from "./Controls";
const tokenStyle = {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: c.green,
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
  const r = answer.responses ?? {};
  const set = (key: string, value: string) =>
    onAnswer({ ...answer, responses: { ...r, [key]: value }, checked: false });
  const input = (key: string, label: string) => (
    <TextInput
      key={key}
      accessibilityLabel={label}
      value={r[key] ?? ""}
      onChangeText={(v) => set(key, v.replace(/[^0-9]/g, "").slice(0, 3))}
      keyboardType="number-pad"
      inputMode="numeric"
      maxLength={3}
      style={s.input}
    />
  );
  const chips = (key: string, values: (number | string)[], label: string) => (
    <View style={s.row}>
      {values.map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${v}`}
          accessibilityState={{ selected: r[key] === String(v) }}
          style={[s.chip, r[key] === String(v) && s.selected]}
          onPress={() => set(key, String(v))}
        >
          <Text style={[s.text, r[key] === String(v) && { color: c.white }]}>
            {v}
          </Text>
        </Pressable>
      ))}
    </View>
  );
  const stepper = (key: string, label: string, max: number, step = 1) => (
    <View style={s.row}>
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
      <Text style={s.text}>{Number(r[key]) || 0}</Text>
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
    <View style={{ gap: 18 }}>
      {block.kind === "targetGame" && (
        <View style={s.card}>
          <Text style={s.label}>
            Игрок 1: {r.score0 || 0} · Игрок 2: {r.score1 || 0}
          </Text>
          <Text style={s.note}>
            {courseCorrect(block, answer)
              ? `Выиграл игрок ${Number(r.score0) >= 100 ? 1 : 2}!`
              : `Ход игрока ${(Number(r.turn) || 0) + 1}`}
          </Text>
          <View
            style={{
              alignSelf: "center",
              width: 240,
              height: 240,
              borderRadius: 120,
              borderWidth: 2,
              borderColor: c.green,
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
                  borderColor: c.green,
                  alignItems: "center",
                  backgroundColor:
                    i === 0 ? c.paper : i === 1 ? c.mint : c.sand,
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
          <Button
            secondary
            small
            onPress={() => onAnswer({ responses: {}, checked: false })}
          >
            Новая игра
          </Button>
        </View>
      )}
      {block.kind === "recipe" && (
        <View style={s.card}>
          <Text style={s.label}>О чём будет задача?</Text>
          {chips(
            "story",
            [
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
          <Text style={s.note}>
            Выбери свои числа для схемы{" "}
            {block.formula
              .replace(/[abc]/g, (k) => r[k] || "□")
              .replace(/\*/g, "×")
              .replace(/\//g, ":")}
            . Результат должен быть целым числом от 0 до {block.max}.
          </Text>
          {[...new Set(block.formula.match(/[abc]/g) ?? [])].map((k) => (
            <View key={k} style={s.row}>
              <Text style={s.text}>
                {{ a: "Первое число", b: "Второе число", c: "Третье число" }[k]}{" "}
                =
              </Text>
              {input(k, `Число ${k}`)}
            </View>
          ))}
          <Text style={s.label}>Результат всей задачи</Text>
          {input("result", "Результат всей задачи")}
        </View>
      )}
      {block.kind === "relation" && (
        <View style={s.card}>
          {["left", "right"].map((side) => (
            <View key={side}>
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
        </View>
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
      {block.kind === "work" &&
        block.fields.map((field, i) => (
          <View key={field.id} style={s.card}>
            <Text style={s.label}>
              {i + 1}. {field.label}
            </Text>
            {field.options
              ? chips(field.id, field.options, field.label)
              : input(field.id, `${i + 1}. ${field.label}`)}
            {answer.checked && (
              <Text style={s.feedback}>
                {r[field.id]?.trim() === field.expected
                  ? "✓ Верно"
                  : "Попробуй ещё раз"}
              </Text>
            )}
          </View>
        ))}
      {block.kind === "compose" &&
        block.rules.map((rule, i) => (
          <View key={i} style={s.card}>
            <Text style={s.label}>
              {block.story ? "Придумай задачу" : "Составь пример"} {i + 1}
            </Text>
            {block.story &&
              chips(
                `${i}story`,
                [
                  "яблоки",
                  "книги",
                  "карандаши",
                  "метры",
                  "рубли",
                  "литры",
                  "килограммы",
                ],
                "О чём задача",
              )}
            <Text style={s.note}>
              {rule.left !== undefined ? `Первое число: ${rule.left}. ` : ""}
              {rule.right !== undefined ? `Второе число: ${rule.right}. ` : ""}
              {rule.result !== undefined
                ? `Получиться должно ${rule.result}. `
                : ""}
              Числа до {rule.max}.
            </Text>
            <View style={s.row}>
              {input(`${i}a`, "Первое число")}
              <Text style={s.operator}>{rule.operator}</Text>
              {input(`${i}b`, "Второе число")}
              <Text style={s.operator}>=</Text>
              {input(`${i}c`, "Результат")}
            </View>
            {block.story && r[`${i}story`] && (
              <Text style={s.note}>
                {rule.operator === "+"
                  ? `Было ${r[`${i}a`] || "…"}. Добавили ${r[`${i}b`] || "…"}. Сколько стало?`
                  : rule.operator === "−"
                    ? `Было ${r[`${i}a`] || "…"}. Убрали ${r[`${i}b`] || "…"}. Сколько осталось?`
                    : rule.operator === "×"
                      ? `В каждой группе ${r[`${i}a`] || "…"}. Таких групп ${r[`${i}b`] || "…"}. Сколько всего?`
                      : `${r[`${i}a`] || "…"} разделили на ${r[`${i}b`] || "…"} равных частей. Сколько в каждой?`}
              </Text>
            )}
            {answer.checked && (
              <Text style={s.feedback}>
                {compositionCorrect(rule, r[`${i}a`], r[`${i}b`], r[`${i}c`])
                  ? "✓ Вычисление верное"
                  : "Проверь числа и действие"}
              </Text>
            )}
          </View>
        ))}
      {block.kind === "activity" && block.activity.mode === "sequence" && (
        <View>
          <Text style={s.note}>
            Нажимай числа по порядку: {block.activity.targets.join(", ")}.
          </Text>
          <View style={s.row}>
            {(block.activity.board
              ? Array.from(
                  { length: block.activity.board === "pages" ? 144 : 100 },
                  (_, i) => i + 1,
                )
              : [...new Set(block.activity.targets)].sort((a, b) => a - b)
            ).map((n) => (
              <Pressable
                key={n}
                style={s.chip}
                accessibilityRole="button"
                accessibilityLabel={`Число ${n}`}
                onPress={() => {
                  const index = block.activity.targets.findIndex(
                    (_, i) => r[`${i}visited`] !== "yes",
                  );
                  if (block.activity.targets[index] === n)
                    set(`${index}visited`, "yes");
                }}
              >
                <Text style={s.text}>{n}</Text>
              </Pressable>
            ))}
          </View>
          {block.activity.board === "pages" &&
            block.activity.targets.some(
              (_, i) => r[`${i}visited`] === "yes",
            ) && (
              <BookImage
                id={`page_${String(block.activity.targets.filter((_, i) => r[`${i}visited`] === "yes").at(-1)).padStart(3, "0")}`}
                maxHeight={350}
              />
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
            <View key={i} style={s.card}>
              <Text style={s.label}>
                {a.labels?.[i] ??
                  (a.measure
                    ? "Измерь предмет на рисунке"
                    : a.mode === "groups"
                      ? `Разложи ${target} предметов поровну между ${a.groups} группами`
                      : a.mode === "place"
                        ? `Число ${target}: десятки и единицы`
                        : a.mode === "composition"
                          ? `Разложи ${target} на две части`
                          : `Набери ${target} ${a.unit ?? ""}`)}
              </Text>
              {a.mode === "count" && (
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
                <>
                  <View style={s.row}>
                    {(a.denominations ?? [1, 2, 3, 5, 10, 15, 20]).map((n) => (
                      <Pressable
                        key={n}
                        style={[s.chip, { borderRadius: 40 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Монета ${n} копеек`}
                        onPress={() => {
                          if (value + n <= 200) set(key, String(value + n));
                        }}
                      >
                        <Text style={s.text}>{n} к.</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={s.text}>В кошельке: {value} копеек</Text>
                  <Button small secondary onPress={() => set(key, "0")}>
                    Вернуть монеты
                  </Button>
                </>
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
                        <Pressable
                          key={g}
                          style={[s.group, { minWidth: 90 }]}
                          accessibilityRole="button"
                          accessibilityLabel={`Группа ${g + 1}, предметов ${count}`}
                          onPress={() => {
                            const total = Array.from(
                              { length: a.groups ?? 2 },
                              (_, j) => Number(r[`${i}g${j}`]) || 0,
                            ).reduce((x, y) => x + y, 0);
                            if (total < target) set(k, String(count + 1));
                          }}
                          onLongPress={() =>
                            set(k, String(Math.max(0, count - 1)))
                          }
                        >
                          <Text style={s.note}>Группа {g + 1}</Text>
                          <View style={s.row}>
                            {Array.from({ length: count }, (_, j) => (
                              <View key={j} style={tokenStyle} />
                            ))}
                          </View>
                        </Pressable>
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
                          <Text style={{ color: c.white }}>10</Text>
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
                  {["left", "right"].map((side) => (
                    <View key={side}>
                      <Text style={s.note}>
                        {side === "left" ? "Первая" : "Вторая"} часть
                      </Text>
                      {stepper(
                        `${i}${side}`,
                        side === "left" ? "Первая часть" : "Вторая часть",
                        target - 1,
                      )}
                      <View style={s.row}>
                        {Array.from(
                          { length: Number(r[`${i}${side}`]) || 0 },
                          (_, j) => (
                            <View key={j} style={tokenStyle} />
                          ),
                        )}
                      </View>
                    </View>
                  ))}
                </>
              )}
              {a.mode === "ruler" && (
                <>
                  {a.measure && (
                    <View
                      style={{
                        height: 12,
                        width: `${(target / (target > 10 ? 100 : 10)) * 100}%`,
                        backgroundColor: c.orange,
                        marginVertical: 12,
                      }}
                    />
                  )}
                  <Text style={s.note}>
                    Учебная линейка. Единицы на экране заданы моделью.
                  </Text>
                  <View style={[s.row, { gap: 0 }]}>
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
                            value === v && { backgroundColor: c.mint },
                          ]}
                        >
                          <Text style={s.note}>│</Text>
                          <Text style={s.note}>{v}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {target > 10 && stepper(key, "Передвинуть отметку", 100)}
                  <Text style={s.note}>
                    Выбрано: {value} {a.unit ?? "см"}
                  </Text>
                </>
              )}
              {a.mode === "liquid" && (
                <>
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
            </View>
          );
        })}
      <Button
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
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  card: { padding: 16, borderRadius: 16, backgroundColor: "#f8f4ea", gap: 12 },
  label: { fontFamily: f.bold, fontSize: 19, color: c.ink },
  text: { fontFamily: f.bold, fontSize: 20, color: c.green },
  note: { fontFamily: f.regular, fontSize: 16, lineHeight: 24, color: c.ink },
  input: {
    backgroundColor: c.white,
    borderWidth: 2,
    borderColor: c.green,
    borderRadius: 12,
    width: 86,
    minHeight: 54,
    textAlign: "center",
    fontFamily: f.bold,
    fontSize: 26,
    color: c.ink,
  },
  operator: { fontSize: 28, color: c.green },
  chip: {
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    borderWidth: 1,
    borderColor: c.green,
    borderRadius: 12,
    alignItems: "center",
  },
  selected: { backgroundColor: c.green },
  feedback: { fontFamily: f.bold, color: c.green, fontSize: 16 },
  group: {
    padding: 12,
    borderWidth: 2,
    borderColor: c.green,
    borderRadius: 16,
    maxWidth: 200,
    minHeight: 90,
  },
  bundle: {
    width: 30,
    height: 70,
    backgroundColor: c.green,
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
    borderColor: c.green,
  },
  vessel: {
    height: 140,
    width: 120,
    borderWidth: 3,
    borderColor: c.green,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  balance: {
    height: 5,
    width: 200,
    backgroundColor: c.green,
    marginVertical: 20,
  },
});
