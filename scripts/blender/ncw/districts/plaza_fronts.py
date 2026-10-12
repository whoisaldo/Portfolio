"""Corpo Plaza's shopfronts at arm's length (the walker's frame pz-pave-e).

The kit draws a shop as a lit pane between pilasters under a fascia, and an
awning as one sloped sheet of dyed cloth. From two metres that was a flat
picture of a shop on a wall under a flat white plane. So, last of all, when
every shop of the plaza's is built, each pane gets what stands in front of
glass (a steel frame: sill, mullions, transom; on some a door leaf with its
push bar, kick plate and a lamp over it; on some a roller shutter part down
under its hood, in its guides), each pilaster between two shops what a wall
carries (a conduit up it from a box, a caged lamp with its pool, a small
blade sign on a bracket), and each awning what holds cloth up: rafters
under it, a bar along its hem, stays back to the wall, a striped valance
hanging from the hem, and the cloth itself dark at the wall and bright only
at its lit edge.

Everything is read back from the plaza's own batches (the panes the kit
laid, wherever it laid them), so a shop moved or added is dressed the same.
Nothing stands more than 0.6 m off a wall under 2.6 m: the walkers' lines
and the walk camera's are 1.4 m out and more.
"""
from ncw.kit import *  # noqa: F401,F403
import ncw.kit as K
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403

G = 0.15
STEEL = (PL, "metal", 1)


def world(v):
    """A batch's vertex (Blender's axes) as world metres."""
    return (v[0], v[2], -v[1])


def chance(x, z, k=0.0):
    """A number from 0 to 1 that is a place's own."""
    n = math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453
    return n - math.floor(n)


class Wall:
    """A stretch of wall from p to q (x, z) seen from outside (p on the
    left): s metres along it, y up, w out from it."""

    def __init__(self, p, q):
        self.p = p
        self.length = math.hypot(q[0] - p[0], q[1] - p[1])
        self.tx, self.tz = (q[0] - p[0]) / self.length, (q[1] - p[1]) / self.length
        self.nx, self.nz = -self.tz, self.tx
        self.yaw = math.atan2(self.nx, self.nz)

    def at(self, s, w=0.0):
        return (self.p[0] + self.tx * s + self.nx * w, self.p[1] + self.tz * s + self.nz * w)

    def box(self, key, s0, s1, y0, y1, w0, w1, col=(1, 1, 1, 1), scale=0.5):
        (ax, az), (bx_, bz_) = self.at(s0, w0), self.at(s1, w1)
        box(key, min(ax, bx_), max(ax, bx_), y0, y1, min(az, bz_), max(az, bz_), scale=scale, col=col)

    def quad(self, key, s0, s1, y0, y1, w, col=(1, 1, 1, 1), uvs=None):
        (ax, az), (bx_, bz_) = self.at(s0, w), self.at(s1, w)
        quad(key, (ax, y0, az), (bx_, y0, bz_), (bx_, y1, bz_), (ax, y1, az), uvs or ((0, 0), (s1 - s0, 0), (s1 - s0, y1 - y0), (0, y1 - y0)), col)


# ---------------------------------------------------------------------------
# Awnings.
# ---------------------------------------------------------------------------
CANVAS = (1.0, 0.88, 0.62)


def dress_awnings():
    b = K.batches[(PL, "awning", 1)]
    seen = set()
    for face in list(b.faces):
        pts = [world(b.verts[i]) for i in face]
        ys = sorted(p[1] for p in pts)
        mid = (ys[0] + ys[-1]) / 2
        hi = [p for p in pts if p[1] > mid]
        lo = [p for p in pts if p[1] <= mid]
        if len(hi) != 2 or len(lo) != 2 or ys[-1] - ys[0] > 1.2:
            continue
        # The cloth: dark at the wall, its own dye at the hem (white cloth
        # is canvas, not a lamp).
        for i in face:
            c = b.cols[i]
            dye = CANVAS if min(c[:3]) > 0.8 else c[:3]
            k = 0.3 if world(b.verts[i])[1] > mid else 0.92
            b.cols[i] = (dye[0] * k, dye[1] * k, dye[2] * k, 1.0)
        key = tuple(sorted((round(p[0], 2), round(p[2], 2)) for p in pts))
        if key in seen:
            continue
        seen.add(key)
        # Ends matched along the hem: lo[j] hangs below hi[j].
        if math.hypot(hi[0][0] - lo[0][0], hi[0][2] - lo[0][2]) > math.hypot(hi[0][0] - lo[1][0], hi[0][2] - lo[1][2]):
            lo.reverse()
        length = math.hypot(lo[1][0] - lo[0][0], lo[1][2] - lo[0][2])
        if length < 0.8:
            continue
        dye = b.cols[face[0]][:3]
        dye = tuple(v / 0.3 if world(b.verts[face[0]])[1] > mid else v / 0.92 for v in dye)

        def along(t, a=lo[0], c=lo[1]):
            return (a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t)

        def wall_at(t):
            return along(t, hi[0], hi[1])

        # Rafters under the cloth, a bar along the hem, a stay at each end.
        n = max(1, int(round(length / 1.7)))
        for j in range(n + 1):
            t = min(0.985, max(0.015, j / n))
            w_, h_ = wall_at(t), along(t)
            pipe(STEEL, (w_[0], w_[1] - 0.04, w_[2]), (h_[0], h_[1] - 0.05, h_[2]), 0.022, segs=4)
        a_, c_ = along(0.0), along(1.0)
        pipe(STEEL, (a_[0], a_[1] - 0.06, a_[2]), (c_[0], c_[1] - 0.06, c_[2]), 0.028, segs=4)
        for t in (0.015, 0.985):
            w_, h_ = wall_at(t), along(t)
            pipe(STEEL, (w_[0], w_[1] - 1.05, w_[2]), (h_[0], h_[1] - 0.06, h_[2]), 0.018, segs=4)
        # The valance: a strip of the cloth hanging from the hem in stripes
        # (uv 0.2 across: the cloth's shader keeps a hem's glow for the
        # hem), seen from both sides.
        m = max(2, int(round(length / 0.7)))
        for j in range(m):
            p, q = along(j / m), along((j + 1) / m)
            k = 0.85 if j % 2 else 0.5
            col = (dye[0] * k, dye[1] * k, dye[2] * k, 1.0)
            drop = 0.3 if j % 2 else 0.26
            pts4 = ((p[0], p[1] - 0.08, p[2]), (q[0], q[1] - 0.08, q[2]), (q[0], q[1] - 0.08 - drop, q[2]), (p[0], p[1] - 0.08 - drop, p[2]))
            uv = ((0.2, 0.0),) * 4
            quad((PL, "awning", 1), *pts4, uvs=uv, col=col)
            quad((PL, "awning", 1), pts4[1], pts4[0], pts4[3], pts4[2], uvs=uv, col=col)


# ---------------------------------------------------------------------------
# Shop panes and the pilasters between them.
# ---------------------------------------------------------------------------
def door_leaf(wl, s, lamp="amber"):
    """A glass door in a steel frame, hung in front of the pane at s: two
    jambs and a head, dark glass, a kick plate, a push bar, a closer, and a
    lamp over it with its pool on the pavement."""
    wl.quad((PL, "glass_dark", 1), s - 0.46, s + 0.46, G + 0.04, 2.3, 0.1)
    for e in (s - 0.5, s + 0.5):
        wl.box(STEEL, e - 0.04, e + 0.04, G, 2.38, 0.0, 0.13)
    wl.box(STEEL, s - 0.54, s + 0.54, 2.3, 2.38, 0.0, 0.13)
    wl.box(STEEL, s - 0.46, s + 0.46, G + 0.04, G + 0.3, 0.1, 0.12)
    wl.box(STEEL, s - 0.4, s + 0.4, 1.02, 1.07, 0.12, 0.17)
    wl.box(STEEL, s + 0.1, s + 0.42, 2.2, 2.28, 0.12, 0.2)
    wl.box((PL, "glow", 1), s - 0.3, s + 0.3, 2.42, 2.5, 0.02, 0.1, col=dim(lamp, 0.9))
    lx, lz = wl.at(s, 1.0)
    light(PL, lx, 2.3, lz, lamp, 3.5)


def shutter(wl, s0, s1, drop):
    """A roller shutter part down over a pane: slats in two guides under
    its hood, a bottom rail with a lock."""
    wl.quad((PL, "door_panel", 1), s0 + 0.05, s1 - 0.05, drop, 3.3, 0.1)
    for e in (s0, s1):
        wl.box(STEEL, e - 0.05, e + 0.05, 0.55, 3.3, 0.02, 0.16)
    wl.box(STEEL, s0 - 0.05, s1 + 0.05, 3.22, 3.5, 0.0, 0.3)
    wl.box(STEEL, s0 + 0.05, s1 - 0.05, drop - 0.07, drop + 0.03, 0.08, 0.15)
    mid = (s0 + s1) / 2
    wl.box(STEEL, mid - 0.08, mid + 0.08, drop - 0.16, drop - 0.07, 0.09, 0.14)


def pane(wl, w, y0, y1):
    """One shop's pane, 0..w along wl at the glass."""
    cx, cz = wl.at(w / 2)
    h = chance(cx, cz)
    # Its frame: a sill, a head, mullions, a transom.
    wl.box(STEEL, 0.0, w, y0 - 0.02, y0 + 0.05, 0.0, 0.14)
    wl.box(STEEL, 0.0, w, y1 - 0.06, y1, 0.0, 0.1)
    n = max(1, int(round(w / 1.55)))
    shut = h < 0.16 and w < 7.0
    door = (not shut) and w >= 3.4 and 0.16 <= h < 0.62
    ds = w * (0.3 if chance(cx, cz, 1.0) < 0.5 else 0.7) if n > 2 else w / 2
    if shut:
        shutter(wl, 0.04, w - 0.04, y0 + 0.2 + 1.5 * chance(cx, cz, 2.0))
        return
    for j in range(1, n):
        s = w * j / n
        if door and abs(s - ds) < 0.75:
            continue
        wl.box(STEEL, s - 0.03, s + 0.03, y0 + 0.05, y1 - 0.06, 0.0, 0.09)
    wl.box(STEEL, 0.0, w, 2.56, 2.61, 0.0, 0.08)
    if door:
        door_leaf(wl, ds, "amber" if chance(cx, cz, 3.0) < 0.6 else "white")


def pilaster(wl, s, off):
    """What the pilaster at s carries, `off` out from the glass at its face."""
    px, pz = wl.at(s, off)
    h = chance(px, pz, 5.0)
    if h < 0.3:
        # A conduit up it from a box, bent in over the fascia.
        bx_, bz_ = wl.at(s - 0.08, off - 0.1)
        P.place("pipe_v", bx_, 1.5, bz_, wl.yaw, sy=2.6, district=PL)
        wl.box((PL, "trim", 1), s - 0.2, s + 0.04, 1.2, 1.56, off, off + 0.11, col=(0.11, 0.115, 0.125, 1.0))
        wl.box((PL, "glow", 1), s - 0.17, s - 0.13, 1.44, 1.48, off + 0.11, off + 0.12, col=GLOW["green" if h < 0.2 else "amber"])
    elif h < 0.52:
        # A caged lamp, and its pool.
        wl.box(STEEL, s - 0.09, s + 0.09, 2.62, 2.7, off, off + 0.2)
        wl.box((PL, "glow", 0), s - 0.07, s + 0.07, 2.46, 2.62, off + 0.04, off + 0.18, col=dim("amber" if h < 0.42 else "white", 0.95))
        for e in (-0.085, 0.085):
            wl.box(STEEL, s + e - 0.008, s + e + 0.008, 2.44, 2.62, off + 0.03, off + 0.19)
        lx, lz = wl.at(s, off + 0.9)
        light(PL, lx, 2.4, lz, "amber" if h < 0.42 else "white", 4.0)
    elif h < 0.66 and px > 61.0:
        # A small blade on a bracket, read along the pavement (none west of
        # x 60: a sign there is a streak down the hero's road).
        k = 0.62
        w_, h_ = ST_SIZES["bs"][0] * k, ST_SIZES["bs"][1] * k
        cx, cz = wl.at(s, off + 0.14 + w_ / 2)
        big_sign("bs", k, cx, 2.78 + h_ / 2, cz, wl.yaw + math.pi / 2)
        for yy in (2.95, 2.78 + h_ - 0.17):
            wl.box(STEEL, s - 0.02, s + 0.02, yy, yy + 0.04, off, off + 0.16)


def dress_shops():
    b = K.batches[(PL, "shop", 0)]
    for face in list(b.faces):
        if len(face) != 4:
            continue
        pts = [world(b.verts[i]) for i in face]
        y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
        if not (0.4 < y0 < 0.7 and 3.0 < y1 < 3.5):
            continue
        low = [p for p in pts if p[1] < (y0 + y1) / 2]
        if len(low) != 2:
            continue
        p, q = (low[0][0], low[0][2]), (low[1][0], low[1][2])
        if math.hypot(q[0] - p[0], q[1] - p[1]) < 1.6:
            continue
        wl = Wall(p, q)
        # (The outside is the side the quad faces: its foot runs left to
        # right seen from there.)
        (ax, ay, az), (bx_, by_, bz_), (cx, cy, cz) = pts[0], pts[1], pts[2]
        ux, uy, uz, vx, vy, vz = bx_ - ax, by_ - ay, bz_ - az, cx - ax, cy - ay, cz - az
        if (uy * vz - uz * vy) * wl.nx + (ux * vy - uy * vx) * wl.nz < 0:
            wl = Wall(q, p)
        pane(wl, wl.length, y0, y1)
        c = p[0] if abs(wl.nx) > 0.5 else p[1]
        frac = abs(c - round(c))
        if 0.2 < frac < 0.3:
            pilaster(wl, -0.2, 0.33)      # the building generator's: glass set back
        elif frac < 0.045:
            pilaster(wl, -0.2, 0.45)      # the avenue's kind: glass in the wall's plane


dress_awnings()
dress_shops()
