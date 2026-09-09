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
};
export type TracePlan = {
  columns: number;
  rows: number;
  stages: TraceTarget[][];
};
type Base = {
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
