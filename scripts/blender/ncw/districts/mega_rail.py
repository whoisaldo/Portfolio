"""The viaduct as a railway.

The deck itself (mega.py) is the hero's: a dark slab with a row of amber
lamps along its south edge, and from the avenue's far end that is all it may
be. So what is added where the hero's lens reaches (the 23 m over the
avenue's middle) is dark or hidden from it: plate-girder relief on the
fascia, edge girders that hang low enough to hide the lamps under the deck
from a lens at street level 600 m off, nothing lit that faces south. The
track, its sleepers, the cable troughs, the north fence, the north edge's
lamps and signs, the lamps under the deck and their pools on the road are
out of its sight; the catenary's portals stand where the canyon's walls
cover them (x 13.6 and beyond), only their wires crossing the avenue.

The train is the site's (src/world/traffic.js, on anchor_rail's line down
the deck's middle): the track here is where it runs.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B  # noqa: F401
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_face import hero_hidden

TOP, UNDER = RAIL_TOP, RAIL_UNDER
ZS, ZN = RAIL_Z + 3.5, RAIL_Z - 3.5              # the deck's south (hero's) edge and its north edge
GIRD = UNDER - 0.65                              # the edge girders' foot
X0, X1 = -94.0, 90.0                             # Japantown's collar to the station's wall
WIRE = TOP + 5.3                                 # the contact wire

# The track down the middle: a bed, sleepers, two rails; a cable trough and
# a fence along the north edge (the south edge's fence is the deck's own).
hquad((D, "trim", 0), X0, X1, RAIL_Z - 1.7, RAIL_Z + 1.7, TOP + 0.015, col=dim(CONC, 0.55))
_x = X0 + 0.35
while _x < X1:
    hquad((D, "glow", 1), _x - 0.13, _x + 0.13, RAIL_Z - 1.3, RAIL_Z + 1.3, TOP + 0.035, col=dim(PALE, 0.14))
    _x += 0.7
# (The sleepers and the rails' running faces are drawn as the faintest glow:
# nothing lights a deck 15 m up, and from the air the track must read. They
# face the sky, so no lens at street level sees them.)
for dz in (-0.72, 0.72):
    box((D, "metal", 0), X0, X1, TOP, TOP + 0.14, RAIL_Z + dz - 0.04, RAIL_Z + dz + 0.04, scale=1.0)
    hquad((D, "glow", 0), X0, X1, RAIL_Z + dz - 0.03, RAIL_Z + dz + 0.03, TOP + 0.145, col=dim(GLOW["white"], 0.12))
tbox(X0, X1, TOP, TOP + 0.22, ZN + 0.55, ZN + 1.0, CONC)
tbox(X0, X1, TOP, TOP + 0.16, ZS - 1.15, ZS - 0.8, dim(CONC, 0.8))
box((D, "metal", 0), X0, X1, TOP, TOP + 0.9, ZN, ZN + 0.2, scale=1.0)
# The edge girders under the deck, its whole length.
for z in (ZS - 0.5, ZN + 0.15):
    tbox(X0, X1, GIRD, UNDER, z, z + 0.35, STEEL, bottom=True)
# The north edge's lamps, as the south's.
for lx in range(-86, 90, 5):
    box((D, "neon_amber", 0), lx - 0.18, lx + 0.18, UNDER - 0.08, UNDER + 0.02, ZN - 0.1, ZN + 0.2, scale=1.0)
    rotated_quad((D, "glow", 1), lx + 2.5, TOP + 0.55, ZN - 0.012, 0.3, 0.1, math.pi, col=dim(GLOW["white"], 0.5))


def span(x0, x1):
    """A stretch of the deck seen from the street: cross ribs between the
    girders, and the fascias as plate girders (flanges, stiffeners)."""
    x = x0 + 1.25
    while x < x1 - 0.3:
        tbox(x - 0.12, x + 0.12, UNDER - 0.4, UNDER, ZN + 0.5, ZS - 0.5, STEEL, bottom=True, detail=1)
        for z, s in ((ZS, 1), (ZN, -1)):
            tbox(x - 0.07, x + 0.07, UNDER + 0.16, TOP - 0.16, min(z, z + s * 0.07), max(z, z + s * 0.07), STEEL, detail=1)
        x += 2.5
    for z, s in ((ZS, 1), (ZN, -1)):
        tbox(x0, x1, UNDER + 0.04, UNDER + 0.18, min(z, z + s * 0.1), max(z, z + s * 0.1), STEEL)
        tbox(x0, x1, TOP - 0.16, TOP, min(z, z + s * 0.1), max(z, z + s * 0.1), STEEL)


def under_lamp(x, dz=-0.9, hue="amber", power=3.0):
    """A sodium lamp under the deck, its pool on the road."""
    z = RAIL_Z + dz
    box((D, "metal", 1), x - 0.6, x + 0.6, UNDER - 0.36, UNDER, z - 0.2, z + 0.2, scale=0.5, bottom=True)
    box((D, "glow", 0), x - 0.5, x + 0.5, UNDER - 0.5, UNDER - 0.36, z - 0.13, z + 0.13, scale=0.5, col=GLOW[hue], bottom=True)
    light(D, x, 8.0, z, hue, power)


def gantry(x, hue="red"):
    """A catenary portal across the track: two posts, a trussed beam, the
    arm the wire hangs from, a lamp on each post's head. The pair at the
    avenue's kerbs is the one the hero's lens can reach (a quarter of a metre
    of dark steel at 620 m, less than half a pixel): no lamps on those."""
    assert hue is None or hero_hidden(x - 0.3, x + 0.3, TOP, TOP + 7.2, ZS), x
    k = (D, "metal", 1)
    za, zb = ZN + 0.32, ZS - 0.5
    for z in (za, zb):
        box(k, x - 0.13, x + 0.13, TOP, TOP + 6.7, z - 0.13, z + 0.13, scale=0.5)
        if hue:
            box((D, "glow", 1), x - 0.12, x + 0.12, TOP + 6.7, TOP + 6.95, z - 0.12, z + 0.12, scale=0.5, col=GLOW[hue])
    for y in (TOP + 5.95, TOP + 6.55):
        box(k, x - 0.08, x + 0.08, y, y + 0.1, za, zb, scale=0.5, bottom=True)
    n = 6
    for i in range(n):
        z0, z1 = za + (zb - za) * i / n, za + (zb - za) * (i + 1) / n
        ya, yb = (TOP + 6.0, TOP + 6.6) if i % 2 == 0 else (TOP + 6.6, TOP + 6.0)
        quad(k, (x, ya - 0.04, z0), (x, yb - 0.04, z1), (x, yb + 0.04, z1), (x, ya + 0.04, z0))
        quad(k, (x, yb - 0.04, z1), (x, ya - 0.04, z0), (x, ya + 0.04, z0), (x, yb + 0.04, z1))
    box(k, x - 0.05, x + 0.05, WIRE, TOP + 5.95, RAIL_Z - 0.05, RAIL_Z + 0.05, scale=0.5)
    box(k, x - 0.05, x + 0.05, WIRE + 0.2, WIRE + 0.28, RAIL_Z - 1.1, RAIL_Z + 0.05, scale=0.5)


GANTRIES = (-88.0, -76.0, -62.0, -48.0, -30.0, -13.6, 13.6, 30.0, 48.0, 62.0, 76.0, 88.0)
for gx in GANTRIES:
    gantry(gx, None if abs(gx) < 14.0 else "green" if abs(gx) == 62.0 else "red")
for xa, xb in zip(GANTRIES, GANTRIES[1:]):
    cable((xa, TOP + 5.95, RAIL_Z), (xb, TOP + 5.95, RAIL_Z), sag=0.45, r=0.022)
    cable((xa, WIRE, RAIL_Z), (xb, WIRE, RAIL_Z), sag=0.04, steps=2, r=0.018)
    for t in (0.25, 0.5, 0.75):
        xm = xa + (xb - xa) * t
        box((D, "metal", 1), xm - 0.012, xm + 0.012, WIRE, TOP + 5.95 - 0.45 * math.sin(math.pi * t), RAIL_Z - 0.012, RAIL_Z + 0.012, scale=0.5)

# Over the avenue: ribs and plate girders, four lamps under the deck, two
# signs on the north fascia for whoever comes down from the megabuilding.
span(-14.0, 14.0)
for x in (-7.5, -2.5, 2.5, 7.5):
    under_lamp(x)
for x, size in ((-6.4, "pm"), (6.0, "pm")):
    angled_sign(x, UNDER + 1.75, ZN - 0.16, size, math.pi, back=False)
tbox(-11.0, 11.0, UNDER + 0.5, UNDER + 0.66, ZN - 0.34, ZN, BLACK, bottom=True)
# East of the canyon, over the lanes and the shops under the deck: the same,
# lamps over the lanes, blades hung off the deck's edges on brackets.
span(44.0, 90.0)
span(-66.0, -44.0)
for x, dz in ((46.5, 0.0), (50.0, -0.9), (91.0, 0.0)):
    under_lamp(min(x, 89.2), dz, "amber", 3.4)
for (x, s, size) in ((57.0, 1, "bm"), (70.5, 1, "bl"), (84.0, 1, "bm"), (62.5, -1, "bl"), (77.0, -1, "bm")):
    w, h = ST_SIZES[size]
    z = RAIL_Z + s * 4.3
    box((D, "metal", 1), x - 0.05, x + 0.05, UNDER - 0.12, UNDER - 0.02, min(RAIL_Z + s * 3.3, z + s * 0.2), max(RAIL_Z + s * 3.3, z + s * 0.2), scale=0.5, bottom=True)
    for dx in (-w / 2 + 0.1, w / 2 - 0.1):
        box((D, "metal", 1), x + dx - 0.02, x + dx + 0.02, UNDER - 0.6, UNDER - 0.02, z - 0.02, z + 0.02, scale=0.5)
    blade(x, UNDER - 0.66 - h / 2, z, size, along="z")
