import React, { useState } from "react";
import { View, Pressable, Text } from "react-native";
import Svg, { Line } from "react-native-svg";
import type { Block } from "../content/types";
import { edgeKey } from "../lib/assessment";
import { colors as c, fonts as f } from "../theme";
export function ShapeBoard({
  block,
  value,
  onChange,
}: {
  block: Extract<Block, { kind: "shape" }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [first, setFirst] = useState<number | null>(null),
    [width, setWidth] = useState(400);
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontFamily: f.regular, color: c.muted }}>
        Нажми две точки, чтобы положить палочку. Повтори пару, чтобы убрать.
      </Text>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 220, backgroundColor: c.mint, borderRadius: 16 }}
      >
        <Svg width={width} height={220} style={{ position: "absolute" }}>
          {value.map((edge) => {
            const [a, b] = edge.split("-").map(Number);
            const v = block.vertices;
            return v[a] && v[b] ? (
              <Line
                key={edge}
                x1={v[a].x * width}
                y1={v[a].y * 220}
                x2={v[b].x * width}
                y2={v[b].y * 220}
                stroke="#bb8052"
                strokeWidth={9}
                strokeLinecap="round"
              />
            ) : null;
          })}
        </Svg>
        {block.vertices.map((v, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Точка ${i + 1}`}
            accessibilityState={{ selected: first === i }}
            onPress={() => {
              if (first === null) setFirst(i);
              else if (first === i) setFirst(null);
              else {
                const e = edgeKey(first, i);
                onChange(
                  value.includes(e)
                    ? value.filter((x) => x !== e)
                    : [...value, e],
                );
                setFirst(null);
              }
            }}
            style={{
              position: "absolute",
              left: v.x * width - 24,
              top: v.y * 220 - 24,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: first === i ? c.orange : c.card,
              borderWidth: 2,
              borderColor: c.green,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: f.bold,
                color: first === i ? c.white : c.green,
              }}
            >
              {i + 1}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontFamily: f.bold, color: c.green }}>
        Палочек: {value.length}
      </Text>
    </View>
  );
}
