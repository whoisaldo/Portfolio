"""Round 4's fixes at street level: the passage lit down its middle and
hung with tubes and pipes from the gallery over its mouth, its floor
littered; the avenue's portal piers dressed in paint, bills, conduit and
hazard bands; the back block a walker meets beside the station given its tenants' windows
at arm's length.

The hero sees the passage's mouth and the piers from 620 to 755 m: what is
added there is paint and relief, and the passage's new light stays five
metres inside its mouth (z -750 and north).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B  # noqa: F401
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_homes import well_bays
from ncw.districts.mega_finish import fposter

PX0, PX1 = PASSAGE
CEIL = 4.0
_r = random.Random(9101)

# ---------------------------------------------------------------------------
# The passage: a second line of green tubes down its middle with their light
# on the floor (the floor's middle was a dark stripe between the walls'
# lamps), amber cages between, pipes and a tray under the gallery over its
# mouth (unlit: that is the hero's), cardboard and bags along the walls, a
# drain breathing in the green light.
# ---------------------------------------------------------------------------
for z in (-750.6, -754.6, -758.6, -762.0):
    tube_z(0.9, 3.93, z - 0.7, z + 0.7, "green", pools=False)
    box((D, "metal", 1), 0.76, 1.04, 3.93, CEIL, z - 0.8, z + 0.8, scale=0.5)
for (z, hue, pw) in ((-750.4, "green", 5.0), (-753.6, "amber", 4.0), (-757.0, "green", 5.5), (-760.4, "amber", 4.0), (-763.2, "green", 5.0)):
    light(D, 0.4, 3.6, z, hue, pw)
# Under the gallery over the mouth (z -745..-741, its underside at 4.1).
for (x, rr, col) in ((-3.6, 0.11, RUST), (-3.3, 0.06, STEEL), (2.8, 0.09, TEAL_PAINT), (3.1, 0.05, CONC)):
    rpipe((x, 3.92, -741.4), (x, 3.92, -748.0), rr, col=col)
tbox(-1.0, 1.0, 3.86, 3.92, -741.6, -748.0, STEEL, detail=1, bottom=True)
for z in (-742.4, -746.0):
    for x in (-1.0, 1.0):
        box((D, "metal", 1), x - 0.02, x + 0.02, 3.92, 4.1, z - 0.02, z + 0.02, scale=0.5)
# The floor: cardboard laid flat, bags and a drum against the walls, a
# puddle in the middle, a drain's breath.
for (x, z, w, d) in ((-3.9, -752.6, 1.0, 0.7), (3.6, -756.8, 0.9, 1.2), (-3.6, -759.4, 0.8, 0.6), (0.2, -747.6, 0.7, 0.5)):
    tbox(x - w / 2, x + w / 2, G0, G0 + 0.02, z - d / 2, z + d / 2, dim(CREAM, _r.uniform(0.45, 0.7)), detail=1)
for (name, x, z, yaw) in (("bags", PX0 + 0.6, -753.8, 0.3), ("drum", PX1 - 0.5, -752.6, 0.0), ("pallets", PX1 - 0.7, -760.6, 1.5),
                          ("bags", PX1 - 0.6, -747.6, 2.0), ("crates", PX0 + 0.6, -758.0, 1.5)):
    P.place(name, x, G0, z, yaw)
hquad((D, "roof_wet", 0), -0.9, 1.7, -757.6, -755.2, G0 + 0.014, scale=4.0)
hquad((D, "roof_wet", 0), -1.6, 0.6, -762.4, -760.8, G0 + 0.014, scale=4.0)
empty("anchor_steam_zz_drain_mega_1", (0.6, G0 + 0.03, -755.8))
cylinder((D, "metal", 1), 0.6, -755.8, G0, G0 + 0.02, 0.32, segs=10)
stand(PX1 - 0.55, -756.4, -math.pi / 2, "sit", G0 + 0.02)

# ---------------------------------------------------------------------------
# The avenue's portal piers (x 10.3..13.98 either side, z -612.2..-607.8):
# their faces in bills and paint, conduit up them, hazard bands round the
# legs, a stencil, a junction box.
# ---------------------------------------------------------------------------
from ncw.districts.mega_void import weather  # noqa: E402
for sx in (-1, 1):
    x0, x1 = sorted((sx * 10.3, sx * 13.98))
    for (name, plane, a0, a1) in (("+z", RAIL_Z + 2.2, x0, x1), ("-z", RAIL_Z - 2.2, x0, x1)):
        f = face(name, plane, a0, a1)
        weather(f, 0.2, f.width - 0.2, PIER_HEAD + 0.1, 9.0, 9110 + sx + (1 if name == "+z" else 0) * 3, band=False)
        for i in range(int(f.width // 0.5)):
            f.quad((D, "trim", 1), i * 0.5, i * 0.5 + 0.25, PIER_HEAD + 0.05, PIER_HEAD + 0.4, 0.012, col=dim(YEL, 0.55))
        x, _, z = f.p(f.at(0.5), 0.0, 0.14)
        rpipe((x, PIER_HEAD, z), (x, RAIL_UNDER - 0.2, z), 0.08, col=STEEL)
        x, _, z = f.p(f.at(f.width - 0.6), 0.0, 0.12)
        rpipe((x, PIER_HEAD, z), (x, RAIL_UNDER - 0.2, z), 0.05, col=RUST)
    # The legs: a hazard band at the foot of each and a box on the inner one.
    for (la, lb) in ((sx * 10.3, sx * 10.65), (sx * 13.72, sx * 13.98)):
        a, b = sorted((la, lb))
        for k in range(4):
            col = dim(YEL, 0.6) if k % 2 == 0 else BLACK
            tbox(a - 0.02, b + 0.02, 0.15 + k * 0.3, 0.45 + k * 0.3, RAIL_Z - 2.22, RAIL_Z + 2.22, col, detail=1)
    bx = sx * 10.48
    tbox(bx - 0.3, bx + 0.3, 1.1, 1.9, RAIL_Z + 2.2, RAIL_Z + 2.45, dim(BLUEGREY, 1.2), detail=1)

# ---------------------------------------------------------------------------
# The back block beside the station (b4, its west face at x 70) where the
# station view passes it at arm's length: its first floors as its tenants
# have them (the shader's windows read as empty rooms that close).
# ---------------------------------------------------------------------------
fb = face("-x", 70.0 - 0.02, -646.0, -630.0)
for k in (1, 2, 3):
    well_bays(fb, floor_y(k), _r, ring=False)
fposter(face("-x", 70.0, -640.0, -632.0), 3.0, 2.2, 1.2, 1.7, _r)

# ---------------------------------------------------------------------------
# Grime: what a night leaves on the ground everywhere a walker goes here,
# the forecourt, the street's pavements, the court, the avenue's pavements
# under the viaduct: stains dark and pale, trodden paper and card, cans,
# puddles that hold the signs; cables slung low between the columns.
# Clear of the walkers' and the walk camera's lines and of every fixed eye.
# ---------------------------------------------------------------------------
LINES_Z = (-729.0, -730.6, -731.4, -711.0, -709.4, -708.6)
EYES = ((0.3, -742.8), (3.0, -700.0), (2.0, -720.0), (-45.0, -721.0), (36.5, -712.15), (-30.6, -741.4), (-4.6, -777.0), (3.0, -660.0),
        (33.5, -744.0), (30.0, -718.0), (-30.0, -730.0), (-44.0, -738.0), (0.6, -746.5), (14.0, -726.5), (-14.0, -727.0), (6.0, -712.0))


def clear_at(x, z, avenue=False):
    if any(abs(z - lz) < 0.9 for lz in LINES_Z) and -100.0 < x < 70.0 and -735.0 < z < -705.0:
        return False
    if avenue and 10.9 < abs(x) < 13.3:
        return False
    return all(math.hypot(x - ex, z - ez) > 1.4 for ex, ez in EYES)


def grime(x0, x1, z0, z1, seed, k=1.0, avenue=False):
    r = random.Random(seed)
    area = (x1 - x0) * (z1 - z0) * k
    y = G0 + 0.011
    for _ in range(int(area / 7)):
        x, z = r.uniform(x0, x1), r.uniform(z0, z1)
        if not clear_at(x, z, avenue):
            continue
        w, d, a = r.uniform(0.4, 1.8), r.uniform(0.3, 1.2), r.uniform(0, math.pi)
        ca, sa = math.cos(a), math.sin(a)
        pts = [(x + ca * u - sa * v, y, z + sa * u + ca * v) for u, v in ((-w / 2, d / 2), (w / 2, d / 2), (w / 2, -d / 2), (-w / 2, -d / 2))]
        quad((D, "trim", 1), *pts, col=r.choice(((0.035, 0.035, 0.04, 1.0), (0.05, 0.045, 0.04, 1.0), (0.12, 0.12, 0.12, 1.0), (0.09, 0.07, 0.05, 1.0))))
    for _ in range(int(area / 9)):
        x, z = r.uniform(x0, x1), r.uniform(z0, z1)
        if not clear_at(x, z, avenue):
            continue
        w, d, a = r.uniform(0.15, 0.4), r.uniform(0.1, 0.3), r.uniform(0, math.pi)
        ca, sa = math.cos(a), math.sin(a)
        pts = [(x + ca * u - sa * v, y + 0.004, z + sa * u + ca * v) for u, v in ((-w / 2, d / 2), (w / 2, d / 2), (w / 2, -d / 2), (-w / 2, -d / 2))]
        quad((D, "trim", 1), *pts, col=r.choice(((0.5, 0.48, 0.42, 1.0), (0.42, 0.4, 0.36, 1.0), (0.5, 0.2, 0.25, 1.0), (0.2, 0.35, 0.45, 1.0))))
    for _ in range(int(area / 45)):
        x, z = r.uniform(x0 + 0.5, x1 - 0.5), r.uniform(z0 + 0.5, z1 - 0.5)
        if not clear_at(x, z, avenue):
            continue
        w, d = r.uniform(0.5, 1.0), r.uniform(0.4, 0.8)
        tbox(x - w / 2, x + w / 2, G0, G0 + 0.025, z - d / 2, z + d / 2, dim(CREAM, r.uniform(0.4, 0.7)), detail=1)
    for _ in range(int(area / 30)):
        x, z = r.uniform(x0, x1), r.uniform(z0, z1)
        if not clear_at(x, z, avenue):
            continue
        tbox(x - 0.035, x + 0.035, G0, G0 + 0.12, z - 0.035, z + 0.035, r.choice((dim(RED_PAINT, 1.4), (0.5, 0.5, 0.52, 1.0), dim(TEAL_PAINT, 1.8))), detail=1)
    for _ in range(int(area / 55)):
        x, z = r.uniform(x0 + 1.0, x1 - 1.0), r.uniform(z0 + 1.0, z1 - 1.0)
        if not clear_at(x, z, avenue):
            continue
        w, d = r.uniform(0.9, 2.6), r.uniform(0.6, 1.6)
        hquad((D, "roof_wet", 0), x - w / 2, x + w / 2, z - d / 2, z + d / 2, G0 + 0.016, scale=4.0)


grime(-47.5, 47.5, -744.6, -732.3, 9201)                            # the forecourt
grime(-90.0, 63.0, -732.0, -728.6, 9202, k=0.8)                     # the street's north pavement
grime(-90.0, 63.0, -711.4, -708.0, 9203, k=0.8)                     # and its south
grime(-12.6, 12.6, -785.6, -763.4, 9204, k=0.9)                     # the court
for sx in (-1, 1):
    a, b = sorted((sx * 10.4, sx * 14.0))
    grime(a, b, -707.0, -566.0, 9205 + sx, k=0.9, avenue=True)     # the avenue's pavements
# Cables slung between the forecourt's columns and the deck's edge, low.
_rc = random.Random(9210)
from ncw.districts.mega_base import W_COLS, M_COLS, E_COLS, COL_Z, M_TOP, W_TOP, E_TOP  # noqa: E402
cols = list(W_COLS) + list(M_COLS) + list(E_COLS)
for xa, xb in zip(cols, cols[1:]):
    if _rc.random() < 0.7:
        ya, yb = _rc.uniform(3.3, 4.2), _rc.uniform(3.3, 4.2)
        cable((xa, ya, COL_Z), (xb, yb, COL_Z + _rc.uniform(-0.6, 0.6)), _rc.uniform(0.5, 1.1), r=0.02)
    if _rc.random() < 0.5:
        cable((xa, _rc.uniform(3.0, 3.8), COL_Z), ((xa + xb) / 2, _rc.uniform(5.0, 6.5), -744.6), _rc.uniform(0.3, 0.8), r=0.015)
# A cable run along the ground from a junction box on a column to the wall.
for x in (-31.0, 28.3):
    tbox(x - 0.3, x + 0.3, 0.9, 1.6, COL_Z - 0.9, COL_Z - 0.66, dim(BLUEGREY, 1.2), detail=1)
    rpipe((x, G0 + 0.04, COL_Z - 0.9), (x + 0.4, G0 + 0.04, -744.4), 0.035, col=BLACK)
# The NCART wall a walker passes (WZ, x 22..44): bills between the posters.
from ncw.districts.mega_base import WZ  # noqa: E402
fo = face("+z", WZ, 22.0, 45.0)
for s in (0.8, 3.2, 7.6, 12.2, 16.4, 20.6):
    bill(fo, s, _rc.uniform(1.5, 2.1), _rc.uniform(0.5, 0.8), _rc.uniform(0.7, 1.0), _rc, out=0.04)
