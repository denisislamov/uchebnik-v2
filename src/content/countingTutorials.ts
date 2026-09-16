/** Source-image regions for the first counting and one-to-one placement lessons. */
export type CountingTutorialObject = {
  id: string;
  label: string;
  /** Top-left and size, normalized to the original image (not its view/container). */
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

const children = [
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
const trees = [
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

const boat = [region("boat", "Игрушечная парусная лодочка", 474, 258, 95, 158)];

const scene = (objects: CountingTutorialObject[]): CountingTutorialScene => ({
  imageId: "p004_boys_river_bathing",
  objects,
});

export const countingTutorials: Record<string, CountingTutorialScene> = {
  "p004-block02": scene(children),
  "p004-block03": scene(trees),
  "p004-block04": scene(boat),
  "p004-block05": scene(trees),
  "p004-block06": scene(children),
};
