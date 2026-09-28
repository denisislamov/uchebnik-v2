import { useGestureCoach } from "./GestureCoach";
import React, { useRef, useState } from "react";
import { View, Text, Platform, Pressable } from "react-native";
import { Button } from "./Controls";
import { colors as c, fonts as f } from "../theme";
import { Rows } from "./HandDrawn";
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
  useGestureCoach(
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
  // The card that was pressed and waits for its frame.
  const [picked, setPicked] = useState<number | null>(null);
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
    // A press without carrying takes the card in hand: the next press, on
    // a frame, puts it there.
    if (Math.hypot(x - a.x, y - a.y) < 10) {
      setPicked((old) => (old === a.digit ? null : a.digit));
      cancel();
      return;
    }
    setPicked(null);
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
    <View style={{ gap: 24 }}>
      <Text style={{ lineHeight: 24, fontFamily: f.bold, color: c.ink }}>
        Клади карточки в рамки: слева — десятки, справа — единицы.
      </Text>
      <Rows object>
        <View
          ref={boardRef}
          testID="digit-cards"
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          // Ten cards in two rows stand close enough to be seen at once.
          style={{
            height: 275,
            maxWidth: 480,
            borderRadius: 6,
            backgroundColor: c.paper,
          }}
        >
          {[0, 1].map((i) => (
            <Pressable
              key={i}
              ref={i === nextCard?.index ? fieldRef : undefined}
              testID={`digit-slot-${i}`}
              accessibilityRole="button"
              accessibilityLabel={
                value[i] >= 0
                  ? `Рамка ${i + 1}: карточка ${value[i]}`
                  : `Рамка ${i + 1}: пусто`
              }
              // A press on a frame puts the card in hand into it; with no
              // card in hand it gives the frame's own card back.
              onPress={() => {
                if (picked === null && value[i] < 0) return;
                const next = [...value];
                next[i] = picked ?? -1;
                onChange(next);
                setPicked(null);
              }}
              style={[
                {
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
                },
                // While a card is carried or in hand the frames show where
                // it goes.
                (!!draft || picked !== null) && {
                  borderStyle: "solid",
                  borderWidth: 3,
                  backgroundColor: c.wash,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: f.heavy,
                  fontSize: 32,
                  lineHeight: 48,
                  color: c.ink,
                }}
              >
                {value[i] >= 0 ? value[i] : ""}
              </Text>
            </Pressable>
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
                  // A card that can be taken looks like one: a box with a lip.
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: c.line,
                  borderBottomWidth: 2,
                  borderBottomColor: c.lip,
                  backgroundColor: c.card,
                  alignItems: "center",
                  justifyContent: "center",
                },
                // In hand after a press: a pen frame around the card.
                picked === digit && {
                  borderWidth: 3,
                  borderBottomWidth: 3,
                  borderColor: c.pen,
                  borderBottomColor: c.pen,
                },
                Platform.OS === "web"
                  ? ({ touchAction: "none", cursor: "grab" } as any)
                  : {},
              ]}
            >
              <Text
                pointerEvents="none"
                style={{
                  fontFamily: f.heavy,
                  fontSize: 28,
                  lineHeight: 24,
                  color: c.ink,
                }}
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
              <Text
                style={{
                  fontFamily: f.heavy,
                  fontSize: 28,
                  lineHeight: 24,
                  color: c.white,
                }}
              >
                {draft.digit}
              </Text>
            </View>
          )}
        </View>
      </Rows>
      <Button small secondary onPress={() => onChange([-1, -1])}>
        Вернуть карточки
      </Button>
    </View>
  );
}
