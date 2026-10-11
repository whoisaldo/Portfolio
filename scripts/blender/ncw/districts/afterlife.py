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
  E1b  x 452..484, z -312..-300   a clinic, three storeys
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
lot(452.0, 484.0, -312.0, -300.0, storeys(2), 9112, {"-x": "street", "-z": "open", "+z": "party", "+x": "open"},
    {"+z": 34.0}, tint="concrete", style=dict(roof_cap=3.0))
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
