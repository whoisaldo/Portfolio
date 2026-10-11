"""The avenue's south end: Santo Domingo's yard behind its wall.

The south arm ends against an industrial yard, and the end of a street is a
view: a concrete wall under a pipe rack, a gate with one leaf run back and
the yard road going on through it to a shed with its door open and lit, a
guard's booth, a stall that feeds the shift; and over the wall what stands
in the yard, each further back and taller than the last: container stacks,
tanks, a gantry crane with its lamps, two chimneys banded red and white with their lamps and their steam, the far
city behind them. (Santo Domingo's power lines are its own district's.) Behind the arm's lots and the south street's row, the
blocks nobody walks along: low works and stores round courts, seen from
roofs and from the air.
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import avenue_kit as K

G0 = B.G0
WALL_Z = 92.0
EDGE_Z = 120.0
X0, X1 = -66.0, 108.0
GATE = (-7.0, 7.0)
BOX_COLOURS = [(0.3, 0.07, 0.04, 1), (0.05, 0.13, 0.26, 1), (0.07, 0.2, 0.12, 1), (0.34, 0.2, 0.04, 1), (0.2, 0.2, 0.22, 1),
               (0.26, 0.05, 0.1, 1), (0.05, 0.2, 0.22, 1), (0.3, 0.27, 0.2, 1)]
CRANE = (0.42, 0.26, 0.03, 1)
STEEL = (0.09, 0.095, 0.105, 1)
WORKS = dict(windows=(2, 3, 6), lit=(0.25, 0.6), warmth=(0.4, 1.0), tints=("rust", "brown", "concrete", "charcoal"),
             balcony=0.0, ac=0.2, signs=0.0, roof_cap=6.0, setback=0.0, fire_escape=0.2, cornice=0.3, roof_sign=0.6)


def wash(D, x0, x1, z0, z1, hues, power, rng, step=6.0, y=2.0):
    """Floodlight over an area: pools a few metres apart, uneven."""
    x = x0 + step / 2
    while x < x1:
        z = z0 + step / 2
        while z < z1:
            light(D, x + rng.uniform(-1.5, 1.5), y, z + rng.uniform(-1.5, 1.5), rng.choice(hues), power * rng.uniform(0.6, 1.3))
            z += step
        x += step


def containers(D, x, z, along, n_long, n_wide, rng, high=(1, 4)):
    """Stacks of boxes side by side: `along` "x" or "z" is their length."""
    L, Wd, H = 6.1, 2.44, 2.6
    for i in range(n_long):
        for j in range(n_wide):
            u, v = i * (L + 0.35), j * (Wd + 0.2)
            for k in range(rng.randrange(high[0], high[1] + 1)):
                col = rng.choice(BOX_COLOURS)
                o = rng.uniform(-0.08, 0.08)
                if along == "x":
                    box((D, "trim", 0), x + u + o, x + u + L + o, k * H, k * H + H - 0.04, z + v, z + v + Wd, scale=2.0, col=col)
                else:
                    box((D, "trim", 0), x + v, x + v + Wd, k * H, k * H + H - 0.04, z + u + o, z + u + L + o, scale=2.0, col=col)


def flood_mast(D, x, z, h, hue="white", power=8.0, toward=(0.0, -1.0)):
    """A floodlight mast: a pole, a rack of lamps at its head, their pool."""
    cylinder((D, "metal", 0), x, z, 0.0, h, 0.14, segs=6, cap=False)
    box((D, "metal", 1), x - 1.1, x + 1.1, h, h + 0.9, z - 0.12, z + 0.12, scale=0.5)
    for dx in (-0.8, -0.27, 0.27, 0.8):
        for dy in (0.12, 0.55):
            box((D, "glow", 0), x + dx - 0.2, x + dx + 0.2, h + dy, h + dy + 0.3, z + toward[1] * 0.13 - 0.02, z + toward[1] * 0.13 + 0.02,
                scale=0.5, col=GLOW[hue])
    for k in (3.0, 9.0):
        light(D, x + toward[0] * k, 2.0, z + toward[1] * k, hue, power)


def tank(D, x, z, r, h, rng):
    col = rng.choice(((0.2, 0.2, 0.21, 1), (0.24, 0.22, 0.18, 1), (0.16, 0.18, 0.2, 1)))
    cylinder((D, "trim", 0), x, z, 0.0, h, r, segs=14, col=col)
    for y in (h * 0.33, h * 0.66):
        cylinder((D, "dark", 1), x, z, y, y + 0.22, r + 0.04, segs=14, cap=False)
    cylinder((D, "metal", 1), x, z, h, h + 1.0, r - 0.15, segs=14, cap=False)
    box((D, "metal", 1), x - 0.3, x + 0.3, 0.0, h + 1.0, z - r - 0.14, z - r - 0.04, scale=0.5)
    box((D, "glow", 0), x - 0.12, x + 0.12, h + 1.0, h + 1.25, z - 0.12, z + 0.12, scale=0.5, col=GLOW["red"])
    # A band of light under its rim, the yard's colour on its flank.
    hue = rng.choice(("amber", "cyan", "amber"))
    cylinder((D, "neon_" + hue, 0), x, z, h - 0.5, h - 0.38, r + 0.05, segs=14, cap=False)
    for t in range(6):
        a = t * math.tau / 6 + 0.3
        light(D, x + math.cos(a) * (r + 1.2), 1.0, z + math.sin(a) * (r + 1.2), hue, 7.0)


def chimney(D, name, x, z, r, h):
    """A stack: concrete to three quarters of its height, then banded red
    and white, a gallery, lamps, and its plume (the site draws it)."""
    y = h * 0.72
    cylinder((D, "trim", 0), x, z, 0.0, y, r, segs=10, col=(0.17, 0.17, 0.18, 1), cap=False)
    bh = (h - y) / 5
    for i in range(5):
        col = (0.5, 0.06, 0.04, 1) if i % 2 == 0 else (0.5, 0.5, 0.48, 1)
        cylinder((D, "trim", 0), x, z, y + i * bh, y + (i + 1) * bh, r * (1.0 - 0.03 * i), segs=10, col=col, cap=i == 4)
    cylinder((D, "metal", 1), x, z, y - 0.2, y, r + 0.7, segs=10)
    cylinder((D, "metal", 1), x, z, y, y + 1.0, r + 0.68, segs=10, cap=False)
    for t in range(4):
        a = t * math.pi / 2 + 0.4
        for yy in (y + 1.1, h - 0.4):
            box((D, "glow", 0), x + math.cos(a) * (r + 0.1) - 0.14, x + math.cos(a) * (r + 0.1) + 0.14, yy, yy + 0.28,
                z + math.sin(a) * (r + 0.1) - 0.14, z + math.sin(a) * (r + 0.1) + 0.14, scale=0.5, col=GLOW["red"])
    # Rings of red lamps at the top and under the bands, the gallery lit,
    # a string of lamps up its two ladders, floods at its foot.
    for yy in (h - 0.5, y + (h - y) * 0.5, y - 0.9):
        cylinder((D, "glow", 0), x, z, yy, yy + 0.3, r + 0.08, segs=10, cap=False, col=GLOW["red"])
    cylinder((D, "glow", 0), x, z, y + 0.95, y + 1.07, r + 0.7, segs=10, cap=False, col=GLOW["amber"])
    yy = 4.0
    while yy < y - 2.0:
        for a in (0.9, 0.9 + math.pi):
            box((D, "glow", 0), x + math.cos(a) * (r + 0.05) - 0.1, x + math.cos(a) * (r + 0.05) + 0.1, yy, yy + 0.22,
                z + math.sin(a) * (r + 0.05) - 0.1, z + math.sin(a) * (r + 0.05) + 0.1, scale=0.5, col=GLOW["white"])
        yy += 4.5
    for t in range(5):
        a = t * math.tau / 5
        light(D, x + math.cos(a) * (r + 1.8), 1.0, z + math.sin(a) * (r + 1.8), "amber", 9.0)
    empty(f"anchor_steam_roof_{name}", (x, h + 0.3, z))


def crane(D, xa, xb, za, zb, h, xt, rng):
    """A gantry crane astride the stacks: four legs on two sills, twin
    girders, the trolley and its cab, a box on the hook, lamps under the
    girders, hazard paint at the legs' feet."""
    k = (D, "trim", 0)
    for x in (xa, xb):
        box(k, x - 0.45, x + 0.45, 0.3, 1.1, za - 1.0, zb + 1.0, scale=1.0, col=CRANE)
        for z in (za, zb):
            box(k, x - 0.35, x + 0.35, 1.1, h, z - 0.35, z + 0.35, scale=1.0, col=CRANE)
            box((D, "hazard", 1), x - 0.37, x + 0.37, 1.1, 3.2, z - 0.37, z + 0.37, scale=0.7)
        box(k, x - 0.3, x + 0.3, h - 1.0, h, za, zb, scale=1.0, col=CRANE)
    zm = (za + zb) / 2
    for z in (zm - 1.8, zm + 1.8):
        box(k, xa - 3.0, xb + 3.0, h, h + 1.5, z - 0.4, z + 0.4, scale=1.0, col=CRANE)
    box((D, "trim", 0), xt - 1.6, xt + 1.6, h + 0.2, h + 2.0, zm - 1.5, zm + 1.5, scale=1.0, col=STEEL)
    box((D, "glass_dark", 1), xt + 1.6, xt + 3.4, h - 2.2, h - 0.2, zm - 1.0, zm + 1.0, scale=1.0)
    quad((D, "glow", 0), (xt + 1.62, h - 1.9, zm - 0.8), (xt + 1.62, h - 1.9, zm + 0.8), (xt + 1.62, h - 0.6, zm + 0.8), (xt + 1.62, h - 0.6, zm - 0.8),
         col=tuple(v * 0.25 for v in GLOW["amber"][:3]) + (1,))
    hy = rng.uniform(7.5, 10.0)
    for dx in (-2.6, 2.6):
        for dz in (-1.0, 1.0):
            pipe((D, "dark", 1), (xt + dx, h + 0.2, zm + dz), (xt + dx, hy + 2.9, zm + dz), 0.025, segs=3)
    box((D, "trim", 0), xt - 3.1, xt + 3.1, hy + 2.6, hy + 2.9, zm - 1.25, zm + 1.25, scale=1.0, col=(0.5, 0.36, 0.03, 1))
    box((D, "trim", 0), xt - 3.05, xt + 3.05, hy, hy + 2.56, zm - 1.22, zm + 1.22, scale=2.0, col=rng.choice(BOX_COLOURS))
    for x in (xa + 4.0, (xa + xb) / 2, xb - 4.0):
        box((D, "glow", 0), x - 0.5, x + 0.5, h - 0.12, h, zm - 2.3, zm - 2.1, scale=0.5, col=GLOW["white"])
        light(D, x, 2.0, zm - 4.0, "white", 7.0)
    for x in (xa - 3.0, xb + 3.0):
        box((D, "glow", 0), x - 0.2, x + 0.2, h + 1.5, h + 1.9, zm - 0.2, zm + 0.2, scale=0.5, col=GLOW["red"])
    # A line of light under each girder and up each leg: the crane drawn in
    # its own lamps.
    for z in (zm - 1.8, zm + 1.8):
        box((D, "glow", 0), xa - 2.5, xb + 2.5, h - 0.06, h, z - 0.08, z + 0.08, scale=0.5, col=GLOW["amber"])
    for x in (xa, xb):
        for z in (za, zb):
            box((D, "glow", 0), x - 0.05, x + 0.05, 3.4, h - 1.2, z - 0.4, z - 0.36, scale=0.5, col=GLOW["white"])
            light(D, x, 2.0, z, "white", 7.0)


def blocks(D, x0, x1, z0, z1, rng, step=19.0, alley=3.0, heights=(8.5, 25.5)):
    """Works and stores round courts, an alley between each: windows on
    every side, a back's doors and lamps at the foot, roofs dressed."""
    B.ground_rect(D, x0, x1, z0, z1)
    x = x0
    while x < x1 - 7:
        w = min(rng.uniform(step * 0.75, step * 1.3), x1 - x)
        if x1 - (x + w) < 8:
            w = x1 - x
        z = z0
        while z < z1 - 7:
            d = min(rng.uniform(step * 0.7, step * 1.2), z1 - z)
            if z1 - (z + d) < 8:
                d = z1 - z
            lot = B.Lot(x + alley / 2, x + w - alley / 2, z + alley / 2, z + d - alley / 2, "+z",
                        {"+x": "back", "-x": "back", "+z": "back", "-z": "back"}, {}, D)
            h = B.SHOP_H + B.CELL_H * round((rng.uniform(*heights) - B.SHOP_H) / B.CELL_H)
            B.building(lot, h, rng, style=WORKS, signs=False, ground="blank")
            # Lamps down the alleys either side, so the courts read from
            # the air: amber mostly, a cyan or a pink door among them.
            for t in range(1, int(d // 6) + 1):
                light(D, x + w + rng.uniform(-0.6, 0.6), 3.0, z + t * d / (int(d // 6) + 1), rng.choice(("amber", "amber", "cyan", "white", "pink")), rng.uniform(4.0, 7.0))
            for t in range(1, int(w // 6) + 1):
                light(D, x + t * w / (int(w // 6) + 1), 3.0, z + d + rng.uniform(-0.6, 0.6), rng.choice(("amber", "amber", "cyan", "white", "green")), rng.uniform(4.0, 7.0))
            z += d
        x += w


def build(D):
    rng = random.Random(4417)
    # Behind the arm's lots and the south street's row, to the yard's wall.
    blocks(D, X0, -50.0, 48.0, WALL_Z, random.Random(4421), step=15.0, heights=(8.5, 22.0))
    blocks(D, 50.0, X1, 48.0, WALL_Z, random.Random(4422))
    # The pavement across the arm's end, the alleys either side of it to the
    # lanes, and the yard's own ground: wet, under floods.
    B.ground_rect(D, -50.0, 50.0, 88.0, WALL_Z)
    ground((D, "asphalt", 0), X0, X1, WALL_Z + 0.3, EDGE_Z, y=0.0, scale=6.0)
    # The gate's crossing over the pavement, hatched at its edges.
    quad((D, "asphalt", 0), (GATE[0] + 0.6, G0 + 0.006, 92.3), (GATE[1] - 0.6, G0 + 0.006, 92.3), (GATE[1] - 0.6, G0 + 0.006, 88.3), (GATE[0] + 0.6, G0 + 0.006, 88.3),
         uvs=((0, 0), (2, 0), (2, 0.7), (0, 0.7)))
    for x in (GATE[0] + 0.6, GATE[1] - 0.9):
        quad((D, "hazard", 1), (x, G0 + 0.012, 92.0), (x + 0.3, G0 + 0.012, 92.0), (x + 0.3, G0 + 0.012, 88.4), (x, G0 + 0.012, 88.4))

    # The wall, its coping and piers, and what is on its street face.
    for xa, xb in ((X0, GATE[0]), (GATE[1], X1)):
        box((D, "concrete", 0), xa, xb, 0.0, 5.2, WALL_Z, WALL_Z + 0.3, scale=1.5)
        box((D, "trim", 0), xa, xb, 5.2, 5.4, WALL_Z - 0.08, WALL_Z + 0.38, scale=1.0, col=B.DARK_TRIM)
    f_w = B.Face("-z", WALL_Z, -50.0, GATE[0])
    f_e = B.Face("-z", WALL_Z, GATE[1], 50.0)
    for f in (f_w, f_e):
        s = 3.0
        while s < f.width - 1.5:
            near = abs(f.at(s)) < 15.0
            f.box((D, "concrete", 0), s - 0.3, s + 0.3, 0.0, 5.7, 0.0, 0.3, scale=1.5)
            roll = rng.random()
            mid = s + 3.5
            if mid < f.width - 2.0:
                if roll < 0.3:
                    K.poster(D, f, mid, 2.7, rng.choice((2.4, 3.2)), 2.6, rng, out=0.06)
                elif roll < 0.55:
                    K.board(D, f, mid, rng.uniform(3.0, 3.9), "pm", out=0.12, roll=rng.uniform(-0.05, 0.05))
                    K.board(D, f, mid + rng.uniform(-0.8, 0.8), 1.9, "ps", out=0.08)
                elif roll < 0.75:
                    K.wall_lamp(D, f, mid, 4.3, rng.choice(("amber", "amber", "white")), power=5.0)
                    P.place(rng.choice(("crates", "bags", "drum", "dumpster")), *f.p(f.at(mid + 1.2), G0, 0.8), f.yaw, district=D)
                else:
                    K.face_blade(D, f, mid, 3.4, rng.choice(("bs", "bx", "bm")), rng.uniform(-0.5, 0.5), gap=0.3)
                    f.quad((D, "hazard", 1), mid - 2.0, mid + 2.0, 0.2, 0.5, 0.012)
            if near or rng.random() < 0.5:
                K.wall_lamp(D, f, s, 4.6, "amber", power=4.5)
            s += 7.0
    # A pipe rack along the wall's top, over the gate on its own bridge.
    for k, (dy, dz, r_, col) in enumerate(((6.0, 0.55, 0.22, (0.3, 0.2, 0.05, 1)), (6.0, 1.15, 0.16, (0.22, 0.22, 0.24, 1)), (6.55, 0.85, 0.12, (0.2, 0.07, 0.05, 1)))):
        pipe((D, "trim", 0), (-50.0, dy, WALL_Z + dz), (50.0, dy, WALL_Z + dz), r_, segs=6, col=col)
    for x in range(-48, 49, 8):
        if GATE[0] - 1 < x < GATE[1] + 1:
            continue
        box((D, "metal", 1), x - 0.08, x + 0.08, 5.4, 6.9, WALL_Z + 0.25, WALL_Z + 0.4, scale=0.5)
        box((D, "metal", 1), x - 0.08, x + 0.08, 5.7, 5.8, WALL_Z + 0.25, WALL_Z + 1.4, scale=0.5)

    # The gate: its piers and floods (the site lights the street from them),
    # the portal over it with the yard's boards, the west leaf shut, the
    # east run back behind the wall, a barrier across the open half.
    for px in (-12.4, 12.4):
        box((D, "concrete", 0), px - 0.4, px + 0.4, 0.0, 7.0, 91.4, 92.3, scale=1.5)
    for px in (-12.0, 12.0):
        box((D, "neon_amber", 0), px - 0.05, px + 0.05, 0.3, 6.5, 91.6, 91.7, scale=1.0)
        box((D, "metal", 1), px - 0.3, px + 0.3, 7.0, 7.3, 91.0, 91.8, scale=0.5)
        box((D, "glow", 0), px - 0.25, px + 0.25, 6.92, 7.0, 91.05, 91.75, scale=0.5, col=GLOW["white"])
        site_lamp(f"depot_{'w' if px < 0 else 'e'}", (px, 6.8, 90.6), "#ffd8a8", 9.0, 1.1)
    for px in GATE:
        box((D, "concrete", 0), px - 0.55, px + 0.55, 0.0, 8.6, 91.7, 92.8, scale=1.5)
        box((D, "hazard", 1), px - 0.57, px + 0.57, 0.2, 2.0, 91.68, 91.7, scale=0.6)
        box((D, "glow", 0), px - 0.2, px + 0.2, 8.6, 8.85, 92.05, 92.45, scale=0.5, col=GLOW["amber"])
    box((D, "metal", 0), GATE[0] - 0.55, GATE[1] + 0.55, 7.2, 8.6, 91.95, 92.55, scale=1.0)
    box((D, "neon_amber", 0), GATE[0] + 0.6, GATE[1] - 0.6, 7.08, 7.18, 91.9, 92.0, scale=1.0)
    for i, x in enumerate((-4.4, 0.0, 4.4)):
        sw, sh = 3.9, 1.67
        box((D, "board_frame", 0), x - sw / 2 - 0.08, x + sw / 2 + 0.08, 8.75, 8.9 + sh + 0.08, 92.1, 92.3, scale=1.0)
        K.st_face(D, K.st_id("pm"), (x, 8.85 + sh / 2, 92.08), (-1.0, 0.0, 0.0), K.UP, sw, sh)
        K.st_face(D, K.st_id("pm"), (x, 8.85 + sh / 2, 92.32), (1.0, 0.0, 0.0), K.UP, sw, sh)
    # The shut leaf: sheet steel in a frame, a hazard band, a wicket door.
    box((D, "door_panel", 0), GATE[0] + 0.55, 0.0, 0.25, 5.6, 92.0, 92.14, scale=1.0)
    for y in (0.25, 2.9, 5.5):
        box((D, "metal", 1), GATE[0] + 0.55, 0.0, y, y + 0.14, 91.95, 92.0, scale=0.5)
    box((D, "hazard", 1), GATE[0] + 0.55, 0.0, 1.2, 1.38, 91.93, 91.95, scale=0.6)
    quad((D, "door", 0), (-2.0, 0.3, 91.94), (-3.1, 0.3, 91.94), (-3.1, 2.4, 91.94), (-2.0, 2.4, 91.94))
    box((D, "neon_red", 0), -2.75, -2.35, 2.5, 2.62, 91.88, 91.94, scale=0.5)
    # The open leaf, behind the wall east of the gate.
    box((D, "door_panel", 0), GATE[1] + 0.3, GATE[1] + 6.9, 0.25, 5.6, 92.5, 92.64, scale=1.0)
    # The barrier: its post, the arm up at an angle, a red lamp.
    box((D, "hazard", 1), GATE[1] - 1.1, GATE[1] - 0.7, 0.15, 1.3, 91.2, 91.6, scale=0.5)
    pipe((D, "hazard", 1), (GATE[1] - 0.9, 1.15, 91.4), (GATE[1] - 4.6, 4.0, 91.4), 0.07, segs=4)
    box((D, "glow", 0), GATE[1] - 1.0, GATE[1] - 0.8, 1.3, 1.45, 91.3, 91.5, scale=0.5, col=GLOW["red"])
    # The booth, east of the gate, lit inside; a guard at its window, a
    # camera, drums; a board of the day's rules by its door.
    bx0, bx1, bz0, bz1 = 8.2, 11.0, 89.6, 91.6
    box((D, "trim", 0), bx0, bx1, G0, 2.7, bz0, bz1, scale=1.0, col=B.TRIM[5])
    quad((D, "shop", 0), (bx1 - 0.3, 1.05, bz0 - 0.01), (bx0 + 0.3, 1.05, bz0 - 0.01), (bx0 + 0.3, 2.25, bz0 - 0.01), (bx1 - 0.3, 2.25, bz0 - 0.01), col=(0.9, 0.2, 1.0, 1.0))
    quad((D, "shop", 0), (bx0 - 0.01, 1.05, bz0 + 0.3), (bx0 - 0.01, 1.05, bz1 - 0.3), (bx0 - 0.01, 2.25, bz1 - 0.3), (bx0 - 0.01, 2.25, bz0 + 0.3), col=(0.9, 0.6, 1.0, 1.0))
    box((D, "metal", 1), bx0 - 0.3, bx1 + 0.3, 2.7, 2.85, bz0 - 0.5, bz1 + 0.2, scale=1.0)
    box((D, "neon_white", 0), bx0 + 0.4, bx1 - 0.4, 2.6, 2.68, bz0 - 0.4, bz0 - 0.32, scale=0.5)
    light(D, 9.6, 1.5, 88.9, "white", 5.0)
    stand(9.6, 89.15, math.pi, "idle", y=G0)
    stand(7.6, 90.6, -math.pi / 2, "lean", y=G0)
    P.place("cctv", 12.9, G0, 89.5, district=D)
    P.place("barrier", 3.4, G0, 89.2, district=D)
    P.place("barrier", -9.0, 0.0, 86.9, district=D)
    for (x, z) in ((11.6, 90.2), (11.9, 90.9), (12.3, 89.9)):
        P.place("drum", x, G0, z, district=D)
    # West of the gate, a stall that feeds the shift, under the wall.
    K.stall(D, -10.2, 90.9, math.pi, rng, colour="red", w=3.0)
    K.umbrella(D, -13.4, 90.2, "amber", r=1.1, h=2.2)
    for dx in (-0.5, 0.5):
        K.stool(D, -13.4 + dx, 90.3, (0.05, 0.14, 0.2, 1))
    stand(-13.9, 90.3, math.pi / 2, "sit", y=G0 + 0.76)
    stand(-12.9, 90.3, -math.pi / 2, "sit", y=G0 + 0.76)
    # In the alleys either side, between the last lots and the wall: a way
    # through to the lanes, lit, with what gets left there.
    for sx in (-1, 1):
        for x in (18.0, 27.0, 36.0, 44.5):
            hue = rng.choice(("amber", "cyan", "green", "pink"))
            K.tube(D, (sx * x, 4.4, 91.4), (sx * (x + 1.8), 4.4, 91.4), hue, power=6.0)
        for x in (21.0, 31.0, 40.0):
            P.place(rng.choice(("crates", "bags", "drum", "dumpster")), sx * x, G0, 91.2, math.pi, district=D)
        K.cable(D, (sx * 24.0, 6.4, 88.0), (sx * 26.0, 5.6, 92.0), 0.5)
        K.cable(D, (sx * 38.0, 7.4, 88.0), (sx * 37.0, 5.6, 92.0), 0.6)

    # ---- In the yard ----
    # The road through the gate to the shed, its door up and lit, a bay of
    # boxes inside; lines on the road.
    sh = B.SHOP_H + B.CELL_H * 2
    mass(D, 0.0, 20.0, 108.0, 119.0, 0.0, sh, 4431, col=B.wall_col(0.5, 2, 0.8, B.TINTS["rust"]))
    B.COLLISION.append(("box", 0.0, 20.0, 0.0, sh, 108.0, 119.0, D))
    B.roof_dress(D, 0.0, 20.0, 108.0, 119.0, sh, random.Random(4431), cap=5.0, tint=B.TINTS["rust"])
    f = B.Face("-z", 108.0, 0.0, 20.0)
    f.box((D, "trim", 0), 9.6, 18.4, 0.0, 6.3, 0.0, 0.12, col=B.DARK_TRIM)
    f.quad((D, "lobby", 0), 10.0, 18.0, 0.02, 5.7, 0.13, col=(0.3, 0.7, 1, 1))
    f.box((D, "door_panel", 0), 10.0, 18.0, 5.7, 6.2, 0.1, 0.5)
    f.box((D, "neon_amber", 0), 10.0, 18.0, 6.35, 6.45, 0.1, 0.16)
    K.board(D, f, 5.0, 3.6, "pm", out=0.15)
    K.board(D, f, 5.0, 6.6, "pm", out=0.15)
    light(D, 6.0, 1.5, 105.0, "white", 8.0)
    light(D, 6.0, 1.5, 100.0, "amber", 5.0)
    for x in (2.6, 9.4):
        z = 93.5
        while z < 106.0:
            quad((D, "paint", 0), (x - 0.07, 0.012, z + 2.4), (x + 0.07, 0.012, z + 2.4), (x + 0.07, 0.012, z), (x - 0.07, 0.012, z), col=(0.86, 0.66, 0.10, 1.0))
            z += 4.2
    stand(4.4, 105.6, 0.4, "talk")
    stand(4.9, 106.4, math.pi + 0.4, "talk")
    # Boxes stacked west and east of the road, a crane astride the east
    # ones, its west legs and its trolley in the arm's view.
    containers(D, -44.0, 95.5, "x", 2, 3, rng, high=(1, 3))
    containers(D, 25.5, 99.0, "x", 6, 4, rng, high=(1, 4))
    containers(D, 70.0, 96.0, "x", 5, 5, rng, high=(1, 3))
    crane(D, 23.0, 65.0, 97.0, 111.5, 19.0, rng.uniform(26.5, 30.0), rng)
    # Tanks, and the two stacks behind them: straight down the arm's line,
    # over the gate's shut leaf.
    for (x, z, r_, h) in ((-17.0, 105.5, 4.2, 11.5), (-27.5, 111.0, 4.0, 13.0), (-37.5, 107.5, 3.2, 9.5)):
        tank(D, x, z, r_, h, rng)
    pipe((D, "trim", 1), (-27.5, 8.0, 111.0), (-17.0, 8.0, 105.5), 0.18, segs=5, col=(0.3, 0.2, 0.05, 1))
    pipe((D, "trim", 1), (-27.5, 6.2, 111.0), (-27.5, 6.2, WALL_Z + 0.55), 0.18, segs=5, col=(0.3, 0.2, 0.05, 1))
    chimney(D, "stack_a", -10.0, 116.0, 1.7, 47.0)
    chimney(D, "stack_b", -15.5, 117.6, 1.35, 38.0)
    # Floods on masts, the yard's light; its far edge a wall under lamps.
    for (x, z) in ((-47.0, 96.0), (-13.5, 97.5), (21.5, 114.0), (47.0, 95.0), (96.0, 114.0), (-60.0, 118.0), (67.5, 113.5)):
        flood_mast(D, x, z, 17.0, hue="white" if x > -20 else "amber", toward=(0.0, 1.0) if z < 100 else (0.0, -1.0))
    box((D, "concrete", 0), X0, X1, 0.0, 3.4, EDGE_Z - 0.3, EDGE_Z, scale=1.5)
    for xa in (X0, X1 - 0.3):
        box((D, "concrete", 0), xa, xa + 0.3, 0.0, 3.4, WALL_Z + 0.3, EDGE_Z - 0.3, scale=1.5)
    x = X0 + 6.0
    while x < X1 - 4.0:
        box((D, "glow", 0), x - 0.25, x + 0.25, 3.4, 3.55, EDGE_Z - 0.28, EDGE_Z - 0.02, scale=0.5, col=GLOW[rng.choice(("amber", "amber", "red"))])
        x += 9.0
    wash(D, X0 + 2, -8.0, WALL_Z + 2, EDGE_Z - 1, ("amber", "amber", "white"), 6.0, rng)
    wash(D, -8.0, 20.0, WALL_Z + 1, 106.0, ("white", "amber"), 6.0, rng, step=5.0)
    wash(D, 20.0, X1 - 2, WALL_Z + 2, EDGE_Z - 1, ("white", "white", "cyan", "amber"), 6.5, rng)
    # Drums and pallets about, and a few hands.
    for _ in range(14):
        x, z = rng.uniform(X0 + 3, X1 - 3), rng.uniform(94.0, 118.0)
        if (0.0 < x < 20.0 and z > 106.0) or abs(x - 6.0) < 5.0 or 24.0 < x < 104.0 or -45.0 < x < -8.0:
            continue
        P.place(rng.choice(("drum", "drum", "crates", "barrier")), x, 0.0, z, rng.uniform(0, 3.1), district=D)
    for (x, z, yaw, pose) in ((-9.5, 99.5, 1.0, "smoke"), (21.0, 96.0, -1.6, "phone"), (67.5, 100.0, 1.57, "idle"), (-30.0, 104.5, 0.0, "idle")):
        stand(x, z, yaw, pose)
