import { Platform } from "react-native";
export const colors = {
  paper: "#f7f4ec",
  card: "#fffdf7",
  ink: "#243e36",
  muted: "#65736b",
  green: "#23594e",
  mint: "#e4eee4",
  line: "#dedfd2",
  orange: "#ce6548",
  sand: "#f1e6cf",
  white: "#ffffff",
};
export const fonts = {
  regular: "Nunito_400Regular",
  bold: "Nunito_700Bold",
  heavy: "Nunito_800ExtraBold",
  serif: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia",
  }),
};
