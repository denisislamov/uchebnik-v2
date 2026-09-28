import { StyleSheet } from "react-native";
import { colors as c, fonts as f } from "../theme";
import { CELL } from "../lib/grid";

/**
 * What is written on the sheet in every task: a line of text takes a row of
 * cells, a box for an answer four cells by two.
 */
export const sheet = StyleSheet.create({
  /** A question or a step: bold, one row a line. */
  question: {
    fontFamily: f.bold,
    fontSize: 19,
    lineHeight: CELL,
    color: c.ink,
  },
  /** A remark in pencil. */
  remark: {
    fontFamily: f.regular,
    fontSize: 14,
    lineHeight: CELL,
    color: c.muted,
  },
  /** A count or a state, in pen. */
  count: {
    fontFamily: f.bold,
    fontSize: 14,
    lineHeight: CELL,
    color: c.ink,
  },
  /** The box for a number: four cells by two. */
  answer: {
    backgroundColor: c.white,
    borderWidth: 2,
    borderColor: c.pen,
    borderRadius: 4,
    width: CELL * 4,
    height: CELL * 2,
    paddingVertical: 0,
    textAlign: "center",
    fontFamily: f.bold,
    fontSize: 26,
    color: c.ink,
  },
  /** Buttons and chips in a row stand a cell apart. */
  chips: { flexDirection: "row", flexWrap: "wrap", gap: CELL },
  /** A row with a count and a button: two cells. */
  // A count and its button share a row of two cells, with half a cell of
  // air above and below: the words stand in the middle of the button's
  // height, on a line of the sheet, and nothing touches the board above.
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: CELL * 2,
    paddingVertical: CELL / 2,
    columnGap: CELL,
    rowGap: CELL,
    // In a narrow column the button goes under the words.
    flexWrap: "wrap",
  },
});
