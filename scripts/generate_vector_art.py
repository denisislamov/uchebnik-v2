"""Generate approved vector book art and a Metro-safe XML registry.

The source crops supply the canvas dimensions; the hand-checked rows below
preserve the count and arrangement without copying scan noise or paper color.
"""

import json
from math import cos, pi, sin
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets/book2/vector"
REGISTRY = ROOT / "src/content/vectorAssets.ts"
BOOK_ASSETS = {
    asset["id"]: asset
    for asset in json.loads((ROOT / "textbook/data/assets.json").read_text())
}

PEN = "#2b4ba8"
GREEN = "#5d863d"
GREEN_EDGE = "#486537"
FRAME = "#6b7280"
TEACHER_RED = "#c8352e"
NOTEBOOK_GRID = "#c7dadd"
NOTEBOOK_INK = "#1f2433"
NOTEBOOK_TEAL = "#73a8a6"

# Coordinates are fractions of each crop's width/height, read from the source.
# An inner list is one visible row of separate countable dots.
DOMINO = {
    "p007_domino_1": [[0.15]],
    "p008_domino_2": [[0.15], [0.15]],
    "p010_domino_3": [[0.15, 0.31], [0.15]],
    "p012_domino_4": [[0.15, 0.31], [0.15, 0.31]],
    "p014_domino_5": [[0.15, 0.31, 0.50], [0.15, 0.31]],
    "p018_domino_6": [[0.15, 0.31, 0.52], [0.15, 0.31, 0.52]],
    "p022_domino_7": [[0.15, 0.31, 0.52, 0.69], [0.15, 0.31, 0.52]],
    "p024_domino_8": [[0.15, 0.31, 0.52, 0.69], [0.15, 0.31, 0.52, 0.69]],
}
GREEN_DOTS = {
    "p007_one_green_dot": [[0.46]],
    "p008_two_green_dots": [[0.25, 0.76]],
    "p010_three_green_dots": [[0.27, 0.76], [0.27]],
    "p012_four_green_dots": [[0.22, 0.70], [0.22, 0.70]],
    "p014_circles_5": [[0.22, 0.75], [0.49], [0.22, 0.75]],
    "p018_circles_6": [[0.18, 0.50, 0.82], [0.34], [0.18, 0.50]],
    "p022_seven_green_dots": [[0.16, 0.50, 0.84], [0.33], [0.16, 0.50, 0.84]],
    "p024_eight_green_dots": [
        [0.13, 0.37, 0.63, 0.88],
        [0.25],
        [0.13, 0.37, 0.63],
    ],
    "p026_green_circles_9": [
        [0.13, 0.37, 0.62, 0.86],
        [0.25],
        [0.13, 0.37, 0.62, 0.86],
    ],
    "p028_green_circles_10": [
        [0.11, 0.30, 0.50, 0.70, 0.89],
        [0.11, 0.30, 0.50, 0.70, 0.89],
    ],
}

# A single outlined last dot makes the newly added one easy to find.
ADDITION = {f"p017_circles_{n}_plus_1": n for n in range(1, 5)}

# These dots match the source-question mark centers in fullBookData.ts.
SPLIT_DOMINO = {
    "p019_domino_5_1": (
        [(0.13, 0.28), (0.39, 0.28), (0.27, 0.48), (0.13, 0.70), (0.39, 0.70)],
        [(0.67, 0.48)],
    ),
    "p019_domino_4_2": (
        [(0.13, 0.28), (0.39, 0.28), (0.13, 0.70), (0.39, 0.70)],
        [(0.81, 0.28), (0.56, 0.70)],
    ),
    "p019_domino_3_3": (
        [(0.37, 0.25), (0.24, 0.48), (0.11, 0.70)],
        [(0.80, 0.25), (0.66, 0.48), (0.53, 0.70)],
    ),
    "p023_domino_6_1": (
        [(0.13, 0.28), (0.27, 0.28), (0.40, 0.28),
         (0.13, 0.70), (0.27, 0.70), (0.40, 0.70)],
        [(0.70, 0.48)],
    ),
    "p023_domino_5_2": (
        [(0.13, 0.28), (0.39, 0.28), (0.27, 0.48), (0.13, 0.70), (0.39, 0.70)],
        [(0.81, 0.28), (0.56, 0.70)],
    ),
    "p023_domino_4_3": (
        [(0.13, 0.28), (0.39, 0.28), (0.13, 0.70), (0.39, 0.70)],
        [(0.80, 0.25), (0.66, 0.48), (0.53, 0.70)],
    ),
}

# Page 25 keeps the source card's red/green color and two physical halves.
# Coordinates are circle centers inside the 190x85 (first card: 187x85) crop.
EIGHT_SPLITS = {
    "p025_domino_8_4_4": (
        ((35, 31), (67, 31), (35, 57), (67, 57)),
        ((122, 31), (154, 31), (122, 57), (154, 57)),
    ),
    "p025_domino_8_5_3": (
        ((35, 31), (67, 31), (51, 44), (35, 57), (67, 57)),
        ((120, 57), (137, 44), (154, 31)),
    ),
    "p025_domino_8_6_2": (
        ((28, 31), (52, 31), (76, 31),
         (28, 57), (52, 57), (76, 57)),
        ((136, 31), (136, 57)),
    ),
    "p025_domino_8_7_1": (
        ((21, 31), (42, 31), (63, 31), (84, 31),
         (21, 57), (42, 57), (63, 57)),
        ((136, 44),),
    ),
}

# The next source page continues the same red-left/green-right cards.
NINE_SPLITS = {
    "p027_domino_9_5_4": (
        ((26, 22), (70, 22), (47, 37), (26, 52), (70, 52)),
        ((111, 22), (156, 22), (111, 52), (156, 52)),
    ),
    "p027_domino_9_6_3": (
        ((26, 22), (48, 22), (70, 22),
         (26, 52), (48, 52), (70, 52)),
        ((111, 52), (133, 37), (156, 22)),
    ),
    "p027_domino_9_7_2": (
        ((19, 22), (40, 22), (61, 22), (81, 22),
         (19, 52), (40, 52), (61, 52)),
        ((133, 22), (133, 52)),
    ),
    "p027_domino_9_8_1": (
        ((18, 22), (39, 22), (60, 22), (80, 22),
         (18, 52), (39, 52), (60, 52), (80, 52)),
        ((131, 37),),
    ),
}

# The rightmost object is the one subtracted in each row.
SUBTRACTION = {f"p021_circles_{n}_minus_1": n for n in range(2, 7)}

ADDITION_TWO_LAYOUT = {
    2: ((26,), 40, 53),
    4: ((26, 51), 70, 86),
    6: ((26, 54, 84), 103, 119),
    8: ((25, 52, 80, 108), 134, 151),
}

# The diagonal separates, rather than crosses, the two newly added points.
ODD_ADDITION_TWO = {
    1: (((27, 29),), ((58, 29), (32, 56)), (8, 55)),
    3: (((27, 29), (55, 29), (27, 56)),
        ((86, 29), (55, 56)), (25, 89)),
    5: (((27, 29), (56, 29), (86, 29), (27, 56), (56, 56)),
        ((116, 29), (86, 56)), (56, 120)),
    7: (((27, 29), (56, 29), (86, 29), (116, 29),
         (27, 56), (56, 56), (86, 56)),
        ((147, 29), (116, 56)), (86, 150)),
}

PLUS_THREE_LAYOUT = {
    1: (((27, 29),),
        ((57, 29), (32, 56), (57, 56)), ("diagonal", 8, 55)),
    2: (((27, 29), (27, 56)),
        ((55, 29), (85, 29), (55, 56)), ("vertical", 41)),
    3: (((27, 29), (55, 29), (27, 56)),
        ((86, 29), (55, 56), (86, 56)), ("diagonal", 25, 89)),
    4: (((27, 29), (55, 29), (27, 56), (55, 56)),
        ((85, 29), (115, 29), (85, 56)), ("vertical", 70)),
    5: (((27, 29), (56, 29), (86, 29), (27, 56), (56, 56)),
        ((116, 29), (86, 56), (116, 56)), ("diagonal", 56, 120)),
    6: (((27, 29), (56, 29), (86, 29),
         (27, 56), (56, 56), (86, 56)),
        ((116, 29), (146, 29), (116, 56)), ("vertical", 101)),
    7: (((27, 29), (56, 29), (86, 29), (116, 29),
         (27, 56), (56, 56), (86, 56)),
        ((146, 29), (116, 56), (146, 56)), ("diagonal", 86, 150)),
}

FOUR_ADD_DOMINO = {
    1: ((51, 55),),
    2: ((80, 34), (33, 79)),
    3: ((76, 34), (51, 55), (28, 79)),
    4: ((33, 34), (79, 34), (33, 79), (79, 79)),
    5: ((33, 34), (79, 34), (55, 55), (33, 79), (79, 79)),
    6: ((32, 34), (55, 34), (79, 34),
        (32, 79), (55, 79), (79, 79)),
}

FOUR_SUBTRACTION_LAYOUT = {
    "p041_circles_6_minus_4": (
        ((69, 24), (26, 69)),
        ((104, 24), (149, 24), (103, 69), (149, 69))),
    "p041_circles_8_minus_4": (
        ((27, 24), (72, 24), (27, 69), (72, 69)),
        ((106, 24), (151, 24), (106, 69), (151, 69))),
    "p041_circles_10_minus_4": (
        ((26, 24), (51, 24), (77, 24),
         (26, 69), (51, 69), (77, 69)),
        ((109, 24), (153, 24), (109, 69), (153, 69))),
    "p042_circles_5_minus_4": (
        ((50, 47),),
        ((104, 25), (153, 25), (104, 69), (153, 69))),
    "p042_circles_7_minus_4": (
        ((72, 25), (49, 47), (27, 69)),
        ((104, 25), (153, 25), (104, 69), (153, 69))),
    "p042_circles_9_minus_4": (
        ((28, 25), (76, 25), (52, 47), (28, 69), (76, 69)),
        ((110, 25), (154, 25), (110, 69), (154, 69))),
}

FIVE_DOMINO_PIPS = {
    "left": {
        1: ((51, 52),),
        2: ((74, 32), (30, 75)),
        3: ((74, 32), (51, 52), (30, 75)),
        4: ((30, 32), (74, 32), (30, 75), (74, 75)),
        5: ((30, 32), (74, 32), (51, 52), (30, 75), (74, 75)),
    },
    "right": {
        1: ((134, 52),),
        2: ((155, 32), (112, 75)),
        3: ((155, 32), (134, 52), (112, 75)),
        4: ((112, 32), (155, 32), (112, 75), (155, 75)),
        5: ((112, 32), (155, 32), (134, 52), (112, 75), (155, 75)),
    },
}

SIX_DOMINO_PIPS = {
    "left": {
        1: ((51, 53),),
        2: ((74, 32), (30, 75)),
        3: ((74, 32), (51, 53), (30, 75)),
        4: ((30, 32), (74, 32), (30, 75), (74, 75)),
        6: ((30, 32), (52, 32), (74, 32),
            (30, 75), (52, 75), (74, 75)),
    },
    "right": {
        1: ((134, 53),),
        2: ((156, 32), (112, 75)),
        3: ((156, 32), (134, 53), (112, 75)),
        4: ((112, 32), (156, 32), (112, 75), (156, 75)),
        6: ((112, 32), (134, 32), (156, 32),
            (112, 75), (134, 75), (156, 75)),
    },
}

# Page 49 uses outline and filled circles as the two mathematical groups.
# The last pair reverses which of those styles represents the seven.
SEVEN_DOMINO_LAYOUT = {
    "p049_domino_7_plus_1": (
        ((55, 27), (82, 27), (119, 27), (149, 27),
         (55, 63), (82, 63), (119, 63)),
        ((149, 63),)),
    "p049_domino_1_plus_7": (
        ((52, 27),),
        ((80, 27), (116, 27), (150, 27),
         (52, 63), (80, 63), (116, 63), (150, 63))),
    "p049_domino_7_plus_2": (
        ((58, 27), (86, 27), (119, 27),
         (28, 63), (58, 63), (88, 63), (119, 63)),
        ((151, 27), (151, 63))),
    "p049_domino_2_plus_7": (
        ((56, 27), (27, 63)),
        ((84, 27), (116, 27), (149, 27),
         (56, 63), (85, 63), (117, 63), (149, 63))),
    "p049_domino_7_plus_3": (
        ((153, 27), (119, 63), (153, 63)),
        ((28, 27), (56, 27), (91, 27), (119, 27),
         (28, 63), (56, 63), (91, 63))),
    "p049_domino_3_plus_7": (
        ((91, 27), (119, 27), (153, 27),
         (56, 63), (91, 63), (119, 63), (153, 63)),
        ((28, 27), (56, 27), (28, 63))),
}


def dimensions(asset_id):
    left, top, right, bottom = BOOK_ASSETS[asset_id]["bbox"]
    return right - left, bottom - top


def start_svg(width, height):
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
    ]


def frame(width, height):
    return (
        f'<rect x="4.5" y="4.5" width="{width-9}" '
        f'height="{height-9}" rx="2" fill="none" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )


def dot(width, height, x, y, radius, outlined=False):
    fill = "none" if outlined else PEN
    stroke = f' stroke="{PEN}" stroke-width="1.8"' if outlined else ""
    return (
        f'<circle cx="{x*width:.2f}" cy="{y*height:.2f}" '
        f'r="{radius:.2f}" fill="{fill}"{stroke}/>'
    )


def svg_for(asset_id, rows, domino):
    width, height = dimensions(asset_id)
    radius = min(9.5 if domino else 10, height * (0.115 if domino else 0.13))
    color = PEN if domino else GREEN
    y_positions = (
        [0.36, 0.69] if domino else
        [0.50] if len(rows) == 1 else
        [0.28, 0.72] if len(rows) == 2 else
        [0.23, 0.50, 0.77]
    )
    parts = start_svg(width, height)
    if domino:
        parts.append(frame(width, height))
    for row, y in zip(rows, y_positions):
        for x in row:
            edge = f' stroke="{GREEN_EDGE}" stroke-width="1"' if not domino else ""
            parts.append(
                f'<circle cx="{x*width:.2f}" cy="{y*height:.2f}" '
                f'r="{radius:.2f}" fill="{color}"{edge}/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def addition_svg(asset_id, first_count):
    width, height = dimensions(asset_id)
    radius = min(10, height * 0.14)
    parts = start_svg(width, height) + [frame(width, height)]
    for i in range(first_count + 1):
        x = 0.79 - (first_count - i) * 0.16
        parts.append(dot(width, height, x, 0.52, radius, i == first_count))
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def split_svg(asset_id, left, right):
    width, height = dimensions(asset_id)
    radius = min(10, height * 0.10)
    parts = start_svg(width, height) + [frame(width, height)]
    # An empty cell between groups replaces the source card's partition.
    for x, y in left:
        parts.append(dot(width, height, x, y, radius))
    for x, y in right:
        parts.append(dot(width, height, x, y, radius, outlined=True))
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def colored_eight_split_svg(asset_id, left, right):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="10" y="16" width="{width-20}" height="54" rx="3" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.9"/>'
    )
    parts.append(
        f'<line id="card-divider" x1="{width/2:g}" y1="16" '
        f'x2="{width/2:g}" y2="70" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for side, dots, color, edge in (
        ("left", left, "#c4695c", "#9c5148"),
        ("right", right, GREEN, GREEN_EDGE),
    ):
        for i, (x, y) in enumerate(dots):
            parts.append(
                f'<circle id="{side}-dot-{i}" cx="{x}" cy="{y}" '
                f'r="7" fill="{color}" stroke="{edge}" stroke-width="1.4"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def colored_nine_split_svg(asset_id, left, right):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="4" y="8" width="{width-8}" height="57" rx="3" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.9"/>'
    )
    parts.append(
        f'<line id="card-divider" x1="{width/2:g}" y1="8" '
        f'x2="{width/2:g}" y2="65" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for side, dots, color, edge in (
        ("left", left, "#c4695c", "#9c5148"),
        ("right", right, GREEN, GREEN_EDGE),
    ):
        for i, (x, y) in enumerate(dots):
            parts.append(
                f'<circle id="{side}-dot-{i}" cx="{x}" cy="{y}" '
                f'r="6.6" fill="{color}" stroke="{edge}" stroke-width="1.4"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def subtraction_svg(asset_id, count):
    width, height = dimensions(asset_id)
    radius = min(10, height * 0.14)
    parts = start_svg(width, height) + [frame(width, height)]
    for i in range(count):
        x = 0.82 - (count - 1 - i) * 0.13
        parts.append(dot(width, height, x, 0.50, radius, i == count - 1))
    x = 0.82 * width
    y = 0.50 * height
    parts.append(
        f'<line x1="{x-radius*1.3:.2f}" y1="{y+radius*1.3:.2f}" '
        f'x2="{x+radius*1.3:.2f}" y2="{y-radius*1.3:.2f}" '
        f'stroke="{TEACHER_RED}" stroke-width="1.8" stroke-linecap="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def addition_two_domino_svg(asset_id, base_count):
    width, height = dimensions(asset_id)
    base_x, divider_x, added_x = ADDITION_TWO_LAYOUT[base_count]
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="8" y="8" width="{width-16}" height="64" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    parts.append(
        f'<line id="card-divider" x1="{divider_x}" y1="8" '
        f'x2="{divider_x}" y2="72" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for side, columns in (("base", base_x), ("added", (added_x,))):
        for i, (x, y) in enumerate((x, y) for x in columns for y in (28, 55)):
            parts.append(
                f'<circle id="{side}-dot-{i}" cx="{x}" cy="{y}" '
                f'r="8" fill="none" stroke="{PEN}" stroke-width="1.8"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def subtraction_two_svg(asset_id, count):
    width, height = dimensions(asset_id)
    columns = (29, 58, 89, 119, 151)[:count // 2]
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="9" y="8" width="{width-18}" height="66" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for i, (x, y) in enumerate((x, y) for x in columns for y in (29, 56)):
        parts.append(
            f'<circle id="circle-{i}" cx="{x}" cy="{y}" r="8" '
            f'fill="none" stroke="{PEN}" stroke-width="1.8"/>'
        )
    for i, y in enumerate((29, 56)):
        x = columns[-1]
        parts.append(
            f'<line id="cross-{i}" x1="{x-8}" y1="{y+9}" '
            f'x2="{x+8}" y2="{y-9}" stroke="{TEACHER_RED}" '
            'stroke-width="2.3" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def odd_addition_two_svg(asset_id, base_count):
    width, height = dimensions(asset_id)
    base, added, (line_bottom, line_top) = ODD_ADDITION_TWO[base_count]
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="8" y="9" width="{width-16}" height="63" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    parts.append(
        f'<line id="group-divider" x1="{line_bottom}" y1="72" '
        f'x2="{line_top}" y2="9" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for side, dots in (("base", base), ("added", added)):
        for i, (x, y) in enumerate(dots):
            parts.append(
                f'<circle id="{side}-dot-{i}" cx="{x}" cy="{y}" '
                f'r="7" fill="none" stroke="{PEN}" stroke-width="1.8"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def odd_subtraction_two_svg(asset_id, count):
    width, height = dimensions(asset_id)
    columns = (29, 59, 89, 119, 151)
    top = columns[:(count + 1) // 2]
    bottom = columns[:(count - 1) // 2]
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="9" y="8" width="{width-18}" height="63" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for i, (x, y) in enumerate(
        tuple((x, 29) for x in top) + tuple((x, 56) for x in bottom)
    ):
        parts.append(
            f'<circle id="circle-{i}" cx="{x}" cy="{y}" r="8" '
            f'fill="none" stroke="{PEN}" stroke-width="1.8"/>'
        )
    for i, (x, y) in enumerate(((top[-1], 29), (bottom[-1], 56))):
        parts.append(
            f'<line id="cross-{i}" x1="{x-8}" y1="{y+9}" '
            f'x2="{x+8}" y2="{y-9}" stroke="{TEACHER_RED}" '
            'stroke-width="2.3" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def addition_three_domino_svg(asset_id, base_count):
    width, height = dimensions(asset_id)
    base, added, separator = PLUS_THREE_LAYOUT[base_count]
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="8" y="9" width="{width-16}" height="{height-18}" '
        f'rx="2" fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    if separator[0] == "vertical":
        x = separator[1]
        parts.append(
            f'<line id="group-divider" x1="{x}" y1="9" '
            f'x2="{x}" y2="{height-9}" stroke="{FRAME}" stroke-width="1.8"/>'
        )
    else:
        bottom_x, top_x = separator[1:]
        parts.append(
            f'<line id="group-divider" x1="{bottom_x}" y1="72" '
            f'x2="{top_x}" y2="9" stroke="{FRAME}" stroke-width="1.8"/>'
        )
    radius = 8 if separator[0] == "vertical" else 7
    for side, dots in (("base", base), ("added", added)):
        for i, (x, y) in enumerate(dots):
            parts.append(
                f'<circle id="{side}-dot-{i}" cx="{x}" cy="{y}" '
                f'r="{radius}" fill="none" stroke="{PEN}" stroke-width="1.8"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def subtraction_three_svg(asset_id, count):
    width, height = dimensions(asset_id)
    x_positions = (29, 59, 89, 119, 149)
    top = x_positions[:(count + 1) // 2]
    bottom = x_positions[:count // 2]
    top_y, bottom_y = (32, 63) if count == 4 else (30, 59)
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="9" y="9" width="{width-18}" height="{height-18}" '
        f'rx="2" fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for i, (x, y) in enumerate(
        tuple((x, top_y) for x in top) + tuple((x, bottom_y) for x in bottom)
    ):
        parts.append(
            f'<circle id="circle-{i}" cx="{x}" cy="{y}" r="8" '
            f'fill="none" stroke="{PEN}" stroke-width="1.8"/>'
        )
    crossed = (
        ((top[-1], top_y), (bottom[-2], bottom_y), (bottom[-1], bottom_y))
        if count % 2 == 0 else
        ((top[-2], top_y), (top[-1], top_y), (bottom[-1], bottom_y))
    )
    for i, (x, y) in enumerate(crossed):
        parts.append(
            f'<line id="cross-{i}" x1="{x-8}" y1="{y+9}" '
            f'x2="{x+8}" y2="{y-9}" stroke="{TEACHER_RED}" '
            'stroke-width="2.3" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def filled_domino_four_svg(asset_id, base_count):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="10" y="15" width="{width-20}" height="80" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="2"/>'
    )
    parts.append(
        f'<line id="card-divider" x1="97" y1="15" x2="97" y2="95" '
        f'stroke="{FRAME}" stroke-width="2"/>'
    )
    for side, dots in (
        ("base", FOUR_ADD_DOMINO[base_count]),
        ("added", ((112, 34), (160, 34), (112, 79), (160, 79))),
    ):
        for i, (x, y) in enumerate(dots):
            parts.append(
                f'<circle id="{side}-dot-{i}" cx="{x}" cy="{y}" '
                f'r="9" fill="{PEN}"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def subtraction_four_svg(asset_id):
    width, height = dimensions(asset_id)
    remaining, crossed = FOUR_SUBTRACTION_LAYOUT[asset_id]
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="9" y="8" width="{width-18}" height="79" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for i, (x, y) in enumerate(remaining + crossed):
        parts.append(
            f'<circle id="dot-{i}" cx="{x}" cy="{y}" r="8.5" fill="{PEN}"/>'
        )
    for i, (x, y) in enumerate(crossed):
        parts.append(
            f'<line id="cross-{i}" x1="{x-9}" y1="{y+10}" '
            f'x2="{x+9}" y2="{y-10}" stroke="{TEACHER_RED}" '
            'stroke-width="2.4" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def arithmetic_table_four_svg(asset_id, rows, operation):
    width, height = dimensions(asset_id)
    plus = operation == "+4"
    frame_width = 184 if plus else 196
    columns = (46, 101, 157) if plus else (47, 111, 174)
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="10" y="8" width="{frame_width}" height="114" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for row_index, row in enumerate(rows):
        for column_index, value in enumerate(row):
            parts.append(
                f'<text id="cell-{row_index}-{column_index}" '
                f'x="{columns[column_index]}" y="{51 + row_index * 48}" '
                f'text-anchor="middle" font-family="Andika_700Bold" '
                f'font-size="32" fill="{NOTEBOOK_INK}">{value}</text>'
            )
    parts.append(
        f'<text id="operation" x="{218 if plus else 220}" y="79" '
        f'font-family="Andika_700Bold" font-size="34" '
        f'fill="{PEN}">{operation}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def filled_domino_five_svg(asset_id, left_count, right_count):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="9" y="11" width="{width-19}" height="82" rx="3" '
        f'fill="none" stroke="{FRAME}" stroke-width="2"/>'
    )
    parts.append(
        f'<line id="card-divider" x1="93" y1="11" x2="93" y2="93" '
        f'stroke="{FRAME}" stroke-width="2"/>'
    )
    for side, count in (("left", left_count), ("right", right_count)):
        for i, (x, y) in enumerate(FIVE_DOMINO_PIPS[side][count]):
            parts.append(
                f'<circle id="{side}-dot-{i}" cx="{x}" cy="{y}" '
                f'r="8.5" fill="{PEN}"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def filled_domino_six_svg(asset_id, left_count, right_count):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="9" y="11" width="{width-19}" height="82" rx="3" '
        f'fill="none" stroke="{FRAME}" stroke-width="2"/>'
    )
    parts.append(
        f'<line id="card-divider" x1="93" y1="11" x2="93" y2="93" '
        f'stroke="{FRAME}" stroke-width="2"/>'
    )
    for side, count in (("left", left_count), ("right", right_count)):
        for i, (x, y) in enumerate(SIX_DOMINO_PIPS[side][count]):
            parts.append(
                f'<circle id="{side}-dot-{i}" cx="{x}" cy="{y}" '
                f'r="8.5" fill="{PEN}"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def seven_group_domino_svg(asset_id):
    width, height = dimensions(asset_id)
    outline, filled = SEVEN_DOMINO_LAYOUT[asset_id]
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="8" y="8" width="{width-16}" height="74" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for i, (x, y) in enumerate(outline):
        parts.append(
            f'<circle id="outline-dot-{i}" cx="{x}" cy="{y}" r="8" '
            f'fill="none" stroke="{PEN}" stroke-width="2.1"/>'
        )
    for i, (x, y) in enumerate(filled):
        parts.append(
            f'<circle id="filled-dot-{i}" cx="{x}" cy="{y}" r="8" '
            f'fill="{PEN}"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def saucer_cup_prices_svg():
    width, height = dimensions("p050_saucer_cup_prices")
    parts = start_svg(width, height)
    parts += [
        '<path id="saucer" d="M18 65 C19 88 53 110 106 110 '
        'C158 110 192 88 193 65 Z" fill="#c8dedb" '
        'stroke="#587f84" stroke-width="2.4"/>',
        '<ellipse cx="105.5" cy="65" rx="88" ry="20" '
        'fill="#edf5f2" stroke="#587f84" stroke-width="2.4"/>',
        '<ellipse cx="105.5" cy="65" rx="66" ry="11" '
        'fill="none" stroke="#9dbbb8" stroke-width="2"/>',
        '<path id="cup-body" d="M244 37 C247 78 254 109 276 115 '
        'Q295 123 315 115 C337 109 344 78 347 37 Z" '
        'fill="#d8e8e3" stroke="#587f84" stroke-width="2.5"/>',
        '<path id="cup-handle" d="M346 48 C385 37 389 88 347 94" '
        'fill="none" stroke="#587f84" stroke-width="8" '
        'stroke-linecap="round"/>',
        '<path d="M346 48 C375 42 377 83 347 86" '
        'fill="none" stroke="#edf5f2" stroke-width="3" '
        'stroke-linecap="round"/>',
        '<ellipse cx="295.5" cy="37" rx="51.5" ry="16" '
        'fill="#edf5f2" stroke="#587f84" stroke-width="2.5"/>',
        '<ellipse cx="295.5" cy="38" rx="37" ry="8" '
        'fill="none" stroke="#9dbbb8" stroke-width="1.8"/>',
        '<rect x="73" y="126" width="65" height="39" rx="9" '
        'fill="#f7f0e3" stroke="#b7a78d" stroke-width="1.7"/>',
        '<rect x="263" y="126" width="65" height="39" rx="9" '
        'fill="#f7f0e3" stroke="#b7a78d" stroke-width="1.7"/>',
        f'<text id="price-saucer" x="105.5" y="156" text-anchor="middle" '
        f'font-family="Andika_700Bold" font-size="32" fill="{NOTEBOOK_INK}">3</text>',
        f'<text id="price-cup" x="295.5" y="156" text-anchor="middle" '
        f'font-family="Andika_700Bold" font-size="32" fill="{NOTEBOOK_INK}">7</text>',
        '</svg>',
    ]
    return "\n".join(parts) + "\n", width, height


def eight_group_domino_svg(asset_id, first_count, second_count):
    width, height = dimensions(asset_id)
    left_eight = first_count == 8
    divider = 143 if left_eight else (36 if first_count == 1 else 44)
    outline_x = (26, 52, 86, 112) if left_eight else (
        (58, 84, 120, 146) if first_count == 1 else (61, 87, 121, 150)
    )
    filled_x = 157 if left_eight else 27
    filled_ys = (25,) if (second_count if left_eight else first_count) == 1 else (25, 57)
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="8" y="8" width="{width-16}" height="64" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    parts.append(
        f'<line id="card-divider" x1="{divider}" y1="8" '
        f'x2="{divider}" y2="72" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for i, (x, y) in enumerate(
        tuple((x, y) for y in (25, 57) for x in outline_x)
    ):
        parts.append(
            f'<circle id="outline-dot-{i}" cx="{x}" cy="{y}" r="7.5" '
            f'fill="none" stroke="{PEN}" stroke-width="2"/>'
        )
    for i, y in enumerate(filled_ys):
        parts.append(
            f'<circle id="filled-dot-{i}" cx="{filled_x}" cy="{y}" '
            f'r="7.5" fill="{PEN}"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def nine_group_domino_svg(asset_id, first_count):
    width, height = dimensions(asset_id)
    right_one = first_count == 9
    separated = (153, 60) if right_one else (25, 27)
    diagonal = ((177, 26), (132, 78)) if right_one else ((8, 60), (60, 8))
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="8" y="8" width="{width-16}" height="70" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    (x1, y1), (x2, y2) = diagonal
    parts.append(
        f'<line id="card-divider" x1="{x1}" y1="{y1}" '
        f'x2="{x2}" y2="{y2}" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    i = 0
    for y in (27, 60):
        for x in (25, 55, 85, 125, 153):
            if (x, y) == separated:
                continue
            parts.append(
                f'<circle id="outline-dot-{i}" cx="{x}" cy="{y}" r="7.5" '
                f'fill="none" stroke="{PEN}" stroke-width="2"/>'
            )
            i += 1
    x, y = separated
    parts.append(
        f'<circle id="filled-dot-0" cx="{x}" cy="{y}" r="7.5" fill="{PEN}"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def meter_abbreviation_rule_svg():
    width, height = dimensions("p054_rule_meter_abbrev")
    parts = start_svg(width, height)
    parts += [
        f'<rect x="7" y="6" width="{width-14}" height="{height-12}" '
        f'rx="8" fill="#f5f3ec" stroke="{FRAME}" stroke-width="1.8"/>',
        f'<text id="rule-line-1" x="{width/2:g}" y="41" '
        f'text-anchor="middle" font-family="Andika_700Bold" '
        f'font-size="40" fill="{NOTEBOOK_INK}">Слово „метр“ сокращённо</text>',
        f'<text id="rule-line-2" x="{width/2:g}" y="82" '
        f'text-anchor="middle" font-family="Andika_700Bold" '
        f'font-size="40" fill="{NOTEBOOK_INK}">'
        'записывают <tspan font-style="italic">м</tspan></text>',
        '</svg>',
    ]
    return "\n".join(parts) + "\n", width, height


def four_operation_columns_svg():
    width, height = dimensions("p056_columns_plus4_minus4_plus5_minus5")
    parts = start_svg(width, height)
    parts.append(
        f'<text id="exercise-number" x="6" y="31" '
        f'font-family="Andika_700Bold" font-size="23" '
        f'fill="{NOTEBOOK_INK}">183.</text>'
    )
    groups = (
        ((4, 6, 3, 5), "+4", 85, 113, 150),
        ((6, 9, 7, 10), "−4", 263, 293, 328),
        ((3, 5, 2, 4), "+5", 443, 473, 510),
        ((10, 8, 7, 9), "−5", 620, 653, 690),
    )
    for column, (numbers, operation, number_x, line_x, operation_x) in enumerate(groups):
        parts.append(
            f'<line id="column-divider-{column}" x1="{line_x}" y1="8" '
            f'x2="{line_x}" y2="151" stroke="{FRAME}" stroke-width="1.8"/>'
        )
        for row, value in enumerate(numbers):
            parts.append(
                f'<text id="column-{column}-row-{row}" x="{number_x}" '
                f'y="{34 + 35*row}" text-anchor="middle" '
                f'font-family="Andika_700Bold" font-size="34" '
                f'fill="{NOTEBOOK_INK}">{value}</text>'
            )
        parts.append(
            f'<text id="operation-{column}" x="{operation_x}" y="92" '
            f'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="40" fill="{PEN}">{operation}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def operation_circle_svg(asset_id, operation, outer):
    width, height = dimensions(asset_id)
    center_x = width / 2
    parts = start_svg(width, height)
    parts.append(
        f'<circle id="operation-ring" cx="{center_x:g}" cy="94" r="59" '
        f'fill="none" stroke="{FRAME}" stroke-width="2.4"/>'
    )
    parts.append(
        f'<text id="center-operation" x="{center_x:g}" y="105" '
        f'text-anchor="middle" font-family="Andika_700Bold" '
        f'font-size="34" fill="{PEN}">{operation}</text>'
    )
    for position, x, y, number in (
        ("top", center_x, 24, outer[0]),
        ("left", 18, 146, outer[1]),
        ("right", width-18, 146, outer[2]),
    ):
        parts.append(
            f'<text id="outer-{position}" x="{x:g}" y="{y}" '
            f'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="24" fill="{NOTEBOOK_INK}">{number}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def second_decade_blocks_svg(asset_id, number):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    for i in range(10):
        x = 8 + i * 23
        parts.append(
            f'<rect id="ten-block-{i}" x="{x}" y="38" '
            'width="23" height="27" fill="#d9e8e9" '
            'stroke="#4b5961" stroke-width="1.8"/>'
        )
    for i in range(number - 10):
        x = 8 + i * 23
        parts.append(
            f'<rect id="unit-block-{i}" x="{x}" y="11" '
            'width="23" height="27" fill="#efdcae" '
            'stroke="#4b5961" stroke-width="1.8"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def ten_and_six_sticks_svg():
    width, height = dimensions("p059_bundle_ten_six_sticks")
    parts = start_svg(width, height)
    for i in range(10):
        x = 20 + i * 5
        parts.append(
            f'<line id="bundle-stick-{i}" x1="{x}" y1="117" '
            f'x2="{x+16}" y2="17" stroke="#a77c51" '
            'stroke-width="3.6" stroke-linecap="round"/>'
        )
    parts.append(
        '<path id="bundle-tie" d="M23 66 Q46 60 75 58 '
        'L76 72 Q48 73 20 79 Z" fill="#a8c9c6" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for i, x in enumerate((122, 145, 168, 210, 233, 256)):
        parts.append(
            f'<line id="loose-stick-{i}" x1="{x}" y1="115" '
            f'x2="{x+6}" y2="21" stroke="#a77c51" '
            'stroke-width="6" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


SECOND_DECADE_STICK_GROUPS = {
    "p063_bundle_plus_1_stick": ((145,),),
    "p063_bundle_plus_3_sticks": ((155, 200, 245),),
    "p064_sticks_bundle_2_plus_2": ((120, 145), (205, 230)),
    "p071_sticks_bundle_4_plus_2": ((110, 135, 160, 185), (225, 250)),
    "p090_sticks_bundle_10_plus_5": ((105, 129, 153, 177, 201),),
}


def second_decade_sticks_svg(asset_id):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    for i in range(10):
        x = 17 + i * 4.8
        parts.append(
            f'<line id="bundle-stick-{i}" x1="{x:.1f}" y1="{height-20}" '
            f'x2="{x+19:.1f}" y2="18" stroke="#a77c51" '
            'stroke-width="3.7" stroke-linecap="round"/>'
        )
    parts.append(
        f'<path id="bundle-tie" d="M17 {height/2-7:g} '
        f'Q42 {height/2-12:g} 78 {height/2-10:g} '
        f'L78 {height/2+4:g} Q43 {height/2+1:g} 16 {height/2+8:g} Z" '
        f'fill="#a8c9c6" stroke="{FRAME}" stroke-width="1.6"/>'
    )
    index = 0
    for group, xs in enumerate(SECOND_DECADE_STICK_GROUPS[asset_id]):
        for x in xs:
            parts.append(
                f'<line id="loose-stick-{index}" data-group="{group}" '
                f'x1="{x}" y1="{height-20}" x2="{x+16}" y2="22" '
                'stroke="#a77c51" stroke-width="6" stroke-linecap="round"/>'
            )
            index += 1
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def buttons_ten_plus_five_svg():
    width, height = dimensions("p063_buttons_frame_10_5")
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="button-frame" x="8" y="8" width="{width-16}" '
        f'height="{height-16}" rx="6" fill="#fcfbf7" '
        f'stroke="{FRAME}" stroke-width="2"/>'
    )
    parts.append(
        f'<path id="frame-divider" d="M307 8V{height-8}" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for side, xs, ys in (
        ("left", (43, 96, 149, 202, 255), (54, 124)),
        ("right", (351, 404, 457, 510, 563), (54,)),
    ):
        i = 0
        for y in ys:
            for x in xs:
                parts.append(
                    f'<circle id="button-{side}-{i}" cx="{x}" cy="{y}" '
                    'r="19" fill="#9ab4b1" stroke="#526c6c" stroke-width="1.8"/>'
                )
                i += 1
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def partition_circles_svg(asset_id, crossed=False):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    divider = width // 2
    parts.append(
        f'<rect id="circle-frame" x="7" y="7" width="{width-14}" '
        f'height="{height-14}" rx="3" fill="#fcfbf7" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )
    parts.append(
        f'<path id="frame-divider" d="M{divider} 7V{height-7}" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    if crossed:
        xs_left, xs_right, ys, radius = ((27, 60, 93, 126, 159),
                                         (218, 251, 284, 317, 350), (33, 88), 10)
        for row, y in enumerate(ys):
            for x in xs_left + xs_right:
                i = row * 10 + (xs_left + xs_right).index(x)
                parts.append(
                    f'<circle id="frame-circle-{i}" cx="{x}" cy="{y}" '
                    f'r="{radius}" fill="none" stroke="{PEN}" stroke-width="1.8"/>'
                )
                if row == 1 and x in xs_right:
                    parts.append(
                        f'<path id="cross-{xs_right.index(x)}" '
                        f'd="M{x-9} {y+9}L{x+9} {y-9}" fill="none" '
                        f'stroke="{NOTEBOOK_INK}" stroke-width="2.2"/>'
                    )
    else:
        xs_left, xs_right, ys, radius = ((31, 75, 119, 163, 207),
                                         (269, 313, 357, 401, 445), (39, 98), 16)
        for row, y in enumerate(ys):
            for i, x in enumerate(xs_left):
                parts.append(
                    f'<circle id="left-circle-{row*5+i}" cx="{x}" cy="{y}" '
                    f'r="{radius}" fill="none" stroke="{PEN}" stroke-width="2"/>'
                )
            for i, x in enumerate(xs_right):
                label = "right-top-circle" if row == 0 else "right-bottom-circle"
                fill = "none" if row == 0 else NOTEBOOK_INK
                parts.append(
                    f'<circle id="{label}-{i}" cx="{x}" cy="{y}" '
                    f'r="{radius}" fill="{fill}" stroke="{PEN}" stroke-width="2"/>'
                )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def two_rail_five_six_svg():
    width, height = dimensions("p067_abacus_5_and_6")
    parts = start_svg(width, height)
    parts.append(
        '<rect id="rail-board" x="12" y="20" width="380" height="185" '
        f'rx="13" fill="#f7f5ec" stroke="{FRAME}" stroke-width="2"/>'
    )
    for row, y, count in (("top", 77, 5), ("bottom", 150, 6)):
        parts.append(
            f'<path id="rod-{row}" d="M29 {y}H375" fill="none" '
            f'stroke="{FRAME}" stroke-width="4" stroke-linecap="round"/>'
        )
        for i in range(count):
            x = 48 + i * 31 if i < 5 else 224
            fill = "#d9e8e9" if i < 4 else "#b78b79"
            parts.append(
                f'<circle id="bead-{row}-{i}" cx="{x}" cy="{y}" r="17" '
                f'fill="{fill}" stroke="#526c6c" stroke-width="1.7"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


SECOND_DECADE_SOLUTIONS = {
    "p064_solution_12_plus_2": ("12+2=", "2+2= 4", "10+4=14"),
    "p065_solution_15_plus_5": ("15+5=", "5+5=10", "10+10=20"),
    "p071_solution_16_minus_2": ("16−2=", "6−2= 4", "10+4=14"),
    "p072_solution_20_minus_5": ("20−5=", "10−5= 5", "10+5=15"),
}


def second_decade_solution_svg(asset_id):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    ys = (34, 80, 122) if height >= 140 else (32, 74, 116)
    for i, (line, y) in enumerate(zip(SECOND_DECADE_SOLUTIONS[asset_id], ys)):
        parts.append(
            f'<text id="solution-line-{i}" x="10" y="{y}" '
            f'font-family="Andika_700Bold, sans-serif" font-size="25" '
            f'fill="{NOTEBOOK_INK}">{line}</text>'
        )
    parts.append(
        f'<path id="solution-rule" d="M10 {ys[0]+13}H{width-12}" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.6"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


SECOND_DECADE_TABLES = {
    "p072_table_minus_3": ((16, 18, 15), (19, 14, 17), "−3"),
    "p072_table_minus_4": ((14, 17, 15), (18, 16, 19), "−4"),
    "p073_frame_minus_5": ((15, 17, 16), (18, 20, 19), "−5"),
}


def second_decade_table_svg(asset_id):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        '<rect id="number-frame" x="8" y="8" width="233" height="114" '
        f'rx="3" fill="#fcfbf7" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    top, bottom, operation = SECOND_DECADE_TABLES[asset_id]
    for row, (numbers, y) in enumerate(((top, 48), (bottom, 101))):
        for column, (number, x) in enumerate(zip(numbers, (48, 124, 200))):
            parts.append(
                f'<text id="table-cell-{row}-{column}" x="{x}" y="{y}" '
                f'text-anchor="middle" font-family="Andika_700Bold, sans-serif" '
                f'font-size="29" fill="{NOTEBOOK_INK}">{number}</text>'
            )
    parts.append(
        f'<text id="table-operation" x="{width-42}" y="81" '
        f'font-family="Andika_700Bold, sans-serif" font-size="32" '
        f'fill="{NOTEBOOK_INK}">{operation}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


TEN_BRIDGE_DOMINOES = {
    "p079_domino_9_plus_3": (9, 3),
    "p080_domino_8_plus_3": (8, 3),
    "p081_domino_7_plus_5": (7, 5),
}


def ten_bridge_domino_svg(asset_id):
    width, height = dimensions(asset_id)
    base, addend = TEN_BRIDGE_DOMINOES[asset_id]
    parts = start_svg(width, height)
    divider = width // 2
    parts.append(
        f'<rect id="domino-frame" x="8" y="8" width="{width-16}" '
        f'height="{height-16}" rx="5" fill="#fcfbf7" '
        f'stroke="{FRAME}" stroke-width="2"/>'
    )
    parts.append(
        f'<path id="domino-divider" d="M{divider} 8V{height-8}" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    positions = [(48 + column * 54, row)
                 for row in range(2) for column in range(5)]
    for i, (x, row) in enumerate(positions):
        y = 59 if row == 0 else 133
        label = f"base-dot-{i}" if i < base else f"added-left-{i-base}"
        fill = "#d9e8e9" if i < base else NOTEBOOK_INK
        parts.append(
            f'<circle id="{label}" cx="{x}" cy="{y}" r="23" '
            f'fill="{fill}" stroke="#526c6c" stroke-width="2"/>'
        )
    for i in range(addend - (10 - base)):
        x = divider + 45 + i * 54
        parts.append(
            f'<circle id="added-right-{i}" cx="{x}" cy="59" r="23" '
            f'fill="{NOTEBOOK_INK}" stroke="#526c6c" stroke-width="2"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


TEN_BRIDGE_SAMPLES = {
    "p079_sample_9_plus_3": ("9+3=", "9+1=10", "10+2=12"),
    "p080_sample_8_plus_3": ("8+3=", "8+2=10", "10+1=11"),
    "p081_sample_7_plus_5": ("7+5=", "7+3=10", "10+2=12"),
    "p082_sample_5_plus_7": ("5+7=", "5+5=10", "10+2=12"),
    "p082_sample_6_plus_5": ("6+5=", "6+4=10", "10+1=11"),
    "p083_sample_3_plus_8": ("3+8=", "3+7=10", "10+1=11"),
    "p083_sample_4_plus_7": ("4+7=", "4+6=10", "10+1=11"),
    "p084_sample_11_minus_2": ("11−2=", "11−1=10", "10−1= 9"),
}


def ten_bridge_sample_svg(asset_id):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    ys = (32, 78, 119) if height <= 135 else (34, 82, 127)
    for i, (line, y) in enumerate(zip(TEN_BRIDGE_SAMPLES[asset_id], ys)):
        parts.append(
            f'<text id="sample-line-{i}" x="8" y="{y}" '
            f'font-family="Andika_700Bold, sans-serif" font-size="23" '
            f'fill="{NOTEBOOK_INK}">{line}</text>'
        )
    parts.append(
        f'<path id="sample-rule" d="M8 {ys[0]+12}H{width-10}" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.6"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def plate_with_price_svg(asset_id):
    width, height = dimensions(asset_id)
    deep = asset_id == "p081_deep_plate_7_rub"
    parts = start_svg(width, height)
    parts.append(
        '<ellipse id="plate-rim" cx="105" cy="43" rx="82" ry="19" '
        'fill="#e5efed" stroke="#526c6c" stroke-width="2.3"/>'
    )
    parts.append(
        '<ellipse id="plate-well" cx="105" cy="45" rx="58" ry="11" '
        'fill="#fcfbf7" stroke="#8aa6a4" stroke-width="1.5"/>'
    )
    depth = 81 if deep else 61
    parts.append(
        f'<path id="plate-body" d="M24 44 Q27 {depth} 105 {depth} '
        f'Q183 {depth} 186 44" fill="none" stroke="#526c6c" '
        'stroke-width="2.2"/>'
    )
    parts.append(
        '<rect id="price-tag" x="80" y="91" width="50" height="27" '
        'rx="5" fill="#f5f3ec" stroke="#8aa6a4" stroke-width="1.5"/>'
    )
    if deep:
        parts.append(
            f'<text id="plate-price" x="105" y="112" text-anchor="middle" '
            f'font-family="Andika_700Bold, sans-serif" font-size="22" '
            f'fill="{NOTEBOOK_INK}">7</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


TEN_BRIDGE_FRAMES = {
    "p082_frame_8_plus": (((4, 8, 6), (5, 9, 7)), "8+"),
    "p083_frame_3_plus": (((5, 7, 8), (9, 6, 10), (12, 15, 13)), "3+"),
    "p085_frame_minus_2": (((4, 8, 6), (5, 9, 7)), "−2"),
    "p086_frame_minus_3": (((5, 7, 4), (6, 9, 8)), "−3"),
    "p087_frame_minus_4": (((5, 8, 6), (9, 7, 10)), "−4"),
}


def ten_bridge_frame_svg(asset_id):
    width, height = dimensions(asset_id)
    rows, operation = TEN_BRIDGE_FRAMES[asset_id]
    plus = operation.endswith("+")
    left = 70 if plus else 8
    right = width - 8 if plus else width - 62
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="number-frame" x="{left}" y="8" width="{right-left}" '
        f'height="{height-16}" rx="3" fill="#fcfbf7" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )
    x_positions = [left + (right-left) * (column + 0.5) / 3
                   for column in range(3)]
    y_positions = ([52, 107] if len(rows) == 2 else [44, 93, 142])
    for row, (numbers, y) in enumerate(zip(rows, y_positions)):
        for column, (number, x) in enumerate(zip(numbers, x_positions)):
            parts.append(
                f'<text id="frame-cell-{row}-{column}" x="{x:g}" y="{y}" '
                f'text-anchor="middle" font-family="Andika_700Bold, sans-serif" '
                f'font-size="27" fill="{NOTEBOOK_INK}">{number}</text>'
            )
    operation_x = 8 if plus else right + 8
    parts.append(
        f'<text id="frame-operation" x="{operation_x}" y="{height/2+10:g}" '
        f'font-family="Andika_700Bold, sans-serif" font-size="30" '
        f'fill="{NOTEBOOK_INK}">{operation}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def eleven_minus_two_svg():
    width, height = dimensions("p084_sticks_11_minus_2")
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="circle-frame" x="7" y="8" width="{width-14}" '
        f'height="{height-16}" rx="5" fill="#fcfbf7" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )
    parts.append(
        '<path id="circle-divider" d="M192 8V117" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for i in range(10):
        x = 26 + (i % 5) * 34
        y = 34 if i < 5 else 88
        parts.append(
            f'<circle id="ten-dot-{i}" cx="{x}" cy="{y}" r="11" '
            f'fill="none" stroke="{PEN}" stroke-width="1.8"/>'
        )
        if i == 9:
            parts.append(
                f'<path id="cross-ten-9" d="M{x-10} {y+10}L{x+10} {y-10}" '
                f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2"/>'
            )
    parts.append(
        f'<circle id="unit-dot-0" cx="218" cy="34" r="11" '
        f'fill="none" stroke="{PEN}" stroke-width="1.8"/>'
    )
    parts.append(
        f'<path id="cross-unit-0" d="M208 44L228 24" '
        f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def pencils_case_svg(asset_id):
    width, height = dimensions(asset_id)
    units = 2 if asset_id.startswith("p085") else 3
    crossed_ten = (8, 9) if units == 2 else (9,)
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="pencil-case" x="6" y="7" width="{width-12}" '
        f'height="{height-14}" rx="10" fill="#e9efeb" '
        f'stroke="#526c6c" stroke-width="2"/>'
    )
    parts.append(
        f'<path id="pencil-case-divider" d="M194 8V{height-7}" '
        f'fill="none" stroke="#526c6c" stroke-width="1.8"/>'
    )
    for i in range(10):
        x = 30 + (i % 5) * 34
        y = 34 if i < 5 else 84
        parts.append(
            f'<circle id="pencil-ten-{i}" cx="{x}" cy="{y}" r="11" '
            'fill="#fbf7eb" stroke="#526c6c" stroke-width="2"/>'
        )
        if i in crossed_ten:
            parts.append(
                f'<path id="cross-ten-{i}" d="M{x-10} {y+10}L{x+10} {y-10}" '
                f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2.2"/>'
            )
    for i in range(units):
        x = 222 + i * 35
        parts.append(
            f'<circle id="pencil-unit-{i}" cx="{x}" cy="34" r="11" '
            'fill="#fbf7eb" stroke="#526c6c" stroke-width="2"/>'
        )
        parts.append(
            f'<path id="cross-unit-{i}" d="M{x-10} 44L{x+10} 24" '
            f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2.2"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def educational_scales_svg(asset_id):
    width, height = dimensions(asset_id)
    flour = "flour" in asset_id
    labels = (("5 кг", "5 кг") if asset_id == "p106_scales_flour_weights"
              else ("5 кг", "1 кг") if flour else ("2 кг", "1 кг"))
    pan_y = height - 65
    left, right, center = 85, width - 85, width / 2
    parts = start_svg(width, height)
    parts.append(
        f'<path id="scale-base" d="M{center-76:g} {height-12}H{center+76:g}" '
        f'fill="none" stroke="#526c6c" stroke-width="8" '
        'stroke-linecap="round"/>'
    )
    parts.append(
        f'<path id="scale-post" d="M{center:g} {height-15}V{pan_y-41}" '
        f'fill="none" stroke="#526c6c" stroke-width="8"/>'
    )
    parts.append(
        f'<path id="scale-beam" d="M{left} {pan_y-31}H{right}" '
        f'fill="none" stroke="#526c6c" stroke-width="5"/>'
    )
    for side, x in (("left", left), ("right", right)):
        parts.append(
            f'<path id="scale-hanger-{side}" d="M{x} {pan_y-31}V{pan_y-4}" '
            f'fill="none" stroke="#8aa6a4" stroke-width="2.3"/>'
        )
        parts.append(
            f'<path id="scale-pan-{side}" d="M{x-72} {pan_y} '
            f'Q{x} {pan_y+15} {x+72} {pan_y}" '
            f'fill="none" stroke="#526c6c" stroke-width="4" '
            'stroke-linecap="round"/>'
        )
    if flour:
        parts.append(
            f'<path id="flour-bag" d="M42 {pan_y-12}L44 {pan_y-128} '
            f'Q83 {pan_y-142} 128 {pan_y-128}L131 {pan_y-12}Z" '
            f'fill="#e9dcc4" stroke="#937c61" stroke-width="2.2"/>'
        )
        parts.append(
            f'<text id="flour-label" x="86" y="{pan_y-58}" '
            f'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="20" fill="{NOTEBOOK_INK}">Мука</text>'
        )
    else:
        parts.append(
            f'<path id="bread-loaf" d="M27 {pan_y-15} '
            f'Q27 {pan_y-57} 79 {pan_y-62} '
            f'Q132 {pan_y-59} 145 {pan_y-18}Z" '
            'fill="#d7a76d" stroke="#98734e" stroke-width="2.2"/>'
        )
        for i in range(3):
            x = 62 + i * 23
            parts.append(
                f'<path d="M{x} {pan_y-49}l10 12" fill="none" '
                'stroke="#f3d9a8" stroke-width="3" stroke-linecap="round"/>'
            )
    for i, (label, x) in enumerate(zip(labels, (right-37, right+37))):
        parts.append(
            f'<path id="weight-{i}" d="M{x-29} {pan_y-5} '
            f'L{x-23} {pan_y-55}H{x+23}L{x+29} {pan_y-5}Z" '
            'fill="#a8c9c6" stroke="#526c6c" stroke-width="1.8"/>'
        )
        parts.append(
            f'<path d="M{x-8} {pan_y-55}V{pan_y-63}H{x+8}V{pan_y-55}" '
            f'fill="none" stroke="#526c6c" stroke-width="2"/>'
        )
        parts.append(
            f'<text id="weight-label-{i}" x="{x}" y="{pan_y-15}" '
            'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="25" fill="{NOTEBOOK_INK}">{label}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def unit_rule_svg(asset_id, word, abbreviation):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="rule-frame" x="7" y="7" width="{width-14}" '
        f'height="{height-14}" rx="8" fill="#f5f3ec" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )
    if word == "литр":
        lines = (("Слово «литр»", 35), ("сокращённо", 76),
                 ("записывают л", 117))
        font_size = 40
    else:
        lines = ((f"Слово «{word}» сокращённо", 55),
                 (f"записывают {abbreviation}", 101))
        font_size = 30
    for i, (line, y) in enumerate(lines):
        parts.append(
            f'<text id="rule-line-{i}" x="{width/2:g}" y="{y}" '
            'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="{font_size}" fill="{NOTEBOOK_INK}">{line}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def minus_fourteen_frame_svg():
    width, height = dimensions("p092_frame_minus_14")
    parts = start_svg(width, height)
    parts.append(
        '<rect id="number-frame" x="8" y="8" width="258" height="151" '
        f'rx="4" fill="#fcfbf7" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for row, (values, y) in enumerate((((16, 18, 20), 61), ((15, 19, 17), 123))):
        for column, (value, x) in enumerate(zip(values, (50, 136, 222))):
            parts.append(
                f'<text id="frame-cell-{row}-{column}" x="{x}" y="{y}" '
                'text-anchor="middle" font-family="Andika_700Bold" '
                f'font-size="31" fill="{NOTEBOOK_INK}">{value}</text>'
            )
    parts.append(
        f'<text id="frame-operation" x="276" y="100" '
        f'font-family="Andika_700Bold" font-size="32" '
        f'fill="{NOTEBOOK_INK}">−14</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def bottle_svg():
    width, height = dimensions("p093_bottle")
    parts = start_svg(width, height)
    parts.append(
        '<path id="bottle-body" d="M42 18H71V75 '
        'Q71 87 90 104 Q105 119 105 145V282 '
        'Q105 302 85 302H28 Q8 302 8 282V145 '
        'Q8 119 23 104 Q42 87 42 75Z" '
        'fill="#e5efed" fill-opacity="0.7" '
        'stroke="#526c6c" stroke-width="2.5"/>'
    )
    parts.append(
        '<rect id="bottle-screw-cap" x="38" y="7" width="37" height="19" '
        'rx="3" fill="#a8c9c6" stroke="#526c6c" stroke-width="2"/>'
    )
    for i, y in enumerate((164, 225)):
        parts.append(
            f'<path id="bottle-rib-{i}" d="M13 {y}Q56 {y+6} 100 {y}" '
            'fill="none" stroke="#8aa6a4" stroke-width="3.2"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def glass_svg():
    width, height = dimensions("p093_glass")
    parts = start_svg(width, height)
    parts.append(
        '<path id="glass-body" d="M10 11H67L60 106 '
        'Q39 113 17 106Z" fill="#e5efed" fill-opacity="0.7" '
        'stroke="#526c6c" stroke-width="2.2"/>'
    )
    parts.append(
        '<ellipse id="glass-rim" cx="38.5" cy="11" rx="28.5" ry="5" '
        'fill="#fcfbf7" stroke="#526c6c" stroke-width="2"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def measuring_mug_svg():
    width, height = dimensions("p093_one_liter_mug")
    parts = start_svg(width, height)
    parts.append(
        '<path id="mug-body" d="M17 22H104V160 '
        'Q61 173 17 160Z" fill="#e5efed" fill-opacity="0.82" '
        'stroke="#526c6c" stroke-width="2.4"/>'
    )
    parts.append(
        '<ellipse id="mug-rim" cx="60.5" cy="22" rx="43.5" ry="10" '
        'fill="#fcfbf7" stroke="#526c6c" stroke-width="2.2"/>'
    )
    parts.append(
        '<path id="mug-handle" d="M104 49H124 Q138 49 138 64V127 '
        'Q138 143 118 143H104" fill="none" '
        'stroke="#526c6c" stroke-width="7" stroke-linecap="round"/>'
    )
    for i, y in enumerate((63, 86, 109, 132)):
        parts.append(
            f'<path id="mug-graduation-{i}" d="M24 {y}H{43 if i%2 else 51}" '
            f'fill="none" stroke="#8aa6a4" stroke-width="2"/>'
        )
    parts.append(
        f'<text id="mug-volume" x="69" y="105" '
        f'text-anchor="middle" font-family="Andika_700Bold" '
        f'font-size="25" fill="{NOTEBOOK_INK}">1 л</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def milk_can_svg(asset_id):
    width, height = dimensions(asset_id)
    known = asset_id == "p094_milk_can_12_l"
    parts = start_svg(width, height)
    x = width * 0.14
    body_w = width * 0.72
    parts.append(
        f'<rect id="can-body" x="{x:g}" y="{height*0.29:g}" '
        f'width="{body_w:g}" height="{height*0.68:g}" rx="13" '
        'fill="#d9e8e9" stroke="#526c6c" stroke-width="2.5"/>'
    )
    parts.append(
        f'<path id="can-shoulder" d="M{x:g} {height*0.39:g} '
        f'Q{width/2:g} {height*0.25:g} {x+body_w:g} {height*0.39:g}" '
        f'fill="none" stroke="#526c6c" stroke-width="2"/>'
    )
    parts.append(
        f'<path id="can-handle" d="M{width*0.30:g} {height*0.29:g} '
        f'V{height*0.09:g} Q{width/2:g} {height*0.01:g} '
        f'{width*0.70:g} {height*0.09:g}V{height*0.29:g}" '
        f'fill="none" stroke="#526c6c" stroke-width="5" '
        'stroke-linejoin="round"/>'
    )
    parts.append(
        f'<rect id="can-cap" x="{width*0.31:g}" y="{height*0.22:g}" '
        f'width="{width*0.38:g}" height="{height*0.08:g}" rx="4" '
        'fill="#a8c9c6" stroke="#526c6c" stroke-width="2"/>'
    )
    if known:
        parts.append(
            f'<text id="can-volume" x="{width/2:g}" y="{height*0.69:g}" '
            f'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="31" fill="{NOTEBOOK_INK}">12 л</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def modern_plough_svg():
    width, height = dimensions("p096_plough")
    parts = start_svg(width, height)
    parts.append(
        '<path id="plough-frame" d="M44 42H282L308 28" '
        'fill="none" stroke="#526c6c" stroke-width="7" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    parts.append(
        '<path id="plough-hitch" d="M282 30L308 23V48L282 53" '
        'fill="none" stroke="#526c6c" stroke-width="4"/>'
    )
    parts.append('<g id="plough-share">')
    for i, x in enumerate((79, 160, 241)):
        parts.append(
            f'<path id="plough-shank-{i}" d="M{x+15} 42L{x-7} 105" '
            'fill="none" stroke="#526c6c" stroke-width="5" '
            'stroke-linecap="round"/>'
        )
        parts.append(
            f'<path id="plough-share-{i}" d="M{x-38} 118 '
            f'Q{x-12} 91 {x+13} 104L{x+35} 131 '
            f'Q{x-3} 146 {x-38} 118Z" fill="#a8c9c6" '
            'stroke="#526c6c" stroke-width="2.3"/>'
        )
    parts.append('</g>')
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def modern_tractor_svg():
    width, height = dimensions("p096_tractor")
    parts = start_svg(width, height)
    parts.append(
        '<path id="tractor-mounted-plough" d="M70 125H24 '
        'L13 146L49 157L70 133" fill="#a8c9c6" '
        'stroke="#526c6c" stroke-width="2.5"/>'
    )
    parts.append(
        '<path id="tractor-body" d="M70 107H278L294 139 '
        'V158H66Z" fill="#9ab4b1" stroke="#526c6c" '
        'stroke-width="2.6" stroke-linejoin="round"/>'
    )
    parts.append(
        '<path id="tractor-cab" d="M104 104V41 '
        'Q104 33 112 33H189L205 104Z" fill="#d9e8e9" '
        'stroke="#526c6c" stroke-width="2.6"/>'
    )
    parts.append(
        '<path id="tractor-window" d="M117 46H181L191 91H117Z" '
        'fill="#f3f8f5" stroke="#526c6c" stroke-width="1.8"/>'
    )
    parts.append(
        '<path id="tractor-exhaust" d="M262 104V67H271" '
        'fill="none" stroke="#526c6c" stroke-width="4" '
        'stroke-linecap="round"/>'
    )
    for i, (x, y, radius) in enumerate(((104, 163, 35), (249, 166, 25))):
        parts.append(
            f'<circle id="tractor-wheel-{i}" cx="{x}" cy="{y}" '
            f'r="{radius}" fill="#59666a" stroke="#364447" stroke-width="2"/>'
        )
        parts.append(
            f'<circle cx="{x}" cy="{y}" r="{radius*0.45:g}" '
            'fill="#d9e8e9" stroke="#526c6c" stroke-width="2"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def paired_berries_svg(asset_id, pairs):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    step = width / pairs
    for i in range(pairs):
        center = step * (i + 0.5) + (0, -3, 4, -2, 2)[i % 5]
        twig_y = (17, 20, 16, 18, 19)[i % 5]
        parts.append(f'<g id="pair-{i}">')
        parts.append(
            f'<path id="twig-{i}" d="M{center-26:.1f} {twig_y} '
            f'Q{center+3:.1f} {twig_y-10} {center+26:.1f} {twig_y+2}" '
            f'fill="none" stroke="{GREEN_EDGE}" '
            'stroke-width="2.2" stroke-linecap="round"/>'
        )
        for j, x in enumerate((center-14, center+13)):
            top = 36 + ((i * 3 + j * 5) % 7) - 3
            parts.append(
                f'<path d="M{x:.1f} {twig_y+2}V{top-1}" fill="none" '
                f'stroke="{GREEN_EDGE}" stroke-width="2"/>'
            )
            parts.append(
                f'<path id="berry-{i}-{j}" d="M{x:.1f} {top} '
                f'C{x-8:.1f} {top-5} {x-16:.1f} {top+1} {x-15:.1f} {top+11} '
                f'C{x-14:.1f} {top+20} {x-5:.1f} {top+32} {x:.1f} {top+36} '
                f'C{x+5:.1f} {top+32} {x+14:.1f} {top+20} {x+15:.1f} {top+11} '
                f'C{x+16:.1f} {top+1} {x+8:.1f} {top-5} {x:.1f} {top}Z" '
                'fill="#c97475" stroke="#965c60" stroke-width="1.4"/>'
            )
            parts.append(
                f'<path id="berry-calyx-{i}-{j}" '
                f'd="M{x-11:.1f} {top+2}L{x-5:.1f} {top-2}L{x:.1f} {top+1} '
                f'L{x+5:.1f} {top-2}L{x+11:.1f} {top+2}L{x+5:.1f} {top+5} '
                f'L{x:.1f} {top+2}L{x-5:.1f} {top+5}Z" '
                f'fill="{GREEN}" stroke="{GREEN_EDGE}" stroke-width="1"/>'
            )
        parts.append('</g>')
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def paired_acorns_svg(asset_id, pairs):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    step = width / pairs
    for i in range(pairs):
        center = step * (i + 0.5) + (0, 3, -4, 2, -2)[i % 5]
        twig_y = (22, 19, 24, 20, 23)[i % 5]
        parts.append(f'<g id="pair-{i}">')
        parts.append(
            f'<path d="M{center-21:.1f} {twig_y}Q{center-2:.1f} {twig_y-13} '
            f'{center+21:.1f} {twig_y+1}" fill="none" stroke="{GREEN_EDGE}" '
            'stroke-width="2" stroke-linecap="round"/>'
        )
        for j, x in enumerate((center-13, center+12)):
            top = 37 + ((i * 4 + j * 5) % 7) - 3
            parts.append(
                f'<path id="acorn-{i}-{j}" d="M{x-8:.1f} {top} '
                f'Q{x:.1f} {top-5} {x+8:.1f} {top} '
                f'Q{x+9:.1f} {top+19} {x:.1f} {top+29} '
                f'Q{x-9:.1f} {top+19} {x-8:.1f} {top}Z" '
                'fill="#b69572" stroke="#7c654f" stroke-width="1.3"/>'
            )
            parts.append(
                f'<path d="M{x-10:.1f} {top+2}Q{x:.1f} {top-15} {x+10:.1f} {top+2}" '
                'fill="#879b75" stroke="#617751" stroke-width="1.2"/>'
            )
        parts.append('</g>')
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def multiplication_two_table_svg():
    width, height = dimensions("p098_table_mult_2")
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="table-frame" x="8" y="8" width="{width-16}" '
        f'height="{height-16}" rx="5" fill="#fcfbf7" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for factor in range(2, 11):
        column = (factor - 2) // 3
        row = (factor - 2) % 3
        x = (32, 180, 326)[column]
        y = (65, 128, 191)[row]
        parts.append(
            f'<text id="factor-{factor}" x="{x}" y="{y}" '
            f'font-family="Andika_700Bold" font-size="35" '
            f'fill="{NOTEBOOK_INK}">2×{factor}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def five_balls_with_prices_svg():
    width, height = dimensions("p099_balls_5_two_rubles")
    parts = start_svg(width, height)
    for i in range(5):
        x = 65 + i * 123
        parts.append(
            f'<circle id="ball-{i}" cx="{x}" cy="51" r="34" '
            'fill="#d9e8e9" stroke="#526c6c" stroke-width="2"/>'
        )
        parts.append(
            f'<path d="M{x-20} 24Q{x} 50 {x-20} 78 '
            f'M{x+20} 24Q{x} 50 {x+20} 78" fill="none" '
            'stroke="#8aa6a4" stroke-width="1.8"/>'
        )
        parts.append(
            f'<rect id="price-tag-{i}" x="{x-25}" y="103" '
            'width="50" height="37" rx="5" fill="#f5f3ec" '
            'stroke="#8aa6a4" stroke-width="1.4"/>'
        )
        parts.append(
            f'<text id="price-{i}" x="{x}" y="132" text-anchor="middle" '
            f'font-family="Andika_700Bold" font-size="30" '
            f'fill="{NOTEBOOK_INK}">2</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def triple_circles_svg(asset_id, groups):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    step = width / groups
    for i in range(groups):
        x = step * (i + 0.5)
        parts.append(f'<g id="triple-{i}">')
        for j, (dx, y) in enumerate(((0, 21), (-18, 54), (18, 54))):
            parts.append(
                f'<circle id="triple-dot-{i}-{j}" cx="{x+dx:.1f}" cy="{y}" '
                f'r="11" fill="none" stroke="{PEN}" stroke-width="2"/>'
            )
        parts.append('</g>')
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def quad_circles_svg(asset_id, groups):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    step = width / groups
    for group in range(groups):
        x = step * (group + 0.5)
        parts.append(f'<g id="quad-{group}">')
        for dot_index, (dx, y) in enumerate(((-17, 25), (17, 25),
                                              (-17, 58), (17, 58))):
            parts.append(
                f'<circle id="quad-dot-{group}-{dot_index}" '
                f'cx="{x+dx:.1f}" cy="{y}" r="11.5" fill="none" '
                f'stroke="{PEN}" stroke-width="2"/>'
            )
        parts.append('</g>')
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def cell_grid_svg(asset_id, rows, columns):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    cell_width = (width - 20) / columns
    cell_height = (height - 20) / rows
    for row in range(rows):
        for column in range(columns):
            x = 10 + column * cell_width
            y = 10 + row * cell_height
            parts.append(
                f'<rect id="cell-{row}-{column}" x="{x:.2f}" y="{y:.2f}" '
                f'width="{cell_width:.2f}" height="{cell_height:.2f}" '
                f'fill="#fcfbf7" stroke="{NOTEBOOK_INK}" stroke-width="1.7"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def unsolved_multiplication_table_svg(asset_id, factor, end):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="table-frame" x="7" y="7" width="{width-14}" '
        f'height="{height-14}" rx="4" fill="#fcfbf7" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )
    count = end - 1
    for i, multiplier in enumerate(range(2, end + 1)):
        x = width * (i + 0.5) / count
        parts.append(
            f'<text id="expression-{i}" x="{x:.1f}" y="{height*0.65:.1f}" '
            'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="36" fill="{NOTEBOOK_INK}">{factor}×{multiplier}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def educational_coin_row_svg(asset_id, denomination, count):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    step = width / count
    radius = min(height * 0.36, step * 0.37)
    for i in range(count):
        x = step * (i + 0.5)
        y = height / 2
        parts.append(
            f'<circle id="coin-{i}" cx="{x:.1f}" cy="{y:.1f}" '
            f'r="{radius:.1f}" fill="#eee8db" stroke="#8c8070" '
            'stroke-width="2.8"/>'
        )
        parts.append(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{radius-7:.1f}" '
            'fill="none" stroke="#c6bbaa" stroke-width="1.6"/>'
        )
        parts.append(
            f'<text id="coin-label-{i}" x="{x:.1f}" y="{y+19:.1f}" '
            'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="58" fill="{NOTEBOOK_INK}">{denomination}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def four_stick_square_svg():
    width, height = dimensions("p103_sticks_square")
    parts = start_svg(width, height)
    for i, (x1, y1, x2, y2) in enumerate((
        (15, 10, 85, 10), (85, 10, 85, 80),
        (85, 80, 15, 80), (15, 80, 15, 10),
    )):
        parts.append(
            f'<line id="stick-{i}" x1="{x1}" y1="{y1}" '
            f'x2="{x2}" y2="{y2}" stroke="#a78665" '
            'stroke-width="6" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def carrot_bunches_svg(asset_id, groups):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    step = width / groups
    for group in range(groups):
        center = step * (group + 0.5)
        parts.append(f'<g id="bunch-{group}">')
        for i, (dx, top, lean) in enumerate((
            (-28, 45, -7), (-15, 49, -3), (-1, 42, 2),
            (14, 47, 6), (28, 44, 9),
        )):
            x = center + dx
            tip = x + lean
            parts.append(
                f'<path id="carrot-{group}-{i}" d="M{x-9:.1f} {top} '
                f'Q{x:.1f} {top-5} {x+9:.1f} {top} '
                f'L{tip+5:.1f} {height-32} Q{tip+3:.1f} {height-17} '
                f'{tip:.1f} {height-8-(i%3)} Q{tip-3:.1f} {height-17} '
                f'{tip-5:.1f} {height-32}Z" '
                f'fill="{("#df985e", "#d88b56", "#e2a267")[i%3]}" '
                'stroke="#a77856" stroke-width="1.5"/>'
            )
            parts.append(
                f'<path d="M{x:.1f} {top-3}Q{center:.1f} 25 '
                f'{center+dx/2:.1f} 16" fill="none" '
                f'stroke="{GREEN_EDGE}" stroke-width="2"/>'
            )
        parts.append(
            f'<path id="bunch-greens-{group}" '
            f'd="M{center-5:.1f} 43Q{center-23:.1f} 29 '
            f'{center-29:.1f} 17Q{center-14:.1f} 14 '
            f'{center-4:.1f} 35Q{center-13:.1f} 14 '
            f'{center-5:.1f} 9Q{center+4:.1f} 18 '
            f'{center+1:.1f} 38Q{center+13:.1f} 14 '
            f'{center+23:.1f} 18Q{center+18:.1f} 31 '
            f'{center+7:.1f} 43Z" fill="#a0b394" '
            f'stroke="{GREEN_EDGE}" stroke-width="1.3"/>'
        )
        parts.append(
            f'<path id="bunch-tie-{group}" d="M{center-34:.1f} 44 '
            f'Q{center:.1f} 39 {center+34:.1f} 44" fill="none" '
            f'stroke="{NOTEBOOK_INK}" stroke-width="3"/>'
        )
        parts.append('</g>')
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def priced_tableware_svg(asset_id, object_name, price):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    if object_name == "spoon":
        parts.extend((
            '<path id="spoon" d="M29 97Q71 81 133 57" fill="none" '
            'stroke="#8b9e9f" stroke-width="13" stroke-linecap="round"/>',
            '<ellipse cx="166" cy="45" rx="34" ry="20" '
            'transform="rotate(-24 166 45)" fill="#d9e8e9" '
            'stroke="#526c6c" stroke-width="2.5"/>',
        ))
    elif object_name == "fork":
        parts.extend((
            '<path id="fork" d="M28 100Q79 86 142 56" fill="none" '
            'stroke="#8b9e9f" stroke-width="12" stroke-linecap="round"/>',
            '<path d="M141 56L192 32M143 59L196 43M145 63L197 54M147 67L195 65" '
            'fill="none" stroke="#526c6c" stroke-width="5" '
            'stroke-linecap="round"/>',
        ))
    else:
        parts.extend((
            '<path id="mug" d="M64 25H152V101Q108 111 64 101Z" '
            'fill="#d9e8e9" stroke="#526c6c" stroke-width="2.5"/>',
            '<ellipse cx="108" cy="25" rx="44" ry="10" fill="#fcfbf7" '
            'stroke="#526c6c" stroke-width="2.3"/>',
            '<path d="M152 46H172Q189 47 189 64V78Q189 95 152 95" '
            'fill="none" stroke="#526c6c" stroke-width="7" '
            'stroke-linecap="round"/>',
        ))
    parts.append(
        f'<rect id="price-tag" x="{width/2-31:.1f}" y="119" width="62" '
        'height="43" rx="5" fill="#f5f3ec" '
        'stroke="#8aa6a4" stroke-width="1.5"/>'
    )
    parts.append(
        f'<text id="price" x="{width/2:.1f}" y="151" '
        'text-anchor="middle" font-family="Andika_700Bold" '
        f'font-size="37" fill="{NOTEBOOK_INK}">{price}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def four_factor_frame_svg():
    width, height = dimensions("p109_frame_mult_7_10")
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="factor-frame" x="8" y="8" width="{width-16}" '
        f'height="{height-16}" rx="5" fill="#fcfbf7" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for i, (label, x, y) in enumerate((
        ("7×2", 35, 75), ("9×2", 175, 75),
        ("8×2", 35, 144), ("10×2", 175, 144),
    )):
        parts.append(
            f'<text id="expression-{i}" x="{x}" y="{y}" '
            f'font-family="Andika_700Bold" font-size="38" '
            f'fill="{NOTEBOOK_INK}">{label}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def six_circles_two_rows_svg():
    width, height = dimensions("p110_circles_3x2")
    parts = start_svg(width, height)
    for row, y in enumerate((33, 83)):
        for column, x in enumerate((32, 80, 128)):
            parts.append(
                f'<circle id="circle-{row}-{column}" cx="{x}" cy="{y}" '
                f'r="19" fill="none" stroke="{PEN}" stroke-width="2.3"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def multiplication_reference_table_svg():
    width, height = dimensions("p110_mult_table_to_20")
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="reference-frame" x="9" y="9" width="{width-18}" '
        f'height="{height-18}" rx="5" fill="#fcfbf7" '
        f'stroke="{FRAME}" stroke-width="2"/>'
    )
    parts.append(
        f'<text id="reference-title" x="{width/2:.1f}" y="50" '
        'text-anchor="middle" font-family="Andika_700Bold" '
        f'font-size="31" fill="{NOTEBOOK_INK}">Таблица умножения до 20</text>'
    )
    groups = (
        (1, range(2, 11), 32, 94), (2, range(2, 11), 218, 94),
        (3, range(2, 7), 406, 94), (4, range(2, 6), 590, 94),
        (5, range(2, 5), 32, 409), (6, range(2, 4), 218, 409),
        (7, (2,), 406, 409), (8, (2,), 406, 440),
        (9, (2,), 590, 409), (10, (2,), 590, 440),
    )
    for factor, multipliers, x, top in groups:
        for row, multiplier in enumerate(multipliers):
            parts.append(
                f'<text id="equation-{factor}-{multiplier}" x="{x}" '
                f'y="{top+row*31}" font-family="Andika_400Regular" '
                f'font-size="30" fill="{NOTEBOOK_INK}">'
                f'{factor}×{multiplier}={factor*multiplier}</text>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def division_frame_svg(asset_id, rows):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(f'<rect id="division-frame" x="7" y="7" width="{width-14}" height="{height-14}" rx="4" fill="#fcfbf7" stroke="{FRAME}" stroke-width="2"/>')
    index = 0
    for row, values in enumerate(rows):
        y = height * (0.48 if row == 0 else 0.80) if len(rows) == 2 else height * 0.66
        for column, value in enumerate(values):
            x = width * (column + 0.5) / len(values)
            parts.append(f'<text id="division-{index}" x="{x:.1f}" y="{y:.1f}" text-anchor="middle" font-family="Andika_700Bold" font-size="{33 if len(values) <= 4 else 29}" fill="{NOTEBOOK_INK}">{value}</text>')
            index += 1
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def division_box_three_svg():
    width, height = dimensions('p116_box_divide_by_3')
    parts = start_svg(width, height)
    parts.append(f'<rect id="number-box" x="8" y="8" width="211" height="139" rx="4" fill="#fcfbf7" stroke="{FRAME}" stroke-width="2"/>')
    for i, (value, x, y) in enumerate(((9,45,63),(12,111,63),(6,178,63),(15,45,123),(18,111,123),(9,178,123))):
        parts.append(f'<text id="box-number-{i}" x="{x}" y="{y}" text-anchor="middle" font-family="Andika_700Bold" font-size="31" fill="{NOTEBOOK_INK}">{value}</text>')
    parts.append(f'<text id="box-operation" x="225" y="96" font-family="Andika_700Bold" font-size="31" fill="{NOTEBOOK_INK}">:3</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def division_box_five_svg():
    width, height = dimensions('p120_box_divide_by_5')
    parts = start_svg(width, height)
    parts.append(f'<rect id="number-box" x="49" y="43" width="72" height="69" rx="4" fill="#fcfbf7" stroke="{FRAME}" stroke-width="2"/>')
    for i, (value, x, y) in enumerate(((10,12,34),(20,126,34),(5,19,143),(15,124,143))):
        parts.append(f'<text id="corner-{i}" x="{x}" y="{y}" font-family="Andika_700Bold" font-size="26" fill="{NOTEBOOK_INK}">{value}</text>')
    parts.append(f'<text id="box-operation" x="85" y="88" text-anchor="middle" font-family="Andika_700Bold" font-size="30" fill="{NOTEBOOK_INK}">:5</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def four_pencil_boxes_svg():
    width, height = dimensions('p116_pencil_boxes')
    parts = start_svg(width, height)
    for i in range(4):
        x = 20 + i * 185
        if i == 0:
            parts.append(f'<path id="open-lid" d="M{x} 61L{x+15} 20H{x+153}L{x+149} 60Z" fill="#e5e5d9" stroke="{FRAME}" stroke-width="2.5"/>')
            parts.append(f'<rect id="open-box" x="{x}" y="69" width="153" height="65" rx="8" fill="#d9e8e9" stroke="{FRAME}" stroke-width="2.5"/>')
            for pencil in range(2):
                px = x + 51 + pencil * 41
                color = '#c97475' if pencil == 0 else '#7baab7'
                parts.append(f'<path id="pencil-{pencil}" d="M{px} 118V64L{px+7} 50L{px+14} 64V118Z" fill="{color}" stroke="{NOTEBOOK_INK}" stroke-width="1.5"/>')
        else:
            parts.append(f'<rect id="closed-box-{i-1}" x="{x}" y="69" width="153" height="65" rx="8" fill="#e7dfcd" stroke="{FRAME}" stroke-width="2.5"/>')
            parts.append(f'<rect x="{x+9}" y="77" width="135" height="47" rx="4" fill="#f3efe5" stroke="#b9b5a7" stroke-width="1.3"/>')
            parts.append(f'<text x="{x+76}" y="107" text-anchor="middle" font-family="Andika_700Bold" font-size="17" fill="{NOTEBOOK_INK}">Карандаши</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def four_erasers_svg():
    width, height = dimensions('p118_fish_hooks')
    parts = start_svg(width, height)
    for i in range(4):
        x = 17 + i * 74
        parts.append(f'<rect id="eraser-{i}" x="{x}" y="37" width="61" height="43" rx="8" fill="#d2b9ad" stroke="#8f766e" stroke-width="2"/>')
        parts.append(f'<path d="M{x+28} 38V79" stroke="#f0e5d6" stroke-width="11"/>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def three_books_svg(asset_id, shared):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    step = width / 3
    for i in range(3):
        x = step * (i+0.5)
        book_w = min(step-25, 116)
        fill = '#8a9ca1' if shared else '#e4dcc6'
        parts.append(f'<path id="book-{i}" d="M{x-book_w/2:.1f} 31H{x+book_w/2:.1f}V94H{x-book_w/2:.1f}Z" fill="{fill}" stroke="{FRAME}" stroke-width="2"/>')
        parts.append(f'<path d="M{x-book_w/2+9:.1f} 36V89M{x-book_w/2+11:.1f} 96H{x+book_w/2+5:.1f}" fill="none" stroke="{FRAME}" stroke-width="1.7"/>')
        if not shared:
            parts.append(f'<text id="book-price-{i}" x="{x:.1f}" y="139" text-anchor="middle" font-family="Andika_700Bold" font-size="29" fill="{NOTEBOOK_INK}">6</text>')
    if shared:
        parts.append(f'<path id="book-brace" d="M16 109Q16 118 27 118H{width/2-16:.1f}Q{width/2:.1f} 118 {width/2:.1f} 130Q{width/2:.1f} 118 {width/2+16:.1f} 118H{width-27}Q{width-16} 118 {width-16} 109" fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2.5"/>')
        parts.append(f'<text id="book-price-0" x="{width/2:.1f}" y="148" text-anchor="middle" font-family="Andika_700Bold" font-size="26" fill="{NOTEBOOK_INK}">6</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def fifteen_cell_strip_svg():
    width, height = dimensions('p119_strip_15_cells')
    parts = start_svg(width, height)
    cell_width = (width-18)/15
    for i in range(15):
        x = 9+i*cell_width
        parts.append(f'<rect id="strip-cell-{i}" x="{x:.2f}" y="10" width="{cell_width:.2f}" height="{height-20}" fill="#fcfbf7" stroke="{FRAME}" stroke-width="1.5"/>')
        if i in (2,5,8,11):
            parts.append(f'<path id="strip-divider-{(i-2)//3}" d="M{x+cell_width:.2f} 10V{height-10}" stroke="{NOTEBOOK_INK}" stroke-width="4"/>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def append_stick_bundle(parts, index, x, y, scale=1):
    parts.append(f'<g id="bundle-{index}" transform="translate({x} {y}) scale({scale})">')
    for stick in range(10):
        sx = 5 + stick * 4.4
        parts.append(f'<line id="bundle-stick-{index}-{stick}" x1="{sx:.1f}" y1="100" x2="{sx+13:.1f}" y2="8" stroke="#a77c51" stroke-width="3.2" stroke-linecap="round"/>')
    parts.append(f'<path d="M4 56Q25 50 55 54L56 64Q25 60 4 66Z" fill="#a8c9c6" stroke="{FRAME}" stroke-width="1.5"/>')
    parts.append('</g>')


def stick_bundles_svg(asset_id, positions, loose=()):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    for i, (x,y,scale) in enumerate(positions):
        append_stick_bundle(parts, i, x, y, scale)
    for i, (x,y) in enumerate(loose):
        parts.append(f'<line id="loose-stick-{i}" x1="{x}" y1="{y+96}" x2="{x+15}" y2="{y+7}" stroke="#a77c51" stroke-width="5" stroke-linecap="round"/>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def numbered_coins_svg(asset_id, values):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    step = width/len(values)
    radius = min(height*0.36, step*0.36)
    for i, value in enumerate(values):
        x = step*(i+0.5); y=height/2
        parts.append(f'<circle id="coin-{i}" cx="{x:.1f}" cy="{y:.1f}" r="{radius:.1f}" fill="#eee8db" stroke="#8c8070" stroke-width="2.5"/>')
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{radius-6:.1f}" fill="none" stroke="#c6bbaa" stroke-width="1.5"/>')
        parts.append(f'<text id="coin-label-{i}" x="{x:.1f}" y="{y+17:.1f}" text-anchor="middle" font-family="Andika_700Bold" font-size="{41 if value>=10 else 53}" fill="{NOTEBOOK_INK}">{value}</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def place_value_rule_svg():
    width, height = dimensions('p127_rule_units_tens_frame')
    parts = start_svg(width, height)
    parts.append(f'<rect id="rule-frame" x="6" y="6" width="{width-12}" height="{height-12}" rx="5" fill="#fcfbf7" stroke="{FRAME}" stroke-width="1.8"/>')
    for i, (line,y) in enumerate((('Единицы пишутся на первом месте справа,',47),('десятки на втором.',88))):
        parts.append(f'<text id="rule-line-{i}" x="{width/2:.1f}" y="{y}" text-anchor="middle" font-family="Andika_700Bold" font-size="27" fill="{NOTEBOOK_INK}">{line}</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def place_value_table_svg():
    width, height = dimensions('p127_table_tens_units_2_4')
    parts = start_svg(width, height)
    parts.append(f'<rect id="place-table" x="7" y="7" width="{width-14}" height="{height-14}" fill="#fcfbf7" stroke="{FRAME}" stroke-width="1.8"/>')
    parts.append(f'<path d="M{width/2:.1f} 7V{height-7}M7 82H{width-7}" stroke="{FRAME}" stroke-width="1.7"/>')
    for i,(label,x) in enumerate((('Десятки',width*.25),('Единицы',width*.75))):
        parts.append(f'<text id="place-heading-{i}" x="{x:.1f}" y="53" text-anchor="middle" font-family="Andika_700Bold" font-size="25" fill="{NOTEBOOK_INK}">{label}</text>')
    for i,(value,x) in enumerate(((2,width*.25),(4,width*.75))):
        parts.append(f'<text id="place-value-{i}" x="{x:.1f}" y="140" text-anchor="middle" font-family="Andika_700Bold" font-size="42" fill="{NOTEBOOK_INK}">{value}</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n", width, height


def missing_forties_svg():
    width,height=dimensions('p128_row_40_50_gaps')
    parts=start_svg(width,height)
    cell=(width-16)/11
    for i,number in enumerate(range(40,51)):
        x=8+i*cell
        parts.append(f'<rect id="number-cell-{i}" x="{x:.2f}" y="10" width="{cell:.2f}" height="{height-20}" fill="#fcfbf7" stroke="{FRAME}" stroke-width="1.7"/>')
        if number not in (43,48,49):
            parts.append(f'<text id="number-{i}" x="{x+cell/2:.2f}" y="65" text-anchor="middle" font-family="Andika_700Bold" font-size="27" fill="{NOTEBOOK_INK}">{number}</text>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def hundred_table_svg():
    width,height=dimensions('p128_table_numbers_1_100')
    parts=start_svg(width,height)
    cell_w=(width-20)/10; cell_h=(height-20)/10
    for i in range(100):
        row,col=divmod(i,10); x=10+col*cell_w; y=10+row*cell_h
        parts.append(f'<rect id="hundred-cell-{i}" x="{x:.1f}" y="{y:.1f}" width="{cell_w:.1f}" height="{cell_h:.1f}" fill="#fcfbf7" stroke="#d1d4d2" stroke-width="1"/>')
        parts.append(f'<text id="hundred-label-{i}" x="{x+cell_w/2:.1f}" y="{y+cell_h*.74:.1f}" text-anchor="middle" font-family="Andika_700Bold" font-size="24" fill="{NOTEBOOK_INK}">{i+1}</text>')
    parts.append(f'<rect id="hundred-frame" x="10" y="10" width="{width-20}" height="{height-20}" fill="none" stroke="{FRAME}" stroke-width="2"/>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def measure_line_svg():
    width,height=dimensions('p129_line_to_measure')
    parts=start_svg(width,height)
    parts.append(f'<line id="measure-line" x1="10" y1="16" x2="{width-10}" y2="16" stroke="{NOTEBOOK_INK}" stroke-width="2.4" stroke-linecap="round"/>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def centimetre_ruler_svg():
    width,height=dimensions('p129_ruler_10_cm')
    parts=start_svg(width,height)
    left,right=35,width-35; step=(right-left)/10
    parts.append(f'<rect id="ruler-body" x="8" y="8" width="{width-16}" height="{height-16}" rx="4" fill="#f5f3ec" stroke="{FRAME}" stroke-width="2"/>')
    parts.append(f'<rect id="first-centimetre" x="{left}" y="81" width="{step:.1f}" height="20" fill="#526c6c"/>')
    parts.append(f'<line x1="{left}" y1="101" x2="{right}" y2="101" stroke="{NOTEBOOK_INK}" stroke-width="2"/>')
    for mm in range(101):
        x=left+mm*step/10
        if mm%10 == 0:
            n=mm//10
            parts.append(f'<line id="cm-tick-{n}" x1="{x:.2f}" y1="58" x2="{x:.2f}" y2="101" stroke="{NOTEBOOK_INK}" stroke-width="2.2"/>')
            parts.append(f'<text id="cm-label-{n}" x="{x:.2f}" y="48" text-anchor="middle" font-family="Andika_700Bold" font-size="25" fill="{NOTEBOOK_INK}">{n}</text>')
        else:
            start=70 if mm%5==0 else 84
            parts.append(f'<line id="mm-tick-{mm}" x1="{x:.2f}" y1="{start}" x2="{x:.2f}" y2="101" stroke="#738388" stroke-width="1"/>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def short_measurement_rule_svg(asset_id, lines):
    width,height=dimensions(asset_id)
    parts=start_svg(width,height)
    parts.append(f'<rect id="rule-frame" x="6" y="6" width="{width-12}" height="{height-12}" rx="4" fill="#fcfbf7" stroke="{FRAME}" stroke-width="1.8"/>')
    for i,line in enumerate(lines):
        y=height*(i+1)/(len(lines)+1)+10
        parts.append(f'<text id="rule-line-{i}" x="{width/2:.1f}" y="{y:.1f}" text-anchor="middle" font-family="Andika_700Bold" font-size="{26 if len(lines)>1 else 31}" fill="{NOTEBOOK_INK}">{line}</text>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def thirty_buttons_svg():
    width,height=dimensions('p131_buttons_30_minus_10')
    parts=start_svg(width,height)
    for row,y in enumerate((31,82,157)):
        for column in range(10):
            x=27+column*55
            parts.append(f'<circle id="button-{row}-{column}" cx="{x}" cy="{y}" r="16" fill="#9aa8a1" stroke="#5c716f" stroke-width="1.8"/>')
            for dx,dy in ((-4,-4),(4,-4),(-4,4),(4,4)):
                parts.append(f'<circle cx="{x+dx}" cy="{y+dy}" r="1.8" fill="#f3efe5"/>')
    parts.append(f'<line id="tens-divider" x1="8" y1="122" x2="{width-8}" y2="122" stroke="{NOTEBOOK_INK}" stroke-width="2.7"/>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def tens_scheme_svg(asset_id, center, corners):
    width,height=dimensions(asset_id)
    parts=start_svg(width,height)
    parts.append(f'<rect id="scheme-frame" x="55" y="15" width="{width-110}" height="{height-30}" rx="3" fill="#fcfbf7" stroke="{FRAME}" stroke-width="1.8"/>')
    parts.append(f'<text id="scheme-operation" x="{width/2:.1f}" y="63" text-anchor="middle" font-family="Andika_700Bold" font-size="29" fill="{NOTEBOOK_INK}">{center}</text>')
    for i,(value,x,y) in enumerate(((corners[0],5,32),(corners[1],width-48,32),(corners[2],5,92),(corners[3],width-48,92))):
        parts.append(f'<text id="scheme-corner-{i}" x="{x}" y="{y}" font-family="Andika_700Bold" font-size="24" fill="{NOTEBOOK_INK}">{value}</text>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def forty_circles_svg():
    width,height=dimensions('p135_circles_40_split_2')
    parts=start_svg(width,height)
    for row,y in enumerate((29,83,164,218)):
        for column in range(10):
            x=28+column*56
            parts.append(f'<circle id="split-circle-{row}-{column}" cx="{x}" cy="{y}" r="14" fill="none" stroke="{PEN}" stroke-width="2"/>')
    parts.append(f'<line id="twenty-divider" x1="12" y1="123" x2="{width-12}" y2="123" stroke="{NOTEBOOK_INK}" stroke-width="2.5"/>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def modern_mower_svg():
    width,height=dimensions('p138_mower_machine')
    parts=start_svg(width,height)
    parts.append('<path id="mower-hitch" d="M276 45H324L339 27" fill="none" stroke="#526c6c" stroke-width="7" stroke-linecap="round"/>')
    parts.append('<rect id="mower-deck" x="24" y="68" width="279" height="58" rx="17" fill="#a8c9c6" stroke="#526c6c" stroke-width="2.5"/>')
    for i,x in enumerate((79,164,249)):
        name='mower-rotor' if i==1 else f'mower-disc-{i}'
        parts.append(f'<circle id="{name}" cx="{x}" cy="97" r="23" fill="#e5efed" stroke="#526c6c" stroke-width="2"/>')
        parts.append(f'<path d="M{x-24} 103H{x+24}" stroke="#8aa6a4" stroke-width="3"/>')
    parts.append('<path d="M75 69L96 37H247L265 69" fill="none" stroke="#526c6c" stroke-width="5"/>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def modern_seeder_svg():
    width,height=dimensions('p138_seeder_machine')
    parts=start_svg(width,height)
    parts.append('<path id="seeder-hitch" d="M283 87H332" fill="none" stroke="#526c6c" stroke-width="7" stroke-linecap="round"/>')
    parts.append('<path id="seed-hopper" d="M52 45H284L268 105H69Z" fill="#d9e8e9" stroke="#526c6c" stroke-width="2.8"/>')
    parts.append('<path d="M69 110H268" stroke="#526c6c" stroke-width="5"/>')
    for i,x in enumerate((89,125,161,197,233,269)):
        parts.append(f'<path id="seed-tube-{i}" d="M{x} 105V160L{x+9} 171" fill="none" stroke="#8aa6a4" stroke-width="3.4" stroke-linecap="round"/>')
    for i,x in enumerate((72,267)):
        parts.append(f'<circle id="seeder-wheel-{i}" cx="{x}" cy="177" r="25" fill="#59666a" stroke="#364447" stroke-width="2"/>')
        parts.append(f'<circle cx="{x}" cy="177" r="10" fill="#d9e8e9"/>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def flowerbeds_svg():
    width,height=dimensions('p141_flowerbeds_round_triangles')
    parts=start_svg(width,height)
    parts.append('<circle id="round-bed" cx="160" cy="92" r="43" fill="#adc2a6" stroke="#617751" stroke-width="2.5"/>')
    for i,points in enumerate(('24,18 117,18 36,71','203,18 296,18 284,71','24,167 117,167 36,114','203,167 296,167 284,114')):
        parts.append(f'<polygon id="triangle-bed-{i}" points="{points}" fill="#adc2a6" stroke="#617751" stroke-width="2.5" stroke-linejoin="round"/>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def rowing_boat_svg():
    width,height=dimensions('p142_rowing_boat')
    parts=start_svg(width,height)
    parts.append('<path id="boat-hull" d="M28 56Q167 79 307 56L281 99Q167 119 54 99Z" fill="#a8c9c6" stroke="#526c6c" stroke-width="3"/>')
    parts.append('<ellipse cx="168" cy="56" rx="139" ry="16" fill="#e5efed" stroke="#526c6c" stroke-width="2.5"/>')
    for i,(x1,y1,x2,y2) in enumerate(((122,56,35,15),(210,56,306,17))):
        parts.append(f'<path id="oar-{i}" d="M{x1} {y1}L{x2} {y2}" stroke="#a78665" stroke-width="6" stroke-linecap="round"/>')
    parts.append('<path d="M38 114Q95 108 145 116M190 116Q245 107 301 114" fill="none" stroke="#8aa6a4" stroke-width="2"/>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def scored_target_svg():
    width,height=dimensions('p142_target_circles_10_20_30')
    parts=start_svg(width,height)
    for i,radius in enumerate((93,64,32)):
        parts.append(f'<circle id="target-ring-{i}" cx="105" cy="101" r="{radius}" fill="{("#f5f3ec","#e5efed","#a8c9c6")[i]}" stroke="{NOTEBOOK_INK}" stroke-width="2.5"/>')
    for i,(value,y) in enumerate(((10,28),(20,66),(30,111))):
        parts.append(f'<text id="target-score-{i}" x="105" y="{y}" text-anchor="middle" font-family="Andika_700Bold" font-size="25" fill="{NOTEBOOK_INK}">{value}</text>')
    parts.append('</svg>')
    return "\n".join(parts)+"\n",width,height


def second_decade_column_svg(asset_id, number):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    for i in range(10):
        parts.append(
            f'<rect id="ten-cell-{i}" x="8" y="{12+i*22}" '
            'width="23" height="22" fill="#d9e8e9" '
            'stroke="#4b5961" stroke-width="1.9"/>'
        )
    for i in range(number - 10):
        row = 10 - (number - 10) + i
        parts.append(
            f'<rect id="unit-cell-{i}" x="31" y="{12+row*22}" '
            'width="23" height="22" fill="#efdcae" '
            'stroke="#4b5961" stroke-width="1.9"/>'
        )
    parts.append(
        f'<text id="column-number" x="32" y="{270 if number <= 15 else 266}" '
        f'text-anchor="middle" font-family="Andika_700Bold" '
        f'font-size="27" fill="{NOTEBOOK_INK}">{number}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def tens_units_table_svg():
    width, height = dimensions("p060_table_tens_units")
    parts = start_svg(width, height)
    parts.append(
        f'<rect x="7" y="9" width="{width-14}" height="101" rx="2" '
        f'fill="none" stroke="{FRAME}" stroke-width="1.8"/>'
    )
    parts.append(
        f'<line id="table-divider" x1="174" y1="9" x2="174" y2="110" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )
    parts.append(
        f'<line x1="7" y1="60" x2="{width-7}" y2="60" '
        f'stroke="{FRAME}" stroke-width="1.8"/>'
    )
    for key, x, title in (
        ("tens", 90, "Десятки."),
        ("units", 258, "Единицы."),
    ):
        parts.append(
            f'<text id="heading-{key}" x="{x}" y="44" '
            f'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="24" fill="{NOTEBOOK_INK}">{title}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def second_decade_gaps_svg():
    width, height = dimensions("p061_strip_11_20_gaps")
    parts = start_svg(width, height)
    shown = {0: 11, 2: 13, 4: 15, 7: 18, 9: 20}
    for i in range(10):
        x = 5 + i * 72
        parts.append(
            f'<rect id="number-cell-{i}" x="{x}" y="10" '
            'width="72" height="62" fill="#fbfaf7" '
            f'stroke="{FRAME}" stroke-width="1.7"/>'
        )
        if i in shown:
            parts.append(
                f'<text id="visible-number-{i}" x="{x+36}" y="53" '
                f'text-anchor="middle" font-family="Andika_700Bold" '
                f'font-size="31" fill="{NOTEBOOK_INK}">{shown[i]}</text>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def title_svg():
    width, height = dimensions("p001_cover_title_frame")
    parts = start_svg(width, height)
    parts += [
        f'<rect x="18" y="22" width="{width-36}" height="{height-44}" '
        f'rx="24" fill="#f1efe9" stroke="#c6cad2" stroke-width="2"/>',
        '<text x="400" y="215" text-anchor="middle" '
        'font-family="Andika_700Bold" font-size="60" fill="#1f2433">'
        'Арифметика · 1 класс</text>',
        '</svg>',
    ]
    return "\n".join(parts) + "\n", width, height


def notebook_grid(width, height, x0=18, y0=20, step=30):
    lines = []
    for x in range(x0, width, step):
        lines.append(f"M{x} 4V{height-4}")
    for y in range(y0, height, step):
        lines.append(f"M4 {y}H{width-4}")
    return (
        f'<path id="notebook-grid" d="{" ".join(lines)}" '
        f'fill="none" stroke="{NOTEBOOK_GRID}" stroke-width="1"/>'
    )


def dashes_dots_svg(asset_id):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=20, y0=height // 2))
    baseline = 50 if height == 95 else 25
    # Each dash occupies one 30 px notebook cell, followed by a dot cell.
    # The last dash intentionally has no following dot, as in both scans.
    for i in range(12):
        x = 50 + i * 60 if height == 95 else 20 + i * 60
        parts.append(
            f'<path id="dash-{i}" d="M{x} {baseline}h27" '
            f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="3.5" '
            'stroke-linecap="round"/>'
        )
        if i < 11:
            parts.append(
                f'<circle id="red-dot-{i}" cx="{x+43}" cy="{baseline}" '
                f'r="3.4" fill="{TEACHER_RED}"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def squares_row_sample_svg():
    width, height = dimensions("p004_squares_row_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=20, y0=18))
    for i in range(10):
        x = 80 + i * 60
        parts.append(
            f'<rect id="square-{i}" x="{x}" y="19" width="30" height="30" '
            f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2.8"/>'
        )
        if i >= 5:
            parts.append(
                f'<path id="diagonal-{i}" d="M{x} 49L{x+30} 19" '
                f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2.8"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def fir_trees_sample_svg():
    width, height = dimensions("p004_fir_trees_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=15, y0=20))
    # Source tiers descend 4, 3, 2 from left to right; every branch pair
    # meets the vertical pencil stroke at a notebook-grid intersection.
    for tree, (x, tiers) in enumerate(((75, 4), (315, 3), (555, 2))):
        top = 20 + (4 - tiers) * 30
        parts.append(
            f'<path id="tree-{tree}-trunk" d="M{x} {top}V169" '
            f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2.8" '
            'stroke-linecap="round"/>'
        )
        for tier in range(tiers):
            apex = top + tier * 30
            parts.append(
                f'<path id="tree-{tree}-tier-{tier}" '
                f'd="M{x-30} {apex+30}L{x} {apex}L{x+30} {apex+30}" '
                f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2.8" '
                'stroke-linejoin="round" stroke-linecap="round"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def addition_table_svg():
    width, height = dimensions("p053_addition_table")
    parts = start_svg(width, height)
    parts.append(
        '<rect id="table-frame" x="8" y="8" width="667" height="667" '
        'rx="4" fill="#fcfbf7" stroke="#6b7280" stroke-width="1.8"/>'
    )
    parts.append(
        '<text id="table-title" x="341.5" y="49" text-anchor="middle" '
        'font-family="Andika_700Bold, sans-serif" font-size="27" '
        'font-weight="700" fill="#1f2433">Таблица сложения.</text>'
    )
    # Three blocks of three columns; each next addend begins one row lower.
    # Fixed-width six-character equations align all answers at the right.
    for addend in range(1, 10):
        block = (addend - 1) // 3
        column = (addend - 1) % 3
        x = (66, 274, 482)[column]
        first_y = (92, 379, 572)[block] + column * 31
        for first in range(1, 11 - addend):
            result = first + addend
            equation = f"{first}+{addend}={' ' if result < 10 else ''}{result}"
            parts.append(
                f'<text id="sum-{addend}-{first}" x="{x}" '
                f'y="{first_y+(first-1)*31}" '
                'font-family="monospace" font-size="24" '
                f'fill="{NOTEBOOK_INK}">{equation}</text>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def writing_strip_five_svg():
    asset_id = "p005_writing_strip_dashes_dots_slashes"
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height))
    # The source's first two rows: four paired dashes, four paired dots,
    # followed by four slanted strokes spanning both rows.
    for i in range(4):
        x = 48 + i * 60
        for row, y in enumerate((32, 86)):
            parts.append(
                f'<path id="p5-dash-{i*2+row}" d="M{x} {y}h29" '
                f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="3.2" '
                'stroke-linecap="round"/>'
            )
            parts.append(
                f'<circle id="p5-black-dot-{i*2+row}" cx="{291+i*60}" '
                f'cy="{y}" r="3.4" fill="{NOTEBOOK_INK}"/>'
            )
        x = 527 + i * 60
        parts.append(
            f'<path id="p5-slash-{i}" d="M{x} 87l23 -57" '
            f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="3.1" '
            'stroke-linecap="round"/>'
        )
    for i in range(12):
        x = 48 + i * 60
        parts.append(
            f'<path id="p5-wave-{i}" d="M{x} 145 '
            f'C{x+8} 136 {x+16} 137 {x+23} 141 '
            f'S{x+37} 146 {x+48} 140" fill="none" '
            f'stroke="{NOTEBOOK_INK}" stroke-width="2.5" '
            'stroke-linecap="round"/>'
        )
        if i < 11:
            parts.append(
                f'<circle id="p5-red-dot-{i}" cx="{x+44}" cy="144" '
                f'r="3.4" fill="{TEACHER_RED}"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def hook_path(x, y):
    """Five curves from the existing page-six tracing hook, in 30 px cells."""
    return (
        f"M{x+15:.2f} {y+12.6:.2f} "
        f"C{x+16.2:.2f} {y+7.2:.2f} {x+21.9:.2f} {y+8.4:.2f} {x+19.8:.2f} {y+14.4:.2f} "
        f"C{x+17.1:.2f} {y+21.6:.2f} {x+5.4:.2f} {y+21.6:.2f} {x+4.8:.2f} {y+12.6:.2f} "
        f"C{x+3.6:.2f} {y+4.2:.2f} {x+12.6:.2f} {y:.2f} {x+18.6:.2f} {y:.2f} "
        f"C{x+31.5:.2f} {y:.2f} {x+30:.2f} {y+12.6:.2f} {x+24:.2f} {y+22.5:.2f} "
        f"C{x+18:.2f} {y+33:.2f} {x+5.1:.2f} {y+46.5:.2f} {x:.2f} {y+60:.2f}"
    )


def writing_strip_six_svg():
    asset_id = "p006_writing_strip_circles_hooks_waves"
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height))
    for i in range(12):
        x = 72 + i * 60
        parts.append(
            f'<circle id="p6-ring-{i}" cx="{x}" cy="38" r="15" '
            f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2.4"/>'
        )
        parts.append(
            f'<circle id="p6-red-dot-{i}" cx="{x}" cy="38" r="3.3" '
            f'fill="{TEACHER_RED}"/>'
        )
        parts.append(
            f'<path id="p6-hook-{i}" d="{hook_path(x-15, 80)}" '
            f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="2.3" '
            'stroke-linecap="round" stroke-linejoin="round"/>'
        )
        parts.append(
            f'<path id="p6-wave-{i}" d="M{x-14} 166 '
            f'C{x-5} 158 {x+2} 160 {x+9} 165 '
            f'S{x+21} 168 {x+28} 162" fill="none" '
            f'stroke="{NOTEBOOK_INK}" stroke-width="2.2" '
            'stroke-linecap="round"/>'
        )
        if i < 11:
            parts.append(
                f'<circle id="p6-teal-dot-{i}" cx="{x+36}" cy="165" '
                f'r="3.1" fill="{NOTEBOOK_TEAL}"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def printed_digit_svg(asset_id, digit, font_size, baseline):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        f'<text x="{width/2}" y="{baseline}" text-anchor="middle" '
        f'font-family="Andika_700Bold" font-size="{font_size}" '
        f'fill="{NOTEBOOK_INK}">{digit}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def digit_one_print_svg():
    return printed_digit_svg("p007_digit_1_print", 1, 70, 73)


def digit_two_print_svg():
    return printed_digit_svg("p008_digit_2_print", 2, 67, 70)


def digit_three_print_svg():
    return printed_digit_svg("p010_digit_3_print", 3, 74, 78)


def digit_four_print_svg():
    return printed_digit_svg("p012_digit_4_print", 4, 70, 73)


def digit_five_print_svg():
    return printed_digit_svg("p014_digit_5_large", 5, 69, 72)


def digit_six_print_svg():
    return printed_digit_svg("p018_digit_6_large", 6, 72, 75)


def digit_seven_print_svg():
    return printed_digit_svg("p022_digit_7_print", 7, 57, 60)


def digit_eight_print_svg():
    return printed_digit_svg("p024_digit_8_print", 8, 67, 70)


def digit_nine_print_svg():
    return printed_digit_svg("p026_digit_9_large", 9, 72, 75)


def digit_ten_print_svg():
    return printed_digit_svg("p028_digit_10_large", "10", 70, 75)


def digit_one_sample_svg():
    width, height = dimensions("p007_digit_1_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=24, y0=13))
    # Exact centerline from src/content/handwrittenDigits.ts, the trace target.
    parts.append(
        f'<polyline points="56,43 79,23 58,83" fill="none" '
        f'stroke="{NOTEBOOK_INK}" stroke-width="3.8" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def digit_two_sample_svg():
    width, height = dimensions("p008_digit_2_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=15, y0=11, step=29))
    # Exact centerline from the digit-2 trace in handwrittenDigits.ts.
    parts.append(
        '<path d="M63 31 C53 52 43 27 62 21 C76 14 78 29 63 47 '
        'L43 77 C53 64 58 79 65 76 C69 75 71 73 73 70" '
        f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="3.5" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def digit_three_sample_svg():
    width, height = dimensions("p010_digit_3_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=18, y0=25))
    # Exact centerline from the digit-3 trace in handwrittenDigits.ts.
    parts.append(
        '<path d="M59 33 C75 17 83 29 75 42 C72 47 64 50 60 50 '
        'C86 48 75 73 63 82 C52 91 45 80 52 76 C57 77 52 81 50 79" '
        f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="3.5" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def digit_four_sample_svg():
    width, height = dimensions("p012_digit_4_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=15, y0=15))
    # The two exact strokes of digit 4 from handwrittenDigits.ts.
    for path in ("M63 19 L47 53 L64 53", "M73 37 L57 75"):
        parts.append(
            f'<path d="{path}" fill="none" stroke="{NOTEBOOK_INK}" '
            'stroke-width="3.5" stroke-linecap="round" '
            'stroke-linejoin="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def digit_five_sample_svg():
    width, height = dimensions("p014_digit_5_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=20, y0=26))
    # Exact centerline from the digit-5 trace in handwrittenDigits.ts.
    parts.append(
        '<path d="M88 27 C77 32 76 28 70 27 L59 47 '
        'C81 36 77 63 60 79 C48 89 44 77 49 74 '
        'C54 73 50 78 49 76" fill="none" '
        f'stroke="{NOTEBOOK_INK}" stroke-width="3.5" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def digit_six_sample_svg():
    width, height = dimensions("p018_digit_6_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=24, y0=29))
    # Exact centerline from the digit-6 trace in handwrittenDigits.ts.
    parts.append(
        '<path d="M85 40 C93 39 87 27 79 33 '
        'C62 44 52 69 57 84 C60 98 75 88 81 70 '
        'C92 45 62 49 56 70" fill="none" '
        f'stroke="{NOTEBOOK_INK}" stroke-width="3.5" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def digit_seven_sample_svg():
    width, height = dimensions("p022_digit_7_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=17, y0=21, step=29))
    # Two exact strokes from the digit-7 trace in handwrittenDigits.ts.
    for path in (
        "M47 32 C54 19 54 32 58 29 C63 32 70 24 74 24 L54 84",
        "M60 48 C51 51 58 57 73 49",
    ):
        parts.append(
            f'<path d="{path}" fill="none" stroke="{NOTEBOOK_INK}" '
            'stroke-width="3.5" stroke-linecap="round" '
            'stroke-linejoin="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def digit_eight_sample_svg():
    width, height = dimensions("p024_digit_8_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=12, y0=11))
    # Exact centerline from the digit-8 trace in handwrittenDigits.ts.
    parts.append(
        '<path d="M55 51 C50 37 63 10 70 26 C78 40 36 56 42 72 '
        'C44 88 65 85 63 65 C62 59 58 55 55 51" fill="none" '
        f'stroke="{NOTEBOOK_INK}" stroke-width="3.5" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def digit_nine_sample_svg():
    width, height = dimensions("p026_digit_9_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=15, y0=13, step=29))
    # Exact centerline from the digit-9 trace in handwrittenDigits.ts.
    parts.append(
        '<path d="M71 27 C67 8 48 28 47 46 C44 66 65 59 71 32 '
        'C66 50 62 68 52 76 C42 84 36 72 44 70 '
        'C49 70 44 76 43 73" fill="none" '
        f'stroke="{NOTEBOOK_INK}" stroke-width="3.5" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def digit_ten_sample_svg():
    width, height = dimensions("p028_digit_10_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=12, y0=10, step=29))
    # The one follows the source sample; the zero is the exact trace target.
    parts.append(
        '<polyline id="sample-one" points="47,39 71,20 51,77" '
        f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="3.5" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    parts.append(
        '<path id="sample-zero" '
        'd="M96 20 C118 14 90 94 75 75 C61 62 83 18 96 20" '
        f'fill="none" stroke="{NOTEBOOK_INK}" stroke-width="3.5" '
        'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def counting_rail_svg(asset_id, active, active_positions=None, parked_start=123):
    width, height = dimensions(asset_id)
    right = width - 16
    middle = height / 2
    parts = start_svg(width, height)
    parts.append(
        f'<path d="M16 {middle:g}H{right} M16 {middle-9.5:g}v19 '
        f'M{right} {middle-9.5:g}v19" '
        f'fill="none" stroke="{FRAME}" stroke-width="2.4" '
        'stroke-linecap="round"/>'
    )
    # The requested number is moved left; the other beads stay grouped right.
    if active_positions is None:
        active_positions = tuple(35 + i * 24 for i in range(active))
    for i in range(10):
        x = active_positions[i] if i < active else parked_start + (i - active) * 24
        color = TEACHER_RED if i < 5 else "#ffffff"
        edge = "#a82f2a" if i < 5 else FRAME
        parts.append(
            f'<circle id="bead-{i}" cx="{x}" cy="{middle:g}" r="12" '
            f'fill="{color}" stroke="{edge}" stroke-width="1.7"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def counting_rail_one_svg():
    return counting_rail_svg("p007_abacus_1", 1)


def counting_rail_two_svg():
    return counting_rail_svg("p008_abacus_2", 2)


def counting_rail_three_svg():
    # Preserve the source's 2 + 1 split inside the active group of three.
    return counting_rail_svg("p010_abacus_3", 3, (35, 59, 111), parked_start=171)


def counting_rail_four_svg():
    # The source groups three beads together and places the fourth apart.
    return counting_rail_svg("p012_abacus_4", 4, (35, 59, 83, 135), parked_start=195)


def counting_rail_five_svg():
    # Four adjacent source beads, then a visibly separate fifth.
    return counting_rail_svg("p014_abacus_5", 5, (35, 59, 83, 107, 175),
                             parked_start=231)


def counting_rail_six_svg():
    # The source has five together and a sixth bead apart.
    return counting_rail_svg("p018_abacus_6", 6,
                             (35, 59, 83, 107, 131, 207), parked_start=247)


def counting_rail_seven_svg():
    # Six source beads touch; the seventh is apart from their cluster.
    return counting_rail_svg("p022_abacus_7", 7,
                             (35, 59, 83, 107, 131, 155, 221),
                             parked_start=269)


def counting_rail_eight_svg():
    # Seven source beads touch; the eighth is apart from their cluster.
    return counting_rail_svg("p024_abacus_8", 8,
                             (35, 59, 83, 107, 131, 155, 179, 245),
                             parked_start=293)


def counting_rail_nine_svg():
    # Eight source beads touch; the ninth is apart, with one bead parked.
    return counting_rail_svg("p026_abacus_9", 9,
                             (35, 59, 83, 107, 131, 155, 179, 203, 290),
                             parked_start=335)


def counting_rail_ten_svg():
    # Nine source beads touch; the tenth is visibly separated.
    return counting_rail_svg("p028_abacus_10", 10,
                             (35, 59, 83, 107, 131, 155, 179, 203, 227, 307))


def mushroom_drawing_svg():
    width, height = dimensions("p007_mushroom_draw")
    parts = start_svg(width, height)
    # One cap and one stem, based on the simple geometry of the drawing task.
    parts.append(
        '<path id="mushroom-stem" d="M41.2 35V57H58.8V35Z" '
        'fill="#f1efe9" stroke="#5a4739" stroke-width="2.4" '
        'stroke-linejoin="round"/>'
    )
    parts.append(
        '<path id="mushroom-cap" d="M23.6 35C27 6 73 6 76.4 35Z" '
        'fill="#d8b78e" stroke="#5a4739" stroke-width="2.4" '
        'stroke-linejoin="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def educational_coin_svg(asset_id, value):
    width, height = dimensions(asset_id)
    center = height / 2
    center_x = width / 2
    radius = round(min(width, height) * 0.39)
    font_size = 62 if radius == 43 else 68
    parts = start_svg(width, height)
    parts.append(
        f'<circle id="coin-body" cx="{center_x:g}" cy="{center:g}" '
        f'r="{radius}" '
        'fill="#eee8db" stroke="#8c8070" stroke-width="2.6"/>'
    )
    parts.append(
        f'<circle cx="{center_x:g}" cy="{center:g}" r="{radius-6}" fill="none" '
        'stroke="#c6bbaa" stroke-width="1.5"/>'
    )
    parts.append(
        f'<text x="{center_x:g}" y="{center+21.5:g}" text-anchor="middle" '
        f'font-family="Andika_700Bold" font-size="{font_size}" '
        f'fill="{NOTEBOOK_INK}">{value}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def educational_coin_one_svg():
    return educational_coin_svg("p007_coin_1_kopek", 1)


def educational_coin_two_svg():
    return educational_coin_svg("p008_coin_2_kopeks", 2)


def educational_coin_three_svg():
    return educational_coin_svg("p010_coin_3_kopeks", 3)


def educational_coin_five_svg():
    return educational_coin_svg("p014_coin_5_kopeks", 5)


def educational_coin_ten_svg():
    return educational_coin_svg("p028_coin_10_kopeks", 10)


def educational_coin_two_page36_svg():
    return educational_coin_svg("p036_coin_2_kopeks", 2)


def educational_coin_three_page36_svg():
    return educational_coin_svg("p036_coin_3_kopeks", 3)


def stick_angles_svg():
    width, height = dimensions("p008_sticks_angle_v")
    parts = start_svg(width, height)
    # Two open figures in source order: a peak, then a trough.
    sticks = ((13, 68, 44, 10), (44, 10, 76, 68),
              (94, 10, 126, 68), (126, 68, 155, 10))
    for i, (x1, y1, x2, y2) in enumerate(sticks):
        parts.append(
            f'<line id="stick-{i}" x1="{x1}" y1="{y1}" '
            f'x2="{x2}" y2="{y2}" stroke="#a78665" '
            'stroke-width="6" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def plum_drawing_svg():
    width, height = dimensions("p008_plums_draw")
    parts = start_svg(width, height)
    for i, x in enumerate((28, 81)):
        parts.append(
            f'<ellipse id="plum-{i}" cx="{x}" cy="53" rx="12" ry="19" '
            'fill="#94727b" stroke="#594a50" stroke-width="2.4"/>'
        )
        parts.append(
            f'<path id="plum-stem-{i}" d="M{x} 34 Q{x-3} 17 {x-18} 13" '
            'fill="none" stroke="#876a4b" stroke-width="2.6" '
            'stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def writing_strip_nine_svg():
    width, height = dimensions("p009_writing_strip_squares_rects")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=20, y0=20))
    # One cell, a horizontal pair, a vertical pair, and one cell.
    cells = ((50, 50), (140, 50), (170, 50),
             (260, 20), (260, 50), (340, 50))
    for i, (x, y) in enumerate(cells):
        parts.append(
            f'<rect id="p9-cell-{i}" x="{x}" y="{y}" '
            f'width="30" height="30" fill="none" '
            f'stroke="{NOTEBOOK_INK}" stroke-width="2.5"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def cherry_drawing_svg():
    width, height = dimensions("p010_cherries_draw")
    parts = start_svg(width, height)
    for i, x in enumerate((32, 82, 132)):
        parts.append(
            f'<circle id="cherry-{i}" cx="{x}" cy="59" r="12" '
            'fill="#a66b68" stroke="#724c4c" stroke-width="2.3"/>'
        )
        parts.append(
            f'<path id="cherry-stem-{i}" d="M{x} 47 Q{x-2} 24 {x-11} 15" '
            'fill="none" stroke="#728059" stroke-width="2.6" '
            'stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def stick_triangles_svg():
    width, height = dimensions("p010_sticks_triangles")
    parts = start_svg(width, height)
    # Three individual sticks per triangle: first points up, second down.
    sticks = ((12, 68, 45, 10), (45, 10, 78, 68), (78, 68, 12, 68),
              (102, 11, 168, 11), (168, 11, 135, 68), (135, 68, 102, 11))
    for i, (x1, y1, x2, y2) in enumerate(sticks):
        parts.append(
            f'<line id="stick-{i}" x1="{x1}" y1="{y1}" '
            f'x2="{x2}" y2="{y2}" stroke="#a78665" '
            'stroke-width="6" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def squares_two_plus_one_svg():
    width, height = dimensions("p011_three_squares_2_1")
    parts = start_svg(width, height)
    for i, (x, y, color, edge) in enumerate((
        (15, 12, GREEN, GREEN_EDGE),
        (15, 50, GREEN, GREEN_EDGE),
        (50, 50, "#c4695c", "#9c5148"),
    )):
        parts.append(
            f'<rect id="square-{i}" x="{x}" y="{y}" width="22" '
            f'height="22" rx="2" fill="{color}" stroke="{edge}" '
            'stroke-width="1.8"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def balls_composite_row_svg():
    width, height = dimensions("p011_balls_row_3_groups")
    parts = start_svg(width, height)
    # Source centers keep the near pair on the outside of each three-ball set:
    # (2 + 1) | (1 + 2). Draw the upper right ball behind its lower neighbor.
    balls = (
        ("left", 0, 65, 48, "#91ad79", "#6b8e65"),
        ("left", 1, 111, 101, "#d4ac6d", "#a78053"),
        ("left", 2, 244, 93, "#78a6aa", "#5e858a"),
        ("right", 0, 491, 94, "#c59684", "#9f7469"),
        ("right", 2, 706, 60, "#a4b488", "#788d6b"),
        ("right", 1, 635, 99, "#b693a8", "#8d7085"),
    )
    for _, _, x, y, _, _ in balls:
        parts.append(
            f'<ellipse cx="{x+9}" cy="{y+42}" rx="34" ry="7" '
            'fill="#7f9c9a" opacity="0.16"/>'
        )
    for side, index, x, y, fill, edge in balls:
        parts.append(
            f'<circle id="ball-{side}-{index}" cx="{x}" cy="{y}" '
            f'r="39" fill="{fill}" stroke="{edge}" stroke-width="2.3"/>'
        )
        parts.append(
            f'<path d="M{x-27} {y-27} Q{x+4} {y-8} {x+27} {y+27} '
            f'M{x-37} {y+7} Q{x-2} {y-7} {x+37} {y-7}" '
            'fill="none" stroke="#f0e9dc" stroke-width="2.8" '
            'stroke-linecap="round" opacity="0.78"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def writing_strip_eleven_svg():
    width, height = dimensions("p011_writing_strip_squares_rects")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=20, y0=20))
    groups = (
        ((20, 80),),
        ((110, 80), (140, 80)),
        ((230, 80), (260, 80), (290, 80)),
        ((380, 20), (380, 50), (380, 80)),
        ((470, 50), (470, 80)),
        ((560, 80),),
    )
    for group, cells in enumerate(groups):
        for i, (x, y) in enumerate(cells):
            parts.append(
                f'<rect id="p11-cell-{group}-{i}" x="{x}" y="{y}" '
                f'width="30" height="30" fill="none" '
                f'stroke="{NOTEBOOK_INK}" stroke-width="2.5"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def flags_drawing_svg():
    width, height = dimensions("p012_flags_draw_sample")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=15, y0=20))
    poles = (45, 135, 225, 405)
    fills = ("#73a6a4", "#c7a15a", "#9689ae", "#c18478")
    for i, (x, color) in enumerate(zip(poles, fills)):
        parts.append(
            f'<line id="flag-pole-{i}" x1="{x}" y1="28" '
            f'x2="{x}" y2="114" stroke="{NOTEBOOK_INK}" '
            'stroke-width="2.8"/>'
        )
        if i < 3:
            path = f"M{x} 28H{x+60}L{x+47} 42.5L{x+60} 57H{x}Z"
        else:
            path = "M405 28H345L358 42.5L345 57H405Z"
        parts.append(
            f'<path id="flag-{i}" d="{path}" fill="{color}" '
            f'stroke="{NOTEBOOK_INK}" stroke-width="2" '
            'stroke-linejoin="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def stick_square_svg():
    width, height = dimensions("p012_sticks_square")
    parts = start_svg(width, height)
    sticks = ((10, 12, 60, 12), (60, 12, 60, 62),
              (60, 62, 10, 62), (10, 62, 10, 12))
    for i, (x1, y1, x2, y2) in enumerate(sticks):
        parts.append(
            f'<line id="stick-{i}" x1="{x1}" y1="{y1}" '
            f'x2="{x2}" y2="{y2}" stroke="#a78665" '
            'stroke-width="5.5" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def plums_frame_svg(asset_id, centers):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="plum-frame" x="10" y="12" width="{width-20}" '
        f'height="{height-24}" rx="3" fill="none" '
        f'stroke="{NOTEBOOK_INK}" stroke-width="2.5"/>'
    )
    parts.append(
        f'<path id="plum-branch" d="M17 45 Q{width//2} 27 {width-16} 45" '
        'fill="none" stroke="#8d7560" stroke-width="3" '
        'stroke-linecap="round"/>'
    )
    for leaf, x in enumerate((width//4, width*3//4)):
        parts.append(
            f'<path id="plum-leaf-{leaf}" d="M{x} 43 '
            f'Q{x-23} 30 {x-30} 46 Q{x-14} 57 {x} 43Z" '
            'fill="#a7b38b" stroke="#788965" stroke-width="1.5"/>'
        )
    for i, (x, y) in enumerate(centers):
        parts.append(
            f'<path id="plum-stem-{i}" d="M{x} {y-27} Q{x+4} 56 {x+2} 42" '
            'fill="none" stroke="#8d7560" stroke-width="2.3" '
            'stroke-linecap="round"/>'
        )
        parts.append(
            f'<ellipse id="plum-{i}" cx="{x}" cy="{y}" rx="18" ry="27" '
            'fill="#8d778d" stroke="#66596d" stroke-width="2.2"/>'
        )
        parts.append(
            f'<path d="M{x-7} {y-15} Q{x-12} {y} {x-5} {y+15}" '
            'fill="none" stroke="#c3b3bd" stroke-width="2" '
            'opacity="0.55" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def plums_frame_one_svg():
    return plums_frame_svg("p013_plums_frame_1",
                           ((34, 117), (74, 124), (110, 101), (196, 117)))


def plums_frame_two_svg():
    return plums_frame_svg("p013_plums_frame_2",
                           ((43, 135), (75, 121), (165, 126), (200, 119)))


def plums_frame_three_svg():
    return plums_frame_svg("p013_plums_frame_3",
                           ((48, 115), (130, 126), (165, 128), (200, 112)))


def squares_two_and_two_svg():
    width, height = dimensions("p013_squares_2_2")
    parts = start_svg(width, height)
    for i, (x, y, fill, edge) in enumerate((
        (17, 10, GREEN, GREEN_EDGE), (53, 10, "#c4695c", "#9c5148"),
        (17, 39, GREEN, GREEN_EDGE), (53, 39, "#c4695c", "#9c5148"),
    )):
        parts.append(
            f'<rect id="square-{i}" x="{x}" y="{y}" width="20" '
            f'height="20" rx="2" fill="{fill}" stroke="{edge}" '
            'stroke-width="1.8"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def apples_drawing_svg():
    width, height = dimensions("p014_apples_draw")
    parts = start_svg(width, height)
    for i, x in enumerate((27, 79, 131, 183, 235)):
        parts.append(
            f'<path id="apple-{i}" d="M{x} 22 '
            f'C{x-12} 15 {x-19} 24 {x-16} 38 '
            f'C{x-14} 52 {x-6} 55 {x} 51 '
            f'C{x+6} 55 {x+14} 52 {x+16} 38 '
            f'C{x+19} 24 {x+12} 15 {x} 22Z" '
            'fill="#c18470" stroke="#956355" stroke-width="2"/>'
        )
        parts.append(
            f'<path id="apple-stem-{i}" d="M{x} 23 Q{x+1} 14 {x+6} 10" '
            'fill="none" stroke="#746e52" stroke-width="2.2" '
            'stroke-linecap="round"/>'
        )
        parts.append(
            f'<path d="M{x+3} 16 Q{x+11} 9 {x+15} 12 '
            f'Q{x+10} 18 {x+3} 16Z" fill="#93a77a"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def star_points(outer, inner):
    points = []
    for i in range(10):
        angle = -pi / 2 + i * pi / 5
        radius = outer if i % 2 == 0 else inner
        points.append(f"{radius*cos(angle):.1f},{radius*sin(angle):.1f}")
    return " ".join(points)


def five_stars_svg():
    width, height = dimensions("p014_five_stars")
    parts = start_svg(width, height)
    points = star_points(25, 11)
    for i, (x, y) in enumerate(((46, 34), (172, 34), (299, 34),
                                (108, 88), (236, 88))):
        parts.append(
            f'<polygon id="star-{i}" points="{points}" '
            f'transform="translate({x} {y})" fill="#c06b63" '
            'stroke="#8f514a" stroke-width="2" stroke-linejoin="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def star_outline_svg():
    width, height = dimensions("p014_star_outline")
    parts = start_svg(width, height)
    parts.append(
        f'<polygon id="star-outline" points="{star_points(42, 19)}" '
        'transform="translate(60 53)" fill="none" '
        f'stroke="{NOTEBOOK_INK}" stroke-width="2.8" '
        'stroke-linejoin="round"/>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def nut_body_svg(identity, x, y, with_husk=False, radius=(14, 17)):
    rx, ry = radius
    parts = [
        f'<ellipse id="{identity}" cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" '
        'fill="#b18a66" stroke="#806248" stroke-width="2"/>'
    ]
    if with_husk:
        parts.append(
            f'<path id="nut-husk-{identity.split("-")[-1]}" '
            f'd="M{x-14} {y-9} Q{x-14} {y-21} {x-3} {y-14} '
            f'Q{x} {y-24} {x+5} {y-14} '
            f'Q{x+16} {y-20} {x+14} {y-7} '
            f'Q{x} {y-15} {x-14} {y-9}Z" '
            'fill="#9baa7d" stroke="#718366" stroke-width="1.5"/>'
        )
    return parts


def nuts_frame_svg(asset_id, centers):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    parts.append(
        f'<rect id="nut-frame" x="8" y="8" width="{width-16}" '
        f'height="{height-16}" rx="3" fill="none" '
        f'stroke="{NOTEBOOK_INK}" stroke-width="2.4"/>'
    )
    for i, (x, y) in enumerate(centers):
        parts.extend(nut_body_svg(f"nut-{i}", x, y, with_husk=True))
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def nuts_frame_one_svg():
    return nuts_frame_svg("p015_nuts_frame_1",
                          ((33, 60), (66, 45), (47, 102), (123, 71), (140, 108)))


def nuts_frame_two_svg():
    return nuts_frame_svg("p015_nuts_frame_2",
                          ((30, 60), (67, 42), (135, 68), (103, 108), (146, 108)))


def nuts_frame_three_svg():
    return nuts_frame_svg("p015_nuts_frame_3",
                          ((53, 38), (34, 75), (76, 65), (57, 108), (148, 93)))


def nuts_frame_four_svg():
    return nuts_frame_svg("p015_nuts_frame_4",
                          ((48, 113), (90, 53), (140, 38), (100, 86), (140, 111)))


def nuts_columns_svg():
    width, height = dimensions("p015_nuts_columns_1_5")
    parts = start_svg(width, height)
    # Five bottom-aligned columns of 1, 2, 3, 4, 5 (15 nuts in all).
    for col, x in enumerate((44, 102, 160, 226, 292)):
        count = col + 1
        for row in range(count):
            y = 184 - (count - row - 1) * 37
            parts.extend(nut_body_svg(f"column-nut-{col}-{row}", x, y,
                                      radius=(12, 14)))
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def squares_four_plus_one_svg():
    width, height = dimensions("p015_squares_4_1")
    parts = start_svg(width, height)
    squares = (
        (16, 10, "#c18470", "#946555"),
        (54, 10, "#c18470", "#946555"),
        (16, 45, "#c18470", "#946555"),
        (54, 45, "#c18470", "#946555"),
        (113, 45, GREEN, GREEN_EDGE),
    )
    for i, (x, y, fill, edge) in enumerate(squares):
        parts.append(
            f'<rect id="square-{i}" x="{x}" y="{y}" width="20" '
            f'height="20" rx="2" fill="{fill}" stroke="{edge}" '
            'stroke-width="1.8"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def arithmetic_cards_svg(asset_id, first, operation, complete):
    width, height = dimensions(asset_id)
    labels = [str(first), operation, "1", "="]
    positions = [12, 64, 116, 168]
    if complete:
        labels.append(str(first + (1 if operation == "+" else -1)))
        positions = [9, 62, 115, 168, 221]
    y = (height - 40) // 2
    parts = start_svg(width, height)
    for i, (x, label) in enumerate(zip(positions, labels)):
        parts.append(
            f'<rect id="card-{i}" x="{x}" y="{y}" width="40" '
            'height="40" rx="3" fill="#faf8f2" '
            f'stroke="{FRAME}" stroke-width="1.8"/>'
        )
        parts.append(
            f'<text id="card-label-{i}" x="{x+20}" y="{y+31}" '
            'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="31" fill="{NOTEBOOK_INK}">{label}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def addition_cards_svg(asset_id, first, complete):
    return arithmetic_cards_svg(asset_id, first, "+", complete)


def subtraction_cards_svg(asset_id, first):
    return arithmetic_cards_svg(asset_id, first, "−", True)


def handwritten_sums_plus_one_svg():
    width, height = dimensions("p017_handwritten_sums_plus_1")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=19, y0=16, step=31))
    # A four-line copy sample in the same order as the scanned lesson.
    for row in range(4):
        for column, (x, glyph) in enumerate(zip(
            (39, 83, 132, 179, 226),
            (str(row + 1), "+", "1", "=", str(row + 2)),
        )):
            parts.append(
                f'<text id="sum-{row}-{column}" x="{x}" '
                f'y="{70+row*90}" text-anchor="middle" '
                'font-family="Neucha_400Regular" font-size="62" '
                f'fill="{NOTEBOOK_INK}">{glyph}</text>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def sticks_house_svg():
    width, height = dimensions("p018_sticks_house")
    parts = start_svg(width, height)
    # Four square edges plus the two roof slopes, exactly six sticks.
    sticks = ((20, 58, 20, 110), (20, 58, 48, 10),
              (48, 10, 75, 58), (75, 58, 75, 110),
              (75, 110, 20, 110), (20, 58, 75, 58))
    for i, (x1, y1, x2, y2) in enumerate(sticks):
        parts.append(
            f'<line id="stick-{i}" x1="{x1}" y1="{y1}" '
            f'x2="{x2}" y2="{y2}" stroke="#a78665" '
            'stroke-width="5.5" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def sticks_two_triangles_svg():
    width, height = dimensions("p018_sticks_two_triangles")
    parts = start_svg(width, height)
    sticks = ((12, 65, 42, 10), (42, 10, 72, 65), (72, 65, 12, 65),
              (94, 65, 124, 10), (124, 10, 154, 65), (154, 65, 94, 65))
    for i, (x1, y1, x2, y2) in enumerate(sticks):
        parts.append(
            f'<line id="stick-{i}" x1="{x1}" y1="{y1}" '
            f'x2="{x2}" y2="{y2}" stroke="#a78665" '
            'stroke-width="5.5" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def number_cards_one_to_six_svg():
    width, height = dimensions("p019_number_cards_1_6")
    parts = start_svg(width, height)
    # The source's pencil answers 2, 3, 5 are intentionally cleared: these
    # three numbers are the actual answers to the adjacent exercise.
    labels = {0: "1", 3: "4", 5: "6"}
    for i, x in enumerate((10, 94, 177, 260, 343, 426)):
        parts.append(
            f'<rect id="number-card-{i}" x="{x}" y="7" width="56" '
            'height="80" rx="3" fill="#faf8f2" '
            f'stroke="{FRAME}" stroke-width="2.3"/>'
        )
        if i in labels:
            parts.append(
                f'<text id="number-label-{i}" x="{x+28}" y="73" '
                'text-anchor="middle" font-family="Andika_700Bold" '
                f'font-size="61" fill="{NOTEBOOK_INK}">{labels[i]}</text>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def number_cards_one_to_nine_svg():
    width, height = dimensions("p026_number_row_missing")
    parts = start_svg(width, height)
    # Keep the three answer positions blank: 3, 7 and 9.
    labels = {0: "1", 1: "2", 3: "4", 4: "5", 5: "6", 7: "8"}
    for i in range(9):
        x = 10 + i * 82
        parts.append(
            f'<rect id="number-card-{i}" x="{x}" y="9" width="56" '
            'height="82" rx="3" fill="#faf8f2" '
            f'stroke="{FRAME}" stroke-width="2.3"/>'
        )
        if i in labels:
            parts.append(
                f'<text id="number-label-{i}" x="{x+28}" y="75" '
                'text-anchor="middle" font-family="Neucha_400Regular" '
                f'font-size="67" fill="{NOTEBOOK_INK}">{labels[i]}</text>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def number_cards_one_to_ten_svg():
    width, height = dimensions("p028_number_row_missing")
    parts = start_svg(width, height)
    # The even numbers remain visible; 3, 5, 7 and 9 are the answers.
    labels = {0: "1", 1: "2", 3: "4", 5: "6", 7: "8", 9: "10"}
    for i in range(10):
        x = 10 + i * 77
        parts.append(
            f'<rect id="number-card-{i}" x="{x}" y="9" width="56" '
            'height="82" rx="3" fill="#faf8f2" '
            f'stroke="{FRAME}" stroke-width="2.3"/>'
        )
        if i in labels:
            size = 51 if i == 9 else 67
            parts.append(
                f'<text id="number-label-{i}" x="{x+28}" y="75" '
                'text-anchor="middle" font-family="Neucha_400Regular" '
                f'font-size="{size}" fill="{NOTEBOOK_INK}">{labels[i]}</text>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def dots_frame_nine_svg():
    width, height = dimensions("p026_dots_frame_9")
    parts = start_svg(width, height)
    parts.append(frame(width, height))
    centers = tuple((x, 24) for x in (19, 45, 76, 102, 129)) + tuple(
        (x, 48) for x in (19, 45, 76, 102)
    )
    for i, (x, y) in enumerate(centers):
        parts.append(
            f'<circle id="frame-dot-{i}" cx="{x}" cy="{y}" r="5.4" '
            f'fill="{PEN}"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def dots_frame_ten_svg():
    width, height = dimensions("p028_dots_frame_10")
    parts = start_svg(width, height)
    parts.append(frame(width, height))
    centers = tuple((x, y) for y in (26, 53) for x in (20, 46, 75, 101, 129))
    for i, (x, y) in enumerate(centers):
        parts.append(
            f'<circle id="frame-dot-{i}" cx="{x}" cy="{y}" r="5.4" '
            f'fill="{PEN}"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def flags_nine_svg():
    width, height = dimensions("p026_flags_9")
    parts = start_svg(width, height)
    # Three bound groups, each carrying three small red flags.
    centers = (58, 170, 282)
    for group, center in enumerate(centers):
        for local, offset in enumerate((-28, 0, 28)):
            i = group * 3 + local
            x = center + offset
            top = (30, 17, 27)[local]
            parts.append(
                f'<line id="flag-pole-{i}" x1="{x}" y1="{top}" '
                f'x2="{center}" y2="142" stroke="#8e795c" '
                'stroke-width="2.8" stroke-linecap="round"/>'
            )
            if local == 0:
                path = (f"M{x} {top} Q{x-13} {top+1} {x-22} {top+6} "
                        f"Q{x-14} {top+17} {x-20} {top+31} "
                        f"Q{x-7} {top+26} {x} {top+34} Z")
            else:
                path = (f"M{x} {top} Q{x+12} {top-2} {x+22} {top+5} "
                        f"Q{x+15} {top+16} {x+21} {top+30} "
                        f"Q{x+8} {top+24} {x} {top+34} Z")
            parts.append(
                f'<path id="flag-{i}" data-group="{group}" d="{path}" '
                'fill="#c4695c" stroke="#9c5148" stroke-width="1.8"/>'
            )
        parts.append(
            f'<rect x="{center-7}" y="139" width="14" height="12" rx="3" '
            'fill="#c0a684" stroke="#8e795c" stroke-width="1.5"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def squares_four_and_two_svg():
    width, height = dimensions("p019_squares_4_2")
    parts = start_svg(width, height)
    squares = (
        (14, 10, GREEN, GREEN_EDGE), (53, 10, GREEN, GREEN_EDGE),
        (14, 46, GREEN, GREEN_EDGE), (53, 46, GREEN, GREEN_EDGE),
        (118, 10, "#c4695c", "#9c5148"),
        (118, 46, "#c4695c", "#9c5148"),
    )
    for i, (x, y, fill, edge) in enumerate(squares):
        parts.append(
            f'<rect id="square-{i}" x="{x}" y="{y}" width="20" '
            f'height="20" rx="2" fill="{fill}" stroke="{edge}" '
            'stroke-width="1.8"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def squares_four_and_three_svg():
    width, height = dimensions("p023_squares_4_3")
    parts = start_svg(width, height)
    # Four green squares on the left; two red above one red on the right.
    squares = (
        (14, 10, GREEN, GREEN_EDGE), (53, 10, GREEN, GREEN_EDGE),
        (14, 46, GREEN, GREEN_EDGE), (53, 46, GREEN, GREEN_EDGE),
        (114, 10, "#c4695c", "#9c5148"),
        (153, 10, "#c4695c", "#9c5148"),
        (114, 46, "#c4695c", "#9c5148"),
    )
    for i, (x, y, fill, edge) in enumerate(squares):
        parts.append(
            f'<rect id="square-{i}" x="{x}" y="{y}" width="20" '
            f'height="20" rx="2" fill="{fill}" stroke="{edge}" '
            'stroke-width="1.8"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def append_ten_bar_row(parts, blue_count, y, cell_prefix, label_prefix):
    yellow_count = 10 - blue_count
    for i in range(10):
        color = "#7baab7" if i < blue_count else "#e4bd72"
        parts.append(
            f'<rect id="{cell_prefix}-{i}" x="{32+i*45}" y="{y}" '
            f'width="45" height="44" fill="{color}" '
            'stroke="#4b5961" stroke-width="1.5"/>'
        )
    for side, x, count in (("left", 15, blue_count),
                           ("right", 500, yellow_count)):
        parts.append(
            f'<text id="{label_prefix}-{side}" x="{x}" y="{y+35}" '
            'text-anchor="middle" font-family="Andika_700Bold" '
            f'font-size="27" fill="{NOTEBOOK_INK}">{count}</text>'
        )


def ten_bar_svg(asset_id, blue_count):
    width, height = dimensions(asset_id)
    parts = start_svg(width, height)
    append_ten_bar_row(parts, blue_count, 9, "bar-cell", "bar-label")
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def all_ten_bars_svg():
    width, height = dimensions("p029_bars_10_all")
    parts = start_svg(width, height)
    # Source order is 9+1 down to 5+5; each ten-cell row occurs once.
    for row, blue_count in enumerate((9, 8, 7, 6, 5)):
        append_ten_bar_row(parts, blue_count, 13 + row * 90,
                           f"bar-row-{row}-cell", f"bar-row-{row}-label")
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def squares_five_and_five_svg():
    width, height = dimensions("p029_squares_green_red")
    parts = start_svg(width, height)
    # Each color repeats the source's 2 + 1 + 2 layout.
    green = ((14, 11), (70, 11), (42, 40), (14, 69), (70, 69))
    for i, (x, y) in enumerate(green + tuple((x+118, y) for x, y in green)):
        color = GREEN if i < 5 else "#c4695c"
        edge = GREEN_EDGE if i < 5 else "#9c5148"
        parts.append(
            f'<rect id="square-{i}" x="{x}" y="{y}" width="21" '
            f'height="21" rx="2" fill="{color}" stroke="{edge}" '
            'stroke-width="1.8"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def ten_fir_trees_svg():
    width, height = dimensions("p030_fir_trees_10")
    parts = start_svg(width, height)
    for i in range(10):
        parts.append(f'<g id="fir-{i}" transform="translate({41+i*78} 0)">')
        parts.append('<rect x="-3" y="88" width="6" height="16" rx="1" fill="#a78665"/>')
        parts.append(
            f'<path d="M0 10 L-14 39 H-8 L-23 66 H-13 L-30 92 '
            f'H30 L13 66 H23 L8 39 H14 Z" fill="{GREEN}" '
            f'stroke="{GREEN_EDGE}" stroke-width="1.5" stroke-linejoin="round"/>'
        )
        parts.append("</g>")
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def handwritten_subtractions_svg():
    width, height = dimensions("p021_writing_subtract_one")
    parts = start_svg(width, height)
    parts.append(notebook_grid(width, height, x0=18, y0=17, step=31))
    for row in range(5):
        for column, (x, glyph) in enumerate(zip(
            (37, 82, 131, 178, 226),
            (str(row + 2), "−", "1", "=", str(row + 1)),
        )):
            parts.append(
                f'<text id="sub-{row}-{column}" x="{x}" '
                f'y="{73+row*89}" text-anchor="middle" '
                'font-family="Neucha_400Regular" font-size="62" '
                f'fill="{NOTEBOOK_INK}">{glyph}</text>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def sticks_square_triangle_svg():
    width, height = dimensions("p022_sticks_square_triangle")
    parts = start_svg(width, height)
    # Separate figures: four sticks in the square and three in the triangle.
    sticks = ((13, 10, 68, 10), (68, 10, 68, 65),
              (68, 65, 13, 65), (13, 65, 13, 10),
              (120, 65, 151, 10), (151, 10, 183, 65),
              (183, 65, 120, 65))
    for i, (x1, y1, x2, y2) in enumerate(sticks):
        parts.append(
            f'<line id="stick-{i}" x1="{x1}" y1="{y1}" '
            f'x2="{x2}" y2="{y2}" stroke="#a78665" '
            'stroke-width="5.5" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def sticks_two_squares_svg():
    width, height = dimensions("p024_sticks_two_squares")
    parts = start_svg(width, height)
    # Four independent sticks per square; the source leaves a gap between them.
    sticks = (
        (10, 10, 64, 10), (64, 10, 64, 64),
        (64, 64, 10, 64), (10, 64, 10, 10),
        (95, 10, 149, 10), (149, 10, 149, 64),
        (149, 64, 95, 64), (95, 64, 95, 10),
    )
    for i, (x1, y1, x2, y2) in enumerate(sticks):
        parts.append(
            f'<line id="stick-{i}" x1="{x1}" y1="{y1}" '
            f'x2="{x2}" y2="{y2}" stroke="#a78665" '
            'stroke-width="5.5" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def sticks_three_triangles_svg():
    width, height = dimensions("p026_sticks_triangles")
    parts = start_svg(width, height)
    # Nine sticks make three separate closed triangles, without shared edges.
    sticks = (
        (10, 67, 38, 11), (38, 11, 66, 67), (66, 67, 10, 67),
        (85, 67, 113, 11), (113, 11, 141, 67), (141, 67, 85, 67),
        (160, 67, 188, 11), (188, 11, 216, 67), (216, 67, 160, 67),
    )
    for i, (x1, y1, x2, y2) in enumerate(sticks):
        parts.append(
            f'<line id="stick-{i}" x1="{x1}" y1="{y1}" '
            f'x2="{x2}" y2="{y2}" stroke="#a78665" '
            'stroke-width="5.5" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def sticks_star_svg():
    width, height = dimensions("p028_sticks_star")
    parts = start_svg(width, height)
    # Ten separate edges outline a five-pointed star, without diagonals.
    vertices = (
        (53, 10), (65, 39), (97, 40), (73, 61), (82, 94),
        (53, 77), (24, 94), (33, 61), (9, 40), (41, 39),
    )
    for i, (x1, y1) in enumerate(vertices):
        x2, y2 = vertices[(i + 1) % len(vertices)]
        parts.append(
            f'<line id="stick-{i}" x1="{x1}" y1="{y1}" '
            f'x2="{x2}" y2="{y2}" stroke="#a78665" '
            'stroke-width="5.3" stroke-linecap="round"/>'
        )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def maple_leaves_svg():
    width, height = dimensions("p036_two_maple_leaves")
    parts = start_svg(width, height)
    # Two broad lobed contours can be copied by a child without scan texture.
    for i, (x, angle) in enumerate(((45, -8), (131, 8))):
        parts.append(f'<g transform="translate({x} 3) rotate({angle} 0 50)">')
        parts.append(
            f'<path id="maple-leaf-{i}" '
            'd="M0 7 L-8 22 L-19 17 L-17 31 L-31 33 '
            'L-21 43 L-28 55 L-12 53 L0 75 L12 53 '
            'L28 55 L21 43 L31 33 L17 31 L19 17 L8 22 Z" '
            f'fill="#f1efe9" stroke="{GREEN_EDGE}" stroke-width="2.2" '
            'stroke-linejoin="round"/>'
        )
        parts.append(
            f'<line id="leaf-stem-{i}" x1="0" y1="74" x2="0" y2="105" '
            'stroke="#8e795c" stroke-width="2.5" stroke-linecap="round"/>'
        )
        parts.append(
            '<path d="M0 71V29 M0 57L-17 39 M0 57L17 39" '
            'fill="none" stroke="#9aa98e" stroke-width="1.4" '
            'stroke-linecap="round"/>'
        )
        parts.append("</g>")
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def birch_leaves_svg():
    width, height = dimensions("p036_three_birch_leaves")
    parts = start_svg(width, height)
    # A pointed oval with a few visible teeth, in three separate directions.
    for i, (x, angle) in enumerate(((42, -28), (97, 3), (153, 28))):
        parts.append(f'<g transform="translate({x} 5) rotate({angle} 0 49)">')
        parts.append(
            f'<path id="birch-leaf-{i}" '
            'd="M0 7 L-8 18 L-13 17 L-15 28 L-20 29 '
            'L-18 38 L-23 43 L-17 51 L-19 59 L-10 62 '
            'L0 75 L10 62 L19 59 L17 51 L23 43 L18 38 '
            'L20 29 L15 28 L13 17 L8 18 Z" '
            f'fill="#f1efe9" stroke="{GREEN_EDGE}" stroke-width="2" '
            'stroke-linejoin="round"/>'
        )
        parts.append(
            f'<line id="leaf-stem-{i}" x1="0" y1="74" x2="0" y2="106" '
            'stroke="#8e795c" stroke-width="2.4" stroke-linecap="round"/>'
        )
        parts.append(
            '<path d="M0 72V18 M0 43L-13 33 M0 48L13 34" '
            'fill="none" stroke="#9aa98e" stroke-width="1.3" '
            'stroke-linecap="round"/>'
        )
        parts.append("</g>")
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def five_buttons_svg():
    width, height = dimensions("p034_five_buttons")
    parts = start_svg(width, height)
    fills = ("#738388", "#77847a", "#8d7f78", "#7e7b91", "#748a86")
    for i, fill in enumerate(fills):
        x = 27 + i * 54
        parts.append(
            f'<circle id="button-{i}" cx="{x}" cy="30" r="20" '
            f'fill="{fill}" stroke="#4b5961" stroke-width="1.8"/>'
        )
        parts.append(
            f'<circle cx="{x}" cy="30" r="15" fill="none" '
            'stroke="#d6d9d3" stroke-width="1.1" opacity="0.6"/>'
        )
        for hole, (dx, dy) in enumerate(((-4, -4), (4, -4), (-4, 4), (4, 4))):
            parts.append(
                f'<circle id="hole-{i}-{hole}" cx="{x+dx}" cy="{30+dy}" '
                'r="2.2" fill="#f1efe9"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts) + "\n", width, height


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    entries = []
    def register(asset_id, svg, width, height, alt):
        (OUTPUT / f"{asset_id}.svg").write_text(svg)
        entries.append(
            f"  {json.dumps(asset_id)}: {{ kind: 'vector', xml: {json.dumps(svg, ensure_ascii=False)}, "
            f"width: {width}, height: {height}, alt: {json.dumps(alt, ensure_ascii=False)} }},"
        )

    for domino, diagrams in ((True, DOMINO), (False, GREEN_DOTS)):
        for asset_id, rows in diagrams.items():
            svg, width, height = svg_for(asset_id, rows, domino)
            count = sum(map(len, rows))
            kind = "Точки в рамке" if domino else "Зелёные кружки"
            alt = f"{kind}: {count}; по рядам: {', '.join(map(str, map(len, rows)))}"
            register(asset_id, svg, width, height, alt)
    for asset_id, first_count in ADDITION.items():
        svg, width, height = addition_svg(asset_id, first_count)
        register(asset_id, svg, width, height,
                 f"Синие кружки: {first_count}; добавляется один контурный")
    for asset_id, (left, right) in SPLIT_DOMINO.items():
        svg, width, height = split_svg(asset_id, left, right)
        register(asset_id, svg, width, height,
                 f"Карточка: синие точки слева — {len(left)}; контурные справа — {len(right)}")
    for asset_id, (left, right) in EIGHT_SPLITS.items():
        svg, width, height = colored_eight_split_svg(asset_id, left, right)
        register(asset_id, svg, width, height,
                 f"Карточка из восьми точек: {len(left)} красных слева и {len(right)} зелёных справа")
    for asset_id, (left, right) in NINE_SPLITS.items():
        svg, width, height = colored_nine_split_svg(asset_id, left, right)
        register(asset_id, svg, width, height,
                 f"Карточка из девяти точек: {len(left)} красных слева и {len(right)} зелёных справа")
    for blue_count in range(5, 10):
        yellow_count = 10 - blue_count
        asset_id = f"p029_bar_10_{blue_count}_{yellow_count}"
        svg, width, height = ten_bar_svg(asset_id, blue_count)
        register(asset_id, svg, width, height,
                 f"Полоска из десяти клеток: {blue_count} голубых и {yellow_count} жёлтых")
    for asset_id, count in SUBTRACTION.items():
        svg, width, height = subtraction_svg(asset_id, count)
        register(asset_id, svg, width, height,
                 f"Кружки: {count}; крайний справа перечёркнут, остаётся {count-1}")
    for base_count in (2, 4, 6, 8):
        asset_id = f"p031_domino_{base_count}_2"
        svg, width, height = addition_two_domino_svg(asset_id, base_count)
        register(asset_id, svg, width, height,
                 f"Карточка: {base_count} контурных кружков и ещё 2 за перегородкой; всего {base_count+2}")
    for count in (4, 6, 8, 10):
        asset_id = f"p032_circles_{count}_minus_2"
        svg, width, height = subtraction_two_svg(asset_id, count)
        register(asset_id, svg, width, height,
                 f"Кружки: {count}; 2 в правом столбце перечёркнуты, остаётся {count-2}")
    for base_count in (1, 3, 5, 7):
        asset_id = f"p033_domino_{base_count}_plus_2"
        svg, width, height = odd_addition_two_svg(asset_id, base_count)
        register(asset_id, svg, width, height,
                 f"Карточка: {base_count} исходных кружков и 2 добавленных за диагональю; всего {base_count+2}")
    for count in (3, 5, 7, 9):
        asset_id = f"p034_circles_{count}_minus_2"
        svg, width, height = odd_subtraction_two_svg(asset_id, count)
        register(asset_id, svg, width, height,
                 f"Кружки: {count}; 2 крайних в двух рядах перечёркнуты, остаётся {count-2}")
    for base_count in range(1, 8):
        page = "p035" if base_count <= 4 else "p036"
        asset_id = f"{page}_domino_{base_count}_plus_3"
        svg, width, height = addition_three_domino_svg(asset_id, base_count)
        register(asset_id, svg, width, height,
                 f"Карточка: {base_count} исходных кружков и 3 добавленных за разделителем; всего {base_count+3}")
    for count in range(4, 11):
        asset_id = f"p038_circles_{count}_minus_3"
        svg, width, height = subtraction_three_svg(asset_id, count)
        register(asset_id, svg, width, height,
                 f"Кружки: {count}; 3 крайних справа перечёркнуты, остаётся {count-3}")
    for base_count in range(1, 7):
        asset_id = f"p040_domino_{base_count}_plus_4"
        svg, width, height = filled_domino_four_svg(asset_id, base_count)
        register(asset_id, svg, width, height,
                 f"Карточка: {base_count} заполненных точек слева и 4 справа; всего {base_count+4}")
    for asset_id, (remaining, _) in FOUR_SUBTRACTION_LAYOUT.items():
        svg, width, height = subtraction_four_svg(asset_id)
        total = len(remaining) + 4
        register(asset_id, svg, width, height,
                 f"Заполненные точки: {total}; 4 справа перечёркнуты, остаётся {len(remaining)}")
    for asset_id, rows, operation in (
        ("p042_table_plus_4", ((4, 2, 6), (1, 5, 3)), "+4"),
        ("p042_table_minus_4", ((6, 10, 8), (5, 9, 7)), "−4"),
    ):
        svg, width, height = arithmetic_table_four_svg(asset_id, rows, operation)
        register(asset_id, svg, width, height,
                 f"Таблица: {', '.join(map(str, rows[0]))}; "
                 f"{', '.join(map(str, rows[1]))}; операция {operation}")
    for left_count, right_count in (
        (5, 1), (1, 5), (5, 2), (2, 5), (5, 3),
        (3, 5), (5, 4), (4, 5), (5, 5),
    ):
        asset_id = f"p043_domino_{left_count}_plus_{right_count}"
        svg, width, height = filled_domino_five_svg(
            asset_id, left_count, right_count)
        register(asset_id, svg, width, height,
                 f"Карточка: {left_count} заполненных точек слева и "
                 f"{right_count} справа; всего {left_count+right_count}")
    for left_count, right_count in (
        (6, 1), (1, 6), (6, 2), (2, 6),
        (6, 3), (3, 6), (6, 4), (4, 6),
    ):
        asset_id = f"p046_domino_{left_count}_plus_{right_count}"
        svg, width, height = filled_domino_six_svg(
            asset_id, left_count, right_count)
        register(asset_id, svg, width, height,
                 f"Карточка: {left_count} заполненных точек слева и "
                 f"{right_count} справа; всего {left_count+right_count}")
    for asset_id, (outline, filled) in SEVEN_DOMINO_LAYOUT.items():
        svg, width, height = seven_group_domino_svg(asset_id)
        register(asset_id, svg, width, height,
                 f"Счётная рамка: {len(outline)} контурных и "
                 f"{len(filled)} заполненных точек; всего {len(outline)+len(filled)}")
    svg, width, height = saucer_cup_prices_svg()
    register("p050_saucer_cup_prices", svg, width, height,
             "Блюдце с ценой 3 и чашка с ценой 7")
    for first_count, second_count in (
        (8, 1), (1, 8), (8, 2), (2, 8),
    ):
        asset_id = f"p051_domino_{first_count}_plus_{second_count}"
        svg, width, height = eight_group_domino_svg(
            asset_id, first_count, second_count)
        register(asset_id, svg, width, height,
                 f"Карточка: {first_count} точек слева и "
                 f"{second_count} справа; 8 контурных, "
                 f"{first_count+second_count-8} заполненных")
    for first_count, second_count in ((9, 1), (1, 9)):
        asset_id = f"p052_domino_{first_count}_plus_{second_count}"
        svg, width, height = nine_group_domino_svg(asset_id, first_count)
        register(asset_id, svg, width, height,
                 f"Карточка: {first_count} точек и {second_count} точек; "
                 "9 контурных, 1 заполненная, разделены косой линией")
    svg, width, height = addition_table_svg()
    register("p053_addition_table", svg, width, height,
             "Таблица сложения: 45 равенств от 1 + 1 до 1 + 9, девять столбцов")
    svg, width, height = meter_abbreviation_rule_svg()
    register("p054_rule_meter_abbrev", svg, width, height,
             "Слово „метр“ сокращённо записывают м")
    svg, width, height = four_operation_columns_svg()
    register("p056_columns_plus4_minus4_plus5_minus5", svg, width, height,
             "Упражнение 183: четыре столбца чисел "
             "4, 6, 3, 5 +4; 6, 9, 7, 10 −4; "
             "3, 5, 2, 4 +5; 10, 8, 7, 9 −5")
    for asset_id, operation, outer in (
        ("p057_circle_plus6", "+6", (3, 2, 4)),
        ("p057_circle_minus6", "−6", (10, 7, 9)),
        ("p057_circle_plus7", "+7", (1, 3, 2)),
        ("p057_circle_minus7", "−7", (9, 8, 7)),
    ):
        svg, width, height = operation_circle_svg(
            asset_id, operation, outer)
        register(asset_id, svg, width, height,
                 f"Круг: {operation}; числа снаружи: "
                 f"{outer[0]} сверху, {outer[1]} слева, {outer[2]} справа")
    for number in range(11, 21):
        asset_id = f"p059_blocks_{number}"
        svg, width, height = second_decade_blocks_svg(asset_id, number)
        register(asset_id, svg, width, height,
                 f"Кубики: 10 в нижнем ряду и {number-10} сверху; всего {number}")
    svg, width, height = ten_and_six_sticks_svg()
    register("p059_bundle_ten_six_sticks", svg, width, height,
             "Связка из 10 палочек и 6 отдельных — две группы по 3; всего 16")
    for number in range(11, 21):
        asset_id = f"p060_columns_{number}"
        svg, width, height = second_decade_column_svg(asset_id, number)
        register(asset_id, svg, width, height,
                 f"Число {number}: вертикальный десяток из 10 клеток и "
                 f"{number-10} единиц рядом снизу")
    svg, width, height = tens_units_table_svg()
    register("p060_table_tens_units", svg, width, height,
             "Таблица: Десятки. | Единицы.; нижняя область пуста")
    svg, width, height = second_decade_gaps_svg()
    register("p061_strip_11_20_gaps", svg, width, height,
             "Ряд: 11, пусто, 13, пусто, 15, пусто, пусто, 18, пусто, 20")
    for asset_id, value in (
        ("p062_coin_10_kopeks", 10),
        ("p062_coin_2_kopeks", 2),
    ):
        svg, width, height = educational_coin_svg(asset_id, value)
        register(asset_id, svg, width, height,
                 f"Учебная монета с числом {value}")
    for asset_id, groups in SECOND_DECADE_STICK_GROUPS.items():
        svg, width, height = second_decade_sticks_svg(asset_id)
        register(asset_id, svg, width, height,
                 f"Связка из 10 палочек и отдельные группы: "
                 f"{', '.join(map(str, map(len, groups)))}")
    svg, width, height = buttons_ten_plus_five_svg()
    register("p063_buttons_frame_10_5", svg, width, height,
             "В рамке 10 пуговиц слева и 5 справа, всего 15")
    svg, width, height = partition_circles_svg("p065_circles_frame_15_5")
    register("p065_circles_frame_15_5", svg, width, height,
             "В рамке слева 10 пустых кружков, справа 5 пустых и 5 заполненных")
    svg, width, height = two_rail_five_six_svg()
    register("p067_abacus_5_and_6", svg, width, height,
             "Две счётные линейки: сверху 5 бусин, снизу те же 5 и ещё одна отдельно")
    svg, width, height = partition_circles_svg("p072_circles_frame_20_minus_5", crossed=True)
    register("p072_circles_frame_20_minus_5", svg, width, height,
             "В рамке 20 кружков, 5 справа снизу зачёркнуты; остаётся 15")
    for asset_id, lines in SECOND_DECADE_SOLUTIONS.items():
        svg, width, height = second_decade_solution_svg(asset_id)
        register(asset_id, svg, width, height,
                 "Образец решения: " + "; ".join(lines))
    for asset_id, (top, bottom, operation) in SECOND_DECADE_TABLES.items():
        svg, width, height = second_decade_table_svg(asset_id)
        register(asset_id, svg, width, height,
                 f"Таблица: {', '.join(map(str, top))}; "
                 f"{', '.join(map(str, bottom))}; вычесть {operation[1:]}")
    for asset_id, (base, addend) in TEN_BRIDGE_DOMINOES.items():
        svg, width, height = ten_bridge_domino_svg(asset_id)
        register(asset_id, svg, width, height,
                 f"Схема {base} + {addend}: слева {base} светлых и "
                 f"{10-base} тёмных, справа {base+addend-10} тёмных точек")
    for asset_id, lines in TEN_BRIDGE_SAMPLES.items():
        svg, width, height = ten_bridge_sample_svg(asset_id)
        register(asset_id, svg, width, height,
                 "Образец вычисления: " + "; ".join(lines))
    for asset_id, alt in (
        ("p081_deep_plate_7_rub", "Глубокая тарелка с числом 7 на ценнике"),
        ("p081_shallow_plate_rub", "Мелкая тарелка с пустым ценником для ответа"),
    ):
        svg, width, height = plate_with_price_svg(asset_id)
        register(asset_id, svg, width, height, alt)
    for asset_id, (rows, operation) in TEN_BRIDGE_FRAMES.items():
        svg, width, height = ten_bridge_frame_svg(asset_id)
        register(asset_id, svg, width, height,
                 f"Рамка с числами {rows} и общей операцией {operation}")
    svg, width, height = eleven_minus_two_svg()
    register("p084_sticks_11_minus_2", svg, width, height,
             "11 кружков: 10 слева и 1 справа; зачёркнуты два, остаётся 9")
    for asset_id, number in (
        ("p085_pencils_box_12_minus_4", 12),
        ("p086_pencils_box_13_minus_4", 13),
    ):
        svg, width, height = pencils_case_svg(asset_id)
        register(asset_id, svg, width, height,
                 f"Коробка с {number} карандашами: 10 слева и {number-10} "
                 f"справа, четыре зачёркнуты, остаётся {number-4}")
    for asset_id, object_name, weights in (
        ("p089_scales_bread_2kg_1kg", "батон хлеба", "2 кг и 1 кг"),
        ("p089_scales_flour_5kg_1kg", "мешок муки", "5 кг и 1 кг"),
    ):
        svg, width, height = educational_scales_svg(asset_id)
        register(asset_id, svg, width, height,
                 f"Учебные весы: слева {object_name}, справа гири {weights}")
    for asset_id, word, abbreviation in (
        ("p089_rule_kg_frame", "килограмм", "кг"),
        ("p093_rule_liter_abbreviation", "литр", "л"),
    ):
        svg, width, height = unit_rule_svg(asset_id, word, abbreviation)
        register(asset_id, svg, width, height,
                 f"Правило: слово «{word}» сокращённо записывают {abbreviation}")
    svg, width, height = minus_fourteen_frame_svg()
    register("p092_frame_minus_14", svg, width, height,
             "Рамка: верхний ряд 16, 18, 20; нижний 15, 19, 17; вычесть 14")
    for asset_id, draw, alt in (
        ("p093_bottle", bottle_svg, "Прозрачная современная бутылка"),
        ("p093_glass", glass_svg, "Прозрачный стакан"),
        ("p093_one_liter_mug", measuring_mug_svg,
         "Мерная кружка с отметкой 1 л"),
    ):
        svg, width, height = draw()
        register(asset_id, svg, width, height, alt)
    for asset_id, alt in (
        ("p094_milk_can_12_l", "Бидон с надписью 12 л"),
        ("p094_milk_can_unknown", "Бидон без указания объёма"),
    ):
        svg, width, height = milk_can_svg(asset_id)
        register(asset_id, svg, width, height, alt)
    for asset_id, draw, alt in (
        ("p096_plough", modern_plough_svg, "Современный навесной плуг"),
        ("p096_tractor", modern_tractor_svg,
         "Колёсный трактор с навесным плугом"),
    ):
        svg, width, height = draw()
        register(asset_id, svg, width, height, alt)
    for item, pages, counts, draw in (
        ("strawberries", (97,), (2, 3, 4, 5), paired_berries_svg),
        ("acorns", (97,), (6, 7), paired_acorns_svg),
        ("acorns", (98,), (8, 9, 10), paired_acorns_svg),
    ):
        for page in pages:
            for count in counts:
                asset_id = f"p{page:03d}_{item}_2x{count}"
                svg, width, height = draw(asset_id, count)
                object_name = "ягоды" if item == "strawberries" else "жёлуди"
                pair_word = "пары" if count in (2, 3, 4) else "пар"
                register(asset_id, svg, width, height,
                         f"{count} {pair_word}: по 2 {object_name} в каждой, всего {count*2}")
    svg, width, height = multiplication_two_table_svg()
    register("p098_table_mult_2", svg, width, height,
             "Таблица умножения на 2: выражения от 2×2 до 2×10 без ответов")
    svg, width, height = five_balls_with_prices_svg()
    register("p099_balls_5_two_rubles", svg, width, height,
             "Пять мячей; под каждым отдельный ценник только с числом 2")
    for groups in (2, 3):
        asset_id = f"p099_circles_3x{groups}"
        svg, width, height = triple_circles_svg(asset_id, groups)
        register(asset_id, svg, width, height,
                 f"{groups} группы по 3 кружка; всего {groups*3}")
    for groups in (4, 5, 6):
        asset_id = f"p100_circles_3x{groups}"
        svg, width, height = triple_circles_svg(asset_id, groups)
        register(asset_id, svg, width, height,
                 f"{groups} группы по 3 кружка; всего {groups*3}")
    for asset_id, factor, end in (
        ("p100_table_mult_3", 3, 6),
        ("p103_table_mult_4", 4, 5),
        ("p105_table_mult_5", 5, 4),
        ("p107_table_mult_6", 6, 3),
    ):
        svg, width, height = unsolved_multiplication_table_svg(asset_id, factor, end)
        register(asset_id, svg, width, height,
                 f"Выражения от {factor}×2 до {factor}×{end} без ответов")
    for asset_id, rows, columns in (
        ("p101_grid_3x6_cells", 6, 3),
        ("p107_cells_6x2", 2, 6),
        ("p107_cells_6x3", 3, 6),
        ("p110_grid_4x3", 3, 4),
    ):
        svg, width, height = cell_grid_svg(asset_id, rows, columns)
        cell_word = "клетки" if columns in (3, 4) else "клеток"
        register(asset_id, svg, width, height,
                 f"Сетка: {rows} рядов по {columns} {cell_word}, всего {rows*columns}")
    for page, group_counts in ((102, (2, 3)), (103, (4, 5))):
        for groups in group_counts:
            asset_id = f"p{page:03d}_circles_4x{groups}"
            svg, width, height = quad_circles_svg(asset_id, groups)
            register(asset_id, svg, width, height,
                     f"{groups} группы по 4 кружка; всего {groups*4}")
    for asset_id, denomination, count in (
        ("p102_coins_3_kopeks_4", 3, 4),
        ("p105_coins_5_kopeks_3", 5, 3),
    ):
        svg, width, height = educational_coin_row_svg(asset_id, denomination, count)
        register(asset_id, svg, width, height,
                 f"{count} учебные монеты с числом {denomination}; всего {count*denomination}")
    svg, width, height = four_stick_square_svg()
    register("p103_sticks_square", svg, width, height,
             "Квадрат из четырёх отдельных палочек")
    for groups in (2, 3, 4):
        asset_id = f"p105_carrots_5x{groups}"
        svg, width, height = carrot_bunches_svg(asset_id, groups)
        register(asset_id, svg, width, height,
                 f"{groups} пучка по 5 морковок; всего {groups*5}")
    svg, width, height = educational_scales_svg("p106_scales_flour_weights")
    register("p106_scales_flour_weights", svg, width, height,
             "Учебные весы: слева пакет муки, справа две гири по 5 кг")
    for asset_id, object_name, price, alt_object in (
        ("p108_spoon_6_rubles", "spoon", 6, "ложка"),
        ("p108_fork_4_rubles", "fork", 4, "вилка"),
        ("p108_knife_3_rubles", "mug", 3, "кружка"),
    ):
        svg, width, height = priced_tableware_svg(asset_id, object_name, price)
        register(asset_id, svg, width, height,
                 f"Современная {alt_object}, ценник только с числом {price}")
    svg, width, height = four_factor_frame_svg()
    register("p109_frame_mult_7_10", svg, width, height,
             "Рамка: 7×2, 9×2 сверху; 8×2, 10×2 снизу, без ответов")
    svg, width, height = six_circles_two_rows_svg()
    register("p110_circles_3x2", svg, width, height,
             "Шесть пустых кружков: два ряда по три")
    svg, width, height = multiplication_reference_table_svg()
    register("p110_mult_table_to_20", svg, width, height,
             "Таблица умножения до 20: 36 равенств по исходному скану")
    for asset_id, rows in (
        ("p114_frame_div_by_2", (("2:2","6:2","10:2","14:2","18:2"),("4:2","8:2","12:2","16:2","20:2"))),
        ("p115_frame_div_by_3", (("3:3","9:3","15:3"),("6:3","12:3","18:3"))),
        ("p117_frame_div_by_4", (("4:4","8:4","12:4","16:4","20:4"),)),
        ("p119_frame_div_by_5", (("5:5","10:5","15:5","20:5"),)),
        ("p121_frame_division_by_6", (("6:6","12:6","18:6"),)),
        ("p122_frame_division_7_8_9_10", (("7:7","8:8","9:9","10:10"),("14:7","16:8","18:9","20:10"))),
    ):
        svg, width, height = division_frame_svg(asset_id, rows)
        register(asset_id, svg, width, height,
                 "Таблица деления без ответов: " + ", ".join(sum(rows, ())))
    for asset_id, draw, alt in (
        ("p116_box_divide_by_3", division_box_three_svg,
         "Числа 9, 12, 6 и 15, 18, 9: каждое разделить на 3"),
        ("p116_pencil_boxes", four_pencil_boxes_svg,
         "Четыре коробки карандашей: одна открытая с двумя видимыми, три закрыты"),
        ("p118_fish_hooks", four_erasers_svg, "Четыре одинаковых ластика"),
        ("p119_strip_15_cells", fifteen_cell_strip_svg,
         "Пятнадцать клеток, разделённых на пять групп по три"),
        ("p120_box_divide_by_5", division_box_five_svg,
         "Четыре независимых числа 10, 20, 5 и 15 для деления на 5"),
    ):
        svg, width, height = draw()
        register(asset_id, svg, width, height, alt)
    for asset_id, shared, alt in (
        ("p124_three_books_6_rub_each", False,
         "Три книги, под каждой отдельный ценник с числом 6"),
        ("p124_three_books_brace_6_rub", True,
         "Три книги под общей скобкой с числом 6"),
    ):
        svg, width, height = three_books_svg(asset_id, shared)
        register(asset_id, svg, width, height, alt)
    bundle_layouts = (
        ("p126_ten_bundles_of_sticks",
         tuple((10+82*(i%5),13+150*(i//5),1) for i in range(10)), (),
         "Десять связок по десять палочек в два ряда по пять"),
        ("p126_three_bundles_three_sticks",
         ((10,20,1),(91,20,1),(172,20,1)), ((268,20),(310,20),(352,20)),
         "Три связки по десять и три отдельные палочки"),
        ("p127_two_bundles_four_sticks",
         ((8,20,1),(87,20,1)), ((180,20),(220,20),(260,20),(300,20)),
         "Две связки по десять и четыре отдельные палочки, всего 24"),
        ("p130_three_bundles_20_plus_10",
         ((10,17,1),(83,17,1),(210,17,1)), (),
         "Две связки вместе и третья отдельно: 20 плюс 10"),
        ("p134_stick_bundles_3x2",
         ((10,20,1),(75,20,1),(200,20,1),(265,20,1),(390,20,1),(455,20,1)), (),
         "Три раздельные пары связок по десять палочек"),
    )
    for asset_id, bundles, loose, alt in bundle_layouts:
        svg, width, height = stick_bundles_svg(asset_id, bundles, loose)
        register(asset_id, svg, width, height, alt)
    for asset_id, values, alt in (
        ("p127_coins_three_10_kop_one_1_kop", (10,10,10,1),
         "Учебные монеты: три с числом 10 и одна с числом 1, всего 31"),
        ("p134_coin_20_kopeks", (20,), "Учебная монета только с числом 20"),
    ):
        svg, width, height = numbered_coins_svg(asset_id, values)
        register(asset_id, svg, width, height, alt)
    for asset_id, draw, alt in (
        ("p127_rule_units_tens_frame", place_value_rule_svg,
         "Правило: единицы пишут справа на первом месте, десятки на втором"),
        ("p127_table_tens_units_2_4", place_value_table_svg,
         "Таблица: 2 десятка и 4 единицы"),
        ("p128_row_40_50_gaps", missing_forties_svg,
         "Числа от 40 до 50, пустые клетки 43, 48 и 49"),
        ("p128_table_numbers_1_100", hundred_table_svg,
         "Таблица всех чисел от 1 до 100 в десяти рядах по десять"),
        ("p129_line_to_measure", measure_line_svg,
         "Прямой горизонтальный отрезок для измерения"),
        ("p129_ruler_10_cm", centimetre_ruler_svg,
         "Учебная линейка от 0 до 10 сантиметров, первый сантиметр выделен"),
        ("p131_buttons_30_minus_10", thirty_buttons_svg,
         "30 пуговиц: два десятка над линией и один под ней"),
        ("p135_circles_40_split_2", forty_circles_svg,
         "40 кружков: по 20 с каждой стороны разделительной линии"),
        ("p138_mower_machine", modern_mower_svg,
         "Современная навесная роторная косилка"),
        ("p138_seeder_machine", modern_seeder_svg,
         "Современная колёсная сеялка"),
        ("p141_flowerbeds_round_triangles", flowerbeds_svg,
         "План пяти клумб: круглая в центре, четыре треугольные по углам"),
        ("p142_rowing_boat", rowing_boat_svg,
         "Гребная лодка с двумя вёслами"),
        ("p142_target_circles_10_20_30", scored_target_svg,
         "Мишень: 10 снаружи, 20 посередине, 30 в центре"),
    ):
        svg, width, height = draw()
        register(asset_id, svg, width, height, alt)
    for asset_id, lines, alt in (
        ("p129_rule_cm_abbreviation_frame", ("Слово «сантиметр»", "сокращённо пишут см"),
         "Правило: слово сантиметр сокращённо пишут см"),
        ("p129_rule_meter_100_cm_frame", ("В 1 метре", "100 сантиметров."),
         "Правило: в одном метре 100 сантиметров"),
    ):
        svg, width, height = short_measurement_rule_svg(asset_id, lines)
        register(asset_id, svg, width, height, alt)
    for asset_id, center, corners, alt in (
        ("p132_scheme_70_minus", "70−", (20,40,10,30),
         "Схема вычитания из 70: числа 20, 40, 10, 30 по углам"),
        ("p132_scheme_100_minus", "100−", (20,40,10,30),
         "Схема вычитания из 100: числа 20, 40, 10, 30 по углам"),
        ("p132_scheme_30_plus", "30+", (20,50,40,70),
         "Схема сложения с 30: числа 20, 50, 40, 70 по углам"),
    ):
        svg, width, height = tens_scheme_svg(asset_id, center, corners)
        register(asset_id, svg, width, height, alt)
    svg, width, height = title_svg()
    register("p001_cover_title_frame", svg, width, height, "Арифметика · 1 класс")
    for asset_id, draw, alt in (
        ("p003_writing_strip_dashes_dots",
         lambda: dashes_dots_svg("p003_writing_strip_dashes_dots"),
         "Пропись: 12 чёрных чёрточек и 11 красных точек попеременно"),
        ("p004_dashes_dots_line",
         lambda: dashes_dots_svg("p004_dashes_dots_line"),
         "Пропись: 12 чёрных чёрточек и 11 красных точек попеременно"),
        ("p004_fir_trees_sample", fir_trees_sample_svg,
         "Образец: три схематические ёлочки, слева направо 4, 3 и 2 яруса ветвей"),
        ("p004_squares_row_sample", squares_row_sample_svg,
         "Пропись: 10 квадратов; первые 5 пустые, следующие 5 с диагональю"),
        ("p005_writing_strip_dashes_dots_slashes", writing_strip_five_svg,
         "Пропись: по четыре пары штрихов и точек, четыре косых линии; ниже 12 волн и 11 красных точек"),
        ("p006_writing_strip_circles_hooks_waves", writing_strip_six_svg,
         "Пропись: 12 колец с точками, 12 крючков, 12 волн и 11 бирюзовых точек"),
        ("p007_digit_1_print", digit_one_print_svg, "Печатная цифра 1"),
        ("p007_digit_1_sample", digit_one_sample_svg, "Образец написания цифры 1 по клеткам"),
        ("p007_abacus_1", counting_rail_one_svg,
         "Счётная линейка: 1 бусина слева, 9 справа; всего 10, первые 5 красные"),
        ("p007_mushroom_draw", mushroom_drawing_svg, "Образец: один гриб с простой шляпкой и ножкой"),
        ("p007_coin_1_kopek", educational_coin_one_svg, "Учебная монета с числом 1"),
        ("p008_abacus_2", counting_rail_two_svg,
         "Счётная линейка: 2 бусины слева, 8 справа; всего 10, первые 5 красные"),
        ("p008_coin_2_kopeks", educational_coin_two_svg, "Учебная монета с числом 2"),
        ("p008_digit_2_print", digit_two_print_svg, "Печатная цифра 2"),
        ("p008_digit_2_sample", digit_two_sample_svg, "Образец написания цифры 2 по клеткам"),
        ("p008_sticks_angle_v", stick_angles_svg, "Две фигуры из палочек: угол вверх и угол вниз, по две палочки"),
        ("p008_plums_draw", plum_drawing_svg, "Образец: две отдельные сливы с черенками"),
        ("p009_writing_strip_squares_rects", writing_strip_nine_svg,
         "Пропись: одна клетка, две клетки в ряд, две клетки друг над другом, одна клетка"),
        ("p010_abacus_3", counting_rail_three_svg,
         "Счётная линейка: 3 бусины слева, 2 рядом и ещё 1; 7 справа, всего 10"),
        ("p010_coin_3_kopeks", educational_coin_three_svg, "Учебная монета с числом 3"),
        ("p010_digit_3_print", digit_three_print_svg, "Печатная цифра 3"),
        ("p010_digit_3_sample", digit_three_sample_svg, "Образец написания цифры 3 по клеткам"),
        ("p010_cherries_draw", cherry_drawing_svg, "Образец: три отдельные вишни с черенками"),
        ("p010_sticks_triangles", stick_triangles_svg,
         "Два треугольника из палочек: первый вершиной вверх, второй вниз, по три палочки"),
        ("p011_three_squares_2_1", squares_two_plus_one_svg,
         "Три квадрата: два зелёных слева друг под другом и один красный справа"),
        ("p011_balls_row_3_groups", balls_composite_row_svg,
         "Составной ряд из шести мячей: слева 2 + 1, справа 1 + 2; это альтернативный вид двух наборов"),
        ("p011_writing_strip_squares_rects", writing_strip_eleven_svg,
         "Пропись: группы клеток по порядку 1, 2, 3, 3, 2, 1; сначала ряды, затем столбики"),
        ("p012_abacus_4", counting_rail_four_svg,
         "Счётная линейка: 4 бусины слева, 3 рядом и ещё 1; 6 справа, всего 10"),
        ("p012_digit_4_print", digit_four_print_svg, "Печатная цифра 4"),
        ("p012_digit_4_sample", digit_four_sample_svg, "Образец написания цифры 4 по клеткам"),
        ("p012_flags_draw_sample", flags_drawing_svg,
         "Четыре разноцветных флажка: три вправо, последний влево"),
        ("p012_sticks_square", stick_square_svg, "Квадрат из четырёх палочек"),
        ("p013_plums_frame_1", plums_frame_one_svg,
         "Четыре одинаковые сливы в рамке: 3 + 1"),
        ("p013_plums_frame_2", plums_frame_two_svg,
         "Четыре одинаковые сливы в рамке: 2 + 2"),
        ("p013_plums_frame_3", plums_frame_three_svg,
         "Четыре одинаковые сливы в рамке: 1 + 3"),
        ("p013_squares_2_2", squares_two_and_two_svg,
         "Четыре квадрата 2 на 2: два зелёных слева, два красных справа"),
        ("p014_abacus_5", counting_rail_five_svg,
         "Счётная линейка: 5 бусин слева, 4 рядом и ещё 1; 5 справа, всего 10"),
        ("p014_apples_draw", apples_drawing_svg,
         "Образец: пять отдельных яблок в ряд"),
        ("p014_coin_5_kopeks", educational_coin_five_svg,
         "Учебная монета с числом 5"),
        ("p014_digit_5_large", digit_five_print_svg,
         "Крупная печатная цифра 5"),
        ("p014_digit_5_sample", digit_five_sample_svg,
         "Образец написания цифры 5 по клеткам"),
        ("p014_five_stars", five_stars_svg,
         "Пять красных звёзд: три сверху, две снизу"),
        ("p014_star_outline", star_outline_svg,
         "Контур одной пятиконечной звезды"),
        ("p015_nuts_columns_1_5", nuts_columns_svg,
         "Лесенка из пяти столбиков орехов: 1, 2, 3, 4, 5; всего 15"),
        ("p015_nuts_frame_1", nuts_frame_one_svg,
         "Пять орехов в рамке: 3 + 2"),
        ("p015_nuts_frame_2", nuts_frame_two_svg,
         "Пять орехов в рамке: 2 + 3"),
        ("p015_nuts_frame_3", nuts_frame_three_svg,
         "Пять орехов в рамке: 4 + 1"),
        ("p015_nuts_frame_4", nuts_frame_four_svg,
         "Пять орехов в рамке: 1 + 4"),
        ("p015_squares_4_1", squares_four_plus_one_svg,
         "Четыре коралловых квадрата и один зелёный: 4 + 1"),
        ("p016_cards_1_plus_1_blank",
         lambda: addition_cards_svg("p016_cards_1_plus_1_blank", 1, False),
         "Карточки: 1 + 1 =, без результата"),
        ("p016_cards_1_plus_1_eq_2",
         lambda: addition_cards_svg("p016_cards_1_plus_1_eq_2", 1, True),
         "Карточки: 1 + 1 = 2"),
        ("p016_cards_2_plus_1_blank",
         lambda: addition_cards_svg("p016_cards_2_plus_1_blank", 2, False),
         "Карточки: 2 + 1 =, без результата"),
        ("p016_cards_2_plus_1_eq_3",
         lambda: addition_cards_svg("p016_cards_2_plus_1_eq_3", 2, True),
         "Карточки: 2 + 1 = 3"),
        ("p016_cards_3_plus_1_blank",
         lambda: addition_cards_svg("p016_cards_3_plus_1_blank", 3, False),
         "Карточки: 3 + 1 =, без результата"),
        ("p016_cards_3_plus_1_eq_4",
         lambda: addition_cards_svg("p016_cards_3_plus_1_eq_4", 3, True),
         "Карточки: 3 + 1 = 4"),
        ("p016_cards_4_plus_1_blank",
         lambda: addition_cards_svg("p016_cards_4_plus_1_blank", 4, False),
         "Карточки: 4 + 1 =, без результата"),
        ("p016_cards_4_plus_1_eq_5",
         lambda: addition_cards_svg("p016_cards_4_plus_1_eq_5", 4, True),
         "Карточки: 4 + 1 = 5"),
        ("p017_handwritten_sums_plus_1", handwritten_sums_plus_one_svg,
         "Тетрадный образец: 1 + 1 = 2, 2 + 1 = 3, 3 + 1 = 4, 4 + 1 = 5"),
        ("p018_abacus_6", counting_rail_six_svg,
         "Счётная линейка: 6 бусин слева, 5 рядом и ещё 1; 4 справа, всего 10"),
        ("p018_digit_6_large", digit_six_print_svg,
         "Крупная печатная цифра 6"),
        ("p018_digit_6_sample", digit_six_sample_svg,
         "Образец написания цифры 6 по клеткам"),
        ("p018_sticks_house", sticks_house_svg,
         "Дом из шести палочек: квадрат и крыша"),
        ("p018_sticks_two_triangles", sticks_two_triangles_svg,
         "Два отдельных треугольника по три палочки"),
        ("p019_number_cards_1_6", number_cards_one_to_six_svg,
         "Числовой ряд от 1 до 6: напечатаны 1, 4, 6; три клетки пустые"),
        ("p019_squares_4_2", squares_four_and_two_svg,
         "Шесть квадратов: четыре зелёных 2 на 2 и два красных столбиком справа"),
        ("p020_cards_2_minus_1",
         lambda: subtraction_cards_svg("p020_cards_2_minus_1", 2),
         "Карточки: 2 − 1 = 1"),
        ("p020_cards_3_minus_1",
         lambda: subtraction_cards_svg("p020_cards_3_minus_1", 3),
         "Карточки: 3 − 1 = 2"),
        ("p020_cards_4_minus_1",
         lambda: subtraction_cards_svg("p020_cards_4_minus_1", 4),
         "Карточки: 4 − 1 = 3"),
        ("p021_cards_5_minus_1",
         lambda: subtraction_cards_svg("p021_cards_5_minus_1", 5),
         "Карточки: 5 − 1 = 4"),
        ("p021_writing_subtract_one", handwritten_subtractions_svg,
         "Тетрадный образец: 2 − 1 = 1 до 6 − 1 = 5, пять строк"),
        ("p022_abacus_7", counting_rail_seven_svg,
         "Счётная линейка: 7 бусин слева, 6 рядом и ещё 1; 3 справа, всего 10"),
        ("p022_digit_7_print", digit_seven_print_svg,
         "Печатная цифра 7"),
        ("p022_digit_7_sample", digit_seven_sample_svg,
         "Образец написания цифры 7 по клеткам"),
        ("p022_sticks_square_triangle", sticks_square_triangle_svg,
         "Отдельные квадрат и треугольник: четыре и три палочки, всего семь"),
        ("p023_squares_4_3", squares_four_and_three_svg,
         "Семь квадратов: 4 зелёных 2 на 2 и 3 красных справа, 2 + 1"),
        ("p024_abacus_8", counting_rail_eight_svg,
         "Счётная линейка: 8 бусин слева, 7 рядом и ещё 1; 2 справа, всего 10"),
        ("p024_digit_8_print", digit_eight_print_svg,
         "Печатная цифра 8"),
        ("p024_digit_8_sample", digit_eight_sample_svg,
         "Образец написания цифры 8 по клеткам"),
        ("p024_sticks_two_squares", sticks_two_squares_svg,
         "Два отдельных квадрата по четыре палочки; всего восемь"),
        ("p026_abacus_9", counting_rail_nine_svg,
         "Счётная линейка: 9 бусин слева, 8 рядом и ещё 1; 1 справа, всего 10"),
        ("p026_digit_9_large", digit_nine_print_svg,
         "Крупная печатная цифра 9"),
        ("p026_digit_9_sample", digit_nine_sample_svg,
         "Образец написания цифры 9 по клеткам"),
        ("p026_dots_frame_9", dots_frame_nine_svg,
         "Девять точек в рамке: пять сверху и четыре снизу"),
        ("p026_flags_9", flags_nine_svg,
         "Девять красных флажков: три отдельные связки по три"),
        ("p026_number_row_missing", number_cards_one_to_nine_svg,
         "Девять числовых карточек: 1, 2, пусто, 4, 5, 6, пусто, 8, пусто"),
        ("p026_sticks_triangles", sticks_three_triangles_svg,
         "Три отдельных треугольника по три палочки; всего девять"),
        ("p028_abacus_10", counting_rail_ten_svg,
         "Счётная линейка: 10 бусин, 9 рядом и ещё 1 отдельно; первые 5 красные"),
        ("p028_coin_10_kopeks", educational_coin_ten_svg,
         "Учебная монета с числом 10"),
        ("p028_digit_10_large", digit_ten_print_svg,
         "Крупная печатная запись числа 10"),
        ("p028_digit_10_sample", digit_ten_sample_svg,
         "Образец написания числа 10 по клеткам"),
        ("p028_dots_frame_10", dots_frame_ten_svg,
         "Десять точек в рамке: пять сверху и пять снизу"),
        ("p028_number_row_missing", number_cards_one_to_ten_svg,
         "Десять карточек: 1, 2, пусто, 4, пусто, 6, пусто, 8, пусто, 10"),
        ("p028_sticks_star", sticks_star_svg,
         "Пятиконечная звезда по контуру из десяти отдельных палочек"),
        ("p029_bars_10_all", all_ten_bars_svg,
         "Пять строк по десять клеток: 9 + 1, 8 + 2, 7 + 3, 6 + 4, 5 + 5"),
        ("p029_squares_green_red", squares_five_and_five_svg,
         "Десять квадратов: пять зелёных и пять красных, обе группы 2 + 1 + 2"),
        ("p030_fir_trees_10", ten_fir_trees_svg,
         "Десять одинаковых елей в одном горизонтальном ряду"),
        ("p034_five_buttons", five_buttons_svg,
         "Пять матовых пуговиц в одном ряду"),
        ("p036_coin_2_kopeks", educational_coin_two_page36_svg,
         "Учебная монета с числом 2"),
        ("p036_coin_3_kopeks", educational_coin_three_page36_svg,
         "Учебная монета с числом 3"),
        ("p036_two_maple_leaves", maple_leaves_svg,
         "Два отдельных контурных кленовых листа для срисовывания"),
        ("p036_three_birch_leaves", birch_leaves_svg,
         "Три отдельных контурных берёзовых листа для срисовывания"),
    ):
        svg, width, height = draw()
        register(asset_id, svg, width, height, alt)
    REGISTRY.write_text(
        "// Generated by scripts/generate_vector_art.py. Edit its templates, not this file.\n"
        "export type VectorAsset = { kind: 'vector'; xml: string; width: number; height: number; alt: string };\n"
        "export const vectorAssets: Record<string, VectorAsset> = {\n"
        + "\n".join(entries) + "\n};\n"
    )
    print(f"Generated {len(entries)} vector assets")


if __name__ == "__main__":
    main()
