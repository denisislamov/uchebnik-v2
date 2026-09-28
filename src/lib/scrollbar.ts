import { Platform } from "react-native";

let measured: number | undefined;
/**
 * How much of a scrolling pane's width its scrollbar takes: nothing where
 * scrollbars lie over the page (phones, a Mac with a trackpad), some fifteen
 * pixels where they stand beside it. Known beforehand, the sheet's width is
 * reckoned from the window's instead of being measured a frame late.
 */
export function scrollbarGutter() {
  if (Platform.OS !== "web" || typeof document === "undefined") return 0;
  if (measured === undefined) {
    const probe = document.createElement("div");
    probe.style.cssText =
      // The same way the lesson's pane keeps room for its scrollbar.
      "position:absolute;top:-999px;width:100px;height:100px;overflow-y:auto;scrollbar-gutter:stable";
    document.body.appendChild(probe);
    measured = probe.offsetWidth - probe.clientWidth;
    probe.remove();
  }
  return measured;
}
