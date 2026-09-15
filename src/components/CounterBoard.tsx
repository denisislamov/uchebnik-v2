import { CoachButton, useGestureCoach } from "./GestureCoach";
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Platform, ScrollView } from "react-native";
import type { Point } from "../content/types";
import { Button } from "./Controls";
import { colors as c, fonts as f } from "../theme";
import { counterBoardLayout, counterSupplyCenter } from "../lib/counterLayout";
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
  const sourceRef = useRef<View>(null),
    fieldRef = useRef<View>(null);
  const object =
    objectLabel ??
    (token === "stick"
      ? "палочку"
      : token === "square"
        ? "квадратик"
        : "кружок");
  const showCoach = useGestureCoach("place", [
    {
      ref: sourceRef,
      text: `Здесь можно взять ${object}. Прижми пальцем и держи.`,
    },
    {
      ref: fieldRef,
      text: "Не отпуская палец, перенеси предмет на это поле. Затем отпусти. Повтори столько раз, сколько нужно в задании.",
    },
  ]);
  const [width, setWidth] = useState(300),
    [drag, setDrag] = useState<{ index: number; x: number; y: number } | null>(
      null,
    ),
    [message, setMessage] = useState(""),
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
  const geometry = counterBoardLayout(width, count, rowMode ? "row" : "groups");
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
            setMessage("Предмет на месте!");
          } else setMessage("Поднеси предмет к свободному пунктиру.");
        } else {
          onChange(count + 1);
          setMessage("Предмет на месте!");
        }
      } else setMessage("Перетащи предмет на поле вверху.");
    } else if (
      x >= 0 &&
      x <= boardWidth &&
      y >= supplyTop &&
      y <= supplyTop + 105
    ) {
      remove(a.index);
      setMessage("Предмет вернулся на место.");
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
            left: pos.x - 24,
            top: pos.y - 24,
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            zIndex: drag?.index === index ? 2 : 1,
          },
          Platform.OS === "web"
            ? ({ touchAction: "none", cursor: "grab" } as any)
            : undefined,
        ]}
      >
        <View
          pointerEvents="none"
          style={{
            width: token === "stick" ? 8 : 28,
            height: token === "stick" ? 40 : 28,
            borderRadius: token === "circle" ? 16 : 3,
            backgroundColor:
              token === "stick"
                ? "#bb8052"
                : token === "square" && slots && index === 2
                  ? "#d62828"
                  : "#1565c0",
          }}
        />
        {tokenValue > 1 && (
          <Text
            pointerEvents="none"
            style={{
              position: "absolute",
              fontFamily: f.bold,
              fontSize: 15,
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
              style={{ position: "absolute", fontSize: 30 }}
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
      style={{
        width: boardWidth,
        height: supplyTop + 110,
        backgroundColor: c.paper,
        borderRadius: 14,
      }}
    >
      <View
        ref={fieldRef}
        testID="token-dropzone"
        pointerEvents="none"
        style={{
          height: fieldHeight,
          backgroundColor: c.mint,
          borderRadius: 14,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: "#71938d",
        }}
      />
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
        style={{
          position: "absolute",
          top: supplyTop,
          width: "100%",
          height: 105,
          backgroundColor: c.sand,
          borderRadius: 14,
        }}
      >
        <Text
          style={{
            position: rowMode ? "absolute" : undefined,
            left: rowMode ? sourceCenter.x - width / 2 : undefined,
            width: rowMode ? width : undefined,
            textAlign: "center",
            fontFamily: f.bold,
            color: c.muted,
          }}
        >
          Бери здесь
        </Text>
      </View>
      {indices.map(item)}
      {count < (slots?.length ?? max) && item(-1)}
    </View>
  );
  return (
    <View testID="counter-board" style={{ gap: 10 }}>
      <CoachButton onPress={showCoach} />
      <Text style={{ fontFamily: f.bold, color: c.ink, fontSize: 16 }}>
        Возьми{" "}
        {objectLabel ??
          (token === "stick"
            ? "палочку"
            : token === "square"
              ? "квадратик"
              : "кружок")}{" "}
        внизу и перенеси на поле.
      </Text>
      <Text style={{ fontFamily: f.regular, color: c.muted, fontSize: 14 }}>
        Не отпускай палец, пока несёшь предмет. Лишний предмет верни вниз.
      </Text>
      {rowMode && (
        <Text style={{ fontFamily: f.regular, color: c.muted }}>
          Все предметы остаются в одном ряду. Длинный ряд можно листать влево и
          вправо.
        </Text>
      )}
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: f.bold, color: c.ink }}
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
          style={{ fontFamily: f.regular, color: c.ink }}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
