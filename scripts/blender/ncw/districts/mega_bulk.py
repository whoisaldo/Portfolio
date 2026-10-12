"""The megastructure's bulk, and its number where the canyon can read it.

From the hero's lens the megablock is the plate's dark stepped block in the
canyon's slot, and holds. From the canyon itself (canyon-end, megablock,
mg-approach) the slot is the same window but for two bands the hero cannot
see: a sign gantry across the avenue at z -234 hides from all three of the
hero's eyes the band from about 108 to 142 m on the tiers' front (z -801)
and from 54 to 66 m on the slab's face. The block's number stands in the
first, storeys high and lit, and a lit board in the second (agents/mega
probe/visf.txt has the bands; they hang on that gantry staying).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw.districts.mega_kit import *  # noqa: F401,F403

TZ = -801.0                                  # the tiers' front (mega_mass.TZ)
YEL_LIT = dim(GLOW["yellow"], 1.0)


# ---------------------------------------------------------------------------
# The number: a dark steel board 1.6 m off the first tier's face, from 110 to
# 140.5 m (over the tier's top at 132 it stands in front of the second's
# face), the "H4" in yellow light 24 m tall, a lit rim, brackets into the
# face and raking struts back to the tier's roof.
# ---------------------------------------------------------------------------
BX0, BX1, BY0, BY1, BZ = -23.5, 23.5, 110.5, 140.5, TZ + 1.6
tbox(BX0, BX1, BY0, BY1, BZ - 0.45, BZ, BLACK, scale=2.0)
strokes((D, "glow", 0), "H4", 0.0, (BY0 + BY1) / 2, BZ, 24.0, 0.0, YEL_LIT, weight=0.17, gap=0.3, out=0.06)
# Its rim, a tube of light round the board.
for (x0, x1, y0, y1) in ((BX0, BX1, BY1 - 0.4, BY1), (BX0, BX1, BY0, BY0 + 0.4), (BX0, BX0 + 0.4, BY0, BY1), (BX1 - 0.4, BX1, BY0, BY1)):
    box((D, "neon_amber", 0), x0, x1, y0, y1, BZ, BZ + 0.12, scale=1.0)
# Brackets into the tier's face, and struts from the top back to its roof.
for bx in (-20.0, -10.0, 0.0, 10.0, 20.0):
    for by in (114.0, 124.0):
        tbox(bx - 0.25, bx + 0.25, by - 0.25, by + 0.25, TZ, BZ - 0.45, STEEL)
    pipe((D, "metal", 0), (bx, BY1 - 1.0, BZ - 0.5), (bx, 132.4, TZ - 6.0), 0.22, segs=6)
    tbox(bx - 0.25, bx + 0.25, 132.0, BY1 - 0.4, BZ - 0.75, BZ - 0.45, STEEL)
tbox(BX0, BX1, BY1 - 1.4, BY1 - 1.0, BZ - 0.75, BZ - 0.45, STEEL)

# ---------------------------------------------------------------------------
# The slab's band: a lit board across the middle section's face between its
# two signs, under the deck at 62 m, on a frame two metres off the face.
# ---------------------------------------------------------------------------
_r = random.Random(5101)
B.billboard(D, 2.5, 57.9, MB_ZF - MB_REC + 2.0, 19.0, 6.6, 0.0, _r, back=False)
for bx in (-6.0, 2.5, 11.0):
    tbox(bx - 0.18, bx + 0.18, 61.2, 61.6, MB_ZF - MB_REC, MB_ZF - MB_REC + 2.0, STEEL)
    tbox(bx - 0.18, bx + 0.18, 54.2, 54.6, MB_ZF - MB_REC, MB_ZF - MB_REC + 2.0, STEEL)
