import React, { useRef, useState } from "react";
import { useCoachAnchor } from "./GestureCoach";
import { View } from "react-native";
import Svg, { Ellipse } from "react-native-svg";
import { assets } from "../content/assetSet";
import { BookArtwork } from "./BookArtwork";
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
  marks,
}: {
  id: string;
  maxHeight?: number;
  /**
   * What a question asks about, outlined on the picture: each outline is
   * the centre and the two radii as shares of the picture.
   */
  marks?: number[][];
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
  // Scans blur when enlarged; vector diagrams stay sharp at task size.
  if (!("xml" in a)) maxHeight = Math.min(maxHeight, a.height * MAX_SCALE);
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
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={a.alt}
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
      >
        <BookArtwork art={a} width="100%" height="100%" borderRadius={4} />
      </View>
      {!!marks?.length && (
        // Drawn in the picture's own pixels and scaled with it: a pen line
        // around each thing, and a lighter one under it, so that it is seen
        // on a dark ball as on a light one.
        <View
          testID="picture-marks"
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
        >
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${a.width} ${a.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {marks.map(([cx, cy, rx, ry], i) => (
              <React.Fragment key={i}>
                <Ellipse
                  cx={cx * a.width}
                  cy={cy * a.height}
                  rx={rx * a.width}
                  ry={ry * a.height}
                  fill="none"
                  stroke={c.white}
                  strokeWidth={a.width / 45}
                />
                <Ellipse
                  cx={cx * a.width}
                  cy={cy * a.height}
                  rx={rx * a.width}
                  ry={ry * a.height}
                  fill="none"
                  stroke={c.pen}
                  strokeWidth={a.width / 90}
                />
              </React.Fragment>
            ))}
          </Svg>
        </View>
      )}
    </View>
  );
}
