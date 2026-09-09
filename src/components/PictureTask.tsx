import { containsPoint } from "../lib/hitTesting";
import React, { useState, useRef } from "react";
import { View, Image, Pressable, Text } from "react-native";
import Svg, { Polygon, Ellipse, Rect } from "react-native-svg";
import type { Block, Hotspot, Point } from "../content/types";
import { assets } from "../content/assets";
import { colors as c, fonts as f } from "../theme";
function Picture({
  id,
  targets,
  selected,
  onPick,
}: {
  id: string;
  targets: Hotspot[];
  selected: string[];
  onPick: (id: string) => void;
}) {
  const a = assets[id];
  const frame = useRef<View>(null);
  const [width, setWidth] = useState(280);
  const height = (width * a.height) / a.width;
  const pick = (x: number, y: number) => {
    const target = targets.find((t) => containsPoint(t, { x, y }));
    onPick(target?.id ?? "miss");
  };
  function press(e: any, fallback?: string) {
    e.stopPropagation();
    const { pageX, pageY, detail } = e.nativeEvent;
    if ((detail === 0 || !Number.isFinite(pageX)) && fallback) {
      onPick(fallback);
      return;
    }
    frame.current?.measureInWindow((x, y, w, h) =>
      pick((pageX - x) / w, (pageY - y) / h),
    );
  }
  return (
    <View
      ref={frame}
      style={{
        width: "100%",
        maxWidth: Math.min(650, (420 * a.width) / a.height),
        alignSelf: "center",
      }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Рисунок задания"
        onPress={(e) => press(e)}
        style={{ width: "100%", height }}
      >
        <Image
          accessible={false}
          source={a.source}
          resizeMode="stretch"
          style={{ width: "100%", height: "100%", borderRadius: 10 }}
        />
        <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
          <Svg width={width} height={height}>
            {targets
              .filter((t) => selected.includes(t.id))
              .map((t) =>
                t.polygon ? (
                  <Polygon
                    key={t.id}
                    points={t.polygon
                      .map((p) => `${p.x * width},${p.y * height}`)
                      .join(" ")}
                    fill="#23594e25"
                    stroke={c.green}
                    strokeWidth={3}
                  />
                ) : t.ellipse ? (
                  <Ellipse
                    key={t.id}
                    cx={(t.x + t.w / 2) * width}
                    cy={(t.y + t.h / 2) * height}
                    rx={(t.w * width) / 2}
                    ry={(t.h * height) / 2}
                    fill="#23594e25"
                    stroke={c.green}
                    strokeWidth={3}
                  />
                ) : (
                  <Rect
                    key={t.id}
                    x={t.x * width}
                    y={t.y * height}
                    width={t.w * width}
                    height={t.h * height}
                    rx={6}
                    fill="#23594e25"
                    stroke={c.green}
                    strokeWidth={3}
                  />
                ),
              )}
          </Svg>
        </View>
        {targets.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: selected.includes(t.id) }}
            onPress={(e) => press(e, t.id)}
            style={{
              position: "absolute",
              left: t.x * width,
              top: t.y * height,
              width: t.w * width,
              height: t.h * height,
            }}
          />
        ))}
      </Pressable>
    </View>
  );
}
export function PictureTask({
  block,
  value,
  onChange,
}: {
  block: Extract<Block, { kind: "picture" }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [miss, setMiss] = useState(false);
  function pick(id: string) {
    setMiss(id === "miss");
    if (id === "miss") return;
    onChange(
      block.expected.length === 1
        ? value.includes(id)
          ? []
          : [id]
        : value.includes(id)
          ? value.filter((x) => x !== id)
          : [...value.filter((x) => x !== "miss"), id],
    );
  }
  return (
    <View style={{ gap: 14 }}>
      {block.images.map((id, i) => (
        <Picture
          key={id}
          id={id}
          targets={block.targets.filter((t) => t.image === i)}
          selected={value}
          onPick={pick}
        />
      ))}
      {block.expected.length > 1 && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: f.bold, color: c.green, fontSize: 20 }}
        >
          Отмечено: {value.filter((x) => x !== "miss").length}
        </Text>
      )}
      {miss && (
        <Text style={{ fontFamily: f.bold, color: c.orange }}>
          Нажми прямо на предмет или цифру.
        </Text>
      )}
    </View>
  );
}
