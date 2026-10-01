import { Image } from "react-native";
import { SvgXml } from "react-native-svg";
import type { BookArt } from "../content/assetSet";

/** The same illustration in a task, meaning card, and coach demonstration. */
export function BookArtwork({
  art,
  width,
  height,
  resizeMode = "contain",
  accessible = false,
  accessibilityLabel,
  borderRadius = 0,
}: {
  art: BookArt;
  width: number | "100%";
  height: number | "100%";
  resizeMode?: "contain" | "stretch";
  accessible?: boolean;
  accessibilityLabel?: string;
  borderRadius?: number;
}) {
  if ("xml" in art)
    return (
      <SvgXml
        xml={art.xml}
        width={width}
        height={height}
        preserveAspectRatio={
          resizeMode === "stretch" ? "none" : "xMidYMid meet"
        }
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
        style={{ borderRadius, overflow: "hidden" }}
      />
    );
  return (
    <Image
      source={art.source}
      resizeMode={resizeMode}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={{ width, height, borderRadius }}
    />
  );
}
