import { useWindowDimensions } from "react-native";
const clamp = (v: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, v)));
/**
 * How much of the screen a task's illustration may take. Fixed pixel caps made
 * pictures tiny on a big monitor and still pushed the answer off a phone
 * screen; tied to the window height, the picture and the place to answer stay
 * within one view on both. On wide screens the budget is what is left after
 * the lesson header, the prompt and the step buttons.
 */
export function useTaskSize() {
  const { width, height } = useWindowDimensions();
  const compact = width < 600,
    wide = width >= 1000;
  return {
    compact,
    wide,
    /** Illustration next to something to answer. */
    picture: compact
      ? clamp(height * 0.3, 170, 280)
      : clamp(height - 560, 270, 600),
    /** Illustration of a step that is only looked at. */
    read: compact
      ? clamp(height * 0.4, 220, 360)
      : clamp(height - 460, 340, 700),
    /** Picture that is itself the answer: it gets the most room. */
    target: compact
      ? clamp(height * 0.42, 240, 420)
      : clamp(height - 580, 300, 680),
  };
}
