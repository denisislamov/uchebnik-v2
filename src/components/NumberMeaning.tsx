import React, { useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { Block, Hotspot } from "../content/types";
import { assets } from "../content/assets";
import { colors as c, fonts as f } from "../theme";
import { Rows } from "./HandDrawn";
import { useCoachAnchor } from "./GestureCoach";

type PictureBlock = Extract<Block, { kind: "picture" }>;
function MeaningCard({
  block,
  target,
  selected,
  onPress,
}: {
  block: PictureBlock;
  target: Hotspot;
  selected: boolean;
  onPress: () => void;
}) {
  const ref = useRef<View>(null);
  useCoachAnchor(`meaning:${block.id}:${target.id}`, ref);
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ flexBasis: 140, flexGrow: 1, maxWidth: 260 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={target.label}
        accessibilityState={{ selected }}
        onPress={onPress}
        testID={`meaning-${target.id}`}
        style={{
          borderWidth: 2,
          borderColor: selected ? c.pen : "#a9b6cc",
          borderRadius: 6,
          backgroundColor: selected ? "#e8eef9" : c.paper,
          padding: 12,
          gap: 12,
        }}
      >
        {block.images[target.image].includes("abacus_") ? (
          <View
            testID="modern-meaning-tokens"
            style={{
              height: 120,
              flexDirection: "row",
              gap: 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Array.from({ length: block.quantityMeaning!.number }, (_, i) => (
              <View
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: "#1565c0",
                }}
              />
            ))}
          </View>
        ) : (
          <Image
            source={assets[block.images[target.image]].source}
            resizeMode="contain"
            accessible={false}
            style={{ height: 120, width: "100%" }}
          />
        )}
        <Text
          style={{
            fontFamily: f.bold,
            color: c.ink,
            fontSize: 18,
            lineHeight: 24,
            textAlign: "center",
          }}
        >
          {target.label}
        </Text>
        <Text
          style={{
            lineHeight: 24,
            fontFamily: f.regular,
            color: c.pen,
            textAlign: "center",
          }}
        >
          {selected ? "Рассмотрели" : "Коснись рисунка"}
        </Text>
      </Pressable>
    </View>
  );
}
export function NumberMeaning({
  block,
  value,
  onChange,
}: {
  block: PictureBlock;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [last, setLast] = useState<string>();
  const active = block.targets.find((t) => t.id === last);
  return (
    <View testID="number-meaning" style={{ gap: 24 }}>
      <Rows
        object
        contentStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
      >
        {block.targets.map((target) => (
          <MeaningCard
            key={target.id}
            block={block}
            target={target}
            selected={value.includes(target.id)}
            onPress={() => {
              setLast(target.id);
              onChange([
                ...new Set([
                  ...value.filter((id) => block.expected.includes(id)),
                  target.id,
                ]),
              ]);
            }}
          />
        ))}
      </Rows>
      {active && (
        <Text
          testID="meaning-feedback"
          accessibilityLiveRegion="polite"
          style={{
            fontFamily: f.bold,
            fontSize: 22,
            lineHeight: 24,
            color: c.pen,
          }}
        >
          {active.label}.{" "}
          {active.label.startsWith("Цифра")
            ? "Так записывают это число."
            : `Это тоже ${block.quantityMeaning!.number}.`}
        </Text>
      )}
      <Text
        style={{
          fontFamily: f.regular,
          color: c.ink,
          fontSize: 20,
          lineHeight: 24,
        }}
      >
        {block.quantityMeaning!.conclusion}
      </Text>
    </View>
  );
}
