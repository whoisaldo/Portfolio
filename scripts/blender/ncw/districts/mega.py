"""The Megabuilding: David's megabuilding and its street at the canyon's end.

Until this district is built to finished (BIBLE.md, "The Megabuilding"), its
frontages are lined by the shared massing (massing.py). The district's own
work replaces the call below; everything it builds is keyed to the district
name "mega" so it streams in its pack and tiles with it.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B  # noqa: F401
from ncw import props as P  # noqa: F401
from ncw.districts import massing

massing.mega()

# What the hero sees of the district at its vanishing point (the viaduct, the
# megablock across the avenue's end and its tower) is keyed "far", so it is
# in the core GLB the city goes live on. A set piece: BIBLE.md, "What does
# not move".
FA = "far"
# The avenue's far end is closed by a rail viaduct crossing it low against
# the glow at the vanishing point: a dark deck on four piers, a row of lamps
# along its edge, and now and then a lit train sliding across it (the site
# runs it, src/world/traffic.js, on anchor_rail's line).
RAIL_Z, RAIL_Y = -610.0, 13.0
box((FA, "dark", 0), -90, 90, RAIL_Y - 1.2, RAIL_Y + 2.2, RAIL_Z - 3.5, RAIL_Z + 3.5, scale=3.0)
box((FA, "metal", 0), -90, 90, RAIL_Y + 2.2, RAIL_Y + 3.1, RAIL_Z + 3.3, RAIL_Z + 3.5, scale=1.0)
for px in (-52.0, -12.5, 12.5, 52.0):
    box((FA, "dark", 0), px - 1.4, px + 1.4, 0, RAIL_Y - 1.2, RAIL_Z - 2.2, RAIL_Z + 2.2, scale=2.0)
for lx in range(-86, 90, 5):
    box((FA, "neon_amber", 0), lx - 0.18, lx + 0.18, RAIL_Y - 1.28, RAIL_Y - 1.18, RAIL_Z + 3.3, RAIL_Z + 3.6, scale=1.0)
empty("anchor_rail", (0.0, RAIL_Y + 2.2, RAIL_Z), props={"reach": 90.0})
# Past the viaduct the avenue ends at a megablock square across it, its
# windows mostly lit, and a taller tower stepped behind it: the vanishing
# point is lit structure standing in the glow, not open haze: less fogged
# than the rest of the city at that distance (facade_end), so it reads as
# a dark mass with its windows lit against the glow. The block stays under
# the holographic figure's feet and the tower stands left of her, never
# behind her. Vertical
# signs run up its face to the street. The far city keeps clear of both
# (anchor_mega_end).
# The block is a megabuilding: three sections across its face (the middle
# one set back, each its own height under the figure's feet), decks across
# the face every nineteen metres lit from under, a plant floor and a lit
# terrace on the lower roofs, and a bridge across to the tower behind. The
# tower steps back twice to a lit crown and a mast.
MB_SIGNS = ((-30.0, "magenta"), (-9.0, "cyan"), (14.0, "pink"), (33.0, "amber"))
for k, (x0, x1, top, rec) in enumerate(((-48.0, -18.0, 95.0, 0.0), (-18.0, 18.0, 89.0, 4.0), (18.0, 48.0, 83.0, 0.0))):
    mass(FA, x0, x1, -790, -745 - rec, SHOP_H, top, 4990 + k * 7, col=(0.82 if rec else 0.72, 2 / 8.0, 0.55, 1.0), mat="facade_end")
    # Its lit top edge, a hair proud of the face.
    box((FA, "neon_cyan" if k != 1 else "neon_pink", 0), x0 - 0.3, x1 + 0.3, top - 0.8, top, -745.0 - rec, -744.7 - rec, scale=1.0)
box((FA, "dark", 0), -48, 48, 0, SHOP_H, -790, -745, scale=2.0)
# The decks, broken where the signs run up the face.
gaps = sorted(vx for vx, _ in MB_SIGNS)
for y in (24.0, 43.0, 62.0, 79.0):
    edges = [-48.5] + [g for vx in gaps for g in (vx - 1.6, vx + 1.6)] + [48.5]
    for xa, xb in zip(edges[::2], edges[1::2]):
        box((FA, "dark", 0), xa, xb, y - 0.45, y, -745.0, -743.2, scale=2.0)
        box((FA, "neon_amber", 0), xa + 0.2, xb - 0.2, y - 0.55, y - 0.45, -743.6, -743.3, scale=1.0)
# The signs on each section's own face, as far proud of it as they always
# were: at the hero's 755 m a frame a quarter of a metre behind a sign is
# inside one step of the depth buffer, and it hid the cyan one, the
# vanishing point's one vertical accent.
for k, (vx, colour) in enumerate(MB_SIGNS):
    vh = 38.0 + (k % 2) * 22.0
    rec = 4.0 if -18.0 < vx < 18.0 else 0.0
    box((FA, "neon_" + colour, 0), vx - 1.1, vx + 1.1, 14.0, 14.0 + vh, -744.9 - rec, -744.6 - rec, scale=1.0)
# Plant on the roofs, and a lit terrace on the lowest.
box((FA, "metal", 1), -40.0, -26.0, 95.0, 99.0, -782.0, -770.0, scale=1.5)
box((FA, "metal", 1), -8.0, 6.0, 89.0, 92.0, -786.0, -776.0, scale=1.5)
for tx in range(20, 47, 4):
    box((FA, "neon_amber", 0), tx - 0.15, tx + 0.15, 83.0, 83.5, -746.0, -745.6, scale=0.5)
# The bridge to the tower behind, at the sixtieth metre.
box((FA, "facade_end", 0), -66.0, -48.0, 58.0, 64.0, -812.0, -800.0, scale=2.0)
box((FA, "neon_purple", 0), -66.0, -48.0, 57.5, 58.0, -800.1, -799.8, scale=1.0)
mb_t = (-97.0, -842.5)
prism(FA, cut_rect(*mb_t, 27.0, 27.5, 4.0), SHOP_H, 128.0, 4991, col=(0.6, 4 / 8.0, 0.3, 1.0), mat="facade_end")
band(FA, cut_rect(*mb_t, 27.0, 27.5, 4.0), 125.5, 128.0, "purple")
prism(FA, cut_rect(*mb_t, 21.0, 21.5, 3.5), 128.0, 180.0, 4992, col=(0.62, 4 / 8.0, 0.3, 1.0), mat="facade_end")
band(FA, cut_rect(*mb_t, 21.0, 21.5, 3.5), 177.5, 180.0, "purple")
prism(FA, cut_rect(*mb_t, 15.0, 15.0, 3.0), 180.0, 205.0, 4993, col=(0.85, 4 / 8.0, 0.3, 1.0), mat="facade_end")
band(FA, cut_rect(*mb_t, 15.0, 15.0, 3.0), 204.0, 205.0, "purple")
cylinder((FA, "metal", 0), mb_t[0], mb_t[1], 205.0, 228.0, 0.9, segs=8)
cylinder((FA, "neon_red", 0), mb_t[0], mb_t[1], 228.0, 230.0, 1.2, segs=8)
empty("anchor_mega_end", (0.0, 95.0, -780.0), props={"size": 150.0})
empty("anchor_mega_end_tower", (-97.0, 205.0, -842.0), props={"size": 80.0})
