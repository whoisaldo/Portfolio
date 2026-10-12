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
from ncw.districts.plaza_hub import STAIR

X0, X1, Z0, Z1 = 48.0, 108.0, -262.0, -190.0
G = 0.15
TY = SHOP_H           # the terraces' floor: a shop's height over the square
TX = 92.0             # their west edge
TN = (-264.0, -234.0)  # the north terrace, against the board's block
TS = (-226.0, -200.0)  # the south terrace
assert STAIR[1] == TX
rs = random.Random(8400)

# The paving itself (slabs, the carpet, the terraces' floors) is laid last,
# by plaza_paving.py, under the light of everything that stands here.
COURT = (55.0, 81.0, -212.4, -198.6)
SX = STAIR[0]

# A yellow line of light in the stone along the plaza street's side
# (YRL74JmhVgk@30). The hub in the square's middle, its ring and its spokes
# are plaza_hub.py's.
gline("yellow", 49.0, -191.5, 107.0, -191.5, G + 0.012, w=0.1)

# ---------------------------------------------------------------------------
# Under the board: shops in the block's ground floor behind a canopy.
# ---------------------------------------------------------------------------
frontage_x(PL, X0 + 0.4, TX - 0.4, -264.0, 8401, facing=1, awning=False)
fascia_signs_x(X0 + 0.6, TX - 0.6, -264.0, 1, random.Random(8402))
box((PL, "metal", 0), X0 + 1.0, TX - 0.5, 4.62, 4.84, -264.0, -260.6, scale=1.0, bottom=True)
nbox("white", X0 + 1.0, TX - 0.5, 4.66, 4.72, -260.6, -260.57)
x = X0 + 3.0
while x < TX - 3.0:
    box((PL, "neon_white", 0), x - 0.35, x + 0.35, 4.58, 4.62, -261.5, -261.4, scale=0.5)
    x += 6.6
# The block's face to the x 120 road, and its back corner to the lane.
for k, (za, zb) in enumerate(((-284.0, -274.0), (-274.0, -264.0))):
    shopfront(PL, -1, za, zb, 8403 + k, awning=True, xf=108.03)
fascia_signs_z(-283.4, -264.6, 108.03, 1, random.Random(8405))
# Its backs, to the canyon's lane and to the yard behind it: concrete at
# street level with its doors, caged lamps and what a back keeps by them.
B.back_ground(PL, B.Face("-x", 47.97, -284.0, -264.0), random.Random(8407), B.TRIM[0])
B.back_ground(PL, B.Face("-z", -284.03, 48.0, 78.0), random.Random(8408), B.TRIM[0])

# ---------------------------------------------------------------------------
# The terraces.
# ---------------------------------------------------------------------------
for k, (za, zb) in enumerate((TN, TS)):
    box((PL, "dark", 0), TX + 0.03, X1 - 0.03, 0.0, TY, za, zb, scale=2.0)
    B.COLLISION.append(("box", TX, X1, 0.0, TY, za, zb, PL))
    # A stone coping round the top, a line of light under its lip on the
    # square's side (cyan on the north terrace, amber on the south) and on
    # the south one's side to the road (magenta).
    for (a0, a1, b0, b1) in ((TX - 0.25, X1 + 0.25, zb - 0.02, zb + 0.25), (TX - 0.25, X1 + 0.25, za - 0.25, za + 0.02),
                             (TX - 0.25, TX + 0.05, za, zb), (X1 - 0.05, X1 + 0.25, za, zb)):
        if k == 0 and b1 <= za + 0.03:
            continue  # the north terrace's north edge is the board's block
        box((PL, "concrete", 0), a0, a1, TY - 0.28, TY + 0.02, b0, b1, scale=1.5, bottom=True)
    nbox("amber" if k else "cyan", TX - 0.28, TX - 0.25, TY - 0.24, TY - 0.18, za + 0.1, zb - 0.1)
    if k:
        nbox("magenta", X1 + 0.25, X1 + 0.28, TY - 0.24, TY - 0.18, za + 0.1, zb - 0.1)
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
shopfront(PL, 1, TS[0], STAIR[2], 8452, awning=False, xf=TX)
frontage_x(PL, TX + 0.4, X1 - 0.4, TN[1], 8446, facing=1, awning=False)
frontage_x(PL, TX + 0.4, X1 - 0.4, TS[0], 8447, facing=-1, awning=False)
frontage_x(PL, TX + 0.4, X1 - 0.4, TS[1], 8448, facing=1, awning=True)
fascia_signs_x(TX + 0.6, X1 - 0.6, TN[1], 1, random.Random(8449))
fascia_signs_x(TX + 0.6, X1 - 0.6, TS[0], -1, random.Random(8450))
fascia_signs_x(TX + 0.6, X1 - 0.6, TS[1], 1, random.Random(8451))
# The bridge between them over the passage: a slab, its soffit lit.
BX0, BX1 = 95.0, 105.0
box((PL, "concrete", 0), BX0, BX1, TY - 0.42, TY + 0.02, TN[1] - 0.2, TS[0] + 0.2, scale=1.5, bottom=True)
nbox("magenta", BX0 + 0.02, BX0 + 0.08, TY - 0.47, TY - 0.42, TN[1] + 0.3, TS[0] - 0.3)
for x in (97.5, 100.0, 102.5):
    box((PL, "neon_white", 0), x - 0.12, x + 0.12, TY - 0.45, TY - 0.42, TN[1] + 1.0, TS[0] - 1.0, scale=1.0)
    shine(x, 3.6, (TN[1] + TS[0]) / 2, "white", 2.5)
balustrade([(BX0 + 0.15, TN[1]), (BX0 + 0.15, TS[0])], TY + 0.02, colour="magenta")
balustrade([(BX1 - 0.15, TN[1]), (BX1 - 0.15, TS[0])], TY + 0.02, colour="magenta")
for z in (TN[1] + 1.2, TS[0] - 1.2):
    P.place("bollard_cube", X1 - 0.6, G, z, district=PL)
# Glass balustrades round the terraces' edges, open where the stairs and the bridge land.
e = 0.3
balustrade([(TX + e, TN[0] + 0.4), (TX + e, TN[1] - e), (BX0 + 0.15, TN[1] - e)], TY + 0.02)
balustrade([(BX1 - 0.15, TN[1] - e), (X1 - e, TN[1] - e), (X1 - e, TN[0] + 0.4)], TY + 0.02)
balustrade([(TX + e, STAIR[2]), (TX + e, TS[0] + e), (BX0 + 0.15, TS[0] + e)], TY + 0.02, colour="white", k=0.7)
balustrade([(BX1 - 0.15, TS[0] + e), (X1 - e, TS[0] + e), (X1 - e, TS[1] - e), (TX + e, TS[1] - e), (TX + e, STAIR[3])], TY + 0.02, colour="white", k=0.7)
# The stairs.
stair_x(STAIR[0], STAIR[1], STAIR[2], STAIR[3], G, TY + 0.01)
for z in (STAIR[2] - 0.8, STAIR[3] + 0.8):
    shine(84.6, 1.0, z, "white", 3.0)
# What the terraces hold: a hedge line under the screens, beds and benches,
# palms on the south one (the Work shot's frame passes over the north).
n = 0
for (za, zb) in (TN, TS):
    z = za + 1.4
    while z + 4.0 < zb - 1.0:
        planter(105.2, 106.8, z, z + 4.2, y=TY, h=0.4, hedge=0.7, edge=(None, "amber", None)[n % 3], r=rs, side="-x")
        z += 5.6
        n += 1
planter(96.5, 101.5, -262.2, -260.8, y=TY, h=0.4, hedge=0.6, edge=None, r=rs, side="+z")
planter(100.0, 101.4, -252.0, -246.0, y=TY, h=0.4, hedge=0.6, edge="amber", r=rs, side="+x")
planter(100.0, 101.4, -243.0, -238.0, y=TY, h=0.4, hedge=0.6, edge=None, r=rs, side="+x")
for (px, pz, yaw) in ((99.0, -249.0, -math.pi / 2), (99.0, -240.5, -math.pi / 2), (94.2, -256.0, -math.pi / 2), (94.2, -246.0, -math.pi / 2)):
    P.place("bench", px, TY, pz, yaw, district=PL)
for (px, pz) in ((102.5, -221.5), (97.0, -203.0), (102.8, -210.5)):
    P.place("planter_palm", px, TY, pz, rs.uniform(0, 6.28), district=PL)
    shine(px, TY + 1.0, pz, "amber", 2.5)
for (px, pz, yaw) in ((99.0, -218.0, -math.pi / 2), (99.5, -206.5, math.pi), (95.0, -203.0, 0.0)):
    P.place("bench", px, TY, pz, yaw, district=PL)
for (px, pz) in ((100.5, -236.0), (95.5, -224.0), (101.0, -201.8), (93.2, -235.2), (103.5, -216.0)):
    P.place("lamp_short", px, TY, pz, district=PL)
    shine(px, TY + 3.0, pz, "amber", 8.0)
P.place("kiosk", 102.0, TY, -256.5, -math.pi / 2, district=PL)
# (Their floors are lit by their lamps, the kiosk and the screens over them:
# pools, and dark between.)
shine(100.2, TY + 1.6, -256.5, "amber", 5.0)
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
for k, (za, zb) in enumerate(((-258.0, -252.0), (-248.0, -242.0), (-224.0, -218.0), (-214.0, -208.0), (-204.5, -199.0))):
    planter(49.4, 51.0, za, zb, r=rs, side="+x", edge=("white", None, "amber", None, "white")[k])
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
    shine(px, 1.0, -193.4, "amber", 3.0)
P.place("bench", 58.5, G, -193.6, math.pi, district=PL)
P.place("charge_post", 59.8, G, -193.6, math.pi, district=PL)
P.place("shelter", 66.5, G, -192.75, 0.0, district=PL)
shine(66.5, 2.2, -192.4, "white", 6.0)
P.place("lightbox", 75.0, G, -193.4, math.pi / 2, district=PL)
P.place("phone_booth", 50.3, G, -193.2, math.pi / 2, district=PL)
P.place("food_box", 52.2, G, -198.6, math.pi / 2, district=PL)
P.place("bin", 60.6, G, -193.4, district=PL)
P.place("bin", 98.5, G, -198.9, district=PL)
P.place("kiosk", 56.0, G, -203.0, math.pi / 2, district=PL)
P.place("cctv", 51.6, G, -196.2, district=PL)
P.place("cctv", 106.0, G, -198.6, district=PL)
big_sign("bl", 1.8, 105.6, G + 0.9 + 4.5, -196.6, math.pi / 4)
box((PL, "concrete", 0), 104.9, 106.3, G, G + 0.9, -197.3, -195.9, scale=1.0)
for (px, pz, yaw) in ((90.6, -247.0, -math.pi / 2), (58.0, -199.0, math.pi), (54.6, -210.0, math.pi / 2), (72.0, -257.6, 0.0),
                      (86.0, -257.6, 0.0), (100.5, -196.4, math.pi), (76.0, -208.0, math.pi)):
    P.place("lamp_plaza", px, G, pz, yaw, district=PL)
    # Its pool on the stone (the head is too small for the bake to find).
    shine(px + 1.8 * math.sin(yaw), 3.0, pz + 1.8 * math.cos(yaw), "white", 8.0)
P.place("cctv", 60.0, G, -258.6, district=PL)
P.place("cctv", 90.4, G, -227.2, district=PL)
for px in (62.0, 76.0):
    P.place("bench", px, G, -258.2, 0.0, district=PL)
P.place("vending", 49.2, G, -263.4, 0.0, district=PL)
P.place("vending", 50.4, G, -263.4, 0.0, district=PL)
P.place("bin", 52.0, G, -260.8, district=PL)
P.place("bin", 91.0, G, -236.0, district=PL)

# ---------------------------------------------------------------------------
# The open stone: what breaks it up at eye level (Fn9gKhU_2_Q@74, @81).
# Nothing here is over 2.6 m but the two palms, and the way from the plaza
# street to the board (x 76..86) carries nothing tall: the braindance's low
# camera looks up it at the koi and the board.
# ---------------------------------------------------------------------------
# On the carpet: two long adverts at eye level, a bench against each face.
for bx_ in (60.0, 68.0):
    P.place("ad_board", bx_, G, -205.5, 0.0, district=PL)
    P.place("bench", bx_, G, -204.6, 0.0, district=PL)
    P.place("bench", bx_, G, -206.4, math.pi, district=PL)
    for z in (-204.0, -207.0):
        shine(bx_, 1.6, z, "white", 4.0)
P.place("charge_post", 61.25, G, -204.6, 0.0, district=PL)
P.place("charge_post", 69.25, G, -206.4, math.pi, district=PL)
for (px, pz, kind) in ((56.6, -211.2, "planter_palm"), (74.0, -200.0, "planter_palm"), (56.6, -199.8, "planter_tree"), (64.0, -211.2, "planter_tree")):
    P.place(kind, px, G, pz, rs.uniform(0, 6.28), district=PL)
    shine(px, 1.0, pz, "amber" if kind == "planter_palm" else "white", 3.0)
shrub_bed(53.0, 54.4, -211.8, -206.6, rs, side="+x", edge="amber")
shrub_bed(53.0, 54.4, -204.6, -199.4, rs, side="+x", edge=None)
# Drums of adverts where ways meet, carts with their queues, vending rows
# in the lee of the stair's flanks.
for (px, pz) in ((52.6, -214.6), (88.8, -223.0), (85.4, -247.6)):
    P.place("ad_drum", px, G, pz, district=PL)
for (px, pz, yaw) in ((58.0, -215.6, math.pi / 4), (79.0, -214.4, -math.pi / 4)):
    P.place("food_cart", px, G, pz, yaw, district=PL)
    shine(px + 1.2 * math.sin(yaw), 1.8, pz + 1.2 * math.cos(yaw), "amber", 5.0)
    stand(px - 0.9 * math.sin(yaw), pz - 0.9 * math.cos(yaw), yaw, "vendor", y=G)
    for o, side, pose in ((1.5, 0.0, "idle"), (2.3, 0.3, "phone"), (3.1, -0.2, "idle")):
        stand(px + o * math.sin(yaw) + side * math.cos(yaw), pz + o * math.cos(yaw) - side * math.sin(yaw), yaw + math.pi, pose, y=G)
for i, px in enumerate((88.2, 89.3, 90.4)):
    P.place("vending" if i != 1 else "vending_warm", px, G, STAIR[3] + 0.5, 0.0, district=PL)
    P.place("vending_warm" if i != 1 else "vending", px, G, STAIR[2] - 0.5, math.pi, district=PL)
# Standing adverts down the west side, cameras, bins, lit grates that
# breathe, boards outside the shops.
for pz in (-238.5, -226.0, -216.0, -206.5):
    P.place("lightbox", 49.6, G, pz, math.pi / 2, district=PL)
for (px, pz) in ((82.4, -198.2), (51.2, -251.0), (87.6, -243.6)):
    P.place("cctv", px, G, pz, district=PL)
for (px, pz) in ((57.4, -205.5), (71.0, -205.5), (89.4, -241.5)):
    P.place("bin", px, G, pz, district=PL)
for i, (px, pz) in enumerate(((64.6, -201.0), (87.2, -228.6), (53.0, -246.6))):
    P.place("grate_glow", px, G, pz, district=PL)
    if i < 2:
        empty(f"anchor_steam_street_plaza_{4 + i}", (px, G + 0.07, pz))
for px in (57.0, 70.4, 85.0):
    P.place("aframe", px, G, -260.0, math.pi / 2, district=PL)

# ---------------------------------------------------------------------------
# People who are not walking through.
# ---------------------------------------------------------------------------
SEAT = G + 0.48
# On the benches of the garden, the west strip and the south strip.
for (px, pz, yaw) in ((52.0, -255.3, math.pi / 2), (52.0, -221.4, math.pi / 2), (52.0, -210.6, math.pi / 2),
                      (58.2, -193.6, math.pi), (65.4, -193.0, 0.0), (66.3, -193.0, 0.0), (62.3, -258.2, 0.0), (76.4, -258.2, 0.0),
                      (59.6, -204.6, 0.0), (60.4, -204.6, 0.0), (68.3, -204.6, 0.0), (59.7, -206.4, math.pi), (67.6, -206.4, math.pi),
                      (68.4, -206.4, math.pi)):
    stand(px, pz, yaw, "sit", y=SEAT)
# About the square.
for (px, pz, yaw, pose) in ((64.3, -208.0, 0.85, "talk"), (65.2, -207.0, 0.85 + math.pi, "talk"), (82.6, -202.0, -1.8, "phone"),
                            (72.3, -200.4, 2.6, "idle"), (86.0, -202.5, 0.4, "talk"), (86.9, -201.5, 0.4 + math.pi, "talk"),
                            
                            (88.0, -249.0, 2.2, "talk"), (89.0, -249.8, 2.2 + math.pi, "talk"), (88.2, -250.6, 0.4, "talk"),
                            (66.0, -252.5, math.pi, "idle"), (69.5, -254.0, 2.9, "phone"), (57.5, -251.0, 2.6, "smoke"),
                            (58.4, -203.0, -math.pi / 2, "idle"), (59.4, -203.5, -math.pi / 2, "phone"),
                            (79.5, -192.6, math.pi, "squat"), (97.0, -193.5, 0.0, "phone"), (102.5, -192.8, 2.4, "idle")):
    stand(px, pz, yaw, pose, y=G)
# At the shops under the board, and the block's doors: security.
for (px, pz, yaw, pose) in ((55.0, -261.8, 0.0, "idle"), (71.5, -262.2, 0.0, "idle"), (86.2, -262.0, 0.0, "idle"), (80.0, -261.0, math.pi, "idle"),
                            (64.5, -261.4, math.pi, "phone"), (91.5, -259.0, -math.pi / 2, "lean"), (90.8, -243.0, math.pi / 2, "idle"),
                            (90.5, -252.4, -math.pi / 2, "talk"), (89.6, -252.4, math.pi / 2, "talk")):
    stand(px, pz, yaw, pose, y=G)
# On the stairs: sitting on the steps, standing on them.
run_, rise_ = (STAIR[1] - STAIR[0]) / 28, (TY + 0.01 - G) / 28
for (i, pz, pose) in ((5, -218.5, "sit"), (5, -217.8, "sit"), (11, -209.5, "sit"), (16, -214.5, "phone"), (8, -207.0, "idle"), (20, -219.0, "sit")):
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

# ---------------------------------------------------------------------------
# The square's light on its own stone (plaza_paving.py lays the slabs under
# it): the board's cold blue before it, the side boards' colours under them,
# a warm pool before each shop window and each machine, and the koi's amber
# low on the fronts that face the hub.
# ---------------------------------------------------------------------------
wash(79.0, -257.0, 17.0, "blue", 0.5)
wash(79.0, -250.0, 9.0, "white", 0.22)
for (wx, wz, hue) in ((49.5, -205.0, "purple"), (49.5, -228.0, "pink"), (103.0, -205.0, "cyan"), (103.0, -228.0, "magenta")):
    wash(wx, wz, 8.5, hue, 0.4)
    light(PL, wx, 6.0, wz, hue, 3.0)
rl = random.Random(8480)
SHOP_HUES = ("amber", "amber", "white", "pink", "cyan", "amber", "yellow")
x = X0 + 3.4
while x < TX - 2.0:
    shine(x, 2.2, -262.2, rl.choice(SHOP_HUES), rl.uniform(4.0, 6.0))
    x += rl.uniform(5.0, 7.0)
for z in (-260.2, -252.6, -245.2, -237.8, -223.0):
    shine(TX - 1.3, 2.2, z, rl.choice(SHOP_HUES), rl.uniform(4.0, 5.5))
for x in (95.5, 101.5, 106.0):
    shine(x, 2.2, TN[1] + 1.2, rl.choice(SHOP_HUES), 4.0)
    shine(x + 1.5, 2.2, TS[0] - 1.2, rl.choice(SHOP_HUES), 4.0)
    shine(x + 0.5, 2.2, TS[1] + 1.3, rl.choice(SHOP_HUES), 4.5)
# The koi's wash on the fronts that face the hub.
for x in (56.0, 64.0, 72.0, 80.0, 88.0):
    light(PL, x, 3.4, -263.2, "amber", 3.0)
for z in (-256.0, -248.0, -240.0):
    light(PL, TX - 0.5, 3.4, z, "amber", 3.0)
# Machines, drums, standing adverts and the kiosk light the stone they stand on.
for (px, pz, hue, p) in ((88.2, STAIR[3] + 1.6, "white", 3.5), (90.4, STAIR[2] - 1.6, "amber", 3.5), (52.6, -214.6, "white", 4.0),
                         (88.8, -223.0, "white", 4.0), (85.4, -247.6, "pink", 4.0), (57.8, -203.0, "amber", 4.5), (75.0, -193.4, "white", 3.5),
                         (50.6, -238.5, "white", 3.0), (50.6, -226.0, "cyan", 3.0), (50.6, -216.0, "white", 3.0), (50.6, -206.5, "pink", 3.0),
                         (50.4, -262.2, "white", 3.5), (51.4, -193.2, "white", 3.0)):
    shine(px, 1.4, pz, hue, p)
