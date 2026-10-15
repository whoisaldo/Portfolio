"""The city's edges: what stands where its ground ends.

A walker in the braindance's free roam (src/braindance/roam) goes wherever
pavements and built steps lead, and the map free roam makes of the city
(nav-build.js, `diagnose`) reports every run of ground he reaches that ends
at nothing: the kit's ground stops, the far city's begins out of reach, and
he would stand against air. Each run is closed here by what that district
would have at its back, so what stops him is a thing and not a rule:

  Japantown        its west edge strip (x -170, 750 m): a concrete plinth
                   under a steel mesh fence the far city shows through,
                   lengths of painted sheet let into it, a lamp on a post
                   now and then, and a shut gate under a red lamp at every
                   lane's end, north and south
  Corpo Row        its north (z -420) and east (x 470) and the plaza's
                   north quarter: a security line, glass between lit steel
                   posts on a dark plinth, a shut sliding gate now and then
  the south arm    the yard's own concrete wall carried up both flanks,
                   pipes along its top, a sodium lamp every fourth bay
  Santo Domingo    its south yard: the estate's palisade and yard lamps
  the megablock    the two ends of the strip behind it: a rib of the
                   block's concrete with its yellow edge, a warning triangle
  the canyon       a steel service gate in each slot between two backs
  E and H          the pavement at the head of each T is laid for half
                   its width only (streets.py), and a tower's bollards and
                   a board's legs stand over the gap: the other half, laid

Every piece is a prototype of its own (props.py), set down as instances,
so each has its box in collision.json and free roam's map takes it for the
wall it is. A district's pieces are named for it and placed nowhere else,
so they ride in that district's pack and the core carries none of them.

RUNS is data, read off the map's own report (stats.edges: `node
harness/play-nav.mjs` writes it): [district, style, axis, at, from, to,
side], the edge along z at x = `at` for axis "z" (along x at z = `at` for
"x"), with nothing on the `side` it names. When a district's ground moves,
the report says where the runs are now.

Nothing here stands in a page shot's frame: the hero looks up the avenue
from south of A, and the nearest of these is the south arm's flank wall,
behind its lens.
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P

G0 = B.G0
HALF_PI = math.pi / 2
STEEL = P.STEEL
RAIL = (0.085, 0.09, 0.1, 1)
GALV = (0.2, 0.21, 0.225, 1)
RUST = (0.2, 0.09, 0.05, 1)
BAR = (0.11, 0.115, 0.125, 1)
# A sheet's paint, by Japantown's own colours (japantown.py): dull red,
# teal, ochre, slate.
SHEETS = ((0.3, 0.07, 0.06, 1), (0.05, 0.19, 0.2, 1), (0.34, 0.24, 0.08, 1), (0.13, 0.15, 0.19, 1))


# ---------------------------------------------------------------------------
# Japantown: three metres of fence. A plinth, a post at its west end (the
# next length brings the next post), two rails, the mesh.
# ---------------------------------------------------------------------------
def _jt_frame(k, top=3.2):
    box(k("concrete"), -1.5, 1.5, 0.0, 0.9, -0.14, 0.14, scale=1.5)
    box(k("trim"), -1.5, 1.5, 0.9, 0.95, -0.17, 0.17, scale=1.0, col=RAIL)
    box(k("trim"), -1.56, -1.44, 0.95, top + 0.12, -0.06, 0.06, scale=1.0, col=STEEL)
    box(k("trim"), -1.59, -1.41, top + 0.12, top + 0.16, -0.09, 0.09, scale=1.0, col=RAIL)
    for y in (1.02, top - 0.04):
        box(k("trim"), -1.44, 1.5, y, y + 0.05, -0.025, 0.025, scale=1.0, col=GALV)


@P.proto("ed_jt_mesh", box=(1.5, 1.66, 0.17), reach=520)
def _ed_jt_mesh(k):
    """Three metres of Japantown's boundary: mesh on a plinth."""
    _jt_frame(k)
    P.face(k, P.MESH, 0.03, 2.11, 0.0, 2.94, 2.14, 0.0, mat="print")


@P.proto("ed_jt_sheet", box=(1.5, 1.66, 0.17), reach=520)
def _ed_jt_sheet(k):
    """The same with sheet in it: corrugated, painted once, a band of bare
    metal where a strip was replaced. (The site deals its colour: its other
    shapes below.)"""
    _jt_sheet(k, SHEETS[0])


def _jt_sheet(k, col):
    _jt_frame(k)
    box(k("corrugated"), -1.44, 1.5, 1.07, 3.12, -0.03, 0.03, scale=1.0, col=col)
    box(k("corrugated"), -1.44, 1.5, 2.3, 2.62, -0.04, 0.04, scale=1.0, col=GALV)


for _n, _col in enumerate(SHEETS[1:], 1):
    P.proto(f"ed_jt_sheet{P.SHAPE}{_n}", box=(1.5, 1.66, 0.17), reach=520)(lambda k, _c=_col: _jt_sheet(k, _c))


@P.proto("ed_jt_lamp", box=(1.5, 2.3, 0.17), reach=640)
def _ed_jt_lamp(k):
    """A length with a lamp on its post: an arm in over the strip, a hooded
    sodium tube under it."""
    _jt_frame(k)
    P.face(k, P.MESH, 0.03, 2.11, 0.0, 2.94, 2.14, 0.0, mat="print")
    box(k("trim"), -1.55, -1.45, 3.3, 4.5, -0.05, 0.05, scale=1.0, col=STEEL)
    box(k("trim"), -1.54, -1.46, 4.4, 4.48, 0.0, 1.3, scale=1.0, col=STEEL)
    box(k("trim"), -1.64, -1.36, 4.28, 4.4, 0.45, 1.35, scale=1.0, col=RAIL)
    box(k("neon_amber"), -1.6, -1.4, 4.24, 4.28, 0.5, 1.3, scale=1.0, bottom=True)


@P.proto("ed_jt_gate", box=(1.8, 1.8, 0.2), reach=640)
def _ed_jt_gate(k):
    """A lane's end: two posts with a red lamp on each, a beam, two leaves
    of mesh shut and chained, a striped bar across them."""
    for x in (-1.72, 1.72):
        box(k("trim"), x - 0.09, x + 0.09, 0.0, 3.5, -0.09, 0.09, scale=1.0, col=STEEL)
        box(k("trim"), x - 0.13, x + 0.13, 3.5, 3.56, -0.13, 0.13, scale=1.0, col=RAIL)
        box(k("glow"), x - 0.07, x + 0.07, 3.56, 3.74, -0.07, 0.07, scale=1.0, col=GLOW["red"])
    box(k("trim"), -1.72, 1.72, 3.2, 3.32, -0.05, 0.05, scale=1.0, col=STEEL)
    for x0, x1 in ((-1.62, -0.02), (0.02, 1.62)):
        for y in (0.12, 3.05):
            box(k("trim"), x0, x1, y, y + 0.06, -0.03, 0.03, scale=1.0, col=GALV)
        for x in (x0, x1 - 0.06):
            box(k("trim"), x, x + 0.06, 0.12, 3.11, -0.03, 0.03, scale=1.0, col=GALV)
        P.face(k, P.MESH, (x0 + x1) / 2, 1.6, 0.0, x1 - x0 - 0.1, 2.9, 0.0, mat="print")
        pipe(k("trim"), (x0 + 0.05, 0.2, 0.0), (x1 - 0.05, 3.0, 0.0), 0.02, segs=4, col=GALV)
    # The bar: black, with yellow leaning across it, both sides.
    box(k("dark"), -1.6, 1.6, 1.0, 1.22, -0.045, 0.045, scale=1.0)
    x = -1.5
    while x < 1.4:
        for dz in (0.05, -0.05):
            pts = [(x, 1.0, dz), (x + 0.2, 1.0, dz), (x + 0.4, 1.22, dz), (x + 0.2, 1.22, dz)]
            poly(k("hazard"), pts if dz > 0 else pts[::-1], [(0, 0), (1, 0), (1, 1), (0, 1)])
        x += 0.4


# ---------------------------------------------------------------------------
# Corpo Row: four metres of security line. Glass to over head height
# between steel posts with a line of light up each, on a dark plinth.
# ---------------------------------------------------------------------------
def _co_frame(k):
    box(k("dark"), -2.0, 2.0, 0.0, 0.5, -0.15, 0.15, scale=1.0)
    box(k("steel"), -2.0, 2.0, 0.5, 0.56, -0.18, 0.18, col=BAR)
    box(k("steel"), -2.07, -1.93, 0.56, 3.5, -0.07, 0.07, col=BAR)
    box(k("steel"), -1.93, 2.0, 3.24, 3.3, -0.04, 0.04, col=BAR)


def _ed_co_glass(k):
    _co_frame(k)
    for dz, wind in ((0.012, 1), (-0.012, -1)):
        pts = [(-1.93, 0.56, dz), (2.0, 0.56, dz), (2.0, 3.24, dz), (-1.93, 3.24, dz)]
        poly(k("clearglass"), pts if wind > 0 else pts[::-1], [(0, 0), (1, 0), (1, 1), (0, 1)], (0.55, 0.75, 0.85, 1))
    # The post's line of light, toward the city, and the lit edge on the glass.
    box(k("neon_cyan"), -2.03, -1.97, 1.3, 3.2, 0.07, 0.085, scale=1.0)
    box(k("glow"), -1.93, 2.0, 3.3, 3.325, -0.012, 0.012, scale=1.0, col=(0.5, 0.62, 0.7, 1))


def _ed_co_gate(k):
    """A shut gate in the line: a dark leaf on a track, ribbed, a striped
    band at bumper height, a white strip over it, a red lamp on its post."""
    _co_frame(k)
    box(k("steel"), -1.93, 2.0, 0.6, 3.2, -0.05, 0.05, col=(0.05, 0.055, 0.065, 1))
    for y in (1.5, 1.9, 2.3, 2.7):
        box(k("steel"), -1.9, 1.97, y, y + 0.05, -0.065, 0.065, col=BAR)
    box(k("dark"), -1.9, 1.97, 0.75, 1.05, -0.062, 0.062, scale=1.0)
    x = -1.8
    while x < 1.7:
        for dz in (0.068, -0.068):
            pts = [(x, 0.75, dz), (x + 0.22, 0.75, dz), (x + 0.52, 1.05, dz), (x + 0.3, 1.05, dz)]
            poly(k("hazard"), pts if dz > 0 else pts[::-1], [(0, 0), (1, 0), (1, 1), (0, 1)])
        x += 0.44
    box(k("glow"), -1.7, 1.8, 3.02, 3.07, 0.05, 0.07, scale=1.0, col=GLOW["white"])
    box(k("glow"), -2.05, -1.95, 3.5, 3.66, -0.05, 0.05, scale=1.0, col=GLOW["red"])


# Corpo Row's and the plaza's under their own names, so each district's
# pack carries its own and the core neither.
for _d in ("co", "pl"):
    P.proto(f"ed_{_d}_glass", box=(2.0, 1.75, 0.18), reach=620)(_ed_co_glass)
    P.proto(f"ed_{_d}_gate", box=(2.0, 1.75, 0.18), reach=620)(_ed_co_gate)


# ---------------------------------------------------------------------------
# The south arm's flanks: three metres of the yard's wall. Poured concrete
# with a pier at its end, a coping, two pipes on brackets along its top.
# ---------------------------------------------------------------------------
def _wall_s(k, lamp=False):
    box(k("concrete"), -1.5, 1.5, 0.0, 3.2, -0.15, 0.15, scale=2.0)
    box(k("concrete"), -1.72, -1.28, 0.0, 3.3, -0.24, 0.24, scale=2.0)
    box(k("castconcrete"), -1.5, 1.5, 3.2, 3.32, -0.21, 0.21, col=(0.3, 0.3, 0.31, 1))
    for y, r, col in ((3.62, 0.09, RUST), (3.86, 0.06, GALV)):
        pipe(k("trim"), (-1.5, y, 0.0), (1.5, y, 0.0), r, segs=5, col=col)
    box(k("trim"), -1.54, -1.46, 3.32, 3.98, -0.03, 0.03, scale=1.0, col=STEEL)
    # Yellow at the pier's foot, worn.
    box(k("hazard"), -1.725, -1.275, 0.1, 0.42, 0.24, 0.246, scale=1.0)
    if lamp:
        box(k("trim"), -0.2, 0.2, 2.72, 2.8, 0.15, 0.42, scale=1.0, col=STEEL)
        box(k("neon_amber"), -0.17, 0.17, 2.62, 2.72, 0.2, 0.4, scale=1.0, bottom=True)


@P.proto("ed_arm_wall", box=(1.5, 2.0, 0.24), reach=560)
def _ed_arm_wall(k):
    _wall_s(k)


@P.proto("ed_arm_lamp", box=(1.5, 2.0, 0.24), reach=640)
def _ed_arm_lamp(k):
    _wall_s(k, lamp=True)


# ---------------------------------------------------------------------------
# The megablock: 3.2 m of its concrete, ribbed, yellow along its head.
# ---------------------------------------------------------------------------
@P.proto("ed_mega_rib", box=(1.6, 1.9, 0.3), reach=560)
def _ed_mega_rib(k):
    col = (0.2, 0.2, 0.21, 1)
    box(k("castconcrete"), -1.6, 1.6, 0.0, 3.6, -0.2, 0.2, col=col)
    for x in (-1.6, -0.53, 0.53):
        box(k("castconcrete"), x, x + 0.26, 0.0, 3.6, 0.2, 0.3, col=(0.16, 0.16, 0.17, 1))
    box(k("hazard"), -1.6, 1.6, 3.6, 3.8, -0.22, 0.32, scale=1.0)
    box(k("dark"), -1.6, 1.6, 3.52, 3.6, -0.21, 0.31, scale=1.0)


# ---------------------------------------------------------------------------
# The canyon: a service gate 1.3 m wide for a slot between two backs.
# ---------------------------------------------------------------------------
@P.proto("ed_cy_gate", box=(0.65, 1.3, 0.08), reach=300)
def _ed_cy_gate(k):
    for x in (-0.65, 0.59):
        box(k("trim"), x, x + 0.06, 0.0, 2.6, -0.04, 0.04, scale=1.0, col=STEEL)
    for y in (0.08, 2.5):
        box(k("trim"), -0.59, 0.59, y, y + 0.06, -0.03, 0.03, scale=1.0, col=STEEL)
    P.face(k, P.MESH, 0.0, 1.3, 0.0, 1.18, 2.36, 0.0, mat="print")
    box(k("hazard"), -0.59, 0.59, 1.1, 1.24, -0.035, 0.035, scale=1.0)
    box(k("glow"), -0.05, 0.05, 2.56, 2.68, -0.04, 0.04, scale=1.0, col=GLOW["red"])


# ---------------------------------------------------------------------------
# The runs, off the map's report.
# ---------------------------------------------------------------------------
RUNS = [
    # Japantown's west edge strip, and its lanes' ends north and south.
    ("japantown", "jt", "z", -170.0, -740.0, 12.25, -1),
    ("japantown", "jt_gate", "x", -740.0, -169.9, -166.4, -1),
    ("japantown", "jt_gate", "x", -740.0, -141.8, -138.2, -1),
    ("japantown", "jt_gate", "x", -740.0, -115.5, -111.2, -1),
    ("japantown", "jt_gate", "x", 12.25, -169.8, -166.2, 1),
    ("japantown", "jt_gate", "x", 12.25, -142.0, -138.2, 1),
    ("japantown", "jt_gate", "x", 12.25, -115.8, -110.2, 1),
    # Corpo Row's north and east; the plaza's north quarter.
    ("corpo", "co", "x", -420.25, 170.0, 470.25, -1),
    ("corpo", "co", "z", 470.25, -420.25, -344.25, 1),
    ("plaza", "pl", "z", 170.0, -456.0, -420.25, 1),
    ("plaza", "pl", "x", -456.0, 132.25, 170.0, -1),
    # The south arm's flanks.
    ("avenue_s", "arm", "z", -66.25, 43.25, 92.0, -1),
    ("avenue_s", "arm", "z", 108.25, 45.25, 92.0, 1),
    # Santo Domingo's south yard.
    ("santo", "pal", "x", 45.25, 388.5, 423.75, 1),
    # The megablock's back strip, both ends.
    ("mega", "mega", "z", -94.25, -799.5, -790.0, -1),
    ("mega", "mega", "z", 132.25, -799.5, -790.0, 1),
    # The canyon's slots.
    ("canyon_b", "cy", "x", -559.75, 44.25, 45.5, 1),
    ("canyon_b", "cy", "x", -530.25, 44.25, 45.5, -1),
    ("canyon_b", "cy", "x", -262.0, 47.6, 48.9, -1),
    ("canyon_b", "cy", "z", 48.0, -263.5, -262.0, 1),
]

# How long one piece of a style is, and how far inside the ground's edge
# its middle stands (so its outer face is on the edge).
UNIT = {"jt": 3.0, "jt_gate": 3.6, "co": 4.0, "pl": 4.0, "arm": 3.0, "pal": 3.0, "mega": 3.2, "cy": 1.3}
INSET = {"jt": 0.16, "jt_gate": 0.2, "co": 0.17, "pl": 0.17, "arm": 0.22, "pal": 0.1, "mega": 0.22, "cy": 0.1}


def _piece(style, n, count, rng):
    """Which prototype stands nth in a run of `count`."""
    if style == "jt":
        # A lamp every seventh length; sheet in ones and twos between
        # stretches of mesh.
        if n % 7 == 3:
            return "ed_jt_lamp"
        return "ed_jt_sheet" if rng.random() < 0.24 else "ed_jt_mesh"
    if style == "jt_gate":
        return "ed_jt_gate"
    if style in ("co", "pl"):
        return f"ed_{style}_gate" if n % 11 == 5 else f"ed_{style}_glass"
    if style == "arm":
        return "ed_arm_lamp" if n % 4 == 1 else "ed_arm_wall"
    if style == "pal":
        return "fence_pal"
    if style == "mega":
        return "ed_mega_rib"
    return "ed_cy_gate"


def _close(district, style, axis, at, a, b, side, rng):
    """One run: pieces end to end from a to b along `axis`, scaled across
    by the little it takes to fill the run exactly, fronts to the city."""
    unit = UNIT[style]
    count = max(1, int(round((b - a) / unit)))
    scale = (b - a) / (count * unit)
    line = at - side * INSET[style]
    # A piece's front is +z; turned to face away from the side with nothing.
    yaw = (-side * HALF_PI) if axis == "z" else (0.0 if side < 0 else math.pi)
    for n in range(count):
        along = a + (n + 0.5) * (b - a) / count
        x, z = (line, along) if axis == "z" else (along, line)
        name = _piece(style, n, count, rng)
        P.place(name, x, G0, z, yaw, 1.0, scale, district)
        # Light where there is a lamp: a pool on the ground before it.
        fx, fz = math.sin(yaw), math.cos(yaw)
        if name in ("ed_jt_lamp", "ed_arm_lamp"):
            light(district, x + fx * 1.2, 2.2, z + fz * 1.2, "amber", 3.0 if name == "ed_arm_lamp" else 2.4)
        elif name == "ed_jt_gate":
            light(district, x + fx * 0.8, 1.6, z + fz * 0.8, "red", 1.6)
        elif name.endswith("_glass") and n % 4 == 0:
            light(district, x + fx * 0.9, 1.2, z + fz * 0.9, "cyan", 1.4)
        elif name.endswith("o_gate") or name.endswith("l_gate"):
            light(district, x + fx * 1.0, 1.8, z + fz * 1.0, "white", 2.0)
        elif name == "ed_mega_rib" and n == count // 2:
            P.place("warning_tri", x + fx * 0.31, G0 + 1.9, z + fz * 0.31, yaw, district=district)
            light(district, x + fx * 1.2, 2.0, z + fz * 1.2, "amber", 1.8)
        elif name == "ed_cy_gate":
            light(district, x + fx * 0.6, 1.8, z + fz * 0.6, "red", 1.0)
    return count


_rng = random.Random(9100)
PLACED = {}
for _district, _style, _axis, _at, _a, _b, _side in RUNS:
    PLACED[_style] = PLACED.get(_style, 0) + _close(_district, _style, _axis, _at, _a, _b, _side, _rng)

# Santo's yard lamps over its palisade.
for _x in (396.0, 416.0):
    P.place("lamp_strip", _x, G0, 44.4, math.pi, district="santo")
    light("santo", _x, 3.0, 42.6, "amber", 3.0)


# ---------------------------------------------------------------------------
# Two holes in the ground, laid. At the head of a T the pavement across the
# ending street's line is laid for half its width only (streets.py): at E
# the boulevard's north pavement under a tower's canopy, with that tower's
# own bollards standing over nothing, and at H the south street's south
# pavement under a board's legs. A slab at the pavement's level with its
# kerb on the street's side closes each. (When streets.py lays them, these
# two go.)
# ---------------------------------------------------------------------------
def pave(district, x0, x1, z0, z1, kerb):
    """A slab x0..x1, z0..z1 at the pavement's level; `kerb` is the side the
    carriageway is on ("+z" or "-z")."""
    box((district, "sidewalk", 0), x0, x1, 0.0, G0, z0, z1, scale=2.0)
    za, zb = (z1 - 0.02, z1 + 0.16) if kerb == "+z" else (z0 - 0.16, z0 + 0.02)
    box((district, "kerb", 0), x0, x1, 0.0, G0, za, zb, scale=1.0)


pave("corpo", 110.0, 120.0, -344.0, -339.16, "+z")
pave("santo", 440.0, 452.0, 8.16, 12.0, "-z")

print({"edges": PLACED})
