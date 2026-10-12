"""What fills Corpo Plaza's blank surfaces: plant on the bare roofs and the
podiums' strips, steel and small adverts on the board's mount, screens and
marks over the towers' lobbies, the court behind the board's block, service
cores and a back's ground floor on the towers' east faces to Santo.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza_blocks import checked

MAST = mast  # (roof_fill's own argument is called mast)


# ---------------------------------------------------------------------------
# Roofs (ax5YUmkWf_Y@9: packed with plant and red lamps).
# ---------------------------------------------------------------------------
def roof_fill(x0, x1, z0, z1, y, seed, cell=4.6, mast=6.0):
    """Plant over a free rectangle of roof, one piece a cell: units in rows,
    a tank, ducts on legs, vent housings, a lit hatch, a small skylight, a
    dish, an antenna; and one mast with a red lamp where the lines allow."""
    r = random.Random(seed)
    nx, nz = max(1, int((x1 - x0) / cell)), max(1, int((z1 - z0) / cell))
    cw, cd = (x1 - x0) / nx, (z1 - z0) / nz
    small = min(cw, cd) < 3.4
    spots = []
    for i in range(nx):
        for j in range(nz):
            cx, cz = x0 + (i + 0.5) * cw + r.uniform(-0.3, 0.3), z0 + (j + 0.5) * cd + r.uniform(-0.3, 0.3)
            long_x = cw >= cd if small else r.random() < 0.5
            pick = r.random()
            spots.append((cx, cz))
            if pick < 0.22:
                for k in range(r.randrange(2, 4)):
                    o = (k - 1) * 1.25
                    P.place("ac_roof", cx + (o if long_x else 0.0), y, cz + (0.0 if long_x else o), 0.0 if long_x else math.pi / 2, district=PL)
            elif pick < 0.46:
                ln = max(cw, cd) * r.uniform(0.7, 0.95) if small else min(cw, cd) * r.uniform(0.7, 0.95)
                hw, hl = 0.34, ln / 2
                a = (cx - hl, cx + hl, cz - hw, cz + hw) if long_x else (cx - hw, cx + hw, cz - hl, cz + hl)
                box((PL, "metal", 0), a[0], a[1], y + 0.35, y + 0.95, a[2], a[3], scale=1.0, bottom=True)
                for t in (-0.8, 0.8):
                    lx, lz = (cx + hl * t, cz) if long_x else (cx, cz + hl * t)
                    box((PL, "metal", 1), lx - 0.3, lx + 0.3, y, y + 0.35, lz - 0.3, lz + 0.3, scale=1.0)
                ex, ez = (cx + hl - 0.35, cz) if long_x else (cx, cz + hl - 0.35)
                box((PL, "dark", 1), ex - 0.42, ex + 0.42, y + 0.95, y + 1.5, ez - 0.42, ez + 0.42, scale=1.0)
            elif pick < 0.6 and not small:
                w, d, h = r.uniform(1.6, 2.6), r.uniform(1.4, 2.2), r.uniform(1.3, 2.1)
                box((PL, "metal", 0), cx - w / 2, cx + w / 2, y, y + h, cz - d / 2, cz + d / 2, scale=1.0)
                box((PL, "dark", 1), cx - w / 2 - 0.1, cx + w / 2 + 0.1, y + h, y + h + 0.12, cz - d / 2 - 0.1, cz + d / 2 + 0.1, scale=1.0)
                box((PL, "glow", 1), cx - 0.3, cx + 0.3, y + h * 0.45, y + h * 0.55, cz + d / 2, cz + d / 2 + 0.03, scale=0.5, col=dim("amber", 0.8))
            elif pick < 0.7 and not small:
                P.place("tank_roof", cx, y, cz, r.uniform(0, 6.28), district=PL)
            elif pick < 0.8 and not small:
                box((PL, "metal", 0), cx - 1.3, cx + 1.3, y, y + 0.3, cz - 0.9, cz + 0.9, scale=1.0)
                up_poly((PL, "glow", 0), [(cx - 1.15, cz - 0.75), (cx + 1.15, cz - 0.75), (cx + 1.15, cz + 0.75), (cx - 1.15, cz + 0.75)], y + 0.31,
                        dim("white", r.uniform(0.3, 0.5)))
            elif pick < 0.9:
                P.place("dish", cx, y, cz, r.uniform(0, 6.28), district=PL)
            else:
                P.place("antenna", cx, y, cz, district=PL)
    if mast and spots:
        cx, cz = r.choice(spots)
        try:
            checked(cx - 1.0, cx + 1.0, cz - 1.0, cz + 1.0, y + mast + 0.6, "roof mast")
            mast_at = (cx + min(1.0, cw * 0.3), cz + min(1.0, cd * 0.3))
            MAST(mast_at[0], mast_at[1], y, mast)
        except ValueError:
            pass


for (x0, x1, z0, z1, y, seed, cell, m) in (
        # B1: the tower's podium strips, the slab's podium strips.
        (52.5, 54.8, -167.4, -132.6, 14.8, 8801, 2.3, 0.0), (55.2, 79.6, -135.7, -132.5, 14.8, 8802, 3.2, 0.0),
        (52.8, 61.2, -131.2, -124.4, 11.4, 8803, 4.0, 0.0), (52.8, 61.2, -105.6, -96.0, 11.4, 8804, 4.0, 5.0),
        (104.6, 107.4, -123.4, -100.6, 11.4, 8805, 2.8, 0.0), (62.0, 78.0, -99.4, -96.0, 11.4, 8806, 3.4, 0.0),
        (90.0, 104.0, -99.4, -96.0, 11.4, 8807, 3.4, 0.0),
        # B2: its podium's west and east ends, the hotel's roof between pool and garden.
        (52.6, 55.4, -33.0, -11.0, 11.4, 8811, 2.8, 0.0), (52.8, 61.2, -64.0, -47.4, 11.4, 8812, 4.0, 0.0),
        (98.8, 107.2, -56.4, -47.4, 11.4, 8813, 4.0, 0.0), (74.6, 89.4, -32.6, -15.4, 45.4, 8814, 4.6, 0.0),
        # D: round D1's landing pad, D1's podium strip, between D2 and D3, D4's south strip.
        (137.6, 149.4, -162.6, -153.4, 35.2, 8821, 3.8, 0.0), (137.6, 149.4, -140.6, -131.4, 35.2, 8822, 3.8, 0.0),
        (132.6, 135.4, -167.0, -127.0, 14.8, 8825, 2.8, 0.0), (137.0, 165.0, -100.4, -94.6, 11.4, 8826, 4.6, 6.0),
        (142.0, 169.4, -13.4, -10.6, 11.4, 8827, 2.8, 0.0)):
    roof_fill(x0, x1, z0, z1, y, seed, cell=cell, mast=m)

# ---------------------------------------------------------------------------
# The board's mount: either side of the screen the housing carries a truss,
# a catwalk, vents and two small adverts (small, so the board stays what
# the eye finds).
# ---------------------------------------------------------------------------
MZ = -263.85
rm = random.Random(8830)
for xa, xb in ((55.4, 64.5), (93.5, 102.6)):
    xs, ys = (xa, (xa + xb) / 2, xb), (22.6, 30.4, 38.2)
    for x in xs:
        box((PL, "metal", 0), x - 0.09, x + 0.09, 14.2, 38.4, MZ, MZ + 0.3, scale=1.0)
    for yy in ys:
        box((PL, "metal", 0), xa, xb, yy - 0.08, yy + 0.08, MZ, MZ + 0.3, scale=1.0)
    for x0_, x1_ in zip(xs, xs[1:]):
        for y0_, y1_ in zip(ys, ys[1:]):
            pipe((PL, "metal", 1), (x0_, y0_, MZ + 0.2), (x1_, y1_, MZ + 0.2), 0.05, segs=4)
            pipe((PL, "metal", 1), (x0_, y1_, MZ + 0.2), (x1_, y0_, MZ + 0.2), 0.05, segs=4)
    box((PL, "metal", 0), xa, xb, 30.3, 30.4, MZ, MZ + 1.0, scale=1.0, bottom=True)
    pipe((PL, "metal", 1), (xa, 31.4, MZ + 0.95), (xb, 31.4, MZ + 0.95), 0.03, segs=4)
    for x in xs:
        box((PL, "metal", 1), x - 0.03, x + 0.03, 30.4, 31.4, MZ + 0.92, MZ + 0.98, scale=0.5)
    mid, w = (xa + xb) / 2, xb - xa
    for (u, cy, sw, sh) in ((-0.25, 26.2, 2.4, 3.4), (0.26, 26.8, 2.2, 2.8)):
        screen(mid + u * w, cy, MZ + 0.5, sw, sh, 0.0, rm, back=False, depth=0.3)
    for (u, cy) in ((0.3, 23.4), (-0.32, 36.6)):
        vx = mid + u * w
        box((PL, "metal", 0), vx - 1.1, vx + 1.1, cy - 0.7, cy + 0.7, MZ, MZ + 0.28, scale=1.0)
        for k in range(5):
            box((PL, "dark", 1), vx - 0.95, vx + 0.95, cy - 0.55 + k * 0.25, cy - 0.47 + k * 0.25, MZ + 0.28, MZ + 0.33, scale=0.5)
# The square's side boards read as powered: a line of light under each.
for (cx, cy, cz, w, h, s) in ((44.6, 12.0, -205.0, 9.0, 6.0, 1), (44.6, 12.0, -228.0, 9.0, 6.0, 1), (109.4, 12.0, -205.0, 9.0, 6.0, -1), (109.4, 12.0, -228.0, 9.0, 6.0, -1)):
    nbox("yellow", *sorted((cx + s * 0.02, cx + s * 0.1)), cy - h / 2 - 0.36, cy - h / 2 - 0.26, cz - w / 2, cz + w / 2)

# ---------------------------------------------------------------------------
# Over the lobbies on the x 120 road: a wide screen over D2's, the tower's
# mark between two boards over D3's, fins of light up the podium's face.
# ---------------------------------------------------------------------------
rl = random.Random(8840)
screen(131.62, 8.1, -112.0, 15.0, 3.6, -math.pi / 2, rl, back=False, depth=0.3)
for z in (-124.6, -121.4, -102.6, -99.4):
    box((PL, "glow", 0), 131.86, 131.98, 4.9, 11.2, z - 0.09, z + 0.09, scale=1.0, col=dim("amber", 0.6))
for z in (-88.5, -69.5):
    big_sign("pm", 2.4, 131.8, 8.0, z, -math.pi / 2, double=False)
Plane(131.9, 8.0, -79.0, -math.pi / 2).rect((PL, "board_frame", 0), -3.0, 3.0, -2.9, 2.9)
emblem("rings", 131.88, 8.0, -79.0, 4.4, -math.pi / 2, "magenta")
for z in (-96.6, -61.4):
    box((PL, "glow", 0), 131.86, 131.98, 4.9, 11.2, z - 0.09, z + 0.09, scale=1.0, col=dim("magenta", 0.6))

# ---------------------------------------------------------------------------
# The court behind the board's block (z -292..-284): the tower's glass
# carries three tall screens under a band of light; the block's back has
# units, pipes, posters, a bin store, cables across to the tower.
# ---------------------------------------------------------------------------
rc = random.Random(8850)
for x in (58.6, 65.0, 71.4):
    screen(x, 3.3, -291.86, 3.0, 4.4, 0.0, rc, back=False, depth=0.2)
nbox("teal", 56.2, 71.8, 5.9, 6.0, -291.95, -291.9)
for x, yy in ((50.5, 5.6), (53.0, 9.2), (56.5, 5.4), (61.0, 8.8), (66.0, 5.6), (69.5, 12.4), (73.0, 9.0), (76.0, 5.6), (58.5, 12.6), (64.0, 16.2)):
    P.place("ac_wall", x, yy, -284.06, math.pi, district=PL)
for x, ln in ((52.0, 14.0), (63.2, 18.0), (75.0, 11.0)):
    P.place("pipe_v", x, 0.15, -284.12, math.pi, sy=ln, district=PL)
for x in (55.0, 67.6, 72.6):
    screen(x, 2.5, -284.1, 1.5, 2.1, math.pi, rc, back=False, depth=0.1)
P.place("dumpster", 74.4, 0.15, -285.2, math.pi, district=PL)
P.place("pallets", 76.6, 0.15, -285.0, 0.3, district=PL)
P.place("rubbish", 50.9, 0.15, -284.9, math.pi, district=PL)
for x in (53.3, 54.0):
    P.place("barrel", x, 0.15, -284.6, district=PL)
for x, y0_, y1_ in ((60.0, 7.4, 6.6), (70.5, 6.8, 7.6)):
    pts = [(x, y0_ + (y1_ - y0_) * t - 0.9 * math.sin(math.pi * t), -284.1 - 7.8 * t) for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
    for a, b in zip(pts, pts[1:]):
        pipe((PL, "metal", 1), a, b, 0.02, segs=3)
    box((PL, "glow", 1), x - 0.1, x + 0.1, pts[2][1] - 0.3, pts[2][1] - 0.05, pts[2][2] - 0.1, pts[2][2] + 0.1, scale=0.5, col=GLOW["amber"])
    light(PL, x, 3.0, pts[2][2], "amber", 4.0)

# ---------------------------------------------------------------------------
# D's faces to Santo: a back's ground floor along the podiums, a service
# core up each glass tower with slots of light, shades across the glass.
# ---------------------------------------------------------------------------
B.back_ground(PL, B.Face("+x", 170.03, -126.0, -60.0), random.Random(8861), B.TRIM[0])
for (xf, za, zb, y1, colour, zc) in ((165.0, -123.0, -101.0, 57.0, "amber", -112.0), (166.0, -94.0, -64.0, 59.0, "magenta", -79.0)):
    box((PL, "trim", 0), xf - 0.2, xf + 1.6, 11.4, y1, zc - 3.2, zc + 3.2, scale=2.0, col=B.TRIM[1])
    for k, z in enumerate((zc - 1.6, zc + 1.6)):
        yy = 14.0
        while yy + 5.0 < y1:
            box((PL, "glow", 0), xf + 1.6, xf + 1.63, yy, yy + 4.2, z - 0.12, z + 0.12, scale=1.0, col=dim(colour, 0.7))
            yy += 6.4
    box((PL, "glow", 1), xf + 1.3, xf + 1.6, y1, y1 + 0.4, zc - 0.2, zc + 0.2, scale=0.5, col=GLOW["red"])
    yy = 19.0
    while yy < y1 - 3.0:
        for (a, b) in ((za + 1.0, zc - 3.2), (zc + 3.2, zb - 1.0)):
            box((PL, "trim", 1), xf, xf + 0.7, yy, yy + 0.22, a, b, scale=1.5, col=B.TRIM[0])
        yy += 7.6
