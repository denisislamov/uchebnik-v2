import { CoachButton, useGestureCoach, useCoachAnchor } from "./GestureCoach";
import { hotspotTouchPoint, pickTarget } from "../lib/hitTesting";
import React, { useState, useRef } from "react";
import { View, Image, Pressable, Text } from "react-native";
import Svg, { Polygon, Ellipse, Rect } from "react-native-svg";
import type { Block, Hotspot, Point } from "../content/types";
import { assets } from "../content/assets";
import { colors as c, fonts as f } from "../theme";
import { NumberMeaning } from "./NumberMeaning";
function Picture({
  id,
  targets,
  selected,
  onPick,
  expected,
}: {
  id: string;
  targets: Hotspot[];
  expected: string[];
  selected: string[];
  onPick: (id: string) => void;
}) {
  const a = assets[id];
  const frame = useRef<View>(null);
  useCoachAnchor(`image:${id}`, frame);
  const relevant = targets.filter((t) => expected.includes(t.id));
  const region = (t: Hotspot) => ({ x: t.x, y: t.y, width: t.w, height: t.h });
  const showCoach = useGestureCoach("picture", [
    {
      ref: frame,
      surface: { kind: "image", imageId: id },
      text: "Сначала внимательно рассмотри предметы. Подумай, что нужно найти по заданию.",
      motion: targets.length
        ? {
            kind: "inspect",
            points: targets.map(hotspotTouchPoint),
            regions: targets.map(region),
            labels: targets.map((t) => t.label),
          }
        : undefined,
    },
    {
      ref: frame,
      surface: { kind: "image", imageId: id },
      text:
        relevant.length > 1
          ? "Отмечай нужные предметы по одному. Посмотри, как палец касается каждого из них."
          : "Коснись нужного предмета и подними палец. Чтобы убрать отметку, нажми ещё раз.",
      motion: relevant.length
        ? {
            kind: relevant.length > 1 ? "count" : "tap",
            points: relevant.map(hotspotTouchPoint),
            regions: relevant.map(region),
            labels: relevant.map((t) => t.label),
          }
        : undefined,
    },
  ]);
  const [width, setWidth] = useState(280);
  const height = (width * a.height) / a.width;
  const pick = (x: number, y: number) => {
    const target = pickTarget(targets, { x, y }, width, height);
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
    <View style={{ gap: 12, width: "100%" }}>
      <CoachButton onPress={showCoach} />
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
            style={{ width: "100%", height: "100%", borderRadius: 4 }}
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
                      fill="#2b4ba822"
                      stroke={c.pen}
                      strokeWidth={3}
                    />
                  ) : t.ellipse ? (
                    <Ellipse
                      key={t.id}
                      cx={(t.x + t.w / 2) * width}
                      cy={(t.y + t.h / 2) * height}
                      rx={(t.w * width) / 2}
                      ry={(t.h * height) / 2}
                      fill="#2b4ba822"
                      stroke={c.pen}
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
                      fill="#2b4ba822"
                      stroke={c.pen}
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
  if (block.quantityMeaning)
    return <NumberMeaning block={block} value={value} onChange={onChange} />;
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
          expected={block.expected}
          targets={block.targets.filter((t) => t.image === i)}
          selected={value}
          onPick={pick}
        />
      ))}
      {block.expected.length > 1 && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: f.bold, color: c.pen, fontSize: 20 }}
        >
          Отмечено: {value.filter((x) => x !== "miss").length}
        </Text>
      )}
      {miss && (
        <Text style={{ fontFamily: f.bold, color: c.red }}>
          Нажми прямо на предмет или цифру.
        </Text>
      )}
    </View>
  );
}
