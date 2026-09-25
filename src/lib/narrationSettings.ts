import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "uchebnik:narration:v1";
/** Tasks are read aloud when opened unless a parent turned it off. */
export async function readAutoNarration(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) !== "off";
  } catch {
    return true;
  }
}
export function writeAutoNarration(on: boolean): Promise<void> {
  return AsyncStorage.setItem(KEY, on ? "on" : "off").catch(() => {});
}
