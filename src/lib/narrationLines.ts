import type { Block } from "../content/types.ts";
import { promptRepeatsTitle } from "./blockText.ts";
/** Everything the narrator reads when a task opens: heading, task, then each question. */
export function narrationLines(block: Block): string[] {
  const lines = [block.title];
  if (block.kind === "read") lines.push(block.body);
  else if (!promptRepeatsTitle(block)) lines.push(block.prompt);
  if (block.kind === "work") lines.push(...block.fields.map((f) => f.label));
  return lines;
}
