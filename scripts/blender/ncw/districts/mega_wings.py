"""The megabuilding's wings, the court that ends its street, and the south
side of the street's east arm.

West of the block a podium with a stepped tower on it, bridged to the
block: its street face ends the west street's vista (the loop turns in
front of it), so it carries a canopy, a big board and a column of signs.
East of the block the same, and an arm of it across the street's end: the
court. The arm's face to the street is a market hall open to the pavement,
full of stalls, lanterns and people, under a board and the block's number:
the street ends in somewhere to go.

All of it stands outside what the hero sees (the canyon's blocks hide
everything past x 48 either side below about 177 m).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_face import dress, walkway, sign_column, hero_hidden

PT = floor_y(3)                         # 11.4: the podiums' roof
PAL = ["pink", "amber", "cyan", "red", "teal", "magenta", "purple"]


ROOF_STRIPS = []


def roof_strip(x0, x1, z0, z1, top, seed, cap=3.0, sign_rate=0.0):
    """A roof the wings leave to be filled: mega_top fills each with people's
    plant, tanks, shacks and washing (roof_full); one with signs keeps the
    generator's board on legs."""
    ROOF_STRIPS.append((x0, x1, z0, z1, top, seed))
    B.ROOFS.append((D, x0, x1, z0, z1, top))


def mast(x, z, y0, h, hue="red"):
    cylinder((D, "metal", 0), x, z, y0, y0 + h, 0.35, segs=6)
    for t in (0.45, 0.75):
        box((D, "metal", 1), x - 1.6, x + 1.6, y0 + h * t, y0 + h * t + 0.12, z - 0.06, z + 0.06, scale=0.5)
        box((D, "metal", 1), x - 0.06, x + 0.06, y0 + h * t, y0 + h * t + 0.12, z - 1.6, z + 1.6, scale=0.5)
    cylinder((D, "glow", 0), x, z, y0 + h, y0 + h + 0.9, 0.5, segs=6, col=GLOW[hue])


# ===========================================================================
# THE WEST WING.
# ===========================================================================
WX0, WX1 = -94.0, MB_X0
shell(WX0, WX1, MB_ZB, ST_N, 0.0, PT, B.wall_col(0.62, 6, 0.85, 5), 8402,
      spans={"+z": [(WX0, WX1, SHOP_H)], "-x": [(MB_ZB, ST_N, SHOP_H)], "-z": [(WX0, WX1, SHOP_H)], "+x": [(MB_ZF, ST_N, SHOP_H)]})
# Its street face: shops, a lit canopy across the west street's end, signs.
fS = face("+z", ST_N, WX0, WX1)
B.shopfront(D, fS, random.Random(8403), 0.0, fS.width, 5, sign_rate=0.7, awning_rate=0.45, palette=PAL)
fS.ledge((D, "trim", 0), 0.0, fS.width, SHOP_H - 0.05, 0.3, 0.35, CONC)
B.canopy(D, fS, 3.0, 25.0, 2.6, SHOP_H + 0.5, 5, "white")
B.face_signs(D, fS, random.Random(8404), 26.0, fS.width - 0.5, PT + 0.6, density=1.3)
ledges(fS, SHOP_H, PT, detail=0)
B.back_ground(D, face("-x", WX0, MB_ZB, ST_N), random.Random(8405), CONC)
B.back_ground(D, face("-z", MB_ZB, WX0, WX1), random.Random(8406), CONC)
# Its wall to the block's forecourt: concrete, a lamp, the storey painted on it.
fF = face("+x", WX1, MB_ZF, ST_N)
fF.quad((D, "concrete", 0), 0.0, fF.width, 0.0, SHOP_H, 0.0)
strokes((D, "trim", 1), "H4", WX1, 3.4, -734.2, 1.0, math.pi / 2, YEL_OLD, weight=0.16)
wall_lamp(WX1, 3.6, -741.6, 1, 0, "amber", 2.6)

# The tower on it, and the crown on that.
T1 = (-92.0, -58.0, -786.0, -738.0)
T1_TOP, T2_TOP = floor_y(17), floor_y(57)                 # 59.0, 195.0: the wing's upper tower stands over the slab
f1 = shell(*T1, PT, T1_TOP, B.wall_col(0.62, 0, 0.8, 5), 8410)
BOARD_W = (-80.0, 31.0, 18.0, 10.0)                       # the board that ends the west street's vista
dress(f1["+z"], T1_TOP, 4, 8411, [], [(2.5, 21.5, 24.6, 37.4)])
dress(f1["-x"], T1_TOP, 4, 8412, [], weights=(0.25, 0.35, 0.4))
dress(f1["+x"], T1_TOP, 4, 8413, [], weights=(0.3, 0.3, 0.4))
dress(f1["-z"], T1_TOP, 4, 8414, [], people_rate=0.05, weights=(0.2, 0.3, 0.5))
B.billboard(D, BOARD_W[0], BOARD_W[1], T1[3] + 0.4, BOARD_W[2], BOARD_W[3], 0.0, random.Random(8415), back=False)
sign_column(-92.6, T1[3] + 0.8, (15.6, 21.4, 27.0, 31.4, 36.6), ("bl", "bl", "bm", "bl", "bx"), [math.pi / 2 + a for a in (-0.3, 0.25, -0.2, 0.3, -0.1)])
sign_column(-58.6, T1[3] + 0.8, (16.2, 21.0, 26.8), ("bm", "bl", "bl"), [-math.pi / 2 + a for a in (0.3, -0.2, 0.25)])
T2 = (-86.0, -64.0, -780.0, -748.0)
f2 = shell(*T2, T1_TOP, T2_TOP, B.wall_col(0.62, 6, 0.85, 4), 8420)
assert hero_hidden(T2[0], T2[1], T1_TOP, T2_TOP + 3.0, T2[3])
# Its faces: the block's number, floodlit, over the street; cantilevered
# blocks with their yellow edges; floors of decks and units between.
numeral("H4", (T2[0] + T2[1]) / 2, 103.0, T2[3], 10.0, 0.0, pad=1.4)
block(T2[0] + 2.0, T2[1] - 1.0, floor_y(19), floor_y(24), T2[3], T2[3] + 6.0, 8470, window=6)
block(T2[0] - 6.0, T2[0], floor_y(26), floor_y(31), T2[2] + 4.0, T2[3] - 8.0, 8471, faces=("-x", "+z", "-z"), window=0, tint=4)
block(T2[1], T2[1] + 6.5, floor_y(22), floor_y(28), T2[2] + 6.0, T2[3] - 3.0, 8472, faces=("+x", "+z", "-z"), window=3, tint=6)
dress(f2["+z"], floor_y(27), 25, 8473, [])
dress(f2["-x"], floor_y(25), 18, 8474, [], weights=(0.3, 0.3, 0.4))
dress(f2["+x"], floor_y(21), 18, 8475, [], weights=(0.3, 0.3, 0.4))
dress(f2["-z"], T2_TOP, 18, 8476, [], people_rate=0.03, weights=(0.25, 0.3, 0.45))
ledges(f2["+z"], floor_y(31), T2_TOP, detail=0)
band(D, cut_rect((T2[0] + T2[1]) / 2, (T2[2] + T2[3]) / 2, (T2[1] - T2[0]) / 2, (T2[3] - T2[2]) / 2), T2_TOP - 1.4, T2_TOP - 0.9, "magenta", out=0.2)
mast(-80.0, -776.0, T2_TOP, 16.0)
roof_strip(T2[0], T2[1], T2[2], T2[3], T2_TOP, 8421, cap=5.0)
parapet(*T2, T2_TOP)
# The tower's roof round the crown, and the podium's round the tower.
parapet(*T1, T1_TOP, rim="cyan")
roof_strip(T1[0], T1[1], T2[3], T1[3], T1_TOP, 8422, cap=5.0, sign_rate=1.0)
roof_strip(T1[0], T1[1], T1[2], T2[2], T1_TOP, 8423)
roof_strip(T1[0], T2[0], T2[2], T2[3], T1_TOP, 8424)
roof_strip(T2[1], T1[1], T2[2], T2[3], T1_TOP, 8425)
parapet(WX0, WX1, MB_ZB, ST_N, PT, sides=("+z", "-x", "-z"), rim="amber")
roof_strip(WX0, WX1, T1[3], ST_N, PT, 8426)
roof_strip(T1[1], WX1 - 3.4, MB_ZB, T1[3], PT, 8427, cap=4.5)
for (x, pose, yaw) in ((-90.0, "idle", 0.0), (-84.6, "phone", 0.0), (-77.0, "lean", math.pi), (-70.4, "idle", 0.0), (-63.0, "smoke", 0.0), (-52.4, "idle", 0.0)):
    stand(x, ST_N - 0.75, yaw, pose, PT)
talkers(-66.6, -735.2, PT, n=2, turn=0.5)
# Bridges to the block's core.
bridge(T1[1], MB_X0 - 3.2, -771.0, -767.0, floor_y(8), floor_y(9), "cyan")
bridge(T1[1], MB_X0 - 3.2, -766.0, -762.0, floor_y(13), floor_y(14), "pink")
# In front of its shops: what the pavement keeps there (off the walkers' lines).
empty("anchor_steam_mega_3", (-62.0, 0.2, -729.6))
cylinder((D, "metal", 1), -62.0, -729.6, 0.15, 0.175, 0.4, segs=12)

# ===========================================================================
# THE EAST WING.
# ===========================================================================
EX0, EX1 = MB_X1, 104.0
AX0, AX1, AZ0, AZ1 = 64.0, EX1, MB_ZF, -700.0             # the arm across the street's end
ARM_TOP = floor_y(7)                                      # 25.0
HALL_Z0, HALL_Z1, HALL_X, HALL_H = -727.0, -713.0, 74.0, floor_y(2)     # the market hall: its mouth, its back, its ceiling
colE = B.wall_col(0.6, 6, 0.9, 5)
# The podium: the corner piece on the street, and the rest behind.
shell(EX0, AX0, MB_ZF, ST_N, 0.0, PT, colE, 8431, spans={"+z": [(EX0, AX0, SHOP_H)], "-x": [(MB_ZF, ST_N, SHOP_H)]}, skip=("+x", "-z"))
fE1 = face("+z", ST_N, EX0, AX0)
B.shopfront(D, fE1, random.Random(8432), 0.0, fE1.width, 5, sign_rate=0.8, awning_rate=0.5, palette=PAL)
fE1.ledge((D, "trim", 0), 0.0, fE1.width, SHOP_H - 0.05, 0.3, 0.35, CONC)
B.face_signs(D, fE1, random.Random(8433), 0.5, fE1.width - 0.5, PT + 0.6, density=1.6)
fEF = face("-x", EX0, MB_ZF, ST_N)
fEF.quad((D, "concrete", 0), 0.0, fEF.width, 0.0, SHOP_H, 0.0)
strokes((D, "trim", 1), "04", EX0, 3.4, -735.4, 1.0, -math.pi / 2, YEL_OLD, weight=0.16)
wall_lamp(EX0, 3.6, -742.6, -1, 0, "amber", 2.6)
shell(EX0, EX1, MB_ZB, MB_ZF, 0.0, PT, colE, 8434, spans={"+x": [(MB_ZB, MB_ZF, SHOP_H)], "-z": [(EX0, EX1, SHOP_H)]}, skip=("-x", "+z"))
B.back_ground(D, face("+x", EX1, MB_ZB, MB_ZF), random.Random(8435), CONC)
B.back_ground(D, face("-z", MB_ZB, EX0, EX1), random.Random(8436), CONC)
parapet(EX0, AX0, MB_ZF, ST_N, PT, sides=("+z", "-x"), rim="cyan")
parapet(EX0, EX1, MB_ZB, MB_ZF, PT, sides=("+x", "-z"))
roof_strip(EX0 + 3.4, 56.0, MB_ZB, MB_ZF, PT, 8437, cap=4.5)
for (x, pose, yaw) in ((50.4, "idle", 0.0), (54.8, "phone", 0.0), (59.6, "lean", math.pi), (62.4, "idle", 0.0)):
    stand(x, ST_N - 0.75, yaw, pose, PT)
stand(EX0 + 0.75, -738.0, -math.pi / 2, "smoke", PT)
P.place("planter_tree", 52.0, PT, -741.0)
P.place("bench", 57.0, PT, -742.6, 0.0)
stand(57.0, -742.6, 0.0, "sit", PT + 0.48)

# The tower on the podium and its crown.
ET1 = (56.0, 100.0, -786.0, -750.0)
ET1_TOP, ET2_TOP = floor_y(15), floor_y(50)               # 52.2, 171.2: the east wing's upper tower
g1 = shell(*ET1, PT, ET1_TOP, B.wall_col(0.6, 0, 0.85, 5), 8440)
dress(g1["+z"], ET1_TOP, 8, 8441, [])
dress(g1["-x"], ET1_TOP, 4, 8442, [], weights=(0.3, 0.3, 0.4))
dress(g1["+x"], ET1_TOP, 4, 8443, [], weights=(0.25, 0.35, 0.4))
dress(g1["-z"], ET1_TOP, 4, 8444, [], people_rate=0.05, weights=(0.2, 0.3, 0.5))
ET2 = (62.0, 92.0, -782.0, -758.0)
g2 = shell(*ET2, ET1_TOP, ET2_TOP, B.wall_col(0.62, 0, 0.8, 5), 8445)
assert hero_hidden(ET2[0], ET2[1], ET1_TOP, ET2_TOP + 3.0, ET2[3])
block(ET2[0] + 1.0, ET2[0] + 15.0, floor_y(18), floor_y(23), ET2[3], ET2[3] + 6.5, 8480, window=0, tint=4)
block(ET2[1] - 11.0, ET2[1] + 5.0, floor_y(24), floor_y(28), ET2[3] - 2.0, ET2[3] + 5.0, 8481, window=6)
block(ET2[0] - 6.0, ET2[0], floor_y(23), floor_y(28), ET2[2] + 3.0, ET2[3] - 5.0, 8482, faces=("-x", "+z", "-z"), window=3, tint=6)
numeral("H4", ET2[1], 86.0, (ET2[2] + ET2[3]) / 2, 9.0, math.pi / 2, pad=1.4)
dress(g2["+z"], floor_y(18), 16, 8483, [])
dress(g2["+x"], floor_y(21), 16, 8484, [], weights=(0.3, 0.3, 0.4))
dress(g2["-x"], floor_y(23), 16, 8485, [], weights=(0.3, 0.3, 0.4))
dress(g2["-z"], ET2_TOP, 16, 8486, [], people_rate=0.03, weights=(0.25, 0.3, 0.45))
ledges(g2["+z"], floor_y(28), ET2_TOP, detail=0)
band(D, cut_rect((ET2[0] + ET2[1]) / 2, (ET2[2] + ET2[3]) / 2, (ET2[1] - ET2[0]) / 2, (ET2[3] - ET2[2]) / 2), ET2_TOP - 1.4, ET2_TOP - 0.9, "amber", out=0.2)
mast(84.0, -772.0, ET2_TOP, 12.0)
roof_strip(*ET2, ET2_TOP, 8446, cap=5.0)
parapet(*ET2, ET2_TOP)
parapet(*ET1, ET1_TOP, rim="pink")
roof_strip(ET1[0], ET1[1], ET2[3], ET1[3], ET1_TOP, 8447, cap=5.0, sign_rate=1.0)
roof_strip(ET1[0], ET1[1], ET1[2], ET2[2], ET1_TOP, 8448)
roof_strip(ET2[1], ET1[1], ET2[2], ET2[3], ET1_TOP, 8449)
bridge(MB_X1 + 3.2, ET1[0], -771.0, -767.0, floor_y(9), floor_y(10), "amber")
bridge(MB_X1 + 3.2, ET1[0], -766.0, -762.0, floor_y(13), floor_y(14), "cyan")
B.billboard(D, 78.0, 38.0, ET1[3] + 0.4, 16.0, 9.0, 0.0, random.Random(8450), back=False)

# The arm across the street's end.
shell(AX0, AX1, AZ0, AZ1, 0.0, ARM_TOP, B.wall_col(0.66, 0, 0.9, 5), 8451,
      spans={"-x": [(AZ0, ST_N, PT), (ST_N, HALL_Z0, SHOP_H), (HALL_Z1, ST_S, SHOP_H), (HALL_Z0, HALL_Z1, HALL_H + 1.2)],
             "-z": [(AX0, AX1, PT)], "+x": [(AZ0, AZ1, SHOP_H)], "+z": [(AX0, AX1, SHOP_H)]})
B.back_ground(D, face("+x", AX1, AZ0, AZ1), random.Random(8452), CONC)
B.back_ground(D, face("+z", AZ1, AX0, AX1), random.Random(8453), CONC)
fC = face("-x", AX0, ST_N, ST_S)                          # the court's wall: s runs from its north end
ledges(fC, HALL_H + 1.2, ARM_TOP, detail=0)
# Shops in its two piers.
B.shopfront(D, face("-x", AX0, ST_N, HALL_Z0), random.Random(8454), 0.0, HALL_Z0 - ST_N, 5, sign_rate=1.0, awning_rate=0.0, door=False, palette=PAL)
B.shopfront(D, face("-x", AX0, HALL_Z1, ST_S), random.Random(8455), 0.0, ST_S - HALL_Z1, 5, sign_rate=1.0, awning_rate=0.0, door=False, palette=PAL)
for z in (HALL_Z0, HALL_Z1):
    # The piers' wall above the shops, the hall's jambs in yellow, a line of light up each.
    za, zb = (ST_N, HALL_Z0) if z == HALL_Z0 else (HALL_Z1, ST_S)
    tbox(AX0 - 0.35, AX0 + 0.3, G0, HALL_H + 1.2, z - 0.45, z + 0.45, CONC)
    tbox(AX0 - 0.37, AX0 + 0.32, G0, 1.4, z - 0.47, z + 0.47, YEL_OLD, detail=1)
    box((D, "neon_" + ("cyan" if z == HALL_Z0 else "pink"), 0), AX0 - 0.42, AX0 - 0.35, 5.0, ARM_TOP - 1.0, z - 0.06, z + 0.06, scale=1.0)
# The hall: floor, walls, a ceiling with ribs and tubes, shops along its back.
B.ground_rect(D, AX0, HALL_X, HALL_Z0, HALL_Z1)
vquad((D, "concrete", 0), (AX0, HALL_Z0), (HALL_X, HALL_Z0), G0, HALL_H)
vquad((D, "concrete", 0), (HALL_X, HALL_Z1), (AX0, HALL_Z1), G0, HALL_H)
fHB = face("-x", HALL_X, HALL_Z0, HALL_Z1)
B.shopfront(D, fHB, random.Random(8456), 0.0, fHB.width, 5, sign_rate=1.0, awning_rate=0.0, door=False, palette=PAL)
fHB.quad((D, "concrete", 0), 0.0, fHB.width, SHOP_H, HALL_H, 0.0)
for s, size in ((2.6, "pm"), (7.0, "bx"), (10.8, "pm")):
    w, h = ST_SIZES[size]
    fHB.box((D, "board_frame", 0), s - w / 2 - 0.06, s + w / 2 + 0.06, 6.2 - h / 2 - 0.06, 6.2 + h / 2 + 0.06, 0.0, 0.1)
    cx, cy, cz = fHB.p(fHB.at(s), 6.2, 0.115)
    sign(st_name(size), cx, cy, cz, w, h, fHB.yaw, district=D, label=False)
cbox(AX0, HALL_X, HALL_H, HALL_H + 0.5, HALL_Z0, HALL_Z1, bottom=True)
for x in (66.5, 69.0, 71.5):
    cbox(x - 0.2, x + 0.2, HALL_H - 0.45, HALL_H, HALL_Z0 + 0.1, HALL_Z1 - 0.1, bottom=True, detail=1)
for x, hue in ((65.4, "white"), (67.8, "amber"), (70.2, "white"), (72.6, "amber")):
    tube_z(x, HALL_H - 0.02, HALL_Z0 + 2.0, HALL_Z1 - 2.0, hue, power=3.2)
# Lanterns strung across it, three rows.
for x in (65.6, 68.4, 71.2):
    for i in range(9):
        P.place("lantern", x, 5.3 - 0.35 * math.sin(math.pi * i / 8), HALL_Z0 + 1.0 + i * 1.5)
    cable((x, 5.75, HALL_Z0), (x, 5.75, HALL_Z1), 0.35, r=0.02)
# Stalls down both sides, an aisle between.
stall(67.2, HALL_Z0 + 2.0, 0.0, "red", "amber", seed=8461)
stall(71.4, HALL_Z0 + 2.0, 0.0, "cyan", "white", seed=8462)
stall(67.2, HALL_Z1 - 2.0, math.pi, "amber", "pink", seed=8463)
stall(71.4, HALL_Z1 - 2.0, math.pi, "pink", "cyan", seed=8464)
empty("anchor_steam_mega_2", (71.6, 1.3, HALL_Z0 + 1.6))
talkers(66.4, -720.4, G0, n=3, turn=0.3)
talkers(70.6, -719.2, G0, n=2, turn=1.4)
stand(72.6, -721.6, -math.pi / 2, "phone", G0)
stand(68.6, -718.2, math.pi / 2, "idle", G0)
stand(64.5, HALL_Z0 + 0.6, -math.pi / 2, "lean", G0)
stand(64.5, HALL_Z1 - 0.6, -math.pi / 2, "smoke", G0)
P.place("crates", 73.2, G0, -720.0, -math.pi / 2)
stand(73.0, -718.8, -math.pi / 2, "sit", G0 + 0.7)
# Its header, with the block's number lit; over it the board; the wall's top.
tbox(AX0 - 0.3, AX0 + 0.25, HALL_H, HALL_H + 1.2, HALL_Z0, HALL_Z1, BLUEGREY, bottom=True)
fC.quad((D, "trim", 0), HALL_Z0 - ST_N, HALL_Z1 - ST_N, HALL_H, HALL_H + 0.3, 0.32, col=YEL)
assert hero_hidden(AX0 - 1.0, AX0, 0.0, ARM_TOP + 12.0, (ST_N + ST_S) / 2)
strokes((D, "glow", 0), "H4", AX0 - 0.31, HALL_H + 0.72, -720.0, 0.66, -math.pi / 2, GLOW["amber"], weight=0.18, out=0.02)
for dz in (-4.6, 4.6):
    strokes((D, "trim", 1), ">" if dz < 0 else "<", AX0 - 0.31, HALL_H + 0.72, -720.0 + dz, 0.5, -math.pi / 2, YEL, weight=0.18)
B.billboard(D, AX0 - 0.45, 15.2, -720.0, 13.0, 7.6, -math.pi / 2, random.Random(8465), back=False)
strokes((D, "trim", 1), "H4", AX0, 22.4, -729.6, 2.0, -math.pi / 2, YEL_OLD, weight=0.15, out=0.03)
sign_column(AX0 - 0.8, -710.6, (11.4, 16.0, 20.6), ("bm", "bl", "bm"), [a for a in (0.25, math.pi - 0.2, 0.15)])
# Its roof: a parapet lit along its top, plant, a board turned to the street.
parapet(AX0, AX1, AZ0, AZ1, ARM_TOP, rim="pink")
RB = (72.0, -719.0, -math.pi / 2 + 0.22)
B.billboard(D, RB[0], ARM_TOP + 2.4 + 3.2, RB[1], 13.0, 6.4, RB[2], random.Random(8466))
for du in (-4.6, 4.6):
    bx, bz = RB[0] + math.cos(RB[2]) * du + math.sin(RB[2]) * -0.25, RB[1] - math.sin(RB[2]) * du + math.cos(RB[2]) * -0.25
    box((D, "metal", 1), bx - 0.12, bx + 0.12, ARM_TOP, ARM_TOP + 2.4, bz - 0.12, bz + 0.12, scale=0.5)
# (Its roof's plant, walk, pad and light: mega_finish.py. The generator's
# sheet-metal boxes stood black against the camera up here.)
for (z, pose) in ((-730.0, "idle"), (-724.6, "phone"), (-711.0, "idle")):
    stand(AX0 + 0.8, z, -math.pi / 2, pose, ARM_TOP)

# The court's pavement (x 60.3..64): bollards along the kerb, benches, a
# booth, food boxes, and the people the hall draws.
for i in range(7):
    P.place("bollard", 60.75, G0, -730.0 + i * 3.35)
P.place("bench", 61.4, G0, -729.4, math.pi / 2)
P.place("bench", 61.4, G0, -710.6, math.pi / 2)
P.place("phone_booth", 63.2, G0, -731.2)
P.place("food_box", 61.1, G0, -724.4, math.pi / 2)
P.place("food_box", 61.1, G0, -715.6, math.pi / 2)
P.place("bin", 61.0, G0, -726.6)
P.place("lamp_short", 61.0, G0, -720.0)
stand(61.4, -729.0, math.pi / 2, "sit", G0 + 0.48)
stand(61.4, -710.2, math.pi / 2, "sit", G0 + 0.48)
stand(61.4, -711.0, math.pi / 2, "sit", G0 + 0.48)
talkers(62.4, -722.6, G0, n=3, turn=0.2)
talkers(62.2, -716.8, G0, n=2, turn=1.1)
stand(61.6, -725.0, -math.pi / 2, "phone", G0)
stand(63.3, -728.6, -math.pi / 2, "lean", G0)
stand(63.3, -709.4, -math.pi / 2, "lean", G0)
stand(61.2, -713.4, 2.4, "squat", G0)

# ===========================================================================
# THE SOUTH SIDE OF THE EAST ARM: one block between the canyon's lane and
# the court (x 52..64), shops to the street.
# ===========================================================================
S1 = (52.0, AX0, ST_S, -682.0)
S1_TOP = floor_y(11)                                       # 38.6
h1 = shell(*S1, 0.0, S1_TOP, B.wall_col(0.6, 0, 0.9, 0), 8471,
           spans={"-z": [(S1[0], S1[1], SHOP_H)], "-x": [(S1[2], S1[3], SHOP_H)], "+x": [(ST_S, AZ1, ARM_TOP), (AZ1, S1[3], SHOP_H)],
                  "+z": [(S1[0], S1[1], SHOP_H)]})
fS1 = h1["-z"]
B.shopfront(D, fS1, random.Random(8472), 0.0, fS1.width, 0, sign_rate=0.8, awning_rate=0.6, palette=PAL)
fS1.ledge((D, "trim", 0), 0.0, fS1.width, SHOP_H - 0.05, 0.3, 0.35, B.TRIM[0])
B.face_signs(D, fS1, random.Random(8473), 0.5, fS1.width - 0.5, 26.0, density=1.6)
dress(fS1, S1_TOP, 3, 8474, [], weights=(0.2, 0.5, 0.3))
B.back_ground(D, h1["-x"], random.Random(8475), CONC)
B.back_ground(D, face("+x", S1[1], AZ1, S1[3]), random.Random(8476), CONC)
B.back_ground(D, h1["+z"], random.Random(8477), CONC)
dress(h1["-x"], S1_TOP, 2, 8478, [], people_rate=0.05, weights=(0.15, 0.45, 0.4))
parapet(*S1, S1_TOP, rim="amber")
roof_strip(*S1, S1_TOP, 8479, cap=6.0, sign_rate=1.0)
