import test from "node:test";
import assert from "node:assert/strict";
import { fitLook, LEAST, MOST, startFit, type Fit } from "../src/lib/fit.ts";

/** A task laid out by `height(extra)`, looked at until it is shown. */
function settle(height: (extra: number) => number, pane: number, looks = 8) {
  let fit: Fit = startFit(),
    shown = false,
    n = 0;
  const seen: number[] = [];
  while (!shown && n <= looks) {
    const bottom = height(fit.extra);
    seen.push(bottom);
    const next = fitLook(fit, bottom, pane, looks - n);
    fit = next.fit;
    shown = next.show;
    assert.equal(next.again, !next.show, "looks again until it is shown");
    n++;
  }
  return { fit, shown, looks: n, bottom: height(fit.extra), seen };
}

test("a picture that takes all it is given fits in two looks", () => {
  const { fit, shown, looks, bottom } = settle((extra) => 400 + extra, 720);
  assert.ok(shown);
  assert.equal(fit.extra, 288);
  assert.equal(bottom, 688);
  assert.ok(720 - bottom - 24 < 24, "less than a row is left under the task");
  assert.ok(looks <= 3);
});

test("an overflow is taken back in whole rows", () => {
  const { fit, bottom } = settle((extra) => 760 + extra, 720);
  assert.equal(Math.abs(fit.extra % 24), 0);
  assert.ok(bottom <= 720 - 24 + 6, `the task ends at ${bottom}`);
});

test("a board at its largest size answers once enough is taken back", () => {
  // It grows with the room up to 420 px and no further.
  const board = (extra: number) =>
    500 + Math.min(420, 216 + Math.max(0, extra));
  const { shown, bottom } = settle(board, 800, 10);
  assert.ok(shown);
  assert.ok(bottom <= 800 - 24 + 6, `the board ends at ${bottom} of 800`);
  assert.ok(bottom >= 800 - 24 - 24 * 3, "and leaves no more than a few rows");
});

test("a list of questions longer than the window is shown as it is", () => {
  const { fit, shown, looks } = settle(() => 1500, 720);
  assert.ok(shown);
  assert.equal(
    fit.extra,
    LEAST,
    "everything was taken back and nothing gave way",
  );
  assert.ok(looks <= 6, `shown after ${looks} looks`);
});

test("room that nothing takes does not keep the task waiting", () => {
  const { fit, shown, looks } = settle(() => 300, 720);
  assert.ok(shown);
  assert.ok(looks <= 5, `shown after ${looks} looks`);
  assert.ok(fit.extra <= MOST);
});

test("a task is not shown while it is still finding its size", () => {
  // It fits at the first look but has not stood still yet.
  const first = fitLook(startFit(), 690, 720, 8);
  assert.equal(first.show, false);
  assert.equal(
    first.fit.extra,
    0,
    "nothing is handed over to a task that fits",
  );
  const second = fitLook(first.fit, 690, 720, 7);
  assert.equal(second.show, true);
});

test("the last look shows the task whatever it sees", () => {
  assert.equal(fitLook(startFit(), 300, 720, 0).show, true);
  assert.equal(fitLook(startFit(), 900, 720, 0).show, true);
});
