import test from "node:test";
import assert from "node:assert/strict";
import {
  Narrator,
  phraseKey,
  type NarrationBackend,
} from "../src/lib/narration.ts";

function fakeBackend() {
  const log: string[] = [];
  let pending: (() => void) | null = null;
  const backend: NarrationBackend & { finish(): void; log: string[] } = {
    log,
    speak(text, onDone) {
      log.push(`speak:${text}`);
      pending = onDone;
    },
    play(url, onDone) {
      if (url.endsWith("missing.mp3")) return false;
      log.push(`play:${url}`);
      pending = onDone;
      return true;
    },
    stop() {
      log.push("stop");
      pending = null;
    },
    finish() {
      const done = pending;
      pending = null;
      done?.();
    },
  };
  return backend;
}

test("lines play one after another in their spoken form", () => {
  const b = fakeBackend();
  const n = new Narrator(b);
  const states: string[] = [];
  n.subscribe((s) => states.push(`${s.speaking}:${s.line}`));
  n.say(["Число три", "", "2 + 1 = 3"]);
  assert.deepEqual(b.log, ["stop", "speak:Число три"]);
  b.finish();
  assert.equal(b.log.at(-1), "speak:два плюс один равно три");
  b.finish();
  assert.equal(n.state.speaking, false);
  assert.deepEqual(states, ["true:Число три", "true:2 + 1 = 3", "false:null"]);
});

test("a new task interrupts the old narration and a late callback is ignored", () => {
  const b = fakeBackend();
  const n = new Narrator(b);
  n.say(["первая", "вторая"]);
  n.say(["третья"]);
  b.finish();
  assert.ok(!b.log.includes("speak:вторая"));
  assert.equal(n.state.speaking, false);
});

test("a recorded phrase plays from the manifest, a missing file falls back to synthesis", () => {
  const b = fakeBackend();
  const manifest = {
    [phraseKey("Положи 5 кружков в ряд.")]: "a1.mp3",
    [phraseKey("нет файла")]: "missing.mp3",
  };
  const n = new Narrator(b, manifest, "/audio/");
  n.say(["Положи 5 кружков в ряд.", "нет файла"]);
  assert.equal(b.log.at(-1), "play:/audio/a1.mp3");
  b.finish();
  assert.equal(b.log.at(-1), "speak:нет файла");
});

test("phrase keys are stable and ignore surrounding whitespace", () => {
  assert.equal(phraseKey("  Число три "), phraseKey("Число три"));
  assert.match(phraseKey("Число три"), /^[0-9a-f]{8}$/);
});
