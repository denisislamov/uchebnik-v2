import type { StorySpec } from "./storyTypes";
import type { NumberGameSpec } from "./numberGameTypes";
export type Point = { x: number; y: number };
/** `cellPx` records how large a grid cell was on the screen the stroke was drawn on. */
export type Stroke = { color: string; points: Point[]; cellPx?: number };
export type Hotspot = {
  id: string;
  image: number;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  polygon?: Point[];
  ellipse?: boolean;
};
export type TraceTarget = {
  label: string;
  color: string;
  points: Point[];
  dot?: boolean;
  bidirectional?: boolean;
  grid?: boolean;
};
export type TracePlan = {
  columns: number;
  rows: number;
  stages: TraceTarget[][];
};
export type WorkField = {
  id: string;
  label: string;
  expected: string;
  options?: string[];
};
export type ComposeRule = {
  operator: string;
  left?: number;
  right?: number;
  result?: number;
  max: number;
};
export type Activity = {
  exchange?: boolean;
  objectLabel?: string;
  groupLabels?: string[];
  fixedParts?: number[];
  partColors?: ["green" | "red", "green" | "red"];
  /** Positions in cell units, in source color order; omitted for a free strip. */
  compositionPattern?: [number, number][];
  token?: "circle" | "stick" | "square";
  slots?: Point[];
  differentFrom?: number[];
  board?: "hundred" | "pages";
  measure?: boolean;
  mode:
    | "count"
    | "coins"
    | "groups"
    | "ruler"
    | "balance"
    | "liquid"
    | "place"
    | "sequence"
    | "composition";
  targets: number[];
  groups?: number;
  denominations?: number[];
  unit?: string;
  labels?: string[];
};
export type PracticalStep = {
  id: string;
  instruction: string;
  mode: "place" | "draw" | "construct" | "cards";
  token?: "circle" | "stick" | "square";
  counts: number[];
  initialCounts?: number[];
  carryFrom?: string;
  tokenValue?: number;
  groupValues?: number[];
  groupLabels?: string[];
  objectLabel?: string;
  unit?: string;
  shape?: "triangle" | "square";
  grid?: { columns: number; rows: number };
  lengths?: number[];
  divisions?: number;
  cutAt?: number;
  chooseCounts?: number[];
  chooseLengths?: number[];
};
export type PracticalState = {
  choices?: Record<string, number>;
  counts?: number[];
  strokes?: Stroke[];
  edges?: string[];
  confirmed?: boolean;
};
type Base = {
  exerciseNumber?: number | null;
  id: string;
  title: string;
  prompt: string;
  sourceText?: string;
  images: string[];
  hint?: string;
  adaptation?: boolean;
};
export type Block = Base &
  (
    | { kind: "read"; body: string }
    | { kind: "targetGame" }
    | {
        kind: "recipe";
        formula: string;
        max: number;
        minResult?: number;
        context?: string;
        unit?: string;
        excludedInputs?: Record<string, number>;
        inputLabels?: Record<string, string>;
      }
    | { kind: "relation"; difference: number }
    | { kind: "work"; fields: WorkField[]; flavor?: string }
    | { kind: "practical"; steps: PracticalStep[]; fields: WorkField[] }
    | ({ kind: "story" } & StorySpec)
    | ({ kind: "numberGame" } & NumberGameSpec)
    | { kind: "compose"; rules: ComposeRule[]; story?: boolean }
    | { kind: "activity"; activity: Activity }
    | { kind: "number"; expected: number }
    | {
        kind: "location";
        location: {
          vertical: "Вверху" | "Внизу";
          horizontal: "Слева" | "Справа";
        };
        verticalPrompt: string;
        horizontalPrompt: string;
      }
    | { kind: "choice"; options: string[]; expected: string }
    | {
        kind: "counters";
        expected?: number;
        token: "stick" | "circle";
        review?: string;
      }
    | { kind: "draw"; guide?: string; rubric: string; trace?: TracePlan }
    | {
        kind: "picture";
        targets: Hotspot[];
        expected: string[];
        quantityMeaning?: { number: number; conclusion: string };
      }
    | { kind: "shape"; vertices: Point[]; edges: [number, number][] }
  );
export type BookPage = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  hero: string;
  blocks: Block[];
  sourceDoc: string;
};
export type Answer = {
  practical?: Record<string, PracticalState>;
  value?: string | number | string[];
  responses?: Record<string, string>;
  strokes?: Stroke[];
  reviewed?: boolean;
  attempts?: number;
  checked?: boolean;
};
export type Progress = {
  contentRevision?: number;
  version: 1;
  page: number;
  block: number;
  answers: Record<string, Answer>;
};
