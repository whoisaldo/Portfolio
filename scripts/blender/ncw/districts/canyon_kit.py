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
    doors = []
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
            doors.append(mid)
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
    box(k("glow"), -1.2, 1.2, 0.25, 0.72, 0.6, 0.62, scale=0.5, col=GLOW["amber"])
    box(k("metal"), -1.35, 1.35, 0.95, 1.0, 0.0, 0.68, scale=0.6)
    box(k("trim"), -1.3, 1.3, 0.0, 1.9, -1.05, -0.9, scale=1.0, col=wood)
    for x in (-1.3, 1.3):
        for z in (-1.0, 0.64):
            box(k("metal"), x - 0.03, x + 0.03, 0.0, 2.35, z - 0.03, z + 0.03, scale=0.5)
    box(k("trim"), -1.5, 1.5, 2.35, 2.42, -1.15, 0.95, scale=1.0, col=(0.32, 0.07, 0.09, 1), bottom=True)
    box(k("glow"), -1.3, 1.3, 2.0, 2.33, 0.9, 0.93, scale=0.5, col=GLOW["pink"])
    box(k("glow"), -0.25, 0.25, 2.2, 2.26, -0.2, 0.3, scale=0.5, col=GLOW["white"], bottom=True)
    cylinder(k("metal"), 0.7, 0.33, 1.0, 1.3, 0.2, segs=8)


@P.proto("cy_stool", box=(0.2, 0.25, 0.2), reach=180, detail=True)
def _cy_stool(k):
    cylinder(k("metal"), 0.0, 0.0, 0.0, 0.45, 0.04, segs=5, cap=False)
    cylinder(k("trim"), 0.0, 0.0, 0.45, 0.5, 0.18, segs=8, col=(0.38, 0.07, 0.08, 1))


@P.proto("cy_kiosk", box=(0.9, 1.2, 0.55), reach=200)
def _cy_kiosk(k):
    """A low kiosk on a corporate forecourt, its face a lit cyan panel
    (Fn9gKhU_2_Q@77)."""
    box(k("dark"), -0.9, 0.9, 0.0, 2.3, -0.5, 0.5, scale=1.0)
    c = GLOW["cyan"]
    quad(k("glow"), (-0.78, 0.9, 0.505), (0.78, 0.9, 0.505), (0.78, 2.0, 0.505), (-0.78, 2.0, 0.505), col=(c[0] * 0.14, c[1] * 0.14, c[2] * 0.14, 1))
    # What its screen shows: a heading, lines of a notice, a row of keys.
    for x0, x1, y0, y1, hue in ((-0.66, 0.3, 1.78, 1.9, "white"), (-0.66, 0.62, 1.56, 1.62, "cyan"), (-0.66, 0.44, 1.44, 1.5, "cyan"),
                                (-0.66, 0.56, 1.32, 1.38, "cyan"), (-0.66, -0.36, 1.0, 1.18, "amber"), (-0.26, 0.04, 1.0, 1.18, "cyan"),
                                (0.14, 0.44, 1.0, 1.18, "cyan")):
        quad(k("glow"), (x0, y0, 0.512), (x1, y0, 0.512), (x1, y1, 0.512), (x0, y1, 0.512), col=GLOW[hue])
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
    hue = r.choice(("pink", "amber", "cyan", "magenta"))
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
        light(key, x + math.sin(yaw) * sgn, y + 1.5, z + math.cos(yaw) * sgn, r.choice(("cyan", "pink", "amber", "magenta")), 5.0)


@P.proto("cy_bollard", box=(0.15, 0.55, 0.15), reach=260)
def _cy_bollard(k):
    """A bollard with a strip of light up each face (Fn9gKhU_2_Q@77)."""
    box(k("dark"), -0.13, 0.13, 0.0, 1.05, -0.13, 0.13, scale=0.5)
    for f in B.faces_of(-0.13, 0.13, -0.13, 0.13).values():
        f.quad(k("glow"), 0.09, 0.17, 0.12, 0.95, 0.006, col=GLOW["cyan"])


@P.proto("cy_block", box=(1.0, 0.45, 0.35), reach=300)
def _cy_block(k):
    """A concrete barricade block: a wide foot, a narrow top, a hazard band
    and a red lamp on it (YRL74JmhVgk@30)."""
    box(k("concrete"), -1.0, 1.0, 0.0, 0.3, -0.34, 0.34, scale=1.0)
    box(k("concrete"), -1.0, 1.0, 0.3, 0.9, -0.17, 0.17, scale=1.0)
    box(k("hazard"), -1.0, 1.0, 0.6, 0.72, -0.18, 0.18, scale=0.5)
    box(k("glow"), -0.07, 0.07, 0.9, 0.98, -0.07, 0.07, scale=0.5, col=GLOW["red"])


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
    box(k("trim"), -1.42, 1.42, 0.55, 1.05, -0.28, 0.28, scale=1.0, col=(0.06, 0.16, 0.09, 1))
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
            col=GLOW[("amber", "amber", "pink", "amber", "cyan")[i % 5]], bottom=True)


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


LANE_STUFF = ("bin", "crates", "bags", "bags", "dumpster", "crates", "cy_unit", "bags")


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
    off = 0.6 if wb - wa < 7.0 else 1.0
    v = lo + r.uniform(1.5, 3.5)
    n = 0
    while v < hi - 2.0:
        if n % 2 == 0 and tubes:
            hue = r.choice(("green", "cyan", "cyan", "pink", "amber", "teal"))
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
                P.place(r.choice(LANE_STUFF), px, G0, pz, r.choice((0.0, math.pi / 2, math.pi, 0.3)), district=key)
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
        # A drain down its middle, a grating at a time.
        dx, _, dz = pt(v, (wa + wb) / 2, 0.0)
        if along == "z":
            box((key, "dark", 1), dx - 0.2, dx + 0.2, G0, G0 + 0.012, dz - 1.6, dz + 1.6, scale=0.5)
        else:
            box((key, "dark", 1), dx - 1.6, dx + 1.6, G0, G0 + 0.012, dz - 0.2, dz + 0.2, scale=0.5)
        v += r.uniform(3.6, 5.6)
        n += 1
    if name:
        sx, _, sz = pt((lo + hi) / 2 + r.uniform(-6.0, 6.0), (wa + wb) / 2, 0.0)
        box((key, "metal", 1), sx - 0.4, sx + 0.4, G0, G0 + 0.06, sz - 0.4, sz + 0.4, scale=0.5)
        empty("anchor_steam_" + name, (sx, 0.3, sz))


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
# A skybridge across the avenue, carrying a row of boards (ARL_JWwKdDs@21).
# ---------------------------------------------------------------------------
def skybridge(z, y0, r, enclosed=True, x0=-WALK, x1=WALK, key=FA, back=CB, hang=9.0):
    """From wall to wall at z, its deck at y0. `key` is everything the hero's
    lens sees of it (it looks north, so the south side); `back` the rest.
    Returns the boxes it fills, for the lens checks."""
    zs, zn = z + 2.0, z - 2.0
    y1 = y0 + 4.4
    if enclosed:
        # A glazed walkway: a dark tube, a band of lit windows down each side.
        box((key, "board_frame", 0), x0, x1, y0, y1, zn, zs, scale=2.0, bottom=True)
        col = B.wall_col(0.95, 5, r.uniform(0.3, 0.9), B.TINTS["navy"])
        wall(key, B.Face("+z", zs + 0.03, x0, x1), y0 + 0.6, y0 + 4.0, col, 0)
        wall(back, B.Face("-z", zn - 0.03, x0, x1), y0 + 0.6, y0 + 4.0, col, 0)
        strip(key, B.Face("+z", zs + 0.03, x0, x1), 0.0, x1 - x0, y0 + 0.1, y0 + 0.3, r.choice(("cyan", "magenta")), out=0.02)
    else:
        # An open truss: a deck, two chords over it on posts, braces, rails.
        box((key, "board_frame", 0), x0, x1, y0, y0 + 0.5, zn, zs, scale=2.0, bottom=True)
        for zz in (zn + 0.1, zs - 0.1):
            k2 = key if zz > z else back
            box((k2, "board_frame", 0), x0, x1, y1 - 0.3, y1, zz - 0.12, zz + 0.12, scale=1.0, bottom=True)
            box((k2, "metal", 1), x0, x1, y0 + 1.5, y0 + 1.58, zz - 0.04, zz + 0.04, scale=0.5)
            n = 8
            for i in range(n + 1):
                x = x0 + (x1 - x0) * i / n
                box((k2, "board_frame", 0), x - 0.1, x + 0.1, y0 + 0.5, y1 - 0.3, zz - 0.1, zz + 0.1, scale=1.0)
                if i < n:
                    xa, xb = (x, x + (x1 - x0) / n) if i % 2 == 0 else (x + (x1 - x0) / n, x)
                    q = ((xa, y0 + 0.5, zz), (xa + 0.18, y0 + 0.5, zz), (xb + 0.18, y1 - 0.3, zz), (xb, y1 - 0.3, zz))
                    quad((k2, "board_frame", 0), *q)
                    quad((k2, "board_frame", 0), q[1], q[0], q[3], q[2])
            strip(k2, B.Face("+z" if zz > z else "-z", zz + (0.13 if zz > z else -0.13), x0, x1), 0.0, x1 - x0, y0 + 0.05, y0 + 0.2, "amber", out=0.0)
    # Lamps under it, pooling on the road.
    for x in (x0 + 5.0, (x0 + x1) / 2, x1 - 5.0):
        box((back, "glow", 0), x - 1.2, x + 1.2, y0 - 0.06, y0, z - 0.15, z + 0.15, scale=0.5, col=GLOW["white"], bottom=True)
        light(back, x, y0, z, "white", 5.0)
    # The row of boards: standing along its top and hung on its side, each
    # its own size, the row broken and uneven.
    boxes = [((x0, y0, zn), (x1, y1, zs))]
    for face_z, yaw, k2 in ((zs + 0.25, 0.0, key), (zn - 0.25, math.pi, back)):
        x = x0 + r.uniform(1.0, 2.5)
        while x < x1 - 3.5:
            roll = r.random()
            if roll < 0.3:
                w, h = r.uniform(4.0, 5.6), r.uniform(2.2, 3.0)
                yc = y1 + 0.5 + h / 2
                B.billboard(k2, x + w / 2, yc, face_z - math.cos(yaw) * 0.2, w, h, yaw + r.uniform(-0.12, 0.12), r, frame=True, back=False, depth=0.25)
                for px in (x + w * 0.25, x + w * 0.75):
                    box((k2, "metal", 1), px - 0.06, px + 0.06, y1, yc - h / 2, face_z - 0.3, face_z - 0.18, scale=0.5)
            else:
                size = r.choice(("pm", "pm", "ps", "bx"))
                w, h = ST_SIZES[size]
                yc = r.choice((y1 + 0.35 + h / 2, y0 + 2.2, y0 + 1.0 + h / 2))
                box((k2, "board_frame", 0), x - 0.07, x + w + 0.07, yc - h / 2 - 0.07, yc + h / 2 + 0.07, min(face_z, face_z - math.cos(yaw) * 0.12),
                    max(face_z, face_z - math.cos(yaw) * 0.12), scale=1.0)
                sign(st_name(size), x + w / 2, yc, face_z + math.cos(yaw) * 0.015, w, h, yaw, district=k2, label=False)
            boxes.append(((x, y1, zn), (x + w, y1 + 3.6, zs)))
            x += w + r.uniform(0.5, 2.2)
    # The column of small boards hung under it, on the right of the gap.
    if hang is not None:
        yy = y0 - 0.3
        box((key, "metal", 1), hang - 0.06, hang + 0.06, y0 - 5.6, y0, z - 0.06, z + 0.06, scale=0.5)
        for _ in range(4):
            size = r.choice(("ps", "bx", "ps"))
            w, h = ST_SIZES[size]
            yy -= h + 0.2
            box((back, "board_frame", 0), hang - w / 2 - 0.06, hang + w / 2 + 0.06, yy - 0.06, yy + h + 0.06, z - 0.07, z + 0.07, scale=1.0)
            sid = st_name(size)
            sign(sid, hang, yy + h / 2, z + 0.08, w, h, 0.0, district=key, label=False)
            sign(sid + "_b", hang, yy + h / 2, z - 0.08, w, h, math.pi, district=back, label=False)
        boxes.append(((hang - 1.0, yy, z - 0.2), (hang + 1.0, y0, z + 0.2)))
    # A red lamp over each end.
    for x in (x0 + 0.6, x1 - 0.6):
        box((key, "glow", 0), x - 0.12, x + 0.12, y1, y1 + 0.25, z - 0.12, z + 0.12, scale=0.5, col=GLOW["red"])
    return boxes


def link(side_x0, side_x1, z_lo, z_hi, y, r, key=CB):
    """A service bridge between two towers of one row, across the slot
    between them: a dark box, a lit strip, small windows."""
    box((key, "board_frame", 0), side_x0, side_x1, y, y + 3.0, z_lo, z_hi, scale=2.0, bottom=True)
    hue = r.choice(("cyan", "amber", "magenta", "white"))
    for x, nx in ((side_x0 - 0.02, -1), (side_x1 + 0.02, 1)):
        f = B.Face("+x" if nx > 0 else "-x", x, z_lo, z_hi)
        f.quad((key, "neon_" + hue, 0), 0.3, f.width - 0.3, y + 1.3, y + 1.9, 0.0)


# ---------------------------------------------------------------------------
# A service wall at street level: what a block shows a lane.
# ---------------------------------------------------------------------------
def service_wall(f, r, key=CB):
    """The ground floor of a back or an alley wall, nothing on it repeated
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
def roof_plant(key, x0, x1, z0, z1, y, r, cap, lines=()):
    """Fill a roof with what a tower's roof holds, plot by plot: cooling
    towers with a line of light at their foot, a stair hut with its door
    lit and a lamp's pool before it, condensers in rows, ducts on legs,
    skylights, a tank, an antenna, a dish. `lines`: the edges ("+x", "-z"...)
    to draw in a thin line of light at the parapet's top (ARL_JWwKdDs@23)."""
    w, d = x1 - x0, z1 - z0
    if lines:
        hue = r.choice(("cyan", "cyan", "amber", "pink", "teal", "magenta"))
        fs = B.faces_of(x0, x1, z0, z1)
        for name in lines:
            fs[name].quad((key, "neon_" + hue, 0), 0.0, fs[name].width, y + 0.84, y + 0.94, 0.04)
    if w < 3.5 or d < 3.5 or cap < 1.0:
        return
    nx, nz = max(1, int(w // 5.2)), max(1, int(d // 5.2))
    pw, pd = w / nx - 1.2, d / nz - 1.2
    for i in range(nx):
        for j in range(nz):
            px, pz = x0 + (i + 0.5) * w / nx, z0 + (j + 0.5) * d / nz
            kind = r.random()
            if kind < 0.16 and cap >= 2.7 and min(pw, pd) > 2.6:
                hw, hd, hh = min(1.8, pw / 2), min(1.8, pd / 2), min(cap - 0.4, r.uniform(2.2, 3.2))
                box((key, "metal", 0), px - hw, px + hw, y, y + hh, pz - hd, pz + hd, scale=1.0)
                box((key, "dark", 1), px - hw - 0.08, px + hw + 0.08, y + hh, y + hh + 0.1, pz - hd - 0.08, pz + hd + 0.08, scale=1.0)
                cylinder((key, "dark", 1), px, pz, y + hh + 0.1, y + hh + 0.26, min(hw, hd) * 0.62, segs=10)
                hue = r.choice(("cyan", "amber", "red", "teal"))
                for f in B.faces_of(px - hw, px + hw, pz - hd, pz + hd).values():
                    f.quad((key, "neon_" + hue, 0), 0.1, f.width - 0.1, y + 0.3, y + 0.4, 0.03)
            elif kind < 0.3 and cap >= 2.6 and min(pw, pd) > 2.4:
                hw, hd, hh = min(1.5, pw * 0.4), min(1.3, pd * 0.4), min(2.6, cap - 0.2)
                box((key, "trim", 0), px - hw, px + hw, y, y + hh, pz - hd, pz + hd, scale=1.5, col=B.TRIM[5])
                box((key, "dark", 1), px - hw - 0.1, px + hw + 0.1, y + hh, y + hh + 0.12, pz - hd - 0.1, pz + hd + 0.1, scale=1.0)
                side = r.choice((-1, 1))
                dz = pz + side * (hd + 0.02)
                q = ((px - 0.45, y, dz), (px + 0.45, y, dz), (px + 0.45, y + 2.0, dz), (px - 0.45, y + 2.0, dz))
                quad((key, "glow", 0), *(q if side > 0 else (q[1], q[0], q[3], q[2])), col=GLOW["amber"])
                light(key, px, y + 1.5, pz + side * (hd + 1.2), "amber", 4.0)
            elif kind < 0.48:
                n = max(1, min(4, int(pw // 2.0)))
                for m in range(n):
                    P.place("cy_unit", px - (n - 1) + m * 2.0, y, pz, 0.0, district=key)
            elif kind < 0.62 and pw > 2.0:
                box((key, "metal", 1), px - pw / 2, px + pw / 2, y + 0.35, y + 0.95, pz - 0.35, pz + 0.35, scale=1.0, bottom=True)
                for lx in (px - pw / 2 + 0.3, px + pw / 2 - 0.3):
                    box((key, "metal", 1), lx - 0.06, lx + 0.06, y, y + 0.35, pz - 0.3, pz + 0.3, scale=0.5)
            elif kind < 0.74 and min(pw, pd) > 2.4:
                hw, hd = min(1.5, pw / 2 - 0.2), min(1.1, pd / 2 - 0.2)
                box((key, "trim", 0), px - hw - 0.15, px + hw + 0.15, y, y + 0.3, pz - hd - 0.15, pz + hd + 0.15, scale=1.0, col=B.TRIM[5])
                hue = r.choice(("white", "amber", "cyan", "white"))
                for k in range(3):
                    xa = px - hw + k * (2 * hw / 3) + 0.06
                    quad((key, "glow", 0), (xa, y + 0.31, pz + hd), (xa + 2 * hw / 3 - 0.12, y + 0.31, pz + hd),
                         (xa + 2 * hw / 3 - 0.12, y + 0.31, pz - hd), (xa, y + 0.31, pz - hd), col=GLOW[hue])
                light(key, px, y + 0.5, pz, hue, 3.5)
            elif kind < 0.8 and cap >= 4.5 and min(pw, pd) > 3.0:
                P.place("tank_roof", px, y, pz, r.uniform(0, 6.28), district=key)
            elif kind < 0.86 and cap >= 6.5:
                P.place("antenna", px, y, pz, r.uniform(0, 3.14), district=key)
            elif kind < 0.92 and cap >= 2.3:
                P.place("dish", px, y, pz, r.uniform(0, 6.28), district=key)
