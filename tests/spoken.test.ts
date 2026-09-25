import test from "node:test";
import assert from "node:assert/strict";
import { numberToWords, plural, spokenForm } from "../src/lib/spoken.ts";

test("numerals 0–999 with gender", () => {
  assert.equal(numberToWords(0), "ноль");
  assert.equal(numberToWords(1), "один");
  assert.equal(numberToWords(1, "f"), "одна");
  assert.equal(numberToWords(2, "f"), "две");
  assert.equal(numberToWords(11), "одиннадцать");
  assert.equal(numberToWords(20), "двадцать");
  assert.equal(numberToWords(21, "f"), "двадцать одна");
  assert.equal(numberToWords(47), "сорок семь");
  assert.equal(numberToWords(100), "сто");
  assert.equal(numberToWords(112), "сто двенадцать");
  assert.equal(numberToWords(144), "сто сорок четыре");
});

test("counted nouns take the right ending", () => {
  assert.equal(plural(1, "кружок", "кружка", "кружков"), "кружок");
  assert.equal(plural(3, "кружок", "кружка", "кружков"), "кружка");
  assert.equal(plural(5, "кружок", "кружка", "кружков"), "кружков");
  assert.equal(plural(11, "кружок", "кружка", "кружков"), "кружков");
  assert.equal(plural(22, "кружок", "кружка", "кружков"), "кружка");
});

test("arithmetic is read as words, a blank as «сколько»", () => {
  assert.equal(spokenForm("2 + 1 = 3"), "два плюс один равно три");
  assert.equal(spokenForm("10 − 4 = 6"), "десять минус четыре равно шесть");
  assert.equal(spokenForm("3 × 2"), "три умножить на два");
  assert.equal(spokenForm("6 : 2 = 3"), "шесть разделить на два равно три");
  assert.equal(spokenForm("4 + □ = 6"), "четыре плюс сколько равно шесть");
  assert.equal(spokenForm("7 > 5"), "семь больше, чем пять");
});

test("units and genders in stories", () => {
  assert.equal(spokenForm("1 см"), "один сантиметр");
  assert.equal(spokenForm("2 см"), "два сантиметра");
  assert.equal(spokenForm("5 см"), "пять сантиметров");
  assert.equal(spokenForm("3 руб."), "три рубля");
  assert.equal(spokenForm("1 коп."), "одна копейка");
  assert.equal(
    spokenForm("2 мальчика и 1 девочка катаются"),
    "два мальчика и одна девочка катаются",
  );
  assert.equal(spokenForm("2 лыжи, 2 конька"), "две лыжи, два конька");
  assert.equal(spokenForm("1 яблоко и 2 груши"), "одно яблоко и две груши");
  assert.equal(
    spokenForm("Положи 5 кружков в ряд."),
    "Положи пять кружков в ряд.",
  );
});
