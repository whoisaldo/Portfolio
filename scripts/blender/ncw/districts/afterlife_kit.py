"""The Afterlife Block's own pieces: what a Watson street carries.

Built from the shared kit's primitives and materials only (trim with its
colour on the vertices, metal, dark, concrete, neon, glow, the street's
standard signs and the shared props), so everything merges into draws the
city already makes. Every function takes its district key. The frames these
come from are the bible's for this district: a neon script sign on a bar's
corner, rust awnings, bollards and white light bars along the kerb, a rust
strip of studded paving (Zq4zTcIM0yQ@40, UKgCVtdSfE0@38), cable bundles
slung across the street at third-floor height and a skybridge
(Zq4zTcIM0yQ@44), a covered back passage under cyan tubes (Zuzys9Ld_5M@87).
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw.kit import P as P_  # world metres to Blender's frame (props shadows the name below)
from ncw import buildings as B
from ncw import props as P

G0 = B.G0
UP = (0.0, 1.0, 0.0)

# Painted and weathered things, linear colours for the trim material.
RUST = (0.30, 0.095, 0.035, 1)        # an awning's canvas, the paving strip
RUST_DARK = (0.16, 0.055, 0.025, 1)
ORANGE = (0.52, 0.17, 0.035, 1)       # the dented post
STEEL = (0.1, 0.105, 0.115, 1)
BLACK = (0.02, 0.02, 0.025, 1)
CONCRETE = (0.17, 0.175, 0.19, 1)
CONCRETE_DARK = (0.075, 0.08, 0.09, 1)
ROPE = (0.34, 0.03, 0.05, 1)
WOOD = (0.2, 0.13, 0.07, 1)
CARD = (0.24, 0.17, 0.09, 1)
PLASTIC = [(0.05, 0.16, 0.22, 1), (0.25, 0.05, 0.05, 1), (0.08, 0.18, 0.08, 1), (0.22, 0.2, 0.04, 1), (0.04, 0.05, 0.16, 1)]
GREEN_LEAF = (0.07, 0.2, 0.1, 1)

# These signs take their designs from a stream of their own (the site hands
# a face named st_<size>_<n> the n-th design of its size, round and round),
# so nothing built here moves the street's own count (kit.st_name) and with
# it the designs on another district's facades.
_ids = random.Random(85258)


def sid(size):
    return f"st_{size}_{_ids.randrange(1009)}"


def dye(colour, k=1.0):
    return tuple(k * int(NEON[colour][i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def _dir(ang):
    """A yaw as a direction on the ground: 0 is +z, pi / 2 is +x."""
    return math.sin(ang), math.cos(ang)


# ---------------------------------------------------------------------------
# Signs, at any angle to their wall.
# ---------------------------------------------------------------------------
def board(D, cx, cy, cz, size, yaw, frame=0.12, name=None):
    """One of the street's standard signs as a board facing `yaw`, in its
    frame (a slab behind it `frame` thick)."""
    w, h = ST_SIZES[size]
    nx, nz = _dir(yaw)
    if frame:
        oriented_box((D, "board_frame", 0), cx - nx * (frame / 2 + 0.015), cy, cz - nz * (frame / 2 + 0.015), w + 0.14, h + 0.14, frame, yaw, scale=1.0)
    sign(name or sid(size), cx, cy, cz, w, h, yaw, district=D, label=False)


def blade(D, bx, bz, y, size, ang, gap=0.35, bracket=True):
    """A blade standing out from a wall at (bx, bz) in the direction `ang`
    (a yaw: square to the wall or turned from it), its middle at y: painted
    on both faces, in its frame, on a bracket back to the wall."""
    w, h = ST_SIZES[size]
    dx, dz = _dir(ang)
    cx, cz = bx + dx * (gap + w / 2), bz + dz * (gap + w / 2)
    yaw = math.atan2(-dz, dx)
    nx, nz = -dz, dx
    oriented_box((D, "board_frame", 0), cx, y, cz, w + 0.12, h + 0.14, 0.16, yaw, scale=1.0)
    s = sid(size)
    sign(s, cx + nx * 0.09, y, cz + nz * 0.09, w, h, yaw, district=D, label=False)
    sign(s + "_b", cx - nx * 0.09, y, cz - nz * 0.09, w, h, yaw + math.pi, district=D, label=False)
    if bracket:
        top = y + h / 2 + 0.11
        pipe((D, "metal", 1), (bx, top, bz), (bx + dx * (gap + w * 0.9), top, bz + dz * (gap + w * 0.9)), 0.035, segs=4)
        pipe((D, "metal", 1), (bx, y - h / 2 + 0.2, bz), (bx + dx * gap, y - h / 2 + 0.2, bz + dz * gap), 0.03, segs=4)


def stack(D, bx, bz, y, n, ang, out=0.9, sizes=("ps", "bx", "ps", "ps", "bx")):
    """A column of small boards one over another on a post off the wall (the
    column of small red and orange boards the show hangs off its blocks)."""
    dx, dz = _dir(ang)
    for j in range(n):
        size = sizes[j % len(sizes)]
        w, _ = ST_SIZES[size]
        blade(D, bx, bz, y + j * 1.05, size, ang, gap=max(0.2, out - w / 2), bracket=False)
    top = y + n * 1.05 - 0.4
    for yy in (y - 0.35, top):
        pipe((D, "metal", 1), (bx, yy, bz), (bx + dx * (out + 0.6), yy, bz + dz * (out + 0.6)), 0.03, segs=4)
    pipe((D, "metal", 1), (bx + dx * 0.12, y - 0.5, bz + dz * 0.12), (bx + dx * 0.12, top + 0.2, bz + dz * 0.12), 0.04, segs=4)


def script(D, cx, cy, cz, w, h, yaw, colour, seed, lines=1, backing=True, underline="white", r=0.05):
    """A neon sign in handwriting with no words in it: a cursive line of
    loops, tall and short, bent from one tube, with a swash under it; on a
    dark board (the pink script over the corner bar, Zq4zTcIM0yQ@40)."""
    rr = random.Random(seed)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = _dir(yaw)

    def at(u, v, t=0.09):
        return (cx + rx * u + nx * t, cy + v, cz + rz * u + nz * t)

    if backing:
        oriented_box((D, "board_frame", 0), cx - nx * 0.05, cy, cz - nz * 0.05, w + 0.5, h + 0.45, 0.14, yaw, scale=1.0)
    lh = h / lines * (0.62 if underline else 0.8)
    for li in range(lines):
        vc = (h / 2 - (li + 0.5) * h / lines) + (0.08 * h if underline else 0.0)
        span = w * (0.9 if li == 0 else 0.72)
        n = max(3, round(span / (lh * 0.62)))
        pts = []
        steps = 8
        for k in range(n):
            tall = rr.random() < 0.4
            amp = lh / 2 * (1.0 if tall else rr.uniform(0.45, 0.62))
            for i in range(steps):
                t = (k + i / steps)
                ph = t * math.tau
                u = -span / 2 + span * (t + 0.5) / n - 0.34 * (span / n) * math.sin(ph) * 1.9
                v = vc - (lh / 2 - amp) - amp * math.cos(ph)
                pts.append(at(u + 0.12 * (v - vc), v))
        key = (D, "neon_" + colour, 0)
        for p0, p1 in zip(pts, pts[1:]):
            pipe(key, p0, p1, r, segs=3)
    if underline:
        # The swash: a long shallow curve under the words, in a second colour.
        key = (D, "neon_" + underline, 0)
        v0 = -h / 2 + 0.12 * h
        pts = [at(-w * 0.42 + w * 0.84 * i / 10, v0 + 0.07 * h * math.sin(i / 10 * math.pi)) for i in range(11)]
        for p0, p1 in zip(pts, pts[1:]):
            pipe(key, p0, p1, r * 0.9, segs=3)


def cross(D, cx, cy, cz, size, yaw, colour="green", box_=True):
    """A clinic's cross in light, on a square box, both faces."""
    nx, nz = _dir(yaw)
    if box_:
        oriented_box((D, "board_frame", 0), cx, cy, cz, size + 0.2, size + 0.2, 0.2, yaw, scale=1.0)
    for sd in (1, -1):
        ox, oz = cx + nx * 0.11 * sd, cz + nz * 0.11 * sd
        fy = yaw if sd > 0 else yaw + math.pi
        rotated_quad((D, "neon_" + colour, 0), ox, cy, oz, size * 0.82, size * 0.26, fy)
        rotated_quad((D, "neon_" + colour, 0), ox, cy, oz, size * 0.26, size * 0.82, fy)


def poster(D, f, s, y, w, h, r, out=0.06):
    """A lit poster in a frame on a wall: an advert with no words, the
    site's own (the billboard material), a hand's breadth proud."""
    f.box((D, "board_frame", 0), s - w / 2 - 0.08, s + w / 2 + 0.08, y - h / 2 - 0.08, y + h / 2 + 0.08, 0.0, out)
    col = (r.randrange(8) / 8.0 + 0.01, r.randrange(8) / 8.0 + 0.01, r.random(), 1.0)
    f.quad((D, "billboard", 0), s - w / 2, s + w / 2, y - h / 2, y + h / 2, out + 0.012, uvs=((0, 0), (1, 0), (1, 1), (0, 1)), col=col)


def vpoly(key, pts, cols):
    """A polygon with a colour for each of its corners."""
    b = batches[key]
    base = len(b.verts)
    b.verts.extend(P_(*p) for p in pts)
    b.faces.append(tuple(range(base, base + len(pts))))
    b.uvs.extend([(0.0, 0.0)] * len(pts))
    b.cols.extend(cols)


def pool(D, x, z, y, hue, r=4.0, k=0.12, segs=12, lift=0.2):
    """The pool of light a lamp throws on a roof or a deck, drawn: a soft
    disc of the lamp's colour fading to nothing at its edge. (The light
    the site bakes onto the ground falls off with height, and tar gives
    none of it back: a roof's lamps would light nothing.)"""
    c = GLOW[hue]
    core = (c[0] * k, c[1] * k, c[2] * k, 1.0)
    mid = (c[0] * k * 0.4, c[1] * k * 0.4, c[2] * k * 0.4, 1.0)
    rim = (0.004, 0.004, 0.005, 1.0)
    yy = y + lift
    ring = [(math.cos(i * math.tau / segs), math.sin(i * math.tau / segs)) for i in range(segs)]
    key = (D, "glow", 0)
    for i in range(segs):
        (c0, s0), (c1, s1) = ring[i], ring[(i + 1) % segs]
        a0, a1 = (x + c0 * r * 0.4, yy, z + s0 * r * 0.4), (x + c1 * r * 0.4, yy, z + s1 * r * 0.4)
        b0, b1 = (x + c0 * r, yy, z + s0 * r), (x + c1 * r, yy, z + s1 * r)
        vpoly(key, [(x, yy, z), a1, a0], [core, mid, mid])
        vpoly(key, [a0, a1, b1, b0], [mid, mid, rim, rim])


# ---------------------------------------------------------------------------
# Overhead: cables, tubes.
# ---------------------------------------------------------------------------
def cable(D, a, b, sag, r=0.025, steps=8, detail=1):
    """A cable slung from a to b (world points), sagging `sag` in the
    middle: a thin three-sided tube, seen from every side."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * math.sin(math.pi * t), a[2] + (b[2] - a[2]) * t))
    for p0, p1 in zip(pts, pts[1:]):
        pipe((D, "dark", detail), p0, p1, r, segs=3)
    return pts


def bundle(D, a, b, sag, n, rng, spread=0.22, lead=2):
    """A bundle of cables slung together, each a little apart with its own
    sag; the first `lead` are thick and stay on a phone, the rest are
    detail. Now and then a junction box hangs in the middle."""
    for k in range(n):
        o = (rng.uniform(-spread, spread), rng.uniform(-spread, spread), rng.uniform(-spread, spread))
        aa = (a[0] + o[0], a[1] + o[1], a[2] + o[2])
        bb = (b[0] + o[0], b[1] + o[1], b[2] + o[2])
        thick = k < lead
        cable(D, aa, bb, sag * rng.uniform(0.8, 1.3), r=rng.uniform(0.045, 0.07) if thick else rng.uniform(0.02, 0.035),
              steps=8 if thick else 6, detail=0 if thick else 1)
    if rng.random() < 0.5:
        t = rng.uniform(0.3, 0.7)
        x, z = a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t
        y = a[1] + (b[1] - a[1]) * t - sag * math.sin(math.pi * t)
        box((D, "dark", 1), x - 0.18, x + 0.18, y - 0.42, y - 0.06, z - 0.14, z + 0.14, scale=0.5)
        box((D, "glow", 1), x - 0.03, x + 0.03, y - 0.36, y - 0.3, z + 0.14, z + 0.15, scale=0.5, col=GLOW[rng.choice(("red", "green", "amber"))])


def tube(D, a, b, colour, power=2.6, fitting=True):
    """A fluorescent tube from a to b (neon: the bake carries its light onto
    the ground under it), in its fitting, and its pool of light."""
    pipe((D, "neon_" + colour, 0), a, b, 0.045, segs=4, caps=True)
    if fitting:
        pipe((D, "metal", 1), (a[0], a[1] + 0.07, a[2]), (b[0], b[1] + 0.07, b[2]), 0.035, segs=4)
    light(D, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.3, (a[2] + b[2]) / 2, colour, power)


def wall_lamp(D, f, s, y, hue, power=3.0, out=0.3):
    """A caged lamp on a wall bracket."""
    f.box((D, "neon_" + hue, 0), s - 0.14, s + 0.14, y - 0.1, y + 0.1, 0.06, out)
    f.box((D, "metal", 1), s - 0.18, s + 0.18, y + 0.1, y + 0.16, 0.0, out + 0.04)
    light(D, *f.p(f.at(s), y - 0.1, 0.8), hue, power)


# ---------------------------------------------------------------------------
# What hangs on a wall.
# ---------------------------------------------------------------------------
def awning(D, f, s0, s1, col=RUST, out=1.5, y=3.4, drop=0.5, valance=0.28, hem=None, detail=1):
    """A canvas awning off a wall: its sloped cloth dyed `col` and lit
    through from the shop under it, a valance hanging from its front edge,
    two arms back to the wall (the rust awning over the bar's door)."""
    a, b = f.at(s0), f.at(s1)
    k = (D, "awning", detail)
    p = (f.p(a, y + drop, 0.0), f.p(b, y + drop, 0.0), f.p(b, y, out), f.p(a, y, out))
    quad(k, p[0], p[1], p[2], p[3], col=col)
    quad(k, p[1], p[0], p[3], p[2], uvs=((1, 0), (0, 0), (0, 1), (1, 1)), col=col)
    v = (f.p(a, y - valance, out), f.p(b, y - valance, out))
    dark = (col[0] * 0.7, col[1] * 0.7, col[2] * 0.7, 1)
    quad(k, v[0], v[1], p[2], p[3], col=dark)
    quad(k, v[1], v[0], p[3], p[2], uvs=((1, 0), (0, 0), (0, 1), (1, 1)), col=dark)
    for e in (s0 + 0.05, s1 - 0.05):
        pipe((D, "metal", 1), f.p(f.at(e), y - 0.25, 0.0), f.p(f.at(e), y, out), 0.025, segs=3)
    if hem:
        f.box((D, "neon_" + hem, 0), s0, s1, y - valance - 0.05, y - valance, out - 0.03, out + 0.01)


def duct(D, f, s0, s1, y, rng, lights=True, out=0.04, h=0.38, d=0.42):
    """A sheet-metal duct along a wall at height y, small indicator lamps
    along it (the passage's ducts and their cyan lights, Zuzys9Ld_5M@87)."""
    f.box((D, "metal", 1), s0, s1, y, y + h, out, out + d)
    s = s0 + 0.6
    while s < s1 - 0.3:
        f.box((D, "dark", 1), s - 0.03, s + 0.03, y - 0.02, y + h + 0.02, out, out + d + 0.02)
        s += 1.8
    if lights:
        s = s0 + rng.uniform(0.6, 2.0)
        while s < s1 - 0.3:
            f.box((D, "glow", 1), s - 0.05, s + 0.05, y + 0.12, y + 0.2, out + d, out + d + 0.015, col=GLOW[rng.choice(("cyan", "cyan", "green", "red"))])
            s += rng.uniform(2.0, 4.5)


def pipes(D, f, s0, s1, y, rng, n=2):
    """Pipes along a wall on brackets, one of them turning up it."""
    for k in range(n):
        yy = y + k * 0.22
        rad = rng.choice((0.05, 0.07, 0.09))
        pipe((D, "metal", 1), f.p(f.at(s0), yy, 0.14 + rad), f.p(f.at(s1), yy, 0.14 + rad), rad, segs=5)
    s = rng.uniform(s0 + 0.5, s1 - 0.5)
    pipe((D, "metal", 1), f.p(f.at(s), y, 0.16), f.p(f.at(s), y + rng.uniform(3.0, 8.0), 0.16), 0.06, segs=5)


def lit_door(D, f, s, hue, w=1.1, h=2.25, power=3.5, ajar=True):
    """A door standing open on a lit room, its light on the ground outside
    (the green door on the dark street, UKgCVtdSfE0@38)."""
    f.box((D, "metal", 1), s - w / 2 - 0.08, s + w / 2 + 0.08, G0, h + 0.1, 0.0, 0.06)
    f.quad((D, "neon_" + hue, 0), s - w / 2, s + w / 2, G0, h, 0.07)
    if ajar:
        # The leaf, swung out at an angle.
        a = f.p(f.at(s - w / 2), G0, 0.07)
        ang = f.yaw + 0.5
        dx, dz = _dir(ang)
        b = (a[0] + dx * w * 0.9, G0, a[2] + dz * w * 0.9)
        for q in (((a[0], G0, a[2]), b, (b[0], h, b[2]), (a[0], h, a[2])), (b, (a[0], G0, a[2]), (a[0], h, a[2]), (b[0], h, b[2]))):
            quad((D, "door", 0), *q)
    light(D, *f.p(f.at(s), 1.2, 1.2), hue, power)


def shutter(D, f, s0, s1, h=3.0, lamp="white"):
    """A roller shutter, down, its box over it and a lamp."""
    f.quad((D, "door_panel", 0), s0, s1, G0, h, 0.03)
    f.box((D, "metal", 1), s0 - 0.05, s1 + 0.05, h, h + 0.3, 0.0, 0.25)
    if lamp:
        m = (s0 + s1) / 2
        f.box((D, "glow", 0), m - 0.2, m + 0.2, h + 0.42, h + 0.52, 0.05, 0.2, col=GLOW[lamp])
        light(D, *f.p(f.at(m), h + 0.4, 0.8), lamp, 2.0)


def grille(D, f, s0, s1, y0, y1, out=0.05, step=0.16):
    """Bars over an opening."""
    s = s0
    while s <= s1 + 1e-6:
        f.box((D, "metal", 1), s - 0.012, s + 0.012, y0, y1, out, out + 0.025)
        s += step
    for y in (y0, y1 - 0.03):
        f.box((D, "metal", 1), s0, s1, y, y + 0.03, out, out + 0.03)


def ladder(D, f, s, y0, y1, out=0.18):
    """A cat ladder up a wall, in its cage of hoops above head height."""
    for e in (s - 0.24, s + 0.24):
        f.box((D, "metal", 1), e - 0.025, e + 0.025, y0, y1, out, out + 0.05)
    y = y0 + 0.3
    while y < y1:
        f.box((D, "metal", 1), s - 0.24, s + 0.24, y, y + 0.03, out + 0.01, out + 0.04)
        y += 0.32


# ---------------------------------------------------------------------------
# The kerb and the pavement.
# ---------------------------------------------------------------------------
def kerb_bars(D, x_face, toward, z0, z1, step=4.0, length=1.7, skip=(), colour="white"):
    """White light bars set into the kerb's face at intervals (the Watson
    kerb, UKgCVtdSfE0@38): `x_face` the face's x, `toward` +1 if the road is
    to +x of it."""
    z = z0
    xa, xb = sorted((x_face - toward * 0.01, x_face + toward * 0.035))
    while z + length <= z1:
        if not any(a - length < z < b for a, b in skip):
            box((D, "neon_" + colour, 0), xa, xb, 0.035, 0.115, z, z + length, scale=1.0)
        z += step


def bollards(x, z0, z1, step=2.6, skip=(), district=None):
    z = z0
    while z <= z1:
        if not any(a < z < b for a, b in skip):
            P.place("bollard", x, G0, z, district=district)
        z += step


def tactile(D, x0, x1, z0, z1, col=RUST, seam=3.2):
    """The rust strip of studded paving along the kerb: its colour, a dark
    joint every slab and a seam run on the diagonal across each."""
    y = G0 + 0.007
    quad((D, "trim", 0), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0), col=col)
    z = z0 + seam
    k = 0
    while z < z1:
        quad((D, "trim", 1), (x0, y + 0.003, z + 0.025), (x1, y + 0.003, z + 0.025), (x1, y + 0.003, z - 0.025), (x0, y + 0.003, z - 0.025), col=RUST_DARK)
        if k % 2 == 0 and z + seam < z1:
            za, zb = z + 0.3, z + seam - 0.3
            quad((D, "trim", 1), (x0, y + 0.003, za + 0.04), (x1, y + 0.003, zb + 0.04), (x1, y + 0.003, zb - 0.04), (x0, y + 0.003, za - 0.04), col=RUST_DARK)
        z += seam
        k += 1


def dented_post(D, x, z, lean=0.16, yaw=0.6):
    """The dented orange post at the kerb, its cap gone and its wires out."""
    dx, dz = _dir(yaw)
    a, b = (x, G0, z), (x + dx * 0.05, 1.05, z + dz * 0.05)
    c = (x + dx * (0.05 + lean), 2.3, z + dz * (0.05 + lean))
    for p0, p1, rad in ((a, b, 0.11), (b, c, 0.105)):
        pipe((D, "trim", 0), p0, p1, rad, segs=6, col=ORANGE, caps=True)
    cylinder((D, "trim", 0), x, z, G0, G0 + 0.12, 0.2, segs=8, col=RUST_DARK)
    for k, ang in enumerate((0.3, 2.2, 4.0)):
        ex, ez = _dir(ang)
        pipe((D, "dark", 1), c, (c[0] + ex * 0.22, c[1] + 0.2 - k * 0.08, c[2] + ez * 0.22), 0.012, segs=3)


def stanchions(D, pts, rope=ROPE, h=0.95):
    """A queue's posts and the rope between them."""
    for (x, z) in pts:
        cylinder((D, "metal", 0), x, z, G0, G0 + h, 0.035, segs=6)
        cylinder((D, "metal", 0), x, z, G0, G0 + 0.04, 0.16, segs=8)
        cylinder((D, "glow", 1), x, z, G0 + h, G0 + h + 0.05, 0.05, segs=6, col=GLOW["amber"])
    for (xa, za), (xb, zb) in zip(pts, pts[1:]):
        prev = None
        for i in range(5):
            t = i / 4
            p = (xa + (xb - xa) * t, G0 + h - 0.06 - 0.16 * math.sin(math.pi * t), za + (zb - za) * t)
            if prev:
                pipe((D, "trim", 1), prev, p, 0.022, segs=3, col=rope)
            prev = p


def steam(name, x, y, z, D=None, grate=True):
    """A vent breathing steam into the street's light (the site draws a
    plume at every anchor_steam_*)."""
    if grate and D:
        box((D, "metal", 1), x - 0.4, x + 0.4, y - 0.04, y + 0.02, z - 0.4, z + 0.4, scale=0.5)
    empty(f"anchor_steam_{name}", (x, y + 0.1, z))


# ---------------------------------------------------------------------------
# Things that stand about.
# ---------------------------------------------------------------------------
def crates(D, x, z, rng, n=None, y=G0):
    """Crates and cartons heaped against a wall."""
    for k in range(n or rng.randrange(2, 5)):
        w, h, d = rng.uniform(0.4, 0.75), rng.uniform(0.3, 0.6), rng.uniform(0.35, 0.6)
        ox, oz = rng.uniform(-0.6, 0.6), rng.uniform(-0.4, 0.4)
        yy = y + (0.0 if k < 2 else rng.choice((0.0, 0.42)))
        oriented_box((D, "trim", 1), x + ox, yy + h / 2, z + oz, w, h, d, rng.uniform(0, 3.1), scale=1.0, col=rng.choice([CARD, WOOD] + PLASTIC))


def kegs(D, x, z, rng, n=4, y=G0):
    """Beer kegs by a bar's back door."""
    for k in range(n):
        kx, kz = x + (k % 2) * 0.46 + rng.uniform(-0.04, 0.04), z + (k // 2) * 0.46
        cylinder((D, "metal", 1), kx, kz, y, y + 0.6, 0.2, segs=8)
        cylinder((D, "dark", 1), kx, kz, y + 0.6, y + 0.63, 0.21, segs=8, cap=False)


def tyres(D, x, z, n=3, y=G0):
    for j in range(n):
        cylinder((D, "dark", 1), x, z, y + j * 0.26, y + j * 0.26 + 0.24, 0.36, segs=10)


def planter(D, x0, x1, z0, z1, rng, y=0.0, h=0.55, shrubs=True, lit=None):
    """A planter box with shrubs, a strip of light along its rim now and
    then (the roof terraces' square planters, D6ia1wjO7sg@220)."""
    box((D, "concrete", 0), x0, x1, y, y + h, z0, z1, scale=1.0)
    if lit:
        box((D, "neon_" + lit, 0), x0 - 0.02, x1 + 0.02, y + h - 0.07, y + h - 0.03, z0 - 0.02, z1 + 0.02, scale=1.0)
    if shrubs:
        n = max(1, int(max(x1 - x0, z1 - z0) / 0.9))
        for k in range(n):
            t = (k + 0.5) / n
            cx = x0 + (x1 - x0) * (t if x1 - x0 > z1 - z0 else 0.5)
            cz = z0 + (z1 - z0) * (0.5 if x1 - x0 > z1 - z0 else t)
            s = min(x1 - x0, z1 - z0) * rng.uniform(0.7, 1.0)
            oriented_box((D, "trim", 1), cx, y + h + s * 0.35, cz, s, s * 0.7, s, rng.uniform(0, 1.5), scale=1.0, col=GREEN_LEAF)


def rail(D, pts, y, h=1.05, posts=2.0, thick=True):
    """A roof's rail along a line of points: thick square posts and two
    rails (qgx_AjoPTT0@5)."""
    for (xa, za), (xb, zb) in zip(pts, pts[1:]):
        length = math.hypot(xb - xa, zb - za)
        n = max(1, round(length / posts))
        for i in range(n + 1):
            t = i / n
            x, z = xa + (xb - xa) * t, za + (zb - za) * t
            w = 0.07 if thick else 0.035
            box((D, "metal", 1), x - w, x + w, y, y + h, z - w, z + w, scale=0.5)
        for yy, rad in ((y + h, 0.04), (y + h * 0.55, 0.028)):
            pipe((D, "metal", 1), (xa, yy, za), (xb, yy, zb), rad, segs=4)


def arm_lamp(D, x, z, y, yaw, h=5.2, arm=2.2, hue="cyan", power=8.0):
    """A tall roof lamp with a long horizontal arm, throwing a pool of
    light straight down (D6ia1wjO7sg@220)."""
    dx, dz = _dir(yaw)
    cylinder((D, "metal", 1), x, z, y, y + h, 0.06, segs=6)
    pipe((D, "metal", 1), (x, y + h - 0.05, z), (x + dx * arm, y + h - 0.05, z + dz * arm), 0.045, segs=4)
    hx, hz = x + dx * (arm - 0.3), z + dz * (arm - 0.3)
    oriented_box((D, "neon_" + hue, 0), hx, y + h - 0.14, hz, 0.22, 0.06, 0.7, yaw, scale=0.5)
    light(D, hx, y + h - 0.4, hz, hue, power)
    if y > 6.0:
        pool(D, hx, hz, y, hue, r=4.2)


# ---------------------------------------------------------------------------
# Building pieces.
# ---------------------------------------------------------------------------
def fbox(f, key, s0, s1, y0, y1, w0, w1, col=(1, 1, 1, 1), scale=1.0, bottom=False):
    """Face.box with a bottom when it is asked for (a slab seen from under)."""
    a, b = f.at(s0), f.at(s1)
    pa, pb = f.p(a, y0, w0), f.p(b, y1, w1)
    box(key, min(pa[0], pb[0]), max(pa[0], pb[0]), y0, y1, min(pa[2], pb[2]), max(pa[2], pb[2]), scale=scale, col=col, bottom=bottom)


def ceiling(key, x0, x1, z0, z1, y, col=(1, 1, 1, 1), scale=2.0):
    """A horizontal rectangle facing down: a soffit, a ceiling."""
    s = 1.0 / scale
    pts = ((x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1))
    quad(key, *pts, uvs=tuple((p[0] * s, p[2] * s) for p in pts), col=col)


def downlight(D, x, z, y, hue="white", size=0.45, power=2.0, pool=True):
    """A square light let into a soffit, and its pool on the ground."""
    h = size / 2
    ceiling((D, "glow", 0), x - h, x + h, z - h, z + h, y - 0.012, col=GLOW[hue])
    if pool:
        light(D, x, y - 0.4, z, hue, power)


def dress(D, f, y1, r, st, tint, signs=True, fascia=True, escape=None):
    """What a street face carries over its shops (as buildings.building
    hangs it): the fascia's ledge, ledges on the floor lines, a cornice,
    balconies and air conditioners by bay, a downpipe, a fire escape, the
    signs. For a face of a mass built elsewhere."""
    tcol = B.TRIM[tint]
    if fascia:
        f.ledge((D, "trim", 0), 0.0, f.width, SHOP_H - 0.05, 0.3, 0.35, tcol)
    every = r.choice(st["ledge_every"]) if isinstance(st["ledge_every"], tuple) else st["ledge_every"]
    y = SHOP_H + CELL_H
    while every and y < y1 - 1.0:
        f.ledge((D, "trim", 0), 0.0, f.width, y - 0.22, 0.22, st["ledge_out"], tcol)
        y += CELL_H * every
    if r.random() < st["cornice"]:
        f.ledge((D, "trim", 0), 0.0, f.width, y1 - 0.55, 0.55, 0.35, tcol)
    bays = max(1, round(f.width / CELL_W))
    bw = f.width / bays
    for fl in range(int((y1 - SHOP_H) / CELL_H)):
        fy = SHOP_H + fl * CELL_H
        for b in range(bays):
            s = (b + 0.5) * bw
            roll = r.random()
            if fl > 0 and roll < st["balcony"] and fy + 1.2 < y1:
                B.balcony(D, f, s - bw / 2 + 0.25, s + bw / 2 - 0.25, fy, tint, glass=r.random() < st["balcony_glass"])
            elif roll < st["balcony"] + st["ac"]:
                ax, ay, az = f.p(f.at(s + r.uniform(-0.6, 0.6)), fy + 0.05, 0.0)
                P.place("ac_wall", ax, ay, az, f.yaw, district=D)
    if r.random() < st["pipes"] and y1 > 8:
        s = r.choice((0.35, f.width - 0.35))
        px_, py_, pz_ = f.p(f.at(s), 0.0, 0.0)
        P.place("pipe_v", px_, py_, pz_, f.yaw, sy=y1, district=D)
    if escape is not None:
        B.fire_escape(D, f, escape, SHOP_H + 0.5, min(y1 - 3.0, 40.0))
    if signs:
        B.face_signs(D, f, r, 0.5, f.width - 0.5, y1, st["signs"], st["sign_colours"])


def ribs(D, f, s0, s1, y0, y1, w, step=0.8, out=0.07, col=BLACK, strips=(), strip="cyan"):
    """A ribbed wall: vertical ribs standing proud of it, and now and then
    a thin strip of light let in between two (the club's door,
    BnnbP7pCIvQ@24)."""
    n = max(1, round((s1 - s0) / step))
    for i in range(n):
        s = s0 + (i + 0.5) * (s1 - s0) / n
        fbox(f, (D, "trim", 1), s - 0.11, s + 0.11, y0, y1, w, w + out, col=col)
    for i in strips:
        s = s0 + i * (s1 - s0) / n
        fbox(f, (D, "neon_" + strip, 0), s - 0.035, s + 0.035, y0 + 0.25, y1 - 0.25, w, w + 0.03)


# ---------------------------------------------------------------------------
# Roofs. Seen from the rooftop, from the braindance's cameras and from a
# flying car, a roof is its edge drawn in light, the pools its lamps throw
# on it, and what stands in them: a deck with a rail and planters
# (D6ia1wjO7sg@220), plant and tanks, a landing pad's ring of lamps,
# skylights, a billboard on legs.
# ---------------------------------------------------------------------------
def parapet(D, x0, x1, z0, z1, y, tint=5, line=None, h=0.95, t=0.3, sides="nsew", deck="concrete"):
    """A roof's parapet (the sides named: n is -z, e is +x) and, with
    `line`, a thin line of light round its top. `deck`: the roof inside it
    laid in concrete (which takes its lamps' light; tar does not)."""
    col = B.TRIM[tint]
    for name, (a0, a1, b0, b1) in (("s", (x0, x1, z1 - t, z1)), ("n", (x0, x1, z0, z0 + t)), ("w", (x0, x0 + t, z0 + t, z1 - t)),
                                   ("e", (x1 - t, x1, z0 + t, z1 - t))):
        if name in sides:
            box((D, "trim", 0), a0, a1, y, y + h, b0, b1, scale=1.5, col=col)
    if line:
        walls((D, "neon_" + line, 0), [(x0 - 0.04, z1 + 0.04), (x1 + 0.04, z1 + 0.04), (x1 + 0.04, z0 - 0.04), (x0 - 0.04, z0 - 0.04)],
              y + h - 0.11, y + h - 0.02, (1, 1, 1, 1))
    if deck:
        slab(D, x0 + t, x1 - t, z0 + t, z1 - t, y, deck, lift=0.1, scale=3.0)
    B.ROOFS.append((D, x0, x1, z0, z1, y))


def slab(D, x0, x1, z0, z1, y, mat="sidewalk", lift=0.17, scale=2.0, col=(1, 1, 1, 1)):
    """A paved patch on a roof: a deck, a pad."""
    s = 1.0 / scale
    pts = ((x0, y + lift, z1), (x1, y + lift, z1), (x1, y + lift, z0), (x0, y + lift, z0))
    quad((D, mat, 0), *pts, uvs=tuple((p[0] * s, -p[2] * s) for p in pts), col=col)


def bulbs(D, a, b, sag=0.6, n=9, hue="amber", lit=True, floor=None):
    """A string of bulbs from a to b; over a roof at `floor`, their pool on
    it."""
    prev = None
    for i in range(n + 1):
        t = i / n
        p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * math.sin(math.pi * t), a[2] + (b[2] - a[2]) * t)
        if prev:
            pipe((D, "dark", 1), prev, p, 0.012, segs=3)
        if 0 < i < n:
            box((D, "glow", 0), p[0] - 0.06, p[0] + 0.06, p[1] - 0.16, p[1] - 0.04, p[2] - 0.06, p[2] + 0.06, scale=1.0, col=GLOW[hue])
        prev = p
    if lit:
        light(D, (a[0] + b[0]) / 2, min(a[1], b[1]) - sag - 0.3, (a[2] + b[2]) / 2, hue, 6.0)
    if floor is not None:
        pool(D, (a[0] + b[0]) / 2, (a[2] + b[2]) / 2, floor, hue, r=max(3.0, math.hypot(b[0] - a[0], b[2] - a[2]) * 0.45), k=0.07)


def hut(D, x, z, y, yaw, tint=5, w=3.2, d=2.6, h=2.7, hue="amber"):
    """A stair hut: its door open on the lit stair, a lamp over it."""
    oriented_box((D, "trim", 0), x, y + h / 2, z, w, h, d, yaw, scale=1.5, col=B.TRIM[tint])
    oriented_box((D, "dark", 1), x, y + h + 0.07, z, w + 0.3, 0.14, d + 0.3, yaw, scale=1.0)
    nx, nz = _dir(yaw)
    dxp, dzp = x + nx * (d / 2 + 0.02), z + nz * (d / 2 + 0.02)
    rotated_quad((D, "neon_" + hue, 0), dxp, y + 1.05, dzp, 0.95, 2.1, yaw)
    light(D, x + nx * (d / 2 + 1.2), y + 1.2, z + nz * (d / 2 + 1.2), hue, 6.0)
    pool(D, x + nx * (d / 2 + 1.0), z + nz * (d / 2 + 1.0), y, hue, r=2.8, k=0.1)


def unit(D, x, z, y, yaw=0.0, w=2.4, d=1.5, h=1.5, fans=2, lamp=None):
    """A big condenser: a steel box, its fans on top, a status lamp."""
    oriented_box((D, "metal", 0), x, y + h / 2, z, w, h, d, yaw, scale=1.0)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    for k in range(fans):
        u = (k + 0.5) / fans * w - w / 2
        cylinder((D, "dark", 1), x + rx * u, z + rz * u, y + h, y + h + 0.07, min(d, w / fans) * 0.38, segs=10)
    if lamp:
        nx, nz = _dir(yaw)
        rotated_quad((D, "glow", 0), x + nx * (d / 2 + 0.01) + rx * (w / 2 - 0.2), y + h - 0.2, z + nz * (d / 2 + 0.01) + rz * (w / 2 - 0.2), 0.12, 0.12, yaw, col=GLOW[lamp])


def plant(D, x0, x1, z0, z1, y, rng, flood="white"):
    """A roof of plant: condensers in a row, a duct run, pipes on sleepers,
    a caged lamp on a post throwing a pool over them."""
    w, d = x1 - x0, z1 - z0
    along_x = w >= d
    n = max(2, int((w if along_x else d) / 3.6))
    for k in range(n):
        t = (k + 0.5) / n
        cx, cz = (x0 + w * t, z0 + d * 0.3) if along_x else (x0 + w * 0.3, z0 + d * t)
        if rng.random() < 0.85:
            unit(D, cx, cz, y, 0.0 if along_x else math.pi / 2, w=rng.uniform(1.8, 2.6), d=1.4, h=rng.uniform(1.1, 1.7),
                 lamp=rng.choice((None, "green", "amber", "red")))
    # The duct along the other side and two pipes on sleepers.
    if along_x:
        box((D, "metal", 1), x0 + 0.5, x1 - 0.5, y + 0.25, y + 0.85, z0 + d * 0.68, z0 + d * 0.68 + 0.7, scale=1.0)
        for k in range(2):
            pipe((D, "metal", 1), (x0 + 0.4, y + 0.3, z0 + d * 0.86 + k * 0.3), (x1 - 0.4, y + 0.3, z0 + d * 0.86 + k * 0.3), 0.09, segs=5)
        px, pz = x0 + w * 0.5, z0 + d * 0.52
    else:
        box((D, "metal", 1), x0 + w * 0.68, x0 + w * 0.68 + 0.7, y + 0.25, y + 0.85, z0 + 0.5, z1 - 0.5, scale=1.0)
        for k in range(2):
            pipe((D, "metal", 1), (x0 + w * 0.86 + k * 0.3, y + 0.3, z0 + 0.4), (x0 + w * 0.86 + k * 0.3, y + 0.3, z1 - 0.4), 0.09, segs=5)
        px, pz = x0 + w * 0.52, z0 + d * 0.5
    cylinder((D, "metal", 1), px, pz, y, y + 3.2, 0.05, segs=5)
    box((D, "neon_" + flood, 0), px - 0.22, px + 0.22, y + 3.1, y + 3.2, pz - 0.12, pz + 0.12, scale=0.5)
    light(D, px, y + 2.8, pz, flood, 8.0)
    pool(D, px, pz, y, flood, r=5.0, k=0.1)


def terrace(D, x0, x1, z0, z1, y, rng, hue="cyan", open_sides="", planters=True, mat="sidewalk"):
    """A roof that is lived on: a paved deck, a rail along its inner edges,
    tall lamps with long arms throwing pools straight down, planters with a
    lit rim, a bench, a string of bulbs."""
    slab(D, x0, x1, z0, z1, y, mat)
    rail(D, [(x0, z0), (x1, z0), (x1, z1), (x0, z1), (x0, z0)], y + 0.17, h=1.0)
    w, d = x1 - x0, z1 - z0
    arm_lamp(D, x0 + 0.5, z0 + 0.5, y, math.atan2(1, 1), arm=min(2.4, w * 0.35), hue=hue)
    if max(w, d) > 9:
        arm_lamp(D, x1 - 0.5, z1 - 0.5, y, math.atan2(-1, -1), arm=min(2.4, w * 0.35), hue="white" if hue != "white" else "amber", power=7.0)
    if planters:
        pw = min(3.2, w * 0.4)
        planter(D, x0 + 0.5, x0 + 0.5 + pw, z1 - 1.3, z1 - 0.5, rng, y=y + 0.17, lit=rng.choice(("cyan", "green", None)))
        planter(D, x1 - 1.3, x1 - 0.5, z0 + 0.6, z0 + 0.6 + min(3.0, d * 0.4), rng, y=y + 0.17)
    P.place("bench", (x0 + x1) / 2, y + 0.17, z0 + 1.0, 0.0, district=D)
    bulbs(D, (x0 + 0.3, y + 3.0, z1 - 0.4), (x1 - 0.3, y + 3.0, z0 + 0.4 + d * 0.4), n=10, floor=y)
    for (px, pz) in ((x0 + 0.3, z1 - 0.4), (x1 - 0.3, z0 + 0.4 + d * 0.4)):
        cylinder((D, "metal", 1), px, pz, y, y + 3.05, 0.04, segs=5)


def pad(D, cx, cz, y, rad=5.5, hue="cyan"):
    """A landing pad for a flying car: a raised octagon, its edge painted
    yellow, a ring and a cross on it, lamps round it."""
    pts = [(cx + rad * math.cos(t), cz + rad * math.sin(t)) for t in (math.pi / 8 + i * math.pi / 4 for i in range(8))]
    walls((D, "hazard", 0), list(reversed(pts)), y, y + 0.35, (1, 1, 1, 1))
    poly((D, "concrete", 0), [(x, y + 0.35, z) for x, z in reversed(pts)], [(x / 3, z / 3) for x, z in reversed(pts)])
    # The ring, in short straight strokes, and the cross.
    n = 20
    for i in range(n):
        t0, t1 = i * math.tau / n, (i + 0.7) * math.tau / n
        r0, r1 = rad * 0.62, rad * 0.7
        q = [(cx + r0 * math.cos(t0), cz + r0 * math.sin(t0)), (cx + r1 * math.cos(t0), cz + r1 * math.sin(t0)),
             (cx + r1 * math.cos(t1), cz + r1 * math.sin(t1)), (cx + r0 * math.cos(t1), cz + r0 * math.sin(t1))]
        poly((D, "neon_" + hue, 0), [(x, y + 0.37, z) for x, z in reversed(q)], [(0, 0), (1, 0), (1, 1), (0, 1)])
    for (hx, hz) in ((rad * 0.42, 0.22), (0.22, rad * 0.42)):
        quad((D, "trim", 0), (cx - hx, y + 0.365, cz + hz), (cx + hx, y + 0.365, cz + hz), (cx + hx, y + 0.365, cz - hz), (cx - hx, y + 0.365, cz - hz),
             col=(0.6, 0.5, 0.08, 1))
    for i, (x, z) in enumerate(pts):
        box((D, "glow", 0), x - 0.1, x + 0.1, y + 0.35, y + 0.55, z - 0.1, z + 0.1, scale=0.5, col=GLOW["amber" if i % 2 else "red"])
    for t in (0.0, math.pi / 2, math.pi, 3 * math.pi / 2):
        light(D, cx + rad * 0.66 * math.cos(t), y + 0.8, cz + rad * 0.66 * math.sin(t), hue, 6.0)
    pool(D, cx, cz, y + 0.35, hue, r=rad * 0.9, k=0.045, lift=0.012)


def skylights(D, x0, x1, z0, z1, y, rng, hue="amber", along="z", n=3, lit=0.75):
    """Rows of skylights on a low roof: kerbed panes, most of them lit from
    the room under them."""
    w, d = x1 - x0, z1 - z0
    for i in range(n):
        if along == "z":
            cx = x0 + (i + 0.5) * w / n
            a0, a1, b0, b1 = cx - min(1.1, w / n * 0.3), cx + min(1.1, w / n * 0.3), z0, z1
        else:
            cz = z0 + (i + 0.5) * d / n
            a0, a1, b0, b1 = x0, x1, cz - min(1.1, d / n * 0.3), cz + min(1.1, d / n * 0.3)
        box((D, "metal", 1), a0 - 0.1, a1 + 0.1, y, y + 0.4, b0 - 0.1, b1 + 0.1, scale=1.0)
        m = max(1, int(((b1 - b0) if along == "z" else (a1 - a0)) / 2.2))
        for k in range(m):
            if along == "z":
                q = (a0, a1, b0 + (b1 - b0) * k / m + 0.08, b0 + (b1 - b0) * (k + 1) / m - 0.08)
            else:
                q = (a0 + (a1 - a0) * k / m + 0.08, a0 + (a1 - a0) * (k + 1) / m - 0.08, b0, b1)
            on = rng.random() < lit
            key = (D, "glow", 0) if on else (D, "glass_dark", 0)
            pts = ((q[0], y + 0.41, q[3]), (q[1], y + 0.41, q[3]), (q[1], y + 0.41, q[2]), (q[0], y + 0.41, q[2]))
            c = GLOW[hue] if on else (1, 1, 1, 1)
            quad(key, *pts, col=(c[0] * 0.55, c[1] * 0.55, c[2] * 0.55, 1) if on else c)
        light(D, (a0 + a1) / 2, y + 0.6, (b0 + b1) / 2, hue, 5.0)


def roof_board(D, cx, cz, y, w, h, yaw, rng, lift=2.4):
    """A billboard on a roof, on its steel legs and their braces, lit from
    a gantry of small lamps along its foot."""
    by = y + lift + h / 2
    B.billboard(D, cx, by, cz, w, h, yaw, rng)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = _dir(yaw)
    for du in (-w * 0.36, 0.0, w * 0.36):
        px, pz = cx + rx * du - nx * 0.2, cz + rz * du - nz * 0.2
        box((D, "metal", 1), px - 0.11, px + 0.11, y, by - h / 2, pz - 0.11, pz + 0.11, scale=0.5)
        pipe((D, "metal", 1), (px - nx * 2.2, y, pz - nz * 2.2), (px, by + h * 0.2, pz), 0.06, segs=4)
    for k in range(max(2, int(w / 2.5))):
        u = -w / 2 + (k + 0.5) * w / max(2, int(w / 2.5))
        lx, lz = cx + rx * u + nx * 0.9, cz + rz * u + nz * 0.9
        box((D, "glow", 1), lx - 0.1, lx + 0.1, by - h / 2 - 0.25, by - h / 2 - 0.15, lz - 0.1, lz + 0.1, scale=0.5, col=GLOW["white"])
        pipe((D, "metal", 1), (lx - nx * 0.9, by - h / 2 - 0.2, lz - nz * 0.9), (lx, by - h / 2 - 0.2, lz), 0.02, segs=3)
    light(D, cx + nx * 2.0, y + 1.0, cz + nz * 2.0, "white", 7.0)
    pool(D, cx + nx * 1.6, cz + nz * 1.6, y, "white", r=min(5.0, w * 0.5), k=0.07)


def mast(D, x, z, y, h, dishes=2, lamp="red", r=0.45):
    """A lattice mast: three legs, rings of bracing, dishes and panels, a
    lamp at its tip."""
    legs = [(x + r * math.cos(t), z + r * math.sin(t)) for t in (0.5, 0.5 + math.tau / 3, 0.5 + 2 * math.tau / 3)]
    for (lx, lz) in legs:
        pipe((D, "metal", 0), (lx, y, lz), (x + (lx - x) * 0.25, y + h, z + (lz - z) * 0.25), 0.04, segs=3)
    n = max(3, int(h / 1.8))
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n
        for k in range(3):
            (ax, az), (bx, bz) = legs[k], legs[(k + 1) % 3]
            s0, s1 = 1 - 0.75 * t0, 1 - 0.75 * t1
            a = (x + (ax - x) * s0, y + h * t0, z + (az - z) * s0)
            b = (x + (bx - x) * s1, y + h * t1, z + (bz - z) * s1)
            pipe((D, "metal", 1), a, b, 0.02, segs=3)
    for k in range(dishes):
        yy = y + h * (0.55 + 0.18 * k)
        ang = 0.8 + 2.3 * k
        dish((D, "metal", 0), (x + 0.5 * math.cos(ang), yy, z + 0.5 * math.sin(ang)), (math.cos(ang), 0.15, math.sin(ang)), 0.55)
    for k in range(3):
        ang = 0.2 + k * math.tau / 3
        oriented_box((D, "trim", 1), x + 0.34 * math.sin(ang), y + h * 0.86, z + 0.34 * math.cos(ang), 0.28, 1.5, 0.1, ang, scale=1.0, col=(0.42, 0.42, 0.45, 1))
    cylinder((D, "metal", 1), x, z, y + h, y + h + 1.6, 0.03, segs=4)
    box((D, "glow", 0), x - 0.09, x + 0.09, y + h + 1.6, y + h + 1.8, z - 0.09, z + 0.09, scale=0.5, col=GLOW[lamp])


def post_light(D, x, z, y, hue="amber", h=0.7, power=6.0):
    """A low post light on a roof or a deck, and its pool."""
    cylinder((D, "metal", 1), x, z, y, y + h, 0.05, segs=5)
    box((D, "neon_" + hue, 0), x - 0.07, x + 0.07, y + h, y + h + 0.14, z - 0.07, z + 0.07, scale=0.5)
    light(D, x, y + h, z, hue, power)
    pool(D, x, z, y, hue, r=2.6, k=0.1)


def lane_wall(D, f, rng, top, dens=1.0, blades=True, s0=0.0, s1=None):
    """What a back wall carries at a walker's height, between its doors: a
    darker band along its foot, pipes on brackets, meter boxes with a lamp
    each, a barred window lit from a kitchen or a store, a poster, crates,
    and now and then a small sign turned to the lane (the passage's wall,
    Zuzys9Ld_5M@87)."""
    s1 = f.width if s1 is None else s1
    f.quad((D, "trim", 1), s0, s1, G0, 1.0, 0.045, col=BLACK)
    if s1 - s0 > 6.0:
        a = s0 + rng.uniform(0.3, 1.5)
        pipes(D, f, a, min(s1 - 0.3, a + rng.uniform(6.0, 14.0)), rng.uniform(2.95, 3.25), rng, n=rng.randrange(1, 3))
    s = s0 + rng.uniform(1.0, 3.0)
    while s < s1 - 1.2:
        roll = rng.random()
        if roll < 0.3 * dens:
            # A barred window, lit.
            w = rng.uniform(1.0, 1.6)
            hue = rng.choice(("amber", "amber", "white", "green", "pink"))
            c = GLOW[hue]
            f.quad((D, "glow", 0), s, s + w, 1.5, 2.5, 0.05, col=(c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 1))
            f.box((D, "metal", 1), s - 0.06, s + w + 0.06, 1.42, 1.5, 0.0, 0.12)
            grille(D, f, s, s + w, 1.5, 2.5, out=0.07, step=0.2)
            light(D, *f.p(f.at(s + w / 2), 1.8, 0.9), hue, 2.2)
            s += w
        elif roll < 0.48 * dens:
            # A meter box, its lamp.
            f.box((D, "metal", 1), s, s + 0.55, 1.2, 2.0, 0.04, 0.24)
            f.box((D, "glow", 1), s + 0.42, s + 0.49, 1.86, 1.93, 0.24, 0.255, col=GLOW[rng.choice(("red", "green", "cyan"))])
            pipe((D, "metal", 1), f.p(f.at(s + 0.27), 2.0, 0.14), f.p(f.at(s + 0.27), min(top - 0.5, rng.uniform(4.0, 7.0)), 0.14), 0.035, segs=4)
            s += 0.55
        elif roll < 0.62 * dens:
            poster(D, f, s + 0.6, 2.05, 1.0, 1.45, rng, out=0.05)
            s += 1.2
        elif roll < 0.76 * dens:
            p = f.p(f.at(s + 0.5), 0.0, 0.55)
            crates(D, p[0], p[2], rng)
            s += 1.2
        elif blades and roll < 0.9 * dens:
            p = f.p(f.at(s), 0.0, 0.0)
            blade(D, p[0], p[2], rng.uniform(3.4, 5.6), rng.choice(("bs", "bx", "bs", "bm")), f.yaw + rng.uniform(-0.6, 0.6))
        s += rng.uniform(2.2, 5.0) / dens


def stoop(D, f, s0, s1, steps=2, out=0.34, rise=0.18):
    """Steps up to a door from a lane."""
    for k in range(steps):
        fbox(f, (D, "concrete", 0), s0, s1, G0, G0 + rise * (steps - k), 0.0, out * (k + 1))
