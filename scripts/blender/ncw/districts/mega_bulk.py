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

# ---------------------------------------------------------------------------
# The shoulders. Beside the tiers, from the lane's wall back to the far
# city's line, the block stands up on either side to 160 and 182 m: the
# canyon's towers hide everything past x 38 from the hero below about 170 m
# (past x 46, 190 m), so from the air and the streets round it the
# megabuilding is a mass 136 m across behind its slab, the stepped tower
# rising out of its middle. Faces: windows of several kinds, walkways,
# balconies and units over the slab's height, cantilevered blocks, risers
# of light, screens; plant, masts and beacons on the roofs.
# ---------------------------------------------------------------------------
from ncw.districts.mega_face import dress, hero_hidden  # noqa: E402
from ncw.districts.mega_roofs import edge  # noqa: E402
from ncw.districts.mega_finish import roof_kit  # noqa: E402

SZ0, SZ1 = -850.0, -803.0                    # the shoulders' depth (the far city's line is z -855)
STYLES = ((0.62, 0, 0.8, 5), (0.5, 5, 0.6, 1), (0.7, 6, 0.9, 5), (0.45, 2, 0.5, 6), (0.66, 0, 0.55, 2), (0.55, 6, 0.75, 4))


def bands(f, y0, y1, seed, n=3):
    """A face's windows in vertical bands of different kinds of flat."""
    r = random.Random(seed)
    cuts = sorted(r.uniform(0.2, 0.8) * f.width for _ in range(n - 1))
    edges = [0.0] + cuts + [f.width]
    for a, b in zip(edges, edges[1:]):
        lit, style, warm, tint = r.choice(STYLES)
        B.facade_wall((D, "facade", 0), f, y0, y1, B.wall_col(lit * r.uniform(0.85, 1.1), style, warm, tint), r.randrange(0, 40), s0=a, s1=b)


def riser(f, s, y0, y1, hue, w=0.5):
    """A line of light straight up a face, on brackets."""
    f.quad((D, "neon_" + hue, 0), s - w / 2, s + w / 2, y0, y1, 0.42)
    y = y0 + 2.0
    while y < y1:
        fbox(f, (D, "metal", 1), s - 0.06, s + 0.06, y, y + 0.12, 0.0, 0.42)
        y += 9.0


FACES = {"+z": 1, "-z": 2, "+x": 3, "-x": 4}


def bulk(x0, x1, top, seed, inner, inner_from):
    """One shoulder's walls, x0..x1 from the lane to the far city's line;
    `inner`, the face towards the tiers, only from `inner_from` up."""
    outer = "+x" if inner == "-x" else "-x"
    spans = {inner: [(SZ0, SZ1, inner_from)], "+z": [(x0, x1, SHOP_H)], "-z": [(x0, x1, SHOP_H)], outer: [(SZ0, SZ1, SHOP_H)]}
    fs = shell(x0, x1, SZ0, SZ1, 0.0, top, (1, 1, 1, 1), seed, skip=tuple(spans))
    for name, f in fs.items():
        bands(f, inner_from if name == inner else SHOP_H, top, seed + FACES[name] * 13)
    HERO_MASSES.append(((x0, 0.0, SZ0), (x1, top, SZ1)))
    return fs


def upper(f, y0, top, seed, rate=0.04):
    """A face's floors over the slab's height: walkways, balconies, units."""
    k = 1
    while floor_y(k) < y0:
        k += 1
    dress(f, top, k, seed, [], people_rate=rate, weights=(0.22, 0.42, 0.36))


def lower(f, y0, y1):
    """Below the slab's height (seen only from the air and the lane): ledges
    every third floor."""
    k = 2
    while floor_y(k) < y1 - 1.0:
        if floor_y(k) > y0 and k % 3 == 0:
            f.ledge((D, "trim", 1), 0.3, f.width - 0.3, floor_y(k) - 0.2, 0.25, 0.3, CONC)
        k += 1


SHOULDERS = (
    # x0, x1, top, seed, inner face, inner from (the neighbour's top)
    (-50.0, -38.0, floor_y(46), 5110, "+x", 132.0),
    (-68.0, -50.0, floor_y(53), 5120, "+x", floor_y(46)),
    (38.0, 46.0, floor_y(44), 5130, "-x", 132.0),
    (46.0, 75.0, floor_y(53), 5140, "-x", floor_y(44)),
)
for (x0, x1, top, seed, inner, ifrom) in SHOULDERS:
    assert not hero_sees((x0, 0.0, SZ0), (x1, top + 1.0, SZ1)), (x0, x1, top)
    fs = bulk(x0, x1, top, seed, inner, ifrom)
    fS, fN = fs["+z"], fs["-z"]
    upper(fS, 96.0, top, seed + 1)
    lower(fS, SHOP_H, 96.0)
    lower(fN, SHOP_H, top)
    outer = fs["-x" if inner == "+x" else "+x"]
    upper(outer, 120.0, top, seed + 2)
    lower(outer, SHOP_H, 120.0)
    edge(x0, x1, SZ0, SZ1, top, ("+z", "-z", "+x", "-x"), rim=("amber", "cyan", "pink", "amber")[seed % 4])
    roof_kit(x0 + 1.0, x1 - 1.0, SZ0 + 1.0, SZ1 - 1.0, top, seed + 3, hue="amber", power=5.0)

# The two wide shoulders' faces: blocks hung off them, a riser of light up
# each, a column of screens, a beacon mast at the back corner.
fsW = B.faces_of(-68.0, -50.0, SZ0, SZ1)
fsE = B.faces_of(46.0, 75.0, SZ0, SZ1)
for (x0, x1, y0, y1, z0, z1, seed, faces, win) in (
        (-66.0, -54.0, floor_y(31), floor_y(36), SZ1, SZ1 + 6.5, 5151, ("+z", "-x", "+x"), 6),
        (-64.0, -52.0, floor_y(44), floor_y(48), SZ1, SZ1 + 5.0, 5152, ("+z", "-x", "+x"), 0),
        (-49.0, -40.0, floor_y(37), floor_y(41), SZ1, SZ1 + 5.5, 5153, ("+z", "-x", "+x"), 5),
        (49.0, 62.0, floor_y(33), floor_y(38), SZ1, SZ1 + 6.0, 5154, ("+z", "-x", "+x"), 0),
        (60.0, 73.0, floor_y(45), floor_y(49), SZ1, SZ1 + 6.5, 5155, ("+z", "-x", "+x"), 6),
        (39.0, 45.0, floor_y(36), floor_y(40), SZ1, SZ1 + 4.5, 5156, ("+z", "-x", "+x"), 5),
        (75.0, 81.0, floor_y(36), floor_y(42), -838.0, -816.0, 5157, ("+x", "+z", "-z"), 0),
        (55.0, 70.0, floor_y(28), floor_y(33), SZ0 - 6.0, SZ0, 5158, ("-z", "-x", "+x"), 6),
        (-64.0, -54.0, floor_y(24), floor_y(30), SZ0 - 5.0, SZ0, 5159, ("-z", "-x", "+x"), 5)):
    assert not hero_sees((x0, y0, min(z0, z1)), (x1, y1 + 1.0, max(z0, z1))), seed
    block(x0, x1, y0, y1, z0, z1, seed, faces=faces, window=win, tint=(seed % 3) * 2 + 1)
riser(fsW["+z"], 14.6, floor_y(29), floor_y(52), "magenta")
riser(fsE["+z"], 7.0, floor_y(29), floor_y(52), "cyan")
riser(fsE["+x"], 30.0, floor_y(12), floor_y(52), "pink")
riser(fsE["-z"], 21.0, floor_y(8), floor_y(50), "amber")
riser(fsW["-z"], 5.0, floor_y(8), floor_y(50), "cyan")
_rb = random.Random(5160)
for (cx, cy, cz, w, h, yaw) in ((-59.0, 112.0, SZ1 + 0.5, 12.0, 18.0, 0.0), (68.0, 104.0, SZ1 + 0.5, 10.0, 16.0, 0.0),
                                (75.5, 150.0, -828.0, 16.0, 9.0, math.pi / 2), (60.0, 120.0, SZ0 - 0.5, 18.0, 10.0, math.pi)):
    B.billboard(D, cx, cy, cz, w, h, yaw, _rb, back=False)
for (mx, mz, top, h) in ((-66.0, -847.0, floor_y(53), 20.0), (73.0, -847.0, floor_y(53), 18.0), (-40.0, -848.0, floor_y(46), 9.0)):
    assert not hero_sees((mx - 0.5, top, mz - 0.5), (mx + 0.5, top + h + 1.5, mz + 0.5)), (mx, h)
    cylinder((D, "metal", 0), mx, mz, top, top + h, 0.35, segs=6)
    for t in (0.45, 0.75):
        box((D, "metal", 1), mx - 1.6, mx + 1.6, top + h * t, top + h * t + 0.12, mz - 0.06, mz + 0.06, scale=0.5)
    cylinder((D, "glow", 0), mx, mz, top + h, top + h + 0.9, 0.5, segs=6, col=GLOW["red"])
