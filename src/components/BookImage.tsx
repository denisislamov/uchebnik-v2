import React, { useRef } from "react";
import { useCoachAnchor } from "./GestureCoach";
import { Image, View, Text } from "react-native";
import { assets } from "../content/assets";
export function BookImage({
  id,
  maxHeight = 310,
}: {
  id: string;
  maxHeight?: number;
}) {
  const frame = useRef<View>(null);
  useCoachAnchor(`image:${id}`, frame);
  const count = /abacus_(\d+)$/.exec(id);
  if (count) {
    const n = Number(count[1]);
    return (
      <View
        ref={frame}
        accessibilityRole="image"
        accessibilityLabel="Карточка с жетонами для счёта"
        testID="modern-counting-card"
        style={{
          alignSelf: "center",
          padding: 16,
          borderRadius: 6,
          backgroundColor: "#e8eef9",
          maxWidth: 360,
          width: "100%",
          gap: 8,
        }}
      >
        <Text style={{ color: "#2563a6" }}>Посчитай жетоны</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: n }, (_, i) => (
            <View
              key={i}
              style={{
                width: 40,
                height: 40,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: "#aac5e1",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: i === n - 1 && n > 1 ? 18 : 0,
              }}
            >
              {
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#1565c0",
                  }}
                />
              }
            </View>
          ))}
        </View>
      </View>
    );
  }
  const a = assets[id];
  if (!a) return null;
  return (
    <View
      ref={frame}
      testID={`book-image-${id}`}
      style={{
        alignSelf: "center",
        width: "100%",
        maxWidth: (maxHeight * a.width) / a.height,
      }}
    >
      <Image
        accessibilityLabel={a.alt}
        source={a.source}
        resizeMode="contain"
        style={{
          width: "100%",
          aspectRatio: a.width / a.height,
          maxHeight,
          borderRadius: 4,
        }}
      />
    </View>
  );
}
