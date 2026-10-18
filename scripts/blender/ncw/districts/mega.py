"""The Megabuilding: David's megabuilding and its street at the canyon's end.

What the hero sees of the district at its vanishing point (the viaduct, the
megablock across the avenue's end and its tower) is keyed "far", so it is in
the core GLB the city goes live on, and is a set piece (BIBLE.md, "What does
not move"): its outline, its three sections, its four vertical signs, the
viaduct's dark deck and its row of lamps are as the plate was matched to.
Everything else here is keyed "mega" and streams in with the district's own
pack: the block's base and decks, its light well, its wings, its roofs, its
street, the blocks east of the canyon and the station the viaduct runs into
(the mega_* modules beside this one, run from the bottom of this file).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B  # noqa: F401
from ncw import props as P  # noqa: F401
from ncw.districts.mega_kit import (D, FA, RAIL_Z, RAIL_Y, RAIL_UNDER, RAIL_TOP, PIER_HEAD, MB_X0, MB_X1, MB_ZB, MB_ZF, MB_REC,
                                    MB_SECTIONS, MB_SIGNS, WELL, PASSAGE)

# ---------------------------------------------------------------------------
# The viaduct. The avenue's far end is closed by a rail viaduct crossing it
# low against the glow at the vanishing point: a dark deck, a row of lamps
# along its edge, and now and then a lit train sliding across it (the site
# runs it, src/world/traffic.js, on anchor_rail's line).
# ---------------------------------------------------------------------------
box((FA, "dark", 0), -90, 90, RAIL_UNDER, RAIL_TOP, RAIL_Z - 3.5, RAIL_Z + 3.5, scale=3.0)
box((FA, "metal", 0), -90, 90, RAIL_TOP, RAIL_Y + 3.1, RAIL_Z + 3.3, RAIL_Z + 3.5, scale=1.0)
# Its piers. The two outer ones stand behind the canyon's rows. The two at
# the avenue stand on its pavements, so each is a portal the pavement runs
# through: a slim leg at the kerb, a pilaster at the lot line, and the pier's
# mass from over head height up to the deck.
for px in (-52.0, 52.0):
    box((FA, "dark", 0), px - 1.4, px + 1.4, 0, RAIL_UNDER, RAIL_Z - 2.2, RAIL_Z + 2.2, scale=2.0)
for s in (-1, 1):
    for xa, xb, y0 in ((10.3, 10.65, 0.0), (13.72, 13.98, 0.0), (10.3, 13.98, PIER_HEAD)):
        x0, x1 = sorted((s * xa, s * xb))
        box((FA, "dark", 0), x0, x1, y0, PIER_HEAD if y0 == 0.0 else RAIL_UNDER, RAIL_Z - 2.2, RAIL_Z + 2.2, scale=2.0,
            bottom=y0 > 0.0)
for lx in range(-86, 90, 5):
    box((FA, "neon_amber", 0), lx - 0.18, lx + 0.18, RAIL_Y - 1.28, RAIL_Y - 1.18, RAIL_Z + 3.3, RAIL_Z + 3.6, scale=1.0)
# (x0, x1: where the line runs in the open, from Japantown's portal to the
# station's, for the site to keep the train to.)
empty("anchor_rail", (0.0, RAIL_TOP, RAIL_Z), props={"reach": 90.0, "x0": -94.0, "x1": 92.0})

# ---------------------------------------------------------------------------
# The megablock. Past the viaduct the avenue ends at a megabuilding square
# across it, its windows mostly lit, and a taller tower stepped behind it:
# the vanishing point is lit structure standing in the glow, less fogged than
# the rest of the city at that distance (facade_end). The block stays under
# the holographic figure's feet and the tower stands left of her. Three
# sections across its face (the middle one set back, each its own height),
# decks across the face every nineteen metres lit from under, vertical signs
# up the face to the street, plant on the roofs, a bridge to the tower.
#
# The middle section is built round a light well open to the sky, and the
# ground floor round a passage from the street to the well's court: the
# hero's lens sees neither (the well from no height it reaches; the passage
# as a few dark pixels under the viaduct, closed by the court's north wall).
# ---------------------------------------------------------------------------
for k, (x0, x1, top, rec) in enumerate(MB_SECTIONS):
    col = (0.82 if rec else 0.72, 2 / 8.0, 0.55, 1.0)
    mass(FA, x0, x1, MB_ZB, MB_ZF - rec, SHOP_H, top, 4990 + k * 7, col=col, mat="facade_end", roof=not rec)
    HERO_MASSES.append(((x0, 0.0, MB_ZB), (x1, top, MB_ZF - rec)))
    # Its lit top edge, a hair proud of the face.
    box((FA, "neon_cyan" if k != 1 else "neon_pink", 0), x0 - 0.3, x1 + 0.3, top - 0.8, top, MB_ZF - rec, MB_ZF + 0.3 - rec, scale=1.0)
# The middle section's roof, round the well.
_x0, _x1, _top = MB_SECTIONS[1][:3]
for (ax, bx, az, bz) in ((_x0, _x1, WELL[3], MB_ZF - MB_REC), (_x0, _x1, MB_ZB, WELL[2]),
                         (_x0, WELL[0], WELL[2], WELL[3]), (WELL[1], _x1, WELL[2], WELL[3])):
    quad((FA, "roof", 0), (ax, _top, bz), (bx, _top, bz), (bx, _top, az), (ax, _top, az),
         ((0, 0), ((bx - ax) / 4, 0), ((bx - ax) / 4, (bz - az) / 4), (0, (bz - az) / 4)))
# The ground floor, dark, in five pieces round the passage and the well's
# court; the piece across the court's north side a little taller, so nothing
# is seen over it through the passage.
for (ax, bx, az, bz, top) in ((MB_X0, WELL[0], MB_ZB, MB_ZF, SHOP_H), (WELL[1], MB_X1, MB_ZB, MB_ZF, SHOP_H),
                              (WELL[0], PASSAGE[0], WELL[3], MB_ZF, SHOP_H), (PASSAGE[1], WELL[1], WELL[3], MB_ZF, SHOP_H),
                              (WELL[0], WELL[1], MB_ZB, WELL[2], SHOP_H + 0.6)):
    box((FA, "dark", 0), ax, bx, 0, top, az, bz, scale=2.0)
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
    rec = MB_REC if -18.0 < vx < 18.0 else 0.0
    box((FA, "neon_" + colour, 0), vx - 1.1, vx + 1.1, 14.0, 14.0 + vh, -744.9 - rec, -744.6 - rec, scale=1.0)
# Plant on the roofs (the middle section's behind the well), and a lit
# terrace on the lowest.
box((FA, "metal", 1), -40.0, -26.0, 95.0, 99.0, -782.0, -770.0, scale=1.5)
box((FA, "metal", 1), -8.0, 6.0, 89.0, 92.0, -789.4, -784.2, scale=1.5)
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

# The district's own pack: everything the hero does not need to go live on.
from ncw.districts import mega_mass  # noqa: E402,F401
from ncw.districts import mega_base  # noqa: E402,F401
from ncw.districts import mega_face  # noqa: E402,F401
from ncw.districts import mega_wings  # noqa: E402,F401
from ncw.districts import mega_roofs  # noqa: E402,F401
from ncw.districts import mega_east  # noqa: E402,F401
from ncw.districts import mega_street  # noqa: E402,F401
from ncw.districts import mega_more  # noqa: E402,F401
from ncw.districts import mega_rail  # noqa: E402,F401
from ncw.districts import mega_well  # noqa: E402,F401
from ncw.districts import mega_finish  # noqa: E402,F401
from ncw.districts import mega_bulk  # noqa: E402,F401
from ncw.districts import mega_top  # noqa: E402,F401
from ncw.districts import mega_void  # noqa: E402,F401
from ncw.districts import mega_life  # noqa: E402,F401
from ncw.districts import mega_court  # noqa: E402,F401
from ncw.districts import mega_fix  # noqa: E402,F401
from ncw.districts import mega_mono  # noqa: E402,F401
from ncw.districts import mega_shaft  # noqa: E402,F401
from ncw.districts import mega_stack  # noqa: E402,F401
from ncw.districts import mega_roofline  # noqa: E402,F401
