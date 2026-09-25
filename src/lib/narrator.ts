import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { Narrator, type NarrationBackend } from "./narration.ts";
import { audioManifest } from "../content/audioManifest.ts";
let playing: HTMLAudioElement | null = null;
const backend: NarrationBackend = {
  speak(text, onDone, onError) {
    Speech.speak(text, {
      language: "ru-RU",
      rate: 0.9,
      onDone,
      onStopped: onDone,
      onError,
    });
  },
  // Recordings play in the browser; native playback waits for an audio module.
  play(url, onDone, onError) {
    if (Platform.OS !== "web" || typeof Audio === "undefined") return false;
    const audio = new Audio(url);
    playing = audio;
    audio.onended = () => {
      if (playing === audio) playing = null;
      onDone();
    };
    audio.onerror = () => {
      if (playing === audio) playing = null;
      onError();
    };
    audio.play().catch(onError);
    return true;
  },
  stop() {
    void Speech.stop();
    if (playing) {
      playing.pause();
      playing = null;
    }
  },
};
/** The single voice of the app: tasks, questions and coaching all go through it. */
export const narrator = new Narrator(backend, audioManifest, "audio/");
