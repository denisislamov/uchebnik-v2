"""Generate approved vector book art and a Metro-safe XML registry.

The source crops supply the canvas dimensions; the hand-checked rows below
preserve the count and arrangement without copying scan noise or paper color.
"""

import json
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
