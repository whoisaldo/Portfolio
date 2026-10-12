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


# Capitals bent from one tube: each letter's strokes on a unit square
# (and three marks: a cocktail glass, an arrow, a bowl with its steam).
STROKES = {
    "A": (((0, 0), (0.5, 1), (1, 0)), ((0.2, 0.4), (0.8, 0.4))),
    "B": (((0, 0), (0, 1), (0.7, 1), (0.9, 0.85), (0.9, 0.65), (0.7, 0.5), (0, 0.5)), ((0.7, 0.5), (1, 0.35), (1, 0.15), (0.75, 0), (0, 0))),
    "D": (((0, 0), (0, 1), (0.6, 1), (1, 0.7), (1, 0.3), (0.6, 0), (0, 0)),),
    "E": (((1, 1), (0, 1), (0, 0), (1, 0)), ((0, 0.5), (0.75, 0.5))),
    "H": (((0, 0), (0, 1)), ((1, 0), (1, 1)), ((0, 0.5), (1, 0.5))),
    "K": (((0, 0), (0, 1)), ((1, 1), (0, 0.45), (1, 0))),
    "L": (((0, 1), (0, 0), (1, 0)),),
    "M": (((0, 0), (0, 1), (0.5, 0.4), (1, 1), (1, 0)),),
    "N": (((0, 0), (0, 1), (1, 0), (1, 1)),),
    "O": (((0.25, 0), (0, 0.25), (0, 0.75), (0.25, 1), (0.75, 1), (1, 0.75), (1, 0.25), (0.75, 0), (0.25, 0)),),
    "R": (((0, 0), (0, 1), (0.75, 1), (1, 0.85), (1, 0.6), (0.75, 0.45), (0, 0.45)), ((0.45, 0.45), (1, 0))),
    "S": (((1, 0.85), (0.75, 1), (0.25, 1), (0, 0.8), (0, 0.62), (0.25, 0.5), (0.75, 0.5), (1, 0.38), (1, 0.2), (0.75, 0), (0.25, 0), (0, 0.15)),),
    "T": (((0, 1), (1, 1)), ((0.5, 1), (0.5, 0))),
    "2": (((0, 0.8), (0.25, 1), (0.75, 1), (1, 0.8), (1, 0.6), (0, 0), (1, 0)),),
    "4": (((0.75, 0), (0.75, 1), (0, 0.3), (1, 0.3)),),
    "glass": (((0, 1), (1, 1), (0.5, 0.45), (0, 1)), ((0.5, 0.45), (0.5, 0)), ((0.2, 0), (0.8, 0)), ((0.72, 1.0), (1.0, 1.3))),
    "arrow": (((0, 0.5), (1, 0.5)), ((0.6, 0.9), (1, 0.5), (0.6, 0.1))),
    "bowl": (((0, 0.55), (1, 0.55), (0.8, 0.1), (0.2, 0.1), (0, 0.55)), ((0.3, 0.7), (0.4, 0.85), (0.3, 1.0)), ((0.6, 0.7), (0.7, 0.85), (0.6, 1.0))),
}
RAIL = (0.13, 0.135, 0.15, 1)


def word(D, cx, cy, cz, w, h, yaw, colour, text, underline="white", r=0.05, mark=None):
    """A word in neon tube, capitals with a slant, one or two lines (`text`
    a string or a list), a swash under it in a second colour and, with
    `mark`, a drawing in that colour after the first line; on an open
    frame of steel rails and brackets back to the wall, not on a board (the
    pink sign on the bar's corner, Zq4zTcIM0yQ@40)."""
    rows = [text] if isinstance(text, str) else list(text)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = _dir(yaw)

    def at(u, v, t=0.14):
        return (cx + rx * u + nx * t, cy + v, cz + rz * u + nz * t)

    def strokes(name, u0, v0, lw, lh, key):
        for st in STROKES[name]:
            pts = [at(u0 + px * lw + 0.16 * py * lh, v0 + py * lh) for px, py in st]
            for p0, p1 in zip(pts, pts[1:]):
                pipe(key, p0, p1, r, segs=3)

    band = h * (0.8 if underline else 1.0) / len(rows)
    top = h / 2
    for li, row in enumerate(rows):
        n = len(row) + (1.3 if mark and li == 0 else 0.0)
        lh = band * 0.74
        lw = min(lh * 0.62, w * 0.94 / (n * 1.34))
        u = -n * lw * 1.34 / 2 + lw * 0.17
        v0 = top - (li + 1) * band + band * 0.13
        for ch in row:
            if ch != " ":
                strokes(ch, u, v0, lw, lh, (D, "neon_" + colour, 0))
            u += lw * 1.34
        if mark and li == 0:
            strokes(mark, u + lw * 0.3, v0, lw, lh, (D, "neon_" + (underline or colour), 0))
    if underline:
        v0 = -h / 2 + 0.07 * h
        pts = [at(-w * 0.42 + w * 0.84 * i / 8, v0 + 0.06 * h * math.sin(i / 8 * math.pi)) for i in range(9)]
        for p0, p1 in zip(pts, pts[1:]):
            pipe((D, "neon_" + underline, 0), p0, p1, r * 0.9, segs=3)
    # The frame: two rails behind the tubes, a post at each end, brackets back.
    for v in (-h * 0.3, h * 0.3):
        pipe((D, "steel", 1), at(-w / 2, v, 0.05), at(w / 2, v, 0.05), 0.03, segs=4, col=RAIL)
    for u in (-w / 2, w / 2):
        pipe((D, "steel", 1), at(u, -h / 2, 0.05), at(u, h / 2, 0.05), 0.03, segs=4, col=RAIL)
        pipe((D, "steel", 1), at(u * 0.8, h * 0.3, 0.05), at(u * 0.8, h * 0.3, -0.25), 0.03, segs=4, col=RAIL)


# Block capitals cut from plate, as the show sets the club's name
# (BnnbP7pCIvQ@24): each a few straight-edged pieces on a unit square, listed
# anticlockwise as read, heavy stems (STEM of the letter's width) and bars
# (BAR of its height).
STEM, BAR = 0.3, 0.18
_S, _B, _M = STEM, BAR, 0.42
_STEM = ((0, 0), (_S, 0), (_S, 1), (0, 1))
_TOP = ((_S, 1 - _B), (1, 1 - _B), (1, 1), (_S, 1))
_MID = ((_S, _M), (0.82, _M), (0.82, _M + _B), (_S, _M + _B))
_FOOT = ((_S, 0), (1, 0), (1, _B), (_S, _B))
BLOCKS = {
    "A": (((0, 0), (_S, 0), (0.5, 1), (0.3, 1)), ((0.7, 0), (1, 0), (0.7, 1), (0.5, 1)), ((0.35, 0.25), (0.65, 0.25), (0.614, 0.43), (0.386, 0.43))),
    "F": (_STEM, _TOP, _MID),
    "T": (((0, 1 - _B), (1, 1 - _B), (1, 1), (0, 1)), ((0.5 - _S / 2, 0), (0.5 + _S / 2, 0), (0.5 + _S / 2, 1 - _B), (0.5 - _S / 2, 1 - _B))),
    "E": (_STEM, _TOP, _MID, _FOOT),
    "R": (_STEM, ((_S, 1 - _B), (1, 1 - _B), (1, 0.93), (0.9, 1), (_S, 1)), ((1 - _S, _M + _B), (1, _M + _B), (1, 1 - _B), (1 - _S, 1 - _B)),
          ((_S, _M), (0.9, _M), (1, _M + 0.07), (1, _M + _B), (_S, _M + _B)), ((0.7, 0), (1, 0), (0.72, _M), (0.42, _M))),
    "L": (_STEM, _FOOT),
    "I": (((0, 0), (1, 0), (1, 1), (0, 1)),),
}
BLOCK_WIDTH = {"I": STEM}


def block_word(text, s0, y0, h, w, gap, lean=0.22):
    """A word in slanted block capitals as pieces of plate for `plates`:
    each letter `w` wide and `h` high from s0, its foot at y0, `gap` between
    letters, leaning `lean` of its height to the right."""
    out, s = [], s0
    for ch in text:
        cw = w * BLOCK_WIDTH.get(ch, 1.0)
        out += [[(s + u * cw + lean * v * h, y0 + v * h) for u, v in piece] for piece in BLOCKS[ch]]
        s += cw + gap
    return out


def _outline(pieces):
    """The stretches of every piece's edges that no other piece shares (two
    pieces side by side share an edge, run opposite ways): the edges of the
    shape they make together."""
    edges = [(p[i], p[(i + 1) % len(p)], k) for k, p in enumerate(pieces) for i in range(len(p))]
    out = []
    for a, b, k in edges:
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dy)
        if length < 1e-6:
            continue
        ux, uy = dx / length, dy / length
        cuts = []
        for c, d, j in edges:
            if j == k:
                continue
            # Collinear with a to b, and running the other way.
            if abs((c[0] - a[0]) * uy - (c[1] - a[1]) * ux) > 1e-4 or abs((d[0] - a[0]) * uy - (d[1] - a[1]) * ux) > 1e-4:
                continue
            t0, t1 = (d[0] - a[0]) * ux + (d[1] - a[1]) * uy, (c[0] - a[0]) * ux + (c[1] - a[1]) * uy
            if t1 > t0 + 1e-6:
                cuts.append((max(0.0, t0), min(length, t1)))
        t = 0.0
        for c0, c1 in sorted(cuts) + [(length, length)]:
            if c0 - t > 1e-3:
                out.append(((a[0] + ux * t, a[1] + uy * t), (a[0] + ux * c0, a[1] + uy * c0)))
            t = max(t, c1)
    return out


def plates(D, f, pieces, w0, w1, face, side, inner=None, recess=0.0, detail=0):
    """Letters cut from plate, standing off a face from w0 to w1: `pieces`
    their outlines as (s, y), each anticlockwise as read, pieces that touch
    making one shape. Lit letters are cans: the lit `face` set `recess` back
    from the front of the returns (`side` outside, `inner` inside, which
    the face lights), so from the front the whole letter shows and seen
    along the wall its own returns hide it."""
    wf = w1 - recess
    for pts in pieces:
        vpoly((D, "glow", detail), [f.p(f.at(s), y, wf) for s, y in pts], [face] * len(pts))
    for a, b in _outline(pieces):
        fa, fb = f.p(f.at(a[0]), a[1], w1), f.p(f.at(b[0]), b[1], w1)
        ba, bb = f.p(f.at(a[0]), a[1], w0), f.p(f.at(b[0]), b[1], w0)
        vpoly((D, "glow", detail), [fa, ba, bb, fb], [side] * 4)
        if recess and inner:
            ra, rb = f.p(f.at(a[0]), a[1], wf), f.p(f.at(b[0]), b[1], wf)
            vpoly((D, "glow", detail), [fb, rb, ra, fa], [inner] * 4)


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


POOLS = []   # (x, z, y, hue, power): lamps on roofs the site's own light does not reach
ROOF_DARK = (0.0075, 0.008, 0.0105)   # about what an unlit deck up there shows
CEIL = 0.36


def pool(D, x, z, y, hue, power=6.0):
    """The pool a lamp throws on a roof or a deck. On a low roof the site's
    own light does it: a point of light set at the deck itself (the site
    lights a surface most at the height its light hangs, so a lamp four
    metres up a post lit the post and not the roof under it). Over nine
    metres the lamp is only noted here, for `roof_light` to paint the whole
    deck's light at once: the site's map holds a light's height to 16 m and
    no more and gives a high roof a fifth of what it gives a street, and a
    point of light up there tells the lanes below that their own light
    hangs on the roof."""
    if y <= 9.0:
        light(D, x, y + 0.5, z, hue, power)
    else:
        POOLS.append((x, z, y, hue, power))


def roof_light(D, x0, x1, z0, z1, y, step=2.0, inside=None, lift=0.14):
    """A high roof's light, painted: a sheet over the deck in two-metre
    squares, each corner the sum of what every lamp noted on this roof
    (`pool`) throws there, falling off smoothly to nothing, so pools that
    meet add up and none has an edge. Squares no lamp reaches are left out
    (the deck's concrete shows). `inside`: a test of (x, z) for a roof only
    part of which may be lit."""
    lamps = [(px, pz, GLOW[h], p) for (px, pz, py, h, p) in POOLS if abs(py - y) < 0.7 and x0 - 1.0 <= px <= x1 + 1.0 and z0 - 1.0 <= pz <= z1 + 1.0]
    if not lamps:
        return
    nx, nz = max(1, round((x1 - x0) / step)), max(1, round((z1 - z0) / step))

    def col(vx, vz):
        r = g = b = 0.0
        for px, pz, c, p in lamps:
            t = ((vx - px) ** 2 + (vz - pz) ** 2) / (3.0 + 0.5 * p) ** 2
            if t < 1.0:
                f = 0.022 * p * (1.0 - t) ** 2
                r, g, b = r + c[0] * f, g + c[1] * f, b + c[2] * f
        # Eased toward a ceiling, never clipped, so where pools meet the light
        # rises and does not stand in a flat plateau; and nothing darker than
        # the bare deck's own dark, so the sheet has no rim.
        return tuple(ROOF_DARK[i] + CEIL * (1.0 - math.exp(-v / CEIL)) for i, v in enumerate((r, g, b))) + (1.0,)

    xs = [x0 + i * (x1 - x0) / nx for i in range(nx + 1)]
    zs = [z0 + j * (z1 - z0) / nz for j in range(nz + 1)]
    grid = [[col(vx, vz) for vz in zs] for vx in xs]
    lit = ROOF_DARK[2] + 0.006
    for i in range(nx):
        for j in range(nz):
            cs = [grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j], grid[i][j]]
            if max(max(c[:3]) for c in cs) < lit or (inside and not inside((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2)):
                continue
            vpoly((D, "glow", 0), [(xs[i], y + lift, zs[j + 1]), (xs[i + 1], y + lift, zs[j + 1]), (xs[i + 1], y + lift, zs[j]), (xs[i], y + lift, zs[j])], cs)
    # The felt the light falls on: its seams a metre apart down the roof's
    # length, the laps across each strip every few metres, and patches of
    # newer or older felt, each in the light where it lies, a shade darker
    # or lighter (drawn in the light itself: a dark seam laid over a painted
    # pool would read as a hole in it).
    rng = random.Random(int(x0 * 7 + z0 * 13 + y * 3))
    yy = y + lift + 0.006

    def shade(vx, vz, k):
        c = col(vx, vz)
        return tuple(ROOF_DARK[i] + (c[i] - ROOF_DARK[i]) * k for i in range(3)) + (1.0,)

    def strip(a, b, half, k):
        """A seam from a to b (x, z), cut where the grid is, each piece shaded."""
        (xa, za), (xb, zb) = a, b
        n = max(1, int(math.hypot(xb - xa, zb - za) / step + 0.5))
        ux, uz = (xb - xa) / n, (zb - za) / n
        ln = math.hypot(ux, uz)
        px, pz = -uz / ln * half, ux / ln * half
        for m in range(n):
            p0, p1 = (xa + ux * m, za + uz * m), (xa + ux * (m + 1), za + uz * (m + 1))
            c0, c1 = shade(*p0, k), shade(*p1, k)
            if max(c0[2], c1[2]) < lit or (inside and not inside((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)):
                continue
            # (Wound as the sheet is, so it faces up.)
            vpoly((D, "glow", 0), [(p0[0] + px, yy, p0[1] + pz), (p1[0] + px, yy, p1[1] + pz), (p1[0] - px, yy, p1[1] - pz), (p0[0] - px, yy, p0[1] - pz)],
                  [c0, c1, c1, c0])

    along_x = (x1 - x0) >= (z1 - z0)
    a0, a1, b0, b1 = (x0, x1, z0, z1) if along_x else (z0, z1, x0, x1)
    c = b0 + rng.uniform(0.4, 1.0)
    while c < b1 - 0.3:
        seam = ((a0, c), (a1, c)) if along_x else ((c, a0), (c, a1))
        strip(*seam, 0.035, 0.42)
        e = a0 + rng.uniform(1.0, 5.0)
        while e < a1 - 1.0:
            lap = ((e, c), (e, min(c + 1.0, b1))) if along_x else ((c, e), (min(c + 1.0, b1), e))
            strip(*lap, 0.03, 0.5)
            e += rng.uniform(4.0, 7.5)
        c += rng.uniform(0.92, 1.08)
    for _ in range(max(2, int((x1 - x0) * (z1 - z0) / 60.0))):
        w, d = rng.uniform(1.0, 3.2), rng.uniform(0.8, 2.4)
        px, pz = rng.uniform(x0 + 0.6, x1 - 0.6 - w), rng.uniform(z0 + 0.6, z1 - 0.6 - d)
        k = rng.choice((0.62, 0.7, 1.22))
        cs = [shade(px, pz + d, k), shade(px + w, pz + d, k), shade(px + w, pz, k), shade(px, pz, k)]
        if max(c_[2] for c_ in cs) < lit or (inside and not inside(px + w / 2, pz + d / 2)):
            continue
        vpoly((D, "glow", 0), [(px, yy - 0.003, pz + d), (px + w, yy - 0.003, pz + d), (px + w, yy - 0.003, pz), (px, yy - 0.003, pz)], cs)


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


def tube(D, a, b, colour, power=2.6, fitting=True, floor=G0):
    """A fluorescent tube from a to b in its fitting, and its pool on the
    floor under it (the light is set at the floor: the site lights a surface
    most at the height its light hangs, and hung at the tube it lit the
    wall beside the tube and left the floor dark)."""
    pipe((D, "neon_" + colour, 0), a, b, 0.045, segs=4, caps=True)
    if fitting:
        pipe((D, "metal", 1), (a[0], a[1] + 0.07, a[2]), (b[0], b[1] + 0.07, b[2]), 0.035, segs=4)
    light(D, (a[0] + b[0]) / 2, floor + 0.35, (a[2] + b[2]) / 2, colour, power)


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


def lit_door(D, f, s, hue, w=1.1, h=2.25, power=3.5, ajar=True, back=0.0):
    """A door standing open on a lit room, its light on the ground outside
    (the green door on the dark street, UKgCVtdSfE0@38). `back`: how far
    behind the face's plane its frame stands (a door in a lobby)."""
    f.box((D, "metal", 1), s - w / 2 - 0.08, s + w / 2 + 0.08, G0, h + 0.1, -back, -back + 0.06)
    c = GLOW[hue]
    # The room: brightest at the lamp over the lintel inside, a darker floor.
    f.quad((D, "glow", 0), s - w / 2, s + w / 2, G0, h, -back + 0.07, col=(c[0] * 0.42, c[1] * 0.42, c[2] * 0.42, 1))
    f.quad((D, "glow", 0), s - w / 2, s + w / 2, G0, G0 + 0.5, -back + 0.075, col=(c[0] * 0.16, c[1] * 0.16, c[2] * 0.16, 1))
    f.box((D, "neon_" + hue, 0), s - w / 2 + 0.1, s + w / 2 - 0.1, h - 0.16, h - 0.08, -back + 0.07, -back + 0.1)
    if ajar:
        # The leaf, swung out at an angle.
        a = f.p(f.at(s - w / 2), G0, -back + 0.07)
        ang = f.yaw + 0.5
        dx, dz = _dir(ang)
        b = (a[0] + dx * w * 0.9, G0, a[2] + dz * w * 0.9)
        for q in (((a[0], G0, a[2]), b, (b[0], h, b[2]), (a[0], h, a[2])), (b, (a[0], G0, a[2]), (a[0], h, a[2]), (b[0], h, b[2]))):
            quad((D, "door", 0), *q)
    light(D, *f.p(f.at(s), 1.2, 1.2 - back), hue, power)


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
        P.place("grate_glow", x, y, z, district=D)
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
    if y > 6.0:
        pool(D, hx, hz, y, hue, power)
    else:
        light(D, hx, y + h - 0.4, hz, hue, power)


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
        fire_stairs(D, f, escape, SHOP_H + 0.5, min(y1 - 3.0, 40.0))
    if signs:
        B.face_signs(D, f, r, 0.5, f.width - 0.5, y1, st["signs"], st["sign_colours"])


STAIR = (0.115, 0.12, 0.13, 1)


def fire_stairs(district, f, s, y0, y1):
    """A fire escape down a face, centred s from its left edge (it takes
    buildings.fire_escape's place in this district): landings of steel
    plate, railings of posts and two rails that the wall shows through, a
    flight of treads between two stringers up to the next landing, a ladder
    dropped from the lowest, and a lamp under every other landing."""
    k0, k1 = (district, "steel", 0), (district, "steel", 1)
    y, n = y0, 0
    while y < y1:
        f.box(k0, s - 2.2, s + 2.2, y, y + 0.07, 0.0, 1.1, col=STAIR)
        for e in (s - 2.17, s, s + 2.17):
            f.box(k1, e - 0.03, e + 0.03, y + 0.07, y + 1.04, 1.04, 1.1, col=STAIR)
        for yy in (y + 0.55, y + 1.02):
            f.box(k1, s - 2.2, s + 2.2, yy, yy + 0.045, 1.04, 1.1, col=STAIR)
        for e in (s - 2.2, s + 2.155):
            f.box(k1, e, e + 0.045, y + 1.02, y + 1.065, 0.0, 1.1, col=STAIR)
        if y + CELL_H < y1 + 0.1:
            a0, a1 = f.at(s - 2.0), f.at(s + 1.6)
            for w in (0.2, 0.95):
                pipe(k0, f.p(a0, y + 0.07, w), f.p(a1, y + CELL_H, w), 0.045, segs=4, col=STAIR)
            for i in range(1, 7):
                t = i / 7
                ss = s - 2.0 + 3.6 * t
                f.box(k1, ss - 0.15, ss + 0.15, y + 0.04 + CELL_H * t, y + 0.075 + CELL_H * t, 0.2, 0.95, col=STAIR)
        if n % 2 == 0:
            f.box((district, "glow", 1), s + 1.7, s + 1.95, y - 0.08, y - 0.01, 0.08, 0.3, col=GLOW["amber" if n % 4 else "white"])
            if y < 12.0:
                light(district, *f.p(f.at(s + 1.8), y - 0.4, 0.8), "amber" if n % 4 else "white", 2.0)
        y += CELL_H
        n += 1
    ladder(district, f, s - 1.9, y0 - 2.3, y0, out=1.0)


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
def parapet(D, x0, x1, z0, z1, y, tint=5, line=None, h=0.95, t=0.3, sides="nsew", deck="concrete", rim=None, rim_step=5.5):
    """A roof's parapet (the sides named: n is -z, e is +x) with its coping,
    and, with `line`, a thin line of light round its top. `deck`: the roof
    inside it laid in concrete (which takes its lamps' light; tar does not).
    `rim`: a colour for small lamps let into the coping's inner edge every
    few metres, which light the deck along the parapet's foot."""
    col = B.TRIM[tint]
    for name, (a0, a1, b0, b1) in (("s", (x0, x1, z1 - t, z1)), ("n", (x0, x1, z0, z0 + t)), ("w", (x0, x0 + t, z0 + t, z1 - t)),
                                   ("e", (x1 - t, x1, z0 + t, z1 - t))):
        if name in sides:
            box((D, "trim", 0), a0, a1, y, y + h, b0, b1, scale=1.5, col=col)
            # The coping: a cap a little wider than the wall, a shade darker.
            box((D, "trim", 1), a0 - 0.05, a1 + 0.05, y + h, y + h + 0.07, b0 - 0.05, b1 + 0.05, scale=1.0, col=CONCRETE_DARK)
            if rim:
                horiz = name in "sn"
                length = (a1 - a0) if horiz else (b1 - b0)
                n = max(1, int(length / rim_step))
                for k in range(n):
                    u = (k + 0.5) / n
                    if horiz:
                        lx, lz, ix, iz = a0 + (a1 - a0) * u, (b0 if name == "s" else b1), 0.0, (-1.0 if name == "s" else 1.0)
                    else:
                        lx, lz, ix, iz = (a0 if name == "e" else a1), b0 + (b1 - b0) * u, (-1.0 if name == "e" else 1.0), 0.0
                    fx, fz = lx + ix * 0.04, lz + iz * 0.04
                    box((D, "metal", 1), fx - 0.16, fx + 0.16, y + h - 0.32, y + h - 0.12, fz - 0.16, fz + 0.16, scale=0.5)
                    box((D, "glow", 1), fx + ix * 0.15 - (0.13 if horiz else 0.015), fx + ix * 0.15 + (0.13 if horiz else 0.015), y + h - 0.3, y + h - 0.22,
                        fz + iz * 0.15 - (0.015 if horiz else 0.13), fz + iz * 0.15 + (0.015 if horiz else 0.13), scale=0.5, col=GLOW[rim])
                    pool(D, lx + ix * 1.4, lz + iz * 1.4, y, rim, 3.2)
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
    if floor is not None:
        pool(D, (a[0] + b[0]) / 2, (a[2] + b[2]) / 2, floor, hue)
    elif lit:
        light(D, (a[0] + b[0]) / 2, min(a[1], b[1]) - sag - 0.3, (a[2] + b[2]) / 2, hue, 6.0)


def hut(D, x, z, y, yaw, tint=5, w=3.2, d=2.6, h=2.7, hue="amber"):
    """A stair hut: its door open on the lit stair, a lamp over it."""
    oriented_box((D, "trim", 0), x, y + h / 2, z, w, h, d, yaw, scale=1.5, col=B.TRIM[tint])
    oriented_box((D, "dark", 1), x, y + h + 0.07, z, w + 0.3, 0.14, d + 0.3, yaw, scale=1.0)
    nx, nz = _dir(yaw)
    dxp, dzp = x + nx * (d / 2 + 0.02), z + nz * (d / 2 + 0.02)
    rotated_quad((D, "neon_" + hue, 0), dxp, y + 1.05, dzp, 0.95, 2.1, yaw)
    pool(D, x + nx * (d / 2 + 1.2), z + nz * (d / 2 + 1.2), y, hue)


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
    pool(D, px, pz, y, flood, 8.0)


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


def skylights(D, x0, x1, z0, z1, y, rng, hue="amber", along="z", n=3, lit=0.75, glazed=False):
    """Rows of skylights on a low roof: kerbed panes, most of them lit from
    the room under them. `glazed`: the lit panes in the kit's roof light
    (glazing bars, each pane its own brightness, never past white)."""
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
            key = (D, "skylight" if glazed else "glow", 0) if on else (D, "glass_dark", 0)
            c = GLOW[hue] if on and not glazed else (1, 1, 1, 1)
            col = (c[0] * 0.55, c[1] * 0.55, c[2] * 0.55, 1) if on and not glazed else c
            ya, yb = y + 0.41, y + (0.71 if glazed else 0.41)
            if glazed:
                # Glazed lights are pitched: two panes to a ridge over each
                # bay, a glazing bar over the slope at each end.
                if along == "z":
                    mx = (q[0] + q[1]) / 2
                    quad(key, (q[0], ya, q[3]), (mx, yb, q[3]), (mx, yb, q[2]), (q[0], ya, q[2]), col=col)
                    quad(key, (mx, yb, q[3]), (q[1], ya, q[3]), (q[1], ya, q[2]), (mx, yb, q[2]), col=col)
                    for zb in (q[2] - 0.04, q[3] + 0.04):
                        pipe((D, "metal", 1), (q[0] - 0.05, ya, zb), (mx, yb + 0.03, zb), 0.03, segs=4)
                        pipe((D, "metal", 1), (mx, yb + 0.03, zb), (q[1] + 0.05, ya, zb), 0.03, segs=4)
                else:
                    mz = (q[2] + q[3]) / 2
                    quad(key, (q[0], ya, q[3]), (q[1], ya, q[3]), (q[1], yb, mz), (q[0], yb, mz), col=col)
                    quad(key, (q[0], yb, mz), (q[1], yb, mz), (q[1], ya, q[2]), (q[0], ya, q[2]), col=col)
                    for xb in (q[0] - 0.04, q[1] + 0.04):
                        pipe((D, "metal", 1), (xb, ya, q[2] - 0.05), (xb, yb + 0.03, mz), 0.03, segs=4)
                        pipe((D, "metal", 1), (xb, yb + 0.03, mz), (xb, ya, q[3] + 0.05), 0.03, segs=4)
            else:
                quad(key, (q[0], ya, q[3]), (q[1], ya, q[3]), (q[1], ya, q[2]), (q[0], ya, q[2]), col=col)
        if glazed:
            # The ridge's cap and the gables.
            if along == "z":
                mx = (a0 + a1) / 2
                box((D, "metal", 1), mx - 0.06, mx + 0.06, y + 0.7, y + 0.78, b0 - 0.05, b1 + 0.05, scale=1.0)
                for zb in (b0 - 0.02, b1 + 0.02):
                    poly((D, "metal", 1), [(a0, y + 0.4, zb), (mx, y + 0.72, zb), (a1, y + 0.4, zb)], [(0, 0), (0.5, 1), (1, 0)])
                    poly((D, "metal", 1), [(a1, y + 0.4, zb), (mx, y + 0.72, zb), (a0, y + 0.4, zb)], [(0, 0), (0.5, 1), (1, 0)])
            else:
                mz = (b0 + b1) / 2
                box((D, "metal", 1), a0 - 0.05, a1 + 0.05, y + 0.7, y + 0.78, mz - 0.06, mz + 0.06, scale=1.0)
                for xb in (a0 - 0.02, a1 + 0.02):
                    poly((D, "metal", 1), [(xb, y + 0.4, b0), (xb, y + 0.72, mz), (xb, y + 0.4, b1)], [(0, 0), (0.5, 1), (1, 0)])
                    poly((D, "metal", 1), [(xb, y + 0.4, b1), (xb, y + 0.72, mz), (xb, y + 0.4, b0)], [(0, 0), (0.5, 1), (1, 0)])
        light(D, (a0 + a1) / 2, y + 0.6, (b0 + b1) / 2, hue, 5.0)


def roof_board(D, cx, cz, y, w, h, yaw, rng, lift=2.4):
    """A billboard on a roof, on its steel legs and their braces, lit from
    a gantry of small lamps along its foot."""
    by = y + lift + h / 2
    # (Its back is its steel, not a second advert.)
    B.billboard(D, cx, by, cz, w, h, yaw, rng, back=False)
    rng.randrange(8), rng.randrange(8), rng.random()   # (what the back's art drew, so the boards keep theirs)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = _dir(yaw)
    y0 = by - h / 2 - 0.2

    def at(u, v, yy):
        return (cx + rx * u + nx * v, yy, cz + rz * u + nz * v)

    # Its structure: a lattice leg at each end and in the middle, two
    # channels laced with diagonals, raking struts behind to shoes on the
    # roof; a deep beam the board stands on, a back frame of studs and rails
    # behind it, and a catwalk of grating along its foot with a rail and the
    # lamps on arms off it.
    legs = (-w * 0.38, 0.0, w * 0.38) if w > 7.0 else (-w * 0.36, w * 0.36)
    for du in legs:
        for dv in (-0.15, -0.75):
            p = at(du, dv, y)
            box((D, "steel", 0), p[0] - 0.09, p[0] + 0.09, y, y0, p[2] - 0.09, p[2] + 0.09, scale=1.0, col=STEEL)
        n = max(2, int((y0 - y) / 0.75))
        for k in range(n):
            ya, yb = y + (y0 - y) * k / n, y + (y0 - y) * (k + 1) / n
            a, b = (-0.15, -0.75) if k % 2 == 0 else (-0.75, -0.15)
            pipe((D, "steel", 1), at(du, a, ya), at(du, b, yb), 0.025, segs=3, col=STEEL)
        pipe((D, "steel", 1), at(du, -0.75, y0 - 0.2), at(du, -2.6, y), 0.05, segs=4, col=STEEL)
        sh = at(du, -2.6, y)
        box((D, "dark", 1), sh[0] - 0.18, sh[0] + 0.18, y, y + 0.12, sh[2] - 0.18, sh[2] + 0.18, scale=1.0)
    for dv in (-0.15, -0.75):
        a, b = at(-w / 2 - 0.1, dv, 0.0), at(w / 2 + 0.1, dv, 0.0)
        oriented_box((D, "steel", 0), (a[0] + b[0]) / 2, y0 - 0.15, (a[2] + b[2]) / 2, w + 0.2, 0.3, 0.14, yaw, scale=1.0, col=STEEL)
    nst = max(3, int(w / 1.6))
    for k in range(nst + 1):
        u = -w / 2 + w * k / nst
        p = at(u, -0.45, by)
        oriented_box((D, "steel", 1), p[0], by, p[2], 0.08, h + 0.3, 0.08, yaw, scale=1.0, col=STEEL)
    for v_ in (by - h * 0.25, by + h * 0.25):
        p = at(0.0, -0.45, v_)
        oriented_box((D, "steel", 1), p[0], v_, p[2], w + 0.2, 0.07, 0.07, yaw, scale=1.0, col=STEEL)
    for k in range(nst):
        u0, u1 = -w / 2 + w * k / nst, -w / 2 + w * (k + 1) / nst
        pipe((D, "steel", 1), at(u0 if k % 2 else u1, -0.45, by - h / 2), at(u1 if k % 2 else u0, -0.45, by + h / 2), 0.02, segs=3, col=STEEL)
    cw = at(0.0, 0.55, y0)
    oriented_box((D, "steel", 1), cw[0], y0 - 0.04, cw[2], w + 0.3, 0.06, 0.8, yaw, scale=1.0, col=(0.07, 0.075, 0.085, 1))
    for k in range(int(w / 0.5)):
        u = -w / 2 + 0.25 + k * 0.5
        p = at(u, 0.55, y0)
        oriented_box((D, "dark", 1), p[0], y0 - 0.005, p[2], 0.04, 0.02, 0.8, yaw, scale=1.0)
    for v_ in (0.93,):
        a, b = at(-w / 2 - 0.15, v_, y0 + 1.0), at(w / 2 + 0.15, v_, y0 + 1.0)
        pipe((D, "steel", 1), a, b, 0.03, segs=4, col=STEEL)
        a2, b2 = at(-w / 2 - 0.15, v_, y0 + 0.5), at(w / 2 + 0.15, v_, y0 + 0.5)
        pipe((D, "steel", 1), a2, b2, 0.02, segs=3, col=STEEL)
        for k in range(int(w / 1.5) + 1):
            u = -w / 2 - 0.15 + (w + 0.3) * k / int(w / 1.5)
            pipe((D, "steel", 1), at(u, v_, y0), at(u, v_, y0 + 1.0), 0.022, segs=3, col=STEEL)
    # A ladder up the middle leg from the roof to the catwalk.
    for dv in (0.3, 0.75):
        pipe((D, "steel", 1), at(0.25 if len(legs) == 3 else legs[0] + 0.3, dv, y), at(0.25 if len(legs) == 3 else legs[0] + 0.3, dv, y0), 0.025, segs=3, col=STEEL)
    nl = int((y0 - y) / 0.35)
    for k in range(1, nl):
        u = 0.25 if len(legs) == 3 else legs[0] + 0.3
        pipe((D, "steel", 1), at(u, 0.3, y + k * 0.35), at(u, 0.75, y + k * 0.35), 0.015, segs=3, col=STEEL)
    for k in range(max(2, int(w / 2.5))):
        u = -w / 2 + (k + 0.5) * w / max(2, int(w / 2.5))
        lx, lz = cx + rx * u + nx * 1.1, cz + rz * u + nz * 1.1
        box((D, "glow", 1), lx - 0.1, lx + 0.1, y0 + 1.2, y0 + 1.3, lz - 0.1, lz + 0.1, scale=0.5, col=GLOW["white"])
        pipe((D, "steel", 1), at(u, 0.93, y0 + 1.0), (lx, y0 + 1.25, lz), 0.02, segs=3, col=STEEL)
    pool(D, cx + nx * 2.0, cz + nz * 2.0, y, "white", 7.0)


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
    pool(D, x, z, y, hue, power)


def louvre(D, f, s0, s1, y0, y1, out=0.1):
    """A bank of louvres in a steel frame on a wall."""
    f.box((D, "metal", 1), s0, s1, y0, y1, 0.02, out)
    y = y0 + 0.08
    while y < y1 - 0.1:
        f.box((D, "dark", 1), s0 + 0.06, s1 - 0.06, y, y + 0.06, out, out + 0.025)
        y += 0.15


def stripes(D, f, s0, s1, y0, y1, out=0.03, pitch=0.5):
    """Hazard stripes up a strip of wall: yellow, with black bands across
    it on the slant."""
    f.box((D, "hazard", 1), s0, s1, y0, y1, 0.0, out)
    a, b, rise = f.at(s0), f.at(s1), s1 - s0
    y = y0 + 0.1
    while y + rise + pitch * 0.5 < y1:
        quad((D, "trim", 1), f.p(a, y, out + 0.006), f.p(b, y + rise, out + 0.006), f.p(b, y + rise + pitch * 0.5, out + 0.006),
             f.p(a, y + pitch * 0.5, out + 0.006), col=BLACK)
        y += pitch


def roof_fan(D, x, z, y, r=0.45, h=0.55):
    """A roof extract fan: its upstand, the drum and a cowl over it."""
    box((D, "metal", 1), x - r - 0.1, x + r + 0.1, y, y + 0.18, z - r - 0.1, z + r + 0.1, scale=1.0)
    cylinder((D, "metal", 1), x, z, y + 0.18, y + h, r, segs=10)
    cylinder((D, "dark", 1), x, z, y + h, y + h + 0.1, r * 0.82, segs=10)
    cylinder((D, "metal", 1), x, z, y + h + 0.1, y + h + 0.2, r * 1.18, segs=10)


# ---------------------------------------------------------------------------
# The lanes (Zuzys9Ld_5M@87): one dark blue, a cold tube over each door and
# dark between, real windows most of them dark, pipes in bundles, meters,
# cages of mesh fencing, ladders, what a back street keeps.
# ---------------------------------------------------------------------------
LANE_WALL = (0.04, 0.047, 0.062, 1)     # a lane's wall, painted once, near black
LANE_FOOT = (0.014, 0.017, 0.024, 1)    # the darker band painted along its foot
LANE_LINE = (0.07, 0.085, 0.09, 1)      # the line where the two meet
LANE_FLOOR = (0.07, 0.078, 0.095, 1)    # a lane's floor
DADO = 1.25
STAIN = [(0.011, 0.013, 0.018, 1), (0.085, 0.092, 0.1, 1), (0.1, 0.045, 0.022, 1), (0.02, 0.03, 0.022, 1)]
BLIND = (0.085, 0.08, 0.065, 1)
PIPE_PAINT = [(0.15, 0.16, 0.18, 1), (0.2, 0.085, 0.04, 1), (0.06, 0.1, 0.13, 1), (0.24, 0.19, 0.05, 1), (0.1, 0.105, 0.115, 1)]
BOTTLE = [(0.3, 0.07, 0.05, 1), (0.08, 0.12, 0.2, 1), (0.22, 0.2, 0.18, 1)]
# The facade shader's openings in its cell (src/world/glsl.js, windowsT), by
# window style: a small home's window, a small old one.
WINDOW_CELLS = {6: ((0.3, 0.34), (0.7, 0.8)), 3: ((0.24, 0.3), (0.6, 0.7))}

# Where a wall is already taken (a door, a shutter, a window), by its plane
# and the stretch along it, so nothing is hung across a door.
_TAKEN = {}
_VENTS = []   # where a lane's wall has a vent's louvres
_STEAM = [0]


def lane_steam(pos):
    """Steam from a vent in a lane's wall. (The site gives each vent's puffs
    their moments by its place in the anchors' order, which is by name: the
    first four are named to sort where the four lane grates they replace
    did, the rest after the rooftop's own stacks, so the plumes the page's
    roof shots frame keep the moments they had.)"""
    _STEAM[0] += 1
    n = _STEAM[0]
    empty(f"anchor_steam_afterlife_lane_{n - 1}" if n <= 4 else f"anchor_steam_vent_lane_afterlife_{n}", pos)


def _wall(f):
    return (f.name, round(f.plane, 1))


def take(f, s0, s1):
    a, b = sorted((f.at(s0), f.at(s1)))
    _TAKEN.setdefault(_wall(f), []).append((a, b))


def free(f, s0, s1, gap=0.25):
    a, b = sorted((f.at(s0), f.at(s1)))
    return all(b + gap < t0 or a - gap > t1 for t0, t1 in _TAKEN.get(_wall(f), ()))


def back_ground(district, f, r, tcol):
    """The ground floor of a back as these lanes have it (it takes the place
    of buildings.back_ground for this district's lots): poured concrete with
    a darker band along its foot, dark but for a cold tube over each back
    door and its pool on the lane, a shutter for deliveries now and then,
    and by a door what a back street keeps there."""
    w = f.width
    f.quad((district, "castconcrete", 0), 0.0, w, DADO, SHOP_H, 0.0, col=LANE_WALL)
    f.quad((district, "castconcrete", 0), 0.0, w, 0.0, DADO, 0.0, col=LANE_FOOT)
    f.quad((district, "trim", 1), 0.0, w, DADO - 0.03, DADO + 0.03, 0.006, col=LANE_LINE)
    s = r.uniform(1.5, 4.0)
    while s < w - 1.5:
        if r.random() < 0.22 and s + 3.6 < w - 0.5:
            shutter(district, f, s, s + 3.2, h=3.0, lamp=None)
            take(f, s - 0.1, s + 3.3)
            s += r.uniform(7.0, 12.0)
            continue
        w_ = bay(district, f, s, r, deal_bay(r))
        take(f, s - 0.3, s + w_ + 0.1)
        pick = r.random()
        if pick < 0.8 and s + w_ + 2.4 < w:
            px_, _, pz_ = f.p(f.at(s + w_ + 1.2), G0, 0.75)
            kind = ("dumpster", "bags", "rubbish", "pallets", "barrel", "crates")[int(pick / 0.8 * 6)]
            if kind == "dumpster":
                dumpster(district, px_, pz_, f.yaw, r)
            else:
                P.place(kind, px_, G0, pz_, f.yaw, district=district)
            take(f, s + w_ + 0.2, s + w_ + 2.3)
        s += w_ + r.uniform(4.5, 11.0)


BAYS = ("steel", "ajar", "fire", "gate", "kitchen", "double", "hatch", "steel")
_BAY_DECK, _BAY_LAST = [], []
_N_KITCHEN = [0]


def deal_bay(r):
    """The next kind of back door from a shuffled deck, never the kind of
    either of the last two (so no lane shows one door three times)."""
    for _ in range(24):
        if not _BAY_DECK:
            _BAY_DECK.extend(BAYS)
            r.shuffle(_BAY_DECK)
        k = _BAY_DECK.pop()
        if k not in _BAY_LAST[-2:]:
            break
    _BAY_LAST.append(k)
    return k


DOOR_PAINT = {"steel": (0.17, 0.18, 0.2, 1), "fire": (0.32, 0.05, 0.04, 1), "double": (0.05, 0.12, 0.13, 1), "hatch": (0.2, 0.17, 0.08, 1)}


def bay(D, f, s, r, kind):
    """One back door of a lane and what goes with it, s along the face;
    returns its width. steel: a grey door under a tube or a caged lamp,
    its number by it; ajar: a door open on a lit room up a step, a plate
    over it; fire: a red door with a push bar, hazard stripes at its foot,
    a green exit lamp and a caged one; gate: bars over a dark recess, a
    padlock, an intercom and a white bulkhead; kitchen: a lit fly screen
    behind bars, an extractor hood and its duct breathing over it, kegs and
    crates; double: two leaves with kick plates, a meter cabinet, a lit
    poster box; hatch: a loading hatch on a sill with a step, an angled tube."""
    def frame(s0, s1, h, col):
        f.box((D, "metal", 1), s0 - 0.08, s1 + 0.08, h, h + 0.1, 0.0, 0.12)
        for e in (s0 - 0.08, s1):
            f.box((D, "metal", 1), e, e + 0.08, G0, h, 0.0, 0.1)
        f.quad((D, "trim", 0), s0, s1, G0, h, 0.03, col=col)
        f.box((D, "metal", 1), s1 - 0.2, s1 - 0.08, 1.0, 1.08, 0.03, 0.09)

    if kind == "steel":
        frame(s, s + 1.1, 2.3, DOOR_PAINT["steel"])
        f.box((D, "dark", 1), s + 0.1, s + 1.0, 1.55, 1.85, 0.03, 0.05)
        if r.random() < 0.5:
            hue = "cyan" if r.random() < 0.6 else "white"
            f.box((D, "neon_" + hue, 0), s - 0.25, s + 1.35, 2.62, 2.7, 0.06, 0.12)
            f.box((D, "metal", 1), s - 0.3, s + 1.4, 2.7, 2.76, 0.0, 0.16)
            light(D, *f.p(f.at(s + 0.55), G0 + 0.35, 0.9), hue, 3.5)
        else:
            hue = "amber"
            wall_lamp(D, f, s + 0.55, 2.75, hue, 3.0)
        c = GLOW[hue]
        f.box((D, "dark", 1), s + 1.26, s + 1.6, 1.5, 1.74, 0.0, 0.03)
        f.quad((D, "glow", 1), s + 1.29, s + 1.57, 1.53, 1.71, 0.034, col=(c[0] * 0.22, c[1] * 0.22, c[2] * 0.22, 1))
        return 1.65
    if kind == "ajar":
        hue = r.choice(("amber", "green", "white", "pink"))
        stoop(D, f, s, s + 1.5, steps=1)
        lit_door(D, f, s + 0.75, hue, w=1.05, h=2.25, power=3.0)
        f.box((D, "board_frame", 0), s + 0.2, s + 1.3, 2.55, 2.85, 0.0, 0.05)
        c = GLOW[hue]
        f.quad((D, "glow", 1), s + 0.25, s + 1.25, 2.6, 2.8, 0.055, col=(c[0] * 0.3, c[1] * 0.3, c[2] * 0.3, 1))
        return 1.6
    if kind == "fire":
        frame(s, s + 1.2, 2.3, DOOR_PAINT["fire"])
        f.box((D, "metal", 1), s + 0.12, s + 1.08, 1.0, 1.06, 0.03, 0.1)
        stripes(D, f, s - 0.1, s + 1.3, G0, G0 + 0.35, out=0.035, pitch=0.3)
        f.box((D, "glow", 1), s + 0.4, s + 0.8, 2.48, 2.62, 0.0, 0.08, col=GLOW["green"])
        wall_lamp(D, f, s + 1.55, 2.6, "amber", 2.5)
        return 1.85
    if kind == "gate":
        f.quad((D, "trim", 0), s, s + 1.5, G0, 2.4, 0.01, col=BLACK)
        f.box((D, "metal", 1), s - 0.06, s + 1.56, 2.4, 2.5, 0.0, 0.1)
        grille(D, f, s, s + 1.5, G0, 2.4, out=0.06, step=0.14)
        f.box((D, "metal", 1), s + 0.62, s + 0.88, 1.0, 1.1, 0.06, 0.14)
        f.box((D, "metal", 1), s + 1.75, s + 1.95, 1.3, 1.6, 0.0, 0.05)
        f.box((D, "glow", 1), s + 1.82, s + 1.88, 1.5, 1.55, 0.05, 0.055, col=GLOW["red"])
        wall_lamp(D, f, s + 0.75, 2.8, "white", 2.5)
        return 2.0
    if kind == "kitchen":
        c = GLOW["amber"]
        f.box((D, "metal", 1), s - 0.08, s + 1.18, G0, 2.38, 0.0, 0.08)
        f.quad((D, "glow", 0), s, s + 1.1, G0, 2.3, 0.085, col=(c[0] * 0.15, c[1] * 0.12, c[2] * 0.09, 1))
        grille(D, f, s, s + 1.1, G0 + 0.2, 2.3, out=0.12, step=0.09)
        f.box((D, "metal", 0), s - 0.4, s + 1.5, 2.75, 3.15, 0.0, 0.62)
        f.box((D, "metal", 1), s + 0.3, s + 0.8, 3.15, SHOP_H - 0.1, 0.08, 0.5)
        _N_KITCHEN[0] += 1
        if _N_KITCHEN[0] < 12:
            lane_steam(f.p(f.at(s + 0.55), 2.7, 0.4))
        light(D, *f.p(f.at(s + 0.55), G0 + 0.35, 1.0), "amber", 3.0)
        q = f.p(f.at(s + 1.75), G0, 0.4)
        kegs(D, q[0] - 0.2, q[2] - 0.2, r, n=r.choice((2, 4)))
        return 2.4
    if kind == "double":
        for a_ in (s, s + 0.95):
            f.quad((D, "trim", 0), a_, a_ + 0.9, G0, 2.4, 0.03, col=DOOR_PAINT["double"])
            f.box((D, "metal", 1), a_ + 0.05, a_ + 0.85, G0, G0 + 0.3, 0.03, 0.05)
        f.box((D, "metal", 1), s - 0.08, s + 1.93, 2.4, 2.5, 0.0, 0.12)
        for e in (s - 0.08, s + 1.85):
            f.box((D, "metal", 1), e, e + 0.08, G0, 2.4, 0.0, 0.1)
        f.box((D, "metal", 1), s + 2.15, s + 2.75, 0.9, 2.0, 0.02, 0.32)
        f.box((D, "glow", 1), s + 2.6, s + 2.68, 1.85, 1.92, 0.32, 0.335, col=GLOW["green"])
        poster(D, f, s + 3.5, 1.7, 0.8, 1.2, r, out=0.08)
        wall_lamp(D, f, s + 0.95, 2.95, "white", 3.0)
        return 4.0
    # hatch
    f.quad((D, "door_panel", 0), s, s + 1.8, 1.05, 2.4, 0.03)
    f.box((D, "metal", 1), s - 0.06, s + 1.86, 2.4, 2.62, 0.0, 0.22)
    f.box((D, "concrete", 0), s - 0.1, s + 1.9, G0, 1.05, 0.0, 0.45)
    f.box((D, "concrete", 0), s + 2.0, s + 2.6, G0, 0.55, 0.0, 0.6)
    hue = r.choice(("cyan", "white"))
    a, b = f.p(f.at(s - 0.1), 2.95, 0.12), f.p(f.at(s + 1.9), 3.1, 0.12)
    tube(D, a, b, hue, power=3.0)
    return 2.7


def dumpster(D, x, z, yaw, rng, col=None):
    """A wheeled bin for a lane, modelled: a tapered steel body in its paint
    with ribs and side pockets, its lids (one up), corner posts, wheels, a
    stencilled band and grime at its foot."""
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    col = col or rng.choice(((0.05, 0.16, 0.08, 1), (0.04, 0.09, 0.16, 1), (0.2, 0.08, 0.03, 1), (0.14, 0.14, 0.13, 1)))
    dk = (col[0] * 0.55, col[1] * 0.55, col[2] * 0.55, 1)
    w, d, h, y0 = 1.8, 1.1, 1.2, G0 + 0.16

    def at(u, v, y):
        return (x + rx * u + nx * v, y, z + rz * u + nz * v)

    # The body, narrower at its foot: four sides and a floor.
    t = 0.1
    top = [at(-w / 2, d / 2, y0 + h), at(w / 2, d / 2, y0 + h), at(w / 2, -d / 2, y0 + h), at(-w / 2, -d / 2, y0 + h)]
    bot = [at(-w / 2 + t, d / 2 - t, y0), at(w / 2 - t, d / 2 - t, y0), at(w / 2 - t, -d / 2 + t, y0), at(-w / 2 + t, -d / 2 + t, y0)]
    for i in range(4):
        j = (i + 1) % 4
        quad((D, "steel", 0), bot[i], bot[j], top[j], top[i], col=col)
        quad((D, "steel", 0), bot[j], bot[i], top[i], top[j], col=col)
    quad((D, "steel", 0), bot[3], bot[2], bot[1], bot[0], col=dk)
    # Its rim, ribs down the front, pockets on the ends, a stencilled band.
    for (u0, u1, v0, v1) in ((-w / 2 - 0.04, w / 2 + 0.04, d / 2 - 0.02, d / 2 + 0.05), (-w / 2 - 0.04, w / 2 + 0.04, -d / 2 - 0.05, -d / 2 + 0.02)):
        p = at((u0 + u1) / 2, (v0 + v1) / 2, 0.0)
        oriented_box((D, "steel", 1), p[0], y0 + h - 0.05, p[2], u1 - u0, 0.1, v1 - v0, yaw, scale=1.0, col=dk)
    for k in range(4):
        u = -w / 2 + 0.3 + k * (w - 0.6) / 3
        p = at(u, d / 2 - 0.04, 0.0)
        oriented_box((D, "steel", 1), p[0], y0 + h / 2, p[2], 0.07, h * 0.9, 0.07, yaw, scale=1.0, col=dk)
    for sd in (-1, 1):
        p = at(sd * (w / 2 + 0.02), 0.0, 0.0)
        oriented_box((D, "steel", 1), p[0], y0 + h * 0.62, p[2], 0.1, 0.22, 0.7, yaw, scale=1.0, col=dk)
    band = at(0.0, d / 2 + 0.003, 0.0)
    rotated_quad((D, "trim", 1), band[0], y0 + h * 0.58, band[2], w * 0.55, 0.16, yaw, col=(0.5, 0.48, 0.42, 1))
    rotated_quad((D, "trim", 1), band[0] + nx * 0.002, y0 + 0.14, band[2] + nz * 0.002, w - 0.25, 0.22, yaw, col=(0.02, 0.022, 0.02, 1))
    # Lids: one shut, one propped up.
    l0 = [at(-w / 2, d / 2 + 0.06, y0 + h + 0.04), at(0.0, d / 2 + 0.06, y0 + h + 0.04), at(0.0, -d / 2, y0 + h + 0.12), at(-w / 2, -d / 2, y0 + h + 0.12)]
    quad((D, "steel", 0), *l0, col=(0.03, 0.035, 0.035, 1))
    up = rng.uniform(0.3, 0.9)
    l1 = [at(0.02, -d / 2, y0 + h + 0.12), at(w / 2, -d / 2, y0 + h + 0.12), at(w / 2, -d / 2 + d * math.cos(up), y0 + h + 0.12 + d * math.sin(up)),
          at(0.02, -d / 2 + d * math.cos(up), y0 + h + 0.12 + d * math.sin(up))]
    quad((D, "steel", 0), *l1, col=(0.03, 0.035, 0.035, 1))
    quad((D, "steel", 0), l1[1], l1[0], l1[3], l1[2], col=(0.03, 0.035, 0.035, 1))
    for su in (-1, 1):
        for sv in (-1, 1):
            p = at(su * (w / 2 - 0.2), sv * (d / 2 - 0.2), 0.0)
            cylinder((D, "dark", 1), p[0], p[2], G0, y0, 0.08, segs=6)


def window(D, f, s, y, rng, lit=0.0, tint=1, style=6, over="bars", out=0.05):
    """A real window in a wall, its left jamb s along the face and its sill
    at y: one cell's opening of the kit's window shader (the facade
    material: a reveal, the glass, a room behind it lit or dark) in a steel
    frame on a sill, bars or a half-drawn blind over it. Returns its width."""
    (u0, v0), (u1, v1) = WINDOW_CELLS[style]
    w, h = (u1 - u0) * CELL_W, (v1 - v0) * CELL_H
    m = 0.03
    cu, cv = rng.randrange(40), rng.randrange(40)
    ua, ub, va, vb = cu + u0 - m / CELL_W, cu + u1 + m / CELL_W, cv + v0 - m / CELL_H, cv + v1 + m / CELL_H
    f.quad((D, "facade", 0), s - m, s + w + m, y - m, y + h + m, out, uvs=((ua, va), (ub, va), (ub, vb), (ua, vb)),
           col=B.wall_col(lit, style, rng.uniform(0.6, 1.0), tint))
    k = (D, "metal", 1)
    for e in (s - 0.08, s + w):
        f.box(k, e, e + 0.08, y - 0.08, y + h + 0.08, 0.0, out + 0.07)
    f.box(k, s, s + w, y + h, y + h + 0.08, 0.0, out + 0.07)
    f.box(k, s - 0.14, s + w + 0.14, y - 0.1, y, 0.0, out + 0.14)
    if over in ("bars", "both"):
        grille(D, f, s, s + w, y, y + h, out=out + 0.05, step=0.18)
    if over in ("blind", "both"):
        drop = rng.uniform(0.35, 0.85) * h
        n = max(3, int(drop / 0.11))
        for i in range(n):
            yy = y + h - (i + 1) * drop / n
            f.quad((D, "trim", 1), s + 0.02, s + w - 0.02, yy, yy + drop / n * 0.7, out + 0.012, col=BLIND)
    return w


def pipe_bundle(D, f, s0, s1, y, rng, n=4):
    """A bundle of painted pipes along a wall, thick and thin, on brackets,
    one or two of them turning down to the ground."""
    yy = y
    for k in range(n):
        rad = rng.choice((0.035, 0.05, 0.07, 0.1))
        yy += rad
        pipe((D, "steel", 1), f.p(f.at(s0), yy, 0.12 + rad), f.p(f.at(s1), yy, 0.12 + rad), rad, segs=5, col=rng.choice(PIPE_PAINT))
        yy += rad + 0.04
    s = s0 + 0.5
    while s < s1:
        f.box((D, "dark", 1), s - 0.03, s + 0.03, y - 0.06, yy + 0.04, 0.0, 0.34)
        s += 2.3
    for e in (s0 + rng.uniform(0.15, 0.6), s1 - rng.uniform(0.15, 0.6)):
        if free(f, e - 0.1, e + 0.1, gap=0.1):
            pipe((D, "steel", 1), f.p(f.at(e), G0, 0.18), f.p(f.at(e), y + 0.05, 0.18), 0.05, segs=5, col=rng.choice(PIPE_PAINT))


def cage(D, f, s0, s1, rng, out=0.95):
    """A cage of mesh fencing against a wall (the kit's panels, 2.4 m wide
    and 2 m high, across its front and its two ends) and what is locked in
    it: gas bottles, a barrel."""
    n = max(1, round((s1 - s0) / 2.4))
    step = (s1 - s0) / n
    for i in range(n):
        x, _, z = f.p(f.at(s0 + (i + 0.5) * step), G0, out)
        P.place("fence_mesh", x, G0, z, f.yaw, sxz=step / 2.4, district=D)
    for e in (s0, s1):
        x, _, z = f.p(f.at(e), G0, out / 2)
        P.place("fence_mesh", x, G0, z, f.yaw + math.pi / 2, sxz=out / 2.4, district=D)
        x, _, z = f.p(f.at(e), G0, out)
        cylinder((D, "metal", 1), x, z, G0, G0 + 2.05, 0.035, segs=5)
    for k in range(rng.randrange(2, 5)):
        x, _, z = f.p(f.at(s0 + 0.4 + k * 0.33), G0, 0.32)
        cylinder((D, "steel", 1), x, z, G0, G0 + 1.25, 0.13, segs=7, col=rng.choice(BOTTLE))
    if s1 - s0 > 3.0:
        x, _, z = f.p(f.at(s1 - 0.6), G0, 0.45)
        P.place("barrel", x, G0, z, district=D)


def lane_wall(D, f, rng, top, dens=1.0, blades=True, s0=0.0, s1=None, bundle=True):
    """What a back wall carries at a walker's height, between its doors
    (the passage's wall, Zuzys9Ld_5M@87): a bundle of pipes on brackets,
    real windows (most of them dark, barred or behind a blind), meter boxes
    with a lamp each, a cage of mesh fencing, a cat ladder, bags and
    pallets, louvres, shelving, a poster, and seldom a small sign turned to
    the lane; conduits up it in threes."""
    s1 = f.width if s1 is None else s1
    if bundle and s1 - s0 > 6.0:
        a = s0 + rng.uniform(0.3, 1.5)
        pipe_bundle(D, f, a, min(s1 - 0.3, a + rng.uniform(7.0, 16.0)), rng.uniform(3.02, 3.25), rng, n=rng.randrange(2, 5))
    kinds = ["window"] * 30 + ["meters"] * 12 + ["cage"] * 9 + ["heap"] * 12 + ["ladder"] * 5 + ["poster"] * 4 + ["vent"] * 9 + ["rack"] * 7
    if blades:
        kinds += ["blade"] * 3
    widths = {"window": 1.3, "meters": 1.4, "cage": 3.4, "heap": 1.8, "ladder": 0.7, "poster": 1.2, "vent": 1.2, "rack": 2.0, "blade": 0.3}
    s = s0 + rng.uniform(0.8, 2.4)
    while s < s1 - 1.6:
        kind = rng.choice(kinds)
        w = widths[kind]
        if s + w > s1 - 0.3 or not free(f, s, s + w):
            s += 0.7
            continue
        if kind == "window":
            window(D, f, s, 1.3, rng, lit=1.0 if rng.random() < 0.85 else 0.0, style=rng.choice((6, 6, 3)),
                   over=rng.choice(("bars", "blind", "blind", "both")))
        elif kind == "meters":
            for k in range(rng.randrange(1, 4)):
                a = s + k * 0.46
                f.box((D, "metal", 1), a, a + 0.4, 1.25, 1.95, 0.04, 0.22)
                f.box((D, "glow", 1), a + 0.29, a + 0.35, 1.82, 1.88, 0.22, 0.235, col=GLOW[rng.choice(("red", "green", "cyan"))])
                pipe((D, "metal", 1), f.p(f.at(a + 0.2), 1.95, 0.12), f.p(f.at(a + 0.2), min(top - 0.5, rng.uniform(4.0, 7.0)), 0.12), 0.03, segs=4)
        elif kind == "cage":
            cage(D, f, s, s + w, rng)
        elif kind == "heap":
            p = f.p(f.at(s + w / 2), G0, 0.72)
            P.place(rng.choice(("bags", "rubbish", "pallets", "barrel", "bags")), p[0], G0, p[2], f.yaw, district=D)
        elif kind == "ladder":
            ladder(D, f, s + 0.35, 2.5, min(top - 0.3, rng.uniform(9.0, 14.0)), out=0.36)
        elif kind == "poster":
            poster(D, f, s + 0.6, 2.05, 1.0, 1.45, rng, out=0.05)
        elif kind == "blade":
            p = f.p(f.at(s), 0.0, 0.0)
            blade(D, p[0], p[2], rng.uniform(3.9, 5.6), rng.choice(("bs", "bx", "bs")), f.yaw + rng.uniform(-0.6, 0.6))
        elif kind == "vent":
            # A vent's louvres, a drip of rust under them.
            f.box((D, "metal", 1), s, s + w, 2.2, 2.9, 0.03, 0.12)
            for k in range(4):
                f.box((D, "dark", 1), s + 0.06, s + w - 0.06, 2.28 + k * 0.15, 2.34 + k * 0.15, 0.12, 0.135)
            f.quad((D, "trim", 1), s + w * 0.3, s + w * 0.5, 1.0, 2.2, 0.012, col=RUST_DARK)
            _VENTS.append(f.p(f.at(s + w / 2), 2.55, 0.16))
            if len(_VENTS) % 3 == 1 and len(_VENTS) < 16:
                lane_steam(_VENTS[-1])
        else:
            # A rack of shelves against the wall, boxes on it.
            for e in (s, s + w):
                f.box((D, "metal", 1), e - 0.03, e + 0.03, G0, 2.0, 0.05, 0.5)
            for k in range(3):
                yy = G0 + 0.35 + k * 0.6
                f.box((D, "metal", 1), s, s + w, yy, yy + 0.04, 0.05, 0.5)
                if rng.random() < 0.8:
                    q = f.p(f.at(s + rng.uniform(0.3, w - 0.3)), 0.0, 0.28)
                    oriented_box((D, "trim", 1), q[0], yy + 0.22, q[2], rng.uniform(0.4, 0.7), 0.36, 0.38, f.yaw, scale=1.0, col=rng.choice([CARD, WOOD] + PLASTIC))
        take(f, s, s + w)
        s += w + rng.uniform(0.8, 2.6) / dens
    # Conduits up the wall in threes.
    s = s0 + rng.uniform(2.0, 5.0)
    while s < s1 - 1.0:
        if free(f, s - 0.05, s + 0.4, gap=0.05):
            for k in range(rng.randrange(2, 4)):
                pipe((D, "metal", 1), f.p(f.at(s + k * 0.11), G0, 0.09), f.p(f.at(s + k * 0.11), min(top - 0.4, rng.uniform(3.6, 6.5)), 0.09), 0.028, segs=3)
        s += rng.uniform(4.0, 8.0) / dens
    # And no three metres of it bare: along every stretch still free a run
    # of conduit at the wall's foot with its junction boxes, stains down the
    # paint (damp, lime, rust), a small lit plate, and now and then a screen.
    s, k = s0 + 0.4, rng.randrange(5)
    while s < s1 - 0.9:
        if not free(f, s, s + 0.8, gap=0.1):
            s += 0.6
            continue
        e = s + 0.8
        while e < s1 - 0.3 and e - s < 3.2 and free(f, e, e + 0.5, gap=0.1):
            e += 0.5
        for yy in (0.34, 0.46):
            pipe((D, "steel", 1), f.p(f.at(s), yy, 0.06), f.p(f.at(e), yy, 0.06), 0.022, segs=3, col=PIPE_PAINT[4])
        f.box((D, "metal", 1), s + 0.1, s + 0.36, 0.28, 0.58, 0.02, 0.13)
        f.box((D, "glow", 1), s + 0.29, s + 0.33, 0.5, 0.54, 0.13, 0.14, col=GLOW[("green", "red", "cyan")[k % 3]])
        m = (s + e) / 2
        if k % 5 == 3 and e - s > 1.6 and y_screen(top):
            poster(D, f, m, 1.85, 1.0, 0.62, rng, out=0.05)
        else:
            w = rng.uniform(0.25, 0.7)
            ytop = rng.uniform(2.6, SHOP_H - 0.2)
            f.quad((D, "trim", 1), m - w / 2, m + w / 2, ytop - rng.uniform(1.2, 2.4), ytop, 0.007, col=STAIN[k % len(STAIN)])
            if k % 2 == 0 and e - s > 1.4:
                f.box((D, "metal", 1), m + 0.5, m + 0.78, 1.45, 1.8, 0.02, 0.1)
                pipe((D, "steel", 1), f.p(f.at(m + 0.64), 0.46, 0.06), f.p(f.at(m + 0.64), 1.45, 0.06), 0.02, segs=3, col=PIPE_PAINT[4])
        take(f, s, e)
        s = e + 0.2
        k += 1


def y_screen(top):
    """A wall takes a screen only where it is a proper storey high."""
    return top >= 6.0


def lane_floor(D, x0, x1, z0, z1):
    """A lane's floor: poured concrete, dark, so the tubes' pools are the
    light in it."""
    pts = ((x0, G0, z1), (x1, G0, z1), (x1, G0, z0), (x0, G0, z0))
    quad((D, "castconcrete", 0), *pts, col=LANE_FLOOR)


def stoop(D, f, s0, s1, steps=2, out=0.34, rise=0.18):
    """Steps up to a door from a lane."""
    for k in range(steps):
        fbox(f, (D, "concrete", 0), s0, s1, G0, G0 + rise * (steps - k), 0.0, out * (k + 1))


# ---------------------------------------------------------------------------
# A lot's life: stalls, parked bikes, cracks in the paving.
# ---------------------------------------------------------------------------
STALL_BODY = [(0.09, 0.1, 0.12, 1), (0.16, 0.07, 0.04, 1), (0.05, 0.1, 0.1, 1), (0.12, 0.11, 0.1, 1)]
CANVAS = [RUST, (0.05, 0.16, 0.17, 1), (0.3, 0.05, 0.06, 1), (0.28, 0.22, 0.05, 1), (0.1, 0.12, 0.2, 1)]
BIKE_PAINT = [(0.35, 0.06, 0.05, 1), (0.05, 0.05, 0.06, 1), (0.6, 0.45, 0.05, 1), (0.05, 0.2, 0.3, 1), (0.42, 0.43, 0.45, 1), (0.1, 0.25, 0.1, 1)]


def stall(D, x, z, yaw, rng, hue="amber", w=2.4, d=1.1, canvas=None, steam=None):
    """A street stall facing `yaw` (its customers' side): a counter with a
    lit band along its front, a steel top with its goods and a pot, posts,
    a canvas roof sloping to the front with a valance and a row of bulbs on
    its edge, a lit menu hung at the back, stools in front, its light on
    the ground. `steam`: a name for the steam off the pot."""
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)

    def at(u, v, y):
        return (x + rx * u + nx * v, y, z + rz * u + nz * v)

    c = GLOW[hue]
    body = rng.choice(STALL_BODY)
    oriented_box((D, "trim", 0), x, G0 + 0.5, z, w, 1.0, d, yaw, scale=1.0, col=body)
    oriented_box((D, "metal", 0), x + nx * 0.05, G0 + 1.03, z + nz * 0.05, w + 0.12, 0.06, d + 0.2, yaw, scale=1.0)
    f = at(0.0, d / 2 + 0.005, 0.0)
    rotated_quad((D, "glow", 0), f[0], G0 + 0.86, f[2], w - 0.1, 0.08, yaw, col=(c[0] * 0.35, c[1] * 0.35, c[2] * 0.35, 1))
    rotated_quad((D, "trim", 1), f[0] + nx * 0.003, G0 + 0.45, f[2] + nz * 0.003, w - 0.3, 0.55, yaw, col=(body[0] * 1.8, body[1] * 1.8, body[2] * 1.8, 1))
    # Its posts and roof.
    y_back, y_front = G0 + 2.55, G0 + 2.25
    for u in (-w / 2 + 0.05, w / 2 - 0.05):
        for v, top in ((-d / 2 + 0.05, y_back), (d / 2 + 0.25, y_front)):
            p = at(u, v, 0.0)
            pipe((D, "metal", 1), (p[0], G0, p[2]), (p[0], top, p[2]), 0.025, segs=4)
    cv = canvas or rng.choice(CANVAS)
    k = (D, "awning", 0)
    q = (at(-w / 2 - 0.15, -d / 2 - 0.05, y_back), at(w / 2 + 0.15, -d / 2 - 0.05, y_back), at(w / 2 + 0.15, d / 2 + 0.45, y_front), at(-w / 2 - 0.15, d / 2 + 0.45, y_front))
    quad(k, q[3], q[2], q[1], q[0], col=cv)
    quad(k, q[0], q[1], q[2], q[3], col=cv)
    v0, v1 = at(-w / 2 - 0.15, d / 2 + 0.45, y_front - 0.25), at(w / 2 + 0.15, d / 2 + 0.45, y_front - 0.25)
    dark = (cv[0] * 0.7, cv[1] * 0.7, cv[2] * 0.7, 1)
    quad(k, v0, v1, q[2], q[3], col=dark)
    quad(k, v1, v0, q[3], q[2], col=dark)
    for i in range(int((w + 0.2) / 0.4)):
        p = at(-w / 2 + 0.05 + i * 0.4, d / 2 + 0.47, y_front - 0.32)
        box((D, "glow", 1), p[0] - 0.045, p[0] + 0.045, p[1] - 0.06, p[1], p[2] - 0.045, p[2] + 0.045, scale=0.5, col=GLOW["amber"])
    m = at(0.0, -d / 2 + 0.06, 0.0)
    board(D, m[0], G0 + 1.85, m[2], "ps", yaw, frame=0.05)
    # Goods and a pot on the counter.
    for i in range(rng.randrange(3, 6)):
        u = -w / 2 + 0.3 + i * (w - 0.6) / 4.5
        p = at(u, rng.uniform(-0.25, 0.1), 0.0)
        oriented_box((D, "trim", 1), p[0], G0 + 1.06 + 0.09, p[2], rng.uniform(0.18, 0.35), 0.18, rng.uniform(0.16, 0.28), yaw + rng.uniform(-0.3, 0.3), scale=1.0,
                     col=rng.choice(PLASTIC + [CARD]))
    pot = at(w * 0.3, -0.15, 0.0)
    cylinder((D, "metal", 1), pot[0], pot[2], G0 + 1.06, G0 + 1.38, 0.2, segs=8)
    if steam:
        empty(f"anchor_steam_stall_{steam}", (pot[0], G0 + 1.42, pot[2]))
    for u in (-0.7, 0.0, 0.7):
        p = at(u, d / 2 + 0.55, 0.0)
        cylinder((D, "metal", 1), p[0], p[2], G0, G0 + 0.62, 0.03, segs=4)
        cylinder((D, "trim", 1), p[0], p[2], G0 + 0.62, G0 + 0.67, 0.17, segs=8, col=rng.choice(PLASTIC))
    lp = at(0.0, d / 2 + 0.9, 0.0)
    light(D, lp[0], 1.4, lp[2], hue, 4.0)


def bike(D, x, z, yaw, rng, lean=0.12, paint=None):
    """A motorbike on its stand pointing `yaw`, leant over a little: two
    wheels, a frame and tank in its paint, a seat, forks, bars, a lamp."""
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)

    def at(v, y, u=0.0):
        # v along it, u across, leant toward +u with height.
        u = u + lean * (y - G0)
        return (x + nx * v + rx * u, y, z + nz * v + rz * u)

    col = paint or rng.choice(BIKE_PAINT)
    r = 0.3
    for v in (-0.68, 0.68):
        a, b = at(v, G0 + r, -0.06), at(v, G0 + r, 0.06)
        pipe((D, "dark", 0), a, b, r, segs=10, caps=True)
        pipe((D, "metal", 1), at(v, G0 + r, -0.07), at(v, G0 + r, 0.07), r * 0.45, segs=6, caps=True)
    m = at(0.0, G0 + 0.62)
    oriented_box((D, "trim", 0), m[0], G0 + 0.62, m[2], 0.26, 0.3, 1.0, yaw, scale=1.0, col=col)
    t = at(0.22, G0 + 0.86)
    oriented_box((D, "trim", 0), t[0], G0 + 0.86, t[2], 0.3, 0.2, 0.5, yaw, scale=1.0, col=col)
    s = at(-0.32, G0 + 0.86)
    oriented_box((D, "dark", 1), s[0], G0 + 0.86, s[2], 0.26, 0.12, 0.6, yaw, scale=1.0)
    pipe((D, "metal", 1), at(0.68, G0 + r), at(0.5, G0 + 1.05), 0.03, segs=4)
    pipe((D, "metal", 1), at(0.5, G0 + 1.05, -0.36), at(0.5, G0 + 1.05, 0.36), 0.02, segs=4)
    pipe((D, "metal", 1), at(-0.3, G0 + 0.45), at(-0.68, G0 + r), 0.03, segs=4)
    h = at(0.62, G0 + 0.95)
    box((D, "glow", 1), h[0] - 0.06, h[0] + 0.06, h[1] - 0.05, h[1] + 0.05, h[2] - 0.06, h[2] + 0.06, scale=0.5, col=GLOW["white"])
    tl = at(-0.66, G0 + 0.82)
    box((D, "glow", 1), tl[0] - 0.05, tl[0] + 0.05, tl[1] - 0.03, tl[1] + 0.03, tl[2] - 0.05, tl[2] + 0.05, scale=0.5, col=GLOW["red"])


def crack(D, x, z, rng, length=3.0, y=G0 + 0.004, col=(0.012, 0.012, 0.015, 1)):
    """A crack across paving: a few short kinked runs, thin."""
    ang = rng.uniform(0, math.tau)
    px, pz = x, z
    left = length
    while left > 0.2:
        step = min(left, rng.uniform(0.4, 1.0))
        ang += rng.uniform(-0.7, 0.7)
        qx, qz = px + math.cos(ang) * step, pz + math.sin(ang) * step
        wx, wz = -math.sin(ang) * 0.02, math.cos(ang) * 0.02
        quad((D, "trim", 1), (px - wx, y, pz - wz), (qx - wx, y, qz - wz), (qx + wx, y, qz + wz), (px + wx, y, pz + wz), col=col)
        quad((D, "trim", 1), (px + wx, y, pz + wz), (qx + wx, y, qz + wz), (qx - wx, y, qz - wz), (px - wx, y, pz - wz), col=col)
        px, pz = qx, qz
        left -= step
