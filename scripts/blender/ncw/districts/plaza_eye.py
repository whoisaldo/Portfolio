"""The square at a walker's eye and from the terraces, round 7 (review
plaza-m11): the hub's kerb capped in dark stone with lamps let into it, the
terrace stair's treads with timber seats and people on them, the south
terrace's open floor given a planted bed, light in its paving and lit menus,
blades and menus on the terraces' shops to the square, steam from the
square's grates and from the court lane's vents, and the court lane's walls
worked: pipes, units, cables, a lit service door, a shutter and tags.

Imported after plaza_sky and before plaza_paving: its lamps light the
stone, and its signs take the last of the plaza's own sign ids, so every
sign set down before it keeps its words. No billboard and no new prototype.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza_hub import RP, RK, KY, NSEG, STEP, at, LOBES, OUTER, STAIR
from ncw.districts.plaza_square import G, TY, TX, TN, TS

re_ = random.Random(8700)
GRANITE = (0.07, 0.072, 0.08, 1.0)
WOOD = (0.17, 0.095, 0.05, 1.0)

# ---------------------------------------------------------------------------
# The hub's kerb: a cap of dark polished stone over its top, a steel edge to
# the well, and a small lamp let into every other stone (lit concrete under
# the koi's warm pools was a long salmon slab at a walker's feet).
# ---------------------------------------------------------------------------
for i in range(NSEG):
    a0, a1 = i * STEP, (i + 1) * STEP
    sector = [at(RP + 0.02, a0), at(RP + 0.02, a1), at(RK - 0.03, a1), at(RK - 0.03, a0)]
    for lobe in LOBES:
        top = clip_planes(sector, lobe)
        if top:
            up_poly((PL, "trim", 0), top, KY + 0.005, GRANITE)
        edge = clip_planes([at(RP - 0.01, a0), at(RP - 0.01, a1), at(RP + 0.07, a1), at(RP + 0.07, a0)], lobe)
        if edge:
            up_poly((PL, "metal", 1), edge, KY + 0.008, scale=0.5)
    if i % 2 == 1:
        x, z = at((RP + RK) / 2, (a0 + a1) / 2)
        sq = [(x - 0.1, z - 0.1), (x + 0.1, z - 0.1), (x + 0.1, z + 0.1), (x - 0.1, z + 0.1)]
        if any(len(clip_planes(sq, lobe)) == 4 for lobe in LOBES):
            box((PL, "glow", 1), x - 0.09, x + 0.09, KY + 0.005, KY + 0.022, z - 0.09, z + 0.09, scale=0.5, col=dim("amber", 0.55))

# Its outer face and lip faced in the same dark stone, a line of amber let
# in low along it every other stone (the concrete face, lit by the warm
# pools at its foot, was the salmon slab at a walker's feet).
for i in range(NSEG):
    a0, a1 = i * STEP, (i + 1) * STEP
    for outer in OUTER:
        s = seg_clip(at(RK + 0.045, a1), at(RK + 0.045, a0), outer)
        if s:
            vwall((PL, "trim", 0), s[0], s[1], G - 0.02, KY + 0.012, GRANITE)
            if i % 2 == 0:
                s2 = seg_clip(at(RK + 0.06, a1 - 0.002), at(RK + 0.06, a0 + 0.002), outer)
                if s2:
                    vwall((PL, "glow", 1), s2[0], s2[1], G + 0.07, G + 0.1, dim("amber", 0.4))
        piece = clip_planes([at(RK - 0.035, a0), at(RK - 0.035, a1), at(RK + 0.05, a1), at(RK + 0.05, a0)], outer)
        if piece:
            up_poly((PL, "trim", 0), piece, KY + 0.012, GRANITE)

# ---------------------------------------------------------------------------
# The terrace stair (STAIR, plaza_parts.stair_x): timber seats laid on every
# sixth tread between the balustrades, and people sitting on them looking
# out over the square; low planters at its foot.
# ---------------------------------------------------------------------------
x0, x1, z0, z1 = STAIR
n = max(2, int(round((TY + 0.01 - G) / 0.16)))
rise, run = (TY + 0.01 - G) / n, (x1 - x0) / n
zm = (z0 + z1) / 2
seats = []
for i in range(4, n - 2, 6):
    xa, yb = x0 + i * run, G + (i + 1) * rise
    for (za, zb) in ((z0 + 0.4, zm - 0.4), (zm + 0.4, z1 - 0.4)):
        ca = za + re_.uniform(0.0, 1.2)
        cb = zb - re_.uniform(0.0, 1.2)
        box((PL, "trim", 0), xa + 0.03, xa + run - 0.02, yb, yb + 0.06, ca, cb, scale=1.0, col=WOOD)
        box((PL, "glow", 1), xa + 0.02, xa + 0.035, yb + 0.012, yb + 0.04, ca + 0.2, cb - 0.2, scale=0.5, col=dim("amber", 0.4))
        seats.append((xa + run * 0.5, yb + 0.06, ca, cb))
for k, (sx, sy, ca, cb) in enumerate(seats):
    m = 2 if k % 3 else 1
    for j in range(m):
        z = ca + (cb - ca) * (0.25 + 0.5 * j / max(1, m - 1) if m > 1 else re_.uniform(0.3, 0.7))
        stand(sx, z, -math.pi / 2 + re_.uniform(-0.35, 0.35), "sit", y=sy)
for (za, zb) in ((z0 - 1.2, z0 - 0.2), (z1 + 0.2, z1 + 1.2)):
    box((PL, "trim", 0), x0 - 1.6, x0 - 0.2, G, G + 0.62, za, zb, scale=1.0, col=GRANITE)
    box((PL, "glow", 0), x0 - 1.62, x0 - 0.18, G + 0.6, G + 0.63, za - 0.02, zb + 0.02, scale=1.0, col=dim("amber", 0.35))
    for t in range(3):
        P.place("shrub", x0 - 1.4 + t * 0.5, G + 0.62, (za + zb) / 2 + re_.uniform(-0.15, 0.15), re_.uniform(0, 6.28), sy=0.9, district=PL)
    shine(x0 - 0.9, 0.9, (za + zb) / 2, "amber", 2.5)

# ---------------------------------------------------------------------------
# The south terrace's open floor (TS): a raised bed with a tree and shrubs
# on a lit kerb, a line of light let into the paving each side of it, a
# lit menu on a stand by each of its two shops' doors, and people.
# ---------------------------------------------------------------------------
BX0, BX1, BZ0, BZ1 = 97.4, 101.2, -212.6, -209.4
box((PL, "trim", 0), BX0, BX1, TY, TY + 0.48, BZ0, BZ1, scale=1.0, col=GRANITE)
up_poly((PL, "glow", 0), [(BX0 + 0.12, BZ0 + 0.12), (BX1 - 0.12, BZ0 + 0.12), (BX1 - 0.12, BZ1 - 0.12), (BX0 + 0.12, BZ1 - 0.12)], TY + 0.47,
        (0.012, 0.03, 0.016, 1.0))
for (xa, xb, za, zb) in ((BX0, BX1, BZ0 - 0.03, BZ0), (BX0, BX1, BZ1, BZ1 + 0.03), (BX0 - 0.03, BX0, BZ0, BZ1), (BX1, BX1 + 0.03, BZ0, BZ1)):
    box((PL, "glow", 0), xa, xb, TY + 0.4, TY + 0.44, za, zb, scale=1.0, col=dim("amber", 0.5))
P.place("tree_round", (BX0 + BX1) / 2, TY + 0.48, (BZ0 + BZ1) / 2, 0.7, sy=0.95, district=PL)
for t in range(5):
    a = t * math.tau / 5 + 0.3
    P.place("shrub", (BX0 + BX1) / 2 + 1.3 * math.cos(a), TY + 0.48, (BZ0 + BZ1) / 2 + 1.0 * math.sin(a), re_.uniform(0, 6.28), sy=0.8, district=PL)
shine((BX0 + BX1) / 2, TY + 0.5, (BZ0 + BZ1) / 2, "amber", 4.0)
for z in (BZ0 - 1.6, BZ1 + 1.6):
    gline("amber", 93.4, z, 107.0, z, TY + 0.016, w=0.06)
for (mx, mz) in ((107.3, -219.4), (107.3, -205.2)):
    # A menu on a stand, lit from within, its back to the road's kerb.
    box((PL, "metal", 0), mx - 0.04, mx + 0.04, TY, TY + 1.0, mz - 0.04, mz + 0.04, scale=0.5)
    box((PL, "trim", 0), mx - 0.06, mx + 0.06, TY + 0.95, TY + 2.05, mz - 0.42, mz + 0.42, scale=0.5, col=GRANITE)
    box((PL, "glow", 0), mx - 0.08, mx - 0.06, TY + 1.0, TY + 2.0, mz - 0.37, mz + 0.37, scale=0.5, col=dim("amber", 0.75))
    for j in range(5):
        y = TY + 1.12 + j * 0.17
        box((PL, "glow", 1), mx - 0.09, mx - 0.08, y, y + 0.05, mz - 0.3, mz + 0.3 - 0.1 * (j % 3), scale=0.5, col=dim("white", 0.5))
    shine(mx - 0.8, TY + 1.0, mz, "amber", 3.0)
for (px, pz, yaw, pose) in ((102.4, -214.4, math.pi / 2, "talk"), (103.2, -214.2, -math.pi / 2, "talk"), (102.2, -208.4, math.pi, "phone"),
                            (104.6, -211.4, -math.pi / 2 + 0.4, "idle")):
    stand(px, pz, yaw, pose, y=TY + 0.02)

# ---------------------------------------------------------------------------
# The terraces' shops to the square (x 92): a blade between each pair of
# windows and a lit menu by each door (the fascias there were small, few
# signs on a long lit front).
# ---------------------------------------------------------------------------
fn = B.Face("-x", TX, TN[0], TN[1])
for s, size, k in ((6.4, "bm", 1.15), (15.0, "bs", 1.5), (23.6, "bm", 1.15)):
    blade_off(fn, s, 2.25, size, k)
for s in (3.2, 11.0, 19.2, 27.0):
    cx, _, cz = fn.p(fn.at(s), 0.0, 0.09)
    box((PL, "trim", 0), cx - 0.05, cx + 0.05, 1.05, 2.05, cz - 0.36, cz + 0.36, scale=0.5, col=GRANITE)
    box((PL, "glow", 0), cx - 0.07, cx - 0.05, 1.1, 2.0, cz - 0.31, cz + 0.31, scale=0.5, col=dim("white" if s < 15 else "amber", 0.65))
    for j in range(4):
        y = 1.2 + j * 0.19
        box((PL, "glow", 1), cx - 0.08, cx - 0.07, y, y + 0.05, cz - 0.25, cz + 0.25 - 0.08 * (j % 2), scale=0.5, col=dim("amber", 0.6))

# ---------------------------------------------------------------------------
# Steam: from the square's grates (two more, and the west strip's), and
# from vents in the court lane's walls. (Named zz so the city's other vents
# keep their own puffs: src/world/steam.js deals them in order.)
# ---------------------------------------------------------------------------
def clear(x, z, y, r=1.0):
    """Nothing of the plaza's already stands within r of (x, z) at y."""
    return not any(abs(py - y) < 1.0 and (px - x) ** 2 + (pz - z) ** 2 < r * r for _n, px, py, pz, *_ in P.INSTANCES)


for i, (px, pz) in enumerate(((56.5, -217.0), (50.8, -212.8))):
    if clear(px, pz, G):
        P.place("grate_glow", px, G, pz, district=PL)
    else:
        print(f"plaza: grate at ({px}, {pz}) is not clear")
    empty(f"anchor_steam_zz_plaza_grate_{i}", (px, G + 0.07, pz))
empty("anchor_steam_zz_plaza_grate_2", (53.0, G + 0.07, -246.6))

# ---------------------------------------------------------------------------
# The court lane behind the board (z -292..-284): the board's block's back
# (z -284, facing north) and C1's foot (z -292, facing south) worked as a
# service lane: pipes up the walls, units on brackets, a cable run with its
# drops, a lit service door under a hood, a shutter, tags, vents breathing.
# ---------------------------------------------------------------------------
BZ = -284.0
# (plaza_dress.py already hangs units, pipes, small screens and a bin store
# on its west half, x 50..77: these fill between and carry on east.)
for x in (79.4, 86.0, 97.8):
    P.place("pipe_v", x, G, BZ - 0.03, math.pi, sy=4.2, district=PL)
for (x, y) in ((80.6, 2.7), (91.6, 3.0), (102.4, 2.9), (88.0, 6.4), (95.4, 5.9)):
    P.place("ac_wall", x, y, BZ - 0.03, math.pi, district=PL)
pipe((PL, "metal", 1), (50.5, 3.85, BZ - 0.12), (106.0, 3.85, BZ - 0.12), 0.035, segs=4)
pipe((PL, "metal", 1), (50.5, 4.05, BZ - 0.12), (106.0, 4.05, BZ - 0.12), 0.025, segs=4)
for x in (79.0, 93.0, 104.0):
    pipe((PL, "metal", 1), (x, 3.85, BZ - 0.12), (x + 0.2, 2.3, BZ - 0.12), 0.02, segs=3)
    box((PL, "trim", 1), x - 0.15, x + 0.35, 1.9, 2.4, BZ - 0.2, BZ - 0.02, scale=0.5, col=(0.12, 0.13, 0.14, 1.0))
# The service door, between the small screens: a lit leaf in a steel frame
# under a hood, its lamp.
DX = 70.6
box((PL, "trim", 0), DX - 0.75, DX + 0.75, G, 2.5, BZ - 0.08, BZ - 0.01, scale=1.0, col=(0.05, 0.05, 0.055, 1.0))
box((PL, "glow", 0), DX - 0.6, DX + 0.6, G + 0.05, 2.35, BZ - 0.1, BZ - 0.08, scale=1.0, col=dim("amber", 0.5))
box((PL, "metal", 0), DX - 0.95, DX + 0.95, 2.6, 2.7, BZ - 1.0, BZ, scale=0.5)
box((PL, "glow", 0), DX - 0.15, DX + 0.15, 2.52, 2.6, BZ - 0.55, BZ - 0.35, scale=0.5, col=dim("white", 0.9))
light(PL, DX, 2.4, BZ - 1.2, "amber", 4.0)
# A shutter, ribbed, a lamp over it.
SX0, SX1 = 83.0, 86.6
box((PL, "trim", 0), SX0, SX1, G, 3.0, BZ - 0.06, BZ - 0.01, scale=1.0, col=(0.16, 0.16, 0.17, 1.0))
for j in range(14):
    y = G + 0.12 + j * 0.2
    box((PL, "trim", 1), SX0 + 0.05, SX1 - 0.05, y, y + 0.03, BZ - 0.08, BZ - 0.06, scale=0.5, col=(0.08, 0.08, 0.085, 1.0))
box((PL, "glow", 0), (SX0 + SX1) / 2 - 0.2, (SX0 + SX1) / 2 + 0.2, 3.2, 3.3, BZ - 0.3, BZ - 0.05, scale=0.5, col=dim("white", 0.8))
light(PL, (SX0 + SX1) / 2, 3.0, BZ - 1.0, "white", 3.0)
# Tags low on the wall: sprayed patches in the lane's dark.
for (xa, w, h, hue) in ((57.4, 2.0, 0.8, (0.3, 0.06, 0.24)), (78.0, 1.6, 0.7, (0.05, 0.22, 0.2)), (89.0, 2.6, 1.0, (0.26, 0.2, 0.04)),
                        (99.0, 1.4, 0.8, (0.08, 0.1, 0.3))):
    y0 = 0.45 + re_.uniform(0.0, 0.25)
    box((PL, "trim", 1), xa, xa + w, y0, y0 + h, BZ - 0.025, BZ - 0.012, scale=0.5, col=(*hue, 1.0))
    box((PL, "trim", 1), xa + 0.2, xa + w - 0.3, y0 + h * 0.35, y0 + h * 0.55, BZ - 0.03, BZ - 0.025, scale=0.5, col=(0.32, 0.32, 0.3, 1.0))
for i, x in enumerate((60.2, 88.4)):
    box((PL, "metal", 1), x - 0.3, x + 0.3, 2.6, 3.0, BZ - 0.12, BZ - 0.01, scale=0.5)
    empty(f"anchor_steam_zz_lane_plaza_{i}", (x, 2.8, BZ - 0.2))
# C1's foot across the lane, under its three screens: a long planter on a
# lit kerb (it was a flat dark plane under them), units and a pipe in the
# gaps between the screens.
CZ = -292.0
box((PL, "trim", 0), 55.0, 73.4, G, G + 0.55, CZ + 0.05, CZ + 0.75, scale=1.0, col=GRANITE)
box((PL, "glow", 0), 55.0, 73.4, G + 0.53, G + 0.56, CZ + 0.74, CZ + 0.77, scale=1.0, col=dim("amber", 0.45))
for t in range(12):
    P.place("shrub", 55.8 + t * 1.5 + re_.uniform(-0.2, 0.2), G + 0.55, CZ + 0.42, re_.uniform(0, 6.28), sy=0.85, district=PL)
for x in (56.0, 64.0, 72.0):
    light(PL, x, 0.8, CZ + 1.2, "amber", 2.5)
for (x, y) in ((61.8, 2.6), (68.2, 3.4)):
    P.place("ac_wall", x, y, CZ + 0.03, 0.0, district=PL)
P.place("pipe_v", 54.6, G, CZ + 0.03, 0.0, sy=4.2, district=PL)
# Higher on the block's back, round its posters (the wall over the lane was
# bare grey to 9 m): two conduits along it with boxes on them, and a steel
# ladder up to the roof's plant with a cage round its upper half.
for y in (6.25, 7.55):
    pipe((PL, "metal", 1), (50.4, y, BZ - 0.1), (106.2, y, BZ - 0.1), 0.045, segs=4)
for x in (54.2, 59.8, 70.2, 77.6, 84.4, 92.8, 99.6, 105.0):
    y = 6.25 if x < 80 else 7.55
    box((PL, "trim", 1), x - 0.22, x + 0.22, y - 0.32, y + 0.3, BZ - 0.22, BZ - 0.02, scale=0.5, col=(0.13, 0.14, 0.15, 1.0))
LX = 81.8
for dx in (-0.22, 0.22):
    box((PL, "metal", 0), LX + dx - 0.03, LX + dx + 0.03, 2.8, 44.0, BZ - 0.32, BZ - 0.26, scale=0.5)
yy = 3.0
while yy < 43.8:
    box((PL, "metal", 1), LX - 0.22, LX + 0.22, yy, yy + 0.03, BZ - 0.3, BZ - 0.27, scale=0.5)
    yy += 0.3
yy = 6.0
while yy < 43.0:
    pipe((PL, "metal", 1), (LX - 0.38, yy, BZ - 0.02), (LX - 0.38, yy, BZ - 0.85), 0.018, segs=3)
    pipe((PL, "metal", 1), (LX + 0.38, yy, BZ - 0.02), (LX + 0.38, yy, BZ - 0.85), 0.018, segs=3)
    pipe((PL, "metal", 1), (LX - 0.38, yy, BZ - 0.85), (LX + 0.38, yy, BZ - 0.85), 0.018, segs=3)
    yy += 2.4
box((PL, "glow", 1), LX - 0.12, LX + 0.12, 9.0, 9.2, BZ - 0.3, BZ - 0.1, scale=0.5, col=GLOW["red"])
