"""The megabuilding as one mass from the air: its wings' towers joined to
its shoulders over the back lane by two more masses, and every tall face
of it, wings, joins and shoulders, girdled by the same heavy decks at the
same heights, yellow along their edges and dotted with amber, so that from
a flying car it reads as one structure in floors rather than a cluster of
towers.

All of it is beyond what the hero sees (the joins' tops are lowered until
kit.hero_sees says so; each band is tested the same way).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_face import dress, STRATA
from ncw.districts.mega_wings import T2, T2_TOP, ET2, ET2_TOP, T1_TOP, ET1_TOP, f2, g2
from ncw.districts.mega_bulk import SHOULDERS, SZ0, SZ1, riser

FACE_T = (D, "trim", 0)


def hidden_top(x0, x1, z0, z1, y0, ymax):
    """The highest floor line up to ymax at which a mass's top is still
    out of the hero's sight."""
    k = int((ymax - FLOOR0) // CELL_H) + 1
    while floor_y(k) > y0 + 10.0 and hero_sees((x0, y0, z0), (x1, floor_y(k), z1)):
        k -= 1
    return floor_y(k)


# ---------------------------------------------------------------------------
# The joins: from the east wing's tower back over the lane to the east
# shoulder, from the west wing's to the west shoulder.
# ---------------------------------------------------------------------------
JOINS = []
for (x0, x1, z0, z1, y0, want, seed, outer) in ((62.0, 76.0, SZ1, ET2[2], ET1_TOP, 152.0, 5801, "+x"),
                                                (-80.0, -62.0, SZ1, T2[2], T1_TOP, 166.0, 5802, "-x")):
    top = hidden_top(x0, x1, z0, z1, y0, want)
    assert not hero_sees((x0, y0, z0), (x1, top + 1.0, z1)), (x0, top)
    fs = shell(x0, x1, z0, z1, y0, top, B.wall_col(0.62, 6, 0.8, 4), seed, skip=("+z", "-z"))
    HERO_MASSES.append(((x0, y0, z0), (x1, top, z1)))
    # Its underside over the lane: ribs and lamps.
    hquad((D, "concrete", 0), x0, x1, z0, z1, y0, up=False, scale=2.0)
    for i in range(1, int((x1 - x0) // 3.0)):
        x = x0 + i * 3.0
        tbox(x - 0.25, x + 0.25, y0 - 0.9, y0, z0 + 0.3, z1 - 0.3, CONC, bottom=True)
        hquad((D, "glow", 1), x - 1.2, x - 0.6, (z0 + z1) / 2 - 0.3, (z0 + z1) / 2 + 0.3, y0 - 0.02, up=False, col=dim(GLOW["amber"], 0.5))
    for name in ("+x", "-x"):
        dress(fs[name], top, int((y0 - FLOOR0) // CELL_H) + 2, seed + (1 if name == "+x" else 2), [], people_rate=0.04, weights=(0.25, 0.4, 0.35))
    parapet(x0, x1, z0, z1, top, sides=("+x", "-x"), rim="amber")
    JOINS.append((x0, x1, z0, z1, top, fs[outer]))
print("mega joins (x0, top):", [(j[0], round(j[4], 1)) for j in JOINS])
# The block's number on each join's outer face, lit, high up, and a riser.
for (x0, x1, z0, z1, top, f) in JOINS:
    yaw = math.pi / 2 if f.name == "+x" else -math.pi / 2
    numeral("H4", f.plane + f.nx * 0.05, top - 14.0, (z0 + z1) / 2, 11.0, yaw, lit=0.85, pad=1.2)
    riser(f, 2.0, floor_y(18), top - 22.0, "amber" if f.name == "+x" else "cyan")

# ---------------------------------------------------------------------------
# The girdle: a deck round every tall face at the strata's heights.
# ---------------------------------------------------------------------------
def girdle(f, top, lo=96.0):
    for y in STRATA:
        if y < lo or y > top - 3.0:
            continue
        x0, x1 = sorted((f.at(0.0), f.at(f.width)))
        out = f.p(0.0, 0.0, 1.5)
        lo_, hi_ = ((x0, y - 0.6, min(f.plane, out[2])), (x1, y + 1.0, max(f.plane, out[2]))) if f.nx == 0 else \
            ((min(f.plane, out[0]), y - 0.6, x0), (max(f.plane, out[0]), y + 1.0, x1))
        if hero_sees(lo_, hi_):
            continue
        fbox(f, FACE_T, 0.0, f.width, y - 0.6, y, 0.0, 1.5, col=CONC, bottom=True)
        fbox(f, FACE_T, 0.0, f.width, y, y + 1.0, 1.36, 1.5, col=CONC)
        f.quad(FACE_T, 0.0, f.width, y - 0.6, y - 0.25, 1.512, col=YEL)
        n = max(1, int(f.width // 3.2))
        for i in range(n):
            s = f.width * (i + 0.5) / n
            f.quad((D, "glow", 1), s - 0.2, s + 0.2, y + 0.4, y + 0.52, 1.514, col=AMBER_DOT)
            if i % 2 == 0:
                hx, _, hz = f.p(f.at(s), 0.0, 0.75)
                hquad((D, "glow", 1), hx - 0.35, hx + 0.35, hz - 0.35, hz + 0.35, y - 0.62, up=False, col=dim(GLOW["amber"], 0.4))


for name in ("+z", "-x", "+x", "-z"):
    girdle(f2[name], T2_TOP)
for name in ("+z", "+x", "-x", "-z"):
    girdle(g2[name], ET2_TOP)
for (x0, x1, z0, z1, top, f) in JOINS:
    for g in B.faces_of(x0, x1, z0, z1).values():
        if g.name in ("+x", "-x"):
            girdle(g, top)
for (x0, x1, top, seed, inner, ifrom) in SHOULDERS:
    for g in B.faces_of(x0, x1, SZ0, SZ1).values():
        if g.name != inner:
            girdle(g, top)
