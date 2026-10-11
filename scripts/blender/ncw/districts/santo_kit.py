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
PAINT_YELLOW = (0.86, 0.66, 0.10, 1.0)
PAINT_WHITE = (0.78, 0.76, 0.70, 1.0)

_counts = {"steam": 0, "lamp": 0}


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
        "8": "abcdefg", "9": "abcdfg", "-": "g", " ": ""}


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
def column(x, z, y0, y1, t=0.3, mat="dark", col=(1, 1, 1, 1), detail=0):
    box(k(mat, detail), x - t / 2, x + t / 2, y0, y1, z - t / 2, z + t / 2, scale=1.0, col=col)


def beam(x0, z0, x1, z1, y, t=0.28, mat="dark", col=(1, 1, 1, 1), detail=0):
    """A beam between two points at height y (its top), along x or z."""
    if abs(x1 - x0) >= abs(z1 - z0):
        box(k(mat, detail), min(x0, x1), max(x0, x1), y - t, y, z0 - t / 2, z0 + t / 2, scale=1.0, col=col, bottom=True)
    else:
        box(k(mat, detail), x0 - t / 2, x0 + t / 2, y - t, y, min(z0, z1), max(z0, z1), scale=1.0, col=col, bottom=True)


def brace(a, b, r=0.09, mat="dark", col=(1, 1, 1, 1), detail=0):
    pipe(k(mat, detail), a, b, r, segs=4, col=col)


def xbrace(x0, z0, x1, z1, y0, y1, r=0.09, mat="dark", col=(1, 1, 1, 1), detail=0):
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


def tank(cx, cz, r, h, col, segs=20, band=None, number=None, number_yaw=0.0, stair_at=0.0, lamp="cyan", r_=None, roof=0.16):
    """A storage tank: its shell with a painted band, a cone roof with a
    vent, a rail round the rim, a stair spiralling up its side to a landing
    with a safety lamp (Fn9gKhU_2_Q@28)."""
    r_ = r_ or random.Random(int(cx * 7 + cz * 13))
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
            quad_n(k("trim"), ((a[0], ya, a[2]), (b_[0], ya, b_[2]), (b_[0], yb, b_[2]), (a[0], yb, a[2])), mid, cc)
    apex = (cx, y1 + r * roof, cz)
    for i in range(segs):
        a, b_ = hi[i], hi[(i + 1) % segs]
        tri_n(k("trim"), (apex, a, b_), (0, 1, 0), shade(col, 0.82))
    cylinder(k("metal", 1), cx, cz, apex[1] - 0.1, apex[1] + 0.5, 0.35, segs=6)
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
    if number:
        nx, nz = math.sin(number_yaw), math.cos(number_yaw)
        digits(number, cx + nx * (r + 0.02), y0 + h * 0.62, cz + nz * (r + 0.02), min(2.6, h * 0.22), number_yaw, k("trim", 1),
               shade(col, 0.35) if sum(col[:3]) > 1.0 else TANK_WHITE, out=0.06)
    collide(cx - r * 0.75, cx + r * 0.75, cz - r * 0.75, cz + r * 0.75, y1)


def sphere(cx, cz, r, col, segs=14, rings=8, legs=7, lamp="cyan"):
    """A pressure sphere on its legs, a platform and a lamp on its crown."""
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
                tri_n(k("trim"), (pts[0], pts[2], pts[3]), n, cc)
            elif j == rings - 1:
                tri_n(k("trim"), (pts[0], pts[1], pts[2]), n, cc)
            else:
                quad_n(k("trim"), pts, n, cc)
    lr = r * 0.94
    feet = []
    for i in range(legs):
        t = (i + 0.5) * math.tau / legs
        fx, fz = cx + lr * math.cos(t), cz + lr * math.sin(t)
        column(fx, fz, GY, cy - r * 0.2, t=0.32, mat="metal")
        feet.append((fx, fz))
    for i in range(legs):
        (ax, az), (bx, bz) = feet[i], feet[(i + 1) % legs]
        xbrace(ax, az, bx, bz, GY + 0.3, cy - r * 0.55, r=0.06, mat="metal", detail=1)
    top = cy + r
    box(k("metal", 1), cx - 1.3, cx + 1.3, top - 0.05, top + 0.03, cz - 1.3, cz + 1.3, scale=1.0, bottom=True)
    for (a, b_) in (((cx - 1.3, top, cz - 1.3), (cx + 1.3, top, cz - 1.3)), ((cx + 1.3, top, cz - 1.3), (cx + 1.3, top, cz + 1.3)),
                    ((cx + 1.3, top, cz + 1.3), (cx - 1.3, top, cz + 1.3)), ((cx - 1.3, top, cz + 1.3), (cx - 1.3, top, cz - 1.3))):
        rail(a, b_, detail=1)
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


def bullet(x0, x1, z, r, col, y=None, segs=10, base=GY):
    """A horizontal pressure vessel on two saddles, its ends domed."""
    y = (GY + r + 1.1) if y is None else y
    for i in range(segs):
        t0, t1 = i * math.tau / segs, (i + 1) * math.tau / segs
        a = (math.cos(t0) * r, math.sin(t0) * r)
        b_ = (math.cos(t1) * r, math.sin(t1) * r)
        n = (0, (a[1] + b_[1]) / 2, (a[0] + b_[0]) / 2)
        quad_n(k("trim"), ((x0, y + a[1], z + a[0]), (x1, y + a[1], z + a[0]), (x1, y + b_[1], z + b_[0]), (x0, y + b_[1], z + b_[0])), n, col)
        for xe, s in ((x0, -1), (x1, 1)):
            tri_n(k("trim"), ((xe + s * r * 0.45, y, z), (xe, y + a[1], z + a[0]), (xe, y + b_[1], z + b_[0])), (s, 0, 0), shade(col, 0.85))
    for sx in (x0 + (x1 - x0) * 0.2, x0 + (x1 - x0) * 0.8):
        box(k("concrete"), sx - 0.4, sx + 0.4, base, y - r * 0.55, z - r * 0.85, z + r * 0.85, scale=1.5)
    collide(x0, x1, z - r, z + r, y + r)


def stack(cx, cz, h, r0, r1, col, segs=12, bands=((0.80, 0.86), (0.92, 0.97)), band_col=TANK_WHITE, platform=0.72, breathe=True,
          beacon=True, lit=None):
    """A stack: a tapering shell with painted bands near its top, a service
    platform, a caged ladder, red lamps, steam (mH2wmyeiIpA@60)."""
    cuts = sorted({0.0, 1.0, *[v for b_ in bands for v in b_]})
    rad = lambda t: r0 + (r1 - r0) * t  # noqa: E731
    for j in range(len(cuts) - 1):
        ta, tb = cuts[j], cuts[j + 1]
        cc = band_col if any(abs(ta - b_[0]) < 1e-6 for b_ in bands) else col
        la, lb = ring_pts(cx, cz, rad(ta), segs, GY + h * ta), ring_pts(cx, cz, rad(tb), segs, GY + h * tb)
        for i in range(segs):
            i2 = (i + 1) % segs
            mid = ((la[i][0] + la[i2][0]) / 2 - cx, 0, (la[i][2] + la[i2][2]) / 2 - cz)
            quad_n(k("trim"), (la[i], la[i2], lb[i2], lb[i]), mid, cc)
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
        steam(cx, top + 0.6, cz)
    collide(cx - r0, cx + r0, cz - r0, cz + r0, top)
    return top


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
def run(points, r=0.16, col=RUST, segs=6, detail=0):
    """A pipe through a list of points, each leg run a little past the
    corner so the elbows close."""
    for a, b_ in zip(points, points[1:]):
        dx, dy, dz = b_[0] - a[0], b_[1] - a[1], b_[2] - a[2]
        ln = math.sqrt(dx * dx + dy * dy + dz * dz)
        if ln < 1e-3:
            continue
        e = r * 0.6 / ln
        pipe(k("trim", detail), (a[0] - dx * e, a[1] - dy * e, a[2] - dz * e), (b_[0] + dx * e, b_[1] + dy * e, b_[2] + dz * e), r, segs=segs, col=col)


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
        if along_x:
            pipe(k("trim"), (a0 - 0.4, y, c0 + off), (a1 + 0.4, y, c0 + off), r, segs=6, col=col)
        else:
            pipe(k("trim"), (c0 + off, y, a0 - 0.4), (c0 + off, y, a1 + 0.4), r, segs=6, col=col)


# ---------------------------------------------------------------------------
# Sheds.
# ---------------------------------------------------------------------------
def sawtooth(x0, x1, z0, z1, y, n, glaze, r, wall=CREAM, rise=2.6, lit=0.65, tint="concrete", vents=True, power=3.2):
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
        frac = r.uniform(0.6, 0.95) if on else r.uniform(0.0, 0.15)
        vo = r.randrange(0, 60)
        col = B.wall_col(frac, 4, r.uniform(0.55, 1.0), tint_i)
        pts = (W(u0, y + 0.25, a), W(u1, y + 0.25, a), W(u1, y + rise - 0.12, a), W(u0, y + rise - 0.12, a))
        quad_n(k("facade"), pts, gn, col, uvs=((0, vo), (bays, vo), (bays, vo + 1), (0, vo + 1)))
        if on:
            m = max(1, round((u1 - u0) / 6.0))
            for j in range(m):
                px, py, pz = W(u0 + (u1 - u0) * (j + 0.5) / m, y + 0.6, a - 1.8 if i > 0 else a + 1.2)
                light(D, px, py, pz, "amber", power * r.uniform(0.8, 1.2))
        # Its sill and head, the slope behind, the gable ends, the gutter.
        for (ya, yb) in ((y, y + 0.25), (y + rise - 0.12, y + rise)):
            quad_n(k("metal"), (W(u0, ya, a), W(u1, ya, a), W(u1, yb, a), W(u0, yb, a)), gn)
        quad_n(k("trim"), (W(u0, y + rise, a), W(u1, y + rise, a), W(u1, y, b_), W(u0, y, b_)), (0, 1, 0), shade(SHEET, r.uniform(0.85, 1.1)))
        for ue, s in ((u0, -1), (u1, 1)):
            en = (s, 0, 0) if ridge_x else (0, 0, s)
            tri_n(k("trim"), (W(ue, y, a), W(ue, y + rise, a), W(ue, y, b_)), en, wall)
        g0, g1 = W(u0, y, b_ - 0.2), W(u1, y + 0.14, b_ + 0.2)
        box(k("dark", 1), min(g0[0], g1[0]), max(g0[0], g1[0]), y, y + 0.14, min(g0[2], g1[2]), max(g0[2], g1[2]), scale=1.0)
        if vents:
            nv = max(1, int((u1 - u0) / 14.0))
            for j in range(nv):
                vx, vy, vz = W(u0 + (u1 - u0) * (j + 0.5) / nv + r.uniform(-2, 2), y + rise * 0.5, a + d * 0.5)
                P.place("vent_turb", vx, vy - 0.1, vz, district=D)
    B.ROOFS.append((D, x0, x1, z0, z1, y + rise))


def skylight(x0, x1, z0, z1, y, tone, h=0.55, power=0.0, hue="amber"):
    """A rooflight: a low kerb and a lit lid."""
    box(k("metal"), x0, x1, y, y + h, z0, z1, scale=1.0)
    if tone is None:
        quad(k("glass_dark"), (x0 + 0.1, y + h + 0.01, z1 - 0.1), (x1 - 0.1, y + h + 0.01, z1 - 0.1), (x1 - 0.1, y + h + 0.01, z0 + 0.1), (x0 + 0.1, y + h + 0.01, z0 + 0.1))
    else:
        quad(k("glow"), (x0 + 0.1, y + h + 0.01, z1 - 0.1), (x1 - 0.1, y + h + 0.01, z1 - 0.1), (x1 - 0.1, y + h + 0.01, z0 + 0.1), (x0 + 0.1, y + h + 0.01, z0 + 0.1), col=tone)
        if power:
            light(D, (x0 + x1) / 2, y, z1 + 1.0, hue, power)


def flat_roof(x0, x1, z0, z1, y, r, wall=CREAM, parapet=0.8, lights=0.6, plant=True, breathe=0):
    """A shed's flat roof, worked: its parapet, rows of rooflights (most
    lit), ducts to a fan house, air units, a pipe run, a stub that steams."""
    quad(k("roof"), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0),
         uvs=((0, 0), ((x1 - x0) / 4, 0), ((x1 - x0) / 4, (z1 - z0) / 4), (0, (z1 - z0) / 4)))
    B.ROOFS.append((D, x0, x1, z0, z1, y))
    t = 0.3
    if parapet:
        for (a0, a1, b0, b1) in ((x0, x1, z1 - t, z1), (x0, x1, z0, z0 + t), (x0, x0 + t, z0 + t, z1 - t), (x1 - t, x1, z0 + t, z1 - t)):
            box(k("trim"), a0, a1, y, y + parapet, b0, b1, scale=1.5, col=shade(wall, 0.8))
    w, d = x1 - x0, z1 - z0
    long_x = w >= d
    # Rooflights in rows along the long side.
    rows = max(1, int((d if long_x else w) / 11.0))
    cols = max(1, int((w if long_x else d) / 7.0))
    for i in range(rows):
        for j in range(cols):
            if r.random() < 0.12:
                continue
            u = (j + 0.5) / cols
            v = (i + 0.5) / rows
            cx, cz = (x0 + w * u, z0 + d * v) if long_x else (x0 + w * v, z0 + d * u)
            tone = r.choice((GLASS_WARM, GLASS_WARM, GLASS_COOL, GLASS_GREEN)) if r.random() < lights else None
            sx, sz = (1.6, 0.9) if long_x else (0.9, 1.6)
            skylight(cx - sx, cx + sx, cz - sz, cz + sz, y, shade(tone, r.uniform(0.4, 0.7)) if tone else None, power=1.4 if (i + j) % 2 == 0 else 0.0,
                     hue="amber" if tone == GLASS_WARM else "white")
    if not plant:
        return
    # A fan house near one end with a duct running to it, air units by it.
    fx, fz = (x0 + w * r.uniform(0.12, 0.3), z0 + d * 0.5) if long_x else (x0 + w * 0.5, z0 + d * r.uniform(0.12, 0.3))
    off = (d if long_x else w) / (2 * rows) if rows > 1 else (d if long_x else w) * 0.27
    if long_x:
        fz += off
        box(k("metal"), fx - 2.2, fx + 2.2, y, y + 2.3, fz - 1.4, fz + 1.4, scale=1.0)
        box(k("metal", 1), fx + 2.2, min(x1 - 2.0, fx + w * 0.45), y + 0.5, y + 1.3, fz - 0.45, fz + 0.45, scale=1.0)
        for n_ in range(r.randrange(2, 5)):
            ax_ = fx + 3.4 + n_ * 1.9
            if ax_ < x1 - 1.5 and fz + 2.0 < z1 - 0.8:
                P.place("ac_roof", ax_, y, fz + 1.4, 0.0, district=D)
    else:
        fx += off
        box(k("metal"), fx - 1.4, fx + 1.4, y, y + 2.3, fz - 2.2, fz + 2.2, scale=1.0)
        box(k("metal", 1), fx - 0.45, fx + 0.45, y + 0.5, y + 1.3, fz + 2.2, min(z1 - 2.0, fz + d * 0.45), scale=1.0)
        for n_ in range(r.randrange(2, 5)):
            az_ = fz + 3.4 + n_ * 1.9
            if az_ < z1 - 1.5 and fx + 2.0 < x1 - 0.8:
                P.place("ac_roof", fx + 1.4, y, az_, math.pi / 2, district=D)
    box(k("glow"), fx - 0.12, fx + 0.12, y + 2.3, y + 2.5, fz - 0.12, fz + 0.12, scale=0.5, col=GLOW["red"])
    for _ in range(breathe):
        sx, sz = x0 + w * r.uniform(0.15, 0.85), z0 + d * r.uniform(0.15, 0.85)
        cylinder(k("metal"), sx, sz, y, y + 1.8, 0.32, segs=8)
        steam(sx, y + 2.0, sz)
    # A pipe run across it on sleepers.
    if long_x:
        pz = z0 + d * r.uniform(0.75, 0.9)
        pipe(k("trim", 1), (x0 + 1.5, y + 0.35, pz), (x1 - 1.5, y + 0.35, pz), 0.11, segs=5, col=RUST)
    else:
        px = x0 + w * r.uniform(0.75, 0.9)
        pipe(k("trim", 1), (px, y + 0.35, z0 + 1.5), (px, y + 0.35, z1 - 1.5), 0.11, segs=5, col=RUST)


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
        f.quad(k("glow"), a, b_, y0, y0 + h * up, 0.03, col=shade(GLASS_WARM, r.uniform(0.75, 1.1)))
        for q in range(3):
            sa = a + 0.3 + q * (w - 0.6) / 3 + r.uniform(0.0, 0.3)
            f.quad(k("dark", 1), sa, sa + r.uniform(0.25, 0.7), y0, y0 + h * up * r.uniform(0.45, 0.9), 0.045)
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
        f.box(k("concrete"), s0 - 1.0, s1 + 1.0, GY, GY + sill, 0.0, 2.6, scale=1.5)
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
        f.box(k("trim"), s - 0.16, s + 0.16, GY, eave, 0.0, 0.16, col=shade(col, 0.62))
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
        f.quad(k("concrete"), 0.0, w, 0.0, GY + plinth, 0.0, uvs=((0, 0), (w / 3.0, 0), (w / 3.0, (GY + plinth) / 3.0), (0, (GY + plinth) / 3.0)))
        cuts = [GY + plinth, eave]
        band = spec.get("band")
        office = spec.get("office")
        if band:
            cuts = [GY + plinth, band[0], band[1], eave]
        for j in range(0, len(cuts) - 1, 2 if band else 1):
            if cuts[j + 1] - cuts[j] > 0.02:
                f.quad(k("trim"), 0.0, w, cuts[j], cuts[j + 1], 0.0, col=col)
        if band:
            window_band(f, band[0], band[1], r, style=spec.get("style", 5), lit=spec.get("lit", (0.25, 0.6)), tint=tint)
        if stripe_col is not None:
            f.quad(k("trim"), 0.0, w, eave - 1.1, eave - 0.5, 0.03, col=stripe_col)
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
            f.quad(k("facade"), o0, o1, GY + 1.0, GY + 3.2, 0.03,
                   uvs=((0, 0), (max(1, round((o1 - o0) / 2.4)), 0), (max(1, round((o1 - o0) / 2.4)), 1), (0, 1)),
                   col=B.wall_col(r.uniform(0.55, 0.9), 4, r.uniform(0.4, 0.9), B.TINTS[tint]))
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
def fence(x0, z0, x1, z1, lamps=None, signs=0.04, r=None):
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
            P.place("warning_tri", px, GY + 1.3, pz, yaw + (0 if r.random() < 0.5 else math.pi), district=D)


def yard_wall(x0, z0, x1, z1, h=2.8, wire=True, r=None, posters=0.0, face=1):
    """A stained concrete yard wall with piers, wire along its top, and
    boards pasted on its street side (mH2wmyeiIpA@43)."""
    along_x = abs(x1 - x0) >= abs(z1 - z0)
    t = 0.22
    if along_x:
        xa, xb = min(x0, x1), max(x0, x1)
        box(k("concrete"), xa, xb, 0.0, h, z0 - t / 2, z0 + t / 2, scale=2.5)
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
        box(k("concrete"), x0 - t / 2, x0 + t / 2, 0.0, h, za, zb, scale=2.5)
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


def gate(x0, z0, x1, z1, inward, open_=True, booth=None, guard=True, lamp="cyan"):
    """A yard gate between two piers: striped piers with a lamp each, the
    sliding leaf (shut across it or run back along the fence), a barrier
    arm, and a booth with its window lit and a guard in it. `inward`: the
    (x, z) direction into the yard."""
    ix, iz = inward
    along_x = abs(x1 - x0) >= abs(z1 - z0)
    for (px, pz) in ((x0, z0), (x1, z1)):
        box(k("concrete"), px - 0.35, px + 0.35, 0.0, 3.0, pz - 0.35, pz + 0.35, scale=1.5)
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
# The yard's instanced props. One material each where it can be done (the
# colour rides on `trim`'s vertices), so a prototype is one small mesh.
# ---------------------------------------------------------------------------
def _container(kk, col, ln=12.19):
    hx = ln / 2
    box(kk("trim"), -hx, hx, 0.0, 2.59, -1.22, 1.22, scale=1.0, col=col)
    # Its corner posts and the doors' bars at one end.
    for z in (-1.22, 1.14):
        box(kk("trim"), hx, hx + 0.03, 0.0, 2.59, z, z + 0.08, scale=1.0, col=shade(col, 0.5))
    for z in (-0.62, -0.2, 0.2, 0.62):
        box(kk("trim"), hx, hx + 0.05, 0.15, 2.45, z - 0.025, z + 0.025, scale=1.0, col=shade(col, 0.45))
    box(kk("trim"), -hx, hx, 2.59, 2.6, -1.22, 1.22, scale=1.0, col=shade(col, 0.7))


for _name, _col in (("c40_red", OXIDE), ("c40_rust", RUST), ("c40_blue", c(0.07, 0.15, 0.30)), ("c40_green", c(0.08, 0.22, 0.15))):
    P.proto(_name, box=(6.1, 1.3, 1.22), reach=700)(lambda kk, _c=_col: _container(kk, _c))
P.proto("c20_grey", box=(3.05, 1.3, 1.22), reach=700)(lambda kk: _container(kk, c(0.34, 0.35, 0.36), ln=6.06))


@P.proto("fence_pal", box=(1.5, 1.2, 0.05), reach=300)
def _fence_pal(kk):
    """Three metres of palisade: a post, two rails, pales with pointed
    heads, in dark galvanised steel."""
    col = c(0.11, 0.115, 0.13)
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
        box(kk("neon_amber"), x - 0.26, x + 0.26, 11.36, 11.7, 0.02, 0.2, scale=0.5, bottom=True)


@P.proto("lamp_strip", box=(0.15, 3.5, 0.15), reach=600)
def _lamp_strip(kk):
    """A yard lamp: a pole, an arm, a long sodium tube under a hood (the
    strip lamps of mH2wmyeiIpA@60)."""
    col = c(0.1, 0.1, 0.11)
    cylinder(kk("trim"), 0.0, 0.0, 0.0, 6.6, 0.08, segs=6, col=col)
    box(kk("trim"), -0.05, 0.05, 6.5, 6.6, 0.0, 2.3, scale=0.5, col=col)
    box(kk("trim"), -0.16, 0.16, 6.36, 6.5, 0.5, 2.4, scale=0.5, col=col)
    box(kk("neon_amber"), -0.09, 0.09, 6.26, 6.36, 0.6, 2.3, scale=0.5, bottom=True)


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


@P.proto("trailer", box=(6.4, 2.0, 1.3), reach=700)
def _trailer(kk):
    """A box trailer dropped at a dock: its body on a chassis, twin axles
    at the back, the landing legs down at the front, marker lamps."""
    col = c(0.42, 0.42, 0.40)
    box(kk("trim"), -6.4, 6.4, 1.25, 4.0, -1.27, 1.27, scale=1.0, col=col)
    box(kk("trim"), -6.3, 6.3, 0.95, 1.25, -1.1, 1.1, scale=1.0, col=STEEL, bottom=True)
    for x in (-5.0, -3.7):
        for z in (-1.2, 0.8):
            box(kk("trim"), x - 0.5, x + 0.5, 0.0, 1.0, z, z + 0.4, scale=1.0, col=c(0.03, 0.03, 0.035))
    for z in (-0.9, 0.8):
        box(kk("trim"), 4.2, 4.32, 0.0, 0.95, z, z + 0.12, scale=1.0, col=STEEL)
    box(kk("trim"), -6.43, -6.4, 1.3, 3.95, -1.2, 1.2, scale=1.0, col=shade(col, 0.6))
    for z in (-1.15, 1.03):
        box(kk("glow"), -6.45, -6.42, 1.05, 1.2, z, z + 0.12, scale=0.5, col=GLOW["red"])


@P.proto("forklift", box=(1.1, 1.1, 0.6), reach=300, detail=True)
def _forklift(kk):
    y = c(0.62, 0.45, 0.05)
    box(kk("trim"), -0.9, 0.7, 0.3, 1.1, -0.55, 0.55, scale=1.0, col=y)
    box(kk("trim"), -1.0, -0.6, 0.3, 1.3, -0.55, 0.55, scale=1.0, col=STEEL)
    for x in (-0.6, 0.45):
        for z in (-0.6, 0.45):
            box(kk("trim"), x - 0.22, x + 0.22, 0.0, 0.5, z, z + 0.15, scale=1.0, col=c(0.03, 0.03, 0.035))
    for z in (-0.5, 0.42):
        box(kk("trim"), 0.72, 0.8, 0.1, 2.3, z, z + 0.08, scale=1.0, col=STEEL)
        box(kk("trim"), 0.8, 1.9, 0.12, 0.17, z - 0.02, z + 0.1, scale=1.0, col=STEEL)
        box(kk("trim"), -0.55, -0.5, 1.1, 2.1, z, z + 0.06, scale=1.0, col=STEEL)
        box(kk("trim"), 0.3, 0.35, 1.1, 2.1, z, z + 0.06, scale=1.0, col=STEEL)
    box(kk("trim"), -0.6, 0.4, 2.1, 2.15, -0.52, 0.52, scale=1.0, col=STEEL, bottom=True)
    box(kk("glow"), -0.1, 0.05, 2.15, 2.27, -0.07, 0.07, scale=0.5, col=SODIUM)


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


@P.proto("tote", box=(0.6, 0.6, 0.5), reach=260, detail=True)
def _tote(kk):
    """An IBC tote: a pale tank in its cage on a pallet."""
    box(kk("trim"), -0.6, 0.6, 0.0, 0.14, -0.5, 0.5, scale=1.0, col=WOOD)
    box(kk("trim"), -0.55, 0.55, 0.14, 1.2, -0.45, 0.45, scale=1.0, col=c(0.5, 0.52, 0.5))
    for y in (0.45, 0.8, 1.2):
        box(kk("trim"), -0.58, 0.58, y, y + 0.04, -0.48, 0.48, scale=1.0, col=STEEL)


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
    box(kk("glow"), -0.08, 0.08, 2.6, 2.75, 0.82, 0.92, scale=0.5, col=GLOW["cyan"])


@P.proto("pump", box=(0.25, 0.9, 0.5), reach=400)
def _pump(kk):
    """A fuel pump on its island: the cabinet, its lit face each side."""
    box(kk("trim"), -0.28, 0.28, 0.0, 1.9, -0.5, 0.5, scale=1.0, col=c(0.3, 0.07, 0.05))
    box(kk("trim"), -0.32, 0.32, 1.9, 2.05, -0.55, 0.55, scale=1.0, col=c(0.5, 0.5, 0.48))
    for s in (1, -1):
        x = 0.285 * s
        q = [(x, 1.1, 0.4 * s), (x, 1.1, -0.4 * s), (x, 1.7, -0.4 * s), (x, 1.7, 0.4 * s)]
        quad(kk("glow"), *q, col=shade(GLASS_COOL, 2.2))
        q = [(x, 0.75, 0.3 * s), (x, 0.75, -0.3 * s), (x, 0.95, -0.3 * s), (x, 0.95, 0.3 * s)]
        quad(kk("glow"), *q, col=SODIUM)
