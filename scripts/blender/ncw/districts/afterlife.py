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
from ncw.districts import afterlife_roofs as R

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


def own(fn, *args, **kw):
    """Call one of the generator's functions with this district's parts in
    the kit's place while it runs: a back onto a lane cold and dark
    (K.back_ground), a fire escape in open steel (K.fire_stairs)."""
    kit_parts = B.back_ground, B.fire_escape
    B.back_ground, B.fire_escape = K.back_ground, K.fire_stairs
    try:
        return fn(*args, **kw)
    finally:
        B.back_ground, B.fire_escape = kit_parts


def lot(x0, x1, z0, z1, h, seed, sides, nb=None, style=None, roof=False, **kw):
    """A building on a lot. Its roof is dressed further down, by hand (the
    roofs are seen from the rooftop and from the air): the generator's own
    draw only where `roof` asks."""
    return own(B.building, B.Lot(x0, x1, z0, z1, "+x", sides, nb or {}, D), h, random.Random(seed),
               style=dict(WATSON, **(style or {})), roof=roof, **kw)


F = SHOP_H + CELL_H  # a storey over the shops: heights are SHOP_H + n storeys


class own_ids:
    """Signs added since round 3 draw their designs from a stream of their
    own, so every sign built after them keeps the design it had."""

    def __init__(self, seed):
        self.seed = seed

    def __enter__(self):
        self.saved, K._ids = K._ids, random.Random(self.seed)

    def __exit__(self, *exc):
        K._ids = self.saved


def storeys(n):
    return SHOP_H + n * CELL_H


# ---------------------------------------------------------------------------
# West of the street.
# ---------------------------------------------------------------------------
# (The two on the boulevard are seen across its whole width: paired windows
# most of them lit, balconies, units, a fire escape each, signs.)
BLVD = dict(lit=(0.65, 0.85), balcony=0.3, ac=0.5, fire_escape=1.0, signs=0.9, shop_sign=0.8)
lot(380.0, 398.0, -316.0, -300.0, storeys(6), 9101, {"-z": "street", "+z": "party", "-x": "back", "+x": "open"},
    {"+z": storeys(5)}, tint="navy", window=0, style=BLVD)
lot(402.0, 428.0, -316.0, -300.0, storeys(3), 9102, {"-z": "street", "+x": "street", "-x": "open", "+z": "party"},
    {"+z": 30.0}, tint="rust", window=0, style=dict(BLVD, roof_cap=3.0))
lot(380.0, 398.0, -300.0, -276.0, storeys(5), 9103, {"+x": "open", "-x": "back", "-z": "party", "+z": "party"},
    {"-z": storeys(6), "+z": storeys(3)}, tint="teal")
lot(380.0, 398.0, -276.0, -250.0, storeys(3), 9104, {"+x": "open", "-x": "back", "-z": "party", "+z": "party"},
    {"-z": storeys(5), "+z": 46.0}, tint="brown")
# The bar on the lane's corner: two storeys between AFTERLIFE's thirty
# metres and the garage's west block.
lot(416.0, 428.0, -258.0, -250.0, storeys(1), 9105, {"+x": "street", "-z": "open", "-x": "open", "+z": "party"},
    {"+z": 26.0}, tint="charcoal", signs=False, style=dict(shop_sign=0.0, balcony=0.0, fire_escape=0.0, roof_cap=2.6, ac=0.6))

# The lanes and the yard behind the west row, paved.
K.lane_floor(D, 398.0, 402.0, -316.0, -258.0)                         # the alley and the back lane
K.lane_floor(D, 402.0, WL, -262.0, -258.0)                            # the lane to the street
B.ground_rect(D, 398.0, 416.0, -258.0, -250.0, mat="concrete")       # the bar's yard

# ---------------------------------------------------------------------------
# East of the street.
# ---------------------------------------------------------------------------
# The block that closes the boulevard's east end, on the boulevard's north
# lot line carried east; its east half lower.
# (Its face on the junction is built further down, by hand: here it is a
# party wall as high as the block, which the generator leaves alone.)
lot(452.0, 484.0, -344.0, -316.0, storeys(7), 9110, {"-x": "party", "-z": "back", "+z": "open", "+x": "party"},
    {"+x": storeys(5), "-x": 99.0}, tint="charcoal")
lot(484.0, 508.0, -344.0, -316.0, storeys(5), 9111, {"-x": "party", "-z": "back", "+z": "open", "+x": "back"},
    {"-x": storeys(7)}, tint="navy")
# A clinic, three storeys, between it and the rooftop's building; the
# covered passage runs between the two.
# (Set back two metres from the lot line: a forecourt with the street's one
# tree in it.)
lot(454.0, 484.0, -312.0, -300.0, storeys(2), 9112, {"-x": "street", "-z": "open", "+z": "party", "+x": "open"},
    {"+z": 34.0}, tint="concrete", style=dict(roof_cap=3.0))
B.ground_rect(D, EL, 454.0, -312.0, -300.0)
K.lane_floor(D, EL, 484.0, -316.0, -312.0)                            # the passage
K.lane_floor(D, 484.0, 490.0, -316.0, -258.0)                         # the back lane
B.ground_rect(D, 476.0, 490.0, -258.0, -176.0, mat="concrete")       # the yard behind the garage row
# The outer row, its fronts on the back lane and the yard, its backs to the
# far city. Low by the garage's roof, where Contact looks out over it.
# (The last is a shed of one tall storey: from the garage's roof Contact's
# frame passes just over it.)
OUTER = [(-316.0, -292.0, 4), (-292.0, -272.0, 2), (-272.0, -248.0, 6), (-248.0, -226.0, 2), (-226.0, -204.0, 4), (-204.0, -176.0, 0.18)]
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
        style=dict(roof_cap=5.0 if n > 1 else 2.4, cornice=0.0 if n < 1 else 0.5, balcony=0.25, ac=0.5, lit=(0.5, 0.8)))
    # (The taller ones carry a fire escape down their face on the yard.)
    if n >= 4:
        K.fire_stairs(D, B.Face("-x", 490.0, z0, z1), (z1 - z0) * 0.62, SHOP_H + 0.5, storeys(n) - 3.0)


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
# The door (BnnbP7pCIvQ@24): a heavy portal of steel standing proud of the
# piers, strips of cyan down its jambs, a hazard line under its beam,
# struts in its corners and a row of bolts along it; the recess behind it
# under a ceiling of the sign's yellow-green, ribbed walls with cyan let
# into them, and at its back the club's steel doors slid open on the teal
# light inside.
YG = (0.56, 1.0, 0.07)                      # the sign's yellow-green
PORTAL = (0.085, 0.09, 0.1, 1)
FRAME = (0.2, 0.21, 0.235, 1)               # a sign's steel frame, light enough to read against its board


def yg(k):
    return (YG[0] * k, YG[1] * k, YG[2] * k, 1.0)


def lit_soffit(x0, x1, z0, z1, y, k0, k1):
    """A soffit lit in the sign's colour, k0 strong along x0 and k1 along x1,
    under dark battens that cut it into panels."""
    K.vpoly((D, "glow", 0), [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)], [yg(k0), yg(k1), yg(k1), yg(k0)])
    n = max(2, round((z1 - z0) / 1.7))
    for i in range(1, n):
        z_ = z0 + (z1 - z0) * i / n
        box((D, "dark", 1), x0, x1, y - 0.035, y + 0.005, z_ - 0.025, z_ + 0.025, scale=1.0, bottom=True)


for s0 in (15.5, 21.7):
    K.fbox(AF, (D, "trim", 0), s0, s0 + 0.8, 0.0, SHOP_H, -2.4, 0.14, col=DARK)
# (The m6 review: "a flat cyan emissive rectangle under a flat lime tiled
# ceiling", where the show's is a heavy recessed mechanical portal: a framed
# lintel with brackets, light bars set into machinery, depth into a lit
# inside, warm yellow-white over teal.) The portal: two stepped steel jambs
# with inset panels, bolts and a ram up each; a deep lintel slotted three
# times with a warm bar in its middle slot and two let into its underside;
# chunky brackets in the opening's top corners; behind it four frames of
# steel, each a step smaller, warm bars in the first two's edges and teal in
# the last two's, down to the club's doors slid open; and through them a
# corridor of teal ribbed walls under warm bars to a warm end where people
# stand. (All of its light is glow, which the site does not bake: the
# pavement's light stays as it was.)
WARM = (1.0, 0.8, 0.5)


def warm(k):
    return (WARM[0] * k, WARM[1] * k, WARM[2] * k, 1.0)


TEAL_L = GLOW["teal"]
for s0, s1, inner in ((14.9, 16.4, 16.4), (21.6, 23.1, 21.6)):
    K.fbox(AF, (D, "steel", 0), s0, s1, 0.0, 3.75, 0.14, 0.82, col=PORTAL)
    AF.box((D, "dark", 1), s0 + 0.24, s1 - 0.24, 0.55, 3.25, 0.82, 0.85)
    # The show's thin cyan down the jambs, either side of the panel.
    for e in (s0 + 0.2, s1 - 0.28):
        K.fbox(AF, (D, "neon_cyan", 0), e, e + 0.08, 0.4, 3.4, 0.82, 0.86)
    for sv in (s0 + 0.42, s1 - 0.42):
        for k in range(8):
            AF.box((D, "metal", 1), sv - 0.035, sv + 0.035, 0.62 + k * 0.36, 0.69 + k * 0.36, 0.85, 0.89)
    # The slot in its inner face, a warm bar in it.
    d_ = 0.03 if inner == 16.4 else -0.03
    AF.box((D, "glow", 0), min(inner, inner + d_), max(inner, inner + d_), 0.35, 3.45, 0.36, 0.6, col=warm(0.85))
    # The ram.
    sc_ = s0 + 0.75
    pipe((D, "metal", 1), AF.p(AF.at(sc_ - 0.12), 0.6, 0.95), AF.p(AF.at(sc_ + 0.05), 2.3, 0.95), 0.1, segs=8, caps=True)
    pipe((D, "steel", 1), AF.p(AF.at(sc_ + 0.05), 2.3, 0.95), AF.p(AF.at(sc_ + 0.14), 3.3, 0.95), 0.05, segs=6, col=(0.42, 0.44, 0.47, 1))
    for yy in (0.6, 3.3):
        AF.box((D, "steel", 1), sc_ - 0.24, sc_ + 0.24, yy - 0.12, yy + 0.12, 0.82, 1.0, col=PORTAL)
# The lintel, slotted, a warm bar in its middle slot, two under it.
K.fbox(AF, (D, "steel", 0), 14.7, 23.3, 3.75, 4.6, 0.14, 0.95, col=PORTAL, bottom=True)
for yy in (3.97, 4.18, 4.39):
    AF.quad((D, "trim", 1), 14.9, 23.1, yy, yy + 0.08, 0.952, col=K.BLACK)
AF.box((D, "glow", 0), 15.3, 22.7, 4.19, 4.25, 0.952, 0.975, col=warm(0.9))
for w0 in (0.3, 0.66):
    AF.box((D, "glow", 0), 16.6, 21.4, 3.72, 3.75, w0, w0 + 0.08, col=warm(0.8))
K.fbox(AF, (D, "hazard", 1), 15.2, 22.8, 3.75, 3.84, 0.95, 0.965)
for k in range(14):
    sv = 15.0 + k * 0.6
    AF.box((D, "metal", 1), sv - 0.04, sv + 0.04, 4.5, 4.57, 0.95, 0.98)
# Brackets in the opening's top corners, stepped, a bolt in each.
for sa, sd in ((16.4, 1.0), (21.6, -1.0)):
    for (u0, u1, y0_, y1_) in ((0.0, 0.85, 3.42, 3.75), (0.0, 0.45, 3.02, 3.42)):
        AF.box((D, "steel", 0), min(sa + sd * u0, sa + sd * u1), max(sa + sd * u0, sa + sd * u1), y0_, y1_, 0.25, 0.82, col=PORTAL)
    AF.box((D, "metal", 1), sa + sd * 0.25 - 0.06, sa + sd * 0.25 + 0.06, 3.5, 3.62, 0.82, 0.86)
# The frames down the recess, each a step smaller.
RINGS = [(-0.35, 16.6, 21.4, 3.3, "warm"), (-0.9, 16.95, 21.05, 3.18, "warm"), (-1.45, 17.35, 20.65, 3.06, "teal"), (-2.0, 17.8, 20.2, 2.95, "teal")]
for w1, so0, so1, top, hue in RINGS:
    w0 = w1 - 0.2
    AF.box((D, "steel", 0), 16.3, so0, 0.0, 3.5, w0, w1, col=PORTAL)
    AF.box((D, "steel", 0), so1, 21.7, 0.0, 3.5, w0, w1, col=PORTAL)
    AF.box((D, "steel", 0), so0, so1, top, 3.5, w0, w1, col=PORTAL)
    col_ = warm(0.7) if hue == "warm" else (TEAL_L[0] * 0.55, TEAL_L[1] * 0.55, TEAL_L[2] * 0.55, 1)
    AF.box((D, "glow", 0), so0, so0 + 0.03, 0.3, top - 0.12, w0 + 0.05, w1 - 0.05, col=col_)
    AF.box((D, "glow", 0), so1 - 0.03, so1, 0.3, top - 0.12, w0 + 0.05, w1 - 0.05, col=col_)
    AF.box((D, "glow", 0), so0 + 0.12, so1 - 0.12, top - 0.03, top, w0 + 0.05, w1 - 0.05, col=col_)
    AF.quad((D, "trim", 1), 16.3, so0, 1.2, 1.26, w1 + 0.003, col=K.BLACK)
    AF.quad((D, "trim", 1), so1, 21.7, 1.2, 1.26, w1 + 0.003, col=K.BLACK)
# Warm bars let into the recess's ceiling between the frames.
for wa, wb in ((-0.33, -0.12), (-0.88, -0.6), (-1.43, -1.15)):
    AF.box((D, "glow", 0), 16.6, 21.4, 3.47, 3.5, wa, wb, col=warm(0.55))
K.fbox(AF, (D, "trim", 0), 16.3, 21.7, 3.5, SHOP_H, -2.4, 0.14, col=DARK, bottom=True)
zs, zn = AF.at(16.5), AF.at(21.5)
box((D, "neon_yellow", 0), 425.7, 428.0, 3.42, 3.5, zn - 0.08, zn, scale=1.0)
box((D, "neon_yellow", 0), 425.7, 428.0, 3.42, 3.5, zs, zs + 0.08, scale=1.0)
light(D, 427.0, 3.0, AF.at(DOOR_S), "yellow", 3.5)
light(D, 427.0, 3.0, AF.at(DOOR_S - 1.4), "green", 2.5)
# The club's doors, slid open into their pockets, and the frame they run in.
AF.box((D, "metal", 1), 17.7, 17.82, G0, 2.95, -2.4, -2.2)
AF.box((D, "metal", 1), 20.18, 20.3, G0, 2.95, -2.4, -2.2)
for a_, b_ in ((17.0, 17.86), (20.14, 21.0)):
    AF.box((D, "steel", 0), a_, b_, G0, 2.86, -2.27, -2.12, col=PORTAL)
# The corridor beyond (x 421 to 425.6; rooftop.py leaves the block's dark
# ground floor open for it): teal walls ribbed in steel, brighter toward its
# end, a dark floor, warm bars across its ceiling, a warm end wall.
CZA, CZB = AF.at(20.18), AF.at(17.82)      # its north and south walls
CXA, CXB = 421.0, 425.6
quad((D, "trim", 0), (CXA, G0 + 0.002, CZB), (CXB, G0 + 0.002, CZB), (CXB, G0 + 0.002, CZA), (CXA, G0 + 0.002, CZA), col=(0.03, 0.04, 0.045, 1))
quad((D, "trim", 0), (CXA, 2.95, CZA), (CXB, 2.95, CZA), (CXB, 2.95, CZB), (CXA, 2.95, CZB), col=(0.02, 0.022, 0.026, 1))


def tl(k):
    return (TEAL_L[0] * k, TEAL_L[1] * k, TEAL_L[2] * k, 1.0)


for zw, sd in ((CZA, 1.0), (CZB, -1.0)):
    zq = zw + sd * 0.002
    pts = [(CXA, G0, zq), (CXB, G0, zq), (CXB, 2.95, zq), (CXA, 2.95, zq)]
    cols = [tl(0.16), tl(0.06), tl(0.07), tl(0.2)]
    K.vpoly((D, "glow", 0), pts if sd > 0 else pts[::-1], cols if sd > 0 else cols[::-1])
    x_ = CXA + 0.35
    while x_ < CXB - 0.2:
        box((D, "steel", 1), x_ - 0.05, x_ + 0.05, G0, 2.95, min(zw, zw + sd * 0.12), max(zw, zw + sd * 0.12), scale=1.0, col=PORTAL)
        x_ += 0.65
for x_ in (421.6, 422.5, 423.4, 424.3, 425.2):
    box((D, "glow", 0), x_ - 0.06, x_ + 0.06, 2.9, 2.95, CZB + 0.15, CZA - 0.15, scale=1.0, col=warm(0.75))
quad((D, "glow", 0), (CXA + 0.002, G0, CZB), (CXA + 0.002, G0, CZA), (CXA + 0.002, 2.95, CZA), (CXA + 0.002, 2.95, CZB), col=warm(0.42))
quad((D, "trim", 1), (CXA + 0.004, G0, CZB), (CXA + 0.004, G0, CZA), (CXA + 0.004, 0.75, CZA), (CXA + 0.004, 0.75, CZB), col=(0.06, 0.05, 0.04, 1))
stand(421.8, AF.at(18.4), math.pi / 2 + 0.3, "talk", y=G0)
stand(421.9, AF.at(19.6), -math.pi / 2 - 0.2 + math.pi, "idle", y=G0)
light(D, 423.4, 0.5, AF.at(DOOR_S), "amber", 2.5)
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
# (In two runs, either side of the slab over the door, which hides it there:
# the site pools a strip's light where its triangles' middles are, and one
# run the length of the block pooled all of its pink at the door.)
for z0_, z1_ in ((-299.7, -287.7), (-274.3, -262.3)):
    box((D, "neon_pink", 0), WK + 0.1, WK + 0.14, 4.2, 4.28, z0_, z1_, scale=1.0)
for sv in (0.3, 6.7, 13.0, 15.9, 22.1, 34.7, 37.7):
    a_ = AF.p(AF.at(sv), 2.9, 0.15 if 15 < sv < 23 else 0.02)
    pipe((D, "metal", 0), a_, (WK - 0.15, 4.45, a_[2]), 0.07, segs=5)
for k in range(10):
    sv = 1.9 + 3.8 * k
    if not 14.0 < sv < 24.0:
        K.downlight(D, 430.0, AF.at(sv), SHOP_H - 0.01, "amber" if k % 3 else "white", power=1.6)
# (Over the door's bay the soffit itself is lit, in the sign's yellow-green.)
# (Coffered: deep steel beams across it, a warm bar down each coffer, the
# lime between them as before, so the doorway floods as the show's does.)
lit_soffit(428.3, 431.7, AF.at(22.6), AF.at(15.4), SHOP_H - 0.02, 0.45, 0.26)
# (Its beams run along the street, so seen from up the street, as the
# Garage section's shot is, they hide none of the light between them.)
WB_ = (0.3, 1.12, 1.94, 2.76, 3.58)
for w_ in WB_:
    AF.box((D, "steel", 0), 15.4, 22.6, SHOP_H - 0.24, SHOP_H - 0.02, w_ - 0.06, w_ + 0.06, col=PORTAL)
for sv in (15.45, 19.0, 22.55):
    AF.box((D, "steel", 0), sv - 0.06, sv + 0.06, SHOP_H - 0.12, SHOP_H - 0.02, 0.3, 3.58, col=PORTAL)
for k, (w0_, w1_) in enumerate(zip(WB_, WB_[1:])):
    if k % 2 == 0:
        # A warm white coffer, a lime one beside it.
        quad((D, "glow", 0), (WL + w0_ + 0.06, SHOP_H - 0.026, AF.at(22.6)), (WL + w1_ - 0.06, SHOP_H - 0.026, AF.at(22.6)),
             (WL + w1_ - 0.06, SHOP_H - 0.026, AF.at(15.4)), (WL + w0_ + 0.06, SHOP_H - 0.026, AF.at(15.4)), col=warm(0.4))
    else:
        AF.box((D, "glow", 0), 15.6, 22.4, SHOP_H - 0.05, SHOP_H - 0.025, (w0_ + w1_) / 2 - 0.05, (w0_ + w1_) / 2 + 0.05, col=warm(0.8))
light(D, 430.0, 3.8, AF.at(DOOR_S), "yellow", 4.0)
light(D, 430.0, 3.8, AF.at(DOOR_S + 2.2), "green", 3.0)
# The name over the door, as the show hangs it: a slab of yellow-green
# light standing out over the kerb, lit underneath, and on its edge the
# name in a steel frame strutted back to the wall and fed by two cables,
# with an arrow at each end in the slab's own light, pointing down at the
# door.
CX0, CX1, CZ0, CZ1 = WK, WK + 1.5, -287.6, -274.4
box((D, "steel", 0), CX0, CX1, 3.95, 4.72, CZ0, CZ1, scale=1.0, col=PORTAL, bottom=True)
# (Held to a middle strength: the Garage section's own shot looks up at
# this slab from the street, where at full strength (0.28, 0.55) it was
# the brightest thing in the frame, and at a tenth of that the club's
# front did not glow as the show's does.)
lit_soffit(CX0 + 0.12, CX1 - 0.12, CZ0 + 0.12, CZ1 - 0.12, 3.945, 0.07, 0.15)
CF = B.Face("+x", CX1, CZ0, CZ1)           # its edge to the street; s runs north from its south end
CF.quad((D, "glow", 0), 0.15, 13.05, 4.05, 4.62, 0.012, col=yg(0.3))
for f_ in (B.Face("-z", CZ0, CX0, CX1), B.Face("+z", CZ1, CX0, CX1)):
    f_.quad((D, "glow", 0), 0.12, 1.38, 4.05, 4.62, 0.012, col=yg(0.3))
light(D, CX1 - 0.6, 3.5, -284.0, "yellow", 4.0)
light(D, CX1 - 0.6, 3.5, -278.0, "green", 3.2)
sign("afterlife_b", CX1 + 0.1, 5.85, -281.0, 8.67, 2.0, math.pi / 2, preview="AFTERLIFE", district=D)
CF.box((D, "steel", 0), 2.16, 11.04, 4.8, 6.9, -0.02, 0.08, col=PORTAL)
for (a_, b_, y0_, y1_) in ((2.1, 11.1, 6.88, 7.0), (2.1, 11.1, 4.72, 4.84), (2.1, 2.22, 4.84, 6.88), (10.98, 11.1, 4.84, 6.88)):
    CF.box((D, "steel", 0), a_, b_, y0_, y1_, -0.04, 0.2, col=FRAME)
for sv in (2.5, 5.2, 8.0, 10.7):
    pipe((D, "steel", 1), CF.p(CF.at(sv), 6.94, 0.0), (WK + 0.02, 8.05, CF.at(sv)), 0.04, segs=4, col=FRAME)
    pipe((D, "steel", 1), CF.p(CF.at(sv), 5.9, -0.04), (WK + 0.02, 5.9, CF.at(sv)), 0.03, segs=4, col=FRAME)
for sv in (2.4, 10.8):
    box((D, "dark", 1), WK, WK + 0.14, 8.9, 9.4, CF.at(sv) - 0.2, CF.at(sv) + 0.2, scale=1.0)
    K.cable(D, (WK + 0.1, 8.95, CF.at(sv)), CF.p(CF.at(sv), 6.98, 0.05), 0.35, r=0.025, steps=5)
for a_ in (0.1, 11.25):
    m_ = a_ + 0.925
    CF.box((D, "steel", 0), a_, a_ + 1.85, 4.72, 6.96, -0.04, 0.05, col=FRAME)
    CF.quad((D, "glow", 0), a_ + 0.1, a_ + 1.75, 4.84, 6.84, 0.06, col=yg(0.35))
    CF.quad((D, "trim", 1), m_ - 0.2, m_ + 0.2, 5.8, 6.55, 0.07, col=K.BLACK)
    poly((D, "trim", 1), [CF.p(CF.at(sv), yy, 0.07) for sv, yy in ((m_ - 0.58, 5.8), (m_, 5.12), (m_ + 0.58, 5.8))], [(0, 0), (0.5, 1), (1, 0)], K.BLACK)
# Over the name, the sign the show hangs there (BnnbP7pCIvQ@24): AFTERLIFE in
# slanted block capitals a storey high, cut from plate and lit in the slab's
# own yellow-green, standing on a bar of the same light whose south end runs
# out past the slab in a point from the A's foot, like a bolt. Channel
# letters on two steel rails, posts down to the slab behind the name, struts
# back to the wall.
# (Each a can with its lit face set back a hand's breadth inside its returns:
# from the street in front the whole name shows; along the wall, as the
# Garage section's shot looks up the street, the returns hide most of it.)
LIT, RETURN, INSIDE = yg(0.3), yg(0.02), yg(0.03)
LY0, LH = 7.46, 3.0
NAME = K.block_word("AFTERLIFE", 0.5, LY0, LH, 1.2, 0.22)
NAME += [[(0.95, 7.04), (12.92, 7.04), (12.99, 7.36), (1.02, 7.36)],      # the bar
         [(-1.1, 6.72), (0.95, 7.04), (1.02, 7.36), (0.5, 7.36)],         # its point
         [(0.5, 7.36), (0.86, 7.36), (0.86, LY0), (0.5, LY0)]]            # the A's foot on it
K.plates(D, CF, NAME, 0.04, 0.42, LIT, RETURN, INSIDE, recess=0.16)
for y_ in (8.02, 9.82):
    CF.box((D, "steel", 0), 0.3, 13.0, y_, y_ + 0.1, -0.05, 0.04, col=FRAME)
for sv in (0.7, 4.6, 8.6, 12.5):
    CF.box((D, "steel", 0), sv - 0.06, sv + 0.06, 4.72, 10.3, -0.17, -0.05, col=FRAME)
    pipe((D, "steel", 1), CF.p(CF.at(sv), 9.87, -0.11), (WK + 0.02, 10.7, CF.at(sv)), 0.04, segs=4, col=FRAME)
K.cable(D, (WK + 0.1, 9.3, CF.at(10.8)), CF.p(CF.at(11.6), 9.9, -0.05), 0.3, r=0.025, steps=5)
# Its green in the doorway. The letters and the slab are drawn but are not in
# the light the site bakes (the pink name is, as lilac over the whole front,
# and the cyan strips), so the sign's light is set where nothing sees it:
# panes of green and yellow under the paving of the recess, face down, which
# the bake pools on the ground over them as it does any sign's. Low, so the
# light lies on the recess, the carpet, the jambs' feet and whoever stands
# at the door, falls off across the pavement to the kerb, and is gone eight
# metres from the door; and the wall over the arcade takes less of the
# name's lilac than it did, not more.
DZ = AF.at(DOOR_S)
for k in range(12):
    xa, za = 425.7 + (k % 2) * 1.35, DZ - 2.3 + (k // 2 % 2) * 2.3
    quad((D, "neon_green" if k % 5 < 3 else "neon_yellow", 0), (xa, -0.05 - 0.01 * (k // 4), za), (xa + 1.35, -0.05 - 0.01 * (k // 4), za),
         (xa + 1.35, -0.05 - 0.01 * (k // 4), za + 2.3), (xa, -0.05 - 0.01 * (k // 4), za + 2.3))
light(D, 427.0, 0.5, DZ, "green", 5.0)
for dz_, hue_ in ((-1.6, "yellow"), (0.0, "green"), (1.6, "yellow")):
    light(D, 429.6, 0.5, DZ + dz_, hue_, 3.0)
# The queue's bay has its own, white and low, so the line is seen from the
# street.
light(D, 428.4, 2.4, AF.at(25.5), "white", 2.5)
light(D, 428.4, 2.4, AF.at(30.5), "amber", 2.0)
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
# (Its wall is painted, as AFTERLIFE's opposite is: flats with their grime,
# balconies and plants, not a grid of lit panes; rooftop.py paints all four.)
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
K.lit_door(D, RB, 17.6, "green", w=1.1, h=2.4, power=4.5, back=0.92)
RB.box((D, "neon_white", 0), 13.4, 21.8, 3.72, 4.0, 0.0, 0.06)
cx_, _, cz_ = RB.p(RB.at(17.6), 0.0, 1.0)
K.cross(D, cx_, 6.2, cz_, 1.4, 0.0, "green")
pipe((D, "metal", 1), (EL, 7.0, cz_), (cx_ - 0.4, 7.0, cz_), 0.04, segs=4)
K.board(D, *RB.p(RB.at(20.6), 5.3, 0.1), "ps", RB.yaw)
K.dress(D, RB, 34.0, rr, dict(ST, ledge_every=0, balcony=0.0, ac=0.3, cornice=1.0), RB_TINT, escape=31.5)
K.pipe_bundle(D, RB, 23.0, 41.4, 5.05, rr, n=3)
# AFTERLIFE's block has its own fire escape in the same steel, north of the
# entrance.
K.fire_stairs(D, B.Face("+x", WK, -300.0, -262.0), 30.0, SHOP_H + 0.5, 27.0)
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

# The garage's own front (Zq4zTcIM0yQ@41, the show's low workshop): an
# orange band over the ground floor and along the coping, the kerb painted
# to match, louvres, wall units, runs of pipe, hazard stripes up the bay's
# jambs, BAY 01 in a steel frame hung from a rail on brackets with the
# cable to its lamps, an awning over the office, and on the forecourt a
# tool cart and oil drums clear of the car's way in.
GF = B.Face("-x", EL, -230.0, -200.0)      # s runs south from its north end; the bay's door is s 12..18
rg = random.Random(9214)
OR = K.ORANGE
GF.box((D, "steel", 0), 0.0, 30.0, SHOP_H + 0.02, SHOP_H + 0.5, 0.0, 0.13, col=OR)
GF.box((D, "steel", 0), 0.0, 30.0, 8.5, 8.88, 0.0, 0.06, col=OR)
for z0_, z1_ in ((-230.0, -220.5), (-209.5, -200.0)):
    quad((D, "trim", 1), (EK, G0 + 0.006, z1_), (EK + 0.3, G0 + 0.006, z1_), (EK + 0.3, G0 + 0.006, z0_), (EK, G0 + 0.006, z0_), col=OR)
for a_, b_ in ((11.38, 11.82), (18.18, 18.62)):
    K.stripes(D, GF, a_, b_, 0.36, SHOP_H)
K.louvre(D, GF, 7.9, 9.9, 1.3, 3.3)
for a_ in (20.4, 23.0):
    K.louvre(D, GF, a_, a_ + 2.0, 5.5, 6.7)
for sv, yy in ((2.6, 5.45), (5.4, 5.45), (8.9, 5.6), (26.4, 5.5), (28.4, 5.5)):
    ax_, _, az_ = GF.p(GF.at(sv), yy, 0.0)
    P.place("ac_wall", ax_, yy, az_, GF.yaw, district=D)
    GF.quad((D, "trim", 1), sv - 0.08, sv + 0.1, yy - 0.75, yy, 0.136 if yy - 0.75 < SHOP_H + 0.5 else 0.012, col=K.RUST_DARK)
K.pipe_bundle(D, GF, 0.4, 10.4, 6.8, rg, n=3)
K.pipe_bundle(D, GF, 19.7, 29.6, 6.95, rg, n=2)
P.place("pipe_v", EL, 0.0, -200.35, GF.yaw, sy=8.9, district=D)
# BAY 01's frame (the sign itself is the garage's, 4.4 by 1.1 at 6.25 m, a
# hand's breadth off the wall): a board behind the letters, an orange
# steel frame round them, a rail over it on two brackets with hangers down
# to the frame, stays under it, and the cable out to the lamp either side.
GF.box((D, "board_frame", 0), 12.66, 17.34, 5.56, 6.94, 0.03, 0.15)
for (a_, b_, y0_, y1_) in ((12.6, 17.4, 6.88, 7.0), (12.6, 17.4, 5.5, 5.62), (12.6, 12.72, 5.62, 6.88), (17.28, 17.4, 5.62, 6.88)):
    GF.box((D, "steel", 0), a_, b_, y0_, y1_, 0.03, 0.25, col=OR)
pipe((D, "steel", 0), GF.p(GF.at(12.2), 7.32, 0.3), GF.p(GF.at(17.8), 7.32, 0.3), 0.045, segs=5, col=K.STEEL)
for sv in (12.9, 17.1):
    GF.box((D, "steel", 1), sv - 0.04, sv + 0.04, 7.26, 7.38, 0.0, 0.36, col=K.STEEL)
    pipe((D, "steel", 1), GF.p(GF.at(sv), 7.3, 0.3), GF.p(GF.at(sv), 7.0, 0.16), 0.025, segs=4, col=K.STEEL)
    pipe((D, "steel", 1), GF.p(GF.at(sv), 5.5, 0.2), GF.p(GF.at(sv), 5.14, 0.14), 0.025, segs=4, col=K.STEEL)
K.cable(D, GF.p(GF.at(17.4), 5.62, 0.2), GF.p(GF.at(19.0), 5.5, 0.25), 0.22, r=0.02, steps=5)
K.cable(D, GF.p(GF.at(12.6), 5.62, 0.2), GF.p(GF.at(11.0), 5.5, 0.25), 0.22, r=0.02, steps=5)
K.awning(D, GF, 21.5, 28.7, col=K.RUST, out=1.5, y=3.25)
# Its upper storey (the m6 review: "a mostly blank grey band with three
# black boxes"): the office's windows lit behind blinds between the units,
# MOTOR in tube over them, a board and a blade, a duct from a vent up to the
# roof, cables slung along under the coping, two lamps over the apron, a
# camera on the corner. All within half a metre of the wall south of the
# door, where the page flies out over the roof to Contact.
for sv in (3.45, 6.55):
    K.window(D, GF, sv, 5.62, rg, lit=1.0, style=3, over="blind", out=0.05)
K.word(D, *GF.p(GF.at(4.2), 7.75, 0.12), 4.6, 0.85, GF.yaw, "amber", "MOTOR", underline="pink", r=0.045)
with own_ids(95400):
    K.board(D, *GF.p(GF.at(27.3), 7.55, 0.1), "pm", GF.yaw)
    K.blade(D, EL, GF.at(0.25), 6.4, "bm", GF.yaw - 0.35)
GF.box((D, "metal", 1), 10.25, 11.05, 4.75, 8.45, 0.0, 0.4)
GF.box((D, "metal", 1), 10.05, 11.25, 5.2, 5.95, 0.0, 0.45)
for k in range(4):
    GF.box((D, "dark", 1), 10.12, 11.18, 5.3 + k * 0.16, 5.36 + k * 0.16, 0.45, 0.47)
for a_, b_, y_ in ((0.2, 10.0, 8.15), (19.4, 29.8, 8.2)):
    K.cable(D, GF.p(GF.at(a_), y_, 0.08), GF.p(GF.at(b_), y_ + 0.05, 0.08), 0.32, r=0.022, steps=7)
    K.cable(D, GF.p(GF.at(a_ + 0.4), y_ - 0.1, 0.1), GF.p(GF.at(b_ - 0.6), y_ - 0.05, 0.1), 0.45, r=0.018, steps=7)
for sv in (11.6, 18.4):
    GF.box((D, "metal", 1), sv - 0.04, sv + 0.04, 7.6, 7.68, 0.0, 0.55)
    GF.box((D, "glow", 0), sv - 0.18, sv + 0.18, 7.45, 7.6, 0.35, 0.6, col=GLOW["white"])
# (Their light is the shut door's own lamp's: thrown on the shutter, which
# takes light strongly, they made it the brightest thing on the street.)
GF.box((D, "metal", 1), 0.05, 0.35, 7.9, 8.1, 0.0, 0.3)
GF.box((D, "dark", 1), 0.08, 0.32, 7.65, 7.9, 0.2, 0.5)
# The forecourt: a tool cart by the office window, drums by the wall.
tx_, tz_ = 451.15, -208.9
box((D, "tool_red", 1), tx_ - 0.3, tx_ + 0.3, G0 + 0.14, G0 + 0.95, tz_ - 0.45, tz_ + 0.45, scale=1.0)
box((D, "metal", 1), tx_ - 0.34, tx_ + 0.34, G0 + 0.95, G0 + 1.0, tz_ - 0.49, tz_ + 0.49, scale=1.0)
for k in range(3):
    box((D, "dark", 1), tx_ - 0.315, tx_ - 0.3, G0 + 0.32 + k * 0.2, G0 + 0.35 + k * 0.2, tz_ - 0.4, tz_ + 0.4, scale=1.0)
for dz_ in (-0.36, 0.36):
    cylinder((D, "dark", 1), tx_, tz_ + dz_, G0, G0 + 0.14, 0.07, segs=6)
box((D, "trim", 1), tx_ - 0.2, tx_ + 0.15, G0 + 1.0, G0 + 1.2, tz_ - 0.3, tz_ + 0.1, scale=1.0, col=K.PLASTIC[0])
for (x_, z_) in ((451.45, -221.3), (451.4, -220.5)):
    P.place("drum", x_, G0, z_, district=D)

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
        if k == 5:
            continue   # (that bay is shuttered, below)
        WB.box((D, "metal", 1), d_ - 0.62, d_ + 0.62, G0, 2.5, 0.0, 0.11)
        WB.quad((D, "door", 0), d_ - 0.52, d_ + 0.52, G0, 2.38, 0.115)
for a_, b_ in ((0.0, 4.0), (56.0, 60.0)):
    WB.quad((D, "concrete", 0), a_, b_, 0.0, SHOP_H, 0.02, uvs=((0, 0), (1.3, 0), (1.3, 1.5), (0, 1.5)))
# (garage.py lights its ground floor as one long window, which read as one
# shop's front repeated bay after bay, "green panels each with the same
# white cross": each bay its own now. Most a shop of their own behind the
# glass, a hair in front of the long one; one behind bars, one with its
# posters in the glass, one walled with a door open on a lit stair and a
# menu box, one shuttered with a serving hatch lit in it.)
for k, (a_, b_) in enumerate(zip(PIERS, PIERS[1:])):
    a_, b_ = a_ + 0.25, b_ - 0.25
    if k == 2:
        WB.quad((D, "concrete", 0), a_, b_, 0.62, 3.3, 0.06, uvs=((0, 0), (2.0, 0), (2.0, 1.0), (0, 1.0)))
        K.lit_door(D, WB, a_ + 1.6, "amber", w=1.1, h=2.3, power=3.0)
        WB.box((D, "board_frame", 0), a_ + 3.0, b_ - 0.6, 1.3, 2.6, 0.06, 0.16)
        WB.quad((D, "billboard", 0), a_ + 3.08, b_ - 0.68, 1.38, 2.52, 0.172, col=(0.385, 0.635, 0.4, 1.0))
        continue
    if k == 5:
        K.shutter(D, WB, a_, a_ + 3.2, h=3.2, lamp=None)
        WB.quad((D, "shop", 0), a_ + 3.4, b_, 0.62, 2.6, 0.06, col=(0.9, 0.57, 1.0, 1.0))
        WB.box((D, "metal", 1), a_ + 3.3, b_, 0.95, 1.05, 0.06, 0.45)
        WB.quad((D, "door_panel", 0), a_ + 3.4, b_, 2.6, 3.3, 0.06)
        continue
    WB.quad((D, "shop", 0), a_, b_, 0.62, 3.3, 0.06, col=((0.95, 0.12, 1.0, 1.0), (0.85, 0.37, 1.0, 1.0), None, (0.9, 0.62, 1.0, 1.0),
                                                       (0.8, 0.88, 1.0, 1.0), None, (1.0, 0.25, 1.0, 1.0), (0.92, 0.75, 1.0, 1.0))[k])
    if k == 3:
        K.grille(D, WB, a_, b_, 0.62, 3.3, out=0.12, step=0.16)
    elif k == 7:
        for sv, w_ in ((a_ + 0.9, 1.0), (a_ + 2.4, 0.8), (b_ - 1.2, 1.1)):
            WB.quad((D, "billboard", 0), sv - w_ / 2, sv + w_ / 2, 1.0, 1.0 + w_ * 1.4, 0.08, col=(rw.randrange(8) / 8 + 0.01, rw.randrange(8) / 8 + 0.01, rw.random(), 1.0))
    elif k == 0:
        WB.box((D, "metal", 1), a_, b_, 1.6, 1.66, 0.06, 0.1)
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
K.lit_door(D, BAR, 6.0, "green", w=1.1, h=2.38, power=5.0, back=0.89)
K.word(D, WL + 0.75, 6.75, -258.75, 6.2, 2.9, math.radians(135), "pink", ["NEKO", "BAR"], underline="white", r=0.06, mark="glass")
for p_ in ((WL, 7.6, -255.6), (WL - 2.6, 7.6, -258.0), (WL, 5.6, -255.6), (WL - 2.6, 5.6, -258.0)):
    pipe((D, "metal", 1), p_, (WL + 0.7 + (0.9 if p_[2] > -257 else -1.1), p_[1], -258.7 + (1.1 if p_[2] > -257 else -0.9)), 0.04, segs=4)
box((D, "neon_pink", 0), WL, WL + 0.05, 7.62, 7.7, -257.8, -250.2, scale=1.0)
box((D, "neon_pink", 0), 416.2, WL, 7.62, 7.7, -258.05, -258.0, scale=1.0)
BL = B.Face("-z", -258.0, 416.0, WL)       # its face on the lane
K.blade(D, 423.0, -258.0, 6.2, "bx", BL.yaw + 0.4)
stand(WL - 0.55, BAR.at(5.2), math.pi / 2 + 0.3, "smoke", y=G0)
stand(WL - 0.5, BAR.at(6.9), math.pi / 2 - 0.4, "talk", y=G0)
# The corner house on the boulevard has its own, in two colours.
K.word(D, WL + 0.45, 6.5, -316.45, 4.2, 1.9, math.radians(135), "amber", "TAKO", underline="cyan")
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
# (None where the page's flight comes down the street past the bridge.)
for i, (x_, z_) in enumerate(((436.4, -303.0), (444.5, -286.5), (443.6, -196.5))):
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
for z_ in (-197.2,):
    K.bundle(D, (WL, cr.uniform(10.5, 12.5), z_), (EL, 6.7, z_ + cr.uniform(-1.0, 1.0)), cr.uniform(0.6, 1.1), 4, cr)
# A pipe gantry over the street's south end, where the tall blocks stop and
# the tanks' district begins: two steel posts, a truss between them, three
# painted pipes on it running out of the west block and down onto the low
# roof east, a board and two lamps under it, a red lamp on each post.
GZ_, GANTRY = -193.5, (0.16, 0.115, 0.05, 1)
for x_ in (428.5, 451.55):
    box((D, "steel", 0), x_ - 0.16, x_ + 0.16, G0, 10.9, GZ_ - 0.16, GZ_ + 0.16, scale=1.0, col=GANTRY)
    box((D, "hazard", 1), x_ - 0.175, x_ + 0.175, G0, G0 + 1.1, GZ_ - 0.175, GZ_ + 0.175, scale=1.0)
    box((D, "glow", 0), x_ - 0.09, x_ + 0.09, 10.9, 11.08, GZ_ - 0.09, GZ_ + 0.09, scale=0.5, col=GLOW["red"])
for y_ in (9.3, 10.6):
    box((D, "steel", 0), 428.34, 451.71, y_ - 0.09, y_ + 0.09, GZ_ - 0.11, GZ_ + 0.11, scale=1.0, col=GANTRY, bottom=True)
for k in range(10):
    xa_, xb_ = 428.66 + k * 2.289, 428.66 + (k + 1) * 2.289
    pipe((D, "steel", 1), (xa_, 9.3, GZ_), (xb_, 10.6, GZ_) if k % 2 == 0 else (xb_, 9.3, GZ_), 0.05, segs=4, col=GANTRY)
    if k % 2:
        pipe((D, "steel", 1), (xa_, 10.6, GZ_), (xb_, 9.3, GZ_), 0.05, segs=4, col=GANTRY)
for dz_, rad_, col_ in ((-0.42, 0.2, K.PIPE_PAINT[1]), (0.0, 0.13, K.PIPE_PAINT[3]), (0.4, 0.23, K.PIPE_PAINT[2])):
    yy_ = 10.69 + rad_
    pipe((D, "steel", 0), (WL, yy_, GZ_ + dz_), (455.0, yy_, GZ_ + dz_), rad_, segs=7, col=col_)
    pipe((D, "steel", 0), (455.0, yy_, GZ_ + dz_), (455.0, 7.0, GZ_ + dz_), rad_, segs=7, col=col_)
box((D, "hazard", 1), 437.0, 443.0, 8.72, 9.21, GZ_ - 0.05, GZ_ + 0.05, scale=1.0)
for z_, yaw_ in ((GZ_ - 0.07, math.pi), (GZ_ + 0.07, 0.0)):
    K.board(D, 440.0, 8.96, z_, "ps", yaw_, frame=0)
for x_ in (435.0, 445.0):
    K.downlight(D, x_, GZ_, 9.21, "amber", size=0.4, power=5.0)
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
K.parapet(D, 380.0, 398.0, -316.0, -300.0, storeys(6), T["navy"], line="cyan", rim="white")
B.building(B.Lot(383.0, 395.0, -313.0, -303.0, "-z", {k: "open" for k in ("+x", "-x", "+z", "-z")}, {}, D), storeys(7),
           random.Random(9401), style=dict(WATSON, roof_cap=0.0, balcony=0.0, lit=(0.7, 0.95)), base=storeys(6), signs=False, tint="navy")
K.unit(D, 396.5, -308.0, storeys(6), math.pi / 2, lamp="green")
K.parapet(D, 402.0, WL, -316.0, -300.0, storeys(3), T["concrete"], line="amber", rim="amber")
K.roof_board(D, 416.0, -309.0, storeys(3), 11.0, 5.0, math.radians(158), ro)
K.hut(D, 405.0, -303.0, storeys(3), math.pi, T["concrete"])
K.unit(D, 424.5, -302.5, storeys(3), 0.0, lamp="amber")
K.parapet(D, 380.0, 398.0, -300.0, -276.0, storeys(5), T["teal"], rim="cyan")
K.plant(D, 381.5, 396.5, -298.5, -282.0, storeys(5), ro)
P.place("tank_roof", 392.5, storeys(5), -279.5, 0.4, district=D)
P.place("antenna", 383.0, storeys(5), -278.5, 0.0, district=D)
K.parapet(D, 380.0, 398.0, -276.0, -250.0, storeys(3), T["brown"], line="teal", rim="amber")
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
K.skylights(D, 420.0, 429.0, -292.0, -270.0, 30.0, ro, hue="pink", along="z", n=2, glazed=True)
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
K.parapet(D, EL, 484.0, -344.0, -316.0, storeys(7), T["charcoal"], line="cyan", rim="white")
B.building(B.Lot(461.0, 481.0, -340.0, -321.0, "-x", {k: "open" for k in ("+x", "-x", "+z", "-z")}, {}, D), storeys(9),
           random.Random(9402), style=dict(WATSON, roof_cap=5.0, balcony=0.0, lit=(0.75, 0.95), windows=(5,)), base=storeys(7), signs=False,
           tint="charcoal", crown_band="cyan", roof=True)
K.roof_board(D, 455.6, -330.0, storeys(7), 12.0, 5.4, -math.pi / 2, ro)
K.parapet(D, 484.0, 508.0, -344.0, -316.0, storeys(5), T["navy"], line="amber", rim="amber")
K.pad(D, 497.0, -331.0, storeys(5), rad=7.0)
K.hut(D, 487.0, -319.5, storeys(5), math.pi / 2, T["navy"])
# The clinic's roof: its plant and a small deck.
K.parapet(D, 454.0, 484.0, -312.0, -300.0, storeys(2), T["concrete"], line="green", rim="white")
K.plant(D, 470.5, 483.0, -311.0, -301.0, storeys(2), ro)
K.terrace(D, 456.0, 468.0, -310.8, -302.0, storeys(2), ro, hue="white", planters=False)
# The roof south of the rooftop's own (the first thing under its parapet):
# a deck, a tank, a hut.
K.parapet(D, EL, 476.0, -258.0, -230.0, 22.0, T["plum"], line="teal", rim="cyan")
K.terrace(D, 454.5, 468.5, -255.5, -240.0, 22.0, ro, hue="cyan")
P.place("tank_roof", 472.0, 22.0, -234.5, 0.3, district=D)
K.hut(D, 472.6, -251.5, 22.0, -math.pi / 2, T["plum"])
# The garage's roof, north of where Contact stands on it: skylights over
# the bay, a unit, tyres and crates by the parapet.
K.slab(D, 460.0, 475.4, -229.4, -206.0, 8.0, "concrete", lift=0.1, scale=3.0)
K.skylights(D, 461.0, 472.0, -226.0, -208.0, 8.0, ro, hue="white", along="x", n=3, lit=0.8, glazed=True)
K.unit(D, 473.2, -227.4, 8.0, math.pi / 2, lamp="green")
K.tyres(D, 457.5, -228.0, 3, y=8.0)
K.crates(D, 459.4, -228.2, ro, n=3, y=8.0)
# Between the skylights, the bay's extract: a duct along each gap with roof
# fans on it, dropping into the roof at its west end, a second condenser, a
# cable tray along the north parapet; and a rail along the roof's north and
# east edges (none where the page flies up over the west parapet to
# Contact, or on the south one, which Contact looks out over).
for z_, fans_ in ((-220.0, (463.0, 467.5, 472.0)), (-214.0, (465.0, 470.0))):
    box((D, "metal", 1), 461.0, 474.2, 8.1, 8.6, z_ - 0.35, z_ + 0.35, scale=1.0)
    box((D, "metal", 1), 460.4, 461.0, 8.1, 8.75, z_ - 0.42, z_ + 0.42, scale=1.0)
    for x_ in (463.9, 466.3, 468.7, 471.1, 473.5):
        box((D, "dark", 1), x_ - 0.03, x_ + 0.03, 8.08, 8.63, z_ - 0.38, z_ + 0.38, scale=1.0)
    for x_ in fans_:
        K.roof_fan(D, x_, z_, 8.6)
K.unit(D, 474.0, -209.0, 8.0, math.pi / 2, w=2.0, lamp="amber")
box((D, "metal", 1), 453.0, 472.0, 8.3, 8.36, -229.55, -229.25, scale=1.0)
for k in range(4):
    pipe((D, "dark", 1), (453.0, 8.4 + 0.012 * k, -229.5 + 0.06 * k), (472.0, 8.4 + 0.012 * k, -229.5 + 0.06 * k), 0.022, segs=3)
K.rail(D, [(452.15, -224.5), (452.15, -229.85), (475.85, -229.85)], 8.9, h=0.95)
K.rail(D, [(475.85, -229.85), (475.85, -204.5)], 8.0, h=1.05)
K.post_light(D, 474.8, -221.0, 8.0, "white", h=0.9, power=5.0)
# The outer row.
OUTER_ROOFS = ("plant", "terrace", "board", "sky", "plant", "sky")
for (z0, z1, n), kind in zip(OUTER, OUTER_ROOFS):
    y_ = storeys(n)
    K.parapet(D, 490.0, 508.0, z0, z1, y_, T["charcoal"], line={"terrace": "teal", "board": "pink", "sky": "amber", "plant": None}[kind]
              if n >= 1 else None, h=0.95 if n >= 1 else 0.4, rim=("amber", "white", "cyan")[int(n) % 3] if n >= 2 else None)
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
    K.back_ground(D, f, r, B.TRIM[T[tint]])
    if clutter:
        own(B.clutter_back, D, f, r, 0.0, top)
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
K.take(AFS, 21.9, 23.7)
# The club's back door, open on its light, kegs and crates by it.
K.lit_door(D, AFW, 22.0, "teal", power=4.0)
K.take(AFW, 21.2, 23.6)
K.kegs(D, 401.3, AFW.at(24.6), rl)
K.crates(D, 401.2, AFW.at(19.4), rl)
# Along the same wall: a cage of gas bottles, a lit window behind its blind,
# a cat ladder to the roof.
K.cage(D, AFW, 11.6, 15.2, rl)
K.window(D, AFW, 16.4, 1.3, rl, lit=1.0, over="blind")
K.ladder(D, AFW, 27.2, 2.5, 29.6, out=0.36)
for a_, b_ in ((11.4, 15.4), (16.2, 17.9), (18.6, 20.2), (24.2, 25.5), (26.8, 27.6)):
    K.take(AFW, a_, b_)
back("-z", -250.0, 410.0, 416.0, 26.0, 9503, clutter=False)
# MILITECH's service door on the yard: a shutter under hazard stripes, a
# camera, a white flood.
MN = B.Face("-z", -250.03, 398.0, 410.0)
MN.quad((D, "concrete", 0), 0.0, 12.0, 0.0, SHOP_H, 0.0, uvs=((0, 0), (4, 0), (4, 1.5), (0, 1.5)))
K.shutter(D, MN, 3.0, 9.0, h=3.6, lamp="white")
MN.box((D, "hazard", 1), 2.8, 9.2, 3.95, 4.2, 0.0, 0.06)
P.place("cctv", 409.3, G0, -250.8, district=D)
lane_tubes([(400.0, -306.0), (400.0, -291.0), (400.0, -277.0), (400.0, -265.0)], 3.9, ("cyan", "cyan", "white", "cyan"))
lane_tubes([(407.0, -260.0), (416.0, -260.0), (424.0, -260.0)], 3.9, ("cyan", "white", "cyan"), along="x")
lane_cables(398.0, 402.0, (-311.0, -299.0, -288.5, -281.0, -270.0), 6.0, 10.0, rl)
lane_cables(-262.0, -258.0, (405.0, 411.0, 419.5), 5.2, 7.4, rl, along="z")
# A sign across each mouth: the alley's on the boulevard, the lane's on the
# street.
box((D, "board_frame", 0), 398.1, 401.9, 4.95, 6.25, -316.15, -316.0, scale=1.0)
K.board(D, 400.0, 5.6, -316.17, "pm", math.pi, frame=0)
box((D, "board_frame", 0), WL - 0.05, WL + 0.1, 4.7, 5.7, -261.9, -258.1, scale=1.0)
K.board(D, WL + 0.12, 5.2, -260.0, "pm", math.pi / 2, frame=0)
box((D, "neon_cyan", 0), WL + 0.1, WL + 0.14, 4.6, 4.68, -261.8, -258.2, scale=1.0)
K.dumpster(D, 409.0, -257.0, math.pi, rl)
K.kegs(D, 414.6, -252.4, rl, n=6)
K.crates(D, 404.0, -251.4, rl)
# East: the passage under its low ceiling, three tubes of cyan, a duct with
# its lamps down one wall, a poster and grilles on the other.
box((D, "castconcrete", 0), EL, 484.0, 4.1, 4.4, -316.0, -312.0, scale=2.0, bottom=True, col=K.LANE_WALL)
lane_tubes([(458.0, -314.0), (468.0, -314.0), (478.0, -314.0)], 3.95, ("cyan", "cyan", "cyan"), power=3.4, along="x", half=1.1)
PN = B.Face("+z", -316.0, EL, 484.0)       # the closing block's wall on it
K.duct(D, PN, 2.0, 30.0, 3.62, rl)
PS = B.Face("-z", -312.0, 454.0, 484.0)    # the clinic's
K.poster(D, PS, 22.0, 2.2, 1.3, 1.8, rl)
K.cage(D, PS, 4.0, 8.8, rl, out=0.8)
K.take(PS, 21.2, 22.8)
K.take(PS, 3.8, 9.0)
box((D, "board_frame", 0), EL - 0.1, EL + 0.05, 4.4, 5.3, -315.9, -312.1, scale=1.0)
K.board(D, EL - 0.12, 4.85, -314.0, "pm", -math.pi / 2, frame=0)
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
K.dumpster(D, 488.8, -236.0, -math.pi / 2, rl)
K.dumpster(D, 485.2, -288.0, math.pi / 2, rl)
lane_tubes([(487.0, -306.0), (487.0, -290.0), (487.0, -274.0), (487.0, -262.0)], 4.2, ("cyan", "cyan", "white", "cyan"))
lane_cables(484.0, 490.0, (-310.0, -296.0, -283.0, -268.0), 6.0, 11.0, rl)
lane_cables(476.0, 490.0, (-246.0, -231.0, -214.0, -196.0, -184.0), 6.5, 9.5, rl)
# A flood on a pole in the yard, a second by the garage's back door.
for (x_, z_, hue_) in ((483.0, -240.0, "white"), (483.5, -207.0, "white")):
    P.place("lamp_short", x_, G0, z_, district=D)
    light(D, x_, 3.6, z_, hue_, 5.0)
# Drain covers down the middle of every lane.
for (x_, z_, yaw_) in ((400.0, -310.0, 0.0), (400.0, -296.0, 0.0), (400.0, -271.0, 0.0), (410.0, -260.0, math.pi / 2), (421.0, -260.0, math.pi / 2),
                       (461.0, -314.0, math.pi / 2), (479.0, -314.0, math.pi / 2), (487.0, -309.0, 0.0), (487.0, -296.5, 0.0), (487.0, -267.0, 0.0),
                       (483.0, -232.0, 0.0), (483.0, -196.0, 0.0)):
    P.place("drain", x_, G0, z_, yaw_, district=D)
# (One lit grate, in the yard; the lanes' steam is their wall vents'.)
K.steam("afterlife_yard", 480.5, G0, -218.0, D)
# The lane's end against the closing block: a gate's worth of clutter.
K.crates(D, 485.0, -317.2, rl)
P.place("bags", 488.8, G0, -317.0, district=D)
# AFTERLIFE's north wall, over the corner house's roof: sold to a billboard
# that faces the boulevard. The rooftop's building has one on its north wall
# too, over the clinic's roof.
B.billboard(D, 415.0, 22.6, -300.32, 15.0, 8.0, math.pi, ro, back=False, depth=0.3)
B.billboard(D, 470.0, 22.5, -300.32, 13.0, 7.0, math.pi, random.Random(9217), back=False, depth=0.3)

# What the lanes' walls carry at a walker's height: both sides of every
# lane, the kept blocks' and the new ones'.
for name, plane, a0, a1, top, dens in (
        ("-x", 402.0 - 0.03, -300.0, -262.0, 30.0, 1.5), ("+x", 398.0, -300.0, -258.0, 14.8, 1.5),
        ("+x", 398.0, -316.0, -300.0, 25.0, 1.5), ("-x", 402.0, -316.0, -300.0, 14.8, 1.5),
        ("+z", -262.0 + 0.03, 402.0, WL, 30.0, 1.5), ("-z", -258.0, 416.0, WL, 8.0, 1.1), ("-x", 416.0, -258.0, -250.0, 8.0, 1.0),
        ("+z", -316.0, EL, 484.0, 28.4, 1.5), ("-z", -312.0, 454.0, 484.0, 11.4, 1.5),
        ("+x", 484.0 + 0.03, -300.0, -258.0, 34.0, 1.4), ("+x", 484.0, -312.0, -300.0, 11.4, 1.4), ("-x", 490.0, -316.0, -258.0, 18.0, 1.4),
        ("+x", 476.0 + 0.03, -258.0, -230.0, 22.0, 1.3), ("+x", 476.0 + 0.03, -200.0, -176.0, 7.0, 1.1), ("-x", 490.0, -258.0, -176.0, 11.0, 1.2)):
    K.lane_wall(D, B.Face(name, plane, a0, a1), rl, top, dens, bundle=(name, a1) != ("+z", 484.0))

# ---------------------------------------------------------------------------
# MILITECH's forecourt on the plaza street (mH2wmyeiIpA@182): a walled court
# under floods, its paving striped yellow up to the lobby, a gate under a
# gantry carrying a red strip and lit boxes, a guard's booth, cube bollards.
# ---------------------------------------------------------------------------
FX0, FX1, FZ0, FZ1 = 380.0, 410.0, -222.0, -190.0
B.ground_rect(D, FX0, FX1, FZ0, FZ1, mat="concrete")
ML = B.Face("+z", FZ0 + 0.03, FX0, FX1)    # MILITECH's face on it: the lobby
# (Offices behind its glass: a storey of the kit's windows, two to a bay,
# over a plinth.)
ML.quad((D, "facade", 0), 4.0, 26.0, 0.5, SHOP_H - 0.7, 0.0, uvs=((0, 7), (10, 7), (10, 8), (0, 8)), col=B.wall_col(1.0, 0, 0.3, T["navy"]))
ML.quad((D, "trim", 0), 4.0, 26.0, 0.0, 0.5, 0.0, col=DARK)
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
for (x_, z_) in ((383.0, -214.0), (404.6, -217.2), (383.0, -198.0), (404.6, -196.4)):
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
# (The megablock's back wall on the court: its ground floor is shops, built
# below; what hangs on it above, and a duct over the shops' signs.)
own(B.clutter_back, D, B.Face("-x", 410.0 - 0.03, FZ0, FZ1), random.Random(9508), 0.0, 26.0)
K.duct(D, B.Face("-x", 410.0 - 0.03, FZ0, FZ1), 2.0, 30.0, 7.7, rl)
stand(389.6, FZ1 - 1.0, 0.0, "idle", y=G0)
stand(400.0, FZ1 - 4.4, -math.pi / 2, "lean", y=G0)
stand(394.0, FZ0 + 1.6, 0.0, "idle", y=G0)
# Down its west side, what a depot keeps: containers (one on another), a
# third by them, pallets, barrels and crates, a forklift, mesh fencing along
# the boundary; barriers inside the gate; and more people.
for (z0_, y0_, col_) in ((-212.5, G0, K.RUST_DARK), (-212.0, G0 + 2.6, (0.05, 0.085, 0.13, 1)), (-205.4, G0, (0.04, 0.11, 0.1, 1))):
    box((D, "container", 0), 380.5, 382.95, y0_, y0_ + 2.6, z0_, z0_ + 6.0, scale=1.0, col=col_)
box((D, "glow", 1), 382.95, 382.98, G0 + 2.25, G0 + 2.35, -209.7, -209.3, scale=0.5, col=GLOW["amber"])
for k in range(4):
    P.place("fence_mesh", 380.3, G0, -220.6 + k * 2.4, math.pi / 2, district=D)
for name, x_, z_ in (("pallets", 384.5, -210.6), ("barrel", 384.2, -208.9), ("barrel", 384.95, -208.6), ("pallets", 384.4, -200.2), ("barrier", 393.2, -196.4),
                     ("barrier", 396.8, -199.6)):
    P.place(name, x_, G0, z_, district=D)
K.crates(D, 384.6, -203.4, rl)
# The forklift, parked nose to the containers.
fx_, fz_ = 386.6, -206.4
box((D, "hazard", 0), fx_ - 0.55, fx_ + 0.55, G0 + 0.25, G0 + 1.05, fz_ - 0.9, fz_ + 0.8, scale=1.0)
box((D, "dark", 1), fx_ - 0.5, fx_ + 0.5, G0 + 1.05, G0 + 1.3, fz_ + 0.1, fz_ + 0.75, scale=1.0)
for dx_ in (-0.5, 0.5):
    for dz_ in (-0.85, 0.72):
        box((D, "steel", 1), fx_ + dx_ - 0.03, fx_ + dx_ + 0.03, G0 + 1.05, G0 + 2.15, fz_ + dz_ - 0.03, fz_ + dz_ + 0.03, scale=1.0, col=K.STEEL)
    box((D, "steel", 1), fx_ + dx_ * 0.7 - 0.05, fx_ + dx_ * 0.7 + 0.05, G0 + 0.1, G0 + 2.9, fz_ - 1.05, fz_ - 0.95, scale=1.0, col=K.STEEL)
    box((D, "steel", 1), fx_ + dx_ * 0.6 - 0.06, fx_ + dx_ * 0.6 + 0.06, G0 + 0.12, G0 + 0.17, fz_ - 2.1, fz_ - 1.0, scale=1.0, col=K.STEEL)
    for dz_ in (-0.55, 0.5):
        box((D, "dark", 1), fx_ + dx_ * 1.12 - 0.1, fx_ + dx_ * 1.12 + 0.1, G0, G0 + 0.5, fz_ + dz_ - 0.25, fz_ + dz_ + 0.25, scale=1.0)
box((D, "metal", 1), fx_ - 0.56, fx_ + 0.56, G0 + 2.15, G0 + 2.2, fz_ - 0.9, fz_ + 0.78, scale=1.0)
box((D, "glow", 1), fx_ - 0.1, fx_ + 0.1, G0 + 2.2, G0 + 2.32, fz_ - 0.1, fz_ + 0.1, scale=0.5, col=GLOW["amber"])
for (x_, z_, yaw_, pose_) in ((392.2, -194.2, 0.0, "idle"), (397.8, -201.0, math.pi, "idle"), (385.8, -204.9, 0.0, "talk"), (385.8, -203.9, math.pi, "talk"),
                              (397.4, FZ0 + 1.5, 0.3, "phone"), (388.2, -207.2, -math.pi / 2, "squat")):
    stand(x_, z_, yaw_, pose_, y=G0)

# ---------------------------------------------------------------------------
# The court lived in (the m6 review: "a lived-in Night City lot"): under the
# megablock's back wall a row of lit shops, a shutter down, a door to the
# flats and an alcove of machines, signs off the wall and a word in tube
# over them; before them two stalls and the aisle between; a third stall by
# the containers; bikes along the south wall and at the shops' end; strings
# of bulbs across the court; benches; drains, cracks and oil in the paving;
# and the people of all of it.
# ---------------------------------------------------------------------------
rc = random.Random(9520)
# (Its signs are named from counters of their own, and the street's and
# this district's counters are put back after it, so nothing built later
# here or in the districts after this one changes its art.)
_st0, _ids0 = dict(ST_COUNT), K._ids
for size_ in ST_SIZES:
    ST_COUNT[size_] = ST_COUNT.get(size_, 0) + 700
K._ids = random.Random(95300)
SF = B.Face("-x", 409.7, FZ0, FZ1)        # s runs south from the lobby's corner
SF_TINT = T["brown"]
for a_, b_ in ((0.4, 9.6), (16.0, 25.6)):
    B.shopfront(D, SF, rc, a_, b_, SF_TINT, 0.9, 0.0, door=False, palette=["amber", "pink", "cyan", "green", "red"])
for a_, b_, col_ in ((0.6, 4.6, K.RUST), (5.0, 9.4, (0.05, 0.16, 0.17, 1)), (16.2, 20.6, (0.3, 0.05, 0.06, 1)), (21.2, 25.4, K.RUST_DARK)):
    K.awning(D, SF, a_, b_, col=col_, out=1.4, y=3.25, hem="amber" if a_ < 10 else None)
SF.ledge((D, "trim", 0), 0.0, 32.0, SHOP_H, 0.2, 0.42, B.TRIM[SF_TINT])
SF.quad((D, "trim", 0), 0.0, 0.4, 0.0, SHOP_H, 0.0, col=DARK)
# The machines' alcove: a dark recess, two machines, a charging post, a tube.
SF.quad((D, "trim", 0), 9.6, 12.8, 0.0, SHOP_H, 0.0, col=DARK)
SF.box((D, "neon_cyan", 0), 9.9, 12.5, 3.5, 3.58, 0.0, 0.08)
for s_, name_ in ((10.35, "vending"), (11.45, "vending_warm")):
    P.place(name_, 409.25, G0, SF.at(s_), -math.pi / 2, district=D)
P.place("charge_post", 409.45, G0, SF.at(12.4), -math.pi / 2, district=D)
K.word(D, 409.5, 4.15, SF.at(11.2), 1.6, 0.62, -math.pi / 2, "cyan", "24H", underline=None)
# A shop shut behind its shutter, tagged; the door to the flats lit; the
# last bay shut.
for a_, b_, lamp_ in ((12.8, 16.0, "white"), (28.8, 31.6, None)):
    SF.quad((D, "trim", 0), a_, b_, 0.0, SHOP_H, 0.0, col=DARK)
    K.shutter(D, SF, a_ + 0.3, b_ - 0.3, h=3.2, lamp=lamp_)
SF.quad((D, "trim", 0), 25.6, 28.8, 0.0, SHOP_H, 0.0, col=DARK)
K.lit_door(D, SF, 27.2, "amber", w=1.2, h=2.4, power=3.5)
K.stoop(D, SF, 26.3, 28.1, steps=1)
K.wall_lamp(D, SF, 27.2, 3.0, "amber", 2.5)
# Signs off the wall: blades on brackets, a stack, the word in tube.
for s_, y_, size_, turn_ in ((0.5, 6.0, "bm", 0.25), (9.7, 5.9, "bs", -0.3), (16.0, 6.2, "bl", 0.0), (25.7, 5.8, "bs", 0.35)):
    K.blade(D, 409.7, SF.at(s_), y_, size_, -math.pi / 2 + turn_)
K.stack(D, 409.7, SF.at(31.7), 5.2, 3, -math.pi / 2 - 0.2)
K.word(D, 409.5, 6.5, SF.at(5.0), 4.4, 1.25, -math.pi / 2, "pink", "RAMEN", underline="amber")
K.word(D, 409.5, 6.3, SF.at(20.8), 4.0, 1.05, -math.pi / 2, "amber", "TOOLS", underline=None, r=0.045)

# Two stalls before the shops, their backs to the aisle, a vendor in each.
for z_, hue_, tag_ in ((-213.2, "amber", "fc_a"), (-205.6, "green", "fc_b")):
    K.stall(D, 404.2, z_, -math.pi / 2, rc, hue=hue_, steam=tag_)
    stand(405.2, z_ + 0.3, -math.pi / 2, "vendor", y=G0)
K.stall(D, 386.2, -195.5, math.pi / 2, rc, hue="amber", canvas=K.RUST, steam="fc_c")
stand(385.1, -195.3, math.pi / 2, "vendor", y=G0)
# Crates for tables by the west stall, people at them.
for (x_, z_) in ((388.9, -197.6), (389.0, -193.8)):
    K.crates(D, x_, z_, rc, n=2)
# Bikes: a row nose to the south wall west of the gate, three at the shops'
# end, one by the stall; their bays painted, oil under them.
for k, x_ in enumerate((381.6, 382.7, 383.9, 385.0, 386.3)):
    K.bike(D, x_, -191.7, 0.0 + rc.uniform(-0.12, 0.12), rc, lean=rc.choice((0.1, -0.1, 0.14)))
    quad((D, "trim", 1), (x_ - 0.55, G0 + 0.006, -190.5), (x_ - 0.5, G0 + 0.006, -190.5), (x_ - 0.5, G0 + 0.006, -192.9), (x_ - 0.55, G0 + 0.006, -192.9), col=(0.5, 0.5, 0.47, 1))
    quad((D, "trim", 1), (x_ - 0.25, G0 + 0.005, -191.3), (x_ + 0.3, G0 + 0.005, -191.3), (x_ + 0.3, G0 + 0.005, -192.1), (x_ - 0.25, G0 + 0.005, -192.1), col=(0.012, 0.012, 0.014, 1))
for z_ in (-194.6, -193.5, -192.3):
    K.bike(D, 408.4, z_, -math.pi / 2 + rc.uniform(-0.15, 0.15), rc, lean=rc.choice((0.1, -0.12)))
K.bike(D, 388.0, -200.8, 0.4, rc, lean=0.12)
# Strings of bulbs across the court, from over the shops to the top of the
# stacked containers and to a pole by the west stall.
cylinder((D, "metal", 1), 387.6, -198.4, G0, 4.7, 0.06, segs=6)
for a_, b_, hue_ in (((409.6, 5.5, -209.2), (382.95, 5.3, -209.2), "amber"), ((409.6, 5.5, -201.6), (387.6, 4.6, -198.4), "amber"),
                     ((409.6, 5.4, -216.4), (401.0, 4.4, -219.4), "pink")):
    K.bulbs(D, a_, b_, sag=1.0, n=max(9, int(abs(a_[0] - b_[0]) / 1.4)), hue=hue_)
# Benches by the containers and under the lamp, people on them.
for (x_, z_, yaw_) in ((384.3, -214.6, math.pi / 2), (384.3, -216.8, math.pi / 2)):
    P.place("bench", x_, G0, z_, yaw_, district=D)
P.place("bin", 384.2, G0, -218.4, math.pi / 2, district=D)
# Drains, cracks, oil, and a manhole breathing.
for (x_, z_) in ((395.0, -208.4), (395.0, -199.2), (402.0, -209.4), (388.6, -211.2), (406.6, -199.8)):
    P.place("drain", x_, G0, z_, 0.0, district=D)
for _ in range(10):
    K.crack(D, rc.uniform(386.0, 408.0), rc.uniform(-220.0, -192.0), rc, length=rc.uniform(1.5, 4.0))
for (x0_, x1_, z0_, z1_) in ((386.0, 387.4, -207.4, -205.6), (402.6, 403.8, -211.0, -210.2), (397.0, 397.9, -213.4, -212.9)):
    quad((D, "trim", 1), (x0_, G0 + 0.005, z1_), (x1_, G0 + 0.005, z1_), (x1_, G0 + 0.005, z0_), (x0_, G0 + 0.005, z0_), col=(0.01, 0.01, 0.012, 1))
empty("anchor_steam_street_afterlife_court", (399.0, G0 + 0.05, -204.0))
# The people of the court: at the stalls, in the aisle, at the machines, on
# the benches, by the bikes, at the door, smoking under the wall.
for (x_, z_, yaw_, pose_, y_) in (
        (402.6, -213.6, math.pi / 2, "idle", G0), (402.5, -212.5, math.pi / 2 + 0.3, "phone", G0), (402.7, -205.2, math.pi / 2, "talk", G0),
        (402.4, -206.3, math.pi / 2 - 0.4, "idle", G0), (406.9, -215.8, math.pi, "talk", G0), (406.9, -216.9, 0.0, "talk", G0),
        (407.9, -210.6, -math.pi / 2, "phone", G0), (407.2, -202.4, math.pi / 2, "smoke", G0), (387.6, -195.8, -math.pi / 2, "idle", G0),
        (388.1, -197.1, -math.pi / 2 + 0.5, "talk", G0), (388.2, -194.6, -math.pi / 2 - 0.3, "phone", G0), (384.3, -214.6, math.pi / 2, "sit", G0 + 0.47),
        (384.3, -216.6, math.pi / 2, "sit", G0 + 0.47), (383.2, -193.2, math.pi, "squat", G0), (407.0, -193.6, math.pi / 2, "lean", G0),
        (408.6, -196.4, -math.pi / 2, "smoke", G0), (400.4, -217.6, 0.4, "idle", G0)):
    stand(x_, z_, yaw_, pose_, y=y_)
# The open court: cube bollards down both sides of the striped way, a lit
# drum, boards out by the stalls, and people crossing to the lobby.
for z_ in (-216.0, -211.5, -202.5, -198.0):
    for x_ in (388.4, 401.6):
        P.place("bollard_cube", x_, G0, z_, district=D)
P.place("ad_drum", 391.6, G0, -202.2, district=D)
for (x_, z_, yaw_) in ((402.0, -210.0, -math.pi / 2 + 0.3), (387.8, -199.6, math.pi / 2 - 0.2), (406.8, -219.4, math.pi)):
    P.place("aframe", x_, G0, z_, yaw_, district=D)
for (x_, z_, yaw_, pose_) in ((393.2, -210.4, math.pi, "phone"), (396.6, -206.2, 0.2, "idle"), (395.6, -206.4, -0.4, "talk"), (398.4, -215.6, math.pi, "idle"),
                              (392.4, -203.6, math.pi / 2, "smoke")):
    stand(x_, z_, yaw_, pose_, y=G0)
for a_, b_ in ((FX0, GATE[0]), (GATE[1], FX1)):
    fw_ = B.Face("-z", FZ1 - 0.4, a_, b_)
    for sv in (1.6, 5.4):
        if b_ - a_ > sv + 1.0:
            K.poster(D, fw_, sv, 1.55, 1.2, 1.6, rc)
ST_COUNT.clear()
ST_COUNT.update(_st0)
K._ids = _ids0

# ---------------------------------------------------------------------------
# The people who stand about (the walkers on the pavements are the
# street's own): in the recesses and the lanes' mouths, clear of the
# walkers' lines and of the walk camera's. Nobody on the rooftop or in the
# bay.
# ---------------------------------------------------------------------------
PEOPLE_AT = [
    # the alley's mouth on the boulevard, and down the back lane
    (399.3, -315.0, 2.6, "smoke"), (400.9, -314.4, -2.4, "talk"), (401.2, -282.2, -math.pi / 2, "talk"), (400.0, -282.2, math.pi / 2, "talk"),
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
# (More of them in the lanes, down their middles, clear of what the walls keep.)
PEOPLE_AT += [(400.4, -303.5, 2.8, "phone"), (399.5, -292.0, 0.0, "smoke"), (400.6, -276.0, math.pi, "idle"), (414.2, -259.7, math.pi / 2, "talk"),
              (415.2, -259.7, -math.pi / 2, "talk"), (465.6, -313.7, math.pi / 2, "talk"), (466.6, -313.7, -math.pi / 2, "talk"),
              (486.6, -303.0, 0.0, "idle"), (487.4, -268.5, math.pi, "phone"), (486.2, -291.5, math.pi / 2, "squat")]
for x_, z_, yaw_, pose_ in PEOPLE_AT:
    stand(x_, z_, yaw_, pose_, y=G0)
# A pair on a stoop in the bar's yard, at the back row's door.
WY = B.Face("+x", 398.0, -258.0, -250.0)
K.stoop(D, WY, 2.4, 5.2, steps=2)
WY.quad((D, "door", 0), 3.2, 4.4, G0 + 0.36, 2.6, 0.03)
K.wall_lamp(D, WY, 3.8, 3.05, "amber", 3.0)
stand(398.5, WY.at(3.1), math.pi / 2, "sit", y=G0 + 0.36)
stand(398.5, WY.at(4.5), math.pi / 2 - 0.5, "sit", y=G0 + 0.36)

# The closing block's face on the junction, seen the length of the boulevard:
# shops behind glass, two shutters down, the door to the flats in a recess
# under a tube of cyan, rust awnings, a sign over each shop or a blade off
# its pier, conduit and units over the fascia, balconies and a fire escape
# up the wall, and people at the doors.
CB = B.Face("-x", EL, -344.0, -316.0)      # s runs south from its north end
rb = random.Random(9213)
CB_TINT = T["charcoal"]
CB_TRIM = B.TRIM[CB_TINT]
# (Not one grid of one window, as the m6 review found it: the flats change
# every two storeys, each band its own window, light and warmth, and up the
# north and south ends a column of signs and a strip of light.)
for k0, k1, lit_, style_, warm_ in ((0, 2, 0.85, 0, 0.8), (2, 4, 0.55, 6, 0.45), (4, 6, 0.8, 3, 0.95), (6, 7, 0.9, 1, 0.3)):
    B.facade_wall((D, "facade", 0), CB, SHOP_H + k0 * CELL_H, SHOP_H + k1 * CELL_H, B.wall_col(lit_, style_, warm_, CB_TINT), 11 + 3 * k0)
for k in (2, 4, 6):
    CB.ledge((D, "trim", 0), 0.0, 28.0, SHOP_H + k * CELL_H - 0.3, 0.3, 0.42, CB_TRIM)
with own_ids(95500):
    K.stack(D, EL, CB.at(0.7), 6.2, 5, CB.yaw - 0.35)
    K.blade(D, EL, CB.at(27.3), 15.5, "bl", CB.yaw + 0.3)
    K.blade(D, EL, CB.at(27.3), 9.8, "bm", CB.yaw + 0.3)
    for sv, yy, size_ in ((6.8, 11.0, "pm"), (20.6, 18.0, "pm"), (11.0, 21.4, "ps")):
        K.board(D, *CB.p(CB.at(sv), yy, 0.14), size_, CB.yaw)
CB.box((D, "neon_pink", 0), 0.12, 0.2, SHOP_H + 0.4, storeys(7) - 0.6, 0.0, 0.08)
CB.box((D, "neon_cyan", 0), 27.8, 27.88, SHOP_H + 0.4, storeys(7) - 0.6, 0.0, 0.08)
for a_, b_, signed in ((0.0, 6.4, 0.9), (9.6, 12.8, 0.0), (15.2, 21.6, 0.9), (24.8, 28.0, 0.0)):
    B.shopfront(D, CB, rb, a_, b_, CB_TINT, signed, 0.0, door=False, palette=WATSON["shop_colours"])
    light(D, EL - 1.4, 2.2, CB.at((a_ + b_) / 2), "amber", 3.0)
K.awning(D, CB, 9.9, 12.5, out=1.5)
K.awning(D, CB, 25.1, 27.7, out=1.4, col=K.RUST_DARK)
for a_, b_, lamp_ in ((6.4, 9.6, "white"), (21.6, 24.8, None)):
    CB.quad((D, "trim", 0), a_, b_, 0.0, SHOP_H, 0.0, col=DARK)
    K.shutter(D, CB, a_ + 0.35, b_ - 0.35, h=3.3, lamp=lamp_)
# The door to the flats: its recess between two piers, a tube over it.
for a_, b_ in ((12.8, 13.06), (14.94, 15.2)):
    CB.box((D, "trim", 0), a_, b_, 0.0, SHOP_H, -0.95, 0.08, col=CB_TRIM)
K.fbox(CB, (D, "trim", 0), 13.06, 14.94, 2.7, SHOP_H, -0.95, 0.0, col=DARK, bottom=True)
CB.quad((D, "trim", 0), 13.06, 14.94, 0.0, 2.7, -0.93, col=DARK)
B.ground_rect(D, EL, EL + 0.95, CB.at(13.06), CB.at(14.94))
K.lit_door(D, CB, 14.0, "cyan", w=1.2, h=2.4, power=4.5, back=0.92)
CB.box((D, "neon_cyan", 0), 13.3, 14.7, 2.92, 3.0, 0.0, 0.06)
K.pipes(D, CB, 0.6, 27.4, 5.02, rb, n=3)
K.dress(D, CB, storeys(7), rb, dict(ST, balcony=0.34, ac=0.5, signs=0.5, ledge_every=0), CB_TINT, escape=18.4)
for sv, yy, size, ang in ((9.6, 5.7, "bx", -0.3), (15.2, 6.6, "bs", 0.4), (24.8, 5.6, "bx", -0.35)):
    K.blade(D, EL, CB.at(sv), yy, size, CB.yaw + ang)
# What stands on the pavement against it, and who.
for name, sv, out_ in (("aframe", 1.6, 0.65), ("crates", 7.2, 0.6), ("charge_post", 15.6, 0.35), ("bags", 22.4, 0.5), ("aframe", 26.0, 0.65)):
    P.place(name, EL - out_, G0, CB.at(sv), CB.yaw, district=D)
for sv, out_, yaw_, pose_ in ((3.4, 0.55, 0.0, "talk"), (4.3, 0.55, math.pi, "talk"), (8.6, 0.4, -math.pi / 2, "lean"), (13.6, -0.45, -math.pi / 2, "smoke"),
                              (17.6, 0.5, -math.pi / 2 + 0.5, "phone"), (23.4, 0.45, -math.pi / 2, "squat"), (26.9, 0.5, math.pi / 2, "idle")):
    stand(EL - out_, CB.at(sv), yaw_, pose_, y=G0)

# The yard behind the garage: a lean-to on posts with tubes under it and a
# bench of tools, a container, a fence across the yard's south end, floods.
YC = (477.0, 483.4, -226.0, -212.0)        # the lean-to, against the garage's back wall
box((D, "metal", 0), YC[0] - 1.0, YC[1], 4.0, 4.14, YC[2], YC[3], scale=1.0, bottom=True)
for z_ in (YC[2] + 0.2, (YC[2] + YC[3]) / 2, YC[3] - 0.2):
    cylinder((D, "metal", 0), YC[1] - 0.2, z_, G0, 4.0, 0.07, segs=6)
lane_tubes([(480.0, -222.5), (480.0, -215.5)], 3.8, ("white", "cyan"), power=4.0, half=1.2)
box((D, "tool_red", 1), 476.5, 477.3, G0, 1.1, -224.0, -220.5, scale=1.0)
box((D, "metal", 1), 476.5, 477.5, 1.1, 1.16, -224.2, -217.0, scale=1.0)
K.tyres(D, 482.4, -225.0, 4)
K.tyres(D, 482.6, -224.1, 2)
# A container on blocks against the outer row, its doors to the yard.
box((D, "trim", 0), 486.2, 489.0, G0 + 0.2, G0 + 2.8, -202.0, -190.0, scale=1.0, col=K.RUST_DARK)
for z_ in (-200.5, -197.5, -194.5, -191.5):
    box((D, "trim", 1), 486.14, 486.2, G0 + 0.25, G0 + 2.75, z_ - 0.06, z_ + 0.06, scale=1.0, col=K.RUST)
box((D, "glow", 1), 486.14, 486.2, G0 + 2.3, G0 + 2.4, -196.2, -195.8, scale=0.5, col=GLOW["amber"])
# The fence, with a gate left open.
for z_ in (-178.0,):
    for x_ in (476.0, 479.0, 482.0, 487.0, 490.0):
        cylinder((D, "metal", 1), x_, z_, G0, 2.6, 0.04, segs=5)
    for (x_, w_) in ((477.2, 2.4), (479.6, 2.4), (481.4, 1.2), (488.5, 3.0)):
        P.place("fence_mesh", x_, G0, z_, 0.0, sxz=w_ / 2.4, district=D)
    # A hoarding over the fence, an advert to the plaza street and another to the yard.
    B.billboard(D, 479.0, 3.7, z_ + 0.2, 5.4, 2.4, 0.0, ro, depth=0.2)
    for x_ in (477.0, 481.0):
        box((D, "metal", 1), x_ - 0.06, x_ + 0.06, G0, 2.5, z_ + 0.04, z_ + 0.16, scale=0.5)
for (x_, z_, yaw_, hue_) in ((489.4, -244.0, -math.pi / 2, "white"), (476.6, -186.0, math.pi / 2, "amber"), (489.4, -212.0, -math.pi / 2, "cyan"),
                             (484.4, -296.0, math.pi / 2, "white"), (398.4, -256.0, math.pi / 2, "white")):
    K.arm_lamp(D, x_, z_, G0, yaw_, h=5.6, arm=2.6, hue=hue_, power=6.0)

# ---------------------------------------------------------------------------
# More signs at angles to their walls, as the show hangs them: blades
# turned up and down the street, a column of small boards at each end of
# the street, and a few more scripts in other hands and colours.
# ---------------------------------------------------------------------------
rs_ = random.Random(9600)
for (x_, z_, y_, size, ang) in (
        # the corner house (east face, north face)
        (WL, -304.5, 8.6, "bm", math.pi / 2 - 0.45), (WL, -311.0, 11.2, "bs", math.pi / 2 + 0.4), (420.0, -316.0, 9.4, "bm", math.pi - 0.4),
        (409.0, -316.0, 7.2, "bs", math.pi + 0.5), (390.0, -316.0, 9.0, "bl", math.pi - 0.3), (384.5, -316.0, 13.5, "bs", math.pi + 0.45),
        # the closing block, the clinic
        (EL, -320.5, 9.2, "bl", -math.pi / 2 + 0.4), (EL, -338.5, 8.0, "bm", -math.pi / 2 - 0.45), (454.0, -309.0, 7.0, "bs", -math.pi / 2 + 0.5),
        # the rooftop's building, the garage's neighbours
        (EL, -297.0, 9.6, "bm", -math.pi / 2 - 0.4), (EL, -264.0, 8.2, "bl", -math.pi / 2 + 0.45), (EL, -276.0, 12.4, "bs", -math.pi / 2 - 0.3),
        (EL, -198.0, 5.9, "bx", -math.pi / 2 + 0.4), (EL, -181.0, 5.9, "bs", -math.pi / 2 - 0.4),
        # the garage's west block, the bar
        (WL, -246.5, 9.0, "bm", math.pi / 2 + 0.45), (WL, -207.0, 10.5, "bl", math.pi / 2 - 0.4), (WL, -252.0, 6.4, "bx", math.pi / 2 + 0.5)):
    K.blade(D, x_, z_, y_, size, ang)
K.stack(D, WL, -313.0, 6.3, 4, math.pi / 2, out=1.2)
K.stack(D, EL, -190.5, 5.0, 2, -math.pi / 2, out=1.1)
K.stack(D, WK, -263.2, 7.2, 5, math.pi / 2 + 0.3, out=1.2)
# Words in tube: cyan over a bar under the rooftop's building, amber on the
# low block by the garage, green on the boulevard's flats, pink on the plaza
# street.
K.word(D, EL - 0.2, 5.6, -293.6, 4.6, 1.5, -math.pi / 2, "cyan", "SAKE", underline="pink", mark="bowl")
K.word(D, EL - 0.2, 5.75, -186.0, 4.2, 1.5, -math.pi / 2, "amber", "24H", underline=None, mark="arrow")
K.word(D, 389.0, 6.4, -316.2, 5.0, 1.8, math.pi, "green", "NOODLE", underline="white")
K.word(D, 419.0, 5.9, -189.8, 4.4, 1.6, 0.0, "pink", "MOTEL", underline="cyan")

# ---------------------------------------------------------------------------
# The named signs on the roofs stand in steel, not on bare slabs: a frame
# round each face, braces down to the roof, and the cable that feeds it.
# (Nothing stands between either and the rooftop's cameras: the frames are
# on the signs' own edges, the braces behind them.)
# ---------------------------------------------------------------------------
# AFTERLIFE's, facing the rooftop (rooftop.py: 13 by 3 at 38 m on a board
# 14 by 3.6, on two posts).
RS = B.Face("+x", 431.2, -288.0, -274.0)
for (a_, b_, y0_, y1_) in ((0.0, 14.0, 39.64, 39.8), (0.0, 14.0, 36.2, 36.36), (0.0, 0.16, 36.36, 39.64), (13.84, 14.0, 36.36, 39.64)):
    RS.box((D, "steel", 0), a_, b_, y0_, y1_, 0.0, 0.2, col=FRAME)
for za, zb in ((-286.0, -276.0), (-276.0, -286.0)):
    pipe((D, "steel", 1), (430.85, 30.3, za), (430.85, 36.0, zb), 0.05, segs=4, col=FRAME)
for z_ in (-286.5, -281.0, -275.5):
    pipe((D, "steel", 1), (430.6, 39.2, z_), (427.6, 30.1, z_), 0.06, segs=4, col=FRAME)
pipe((D, "steel", 1), (429.1, 34.65, -286.5), (429.1, 34.65, -275.5), 0.045, segs=4, col=FRAME)
box((D, "dark", 1), 430.62, 431.08, 31.6, 32.3, -276.32, -275.92, scale=1.0)
for z_ in (-279.0, -283.5):
    K.cable(D, (431.1, 36.2, z_), (431.05, 32.2, -276.1), 0.5, r=0.03, steps=6)
# RIPPERDOC's (rooftop.py: 9 by 2.2 at 38.4 m, turned 38 degrees, both faces).
ryaw_ = math.radians(38)
ux_, uz_ = math.cos(ryaw_), -math.sin(ryaw_)
nx_, nz_ = math.sin(ryaw_), math.cos(ryaw_)
for (du, dv, w_, h_) in ((0.0, 1.17, 9.3, 0.14), (0.0, -1.17, 9.3, 0.14), (-4.58, 0.0, 0.14, 2.2), (4.58, 0.0, 0.14, 2.2)):
    oriented_box((D, "steel", 0), 457.0 + du * ux_, 38.4 + dv, -283.0 + du * uz_, w_, h_, 0.16, ryaw_, scale=1.0, col=FRAME)
for du in (-3.2, 3.2):
    px_, pz_ = 457.0 + du * ux_, -283.0 + du * uz_
    pipe((D, "steel", 1), (px_, 37.2, pz_), (px_ - nx_ * 1.2, 34.15, pz_ - nz_ * 1.2), 0.05, segs=4, col=FRAME)
K.cable(D, (457.0 + 4.5 * ux_, 37.3, -283.0 + 4.5 * uz_), (457.4, 37.5, -288.0), 0.4, r=0.03, steps=5)
# Its mount (the m6 review: "a bare rectangle on two posts"): each post the
# front chord of a lattice tower, a second chord behind it, laced; a box
# beam the board sits on; behind it, on the street side, away from the
# rooftop's lens, a catwalk of grating with a rail and a ladder up to it.


def rp(du, dv, y):
    return (457.0 + du * ux_ + dv * nx_, y, -283.0 + du * uz_ + dv * nz_)


for du in (-3.2, 3.2):
    b_ = rp(du, -0.7, 0.0)
    box((D, "steel", 0), b_[0] - 0.08, b_[0] + 0.08, 34.0, 37.2, b_[2] - 0.08, b_[2] + 0.08, scale=1.0, col=FRAME)
    for k in range(4):
        ya_, yb_ = 34.1 + k * 0.78, 34.1 + (k + 1) * 0.78
        pipe((D, "steel", 1), rp(du, 0.0 if k % 2 else -0.7, ya_), rp(du, -0.7 if k % 2 else 0.0, yb_), 0.025, segs=3, col=FRAME)
    for dv in (0.0, -0.7):
        sh_ = rp(du, dv, 0.0)
        box((D, "dark", 1), sh_[0] - 0.16, sh_[0] + 0.16, 34.0, 34.1, sh_[2] - 0.16, sh_[2] + 0.16, scale=1.0)
for dv in (0.0, -0.7):
    a_ = rp(0.0, dv, 0.0)
    oriented_box((D, "steel", 0), a_[0], 37.12, a_[2], 9.4, 0.22, 0.12, ryaw_, scale=1.0, col=FRAME)
cw_ = rp(0.0, -1.15, 0.0)
oriented_box((D, "steel", 1), cw_[0], 37.08, cw_[2], 9.4, 0.05, 0.8, ryaw_, scale=1.0, col=(0.07, 0.075, 0.085, 1))
for k in range(18):
    g_ = rp(-4.45 + k * 0.52, -1.15, 0.0)
    oriented_box((D, "dark", 1), g_[0], 37.11, g_[2], 0.04, 0.02, 0.8, ryaw_, scale=1.0)
for yy_ in (37.6, 38.1):
    pipe((D, "steel", 1), rp(-4.7, -1.55, yy_), rp(4.7, -1.55, yy_), 0.025, segs=3, col=FRAME)
for k in range(7):
    pipe((D, "steel", 1), rp(-4.7 + k * 1.566, -1.55, 37.1), rp(-4.7 + k * 1.566, -1.55, 38.1), 0.022, segs=3, col=FRAME)
for dv in (-0.95, -1.4):
    pipe((D, "steel", 1), rp(-4.1, dv, 34.0), rp(-4.1, dv, 37.1), 0.025, segs=3, col=FRAME)
for k in range(1, 9):
    pipe((D, "steel", 1), rp(-4.1, -0.95, 34.0 + k * 0.35), rp(-4.1, -1.4, 34.0 + k * 0.35), 0.015, segs=3, col=FRAME)
box((D, "glow", 1), *(lambda q: (q[0] - 0.08, q[0] + 0.08, 37.75, 37.87, q[2] - 0.08, q[2] + 0.08))(rp(4.6, -1.55, 0.0)), scale=0.5, col=GLOW["white"])

# ---------------------------------------------------------------------------
# The camera roof's own, where neither About nor Stack looks (their lens at
# (476, -266) sweeps from north-north-west round by west to south-south-west:
# all of this is north-east and east of it, or behind it): a second stair
# hut with a white lamp over its door, a rail on the north, east and south
# parapets, and a low cool fill round the tanks so the deck, the units and
# the tanks' legs can be seen.
# ---------------------------------------------------------------------------
K.hut(D, 481.2, -296.6, 34.0, -math.pi / 2, T["teal"], hue="white")
K.rail(D, [(459.0, -299.8), (483.8, -299.8), (483.8, -258.2), (473.0, -258.2)], 35.1, h=0.9, thick=False)
# (The tanks stand on a deck of pavers down the roof's east side, which
# takes the light the wet tar does not.)
K.slab(D, 474.2, 483.6, -299.6, -258.4, 34.0, "concrete", lift=0.06, scale=3.0)
for (x_, z_) in ((474.5, -292.0), (480.0, -278.0), (480.5, -264.0)):
    light(D, x_, 35.2, z_, "cyan", 5.0)
for (x_, z_, hue_) in ((481.6, -288.0, "white"), (482.0, -271.5, "cyan"), (478.6, -261.0, "white")):
    cylinder((D, "metal", 1), x_, z_, 34.06, 34.96, 0.05, segs=5)
    box((D, "neon_" + hue_, 0), x_ - 0.07, x_ + 0.07, 34.96, 35.1, z_ - 0.07, z_ + 0.07, scale=0.5)
    light(D, x_, 34.9, z_, hue_, 6.0)

# ---------------------------------------------------------------------------
# MILITECH's tower (rooftop.py's masses, 30 by 28 to 46 m, a tier to 58 and
# the plant room to 64): its floors lit in runs of their own (bright cool
# offices, a dim curtain wall, a warm run under the top), ribs up every
# face, a service band of louvres with red lamps along it; the plant room
# louvred on three faces, its name framed in steel on the fourth, units, a
# rail and two masts with red lamps on its roof.
# ---------------------------------------------------------------------------
MIL_RIB = (0.07, 0.078, 0.1, 1)
MIL_TINT = T["navy"]
# (first storey, last storey, how lit, window style, how warm)
MIL_RUNS = ((0, 3, 0.85, 2, 0.15), (3, 5, 0.5, 4, 0.55), (5, 8, 0.9, 2, 0.3), (9, 11, 0.85, 2, 0.05), (11, 12.18, 0.8, 4, 0.75))
for name, f in B.faces_of(380.0 - 0.02, 410.0 + 0.02, -250.0 - 0.02, -222.0 + 0.02).items():
    for k0, k1, lit_, style_, warm_ in MIL_RUNS:
        B.facade_wall((D, "facade", 0), f, SHOP_H + k0 * CELL_H, SHOP_H + k1 * CELL_H, B.wall_col(lit_, style_, warm_, MIL_TINT), 3)
    bays = round(f.width / CELL_W)
    for i in range(bays + 1):
        sv = min(max(i * f.width / bays, 0.12), f.width - 0.12)
        f.box((D, "trim", 0), sv - 0.12, sv + 0.12, SHOP_H, 46.3, 0.0, 0.45, col=MIL_RIB)
    K.louvre(D, f, 0.3, f.width - 0.3, SHOP_H + 8 * CELL_H + 0.05, SHOP_H + 9 * CELL_H - 0.05, out=0.32)
    for i in range(1, 5):
        sv = i * f.width / 5
        f.box((D, "glow", 0), sv - 0.1, sv + 0.1, SHOP_H + 9 * CELL_H - 0.05, SHOP_H + 9 * CELL_H + 0.1, 0.32, 0.38, col=GLOW["red"])
for name, f in B.faces_of(383.0 - 0.02, 410.0 + 0.02, -247.0 - 0.02, -225.0 + 0.02).items():
    B.facade_wall((D, "facade", 0), f, 46.0, 58.0, B.wall_col(0.9, 4, 0.4, MIL_TINT), 3)
    bays = round(f.width / CELL_W)
    for i in range(bays + 1):
        sv = min(max(i * f.width / bays, 0.12), f.width - 0.12)
        f.box((D, "trim", 0), sv - 0.12, sv + 0.12, 46.0, 58.3, 0.0, 0.45, col=MIL_RIB)
# The plant room: louvres, corner ribs, a frame round the name.
for name, f in B.faces_of(392.0, 410.0, -244.0, -228.0).items():
    if name == "+x":
        for (a_, b_, y0_, y1_) in ((1.6, 14.4, 62.44, 62.6), (1.6, 14.4, 59.4, 59.56), (1.6, 1.76, 59.56, 62.44), (14.24, 14.4, 59.56, 62.44)):
            f.box((D, "steel", 0), a_, b_, y0_, y1_, 0.3, 0.5, col=FRAME)
        continue
    half = f.width / 2
    for a_, b_ in ((0.8, half - 0.5), (half + 0.5, f.width - 0.8)):
        K.louvre(D, f, a_, b_, 59.0, 62.9, out=0.14)
    for sv in (0.2, half, f.width - 0.2):
        f.box((D, "trim", 0), sv - 0.2, sv + 0.2, 58.0, 64.0, 0.0, 0.3, col=MIL_RIB)
for (x_, z_, yaw_) in ((396.5, -240.5, 0.0), (402.0, -240.5, 0.0), (396.0, -232.0, math.pi / 2)):
    K.unit(D, x_, z_, 64.3, yaw_, lamp="red" if x_ > 400 else "amber")
K.rail(D, [(392.2, -243.8), (409.8, -243.8), (409.8, -228.2), (392.2, -228.2), (392.2, -243.8)], 64.3, h=0.9, thick=False)
K.mast(D, 394.2, -230.2, 64.3, 9.0, dishes=2, lamp="red")
K.mast(D, 406.5, -241.6, 64.3, 6.0, dishes=1, lamp="red")
for (x_, z_, h_) in ((400.0, -229.4, 5.5), (408.6, -234.0, 4.0), (393.4, -242.6, 6.5)):
    cylinder((D, "metal", 1), x_, z_, 64.3, 64.3 + h_, 0.04, segs=4)
    box((D, "glow", 0), x_ - 0.07, x_ + 0.07, 64.3 + h_, 64.44 + h_, z_ - 0.07, z_ + 0.07, scale=0.5, col=GLOW["red"])

# ---------------------------------------------------------------------------
# The roofs' floors, worked (afterlife_roofs): round what each roof already
# keeps (its plant, its deck, its board, its hut, given here as `keep`) every
# free stretch has a bank of condensers, a duct, pipes, a shed with a lit
# door, solar panes, a washing line, a hatch, a tank or a stack of pallets,
# and a lamp every few metres whose pool its concrete takes. West of the
# street nothing stands over the line About's and Stack's lens sees across
# the rooftop's parapets.
# ---------------------------------------------------------------------------
rf = random.Random(9700)
# West: the flats on the boulevard (round the penthouse), the corner house,
# the back row.
R.ring(D, (380.3, 397.7, -315.7, -300.3), (383.0, 395.0, -313.0, -303.0), storeys(6), rf, hues=("cyan", "white"), hmax=3.0, cell=3.4)
R.fill(D, 402.3, 427.7, -315.7, -300.3, storeys(3), rf, keep=[(409.5, 422.5, -313.2, -304.4), (403.0, 407.2, -304.8, -301.2), (423.0, 426.0, -303.6, -301.4)],
       hues=("amber", "cyan"), cell=4.2)
R.fill(D, 380.3, 397.7, -299.7, -276.3, storeys(5), rf, keep=[(381.5, 396.5, -298.5, -282.0), (390.9, 394.1, -281.1, -277.9), (382.4, 383.6, -279.1, -277.9)],
       hues=("white", "teal"), hmax=5.0)
R.fill(D, 380.3, 397.7, -275.7, -250.3, storeys(3), rf, keep=[(382.2, 396.3, -273.3, -256.7), (392.0, 396.2, -255.0, -251.0)], hues=("amber", "cyan"))
# The garage's west block, the roof Stack looks across: low things only,
# under its own parapet's line.
R.fill(D, 410.3, 427.7, -249.7, -190.3, 26.0, rf, keep=[(411.5, 426.5, -247.0, -232.0), (414.8, 425.6, -217.6, -205.6), (421.8, 425.2, -198.7, -195.3),
                                                          (412.6, 416.4, -201.2, -197.8), (417.4, 418.6, -224.6, -223.4)],
       hues=("cyan", "amber", "pink"), hmax=1.3)
# AFTERLIFE's roof, which About's lens looks across: what stands on it is
# under the line from that lens over the rooftop's west parapet (a hand's
# height at the roof's far edge, three metres by the sign).
R.fill(D, 402.8, 431.4, -299.2, -262.8, 30.0, rf, keep=[(420.6, 428.4, -292.5, -269.5), (411.6, 419.4, -278.4, -263.6), (408.2, 411.8, -269.8, -266.2),
                                                         (422.2, 425.8, -295.8, -292.2), (403.8, 409.2, -298.2, -291.8), (413.8, 418.2, -282.2, -279.3),
                                                         (415.8, 420.7, -272.2, -269.6), (426.5, 427.5, -296.5, -295.5), (427.0, 431.5, -288.5, -273.5),
                                                         (404.2, 407.6, -279.6, -278.4), (420.7, 422.3, -298.1, -296.9)],
       hues=("pink", "amber", "cyan"), hmax=lambda x, z: (x - 402.0) * 0.0967)
# East: the closing block (round its crown, behind its board), its lower
# half round the pad, the roof south of the rooftop's.
R.ring(D, (452.3, 483.7, -343.7, -316.3), (461.0, 481.0, -340.0, -321.0), storeys(7), rf, keep=[(454.0, 458.6, -336.8, -323.2)], hues=("cyan", "amber"), cell=4.0)
R.fill(D, 484.3, 507.7, -343.7, -316.3, storeys(5), rf, keep=[(489.3, 504.7, -338.7, -323.3), (485.0, 489.2, -321.4, -317.6)], hues=("amber", "cyan"), cell=4.0)
R.fill(D, 452.3, 475.7, -257.7, -230.3, 22.0, rf, keep=[(454.2, 468.8, -255.8, -239.7), (470.3, 473.7, -236.2, -232.8), (470.6, 474.6, -253.3, -249.7)],
       hues=("teal", "amber", "white"), hmax=3.2)
# The outer row, round each roof's own.
for (z0, z1, n), kind in zip(OUTER, OUTER_ROOFS):
    zm = (z0 + z1) / 2
    keep = {"plant": [(491.5, 506.5, z0 + 1.5, z1 - 6.0), (501.8, 505.2, z1 - 4.7, z1 - 1.3)],
            "terrace": [(491.7, 506.3, z0 + 1.7, z1 - 4.7), (502.2, 505.8, z1 - 3.9, z1 - 0.9)],
            "board": [(492.6, 497.2, zm - 5.6, zm + 5.6), (501.5, 505.5, z0 + 1.3, z0 + 4.7), (501.6, 504.4, z1 - 4.0, z1 - 2.0)]}.get(kind)
    if keep:
        R.fill(D, 490.3, 507.7, z0 + 0.3, z1 - 0.3, storeys(n), rf, keep=keep, hues=("amber", "cyan", "white"), cell=3.8)

# The camera roof's north-east and its east side, where neither About nor
# Stack looks (north of the lens only what is east of the line from it at
# 330 degrees: x over 476 - 0.577 * (-266 - z)). A deck of pavers in that
# corner, which takes the boards' light: RIPPERDOC's white across it, a
# little of AFTERLIFE's pink from over the street; a bank of condensers
# under the north parapet, a duct from the stair hut, a cable tray and
# dishes along the parapet, a second bank by the tank, a hatch, pallets;
# and down the east side pipes on sleepers, a tray between the tanks, a
# bank and a shed in the south-east corner.
poly((D, "concrete", 0), [(474.2, 34.06, -270.6), (474.2, 34.06, -299.6), (457.8, 34.06, -299.6)],
     [(474.2 / 3, 270.6 / 3), (474.2 / 3, 299.6 / 3), (457.8 / 3, 299.6 / 3)])
rr = random.Random(9710)
R.bank(D, 463.4, -297.2, 34.06, 3, 0.0, rr)
R.duct(D, (479.5, -289.6), (470.6, -289.6), 34.06, rr)
R.tray(D, (472.2, -299.1), (479.2, -299.1), 34.06, rr)
for x_, yaw_ in ((470.0, 2.6), (472.0, 3.4), (476.0, 2.9)):
    P.place("dish", x_, 35.1, -299.75, yaw_, district=D)
R.bank(D, 472.0, -280.6, 34.06, 2, math.pi / 2, rr)
R.hatch(D, 469.6, -286.4, 34.06, math.pi / 2, "amber")
for name, x_, z_ in (("pallets", 478.4, -293.4), ("barrel", 477.3, -293.9), ("crates", 472.8, -297.4), ("drum", 462.6, -296.6)):
    P.place(name, x_, 34.06, z_, rr.uniform(0, 3), district=D)
for x_, z_, hue_, pw in ((465.0, -295.6, "white", 7.0), (469.4, -291.0, "white", 5.0), (461.6, -297.9, "pink", 4.0), (470.6, -297.4, "pink", 4.0),
                         (472.4, -284.4, "white", 5.0), (472.0, -276.6, "cyan", 4.0)):
    K.pool(D, x_, z_, 34.0, hue_, pw)
R.pipes(D, (483.05, -293.6), (483.05, -262.4), 34.06, rr, n=2)
R.tray(D, (479.4, -282.6), (479.4, -272.6), 34.06, rr)
R.bank(D, 481.4, -267.2, 34.06, 2, math.pi / 2, rr)
R.shed(D, 480.4, -260.9, 34.06, math.pi, rr, "amber", w=2.0, d=2.0, h=2.2)
P.place("pallets", 478.2, 34.06, -274.9, 0.4, district=D)

# The garage's roof (its west end is the page's way up to Contact, its
# south end Contact's own frame: nothing new west of x 457.4 or south of
# z -204): the deck carried out to its west and south edges, solar panes
# down the west side, a hatch and a walkway painted to it, pipes along the
# south, a vent stack breathing by the north parapet, pallets and drums,
# two low lamps.
K.slab(D, 457.4, 460.0, -229.4, -204.0, 8.0, "concrete", lift=0.1, scale=3.0)
K.slab(D, 460.0, 475.4, -206.0, -204.0, 8.0, "concrete", lift=0.1, scale=3.0)
R.panels(D, 458.2, 459.8, -221.5, -209.9, 8.1)
box((D, "metal", 1), 458.0, 459.2, 8.1, 8.5, -225.6, -224.4, scale=1.0)
quad((D, "glow", 0), (458.1, 8.51, -224.5), (459.1, 8.51, -224.5), (459.1, 8.51, -225.5), (458.1, 8.51, -225.5), col=tuple(c * 0.5 for c in GLOW["amber"][:3]) + (1.0,))
for x_ in (460.15, 460.75):
    quad((D, "trim", 1), (x_, 8.115, -208.0), (x_ + 0.1, 8.115, -208.0), (x_ + 0.1, 8.115, -229.0), (x_, 8.115, -229.0), col=(0.42, 0.33, 0.05, 1))
R.pipes(D, (458.2, -205.0), (474.6, -205.0), 8.1, rr, n=3)
cylinder((D, "metal", 0), 466.4, -228.3, 8.1, 9.5, 0.3, segs=10)
cylinder((D, "dark", 1), 466.4, -228.3, 9.5, 9.58, 0.36, segs=10)
empty("anchor_steam_roof_afterlife_garage", (466.4, 9.6, -228.3))
for name, x_, z_ in (("pallets", 462.4, -228.0), ("barrel", 463.5, -228.4), ("drum", 470.2, -206.9), ("drum", 470.9, -207.2), ("crates", 468.6, -207.0)):
    P.place(name, x_, 8.1, z_, rr.uniform(0, 3), district=D)
# (Lamps that glow and throw nothing: the room under this roof is the page's.)
for x_, z_, hue_ in ((460.4, -207.6, "white"), (464.6, -227.4, "amber")):
    cylinder((D, "metal", 1), x_, z_, 8.1, 9.0, 0.04, segs=4)
    box((D, "glow", 0), x_ - 0.11, x_ + 0.11, 9.0, 9.16, z_ - 0.11, z_ + 0.11, scale=0.5, col=GLOW[hue_])

# MILITECH's top, seen from a flying car a little over it: light behind the
# plant room's louvres (its north, south and west walls; the east one is the
# name's), a lit service door on a landing, red lamps at its corners; on
# the tier's roof round it a deck of pavers, banks of condensers on the
# south side and the west, pipes and a tray on the north (low: Stack looks
# up at that edge), rails, lamps; and pipes along the lower roof's north
# strip.
MP = B.faces_of(392.0, 410.0, -244.0, -228.0)
for name in ("-x", "+z", "-z"):
    f = MP[name]
    half = f.width / 2
    for a_, b_ in ((0.8, half - 0.5), (half + 0.5, f.width - 0.8)):
        f.quad((D, "glow", 0), a_ + 0.08, b_ - 0.08, 59.1, 62.8, 0.146, col=tuple(c * 0.03 for c in GLOW["amber" if name != "-x" else "cyan"][:3]) + (1.0,))
        # (Its blades in front of the light, the light between them.)
        y_ = 59.2
        while y_ < 62.7:
            f.box((D, "dark", 1), a_ + 0.08, b_ - 0.08, y_, y_ + 0.09, 0.16, 0.24)
            y_ += 0.2
MN_ = MP["-z"]
MN_.quad((D, "glow", 0), 1.2, 2.2, 58.05, 60.1, 0.172, col=tuple(c * 0.4 for c in GLOW["amber"][:3]) + (1.0,))
MN_.box((D, "metal", 1), 1.1, 2.3, 60.1, 60.2, 0.0, 0.4)
for (x_, z_) in ((392.1, -243.9), (392.1, -228.1), (401.0, -243.9), (401.0, -228.1)):
    cylinder((D, "metal", 1), x_, z_, 64.3, 65.0, 0.04, segs=4)
    box((D, "glow", 0), x_ - 0.1, x_ + 0.1, 65.0, 65.2, z_ - 0.1, z_ + 0.1, scale=0.5, col=GLOW["red"])
for (x0_, x1_, z0_, z1_) in ((392.0, 409.7, -246.7, -244.3), (392.0, 409.7, -227.7, -225.3)):
    K.slab(D, x0_, x1_, z0_, z1_, 58.0, "concrete", lift=0.06, scale=3.0)
R.pipes(D, (393.0, -245.9), (408.6, -245.9), 58.06, rr, n=3, loop=False)
R.tray(D, (393.0, -244.9), (406.8, -244.9), 58.06, rr)
R.bank(D, 400.6, -226.5, 58.06, 6, math.pi, rr)
K.rail(D, [(391.9, -246.8), (409.8, -246.8)], 58.0, h=0.9, thick=False)
K.rail(D, [(391.9, -225.2), (409.8, -225.2)], 58.0, h=0.9, thick=False)
for x_, z_, hue_ in ((396.0, -245.4, "amber"), (405.5, -245.4, "white"), (396.0, -226.6, "white"), (405.5, -226.6, "amber")):
    K.pool(D, x_, z_, 58.0, hue_, 2.5)
K.slab(D, 383.4, 409.7, -249.6, -247.4, 46.0, "concrete", lift=0.06, scale=3.0)
R.pipes(D, (384.5, -248.5), (408.5, -248.5), 46.06, rr, n=3)
for x_, hue_ in ((389.0, "amber"), (397.0, "cyan"), (405.0, "amber")):
    R.lamp(D, x_, -248.9, 46.06, hue_, h=0.7, power=5.0)

# The outer row's faces on the yard and the back lane, which the garage's
# roof looks straight at: a sign over each ground floor, blades off the
# upper storeys, a lit word on the tall one, lamps on brackets.
for i, (z0, z1, n) in enumerate(OUTER):
    if n < 2:
        continue
    f = B.Face("-x", 490.0, z0, z1)
    K.board(D, 489.86, 5.25, z0 + 6.5, "pm", -math.pi / 2)
    K.blade(D, 490.0, z0 + 3.2, 7.2 + (i % 2), "bm" if i % 2 else "bs", -math.pi / 2 + 0.4)
    K.blade(D, 490.0, z1 - 3.6, 6.4 + (i % 3) * 0.6, "bx", -math.pi / 2 - 0.35)
    # (A lamp on a bracket where the face is on the yard; the back lane keeps its dark.)
    if i >= 2:
        K.wall_lamp(D, f, f.width * 0.5, 4.3, ("amber", "white", "cyan")[i % 3], 3.0)
    if n >= 4:
        K.stack(D, 490.0, z0 + 7.0, 9.4, 3, -math.pi / 2, out=1.1)
K.word(D, 489.8, 12.4, -260.0, 5.4, 1.8, -math.pi / 2, "amber", "ROOMS", underline="pink")

# Every high roof's light, painted over its deck from the lamps that stand
# on it (afterlife_kit.roof_light). The camera roof's only north-east of
# the line About's lens sees along, and down its east side.
for (x0_, x1_, z0_, z1_, y_) in (
        (380.3, 397.7, -315.7, -300.3, storeys(6)), (402.3, 427.7, -315.7, -300.3, storeys(3)), (380.3, 397.7, -299.7, -276.3, storeys(5)),
        (380.3, 397.7, -275.7, -250.3, storeys(3)), (410.3, 427.7, -249.7, -190.3, 26.0), (402.6, 431.4, -299.4, -262.6, 30.0),
        (452.3, 483.7, -343.7, -316.3, storeys(7)), (484.3, 507.7, -343.7, -316.3, storeys(5)), (454.3, 483.7, -311.7, -300.3, storeys(2)),
        (452.3, 475.7, -257.7, -230.3, 22.0), (392.0, 409.7, -246.7, -244.3, 58.0), (392.0, 409.7, -227.7, -225.3, 58.0)):
    K.roof_light(D, x0_, x1_, z0_, z1_, y_)
for (z0, z1, n) in OUTER:
    K.roof_light(D, 490.3, 507.7, z0 + 0.3, z1 - 0.3, storeys(n))


def _unseen(x, z):
    """Where neither About nor Stack sees the camera roof's deck: east of the
    pavers' edge, north-east of About's right-hand line, or within nine
    metres of the lens (under both frames' feet)."""
    dx, dz = x - 476.0, z + 266.0
    return x > 474.2 or (z < -270.6 and x > 477.0 - 0.577 * (-266.0 - z) + 0.9) or dx * dx + dz * dz < 81.0


K.roof_light(D, 457.8, 483.6, -299.6, -258.4, 34.0, lift=0.1, inside=_unseen)
