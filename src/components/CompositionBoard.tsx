import React, { useEffect, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Button } from "./Controls";
import { CoachButton, useGestureCoach } from "./GestureCoach";
import {
  compositionCounts,
  compositionLayout,
  partPalette,
  type PartColor,
} from "../lib/compositionLayout";
import { colors as c, fonts as f } from "../theme";

type Drag = {
  group: 0 | 1;
  index: number;
  x: number;
  y: number;
  pageX: number;
  pageY: number;
};
export function CompositionBoard({
  total,
  parts,
  colors,
  token,
  pattern,
  showEquation = true,
  onChange,
  onDrawing,
}: {
  total: number;
  parts: [number, number];
  colors: [PartColor, PartColor];
  token: "square" | "circle" | "stick";
  pattern?: [number, number][];
  showEquation?: boolean;
  onChange: (parts: [number, number]) => void;
  onDrawing: (value: boolean) => void;
}) {
  const counts = compositionCounts(parts[0], parts[1], total),
    count = counts[0] + counts[1];
  const [width, setWidth] = useState(300),
    [drag, setDrag] = useState<Drag | null>(null);
  const [message, setMessage] = useState("");
  const active = useRef<Drag | null>(null),
    pointer = useRef<number | null>(null);
  const history = useRef<[number, number][]>([]);
  const field = useRef<View>(null);
  const source0 = useRef<View>(null),
    source1 = useRef<View>(null);
  const geometry = compositionLayout(width, total, pattern);
  const sources = [source0, source1];
  const sourceCenter = (group: number) => ({
    x: width * (group === 0 ? 0.27 : 0.73),
    y: 222,
  });
  const noun =
    token === "square"
      ? "квадратики"
      : token === "stick"
        ? "палочки"
        : "кружки";
  const showCoach = useGestureCoach(
    "task:gesture.composition-row",
    count === total
      ? [
          {
            ref: field,
            text: "Все предметы рядом. Пересчитай каждый цвет и проверь, сколько всего. Лишний предмет можно вернуть вниз.",
          },
        ]
      : [
          {
            ref: source0,
            text: `Здесь ${partPalette[colors[0]].label.toLowerCase()} ${noun}. Прижми один предмет пальцем.`,
            motion: { kind: "tap", points: [{ x: 0.5, y: 0.5 }] },
          },
          {
            ref: field,
            text: pattern
              ? "Перенеси его на общее поле. Предмет встанет на место, как в образце. Продолжай раскладывать предметы двух цветов."
              : `Перенеси его на общее поле. Клади ${noun} рядом: сначала одного цвета, затем другого.`,
            motion: {
              kind: "drag",
              points: [],
              from: { ref: source0 },
              to: { ref: field },
              toPoint: {
                x: geometry.center(counts[0]).x / width,
                y: geometry.center(counts[0]).y / 148,
              },
              token,
              color: partPalette[colors[0]].fill,
            },
          },
          {
            ref: source1,
            text: `А здесь ${partPalette[colors[1]].label.toLowerCase()} ${noun}. Перенеси нужное количество на то же поле. Два цвета покажут две части числа.`,
            motion: { kind: "tap", points: [{ x: 0.5, y: 0.5 }] },
          },
        ],
  );
  useEffect(() => () => onDrawing(false), [onDrawing]);
  function change(next: [number, number]) {
    history.current.push(counts);
    onChange(next);
  }
  function cancel() {
    active.current = null;
    pointer.current = null;
    setDrag(null);
    onDrawing(false);
  }
  function start(group: 0 | 1, index: number, e: any) {
    const center = index < 0 ? sourceCenter(group) : geometry.center(index);
    const d = {
      group,
      index,
      ...center,
      pageX: e.nativeEvent.pageX,
      pageY: e.nativeEvent.pageY,
    };
    active.current = d;
    setDrag(d);
    onDrawing(true);
  }
  function move(e: any) {
    const a = active.current;
    if (!a) return;
    setDrag({
      ...a,
      x: a.x + e.nativeEvent.pageX - a.pageX,
      y: a.y + e.nativeEvent.pageY - a.pageY,
    });
  }
  function finish(e: any) {
    const a = active.current;
    if (!a) return;
    const dx = e.nativeEvent.pageX - a.pageX,
      dy = e.nativeEvent.pageY - a.pageY;
    const x = a.x + dx,
      y = a.y + dy;
    if (Math.hypot(dx, dy) >= 8 && x >= -12 && x <= width + 12) {
      const next: [number, number] = [...counts];
      if (a.index < 0 && y >= -12 && y <= 148 + 12 && count < total) {
        next[a.group]++;
        change(next);
        setMessage("Предмет на месте. Два цвета — две части числа.");
      } else if (a.index >= 0 && y >= 168 && y <= 276) {
        next[a.group]--;
        change(next);
        setMessage("Предмет вернулся вниз.");
      }
    }
    cancel();
  }
  function handlers(group: 0 | 1, index: number): any {
    if (Platform.OS !== "web")
      return {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (e: any) => start(group, index, e),
        onResponderMove: move,
        onResponderRelease: finish,
        onResponderTerminate: cancel,
        onResponderTerminationRequest: () => false,
      };
    return {
      onPointerDown: (e: any) => {
        if (pointer.current !== null || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        start(group, index, e);
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
    };
  }
  function item(group: 0 | 1, index: number) {
    const isSource = index < 0;
    const moving = drag?.group === group && drag.index === index;
    const pos = moving
      ? drag!
      : isSource
        ? sourceCenter(group)
        : geometry.center(index);
    const hitWidth = isSource ? 64 : geometry.cell;
    const hitHeight = isSource || !pattern ? 64 : geometry.cell;
    const size = isSource ? 36 : geometry.cell;
    return (
      <View
        key={`${group}:${index}`}
        ref={isSource ? sources[group] : undefined}
        testID={
          isSource
            ? `composition-source-${group}`
            : `composition-token-${group}-${index}`
        }
        accessibilityRole="button"
        accessibilityLabel={`${partPalette[colors[group]].label} ${noun}${isSource ? ": возьми здесь" : `: предмет ${index + 1}`}`}
        accessibilityHint="Удерживай и перетаскивай"
        {...handlers(group, index)}
        style={[
          {
            position: "absolute",
            left: pos.x - hitWidth / 2,
            top: pos.y - hitHeight / 2,
            width: hitWidth,
            height: hitHeight,
            alignItems: "center",
            justifyContent: "center",
            zIndex: moving ? 10 : 2,
          },
          Platform.OS === "web"
            ? ({ touchAction: "none", cursor: "grab" } as any)
            : undefined,
        ]}
      >
        <View
          pointerEvents="none"
          style={{
            width: token === "stick" ? 8 : size,
            height: token === "stick" ? 40 : size,
            backgroundColor: partPalette[colors[group]].fill,
            borderRadius: token === "circle" ? size / 2 : 0,
            borderWidth: 1,
            borderColor: "#1f2433",
          }}
        />
      </View>
    );
  }
  return (
    <View testID="composition-board" style={{ gap: 10 }}>
      <CoachButton onPress={showCoach} />
      <Text style={{ fontFamily: f.bold, color: c.ink }}>
        {pattern
          ? `Переноси ${noun} на одно поле. Разложи их как на рисунке.`
          : `Переноси ${noun} на одно поле. Клади их рядом.`}
      </Text>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 276 }}
      >
        <View
          ref={field}
          testID="composition-field"
          style={{
            height: 148,
            borderRadius: 6,
            backgroundColor: c.wash,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: "#2b4ba8",
          }}
        />
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: geometry.center(i).x - geometry.cell / 2,
              top: geometry.center(i).y - geometry.cell / 2,
              width: geometry.cell,
              height: geometry.cell,
              borderWidth: 1,
              borderColor: "#b8cbbc",
            }}
          />
        ))}
        <Text
          testID="composition-total"
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 111,
            width: "100%",
            textAlign: "center",
            fontFamily: f.bold,
            color: c.ink,
          }}
        >
          {showEquation
            ? `${counts[0]} + ${counts[1]} = ${count}`
            : `${counts[0]} и ${counts[1]} · Всего ${count}`}
        </Text>
        <View
          testID="composition-supply"
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 168,
            width: "100%",
            height: 108,
            backgroundColor: c.washWarm,
            borderRadius: 6,
          }}
        >
          <Text
            style={{ textAlign: "center", fontFamily: f.bold, color: c.ink }}
          >
            Бери здесь · лишний предмет верни сюда
          </Text>
          {colors.map((color, i) => (
            <Text
              key={i}
              style={{
                position: "absolute",
                top: 83,
                left: sourceCenter(i).x - 55,
                width: 110,
                textAlign: "center",
                fontFamily: f.bold,
                color: c.ink,
              }}
            >
              {partPalette[color].label}
            </Text>
          ))}
        </View>
        {Array.from({ length: count }, (_, index) =>
          item(index < counts[0] ? 0 : 1, index),
        )}
        {item(0, -1)}
        {item(1, -1)}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontFamily: f.bold, color: c.ink }}>
          На поле: {count} из {total}
        </Text>
        <Button
          small
          secondary
          disabled={!count && !history.current.length}
          onPress={() => {
            setMessage("Последнее действие отменено.");
            const previous = history.current.pop();
            if (previous) onChange(previous);
            else
              onChange(
                counts[1] > 0 ? [counts[0], counts[1] - 1] : [counts[0] - 1, 0],
              );
          }}
        >
          Отменить
        </Button>
      </View>
      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: f.regular, color: c.ink }}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
