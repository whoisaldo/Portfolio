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
import ncw.kit as K
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
# What the hero's wet road mirrors of the plaza, past the avenue's east row
# (through its ground floors, the deck's mouth and the south street): the
# lane side south of the plaza street and the south street's east corner.
# Lamps, lit floors and roof plant there stay as the hero has them.
MIRROR_ZONES = ((44.0, 64.0, -170.0, 20.0), (130.0, 172.0, -60.0, 20.0))


def in_mirror(x0, x1, z0, z1):
    return any(x0 < b and x1 > a and z0 < d and z1 > c for a, b, c, d in MIRROR_ZONES)


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


# Pools of light. The site lifts whatever the bake finds away from the
# avenue toward one brightness (spill.js), which is why a square full of
# signs is evenly grey. So a pool here (shine) is two things: the lamp in the bake
# (kit.light: its pool is added after that lift), and the same pool on the
# square's own stone, whose slabs are laid last (plaza_paving.py) with each
# corner as bright as what stands near it, and dark where nothing does.
POOLS = []
TINT = {"amber": (1.0, 0.6, 0.24), "orange": (1.0, 0.42, 0.1), "white": (0.86, 0.9, 1.0), "cyan": (0.3, 0.8, 1.0), "teal": (0.3, 0.9, 0.75),
        "magenta": (1.0, 0.3, 0.8), "pink": (1.0, 0.3, 0.5), "yellow": (1.0, 0.86, 0.2), "red": (1.0, 0.16, 0.12), "blue": (0.35, 0.5, 1.0),
        "green": (0.3, 1.0, 0.55), "purple": (0.62, 0.35, 1.0)}


def wash(x, z, reach, hue, k):
    """A screen's or a hologram's colour on the stone within `reach` of
    (x, z): on the slabs only, nothing in the bake."""
    POOLS.append((x, z, reach, TINT[hue], k))


def shine(x, y, z, hue, power, reach=None):
    """A lamp's, a window's or a small screen's light on the ground."""
    light(PL, x, y, z, hue, power)
    POOLS.append((x, z, reach or 2.6 + 0.5 * power, TINT[hue], min(1.0, 0.25 + power / 9.0)))


def lit_at(x, z, pools=None, base=(0.2, 0.225, 0.29)):
    """How bright the stone is at (x, z), as a colour to multiply its tone
    by: the night's own blue where no pool reaches."""
    r, g, b = base
    for px, pz, reach, c, k in (POOLS if pools is None else pools):
        d2 = ((x - px) ** 2 + (z - pz) ** 2) / (reach * reach)
        if d2 < 5.0:
            w = k / ((1.0 + 2.2 * d2) ** 2)
            r, g, b = r + c[0] * w, g + c[1] * w, b + c[2] * w
    m = max(r, g, b, 1.0)
    return (r / m, g / m, b / m)


def lit_slab(key, x0, x1, z0, z1, y, tone, cut=None, cell=2.0):
    """A slab of stone lying flat, cut into cells so the light on it runs
    smoothly over it (the joints are between slabs, not cells). `cut`:
    (cx, cz, r), a round hole it is laid round."""
    nx, nz = max(1, int(math.ceil((x1 - x0) / cell))), max(1, int(math.ceil((z1 - z0) / cell)))
    for i in range(nx):
        for j in range(nz):
            xa, xb = x0 + (x1 - x0) * i / nx, x0 + (x1 - x0) * (i + 1) / nx
            za, zb = z0 + (z1 - z0) * j / nz, z0 + (z1 - z0) * (j + 1) / nz
            pieces = rect_minus_disc(xa, xb, za, zb, *cut) if cut else [[(xa, za), (xb, za), (xb, zb), (xa, zb)]]
            for pts in pieces:
                lit_poly(key, pts, y, tone)


def lit_poly(key, pts2, y, tone, pools=None, dark=(0.2, 0.225, 0.29)):
    """A flat polygon facing up, each corner's colour the stone's tone under
    the light that reaches it."""
    area = sum(a[0] * c[1] - c[0] * a[1] for a, c in zip(pts2, pts2[1:] + pts2[:1]))
    if area > 0:
        pts2 = list(reversed(pts2))
    b = K.batches[key]
    base = len(b.verts)
    b.verts.extend(K.P(x, y, z) for x, z in pts2)
    b.faces.append(tuple(range(base, base + len(pts2))))
    b.uvs.extend((x / 2.0, -z / 2.0) for x, z in pts2)
    for x, z in pts2:
        l = lit_at(x, z, pools, dark)
        b.cols.append((tone[0] * l[0], tone[1] * l[1], tone[2] * l[2], 1.0))


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


def down_poly(key, pts2, y, col=(1, 1, 1, 1), scale=2.0):
    """The same facing down: a soffit."""
    area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts2, pts2[1:] + pts2[:1]))
    if area < 0:
        pts2 = list(reversed(pts2))
    pts = [(x, y, z) for x, z in pts2]
    poly(key, pts, [(p[0] / scale, -p[2] / scale) for p in pts], col)


def vwall(key, a, b, y0, y1, col=(1, 1, 1, 1), scale=1.5, fit=False):
    """A wall from a to b (x, z), facing the left of the way it is walked
    (a to b reads left to right from in front of it). `fit` stretches one
    picture over it (a screen); otherwise it is tiled by the metre."""
    length = math.hypot(b[0] - a[0], b[1] - a[1])
    uvs = ((0, 0), (1, 0), (1, 1), (0, 1)) if fit else ((0, y0 / scale), (length / scale, y0 / scale), (length / scale, y1 / scale), (0, y1 / scale))
    quad(key, (a[0], y0, a[1]), (b[0], y0, b[1]), (b[0], y1, b[1]), (a[0], y1, a[1]), uvs, col)


# ---------------------------------------------------------------------------
# Cutting plans: a convex polygon of (x, z) points kept on one side of a
# line, so paving can be laid round a circle and glazing inside one.
# A plane is (nx, nz, d): the side kept is nx x + nz z <= d.
# ---------------------------------------------------------------------------
def clip_plane(pts, nx, nz, d):
    out = []
    for a, b in zip(pts, pts[1:] + pts[:1]):
        da, db = nx * a[0] + nz * a[1] - d, nx * b[0] + nz * b[1] - d
        if da <= 0:
            out.append(a)
        if (da < 0 < db) or (db < 0 < da):
            t = da / (da - db)
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def clip_planes(pts, planes):
    pts = list(pts)
    for nx, nz, d in planes:
        pts = clip_plane(pts, nx, nz, d)
        if len(pts) < 3:
            return []
    return pts


def seg_clip(a, b, planes):
    """The part of the line a to b inside every plane, or None."""
    t0, t1 = 0.0, 1.0
    for nx, nz, d in planes:
        da, db = nx * a[0] + nz * a[1] - d, nx * b[0] + nz * b[1] - d
        if da > 0 and db > 0:
            return None
        if da > 0:
            t0 = max(t0, da / (da - db))
        elif db > 0:
            t1 = min(t1, da / (da - db))
    if t1 - t0 < 1e-4:
        return None
    return ((a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1))


def disc_planes(cx, cz, r, n=48):
    """The inside of the n-gon whose corners stand on the circle (at the
    angles ngon() and ring() use, so pieces meet)."""
    k = r * math.cos(math.pi / n)
    return [(math.cos(a), math.sin(a), k + math.cos(a) * cx + math.sin(a) * cz) for a in ((i + 0.5) * math.tau / n for i in range(n))]


def rect_minus_disc(x0, x1, z0, z1, cx, cz, r, n=48):
    """A rectangle with a round hole cut in it, as the convex pieces left:
    the whole of it when it stands clear, nothing when it is inside."""
    rect = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
    k = r * math.cos(math.pi / n)
    if math.hypot(min(max(cx, x0), x1) - cx, min(max(cz, z0), z1) - cz) >= r:
        return [rect]
    if max(math.hypot(x - cx, z - cz) for x, z in rect) <= k:
        return []
    out = []
    for i in range(n):
        a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
        am = (a0 + a1) / 2
        piece = clip_planes(rect, [(-math.cos(am), -math.sin(am), -k - math.cos(am) * cx - math.sin(am) * cz),
                                   (math.sin(a0), -math.cos(a0), math.sin(a0) * cx - math.cos(a0) * cz),
                                   (-math.sin(a1), math.cos(a1), -math.sin(a1) * cx + math.cos(a1) * cz)])
        if len(piece) >= 3:
            out.append(piece)
    return out


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


# Standard signs' ids. The site deals a design to each id once, by where its
# first face hangs (src/world/signs.js: the next design whose name hangs
# nowhere within 40 m), so every sign needs an id of its own. The kit hands
# ids out in the builder's turn (kit.st_name), one counter a size for the
# whole city: a sign more or fewer here would give every district built
# after the plaza other designs. So the plaza's own signs take ids from a
# range of their own (house_name), each kit building of the plaza's starts
# from the turn it had when the city's signs were dealt (kit_turns: offsets
# from the counters as the plaza found them, so the hotel's signs on the
# south street, which the hero's wet road mirrors, are the ones it had), and
# the plaza leaves the counters where it always left them (kit_turns_end).
SIZES = ("bx", "bs", "ps", "pm", "bl", "bm")
ST0 = {size: K.ST_COUNT.get(size, 0) for size in SIZES}
KIT_TURNS = {8311: (0, 0, 0, 0, 0, 0), 8312: (0, 0, 2, 3, 1, 1), 8313: (7, 1, 11, 7, 5, 3), 8321: (10, 4, 22, 13, 12, 5), 8331: (22, 7, 52, 26, 13, 11),
             8333: (28, 9, 77, 31, 13, 14), 8335: (28, 9, 78, 31, 13, 14), 8338: (28, 9, 79, 31, 13, 14), 8351: (32, 10, 90, 42, 16, 16),
             8353: (34, 11, 92, 42, 18, 17), 8361: (34, 11, 97, 44, 18, 17), 8371: (34, 11, 102, 44, 18, 17)}
KIT_END = (34, 11, 119, 45, 18, 17)
OWN = {}
# The plaza's own signs west of x 60, by where they hang: (size, x, z) and
# the id each has always had. A sign there is a streak of its colour down
# the hero's road (the bake runs every light within 60 m of the avenue down
# it, whatever stands between), so those five keep their designs.
PINNED = (("ps", 50.7, -264.0, 6), ("ps", 56.7, -264.0, ST0["ps"] + 106), ("pm", 44.5, -248.0, 2), ("ps", 44.5, -253.5, 6), ("ps", 59.5, -284.2, 0))


def house_name(size, x=None, z=None, n=None):
    """An id for a sign of the plaza's own placing: its own, from the
    plaza's range. `n`: this turn and no other (the two columns of type on
    the board's housing keep the ids, and so the words, the Work shot has
    always shown them with)."""
    if n is None and x is not None:
        n = next((t for s_, px, pz, t in PINNED if s_ == size and abs(px - x) < 0.4 and abs(pz - z) < 0.5), None)
    if n is not None:
        return f"st_{size}_{n}"
    OWN[size] = OWN.get(size, 0) + 1
    return f"st_{size}_{700000 + OWN[size]}"


def kit_turns(seed):
    """Set the kit's sign counters to where they stood when the plaza's kit
    building `seed` was built."""
    for size, o in zip(SIZES, KIT_TURNS.get(seed, KIT_END)):
        K.ST_COUNT[size] = ST0[size] + o


def kit_turns_end():
    kit_turns(None)


def big_sign(size, k, cx, cy, cz, yaw, double=True, frame=True, n=None):
    """One of the street's standard signs drawn k times its size (the site
    paints the same face larger): a tower's column of type, a podium's
    board. Both faces painted when it stands out from a wall."""
    w, h = ST_SIZES[size][0] * k, ST_SIZES[size][1] * k
    nx, nz = math.sin(yaw), math.cos(yaw)
    sid = house_name(size, cx, cz, n)
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


def fascia_signs_x(x0, x1, zf, facing, r, rate=0.75, y=3.95, house=0.6):
    """A board on the fascia over each shop of a row along x (`house`: the
    share of them that are corporate designs)."""
    f = 1 if facing > 0 else -1
    x = x0 + 1.2
    while x < x1 - 2.0:
        size = r.choice(("ps", "pm", "ps"))
        w, h = ST_SIZES[size]
        if r.random() < rate and x + w < x1 - 0.6:
            box((PL, "board_frame", 0), x - 0.06, x + w + 0.06, y - h / 2 - 0.06, y + h / 2 + 0.06, *sorted((zf + f * 0.14, zf + f * 0.2)), scale=1.0)
            r.random()   # (the draw that once chose between two lists of names: the boards stand where they stood)
            sign(house_name(size, x + w / 2, zf), x + w / 2, y, zf + f * 0.215, w, h, 0.0 if f > 0 else math.pi, district=PL, label=False)
        x += w + r.uniform(2.2, 4.6)


def fascia_signs_z(z0, z1, xf, facing, r, rate=0.75, y=3.95, house=0.6):
    """The same along z, on a wall facing `facing` x."""
    f = 1 if facing > 0 else -1
    z = z0 + 1.2
    while z < z1 - 2.0:
        size = r.choice(("ps", "pm", "ps"))
        w, h = ST_SIZES[size]
        if r.random() < rate and z + w < z1 - 0.6:
            box((PL, "board_frame", 0), *sorted((xf + f * 0.14, xf + f * 0.2)), y - h / 2 - 0.06, y + h / 2 + 0.06, z - 0.06, z + w + 0.06, scale=1.0)
            r.random()
            sign(house_name(size, xf, z + w / 2), xf + f * 0.215, y, z + w / 2, w, h, f * math.pi / 2, district=PL, label=False)
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


def balustrade(pts, y, colour="cyan", h=1.1, close=False, k=0.9):
    """A glass balustrade along a line of (x, z) points at floor level y
    (KvMY1uzSC1E@43): panes of clear glass 1.1 m high between slim steel
    posts, a shoe along the foot, and the glass's top edge lit (a thin strip
    of light: the glass itself does not glow)."""
    segs = list(zip(pts, pts[1:] + (pts[:1] if close else [])))
    if not close:
        segs = segs[:len(pts) - 1]
    for (ax, az), (bx_, bz_) in segs:
        length = math.hypot(bx_ - ax, bz_ - az)
        if length < 0.3:
            continue
        yaw = math.atan2(-(bz_ - az), bx_ - ax)
        mx, mz = (ax + bx_) / 2, (az + bz_) / 2
        v = 0.86 + 0.14 * ((int(ax * 7 + az * 13)) % 3) / 2.0
        rotated_quad((PL, "clearglass", 0), mx, y + 0.06 + (h - 0.08) / 2, mz, length - 0.04, h - 0.08, yaw, col=(v, v, v, 1.0))
        oriented_box((PL, "metal", 1), mx, y + 0.03, mz, length, 0.06, 0.07, yaw, scale=0.5)
        # (A steel handrail on the glass, the line of light let into its top.)
        oriented_box((PL, "metal", 0), mx, y + h - 0.04, mz, length, 0.06, 0.09, yaw, scale=0.5)
        oriented_box((PL, "glow", 0), mx, y + h, mz, length, 0.03, 0.04, yaw, scale=1.0, col=dim(colour, k))
        n = max(1, int(round(length / 2.1)))
        ends = [(ax + (bx_ - ax) * i / n, az + (bz_ - az) * i / n) for i in range(n)]
        if not close and (bx_, bz_) == tuple(pts[-1]):
            ends.append((bx_, bz_))
        for px_, pz_ in ends:
            # A post: a flat steel upright clamped to the glass, on a shoe
            # bolted to the kerb.
            oriented_box((PL, "metal", 0), px_, y + (h - 0.06) / 2, pz_, 0.1, h - 0.06, 0.07, yaw, scale=0.5)
            oriented_box((PL, "metal", 1), px_, y + 0.06, pz_, 0.2, 0.12, 0.16, yaw, scale=0.5)
            oriented_box((PL, "metal", 1), px_, y + h * 0.55, pz_, 0.14, 0.08, 0.1, yaw, scale=0.5)


HEDGE = ((0.1, 0.28, 0.15, 1), (0.08, 0.24, 0.13, 1), (0.13, 0.32, 0.16, 1))


def hedge_run(ax, az, bx_, bz_, y, h=0.75):
    """A clipped hedge from (ax, az) to (bx_, bz_): two-metre lengths of the
    plaza's own (hedge_soft: a rounded top, leaves in soft pads), end to end."""
    length = math.hypot(bx_ - ax, bz_ - az)
    n = max(1, int(round(length / 2.0)))
    yaw = math.atan2(-(bz_ - az), bx_ - ax)
    for i in range(n):
        t = (i + 0.5) / n
        P.place("hedge_soft", ax + (bx_ - ax) * t, y, az + (bz_ - az) * t, yaw, sy=h / 0.72, sxz=length / n / 2.0, district=PL)


def shrub_bed(x0, x1, z0, z1, r, y=0.15, h=0.4, edge="cyan", side=None):
    """A low stone bed of shrubs in clusters, a line of light along one foot."""
    planter(x0, x1, z0, z1, y=y, h=h, hedge=0, edge=edge, side=side)
    long_x = x1 - x0 >= z1 - z0
    a, a1 = (x0, x1) if long_x else (z0, z1)
    mid = (z0 + z1) / 2 if long_x else (x0 + x1) / 2
    a += 0.6
    while a < a1 - 0.5:
        j = r.uniform(-0.12, 0.12)
        P.place("shrub", a if long_x else mid + j, y + h - 0.06, mid + j if long_x else a, r.uniform(0, 6.28), sy=r.uniform(0.85, 1.25), sxz=r.uniform(0.8, 1.05), district=PL)
        a += r.uniform(0.95, 1.3)


def planter(x0, x1, z0, z1, y=0.15, h=0.5, hedge=0.75, edge="cyan", r=None, side=None):
    """A stone planter bed with a clipped hedge in it and a line of light
    along the foot of one long side (or `side`: "+x", "-x", "+z", "-z")."""
    box((PL, "concrete", 0), x0, x1, y, y + h, z0, z1, scale=1.5)
    if hedge:
        if x1 - x0 >= z1 - z0:
            hedge_run(x0 + 0.12, (z0 + z1) / 2, x1 - 0.12, (z0 + z1) / 2, y + h - 0.04, hedge)
        else:
            hedge_run((x0 + x1) / 2, z0 + 0.12, (x0 + x1) / 2, z1 - 0.12, y + h - 0.04, hedge)
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


def stair_x(x0, x1, z0, z1, y0, y1, r=None):
    """Wide stairs climbing toward +x from (x0, y0) to (x1, y1), z0..z1 wide
    (KvMY1uzSC1E@29): dark stone steps, a short strip of light let into a
    riser here and there (white, now and then amber), solid flanks, a rail
    down each side and the middle."""
    r = r or random.Random(8470)
    n = max(2, int(round((y1 - y0) / 0.16)))
    rise, run = (y1 - y0) / n, (x1 - x0) / n
    k = (PL, "concrete", 0)
    for i in range(n):
        xa, xb, ya, yb = x0 + i * run, x0 + (i + 1) * run, y0 + i * rise, y0 + (i + 1) * rise
        quad(k, (xa, ya, z0), (xa, ya, z1), (xa, yb, z1), (xa, yb, z0),
             ((z0 / 1.5, ya / 1.5), (z1 / 1.5, ya / 1.5), (z1 / 1.5, yb / 1.5), (z0 / 1.5, yb / 1.5)))
        # The tread: stone in two tones turn about, every seventh a pale one,
        # so from the air the flight reads as four flights and not as one
        # dark grating.
        tone = (0.33, 0.33, 0.35, 1.0) if i % 7 == 6 else (0.22, 0.22, 0.24, 1.0) if i % 2 else (0.18, 0.18, 0.2, 1.0)
        quad((PL, "trim", 0), (xa, yb, z1), (xb, yb, z1), (xb, yb, z0), (xa, yb, z0),
             ((xa / 1.5, -z1 / 1.5), (xb / 1.5, -z1 / 1.5), (xb / 1.5, -z0 / 1.5), (xa / 1.5, -z0 / 1.5)), tone)
        # Light in the risers: one short strip on one riser in four, never
        # two in line.
        if i % 4 == 1:
            z = z0 + r.uniform(0.8, 3.4)
            while z + 1.2 < z1 - 0.5:
                colour = "amber" if r.random() < 0.3 else "white"
                box((PL, "neon_" + colour, 0), xa - 0.02, xa, ya + rise * 0.3, ya + rise * 0.7, z, z + 1.2, scale=1.0)
                z += r.uniform(4.2, 6.8)
    # The flanks: a wall under the flight's line on each side.
    for z, wind in ((z0, -1), (z1, 1)):
        a, b, c = (x0, y0, z), (x1, y0, z), (x1, y1, z)
        pts = [a, b, c] if wind > 0 else [a, c, b]
        poly(k, pts, [(p[0] / 1.5, p[1] / 1.5) for p in pts])
    # A line of light under every nosing (KvMY1uzSC1E@29): dim, teal, cut in
    # lengths between the balustrades; every seventh step's is white.
    for i in range(n):
        xa, yb = x0 + i * run, y0 + (i + 1) * rise
        col = dim("white", 0.5) if i % 7 == 3 else dim("teal", 0.34)
        for (za, zb) in ((z0 + 0.3, (z0 + z1) / 2 - 0.3), ((z0 + z1) / 2 + 0.3, z1 - 0.3)):
            box((PL, "glow", 0), xa - 0.015, xa + 0.03, yb - 0.035, yb - 0.008, za, zb, scale=1.0, col=col)
        quad((PL, "trim", 0), (xa - 0.004, yb + 0.002, z1), (xa + 0.05, yb + 0.002, z1), (xa + 0.05, yb + 0.002, z0), (xa - 0.004, yb + 0.002, z0),
             col=(0.3, 0.31, 0.34, 1.0))
    # Glass balustrades down each side and the middle: panes on the flight's
    # line between steel posts, a handrail with a line of light under it.
    for z in (z0 + 0.08, (z0 + z1) / 2, z1 - 0.08):
        m = 4
        for j in range(m):
            xa, xb = x0 + 0.1 + (x1 - x0 - 0.1) * j / m, x0 + 0.1 + (x1 - x0 - 0.1) * (j + 1) / m
            ya, yb = y0 + (y1 - y0) * (xa - x0) / (x1 - x0), y0 + (y1 - y0) * (xb - x0) / (x1 - x0)
            quad((PL, "clearglass", 0), (xa + 0.04, ya + 0.14, z), (xb - 0.04, yb + 0.14, z), (xb - 0.04, yb + 0.98, z), (xa + 0.04, ya + 0.98, z),
                 col=(0.9, 0.9, 0.9, 1.0))
            box((PL, "metal", 0), xa - 0.04, xa + 0.04, ya - 0.02, ya + 1.04, z - 0.035, z + 0.035, scale=0.5)
            box((PL, "metal", 1), xa - 0.09, xa + 0.09, ya - 0.02, ya + 0.1, z - 0.07, z + 0.07, scale=0.5)
        box((PL, "metal", 0), x1 - 0.04, x1 + 0.04, y1, y1 + 1.04, z - 0.035, z + 0.035, scale=0.5)
        pipe((PL, "metal", 0), (x0 + 0.06, y0 + 1.04, z), (x1 + 0.04, y1 + 1.04, z), 0.04, segs=6)
        pipe((PL, "glow", 0), (x0 + 0.1, y0 + 0.985, z), (x1, y1 + 0.985, z), 0.014, segs=4, col=dim("teal", 0.7))


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
    # (Its floors in bands of two to eight, each band as lit as its tenants
    # keep it, one in six nearly dark: from the air one lit fraction up a
    # whole shaft was an even scatter of windows on a dark face. The bands
    # break on the shader's floor lines, 8 m and every 3.8 m above. A shaft
    # in the hero's mirror keeps one.)
    rb = random.Random(seed * 31 + 7)
    y = y0
    if in_mirror(x0, x1, z0, z1):
        walls((PL, "corporate", 0), outline, y0, y1, col)
        y = y1
    while y < y1 - 0.01:
        yb = 8.0 + 3.8 * round((y + 3.8 * rb.choice((2, 3, 3, 4, 5, 6, 8)) - 8.0) / 3.8)
        if yb <= y + 1.0 or y1 - yb < 5.7:
            yb = y1
        k = 0.3 if rb.random() < 0.17 else rb.uniform(0.75, 1.3)
        walls((PL, "corporate", 0), outline, y, yb, (min(1.0, col[0] * k), col[1], col[2], 1.0))
        y = yb
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


def fin_row(f, s0, s1, y0, y1, r, step=(2.1, 2.9), out=0.55, w=0.26, tint=1, lit=None, every=3, k=0.3, skip=()):
    """Vertical fins standing out of a face `f` (a buildings.Face) between
    s0 and s1 along it, from y0 to y1; one in `every` carries a line of
    light up its edge. `skip`: (s0, s1) stretches left bare."""
    s, i = s0 + r.uniform(0.2, 0.9), 0
    while s < s1 - 0.2:
        if not any(a <= s <= b for a, b in skip):
            f.box((PL, "trim", 0), s - w / 2, s + w / 2, y0, y1, 0.0, out, col=B.TRIM[tint], scale=2.0)
            if lit and i % every == 0:
                f.box((PL, "glow", 0), s - 0.035, s + 0.035, y0 + 0.2, y1 - 0.2, out, out + 0.03, col=dim(lit, k))
        s += r.uniform(*step)
        i += 1


def wordmark(sid, cx, cy, cz, w, h, yaw, frame=True):
    """One of the city's houses by name (ARASAKA, MILITECH, KIROSHI, NICOLA:
    `sid` is the house with _b or _far, each id once) in its own letters, on
    a dark board."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    sign(sid, cx + nx * 0.16, cy, cz + nz * 0.16, w, h, yaw, district=PL, label=False)
    if frame:
        oriented_box((PL, "board_frame", 0), cx, cy, cz, w + 0.4, h + 0.4, 0.26, yaw, scale=1.0)


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
def parapet(x0, x1, z0, z1, y, tint=1, h=1.0, t=0.3, line=None, lamps=True):
    for (a0, a1, b0, b1) in ((x0, x1, z1 - t, z1), (x0, x1, z0, z0 + t), (x0, x0 + t, z0 + t, z1 - t), (x1 - t, x1, z0 + t, z1 - t)):
        box((PL, "trim", 0), a0, a1, y, y + h, b0, b1, scale=1.5, col=B.TRIM[tint])
    if line:
        walls((PL, "glow", 0), [(x0 - 0.04, z1 + 0.04), (x1 + 0.04, z1 + 0.04), (x1 + 0.04, z0 - 0.04), (x0 - 0.04, z0 - 0.04)],
              y + h - 0.12, y + h - 0.02, dim(line, 0.8))
    if lamps:
        # (Every ninth metre; a parapet in the hero's mirror keeps them every
        # fifth.)
        edge_lights(x0, x1, z0, z1, y + h, step=5.0 if in_mirror(x0, x1, z0, z1) else 9.0)
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


def lawn(x0, x1, z0, z1, y, trees=True):
    """Planting lit from its edge, in beds with stone kerbs and paths
    between: from the air, a roof that is green and not a hole."""
    tones = ((0.004, 0.016, 0.008, 1.0), (0.006, 0.021, 0.011, 1.0))
    if x1 - x0 >= z1 - z0:
        n = max(2, int((x1 - x0) // 7.0))
        beds = [(x0 + (x1 - x0) * i / n + 0.7, x0 + (x1 - x0) * (i + 1) / n - 0.7, z0 + 0.6, z1 - 0.6) for i in range(n)]
    else:
        n = max(2, int((z1 - z0) // 7.0))
        beds = [(x0 + 0.6, x1 - 0.6, z0 + (z1 - z0) * i / n + 0.7, z0 + (z1 - z0) * (i + 1) / n - 0.7) for i in range(n)]
    r = random.Random(int(x0 * 7 + z0 * 13 + y * 3) & 0xffff)
    for i, (a0, a1, b0, b1) in enumerate(beds):
        if a1 - a0 < 1.0 or b1 - b0 < 1.0:
            continue
        box((PL, "concrete", 1), a0 - 0.18, a1 + 0.18, y, y + 0.28, b0 - 0.18, b1 + 0.18, scale=1.5)
        # (Grass in patches of its own greens, lit along the kerb by the
        # bed's edge light: not one flat green.)
        nx, nz = max(1, int((a1 - a0) / 1.6)), max(1, int((b1 - b0) / 1.6))
        for ix in range(nx):
            for iz in range(nz):
                xa, xb = a0 + (a1 - a0) * ix / nx, a0 + (a1 - a0) * (ix + 1) / nx
                za, zb = b0 + (b1 - b0) * iz / nz, b0 + (b1 - b0) * (iz + 1) / nz
                edge = ix in (0, nx - 1) or iz in (0, nz - 1)
                k = r.uniform(0.55, 1.4) * (1.5 if edge else 1.0)
                t = tones[(i + ix + iz) % 2]
                up_poly((PL, "glow", 0), [(xa, za), (xb, za), (xb, zb), (xa, zb)], y + 0.3, (t[0] * k * 1.6, t[1] * k * 1.6, t[2] * k * 1.5, 1.0))
        # What grows in it: shrubs in clumps, a small tree in a big bed, and
        # a row of low lamps along one side.
        for _ in range(max(2, int((a1 - a0) * (b1 - b0) / 9.0))):
            px, pz = r.uniform(a0 + 0.5, a1 - 0.5), r.uniform(b0 + 0.5, b1 - 0.5)
            for j in range(r.randrange(1, 4)):
                P.place("shrub", min(a1 - 0.4, max(a0 + 0.4, px + r.uniform(-0.8, 0.8))), y + 0.28, min(b1 - 0.4, max(b0 + 0.4, pz + r.uniform(-0.8, 0.8))),
                        r.uniform(0, 6.28), sy=r.uniform(0.9, 1.5), sxz=r.uniform(0.9, 1.4), district=PL)
        if a1 - a0 > 3.6 and b1 - b0 > 3.6 and trees:
            P.place("tree_round", (a0 + a1) / 2 + r.uniform(-0.6, 0.6), y + 0.28, (b0 + b1) / 2 + r.uniform(-0.6, 0.6), r.uniform(0, 6.28),
                    sy=r.uniform(0.72, 0.9), sxz=r.uniform(0.8, 1.0), district=PL)
        n = max(1, int((a1 - a0) / 2.2))
        for j in range(n):
            lx = a0 + (a1 - a0) * (j + 0.5) / n
            box((PL, "glow", 1), lx - 0.06, lx + 0.06, y + 0.3, y + 0.42, b0 + 0.1, b0 + 0.22, scale=0.5, col=GLOW["green" if (i + j) % 3 else "yellow"])


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
                hedge_run(x, z + 0.55, x + ln, z + 0.55, y, 0.9)
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
                hedge_run(x + 0.55, z, x + 0.55, z + ln, y, 0.9)
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
# A working roof (ax5YUmkWf_Y@9, mH2wmyeiIpA@143: packed, and lit). The
# site's roof is near black and the street's light does not climb to it, so
# from the air plant in dark steel on it is nothing. Here a roof gets what
# shows: a service path of pavers with lamps along it, and the lamps' light
# drawn on the pavers themselves (glow, brightest by each lamp: a lit floor
# is the only light a roof has); plant in pale painted steel on pale pads
# beside the path (chillers with fans, housings with a lit door and its
# light on an apron, ducts on legs, tanks, cable trays, lit hatches), which
# reads dark against the pads; lamps along the parapet, and red lamps on
# whatever stands tall.
# ---------------------------------------------------------------------------
PLANT_PAINT = ((0.34, 0.36, 0.39), (0.27, 0.29, 0.32), (0.4, 0.4, 0.37), (0.22, 0.27, 0.26), (0.36, 0.32, 0.27))
PAVER = ((0.36, 0.37, 0.4), (0.3, 0.31, 0.34), (0.42, 0.42, 0.44))
PAD = (0.03, 0.032, 0.04)
LAMP_ON = {"white": (0.2, 0.2, 0.19), "amber": (0.24, 0.15, 0.06), "cyan": (0.08, 0.2, 0.24), "magenta": (0.24, 0.08, 0.2), "pink": (0.24, 0.08, 0.13)}
STEEL_D = (0.06, 0.065, 0.075, 1.0)


def edge_lights(x0, x1, z0, z1, y, step=4.2, sides="nsew", hues=("white", "amber", "white"), pools=True):
    """Lamps along a parapet's top (y) on the named sides (n is -z)."""
    runs = {"s": ((x0, z1 - 0.15), (x1, z1 - 0.15)), "n": ((x1, z0 + 0.15), (x0, z0 + 0.15)),
            "w": ((x0 + 0.15, z0), (x0 + 0.15, z1)), "e": ((x1 - 0.15, z1), (x1 - 0.15, z0))}
    k = 0
    for side in sides:
        (ax, az), (bx_, bz_) = runs[side]
        length = math.hypot(bx_ - ax, bz_ - az)
        n = max(1, int(length / step))
        for i in range(n):
            t = (i + 0.5) / n
            px, pz = ax + (bx_ - ax) * t, az + (bz_ - az) * t
            hue = hues[k % len(hues)]
            box((PL, "glow", 0), px - 0.11, px + 0.11, y, y + 0.14, pz - 0.11, pz + 0.11, scale=0.5, col=GLOW[hue])
            if pools and k % 3 == 0:
                light(PL, px, y, pz, hue, 3.0)
            k += 1


def roof_works(x0, x1, z0, z1, y, seed, lamp="white", cap=3.2, density=1.0, path=True):
    """Dress a free rectangle of roof as a working roof (see above). Nothing
    stands higher than `cap`."""
    r = random.Random(seed)
    long_x = (x1 - x0) >= (z1 - z0)
    a0, a1, b0, b1 = (x0, x1, z0, z1) if long_x else (z0, z1, x0, x1)

    def rect(a_lo, a_hi, b_lo, b_hi):
        return (a_lo, a_hi, b_lo, b_hi) if long_x else (b_lo, b_hi, a_lo, a_hi)

    def slab(key, a_lo, a_hi, b_lo, b_hi, ya, yb, col, bottom=False):
        xa, xb, za, zb = rect(a_lo, a_hi, b_lo, b_hi)
        box(key, xa, xb, ya, yb, za, zb, scale=1.0, col=(*col[:3], 1.0), bottom=bottom)

    def at(a, b):
        return (a, b) if long_x else (b, a)

    if b1 - b0 < 2.4 or a1 - a0 < 3.0:
        return
    wide = b1 - b0 >= 5.0
    pb = b0 + (b1 - b0) * (r.uniform(0.35, 0.65) if wide else 0.5)
    def pad(a_lo, a_hi, b_lo, b_hi, col=PAD):
        xa, xb, za, zb = rect(a_lo, a_hi, b_lo, b_hi)
        up_poly((PL, "glow", 0), [(xa, za), (xb, za), (xb, zb), (xa, zb)], y + 0.06, (*col[:3], 1.0))

    if path and wide:
        # The path: lamps beside it, and pavers each as bright as the lamps
        # near it make it.
        lamps = []
        a = a0 + r.uniform(2.0, 4.0)
        while a < a1 - 1.5:
            px, pz = at(a, pb + 0.8)
            box((PL, "steel", 1), px - 0.035, px + 0.035, y, y + 0.95, pz - 0.035, pz + 0.035, scale=0.5, col=STEEL_D)
            box((PL, "glow", 0), px - 0.1, px + 0.1, y + 0.95, y + 1.07, pz - 0.1, pz + 0.1, scale=0.5, col=GLOW[lamp])
            light(PL, px, y + 1.0, pz, lamp, 6.0)
            lamps.append(a)
            a += r.uniform(6.0, 9.0)
        on = LAMP_ON[lamp]
        a = a0 + 0.6
        while a + 1.5 <= a1 - 0.6:
            kk = r.uniform(0.86, 1.1) * (0.1 + sum(1.0 / (1.0 + ((a + 0.75 - la) / 2.4) ** 2) ** 2 for la in lamps))
            pad(a + 0.03, a + 1.47, pb - 0.6, pb + 0.6, (on[0] * kk, on[1] * kk, on[2] * kk))
            a += 1.5
    for lo, hi in (((b0 + 0.6, pb - 1.2), (pb + 1.4, b1 - 0.6)) if wide else ((b0 + 0.3, b1 - 0.3),)):
        depth = hi - lo
        if depth < 1.5:
            continue
        mid = (lo + hi) / 2
        a = a0 + r.uniform(0.8, 3.0)
        while a < a1 - 2.2:
            room = a1 - 0.8 - a
            paint = r.choice(PLANT_PAINT)
            kind = r.random()
            if r.random() > density:
                a += r.uniform(3.0, 6.0)
                continue
            if kind < 0.2 and depth >= 2.0:
                # A chiller: a long cabinet on a pad, fans in its top, a status lamp.
                ln, dd, hh = min(r.uniform(2.6, 4.4), room), min(r.uniform(1.5, 2.1), depth - 0.3), min(r.uniform(1.4, 2.0), cap - 0.3)
                pad(a - 0.4, a + ln + 0.4, mid - dd / 2 - 0.4, mid + dd / 2 + 0.4)
                slab((PL, "steel", 0), a, a + ln, mid - dd / 2, mid + dd / 2, y + 0.12, y + 0.12 + hh, paint)
                for j in range(max(1, int(ln / 1.3))):
                    fx, fz = at(a + (j + 0.5) * ln / max(1, int(ln / 1.3)), mid)
                    cylinder((PL, "steel", 1), fx, fz, y + 0.12 + hh, y + 0.2 + hh, min(0.5, dd * 0.36), segs=8, col=STEEL_D)
                lx, lz = at(a + 0.15, mid - dd / 2 - 0.02)
                box((PL, "glow", 1), lx - 0.06, lx + 0.06, y + 0.9, y + 1.02, lz - 0.06, lz + 0.06, scale=0.5, col=GLOW[r.choice(("green", "amber", "red"))])
                a += ln
            elif kind < 0.36 and depth >= 2.2:
                # A plant room: a lit door, a lamp over it, its light on the roof.
                ln, dd, hh = min(r.uniform(2.4, 3.6), room), min(r.uniform(2.0, 2.8), depth - 0.2), min(r.uniform(2.2, 2.8), cap)
                slab((PL, "steel", 0), a, a + ln, mid - dd / 2, mid + dd / 2, y, y + hh, paint)
                slab((PL, "steel", 0), a - 0.1, a + ln + 0.1, mid - dd / 2 - 0.1, mid + dd / 2 + 0.1, y + hh, y + hh + 0.1, STEEL_D)
                slab((PL, "glow", 0), a + ln * 0.5 - 0.42, a + ln * 0.5 + 0.42, mid + dd / 2, mid + dd / 2 + 0.03, y + 0.05, y + min(2.0, hh - 0.2), dim("amber", 0.75))
                pad(a + ln * 0.5 - 1.5, a + ln * 0.5 + 1.5, mid + dd / 2, min(hi + 0.4, mid + dd / 2 + 1.8), (0.16, 0.1, 0.04))
                lx, lz = at(a + ln * 0.5, mid + dd / 2 + 0.8)
                light(PL, lx, y + 1.5, lz, "amber", 5.0)
                a += ln
            elif kind < 0.56:
                # A duct on legs, an elbow up into a cowl at one end.
                ln = min(r.uniform(4.0, 8.0), room)
                off = r.uniform(-0.3, 0.3) * max(0.0, depth - 1.0)
                pad(a - 0.3, a + ln + 0.3, mid + off - 0.7, mid + off + 0.7)
                slab((PL, "steel", 0), a, a + ln, mid + off - 0.3, mid + off + 0.3, y + 0.4, y + 0.95, paint, bottom=True)
                for t in (0.12, 0.5, 0.88):
                    slab((PL, "steel", 1), a + ln * t - 0.06, a + ln * t + 0.06, mid + off - 0.34, mid + off + 0.34, y, y + 0.4, STEEL_D)
                slab((PL, "steel", 0), a + ln - 0.7, a + ln, mid + off - 0.36, mid + off + 0.36, y + 0.95, y + min(1.9, cap), paint)
                a += ln
            elif kind < 0.68 and depth >= 2.0 and cap >= 2.6:
                # A tank lying on saddles.
                ln = min(r.uniform(2.6, 4.0), room)
                rr = min(0.8, depth * 0.36)
                pad(a - 0.3, a + ln + 0.3, mid - rr - 0.3, mid + rr + 0.3)
                cxa, cza = at(a, mid)
                cxb, czb = at(a + ln, mid)
                pipe((PL, "steel", 0), (cxa, y + 0.3 + rr, cza), (cxb, y + 0.3 + rr, czb), rr, segs=8, col=(*paint, 1.0), caps=True)
                for t in (0.2, 0.8):
                    slab((PL, "steel", 1), a + ln * t - 0.12, a + ln * t + 0.12, mid - rr * 0.8, mid + rr * 0.8, y, y + 0.3 + rr * 0.4, STEEL_D)
                a += ln
            elif kind < 0.82:
                # Units in a row on a pad.
                n = max(2, min(r.randrange(2, 5), int(room / 1.25)))
                pad(a - 0.3, a + n * 1.25 + 0.05, mid - 0.85, mid + 0.85)
                for j in range(n):
                    ux, uz = at(a + 0.5 + j * 1.25, mid)
                    P.place("ac_roof", ux, y, uz, 0.0 if long_x else math.pi / 2, district=PL)
                a += n * 1.25
            elif kind < 0.92:
                # A lit hatch: a light well's glazing on a kerb.
                ln, dd = min(r.uniform(1.8, 3.0), room), min(1.6, depth - 0.4)
                slab((PL, "steel", 0), a - 0.12, a + ln + 0.12, mid - dd / 2 - 0.12, mid + dd / 2 + 0.12, y, y + 0.32, STEEL_D)
                xa, xb, za, zb = rect(a, a + ln, mid - dd / 2, mid + dd / 2)
                kk = r.uniform(0.5, 0.9)
                up_poly((PL, "skylight", 0), [(xa, za), (xb, za), (xb, zb), (xa, zb)], y + 0.33, (kk, kk * r.uniform(0.8, 1.0), kk * r.uniform(0.6, 1.0), 1.0), scale=1.0)
                a += ln
            else:
                # A cable tray on sleepers, running on past the next piece.
                ln = min(r.uniform(5.0, 10.0), room)
                off = (depth / 2 - 0.3) * r.choice((-1, 1))
                slab((PL, "steel", 1), a, a + ln, mid + off - 0.16, mid + off + 0.16, y + 0.22, y + 0.3, STEEL_D, bottom=True)
                for t in range(int(ln / 1.6) + 1):
                    slab((PL, "steel", 1), a + t * 1.6, a + t * 1.6 + 0.1, mid + off - 0.2, mid + off + 0.2, y, y + 0.22, STEEL_D)
                a += 1.0
            a += r.uniform(0.9, 2.6)


def skylight(x0, x1, z0, z1, y, colour="white", k=0.3, pitch=1.2):
    """A ridged glass roof over a hall, lit from inside: two slopes of the
    site's roof glazing (bars every 1.2 m, each pane its own brightness) on
    a steel kerb, the gable ends glazed too."""
    zm = (z0 + z1) / 2
    c = dim(colour, min(1.0, k * 2.6))
    box((PL, "metal", 0), x0 - 0.2, x1 + 0.2, y, y + 0.3, z0 - 0.2, z1 + 0.2, scale=1.0)
    for (za, zb, ya, yb) in ((z0, zm, y + 0.3, y + 0.3 + pitch), (zm, z1, y + 0.3 + pitch, y + 0.3)):
        pts = [(x0, ya, za), (x1, ya, za), (x1, yb, zb), (x0, yb, zb)]
        cross = (pts[1][0] - pts[0][0]) * (pts[2][2] - pts[0][2]) - (pts[1][2] - pts[0][2]) * (pts[2][0] - pts[0][0])
        if cross > 0:
            pts = list(reversed(pts))
        poly((PL, "skylight", 0), pts, [(p[0] / 1.2, p[2] / 1.2) for p in pts], c)
    for x, wind in ((x0, 1), (x1, -1)):
        pts = [(x, y + 0.3, z0), (x, y + 0.3, z1), (x, y + 0.3 + pitch, zm)]
        poly((PL, "skylight", 0), pts if wind > 0 else list(reversed(pts)), [(0, 0), (1, 0), (0.5, 1)], c)


# ---------------------------------------------------------------------------
# The plaza's sign kit (Fn9gKhU_2_Q@74, @81, YRL74JmhVgk@133, @30).
# ---------------------------------------------------------------------------
def low_screen(cx, cz, w, yaw, r, y=0.15, h=1.2, foot=0.35, hue="white"):
    """A long advert at bench height, on a dark plinth, read from both
    sides: the city's drawn adverts, a line of light along its top, and its
    light on the ground either side."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((PL, "board_frame", 0), cx, y + foot / 2, cz, w * 0.86, foot, 0.34, yaw, scale=1.0)
    oriented_box((PL, "board_frame", 0), cx, y + foot + h / 2, cz, w + 0.16, h + 0.16, 0.2, yaw, scale=1.0)
    for sgn in (1, -1):
        rotated_quad((PL, "billboard", 0), cx + nx * 0.105 * sgn, y + foot + h / 2, cz + nz * 0.105 * sgn, w, h, yaw + (0.0 if sgn > 0 else math.pi),
                     col=(r.randrange(8) / 8.0 + 0.01, r.randrange(8) / 8.0 + 0.01, r.random(), 1.0))
        shine(cx + nx * 1.5 * sgn, y + 1.0, cz + nz * 1.5 * sgn, hue, 4.5)
    oriented_box((PL, "glow", 0), cx, y + foot + h + 0.1, cz, w + 0.16, 0.04, 0.06, yaw, scale=1.0, col=dim("cyan", 0.7))


def holo_wrap(cx, cz, y0, y1, r, hue, hue2="white"):
    """A hologram's sleeve round a post or a trunk: thin rings of light,
    one above another, the air between them empty."""
    plan = ngon(cx, cz, r, 8)
    n = max(2, int((y1 - y0) / 0.4))
    for i in range(n + 1):
        y = y0 + (y1 - y0) * i / n
        walls((PL, "glow", 0), plan, y - 0.02, y + 0.02, dim(hue if i % 2 == 0 else hue2, 0.75))
    shine(cx, y0, cz + r + 0.4, hue if hue in TINT else "white", 3.0)


def octagon_sign(cx, cy, cz, across, yaw, hue="cyan", size="bx"):
    """One large octagonal sign, both faces: a pictogram in a dark octagon
    edged twice in light."""
    pl = Plane(cx, cy, cz, yaw)
    r = across / 2 / math.cos(math.pi / 8)
    pts = [(r * math.cos(math.pi / 8 + i * math.tau / 8), r * math.sin(math.pi / 8 + i * math.tau / 8)) for i in range(8)]
    nx, nz = math.sin(yaw), math.cos(yaw)
    sid = house_name(size, cx, cz)
    k = across * 0.56 / ST_SIZES[size][0]
    w, h = ST_SIZES[size][0] * k, ST_SIZES[size][1] * k
    for sgn in (1, -1):
        face = [pl.at(u * sgn, v, 0.07 * sgn) for u, v in pts]
        poly((PL, "board_frame", 0), face, [(0.5, 0.5)] * 8)
        for f_, t, kk in ((1.0, 0.16, 0.9), (0.84, 0.07, 0.5)):
            for (ua, va), (ub, vb) in zip(pts, pts[1:] + pts[:1]):
                a_ = pl.at(ua * f_ * sgn, va * f_, 0.09 * sgn)
                b_ = pl.at(ub * f_ * sgn, vb * f_, 0.09 * sgn)
                a2 = pl.at(ua * (f_ - t) * sgn, va * (f_ - t), 0.09 * sgn)
                b2 = pl.at(ub * (f_ - t) * sgn, vb * (f_ - t), 0.09 * sgn)
                quad((PL, "glow", 0), a_, b_, b2, a2, col=dim(hue, kk))
        sign(sid if sgn > 0 else sid + "_b", cx + nx * 0.1 * sgn, cy, cz + nz * 0.1 * sgn, w, h, yaw + (0.0 if sgn > 0 else math.pi), district=PL, label=False)


def front_bay(f, s0, s1, kind, r, colour="amber"):
    """A stretch of ground floor on a blank podium face `f`, standing a
    hand proud of the wall: "shop" (a lit window between steel posts under a
    board, an awning), "screens" (adverts in frames at eye level), "dock" (a
    roller shutter under a lit header, hazard posts)."""
    if kind == "shop":
        f.quad((PL, "shop", 0), s0 + 0.2, s1 - 0.2, 0.55, 3.3, 0.06, col=(r.uniform(0.6, 1.0), r.random(), 1.0, 1.0))
        f.box((PL, "trim", 0), s0, s1, G_LOBBY, 0.55, 0.0, 0.1, col=B.DARK_TRIM)
        n = max(1, int(round((s1 - s0) / 3.0)))
        for i in range(n + 1):
            s = s0 + (s1 - s0) * i / n
            f.box((PL, "metal", 0), s - 0.08, s + 0.08, G_LOBBY, 3.4, 0.0, 0.14)
        f.box((PL, "trim", 0), s0, s1, 3.3, 4.3, 0.0, 0.12, col=B.DARK_TRIM)
        w, h = ST_SIZES["pm"]
        mid = (s0 + s1) / 2
        cx, cy, cz = f.p(f.at(mid), 3.82, 0.15)
        sign(house_name("pm", cx, cz), cx, cy, cz, w, h * 0.72, f.yaw, district=PL, label=False)
        B.awning(PL, f, s0 + 0.3, s1 - 0.3, colour)
        lx, _, lz = f.p(f.at(mid), 0.0, 1.6)
        light(PL, lx, 2.2, lz, colour, 5.0)
    elif kind == "screens":
        f.box((PL, "trim", 0), s0, s1, G_LOBBY, 4.3, 0.0, 0.1, col=B.TRIM[1])
        n = max(1, int((s1 - s0) / 3.1))
        for i in range(n):
            a, b = s0 + (s1 - s0) * i / n + 0.25, s0 + (s1 - s0) * (i + 1) / n - 0.25
            f.box((PL, "board_frame", 0), a - 0.08, b + 0.08, 0.62, 3.58, 0.1, 0.18)
            f.quad((PL, "billboard", 0), a, b, 0.7, 3.5, 0.19, uvs=((0, 0), (1, 0), (1, 1), (0, 1)),
                   col=(r.randrange(8) / 8.0 + 0.01, r.randrange(8) / 8.0 + 0.01, r.random(), 1.0))
        f.box((PL, "glow", 0), s0 + 0.2, s1 - 0.2, 3.86, 3.94, 0.1, 0.13, col=dim(colour, 0.7))
    else:
        f.box((PL, "trim", 0), s0, s1, G_LOBBY, 4.3, 0.0, 0.08, col=B.DARK_TRIM)
        n = max(1, int((s1 - s0) / 3.4))
        for i in range(n):
            a, b = s0 + (s1 - s0) * i / n + 0.3, s0 + (s1 - s0) * (i + 1) / n - 0.3
            f.quad((PL, "door_panel", 0), a, b, G_LOBBY, 3.3, 0.09)
            f.box((PL, "metal", 0), a - 0.12, a, G_LOBBY, 3.4, 0.08, 0.16)
            f.box((PL, "metal", 0), b, b + 0.12, G_LOBBY, 3.4, 0.08, 0.16)
            f.box((PL, "glow", 0), a, b, 3.4, 3.5, 0.08, 0.12, col=dim(colour, 0.9))
            lx, _, lz = f.p(f.at((a + b) / 2), 0.0, 1.2)
            light(PL, lx, 3.0, lz, colour, 4.0)
        for s in (s0 + 0.15, s1 - 0.15):
            f.box((PL, "trim", 1), s - 0.09, s + 0.09, G_LOBBY, 1.1, 0.3, 0.48, col=(0.62, 0.48, 0.06, 1.0))


# ---------------------------------------------------------------------------
# Props of the plaza's own.
# ---------------------------------------------------------------------------
@P.proto("lamp_plaza", box=(0.12, 3.0, 0.12))
def _lamp_plaza(k):
    """A plaza lamp: a slim mast bending over at its head (toward +z), a
    cool white light under it (KvMY1uzSC1E@29)."""
    cylinder(k("metal"), 0.0, 0.0, 0.0, 5.4, 0.07, segs=6)
    cylinder(k("metal"), 0.0, 0.0, 0.0, 0.4, 0.13, segs=6)
    # (Dressed: a collar and two bands of light, so the mast is not a bare
    # black line to somebody standing by it.)
    cylinder(k("metal"), 0.0, 0.0, 1.9, 2.3, 0.1, segs=6)
    for y in (1.05, 3.1, 3.25):
        cylinder(k("neon_white"), 0.0, 0.0, y, y + 0.05, 0.085, segs=6, cap=False)
    pipe(k("metal"), (0.0, 5.4, 0.0), (0.0, 6.1, 0.45), 0.055, segs=5)
    pipe(k("metal"), (0.0, 6.1, 0.45), (0.0, 6.35, 1.3), 0.05, segs=5)
    box(k("metal"), -0.16, 0.16, 6.3, 6.4, 1.2, 2.2, scale=0.5)
    box(k("neon_white"), -0.13, 0.13, 6.26, 6.3, 1.3, 2.15, scale=0.5)


@P.proto("kiosk", box=(1.4, 1.3, 1.1))
def _kiosk(k):
    """A low kiosk, its counter lit and a band of cyan round its roof
    (Fn9gKhU_2_Q@77); its counter toward +z."""
    # (Two materials only: every prototype's material is a draw of its own.)
    steel = (0.2, 0.21, 0.24, 1)
    box(k("trim"), -1.4, 1.4, 0.0, 2.5, -1.1, 1.1, scale=1.0, col=(0.05, 0.09, 0.1, 1))
    box(k("trim"), -1.55, 1.55, 2.5, 2.62, -1.25, 1.6, scale=1.0, col=steel)
    box(k("glow"), -1.15, 1.15, 1.0, 2.1, 1.1, 1.12, scale=0.5, col=(1.0, 0.72, 0.42, 1))
    box(k("trim"), -1.25, 1.25, 0.92, 1.0, 1.1, 1.45, scale=0.5, col=steel)
    box(k("glow"), -1.55, 1.55, 2.36, 2.46, 1.6, 1.63, scale=0.5, col=GLOW["cyan"])
    box(k("glow"), -1.58, -1.55, 2.36, 2.46, -1.25, 1.6, scale=0.5, col=GLOW["cyan"])
    box(k("glow"), 1.55, 1.58, 2.36, 2.46, -1.25, 1.6, scale=0.5, col=GLOW["cyan"])


# Night foliage (YRL74JmhVgk@30): dark teal-green, near black where nothing
# lights it, small leaves. The site's plant shader cuts a frond's quad into
# leaflets, so the leaves here are short fronds in tufts (a blossom pad is
# drawn as petals, pale ones among them: not for a hedge), and the colours
# are dark enough that only a lamp's or a sign's light near by shows them.
LEAF = ((0.03, 0.115, 0.07), (0.022, 0.09, 0.062), (0.045, 0.14, 0.075), (0.06, 0.13, 0.05))
HEART = (0.006, 0.022, 0.016, P.WOOD)


def leaf_pad(key, cx, cy, cz, r, col, segs=7):
    """A pad of leaves: P.pad's shallow dome, drawn as a frond's middle (its
    uv across held at the rib, so the shader cuts no comb from it and lights
    it as leaf). P.pad's own tag is blossom, whose clusters the site tints
    pale one in six: on a dark green shrub, white flecks like confetti."""
    col = (*col[:3], P.FROND)

    def ring(f, y):
        return [(cx + r * f * math.cos(t), cy + y, cz + r * f * math.sin(t))
                for t in ((i + 0.5 * (f < 1)) * math.tau / segs for i in range(segs))]
    mid, rim = ring(0.55, 0.2 * r), ring(1.0, -0.06 * r)
    top = (cx, cy + 0.3 * r, cz)
    for i in range(segs):
        j = (i + 1) % segs
        poly(key, [top, mid[i], mid[j]], [(0.5, 0.62), (0.5, 0.5), (0.5, 0.5)], col)
        poly(key, [mid[i], rim[j], mid[j]], [(0.5, 0.5), (0.5, 0.3), (0.5, 0.5)], col)


def tuft(k, x, y, z, r, n=3, size=0.34, lean=0.9):
    for i in range(n):
        yaw = r.uniform(0.0, math.tau)
        P.frond(k("plant"), (x, y, z), yaw, r.uniform(lean - 0.5, lean + 0.4), size * r.uniform(0.8, 1.25), r.uniform(0.5, 1.1), size * 0.62, r.choice(LEAF),
                segs=2, vee=False)


@P.proto("hedge_soft", box=(1.0, 0.4, 0.55), reach=320)
def _hedge_soft(k):
    """Two metres of clipped hedge along x: a dark body with a rounded top,
    small leaves in tufts over the top and standing out of both sides."""
    prof = ((-0.4, 0.0), (-0.44, 0.36), (-0.32, 0.58), (0.0, 0.66), (0.32, 0.58), (0.44, 0.36), (0.4, 0.0))
    for (z0, y0), (z1, y1) in zip(prof, prof[1:]):
        quad(k("plant"), (1.0, y0, z0), (-1.0, y0, z0), (-1.0, y1, z1), (1.0, y1, z1), col=HEART)
    poly(k("plant"), [(1.0, y, z) for z, y in prof], [(0.5, 0.5)] * len(prof), HEART)
    poly(k("plant"), [(-1.0, y, z) for z, y in reversed(prof)], [(0.5, 0.5)] * len(prof), HEART)
    r = random.Random(31)
    # (Its top is leaf in small pads, close set: clipped, not ferny.)
    for i in range(10):
        x = -0.9 + i * 0.2 + r.uniform(-0.04, 0.04)
        leaf_pad(k("plant"), x, 0.56 + r.uniform(-0.02, 0.04), r.uniform(-0.16, 0.16), r.uniform(0.24, 0.3), r.choice(CROWN), segs=5)
    for i in range(6):
        x = -0.84 + i * 0.336 + r.uniform(-0.08, 0.08)
        for side in (-1, 1):
            yaw = (0.0 if side > 0 else math.pi) + r.uniform(-0.7, 0.7)
            P.frond(k("plant"), (x, r.uniform(0.3, 0.5), side * 0.4), yaw, r.uniform(0.2, 0.7), r.uniform(0.24, 0.34), 0.8, 0.2, r.choice(LEAF), segs=2, vee=False)


@P.proto("shrub", box=(0.7, 0.5, 0.7), reach=260)
def _shrub(k):
    """A shrub: a dark heart and small leaves in tufts, standing and arching
    out of it."""
    P.lathe(k("plant"), 0.0, 0.0, ((0.0, 0.3), (0.24, 0.44), (0.44, 0.3), (0.56, 0.0)), segs=6, col=HEART)
    r = random.Random(37)
    # (Leaf in small pads round the heart and over it, a few shoots standing
    # out of them: a bush, where long fronds at arm's length were wedges.)
    for i in range(6):
        a = i * math.tau / 6 + r.uniform(-0.3, 0.3)
        rr = r.uniform(0.2, 0.34)
        leaf_pad(k("plant"), rr * math.cos(a), 0.3 + r.uniform(-0.05, 0.1), rr * math.sin(a), r.uniform(0.26, 0.34), r.choice(CROWN), segs=5)
    leaf_pad(k("plant"), 0.0, 0.5, 0.0, 0.34, CROWN[2], segs=6)
    for i in range(5):
        a = i * math.tau / 5 + r.uniform(-0.4, 0.4)
        tuft(k, 0.3 * math.cos(a), 0.34, 0.3 * math.sin(a), r, n=1, size=0.22, lean=0.9)


@P.proto("ad_board", box=(1.9, 1.05, 0.12), reach=420)
def _ad_board(k):
    """A long advert at eye level on two feet, read from both sides
    (Fn9gKhU_2_Q@74): 3.6 m by 1.5, the site's adverts, no words."""
    for x in (-1.3, 1.3):
        box(k("trim"), x - 0.09, x + 0.09, 0.0, 0.52, -0.09, 0.09, scale=0.5, col=P.CAST)
        box(k("trim"), x - 0.3, x + 0.3, 0.0, 0.06, -0.24, 0.24, scale=0.5, col=P.CAST)
    box(k("trim"), -1.9, 1.9, 0.5, 2.1, -0.09, 0.09, scale=0.5, col=P.CAST)
    for yaw, z in ((0.0, 0.096), (math.pi, -0.096)):
        P.face(k, P.POSTER, 0.0, 1.3, z, 3.64, 1.44, yaw, P.ADVERT)


@P.proto("shelter", box=(2.15, 1.3, 0.85), reach=420)
def _shelter(k):
    """A shelter 4.2 m long, open to +z: a thin roof on three posts, rails
    for its glass back, an advert at one end of the back (both faces), a
    slatted seat."""
    for x in (-2.0, 0.0, 2.0):
        box(k("trim"), x - 0.05, x + 0.05, 0.0, 2.45, -0.62, -0.52, scale=0.5, col=P.STEEL)
    box(k("trim"), -2.15, 2.15, 2.45, 2.55, -0.75, 0.85, scale=0.5, col=P.CAST, bottom=True)
    for y in (0.12, 2.02):
        box(k("trim"), -2.0, 2.0, y, y + 0.07, -0.6, -0.54, scale=0.5, col=P.STEEL)
    box(k("trim"), 0.95, 2.0, 0.3, 2.0, -0.63, -0.51, scale=0.5, col=P.CAST)
    P.face(k, P.POSTER, 1.475, 1.15, -0.5, 0.95, 1.6, 0.0, P.ADVERT)
    P.face(k, P.POSTER, 1.475, 1.15, -0.64, 0.95, 1.6, math.pi, P.ADVERT)
    box(k("trim"), -1.7, 0.7, 0.42, 0.48, -0.46, -0.06, scale=0.6, col=(0.16, 0.1, 0.06, 1))
    for x in (-1.5, 0.5):
        box(k("trim"), x - 0.04, x + 0.04, 0.0, 0.42, -0.42, -0.1, scale=0.5, col=P.CAST)


CROWN = ((0.028, 0.115, 0.055), (0.02, 0.092, 0.05), (0.04, 0.135, 0.058), (0.026, 0.108, 0.07))


@P.proto("tree_round", box=(0.25, 1.2, 0.25))
def _tree_round(k):
    """A small round-headed tree, four metres high, for a bed or a roof
    (YRL74JmhVgk@18's row of round trees): a dark trunk that forks into
    three limbs, and a crown of leaf in pads round a dark heart, tier over
    tier, so it is a head with depth from every side and from above; two
    small lamps at its foot turned up into it."""
    w = k("plant")
    bark = (0.09, 0.075, 0.06, P.LIMB)
    P.tube(w, ((0.0, 0.0, 0.0), (0.02, 0.5, 0.01), (0.06, 1.1, -0.02), (0.03, 1.7, 0.03), (0.0, 2.1, 0.0)), (0.17, 0.12, 0.1, 0.09, 0.08), segs=7, col=bark, smooth=True)
    for limb in (((0.03, 1.7, 0.03), (0.3, 2.05, 0.2), (0.55, 2.5, 0.35)), ((0.0, 2.1, 0.0), (-0.3, 2.4, 0.1), (-0.6, 2.8, 0.15)),
                 ((0.0, 2.1, 0.0), (0.05, 2.5, -0.3), (0.1, 3.0, -0.5))):
        P.tube(w, limb, (0.075, 0.055, 0.035), segs=5, col=bark, smooth=True)
    P.lathe(w, 0.0, 0.0, ((2.15, 0.25), (2.4, 0.8), (2.9, 1.02), (3.4, 0.8), (3.75, 0.3)), segs=7, col=HEART)
    r = random.Random(53)
    for tier, (y, ring_r, n, pr) in enumerate(((2.2, 0.7, 7, 0.5), (2.55, 1.0, 9, 0.52), (2.95, 1.05, 9, 0.52), (3.35, 0.8, 7, 0.5), (3.68, 0.4, 4, 0.46),
                                               (3.86, 0.0, 1, 0.5))):
        for i in range(n):
            a = (i + 0.5 * (tier % 2)) * math.tau / n + r.uniform(-0.2, 0.2)
            leaf_pad(w, ring_r * math.cos(a), y + r.uniform(-0.1, 0.1), ring_r * math.sin(a), pr * r.uniform(0.88, 1.12), r.choice(CROWN), segs=6)
    # (Sprays of leaf out of the crown's flanks and top, so its edge is
    # broken and not a ball.)
    for i in range(22):
        a, yy = i * 2.39996 + r.uniform(-0.2, 0.2), r.uniform(2.3, 3.8)
        rr = 1.5 * math.sqrt(max(0.05, 1.0 - ((yy - 2.95) / 1.05) ** 2))
        tuft(k, rr * math.cos(a), yy, rr * math.sin(a), r, n=2, size=0.42, lean=0.5 + 0.6 * (yy - 2.3))
    for x, z in ((0.42, 0.3), (-0.36, -0.4)):
        box(k("glow"), x - 0.07, x + 0.07, 0.0, 0.07, z - 0.07, z + 0.07, scale=0.5, col=(0.75, 1.0, 0.82, 1.0))


@P.proto("grass_tuft", box=(0.3, 0.15, 0.3), reach=70, detail=True)
def _grass_tuft(k):
    """A clump of grass a hand high, for a lawn seen from beside it."""
    r = random.Random(59)
    for i in range(7):
        yaw = i * math.tau / 7 + r.uniform(-0.3, 0.3)
        d = r.uniform(0.0, 0.2)
        P.frond(k("plant"), (d * math.sin(yaw), 0.0, d * math.cos(yaw)), yaw, r.uniform(0.9, 1.4), r.uniform(0.16, 0.3), r.uniform(0.3, 0.9), 0.07,
                r.choice(((0.06, 0.2, 0.08), (0.08, 0.24, 0.07), (0.045, 0.17, 0.09))), segs=2, vee=False)


def turf(pts2, y, r, pools=None, tone=(0.042, 0.13, 0.05), dark=(0.2, 0.225, 0.29)):
    """A piece of lawn (a convex plan): grass as a lit floor, each corner
    under the light that reaches it, a little its own green."""
    k = r.uniform(0.78, 1.22)
    lit_poly((PL, "glow", 0), list(pts2), y, (tone[0] * k, tone[1] * k * r.uniform(0.9, 1.1), tone[2] * k), pools=pools, dark=dark)


def parasol(cx, cz, y, r=1.7, top=2.9, hues=("teal", "white"), lamp="amber"):
    """A market parasol over a cart: a steel pole, eight ribs, cloth in two
    colours turn about (dark on top, lit through from under), a lit hem and
    a lamp under its hub. From the air it is a striped octagon with a line
    of light round it."""
    dye = {"teal": (0.1, 0.5, 0.44), "white": (0.72, 0.68, 0.56), "yellow": (0.8, 0.62, 0.12), "green": (0.16, 0.5, 0.24), "red": (0.6, 0.12, 0.1)}
    cylinder((PL, "metal", 1), cx, cz, y, top + 0.25, 0.035, segs=5)
    rim = [(cx + r * math.cos(i * math.tau / 8), top - 0.55, cz + r * math.sin(i * math.tau / 8)) for i in range(8)]
    apex = (cx, top, cz)
    for i in range(8):
        a, b = rim[i], rim[(i + 1) % 8]
        d = dye[hues[i % len(hues)]]
        # (b, a: wound to face up; the cloth's shader lights the other side.)
        poly((PL, "trim", 0), [apex, b, a], [(0.5, 1.0), (1.0, 0.0), (0.0, 0.0)], (d[0] * 0.5, d[1] * 0.5, d[2] * 0.5, 1.0))
        poly((PL, "awning", 1), [apex, a, b], [(0.2, 0.0), (0.9, 0.0), (0.9, 1.0)], (*d, 1.0))
        pipe((PL, "metal", 1), (cx, top - 0.03, cz), (a[0], a[1] - 0.02, a[2]), 0.014, segs=3)
        pipe((PL, "glow", 0), a, b, 0.018, segs=3, col=dim(lamp, 0.8))
    box((PL, "glow", 1), cx - 0.09, cx + 0.09, top - 0.62, top - 0.5, cz - 0.09, cz + 0.09, scale=0.5, col=GLOW[lamp])


def corner_sign(x, z, y0, size, k, yaw, out=0.9):
    """A big sign off a block's corner, turned 45 degrees to both streets
    (`yaw` is the way it faces), on two brackets."""
    w, h = ST_SIZES[size][0] * k, ST_SIZES[size][1] * k
    nx, nz = math.sin(yaw), math.cos(yaw)
    cx, cz = x + nx * out, z + nz * out
    big_sign(size, k, cx, y0 + h / 2, cz, yaw)
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


def lobby_front(f, s0, s1, r, accent="cyan", guards=True):
    """A tower's lobby on the street, in place of shops: the hall behind
    glass from the pavement to the fascia (the site's curtain wall draws its
    ceiling of light panels and whoever is in it), steel posts between the
    panes, four glass doors in the middle (jambs, handles, a lit header)
    under a canopy with a line of the tower's colour, cubes on the pavement
    before it, and security either side."""
    key = (PL, "corporate", 0)
    col = (0.95, 0.35, r.random(), 1.0)
    f.quad(key, s0, s1, 0.42, 4.2, 0.04, col=col)
    n = max(2, int(round((s1 - s0) / 3.2)))
    for i in range(n + 1):
        s = s0 + (s1 - s0) * i / n
        f.box((PL, "metal", 0), s - 0.07, s + 0.07, G_LOBBY, 4.25, 0.0, 0.12)
    f.box((PL, "metal", 0), s0, s1, 4.2, 4.5, 0.0, 0.14)
    mid = (s0 + s1) / 2
    # The doors: two leaves of dark glass in a steel frame, lit from above.
    for d in (-2.3, -1.15, 0.0, 1.15, 2.3):
        f.box((PL, "board_frame", 0), mid + d - 0.06, mid + d + 0.06, G_LOBBY, 3.0, 0.04, 0.22)
    f.box((PL, "board_frame", 0), mid - 2.36, mid + 2.36, 3.0, 3.22, 0.04, 0.24)
    f.box((PL, "glow", 0), mid - 2.2, mid + 2.2, 3.06, 3.16, 0.24, 0.27, col=dim("white", 1.2))
    for d in (-0.5, 0.5, -1.65, 1.65):
        f.box((PL, "metal", 1), mid + d - 0.03, mid + d + 0.03, 0.95, 1.35, 0.2, 0.26)
    # The canopy and its line of light.
    f.box((PL, "metal", 0), mid - 4.5, mid + 4.5, 4.5, 4.75, 0.0, 3.0)
    a, b = f.at(mid - 4.5), f.at(mid + 4.5)
    pa, pb = f.p(a, 4.56, 3.02), f.p(b, 4.62, 3.05)
    nbox(accent, min(pa[0], pb[0]), max(pa[0], pb[0]), 4.56, 4.62, min(pa[2], pb[2]), max(pa[2], pb[2]))
    for d in (-3.0, 0.0, 3.0):
        f.box((PL, "neon_white", 0), mid + d - 0.5, mid + d + 0.5, 4.46, 4.5, 1.2, 1.4)
    # A line of the tower's colour along the fascia, and cubes at the kerb.
    a, b = f.at(s0 + 0.3), f.at(s1 - 0.3)
    pa, pb = f.p(a, 4.3, 0.14), f.p(b, 4.36, 0.17)
    nbox(accent, min(pa[0], pb[0]), max(pa[0], pb[0]), 4.3, 4.36, min(pa[2], pb[2]), max(pa[2], pb[2]))
    for d, kind in ((-4.4, "planter_tree"), (-2.6, "bollard"), (-1.5, "bollard"), (1.5, "bollard"), (2.6, "bollard"), (4.2, "lightbox")):
        px_, _, pz_ = f.p(f.at(mid + d), 0.0, 3.72)
        P.place(kind, px_, G_LOBBY, pz_, f.yaw + math.pi / 2 if kind == "lightbox" else 0.0, sxz=0.6 if kind == "planter_tree" else 1.0, district=PL)
    if guards:
        px_, _, pz_ = f.p(f.at(mid + 2.9), 0.0, 0.62)
        stand(px_, pz_, f.yaw, "idle", y=G_LOBBY)


G_LOBBY = 0.15
