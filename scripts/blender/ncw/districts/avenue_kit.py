"""Kabuki Avenue's own pieces: what its lanes, its backs, its roofs, its
corners and the south street carry.

Built from the shared kit's primitives and materials only (trim with its
colour on the vertices, metal, dark, concrete, neon, glow, signs and the
shared props), so all of it merges into draws the city already makes. Every
function takes its district key: the avenue's module decides what goes in
the core (what the hero's shots see) and what streams in with the south
pack. Signs here are the street's standard signs (kit.ST_SIZES), turned at
angles to their walls the way the show hangs them (ax5YUmkWf_Y@111).
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P

UP = (0.0, 1.0, 0.0)
G0 = B.G0

# These signs take their designs at random (the site hands a face named
# st_<size>_<n> the n-th design of its size, round and round) from a stream
# of their own, so nothing built here moves the street's own count
# (kit.st_name) and with it the designs on the hero's facades.
_names = random.Random(77011)
# The core's own small signs (the hero's pavements and its west wall) draw
# from a stream of their own, so nothing added off the hero's frame changes
# the designs it shows.
CORE_NAMES = random.Random(77100)


def use_names(stream):
    """Draw sign names from `stream` from now on; returns the stream it
    replaces."""
    global _names
    old, _names = _names, stream
    return old


def st_id(size):
    return f"st_{size}_{_names.randrange(1009)}"


# A sign's design is dealt by the site where it hangs, once per name: a
# second face of the same name shows the first one's design. A name drawn
# from the streams above can be one the street's own count (kit.st_name)
# gave a sign in the hero's frame, and whichever of the two the site deals
# first decides both. What is added from round 6 on takes a name of its own,
# past every count, so it can never decide a sign it does not hang beside.
_OWN = [5000]


def own_id(size):
    _OWN[0] += 1
    return f"st_{size}_{_OWN[0]}"


class names_from:
    """With this, the signs hung take their designs' names from a stream of
    their own (seeded `seed`), so how many signs were hung before them does
    not move them."""

    def __init__(self, seed):
        self.stream = random.Random(seed)

    def __enter__(self):
        self.old = use_names(self.stream)
        return self

    def __exit__(self, *exc):
        use_names(self.old)


class own_names:
    """With this, every sign the kit's helpers hang takes its own name."""

    def __enter__(self):
        global st_id
        self.old, st_id = st_id, own_id
        return self

    def __exit__(self, *exc):
        global st_id
        st_id = self.old


# The designs of each size that are a place to eat or drink (their places in
# the site's lists, src/data/world.js STREET_SIGNS then sign-words.js): what
# a stall's or a counter's board says.
FOOD = {"ps": (1, 2, 3, 5, 8, 12), "pm": (0, 5, 14), "bs": (0, 6, 19), "bm": (0, 1, 2, 11, 12, 13, 17, 20), "bl": (5, 12, 13)}


def food_id(size):
    return f"st_{size}_{_names.choice(FOOD[size])}"

# Painted and weathered things, linear colours for the trim material.
CARDBOARD = [(0.22, 0.15, 0.08, 1), (0.26, 0.18, 0.1, 1), (0.18, 0.12, 0.07, 1)]
PLASTIC = [(0.05, 0.16, 0.22, 1), (0.25, 0.05, 0.05, 1), (0.08, 0.18, 0.08, 1), (0.22, 0.2, 0.04, 1), (0.04, 0.05, 0.16, 1)]
STEEL = (0.1, 0.105, 0.115, 1)
RUST = (0.19, 0.08, 0.04, 1)
CLOTH = [(0.32, 0.06, 0.12, 1), (0.05, 0.14, 0.26, 1), (0.3, 0.28, 0.24, 1), (0.08, 0.2, 0.12, 1), (0.28, 0.12, 0.04, 1), (0.16, 0.06, 0.24, 1)]
LANE_TUBES = ("cyan", "cyan", "green", "white", "teal", "white", "pink")


def _add(a, b, k=1.0):
    return (a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k)


def _norm(v):
    n = math.sqrt(sum(c * c for c in v)) or 1.0
    return tuple(c / n for c in v)


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def dye(colour):
    return tuple(int(NEON[colour][i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


# ---------------------------------------------------------------------------
# Signs on any plane.
# ---------------------------------------------------------------------------
def st_face(district, sid, c, right, up, w, h):
    """A standard sign's face (batched as kit.sign batches them: its index
    in the vertex colour), centred at c in the plane of right and up, facing
    right x up."""
    i = len(STREET_SIGN_IDS)
    STREET_SIGN_IDS.append(sid)
    col = ((i % 256) / 255.0, ((i // 256) % 256) / 255.0, (i // 65536) / 255.0, 1.0)
    hx = tuple(v * w / 2 for v in right)
    hy = tuple(v * h / 2 for v in up)
    a = _add(_add(c, hx, -1), hy, -1)
    b = _add(_add(c, hx, 1), hy, -1)
    cc = _add(_add(c, hx, 1), hy, 1)
    d = _add(_add(c, hx, -1), hy, 1)
    quad((district, "sign", 0), a, b, cc, d, col=col)


def blade(district, base, out, y, size, gap=0.35, both=True, bracket=True, scale=1.0, sid=None):
    """A blade standing out from a wall: `base` the point on the wall (x, z),
    `out` the direction it stands out in (x, z, unit: square to the wall or
    turned), its middle at height y; painted on both faces, in its frame,
    on a bracket back to the wall. `scale`: a standard sign made smaller or
    larger; `sid`: its name, if the caller keeps the street's count."""
    w, h = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
    dx, dz = out
    c = (base[0] + dx * (gap + w / 2), y, base[1] + dz * (gap + w / 2))
    m = (-dz, 0.0, dx)  # the face normal of the side whose right runs out from the wall
    yaw = math.atan2(-dz, dx)
    oriented_box((district, "board_frame", 0), c[0], y, c[2], w + 0.12, h + 0.14, 0.16, yaw, scale=1.0)
    sid = sid or st_id(size)
    st_face(district, sid, _add(c, m, 0.09), (dx, 0.0, dz), UP, w, h)
    if both:
        st_face(district, sid + "_b", _add(c, m, -0.09), (-dx, 0.0, -dz), UP, w, h)
    if bracket:
        top = y + h / 2 + 0.12
        pipe((district, "metal", 1), (base[0], top, base[1]), (base[0] + dx * (gap + w * 0.9), top, base[1] + dz * (gap + w * 0.9)), 0.035, segs=4)
        pipe((district, "metal", 1), (base[0], y - h / 2 + 0.2, base[1]), (base[0] + dx * gap, y - h / 2 + 0.2, base[1] + dz * gap), 0.03, segs=4)


def turned(f, angle):
    """Face f's outward normal turned `angle` toward its right-hand edge."""
    # (t runs left to right as seen from outside: Face.at's direction.)
    tx, tz = (f.p(f.at(1.0), 0)[0] - f.p(f.at(0.0), 0)[0]), (f.p(f.at(1.0), 0)[2] - f.p(f.at(0.0), 0)[2])
    ca, sa = math.cos(angle), math.sin(angle)
    return (f.nx * ca + tx * sa, f.nz * ca + tz * sa)


def face_blade(district, f, s, y, size, angle, gap=0.35, **kw):
    p = f.p(f.at(s), y, 0.0)
    blade(district, (p[0], p[2]), turned(f, angle), y, size, gap, **kw)


def a_board(district, x, z, yaw, rng):
    """A pavement A-board: two small signs leaning together, each lit."""
    c, s_ = math.cos(yaw), math.sin(yaw)
    nx, nz = s_, c
    w, h = 0.46, 1.05
    for side in (1, -1):
        foot = (x + nx * side * 0.3, G0, z + nz * side * 0.3)
        top = (x + nx * side * 0.03, G0 + h, z + nz * side * 0.03)
        up = _norm((top[0] - foot[0], top[1] - foot[1], top[2] - foot[2]))
        right = (c * side, 0.0, -s_ * side)
        mid = ((foot[0] + top[0]) / 2, (foot[1] + top[1]) / 2, (foot[2] + top[2]) / 2)
        n = _cross(right, up)
        hx, hy = tuple(v * (w / 2 + 0.04) for v in right), tuple(v * (h / 2 + 0.03) for v in up)
        back = _add(mid, n, -0.012)
        quad((district, "board_frame", 0), _add(_add(back, hx, -1), hy, -1), _add(_add(back, hx, 1), hy, -1), _add(_add(back, hx, 1), hy, 1), _add(_add(back, hx, -1), hy, 1))
        st_face(district, st_id("bs"), mid, right, up, w, h * 0.92)


def yatai(district, f, s, rng, w=2.6, colour=None, people=True):
    """A stall built against a wall, shallow enough to leave the pavement
    its two lines of walkers: a counter, a hatch lit behind it, a roof on
    four posts with its board along the front and lanterns under it, the
    keeper inside and somebody at its end."""
    colour = colour or rng.choice(("red", "amber", "pink", "cyan", "yellow"))
    wood = rng.choice(((0.2, 0.12, 0.06, 1), (0.1, 0.1, 0.11, 1), (0.16, 0.05, 0.04, 1)))
    a, b = s - w / 2, s + w / 2
    f.box((district, "door", 0), a, b, G0, 1.0, 0.6, 0.95)
    f.box((district, "metal", 1), a - 0.05, b + 0.05, 1.0, 1.06, 0.5, 1.05)
    f.quad((district, "shop", 0), a + 0.1, b - 0.1, 0.9, 2.2, 0.04, col=(rng.uniform(0.75, 1.0), rng.random(), 1.0, 1.0))
    for e in (a + 0.04, b - 0.04):
        for out in (0.06, 1.0):
            px, _, pz = f.p(f.at(e), 0.0, out)
            cylinder((district, "metal", 1), px, pz, G0, 2.4, 0.03, segs=4, cap=False)
    f.box((district, "board_frame", 0), a - 0.15, b + 0.15, 2.4, 2.48, 0.0, 1.3)
    f.box((district, "neon_" + colour, 0), a - 0.15, b + 0.15, 2.36, 2.4, 1.24, 1.3)
    # Its board along the front of the roof, a little off square.
    sh = min(0.6, w * 0.8 / ST_SIZES["ps"][0] * ST_SIZES["ps"][1])
    sw = sh / ST_SIZES["ps"][1] * ST_SIZES["ps"][0]
    c = f.p(f.at(s), 2.5 + sh / 2, 1.22)
    tx, tz = (f.p(f.at(1.0), 0)[0] - f.p(f.at(0.0), 0)[0]), (f.p(f.at(1.0), 0)[2] - f.p(f.at(0.0), 0)[2])
    f.box((district, "board_frame", 0), s - sw / 2 - 0.05, s + sw / 2 + 0.05, 2.48, 2.54 + sh, 1.12, 1.2)
    st_face(district, food_id("ps"), c, (tx, 0.0, tz), UP, sw, sh)
    n = max(2, round(w / 0.9))
    for k in range(n):
        px, _, pz = f.p(f.at(a + 0.3 + k * (w - 0.6) / (n - 1)), 0.0, 1.12)
        P.place("lantern", px, 2.16, pz, sy=0.6, sxz=0.6, district=district)
    p = f.p(f.at(s), 1.5, 1.6)
    light(district, p[0], p[1], p[2], colour if colour != "yellow" else "amber", 3.5)
    light(district, p[0], 2.0, p[2], "amber", 2.5)
    if people:
        v = f.p(f.at(s + rng.uniform(-0.4, 0.4)), 0.0, 0.32)
        stand(v[0], v[2], f.yaw, "vendor", y=G0)
        side = rng.choice((-1, 1))
        q = f.p(f.at(s + side * (w / 2 + 0.45)), 0.0, 0.75)
        stand(q[0], q[2], f.yaw + side * -math.pi / 2, rng.choice(("idle", "phone", "talk")), y=G0)


def board(district, f, s, y, size, out=0.15, roll=0.0, frame=True, scale=1.0):
    """A board flat on a wall (or hung a little off it, askew by `roll`)."""
    w, h = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
    c = f.p(f.at(s), y, out + 0.015)
    tx, tz = (f.p(f.at(1.0), 0)[0] - f.p(f.at(0.0), 0)[0]), (f.p(f.at(1.0), 0)[2] - f.p(f.at(0.0), 0)[2])
    cr, sr = math.cos(roll), math.sin(roll)
    right = (tx * cr, sr, tz * cr)
    up = (-tx * sr, cr, -tz * sr)
    if frame:
        if abs(roll) < 1e-3:
            f.box((district, "board_frame", 0), s - w / 2 - 0.07, s + w / 2 + 0.07, y - h / 2 - 0.07, y + h / 2 + 0.07, max(0.0, out - 0.12), out)
        else:
            # A frame turned in its own plane: the board's back, a slab.
            n = (f.nx, 0.0, f.nz)
            hw, hh = w / 2 + 0.07, h / 2 + 0.07
            back = _add(c, n, -0.03)
            pts = [_add(_add(back, right, sx * hw), up, sy * hh) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            quad((district, "board_frame", 0), *pts)
    st_face(district, st_id(size), c, right, up, w, h)


def stack(district, f, s, y, n, angle, out=0.9):
    """A column of small boards on a frame, one over another (the column of
    small red and orange boards the show hangs off its blocks,
    ARL_JWwKdDs@21), turned `angle` from square."""
    p = f.p(f.at(s), y, 0.0)
    d = turned(f, angle)
    for j in range(n):
        size = ("ps", "bx", "ps", "bx", "ps")[j % 5] if n > 2 else "bx"
        w, h = ST_SIZES[size]
        yy = y + j * 1.05
        blade(district, (p[0], p[2]), d, yy, size, gap=out - w / 2 if out > w / 2 else 0.2, bracket=False)
    top = y + n * 1.05
    a = (p[0], y - 0.5, p[2])
    pipe((district, "metal", 1), a, (p[0], top, p[2]), 0.04, segs=4)
    for yy in (y - 0.3, top - 0.4):
        pipe((district, "metal", 1), (p[0], yy, p[2]), (p[0] + d[0] * (out + 0.5), yy, p[2] + d[1] * (out + 0.5)), 0.03, segs=4)


def neon_bar(district, f, s0, s1, y, colour, out=0.28):
    f.box((district, "neon_" + colour, 0), s0, s1, y, y + 0.08, out - 0.04, out)


# ---------------------------------------------------------------------------
# Overhead: cables, tubes, laundry.
# ---------------------------------------------------------------------------
def cable(district, a, b, sag, r=0.022, steps=8, detail=1):
    """A cable slung from a to b (world points), sagging `sag` at its
    middle: a thin three-sided tube, seen from every side."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * math.sin(math.pi * t), a[2] + (b[2] - a[2]) * t))
    for p0, p1 in zip(pts, pts[1:]):
        pipe((district, "dark", detail), p0, p1, r, segs=3)
    return pts


def bundle(district, a, b, sag, n, rng, spread=0.18, detail=1):
    """Cables slung together, each a little apart and sagging its own."""
    for k in range(n):
        o = (rng.uniform(-spread, spread), rng.uniform(-spread, spread), rng.uniform(-spread, spread))
        cable(district, _add(a, o), _add(b, o), sag * rng.uniform(0.8, 1.25), r=rng.uniform(0.018, 0.04), detail=detail)


def tube(district, a, b, colour, power=2.6, hang=None):
    """A fluorescent tube from a to b (neon: the bake carries its light onto
    the ground under it), in a dark fitting, and its pool of light."""
    pipe((district, "neon_" + colour, 0), a, b, 0.045, segs=4, caps=True)
    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    pipe((district, "metal", 1), _add(a, UP, 0.07), _add(b, UP, 0.07), 0.03, segs=4)
    if hang:
        for p in (a, b):
            pipe((district, "dark", 1), _add(p, UP, 0.07), (p[0], hang, p[2]), 0.012, segs=3)
    light(district, m[0], m[1] - 0.3, m[2], colour, power)


def laundry(district, a, b, rng, sag=0.35):
    """A washing line across a gap, things pegged on it."""
    pts = cable(district, a, b, sag, r=0.012, steps=8)
    length = math.dist(a, b)
    s = rng.uniform(0.3, 0.8)
    dx, dz = (b[0] - a[0]) / length, (b[2] - a[2]) / length
    while s < length - 0.5:
        t = s / length
        i = min(7, int(t * 8))
        p = pts[i]
        w, h = rng.uniform(0.35, 0.8), rng.uniform(0.4, 0.95)
        col = rng.choice(CLOTH)
        q0 = (p[0], p[1] - 0.02, p[2])
        corners = [(q0[0], q0[1], q0[2]), (q0[0] + dx * w, q0[1], q0[2] + dz * w), (q0[0] + dx * w, q0[1] - h, q0[2] + dz * w), (q0[0], q0[1] - h, q0[2])]
        quad((district, "trim", 1), corners[3], corners[2], corners[1], corners[0], col=col)
        quad((district, "trim", 1), corners[2], corners[3], corners[0], corners[1], col=col)
        s += w + rng.uniform(0.15, 0.7)


def hanging_board(district, a, b, y, size, rng):
    """A sign hung on two wires from a cable across a lane, painted both
    sides, a little askew."""
    w, h = ST_SIZES[size]
    c = ((a[0] + b[0]) / 2, y, (a[2] + b[2]) / 2)
    dx, dz = _norm((b[0] - a[0], 0.0, b[2] - a[2]))[0], _norm((b[0] - a[0], 0.0, b[2] - a[2]))[2]
    roll = rng.uniform(-0.07, 0.07)
    cr, sr = math.cos(roll), math.sin(roll)
    right = (dx * cr, sr, dz * cr)
    up = (-dx * sr, cr, -dz * sr)
    n = _cross(right, up)
    yaw = math.atan2(-dz, dx)
    oriented_box((district, "board_frame", 0), c[0], y, c[2], w + 0.12, h + 0.12, 0.1, yaw, scale=1.0)
    sid = st_id(size)
    st_face(district, sid, _add(c, n, 0.06), right, up, w, h)
    st_face(district, sid + "_b", _add(c, n, -0.06), (-right[0], -right[1], -right[2]), up, w, h)
    top = max(a[1], b[1])
    for sx in (-0.4, 0.4):
        p = _add(c, right, sx * w)
        pipe((district, "dark", 1), (p[0], p[1] + h / 2, p[2]), (p[0], top, p[2]), 0.01, segs=3)


# ---------------------------------------------------------------------------
# On the ground: crates, pallets, gas, bikes, stalls, carts, kiosks.
# ---------------------------------------------------------------------------
def pallet(district, x, z, yaw, rng, load=True):
    wood = (0.2, 0.13, 0.07, 1)
    oriented_box((district, "trim", 1), x, G0 + 0.07, z, 1.2, 0.14, 1.0, yaw, scale=1.0, col=wood)
    if not load:
        return
    h = G0 + 0.14
    for k in range(rng.randrange(1, 4)):
        bw, bh, bd = rng.uniform(0.4, 0.6), rng.uniform(0.3, 0.55), rng.uniform(0.35, 0.5)
        ox, oz = rng.uniform(-0.3, 0.3), rng.uniform(-0.25, 0.25)
        cx, cz = x + math.cos(yaw) * ox + math.sin(yaw) * oz, z - math.sin(yaw) * ox + math.cos(yaw) * oz
        oriented_box((district, "trim", 1), cx, h + bh / 2, cz, bw, bh, bd, yaw + rng.uniform(-0.2, 0.2), scale=1.0, col=rng.choice(CARDBOARD))
        h += bh * rng.choice((0.0, 1.0))


def boxes_heap(district, x, z, rng, n=None):
    """Cardboard and plastic crates heaped against a wall."""
    for _ in range(n or rng.randrange(2, 6)):
        bw, bh, bd = rng.uniform(0.35, 0.7), rng.uniform(0.25, 0.6), rng.uniform(0.3, 0.6)
        col = rng.choice(CARDBOARD + PLASTIC)
        y = G0 + bh / 2 + (rng.choice((0.0, 0.0, 0.45)))
        oriented_box((district, "trim", 1), x + rng.uniform(-0.5, 0.5), y, z + rng.uniform(-0.6, 0.6), bw, bh, bd, rng.uniform(-0.5, 0.5), scale=1.0, col=col)


def gas_bottles(district, x, z, rng):
    for k in range(rng.randrange(2, 4)):
        cx, cz = x + rng.uniform(-0.3, 0.3), z + k * 0.4
        cylinder((district, "trim", 1), cx, cz, G0, G0 + 1.1, 0.15, segs=8, col=rng.choice(((0.3, 0.05, 0.04, 1), (0.05, 0.12, 0.25, 1), (0.25, 0.25, 0.27, 1))))
        cylinder((district, "metal", 1), cx, cz, G0 + 1.1, G0 + 1.25, 0.05, segs=5)


def scooter(district, x, z, yaw, rng):
    """A parked scooter: round wheels on their axles, a footboard between
    them, the leg shield raked up to the bars, the cowl and its seat, the
    bars with their mirrors, a lamp at the front and a red one behind."""
    c, s_ = math.cos(yaw), math.sin(yaw)

    def at(u, v, y):  # u along the scooter (front +), v across
        return (x + s_ * u + c * v, y, z + c * u - s_ * v)
    body = rng.choice(PLASTIC + [(0.3, 0.3, 0.32, 1), (0.42, 0.4, 0.36, 1)])
    for u in (-0.58, 0.6):
        pipe((district, "dark", 1), at(u, -0.06, G0 + 0.21), at(u, 0.06, G0 + 0.21), 0.21, segs=8, caps=True)
        pipe((district, "metal", 1), at(u, -0.08, G0 + 0.21), at(u, 0.08, G0 + 0.21), 0.07, segs=5, caps=True)
    fx, _, fz = at(0.0, 0.0, 0.0)
    oriented_box((district, "trim", 1), fx, G0 + 0.27, fz, 0.3, 0.08, 0.6, yaw, scale=1.0, col=(0.06, 0.06, 0.07, 1))
    # The leg shield: a slab raked from the footboard's front up to the bars.
    a0, a1 = at(0.32, -0.17, G0 + 0.3), at(0.32, 0.17, G0 + 0.3)
    b0, b1 = at(0.5, -0.17, G0 + 0.98), at(0.5, 0.17, G0 + 0.98)
    for pts in ((a0, a1, b1, b0), (a1, a0, b0, b1)):
        quad((district, "trim", 1), *pts, col=body)
    # The cowl over the back wheel and the seat on it.
    rx, _, rz = at(-0.42, 0.0, 0.0)
    oriented_box((district, "trim", 1), rx, G0 + 0.52, rz, 0.32, 0.36, 0.62, yaw, scale=1.0, col=body)
    sx, _, sz = at(-0.3, 0.0, 0.0)
    oriented_box((district, "dark", 1), sx, G0 + 0.76, sz, 0.28, 0.1, 0.62, yaw, scale=1.0)
    # The bars, the mirrors, the lamps.
    pipe((district, "metal", 1), at(0.42, 0.0, G0 + 0.3), at(0.5, 0.0, G0 + 1.08), 0.025, segs=4)
    pipe((district, "metal", 1), at(0.5, -0.32, G0 + 1.08), at(0.5, 0.32, G0 + 1.08), 0.018, segs=4)
    for v in (-0.26, 0.26):
        pipe((district, "metal", 1), at(0.5, v, G0 + 1.08), at(0.46, v * 1.15, G0 + 1.3), 0.008, segs=3)
        mx, my, mz = at(0.46, v * 1.15, G0 + 1.33)
        oriented_box((district, "dark", 1), mx, my, mz, 0.08, 0.06, 0.02, yaw, scale=0.5)
    lx, ly, lz = at(0.56, 0.0, G0 + 1.0)
    oriented_box((district, "glow", 0), lx, ly, lz, 0.12, 0.08, 0.03, yaw, scale=0.5, col=GLOW["white"])
    tx, ty, tz = at(-0.74, 0.0, G0 + 0.62)
    oriented_box((district, "glow", 0), tx, ty, tz, 0.1, 0.05, 0.02, yaw, scale=0.5, col=tuple(v * 0.6 for v in GLOW["red"][:3]) + (1,))


DRUMS = ((0.05, 0.12, 0.26, 1), (0.36, 0.06, 0.04, 1), (0.48, 0.2, 0.04, 1), (0.07, 0.2, 0.1, 1), (0.5, 0.38, 0.05, 1), (0.05, 0.05, 0.055, 1), (0.3, 0.3, 0.3, 1))


def steel_drum(district, x, y, z, rng, r=0.29, h=0.88):
    """A steel drum in worn paint: two rolling hoops, its lid with a bung,
    now and then a label, dirt up its foot."""
    col = rng.choice(DRUMS)
    cylinder((district, "steel", 0), x, z, y, y + h, r, segs=10, col=col)
    for yy in (y + h * 0.33, y + h * 0.66):
        cylinder((district, "steel", 1), x, z, yy - 0.025, yy + 0.025, r + 0.015, segs=10, cap=False, col=col)
    cylinder((district, "steel", 1), x, z, y + h, y + h + 0.02, r - 0.03, segs=10, col=tuple(v * 0.8 for v in col[:3]) + (1,))
    cylinder((district, "dark", 1), x + r * 0.45, z, y + h + 0.02, y + h + 0.04, 0.035, segs=5)
    cylinder((district, "trim", 1), x, z, y, y + 0.12, r + 0.004, segs=10, cap=False, col=(0.04, 0.035, 0.03, 1))
    if rng.random() < 0.5:
        a = rng.uniform(0, math.tau)
        lx, lz = x + math.cos(a) * (r + 0.008), z + math.sin(a) * (r + 0.008)
        rotated_quad((district, "trim", 1), lx, y + h * 0.5, lz, 0.26, 0.2, math.atan2(math.cos(a), math.sin(a)), col=rng.choice(((0.6, 0.6, 0.55, 1), (0.6, 0.5, 0.1, 1), (0.55, 0.55, 0.5, 1))))


def skip_bin(district, x, y, z, yaw, rng):
    """A wheeled steel bin as the kit's dumpster stands (1.8 m by 1.1, its
    front to yaw): the body in worn paint, its lid in two halves (one up
    now and then), pockets for the forks, a stencilled band, wheels."""
    col = rng.choice(((0.07, 0.2, 0.1, 1), (0.05, 0.12, 0.24, 1), (0.25, 0.26, 0.26, 1), (0.4, 0.18, 0.04, 1), (0.3, 0.05, 0.04, 1)))
    c, s_ = math.cos(yaw), math.sin(yaw)

    def at(u, v):  # u across (right), v toward the front
        return (x + c * u + s_ * v, z - s_ * u + c * v)
    bx, bz = at(0.0, 0.0)
    oriented_box((district, "steel", 0), bx, y + 0.71, bz, 1.8, 1.0, 1.1, yaw, scale=1.0, col=col)
    for u in (-0.92, 0.92):
        px, pz = at(u * 0.98, 0.0)
        oriented_box((district, "steel", 1), px, y + 0.95, pz, 0.08, 0.16, 0.7, yaw, scale=0.5, col=tuple(v * 0.7 for v in col[:3]) + (1,))
    sx, sz = at(0.0, 0.552)
    rotated_quad((district, "trim", 1), sx, y + 0.95, sz, 1.4, 0.12, yaw, col=(0.55, 0.55, 0.5, 1))
    for u in (-0.45, 0.45):
        lx, lz = at(u, 0.0)
        if u > 0 and rng.random() < 0.35:
            # Thrown back against the wall behind, upright.
            hx, hz = at(u, -0.62)
            oriented_box((district, "steel", 1), hx, y + 1.65, hz, 0.88, 0.9, 0.05, yaw, scale=1.0, col=(0.05, 0.05, 0.055, 1))
        else:
            oriented_box((district, "steel", 1), lx, y + 1.24, lz, 0.88, 0.05, 1.16, yaw, scale=1.0, col=(0.05, 0.05, 0.055, 1))
    for u in (-0.7, 0.7):
        for v in (-0.4, 0.4):
            wx, wz = at(u, v)
            cylinder((district, "dark", 1), wx, wz, y, y + 0.21, 0.1, segs=6)


def road_word(district, word, x, z, up, h=4.2, w=1.05, y=0.014, col=(0.62, 0.62, 0.58, 1), rng=None):
    """A word painted on the road for the driver coming up to it, letters
    side by side across the lane, each `h` long along the way and `w` wide,
    worn where tyres run (strokes broken)."""
    ux, uz = up
    rx, rz = -uz, ux      # the driver's right when facing up
    cw, ch = w / 3.0, h / 5.0
    n = len(word)
    gap = w * 0.4
    left = -(n * w + (n - 1) * gap) / 2
    for i, ch_ in enumerate(word):
        ox = left + i * (w + gap)
        for (a0, b0, a1, b1) in GLYPHS.get(ch_, ()):
            # A long stroke broken by wear where the tyres run.
            pieces = [(b0, b1)]
            if rng is not None and b1 - b0 >= 2 and rng.random() < 0.6:
                m = b0 + (b1 - b0) * rng.uniform(0.35, 0.65)
                g = rng.uniform(0.05, 0.25)
                pieces = [(b0, m - g / 2), (m + g / 2, b1)]
            for c0, c1 in pieces:
                pts = []
                for (aa, bb) in ((a0, c0), (a1, c0), (a1, c1), (a0, c1)):
                    u, v = ox + aa * cw, bb * ch - h / 2
                    pts.append((x + rx * u + ux * v, y, z + rz * u + uz * v))
                quad((district, "paint", 0), *pts, col=col)
                quad((district, "paint", 0), *reversed(pts), col=col)


# Block letters three cells wide and five long: strokes (x0, y0, x1, y1).
GLYPHS = {
    "S": ((0, 4, 3, 5), (0, 2, 1, 5), (0, 2, 3, 3), (2, 0, 3, 3), (0, 0, 3, 1)),
    "L": ((0, 0, 1, 5), (1, 0, 3, 1)),
    "O": ((0, 0, 1, 5), (2, 0, 3, 5), (1, 0, 2, 1), (1, 4, 2, 5)),
    "W": ((0, 0, 1, 5), (2, 0, 3, 5), (1, 0, 2, 2)),
    "T": ((0, 4, 3, 5), (1, 0, 2, 4)),
    "P": ((0, 0, 1, 5), (1, 4, 3, 5), (2, 2, 3, 4), (1, 2, 2, 3)),
    "B": ((0, 0, 1, 5), (1, 4, 3, 5), (1, 2, 3, 3), (1, 0, 3, 1), (2, 1, 2.6, 2), (2, 3, 2.6, 4)),
    "U": ((0, 0, 1, 5), (2, 0, 3, 5), (1, 0, 2, 1)),
}


def kerb_paint(district, axis, c, a0, a1, toward, rng, y_top=G0, col=(0.52, 0.4, 0.06, 1)):
    """A kerb painted yellow, worn: its face toward the road (`toward`, +1
    or -1 along the axis across it) and a strip of its top, in lengths of
    one to three metres with the paint gone between some. `axis` "z": a
    kerb running along z at x = c; "x": along x at z = c."""
    a = a0
    while a < a1:
        b = min(a1, a + rng.uniform(1.0, 3.0))
        k = tuple(v * rng.uniform(0.75, 1.05) for v in col[:3]) + (1,)
        f = c + toward * 0.004
        if axis == "z":
            pts = [(f, 0.0, a), (f, 0.0, b), (f, y_top, b), (f, y_top, a)]
            top = [(c, y_top + 0.003, a), (c, y_top + 0.003, b), (c - toward * 0.22, y_top + 0.003, b), (c - toward * 0.22, y_top + 0.003, a)]
        else:
            pts = [(a, 0.0, f), (b, 0.0, f), (b, y_top, f), (a, y_top, f)]
            top = [(a, y_top + 0.003, c), (b, y_top + 0.003, c), (b, y_top + 0.003, c - toward * 0.22), (a, y_top + 0.003, c - toward * 0.22)]
        for q in (pts, top):
            quad((district, "paint", 0), *q, col=k)
            quad((district, "paint", 0), *reversed(q), col=k)
        a = b + (rng.uniform(0.15, 0.8) if rng.random() < 0.4 else 0.02)


def stool(district, x, z, col):
    cylinder((district, "metal", 1), x, z, G0, G0 + 0.7, 0.03, segs=4, cap=False)
    cylinder((district, "trim", 1), x, z, G0 + 0.7, G0 + 0.76, 0.17, segs=8, col=col)


def stall(district, x, z, yaw, rng, colour=None, lanterns=True, stools=True, w=2.6, people=True):
    """A food stall: a counter under an awning lit through from below, a
    noren curtain along its front, a lit menu board on its roof, lanterns
    along its eaves, stools at the counter, its light on the ground in
    front. Its front toward yaw (0 faces +z)."""
    colour = colour or rng.choice(("red", "amber", "pink", "cyan", "purple"))
    c, s_ = math.cos(yaw), math.sin(yaw)
    nx, nz = s_, c  # front

    def at(u, v):  # u across (right), v toward the front
        return (x + c * u + nx * v, z - s_ * u + nz * v)
    d = 1.4
    # The counter and the stall's body behind it.
    cx, cz = at(0.0, 0.0)
    oriented_box((district, "door", 0), cx, G0 + 0.5, cz, w, 1.0, d, yaw, scale=1.0)
    tx, tz = at(0.0, d / 2 - 0.1)
    oriented_box((district, "metal", 1), tx, G0 + 1.03, tz, w + 0.1, 0.06, 0.5, yaw, scale=1.0)
    # The kitchen behind the counter, lit (a shop's warm room, read through).
    kx, kz = at(0.0, -0.1)
    rotated_quad((district, "shop", 0), kx, G0 + 1.55, kz, w - 0.3, 1.0, yaw, col=(rng.uniform(0.6, 1.0), rng.random(), 1.0, 1.0))
    # Posts and the roof.
    for u in (-w / 2 + 0.05, w / 2 - 0.05):
        for v in (-d / 2 + 0.05, d / 2 + 0.25):
            px, pz = at(u, v)
            cylinder((district, "metal", 1), px, pz, G0, G0 + 2.35, 0.035, segs=4, cap=False)
    rx, rz = at(0.0, 0.1)
    oriented_box((district, "board_frame", 0), rx, G0 + 2.4, rz, w + 0.3, 0.1, d + 0.6, yaw, scale=1.0)
    # The awning off the front, dyed, its hem lit.
    a0, a1 = at(-w / 2 - 0.15, d / 2 + 0.35), at(w / 2 + 0.15, d / 2 + 0.35)
    b0, b1 = at(-w / 2 - 0.15, d / 2 + 1.25), at(w / 2 + 0.15, d / 2 + 1.25)
    p = ((a0[0], G0 + 2.4, a0[1]), (a1[0], G0 + 2.4, a1[1]), (b1[0], G0 + 2.05, b1[1]), (b0[0], G0 + 2.05, b0[1]))
    quad((district, "awning", 1), p[0], p[1], p[2], p[3], col=dye(colour))
    quad((district, "awning", 1), p[1], p[0], p[3], p[2], col=dye(colour))
    hx, hz = at(0.0, d / 2 + 1.25)
    oriented_box((district, "neon_" + colour, 0), hx, G0 + 2.02, hz, w + 0.3, 0.06, 0.05, yaw, scale=0.5)
    # The noren: cloth panels hung from the eave, parted.
    k = 0
    u = -w / 2 + 0.1
    while u < w / 2 - 0.3:
        pw = 0.42
        qa, qb = at(u, d / 2 + 0.3), at(u + pw, d / 2 + 0.3)
        q = ((qa[0], G0 + 1.65, qa[1]), (qb[0], G0 + 1.65, qb[1]), (qb[0], G0 + 2.35, qb[1]), (qa[0], G0 + 2.35, qa[1]))
        col = dye(colour) if k % 2 == 0 else (0.85, 0.82, 0.75, 1)
        quad((district, "awning", 1), *q, col=col)
        quad((district, "awning", 1), q[1], q[0], q[3], q[2], col=col)
        u += pw + 0.04
        k += 1
    # The menu board on the roof, both sides.
    mx, mz = at(0.0, 0.2)
    my = G0 + 2.45 + 0.5
    size = "pm" if w > 3.0 else "ps"
    sw, sh = ST_SIZES[size]
    oriented_box((district, "board_frame", 0), mx, my + 0.05, mz, sw + 0.12, sh + 0.12, 0.12, yaw, scale=1.0)
    st_face(district, food_id(size), (mx + nx * 0.07, my + 0.05, mz + nz * 0.07), (c, 0.0, -s_), UP, sw, sh)
    st_face(district, food_id(size), (mx - nx * 0.07, my + 0.05, mz - nz * 0.07), (-c, 0.0, s_), UP, sw, sh)
    if lanterns:
        u = -w / 2
        while u <= w / 2 + 0.01:
            lx, lz = at(u, d / 2 + 1.15)
            P.place("lantern", lx, G0 + 1.86, lz, sy=0.55, sxz=0.55, district=district)
            u += w / max(1, round(w / 0.9))
    if stools:
        for k in range(int(w / 0.75)):
            sx, sz = at(-w / 2 + 0.4 + k * 0.75, d / 2 + 0.55)
            stool(district, sx, sz, (0.3, 0.05, 0.04, 1))
            if people and rng.random() < 0.55:
                stand(sx, sz, yaw + math.pi, "sit", y=G0 + 0.76)
    if people:
        # Whoever keeps it, behind the counter, and now and then someone
        # waiting on their feet.
        vx, vz = at(rng.uniform(-0.4, 0.4), 0.12)
        stand(vx, vz, yaw, "vendor", y=G0)
        if rng.random() < 0.5:
            cx_, cz_ = at(w / 2 + 0.35, d / 2 + 0.9)
            stand(cx_, cz_, yaw + math.pi - 0.5, rng.choice(("idle", "phone")), y=G0)
    fx, fz = at(0.0, d / 2 + 1.4)
    light(district, fx, 1.6, fz, colour if colour != "purple" else "pink", 3.2)
    light(district, fx, 2.2, fz, "amber", 2.4)


def umbrella(district, x, z, colour, r=1.25, h=2.3):
    """A market umbrella on its pole, dyed and lit from under."""
    cylinder((district, "metal", 1), x, z, G0, G0 + h + 0.25, 0.03, segs=4, cap=False)
    cylinder((district, "trim", 1), x, z, G0, G0 + 0.12, 0.25, segs=8, col=(0.05, 0.05, 0.06, 1))
    col = dye(colour)
    n = 8
    apex = (x, G0 + h + 0.45, z)
    rim = [(x + r * math.cos(i * math.tau / n), G0 + h, z + r * math.sin(i * math.tau / n)) for i in range(n)]
    for i in range(n):
        a, b = rim[i], rim[(i + 1) % n]
        poly((district, "awning", 1), [apex, b, a], [(0.5, 0), (1, 1), (0, 1)], col)
        poly((district, "awning", 1), [apex, a, b], [(0.5, 0), (0, 1), (1, 1)], col)


def a_frame(district, x, z, yaw, colour):
    """A pavement A-frame: two lit panels leaning together."""
    c, s_ = math.cos(yaw), math.sin(yaw)
    nx, nz = s_, c
    for side in (1, -1):
        bx, bz = x + nx * side * 0.32, z + nz * side * 0.32
        top = (x + nx * side * 0.04, G0 + 1.0, z + nz * side * 0.04)
        r = (c * 0.3, 0.0, -s_ * 0.3)
        a = (bx - r[0], G0, bz - r[2])
        b = (bx + r[0], G0, bz + r[2])
        cc = (top[0] + r[0], top[1], top[2] + r[2])
        d = (top[0] - r[0], top[1], top[2] - r[2])
        if side > 0:
            quad((district, "board_frame", 0), b, a, d, cc)
            quad((district, "glow", 0), _add(a, (nx, 0, nz), 0.01), _add(b, (nx, 0, nz), 0.01), _add(cc, (nx, 0, nz), 0.01), _add(d, (nx, 0, nz), 0.01), col=GLOW[colour])
        else:
            quad((district, "board_frame", 0), a, b, cc, d)
            quad((district, "glow", 0), _add(b, (-nx, 0, -nz), 0.01), _add(a, (-nx, 0, -nz), 0.01), _add(d, (-nx, 0, -nz), 0.01), _add(cc, (-nx, 0, -nz), 0.01), col=GLOW[colour])


def kiosk(district, x, z, yaw, rng, w=2.4, d=1.8):
    """A street kiosk: a lit box selling papers, drinks and snacks, boards
    on its sides, a sign on its roof, a shutter half up."""
    c, s_ = math.cos(yaw), math.sin(yaw)
    nx, nz = s_, c
    oriented_box((district, "door", 0), x, G0 + 1.25, z, w, 2.5, d, yaw, scale=1.0)
    oriented_box((district, "board_frame", 0), x, G0 + 2.58, z, w + 0.5, 0.16, d + 0.6, yaw, scale=1.0)
    # Its open front, lit.
    rotated_quad((district, "shop", 0), x + nx * (d / 2 + 0.01), G0 + 1.5, z + nz * (d / 2 + 0.01), w - 0.3, 1.3, yaw, col=(rng.uniform(0.7, 1.0), rng.random(), 1.0, 1.0))
    rotated_quad((district, "door_panel", 0), x + nx * (d / 2 + 0.015), G0 + 2.3, z + nz * (d / 2 + 0.015), w - 0.3, 0.3, yaw)
    oriented_box((district, "trim", 1), x + nx * (d / 2 + 0.2), G0 + 0.95, z + nz * (d / 2 + 0.2), w - 0.1, 0.05, 0.4, yaw, scale=1.0, col=(0.2, 0.2, 0.22, 1))
    # A board on each side, and the sign on top.
    for side in (1, -1):
        sx, sz = x + c * side * (w / 2 + 0.015), z - s_ * side * (w / 2 + 0.015)
        bw, bh = ST_SIZES["bs"]
        st_face(district, st_id("bs"), (sx, G0 + 1.3, sz), (-s_ * side * -1 * -1 if False else nx * -side, 0.0, nz * -side), UP, bw * 0.9, bh * 0.85)
    sw, sh = ST_SIZES["ps"]
    st_face(district, st_id("ps"), (x + nx * (d / 2 + 0.31), G0 + 2.95, z + nz * (d / 2 + 0.31)), (c, 0.0, -s_), UP, sw, sh)
    oriented_box((district, "board_frame", 0), x + nx * (d / 2 + 0.25), G0 + 2.95, z + nz * (d / 2 + 0.25), sw + 0.1, sh + 0.1, 0.1, yaw, scale=1.0)
    light(district, x + nx * (d / 2 + 0.8), 1.4, z + nz * (d / 2 + 0.8), "white", 2.6)


def food_cart(district, x, z, yaw, rng, colour=None):
    """A cart on two wheels, a hot plate under a lit hood, an umbrella."""
    colour = colour or rng.choice(("red", "amber", "cyan", "pink", "yellow"))
    c, s_ = math.cos(yaw), math.sin(yaw)
    nx, nz = s_, c
    oriented_box((district, "door_panel", 0), x, G0 + 0.75, z, 1.8, 0.7, 0.9, yaw, scale=1.0)
    oriented_box((district, "metal", 1), x, G0 + 1.12, z, 1.85, 0.05, 0.95, yaw, scale=1.0)
    for side in (1, -1):
        wx, wz = x + c * side * 0.7, z - s_ * side * 0.7
        oriented_box((district, "dark", 1), wx, G0 + 0.3, wz, 0.08, 0.6, 0.6, yaw, scale=0.5)
    # The hood: a glowing strip, steam over the hot plate.
    oriented_box((district, "neon_" + ("amber" if colour != "amber" else "white"), 0), x, G0 + 1.65, z + 0.0, 1.5, 0.05, 0.6, yaw, scale=0.5)
    oriented_box((district, "trim", 1), x, G0 + 1.72, z, 1.7, 0.08, 0.8, yaw, scale=0.5, col=(0.06, 0.06, 0.07, 1))
    for side in (1, -1):
        px, pz = x + c * side * 0.8, z - s_ * side * 0.8
        cylinder((district, "metal", 1), px, pz, G0 + 1.12, G0 + 1.72, 0.025, segs=4, cap=False)
    sw, sh = ST_SIZES["ps"]
    st_face(district, food_id("ps"), (x + nx * 0.47, G0 + 0.75, z + nz * 0.47), (c, 0.0, -s_), UP, 1.5, 0.6)
    umbrella(district, x - nx * 0.6, z - nz * 0.6, colour, r=1.1, h=2.2)
    light(district, x + nx * 1.0, 1.2, z + nz * 1.0, "amber", 2.6)


def vending_bank(district, x, z, yaw, n, rng):
    """Vending machines side by side against a wall, faces toward yaw."""
    c, s_ = math.cos(yaw), math.sin(yaw)
    for k in range(n):
        u = (k - (n - 1) / 2) * 1.0
        P.place(rng.choice(("vending", "vending", "vending_warm")), x + c * u, G0, z - s_ * u, yaw, district=district)


def vendor(district, x, z, yaw, rng, y=None):
    """A vending machine with something in it: a painted cabinet, a lit
    window of cans in rows, its strip of light on top, the slot and the
    tray; its back at (x, z), its face toward yaw."""
    y = G0 if y is None else y
    c, s_ = math.cos(yaw), math.sin(yaw)
    nx, nz = s_, c
    body = rng.choice(((0.22, 0.04, 0.04, 1), (0.04, 0.08, 0.2, 1), (0.2, 0.2, 0.21, 1), (0.04, 0.14, 0.12, 1), (0.22, 0.16, 0.03, 1)))
    hue = rng.choice(("cyan", "white", "pink", "amber", "green", "red"))
    if district != "avenue":
        # Off the hero's street, the kit's machine (props.py: shelves behind
        # glass, a wall of drinks, capsules, each its own front), its back
        # to the wall; the draws made as they were.
        for _ in range(18):
            rng.choice((0, 1, 2, 3, 4, 5, 6))
        P.place("vending_warm" if hue in ("pink", "amber", "red") else "vending", x + nx * 0.42, y, z + nz * 0.42, yaw, district=district)
        light(district, x + nx * 1.62, 1.2, z + nz * 1.62, hue if hue != "red" else "pink", 3.2)
        return
    d = 0.72
    cx, cz = x + nx * d / 2, z + nz * d / 2
    oriented_box((district, "trim", 0), cx, y + 0.98, cz, 1.0, 1.96, d, yaw, scale=1.0, col=body)
    fx, fz = x + nx * (d + 0.006), z + nz * (d + 0.006)
    rotated_quad((district, "glow", 0), fx, y + 1.36, fz, 0.8, 0.92, yaw, col=(0.1, 0.11, 0.13, 1))
    for row in range(3):
        for k in range(6):
            u = -0.33 + k * 0.132
            col = rng.choice((GLOW["red"], GLOW["cyan"], GLOW["amber"], GLOW["green"], GLOW["white"], GLOW["pink"], GLOW["yellow"]))
            col = tuple(v * 0.55 for v in col[:3]) + (1,)
            rotated_quad((district, "glow", 1), fx + c * u + nx * 0.004, y + 1.05 + row * 0.29, fz - s_ * u + nz * 0.004, 0.085, 0.19, yaw, col=col)
    rotated_quad((district, "neon_" + hue, 0), fx, y + 1.89, fz, 0.86, 0.07, yaw)
    rotated_quad((district, "dark", 1), fx - c * 0.1, y + 0.45, fz + s_ * 0.1, 0.5, 0.22, yaw)
    rotated_quad((district, "glow", 1), fx + c * 0.34, y + 0.75, fz - s_ * 0.34, 0.07, 0.1, yaw, col=GLOW["amber"])
    light(district, x + nx * (d + 0.9), 1.2, z + nz * (d + 0.9), hue if hue != "red" else "pink", 3.2)


def fly_posters(district, f, s, rng, n=None):
    """Posters pasted in a row on a wall, some over others: adverts with no
    words (the site's), small."""
    n = n or rng.randrange(3, 7)
    x = s
    for _ in range(n):
        w, h = rng.choice(((0.5, 0.7), (0.6, 0.85), (0.42, 0.6), (0.9, 0.6)))
        y = rng.uniform(1.25, 1.75)
        c = f.p(f.at(x + w / 2), y + h / 2, 0.02 + rng.uniform(0.0, 0.01))
        col = (rng.randrange(8) / 8.0 + 0.01, rng.randrange(8) / 8.0 + 0.01, rng.random(), 1.0)
        rotated_quad((district, "billboard", 1), c[0], c[1], c[2], w, h, f.yaw, col=col)
        x += w + rng.uniform(-0.06, 0.12)
    return x - s


def vent(district, name, x, y, z, w=0.8):
    """A floor vent breathing steam (the site draws it from the anchor)."""
    box((district, "metal", 1), x - w / 2, x + w / 2, y, y + 0.08, z - w / 2, z + w / 2, scale=0.5)
    box((district, "dark", 1), x - w / 2 + 0.06, x + w / 2 - 0.06, y + 0.08, y + 0.085, z - w / 2 + 0.06, z + w / 2 - 0.06, scale=0.5)
    empty("anchor_steam_" + name, (x, y + 0.12, z))


def duct(district, f, s0, s1, y, rng, lights=True, out=0.05):
    """A sheet-metal duct along a wall at height y, small indicator lamps
    along it (Zuzys9Ld_5M@87)."""
    f.box((district, "metal", 1), s0, s1, y, y + 0.55, out, out + 0.5)
    # Its underside, seen from the lane.
    a, b = f.at(s0), f.at(s1)
    pa, pb = f.p(a, y, out), f.p(b, y, out + 0.5)
    box((district, "metal", 1), min(pa[0], pb[0]), max(pa[0], pb[0]), y - 0.01, y, min(pa[2], pb[2]), max(pa[2], pb[2]), scale=0.5, bottom=True)
    if lights:
        s = s0 + rng.uniform(0.5, 1.5)
        while s < s1 - 0.3:
            f.box((district, "glow", 0), s - 0.04, s + 0.04, y + 0.2, y + 0.28, out + 0.5, out + 0.52, col=GLOW[rng.choice(("cyan", "cyan", "green", "red"))])
            s += rng.uniform(1.6, 3.4)


def pipes_run(district, f, s0, s1, y, rng, n=2):
    """Pipes along a wall, on brackets, one or two rising up it."""
    for k in range(n):
        yy = y + k * 0.22
        out = 0.12 + k * 0.05
        a = f.p(f.at(s0), yy, out)
        b = f.p(f.at(s1), yy, out)
        pipe((district, "metal", 1), a, b, 0.05 + 0.02 * k, segs=6)
    s = s0 + rng.uniform(0.3, 2.0)
    while s < s1:
        f.box((district, "metal", 1), s - 0.03, s + 0.03, y - 0.1, y + n * 0.22, 0.0, 0.2)
        s += rng.uniform(1.8, 3.0)


def lit_door(district, f, s, rng, hue=None, w=1.1):
    """A back door standing open on a lit room (a kitchen, a store), its
    light spilling out across the ground, a lamp over it."""
    hue = hue or rng.choice(("amber", "amber", "white", "cyan", "pink"))
    f.box((district, "trim", 0), s - 0.12, s + w + 0.12, G0, 2.45, -0.02, 0.06, col=(0.04, 0.04, 0.045, 1))
    f.quad((district, "shop", 0), s, s + w, G0, 2.3, 0.065, col=(rng.uniform(0.75, 1.0), rng.random(), 1.0, 1.0))
    # The leaf, swung open against the wall.
    f.box((district, "door", 0), s + w, s + w + 0.06, G0, 2.3, 0.07, 1.05)
    f.box((district, "neon_" + hue, 0), s + w / 2 - 0.15, s + w / 2 + 0.15, 2.55, 2.72, 0.05, 0.22)
    p = f.p(f.at(s + w / 2), 0.4, 1.3)
    light(district, p[0], p[1], p[2], hue, 4.0)
    p = f.p(f.at(s + w / 2), 2.6, 0.7)
    light(district, p[0], p[1], p[2], hue, 2.5)


def wall_lamp(district, f, s, y, hue, power=3.0):
    """A caged lamp on a wall bracket."""
    f.box((district, "neon_" + hue, 0), s - 0.15, s + 0.15, y, y + 0.22, 0.12, 0.36)
    f.box((district, "metal", 1), s - 0.2, s + 0.2, y + 0.22, y + 0.28, 0.0, 0.4)
    f.box((district, "metal", 1), s - 0.04, s + 0.04, y - 0.1, y + 0.22, 0.0, 0.14)
    p = f.p(f.at(s), y, 0.9)
    light(district, p[0], p[1], p[2], hue, power)


def poster(district, f, s, y, w, h, rng, out=0.04):
    """A lit poster panel on a wall (the shopfronts' backlit panels,
    Fn9gKhU_2_Q@69): an advert with no words, the site's."""
    c = f.p(f.at(s), y, out + 0.03)
    f.box((district, "board_frame", 0), s - w / 2 - 0.08, s + w / 2 + 0.08, y - h / 2 - 0.08, y + h / 2 + 0.08, 0.0, out)
    B.billboard(district, c[0], c[1], c[2], w, h, f.yaw, rng, frame=False)


def grille(district, f, s0, s1, y0, y1, out=0.03):
    """A security grille over a window or a door: bars."""
    f.box((district, "dark", 1), s0, s1, y0, y0 + 0.06, out, out + 0.05)
    f.box((district, "dark", 1), s0, s1, y1 - 0.06, y1, out, out + 0.05)
    s = s0
    while s <= s1 + 1e-3:
        f.box((district, "dark", 1), s - 0.015, s + 0.015, y0, y1, out, out + 0.04)
        s += 0.14


def drop_ladder(district, f, s, y0, y1):
    k = (district, "metal", 1)
    for e in (s - 0.25, s + 0.25):
        f.box(k, e - 0.02, e + 0.02, y0, y1, 1.0, 1.04)
    y = y0 + 0.3
    while y < y1:
        f.box(k, s - 0.25, s + 0.25, y, y + 0.03, 1.0, 1.04)
        y += 0.3


def roof_garden(district, x0, x1, z0, z1, top, rng):
    """A roof that is lived on: a timber deck, planters with trees, a
    pergola strung with lights, a bench, a lamp throwing its pool
    (D6ia1wjO7sg@220)."""
    box((district, "trim", 1), x0, x1, top, top + 0.08, z0, z1, scale=1.0, col=(0.16, 0.1, 0.06, 1))
    for (x, z) in ((x0 + 0.9, z0 + 0.9), (x1 - 0.9, z1 - 0.9), (x0 + 0.9, z1 - 0.9)):
        P.place("planter_tree", x, top, z, rng.uniform(0, 6.28), district=district)
    # The pergola: four posts, beams, a string of lights.
    px0, px1, pz0, pz1 = x0 + 2.0, x1 - 2.0, z0 + 2.0, z1 - 2.0
    if px1 - px0 > 1.5 and pz1 - pz0 > 1.5:
        for x in (px0, px1):
            for z in (pz0, pz1):
                box((district, "trim", 1), x - 0.07, x + 0.07, top, top + 2.5, z - 0.07, z + 0.07, scale=1.0, col=(0.12, 0.08, 0.05, 1))
        for z in (pz0, pz1):
            box((district, "trim", 1), px0 - 0.2, px1 + 0.2, top + 2.5, top + 2.62, z - 0.06, z + 0.06, scale=1.0, col=(0.12, 0.08, 0.05, 1))
        z = pz0
        while z <= pz1:
            box((district, "trim", 1), px0 - 0.1, px1 + 0.1, top + 2.62, top + 2.7, z - 0.04, z + 0.04, scale=1.0, col=(0.12, 0.08, 0.05, 1))
            z += 0.6
        for i in range(int((px1 - px0) / 0.5) + 1):
            x = px0 + i * 0.5
            for z in (pz0, pz1):
                box((district, "glow", 0), x - 0.04, x + 0.04, top + 2.42 - 0.08 * math.sin(math.pi * i * 0.5 / max(0.5, px1 - px0)), top + 2.48, z - 0.04, z + 0.04, scale=0.5, col=GLOW["amber"])
        light(district, (px0 + px1) / 2, top + 1.0, (pz0 + pz1) / 2, "amber", 3.0)
        P.place("bench", (px0 + px1) / 2, top, pz0 + 0.6, 0.0, district=district)
    P.place("lamp_short", x1 - 0.6, top, z0 + 0.6, district=district)
    light(district, x1 - 1.2, top + 1.0, z0 + 1.2, "amber", 2.0)
