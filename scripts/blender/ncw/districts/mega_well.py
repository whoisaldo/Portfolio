"""The passage and the well's court, lit and furnished as the show's.

The passage (Fn9gKhU_2_Q@1): green tubes down the ceiling, caged sodium
lamps on the walls, each with its pool on the floor (the site's bake lights
a wall at every height over a pool, so the pools are what light the walls
too); pipes, a duct and a cable tray on the ceiling; lockers, drums, bags,
tyres, posters. The court (Fn9gKhU_2_Q@21, KvMY1uzSC1E@13): the glass
roof's violet-white light as pools on the floor, pipes and units round the
walls, lit posters and small signs, a rail crossing low over it.

The pools stay at least five metres inside the face (z -750 and north):
the face is the hero's.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403

PX0, PX1 = PASSAGE
ZC0, ZC1 = WELL[3], MB_ZF
CEIL = 4.0
wx0, wx1, wz0, wz1 = WELL
L1 = floor_y(1)
_r = random.Random(8701)


def poster(x, y, z, w, h, yaw, r=_r):
    """A lit advert in a frame on a wall (the site draws it); a paper bill
    where that advert already shows within its cell."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    if not advert_free(x - nz * w / 2, y - h / 2, z + nx * w / 2, nx, nz):
        name, plane, along = (("+z" if nz > 0 else "-z"), z, x) if abs(nz) > 0.5 else (("+x" if nx > 0 else "-x"), x, z)
        bill(face(name, plane, along - w / 2, along + w / 2), w / 2, y, w, h, r, out=0.07)
        return
    oriented_box((D, "board_frame", 0), x + nx * 0.03, y, z + nz * 0.03, w + 0.14, h + 0.14, 0.06, yaw, scale=1.0)
    col = (r.randrange(8) / 8.0 + 0.01, r.randrange(8) / 8.0 + 0.01, r.random(), 1.0)
    rotated_quad((D, "billboard", 0), x + nx * 0.07, y, z + nz * 0.07, w, h, yaw, col=col)


def tyres(x, z, n=3, r=0.34):
    for i in range(n):
        cylinder((D, "dark", 1), x + 0.05 * math.sin(i * 2.1), z + 0.05 * math.cos(i * 1.7), G0 + i * 0.23, G0 + i * 0.23 + 0.22, r, segs=10)


def lockers(x, z0, z1, nx, col=TEAL_PAINT, h=1.9, d=0.45):
    """A row of steel lockers against a wall at x, facing nx."""
    xa, xb = sorted((x, x + nx * d))
    tbox(xa, xb, G0, G0 + h, z0, z1, col)
    n = max(1, round((z1 - z0) / 0.45))
    for i in range(n + 1):
        z = z0 + (z1 - z0) * i / n
        tbox(x + nx * d - 0.005, x + nx * d + 0.005 + nx * 0.004, G0, G0 + h, z - 0.012, z + 0.012, BLACK, detail=1)
    for i in range(n):
        z = z0 + (z1 - z0) * (i + 0.5) / n
        rotated_quad((D, "trim", 1), x + nx * (d + 0.008), G0 + h - 0.35, z, 0.26, 0.08, nx * math.pi / 2, col=BLACK)
        rotated_quad((D, "metal", 1), x + nx * (d + 0.008), G0 + 1.0, z + 0.12, 0.03, 0.12, nx * math.pi / 2)


# ---------------------------------------------------------------------------
# The passage.
# ---------------------------------------------------------------------------
# More sodium lamps down both walls, and a second row of tubes.
for z in (-753.4, -761.6):
    wall_lamp(PX0 + 0.02, 2.55, z, 1, 0, "amber", 5.0)
for z in (-752.0, -760.2):
    wall_lamp(PX1 - 0.02, 2.55, z, -1, 0, "amber", 5.0)
for z in (-750.8, -754.8, -758.8):
    tube_z(-2.1, 3.93, z - 0.6, z + 0.6, "green", pools=False)
    box((D, "metal", 1), -2.24, -1.96, 3.93, CEIL, z - 0.7, z + 0.7, scale=0.5)
light(D, -2.1, 3.9, -756.0, "green", 7.0)
light(D, -2.1, 3.9, -760.0, "green", 7.0)
# The ceiling: a duct with its hangers, a cable tray, pipes in a bank.
duct(1.5, 2.4, 3.45, 3.92, ZC0 + 0.5, ZC1 - 0.5)
for z in (-761.0, -757.0, -753.0, -749.0):
    box((D, "metal", 1), 1.42, 2.48, 3.4, 3.45, z - 0.04, z + 0.04, scale=0.5, bottom=True)
    for x in (1.44, 2.46):
        box((D, "metal", 1), x - 0.02, x + 0.02, 3.4, CEIL, z - 0.02, z + 0.02, scale=0.5)
tbox(-1.3, -0.7, 3.74, 3.8, ZC0 + 0.5, ZC1 - 0.5, STEEL, bottom=True)
for dx, rr, col in ((-4.3, 0.09, RUST), (-4.05, 0.05, CONC), (-3.05, 0.07, TEAL_PAINT), (4.1, 0.08, RUST), (4.4, 0.05, STEEL)):
    rpipe((dx, 3.84, ZC0 + 0.5), (dx, 3.84, ZC1 - 0.4), rr, col=col)
for z in (-761.6, -756.2, -750.6):
    tbox(-4.5, -2.8, 3.66, 3.72, z - 0.03, z + 0.03, STEEL, detail=1, bottom=True)
rpipe((PX0 + 0.14, G0, -759.2), (PX0 + 0.14, 3.8, -759.2), 0.09, col=RUST)
rpipe((PX1 - 0.12, G0, -754.6), (PX1 - 0.12, 3.8, -754.6), 0.07, col=TEAL_PAINT)
# Conduit along both walls, a painted dado, a number.
for x, nx in ((PX0 + 0.03, 1), (PX1 - 0.03, -1)):
    a, b = ((x, ZC1 - 0.3), (x, ZC0 + 0.3)) if nx > 0 else ((x, ZC0 + 0.3), (x, ZC1 - 0.3))
    vquad((D, "trim", 0), (a[0] + nx * 0.006, a[1]), (b[0] + nx * 0.006, b[1]), G0, G0 + 1.15, col=dim(TEAL_PAINT, 0.8))
    vquad((D, "trim", 1), (a[0] + nx * 0.008, a[1]), (b[0] + nx * 0.008, b[1]), G0 + 1.15, G0 + 1.23, col=YEL_OLD)
    rpipe((x + nx * 0.05, 3.1, ZC0 + 0.4), (x + nx * 0.05, 3.1, ZC1 - 0.4), 0.025, col=STEEL)
# What collects in it: lockers, tyres, drums on a pallet, bags, posters.
lockers(PX1 - 0.02, -758.3, -756.5, -1)
lockers(PX0 + 0.02, -750.0, -748.6, 1, col=BLUEGREY)
tyres(PX0 + 0.6, -762.0)
tyres(PX0 + 1.3, -761.7, n=2)
tyres(PX1 - 0.6, -749.8, n=4)
tbox(PX1 - 1.5, PX1 - 0.3, G0, G0 + 0.14, -762.6, -761.4, dim(CREAM, 0.7), detail=1)
for dx, dz in ((-1.15, -762.25), (-0.62, -762.3), (-0.9, -761.75)):
    P.place("drum", PX1 + dx, G0 + 0.14, dz)
P.place("bags", PX0 + 0.8, G0, -747.2, math.pi / 2)
P.place("bags", PX1 - 2.0, G0, -759.6, -0.6)
P.place("crates", PX0 + 0.8, G0, -756.6, math.pi / 2)
poster(PX0 + 0.02, 2.0, -755.0, 1.1, 1.5, math.pi / 2)
poster(PX0 + 0.02, 2.0, -752.2, 0.8, 1.1, math.pi / 2)
poster(PX1 - 0.02, 2.0, -760.2, 1.2, 1.5, -math.pi / 2)
poster(PX1 - 0.02, 1.95, -751.0, 0.8, 1.1, -math.pi / 2)

# ---------------------------------------------------------------------------
# The court.
# ---------------------------------------------------------------------------
# Lit posters and small signs on its walls.
poster(6.9, 2.3, wz0 + 0.03, 1.7, 2.3, 0.0)
poster(-2.9, 2.5, wz0 + 0.03, 1.3, 1.8, 0.0)
poster(wx0 + 0.03, 2.3, -772.5, 2.6, 1.6, math.pi / 2)
poster(-7.0, 2.4, wz1 - 0.03, 1.6, 2.2, math.pi)
for (x, y, z, size, yaw) in ((7.2, 3.3, wz1 - 0.16, "bx", math.pi), (wx0 + 0.16, 3.7, -767.5, "ps", math.pi / 2), (wx0 + 0.16, 3.7, -777.5, "ps", math.pi / 2),
                             (-6.6, 3.9, wz0 + 0.16, "pm", 0.0)):
    angled_sign(x, y, z, size, yaw, back=False)
blade(wx1 - 0.7, 3.2, -769.4, "bs", along="z")
box((D, "metal", 1), wx1 - 0.74, wx1 - 0.02, 4.22, 4.28, -769.43, -769.37, scale=0.5)
# Pipes, a duct and units round the walls over head height.
rpipe((wx0 + 0.16, 3.25, wz0 + 0.3), (wx0 + 0.16, 3.25, wz1 - 0.3), 0.1)
rpipe((wx0 + 0.13, 3.5, wz0 + 0.3), (wx0 + 0.13, 3.5, wz1 - 0.3), 0.06, col=STEEL)
rpipe((wx0 + 0.3, 4.1, wz0 + 0.14), (wx1 - 1.4, 4.1, wz0 + 0.14), 0.09, col=TEAL_PAINT)
rpipe((wx1 - 0.14, 3.75, -770.4), (wx1 - 0.14, 3.75, wz1 - 0.3), 0.08, col=RUST)
duct(PX1 + 0.6, wx1 - 0.3, 3.5, 4.1, wz1 - 0.75, wz1 - 0.05)
duct(wx0 + 0.3, PX0 - 0.8, 3.7, 4.15, wz1 - 0.6, wz1 - 0.05)
for (x, z, yaw) in ((wx0 + 0.02, -770.4, math.pi / 2), (wx0 + 0.02, -780.2, math.pi / 2), (2.6, wz0 + 0.02, 0.0), (-7.6, wz1 - 0.02, math.pi)):
    P.place("ac_wall", x, 2.9, z, yaw)
lockers(wx0 + 0.02, -775.4, -773.6, 1, col=RUST)
tyres(wx1 - 0.7, -764.2, n=3)
tyres(7.6, wz0 + 0.7, n=2)
# A rail crossing low over the court, the first thing the eye meets going
# up: yellow dashes along it, a steel rail, cables hung from it.
CY = floor_y(2)
tbox(wx0 + 1.5, wx1 - 1.5, CY - 0.3, CY, -775.3, -773.9, PALE, bottom=True)
for dz in (-775.3, -773.9):
    steel_rail((wx0 + 1.5, dz), (wx1 - 1.5, dz), CY, posts=1.8)
for i in range(9):
    x = wx0 + 2.2 + i * 1.7
    for z, yaw in ((-775.31, math.pi), (-773.89, 0.0)):
        rotated_quad((D, "glow", 1), x, CY - 0.15, z, 0.7, 0.1, yaw, col=dim(GLOW["yellow"], 0.75))
    hquad((D, "glow", 1), x - 0.35, x + 0.35, -774.68, -774.52, CY - 0.31, up=False, col=dim(GLOW["yellow"], 0.75))
stand(-3.0, -774.6, 0.0, "lean", CY)
stand(2.4, -774.6, math.pi, "phone", CY)
bundle((wx0 + 1.6, CY - 0.35, -774.6), (wx1 - 0.2, 5.4, -765.0), sag=0.9, n=2)
bundle((wx1 - 1.6, CY - 0.35, -774.6), (wx0 + 0.2, 6.2, -781.6), sag=1.1, n=3)
