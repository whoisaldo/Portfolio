"""Corpo Row's second rank: nine towers on the back row's blocks, north of
the lane and the track, taller than the seven and lit floor on floor, so
that from across the boulevard (the Experience shot's lens at (120, 30,
-230), looking up at the crowns) the row stands in front of a city and not
in front of the sky: warm runs of floors between and over the crowns,
adverts and columns of characters high on them, lanterns and masts above.
No two are one shape: a shouldered slab, two spires in stages, a screen
tower, a split slab, three ribbed drums, a stepped block, the corner's slab.
The plant building (x 268..298) keeps its low roof: a fixed view stands
over it. Each stands on the back block under it (corpo_north.back_row).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw.districts.corpo_kit import *  # noqa: F401,F403
from ncw.districts import corpo_kit as K

BACK0, BACK1 = -419.5, -384.0
F = K.floor_at


def shaft(x0, x1, z0, z1, y0, y1, r, seed, hue=None, lit=(0.3, 0.6), hot=0.42, warm=(0.6, 1.0), belts=(), fin=0.0, band=False, strips=False):
    """One stage of a tower: curtain wall on all four faces lit by the
    floor, a roof, fins down its south face; on a tower's last stage (band)
    a line of light under its parapet. (Lines up every stage's corners and
    round every setback were a rim of neon on every edge.)"""
    K.skin(K.rect(x0, x1, z0, z1), K.rect(x0, x1, z0, z1), y0, y1, r, seed, lit=lit, hot=hot, warm=warm, belts=belts, sys=7 + int(seed * 1000) % 2)
    K.roof_quad(x0, x1, z0, z1, y1)
    B.ROOFS.append((CO, x0, x1, z0, z1, y1))
    B.COLLISION.append(("box", x0, x1, y0, y1, z0, z1, CO))
    if fin:
        K.fins(B.Face("+z", z1, x0, x1), y0, y1, fin)
        K.fins(B.Face("-x", x0, z0, z1), y0, y1, fin * 1.6, detail=1)
    if hue and band:
        K.edge_line(x0, x1, z0, z1, y1 - 0.7, hue, h=0.3, out=0.1)
    if hue and strips:
        for cx in (x0, x1):
            K.strip_v(cx, z1, y0 + 1.0, y1 - 1.0, hue)


def lantern(x0, x1, z0, z1, y, hue, mast_h, h=4.6):
    """A tower's head: a lantern of dim light in a dark frame, a line of
    light round its cap, a mast."""
    c = GLOW[hue]
    box(k("glow"), x0 + 0.9, x1 - 0.9, y + 0.6, y + h, z0 + 0.9, z1 - 0.9, scale=1.0, col=(c[0] * 0.3, c[1] * 0.3, c[2] * 0.3, 1.0))
    for xa, xb, za, zb in ((x0, x0 + 0.5, z0, z1), (x1 - 0.5, x1, z0, z1), (x0, x1, z0, z0 + 0.5), (x0, x1, z1 - 0.5, z1)):
        box(k("trim"), xa, xb, y, y + 0.6, za, zb, scale=2.0, col=K.BLACK)
    box(k("trim"), x0, x1, y + h, y + h + 0.7, z0, z1, scale=2.0, col=K.BLACK)
    K.edge_line(x0, x1, z0, z1, y + h + 0.7, hue, h=0.2, out=0.08)
    if mast_h:
        K.mast((x0 + x1) / 2, (z0 + z1) / 2, y + h + 0.7, mast_h, lamps=3)


def frame_crown(x0, x1, z0, z1, y, hue, h=9.0, mast_h=0.0):
    """A tower's head left open: steel posts and two rings of beam over the
    roof, a line of light on each, plant inside."""
    for cx in (x0 + 0.2, (x0 + x1) / 2, x1 - 0.2):
        for cz in (z0 + 0.2, z1 - 0.2):
            box(k("steel"), cx - 0.2, cx + 0.2, y, y + h, cz - 0.2, cz + 0.2, scale=2.0, col=K.STEEL)
    for yy in (y + h * 0.55, y + h):
        for xa, xb, za, zb in ((x0, x1, z0, z0 + 0.4), (x0, x1, z1 - 0.4, z1), (x0, x0 + 0.4, z0, z1), (x1 - 0.4, x1, z0, z1)):
            box(k("steel"), xa, xb, yy - 0.5, yy, za, zb, scale=2.0, col=K.STEEL, bottom=True)
        K.edge_line(x0, x1, z0, z1, yy - 0.3, hue, h=0.16, out=0.06)
    K.chiller(x0 + 2.0, x1 - 2.0, z0 + 3.0, z0 + 7.0, y, h=2.6)
    if mast_h:
        K.mast(x0 + 3.0, z1 - 4.0, y, h + mast_h, lamps=3)
    for cx, cz in ((x0, z0), (x0, z1), (x1, z0), (x1, z1)):
        K.aviation(cx, y + h, cz)


def stages(x0, x1, z0, z1, y0, steps, r, hue, seed, **kw):
    """Stages one on another, each ((inset -x, +x, -z, +z), top). Returns
    the last one's rectangle and top."""
    y = y0
    for j, (ins, top) in enumerate(steps):
        x0, x1, z0, z1 = x0 + ins[0], x1 - ins[1], z0 + ins[2], z1 - ins[3]
        shaft(x0, x1, z0, z1, y, top, r, seed, hue, fin=3.4, band=j == len(steps) - 1, **kw)
        y = top
    return x0, x1, z0, z1, y


def screens_up(cx, z, y0, w, heights, r, seed, gap=0.6):
    """A column of adverts up a south face, in one frame, a line of light
    down each side of it."""
    y = y0
    for j, h in enumerate(heights):
        K.advert(cx, y + h / 2, z + 0.3, w, h, 0.0, j, seed=seed, depth=0.2)
        y += h + gap
    box(k("board_frame"), cx - w / 2 - 0.5, cx + w / 2 + 0.5, y0 - 0.5, y, z, z + 0.08, scale=2.0)
    for sx in (-1, 1):
        K.glow_box(cx + sx * (w / 2 + 0.36) - 0.06, cx + sx * (w / 2 + 0.36) + 0.06, y0 - 0.3, y - 0.3, z + 0.08, z + 0.14, "cyan")
    return y


def drum(cx, cz, ap, y0, y1, r, seed, hue, belts=(), ribs=True):
    """A drum of sixteen faces in curtain wall, a rib at every corner, a
    ring of light at its head."""
    rad = ap / math.cos(math.pi / 16)
    plan = [(cx + rad * math.sin((i - 0.5) * math.tau / 16), cz + rad * math.cos((i - 0.5) * math.tau / 16)) for i in range(16)]
    K.skin(plan, plan, y0, y1, r, seed, lit=(0.45, 0.75), hot=0.5, warm=(0.5, 0.95), belts=belts, sys=8)
    pts = [(x, y1, z) for x, z in plan]
    poly(k("roof"), pts, [(x / 4, z / 4) for x, _, z in pts])
    B.COLLISION.append(("box", cx - ap, cx + ap, y0, y1, cz - ap, cz + ap, CO))
    c = GLOW[hue]
    for j, (px, pz) in enumerate(plan):
        th = (j - 0.5) * math.pi / 8
        if ribs and j % 2 == 0:
            oriented_box(k("trim", 0 if 5 <= j <= 12 else 1), px + math.sin(th) * 0.1, (y0 + y1) / 2, pz + math.cos(th) * 0.1, 0.5, y1 - y0, 0.7, th, scale=2.0, col=K.BLACK)
        qx, qz = plan[(j + 1) % 16]
        mx, mz = (px + qx) / 2, (pz + qz) / 2
        rotated_quad(k("glow"), mx + math.sin(j * math.pi / 8) * 0.05, y1 - 0.6, mz + math.cos(j * math.pi / 8) * 0.05, math.hypot(qx - px, qz - pz), 0.3, j * math.pi / 8, col=c)
    return plan


r = random.Random(7901)

# W: a blade on the west block's back wing (40 m), east of the x 120 road's
# axis, to 146 m: windows and a line of light, no screen (it stands at the
# Experience shot's left edge, where the page's words are).
shaft(120.5, 130.0, -418.0, -399.0, 40.0, 146.0, r, 0.05, "amber", lit=(0.45, 0.75), hot=0.4, belts=((F(26), F(27)),), fin=3.1, warm=(0.8, 1.0), band=True)
box(k("trim"), 120.3, 130.2, 146.0, 148.0, -418.2, -398.8, scale=2.0, col=K.BLACK)
K.mast(125.2, -408.5, 148.0, 13.0, lamps=2)

# A: the shouldered slab, on the first back block (x 137..160, 72 m).
shaft(139.4, 157.6, -417.0, -386.4, 72.0, 128.0, r, 0.11, "cyan", belts=((F(22), F(23)),), fin=3.2)
shaft(139.4, 151.4, -415.0, -388.4, 128.0, 172.0, r, 0.11, "cyan", belts=((F(36), F(37)),), fin=3.0)
frame_crown(139.4, 151.4, -415.0, -388.4, 172.0, "cyan", h=8.0, mast_h=14.0)
K.rail(151.6, -386.6, 157.4, -386.6, 128.0, "cyan", glow=True)
K.rail(157.4, -386.6, 157.4, -416.8, 128.0, "cyan", glow=True)
K.roof_plant(151.8, 157.2, -414.0, -390.0, 128.0, r, cap=3.0, tall=False)
K.big_sign(145.4, 157.0, -388.4 + 0.4, "bx", 4.6, 0.0, 1, depth=0.3)
K.advert(148.5, 104.0, -386.4 + 0.3, 13.0, 7.4, 0.0, 2, seed=0.23, depth=0.2)

# B: the amber spire, on the first block's wing (x 160..182, 110 m).
bx0, bx1, bz0, bz1, by = stages(160.0, 182.0, BACK0, BACK1, 110.0, (((6.0, 0.0, 15.5, 1.0), 150.0), ((4.0, 0.0, 6.0, 0.0), 186.0)), r, "amber", 0.37,
                                belts=((F(31), F(32)),), warm=(0.85, 1.0))
lantern(bx0, bx1, bz0, bz1, by, "amber", 26.0)
K.big_sign(176.0, 168.0, bz1 + 0.4, "bl", 2.6, 0.0, 4, depth=0.3)

# D: the screen tower, on the stepped block behind the second gap
# (x 188..226, 84 m): three stages to 228 m, a column of adverts up the
# middle one, a ring of light for a head and two masts.
dx0, dx1, dz0, dz1, dy = stages(188.0, 226.0, BACK0, BACK1, 84.0, (((3.0, 13.0, 5.5, 3.0), 150.0), ((2.0, 2.0, 2.0, 1.0), 198.0), ((2.0, 2.0, 3.0, 1.0), 228.0)),
                                r, "pink", 0.52, belts=((F(26), F(27)), (F(40), F(41))), warm=(0.7, 1.0))
screens_up(202.0, -388.0, 154.0, 9.4, (6.2, 12.6, 6.2, 12.0), r, 0.44)
K.advert(204.5, 112.0, -387.0 + 0.3, 14.0, 8.0, 0.0, 3, seed=0.61, depth=0.2)
for yy in (dy + 0.4, dy + 2.4):
    K.edge_line(dx0, dx1, dz0, dz1, yy, "pink", h=0.5, out=0.5)
box(k("trim"), dx0 - 0.6, dx1 + 0.6, dy, dy + 3.4, dz0 - 0.6, dz1 + 0.6, scale=2.0, col=K.BLACK)
for mx in (dx0 + 2.5, dx1 - 2.5):
    K.mast(mx, (dz0 + dz1) / 2, dy + 3.4, 17.0, lamps=2)

# E: the split slab over the halt's block (x 232..262, 44 m): the cyan
# spire in three stages to 208 m and, across a slot two metres wide, a
# slab to 192 m with a column of characters down its face.
ex0, ex1, ez0, ez1, ey = stages(232.0, 262.0, BACK0, BACK1, 44.0, (((2.0, 13.0, 0.0, 0.0), 120.0), ((0.0, 1.0, 17.5, 2.0), 168.0), ((1.0, 1.0, 4.0, 1.0), 208.0)),
                                r, "cyan", 0.71, belts=((F(18), F(19)), (F(34), F(35))), warm=(0.35, 0.8))
lantern(ex0, ex1, ez0, ez1, ey, "cyan", 24.0)
shaft(251.0, 262.0, -416.0, -386.0, 44.0, 192.0, r, 0.29, "amber", lit=(0.4, 0.7), hot=0.45, belts=((F(12), F(13)), (F(29), F(30)), (F(44), F(45))), fin=3.6, warm=(0.05, 0.3))
# Down its east face, where a flyer behind the row sees it: a column of
# adverts in one frame, a line of light up its edge.
for j, (yy, hh) in enumerate(((46.0, 9.0), (56.4, 5.4), (63.2, 9.0))):
    K.advert(262.0 + 0.2, yy + hh / 2, -401.0, 6.0, hh, math.pi / 2, 5 + j * 2, seed=0.61, depth=0.16)
K.glow_box(262.0, 262.3, 45.0, 73.6, -397.6, -397.45, "amber")
box(k("trim"), 250.8, 262.2, 192.0, 194.2, -416.2, -385.8, scale=2.0, col=K.BLACK)
K.edge_line(250.8, 262.2, -416.2, -385.8, 193.4, "amber", h=0.4, out=0.06)
K.aviation(256.5, 194.2, -401.0, 0)
K.big_sign(256.5, 166.0, -386.0 + 0.4, "bl", 3.3, 0.0, 5, depth=0.3)
for yy, xa in ((96.0, 248.8), (140.0, 247.8), (176.0, 246.8)):
    box(k("trim"), xa, 251.2, yy, yy + 3.4, -398.0, -394.0, scale=2.0, col=K.BLACK, bottom=True)
    K.glow_box(xa, 251.2, yy + 1.2, yy + 2.4, -394.0, -393.94, "white")

# G: the pink spire on the stacked block's east end (x 304..338, 70 m), to
# 205 m, and a lower wing on its west end.
gx0, gx1, gz0, gz1, gy = stages(304.0, 338.0, BACK0, BACK1, 70.0, (((16.0, 0.0, 7.5, 5.0), 150.0), ((4.0, 0.0, 10.0, 0.0), 205.0)), r, "pink", 0.83,
                                belts=((F(28), F(29)), (F(45), F(46))), warm=(0.6, 0.95), lit=(0.45, 0.75), hot=0.5)
lantern(gx0, gx1, gz0, gz1, gy, "pink", 20.0)
shaft(306.2, 318.0, -416.0, -389.2, 70.0, 122.0, r, 0.83, "amber", belts=((F(24), F(25)),), fin=3.4, warm=(0.2, 0.5), band=True)
K.big_sign(304.0 - 0.4, 52.0, -402.6, "bl", 2.8, -math.pi / 2, 2, depth=0.3)
K.roof_plant(307.0, 317.4, -414.0, -391.0, 122.0, r, cap=4.0)
K.advert(329.0, 126.0, -389.0 + 0.3, 12.0, 7.0, 0.0, 4, seed=0.35, depth=0.2)
K.big_sign(331.0, 178.0, gz1 + 0.4, "bx", 4.4, 0.0, 3, depth=0.3)

# H: three drums on the tallest back block (x 344..378, 90 m), to 215 m:
# ribbed, a ring of light at each head, a ring of adverts round the second.
hx, hz = 361.0, -402.0
drum(hx, hz, 14.2, 90.0, 150.0, r, 0.19, "cyan", belts=((F(27), F(28)),))
plan = drum(hx, hz, 12.0, 150.0, 190.0, r, 0.19, "cyan", belts=((F(43), F(44)),))
drum(hx, hz, 9.2, 190.0, 215.0, r, 0.19, "amber")
for n_, j in enumerate((12, 13, 14, 15, 0, 1, 2)):
    (ax, az), (bx_, bz_) = plan[j], plan[(j + 1) % 16]
    th = j * math.pi / 8
    K.advert((ax + bx_) / 2 + math.sin(th) * 0.25, 160.0 + 4.4 * (n_ % 2), (az + bz_) / 2 + math.cos(th) * 0.25, 4.5, 6.4 - 2.2 * (n_ % 2), th, n_, seed=0.9, depth=0.16)
cylinder(k("trim"), hx, hz, 215.0, 216.2, 9.6, segs=16, col=K.BLACK)
cylinder(k("glow"), hx, hz, 216.2, 219.0, 5.0, segs=12, col=tuple(c * 0.35 for c in GLOW["amber"][:3]) + (1.0,))
cylinder(k("trim"), hx, hz, 219.0, 219.6, 5.6, segs=12, col=K.BLACK)
K.mast(hx, hz, 219.6, 18.0, lamps=2)

# I: the stepped block by the corner (x 384..408, 62 m): five steps back
# from the lane, a line of light and a rail on every one, to 166 m.
iz1 = -386.6
y = 62.0
for j, top in enumerate((98.0, 122.0, 142.0, 156.0, 166.0)):
    shaft(386.6, 405.4, -417.0, iz1, y, top, r, 0.47, "amber", belts=((F(20), F(21)),) if j == 0 else (), fin=3.6 if j < 2 else 0.0, band=j == 4,
          warm=(0.75, 1.0))
    if j:
        K.rail(386.8, iz1 + 3.8, 405.2, iz1 + 3.8, y, "amber", glow=True)
    y, iz1 = top, iz1 - 4.0
K.pad(396.0, -410.0, 166.0, r=5.6, colour="amber")
K.advert(396.0, 86.0, -386.6 + 0.3, 13.0, 7.6, 0.0, 6, seed=0.14, depth=0.2)
K.big_sign(400.0, 110.5, -390.6 + 0.4, "bl", 2.2, 0.0, 6, depth=0.3)

# J: the corner's slab, over the corner block's back part (x 432..470,
# 48 m): two stages to 158 m, adverts on its south and west faces, a
# lantern. Its east face is the district's edge.
jx0, jx1, jz0, jz1, jy = stages(432.0, 469.7, BACK0, BACK1, 48.0, (((3.0, 3.7, 2.5, 2.0), 122.0), ((5.0, 5.0, 4.0, 2.0), 158.0)), r, "cyan", 0.63,
                                belts=((F(17), F(18)), (F(34), F(35))), warm=(0.4, 0.85))
lantern(jx0, jx1, jz0, jz1, jy, "cyan", 16.0)
screens_up(450.5, -386.0, 84.0, 11.0, (7.0, 12.0, 7.0), r, 0.76)
K.advert(435.0 - 0.3, 100.0, -401.0, 12.0, 7.0, -math.pi / 2, 1, seed=0.76, depth=0.2)
K.big_sign(451.0, 141.0, jz1 + 0.4, "bx", 4.8, 0.0, 7, depth=0.3)
