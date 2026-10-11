"""Corpo Plaza's own parts: what its blocks and its square are made of.

The show's corporate plazas (BIBLE.md, "Corpo Plaza") are towers on podiums
round clean wet paving: glass shafts with a lit emblem in their top third,
podium roofs that are gardens, pools and landing pads, freestanding screens
on steel legs, planters edged in cyan light, rails with a line of light
along them, stairs with light in their risers. These are those pieces, built
from the kit's primitives and keyed to the plaza's own pack.

Light: the site bakes every neon, shop and billboard triangle onto the
ground at the triangle's own middle, so a long line of light is cut every
few metres here (`gline`, `nbox`) or it would land in one pool. `glow` is
not baked (it is for what is high over the street) and takes any colour on
its vertices, so a dim one is lit glass: a pool, a skylight, a tower's fin.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P

PL = "plaza"

# The Work shot's lens and the line from it to the foot of ARASAKA's name
# (151.5 m up at z -467.4): nothing north of the board's block may reach it,
# or it stands across the name. A phone's lens is lower and further back and
# its line is a little lower still, so the margin covers both.
WORK_EYE = (13.0, -204.0)
WORK_RISE = 0.526


def work_cap(z, margin=5.0):
    """How high anything may stand at z (north of the board) under the
    Work shot's line to ARASAKA's name."""
    return WORK_EYE[0] + WORK_RISE * (WORK_EYE[1] - z) - margin


# ---------------------------------------------------------------------------
# Light.
# ---------------------------------------------------------------------------
def gline(colour, x0, z0, x1, z1, y, w=0.08, step=3.2, detail=0):
    """A line of light set flush in the paving from (x0, z0) to (x1, z1)."""
    length = math.hypot(x1 - x0, z1 - z0)
    n = max(1, int(math.ceil(length / step)))
    dx, dz = (x1 - x0) / length, (z1 - z0) / length
    px, pz = -dz * w / 2, dx * w / 2
    key = (PL, "neon_" + colour, detail)
    for i in range(n):
        ax, az = x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n
        bx_, bz_ = x0 + (x1 - x0) * (i + 1) / n, z0 + (z1 - z0) * (i + 1) / n
        pts = [(ax - px, az - pz), (bx_ - px, bz_ - pz), (bx_ + px, bz_ + pz), (ax + px, az + pz)]
        up_poly(key, pts, y)


def nbox(colour, x0, x1, y0, y1, z0, z1, step=3.2, detail=0):
    """A bar of neon, cut along its length so its light spreads."""
    key = (PL, "neon_" + colour, detail)
    if x1 - x0 >= z1 - z0:
        n = max(1, int(math.ceil((x1 - x0) / step)))
        for i in range(n):
            box(key, x0 + (x1 - x0) * i / n, x0 + (x1 - x0) * (i + 1) / n, y0, y1, z0, z1, scale=1.0)
    else:
        n = max(1, int(math.ceil((z1 - z0) / step)))
        for i in range(n):
            box(key, x0, x1, y0, y1, z0 + (z1 - z0) * i / n, z0 + (z1 - z0) * (i + 1) / n, scale=1.0)


def up_poly(key, pts2, y, col=(1, 1, 1, 1), scale=2.0):
    """A flat polygon facing up (x, z points in either order round it)."""
    area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts2, pts2[1:] + pts2[:1]))
    if area > 0:
        pts2 = list(reversed(pts2))
    pts = [(x, y, z) for x, z in pts2]
    poly(key, pts, [(p[0] / scale, -p[2] / scale) for p in pts], col)


def up_tri(key, a, b, c, col=(1, 1, 1, 1)):
    """A triangle of three (x, y, z) points, wound to face up."""
    cross = (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])
    if cross > 0:
        b, c = c, b
    poly(key, [a, b, c], [(p[0] / 2.0, -p[2] / 2.0) for p in (a, b, c)], col)


def ngon(cx, cz, r, n, turn=0.0):
    """A regular plan of n corners round (cx, cz), walked as cut_rect is
    (the outside on the left of each edge)."""
    return [(cx + r * math.cos(turn - i * math.tau / n), cz + r * math.sin(turn - i * math.tau / n)) for i in range(n)]


def ring(key, cx, cz, r0, r1, y, n=16, col=(1, 1, 1, 1), turn=0.0):
    """A flat ring facing up."""
    for i in range(n):
        a0, a1 = turn + i * math.tau / n, turn + (i + 1) * math.tau / n
        up_poly(key, [(cx + r0 * math.cos(a0), cz + r0 * math.sin(a0)), (cx + r1 * math.cos(a0), cz + r1 * math.sin(a0)),
                      (cx + r1 * math.cos(a1), cz + r1 * math.sin(a1)), (cx + r0 * math.cos(a1), cz + r0 * math.sin(a1))], y, col)


def dim(colour, k):
    """A glow colour turned down to k of itself: lit glass, not a lamp."""
    c = GLOW[colour]
    if colour == "white":
        k *= 0.5
    return (c[0] * k, c[1] * k, c[2] * k, 1.0)


# ---------------------------------------------------------------------------
# A face in space: bars and quads drawn on a vertical plane at any angle
# (an emblem's strokes, a screen's frame), u across it, v up.
# ---------------------------------------------------------------------------
class Plane:
    def __init__(self, cx, cy, cz, yaw):
        self.c = (cx, cy, cz)
        self.rx, self.rz = math.cos(yaw), -math.sin(yaw)
        self.nx, self.nz = math.sin(yaw), math.cos(yaw)
        self.yaw = yaw

    def at(self, u, v, d=0.0):
        return (self.c[0] + self.rx * u + self.nx * d, self.c[1] + v, self.c[2] + self.rz * u + self.nz * d)

    def bar(self, key, p, q, t, col, d=0.0):
        """A stroke from p to q (u, v), t thick, facing out."""
        length = math.hypot(q[0] - p[0], q[1] - p[1])
        du, dv = (q[0] - p[0]) / length, (q[1] - p[1]) / length
        hu, hv = -dv * t / 2, du * t / 2
        quad(key, self.at(p[0] - hu, p[1] - hv, d), self.at(q[0] - hu, q[1] - hv, d), self.at(q[0] + hu, q[1] + hv, d),
             self.at(p[0] + hu, p[1] + hv, d), col=col)

    def rect(self, key, u0, u1, v0, v1, col=(1, 1, 1, 1), d=0.0, uvs=((0, 0), (1, 0), (1, 1), (0, 1))):
        quad(key, self.at(u0, v0, d), self.at(u1, v0, d), self.at(u1, v1, d), self.at(u0, v1, d), uvs, col)


EMBLEMS = ("hex", "chevrons", "delta", "rings", "gate", "bars")


def emblem(kind, cx, cy, cz, size, yaw, colour, weight=0.09):
    """A corporation's mark in light on a tower's face, `size` metres
    across: no words, so no name, each tower its own."""
    pl = Plane(cx, cy, cz, yaw)
    key = (PL, "glow", 0)
    col = GLOW[colour]
    s = size / 2
    t = size * weight

    def loop(pts):
        for a, b in zip(pts, pts[1:] + pts[:1]):
            pl.bar(key, a, b, t, col, 0.06)

    if kind == "hex":
        loop([(s * math.cos(i * math.tau / 6 + math.pi / 6), s * math.sin(i * math.tau / 6 + math.pi / 6)) for i in range(6)])
        pl.bar(key, (-s * 0.45, 0.0), (s * 0.45, 0.0), t, col, 0.06)
        pl.bar(key, (0.0, -s * 0.45), (0.0, s * 0.45), t, col, 0.06)
    elif kind == "chevrons":
        for k in range(3):
            v = s * (0.55 - 0.55 * k)
            pl.bar(key, (-s * 0.8, v - s * 0.45), (0.0, v), t, col, 0.06)
            pl.bar(key, (0.0, v), (s * 0.8, v - s * 0.45), t, col, 0.06)
    elif kind == "delta":
        loop([(-s, -s * 0.8), (s, -s * 0.8), (0.0, s * 0.9)])
        pl.bar(key, (-s * 0.42, -s * 0.2), (s * 0.42, -s * 0.2), t, col, 0.06)
    elif kind == "rings":
        for rr in (s, s * 0.55):
            loop([(rr * math.cos(i * math.tau / 12), rr * math.sin(i * math.tau / 12)) for i in range(12)])
        pl.bar(key, (-s * 1.1, -s * 1.1), (s * 1.1, s * 1.1), t, col, 0.06)
    elif kind == "gate":
        pl.bar(key, (-s, s * 0.75), (s, s * 0.75), t, col, 0.06)
        pl.bar(key, (-s * 0.8, s * 0.4), (s * 0.8, s * 0.4), t * 0.8, col, 0.06)
        for u in (-s * 0.55, s * 0.55):
            pl.bar(key, (u, s * 0.75), (u, -s), t, col, 0.06)
    else:
        for k, w in enumerate((1.0, 0.62, 0.84, 0.4)):
            v = s * (0.75 - 0.5 * k)
            pl.bar(key, (-s, v), (-s + 2 * s * w, v), t * 1.2, col, 0.06)


# ---------------------------------------------------------------------------
# Signs and screens.
# ---------------------------------------------------------------------------
def screen(cx, cy, cz, w, h, yaw, r, back=True, depth=0.4):
    """A screen: a lit advert the site draws (no words), in its frame."""
    B.billboard(PL, cx, cy, cz, w, h, yaw, r, frame=True, back=back, depth=depth)


def screen_on_legs(cx, cz, y0, w, h, yaw, r, base=0.15, back=True):
    """A freestanding screen on two steel legs (Fn9gKhU_2_Q@74,
    YRL74JmhVgk@133), its foot at `base`, the screen's bottom at y0."""
    screen(cx, y0 + h / 2, cz, w, h, yaw, r, back=back)
    pl = Plane(cx, 0.0, cz, yaw)
    for u in (-w * 0.36, w * 0.36):
        px_, _, pz_ = pl.at(u, 0.0, -0.22)
        oriented_box((PL, "metal", 0), px_, (base + y0) / 2, pz_, 0.3, y0 - base, 0.3, yaw, scale=0.5)
    px_, _, pz_ = pl.at(0.0, 0.0, -0.22)
    oriented_box((PL, "metal", 1), px_, y0 - 0.5, pz_, w * 0.72, 0.12, 0.12, yaw, scale=0.5)


def big_sign(size, k, cx, cy, cz, yaw, double=True, frame=True):
    """One of the street's standard signs drawn k times its size (the site
    paints the same face larger): a tower's column of type, a podium's
    board. Both faces painted when it stands out from a wall."""
    w, h = ST_SIZES[size][0] * k, ST_SIZES[size][1] * k
    nx, nz = math.sin(yaw), math.cos(yaw)
    sid = st_name(size)
    sign(sid, cx + nx * 0.14, cy, cz + nz * 0.14, w, h, yaw, district=PL, label=False)
    if double:
        sign(sid + "_b", cx - nx * 0.14, cy, cz - nz * 0.14, w, h, yaw + math.pi, district=PL, label=False)
    if frame:
        oriented_box((PL, "board_frame", 0), cx if double else cx - nx * 0.1, cy, cz if double else cz - nz * 0.1,
                     w + 0.3, h + 0.3, 0.24, yaw, scale=1.0)
    return w, h


def blade_off(f, s, y, size, k, out=None, angle=0.0):
    """A big blade standing out from a building's face `f` (a buildings.Face)
    s metres along it, its foot at y, turned `angle` from square to the wall
    so the street reads it coming."""
    w, h = ST_SIZES[size][0] * k, ST_SIZES[size][1] * k
    out = (0.5 + w / 2) if out is None else out
    cx, _, cz = f.p(f.at(s), 0.0, out)
    yaw = f.yaw + math.pi / 2 + angle
    big_sign(size, k, cx, y + h / 2, cz, yaw)
    for yy in (y + 0.4, y + h - 0.4):
        f.box((PL, "metal", 1), s - 0.06, s + 0.06, yy, yy + 0.12, 0.0, out)
    return h


def fascia_signs_x(x0, x1, zf, facing, r, rate=0.75, y=3.95):
    """A board on the fascia over each shop of a row along x."""
    f = 1 if facing > 0 else -1
    x = x0 + 1.2
    while x < x1 - 2.0:
        size = r.choice(("ps", "pm", "ps"))
        w, h = ST_SIZES[size]
        if r.random() < rate and x + w < x1 - 0.6:
            box((PL, "board_frame", 0), x - 0.06, x + w + 0.06, y - h / 2 - 0.06, y + h / 2 + 0.06, *sorted((zf + f * 0.14, zf + f * 0.2)), scale=1.0)
            sign(st_name(size), x + w / 2, y, zf + f * 0.215, w, h, 0.0 if f > 0 else math.pi, district=PL, label=False)
        x += w + r.uniform(2.2, 4.6)


def fascia_signs_z(z0, z1, xf, facing, r, rate=0.75, y=3.95):
    """The same along z, on a wall facing `facing` x."""
    f = 1 if facing > 0 else -1
    z = z0 + 1.2
    while z < z1 - 2.0:
        size = r.choice(("ps", "pm", "ps"))
        w, h = ST_SIZES[size]
        if r.random() < rate and z + w < z1 - 0.6:
            box((PL, "board_frame", 0), *sorted((xf + f * 0.14, xf + f * 0.2)), y - h / 2 - 0.06, y + h / 2 + 0.06, z - 0.06, z + w + 0.06, scale=1.0)
            sign(st_name(size), xf + f * 0.215, y, z + w / 2, w, h, f * math.pi / 2, district=PL, label=False)
        z += w + r.uniform(2.2, 4.6)


# ---------------------------------------------------------------------------
# Rails, planters, stairs.
# ---------------------------------------------------------------------------
def rail(pts, y, colour="cyan", h=1.05, close=False):
    """A rail along a line of (x, z) points at floor level y: slim posts, a
    handrail, and under it the line of light the show's glass balustrades
    carry along their edge (KvMY1uzSC1E@43)."""
    segs = list(zip(pts, pts[1:] + (pts[:1] if close else [])))
    if not close:
        segs = segs[:len(pts) - 1]
    for (ax, az), (bx_, bz_) in segs:
        length = math.hypot(bx_ - ax, bz_ - az)
        if length < 0.3:
            continue
        yaw = math.atan2(-(bz_ - az), bx_ - ax)
        mx, mz = (ax + bx_) / 2, (az + bz_) / 2
        oriented_box((PL, "metal", 0), mx, y + h, mz, length, 0.07, 0.09, yaw, scale=0.5)
        oriented_box((PL, "metal", 1), mx, y + h * 0.5, mz, length, 0.04, 0.04, yaw, scale=0.5)
        n = max(1, int(round(length / 2.4)))
        for i in range(n + 1):
            px_, pz_ = ax + (bx_ - ax) * i / n, az + (bz_ - az) * i / n
            box((PL, "metal", 1), px_ - 0.04, px_ + 0.04, y, y + h, pz_ - 0.04, pz_ + 0.04, scale=0.5)
        m = max(1, int(math.ceil(length / 3.2)))
        for i in range(m):
            sx, sz = ax + (bx_ - ax) * (i + 0.5) / m, az + (bz_ - az) * (i + 0.5) / m
            oriented_box((PL, "neon_" + colour, 0), sx, y + 0.07, sz, length / m, 0.05, 0.06, yaw, scale=1.0)


HEDGE = ((0.1, 0.28, 0.15, 1), (0.08, 0.24, 0.13, 1), (0.13, 0.32, 0.16, 1))


def planter(x0, x1, z0, z1, y=0.15, h=0.5, hedge=0.75, edge="cyan", r=None, side=None):
    """A stone planter bed with a clipped hedge in it and a line of light
    along the foot of one long side (or `side`: "+x", "-x", "+z", "-z")."""
    box((PL, "concrete", 0), x0, x1, y, y + h, z0, z1, scale=1.5)
    if hedge:
        col = HEDGE[r.randrange(3)] if r else HEDGE[0]
        box((PL, "trim", 0), x0 + 0.22, x1 - 0.22, y + h, y + h + hedge, z0 + 0.22, z1 - 0.22, scale=1.0, col=col)
    if edge:
        if side is None:
            side = "+z" if x1 - x0 >= z1 - z0 else "+x"
        if side == "+z":
            nbox(edge, x0 + 0.1, x1 - 0.1, y + 0.03, y + 0.08, z1, z1 + 0.03)
        elif side == "-z":
            nbox(edge, x0 + 0.1, x1 - 0.1, y + 0.03, y + 0.08, z0 - 0.03, z0)
        elif side == "+x":
            nbox(edge, x1, x1 + 0.03, y + 0.03, y + 0.08, z0 + 0.1, z1 - 0.1)
        else:
            nbox(edge, x0 - 0.03, x0, y + 0.03, y + 0.08, z0 + 0.1, z1 - 0.1)


def stair_x(x0, x1, z0, z1, y0, y1, colour="cyan", r=None):
    """Wide stairs climbing toward +x from (x0, y0) to (x1, y1), z0..z1 wide
    (KvMY1uzSC1E@29): stone steps, short bars of light set in some risers,
    solid flanks, a rail down each side and the middle."""
    n = max(2, int(round((y1 - y0) / 0.16)))
    rise, run = (y1 - y0) / n, (x1 - x0) / n
    k = (PL, "concrete", 0)
    for i in range(n):
        xa, xb, ya, yb = x0 + i * run, x0 + (i + 1) * run, y0 + i * rise, y0 + (i + 1) * rise
        quad(k, (xa, ya, z0), (xa, ya, z1), (xa, yb, z1), (xa, yb, z0),
             ((z0 / 1.5, ya / 1.5), (z1 / 1.5, ya / 1.5), (z1 / 1.5, yb / 1.5), (z0 / 1.5, yb / 1.5)))
        quad(k, (xa, yb, z1), (xb, yb, z1), (xb, yb, z0), (xa, yb, z0),
             ((xa / 1.5, -z1 / 1.5), (xb / 1.5, -z1 / 1.5), (xb / 1.5, -z0 / 1.5), (xa / 1.5, -z0 / 1.5)))
        # Light in the risers: short bars, staggered up the flight.
        if i % 3 == 1:
            z = z0 + 1.0 + (1.7 if (i // 3) % 2 else 0.0)
            while z + 1.1 < z1 - 0.6:
                box((PL, "neon_" + colour, 0), xa - 0.02, xa, ya + rise * 0.3, ya + rise * 0.7, z, z + 1.1, scale=1.0)
                z += 3.4
    # The flanks: a wall under the flight's line on each side.
    for z, wind in ((z0, -1), (z1, 1)):
        a, b, c = (x0, y0, z), (x1, y0, z), (x1, y1, z)
        pts = [a, b, c] if wind > 0 else [a, c, b]
        poly(k, pts, [(p[0] / 1.5, p[1] / 1.5) for p in pts])
    # Rails: sloped bars on posts.
    for z in (z0 + 0.08, (z0 + z1) / 2, z1 - 0.08):
        for off in (0.95, 0.5):
            pipe((PL, "metal", 1), (x0 + 0.1, y0 + off, z), (x1, y1 + off, z), 0.03, segs=4)
        for i in range(0, n + 1, 5):
            px_ = x0 + i * run + 0.1
            py = y0 + i * rise
            box((PL, "metal", 1), px_ - 0.03, px_ + 0.03, py, py + 0.95, z - 0.03, z + 0.03, scale=0.5)


# ---------------------------------------------------------------------------
# Towers.
# ---------------------------------------------------------------------------
def glass_shaft(x0, x1, z0, z1, y0, y1, seed, cut=2.0, lit=None, warm=None, roof=True):
    """A glass curtain wall on a plan with its corners cut back: the site's
    corporate shader draws its floors, mullions and lit rooms from world
    position; the colour is its lit fraction, its warmth and a seed."""
    r = random.Random(seed)
    col = (r.uniform(0.5, 0.8) if lit is None else lit, r.random() if warm is None else warm, r.random(), 1.0)
    cx, cz, hx, hz = (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2
    outline = cut_rect(cx, cz, hx, hz, cut)
    walls((PL, "corporate", 0), outline, y0, y1, col)
    if roof:
        poly((PL, "roof", 0), [(x, y1, z) for x, z in outline], [(x / 4, z / 4) for x, z in outline])
    B.COLLISION.append(("box", x0, x1, y0, y1, z0, z1, PL))
    return outline


def fins(x0, x1, z0, z1, y0, y1, colour, cut=2.0, k=0.55):
    """A line of light up the inside of each cut corner."""
    col = dim(colour, k)
    for sx, sz in ((x0, z0), (x0, z1), (x1, z0), (x1, z1)):
        fx = sx + (cut * 0.5 if sx == x0 else -cut * 0.5)
        fz = sz + (cut * 0.5 if sz == z0 else -cut * 0.5)
        box((PL, "glow", 0), fx - 0.14, fx + 0.14, y0, y1, fz - 0.14, fz + 0.14, scale=1.0, col=col)


def lit_band(x0, x1, z0, z1, y0, y1, colour, k=0.7, out=0.12, cut=0.0):
    """A band of light round a mass."""
    cx, cz, hx, hz = (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2 + out, (z1 - z0) / 2 + out
    walls((PL, "glow", 0), cut_rect(cx, cz, hx, hz, cut), y0, y1, dim(colour, k))


def crown_blades(x0, x1, z0, z1, top, colour, h=6.0, k=0.35, gap=2.2):
    """A screen of lit blades round a roof, as corpo row's crowns have."""
    col = dim(colour, k)
    key = (PL, "glow", 0)
    x = x0
    while x <= x1 + 1e-3:
        for z in (z0, z1 - 0.5):
            box(key, x - 0.1, x + 0.1, top, top + h, z, z + 0.5, scale=1.0, col=col)
        x += (x1 - x0) / max(1, round((x1 - x0) / gap))
    z = z0 + (z1 - z0) / max(1, round((z1 - z0) / gap))
    while z < z1 - 1e-3:
        for x in (x0, x1 - 0.5):
            box(key, x, x + 0.5, top, top + h, z - 0.1, z + 0.1, scale=1.0, col=col)
        z += (z1 - z0) / max(1, round((z1 - z0) / gap))


def halo(cx, cz, y, r, colour, k=0.9, n=20):
    """A ring of light held over a roof on struts: from the air, a tower's
    signature."""
    ring((PL, "glow", 0), cx, cz, r - 0.35, r, y, n=n, col=dim(colour, k))
    walls((PL, "glow", 0), ngon(cx, cz, r, n), y - 0.3, y, dim(colour, k))
    for i in range(4):
        a = i * math.tau / 4 + 0.4
        pipe((PL, "metal", 1), (cx + (r - 0.2) * math.cos(a), y - 0.3, cz + (r - 0.2) * math.sin(a)),
             (cx + (r - 2.0) * math.cos(a), y - 3.0, cz + (r - 2.0) * math.sin(a)), 0.08, segs=4)


def mast(cx, cz, y0, h, lamp="red"):
    cylinder((PL, "metal", 0), cx, cz, y0, y0 + h * 0.5, 0.4, segs=6)
    cylinder((PL, "metal", 0), cx, cz, y0 + h * 0.5, y0 + h, 0.16, segs=5)
    box((PL, "glow", 0), cx - 0.22, cx + 0.22, y0 + h, y0 + h + 0.45, cz - 0.22, cz + 0.22, scale=0.5, col=GLOW[lamp])
    for f in (0.35, 0.68):
        box((PL, "glow", 1), cx - 0.5, cx + 0.5, y0 + h * f, y0 + h * f + 0.18, cz - 0.1, cz + 0.1, scale=0.5, col=GLOW[lamp])


def corner_lamps(x0, x1, z0, z1, y, colour="red"):
    for x in (x0 + 0.3, x1 - 0.3):
        for z in (z0 + 0.3, z1 - 0.3):
            box((PL, "glow", 1), x - 0.18, x + 0.18, y, y + 0.4, z - 0.18, z + 0.18, scale=0.5, col=GLOW[colour])


# ---------------------------------------------------------------------------
# Roofs: what a corpo block's roof is, seen from a flying car.
# ---------------------------------------------------------------------------
def parapet(x0, x1, z0, z1, y, tint=1, h=1.0, t=0.3, line=None):
    for (a0, a1, b0, b1) in ((x0, x1, z1 - t, z1), (x0, x1, z0, z0 + t), (x0, x0 + t, z0 + t, z1 - t), (x1 - t, x1, z0 + t, z1 - t)):
        box((PL, "trim", 0), a0, a1, y, y + h, b0, b1, scale=1.5, col=B.TRIM[tint])
    if line:
        walls((PL, "glow", 0), [(x0 - 0.04, z1 + 0.04), (x1 + 0.04, z1 + 0.04), (x1 + 0.04, z0 - 0.04), (x0 - 0.04, z0 - 0.04)],
              y + h - 0.12, y + h - 0.02, dim(line, 0.8))
    B.ROOFS.append((PL, x0, x1, z0, z1, y))


def pool(x0, x1, z0, z1, y, colour="teal"):
    """A roof pool lit from under the water, in its pale coping."""
    box((PL, "trim", 0), x0 - 0.5, x1 + 0.5, y, y + 0.35, z0 - 0.5, z1 + 0.5, scale=1.0, col=B.TRIM[7])
    n = max(1, int((x1 - x0) // 4))
    for i in range(n):
        for j, z in enumerate((z0, (z0 + z1) / 2)):
            xa, xb = x0 + (x1 - x0) * i / n, x0 + (x1 - x0) * (i + 1) / n
            k = 0.3 + 0.1 * ((i + j) % 2)
            up_poly((PL, "glow", 0), [(xa, z), (xb, z), (xb, z + (z1 - z0) / 2), (xa, z + (z1 - z0) / 2)], y + 0.37, dim(colour, k))


def skylight(x0, x1, z0, z1, y, colour="white", k=0.3, pitch=1.2):
    """A ridged glass roof over a hall, lit from inside: two slopes of panes,
    each a little brighter or dimmer than the next."""
    zm = (z0 + z1) / 2
    n = max(2, int((x1 - x0) // 2.4))
    box((PL, "metal", 0), x0 - 0.2, x1 + 0.2, y, y + 0.3, z0 - 0.2, z1 + 0.2, scale=1.0)
    for i in range(n):
        xa, xb = x0 + (x1 - x0) * i / n + 0.06, x0 + (x1 - x0) * (i + 1) / n - 0.06
        for (za, zb, ya, yb) in ((z0, zm, y + 0.3, y + 0.3 + pitch), (zm, z1, y + 0.3 + pitch, y + 0.3)):
            kk = k * (0.7 + 0.6 * ((i * 7 + int(za)) % 5) / 4.0)
            a, b, c, d = (xa, ya, za), (xb, ya, za), (xb, yb, zb), (xa, yb, zb)
            up_tri((PL, "glow", 0), a, b, c, dim(colour, kk))
            up_tri((PL, "glow", 0), a, c, d, dim(colour, kk))
    # The gable ends, glazed too.
    for x, wind in ((x0, 1), (x1, -1)):
        pts = [(x, y + 0.3, z0), (x, y + 0.3, z1), (x, y + 0.3 + pitch, zm)]
        poly((PL, "glow", 0), pts if wind > 0 else list(reversed(pts)), [(0, 0), (1, 0), (0.5, 1)], dim(colour, k * 0.8))


def av_pad(cx, cz, y, r=6.5, colour="amber"):
    """A landing pad on a roof: a raised deck, its ring and cross in light
    (paint on a roof is black from the air), lamps round its rim (red and
    the pad's colour, turn about)."""
    cylinder((PL, "concrete", 0), cx, cz, y, y + 0.5, r, segs=16)
    ring((PL, "glow", 0), cx, cz, r * 0.74, r * 0.82, y + 0.52, n=16, col=dim(colour, 0.45))
    for a in (0.0, math.pi / 2):
        dx, dz = math.cos(a) * r * 0.5, math.sin(a) * r * 0.5
        px, pz = -math.sin(a) * 0.25, math.cos(a) * 0.25
        up_poly((PL, "glow", 0), [(cx - dx - px, cz - dz - pz), (cx + dx - px, cz + dz - pz), (cx + dx + px, cz + dz + pz), (cx - dx + px, cz - dz + pz)], y + 0.52,
                dim("white", 0.5))
    for i in range(12):
        a = i * math.tau / 12
        lx, lz = cx + (r - 0.3) * math.cos(a), cz + (r - 0.3) * math.sin(a)
        box((PL, "glow", 0), lx - 0.13, lx + 0.13, y + 0.5, y + 0.66, lz - 0.13, lz + 0.13, scale=0.5, col=GLOW["red" if i % 2 else colour])
    B.ROOFS.append((PL, cx - r, cx + r, cz - r, cz + r, y + 0.5))


def roof_plant(x0, x1, z0, z1, y, r, n=3):
    """Plant on a tower's roof: housings, a duct between them, a lamp."""
    if x1 - x0 < 2.6 or z1 - z0 < 2.6:
        return
    for i in range(n):
        w, d, h = min(r.uniform(2.4, 4.6), x1 - x0 - 1.2), min(r.uniform(2.0, 3.6), z1 - z0 - 1.2), r.uniform(1.6, 3.0)
        px, pz = r.uniform(x0 + w / 2 + 0.5, x1 - w / 2 - 0.5), r.uniform(z0 + d / 2 + 0.5, z1 - d / 2 - 0.5)
        box((PL, "metal", 0), px - w / 2, px + w / 2, y, y + h, pz - d / 2, pz + d / 2, scale=1.0)
        box((PL, "dark", 1), px - w / 2 - 0.1, px + w / 2 + 0.1, y + h, y + h + 0.12, pz - d / 2 - 0.1, pz + d / 2 + 0.1, scale=1.0)
        if i == 0:
            box((PL, "glow", 1), px - 0.1, px + 0.1, y + h + 0.12, y + h + 0.3, pz - 0.1, pz + 0.1, scale=0.5, col=GLOW["white"])


def lawn(x0, x1, z0, z1, y):
    """Planting lit from its edge, in two tones: from the air, a roof that
    is green and not a hole."""
    xm = (x0 + x1) / 2
    for (a, b, g) in ((x0, xm, (0.012, 0.05, 0.022, 1.0)), (xm, x1, (0.016, 0.062, 0.03, 1.0))):
        up_poly((PL, "glow", 0), [(a, z0), (b, z0), (b, z1), (a, z1)], y + 0.03, g)


def garden(x0, x1, z0, z1, y, r, palms=0, trees=2, colour="cyan", lamps=2):
    """A roof terrace: paths of light, hedges along its edges, a few trees
    and benches. On a roof the street's baked light does not reach, so what
    shows is what is lit: the path lines, the trees' own uplights."""
    w, d = x1 - x0, z1 - z0
    # Hedges along the two long edges.
    if w >= d:
        for z in (z0 + 0.6, z1 - 1.7):
            x = x0 + 1.0
            while x + 3.0 < x1 - 1.0:
                ln = min(r.uniform(3.0, 6.0), x1 - 1.0 - x)
                box((PL, "trim", 1), x, x + ln, y, y + 0.9, z, z + 1.1, scale=1.0, col=HEDGE[r.randrange(3)])
                x += ln + r.uniform(1.2, 2.4)
        for z in (z0 + 2.4, z1 - 2.4):
            box((PL, "glow", 0), x0 + 1.2, x1 - 1.2, y + 0.02, y + 0.07, z - 0.1, z + 0.1, scale=1.0, col=dim(colour, 0.6))
        if d > 7.5:
            lawn(x0 + 2.0, x1 - 2.0, z0 + 3.0, z1 - 3.0, y)
    else:
        for x in (x0 + 0.6, x1 - 1.7):
            z = z0 + 1.0
            while z + 3.0 < z1 - 1.0:
                ln = min(r.uniform(3.0, 6.0), z1 - 1.0 - z)
                box((PL, "trim", 1), x, x + 1.1, y, y + 0.9, z, z + ln, scale=1.0, col=HEDGE[r.randrange(3)])
                z += ln + r.uniform(1.2, 2.4)
        for x in (x0 + 2.4, x1 - 2.4):
            box((PL, "glow", 0), x - 0.1, x + 0.1, y + 0.02, y + 0.07, z0 + 1.2, z1 - 1.2, scale=1.0, col=dim(colour, 0.6))
        if w > 7.5:
            lawn(x0 + 3.0, x1 - 3.0, z0 + 2.0, z1 - 2.0, y)
    for i in range(palms + trees):
        px, pz = r.uniform(x0 + 3.2, x1 - 3.2), r.uniform(z0 + 3.2, z1 - 3.2)
        P.place("planter_palm" if i < palms else "planter_tree", px, y, pz, r.uniform(0, 6.28), district=PL)
        if r.random() < 0.6:
            P.place("bench", px + 1.6, y, pz + 0.4, r.uniform(0, 6.28), district=PL)
    for _ in range(lamps):
        P.place("lamp_short", r.uniform(x0 + 2.0, x1 - 2.0), y, r.uniform(z0 + 2.0, z1 - 2.0), district=PL)


# ---------------------------------------------------------------------------
# Props of the plaza's own.
# ---------------------------------------------------------------------------
@P.proto("lamp_plaza", box=(0.12, 3.0, 0.12))
def _lamp_plaza(k):
    """A plaza lamp: a slim mast bending over at its head (toward +z), a
    cool white light under it (KvMY1uzSC1E@29)."""
    cylinder(k("metal"), 0.0, 0.0, 0.0, 5.4, 0.07, segs=6)
    cylinder(k("metal"), 0.0, 0.0, 0.0, 0.4, 0.13, segs=6)
    pipe(k("metal"), (0.0, 5.4, 0.0), (0.0, 6.1, 0.45), 0.055, segs=5)
    pipe(k("metal"), (0.0, 6.1, 0.45), (0.0, 6.35, 1.3), 0.05, segs=5)
    box(k("metal"), -0.16, 0.16, 6.3, 6.4, 1.2, 2.2, scale=0.5)
    box(k("neon_white"), -0.13, 0.13, 6.26, 6.3, 1.3, 2.15, scale=0.5)


@P.proto("kiosk", box=(1.4, 1.3, 1.1))
def _kiosk(k):
    """A low kiosk, its counter lit and a band of cyan round its roof
    (Fn9gKhU_2_Q@77); its counter toward +z."""
    box(k("trim"), -1.4, 1.4, 0.0, 2.5, -1.1, 1.1, scale=1.0, col=(0.05, 0.09, 0.1, 1))
    box(k("metal"), -1.55, 1.55, 2.5, 2.62, -1.25, 1.6, scale=1.0)
    box(k("glow"), -1.15, 1.15, 1.0, 2.1, 1.1, 1.12, scale=0.5, col=(1.0, 0.72, 0.42, 1))
    box(k("metal"), -1.25, 1.25, 0.92, 1.0, 1.1, 1.45, scale=0.5)
    box(k("neon_cyan"), -1.55, 1.55, 2.36, 2.46, 1.6, 1.63, scale=0.5)
    box(k("neon_cyan"), -1.58, -1.55, 2.36, 2.46, -1.25, 1.6, scale=0.5)
    box(k("neon_cyan"), 1.55, 1.58, 2.36, 2.46, -1.25, 1.6, scale=0.5)


@P.proto("pylon_hex", box=(0.15, 3.0, 0.15))
def _pylon_hex(k):
    """A security pylon: a pole with a hexagon of light on it (the police
    hologram's shape, YRL74JmhVgk@30), read from both sides; it faces +z."""
    cylinder(k("metal"), 0.0, 0.0, 0.0, 6.8, 0.09, segs=6)
    for face, zz in ((1, 0.12), (-1, -0.12)):
        pts = [(1.25 * math.cos(i * math.tau / 6 + math.pi / 6), 5.2 + 1.25 * math.sin(i * math.tau / 6 + math.pi / 6)) for i in range(6)]
        for (au, av), (bu, bv) in zip(pts, pts[1:] + pts[:1]):
            length = math.hypot(bu - au, bv - av)
            du, dv = (bu - au) / length, (bv - av) / length
            hu, hv = -dv * 0.06, du * 0.06
            q = [(au - hu, av - hv, zz), (bu - hu, bv - hv, zz), (bu + hu, bv + hv, zz), (au + hu, av + hv, zz)]
            quad(k("glow"), *(q if face > 0 else reversed(q)), col=GLOW["cyan"])
        for (u0, u1, v0, v1) in ((-0.6, 0.6, 5.5, 5.62), (-0.6, 0.6, 5.1, 5.22), (-0.35, 0.35, 4.7, 4.82)):
            q = [(u0, v0, zz), (u1, v0, zz), (u1, v1, zz), (u0, v1, zz)]
            quad(k("glow"), *(q if face > 0 else reversed(q)), col=GLOW["white"])


def corner_sign(x, z, y0, size, k, yaw, out=0.9):
    """A big sign off a block's corner, turned 45 degrees to both streets
    (`yaw` is the way it faces), on two brackets."""
    w, h = ST_SIZES[size][0] * k, ST_SIZES[size][1] * k
    nx, nz = math.sin(yaw), math.cos(yaw)
    cx, cz = x + nx * out, z + nz * out
    big_sign(size, k, cx, y0 + h / 2, cz, yaw, double=False)
    for yy in (y0 + h * 0.2, y0 + h * 0.8):
        oriented_box((PL, "metal", 1), x + nx * out * 0.45, yy, z + nz * out * 0.45, 0.12, 0.12, out * 0.9, yaw, scale=0.5)
    return h


def roof_terrace(x0, x1, z0, z1, y, r, colour="cyan", water=True, palms=2):
    """A tower's roof as a place: a pool down one side, a garden beside it."""
    w, d = x1 - x0, z1 - z0
    if water:
        if w >= d:
            pool(x0 + 2.0, x0 + w * 0.5, z0 + 2.2, z0 + min(7.0, d * 0.4), y, colour="cyan")
            garden(x0 + w * 0.52, x1 - 1.0, z0 + 1.0, z1 - 1.0, y, r, palms=palms, trees=1, colour=colour, lamps=1)
        else:
            pool(x0 + 2.2, x0 + min(7.0, w * 0.4), z0 + 2.0, z0 + d * 0.5, y, colour="cyan")
            garden(x0 + 1.0, x1 - 1.0, z0 + d * 0.52, z1 - 1.0, y, r, palms=palms, trees=1, colour=colour, lamps=1)
    else:
        garden(x0 + 1.0, x1 - 1.0, z0 + 1.0, z1 - 1.0, y, r, palms=palms, trees=2, colour=colour, lamps=2)
