import { spokenForm } from "./spoken.ts";
/**
 * One narrator for the whole app: a queue of lines, one voice at a time,
 * stopped whenever the task changes. A line plays from a pre-recorded file
 * when the manifest has one, otherwise it is synthesized from its spoken form.
 */
export type NarrationBackend = {
  /** Synthesize `text`; call exactly one of the callbacks when finished. */
  speak(text: string, onDone: () => void, onError: () => void): void;
  /** Play a recorded file; resolve false when playback is unavailable. */
  play?(url: string, onDone: () => void, onError: () => void): boolean;
  stop(): void;
};
export type AudioManifest = Record<string, string>;
export type NarrationState = {
  speaking: boolean;
  line: string | null;
  /** Synthesis failed for the last line (no voice, permission, …). */
  error?: boolean;
};
type Listener = (state: NarrationState) => void;
/** djb2 of the printed text: the key under which its recording is stored. */
export function phraseKey(text: string): string {
  let h = 5381;
  for (const ch of text.trim()) h = ((h << 5) + h + ch.codePointAt(0)!) >>> 0;
  return h.toString(16).padStart(8, "0");
}
export class Narrator {
  private queue: string[] = [];
  private token = 0;
  private listeners = new Set<Listener>();
  state: NarrationState = { speaking: false, line: null };
  private backend: NarrationBackend;
  private manifest: AudioManifest;
  private baseUrl: string;
  // Explicit fields: Node's type stripping cannot rewrite parameter properties.
  constructor(
    backend: NarrationBackend,
    manifest: AudioManifest = {},
    baseUrl = "",
  ) {
    this.backend = backend;
    this.manifest = manifest;
    this.baseUrl = baseUrl;
  }
  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private set(state: NarrationState) {
    this.state = state;
    for (const l of this.listeners) l(state);
  }
  /** Replace whatever is playing with these lines, in order. Empty lines are skipped. */
  say(lines: string[]) {
    this.stop();
    this.queue = lines.map((l) => l.trim()).filter(Boolean);
    this.next();
  }
  stop() {
    this.token++;
    this.queue = [];
    this.backend.stop();
    if (this.state.speaking) this.set({ speaking: false, line: null });
  }
  private next() {
    const line = this.queue.shift();
    if (line === undefined) {
      this.set({ speaking: false, line: null });
      return;
    }
    const token = ++this.token;
    this.set({ speaking: true, line });
    const advance = () => {
      if (token === this.token) this.next();
    };
    const failed = () => {
      if (token !== this.token) return;
      this.set({ speaking: false, line: null, error: true });
      this.queue = [];
    };
    const recorded = this.manifest[phraseKey(line)];
    const played =
      recorded && this.backend.play
        ? this.backend.play(this.baseUrl + recorded, advance, () =>
            this.backend.speak(spokenForm(line), advance, failed),
          )
        : false;
    if (!played) this.backend.speak(spokenForm(line), advance, failed);
  }
}
