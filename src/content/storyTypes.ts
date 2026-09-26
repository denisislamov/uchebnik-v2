export type StoryOperator = "+" | "−" | "×" | ":";
export type StoryOperand = number | { input: string } | { result: string };
export type StoryInput = {
  id: string;
  label: string;
  min?: number;
  max?: number;
};
export type StoryStep = {
  id: string;
  question: string;
  operator: StoryOperator;
  left: StoryOperand;
  right: StoryOperand;
};
export type StoryVariant = {
  unit?: string;
  id: string;
  label: string;
  description: string;
  inputs?: StoryInput[];
  steps: StoryStep[];
};
export type StorySpec = {
  story: {
    requiredVariants?: boolean;
    unit: string;
    max: number;
    operationChoices?: StoryOperator[];
    inputs?: StoryInput[];
    variants: StoryVariant[];
  };
};
