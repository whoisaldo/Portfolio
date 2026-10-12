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
STRIPE_YELLOW = (0.55, 0.4, 0.05, 1)
STRIPE_BLACK = (0.035, 0.035, 0.04, 1)
STRIPE_RED = (0.48, 0.05, 0.04, 1)
STRIPE_WHITE = (0.62, 0.62, 0.6, 1)
CONE = (0.62, 0.17, 0.03, 1)
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
    k = (D, "steel", 0)
    for x in (xa, xb):
        box(k, x - 0.45, x + 0.45, 0.3, 1.1, za - 1.0, zb + 1.0, scale=1.0, col=CRANE)
        for z in (za, zb):
            box(k, x - 0.35, x + 0.35, 1.1, h, z - 0.35, z + 0.35, scale=1.0, col=CRANE)
            box((D, "steel", 1), x - 0.37, x + 0.37, 1.1, 3.2, z - 0.37, z + 0.37, scale=0.7, col=STRIPE_YELLOW)
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


def blocks(D, x0, x1, z0, z1, rng, step=19.0, alley=3.0, heights=(8.5, 25.5), tall=0.0):
    """Works and stores round courts, an alley between each: windows on
    every side, a back's doors and lamps at the foot, roofs dressed. `tall`:
    how many of them stand four to eight storeys over the rest."""
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
            if tall and rng.random() < tall:
                h += B.CELL_H * rng.randrange(4, 9)
            B.building(lot, h, rng, style=WORKS, signs=False, ground="blank")
            # Lamps down the alleys either side, so the courts read from
            # the air: amber mostly, a cyan or a pink door among them.
            for t in range(1, int(d // 6) + 1):
                light(D, x + w + rng.uniform(-0.6, 0.6), 3.0, z + t * d / (int(d // 6) + 1), rng.choice(("amber", "amber", "cyan", "white", "pink")), rng.uniform(4.0, 7.0))
            for t in range(1, int(w // 6) + 1):
                light(D, x + t * w / (int(w // 6) + 1), 3.0, z + d + rng.uniform(-0.6, 0.6), rng.choice(("amber", "amber", "cyan", "white", "green")), rng.uniform(4.0, 7.0))
            z += d
        x += w


def hazard_band(D, x0, x1, y0, y1, z, w=0.45, upright=False):
    """Hazard stripes on a plane across the arm's end at z: black, with
    yellow bands leaning over it, along a beam or (upright) up a post; seen
    from both sides."""
    def both(key, pts, dz, col):
        quad(key, *[(px, py, z - dz) for (px, py) in pts], col=col)
        quad(key, *[(px, py, z + dz) for (px, py) in (pts[1], pts[0], pts[3], pts[2])], col=col)
    # Painted steel, so it is worn where hands and bumpers have been.
    both((D, "steel", 1), ((x1, y0), (x0, y0), (x0, y1), (x1, y1)), 0.012, STRIPE_BLACK)
    if upright:
        rise = x1 - x0
        y = y0
        while y + w + rise <= y1 + 1e-6:
            both((D, "steel", 1), ((x1, y), (x0, y + rise), (x0, y + rise + w), (x1, y + w)), 0.022, STRIPE_YELLOW)
            y += 2 * w
    else:
        lean = y1 - y0
        x = x0
        while x + w + lean <= x1 + 1e-6:
            both((D, "steel", 1), ((x + w, y0), (x, y0), (x + lean, y1), (x + w + lean, y1)), 0.022, STRIPE_YELLOW)
            x += 2 * w


def stack_of(D, x0, x1, z0, z1, n, rng, lamp="white"):
    """Boxes one on another, n high, a strip of light under the top one's
    edge on the arm's side and a red lamp on its corner."""
    H = 2.6
    for k in range(n):
        o = rng.uniform(-0.07, 0.07)
        along_x = x1 - x0 > z1 - z0
        box((D, "trim", 0), x0 + (o if along_x else 0.0), x1 + (o if along_x else 0.0), k * H, k * H + H - 0.04,
            z0 + (0.0 if along_x else o), z1 + (0.0 if along_x else o), scale=2.0, col=rng.choice(BOX_COLOURS))
    top = n * H
    box((D, "glow", 0), x0 + 0.3, x1 - 0.3, top - 0.3, top - 0.2, z0 - 0.05, z0 - 0.01, scale=0.5, col=GLOW[lamp])
    box((D, "glow", 0), x0 + 0.1, x0 + 0.3, top - 0.04, top + 0.2, z0 + 0.1, z0 + 0.3, scale=0.5, col=GLOW["red"])


def cone(D, x, z, h=0.72, y=None):
    """A traffic cone on its square foot, a white band round it."""
    y = G0 if y is None else y
    box((D, "trim", 1), x - 0.2, x + 0.2, y, y + 0.04, z - 0.2, z + 0.2, scale=0.5, col=STRIPE_BLACK)
    n = 8
    for (ya, yb, ra, rb, col) in ((y + 0.04, y + 0.36, 0.16, 0.095, CONE), (y + 0.36, y + 0.47, 0.098, 0.075, STRIPE_WHITE),
                                  (y + 0.47, y + h, 0.073, 0.028, CONE)):
        for i in range(n):
            a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
            quad((D, "trim", 1), (x + math.cos(a1) * ra, ya, z + math.sin(a1) * ra), (x + math.cos(a0) * ra, ya, z + math.sin(a0) * ra),
                 (x + math.cos(a0) * rb, yb, z + math.sin(a0) * rb), (x + math.cos(a1) * rb, yb, z + math.sin(a1) * rb), col=col)


def striped_pipe(D, a, b, r, cols, n):
    """A round bar in painted bands (a barrier's boom), n bands from a to b."""
    for i in range(n):
        p0 = tuple(a[k] + (b[k] - a[k]) * i / n for k in range(3))
        p1 = tuple(a[k] + (b[k] - a[k]) * (i + 1) / n for k in range(3))
        pipe((D, "steel", 0), p0, p1, r, segs=6, col=cols[i % len(cols)])


def striped_beam(D, x0, x1, y0, y1, z0, z1, cols, step=0.3):
    """A square bar along x in painted bands."""
    x, i = x0, 0
    while x < x1 - 1e-6:
        xb = min(x1, x + step)
        box((D, "steel", 0), x, xb, y0, y1, z0, z1, scale=0.5, col=cols[i % len(cols)])
        x, i = xb, i + 1


def street_barrier(D, x, z, w=2.0, rng=None):
    """A steel barrier across the way: A-legs, a beam in black and yellow,
    a reflector at each end, an amber lamp on top."""
    for e in (x - w / 2 + 0.15, x + w / 2 - 0.15):
        for dz in (-0.28, 0.28):
            pipe((D, "steel", 1), (e, G0, z + dz), (e, G0 + 1.05, z), 0.035, segs=4, col=STRIPE_BLACK)
        box((D, "steel", 1), e - 0.05, e + 0.05, G0, G0 + 0.04, z - 0.35, z + 0.35, scale=0.5, col=STRIPE_BLACK)
    striped_beam(D, x - w / 2, x + w / 2, G0 + 0.82, G0 + 1.08, z - 0.05, z + 0.05, (STRIPE_YELLOW, STRIPE_BLACK), step=0.25)
    for e in (x - w / 2 + 0.06, x + w / 2 - 0.06):
        box((D, "glow", 1), e - 0.05, e + 0.05, G0 + 0.88, G0 + 1.0, z - 0.07, z - 0.055, scale=0.5, col=tuple(v * 0.5 for v in GLOW["red"][:3]) + (1,))
    box((D, "steel", 1), x - 0.09, x + 0.09, G0 + 1.08, G0 + 1.2, z - 0.06, z + 0.06, scale=0.5, col=STRIPE_BLACK)
    box((D, "glow", 0), x - 0.08, x + 0.08, G0 + 1.2, G0 + 1.36, z - 0.08, z + 0.08, scale=0.5, col=GLOW["amber"])
    light(D, x, 1.3, z - 0.8, "amber", 3.0)


def worn_line(D, x0, x1, z0, z1, rng, col, along="z", dash=(0.5, 1.2), gap=(0.05, 0.3), y=G0 + 0.008):
    """A painted line on the ground, broken where tyres have worn it."""
    if along == "z":
        z = z0
        while z < z1:
            zb = min(z1, z + rng.uniform(*dash))
            quad((D, "paint", 0), (x0, y, zb), (x1, y, zb), (x1, y, z), (x0, y, z), col=col)
            z = zb + rng.uniform(*gap)
    else:
        x = x0
        while x < x1:
            xb = min(x1, x + rng.uniform(*dash))
            quad((D, "paint", 0), (x, y, z1), (xb, y, z1), (xb, y, z0), (x, y, z0), col=col)
            x = xb + rng.uniform(*gap)


def gatehouse(D, rng):
    """The guard's house east of the gate: rendered walls on a dark plinth,
    a window onto the arm with the room lit behind it (a desk, monitors, a
    lamp, the guard), its door on the gate's side under a lamp, a sign on
    its fascia, a unit on its flank, a camera, its pool on the pavement."""
    x0, x1, z0, z1, h = 8.2, 11.6, 89.4, 91.6, 2.9
    t = 0.14
    wall = (0.3, 0.32, 0.29, 1)
    wx0, wx1, wy0, wy1 = 8.6, 11.2, 1.0, 2.25
    # The arm's side, round the window; the other three walls whole.
    box((D, "plaster", 0), x0, x1, G0, wy0, z0, z0 + t, scale=1.0, col=wall)
    box((D, "plaster", 0), x0, x1, wy1, h, z0, z0 + t, scale=1.0, col=wall)
    box((D, "plaster", 0), x0, wx0, wy0, wy1, z0, z0 + t, scale=1.0, col=wall)
    box((D, "plaster", 0), wx1, x1, wy0, wy1, z0, z0 + t, scale=1.0, col=wall)
    box((D, "plaster", 0), x0, x1, G0, h, z1 - t, z1, scale=1.0, col=wall)
    box((D, "plaster", 0), x1 - t, x1, G0, h, z0, z1, scale=1.0, col=wall)
    box((D, "plaster", 0), x0, x0 + t, G0, h, z0, z1, scale=1.0, col=wall)
    box((D, "trim", 1), x0 - 0.03, x1 + 0.03, G0, G0 + 0.35, z0 - 0.03, z1 + 0.03, scale=1.0, col=STRIPE_BLACK)
    # Its roof and fascia.
    box((D, "trim", 0), x0 - 0.35, x1 + 0.3, h, h + 0.18, z0 - 0.45, z1 + 0.1, scale=1.0, col=B.DARK_TRIM)
    # The room: its back wall lit, a ceiling lamp, a desk under the window
    # with two monitors' backs and their light, a chair, the guard.
    quad((D, "shop", 0), (x1 - t - 0.01, G0, z1 - t - 0.01), (x0 + t + 0.01, G0, z1 - t - 0.01), (x0 + t + 0.01, h - 0.05, z1 - t - 0.01), (x1 - t - 0.01, h - 0.05, z1 - t - 0.01),
         col=(1.0, 0.55, 0.3, 1.0))
    box((D, "glow", 0), x0 + 0.6, x1 - 0.6, h - 0.12, h - 0.06, 90.3, 90.5, scale=0.5, col=tuple(v * 0.6 for v in GLOW["white"][:3]) + (1,))
    box((D, "trim", 1), wx0, wx1, G0, 0.95, z0 + t, z0 + 0.75, scale=1.0, col=(0.12, 0.08, 0.05, 1))
    for mx in (9.3, 10.4):
        box((D, "dark", 1), mx - 0.28, mx + 0.28, 0.95, 1.38, z0 + 0.35, z0 + 0.42, scale=0.5)
        quad((D, "glow", 0), (mx + 0.25, 0.98, z0 + 0.425), (mx - 0.25, 0.98, z0 + 0.425), (mx - 0.25, 1.35, z0 + 0.425), (mx + 0.25, 1.35, z0 + 0.425),
             col=tuple(v * 0.7 for v in GLOW["cyan"][:3]) + (1,))
    stand(9.85, 90.75, math.pi, "idle", y=G0)
    # The window: its frame, a mullion, the glass.
    for (a0, a1, b0, b1) in ((wx0 - 0.06, wx1 + 0.06, wy0 - 0.08, wy0), (wx0 - 0.06, wx1 + 0.06, wy1, wy1 + 0.06), (wx0 - 0.06, wx0, wy0, wy1), (wx1, wx1 + 0.06, wy0, wy1), (9.87, 9.93, wy0, wy1)):
        box((D, "metal", 1), a0, a1, b0, b1, z0 - 0.04, z0 + 0.02, scale=0.5)
    box((D, "trim", 1), wx0 - 0.1, wx1 + 0.1, wy0 - 0.12, wy0 - 0.05, z0 - 0.12, z0 + 0.02, scale=0.5, col=wall)
    quad((D, "clearglass", 0), (wx1, wy0, z0 + 0.05), (wx0, wy0, z0 + 0.05), (wx0, wy1, z0 + 0.05), (wx1, wy1, z0 + 0.05), col=(0.5, 0.65, 0.7, 1))
    light(D, 9.9, 1.4, 88.4, "amber", 6.0)
    # The door on the gate's side, a lamp over it.
    quad((D, "door", 0), (x0 - 0.01, G0, 90.4), (x0 - 0.01, G0, 91.35), (x0 - 0.01, 2.2, 91.35), (x0 - 0.01, 2.2, 90.4))
    box((D, "metal", 1), x0 - 0.05, x0 - 0.01, 1.0, 1.1, 90.5, 90.6, scale=0.5)
    box((D, "dark", 1), x0 - 0.25, x0, 2.35, 2.5, 90.75, 91.0, scale=0.5)
    box((D, "glow", 0), x0 - 0.22, x0 - 0.03, 2.3, 2.35, 90.78, 90.97, scale=0.5, col=GLOW["amber"])
    light(D, 7.4, 1.5, 90.9, "amber", 5.0)
    # Its sign on the fascia, a board of the day's rules by the door, a
    # unit on its flank, a camera on its corner.
    K.st_face(D, K.st_id("pm"), (9.9, h + 0.09, z0 - 0.47), (-1.0, 0.0, 0.0), K.UP, 2.6, 0.17)
    K.st_face(D, "st_pm_15", (9.9, 2.58, z0 - 0.02), (-1.0, 0.0, 0.0), K.UP, 1.6, 0.6)
    K.st_face(D, K.st_id("bs"), (x0 - 0.02, 1.25, 89.85), (0.0, 0.0, -1.0), K.UP, 0.42, 1.0)
    P.place("ac_wall", x1, 1.9, 90.5, math.pi / 2, district=D)
    box((D, "metal", 1), x1 - 0.1, x1 + 0.35, h - 0.3, h - 0.2, z0 + 0.05, z0 + 0.15, scale=0.5)
    box((D, "dark", 1), x1 + 0.2, x1 + 0.5, h - 0.45, h - 0.25, z0 - 0.05, z0 + 0.25, scale=0.5)
    box((D, "glow", 0), x1 + 0.3, x1 + 0.34, h - 0.38, h - 0.34, z0 - 0.06, z0 - 0.05, scale=0.5, col=GLOW["red"])
    pipe((D, "metal", 1), (x1 + 0.05, G0, z1 - 0.2), (x1 + 0.05, h + 0.1, z1 - 0.2), 0.05, segs=5)


def leaf(D, rng):
    """The shut leaf of the gate: a steel frame, corrugated sheet in it, an
    advert screen bolted over its top half, a wicket door under a red
    lamp, bills pasted by it, hazard paint along its foot."""
    xa, xb, z = GATE[0] + 0.55, 0.0, 92.0
    box((D, "corrugated", 0), xa + 0.08, xb - 0.08, 0.3, 5.5, z + 0.02, z + 0.12, scale=1.0, col=(0.12, 0.16, 0.16, 1))
    for (a0, a1, b0, b1) in ((xa, xa + 0.12, 0.25, 5.62), (xb - 0.12, xb, 0.25, 5.62), (xa, xb, 5.5, 5.62), (xa, xb, 0.25, 0.37), (xa, xb, 2.82, 2.92)):
        box((D, "steel", 0), a0, a1, b0, b1, z - 0.03, z + 0.14, scale=0.5, col=(0.08, 0.09, 0.1, 1))
    # The screen: its frame, its bolts' brackets, an advert.
    B.billboard(D, (xa + xb) / 2, 4.2, z - 0.12, 5.2, 2.3, math.pi, rng, back=False, depth=0.12)
    for bx in (xa + 0.6, xb - 0.6):
        box((D, "metal", 1), bx - 0.05, bx + 0.05, 2.95, 5.45, z - 0.06, z, scale=0.5)
    hazard_band(D, xa + 0.12, xb - 0.12, 0.37, 0.95, z - 0.035)
    # The wicket door, its frame and its lamp.
    quad((D, "door", 0), (-2.0, 0.3, z - 0.06), (-3.1, 0.3, z - 0.06), (-3.1, 2.4, z - 0.06), (-2.0, 2.4, z - 0.06))
    for (a0, a1, b0, b1) in ((-3.18, -3.1, 0.3, 2.48), (-2.0, -1.92, 0.3, 2.48), (-3.18, -1.92, 2.4, 2.48)):
        box((D, "steel", 1), a0, a1, b0, b1, z - 0.1, z - 0.02, scale=0.5, col=(0.08, 0.09, 0.1, 1))
    box((D, "neon_red", 0), -2.75, -2.35, 2.55, 2.67, z - 0.12, z - 0.06, scale=0.5)
    # Bills pasted either side of it, a stencilled sign.
    f = B.Face("-z", z - 0.06, xa, xb)
    for (cx, w, h) in ((-5.4, 0.7, 1.0), (-4.5, 0.6, 0.85), (-1.1, 0.75, 1.05)):
        K.poster(D, f, abs(cx - f.left), 1.75, w, h, rng, out=0.02)
    K.st_face(D, K.st_id("ps"), (-0.9, 2.55, z - 0.09), (-1.0, 0.0, 0.0), K.UP, 1.1, 0.48)


def pier_dress(D, px, z, w, h, rng, side):
    """A concrete pier's face toward the arm: bills, a downpipe, a junction
    box with its lamp, a conduit up it with lamps at its head."""
    f = B.Face("-z", z, px - w / 2, px + w / 2)
    K.poster(D, f, w / 2, 2.2, min(0.62, w - 0.15), 0.9, rng, out=0.02)
    if rng.random() < 0.7:
        K.poster(D, f, w / 2 + rng.uniform(-0.05, 0.05), 3.25, min(0.55, w - 0.2), 0.75, rng, out=0.02)
    ex = px + side * (w / 2 + 0.08)
    pipe((D, "metal", 1), (ex, G0, z + 0.12), (ex, h - 0.3, z + 0.12), 0.06, segs=5)
    box((D, "steel", 1), px - 0.22, px + 0.22, 4.2, 4.75, z - 0.18, z, scale=0.5, col=(0.18, 0.2, 0.2, 1))
    box((D, "glow", 1), px - 0.05, px + 0.05, 4.6, 4.66, z - 0.19, z - 0.18, scale=0.5, col=GLOW["green"])
    pipe((D, "metal", 1), (px - side * 0.2, 4.75, z - 0.1), (px - side * 0.2, h - 0.5, z - 0.1), 0.035, segs=4)
    box((D, "glow", 0), px - 0.15, px + 0.15, h - 0.5, h - 0.4, z - 0.2, z - 0.05, scale=0.5, col=GLOW["amber"])


def gate_frame(D):
    """Over the gate's posts and its beam, the frame the arm ends on: a
    pylon on each post in the crane's paint, a truss between their heads
    under a row of floods, the yard's board hung in the frame, a board
    down each pylon, lamps up their edges and red on their caps, hazard
    stripes on the posts and along the beam; and behind the wall either
    side of the yard road, boxes stacked higher than the wall, each row
    back taller than the last."""
    rng = random.Random(4470)
    top = 17.0
    for px in GATE:
        hazard_band(D, px - 0.57, px + 0.57, 0.2, 3.35, 91.675, upright=True)
        box((D, "steel", 0), px - 0.45, px + 0.45, 8.6, top, 91.85, 92.65, scale=1.0, col=CRANE)
        box((D, "metal", 1), px - 0.7, px + 0.7, top, top + 0.14, 91.6, 92.9, scale=0.5)
        box((D, "glow", 0), px - 0.14, px + 0.14, top + 0.14, top + 0.5, 92.1, 92.4, scale=0.5, col=GLOW["red"])
        inner = px - math.copysign(0.45, px)
        box((D, "glow", 0), min(inner, inner - math.copysign(0.06, px)), max(inner, inner - math.copysign(0.06, px)), 8.9, 12.7, 91.85, 91.93,
            scale=0.5, col=GLOW["white"])
        # Floods at its head, turned up the arm.
        box((D, "metal", 1), px - 0.9, px + 0.9, top - 1.35, top - 0.2, 91.64, 91.76, scale=0.5)
        for dx in (-0.6, 0.0, 0.6):
            for dy in (-1.2, -0.7):
                box((D, "glow", 0), px + dx - 0.2, px + dx + 0.2, top + dy, top + dy + 0.34, 91.58, 91.64, scale=0.5, col=GLOW["white"])
        # "Twenty-four hours" down its face.
        K.st_face(D, "st_bl_14", (px, 10.75, 91.835), (-1.0, 0.0, 0.0), K.UP, 0.84, 3.5)
    # The truss: two chords, posts and braces between them, a line of
    # light under it, floods along its top.
    xa, xb = GATE[0] + 0.45, GATE[1] - 0.45
    y0, y1 = 13.0, 15.6
    for y in (y0, y1 - 0.4):
        box((D, "steel", 0), xa, xb, y, y + 0.4, 91.95, 92.55, scale=1.0, col=CRANE)
    n = 6
    for k in range(n + 1):
        x = xa + k * (xb - xa) / n
        if 0 < k < n:
            box((D, "steel", 1), x - 0.1, x + 0.1, y0 + 0.4, y1 - 0.4, 92.15, 92.35, scale=1.0, col=CRANE)
        if k < n:
            x2 = xa + (k + 1) * (xb - xa) / n
            a, b = ((x, y0 + 0.4, 92.25), (x2, y1 - 0.4, 92.25)) if k % 2 == 0 else ((x, y1 - 0.4, 92.25), (x2, y0 + 0.4, 92.25))
            pipe((D, "steel", 1), a, b, 0.09, segs=4, col=CRANE)
    box((D, "neon_amber", 0), xa + 0.2, xb - 0.2, y0 - 0.08, y0, 91.9, 92.0, scale=1.0)
    box((D, "metal", 1), xa + 0.6, xb - 0.6, y1, y1 + 0.5, 91.9, 92.0, scale=0.5)
    for k in range(6):
        x = -5.0 + k * 2.0
        box((D, "glow", 0), x - 0.26, x + 0.26, y1 + 0.08, y1 + 0.44, 91.84, 91.9, scale=0.5, col=GLOW["white"])
    for (x, z) in ((-4.5, 86.5), (4.5, 86.5), (0.0, 81.0), (-3.0, 90.2), (3.5, 90.2)):
        light(D, x, 2.0, z, "white", 7.0)
    hazard_band(D, GATE[0] + 0.55, GATE[1] - 0.55, 7.32, 8.48, 91.94)
    # The yard's board, hung in the frame between the beam and the truss.
    sw, sh = ST_SIZES["pm"][0] * 3.0, ST_SIZES["pm"][1] * 3.0
    cy = 8.9 + sh / 2
    box((D, "board_frame", 0), -sw / 2 - 0.12, sw / 2 + 0.12, cy - sh / 2 - 0.12, cy + sh / 2 + 0.12, 92.12, 92.38, scale=1.0)
    K.st_face(D, "st_pm_15", (0.0, cy, 92.1), (-1.0, 0.0, 0.0), K.UP, sw, sh)
    K.st_face(D, "st_pm_15_b", (0.0, cy, 92.4), (1.0, 0.0, 0.0), K.UP, sw, sh)
    for x in (-sw / 2 + 0.6, sw / 2 - 0.6):
        box((D, "metal", 1), x - 0.05, x + 0.05, cy + sh / 2 + 0.12, y0, 92.2, 92.3, scale=0.5)
    # Boxes behind the wall, west of the yard road and east of it.
    stack_of(D, -12.8, -6.7, 93.6, 96.04, 4, rng)
    stack_of(D, -12.8, -6.7, 96.24, 98.68, 6, rng, lamp="amber")
    for (x, nh, lamp) in ((11.0, 4, "white"), (13.64, 6, "amber"), (16.28, 5, "white")):
        stack_of(D, x, x + 2.44, 94.5, 100.6, nh, rng, lamp=lamp)
    for (x, z) in ((-9.7, 93.0), (-5.8, 96.0), (-9.7, 99.6), (12.2, 93.6), (15.0, 93.6), (10.2, 97.5)):
        light(D, x, 2.0, z, "white" if x > 0 else "amber", 7.0)


def build(D):
    rng = random.Random(4417)
    # Behind the arm's lots and the south street's row, to the yard's wall.
    blocks(D, X0, -50.0, 48.0, WALL_Z, random.Random(4421), step=15.0, heights=(8.5, 22.0), tall=0.4)
    blocks(D, 50.0, X1, 48.0, WALL_Z, random.Random(4422), tall=0.35)
    # The pavement across the arm's end, the alleys either side of it to the
    # lanes, and the yard's own ground: wet, under floods.
    B.ground_rect(D, -50.0, 50.0, 88.0, WALL_Z)
    ground((D, "asphalt", 0), X0, X1, WALL_Z + 0.3, EDGE_Z, y=0.0, scale=6.0)
    # The gate's crossing over the pavement, hatched at its edges.
    quad((D, "asphalt", 0), (GATE[0] + 0.6, G0 + 0.006, 92.3), (GATE[1] - 0.6, G0 + 0.006, 92.3), (GATE[1] - 0.6, G0 + 0.006, 88.3), (GATE[0] + 0.6, G0 + 0.006, 88.3),
         uvs=((0, 0), (2, 0), (2, 0.7), (0, 0.7)))
    grng = random.Random(4480)
    for x in (GATE[0] + 0.6, GATE[1] - 0.9):
        worn_line(D, x, x + 0.3, 88.4, 92.0, grng, STRIPE_YELLOW)
    worn_line(D, GATE[0] + 0.9, GATE[1] - 0.9, 88.45, 88.75, grng, (0.6, 0.6, 0.57, 1), along="x", dash=(0.6, 1.6))

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
                    f.quad((D, "steel", 1), mid - 2.0, mid + 2.0, 0.2, 0.5, 0.012, col=STRIPE_YELLOW)
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
    # the beam over it and the frame that stands on them (gate_frame), the
    # west leaf shut, the east run back behind the wall, a barrier across
    # the open half.
    for px in (-12.4, 12.4):
        box((D, "castconcrete", 0), px - 0.4, px + 0.4, 0.0, 7.0, 91.4, 92.3, scale=1.5, col=(0.34, 0.34, 0.33, 1))
        pier_dress(D, px, 91.4, 0.8, 7.0, grng, 1 if px > 0 else -1)
    for px in (-12.0, 12.0):
        box((D, "metal", 1), px - 0.3, px + 0.3, 7.0, 7.3, 91.0, 91.8, scale=0.5)
        box((D, "glow", 0), px - 0.25, px + 0.25, 6.92, 7.0, 91.05, 91.75, scale=0.5, col=GLOW["white"])
        site_lamp(f"depot_{'w' if px < 0 else 'e'}", (px, 6.8, 90.6), "#ffd8a8", 9.0, 1.1)
    for px in GATE:
        box((D, "castconcrete", 0), px - 0.55, px + 0.55, 0.0, 8.6, 91.7, 92.8, scale=1.5, col=(0.32, 0.32, 0.31, 1))
        f = B.Face("-z", 91.7, px - 0.55, px + 0.55)
        K.poster(D, f, 0.55, 4.6, 0.8, 1.1, grng, out=0.02)
        K.st_face(D, K.st_id("bs"), (px, 6.6, 91.66), (-1.0, 0.0, 0.0), K.UP, 0.5, 1.2)
    # A camera on the east post, looking down the arm.
    box((D, "metal", 1), 6.9, 7.0, 6.0, 6.1, 91.3, 91.7, scale=0.5)
    box((D, "steel", 1), 6.8, 7.1, 5.85, 6.05, 91.0, 91.4, scale=0.5, col=(0.5, 0.5, 0.48, 1))
    box((D, "glow", 1), 6.92, 6.98, 5.92, 5.98, 90.98, 91.0, scale=0.5, col=GLOW["red"])
    box((D, "metal", 0), GATE[0] - 0.55, GATE[1] + 0.55, 7.2, 8.6, 91.95, 92.55, scale=1.0)
    box((D, "neon_amber", 0), GATE[0] + 0.6, GATE[1] - 0.6, 7.08, 7.18, 91.9, 92.0, scale=1.0)
    gate_frame(D)
    # The shut leaf (see leaf()).
    leaf(D, grng)
    # The open leaf, behind the wall east of the gate.
    box((D, "door_panel", 0), GATE[1] + 0.3, GATE[1] + 6.9, 0.25, 5.6, 92.5, 92.64, scale=1.0)
    # The barrier: its housing in yellow paint, worn, a lamp and a
    # reflector on it, a counterweight, the boom up at an angle in red and
    # white bands.
    hx = GATE[1] - 0.9
    box((D, "steel", 0), hx - 0.3, hx + 0.3, G0, 1.25, 91.1, 91.7, scale=0.5, col=STRIPE_YELLOW)
    box((D, "steel", 1), hx - 0.34, hx + 0.34, 1.25, 1.33, 91.06, 91.74, scale=0.5, col=STRIPE_BLACK)
    box((D, "glow", 0), hx - 0.1, hx + 0.1, 1.33, 1.5, 91.3, 91.5, scale=0.5, col=GLOW["red"])
    box((D, "glow", 1), hx - 0.12, hx + 0.12, 0.7, 0.82, 91.08, 91.1, scale=0.5, col=tuple(v * 0.5 for v in GLOW["amber"][:3]) + (1,))
    box((D, "steel", 1), hx + 0.3, hx + 0.75, 1.0, 1.35, 91.25, 91.55, scale=0.5, col=STRIPE_BLACK)
    striped_pipe(D, (hx, 1.15, 91.4), (GATE[1] - 4.6, 4.0, 91.4), 0.075, (STRIPE_WHITE, STRIPE_RED), 8)
    light(D, hx - 0.6, 1.2, 90.6, "red", 2.0)
    # The guard's house east of the gate (gatehouse()); barriers and cones
    # across the open half and by the kerb.
    gatehouse(D, grng)
    stand(7.6, 90.6, -math.pi / 2, "lean", y=G0)
    P.place("cctv", 12.9, G0, 89.5, district=D)
    street_barrier(D, 3.4, 89.2)
    street_barrier(D, -9.0, 86.9, w=2.4)
    for (x, z) in ((1.3, 90.4), (0.6, 89.6), (5.6, 88.6), (-6.2, 89.0), (-5.4, 88.4), (12.6, 88.2), (-11.0, 87.6)):
        cone(D, x, z)
    for (x, z) in ((12.0, 90.15), (12.45, 90.85), (12.4, 89.75)):
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
        if (0.0 < x < 20.0 and z > 106.0) or abs(x - 6.0) < 5.0 or 24.0 < x < 104.0 or -45.0 < x < -6.0 or 10.5 < x < 19.5:
            continue
        P.place(rng.choice(("drum", "drum", "crates", "barrier")), x, 0.0, z, rng.uniform(0, 3.1), district=D)
    for (x, z, yaw, pose) in ((-9.5, 99.5, 1.0, "smoke"), (21.0, 96.0, -1.6, "phone"), (67.5, 100.0, 1.57, "idle"), (-30.0, 104.5, 0.0, "idle")):
        stand(x, z, yaw, pose)
