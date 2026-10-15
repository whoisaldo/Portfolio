"""The megabuilding's base: what a walker and a driver meet at its foot.

Heavy concrete decks on columns over the forecourt (z -745..-732), yellow
along their edges and ribbed underneath, at three heights (Fn9gKhU_2_Q@24,
KvMY1uzSC1E@20); a first-floor gallery along the whole face as the shops'
canopy; shops under it on the west; the block's entrance in the middle, a
low passage lit green with caged amber lamps on its walls (Fn9gKhU_2_Q@1)
through to the court at the foot of the light well; and on the east the
NCART entrance: an orange wall, the cyan panel, a red strip, a terrace with
glass rails, a wide stair, food boxes at its foot (Fn9gKhU_2_Q@34).

In the hero's slot (about x -15..15 here) nothing lit is added at street
level: the passage's tubes hang behind its lintel, the entrance walls are
dark panels, the decks' marker lights are dimmed.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403

FZ = MB_ZF                    # -745: the outer sections' face
MZ = MB_ZF - MB_REC           # -749: the middle section's
FP = MB_ZF + 0.38             # the ground floor's own frontage, proud of the dark core
COL_Z = -734.2                # the front row of columns
L1 = floor_y(1)               # 4.6: the gallery
GAL_Z = -741.0                # the gallery's edge
PX0, PX1 = PASSAGE
ZC0, ZC1 = WELL[3], MB_ZF     # the passage runs from the court (north) to the face (south)
CEIL = 4.0

# ---------------------------------------------------------------------------
# Ground: the forecourt, the passage, the court.
# ---------------------------------------------------------------------------
B.ground_rect(D, MB_X0, MB_X1, MB_ZF, ST_N)
B.ground_rect(D, PX0, PX1, ZC0, ZC1)
B.ground_rect(D, WELL[0], WELL[1], WELL[2], WELL[3])

# ---------------------------------------------------------------------------
# The west shops, under the gallery: the generator's shopfronts on a plane a
# hand proud of the block's dark core, small boards on the fascia.
# ---------------------------------------------------------------------------
fw = face("+z", FP, MB_X0, -18.0)
B.shopfront(D, fw, random.Random(8211), 0.0, fw.width, 5, sign_rate=0.0, awning_rate=0.0, door=True,
            palette=["pink", "amber", "cyan", "red", "teal", "magenta"])
_r = random.Random(8212)
_x = MB_X0 + 2.2
while _x < -20.5:
    sw, sh = ST_SIZES["ps"]
    box((D, "board_frame", 0), _x - sw / 2 - 0.05, _x + sw / 2 + 0.05, 3.3, 4.1, FP, FP + 0.08, scale=1.0)
    sign(st_name("ps"), _x, 3.7, FP + 0.095, sw, sh, 0.0, district=D, label=False)
    _x += _r.choice((3.4, 4.2, 5.6))
# Its west end, against the wing: shut behind a wall of the block's own.
tbox(MB_X0, MB_X0 + 0.05, G0, L1, FZ, FP, BLACK)

# ---------------------------------------------------------------------------
# The entrance, in the middle: dark panelled walls either side of the
# passage's mouth, a service door in each, the lintel painted with the
# block's number.
# ---------------------------------------------------------------------------
for xa, xb in ((-18.0, PX0), (PX1, 18.0)):
    tbox(xa, xb, G0, 4.12, FZ, FP, BLUEGREY)
    mid = (xa + xb) / 2 + (1.5 if xa < 0 else -1.5)
    quad((D, "door", 0), (mid - 0.55, G0, FP + 0.012), (mid + 0.55, G0, FP + 0.012), (mid + 0.55, 2.3, FP + 0.012), (mid - 0.55, 2.3, FP + 0.012))
    box((D, "metal", 1), mid - 0.65, mid + 0.65, 2.3, 2.4, FP, FP + 0.12, scale=0.5)
    # An intercom by the door and the pipes that come down beside it.
    box((D, "glow", 1), mid + 0.82, mid + 0.98, 1.35, 1.6, FP, FP + 0.03, scale=0.5, col=dim(GLOW["cyan"], 0.25))
    P.place("pipe_v", xa + 0.5 if xa < 0 else xb - 0.5, G0, FP, 0.0, sy=3.9)
    strokes((D, "trim", 1), "H4", mid + (3.4 if xa < 0 else -3.4), 2.55, FP, 0.9, 0.0, YEL_OLD, weight=0.16)
tbox(PX0, PX1, 3.3, 4.12, FZ - 0.3, FP + 0.06, YEL_OLD, bottom=True)
strokes((D, "trim", 1), "> H4 <", 0.0, 3.71, FP + 0.06, 0.5, 0.0, BLACK, weight=0.17)

# ---------------------------------------------------------------------------
# The passage: lined in concrete, a slab over it, pipes along the ceiling,
# green tubes down the middle (behind the lintel from the street), caged
# amber lamps on the walls, and what collects in it.
# ---------------------------------------------------------------------------
vquad((D, "concrete", 0), (PX0 + 0.02, ZC1), (PX0 + 0.02, ZC0), G0, CEIL)
vquad((D, "concrete", 0), (PX1 - 0.02, ZC0), (PX1 - 0.02, ZC1), G0, CEIL)
cbox(PX0, PX1, CEIL, L1, ZC0, ZC1, bottom=True)
cbox(PX0, PX1, 3.45, CEIL, ZC0 - 0.02, ZC0 + 0.45, bottom=True)
rpipe((-3.7, 3.82, ZC0 + 0.5), (-3.7, 3.82, ZC1 - 0.4), 0.11)
rpipe((-3.38, 3.88, ZC0 + 0.5), (-3.38, 3.88, ZC1 - 0.4), 0.06, col=STEEL)
rpipe((3.5, 3.78, ZC0 + 0.5), (3.5, 3.78, ZC1 - 0.4), 0.15, col=CONC)
for z in (-748.6, -752.6, -756.6, -760.6):
    # (Their pools of light start a little way in: the bake lights a wall at
    # every height over a pool, and the block's face is the hero's.)
    tube_z(0.0, 3.93, z - 0.8, z + 0.8, "green", power=3.0, pools=False)
    box((D, "metal", 1), -0.16, 0.16, 3.93, CEIL, z - 0.9, z + 0.9, scale=0.5)
for z in (-754.2, -757.6, -761.0):
    light(D, 0.0, 3.9, z, "green", 10.0)
for z in (-751.0, -755.5, -760.0):
    cbox(PX0, PX1, CEIL - 0.3, CEIL, z - 0.2, z + 0.2, bottom=True, detail=1)
for z in (-750.4, -758.4):
    wall_lamp(PX0 + 0.02, 2.55, z, 1, 0, "amber", 5.5 if z < -752 else 2.0)
    wall_lamp(PX1 - 0.02, 2.55, z + 2.0, -1, 0, "amber", 5.5 if z < -754 else 2.0)
P.place("bags", PX0 + 0.8, G0, -753.2, math.pi / 2)
P.place("dumpster", PX0 + 0.75, G0, -760.4, math.pi / 2)
P.place("drum", PX1 - 0.55, G0, -751.2)
P.place("drum", PX1 - 0.6, G0, -751.95)
P.place("crates", PX1 - 0.85, G0, -759.4, -math.pi / 2)
P.place("bags", PX1 - 0.8, G0, -755.6, -math.pi / 2)
stand(PX0 + 0.55, -751.4, math.pi / 2, "sit", G0)
stand(PX0 + 0.55, -755.6, math.pi / 2, "sit", G0)
stand(PX1 - 0.55, -753.6, -math.pi / 2, "sit", G0)
stand(PX1 - 0.7, -748.0, -math.pi / 2, "squat", G0)
stand(PX0 + 0.5, -757.6, math.pi / 2, "lean", G0)
talkers(1.4, -757.4, G0, n=2, turn=0.6)
stand(-1.8, -746.6, 0.3, "smoke", G0)
stand(PX0 - 1.2, FP + 0.45, 0.0, "lean", G0)
stand(PX1 + 1.4, FP + 0.45, 0.0, "smoke", G0)

# ---------------------------------------------------------------------------
# The court at the foot of the light well: lined walls (the east one in
# orange panels, KvMY1uzSC1E@13), back doors, a shutter, a kiosk window lit
# pink, vending, a tree in a planter under the sky, benches, a vent.
# ---------------------------------------------------------------------------
wx0, wx1, wz0, wz1 = WELL
vquad((D, "concrete", 0), (wx0 + 0.02, wz1), (wx0 + 0.02, wz0), G0, L1)
vquad((D, "trim", 0), (wx1 - 0.02, wz0), (wx1 - 0.02, wz1), G0, L1, col=ORANGE_DARK)
vquad((D, "concrete", 0), (wx0, wz0 + 0.02), (wx1, wz0 + 0.02), G0, L1 + 0.6)
vquad((D, "concrete", 0), (wx1, wz1 - 0.02), (PX1, wz1 - 0.02), G0, L1)
vquad((D, "concrete", 0), (PX0, wz1 - 0.02), (wx0, wz1 - 0.02), G0, L1)
# West wall: two doors, a lamp over each.
for z in (-767.5, -777.5):
    quad((D, "door", 0), (wx0 + 0.035, G0, z + 0.55), (wx0 + 0.035, G0, z - 0.55), (wx0 + 0.035, 2.3, z - 0.55), (wx0 + 0.035, 2.3, z + 0.55))
    wall_lamp(wx0 + 0.02, 2.7, z, 1, 0, "amber", 2.4)
# North wall: a roller shutter and the vending machines.
quad((D, "door_panel", 0), (-1.6, G0, wz0 + 0.035), (1.6, G0, wz0 + 0.035), (1.6, 3.1, wz0 + 0.035), (-1.6, 3.1, wz0 + 0.035))
box((D, "metal", 1), -1.75, 1.75, 3.1, 3.4, wz0 + 0.02, wz0 + 0.3, scale=0.5)
wall_lamp(0.0, 3.75, wz0 + 0.02, 0, 1, "white", 2.6)
strokes((D, "trim", 1), "04", 4.4, 2.9, wz0 + 0.03, 1.3, 0.0, YEL_OLD, weight=0.15)
P.place("vending", -6.6, G0, wz0 + 0.45, 0.0)
P.place("vending_warm", -5.45, G0, wz0 + 0.45, 0.0)
P.place("vending", -4.3, G0, wz0 + 0.45, 0.0)
# East wall: a kiosk, its window lit pink, a counter under a strip of light.
kz0, kz1 = -777.6, -771.2
quad((D, "shop", 0), (wx1 - 0.05, 0.95, kz0), (wx1 - 0.05, 0.95, kz1), (wx1 - 0.05, 3.1, kz1), (wx1 - 0.05, 3.1, kz0), col=(0.95, 0.8, 1.0, 1.0))
tbox(wx1 - 0.75, wx1 - 0.05, G0, 0.95, kz0, kz1, STEEL, bottom=False)
tbox(wx1 - 0.95, wx1 - 0.05, 3.1, 3.35, kz0 - 0.2, kz1 + 0.2, BLACK, bottom=True)
box((D, "neon_magenta", 0), wx1 - 0.99, wx1 - 0.95, 3.14, 3.3, kz0, kz1, scale=1.0)
light(D, wx1 - 2.0, 2.4, (kz0 + kz1) / 2, "pink", 3.0)
stand(wx1 - 0.4, -774.4, -math.pi / 2, "vendor", G0)
stand(wx1 - 1.6, -773.6, math.pi / 2, "idle", G0)
stand(wx1 - 1.7, -775.4, math.pi / 2, "phone", G0)
# The middle: a tree, benches round it, a lamp.
P.place("planter_tree", 0.0, G0, -773.0)
for (bx, bz, yaw) in ((-2.3, -773.0, math.pi / 2), (2.3, -773.0, -math.pi / 2), (0.0, -770.6, 0.0)):
    P.place("bench", bx, G0, bz, yaw)
stand(-2.3, -773.4, -math.pi / 2, "sit", G0 + 0.48)
stand(2.3, -772.6, math.pi / 2, "sit", G0 + 0.48)
stand(0.3, -770.6, math.pi, "sit", G0 + 0.48)
P.place("lamp_short", -5.6, G0, -765.2)
P.place("lamp_short", 5.8, G0, -780.4)
P.place("bin", -8.2, G0, -772.4)
P.place("bags", 7.9, G0, -765.0, -math.pi / 2)
P.place("crates", -7.9, G0, -781.4, math.pi / 2)
P.place("crates", 3.2, G0, wz0 + 0.8, 0.0)
talkers(-3.4, -767.8, G0, n=3, turn=0.4)
stand(-5.4, wz0 + 1.3, math.pi, "phone", G0)
stand(wx0 + 0.45, -769.8, math.pi / 2, "lean", G0)
stand(6.4, wz0 + 0.7, 0.0, "squat", G0)
empty("anchor_steam_mega_0", (5.2, 0.2, -767.4))
box((D, "metal", 1), 4.8, 5.6, G0, G0 + 0.05, -767.8, -767.0, scale=0.5)
light(D, 0.0, 5.0, -773.0, "white", 5.0)
light(D, -4.0, 5.0, -778.0, "purple", 4.0)

# ---------------------------------------------------------------------------
# The NCART entrance, on the east.
# ---------------------------------------------------------------------------
NX0, NX1 = 21.5, 45.5
TY, TZ = 2.4, -739.5
SX0, SX1, SFOOT = 29.5, 37.5, -735.4
cbox(22.0, 45.0, 0.0, TY, FP, TZ)
tbox(22.0, SX0, G0, TY - 0.02, TZ, TZ + 0.05, BLUEGREY)
tbox(SX1, 45.0, G0, TY - 0.02, TZ, TZ + 0.05, BLUEGREY)
stairs("z", SX0, SX1, SFOOT, TZ, G0, TY, steps=12)
# Each step's edge in yellow, so the flight reads as a flight from across the street.
for i in range(12):
    zz, yy = SFOOT + (TZ - SFOOT) * i / 12, G0 + (TY - G0) * (i + 1) / 12
    vquad((D, "trim", 1), (SX0, zz + 0.006), (SX1, zz + 0.006), yy - 0.055, yy, col=YEL)
for x in (SX0 + 0.05, (SX0 + SX1) / 2, SX1 - 0.05):
    pipe((D, "metal", 1), (x, G0 + 0.95, SFOOT), (x, TY + 0.95, TZ), 0.035, segs=4)
    pipe((D, "glow", 1), (x, G0 + 0.88, SFOOT), (x, TY + 0.88, TZ), 0.018, segs=4, col=dim(GLOW["white"], 0.5))
    for t in (0.0, 0.5, 1.0):
        zz, yy = SFOOT + (TZ - SFOOT) * t, G0 + (TY - G0) * t
        box((D, "metal", 1), x - 0.03, x + 0.03, yy, yy + 0.95, zz - 0.03, zz + 0.03, scale=0.5)
glass_rail((22.0, TZ), (SX0, TZ), TY)
glass_rail((41.2, TZ), (45.0, TZ), TY)
glass_rail((22.0, FP), (22.0, TZ), TY)
glass_rail((45.0, TZ), (45.0, FP), TY)
# A line of light in the foot of each pane, and the terrace's own lamps' pools.
for (ax, bx, az, bz) in ((22.0, SX0, TZ, TZ), (41.2, 45.0, TZ, TZ), (22.0, 22.0, TZ, FP), (45.0, 45.0, TZ, FP)):
    box((D, "glow", 1), min(ax, bx) - 0.025, max(ax, bx) + 0.025, TY + 0.02, TY + 0.08, min(az, bz) - 0.025, max(az, bz) + 0.025, scale=0.5, col=dim(GLOW["cyan"], 0.45))
# The gates: a row of fare gates on the terrace before the entrance, each
# with its lamp, yellow paddles between.
GATE_Z = FP + 1.55
for i in range(6):
    gx = 30.0 + i * 1.4
    box((D, "metal", 0), gx - 0.15, gx + 0.15, TY, TY + 1.05, GATE_Z - 0.55, GATE_Z + 0.55, scale=0.5)
    rotated_quad((D, "glow", 1), gx, TY + 0.82, GATE_Z + 0.556, 0.18, 0.18, 0.0, col=dim(GLOW["green" if i % 3 else "red"], 0.8))
    hquad((D, "glow", 1), gx - 0.1, gx + 0.1, GATE_Z - 0.3, GATE_Z + 0.3, TY + 1.055, col=dim(GLOW["white"], 0.25))
    if i < 5:
        tbox(gx + 0.15, gx + 0.62, TY + 0.5, TY + 0.9, GATE_Z - 0.03, GATE_Z + 0.03, YEL, detail=1)
        tbox(gx + 0.78, gx + 1.25, TY + 0.5, TY + 0.9, GATE_Z - 0.03, GATE_Z + 0.03, YEL, detail=1)
# The orange wall, its gate, the red strip, the panel and its letters.
WZ = FP + 0.12
tbox(NX0, NX1, G0, floor_y(2), FZ, WZ, ORANGE)
GX0, GX1 = 30.5, 36.5
tbox(GX0, GX1, TY, 5.0, WZ, WZ + 0.04, BLACK)
quad((D, "glow", 0), (GX0 + 0.4, TY + 0.1, WZ + 0.05), (GX1 - 0.4, TY + 0.1, WZ + 0.05), (GX1 - 0.4, 4.7, WZ + 0.05), (GX0 + 0.4, 4.7, WZ + 0.05),
     col=dim(GLOW["white"], 0.16))
_gx = GX0 + 0.5
while _gx < GX1 - 0.3:
    box((D, "metal", 1), _gx - 0.03, _gx + 0.03, TY, 4.85, WZ + 0.1, WZ + 0.16, scale=0.5)
    _gx += 0.5
box((D, "metal", 0), GX0 - 0.1, GX1 + 0.1, 4.85, 5.05, WZ, WZ + 0.22, scale=0.5)
box((D, "neon_red", 0), GX0 - 0.3, GX1 + 0.3, 5.12, 5.32, WZ, WZ + 0.08, scale=1.0)
PA0, PA1, PY0, PY1 = 26.0, 41.0, 5.55, 7.85
box((D, "neon_red", 0), NX0 + 0.6, PA0 - 0.9, 6.64, 6.76, WZ, WZ + 0.06, scale=1.0)
box((D, "neon_red", 0), PA1 + 0.9, NX1 - 0.6, 6.64, 6.76, WZ, WZ + 0.06, scale=1.0)
lozenge("NCART", (PA0 + PA1) / 2, (PY0 + PY1) / 2 + 0.12, WZ, PA1 - PA0, PY1 - PY0, 0.0, th=1.1)
strokes((D, "glow", 0), "METRO RAIL  LINE 4 NORTH", (PA0 + PA1) / 2, PY0 + 0.32, WZ + 0.12, 0.26, 0.0, dim(GLOW["white"], 0.8), weight=0.16, gap=0.28)
# A warning plate and the lamps on the wall.
tbox(38.0, 39.1, 3.0, 4.3, WZ, WZ + 0.03, YEL)
poly((D, "trim", 1), [(38.2, 3.5, WZ + 0.04), (38.9, 3.5, WZ + 0.04), (38.55, 4.15, WZ + 0.04)], [(0, 0), (1, 0), (0.5, 1)], BLACK)
for i in range(3):
    rotated_quad((D, "trim", 1), 38.55, 3.36 - i * 0.11, WZ + 0.04, 0.8 - i * 0.15, 0.05, 0.0, col=BLACK)
wall_lamp(24.2, 4.7, WZ, 0, 1, "amber", 5.0)
wall_lamp(43.0, 4.7, WZ, 0, 1, "amber", 5.0)
wall_lamp(28.0, 4.7, WZ, 0, 1, "white", 3.5)
wall_lamp(39.6, 4.7, WZ, 0, 1, "white", 3.5)
strokes((D, "trim", 1), "H4", 43.2, 6.7, WZ, 1.1, 0.0, dim(ORANGE, 0.45), weight=0.16)
# On the terrace and at the stair's foot.
P.place("vending", 23.5, TY, FP + 0.62, 0.0)
P.place("vending_warm", 24.65, TY, FP + 0.62, 0.0)
P.place("bench", 42.6, TY, FP + 0.75, 0.0)
P.place("bin", 29.0, TY, FP + 0.6)
P.place("food_box", 28.6, G0, SFOOT - 0.6, 0.0)
P.place("food_box", 27.7, G0, SFOOT - 0.6, 0.0)
P.place("food_box", 38.5, G0, SFOOT - 0.6, 0.0)
P.place("cctv", 37.9, TY, TZ - 0.6)
for (x, pose) in ((23.6, "phone"), (26.4, "idle"), (27.6, "idle")):
    stand(x, TZ - 0.45, 0.0, pose, TY)
stand(25.2, FP + 1.4, 0.0, "idle", TY)
stand(42.4, FP + 0.75, 0.0, "sit", TY + 0.48)
talkers(40.2, -742.4, TY, n=3, turn=0.2)
stand(38.6, TZ - 0.12, 0.0, "sit", TY)
stand(39.7, TZ - 0.12, 0.0, "sit", TY)
stand(33.0, FP + 0.9, 0.0, "idle", TY)
stand(35.4, FP + 1.6, math.pi, "idle", TY)
for (x, step, yaw) in ((31.0, 4, 0.0), (36.2, 7, 0.0), (32.4, 9, 0.4)):
    stand(x, SFOOT + (TZ - SFOOT) * (step + 0.5) / 12, yaw, "sit", G0 + (TY - G0) * step / 12)
stand(34.2, SFOOT + (TZ - SFOOT) * 0.45, math.pi, "idle", G0 + (TY - G0) * 0.42)
stand(28.2, SFOOT + 0.25, math.pi, "phone", G0)
stand(27.1, SFOOT - 0.1, 0.9, "idle", G0)
stand(39.3, SFOOT - 0.2, math.pi, "idle", G0)
light(D, 33.5, 3.0, -737.4, "white", 6.5)
light(D, 33.5, 3.0, -741.6, "amber", 5.0)

# ---------------------------------------------------------------------------
# The columns and the decks over the forecourt, each at its own height.
# ---------------------------------------------------------------------------
W_TOP, M_TOP, E_TOP = floor_y(2), floor_y(3), floor_y(4)        # 8.0, 11.4, 14.8
W_COLS, M_COLS, E_COLS = (-41.5, -31.0, -20.5), (-16.6, -8.0, 8.0, 16.6), (20.5, 28.3, 38.7, 46.3)
for xs, soffit in ((W_COLS, W_TOP - 0.7), (M_COLS, M_TOP - 0.7), (E_COLS, E_TOP - 0.8)):
    for x in xs:
        column(x, COL_Z, 1.3, G0, soffit)
        cbox(x - 0.95, x + 0.95, soffit - 0.55, soffit, COL_Z - 0.95, COL_Z + 0.95, bottom=True, detail=1)
# The gallery: the first floor's walkway along the whole face.
deck(MB_X0, -18.0, FZ, GAL_Z, L1, thick=0.5, ribs=None, yellow=("+z",), parapet=("+z",), dots=("+z",))
deck(-18.0, 18.0, FZ, GAL_Z, L1, thick=0.5, ribs=None, yellow=("+z",), parapet=("+z",), dots=("+z",), dot_col=dim(GLOW["amber"], 0.3))
hquad((D, "concrete", 0), -18.0, 18.0, MZ, FZ, L1 + 0.02)
deck(18.0, NX0, FZ, GAL_Z, L1, thick=0.5, ribs=None, yellow=("+z", "+x"), parapet=("+z", "+x"))
# Brackets under it, off the wall.
for x in [MB_X0 + 3.0 + 6.0 * i for i in range(12)]:
    if abs(x) < 6.5 or x > NX0 - 1:
        continue
    cbox(x - 0.2, x + 0.2, L1 - 1.0, L1 - 0.5, FP, GAL_Z + 0.4, bottom=True, detail=1)
deck(-43.0, -18.7, FZ, -733.4, W_TOP, thick=0.7, ribs="x", yellow=("+z", "-x", "+x"), parapet=("+z", "-x", "+x"), dots=("+z", "-x"))
deck(-17.6, 17.6, MZ, -733.6, M_TOP, thick=0.7, ribs="x", yellow=("+z", "-x", "+x"), parapet=("+z", "-x", "+x"), dots=("+z",),
     dot_col=dim(GLOW["amber"], 0.3))
deck(18.7, 47.5, FZ, -733.4, E_TOP, thick=0.8, ribs="x", yellow=("+z", "-x", "+x"), parapet=("+z", "-x", "+x"), dots=("+z", "-x"))
# The block's number on the middle deck's edge, and the storey on the others.
strokes((D, "trim", 1), "H4", 0.0, M_TOP + 0.52, -733.6, 0.7, 0.0, YEL_OLD, weight=0.17)
strokes((D, "trim", 1), "02", -40.0, W_TOP + 0.52, -733.4, 0.7, 0.0, YEL_OLD, weight=0.17)
strokes((D, "trim", 1), "04", 44.0, E_TOP + 0.52, -733.4, 0.7, 0.0, YEL_OLD, weight=0.17)

# Under the decks: rusty pipes (XMaaEjT0LhU@32), and caged lamps hung from
# the ribs so the forecourt is lit in pools.
rpipe((-42.6, 6.6, -737.6), (-19.2, 6.6, -737.6), 0.13)
rpipe((-42.6, 6.72, -738.05), (-19.2, 6.72, -738.05), 0.07, col=STEEL)
rpipe((-42.6, G0, -737.6), (-42.6, 6.6, -737.6), 0.13)
rpipe((-17.0, 10.1, -740.6), (17.0, 10.1, -740.6), 0.14)
rpipe((-17.0, 10.26, -741.1), (17.0, 10.26, -741.1), 0.08, col=CONC)
rpipe((19.2, 13.4, -737.2), (47.0, 13.4, -737.2), 0.16)
rpipe((19.2, 13.52, -737.75), (47.0, 13.52, -737.75), 0.09, col=STEEL)
rpipe((47.0, G0, -737.2), (47.0, 13.4, -737.2), 0.16)
for (x, y, z, hue, pw) in ((-38.0, 6.55, -739.0, "amber", 3.2), (-27.0, 6.55, -739.4, "amber", 3.2), (-22.0, 6.55, -736.0, "white", 2.4),
                           (-12.0, 10.1, -740.0, "white", 1.5), (12.0, 10.1, -740.0, "white", 1.5),
                           (24.0, 13.3, -738.6, "amber", 3.6), (34.0, 13.3, -736.2, "amber", 3.6), (43.5, 13.3, -738.6, "amber", 3.6)):
    box((D, "metal", 1), x - 0.02, x + 0.02, y + 0.12, y + 0.7, z - 0.02, z + 0.02, scale=0.5)
    box((D, "glow", 0), x - 0.16, x + 0.16, y - 0.12, y + 0.12, z - 0.16, z + 0.16, scale=0.5, col=dim(GLOW[hue], 0.8 if abs(x) > 15 else 0.3), bottom=True)
    light(D, x, y, z, hue, pw)

# The column hung with red warning triangles (Fn9gKhU_2_Q@24), outside the
# hero's slot.
for i in range(6):
    P.place("warning_tri", 20.5, 2.0 + i * 0.95, COL_Z + 0.67, 0.0)
    P.place("warning_tri", 20.5 - 0.67, 2.0 + i * 0.95, COL_Z, -math.pi / 2)
for i in range(4):
    P.place("warning_tri", -41.5 + 0.67, 2.4 + i * 0.95, COL_Z, math.pi / 2)

# ---------------------------------------------------------------------------
# On the decks.
# ---------------------------------------------------------------------------
# West deck (the second floor): a terrace people use.
P.place("planter_tree", -40.6, W_TOP, -736.0)
P.place("planter_tree", -24.0, W_TOP, -743.0)
P.place("lamp_short", -33.0, W_TOP, -735.0)
P.place("lamp_short", -21.0, W_TOP, -735.0)
P.place("bench", -36.5, W_TOP, -743.6, 0.0)
P.place("bench", -29.5, W_TOP, -743.6, 0.0)
P.place("vending_warm", -42.4, W_TOP, -743.6, math.pi / 2)
for (x, pose, yaw) in ((-38.4, "idle", 0.0), (-35.6, "phone", 0.0), (-30.2, "lean", math.pi), (-26.4, "idle", 0.0), (-20.4, "smoke", 0.0)):
    stand(x, -734.15, yaw, pose, W_TOP)
stand(-36.5, -743.6, 0.0, "sit", W_TOP + 0.48)
stand(-29.9, -743.6, 0.0, "sit", W_TOP + 0.48)
talkers(-32.8, -739.4, W_TOP, n=3, turn=0.5)
stand(-41.6, -742.6, math.pi / 2, "phone", W_TOP)
# Middle deck (the third floor), over the entrance.
P.place("planter_tree", -14.6, M_TOP, -746.2)
P.place("planter_tree", 14.6, M_TOP, -746.2)
P.place("cctv", 16.6, M_TOP, -734.6)
P.place("bench", 0.0, M_TOP, -747.6, 0.0)
for (x, pose, yaw) in ((-12.5, "idle", 0.0), (-6.0, "phone", 0.0), (1.2, "idle", 0.0), (2.2, "idle", 0.2), (10.4, "lean", math.pi)):
    stand(x, -734.35, yaw, pose, M_TOP)
stand(0.0, -747.6, 0.0, "sit", M_TOP + 0.48)
talkers(-4.0, -743.0, M_TOP, n=2, turn=1.2)
# East deck (the fourth floor): plant, and a few who climbed up.
P.place("tank_roof", 41.0, E_TOP, -741.0, 0.7)
for x in (22.0, 24.0, 26.0, 33.0):
    P.place("ac_roof", x, E_TOP, -743.4)
P.place("dish", 30.0, E_TOP, -741.6, 2.6)
P.place("dish", 36.4, E_TOP, -743.0, 3.4)
P.place("antenna", 45.6, E_TOP, -743.4, 0.4, sy=1.2)
duct(27.2, 31.6, E_TOP, E_TOP + 1.3, -740.2, -738.8, detail=1)
for (x, pose) in ((23.0, "idle"), (29.4, "smoke"), (37.0, "phone")):
    stand(x, -734.15, 0.0, pose, E_TOP)
# The gallery.
for (x, pose, yaw) in ((-45.2, "idle", 0.0), (-40.4, "phone", 0.0), (-35.8, "lean", math.pi), (-25.4, "idle", 0.0), (-21.6, "smoke", 0.0),
                       (-14.2, "idle", 0.0), (-6.6, "lean", math.pi), (7.2, "phone", 0.0), (12.8, "idle", 0.0), (19.6, "idle", 0.0)):
    stand(x, GAL_Z - 0.75, yaw, pose, L1)
talkers(-29.6, -743.2, L1, n=2, turn=0.3)
talkers(-0.4, -745.6, L1, n=3, turn=0.9)
stand(-44.0, FZ + 0.5, 0.0, "squat", L1)

# ---------------------------------------------------------------------------
# The forecourt under the west deck: a noodle stall, a drinks kiosk,
# vending against the wing's wall, benches, bins, bags, hanging blades.
# ---------------------------------------------------------------------------
# The noodle stall: a counter, a back shelf, a cloth roof on four posts, a
# strip of light under it, lanterns along its front, stools.
ST_X, ST_Z = -36.4, -739.0
tbox(ST_X - 1.9, ST_X + 1.9, G0, 1.0, ST_Z - 0.35, ST_Z + 0.35, RED_PAINT)
tbox(ST_X - 2.0, ST_X + 2.0, 1.0, 1.06, ST_Z - 0.45, ST_Z + 0.45, STEEL, detail=1, bottom=True)
tbox(ST_X - 1.9, ST_X + 1.9, G0, 2.2, ST_Z - 1.95, ST_Z - 1.55, STEEL)
for sx in (-1.95, 1.95):
    for sz in (-1.9, 0.6):
        box((D, "metal", 1), ST_X + sx - 0.04, ST_X + sx + 0.04, G0, 2.75, ST_Z + sz - 0.04, ST_Z + sz + 0.04, scale=0.5)
cloth((ST_X - 2.2, 2.7, ST_Z + 1.0), (ST_X + 2.2, 2.7, ST_Z + 1.0), (ST_X + 2.2, 3.05, ST_Z - 2.1), (ST_X - 2.2, 3.05, ST_Z - 2.1), "red")
box((D, "neon_amber", 0), ST_X - 1.8, ST_X + 1.8, 2.5, 2.56, ST_Z - 0.1, ST_Z - 0.02, scale=1.0)
for i in range(5):
    P.place("lantern", ST_X - 1.8 + i * 0.9, 2.35, ST_Z + 0.95)
for i in range(4):
    sx, sz = ST_X - 1.5 + i * 1.0, ST_Z + 1.0
    cylinder((D, "trim", 0), sx, sz, G0 + 0.56, G0 + 0.62, 0.18, segs=8, col=RED_PAINT)
    for a in (0.4, 2.5, 4.6):
        lx, lz = sx + math.cos(a) * 0.12, sz + math.sin(a) * 0.12
        box((D, "metal", 1), lx - 0.015, lx + 0.015, G0, G0 + 0.56, lz - 0.015, lz + 0.015, scale=0.5)
    cylinder((D, "metal", 1), sx, sz, G0 + 0.2, G0 + 0.22, 0.13, segs=8, cap=False)
stand(ST_X - 0.4, ST_Z - 0.95, 0.0, "vendor", G0)
stand(ST_X - 1.5, ST_Z + 1.0, math.pi, "sit", G0 + 0.62)
stand(ST_X + 0.5, ST_Z + 1.0, math.pi, "sit", G0 + 0.62)
stand(ST_X + 2.6, ST_Z + 0.9, -2.2, "idle", G0)
# The drinks kiosk: a lit box with a hatch, cyan.
KX, KZ = -25.6, -738.4
tbox(KX - 1.3, KX + 1.3, G0, 2.6, KZ - 1.0, KZ + 1.0, TEAL_PAINT)
quad((D, "shop", 0), (KX - 1.0, 1.05, KZ + 1.02), (KX + 1.0, 1.05, KZ + 1.02), (KX + 1.0, 2.2, KZ + 1.02), (KX - 1.0, 2.2, KZ + 1.02), col=(0.9, 0.9, 1.0, 1.0))
tbox(KX - 1.5, KX + 1.5, 2.6, 2.75, KZ - 1.15, KZ + 1.5, BLACK, bottom=True)
box((D, "neon_cyan", 0), KX - 1.4, KX + 1.4, 2.62, 2.72, KZ + 1.5, KZ + 1.54, scale=1.0)
tbox(KX - 1.1, KX + 1.1, 0.98, 1.04, KZ + 1.0, KZ + 1.3, STEEL, detail=1, bottom=True)
stand(KX + 0.1, KZ + 1.75, math.pi, "idle", G0)
stand(KX - 0.8, KZ + 1.9, 2.6, "phone", G0)
# Against the wing's wall, and round the columns.
for i, name in enumerate(("vending", "vending_warm", "vending")):
    P.place(name, MB_X0 + 0.45, G0, -737.4 - i * 1.12, math.pi / 2)
stand(MB_X0 + 1.5, -738.2, -math.pi / 2, "phone", G0)
P.place("bench", -31.0, G0, COL_Z - 1.4, 0.0)
P.place("bench", -20.5, G0, COL_Z - 1.4, 0.0)
stand(-31.3, COL_Z - 1.4, math.pi, "sit", G0 + 0.48)
stand(-20.2, COL_Z - 1.4, math.pi, "sit", G0 + 0.48)
stand(-20.9, COL_Z - 1.4, math.pi, "sit", G0 + 0.48)
P.place("bin", -41.5, G0, COL_Z - 1.1)
P.place("bin", -29.6, G0, FP + 0.6)
P.place("bags", -40.7, G0, COL_Z - 1.6, 0.6)
P.place("crates", -22.6, G0, FP + 0.9, 0.0)
P.place("drum", -43.6, G0, FP + 0.7)
P.place("drum", -44.3, G0, FP + 0.75)
stand(-30.3, COL_Z + 0.75, 0.0, "lean", G0)
stand(-41.5, COL_Z + 0.75, 0.0, "smoke", G0)
talkers(-33.2, -742.6, G0, n=2, turn=0.0)
talkers(-21.6, -741.8, G0, n=3, turn=0.7)
stand(-27.4, FP + 0.5, 0.0, "lean", G0)
stand(-45.6, FP + 0.6, 0.0, "squat", G0)
stand(-39.2, FP + 1.0, math.pi, "idle", G0)
# Blades hung under the west deck's edge, read along the street, and boards
# at angles on the columns.
for (x, size) in ((-39.0, "bm"), (-35.4, "bs"), (-28.2, "bx"), (-24.6, "bm")):
    w, h = ST_SIZES[size]
    y = W_TOP - 0.7 - 0.25 - h / 2
    blade(x, y, -734.0, size, along="x")
    box((D, "metal", 1), x - 0.03, x + 0.03, y + h / 2, W_TOP - 0.7, -734.03, -733.97, scale=0.5)
angled_sign(-31.0 + 0.9, 3.4, COL_Z + 0.75, "ps", math.radians(24))
angled_sign(-41.5 - 0.2, 4.6, COL_Z + 0.8, "bx", math.radians(-18))
angled_sign(28.3, 4.2, COL_Z + 0.78, "ps", math.radians(-14))
angled_sign(38.7, 5.4, COL_Z + 0.78, "bx", math.radians(20))
angled_sign(46.3, 3.6, COL_Z + 0.78, "ps", math.radians(-30))
# A billboard on the west deck's corner, turned to the junction.
BB = (-37.5, -735.4, math.radians(22))
B.billboard(D, BB[0], W_TOP + 4.2, BB[1], 9.0, 5.0, BB[2], random.Random(8231))
for du in (-3.2, 3.2):
    bx, bz = BB[0] + math.cos(BB[2]) * du - math.sin(BB[2]) * 0.2, BB[1] - math.sin(BB[2]) * du - math.cos(BB[2]) * 0.2
    box((D, "metal", 1), bx - 0.1, bx + 0.1, W_TOP, W_TOP + 1.7, bz - 0.1, bz + 0.1, scale=0.5)

# ---------------------------------------------------------------------------
# The middle and east forecourt: benches by the entrance, people, clutter.
# ---------------------------------------------------------------------------
P.place("bench", -12.4, G0, COL_Z - 1.5, 0.0)
P.place("bench", 12.4, G0, COL_Z - 1.5, 0.0)
stand(-12.6, COL_Z - 1.5, math.pi, "sit", G0 + 0.48)
stand(12.1, COL_Z - 1.5, math.pi, "sit", G0 + 0.48)
stand(12.9, COL_Z - 1.5, math.pi, "sit", G0 + 0.48)
P.place("bin", -16.6, G0, COL_Z - 1.2)
P.place("bin", 16.6, G0, COL_Z - 1.2)
P.place("bollard", -5.6, G0, -732.6)
P.place("bollard", -1.9, G0, -732.6)
P.place("bollard", 1.9, G0, -732.6)
P.place("bollard", 5.6, G0, -732.6)
stand(-8.0, COL_Z + 0.75, 0.0, "lean", G0)
stand(8.0 + 0.75, COL_Z, math.pi / 2, "smoke", G0)
talkers(-10.6, -740.4, G0, n=2, turn=0.2)
talkers(9.4, -738.6, G0, n=3, turn=1.0)
stand(-14.8, FP + 0.5, 0.0, "squat", G0)
stand(15.4, FP + 0.5, 0.0, "lean", G0)
stand(3.4, -739.2, 2.9, "phone", G0)
P.place("bags", 17.2, G0, FP + 0.7, 0.2)
P.place("crates", 19.4, G0, FP + 0.9, 0.0)
P.place("drum", 20.6, G0, FP + 0.6)
P.place("bin", 21.0, G0, -737.0)
stand(24.6, TZ + 0.5, 0.0, "lean", G0)
stand(43.4, TZ + 0.5, 0.0, "lean", G0)
stand(41.8, TZ + 0.6, 0.0, "squat", G0)
P.place("bags", 44.4, G0, TZ + 0.7, -0.4)
P.place("hydrant", 47.2, G0, -733.0)
stand(46.3, COL_Z + 0.78, 0.0, "smoke", G0)
talkers(24.4, -736.4, G0, n=2, turn=0.6)
empty("anchor_steam_mega_1", (18.6, 0.2, -736.6))
box((D, "metal", 1), 18.2, 19.0, G0, G0 + 0.05, -737.0, -736.2, scale=0.5)

# ---------------------------------------------------------------------------
# The open strip at the forecourt's west end: a lattice pylon, palms, and
# the cable bundles it carries to the block, the wing and across the street
# (Fn9gKhU_2_Q@24).
# ---------------------------------------------------------------------------
PYLON = (-45.6, -736.6)
tips = pylon(PYLON[0], PYLON[1], h=25.0)
P.place("planter_palm", -46.4, G0, -742.2)
P.place("planter_palm", -44.6, G0, -733.4)
stand(-46.6, -740.6, 0.0, "sit", G0 + 0.7)
