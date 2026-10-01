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

# The rightmost object is the one subtracted in each row.
SUBTRACTION = {f"p021_circles_{n}_minus_1": n for n in range(2, 7)}


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


def addition_cards_svg(asset_id, first, complete):
    width, height = dimensions(asset_id)
    labels = [str(first), "+", "1", "="]
    positions = [12, 64, 116, 168]
    if complete:
        labels.append(str(first + 1))
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
    for asset_id, count in SUBTRACTION.items():
        svg, width, height = subtraction_svg(asset_id, count)
        register(asset_id, svg, width, height,
                 f"Кружки: {count}; крайний справа перечёркнут, остаётся {count-1}")
    svg, width, height = title_svg()
    register("p001_cover_title_frame", svg, width, height, "Арифметика · 1 класс")
    for asset_id, draw, alt in (
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
