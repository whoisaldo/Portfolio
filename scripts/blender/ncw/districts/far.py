from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)

# ---------------------------------------------------------------------------
# THE FAR AVENUE. Past the cross street the avenue runs on as a canyon of
# towers, lit windows and tall vertical signs, to the holographic figure at
# its end and the ARASAKA crest beside it. The hero looks straight down it:
# this is the vanishing point, and on a phone it is most of the picture.
# ---------------------------------------------------------------------------
FA = "far"
# Heights that fall away in the hero's eye: from the low camera each lot
# stands a little shorter than the one before it, so the canyon's roofs
# converge on the horizon and open a slot of sky at its end, where the
# figure and ARASAKA stand in the glow.
FAR_LOTS = {
    -1: [(-188, 30, 52), (-218, 34, 57), (-252, 36, 60), (-288, 40, 66), (-328, 44, 62),
         (-372, 50, 67), (-422, 60, 63), (-482, 70, 64), (-552, 60, 60), (-612, 66, 62), (-678, 70, 58)],
    1: [(-188, 34, 47), (-222, 36, 58), (-258, 40, 51), (-298, 44, 64), (-342, 50, 57),
        (-392, 56, 62), (-448, 66, 56), (-514, 62, 60), (-576, 70, 57), (-646, 76, 61)],
}
VERT_SIGNS = ["neon_magenta", "neon_cyan", "neon_pink", "neon_amber", "neon_blue", "neon_purple"]
for side, lots in FAR_LOTS.items():
    s = side
    for i, (z_start, depth, height) in enumerate(lots):
        z1, z0 = z_start, z_start - depth
        xa, xb = (WALK, WALK + 30) if s > 0 else (-WALK - 30, -WALK)
        seed = 4700 + i * 13 + (0 if s > 0 else 500)
        mass(FA, xa, xb, z0, z1, SHOP_H, height, seed, painted=(i + (1 if s > 0 else 2)) % 3)
        HERO_MASSES.append(((xa, 0.0, z0), (xb, height, z1)))
        box((FA, "dark", 0), xa, xb, 0.15, SHOP_H, z0, z1, scale=2.0)
        box((FA, "shop", 0), min(s * WALK, s * (WALK - 0.02)), max(s * WALK, s * (WALK - 0.02)), 0.6, 3.3, z0 + 1, z1 - 1, scale=2.0)
        clutter(FA, s, z0, z1, height, seed + 7)
        HERO_ROOFS.append((FA, xa, xb, z0, z1, height, seed + 31, 6.0, -s * math.pi / 2))
        # A tall vertical sign on most lots, facing down the avenue, the
        # plate's column of type running up the facades.
        if i % 3 != 2:
            h = min(height * 0.5, 40.0)
            x = s * (WALK - 1.6)
            sid = f"far_{'l' if s < 0 else 'r'}{i}"
            sign(sid, x, SHOP_H + 3 + h / 2, z1 - 3.0, 2.2, h, 0.0, preview="夜", district=FA)
            box((FA, "board_frame", 0), x - 1.25, x + 1.25, SHOP_H + 2.8, SHOP_H + 3.2 + h, z1 - 3.25, z1 - 3.05, scale=1.0)

# Every roof the hero looks along, dressed now that all their masses are
# known, with only what its lens cannot see.
for district, x0_, x1_, z0_, z1_, top_, seed_, cap_, face_ in HERO_ROOFS:
    dress_roof(district, x0_, x1_, z0_, z1_, top_, seed_, cap=cap_, face=face_, hero=True)

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

# The figure's image is 2:3; the plane matches it. Huge, as the plate has
# her: from the hero camera her waist is over the canyon's last roofs and
# her head at the top of the frame, past the last lots, over the road's end.
HOLO = (-12.4, 154.0, -570.0, 104.0, 156.0)
hx, hy, hz, hw, hh = HOLO
named_quad("holo_figure", "holo", hx, hy, hz, hw, hh, 0.0, props={"district": FA})
empty("anchor_holo", (hx, hy, hz))
# Her slogan on a tall blade on the canyon's right, on the one lot there
# without a column of its own.
sign("beauty", WALK - 2.5, SHOP_H + 18.0, -261.0, 4.4, 30.0, 0.0, preview="美しさは、力だ", district=FA)
box((FA, "board_frame", 0), WALK - 4.75, WALK - 0.25, SHOP_H + 2.8, SHOP_H + 33.2, -261.25, -261.05, scale=1.0)

# ARASAKA's tower stands right of her, a block off the avenue, its name in
# the band of sky between her and the canyon's right-hand roofs, turned to
# the hero's lens, where the plate has it.
ARASAKA = (75.0, -490.0)
ax, az = ARASAKA
# A corporation's tower: a podium wider than the tower with a lit lobby, a
# shaft with its corners cut back, the red band at the setback, the upper
# floors square so the name has its whole face, the second red band, and a
# crown of red fins round a dark head with a mast over it. The width the
# hero's band of sky frames is the shaft's, as before.
prism(FA, cut_rect(ax, az, 32.0, 32.0, 5.0), SHOP_H, 21.0, 4500, col=(0.55, 2 / 8.0, 0.45, 1))
box((FA, "dark", 0), ax - 32, ax + 32, 0, SHOP_H, az - 32, az + 32, scale=4.0)
band(FA, cut_rect(ax, az, 32.0, 32.0, 5.0), SHOP_H - 0.6, SHOP_H - 0.2, "white", out=0.2)
band(FA, cut_rect(ax, az, 32.0, 32.0, 5.0), 20.2, 21.0, "red", out=0.25)
prism(FA, cut_rect(ax, az, 26.0, 26.0, 5.0), 21.0, 110.0, 4501, col=(0.3, 0.5, 0.2, 1))
band(FA, cut_rect(ax, az, 26.0, 26.0, 5.0), 108.0, 110.0, "red", out=0.3)
mass(FA, ax - 22, ax + 22, az - 22, az + 22, 110, 182, 4502, col=(0.22, 0.5, 0.2, 1))
box((FA, "neon_red", 0), ax - 22.3, ax + 22.3, 180.2, 182.2, az - 22.3, az + 22.3, scale=1.0)
sign("arasaka", ax, 159.0, az + 22.6, 44.0, 15.0, 0.0, preview="ARASAKA", district=FA)
prism(FA, cut_rect(ax, az, 18.0, 18.0, 3.5), 182.2, 203.0, 4503, col=(0.08, 4 / 8.0, 0.2, 1))
for sx, sz, alongx in ((0, 1, True), (0, -1, True), (1, 0, False), (-1, 0, False)):
    for f in (-10.0, -3.4, 3.4, 10.0):
        fx = ax + (f if alongx else sx * 18.25)
        fz = az + (sz * 18.25 if alongx else f)
        wx, wz = (0.45, 0.3) if alongx else (0.3, 0.45)
        box((FA, "neon_red", 0), fx - wx, fx + wx, 184.0, 201.5, fz - wz, fz + wz, scale=1.0)
box((FA, "neon_red", 0), ax - 18.3, ax + 18.3, 202.4, 203.2, az - 18.3, az + 18.3, scale=1.0)
cylinder((FA, "metal", 0), ax, az, 203.0, 232.0, 0.8, segs=8)
cylinder((FA, "neon_red", 0), ax, az, 232.0, 234.0, 1.1, segs=8)
