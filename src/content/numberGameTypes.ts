export type HiddenCardRound = {
  id: string;
  label: string;
  visible: number;
  total: number;
};

export type NumberNameItem = {
  id: string;
  value: number;
  expected: string;
  options: string[];
};

export type NumberGameSpec = {
  numberGame:
    | { mode: "guess"; rounds: HiddenCardRound[] }
    | { mode: "readNumbers"; items: NumberNameItem[] };
};
