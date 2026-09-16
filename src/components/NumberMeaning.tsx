import React, { useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { Block, Hotspot } from "../content/types";
import { assets } from "../content/assets";
import { colors as c, fonts as f } from "../theme";
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
          borderColor: selected ? c.green : "#d7e1da",
          borderRadius: 16,
          backgroundColor: selected ? "#e5f1e9" : c.paper,
          padding: 12,
          gap: 10,
        }}
      >
        {block.images[target.image].includes("abacus_") ? (
          <View
            testID="modern-meaning-tokens"
            style={{
              height: 125,
              flexDirection: "row",
              gap: 16,
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
                  borderRadius: 14,
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
            style={{ height: 125, width: "100%" }}
          />
        )}
        <Text
          style={{
            fontFamily: f.bold,
            color: c.ink,
            fontSize: 18,
            textAlign: "center",
          }}
        >
          {target.label}
        </Text>
        <Text
          style={{ fontFamily: f.regular, color: c.green, textAlign: "center" }}
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
    <View testID="number-meaning" style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
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
      </View>
      {active && (
        <Text
          testID="meaning-feedback"
          accessibilityLiveRegion="polite"
          style={{ fontFamily: f.bold, fontSize: 22, color: c.green }}
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
          lineHeight: 29,
        }}
      >
        {block.quantityMeaning!.conclusion}
      </Text>
    </View>
  );
}
