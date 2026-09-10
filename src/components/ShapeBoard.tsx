import React, { useState, useRef } from "react";
import { View, Text, Platform } from "react-native";
import Svg, { Line } from "react-native-svg";
import type { Block } from "../content/types";
import { edgeKey } from "../lib/assessment";
import { colors as c, fonts as f } from "../theme";
import { Button } from "./Controls";
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
  const edges = block.edges.map(([a, b], index) => {
    const p = block.vertices[a],
      q = block.vertices[b];
    return {
      index,
      key: edgeKey(a, b),
      x: ((p.x + q.x) * width) / 2,
      y: 24 + ((p.y + q.y) * 220) / 2,
      angle:
        (Math.atan2((q.y - p.y) * 220, (q.x - p.x) * width) * 180) / Math.PI,
      length: Math.hypot((q.x - p.x) * width, (q.y - p.y) * 220),
    };
  });
  const available = edges.filter((t) => !value.includes(t.key)).slice(0, 1);
  const tray = (_index: number) => ({ x: width / 2, y: 330 });
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
    setMessage("");
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
        Перетаскивай палочки по одной из лотка снизу на пунктир, чтобы собрать
        фигуру. При необходимости поверни палочку кнопкой ↻.
      </Text>
      <View
        testID="stick-board"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          height: Math.max(
            440,
            365 + Math.max(...edges.map((t) => t.length)) / 2,
          ),
          backgroundColor: c.mint,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
          <Svg width={width} height={270}>
            {edges.map((t) => {
              const a = block.vertices[block.edges[t.index][0]],
                b = block.vertices[block.edges[t.index][1]];
              return (
                <Line
                  key={t.key}
                  x1={a.x * width}
                  y1={24 + a.y * 220}
                  x2={b.x * width}
                  y2={24 + b.y * 220}
                  stroke={value.includes(t.key) ? "#bb8052" : "#71938d"}
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {available.map((t) => (
          <Button
            key={t.key}
            small
            secondary
            label={`Повернуть палочку ${t.index + 1}`}
            onPress={() =>
              setRotation((r) => ({ ...r, [t.index]: (r[t.index] ?? 0) + 45 }))
            }
          >
            ↻ {t.index + 1}
          </Button>
        ))}
      </View>
      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: f.bold, color: c.green }}
        >
          {message}
        </Text>
      )}
      <Text style={{ fontFamily: f.bold, color: c.green }}>
        Палочек: {value.length} из {edges.length}
      </Text>
      <Button
        small
        secondary
        disabled={!value.length}
        onPress={() => {
          onChange(value.slice(0, -1));
          setMessage("");
        }}
      >
        Убрать последнюю палочку
      </Button>
    </View>
  );
}
