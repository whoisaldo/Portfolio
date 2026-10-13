"""Kabuki Avenue's upper storeys: what a lived-in wall carries over its shops.

The generator's facades are window cells in a shader, the same cut floor
after floor, and from across a street the wall over the shops reads as one
grid on a dark plane. Here a share of those cells become windows with depth
(a frame, a sill, the room lit behind curtains or blinds in its own colour,
a fan or a unit in the frame, a dark one boarded), with what a window
collects round it (a condenser on a bracket and the stain it drips, a pot
on the sill, a line of washing to the next window), conduit and downpipes
between them, and balconies with things on them. Each face draws its own
mix, so no two walls on a block run the same way (Fn9gKhU_2_Q@38,
x4ztgjvfU60@18, ax5YUmkWf_Y@111).

Nothing here is in the hero's frame: the arm, the south street's row, the
lanes' walls, the blocks behind (all the south pack).
"""
import random  # noqa: F401

from ncw.kit import *  # noqa: F401,F403
from ncw import props as P
from ncw.districts import avenue_kit as K
from ncw.districts import avenue_street as ST

CURTAIN = ((0.5, 0.12, 0.2), (0.12, 0.35, 0.4), (0.55, 0.38, 0.12), (0.3, 0.14, 0.45), (0.5, 0.45, 0.38), (0.12, 0.3, 0.15), (0.55, 0.2, 0.08))
ROOM = ((1.0, 0.62, 0.32), (0.75, 0.85, 1.0), (1.0, 0.8, 0.55), (0.55, 1.0, 0.85), (1.0, 0.45, 0.6), (0.7, 0.55, 1.0))
FRAME = ((0.04, 0.04, 0.045, 1), (0.16, 0.16, 0.15, 1), (0.08, 0.1, 0.1, 1), (0.2, 0.12, 0.08, 1))
STAIN = (0.012, 0.012, 0.014, 1)


def _taken(f):
    """What already hangs on face f: (where along it, height, half width,
    half height), from what avenue_street recorded and the condensers and
    downpipes the generator stood on it."""
    out = [t[2:] for t in ST.SIGNED + ST.UPPER if t[0] == f.name and abs(t[1] - f.plane) < 1e-6]
    for (name, x, y, z, *_r) in P.INSTANCES:
        if name in ("ac_wall", "pipe_v") and abs((x if f.nx else z) - f.plane) < 0.05:
            out.append((z if f.nx else x, y + (0.3 if name == "ac_wall" else 6.0), 0.55, 0.4 if name == "ac_wall" else 6.0))
    return out


def window(D, f, s, y, bw, rng, kind, room, curtain):
    """One window with depth in a facade's cell: s along the face, y the
    floor it is on, bw the bay's width."""
    w = min(1.5, bw * 0.62)
    y0, y1 = y + 0.85, y + 2.75
    s0, s1 = s - w / 2, s + w / 2
    fc = rng.choice(FRAME)
    # Its frame, standing a hand proud, and its sill.
    for (a0, a1, b0, b1) in ((s0 - 0.08, s1 + 0.08, y1, y1 + 0.08), (s0 - 0.08, s0, y0, y1), (s1, s1 + 0.08, y0, y1)):
        f.box((D, "trim", 1), a0, a1, b0, b1, 0.0, 0.1, col=fc)
    f.box((D, "trim", 1), s0 - 0.14, s1 + 0.14, y0 - 0.1, y0, 0.0, 0.2, col=fc)
    lit = tuple(c * rng.uniform(0.25, 0.5) for c in room) + (1,)
    if kind == "curtain":
        f.quad((D, "glow", 0), s0, s1, y0, y1, 0.03, col=lit)
        # Drawn across most of it, from one side or both.
        cc = tuple(c * rng.uniform(0.25, 0.45) for c in curtain) + (1,)
        if rng.random() < 0.5:
            cut = rng.uniform(0.25, 0.6)
            f.quad((D, "glow", 0), s0, s0 + w * cut, y0, y1, 0.04, col=cc)
        else:
            gap = rng.uniform(0.1, 0.35) * w
            f.quad((D, "glow", 0), s0, s - gap / 2, y0, y1, 0.04, col=cc)
            f.quad((D, "glow", 0), s + gap / 2, s1, y0, y1, 0.04, col=cc)
    elif kind == "blind":
        f.quad((D, "glow", 0), s0, s1, y0, y1, 0.03, col=lit)
        down = rng.uniform(0.3, 0.9)
        yy = y1
        while yy > y1 - (y1 - y0) * down:
            f.box((D, "trim", 1), s0, s1, yy - 0.06, yy, 0.035, 0.05, col=(0.18, 0.17, 0.15, 1))
            yy -= 0.13
    elif kind == "unit":
        # Dark, a condenser in its lower half, a board over the rest.
        f.quad((D, "glass_dark", 1), s0, s1, y0, y1, 0.02)
        f.box((D, "trim", 1), s0 + 0.05, s1 - 0.05, y0, y0 + 0.75, 0.02, 0.45, col=(0.36, 0.36, 0.34, 1))
        f.box((D, "dark", 1), s0 + 0.15, s1 - 0.15, y0 + 0.12, y0 + 0.62, 0.45, 0.46)
        f.quad((D, "trim", 1), s0, s1, y0 + 0.75, y1, 0.025, col=(0.12, 0.1, 0.08, 1))
    elif kind == "fan":
        f.quad((D, "glow", 0), s0, s1, y0, y1, 0.03, col=lit)
        f.box((D, "trim", 1), s - 0.3, s + 0.3, y0 + 0.9, y0 + 1.5, 0.03, 0.12, col=(0.2, 0.2, 0.2, 1))
        f.box((D, "dark", 1), s - 0.24, s + 0.24, y0 + 0.96, y0 + 1.44, 0.12, 0.13)
    else:
        # Boarded: planks over it.
        f.quad((D, "trim", 1), s0, s1, y0, y1, 0.03, col=(0.13, 0.09, 0.05, 1))
        for k in range(3):
            yy = y0 + 0.3 + k * 0.6
            f.box((D, "trim", 1), s0 - 0.05, s1 + 0.05, yy, yy + 0.16, 0.03, 0.07, col=(0.17, 0.12, 0.07, 1))
    # What a window collects: a pot on the sill, a stain under it.
    if kind in ("curtain", "blind") and rng.random() < 0.35:
        f.box((D, "trim", 1), s1 - 0.4, s1 - 0.1, y0, y0 + 0.22, 0.05, 0.22, col=(0.25, 0.1, 0.06, 1))
        f.box((D, "trim", 1), s1 - 0.42, s1 - 0.08, y0 + 0.22, y0 + 0.5, 0.06, 0.24, col=rng.choice(ST.LEAF))
    if rng.random() < 0.5:
        f.quad((D, "trim", 1), s0 + rng.uniform(0.0, w * 0.5), s0 + rng.uniform(w * 0.55, w), y0 - rng.uniform(0.6, 1.6), y0 - 0.1, 0.006, col=STAIN)


def unit_stain(D, f, s, y, rng):
    """A condenser on its bracket and the stain it drips down the wall."""
    px, py, pz = f.p(f.at(s), y, 0.0)
    P.place("ac_wall", px, py, pz, f.yaw, district=D)
    f.quad((D, "trim", 1), s - 0.1, s + 0.1, y - rng.uniform(1.0, 2.6), y, 0.006, col=STAIN)


def dress(D, f, y0, y1, rng, rate=0.3, units=0.08, conduit=True, washing=0.35):
    """A face's storeys from y0 to y1: windows with depth in about `rate` of
    its cells (each face its own mix of kinds and colours), condensers in
    `units` of the rest, conduit up the wall and across it, washing across
    from window to window."""
    bays = max(1, round(f.width / CELL_W))
    bw = f.width / bays
    floors = int((y1 - SHOP_H) / CELL_H)
    taken = _taken(f)
    # This wall's own habit: which kinds of window it runs to, its lit
    # colours, its curtains, a band of floors more lived in than the rest.
    kinds = ["curtain", "blind", "unit", "fan", "boarded"]
    weights = [rng.uniform(1.0, 4.0), rng.uniform(0.5, 3.0), rng.uniform(0.3, 1.5), rng.uniform(0.2, 1.0), rng.uniform(0.0, 0.6)]
    rooms = rng.sample(ROOM, 2)
    curtains = rng.sample(CURTAIN, 3)
    band = (rng.randrange(0, max(1, floors)), rng.randrange(2, 6))
    sills = []

    def free(a, y, hw, hh):
        return all(abs(a - ta) > hw + thw + 0.2 or abs(y - ty) > hh + thh + 0.2 for ta, ty, thw, thh in taken)
    for fl in range(floors):
        y = SHOP_H + fl * CELL_H
        if y < y0 - 0.1 or y + CELL_H > y1 + 0.1:
            continue
        r_here = rate * (1.6 if band[0] <= fl < band[0] + band[1] else 0.8)
        for b in range(bays):
            s = (b + 0.5) * bw
            a = f.at(s)
            roll = rng.random()
            if roll < r_here and free(a, y + 1.8, bw * 0.35, 1.0):
                kind = rng.choices(kinds, weights=weights)[0]
                window(D, f, s, y, bw, rng, kind, rng.choice(rooms), rng.choice(curtains))
                taken.append((a, y + 1.8, bw * 0.35, 1.0))
                if kind in ("curtain", "blind"):
                    sills.append((s, y))
            elif roll < r_here + units and free(a, y + 0.5, 0.5, 0.4):
                unit_stain(D, f, s + rng.uniform(-0.4, 0.4), y + 0.05, rng)
                taken.append((a, y + 0.5, 0.5, 0.4))
    # Conduit: a run up the wall at a bay line and along under a floor line,
    # a box where they meet.
    if conduit and floors >= 2:
        for _ in range(rng.randrange(1, 3)):
            s = rng.randrange(1, bays) * bw if bays > 1 else bw * 0.1
            yt = SHOP_H + CELL_H * rng.randrange(1, floors) + 0.15
            p0, p1 = f.p(f.at(s), SHOP_H, 0.08), f.p(f.at(s), yt, 0.08)
            pipe((D, "metal", 1), p0, p1, 0.03, segs=4)
            sa = max(0.2, s - rng.uniform(2.0, 6.0)) if rng.random() < 0.5 else min(f.width - 0.2, s + rng.uniform(2.0, 6.0))
            pipe((D, "metal", 1), f.p(f.at(sa), yt, 0.08), p1, 0.03, segs=4)
            f.box((D, "steel", 1), s - 0.18, s + 0.18, yt - 0.2, yt + 0.2, 0.0, 0.14, col=(0.2, 0.21, 0.2, 1))
    # Washing across between two lit windows on a floor.
    for (sa, ya), (sb, yb) in zip(sills, sills[1:]):
        if abs(ya - yb) < 0.1 and 0.5 < abs(sb - sa) < 7.0 and rng.random() < washing:
            pa, pb = f.p(f.at(sa), ya + 2.6, 0.35), f.p(f.at(sb), ya + 2.6, 0.35)
            K.laundry(D, pa, pb, rng, sag=0.25)


def far_wall(D, f, a0, a1, rng, skip=(), used=()):
    """Up the wall across a lane that is another district's back (its own
    windows its own): what is fixed to it over the lane's stalls and
    machines, from 3.5 m up to 12 m, a thing every few metres: condensers
    one over another and their stains, a downpipe, a duct with its lamps,
    pipes on brackets, a cable tray, bills, a board, a caged lamp; and at a
    walker's height where nothing of the lane's stands against it, meters
    and their conduit, bills, a grilled vent. `a0`, `a1`: the stretch along
    it (world), `skip`: stretches left alone, `used`: stretches the lane's
    stalls and machines stand against."""
    lo, hi = sorted((abs(a0 - f.left), abs(a1 - f.left)))
    s = lo + rng.uniform(1.0, 3.0)
    last = ""
    while s < hi - 2.0:
        a = f.at(s)
        if any(k0 - 2.0 < a < k1 + 2.0 for k0, k1 in skip):
            s += 2.0
            continue
        kind = rng.choices(("units", "pipe", "duct", "pipes", "tray", "bills", "board", "lamp"), weights=(3.0, 1.2, 1.2, 1.4, 1.0, 1.4, 1.2, 1.0))[0]
        if kind == last:
            kind = "units"
        last = kind
        step = rng.uniform(3.0, 6.0)
        if kind == "units":
            n = rng.randrange(2, 4)
            y0 = rng.uniform(4.0, 6.5)
            for k in range(n):
                unit_stain(D, f, s + rng.uniform(-0.2, 0.2), y0 + k * CELL_H, rng)
            px, _, pz = f.p(f.at(s + 0.6), 0.0, 0.0)
            P.place("pipe_v", px, G0_, pz, f.yaw, sy=y0 + (n - 1) * CELL_H + 0.5, district=D)
        elif kind == "pipe":
            px, _, pz = f.p(a, 0.0, 0.0)
            P.place("pipe_v", px, G0_, pz, f.yaw, sy=rng.uniform(9.0, 13.0), district=D)
        elif kind == "duct":
            ln = rng.uniform(3.0, 6.0)
            K.duct(D, f, s, min(hi - 0.5, s + ln), rng.uniform(4.2, 6.0), rng)
            step = ln + 1.0
        elif kind == "pipes":
            ln = rng.uniform(4.0, 9.0)
            K.pipes_run(D, f, s, min(hi - 0.5, s + ln), rng.uniform(3.8, 7.5), rng, n=rng.choice((2, 3)))
            step = ln + 1.0
        elif kind == "tray":
            ln = rng.uniform(4.0, 8.0)
            y = rng.uniform(5.0, 8.0)
            f.box((D, "metal", 1), s, min(hi - 0.5, s + ln), y, y + 0.08, 0.1, 0.5)
            f.box((D, "dark", 1), s, min(hi - 0.5, s + ln), y + 0.08, y + 0.2, 0.15, 0.45)
            step = ln + 1.0
        elif kind == "bills":
            for k in range(rng.randrange(2, 4)):
                K.poster(D, f, s + k * 0.8, rng.uniform(3.6, 4.4), 0.6, 0.85, rng, out=0.02)
        elif kind == "board":
            K.board(D, f, s, rng.uniform(4.5, 7.0), rng.choice(("pm", "ps", "bm")), out=0.12, roll=rng.uniform(-0.04, 0.04))
        else:
            K.wall_lamp(D, f, s, rng.uniform(3.6, 4.4), rng.choice(("amber", "white", "cyan")), power=4.0)
        # Down at a walker's height, where the wall is bare.
        sl = s + step / 2
        al = f.at(sl)
        if not any(u0 < al < u1 for u0, u1 in used) and not any(k0 - 2.0 < al < k1 + 2.0 for k0, k1 in skip) and sl < hi - 1.0:
            low = rng.choice(("meters", "bills", "vent", "meters", "bills"))
            if low == "meters":
                for k in range(rng.randrange(2, 4)):
                    f.box((D, "steel", 1), sl + k * 0.42 - 0.17, sl + k * 0.42 + 0.17, 1.35, 1.85, 0.0, 0.16, col=(0.3, 0.31, 0.3, 1))
                    f.box((D, "glow", 1), sl + k * 0.42 - 0.05, sl + k * 0.42 + 0.05, 1.7, 1.76, 0.16, 0.17, col=GLOW[rng.choice(("green", "red", "amber"))])
                p0, p1 = f.p(f.at(sl + 0.4), 1.85, 0.06), f.p(f.at(sl + 0.4), 3.3, 0.06)
                pipe((D, "metal", 1), p0, p1, 0.035, segs=4)
            elif low == "bills":
                for k in range(rng.randrange(2, 5)):
                    K.poster(D, f, sl + k * 0.72, rng.uniform(1.45, 1.75), 0.58, rng.uniform(0.75, 0.95), rng, out=0.015)
            else:
                f.box((D, "metal", 1), sl - 0.45, sl + 0.45, 2.1, 2.7, 0.0, 0.06)
                K.grille(D, f, sl - 0.4, sl + 0.4, 2.15, 2.65, out=0.06)
                f.quad((D, "trim", 1), sl - 0.3, sl + 0.3, 0.4, 2.1, 0.006, col=STAIN)
        s += step


G0_ = 0.15
