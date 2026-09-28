import React, { useRef, useState } from "react";
import { useCoachAnchor } from "./GestureCoach";
import { Image, View } from "react-native";
import { assets } from "../content/assets";
import { CELL } from "../lib/grid";
import { colors as c } from "../theme";
/** How many times its own size a scan from the book may be shown. */
export const MAX_SCALE = 3;
const inRows = (height: number) => {
  const step = height < CELL * 4 ? CELL / 2 : CELL;
  return Math.max(step, Math.floor((height + 0.5) / step) * step);
};
export function BookImage({
  id,
  maxHeight = 310,
}: {
  id: string;
  maxHeight?: number;
}) {
  const frame = useRef<View>(null);
  // react-native-web gives an <Image> its file's height, not the aspect
  // ratio's; in a narrow column that left white bands above and below.
  const [frameWidth, setFrameWidth] = useState(0);
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
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          maxWidth: 360,
          width: "100%",
          gap: 8,
        }}
      >
        {/* No caption: «Посчитай жетоны» read as a task of its own next to
            the real one. The card is a picture, the task says what to count. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: n }, (_, i) => (
            <View
              key={i}
              style={{
                width: 40,
                height: 40,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: c.line,
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
  // A scan is enlarged no more than three times: beyond that it is a blur.
  maxHeight = Math.min(maxHeight, a.height * MAX_SCALE);
  return (
    <View
      ref={frame}
      testID={`book-image-${id}`}
      onLayout={(e) => setFrameWidth(e.nativeEvent.layout.width)}
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
          // A picture is as high as whole rows of the sheet allow (a low
          // strip, as half rows): the frame around it then stands on the
          // lines with nothing to spare.
          ...(frameWidth > 0 && {
            height: inRows(
              Math.min(maxHeight, (frameWidth * a.height) / a.width),
            ),
          }),
          borderRadius: 4,
        }}
      />
    </View>
  );
}
