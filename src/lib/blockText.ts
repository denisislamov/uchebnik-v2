import type { Block } from "../content/types.ts";
const normalize = (text: string) =>
  text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!:]+$/, "")
    .toLowerCase();
/** 120 generated blocks repeat their heading as the task; the screen shows it once. */
export const promptRepeatsTitle = (block: Block) =>
  block.kind !== "read" && normalize(block.prompt) === normalize(block.title);
