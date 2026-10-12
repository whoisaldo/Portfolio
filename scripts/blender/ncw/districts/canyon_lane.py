"""What the canyon's blocks show a lane, laid out a slot at a time.

A back or an alley wall at arm's length: render in the canyon's own dark
tones over a plinth, a conduit along it, and under the conduit, never more
than a step apart: steel doors each under its lamp (with the lamp's pool on
the ground, kit.light), framed windows of back rooms with the room lit behind
the glass or dark, shutters, air conditioners dripping down the wall,
meters, vents, a kitchen's duct, pipes on straps, a ladder. No wall goes
seven metres without a lamp. The fixtures are the canyon's own prototypes
(a prototype another district also sets down would ride in the core).
"""
import math

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import canyon_kit as C
from ncw.districts.canyon_kit import CB

G0 = B.G0
WALLS = ((0.1, 0.11, 0.13, 1), (0.07, 0.092, 0.105, 1), (0.12, 0.115, 0.11, 1), (0.078, 0.084, 0.11, 1), (0.11, 0.1, 0.095, 1), (0.085, 0.1, 0.1, 1))
STEEL_D = (0.03, 0.034, 0.042, 1)
FRAME = (0.11, 0.115, 0.125, 1)
GALV = (0.2, 0.21, 0.22, 1)
OFFWHITE = (0.34, 0.34, 0.31, 1)
RUSTY = (0.17, 0.075, 0.04, 1)
DAMP = (0.01, 0.012, 0.014, 1)
GREASE = (0.02, 0.015, 0.01, 1)
WINDOWS = ((0.8, 0.6, 1.95), (1.0, 1.1, 1.35), (1.0, 1.1, 1.35), (1.5, 1.0, 1.45), (0.7, 1.4, 1.2), (1.2, 0.8, 1.7))
VENTS = []      # every vent and duct set on a lane wall, in order: some of them steam


def _frame(T, t=0.07, d=0.11):
    """Round an opening a metre square whose foot is the origin (stretched
    to its window): jambs and a head proud of the glass, a sill further out."""
    box(T, -0.5 - t, -0.5, -0.02, 1.0 + t, 0.0, d, scale=1.0, col=FRAME)
    box(T, 0.5, 0.5 + t, -0.02, 1.0 + t, 0.0, d, scale=1.0, col=FRAME)
    box(T, -0.5, 0.5, 1.0, 1.0 + t, 0.0, d, scale=1.0, col=FRAME, bottom=True)
    box(T, -0.62, 0.62, -0.1, 0.0, 0.0, d + 0.08, scale=1.0, col=(0.19, 0.19, 0.2, 1), bottom=True)


@P.proto("cy_win", box=(0.6, 0.6, 0.1), reach=170, detail=True)
def _cy_win(k):
    """A back room's window: its frame and sill, bars and their tie."""
    T = k("trim")
    _frame(T)
    for x in (-0.3, -0.1, 0.1, 0.3):
        box(T, x - 0.016, x + 0.016, 0.0, 1.0, 0.06, 0.09, scale=1.0, col=STEEL_D)
    box(T, -0.5, 0.5, 0.6, 0.64, 0.05, 0.075, scale=1.0, col=STEEL_D, bottom=True)


@P.proto("cy_win_b", box=(0.6, 0.6, 0.1), reach=170, detail=True)
def _cy_win_b(k):
    """A window with its blind let most of the way down."""
    T = k("trim")
    _frame(T)
    for i in range(7):
        y = 0.97 - i * 0.09
        quad(T, (-0.49, y - 0.07, 0.03), (0.49, y - 0.07, 0.03), (0.49, y, 0.055), (-0.49, y, 0.055), col=(0.27, 0.28, 0.27, 1))


@P.proto("cy_door", box=(0.7, 1.6, 0.25), reach=190, detail=True)
def _cy_door(k):
    """A steel door's frame, step, kick plate, handle and notice, and the
    hood of the lamp over it on its conduit (the leaf and the lens are the
    wall's own)."""
    T = k("trim")
    for x0, x1 in ((-0.56, -0.475), (0.475, 0.56)):
        box(T, x0, x1, 0.0, 2.19, 0.0, 0.1, scale=1.0, col=FRAME)
    box(T, -0.475, 0.475, 2.1, 2.19, 0.0, 0.1, scale=1.0, col=FRAME, bottom=True)
    box(T, -0.7, 0.7, 0.0, 0.1, 0.0, 0.44, scale=1.0, col=(0.2, 0.2, 0.21, 1))
    box(T, -0.44, 0.44, 0.14, 0.46, 0.034, 0.048, scale=1.0, col=GALV)
    box(T, 0.3, 0.36, 0.98, 1.16, 0.034, 0.1, scale=1.0, col=GALV, bottom=True)
    box(T, -0.32, -0.04, 1.46, 1.66, 0.034, 0.042, scale=1.0, col=(0.5, 0.42, 0.12, 1))
    box(T, -0.2, 0.2, 2.6, 2.64, 0.0, 0.26, scale=1.0, col=STEEL_D, bottom=True)
    box(T, -0.02, 0.02, 2.64, 3.05, 0.02, 0.06, scale=1.0, col=GALV)


@P.proto("cy_ac", box=(0.5, 1.55, 0.3), reach=220, detail=True)
def _cy_ac(k):
    """An air conditioner over head height on brackets, its fan behind a
    grille, its drain down the wall, the stain under it and the wet it
    leaves on the ground."""
    T = k("trim")
    box(T, -0.42, 0.42, 2.46, 3.04, 0.1, 0.46, scale=1.0, col=OFFWHITE, bottom=True)
    poly(T, [(-0.1 + 0.23 * math.cos(i * math.tau / 8), 2.75 + 0.23 * math.sin(i * math.tau / 8), 0.468) for i in range(8)], [(0, 0)] * 8, (0.02, 0.02, 0.024, 1))
    for q in (((-0.33, 2.735, 0.474), (0.13, 2.735, 0.474), (0.13, 2.765, 0.474), (-0.33, 2.765, 0.474)),
              ((-0.115, 2.52, 0.474), (-0.085, 2.52, 0.474), (-0.085, 2.98, 0.474), (-0.115, 2.98, 0.474))):
        quad(T, *q, col=OFFWHITE)
    for x in (-0.3, 0.3):
        box(T, x - 0.02, x + 0.02, 2.4, 2.46, 0.0, 0.5, scale=1.0, col=STEEL_D, bottom=True)
    box(T, 0.34, 0.37, 0.0, 2.46, 0.0, 0.035, scale=1.0, col=(0.25, 0.25, 0.24, 1))
    quad(T, (0.18, 0.0, 0.025), (0.54, 0.0, 0.025), (0.44, 2.4, 0.025), (0.3, 2.4, 0.025), col=DAMP)
    poly(T, [(0.36 + 0.42 * math.cos(-i * math.tau / 8), 0.025, 0.32 + 0.3 * math.sin(-i * math.tau / 8)) for i in range(8)], [(0, 0)] * 8, DAMP)


@P.proto("cy_meters", box=(0.6, 1.75, 0.12), reach=170, detail=True)
def _cy_meters(k):
    """Meters on a board, their breaker box, the conduits up from them."""
    T = k("trim")
    box(T, -0.52, 0.52, 1.0, 1.95, 0.0, 0.04, scale=1.0, col=(0.09, 0.07, 0.05, 1))
    for x in (-0.32, 0.0, 0.32):
        box(T, x - 0.12, x + 0.12, 1.5, 1.84, 0.04, 0.17, scale=1.0, col=(0.2, 0.2, 0.19, 1), bottom=True)
        quad(T, (x - 0.07, 1.68, 0.176), (x + 0.07, 1.68, 0.176), (x + 0.07, 1.79, 0.176), (x - 0.07, 1.79, 0.176), col=(0.5, 0.5, 0.42, 1))
        box(T, x - 0.018, x + 0.018, 1.84, 3.3 + x * 0.6, 0.05, 0.085, scale=1.0, col=GALV)
    box(T, -0.44, 0.1, 1.06, 1.4, 0.04, 0.15, scale=1.0, col=GALV, bottom=True)


@P.proto("cy_vent", box=(0.4, 1.35, 0.15), reach=170, detail=True)
def _cy_vent(k):
    """A louvred vent under a hood, what has run down the wall from it, and
    a low grille by the ground."""
    T = k("trim")
    box(T, -0.36, 0.36, 2.0, 2.56, 0.0, 0.06, scale=1.0, col=FRAME, bottom=True)
    for i in range(5):
        y = 2.52 - i * 0.1
        quad(T, (-0.31, y - 0.085, 0.13), (0.31, y - 0.085, 0.13), (0.31, y, 0.06), (-0.31, y, 0.06), col=GALV)
    hood = ((-0.4, 2.56, 0.26), (0.4, 2.56, 0.26), (0.4, 2.68, 0.0), (-0.4, 2.68, 0.0))
    quad(T, *hood, col=GALV)
    quad(T, hood[1], hood[0], hood[3], hood[2], col=STEEL_D)
    quad(T, (-0.14, 0.5, 0.025), (0.2, 0.5, 0.025), (0.3, 2.0, 0.025), (-0.3, 2.0, 0.025), col=GREASE)
    box(T, -0.3, 0.3, 0.2, 0.5, 0.0, 0.04, scale=1.0, col=STEEL_D)
    for y in (0.27, 0.35, 0.43):
        quad(T, (-0.26, y - 0.02, 0.045), (0.26, y - 0.02, 0.045), (0.26, y + 0.02, 0.045), (-0.26, y + 0.02, 0.045), col=GALV)


@P.proto("cy_kduct", box=(0.3, 2.95, 0.32), reach=280, detail=True)
def _cy_kduct(k):
    """A kitchen's extract: out of the wall over head height, up it in a
    square duct on straps to a cowl, grease on the wall under it."""
    T = k("trim")
    box(T, -0.2, 0.2, 2.3, 2.7, 0.0, 0.55, scale=1.0, col=GALV, bottom=True)
    box(T, -0.2, 0.2, 2.7, 5.6, 0.15, 0.55, scale=1.0, col=GALV)
    box(T, -0.27, 0.27, 5.6, 5.85, 0.08, 0.62, scale=1.0, col=(0.13, 0.135, 0.14, 1), bottom=True)
    for y in (3.4, 4.7):
        box(T, -0.23, 0.23, y, y + 0.06, 0.0, 0.58, scale=1.0, col=STEEL_D, bottom=True)
    quad(T, (-0.24, 0.8, 0.025), (0.3, 0.8, 0.025), (0.2, 2.3, 0.025), (-0.2, 2.3, 0.025), col=GREASE)


@P.proto("cy_pipes", box=(0.35, 2.3, 0.15), reach=220, detail=True)
def _cy_pipes(k):
    """Three pipes up a wall on straps: a rusted soil pipe, a thin one, one
    that turns into the wall under the first floor; a red valve."""
    T = k("trim")
    cylinder(T, -0.22, 0.13, 0.0, 4.5, 0.06, segs=5, col=RUSTY, cap=False)
    cylinder(T, 0.0, 0.11, 0.3, 4.5, 0.035, segs=5, col=GALV, cap=False)
    cylinder(T, 0.2, 0.12, 0.0, 3.6, 0.045, segs=5, col=(0.1, 0.11, 0.1, 1))
    box(T, 0.155, 0.245, 3.6, 3.69, 0.0, 0.165, scale=1.0, col=(0.1, 0.11, 0.1, 1), bottom=True)
    for y in (0.9, 2.4, 3.9):
        box(T, -0.32, 0.3, y, y + 0.05, 0.0, 0.2, scale=1.0, col=STEEL_D, bottom=True)
    box(T, -0.07, 0.07, 1.25, 1.39, 0.06, 0.25, scale=1.0, col=(0.4, 0.05, 0.04, 1), bottom=True)


@P.proto("cy_ladder", box=(0.4, 1.5, 0.45), reach=280, detail=True)
def _cy_ladder(k):
    """Three metres of a ladder off a wall: stiles, rungs, brackets, a hoop
    of its cage."""
    T = k("trim")
    for x in (-0.22, 0.22):
        box(T, x - 0.02, x + 0.02, 0.0, 3.0, 0.2, 0.25, scale=1.0, col=GALV)
        for y in (0.4, 1.9):
            box(T, x - 0.02, x + 0.02, y, y + 0.04, 0.0, 0.2, scale=1.0, col=GALV, bottom=True)
    for i in range(10):
        y = 0.15 + i * 0.3
        quad(T, (-0.2, y, 0.24), (0.2, y, 0.24), (0.2, y + 0.035, 0.24), (-0.2, y + 0.035, 0.24), col=GALV)
    hoop = [(0.3 * math.cos(i * math.pi / 4), 0.25 + 0.55 * math.sin(i * math.pi / 4)) for i in range(5)]
    for (xa, za), (xb, zb) in zip(hoop, hoop[1:]):
        q = ((xa, 1.5, za), (xb, 1.5, zb), (xb, 1.55, zb), (xa, 1.55, za))
        quad(T, *q, col=GALV)
        quad(T, q[1], q[0], q[3], q[2], col=GALV)


def put(name, f, s, y=G0, sy=1.0, sxz=1.0):
    x, _, z = f.p(f.at(s), y, 0.0)
    P.place(name, x, y, z, f.yaw, sy, sxz, district=CB)


def lens(f, hue, s0, s1, y0, y1, w0, w1):
    """A lamp's lens under its hood: its front and its underside."""
    k = (CB, "neon_" + hue, 0)
    f.quad(k, s0, s1, y0, y1, w1)
    a, b = f.at(s0), f.at(s1)
    quad(k, f.p(b, y0, w1), f.p(a, y0, w1), f.p(a, y0, w0), f.p(b, y0, w0))


def door(f, sc, r):
    f.quad((CB, "door", 0), sc - 0.475, sc + 0.475, G0, G0 + 2.1, 0.03)
    put("cy_door", f, sc)
    hue = "amber" if r.random() < 0.75 else "white"
    lens(f, hue, sc - 0.11, sc + 0.11, G0 + 2.4, G0 + 2.56, 0.06, 0.2)
    if r.random() < 0.3:
        # A bar's back door: a tube over it.
        hue = r.choice(("cyan", "cyan", "green", "red", "yellow"))
        f.box((CB, "neon_" + hue, 0), sc - 0.7, sc + 0.7, G0 + 2.78, G0 + 2.85, 0.03, 0.09)
    light(CB, *f.p(f.at(sc), 2.6, 0.9), hue, 3.2)
    x, _, z = f.p(f.at(sc), 0.0, 0.6)
    C.DOORS.append((x, z))


def window(f, s0, r, kind):
    """A back room's window: its glass a hair proud of the wall with the
    room behind it, or dark; its frame, sill and bars or blind over it."""
    ww, wh, y0 = kind
    if r.random() < 0.65:
        col = (r.uniform(0.0, 0.55), r.choice((0.2, 0.26, 0.32, 0.38, 0.6, 0.8, 0.95)), 1.0, 1.0)
        f.quad((CB, "shop", 0), s0, s0 + ww, y0, y0 + wh, 0.02, uvs=((1.0, 0.9), (1.0 + ww, 0.9), (1.0 + ww, 0.9 + wh), (1.0, 0.9 + wh)), col=col)
    else:
        f.quad((CB, "glow", 0), s0, s0 + ww, y0, y0 + wh, 0.02, col=(0.0035, 0.005, 0.007, 1))
    put("cy_win" if r.random() < 0.6 else "cy_win_b", f, s0 + ww / 2, y0, wh, ww)


def shutter(f, s0, sw):
    k = (CB, "metal", 1)
    f.quad((CB, "door_panel", 0), s0, s0 + sw, G0, 2.9, 0.03)
    f.box(k, s0 - 0.1, s0 + sw + 0.1, 2.9, 3.2, 0.0, 0.26)
    for e in (s0 - 0.09, s0 + sw):
        f.box(k, e, e + 0.09, G0, 2.9, 0.0, 0.1)
    f.box((CB, "hazard", 1), s0, s0 + sw, G0, G0 + 0.12, 0.03, 0.07)
    mid = s0 + sw / 2
    lens(f, "white", mid - 0.2, mid + 0.2, 3.36, 3.46, 0.05, 0.18)
    f.box(k, mid - 0.26, mid + 0.26, 3.46, 3.5, 0.0, 0.24)
    light(CB, *f.p(f.at(mid), 3.3, 0.9), "white", 2.4)


def wall(f, r, top=SHOP_H, ends=0.0, upper=None):
    """The ground floor of a back or an alley wall (see the module's note).
    `ends`: how far in from each end only what lies flat on the wall is set
    (an alley's mouth, a lane's crossing). `upper`: the wall's height, where
    a ladder may climb it."""
    w = f.width
    f.quad((CB, "plaster", 0), 0.0, w, 0.0, top, 0.0, col=r.choice(WALLS))
    f.box((CB, "trim", 1), 0.0, w, 0.0, 0.9, 0.0, 0.06, col=(0.17, 0.175, 0.19, 1))
    k = (CB, "metal", 1)
    f.box(k, 0.15, w - 0.15, G0 + 3.05, G0 + 3.1, 0.02, 0.07)
    if r.random() < 0.6:
        a = r.uniform(0.2, w * 0.4)
        f.box(k, a, r.uniform(w * 0.6, w - 0.2), G0 + 3.22, G0 + 3.26, 0.02, 0.06)
    s = r.uniform(0.3, 0.9)
    doors, last_door, ladder = 0, -9.0, upper is not None and w > 6.0 and r.random() < 0.35
    lamp = -3.0
    while s < w - 0.7:
        room = w - 0.3 - s
        if s - lamp > 6.5:
            hue = "amber" if r.random() < 0.7 else r.choice(("white", "cyan"))
            lens(f, hue, s + 0.14, s + 0.36, G0 + 2.82, G0 + 2.98, 0.05, 0.2)
            f.box(k, s + 0.08, s + 0.42, G0 + 2.98, G0 + 3.05, 0.0, 0.26)
            light(CB, *f.p(f.at(s + 0.25), 2.8, 0.9), hue, 3.0)
            lamp = s
            s += 0.6
            continue
        flat = s < ends or s > w - ends - 1.2
        roll = r.random()
        if (roll < 0.16 or (doors == 0 and s > w * 0.35)) and room > 1.35 and s - last_door > 4.0:
            door(f, s + 0.65, r)
            doors, last_door, lamp = doors + 1, s, s
            s += 1.3
        elif roll < 0.42 and room > 1.3:
            kind = r.choice([wk for wk in WINDOWS if wk[0] + 0.25 < room])
            window(f, s + 0.12, r, kind)
            s += kind[0] + 0.25
        elif roll < 0.5 and room > 3.4 and not flat:
            sw = r.uniform(2.6, min(3.6, room - 0.3))
            shutter(f, s + 0.15, sw)
            lamp = s + sw / 2
            s += sw + 0.3
        elif roll < 0.61 and room > 1.0 and not flat:
            put("cy_ac", f, s + 0.5, sy=r.uniform(0.92, 1.12))
            s += 1.0
        elif roll < 0.69 and room > 1.2:
            put("cy_meters", f, s + 0.6)
            s += 1.2
        elif roll < 0.76 and room > 0.9:
            put("cy_vent", f, s + 0.42)
            # (Every third vent breathes: a wisp gone by the lintel.)
            if len(VENTS) % 3 == 0:
                C.steam("lane", *f.p(f.at(s + 0.42), 2.3, 0.16), most=18)
            VENTS.append(s)
            s += 0.85
        elif roll < 0.82 and room > 0.8 and not flat:
            put("cy_kduct", f, s + 0.35)
            if len(VENTS) % 2 == 0:
                C.steam("lane", *f.p(f.at(s + 0.35), 5.86, 0.35), most=18)
            VENTS.append(s)
            s += 0.7
        elif roll < 0.92 and room > 0.9:
            put("cy_pipes", f, s + 0.4)
            s += 0.8
        elif ladder and room > 1.0 and not flat:
            n = max(1, math.ceil((upper - 2.7) / 3.0))
            for i in range(n):
                put("cy_ladder", f, s + 0.45, 2.7 + i * (upper - 2.7) / n, sy=(upper - 2.7) / (3.0 * n))
            ladder = False
            s += 0.9
        else:
            s += 0.5
        s += r.uniform(0.2, 0.8)
    if r.random() < 0.5 and w > 4.0:
        a = r.uniform(0.5, w - 3.0)
        f.box((CB, "neon_" + r.choice(("cyan", "amber", "yellow", "green", "teal")), 0), a, a + r.uniform(1.6, 2.6), top + 0.25, top + 0.33, 0.03, 0.09)
