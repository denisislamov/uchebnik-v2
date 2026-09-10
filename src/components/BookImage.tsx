import React from "react";
import { Image, View, Text } from "react-native";
import { assets } from "../content/assets";
export function BookImage({
  id,
  maxHeight = 310,
}: {
  id: string;
  maxHeight?: number;
}) {
  const count = /abacus_(\d+)$/.exec(id);
  if (count) {
    const n = Number(count[1]);
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel="Карточка с жетонами для счёта"
        testID="modern-counting-card"
        style={{
          alignSelf: "center",
          padding: 16,
          borderRadius: 16,
          backgroundColor: "#edf4fc",
          maxWidth: 360,
          width: "100%",
          gap: 8,
        }}
      >
        <Text style={{ color: "#2563a6" }}>Посчитай жетоны</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: Math.ceil(n / 5) * 5 }, (_, i) => (
            <View
              key={i}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#aac5e1",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i < n && (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#1565c0",
                  }}
                />
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }
  const a = assets[id];
  if (!a) return null;
  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Image
        accessibilityLabel={a.alt}
        source={a.source}
        resizeMode="contain"
        style={{
          width: "100%",
          aspectRatio: a.width / a.height,
          maxHeight,
          borderRadius: 8,
        }}
      />
    </View>
  );
}
