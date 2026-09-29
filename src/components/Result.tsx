import React, { createContext, useContext } from "react";
import { StyleSheet, View } from "react-native";
import { CELL } from "../lib/grid";
import { useTaskSize } from "./taskSize";

/**
 * What a task answers with — «верно» or where to look again. It has a place
 * kept for it from the start, so the words appear in view and move nothing.
 */
export const ResultContext = createContext<React.ReactNode>(null);
/**
 * The question in hand: the one the child has put the cursor into, or the
 * first not yet answered. The picture shows what it asks about.
 */
export const FieldInHand = createContext<((id: string) => void) | null>(null);
/**
 * The button that checks the work, and what the check says. On a wide screen
 * they share a row: the words stand beside the button and take no rows of
 * their own. On a phone they stand under it, in two rows kept for them.
 * `note` is what the button's own check says, where it is not the task's.
 */
export function CheckRow({
  children,
  note,
}: {
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  const result = useContext(ResultContext);
  const { compact } = useTaskSize();
  return (
    <View testID="check-row" style={compact ? s.under : s.beside}>
      {children}
      <View testID="task-result" style={[s.words, !compact && s.wordsBeside]}>
        {note ?? result}
      </View>
    </View>
  );
}
/** The place for the words of a task that has no button to check it. */
export function ResultRows({ children }: { children?: React.ReactNode }) {
  const result = useContext(ResultContext);
  return (
    <View testID="task-result" style={s.words}>
      {children ?? result}
    </View>
  );
}
const s = StyleSheet.create({
  under: { gap: CELL },
  beside: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: CELL,
    rowGap: CELL / 2,
  },
  // Two rows of the sheet, there from the start.
  words: { minHeight: CELL * 2 },
  wordsBeside: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: CELL * 8,
    justifyContent: "center",
  },
});
