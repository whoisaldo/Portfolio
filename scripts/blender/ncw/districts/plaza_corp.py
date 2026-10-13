"""What makes the square a corporation's (KvMY1uzSC1E@29, Fn9gKhU_2_Q@74):
the board's block is a curtain wall behind vertical fins on its faces to
the square and the road, over a dark podium band that carries houses' names;
a walkway crosses the x 120 road between two podiums south of the junction,
its edge striped in yellow light; and the tall back that closes the square's
west side (the canyon's east row, x 44) carries fins, bands of light and a
lit canopy over its shops on the face it turns to the square.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza import BLOCK, BOARD

rk = random.Random(8870)
BX0, BX1, BZ0, BZ1, BH = BLOCK
POD = 8.0            # the podium band's top: the curtain wall's first floor line
COPE = BH + 0.5

# ---------------------------------------------------------------------------
# The board's block. The housing (plaza.py) covers x 55..103, y 13.8..38.6 of
# its face to the square: fins run the whole height either side of it, and
# over and under it. Nothing here comes forward of the housing's plate
# (z -263.85) inside that field, and the board, its frame, the catwalk, the
# floods and the side boards are untouched.
# ---------------------------------------------------------------------------
fs = B.Face("+z", BZ1, BX0, BX1)
fe = B.Face("+x", BX1, BZ0, BZ1)
# Over the podium band, the house's hall: one double-height storey along
# both faces, lit, up to the housing's foot (HALL_Y); over it the house's
# office floors (the plaza's glass: plaza_parts.glass_col). Between the
# board's legs (DOOR) the way in: a hall from the square's floor up to the
# housing, with its doors, a canopy and the house's name.
HALL_Y = 13.8
DOOR = (70.6, 87.4)
hall_seed = rk.random()
for xa, xb in ((48.0, DOOR[0]), (DOOR[1], 108.0)):
    fs.quad((PL, "corporate", 0), xa - BX0, xb - BX0, POD, HALL_Y, 0.0, col=hall_col(POD, HALL_Y, hall_seed))
fs.quad((PL, "corporate", 0), DOOR[0] - BX0, DOOR[1] - BX0, 0.42, HALL_Y, 0.05, col=hall_col(0.42, HALL_Y, hall_seed))
fe.quad((PL, "corporate", 0), 0.0, fe.width, POD, HALL_Y, 0.0, col=hall_col(POD, HALL_Y, rk.random()))
for xa, xb, lit, warm in ((48.0, 61.0, 0.84, 0.25), (61.0, 79.0, 0.58, 0.62), (79.0, 97.0, 0.6, 0.12), (97.0, 108.0, 0.88, 0.5)):
    fs.quad((PL, "corporate", 0), xa - BX0, xb - BX0, HALL_Y, BH, 0.0, col=glass_col(lit, warm, rk.random(), mode=3))
for s0, s1, lit, warm in ((0.0, 9.0, 0.8, 0.5), (9.0, 20.0, 0.74, 0.2)):
    fe.quad((PL, "corporate", 0), s0, s1, HALL_Y, BH, 0.0, col=glass_col(lit, warm, rk.random(), mode=3))
for f, cuts in ((fs, ((0.0, DOOR[0] - 0.8 - BX0), (DOOR[1] + 0.8 - BX0, fs.width))), (fe, ((0.0, fe.width),))):
    # The podium band over the shops, a line of light along its head (cut
    # at the way in); a slab edge at the hall's ceiling; the coping.
    for a, b in cuts:
        f.box((PL, "trim", 0), a, b, SHOP_H + 0.26, POD, 0.0, 0.3, col=B.TRIM[1], scale=2.0)
        f.box((PL, "glow", 0), a + 0.3, b - 0.3, POD - 0.16, POD - 0.08, 0.3, 0.33, col=dim("white", 0.45))
    f.box((PL, "trim", 0), 0.0, f.width, HALL_Y - 0.05, HALL_Y + 0.25, 0.0, 0.12, col=B.TRIM[0], scale=2.0)
    f.box((PL, "trim", 0), 0.0, f.width, BH - 0.1, COPE, 0.0, 0.2, col=B.TRIM[0], scale=2.0)
HX0, HX1 = BOARD[0] - BOARD[3] / 2 - 10.5 - BX0, BOARD[0] + BOARD[3] / 2 + 10.5 - BX0   # the housing, along the face
HY0, HY1 = BOARD[1] - BOARD[4] / 2 - 3.2, BOARD[1] + BOARD[4] / 2 + 3.6
ARMS = [(x - BX0 - 0.5, x - BX0 + 0.5) for x in (BOARD[0] - 19.5, BOARD[0] - 7.0, BOARD[0] + 7.0, BOARD[0] + 19.5)]
fin_row(fs, 0.4, HX0 - 0.3, POD, COPE, rk, lit="white", every=3, k=0.22)
fin_row(fs, HX1 + 0.3, fs.width - 0.4, POD, COPE, rk, lit="amber", every=3, k=0.22)
fin_row(fs, HX0 + 0.2, HX1 - 0.2, HY1 + 0.3, COPE, rk, step=(2.3, 3.4), skip=ARMS)
fin_row(fe, 0.5, fe.width - 0.5, HALL_Y + 0.25, COPE, rk, lit="white", every=2, k=0.25)
# Its back to the court (seen from the north and from the air): the same
# glass with fewer floors lit, a plain band over the service floor, fins
# further apart. (B5 stands against its east half up to 31.8 m.)
fn = B.Face("-z", BZ0, BX0, BX1)
for s0, s1, lit, warm in ((0.0, 22.0, 0.5, 0.3), (22.0, 41.0, 0.6, 0.55), (41.0, 60.0, 0.46, 0.15)):
    fn.quad((PL, "corporate", 0), s0, s1, POD, BH, 0.0, col=glass_col(lit, warm, rk.random()))
fn.quad((PL, "trim", 0), 0.0, fn.width, SHOP_H, POD, 0.0, col=B.TRIM[0])
fn.box((PL, "trim", 0), 0.0, fn.width, BH - 0.1, COPE, 0.0, 0.2, col=B.TRIM[0], scale=2.0)
fin_row(fn, 0.6, 29.4, 32.4, COPE, rk, step=(3.0, 4.2), out=0.45)
fin_row(fn, 30.6, fn.width - 0.6, 17.4, COPE, rk, step=(3.0, 4.2), out=0.45, lit="white", every=4, k=0.2)
# Houses' names on the band: over the shops to the square, and to the road.
# (Each its own size and way of hanging: four labels of one size in a row
# along the band read as one strip.)
wordmark("kiroshi_b", 56.6, 6.45, BZ1 + 0.32, 5.6, 2.9, 0.0)
wordmark("nicola_b", 100.6, 6.45, BZ1 + 0.32, 5.2, 2.8, 0.0)
# (The blade takes an id of its own, and the board it replaced its id, so
# the plaza's signs after them keep the words they had.)
house_name("pm")
big_sign("bl", 1.0, 66.5, 7.6, BZ1 + 0.95, math.pi / 2, n=709001)
for y in (5.4, 9.8):
    box((PL, "metal", 1), 66.45, 66.55, y, y + 0.1, BZ1, BZ1 + 0.4, scale=0.5)
big_sign("pm", 2.2, 92.2, 6.45, BZ1 + 0.34, 0.0, double=False)
wordmark("arasaka_b", BX1 + 0.32, 6.5, -274.0, 8.4, 1.8, math.pi / 2)
for x in (56.6, 66.5, 92.2, 100.6):
    light(PL, x, 6.0, BZ1 + 1.2, "white", 2.4)

# The way in, between the board's legs: a plinth of stone, four glass doors
# in a steel frame under a lit header, a canopy hung from the face on tie
# rods, lit beneath, a line of the house's teal along its edge, and on it
# the house's name in white tubes (KAIZORA, the tower's own house: an
# invented name). Its hall's light on the square before it; guards.
DX0, DX1 = DOOR
box((PL, "trim", 0), DX0 + 0.1, DX1 - 0.1, 0.15, 0.42, BZ1, BZ1 + 0.9, col=B.TRIM[0], scale=2.0)
for k in range(5):
    x = 75.4 + k * 1.8
    box((PL, "board_frame", 0), x - 0.07, x + 0.07, 0.42, 3.05, BZ1 + 0.05, BZ1 + 0.24, scale=1.0)
box((PL, "board_frame", 0), 75.3, 82.8, 3.0, 3.3, BZ1 + 0.05, BZ1 + 0.26, scale=1.0)
box((PL, "glow", 0), 75.5, 82.6, 3.08, 3.2, BZ1 + 0.26, BZ1 + 0.29, col=dim("white", 1.1))
for k in range(4):
    x = 76.3 + k * 1.8
    for d in (-0.22, 0.22):
        box((PL, "metal", 1), x + d - 0.025, x + d + 0.025, 0.95, 1.75, BZ1 + 0.24, BZ1 + 0.3, scale=0.5)
CY, CZ = 6.55, BZ1 + 4.4
box((PL, "board_frame", 0), DX0 + 0.6, DX1 - 0.6, CY, CY + 0.3, BZ1 + 0.05, CZ, scale=1.0, bottom=True)
x = DX0 + 1.5
while x < DX1 - 1.0:
    box((PL, "glow", 0), x - 0.55, x + 0.55, CY - 0.02, CY, BZ1 + 1.0, CZ - 0.6, col=dim("white", 0.6), bottom=True)
    x += 2.0
nbox("teal", DX0 + 0.6, DX1 - 0.6, CY + 0.06, CY + 0.2, CZ, CZ + 0.04)
for x in (DX0 + 1.2, DX1 - 1.2):
    pipe((PL, "metal", 0), (x, CY + 0.3, CZ - 0.3), (x, 10.6, BZ1 + 0.06), 0.05, segs=5)
# (The name stands on a steel rail over the canopy, high enough for the
# Work shot's frame, its foot at 8.4 m: on the canopy it was cut by it.)
NY, NZ = 8.4, BZ1 + 0.7
box((PL, "metal", 0), DX0 + 3.0, DX1 - 3.0, NY - 0.1, NY - 0.02, NZ - 0.15, NZ + 0.15, scale=1.0)
for x in (DX0 + 3.2, 79.0, DX1 - 3.2):
    box((PL, "metal", 1), x - 0.04, x + 0.04, CY + 0.3, NY - 0.1, NZ - 0.04, NZ + 0.04, scale=0.5)
tube_word("KAIZORA", 79.0, NY, NZ, 1.05, (PL, "neon_white", 0), r=0.045)
for x in (75.0, 79.0, 83.0):
    shine(x, 3.2, BZ1 + 2.6, "white", 7.0, reach=6.0)
shine(79.0, 6.0, BZ1 + 5.2, "teal", 3.0, reach=5.0)
for (px, yaw) in ((74.2, 0.0), (83.9, 0.0)):
    stand(px, BZ1 + 1.6, yaw, "idle", y=0.15)
stand(78.2, BZ1 + 2.6, math.pi, "carry", y=0.15)
stand(80.6, BZ1 + 3.3, 0.3, "phone", y=0.15)

# ---------------------------------------------------------------------------
# The walkway over the x 120 road (Fn9gKhU_2_Q@74, @81): from B1's corner
# block to D1's podium, 10 m south of the junction, a concrete deck on two
# steel arches, its edges striped in yellow light, glass rails, a lit
# soffit, a board over its north rail turned to the junction and the square.
# Under 13 m with its board: the aerial's line into the square, the
# braindance's crane and the Work shot pass far over it.
# ---------------------------------------------------------------------------
WX0, WX1, WZ0, WZ1, WY = 108.0, 132.0, -160.0, -156.0, 9.2
WZ = (WZ0 + WZ1) / 2
box((PL, "concrete", 0), WX0, WX1, WY - 0.45, WY, WZ0, WZ1, scale=1.5, bottom=True)
B.COLLISION.append(("box", WX0, WX1, WY - 0.45, WY + 1.2, WZ0, WZ1, PL))
for z, out in ((WZ0, -1), (WZ1, 1)):
    # The edge beam, dark, and the stripes of light let into its face.
    box((PL, "board_frame", 0), WX0, WX1, WY - 0.6, WY + 0.12, *sorted((z, z + out * 0.12)), scale=1.0)
    x = WX0 + 0.6
    while x + 1.3 < WX1:
        box((PL, "neon_yellow", 0), x, x + 1.3, WY - 0.42, WY - 0.08, *sorted((z + out * 0.12, z + out * 0.15)), scale=1.0)
        x += 2.4
    balustrade([(WX0 + 0.1, z - out * 0.12), (WX1 - 0.1, z - out * 0.12)], WY, colour="yellow", k=0.6)
    # A steel arch under each edge, springing from the walls.
    pts = [(WX0 + (WX1 - WX0) * t, WY - 0.6 - 2.6 * (2 * t - 1) ** 2, z - out * 0.3) for t in (0.0, 0.1, 0.22, 0.36, 0.5, 0.64, 0.78, 0.9, 1.0)]
    for a, b in zip(pts, pts[1:]):
        pipe((PL, "metal", 0), a, b, 0.11, segs=5)
    for t in (0.22, 0.78):
        px = WX0 + (WX1 - WX0) * t
        pipe((PL, "metal", 1), (px, WY - 0.6 - 2.6 * (2 * t - 1) ** 2, z - out * 0.3), (px, WY - 0.5, z - out * 0.3), 0.05, segs=4)
# The soffit's light (white panels, and its colour on the road: green and
# orange, as the frame's deck has).
for i, x in enumerate((111.5, 116.0, 120.0, 124.0, 128.5)):
    box((PL, "glow", 0), x - 0.8, x + 0.8, WY - 0.49, WY - 0.45, WZ - 0.25, WZ + 0.25, scale=1.0, col=dim("white", 0.9), bottom=True)
    light(PL, x, 6.0, WZ, ("green", "amber", "white", "amber", "green")[i], 5.0)
# Where it lands: a lit doorway in each wall.
for x, out in ((WX0, 1), (WX1, -1)):
    box((PL, "board_frame", 0), *sorted((x, x + out * 0.14)), WY, WY + 3.0, WZ - 1.5, WZ + 1.5, scale=1.0)
    box((PL, "glow", 0), *sorted((x + out * 0.14, x + out * 0.17)), WY + 0.05, WY + 2.6, WZ - 1.2, WZ + 1.2, scale=1.0, col=dim("white", 0.55))
    box((PL, "glow", 0), *sorted((x + out * 0.14, x + out * 0.18)), WY + 2.7, WY + 2.85, WZ - 1.3, WZ + 1.3, scale=1.0, col=dim("yellow", 0.8))
screen(120.0, WY + 2.5, WZ0 - 0.1, 9.0, 2.2, math.pi, rk, back=True, depth=0.3)
for x in (116.0, 124.0):
    box((PL, "metal", 1), x - 0.06, x + 0.06, WY, WY + 1.4, WZ0 - 0.2, WZ0 - 0.08, scale=0.5)
for (px, pz, yaw, pose) in ((113.2, WZ + 1.2, math.pi, "lean"), (114.0, WZ + 1.1, math.pi + 0.3, "phone"), (121.0, WZ - 0.4, 1.3, "talk"),
                            (121.8, WZ - 0.1, 1.3 + math.pi, "talk"), (126.6, WZ - 1.2, 0.0, "idle"), (118.0, WZ + 0.2, math.pi / 2, "idle")):
    stand(px, pz, yaw, pose, y=WY + 0.01)

# ---------------------------------------------------------------------------
# The tall back on the square's west side: the canyon's east row at x 44,
# z -258..-222, 58 m (the canyon's own: its builder is not running, and the
# coordinator asked for this face to be dressed from here; everything is
# plaza's, stands between x 44.05 and 44.7 and stops under its roof). Fins
# up it in two fields, three bands of light across it, a lit canopy over
# its shops. Left clear: the GPU on this wall (44.4, 22, -240: z -245..-235,
# y 17..27), the side board (z -233.5..-222.5, y 8..16.5), the ledge the
# canyon gave it at 18 m.
# ---------------------------------------------------------------------------
fw = B.Face("+x", 44.0, -258.0, -222.0)     # s runs from z -222 (left, seen from the square) to z -258
TOP = 57.6
GPU = (13.0, 23.0)        # along the face: z -235..-245
SIDE = (0.0, 11.6)        # z -222..-233.6
# (The fins start over the canopy; under 27.5 m they leave the GPU and the
# board alone.)
fin_row(fw, 0.5, fw.width - 0.5, 28.0, TOP, rk, step=(2.2, 3.0), out=0.5, lit="cyan", every=4, k=0.3)
fin_row(fw, 0.5, fw.width - 0.5, 8.6, 17.6, rk, step=(2.2, 3.0), out=0.5, skip=(SIDE, GPU))
fin_row(fw, 23.6, fw.width - 0.5, 18.6, 27.4, rk, step=(2.2, 3.0), out=0.5, lit="amber", every=3, k=0.3)
fin_row(fw, 0.5, 12.4, 18.6, 27.4, rk, step=(2.2, 3.0), out=0.5)
for y, hue, k in ((27.5, "white", 0.5), (42.0, "cyan", 0.4), (TOP - 0.6, "amber", 0.6)):
    fw.box((PL, "trim", 0), 0.2, fw.width - 0.2, y, y + 0.5, 0.0, 0.6, col=B.TRIM[1], scale=2.0)
    fw.box((PL, "glow", 0), 0.4, fw.width - 0.4, y + 0.16, y + 0.34, 0.6, 0.63, col=dim(hue, k))
# The canopy over the shops (theirs stops at 4.5 m): a dark fascia with a
# line of amber, lamps under it and their light on the lane.
fw.box((PL, "trim", 0), 0.0, fw.width, 5.2, 8.0, 0.0, 0.45, col=B.TRIM[0], scale=2.0)
fw.box((PL, "glow", 0), 0.3, fw.width - 0.3, 7.7, 7.82, 0.45, 0.48, col=dim("amber", 0.7))
fw.box((PL, "glow", 0), 0.3, fw.width - 0.3, 5.3, 5.38, 0.45, 0.48, col=dim("white", 0.4))
for s in (4.0, 10.0, 16.0, 22.0, 28.0, 33.0):
    z = fw.at(s)
    light(PL, 45.4, 4.0, z, "amber", 4.0)
big_sign("pm", 1.9, 44.5, 6.6, -248.0, math.pi / 2, double=False)
big_sign("ps", 1.9, 44.5, 6.6, -253.5, math.pi / 2, double=False, frame=True)

# The small board over the housing (board_7, plaza.py) in a lit bezel and
# under a line of light, so it reads as a lit screen however dark the
# entry it shows.
b7x, b7y, b7z, b7w, b7h = 79.0, 41.0, -262.6, 12.0, 4.0
for (xa, xb, ya, yb) in ((b7x - b7w / 2 - 0.3, b7x + b7w / 2 + 0.3, b7y + b7h / 2, b7y + b7h / 2 + 0.16),
                         (b7x - b7w / 2 - 0.3, b7x + b7w / 2 + 0.3, b7y - b7h / 2 - 0.16, b7y - b7h / 2),
                         (b7x - b7w / 2 - 0.16, b7x - b7w / 2, b7y - b7h / 2, b7y + b7h / 2),
                         (b7x + b7w / 2, b7x + b7w / 2 + 0.16, b7y - b7h / 2, b7y + b7h / 2)):
    box((PL, "glow", 0), xa, xb, ya, yb, b7z - 0.06, b7z + 0.02, col=dim("white", 0.3))
box((PL, "glow", 0), b7x - b7w / 2, b7x + b7w / 2, b7y + b7h / 2 + 0.36, b7y + b7h / 2 + 0.52, b7z - 0.2, b7z - 0.12, col=dim("cyan", 0.3))

# The block's crown: at each end of its roof, back from the square's edge,
# a plant house in dark steel with a line of light round its head, a mast
# on it with its red lamp, all under the Work shot's line to ARASAKA's name
# (52.4 m at z -279), in the frame's corners and not under the name.
for (xa, xb) in ((49.6, 60.0), (97.0, 106.4)):
    za, zb = -283.4, -275.0
    walls((PL, "trim", 0), [(xa, zb), (xb, zb), (xb, za), (xa, za)], BH, BH + 3.0, B.TRIM[0])
    poly((PL, "roof", 0), [(xa, BH + 3.0, zb), (xb, BH + 3.0, zb), (xb, BH + 3.0, za), (xa, BH + 3.0, za)], ((0, 0), (1, 0), (1, 1), (0, 1)))
    box((PL, "glow", 0), xa - 0.04, xb + 0.04, BH + 2.55, BH + 2.7, zb, zb + 0.04, col=dim("teal", 0.5))
    corner_lamps(xa, xb, za, zb, BH + 3.0)
    mast((xa + xb) / 2 + 1.5, (za + zb) / 2, BH + 3.0, 4.0)
