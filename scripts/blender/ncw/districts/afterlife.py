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


def lot(x0, x1, z0, z1, h, seed, sides, nb=None, style=None, roof=False, **kw):
    """A building on a lot. Its roof is dressed further down, by hand (the
    roofs are seen from the rooftop and from the air): the generator's own
    draw only where `roof` asks."""
    return B.building(B.Lot(x0, x1, z0, z1, "+x", sides, nb or {}, D), h, random.Random(seed),
                      style=dict(WATSON, **(style or {})), roof=roof, **kw)


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

# ---------------------------------------------------------------------------
# The rooftop's building, from the street: its face (windows on the true
# floor lines, ledges, units, pipes, a fire escape), shops either side and
# RIPPERDOC's clinic in the middle, under the sign on the roof: white light
# in the glass, a green door, a cross on a bracket.
# ---------------------------------------------------------------------------
ST = dict(B.STYLE_DEFAULTS, **WATSON)
RB = B.Face("-x", EL, -300.0, -258.0)      # s runs south from its north end
rr = random.Random(9210)
RB_TINT = B.TINTS["teal"]
B.facade_wall((D, "facade", 0), RB, SHOP_H, 34.0, B.wall_col(0.55, 1, 0.6, RB_TINT), 7)
B.shopfront(D, RB, rr, 0.0, 12.8, RB_TINT, 0.6, 0.0, door=False, palette=WATSON["shop_colours"])
B.shopfront(D, RB, rr, 22.4, 42.0, RB_TINT, 0.6, 0.0, door=True, palette=WATSON["shop_colours"])
for a_, b_ in ((13.0, 16.4), (18.8, 22.2)):
    RB.quad((D, "shop", 0), a_, b_, 0.55, 3.3, -B.REC, col=(0.95, 0.93, 1.0, 1.0))
    RB.quad((D, "trim", 0), a_, b_, G0, 0.55, -B.REC + 0.01, col=DARK)
    RB.box((D, "trim", 0), a_, b_, 3.28, 3.3, -B.REC, 0.0, col=DARK)
    RB.quad((D, "trim", 0), a_, b_, 3.3, SHOP_H, 0.0, col=DARK)
for a_, b_ in ((16.4, 16.66), (18.54, 18.8)):
    RB.box((D, "trim", 0), a_, b_, 0.0, SHOP_H, -0.95, 0.08, col=B.TRIM[RB_TINT])
K.fbox(RB, (D, "trim", 0), 16.66, 18.54, 2.6, SHOP_H, -0.95, 0.0, col=DARK, bottom=True)
RB.quad((D, "trim", 0), 16.66, 18.54, 0.0, 2.6, -0.93, col=DARK)
RB.quad((D, "neon_green", 0), 17.05, 18.15, G0, 2.4, -0.9)
light(D, *RB.p(RB.at(17.6), 1.2, 0.9), "green", 4.5)
RB.box((D, "neon_white", 0), 13.4, 21.8, 3.72, 4.0, 0.0, 0.06)
cx_, _, cz_ = RB.p(RB.at(17.6), 0.0, 1.0)
K.cross(D, cx_, 6.2, cz_, 1.4, 0.0, "green")
pipe((D, "metal", 1), (EL, 7.0, cz_), (cx_ - 0.4, 7.0, cz_), 0.04, segs=4)
K.board(D, *RB.p(RB.at(20.6), 5.3, 0.1), "ps", RB.yaw)
K.dress(D, RB, 34.0, rr, ST, RB_TINT, escape=31.5)
# Its north wall at the pavement, where the clinic next door stands back.
quad((D, "concrete", 0), (454.0, 0.0, -300.02), (EL, 0.0, -300.02), (EL, SHOP_H, -300.02), (454.0, SHOP_H, -300.02),
     ((0, 0), (1, 0), (1, 2), (0, 2)))
stand(EL + 0.5, RB.at(17.3), -math.pi / 2, "smoke", y=G0)

# The garage's low neighbour to the south: a tyre shop's shutter and two
# small shops under rust awnings.
SB = B.Face("-x", EL, -200.0, -176.0)
rs = random.Random(9211)
SB.quad((D, "concrete", 0), 0.0, 7.2, 0.0, SHOP_H, 0.0, uvs=((0, 0), (2.4, 0), (2.4, 1.5), (0, 1.5)))
K.shutter(D, SB, 0.9, 6.3, h=3.5, lamp="amber")
SB.box((D, "hazard", 1), 0.7, 6.5, 3.85, 4.05, 0.0, 0.05)
B.shopfront(D, SB, rs, 7.2, 24.0, B.TINTS["brown"], 0.7, 0.0, door=False, palette=["amber", "red", "white"])
SB.ledge((D, "trim", 0), 0.0, 24.0, SHOP_H - 0.05, 0.3, 0.35, B.TRIM[B.TINTS["brown"]])
K.awning(D, SB, 7.6, 12.6, out=1.5)
K.awning(D, SB, 18.3, 23.6, out=1.5, col=K.RUST_DARK)

# The garage's west block (garage.py lights its ground floor as one long
# window): cut into shops by piers, a bulkhead and a fascia, doors, rust
# awnings, a sign over each; a shutter at its south end, a wall at its north.
WB = B.Face("+x", WL, -250.0, -190.0)      # s runs north from the plaza street's corner
rw = random.Random(9212)
PIERS = [4.0 + 6.5 * k for k in range(9)]
for sv in PIERS:
    WB.box((D, "trim", 0), sv - 0.25, sv + 0.25, 0.0, SHOP_H, 0.0, 0.3, col=K.CONCRETE_DARK)
WB.box((D, "trim", 0), 4.0, 56.0, G0, 0.62, 0.0, 0.1, col=DARK)
WB.box((D, "trim", 0), 4.0, 56.0, 3.3, 3.86, 0.0, 0.14, col=DARK)
for k, (a_, b_) in enumerate(zip(PIERS, PIERS[1:])):
    m_ = (a_ + b_) / 2
    if k in (1, 4, 6):
        K.awning(D, WB, a_ + 0.4, b_ - 0.4, out=1.5, y=3.3, col=K.RUST if k != 4 else K.RUST_DARK)
    else:
        K.board(D, *WB.p(WB.at(m_), 4.78, 0.2), "ps" if k % 2 else "pm", WB.yaw)
    if k in (0, 3, 5, 7):
        d_ = m_ + rw.uniform(-1.5, 1.5)
        WB.box((D, "metal", 1), d_ - 0.62, d_ + 0.62, G0, 2.5, 0.0, 0.11)
        WB.quad((D, "door", 0), d_ - 0.52, d_ + 0.52, G0, 2.38, 0.115)
for a_, b_ in ((0.0, 4.0), (56.0, 60.0)):
    WB.quad((D, "concrete", 0), a_, b_, 0.0, SHOP_H, 0.02, uvs=((0, 0), (1.3, 0), (1.3, 1.5), (0, 1.5)))
K.shutter(D, WB, 0.5, 3.4, h=3.2, lamp="white")
K.poster(D, WB, 58.0, 2.3, 1.5, 2.1, rw)
# Its face to the plaza street: shops, an awning.
PF = B.Face("+z", -190.0, 410.0, WL)
B.shopfront(D, PF, rw, 0.0, 18.0, B.TINTS["charcoal"], 0.7, 0.0, door=True, palette=WATSON["shop_colours"])
PF.ledge((D, "trim", 0), 0.0, 18.0, SHOP_H - 0.05, 0.3, 0.35, B.TRIM[B.TINTS["charcoal"]])
K.awning(D, PF, 0.5, 6.0, out=1.5)
for sv, yy, size, ang in ((3.0, 8.5, "bm", 0.35), (12.5, 7.4, "bs", -0.3), (16.0, 10.5, "bx", 0.0)):
    px_, _, pz_ = PF.p(PF.at(sv), 0.0, 0.0)
    K.blade(D, px_, pz_, yy, size, PF.yaw + ang)

# ---------------------------------------------------------------------------
# The bar on the lane's corner (Zq4zTcIM0yQ@40): pink script on its corner,
# turned to the street, a rust awning, green light out of its door, a line
# of pink under its eaves.
# ---------------------------------------------------------------------------
BAR = B.Face("+x", WL, -258.0, -250.0)     # s runs north; the door's bay is its north half
K.awning(D, BAR, 0.3, 3.9, out=1.7, y=3.25, detail=0)
BAR.quad((D, "neon_green", 0), 5.45, 6.55, G0, 2.38, -0.88)
light(D, WL + 0.9, 1.0, BAR.at(6.0), "green", 5.0)
K.script(D, WL + 0.5, 6.35, -258.5, 4.6, 2.3, math.radians(135), "pink", 9302, lines=2, underline="white")
for p_ in ((WL, 7.2, -256.6), (WL - 1.6, 7.2, -258.0)):
    pipe((D, "metal", 1), p_, (WL + 0.45, 7.2, -258.45), 0.04, segs=4)
box((D, "neon_pink", 0), WL, WL + 0.05, 7.62, 7.7, -257.8, -250.2, scale=1.0)
box((D, "neon_pink", 0), 416.2, WL, 7.62, 7.7, -258.05, -258.0, scale=1.0)
BL = B.Face("-z", -258.0, 416.0, WL)       # its face on the lane
K.blade(D, 423.0, -258.0, 6.2, "bx", BL.yaw + 0.4)
stand(WL - 0.55, BAR.at(5.2), math.pi / 2 + 0.3, "smoke", y=G0)
stand(WL - 0.5, BAR.at(6.9), math.pi / 2 - 0.4, "talk", y=G0)
# The corner house on the boulevard has its own, in two colours.
K.script(D, WL + 0.45, 6.5, -316.45, 4.2, 1.9, math.radians(135), "amber", 9301, lines=1, underline="cyan")
for p_ in ((WL, 7.3, -314.8), (WL - 1.4, 7.3, -316.0)):
    pipe((D, "metal", 1), p_, (WL + 0.4, 7.3, -316.4), 0.04, segs=4)

# ---------------------------------------------------------------------------
# The kerbs (Zq4zTcIM0yQ@40, UKgCVtdSfE0@38): white light bars set into
# their faces, black bollards along them, a rust strip of studded paving,
# the dented orange post, crossing boxes; bins and hydrants between the
# walkers' two lines. Nothing stands at the garage's door, where the S4
# turns in, or on the crossings at the street's two ends.
# ---------------------------------------------------------------------------
DOOR_GAP = (-220.5, -209.5)
# Where the lamp posts stand along each kerb (streets.py's, garage.py's).
POSTS_W = (-294.0, -264.0, -236.0, -214.0, -196.0)
POSTS_E = (-309.0, -279.0, -252.0, -240.0)
K.kerb_bars(D, WK, 1, -311.6, -194.5)
K.kerb_bars(D, EK, -1, -311.6, -194.5, skip=(DOOR_GAP,))
K.bollards(WK - 0.45, -311.3, -196.4, skip=[(z - 0.8, z + 0.8) for z in POSTS_W], district=D)
K.bollards(EK + 0.45, -311.3, -196.4, skip=[(z - 0.8, z + 0.8) for z in POSTS_E] + [DOOR_GAP], district=D)
K.tactile(D, 430.45, 431.5, -312.6, -194.6)
K.tactile(D, 448.5, 449.55, -312.6, DOOR_GAP[0])
K.tactile(D, 448.5, 449.55, DOOR_GAP[1], -194.6)
K.dented_post(D, WK - 0.5, -259.7)
for (x_, z_, yaw_) in ((WK - 0.55, -262.9, math.pi / 2), (EK + 0.55, -311.9, -math.pi / 2), (EK + 0.55, -257.2, -math.pi / 2)):
    P.place("signal_box", x_, G0, z_, yaw_, district=D)
# (West, by the lot line: the walk-through goes down the middle of that
# pavement, x 430.2.)
for (x_, z_) in ((428.5, -306.0), (428.5, -247.0), (428.5, -205.0), (449.8, -296.0), (449.8, -262.0), (449.8, -188.5)):
    P.place("bin", x_, G0, z_, district=D)
for (x_, z_) in ((WK - 0.5, -301.2), (EK + 0.5, -227.0), (WK - 0.5, -222.5)):
    P.place("hydrant", x_, G0, z_, district=D)
# The street's one tree, in the clinic's forecourt, a bench by it.
P.place("planter_tree", 453.0, G0, -308.6, district=D)
P.place("bench", 453.3, G0, -303.4, -math.pi / 2, district=D)
stand(453.3, -303.4, -math.pi / 2, "sit", y=G0 + 0.48)
# Manholes breathing steam into the signs' light.
for i, (x_, z_) in enumerate(((436.4, -303.0), (444.5, -286.5), (435.4, -231.0))):
    cylinder((D, "metal", 1), x_, z_, 0.0, 0.025, 0.42, segs=14)
    K.steam(f"afterlife_{i}", x_, 0.0, z_)

# ---------------------------------------------------------------------------
# Overhead (Zq4zTcIM0yQ@44): cable bundles slung across the street at
# third-floor height, and a skybridge between the garage's two tall
# neighbours with a row of boards on its roof and a column of small ones
# under its end. The air the page's flights come down through (from the
# rooftop's edge to the street, z -272..-244, and up to the garage's roof,
# z -226..-200) is left clear.
# ---------------------------------------------------------------------------
cr = random.Random(9230)


def west_wall(z):
    return WK if -300.0 < z < -262.0 else WL


def east_wall(z):
    return 454.0 if -312.0 < z < -300.0 else EL


for z_ in (-314.2, -309.4, -305.6, -298.4, -288.0, -284.6, -278.6, -274.6, -244.4, -233.2, -229.4):
    ya = cr.uniform(10.4, 13.4)
    yb = min(cr.uniform(10.4, 13.4), 10.9 if -312.0 < z_ < -300.0 else 99.0)
    K.bundle(D, (west_wall(z_), ya, z_), (east_wall(z_), yb, z_ + cr.uniform(-1.6, 1.6)), cr.uniform(1.0, 2.0), cr.randrange(4, 7), cr)
for z_ in (-197.2, -192.8):
    K.bundle(D, (WL, cr.uniform(10.5, 12.5), z_), (EL, 6.7, z_ + cr.uniform(-1.0, 1.0)), cr.uniform(0.6, 1.1), 4, cr)
# The skybridge: a storey of ribbon windows between a floor slab and a roof,
# lights under it, boards along its roof facing up and down the street.
BX0, BX1, BZ0, BZ1, BY0, BY1 = WL, EL, -239.6, -236.2, storeys(2), storeys(3)
bridge_col = B.wall_col(0.9, 5, 0.25, B.TINTS["concrete"])
for f_ in (B.Face("+z", BZ1, BX0, BX1), B.Face("-z", BZ0, BX0, BX1)):
    B.facade_wall((D, "facade", 0), f_, BY0, BY1, bridge_col, 0)
    f_.ledge((D, "trim", 0), 0.0, f_.width, BY0 - 0.3, 0.34, 0.22, K.CONCRETE)
    f_.ledge((D, "trim", 0), 0.0, f_.width, BY1 - 0.08, 0.3, 0.22, K.CONCRETE)
    f_.box((D, "neon_cyan", 0), 0.6, f_.width - 0.6, BY0 - 0.26, BY0 - 0.2, 0.22, 0.25)
K.ceiling((D, "concrete", 0), BX0, BX1, BZ0, BZ1, BY0 - 0.3)
quad((D, "roof", 0), (BX0, BY1 + 0.22, BZ1), (BX1, BY1 + 0.22, BZ1), (BX1, BY1 + 0.22, BZ0), (BX0, BY1 + 0.22, BZ0))
for x_ in (432.6, 437.5, 442.5, 447.4):
    K.downlight(D, x_, (BZ0 + BZ1) / 2, BY0 - 0.3, "amber", size=0.5, power=2.2)
for k in range(5):
    x_ = 430.6 + k * 4.7
    for z_, yaw_ in ((BZ0 + 0.25, math.pi), (BZ1 - 0.25, 0.0)):
        K.board(D, x_, BY1 + 1.15, z_, "pm" if k % 2 == 0 else "ps", yaw_, frame=0.1)
    for dx_ in (-1.0, 1.0):
        box((D, "metal", 1), x_ + dx_ - 0.04, x_ + dx_ + 0.04, BY1 + 0.22, BY1 + 0.6, BZ0 + 0.2, BZ1 - 0.2, scale=0.5)
K.stack(D, EL, BZ0 - 0.5, 7.6, 4, -math.pi / 2, out=1.3)


# ---------------------------------------------------------------------------
# The roofs. The rooftop, the braindance's cameras and a flying car look
# down on all of them, and the Stack shot looks across the garage's west
# block's to MILITECH: every roof has its parapet, most a line of light
# round it, and each its own life: a deck with a rail, lamps on long arms
# and planters (D6ia1wjO7sg@220), plant and tanks, a landing pad, skylights,
# a billboard on legs, a penthouse. What About's lens could see over the
# rooftop's own parapet (anything over about 30 m west of the street) is
# kept under its line.
# ---------------------------------------------------------------------------
ro = random.Random(9400)
T = B.TINTS
# West of the street.
K.parapet(D, 380.0, 398.0, -316.0, -300.0, storeys(6), T["navy"], line="cyan")
B.building(B.Lot(383.0, 395.0, -313.0, -303.0, "-z", {k: "open" for k in ("+x", "-x", "+z", "-z")}, {}, D), storeys(7),
           random.Random(9401), style=dict(WATSON, roof_cap=0.0, balcony=0.0, lit=(0.7, 0.95)), base=storeys(6), signs=False, tint="navy")
K.unit(D, 396.5, -308.0, storeys(6), math.pi / 2, lamp="green")
K.parapet(D, 402.0, WL, -316.0, -300.0, storeys(3), T["concrete"], line="amber")
K.roof_board(D, 416.0, -309.0, storeys(3), 11.0, 5.0, math.radians(158), ro)
K.hut(D, 405.0, -303.0, storeys(3), math.pi, T["concrete"])
K.unit(D, 424.5, -302.5, storeys(3), 0.0, lamp="amber")
K.parapet(D, 380.0, 398.0, -300.0, -276.0, storeys(5), T["teal"])
K.plant(D, 381.5, 396.5, -298.5, -282.0, storeys(5), ro)
P.place("tank_roof", 392.5, storeys(5), -279.5, 0.4, district=D)
P.place("antenna", 383.0, storeys(5), -278.5, 0.0, district=D)
K.parapet(D, 380.0, 398.0, -276.0, -250.0, storeys(3), T["brown"], line="teal")
K.terrace(D, 382.5, 396.0, -273.0, -257.0, storeys(3), ro, hue="cyan")
K.hut(D, 394.0, -253.0, storeys(3), -math.pi / 2, T["brown"])
# The bar's roof is its terrace: strings of bulbs, crates for tables.
K.parapet(D, 416.0, WL, -258.0, -250.0, storeys(1), T["charcoal"], deck="sidewalk")
for a_, b_ in (((416.6, 10.6, -257.4), (427.4, 10.6, -250.8)), ((416.6, 10.6, -250.8), (427.4, 10.6, -257.4))):
    K.bulbs(D, a_, b_, sag=0.7, n=10, hue="amber" if a_[2] < -255 else "pink", floor=storeys(1) if a_[2] < -255 else None)
for (x_, z_) in ((416.6, -257.4), (427.4, -250.8), (416.6, -250.8), (427.4, -257.4)):
    cylinder((D, "metal", 1), x_, z_, storeys(1), 10.65, 0.04, segs=5)
for (x_, z_) in ((419.5, -255.5), (424.0, -252.5)):
    K.crates(D, x_, z_, ro, n=2, y=storeys(1) + 0.1)
stand(420.6, -255.4, -math.pi / 2, "talk", y=storeys(1) + 0.1)
stand(418.6, -255.6, math.pi / 2, "talk", y=storeys(1) + 0.1)
stand(425.6, -251.6, math.pi / 2 + 0.4, "lean", y=storeys(1) + 0.1)
# The garage's west block: the roof the Stack shot looks across. A
# billboard turned to the rooftop, plant, a tank, a stair hut.
K.parapet(D, 410.0, WL, -250.0, -190.0, 26.0, T["charcoal"], line="cyan")
K.roof_board(D, 420.5, -212.0, 26.0, 9.5, 4.6, math.radians(129), ro)
K.plant(D, 411.5, 426.5, -247.0, -232.0, 26.0, ro, flood="amber")
P.place("tank_roof", 423.5, 26.0, -197.0, 0.9, district=D)
K.hut(D, 414.5, -199.5, 26.0, 0.0, T["charcoal"])
K.post_light(D, 418.0, -224.0, 26.0, "cyan")
# AFTERLIFE's roof: skylights in the sign's pink, a deck by the sign's
# posts, units, low lights (low: About's lens looks across it).
K.skylights(D, 420.0, 429.0, -292.0, -270.0, 30.0, ro, hue="pink", along="z", n=2)
K.slab(D, 403.0, 431.0, -299.0, -263.0, 30.0, "concrete", lift=0.1, scale=3.0)
K.slab(D, 412.0, 419.0, -278.0, -264.0, 30.0)
K.planter(D, 412.2, 418.8, -264.9, -264.1, ro, y=30.17, h=0.45, lit="green")
P.place("bench", 415.5, 30.17, -276.8, 0.0, district=D)
for (x_, z_, hue_) in ((413.0, -271.0, "amber"), (418.0, -277.0, "amber"), (406.0, -285.0, "cyan"), (424.5, -266.0, "pink"), (407.0, -270.0, "amber")):
    K.post_light(D, x_, z_, 30.0, hue_, h=0.55)
for (x_, z_) in ((405.0, -279.0), (406.8, -279.0), (421.5, -297.5)):
    P.place("ac_roof", x_, 30.0, z_, 0.0, district=D)
# East of the street. The block that closes the boulevard carries a crown
# of two lit storeys and a billboard that faces down the boulevard; its
# lower half a landing pad.
K.parapet(D, EL, 484.0, -344.0, -316.0, storeys(7), T["charcoal"], line="cyan")
B.building(B.Lot(461.0, 481.0, -340.0, -321.0, "-x", {k: "open" for k in ("+x", "-x", "+z", "-z")}, {}, D), storeys(9),
           random.Random(9402), style=dict(WATSON, roof_cap=5.0, balcony=0.0, lit=(0.75, 0.95), windows=(5,)), base=storeys(7), signs=False,
           tint="charcoal", crown_band="cyan", roof=True)
K.roof_board(D, 455.6, -330.0, storeys(7), 12.0, 5.4, -math.pi / 2, ro)
K.parapet(D, 484.0, 508.0, -344.0, -316.0, storeys(5), T["navy"], line="amber")
K.pad(D, 497.0, -331.0, storeys(5), rad=7.0)
K.hut(D, 487.0, -319.5, storeys(5), math.pi / 2, T["navy"])
# The clinic's roof: its plant and a small deck.
K.parapet(D, 454.0, 484.0, -312.0, -300.0, storeys(2), T["concrete"], line="green")
K.plant(D, 470.5, 483.0, -311.0, -301.0, storeys(2), ro)
K.terrace(D, 456.0, 468.0, -310.8, -302.0, storeys(2), ro, hue="white", planters=False)
# The roof south of the rooftop's own (the first thing under its parapet):
# a deck, a tank, a hut.
K.parapet(D, EL, 476.0, -258.0, -230.0, 22.0, T["plum"], line="teal")
K.terrace(D, 454.5, 468.5, -255.5, -240.0, 22.0, ro, hue="cyan")
P.place("tank_roof", 472.0, 22.0, -234.5, 0.3, district=D)
K.hut(D, 472.6, -251.5, 22.0, -math.pi / 2, T["plum"])
# The garage's roof, north of where Contact stands on it: skylights over
# the bay, a unit, tyres and crates by the parapet.
K.slab(D, 460.0, 475.4, -229.4, -206.0, 8.0, "concrete", lift=0.1, scale=3.0)
K.skylights(D, 461.0, 472.0, -226.0, -208.0, 8.0, ro, hue="white", along="x", n=3, lit=1.0)
K.unit(D, 473.2, -227.4, 8.0, math.pi / 2, lamp="green")
K.tyres(D, 457.5, -228.0, 3, y=8.0)
K.crates(D, 459.4, -228.2, ro, n=3, y=8.0)
# The outer row.
OUTER_ROOFS = ("plant", "terrace", "board", "sky", "plant", "sky")
for (z0, z1, n), kind in zip(OUTER, OUTER_ROOFS):
    y_ = storeys(n)
    K.parapet(D, 490.0, 508.0, z0, z1, y_, T["charcoal"], line={"terrace": "teal", "board": "pink", "sky": None, "plant": None}[kind]
              if n > 1 else "amber")
    if kind == "plant":
        K.plant(D, 491.5, 506.5, z0 + 1.5, z1 - 6.0, y_, ro)
        P.place("tank_roof", 503.5, y_, z1 - 3.0, ro.uniform(0, 3), district=D)
    elif kind == "terrace":
        K.terrace(D, 492.0, 506.0, z0 + 2.0, z1 - 5.0, y_, ro, hue="cyan")
        K.hut(D, 504.0, z1 - 2.4, y_, math.pi, T["charcoal"])
    elif kind == "board":
        K.roof_board(D, 494.0, (z0 + z1) / 2, y_, 10.0, 4.5, -math.pi / 2, ro)
        K.hut(D, 503.5, z0 + 3.0, y_, -math.pi / 2, T["charcoal"])
        K.unit(D, 503.0, z1 - 3.0, y_, 0.0, lamp="amber")
    else:
        K.skylights(D, 492.5, 505.5, z0 + 2.5, z1 - 2.5, y_, ro, hue="amber", along="z", n=3)
# The signal mast, on the rooftop's north edge where the braindance hears
# it, and the lamp that blinks by the tank.
K.mast(D, 462.0, -299.0, 34.0, 7.5)
cylinder((D, "metal", 1), 470.0, -291.0, 34.0, 39.45, 0.05, segs=5)
box((D, "glow", 0), 469.9, 470.1, 39.45, 39.7, -291.1, -290.9, scale=0.5, col=GLOW["white"])

# ---------------------------------------------------------------------------
# The lanes, the passage and the yards: the kept blocks' backs onto them
# (doors with a lamp each, shutters, pipes, units, ducts), tubes of cyan and
# green overhead where the show lights its back passages (Zuzys9Ld_5M@87),
# cables, a sign across each mouth, steam, what a back street keeps.
# ---------------------------------------------------------------------------
rl = random.Random(9500)


def back(name, plane, a0, a1, top, seed, tint="charcoal", clutter=True):
    """The ground floor of a kept block's back (a hair proud of its dark
    ground floor's own plane) and what hangs on it above."""
    n = {"+x": 1, "-x": -1, "+z": 1, "-z": -1}[name]
    f = B.Face(name, plane + n * 0.03, a0, a1)
    r = random.Random(seed)
    B.back_ground(D, f, r, B.TRIM[T[tint]])
    if clutter:
        B.clutter_back(D, f, r, 0.0, top)
    return f


def lane_tubes(pts, y, hues, power=3.0, along="z", half=1.0):
    for (x_, z_), hue in zip(pts, hues):
        a_ = (x_, y, z_ - half) if along == "z" else (x_ - half, y, z_)
        b_ = (x_, y, z_ + half) if along == "z" else (x_ + half, y, z_)
        K.tube(D, a_, b_, hue, power=power)
        for e in (a_, b_):
            pipe((D, "dark", 1), (e[0], y + 0.07, e[2]), (e[0], y + 0.9, e[2]), 0.012, segs=3)


def lane_cables(x0, x1, zs, y0, y1, r, along="x"):
    for v in zs:
        ya, yb, sag = r.uniform(y0, y1), r.uniform(y0, y1), r.uniform(0.25, 0.9)
        if along == "x":
            K.cable(D, (x0, ya, v), (x1, yb, v + r.uniform(-0.8, 0.8)), sag, steps=5)
        else:
            K.cable(D, (v, ya, x0), (v + r.uniform(-0.8, 0.8), yb, x1), sag, steps=5)


# West: the lane behind AFTERLIFE's block (x 398..402), the lane from it to
# the street (z -262..-258) and the yard behind the bar.
AFW = back("-x", 402.0, -300.0, -262.0, 30.0, 9501)
K.duct(D, AFW, 3.0, 30.0, 4.9, rl)
AFS = back("+z", -262.0, 402.0, WL, 30.0, 9502)
K.duct(D, AFS, 1.0, 20.0, 5.0, rl)
K.poster(D, AFS, 22.8, 2.3, 1.5, 2.1, rl)
# The club's back door, open on its light, kegs and crates by it.
K.lit_door(D, AFW, 22.0, "pink", power=4.0)
K.kegs(D, 401.3, AFW.at(24.6), rl)
K.crates(D, 401.2, AFW.at(19.4), rl)
back("-z", -250.0, 410.0, 416.0, 26.0, 9503, clutter=False)
# MILITECH's service door on the yard: a shutter under hazard stripes, a
# camera, a white flood.
MN = B.Face("-z", -250.03, 398.0, 410.0)
MN.quad((D, "concrete", 0), 0.0, 12.0, 0.0, SHOP_H, 0.0, uvs=((0, 0), (4, 0), (4, 1.5), (0, 1.5)))
K.shutter(D, MN, 3.0, 9.0, h=3.6, lamp="white")
MN.box((D, "hazard", 1), 2.8, 9.2, 3.95, 4.2, 0.0, 0.06)
P.place("cctv", 409.3, G0, -250.8, district=D)
lane_tubes([(400.0, -306.0), (400.0, -291.0), (400.0, -277.0), (400.0, -265.0)], 3.9, ("cyan", "green", "cyan", "white"))
lane_tubes([(407.0, -260.0), (416.0, -260.0), (424.0, -260.0)], 3.9, ("cyan", "pink", "cyan"), along="x")
lane_cables(398.0, 402.0, (-311.0, -299.0, -288.5, -281.0, -270.0), 6.0, 10.0, rl)
lane_cables(-262.0, -258.0, (405.0, 411.0, 419.5), 5.2, 7.4, rl, along="z")
# A sign across each mouth: the alley's on the boulevard, the lane's on the
# street.
box((D, "board_frame", 0), 398.1, 401.9, 4.95, 6.25, -316.15, -316.0, scale=1.0)
K.board(D, 400.0, 5.6, -316.17, "pm", math.pi, frame=0)
box((D, "board_frame", 0), WL - 0.05, WL + 0.1, 4.7, 5.7, -261.9, -258.1, scale=1.0)
K.board(D, WL + 0.12, 5.2, -260.0, "pm", math.pi / 2, frame=0)
box((D, "neon_cyan", 0), WL + 0.1, WL + 0.14, 4.6, 4.68, -261.8, -258.2, scale=1.0)
for i, (x_, z_) in enumerate(((400.0, -284.0), (412.0, -260.0))):
    K.steam(f"afterlife_lane_{i}", x_, G0, z_, D)
P.place("dumpster", 409.0, G0, -257.0, math.pi, district=D)
K.kegs(D, 414.6, -252.4, rl, n=6)
K.crates(D, 404.0, -251.4, rl)
# East: the passage under its low ceiling, three tubes of cyan, a duct with
# its lamps down one wall, a poster and grilles on the other.
box((D, "concrete", 0), EL, 484.0, 4.1, 4.4, -316.0, -312.0, scale=2.0, bottom=True)
lane_tubes([(458.0, -314.0), (468.0, -314.0), (478.0, -314.0)], 3.95, ("cyan", "cyan", "cyan"), power=3.4, along="x", half=1.1)
PN = B.Face("+z", -316.0, EL, 484.0)       # the closing block's wall on it
K.duct(D, PN, 2.0, 30.0, 3.3, rl)
PS = B.Face("-z", -312.0, 454.0, 484.0)    # the clinic's
K.poster(D, PS, 22.0, 2.2, 1.3, 1.8, rl)
K.grille(D, PS, 4.0, 8.0, 0.4, 2.6)
box((D, "board_frame", 0), EL - 0.1, EL + 0.05, 4.4, 5.3, -315.9, -312.1, scale=1.0)
K.board(D, EL - 0.12, 4.85, -314.0, "pm", -math.pi / 2, frame=0)
K.steam("afterlife_lane_2", 472.0, G0, -314.0, D)
# The back lane and the yard behind the garage row.
back("+x", 484.0, -300.0, -258.0, 34.0, 9504)
back("+z", -258.0, 476.0, 484.0, 34.0, 9505, clutter=False)
back("+x", 476.0, -258.0, -230.0, 22.0, 9506)
back("+x", 476.0, -200.0, -176.0, 7.0, 9507, clutter=False)
GE = B.Face("+x", 476.0, -230.0, -200.0)   # the garage's back wall
GE.quad((D, "door", 0), 8.0, 9.1, G0, 2.3, 0.03)
GE.box((D, "metal", 1), 7.92, 9.18, 2.3, 2.4, 0.0, 0.12)
K.wall_lamp(D, GE, 8.55, 2.75, "amber", 3.5)
K.wall_lamp(D, GE, 22.0, 4.2, "white", 3.5)
K.pipes(D, GE, 11.0, 28.0, 5.4, rl, n=3)
K.shutter(D, GE, 14.0, 19.0, h=3.4, lamp=None)
for (x_, z_, n_) in ((476.6, -227.0, 4), (477.4, -227.2, 3), (476.6, -203.5, 2)):
    K.tyres(D, x_, z_, n_)
K.crates(D, 477.2, -212.0, rl)
for (x_, z_) in ((488.6, -250.0), (489.0, -249.2), (488.5, -221.0), (478.0, -180.5), (478.8, -181.0)):
    P.place("drum", x_, G0, z_, district=D)
P.place("dumpster", 488.8, G0, -236.0, -math.pi / 2, district=D)
P.place("dumpster", 485.2, G0, -288.0, math.pi / 2, district=D)
lane_tubes([(487.0, -306.0), (487.0, -290.0), (487.0, -274.0), (487.0, -262.0)], 4.2, ("green", "cyan", "white", "cyan"))
lane_cables(484.0, 490.0, (-310.0, -296.0, -283.0, -268.0), 6.0, 11.0, rl)
lane_cables(476.0, 490.0, (-246.0, -231.0, -214.0, -196.0, -184.0), 6.5, 9.5, rl)
# A flood on a pole in the yard, a second by the garage's back door.
for (x_, z_, hue_) in ((483.0, -240.0, "amber"), (483.5, -207.0, "white"), (487.0, -322.0, "amber")):
    P.place("lamp_short", x_, G0, z_, district=D)
    light(D, x_, 3.6, z_, hue_, 5.0)
K.steam("afterlife_lane_3", 486.5, G0, -280.0, D)
K.steam("afterlife_lane_4", 480.5, G0, -218.0, D)
# The lane's end against the closing block: a gate's worth of clutter.
K.crates(D, 485.0, -317.2, rl)
P.place("bags", 488.8, G0, -317.0, district=D)
# AFTERLIFE's north wall, over the corner house's roof: sold to a billboard
# that faces the boulevard.
B.billboard(D, 415.0, 22.6, -300.32, 15.0, 8.0, math.pi, ro, back=False, depth=0.3)

# What the lanes' walls carry at a walker's height: both sides of every
# lane, the kept blocks' and the new ones'.
for name, plane, a0, a1, top, dens in (
        ("-x", 402.0 - 0.03, -300.0, -262.0, 30.0, 1.0), ("+x", 398.0, -300.0, -258.0, 14.8, 1.0),
        ("+x", 398.0, -316.0, -300.0, 25.0, 1.0), ("-x", 402.0, -316.0, -300.0, 14.8, 1.0),
        ("+z", -262.0 + 0.03, 402.0, WL, 30.0, 1.1), ("-z", -258.0, 416.0, WL, 8.0, 0.8), ("-x", 416.0, -258.0, -250.0, 8.0, 0.8),
        ("+z", -316.0, EL, 484.0, 28.4, 1.1), ("-z", -312.0, 454.0, 484.0, 11.4, 1.1),
        ("+x", 484.0 + 0.03, -300.0, -258.0, 34.0, 1.0), ("+x", 484.0, -312.0, -300.0, 11.4, 1.0), ("-x", 490.0, -316.0, -258.0, 18.0, 1.0),
        ("+x", 476.0 + 0.03, -258.0, -230.0, 22.0, 1.0), ("+x", 476.0 + 0.03, -200.0, -176.0, 7.0, 0.8), ("-x", 490.0, -258.0, -176.0, 11.0, 0.9)):
    K.lane_wall(D, B.Face(name, plane, a0, a1), rl, top, dens)

# ---------------------------------------------------------------------------
# MILITECH's forecourt on the plaza street (mH2wmyeiIpA@182): a walled court
# under floods, its paving striped yellow up to the lobby, a gate under a
# gantry carrying a red strip and lit boxes, a guard's booth, cube bollards.
# ---------------------------------------------------------------------------
FX0, FX1, FZ0, FZ1 = 380.0, 410.0, -222.0, -190.0
B.ground_rect(D, FX0, FX1, FZ0, FZ1, mat="concrete")
ML = B.Face("+z", FZ0 + 0.03, FX0, FX1)    # MILITECH's face on it: the lobby
ML.quad((D, "lobby", 0), 4.0, 26.0, G0, SHOP_H - 0.7, 0.0, col=(0.2, 0.3, 1.0, 1.0))
ML.quad((D, "trim", 0), 0.0, 30.0, SHOP_H - 0.7, SHOP_H, 0.0, col=DARK)
for a_, b_ in ((0.0, 4.0), (26.0, 30.0)):
    ML.quad((D, "concrete", 0), a_, b_, 0.0, SHOP_H - 0.7, 0.0, uvs=((0, 0), (1.3, 0), (1.3, 1.3), (0, 1.3)))
for sv in (4.0, 8.4, 12.8, 17.2, 21.6, 26.0):
    ML.box((D, "trim", 0), sv - 0.18, sv + 0.18, 0.0, SHOP_H, 0.0, 0.3, col=DARK)
B.canopy(D, ML, 9.0, 21.0, 3.2, SHOP_H - 0.5, T["charcoal"], "white")
for sv in (12.5, 17.5):
    ML.box((D, "neon_yellow", 0), sv - 0.04, sv + 0.04, 0.3, 3.6, 0.3, 0.34)
light(D, 395.0, 2.0, FZ0 + 3.0, "white", 5.0)
# The stripes up to the door, and the court's lamps.
for k in range(7):
    z_ = FZ0 + 4.5 + k * 3.6
    quad((D, "trim", 0), (389.0, G0 + 0.008, z_ + 0.9), (401.0, G0 + 0.008, z_ + 0.9), (401.0, G0 + 0.008, z_), (389.0, G0 + 0.008, z_),
         col=(0.42, 0.33, 0.05, 1))
for (x_, z_) in ((383.0, -214.0), (407.0, -214.0), (383.0, -198.0), (407.0, -198.0)):
    P.place("lamp_short", x_, G0, z_, district=D)
    light(D, x_, 3.6, z_, "amber", 4.0)
for (x_, z_) in ((386.5, -219.0), (403.5, -219.0)):
    K.planter(D, x_ - 1.6, x_ + 1.6, z_ - 0.6, z_ + 0.6, rl, y=G0, lit="yellow")
# The wall along the street and the gate in it.
GATE = (390.5, 399.5)
for a_, b_ in ((FX0, GATE[0]), (GATE[1], FX1)):
    box((D, "concrete", 0), a_, b_, 0.0, 2.8, FZ1 - 0.4, FZ1, scale=1.5)
    box((D, "neon_yellow", 0), a_ + 0.3, b_ - 0.3, 2.8, 2.86, FZ1 - 0.04, FZ1 + 0.02, scale=1.0)
    box((D, "hazard", 1), a_, b_, 0.0, 0.5, FZ1, FZ1 + 0.03, scale=1.0)
for x_ in GATE:
    box((D, "metal", 0), x_ - 0.2, x_ + 0.2, 0.0, 6.4, FZ1 - 0.5, FZ1 - 0.1, scale=1.0)
box((D, "metal", 0), GATE[0] - 0.2, GATE[1] + 0.2, 5.9, 6.5, FZ1 - 0.55, FZ1 - 0.05, scale=1.0)
box((D, "neon_red", 0), GATE[0] + 0.3, GATE[1] - 0.3, 5.74, 5.82, FZ1 - 0.04, FZ1 + 0.02, scale=1.0)
for k, hue in enumerate(("amber", "cyan", "amber")):
    x_ = GATE[0] + 2.0 + k * 2.5
    box((D, "glow", 0), x_ - 0.5, x_ + 0.5, 6.6, 7.1, FZ1 - 0.5, FZ1 - 0.1, scale=1.0, col=GLOW[hue])
for x_ in (392.0, 398.0):
    P.place("barrier", x_, G0, FZ1 - 1.6, district=D)
for x_ in (385.0, 387.5, 402.5, 405.0):
    P.place("bollard_cube", x_, G0, FZ1 + 1.2, district=D)
# The booth, east of the gate: a lit window, its roof, a camera on it.
box((D, "trim", 0), 400.6, 403.8, G0, 2.8, FZ1 - 3.6, FZ1 - 0.8, scale=1.0, col=K.CONCRETE_DARK)
quad((D, "shop", 0), (400.58, 1.05, FZ1 - 1.2), (400.58, 1.05, FZ1 - 3.2), (400.58, 2.3, FZ1 - 3.2), (400.58, 2.3, FZ1 - 1.2), col=(0.8, 0.9, 1.0, 1.0))
box((D, "metal", 1), 400.4, 404.0, 2.8, 2.95, FZ1 - 3.8, FZ1 - 0.6, scale=1.0)
P.place("cctv", 404.6, G0, FZ1 - 1.4, district=D)
P.place("cctv", 381.2, G0, FZ0 + 1.0, district=D)
light(D, 395.0, 5.6, FZ1 - 0.6, "red", 3.0)
light(D, 399.6, 1.6, FZ1 - 2.2, "white", 3.0)
back("-x", 410.0, FZ0, FZ1, 26.0, 9508)
stand(389.6, FZ1 - 1.0, 0.0, "idle", y=G0)
stand(400.0, FZ1 - 4.4, -math.pi / 2, "lean", y=G0)
stand(394.0, FZ0 + 1.6, 0.0, "idle", y=G0)

# ---------------------------------------------------------------------------
# The people who stand about (the walkers on the pavements are the
# street's own): in the recesses and the lanes' mouths, clear of the
# walkers' lines and of the walk camera's. Nobody on the rooftop or in the
# bay.
# ---------------------------------------------------------------------------
PEOPLE_AT = [
    # the alley's mouth on the boulevard, and down the back lane
    (399.3, -315.0, 2.6, "smoke"), (400.9, -314.4, -2.4, "talk"), (401.2, -283.2, -math.pi / 2, "talk"), (400.0, -284.0, math.pi / 2, "talk"),
    (398.6, -270.5, math.pi / 2, "lean"),
    # the lane to the street and the bar's yard
    (425.2, -259.2, math.pi / 2, "phone"), (421.0, -260.8, 0.4, "squat"), (413.4, -253.0, 2.0, "smoke"), (406.6, -252.6, 0.3, "idle"),
    # the clinic's forecourt and the passage
    (453.2, -306.4, math.pi, "talk"), (453.1, -307.5, 0.0, "talk"), (456.6, -313.4, -math.pi / 2, "phone"), (463.0, -315.2, 0.0, "squat"),
    (476.0, -312.8, math.pi, "lean"),
    # the back lane and the yard
    (484.7, -276.0, math.pi / 2, "smoke"), (489.3, -297.0, -math.pi / 2, "lean"), (478.0, -214.5, math.pi / 2, "idle"), (479.6, -213.6, -math.pi / 2, "talk"),
    (488.0, -232.0, -math.pi / 2, "phone"), (481.0, -190.0, 0.5, "smoke"),
    # outside the garage: a mechanic clear of the door, another on the kerb
    (449.8, -208.4, 0.6, "idle"), (448.36, -205.4, -math.pi / 2, "squat"),
    # the plaza street's corner
    (424.0, -189.4, 0.0, "phone"),
]
for x_, z_, yaw_, pose_ in PEOPLE_AT:
    stand(x_, z_, yaw_, pose_, y=G0)
# A pair on a stoop in the bar's yard, at the back row's door.
WY = B.Face("+x", 398.0, -258.0, -250.0)
K.stoop(D, WY, 2.4, 5.2, steps=2)
WY.quad((D, "door", 0), 3.2, 4.4, G0 + 0.36, 2.6, 0.03)
K.wall_lamp(D, WY, 3.8, 3.05, "amber", 3.0)
stand(398.5, WY.at(3.1), math.pi / 2, "sit", y=G0 + 0.36)
stand(398.5, WY.at(4.5), math.pi / 2 - 0.5, "sit", y=G0 + 0.36)
