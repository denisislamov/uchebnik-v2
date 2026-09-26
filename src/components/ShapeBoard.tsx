import { useGestureCoach } from "./GestureCoach";
import React, { useState, useRef } from "react";
import { View, Text, Platform } from "react-native";
import Svg, { Line } from "react-native-svg";
import type { Block } from "../content/types";
import { edgeKey } from "../lib/assessment";
import { colors as c, fonts as f } from "../theme";
import { Button } from "./Controls";
import { useTaskSize } from "./taskSize";
export function ShapeBoard({
  block,
  value,
  onChange,
  onDrawing,
}: {
  block: Extract<Block, { kind: "shape" }>;
  value: string[];
  onChange: (v: string[]) => void;
  onDrawing: (v: boolean) => void;
}) {
  const boardRef = useRef<View>(null),
    targetRef = useRef<View>(null);
  const rotateRef = useRef<View>(null);
  const sourceRef = useRef<View>(null),
    fieldRef = useRef<View>(null);
  const [width, setWidth] = useState(400),
    [drag, setDrag] = useState<{ index: number; x: number; y: number } | null>(
      null,
    ),
    [message, setMessage] = useState("");
  const active = useRef<{
    index: number;
    pageX: number;
    pageY: number;
    x: number;
    y: number;
  } | null>(null);
  const [rotation, setRotation] = useState<Record<number, number>>({});
  // On a wide, low window the stick waits to the right of the shape instead
  // of under it: the board is half as tall and stays on screen.
  const landscape = useTaskSize().short && width >= 420;
  const scale = landscape
    ? Math.min(240, width * 0.5 - 24)
    : Math.min(width - 32, 240);
  const vertices = block.vertices.map((p) => ({
    x: (landscape ? width * 0.3 : width / 2) - scale / 2 + p.x * scale,
    y: 24 + p.y * scale,
  }));
  const edges = block.edges.map(([a, b], index) => {
    const p = vertices[a],
      q = vertices[b];
    return {
      index,
      key: edgeKey(a, b),
      x: (p.x + q.x) / 2,
      y: (p.y + q.y) / 2,
      angle: (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI,
      length: Math.hypot(q.x - p.x, q.y - p.y),
    };
  });
  const available = edges.filter((t) => !value.includes(t.key)).slice(0, 1);
  const turns = available[0]
    ? ((180 - ((rotation[available[0].index] ?? 0) % 180)) % 180) / 45
    : 0;
  useGestureCoach(
    "sticks",
    !available.length
      ? [{ ref: boardRef, text: "Все палочки уже на месте. Проверь фигуру." }]
      : [
          ...(turns
            ? [
                {
                  ref: rotateRef,
                  text: `Перед переносом нажми «Повернуть» ${turns} ${turns === 1 ? "раз" : "раза"}, чтобы палочка совпала с наклоном пунктира. Затем перенеси её, как показано дальше.`,
                  motion: {
                    kind: "tap" as const,
                    points: [{ x: 0.5, y: 0.5 }],
                  },
                },
              ]
            : []),
          {
            ref: sourceRef,
            surface: { kind: "token", token: "stick" },
            text: "Возьми палочку внизу: прижми её пальцем и держи.",
            motion: { kind: "tap", points: [{ x: 0.5, y: 0.5 }] },
          },
          {
            ref: boardRef,
            surface: {
              kind: "shape",
              vertices: block.vertices,
              edges: block.edges,
              activeEdge: available[0]?.index,
            },
            motion: {
              kind: "drag",
              points: [],
              from: { ref: sourceRef },
              to: { ref: targetRef },
              surfaceToPoint: available[0]
                ? {
                    x:
                      (block.vertices[block.edges[available[0].index][0]].x +
                        block.vertices[block.edges[available[0].index][1]].x) /
                      2,
                    y:
                      (block.vertices[block.edges[available[0].index][0]].y +
                        block.vertices[block.edges[available[0].index][1]].y) /
                      2,
                  }
                : undefined,
              token: "stick",
              tokenLength: available[0]?.length,
              angle: available[0] ? available[0].angle : 0,
            },
            text: "Не отпуская палец, положи палочку на подходящую линию. Если нужно, нажми «Повернуть».",
          },
        ],
  );
  const longest = Math.max(...edges.map((t) => t.length));
  const tray = (_index: number) =>
    landscape
      ? { x: width * 0.76, y: 24 + scale / 2 }
      : { x: width / 2, y: 330 };
  const fieldHeight = landscape ? scale + 48 : 270;
  const webPointer = useRef<number | null>(null);
  function begin(index: number, e: any) {
    active.current = {
      index,
      pageX: e.nativeEvent.pageX,
      pageY: e.nativeEvent.pageY,
      ...tray(index),
    };
    setDrag({ index, ...tray(index) });
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
  function cancel() {
    active.current = null;
    webPointer.current = null;
    setDrag(null);
    onDrawing(false);
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
    // Capture the browser pointer; a moving/rotating stick must keep receiving pointerup.
    return {
      onPointerDown: (e: any) => {
        if (webPointer.current !== null || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        webPointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        begin(index, e);
      },
      onPointerMove: (e: any) => {
        if (e.pointerId === webPointer.current) move(e);
      },
      onPointerUp: (e: any) => {
        if (e.pointerId !== webPointer.current) return;
        webPointer.current = null;
        finish(e);
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      },
      onPointerCancel: (e: any) => {
        if (e.pointerId === webPointer.current) cancel();
      },
      onLostPointerCapture: (e: any) => {
        if (e.pointerId === webPointer.current) cancel();
      },
    };
  }
  function finish(e: any) {
    const current = active.current;
    active.current = null;
    onDrawing(false);
    if (!current) return;
    const x = current.x + e.nativeEvent.pageX - current.pageX,
      y = current.y + e.nativeEvent.pageY - current.pageY;
    const source = edges[current.index],
      angle = source.angle + (rotation[current.index] ?? 0);
    const match = edges.find(
      (t) =>
        !value.includes(t.key) &&
        Math.hypot(t.x - x, t.y - y) < 36 &&
        Math.abs(t.length - source.length) <
          Math.max(12, source.length * 0.15) &&
        Math.abs(((((angle - t.angle) % 180) + 270) % 180) - 90) < 22,
    );
    if (match) {
      onChange([...value, match.key]);
      setMessage("Палочка на месте!");
    } else
      setMessage(
        "Поднеси середину палочки к пунктиру. Если нужно, поверни палочку.",
      );
    setDrag(null);
  }
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontFamily: f.regular, color: c.muted }}>
        Возьми палочку {landscape ? "справа" : "внизу"} и положи на пунктир.
        Чтобы повернуть палочку, нажми «Повернуть».
      </Text>
      <View
        ref={boardRef}
        testID="stick-board"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          height: landscape
            ? Math.max(fieldHeight, 24 + scale / 2 + longest / 2 + 16)
            : Math.max(440, 365 + longest / 2),
          backgroundColor: c.wash,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <View
          ref={fieldRef}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: fieldHeight,
          }}
        >
          <Svg width={width} height={fieldHeight}>
            {edges.map((t) => {
              const a = vertices[block.edges[t.index][0]],
                b = vertices[block.edges[t.index][1]];
              return (
                <Line
                  key={t.key}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={value.includes(t.key) ? "#bb8052" : "#2b4ba8"}
                  strokeWidth={value.includes(t.key) ? 9 : 3}
                  strokeDasharray={value.includes(t.key) ? undefined : "6 5"}
                  strokeLinecap="round"
                />
              );
            })}
          </Svg>
          {edges.map((t) => (
            <View
              key={t.key}
              ref={t.index === available[0]?.index ? targetRef : undefined}
              collapsable={false}
              testID={`stick-target-${t.index}`}
              style={{
                position: "absolute",
                left: t.x - 5,
                top: t.y - 5,
                width: 10,
                height: 10,
              }}
            />
          ))}
        </View>
        {available.map((t) => {
          const position = drag?.index === t.index ? drag : tray(t.index);
          return (
            <React.Fragment key={t.key}>
              <View
                ref={sourceRef}
                accessibilityLabel={`Палочка ${t.index + 1}`}
                testID={`stick-${t.index}`}
                accessibilityHint="Перетащи на подходящий пунктир"
                {...handlers(t.index)}
                style={[
                  {
                    position: "absolute",
                    left: position.x - t.length / 2,
                    top: position.y - 22,
                    width: t.length,
                    height: 44,
                    justifyContent: "center",
                    transform: [
                      { rotate: `${t.angle + (rotation[t.index] ?? 0)}deg` },
                    ],
                    zIndex: drag?.index === t.index ? 10 : 1,
                  },
                  Platform.OS === "web"
                    ? ({ touchAction: "none", cursor: "grab" } as any)
                    : undefined,
                ]}
              >
                <View
                  pointerEvents="none"
                  style={{
                    height: 9,
                    backgroundColor: "#bb8052",
                    borderRadius: 5,
                    borderWidth: 1,
                    borderColor: "#93613a",
                  }}
                />
              </View>
            </React.Fragment>
          );
        })}
      </View>
      {/* Rotate, count and undo share one row: under the board they took three. */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        {available.map((t) => (
          <View key={t.key} ref={rotateRef} collapsable={false}>
            <Button
              small
              secondary
              label={`Повернуть палочку ${t.index + 1}`}
              onPress={() =>
                setRotation((r) => ({
                  ...r,
                  [t.index]: (r[t.index] ?? 0) + 45,
                }))
              }
            >
              ↻ Повернуть
            </Button>
          </View>
        ))}
        <Text style={{ fontFamily: f.bold, color: c.pen, flexGrow: 1 }}>
          Палочек: {value.length} из {edges.length}
        </Text>
        <Button
          small
          secondary
          label="Убрать последнюю палочку"
          disabled={!value.length}
          onPress={() => {
            onChange(value.slice(0, -1));
            setMessage("");
          }}
        >
          Убрать последнюю
        </Button>
      </View>
      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: f.bold, color: c.pen }}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
