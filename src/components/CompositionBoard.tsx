import { useCountingMaterial } from "./CountingMaterial";
import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Button } from "./Controls";
import { useGestureCoach } from "./GestureCoach";
import {
  compositionCounts,
  compositionLayout,
  partPalette,
  type PartColor,
} from "../lib/compositionLayout";
import { colors as c, fonts as f } from "../theme";
import { Rows } from "./HandDrawn";
import { sheet } from "./sheet";
import { CELL } from "../lib/grid";
/** A finger that moved less than this pressed; one that moved more carried. */
const TAP_SLOP = 10;
const accepting = {
  borderStyle: "solid",
  borderColor: c.pen,
  borderWidth: 2.5,
} as const;

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
  const material = useCountingMaterial();
  const singleColor = token !== "square";
  const partLabel = (group: number) =>
    singleColor
      ? group === 0
        ? "Первая часть"
        : "Вторая часть"
      : partPalette[colors[group]].label;
  const counts = compositionCounts(parts[0], parts[1], total),
    count = counts[0] + counts[1];
  const [width, setWidth] = useState(300),
    [drag, setDrag] = useState<Drag | null>(null);
  // Nothing is said about a move that worked: the field shows it.
  const message = "";
  // What was pressed and waits for its place; an index under 0 is a box's.
  const [picked, setPicked] = useState<{ group: 0 | 1; index: number } | null>(
    null,
  );
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
  useGestureCoach(
    "task:gesture.composition-row",
    count === total
      ? [
          {
            ref: field,
            text: "Все предметы рядом. Пересчитай каждую часть и проверь, сколько всего. Лишний предмет можно вернуть вниз.",
          },
        ]
      : [
          {
            ref: source0,
            text: singleColor
              ? "Здесь предметы для первой части, без метки. Нажми на предмет, а потом на поле — он ляжет туда."
              : `Здесь ${partPalette[colors[0]].label.toLowerCase()} ${noun}. Нажми на предмет, а потом на поле — он ляжет туда.`,
            motion: { kind: "tap", points: [{ x: 0.5, y: 0.5 }] },
          },
          {
            ref: field,
            text: singleColor
              ? "Переноси предметы на общее поле: сначала первую часть, потом вторую. Метка поможет отличить их."
              : pattern
                ? "Можно и перенести его пальцем на общее поле. Предмет встанет на место, как в образце. Продолжай раскладывать предметы двух цветов."
                : `Можно и перенести его пальцем на общее поле. Клади ${noun} рядом: сначала одного цвета, затем другого.`,
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
              color: singleColor ? material.fill : partPalette[colors[0]].fill,
            },
          },
          {
            ref: source1,
            text: singleColor
              ? "Здесь предметы для второй части, с белой меткой. Перенеси нужное количество на то же поле."
              : `А здесь ${partPalette[colors[1]].label.toLowerCase()} ${noun}. Перенеси нужное количество на то же поле. Два цвета покажут две части числа.`,
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
    const next: [number, number] = [...counts];
    if (Math.hypot(dx, dy) < TAP_SLOP) {
      // A press without carrying takes the object in hand: the next press,
      // on the field or on the box, puts it there. By itself the press
      // moves nothing, so children may count what lies on the field by
      // touching it.
      setPicked((old) =>
        old && old.group === a.group && old.index === a.index
          ? null
          : { group: a.group, index: a.index },
      );
      cancel();
      return;
    }
    setPicked(null);
    if (x >= -12 && x <= width + 12) {
      if (a.index < 0 && y >= -12 && y <= 148 + 12 && count < total) {
        next[a.group]++;
        change(next);
      } else if (a.index >= 0 && y >= 168 && y <= 276) {
        next[a.group]--;
        change(next);
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
  // Carried far enough to be a drag, not a press.
  const carrying =
    !!drag &&
    Math.hypot(
      drag.x -
        (drag.index < 0
          ? sourceCenter(drag.group)
          : geometry.center(drag.index)
        ).x,
      drag.y -
        (drag.index < 0
          ? sourceCenter(drag.group)
          : geometry.center(drag.index)
        ).y,
    ) >= TAP_SLOP;
  const toField =
      (carrying && drag!.index < 0) ||
      (!!picked && picked.index < 0 && count < total),
    toBox =
      (carrying && drag!.index >= 0) ||
      (!!picked && picked.index >= 0 && picked.index < count);
  function putOnField() {
    if (!picked || picked.index >= 0 || count >= total) return;
    const next: [number, number] = [...counts];
    next[picked.group]++;
    change(next);
    // The next one is in hand at once, while there is room for it.
    if (count + 1 >= total) setPicked(null);
  }
  function putInBox() {
    if (!picked || picked.index < 0) return;
    const next: [number, number] = [...counts];
    next[picked.group]--;
    change(next);
    setPicked(null);
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
        accessibilityLabel={`${partLabel(group)}${singleColor ? ":" : ""} ${noun}${isSource ? ": возьми здесь" : `: предмет ${index + 1}`}`}
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
          // In hand after a press: a pen ring around it.
          !!picked &&
            picked.group === group &&
            picked.index === index &&
            !drag && {
              borderWidth: 3,
              borderColor: c.pen,
              borderRadius: 12,
            },
          // Carried, it is lifted off the sheet: larger, with a shadow.
          moving &&
            carrying && {
              transform: [{ scale: 1.2 }],
              ...(Platform.OS === "web"
                ? ({ filter: "drop-shadow(0 3px 3px #1f243355)" } as any)
                : undefined),
            },
          Platform.OS === "web"
            ? ({ touchAction: "none", cursor: "grab" } as any)
            : undefined,
        ]}
      >
        <View
          pointerEvents="none"
          style={{
            width: token === "stick" ? 7 : size,
            height: token === "stick" ? 46 : size,
            backgroundColor: singleColor
              ? material.fill
              : partPalette[colors[group]].fill,
            borderRadius:
              token === "circle" ? size / 2 : token === "stick" ? 2.5 : 0,
            borderWidth: 1,
            borderColor: singleColor ? material.edge : "#1f2433",
            borderTopColor: singleColor ? material.light : "#1f2433",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* The two parts differ by more than colour: one carries a dot. */}
          {(singleColor ? group === 1 : colors[group] === "red") && (
            <View
              style={{
                width: token === "stick" ? 5 : Math.max(6, size * 0.28),
                height: token === "stick" ? 5 : Math.max(6, size * 0.28),
                borderRadius: size,
                backgroundColor: c.white,
              }}
            />
          )}
        </View>
      </View>
    );
  }
  return (
    <View testID="composition-board">
      <Text style={{ lineHeight: 24, fontFamily: f.bold, color: c.ink }}>
        {pattern
          ? `Клади ${noun} на поле, как на рисунке.`
          : `Клади ${noun} на поле рядом.`}
      </Text>
      <Rows style={{ marginTop: CELL }} object>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ height: 276 }}
        >
          <View
            ref={field}
            testID="composition-field"
            style={[
              {
                height: 148,
                borderRadius: 6,
                backgroundColor: c.wash,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: c.lip,
              },
              // Where the carried object may be put down.
              toField && accepting,
            ]}
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
              lineHeight: 24,
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
            style={[
              {
                position: "absolute",
                top: 168,
                width: "100%",
                height: 108,
                backgroundColor: c.washWarm,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: "transparent",
              },
              toBox && accepting,
            ]}
          >
            <Text
              style={{
                lineHeight: 24,
                textAlign: "center",
                fontFamily: f.bold,
                color: c.ink,
              }}
            >
              {toBox ? "Верни сюда" : "Бери здесь"}
            </Text>
            {colors.map((_, i) => (
              <Text
                key={i}
                style={{
                  lineHeight: 24,
                  position: "absolute",
                  top: 83,
                  left: sourceCenter(i).x - 55,
                  width: 110,
                  textAlign: "center",
                  fontFamily: f.bold,
                  color: c.ink,
                }}
              >
                {partLabel(i)}
              </Text>
            ))}
          </View>
          {/* With an object in hand the field and the box hear a press. */}
          {!!picked && picked.index < 0 && count < total && (
            <Pressable
              testID="composition-field-press"
              accessibilityRole="button"
              accessibilityLabel="Положить на поле"
              onPress={putOnField}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 148,
              }}
            />
          )}
          {!!picked && picked.index >= 0 && (
            <Pressable
              testID="composition-supply-press"
              accessibilityRole="button"
              accessibilityLabel="Вернуть в коробку"
              onPress={putInBox}
              style={{
                position: "absolute",
                top: 168,
                left: 0,
                right: 0,
                height: 108,
              }}
            />
          )}
          {Array.from({ length: count }, (_, index) =>
            item(index < counts[0] ? 0 : 1, index),
          )}
          {item(0, -1)}
          {item(1, -1)}
        </View>
      </Rows>
      <View style={sheet.controls}>
        <Text style={{ lineHeight: 24, fontFamily: f.bold, color: c.ink }}>
          На поле: {count} из {total}
        </Text>
        <Button
          small
          secondary
          disabled={!count && !history.current.length}
          onPress={() => {
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
          style={{ lineHeight: 24, fontFamily: f.regular, color: c.ink }}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
