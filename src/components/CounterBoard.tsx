import { CountingPiece } from "./CountingMaterial";
import { useGestureCoach } from "./GestureCoach";
import { useTaskSize } from "./taskSize";
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Platform, Pressable, ScrollView } from "react-native";
import type { Point } from "../content/types";
import { Button } from "./Controls";
import { colors as c, fonts as f } from "../theme";
import { Rows } from "./HandDrawn";
import { useAside, useHasAside } from "./Aside";
import { CELL } from "../lib/grid";
import { sheet } from "./sheet";
import { counterBoardLayout, counterSupplyCenter } from "../lib/counterLayout";
import { nextCounterSlot } from "../lib/coachTargets";
import { StyleSheet } from "react-native";
/** A finger that moved less than this pressed; one that moved more carried. */
const TAP_SLOP = 10;
const s = StyleSheet.create({
  accepting: { borderStyle: "solid", borderColor: c.pen, borderWidth: 2.5 },
  acceptingText: {
    fontFamily: f.bold,
    color: c.pen,
    fontSize: 15,
    lineHeight: CELL,
    marginBottom: 4,
  },
});
export function CounterBoard({
  value,
  onChange,
  onDrawing,
  token = "circle",
  slots,
  occupied: storedOccupied = [],
  onPlaced,
  max = 12,
  objectLabel,
  tokenValue = 1,
  layout = "groups",
}: {
  value: number;
  onChange: (v: number) => void;
  onDrawing: (v: boolean) => void;
  token?: "circle" | "stick" | "square";
  slots?: Point[];
  occupied?: number[];
  onPlaced?: (indices: number[]) => void;
  max?: number;
  objectLabel?: string;
  tokenValue?: number;
  layout?: "row" | "groups";
}) {
  const boardRef = useRef<View>(null);
  const sourceRef = useRef<View>(null),
    fieldRef = useRef<View>(null);
  const nextSlot = nextCounterSlot(slots, storedOccupied);
  const object =
    objectLabel ??
    (token === "stick"
      ? "палочку"
      : token === "square"
        ? "квадратик"
        : "кружок");
  const full = slots ? !nextSlot : value >= max;
  useGestureCoach(
    "place",
    full
      ? [
          {
            ref: boardRef,
            text: "На поле больше нет места. Пересчитай предметы. Если есть лишние, перенеси их обратно в коробку.",
          },
        ]
      : [
          {
            ref: sourceRef,
            surface: { kind: "token", token: token },
            text: `Здесь можно взять ${object}. Нажми на предмет, а потом на поле — он ляжет туда.`,
            motion: { kind: "tap", points: [{ x: 0.5, y: 0.5 }] },
          },
          {
            ref: boardRef,
            surface: { kind: "place", token, slots },
            motion: {
              kind: "drag",
              points: [],
              from: { ref: sourceRef },
              to: { ref: fieldRef },
              toPoint: nextSlot ?? { x: 0.5, y: 0.5 },
              surfaceToPoint: nextSlot,
              token,
            },
            text: "Можно и перенести предмет пальцем: веди его на поле и отпусти. Повтори столько раз, сколько нужно в задании.",
          },
        ],
  );
  const [width, setWidth] = useState(300),
    [drag, setDrag] = useState<{ index: number; x: number; y: number } | null>(
      null,
    ),
    [message, setMessage] = useState(""),
    // What was pressed and waits for its place: −1 is the object in the box.
    [picked, setPicked] = useState<number | null>(null),
    [rowScrollX, setRowScrollX] = useState(0);
  const rowScroll = useRef<ScrollView>(null);
  const active = useRef<{
      index: number;
      x: number;
      y: number;
      pageX: number;
      pageY: number;
    } | null>(null),
    pointer = useRef<number | null>(null);
  const occupied = [
    ...new Set(
      storedOccupied.filter(
        (i) => Number.isInteger(i) && i >= 0 && i < (slots?.length ?? 0),
      ),
    ),
  ];
  const count = slots ? occupied.length : Math.max(0, Math.min(max, value));
  const rowMode = layout === "row" && !slots;
  // A laptop window is low: the empty field starts two rows high and grows.
  const { fit, measured } = useTaskSize();
  const asideOpen = useHasAside();
  const geometry = counterBoardLayout(
    width,
    count,
    rowMode ? "row" : "groups",
    // …and takes the room a big window leaves free.
    // With the tray under it the board is eleven rows of the sheet, and
    // grows by whole rows.
    // It grows no taller than a few rows: a tall empty field only looked
    // like a hole in the page.
    // It starts two rows lower, to pay for the air around the board.
    fit
      ? Math.min(225, 81 + (asideOpen ? CELL * 2 : 0) + Math.max(0, measured))
      : 190,
  );
  const boardWidth = geometry.width;
  const fieldHeight = slots ? 190 : geometry.fieldHeight;
  const supplyTop = fieldHeight + 25;
  const sourceCenter = counterSupplyCenter(
    { width: boardWidth, supplyTop },
    width,
    rowMode ? rowScrollX : 0,
  );
  useEffect(() => {
    if (!rowMode || active.current) return;
    setRowScrollX(geometry.scrollX);
    rowScroll.current?.scrollTo({ x: geometry.scrollX, animated: false });
  }, [rowMode, geometry.scrollX, count, width]);
  const center = (index: number): Point =>
    index < 0
      ? sourceCenter
      : slots
        ? { x: slots[index].x * width, y: slots[index].y * 190 }
        : geometry.centers[index];
  const indices = slots ? occupied : Array.from({ length: count }, (_, i) => i);
  function placed(next: number[]) {
    onPlaced?.(next);
  }
  function remove(index: number) {
    if (slots) placed(occupied.filter((i) => i !== index));
    else onChange(Math.max(0, count - 1));
  }
  function cancel() {
    active.current = null;
    pointer.current = null;
    setDrag(null);
    onDrawing(false);
  }
  function begin(index: number, e: any) {
    active.current = {
      index,
      ...center(index),
      pageX: e.nativeEvent.pageX,
      pageY: e.nativeEvent.pageY,
    };
    setDrag({ index, ...center(index) });
    onDrawing(true);
  }
  function move(e: any) {
    const a = active.current;
    if (a)
      setDrag({
        index: a.index,
        x: a.x + e.nativeEvent.pageX - a.pageX,
        y: a.y + e.nativeEvent.pageY - a.pageY,
      });
  }
  function finish(e: any) {
    const a = active.current;
    if (!a) return;
    const x = a.x + e.nativeEvent.pageX - a.pageX,
      y = a.y + e.nativeEvent.pageY - a.pageY;
    // A press without carrying takes the object in hand: the next press,
    // on the field or on the box, puts it there. A small hand need not hold
    // and carry. By itself the press moves nothing, so children may count
    // what lies on the field by touching it.
    if (Math.hypot(x - a.x, y - a.y) < TAP_SLOP) {
      setPicked((old) => (old === a.index ? null : a.index));
      setMessage("");
      cancel();
      return;
    }
    setPicked(null);
    if (a.index < 0) {
      if (
        x >= 0 &&
        x <= boardWidth &&
        y >= 0 &&
        y <= fieldHeight &&
        count < (slots?.length ?? max)
      ) {
        if (slots) {
          const match = slots
            .map((_, i) => i)
            .filter((i) => !occupied.includes(i))
            .sort(
              (a, b) =>
                Math.hypot(center(a).x - x, center(a).y - y) -
                Math.hypot(center(b).x - x, center(b).y - y),
            )[0];
          if (
            match !== undefined &&
            Math.hypot(center(match).x - x, center(match).y - y) <= 36
          ) {
            placed([...occupied, match]);
            setMessage("");
          } else setMessage("Поднеси предмет к свободному пунктиру.");
        } else {
          onChange(count + 1);
          setMessage("");
        }
      } else setMessage("Отпусти предмет над полем вверху.");
    } else if (
      x >= 0 &&
      x <= boardWidth &&
      y >= supplyTop &&
      y <= supplyTop + 105
    ) {
      remove(a.index);
      setMessage("");
    }
    cancel();
  }
  function handlers(index: number): any {
    if (Platform.OS !== "web")
      return {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: (e: any) => begin(index, e),
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
        begin(index, e);
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
    Math.hypot(drag.x - center(drag.index).x, drag.y - center(drag.index).y) >=
      TAP_SLOP;
  const room = count < (slots?.length ?? max);
  const toField = (carrying && drag!.index < 0) || (picked === -1 && room),
    toBox =
      (carrying && drag!.index >= 0) ||
      (picked !== null && picked >= 0 && indices.includes(picked));
  /** The picked object is put on the field where it was pressed. */
  function putOnField(e: any) {
    if (picked !== -1 || !room) return;
    if (slots) {
      const x = e.nativeEvent.locationX ?? 0,
        y = e.nativeEvent.locationY ?? 0;
      const free = slots
        .map((_, i) => i)
        .filter((i) => !occupied.includes(i))
        .sort(
          (a, b) =>
            Math.hypot(center(a).x - x, center(a).y - y) -
            Math.hypot(center(b).x - x, center(b).y - y),
        )[0];
      if (free === undefined) return;
      placed([...occupied, free]);
      // The next one is in hand at once, while there is room for it.
      if (occupied.length + 1 >= slots.length) setPicked(null);
    } else {
      onChange(count + 1);
      if (count + 1 >= max) setPicked(null);
    }
    setMessage("");
  }
  function putInBox() {
    if (picked === null || picked < 0) return;
    remove(picked);
    setPicked(null);
    setMessage("");
  }
  const item = (index: number) => {
    const pos = drag?.index === index ? drag : center(index);
    return (
      <View
        key={index}
        ref={index < 0 ? sourceRef : undefined}
        testID={index < 0 ? "token-source" : `token-${index}`}
        accessibilityRole="button"
        accessibilityLabel={
          index < 0 ? `Возьми ${object}` : `Предмет ${index + 1} на поле`
        }
        accessibilityHint="Удерживай и перетаскивай"
        {...handlers(index)}
        style={[
          {
            position: "absolute",
            // The one in the box is what is pressed most: a larger target.
            left: pos.x - (index < 0 ? 36 : 24),
            top: pos.y - (index < 0 ? 36 : 24),
            width: index < 0 ? 72 : 48,
            height: index < 0 ? 72 : 48,
            alignItems: "center",
            justifyContent: "center",
            zIndex: drag?.index === index ? 2 : 1,
          },
          // In hand after a press: a pen ring around it.
          picked === index &&
            !drag && {
              borderWidth: 3,
              borderColor: c.pen,
              borderRadius: 12,
            },
          // Carried, it is lifted off the sheet: larger, with a shadow.
          drag?.index === index &&
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
        {token === "square" ? (
          <View
            pointerEvents="none"
            style={{
              width: 28,
              height: 28,
              borderRadius: 3,
              backgroundColor: slots && index === 2 ? "#d62828" : "#1565c0",
            }}
          />
        ) : (
          <CountingPiece token={token} />
        )}

        {tokenValue > 1 && (
          <Text
            pointerEvents="none"
            style={{
              position: "absolute",
              fontFamily: f.bold,
              fontSize: 15,
              lineHeight: 24,
              color: c.ink,
              backgroundColor: c.paper,
              borderRadius: 4,
              padding: 2,
            }}
          >
            {tokenValue}
          </Text>
        )}
        {!!objectLabel &&
          /яблок|гриб|орех|карандаш|пряник/.test(objectLabel) && (
            <Text
              pointerEvents="none"
              style={{ position: "absolute", fontSize: 30, lineHeight: 48 }}
            >
              {/яблок/.test(objectLabel)
                ? "🍎"
                : /гриб/.test(objectLabel)
                  ? "🍄"
                  : /орех/.test(objectLabel)
                    ? "🌰"
                    : /карандаш/.test(objectLabel)
                      ? "✏️"
                      : "🍪"}
            </Text>
          )}
      </View>
    );
  };
  const board = (
    <View
      ref={boardRef}
      collapsable={false}
      style={{
        width: boardWidth,
        height: supplyTop + 110,
        backgroundColor: c.paper,
        borderRadius: 6,
      }}
    >
      <View
        ref={fieldRef}
        testID="token-dropzone"
        pointerEvents="none"
        style={[
          {
            height: fieldHeight,
            backgroundColor: c.wash,
            borderRadius: 6,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: c.lip,
            alignItems: "center",
            justifyContent: "flex-end",
          },
          // Where the carried object may be put down: a pen line and a word.
          toField && s.accepting,
        ]}
      >
        {toField && <Text style={s.acceptingText}>Клади сюда</Text>}
      </View>
      {/* With an object in hand the field and the box hear a press. */}
      {picked === -1 && room && (
        <Pressable
          testID="token-dropzone-press"
          accessibilityRole="button"
          accessibilityLabel="Положить на поле"
          onPress={putOnField}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: fieldHeight,
          }}
        />
      )}
      {picked !== null && picked >= 0 && (
        <Pressable
          testID="token-supply-press"
          accessibilityRole="button"
          accessibilityLabel="Вернуть в коробку"
          onPress={putInBox}
          style={{
            position: "absolute",
            top: supplyTop,
            left: 0,
            right: 0,
            height: 105,
          }}
        />
      )}
      {slots?.map((_, i) => (
        <View
          key={i}
          testID={`token-slot-${i}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: center(i).x - 17,
            top: center(i).y - 17,
            width: 34,
            height: 34,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: i === 2 ? "#d62828" : "#1565c0",
          }}
        />
      ))}
      <View
        testID="token-supply"
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: supplyTop,
            width: "100%",
            height: 105,
            backgroundColor: c.washWarm,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: "transparent",
          },
          toBox && s.accepting,
        ]}
      >
        <Text
          style={{
            position: rowMode ? "absolute" : undefined,
            left: rowMode ? sourceCenter.x - width / 2 : undefined,
            width: rowMode ? width : undefined,
            textAlign: "center",
            fontFamily: f.bold,
            color: c.muted,
            lineHeight: CELL,
          }}
        >
          {toBox ? "Верни сюда" : "Бери здесь"}
        </Text>
      </View>
      {indices.map(item)}
      {count < (slots?.length ?? max) && item(-1)}
    </View>
  );
  // Beside a sample the words go under it, and the field takes their rows.
  // One short line: how to carry and how to press is shown by «Как это
  // сделать?», not written over every board.
  const words = (
    <Text
      style={{
        fontFamily: f.regular,
        color: c.ink,
        fontSize: 16,
        lineHeight: 24,
      }}
    >
      Бери {object} внизу и клади на поле.
    </Text>
  );
  const aside = useAside(words, [objectLabel, token].join("|"));
  return (
    // Rows of the sheet: what to do, an empty row, the board in whole rows,
    // the count with the button.
    <View testID="counter-board">
      {!aside && words}
      <Rows style={{ marginTop: aside ? 0 : CELL }} object>
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {rowMode ? (
            <ScrollView
              ref={rowScroll}
              testID="counter-row-scroll"
              horizontal
              scrollEnabled={!drag}
              showsHorizontalScrollIndicator
              scrollEventThrottle={16}
              onScroll={(e) => setRowScrollX(e.nativeEvent.contentOffset.x)}
              onContentSizeChange={() => {
                if (active.current) return;
                setRowScrollX(geometry.scrollX);
                rowScroll.current?.scrollTo({
                  x: geometry.scrollX,
                  animated: false,
                });
              }}
              style={{ height: supplyTop + 110 }}
              contentContainerStyle={{ width: boardWidth }}
            >
              {board}
            </ScrollView>
          ) : (
            board
          )}
        </View>
      </Rows>
      <View style={sheet.controls}>
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: f.bold, color: c.ink, lineHeight: CELL }}
        >
          На поле: {count}
        </Text>
        <Button
          small
          secondary
          disabled={count === 0}
          onPress={() => remove(indices.at(-1)!)}
        >
          Отменить
        </Button>
      </View>
      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: f.regular, color: c.ink, lineHeight: CELL }}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
