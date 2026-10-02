import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors as c, fonts as f } from "../theme";
import { CELL, cells, written } from "../lib/grid";
import { Button } from "./Controls";

/**
 * What stands around a task, the same on every step: the way out and the help
 * above it, «Назад» and «Дальше» under it. Nothing else shares the screen
 * with the task — other pages and the list of steps are
 * a press away.
 */
function BackArrow() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M15 5 L8 12 L15 19"
        fill="none"
        stroke={c.ink}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
/** As much of the line as `px` hold, in pencil letters of 14 px. */
const cut = (line: string, px: number) => {
  const letters = Math.max(0, Math.floor(px / 8));
  return line.length <= letters
    ? line
    : letters < 12
      ? ""
      : `${line.slice(0, letters - 1).trimEnd()}…`;
};
/** One row of two cells: the way out, where the child is, the help. */
export function LessonTop({
  compact,
  width,
  line,
  step,
  onHome,
  onSteps,
  help,
}: {
  compact: boolean;
  /** How wide the writing is: the page's name is cut to what the row has left. */
  width: number;
  /** The page's number and name, in pencil. */
  line: string;
  /** «Шаг 3 из 8». */
  step: string;
  onHome: () => void;
  onSteps: () => void;
  help: React.ReactNode;
}) {
  return (
    <View
      testID="lesson-top"
      // The narrowest phones have half a cell between the three.
      style={[s.top, compact && width < cells(13) && { gap: CELL / 2 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="На главную"
        onPress={onHome}
        style={({ pressed }) => [s.exit, pressed && s.exitPressed]}
      >
        <BackArrow />
      </Pressable>
      {!compact && (
        <Text testID="lesson-line" numberOfLines={1} style={s.line}>
          {cut(line, width - cells(2 + 1 + 1 + 5 + 1 + 8 + 1))}
        </Text>
      )}
      {/* On a phone the step takes what the way out and the help leave of
          the row, in two lines if it must. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Шаги страницы. ${step}`}
        onPress={onSteps}
        style={[s.steps, compact && s.stepsCompact]}
      >
        <Text
          numberOfLines={1}
          style={[s.stepsText, compact && { fontSize: 14 }]}
        >
          {/* A narrow phone has room for the count alone. */}
          {compact && width < cells(15) ? step.replace(/^Шаг /, "") : step}
        </Text>
      </Pressable>
      {help}
    </View>
  );
}
/** Under the sheet, always in the same place: back on the left, on on the right. */
export function LessonNav({
  left,
  width,
  back,
  next,
  note,
}: {
  /** Where the writing starts and how wide it is: the buttons stand at its edges. */
  left: number;
  width: number;
  back: { disabled: boolean; onPress: () => void };
  next: { label: string; locked: boolean; onPress: () => void };
  /** Said when «Дальше» is pressed before the task is done. */
  note: string;
}) {
  return (
    <View testID="lesson-nav" style={s.nav}>
      <View style={[s.navRow, { marginLeft: left, width }]}>
        <Button tall secondary disabled={back.disabled} onPress={back.onPress}>
          ← Назад
        </Button>
        {/* Not to be pressed yet, and it says so: a press on it is answered
            with a word why instead of falling into the void. A disabled
            button hears no press, so a sheet of glass over it does. */}
        <View>
          <Button tall disabled={next.locked} onPress={next.onPress}>
            {next.label}
          </Button>
          {/* The word why stands over the button it is about. */}
          <View
            testID="next-locked-note"
            accessibilityLiveRegion="polite"
            pointerEvents="none"
            style={[s.navNote, !note && { opacity: 0 }]}
          >
            <Text style={s.navNoteText}>{note}</Text>
          </View>
          {next.locked && (
            <Pressable
              testID="next-area"
              accessible={false}
              focusable={false}
              importantForAccessibility="no"
              onPress={next.onPress}
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
      </View>
    </View>
  );
}
/** The steps of the page: for whoever wants to jump, not on the task's screen. */
export function StepList({
  visible,
  title,
  subtitle,
  steps,
  current,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  steps: { id: string; title: string; done: boolean }[];
  current: number;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.shade}>
        <View testID="step-list" style={s.panel}>
          <View style={s.panelHead}>
            <Text style={s.panelTitle}>{title}</Text>
            <Text style={s.panelSub}>{subtitle}</Text>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={s.list}>
            {steps.map((step, i) => (
              <Pressable
                key={step.id}
                accessibilityRole="button"
                accessibilityLabel={`Шаг ${i + 1}: ${step.title}`}
                accessibilityState={{ selected: i === current }}
                onPress={() => onPick(i)}
                style={({ pressed }) => [
                  s.step,
                  i === current && s.stepCurrent,
                  pressed && { backgroundColor: c.wash },
                ]}
              >
                <Text style={[s.stepMark, step.done && s.stepDone]}>
                  {step.done ? "✓" : i + 1}
                </Text>
                <Text style={s.stepTitle}>{step.title}</Text>
                {i === current && <Text style={s.stepHere}>ты здесь</Text>}
              </Pressable>
            ))}
          </ScrollView>
          <View style={s.panelFoot}>
            <Button secondary onPress={onClose}>
              Закрыть
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
/** A page is a small block of work: at its end the child chooses to go on or to stop. */
export function PageDone({
  number,
  title,
  done,
  total,
  onFinish,
}: {
  number: number;
  title: string;
  done: number;
  total: number;
  onFinish: () => void;
}) {
  const whole = done >= total;
  return (
    <View testID="page-done" accessibilityLiveRegion="polite">
      <Text style={s.doneTitle}>
        {whole ? "Готово!" : "Страница закончилась"}
      </Text>
      <Text style={s.doneText}>
        {whole
          ? `Ты прошёл страницу ${number} — «${title}». Все шаги сделаны: ${total} из ${total}.`
          : `Страница ${number} — «${title}». Сделано шагов: ${done} из ${total}. К остальным можно вернуться в любой день.`}
      </Text>
      <Text style={s.doneText}>Продолжим или закончим на сегодня?</Text>
      <View style={s.doneActions}>
        <Button secondary onPress={onFinish}>
          Закончить
        </Button>
      </View>
    </View>
  );
}
/** The height of the navigation under the sheet. */
export const NAV_HEIGHT = 80;
const s = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: CELL,
    height: cells(2),
  },
  // A button like the others: a box with a lip, so it reads as pressable.
  exit: {
    width: cells(2),
    height: cells(2),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.line,
    borderBottomWidth: 2,
    borderBottomColor: c.lip,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  exitPressed: { backgroundColor: c.wash },
  line: {
    flex: 1,
    minWidth: 0,
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 14,
    lineHeight: CELL,
  },
  steps: {
    height: cells(2),
    // A whole number of cells, as anything pressed on the sheet is.
    width: cells(5),
    justifyContent: "center",
    alignItems: "flex-end",
  },
  stepsCompact: {
    flex: 1,
    width: undefined,
    minWidth: 0,
    alignItems: "flex-start",
  },
  stepsText: {
    fontFamily: f.bold,
    color: c.pen,
    fontSize: 15,
    lineHeight: CELL,
  },
  nav: {
    height: NAV_HEIGHT,
    justifyContent: "center",
    backgroundColor: c.paper,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    maxWidth: "100%",
  },
  navNote: {
    position: "absolute",
    right: 0,
    bottom: 64 + 14,
    width: cells(10),
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.lip,
    backgroundColor: c.card,
  },
  navNoteText: {
    fontFamily: f.bold,
    color: c.ink,
    fontSize: 16,
    lineHeight: CELL,
    textAlign: "center",
  },
  shade: {
    flex: 1,
    backgroundColor: "#1f2433aa",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  panel: {
    maxWidth: 520,
    width: "100%",
    maxHeight: "90%",
    backgroundColor: c.card,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: c.ink,
    overflow: "hidden",
  },
  panelHead: { paddingHorizontal: CELL, paddingTop: CELL, paddingBottom: 12 },
  panelTitle: {
    fontFamily: f.hand,
    fontSize: 30,
    lineHeight: 34,
    color: c.pen,
  },
  panelSub: {
    fontFamily: f.regular,
    fontSize: 14,
    lineHeight: CELL,
    color: c.muted,
  },
  list: { paddingHorizontal: CELL, paddingBottom: 12, gap: 8 },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
  stepCurrent: { borderColor: c.pen, borderWidth: 2 },
  stepMark: {
    width: 28,
    textAlign: "center",
    fontFamily: f.bold,
    fontSize: 16,
    lineHeight: CELL,
    color: c.muted,
  },
  stepDone: { fontFamily: f.hand, fontSize: 24, color: c.red },
  stepTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: f.bold,
    fontSize: 16,
    lineHeight: CELL,
    color: c.ink,
  },
  stepHere: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: CELL,
    color: c.pen,
  },
  panelFoot: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    padding: CELL,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  doneTitle: { fontFamily: f.hand, color: c.red, ...written(40, 2, true) },
  doneText: {
    fontFamily: f.regular,
    color: c.ink,
    fontSize: 20,
    lineHeight: CELL,
    marginTop: CELL,
  },
  doneActions: { flexDirection: "row", marginTop: CELL },
});
