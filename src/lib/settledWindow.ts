import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

export type WindowSize = { width: number; height: number };
/** How long the window has to stand still before the sheet is laid out anew. */
export const SETTLE_MS = 140;
/**
 * The window the sheet is laid out for. While a window is being dragged to a
 * new size the sheet keeps the old one: laid out again at every step of the
 * drag, its text re-wrapped, its pictures were re-sized and its frames
 * re-drawn many times a second. It is laid out once, when the window stands
 * still.
 */
export const SettledWindow = createContext<WindowSize | null>(null);
/** A field is being typed into: a change of height is the keyboard's. */
const typing = () => {
  if (Platform.OS !== "web" || typeof document === "undefined") return false;
  const tag = document.activeElement?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA";
};
/** Whether the change is a phone's keyboard opening or closing, not the window. */
export const isKeyboard = (
  from: WindowSize,
  to: WindowSize,
  focused: boolean,
) => focused && from.width === to.width && to.height < from.height;
/**
 * For the root of the app: the size of the window once it stands still.
 *
 * A window that changes once — a phone turned on its side, a window
 * maximised — is followed at once. One that goes on changing is being
 * dragged: after its first step the sheet waits until it stands still.
 */
export function useSettledWindowSource(): WindowSize {
  const live = useWindowDimensions();
  const [held, setHeld] = useState<WindowSize>({
    width: live.width,
    height: live.height,
  });
  const changed = useRef(0);
  useEffect(() => {
    if (live.width === held.width && live.height === held.height) return;
    const next = { width: live.width, height: live.height };
    // The keyboard takes the lower part of the screen, not of the sheet: the
    // task stays as it was laid out, or it would shrink under the finger.
    if (isKeyboard(held, next, typing())) return;
    const now = Date.now(),
      still = now - changed.current > SETTLE_MS;
    changed.current = now;
    if (still) {
      setHeld(next);
      return;
    }
    const timer = setTimeout(() => setHeld(next), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [live.width, live.height, held.width, held.height]);
  return held;
}
/** For anything laid out on the sheet, in place of `useWindowDimensions`. */
export function useSheetWindow(): WindowSize {
  const held = useContext(SettledWindow);
  const live = useWindowDimensions();
  return held ?? live;
}
