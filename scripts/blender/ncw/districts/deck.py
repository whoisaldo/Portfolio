"""The Deck: the loop's elevated road over the avenue (BIBLE.md, "The Deck").

From the top of the west street's ramp (plan.RAMP_FOOT_Z to the turn at
plan.DECK_X0) across the avenue at plan.DECK_Y to grade by plan.DECK_LAND_X
and the x 120 road. Until it is built, the avenue's old overpass stands in
for it (avenue.py). Everything here is keyed to the district "deck".
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import plan  # noqa: F401

# The old overpass, what the hero sees of the deck (in the core, keyed to the
# avenue): a set piece, BIBLE.md "What does not move". The deck's own work
# builds the rest of the road round it and may rebuild this, as long as the
# hero's view of it holds.
AV = "avenue"
# The overpass: a concrete deck on two piers crossing the avenue, a rail
# along its edge, lights underneath, and its teal sign.
OVER_Z = -80.0
box((AV, "concrete", 0), -46, 46, 7.2, 8.5, OVER_Z - 3.2, OVER_Z + 3.2, scale=3.0)
for px in (-17.5, 17.5):
    box((AV, "concrete", 0), px - 0.8, px + 0.8, 0, 7.2, OVER_Z - 1.2, OVER_Z + 1.2, scale=2.0)
for zz in (OVER_Z - 3.25, OVER_Z + 3.15):
    box((AV, "metal", 1), -46, 46, 8.5, 9.6, zz, zz + 0.1, scale=0.8)
box((AV, "neon_teal", 0), -12, 12, 7.1, 7.18, OVER_Z + 3.0, OVER_Z + 3.1, scale=1.0)
for lx in range(-40, 41, 8):
    box((AV, "neon_white", 1), lx - 0.8, lx + 0.8, 7.1, 7.16, OVER_Z - 0.3, OVER_Z + 0.3, scale=1.0)
sign("sora", -6.0, 9.2, OVER_Z + 3.35, 6.4, 1.3, 0.0, preview="空き未来へ")
box((AV, "board_frame", 0), -9.4, -2.6, 8.4, 10.0, OVER_Z + 3.1, OVER_Z + 3.3, scale=1.0)
