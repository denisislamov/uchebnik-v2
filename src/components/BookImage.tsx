import React from "react";
import { Image, View } from "react-native";
import { assets } from "../content/assets";
export function BookImage({
  id,
  maxHeight = 310,
}: {
  id: string;
  maxHeight?: number;
}) {
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
