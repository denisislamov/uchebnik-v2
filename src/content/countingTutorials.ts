/** Source-image regions for the first counting and one-to-one placement lessons. */
import { originalIllustrations } from "./illustrationMode.ts";

export type CountingTutorialObject = {
  id: string;
  label: string;
  /** Top-left and size, normalized to the selected image (not its view/container). */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CountingTutorialScene = {
  imageId: string;
  objects: CountingTutorialObject[];
};

// Manually checked against both the original PNG and the displayed 810 × 615 JPG.
// See docs/counting-tutorial-source-qa.md and its numbered SVG overlays.
const region = (
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
): CountingTutorialObject => ({
  id,
  label,
  x: x / 810,
  y: y / 615,
  w: w / 810,
  h: h / 615,
});

const originalChildren = [
  region("child-tree", "Мальчик у дерева", 199, 176, 80, 146),
  region("child-boat-standing", "Мальчик с лодочкой стоит", 374, 236, 92, 168),
  region(
    "child-boat-kneeling",
    "Мальчик с лодочкой присел",
    426,
    297,
    109,
    106,
  ),
  region("child-front-left", "Слева в воде, с цветком", 71, 382, 134, 143),
  region(
    "child-front-middle",
    "Посередине на переднем плане",
    165,
    387,
    149,
    151,
  ),
  region("child-front-right", "Справа на переднем плане", 288, 406, 145, 144),
  region(
    "child-swimmer-back-left",
    "Пловец в дальнем ряду слева",
    604,
    315,
    86,
    43,
  ),
  region(
    "child-swimmer-back-right",
    "Пловец в дальнем ряду справа",
    695,
    312,
    64,
    37,
  ),
  region(
    "child-swimmer-middle-right",
    "Пловец у правого края",
    720,
    343,
    69,
    43,
  ),
  region("child-swimmer-front", "Ближний пловец справа", 628, 375, 152, 65),
];

// Crowns overlap; highlight the five distinct trunks to identify each tree once.
const originalTrees = [
  region("tree-left-edge", "Первое дерево слева", 61, 119, 69, 175),
  region(
    "tree-left-leaning",
    "Наклонённое дерево у мальчика",
    239,
    80,
    150,
    227,
  ),
  region(
    "tree-right-left",
    "Первое дерево на правом берегу",
    516,
    144,
    95,
    121,
  ),
  region(
    "tree-right-middle",
    "Среднее дерево на правом берегу",
    624,
    130,
    108,
    141,
  ),
  region("tree-right-edge", "Дерево у правого края", 732, 105, 57, 171),
];

const originalBoat = [
  region("boat", "Игрушечная парусная лодочка", 474, 258, 95, 158),
];

// Checked on the 1448 × 1086 painted scene. Trees are marked by their
// separate trunks because their crowns touch. The swimming children each get
// a distinct region, even where water hides their lower bodies.
const revisedRegion = (
  id: string,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
): CountingTutorialObject => ({
  id,
  label,
  x: x / 1448,
  y: y / 1086,
  w: w / 1448,
  h: h / 1086,
});

const revisedChildren = [
  revisedRegion("child-tree", "Ребёнок у дерева", 190, 267, 100, 214),
  revisedRegion(
    "child-boat-standing",
    "Девочка у лодочки слева",
    494,
    409,
    137,
    194,
  ),
  revisedRegion(
    "child-boat-kneeling",
    "Мальчик у лодочки справа",
    610,
    440,
    145,
    173,
  ),
  revisedRegion("child-front-left", "Девочка слева в воде", 118, 606, 192, 222),
  revisedRegion(
    "child-front-middle",
    "Мальчик посередине на переднем плане",
    315,
    635,
    182,
    223,
  ),
  revisedRegion(
    "child-front-right",
    "Мальчик справа на переднем плане",
    484,
    670,
    238,
    208,
  ),
  revisedRegion(
    "child-swimmer-back-left",
    "Пловец в дальнем ряду слева",
    931,
    459,
    174,
    106,
  ),
  revisedRegion(
    "child-swimmer-back-right",
    "Пловец в дальнем ряду справа",
    1178,
    453,
    187,
    98,
  ),
  revisedRegion(
    "child-swimmer-middle-right",
    "Пловец справа посередине",
    1017,
    550,
    212,
    129,
  ),
  revisedRegion(
    "child-swimmer-front",
    "Ближний пловец справа",
    1226,
    578,
    214,
    130,
  ),
];

const revisedTrees = [
  revisedRegion("tree-left-edge", "Первое дерево слева", 108, 128, 126, 318),
  revisedRegion("tree-left-leaning", "Второе дерево слева", 445, 111, 149, 360),
  revisedRegion("tree-right-left", "Первое дерево справа", 1007, 197, 110, 196),
  revisedRegion(
    "tree-right-middle",
    "Среднее дерево справа",
    1156,
    190,
    109,
    207,
  ),
  revisedRegion(
    "tree-right-edge",
    "Дерево у правого края",
    1274,
    190,
    115,
    210,
  ),
];

const revisedBoat = [
  revisedRegion("boat", "Игрушечная парусная лодочка", 701, 507, 111, 114),
];

const scene = (objects: CountingTutorialObject[]): CountingTutorialScene => ({
  imageId: "p004_boys_river_bathing",
  objects,
});

export const countingTutorialsForMode = (
  useOriginal: boolean,
): Record<string, CountingTutorialScene> => {
  const children = useOriginal ? originalChildren : revisedChildren;
  const trees = useOriginal ? originalTrees : revisedTrees;
  const boat = useOriginal ? originalBoat : revisedBoat;
  return {
    "p004-block02": scene(children),
    "p004-block03": scene(trees),
    "p004-block04": scene(boat),
    "p004-block05": scene(trees),
    "p004-block06": scene(children),
  };
};

export const countingTutorials = countingTutorialsForMode(
  originalIllustrations,
);
