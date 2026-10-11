"""The square under the board (BIBLE.md, "Corpo Plaza").

Wet stone in big slabs that hold the board's light (YRL74JmhVgk@18, @133:
the slabs are the road paint's wet, mirrored surface in stone's colours),
lines of light set in it, and in its middle a glass roof over the hall
below, faceted and glowing (PzkEqhVByw4@86, M6VoEJdoHi8@8, and from the air
the lit hub of ax5YUmkWf_Y@9). Shops under the board behind a canopy. On the
east side two raised terraces (KvMY1uzSC1E@29, @43): wide stairs with light
in their risers, rails with a line of cyan, hedges and palms, shops in
their bases to the square, to the passage between them and to the x 120
road, and the square's two east screens standing over them on steel
(YRL74JmhVgk@133), adverts on their backs for the road.

What the square keeps clear: the walkers' two lines (z -230 and z -196,
at ground level: the passage between the terraces is the first line's way
out to the road), the braindance's fixed camera at (90, 2.2, -199) and its
view south, the low camera's line from the plaza street to the board
(nothing in the middle over 5 m at z -190 rising to 15 m at z -250), the
GPU on the canyon's back wall (the west strip stays low), the Work shot's
frame (nothing north of z -232 over 7.5 m).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403

X0, X1, Z0, Z1 = 48.0, 108.0, -262.0, -190.0
G = 0.15
TY = SHOP_H           # the terraces' floor: a shop's height over the square
TX = 92.0             # their west edge
TN = (-264.0, -234.0)  # the north terrace, against the board's block
TS = (-226.0, -200.0)  # the south terrace
STAIR = (83.6, TX, -224.0, -206.0)
HUB = (79.0, -213.0, 9.5)
rs = random.Random(8400)

# ---------------------------------------------------------------------------
# Paving: slabs in courses, each its own tone, joints open to a dark bed.
# ---------------------------------------------------------------------------
ground((PL, "dark", 0), X0, X1, Z0, Z1, y=G - 0.03, scale=2.0)
STONE = ((0.27, 0.28, 0.31), (0.27, 0.28, 0.31), (0.33, 0.34, 0.37), (0.44, 0.45, 0.48), (0.13, 0.135, 0.15))


def pave(x0, x1, z0, z1, r):
    z = z1
    while z > z0 + 0.5:
        d = min(r.choice((3.6, 4.8, 6.0)), z - z0)
        if z - d - z0 < 1.5:
            d = z - z0
        x = x0
        while x < x1 - 0.5:
            w = min(r.uniform(3.6, 8.4), x1 - x)
            if x1 - (x + w) < 1.8:
                w = x1 - x
            t = r.choice(STONE)
            k = r.uniform(0.86, 1.14)
            pts = ((x + 0.03, G, z - 0.03), (x + w - 0.03, G, z - 0.03), (x + w - 0.03, G, z - d + 0.03), (x + 0.03, G, z - d + 0.03))
            quad((PL, "paint", 0), *pts, uvs=tuple((p[0] / 2.0, -p[2] / 2.0) for p in pts), col=(t[0] * k, t[1] * k, t[2] * k, 1.0))
            x += w
        z -= d


for rect in ((X0, STAIR[0], Z0, Z1), (STAIR[0], X1, TS[1], Z1), (STAIR[0], TX, STAIR[3], TS[1]), (STAIR[0], TX, TS[0], STAIR[2]),
             (STAIR[0], X1, TN[1], TS[0]), (STAIR[0], TX, Z0, TN[1])):
    pave(rect[0], rect[1], rect[2], rect[3], rs)

# Lines of light in the stone: the promenade's two edges in front of the
# board, a yellow line along the plaza street's side (YRL74JmhVgk@30), and
# ticks round the hub like a dial.
for z in (-233.3, -226.7):
    gline("cyan", 50.5, z, STAIR[0] - 0.6, z, G + 0.012)
gline("yellow", 49.0, -191.5, 107.0, -191.5, G + 0.012, w=0.1)
for i in range(16):
    a = i * math.tau / 16 + math.tau / 32
    gline("cyan", HUB[0] + 11.3 * math.cos(a), HUB[1] + 11.3 * math.sin(a), HUB[0] + 13.2 * math.cos(a), HUB[1] + 13.2 * math.sin(a),
          G + 0.012, w=0.09)

# ---------------------------------------------------------------------------
# The hub: a glass roof, faceted, lit from the hall under it, in a stone
# kerb people sit on, and over its middle a spire of light.
# ---------------------------------------------------------------------------
hx, hz, hr = HUB
N = 16
kerb = ngon(hx, hz, hr + 0.8, 24)
walls((PL, "concrete", 0), kerb, G, 0.62, (1, 1, 1, 1))
walls((PL, "concrete", 0), list(reversed(ngon(hx, hz, hr, 24))), 0.4, 0.62, (1, 1, 1, 1))
ring((PL, "concrete", 0), hx, hz, hr, hr + 0.8, 0.62, n=24)
walls((PL, "neon_cyan", 0), ngon(hx, hz, hr + 0.83, 24), G + 0.02, G + 0.08, (1, 1, 1, 1))
RINGS = ((hr, 0.42), (6.3, 1.05), (3.1, 1.5))
for i in range(N):
    a0, a1 = i * math.tau / N, (i + 1) * math.tau / N
    for j, (r0, y0) in enumerate(RINGS):
        r1, y1 = RINGS[j + 1] if j + 1 < len(RINGS) else (0.0, 1.68)
        p = [(hx + rr * math.cos(a), yy, hz + rr * math.sin(a)) for rr, yy in ((r0, y0), (r1, y1)) for a in (a0, a1)]
        tone = lambda: dim("teal", rs.uniform(0.05, 0.2)) if rs.random() < 0.85 else dim("white", rs.uniform(0.07, 0.13))  # noqa: E731
        up_tri((PL, "glow", 0), p[0], p[1], p[2], tone())
        if r1 > 0:
            up_tri((PL, "glow", 0), p[1], p[3], p[2], tone())
# Its glazing bars: a rib down each joint between the panes and a ring at
# each break in the slope, steel against the light.
for i in range(N):
    a = i * math.tau / N
    pts = [(hx + rr * math.cos(a), yy + 0.03, hz + rr * math.sin(a)) for rr, yy in RINGS] + [(hx, 1.71, hz)]
    for p0, p1 in zip(pts, pts[1:]):
        pipe((PL, "metal", 1), p0, p1, 0.045, segs=3)
    for rr, yy in RINGS[1:]:
        a1 = (i + 1) * math.tau / N
        pipe((PL, "metal", 1), (hx + rr * math.cos(a), yy + 0.03, hz + rr * math.sin(a)),
             (hx + rr * math.cos(a1), yy + 0.03, hz + rr * math.sin(a1)), 0.045, segs=3)
for i in range(12):
    a = i * math.tau / 12
    light(PL, hx + (hr + 2.0) * math.cos(a), 0.6, hz + (hr + 2.0) * math.sin(a), "teal", 3.5)
# The spire: rings of light stepping in up a mast of four lines, a lamp at
# its tip, all under the low camera's line to the board's foot.
for dx, dz in ((0.45, 0.0), (-0.45, 0.0), (0.0, 0.45), (0.0, -0.45)):
    box((PL, "glow", 0), hx + dx - 0.03, hx + dx + 0.03, 1.6, 7.7, hz + dz - 0.03, hz + dz + 0.03, scale=1.0, col=dim("cyan", 0.5))
for i in range(7):
    rr, yy = 2.0 - 0.22 * i, 2.5 + 0.8 * i
    colour = "white" if i % 3 == 2 else "cyan"
    walls((PL, "glow", 0), ngon(hx, hz, rr, 12, turn=i * 0.26), yy, yy + 0.07, dim(colour, 0.9))
    ring((PL, "glow", 0), hx, hz, rr - 0.07, rr, yy + 0.07, n=12, col=dim(colour, 0.9), turn=i * 0.26)
oriented_box((PL, "glow", 0), hx, 7.95, hz, 0.36, 0.36, 0.36, math.pi / 4, scale=1.0, col=GLOW["magenta"])

# ---------------------------------------------------------------------------
# Under the board: shops in the block's ground floor behind a canopy.
# ---------------------------------------------------------------------------
frontage_x(PL, X0 + 0.4, TX - 0.4, -264.0, 8401, facing=1, awning=False)
fascia_signs_x(X0 + 0.6, TX - 0.6, -264.0, 1, random.Random(8402))
box((PL, "metal", 0), X0 + 1.0, TX - 0.5, 4.62, 4.84, -264.0, -260.6, scale=1.0, bottom=True)
nbox("cyan", X0 + 1.0, TX - 0.5, 4.66, 4.72, -260.6, -260.57)
x = X0 + 3.0
while x < TX - 3.0:
    box((PL, "neon_white", 0), x - 0.35, x + 0.35, 4.58, 4.62, -261.5, -261.4, scale=0.5)
    x += 6.6
# The block's face to the x 120 road, and its back corner to the lane.
for k, (za, zb) in enumerate(((-284.0, -274.0), (-274.0, -264.0))):
    shopfront(PL, -1, za, zb, 8403 + k, awning=True, xf=108.03)
fascia_signs_z(-283.4, -264.6, 108.03, 1, random.Random(8405))
clutter(PL, -1, -283.0, -265.0, 16.0, 8406, xw=108.0)
# Its backs, to the canyon's lane and to the yard behind it: concrete at
# street level with its doors, caged lamps and what a back keeps by them.
B.back_ground(PL, B.Face("-x", 47.97, -284.0, -264.0), random.Random(8407), B.TRIM[0])
B.back_ground(PL, B.Face("-z", -284.03, 48.0, 78.0), random.Random(8408), B.TRIM[0])

# ---------------------------------------------------------------------------
# The terraces.
# ---------------------------------------------------------------------------
for k, (za, zb) in enumerate((TN, TS)):
    box((PL, "dark", 0), TX + 0.03, X1 - 0.03, 0.0, TY, za, zb, scale=2.0)
    ground((PL, "sidewalk", 0), TX + 0.03, X1 - 0.03, za, zb, y=TY + 0.01, scale=2.0)
    B.COLLISION.append(("box", TX, X1, 0.0, TY, za, zb, PL))
    # A stone coping round the top, a line of cyan under its lip.
    for (a0, a1, b0, b1) in ((TX - 0.25, X1 + 0.25, zb - 0.02, zb + 0.25), (TX - 0.25, X1 + 0.25, za - 0.25, za + 0.02),
                             (TX - 0.25, TX + 0.05, za, zb), (X1 - 0.05, X1 + 0.25, za, zb)):
        if k == 0 and b1 <= za + 0.03:
            continue  # the north terrace's north edge is the board's block
        box((PL, "concrete", 0), a0, a1, TY - 0.28, TY + 0.02, b0, b1, scale=1.5, bottom=True)
    nbox("cyan", TX - 0.28, TX - 0.25, TY - 0.24, TY - 0.18, za + 0.1, zb - 0.1)
    nbox("cyan", X1 + 0.25, X1 + 0.28, TY - 0.24, TY - 0.18, za + 0.1, zb - 0.1)
    # Shops in the base, to the road.
    z = za
    for j, w in enumerate((7.5, 7.5, 7.5, 7.5) if k == 0 else (6.5, 6.5, 6.5, 6.5)):
        shopfront(PL, -1, z, z + w, 8410 + k * 10 + j, awning=j % 2 == 0, xf=X1)
        z += w
    fascia_signs_z(za + 0.6, zb - 0.6, X1, 1, random.Random(8430 + k))
# The north terrace's base to the square, and both to the passage; the
# south terrace's south end to the plaza street's side of the square.
z = TN[0]
for j, w in enumerate((7.5, 7.5, 7.5, 7.5)):
    shopfront(PL, 1, z, z + w, 8440 + j, awning=j % 2 == 1, xf=TX)
    z += w
fascia_signs_z(TN[0] + 0.6, TN[1] - 0.6, TX, -1, random.Random(8445))
frontage_x(PL, TX + 0.4, X1 - 0.4, TN[1], 8446, facing=1, awning=False)
frontage_x(PL, TX + 0.4, X1 - 0.4, TS[0], 8447, facing=-1, awning=False)
frontage_x(PL, TX + 0.4, X1 - 0.4, TS[1], 8448, facing=1, awning=True)
fascia_signs_x(TX + 0.6, X1 - 0.6, TN[1], 1, random.Random(8449))
fascia_signs_x(TX + 0.6, X1 - 0.6, TS[0], -1, random.Random(8450))
fascia_signs_x(TX + 0.6, X1 - 0.6, TS[1], 1, random.Random(8451))
# The bridge between them over the passage: a slab, its soffit lit.
BX0, BX1 = 95.0, 105.0
box((PL, "concrete", 0), BX0, BX1, TY - 0.42, TY + 0.02, TN[1] - 0.2, TS[0] + 0.2, scale=1.5, bottom=True)
for x in (BX0 + 0.02, BX1 - 0.08):
    nbox("cyan", x, x + 0.06, TY - 0.47, TY - 0.42, TN[1] + 0.3, TS[0] - 0.3)
for x in (97.5, 100.0, 102.5):
    box((PL, "neon_white", 0), x - 0.12, x + 0.12, TY - 0.45, TY - 0.42, TN[1] + 1.0, TS[0] - 1.0, scale=1.0)
    light(PL, x, 3.6, (TN[1] + TS[0]) / 2, "white", 2.5)
rail([(BX0 + 0.15, TN[1]), (BX0 + 0.15, TS[0])], TY + 0.02)
rail([(BX1 - 0.15, TN[1]), (BX1 - 0.15, TS[0])], TY + 0.02)
for z in (TN[1] + 1.2, TS[0] - 1.2):
    P.place("bollard_cube", X1 - 0.6, G, z, district=PL)
# Rails round the terraces' edges, open where the stairs and the bridge land.
e = 0.3
rail([(TX + e, TN[0] + 0.4), (TX + e, TN[1] - e), (BX0 + 0.15, TN[1] - e)], TY + 0.02)
rail([(BX1 - 0.15, TN[1] - e), (X1 - e, TN[1] - e), (X1 - e, TN[0] + 0.4)], TY + 0.02)
rail([(TX + e, STAIR[2]), (TX + e, TS[0] + e), (BX0 + 0.15, TS[0] + e)], TY + 0.02)
rail([(BX1 - 0.15, TS[0] + e), (X1 - e, TS[0] + e), (X1 - e, TS[1] - e), (TX + e, TS[1] - e), (TX + e, STAIR[3])], TY + 0.02)
# The stairs.
stair_x(STAIR[0], STAIR[1], STAIR[2], STAIR[3], G, TY + 0.01)
for z in (STAIR[2], STAIR[3]):
    light(PL, 86.0, 1.0, z + (0.8 if z == STAIR[3] else -0.8), "cyan", 3.0)
    light(PL, 90.0, 2.0, z + (0.8 if z == STAIR[3] else -0.8), "cyan", 3.0)
for z in (-221.0, -215.0, -209.0):
    light(PL, 87.5, 2.4, z, "cyan", 2.0)
# What the terraces hold: a hedge line under the screens, beds and benches,
# palms on the south one (the Work shot's frame passes over the north).
for (za, zb) in (TN, TS):
    z = za + 1.4
    while z + 4.0 < zb - 1.0:
        planter(105.2, 106.8, z, z + 4.2, y=TY, h=0.4, hedge=0.7, edge="cyan", r=rs, side="-x")
        z += 5.6
planter(96.5, 101.5, -262.2, -260.8, y=TY, h=0.4, hedge=0.6, edge="cyan", r=rs, side="+z")
planter(100.0, 101.4, -252.0, -246.0, y=TY, h=0.4, hedge=0.6, edge="cyan", r=rs, side="+x")
planter(100.0, 101.4, -243.0, -238.0, y=TY, h=0.4, hedge=0.6, edge="cyan", r=rs, side="+x")
for (px, pz, yaw) in ((99.0, -249.0, -math.pi / 2), (99.0, -240.5, -math.pi / 2), (94.2, -256.0, -math.pi / 2), (94.2, -246.0, -math.pi / 2)):
    P.place("bench", px, TY, pz, yaw, district=PL)
for (px, pz) in ((102.5, -221.5), (97.0, -203.0), (102.8, -210.5)):
    P.place("planter_palm", px, TY, pz, rs.uniform(0, 6.28), district=PL)
    light(PL, px, TY + 1.0, pz, "amber", 2.5)
for (px, pz, yaw) in ((99.0, -218.0, -math.pi / 2), (99.5, -206.5, math.pi), (95.0, -203.0, 0.0)):
    P.place("bench", px, TY, pz, yaw, district=PL)
for (px, pz) in ((100.5, -236.0), (95.5, -224.0), (101.0, -201.8), (93.2, -235.2), (103.5, -216.0)):
    P.place("lamp_short", px, TY, pz, district=PL)
    light(PL, px, TY + 3.0, pz, "amber", 8.0)
P.place("kiosk", 102.0, TY, -256.5, -math.pi / 2, district=PL)
# Their floors are lit from the rails' feet and the planters: soft pools.
for (za, zb) in (TN, TS):
    z = za + 3.0
    while z < zb - 2.0:
        for x in (95.5, 100.0, 104.0):
            light(PL, x + rs.uniform(-0.8, 0.8), TY + 0.5, z + rs.uniform(-1.0, 1.0), rs.choice(("white", "white", "cyan")), 6.0)
        z += 5.5
# The square's two east screens (board_3, board_4), on masts off the
# terraces' edge, an advert on the back of each for the road.
for cz, masts in ((-205.0, (-209.0, -201.0)), (-228.0, (-234.6, -225.4))):
    for mz in masts:
        box((PL, "metal", 0), 107.25, 107.65, TY, 15.7, mz - 0.2, mz + 0.2, scale=1.0)
        for y in (9.2, 14.8):
            box((PL, "metal", 1), 107.65, 109.5, y - 0.1, y + 0.1, mz - 0.1, mz + 0.1, scale=0.5)
        box((PL, "glow", 1), 107.33, 107.57, 15.7, 15.95, mz - 0.12, mz + 0.12, scale=0.5, col=GLOW["red"])
    box((PL, "metal", 1), 107.35, 107.55, 15.3, 15.5, masts[0], masts[1], scale=0.5)
    box((PL, "metal", 1), 109.5, 109.9, 8.55, 8.75, cz - 4.7, cz + 4.7, scale=0.5)
    rotated_quad((PL, "billboard", 0), 109.99, 12.0, cz, 9.0, 6.0, math.pi / 2, col=(rs.randrange(8) / 8.0 + 0.01, rs.randrange(8) / 8.0 + 0.01, rs.random(), 1.0))

# ---------------------------------------------------------------------------
# The square's furniture.
# ---------------------------------------------------------------------------
# West strip, low under the GPU on the canyon's wall: hedges, benches,
# cubes along the lane's edge.
for (za, zb) in ((-258.0, -252.0), (-248.0, -242.0), (-224.0, -218.0), (-214.0, -208.0), (-204.5, -199.0)):
    planter(49.4, 51.0, za, zb, r=rs, side="+x")
    P.place("bench", 52.0, G, (za + zb) / 2, math.pi / 2, district=PL)
z = -260.0
while z < -191.0:
    if not -234.0 < z < -226.0:
        P.place("bollard_cube", 48.5, G, z, district=PL)
    z += 3.0
# South strip: cubes along the plaza street, palms and benches west of the
# braindance's camera, a pylon, lamps.
x = 49.5
while x < 107.5:
    P.place("bollard_cube", x, G, -190.7, district=PL)
    x += 2.5
for px in (54.5, 62.5, 70.5, 105.0):
    P.place("planter_palm", px, G, -193.4, rs.uniform(0, 6.28), district=PL)
    light(PL, px, 1.0, -193.4, "amber", 3.0)
for px in (58.5, 66.5):
    P.place("bench", px, G, -193.6, math.pi, district=PL)
P.place("pylon_hex", 74.5, G, -193.6, 0.0, district=PL)
P.place("phone_booth", 50.3, G, -193.2, math.pi / 2, district=PL)
P.place("food_box", 52.2, G, -198.6, math.pi / 2, district=PL)
P.place("bin", 60.6, G, -193.4, district=PL)
P.place("bin", 98.5, G, -198.9, district=PL)
P.place("kiosk", 56.0, G, -203.0, math.pi / 2, district=PL)
P.place("cctv", 51.6, G, -196.2, district=PL)
P.place("cctv", 106.0, G, -198.6, district=PL)
big_sign("bl", 1.8, 105.6, G + 0.9 + 4.5, -196.6, math.pi / 4)
box((PL, "concrete", 0), 104.9, 106.3, G, G + 0.9, -197.3, -195.9, scale=1.0)
# The garden between the promenade and the board: two rows of beds, trees
# between the far row's, benches turned to the board.
for i, bx_ in enumerate((56.0, 64.0, 72.0, 80.0)):
    planter(bx_, bx_ + 5.0, -247.6, -246.0, r=rs, side="+z")
    planter(bx_ + 2.0, bx_ + 7.0, -241.0, -239.4, r=rs, side="+z")
    P.place("bench", bx_ + 4.5, G, -238.6, 0.0, district=PL)
    P.place("bench", bx_ + 2.5, G, -244.6, math.pi, district=PL)
    if i < 3:
        P.place("planter_tree", bx_ + 6.5, G, -246.8, rs.uniform(0, 6.28), district=PL)
        light(PL, bx_ + 6.5, 1.0, -246.8, "white", 2.5)
for (px, pz, yaw) in ((54.6, -236.0, math.pi / 2), (90.0, -238.0, -math.pi / 2), (58.0, -199.0, math.pi), (66.0, -224.5, 0.0),
                      (54.6, -216.0, math.pi / 2), (72.0, -251.5, 0.0), (86.0, -251.5, 0.0), (100.5, -196.4, math.pi)):
    P.place("lamp_plaza", px, G, pz, yaw, district=PL)
    # Its pool on the stone (the head is too small for the bake to find).
    light(PL, px + 1.8 * math.sin(yaw), 3.0, pz + 1.8 * math.cos(yaw), "white", 8.0)
P.place("cctv", 60.0, G, -258.6, district=PL)
P.place("cctv", 90.4, G, -227.2, district=PL)
for px in (62.0, 76.0):
    P.place("bench", px, G, -258.2, 0.0, district=PL)
P.place("vending", 49.2, G, -263.4, 0.0, district=PL)
P.place("vending", 50.4, G, -263.4, 0.0, district=PL)
P.place("bin", 52.0, G, -260.8, district=PL)
P.place("bin", 91.0, G, -236.0, district=PL)

# ---------------------------------------------------------------------------
# People who are not walking through.
# ---------------------------------------------------------------------------
SEAT = G + 0.48
# On the benches of the garden, the west strip and the south strip.
for (px, pz, yaw) in ((60.3, -238.6, 0.0), (61.0, -238.6, 0.0), (76.8, -238.6, 0.0), (58.3, -244.6, math.pi), (74.9, -244.6, math.pi),
                      (82.2, -244.6, math.pi), (52.0, -255.3, math.pi / 2), (52.0, -221.4, math.pi / 2), (52.0, -210.6, math.pi / 2),
                      (58.2, -193.6, math.pi), (66.9, -193.6, math.pi), (62.3, -258.2, 0.0), (76.4, -258.2, 0.0)):
    stand(px, pz, yaw, "sit", y=SEAT)
# On the hub's kerb, looking out, and round it.
for a in (0.5, 1.1, 2.6, 3.9, 4.4, 5.6):
    stand(hx + (hr + 0.45) * math.cos(a), hz + (hr + 0.45) * math.sin(a), math.atan2(math.cos(a), math.sin(a)), "sit", y=0.62)
for (px, pz, yaw, pose) in ((67.0, -207.5, 1.0, "talk"), (68.1, -206.6, 1.0 + math.pi, "talk"), (82.6, -202.0, -1.8, "phone"),
                            (72.3, -200.4, 2.6, "idle"), (86.0, -202.5, 0.4, "talk"), (86.9, -201.5, 0.4 + math.pi, "talk"),
                            (64.0, -221.5, math.pi, "phone"), (74.0, -236.3, math.pi, "idle"), (75.0, -236.0, math.pi, "idle"),
                            (88.0, -249.0, 2.2, "talk"), (89.0, -249.8, 2.2 + math.pi, "talk"), (88.2, -250.6, 0.4, "talk"),
                            (66.0, -252.5, math.pi, "idle"), (69.5, -254.0, 2.9, "phone"), (57.5, -251.0, 2.6, "smoke"),
                            (58.4, -203.0, -math.pi / 2, "idle"), (59.4, -203.5, -math.pi / 2, "phone"), (53.0, -228.2, math.pi / 2, "lean"),
                            (79.5, -192.6, math.pi, "squat"), (97.0, -193.5, 0.0, "phone"), (102.5, -192.8, 2.4, "idle")):
    stand(px, pz, yaw, pose, y=G)
# At the shops under the board, and the block's doors: security.
for (px, pz, yaw, pose) in ((55.0, -261.8, 0.0, "idle"), (71.5, -262.2, 0.0, "idle"), (86.2, -262.0, 0.0, "idle"), (80.0, -261.0, math.pi, "idle"),
                            (64.5, -261.4, math.pi, "phone"), (91.5, -259.0, -math.pi / 2, "lean"), (90.8, -243.0, math.pi / 2, "idle"),
                            (90.5, -252.4, -math.pi / 2, "talk"), (89.6, -252.4, math.pi / 2, "talk")):
    stand(px, pz, yaw, pose, y=G)
# On the stairs: sitting on the steps, standing on them.
run_, rise_ = (STAIR[1] - STAIR[0]) / 28, (TY + 0.01 - G) / 28
for (i, pz, pose) in ((5, -222.0, "sit"), (5, -221.3, "sit"), (11, -210.5, "sit"), (16, -216.5, "phone"), (8, -207.5, "idle"), (20, -223.0, "sit")):
    stand(STAIR[0] + (i + 0.5) * run_, pz, -math.pi / 2, pose, y=G + (i + 1) * rise_)
# On the terraces: at the rails looking at the board and the square, on
# the benches, at the kiosk, under the screens.
for (px, pz, yaw, pose) in ((93.0, -251.0, -math.pi / 2, "idle"), (93.0, -249.8, -math.pi / 2, "idle"), (93.1, -240.0, math.pi / 2, "lean"),
                            (99.9, -256.5, math.pi / 2, "idle"), (99.0, -255.9, math.pi / 2, "phone"), (103.5, -244.0, 1.2, "talk"),
                            (104.3, -243.2, 1.2 + math.pi, "talk"), (100.0, -230.0, 0.0, "idle"), (96.2, -229.0, math.pi, "phone"),
                            (93.1, -202.5, math.pi / 2, "lean"), (101.0, -214.0, 2.0, "talk"), (101.9, -214.9, 2.0 + math.pi, "talk"),
                            (104.0, -205.5, -math.pi / 2, "phone"), (96.0, -201.2, 0.0, "idle"), (104.0, -235.5, -math.pi / 2, "smoke")):
    stand(px, pz, yaw, pose, y=TY + 0.02)
for (px, pz, yaw) in ((99.0, -249.3, -math.pi / 2), (99.0, -240.2, -math.pi / 2), (94.2, -245.7, -math.pi / 2), (99.0, -218.3, -math.pi / 2), (99.5, -206.5, math.pi)):
    stand(px, pz, yaw, "sit", y=TY + 0.5)
# In the passage and along the terraces' shops on the road.
for (px, pz, yaw, pose) in ((96.0, -232.9, math.pi, "idle"), (103.0, -227.2, 0.0, "phone"), (108.6, -256.0, math.pi / 2, "lean"),
                            (108.6, -246.5, -math.pi / 2, "idle"), (108.7, -239.0, math.pi / 2, "smoke"), (108.6, -220.0, math.pi / 2, "lean"),
                            (108.6, -211.0, -math.pi / 2, "idle"), (108.6, -210.0, -math.pi / 2, "idle"), (108.7, -203.0, math.pi / 2, "phone"),
                            (108.6, -278.0, math.pi / 2, "lean"), (108.7, -268.5, -math.pi / 2, "idle")):
    stand(px, pz, yaw, pose, y=G)
