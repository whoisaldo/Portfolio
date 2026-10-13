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
