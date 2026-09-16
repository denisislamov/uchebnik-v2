# Source evidence for the first counting tutorials

The regions in `src/content/countingTutorials.ts` were visually checked against
both `textbook/images/p004_boys_river_bathing.png` and the displayed
`assets/book/p004_boys_river_bathing.jpg` (810 × 615). Neither source image was
edited. Coordinates are normalized **top-left x/y and width/height** relative to
the image itself, excluding view padding or letterboxing.

Open [the numbered overlay](counting-tutorial-source-qa.html) to inspect every
region. Regenerate it after coordinate edits:

```sh
node --experimental-strip-types scripts/counting-tutorial-qa.ts
node --experimental-strip-types --test tests/counting-tutorials.test.ts
```

## Children: 10

There is one boy standing by the left leaning tree, two boys handling the toy
boat, three boys in the foreground water, and four swimming at the right.
The dog and reflections are excluded. The four swimmers are easiest to verify
by their distinct heads at these original-image pixel coordinates:

| Tutorial number | Visible child | Head (x, y) |
| --- | --- | --- |
| 7 | Back row, left swimmer with arm extending left | 662, 330 |
| 8 | Back row, right swimmer with arm extending right | 714, 328 |
| 9 | Middle row, swimmer nearest the right edge | 745, 357 |
| 10 | Front swimmer on the right, arm extending left | 698, 396 |

Each head falls in exactly one swimmer region. The small landscape details on
the distant bank are not counted as extra children. The count agrees with the
page-4 source description and existing lesson answer; no answer was changed.

## Trees: 5; boat: 1

Two separate tree trunks are on the left and three on the right bank. Crowns
overlap, so the tutorial highlights each distinct trunk, including the leaning
trunk next to the standing boy. The single toy boat is identified by its sail
and red hull; the adjacent boys are separate counting objects.

## Lesson coverage

`p004-block02` counts children, `p004-block03` counts trees, and `p004-block04`
counts the boat. The first placement lessons reuse the same regions and order:
`p004-block05` pairs five trees with sticks and `p004-block06` pairs ten children
with circles. Automated checks verify source counts, current block image and
answer, unique IDs, finite in-bounds regions, and the four swimmer heads.

This artifact verifies source annotations only. Browser playback and physical
device acceptance belong to the tutorial integration checks.
