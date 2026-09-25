import { CoachButton, useGestureCoach } from "./GestureCoach";
import React, { useRef, useState } from "react";
import { View, Text, Platform } from "react-native";
import { Button } from "./Controls";
import { colors as c, fonts as f } from "../theme";
import { nextDigitCard } from "../lib/coachTargets";

export function DigitCards({
  value,
  expected,
  onChange,
  onDrawing,
}: {
  value: number[];
  expected?: number[];
  onChange: (v: number[]) => void;
  onDrawing: (v: boolean) => void;
}) {
  const boardRef = useRef<View>(null);
  const sourceRef = useRef<View>(null),
    fieldRef = useRef<View>(null);
  const nextCard = nextDigitCard(value, expected);
  const showCoach = useGestureCoach(
    "cards",
    nextCard
      ? [
          {
            ref: sourceRef,
            surface: { kind: "token", token: "card", value: nextCard.digit },
            text: `Возьми карточку с цифрой ${nextCard.digit}. Прижми её пальцем и держи.`,
            motion: { kind: "tap", points: [{ x: 0.5, y: 0.5 }] },
          },
          {
            ref: boardRef,
            surface: {
              kind: "cards",
              value: nextCard.digit,
              targetIndex: nextCard.index,
            },
            motion: {
              kind: "drag",
              points: [],
              from: { ref: sourceRef },
              to: { ref: fieldRef },
              token: "card",
              tokenLabel: String(nextCard.digit),
            },
            text: `Не отпуская палец, перенеси карточку в ${nextCard.index === 0 ? "левую рамку — это десятки" : "правую рамку — это единицы"}. Затем отпусти.`,
          },
        ]
      : [
          {
            ref: boardRef,
            text: "Обе карточки уже на нужных местах. Проверь действие.",
          },
        ],
  );
  const [width, setWidth] = useState(320),
    [draft, setDraft] = useState<{
      digit: number;
      x: number;
      y: number;
    } | null>(null);
  const active = useRef<{
      digit: number;
      x: number;
      y: number;
      pageX: number;
      pageY: number;
    } | null>(null),
    pointer = useRef<number | null>(null);
  const cell = width / 5;
  const cancel = () => {
    active.current = null;
    pointer.current = null;
    setDraft(null);
    onDrawing(false);
  };
  const begin = (digit: number, e: any) => {
    const x = ((digit % 5) + 0.5) * cell,
      y = 160 + Math.floor(digit / 5) * 65;
    active.current = {
      digit,
      x,
      y,
      pageX: e.nativeEvent.pageX,
      pageY: e.nativeEvent.pageY,
    };
    setDraft({ digit, x, y });
    onDrawing(true);
  };
  const move = (e: any) => {
    const a = active.current;
    if (a)
      setDraft({
        digit: a.digit,
        x: a.x + e.nativeEvent.pageX - a.pageX,
        y: a.y + e.nativeEvent.pageY - a.pageY,
      });
  };
  const finish = (e: any) => {
    const a = active.current;
    if (!a) return;
    const x = a.x + e.nativeEvent.pageX - a.pageX,
      y = a.y + e.nativeEvent.pageY - a.pageY;
    const index = [0, 1].find(
      (i) =>
        Math.abs(x - (width / 2 + (i - 0.5) * 76)) < 40 &&
        Math.abs(y - 45) < 40,
    );
    if (index !== undefined) {
      const next = [...value];
      next[index] = a.digit;
      onChange(next);
    }
    cancel();
  };
  const handlers = (digit: number): any =>
    Platform.OS === "web"
      ? {
          onPointerDown: (e: any) => {
            if (pointer.current !== null || e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            pointer.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            begin(digit, e);
          },
          onPointerMove: (e: any) => {
            if (pointer.current === e.pointerId) move(e);
          },
          onPointerUp: (e: any) => {
            if (pointer.current !== e.pointerId) return;
            finish(e);
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          },
          onPointerCancel: cancel,
          onLostPointerCapture: () => {
            if (pointer.current !== null) cancel();
          },
        }
      : {
          onStartShouldSetResponder: () => true,
          onMoveShouldSetResponder: () => true,
          onResponderGrant: (e: any) => begin(digit, e),
          onResponderMove: move,
          onResponderRelease: finish,
          onResponderTerminate: cancel,
          onResponderTerminationRequest: () => false,
        };
  return (
    <View style={{ gap: 12 }}>
      <CoachButton onPress={showCoach} />
      <Text style={{ fontFamily: f.bold, color: c.ink }}>
        Возьми карточки с цифрами и перенеси в рамки. Слева — десятки, справа —
        единицы.
      </Text>
      <View
        ref={boardRef}
        testID="digit-cards"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 275, borderRadius: 6, backgroundColor: c.paper }}
      >
        {[0, 1].map((i) => (
          <View
            key={i}
            ref={i === nextCard?.index ? fieldRef : undefined}
            testID={`digit-slot-${i}`}
            style={{
              position: "absolute",
              left: width / 2 + (i - 0.5) * 76 - 30,
              top: 15,
              width: 60,
              height: 60,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: c.pen,
              borderRadius: 4,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: f.heavy, fontSize: 32, color: c.ink }}>
              {value[i] >= 0 ? value[i] : ""}
            </Text>
          </View>
        ))}
        {Array.from({ length: 10 }, (_, digit) => (
          <View
            key={digit}
            ref={digit === nextCard?.digit ? sourceRef : undefined}
            testID={`digit-source-${digit}`}
            accessibilityRole="button"
            accessibilityLabel={`Карточка ${digit}`}
            {...handlers(digit)}
            style={[
              {
                position: "absolute",
                left: ((digit % 5) + 0.5) * cell - 24,
                top: 136 + Math.floor(digit / 5) * 65,
                width: 48,
                height: 48,
                borderRadius: 4,
                backgroundColor: c.wash,
                alignItems: "center",
                justifyContent: "center",
              },
              Platform.OS === "web"
                ? ({ touchAction: "none", cursor: "grab" } as any)
                : {},
            ]}
          >
            <Text
              pointerEvents="none"
              style={{ fontFamily: f.heavy, fontSize: 28, color: c.ink }}
            >
              {digit}
            </Text>
          </View>
        ))}
        {draft && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: draft.x - 24,
              top: draft.y - 24,
              width: 48,
              height: 48,
              borderRadius: 4,
              backgroundColor: c.pen,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 3,
            }}
          >
            <Text style={{ fontFamily: f.heavy, fontSize: 28, color: c.white }}>
              {draft.digit}
            </Text>
          </View>
        )}
      </View>
      <Button small secondary onPress={() => onChange([-1, -1])}>
        Вернуть карточки
      </Button>
    </View>
  );
}
