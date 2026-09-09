export type Point = { x: number; y: number };
export type Stroke = { color: string; points: Point[] };
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
    | { kind: "recipe"; formula: string; max: number }
    | { kind: "relation"; difference: number }
    | { kind: "work"; fields: WorkField[]; flavor?: string }
    | { kind: "compose"; rules: ComposeRule[]; story?: boolean }
    | { kind: "activity"; activity: Activity }
    | { kind: "number"; expected: number }
    | { kind: "choice"; options: string[]; expected: string }
    | {
        kind: "counters";
        expected?: number;
        token: "stick" | "circle";
        review?: string;
      }
    | { kind: "draw"; guide?: string; rubric: string; trace?: TracePlan }
    | { kind: "picture"; targets: Hotspot[]; expected: string[] }
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
  value?: string | number | string[];
  responses?: Record<string, string>;
  strokes?: Stroke[];
  reviewed?: boolean;
  attempts?: number;
  checked?: boolean;
};
export type Progress = {
  version: 1;
  page: number;
  block: number;
  answers: Record<string, Answer>;
};
