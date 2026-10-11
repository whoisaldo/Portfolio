"""What the megabuilding's modules share: its paint, its heavy decks, its
parapets and rails, lamps, cables, pipes, stairs, a lattice pylon, and block
letters drawn as strokes (the block's number, the station's name).

Everything here is keyed "mega" unless a key is passed in. Nothing here
builds anything on import.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P  # noqa: F401

D = "mega"
FA = "far"
G0 = B.G0                                   # the pavement's level

# The set piece's own numbers (mega.py builds it; BIBLE.md, "What does not move").
RAIL_Z, RAIL_Y = -610.0, 13.0
RAIL_UNDER, RAIL_TOP = RAIL_Y - 1.2, RAIL_Y + 2.2
PIER_HEAD = 3.3                             # the avenue piers are portals up to here
MB_X0, MB_X1, MB_ZB, MB_ZF = -48.0, 48.0, -790.0, -745.0
MB_REC = 4.0                                # the middle section's face stands this far back
MB_SECTIONS = ((-48.0, -18.0, 95.0, 0.0), (-18.0, 18.0, 89.0, MB_REC), (18.0, 48.0, 83.0, 0.0))
MB_SIGNS = ((-30.0, "magenta"), (-9.0, "cyan"), (14.0, "pink"), (33.0, "amber"))
WELL = (-9.0, 9.0, -783.0, -763.0)          # the light well: x0, x1, z0, z1
PASSAGE = (-5.0, 5.0)                       # the passage from the face to the well: x0, x1
# The megabuilding street (plan.py): its lot lines and its pavement's end.
ST_N, ST_S, ST_END = -732.0, -708.0, 64.0

# Paint on the trim material (lit by the street, never glowing).
YEL = (0.66, 0.47, 0.05, 1.0)               # the megabuilding's yellow edges
YEL_OLD = (0.42, 0.31, 0.06, 1.0)
ORANGE = (0.72, 0.26, 0.05, 1.0)            # the station's wall
ORANGE_DARK = (0.4, 0.15, 0.04, 1.0)
RUST = (0.4, 0.16, 0.07, 1.0)
CONC = B.TRIM[5]
PALE = B.TRIM[7]
CREAM = (0.42, 0.38, 0.28, 1.0)
BLUEGREY = (0.14, 0.18, 0.24, 1.0)
BLACK = B.DARK_TRIM
STEEL = (0.1, 0.11, 0.13, 1.0)
RED_PAINT = (0.5, 0.07, 0.05, 1.0)
TEAL_PAINT = (0.06, 0.26, 0.26, 1.0)

FLOOR0 = SHOP_H                             # the first floor line; then every CELL_H


def floor_y(k):
    """The floor line of storey k (1 is the first over the shops)."""
    return FLOOR0 + (k - 1) * CELL_H


def dim(col, k):
    return (col[0] * k, col[1] * k, col[2] * k, 1.0)


def tbox(x0, x1, y0, y1, z0, z1, col, detail=0, bottom=False, scale=1.0, key=None):
    box(key or (D, "trim", detail), min(x0, x1), max(x0, x1), y0, y1, min(z0, z1), max(z0, z1), scale=scale, col=col, bottom=bottom)


def cbox(x0, x1, y0, y1, z0, z1, detail=0, bottom=False, scale=2.0, mat="concrete"):
    box((D, mat, detail), min(x0, x1), max(x0, x1), y0, y1, min(z0, z1), max(z0, z1), scale=scale, bottom=bottom)


def hquad(key, x0, x1, z0, z1, y, up=True, col=(1, 1, 1, 1), scale=2.0):
    """A horizontal rectangle, facing up or down."""
    s = 1.0 / scale
    pts = ((x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0))
    if not up:
        pts = (pts[0], pts[3], pts[2], pts[1])
    quad(key, *pts, uvs=tuple((p[0] * s, -p[2] * s) for p in pts), col=col)


def vquad(key, a, b, y0, y1, col=(1, 1, 1, 1), both=False, uvs=None):
    """A vertical quad from (x, z) a to b, its front on the right of a->b
    seen from above (so a wall walked with the outside on the left faces
    out), y0..y1."""
    length = math.hypot(b[0] - a[0], b[1] - a[1])
    uvs = uvs or ((0, 0), (length, 0), (length, y1 - y0), (0, y1 - y0))
    quad(key, (a[0], y0, a[1]), (b[0], y0, b[1]), (b[0], y1, b[1]), (a[0], y1, a[1]), uvs, col)
    if both:
        quad(key, (b[0], y0, b[1]), (a[0], y0, a[1]), (a[0], y1, a[1]), (b[0], y1, b[1]), uvs, col)


def fbox(f, key, s0, s1, y0, y1, w0, w1, col=(1, 1, 1, 1), scale=1.0, bottom=False):
    """A box standing out from a face (buildings.Face), with its underside
    when asked: seen from below, a deck must have one."""
    a, b = f.at(s0), f.at(s1)
    pa, pb = f.p(a, y0, w0), f.p(b, y1, w1)
    box(key, min(pa[0], pb[0]), max(pa[0], pb[0]), y0, y1, min(pa[2], pb[2]), max(pa[2], pb[2]), scale=scale, col=col, bottom=bottom)


def face(name, plane, a0, a1):
    return B.Face(name, plane, a0, a1)


# ---------------------------------------------------------------------------
# Decks: the megabuilding's heavy concrete slabs, yellow along their edges,
# ribbed underneath, a parapet on top with marker lights.
# ---------------------------------------------------------------------------
AMBER_DOT = dim(GLOW["amber"], 0.75)


def deck(x0, x1, z0, z1, top, thick=0.7, ribs="x", rib_step=3.0, rib_h=0.45, yellow=("+z",), parapet=(), dots=(),
         dot_step=2.4, dot_col=AMBER_DOT, detail=0):
    """A slab with its top at `top`. `ribs`: "x" for downstand beams spaced
    along x (running across z), "z" the other way. `yellow`, `parapet`,
    `dots`: on which edges ("+z" is the edge toward +z)."""
    cbox(x0, x1, top - thick, top, z0, z1, bottom=True, detail=detail)
    under = top - thick
    if ribs == "x":
        n = max(1, int((x1 - x0) // rib_step))
        for i in range(n + 1):
            x = x0 + 0.35 + (x1 - x0 - 0.7) * i / n
            cbox(x - 0.22, x + 0.22, under - rib_h, under, z0 + 0.15, z1 - 0.15, bottom=True, detail=1)
    elif ribs == "z":
        n = max(1, int((z1 - z0) // rib_step))
        for i in range(n + 1):
            z = z0 + 0.35 + (z1 - z0 - 0.7) * i / n
            cbox(x0 + 0.15, x1 - 0.15, under - rib_h, under, z - 0.22, z + 0.22, bottom=True, detail=1)
    edges = {"+z": ("z", z1, 1), "-z": ("z", z0, -1), "+x": ("x", x1, 1), "-x": ("x", x0, -1)}
    for name in yellow:
        ax, v, s = edges[name]
        if ax == "z":
            tbox(x0, x1, top - 0.42, top, v, v + s * 0.05, YEL, bottom=True)
        else:
            tbox(v, v + s * 0.05, top - 0.42, top, z0, z1, YEL, bottom=True)
    for name in parapet:
        ax, v, s = edges[name]
        if ax == "z":
            cbox(x0, x1, top, top + 1.05, v - s * 0.22, v)
        else:
            cbox(v - s * 0.22, v, top, top + 1.05, z0, z1)
    for name in dots:
        ax, v, s = edges[name]
        a0, a1 = (x0, x1) if ax == "z" else (z0, z1)
        n = max(1, int((a1 - a0) // dot_step))
        for i in range(n):
            a = a0 + (a1 - a0) * (i + 0.5) / n
            yaw = {("z", 1): 0.0, ("z", -1): math.pi, ("x", 1): math.pi / 2, ("x", -1): -math.pi / 2}[(ax, s)]
            if ax == "z":
                rotated_quad((D, "glow", 1), a, top + 0.6, v + s * 0.012, 0.34, 0.1, yaw, col=dot_col)
            else:
                rotated_quad((D, "glow", 1), v + s * 0.012, top + 0.6, a, 0.34, 0.1, yaw, col=dot_col)


def column(x, z, w, y0, y1, d=None, band=True, col=None):
    """A concrete column, a black and yellow band round its foot where a
    car could find it."""
    d = w if d is None else d
    if col is None:
        cbox(x - w / 2, x + w / 2, y0, y1, z - d / 2, z + d / 2, scale=1.5)
    else:
        tbox(x - w / 2, x + w / 2, y0, y1, z - d / 2, z + d / 2, col)
    if band:
        tbox(x - w / 2 - 0.02, x + w / 2 + 0.02, y0 + 0.5, y0 + 0.95, z - d / 2 - 0.02, z + d / 2 + 0.02, YEL_OLD, detail=1)
        tbox(x - w / 2 - 0.02, x + w / 2 + 0.02, y0, y0 + 0.5, z - d / 2 - 0.02, z + d / 2 + 0.02, BLACK, detail=1)


def glass_rail(a, b, y, h=1.05):
    """A glass rail from (x, z) a to b on a floor at y: the pane, seen from
    both sides, a steel rail on top."""
    vquad((D, "glass_dark", 1), a, b, y, y + h, both=True)
    pipe((D, "metal", 1), (a[0], y + h, a[1]), (b[0], y + h, b[1]), 0.035, segs=4)


def steel_rail(a, b, y, h=1.05, posts=2.4):
    """A steel rail: top and middle bar, posts."""
    for yy in (y + h, y + h * 0.5):
        pipe((D, "metal", 1), (a[0], yy, a[1]), (b[0], yy, b[1]), 0.03, segs=4)
    length = math.hypot(b[0] - a[0], b[1] - a[1])
    n = max(1, int(length // posts))
    for i in range(n + 1):
        t = i / n
        px, pz = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        box((D, "metal", 1), px - 0.03, px + 0.03, y, y + h, pz - 0.03, pz + 0.03, scale=0.5)


# ---------------------------------------------------------------------------
# Light: caged lamps on walls, tubes on ceilings. Each is drawn as glow (so
# the bake does not count its little area) and lights its place as a lamp
# (kit.light), which is what a small fitting does.
# ---------------------------------------------------------------------------
def wall_lamp(x, y, z, nx, nz, hue="amber", power=2.6, key=None):
    """A caged lamp on a wall at (x, y, z), the wall's outward normal (nx, nz)."""
    w = 0.2
    cx, cz = x + nx * 0.1, z + nz * 0.1
    hx, hz = (w if nz else 0.1), (w if nx else 0.1)
    box(key or (D, "glow", 0), cx - hx, cx + hx, y - 0.12, y + 0.12, cz - hz, cz + hz, scale=0.5, col=GLOW[hue], bottom=True)
    box((D, "metal", 1), cx - hx - 0.04, cx + hx + 0.04, y + 0.12, y + 0.18, cz - hz - 0.04, cz + hz + 0.04, scale=0.5)
    light(D, x + nx * 0.9, y, z + nz * 0.9, hue, power)


def tube_x(x0, x1, y, z, hue="green", power=3.0, neon=False, pools=True):
    """A fluorescent tube along x on a ceiling."""
    key = (D, "neon_" + hue, 0) if neon else (D, "glow", 0)
    box(key, x0, x1, y - 0.05, y, z - 0.06, z + 0.06, scale=0.5, col=GLOW[hue], bottom=True)
    if pools:
        light(D, (x0 + x1) / 2, y, z, hue, power)


def tube_z(x, y, z0, z1, hue="green", power=3.0, neon=False, pools=True):
    key = (D, "neon_" + hue, 0) if neon else (D, "glow", 0)
    box(key, x - 0.06, x + 0.06, y - 0.05, y, z0, z1, scale=0.5, col=GLOW[hue], bottom=True)
    if pools:
        light(D, x, y, (z0 + z1) / 2, hue, power)


# ---------------------------------------------------------------------------
# Cables and pipes.
# ---------------------------------------------------------------------------
def cable(a, b, sag=1.0, steps=8, r=0.035, key=None):
    """A cable from a to b (x, y, z), sagging: a ribbon seen from both sides."""
    key = key or (D, "dark", 1)
    pts = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * math.sin(math.pi * t), a[2] + (b[2] - a[2]) * t)
           for t in (i / steps for i in range(steps + 1))]
    for p, q in zip(pts, pts[1:]):
        quad(key, (p[0], p[1] - r, p[2]), (q[0], q[1] - r, q[2]), (q[0], q[1] + r, q[2]), (p[0], p[1] + r, p[2]))
        quad(key, (q[0], q[1] - r, q[2]), (p[0], p[1] - r, p[2]), (p[0], p[1] + r, p[2]), (q[0], q[1] + r, q[2]))


def bundle(a, b, sag=1.2, n=3, rng=None, spread=0.25, r=0.04):
    """A bundle of cables between two points, each with its own sag."""
    rng = rng or random.Random(int(a[0] * 31 + a[2] * 17 + b[0] * 7))
    for i in range(n):
        da = (rng.uniform(-spread, spread), rng.uniform(-spread, spread) * 0.6, rng.uniform(-spread, spread))
        cable((a[0] + da[0], a[1] + da[1], a[2] + da[2]), (b[0] + da[0], b[1] + da[1] * 0.5, b[2] + da[2]),
              sag * rng.uniform(0.7, 1.35), r=r * rng.uniform(0.7, 1.3))


def rpipe(a, b, r=0.11, col=RUST, segs=6, detail=1):
    """A painted pipe from a to b."""
    pipe((D, "trim", detail), a, b, r, segs=segs, col=col)


def duct(x0, x1, y0, y1, z0, z1, detail=0):
    """Sheet-metal ducting (the metal material draws its own panel seams)."""
    box((D, "metal", detail), min(x0, x1), max(x0, x1), y0, y1, min(z0, z1), max(z0, z1), scale=1.0, bottom=True)


# ---------------------------------------------------------------------------
# Stairs.
# ---------------------------------------------------------------------------
def stairs(axis, a0, a1, foot, head, y0, y1, steps=None, key=None):
    """Steps across a0..a1 rising from `foot` (at y0) to `head` (at y1)
    along the other axis ("z": the flight runs along z, a is x)."""
    key = key or (D, "concrete", 0)
    steps = steps or max(2, round((y1 - y0) / 0.18))
    for i in range(steps):
        ya = y0 + (y1 - y0) * (i + 1) / steps
        u0 = foot + (head - foot) * i / steps
        u1 = foot + (head - foot) * (i + 1) / steps
        lo, hi = sorted((u0, u1))
        if axis == "z":
            box(key, a0, a1, y0, ya, lo, hi, scale=1.0)
        else:
            box(key, lo, hi, y0, ya, a0, a1, scale=1.0)


# ---------------------------------------------------------------------------
# A steel lattice pylon.
# ---------------------------------------------------------------------------
def pylon(x, z, h=24.0, w0=1.5, w1=0.5, arms=(0.78, 0.92), yaw_arms="x"):
    k = (D, "metal", 1)
    hw = lambda y: (w0 + (w1 - w0) * y / h) / 2  # noqa: E731
    bays = max(4, int(h // 2.6))
    for sx, sz in ((-1, -1), (-1, 1), (1, 1), (1, -1)):
        pipe(k, (x + sx * hw(0), G0, z + sz * hw(0)), (x + sx * hw(h), G0 + h, z + sz * hw(h)), 0.06, segs=4)
    corners = ((-1, -1), (1, -1), (1, 1), (-1, 1))
    for i in range(bays):
        ya, yb = h * i / bays, h * (i + 1) / bays
        ha, hb = hw(ya), hw(yb)
        for (c0, c1) in zip(corners, corners[1:] + corners[:1]):
            a = (x + c0[0] * ha, G0 + ya, z + c0[1] * ha)
            b = (x + c1[0] * hb, G0 + yb, z + c1[1] * hb)
            c = (x + c1[0] * ha, G0 + ya, z + c1[1] * ha)
            d_ = (x + c0[0] * hb, G0 + yb, z + c0[1] * hb)
            for p, q in ((a, b), (c, d_)):
                quad(k, (p[0], p[1] - 0.04, p[2]), (q[0], q[1] - 0.04, q[2]), (q[0], q[1] + 0.04, q[2]), (p[0], p[1] + 0.04, p[2]))
                quad(k, (q[0], q[1] - 0.04, q[2]), (p[0], p[1] - 0.04, p[2]), (p[0], p[1] + 0.04, p[2]), (q[0], q[1] + 0.04, q[2]))
            pipe(k, d_, b, 0.035, segs=3)
    tips = []
    for t in arms:
        y = G0 + h * t
        reach = 2.6
        if yaw_arms == "x":
            box(k, x - reach, x + reach, y - 0.06, y + 0.06, z - 0.06, z + 0.06, scale=0.5)
            tips += [(x - reach, y - 0.35, z), (x + reach, y - 0.35, z)]
            for sx in (-1, 1):
                box((D, "glass_dark", 1), x + sx * reach - 0.07, x + sx * reach + 0.07, y - 0.4, y - 0.06, z - 0.07, z + 0.07, scale=0.5)
        else:
            box(k, x - 0.06, x + 0.06, y - 0.06, y + 0.06, z - reach, z + reach, scale=0.5)
            tips += [(x, y - 0.35, z - reach), (x, y - 0.35, z + reach)]
            for sz in (-1, 1):
                box((D, "glass_dark", 1), x - 0.07, x + 0.07, y - 0.4, y - 0.06, z + sz * reach - 0.07, z + sz * reach + 0.07, scale=0.5)
    box((D, "glow", 0), x - 0.1, x + 0.1, G0 + h, G0 + h + 0.22, z - 0.1, z + 0.1, scale=0.5, col=GLOW["red"])
    return tips


# ---------------------------------------------------------------------------
# Block letters, as strokes: each glyph a few straight strokes on a 4 x 6
# grid, each stroke a quad. Painted (trim) or lit (glow), on any vertical
# plane.
# ---------------------------------------------------------------------------
GLYPHS = {
    "H": (((0, 0), (0, 6)), ((4, 0), (4, 6)), ((0, 3), (4, 3))),
    "N": (((0, 0), (0, 6)), ((0, 6), (4, 0)), ((4, 0), (4, 6))),
    "C": (((4, 6), (0, 6)), ((0, 6), (0, 0)), ((0, 0), (4, 0))),
    "A": (((0, 0), (2, 6)), ((2, 6), (4, 0)), ((1, 2.2), (3, 2.2))),
    "R": (((0, 0), (0, 6)), ((0, 6), (4, 6)), ((4, 6), (4, 3)), ((4, 3), (0, 3)), ((1.6, 3), (4, 0))),
    "T": (((0, 6), (4, 6)), ((2, 6), (2, 0))),
    "0": (((0, 0), (0, 6)), ((0, 6), (4, 6)), ((4, 6), (4, 0)), ((4, 0), (0, 0))),
    "1": (((2.4, 0), (2.4, 6)), ((2.4, 6), (1, 4.8))),
    "2": (((0, 6), (4, 6)), ((4, 6), (4, 3)), ((4, 3), (0, 3)), ((0, 3), (0, 0)), ((0, 0), (4, 0))),
    "3": (((0, 6), (4, 6)), ((4, 6), (4, 0)), ((4, 0), (0, 0)), ((1, 3), (4, 3))),
    "4": (((3, 0), (3, 6)), ((3, 6), (0, 2)), ((0, 2), (4, 2))),
    "5": (((4, 6), (0, 6)), ((0, 6), (0, 3)), ((0, 3), (4, 3)), ((4, 3), (4, 0)), ((4, 0), (0, 0))),
    "6": (((4, 6), (0, 6)), ((0, 6), (0, 0)), ((0, 0), (4, 0)), ((4, 0), (4, 3)), ((4, 3), (0, 3))),
    "7": (((0, 6), (4, 6)), ((4, 6), (1.5, 0))),
    "8": (((0, 0), (0, 6)), ((0, 6), (4, 6)), ((4, 6), (4, 0)), ((4, 0), (0, 0)), ((0, 3), (4, 3))),
    "9": (((4, 0), (4, 6)), ((4, 6), (0, 6)), ((0, 6), (0, 3)), ((0, 3), (4, 3))),
    "-": (((0.6, 3), (3.4, 3)),),
    ">": (((0.6, 5.4), (3.4, 3)), ((3.4, 3), (0.6, 0.6))),
    "<": (((3.4, 5.4), (0.6, 3)), ((0.6, 3), (3.4, 0.6))),
    "^": (((0.4, 2.6), (2, 5.6)), ((2, 5.6), (3.6, 2.6)), ((2, 5.6), (2, 0.2))),
    "|": (((2, 0), (2, 6)),),
    "/": (((0.4, 0), (3.6, 6)),),
    "=": (((0.4, 4.2), (3.6, 4.2)), ((0.4, 1.8), (3.6, 1.8))),
    "+": (((0.4, 3), (3.6, 3)), ((2, 0.8), (2, 5.2))),
    "x": (((0.4, 0.6), (3.6, 5.4)), ((0.4, 5.4), (3.6, 0.6))),
    " ": (),
}


def strokes(key, text, cx, cy, cz, h, yaw, col, weight=0.14, gap=0.3, out=0.02):
    """`text` in block strokes on a vertical plane facing `yaw` (0 faces +z),
    centred at (cx, cy, cz), `h` tall, `out` proud of the plane."""
    unit = h / 6.0
    gw = 4 * unit
    adv = gw + gap * h
    total = len(text) * gw + (len(text) - 1) * gap * h
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    wt = weight * h
    for i, ch in enumerate(text):
        ox = -total / 2 + i * adv
        for a, b in GLYPHS.get(ch, ()):
            ax, ay = ox + a[0] * unit, -h / 2 + a[1] * unit
            bx, by = ox + b[0] * unit, -h / 2 + b[1] * unit
            dx, dy = bx - ax, by - ay
            length = math.hypot(dx, dy)
            ux, uy = dx / length, dy / length
            ax, ay, bx, by = ax - ux * wt / 2, ay - uy * wt / 2, bx + ux * wt / 2, by + uy * wt / 2
            px, py = -uy * wt / 2, ux * wt / 2
            pts2 = ((ax - px, ay - py), (bx - px, by - py), (bx + px, by + py), (ax + px, ay + py))
            quad(key, *[(cx + rx * u + nx * out, cy + v, cz + rz * u + nz * out) for u, v in pts2], col=col)
    return total


def strokes_v(key, text, cx, cy, cz, h, yaw, col, weight=0.14, gap=0.25, out=0.02):
    """The same, one glyph under another (a column of type), centred at cy."""
    step = h * (1.0 + gap)
    y = cy + step * (len(text) - 1) / 2
    for ch in text:
        strokes(key, ch, cx, y, cz, h, yaw, col, weight=weight, out=out)
        y -= step


# ---------------------------------------------------------------------------
# Small set dressing.
# ---------------------------------------------------------------------------
def tarp(a, b, y0, y1, colour, sag=0.25):
    """A cloth stretched between two points over a stall or a balcony: the
    awning material, dyed, lit through."""
    dye = tuple(int(NEON[colour][i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
    pts = ((a[0], y0, a[1]), (b[0], y0, b[1]), (b[0], y1, b[1]), (a[0], y1, a[1]))
    quad((D, "awning", 1), *pts, uvs=((0, 0), (1, 0), (1, 1), (0, 1)), col=dye)
    quad((D, "awning", 1), pts[1], pts[0], pts[3], pts[2], uvs=((1, 0), (0, 0), (0, 1), (1, 1)), col=dye)


def cloth(p0, p1, p2, p3, colour):
    """A dyed cloth on four points (a canopy, a tarp), both sides."""
    dye = tuple(int(NEON[colour][i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
    quad((D, "awning", 1), p0, p1, p2, p3, uvs=((0, 0), (1, 0), (1, 1), (0, 1)), col=dye)
    quad((D, "awning", 1), p1, p0, p3, p2, uvs=((1, 0), (0, 0), (0, 1), (1, 1)), col=dye)


def blade(x, y, z, size, along="x", district=D, bracket=None):
    """One of the street's standard signs as a blade, both faces painted:
    `along` "x" for a blade whose faces look along x (it hangs off a wall
    that runs along x... its board in the y-z plane)."""
    w, h = ST_SIZES[size]
    sid = st_name(size)
    if along == "x":
        box((district, "board_frame", 0), x - 0.07, x + 0.07, y - h / 2 - 0.06, y + h / 2 + 0.06, z - w / 2 - 0.05, z + w / 2 + 0.05, scale=1.0)
        sign(sid, x + 0.08, y, z, w, h, math.pi / 2, district=district, label=False)
        sign(sid + "_b", x - 0.08, y, z, w, h, -math.pi / 2, district=district, label=False)
    else:
        box((district, "board_frame", 0), x - w / 2 - 0.05, x + w / 2 + 0.05, y - h / 2 - 0.06, y + h / 2 + 0.06, z - 0.07, z + 0.07, scale=1.0)
        sign(sid, x, y, z + 0.08, w, h, 0.0, district=district, label=False)
        sign(sid + "_b", x, y, z - 0.08, w, h, math.pi, district=district, label=False)


def angled_sign(x, y, z, size, yaw, district=D, back=True, depth=0.12):
    """A standard sign as a board at any angle (yaw 0 faces +z), framed,
    painted on both faces when `back`."""
    w, h = ST_SIZES[size]
    sid = st_name(size)
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((district, "board_frame", 0), x, y, z, w + 0.12, h + 0.12, depth, yaw, scale=1.0)
    sign(sid, x + nx * (depth / 2 + 0.012), y, z + nz * (depth / 2 + 0.012), w, h, yaw, district=district, label=False)
    if back:
        sign(sid + "_b", x - nx * (depth / 2 + 0.012), y, z - nz * (depth / 2 + 0.012), w, h, yaw + math.pi, district=district, label=False)


def people(points, pose="idle", y=0.0, yaw=0.0, jitter=None):
    """Stand several people: points are (x, z) or (x, z, yaw)."""
    for p in points:
        stand(p[0], p[1], p[2] if len(p) > 2 else yaw, pose, y)


def talkers(x, z, y=0.0, n=2, r=0.55, turn=0.0):
    """Two or three people facing each other round (x, z)."""
    for i in range(n):
        a = turn + i * math.tau / n
        px, pz = x + math.sin(a) * r, z + math.cos(a) * r
        stand(px, pz, a + math.pi, "talk", y)


# ---------------------------------------------------------------------------
# Masses the wings and the blocks are made of: a windowed shell with a roof,
# each face whole or in the spans given, then dressed by the caller.
# ---------------------------------------------------------------------------
def shell(x0, x1, z0, z1, y0, y1, col, seed, spans=None, skip=(), roof=True, mat="facade", collide=True):
    """Walls of windows round a rectangle from y0 to y1 and a roof on it.
    `spans`: for a face, the stretches of it to build instead of all of it,
    {"+z": [(a0, a1, y_from), ...]} (a is x for a z face, z for an x face).
    Returns its faces (buildings.Face) by name."""
    r = random.Random(seed)
    ov = r.randrange(0, 40)
    fs = B.faces_of(x0, x1, z0, z1)
    for name, f in fs.items():
        if name in skip:
            continue
        for (a0, a1, ylo) in (spans or {}).get(name, [(f.a0, f.a1, y0)]):
            B.facade_wall((D, mat, 0), B.Face(name, f.plane, a0, a1), max(ylo, y0), y1, col, ov)
    if roof:
        hquad((D, "roof", 0), x0, x1, z0, z1, y1, scale=4.0)
        B.ROOFS.append((D, x0, x1, z0, z1, y1))
    if collide:
        B.COLLISION.append(("box", x0, x1, y0, y1, z0, z1, D))
    return fs


def parapet(x0, x1, z0, z1, y, sides=("+z", "-z", "+x", "-x"), col=CONC, t=0.3, h=0.95, rim=None):
    """A roof's parapet on the sides named, and a line of light along its
    top's outer edge when `rim` names a colour."""
    runs = {"+z": (x0, x1, z1 - t, z1), "-z": (x0, x1, z0, z0 + t), "-x": (x0, x0 + t, z0, z1), "+x": (x1 - t, x1, z0, z1)}
    lines = {"+z": (x0, x1, z1, z1 + 0.04), "-z": (x0, x1, z0 - 0.04, z0), "-x": (x0 - 0.04, x0, z0, z1), "+x": (x1, x1 + 0.04, z0, z1)}
    for name in sides:
        a0, a1, b0, b1 = runs[name]
        tbox(a0, a1, y, y + h, b0, b1, col, scale=1.5)
        if rim:
            a0, a1, b0, b1 = lines[name]
            box((D, "neon_" + rim, 0), a0, a1, y + h - 0.12, y + h - 0.03, b0, b1, scale=1.0)


def ledges(f, y0, y1, every=1, out=0.18, s0=0.0, s1=None, detail=1, col=CONC):
    """Ledges along a face's floor lines between y0 and y1."""
    s1 = f.width if s1 is None else s1
    k = 1
    while floor_y(k) < y1 - 0.6:
        y = floor_y(k)
        if y > y0 + 0.4 and (k % every) == 0:
            f.ledge((D, "trim", detail), s0, s1, y - 0.22, 0.22, out, col)
        k += 1


def bridge(x0, x1, z0, z1, y0, y1, hue="cyan", seed=0):
    """A skybridge between two masses: a concrete tube with a band of lit
    glazing down each side, yellow along its edges, a line of light under."""
    tbox(x0, x1, y0, y1, z0, z1, CONC, bottom=True)
    along_x = (x1 - x0) >= (z1 - z0)
    band = dim(GLOW["white"], 0.2)
    if along_x:
        for zz, yaw in ((z1 + 0.02, 0.0), (z0 - 0.02, math.pi)):
            rotated_quad((D, "glow", 0), (x0 + x1) / 2, (y0 + y1) / 2 + 0.2, zz, (x1 - x0) - 0.6, (y1 - y0) * 0.36, yaw, col=band)
            rotated_quad((D, "trim", 0), (x0 + x1) / 2, y0 + 0.2, zz + (0.01 if yaw == 0.0 else -0.01), x1 - x0, 0.4, yaw, col=YEL)
        box((D, "neon_" + hue, 0), x0, x1, y0 - 0.1, y0 - 0.02, (z0 + z1) / 2 - 0.08, (z0 + z1) / 2 + 0.08, scale=1.0, bottom=True)
    else:
        for xx, yaw in ((x1 + 0.02, math.pi / 2), (x0 - 0.02, -math.pi / 2)):
            rotated_quad((D, "glow", 0), xx, (y0 + y1) / 2 + 0.2, (z0 + z1) / 2, (z1 - z0) - 0.6, (y1 - y0) * 0.36, yaw, col=band)
            rotated_quad((D, "trim", 0), xx + (0.01 if yaw > 0 else -0.01), y0 + 0.2, (z0 + z1) / 2, z1 - z0, 0.4, yaw, col=YEL)
        box((D, "neon_" + hue, 0), (x0 + x1) / 2 - 0.08, (x0 + x1) / 2 + 0.08, y0 - 0.1, y0 - 0.02, z0, z1, scale=1.0, bottom=True)


def stall(x, z, yaw, colour="red", hue="amber", lanterns=4, vendor=True, customers=2, w=3.6, seed=0):
    """A market stall with its front toward `yaw` (0 is +z): a counter, a
    shelf behind, a cloth roof on posts, a strip of light under it, lanterns
    along its front, somebody selling and somebody buying."""
    r = random.Random(seed or int(x * 13 + z * 7))
    cy, sy = math.cos(yaw), math.sin(yaw)

    def at(u, t):
        """u along the counter, t out toward the front."""
        return (x + cy * u + sy * t, z - sy * u + cy * t)

    hw = w / 2
    cx, cz = at(0.0, 0.0)
    oriented_box((D, "trim", 0), cx, G0 + 0.5, cz, w, 1.0, 0.7, yaw, col=r.choice((RED_PAINT, TEAL_PAINT, STEEL, YEL_OLD)))
    bx, bz = at(0.0, -1.6)
    oriented_box((D, "trim", 0), bx, G0 + 1.1, bz, w, 2.2, 0.4, yaw, col=STEEL)
    for u in (-hw, hw):
        for t in (-1.7, 0.9):
            px, pz = at(u, t)
            box((D, "metal", 1), px - 0.04, px + 0.04, G0, G0 + 2.7, pz - 0.04, pz + 0.04, scale=0.5)
    a, b, c, d_ = at(-hw - 0.2, 1.2), at(hw + 0.2, 1.2), at(hw + 0.2, -1.9), at(-hw - 0.2, -1.9)
    cloth((a[0], G0 + 2.55, a[1]), (b[0], G0 + 2.55, b[1]), (c[0], G0 + 2.95, c[1]), (d_[0], G0 + 2.95, d_[1]), colour)
    lx, lz = at(0.0, 0.1)
    oriented_box((D, "neon_" + hue, 0), lx, G0 + 2.4, lz, w - 0.4, 0.06, 0.08, yaw)
    for i in range(lanterns):
        px, pz = at(-hw + 0.3 + (w - 0.6) * i / max(1, lanterns - 1), 1.1)
        P.place("lantern", px, G0 + 2.2, pz)
    if vendor:
        px, pz = at(r.uniform(-0.6, 0.6), -0.9)
        stand(px, pz, yaw, "vendor", G0)
    for i in range(customers):
        px, pz = at(-hw + 0.7 + i * (w - 1.4) / max(1, customers - 1 or 1), 1.0 + r.uniform(0.0, 0.4))
        stand(px, pz, yaw + math.pi + r.uniform(-0.3, 0.3), r.choice(("idle", "phone", "idle")), G0)
