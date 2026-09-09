import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Progress } from "../content/types";
export const STORAGE_KEY = "uchebnik:pchelko-1959:pages-001-010:v1";
// Serialize writes so an older answer can never overwrite a newer snapshot.
let queue: Promise<void> = Promise.resolve();
export const readProgress = () => AsyncStorage.getItem(STORAGE_KEY);
export function saveProgress(progress: Progress): Promise<void> {
  const snapshot = JSON.stringify(progress);
  queue = queue
    .catch(() => {})
    .then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot));
  return queue;
}
