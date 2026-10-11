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


def hidden(occ, lo, hi, plaza=False):
    """Whether a box stays out of the hero's lens (and the Work shot's)."""
    if seen(HERO_EYES, occ, lo, hi) or hero_covers(lo, hi):
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
def wall(key, f, y0, y1, col, ov, s0=0.0, s1=None):
    B.facade_wall((key, "facade", 0), f, y0, y1, col, ov, s0, s1)


def roof(key, x0, x1, z0, z1, y, mat="roof"):
    quad((key, mat, 0), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0),
         ((0, 0), ((x1 - x0) / 4, 0), ((x1 - x0) / 4, (z1 - z0) / 4), (0, (z1 - z0) / 4)))


def parapet(key, f, y, col, h=0.95, t=0.3, s0=0.0, s1=None):
    f.box((key, "trim", 0), s0, f.width if s1 is None else s1, y, y + h, -t, 0.0, col=col)


def strip(key, f, s0, s1, y0, y1, hue, out=0.06):
    """A line of light on a face: one quad, a hair proud of it."""
    f.quad((key, "neon_" + hue, 0), s0, s1, y0, y1, out)


# ---------------------------------------------------------------------------
# The ground floor: buildings.shopfront with its glass keyed apart from its
# frame, so the lit glass is in the core and the joinery in the pack.
# ---------------------------------------------------------------------------
REC, PIL = B.REC, B.PIL


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
    colours = palette or ["pink", "cyan", "red", "amber", "purple", "teal", "magenta"]
    for kind, b0, b1 in shops:
        a, b = s0 + b0 * bw, s0 + b1 * bw
        for e in (a, b):
            f.box((key, "trim", 0), e - 0.2, e + 0.2, 0.0, SHOP_H, -REC - 0.02, PIL, col=tcol)
        if kind == "door":
            # The door to the floors above, set back in its lobby, a lamp over it.
            f.quad((key, "door", 0), a + 0.55, b - 0.55, G0, 2.45, -0.9)
            f.quad((key, "trim", 0), a + 0.2, b - 0.2, 2.45, SHOP_H, 0.0, col=B.DARK_TRIM)
            f.box((key, "trim", 0), a + 0.2, b - 0.2, 2.44, 2.46, -0.9, 0.0, col=B.DARK_TRIM)
            mid = (a + b) / 2
            f.box((key, "glow", 0), mid - 0.15, mid + 0.15, 2.38, 2.44, -0.6, -0.4, col=GLOW["white"])
            continue
        lit = (r.uniform(0.4, 1.0), r.random(), 1.0 if r.random() < 0.93 else 0.0, 1.0)
        f.quad((glass, "shop", 0), a + 0.2, b - 0.2, 0.55, 3.3, -REC, col=lit)
        f.quad((key, "trim", 0), a + 0.2, b - 0.2, G0, 0.55, -REC + 0.01, col=B.DARK_TRIM)
        f.quad((key, "trim", 0), a + 0.2, b - 0.2, 3.3, SHOP_H, 0.0, col=B.DARK_TRIM)
        f.box((key, "trim", 0), a + 0.2, b - 0.2, 3.28, 3.3, -REC, 0.0, col=B.DARK_TRIM)
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


# ---------------------------------------------------------------------------
# Signs. A blade stands edge on to its wall and is read along the street; the
# canyon hangs them at angles, stacks small boards in columns and cants its
# screens toward the traffic.
# ---------------------------------------------------------------------------
def _along(f):
    """The direction a blade on this face is read from: south on a wall
    along the avenue (the hero looks north), east on a wall across it."""
    return (0.0, 1.0) if f.nx != 0 else (1.0, 0.0)


def blade(f, s, y, size, cant=0.0, front=CB, back=CB, key=CB, out=None, bracket=True):
    """A standard sign as a blade s metres along the face at height y, its
    front turned `cant` radians toward the street. `front` and `back` key
    its two painted faces."""
    w, h = ST_SIZES[size]
    out = (0.35 + w / 2) if out is None else out
    cx, _, cz = f.p(f.at(s), y, out)
    dx, dz = _along(f)
    dx, dz = dx * math.cos(cant) + f.nx * math.sin(cant), dz * math.cos(cant) + f.nz * math.sin(cant)
    yaw = math.atan2(dx, dz)
    oriented_box((key, "board_frame", 0), cx, y, cz, w + 0.12, h + 0.14, 0.16, yaw, scale=1.0)
    sid = st_name(size)
    sign(sid, cx + dx * 0.09, y, cz + dz * 0.09, w, h, yaw, district=front, label=False)
    sign(sid + "_b", cx - dx * 0.09, y, cz - dz * 0.09, w, h, yaw + math.pi, district=back, label=False)
    if bracket:
        f.box((key, "metal", 1), s - 0.04, s + 0.04, y + h / 2 + 0.07, y + h / 2 + 0.14, 0.0, out)


def stack(f, s, y, n, r, cant=0.0, front=CB, back=CB, key=CB, out=0.95):
    """A column of small boards one over another on a post off the wall, the
    show's stack of red and orange boards (ARL_JWwKdDs@21)."""
    yy = y
    for _ in range(n):
        size = r.choice(("ps", "ps", "bx", "pm"))
        h = ST_SIZES[size][1]
        blade(f, s, yy + h / 2, size, cant, front, back, key, out=out + (ST_SIZES[size][0] - 1.2) / 2, bracket=False)
        yy += h + 0.22
    f.box((key, "metal", 1), s - 0.06, s + 0.06, y - 0.5, yy, 0.0, 0.14)
    for yb in (y - 0.3, yy - 0.2):
        f.box((key, "metal", 1), s - 0.04, s + 0.04, yb, yb + 0.08, 0.0, out)


def board(f, s, y, size, r, key=CB):
    """A standard sign flat on the wall."""
    w, h = ST_SIZES[size]
    out = r.uniform(0.12, 0.4)
    f.box((key, "board_frame", 0), s - w / 2 - 0.07, s + w / 2 + 0.07, y - h / 2 - 0.07, y + h / 2 + 0.07, 0.0, out)
    cx, cy, cz = f.p(f.at(s), y, out + 0.015)
    sign(st_name(size), cx, cy, cz, w, h, f.yaw, district=key, label=False)


def screen(f, s, y, w, h, r, cant, key=CB, toward=1.0, back=True):
    """A screen (an advert with no words, the site draws it) hung off the
    face on struts and turned `cant` radians from flat on the wall toward
    looking along the street (`toward` +1: south or east)."""
    dx, dz = _along(f)
    dx, dz = dx * toward, dz * toward
    nx, nz = f.nx * math.cos(cant) + dx * math.sin(cant), f.nz * math.cos(cant) + dz * math.sin(cant)
    out = 0.55 + (w / 2) * abs(math.sin(cant))
    cx, _, cz = f.p(f.at(s), y, out)
    yaw = math.atan2(nx, nz)
    B.billboard(key, cx, y, cz, w, h, yaw, r, frame=True, back=back, depth=0.3)
    for dy in (-h / 3, h / 3):
        f.box((key, "metal", 1), s - 0.08, s + 0.08, y + dy - 0.08, y + dy + 0.08, 0.0, out)


def tall(sid, x, y0, h, z, w=2.2, key=FA, both=True, yaw=0.0, preview="夜"):
    """One of the canyon's columns of type: a named vertical sign (the site
    sets its word) in a dark frame, read from the south and, with `both`,
    from the north."""
    dx, dz = math.sin(yaw), math.cos(yaw)
    sign(sid, x, y0 + h / 2, z, w, h, yaw, preview=preview, district=key)
    oriented_box((key, "board_frame", 0), x - dx * 0.15, y0 + h / 2, z - dz * 0.15, w + 0.3, h + 0.4, 0.2, yaw, scale=1.0)
    if both:
        sign(sid + "_b", x - dx * 0.3, y0 + h / 2, z - dz * 0.3, w, h, yaw + math.pi, district=key, label=False)


def street_signs(f, r, s0, s1, y_lo, y_hi, n, hero=True, key=CB):
    """What a canyon wall collects between its shops and its upper floors:
    blades at angles, columns of small boards, boards flat on the wall. On
    a wall along the avenue the faces that look south are keyed to the core
    (`hero`)."""
    front = FA if hero and f.nx != 0 else key
    for _ in range(n):
        roll = r.random()
        s = r.uniform(s0 + 1.0, s1 - 1.0)
        if roll < 0.2:
            k = r.randrange(3, 6)
            stack(f, s, r.uniform(y_lo, max(y_lo + 0.5, y_hi - k * 1.3)), k, r, r.choice((0.0, 0.0, 0.3, -0.3)), front, key, key)
        elif roll < 0.72:
            size = r.choices(["bs", "bm", "bl", "bx"], weights=[2, 4, 4, 1])[0]
            h = ST_SIZES[size][1]
            cant = r.choice((0.0, 0.0, 0.0, 0.25, 0.4, -0.25, -0.4))
            blade(f, s, r.uniform(y_lo + h / 2, max(y_lo + h / 2 + 0.2, y_hi - h / 2)), size, cant, front, key, key)
        else:
            size = r.choices(["ps", "pm", "bx"], weights=[3, 4, 1])[0]
            w, h = ST_SIZES[size]
            if s1 - s0 > w + 2.0:
                board(f, min(max(s, s0 + w / 2 + 0.5), s1 - w / 2 - 0.5), r.uniform(y_lo + h / 2, y_hi - h / 2), size, r, key)
