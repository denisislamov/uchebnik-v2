import { test } from "node:test";
import assert from "node:assert/strict";
import { allBlocks } from "../src/content/book.ts";
import { isCorrect } from "../src/lib/assessment.ts";
import {
  confirmNumberGameRound,
  numberGameCorrect,
  numberGameRoundCorrect,
  setNumberGameResponse,
} from "../src/lib/numberGame.ts";
import type { NumberGameSpec } from "../src/content/numberGameTypes.ts";
import type { Answer } from "../src/content/types.ts";

const guess: NumberGameSpec = {
  numberGame: {
    mode: "guess",
    rounds: [
      { id: "source", label: "Загадка из учебника", visible: 4, total: 6 },
      { id: "play", label: "Теперь сыграй", visible: 3, total: 8 },
    ],
  },
};
const read: NumberGameSpec = {
  numberGame: {
    mode: "readNumbers",
    items: [
      {
        id: "n13",
        value: 13,
        expected: "тринадцать",
        options: ["тринадцать", "пятнадцать", "двадцать"],
      },
      {
        id: "n15",
        value: 15,
        expected: "пятнадцать",
        options: ["тринадцать", "пятнадцать", "двадцать"],
      },
      {
        id: "n16",
        value: 16,
        expected: "шестнадцать",
        options: ["шестнадцать", "девятнадцать", "тринадцать"],
      },
      {
        id: "n19",
        value: 19,
        expected: "девятнадцать",
        options: ["шестнадцать", "девятнадцать", "тринадцать"],
      },
      {
        id: "n20",
        value: 20,
        expected: "двадцать",
        options: ["двадцать", "девятнадцать", "пятнадцать"],
      },
    ],
  },
};

test("hidden card validation uses the round equation and rejects the printed total", () => {
  const round = { id: "source", label: "Исходный раунд", visible: 4, total: 6 };
  assert.equal(numberGameRoundCorrect(round, "2"), true);
  for (const value of ["6", "", " ", "2.0", "2abc", "-2", "1+1"])
    assert.equal(numberGameRoundCorrect(round, value), false, value);
  assert.equal(
    numberGameRoundCorrect({ ...round, visible: 2, total: 9 }, "7"),
    true,
  );
  assert.equal(
    numberGameRoundCorrect({ ...round, visible: 2, total: 9 }, "2"),
    false,
  );
});

test("199 requires the source answer and a confirmed extra round, including after serialization", () => {
  let answer: Answer = {};
  assert.equal(numberGameCorrect(guess, answer), false);
  answer = setNumberGameResponse(guess, answer, "source", "2");
  assert.equal(numberGameCorrect(guess, answer), false);
  answer = confirmNumberGameRound(guess, answer, "source");
  assert.equal(numberGameCorrect(guess, answer), false);
  answer = setNumberGameResponse(guess, answer, "play", "5");
  assert.equal(numberGameCorrect(guess, answer), false);
  answer = confirmNumberGameRound(guess, answer, "play");
  assert.equal(numberGameCorrect(guess, answer), true);
  assert.equal(
    numberGameCorrect(guess, JSON.parse(JSON.stringify(answer))),
    true,
  );
  const edited = setNumberGameResponse(guess, answer, "source", "3");
  assert.equal(edited.responses?.["source:confirmed"], undefined);
  assert.equal(edited.responses?.["play:confirmed"], undefined);
  assert.equal(edited.responses?.play, undefined);
  assert.equal(numberGameCorrect(guess, edited), false);
});

test("confirmation cannot bypass the original round or certify a wrong hidden number", () => {
  const premature = confirmNumberGameRound(
    guess,
    { responses: { play: "5" } },
    "play",
  );
  assert.equal(premature.responses?.["play:confirmed"], undefined);
  const wrong = confirmNumberGameRound(
    guess,
    { responses: { source: "6" } },
    "source",
  );
  assert.equal(wrong.responses?.["source:confirmed"], undefined);
  assert.equal(
    numberGameCorrect(guess, {
      responses: {
        source: "6",
        "source:confirmed": "yes",
        play: "5",
        "play:confirmed": "yes",
      },
    }),
    false,
  );
});

test("208 accepts all five number names and rejects missing, swapped, or dictated digit answers", () => {
  const responses = {
    n13: "тринадцать",
    n15: "пятнадцать",
    n16: "шестнадцать",
    n19: "девятнадцать",
    n20: "двадцать",
  };
  assert.equal(numberGameCorrect(read, { responses }), true);
  for (const id of Object.keys(responses)) {
    assert.equal(
      numberGameCorrect(read, { responses: { ...responses, [id]: "" } }),
      false,
    );
  }
  assert.equal(
    numberGameCorrect(read, {
      responses: { ...responses, n13: "пятнадцать", n15: "тринадцать" },
    }),
    false,
  );
  assert.equal(
    numberGameCorrect(read, {
      responses: { n13: "13", n15: "15", n16: "16", n19: "19", n20: "20" },
    }),
    false,
  );
  assert.equal(
    numberGameCorrect(read, JSON.parse(JSON.stringify({ responses }))),
    true,
  );
});

test("199 keeps 4 plus a hidden card equals 6, followed by an actual extra game round", () => {
  const block: any = allBlocks.find((b) => b.exerciseNumber === 199)!;
  assert.equal(block.kind, "numberGame");
  assert.equal(block.numberGame.mode, "guess");
  assert.deepEqual(
    block.numberGame.rounds.map((r: any) => [r.visible, r.total]),
    [
      [4, 6],
      [3, 8],
    ],
  );
  assert.equal(
    isCorrect(block, { responses: { source: "2", "source:confirmed": "yes" } }),
    false,
  );
  assert.equal(
    isCorrect(block, {
      responses: {
        source: "2",
        "source:confirmed": "yes",
        play: "5",
        "play:confirmed": "yes",
      },
    }),
    true,
  );
});

test("208 reads every printed digit as a word, preserving source order", () => {
  const block: any = allBlocks.find((b) => b.exerciseNumber === 208)!;
  assert.equal(block.kind, "numberGame");
  assert.equal(block.numberGame.mode, "readNumbers");
  assert.deepEqual(
    block.numberGame.items.map((r: any) => [r.value, r.expected]),
    [
      [13, "тринадцать"],
      [15, "пятнадцать"],
      [16, "шестнадцать"],
      [19, "девятнадцать"],
      [20, "двадцать"],
    ],
  );
  assert.equal(
    isCorrect(block, {
      responses: {
        n13: "тринадцать",
        n15: "пятнадцать",
        n16: "шестнадцать",
        n19: "девятнадцать",
        n20: "двадцать",
      },
    }),
    true,
  );
  assert.equal(
    isCorrect(block, {
      responses: { n13: "13", n15: "15", n16: "16", n19: "19", n20: "20" },
    }),
    false,
  );
});
