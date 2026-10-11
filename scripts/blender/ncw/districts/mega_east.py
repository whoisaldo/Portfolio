"""East of the canyon, behind its east row (x 44..132, z -700..-560): the
megabuilding's back blocks, and the station the viaduct runs into.

Nobody drives here: it is seen from the megabuilding's decks and roofs, from
flying cars, and by whoever walks its lanes. So it is built for those: blocks
of very different heights with crowns and lit roof edges, boards on the
roofs at their own angles, lanes with lamps, doors, cables and skips, a
court with hoops under floodlights, a row of shops under the viaduct's
deck, and at its east end the NCART station: a hall the line runs into
through a lit portal, its name over it.

The viaduct itself (mega.py) is the hero's; here are its piers east of the
canyon, the portal collars where it leaves the canyon's back walls, and its
west end at Japantown's lot line.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_face import dress, sign_column, hero_hidden
from ncw.districts.mega_roofs import flat_strokes
from ncw.districts.mega_wings import mast

X0, X1, Z0, Z1 = 44.0, 132.0, -700.0, -560.0
B.ground_rect(D, X0, X1, Z0, Z1)
B.ground_rect(D, X0, 52.0, ST_S, Z0)                      # the lane's mouth on the megabuilding street
_r = random.Random(8601)
PAL = ["pink", "amber", "cyan", "red", "teal", "magenta", "purple"]


def roof_board(cx, cz, top, w, h, yaw, seed, lift=2.6):
    """A billboard on a roof on a steel frame, turned whichever way it likes."""
    r = random.Random(seed)
    B.billboard(D, cx, top + lift + h / 2, cz, w, h, yaw, r)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    for du in (-w * 0.38, w * 0.38):
        px, pz = cx + rx * du - nx * 0.2, cz + rz * du - nz * 0.2
        box((D, "metal", 1), px - 0.11, px + 0.11, top, top + lift, pz - 0.11, pz + 0.11, scale=0.5)
        # A raking strut behind each leg.
        pipe((D, "metal", 1), (px, top + lift + h * 0.6, pz), (px - nx * 2.2, top, pz - nz * 2.2), 0.05, segs=4)


def block(x0, x1, z0, z1, top, seed, tint=None, window=None, crown=None, dressed=("+z", "-x"), rim=None, cap=6.0, sign_rate=0.6,
          board=None):
    """A back block: windows all round over a back's ground floor (doors,
    lamps, skips), two faces dressed in decks and balconies, the others in
    ledges and units, a crown on some, a roof that is used."""
    r = random.Random(seed)
    tint = r.choice((5, 0, 1, 2, 3, 5)) if tint is None else tint
    window = r.choice((0, 6, 3, 1, 0, 5)) if window is None else window
    col = B.wall_col(r.uniform(0.5, 0.85), window, r.uniform(0.4, 1.0), tint)
    fs = shell(x0, x1, z0, z1, 0.0, top, col, seed,
               spans={"+z": [(x0, x1, SHOP_H)], "-z": [(x0, x1, SHOP_H)], "+x": [(z0, z1, SHOP_H)], "-x": [(z0, z1, SHOP_H)]})
    for i, (name, f) in enumerate(fs.items()):
        B.back_ground(D, f, random.Random(seed * 7 + i), B.TRIM[tint])
        if name in dressed:
            dress(f, top, 2, seed * 11 + i, [], people_rate=0.12, weights=(0.25, 0.4, 0.35))
        else:
            dress(f, top, 2, seed * 11 + i, [], people_rate=0.0, weights=(0.0, 0.12, 0.88))
    parapet(x0, x1, z0, z1, top, rim=rim, col=B.TRIM[tint])
    if crown:
        cx0, cx1, cz0, cz1, ctop = crown
        shell(cx0, cx1, cz0, cz1, top, ctop, B.wall_col(r.uniform(0.6, 0.9), r.choice((5, 5, 2, 0)), r.uniform(0.3, 0.9), tint), seed + 3)
        parapet(cx0, cx1, cz0, cz1, ctop, rim=r.choice(("cyan", "pink", "amber", "magenta")), col=B.TRIM[tint])
        B.roof_dress(D, cx0, cx1, cz0, cz1, ctop, random.Random(seed + 5), cap=cap, parapet=False, sign_rate=sign_rate, tint=tint)
        for (a0, a1, b0, b1) in ((x0, x1, cz1, z1), (x0, x1, z0, cz0), (x0, cx0, cz0, cz1), (cx1, x1, cz0, cz1)):
            if a1 - a0 > 3.0 and b1 - b0 > 3.0:
                B.roof_dress(D, a0, a1, b0, b1, top, random.Random(seed + int(a0 + b0)), cap=3.0, parapet=False, sign_rate=0.0, tint=tint)
    elif board:
        roof_board(*board)
        B.roof_dress(D, x0, x1, z0, z1, top, random.Random(seed + 5), cap=2.6, parapet=False, sign_rate=0.0, tint=tint)
    else:
        B.roof_dress(D, x0, x1, z0, z1, top, random.Random(seed + 5), cap=cap, parapet=False, sign_rate=sign_rate, tint=tint)
    return fs


# ---------------------------------------------------------------------------
# The blocks. North of the viaduct, then south of it down to ARASAKA's.
# ---------------------------------------------------------------------------
b1 = block(68.0, 90.0, -692.0, -664.0, floor_y(13), 8611, tint=5, window=6, dressed=("-z", "-x", "+z"), rim="cyan",
           board=(79.0, -678.0, floor_y(13), 13.0, 6.0, math.radians(200), 8612))
b2 = block(96.0, 128.0, -692.0, -660.0, floor_y(8), 8613, tint=1, window=5, crown=(102.0, 122.0, -686.0, -666.0, floor_y(15)), dressed=("-z", "-x"), rim="amber")
b3 = block(52.0, 64.0, -676.0, -640.0, floor_y(7), 8614, tint=3, window=0, dressed=("-x", "+x"), rim="pink",
           board=(58.0, -658.0, floor_y(7), 9.0, 5.0, math.radians(-70), 8615))
b4 = block(70.0, 92.0, -658.0, -630.0, floor_y(18), 8616, tint=0, window=0, crown=(74.0, 88.0, -654.0, -634.0, floor_y(21)), dressed=("+z", "-x", "+x"), rim="magenta")
b5 = block(98.0, 128.0, -654.0, -630.0, floor_y(5), 8617, tint=6, window=3, dressed=("+z", "-x"), rim="amber",
           board=(113.0, -642.0, floor_y(5), 16.0, 7.0, math.radians(160), 8618))
b6 = block(52.0, 76.0, -594.0, -564.0, floor_y(11), 8619, tint=2, window=6, dressed=("-z", "+x", "-x"), rim="cyan",
           board=(64.0, -579.0, floor_y(11), 12.0, 5.6, math.radians(35), 8620))
b7 = block(82.0, 104.0, -590.0, -564.0, floor_y(16), 8621, tint=5, window=0, crown=(86.0, 100.0, -586.0, -568.0, floor_y(20)), dressed=("-z", "-x", "+x"), rim="pink")
b8 = block(110.0, 130.0, -590.0, -562.0, floor_y(6), 8622, tint=4, window=1, dressed=("-z", "-x"), rim="amber",
           board=(120.0, -576.0, floor_y(6), 11.0, 5.2, math.radians(-150), 8623))
mast(81.0, -644.0, floor_y(21), 14.0)
mast(93.0, -577.0, floor_y(20), 10.0, hue="amber")
# A skybridge between the two tall ones' neighbours, and one over the lane.
bridge(90.0, 96.0, -680.0, -676.0, floor_y(6), floor_y(7), "pink")
bridge(64.0, 70.0, -652.0, -648.0, floor_y(5), floor_y(6), "cyan")
bridge(76.0, 82.0, -582.0, -578.0, floor_y(8), floor_y(9), "amber")
# Columns of signs on the corners people come round.
sign_column(51.4, -676.6, (8.6, 13.4, 18.6), ("bm", "bl", "bl"), [math.pi + a for a in (0.3, -0.25, 0.2)])
sign_column(67.4, -664.6, (9.0, 14.0, 19.4, 24.6), ("bl", "bm", "bl", "bx"), [math.pi / 2 + a for a in (-0.3, 0.2, -0.15, 0.3)])
sign_column(92.6, -629.4, (8.8, 13.6, 18.8), ("bl", "bl", "bm"), [a for a in (0.25, -0.3, 0.2)])
sign_column(76.6, -594.6, (9.4, 14.2), ("bl", "bm"), [math.pi + a for a in (-0.2, 0.3)])
sign_column(109.4, -590.6, (7.6, 12.2), ("bm", "bl"), [math.pi / 2 + a for a in (0.2, -0.25)])

# ---------------------------------------------------------------------------
# The court between the blocks (x 52..68, z -640..-626): hoops under
# floodlights, a fence, benches, people playing and watching.
# ---------------------------------------------------------------------------
CX0, CX1, CZ0, CZ1 = 53.0, 67.0, -639.0, -627.0
hquad((D, "trim", 0), CX0, CX1, CZ0, CZ1, G0 + 0.01, col=(0.09, 0.2, 0.2, 1.0), scale=1.0)
mx, mz = (CX0 + CX1) / 2, (CZ0 + CZ1) / 2
flat_strokes([((CX0, CZ0), (CX1, CZ0)), ((CX1, CZ0), (CX1, CZ1)), ((CX1, CZ1), (CX0, CZ1)), ((CX0, CZ1), (CX0, CZ0)), ((mx, CZ0), (mx, CZ1))],
             G0 + 0.02, PALE, w=0.12)
ring = [(mx + math.cos(i * math.tau / 12) * 1.8, mz + math.sin(i * math.tau / 12) * 1.8) for i in range(12)]
flat_strokes(list(zip(ring, ring[1:] + ring[:1])), G0 + 0.02, PALE, w=0.12)
for s in (-1, 1):
    hx = mx + s * 6.4
    box((D, "metal", 1), hx - 0.07, hx + 0.07, G0, G0 + 3.3, mz - 0.07, mz + 0.07, scale=0.5)
    tbox(hx - s * 0.6 - 0.04, hx - s * 0.6 + 0.04, G0 + 2.7, G0 + 3.7, mz - 0.9, mz + 0.9, PALE)
    box((D, "metal", 1), min(hx, hx - s * 0.6), max(hx, hx - s * 0.6), G0 + 3.2, G0 + 3.3, mz - 0.04, mz + 0.04, scale=0.5)
    box((D, "glow", 1), hx - s * 1.05 - 0.22, hx - s * 1.05 + 0.22, G0 + 3.0, G0 + 3.04, mz - 0.22, mz + 0.22, scale=0.5, col=dim(GLOW["amber"], 0.6))
    flat_strokes([((hx - s * 0.8, mz - 2.4), (hx - s * 4.2, mz - 2.4)), ((hx - s * 4.2, mz - 2.4), (hx - s * 4.2, mz + 2.4)),
                  ((hx - s * 4.2, mz + 2.4), (hx - s * 0.8, mz + 2.4))], G0 + 0.02, PALE, w=0.12)
for (x, z, yaw) in ((CX0 - 0.6, CZ1 + 0.4, math.radians(135)), (CX1 + 0.6, CZ0 - 0.4, math.radians(-45))):
    P.place("lamp_sodium", x, G0, z, yaw)
    light(D, x + math.sin(yaw) * 2.0, 6.5, z + math.cos(yaw) * 2.0, "white", 4.0)
light(D, mx, 5.0, mz, "white", 3.0)
for (a, b) in (((CX0 - 0.8, CZ0 - 0.8), (CX1 + 0.8, CZ0 - 0.8)), ((CX0 - 0.8, CZ1 + 0.8), (CX1 - 3.0, CZ1 + 0.8))):
    steel_rail(a, b, G0, h=3.2, posts=2.8)
for (x, z, yaw, pose) in ((57.0, -634.2, 1.2, "idle"), (58.6, -632.0, -2.0, "idle"), (61.8, -633.8, -1.0, "idle"), (63.4, -631.2, 2.4, "idle"),
                          (60.2, -636.6, 0.2, "idle"), (65.4, -635.0, -1.6, "idle")):
    stand(x, z, yaw, pose, G0)
P.place("bench", 55.4, G0, CZ1 + 1.6, math.pi)
P.place("bench", 59.4, G0, CZ1 + 1.6, math.pi)
for x in (55.1, 55.8, 59.4):
    stand(x, CZ1 + 1.6, math.pi, "sit", G0 + 0.48)
talkers(63.6, CZ1 + 1.8, G0, n=3, turn=0.4)
stand(67.6, -629.0, -math.pi / 2, "lean", G0)
stand(66.4, CZ0 - 1.2, 0.0, "smoke", G0)

# ---------------------------------------------------------------------------
# Under the viaduct: its piers east of the canyon, a row of shops between
# them under the deck, pipes and cables under it, lanterns along the fronts.
# ---------------------------------------------------------------------------
for px in (66.0, 80.0):
    cbox(px - 1.2, px + 1.2, 0.0, RAIL_UNDER, RAIL_Z - 2.2, RAIL_Z + 2.2)
    tbox(px - 1.24, px + 1.24, 0.5, 1.0, RAIL_Z - 2.24, RAIL_Z + 2.24, YEL_OLD, detail=1)
    for i in range(4):
        P.place("warning_tri", px, 2.4 + i * 0.95, RAIL_Z + 2.24, 0.0)
tbox(50.56, 53.44, 0.5, 1.0, RAIL_Z - 2.24, RAIL_Z + 2.24, YEL_OLD, detail=1)
UNITS = ((54.2, 64.4), (67.6, 78.4), (81.6, 89.2))
for i, (ua, ub) in enumerate(UNITS):
    r = random.Random(8640 + i)
    tint = (5, 0, 3)[i]
    tbox(ua, ub, 0.0, SHOP_H, RAIL_Z - 2.3, RAIL_Z + 2.3, B.TRIM[tint])
    tbox(ua - 0.15, ub + 0.15, SHOP_H, SHOP_H + 0.2, RAIL_Z - 2.95, RAIL_Z + 2.95, BLACK, bottom=True)
    for f in (face("+z", RAIL_Z + 2.6, ua, ub), face("-z", RAIL_Z - 2.6, ua, ub)):
        B.shopfront(D, f, r, 0.0, f.width, tint, sign_rate=1.0, awning_rate=0.5, door=False, palette=PAL)
        n = int(f.width // 1.7)
        for k in range(n):
            px_, _, pz_ = f.p(f.at(0.8 + k * (f.width - 1.6) / max(1, n - 1)), 0.0, 0.9)
            P.place("lantern", px_, 3.05, pz_)
    # What stands on a unit's roof under the deck: units, a tank, a sign.
    P.place("ac_roof", ua + 1.4, SHOP_H + 0.2, RAIL_Z - 1.2)
    P.place("ac_roof", ub - 1.6, SHOP_H + 0.2, RAIL_Z + 1.0)
    angled_sign((ua + ub) / 2, 6.4, RAIL_Z + 2.7, "pm", r.uniform(-0.25, 0.25))
    angled_sign((ua + ub) / 2 + 1.5, 6.2, RAIL_Z - 2.7, "bx", math.pi + r.uniform(-0.3, 0.3))
    for (x, dz, yaw, pose) in ((ua + 1.6, 3.6, math.pi, "idle"), (ua + 4.2, 3.9, math.pi, "phone"), (ub - 1.8, -3.7, 0.0, "idle"), (ub - 4.0, -3.5, 0.0, "talk"),
                               (ub - 4.9, -4.2, 2.6, "talk")):
        stand(x, RAIL_Z + dz, yaw, pose, G0)
rpipe((53.6, RAIL_UNDER - 0.35, RAIL_Z - 1.6), (89.6, RAIL_UNDER - 0.35, RAIL_Z - 1.6), 0.16)
rpipe((53.6, RAIL_UNDER - 0.3, RAIL_Z + 1.4), (89.6, RAIL_UNDER - 0.3, RAIL_Z + 1.4), 0.1, col=STEEL)
for x in (59.0, 73.0, 86.0):
    for dz in (-3.0, 3.0):
        box((D, "glow", 0), x - 0.16, x + 0.16, RAIL_UNDER - 0.3, RAIL_UNDER - 0.08, RAIL_Z + dz - 0.16, RAIL_Z + dz + 0.16, scale=0.5, col=GLOW["amber"], bottom=True)
        light(D, x, 8.0, RAIL_Z + dz * 1.6, "amber", 3.4)
stall(60.0, RAIL_Z + 7.6, math.pi, "amber", "amber", seed=8651)
stall(74.0, RAIL_Z - 8.0, 0.0, "pink", "cyan", seed=8652)
stall(84.0, RAIL_Z + 7.4, math.pi, "cyan", "white", seed=8653)
empty("anchor_steam_mega_5", (74.4, 1.3, RAIL_Z - 8.6))
P.place("bench", 66.0, G0, RAIL_Z + 6.0, 0.0)
P.place("bin", 79.0, G0, RAIL_Z + 5.6)
P.place("bags", 65.0, G0, RAIL_Z - 2.9, math.pi)
P.place("crates", 80.6, G0, RAIL_Z - 3.1, math.pi)
talkers(70.0, RAIL_Z + 6.4, G0, n=3, turn=0.2)
stand(66.0, RAIL_Z + 6.0, 0.0, "sit", G0 + 0.48)
stand(79.6, RAIL_Z - 4.8, 0.6, "squat", G0)
# The portal collars where the deck leaves the canyon's back walls (both
# sides), and the dark mouths the train runs out of.
for s in (-1, 1):
    xw = s * 44.0
    xa, xb = sorted((xw, xw + s * 0.9))
    for (z0, z1, y0, y1) in ((RAIL_Z - 5.4, RAIL_Z - 4.3, RAIL_UNDER - 1.2, RAIL_TOP + 6.6), (RAIL_Z + 4.3, RAIL_Z + 5.4, RAIL_UNDER - 1.2, RAIL_TOP + 6.6),
                             (RAIL_Z - 5.4, RAIL_Z + 5.4, RAIL_TOP + 5.6, RAIL_TOP + 6.8)):
        cbox(xa, xb, y0, y1, z0, z1, bottom=True)
    tbox(min(xw, xw + s * 0.06), max(xw, xw + s * 0.06), RAIL_TOP, RAIL_TOP + 5.6, RAIL_Z - 4.3, RAIL_Z + 4.3, BLACK)
    tbox(min(xw + s * 0.9, xw + s * 0.95), max(xw + s * 0.9, xw + s * 0.95), RAIL_TOP + 5.6, RAIL_TOP + 6.0, RAIL_Z - 5.4, RAIL_Z + 5.4, YEL)
    for dz in (-4.85, 4.85):
        box((D, "glow", 0), min(xw + s * 0.9, xw + s * 0.96), max(xw + s * 0.9, xw + s * 0.96), RAIL_TOP + 2.2, RAIL_TOP + 2.6, RAIL_Z + dz - 0.12, RAIL_Z + dz + 0.12,
            scale=0.5, col=GLOW["amber"])
# Its west end, at Japantown's lot line: the deck carried on to x -94 and a
# collar there (the far city's side of it is Japantown's row).
box((D, "dark", 0), -94.0, -90.0, RAIL_UNDER, RAIL_TOP, RAIL_Z - 3.5, RAIL_Z + 3.5, scale=3.0, bottom=True)
for (z0, z1, y0, y1) in ((RAIL_Z - 5.4, RAIL_Z - 4.3, RAIL_UNDER - 1.2, RAIL_TOP + 6.6), (RAIL_Z + 4.3, RAIL_Z + 5.4, RAIL_UNDER - 1.2, RAIL_TOP + 6.6),
                         (RAIL_Z - 5.4, RAIL_Z + 5.4, RAIL_TOP + 5.6, RAIL_TOP + 6.8)):
    cbox(-94.0, -93.1, y0, y1, z0, z1, bottom=True)
tbox(-94.0, -93.94, RAIL_TOP, RAIL_TOP + 5.6, RAIL_Z - 4.3, RAIL_Z + 4.3, BLACK)
tbox(-93.1, -93.05, RAIL_TOP + 5.6, RAIL_TOP + 6.0, RAIL_Z - 5.4, RAIL_Z + 5.4, YEL)

# ---------------------------------------------------------------------------
# The station: a hall the line runs into (x 90..132), glazed at the
# platforms' level, the portal lit, the name over it, a concourse under.
# ---------------------------------------------------------------------------
HX0, HX1, HZ0, HZ1, HTOP = 90.0, X1, -626.0, -594.0, 27.0
PLAT = RAIL_TOP                                            # 15.2: the platforms
assert hero_hidden(HX0 - 1.0, HX1, 0.0, HTOP + 8.0, HZ1)
shell(HX0, HX1, HZ0, HZ1, 0.0, HTOP, B.wall_col(0.95, 4, 0.2, 2), 8661,
      spans={"+z": [(HX0, HX1, PLAT)], "-z": [(HX0, HX1, PLAT)], "+x": [(HZ0, HZ1, PLAT)],
             "-x": [(HZ0, RAIL_Z - 4.6, PLAT), (RAIL_Z + 4.6, HZ1, PLAT)]})
# Its lower walls: orange, as the line's are, a band of concrete at the foot.
for (a, b) in (((HX0, HZ1), (HX1, HZ1)), ((HX1, HZ1), (HX1, HZ0)), ((HX1, HZ0), (HX0, HZ0))):
    vquad((D, "trim", 0), a, b, SHOP_H, PLAT, col=ORANGE)
    vquad((D, "concrete", 0), a, b, 0.0, SHOP_H)
for (z0, z1) in ((HZ0, RAIL_Z - 3.5), (RAIL_Z + 3.5, HZ1)):
    vquad((D, "trim", 0), (HX0, z0), (HX0, z1), SHOP_H, PLAT, col=ORANGE)
vquad((D, "trim", 0), (HX0, RAIL_Z - 3.5), (HX0, RAIL_Z + 3.5), SHOP_H, RAIL_UNDER, col=ORANGE)
# The portal: the hall's wall cut back round the track, dark inside, a lit
# strip of platform showing, amber lamps up its jambs.
PZ0, PZ1, PY1 = RAIL_Z - 4.6, RAIL_Z + 4.6, PLAT + 6.4
vquad((D, "trim", 0), (HX0 + 2.5, PZ0), (HX0 + 2.5, PZ1), PLAT, PY1, col=BLACK)
vquad((D, "trim", 0), (HX0, PZ0), (HX0 + 2.5, PZ0), PLAT, PY1, col=BLUEGREY)
vquad((D, "trim", 0), (HX0 + 2.5, PZ1), (HX0, PZ1), PLAT, PY1, col=BLUEGREY)
hquad((D, "trim", 0), HX0, HX0 + 2.5, PZ0, PZ1, PY1, up=False, col=BLUEGREY)
hquad((D, "trim", 0), HX0, HX0 + 2.5, PZ0, PZ1, PLAT, col=BLACK)
vquad((D, "facade", 0), (HX0, PZ0), (HX0, PZ1), PY1, HTOP, col=B.wall_col(0.95, 4, 0.2, 2), uvs=((0, 0), (3, 0), (3, 1.6), (0, 1.6)))
for z in (PZ0 + 0.9, PZ1 - 0.9):
    rotated_quad((D, "glow", 0), HX0 + 2.46, PLAT + 1.6, z, 1.5, 1.0, -math.pi / 2, col=dim(GLOW["white"], 0.3))
for z in (PZ0 - 0.25, PZ1 + 0.25):
    box((D, "neon_amber", 0), HX0 - 0.1, HX0, PLAT + 0.4, PY1, z - 0.08, z + 0.08, scale=1.0)
tbox(HX0 - 0.12, HX0, PY1, PY1 + 0.45, PZ0 - 0.4, PZ1 + 0.4, YEL)
# The name, big, over the portal; a red strip under it.
box((D, "board_frame", 0), HX0 - 0.3, HX0, PY1 + 0.9, PY1 + 4.3, RAIL_Z - 9.5, RAIL_Z + 9.5, scale=1.0)
strokes((D, "glow", 0), "NCART", HX0 - 0.31, PY1 + 2.6, RAIL_Z, 2.3, -math.pi / 2, GLOW["cyan"], weight=0.17, gap=0.3)
box((D, "neon_red", 0), HX0 - 0.36, HX0 - 0.3, PY1 + 0.96, PY1 + 1.1, RAIL_Z - 9.2, RAIL_Z + 9.2, scale=1.0)
for (z, yaw) in ((HZ1 + 0.02, 0.0), (HZ0 - 0.02, math.pi)):
    strokes((D, "glow", 0), "NCART", 111.0, 12.0, z, 1.8, yaw, GLOW["cyan"], weight=0.17, gap=0.3)
    rotated_quad((D, "neon_red", 0), 111.0, 10.4, z, 16.0, 0.14, yaw)
# The concourse's doors on the west front, either side of the track's piers,
# under a canopy; the stair up inside is the hall's own business.
fH = face("-x", HX0, HZ0, HZ1)
vquad((D, "concrete", 0), (HX0, HZ0), (HX0, HZ1), 0.0, SHOP_H)
for (s0, s1) in ((1.6, 10.4), (21.6, 30.4)):
    fH.quad((D, "shop", 0), s0, s1, 0.55, 3.3, 0.03, col=(0.95, 0.3, 1.0, 1.0))
    fH.box((D, "trim", 0), s0 - 0.2, s1 + 0.2, 3.3, 3.7, 0.0, 0.2, col=BLACK)
    fH.box((D, "neon_cyan", 0), s0, s1, 3.72, 3.8, 0.0, 0.08)
    fbox(fH, (D, "trim", 0), s0 - 0.6, s1 + 0.6, 4.0, 4.3, 0.0, 2.6, col=BLUEGREY, bottom=True)
    for s in (s0 + 1.5, s1 - 1.5):
        px_, _, pz_ = fH.p(fH.at(s), 0.0, 1.6)
        stand(px_, pz_, -math.pi / 2 + (0.5 if s < 16 else -0.5), "idle" if s < 16 else "phone", G0)
P.place("food_box", HX0 - 1.0, G0, HZ0 + 12.4, -math.pi / 2)
P.place("food_box", HX0 - 1.0, G0, HZ1 - 12.0, -math.pi / 2)
P.place("vending", HX0 - 0.5, G0, HZ0 + 0.8, -math.pi / 2)
P.place("vending_warm", HX0 - 0.5, G0, HZ1 - 0.8, -math.pi / 2)
talkers(HX0 - 2.6, HZ0 + 6.0, G0, n=2, turn=0.3)
talkers(HX0 - 3.0, HZ1 - 6.4, G0, n=3, turn=1.0)
stand(HX0 - 0.6, HZ1 - 13.0, -math.pi / 2, "lean", G0)
# Its roof: a monitor of skylights down the middle, plant, a mast, the edge lit.
parapet(HX0, HX1, HZ0, HZ1, HTOP, rim="cyan", col=BLUEGREY)
tbox(HX0 + 4.0, HX1 - 4.0, HTOP, HTOP + 1.4, RAIL_Z - 3.4, RAIL_Z + 3.4, BLUEGREY)
for i in range(7):
    x = HX0 + 6.5 + i * 4.8
    hquad((D, "glow", 0), x, x + 3.2, RAIL_Z - 2.6, RAIL_Z + 2.6, HTOP + 1.42, col=dim(GLOW["cyan"], 0.12))
B.roof_dress(D, HX0, HX1, HZ0, RAIL_Z - 4.0, HTOP, random.Random(8662), cap=4.5, parapet=False, sign_rate=0.0, tint=1)
B.roof_dress(D, HX0, HX1, RAIL_Z + 4.0, HZ1, HTOP, random.Random(8663), cap=4.5, parapet=False, sign_rate=0.0, tint=1)
mast(HX1 - 4.0, HZ0 + 4.0, HTOP, 12.0)
light(D, HX0 - 3.0, 4.0, RAIL_Z - 9.0, "cyan", 3.2)
light(D, HX0 - 3.0, 4.0, RAIL_Z + 9.0, "cyan", 3.2)

# ---------------------------------------------------------------------------
# The district's east edge: a wall along x 132 with lamps on it, either
# side of the station.
# ---------------------------------------------------------------------------
for (z0, z1) in ((Z0, HZ0), (HZ1, Z1)):
    cbox(X1 - 0.3, X1, 0.0, 3.2, z0, z1)
    tbox(X1 - 0.36, X1 + 0.06, 3.2, 3.34, z0, z1, BLACK)
    z = z0 + 5.0
    while z < z1 - 3.0:
        wall_lamp(X1 - 0.3, 2.8, z, -1, 0, "amber", 2.8)
        z += 12.0

# ---------------------------------------------------------------------------
# The lanes: cables slung between the blocks, blades off the corners, vents,
# and the people a back lane has.
# ---------------------------------------------------------------------------
CABLES = (((52.0, 9.0, -690.0), (44.0, 11.0, -688.0)), ((52.0, 13.0, -664.0), (44.0, 12.0, -668.0)), ((52.0, 8.0, -648.0), (44.0, 9.5, -645.0)),
          ((64.0, 10.0, -670.0), (68.0, 12.0, -672.0)), ((64.0, 14.0, -660.0), (68.0, 11.0, -665.0)), ((90.0, 12.0, -684.0), (96.0, 10.0, -682.0)),
          ((90.0, 9.0, -668.0), (96.0, 13.0, -664.0)), ((80.0, 14.0, -664.0), (82.0, 12.0, -658.0)), ((92.0, 10.0, -646.0), (98.0, 9.0, -644.0)),
          ((92.0, 15.0, -636.0), (98.0, 12.0, -638.0)), ((52.0, 9.0, -586.0), (44.0, 10.5, -584.0)), ((52.0, 12.5, -570.0), (44.0, 11.0, -574.0)),
          ((76.0, 11.0, -586.0), (82.0, 9.0, -584.0)), ((76.0, 8.5, -570.0), (82.0, 12.0, -572.0)), ((104.0, 10.0, -584.0), (110.0, 9.0, -582.0)),
          ((104.0, 13.0, -570.0), (110.0, 11.0, -568.0)), ((64.0, 12.0, -700.0), (66.0, 9.0, -692.0)), ((100.0, 9.0, -700.0), (102.0, 11.0, -692.0)))
for a, b in CABLES:
    bundle(a, b, sag=_r.uniform(0.5, 1.4), n=_r.choice((1, 2, 3)))
for (x, z, size, yaw) in ((45.2, -700.0, "bm", 0.2), (51.2, -620.0, "bs", math.pi - 0.3), (45.0, -598.0, "bm", 0.15), (66.6, -696.0, "bx", math.pi / 2 + 0.2),
                          (93.4, -662.0, "bm", -0.2), (95.2, -650.0, "bs", math.pi / 2 - 0.3), (79.0, -596.4, "bm", math.pi + 0.25),
                          (106.6, -576.0, "bs", math.pi / 2 + 0.3), (130.6, -658.0, "bm", -math.pi / 2 + 0.2)):
    angled_sign(x, _r.uniform(5.2, 8.6), z, size, yaw)
for i, (x, z) in enumerate(((48.0, -660.0), (94.0, -672.0))):
    box((D, "metal", 1), x - 0.4, x + 0.4, G0, G0 + 0.06, z - 0.4, z + 0.4, scale=0.5)
    empty(f"anchor_steam_mega_{6 + i}", (x, 0.25, z))
for (x, z, yaw, pose) in ((46.0, -704.0, 0.0, "smoke"), (49.6, -690.0, -math.pi / 2, "lean"), (45.6, -676.0, math.pi / 2, "squat"), (48.0, -652.0, 0.4, "phone"),
                          (50.4, -636.0, -math.pi / 2, "lean"), (46.4, -602.0, math.pi / 2, "smoke"), (48.8, -580.0, 2.8, "idle"), (66.0, -678.0, math.pi / 2, "lean"),
                          (93.0, -676.0, -math.pi / 2, "smoke"), (94.6, -690.0, 0.6, "squat"), (80.0, -661.0, 0.0, "idle"), (96.0, -642.0, -math.pi / 2, "phone"),
                          (79.0, -580.0, math.pi / 2, "lean"), (107.0, -572.0, -math.pi / 2, "idle"), (118.0, -657.0, 0.0, "smoke"), (86.0, -695.6, math.pi, "idle"),
                          (112.0, -696.0, math.pi, "phone"), (60.0, -597.0, 0.0, "idle"), (120.0, -560.9, math.pi, "lean")):
    stand(x, z, yaw, pose, G0)
talkers(47.6, -666.0, G0, n=2, turn=0.3)
talkers(93.0, -655.0, G0, n=3, turn=0.8)
talkers(78.6, -562.0, G0, n=2, turn=0.1)
talkers(106.0, -657.0, G0, n=2, turn=1.3)
for (x, z, yaw) in ((47.0, -620.0, 0.0), (106.4, -640.0, math.pi / 2)):
    P.place("lamp_short", x, G0, z)
P.place("bollard", 45.2, G0, ST_S + 0.6)
P.place("bollard", 50.8, G0, ST_S + 0.6)
