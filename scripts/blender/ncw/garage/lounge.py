"""The lounge corner and what sells the room: a worn couch, a fridge, a low
table, the coffee; the extinguisher and the first aid box; the floor's
drains, its oil stains and tyre marks, its painted bay numbers, a cable
ramp; the shop's lit sign, its neon and its posters, and the monitor's
bezel.

The floor's marks are flat polygons a few millimetres up (the kit has no
decal pass): opaque, in `trim`, so they hold the floor's own reflections
off where they lie, as oil does not. The shop's sign spells AFTERLIFE AUTO,
the name the city's garage already carries on its blade (src/data/world.js,
garage_blade), in the sign maker's strokes in `glow`; its posters are the
city's own adverts (`print` boards and a `face` lightbox), dealt by where
each hangs.
"""
import math
import random

from mathutils import Vector

from ncw.kit import GLOW, box, cylinder, pipe, poly, quad
from ncw.props import BOARD, CARTON, POSTER, SHEET, carton, lathe, proto
from ncw.garage.shapes import (
    BLACK_PAINT, CABLE, CHROME, GREEN, GRIME, GUN, GUN_DARK, OFFWHITE, RED, RUBBER, STEEL_MID, WHITE_PAINT,
    WOOD_DARK, YELLOW, beam, cable, lin, obox, shade, stroke, words,
)

VINYL = lin("3b0a10")
VINYL_LIGHT = lin("5a1a1e")


# ---------------------------------------------------------------------------
# The lounge.
# ---------------------------------------------------------------------------
@proto("garage_couch", box=(1.06, 0.45, 0.46))
def _couch(k):
    """A worn two-seat couch in oxblood vinyl: its base, two seat cushions
    sagged in the middle, two back cushions leaning, the arms, short legs;
    one cushion split and taped, a seam open on an arm."""
    t, n = k("trim"), k("trim", 1)
    box(t, -1.0, 1.0, 0.08, 0.38, -0.42, 0.4, col=shade(VINYL, 0.8))
    for i, s in enumerate((-1, 1)):
        cx = s * 0.47
        obox(t, (cx, 0.44, 0.04), (1, 0, 0), (0, 1, -0.05 * s), 0.46, 0.065, 0.36, col=VINYL if i else shade(VINYL, 1.1))
        obox(t, (cx, 0.72, -0.31), (1, 0, 0), (0, 1, 0.22), 0.46, 0.27, 0.09, col=shade(VINYL, 0.95 + 0.1 * i))
    for s in (-1, 1):
        box(t, s * 0.94 - 0.07, s * 0.94 + 0.07, 0.08, 0.66, -0.42, 0.42, col=VINYL)
        box(t, s * 0.94 - 0.08, s * 0.94 + 0.08, 0.62, 0.68, -0.43, 0.44, col=VINYL_LIGHT)
    box(t, -1.0, 1.0, 0.38, 1.0, -0.44, -0.4, col=shade(VINYL, 0.7))
    for x in (-0.95, 0.95):
        for z in (-0.38, 0.36):
            cylinder(t, x, z, 0.0, 0.08, 0.025, segs=6, col=WOOD_DARK)
    # The split, its foam showing, and the tape over half of it.
    quad(n, (0.3, 0.511, 0.15), (0.62, 0.508, 0.18), (0.6, 0.509, 0.1), (0.32, 0.512, 0.08), col=lin("b8a46a"))
    quad(n, (0.36, 0.514, 0.22), (0.5, 0.514, 0.22), (0.5, 0.514, 0.04), (0.36, 0.514, 0.04), col=lin("7d7f80"))
    quad(n, (-1.011, 0.5, 0.1), (-1.011, 0.5, 0.3), (-1.011, 0.6, 0.3), (-1.011, 0.6, 0.1), col=lin("a08f5c"))


@proto("garage_fridge", box=(0.3, 0.73, 0.32))
def _fridge(k):
    """An old shop fridge, 1.45 m: off-white, grubby round its handle, its
    freezer door over the main one, a grille at its foot, stickers, a
    small green light."""
    t, n = k("trim"), k("trim", 1)
    box(t, -0.3, 0.3, 0.04, 1.45, -0.32, 0.28, col=OFFWHITE)
    for y0, y1 in ((0.12, 1.03), (1.05, 1.43)):
        box(t, -0.295, 0.295, y0, y1, 0.28, 0.31, col=shade(OFFWHITE, 1.05))
    quad(t, (-0.29, 1.035, 0.311), (0.29, 1.035, 0.311), (0.29, 1.045, 0.311), (-0.29, 1.045, 0.311), col=GRIME)
    for y0, y1 in ((0.65, 0.98), (1.1, 1.3)):
        box(t, 0.22, 0.25, y0, y1, 0.31, 0.34, col=CHROME)
        quad(n, (0.17, y0, 0.3105), (0.3, y0, 0.3105), (0.3, y1, 0.3105), (0.17, y1, 0.3105), col=shade(OFFWHITE, 0.55))
    box(t, -0.28, 0.28, 0.04, 0.12, 0.27, 0.29, col=GRIME)
    for x in (-0.25, 0.25):
        cylinder(t, x, 0.0, 0.0, 0.04, 0.025, segs=6, col=BLACK_PAINT)
    r = random.Random(3)
    for col in (lin("1e7fd0"), lin("e03a2a"), lin("f0c419"), lin("20a050"), lin("e44a9a")):
        cx, cy, s = r.uniform(-0.2, 0.1), r.uniform(0.3, 1.35), r.uniform(0.03, 0.06)
        quad(n, (cx - s, cy - s * 0.7, 0.3105), (cx + s, cy - s * 0.7, 0.3105), (cx + s, cy + s * 0.7, 0.3105), (cx - s, cy + s * 0.7, 0.3105), col=col)
    box(k("glow", 1), -0.26, -0.25, 1.38, 1.39, 0.31, 0.312, col=(0.1, 0.9, 0.3, 1))


@proto("garage_side_table", box=(0.32, 0.3, 0.32), reach=220)
def _side_table(k):
    """A low table, its top marked with rings, and on it three cans, an
    ashtray, a pizza box and a magazine."""
    t, n = k("trim"), k("trim", 1)
    h = 0.48
    box(t, -0.32, 0.32, h - 0.03, h, -0.32, 0.32, col=WOOD_DARK, bottom=True)
    for x in (-0.29, 0.26):
        for z in (-0.29, 0.26):
            box(t, x, x + 0.03, 0.0, h - 0.03, z, z + 0.03, col=BLACK_PAINT)
    box(t, -0.29, 0.29, 0.1, 0.115, -0.29, 0.29, col=BLACK_PAINT)
    for (x, z), col in zip(((0.2, 0.15), (0.12, 0.22), (-0.22, -0.18)), (lin("c0302a"), lin("1d6fb8"), lin("2a2a2a"))):
        lathe(t, x, z, ((h, 0.031), (h + 0.11, 0.033), (h + 0.122, 0.026)), segs=8, col=col)
    lathe(t, -0.15, 0.18, ((h, 0.06), (h + 0.025, 0.065)), segs=8, col=STEEL_MID)
    carton(k, -0.3, 0.12, h, h + 0.045, -0.3, 0.06, 0.13, top=True)
    quad(k("print"), (0.0, h + 0.002, 0.28), (0.21, h + 0.002, 0.3), (0.23, h + 0.002, 0.03), (0.02, h + 0.002, 0.01), col=(0.62, 1.0, SHEET, CARTON))


@proto("garage_coffee", box=(0.42, 0.75, 0.27), reach=260)
def _coffee(k):
    """The coffee: a low cabinet, a filter machine on it with its carafe on
    the hot plate and its red light, three mugs, a stack of paper cups, a
    jar of sugar."""
    t, n = k("trim"), k("trim", 1)
    box(t, -0.4, 0.4, 0.06, 0.88, -0.25, 0.25, col=GUN)
    box(t, -0.41, 0.41, 0.88, 0.9, -0.26, 0.26, col=lin("6a6a66"))
    for x0, x1 in ((-0.395, -0.005), (0.005, 0.395)):
        box(t, x0, x1, 0.08, 0.86, 0.25, 0.26, col=shade(GUN, 1.15))
        box(t, (x0 + x1) / 2 - 0.05, (x0 + x1) / 2 + 0.05, 0.76, 0.78, 0.26, 0.275, col=CHROME)
    box(t, -0.39, 0.39, 0.0, 0.06, -0.24, 0.22, col=BLACK_PAINT)
    y = 0.9
    box(t, -0.14, 0.12, y, y + 0.04, -0.15, 0.14, col=BLACK_PAINT)
    box(t, -0.14, 0.12, y + 0.04, y + 0.38, -0.15, -0.04, col=BLACK_PAINT)
    box(t, -0.14, 0.12, y + 0.3, y + 0.38, -0.04, 0.12, col=BLACK_PAINT, bottom=True)
    lathe(t, -0.01, 0.04, ((y + 0.04, 0.06), (y + 0.12, 0.072), (y + 0.2, 0.06), (y + 0.24, 0.04)), segs=10, col=lin("2a1a12"))
    pipe(t, (0.05, y + 0.18, 0.04), (0.11, y + 0.14, 0.04), 0.01, segs=5, col=BLACK_PAINT)
    box(k("glow", 1), 0.08, 0.1, y + 0.015, y + 0.03, 0.14, 0.142, col=(1.0, 0.08, 0.04, 1))
    for i, col in enumerate((WHITE_PAINT, lin("1d1d1d"), lin("b02a2a"))):
        x, z = 0.2 + (i % 2) * 0.09, -0.1 + i * 0.09
        lathe(t, x, z, ((y, 0.04), (y + 0.095, 0.042)), segs=8, col=col)
        lathe(t, x, z, ((y + 0.095, 0.036), (y + 0.012, 0.034)), segs=8, col=GRIME, cap=False)
        pipe(n, (x + 0.04, y + 0.03, z), (x + 0.06, y + 0.07, z), 0.007, segs=4, col=col)
    lathe(t, -0.3, 0.05, ((y, 0.035), (y + 0.2, 0.042)), segs=8, col=lin("e8e2d0"))
    lathe(t, -0.28, -0.12, ((y, 0.045), (y + 0.11, 0.045), (y + 0.13, 0.03)), segs=8, col=lin("c8c4b8"))


# ---------------------------------------------------------------------------
# Safety, and the floor.
# ---------------------------------------------------------------------------
@proto("garage_extinguisher", box=(0.12, 0.85, 0.12), reach=200, detail=True)
def _extinguisher(k):
    """A 6 kg extinguisher on its wall bracket at 1 m, its hose clipped
    down its side, and the red plate over it with FIRE on it."""
    t, n = k("trim"), k("trim", 1)
    box(t, -0.05, 0.05, 1.05, 1.25, 0.0, 0.015, col=STEEL_MID)
    box(t, -0.07, 0.07, 1.1, 1.13, 0.015, 0.18, col=STEEL_MID)
    lathe(t, 0.0, 0.1, ((1.0, 0.075), (1.48, 0.075), (1.52, 0.06), (1.54, 0.03)), segs=12, col=RED)
    lathe(n, 0.0, 0.1, ((1.12, 0.0765), (1.3, 0.0765)), segs=12, col=WHITE_PAINT, cap=False)
    box(t, -0.025, 0.025, 1.54, 1.6, 0.075, 0.125, col=CHROME)
    beam(t, (0.0, 1.62, 0.1), (0.1, 1.6, 0.1), 0.012, 0.004, col=BLACK_PAINT)
    beam(t, (0.0, 1.6, 0.1), (0.09, 1.57, 0.1), 0.012, 0.004, col=BLACK_PAINT)
    pipe(n, (-0.03, 1.57, 0.12), (-0.045, 1.57, 0.12), 0.022, segs=8, col=WHITE_PAINT, caps=True)
    cable(t, ((0.025, 1.56, 0.1), (0.09, 1.5, 0.12), (0.085, 1.15, 0.13), (0.075, 1.08, 0.12)), 0.009, col=BLACK_PAINT)
    box(t, -0.1, 0.1, 1.68, 1.88, 0.0, 0.006, col=RED)
    words(t, "FIRE", (0.0, 1.78, 0.0065), (1, 0, 0), (0, 1, 0), 0.15, 0.06, 0.012, WHITE_PAINT)


@proto("garage_first_aid", box=(0.18, 0.8, 0.07), reach=200, detail=True)
def _first_aid(k):
    """A first aid box on the wall at 1.45 m: white, a green cross, its
    catch."""
    t = k("trim")
    box(t, -0.18, 0.18, 1.45, 1.75, 0.0, 0.12, col=WHITE_PAINT, bottom=True)
    box(t, -0.035, 0.035, 1.52, 1.68, 0.12, 0.123, col=GREEN)
    box(t, -0.08, 0.08, 1.565, 1.635, 0.12, 0.123, col=GREEN)
    box(t, -0.02, 0.02, 1.7, 1.73, 0.12, 0.13, col=STEEL_MID)


@proto("garage_floor_drain", box=(0.2, 0.01, 0.2), reach=120, detail=True)
def _floor_drain(k):
    """A square floor drain, 0.36 m: its frame, the dark sump, the grate's
    bars."""
    t, n = k("trim"), k("trim", 1)
    s = 0.18
    quad(t, (-s, 0.002, s), (s, 0.002, s), (s, 0.002, -s), (-s, 0.002, -s), col=GRIME)
    for (x0, x1, z0, z1) in ((-s - 0.02, s + 0.02, s, s + 0.02), (-s - 0.02, s + 0.02, -s - 0.02, -s), (-s - 0.02, -s, -s, s), (s, s + 0.02, -s, s)):
        box(t, x0, x1, 0.0, 0.006, z0, z1, col=STEEL_MID)
    for i in range(9):
        x = -s + 0.02 + i * 0.04
        box(t, x, x + 0.012, 0.0, 0.005, -s, s, col=GUN_DARK)
    box(n, -s, s, 0.0, 0.004, -0.006, 0.006, col=GUN_DARK)


@proto("garage_trench_drain", box=(1.5, 0.01, 0.1), reach=160, detail=True)
def _trench_drain(k):
    """A 3 m trench drain across a bay's mouth: its edge angles, the dark
    channel and the grate's slots (near by)."""
    t, n = k("trim"), k("trim", 1)
    quad(t, (-1.5, 0.002, 0.075), (1.5, 0.002, 0.075), (1.5, 0.002, -0.075), (-1.5, 0.002, -0.075), col=GRIME)
    for z in (-0.095, 0.075):
        box(t, -1.5, 1.5, 0.0, 0.006, z, z + 0.02, col=STEEL_MID)
    for i in range(50):
        x = -1.47 + i * 0.06
        box(n if i % 5 else t, x, x + 0.025, 0.0, 0.005, -0.075, 0.075, col=GUN_DARK)


def _blob(key, cx, cz, r, seed, col, n=14, y=0.003):
    """A flat irregular pool r across about (cx, cz)."""
    rr = random.Random(seed)
    pts = []
    for i in range(n):
        a = i * math.tau / n
        d = r * (0.6 + 0.5 * rr.random()) * (1.0 + 0.25 * math.sin(a * 3 + seed))
        pts.append((cx + d * math.cos(a), y, cz - d * math.sin(a)))
    for i in range(n):
        poly(key, [(cx, y, cz), pts[i], pts[(i + 1) % n]], [(0.5, 0.5), (0, 0), (1, 0)], col)


OIL = lin("0b0a09")
OIL_EDGE = lin("16140f")


def _stain(k, r, seed, drops):
    t = k("trim")
    _blob(t, 0.0, 0.0, r * 1.15, seed, OIL_EDGE, y=0.002)
    _blob(t, 0.0, 0.0, r, seed + 1, OIL, y=0.003)
    rr = random.Random(seed)
    for _ in range(drops):
        a, d = rr.uniform(0, math.tau), rr.uniform(r * 1.3, r * 2.4)
        _blob(k("trim", 1), d * math.cos(a), d * math.sin(a), rr.uniform(0.015, 0.05), rr.randint(0, 99), OIL, n=7)


@proto("garage_stain_a", box=(0.6, 0.01, 0.6), reach=160, detail=True)
def _stain_a(k):
    """An old oil stain where an engine has stood, a metre across, drips
    round it (a pool, not a decal: see the module's note)."""
    _stain(k, 0.42, 4, 7)


@proto("garage_stain_b", box=(0.35, 0.01, 0.35), reach=140, detail=True)
def _stain_b(k):
    """A smaller oil stain, half a metre, a few drops."""
    _stain(k, 0.22, 9, 4)


@proto("garage_stain_c", box=(0.6, 0.01, 0.2), reach=140, detail=True)
def _stain_c(k):
    """A smear of oil dragged out along x, as a drain pan leaves it."""
    t = k("trim")
    for i in range(6):
        _blob(t, -0.45 + i * 0.17, 0.02 * math.sin(i), 0.07 + 0.03 * (i % 2), 20 + i, OIL)


@proto("garage_tyre_marks", box=(1.6, 0.01, 1.2), reach=160, detail=True)
def _tyre_marks(k):
    """Two arcs of tyre rubber where a car has been turned in toward +z,
    broken where the tread lifted."""
    t = k("trim")
    rr = random.Random(12)
    for off in (-0.8, 0.8):
        R = 3.2 + off
        for i in range(22):
            if rr.random() < 0.25:
                continue
            a0, a1 = 0.04 * i, 0.04 * i + 0.035
            w = 0.09 * (0.6 + 0.4 * rr.random())
            p = lambda a, rad: (-3.2 + rad * math.cos(a) * 0.5 + 1.6, 0.003, -1.2 + rad * math.sin(a))  # noqa: E731
            quad(t, p(a0, R - w), p(a1, R - w), p(a1, R + w), p(a0, R + w), col=shade(OIL, 1.2 + 0.4 * rr.random()))


def _floor_words(k, text, w, h, thick, col, mat="hazard"):
    words(k(mat), text, (0.0, 0.004, 0.0), (1, 0, 0), (0, 0, -1), w, h, thick, col)


@proto("garage_bay_01", box=(0.9, 0.01, 0.45), reach=200, detail=True)
def _bay_01(k):
    """BAY 01 stencilled on the floor in yellow, reading from +z."""
    _floor_words(k, "BAY 01", 1.7, 0.42, 0.06, (1, 1, 1, 1))


@proto("garage_bay_02", box=(0.9, 0.01, 0.45), reach=200, detail=True)
def _bay_02(k):
    """BAY 02 stencilled on the floor in yellow, reading from +z."""
    _floor_words(k, "BAY 02", 1.7, 0.42, 0.06, (1, 1, 1, 1))


@proto("garage_cable_ramp", box=(0.6, 0.03, 0.15), reach=140, detail=True)
def _cable_ramp(k):
    """A cable protector across a walkway, 1.2 m, in black with its yellow
    lid."""
    t = k("trim")
    for s in (-1, 1):
        x0, x1 = -0.6 * s, 0.6 * s
        quad(t, (x0, 0.0, s * 0.15), (x1, 0.0, s * 0.15), (x1, 0.04, s * 0.05), (x0, 0.04, s * 0.05), col=RUBBER)
    box(t, -0.6, 0.6, 0.04, 0.045, -0.05, 0.05, col=YELLOW)


# ---------------------------------------------------------------------------
# The shop's sign, its neon, its posters, the monitor's bezel.
# ---------------------------------------------------------------------------
@proto("garage_shop_sign", box=(1.75, 0.5, 0.08), reach=900)
def _shop_sign(k):
    """The shop's own sign: AFTERLIFE AUTO in neon tube (cyan over pink,
    the garage's two colours) on a black backer 3.4 m wide, a spanner in
    tube at its left, the transformer box under it, the standoffs and the
    tube's dark returns near by. Its back is on the wall (z 0), its foot
    at y 0: set it at the height it hangs."""
    t, n, g = k("trim"), k("trim", 1), k("glow")
    box(t, -1.7, 1.7, 0.0, 0.95, 0.0, 0.05, col=BLACK_PAINT)
    for (a, b, c, d) in ((-1.72, 1.72, 0.93, 0.97), (-1.72, 1.72, -0.02, 0.02), (-1.72, -1.68, 0.0, 0.95), (1.68, 1.72, 0.0, 0.95)):
        box(t, a, b, c, d, 0.0, 0.06, col=GUN_DARK)
    words(g, "AFTERLIFE", (0.25, 0.64, 0.05), (1, 0, 0), (0, 1, 0), 2.6, 0.36, 0.035, GLOW["cyan"], lift=0.035, gap=0.24)
    words(g, "AUTO", (0.25, 0.22, 0.05), (1, 0, 0), (0, 1, 0), 1.3, 0.24, 0.03, GLOW["pink"], lift=0.035, gap=0.26)
    stroke(g, _SPANNER, Vector((-1.35, 0.47, 0.085)), Vector((1, 0, 0)), Vector((0, 1, 0)), 0.03, GLOW["amber"])
    # The dark of each tube a hair behind it, and the standoffs.
    words(n, "AFTERLIFE", (0.25, 0.64, 0.05), (1, 0, 0), (0, 1, 0), 2.6, 0.36, 0.05, GRIME, lift=0.02, gap=0.24)
    for x in (-1.5, -0.6, 0.4, 1.4):
        for y in (0.2, 0.7):
            pipe(n, (x, y, 0.05), (x, y, 0.085), 0.006, segs=4, col=CHROME)
    box(t, 1.2, 1.55, -0.3, -0.05, 0.0, 0.12, col=GUN)
    cable(t, ((1.37, -0.05, 0.06), (1.37, 0.02, 0.06)), 0.01, col=CABLE)


# A spanner in tube, open jaw at the top, in a box about 0.6 m tall.
_SPANNER = [((-0.03, -0.28), (-0.03, 0.12)), ((0.03, -0.28), (0.03, 0.12)), ((-0.03, -0.28), (0.03, -0.28)),
            ((-0.03, 0.12), (-0.1, 0.18)), ((-0.1, 0.18), (-0.1, 0.3)), ((-0.1, 0.3), (-0.04, 0.3)), ((-0.04, 0.3), (-0.04, 0.22)),
            ((-0.04, 0.22), (0.04, 0.22)), ((0.04, 0.22), (0.04, 0.3)), ((0.04, 0.3), (0.1, 0.3)), ((0.1, 0.3), (0.1, 0.18)),
            ((0.1, 0.18), (0.03, 0.12))]


@proto("garage_neon_open", box=(0.45, 0.25, 0.04), reach=500)
def _neon_open(k):
    """OPEN in red neon in a rounded border, on clear acrylic hung on two
    chains: for a window or the wall by the door (its foot at y 0)."""
    t, n, g = k("trim"), k("trim", 1), k("glow")
    quad(k("clearglass"), (-0.42, 0.0, 0.01), (0.42, 0.0, 0.01), (0.42, 0.42, 0.01), (-0.42, 0.42, 0.01), col=(0.6, 0.6, 0.65, 1))
    words(g, "OPEN", (0.0, 0.21, 0.01), (1, 0, 0), (0, 1, 0), 0.6, 0.2, 0.02, GLOW["red"], lift=0.012, gap=0.2)
    border = [((-0.36, -0.15), (0.36, -0.15)), ((0.36, -0.15), (0.4, -0.11)), ((0.4, -0.11), (0.4, 0.11)), ((0.4, 0.11), (0.36, 0.15)),
              ((0.36, 0.15), (-0.36, 0.15)), ((-0.36, 0.15), (-0.4, 0.11)), ((-0.4, 0.11), (-0.4, -0.11)), ((-0.4, -0.11), (-0.36, -0.15))]
    stroke(g, border, Vector((0.0, 0.21, 0.022)), Vector((1, 0, 0)), Vector((0, 1, 0)), 0.014, GLOW["blue"])
    for x in (-0.35, 0.35):
        for i in range(6):
            box(n, x - 0.004, x + 0.004, 0.42 + i * 0.04, 0.45 + i * 0.04, 0.006, 0.014, col=STEEL_MID)


@proto("garage_neon_wrench", box=(0.4, 0.4, 0.04), reach=500)
def _neon_wrench(k):
    """Two spanners crossed in tube, cyan and pink, on a black panel: the
    shop's mark for a wall (its foot at y 0, back on the wall)."""
    t, g = k("trim"), k("glow")
    box(t, -0.4, 0.4, 0.0, 0.8, 0.0, 0.025, col=BLACK_PAINT)
    for a, col in ((math.radians(40), GLOW["cyan"]), (math.radians(-40), GLOW["pink"])):
        R = Vector((math.cos(a), math.sin(a), 0))
        U = Vector((-math.sin(a), math.cos(a), 0))
        stroke(g, [((u * 1.6, v * 1.6), (u2 * 1.6, v2 * 1.6)) for (u, v), (u2, v2) in _SPANNER], Vector((0.0, 0.4, 0.03)), R, U, 0.024, col)


def _poster(k, w, h, lit=False):
    """A poster in its frame on the wall: one of the city's adverts, dealt
    by where it hangs; printed and lit by the room, or `lit`, a lightbox."""
    t, n = k("trim"), k("trim", 1)
    if lit:
        box(t, -w / 2 - 0.04, w / 2 + 0.04, -0.04, h + 0.04, 0.0, 0.1, col=GUN_DARK)
        quad(k("face"), (-w / 2, 0.0, 0.101), (w / 2, 0.0, 0.101), (w / 2, h, 0.101), (-w / 2, h, 0.101), col=(0.5, 0.5, 0.55, POSTER))
        cable(t, ((w / 2 + 0.02, -0.04, 0.05), (w / 2 + 0.05, -0.3, 0.03), (w / 2 + 0.08, -0.9, 0.02)), 0.004, col=CABLE)
        return
    box(t, -w / 2 - 0.02, w / 2 + 0.02, -0.02, h + 0.02, 0.0, 0.02, col=BLACK_PAINT)
    quad(k("print"), (-w / 2, 0.0, 0.021), (w / 2, 0.0, 0.021), (w / 2, h, 0.021), (-w / 2, h, 0.021), col=(0.3, 0.3, 0.3, BOARD))


@proto("garage_poster_tall", box=(0.32, 0.46, 0.02), reach=260, detail=True)
def _poster_tall(k):
    """A framed poster, 0.6 by 0.9 m (its foot at y 0, back on the wall)."""
    _poster(k, 0.6, 0.9)


@proto("garage_poster_wide", box=(0.62, 0.42, 0.02), reach=260, detail=True)
def _poster_wide(k):
    """A framed poster, 1.2 by 0.8 m (its foot at y 0, back on the wall)."""
    _poster(k, 1.2, 0.8)


@proto("garage_poster_lit", box=(0.5, 0.75, 0.05), reach=400)
def _poster_lit(k):
    """A lightbox advert, 0.9 by 1.4 m, its lead down the wall (its foot
    at y 0, back on the wall)."""
    _poster(k, 0.9, 1.4, lit=True)


# The monitor's screen, in its bezel's own frame: centre and size. The
# screen is a named quad of the layout's (`garage_screen`, which
# src/world/garage.js plays the intro's moon on), not a prototype's face.
MONITOR_SCREEN = ((0.0, 0.55, 0.062), 1.43, 0.8)


@proto("garage_monitor", box=(0.76, 0.48, 0.07), reach=600)
def _monitor(k):
    """A 65-inch monitor's bezel on its wall arm, its screen left for the
    layout's garage_screen (MONITOR_SCREEN); a cable down the wall."""
    t = k("trim")
    (cx, cy, cz), w, h = MONITOR_SCREEN
    box(t, -0.08, 0.08, cy - 0.12, cy + 0.12, 0.0, 0.01, col=GUN_DARK)
    box(t, -0.04, 0.04, cy - 0.04, cy + 0.04, 0.01, 0.03, col=GUN_DARK)
    box(t, -w / 2 - 0.02, w / 2 + 0.02, cy - h / 2 - 0.02, cy + h / 2 + 0.03, 0.03, cz - 0.001, col=BLACK_PAINT, bottom=True)
    box(k("glow", 1), w / 2 - 0.03, w / 2 - 0.02, cy - h / 2 - 0.012, cy - h / 2 - 0.006, cz - 0.0005, cz, col=(0.9, 0.3, 0.05, 1))
    cable(t, ((0.05, cy - 0.12, 0.012), (0.06, cy - 0.4, 0.012), (0.06, 0.0, 0.012)), 0.005, col=CABLE)
