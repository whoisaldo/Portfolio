"""The plaza's sign kit and what a walker meets at eye level (Fn9gKhU_2_Q@74,
@81, YRL74JmhVgk@133, @30): long adverts at bench height round the square
and on the terraces, hologram sleeves round lamp posts and palm trunks, one
large octagonal sign over the square's corner to the junction; and the
blank walls dressed: the court behind the board's block, the board's wings,
B2's face to the deck, D4's fascia by the south street, the corner by the
deck's mouth.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza_square import G, TY

rl = random.Random(8950)

# ---------------------------------------------------------------------------
# Long adverts at bench height: two on the carpet, two down the west side,
# one before the shops under the board, one on each terrace. All under
# 1.8 m: every camera's line across the square passes over them.
# ---------------------------------------------------------------------------
for (cx, cz, w, yaw, y, hue) in ((60.6, -205.5, 5.0, 0.0, G, "white"), (69.4, -205.5, 5.0, 0.0, G, "pink"),
                                 (50.4, -238.0, 4.6, math.pi / 2, G, "cyan"), (50.4, -211.2, 4.6, math.pi / 2, G, "white"),
                                 (66.8, -252.6, 5.0, 0.0, G, "amber"), (96.4, -251.6, 4.6, math.pi / 2, TY, "white"),
                                 (96.0, -211.6, 4.6, math.pi / 2, TY, "cyan")):
    low_screen(cx, cz, w, yaw, rl, y=y, hue=hue)

# ---------------------------------------------------------------------------
# Hologram sleeves: round three of the square's lamp posts (one of them the
# post a walker by the carpet stands next to), two palms' trunks and a
# terrace palm. (Bands of light, nothing solid: the posts and trunks are
# the kit's.)
# ---------------------------------------------------------------------------
for (cx, cz, y0, y1, r, hue, hue2) in ((54.6, -210.0, G + 1.3, G + 2.9, 0.2, "cyan", "white"), (76.0, -208.0, G + 1.3, G + 2.9, 0.2, "magenta", "white"),
                                      (90.6, -247.0, G + 1.3, G + 2.9, 0.2, "amber", "white"), (56.6, -211.2, G + 1.6, G + 3.2, 0.36, "cyan", "magenta"),
                                      (74.0, -200.0, G + 1.6, G + 3.2, 0.36, "pink", "white"), (102.8, -210.5, TY + 1.6, TY + 3.2, 0.36, "cyan", "white")):
    holo_wrap(cx, cz, y0, y1, r, hue, hue2)

# ---------------------------------------------------------------------------
# One large octagonal sign, where the square meets the junction: on a steel
# post over the plinth at its south-east corner, turned to the junction and
# to the square (9 m to its top: under every line listed for the square).
# ---------------------------------------------------------------------------
OX, OZ = 105.6, -196.6
box((PL, "metal", 0), OX - 0.16, OX + 0.16, G + 0.9, G + 5.0, OZ - 0.16, OZ + 0.16, scale=0.5)
for y in (G + 1.6, G + 2.4):
    walls((PL, "glow", 0), ngon(OX, OZ, 0.24, 6), y, y + 0.06, dim("cyan", 0.8))
octagon_sign(OX, G + 6.9, OZ, 3.8, math.radians(135), hue="cyan")
shine(OX + 1.4, 3.0, OZ + 1.4, "cyan", 4.0)

# ---------------------------------------------------------------------------
# The court behind the board's block (pz09): the block's back at z -284 has
# two roller shutters under lit headers and a board, standing adverts, lamps.
# ---------------------------------------------------------------------------
fb = B.Face("-z", -284.0, 48.0, 78.0)     # s runs from x 78 (left, seen from the court) to x 48
front_bay(fb, 15.2, 21.8, "dock", random.Random(8951), colour="white")
big_sign("ps", 1.7, 59.5, 4.3, -284.2, math.pi, double=False)
for x in (64.2, 69.6):
    P.place("lightbox", x, 0.15, -284.6, math.pi, district=PL)
    light(PL, x, 1.6, -285.4, "white", 4.0)
for x, hue in ((52.5, "amber"), (56.8, "white"), (62.0, "amber"), (66.8, "white")):
    box((PL, "glow", 0), x - 0.12, x + 0.12, 3.5, 3.62, -284.2, -284.05, scale=0.5, col=GLOW[hue])
    light(PL, x, 3.2, -285.0, hue, 5.0)

# ---------------------------------------------------------------------------
# The board's wings (the housing either side of the screen): light leaks in
# thin lines between its ribs, a column of type stands at each outer edge
# over the small adverts, three status lamps under it. Dim and narrow: the
# board stays what the eye finds.
# ---------------------------------------------------------------------------
MZ = -263.85
for xa, xb, sx in ((55.4, 64.5, 56.9), (93.5, 102.6, 101.1)):
    for k in range(7):
        y = 15.75 + k * 3.1
        if 22.0 < y < 29.5:
            continue
        box((PL, "glow", 0), xa + 0.3, xb - 0.3, y, y + 0.05, MZ, MZ + 0.02, scale=1.0, col=dim("white", 0.16))
    big_sign("bm", 1.5, sx, 34.2, MZ + 0.36, 0.0, double=False)
    for i, hue in enumerate(("green", "amber", "red")):
        box((PL, "glow", 1), sx - 0.5 + i * 0.5 - 0.07, sx - 0.5 + i * 0.5 + 0.07, 31.0, 31.14, MZ + 0.02, MZ + 0.08, scale=0.5, col=GLOW[hue])

# ---------------------------------------------------------------------------
# B2's face to the deck (z -65, seen across the deck's descent): its west
# bay is a service wall (a door under a caged lamp, units, pipes), two lit
# boards stand on its parapet, and fins run up the wing's glass. Nothing is
# north of z -65.9.
# ---------------------------------------------------------------------------
fn = B.Face("-z", -65.0, 52.0, 108.0)
for x, y in ((53.4, 6.2), (55.6, 8.8), (57.8, 6.0), (60.2, 9.2), (54.4, 9.6)):
    P.place("ac_wall", x, y, -65.06, math.pi, district=PL)
for x, ln in ((52.8, 10.6), (59.2, 10.6)):
    P.place("pipe_v", x, 0.15, -65.12, math.pi, sy=ln, district=PL)
box((PL, "board_frame", 0), 55.9, 57.3, 0.15, 2.4, -65.12, -65.0, scale=1.0)
box((PL, "glow", 0), 56.45, 56.75, 2.5, 2.62, -65.2, -65.05, scale=0.5, col=GLOW["amber"])
light(PL, 56.6, 2.4, -65.8, "amber", 5.0)
for x, size, k in ((69.0, "pm", 2.2), (90.5, "ps", 2.8)):
    h = ST_SIZES[size][1] * k
    big_sign(size, k, x, 12.4 + 0.5 + h / 2, -65.5, math.pi, double=False)
    for dx in (-1.5, 1.5):
        box((PL, "metal", 1), x + dx - 0.06, x + dx + 0.06, 12.4, 12.9, -65.62, -65.5, scale=0.5)
fin_row(B.Face("-z", -62.0, 62.0, 98.0), 2.2, 33.8, 12.6, 31.2, random.Random(8952), step=(2.2, 3.0), out=0.5, lit="teal", every=3, k=0.3)

# ---------------------------------------------------------------------------
# D4's fascia on the x 120 road (pz-pave-e: a bare band beside the walker):
# a board over each shop, a canopy with lamps under it by the corner.
# ---------------------------------------------------------------------------
fascia_signs_z(-58.0, -12.0, 132.0, -1, random.Random(8953), rate=0.9)
fd = B.Face("-x", 132.0, -60.0, -10.0)
fd.box((PL, "metal", 0), 12.0, 22.0, 3.5, 3.66, 0.0, 2.2)
for s in (13.5, 17.0, 20.5):
    fd.box((PL, "neon_white", 0), s - 0.4, s + 0.4, 3.46, 3.5, 1.0, 1.2)
fd.box((PL, "glow", 0), 12.0, 22.0, 3.52, 3.6, 2.2, 2.23, col=dim("pink", 0.7))
# And by the deck's mouth, B2's corner to the road: light on its pavement.
for (x, z, hue) in ((110.2, -63.0, "amber"), (110.6, -59.0, "white")):
    light(PL, x, 2.6, z, hue, 6.0)
P.place("lightbox", 111.7, 0.15, -61.4, 0.0, district=PL)
P.place("bollard_cube", 111.7, 0.15, -63.6, district=PL)
P.place("bollard_cube", 111.7, 0.15, -59.2, district=PL)
