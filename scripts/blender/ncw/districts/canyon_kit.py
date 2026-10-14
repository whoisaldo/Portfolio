"""The canyon's own builders: what far.py puts its towers together from.

The canyon's blocks are towers, not the avenue's tenements: a podium of
shops and offices, a slab standing on the lot line to the height the hero's
roofline was matched to, and behind it a second mass that the hero's low
lens cannot see, taller (a stepped crown and a mast) or lower (a terrace).
Everything here takes the batch key of each piece, because the canyon is
split in two: "far" is in the core GLB (what the hero's lens sees from the
first frame: the street faces' windows, the shop glass, the signs that look
down the avenue) and "canyon_b" streams in with the canyon's pack (the rest).
"""
import math
import random

from ncw import kit as K
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P  # noqa: F401

FA = "far"
CB = "canyon_b"
G0 = B.G0


def fl(k):
    """The height of the k-th floor line over the shops."""
    return SHOP_H + CELL_H * k


# ---------------------------------------------------------------------------
# What a lens can and cannot see. The hero's is low on the avenue, so a mass
# set back from the street face hides behind the roofs nearer the lens; the
# Work shot's looks north over the board's block.
# ---------------------------------------------------------------------------
PLAZA_EYES = ((73.0, 13.0, -204.0), (72.1, 10.9, -195.1))
PLAZA_OCC = [((48.0, 0.0, -284.0), (108.0, 44.0, -264.0))]


def seen(eyes, occ, lo, hi, n=4):
    """Whether any eye sees any of a box's top over the masses in `occ`."""
    y = hi[1]
    for e in eyes:
        for i in range(n):
            x = lo[0] + (hi[0] - lo[0]) * i / (n - 1)
            for j in range(n):
                z = lo[2] + (hi[2] - lo[2]) * j / (n - 1)
                if not any(K._crosses(e, (x, y, z), mlo, mhi) for mlo, mhi in occ):
                    return True
    return False


def covers(occ, lo, hi):
    """Whether a box lies across a line from the hero's lens to anything it
    frames over the canyon (kit.HERO_KEEP) that the masses in `occ` do not
    already hide."""
    for e in HERO_EYES:
        for a, b in K.HERO_KEEP:
            for u in (0.0, 0.25, 0.5, 0.75, 1.0):
                for v in (0.0, 0.25, 0.5, 0.75, 1.0):
                    q = (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * v, a[2])
                    if K._crosses(e, q, lo, hi) and not any(K._crosses(e, q, mlo, mhi) for mlo, mhi in occ):
                        return True
    return False


def hidden(occ, lo, hi, plaza=False):
    """Whether a box stays out of the hero's lens (and the Work shot's)."""
    if seen(HERO_EYES, occ, lo, hi) or covers(occ, lo, hi):
        return False
    return not (plaza and seen(PLAZA_EYES, PLAZA_OCC, lo, hi))


def hidden_top(occ, x0, x1, z0, z1, y0, want, plaza=False, step=2.0, pad=1.0, least=4.0):
    """The highest top, `want` or lower, a box on this plan may rise to from
    y0 and stay unseen, or None."""
    y = want
    while y >= y0 + least:
        if hidden(occ, (x0 - pad, y0, z0 - pad), (x1 + pad, y + pad, z1 + pad), plaza):
            return y
        y -= step
    return None


# ---------------------------------------------------------------------------
# Walls, roofs, edges.
# ---------------------------------------------------------------------------
def wall(key, f, y0, y1, col, ov, s0=0.0, s1=None, out=0.0, mod=None):
    """Window cells over a face in the canyon's module: half the avenue's
    bay (1.6 m), and for the ribbon and curtain-wall styles two ribbons to
    a storey, so a tower's face counts as many small windows as the show's
    megablocks do and reads tall. Storeys stay on the floor lines. `out`:
    how far proud of the face's plane (a tier, a bay). `mod`: a building's
    own module (cells to a bay, and ribbons to a storey or None for its
    style's), so two neighbours' windows are never the same grid."""
    s1 = f.width if s1 is None else s1
    w = s1 - s0
    if w < 0.5 or y1 - y0 < 0.3:
        return
    kb, kr = mod or (2, None)
    kv = kr or (2 if round(col[1] * 8) in (2, 4, 5) else 1)
    bays = max(1, round(w / CELL_W)) * kb
    v0, v1 = (ov + (y0 - SHOP_H) / CELL_H) * kv, (ov + (y1 - SHOP_H) / CELL_H) * kv
    f.quad((key, "facade", 0), s0, s1, y0, y1, out, ((0, v0), (bays, v0), (bays, v1), (0, v1)), col)


def under(key, f, s0, s1, w0, w1, y, col=(1, 1, 1, 1)):
    """A level quad off a face, w0..w1 out from it, facing down: a soffit,
    a line of light in one."""
    a, b = f.at(s0), f.at(s1)
    quad(key, f.p(a, y, w0), f.p(b, y, w0), f.p(b, y, w1), f.p(a, y, w1), col=col)


def over(key, f, s0, s1, w0, w1, y, col=(1, 1, 1, 1)):
    """The same, facing up: a ledge's top, a step's roof."""
    a, b = f.at(s0), f.at(s1)
    quad(key, f.p(a, y, w1), f.p(b, y, w1), f.p(b, y, w0), f.p(a, y, w0), col=col)


def balcony(key, f, s0, s1, y, col, out=1.0, base=0.0):
    """A balcony at a floor line: a slab, a solid front and ends (`base`:
    the tier it stands on, proud of the face)."""
    out += base
    fbox((key, "trim", 1), f, s0, s1, y - 0.14, y, base, out, col)
    a, b = f.at(s0), f.at(s1)
    pa, pb, wa, wb = f.p(a, y, out), f.p(b, y, out), f.p(a, y, base), f.p(b, y, base)
    up = lambda q: (q[0], y + 1.0, q[2])  # noqa: E731
    quad((key, "trim", 1), pa, pb, up(pb), up(pa), col=col)
    quad((key, "trim", 1), wa, pa, up(pa), up(wa), col=col)
    quad((key, "trim", 1), pb, wb, up(wb), up(pb), col=col)


def brace(key, f, s0, s1, y0, y1, col, wd=0.22, out=0.12):
    """A cross of bracing over a stretch of wall, seen from outside."""
    for sa, sb in ((s0, s1), (s1, s0)):
        a, b = f.p(f.at(sa), y0, out), f.p(f.at(sb), y1, out)
        if sa < sb:
            quad((key, "trim", 1), (a[0], a[1] - wd, a[2]), (b[0], b[1] - wd, b[2]), (b[0], b[1] + wd, b[2]), (a[0], a[1] + wd, a[2]), col=col)
        else:
            quad((key, "trim", 1), (b[0], b[1] - wd, b[2]), (a[0], a[1] - wd, a[2]), (a[0], a[1] + wd, a[2]), (b[0], b[1] + wd, b[2]), col=col)


def roof(key, x0, x1, z0, z1, y, mat="roof"):
    quad((key, mat, 0), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0),
         ((0, 0), ((x1 - x0) / 4, 0), ((x1 - x0) / 4, (z1 - z0) / 4), (0, (z1 - z0) / 4)))


def parapet(key, f, y, col, h=0.95, t=0.3, s0=0.0, s1=None):
    f.box((key, "trim", 0), s0, f.width if s1 is None else s1, y, y + h, -t, 0.0, col=col)


def strip(key, f, s0, s1, y0, y1, hue, out=0.06):
    """A line of light on a face: one quad, a hair proud of it."""
    f.quad((key, "neon_" + hue, 0), s0, s1, y0, y1, out)


def seam(key, f, s, y0, y1, hue, out=0.06):
    """A seam of light up a corner: a tube a storey long, a dark bracket
    between each and the next (one bar the height of a tower read as a
    blank sign)."""
    y = y0
    while y < y1 - 0.8:
        yb = min(y + CELL_H - 0.35, y1)
        f.quad((key, "neon_" + hue, 0), s - 0.09, s + 0.09, y, yb, out)
        f.box((key, "trim", 1), s - 0.16, s + 0.16, yb + 0.05, yb + 0.3, 0.0, out + 0.06, col=(0.05, 0.05, 0.06, 1))
        y += CELL_H


# ---------------------------------------------------------------------------
# The ground floor: buildings.shopfront with its glass keyed apart from its
# frame, so the lit glass is in the core and the joinery in the pack.
# ---------------------------------------------------------------------------
REC, PIL = B.REC, B.PIL
STEAM = {}      # how many steam sources of each kind the canyon has set


def steam(kind, x, y, z, most=99):
    """A source of steam at its mouth (src/world/steam.js reads the kind
    from the name: stall, lane, roof, drain, street), up to `most` of a
    kind. Says whether it was set."""
    n = STEAM.get(kind, 0)
    if n >= most:
        return False
    STEAM[kind] = n + 1
    empty(f"anchor_steam_{kind}_cy{n}", (x, y, z))
    return True


def stall_steam(px, pz, yaw, most=14):
    """Off the pot on a cy_stall's counter."""
    return steam("stall", px + 0.7 * math.cos(yaw) + 0.33 * math.sin(yaw), 1.32, pz - 0.7 * math.sin(yaw) + 0.33 * math.cos(yaw), most)

TRADES = ("glass", "counter", "glass", "machines", "cabinets", "glass", "counter", "glass", "hatch", "cabinets")
FRONTS = []     # every shop front built, in order: the next takes the next trade
WOOD = (0.13, 0.1, 0.09, 1)


def _board_no(f, cx, cy, cz, w, h):
    """Which advert the site deals a board flat on a face (materials.js:
    the 4 m cell of its corner in the face's own frame, seven, five and
    three apart), before its turn."""
    rx, rz = f.nz, -f.nx
    fx = cx * rx + cz * rz - w / 2
    fz = cx * f.nx + cz * f.nz
    return math.floor(fx / 4 + 0.412) * 7 + math.floor((cy - h / 2) / 4 + 0.412) * 5 + math.floor(fz / 4 + 0.412) * 3


# Spray paint: a piece of bubble letters with an outline, a highlight and
# drips, and tags in a stroke, on a shutter or a back wall (a black shutter
# with one poster on it filled a walker's eye).
SPRAY = ((0.9, 0.12, 0.45, 1), (0.08, 0.75, 0.85, 1), (0.95, 0.72, 0.08, 1), (0.48, 0.2, 0.9, 1), (0.2, 0.85, 0.4, 1),
         (0.95, 0.32, 0.08, 1), (0.85, 0.85, 0.82, 1), (0.05, 0.05, 0.06, 1))


def _blob(key, f, cs, cy, rw, rh, out, col, n=12):
    """An ellipse flat on a face, s cs, height cy, out from its plane."""
    pts = [f.p(f.at(cs + rw * math.cos(t)), cy + rh * math.sin(t), out) for t in (i * math.tau / n for i in range(n))]
    poly(key, pts, [(0.5 + 0.5 * math.cos(i * math.tau / n), 0.5 + 0.5 * math.sin(i * math.tau / n)) for i in range(n)], col)


def _stroke(key, f, pts, wd, out, col):
    """A line of spray through points (s, y) on a face."""
    for (sa, ya), (sb, yb) in zip(pts, pts[1:]):
        dl = math.hypot(sb - sa, yb - ya) or 1.0
        ns, ny = -(yb - ya) / dl * wd / 2, (sb - sa) / dl * wd / 2
        quad(key, f.p(f.at(sa - ns), ya - ny, out), f.p(f.at(sb - ns), yb - ny, out), f.p(f.at(sb + ns), yb + ny, out), f.p(f.at(sa + ns), ya + ny, out),
             col=col)


def graffiti(f, s0, s1, y0, y1, r, key=CB, out=0.0):
    """A piece across a stretch of a face (s0..s1, y0..y1) and a tag or two
    beside it, `out` from its plane."""
    k = (key, "trim", 1)
    w = s1 - s0
    if w < 1.2 or y1 - y0 < 0.4:
        return
    n = max(3, min(6, int(w / 0.45)))
    lw = min(0.5, w / (n * 0.82 + 0.3))
    lh = min(y1 - y0, lw * r.uniform(1.15, 1.45))
    fill, line = r.sample(SPRAY[:6], 2)
    line = r.choice((line, SPRAY[7], SPRAY[6]))
    s = s0 + (w - n * lw * 0.82) / 2 + lw * 0.41
    base = (y0 + y1) / 2
    for i in range(n):
        cy = base + 0.08 * math.sin(i * 1.7 + r.random())
        # (A letter, not a disc: a tall rounded body, some with a counter,
        # some with a bar or a notch cut in the outline's colour, a shadow
        # dropped behind it.)
        rw, rh = lw * r.uniform(0.34, 0.44), lh * r.uniform(0.44, 0.54)
        _blob(k, f, s + 0.05, cy - 0.05, rw + 0.06, rh + 0.06, out - 0.002, SPRAY[7], n=16)
        _blob(k, f, s, cy, rw + 0.045, rh + 0.045, out, line, n=16)
        _blob(k, f, s, cy, rw, rh, out + 0.004, fill, n=16)
        g = r.random()
        if g < 0.4:
            _blob(k, f, s, cy + rh * 0.1, rw * 0.32, rh * 0.28, out + 0.006, line, n=10)
        elif g < 0.7:
            f.quad(k, s - rw * 0.75, s + rw * 0.75, cy - 0.025, cy + 0.025, out + 0.006, col=line)
        else:
            f.quad(k, s - 0.025, s + 0.025, cy - rh * 0.8, cy + rh * 0.1, out + 0.006, col=line)
        _blob(k, f, s - rw * 0.45, cy + rh * 0.55, rw * 0.18, rh * 0.1, out + 0.008, SPRAY[6], n=8)
        if r.random() < 0.45:
            dw = r.uniform(0.025, 0.04)
            ds = s + r.uniform(-rw * 0.5, rw * 0.5)
            f.quad(k, ds - dw / 2, ds + dw / 2, max(0.05, cy - rh - r.uniform(0.08, 0.35)), cy - rh * 0.8, out + 0.002, col=fill)
        s += lw * 0.82
    if r.random() < 0.7:
        ts = r.uniform(s0, max(s0, s1 - 0.9))
        ty = min(y1 + 0.35, 2.6) if r.random() < 0.5 else max(0.3, y0 - 0.25)
        pts = [(ts + i * 0.13, ty + r.uniform(-0.1, 0.12)) for i in range(6)]
        _stroke(k, f, pts, 0.035, out + 0.002, r.choice(SPRAY))


def _front(trade, f, s0, s1, key):
    """A built shop front in a bay 0.9 m deep behind the wall's plane: its
    back wall, sides, ceiling with a lamp and floor, and its trade."""
    r = random.Random(9100 + len(FRONTS) * 7)
    d, top = 0.9, 3.3
    a, b = f.at(s0), f.at(s1)
    mid = (s0 + s1) / 2
    hue = {"counter": "amber", "machines": "white", "hatch": "amber", "cabinets": r.choice(("yellow", "cyan", "white"))}[trade]
    if trade == "hatch":
        # Shut for the night but for its hatch: a roller shutter on the lot
        # line, a lit window in it with a shelf and someone at it, a tube
        # sign over it.
        f.quad((key, "door_panel", 0), s0, s1, G0, top, -0.06)
        f.box((key, "metal", 1), s0, s1, top - 0.28, top, -0.06, 0.12)
        hs = s0 + (s1 - s0) * r.uniform(0.3, 0.7)
        f.quad((key, "glow", 0), hs - 0.55, hs + 0.55, 1.1, 2.0, -0.04, col=dim("amber", 0.4))
        f.box((key, "trim", 0), hs - 0.65, hs + 0.65, 1.0, 1.1, -0.06, 0.22, col=WOOD)
        for e in (hs - 0.62, hs + 0.55):
            f.box((key, "metal", 1), e, e + 0.07, 1.1, 2.07, -0.06, 0.03)
        f.box((key, "metal", 1), hs - 0.62, hs + 0.62, 2.0, 2.07, -0.06, 0.03)
        for i in range(3):
            f.quad((key, "trim", 1), hs - 0.4 + i * 0.3, hs - 0.2 + i * 0.3, 1.2, 1.5 + 0.1 * (i % 2), -0.03, col=(0.05, 0.04, 0.03, 1))
        f.box((key, "neon_" + r.choice(("cyan", "yellow", "green", "red")), 0), hs - 0.8, hs + 0.8, 2.45, 2.52, -0.06, 0.02)
        f.box((key, "hazard", 1), s0, s1, G0, G0 + 0.12, -0.06, -0.02)
        light(key, *f.p(f.at(hs), 1.6, 0.8), "amber", 3.0)
        x, _, z = f.p(f.at(hs + 0.1), 0.0, 0.62)
        stand(x, z, f.yaw + math.pi, r.choice(("idle", "phone")), G0)
        # Bills pasted on the shutter either side of the hatch, one over
        # another here and there, and stickers by its frame.
        # (The site deals a board its advert by the 4 m cell its corner is
        # in, so bills side by side showed one picture three times: each
        # bill here is put where no other on this shutter has its cell,
        # low or high, or left out.)
        pr = random.Random(9150 + len(FRONTS) * 3)
        used = set()
        for e0, e1 in ((s0 + 0.2, hs - 0.9), (hs + 0.9, s1 - 0.2)):
            sp = e0
            while sp + 0.6 < e1:
                pw, ph_ = pr.uniform(0.5, 0.75), pr.uniform(0.7, 1.0)
                py = pr.uniform(1.0, 2.6 - ph_ / 2)
                cz_ = -0.035 + pr.uniform(0.0, 0.01)
                col = (pr.randrange(8) / 8.0 + 0.01, pr.randrange(8) / 8.0 + 0.01, pr.random(), 1.0)
                for y_, h_ in ((py, ph_), (2.39 + 0.3, 0.6), (1.0 + 0.4, 0.8)):
                    cx, _, cz = f.p(f.at(sp + pw / 2), y_, cz_)
                    k_ = _board_no(f, cx, y_, cz, pw, h_) % 8
                    if k_ not in used:
                        used.add(k_)
                        rotated_quad((key, "billboard", 0), cx, y_, cz, pw, h_, f.yaw, col=col)
                        break
                sp += pw + pr.uniform(0.05, 0.6)
        for i in range(5):
            sx_, sy_ = hs + 0.7 + pr.uniform(-0.05, 0.12), 1.0 + pr.uniform(0.0, 1.0)
            f.quad((key, "trim", 1), sx_, sx_ + 0.09, sy_, sy_ + 0.07, -0.025, col=pr.choice(((0.6, 0.1, 0.12, 1), (0.9, 0.8, 0.1, 1), (0.1, 0.5, 0.6, 1), (0.8, 0.8, 0.8, 1))))
        # Under the bills, spray paint on the shutter either side of the
        # hatch (its own dice).
        gr = random.Random(9170 + len(FRONTS) * 5)
        for e0, e1 in ((s0 + 0.15, hs - 0.75), (hs + 0.75, s1 - 0.15)):
            if e1 - e0 > 1.2:
                graffiti(f, e0, e1, 0.95, 1.85, gr, key, out=-0.052)
        return
    f.quad((key, "glow", 0), s0, s1, G0, top, -d, col=dim(hue, 0.035))
    quad((key, "trim", 0), f.p(a, G0, 0.0), f.p(a, G0, -d), f.p(a, top, -d), f.p(a, top, 0.0), col=B.DARK_TRIM)
    quad((key, "trim", 0), f.p(b, G0, -d), f.p(b, G0, 0.0), f.p(b, top, 0.0), f.p(b, top, -d), col=B.DARK_TRIM)
    under((key, "trim", 0), f, s0, s1, -d, 0.0, top, B.DARK_TRIM)
    over((key, "trim", 0), f, s0, s1, -d, 0.0, G0 + 0.01, (0.05, 0.05, 0.055, 1))
    under((key, "glow", 0), f, mid - 0.7, mid + 0.7, -0.6, -0.4, top - 0.015, dim("white" if trade != "counter" else "amber", 0.8))
    light(key, *f.p(f.at(mid), 2.4, 0.7), hue, 4.0)
    if trade == "counter":
        # A counter on the lot line, bowls and a pot on it, a shelf of
        # bottles and a lit menu on the wall behind, lanterns over it, the
        # cook behind it, a stool or two on the pavement.
        f.box((key, "trim", 0), s0 + 0.25, s1 - 0.25, G0, 1.0, -0.4, 0.06, col=WOOD)
        f.box((key, "metal", 1), s0 + 0.2, s1 - 0.2, 1.0, 1.05, -0.45, 0.12)
        n = max(2, int((s1 - s0) / 0.7))
        for i in range(n):
            s = s0 + 0.5 + (s1 - s0 - 1.0) * i / max(1, n - 1)
            if i % 3 == 2:
                f.box((key, "trim", 1), s - 0.16, s + 0.16, 1.05, 1.3, -0.3, -0.02, col=(0.3, 0.2, 0.11, 1))
                if i == 2 and len(FRONTS) % 3 == 0:
                    steam("stall", *f.p(f.at(s), 1.32, -0.16), most=22)
            else:
                f.box((key, "trim", 1), s - 0.11, s + 0.11, 1.05, 1.12, -0.26, -0.04, col=(0.5, 0.48, 0.44, 1))
        f.box((key, "metal", 1), s0 + 0.3, s1 - 0.3, 1.7, 1.74, -d, -d + 0.2)
        for i in range(int((s1 - s0 - 0.8) / 0.22)):
            s = s0 + 0.45 + i * 0.22
            f.quad((key, "glow", 1), s - 0.035, s + 0.035, 1.74, 1.98, -d + 0.13, col=dim(("amber", "green", "yellow", "cyan", "amber", "white", "green", "red")[i % 8], 0.3))
        sw, sh = ST_SIZES["ps"]
        k = min(1.0, (s1 - s0 - 0.6) / sw)
        cx, cy, cz = f.p(f.at(mid), 2.65, -d + 0.03)
        sign(st_name("ps"), cx, cy, cz, sw * k, sh * k, f.yaw, district=key, label=False)
        for s in (s0 + 0.5, s1 - 0.5):
            x, _, z = f.p(f.at(s), 0.0, 0.1)
            P.place("lantern", x, 2.75, z, district=key)
        x, _, z = f.p(f.at(mid + r.uniform(-0.4, 0.4)), 0.0, -0.62)
        stand(x, z, f.yaw, "vendor", G0)
        for s in (mid - 0.7, mid + 0.6):
            if r.random() < 0.7:
                x, _, z = f.p(f.at(s), 0.0, 0.55)
                P.place("cy_stool", x, G0, z, district=key)
                if r.random() < 0.7:
                    stand(x, z, f.yaw + math.pi, "sit", G0 + 0.5)
    elif trade == "machines":
        # A wall of machines, each its own front, a line of light over
        # them; someone choosing.
        for i, s in enumerate((s0 + 0.75, s1 - 0.75)):
            x, _, z = f.p(f.at(s), 0.0, -0.46)
            P.place(("vending", "vending_warm")[(i + len(FRONTS)) % 2], x, G0, z, f.yaw, district=key)
        if s1 - s0 > 3.6:
            cx, cy, cz = f.p(f.at(mid), 1.5, -d + 0.05)
            B.billboard(key, cx, cy, cz, min(s1 - s0 - 3.0, 2.2), 2.0, f.yaw, r, frame=True, back=False, depth=0.04)
        f.box((key, "neon_cyan", 0), s0 + 0.2, s1 - 0.2, 2.75, 2.81, -d + 0.02, -d + 0.08)
        if r.random() < 0.6:
            x, _, z = f.p(f.at(mid + 0.4), 0.0, 0.7)
            stand(x, z, f.yaw + math.pi, r.choice(("idle", "phone")), G0)
    else:
        # A row of game cabinets: a dark case, a screen running its own
        # colour, a lit marquee, a panel of buttons; tubes bent on the wall
        # over them; someone playing.
        n = max(2, int((s1 - s0 - 0.2) / 0.95))
        for i in range(n):
            s = s0 + (s1 - s0) * (i + 0.5) / n
            c = ("cyan", "pink", "yellow", "green", "purple")[(i * 2 + len(FRONTS)) % 5]
            f.box((key, "trim", 0), s - 0.36, s + 0.36, G0, 1.85, -0.78, -0.12, col=(0.03, 0.032, 0.045, 1))
            f.quad((key, "glow", 0), s - 0.28, s + 0.28, 1.05, 1.55, -0.115, col=dim(c, 0.45))
            f.quad((key, "glow", 0), s - 0.3, s + 0.3, 1.62, 1.8, -0.115, col=dim("white", 0.5))
            f.box((key, "trim", 1), s - 0.34, s + 0.34, 0.86, 0.96, -0.12, 0.1, col=(0.08, 0.08, 0.1, 1))
        for y, c in ((2.35, "pink"), (2.6, "cyan")):
            f.box((key, "neon_" + c, 0), s0 + 0.3 + (0.5 if c == "cyan" else 0.0), s1 - 0.8, y, y + 0.05, -d + 0.02, -d + 0.07)
        x, _, z = f.p(f.at(s0 + (s1 - s0) * 0.5 / n + 0.02), 0.0, 0.45)
        stand(x, z, f.yaw + math.pi, "idle", G0)


def _window(f, s0, s1, key, colours):
    """What a shop's glass carries, seen along the pavement where the glass
    is a dark mirror (its own dice, by where it stands): its frame in
    lights of a metre or so, a transom, a neon in the window, a small lit
    board in its corner."""
    r = random.Random(int(abs(f.plane) * 31 + abs(f.at(s0)) * 7))
    w = s1 - s0
    n = max(1, round(w / 1.3))
    for i in range(1, n):
        e = s0 + w * i / n
        f.box((key, "trim", 1), e - 0.035, e + 0.035, 0.55, 3.28, -REC, -REC + 0.06, col=B.DARK_TRIM)
    ty = r.choice((2.45, 2.6))
    f.box((key, "trim", 1), s0, s1, ty - 0.03, ty + 0.03, -REC, -REC + 0.06, col=B.DARK_TRIM)
    m = "neon_" + r.choice(colours)
    cx, cy = s0 + w * r.uniform(0.3, 0.7), r.uniform(1.65, 1.95)
    kind = r.choice(("ring", "bars", "cup", "frame"))
    z0, z1 = -REC + 0.03, -REC + 0.07
    if kind == "ring":
        for i in range(10):
            a0, a1 = i * math.tau / 10, (i + 1) * math.tau / 10
            xa, ya, xb, yb = cx + 0.24 * math.cos(a0), cy + 0.24 * math.sin(a0), cx + 0.24 * math.cos(a1), cy + 0.24 * math.sin(a1)
            f.box((key, m, 0), min(xa, xb) - 0.02, max(xa, xb) + 0.02, min(ya, yb) - 0.02, max(ya, yb) + 0.02, z0, z1)
    elif kind == "bars":
        for k in range(3):
            f.box((key, m, 0), cx - 0.45 + k * 0.32, cx - 0.21 + k * 0.32, cy - 0.12 + 0.08 * (k % 2), cy - 0.08 + 0.08 * (k % 2), z0, z1)
        f.box((key, m, 0), cx - 0.45, cx + 0.43, cy + 0.12, cy + 0.16, z0, z1)
    elif kind == "cup":
        f.box((key, m, 0), cx - 0.22, cx - 0.18, cy - 0.2, cy + 0.2, z0, z1)
        f.box((key, m, 0), cx + 0.18, cx + 0.22, cy - 0.2, cy + 0.2, z0, z1)
        f.box((key, m, 0), cx - 0.22, cx + 0.22, cy - 0.24, cy - 0.2, z0, z1)
        f.box((key, m, 0), cx + 0.22, cx + 0.36, cy - 0.02, cy + 0.02, z0, z1)
    else:
        for x0, x1, y0, y1 in ((-0.4, 0.4, -0.18, -0.15), (-0.4, 0.4, 0.15, 0.18), (-0.4, -0.37, -0.18, 0.18), (0.37, 0.4, -0.18, 0.18)):
            f.box((key, m, 0), cx + x0, cx + x1, cy + y0, cy + y1, z0, z1)
    if w > 1.6:
        bs = s0 + 0.45 if cx > s0 + w / 2 else s1 - 0.45
        px, py, pz = f.p(f.at(bs), 1.15, -REC + 0.045)
        sign(own_name("bx"), px, py, pz, 0.55, 0.55, f.yaw, district=key, label=False)


def shopfront(f, r, s0, s1, tint, glass=FA, key=CB, sign_rate=0.6, awning_rate=0.5, door=True, palette=None):
    w = s1 - s0
    if w < 2.4:
        f.quad((key, "trim", 0), s0, s1, 0.0, SHOP_H, 0.0, col=B.DARK_TRIM)
        return
    tcol = B.TRIM[tint]
    bays = max(1, round(w / CELL_W))
    bw = w / bays
    door_bay = r.randrange(1, bays - 1) if door and bays >= 3 else -1
    shops, i = [], 0
    while i < bays:
        if i == door_bay:
            shops.append(("door", i, i + 1))
            i += 1
            continue
        n = min(r.choice((1, 2, 2, 3, 3, 4)), bays - i)
        if door_bay > i and i + n > door_bay:
            n = door_bay - i
        shops.append(("shop", i, i + n))
        i += n
    colours = palette or ["amber", "cyan", "red", "amber", "yellow", "teal", "pink"]
    doors = []
    for kind, b0, b1 in shops:
        a, b = s0 + b0 * bw, s0 + b1 * bw
        for e in (a, b):
            f.box((key, "trim", 0), e - 0.2, e + 0.2, 0.0, SHOP_H, -REC - 0.02, PIL, col=tcol)
        if kind == "door":
            # The door to the floors above, set back in its lobby, a lamp over it.
            f.quad((key, "door", 0), a + 0.55, b - 0.55, G0, 2.45, -0.9)
            f.quad((key, "trim", 0), a + 0.2, b - 0.2, 2.45, SHOP_H, 0.0, col=B.DARK_TRIM)
            # Its lobby is a room, not a hole: a back wall round the door,
            # a wall each side, a ceiling, the lamp's pool on its floor.
            f.quad((key, "concrete", 0), a + 0.2, b - 0.2, G0, 2.45, -0.91)
            for sa in (a + 0.2, b - 0.2):
                p0, p1 = f.p(f.at(sa), G0, 0.0), f.p(f.at(sa), G0, -0.91)
                q = (p0, p1, (p1[0], 2.45, p1[2]), (p0[0], 2.45, p0[2]))
                uv = ((0, 0), (0.45, 0), (0.45, 1.15), (0, 1.15))
                quad((key, "concrete", 0), *q, uvs=uv)
                quad((key, "concrete", 0), q[1], q[0], q[3], q[2], uvs=(uv[1], uv[0], uv[3], uv[2]))
            fbox((key, "trim", 0), f, a + 0.2, b - 0.2, 2.44, 2.46, -0.91, 0.0, col=B.DARK_TRIM)
            mid = (a + b) / 2
            f.box((key, "glow", 0), mid - 0.15, mid + 0.15, 2.38, 2.44, -0.6, -0.4, col=GLOW["white"])
            light(key, *f.p(f.at(mid), 2.2, 0.3), "amber", 3.5)
            doors.append(mid)
            continue
        lit = (r.uniform(0.4, 1.0), r.random(), 1.0 if r.random() < 0.93 else 0.0, 1.0)
        # Every other front is glass with the site's room behind it; the
        # ones between are built: a counter that serves the pavement, a
        # wall of machines, a row of cabinets. No two neighbours alike.
        trade = TRADES[len(FRONTS) % len(TRADES)]
        FRONTS.append(trade)
        if trade != "glass" and b - a >= 2.6:
            _front(trade, f, a + 0.2, b - 0.2, key)
            f.quad((key, "trim", 0), a + 0.2, b - 0.2, 3.3, SHOP_H, 0.0, col=B.DARK_TRIM)
        else:
            f.quad((glass, "shop", 0), a + 0.2, b - 0.2, 0.55, 3.3, -REC, col=lit)
            f.quad((key, "trim", 0), a + 0.2, b - 0.2, G0, 0.55, -REC + 0.01, col=B.DARK_TRIM)
            f.quad((key, "trim", 0), a + 0.2, b - 0.2, 3.3, SHOP_H, 0.0, col=B.DARK_TRIM)
            f.box((key, "trim", 0), a + 0.2, b - 0.2, 3.28, 3.3, -REC, 0.0, col=B.DARK_TRIM)
            _window(f, a + 0.2, b - 0.2, key, colours)
        colour = r.choice(colours)
        if r.random() < awning_rate:
            B.awning(key, f, a + 0.25, b - 0.25, colour)
        if r.random() < sign_rate and b - a > 2.2:
            size = "pm" if b - a > 4.0 else "ps"
            sw, sh = ST_SIZES[size]
            cx, cy, cz = f.p(f.at((a + b) / 2), 3.95, 0.06)
            f.box((key, "board_frame", 0), (a + b) / 2 - sw / 2 - 0.06, (a + b) / 2 + sw / 2 + 0.06, 3.95 - sh / 2 - 0.06, 3.95 + sh / 2 + 0.06, 0.0, 0.05)
            sign(st_name(size), cx, cy, cz, sw, sh, f.yaw, district=key, label=False)
        else:
            f.box((key, "neon_" + colour, 0), a + 0.4, b - 0.4, 3.32, 3.4, 0.0, 0.05)
    return doors


# ---------------------------------------------------------------------------
# Signs. A blade stands edge on to its wall and is read along the street; the
# canyon hangs them at angles, stacks small boards in columns and cants its
# screens toward the traffic.
# ---------------------------------------------------------------------------
def _along(f):
    """The direction a blade on this face is read from: south on a wall
    along the avenue (the hero looks north), east on a wall across it."""
    return (0.0, 1.0) if f.nx != 0 else (1.0, 0.0)


def blade(f, s, y, size, cant=0.0, front=CB, back=CB, key=CB, out=None, bracket=True, own=False):
    """A standard sign as a blade s metres along the face at height y, its
    front turned `cant` radians toward the street. `front` and `back` key
    its two painted faces. `own`: named in the canyon's own run."""
    w, h = ST_SIZES[size]
    out = (0.35 + w / 2) if out is None else out
    cx, _, cz = f.p(f.at(s), y, out)
    dx, dz = _along(f)
    dx, dz = dx * math.cos(cant) + f.nx * math.sin(cant), dz * math.cos(cant) + f.nz * math.sin(cant)
    yaw = math.atan2(dx, dz)
    oriented_box((key, "board_frame", 0), cx, y, cz, w + 0.12, h + 0.14, 0.16, yaw, scale=1.0)
    sid = own_name(size) if own else st_name(size)
    sign(sid, cx + dx * 0.09, y, cz + dz * 0.09, w, h, yaw, district=front, label=False)
    sign(sid + "_b", cx - dx * 0.09, y, cz - dz * 0.09, w, h, yaw + math.pi, district=back, label=False)
    if bracket:
        f.box((key, "metal", 1), s - 0.04, s + 0.04, y + h / 2 + 0.07, y + h / 2 + 0.14, 0.0, out)


def stack(f, s, y, n, r, cant=0.0, front=CB, back=CB, key=CB, out=0.95, own=False):
    """A column of small boards one over another on a post off the wall, the
    show's stack of red and orange boards (ARL_JWwKdDs@21)."""
    yy = y
    for _ in range(n):
        size = r.choice(("ps", "ps", "bx", "pm"))
        h = ST_SIZES[size][1]
        blade(f, s, yy + h / 2, size, cant, front, back, key, out=out + (ST_SIZES[size][0] - 1.2) / 2, bracket=False, own=own)
        yy += h + 0.22
    f.box((key, "metal", 1), s - 0.06, s + 0.06, y - 0.5, yy, 0.0, 0.14)
    for yb in (y - 0.3, yy - 0.2):
        f.box((key, "metal", 1), s - 0.04, s + 0.04, yb, yb + 0.08, 0.0, out)


OWN_COUNT = {}


def own_name(size):
    """A standard sign's name in a run of its own (st_pm_9000 on): the
    site deals its design by its place as any other, and the builder's
    turns that the signs built after it take are left as they were."""
    n = OWN_COUNT.get(size, 0)
    OWN_COUNT[size] = n + 1
    return f"st_{size}_{9000 + n}"


def board(f, s, y, size, r, key=CB):
    """A standard sign flat on the wall."""
    w, h = ST_SIZES[size]
    out = r.uniform(0.12, 0.4)
    f.box((key, "board_frame", 0), s - w / 2 - 0.07, s + w / 2 + 0.07, y - h / 2 - 0.07, y + h / 2 + 0.07, 0.0, out)
    cx, cy, cz = f.p(f.at(s), y, out + 0.015)
    sign(st_name(size), cx, cy, cz, w, h, f.yaw, district=key, label=False)


def screen(f, s, y, w, h, r, cant, key=CB, toward=1.0, back=True, off=0.0):
    """A screen (an advert with no words, the site draws it) hung off the
    face on struts and turned `cant` radians from flat on the wall toward
    looking along the street (`toward` +1: south or east). `off`: what it
    hangs on stands this far proud of the face."""
    dx, dz = _along(f)
    dx, dz = dx * toward, dz * toward
    nx, nz = f.nx * math.cos(cant) + dx * math.sin(cant), f.nz * math.cos(cant) + dz * math.sin(cant)
    out = 0.55 + (w / 2) * abs(math.sin(cant)) + off
    cx, _, cz = f.p(f.at(s), y, out)
    yaw = math.atan2(nx, nz)
    B.billboard(key, cx, y, cz, w, h, yaw, r, frame=True, back=back, depth=0.3)
    for dy in (-h / 3, h / 3):
        f.box((key, "metal", 1), s - 0.08, s + 0.08, y + dy - 0.08, y + dy + 0.08, 0.0, out)


# The canyon's columns of type take their words from the site in turn
# (src/data/world.js, CANYON_WORDS): how many letters each has, and its hue.
TALL_UNITS = (3, 3, 2, 2, 2, 2, 3)
TALL_HUES = ("pink", "amber", "cyan", "green", "purple", "magenta", "blue")


def tall(sid, n, x, y0, h, z, wall_x, w=2.2, key=FA, back=CB, preview="夜"):
    """One of the canyon's columns of type (the n-th: the site sets its
    word), read from the south and the north. The word is two or three
    letters, so its board is only as tall as they are, at the column's
    middle where the hero has always had them; the rest of the column is an
    open frame: two rails lit down their edges, rungs between them,
    brackets to the wall."""
    hue = TALL_HUES[n % len(TALL_HUES)]
    hf = min(h, w * (0.95 * TALL_UNITS[n % len(TALL_UNITS)] + 0.4))
    yc = y0 + h / 2
    sign(sid, x, yc, z, w, hf, 0.0, preview=preview, district=key)
    box((back, "board_frame", 0), x - w / 2 - 0.08, x + w / 2 + 0.08, yc - hf / 2 - 0.08, yc + hf / 2 + 0.08, z - 0.25, z - 0.05, scale=1.0, bottom=True)
    sign(sid + "_b", x, yc, z - 0.3, w, hf, math.pi, district=back, label=False)
    edge = dim(hue, 0.5)
    for rx in (x - w / 2 - 0.13, x + w / 2 + 0.13):
        box((back, "board_frame", 0), rx - 0.07, rx + 0.07, y0, y0 + h, z - 0.22, z - 0.08, scale=1.0, bottom=True)
        quad((key, "glow", 0), (rx - 0.03, y0, z - 0.075), (rx + 0.03, y0, z - 0.075), (rx + 0.03, y0 + h, z - 0.075), (rx - 0.03, y0 + h, z - 0.075), col=edge)
        quad((back, "glow", 0), (rx + 0.03, y0, z - 0.225), (rx - 0.03, y0, z - 0.225), (rx - 0.03, y0 + h, z - 0.225), (rx + 0.03, y0 + h, z - 0.225), col=edge)
    y = y0
    while y <= y0 + h + 0.01:
        if not (yc - hf / 2 - 0.3 < y < yc + hf / 2 + 0.3):
            box((back, "metal", 1), x - w / 2 - 0.1, x + w / 2 + 0.1, y - 0.04, y + 0.04, z - 0.19, z - 0.11, scale=0.5, bottom=True)
        y += h / max(2, round(h / 2.4))
    # Over and under its word the column is full: light boxes one on
    # another to both its ends, one dark here and there (an open frame with
    # a sign only at its middle read as a sign that had lost its face).
    pr = random.Random(8800 + n * 13)
    for ya, yb in ((y0 + 0.15, yc - hf / 2 - 0.2), (yc + hf / 2 + 0.2, y0 + h - 0.15)):
        m = int((yb - ya) / (w + 0.12))
        for i in range(m):
            py = ya + (yb - ya) * (i + 0.5) / m
            ph_ = min(w, (yb - ya) / m - 0.12)
            if pr.random() < 0.12:
                box((back, "board_frame", 0), x - w / 2, x + w / 2, py - ph_ / 2, py + ph_ / 2, z - 0.2, z - 0.1, scale=1.0, bottom=True)
                continue
            # (In the pack, both faces: the core carries the word alone.)
            sid_ = st_name("bx")
            sign(sid_, x, py, z - 0.02, w, ph_, 0.0, district=back, label=False)
            sign(sid_ + "_b", x, py, z - 0.28, w, ph_, math.pi, district=back, label=False)
    for yb in (y0 + 0.4, yc, y0 + h - 0.4):
        xa, xb = sorted((x + (w / 2 + 0.2) * (1 if wall_x > x else -1), wall_x))
        box((back, "metal", 1), xa, xb, yb - 0.05, yb + 0.05, z - 0.2, z - 0.1, scale=0.5, bottom=True)
    for yb in (y0 - 0.12, y0 + h):
        box((key, "neon_" + hue, 0), x - w / 2 - 0.2, x + w / 2 + 0.2, yb, yb + 0.12, z - 0.22, z - 0.08, scale=1.0, bottom=True)


def advert(face_key, frame_key, cx, cy, cz, w, h, yaw, r, depth=0.25):
    """A screen (the site draws its advert) in a thin dark frame, the face
    and the frame keyed apart."""
    col = (r.randrange(8) / 8.0 + 0.01, r.randrange(8) / 8.0 + 0.01, r.random(), 1.0)
    rotated_quad((face_key, "billboard", 0), cx, cy, cz, w, h, yaw, col=col)
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((frame_key, "board_frame", 0), cx - nx * (depth / 2 + 0.02), cy, cz - nz * (depth / 2 + 0.02), w + 0.3, h + 0.3, depth, yaw, scale=1.0)


def board_back(key, cx, cy, cz, w, h, yaw, hue, depth=0.25):
    """What a board shows from behind: two posts and a brace across them, a
    conduit, and a rim of dim light round its edge, so its back is a thing
    and not a black rectangle."""
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = -math.sin(yaw), -math.cos(yaw)       # out of its back
    d = depth + 0.06

    def at(u, v, t=0.0):
        return (cx + rx * u + nx * (d + t), cy + v, cz + rz * u + nz * (d + t))

    def bar(u0, v0, u1, v1, t, mat=(key, "metal", 1), col=(1, 1, 1, 1), wd=0.05):
        du, dv = u1 - u0, v1 - v0
        ln = math.hypot(du, dv) or 1.0
        pu, pv = -dv / ln * wd, du / ln * wd
        q = (at(u0 - pu, v0 - pv, t), at(u0 + pu, v0 + pv, t), at(u1 + pu, v1 + pv, t), at(u1 - pu, v1 - pv, t))
        quad(mat, q[1], q[0], q[3], q[2], col=col)
    for u in (-w * 0.3, w * 0.3):
        bar(u, -h / 2, u, h / 2, 0.03, wd=0.07)
    bar(-w * 0.3, -h / 2 + 0.2, w * 0.3, h / 2 - 0.2, 0.02)
    bar(-w / 2, -h * 0.2, w / 2, -h * 0.2, 0.04, wd=0.03)
    c = dim(hue, 0.35)
    for u0, v0, u1, v1 in ((-w / 2, h / 2 + 0.1, w / 2, h / 2 + 0.1), (-w / 2 - 0.1, -h / 2, -w / 2 - 0.1, h / 2), (w / 2 + 0.1, -h / 2, w / 2 + 0.1, h / 2)):
        bar(u0, v0, u1, v1, 0.0, (key, "glow", 0), c, 0.035)


def _free(taken, rect, pad=0.25):
    """Whether a rectangle on a wall (s0, s1, y0, y1) is clear of what hangs
    there already; it is noted as taken if so."""
    s0, s1, y0, y1 = rect
    for a0, a1, b0, b1 in taken:
        if s0 - pad < a1 and s1 + pad > a0 and y0 - pad < b1 and y1 + pad > b0:
            return False
    taken.append(rect)
    return True


def street_signs(f, r, s0, s1, y_lo, y_hi, n, hero=True, key=CB, taken=None):
    """What a canyon wall collects between its shops and its upper floors:
    blades at angles, columns of small boards, boards flat on the wall,
    none across another (`taken`: the rectangles of wall already hung). On
    a wall along the avenue the faces that look south are keyed to the core
    (`hero`)."""
    front = FA if hero and f.nx != 0 else key
    taken = [] if taken is None else taken
    for _ in range(n):
        for _try in range(5):
            roll = r.random()
            s = r.uniform(s0 + 1.0, s1 - 1.0)
            if roll < 0.2:
                k = r.randrange(3, 6)
                y = r.uniform(y_lo, max(y_lo + 0.5, y_hi - k * 1.3))
                if _free(taken, (s - 0.5, s + 0.5, y - 0.5, y + k * 1.45)):
                    stack(f, s, y, k, r, r.choice((0.0, 0.0, 0.3, -0.3)), front, key, key)
                    break
            elif roll < 0.72:
                size = r.choices(["bs", "bm", "bl", "bx"], weights=[2, 4, 4, 1])[0]
                h = ST_SIZES[size][1]
                y = r.uniform(y_lo + h / 2, max(y_lo + h / 2 + 0.2, y_hi - h / 2))
                if _free(taken, (s - 0.5, s + 0.5, y - h / 2, y + h / 2 + 0.2)):
                    blade(f, s, y, size, r.choice((0.0, 0.0, 0.0, 0.25, 0.4, -0.25, -0.4)), front, key, key)
                    break
            else:
                size = r.choices(["ps", "pm", "bx"], weights=[3, 4, 1])[0]
                w, h = ST_SIZES[size]
                if s1 - s0 <= w + 2.0:
                    break
                s = min(max(s, s0 + w / 2 + 0.5), s1 - w / 2 - 0.5)
                y = r.uniform(y_lo + h / 2, y_hi - h / 2)
                if _free(taken, (s - w / 2, s + w / 2, y - h / 2, y + h / 2)):
                    board(f, s, y, size, r, key)
                    break


def light_strip(f, s, y, sw, hh, hue, r, key=CB, out=0.45):
    """A tall strip of light on a wall (x4ztgjvfU60@22's cyan holo up a
    tower's face): a dark frame, the lit face, darker lines across it."""
    f.box((key, "board_frame", 0), s - sw / 2 - 0.12, s + sw / 2 + 0.12, y - 0.15, y + hh + 0.15, 0.1, out)
    f.quad((key, "glow", 0), s - sw / 2, s + sw / 2, y, y + hh, out + 0.01, col=dim(hue, 0.45 if hue == "white" else 0.8))
    yy = y + r.uniform(0.6, 1.4)
    while yy < y + hh - 0.4:
        f.quad((key, "glow", 0), s - sw / 2, s + sw / 2, yy, yy + 0.09, out + 0.015, col=dim(hue, 0.3))
        yy += r.choice((0.9, 1.3, 1.3, 2.2))


def street_mix(f, r, s0, s1, y_lo, y_hi, n, taken, front=FA, key=CB, shop=False):
    """What a wall deep in the canyon carries over its shops' belt, as the
    show's canyon does (x4ztgjvfU60@22, mH2wmyeiIpA@143), not a blade of
    type at every height: big lit boards of words flat on the wall, a tall
    strip of light, a row of small boxes side by side, a column of boards,
    now and then a blade; each its own size, fewer than a shop's belt, so
    the wall reads between them. The faces that look up the avenue are
    keyed `front`; what lies flat on the wall is edge on to the hero.
    `shop`: over the shops themselves, where blades of every size and rows
    of small boxes are the most of it."""
    cut = (0.18, 0.26, 0.5, 0.6) if shop else (0.32, 0.48, 0.64, 0.8)
    for _ in range(n):
        for _try in range(5):
            roll = r.random()
            if roll < cut[0]:
                k = r.choice((1.5, 1.9, 2.3))
                w, h = 2.8 * k, 1.2 * k
                if s1 - s0 < w + 1.5:
                    continue
                s = r.uniform(s0 + w / 2 + 0.5, s1 - w / 2 - 0.5)
                y = r.uniform(y_lo + h / 2, max(y_lo + h / 2 + 0.1, y_hi - h / 2))
                rect = (s - w / 2 - 0.2, s + w / 2 + 0.2, y - h / 2 - 0.2, y + h / 2 + 0.2)
                if _free(taken, rect):
                    out = r.uniform(0.15, 0.35)
                    f.box((key, "board_frame", 0), s - w / 2 - 0.1, s + w / 2 + 0.1, y - h / 2 - 0.1, y + h / 2 + 0.1, 0.0, out)
                    cx, cy, cz = f.p(f.at(s), y, out + 0.015)
                    sign(own_name("pm"), cx, cy, cz, w, h, f.yaw, district=key, label=False)
                    break
            elif roll < cut[1]:
                hh, sw = r.uniform(7.0, 14.0), r.choice((0.8, 1.1, 1.4))
                hh = min(hh, y_hi - y_lo)
                s = r.uniform(s0 + 1.0, s1 - 1.0)
                y = r.uniform(y_lo, max(y_lo + 0.1, y_hi - hh))
                rect = (s - sw / 2 - 0.3, s + sw / 2 + 0.3, y - 0.3, y + hh + 0.3)
                if _free(taken, rect):
                    light_strip(f, s, y, sw, hh, r.choice(("cyan", "cyan", "blue", "teal", "pink", "amber")), r, key)
                    break
            elif roll < cut[2]:
                sizes = [r.choice(("ps", "ps", "bx", "pm")) for _ in range(r.randint(2, 4))]
                ws = [ST_SIZES[z][0] for z in sizes]
                span = sum(ws) + 0.3 * (len(ws) - 1)
                if s1 - s0 < span + 1.0:
                    continue
                s = r.uniform(s0 + 0.5, s1 - 0.5 - span)
                y = r.uniform(y_lo + 0.8, max(y_lo + 0.9, y_hi - 0.8))
                rect = (s - 0.2, s + span + 0.2, y - 0.8, y + 0.8)
                if _free(taken, rect):
                    for z, wz in zip(sizes, ws):
                        hz = ST_SIZES[z][1]
                        f.box((key, "board_frame", 0), s - 0.06, s + wz + 0.06, y - hz / 2 - 0.06, y + hz / 2 + 0.06, 0.0, 0.2)
                        cx, cy, cz = f.p(f.at(s + wz / 2), y + r.uniform(-0.15, 0.15), 0.215)
                        sign(own_name(z), cx, cy, cz, wz, hz, f.yaw, district=key, label=False)
                        s += wz + 0.3
                    break
            elif roll < cut[3]:
                s = r.uniform(s0 + 1.0, s1 - 1.0)
                k = r.randrange(3, 5)
                y = r.uniform(y_lo, max(y_lo + 0.5, y_hi - k * 1.3))
                if _free(taken, (s - 0.5, s + 0.5, y - 0.5, y + k * 1.45)):
                    stack(f, s, y, k, r, r.choice((0.0, 0.3, -0.3)), front, key, key, own=True)
                    break
            else:
                s = r.uniform(s0 + 1.0, s1 - 1.0)
                size = r.choice(("pm", "bm", "bs", "pm", "bl") if shop else ("pm", "pm", "bl", "bm"))
                h = ST_SIZES[size][1]
                y = r.uniform(y_lo + h / 2, max(y_lo + h / 2 + 0.2, y_hi - h / 2))
                if _free(taken, (s - 0.5, s + 0.5, y - h / 2, y + h / 2 + 0.2)):
                    blade(f, s, y, size, r.choice((0.0, 0.25, -0.25)), front, key, key, own=True)
                    break


# ---------------------------------------------------------------------------
# The canyon's own props (props.py draws each once and instances it).
# ---------------------------------------------------------------------------
@P.proto("cy_mast", box=(0.5, 8.0, 0.5), reach=900)
def _cy_mast(k):
    """A lattice mast, sixteen metres, red lamps up it and at its tip
    (mH2wmyeiIpA@32, JtqIas3bYhg@72)."""
    for lx, lz in ((-0.45, -0.45), (0.45, -0.45), (0.45, 0.45), (-0.45, 0.45)):
        pipe(k("metal"), (lx, 0.0, lz), (lx * 0.2, 13.0, lz * 0.2), 0.045, segs=3)
    for y, w in ((3.2, 0.39), (6.5, 0.3), (9.8, 0.2)):
        box(k("metal"), -w, w, y, y + 0.07, -w, w, scale=0.5, bottom=True)
    cylinder(k("metal"), 0.0, 0.0, 13.0, 16.0, 0.04, segs=4, cap=False)
    for y, w in ((6.6, 0.1), (13.0, 0.12), (16.0, 0.14)):
        box(k("glow"), -w, w, y, y + 0.22, -w, w, scale=0.5, col=GLOW["red"], bottom=True)


@P.proto("cy_stall", box=(1.4, 1.2, 1.0), reach=200)
def _cy_stall(k):
    """A food stall: a counter with a lit front, a shelf behind it, a
    canopy on posts with a lit board along its edge, a pot on the counter.
    Its front toward +z; whoever serves stands at z -0.55."""
    wood = (0.13, 0.1, 0.09, 1)
    box(k("trim"), -1.3, 1.3, 0.0, 0.95, 0.05, 0.6, scale=1.0, col=wood)
    # Its front is the menu: a dim warm panel, a row of dishes pictured on
    # it, a price under each.
    c = GLOW["amber"]
    quad(k("glow"), (-1.2, 0.2, 0.605), (1.2, 0.2, 0.605), (1.2, 0.78, 0.605), (-1.2, 0.78, 0.605), col=(c[0] * 0.13, c[1] * 0.13, c[2] * 0.13, 1))
    for i, hue in enumerate(("red", "white", "green", "pink", "cyan")):
        x = -1.06 + i * 0.45
        g = GLOW[hue]
        quad(k("glow"), (x, 0.42, 0.612), (x + 0.33, 0.42, 0.612), (x + 0.33, 0.7, 0.612), (x, 0.7, 0.612), col=(g[0] * 0.6, g[1] * 0.6, g[2] * 0.6, 1))
        quad(k("glow"), (x + 0.04, 0.3, 0.612), (x + 0.26, 0.3, 0.612), (x + 0.26, 0.35, 0.612), (x + 0.04, 0.35, 0.612), col=GLOW["amber"])
    # On the counter: bowls, a steamer, bottles; on the shelf behind, two
    # rows of bottles; a red lantern under each corner of the canopy.
    for x in (-0.9, -0.5, -0.1):
        cylinder(k("trim"), x, 0.38, 1.0, 1.07, 0.11, segs=7, col=(0.5, 0.48, 0.44, 1))
    cylinder(k("trim"), 0.2, 0.2, 1.0, 1.26, 0.19, segs=8, col=(0.3, 0.2, 0.11, 1))
    for i in range(4):
        g = GLOW[("green", "amber", "green", "cyan")[i]]
        box(k("glow"), 1.0 + i * 0.09 - 0.025, 1.0 + i * 0.09 + 0.025, 1.0, 1.24, 0.12, 0.17, scale=0.5, col=(g[0] * 0.3, g[1] * 0.3, g[2] * 0.3, 1))
    for row in (1.25, 1.58):
        box(k("metal"), -1.2, 1.2, row - 0.03, row, -0.9, -0.72, scale=0.6, bottom=True)
        for i in range(8):
            g = GLOW[("amber", "green", "pink", "cyan", "amber", "white", "green", "red")[(i + int(row * 4)) % 8]]
            x = -1.05 + i * 0.3
            box(k("glow"), x - 0.035, x + 0.035, row, row + 0.22, -0.84, -0.78, scale=0.5, col=(g[0] * 0.3, g[1] * 0.3, g[2] * 0.3, 1))
    for x in (-1.15, 1.15):
        box(k("glow"), x - 0.09, x + 0.09, 2.02, 2.28, 0.6, 0.78, scale=0.5, col=GLOW["red"], bottom=True)
    box(k("metal"), -1.35, 1.35, 0.95, 1.0, 0.0, 0.68, scale=0.6)
    box(k("trim"), -1.3, 1.3, 0.0, 1.9, -1.05, -0.9, scale=1.0, col=wood)
    for x in (-1.3, 1.3):
        for z in (-1.0, 0.64):
            box(k("metal"), x - 0.03, x + 0.03, 0.0, 2.35, z - 0.03, z + 0.03, scale=0.5)
    box(k("trim"), -1.5, 1.5, 2.35, 2.42, -1.15, 0.95, scale=1.0, col=(0.32, 0.07, 0.09, 1), bottom=True)
    box(k("glow"), -1.3, 1.3, 2.0, 2.33, 0.9, 0.93, scale=0.5, col=GLOW["yellow"])
    box(k("glow"), -0.25, 0.25, 2.2, 2.26, -0.2, 0.3, scale=0.5, col=GLOW["white"], bottom=True)
    cylinder(k("metal"), 0.7, 0.33, 1.0, 1.3, 0.2, segs=8)


@P.proto("cy_stool", box=(0.2, 0.25, 0.2), reach=180)
def _cy_stool(k):
    cylinder(k("metal"), 0.0, 0.0, 0.0, 0.45, 0.04, segs=5, cap=False)
    cylinder(k("trim"), 0.0, 0.0, 0.45, 0.5, 0.18, segs=8, col=(0.38, 0.07, 0.08, 1))


@P.proto("cy_kiosk", box=(0.9, 1.2, 0.55), reach=200)
def _cy_kiosk(k):
    """A low kiosk on a corporate forecourt, its face a lit cyan panel
    (Fn9gKhU_2_Q@77)."""
    box(k("dark"), -0.9, 0.9, 0.0, 2.3, -0.5, 0.5, scale=1.0)
    c = GLOW["cyan"]
    quad(k("glow"), (-0.78, 0.9, 0.505), (0.78, 0.9, 0.505), (0.78, 2.0, 0.505), (-0.78, 2.0, 0.505), col=(c[0] * 0.07, c[1] * 0.07, c[2] * 0.07, 1))
    # What its screen shows, big enough to read across a court: a white
    # heading bar, a picture (a red disc on amber), lines of a notice, a
    # row of three keys, a code of squares in its corner.
    for x0, x1, y0, y1, col in ((-0.7, 0.7, 1.8, 1.94, GLOW["white"]), (-0.7, 0.05, 1.2, 1.72, dim("amber", 0.7)),
                                (0.15, 0.7, 1.62, 1.7, GLOW["cyan"]), (0.15, 0.62, 1.48, 1.55, GLOW["cyan"]), (0.15, 0.7, 1.34, 1.41, GLOW["cyan"]),
                                (0.15, 0.5, 1.2, 1.27, GLOW["cyan"]), (-0.7, -0.3, 0.96, 1.12, GLOW["amber"]), (-0.22, 0.18, 0.96, 1.12, GLOW["cyan"]),
                                (0.26, 0.66, 0.96, 1.12, dim("red", 0.9))):
        quad(k("glow"), (x0, y0, 0.512), (x1, y0, 0.512), (x1, y1, 0.512), (x0, y1, 0.512), col=col)
    for i in range(12):
        a0, a1 = i * math.tau / 12, (i + 1) * math.tau / 12
        quad(k("glow"), (-0.325, 1.46, 0.518), (-0.325 + 0.17 * math.cos(a0), 1.46 + 0.17 * math.sin(a0), 0.518),
             (-0.325 + 0.17 * math.cos(a1), 1.46 + 0.17 * math.sin(a1), 0.518), (-0.325, 1.46, 0.518), col=dim("red", 0.9))
    box(k("glow"), -0.92, 0.92, 2.3, 2.36, -0.52, 0.52, scale=0.5, col=GLOW["cyan"])


@P.proto("cy_duct", box=(0.35, 0.5, 0.35), reach=320, detail=True)
def _cy_duct(k):
    """A square duct up a wall, a metre of it (stretched by sy)."""
    box(k("metal"), -0.32, 0.32, 0.0, 1.0, 0.02, 0.6, scale=1.0)


@P.proto("cy_unit", box=(0.9, 0.8, 0.5), reach=340)
def _cy_unit(k):
    """A condenser: a cabinet, two fans on its top, a status lamp."""
    box(k("metal"), -0.9, 0.9, 0.0, 1.5, -0.45, 0.45, scale=0.8)
    for x in (-0.44, 0.44):
        cylinder(k("dark"), x, 0.0, 1.5, 1.55, 0.36, segs=10)
    box(k("glow"), 0.66, 0.76, 1.1, 1.2, 0.45, 0.46, scale=0.5, col=GLOW["green"])


@P.proto("cy_deck_lamp", box=(0.12, 2.4, 0.12), reach=420)
def _cy_deck_lamp(k):
    """A roof deck's lamp: a tall post, a long arm, a cyan head
    (D6ia1wjO7sg@220)."""
    cylinder(k("metal"), 0.0, 0.0, 0.0, 4.6, 0.06, segs=6)
    box(k("metal"), -0.04, 0.04, 4.5, 4.58, 0.0, 1.5, scale=0.5)
    box(k("glow"), -0.14, 0.14, 4.4, 4.5, 1.1, 1.55, scale=0.5, col=GLOW["cyan"], bottom=True)


# ---------------------------------------------------------------------------
# The places off the avenue: floors with a pattern, rails, furniture, light.
# ---------------------------------------------------------------------------
def dim(hue, k):
    """A hue of light at a fraction of a sign's strength (for the "glow"
    material, whose colour is its brightness)."""
    c = GLOW[hue]
    return (c[0] * k, c[1] * k, c[2] * k, 1.0)


def flat(key, x0, x1, z0, z1, y, col=(1, 1, 1, 1)):
    """A level quad, facing up."""
    quad(key, (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0), col=col)


def fbox(key, f, s0, s1, y0, y1, w0, w1, col=(1, 1, 1, 1)):
    """A box off a face with its underside (a canopy, a deck)."""
    a, b = f.at(s0), f.at(s1)
    pa, pb = f.p(a, y0, w0), f.p(b, y1, w1)
    box(key, min(pa[0], pb[0]), max(pa[0], pb[0]), y0, y1, min(pa[2], pb[2]), max(pa[2], pb[2]), scale=1.0, col=col, bottom=True)


def s_of(f, a):
    """How far along a face (from its left edge) the coordinate a lies."""
    return abs(a - f.left)


def ngon(key, c, R, t, n=6, rot=0.0, plane="x", col=(1, 1, 1, 1), both=True):
    """A ring of n sides (t thick; t >= R fills it) standing in the plane
    x = c[0] ("x") or z = c[2] ("z")."""
    def at(rad, a):
        if plane == "x":
            return (c[0], c[1] + rad * math.sin(a), c[2] + rad * math.cos(a))
        return (c[0] + rad * math.cos(a), c[1] + rad * math.sin(a), c[2])
    for i in range(n):
        a0, a1 = rot + i * math.tau / n, rot + (i + 1) * math.tau / n
        if t >= R:
            tri = (at(0.0, 0.0), at(R, a0), at(R, a1))
            poly(key, tri, ((0, 0), (1, 0), (1, 1)), col)
            if both:
                poly(key, (tri[0], tri[2], tri[1]), ((0, 0), (1, 1), (1, 0)), col)
            continue
        q = (at(R, a0), at(R, a1), at(R - t, a1), at(R - t, a0))
        quad(key, *q, col=col)
        if both:
            quad(key, q[1], q[0], q[3], q[2], col=col)


def tape(key, a, b, y=0.95, h=0.09, mat="hazard", col=(1, 1, 1, 1)):
    """Barrier tape (or a queue's belt, `mat` and `col`) from a to b ((x, z)
    each), read from both sides."""
    q = ((a[0], y, a[1]), (b[0], y, b[1]), (b[0], y + h, b[1]), (a[0], y + h, a[1]))
    ln = math.hypot(b[0] - a[0], b[1] - a[1])
    uv = ((0, 0), (ln * 2, 0), (ln * 2, 1), (0, 1))
    quad((key, mat, 1), *q, uvs=uv, col=col)
    quad((key, mat, 1), q[1], q[0], q[3], q[2], uvs=(uv[1], uv[0], uv[3], uv[2]), col=col)


@P.proto("cy_palm", box=(0.5, 6.5, 0.5), reach=700)
def _cy_palm(k):
    """A tall thin palm, thirteen metres, in a ring of light at its foot
    (Fn9gKhU_2_Q@77, YRL74JmhVgk@30: the forecourt's palms stand over its
    signs): a slender trunk with a slow lean, a small crown high up."""
    cylinder(k("trim"), 0.0, 0.0, 0.0, 0.5, 0.75, segs=10, col=(0.15, 0.155, 0.165, 1))
    for i in range(10):
        t0, t1 = i * math.tau / 10, (i + 1) * math.tau / 10
        quad(k("glow"), (0.77 * math.cos(t1), 0.32, 0.77 * math.sin(t1)), (0.77 * math.cos(t0), 0.32, 0.77 * math.sin(t0)),
             (0.77 * math.cos(t0), 0.38, 0.77 * math.sin(t0)), (0.77 * math.cos(t1), 0.38, 0.77 * math.sin(t1)), col=GLOW["amber"])
    bark = (0.2, 0.165, 0.135, P.BARK)
    trunk = ((0.0, 0.45, 0.0), (0.05, 2.5, 0.02), (0.2, 5.5, 0.06), (0.42, 8.6, 0.08), (0.6, 11.0, 0.06), (0.7, 12.6, 0.04))
    P.tube(k("plant"), trunk, (0.17, 0.13, 0.115, 0.105, 0.1, 0.095), segs=5, col=bark)
    top = (0.71, 12.75, 0.04)
    rng = random.Random(23)
    for n, pitch, bend, length, col, vee in ((6, (0.7, 1.1), (1.5, 1.9), (2.3, 2.7), (0.13, 0.33, 0.15), True),
                                             (5, (0.1, 0.4), (1.3, 1.6), (2.5, 2.9), (0.11, 0.29, 0.13), True),
                                             (4, (-0.4, -0.1), (0.9, 1.2), (2.0, 2.4), (0.2, 0.22, 0.09), False)):
        turn = rng.uniform(0.0, math.tau)
        for i in range(n):
            yaw = turn + (i + rng.uniform(-0.22, 0.22)) * math.tau / n
            P.frond(k("plant"), top, yaw, rng.uniform(*pitch), rng.uniform(*length), rng.uniform(*bend), 0.9, col, 3, vee)


def paving(key, x0, x1, z0, z1, y, hue="amber", pitch=4.0, lines="x", power=5.0, every=4.5):
    """A floor's pattern, laid a hair over its paving: dark joints in a grid
    and, along every other joint one way (`lines`: "x" or "z"), a line of
    light with pools of it on the floor (kit.light; power 0 for none)."""
    dark = (0.02, 0.021, 0.026, 1)
    nx, nz = max(1, round((x1 - x0) / pitch)), max(1, round((z1 - z0) / pitch))
    for i in range(1, nx):
        x = x0 + (x1 - x0) * i / nx
        if lines == "z" and i % 2 == 1:
            flat((key, "glow", 0), x - 0.05, x + 0.05, z0 + 0.3, z1 - 0.3, y + 0.02, dim(hue, 0.5))
            z = z0 + every / 2
            while power and z < z1:
                light(key, x, y + 1.0, z, hue, power)
                z += every
        else:
            flat((key, "trim", 1), x - 0.08, x + 0.08, z0, z1, y + 0.012, dark)
    for j in range(1, nz):
        z = z0 + (z1 - z0) * j / nz
        if lines == "x" and j % 2 == 1:
            flat((key, "glow", 0), x0 + 0.3, x1 - 0.3, z - 0.05, z + 0.05, y + 0.02, dim(hue, 0.5))
            x = x0 + every / 2
            while power and x < x1:
                light(key, x, y + 1.0, z, hue, power)
                x += every
        else:
            flat((key, "trim", 1), x0, x1, z - 0.08, z + 0.08, y + 0.012, dark)


def rail(key, f, y, hue=None, s0=0.0, s1=None, h=1.1):
    """A deck's edge along the top of the face f: a kerb, posts, a handrail
    and two rails under it (open: the deck looks out through it), and on
    the deck's side a line of light at the kerb's foot."""
    s1 = f.width if s1 is None else s1
    if s1 - s0 < 0.6:
        return
    f.box((key, "trim", 0), s0, s1, y, y + 0.2, -0.3, 0.0, col=B.DARK_TRIM)
    f.box((key, "metal", 0), s0, s1, y + h, y + h + 0.06, -0.2, -0.1)
    for yy in (y + 0.5, y + 0.8):
        fbox((key, "metal", 1), f, s0, s1, yy, yy + 0.03, -0.165, -0.135)
    n = max(1, round((s1 - s0) / 1.8))
    for i in range(n + 1):
        s = min(max(s0 + (s1 - s0) * i / n, s0 + 0.03), s1 - 0.03)
        f.box((key, "metal", 1), s - 0.03, s + 0.03, y + 0.2, y + h, -0.18, -0.12)
    if hue:
        a, b = f.at(s0), f.at(s1)
        quad((key, "neon_" + hue, 0), f.p(b, y + 0.06, -0.31), f.p(a, y + 0.06, -0.31), f.p(a, y + 0.13, -0.31), f.p(b, y + 0.13, -0.31))


def deck_front(key, f, s0, s1, y, r, tint):
    """A bar's front on a wall over a deck at y: lit glass between mullions
    over a dark riser, a door with its lamp, a canopy with a line of light
    along its edge, a board with its name. Returns the line's hue."""
    w = s1 - s0
    bays = max(2, round(w / 2.6))
    bw = w / bays
    door = r.randrange(bays)
    f.quad((key, "trim", 0), s0, s1, y, y + 3.5, 0.04, col=B.DARK_TRIM)
    for b in range(bays):
        a = s0 + b * bw
        if b == door:
            f.quad((key, "door", 0), a + 0.5, a + bw - 0.5, y, y + 2.3, 0.06)
            f.box((key, "glow", 0), a + bw / 2 - 0.2, a + bw / 2 + 0.2, y + 2.4, y + 2.48, 0.05, 0.2, col=dim("white", 0.7))
        else:
            f.quad((key, "shop", 0), a + 0.12, a + bw - 0.12, y + 0.55, y + 2.9, 0.06, col=(r.uniform(0.5, 1.0), r.random(), 1.0, 1.0))
        f.box((key, "trim", 0), a - 0.1, a + 0.1, y, y + 3.5, 0.0, 0.16, col=B.TRIM[tint])
    f.box((key, "trim", 0), s1 - 0.1, s1 + 0.1, y, y + 3.5, 0.0, 0.16, col=B.TRIM[tint])
    hue = r.choice(("yellow", "amber", "cyan", "white"))
    fbox((key, "trim", 0), f, s0 - 0.2, s1 + 0.2, y + 3.05, y + 3.2, 0.0, 1.8, col=B.TRIM[tint])
    f.box((key, "neon_" + hue, 0), s0, s1, y + 3.0, y + 3.05, 1.7, 1.78)
    sw, sh = ST_SIZES["pm"]
    mid = (s0 + s1) / 2
    f.box((key, "board_frame", 0), mid - sw / 2 - 0.07, mid + sw / 2 + 0.07, y + 4.3 - sh / 2 - 0.07, y + 4.3 + sh / 2 + 0.07, 0.0, 0.2)
    cx, cy, cz = f.p(f.at(mid), y + 4.3, 0.215)
    sign(st_name("pm"), cx, cy, cz, sw, sh, f.yaw, district=key, label=False)
    return hue


def totem(key, x, y, z, yaw, r, w=1.5, h=4.4):
    """An advert totem standing on a floor: a dark base with a line of
    light round it, a screen on both faces in a frame (the site draws the
    adverts), a pool of its light before each face."""
    oriented_box((key, "board_frame", 0), x, y + 0.3, z, w + 0.3, 0.6, 0.5, yaw, scale=1.0)
    oriented_box((key, "neon_cyan", 0), x, y + 0.63, z, w + 0.32, 0.05, 0.52, yaw, scale=1.0)
    B.billboard(key, x + math.sin(yaw) * 0.17, y + 0.75 + h / 2, z + math.cos(yaw) * 0.17, w, h, yaw, r, frame=True, back=True, depth=0.28)
    for sgn in (-1.5, 1.5):
        light(key, x + math.sin(yaw) * sgn, y + 1.5, z + math.cos(yaw) * sgn, r.choice(("cyan", "yellow", "amber", "white")), 5.0)


@P.proto("cy_bollard", box=(0.15, 0.55, 0.15), reach=260)
def _cy_bollard(k):
    """A bollard with a strip of light up each face (Fn9gKhU_2_Q@77)."""
    box(k("dark"), -0.13, 0.13, 0.0, 1.05, -0.13, 0.13, scale=0.5)
    for f in B.faces_of(-0.13, 0.13, -0.13, 0.13).values():
        f.quad(k("glow"), 0.09, 0.17, 0.12, 0.95, 0.006, col=GLOW["cyan"])


@P.proto("cy_block", box=(1.0, 0.45, 0.35), reach=300)
def _cy_block(k):
    """A concrete barricade block: a wide foot, a narrow top, a hazard band
    (YRL74JmhVgk@30)."""
    box(k("concrete"), -1.0, 1.0, 0.0, 0.3, -0.34, 0.34, scale=1.0)
    box(k("concrete"), -1.0, 1.0, 0.3, 0.9, -0.17, 0.17, scale=1.0)
    box(k("hazard"), -1.0, 1.0, 0.6, 0.72, -0.18, 0.18, scale=0.5)


@P.proto("cy_table", box=(0.9, 0.5, 0.9), reach=220)
def _cy_table(k):
    """A round table with a lamp on it and three stools (seats 0.85 m out,
    at 0.5, 2.59 and 4.69 radians, 0.5 m up)."""
    cylinder(k("metal"), 0.0, 0.0, 0.0, 0.72, 0.05, segs=5, cap=False)
    cylinder(k("trim"), 0.0, 0.0, 0.72, 0.76, 0.5, segs=10, col=(0.11, 0.1, 0.1, 1))
    box(k("glow"), -0.05, 0.05, 0.76, 0.92, -0.05, 0.05, scale=0.5, col=GLOW["amber"])
    for i in range(3):
        a = i * math.tau / 3 + 0.5
        sx, sz = 0.85 * math.cos(a), 0.85 * math.sin(a)
        cylinder(k("metal"), sx, sz, 0.0, 0.45, 0.035, segs=4, cap=False)
        cylinder(k("trim"), sx, sz, 0.45, 0.5, 0.17, segs=7, col=(0.38, 0.07, 0.08, 1))


@P.proto("cy_planter", box=(1.5, 0.6, 0.4), reach=300)
def _cy_planter(k):
    """A long planter: a concrete trough, a hedge, a line of light under
    its lip on both sides."""
    box(k("concrete"), -1.5, 1.5, 0.0, 0.55, -0.35, 0.35, scale=1.0)
    # (Clipped bushes, each its own height and green, dark: a single box of
    # one green took the lamps' light as a bright slab.)
    for x0, x1, top, g in ((-1.42, -0.62, 0.98, (0.012, 0.034, 0.02, 1)), (-0.66, 0.2, 1.12, (0.015, 0.042, 0.023, 1)), (0.16, 0.8, 0.94, (0.011, 0.03, 0.02, 1)),
                           (0.76, 1.42, 1.06, (0.014, 0.038, 0.025, 1))):
        box(k("trim"), x0, x1, 0.55, top, -0.28, 0.28, scale=1.0, col=g)
    fs = B.faces_of(-1.5, 1.5, -0.35, 0.35)
    for name in ("+z", "-z"):
        fs[name].quad(k("glow"), 0.1, 2.9, 0.38, 0.43, 0.006, col=GLOW["teal"])


@P.proto("cy_string", box=(3.0, 0.3, 0.1), reach=260, detail=True)
def _cy_string(k):
    """Six metres of string lights along x: a sagging wire, nine bulbs."""
    def at(u):
        return (-3.0 + 6.0 * u, -0.5 * math.sin(math.pi * u), 0.0)
    for i in range(6):
        p0, p1 = at(i / 6), at((i + 1) / 6)
        q = ((p0[0], p0[1] - 0.012, 0.0), (p1[0], p1[1] - 0.012, 0.0), (p1[0], p1[1] + 0.012, 0.0), (p0[0], p0[1] + 0.012, 0.0))
        quad(k("dark"), *q)
        quad(k("dark"), q[1], q[0], q[3], q[2])
    for i in range(9):
        x, y, _ = at((i + 0.5) / 9)
        box(k("glow"), x - 0.018, x + 0.018, y - 0.1, y - 0.02, -0.03, 0.03, scale=0.5,
            col=GLOW[("amber", "amber", "white", "amber", "cyan")[i % 5]], bottom=True)


@P.proto("cy_gate", box=(0.15, 0.55, 0.6), reach=220)
def _cy_gate(k):
    """A turnstile's post: a steel cabinet, a green lamp on the way in and
    a red on the way out."""
    box(k("metal"), -0.12, 0.12, 0.0, 1.0, -0.6, 0.6, scale=0.6)
    box(k("glow"), -0.125, 0.125, 0.86, 0.94, 0.38, 0.56, scale=0.5, col=GLOW["green"])
    box(k("glow"), -0.125, 0.125, 0.86, 0.94, -0.56, -0.38, scale=0.5, col=GLOW["red"])


# ---------------------------------------------------------------------------
# Things slung between two walls.
# ---------------------------------------------------------------------------
def cable(key, a, b, sag, t=0.03, steps=10):
    """A cable from a to b, hanging `sag` at its middle, seen from both sides."""
    for i in range(steps):
        t0, t1 = i / steps, (i + 1) / steps
        p0 = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0 - sag * math.sin(math.pi * t0), a[2] + (b[2] - a[2]) * t0)
        p1 = (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1 - sag * math.sin(math.pi * t1), a[2] + (b[2] - a[2]) * t1)
        q = ((p0[0], p0[1] - t, p0[2]), (p1[0], p1[1] - t, p1[2]), (p1[0], p1[1] + t, p1[2]), (p0[0], p0[1] + t, p0[2]))
        quad((key, "dark", 1), *q)
        quad((key, "dark", 1), q[1], q[0], q[3], q[2])


def tube(key, a, b, hue, r=0.05):
    """A light tube from a to b (level), on two hangers."""
    box((key, "neon_" + hue, 0), min(a[0], b[0]) - (r if a[0] == b[0] else 0), max(a[0], b[0]) + (r if a[0] == b[0] else 0),
        a[1] - r, a[1] + r, min(a[2], b[2]) - (r if a[2] == b[2] else 0), max(a[2], b[2]) + (r if a[2] == b[2] else 0), scale=1.0, bottom=True)


LANE_STUFF = ("bin", "crates", "bags", "pallets", "dumpster", "barrel", "cy_unit", "rubbish")
DOORS = []      # (x, z) before every lane door (canyon_lane.door): nothing is left out across one


def lane(key, x0, x1, z0, z1, r, along="z", tubes=True, people=True, name=None):
    """What a lane between two walls holds, close set so its width is full:
    overhead, by turns, a light tube with its pools on the ground (green,
    cyan, pink: the show's back passages are lit by them, Fn9gKhU_2_Q@1),
    a cable or two, a pipe across on hangers with a valve's lamp; along
    both edges bins, bags, crates, skips and condensers; a drain down its
    middle; a vent breathing steam; and the people a back lane has: a
    smoker by a door, someone squatting, two talking."""
    lo, hi = (z0, z1) if along == "z" else (x0, x1)
    wa, wb = (x0, x1) if along == "z" else (z0, z1)
    pt = (lambda v, w, y: (w, y, v)) if along == "z" else (lambda v, w, y: (v, y, w))
    off = 0.75 if wb - wa < 7.0 else 1.0
    # A gutter along the foot of one wall (not a strip down the middle,
    # which read as a road's marking), a grating in it every few metres.
    ga, gb = pt(lo + 0.3, wa + 0.12, 0.0), pt(hi - 0.3, wa + 0.34, 0.0)
    flat((key, "dark", 1), min(ga[0], gb[0]), max(ga[0], gb[0]), min(ga[2], gb[2]), max(ga[2], gb[2]), G0 + 0.012)
    v = lo + r.uniform(1.5, 3.5)
    n = 0
    while v < hi - 2.0:
        if n % 2 == 0 and tubes:
            hue = r.choice(("green", "cyan", "cyan", "white", "amber", "teal"))
            y = r.uniform(4.9, 6.0)
            tube(key, pt(v, wa + 0.3, y), pt(v, wb - 0.3, y), hue)
            for w in (wa + 1.2, (wa + wb) / 2, wb - 1.2):
                light(key, *pt(v, w, 1.0)[0:1], y, pt(v, w, 1.0)[2], hue, 4.5)
        elif n % 4 == 1:
            for _ in range(r.randrange(1, 3)):
                y = r.uniform(5.5, 11.0)
                cable(key, pt(v + r.uniform(-1.0, 1.0), wa, y), pt(v + r.uniform(-2.0, 2.0), wb, y + r.uniform(-1.0, 1.0)), r.uniform(0.3, 1.1))
        else:
            y = r.uniform(4.3, 5.4)
            pipe((key, "metal", 1), pt(v, wa, y), pt(v, wb, y), 0.07, segs=5)
            pipe((key, "metal", 1), pt(v + 0.25, wa, y + 0.2), pt(v + 0.25, wb, y + 0.2), 0.04, segs=4)
            cx, _, cz = pt(v, wa + (wb - wa) * r.uniform(0.3, 0.7), 0.0)
            box((key, "metal", 1), cx - 0.16, cx + 0.16, y - 0.2, y + 0.2, cz - 0.16, cz + 0.16, scale=0.5, bottom=True)
            hue = r.choice(("amber", "red", "green"))
            box((key, "glow", 0), cx - 0.05, cx + 0.05, y - 0.27, y - 0.2, cz - 0.05, cz + 0.05, scale=0.5, col=GLOW[hue], bottom=True)
            light(key, cx, y - 0.5, cz, hue, 3.0)
        # Along both edges: what gets left out the back.
        for w in (wa + off, wb - off):
            if r.random() < 0.62:
                px, _, pz = pt(v + r.uniform(0.3, 2.6), w, 0.0)
                what, turn = r.choice(LANE_STUFF), r.choice((0.0, math.pi / 2, math.pi, 0.3))
                if all(abs(px - dx) + abs(pz - dz) > 1.6 for dx, dz in DOORS):
                    P.place(what, px, G0, pz, turn, district=key)
        if people and r.random() < 0.4:
            side = r.random() < 0.5
            w2 = wa + 0.75 if side else wb - 0.75
            face = 1.0 if side else -1.0
            qx, _, qz = pt(v + r.uniform(-1.4, -0.4), w2, 0.0)
            yaw = (math.pi / 2 * face) if along == "z" else (0.0 if face > 0 else math.pi)
            pose = r.choice(("smoke", "lean", "squat", "phone", "talk"))
            stand(qx, qz, yaw, pose, G0)
            if pose == "talk":
                ox, _, oz = pt(0.0, 1.0 * face, 0.0)
                stand(qx + (ox if along == "z" else 0.0), qz + (0.0 if along == "z" else oz), yaw + math.pi, "talk", G0)
        v += r.uniform(3.6, 5.6)
        n += 1
    if name:
        sx, _, sz = pt((lo + hi) / 2 + r.uniform(-6.0, 6.0), (wa + wb) / 2, 0.0)
        box((key, "metal", 1), sx - 0.4, sx + 0.4, G0, G0 + 0.06, sz - 0.4, sz + 0.4, scale=0.5)
        empty("anchor_steam_drain_" + name, (sx, G0 + 0.08, sz))


def pipe_rack(key, x, z0, z1, r, y=3.3, post=1):
    """A rack of service pipes along a lane's edge on posts (`post`: which
    side of the pipes the posts stand, +1 east), a valve's lamp here and
    there with its pool on the ground."""
    for dx, dy, rad in ((-0.3, 0.0, 0.11), (0.0, 0.0, 0.08), (-0.14, 0.26, 0.06)):
        box((key, "metal", 0), x + dx - rad, x + dx + rad, y + dy, y + dy + 2 * rad, z0, z1, scale=1.0, bottom=True)
    z, n = z0 + 1.5, 0
    while z < z1 - 0.5:
        px = x + post * 0.3
        box((key, "metal", 1), px - 0.06, px + 0.06, G0, y, z - 0.06, z + 0.06, scale=0.5)
        box((key, "metal", 1), min(px, x - 0.45), max(px, x - 0.45), y - 0.08, y, z - 0.05, z + 0.05, scale=0.5, bottom=True)
        if n % 3 == 1:
            hue = r.choice(("amber", "red", "cyan"))
            box((key, "metal", 1), x - 0.16, x + 0.14, y - 0.12, y + 0.3, z + 1.0, z + 1.4, scale=0.5, bottom=True)
            box((key, "glow", 0), x - 0.2, x - 0.16, y + 0.02, y + 0.12, z + 1.14, z + 1.26, scale=0.5, col=GLOW[hue])
            light(key, x - 1.0, y - 0.5, z + 1.2, hue, 3.5)
        z += 5.6
        n += 1


# ---------------------------------------------------------------------------
# Beside a crossing (canyon_cross.megastructure), and between two towers.
# ---------------------------------------------------------------------------
def pylon(z, y_top, r, side, key=FA, back=CB):
    """A lattice mast against the wall beside a crossing, carrying a stack
    of adverts out over the pavement above head height, read up and down
    the street (ARL_JWwKdDs@21). Returns its box."""
    wx = side * (WALK - 0.45)
    for lx in (wx - 0.3, wx + 0.3):
        for lz in (z - 0.3, z + 0.3):
            box((back, "metal", 0), lx - 0.05, lx + 0.05, G0, y_top, lz - 0.05, lz + 0.05, scale=0.5)
    y = 3.0
    while y < y_top:
        box((back, "metal", 1), wx - 0.34, wx + 0.34, y, y + 0.06, z - 0.34, z + 0.34, scale=0.5, bottom=True)
        y += 3.0
    y, reach = 7.6, 0.0
    while y < y_top - 2.4:
        w, h = r.uniform(2.8, 3.7), min(r.uniform(2.2, 3.9), y_top - y - 0.2)
        cx = side * (WALK - 1.0 - w / 2)
        advert(key, back, cx, y + h / 2, z + 0.42, w, h, r.uniform(-0.1, 0.1), r)
        advert(back, back, cx, y + h / 2, z - 0.42, w, h, math.pi + r.uniform(-0.1, 0.1), r)
        box((back, "metal", 1), min(cx, wx), max(cx, wx), y + h / 2 - 0.06, y + h / 2 + 0.06, z - 0.06, z + 0.06, scale=0.5, bottom=True)
        reach = max(reach, w + 1.2)
        y += h + r.uniform(0.35, 0.9)
    box((key, "glow", 0), wx - 0.12, wx + 0.12, y_top, y_top + 0.3, z - 0.12, z + 0.12, scale=0.5, col=GLOW["red"])
    for dz in (-2.0, 2.0):
        light(back, side * (WALK - 2.0), 6.0, z + dz, r.choice(("white", "cyan", "amber")), 6.0)
    xa, xb = sorted((side * WALK, side * (WALK - reach)))
    return ((xa, G0, z - 0.8), (xb, y_top + 0.4, z + 0.8))


def pole_stack(x, z, y_top, r, key=FA, back=CB):
    """A free-standing pole at the kerb with a stack of adverts on it, each
    its own size and a little off the pole, read up and down the avenue
    (x4ztgjvfU60@22, mH2wmyeiIpA@143): their fronts look south (`key`),
    their backs north. Returns its box."""
    cylinder((back, "metal", 0), x, z, G0, y_top, 0.22, segs=8)
    cylinder((back, "metal", 0), x, z, G0, G0 + 1.1, 0.34, segs=8)
    y, side, lo, hi = 6.4, r.choice((-1, 1)), x, x
    while y < y_top - 2.0:
        w, h = r.choice((2.6, 3.2, 3.8, 4.6)), r.choice((1.6, 2.0, 2.6, 3.2))
        h = min(h, y_top - y - 0.3)
        if h < 1.2:
            break
        cx = x + side * r.uniform(0.2, 0.5) * (w / 2)
        advert(key, back, cx, y + h / 2, z + 0.2, w, h, r.uniform(-0.08, 0.08), r, depth=0.3)
        advert(back, back, cx, y + h / 2, z - 0.2, w, h, math.pi + r.uniform(-0.08, 0.08), r, depth=0.05)
        for yy in (y + 0.25, y + h - 0.35):
            box((back, "metal", 1), min(cx - w / 2 + 0.2, x), max(cx + w / 2 - 0.2, x), yy, yy + 0.1, z - 0.06, z + 0.06, scale=0.5, bottom=True)
        lo, hi = min(lo, cx - w / 2 - 0.2), max(hi, cx + w / 2 + 0.2)
        y += h + r.uniform(0.3, 0.8)
        side = -side
    box((key, "glow", 0), x - 0.12, x + 0.12, y_top, y_top + 0.3, z - 0.12, z + 0.12, scale=0.5, col=GLOW["red"])
    light(back, x, 5.0, z + 1.5, r.choice(("white", "cyan")), 5.0)
    B.COLLISION.append(("box", x - 0.4, x + 0.4, G0, y_top, z - 0.4, z + 0.4, "canyon"))
    return ((lo, G0, z - 0.5), (hi, y_top + 0.4, z + 0.5))


def link(side_x0, side_x1, z_lo, z_hi, y, r, key=CB):
    """A service bridge between two towers of one row, across the slot
    between them: a dark box, a row of small lit windows down each side
    over a line of light."""
    box((key, "board_frame", 0), side_x0, side_x1, y, y + 3.0, z_lo, z_hi, scale=2.0, bottom=True)
    hue = r.choice(("cyan", "amber", "yellow", "white"))
    lit = B.wall_col(0.95, 3, r.uniform(0.2, 0.9), B.TINTS["charcoal"])
    for x, nx in ((side_x0 - 0.02, -1), (side_x1 + 0.02, 1)):
        f = B.Face("+x" if nx > 0 else "-x", x, z_lo, z_hi)
        bays = max(2, round(f.width / 1.25))
        f.quad((key, "facade", 0), 0.15, f.width - 0.15, y + 0.9, y + 2.6, 0.0, ((0, 0), (bays, 0), (bays, 1), (0, 1)), lit)
        f.quad((key, "neon_" + hue, 0), 0.3, f.width - 0.3, y + 0.35, y + 0.47, 0.0)


# ---------------------------------------------------------------------------
# A service wall at street level: what a block shows a lane.
# ---------------------------------------------------------------------------
def service_wall(f, r, key=CB):
    """(Round 2's wall: canyon_lane.wall builds the lanes' walls now. far.py
    still runs this for its dice alone, so every lot's later draws, its
    terrace's height among them, fall as they did.)
    The ground floor of a back or an alley wall, nothing on it repeated
    and no stretch of it bare: rain-stained concrete over a dark plinth, a
    pair of conduits run along it, and under them back doors with a lamp
    each, a shutter for deliveries, switch boxes with their pilot lamps,
    louvred vents, meter cabinets piped up to the conduits, small signs,
    skips and crates; caged lamps over head height (their light pooled on
    the lane, kit.light)."""
    w = f.width
    f.quad((key, "concrete", 0), 0.0, w, 0.0, SHOP_H, 0.0, uvs=((0, 0), (w / 3.0, 0), (w / 3.0, SHOP_H / 3.0), (0, SHOP_H / 3.0)))
    f.box((key, "trim", 1), 0.0, w, 0.0, 0.5, 0.0, 0.07, col=(0.05, 0.05, 0.06, 1))
    for y in (3.3, 3.46):
        f.box((key, "metal", 1), 0.2, w - 0.2, y, y + 0.07, 0.0, 0.1)
    steel = (0.09, 0.1, 0.11, 1)
    f.box((key, "metal", 1), 0.3, w - 0.3, 0.62, 0.72, 0.07, 0.17)
    s = r.uniform(0.4, 1.4)
    while s < w - 1.4:
        pick = r.random()
        adv = 1.0
        if pick < 0.18:
            f.quad((key, "door", 0), s, s + 1.1, G0, 2.3, 0.03)
            f.box((key, "metal", 1), s - 0.08, s + 1.18, 2.3, 2.4, 0.0, 0.12)
            hue = r.choice(("amber", "amber", "cyan", "pink", "white"))
            if hue == "cyan":
                f.box((key, "neon_cyan", 0), s - 0.3, s + 1.4, 2.62, 2.7, 0.04, 0.1)
            else:
                f.box((key, "neon_" + hue, 0), s + 0.43, s + 0.67, 2.55, 2.75, 0.05, 0.2)
            light(key, *f.p(f.at(s + 0.55), 2.6, 0.8), hue, 3.5)
            adv = 1.6
        elif pick < 0.26 and s + 3.6 < w:
            f.quad((key, "door_panel", 0), s, s + 3.2, G0, 3.0, 0.03)
            f.box((key, "metal", 1), s - 0.05, s + 3.25, 3.0, 3.25, 0.0, 0.22)
            f.box((key, "hazard", 1), s, s + 3.2, G0, G0 + 0.22, 0.03, 0.06)
            f.box((key, "glow", 0), s + 1.4, s + 1.8, 3.5, 3.6, 0.05, 0.2, col=GLOW["white"])
            light(key, *f.p(f.at(s + 1.6), 3.4, 0.8), "white", 3.0)
            adv = 3.7
        elif pick < 0.35:
            f.box((key, "metal", 0), s, s + 0.7, 1.0, 2.0, 0.0, 0.25)
            f.box((key, "glow", 0), s + 0.5, s + 0.58, 1.75, 1.83, 0.25, 0.26, col=GLOW[r.choice(("green", "red", "amber"))])
            f.box((key, "metal", 1), s + 0.3, s + 0.36, 2.0, 3.3, 0.0, 0.08)
            adv = 1.1
        elif pick < 0.44:
            f.box((key, "dark", 0), s, s + 1.2, 0.8, 1.7, 0.0, 0.12)
            for k in range(4):
                f.box((key, "metal", 1), s + 0.05, s + 1.15, 0.9 + k * 0.2, 0.96 + k * 0.2, 0.12, 0.17)
            adv = 1.6
        elif pick < 0.6 and s + 2.4 < w:
            # A small sign: a board by a door's height, or a blade over heads.
            if r.random() < 0.5:
                board(f, s + 1.0, r.uniform(1.7, 2.5), r.choice(("ps", "bx")), r, key)
            else:
                blade(f, s + 0.8, r.uniform(3.9, 5.2), r.choice(("bs", "bx", "bs")), r.choice((0.0, 0.35, -0.35)), key, key, key)
            adv = 2.2
        elif pick < 0.68:
            f.box((key, "trim", 0), s, s + 1.0, 0.0, 1.5, 0.0, 0.35, col=steel)
            for dx in (0.2, 0.5, 0.8):
                f.box((key, "metal", 1), s + dx - 0.03, s + dx + 0.03, 1.5, 3.3, 0.02, 0.08)
            adv = 1.4
        elif pick < 0.78 and s + 2.4 < w:
            px_, _, pz_ = f.p(f.at(s + 1.0), G0, 0.7)
            P.place(r.choice(("dumpster", "bags", "crates", "bags")), px_, G0, pz_, f.yaw, district=key)
            adv = 2.2
        elif pick < 0.9:
            # A condenser on brackets at head height, its drip pipe to the ground.
            ax_, _, az_ = f.p(f.at(s + 0.45), 0.0, 0.0)
            P.place("ac_wall", ax_, 2.1, az_, f.yaw, district=key)
            f.box((key, "metal", 1), s + 0.42, s + 0.48, 0.72, 2.1, 0.02, 0.07)
            adv = 1.0
        else:
            # Downpipes side by side, strapped to the wall.
            for k in range(r.randrange(2, 4)):
                px_, _, pz_ = f.p(f.at(s + 0.1 + k * 0.24), 0.0, 0.0)
                P.place("pipe_v", px_, 0.72, pz_, f.yaw, sy=2.58, district=key)
            f.box((key, "metal", 1), s, s + 0.82, 1.9, 1.96, 0.0, 0.2)
            adv = 0.9
        s += adv + r.uniform(0.2, 0.9)
    lamp_s = r.uniform(2.0, 5.0)
    while lamp_s < w - 1.0:
        hue = "amber" if r.random() < 0.7 else "white"
        f.box((key, "neon_" + hue, 0), lamp_s - 0.18, lamp_s + 0.18, 3.85, 4.05, 0.05, 0.3)
        f.box((key, "metal", 1), lamp_s - 0.22, lamp_s + 0.22, 4.05, 4.12, 0.0, 0.34)
        light(key, *f.p(f.at(lamp_s), 3.8, 0.8), hue, 3.0)
        lamp_s += r.uniform(5.0, 8.0)


# ---------------------------------------------------------------------------
# A roof from the air: plant, light and structure, nothing over `cap`.
# ---------------------------------------------------------------------------
PALE = (0.62, 0.63, 0.68, 1)     # a roof's walkway slabs and plinths, pale against its tar
LID = (0.8, 0.81, 0.84, 1)       # the top of a tank, a cabinet, a cooling tower: what the sky's light finds
TANK = (0.42, 0.44, 0.47, 1)


@P.proto("cy_crane", box=(0.6, 7.0, 0.6), reach=1200)
def _cy_crane(k):
    """A tower crane left on a roof, fourteen metres: a lattice mast, a jib
    toward +z and a short counter-jib with its weight, ties from the apex,
    a hook's line, red lamps at the apex and the jib's tip."""
    T = k("trim")
    steel = (0.5, 0.36, 0.06, 1)
    for lx, lz in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)):
        box(T, lx - 0.05, lx + 0.05, 0.0, 12.0, lz - 0.05, lz + 0.05, scale=1.0, col=steel)
    for i in range(6):
        y = i * 2.0
        box(T, -0.55, 0.55, y + 1.95, y + 2.05, -0.55, 0.55, scale=1.0, col=steel, bottom=True)
        for q in (((-0.5, y, 0.5), (0.5, y + 2.0, 0.5), (0.5, y + 2.1, 0.5), (-0.5, y + 0.1, 0.5)), ((0.5, y, -0.5), (-0.5, y + 2.0, -0.5), (-0.5, y + 2.1, -0.5), (0.5, y + 0.1, -0.5)),
                  ((0.5, y, 0.5), (0.5, y + 2.0, -0.5), (0.5, y + 2.1, -0.5), (0.5, y + 0.1, 0.5)), ((-0.5, y, -0.5), (-0.5, y + 2.0, 0.5), (-0.5, y + 2.1, 0.5), (-0.5, y + 0.1, -0.5))):
            quad(T, *q, col=steel)
            quad(T, q[1], q[0], q[3], q[2], col=steel)
    box(T, -0.7, 0.7, 12.0, 12.9, -0.9, 0.9, scale=1.0, col=(0.3, 0.3, 0.32, 1), bottom=True)
    box(T, -0.3, 0.3, 12.3, 12.8, -5.0, 13.0, scale=1.0, col=steel, bottom=True)
    box(T, -0.6, 0.6, 11.5, 12.9, -5.0, -3.6, scale=1.0, col=(0.22, 0.22, 0.24, 1), bottom=True)
    box(T, -0.08, 0.08, 12.9, 14.6, -0.08, 0.08, scale=1.0, col=steel)
    for za in (12.6, -4.6):
        for q in (((-0.04, 14.5, 0.0), (0.04, 14.5, 0.0), (0.04, 12.85, za), (-0.04, 12.85, za)), ((0.0, 14.5, -0.04), (0.0, 14.5, 0.04), (0.0, 12.85, za + 0.04), (0.0, 12.85, za - 0.04))):
            quad(T, *q, col=steel)
            quad(T, q[1], q[0], q[3], q[2], col=steel)
    box(T, -0.02, 0.02, 7.5, 12.3, 9.0, 9.04, scale=1.0, col=(0.1, 0.1, 0.1, 1))
    box(T, -0.2, 0.2, 7.1, 7.5, 8.8, 9.2, scale=1.0, col=steel, bottom=True)
    for x, y, z in ((0.0, 14.6, 0.0), (0.0, 12.85, 12.9), (0.0, 12.95, -4.9)):
        box(k("glow"), x - 0.14, x + 0.14, y, y + 0.28, z - 0.14, z + 0.14, scale=0.5, col=GLOW["red"], bottom=True)
    # (Not a bare lattice: the driver's cab lit, work lamps under the jib,
    # and a builder's banner hung on the mast, lit, its lines of type.)
    for sx in (-1, 1):
        quad(k("glow"), (sx * 0.71, 12.25, 0.6 * sx), (sx * 0.71, 12.25, -0.6 * sx), (sx * 0.71, 12.75, -0.6 * sx), (sx * 0.71, 12.75, 0.6 * sx),
             col=dim("amber", 0.5))
    quad(k("glow"), (-0.55, 12.25, 0.91), (0.55, 12.25, 0.91), (0.55, 12.75, 0.91), (-0.55, 12.75, 0.91), col=dim("amber", 0.5))
    for z in (2.5, 5.5, 8.5, 11.5):
        box(k("glow"), -0.12, 0.12, 12.12, 12.3, z - 0.12, z + 0.12, scale=0.5, col=GLOW["white"], bottom=True)
    box(T, -0.56, -0.52, 2.6, 10.4, -0.85, 0.85, scale=1.0, col=(0.04, 0.04, 0.045, 1))
    quad(k("glow"), (-0.57, 2.75, -0.75), (-0.57, 2.75, 0.75), (-0.57, 10.25, 0.75), (-0.57, 10.25, -0.75), col=dim("cyan", 0.6))
    y = 3.3
    for i in range(9):
        w_ = (0.45, 0.6, 0.35, 0.6, 0.5, 0.25, 0.6, 0.4, 0.55)[i]
        quad(k("glow"), (-0.58, y, -0.6), (-0.58, y, w_), (-0.58, y + 0.32, w_), (-0.58, y + 0.32, -0.6), col=dim("cyan", 0.2))
        y += 0.75


@P.proto("cy_tank", box=(1.5, 1.8, 1.5), reach=900)
def _cy_tank(k):
    """A roof's tank on its legs: rolled plate in two courses, a pale lid, a
    ladder, a pipe down to the roof."""
    T = k("trim")
    for lx, lz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        box(T, lx * 0.95 - 0.07, lx * 0.95 + 0.07, 0.0, 0.9, lz * 0.95 - 0.07, lz * 0.95 + 0.07, scale=1.0, col=(0.05, 0.055, 0.065, 1))
    P.lathe(k("tankplate"), 0.0, 0.0, ((0.9, 1.45), (3.4, 1.45)), segs=12, col=TANK, cap=False)
    P.lathe(T, 0.0, 0.0, ((1.95, 1.48), (2.1, 1.48)), segs=12, col=(0.2, 0.21, 0.23, 1), cap=False)
    P.lathe(T, 0.0, 0.0, ((3.4, 1.5), (3.65, 0.4)), segs=12, col=LID, cap=True)
    box(T, 1.45, 1.52, 0.0, 3.4, -0.2, 0.2, scale=1.0, col=(0.3, 0.31, 0.33, 1))
    box(T, -0.1, 0.1, 0.0, 0.9, -1.75, -1.55, scale=1.0, col=(0.3, 0.31, 0.33, 1))


def roof_big(key, x0, x1, z0, z1, y, r, occ, plaza=False, crane=0.5, jib=None, col=None, out=0):
    """The largest thing a stretch of roof may carry where no lens of the
    page's sees it, tried in turn: a crane, a penthouse (a stepped top with
    its own lit floor and roof), a rank of tanks, a strip of skylight. Says
    what it built (or None). Against a wall (`out`, the way along x away
    from it) a crane's jib points away from the wall: run along it, it
    crossed what hangs on that wall from the air."""
    w, d = x1 - x0, z1 - z0
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    if min(w, d) < 4.0:
        return None

    def room(xa, xb, za, zb, want, least):
        return hidden_top(occ, xa, xb, za, zb, y, y + want, plaza=plaza, step=1.0, pad=0.3, least=least)
    if min(w, d) >= 5.0 and r.random() < crane:
        j0, j1 = jib or (z0 - 6.0, z1 + 6.0)
        # (Each way: its yaw and the box its jib and counter-jib sweep.)
        ways = ((0.0, cx - 1.0, cx + 1.0, cz - 5.5, cz + 13.5), (math.pi, cx - 1.0, cx + 1.0, cz - 13.5, cz + 5.5))
        if out:
            ways = ((out * math.pi / 2, *sorted((cx - out * 5.5, cx + out * 13.5)), cz - 1.0, cz + 1.0),)
        for yaw, xa, xb, za, zb in ways:
            if (out or (za > j0 and zb < j1)) and room(xa, xb, za, zb, 15.0, 15.0):
                P.place("cy_crane", cx, y, cz, yaw, district=key)
                flat((key, "trim", 0), cx - 1.6, cx + 1.6, cz - 1.6, cz + 1.6, y + 0.04, PALE)
                return "crane"
    pw, pd = min(w - 2.0, 9.0), min(d - 2.0, 14.0)
    top = room(cx - pw / 2, cx + pw / 2, cz - pd / 2, cz + pd / 2, 7.4, 4.4) if pw >= 4.0 and pd >= 5.0 else None
    if top:
        ph_ = top - 0.6
        a0, a1, b0, b1 = cx - pw / 2, cx + pw / 2, cz - pd / 2, cz + pd / 2
        # (In its tower's own window, so the top is not a second building.)
        col = col or B.wall_col(0.6, 2, r.uniform(0.15, 0.7), B.TINTS[r.choice(("navy", "teal"))])
        for f in B.faces_of(a0, a1, b0, b1).values():
            wall(key, f, y, ph_, col, r.randrange(20))
            f.box((key, "trim", 0), 0.0, f.width, ph_, ph_ + 0.5, -0.25, 0.0, col=B.TRIM[1])
            f.quad((key, "glow", 0), 0.2, f.width - 0.2, ph_ - 0.5, ph_ - 0.32, 0.03, col=dim(r.choice(("cyan", "amber", "white")), 0.5))
        roof(key, a0, a1, b0, b1, ph_)
        flat((key, "trim", 0), a0 + 0.8, a1 - 0.8, cz - 0.4, cz + 0.4, ph_ + 0.03, PALE)
        for px, pz in ((a0 + 0.4, b0 + 0.4), (a1 - 0.4, b1 - 0.4)):
            box((key, "glow", 0), px - 0.12, px + 0.12, ph_ + 0.5, ph_ + 0.75, pz - 0.12, pz + 0.12, scale=0.5, col=GLOW["red"])
        return "penthouse"
    n = max(1, min(3, int((d - 1.0) // 3.6)))
    if w >= 4.0 and room(cx - 1.7, cx + 1.7, cz - n * 1.8, cz + n * 1.8, 4.2, 4.2):
        flat((key, "trim", 0), cx - 2.1, cx + 2.1, cz - n * 1.8 - 0.3, cz + n * 1.8 + 0.3, y + 0.04, PALE)
        for i in range(n):
            P.place("cy_tank", cx, y, cz + (i - (n - 1) / 2) * 3.6, r.uniform(0, 6.28), district=key)
        return "tanks"
    sw, sd_ = min(w - 1.5, 3.6), min(d - 1.5, 9.6)
    box((key, "trim", 0), cx - sw / 2 - 0.2, cx + sw / 2 + 0.2, y, y + 0.32, cz - sd_ / 2 - 0.2, cz + sd_ / 2 + 0.2, scale=1.0, col=PALE)
    flat((key, "skylight", 0), cx - sw / 2, cx + sw / 2, cz - sd_ / 2, cz + sd_ / 2, y + 0.33)
    return "skylight"




def _low_unit(key, px, pz, y, r, hw=0.8, hd=0.5):
    """A low condenser: a cabinet under a parapet's height, a dark grille
    on its top, a pilot lamp."""
    flat((key, "trim", 0), px - hw - 0.3, px + hw + 0.3, pz - hd - 0.3, pz + hd + 0.3, y + 0.03, PALE)
    box((key, "metal", 0), px - hw, px + hw, y, y + 0.7, pz - hd, pz + hd, scale=0.8)
    flat((key, "trim", 0), px - hw, px + hw, pz - hd, pz + hd, y + 0.702, LID)
    flat((key, "dark", 1), px - hw + 0.12, px + hw - 0.12, pz - hd + 0.12, pz + hd - 0.12, y + 0.708)
    flat((key, "glow", 0), px + hw - 0.3, px + hw - 0.18, pz - hd + 0.02, pz - hd + 0.1, y + 0.71, GLOW[r.choice(("green", "amber", "red"))])


def roof_edge(key, x0, x1, z0, z1, y, hue, every=4.6):
    """Small lamps at intervals round a roof just inside its parapet: from
    the air every roof is drawn in dots of light."""
    c = GLOW[hue]
    for xa, za, xb, zb in ((x0, z0, x1, z0), (x1, z0, x1, z1), (x1, z1, x0, z1), (x0, z1, x0, z0)):
        n = max(1, round(math.hypot(xb - xa, zb - za) / every))
        for i in range(n):
            px, pz = xa + (xb - xa) * (i + 0.5) / n, za + (zb - za) * (i + 0.5) / n
            flat((key, "glow", 0), px - 0.2, px + 0.2, pz - 0.2, pz + 0.2, y + 0.07, c)


def roof_low(key, x0, x1, z0, z1, y, r, pad=True):
    """What a roof holds that stays under its parapet (0.8 m at most), so a
    lens low on the avenue never sees it: a walkway of grating down its
    length, duct runs on low legs, low condensers with a pilot lamp,
    hatches, skylights in strips, and on a broad roof a landing pad's ring."""
    w, d = x1 - x0, z1 - z0
    if w < 2.5 or d < 2.5:
        return
    lz = d >= w
    a0, a1, b0, b1 = (z0, z1, x0, x1) if lz else (x0, x1, z0, z1)
    bm, bw = (b0 + b1) / 2, (b1 - b0)
    rect = (lambda u0, u1, v0, v1: (v0, v1, u0, u1)) if lz else (lambda u0, u1, v0, v1: (u0, u1, v0, v1))
    # A walkway of pale slabs down its length and across to each side, the
    # roof's dark plane cut into plots; a low lamp where they cross, its
    # pool on the roof.
    flat((key, "trim", 0), *rect(a0, a1, bm - 0.45, bm + 0.45), y + 0.03, PALE)
    edge = dim(r.choice(("amber", "teal", "cyan", "amber")), 0.4)
    for off in (-0.5, 0.5):
        flat((key, "glow", 0), *rect(a0 + 0.3, a1 - 0.3, bm + off - 0.04, bm + off + 0.04), y + 0.04, edge)
    u, k = a0 + 4.3, 0
    while u < a1 - 1.0:
        flat((key, "trim", 0), *rect(u - 0.35, u + 0.35, b0, bm - 0.45), y + 0.03, PALE)
        flat((key, "trim", 0), *rect(u - 0.35, u + 0.35, bm + 0.45, b1), y + 0.03, PALE)
        if k % 2 == 0:
            hue = r.choice(("amber", "amber", "cyan", "white"))
            xa, xb, za, zb = rect(u - 0.12, u + 0.12, bm + 0.55, bm + 0.79)
            box((key, "glow", 0), xa, xb, y, y + 0.5, za, zb, scale=0.5, col=GLOW[hue])
            light(key, (xa + xb) / 2, y + 0.6, (za + zb) / 2, hue, 8.0)
        u += 4.2
        k += 1
    ring = None
    if pad and bw > 13.0 and a1 - a0 > 16.0:
        ring = ((a0 + a1) / 2, 4.6)
        cx, cz = (bm, ring[0]) if lz else (ring[0], bm)
        for i in range(24):
            t0, t1 = i * math.tau / 24, (i + 1) * math.tau / 24
            quad((key, "glow", 0), (cx + 4.6 * math.cos(t1), y + 0.05, cz + 4.6 * math.sin(t1)), (cx + 4.6 * math.cos(t0), y + 0.05, cz + 4.6 * math.sin(t0)),
                 (cx + 4.3 * math.cos(t0), y + 0.05, cz + 4.3 * math.sin(t0)), (cx + 4.3 * math.cos(t1), y + 0.05, cz + 4.3 * math.sin(t1)), col=dim("amber", 0.8))
        flat((key, "glow", 0), cx - 1.6, cx + 1.6, cz - 0.14, cz + 0.14, y + 0.05, dim("white", 0.6))
        flat((key, "glow", 0), cx - 0.14, cx + 0.14, cz - 1.6, cz + 1.6, y + 0.05, dim("white", 0.6))
    half = bw / 4 - 0.5
    if half < 0.45:
        return
    u = a0 + 2.2
    while u < a1 - 1.6:
        for sgn in (-1, 1):
            v = bm + sgn * (bw / 4 + 0.25)
            if ring and abs(u - ring[0]) < ring[1] + 1.6:
                continue
            kind = r.random()
            if kind < 0.3:
                hw, hd = (min(half, 0.55), 0.9) if lz else (0.9, min(half, 0.55))
                _low_unit(key, *((v, u) if lz else (u, v)), y, r, hw, hd)
            elif kind < 0.52:
                xa, xb, za, zb = rect(u - 1.7, u + 1.7, v - 0.25, v + 0.25)
                box((key, "metal", 1), xa, xb, y + 0.22, y + 0.66, za, zb, scale=1.0, bottom=True)
                for du in (-1.4, 1.4):
                    la = rect(u + du - 0.06, u + du + 0.06, v - 0.2, v + 0.2)
                    box((key, "metal", 1), la[0], la[1], y, y + 0.22, la[2], la[3], scale=0.5)
            elif kind < 0.66:
                hue = r.choice(("white", "amber", "cyan"))
                for k in (-1, 0, 1):
                    flat((key, "glow", 0), *rect(u + k * 0.7 - 0.2, u + k * 0.7 + 0.2, v - min(half, 1.3), v + min(half, 1.3)), y + 0.16, dim(hue, 0.5))
                xa, xb, za, zb = rect(u - 1.05, u + 1.05, v - min(half, 1.3) - 0.1, v + min(half, 1.3) + 0.1)
                box((key, "trim", 1), xa, xb, y, y + 0.15, za, zb, scale=1.0, col=B.TRIM[5])
            elif kind < 0.8:
                xa, xb, za, zb = rect(u - 0.5, u + 0.5, v - 0.5, v + 0.5)
                box((key, "trim", 0), xa, xb, y, y + 0.4, za, zb, scale=1.0, col=B.TRIM[5])
                flat((key, "glow", 0), xa + 0.1, xb - 0.1, za + 0.44, za + 0.5, y + 0.405, dim("amber", 0.8))
        u += 4.2


def roof_plant(key, x0, x1, z0, z1, y, r, cap, lines=()):
    """Fill a roof with what a tower's roof holds, plot by plot and no plot
    bare: cooling towers with a line of light at their foot, a stair hut
    with its door lit and a lamp's pool before it, condensers in rows, ducts
    on legs, vent stacks, skylights in strips, a tank, an antenna, a dish, a
    board on struts: each only where `cap` (how high the lenses allow)
    lets it stand. `lines`: the edges ("+x", "-z"...) to draw in a thin
    line of light at the parapet's top (ARL_JWwKdDs@23)."""
    w, d = x1 - x0, z1 - z0
    if lines:
        hue = r.choice(("cyan", "cyan", "amber", "yellow", "teal", "blue"))
        fs = B.faces_of(x0, x1, z0, z1)
        for name in lines:
            fs[name].quad((key, "neon_" + hue, 0), 0.0, fs[name].width, y + 0.84, y + 0.94, 0.04)
    if w < 3.5 or d < 3.5:
        return
    if cap < 1.7:
        roof_low(key, x0, x1, z0, z1, y, r)
        return
    nx, nz = max(1, int(w // 5.2)), max(1, int(d // 5.2))
    pw, pd = w / nx - 1.2, d / nz - 1.2
    for i in range(1, nx):
        flat((key, "trim", 0), x0 + i * w / nx - 0.35, x0 + i * w / nx + 0.35, z0, z1, y + 0.03, PALE)
    for j in range(1, nz):
        flat((key, "trim", 0), x0, x1, z0 + j * d / nz - 0.35, z0 + j * d / nz + 0.35, y + 0.032, PALE)
        for i in range(1, nx, 2):
            hue = r.choice(("amber", "amber", "cyan", "white"))
            lx, lz = x0 + i * w / nx + 0.5, z0 + j * d / nz + 0.5
            box((key, "glow", 0), lx - 0.12, lx + 0.12, y, y + 0.5, lz - 0.12, lz + 0.12, scale=0.5, col=GLOW[hue])
            light(key, lx, y + 0.6, lz, hue, 8.0)
    for i in range(nx):
        for j in range(nz):
            px, pz = x0 + (i + 0.5) * w / nx, z0 + (j + 0.5) * d / nz
            kinds = ["low", "duct", "sky", "stack", "units", "units"]
            if cap >= 2.7 and min(pw, pd) > 2.6:
                kinds += ["tower", "tower"]
            if cap >= 2.6 and min(pw, pd) > 2.4:
                kinds += ["hut"]
            if cap >= 4.5 and min(pw, pd) > 3.0:
                kinds += ["tank", "tank"]
            if cap >= 6.5:
                kinds += ["antenna"]
            if cap >= 2.3:
                kinds += ["dish"]
            if cap >= 4.4 and pw > 3.4:
                kinds += ["board", "board"]
            kind = r.choice(kinds)
            if kind in ("duct", "stack") and cap >= 4.4 and pw > 3.4 and int(abs(px) * 5.0 + abs(pz) * 11.0) % 3 == 0:
                # (A third of these where a board may stand is a lit board on
                # struts, on dice of its own.)
                rr = random.Random(int(abs(px) * 1000 + abs(pz) * 37))
                bw, bh = min(pw, 4.8), 2.4
                yaw = rr.choice((0.0, math.pi / 2, math.pi, -math.pi / 2)) + rr.uniform(-0.3, 0.3)
                cy = y + 1.5 + bh / 2
                advert(key, key, px, cy, pz, bw, bh, yaw, rr)
                board_back(key, px, cy, pz, bw, bh, yaw, rr.choice(("cyan", "amber", "yellow", "pink")))
                for sg in (-1, 1):
                    lx, lz = px + math.cos(yaw) * sg * bw * 0.3 - math.sin(yaw) * 0.2, pz - math.sin(yaw) * sg * bw * 0.3 - math.cos(yaw) * 0.2
                    box((key, "metal", 1), lx - 0.06, lx + 0.06, y, cy - bh / 2, lz - 0.06, lz + 0.06, scale=0.5)
            elif kind == "tower":
                hw, hd, hh = min(1.8, pw / 2), min(1.8, pd / 2), min(cap - 0.4, r.uniform(2.2, 3.2))
                box((key, "metal", 0), px - hw, px + hw, y, y + hh, pz - hd, pz + hd, scale=1.0)
                box((key, "trim", 0), px - hw - 0.08, px + hw + 0.08, y + hh, y + hh + 0.1, pz - hd - 0.08, pz + hd + 0.08, scale=1.0, col=LID)
                cylinder((key, "dark", 1), px, pz, y + hh + 0.1, y + hh + 0.26, min(hw, hd) * 0.62, segs=10)
                hue = r.choice(("cyan", "amber", "red", "teal"))
                for f in B.faces_of(px - hw, px + hw, pz - hd, pz + hd).values():
                    f.quad((key, "neon_" + hue, 0), 0.1, f.width - 0.1, y + 0.3, y + 0.4, 0.03)
                # (A cooling tower's plume, on one roof in three.)
                if STEAM.setdefault("towers", 0) % 3 == 0:
                    steam("roof", px, y + hh + 0.3, pz, most=9)
                STEAM["towers"] += 1
            elif kind == "hut" and cap >= 3.0 and min(pw, pd) >= 2.8:
                # (The kit's stair hut, its lit door to one side or the other.)
                side = r.choice((-1, 1))
                P.place("roof_hut", px, y, pz, 0.0 if side > 0 else math.pi, district=key)
                light(key, px, y + 1.5, pz + side * 2.4, "amber", 4.0)
            elif kind == "hut":
                hw, hd, hh = min(1.5, pw * 0.4), min(1.3, pd * 0.4), min(2.6, cap - 0.2)
                box((key, "trim", 0), px - hw, px + hw, y, y + hh, pz - hd, pz + hd, scale=1.5, col=B.TRIM[5])
                box((key, "trim", 0), px - hw - 0.1, px + hw + 0.1, y + hh, y + hh + 0.12, pz - hd - 0.1, pz + hd + 0.1, scale=1.0, col=PALE)
                side = r.choice((-1, 1))
                dz = pz + side * (hd + 0.02)
                q = ((px - 0.45, y, dz), (px + 0.45, y, dz), (px + 0.45, y + 2.0, dz), (px - 0.45, y + 2.0, dz))
                quad((key, "glow", 0), *(q if side > 0 else (q[1], q[0], q[3], q[2])), col=dim("amber", 0.7))
                light(key, px, y + 1.5, pz + side * (hd + 1.2), "amber", 4.0)
            elif kind == "units" and pw >= 3.8 and pd >= 2.2:
                # (The kit's condensers backed by a run of duct, a breath of
                # steam off one in four.)
                P.place("roof_condenser", px, y, pz + 0.3, 0.0, district=key)
                if pw >= 4.2:
                    # (A duct of the canyon's own behind them: the kit's would
                    # carry a part of its prototype into the core.)
                    box((key, "trim", 1), px - 1.9, px + 1.9, y + 0.35, y + 0.95, pz - 1.05, pz - 0.45, scale=1.0, col=PALE, bottom=True)
                    for lx in (px - 1.6, px + 1.6):
                        box((key, "metal", 1), lx - 0.06, lx + 0.06, y, y + 0.35, pz - 1.0, pz - 0.5, scale=0.5)
                if STEAM.setdefault("cond", 0) % 4 == 0:
                    empty(f"anchor_steam_zz_roof_cy{STEAM['cond']}", (px - 1.1, y + 1.25, pz + 0.3))
                STEAM["cond"] += 1
            elif kind == "units":
                n = max(1, min(4, int(pw // 2.0)))
                for m in range(n):
                    P.place("cy_unit", px - (n - 1) + m * 2.0, y, pz, 0.0, district=key)
            elif kind == "duct" and pw > 2.0:
                box((key, "trim", 1), px - pw / 2, px + pw / 2, y + 0.35, y + 0.95, pz - 0.35, pz + 0.35, scale=1.0, col=PALE, bottom=True)
                for lx in (px - pw / 2 + 0.3, px + pw / 2 - 0.3):
                    box((key, "metal", 1), lx - 0.06, lx + 0.06, y, y + 0.35, pz - 0.3, pz + 0.3, scale=0.5)
            elif kind == "sky" and min(pw, pd) > 2.4:
                hw, hd = min(1.5, pw / 2 - 0.2), min(1.1, pd / 2 - 0.2)
                box((key, "trim", 0), px - hw - 0.15, px + hw + 0.15, y, y + 0.3, pz - hd - 0.15, pz + hd + 0.15, scale=1.0, col=B.TRIM[5])
                hue = r.choice(("white", "amber", "cyan", "white"))
                for k in range(4):
                    xa = px - hw + k * (2 * hw / 4) + 0.12
                    flat((key, "glow", 0), xa, xa + 2 * hw / 4 - 0.24, pz - hd, pz + hd, y + 0.31, dim(hue, 0.5))
            elif kind == "stack" and cap >= 1.2 and pw > 2.0:
                for sx in (-0.7, 0.7):
                    P.place("roof_vent", px + sx, y, pz + sx * 0.4, 0.0, district=key)
            elif kind == "stack":
                for sx in (-0.5, 0.5) if pw > 2.6 else (0.0,):
                    cylinder((key, "metal", 1), px + sx, pz, y, y + 1.3, 0.2, segs=7)
                    cylinder((key, "dark", 1), px + sx, pz, y + 1.3, y + 1.42, 0.3, segs=7)
            elif kind == "tank":
                yaw = r.uniform(0, 6.28)
                # (Each lit: a band of neon round its drum and a lamp at its
                # foot, the colour by where it stands.)
                th = ("cyan", "amber", "pink", "teal", "yellow")[int(abs(px) * 3.0 + abs(pz) * 7.0) % 5]
                if cap >= 5.0 and min(pw, pd) >= 2.8:
                    P.place("roof_tank", px, y, pz, yaw, district=key)
                    cylinder((key, "neon_" + th, 0), px, pz, y + 2.6, y + 2.68, 1.16, segs=12, cap=False)
                else:
                    sxz = min(1.0, min(pw, pd) / 3.2)
                    P.place("cy_tank", px, y, pz, yaw, sxz=sxz, district=key)
                    cylinder((key, "neon_" + th, 0), px, pz, y + 2.3, y + 2.38, 1.48 * sxz + 0.03, segs=12, cap=False)
                box((key, "glow", 0), px + 1.6, px + 1.85, y, y + 0.3, pz - 0.12, pz + 0.12, scale=0.5, col=GLOW["white"])
                light(key, px + 1.7, y + 0.6, pz, th, 6.0)
            elif kind == "antenna":
                P.place("roof_mast", px, y, pz, r.uniform(0, 3.14), sy=min(1.4, (cap - 0.4) / 8.2), district=key)
            elif kind == "dish":
                P.place("roof_dish", px, y, pz, r.uniform(0, 6.28), district=key)
            elif kind == "board":
                bw, bh = min(pw, 4.8), 2.4
                yaw = r.choice((0.0, math.pi / 2, math.pi, -math.pi / 2)) + r.uniform(-0.3, 0.3)
                cy = y + 1.5 + bh / 2
                advert(key, key, px, cy, pz, bw, bh, yaw, r)
                board_back(key, px, cy, pz, bw, bh, yaw, r.choice(("cyan", "amber", "yellow")))
                for sg in (-1, 1):
                    lx, lz = px + math.cos(yaw) * sg * bw * 0.3 - math.sin(yaw) * 0.2, pz - math.sin(yaw) * sg * bw * 0.3 - math.cos(yaw) * 0.2
                    box((key, "metal", 1), lx - 0.06, lx + 0.06, y, cy - bh / 2, lz - 0.06, lz + 0.06, scale=0.5)
            else:
                _low_unit(key, px, pz, y, r, min(0.9, pw / 2), min(0.55, pd / 2))
