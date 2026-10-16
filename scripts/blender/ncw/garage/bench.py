"""The shop's working kit: tool chests, the bench and its pegboard, the lamps
a mechanic works by, tyres and the machines that fit them, air and oil,
shelving, cable runs, the overhead lights and the tune cart.

What hangs on a wall (the pegboard, the reels, the conduit) has its back on
the prototype's z 0, the wall's face, and its front toward +z. What hangs
from a ceiling (the cable tray, the lights) has its origin at its own
underside and says how far it drops (LED_DROP, FLUORO_DROP, TRAY_DROP).
Things that stand on something else say what (a top box on a roll cab,
TOP_ON_CAB; a pump or a parts washer's sink on a drum, DRUM_TOP).
"""
import math
import random

from mathutils import Vector

from ncw.kit import TUBE, box, cylinder, pipe, quad
from ncw.props import BOXED, DRUM, LABEL, carton, lathe, proto, spun, worn
from ncw.garage.shapes import (
    ALU, BLACK_PAINT, BLUE, CABLE, CHROME, GRIME, GUN, GUN_DARK, HOSE_RED, HOSE_YELLOW, OFFWHITE, ORANGE, RED, RED_DARK,
    RUBBER, STEEL_MID, WHITE_PAINT, WOOD, WOOD_DARK, YELLOW, GREEN,
    beam, cable, disc, frame_of, hung, lin, obox, place_in, revolve, shade,
)

# The city's oil drum (props.py `drum`) is 0.88 m to the top of its lid.
DRUM_TOP = 0.88
TOP_ON_CAB = 0.99


def _scuffs(k, x0, x1, y0, y1, z, seed, n=6, col=GRIME):
    """A few scuffs and chips on a front at z (facing +z), near by only."""
    r = random.Random(seed)
    for _ in range(n):
        w, h = r.uniform(0.01, 0.06), r.uniform(0.004, 0.02)
        cx, cy = r.uniform(x0 + w, x1 - w), r.uniform(y0 + h, y1 - h)
        quad(k("trim", 1), (cx - w, cy - h, z), (cx + w, cy - h, z), (cx + w, cy + h, z), (cx - w, cy + h, z), col=col)


def _castors(k, xs, zs, y_top, r=0.05, col=RUBBER):
    """Swivel castors under a cabinet whose bottom is at y_top: a fork near
    by, the wheel always."""
    for x in xs:
        for z in zs:
            box(k("trim", 1), x - 0.025, x + 0.025, y_top - 0.03, y_top, z - 0.025, z + 0.025, col=STEEL_MID)
            pipe(k("trim"), (x - 0.018, r, z), (x + 0.018, r, z), r, segs=8, col=col, caps=True)


def _drawers(k, x0, x1, y0, y1, z, heights, body, seed):
    """A column of drawers on a front at z: each front a hair proud, its
    pull a bar across its top, a dark gap between."""
    t = k("trim")
    gap = 0.007
    y = y0 + gap
    total = sum(heights)
    scale = (y1 - y0 - gap * (len(heights) + 1)) / total
    for h in heights:
        h *= scale
        box(t, x0 + 0.012, x1 - 0.012, y, y + h, z, z + 0.008, col=body)
        box(t, x0 + 0.06, x1 - 0.06, y + h - 0.03, y + h - 0.012, z + 0.008, z + 0.024, col=ALU)
        y += h + gap
    quad(t, (x0, y0, z - 0.001), (x1, y0, z - 0.001), (x1, y1, z - 0.001), (x0, y1, z - 0.001), col=GRIME)
    _scuffs(k, x0, x1, y0, y1, z + 0.0085, seed)


@proto("garage_tool_cab", box=(0.56, 0.5, 0.25))
def _tool_cab(k):
    """A 42-inch rolling tool cabinet in red: seven drawers with full-width
    pulls, chipped and scuffed at the edges, a rubber mat on top, a side
    handle and a lock, on four castors."""
    t = k("trim")
    box(t, -0.535, 0.535, 0.13, 0.98, -0.23, 0.215, col=RED)
    _drawers(k, -0.535, 0.535, 0.14, 0.97, 0.215, (0.2, 0.15, 0.1, 0.1, 0.08, 0.08, 0.08), RED, 11)
    box(t, -0.53, 0.53, 0.98, 0.99, -0.225, 0.225, col=RUBBER)
    box(t, -0.54, 0.54, 0.12, 0.14, -0.235, 0.235, col=BLACK_PAINT)
    pipe(t, (0.56, 0.6, -0.15), (0.56, 0.6, 0.15), 0.013, segs=6, col=CHROME, caps=True)
    for z in (-0.15, 0.15):
        pipe(t, (0.535, 0.6, z), (0.565, 0.6, z), 0.012, segs=6, col=CHROME)
    cylinder(k("trim", 1), 0.45, 0.224, 0.92, 0.95, 0.012, segs=8, col=CHROME)
    _castors(k, (-0.47, 0.47), (-0.17, 0.17), 0.12, r=0.055)


@proto("garage_tool_top", box=(0.56, 0.27, 0.24), reach=260)
def _tool_top(k):
    """The top box that stands on the roll cabinet (at TOP_ON_CAB): six
    drawers under a lid that lifts on gas struts, a carry handle each
    side."""
    t = k("trim")
    box(t, -0.535, 0.535, 0.0, 0.52, -0.23, 0.215, col=RED)
    _drawers(k, -0.535, 0.535, 0.03, 0.4, 0.215, (0.06, 0.06, 0.06, 0.06, 0.09, 0.09), RED, 23)
    box(t, -0.54, 0.54, 0.52, 0.55, -0.235, 0.23, col=RED_DARK)
    box(t, -0.3, 0.3, 0.44, 0.46, 0.215, 0.235, col=ALU)
    for x in (-0.56, 0.56):
        pipe(t, (x, 0.42, -0.1), (x, 0.42, 0.1), 0.011, segs=6, col=CHROME, caps=True)


def _cart(k, col, top=0.86):
    """A three-tray utility cart, 0.75 by 0.42 m, push handle at its back."""
    t = k("trim")
    for y in (0.16, 0.5, top - 0.04):
        box(t, -0.375, 0.375, y, y + 0.012, -0.21, 0.21, col=col, bottom=True)
        for (x0, x1, z0, z1) in ((-0.375, 0.375, 0.2, 0.21), (-0.375, 0.375, -0.21, -0.2), (-0.375, -0.365, -0.21, 0.21), (0.365, 0.375, -0.21, 0.21)):
            box(t, x0, x1, y, y + 0.05, z0, z1, col=col)
    for x in (-0.36, 0.36):
        for z in (-0.195, 0.195):
            box(t, x - 0.012, x + 0.012, 0.1, top + 0.01, z - 0.012, z + 0.012, col=shade(col, 0.8))
    pipe(t, (-0.33, top + 0.15, -0.26), (0.33, top + 0.15, -0.26), 0.014, segs=6, col=BLACK_PAINT, caps=True)
    for x in (-0.33, 0.33):
        pipe(t, (x, top - 0.02, -0.21), (x, top + 0.15, -0.26), 0.012, segs=6, col=BLACK_PAINT)
    _castors(k, (-0.33, 0.33), (-0.17, 0.17), 0.1, r=0.05)


@proto("garage_tool_cart", box=(0.4, 0.5, 0.25), reach=260)
def _tool_cart(k):
    """A red three-tray utility cart with a few things on its top tray: a
    socket tray, a spray can, a rag."""
    _cart(k, RED)
    t = k("trim")
    box(t, -0.3, -0.02, 0.832, 0.85, -0.12, 0.12, col=BLACK_PAINT)
    for i in range(8):
        cylinder(k("trim", 1), -0.28 + i * 0.034, -0.05, 0.85, 0.885, 0.012 + i * 0.001, segs=6, col=CHROME)
    lathe(t, 0.18, 0.05, ((0.832, 0.033), (1.02, 0.033), (1.04, 0.02), (1.06, 0.012)), segs=8, col=lin("20508a"))
    quad(t, (0.05, 0.835, 0.15), (0.3, 0.835, 0.12), (0.28, 0.835, -0.05), (0.06, 0.835, -0.02), col=lin("8a8478"))


@proto("garage_bench", box=(1.2, 0.46, 0.38))
def _bench(k):
    """A 2.4 m workbench: a butcher-block top on a steel frame, a drawer
    unit, a lower shelf, a bench vise bolted at the left front corner, and
    on it a battery, a parts tray and a carton."""
    t, n = k("trim"), k("trim", 1)
    top = 0.9
    box(t, -1.2, 1.2, top - 0.05, top, -0.375, 0.375, col=WOOD, bottom=True)
    for x in (-1.17, 1.13):
        for z in (-0.34, 0.3):
            box(t, x, x + 0.045, 0.0, top - 0.05, z, z + 0.045, col=GUN)
    box(t, -1.17, 1.17, 0.16, 0.18, -0.34, 0.345, col=GUN_DARK)
    box(t, -1.17, 1.17, top - 0.12, top - 0.05, 0.3, 0.345, col=GUN)
    box(t, -1.17, 1.17, top - 0.12, top - 0.05, -0.34, -0.3, col=GUN)
    box(t, 1.17, 1.2, top, top + 0.12, -0.375, 0.375, col=GUN)
    box(t, -1.2, 1.2, top, top + 0.12, -0.375, -0.35, col=GUN)
    # The drawer unit under the right end.
    box(t, 0.45, 1.13, 0.4, top - 0.12, -0.32, 0.3, col=GUN)
    _drawers(k, 0.45, 1.13, 0.41, top - 0.13, 0.3, (1, 1, 1), GUN, 7)
    # Shop dirt on the top: dark rings and a burn.
    r = random.Random(5)
    for _ in range(7):
        cx, cz, s = r.uniform(-1.0, 1.0), r.uniform(-0.3, 0.3), r.uniform(0.03, 0.09)
        quad(n, (cx - s, top + 0.001, cz + s), (cx + s, top + 0.001, cz + s * 0.7), (cx + s * 0.8, top + 0.001, cz - s), (cx - s * 0.6, top + 0.001, cz - s * 0.8), col=WOOD_DARK)
    # The vise: base, body, the fixed and the sliding jaw, the screw and
    # its handle, the anvil behind.
    vx, vz = -0.95, 0.3
    box(t, vx - 0.1, vx + 0.1, top, top + 0.03, vz - 0.15, vz + 0.02, col=GUN_DARK)
    cylinder(t, vx, vz - 0.06, top + 0.03, top + 0.06, 0.08, segs=10, col=GUN_DARK)
    box(t, vx - 0.06, vx + 0.06, top + 0.06, top + 0.16, vz - 0.2, vz + 0.04, col=BLUE)
    box(t, vx - 0.09, vx + 0.09, top + 0.12, top + 0.2, vz - 0.12, vz - 0.07, col=BLUE)
    box(t, vx - 0.09, vx + 0.09, top + 0.12, top + 0.2, vz + 0.0, vz + 0.05, col=BLUE)
    box(n, vx - 0.085, vx + 0.085, top + 0.15, top + 0.2, vz - 0.071, vz - 0.065, col=STEEL_MID)
    box(n, vx - 0.085, vx + 0.085, top + 0.15, top + 0.2, vz - 0.005, vz + 0.001, col=STEEL_MID)
    box(t, vx - 0.05, vx + 0.05, top + 0.16, top + 0.2, vz - 0.24, vz - 0.12, col=STEEL_MID)
    pipe(t, (vx, top + 0.1, vz + 0.05), (vx, top + 0.1, vz + 0.2), 0.012, segs=6, col=CHROME)
    pipe(t, (vx - 0.12, top + 0.1, vz + 0.19), (vx + 0.12, top + 0.1, vz + 0.19), 0.007, segs=6, col=CHROME, caps=True)
    # A battery, a tray of bolts, a carton.
    box(t, 0.2, 0.47, top, top + 0.19, -0.25, -0.08, col=BLACK_PAINT)
    for x, col in ((0.25, (0.25, 0.02, 0.02, 1)), (0.42, BLACK_PAINT)):
        cylinder(n, x, -0.12, top + 0.19, top + 0.21, 0.012, segs=6, col=col)
    box(t, -0.45, -0.15, top, top + 0.035, -0.2, 0.02, col=STEEL_MID)
    for i in range(10):
        cylinder(n, -0.42 + (i % 5) * 0.06, -0.15 + (i // 5) * 0.1, top + 0.01, top + 0.03, 0.008, segs=5, col=CHROME)
    carton(k, 0.65, 0.95, top, top + 0.22, -0.3, -0.1, 0.41)


def _hanging(t, x, y_top, length, width, thick, col, z=0.045):
    """A flat tool hanging from its hook: a bar `length` down from y_top."""
    box(t, x - width / 2, x + width / 2, y_top - length, y_top, z - thick, z + thick, col=col)


@proto("garage_pegboard", box=(1.25, 1.15, 0.06), reach=200)
def _pegboard(k):
    """A pegboard wall over a bench (from 1.0 to 2.25 m up), its tools
    hung on it and each one's outline painted behind it in yellow, as a
    shop that knows when a spanner has walked: ten combination spanners
    in a row, screwdrivers, a hammer, pliers, a torque wrench, a rail of
    sockets, a tape; along its foot a shelf of spray cans."""
    t, n = k("trim"), k("trim", 1)
    y0, y1 = 1.0, 2.25
    box(t, -1.22, 1.22, y0, y1, 0.0, 0.03, col=lin("2c2e32"))
    for (a, b, c, d) in ((-1.24, 1.24, y1, y1 + 0.03), (-1.24, 1.24, y0 - 0.03, y0), (-1.24, -1.21, y0, y1), (1.21, 1.24, y0, y1)):
        box(t, a, b, c, d, 0.0, 0.04, col=GUN_DARK)
    zb = 0.0305

    def outline(x0, x1, ya, yb):
        quad(n, (x0, ya, zb), (x1, ya, zb), (x1, yb, zb), (x0, yb, zb), col=YELLOW)
    # Spanners, short to long, ring end up.
    for i in range(10):
        x = -1.05 + i * 0.065
        ln = 0.14 + i * 0.02
        outline(x - 0.018, x + 0.018, 2.12 - ln - 0.01, 2.13)
        _hanging(t, x, 2.12, ln, 0.016 + i * 0.0012, 0.003, CHROME)
        pipe(t, (x, 2.11, 0.04), (x, 2.11, 0.05), 0.012 + i * 0.0008, segs=8, col=CHROME, caps=True)
        pipe(t, (x, 2.12 - ln, 0.04), (x, 2.12 - ln, 0.05), 0.011 + i * 0.0008, segs=8, col=CHROME, caps=True)
        pipe(n, (x, 2.14, 0.03), (x, 2.14, 0.06), 0.003, segs=4, col=STEEL_MID)
    # Screwdrivers, handles up.
    for i, col in enumerate((RED, YELLOW, BLUE, RED, GREEN, BLACK_PAINT)):
        x = -0.28 + i * 0.06
        pipe(t, (x, 1.95, 0.05), (x, 2.08, 0.05), 0.014, segs=6, col=col, caps=True)
        pipe(t, (x, 1.75 + i * 0.01, 0.05), (x, 1.95, 0.05), 0.0035, segs=4, col=CHROME)
    # A hammer, a pair of pliers, side cutters.
    outline(0.18, 0.36, 1.62, 2.1)
    pipe(t, (0.27, 1.62, 0.05), (0.27, 1.98, 0.05), 0.014, segs=6, col=WOOD, caps=True)
    box(t, 0.2, 0.34, 1.98, 2.03, 0.03, 0.07, col=GUN_DARK)
    for i, col in enumerate((RED, BLUE)):
        x = 0.45 + i * 0.1
        beam(t, (x - 0.01, 1.92, 0.045), (x - 0.025, 1.72, 0.045), 0.003, 0.009, col=col)
        beam(t, (x + 0.01, 1.92, 0.045), (x + 0.025, 1.72, 0.045), 0.003, 0.009, col=col)
        beam(t, (x, 1.92, 0.045), (x, 2.02, 0.045), 0.003, 0.012, col=CHROME)
    # The torque wrench, long and level, and the rail of sockets under it.
    beam(t, (-1.0, 1.42, 0.05), (-0.25, 1.42, 0.05), 0.014, 0.014, col=CHROME)
    pipe(t, (-0.6, 1.42, 0.05), (-0.25, 1.42, 0.05), 0.019, segs=8, col=BLACK_PAINT, caps=True)
    box(t, -1.06, -0.98, 1.38, 1.46, 0.035, 0.07, col=CHROME)
    box(t, 0.1, 1.05, 1.24, 1.26, 0.03, 0.07, col=RED)
    for i in range(14):
        x = 0.14 + i * 0.065
        r = 0.011 + i * 0.0012
        cylinder(t, x, 0.05, 1.26, 1.3 + i * 0.002, r, segs=8, col=CHROME)
    box(t, -0.1, -0.02, 1.3, 1.38, 0.03, 0.06, col=YELLOW)
    # Hooks left empty.
    for x in (0.75, 0.85, 0.95, 1.05):
        pipe(n, (x, 1.9, 0.03), (x, 1.9, 0.08), 0.003, segs=4, col=STEEL_MID)
    # The shelf at its foot and the cans on it.
    box(t, -1.2, 1.2, y0 - 0.06, y0 - 0.04, 0.0, 0.14, col=GUN_DARK)
    for i, col in enumerate((RED, BLUE, YELLOW, BLACK_PAINT, WHITE_PAINT, RED, GREEN)):
        x = -1.1 + i * 0.09
        lathe(t, x, 0.08, ((y0 - 0.04, 0.032), (y0 + 0.14, 0.032), (y0 + 0.16, 0.02), (y0 + 0.18, 0.012)), segs=8, col=col)


@proto("garage_hood_light", box=(0.86, 0.06, 0.05), reach=200)
def _hood_light(k):
    """An under-hood work light: a telescoping bar 1.7 m across, a rubber
    hook at each end to hang it from a hood's edges, the LED strip along its
    underside (cool white) and its cord. Its origin is the hooks' grip:
    set it at the open hood's underside."""
    t = k("trim")
    box(t, -0.6, 0.6, -0.06, -0.015, -0.025, 0.025, col=BLACK_PAINT, bottom=True)
    for s in (-1, 1):
        pipe(t, (s * 0.6, -0.04, 0.0), (s * 0.82, -0.04, 0.0), 0.012, segs=6, col=ALU)
        cable(t, ((s * 0.82, -0.04, 0.0), (s * 0.86, -0.02, 0.0), (s * 0.86, 0.025, 0.0), (s * 0.83, 0.04, 0.0), (s * 0.8, 0.02, 0.0)), 0.011, col=RUBBER, segs=5)
    quad(k("glow"), (-0.58, -0.061, 0.018), (0.58, -0.061, 0.018), (0.58, -0.061, -0.018), (-0.58, -0.061, -0.018), col=(0.75, 0.85, 1.0, 1))
    cable(t, hung((0.6, -0.04, 0.0), (0.75, -0.9, 0.2), 0.12, n=8), 0.006, col=CABLE)


def _hand_lamp(k, c, glow=(1.0, 0.55, 0.18, 1)):
    """A hand lamp hanging from its hook at c: rubber grip, a wire cage
    round a warm tube, a reflector behind."""
    t, n = k("trim"), k("trim", 1)
    x, y, z = c
    pipe(t, (x, y - 0.03, z), (x, y - 0.17, z), 0.021, segs=8, col=RUBBER, caps=True)
    cable(t, ((x, y - 0.03, z), (x, y + 0.02, z), (x + 0.03, y + 0.04, z), (x + 0.04, y + 0.01, z)), 0.004, col=STEEL_MID, segs=4)
    lathe(k("glow"), x, z, ((y - 0.42, 0.016), (y - 0.18, 0.016)), segs=6, col=glow, cap=False)
    for i in range(6):
        a = i * math.tau / 6
        pipe(n, (x + 0.03 * math.cos(a), y - 0.43, z + 0.03 * math.sin(a)), (x + 0.03 * math.cos(a), y - 0.17, z + 0.03 * math.sin(a)), 0.0025, segs=3, col=STEEL_MID)
    box(t, x - 0.035, x + 0.035, y - 0.44, y - 0.17, z - 0.04, z - 0.03, col=ALU)
    cylinder(t, x, z, y - 0.45, y - 0.42, 0.034, segs=8, col=RUBBER)


@proto("garage_hand_lamp", box=(0.05, 0.25, 0.05), reach=160, detail=True)
def _hand_lamp_proto(k):
    """A hand lamp on its own, hung from its hook (at 0.5 m: set it at a
    hook's height less 0.5)."""
    _hand_lamp(k, (0.0, 0.5, 0.0))


@proto("garage_lamp_reel", box=(0.2, 1.2, 0.22), reach=220)
def _lamp_reel(k):
    """A cord reel on the wall at 2.3 m, its drum wound with yellow cord,
    the cord down to a warm hand lamp hanging at 1.3 m."""
    t = k("trim")
    box(t, -0.13, 0.13, 2.15, 2.45, 0.0, 0.02, col=GUN_DARK)
    for x in (-0.11, 0.11):
        box(t, x - 0.01, x + 0.01, 2.26, 2.34, 0.02, 0.17, col=GUN_DARK)
    pipe(t, (-0.1, 2.3, 0.17), (0.1, 2.3, 0.17), 0.12, segs=12, col=HOSE_YELLOW, caps=True)
    for x in (-0.105, 0.095):
        pipe(t, (x, 2.3, 0.17), (x + 0.01, 2.3, 0.17), 0.165, segs=12, col=YELLOW, caps=True)
    cable(t, ((0.0, 2.18, 0.2), (0.0, 2.0, 0.22), (0.0, 1.6, 0.22), (0.0, 1.32, 0.22)), 0.006, col=HOSE_YELLOW)
    _hand_lamp(k, (0.0, 1.32, 0.22))


# ---------------------------------------------------------------------------
# Tyres and wheels. A tyre stands on its tread, its axle along x, its
# centre TYRE_R up: a 255/35 R19 (0.66 m across, 0.255 wide).
# ---------------------------------------------------------------------------
TYRE_R = 0.33
TYRE_W = 0.255
_RIM = 0.242


def _tyre(k, c, axis=(1, 0, 0), segs=28, grooves=True):
    w = TYRE_W / 2
    prof = ((-w, _RIM), (-w - 0.006, 0.28), (-w + 0.004, 0.316), (-w + 0.022, TYRE_R), (w - 0.022, TYRE_R),
            (w - 0.004, 0.316), (w + 0.006, 0.28), (w, _RIM), (-w, _RIM))
    revolve(k("trim"), c, axis, prof, segs=segs, col=RUBBER)
    if grooves:
        A, C = Vector(axis).normalized(), Vector(c)
        for g in (-0.045, 0.045):
            revolve(k("trim", 1), tuple(C + A * g), axis, ((-0.006, TYRE_R + 0.0008), (0.006, TYRE_R + 0.0008)), segs=segs, col=GRIME)


def _rim(k, c, axis=(1, 0, 0), col=ALU, spokes=5, segs=24):
    """A wheel on its tyre's axis: the outer lip, five split spokes, the
    hub and its nuts; inside, the dark barrel and the brake's shadow."""
    t, n = k("trim"), k("trim", 1)
    A, C = Vector(axis).normalized(), Vector(c)
    w = TYRE_W / 2
    face = w - 0.025
    revolve(t, tuple(C), axis, ((face + 0.012, _RIM - 0.026), (face + 0.012, _RIM + 0.004), (face - 0.004, _RIM + 0.004)), segs=segs, col=col)
    revolve(t, tuple(C), axis, ((face, _RIM - 0.008), (-w + 0.02, _RIM - 0.008)), segs=segs, col=shade(col, 0.35))
    disc(t, tuple(C + A * (-w + 0.03)), tuple(A), _RIM - 0.01, segs=segs, col=GRIME)
    ref = Vector((0, 1, 0)) if abs(A.y) < 0.9 else Vector((1, 0, 0))
    u = A.cross(ref).normalized()
    v = A.cross(u).normalized()
    for i in range(spokes):
        for off in (-0.13, 0.13):
            a = i * math.tau / spokes + off
            d = u * math.cos(a) + v * math.sin(a)
            d0 = u * math.cos(i * math.tau / spokes) + v * math.sin(i * math.tau / spokes)
            beam(t, tuple(C + A * (face - 0.012) + d0 * 0.07), tuple(C + A * face + d * (_RIM - 0.02)), 0.012, 0.016, col=col, up=tuple(A))
    revolve(t, tuple(C), axis, ((face - 0.03, 0.085), (face + 0.004, 0.085), (face + 0.004, 0.0)), segs=10, col=col)
    for i in range(5):
        a = i * math.tau / 5 + 0.3
        d = u * math.cos(a) + v * math.sin(a)
        revolve(n, tuple(C + A * face + d * 0.05), axis, ((0.0, 0.009), (0.012, 0.009), (0.012, 0.0)), segs=6, col=CHROME)


@proto("garage_tyre", box=(0.13, 0.33, 0.33), reach=220, detail=True)
def _tyre_proto(k):
    """A tyre standing on its tread, its axle along x."""
    _tyre(k, (0.0, TYRE_R, 0.0))


@proto("garage_wheel", box=(0.13, 0.33, 0.33), reach=220, detail=True)
def _wheel_proto(k):
    """A wheel on its tyre, standing, its face toward +x: silver five
    split spokes."""
    _tyre(k, (0.0, TYRE_R, 0.0))
    _rim(k, (0.0, TYRE_R, 0.0))


@proto("garage_tyre_stack", box=(0.33, 0.51, 0.33), reach=220, detail=True)
def _tyre_stack(k):
    """Four tyres lying flat in a stack, each a little off the last."""
    for i, (dx, dz) in enumerate(((0.0, 0.0), (0.02, -0.015), (-0.015, 0.01), (0.012, 0.02))):
        _tyre(k, (dx, TYRE_W / 2 + i * TYRE_W, dz), axis=(0, 1, 0), segs=16, grooves=False)


@proto("garage_tyre_rack", box=(1.22, 1.0, 0.25))
def _tyre_rack(k):
    """A two-tier tyre rack, 2.4 m long and 2 m high: three ladder frames
    of square tube, two rails a tier that the tyres stand in. Its tyres are
    placed by place_tyre_rack."""
    t = k("trim")
    for x in (-1.2, 0.0, 1.2):
        for z in (-0.22, 0.22):
            box(t, x - 0.02, x + 0.02, 0.0, 2.0, z - 0.02, z + 0.02, col=YELLOW if x != 0 else shade(YELLOW, 0.9))
        for y in (0.1, 0.95, 1.85):
            box(t, x - 0.015, x + 0.015, y, y + 0.03, -0.2, 0.2, col=YELLOW)
        beam(t, (x, 0.12, -0.22), (x, 0.93, 0.22), 0.01, 0.008, col=shade(YELLOW, 0.85), up=(1, 0, 0))
        beam(t, (x, 0.97, 0.22), (x, 1.83, -0.22), 0.01, 0.008, col=shade(YELLOW, 0.85), up=(1, 0, 0))
    for y in RACK_TIERS:
        for z in (-0.13, 0.13):
            pipe(t, (-1.22, y, z), (1.22, y, z), 0.018, segs=8, col=GUN, caps=True)


RACK_TIERS = (0.26, 1.16)


def place_tyre_rack(x, z, yaw=0.0, fill=0.85, seed=1, y=0.0, district=None):
    """The rack and its tyres: a tyre or a wheel in eight places a tier,
    `fill` of them taken."""
    r = random.Random(seed)
    at = frame_of(x, y, z, yaw)
    place_in(at, yaw, "garage_tyre_rack", 0, 0, 0, district=district)
    for ty in RACK_TIERS:
        for i in range(8):
            if r.random() > fill:
                continue
            ox = -1.02 + i * 0.29 + r.uniform(-0.02, 0.02)
            if abs(ox) < 0.12:
                continue
            cy = ty + math.sqrt(TYRE_R ** 2 - 0.13 ** 2) - TYRE_R
            place_in(at, yaw, "garage_wheel" if r.random() < 0.3 else "garage_tyre", ox, cy, 0, turn=r.uniform(-0.05, 0.05), district=district)


@proto("garage_tyre_changer", box=(0.45, 0.95, 0.5))
def _tyre_changer(k):
    """A tyre changer: its cabinet with the turntable and four clamping
    jaws on top, the column at the back with the swing arm and the hex
    shaft down to the mount head, the bead breaker on its arm at the side
    with its pad, three pedals at the foot, the lube bucket, the
    inflation gauge."""
    t, n = k("trim"), k("trim", 1)
    box(t, -0.4, 0.4, 0.0, 0.78, -0.42, 0.42, col=RED)
    box(t, -0.41, 0.41, 0.78, 0.8, -0.43, 0.43, col=GUN_DARK)
    lathe(t, 0.0, 0.0, ((0.8, 0.27), (0.84, 0.27), (0.845, 0.25)), segs=16, col=GUN)
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        d = Vector((math.cos(a), 0, math.sin(a)))
        obox(t, tuple(d * 0.2 + Vector((0, 0.87, 0))), tuple(d), (0, 1, 0), 0.06, 0.03, 0.025, col=STEEL_MID)
    box(t, -0.09, 0.09, 0.78, 1.95, -0.52, -0.34, col=RED)
    box(t, -0.07, 0.07, 1.82, 1.92, -0.46, 0.05, col=RED, bottom=True)
    box(t, -0.035, 0.035, 1.12, 1.88, -0.035, 0.035, col=CHROME)
    box(t, -0.05, 0.05, 1.04, 1.12, -0.06, 0.06, col=GUN_DARK, bottom=True)
    pipe(t, (0.0, 1.88, -0.46), (0.0, 1.86, -0.6), 0.03, segs=8, col=GUN_DARK, caps=True)
    # The bead breaker.
    beam(t, (0.42, 0.5, -0.3), (0.78, 0.32, 0.12), 0.03, 0.03, col=GUN)
    obox(t, (0.78, 0.33, 0.14), (0.0, 0.0, 1.0), (0, 1, 0), 0.06, 0.08, 0.012, col=STEEL_MID)
    box(t, 0.4, 0.44, 0.22, 0.58, -0.05, 0.25, col=RUBBER)
    pipe(t, (0.42, 0.35, -0.38), (0.6, 0.42, -0.3), 0.05, segs=10, col=GUN_DARK, caps=True)
    for i in range(3):
        x = -0.2 + i * 0.2
        box(t, x - 0.05, x + 0.05, 0.02, 0.06, 0.42, 0.56, col=BLACK_PAINT)
    cylinder(t, -0.33, 0.33, 0.8, 0.9, 0.07, segs=10, col=WHITE_PAINT)
    pipe(n, (-0.4, 0.7, 0.3), (-0.45, 0.7, 0.3), 0.04, segs=10, col=CHROME, caps=True)
    cable(t, ((-0.4, 0.6, -0.3), (-0.55, 0.3, -0.3), (-0.6, 0.05, -0.1), (-0.5, 0.02, 0.3)), 0.008, col=CABLE)


@proto("garage_balancer", box=(0.45, 0.7, 0.4))
def _balancer(k):
    """A wheel balancer: its body with the weight tray on top, the shaft
    out of its right side with flange, cone and quick nut, the wheel guard
    raised over it, the display on its stalk."""
    t, n = k("trim"), k("trim", 1)
    box(t, -0.3, 0.3, 0.0, 0.95, -0.28, 0.25, col=GUN)
    box(t, -0.31, 0.31, 0.95, 1.0, -0.29, 0.26, col=GUN_DARK)
    for i in range(6):
        box(n, -0.28 + i * 0.095, -0.2 + i * 0.095, 0.995, 1.002, -0.05, 0.22, col=STEEL_MID)
    revolve(t, (0.3, 0.82, 0.0), (1, 0, 0), ((0.0, 0.09), (0.04, 0.09), (0.04, 0.025), (0.36, 0.025), (0.36, 0.0)), segs=12, col=CHROME)
    revolve(t, (0.38, 0.82, 0.0), (1, 0, 0), ((0.0, 0.03), (0.0, 0.075), (0.08, 0.03)), segs=12, col=STEEL_MID)
    revolve(t, (0.6, 0.82, 0.0), (1, 0, 0), ((0.0, 0.03), (0.0, 0.06), (0.05, 0.06), (0.05, 0.0)), segs=10, col=BLACK_PAINT)
    # The guard, up: a half shell hinged at the back over where a wheel goes.
    g = k("trim")
    segs, rad = 7, 0.45
    for i in range(segs):
        a0 = math.radians(40 + i * 20)
        a1 = math.radians(40 + (i + 1) * 20)
        p0 = (0.0, 0.82 + rad * math.sin(a0) * 0.6 + 0.2, -0.28 - rad * math.cos(a0) * 0.35)
        p1 = (0.0, 0.82 + rad * math.sin(a1) * 0.6 + 0.2, -0.28 - rad * math.cos(a1) * 0.35)
        for x0, x1 in ((0.32, 0.92),):
            quad(g, (x0, *p0[1:]), (x1, *p0[1:]), (x1, *p1[1:]), (x0, *p1[1:]), col=shade(GUN, 0.9))
            quad(g, (x1, *p0[1:]), (x0, *p0[1:]), (x0, *p1[1:]), (x1, *p1[1:]), col=shade(GUN, 0.6))
    box(t, 0.3, 0.36, 0.86, 1.0, -0.3, -0.22, col=GUN_DARK)
    box(t, -0.03, 0.03, 1.0, 1.32, -0.24, -0.18, col=GUN_DARK)
    box(t, -0.22, 0.22, 1.3, 1.52, -0.24, -0.16, col=BLACK_PAINT)
    quad(k("glow"), (-0.2, 1.32, -0.159), (0.2, 1.32, -0.159), (0.2, 1.5, -0.159), (-0.2, 1.5, -0.159), col=(0.05, 0.12, 0.22, 1))
    for i, col in enumerate(((0.9, 0.1, 0.05, 1), (0.1, 0.9, 0.3, 1))):
        quad(k("glow", 1), (-0.17 + i * 0.22, 1.42, -0.158), (-0.05 + i * 0.22, 1.42, -0.158), (-0.05 + i * 0.22, 1.47, -0.158), (-0.17 + i * 0.22, 1.47, -0.158), col=col)


# ---------------------------------------------------------------------------
# Air and oil.
# ---------------------------------------------------------------------------
@proto("garage_compressor", box=(0.35, 0.98, 0.32))
def _compressor(k):
    """An upright 300-litre compressor: the tank in worn paint on three
    feet, a plate on its dome with the motor, the twin-cylinder pump and
    its fins, the belt guard, the pressure switch and gauges, the copper
    discharge line, the drain cock at the foot."""
    t, n, w = k("trim"), k("trim", 1), k("worn")
    spun(w, ((0.1, 0.27), (0.14, 0.3), (1.52, 0.3), (1.6, 0.27), (1.65, 0.18), (1.67, 0.0)), segs=14, col=worn(DRUM, 1.0, 0.35))
    spun(w, ((0.7, 0.3008), (1.0, 0.3008)), segs=14, col=worn(LABEL), arc=(0.15, 0.33))
    spun(w, ((0.1, 0.27), (0.12, 0.26), (0.12, 0.0)), segs=14, col=worn(DRUM, 0.6, 0.6))
    for i in range(3):
        a = i * math.tau / 3 + 0.4
        beam(t, (0.2 * math.cos(a), 0.14, 0.2 * math.sin(a)), (0.3 * math.cos(a), 0.0, 0.3 * math.sin(a)), 0.03, 0.005, col=GUN_DARK)
    box(t, -0.34, 0.34, 1.64, 1.67, -0.24, 0.24, col=GUN_DARK, bottom=True)
    pipe(t, (-0.32, 1.8, 0.04), (-0.04, 1.8, 0.04), 0.11, segs=12, col=BLACK_PAINT, caps=True)
    box(t, 0.04, 0.3, 1.67, 1.82, -0.12, 0.12, col=GUN)
    for x in (0.1, 0.23):
        cylinder(t, x, 0.0, 1.82, 1.95, 0.055, segs=10, col=GUN)
        for j in range(4):
            cylinder(n, x, 0.0, 1.84 + j * 0.025, 1.85 + j * 0.025, 0.07, segs=10, col=GUN_DARK)
    box(t, -0.3, 0.3, 1.7, 1.98, 0.17, 0.2, col=RED_DARK)
    box(t, -0.28, -0.18, 1.67, 1.8, -0.22, -0.13, col=BLACK_PAINT)
    pipe(n, (-0.15, 1.75, -0.2), (-0.15, 1.75, -0.24), 0.035, segs=10, col=CHROME, caps=True)
    pipe(n, (0.33, 1.2, 0.0), (0.37, 1.2, 0.0), 0.035, segs=10, col=CHROME, caps=True)
    cable(t, ((0.24, 1.82, -0.1), (0.3, 1.75, -0.18), (0.31, 1.6, -0.18), (0.29, 1.45, -0.1)), 0.008, col=lin("b5652e"))
    pipe(n, (0.0, 0.12, 0.27), (0.0, 0.05, 0.36), 0.008, segs=5, col=CHROME)
    cable(t, ((0.3, 1.2, 0.0), (0.45, 1.0, 0.1), (0.5, 0.4, 0.3), (0.4, 0.02, 0.5)), 0.01, col=HOSE_RED)


@proto("garage_hose_reel", box=(0.2, 1.2, 0.25), reach=220)
def _hose_reel(k):
    """An air hose reel on the wall at 2.2 m: bracket, drum wound with red
    hose, the guide arm, the hose down to its coupler and stop ball."""
    t = k("trim")
    box(t, -0.14, 0.14, 2.0, 2.4, 0.0, 0.02, col=GUN_DARK)
    for x in (-0.13, 0.13):
        beam(t, (x, 2.32, 0.02), (x, 2.2, 0.2), 0.008, 0.03, col=GUN_DARK, up=(1, 0, 0))
    pipe(t, (-0.11, 2.2, 0.2), (0.11, 2.2, 0.2), 0.15, segs=14, col=HOSE_RED, caps=True)
    for x in (-0.12, 0.11):
        pipe(t, (x, 2.2, 0.2), (x + 0.01, 2.2, 0.2), 0.2, segs=14, col=GUN, caps=True)
    beam(t, (0.0, 2.05, 0.2), (0.0, 1.95, 0.38), 0.03, 0.008, col=GUN)
    cable(t, ((0.0, 2.05, 0.3), (0.0, 1.97, 0.38), (0.0, 1.7, 0.4), (0.0, 1.38, 0.4)), 0.009, col=HOSE_RED)
    cylinder(t, 0.0, 0.4, 1.38, 1.42, 0.03, segs=8, col=YELLOW)
    cylinder(t, 0.0, 0.4, 1.3, 1.38, 0.012, segs=6, col=CHROME)


@proto("garage_oil_drain", box=(0.3, 0.8, 0.32), reach=220)
def _oil_drain(k):
    """A mobile oil drain: its tank on castors, the telescoping standpipe
    up to a wide funnel at 1.6 m (for a car on a lift), its screen, the
    push handle, the drain hose; old oil black in the funnel."""
    t, n = k("trim"), k("trim", 1)
    pipe(t, (0.0, 0.3, -0.3), (0.0, 0.3, 0.3), 0.21, segs=14, col=YELLOW, caps=True)
    for z in (-0.25, 0.25):
        box(t, -0.18, 0.18, 0.08, 0.12, z - 0.03, z + 0.03, col=GUN_DARK)
    _castors(k, (-0.15, 0.15), (-0.25, 0.25), 0.08, r=0.04)
    cylinder(t, 0.0, 0.0, 0.5, 1.05, 0.032, segs=8, col=GUN_DARK)
    cylinder(t, 0.0, 0.0, 1.05, 1.42, 0.024, segs=8, col=CHROME)
    lathe(t, 0.0, 0.0, ((1.42, 0.035), (1.55, 0.2), (1.6, 0.25), (1.62, 0.26)), segs=14, col=YELLOW, cap=False)
    lathe(t, 0.0, 0.0, ((1.615, 0.25), (1.56, 0.2), (1.44, 0.04)), segs=14, col=shade(YELLOW, 0.6), cap=False)
    lathe(t, 0.0, 0.0, ((1.5, 0.12), (1.5, 0.12)), segs=14, col=GRIME, cap=True)
    for i in range(5):
        x = -0.1 + i * 0.05
        box(n, x - 0.004, x + 0.004, 1.52, 1.53, -0.15, 0.15, col=STEEL_MID)
    for x in (-0.15, 0.15):
        pipe(t, (x, 0.45, -0.3), (x, 0.95, -0.42), 0.012, segs=6, col=GUN_DARK)
    pipe(t, (-0.15, 0.95, -0.42), (0.15, 0.95, -0.42), 0.014, segs=6, col=RUBBER, caps=True)
    cable(t, ((0.0, 0.2, 0.31), (0.05, 0.1, 0.4), (0.2, 0.03, 0.5)), 0.012, col=BLACK_PAINT)


@proto("garage_drum_pump", box=(0.12, 0.25, 0.12), reach=160, detail=True)
def _drum_pump(k):
    """A rotary hand pump screwed into a drum's bung: its body, spout and
    crank (set it on the city's `drum` at DRUM_TOP, over the bung, with
    place_drum_pump)."""
    t = k("trim")
    cylinder(t, 0.0, 0.0, 0.0, 0.05, 0.03, segs=8, col=GUN_DARK)
    cylinder(t, 0.0, 0.0, 0.05, 0.22, 0.05, segs=10, col=RED)
    pipe(t, (0.0, 0.18, 0.04), (0.0, 0.2, 0.2), 0.012, segs=6, col=RED_DARK)
    pipe(t, (0.0, 0.2, 0.2), (0.0, 0.15, 0.26), 0.012, segs=6, col=RED_DARK)
    pipe(t, (0.05, 0.15, 0.0), (0.09, 0.15, 0.0), 0.008, segs=5, col=STEEL_MID)
    beam(t, (0.09, 0.15, 0.0), (0.09, 0.15, -0.16), 0.008, 0.008, col=STEEL_MID)
    pipe(t, (0.09, 0.15, -0.16), (0.16, 0.15, -0.16), 0.012, segs=6, col=RUBBER, caps=True)


def place_drum_pump(x, z, yaw=0.0, y=0.0, district=None):
    """The city's drum with a pump in its bung."""
    at = frame_of(x, y, z, yaw)
    place_in(at, yaw, "drum", 0, 0, 0, district=district)
    place_in(at, yaw, "garage_drum_pump", 0.15, DRUM_TOP - 0.01, 0.06, district=district)


@proto("garage_parts_washer", box=(0.46, 0.45, 0.3), reach=220)
def _parts_washer(k):
    """A parts washer's sink, set on a drum of solvent (place_parts_washer):
    a red tub with its lid propped open at the back, the flex nozzle over
    it, a brush, the drain screen, solvent dark in the bottom."""
    t, n = k("trim"), k("trim", 1)
    W, D, H = 0.45, 0.28, 0.24
    box(t, -W, W, 0.0, 0.03, -D, D, col=RED, bottom=True)
    for (x0, x1, z0, z1) in ((-W, W, -D, -D + 0.02), (-W, W, D - 0.02, D), (-W, -W + 0.02, -D, D), (W - 0.02, W, -D, D)):
        box(t, x0, x1, 0.03, H, z0, z1, col=RED)
    quad(t, (-W + 0.02, 0.08, D - 0.02), (W - 0.02, 0.08, D - 0.02), (W - 0.02, 0.08, -D + 0.02), (-W + 0.02, 0.08, -D + 0.02), col=lin("1e1a12"))
    # The lid, open about 100 degrees on its hinge at the back.
    a = math.radians(100)
    up = Vector((0, math.sin(a), -math.cos(a)))
    obox(t, tuple(Vector((0, H, -D)) + up * (D + 0.01)), (1, 0, 0), tuple(up), W + 0.01, D + 0.01, 0.01, col=RED)
    beam(n, (W - 0.03, H, -D + 0.05), (W - 0.03, H + 0.4, -D - 0.05), 0.004, 0.004, col=STEEL_MID)
    cable(t, ((-0.3, H - 0.02, -D + 0.02), (-0.3, H + 0.15, -D + 0.05), (-0.2, H + 0.22, -0.05), (-0.12, H + 0.1, 0.05)), 0.01, col=BLACK_PAINT)
    box(t, 0.1, 0.32, 0.09, 0.12, 0.0, 0.05, col=WOOD)
    box(n, 0.11, 0.31, 0.06, 0.09, 0.005, 0.045, col=OFFWHITE)
    for i in range(4):
        box(n, -0.05 + i * 0.03, -0.04 + i * 0.03, 0.081, 0.085, -0.1, 0.1, col=STEEL_MID)


def place_parts_washer(x, z, yaw=0.0, y=0.0, district=None):
    at = frame_of(x, y, z, yaw)
    place_in(at, yaw, "drum", 0, 0, 0, district=district)
    place_in(at, yaw, "garage_parts_washer", 0, DRUM_TOP, 0, district=district)


# ---------------------------------------------------------------------------
# Shelving and the runs of cable and conduit.
# ---------------------------------------------------------------------------
@proto("garage_shelving", box=(0.91, 1.0, 0.31))
def _shelving(k):
    """Steel shelving, 1.8 by 0.6 m and 2 m high: four angle posts, five
    shelves, and on them parts in their cartons, plastic bins, bottles of
    oil and coolant, a coil of hose."""
    t, n = k("trim"), k("trim", 1)
    r = random.Random(37)
    for x in (-0.9, 0.9):
        for z in (-0.3, 0.3):
            sx, sz = (1 if x < 0 else -1), (1 if z < 0 else -1)
            box(t, min(x, x + sx * 0.04), max(x, x + sx * 0.04), 0.0, 2.0, min(z, z + sz * 0.004), max(z, z + sz * 0.004), col=GUN)
            box(t, min(x, x + sx * 0.004), max(x, x + sx * 0.004), 0.0, 2.0, min(z, z + sz * 0.04), max(z, z + sz * 0.04), col=GUN)
    for y in (0.12, 0.55, 0.98, 1.41, 1.84):
        box(t, -0.9, 0.9, y - 0.02, y, -0.3, 0.3, col=STEEL_MID, bottom=True)
        box(t, -0.9, 0.9, y - 0.05, y, 0.29, 0.3, col=GUN)
        if y > 1.8:
            continue
        x = -0.86
        while x < 0.78:
            kind = r.random()
            if kind < 0.45:
                w, h, d = r.uniform(0.2, 0.42), r.uniform(0.14, 0.34), r.uniform(0.3, 0.52)
                carton(k, x, x + w, y, y + h, 0.28 - d, 0.28, r.random(), BOXED)
            elif kind < 0.75:
                w, h = 0.22, r.choice((0.12, 0.16))
                col = r.choice((BLUE, RED, YELLOW, GREEN))
                box(t, x, x + w, y, y + h, -0.25, 0.27, col=col)
                quad(t, (x + 0.02, y + h * 0.4, 0.271), (x + w - 0.02, y + h * 0.4, 0.271), (x + w - 0.02, y + h - 0.01, 0.271), (x + 0.02, y + h - 0.01, 0.271), col=lin("1a1a1a"))
            elif kind < 0.92:
                w = 0.0
                for j in range(r.randint(2, 4)):
                    col = r.choice((lin("2a4d8a"), lin("c9a21e"), lin("2e8a3a"), BLACK_PAINT))
                    lathe(t, x + 0.06 + j * 0.11, 0.1, ((y, 0.05), (y + 0.24, 0.05), (y + 0.28, 0.02), (y + 0.31, 0.015)), segs=8, col=col)
                    w += 0.11
                w += 0.02
            else:
                w = 0.38
                revolve(t, (x + 0.19, y + 0.03, 0.0), (0, 1, 0), [(0.03 * math.sin(i * math.tau / 6), 0.15 - 0.03 * math.cos(i * math.tau / 6)) for i in range(7)], segs=12, col=HOSE_YELLOW)
            x += w + r.uniform(0.02, 0.06)
    for i in range(4):
        box(n, -0.8 + i * 0.45, -0.7 + i * 0.45, 1.75, 1.77, 0.3, 0.302, col=WHITE_PAINT)


TRAY_DROP = 0.6


@proto("garage_cable_tray", box=(1.5, 0.35, 0.22), reach=240, detail=True)
def _cable_tray(k):
    """A 3 m length of ladder cable tray hung TRAY_DROP under a ceiling on
    two trapeze hangers, its cables laid in it. Its origin is the tray's
    underside; lengths butt end to end along x."""
    t, n = k("trim"), k("trim", 1)
    for z in (-0.15, 0.15):
        box(t, -1.5, 1.5, 0.0, 0.08, z - 0.006, z + 0.006, col=ALU, bottom=True)
    for i in range(10):
        x = -1.35 + i * 0.3
        box(t, x - 0.015, x + 0.015, 0.0, 0.015, -0.15, 0.15, col=ALU, bottom=True)
    for x in (-1.2, 1.2):
        box(t, x - 0.02, x + 0.02, -0.04, 0.0, -0.22, 0.22, col=GUN, bottom=True)
        for z in (-0.2, 0.2):
            pipe(t, (x, -0.04, z), (x, TRAY_DROP, z), 0.005, segs=4, col=STEEL_MID)
            box(n, x - 0.012, x + 0.012, 0.0, 0.012, z - 0.012, z + 0.012, col=STEEL_MID)
    for z, r, col in ((-0.08, 0.016, CABLE), (-0.03, 0.012, lin("3a3c40")), (0.03, 0.02, CABLE), (0.09, 0.011, ORANGE)):
        pipe(t, (-1.5, 0.015 + r, z), (1.5, 0.015 + r, z), r, segs=5, col=col)


@proto("garage_conduit", box=(1.5, 0.03, 0.04), reach=200, detail=True)
def _conduit(k):
    """A 3 m run of steel conduit along a wall (its back on z 0), with its
    couplings and its straps: lengths butt end to end along x, at the
    height it is placed at (its centre line at y 0)."""
    t, n = k("trim"), k("trim", 1)
    pipe(t, (-1.5, 0.0, 0.022), (1.5, 0.0, 0.022), 0.0105, segs=6, col=ALU)
    for x in (-1.5, 0.0, 1.5):
        pipe(t, (x - 0.025, 0.0, 0.022), (x + 0.025, 0.0, 0.022), 0.0135, segs=6, col=ALU)
    for x in (-0.75, 0.75):
        box(n, x - 0.012, x + 0.012, -0.03, 0.03, 0.0, 0.004, col=STEEL_MID)
        box(n, x - 0.012, x + 0.012, -0.013, 0.013, 0.004, 0.036, col=STEEL_MID)


@proto("garage_conduit_drop", box=(0.06, 1.5, 0.04), reach=200, detail=True)
def _conduit_drop(k):
    """Conduit down a wall from 3 m to a switched outlet box at 1.2 m, a
    power strip plugged in under it."""
    t, n = k("trim"), k("trim", 1)
    pipe(t, (0.0, 1.3, 0.022), (0.0, 3.0, 0.022), 0.0105, segs=6, col=ALU)
    box(t, -0.055, 0.055, 1.12, 1.3, 0.0, 0.05, col=ALU)
    box(n, -0.04, 0.04, 1.14, 1.28, 0.05, 0.054, col=WHITE_PAINT)
    for y in (1.17, 1.24):
        box(n, -0.012, 0.012, y, y + 0.025, 0.054, 0.058, col=GRIME)
    cable(t, ((0.0, 1.19, 0.06), (0.03, 1.0, 0.08), (0.05, 0.5, 0.06), (0.08, 0.06, 0.05)), 0.004, col=CABLE)
    box(t, 0.0, 0.32, 0.0, 0.04, 0.02, 0.08, col=BLACK_PAINT)


@proto("garage_junction_box", box=(0.08, 0.08, 0.04), reach=160, detail=True)
def _junction_box(k):
    """A steel junction box where runs of conduit meet (centred at y 0)."""
    t, n = k("trim"), k("trim", 1)
    box(t, -0.075, 0.075, -0.075, 0.075, 0.0, 0.05, col=shade(ALU, 0.8))
    for x in (-0.06, 0.06):
        for y in (-0.06, 0.06):
            box(n, x - 0.005, x + 0.005, y - 0.005, y + 0.005, 0.05, 0.054, col=CHROME)


LED_DROP = 0.7
FLUORO_DROP = 0.45


@proto("garage_led_batten", box=(1.22, 0.38, 0.06), reach=600)
def _led_batten(k):
    """A 2.4 m LED batten, its diffuser in the garage's tube (struck on as
    the room's are, src/world/garage.js): an aluminium body hung on two
    wires LED_DROP under the ceiling. Its origin is the diffuser's face."""
    t = k("trim")
    box(t, -1.2, 1.2, 0.012, 0.07, -0.055, 0.055, col=ALU)
    box(k("tube"), -1.18, 1.18, 0.0, 0.012, -0.04, 0.04, col=TUBE["white"], bottom=True)
    for x in (-1.0, 1.0):
        pipe(k("trim", 1), (x, 0.07, 0.0), (x, LED_DROP, 0.0), 0.0015, segs=3, col=STEEL_MID)
    cable(k("trim", 1), ((1.18, 0.05, 0.0), (1.3, 0.2, 0.0), (1.35, LED_DROP, 0.0)), 0.004, col=CABLE, segs=4)


@proto("garage_fluoro", box=(0.64, 0.25, 0.14), reach=500)
def _fluoro(k):
    """A twin-tube shop light, 1.2 m: its white reflector over two bare
    tubes (the garage's tube material), hung on two chains FLUORO_DROP
    under the ceiling. Its origin is the tubes' underside."""
    t, n = k("trim"), k("trim", 1)
    for s in (-1, 1):
        # Each half of the reflector: white under it, toward the tubes,
        # and dark on its back.
        under = [(-s * 0.62, 0.05, 0.0), (s * 0.62, 0.05, 0.0), (s * 0.62, 0.0, s * 0.13), (-s * 0.62, 0.0, s * 0.13)]
        quad(t, *under, col=WHITE_PAINT)
        quad(t, *reversed(under), col=GUN_DARK)
    for x in (-0.62, 0.62):
        box(t, x - 0.01 if x > 0 else x, x if x > 0 else x + 0.01, 0.0, 0.05, -0.05, 0.05, col=WHITE_PAINT)
    for z in (-0.045, 0.045):
        pipe(k("tube"), (-0.6, 0.02, z), (0.6, 0.02, z), 0.013, segs=6, col=TUBE["white"])
    for x in (-0.45, 0.45):
        for i in range(int(FLUORO_DROP / 0.04)):
            y = 0.05 + i * 0.04
            box(n, x - 0.004, x + 0.004, y, y + 0.03, -0.006, 0.006, col=STEEL_MID)


# ---------------------------------------------------------------------------
# The tune station's cart and the parts table.
# ---------------------------------------------------------------------------
# Where the tune cart's OBD lead ends, in the cart's own frame: set the cart
# so this point is at the car's OBD port (under the dash on the driver's
# side), the cart's front toward the open door.
TUNE_PLUG = (0.0, 0.55, 1.3)


def tune_lead(k, a, b, sag=0.3):
    """An OBD lead hung from a to b, with its plug at b looking toward the
    lead's run: for a layout that wants its own."""
    pts = hung(a, b, sag, n=10)
    cable(k("trim"), pts, 0.004, col=CABLE)
    d = (Vector(b) - Vector(pts[-2])).normalized()
    obox(k("trim"), tuple(Vector(b) - d * 0.02), tuple(d.cross(Vector((0, 1, 0))).normalized()), (0, 1, 0), 0.024, 0.012, 0.02, col=BLACK_PAINT)


@proto("garage_tune_cart", box=(0.4, 0.55, 0.25))
def _tune_cart(k):
    """The tune station: a black utility cart, a laptop open on it running
    a tuning tool (a header, a map grid, three traces), the vehicle
    interface beside it with its lights, the USB lead to it and the OBD
    lead from it to the plug at TUNE_PLUG; a notepad, a coffee cup."""
    _cart(k, BLACK_PAINT)
    t, n, g = k("trim"), k("trim", 1), k("glow")
    top = 0.832
    box(t, -0.17, 0.17, top, top + 0.02, -0.11, 0.13, col=lin("2a2c30"), bottom=True)
    quad(n, (-0.15, top + 0.021, 0.08), (0.15, top + 0.021, 0.08), (0.15, top + 0.021, -0.07), (-0.15, top + 0.021, -0.07), col=GRIME)
    a = math.radians(105)
    up = Vector((0, math.sin(a), -math.cos(a)))
    hinge = Vector((0, top + 0.02, -0.11))
    c = hinge + up * 0.115
    obox(t, tuple(c), (1, 0, 0), tuple(up), 0.17, 0.115, 0.006, col=lin("2a2c30"))
    fwd = Vector((1, 0, 0)).cross(up)
    sc = c + fwd * 0.0065

    def panel(key, u0, u1, v0, v1, col, lift=0.0):
        p = lambda uu, vv: tuple(sc + Vector((uu, 0, 0)) + up * vv + fwd * lift)  # noqa: E731
        quad(key, p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1), col=col)
    panel(g, -0.155, 0.155, -0.1, 0.1, (0.012, 0.02, 0.035, 1))
    panel(g, -0.155, 0.155, 0.08, 0.1, (0.05, 0.4, 0.55, 1), 0.0005)
    for i in range(5):
        for j in range(4):
            hue = ((0.1, 0.4, 0.2), (0.45, 0.4, 0.05), (0.5, 0.12, 0.05))[(i + j) % 3]
            panel(k("glow", 1), -0.15 + i * 0.03, -0.124 + i * 0.03, -0.04 + j * 0.028, -0.016 + j * 0.028, (*hue, 1), 0.0005)
    for m, hue in enumerate(((0.1, 0.9, 0.3), (0.95, 0.6, 0.05), (0.2, 0.5, 1.0))):
        prev = None
        for i in range(9):
            uu = 0.01 + i * 0.016
            vv = -0.07 + 0.03 * m + 0.02 * math.sin(i * 0.9 + m)
            if prev:
                d = Vector((uu - prev[0], vv - prev[1], 0)).normalized()
                p0 = sc + Vector((prev[0], 0, 0)) + up * prev[1] + fwd * 0.0007
                p1 = sc + Vector((uu, 0, 0)) + up * vv + fwd * 0.0007
                nrm = up * d.x * 0.0018 - Vector((1, 0, 0)) * d.y * 0.0018
                quad(g, tuple(p0 - nrm), tuple(p1 - nrm), tuple(p1 + nrm), tuple(p0 + nrm), col=(*hue, 1))
            prev = (uu, vv)
    # The vehicle interface and its leads.
    box(t, 0.2, 0.33, top, top + 0.035, -0.05, 0.08, col=lin("2b6a8f"))
    for i, hue in enumerate(((0.1, 0.9, 0.2), (0.9, 0.5, 0.05), (0.1, 0.4, 1.0))):
        box(k("glow", 1), 0.22 + i * 0.03, 0.235 + i * 0.03, top + 0.035, top + 0.037, 0.05, 0.065, col=(*hue, 1))
    cable(t, ((0.17, top + 0.01, -0.02), (0.19, top + 0.004, 0.0), (0.205, top + 0.015, 0.01)), 0.003, col=CABLE)
    tune_lead(k, (0.33, top + 0.017, 0.07), TUNE_PLUG, sag=0.3)
    quad(t, (-0.33, top + 0.001, 0.18), (-0.2, top + 0.001, 0.19), (-0.19, top + 0.001, 0.0), (-0.32, top + 0.001, -0.01), col=lin("c8c2a8"))
    lathe(t, -0.27, -0.12, ((top, 0.03), (top + 0.1, 0.038)), segs=8, col=WHITE_PAINT)


@proto("garage_parts_table", box=(0.76, 0.5, 0.38))
def _parts_table(k):
    """A steel parts table, 1.5 by 0.75 m: a brake disc and its caliper, a
    turbocharger, a coilover, a box of spark plugs and a rag laid out."""
    t, n = k("trim"), k("trim", 1)
    top = 0.9
    box(t, -0.75, 0.75, top - 0.03, top, -0.375, 0.375, col=STEEL_MID, bottom=True)
    for x in (-0.72, 0.68):
        for z in (-0.35, 0.31):
            box(t, x, x + 0.04, 0.0, top - 0.03, z, z + 0.04, col=GUN)
    box(t, -0.72, 0.72, 0.2, 0.22, -0.35, 0.35, col=GUN_DARK)
    # Brake disc, lying flat, and its caliper.
    revolve(t, (-0.45, top, 0.05), (0, 1, 0), ((0.0, 0.08), (0.0, 0.175), (0.03, 0.175), (0.03, 0.09), (0.075, 0.09), (0.075, 0.0)), segs=18, col=STEEL_MID)
    for i in range(18):
        a = i * math.tau / 18
        cylinder(n, -0.45 + 0.13 * math.cos(a), 0.05 + 0.13 * math.sin(a), top + 0.03, top + 0.031, 0.004, segs=4, col=GRIME)
    box(t, -0.2, 0.02, top, top + 0.09, -0.25, -0.1, col=RED)
    box(t, -0.19, 0.01, top + 0.09, top + 0.095, -0.24, -0.11, col=RED_DARK)
    # A turbo: compressor cover, centre section, turbine housing.
    revolve(t, (0.12, top + 0.11, 0.15), (1, 0, 0), ((-0.09, 0.0), (-0.09, 0.05), (-0.06, 0.11), (0.0, 0.11), (0.01, 0.06), (0.01, 0.0)), segs=14, col=ALU)
    revolve(t, (0.12, top + 0.11, 0.15), (1, 0, 0), ((0.01, 0.0), (0.01, 0.05), (0.06, 0.05), (0.06, 0.0)), segs=10, col=STEEL_MID)
    revolve(t, (0.12, top + 0.11, 0.15), (1, 0, 0), ((0.06, 0.0), (0.06, 0.1), (0.13, 0.09), (0.13, 0.0)), segs=14, col=lin("3a2f28"))
    pipe(t, (0.12 - 0.09, top + 0.11, 0.15), (-0.06, top + 0.11, 0.15), 0.045, segs=10, col=ALU)
    box(t, 0.05, 0.25, top, top + 0.02, 0.05, 0.25, col=GUN_DARK)
    # A coilover: its damper body and the spring round it, lying down.
    pipe(t, (0.3, top + 0.06, -0.2), (0.7, top + 0.06, -0.2), 0.025, segs=10, col=lin("c9c8c4"), caps=True)
    pts = [(0.36 + i * 0.006, top + 0.06 + 0.055 * math.sin(i * 0.5), -0.2 + 0.055 * math.cos(i * 0.5)) for i in range(51)]
    cable(t, pts, 0.008, col=RED, segs=5)
    for x in (0.34, 0.68):
        pipe(t, (x, top + 0.06, -0.2), (x + 0.02, top + 0.06, -0.2), 0.07, segs=12, col=STEEL_MID, caps=True)
    carton(k, 0.45, 0.62, top, top + 0.06, 0.12, 0.3, 0.71)
    quad(t, (-0.7, top + 0.001, 0.32), (-0.48, top + 0.001, 0.3), (-0.5, top + 0.001, 0.15), (-0.72, top + 0.001, 0.18), col=lin("8f2a24"))


# ---------------------------------------------------------------------------
# The room's working light: the broad task strips over each bay and the
# work lights on stands at the cars' noses. Each says where its luminous
# face is (centre, size, the way it looks), in its own frame, for the
# layout's light anchors (anchor_garage_light_<id>).
# ---------------------------------------------------------------------------
# Neutral, about 4400 K: the task light the room is lit by.
TASK_WHITE = lin("ffe0c2")
TASK_DROP = 0.8
TASK_FACE = {"centre": (0.0, 0.0, 0.0), "size": (4.5, 0.35), "normal": (0.0, -1.0, 0.0)}


@proto("garage_task_light", box=(2.3, 0.45, 0.22), reach=700)
def _task_light(k):
    """A broad linear task light over a bay: a 4.5 m by 0.35 m luminous
    face (TASK_FACE) in the garage's tube, in an aluminium body with its
    end caps and driver box, hung on three pairs of rods TASK_DROP under
    the ceiling or a truss. Its origin is the face's middle."""
    t, n = k("trim"), k("trim", 1)
    w, d = 2.25, 0.175
    box(t, -w - 0.02, w + 0.02, 0.004, 0.09, -d - 0.025, d + 0.025, col=ALU)
    box(k("tube"), -w, w, 0.0, 0.004, -d, d, col=TASK_WHITE, bottom=True)
    for x in (-w - 0.02, w):
        box(t, x, x + 0.02, -0.004, 0.092, -d - 0.027, d + 0.027, col=GUN_DARK)
    box(t, -0.4, 0.4, 0.09, 0.15, -0.06, 0.06, col=GUN_DARK)
    for x in (-1.9, 0.0, 1.9):
        for z in (-0.12, 0.12):
            pipe(n, (x, 0.09, z), (x, TASK_DROP, z), 0.004, segs=4, col=STEEL_MID)
    cable(n, ((0.4, 0.12, 0.0), (0.6, 0.4, 0.0), (0.7, TASK_DROP, 0.0)), 0.005, col=CABLE, segs=4)


WORK_LIGHT_FACE = {"centre": (0.0, 2.1, 0.11), "size": (0.32, 0.2), "tilt_down_deg": 35.0}


@proto("garage_work_light", box=(0.42, 1.1, 0.42), reach=300)
def _work_light(k):
    """A work light on a tripod stand: three splayed legs, a telescoping
    mast to 2.1 m, a yoke and an LED flood head looking toward +z and 35
    degrees down (WORK_LIGHT_FACE), its cord down the mast to the floor.
    Set it at a car's nose, looking at the open bay."""
    t, n = k("trim"), k("trim", 1)
    for i in range(3):
        a = i * math.tau / 3 + math.pi / 2
        beam(t, (0.0, 0.7, 0.0), (0.42 * math.cos(a), 0.0, 0.42 * math.sin(a)), 0.012, 0.012, col=BLACK_PAINT)
        cylinder(n, 0.42 * math.cos(a), 0.42 * math.sin(a), 0.0, 0.02, 0.022, segs=6, col=RUBBER)
    pipe(t, (0.0, 0.62, 0.0), (0.0, 1.5, 0.0), 0.02, segs=8, col=BLACK_PAINT, caps=True)
    pipe(t, (0.0, 1.5, 0.0), (0.0, 2.02, 0.0), 0.014, segs=8, col=ALU, caps=True)
    pipe(n, (-0.03, 1.5, 0.0), (0.03, 1.5, 0.0), 0.028, segs=8, col=YELLOW, caps=True)
    c = Vector(WORK_LIGHT_FACE["centre"])
    tilt = math.radians(WORK_LIGHT_FACE["tilt_down_deg"])
    fwd = Vector((0.0, -math.sin(tilt), math.cos(tilt)))
    up = Vector((0.0, math.cos(tilt), math.sin(tilt)))
    hc = c - fwd * 0.04
    for s in (-1, 1):
        beam(t, (0.0, 2.0, 0.0), (s * 0.2, 2.06, 0.0), 0.01, 0.01, col=BLACK_PAINT)
        beam(t, (s * 0.2, 2.06, 0.0), tuple(hc + Vector((s * 0.2, 0, 0))), 0.01, 0.01, col=BLACK_PAINT)
    obox(t, tuple(hc), (1, 0, 0), tuple(up), 0.18, 0.12, 0.04, col=YELLOW)
    for i in range(6):
        fc = hc - fwd * (0.045 + i * 0.008)
        obox(n, tuple(fc), (1, 0, 0), tuple(up), 0.17, 0.11, 0.003, col=GUN_DARK, skip=("+w", "-w"))
    sc = c + fwd * 0.001
    w, h = WORK_LIGHT_FACE["size"]
    R = Vector((1, 0, 0))
    quad(k("glow"), tuple(sc - R * w / 2 - up * h / 2), tuple(sc + R * w / 2 - up * h / 2), tuple(sc + R * w / 2 + up * h / 2), tuple(sc - R * w / 2 + up * h / 2),
         col=(*TASK_WHITE[:3], 1))
    cable(t, ((0.0, 2.0, -0.05), (0.0, 1.6, -0.03), (0.0, 0.7, -0.03), (0.1, 0.3, -0.2), (0.3, 0.005, -0.5)), 0.005, col=CABLE)


# ---------------------------------------------------------------------------
# The welder on its cart, and a drip tray.
# ---------------------------------------------------------------------------
@proto("garage_welder", box=(0.32, 0.65, 0.45), reach=260)
def _welder(k):
    """A MIG welder on its cart: the machine with its panel and knobs, the
    gas bottle chained at the back with its regulator, the torch lead and
    the earth clamp coiled on their hooks."""
    t, n = k("trim"), k("trim", 1)
    box(t, -0.25, 0.25, 0.1, 0.16, -0.42, 0.3, col=BLACK_PAINT, bottom=True)
    for x in (-0.27, 0.27):
        pipe(t, (x, 0.12, -0.32), (x + (0.03 if x > 0 else -0.03), 0.12, -0.32), 0.12, segs=12, col=RUBBER, caps=True)
    _castors(k, (-0.2, 0.2), (0.24,), 0.1, r=0.05)
    box(t, -0.2, 0.2, 0.16, 0.6, -0.15, 0.3, col=BLUE)
    box(t, -0.19, 0.19, 0.38, 0.58, 0.3, 0.305, col=GUN_DARK)
    box(k("glow", 1), -0.12, -0.02, 0.5, 0.54, 0.305, 0.307, col=(0.9, 0.3, 0.05, 1))
    for i in range(3):
        pipe(n, (-0.12 + i * 0.1, 0.43, 0.305), (-0.12 + i * 0.1, 0.43, 0.33), 0.02, segs=8, col=BLACK_PAINT, caps=True)
    lathe(t, 0.0, -0.32, ((0.16, 0.1), (1.12, 0.1), (1.2, 0.06), (1.24, 0.025)), segs=12, col=GREEN)
    box(t, -0.03, 0.03, 1.24, 1.3, -0.35, -0.29, col=CHROME)
    pipe(n, (0.03, 1.27, -0.32), (0.08, 1.27, -0.32), 0.03, segs=8, col=CHROME, caps=True)
    for y in (0.5, 0.95):
        cable(n, [(0.1 * math.cos(i * 0.6), y, -0.32 + 0.105 * math.sin(i * 0.6)) for i in range(12)], 0.004, col=STEEL_MID, segs=3)
    cable(t, ((0.2, 0.3, 0.2), (0.32, 0.4, 0.1), (0.36, 0.6, 0.0), (0.3, 0.75, -0.1)), 0.012, col=BLACK_PAINT)
    revolve(t, (0.3, 0.55, 0.05), (1, 0, 0), [(0.02 * math.sin(i * math.tau / 6), 0.12 - 0.02 * math.cos(i * math.tau / 6)) for i in range(7)], segs=12, col=BLACK_PAINT)


@proto("garage_drip_tray", box=(0.42, 0.03, 0.32), reach=140, detail=True)
def _drip_tray(k):
    """A low drip tray slid under a car, dark with old oil."""
    t = k("trim")
    box(t, -0.42, 0.42, 0.0, 0.05, -0.32, 0.32, col=BLACK_PAINT)
    quad(t, (-0.39, 0.051, 0.29), (0.39, 0.051, 0.29), (0.39, 0.051, -0.29), (-0.39, 0.051, -0.29), col=GRIME)
