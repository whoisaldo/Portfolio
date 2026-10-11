"""The Afterlife Block: the garage street's north end round AFTERLIFE, the rooftop and the garage.

A Watson street (BIBLE.md, "The Afterlife Block"): bars and clinics under
rust awnings, small sparse signs, cable bundles slung across at third-floor
height, a skybridge, bollards and white light bars along the kerb. The set
pieces the page stands on (the rooftop, AFTERLIFE's block and MILITECH in
rooftop.py, the garage and its neighbours in garage.py) stay where they
are; this module builds the street round them: the lots that close its
ends, the low bar on the lane's corner, the lanes and yards behind both
rows, the outer row that hands over to the far city, and everything a
walker passes between the boulevard and the garage. All of it is keyed
"afterlife", so it streams in its pack.

The plan, west of the street (lot line x 428) from the boulevard south:
  W1a  x 380..398, z -316..-300   flats on the boulevard
  alley x 398..402                 and the lane behind AFTERLIFE's block
  W1b  x 402..428, z -316..-300   the corner house, four storeys
  AFTERLIFE's block (rooftop.py)   x 402..432, z -300..-262
  WBa, WBb x 380..398              the back row on the lane
  lane  z -262..-258               from the street to the back lane
  the bar x 416..428, z -258..-250 two storeys on the lane's corner
  the garage's west block and MILITECH (garage.py, rooftop.py)
and east of it (lot line x 452):
  E1a  x 452..508, z -344..-316   the block that closes the boulevard
  passage z -316..-312             covered, through to the back lane
  E1b  x 454..484, z -312..-300   a clinic, three storeys, behind a forecourt
  the rooftop's building, the garage row (rooftop.py, garage.py)
  back lane x 484..490, yard x 476..490 behind the garage row
  O1..O6 x 490..508                the outer row, backs to the far city
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P  # noqa: F401
from ncw.districts import afterlife_kit as K

D = "afterlife"
SX = 440.0                  # the garage street's centre line
WL, EL = 428.0, 452.0       # its lot lines
WK, EK = 432.0, 448.0       # its kerbs' faces
G0 = B.G0

# What an ordinary block is like here: grey-blue concrete, small windows,
# air conditioners and pipes on every wall, few signs and small ones.
WATSON = dict(windows=(0, 1, 3, 6, 6), lit=(0.35, 0.8), warmth=(0.35, 1.0),
              tints=("concrete", "charcoal", "navy", "teal", "concrete", "brown"),
              balcony=0.12, balcony_glass=0.1, ac=0.4, pipes=0.8, fire_escape=0.45, awning=0.0, shop_sign=0.5,
              signs=0.55, canopy=0.0, cornice=0.5, roof_cap=6.0, roof_sign=0.3, setback=0.0, ledge_every=(1, 1, 2),
              shop_colours=["amber", "pink", "cyan", "green", "red", "white"])


def lot(x0, x1, z0, z1, h, seed, sides, nb=None, style=None, **kw):
    return B.building(B.Lot(x0, x1, z0, z1, "+x", sides, nb or {}, D), h, random.Random(seed),
                      style=dict(WATSON, **(style or {})), **kw)


F = SHOP_H + CELL_H  # a storey over the shops: heights are SHOP_H + n storeys


def storeys(n):
    return SHOP_H + n * CELL_H


# ---------------------------------------------------------------------------
# West of the street.
# ---------------------------------------------------------------------------
lot(380.0, 398.0, -316.0, -300.0, storeys(6), 9101, {"-z": "street", "+z": "party", "-x": "back", "+x": "open"},
    {"+z": storeys(5)}, tint="navy")
lot(402.0, 428.0, -316.0, -300.0, storeys(3), 9102, {"-z": "street", "+x": "street", "-x": "open", "+z": "party"},
    {"+z": 30.0}, tint="concrete", style=dict(roof_cap=3.0))
lot(380.0, 398.0, -300.0, -276.0, storeys(5), 9103, {"+x": "open", "-x": "back", "-z": "party", "+z": "party"},
    {"-z": storeys(6), "+z": storeys(3)}, tint="teal")
lot(380.0, 398.0, -276.0, -250.0, storeys(3), 9104, {"+x": "open", "-x": "back", "-z": "party", "+z": "party"},
    {"-z": storeys(5), "+z": 46.0}, tint="brown")
# The bar on the lane's corner: two storeys between AFTERLIFE's thirty
# metres and the garage's west block.
lot(416.0, 428.0, -258.0, -250.0, storeys(1), 9105, {"+x": "street", "-z": "open", "-x": "open", "+z": "party"},
    {"+z": 26.0}, tint="charcoal", signs=False, style=dict(shop_sign=0.0, balcony=0.0, fire_escape=0.0, roof_cap=2.6, ac=0.6))

# The lanes and the yard behind the west row, paved.
B.ground_rect(D, 398.0, 402.0, -316.0, -258.0, mat="concrete")       # the alley and the back lane
B.ground_rect(D, 402.0, WL, -262.0, -258.0, mat="concrete")          # the lane to the street
B.ground_rect(D, 398.0, 416.0, -258.0, -250.0, mat="concrete")       # the bar's yard

# ---------------------------------------------------------------------------
# East of the street.
# ---------------------------------------------------------------------------
# The block that closes the boulevard's east end, on the boulevard's north
# lot line carried east; its east half lower.
lot(452.0, 484.0, -344.0, -316.0, storeys(7), 9110, {"-x": "street", "-z": "back", "+z": "open", "+x": "party"},
    {"+x": storeys(5)}, tint="charcoal")
lot(484.0, 508.0, -344.0, -316.0, storeys(5), 9111, {"-x": "party", "-z": "back", "+z": "open", "+x": "back"},
    {"-x": storeys(7)}, tint="navy")
# A clinic, three storeys, between it and the rooftop's building; the
# covered passage runs between the two.
# (Set back two metres from the lot line: a forecourt with the street's one
# tree in it.)
lot(454.0, 484.0, -312.0, -300.0, storeys(2), 9112, {"-x": "street", "-z": "open", "+z": "party", "+x": "open"},
    {"+z": 34.0}, tint="concrete", style=dict(roof_cap=3.0))
B.ground_rect(D, EL, 454.0, -312.0, -300.0)
B.ground_rect(D, EL, 484.0, -316.0, -312.0, mat="concrete")          # the passage
B.ground_rect(D, 484.0, 490.0, -316.0, -258.0, mat="concrete")       # the back lane
B.ground_rect(D, 476.0, 490.0, -258.0, -176.0, mat="concrete")       # the yard behind the garage row
# The outer row, its fronts on the back lane and the yard, its backs to the
# far city. Low by the garage's roof, where Contact looks out over it.
OUTER = [(-316.0, -292.0, 4), (-292.0, -272.0, 2), (-272.0, -248.0, 6), (-248.0, -226.0, 2), (-226.0, -204.0, 4), (-204.0, -176.0, 1)]
for i, (z0, z1, n) in enumerate(OUTER):
    nb = {}
    if i > 0:
        nb["-z"] = storeys(OUTER[i - 1][2])
    else:
        nb["-z"] = storeys(5)
    if i < len(OUTER) - 1:
        nb["+z"] = storeys(OUTER[i + 1][2])
    lot(490.0, 508.0, z0, z1, storeys(n), 9120 + i,
        {"-x": "open", "+x": "back", "-z": "party", "+z": "party" if i < len(OUTER) - 1 else "open"}, nb,
        style=dict(roof_cap=5.0 if n > 1 else 2.4))


# ---------------------------------------------------------------------------
# AFTERLIFE. The club is the ground floor of its block, behind the arcade
# the upper storeys make over the pavement: a recessed door under the name
# (the roof sign's own face again, over the door as a canopy,
# BnnbP7pCIvQ@24), ribbed dark walls with thin cyan strips either side, a
# bay along the wall where the queue stands behind its rope, the doorman's
# light, posters down the flank.
# ---------------------------------------------------------------------------
AF = B.Face("+x", WL, -300.0, -262.0)     # s runs north from the block's south end
DOOR_S = 19.0                              # under the roof sign's middle (z -281)
DARK = B.DARK_TRIM
rc = random.Random(9200)
B.ground_rect(D, 425.6, WL, -300.0, -262.0)
# The flank south of the door, a niche in it for the vending machines.
K.fbox(AF, (D, "concrete", 0), 0.0, 3.0, 0.0, SHOP_H, -2.4, 0.0, scale=1.5)
K.fbox(AF, (D, "concrete", 0), 3.0, 5.8, 0.0, SHOP_H, -2.4, -1.05, scale=1.5)
K.fbox(AF, (D, "concrete", 0), 3.0, 5.8, 2.35, SHOP_H, -1.05, 0.0, scale=1.5, bottom=True)
K.fbox(AF, (D, "concrete", 0), 5.8, 15.5, 0.0, SHOP_H, -2.4, 0.0, scale=1.5)
for k, sv in enumerate((3.75, 5.0)):
    vx, _, vz = AF.p(AF.at(sv), 0.0, -0.62)
    P.place("vending" if k == 0 else "vending_warm", vx, G0, vz, AF.yaw, district=D)
AF.quad((D, "door", 0), 0.95, 2.05, G0, 2.3, 0.03)
AF.box((D, "metal", 1), 0.87, 2.13, 2.3, 2.4, 0.0, 0.12)
K.wall_lamp(D, AF, 1.5, 2.75, "amber", 2.5)
AF.quad((D, "trim", 1), 5.8, 15.5, G0, 1.05, 0.012, col=K.BLACK)
for sv in (7.6, 10.4, 13.2):
    K.poster(D, AF, sv, 2.35, 1.6, 2.2, rc)
    AF.box((D, "glow", 1), sv - 0.7, sv + 0.7, 3.55, 3.6, 0.0, 0.16, col=GLOW["white"])
# The door's piers, a strip of cyan up each, and the recess between them:
# its ceiling a lit panel, the doors at the back, one leaf open on the
# green light inside.
for s0 in (15.5, 21.7):
    K.fbox(AF, (D, "trim", 0), s0, s0 + 0.8, 0.0, SHOP_H, -2.4, 0.14, col=DARK)
    K.fbox(AF, (D, "neon_cyan", 0), s0 + 0.36, s0 + 0.44, 0.4, 3.95, 0.14, 0.17)
for s0, s1 in ((16.3, 16.33), (21.67, 21.7)):
    for w0 in (-1.9, -1.0):
        K.fbox(AF, (D, "neon_cyan", 0), s0, s1, 0.4, 3.3, w0, w0 + 0.07)
K.fbox(AF, (D, "trim", 0), 16.3, 21.7, 3.5, SHOP_H, -2.4, 0.14, col=DARK, bottom=True)
zs, zn = AF.at(16.5), AF.at(21.5)
K.ceiling((D, "glow", 0), 425.8, 427.9, zn, zs, 3.49, col=(1.0, 0.42, 0.68, 1.0))
box((D, "neon_pink", 0), 425.7, 428.0, 3.42, 3.5, zn - 0.08, zn, scale=1.0)
box((D, "neon_pink", 0), 425.7, 428.0, 3.42, 3.5, zs, zs + 0.08, scale=1.0)
light(D, 427.0, 3.0, AF.at(DOOR_S), "pink", 5.0)
K.ribs(D, AF, 16.3, 17.7, G0, 3.5, -2.4, step=0.35, strips=(2,))
K.ribs(D, AF, 20.3, 21.7, G0, 3.5, -2.4, step=0.35, strips=(2,))
AF.box((D, "metal", 1), 17.7, 20.3, G0, 2.9, -2.4, -2.3)
AF.quad((D, "door", 0), 17.82, 19.0, G0, 2.75, -2.28)
AF.quad((D, "neon_green", 0), 19.0, 20.18, G0, 2.75, -2.28)
AF.box((D, "neon_pink", 0), 17.82, 20.18, 2.95, 3.05, -2.4, -2.32)
light(D, 427.2, 1.2, AF.at(19.6), "green", 4.0)
# A carpet from the door out across the pavement.
ca, cb = AF.at(18.0), AF.at(20.0)
quad((D, "trim", 1), (425.75, G0 + 0.009, ca), (429.3, G0 + 0.009, ca), (429.3, G0 + 0.009, cb), (425.75, G0 + 0.009, cb), col=K.ROPE)
# The doorman's stand and his light.
dx_, _, dz_ = AF.p(AF.at(16.75), 0.0, -0.35)
box((D, "trim", 1), dx_ - 0.22, dx_ + 0.22, G0, G0 + 1.1, dz_ - 0.18, dz_ + 0.18, scale=1.0, col=K.BLACK)
box((D, "glow", 1), dx_ - 0.2, dx_ + 0.2, G0 + 1.1, G0 + 1.13, dz_ - 0.16, dz_ + 0.16, scale=1.0, col=GLOW["white"])
K.downlight(D, 427.6, AF.at(17.0), 3.49, "white", size=0.3, power=3.0)
# The queue's bay: the wall set back, ribbed, strips of cyan let into it,
# and the rope along the lot line.
K.fbox(AF, (D, "concrete", 0), 22.5, 34.5, 0.0, SHOP_H, -2.4, -1.4, scale=1.5)
K.ribs(D, AF, 22.5, 34.5, G0, 4.05, -1.4, step=0.75, strips=(3, 8, 13))
K.stanchions(D, [(WL + 0.12, AF.at(sv)) for sv in (22.9, 25.1, 27.3, 29.5, 31.7, 33.9)])
K.fbox(AF, (D, "concrete", 0), 34.5, 38.0, 0.0, SHOP_H, -2.4, 0.0, scale=1.5)
K.poster(D, AF, 36.3, 2.35, 1.6, 2.2, rc)
K.wall_lamp(D, AF, 34.9, 3.2, "pink", 2.0)
# The beam the upper storeys' front wall stands on, along the lot line.
K.fbox(AF, (D, "trim", 0), 15.5, 34.5, 4.05, SHOP_H, -0.18, 0.18, col=DARK, bottom=True)
K.fbox(AF, (D, "trim", 0), 3.0, 5.8, 4.05, SHOP_H, -0.18, 0.18, col=DARK, bottom=True)
# The arcade: its soffit, the downstand along its edge with a line of the
# sign's pink the length of the block, struts back to the wall, lights let
# into the soffit and two pink tubes over the door.
K.ceiling((D, "concrete", 0), 425.6, WK, -300.0, -262.0, SHOP_H - 0.004)
box((D, "trim", 0), WK - 0.12, WK + 0.1, 4.15, SHOP_H + 0.02, -300.0, -262.0, scale=1.0, col=DARK, bottom=True)
box((D, "neon_pink", 0), WK + 0.1, WK + 0.14, 4.2, 4.28, -299.7, -262.3, scale=1.0)
for sv in (0.3, 6.7, 13.0, 15.9, 22.1, 34.7, 37.7):
    a_ = AF.p(AF.at(sv), 2.9, 0.15 if 15 < sv < 23 else 0.02)
    pipe((D, "metal", 0), a_, (WK - 0.15, 4.45, a_[2]), 0.07, segs=5)
for k in range(10):
    sv = 1.9 + 3.8 * k
    if not 14.0 < sv < 24.0:
        K.downlight(D, 430.0, AF.at(sv), SHOP_H - 0.01, "amber" if k % 3 else "white", power=1.6)
for x_ in (429.3, 431.0):
    K.tube(D, (x_, 4.42, AF.at(13.8)), (x_, 4.42, AF.at(24.2)), "pink", power=3.2)
# The name over the door: a canopy's edge standing out from the wall, the
# sign on its face, its underside lit.
box((D, "board_frame", 0), WK, WK + 0.5, 4.72, 6.98, -286.0, -276.0, scale=1.0, bottom=True)
sign("afterlife_b", WK + 0.52, 5.85, -281.0, 8.67, 2.0, math.pi / 2, preview="AFTERLIFE", district=D)
box((D, "neon_pink", 0), WK + 0.06, WK + 0.44, 4.66, 4.72, -285.9, -276.1, scale=1.0)
# The queue, the doorman and a second on the door.
QUEUE = [(23.3, "idle", 0.0), (24.3, "phone", 0.2), (25.4, "talk", 0.0), (26.2, "talk", math.pi), (27.4, "idle", -0.2),
         (28.5, "smoke", 0.4), (29.6, "phone", 0.0), (30.7, "talk", 0.0), (31.5, "talk", math.pi), (32.7, "idle", 0.1)]
for sv, pose, turn in QUEUE:
    qx, _, qz = AF.p(AF.at(sv), 0.0, -0.6)
    stand(qx, qz, turn, pose, y=G0)
for sv in (26.9, 30.1):
    qx, _, qz = AF.p(AF.at(sv), 0.0, -1.12)
    stand(qx, qz, math.pi / 2, "lean", y=G0)
stand(*[AF.p(AF.at(17.05), 0.0, -0.75)[i] for i in (0, 2)], math.pi / 2, "idle", y=G0)
stand(*[AF.p(AF.at(21.0), 0.0, -0.9)[i] for i in (0, 2)], math.pi / 2 - 0.5, "idle", y=G0)
