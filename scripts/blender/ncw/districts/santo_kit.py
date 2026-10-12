"""Santo Domingo's own kit: what an industrial edge is made of.

Sheds with sawtooth roofs and loading docks, tanks, spheres, stacks, steel
frames with X bracing, catwalks, pipe racks, fences and gates, yard lamps,
wires, painted numerals, and the yard's instanced props (containers, drums
on pallets, trailers, fence panels). Everything is keyed to "santo" so it
streams in the district's pack; the prototypes ride in the core with every
other district's, so each is one or two small meshes.

Light on the site is a map over the ground (src/world/spill.js): a wall is
lit by the neon or the `light()` points near it in plan, and a silhouette
is dark steel (`dark`, `metal`) in front of a pale or rust wall (`trim`,
its colour on its vertices). So every lamp here is both a small emissive
piece and a point in the bake.
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P

D = "santo"
GY = 0.15  # yards stand at the pavement's level


def k(mat, detail=0):
    return (D, mat, detail)


# Which of the site's materials each kind of industrial surface is keyed
# to. One table, read everywhere through M(): every tank, container, shed
# wall, pipe and pour in the district follows it. Each of these takes its
# colour from the vertex colour, as `trim` does, and is drawn in world
# space (no UVs).
MAT = {
    "tank": "tankplate",       # shells: tanks, spheres, bullets, stacks, vessels, the gasholder
    "container": "container",  # containers, trailers' bodies
    "cladding": "corrugated",  # shed walls, sawtooth and parapet sheet, the 06 block's panels
    "steel": "steel",          # painted steel: pipes, flanges, the gantry, cranes, saddles, trucks, the canopy
    "frame": "steel",          # structural steel, dark: columns, beams, braces
    "concrete": "castconcrete",  # bunds, piers, plinths, barriers
}
FRAME = (0.10, 0.10, 0.11, 1.0)  # a frame's own dark paint, where no colour is given
CONC = (0.56, 0.55, 0.52, 1.0)   # poured concrete's grey: white would glare under the sodium lamps


def M(role, detail=0):
    return (D, MAT[role], detail)


def c(r, g, b):
    return (r, g, b, 1.0)


def shade(col, f):
    return (col[0] * f, col[1] * f, col[2] * f, 1.0)


# Paint and metal, as vertex colours on `trim`.
RUST = c(0.52, 0.21, 0.09)
RUST_D = c(0.34, 0.14, 0.07)
OXIDE = c(0.44, 0.10, 0.07)
TANK_WHITE = c(0.80, 0.80, 0.74)
CREAM = c(0.68, 0.61, 0.46)
PALE_GREEN = c(0.36, 0.54, 0.42)
STEEL_BLUE = c(0.26, 0.35, 0.46)
OLIVE = c(0.40, 0.44, 0.13)
GANTRY = c(0.85, 0.30, 0.05)
GREY = c(0.42, 0.44, 0.47)
STEEL = c(0.07, 0.075, 0.085)
BRICK = c(0.42, 0.18, 0.12)
SAND = c(0.66, 0.52, 0.36)
SHEET = c(0.33, 0.34, 0.36)
WOOD = c(0.2, 0.13, 0.07)
YELLOW = c(0.62, 0.47, 0.06)
# Emissive, on `glow`: a furnace's mouth, lit factory glass, a lamp's lens.
HOT = c(1.0, 0.22, 0.03)
SODIUM = c(1.0, 0.48, 0.12)
GLASS_WARM = c(0.46, 0.27, 0.10)
GLASS_GREEN = c(0.20, 0.34, 0.24)
GLASS_COOL = c(0.30, 0.34, 0.40)
LID_WARM = c(0.50, 0.40, 0.26)
LID_GREEN = c(0.33, 0.43, 0.35)
LID_COOL = c(0.36, 0.41, 0.47)
PAINT_YELLOW = (0.86, 0.66, 0.10, 1.0)
PAINT_WHITE = (0.78, 0.76, 0.70, 1.0)

_counts = {"steam": 0, "lamp": 0}


# ---------------------------------------------------------------------------
# The window shader lights an office's floors right along or hardly at all
# (src/world/glsl.js, windowsT: `busy`, from the floor's number and the
# building's style and warmth). A band of panes that must be lit (a shed's
# north light, a ground floor of offices) is put on a floor it lights: the
# same dice, thrown here.
# ---------------------------------------------------------------------------
def _fract(v):
    return v - math.floor(v)


def _hash12(px, py):
    a, b_, c_ = _fract(px * 0.1031), _fract(py * 0.1031), _fract(px * 0.1031)
    d = a * (b_ + 33.33) + b_ * (c_ + 33.33) + c_ * (a + 33.33)
    a, b_, c_ = a + d, b_ + d, c_ + d
    return _fract((a + b_) * c_)


def lit_floor(style, warmth, r, busy=True):
    """A floor number (the v the band starts at) the shader lights (or
    leaves dark), and the warmth as the GLB's 8 bits will carry it."""
    wq = round(warmth * 255) / 255.0
    order = list(range(1, 90))
    r.shuffle(order)
    for vo in order:
        # (glTF turns v over: the shader's floor is -vo.)
        vals = [_hash12(-vo * 1.37 + sy * 17.0, 2.1 + wq * 17.0) for sy in (style / 8.0, round(style / 8.0 * 255) / 255.0)]
        if busy and min(vals) > 0.62:
            return vo, wq
        if not busy and max(vals) < 0.48:
            return vo, wq
    return order[0], wq


# ---------------------------------------------------------------------------
# Faces that know which way they look.
# ---------------------------------------------------------------------------
def quad_n(key, pts, n, col=(1, 1, 1, 1), uvs=None, uv_scale=0.5):
    """A quad wound to face `n` whatever order its corners came in."""
    a, b, c_, d = pts
    e1 = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    e2 = (d[0] - a[0], d[1] - a[1], d[2] - a[2])
    cr = (e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0])
    if uvs is None:
        length = math.sqrt(e1[0] ** 2 + e1[1] ** 2 + e1[2] ** 2) * uv_scale
        height = math.sqrt(e2[0] ** 2 + e2[1] ** 2 + e2[2] ** 2) * uv_scale
        uvs = ((0, 0), (length, 0), (length, height), (0, height))
    if cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0:
        pts = (b, a, d, c_)
        uvs = (uvs[1], uvs[0], uvs[3], uvs[2])
    quad(key, *pts, uvs=uvs, col=col)


def tri_n(key, pts, n, col=(1, 1, 1, 1)):
    a, b, c_ = pts
    e1 = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    e2 = (c_[0] - a[0], c_[1] - a[1], c_[2] - a[2])
    cr = (e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0])
    if cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0:
        pts = (a, c_, b)
    poly(key, list(pts), [(0, 0), (1, 0), (0.5, 1)], col)


def both(key, pts, col=(1, 1, 1, 1)):
    """A quad seen from both sides (a rail, a wire, a ribbon of steel)."""
    a, b, c_, d = pts
    quad(key, a, b, c_, d, col=col)
    quad(key, b, a, d, c_, col=col)


def paved(x0, x1, z0, z1, y=GY + 0.006):
    """Concrete yard, a hair over the asphalt it meets so no seam opens."""
    s = 0.5
    g = 0.05
    pts = ((x0 - g, y, z1 + g), (x1 + g, y, z1 + g), (x1 + g, y, z0 - g), (x0 - g, y, z0 - g))
    quad(k("sidewalk"), *pts, uvs=tuple((q[0] * s, -q[2] * s) for q in pts))


def asphalt(x0, x1, z0, z1, y=GY):
    s = 1.0 / 6.0
    pts = ((x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0))
    quad(k("asphalt"), *pts, uvs=tuple((q[0] * s, -q[2] * s) for q in pts))


def stripe(x0, x1, z0, z1, col=PAINT_YELLOW, y=GY + 0.014):
    """Paint on a yard: a bay line, a hatched keep-clear, an arrow's bar."""
    pts = ((x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0))
    quad(k("paint", 1), *pts, col=col)


def bays(x0, x1, z0, z1, n, along="x", col=PAINT_WHITE):
    """Parking or trailer bays: n of them across x0..x1 (or z0..z1)."""
    for i in range(n + 1):
        if along == "x":
            x = x0 + (x1 - x0) * i / n
            stripe(x - 0.06, x + 0.06, z0, z1, col)
        else:
            z = z0 + (z1 - z0) * i / n
            stripe(x0, x1, z - 0.06, z + 0.06, col)


def hatch(x0, x1, z0, z1, step=1.4, col=PAINT_YELLOW):
    """A keep-clear box: its outline and bars across it."""
    for (a0, a1, b0, b1) in ((x0, x1, z0, z0 + 0.12), (x0, x1, z1 - 0.12, z1), (x0, x0 + 0.12, z0, z1), (x1 - 0.12, x1, z0, z1)):
        stripe(a0, a1, b0, b1, col)
    x = x0 + step
    while x < x1 - 0.3:
        stripe(x - 0.08, x + 0.08, z0, z1, col)
        x += step


def collide(x0, x1, z0, z1, y1, y0=0.0):
    B.COLLISION.append(("box", x0, x1, y0, y1, z0, z1, D))


def steam(x, y, z, kind="roof", lit=5.0, red=0.5):
    """A vent that breathes (src/world/steam.js reads the name). Steam is
    lit by the map under it, so each vent has its own pool: the plume
    glows sodium orange (mH2wmyeiIpA@60's lit smoke)."""
    empty(f"anchor_steam_{kind}_santo_{_counts['steam']}", (x, y, z))
    _counts["steam"] += 1
    if lit:
        sodium(x, y, z, lit, red=red)


def plume(x, y, z, n=3, lit=6.0, red=0.5, step=3.4):
    """A stack's plume: vents one over another, each a little downwind of
    the last, so the steam stands tall over the stack and glows in its
    lamps' light (the site's steam rises 4.5 m a vent)."""
    for i in range(n):
        steam(x - 0.5 * i, y + step * i, z + 0.22 * i, lit=lit if i == 0 else 0.0, red=red)


def cone(x, y, z):
    """Sodium light hanging in the wet air under a lamp head (shafts.js)."""
    empty(f"anchor_lamp_santo_{_counts['lamp']}", (x, y, z))
    _counts["lamp"] += 1


WARM = 0.5


def sodium(x, y, z, power=4.0, red=0.0, hue="amber"):
    """A sodium lamp's pool in the bake: the kit's amber with red in it
    (the show's lamps are orange, mH2wmyeiIpA@60), more red at the plant.
    `power` is the pool's whole strength. (The map clips at one and amber
    past its clip goes yellow: a lone lamp is 8 or under, and where pools
    overlap each is smaller.)"""
    if hue != "amber":
        light(D, x, y, z, hue, power)
        return
    rr = WARM + red
    light(D, x, y, z, "amber", power / (1 + rr))
    light(D, x, y, z, "red", power * rr / (1 + rr))


def wash(x0, x1, z0, z1, level=0.7, step=4.5, hue="amber", red=0.0, r=None, fill=1.0, y=1.0):
    """Light over a patch of ground and the walls standing in it: small
    pools on a grid, each sized so that together they come to `level` of
    the map's full scale. A line (x0 == x1 or z0 == z1) washes a wall."""
    r = r or random.Random(int(x0 * 3 + z0 * 7 + x1))
    nx = max(1, round((x1 - x0) / step))
    nz = max(1, round((z1 - z0) / step))
    sx, sz = (x1 - x0) / nx, (z1 - z0) / nz
    # Energy per pool: the level times the cells it has to fill (1.5 m
    # cells; a line fills a strip about three cells wide).
    cells = max(sx, 4.5) / 1.5 * max(sz, 4.5) / 1.5
    p = level * cells / 1.4
    for i in range(nx):
        for j in range(nz):
            # One pool in two: light under lamps and dark between them,
            # not a sheet of it.
            if (i + j) % 2 == 1 and nx * nz > 2:
                continue
            if r.random() > fill:
                continue
            px = x0 + (i + 0.5) * sx + r.uniform(-0.3, 0.3) * min(sx, 1.0)
            pz = z0 + (j + 0.5) * sz + r.uniform(-0.3, 0.3) * min(sz, 1.0)
            sodium(px, y, pz, p * r.uniform(0.85, 1.1), red=red, hue=hue)


def ring_wash(cx, cz, rad, a0, a1, level=0.7, hue="amber", red=0.0, step=4.5):
    """Light round a tank's foot, over an arc: its lit side."""
    n = max(1, round(abs(a1 - a0) * rad / step))
    p = level * 9.0 / 1.4
    for i in range(n):
        a = a0 + (a1 - a0) * (i + 0.5) / n
        sodium(cx + rad * math.cos(a), 1.0, cz + rad * math.sin(a), p, red=red, hue=hue)


# ---------------------------------------------------------------------------
# Numerals in seven strokes, and the chevrons Petrochem paints its blocks
# with (Zq4zTcIM0yQ@174).
# ---------------------------------------------------------------------------
SEGS = {"0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc",
        "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "",
        # Letters the same strokes can make: enough for a stencilled name.
        "A": "abcefg", "C": "adef", "E": "adefg", "F": "aefg", "H": "bcefg", "L": "def", "O": "abcdef", "P": "abefg", "S": "afgcd", "U": "bcdef"}


def digits(text, cx, cy, cz, h, yaw, key, col, out=0.03, gap=0.28):
    """Numerals centred at (cx, cy, cz) on a face looking along `yaw` (0 is
    +z), h metres tall."""
    w = h * 0.52
    t = h * 0.13
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    pitch = w + h * gap
    u0 = -pitch * (len(text) - 1) / 2
    geo = {"a": (0, h / 2 - t / 2, w, t), "g": (0, 0, w, t), "d": (0, -h / 2 + t / 2, w, t),
           "f": (-w / 2 + t / 2, h / 4, t, h / 2), "b": (w / 2 - t / 2, h / 4, t, h / 2),
           "e": (-w / 2 + t / 2, -h / 4, t, h / 2), "c": (w / 2 - t / 2, -h / 4, t, h / 2)}
    for i, ch in enumerate(text):
        for s in SEGS.get(ch, ""):
            du, dv, sw, sh = geo[s]
            u = u0 + i * pitch + du
            rotated_quad(key, cx + rx * u + nx * out, cy + dv, cz + rz * u + nz * out, sw, sh, yaw, col=col)


def shell_text(cx, cz, r, y, text, h, yaw, col, key=None):
    """A number or a name painted round a tank's shell, centred where yaw
    looks: each character flat on its own piece of the curve."""
    for i, ch in enumerate(text):
        yi = yaw + (i - (len(text) - 1) / 2) * h * 0.8 / r
        digits(ch, cx + math.sin(yi) * (r + 0.02), y, cz + math.cos(yi) * (r + 0.02), h, yi, key or k("trim"), col, out=0.05)


def name_sign(text, cx, top, cz, yaw, h=2.0, col=SODIUM, lift=1.2):
    """A company's name where a roof or a gate shows it: letters in light
    on a dark board, a steel frame with rakers behind it, a tube under it
    lighting what it stands on. Invented names only."""
    wd = len(text) * h * 0.8 + h * 0.5
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    cy = top + lift + h * 0.75
    oriented_box(k("board_frame"), cx, cy, cz, wd, h * 1.5, 0.16, yaw)
    digits(text, cx, cy, cz, h, yaw, k("glow"), col, out=0.1)
    n = max(1, round(wd / 4.0))
    for i in range(n + 1):
        du = -wd / 2 + wd * i / n
        px, pz = cx + rx * du - nx * 0.16, cz + rz * du - nz * 0.16
        box(k("metal", 1), px - 0.07, px + 0.07, top, cy + h * 0.75, pz - 0.07, pz + 0.07, scale=0.5)
        if lift + h > 2.6:
            brace((px, cy, pz), (px - nx * 1.6, top, pz - nz * 1.6), r=0.04, mat="metal", detail=1)
    oriented_box(k("neon_amber"), cx + nx * 0.3, cy - h * 0.75 - 0.12, cz + nz * 0.3, wd * 0.8, 0.07, 0.1, yaw)


def band_quad(key, cx, cz, yaw, u0, y0, u1, y1, wdt, col, out=0.04):
    """A slanted painted band on a wall: from (u0, y0) to (u1, y1) in the
    wall's own plane (u along it), `wdt` wide."""
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    du, dy = u1 - u0, y1 - y0
    ln = math.hypot(du, dy)
    px, py = -dy / ln * wdt / 2, du / ln * wdt / 2
    pts = [(u0 - px, y0 - py), (u1 - px, y1 - py), (u1 + px, y1 + py), (u0 + px, y0 + py)]
    w3 = [(cx + rx * u + nx * out, y, cz + rz * u + nz * out) for u, y in pts]
    quad_n(key, w3, (nx, 0, nz), col)


# ---------------------------------------------------------------------------
# Steel: columns and beams are boxes, braces square tubes, rails ribbons.
# ---------------------------------------------------------------------------
def paint(mat, col):
    """A steel member's colour: the one given, or the frame's dark paint on
    a material that takes its colour from the vertices."""
    if col is not None:
        return col
    return FRAME if mat in (MAT["frame"], "trim") else (1, 1, 1, 1)


def column(x, z, y0, y1, t=0.3, mat=MAT["frame"], col=None, detail=0):
    box(k(mat, detail), x - t / 2, x + t / 2, y0, y1, z - t / 2, z + t / 2, scale=1.0, col=paint(mat, col))


def beam(x0, z0, x1, z1, y, t=0.28, mat=MAT["frame"], col=None, detail=0):
    """A beam between two points at height y (its top), along x or z."""
    col = paint(mat, col)
    if abs(x1 - x0) >= abs(z1 - z0):
        box(k(mat, detail), min(x0, x1), max(x0, x1), y - t, y, z0 - t / 2, z0 + t / 2, scale=1.0, col=col, bottom=True)
    else:
        box(k(mat, detail), x0 - t / 2, x0 + t / 2, y - t, y, min(z0, z1), max(z0, z1), scale=1.0, col=col, bottom=True)


def brace(a, b, r=0.09, mat=MAT["frame"], col=None, detail=0):
    pipe(k(mat, detail), a, b, r, segs=4, col=paint(mat, col))


def xbrace(x0, z0, x1, z1, y0, y1, r=0.09, mat=MAT["frame"], col=None, detail=0):
    brace((x0, y0, z0), (x1, y1, z1), r, mat, col, detail)
    brace((x1, y0, z1), (x0, y1, z0), r, mat, col, detail)


def rail(a, b, h=1.05, mat="metal", detail=1, posts=1.6, lamps=None):
    """A handrail from a to b (points at deck level): top and knee rails
    and posts, flat, seen from both sides. `lamps`: a colour for small
    lights along its top (the catwalks' dots, mH2wmyeiIpA@60)."""
    ax, ay, az = a
    bx, by, bz = b
    ln = math.hypot(bx - ax, bz - az)
    if ln < 0.2:
        return
    key = k(mat, detail)
    for yy, t in ((h, 0.06), (h * 0.52, 0.04)):
        both(key, ((ax, ay + yy - t, az), (bx, by + yy - t, bz), (bx, by + yy, bz), (ax, ay + yy, az)))
    n = max(1, int(ln / posts))
    ux, uz = (bx - ax) / ln, (bz - az) / ln
    for i in range(n + 1):
        t = i / n
        px, py, pz = ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t
        both(key, ((px - ux * 0.03, py, pz - uz * 0.03), (px + ux * 0.03, py, pz + uz * 0.03),
                   (px + ux * 0.03, py + h, pz + uz * 0.03), (px - ux * 0.03, py + h, pz - uz * 0.03)))
    if lamps is not None:
        m = max(1, int(ln / 3.2))
        for i in range(m):
            t = (i + 0.5) / m
            px, py, pz = ax + (bx - ax) * t, ay + (by - ay) * t + h - 0.2, az + (bz - az) * t
            both(k("glow"), ((px - ux * 0.09, py, pz - uz * 0.09), (px + ux * 0.09, py, pz + uz * 0.09),
                             (px + ux * 0.09, py + 0.16, pz + uz * 0.09), (px - ux * 0.09, py + 0.16, pz - uz * 0.09)), lamps)


def deck(x0, x1, z0, z1, y, mat="metal", detail=0, t=0.08):
    """A grating floor: its top, underside and edges."""
    box(k(mat, detail), x0, x1, y - t, y, z0, z1, scale=1.0, bottom=True)


def catwalk(x0, z0, x1, z1, y, w=1.2, lamps=SODIUM, detail=0, rails=(True, True)):
    """A railed walkway between two points at height y, along x or z."""
    if abs(x1 - x0) >= abs(z1 - z0):
        xa, xb = min(x0, x1), max(x0, x1)
        deck(xa, xb, z0 - w / 2, z0 + w / 2, y, detail=detail)
        if rails[0]:
            rail((xa, y, z0 - w / 2), (xb, y, z0 - w / 2), lamps=lamps)
        if rails[1]:
            rail((xa, y, z0 + w / 2), (xb, y, z0 + w / 2), lamps=lamps)
    else:
        za, zb = min(z0, z1), max(z0, z1)
        deck(x0 - w / 2, x0 + w / 2, za, zb, y, detail=detail)
        if rails[0]:
            rail((x0 - w / 2, y, za), (x0 - w / 2, y, zb), lamps=lamps)
        if rails[1]:
            rail((x0 + w / 2, y, za), (x0 + w / 2, y, zb), lamps=lamps)


def stair(a, b, w=0.9, mat="metal", detail=1):
    """A steel stair from a to b (the points on its centre line): a sloped
    flight seen from over and under, a rail each side."""
    ax, ay, az = a
    bx, by, bz = b
    ln = math.hypot(bx - ax, bz - az)
    if ln < 0.1:
        return
    px, pz = -(bz - az) / ln * w / 2, (bx - ax) / ln * w / 2
    both(k(mat, detail), ((ax - px, ay, az - pz), (ax + px, ay, az + pz), (bx + px, by, bz + pz), (bx - px, by, bz - pz)))
    rail((ax - px, ay, az - pz), (bx - px, by, bz - pz), mat=mat, detail=detail)
    rail((ax + px, ay, az + pz), (bx + px, by, bz + pz), mat=mat, detail=detail)


def ladder(x, z, y0, y1, yaw, detail=1):
    """A caged ladder up a wall or a tank: two stiles and the cage's hoops
    as a ribbon each side."""
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    for s in (-0.25, 0.25):
        px, pz = x + rx * s + nx * 0.12, z + rz * s + nz * 0.12
        both(k("metal", detail), ((px - rx * 0.03, y0, pz - rz * 0.03), (px + rx * 0.03, y0, pz + rz * 0.03),
                                  (px + rx * 0.03, y1, pz + rz * 0.03), (px - rx * 0.03, y1, pz - rz * 0.03)))
    y = y0 + 0.3
    while y < y1:
        both(k("metal", detail), ((x - rx * 0.25 + nx * 0.12, y, z - rz * 0.25 + nz * 0.12), (x + rx * 0.25 + nx * 0.12, y, z + rz * 0.25 + nz * 0.12),
                                  (x + rx * 0.25 + nx * 0.12, y + 0.04, z + rz * 0.25 + nz * 0.12), (x - rx * 0.25 + nx * 0.12, y + 0.04, z - rz * 0.25 + nz * 0.12)))
        y += 0.6
    for s in (-0.4, 0.4):
        px, pz = x + rx * s + nx * 0.75, z + rz * s + nz * 0.75
        both(k("metal", detail), ((px - 0.02, y0 + 2.4, pz), (px + 0.02, y0 + 2.4, pz), (px + 0.02, y1 + 1.0, pz), (px - 0.02, y1 + 1.0, pz)))


def cable(a, b, sag=0.8, steps=8, t=0.03, detail=1):
    """A wire slung from a to b, dark against the glow."""
    ax, ay, az = a
    bx, by, bz = b
    key = k("dark", detail)
    prev = None
    for i in range(steps + 1):
        s = i / steps
        p = (ax + (bx - ax) * s, ay + (by - ay) * s - sag * math.sin(math.pi * s), az + (bz - az) * s)
        if prev is not None:
            both(key, ((prev[0], prev[1] - t, prev[2]), (p[0], p[1] - t, p[2]), (p[0], p[1] + t, p[2]), (prev[0], prev[1] + t, prev[2])))
        prev = p


def wires(a, b, yaw_cross, offsets=(-0.9, 0.0, 0.9), y_off=0.0, sag=0.7, detail=1):
    """Conductors between two crossarms: each offset across the line."""
    cx, cz = math.cos(yaw_cross), -math.sin(yaw_cross)
    for o in offsets:
        cable((a[0] + cx * o, a[1] + y_off, a[2] + cz * o), (b[0] + cx * o, b[1] + y_off, b[2] + cz * o), sag=sag, detail=detail)


# ---------------------------------------------------------------------------
# Tanks, spheres, bullets, stacks.
# ---------------------------------------------------------------------------
def ring_pts(cx, cz, r, n, y, a0=0.0):
    return [(cx + r * math.cos(a0 + i * math.tau / n), y, cz + r * math.sin(a0 + i * math.tau / n)) for i in range(n)]


def round_segs(r):
    """Sides for a round shell of radius r, enough that its outline holds
    against the sky."""
    return max(12, min(40, int(10 + r * 2.6) // 2 * 2))


def dull(col, f=0.4):
    """A paint gone flat with weather: its colour drawn toward its grey."""
    g = (col[0] + col[1] + col[2]) / 3
    return (col[0] + (g - col[0]) * f, col[1] + (g - col[1]) * f, col[2] + (g - col[2]) * f, 1.0)


def flange(p, d, r, col, detail=1, t=0.06):
    """A flange on a pipe at p, across its run d: a disc wider than it."""
    ln = math.sqrt(d[0] ** 2 + d[1] ** 2 + d[2] ** 2) or 1.0
    u = (d[0] / ln * t, d[1] / ln * t, d[2] / ln * t)
    pipe(M("steel", detail), (p[0] - u[0], p[1] - u[1], p[2] - u[2]), (p[0] + u[0], p[1] + u[1], p[2] + u[2]), r * 1.5 + 0.04, segs=8,
         col=shade(col, 0.6), caps=True)


def valve(p, d, r, col=RUST_D, detail=1):
    """A gate valve in a level line at p (the line runs along d): a flange
    each side, its body, the stem and a red hand wheel."""
    ln = math.hypot(d[0], d[2]) or 1.0
    ux, uz = d[0] / ln, d[2] / ln
    w = r * 1.4 + 0.1
    for s in (-1, 1):
        flange((p[0] + ux * w * s, p[1], p[2] + uz * w * s), (ux, 0, uz), r, col, detail)
    box(M("steel", detail), p[0] - w * 0.7, p[0] + w * 0.7, p[1] - r * 1.15, p[1] + r * 1.5, p[2] - w * 0.7, p[2] + w * 0.7, scale=1.0,
        col=shade(col, 0.7), bottom=True)
    top = p[1] + r * 1.5 + 0.42
    cylinder(M("steel", detail), p[0], p[2], p[1] + r * 1.5, top, 0.035, segs=4, col=STEEL, cap=False)
    cylinder(M("steel", detail), p[0], p[2], top, top + 0.04, 0.27, segs=8, col=c(0.45, 0.06, 0.04))


def nozzle(cx, cy, cz, yaw, r=0.26, ln=0.7, col=RUST_D, detail=1):
    """A flanged nozzle out of a shell toward yaw, a blind cover on it."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    tip = (cx + nx * ln, cy, cz + nz * ln)
    pipe(M("steel", detail), (cx, cy, cz), tip, r, segs=8, col=shade(col, 0.8))
    flange(tip, (nx, 0, nz), r, col, detail)


def tank(cx, cz, r, h, col, segs=20, band=None, number=None, number_yaw=0.0, stair_at=0.0, lamp="cyan", r_=None, roof=0.16, breathe=False):
    """A storage tank: its shell with a painted band and two wind girders,
    a cone roof with a vent, a rail round the rim, a stair spiralling up
    its side to a landing with a safety lamp, a manway and a valved outlet
    at its foot (Fn9gKhU_2_Q@28)."""
    r_ = r_ or random.Random(int(cx * 7 + cz * 13))
    segs = max(segs, round_segs(r))
    y0, y1 = GY, GY + h
    lo, hi = ring_pts(cx, cz, r, segs, y0), ring_pts(cx, cz, r, segs, y1)
    cuts = [y0, y1]
    if band:
        cuts = [y0, y0 + h * band[0], y0 + h * band[1], y1]
    for j in range(len(cuts) - 1):
        ya, yb = cuts[j], cuts[j + 1]
        cc = shade(col, 0.5) if (band and j == 1) else col
        for i in range(segs):
            a, b_ = lo[i], lo[(i + 1) % segs]
            mid = ((a[0] + b_[0]) / 2 - cx, 0, (a[2] + b_[2]) / 2 - cz)
            quad_n(M("tank"), ((a[0], ya, a[2]), (b_[0], ya, b_[2]), (b_[0], yb, b_[2]), (a[0], yb, a[2])), mid, cc)
    apex = (cx, y1 + r * roof, cz)
    for i in range(segs):
        a, b_ = hi[i], hi[(i + 1) % segs]
        tri_n(M("tank"), (apex, a, b_), (0, 1, 0), shade(col, 0.82))
    cylinder(k("metal", 1), cx, cz, apex[1] - 0.1, apex[1] + 0.5, 0.35, segs=6)
    if breathe:
        # Its roof vent breathing: vapour off the rim, lit from the landing.
        steam(cx, apex[1] + 0.55, cz, kind="stack", lit=3.0, red=0.3)
    # Wind girders: an angle round the rim and one part way down.
    for gy in (y1 - 0.16, y0 + h * 0.52):
        cylinder(M("steel", 1), cx, cz, gy, gy + 0.14, r + 0.07, segs=segs, col=shade(col, 0.55), cap=False)
    # The rim's rail and its posts.
    rr = ring_pts(cx, cz, r - 0.05, segs, y1)
    for i in range(segs):
        a, b_ = rr[i], rr[(i + 1) % segs]
        both(k("metal", 1), ((a[0], y1 + 0.98, a[2]), (b_[0], y1 + 0.98, b_[2]), (b_[0], y1 + 1.05, b_[2]), (a[0], y1 + 1.05, a[2])))
        both(k("metal", 1), ((a[0], y1 + 0.5, a[2]), (b_[0], y1 + 0.5, b_[2]), (b_[0], y1 + 0.54, b_[2]), (a[0], y1 + 0.54, a[2])))
        if i % 2 == 0:
            tx, tz = -(a[2] - cz) / r * 0.03, (a[0] - cx) / r * 0.03
            both(k("metal", 1), ((a[0] - tx, y1, a[2] - tz), (a[0] + tx, y1, a[2] + tz), (a[0] + tx, y1 + 1.05, a[2] + tz), (a[0] - tx, y1 + 1.05, a[2] - tz)))
    # The stair: a ramp of treads winding a third of the way round.
    sweep = min(2.4, (h * 1.5) / r)
    n = max(6, int(sweep * r / 1.6))
    prev = None
    for i in range(n + 1):
        t = i / n
        ang = stair_at - sweep * (1 - t)
        y = y0 + h * t
        inner = (cx + (r + 0.08) * math.cos(ang), y, cz + (r + 0.08) * math.sin(ang))
        outer = (cx + (r + 0.95) * math.cos(ang), y, cz + (r + 0.95) * math.sin(ang))
        if prev is not None:
            both(k("metal", 1), (prev[0], prev[1], outer, inner))
            rail(prev[1], outer, detail=1, posts=9.0)
        prev = (inner, outer)
    # The landing at its top, and the lamp over it.
    lx, lz = cx + (r + 0.5) * math.cos(stair_at), cz + (r + 0.5) * math.sin(stair_at)
    box(k("metal", 1), lx - 0.7, lx + 0.7, y1 - 0.06, y1, lz - 0.7, lz + 0.7, scale=1.0, bottom=True)
    if lamp:
        box(k("glow"), lx - 0.09, lx + 0.09, y1 + 1.9, y1 + 2.15, lz - 0.09, lz + 0.09, scale=0.5, col=GLOW[lamp])
        box(k("metal", 1), lx - 0.03, lx + 0.03, y1, y1 + 1.9, lz - 0.03, lz + 0.03, scale=0.5)
        light(D, lx, y1, lz, lamp, 2.2)
    # At its foot, away from the stair: a manway, and the outlet with its
    # valve and hand wheel.
    fa = stair_at + math.pi * 0.55
    fy = math.pi / 2 - fa  # the yaw that looks out along the angle fa
    nozzle(cx + r * math.cos(fa), y0 + 0.95, cz + r * math.sin(fa), fy, r=0.38, ln=0.35, col=col)
    fb = fa + 1.6 / r
    ox, oz = cx + r * math.cos(fb), cz + r * math.sin(fb)
    nozzle(ox, y0 + 0.55, oz, math.pi / 2 - fb, r=0.2, ln=1.3, col=RUST_D)
    valve((ox + 0.75 * math.cos(fb), y0 + 0.55, oz + 0.75 * math.sin(fb)), (math.cos(fb), 0, math.sin(fb)), 0.2)
    if number:
        # Its number on both sides, round the shell, tall enough for the gate.
        for ny in (number_yaw, number_yaw + math.pi):
            shell_text(cx, cz, r, y0 + h * 0.6, number, min(3.2, h * 0.3), ny, shade(col, 0.35) if sum(col[:3]) > 1.0 else TANK_WHITE)
    collide(cx - r * 0.75, cx + r * 0.75, cz - r * 0.75, cz + r * 0.75, y1)


def sphere(cx, cz, r, col, segs=28, rings=14, legs=8, lamp="cyan"):
    """A pressure sphere on its tube legs, a platform and a lamp on its
    crown, the outlet down from its belly to a valve."""
    cy = GY + r * 1.38
    for j in range(rings):
        p0, p1 = -math.pi / 2 + math.pi * j / rings, -math.pi / 2 + math.pi * (j + 1) / rings
        cc = shade(col, 0.55) if j == rings // 2 else col
        for i in range(segs):
            t0, t1 = i * math.tau / segs, (i + 1) * math.tau / segs
            pts = [(cx + r * math.cos(p) * math.cos(t), cy + r * math.sin(p), cz + r * math.cos(p) * math.sin(t))
                   for p, t in ((p0, t0), (p0, t1), (p1, t1), (p1, t0))]
            pm, tm = (p0 + p1) / 2, (t0 + t1) / 2
            n = (math.cos(pm) * math.cos(tm), math.sin(pm), math.cos(pm) * math.sin(tm))
            if j == 0:
                tri_n(M("tank"), (pts[0], pts[2], pts[3]), n, cc)
            elif j == rings - 1:
                tri_n(M("tank"), (pts[0], pts[1], pts[2]), n, cc)
            else:
                quad_n(M("tank"), pts, n, cc)
    lr = r * 0.94
    feet = []
    for i in range(legs):
        t = (i + 0.5) * math.tau / legs
        fx, fz = cx + lr * math.cos(t), cz + lr * math.sin(t)
        cylinder(M("steel"), fx, fz, GY + 0.3, cy - r * 0.2, 0.2, segs=8, col=shade(col, 0.45), cap=False)
        box(M("concrete"), fx - 0.45, fx + 0.45, GY, GY + 0.3, fz - 0.45, fz + 0.45, scale=1.0, col=CONC)
        feet.append((fx, fz))
    for i in range(legs):
        (ax, az), (bx, bz) = feet[i], feet[(i + 1) % legs]
        xbrace(ax, az, bx, bz, GY + 0.4, cy - r * 0.55, r=0.05, mat="metal", detail=1)
    # The outlet: down from the belly, a valve, out to the yard's line.
    run([(cx, cy - r + 0.1, cz), (cx, GY + 0.75, cz), (cx - r - 1.6, GY + 0.75, cz)], r=0.2, col=TANK_WHITE, valves=True)
    top = cy + r
    box(k("metal", 1), cx - 1.3, cx + 1.3, top - 0.05, top + 0.03, cz - 1.3, cz + 1.3, scale=1.0, bottom=True)
    for (a, b_) in (((cx - 1.3, top, cz - 1.3), (cx + 1.3, top, cz - 1.3)), ((cx + 1.3, top, cz - 1.3), (cx + 1.3, top, cz + 1.3)),
                    ((cx + 1.3, top, cz + 1.3), (cx - 1.3, top, cz + 1.3)), ((cx - 1.3, top, cz + 1.3), (cx - 1.3, top, cz - 1.3))):
        rail(a, b_, detail=1)
    cylinder(M("steel", 1), cx + 0.7, cz + 0.6, top - 0.1, top + 0.7, 0.16, segs=6, col=shade(col, 0.6))
    if lamp:
        box(k("glow"), cx - 0.1, cx + 0.1, top + 1.5, top + 1.75, cz - 0.1, cz + 0.1, scale=0.5, col=GLOW[lamp])
        box(k("metal", 1), cx - 0.03, cx + 0.03, top, top + 1.5, cz - 0.03, cz + 0.03, scale=0.5)
        light(D, cx, top, cz, lamp, 2.0)
    # The stair up to it: flights zigzagging in a slim tower beside it.
    tx, tz = cx + r + 1.2, cz
    for fx, fz in ((tx - 0.9, tz - 1.4), (tx + 0.9, tz - 1.4), (tx - 0.9, tz + 1.4), (tx + 0.9, tz + 1.4)):
        column(fx, fz, GY, top + 1.0, t=0.14, mat="metal", detail=1)
    y, flip = GY, 1
    while y < top - 0.5:
        y2 = min(top, y + 3.0)
        stair((tx, y, tz - 1.2 * flip), (tx, y2, tz + 1.2 * flip), w=1.2)
        y, flip = y2, -flip
    catwalk(cx + 1.3, cz, tx - 0.9, cz, top, w=1.0, lamps=None, detail=1)
    collide(cx - r * 0.7, cx + r * 0.7, cz - r * 0.7, cz + r * 0.7, top)
    return top


def bullet(x0, x1, z, r, col, y=None, segs=None, base=GY):
    """A horizontal pressure vessel: a barrel with dished heads, two
    saddles on their piers with a strap over each, a manway and a relief
    valve on its back, a flanged nozzle at one end."""
    y = (GY + r + 1.1) if y is None else y
    segs = segs or (20 if r >= 1.5 else 14)
    heads = ((0.0, 1.0), (0.22, 0.9), (0.42, 0.62), (0.52, 0.0))  # (how far out, how wide), in radii
    for i in range(segs):
        t0, t1 = i * math.tau / segs, (i + 1) * math.tau / segs
        a, b_ = (math.cos(t0), math.sin(t0)), (math.cos(t1), math.sin(t1))
        n = (0, (a[1] + b_[1]) / 2, (a[0] + b_[0]) / 2)
        quad_n(M("tank"), ((x0, y + a[1] * r, z + a[0] * r), (x1, y + a[1] * r, z + a[0] * r), (x1, y + b_[1] * r, z + b_[0] * r),
                           (x0, y + b_[1] * r, z + b_[0] * r)), n, col)
        for xe, s in ((x0, -1), (x1, 1)):
            for j in range(3):
                (oa, wa), (ob, wb) = heads[j], heads[j + 1]
                pa = [(xe + s * oa * r, y + q[1] * r * wa, z + q[0] * r * wa) for q in (a, b_)]
                pb = [(xe + s * ob * r, y + q[1] * r * wb, z + q[0] * r * wb) for q in (a, b_)]
                hn = (s * (0.35 + 0.3 * j), n[1] * (1 - 0.3 * j), n[2] * (1 - 0.3 * j))
                if j == 2:
                    tri_n(M("tank"), (pa[0], pa[1], pb[0]), hn, shade(col, 0.86))
                else:
                    quad_n(M("tank"), (pa[0], pa[1], pb[1], pb[0]), hn, shade(col, 0.93 - 0.04 * j))
    for sx in (x0 + (x1 - x0) * 0.2, x0 + (x1 - x0) * 0.8):
        box(M("concrete"), sx - 0.4, sx + 0.4, base, y - r * 0.72, z - r * 0.85, z + r * 0.85, scale=1.5, col=CONC)
        box(M("steel"), sx - 0.3, sx + 0.3, y - r * 0.72, y - r * 0.45, z - r * 0.9, z + r * 0.9, scale=1.0, col=shade(col, 0.45))
        pipe(M("steel", 1), (sx - 0.1, y, z), (sx + 0.1, y, z), r + 0.035, segs=segs, col=shade(col, 0.5))
    ln = x1 - x0
    mx, vx = x0 + ln * 0.36, x0 + ln * 0.66
    cylinder(M("steel", 1), mx, z, y + r - 0.08, y + r + 0.28, min(0.34, r * 0.4), segs=8, col=shade(col, 0.7))
    cylinder(M("steel", 1), mx, z, y + r + 0.28, y + r + 0.34, min(0.34, r * 0.4) + 0.08, segs=8, col=shade(col, 0.5))
    cylinder(M("steel", 1), vx, z, y + r - 0.05, y + r + 0.7, 0.07, segs=6, col=STEEL)
    box(M("steel", 1), vx - 0.12, vx + 0.12, y + r + 0.7, y + r + 0.95, z - 0.1, z + 0.22, scale=0.5, col=c(0.45, 0.06, 0.04), bottom=True)
    flange((x0 - r * 0.52, y, z), (1, 0, 0), min(0.2, r * 0.25), col)
    collide(x0, x1, z - r, z + r, y + r)


def stack(cx, cz, h, r0, r1, col, segs=12, bands=((0.80, 0.86), (0.92, 0.97)), band_col=TANK_WHITE, platform=0.72, breathe=True,
          beacon=True, lit=None, puffs=3):
    """A stack: a tapering steel shell in flanged lifts with painted bands
    near its top, a service platform, a caged ladder, red lamps, steam
    (mH2wmyeiIpA@60)."""
    segs = max(segs, round_segs(r0) + 2)
    cuts = sorted({0.0, 1.0, *[v for b_ in bands for v in b_]})
    rad = lambda t: r0 + (r1 - r0) * t  # noqa: E731
    for j in range(len(cuts) - 1):
        ta, tb = cuts[j], cuts[j + 1]
        cc = band_col if any(abs(ta - b_[0]) < 1e-6 for b_ in bands) else col
        la, lb = ring_pts(cx, cz, rad(ta), segs, GY + h * ta), ring_pts(cx, cz, rad(tb), segs, GY + h * tb)
        for i in range(segs):
            i2 = (i + 1) % segs
            mid = ((la[i][0] + la[i2][0]) / 2 - cx, 0, (la[i][2] + la[i2][2]) / 2 - cz)
            quad_n(M("tank"), (la[i], la[i2], lb[i2], lb[i]), mid, cc)
    # The joints between its lifts: a flange ring every six metres or so.
    lifts = max(2, round(h / 6.0))
    for j in range(1, lifts):
        t = j / lifts
        cylinder(M("steel", 1), cx, cz, GY + h * t - 0.08, GY + h * t + 0.08, rad(t) + 0.08, segs=segs, col=shade(col, 0.5), cap=False)
    top = GY + h
    cylinder(k("dark"), cx, cz, top - 0.05, top + 0.3, r1 + 0.12, segs=segs)
    if platform:
        py = GY + h * platform
        pr = rad(platform)
        inner, outer = ring_pts(cx, cz, pr, segs, py), ring_pts(cx, cz, pr + 1.1, segs, py)
        for i in range(segs):
            i2 = (i + 1) % segs
            both(k("metal"), (inner[i], inner[i2], outer[i2], outer[i]))
            rail(outer[i], outer[i2], detail=1, posts=9.0)
    ladder(cx + rad(0.4) + 0.02, cz, GY + 2.5, GY + h * (platform or 0.9), math.pi / 2)
    if beacon:
        for t, n_ in ((1.0, 3), (0.5, 2)):
            for i in range(n_):
                a = i * math.tau / n_ + 0.5
                rr = rad(t) + 0.14
                bx, bz = cx + rr * math.cos(a), cz + rr * math.sin(a)
                box(k("glow"), bx - 0.14, bx + 0.14, GY + h * t - 0.6, GY + h * t - 0.25, bz - 0.14, bz + 0.14, scale=0.5, col=GLOW["red"])
    if lit:
        sodium(cx + r0 + 1.5, 1.0, cz + r0 + 1.5, lit, red=0.4)
    if breathe:
        plume(cx, top + 0.6, cz, n=puffs)
    collide(cx - r0, cx + r0, cz - r0, cz + r0, top)
    return top


def flue(x, z, y0, y1, r=0.4, col=RUST, lit=3.0):
    """A steel flue up from a roof: its shell in two lifts with a flange
    between, a plate at its foot, three stays, a red lamp at its lip, and
    what it burns going up from it."""
    cylinder(M("tank"), x, z, y0, y1, r, segs=10, col=col, cap=False)
    ym = (y0 + y1) / 2
    cylinder(M("steel", 1), x, z, ym - 0.06, ym + 0.06, r + 0.07, segs=10, col=shade(col, 0.5), cap=False)
    cylinder(k("dark"), x, z, y1 - 0.04, y1 + 0.22, r + 0.08, segs=10)
    box(M("steel"), x - r - 0.25, x + r + 0.25, y0, y0 + 0.25, z - r - 0.25, z + r + 0.25, scale=1.0, col=shade(col, 0.5))
    ys = y0 + (y1 - y0) * 0.7
    for a in (0.4, 2.5, 4.6):
        cable((x + r * math.cos(a), ys, z + r * math.sin(a)), (x + 2.4 * math.cos(a), y0 + 0.05, z + 2.4 * math.sin(a)), sag=0.0, steps=1)
    box(k("glow"), x + r + 0.02, x + r + 0.2, y1 - 0.5, y1 - 0.3, z - 0.09, z + 0.09, scale=0.5, col=GLOW["red"])
    steam(x, y1 + 0.3, z, kind="stack", lit=lit)


def flare(cx, cz, h, w=2.4):
    """A flare stack: a slim riser in a braced lattice, its flame at the
    tip burning orange over the yard."""
    n = max(4, int(h / 5.0))
    for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        brace((cx + sx * w / 2, GY, cz + sz * w / 2), (cx + sx * 0.35, GY + h - 1.0, cz + sz * 0.35), r=0.09, mat="metal")
    for i in range(n):
        ta, tb = i / n, (i + 1) / n
        wa, wb = w / 2 + (0.35 - w / 2) * ta * (h - 1.0) / h, w / 2 + (0.35 - w / 2) * tb * (h - 1.0) / h
        ya, yb = GY + (h - 1.0) * ta, GY + (h - 1.0) * tb
        for (ax, az, bx, bz) in ((-1, -1, 1, -1), (1, -1, 1, 1), (1, 1, -1, 1), (-1, 1, -1, -1)):
            brace((cx + ax * wa, ya, cz + az * wa), (cx + bx * wb, yb, cz + bz * wb), r=0.05, mat="metal", detail=1)
            brace((cx + ax * wb, yb, cz + az * wb), (cx + bx * wb, yb, cz + bz * wb), r=0.05, mat="metal", detail=1)
    cylinder(k("metal"), cx, cz, GY, GY + h, 0.22, segs=6)
    cylinder(k("dark"), cx, cz, GY + h, GY + h + 0.5, 0.38, segs=6)
    top = GY + h + 0.5
    # The flame: three leaves of fire, hot at the root.
    for i, (a, s, hh) in enumerate(((0.0, 1.0, 3.6), (2.1, 0.8, 2.8), (4.2, 0.65, 2.2))):
        dx, dz = math.cos(a), math.sin(a)
        for d in (1, -1):
            pts = ((cx - dx * 0.5 * s, top, cz - dz * 0.5 * s), (cx + dx * 0.5 * s, top, cz + dz * 0.5 * s),
                   (cx + dx * 0.25 * s + 0.5, top + hh, cz + dz * 0.25 * s - 0.2))
            poly(k("glow"), list(pts if d > 0 else pts[::-1]), [(0, 0), (1, 0), (0.5, 1)], HOT if i else SODIUM)
    light(D, cx, top, cz, "amber", 9.0)
    light(D, cx, top, cz, "red", 4.0)
    steam(cx + 0.6, top + 3.0, cz - 0.2)
    collide(cx - w / 2, cx + w / 2, cz - w / 2, cz + w / 2, top)


# ---------------------------------------------------------------------------
# Pipes and their racks.
# ---------------------------------------------------------------------------
def run(points, r=0.16, col=RUST, segs=None, detail=0, flanges=7.0, valves=False):
    """A pipe through a list of points, each leg run a little past the
    corner so the elbows close: round enough to read as pipe, a flange at
    every joint, a shoe on a sleeper under a low level leg, a valve with
    its hand wheel on the first long one if asked."""
    segs = segs or (16 if r >= 0.2 else 10 if r >= 0.14 else 8)
    col = dull(col)
    valved = not valves
    for a, b_ in zip(points, points[1:]):
        dx, dy, dz = b_[0] - a[0], b_[1] - a[1], b_[2] - a[2]
        ln = math.sqrt(dx * dx + dy * dy + dz * dz)
        if ln < 1e-3:
            continue
        e = r * 0.6 / ln
        pipe(M("steel", detail), (a[0] - dx * e, a[1] - dy * e, a[2] - dz * e), (b_[0] + dx * e, b_[1] + dy * e, b_[2] + dz * e), r, segs=segs, col=col)
        n = int(ln // flanges)
        for i in range(n + 2 if ln > 1.2 else 0):
            t = min(max(i / (n + 1), 0.25 / ln), 1 - 0.25 / ln)
            flange((a[0] + dx * t, a[1] + dy * t, a[2] + dz * t), (dx, dy, dz), r, col)
        level = abs(dy) < 0.01
        if level and a[1] - r < 1.3 and ln > 2.0:
            for i in range(max(1, int(ln // 4.0))):
                t = (i + 0.5) / max(1, int(ln // 4.0))
                px, pz = a[0] + dx * t, a[2] + dz * t
                box(M("concrete", 1), px - 0.22, px + 0.22, GY, a[1] - r, pz - 0.22, pz + 0.22, scale=1.0, col=CONC)
        if level and not valved and ln > 1.6:
            valve((a[0] + dx * 0.5, a[1], a[2] + dz * 0.5), (dx, 0, dz), r, col=shade(col, 0.7))
            valved = True


PIPE_SET = ((-1.1, 0, 0.22, RUST), (-0.5, 0, 0.14, TANK_WHITE), (0.1, 0, 0.18, STEEL_BLUE), (0.8, 0, 0.26, RUST_D),
            (-0.8, 1, 0.16, YELLOW), (0.0, 1, 0.2, TANK_WHITE), (0.9, 1, 0.12, RUST))


def rack(x0, z0, x1, z1, levels=(5.4, 6.9), width=3.0, pipes=PIPE_SET, step=6.0, lamps=True, braced=True):
    """A pipe rack along x or z: bents of two columns and a beam at each
    level, the pipes on them, now and then a lamp under it."""
    along_x = abs(x1 - x0) >= abs(z1 - z0)
    a0, a1 = (min(x0, x1), max(x0, x1)) if along_x else (min(z0, z1), max(z0, z1))
    c0 = z0 if along_x else x0
    n = max(1, round((a1 - a0) / step))
    top = max(levels)
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        for s in (-1, 1):
            px, pz = (a, c0 + s * width / 2) if along_x else (c0 + s * width / 2, a)
            column(px, pz, GY, top, t=0.24)
        for lv in levels:
            if along_x:
                beam(a, c0 - width / 2 - 0.2, a, c0 + width / 2 + 0.2, lv, t=0.2)
            else:
                beam(c0 - width / 2 - 0.2, a, c0 + width / 2 + 0.2, a, lv, t=0.2)
        if braced and i < n and i % 3 == 0:
            a2 = a0 + (a1 - a0) * (i + 1) / n
            for s in (-1, 1):
                if along_x:
                    xbrace(a, c0 + s * width / 2, a2, c0 + s * width / 2, GY + 0.3, min(levels) - 0.3, r=0.05, detail=1)
                else:
                    xbrace(c0 + s * width / 2, a, c0 + s * width / 2, a2, GY + 0.3, min(levels) - 0.3, r=0.05, detail=1)
        if lamps and i % 2 == 1:
            px, pz = (a, c0) if along_x else (c0, a)
            box(k("neon_amber"), px - 0.5, px + 0.5, min(levels) - 0.32, min(levels) - 0.24, pz - 0.07, pz + 0.07, scale=0.5)
            sodium(px, min(levels), pz, 3.2)
    for off, lv, r, col in pipes:
        y = levels[min(lv, len(levels) - 1)] + r
        col = dull(col)
        pa, pb = ((a0 - 0.4, y, c0 + off), (a1 + 0.4, y, c0 + off)) if along_x else ((c0 + off, y, a0 - 0.4), (c0 + off, y, a1 + 0.4))
        pipe(M("steel"), pa, pb, r, segs=10 if r >= 0.18 else 8, col=col)
        nf = max(1, int((a1 - a0) // 18.0))
        for i in range(nf):
            t = (i + 0.3 + 0.4 * ((off * 7.3) % 1.0)) / nf
            flange((pa[0] + (pb[0] - pa[0]) * t, y, pa[2] + (pb[2] - pa[2]) * t), (pb[0] - pa[0], 0, pb[2] - pa[2]), r, col)


# ---------------------------------------------------------------------------
# Sheds.
# ---------------------------------------------------------------------------
def sawtooth(x0, x1, z0, z1, y, n, glaze, r, wall=CREAM, rise=2.6, lit=0.65, tint="concrete", vents=True, power=0.36):
    """A sawtooth roof over a rectangle: n teeth, each a vertical light
    facing `glaze` ("-z" is north) and a slope falling away behind it. Lit
    lights glow (some bays dark) and pool on the slope in front of them."""
    ridge_x = glaze in ("-z", "+z")
    sgn = 1 if glaze in ("-z", "-x") else -1
    v0 = (z0 if sgn > 0 else z1) if ridge_x else (x0 if sgn > 0 else x1)
    u0, u1 = (x0, x1) if ridge_x else (z0, z1)
    span = (z1 - z0) if ridge_x else (x1 - x0)
    d = span / n
    W = (lambda u, h, v: (u, h, v0 + sgn * v)) if ridge_x else (lambda u, h, v: (v0 + sgn * v, h, u))  # noqa: E731
    gn = (0, 0, -sgn) if ridge_x else (-sgn, 0, 0)       # the glazing's normal
    bays = max(1, round((u1 - u0) / 2.6))
    tint_i = B.TINTS[tint]
    for i in range(n):
        a, b_ = i * d, (i + 1) * d
        on = r.random() < lit
        # The light: a band of panes the length of the ridge, each tooth a
        # floor of its own to the window shader (lit right along, in part,
        # or dark), warm with the shed's lamps.
        frac = r.uniform(0.6, 0.95) if on else r.uniform(0.05, 0.3)
        vo, wq = lit_floor(4, r.uniform(0.55, 1.0), r, busy=on)
        col = B.wall_col(frac, 4, wq, tint_i)
        pts = (W(u0, y + 0.25, a), W(u1, y + 0.25, a), W(u1, y + rise - 0.12, a), W(u0, y + rise - 0.12, a))
        quad_n(k("facade"), pts, gn, col, uvs=((0, vo), (bays, vo), (bays, vo + 1), (0, vo + 1)))
        if on:
            pa, pb = W(u0 + 1.0, y, a - 1.9), W(u1 - 1.0, y, a - 1.9)
            wash(min(pa[0], pb[0]), max(pa[0], pb[0]), min(pa[2], pb[2]), max(pa[2], pb[2]), level=power, hue="amber", r=r, y=y)
        # Its sill and head, the slope behind, the gable ends, the gutter.
        for (ya, yb) in ((y, y + 0.25), (y + rise - 0.12, y + rise)):
            quad_n(k("metal"), (W(u0, ya, a), W(u1, ya, a), W(u1, yb, a), W(u0, yb, a)), gn)
        quad_n(M("cladding"), (W(u0, y + rise, a), W(u1, y + rise, a), W(u1, y, b_), W(u0, y, b_)), (0, 1, 0), shade(SHEET, r.uniform(0.85, 1.1)))
        for ue, s in ((u0, -1), (u1, 1)):
            en = (s, 0, 0) if ridge_x else (0, 0, s)
            tri_n(M("cladding"), (W(ue, y, a), W(ue, y + rise, a), W(ue, y, b_)), en, wall)
        g0, g1 = W(u0, y, b_ - 0.2), W(u1, y + 0.14, b_ + 0.2)
        box(k("dark", 1), min(g0[0], g1[0]), max(g0[0], g1[0]), y, y + 0.14, min(g0[2], g1[2]), max(g0[2], g1[2]), scale=1.0)
        if vents:
            nv = max(1, int((u1 - u0) / 22.0))
            for j in range(nv):
                vx, vy, vz = W(u0 + (u1 - u0) * (j + 0.5) / nv + r.uniform(-2, 2), y + rise * 0.5, a + d * 0.5)
                roof_vent(vx, vy - 0.1, vz, r)
    B.ROOFS.append((D, x0, x1, z0, z1, y + rise))


def skylight(x0, x1, z0, z1, y, tone, h=0.55, power=0.0, hue="amber", r=None):
    """A rooflight: a low kerb and its glazed lid (the site draws its bars
    and panes, each lit to its own level); `tone` None for one gone dark."""
    box(k("metal"), x0, x1, y, y + h, z0, z1, scale=1.0)
    yy = y + h + 0.01
    quad(k("skylight" if tone is not None else "glass_dark"), (x0 + 0.1, yy, z1 - 0.1), (x1 - 0.1, yy, z1 - 0.1), (x1 - 0.1, yy, z0 + 0.1), (x0 + 0.1, yy, z0 + 0.1))
    if tone is not None and power:
        light(D, (x0 + x1) / 2, y, z1 + 1.0, hue, power)


def roof_vent(x, y, z, r, kinds=4):
    """One of a roof's vents: a mushroom, a flue under a cowl, a louvred
    box, a turbine."""
    kind = r.randrange(kinds)
    if kind == 0:
        cylinder(k("metal", 1), x, z, y, y + 0.45, 0.16, segs=8, cap=False)
        cylinder(k("metal", 1), x, z, y + 0.45, y + 0.6, 0.36, segs=8)
    elif kind == 1:
        hgt = r.uniform(1.5, 2.4)
        cylinder(M("steel", 1), x, z, y, y + hgt, 0.14, segs=8, col=shade(GREY, 0.6), cap=False)
        cylinder(M("steel", 1), x, z, y + hgt + 0.1, y + hgt + 0.18, 0.3, segs=8, col=shade(GREY, 0.45))
    elif kind == 2:
        box(k("door_panel", 1), x - 0.6, x + 0.6, y, y + 0.8, z - 0.45, z + 0.45, scale=0.6)
        box(k("dark", 1), x - 0.68, x + 0.68, y + 0.8, y + 0.88, z - 0.53, z + 0.53, scale=1.0)
    else:
        P.place("vent_turb", x, y, z, district=D)


def saw_dress(x0, x1, z0, z1, y, n, glaze, r, rise=2.6, walk=0.55, lamps=None):
    """What a sawtooth roof carries: a grated walkway on legs across its
    teeth, railed, a cable tray beside it; a duct lying in a valley to a
    fan unit; air units on frames by the walkway; rooflights let into
    the slopes; flues under cowls on the ridges."""
    ridge_x = glaze in ("-z", "+z")
    sgn = 1 if glaze in ("-z", "-x") else -1
    v0 = (z0 if sgn > 0 else z1) if ridge_x else (x0 if sgn > 0 else x1)
    u0, u1 = (x0, x1) if ridge_x else (z0, z1)
    span = (z1 - z0) if ridge_x else (x1 - x0)
    d = span / n
    W = (lambda u, h, v: (u, h, v0 + sgn * v)) if ridge_x else (lambda u, h, v: (v0 + sgn * v, h, u))  # noqa: E731

    def wbox(key, ua, ub, ya, yb, va, vb, **kw):
        p, q = W(ua, ya, va), W(ub, yb, vb)
        box(key, min(p[0], q[0]), max(p[0], q[0]), ya, yb, min(p[2], q[2]), max(p[2], q[2]), scale=1.0, **kw)

    uw = u0 + (u1 - u0) * walk
    top = y + rise + 0.35
    pa, pb = W(uw, 0, 0.5), W(uw, 0, span - 0.5)
    catwalk(pa[0], pa[2], pb[0], pb[2], top, w=1.1, lamps=lamps, detail=0)
    wbox(k("dark", 1), uw + 0.7, uw + 0.95, top - 0.3, top - 0.2, 0.5, span - 0.5)
    for i in range(n):
        for du in (-0.5, 0.5):
            wbox(k("metal", 1), uw + du - 0.05, uw + du + 0.05, y + 0.1, top - 0.08, (i + 1) * d - 0.55, (i + 1) * d - 0.45)
        # Rooflights in every other slope, clear of the walkway.
        if i % 2 == 0:
            nb = max(1, int((u1 - u0) / 15.0))
            for j in range(nb):
                uc = u0 + (u1 - u0) * (j + 0.5) / nb + r.uniform(-1.5, 1.5)
                if abs(uc - uw) < 3.6:
                    continue
                ta, tb = 0.3, 0.64
                pts = (W(uc - 1.8, y + rise * (1 - ta) + 0.07, i * d + d * ta), W(uc + 1.8, y + rise * (1 - ta) + 0.07, i * d + d * ta),
                       W(uc + 1.8, y + rise * (1 - tb) + 0.07, i * d + d * tb), W(uc - 1.8, y + rise * (1 - tb) + 0.07, i * d + d * tb))
                quad_n(k("skylight" if r.random() < 0.8 else "glass_dark"), pts, (0, 1, 0))
                rim = (W(uc - 1.98, y + rise * (1 - ta + 0.03) + 0.04, i * d + d * (ta - 0.03)), W(uc + 1.98, y + rise * (1 - ta + 0.03) + 0.04, i * d + d * (ta - 0.03)),
                       W(uc + 1.98, y + rise * (1 - tb - 0.03) + 0.04, i * d + d * (tb + 0.03)), W(uc - 1.98, y + rise * (1 - tb - 0.03) + 0.04, i * d + d * (tb + 0.03)))
                quad_n(k("dark", 1), rim, (0, 1, 0))
        # A flue on a ridge now and then.
        if i % 3 == 1:
            fx, fy, fz = W(u0 + (u1 - u0) * r.uniform(0.12, 0.4), y + rise * 0.8, i * d + d * 0.2)
            roof_vent(fx, fy - 0.2, fz, r, kinds=2)
    # Air units on frames in the valleys beside the walkway.
    for i in range(1, n, 2):
        ax, _, az = W(uw + 2.6, 0, i * d - 1.0)
        wbox(k("metal", 1), uw + 1.7, uw + 3.5, y + 0.5, y + 0.6, i * d - 1.9, i * d - 0.1, bottom=True)
        P.place("ac_roof", ax, y + 0.6, az, 0.0 if ridge_x else math.pi / 2, district=D)
    # The duct in a middle valley, jointed, to its fan unit.
    iv = max(1, n // 2)
    ua, ub = u0 + 3.0, uw - 2.0
    if ub - ua > 6.0:
        wbox(k("metal"), ua, ub, y + 0.75, y + 1.55, iv * d - 1.6, iv * d - 0.7, bottom=True)
        uj = ua + 2.0
        while uj < ub - 1.0:
            wbox(k("dark", 1), uj - 0.05, uj + 0.05, y + 0.71, y + 1.59, iv * d - 1.64, iv * d - 0.66, bottom=True)
            uj += 3.0
        wbox(k("door_panel"), ua - 2.0, ua, y + 0.4, y + 2.1, iv * d - 2.1, iv * d - 0.2, bottom=True)
        lx, _, lz = W(ua - 1.0, 0, iv * d - 1.15)
        box(k("glow"), lx - 0.1, lx + 0.1, y + 2.1, y + 2.3, lz - 0.1, lz + 0.1, scale=0.5, col=GLOW["red"])


def flat_roof(x0, x1, z0, z1, y, r, wall=CREAM, parapet=0.8, lights=0.6, plant=True, breathe=0, strips=True, keep=None):
    """A shed's flat roof, worked: its parapet, long rooflights across it
    in rows (most lit, each throwing its light on the roof beside it), a
    walkway of pale slabs down one edge to a stair hut with its door lit, a
    fan house with a duct and air units, a pipe on sleepers, red lamps at
    the corners, a stub that steams. `keep`: a rectangle (x0, x1, z0, z1)
    left clear (a pad)."""
    quad(k("roof"), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0),
         uvs=((0, 0), ((x1 - x0) / 4, 0), ((x1 - x0) / 4, (z1 - z0) / 4), (0, (z1 - z0) / 4)))
    B.ROOFS.append((D, x0, x1, z0, z1, y))
    t = 0.3
    if parapet:
        for (a0, a1, b0, b1) in ((x0, x1, z1 - t, z1), (x0, x1, z0, z0 + t), (x0, x0 + t, z0 + t, z1 - t), (x1 - t, x1, z0 + t, z1 - t)):
            box(M("cladding"), a0, a1, y, y + parapet, b0, b1, scale=1.5, col=shade(wall, 0.8))
        for cx_, cz_ in ((x0 + 0.15, z0 + 0.15), (x1 - 0.15, z0 + 0.15), (x0 + 0.15, z1 - 0.15), (x1 - 0.15, z1 - 0.15)):
            box(k("glow"), cx_ - 0.1, cx_ + 0.1, y + parapet, y + parapet + 0.22, cz_ - 0.1, cz_ + 0.1, scale=0.5, col=GLOW["red"])
    w, d = x1 - x0, z1 - z0
    long_x = w >= d
    length, span = (w, d) if long_x else (d, w)
    # L(a, c): a point a along the long side, c across.
    L = (lambda a_, c_: (x0 + a_, z0 + c_)) if long_x else (lambda a_, c_: (x0 + c_, z0 + a_))  # noqa: E731

    def rect(a0, a1, c0, c1):
        p, q = L(a0, c0), L(a1, c1)
        return min(p[0], q[0]), max(p[0], q[0]), min(p[1], q[1]), max(p[1], q[1])

    def clear(xa, xb, za, zb):
        return keep is None or xb < keep[0] or xa > keep[1] or zb < keep[2] or za > keep[3]

    n = max(1, int(length / 7.5))
    pitch = length / n
    m = 2.6
    if strips and span > 9.0:
        for i in range(n):
            if r.random() < 0.14:
                continue
            ac = (i + 0.5) * pitch
            xa, xb, za, zb = rect(ac - 1.25, ac + 1.25, m, span - m)
            if not clear(xa, xb, za, zb):
                continue
            tone = r.choice((LID_WARM, LID_WARM, LID_COOL, LID_GREEN)) if r.random() < lights else None
            skylight(xa, xb, za, zb, y, shade(tone, r.uniform(0.3, 0.5)) if tone else None, r=r)
            if tone:
                xa, xb, za, zb = rect(ac + 2.2, ac + 2.2, m, span - m)
                wash(xa, xb, za, zb, level=0.35, hue="amber" if tone == LID_WARM else "white", r=r, y=y)
    # The walkway down one edge, and the stair hut it leads to.
    xa, xb, za, zb = rect(1.0, length - 1.0, 1.0, 1.7)
    if clear(xa, xb, za, zb):
        quad(k("trim", 1), (xa, y + 0.03, zb), (xb, y + 0.03, zb), (xb, y + 0.03, za), (xa, y + 0.03, za), col=c(0.2, 0.2, 0.22))
    hx, hz = L(length - pitch * 0.5 - 2.4 if n > 1 else length * 0.8, 3.4)
    if span > 10.0 and clear(hx - 1.6, hx + 1.6, hz - 1.6, hz + 1.6):
        box(k("trim"), hx - 1.5, hx + 1.5, y, y + 2.5, hz - 1.3, hz + 1.3, scale=1.5, col=shade(wall, 0.8))
        box(k("dark", 1), hx - 1.6, hx + 1.6, y + 2.5, y + 2.62, hz - 1.4, hz + 1.4, scale=1.0)
        dn = (0, 0, -1) if long_x else (-1, 0, 0)
        if long_x:
            quad_n(k("glow"), ((hx - 0.45, y, hz - 1.32), (hx + 0.45, y, hz - 1.32), (hx + 0.45, y + 2.0, hz - 1.32), (hx - 0.45, y + 2.0, hz - 1.32)), dn, shade(SODIUM, 0.6))
            light(D, hx, y, hz - 2.2, "amber", 3.0)
        else:
            quad_n(k("glow"), ((hx - 1.52, y, hz - 0.45), (hx - 1.52, y, hz + 0.45), (hx - 1.52, y + 2.0, hz + 0.45), (hx - 1.52, y + 2.0, hz - 0.45)), dn, shade(SODIUM, 0.6))
            light(D, hx - 2.4, y, hz, "amber", 3.0)
    if plant and span > 9.0:
        # A fan house in the first gap between rooflights, its duct across
        # the roof, air units beside it.
        ac = pitch if n > 1 else length * 0.3
        fx, fz = L(ac, span * 0.3)
        if clear(fx - 2.5, fx + 2.5, fz - 2.5, fz + 2.5):
            hw, hd = (1.3, 2.0) if long_x else (2.0, 1.3)
            box(k("metal"), fx - hw, fx + hw, y, y + 2.3, fz - hd, fz + hd, scale=1.0)
            box(k("glow"), fx - 0.12, fx + 0.12, y + 2.3, y + 2.5, fz - 0.12, fz + 0.12, scale=0.5, col=GLOW["red"])
            xa, xb, za, zb = rect(ac - 0.42, ac + 0.42, span * 0.3 + 2.0, span * 0.78)
            if clear(xa, xb, za, zb):
                box(k("metal", 1), xa, xb, y + 0.5, y + 1.3, za, zb, scale=1.0)
                for t in (0.2, 0.5, 0.8):
                    if (xb - xa) > (zb - za):
                        box(k("dark", 1), xa + (xb - xa) * t - 0.05, xa + (xb - xa) * t + 0.05, y + 0.46, y + 1.34, za - 0.04, zb + 0.04, scale=1.0)
                    else:
                        box(k("dark", 1), xa - 0.04, xb + 0.04, y + 0.46, y + 1.34, za + (zb - za) * t - 0.05, za + (zb - za) * t + 0.05, scale=1.0)
            for n_ in range(r.randrange(2, 5)):
                px, pz = L(ac + (1.2 if n_ % 2 else -1.2), span * 0.3 - 3.2 - (n_ // 2) * 1.9)
                if x0 + 1.0 < px < x1 - 1.0 and z0 + 1.0 < pz < z1 - 1.0 and clear(px - 1, px + 1, pz - 1, pz + 1):
                    P.place("ac_roof", px, y, pz, 0.0 if long_x else math.pi / 2, district=D)
    for _ in range(breathe):
        for _try in range(6):
            sx, sz = L(pitch * (r.randrange(0, n) if n > 1 else 0.5) + (0.0 if n > 1 else 0.0), span * r.uniform(0.25, 0.8))
            sx, sz = min(x1 - 1.5, max(x0 + 1.5, sx)), min(z1 - 1.5, max(z0 + 1.5, sz))
            if clear(sx - 1, sx + 1, sz - 1, sz + 1):
                cylinder(k("metal"), sx, sz, y, y + 1.8, 0.32, segs=10)
                cylinder(k("metal", 1), sx, sz, y + 1.9, y + 1.98, 0.58, segs=10)
                steam(sx, y + 2.0, sz)
                break
    # A pipe run down the other edge on sleepers.
    pa, pb = L(1.5, span - 1.4), L(length - 1.5, span - 1.4)
    if clear(min(pa[0], pb[0]), max(pa[0], pb[0]), min(pa[1], pb[1]), max(pa[1], pb[1])):
        pipe(k("trim", 1), (pa[0], y + 0.35, pa[1]), (pb[0], y + 0.35, pb[1]), 0.11, segs=5, col=RUST)
        pa, pb = L(1.5, span - 1.9), L(length * 0.6, span - 1.9)
        pipe(k("trim", 1), (pa[0], y + 0.3, pa[1]), (pb[0], y + 0.3, pb[1]), 0.07, segs=5, col=YELLOW)
    # A rail down the walkway's inner edge; between the rooflights, vents
    # of several kinds; on a big roof a tank.
    wa, wb = L(1.0, 1.78), L(length - 1.0, 1.78)
    if clear(min(wa[0], wb[0]), max(wa[0], wb[0]), min(wa[1], wb[1]), max(wa[1], wb[1])):
        rail((wa[0], y, wa[1]), (wb[0], y, wb[1]), detail=1, posts=2.4)
    if n > 1 and span > 9.0:
        for i in range(1, n):
            vx, vz = L(pitch * i + r.uniform(-0.7, 0.7), span * r.uniform(0.82, 0.9) - 1.0)
            if clear(vx - 0.8, vx + 0.8, vz - 0.8, vz + 0.8):
                roof_vent(vx, y, vz, r)
        if span > 14.0 and n > 2:
            tx_, tz_ = L(pitch * (n - 1), span * 0.56)
            if clear(tx_ - 1.6, tx_ + 1.6, tz_ - 1.6, tz_ + 1.6):
                P.place("tank_roof", tx_, y, tz_, r.uniform(0, 6.28), district=D)


def av_pad(cx, cz, y, rad=6.0):
    """A landing pad painted on a roof: a ring and a cross in yellow, lamps
    round it, green and amber."""
    n = 20
    for i in range(n):
        a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
        pts = [(cx + rr * math.cos(a), y + 0.03, cz + rr * math.sin(a)) for rr, a in ((rad, a0), (rad, a1), (rad - 0.45, a1), (rad - 0.45, a0))]
        quad_n(k("trim"), pts, (0, 1, 0), YELLOW)
    for (hx, hz) in ((rad * 0.5, 0.28), (0.28, rad * 0.5)):
        quad(k("trim"), (cx - hx, y + 0.03, cz + hz), (cx + hx, y + 0.03, cz + hz), (cx + hx, y + 0.03, cz - hz), (cx - hx, y + 0.03, cz - hz), col=TANK_WHITE)
    for i in range(8):
        a = i * math.tau / 8 + 0.2
        px, pz = cx + (rad + 0.6) * math.cos(a), cz + (rad + 0.6) * math.sin(a)
        box(k("glow"), px - 0.12, px + 0.12, y, y + 0.2, pz - 0.12, pz + 0.12, scale=0.5, col=GLOW["green" if i % 2 else "amber"])
    wash(cx - rad * 0.6, cx + rad * 0.6, cz - rad * 0.6, cz + rad * 0.6, level=0.45, hue="white", y=y, step=5.0)


def wall_lamp(f, s, y, power=5.5, hue="amber"):
    """A wall pack over a door or along a wall, pooling on the ground."""
    px, py, pz = f.p(f.at(s), y, 0.0)
    P.place("wall_pack", px, py, pz, f.yaw, district=D)
    lx, ly, lz = f.p(f.at(s), y, 1.3)
    sodium(lx, ly, lz, power, hue=hue)


def dock(f, s, r, no=None, w=3.2, h=3.8, sill=1.25, state="shut", lamp=True, eave=99.0):
    """A loading door in face f, centred s from its left edge: the shutter
    (down, half up or open on the lit shed), its yellow jambs, bumpers,
    its number, a wall pack over it."""
    y0 = GY + sill
    h = min(h, eave - y0 - 0.9)
    a, b_ = s - w / 2, s + w / 2
    if state == "shut":
        f.quad(k("door_panel"), a, b_, y0, y0 + h, 0.04)
    else:
        up = 0.45 if state == "half" else 0.86
        # The shed inside, lit: a warm depth with the racking's shadows.
        f.quad(k("glow"), a, b_, y0, y0 + h * up, 0.03, col=shade(GLASS_WARM, r.uniform(0.42, 0.6)))
        top = y0 + h * up
        for e in (a + 0.45, b_ - 0.55):
            f.quad(k("dark", 1), e, e + 0.1, y0, top, 0.045)
        ys = y0 + 0.05
        while ys < top - 0.5:
            f.quad(k("dark", 1), a + 0.3, b_ - 0.3, ys, ys + 0.07, 0.045)
            sa = a + 0.6
            while sa < b_ - 1.2:
                bw_ = r.uniform(0.45, 0.95)
                if r.random() < 0.7:
                    f.quad(k("dark", 1), sa, sa + bw_, ys + 0.07, min(top, ys + 0.07 + r.uniform(0.35, 0.8)), 0.045)
                sa += bw_ + r.uniform(0.08, 0.3)
            ys += 1.15
        f.quad(k("door_panel"), a, b_, y0 + h * up, y0 + h, 0.05)
        lx, ly, lz = f.p(f.at(s), y0, 1.6)
        sodium(lx, ly, lz, 5.0)
    for e in (a - 0.14, b_):
        f.box(k("hazard", 1), e, e + 0.14, y0, y0 + h, 0.0, 0.1)
    f.box(k("dark", 1), a - 0.2, b_ + 0.2, y0 + h, y0 + h + 0.3, 0.0, 0.16)
    if sill > 0.5:
        for e in (a + 0.15, b_ - 0.55):
            f.box(k("dark", 1), e, e + 0.4, y0 - 0.55, y0 - 0.05, 0.0, 0.18)
    if no is not None and y0 + h + 1.3 < eave:
        cx, cy, cz = f.p(f.at(s), y0 + h + 0.85, 0.0)
        digits(f"{no:02d}", cx, cy, cz, 0.62, f.yaw, k("trim", 1), TANK_WHITE, out=0.05)
    if lamp:
        wall_lamp(f, s, min(y0 + h + 1.5, eave - 0.35))


def docks(f, r, s0, s1, n, eave, first=1, raised=True, canopy=True, open_=(), half=(), people=True):
    """A row of dock doors along a face between s0 and s1: a raised
    platform with steps at its ends (or doors at grade), a canopy over it
    with tubes under, trailers backed up to some."""
    sill = 1.25 if raised else 0.0
    h = 3.8 if raised else 4.4
    step = (s1 - s0) / n
    for i in range(n):
        st = "open" if i in open_ else ("half" if i in half else "shut")
        dock(f, s0 + (i + 0.5) * step, r, no=first + i, sill=sill, h=h, state=st, eave=eave)
    if raised:
        f.box(M("concrete"), s0 - 1.0, s1 + 1.0, GY, GY + sill, 0.0, 2.6, scale=1.5, col=CONC)
        f.box(k("hazard", 1), s0 - 1.0, s1 + 1.0, GY + sill - 0.12, GY + sill, 2.6, 2.63)
        # Steps up to it at each end.
        for q in range(3):
            hq = GY + sill * (3 - q) / 4
            f.box(k("concrete", 1), s0 - 1.0 - 0.4 * (q + 1), s0 - 1.0 - 0.4 * q, GY, hq, 0.0, 1.4)
            f.box(k("concrete", 1), s1 + 1.0 + 0.4 * q, s1 + 1.0 + 0.4 * (q + 1), GY, hq, 0.0, 1.4)
    if canopy:
        cy = GY + sill + h + 2.1
        cy = min(cy, eave - 0.4)
        f.box(k("metal"), s0 - 1.2, s1 + 1.2, cy, cy + 0.22, 0.0, 3.4)
        f.box(k("hazard", 1), s0 - 1.2, s1 + 1.2, cy, cy + 0.22, 3.4, 3.43)
        m = max(1, int((s1 - s0) / 8.0))
        for i in range(m):
            s = s0 + (s1 - s0) * (i + 0.5) / m
            f.box(k("neon_amber"), s - 0.9, s + 0.9, cy - 0.09, cy - 0.02, 2.2, 2.34)
            lx, ly, lz = f.p(f.at(s), cy, 2.4)
            sodium(lx, ly, lz, 3.0)
    if people and raised:
        return GY + sill
    return GY


def wall_dress(f, r, eave, col, s0=0.0, s1=None, lamps=11.0, doors=True, posters=0.0, pipes=True, cabinets=True):
    """What a shed's wall carries between its doors: pilasters every bay,
    wall packs, a fire door with a green lamp, louvres, a cabinet with its
    warning sign, downpipes, a pipe pair on brackets, a poster board."""
    s1 = f.width if s1 is None else s1
    w = s1 - s0
    if w < 3.0:
        return
    nb = max(1, round(w / 6.0))
    for i in range(nb + 1):
        s = s0 + w * i / nb
        f.box(M("steel"), s - 0.16, s + 0.16, GY, eave, 0.0, 0.16, col=shade(col, 0.62))
        if i % 3 == 1:
            px, py, pz = f.p(f.at(s + 0.4), GY, 0.0)
            P.place("pipe_v", px, py, pz, f.yaw, sy=eave - GY, district=D)
    s = s0 + r.uniform(3.0, 6.0)
    while s < s1 - 2.0:
        wall_lamp(f, s, min(eave - 1.0, 5.2))
        s += lamps * r.uniform(0.8, 1.25)
    s = s0 + r.uniform(4.0, 9.0)
    while s < s1 - 4.0:
        roll = r.random()
        if roll < 0.3 and doors:
            f.quad(k("door"), s, s + 1.1, GY, GY + 2.25, 0.03)
            f.box(k("metal", 1), s - 0.08, s + 1.18, GY + 2.25, GY + 2.35, 0.0, 0.14)
            f.box(k("neon_green", 0), s + 0.2, s + 0.9, GY + 2.5, GY + 2.62, 0.04, 0.1)
            lx, ly, lz = f.p(f.at(s + 0.55), GY + 2.4, 0.9)
            light(D, lx, ly, lz, "green", 1.6)
        elif roll < 0.55:
            y = r.uniform(3.2, max(3.3, eave - 2.6))
            f.quad(k("door_panel", 1), s, s + 1.8, y, y + 1.1, 0.04)
            f.box(k("dark", 1), s - 0.06, s + 1.86, y - 0.06, y, 0.0, 0.1)
        elif roll < 0.75 and cabinets:
            f.box(k("metal"), s, s + 1.3, GY, GY + 1.7, 0.0, 0.45)
            f.box(k("glow"), s + 0.15, s + 0.25, GY + 1.3, GY + 1.4, 0.45, 0.46, col=GLOW["green" if r.random() < 0.6 else "red"])
            px, py, pz = f.p(f.at(s + 0.65), GY + 1.9, 0.03)
            P.place("warning_tri", px, py, pz, f.yaw, district=D)
        elif roll < 0.75 + posters and s + 4.2 < s1:
            cx, cy, cz = f.p(f.at(s + 1.8), GY + 2.9, 0.2)
            B.billboard(D, cx, cy, cz, 3.2, 2.2, f.yaw, r, back=False, depth=0.14)
        else:
            px, py, pz = f.p(f.at(s), r.uniform(3.4, max(3.5, eave - 2.0)), 0.0)
            P.place("ac_wall", px, py, pz, f.yaw, district=D)
        s += r.uniform(5.0, 10.0)
    if pipes and w > 14:
        y = GY + r.uniform(2.9, 3.3)
        a, b_ = f.p(f.at(s0 + 1.0), y, 0.32), f.p(f.at(s1 - 1.0), y, 0.32)
        pipe(k("trim", 1), a, b_, 0.09, segs=5, col=RUST)
        a, b_ = f.p(f.at(s0 + 1.0), y + 0.3, 0.3), f.p(f.at(s1 - 1.0), y + 0.3, 0.3)
        pipe(k("trim", 1), a, b_, 0.06, segs=5, col=YELLOW)


def window_band(f, y0, y1, r, s0=0.0, s1=None, style=5, lit=(0.25, 0.6), warmth=(0.5, 1.0), tint="concrete", bay=CELL_W):
    """A band of windows in a wall: the facade shader's panes, one storey's
    worth squeezed into the band."""
    s1 = f.width if s1 is None else s1
    n = max(1, round((s1 - s0) / bay))
    col = B.wall_col(r.uniform(*lit), style, r.uniform(*warmth), B.TINTS[tint])
    f.quad(k("facade"), s0, s1, y0, y1, 0.0, uvs=((0, 0), (n, 0), (n, 1), (0, 1)), col=col)


def shed(x0, x1, z0, z1, eave, col, r, faces=None, plinth=1.0, tint="concrete", stripe_col=None):
    """A shed's walls. `faces`: for each of "+x", "-x", "+z", "-z" a dict:
    band=(y0, y1) a window band (style, lit), docks=dict(...) a dock row,
    office=True a ground floor of office windows and a door, dress=False to
    leave it bare, hidden=True not to build it at all."""
    faces = faces or {}
    fs = B.faces_of(x0, x1, z0, z1)
    out = {}
    for name, f in fs.items():
        spec = faces.get(name, {})
        if spec.get("hidden"):
            continue
        w = f.width
        f.quad(M("concrete"), 0.0, w, 0.0, GY + plinth, 0.0, uvs=((0, 0), (w / 3.0, 0), (w / 3.0, (GY + plinth) / 3.0), (0, (GY + plinth) / 3.0)), col=CONC)
        cuts = [GY + plinth, eave]
        band = spec.get("band")
        office = spec.get("office")
        if band:
            cuts = [GY + plinth, band[0], band[1], eave]
        for j in range(0, len(cuts) - 1, 2 if band else 1):
            if cuts[j + 1] - cuts[j] > 0.02:
                f.quad(M("cladding"), 0.0, w, cuts[j], cuts[j + 1], 0.0, col=col)
        if band:
            window_band(f, band[0], band[1], r, style=spec.get("style", 5), lit=spec.get("lit", (0.25, 0.6)), tint=tint)
        if stripe_col is not None:
            f.quad(M("cladding"), 0.0, w, eave - 1.1, eave - 0.5, 0.03, col=stripe_col)
        # The eave: a gutter round the top.
        f.box(k("metal"), -0.1, w + 0.1, eave - 0.22, eave + 0.04, 0.0, 0.22)
        d = spec.get("docks")
        used = []
        if d:
            s0_, s1_ = d.get("s0", 3.0), d.get("s1", w - 3.0)
            out[name] = docks(f, r, s0_, s1_, d["n"], eave, first=d.get("first", 1), raised=d.get("raised", True), canopy=d.get("canopy", True),
                              open_=d.get("open", ()), half=d.get("half", ()))
            used.append((s0_ - 2.5, s1_ + 2.5))
        if office:
            o0, o1 = office if isinstance(office, tuple) else (2.0, min(w - 2.0, 26.0))
            vo, wq = lit_floor(4, r.uniform(0.4, 0.9), r)
            nb_ = max(1, round((o1 - o0) / 2.4))
            f.quad(k("facade"), o0, o1, GY + 1.0, GY + 3.2, 0.03, uvs=((0, vo), (nb_, vo), (nb_, vo + 1), (0, vo + 1)),
                   col=B.wall_col(r.uniform(0.7, 0.95), 4, wq, B.TINTS[tint]))
            lx, ly, lz = f.p(f.at((o0 + o1) / 2), 1.0, 1.6)
            wash(min(f.p(f.at(o0), 0, 1.6)[0], f.p(f.at(o1), 0, 1.6)[0]), max(f.p(f.at(o0), 0, 1.6)[0], f.p(f.at(o1), 0, 1.6)[0]),
                 min(f.p(f.at(o0), 0, 1.6)[2], f.p(f.at(o1), 0, 1.6)[2]), max(f.p(f.at(o0), 0, 1.6)[2], f.p(f.at(o1), 0, 1.6)[2]),
                 level=0.5, hue="white", step=5.0)
            ds = o0 + (o1 - o0) * r.uniform(0.3, 0.7)
            f.box(k("trim"), ds - 1.2, ds + 1.2, GY, GY + 3.4, 0.0, 0.12, col=shade(col, 0.5))
            f.quad(k("lobby"), ds - 0.9, ds + 0.9, GY, GY + 2.5, 0.13, col=(r.random(), r.random(), 1, 1))
            f.box(k("metal"), ds - 1.8, ds + 1.8, GY + 2.9, GY + 3.05, 0.0, 1.6)
            f.box(k("neon_white"), ds - 1.2, ds + 1.2, GY + 2.86, GY + 2.9, 0.9, 1.0)
            sw, sh = ST_SIZES["pm"]
            cx, cy, cz = f.p(f.at(ds), GY + 4.1, 0.1)
            f.box(k("board_frame"), ds - sw / 2 - 0.08, ds + sw / 2 + 0.08, GY + 4.1 - sh / 2 - 0.08, GY + 4.1 + sh / 2 + 0.08, 0.0, 0.08)
            sign(st_name("pm"), cx, cy, cz, sw, sh, f.yaw, district=D, label=False)
            used.append((o0 - 0.5, o1 + 0.5))
            out[name + "_door"] = f.p(f.at(ds), GY, 1.4)
        if spec.get("dress", True):
            # Dress the stretches the docks and the office leave.
            free, at = [], 0.0
            for a, b_ in sorted(used):
                if a - at > 3.0:
                    free.append((at, a))
                at = max(at, b_)
            if w - at > 3.0:
                free.append((at, w))
            for a, b_ in free:
                wall_dress(f, r, eave, col, a, b_, posters=spec.get("posters", 0.0), doors=spec.get("doors", True))
    collide(x0, x1, z0, z1, eave)
    return out


# ---------------------------------------------------------------------------
# Fences, walls, gates.
# ---------------------------------------------------------------------------
def fence(x0, z0, x1, z1, lamps=None, signs=0.2, r=None):
    """A palisade fence from one point to another, in 3 m panels."""
    ln = math.hypot(x1 - x0, z1 - z0)
    n = max(1, round(ln / 3.0))
    yaw = math.atan2(-(z1 - z0), x1 - x0)
    sc = ln / (n * 3.0)
    r = r or random.Random(int(x0 * 3 + z0 * 5 + x1))
    for i in range(n):
        t = (i + 0.5) / n
        px, pz = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
        P.place("fence_pal", px, GY, pz, yaw, sxz=sc, district=D)
        if r.random() < signs:
            P.place(r.choice(("warning_tri", "haz_diamond", "warn_board", "haz_diamond")), px, GY + 1.3, pz, yaw + (0 if r.random() < 0.5 else math.pi), district=D)


def yard_wall(x0, z0, x1, z1, h=2.8, wire=True, r=None, posters=0.0, face=1):
    """A stained concrete yard wall with piers, wire along its top, and
    boards pasted on its street side (mH2wmyeiIpA@43)."""
    along_x = abs(x1 - x0) >= abs(z1 - z0)
    t = 0.22
    if along_x:
        xa, xb = min(x0, x1), max(x0, x1)
        box(M("concrete"), xa, xb, 0.0, h, z0 - t / 2, z0 + t / 2, scale=2.5, col=CONC)
        n = max(1, round((xb - xa) / 6.0))
        for i in range(n + 1):
            x = xa + (xb - xa) * i / n
            box(k("concrete", 1), x - 0.25, x + 0.25, 0.0, h + 0.2, z0 - 0.22, z0 + 0.22, scale=1.5)
        if wire:
            for dy in (0.25, 0.45):
                both(k("dark", 1), ((xa, h + dy, z0), (xb, h + dy, z0), (xb, h + dy + 0.03, z0), (xa, h + dy + 0.03, z0)))
        if posters and r is not None:
            x = xa + r.uniform(2.0, 6.0)
            while x < xb - 4.5:
                if r.random() < posters:
                    B.billboard(D, x + 1.7, 1.75, z0 + face * (t / 2 + 0.06), 3.0, 2.0, 0.0 if face > 0 else math.pi, r, back=False, depth=0.1)
                x += r.uniform(5.0, 9.0)
        collide(xa, xb, z0 - t / 2, z0 + t / 2, h)
    else:
        za, zb = min(z0, z1), max(z0, z1)
        box(M("concrete"), x0 - t / 2, x0 + t / 2, 0.0, h, za, zb, scale=2.5, col=CONC)
        n = max(1, round((zb - za) / 6.0))
        for i in range(n + 1):
            z = za + (zb - za) * i / n
            box(k("concrete", 1), x0 - 0.22, x0 + 0.22, 0.0, h + 0.2, z - 0.25, z + 0.25, scale=1.5)
        if wire:
            for dy in (0.25, 0.45):
                both(k("dark", 1), ((x0, h + dy, za), (x0, h + dy, zb), (x0, h + dy + 0.03, zb), (x0, h + dy + 0.03, za)))
        if posters and r is not None:
            z = za + r.uniform(2.0, 6.0)
            while z < zb - 4.5:
                if r.random() < posters:
                    B.billboard(D, x0 + face * (t / 2 + 0.06), 1.75, z + 1.7, 3.0, 2.0, math.pi / 2 if face > 0 else -math.pi / 2, r, back=False, depth=0.1)
                z += r.uniform(5.0, 9.0)
        collide(x0 - t / 2, x0 + t / 2, za, zb, h)


def lens(cx, y, cz, w, d, yaw, key=None, col=(1, 1, 1, 1), h=0.1):
    """A lamp's lens: a slab of light facing down, w across and d along
    `yaw`, its two long edges lit too."""
    key = key or k("neon_amber")
    rx, rz = math.cos(yaw), -math.sin(yaw)
    fx, fz = math.sin(yaw), math.cos(yaw)
    pts = [(cx + rx * a * w / 2 + fx * b_ * d / 2, y, cz + rz * a * w / 2 + fz * b_ * d / 2) for a, b_ in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    quad_n(key, pts, (0, -1, 0), col)
    for (i, j, n) in ((0, 3, (-rx, 0, -rz)), (1, 2, (rx, 0, rz)), (2, 3, (fx, 0, fz)), (0, 1, (-fx, 0, -fz))):
        a, b_ = pts[i], pts[j]
        quad_n(key, (a, b_, (b_[0], y + h, b_[2]), (a[0], y + h, a[2])), n, col)


def totem(x, z, yaw, n=4, scale=1.25, y0=2.5):
    """A gate's directory: a post with small boards one over another, both
    faces painted, a lamp on its head."""
    w, h = ST_SIZES["ps"][0] * scale, ST_SIZES["ps"][1] * scale
    top = y0 + n * (h + 0.22) + 0.2
    rx, rz = math.cos(yaw), -math.sin(yaw)
    for du in (-w * 0.5 - 0.12, w * 0.5 + 0.12):
        px, pz = x + rx * du - math.sin(yaw) * 0.09, z + rz * du - math.cos(yaw) * 0.09
        box(k("metal"), px - 0.07, px + 0.07, GY, top, pz - 0.07, pz + 0.07, scale=0.5)
    for i in range(n):
        board(x, y0 + i * (h + 0.22) + h / 2, z, yaw, "ps", scale, back=True)
    lens(x - math.sin(yaw) * 0.09, top - 0.02, z - math.cos(yaw) * 0.09, w + 0.4, 0.3, yaw)
    sodium(x, top, z, 3.0)


def stencil(f, s, y, text, h=3.0, col=None, wall=CREAM):
    """A shed's number stencilled on its wall, tall enough for a driver,
    over a bar of yellow and black chevrons."""
    cx, cy, cz = f.p(f.at(s), y, 0.0)
    digits(text, cx, cy, cz, h, f.yaw, k("trim", 1), col or shade(wall, 0.3), out=0.05)
    wd = len(text) * h * 0.8
    yb = y - h / 2 - 0.45
    rotated_quad(k("hazard", 1), cx, yb, cz, wd, 0.36, f.yaw, depth=0.05)
    u = -wd / 2 + 0.05
    while u < wd / 2 - 0.3:
        band_quad(k("trim", 1), cx, cz, f.yaw, u, yb - 0.17, u + 0.26, yb + 0.17, 0.12, (0.02, 0.02, 0.022, 1.0), out=0.07)
        u += 0.45


def board(cx, cy, cz, yaw, size="pm", scale=1.0, back=False):
    """One of the street's standard signs in its frame, facing `yaw` (and
    its other face too, a second design)."""
    w, h = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box(k("board_frame"), cx - nx * 0.09, cy, cz - nz * 0.09, w + 0.2, h + 0.2, 0.14, yaw, scale=1.0)
    sid = st_name(size)
    sign(sid, cx, cy, cz, w, h, yaw, district=D, label=False)
    if back:
        sign(sid + "_b", cx - nx * 0.18, cy, cz - nz * 0.18, w, h, yaw + math.pi, district=D, label=False)
    return w, h


def post_sign(x, z, yaw, y=3.4, size="pm", scale=1.0, back=True):
    """A sign on two posts, turned to the street at whatever angle."""
    w, h = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
    rx, rz = math.cos(yaw), -math.sin(yaw)
    for du in (-w * 0.4, w * 0.4):
        px, pz = x + rx * du - math.sin(yaw) * 0.09, z + rz * du - math.cos(yaw) * 0.09
        box(k("metal", 1), px - 0.06, px + 0.06, GY, y - h / 2, pz - 0.06, pz + 0.06, scale=0.5)
    board(x, y, z, yaw, size, scale, back=back)


def roof_sign(cx, top, cz, yaw, sizes=("pm", "pm", "pm"), scale=1.6, lift=1.4, back=False):
    """A row of signs on a steel frame on a roof, turned to the street: the
    frame's legs, its rakers behind, the boards side by side."""
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    ws = [ST_SIZES[z][0] * scale + 0.3 for z in sizes]
    hmax = max(ST_SIZES[z][1] * scale for z in sizes)
    total = sum(ws)
    u = -total / 2
    for z_, w_ in zip(sizes, ws):
        board(cx + rx * (u + w_ / 2), top + lift + hmax / 2, cz + rz * (u + w_ / 2), yaw, z_, scale, back=back)
        u += w_
    n = max(2, round(total / 4.0))
    for i in range(n + 1):
        du = -total / 2 + total * i / n
        px, pz = cx + rx * du - nx * 0.2, cz + rz * du - nz * 0.2
        box(k("metal", 1), px - 0.07, px + 0.07, top, top + lift + hmax, pz - 0.07, pz + 0.07, scale=0.5)
        brace((px, top + lift + hmax * 0.8, pz), (px - nx * 1.8, top, pz - nz * 1.8), r=0.04, mat="metal", detail=1)
    a = (cx - rx * total / 2 - nx * 0.2, top + lift - 0.1, cz - rz * total / 2 - nz * 0.2)
    b_ = (cx + rx * total / 2 - nx * 0.2, top + lift - 0.1, cz + rz * total / 2 - nz * 0.2)
    brace(a, b_, r=0.05, mat="metal", detail=1)


def blade(f, s, y0, size="bl", scale=1.0, out=None):
    """A blade sign standing out from a face, read from both ways along
    the street."""
    w, h = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
    out = (0.4 + w / 2) if out is None else out
    cx, _, cz = f.p(f.at(s), 0.0, out)
    yaw = f.yaw + math.pi / 2
    board(cx, y0 + h / 2, cz, yaw, size, scale, back=True)
    for y in (y0 + 0.3, y0 + h - 0.3):
        f.box(k("metal", 1), s - 0.05, s + 0.05, y, y + 0.08, 0.0, out - w / 2 + 0.1)


def bridge(x0, z0, x1, z1, y=6.6, w=2.2, pipes=((-0.55, 0.3, STEEL_BLUE), (0.25, 0.2, RUST), (0.75, 0.11, YELLOW)), lamps=True):
    """A pipe bridge over a street, along x or z: a trussed box on a
    braced trestle each end, the pipes in it, lamps under it."""
    along_x = abs(x1 - x0) >= abs(z1 - z0)
    a0, a1 = (min(x0, x1), max(x0, x1)) if along_x else (min(z0, z1), max(z0, z1))
    c0 = z0 if along_x else x0
    Pt = (lambda a, yy, c_: (a, yy, c_)) if along_x else (lambda a, yy, c_: (c_, yy, a))  # noqa: E731
    hh = 1.7
    for s_ in (-1, 1):
        cc = c0 + s_ * w / 2
        for yy in (y, y + hh):
            if along_x:
                beam(a0, cc, a1, cc, yy + 0.2, t=0.2)
            else:
                beam(cc, a0, cc, a1, yy + 0.2, t=0.2)
        n = max(2, round((a1 - a0) / 3.4))
        for i in range(n):
            pa, pb = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
            lo, hi = (y + 0.1, y + hh + 0.1) if i % 2 == 0 else (y + hh + 0.1, y + 0.1)
            brace(Pt(pa, lo, cc), Pt(pb, hi, cc), r=0.06)
        for a in (a0, a1):
            px, _, pz = Pt(a, 0, cc)
            column(px, pz, GY, y + hh + 0.2, t=0.26)
    for a in (a0, a1):
        p0, p1 = Pt(a, 0, c0 - w / 2), Pt(a, 0, c0 + w / 2)
        xbrace(p0[0], p0[2], p1[0], p1[2], GY + 0.4, y - 0.3, r=0.06)
    n = max(2, round((a1 - a0) / 3.4))
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        p0, p1 = Pt(a, y + 0.1, c0 - w / 2), Pt(a, y + 0.1, c0 + w / 2)
        brace(p0, p1, r=0.05, detail=1)
    for off, r_, col in pipes:
        pipe(M("steel"), Pt(a0 - 0.3, y + 0.25 + r_, c0 + off), Pt(a1 + 0.3, y + 0.25 + r_, c0 + off), r_, segs=10, col=dull(col))
    if lamps:
        m = max(1, round((a1 - a0) / 9.0))
        for i in range(m):
            a = a0 + (a1 - a0) * (i + 0.5) / m
            px, _, pz = Pt(a, 0, c0)
            box(k("neon_amber"), px - 0.35, px + 0.35, y - 0.14, y - 0.06, pz - 0.35, pz + 0.35, scale=0.5, bottom=True)
        # Its headroom board, striped, on each face.
        for s_ in (-1, 1):
            p0 = Pt((a0 + a1) / 2 - 2.0, y - 0.1, c0 + s_ * (w / 2 + 0.12))
            p1 = Pt((a0 + a1) / 2 + 2.0, y + 0.35, c0 + s_ * (w / 2 + 0.16))
            box(k("hazard", 1), min(p0[0], p1[0]), max(p0[0], p1[0]), y - 0.1, y + 0.35, min(p0[2], p1[2]), max(p0[2], p1[2]), scale=0.6)


def vent(x, z, lit=4.0):
    """A grating in the yard that breathes steam across the pavement."""
    box(k("metal", 1), x - 0.45, x + 0.45, GY, GY + 0.05, z - 0.45, z + 0.45, scale=0.5)
    steam(x, GY + 0.1, z, kind="street", lit=lit, red=0.2)


def low_wall(x0, z0, x1, z1, h=0.9, lamps=3):
    """A low concrete wall with a steel rail on it and piers, a lamp on
    every few: a boundary a walker sees the yard over."""
    along_x = abs(x1 - x0) >= abs(z1 - z0)
    t = 0.3
    a0, a1 = (min(x0, x1), max(x0, x1)) if along_x else (min(z0, z1), max(z0, z1))
    c0 = z0 if along_x else x0
    if along_x:
        box(M("concrete"), a0, a1, 0.0, h, c0 - t / 2, c0 + t / 2, scale=2.0, col=CONC)
        rail((a0, h, c0), (a1, h, c0), h=1.2, detail=0, posts=2.0)
        collide(a0, a1, c0 - t / 2, c0 + t / 2, h + 1.2)
    else:
        box(M("concrete"), c0 - t / 2, c0 + t / 2, 0.0, h, a0, a1, scale=2.0, col=CONC)
        rail((c0, h, a0), (c0, h, a1), h=1.2, detail=0, posts=2.0)
        collide(c0 - t / 2, c0 + t / 2, a0, a1, h + 1.2)
    n = max(1, round((a1 - a0) / 6.0))
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        px, pz = (a, c0) if along_x else (c0, a)
        box(k("concrete", 1), px - 0.28, px + 0.28, 0.0, h + 0.45, pz - 0.28, pz + 0.28, scale=1.5)
        if lamps and i % lamps == 1:
            box(k("neon_amber"), px - 0.16, px + 0.16, h + 0.45, h + 0.62, pz - 0.16, pz + 0.16, scale=0.5)
            sodium(px, h + 0.5, pz, 3.6)


def verge(r, x0, z0, x1, z1, step=10.0, kinds=("hydrant", "bollard", "bollard", "bin", "drum", "bags", "crates", "pallets", "cctv", "barrier", "lamp_short", "blocks", "barrel", "drum_pallet"),
          side=0.0, skip=()):
    """What stands on the strip between the pavement and a yard's fence.
    `skip`: stretches (from, to in metres along it) left clear."""
    ln = math.hypot(x1 - x0, z1 - z0)
    n = max(1, int(ln / step))
    ux, uz = (x1 - x0) / ln, (z1 - z0) / ln
    yaw = math.atan2(-uz, ux)
    for i in range(n):
        t = (i + r.uniform(0.15, 0.85)) / n
        j = r.uniform(-0.4, 0.4) + side
        kind = r.choice(kinds)
        px, pz = x0 + (x1 - x0) * t - uz * j, z0 + (z1 - z0) * t + ux * j
        turn = yaw + (0.0 if kind in ("barrier", "crates") else r.uniform(0, 6.28))
        if any(a - 1.2 < t * ln < b + 1.2 for a, b in skip):
            continue
        P.place(kind, px, GY, pz, turn, district=D)
        if kind == "bollard":
            P.place(kind, px + ux * 1.4, GY, pz + uz * 1.4, 0.0, district=D)
        if kind == "lamp_short":
            sodium(px, 3.6, pz, 4.0)


def tube(x, y, z, yaw, ln=1.5, power=4.0, hue="amber", red=0.2):
    """A tube light hung under a beam or a gantry: its batten, the tube,
    and its pool on the ground below. `yaw`: the way the tube runs is
    across it."""
    oriented_box(k("metal", 1), x, y + 0.05, z, ln + 0.1, 0.06, 0.14, yaw)
    oriented_box(k("neon_amber" if hue == "amber" else "neon_white"), x, y - 0.03, z, ln, 0.07, 0.08, yaw)
    if power:
        sodium(x, y, z, power, red=red if hue == "amber" else 0.0, hue=hue)


def flood(x, z, tx, tz, y=1.1, power=6.5, hue="amber"):
    """A ground flood aimed at what stands at (tx, tz): a stem, its head,
    the lit lens toward its target, and its pool at the target's foot."""
    yaw = math.atan2(tx - x, tz - z)
    box(k("metal"), x - 0.05, x + 0.05, GY, GY + y, z - 0.05, z + 0.05, scale=0.5)
    oriented_box(k("metal"), x, GY + y + 0.18, z, 0.5, 0.36, 0.3, yaw)
    rotated_quad(k("neon_amber" if hue == "amber" else "neon_white"), x, GY + y + 0.18, z, 0.42, 0.28, yaw, depth=0.16)
    d = math.hypot(tx - x, tz - z) or 1.0
    f = min(0.75, 3.2 / d)
    sodium(x + (tx - x) * f, 1.0, z + (tz - z) * f, power, hue=hue)


def weeds(r, x0, z0, x1, z1, n):
    """Weeds along a wall's or a fence's foot, in clumps of one to three."""
    ln = math.hypot(x1 - x0, z1 - z0) or 1.0
    ux, uz = (x1 - x0) / ln, (z1 - z0) / ln
    for _ in range(n):
        t = r.random() * ln
        for _j in range(r.randrange(1, 4)):
            a, c_ = t + r.uniform(-0.5, 0.5), r.uniform(-0.12, 0.12)
            P.place("weed", x0 + ux * a - uz * c_, GY, z0 + uz * a + ux * c_, r.uniform(0, 6.28), sy=r.uniform(0.7, 1.7), sxz=r.uniform(0.8, 1.8), district=D)


def mural(cx, cz, yaw, length, r, y0=0.1, y1=0.84, out=0.16, fill=0.6):
    """Paint along a low wall or a row of barriers, facing yaw: blocks of
    colour crossed with slanted bands, bars and stripes, bare concrete
    between them. What a yard's wall gathers."""
    pal = (OXIDE, YELLOW, STEEL_BLUE, TANK_WHITE, PALE_GREEN, c(0.08, 0.34, 0.36), c(0.42, 0.07, 0.24), c(0.03, 0.03, 0.035))
    ym, hh = (y0 + y1) / 2, y1 - y0
    u = -length / 2 + 0.4
    while u < length / 2 - 1.6:
        w = min(r.uniform(1.4, 4.2), length / 2 - u - 0.2)
        if r.random() < fill:
            a, b_, d_ = r.sample(pal, 3)
            band_quad(k("trim", 1), cx, cz, yaw, u, ym, u + w, ym, hh, a, out=out)
            kind = r.randrange(3)
            if kind == 0:
                band_quad(k("trim", 1), cx, cz, yaw, u + w * 0.2, y0 + 0.04, u + w * 0.45, y1 - 0.04, 0.26, b_, out=out + 0.012)
                band_quad(k("trim", 1), cx, cz, yaw, u + w * 0.5, y0 + 0.04, u + w * 0.75, y1 - 0.04, 0.26, d_, out=out + 0.012)
            elif kind == 1:
                for j in range(3):
                    uu = u + w * (0.2 + 0.25 * j)
                    band_quad(k("trim", 1), cx, cz, yaw, uu, y0 + 0.08, uu, y1 - 0.08, 0.16, b_, out=out + 0.012)
            else:
                band_quad(k("trim", 1), cx, cz, yaw, u + w * 0.15, y0 + hh * 0.3, u + w * 0.85, y0 + hh * 0.3, hh * 0.22, b_, out=out + 0.012)
                band_quad(k("trim", 1), cx, cz, yaw, u + w * 0.3, y0 + hh * 0.7, u + w * 0.7, y0 + hh * 0.7, hh * 0.2, d_, out=out + 0.012)
        u += w + r.uniform(0.3, 2.5)


def jersey(x0, z0, x1, z1, r, paint=0.6):
    """A row of concrete barriers, three metres each on a wide foot, paint
    on both faces of most of them."""
    ln = math.hypot(x1 - x0, z1 - z0)
    n = max(1, int(ln / 3.1))
    yaw = math.atan2(-(z1 - z0), x1 - x0)
    for i in range(n):
        t = (i + 0.5) / n
        cx, cz = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
        oriented_box(M("concrete"), cx, GY + 0.12, cz, 3.0, 0.24, 0.62, yaw, col=CONC)
        oriented_box(M("concrete"), cx, GY + 0.55, cz, 3.0, 0.62, 0.3, yaw, col=CONC)
        if r.random() < paint:
            for fy in (yaw, yaw + math.pi):
                mural(cx, cz, fy, 3.0, r, y0=GY + 0.26, y1=GY + 0.84, out=0.155, fill=1.0)
    collide(min(x0, x1) - 0.3, max(x0, x1) + 0.3, min(z0, z1) - 0.3, max(z0, z1) + 0.3, 1.0)


def crane(cx, cz, yaw, h=11.0, jib=15.0, pitch=0.5, col=YELLOW):
    """A yard crane: a lattice mast, the slewing cab with its window lit,
    a braced jib out over the yard, the hook on its rope, lamps."""
    w = 0.7
    for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        column(cx + sx * w, cz + sz * w, GY, h, t=0.16, mat=MAT["steel"], col=col)
    n = max(3, int(h / 2.6))
    for i in range(n):
        ya, yb = GY + (h - GY) * i / n, GY + (h - GY) * (i + 1) / n
        for (ax, az, bx, bz) in ((-1, -1, 1, -1), (1, -1, 1, 1), (1, 1, -1, 1), (-1, 1, -1, -1)):
            brace((cx + ax * w, ya, cz + az * w), (cx + bx * w, yb, cz + bz * w), r=0.05, mat=MAT["steel"], col=col, detail=1)
    box(M("steel"), cx - 1.4, cx + 1.4, h, h + 0.3, cz - 1.4, cz + 1.4, scale=1.0, col=shade(col, 0.7), bottom=True)
    dx, dz = math.sin(yaw), math.cos(yaw)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    # The cab beside the jib's foot.
    ccx, ccz = cx + rx * 1.1 + dx * 0.4, cz + rz * 1.1 + dz * 0.4
    oriented_box(M("steel"), ccx, h + 1.4, ccz, 1.5, 2.2, 2.0, yaw, scale=1.0, col=shade(col, 0.85))
    rotated_quad(k("glow"), ccx + dx * 1.02, h + 1.7, ccz + dz * 1.02, 1.2, 1.0, yaw, col=shade(GLASS_COOL, 1.5))
    # The jib: two chords and the web between, the counter-jib behind.
    foot = (cx, h + 0.5, cz)
    tip = (cx + dx * jib * math.cos(pitch), h + 0.5 + jib * math.sin(pitch), cz + dz * jib * math.cos(pitch))
    top = (cx, h + 4.2, cz)
    brace(foot, tip, r=0.11, mat=MAT["steel"], col=col)
    brace(top, tip, r=0.05, mat=MAT["steel"], col=col)
    brace(foot, top, r=0.12, mat=MAT["steel"], col=col)
    m = 6
    for i in range(1, m):
        t = i / m
        pb = tuple(foot[q] + (tip[q] - foot[q]) * t for q in range(3))
        brace(pb, (pb[0], pb[1] + 0.9 * (1 - t) + 0.25, pb[2]), r=0.04, mat=MAT["steel"], col=col, detail=1)
    back = (cx - dx * 4.0, h + 1.2, cz - dz * 4.0)
    brace(foot, back, r=0.1, mat=MAT["steel"], col=col)
    brace(top, back, r=0.05, mat=MAT["steel"], col=col)
    oriented_box(M("steel"), back[0], back[1] - 0.6, back[2], 1.6, 1.4, 1.6, yaw, scale=1.0, col=STEEL)
    hook = (tip[0], GY + 4.2, tip[2])
    both(k("dark", 1), ((tip[0] - 0.025, tip[1], tip[2]), (tip[0] + 0.025, tip[1], tip[2]), (hook[0] + 0.025, hook[1], hook[2]), (hook[0] - 0.025, hook[1], hook[2])))
    both(k("dark", 1), ((tip[0], tip[1], tip[2] - 0.025), (tip[0], tip[1], tip[2] + 0.025), (hook[0], hook[1], hook[2] + 0.025), (hook[0], hook[1], hook[2] - 0.025)))
    box(M("steel"), hook[0] - 0.25, hook[0] + 0.25, hook[1] - 0.6, hook[1], hook[2] - 0.2, hook[2] + 0.2, scale=0.5, col=col, bottom=True)
    box(k("glow"), tip[0] - 0.12, tip[0] + 0.12, tip[1] + 0.1, tip[1] + 0.35, tip[2] - 0.12, tip[2] + 0.12, scale=0.5, col=GLOW["red"])
    box(k("glow"), cx - 0.12, cx + 0.12, h + 4.2, h + 4.45, cz - 0.12, cz + 0.12, scale=0.5, col=GLOW["red"])
    box(k("neon_amber"), ccx - 0.5, ccx + 0.5, h + 0.2, h + 0.3, ccz - 0.5, ccz + 0.5, scale=0.5, bottom=True)
    collide(cx - w, cx + w, cz - w, cz + w, h)
    return hook


def gate(x0, z0, x1, z1, inward, open_=True, booth=None, guard=True, lamp="cyan"):
    """A yard gate between two piers: striped piers with a lamp each, the
    sliding leaf (shut across it or run back along the fence), a barrier
    arm, and a booth with its window lit and a guard in it. `inward`: the
    (x, z) direction into the yard."""
    ix, iz = inward
    along_x = abs(x1 - x0) >= abs(z1 - z0)
    for (px, pz) in ((x0, z0), (x1, z1)):
        box(M("concrete"), px - 0.35, px + 0.35, 0.0, 3.0, pz - 0.35, pz + 0.35, scale=1.5, col=CONC)
        box(k("hazard", 1), px - 0.37, px + 0.37, 0.4, 1.3, pz - 0.37, pz + 0.37, scale=1.0)
        box(k("glow"), px - 0.14, px + 0.14, 3.0, 3.25, pz - 0.14, pz + 0.14, scale=0.5, col=GLOW[lamp])
        light(D, px, 3.0, pz, lamp, 2.0)
    ln = math.hypot(x1 - x0, z1 - z0)
    n = max(1, round(ln / 3.0))
    yaw = math.atan2(-(z1 - z0), x1 - x0)
    ux, uz = (x1 - x0) / ln, (z1 - z0) / ln
    # The leaf: across the opening, or slid back past the second pier.
    off = 0.0 if not open_ else ln * 0.92
    for i in range(n):
        t = (i + 0.5) / n
        px, pz = x0 + (x1 - x0) * t + ux * off, z0 + (z1 - z0) * t + uz * off
        P.place("fence_pal", px + ix * 0.5, GY, pz + iz * 0.5, yaw, sxz=ln / (n * 3.0), district=D)
    if open_:
        # The arm, down across the way in, striped.
        ax, az = x0 + ux * 0.6, z0 + uz * 0.6
        bx, bz = x0 + ux * (ln - 0.8), z0 + uz * (ln - 0.8)
        if along_x:
            az += iz * 1.4
            box(k("hazard"), min(ax, bx), max(ax, bx), 1.0, 1.14, az - 0.05, az + 0.05, scale=0.6)
            box(k("metal"), ax - 0.2, ax + 0.2, 0.0, 1.2, az - 0.2, az + 0.2, scale=0.6)
        else:
            ax += ix * 1.4
            box(k("hazard"), ax - 0.05, ax + 0.05, 1.0, 1.14, min(az, bz), max(az, bz), scale=0.6)
            box(k("metal"), ax - 0.2, ax + 0.2, 0.0, 1.2, az - 0.2, az + 0.2, scale=0.6)
    if booth:
        bx, bz, yaw_b = booth
        nx_, nz_ = math.sin(yaw_b), math.cos(yaw_b)
        box(k("trim"), bx - 1.5, bx + 1.5, GY, GY + 2.7, bz - 1.5, bz + 1.5, scale=1.0, col=GREY)
        box(k("metal"), bx - 1.8, bx + 1.8, GY + 2.7, GY + 2.85, bz - 1.8, bz + 1.8, scale=1.0, bottom=True)
        rotated_quad(k("glow"), bx + nx_ * 1.52, GY + 1.75, bz + nz_ * 1.52, 2.2, 1.1, yaw_b, col=shade(GLASS_COOL, 1.3))
        rotated_quad(k("glow"), bx + nz_ * 1.52, GY + 1.75, bz - nx_ * 1.52, 2.0, 1.1, yaw_b + math.pi / 2, col=shade(GLASS_COOL, 1.1))
        rotated_quad(k("glow"), bx - nz_ * 1.52, GY + 1.75, bz + nx_ * 1.52, 2.0, 1.1, yaw_b - math.pi / 2, col=shade(GLASS_COOL, 1.1))
        lx, lz = bx + nx_ * 1.62, bz + nz_ * 1.62
        hx, hz = (1.1, 0.05) if abs(nz_) > abs(nx_) else (0.05, 1.1)
        box(k("neon_white"), lx - hx, lx + hx, GY + 2.6, GY + 2.68, lz - hz, lz + hz, scale=0.5, bottom=True)
        light(D, bx + nx_ * 2.4, 2.0, bz + nz_ * 2.4, "white", 3.5)
        collide(bx - 1.5, bx + 1.5, bz - 1.5, bz + 1.5, 2.85)
        if guard:
            stand(bx + nx_ * 2.1, bz + nz_ * 2.1, yaw_b, "idle", GY)


def poles(points, yaw, can_every=3, r=None, drop=None):
    """Utility poles at the points with wires between them, a transformer
    can on some (JtqIas3bYhg@80). `yaw`: the crossarms' turn (0: arms along
    x, for a line running along z)."""
    prev = None
    for i, (x, z) in enumerate(points):
        P.place("pole_utility", x, GY, z, yaw, district=D)
        if can_every and i % can_every == 1:
            P.place("pole_can", x, GY + 6.1, z, yaw, district=D)
        top = (x, GY + 8.25, z)
        if prev is not None:
            wires(prev, top, yaw, sag=0.75)
            wires(prev, top, yaw, offsets=(-0.9, 0.9), y_off=-0.8, sag=0.95)
        prev = top


# ---------------------------------------------------------------------------
# Trucks: each firm's paint and every lamp a parked truck shows at night,
# laid over the trailer and tractor instances where they stand, and a
# tanker built in place.
# ---------------------------------------------------------------------------
LIVERY = {  # a firm's body colour, its band, and the letters on the band
    "HELCASO": (c(0.70, 0.66, 0.56), OXIDE, c(0.82, 0.79, 0.70)),
    "FESCOL": (c(0.74, 0.78, 0.74), c(0.13, 0.36, 0.25), c(0.84, 0.87, 0.82)),
    "SOLFUCA": (c(0.72, 0.52, 0.10), c(0.045, 0.045, 0.05), c(0.82, 0.62, 0.14)),
    "LUPACO": (c(0.20, 0.32, 0.48), c(0.78, 0.78, 0.72), c(0.10, 0.17, 0.28)),
    "CAPULSA": (c(0.50, 0.12, 0.08), c(0.80, 0.78, 0.70), c(0.46, 0.10, 0.07)),
    "CHAPAS": (c(0.30, 0.34, 0.30), c(0.70, 0.42, 0.08), c(0.07, 0.08, 0.07)),
    "OPALO": (c(0.78, 0.78, 0.74), c(0.80, 0.36, 0.06), c(0.86, 0.84, 0.78)),
}
TAPE_RED, TAPE_WHITE = c(0.62, 0.05, 0.04), c(0.82, 0.82, 0.78)
LAMP_WHITE = c(0.95, 0.92, 0.82)
TYRE = c(0.025, 0.025, 0.03)


class Rig:
    """A parked vehicle's own frame, as a prop's yaw turns it: x toward its
    nose, z across it, y up from the yard."""

    def __init__(self, x, z, yaw, y=GY):
        self.x, self.z, self.yaw, self.y = x, z, yaw, y
        self.c, self.s = math.cos(yaw), math.sin(yaw)

    def at(self, lx, ly, lz):
        return (self.x + self.c * lx + self.s * lz, self.y + ly, self.z - self.s * lx + self.c * lz)

    def side(self, key, sg, x0, x1, y0, y1, col, out=1.335):
        """A panel on a flank (sg 1 its +z one), from x0 to x1."""
        px, py, pz = self.at((x0 + x1) / 2, (y0 + y1) / 2, sg * out)
        rotated_quad(key, px, py, pz, abs(x1 - x0), y1 - y0, self.yaw + (0.0 if sg > 0 else math.pi), col=col)

    def end(self, key, sg, lx, z0, z1, y0, y1, col):
        """A panel across it at lx, facing its nose (sg 1) or its tail."""
        px, py, pz = self.at(lx, (y0 + y1) / 2, (z0 + z1) / 2)
        rotated_quad(key, px, py, pz, abs(z1 - z0), y1 - y0, self.yaw + sg * math.pi / 2, col=col)

    def word(self, sg, text, lx, ly, h, col, key, out=1.35, gap=0.28):
        px, py, pz = self.at(lx, ly, sg * out)
        digits(text, px, py, pz, h, self.yaw + (0.0 if sg > 0 else math.pi), key, col, out=0.0, gap=gap)

    def slash(self, key, sg, x0, y0, x1, y1, wdt, col, out=1.34):
        """A slanted band on a flank, from (x0, y0) to (x1, y1)."""
        px, _, pz = self.at(0.0, 0.0, sg * out)
        band_quad(key, px, pz, self.yaw + (0.0 if sg > 0 else math.pi), sg * x0, self.y + y0, sg * x1, self.y + y1, wdt, col, out=0.0)

    def box(self, key, x0, x1, y0, y1, z0, z1, col):
        px, py, pz = self.at((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
        oriented_box(key, px, py, pz, x1 - x0, y1 - y0, z1 - z0, self.yaw, col=col)

    def wheel(self, key, lx, z0, z1, r=0.52):
        pipe(key, self.at(lx, r, z0), self.at(lx, r, z1), r, segs=10, col=TYRE, caps=True)
        out = z1 if abs(z1) > abs(z0) else z0
        pipe(key, self.at(lx, r, out), self.at(lx, r, out + (0.03 if out > 0 else -0.03)), r * 0.45, segs=6, col=c(0.3, 0.3, 0.31), caps=True)

    def lamp(self, lx, ly, lz, hue, power):
        px, py, pz = self.at(lx, ly, lz)
        light(D, px, py, pz, hue, power)


def tail(g, lx, y, half=1.2):
    """A vehicle's tail at lx: the lamp clusters each end of its bar (red,
    then amber), a plate between them under its own lamp, and their red on
    the ground behind."""
    for sg in (-1, 1):
        g.end(k("glow"), -1, lx, sg * (half - 0.3), sg * half, y, y + 0.14, GLOW["red"])
        g.end(k("glow", 1), -1, lx, sg * (half - 0.52), sg * (half - 0.34), y, y + 0.14, SODIUM)
    g.end(k("trim", 1), -1, lx, -0.26, 0.26, y, y + 0.13, PAINT_WHITE)
    g.end(k("glow", 1), -1, lx, -0.2, 0.2, y + 0.15, y + 0.18, shade(LAMP_WHITE, 0.6))
    g.lamp(lx - 1.3, 0.8, 0.0, "red", 1.5)


def livery(x, z, yaw, firm, y=GY, reefer=False, nose=True, no="27"):
    """A box trailer's paint and lamps, laid over the instance standing at
    the same place and yaw: its sides and doors in the firm's colour, the
    band with the firm's name down each side and a slash of it at the
    tail, its fleet number, marker lamps along both rails and at the top
    corners, red and white tape along the lower rail, a chevron board and
    the tail lamps across the back, and the markers' light on the yard."""
    body, band, ink = LIVERY[firm]
    g = Rig(x, z, yaw, y)
    kc, kt, kd, kg = M("container"), k("trim"), k("trim", 1), k("glow", 1)
    n = len(firm)
    h = min(0.74, 5.6 / (0.8 * n))
    for sg in (1, -1):
        g.side(kc, sg, -6.4, 6.4, 1.42, 3.9, body, out=1.322)
        g.side(kt, sg, -3.4, 6.4, 2.2, 3.26, band, out=1.336)
        g.word(sg, firm, 1.5, 2.73, h, ink, kd, out=1.35)
        for x0 in (-5.5, -4.5):
            g.slash(kt, sg, x0 - 0.5, 1.5, x0 + 0.5, 3.82, 0.5, band, out=1.336)
        g.word(sg, no, 5.5, 3.6, 0.3, band, kd, out=1.336)
        # Tape along the lower rail, marker lamps over it, one at each top corner.
        for i in range(10):
            a = -6.2 + i * 1.26
            g.side(kd, sg, a, a + 0.9, 1.255, 1.315, TAPE_RED if i % 2 else TAPE_WHITE, out=1.345)
        for lx in (-5.9, -3.0, 0.0, 3.0, 5.9):
            g.side(kg, sg, lx - 0.09, lx + 0.09, 1.34, 1.42, SODIUM, out=1.36)
        g.side(kg, sg, 6.05, 6.25, 3.93, 4.0, SODIUM, out=1.345)
        g.side(kg, sg, -6.25, -6.05, 3.93, 4.0, GLOW["red"], out=1.345)
        for lx in (-3.6, 2.6):
            g.lamp(lx, 1.5, sg * 2.2, "amber", 1.5)
    # The doors: the body's colour between the lock rods, a chevron board
    # at their foot, lamps at the top corners, the tail on the underrun bar.
    g.end(kc, -1, -6.475, -1.2, 1.2, 1.42, 3.9, body)
    g.end(k("hazard"), -1, -6.49, -1.2, 1.2, 1.42, 1.78, (1, 1, 1, 1))
    px, _, pz = g.at(-6.503, 0.0, 0.0)
    u = -1.1
    while u < 1.0:
        band_quad(kd, px, pz, yaw - math.pi / 2, u, y + 1.44, u + 0.3, y + 1.76, 0.14, TAPE_RED, out=0.0)
        u += 0.42
    for sg in (-1, 1):
        g.end(kg, -1, -6.49, sg * 0.95, sg * 1.15, 3.9, 3.98, GLOW["red"])
    tail(g, -6.53, 0.49)
    if nose:
        # No tractor on it: the nose's own face and two white markers.
        g.end(kc, 1, 6.412, -1.2, 1.2, 1.42, 3.9, body)
        g.end(kt, 1, 6.426, -1.2, 1.2, 2.2, 3.26, band)
        for sg in (-1, 1):
            g.end(kg, 1, 6.426, sg * 0.95, sg * 1.15, 3.9, 3.98, LAMP_WHITE)
    if reefer:
        # A cold store's trailer: the chiller on its nose, its grille, a lamp.
        g.box(M("steel"), 6.4, 6.86, 2.0, 3.9, -1.0, 1.0, c(0.72, 0.74, 0.72))
        g.end(k("dark", 1), 1, 6.868, -0.8, 0.8, 2.25, 3.1, (1, 1, 1, 1))
        g.end(kg, 1, 6.87, 0.55, 0.75, 3.4, 3.52, GLOW["green"])


def cab_dress(x, z, yaw, firm, lit=False, y=GY, beacon=False):
    """A tractor's paint and lamps over its instance: the firm's stripe and
    name on its doors, markers along the deflector, its headlamps (on, with
    their light down the yard, if `lit`), the cab lit inside, tail lamps."""
    body, band, ink = LIVERY[firm]
    g = Rig(x, z, yaw, y)
    kd, kg = k("trim", 1), k("glow", 1)
    for sg in (1, -1):
        g.side(k("trim"), sg, 0.92, 2.98, 1.12, 1.5, band, out=1.232)
        g.word(sg, firm, 1.95, 1.74, min(0.3, 1.9 / (0.8 * len(firm))), body if sum(body[:3]) > 1.2 else ink, kd, out=1.234)
        g.lamp(1.9, 1.4, sg * 2.0, "amber", 1.2)
    for lz in (-0.9, -0.45, 0.0, 0.45, 0.9):
        g.end(kg, 1, 2.512, lz - 0.07, lz + 0.07, 3.62, 3.7, SODIUM)
    for sg in (-1, 1):
        g.end(k("glow"), 1, 3.145, sg * 0.8, sg * 1.1, 0.6, 0.86, LAMP_WHITE if lit else shade(LAMP_WHITE, 0.16))
        g.end(kg, 1, 3.145, sg * 1.12, sg * 1.22, 0.62, 0.84, SODIUM)
        g.end(kg, -1, -3.01, sg * 0.3, sg * 0.5, 0.92, 1.04, GLOW["red"])
    if lit:
        # Somebody is in it: the cab's lamp behind the glass, the lamps' pool ahead.
        g.end(k("glow"), 1, 3.024, -1.02, 1.02, 2.04, 2.9, shade(GLASS_WARM, 0.36))
        for sg in (1, -1):
            g.side(k("glow"), sg, 1.94, 2.82, 2.04, 2.86, shade(GLASS_WARM, 0.3), out=1.243)
            # A seat's back and headrest against the light, the wheel's rim.
            g.end(k("dark", 1), 1, 3.038, sg * 0.34, sg * 0.82, 2.04, 2.5, (1, 1, 1, 1))
            g.end(k("dark", 1), 1, 3.038, sg * 0.46, sg * 0.7, 2.5, 2.72, (1, 1, 1, 1))
            g.side(k("dark", 1), sg, 2.0, 2.4, 2.04, 2.62, (1, 1, 1, 1), out=1.255)
        g.end(k("dark", 1), 1, 3.038, -1.02, 1.02, 2.04, 2.16, (1, 1, 1, 1))
        g.end(k("dark", 1), 1, 3.038, -0.04, 0.04, 2.04, 2.9, (1, 1, 1, 1))
        g.lamp(6.4, 0.6, 0.0, "white", 5.0)
        g.lamp(10.6, 0.6, 0.0, "white", 2.6)
    if beacon:
        g.box(k("glow"), 1.3, 1.5, 3.75, 3.92, -0.1, 0.1, GLOW["amber"])
        g.lamp(1.4, 3.9, 0.0, "amber", 2.4)


def tanker(x, z, yaw, firm="OPALO", y=GY, legs=False):
    """A road tanker's trailer, built in place (its nose at +x as a
    trailer's is, so a tractor couples at the same yaw): the barrel in the
    firm's white with its bands and name, dished ends, a walkway and three
    lids along its back, a ladder at the tail, the chassis on three axles,
    a valve cabinet at its flank, placards, and every lamp it shows."""
    body, band, ink = LIVERY[firm]
    g = Rig(x, z, yaw, y)
    st, std, kg = M("steel"), M("steel", 1), k("glow", 1)
    R_, CY = 1.16, 2.5
    pipe(M("tank"), g.at(-6.0, CY, 0.0), g.at(5.9, CY, 0.0), R_, segs=18, col=body, caps=True)
    for lx, sg in ((-6.0, -1), (5.9, 1)):
        pipe(M("tank"), g.at(lx, CY, 0.0), g.at(lx + sg * 0.26, CY, 0.0), R_ * 0.8, segs=18, col=shade(body, 0.9), caps=True)
    for lx in (-4.3, -0.1, 4.1):
        pipe(std, g.at(lx - 0.5, CY, 0.0), g.at(lx + 0.5, CY, 0.0), R_ + 0.012, segs=18, col=band)
    for lx in (-2.2, 2.0):
        pipe(std, g.at(lx - 0.05, CY, 0.0), g.at(lx + 0.05, CY, 0.0), R_ + 0.03, segs=18, col=shade(body, 0.5))
    hh = min(0.62, 3.3 / (0.8 * len(firm)))
    for sg in (1, -1):
        g.word(sg, firm, 2.0, CY + 0.05, hh, band, k("trim", 1), out=R_ + 0.03)
        g.word(sg, firm, -2.2, CY + 0.05, hh, band, k("trim", 1), out=R_ + 0.03)
    # Its back: a walkway with a rail one side, three lids, the ladder.
    top = CY + R_
    g.box(std, -5.6, 5.4, top - 0.02, top + 0.05, -0.32, 0.32, c(0.2, 0.21, 0.23))
    rail(g.at(-5.6, top + 0.05, 0.32), g.at(5.4, top + 0.05, 0.32), h=0.7, detail=1, posts=2.2)
    for lx in (-3.6, 0.2, 4.0):
        px, _, pz = g.at(lx, 0.0, -0.05)
        cylinder(std, px, pz, y + top + 0.05, y + top + 0.2, 0.3, segs=8, col=shade(body, 0.6))
    for lz in (-0.22, 0.22):
        pa, pb = g.at(-6.32, 1.0, lz), g.at(-6.32, top + 0.5, lz)
        both(k("metal", 1), ((pa[0], pa[1], pa[2]), (pa[0] + g.s * 0.04, pa[1], pa[2] + g.c * 0.04), (pb[0] + g.s * 0.04, pb[1], pb[2] + g.c * 0.04), (pb[0], pb[1], pb[2])))
    ry = 1.2
    while ry < top + 0.4:
        g.end(k("metal", 1), -1, -6.32, -0.22, 0.22, ry, ry + 0.04, (1, 1, 1, 1))
        ry += 0.36
    # The chassis: two rails, saddles under the barrel, three axles, guards.
    for lz in (-0.6, 0.48):
        g.box(st, -6.2, 5.6, 0.98, 1.26, lz, lz + 0.12, STEEL)
    for lx in (-5.0, -1.4, 2.2, 5.0):
        g.box(st, lx - 0.12, lx + 0.12, 1.26, CY - R_ * 0.72, -0.9, 0.9, shade(body, 0.4))
    for lx in (-5.3, -4.05, -2.8):
        g.wheel(st, lx, -1.25, -0.7)
        g.wheel(st, lx, 0.7, 1.25)
    for z0, z1 in ((-1.27, -0.68), (0.68, 1.27)):
        g.box(st, -6.0, -2.1, 1.1, 1.16, z0, z1, STEEL)
    g.box(st, -6.34, -6.22, 0.5, 0.64, -1.2, 1.2, STEEL)
    if legs:
        for lz in (-0.95, 0.83):
            g.box(st, 3.9, 4.02, 0.06, 1.0, lz, lz + 0.12, STEEL)
            g.box(st, 3.78, 4.14, 0.0, 0.06, lz - 0.1, lz + 0.22, STEEL)
    # The valve cabinet on its +z flank, side rails, tape, markers, placards.
    g.box(st, -1.2, 0.4, 0.62, 1.3, 0.86, 1.26, shade(body, 0.7))
    g.side(k("dark", 1), 1, -1.1, 0.3, 0.7, 1.22, (1, 1, 1, 1), out=1.264)
    for lx in (-0.8, -0.4, 0.0):
        px, py, pz = g.at(lx, 0.94, 1.27)
        nozzle(px, py, pz, yaw, r=0.07, ln=0.14, col=c(0.5, 0.5, 0.48))
    for sg in (1, -1):
        # A skirt between the legs and the axles, taped; markers on it and
        # on the guards over the wheels.
        a0 = 0.6 if sg > 0 else -2.0
        g.box(st, a0, 3.6, 0.55, 1.1, sg * 1.2 - 0.02, sg * 1.2 + 0.02, shade(body, 0.75))
        a, i = a0 + 0.1, 0
        while a + 0.8 < 3.6:
            g.side(k("trim", 1), sg, a, a + 0.8, 0.98, 1.05, TAPE_RED if i % 2 else TAPE_WHITE, out=1.232)
            a, i = a + 1.1, i + 1
        for lx in (a0 + 0.3, 3.3):
            g.side(kg, sg, lx - 0.09, lx + 0.09, 0.82, 0.9, SODIUM, out=1.234)
        for lx in (-5.7, -2.4):
            g.side(kg, sg, lx - 0.09, lx + 0.09, 1.17, 1.25, SODIUM, out=1.275)
        px, py, pz = g.at(-5.3, 1.75, sg * 0.93)
        P.place("haz_diamond", px, py, pz, yaw, district=D)
        for lx in (-3.4, 2.8):
            g.lamp(lx, 1.5, sg * 2.2, "amber", 1.5)
    px, py, pz = g.at(-6.3, 1.9, 0.62)
    P.place("haz_diamond", px, py, pz, yaw + math.pi / 2, district=D)
    for sg in (-1, 1):
        g.end(kg, -1, -6.3, sg * 0.5, sg * 0.66, CY + 0.7, CY + 0.78, GLOW["red"])
    tail(g, -6.35, 0.5)
    return g


# ---------------------------------------------------------------------------
# The yard's instanced props. One material each where it can be done (the
# colour rides on `trim`'s vertices), so a prototype is one small mesh.
# ---------------------------------------------------------------------------
BOX_COLS = {"red": OXIDE, "rust": RUST, "blue": c(0.07, 0.15, 0.30), "green": c(0.08, 0.22, 0.15), "grey": c(0.2, 0.21, 0.23)}


def container(cx, cz, yaw=0.0, col="red", ln=12.19, y=GY, doors=1):
    """A container a walker passes, built in place (the stacks behind are
    instances): corrugated sides as ribs, corner posts, top and bottom
    rails, two doors with their lock rods and handles at one end (`doors`:
    1 the +x end as a prop's yaw turns it, -1 the other), a code plate."""
    col = BOX_COLS.get(col, col)
    key, kd = M("container"), M("container", 1)
    hx, hz, h = ln / 2, 1.22, 2.59
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)

    def at(u, t):
        return cx + rx * u + nx * t, cz + rz * u + nz * t

    oriented_box(key, cx, y + h / 2, cz, ln, h, 2 * hz, yaw, scale=1.0, col=col)
    n = int(ln / 0.58)
    for s in (-1, 1):
        for i in range(n):
            px, pz = at(-hx + 0.25 + (ln - 0.5) * (i + 0.5) / n, s * (hz + 0.02))
            oriented_box(kd, px, y + h / 2, pz, 0.2, h - 0.4, 0.045, yaw, col=shade(col, 0.68))
        for yy, hh in ((y + 0.09, 0.18), (y + h - 0.07, 0.14)):
            px, pz = at(0.0, s * (hz + 0.02))
            oriented_box(key, px, yy, pz, ln + 0.04, hh, 0.07, yaw, col=shade(col, 0.8))
        for e in (-1, 1):
            px, pz = at(e * (hx - 0.06), s * (hz - 0.04))
            oriented_box(key, px, y + h / 2, pz, 0.16, h + 0.02, 0.16, yaw, col=shade(col, 0.75))
        # Its code, top corner by the doors: two rows of pale marks.
        px, pz = at(doors * (hx - 1.5), s * (hz + 0.05))
        for dv, w_ in ((0.0, 1.1), (-0.24, 0.6)):
            rotated_quad(k("trim", 1), px, y + h - 0.5 + dv, pz, w_, 0.15, yaw if s > 0 else yaw + math.pi, col=PAINT_WHITE)
    # The door end: two leaves, a seam, four lock rods and their handles.
    ey = yaw + math.pi / 2 * doors
    for t in (-0.84, -0.32, 0.32, 0.84):
        px, pz = at(doors * (hx + 0.03), t)
        oriented_box(kd, px, y + h / 2, pz, 0.05, h - 0.3, 0.06, ey, col=shade(col, 0.45))
        oriented_box(kd, px, y + 1.1, pz, 0.3, 0.05, 0.1, ey, col=shade(col, 0.4))
    px, pz = at(doors * (hx + 0.01), 0.0)
    oriented_box(kd, px, y + h / 2, pz, 0.035, h - 0.2, 0.03, ey, col=shade(col, 0.3))
    for yy in (y + 0.1, y + h - 0.1):
        oriented_box(key, px, yy, pz, 2 * hz, 0.2, 0.05, ey, col=shade(col, 0.7))
    px, pz = at(doors * (hx + 0.05), -0.58 * doors)
    rotated_quad(k("trim", 1), px, y + h - 0.55, pz, 0.62, 0.2, ey, col=PAINT_WHITE)
    collide(min(at(-hx, -hz)[0], at(hx, hz)[0], at(-hx, hz)[0], at(hx, -hz)[0]), max(at(-hx, -hz)[0], at(hx, hz)[0], at(-hx, hz)[0], at(hx, -hz)[0]),
            min(at(-hx, -hz)[1], at(hx, hz)[1], at(-hx, hz)[1], at(hx, -hz)[1]), max(at(-hx, -hz)[1], at(hx, hz)[1], at(-hx, hz)[1], at(hx, -hz)[1]), y + h)


def _container(kk, col, ln=12.19):
    hx = ln / 2
    key = kk(MAT["container"])
    box(key, -hx, hx, 0.0, 2.59, -1.22, 1.22, scale=1.0, col=col)
    # Its corner posts and the doors' bars at one end.
    for z in (-1.22, 1.14):
        box(key, hx, hx + 0.03, 0.0, 2.59, z, z + 0.08, scale=1.0, col=shade(col, 0.5))
    for z in (-0.62, -0.2, 0.2, 0.62):
        box(key, hx, hx + 0.05, 0.15, 2.45, z - 0.025, z + 0.025, scale=1.0, col=shade(col, 0.45))
    box(key, -hx, hx, 2.59, 2.6, -1.22, 1.22, scale=1.0, col=shade(col, 0.7))


for _name, _col in (("c40_red", OXIDE), ("c40_rust", RUST), ("c40_blue", c(0.07, 0.15, 0.30)), ("c40_green", c(0.08, 0.22, 0.15))):
    P.proto(_name, box=(6.1, 1.3, 1.22), reach=700)(lambda kk, _c=_col: _container(kk, _c))
P.proto("c20_grey", box=(3.05, 1.3, 1.22), reach=700)(lambda kk: _container(kk, c(0.2, 0.21, 0.23), ln=6.06))


@P.proto("fence_pal", box=(1.5, 1.2, 0.05), reach=300)
def _fence_pal(kk):
    """Three metres of palisade: a post, two rails, pales with pointed
    heads, in dark galvanised steel."""
    col = c(0.24, 0.25, 0.27)
    for y in (0.5, 1.9):
        box(kk("trim"), -1.5, 1.5, y, y + 0.06, -0.03, 0.01, scale=1.0, col=col)
    box(kk("trim"), -1.56, -1.44, 0.0, 2.5, -0.06, 0.06, scale=1.0, col=shade(col, 0.8))
    x = -1.36
    while x < 1.45:
        for d in (1, -1):
            pts = [(x - 0.035, 0.1, 0.02), (x + 0.035, 0.1, 0.02), (x + 0.035, 2.3, 0.02), (x, 2.42, 0.02), (x - 0.035, 2.3, 0.02)]
            poly(kk("trim"), pts if d > 0 else pts[::-1], [(0, 0), (1, 0), (1, 0.9), (0.5, 1), (0, 0.9)], col)
        x += 0.2


@P.proto("wall_pack", box=(0.2, 0.1, 0.15), reach=420)
def _wall_pack(kk):
    """A sodium wall pack: its hood and the lens under it."""
    box(kk("neon_amber"), -0.2, 0.2, -0.1, 0.0, 0.03, 0.3, scale=0.5, bottom=True)


@P.proto("flood_mast", box=(0.2, 6.0, 0.2), reach=900)
def _flood_mast(kk):
    """A yard's flood mast: twelve metres, a head frame, four floods."""
    col = c(0.1, 0.1, 0.11)
    cylinder(kk("trim"), 0.0, 0.0, 0.0, 12.0, 0.12, segs=6, col=col)
    box(kk("trim"), -1.3, 1.3, 11.7, 11.82, -0.06, 0.06, scale=0.5, col=col)
    for x in (-1.05, -0.35, 0.35, 1.05):
        box(kk("trim"), x - 0.28, x + 0.28, 11.34, 11.72, -0.04, 0.02, scale=0.5, col=col)


@P.proto("lamp_strip", box=(0.15, 3.5, 0.15), reach=600)
def _lamp_strip(kk):
    """A yard lamp: a pole, an arm, a long sodium tube under a hood (the
    strip lamps of mH2wmyeiIpA@60)."""
    col = c(0.1, 0.1, 0.11)
    cylinder(kk("trim"), 0.0, 0.0, 0.0, 6.6, 0.08, segs=6, col=col)
    box(kk("trim"), -0.05, 0.05, 6.5, 6.6, 0.0, 2.3, scale=0.5, col=col)
    box(kk("trim"), -0.16, 0.16, 6.36, 6.5, 0.5, 2.4, scale=0.5, col=col)


@P.proto("vent_turb", box=(0.4, 0.4, 0.4), reach=420, detail=True)
def _vent_turb(kk):
    col = c(0.2, 0.21, 0.23)
    cylinder(kk("trim"), 0.0, 0.0, 0.0, 0.5, 0.22, segs=6, col=shade(col, 0.7))
    cylinder(kk("trim"), 0.0, 0.0, 0.5, 0.95, 0.4, segs=8, col=col)


@P.proto("drum_pallet", box=(0.65, 0.9, 0.65), reach=260, detail=True)
def _drum_pallet(kk):
    """Drums two high on a pallet, a tarp over a corner (x4ztgjvfU60@38)."""
    box(kk("trim"), -0.65, 0.65, 0.0, 0.14, -0.65, 0.65, scale=1.0, col=WOOD)
    for (x, z, col) in ((-0.31, -0.31, RUST), (0.31, -0.31, RUST_D), (-0.31, 0.31, RUST), (0.31, 0.31, c(0.1, 0.16, 0.24))):
        cylinder(kk("trim"), x, z, 0.14, 1.02, 0.29, segs=8, col=col)
    for (x, z, col) in ((-0.31, 0.31, RUST_D), (0.31, -0.31, RUST)):
        cylinder(kk("trim"), x, z, 1.04, 1.92, 0.29, segs=8, col=col)
    box(kk("trim"), -0.66, 0.02, 1.02, 1.08, -0.66, 0.02, scale=1.0, col=c(0.1, 0.13, 0.12))


def _wheel(key, x, z0, z1, r=0.52):
    """A wheel, or a twin, across the chassis: the tyre and its hub."""
    pipe(key, (x, r, z0), (x, r, z1), r, segs=10, col=TYRE, caps=True)
    out = z1 if abs(z1) > abs(z0) else z0
    pipe(key, (x, r, out), (x, r, out + (0.025 if out > 0 else -0.025)), r * 0.45, segs=6, col=c(0.3, 0.3, 0.31), caps=True)


@P.proto("trailer", box=(6.5, 2.0, 1.35), reach=700)
def _trailer(kk):
    """A box trailer at a dock: a ribbed body on its chassis, twin axles
    and their wheels at the back (-x) under mudguards, two doors with
    their lock rods, an underrun bar and its lamps, the landing legs and
    the kingpin plate at the nose (+x)."""
    body, st = kk(MAT["container"]), kk(MAT["steel"])
    col = c(0.42, 0.42, 0.40)
    box(body, -6.4, 6.4, 1.3, 4.0, -1.27, 1.27, scale=1.0, col=col, bottom=True)
    for i in range(1, 8):
        x = -6.4 + 12.8 * i / 8
        for z0, z1 in ((1.27, 1.31), (-1.31, -1.27)):
            box(body, x - 0.05, x + 0.05, 1.42, 3.9, z0, z1, scale=1.0, col=shade(col, 0.68))
    for z0, z1 in ((1.27, 1.33), (-1.33, -1.27)):
        box(st, -6.42, 6.42, 1.24, 1.42, z0, z1, scale=1.0, col=shade(col, 0.4))
        box(st, -6.42, 6.42, 3.9, 4.02, z0, z1, scale=1.0, col=shade(col, 0.6))
    box(st, -6.46, -6.4, 1.3, 4.0, -1.27, 1.27, scale=1.0, col=shade(col, 0.8))
    for z in (-0.85, -0.3, 0.3, 0.85):
        box(st, -6.5, -6.46, 1.4, 3.9, z - 0.025, z + 0.025, scale=1.0, col=shade(col, 0.4))
    box(st, -6.49, -6.46, 1.35, 3.95, -0.015, 0.015, scale=1.0, col=STEEL)
    box(st, -6.5, -6.38, 0.5, 0.62, -1.2, 1.2, scale=1.0, col=STEEL, bottom=True)
    for z in (-1.15, 0.95):
        box(st, -6.52, -6.5, 0.5, 0.62, z, z + 0.2, scale=0.5, col=c(0.55, 0.04, 0.03))
    for z in (-0.55, 0.43):
        box(st, -6.3, 5.4, 1.0, 1.3, z, z + 0.12, scale=1.0, col=STEEL, bottom=True)
    for x in (-4.9, -3.55):
        _wheel(st, x, -1.25, -0.7)
        _wheel(st, x, 0.7, 1.25)
        box(st, x - 0.06, x + 0.06, 0.46, 0.58, -0.7, 0.7, scale=1.0, col=STEEL)
    for z0, z1 in ((-1.27, -0.68), (0.68, 1.27)):
        box(st, -5.6, -2.85, 1.1, 1.16, z0, z1, scale=1.0, col=STEEL, bottom=True)
    for z in (-0.95, 0.83):
        box(st, 3.9, 4.02, 0.06, 1.3, z, z + 0.12, scale=1.0, col=STEEL)
        box(st, 3.78, 4.14, 0.0, 0.06, z - 0.1, z + 0.22, scale=1.0, col=STEEL)
    box(st, 3.93, 3.99, 0.6, 0.68, -0.83, 0.83, scale=1.0, col=STEEL)
    box(st, 4.6, 6.3, 1.18, 1.3, -1.0, 1.0, scale=1.0, col=STEEL, bottom=True)


def _tractor(kk, col):
    """A tractor unit: its cab over the front axle with a wind deflector,
    glass, a grille and a bumper, the chassis and fifth wheel behind, twin
    drive wheels under guards, tanks at its flanks, an exhaust stack. Its
    nose is +x, as a trailer's is, so the two couple at one yaw."""
    st = kk(MAT["steel"])
    glass = c(0.03, 0.045, 0.06)
    box(st, -3.0, 2.2, 0.6, 0.9, -0.5, 0.5, scale=1.0, col=STEEL, bottom=True)
    box(st, -2.2, -0.8, 0.9, 1.16, -0.6, 0.6, scale=1.0, col=STEEL)
    _wheel(st, -1.6, -1.25, -0.65)
    _wheel(st, -1.6, 0.65, 1.25)
    _wheel(st, 2.0, -1.22, -0.9)
    _wheel(st, 2.0, 0.9, 1.22)
    for z0, z1 in ((-1.27, -0.63), (0.63, 1.27)):
        box(st, -2.35, -0.85, 1.1, 1.16, z0, z1, scale=1.0, col=STEEL, bottom=True)
    box(st, 0.9, 3.0, 0.95, 3.3, -1.22, 1.22, scale=1.0, col=col, bottom=True)
    box(st, 0.9, 2.5, 3.3, 3.75, -1.1, 1.1, scale=1.0, col=shade(col, 0.85))
    box(st, 2.95, 3.12, 0.5, 0.95, -1.25, 1.25, scale=1.0, col=STEEL, bottom=True)
    quad(st, (3.01, 2.0, 1.05), (3.01, 2.0, -1.05), (3.01, 2.95, -1.05), (3.01, 2.95, 1.05), col=glass)
    quad(st, (3.01, 1.05, 0.7), (3.01, 1.05, -0.7), (3.01, 1.8, -0.7), (3.01, 1.8, 0.7), col=c(0.05, 0.05, 0.055))
    for z in (-1.1, 0.8):
        quad(st, (3.13, 0.6, z + 0.3), (3.13, 0.6, z), (3.13, 0.86, z), (3.13, 0.86, z + 0.3), col=c(0.7, 0.67, 0.55))
    quad(st, (1.9, 2.0, 1.23), (2.85, 2.0, 1.23), (2.85, 2.9, 1.23), (1.9, 2.9, 1.23), col=glass)
    quad(st, (2.85, 2.0, -1.23), (1.9, 2.0, -1.23), (1.9, 2.9, -1.23), (2.85, 2.9, -1.23), col=glass)
    for z in (-1.02, 1.02):
        pipe(st, (-0.55, 0.75, z), (0.75, 0.75, z), 0.32, segs=8, col=c(0.3, 0.31, 0.32), caps=True)
    cylinder(st, 0.72, -1.05, 0.9, 3.95, 0.08, segs=6, col=STEEL)


P.proto("tractor", box=(3.2, 1.9, 1.3), reach=700)(lambda kk: _tractor(kk, c(0.5, 0.5, 0.48)))
P.proto("tractor_red", box=(3.2, 1.9, 1.3), reach=700)(lambda kk: _tractor(kk, OXIDE))


@P.proto("forklift", box=(1.5, 1.2, 0.7), reach=300, detail=True)
def _forklift(kk):
    """A forklift: its body and counterweight, four wheels, the mast and
    its forks, the driver's cage, an amber beacon on the cage."""
    st = kk(MAT["steel"])
    y = c(0.62, 0.45, 0.05)
    box(st, -0.9, 0.7, 0.3, 1.1, -0.55, 0.55, scale=1.0, col=y, bottom=True)
    box(st, -1.0, -0.6, 0.3, 1.3, -0.55, 0.55, scale=1.0, col=STEEL)
    box(st, -0.35, 0.05, 1.1, 1.5, -0.25, 0.25, scale=1.0, col=STEEL)
    for x, r in ((-0.6, 0.26), (0.45, 0.32)):
        pipe(st, (x, r, -0.62), (x, r, 0.62), r, segs=8, col=TYRE, caps=True)
    for z in (-0.5, 0.42):
        box(st, 0.72, 0.8, 0.1, 2.3, z, z + 0.08, scale=1.0, col=STEEL)
        box(st, 0.8, 1.9, 0.12, 0.17, z - 0.02, z + 0.1, scale=1.0, col=STEEL)
        box(st, -0.55, -0.5, 1.1, 2.1, z, z + 0.06, scale=1.0, col=STEEL)
        box(st, 0.3, 0.35, 1.1, 2.1, z, z + 0.06, scale=1.0, col=STEEL)
    box(st, 0.74, 0.8, 0.5, 1.2, -0.5, 0.5, scale=1.0, col=STEEL)
    box(st, -0.6, 0.4, 2.1, 2.15, -0.52, 0.52, scale=1.0, col=STEEL, bottom=True)
    box(kk("glow"), -0.2, -0.06, 2.15, 2.3, -0.07, 0.07, scale=0.5, col=GLOW["amber"])


@P.proto("reel", box=(0.9, 0.9, 0.6), reach=260, detail=True)
def _reel(kk):
    """A cable reel on its side: two wooden flanges and the drum."""
    for z in (-0.55, 0.47):
        for t in range(8):
            a0, a1 = t * math.tau / 8, (t + 1) * math.tau / 8
            for zz, n in ((z, -1), (z + 0.08, 1)):
                pts = [(0.0, 0.9, zz), (0.9 * math.cos(a0), 0.9 + 0.9 * math.sin(a0), zz), (0.9 * math.cos(a1), 0.9 + 0.9 * math.sin(a1), zz)]
                poly(kk("trim"), pts if n > 0 else pts[::-1], [(0.5, 0.5), (0, 0), (1, 0)], WOOD)
    for t in range(8):
        a0, a1 = t * math.tau / 8, (t + 1) * math.tau / 8
        quad(kk("trim"), (0.5 * math.cos(a1), 0.9 + 0.5 * math.sin(a1), -0.47), (0.5 * math.cos(a0), 0.9 + 0.5 * math.sin(a0), -0.47),
             (0.5 * math.cos(a0), 0.9 + 0.5 * math.sin(a0), 0.47), (0.5 * math.cos(a1), 0.9 + 0.5 * math.sin(a1), 0.47), col=c(0.03, 0.03, 0.035))


@P.proto("haz_diamond", box=(0.4, 0.4, 0.05), reach=220, detail=True)
def _haz_diamond(kk):
    """A hazard diamond on a fence, both faces: yellow, a black bar. A
    mark, no words."""
    for s in (1, -1):
        pts = [(0.0, -0.36, 0.03 * s), (0.36 * s, 0.0, 0.03 * s), (0.0, 0.36, 0.03 * s), (-0.36 * s, 0.0, 0.03 * s)]
        poly(kk("trim"), pts, [(0.5, 0), (1, 0.5), (0.5, 1), (0, 0.5)], PAINT_YELLOW)
        q = [(-0.17 * s, -0.05, 0.035 * s), (0.17 * s, -0.05, 0.035 * s), (0.17 * s, 0.05, 0.035 * s), (-0.17 * s, 0.05, 0.035 * s)]
        poly(kk("trim"), q, [(0, 0), (1, 0), (1, 1), (0, 1)], c(0.02, 0.02, 0.02))


@P.proto("warn_board", box=(0.35, 0.45, 0.05), reach=220, detail=True)
def _warn_board(kk):
    """A warning board, both faces: white, a red band at its head, three
    black strokes for its lines."""
    def rect(x0, x1, y0, y1, dz, col):
        for s in (1, -1):
            pts = [(x0 * s, y0, dz * s), (x1 * s, y0, dz * s), (x1 * s, y1, dz * s), (x0 * s, y1, dz * s)]
            poly(kk("trim"), pts, [(0, 0), (1, 0), (1, 1), (0, 1)], col)
    rect(-0.32, 0.32, -0.42, 0.42, 0.03, PAINT_WHITE)
    rect(-0.32, 0.32, 0.2, 0.42, 0.034, c(0.55, 0.05, 0.04))
    for i, w_ in enumerate((0.5, 0.36, 0.44)):
        rect(-0.25, -0.25 + w_, 0.02 - i * 0.15, 0.1 - i * 0.15, 0.034, c(0.03, 0.03, 0.03))


@P.proto("weed", box=(0.35, 0.25, 0.35), reach=110, detail=True)
def _weed(kk):
    """A clump of weeds at a wall's foot: a few dark blades."""
    for i, (a, ln, h) in enumerate(((0.3, 0.3, 0.42), (1.5, 0.26, 0.3), (2.7, 0.34, 0.36), (3.9, 0.22, 0.5), (5.2, 0.3, 0.28))):
        dx, dz = math.cos(a), math.sin(a)
        col = c(0.035, 0.09, 0.03) if i % 2 else c(0.05, 0.13, 0.05)
        b0, b1, tip = (-dz * 0.07, 0.0, dx * 0.07), (dz * 0.07, 0.0, -dx * 0.07), (dx * ln, h, dz * ln)
        poly(kk("trim"), [b0, b1, tip], [(0, 0), (1, 0), (0.5, 1)], col)
        poly(kk("trim"), [b1, b0, tip], [(0, 0), (1, 0), (0.5, 1)], col)


@P.proto("blocks", box=(0.5, 0.35, 0.45), reach=200, detail=True)
def _blocks(kk):
    """Cinder blocks: a short stack, one askew on top, one fallen beside."""
    key = kk(MAT["concrete"])
    col = c(0.52, 0.52, 0.5)
    for j in range(2):
        for i in range(2):
            for q in range(2):
                if (i, j, q) == (1, 1, 1):
                    continue
                x, z = -0.42 + i * 0.42, -0.21 + q * 0.21
                box(key, x, x + 0.4, j * 0.2, j * 0.2 + 0.19, z, z + 0.19, scale=0.5, col=shade(col, 0.85 + 0.15 * ((i + j + q) % 2)))
    oriented_box(key, -0.16, 0.495, -0.1, 0.4, 0.19, 0.19, 0.5, col=col)
    oriented_box(key, 0.62, 0.095, 0.3, 0.4, 0.19, 0.19, 1.1, col=shade(col, 0.9))


@P.proto("tyres", box=(0.4, 0.5, 0.4), reach=220, detail=True)
def _tyres(kk):
    for j in range(4):
        cylinder(kk("trim"), 0.03 * (j % 2), 0.0, j * 0.27, j * 0.27 + 0.25, 0.4, segs=8, col=c(0.025, 0.025, 0.03))


@P.proto("pole_can", box=(0.3, 0.5, 0.3), reach=500, detail=True)
def _pole_can(kk):
    """A transformer can hung on a pole, its bushings on top."""
    cylinder(kk("trim"), 0.0, 0.42, 0.0, 1.0, 0.3, segs=8, col=c(0.2, 0.21, 0.22))
    for x in (-0.14, 0.14):
        cylinder(kk("trim"), x, 0.42, 1.0, 1.25, 0.05, segs=5, col=c(0.4, 0.38, 0.33))


@P.proto("transformer", box=(1.6, 1.4, 1.1), reach=500)
def _transformer(kk):
    """A substation transformer: its tank and radiator fins on a plinth,
    three bushings, a lamp."""
    col = c(0.19, 0.21, 0.22)
    box(kk("trim"), -1.9, 1.9, 0.0, 0.3, -1.4, 1.4, scale=1.0, col=c(0.3, 0.3, 0.3))
    box(kk("trim"), -1.3, 1.3, 0.3, 2.6, -0.9, 0.9, scale=1.0, col=col)
    for x in (-1.75, 1.35):
        for z in (-0.8, -0.4, 0.0, 0.4):
            box(kk("trim"), x, x + 0.4, 0.6, 2.3, z, z + 0.3, scale=1.0, col=shade(col, 0.75))
    for x in (-0.8, 0.0, 0.8):
        cylinder(kk("trim"), x, 0.0, 2.6, 3.7, 0.11, segs=6, col=c(0.42, 0.36, 0.28))


@P.proto("pump", box=(0.25, 0.9, 0.5), reach=400)
def _pump(kk):
    """A fuel pump on its island: the cabinet, its lit face each side."""
    box(kk("trim"), -0.28, 0.28, 0.0, 1.9, -0.5, 0.5, scale=1.0, col=c(0.3, 0.07, 0.05))
    box(kk("trim"), -0.32, 0.32, 1.9, 2.05, -0.55, 0.55, scale=1.0, col=c(0.5, 0.5, 0.48))
    for s in (1, -1):
        box(kk("trim"), min(0.285 * s, 0.31 * s), max(0.285 * s, 0.31 * s), 1.02, 1.78, -0.45, 0.45, scale=1.0, col=STEEL)
