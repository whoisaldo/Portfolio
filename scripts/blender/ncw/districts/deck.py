"""The Deck: the loop's elevated road over the avenue (BIBLE.md, "The Deck").

The west street's ramp climbs up the middle of the street going south, from
grade at plan.RAMP_FOOT_Z to the deck's height at the turn (plan.DECK_X0,
plan.DECK_Z), between a parapet and a walkway, the street's service lanes at
grade either side; the deck turns east there and crosses the avenue at
plan.DECK_Y, level to plan.DECK_TOP_X1, then down to grade by
plan.DECK_LAND_X and onto the x 120 road. Its road is the road graph's
heights exactly (exports.py: the drive camera and the cars ride them):

    ramp  y = DECK_Y * s((z - RAMP_FOOT_Z) / (DECK_Z - RAMP_FOOT_Z))
    deck  y = DECK_Y * (1 - s((x - DECK_TOP_X1) / (DECK_LAND_X - DECK_TOP_X1)))

with s(t) = t t (3 - 2 t) clamped to 0..1.

The frames (Zq4zTcIM0yQ@107, Fn9gKhU_2_Q@74 and @81, OifiVCnFKzM@28,
JtqIas3bYhg@64, Zq4zTcIM0yQ@166): a box girder on paired columns with thick
footings, a band of lit panels along both its faces in yellow, orange and
red, a yellow stripe along its foot, a concrete parapet with marker lights
and a lit kerb strip, sodium lamps on tall posts, its underside ribbed and
lit green and orange.

What the hero sees (the span over the avenue between the bents at x 17.5
either side: its dark south face, its underside, the rail along its edge,
the teal strip and the white lights under it, the sora sign) is keyed
"avenue", in the core GLB, at about the old overpass's size; the rest is
keyed "deck", its own pack.

The light: within 60 m of the avenue's line, anything lit on or under the
deck is `glow`, not neon or a sign: spill.js mirrors every neon, sign or
billboard face there into the hero's wet road as a streak, whether the hero
sees it or not. Pools on the ground come from kit.light() (not mirrored).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import plan
from ncw import props as P
from ncw import buildings as B

AV = "avenue"
DK = "deck"

Y = plan.DECK_Y                       # 8.5, the road's top on the level
DEPTH = plan.DECK_Y - plan.DECK_UNDER  # 1.3, the girder
ZN, ZS = plan.DECK_Z - plan.DECK_HALF, plan.DECK_Z + plan.DECK_HALF   # -85, -75
XW, XE = plan.DECK_X0 - plan.RAMP_HALF, plan.DECK_X0 + plan.RAMP_HALF  # -85, -75
FOOT = plan.RAMP_FOOT_Z               # -220
HERO = 17.5                           # the hero's span: x -17.5..17.5, the old piers
PAINT = 0.012                         # paint over the asphalt, as the streets' is

# Across the deck from its north edge (z), and across the ramp from its east
# edge (x), the same section mirrored: parapet, shoulder, two lanes, a
# barrier, a walkway on the outside of the turn, its rail.
PAR = 0.4         # the concrete parapet's thickness
PAR_H = 0.9
LANE_IN = 3.5     # lanes either side of the centre line
BAR = 0.18        # the barrier between the road and the walkway
RAIL = 0.08       # the rail along the outer edge, a steel panel
RAIL_H = 1.1
WALK_UP = 0.15    # the walkway over the road

WHITE = (0.78, 0.76, 0.70, 1.0)
YELLOW = (0.86, 0.66, 0.10, 1.0)
KERB_YELLOW = (0.55, 0.42, 0.07, 1.0)
DARK_TRIM = (0.05, 0.05, 0.055, 1.0)
STEEL = (0.11, 0.115, 0.13, 1.0)


def sm(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def ramp_y(z):
    return Y * sm((z - FOOT) / (plan.DECK_Z - FOOT))


def DY(x):
    """The deck's road at x: the graph's height."""
    return Y * (1.0 - sm((x - plan.DECK_TOP_X1) / (plan.DECK_LAND_X - plan.DECK_TOP_X1)))


def RY(z):
    """The ramp's road at z: the graph's height, eased over its last ten
    metres (3 cm) so it meets the turn's level plate at its edge."""
    if z >= ZN:
        return Y
    return ramp_y(z) + (Y - ramp_y(ZN)) * max(0.0, min(1.0, (z - (ZN - 10.0)) / 10.0))


def glowc(hex_color, k=1.0):
    r, g, b = rgb(hex_color)
    return (r * k, g * k, b * k, 1.0)


# The soffit's lights (Fn9gKhU_2_Q@74).
SOFFIT = {"green": glowc("39ff9a", 0.5), "amber": glowc("ff9a2a", 0.6)}
MARKER = glowc("ffd8a0", 0.9)
KERB_GLOW = glowc("ffa020", 0.55)
AVENUE_CLEAR = 15.0   # no new light on the ground this near the avenue's line: the hero's road stays as it was


def pool(x, y, z, hue, power, spread=0.0):
    """A lamp's light on what is under and round it: a point, and with
    `spread` four more round it, so a tall lamp lights a road's width."""
    if abs(x) < AVENUE_CLEAR:
        return
    light(DK, x, y, z, hue, power)
    if spread:
        for dx, dz in ((spread, 0), (-spread, 0), (0, spread), (0, -spread)):
            if abs(x + dx) >= AVENUE_CLEAR:
                light(DK, x + dx, y, z + dz, hue, power * 0.6)


# ---------------------------------------------------------------------------
# Geometry: flat faces turned to face where they should, beams swept along a
# run through stations, their tops and bottoms following the road.
# ---------------------------------------------------------------------------
def _normal(pts):
    nx = ny = nz = 0.0
    for i, a in enumerate(pts):
        b = pts[(i + 1) % len(pts)]
        nx += (a[1] - b[1]) * (a[2] + b[2])
        ny += (a[2] - b[2]) * (a[0] + b[0])
        nz += (a[0] - b[0]) * (a[1] + b[1])
    return nx, ny, nz


def face(key, pts, out, scale=2.0, col=(1, 1, 1, 1)):
    """A flat polygon of world points, wound to face `out`, its UVs projected
    from the world along its main axis."""
    n = _normal(pts)
    if n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0:
        pts = list(reversed(pts))
    s = 1.0 / scale
    ax, ay, az = abs(out[0]), abs(out[1]), abs(out[2])
    if ay >= ax and ay >= az:
        uvs = [(p[0] * s, -p[2] * s) for p in pts]
    elif ax >= az:
        uvs = [(p[2] * s, p[1] * s) for p in pts]
    else:
        uvs = [(p[0] * s, p[1] * s) for p in pts]
    poly(key, pts, uvs, col)


def _w(axis, v, u, y):
    return (v, y, u) if axis == "x" else (u, y, v)


def vface(key, plane_axis, plane, a, b, y0, y1, out, scale=1.0, col=(1, 1, 1, 1)):
    """An upright rectangle in the plane x = `plane` ("x") or z = `plane`
    ("z"), from a to b along the other axis, facing `out` (+1 or -1)."""
    if plane_axis == "x":
        face(key, [(plane, y0, a), (plane, y0, b), (plane, y1, b), (plane, y1, a)], (out, 0, 0), scale, col)
    else:
        face(key, [(a, y0, plane), (b, y0, plane), (b, y1, plane), (a, y1, plane)], (0, 0, out), scale, col)


def sweep(key, axis, vs, u0, u1, bot, top, sides="tbAB", caps="", scale=2.0, col=(1, 1, 1, 1)):
    """A beam along `axis` ("x" or "z") through the stations vs (increasing),
    across it from u0 to u1 (z for an x run, x for a z run), its bottom and
    top at each station bot(v) and top(v) (numbers or callables). sides: t
    top, b bottom, A the u0 face, B the u1 face; caps: 0 and 1 the ends."""
    fb = bot if callable(bot) else (lambda v, c=bot: c)
    ft = top if callable(top) else (lambda v, c=top: c)
    ua, ub = ((0, 0, -1), (0, 0, 1)) if axis == "x" else ((-1, 0, 0), (1, 0, 0))
    va, vb = ((-1, 0, 0), (1, 0, 0)) if axis == "x" else ((0, 0, -1), (0, 0, 1))
    for v0, v1 in zip(vs, vs[1:]):
        b0, b1, t0, t1 = fb(v0), fb(v1), ft(v0), ft(v1)
        if "t" in sides:
            face(key, [_w(axis, v0, u0, t0), _w(axis, v1, u0, t1), _w(axis, v1, u1, t1), _w(axis, v0, u1, t0)], (0, 1, 0), scale, col)
        if "b" in sides:
            face(key, [_w(axis, v0, u0, b0), _w(axis, v1, u0, b1), _w(axis, v1, u1, b1), _w(axis, v0, u1, b0)], (0, -1, 0), scale, col)
        if t0 - b0 < 1e-4 and t1 - b1 < 1e-4:
            continue
        if "A" in sides:
            face(key, [_w(axis, v0, u0, b0), _w(axis, v1, u0, b1), _w(axis, v1, u0, t1), _w(axis, v0, u0, t0)], ua, scale, col)
        if "B" in sides:
            face(key, [_w(axis, v0, u1, b0), _w(axis, v1, u1, b1), _w(axis, v1, u1, t1), _w(axis, v0, u1, t0)], ub, scale, col)
    for c, v, out in (("0", vs[0], va), ("1", vs[-1], vb)):
        if c in caps:
            b, t = fb(v), ft(v)
            face(key, [_w(axis, v, u0, b), _w(axis, v, u1, b), _w(axis, v, u1, t), _w(axis, v, u0, t)], out, scale, col)


def _stations(a, b, breaks, step, slope_from, slope_to):
    """Stations from a to b: every break inside, and every `step` metres
    where the road slopes (between slope_from and slope_to)."""
    vs = {a, b}
    vs.update(v for v in breaks if a < v < b)
    v = slope_from
    while v < slope_to:
        if a < v < b:
            vs.add(round(v, 4))
        v += step
    return sorted(vs)


SLOPE = 2.5            # metres between stations where the road climbs
ABUT_X = 64.0          # the girder ends on the east abutment here
MOUTH_X = 108.0        # the x 120 road's west lot line: the deck's mouth
CROSS_Y = 0.17         # the table across the x 120 road's pavement
KERB_X = 112.0         # the x 120 road's kerb face
EMB_Z = -150.0         # the ramp is an embankment north of here, a girder south
X_BREAKS = (-HERO, HERO, plan.DECK_TOP_X1, ABUT_X, MOUTH_X, MOUTH_X + 0.6)
Z_BREAKS = (EMB_Z, ZN)


CONC = (0.36, 0.36, 0.37, 1.0)        # the girder's, the walls' and the soffit's concrete
PARAPET_C = (0.43, 0.42, 0.41, 1.0)   # the parapets', paler: newer pours


def _cast(mat, col):
    """The deck's concrete is board-marked, poured concrete (castconcrete,
    its colour on its vertices); the hero's span keeps the old overpass's."""
    return ("castconcrete", CONC if col == (1, 1, 1, 1) else col) if mat == "concrete" else (mat, col)


def xs(mat, detail, xa, xb, u0, u1, bot, top, sides="tbAB", caps="", scale=2.0, col=(1, 1, 1, 1), hero=False):
    """sweep() along the deck (x). `hero`: keyed "avenue" over the hero's
    span, "deck" elsewhere."""
    vs = _stations(xa, xb, X_BREAKS, SLOPE, plan.DECK_TOP_X1, plan.DECK_LAND_X)
    dmat, dcol = _cast(mat, col)
    if not hero:
        sweep((DK, dmat, detail), "x", vs, u0, u1, bot, top, sides, caps, scale, dcol)
        return
    groups = []
    for v0, v1 in zip(vs, vs[1:]):
        d = AV if -HERO - 1e-6 <= v0 and v1 <= HERO + 1e-6 else DK
        if groups and groups[-1][0] == d:
            groups[-1][1].append(v1)
        else:
            groups.append((d, [v0, v1]))
    for i, (d, g) in enumerate(groups):
        cp = ("0" if "0" in caps and i == 0 else "") + ("1" if "1" in caps and i == len(groups) - 1 else "")
        sweep((d, mat if d == AV else dmat, detail), "x", g, u0, u1, bot, top, sides, cp, scale, col if d == AV else dcol)


def zs(mat, detail, za, zb, u0, u1, bot, top, sides="tbAB", caps="", scale=2.0, col=(1, 1, 1, 1)):
    """sweep() along the ramp (z)."""
    vs = _stations(za, zb, Z_BREAKS, SLOPE, FOOT, ZN)
    mat, col = _cast(mat, col)
    sweep((DK, mat, detail), "z", vs, u0, u1, bot, top, sides, caps, scale, col)


def up(f, d):
    return lambda v: f(v) + d


def road_top(x):
    """The deck's road surface: the graph's height to the lot line, then up
    onto a table at the pavement's level across the x 120 road's pavement."""
    if x <= MOUTH_X:
        return DY(x)
    if x < MOUTH_X + 0.6:
        return DY(MOUTH_X) + (CROSS_Y - DY(MOUTH_X)) * (x - MOUTH_X) / 0.6
    return CROSS_Y


def under(f):
    """A girder's foot under a road line, never below the ground."""
    return lambda v: max(0.0, f(v) - DEPTH)


# The section's lines: across the deck (z) and across the ramp (x).
z_par = ZN + PAR                      # -84.6, the parapet's road face
z_lane_s = plan.DECK_Z + LANE_IN      # -76.5
z_bar = z_lane_s + BAR                # -76.32, the walkway's kerb
z_rail = ZS - RAIL                    # -75.08
x_par = XE - PAR                      # -75.4
x_lane_w = plan.DECK_X0 - LANE_IN     # -83.5
x_bar = x_lane_w - BAR                # -83.68
x_rail = XW + RAIL                    # -84.92
NOSE = FOOT + 3.5                     # the ramp's own asphalt starts here, 1.6 cm up
WALL_Z = -186.0                       # the ramp's road is a girder's depth over the street from here

# ---------------------------------------------------------------------------
# STRUCTURE. A box girder the deck's whole width, its faces a fascia that
# runs on along the ramp's embankment over a retaining wall set back under
# it; the east embankment between its walls; the undersides.
# ---------------------------------------------------------------------------
# The deck: its south face from the turn's corner, its north face from the
# turn's inside, its underside.
xs("concrete", 0, XW, ABUT_X, ZS - 0.3, ZS, under(DY), DY, sides="B", scale=3.0, hero=True)
xs("concrete", 0, XE, ABUT_X, ZN, ZN + 0.3, under(DY), DY, sides="A", scale=3.0)
xs("concrete", 0, XW, ABUT_X, ZN, ZS, under(DY), DY, sides="b", scale=3.0, hero=True)
# The east abutment under the girder's end, and the embankment beyond it
# between retaining walls, down to grade at the mouth.
face((DK, "castconcrete", 0), [(ABUT_X, 0.0, ZN), (ABUT_X, 0.0, ZS), (ABUT_X, DY(ABUT_X) - DEPTH, ZS), (ABUT_X, DY(ABUT_X) - DEPTH, ZN)], (-1, 0, 0), 3.0, CONC)
xs("concrete", 0, ABUT_X, MOUTH_X, ZN, ZS, 0.0, DY, sides="AB", scale=3.0)

# The ramp: the fascia along both edges from its foot (west, on round the
# turn to the deck's south face), the retaining walls under it where the
# road is high enough, the abutment where the embankment ends, the girder's
# underside from there to the turn.
zs("concrete", 0, FOOT, EMB_Z, XW, XW + 0.15, under(RY), RY, sides="Ab", scale=3.0)
zs("concrete", 0, EMB_Z, ZS, XW, XW + 0.15, under(RY), RY, sides="A", scale=3.0)
zs("concrete", 0, FOOT, EMB_Z, XE - 0.15, XE, under(RY), RY, sides="Bb", scale=3.0)
zs("concrete", 0, EMB_Z, ZN, XE - 0.15, XE, under(RY), RY, sides="B", scale=3.0)
zs("concrete", 0, WALL_Z, EMB_Z, XW + 0.15, XE - 0.15, 0.0, under(RY), sides="AB", scale=3.0)
face((DK, "castconcrete", 0), [(XW + 0.15, 0.0, EMB_Z), (XE - 0.15, 0.0, EMB_Z), (XE - 0.15, RY(EMB_Z) - DEPTH, EMB_Z), (XW + 0.15, RY(EMB_Z) - DEPTH, EMB_Z)], (0, 0, 1), 3.0, CONC)
zs("concrete", 0, EMB_Z, ZN, XW, XE, under(RY), RY, sides="b", scale=3.0)
# Pilasters down the retaining walls, flush with the fascia over them
# (JtqIas3bYhg@64's ribbed wall).
z = WALL_Z + 6.0
while z < EMB_Z + 0.1:
    top = RY(z - 0.3) - DEPTH
    if top > 0.5:
        box((DK, "castconcrete", 0), XW, XW + 0.15, 0.0, top, z - 0.3, z + 0.3, scale=1.5, col=PARAPET_C)
        box((DK, "castconcrete", 0), XE - 0.15, XE, 0.0, top, z - 0.3, z + 0.3, scale=1.5, col=PARAPET_C)
    z += 5.0

# ---------------------------------------------------------------------------
# THE ROAD. Asphalt from the parapet to the barrier, exactly the graph's
# heights; the turn is a level plate.
# ---------------------------------------------------------------------------
zs("asphalt", 0, NOSE, z_par, x_lane_w, x_par, 0.0, RY, sides="t", scale=6.0)
xs("asphalt", 0, x_lane_w, KERB_X, z_par, z_lane_s, 0.0, road_top, sides="t", scale=6.0)
# The table's shoulder past the parapet's end, and its lip down to the
# x 120 road, painted yellow and black.
xs("asphalt", 0, MOUTH_X, KERB_X, ZN, z_par, 0.0, CROSS_Y, sides="t", scale=6.0)
face((DK, "asphalt", 0), [(KERB_X, CROSS_Y, ZN), (KERB_X, CROSS_Y, ZS), (KERB_X + 0.9, PAINT, ZS), (KERB_X + 0.9, PAINT, ZN)], (0.2, 1, 0), 6.0)
for i in range(12):
    za = ZN + 0.2 + i * 0.8
    if i % 2 == 0:
        face((DK, "paint", 0), [(KERB_X + 0.05, CROSS_Y - 0.004, za), (KERB_X + 0.05, CROSS_Y - 0.004, za + 0.8), (KERB_X + 0.85, 0.02, za + 0.8), (KERB_X + 0.85, 0.02, za)], (0.2, 1, 0), 1.0, YELLOW)


def arc_line(cx, cz, r, w, y, col, n=8):
    """A painted line w wide round a quarter turn centred (cx, cz), from due
    west of the centre to due south of it."""
    for i in range(n):
        a0, a1 = i * math.pi / 2 / n, (i + 1) * math.pi / 2 / n
        pts = [(cx - (r + s * w / 2) * math.cos(a), y, cz + (r + s * w / 2) * math.sin(a)) for a, s in ((a0, -1), (a1, -1), (a1, 1), (a0, 1))]
        face((DK, "paint", 0), pts, (0, 1, 0), 1.0, col)


# Lane paint: a double yellow centre line and white edge lines, up the ramp,
# round the turn on arcs between the cars' two paths, and along the deck.
TURN = (plan.DECK_X0 + 4.0, plan.DECK_Z - 4.0)   # the arcs' centre
for off, w, col in ((-0.13, 0.1, YELLOW), (0.13, 0.1, YELLOW), (LANE_IN - 0.15, 0.12, WHITE), (-LANE_IN + 0.15, 0.12, WHITE)):
    # `off` toward the turn's outside (west on the ramp, south on the deck).
    xr = plan.DECK_X0 - off
    zs("paint", 0, NOSE, TURN[1], xr - w / 2, xr + w / 2, 0.0, up(RY, PAINT), sides="t", scale=1.0, col=col)
    zd = plan.DECK_Z + off
    xs("paint", 0, TURN[0], MOUTH_X - 1.0, zd - w / 2, zd + w / 2, 0.0, up(road_top, PAINT), sides="t", scale=1.0, col=col)
    arc_line(TURN[0], TURN[1], 4.0 + off, w, Y + PAINT, col, n=3 if 4.0 + off < 1.0 else 8)
# A give-way line where the deck meets the x 120 road.
xs("paint", 0, MOUTH_X - 0.9, MOUTH_X - 0.5, plan.DECK_Z + 0.3, z_lane_s - 0.3, 0.0, up(road_top, PAINT), sides="t", scale=1.0, col=WHITE)

# ---------------------------------------------------------------------------
# ITS EDGES. The parapet on the inside of the turn (the deck's north, the
# ramp's east): concrete, a dark cap, a lit kerb strip at its foot
# (BnnbP7pCIvQ@246). The barrier between the road and the walkway: a
# concrete upstand and a steel rail on posts. The walkway. The rail along
# the outer edge: a steel panel, what the hero has always seen over the
# overpass's face.
# ---------------------------------------------------------------------------
xs("concrete", 0, x_par, MOUTH_X, ZN, z_par, DY, up(DY, PAR_H), sides="tAB", caps="01", scale=2.0, col=PARAPET_C)
xs("trim", 0, x_par - 0.03, MOUTH_X + 0.03, ZN - 0.03, z_par + 0.03, up(DY, PAR_H), up(DY, PAR_H + 0.07), sides="tAB", caps="01", scale=1.0, col=DARK_TRIM)
xs("glow", 0, x_par, MOUTH_X - 1.0, z_par, z_par + 0.07, up(road_top, 0.02), up(road_top, 0.09), sides="tB", scale=1.0, col=KERB_GLOW)
zs("concrete", 0, FOOT, ZN, x_par, XE, RY, up(RY, PAR_H), sides="tAB", caps="0", scale=2.0, col=PARAPET_C)
zs("trim", 0, FOOT - 0.03, ZN, x_par - 0.03, XE + 0.03, up(RY, PAR_H), up(RY, PAR_H + 0.07), sides="tAB", caps="0", scale=1.0, col=DARK_TRIM)
zs("glow", 0, NOSE, ZN + 0.33, x_par - 0.07, x_par, up(RY, 0.02), up(RY, 0.09), sides="tA", scale=1.0, col=KERB_GLOW)

# The barrier.
xs("concrete", 0, x_lane_w, MOUTH_X, z_lane_s, z_bar, road_top, up(DY, 0.45), sides="tAB", caps="1", scale=2.0)
xs("metal", 1, x_lane_w, MOUTH_X, z_lane_s + 0.03, z_bar - 0.03, up(DY, 0.72), up(DY, 0.8), sides="tbAB", caps="1", scale=1.0)
xs("glow", 0, x_lane_w, MOUTH_X - 1.0, z_lane_s - 0.07, z_lane_s, up(road_top, 0.02), up(road_top, 0.09), sides="tA", scale=1.0, col=KERB_GLOW)
zs("concrete", 0, FOOT, z_bar, x_bar, x_lane_w, RY, up(RY, 0.45), sides="tAB", caps="0", scale=2.0)
zs("metal", 1, FOOT, z_bar, x_bar + 0.03, x_lane_w - 0.03, up(RY, 0.72), up(RY, 0.8), sides="tbAB", caps="0", scale=1.0)
zs("glow", 0, NOSE, z_lane_s, x_lane_w, x_lane_w + 0.07, up(RY, 0.02), up(RY, 0.09), sides="tB", scale=1.0, col=KERB_GLOW)
x = x_lane_w + 3.0
while x < MOUTH_X - 0.5:
    box((DK, "metal", 1), x - 0.04, x + 0.04, DY(x) + 0.44, DY(x) + 0.73, z_lane_s + 0.05, z_bar - 0.05, scale=0.5)
    x += 3.0
z = FOOT + 1.5
while z < z_bar - 0.5:
    box((DK, "metal", 1), x_bar + 0.05, x_lane_w - 0.05, RY(z) + 0.44, RY(z) + 0.73, z - 0.04, z + 0.04, scale=0.5)
    z += 3.0

# The walkway, a step up from the road, from the ramp's foot round the
# turn's outside to the x 120 road's pavement.
zs("sidewalk", 0, FOOT, z_rail, x_rail, x_bar, RY, lambda z: max(RY(z) + WALK_UP, 0.162), sides="t", caps="0", scale=2.0)
xs("sidewalk", 0, x_bar, KERB_X, z_bar, z_rail, DY, lambda x: max(DY(x) + WALK_UP, CROSS_Y + 0.004), sides="t", scale=2.0)
xs("sidewalk", 0, MOUTH_X, KERB_X, z_rail, ZS, 0.0, CROSS_Y + 0.004, sides="t", scale=2.0)

# The rail: on the hero's span it is the old overpass's.
xs("metal", 0, x_rail, MOUTH_X, z_rail, ZS, DY, up(DY, RAIL_H), sides="tAB", caps="1", scale=0.8, hero=True)
zs("metal", 0, FOOT, ZS, XW, x_rail, RY, up(RY, RAIL_H), sides="tAB", caps="01", scale=0.8)

# ---------------------------------------------------------------------------
# WHAT THE HERO SEES of it (with the span's face, underside and rail above):
# the teal strip under the face's edge, the white lights under the deck, the
# sora sign on its frame, as they have always been.
# ---------------------------------------------------------------------------
box((AV, "neon_teal", 0), -12, 12, 7.1, 7.18, ZS - 0.2, ZS - 0.1, scale=1.0)
for lx in range(-40, 41, 8):
    box((AV, "neon_white", 1), lx - 0.8, lx + 0.8, 7.1, 7.16, plan.DECK_Z - 0.3, plan.DECK_Z + 0.3, scale=1.0)
sign("sora", -6.0, 9.2, ZS + 0.27, 6.4, 1.3, 0.0, preview="空き未来へ")
box((AV, "board_frame", 0), -9.4, -2.6, 8.4, 10.0, ZS + 0.02, ZS + 0.22, scale=1.0)

# ---------------------------------------------------------------------------
# THE LIT BAND along the fascia (Fn9gKhU_2_Q@81): panels in yellow, orange
# and red, a dark one now and then, and the yellow stripe along the girder's
# foot (Fn9gKhU_2_Q@74). Not on the face the hero sees.
# ---------------------------------------------------------------------------
band_rng = random.Random(8500)
chip_rng = random.Random(8620)
# The band's tiles (XMaaEjT0LhU@86): yellows and oranges, a red now and then.
TILE_HUES = ("ffd21a", "ffd21a", "ffc21a", "ffb030", "ff9a22", "ff8a1c", "ff8a1c", "ff7410", "ff5a10", "ff3a1a")
BACKING = (0.03, 0.03, 0.034, 1.0)


def band(axis, a, b, plane, out, yf, lo=0.5, hi=1.0, rows=2):
    """The lit band along a fascia from a to b, standing off `plane` toward
    `out`, between lo and hi under yf's line: blocks 2.6 m long on a dark
    backing, each a grid of small tiles that leans to one hue, every tile
    its own shade and brightness, a few dead; a whole block out now and
    then."""
    n = max(1, round((b - a) / 2.6))
    step = (b - a) / n
    d = out[2] if axis == "x" else out[0]
    for i in range(n):
        p0, p1 = a + i * step + 0.07, a + (i + 1) * step - 0.07
        if yf(p0) - hi < 0.02:
            continue
        face((DK, "trim", 0), [_w(axis, p0, plane + 0.02 * d, yf(p0) - hi), _w(axis, p1, plane + 0.02 * d, yf(p1) - hi),
                               _w(axis, p1, plane + 0.02 * d, yf(p1) - lo), _w(axis, p0, plane + 0.02 * d, yf(p0) - lo)], out, 1.0, BACKING)
        lean = band_rng.choice(TILE_HUES)
        if band_rng.random() < 0.04:
            continue
        cols = max(3, round((p1 - p0) / 0.5))
        tw = (p1 - p0 - 0.03) / cols
        th = (hi - lo - 0.03) / rows
        for c in range(cols):
            q0 = p0 + 0.03 + c * tw
            q1 = q0 + tw - 0.03
            for r in range(rows):
                if band_rng.random() < 0.07:
                    continue
                col = glowc(lean if band_rng.random() < 0.5 else band_rng.choice(TILE_HUES), band_rng.uniform(0.42, 0.85))
                y0 = hi - 0.03 - r * th
                y1 = y0 - th + 0.03
                face((DK, "glow", 0), [_w(axis, q0, plane + 0.03 * d, yf(q0) - y0), _w(axis, q1, plane + 0.03 * d, yf(q1) - y0),
                                       _w(axis, q1, plane + 0.03 * d, yf(q1) - y1), _w(axis, q0, plane + 0.03 * d, yf(q0) - y1)], out, 1.0, col)


def chipped(axis, a, b, plane, out, yf, lo, hi, detail=0):
    """Yellow paint along a face from a to b, between lo and hi over yf's
    line, as years leave it: in lengths with gaps between them, a length
    gone now and then, bites out of its top or its foot."""
    o = plane + 0.02 * (out[2] if axis == "x" else out[0])
    v = a
    while v < b - 0.2:
        v1 = min(b, v + chip_rng.uniform(0.7, 2.6))
        r = chip_rng.random()
        if r > 0.1 and yf(v) + lo >= 0.0 and yf(v1) + lo >= 0.0:
            y0, y1 = lo, hi
            if r > 0.8:
                y0 = lo + (hi - lo) * chip_rng.uniform(0.25, 0.55)
            elif r > 0.62:
                y1 = hi - (hi - lo) * chip_rng.uniform(0.25, 0.55)
            face((DK, "hazard", detail), [_w(axis, v, o, yf(v) + y0), _w(axis, v1, o, yf(v1) + y0), _w(axis, v1, o, yf(v1) + y1), _w(axis, v, o, yf(v) + y1)], out, 1.0)
        v = v1 + chip_rng.uniform(0.02, 0.25)


def stripe(axis, a, b, plane, out, yf):
    """The yellow stripe along a girder's foot (Fn9gKhU_2_Q@74), chipped."""
    chipped(axis, a, b, plane, out, lambda v: yf(v) - DEPTH, 0.0, 0.16)


for a, b in ((XW, -HERO), (HERO, ABUT_X)):
    band("x", a, b, ZS, (0, 0, 1), DY)
    stripe("x", a, b, ZS, (0, 0, 1), DY)
# The north face: the hero never sees it, so over the avenue the band is
# three tiles deep.
band("x", XE, -HERO, ZN, (0, 0, -1), DY)
band("x", -HERO, HERO, ZN, (0, 0, -1), DY, lo=0.28, hi=1.06, rows=3)
band("x", HERO, ABUT_X, ZN, (0, 0, -1), DY)
stripe("x", XE, ABUT_X, ZN, (0, 0, -1), DY)
band("z", FOOT + 14.0, ZS, XW, (-1, 0, 0), RY)
stripe("z", WALL_Z, ZS, XW, (-1, 0, 0), RY)
band("z", FOOT + 14.0, ZN, XE, (1, 0, 0), RY)
stripe("z", WALL_Z, ZN, XE, (1, 0, 0), RY)
# The same paint along the road's own edges: under the parapet's cap and on
# the barrier's upstand, facing the lanes.
chipped("x", XE + 0.6, MOUTH_X - 1.0, z_par, (0, 0, 1), DY, 0.7, 0.86)
chipped("z", FOOT + 2.0, ZN - 0.6, x_par, (-1, 0, 0), RY, 0.7, 0.86)
chipped("x", x_lane_w + 1.0, MOUTH_X - 1.0, z_lane_s, (0, 0, -1), DY, 0.2, 0.36, detail=1)
chipped("z", FOOT + 2.0, z_lane_s - 1.0, x_lane_w, (1, 0, 0), RY, 0.2, 0.36, detail=1)

# Marker lights along the parapet's cap and the rail's top
# (BnnbP7pCIvQ@33): small, warm, every six metres.
x = XE + 2.0
while x < MOUTH_X - 2.0:
    if not -HERO < x < HERO:
        box((DK, "glow", 1), x - 0.09, x + 0.09, DY(x) + PAR_H + 0.07, DY(x) + PAR_H + 0.16, ZN + 0.12, ZN + 0.28, scale=0.5, col=MARKER)
        box((DK, "glow", 1), x - 0.09, x + 0.09, DY(x) + RAIL_H, DY(x) + RAIL_H + 0.08, ZS - 0.08, ZS, scale=0.5, col=MARKER)
    x += 6.0
z = FOOT + 2.0
while z < ZN - 1.0:
    box((DK, "glow", 1), XE - 0.28, XE - 0.12, RY(z) + PAR_H + 0.07, RY(z) + PAR_H + 0.16, z - 0.09, z + 0.09, scale=0.5, col=MARKER)
    box((DK, "glow", 1), XW, XW + 0.08, RY(z) + RAIL_H, RY(z) + RAIL_H + 0.08, z - 0.09, z + 0.09, scale=0.5, col=MARKER)
    z += 6.0

# ---------------------------------------------------------------------------
# COLUMNS. Bents of two columns under a cap beam, on thick footings banded
# yellow and black, in the gaps between the lots: none in a street, a lane or
# on a pavement. The turn's plate stands on one pier in the street's middle.
# ---------------------------------------------------------------------------
PIER_C = (0.40, 0.39, 0.38, 1.0)      # the piers' and cap beams' concrete (castconcrete takes its colour here)
CAP_C = (0.36, 0.36, 0.37, 1.0)
PIPE_C = (0.09, 0.11, 0.12, 1.0)      # drains and conduit: dark painted steel
GAS_C = (0.42, 0.15, 0.04, 1.0)       # a main painted orange


def column(cx, cz, top, r=0.55, foot=0.95):
    box((DK, "castconcrete", 0), cx - foot, cx + foot, 0.0, 0.6, cz - foot, cz + foot, scale=1.5, col=PIER_C)
    cylinder((DK, "castconcrete", 0), cx, cz, 0.6, top, r, segs=8, cap=False, col=PIER_C)
    cylinder((DK, "hazard", 0), cx, cz, 0.6, 1.5, r + 0.02, segs=8, cap=False)
    for y in (0.82, 1.18):
        cylinder((DK, "dark", 1), cx, cz, y, y + 0.16, r + 0.03, segs=8, cap=False)
    # The deck's drain down it, on the side away from the avenue, to a shoe
    # on the footing.
    px = cx + (r + 0.07) * (1 if cx > 0 else -1) * (1 if abs(cx) < 70 else -1 if cx > plan.DECK_X0 else 1)
    pipe((DK, "steel", 1), (px, 0.72, cz), (px, top + 0.9, cz), 0.055, segs=5, col=PIPE_C)
    pipe((DK, "steel", 1), (px, 0.78, cz), (px + (px - cx) * 0.6, 0.62, cz), 0.055, segs=5, col=PIPE_C)
    for y in (1.9, top - 0.4):
        box((DK, "steel", 1), min(px, cx), max(px, cx), y, y + 0.05, cz - 0.075, cz + 0.075, scale=0.5, col=PIPE_C)
    B.COLLISION.append(("box", cx - foot, cx + foot, 0.0, top, cz - foot, cz + foot, DK))
    keep_clear(cx, cz, foot + 0.4)


def keep_clear(cx, cz, h):
    """A yellow box painted on the paving round a footing."""
    yy = B.G0 + PAINT
    for x0, x1, z0, z1 in ((cx - h, cx + h, cz - h, cz - h + 0.1), (cx - h, cx + h, cz + h - 0.1, cz + h),
                           (cx - h, cx - h + 0.1, cz - h, cz + h), (cx + h - 0.1, cx + h, cz - h, cz + h)):
        face((DK, "paint", 1), [(x0, yy, z0), (x1, yy, z0), (x1, yy, z1), (x0, yy, z1)], (0, 1, 0), 1.0, YELLOW)


def bent_x(x):
    """A bent under the deck at x: columns either side of its middle, the
    cap beam across, up into the girder where the road slopes."""
    lo, hi = sorted((DY(x - 0.75) - DEPTH, DY(x + 0.75) - DEPTH))
    for cz in (ZN + 2.0, ZS - 2.0):
        column(x, cz, lo - 0.9)
    box((DK, "castconcrete", 0), x - 0.75, x + 0.75, lo - 0.9, hi, ZN + 0.5, ZS - 0.5, scale=2.0, bottom=True, col=CAP_C)
    if abs(x) > HERO + 1.0:      # a yellow stripe along the cap beam's foot, both faces (not the hero's bents)
        for o in (-1, 1):
            vface((DK, "hazard", 1), "x", x + o * 0.762, ZN + 0.5, ZS - 0.5, lo - 0.9, lo - 0.74, o)


def bent_z(z):
    lo, hi = sorted((RY(z - 0.75) - DEPTH, RY(z + 0.75) - DEPTH))
    for cx in (XW + 2.0, XE - 2.0):
        column(cx, z, lo - 0.9)
    box((DK, "castconcrete", 0), XW + 0.5, XE - 0.5, lo - 0.9, hi, z - 0.75, z + 0.75, scale=2.0, bottom=True, col=CAP_C)
    for o in (-1, 1):
        vface((DK, "hazard", 1), "z", z + o * 0.762, XW + 0.5, XE - 0.5, lo - 0.9, lo - 0.74, o)


BENTS_X = (-60.0, -38.0, -HERO, HERO, 38.0, 56.0)
BENTS_Z = (-134.0, -117.0, -100.0)
for x in BENTS_X:
    bent_x(x)
for z in BENTS_Z:
    bent_z(z)
# The turn's pier: an eight-sided column, cap beams both ways.
PIER = (plan.DECK_X0, plan.DECK_Z)
box((DK, "castconcrete", 0), PIER[0] - 2.0, PIER[0] + 2.0, 0.0, 0.75, PIER[1] - 2.0, PIER[1] + 2.0, scale=1.5, col=PIER_C)
cylinder((DK, "castconcrete", 0), PIER[0], PIER[1], 0.75, plan.DECK_UNDER - 1.1, 1.25, segs=8, cap=False, col=PIER_C)
cylinder((DK, "hazard", 0), PIER[0], PIER[1], 0.75, 2.1, 1.27, segs=8, cap=False)
for y in (1.05, 1.6):
    cylinder((DK, "dark", 1), PIER[0], PIER[1], y, y + 0.25, 1.28, segs=8, cap=False)
box((DK, "castconcrete", 0), XW + 0.5, XE - 0.5, plan.DECK_UNDER - 1.1, plan.DECK_UNDER, PIER[1] - 1.0, PIER[1] + 1.0, scale=2.0, bottom=True, col=CAP_C)
box((DK, "castconcrete", 0), PIER[0] - 1.0, PIER[0] + 1.0, plan.DECK_UNDER - 1.1, plan.DECK_UNDER, ZN + 0.5, ZS - 0.5, scale=2.0, bottom=True, col=CAP_C)
# The plate's cap beams were a dark block from the street: a yellow stripe
# along each one's foot, a light panel in each quarter of the plate's
# underside, and their light on the beams' sides.
_cy = plan.DECK_UNDER - 1.1
for o in (-1, 1):
    for a, b in ((XW + 0.5, PIER[0] - 1.0), (PIER[0] + 1.0, XE - 0.5)):
        vface((DK, "hazard", 0), "z", PIER[1] + o * 1.012, a, b, _cy, _cy + 0.18, o)
    for a, b in ((ZN + 0.5, PIER[1] - 1.0), (PIER[1] + 1.0, ZS - 0.5)):
        vface((DK, "hazard", 0), "x", PIER[0] + o * 1.012, a, b, _cy, _cy + 0.18, o)
B.COLLISION.append(("box", PIER[0] - 2.0, PIER[0] + 2.0, 0.0, plan.DECK_UNDER, PIER[1] - 2.0, PIER[1] + 2.0, DK))
keep_clear(PIER[0], PIER[1], 2.5)
# What a car or a walker must not pass through of the embankments.
for za, zb in ((FOOT, -200.0), (-200.0, -180.0), (-180.0, -165.0), (-165.0, EMB_Z)):
    B.COLLISION.append(("box", XW, XE, 0.0, RY(zb) + PAR_H, za, zb, DK))
for xa, xb in ((ABUT_X, 78.0), (78.0, 92.0), (92.0, MOUTH_X)):
    B.COLLISION.append(("box", xa, xb, 0.0, DY(xa) + PAR_H, ZN, ZS, DK))

# ---------------------------------------------------------------------------
# THE UNDERSIDE. Ribs across the soffit every four metres and light panels
# between them, green and orange (Fn9gKhU_2_Q@74), each with its pool on the
# ground; nothing new over the avenue, which keeps its teal and white.
# ---------------------------------------------------------------------------
def rib_x(x, y):
    for pts, out in (([(x - 0.2, y - 0.22, ZN + 0.3), (x + 0.2, y - 0.22, ZN + 0.3), (x + 0.2, y - 0.22, ZS - 0.3), (x - 0.2, y - 0.22, ZS - 0.3)], (0, -1, 0)),
                     ([(x - 0.2, y - 0.22, ZN + 0.3), (x - 0.2, y - 0.22, ZS - 0.3), (x - 0.2, y + 0.1, ZS - 0.3), (x - 0.2, y + 0.1, ZN + 0.3)], (-1, 0, 0)),
                     ([(x + 0.2, y - 0.22, ZN + 0.3), (x + 0.2, y - 0.22, ZS - 0.3), (x + 0.2, y + 0.1, ZS - 0.3), (x + 0.2, y + 0.1, ZN + 0.3)], (1, 0, 0))):
        face((DK, "castconcrete", 1), pts, out, 2.0, CONC)


def rib_z(z, y):
    for pts, out in (([(XW + 0.3, y - 0.22, z - 0.2), (XE - 0.3, y - 0.22, z - 0.2), (XE - 0.3, y - 0.22, z + 0.2), (XW + 0.3, y - 0.22, z + 0.2)], (0, -1, 0)),
                     ([(XW + 0.3, y - 0.22, z - 0.2), (XE - 0.3, y - 0.22, z - 0.2), (XE - 0.3, y + 0.1, z - 0.2), (XW + 0.3, y + 0.1, z - 0.2)], (0, 0, -1)),
                     ([(XW + 0.3, y - 0.22, z + 0.2), (XE - 0.3, y - 0.22, z + 0.2), (XE - 0.3, y + 0.1, z + 0.2), (XW + 0.3, y + 0.1, z + 0.2)], (0, 0, 1))):
        face((DK, "castconcrete", 1), pts, out, 2.0, CONC)


def soffit_x(x, y, cz, hue, power=3.0):
    face((DK, "glow", 0), [(x - 1.1, y - 0.06, cz - 0.36), (x + 1.1, y - 0.06, cz - 0.36), (x + 1.1, y - 0.06, cz + 0.36), (x - 1.1, y - 0.06, cz + 0.36)], (0, -1, 0), 1.0, SOFFIT[hue])
    face((DK, "dark", 1), [(x - 1.2, y - 0.025, cz - 0.46), (x + 1.2, y - 0.025, cz - 0.46), (x + 1.2, y - 0.025, cz + 0.46), (x - 1.2, y - 0.025, cz + 0.46)], (0, -1, 0), 1.0)
    pool(x, y, cz, hue, power if hue == "amber" else 1.9, 1.8 if hue == "amber" else 1.2)


def soffit_z(z, y, cx, hue, power=3.0):
    face((DK, "glow", 0), [(cx - 0.36, y - 0.06, z - 1.1), (cx + 0.36, y - 0.06, z - 1.1), (cx + 0.36, y - 0.06, z + 1.1), (cx - 0.36, y - 0.06, z + 1.1)], (0, -1, 0), 1.0, SOFFIT[hue])
    face((DK, "dark", 1), [(cx - 0.46, y - 0.025, z - 1.2), (cx + 0.46, y - 0.025, z - 1.2), (cx + 0.46, y - 0.025, z + 1.2), (cx - 0.46, y - 0.025, z + 1.2)], (0, -1, 0), 1.0)
    pool(cx, y, z, hue, power if hue == "amber" else 1.9, 1.8 if hue == "amber" else 1.2)


x, i = XW + 3.0, 0
while x < ABUT_X - 1.0:
    if not -HERO - 1.0 < x < HERO + 1.0 and all(abs(x - bx) > 1.4 for bx in BENTS_X):
        rib_x(x, DY(x) - DEPTH)
    xl = x + 2.0
    if not -HERO < xl < HERO and xl < ABUT_X - 1.0 and all(abs(xl - bx) > 1.6 for bx in BENTS_X):
        soffit_x(xl, DY(xl) - DEPTH, ZN + 2.7 if i % 2 == 0 else ZS - 2.7, "green" if i % 4 < 2 else "amber")
    x += 4.0
    i += 1
z, i = EMB_Z + 3.0, 0
while z < ZN - 1.0:
    if all(abs(z - bz) > 1.4 for bz in BENTS_Z):
        rib_z(z, RY(z - 0.2) - DEPTH)
    zl = z + 2.0
    if zl < ZN - 1.0 and all(abs(zl - bz) > 1.6 for bz in BENTS_Z):
        soffit_z(zl, RY(zl - 1.1) - DEPTH, XW + 2.7 if i % 2 == 0 else XE - 2.7, "amber" if i % 4 < 2 else "green")
    z += 4.0
    i += 1


# ---------------------------------------------------------------------------
# LAMPS. The deck's own mast (Zq4zTcIM0yQ@107): a steel post on the parapet,
# an arm raked up and out over the road, and at its end a long head, a bar
# of sodium light lit underneath and along both sides, its light in the wet
# air under it (the site draws that). Evenly along the ramp and the deck
# with the gantries and the arch in step between them, each with its pool on
# the road and a blade sign on a bracket; none over the avenue, where a post
# would stand in the hero's band of sky.
# ---------------------------------------------------------------------------
@P.proto("deck_mast", box=(0.15, 3.6, 0.15), reach=900)
def _deck_mast(k):
    steel, cast = (0.11, 0.12, 0.14, 1), (0.04, 0.043, 0.05, 1)
    t = k("trim")
    box(t, -0.15, 0.15, 0.0, 0.55, -0.15, 0.15, scale=0.5, col=cast)
    P.lathe(t, 0.0, 0.0, ((0.55, 0.11), (3.4, 0.095), (6.5, 0.075)), segs=6, col=steel, cap=False)
    P.tube(t, ((0.0, 6.35, 0.0), (0.0, 6.95, 1.0), (0.0, 7.12, 1.3)), (0.07, 0.06, 0.055), segs=4, col=steel)
    P.tube(t, ((0.0, 5.4, 0.05), (0.0, 6.62, 0.8)), (0.035, 0.035), segs=4, col=steel)
    # The head: a housing 2.3 m long, its underside and both long sides
    # lit, so it is a bar of orange light from the road and from the air.
    box(t, -0.17, 0.17, 7.14, 7.22, 1.0, 3.3, scale=0.5, col=cast)
    quad(k("neon_amber"), (-0.15, 6.97, 1.03), (0.15, 6.97, 1.03), (0.15, 6.97, 3.27), (-0.15, 6.97, 3.27))
    for yaw, cx, cz, w in ((0.0, 0.0, 3.27, 0.3), (math.pi, 0.0, 1.03, 0.3), (math.pi / 2, 0.15, 2.15, 2.24), (-math.pi / 2, -0.15, 2.15, 2.24)):
        rotated_quad(k("neon_amber"), cx, 7.055, cz, w, 0.17, yaw)
    P.lamp_air(k, 6.97, 2.15, 4.8, GLOW["amber"])
    box(t, -0.02, 0.02, 5.16, 5.2, 0.06, 1.05, scale=0.5, col=cast)      # the blade's bracket


def lamp(x, y, z, yaw):
    dx, dz = math.sin(yaw), math.cos(yaw)
    P.place("deck_mast", x, y, z, yaw, district=DK)
    pool(x + dx * 2.6, y + 6.9, z + dz * 2.6, "amber", 6.5, 3.2)
    # A blade on the post, read along the road: one of the street's signs.
    cx, cy, cz = x + dx * 0.6, y + 4.1, z + dz * 0.6
    w, h = ST_SIZES["bs"]
    oriented_box((DK, "board_frame", 0), cx, cy, cz, w + 0.12, h + 0.12, 0.1, yaw + math.pi / 2, scale=1.0)
    for fy in (yaw + math.pi / 2, yaw - math.pi / 2):
        sign(st_name("bs"), cx + math.sin(fy) * 0.06, cy, cz + math.cos(fy) * 0.06, w, h, fy, district=DK, label=False)


# About twelve metres apart with the arch (x -56), the gantries (-33, 30, 103)
# and the sign bridge (80) counted in; on the ramp every sixteen, between the
# boards on its edge.
for x in (-69.0, -44.5, -21.0, 22.0, 42.5, 54.5, 66.5, 91.5):
    lamp(x, DY(x) + PAR_H, ZN + 0.2, 0.0)
for z in (-194.0, -178.0, -162.0, -146.0, -130.0, -114.0, -98.0):
    lamp(XE - 0.2, RY(z) + PAR_H, z, -math.pi / 2)

# ---------------------------------------------------------------------------
# THE RAMP'S FOOT. The parapet, the barrier and the rail start at grade
# behind striped end blocks with a beacon each; a gantry over the two lanes
# with boards facing the street and lane lights under its beam.
# ---------------------------------------------------------------------------
def end_block(x0, x1, z0, z1, h=1.25):
    """A crash block: hazard yellow banded black, an amber beacon on top."""
    box((DK, "hazard", 0), x0, x1, 0.0, h, z0, z1, scale=1.0)
    for y in (0.25, 0.75):
        box((DK, "dark", 1), x0 - 0.01, x1 + 0.01, y, y + 0.25, z0 - 0.01, z1 + 0.01, scale=1.0)
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    box((DK, "glow", 0), cx - 0.1, cx + 0.1, h, h + 0.2, cz - 0.1, cz + 0.1, scale=0.5, col=glowc("ffb254", 1.0))


end_block(x_par - 0.1, XE, FOOT - 0.9, FOOT)
end_block(XW, x_lane_w + 0.1, FOOT - 0.9, FOOT)


def gantry(axis, v, u0, u1, base, facing, seed, sizes=("pm", "pm")):
    """A gantry across the road at station v (x for the deck, z for the
    ramp), its posts at u0 and u1: a truss beam six metres over the road,
    boards on it with a sign on both faces (the first toward `facing`, +1
    or -1 along the run), lane lights under it."""
    r = random.Random(seed)
    y0, y1 = base + 6.0, base + 6.45
    for u, hw in ((u0, 0.08 if axis == "z" else 0.14), (u1, 0.08 if axis == "x" else 0.14)):
        # The post on the walkway's side is slim and against the rail.
        a = _w(axis, v - 0.14, u - hw, base)
        b = _w(axis, v + 0.14, u + hw, y1)
        box((DK, "metal", 0), min(a[0], b[0]), max(a[0], b[0]), base, y1, min(a[2], b[2]), max(a[2], b[2]), scale=1.0)
    a = _w(axis, v - 0.14, u0, y0)
    b = _w(axis, v + 0.14, u1, y1)
    box((DK, "metal", 0), min(a[0], b[0]), max(a[0], b[0]), y0, y1, min(a[2], b[2]), max(a[2], b[2]), scale=1.0, bottom=True)
    span = u1 - u0
    yaw_f = (math.pi / 2 if facing > 0 else -math.pi / 2) if axis == "x" else (0.0 if facing > 0 else math.pi)
    for k, size in enumerate(sizes):
        w, h = ST_SIZES[size]
        u = u0 + span * (k + 0.5) / len(sizes) + r.uniform(-0.3, 0.3)
        cy = y1 + h / 2 + 0.25
        cx, _, cz = _w(axis, v, u, 0.0)
        oriented_box((DK, "board_frame", 0), cx, cy, cz, w + 0.16, h + 0.16, 0.2, yaw_f, scale=1.0)
        fx, _, fz = _w(axis, v + facing * 0.115, u, 0.0)
        sign(st_name(size), fx, cy, fz, w, h, yaw_f, district=DK, label=False)
        fx, _, fz = _w(axis, v - facing * 0.115, u, 0.0)
        sign(st_name(size), fx, cy, fz, w, h, yaw_f + math.pi, district=DK, label=False)
        for du in (-w * 0.3, w * 0.3):
            sx, _, sz = _w(axis, v, u + du, 0.0)
            box((DK, "metal", 1), sx - 0.04, sx + 0.04, y1, y1 + 0.25, sz - 0.04, sz + 0.04, scale=0.5)
    return y0


# Lane lights: a green arrow over the lane that comes toward you, a red
# cross over the other, on the face a driver meets.
def lane_light(axis, v, u, y, facing, go):
    yaw = (math.pi / 2 if facing > 0 else -math.pi / 2) if axis == "x" else (0.0 if facing > 0 else math.pi)
    cx, _, cz = _w(axis, v + facing * 0.16, u, 0.0)
    bx, _, bz = _w(axis, v + facing * 0.08, u, 0.0)
    oriented_box((DK, "dark", 0), bx, y - 0.45, bz, 0.9, 0.9, 0.14, yaw, scale=0.5)
    if go:
        col = glowc("39ff9a", 0.9)
        rotated_quad((DK, "glow", 0), cx, y - 0.38, cz, 0.14, 0.5, yaw, col=col)
        rx, rz = math.cos(yaw), -math.sin(yaw)
        for s in (-1, 1):
            rotated_quad((DK, "glow", 0), cx + rx * s * 0.14, y - 0.62, cz + rz * s * 0.14, 0.2, 0.12, yaw, col=col)
    else:
        col = glowc("ff003c", 0.9)
        rotated_quad((DK, "glow", 0), cx, y - 0.45, cz, 0.6, 0.12, yaw, col=col)
        rotated_quad((DK, "glow", 0), cx, y - 0.45, cz, 0.12, 0.6, yaw, col=col)


# Over the ramp's foot, facing north up the street (a driver coming to it).
gz = FOOT + 9.0
gy = gantry("z", gz, XW + 0.08, XE - 0.2, RY(gz), -1, 8511)
lane_light("z", gz, plan.DECK_X0 - 1.75, gy, -1, True)
lane_light("z", gz, plan.DECK_X0 + 1.75, gy, -1, False)
# Over the deck's mouth, facing the x 120 road.
gx = MOUTH_X - 5.0
gy = gantry("x", gx, ZN + 0.2, ZS - 0.08, DY(gx), 1, 8512, sizes=("pm", "ps"))
lane_light("x", gx, plan.DECK_Z - 1.75, gy, 1, True)
lane_light("x", gx, plan.DECK_Z + 1.75, gy, 1, False)
end_block(MOUTH_X - 0.5, MOUTH_X + 0.4, ZN, z_par + 0.1, h=1.1)
end_block(MOUTH_X - 0.5, MOUTH_X + 0.4, z_lane_s - 0.1, z_bar + 0.1, h=1.1)

# ---------------------------------------------------------------------------
# THE TURN'S BOARD. On the outside of the turn, over the plate's south edge,
# a billboard on two posts with an advert on both faces: the ramp climbs
# toward it, and the west street sees it from the south (more than 60 m from
# the avenue, so its light is the street's).
# ---------------------------------------------------------------------------
board_rng = random.Random(8520)
for px in (XW + 1.6, XE - 1.6):
    box((DK, "metal", 0), px - 0.16, px + 0.16, plan.DECK_UNDER + 0.2, Y + 2.6, ZS + 0.04, ZS + 0.36, scale=1.0)
B.billboard(DK, plan.DECK_X0, Y + 4.7, ZS + 0.42, 9.0, 4.2, 0.0, board_rng, depth=0.4)

# ---------------------------------------------------------------------------
# UNDER IT, AT GRADE. The lots leave the deck's gap open from the west
# street to the x 120 road: paved here, between the lanes behind the
# avenue's rows (theirs) and the pavements (the streets'). Under the ramp's
# girder and the turn, an island in the west street's middle with a gore
# south of it; either side of the east embankment, a narrow passage.
# ---------------------------------------------------------------------------
GAPS = ((-66.0, -50.0), (-44.0, -14.0), (14.0, 44.0), (52.0, ABUT_X))
for xa, xb in GAPS:
    B.ground_rect(DK, xa, xb, ZN - 1.0, ZS + 1.0)
B.ground_rect(DK, ABUT_X, MOUTH_X, ZN - 1.0, ZN)
B.ground_rect(DK, ABUT_X, MOUTH_X, ZS, ZS + 1.0)

# The island: kerbed, paved, the bents standing on it.
IS0, IS1 = XW + 0.4, XE - 0.4
GORE_Z = -65.5
B.ground_rect(DK, IS0, IS1, EMB_Z, ZS)
walls((DK, "kerb", 0), [(IS0, ZS), (IS0, EMB_Z), (IS1, EMB_Z), (IS1, ZS)][:1] + [(IS0, EMB_Z)], 0.0, B.G0, (1, 1, 1, 1))
walls((DK, "kerb", 0), [(IS1, EMB_Z), (IS1, ZS)][:1] + [(IS1, ZS)], 0.0, B.G0, (1, 1, 1, 1))
# The gore: the island runs out to a point where the street's middle lanes
# start again, its kerb painted yellow, chevrons on its paving, a beacon
# and barriers at its tip.
gore = [(IS0, ZS), (plan.DECK_X0 - 0.5, GORE_Z), (plan.DECK_X0 + 0.5, GORE_Z), (IS1, ZS)]
face((DK, "sidewalk", 0), [(x, B.G0, z) for x, z in gore], (0, 1, 0), 2.0)
for (xa, za), (xb, zb) in zip(gore, gore[1:]):
    face((DK, "trim", 0), [(xa, 0.0, za), (xb, 0.0, zb), (xb, B.G0 + 0.004, zb), (xa, B.G0 + 0.004, za)],
         (xa + xb - 2 * plan.DECK_X0, 0, 1.0), 1.0, KERB_YELLOW)
for k in range(4):
    zc = ZS + 1.4 + k * 1.9
    hw = (IS1 - plan.DECK_X0) * (GORE_Z - zc) / (GORE_Z - ZS) - 0.5
    if hw < 0.5:
        break
    for s in (-1, 1):
        face((DK, "paint", 0), [(plan.DECK_X0, B.G0 + PAINT, zc + 0.9), (plan.DECK_X0 + s * hw, B.G0 + PAINT, zc), (plan.DECK_X0 + s * hw, B.G0 + PAINT, zc + 0.45),
                                (plan.DECK_X0, B.G0 + PAINT, zc + 1.35)], (0, 1, 0), 1.0, YELLOW)
end_block(plan.DECK_X0 - 0.4, plan.DECK_X0 + 0.4, GORE_Z + 0.5, GORE_Z + 1.3, h=1.1)

# ---------------------------------------------------------------------------
# What stands under it. Every lit thing within 60 m of the avenue is `glow`
# with a pool from light(): stalls under their awnings in the passages
# either side of the avenue, vending machines and skips against the walls,
# benches and trees, bollards keeping cars off the paving.
# ---------------------------------------------------------------------------
def stall(x, z, facing, colour, seed):
    """A market stall against a wall, its counter toward `facing` (+1 south,
    -1 north): a counter, posts, a dyed awning lit from under, its sign on
    the back board and a blade on a mast at its end (the street's sign
    faces: the site letters them), a strip lamp under the awning with its
    pool."""
    r = random.Random(seed)
    f = facing
    w = 2.8
    wood = (0.16, 0.11, 0.07, 1)
    box((DK, "trim", 0), x - w / 2, x + w / 2, B.G0, B.G0 + 0.95, *sorted((z + f * 0.9, z + f * 1.45)), scale=1.0, col=wood)
    box((DK, "trim", 0), x - w / 2, x + w / 2, B.G0, B.G0 + 2.3, *sorted((z, z + f * 0.12)), scale=1.0, col=(0.07, 0.07, 0.08, 1))
    for px in (x - w / 2 + 0.05, x + w / 2 - 0.05):
        box((DK, "metal", 1), px - 0.04, px + 0.04, B.G0, B.G0 + 2.45, *sorted((z + f * 1.5, z + f * 1.58)), scale=0.5)
    dye = tuple(int(NEON[colour][i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
    a = (x - w / 2 - 0.2, B.G0 + 2.75, z)
    b = (x + w / 2 + 0.2, B.G0 + 2.75, z)
    c = (x + w / 2 + 0.2, B.G0 + 2.35, z + f * 1.9)
    d = (x - w / 2 - 0.2, B.G0 + 2.35, z + f * 1.9)
    face((DK, "awning", 1), [a, b, c, d], (0, 1, 0), 1.0, dye)
    face((DK, "awning", 1), [a, b, c, d], (0, -1, 0), 1.0, dye)
    hem = sorted((z + f * 1.9, z + f * 1.94))
    box((DK, "glow", 1), x - w / 2 - 0.2, x + w / 2 + 0.2, B.G0 + 2.27, B.G0 + 2.35, hem[0], hem[1], scale=1.0, col=glowc(NEON[colour], 0.7))
    # Its sign on the back board, its blade on a mast at one end, and what
    # is on the counter.
    sw, sh = ST_SIZES["ps"]
    sign(st_name("ps"), x + r.uniform(-0.3, 0.3), B.G0 + 1.72, z + f * 0.135, sw, sh, 0.0 if f > 0 else math.pi, district=DK, label=False)
    e = r.choice((-1, 1))
    mx, mz = x + e * (w / 2 - 0.05), z + f * 1.54
    box((DK, "metal", 0), mx - 0.04, mx + 0.04, B.G0 + 2.45, B.G0 + 4.6, mz - 0.04, mz + 0.04, scale=0.5)
    bw, bh = ST_SIZES["bs"]
    oriented_box((DK, "board_frame", 0), mx, B.G0 + 3.55, mz - f * 0.5, bw + 0.1, bh + 0.1, 0.1, math.pi / 2, scale=1.0)
    for fy in (math.pi / 2, -math.pi / 2):
        sign(st_name("bs"), mx + math.sin(fy) * 0.06, B.G0 + 3.55, mz - f * 0.5, bw, bh, fy, district=DK, label=False)
    for k in range(r.randrange(2, 5)):
        cx = x - w / 2 + 0.3 + r.random() * (w - 0.6)
        h = r.uniform(0.15, 0.4)
        box((DK, "trim", 1), cx - 0.12, cx + 0.12, B.G0 + 0.95, B.G0 + 0.95 + h, *sorted((z + f * 1.0, z + f * 1.3)), scale=0.5,
            col=r.choice(((0.3, 0.08, 0.06, 1), (0.08, 0.2, 0.22, 1), (0.3, 0.24, 0.1, 1))))
    light(DK, x, 2.3, z + f * 1.6, "amber", 3.2)
    B.COLLISION.append(("box", x - w / 2, x + w / 2, 0.0, 2.5, min(z, z + f * 1.5), max(z, z + f * 1.5), DK))
    # Its keeper behind the counter, and who has stopped at it.
    out, back = (0.0, math.pi) if f > 0 else (math.pi, 0.0)
    stand(x + r.uniform(-0.6, 0.6), z + f * 0.5, out, "vendor", B.G0)
    for k in range(r.randrange(1, 4)):
        stand(x - 0.9 + k * 0.85 + r.uniform(-0.15, 0.15), z + f * r.uniform(2.05, 2.5), back + r.uniform(-0.3, 0.3),
              r.choice(("idle", "idle", "phone", "talk")), B.G0)


WN, WS = ZN - 1.0, ZS + 1.0     # the walls either side of the gap
# The passages either side of the avenue (x 14..44): a night market under
# the deck (Fn9gKhU_2_Q@74's plaza under its deck), bollards along the
# avenue's pavement, a tree and a bench.
for s in (-1, 1):
    stall(s * 25.5, WN + 0.05, 1, "red" if s < 0 else "amber", 8530 + s)
    stall(s * 31.5, WN + 0.05, 1, "teal" if s < 0 else "pink", 8540 + s)
    stall(s * 28.0, WS - 0.05, -1, "amber" if s < 0 else "cyan", 8550 + s)
    for z in (ZN + 0.4, ZN + 2.9, ZS - 2.9, ZS - 0.4):
        P.place("bollard", s * 14.5, B.G0, z, district=DK)
    P.place("planter_tree", s * 21.0, B.G0, plan.DECK_Z, district=DK)
    P.place("bench", s * 23.0, B.G0, plan.DECK_Z, s * math.pi / 2, district=DK)
    P.place("bench", s * 34.0, B.G0, plan.DECK_Z + 0.4, -s * math.pi / 2, district=DK)
    P.place("bin", s * 17.6, B.G0, ZS - 0.6, district=DK)
    P.place("bin", s * 37.2, B.G0, WS - 0.5, district=DK)
    P.place("dumpster", s * 41.5, B.G0, WN + 0.7, 0.0, district=DK)
    P.place("bags", s * 40.0, B.G0, WN + 0.6, district=DK)
    P.place("crates", s * 39.0, B.G0, WN + 0.7, 0.3, district=DK)
    P.place("crates", s * 18.9, B.G0, WS - 0.7, 1.2, district=DK)
    P.place("drum", s * 42.6, B.G0, WS - 0.5, district=DK)
    P.place("drum", s * 43.2, B.G0, WS - 1.1, district=DK)
    P.place("cctv", s * 16.2, B.G0, ZS + 0.5, district=DK)
    P.place("bollard_cube", s * 43.4, B.G0, plan.DECK_Z - 1.5, district=DK)
    P.place("bollard_cube", s * 43.4, B.G0, plan.DECK_Z + 1.5, district=DK)
# Japantown's gap (x -66..-50): a stall, machines against the wall, skips.
stall(-56.0, WN + 0.05, 1, "magenta", 8561)
P.place("vending", -52.2, B.G0, WS - 0.45, math.pi, district=DK)
P.place("vending_warm", -53.4, B.G0, WS - 0.45, math.pi, district=DK)
P.place("dumpster", -63.6, B.G0, WN + 0.7, 0.0, district=DK)
P.place("bags", -62.0, B.G0, WN + 0.6, district=DK)
P.place("crates", -64.0, B.G0, WS - 0.7, 0.4, district=DK)
P.place("bin", -57.5, B.G0, WS - 0.5, district=DK)
P.place("bench", -55.5, B.G0, plan.DECK_Z + 0.3, 0.0, district=DK)
for z in (ZN + 0.4, ZN + 2.9, ZS - 2.9, ZS - 0.4):
    P.place("bollard", -65.5, B.G0, z, district=DK)
# The plaza's gap (x 52..64), low under the deck coming down: a yard up to
# the abutment, its door and lamp, a fence across its mouth (below), drums, skips.
face((DK, "door", 0), [(ABUT_X - 0.02, B.G0, plan.DECK_Z - 0.6), (ABUT_X - 0.02, B.G0, plan.DECK_Z + 0.6), (ABUT_X - 0.02, B.G0 + 2.2, plan.DECK_Z + 0.6),
                      (ABUT_X - 0.02, B.G0 + 2.2, plan.DECK_Z - 0.6)], (-1, 0, 0), 1.0)
box((DK, "glow", 0), ABUT_X - 0.14, ABUT_X - 0.02, B.G0 + 2.4, B.G0 + 2.52, plan.DECK_Z - 0.2, plan.DECK_Z + 0.2, scale=0.5, col=glowc("eceae4", 0.8))
light(DK, ABUT_X - 0.8, 2.4, plan.DECK_Z, "white", 2.6)
box((DK, "hazard", 1), ABUT_X - 0.03, ABUT_X, B.G0, B.G0 + 0.5, ZN + 0.3, ZS - 0.3, scale=1.0)
P.place("dumpster", 61.5, B.G0, ZN + 0.9, 0.0, district=DK)
P.place("dumpster", 59.2, B.G0, ZN + 0.9, 0.0, district=DK)
P.place("bags", 62.8, B.G0, ZS - 0.8, district=DK)
P.place("crates", 61.0, B.G0, ZS - 0.9, 0.5, district=DK)
P.place("crates", 62.6, B.G0, plan.DECK_Z + 1.4, 1.9, district=DK)
for (x, z) in ((54.0, ZS - 0.6), (54.7, ZS - 0.9), (53.8, ZS - 1.3), (58.2, plan.DECK_Z + 2.0)):
    P.place("drum", x, B.G0, z, district=DK)
P.place("cctv", 53.2, B.G0, WN + 0.5, district=DK)
# Pipes along the embankment's walls in the passages either side of it.
for zp, out in ((ZN - 0.12, -1), (ZS + 0.12, 1)):
    for y, r_ in ((0.9, 0.09), (1.25, 0.06)):
        pipe((DK, "metal", 1), (ABUT_X + 0.5, y, zp), (ABUT_X + 22.0, y, zp), r_, segs=5)

# The island under the ramp's girder (z -150..-85) and the turn: parked
# bins and skips at the abutment, its door and lamp, machines by the bents
# facing the service lanes, benches and trees where the deck is high, a
# camera on the turn's pier, warning triangles on it.
face((DK, "door", 0), [(plan.DECK_X0 - 0.6, B.G0, EMB_Z + 0.02), (plan.DECK_X0 + 0.6, B.G0, EMB_Z + 0.02), (plan.DECK_X0 + 0.6, B.G0 + 2.2, EMB_Z + 0.02),
                      (plan.DECK_X0 - 0.6, B.G0 + 2.2, EMB_Z + 0.02)], (0, 0, 1), 1.0)
box((DK, "glow", 0), plan.DECK_X0 - 0.2, plan.DECK_X0 + 0.2, B.G0 + 2.4, B.G0 + 2.52, EMB_Z + 0.02, EMB_Z + 0.14, scale=0.5, col=glowc("ffb254", 0.9))
light(DK, plan.DECK_X0, 2.4, EMB_Z + 0.8, "amber", 2.6)
box((DK, "hazard", 1), XW + 0.2, XE - 0.2, B.G0, B.G0 + 0.5, EMB_Z, EMB_Z + 0.03, scale=1.0)
P.place("dumpster", plan.DECK_X0 - 3.0, B.G0, EMB_Z + 0.8, 0.0, district=DK)
P.place("dumpster", plan.DECK_X0 + 2.9, B.G0, EMB_Z + 0.8, 0.0, district=DK)
P.place("bags", plan.DECK_X0 + 1.4, B.G0, EMB_Z + 0.7, district=DK)
P.place("drum", plan.DECK_X0 - 1.5, B.G0, EMB_Z + 0.6, district=DK)
P.place("crates", plan.DECK_X0 - 3.4, B.G0, EMB_Z + 3.0, 0.7, district=DK)
for z in BENTS_Z:
    P.place("vending", XE - 1.1, B.G0, z + 1.65, math.pi / 2, district=DK)
    P.place("vending_warm", XW + 1.1, B.G0, z - 1.65, -math.pi / 2, district=DK)
    P.place("bin", plan.DECK_X0 + 2.2, B.G0, z - 1.5, district=DK)
stall(plan.DECK_X0, BENTS_Z[1] + 0.2, 1, "pink", 8581)
stall(plan.DECK_X0, BENTS_Z[2] + 0.2, 1, "cyan", 8582)
P.place("bench", plan.DECK_X0, B.G0, -125.5, 0.0, district=DK)
P.place("bench", plan.DECK_X0 - 1.5, B.G0, -108.5, math.pi / 2, district=DK)
P.place("bench", plan.DECK_X0 + 1.5, B.G0, -91.0, -math.pi / 2, district=DK)
P.place("planter_tree", plan.DECK_X0, B.G0, -108.5, district=DK)
P.place("planter_tree", plan.DECK_X0, B.G0, -91.0, district=DK)
P.place("lamp_short", plan.DECK_X0 + 2.6, B.G0, -111.0, district=DK)
P.place("lamp_short", plan.DECK_X0 - 2.6, B.G0, -94.0, district=DK)
P.place("food_box", plan.DECK_X0 - 3.6, B.G0, -121.5, -math.pi / 2, district=DK)
P.place("phone_booth", plan.DECK_X0 + 3.4, B.G0, -127.5, math.pi / 2, district=DK)    # open to the east service lane, not side on to it
P.place("cctv", PIER[0] + 2.3, B.G0, PIER[1] - 2.3, district=DK)
for yaw in (0.0, math.pi / 2, math.pi, -math.pi / 2):
    P.place("warning_tri", PIER[0] + math.sin(yaw) * 1.3, 2.4, PIER[1] + math.cos(yaw) * 1.3, yaw, district=DK)
for (x, z) in ((PIER[0] - 2.6, ZS - 0.8), (PIER[0] + 2.4, ZS - 1.0), (PIER[0] - 3.4, ZN + 1.4)):
    P.place("drum", x, B.G0, z, district=DK)
P.place("barrier", PIER[0], B.G0, ZS - 0.5, 0.0, district=DK)
# Bollards along the island's kerbs, keeping the service lanes off it.
z = EMB_Z + 4.0
while z < ZS - 1.0:
    P.place("bollard", IS0 + 0.35, B.G0, z, district=DK)
    P.place("bollard", IS1 - 0.35, B.G0, z + 3.0, district=DK)
    z += 6.0

# Boards on the ramp's retaining walls, where they are tall enough to
# carry one, and a small one on the abutment.
for z in (-171.0, -160.0):
    y = (RY(z) - DEPTH) / 2 + 0.1
    for xw, yaw in ((XW + 0.15, -math.pi / 2), (XE - 0.15, math.pi / 2)):
        w, h = ST_SIZES["ps"] if RY(z) - DEPTH < 2.0 else ST_SIZES["pm"]
        out = -1 if yaw < 0 else 1
        box((DK, "board_frame", 0), *sorted((xw, xw + out * 0.1)), y - h / 2 - 0.07, y + h / 2 + 0.07, z - w / 2 - 0.07, z + w / 2 + 0.07, scale=1.0)
        sign(st_name("ps" if RY(z) - DEPTH < 2.0 else "pm"), xw + out * 0.115, y, z, w, h, yaw, district=DK, label=False)

# ---------------------------------------------------------------------------
# PEOPLE (the site draws them, kit.stand). Nobody is placed on the walkways:
# they are 1.2 m wide and the walk-through's line runs down their middle
# (x -84.45 on the ramp, z -75.55 on the deck), so whoever stops on the deck
# stands in a lookout hung outside the rail (the bays, below), 1.4 m or more
# from that line; under the deck they shelter from the rain: at the stalls
# (above), at the machines, on the benches and the footings, smoking by the
# skips.
# ---------------------------------------------------------------------------
# The passages either side of the avenue: on the benches and the bents'
# footings, by the tree, at the pavement's edge out of the rain.
for s in (-1, 1):
    stand(s * 23.0, plan.DECK_Z + 0.4, s * math.pi / 2, "sit", B.G0 + 0.48)
    stand(s * 34.0, plan.DECK_Z, -s * math.pi / 2, "sit", B.G0 + 0.48)
    stand(s * 38.0, ZN + 2.0 + 0.75, 0.0, "sit", 0.6)
    stand(s * 16.3, ZN + 1.6, s * 1.9, "idle", B.G0)
    stand(s * 15.9, plan.DECK_Z + 1.3, -s * math.pi / 2, "smoke", B.G0)
    stand(s * 19.4, plan.DECK_Z - 1.1, 0.4, "talk", B.G0)
    stand(s * 19.9, plan.DECK_Z - 0.3, 0.4 + math.pi, "talk", B.G0)
    stand(s * 24.5, plan.DECK_Z + 1.2, s * 0.6, "phone", B.G0)
    stand(s * 40.4, WS - 0.7, math.pi, "squat", B.G0)
stand(HERO + 0.2, ZS - 2.0 + 0.8, 0.0, "lean", B.G0)
stand(-HERO - 0.3, ZN + 2.0 + 0.85, 0.3, "lean", B.G0)
# Japantown's gap: at the machines, on the bench.
stand(-52.3, WS - 1.5, 0.0, "idle", B.G0)
stand(-53.5, WS - 1.6, 0.15, "phone", B.G0)
stand(-55.5, plan.DECK_Z + 0.3, 0.0, "sit", B.G0 + 0.48)
stand(-60.0, ZS - 2.0 - 0.75, math.pi, "sit", 0.6)
stand(-62.5, WN + 1.6, 0.6, "smoke", B.G0)
# The plaza's yard: at the abutment's door, by the skips.
stand(ABUT_X - 0.9, plan.DECK_Z + 1.1, -math.pi / 2, "smoke", B.G0)
stand(ABUT_X - 1.4, plan.DECK_Z + 1.9, 2.6, "talk", B.G0)
stand(60.2, ZN + 2.1, 0.0, "squat", B.G0)
stand(55.0, plan.DECK_Z, math.pi / 2, "idle", B.G0)
# Under the ramp: at the machines by the bents, on the benches, by the
# trees, smoking by the skips at the abutment, leaning on the turn's pier.
for z in BENTS_Z:
    stand(XE - 2.1, z + 2.6, math.pi / 2 - 0.5, "phone" if z != BENTS_Z[1] else "idle", B.G0)
    stand(XW + 2.2, z - 2.7, -math.pi / 2 + 0.4, "idle", B.G0)
stand(plan.DECK_X0, -125.5, 0.0, "sit", B.G0 + 0.48)
stand(plan.DECK_X0 - 1.5, -108.5, math.pi / 2, "sit", B.G0 + 0.48)
stand(plan.DECK_X0 + 1.5, -91.0, -math.pi / 2, "sit", B.G0 + 0.48)
stand(plan.DECK_X0 + 0.9, -106.6, 2.6, "talk", B.G0)
stand(plan.DECK_X0 + 1.5, -107.5, -0.6, "talk", B.G0)
stand(plan.DECK_X0 - 1.6, EMB_Z + 1.9, 0.4, "smoke", B.G0)
stand(plan.DECK_X0 - 0.7, EMB_Z + 2.5, -2.4, "smoke", B.G0)
stand(plan.DECK_X0 + 1.2, EMB_Z + 1.2, 0.0, "lean", B.G0)
stand(plan.DECK_X0 - 2.0, -141.0, 0.0, "squat", B.G0)
stand(PIER[0] + 1.55, PIER[1], math.pi / 2, "lean", B.G0)
stand(PIER[0] - 0.4, PIER[1] + 1.6, 0.2, "phone", B.G0)

# ---------------------------------------------------------------------------
# MORE LIGHT. The lit kerb strips and the band are `glow`, which the bake
# does not see: their light on the road, on the retaining walls and on the
# service lanes under the band is set down here, a small pool every few
# metres. None near the avenue's line.
# ---------------------------------------------------------------------------
x, i = XE + 3.0, 0
while x < MOUTH_X - 2.0:
    pool(x, DY(x) + 0.3, z_par + 0.5 if i % 2 == 0 else z_lane_s - 0.5, "amber", 1.3)
    x += 7.0
    i += 1
z, i = FOOT + 6.0, 0
while z < ZN - 2.0:
    pool(x_par - 0.5 if i % 2 == 0 else x_lane_w + 0.5, RY(z) + 0.3, z, "amber", 1.3)
    z += 7.0
    i += 1
BAND_HUES = ("amber", "yellow", "amber", "red")
z, i = WALL_Z + 3.0, 0
while z < ZS:
    pool(XW - 0.7, 2.0, z, BAND_HUES[i % 4], 1.8)
    if z < ZN:
        pool(XE + 0.7, 2.0, z + 3.5, BAND_HUES[(i + 2) % 4], 1.8)
    z += 7.0
    i += 1
# Where the deck crosses the west street's east side and the two lanes.
for x in (-72.5, -68.0, -47.0, 48.0):
    pool(x, 2.0, ZN - 0.7, "amber", 1.8)
    pool(x, 2.0, ZS + 0.7, "yellow", 1.8)

# ---------------------------------------------------------------------------
# OVER THE ROAD. Two more gantries on the level, either side of the avenue
# and hidden from the hero by the rows (more than 20 m from its line, past
# where the bake mirrors a sign into the hero's road): the street's signs
# on both faces and lane lights for both ways; and a festoon of bulbs along
# the walkway between posts on the rail, either side of the hero's span.
# ---------------------------------------------------------------------------
for gx, seed, hues in ((-33.0, 8603, ("cyan", "pink")), (30.0, 8604, ("yellow", "red"))):
    base = DY(gx)
    gy = gantry("x", gx, ZN + 0.2, ZS - 0.08, base, 1, seed, sizes=("pm", "ps") if gx < 0 else ("ps", "pm"))
    lane_light("x", gx, plan.DECK_Z + 1.75, gy, -1, True)
    lane_light("x", gx, plan.DECK_Z - 1.75, gy, -1, False)
    lane_light("x", gx, plan.DECK_Z - 1.75, gy, 1, True)
    lane_light("x", gx, plan.DECK_Z + 1.75, gy, 1, False)
    pool(gx - 2.0, base + 6.0, plan.DECK_Z, hues[0], 2.2, 2.0)
    pool(gx + 2.0, base + 6.0, plan.DECK_Z, hues[1], 2.2, 2.0)

# The festoon: bulbs on a sagging line between posts on the rail.
BULB = glowc("ffc878", 0.9)
for xa, xb in ((XE + 3.0, -HERO - 3.5), (HERO + 3.5, 97.0)):
    n = max(1, round((xb - xa) / 11.0))
    step = (xb - xa) / n
    for k in range(n + 1):
        px = xa + k * step
        box((DK, "metal", 1), px - 0.035, px + 0.035, DY(px) + RAIL_H, DY(px) + 3.1, ZS - 0.075, ZS - 0.005, scale=0.5)
    for k in range(n):
        for j in range(1, 8):
            t = j / 8
            bx = xa + (k + t) * step
            by = DY(xa + k * step) * (1 - t) + DY(xa + (k + 1) * step) * t + 3.0 - 0.55 * math.sin(math.pi * t)
            cylinder((DK, "glow", 1), bx, ZS - 0.04, by - 0.07, by + 0.07, 0.06, segs=4, col=BULB, cap=False)
        pool(xa + (k + 0.5) * step, DY(xa + (k + 0.5) * step) + 2.5, ZS - 0.6, "amber", 1.2)

# ---------------------------------------------------------------------------
# LAST THINGS. The ramp's foot striped where the walls are too low for the
# band; a door and its lamp in each retaining wall; steam from three grates
# under the deck (the site draws it from anchor_steam_<n>).
# ---------------------------------------------------------------------------
z = FOOT + 0.2
while z < FOOT + 12.0:
    face((DK, "hazard", 0), [(XE + 0.012, RY(z) + 0.1, z), (XE + 0.012, RY(z + 0.6) + 0.1, z + 0.6), (XE + 0.012, RY(z + 0.6) + 0.8, z + 0.6), (XE + 0.012, RY(z) + 0.8, z)], (1, 0, 0), 1.0)
    face((DK, "hazard", 0), [(XW - 0.012, RY(z) + 0.1, z), (XW - 0.012, RY(z + 0.6) + 0.1, z + 0.6), (XW - 0.012, RY(z + 0.6) + 0.95, z + 0.6), (XW - 0.012, RY(z) + 0.95, z)], (-1, 0, 0), 1.0)
    z += 1.2
for xw, out, hue in ((XW + 0.15, -1, "amber"), (XE - 0.15, 1, "white")):
    zd = EMB_Z - 3.2
    face((DK, "door", 0), [(xw + out * 0.02, 0.0, zd - 0.5), (xw + out * 0.02, 0.0, zd + 0.5), (xw + out * 0.02, 2.1, zd + 0.5), (xw + out * 0.02, 2.1, zd - 0.5)], (out, 0, 0), 1.0)
    box((DK, "glow", 0), *sorted((xw, xw + out * 0.13)), 2.25, 2.37, zd - 0.18, zd + 0.18, scale=0.5, col=glowc(NEON[hue], 0.85))
    pool(xw + out * 0.9, 2.3, zd, hue, 2.4)
for i, (x, z) in enumerate(((plan.DECK_X0 + 2.4, -104.5), (-35.5, plan.DECK_Z - 1.2), (41.0, plan.DECK_Z + 1.6))):
    box((DK, "metal", 1), x - 0.45, x + 0.45, B.G0, B.G0 + 0.03, z - 0.45, z + 0.45, scale=0.5)
    empty(f"anchor_steam_deck_{i}", (x, B.G0 + 0.08, z))

# Where the plaza street ends against the ramp (z -179): chevrons on the
# parapet facing it, an amber beacon either end, so the street ends at
# something. And boards standing on the ramp's edges over the service lanes,
# facing the pavements: the street's signs and adverts with no words, turn
# about (more than 60 m from the avenue: their light is the west street's).
for k in range(4):
    zc = -181.4 + k * 1.6
    yb = RY(zc) + 0.12
    face((DK, "hazard", 0), [(XE + 0.014, yb, zc - 0.7), (XE + 0.014, yb, zc + 0.7), (XE + 0.014, yb + 0.72, zc + 0.7), (XE + 0.014, yb + 0.72, zc - 0.7)], (1, 0, 0), 1.0)
    d = 1 if k >= 2 else -1     # pointing away from the middle, either way round the ramp
    for j in (0, 1):
        z0 = zc - d * 0.45 + d * j * 0.5
        face((DK, "dark", 0), [(XE + 0.02, yb + 0.06, z0), (XE + 0.02, yb + 0.06, z0 + d * 0.22), (XE + 0.02, yb + 0.36, z0 + d * 0.5), (XE + 0.02, yb + 0.66, z0 + d * 0.22),
                               (XE + 0.02, yb + 0.66, z0), (XE + 0.02, yb + 0.36, z0 + d * 0.28)], (1, 0, 0), 1.0)
for zc in (-182.6, -175.4):
    box((DK, "glow", 0), XE - 0.3, XE - 0.1, RY(zc) + PAR_H + 0.07, RY(zc) + PAR_H + 0.27, zc - 0.1, zc + 0.1, scale=0.5, col=glowc("ffb254", 1.0))
    pool(XE + 1.0, 2.0, zc, "amber", 2.0)

STEEL_LT = (0.3, 0.32, 0.34, 1.0)       # galvanised sections
STEEL_SHEET = (0.07, 0.08, 0.09, 1.0)   # a board's back sheet
SERVICE = glowc("ffd8a0", 1.0)


def board_back(cx, cy, cz, w, h, yaw, catwalk=True, hue="amber"):
    """The back of a board where the road sees it, (cx, cy, cz) the middle
    of its back plane and `yaw` the way that faces: sheet steel behind a
    frame of rails, studs and braces, service lamps on arms over its top
    with their light on it, and (where there is a parapet under it to
    carry one) a catwalk with a handrail along its foot, on brackets."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    rx, rz = math.cos(yaw), -math.sin(yaw)

    def at(su, sv, o):
        return (cx + rx * su + nx * o, cy + sv, cz + rz * su + nz * o)

    rotated_quad((DK, "steel", 0), *at(0, 0, 0.012), w, h, yaw, col=STEEL_SHEET)
    for sv in (h / 2 - 0.07, 0.0, -h / 2 + 0.07):
        oriented_box((DK, "steel", 0), *at(0, sv, 0.05), w, 0.1, 0.08, yaw, scale=1.0, col=STEEL_LT)
    n = max(2, round(w / 1.4))
    for k in range(n + 1):
        su = -w / 2 + 0.05 + (w - 0.1) * k / n
        oriented_box((DK, "steel", 1), *at(su, 0, 0.045), 0.08, h, 0.07, yaw, scale=1.0, col=STEEL_LT)
    step = (w - 0.1) / n
    for k in (0, n - 1):
        a, b = -w / 2 + 0.05 + step * k, -w / 2 + 0.05 + step * (k + 1)
        if k:
            a, b = b, a
        pipe((DK, "steel", 1), at(a, -h / 2 + 0.07, 0.06), at(b, h / 2 - 0.07, 0.06), 0.03, segs=4, col=STEEL_LT)
    for su in ((-w / 4, w / 4) if w > 3.5 else (0.0,)):
        pipe((DK, "steel", 1), at(su, h / 2 - 0.05, 0.05), at(su, h / 2 + 0.28, 0.5), 0.022, segs=4, col=STEEL_LT)
        oriented_box((DK, "glow", 0), *at(su, h / 2 + 0.25, 0.52), 0.5, 0.05, 0.14, yaw, scale=0.5, col=SERVICE)
        px, py, pz = at(su, 0.0, 0.45)
        pool(px, py, pz, hue, 2.4)
    if catwalk:
        yc = -h / 2 - 0.1
        oriented_box((DK, "steel", 0), *at(0, yc, 0.28), w, 0.05, 0.5, yaw, scale=0.5, col=STEEL_LT)
        oriented_box((DK, "steel", 1), *at(0, yc + 1.0, 0.51), w, 0.04, 0.04, yaw, scale=0.5, col=STEEL_LT)
        oriented_box((DK, "steel", 1), *at(0, yc + 0.52, 0.51), w, 0.03, 0.03, yaw, scale=0.5, col=STEEL_LT)
        for k in range(n + 1):
            su = -w / 2 + 0.05 + (w - 0.1) * k / n
            oriented_box((DK, "steel", 1), *at(su, yc + 0.5, 0.51), 0.04, 1.0, 0.04, yaw, scale=0.5, col=STEEL_LT)
            pipe((DK, "steel", 1), at(su, yc - 0.02, 0.5), at(su, yc - 0.42, 0.03), 0.02, segs=4, col=STEEL_LT)


edge_rng = random.Random(8590)
for k, z in enumerate((-142.0, -126.0, -109.0, -92.0)):
    for xe, out in ((XW, -1), (XE, 1)):
        zc = z + (4.0 if out > 0 else 0.0)
        base = RY(zc) + (RAIL_H if out < 0 else PAR_H + 0.07)
        yaw = out * math.pi / 2
        xc = xe - out * 0.06
        for dz in (-1.2, 1.2):
            box((DK, "metal", 0), xc - 0.05, xc + 0.05, base, base + 0.5, zc + dz - 0.05, zc + dz + 0.05, scale=0.5)
        # Their backs face the road (east edge, over the parapet: a catwalk)
        # and the walkway (west edge, on the rail: flat to it).
        if (k + (out > 0)) % 2 == 0:
            B.billboard(DK, xe + out * 0.12, base + 0.5 + 0.95, zc, 4.2, 1.7, yaw, edge_rng, back=False, depth=0.24)
            board_back(xe - out * 0.14, base + 0.5 + 0.95, zc, 4.6, 2.1, yaw + math.pi, catwalk=out > 0, hue="amber" if k % 2 else "white")
        else:
            w, h = ST_SIZES["pm"]
            oriented_box((DK, "board_frame", 0), xc, base + 0.5 + h / 2 + 0.08, zc, w + 0.16, h + 0.16, 0.2, yaw, scale=1.0)
            sign(st_name("pm"), xc + out * 0.115, base + 0.5 + h / 2 + 0.08, zc, w, h, yaw, district=DK, label=False)
            board_back(xc - out * 0.1, base + 0.5 + h / 2 + 0.08, zc, w + 0.16, h + 0.16, yaw + math.pi, catwalk=out > 0, hue="amber" if k % 2 else "white")

# ---------------------------------------------------------------------------
# THE ROAD'S OWN LAYER, what a driver and a flying car see of the deck's top:
# lights along both edges from above, studs in the lane lines, arrows in the
# lanes, expansion joints over the bents, patched tarmac, drains, conduit
# and junction boxes on the parapet, emergency phones, a scanner arch, sign
# bridges on the climb and the descent, chevrons round the turn, roadworks
# on the shoulder. All of it `glow`, paint or steel near the avenue; nothing
# over the hero's span stands higher than the rail.
# ---------------------------------------------------------------------------
EDGE_AMBER = glowc("ffb254", 0.8)
EDGE_TEAL = glowc("2ee6c8", 0.5)
# A line of light let into the parapet's cap and the rail's top: from above
# the deck is drawn by its two edges; from below neither shows.
xs("glow", 0, x_par, MOUTH_X, ZN + 0.15, ZN + 0.25, 0.0, up(DY, PAR_H + 0.082), sides="t", scale=1.0, col=EDGE_AMBER)
zs("glow", 0, FOOT, ZN, XE - 0.25, XE - 0.15, 0.0, up(RY, PAR_H + 0.082), sides="t", scale=1.0, col=EDGE_AMBER)
xs("glow", 0, x_rail, MOUTH_X, ZS - 0.062, ZS - 0.018, 0.0, up(DY, RAIL_H + 0.012), sides="t", scale=1.0, col=EDGE_TEAL)
zs("glow", 0, FOOT, ZS, XW + 0.018, XW + 0.062, 0.0, up(RY, RAIL_H + 0.012), sides="t", scale=1.0, col=EDGE_TEAL)

# Studs: amber between the centre lines every four metres, white along the
# edge lines every eight.
STUD_A = glowc("ffb254", 1.0)
STUD_W = glowc("eceae4", 0.8)


def stud(axis, v, u, y, col, detail):
    face((DK, "glow", detail), [_w(axis, v - 0.16, u - 0.05, y), _w(axis, v + 0.16, u - 0.05, y), _w(axis, v + 0.16, u + 0.05, y), _w(axis, v - 0.16, u + 0.05, y)], (0, 1, 0), 1.0, col)


x, i = TURN[0] + 2.0, 0
while x < MOUTH_X - 2.0:
    stud("x", x, plan.DECK_Z, road_top(x) + 0.016, STUD_A, 0)
    if i % 2 == 0:
        stud("x", x, plan.DECK_Z - LANE_IN + 0.3, road_top(x) + 0.016, STUD_W, 1)
        stud("x", x, plan.DECK_Z + LANE_IN - 0.3, road_top(x) + 0.016, STUD_W, 1)
    x += 4.0
    i += 1
z, i = NOSE + 2.0, 0
while z < TURN[1] - 1.0:
    stud("z", z, plan.DECK_X0, RY(z) + 0.016, STUD_A, 0)
    if i % 2 == 0:
        stud("z", z, plan.DECK_X0 - LANE_IN + 0.3, RY(z) + 0.016, STUD_W, 1)
        stud("z", z, plan.DECK_X0 + LANE_IN - 0.3, RY(z) + 0.016, STUD_W, 1)
    z += 4.0
    i += 1
for k in range(1, 6):
    a = k * math.pi / 12
    stud("x", TURN[0] - 4.0 * math.cos(a), TURN[1] + 4.0 * math.sin(a), Y + 0.016, STUD_A, 0)


def arrow(axis, v, u, d, hf, bend=0):
    """A lane arrow painted at v, in the lane at u, pointing d (+1 or -1)
    along the run; `bend` turns its head to that side (+1 or -1 across)."""
    def q(pts):
        face((DK, "paint", 0), [_w(axis, pv, pu, hf(pv) + PAINT) for pv, pu in pts], (0, 1, 0), 1.0, WHITE)
    if not bend:
        q([(v - d * 1.7, u - 0.08), (v + d * 0.5, u - 0.08), (v + d * 0.5, u + 0.08), (v - d * 1.7, u + 0.08)])
        q([(v + d * 0.5, u - 0.42), (v + d * 1.7, u), (v + d * 0.5, u + 0.42)])
    else:
        q([(v - d * 1.7, u - 0.08), (v + d * 0.6, u - 0.08), (v + d * 0.6, u + 0.08), (v - d * 1.7, u + 0.08)])
        q([(v + d * 0.44, u), (v + d * 0.6, u), (v + d * 0.6, u + bend * 0.7), (v + d * 0.44, u + bend * 0.7)])
        q([(v + d * 0.1, u + bend * 0.7), (v + d * 0.52, u + bend * 1.5), (v + d * 0.94, u + bend * 0.7)])


for x in (-68.0, -24.0, 8.0, 44.0, 76.0):
    arrow("x", x, plan.DECK_Z + 1.75, 1, road_top)
for x in (88.0, 52.0, 14.0, -22.0):
    arrow("x", x, plan.DECK_Z - 1.75, -1, road_top)
arrow("x", -62.0, plan.DECK_Z - 1.75, -1, road_top, bend=-1)
for z in (-203.0, -170.0, -135.0):
    arrow("z", z, plan.DECK_X0 - 1.75, 1, RY)
arrow("z", -100.0, plan.DECK_X0 - 1.75, 1, RY, bend=1)
for z in (-112.0, -150.0, -188.0):
    arrow("z", z, plan.DECK_X0 + 1.75, -1, RY)

# Expansion joints over every bent and abutment: two steel angles and the
# gap between them, lying on the road from kerb strip to kerb strip (they
# stop there: nothing up the parapet or across the walkway).
def joint(axis, v, u0, u1, hf):
    for w, mat, lift, det in ((0.16, "metal", 0.014, 0), (0.04, "dark", 0.017, 1)):
        face((DK, mat, det), [_w(axis, v - w / 2, u0, hf(v - w / 2) + lift), _w(axis, v + w / 2, u0, hf(v + w / 2) + lift),
                              _w(axis, v + w / 2, u1, hf(v + w / 2) + lift), _w(axis, v - w / 2, u1, hf(v - w / 2) + lift)], (0, 1, 0), 0.5)


for x in BENTS_X + (ABUT_X, XE + 0.6):
    joint("x", x, z_par + 0.07, z_lane_s - 0.07, road_top)
for z in BENTS_Z + (EMB_Z, ZN - 0.6):
    joint("z", z, x_lane_w + 0.07, x_par - 0.07, RY)

# Repairs, as a road wears them: a cut-out's outline sealed with tar (an
# uneven ring inside its lane, the fill the road's own asphalt) and cracks
# sealed along the lanes. No slab of another colour lies on the road.
patch_rng = random.Random(8600)
ARROWS_X = {1: (-68.0, -24.0, 8.0, 44.0, 76.0), -1: (88.0, 52.0, 14.0, -22.0, -62.0)}
ARROWS_Z = {-1: (-203.0, -170.0, -135.0, -100.0), 1: (-112.0, -150.0, -188.0)}


def patch(axis, v, u, length, width, mat, hf):
    pts = [(v - length / 2, u - width / 2), (v + length / 2, u - width / 2), (v + length / 2, u + width / 2), (v - length / 2, u + width / 2)]
    face((DK, mat, 0), [_w(axis, pv, pu, hf(pv) + 0.007) for pv, pu in pts], (0, 1, 0), 1.0)


def tar(axis, pts, w, hf, closed=False):
    """A band of tar w wide along the points (v, u) on the road."""
    m = len(pts)
    for k in range(m if closed else m - 1):
        (v0, u0), (v1, u1) = pts[k], pts[(k + 1) % m]
        dv, du = v1 - v0, u1 - u0
        ln = math.hypot(dv, du) or 1.0
        nv, nu = -du / ln * w / 2, dv / ln * w / 2
        ev, eu = dv / ln * w / 2, du / ln * w / 2
        q = ((v0 - ev + nv, u0 - eu + nu), (v1 + ev + nv, u1 + eu + nu), (v1 + ev - nv, u1 + eu - nu), (v0 - ev - nv, u0 - eu - nu))
        face((DK, "dark", 1), [_w(axis, pv, pu, hf(pv) + 0.007) for pv, pu in q], (0, 1, 0), 1.0)


def repair(axis, v, u, length, width, hf):
    n = 7
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n + patch_rng.uniform(-0.25, 0.25)
        rr = patch_rng.uniform(0.7, 1.0)
        pts.append((v + math.cos(a) * length / 2 * rr, u + math.sin(a) * width / 2 * rr))
    tar(axis, pts, 0.07, hf, closed=True)


def crack(axis, v, u, length, hf):
    n = max(3, int(length / 0.9))
    pts = [(v + length * k / n, u + patch_rng.uniform(-0.22, 0.22)) for k in range(n + 1)]
    tar(axis, pts, 0.05, hf)
    if patch_rng.random() < 0.5:        # a branch off it
        k = patch_rng.randrange(1, n)
        tar(axis, [pts[k], (pts[k][0] + patch_rng.uniform(0.3, 0.8), pts[k][1] + patch_rng.choice((-1, 1)) * patch_rng.uniform(0.35, 0.6))], 0.045, hf)


def worn(axis, vs, centre, arrows, hf):
    for i, v in enumerate(vs):
        lane = patch_rng.choice((-1, 1))
        v += patch_rng.uniform(-1.5, 1.5)
        if any(abs(v - a) < 4.5 for a in arrows[lane]):
            lane = -lane
            if any(abs(v - a) < 4.5 for a in arrows[lane]):
                continue
        u = centre + lane * patch_rng.uniform(1.45, 2.0)
        if i % 3 == 0:
            repair(axis, v, u, patch_rng.uniform(1.6, 3.0), patch_rng.uniform(1.0, 1.7), hf)
        else:
            crack(axis, v - 1.5, u, patch_rng.uniform(2.5, 5.0), hf)


worn("x", (-66.0, -49.0, -37.5, -30.0, -15.0, -4.0, 19.0, 27.0, 36.5, 48.0, 59.0, 64.5, 70.5, 82.0, 97.0), plan.DECK_Z, ARROWS_X, road_top)
worn("z", (-208.0, -194.0, -181.0, -160.0, -144.0, -124.0, -106.0, -92.0), plan.DECK_X0, ARROWS_Z, RY)

# Drains on the shoulder by the parapet, conduit and junction boxes along
# the parapet's face.
x = XE + 9.0
while x < MOUTH_X - 4.0:
    patch("x", x, z_par + 0.36, 0.6, 0.34, "dark", lambda v: road_top(v) + 0.006)
    x += 15.0
z = FOOT + 12.0
while z < ZN - 4.0:
    patch("z", z, x_par - 0.36, 0.6, 0.34, "dark", lambda v: RY(v) + 0.006)
    z += 15.0
for lo, hi in ((0.5, 0.55), (0.62, 0.66)):
    xs("metal", 1, x_par + 0.6, MOUTH_X - 1.0, z_par, z_par + 0.05, up(DY, lo), up(DY, hi), sides="tbB", scale=0.5)
    zs("metal", 1, FOOT + 2.0, ZN - 0.4, x_par - 0.05, x_par, up(RY, lo), up(RY, hi), sides="tbA", scale=0.5)
x = XE + 6.0
while x < MOUTH_X - 3.0:
    box((DK, "metal", 1), x - 0.17, x + 0.17, DY(x) + 0.42, DY(x) + 0.76, z_par, z_par + 0.11, scale=0.5)
    x += 12.0
z = FOOT + 8.0
while z < ZN - 3.0:
    box((DK, "metal", 1), x_par - 0.11, x_par, RY(z) + 0.42, RY(z) + 0.76, z - 0.17, z + 0.17, scale=0.5)
    z += 12.0


def sos(axis, v, hf, hue="cyan"):
    """An emergency phone on the parapet's face: a yellow cabinet on a
    post, a lamp over it and its pool."""
    y = hf(v)
    if axis == "x":
        x0, x1, z0, z1 = v - 0.17, v + 0.17, z_par, z_par + 0.2
    else:
        x0, x1, z0, z1 = x_par - 0.2, x_par, v - 0.17, v + 0.17
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    box((DK, "metal", 0), cx - 0.05, cx + 0.05, y, y + 1.25, cz - 0.05, cz + 0.05, scale=0.5)
    box((DK, "hazard", 0), x0, x1, y + 1.2, y + 1.72, z0, z1, scale=0.5)
    box((DK, "glow", 0), x0, x1, y + 1.72, y + 1.8, z0, z1, scale=0.5, col=glowc(NEON[hue], 0.9))
    if axis == "x":
        face((DK, "dark", 1), [(v - 0.1, y + 1.3, z1 + 0.004), (v + 0.1, y + 1.3, z1 + 0.004), (v + 0.1, y + 1.6, z1 + 0.004), (v - 0.1, y + 1.6, z1 + 0.004)], (0, 0, 1), 0.5)
    else:
        face((DK, "dark", 1), [(x0 - 0.004, y + 1.3, v - 0.1), (x0 - 0.004, y + 1.3, v + 0.1), (x0 - 0.004, y + 1.6, v + 0.1), (x0 - 0.004, y + 1.6, v - 0.1)], (-1, 0, 0), 0.5)
    pool(cx, y + 1.7, cz, hue, 1.6)


sos("x", -28.0, DY)
sos("x", 58.0, DY)
sos("z", -158.0, RY)
sos("z", -106.0, RY)

# The scanner arch on the level west of the avenue (hidden from the hero by
# the rows): two pylons and a deep beam, bars of light scanning each lane
# from under it, a sign on each face, status lights, cameras, and
# its band painted on the road.
AX = -56.0
ab = DY(AX)
SCAN = glowc("27dcf2", 0.9)
for u in (ZN + 0.22, ZS + 0.02):     # the south pylon stands on the rail and out over the edge, clear of the walkway
    box((DK, "board_frame", 0), AX - 0.3, AX + 0.3, ab, ab + 6.3, u - 0.16, u + 0.16, scale=1.0)
    for sx in (-1, 1):
        box((DK, "glow", 0), AX + sx * 0.3 - 0.02 * (sx < 0), AX + sx * 0.3 + 0.02 * (sx > 0), ab + 1.2, ab + 5.0, u - 0.05, u + 0.05, scale=1.0, col=SCAN)
box((DK, "board_frame", 0), AX - 0.4, AX + 0.4, ab + 5.2, ab + 6.3, ZN + 0.06, ZS + 0.18, scale=1.0, bottom=True)
for lane in (-1.75, 1.75):
    zc = plan.DECK_Z + lane
    for sx in (-0.28, 0.28):
        face((DK, "glow", 0), [(AX + sx - 0.05, ab + 5.19, zc - 1.4), (AX + sx + 0.05, ab + 5.19, zc - 1.4), (AX + sx + 0.05, ab + 5.19, zc + 1.4), (AX + sx - 0.05, ab + 5.19, zc + 1.4)], (0, -1, 0), 1.0, SCAN)
    box((DK, "dark", 1), AX - 0.12, AX + 0.12, ab + 4.92, ab + 5.2, zc - 0.16, zc + 0.16, scale=0.5)
    for sx, f in ((-0.41, -1), (0.41, 1)):
        go = (f < 0) == (lane > 0)      # the face each lane's driver meets shows green
        col = glowc("39ff9a" if go else "ff003c", 0.9)
        rotated_quad((DK, "glow", 0), AX + sx, ab + 5.45, zc, 0.3, 0.3, f * math.pi / 2, col=col)
for f in (-1, 1):
    rotated_quad((DK, "glow", 0), AX + f * 0.412, ab + 6.2, plan.DECK_Z, 9.0, 0.08, f * math.pi / 2, col=SCAN)
    w, h = ST_SIZES["ps"]
    sign(st_name("ps"), AX + f * 0.415, ab + 5.72, plan.DECK_Z, w, h, f * math.pi / 2, district=DK, label=False)
for k in range(5):
    xa = AX - 1.6 + k * 0.8
    face((DK, "paint", 0), [(xa, ab + PAINT, z_par + 0.3), (xa + 0.3, ab + PAINT, z_par + 0.3), (xa + 0.3, ab + PAINT, plan.DECK_Z - 0.3), (xa, ab + PAINT, plan.DECK_Z - 0.3)], (0, 1, 0), 1.0, WHITE)
    face((DK, "paint", 0), [(xa, ab + PAINT, plan.DECK_Z + 0.3), (xa + 0.3, ab + PAINT, plan.DECK_Z + 0.3), (xa + 0.3, ab + PAINT, z_lane_s - 0.3), (xa, ab + PAINT, z_lane_s - 0.3)], (0, 1, 0), 1.0, WHITE)
pool(AX, ab + 5.0, plan.DECK_Z - 1.75, "cyan", 3.0, 1.6)
pool(AX, ab + 5.0, plan.DECK_Z + 1.75, "cyan", 3.0, 1.6)

# Sign bridges: over the climb (the street's boards, lane lights both ways)
# and over the descent, a billboard across both lanes facing the drivers
# coming down, an advert on its back for those coming up (both more than
# 60 m from the avenue).
gz = -166.0
gy = gantry("z", gz, XW + 0.08, XE - 0.2, RY(gz), -1, 8601, sizes=("pm", "pm"))
lane_light("z", gz, plan.DECK_X0 - 1.75, gy, -1, True)
lane_light("z", gz, plan.DECK_X0 + 1.75, gy, -1, False)
lane_light("z", gz, plan.DECK_X0 + 1.75, gy, 1, True)
lane_light("z", gz, plan.DECK_X0 - 1.75, gy, 1, False)
bx = 80.0
bb = DY(bx)
box((DK, "metal", 0), bx - 0.16, bx + 0.16, bb, bb + 6.3, ZN + 0.04, ZN + 0.36, scale=1.0)
box((DK, "metal", 0), bx - 0.16, bx + 0.16, bb, bb + 6.3, ZS - 0.16, ZS, scale=1.0)
box((DK, "metal", 0), bx - 0.16, bx + 0.16, bb + 5.9, bb + 6.3, ZN + 0.2, ZS - 0.08, scale=1.0, bottom=True)
B.billboard(DK, bx - 0.22, bb + 6.3 + 1.75, plan.DECK_Z, 8.8, 3.1, -math.pi / 2, random.Random(8602), depth=0.4)
lane_light("x", bx, plan.DECK_Z + 1.75, bb + 5.9, -1, True)
lane_light("x", bx, plan.DECK_Z - 1.75, bb + 5.9, -1, False)
lane_light("x", bx, plan.DECK_Z - 1.75, bb + 5.9, 1, True)
lane_light("x", bx, plan.DECK_Z + 1.75, bb + 5.9, 1, False)

# Chevrons round the outside of the turn, on posts over the barrier: lit
# arrows on dark boards, pointing the way round, for a driver coming up the
# ramp (they face north) and for one coming along the deck (they face east).
CHEV = glowc("ffb254", 1.0)
for k in range(4):
    c = -82.4 + k * 1.4
    # Facing north, on the south barrier, pointing east.
    zc = z_lane_s + BAR / 2
    oriented_box((DK, "board_frame", 0), c, Y + 2.5, zc, 1.1, 0.8, 0.08, math.pi, scale=1.0)
    for px in (c - 0.4, c + 0.4):
        box((DK, "metal", 1), px - 0.03, px + 0.03, Y + 0.45, Y + 2.1, zc - 0.03, zc + 0.03, scale=0.5)
    for j in (0, 1):
        x0 = c - 0.42 + j * 0.4
        for yb, yt in ((Y + 2.22, Y + 2.5), (Y + 2.78, Y + 2.5)):
            face((DK, "glow", 0), [(x0, yb, zc - 0.05), (x0 + 0.2, yb, zc - 0.05), (x0 + 0.46, yt, zc - 0.05), (x0 + 0.26, yt, zc - 0.05)], (0, 0, -1), 1.0, CHEV)
    # Facing east, on the west barrier, pointing north.
    xc = x_lane_w - BAR / 2
    oriented_box((DK, "board_frame", 0), xc, Y + 2.5, c + 0.2, 1.1, 0.8, 0.08, math.pi / 2, scale=1.0)
    for pz in (c - 0.2, c + 0.6):
        box((DK, "metal", 1), xc - 0.03, xc + 0.03, Y + 0.45, Y + 2.1, pz - 0.03, pz + 0.03, scale=0.5)
    for j in (0, 1):
        z0 = c + 0.2 + 0.42 - j * 0.4
        for yb, yt in ((Y + 2.22, Y + 2.5), (Y + 2.78, Y + 2.5)):
            face((DK, "glow", 0), [(xc + 0.05, yb, z0), (xc + 0.05, yb, z0 - 0.2), (xc + 0.05, yt, z0 - 0.46), (xc + 0.05, yt, z0 - 0.26)], (1, 0, 0), 1.0, CHEV)

# Roadworks on the north shoulder over the lane behind the west row: a
# hatch open in the shoulder, barriers and cones along the lane's edge, a
# work lamp on a stand, two of the crew (the site draws them).
def cone(x, z, y):
    box((DK, "dark", 1), x - 0.16, x + 0.16, y, y + 0.03, z - 0.16, z + 0.16, scale=0.5)
    cylinder((DK, "hazard", 0), x, z, y + 0.03, y + 0.5, 0.09, segs=5)


WK = -46.0
for dx in (-2.2, 0.2):
    P.place("barrier", WK + dx, Y, z_par + 0.86, 0.0, district=DK)
for dx in (-4.6, -3.6, 1.9, 2.9, 3.9):
    cone(WK + dx, z_par + 0.86 - abs(dx) * 0.06, Y)
patch("x", WK - 1.0, z_par + 0.42, 0.9, 0.6, "dark", lambda v: Y + 0.01)
box((DK, "metal", 1), WK - 0.3, WK + 0.5, Y, Y + 0.05, z_par + 0.08, z_par + 0.14, scale=0.5)
cylinder((DK, "metal", 1), WK + 1.1, z_par + 0.3, Y, Y + 1.9, 0.03, segs=4, cap=False)
box((DK, "glow", 0), WK + 0.9, WK + 1.3, Y + 1.9, Y + 2.15, z_par + 0.24, z_par + 0.36, scale=0.5, col=glowc("eceae4", 1.0))
pool(WK, Y + 1.9, z_par + 0.8, "white", 3.0, 1.5)
stand(WK - 1.0, z_par + 0.3, 0.0, "squat", Y)
stand(WK + 0.4, z_par + 0.3, 1.2, "idle", Y)

# ---------------------------------------------------------------------------
# ROUND 2. What the first blind review of the merged city named.
# ---------------------------------------------------------------------------
# The turn's board is a structure, not a slab: a catwalk with a handrail
# along the foot of its south face (over the street) on brackets from its
# posts, and service lamps on arms over the top of both faces.
TB_Y0, TB_Y1 = Y + 2.4, Y + 7.0
box((DK, "steel", 0), XW + 0.3, XE - 0.3, TB_Y0 - 0.2, TB_Y0 - 0.14, ZS + 0.44, ZS + 1.0, scale=0.5, col=STEEL_LT, bottom=True)
for yy, t in ((TB_Y0 + 0.85, 0.04), (TB_Y0 + 0.35, 0.03)):
    box((DK, "steel", 1), XW + 0.3, XE - 0.3, yy, yy + t, ZS + 0.96, ZS + 1.0, scale=0.5, col=STEEL_LT, bottom=True)
x = XW + 0.3
while x < XE - 0.2:
    box((DK, "steel", 1), x - 0.02, x + 0.02, TB_Y0 - 0.14, TB_Y0 + 0.85, ZS + 0.96, ZS + 1.0, scale=0.5, col=STEEL_LT)
    x += 1.88
for px in (XW + 1.6, XE - 1.6):
    pipe((DK, "steel", 0), (px, TB_Y0 - 0.2, ZS + 0.98), (px, Y + 0.9, ZS + 0.3), 0.045, segs=4, col=STEEL_LT)
    pipe((DK, "steel", 0), (px, TB_Y1, ZS + 0.2), (px, TB_Y1 + 0.5, ZS + 0.2), 0.05, segs=4, col=STEEL_LT)
for x in (-83.4, -81.1, -78.9, -76.6):
    for o in (-1, 1):
        zc = ZS + 0.2 + o * 0.2
        pipe((DK, "steel", 1), (x, TB_Y1, zc), (x, TB_Y1 + 0.3, zc + o * 0.75), 0.025, segs=4, col=STEEL_LT)
        box((DK, "glow", 0), x - 0.3, x + 0.3, TB_Y1 + 0.24, TB_Y1 + 0.29, zc + o * 0.7 - 0.07, zc + o * 0.7 + 0.07, scale=0.5, col=SERVICE, bottom=True)

# Under the turn's plate: a light panel in each quarter round the pier, so
# the cap beams are lit concrete and not a block of shadow.
for k, (dx, dz) in enumerate(((-2.6, -2.7), (2.6, -2.7), (2.6, 2.7), (-2.6, 2.7))):
    soffit_x(PIER[0] + dx, plan.DECK_UNDER, PIER[1] + dz, "amber" if k % 2 == 0 else "green", 3.4)

# On the way down, boards stand on the south rail facing the road and the
# walkway (more than 60 m from the avenue): a walker looking over the rail
# sees them before the wall of the plaza's block a metre beyond it.
rail_rng = random.Random(8610)
for x in (68.5, 91.0):
    cy = DY(x) + RAIL_H + 0.5 + 0.95
    for dx in (-1.3, 1.3):
        box((DK, "steel", 0), x + dx - 0.05, x + dx + 0.05, DY(x + dx) + RAIL_H, cy - 1.0, ZS - 0.07, ZS + 0.03, scale=0.5, col=STEEL_LT)
    B.billboard(DK, x, cy, z_rail - 0.01, 4.2, 1.7, math.pi, rail_rng, back=False, depth=0.24)

# The ramp's retaining walls carry what a wall under a road carries: the
# deck's drains down them between the pilasters, a main painted orange along
# their foot, a conduit over it with junction boxes.
for xw, o in ((XW + 0.15, -1), (XE - 0.15, 1)):
    for z in (-177.5, -172.5, -167.5, -162.5, -157.5, -152.5):
        top = RY(z) - DEPTH
        pipe((DK, "steel", 1), (xw + o * 0.08, 0.05, z), (xw + o * 0.08, top + 0.05, z), 0.06, segs=5, col=PIPE_C)
        pipe((DK, "steel", 1), (xw + o * 0.08, 0.12, z), (xw + o * 0.42, 0.04, z), 0.06, segs=5, col=PIPE_C)
    pipe((DK, "steel", 0), (xw + o * 0.11, 0.42, -176.0), (xw + o * 0.11, 0.42, EMB_Z - 0.2), 0.085, segs=6, col=GAS_C)
    pipe((DK, "steel", 1), (xw + o * 0.05, 1.05, -169.0), (xw + o * 0.05, 1.05, EMB_Z - 0.2), 0.03, segs=4, col=PIPE_C)
    for z in (-166.0, -158.5, -154.0):
        box((DK, "steel", 1), *sorted((xw, xw + o * 0.12)), 0.9, 1.25, z - 0.17, z + 0.17, scale=0.5, col=PIPE_C)
    for z in (-174.0, -164.0, -155.0):      # the main's flanges
        box((DK, "steel", 1), *sorted((xw, xw + o * 0.22)), 0.31, 0.53, z - 0.04, z + 0.04, scale=0.5, col=GAS_C)

# THE GIRDER OVER THE AVENUE. The span the hero sees is held (its dark south
# face, its flat underside, the teal strip, the white lights, the sora
# sign). Either side of it, behind the rows, the girder is a metre deeper:
# an edge beam down each face over the passages, the band's tiles along its
# inner face and the yellow paint at its foot, their light on the paving;
# signs hang from the soffit across each passage's mouth (more than 20 m
# from the avenue's line: the bake mirrors nothing further out).
DROP = 1.0
for a, b in ((-44.0, -HERO - 0.76), (HERO + 0.76, 44.0)):
    low = lambda x: DY(x) - DEPTH - DROP    # noqa: E731
    xs("concrete", 0, a, b, ZS - 0.5, ZS, low, under(DY), sides="bAB", caps="01", scale=2.0)
    xs("concrete", 0, a, b, ZN, ZN + 0.5, low, under(DY), sides="bAB", caps="01", scale=2.0)
    band("x", a + 0.2, b - 0.2, ZS - 0.5, (0, 0, -1), under(DY), lo=0.2, hi=0.8)
    band("x", a + 0.2, b - 0.2, ZN + 0.5, (0, 0, 1), under(DY), lo=0.2, hi=0.8)
    chipped("x", a + 0.2, b - 0.2, ZS - 0.5, (0, 0, -1), low, 0.0, 0.14)
    chipped("x", a + 0.2, b - 0.2, ZN + 0.5, (0, 0, 1), low, 0.0, 0.14)
    x = a + 4.0
    while x < b - 2.0:
        pool(x, DY(x) - DEPTH - 0.5, ZS - 1.3, "amber", 1.6)
        pool(x + 3.0, DY(x) - DEPTH - 0.5, ZN + 1.3, "yellow", 1.6)
        x += 6.0


def hung(x, facing, sizes=("bs", "pm", "bs")):
    """Signs hung across a passage from the soffit at x, a sign on both
    faces of each, the first toward `facing` (+1 east, -1 west)."""
    top = DY(x) - DEPTH
    yaw = facing * math.pi / 2
    for k, size in enumerate(sizes):
        w, h = ST_SIZES[size]
        zc = plan.DECK_Z + (k - (len(sizes) - 1) / 2) * 3.1
        cy = top - 0.75 - h / 2
        oriented_box((DK, "board_frame", 0), x, cy, zc, w + 0.14, h + 0.14, 0.18, yaw, scale=1.0)
        for f in (1, -1):
            sign(st_name(size), x + f * facing * 0.105, cy, zc, w, h, yaw if f > 0 else yaw + math.pi, district=DK, label=False)
        for dz in (-w * 0.35, w * 0.35):
            box((DK, "metal", 1), x - 0.025, x + 0.025, cy + h / 2, top, zc + dz - 0.025, zc + dz + 0.025, scale=0.5)


hung(-21.5, 1)
hung(21.5, -1)
hung(-42.0, -1, ("pm", "bs"))
hung(42.0, 1, ("bs", "pm"))

# Under the hero's span, light panels let into the soffit between the white
# lights, for whoever drives under it: each behind a lip on its south and
# north sides, so from the hero's low eye a hundred metres off (four
# degrees under the soffit) the lip hides the panel, and from the road
# below it shows.
for k, x in enumerate((-12.0, -4.0, 4.0, 12.0)):
    cz = plan.DECK_Z + (2.6 if k % 2 == 0 else -2.6)
    y = plan.DECK_UNDER
    face((DK, "glow", 0), [(x - 1.1, y - 0.02, cz - 0.3), (x + 1.1, y - 0.02, cz - 0.3), (x + 1.1, y - 0.02, cz + 0.3), (x - 1.1, y - 0.02, cz + 0.3)], (0, -1, 0), 1.0,
         SOFFIT["amber" if k % 2 == 0 else "green"])
    for o in (-1, 1):
        vface((DK, "dark", 0), "z", cz + o * 0.34, x - 1.2, x + 1.2, y - 0.09, y, o)
        vface((DK, "dark", 0), "z", cz + o * 0.34, x - 1.2, x + 1.2, y - 0.09, y, -o)

# ---------------------------------------------------------------------------
# THE PASSAGES under the deck either side of the avenue, after the show's
# plaza under its deck (Fn9gKhU_2_Q@74, @81): against each wall two large
# adverts in lit frames at eye level, a shutter and a door with their lamps,
# conduit, a main and risers over them, caged lamps between; down the
# middle, planters of shrubs, a camera mast, a standing advert; tape round
# a pier of each bent; a fenced yard with amber lamps on the fence's posts
# where the deck comes down (JtqIas3bYhg@64). Everything lit stands more
# than 20 m from the avenue's line.
# ---------------------------------------------------------------------------
@P.proto("deck_shrub", box=(0.8, 0.6, 0.8), reach=260)
def _deck_shrub(k):
    """A planter of shrubs: clipped pads of dark leaf over a low stone
    planter lit under its rim."""
    P.planter(k, 0.6, GLOW["teal"], stone=(0.42, 0.42, 0.44, 1))
    for cx, cy, cz, r, col in ((-0.28, 0.78, 0.2, 0.52, (0.07, 0.2, 0.09)), (0.3, 0.86, -0.18, 0.56, (0.05, 0.16, 0.08)),
                               (0.05, 1.05, 0.1, 0.46, (0.09, 0.24, 0.1)), (-0.2, 0.8, -0.34, 0.4, (0.06, 0.18, 0.12))):
        P.pad(k("plant"), cx, cy, cz, r, col)


pass_rng = random.Random(8630)
WALL_LAMP = glowc("ffb254", 0.9)


def wall_ad(x, wz, f, w=3.0, h=1.9):
    """A large advert at eye level against the wall at wz (f: +1 the wall
    faces south, -1 north): the advert in a lit frame on two feet, a strip
    of light under it."""
    cy = B.G0 + 0.75 + h / 2
    B.billboard(DK, x, cy, wz + f * 0.22, w, h, 0.0 if f > 0 else math.pi, pass_rng, back=False, depth=0.18)
    for dx in (-w / 2 + 0.3, w / 2 - 0.3):
        box((DK, "steel", 0), x + dx - 0.07, x + dx + 0.07, B.G0, cy - h / 2 - 0.2, *sorted((wz + f * 0.04, wz + f * 0.18)), scale=0.5, col=STEEL_LT)
    box((DK, "glow", 1), x - w / 2, x + w / 2, cy - h / 2 - 0.3, cy - h / 2 - 0.25, *sorted((wz + f * 0.12, wz + f * 0.2)), scale=0.5, col=glowc("eceae4", 0.7))
    pipe((DK, "steel", 1), (x + w / 2 - 0.3, cy + h / 2 + 0.2, wz + f * 0.06), (x + w / 2 - 0.3, 3.3, wz + f * 0.06), 0.025, segs=4, col=PIPE_C)


def shutter(x, wz, f, w=2.6, h=2.5):
    """A roller shutter in the wall: its ribbed curtain down, steel guides
    and a hood, a striped sill, a caged lamp over it and its pool."""
    vface((DK, "door_panel", 0), "z", wz + f * 0.03, x - w / 2, x + w / 2, B.G0, B.G0 + h, f)
    for dx in (-w / 2 - 0.06, w / 2 + 0.06):
        box((DK, "steel", 1), x + dx - 0.06, x + dx + 0.06, B.G0, B.G0 + h + 0.1, *sorted((wz, wz + f * 0.08)), scale=0.5, col=PIPE_C)
    box((DK, "steel", 0), x - w / 2 - 0.12, x + w / 2 + 0.12, B.G0 + h, B.G0 + h + 0.28, *sorted((wz, wz + f * 0.16)), scale=0.5, col=PIPE_C)
    vface((DK, "hazard", 1), "z", wz + f * 0.034, x - w / 2, x + w / 2, B.G0, B.G0 + 0.28, f)
    wall_lamp(x, B.G0 + h + 0.42, wz, f)


def wall_door(x, wz, f, hue="white"):
    vface((DK, "door", 0), "z", wz + f * 0.03, x - 0.5, x + 0.5, B.G0, B.G0 + 2.1, f)
    box((DK, "steel", 1), x - 0.6, x + 0.6, B.G0 + 2.1, B.G0 + 2.2, *sorted((wz, wz + f * 0.1)), scale=0.5, col=PIPE_C)
    box((DK, "glow", 0), x - 0.18, x + 0.18, B.G0 + 2.3, B.G0 + 2.42, *sorted((wz + f * 0.02, wz + f * 0.13)), scale=0.5, col=glowc(NEON[hue], 0.85))
    light(DK, x, 2.3, wz + f * 0.8, hue, 2.2)


def wall_lamp(x, y, wz, f):
    """A caged bulkhead lamp on the wall, and its pool."""
    box((DK, "steel", 1), x - 0.2, x + 0.2, y - 0.02, y + 0.16, *sorted((wz, wz + f * 0.06)), scale=0.5, col=PIPE_C)
    box((DK, "glow", 0), x - 0.15, x + 0.15, y, y + 0.12, *sorted((wz + f * 0.06, wz + f * 0.15)), scale=0.5, col=WALL_LAMP)
    if abs(x) >= 20.0:
        light(DK, x, y, wz + f * 0.9, "amber", 2.6)


def camera_mast(x, z):
    """A camera mast (Fn9gKhU_2_Q@74): a post, a ring of light, a cross
    arm with three cameras, a cabinet at its foot."""
    cylinder((DK, "steel", 0), x, z, B.G0, B.G0 + 4.5, 0.075, segs=6, cap=False, col=STEEL_LT)
    box((DK, "steel", 0), x - 0.2, x + 0.2, B.G0, B.G0 + 1.0, z - 0.14, z + 0.14, scale=0.5, col=PIPE_C)
    cylinder((DK, "glow", 0), x, z, B.G0 + 2.7, B.G0 + 2.8, 0.13, segs=6, cap=False, col=glowc("27dcf2", 0.9))
    box((DK, "steel", 0), x - 0.7, x + 0.7, B.G0 + 4.3, B.G0 + 4.36, z - 0.03, z + 0.03, scale=0.5, col=STEEL_LT)
    for dx, yaw in ((-0.7, -2.2), (0.7, 2.0), (0.0, 0.3)):
        cx, cz = x + dx + math.sin(yaw) * 0.16, z + math.cos(yaw) * 0.16
        oriented_box((DK, "steel", 0), cx, B.G0 + 4.2, cz, 0.15, 0.15, 0.42, yaw, scale=0.5, col=PIPE_C)
        oriented_box((DK, "glow", 1), cx + math.sin(yaw) * 0.215, B.G0 + 4.2, cz + math.cos(yaw) * 0.215, 0.05, 0.05, 0.02, yaw, scale=0.5, col=glowc("ff003c", 1.0))
    light(DK, x, 2.7, z, "cyan", 1.6)
    B.COLLISION.append(("box", x - 0.2, x + 0.2, 0.0, 4.5, z - 0.2, z + 0.2, DK))


def taped(cx, cz, h=1.25):
    """Tape strung round a pier's footing on four stakes."""
    q = [(cx - h, cz - h), (cx + h, cz - h), (cx + h, cz + h), (cx - h, cz + h)]
    for (xa, za), (xb, zb) in zip(q, q[1:] + q[:1]):
        cylinder((DK, "hazard", 1), xa, za, B.G0, B.G0 + 1.1, 0.03, segs=4, cap=False)
        for out in (1, -1):
            n = ((zb - za) * out, 0, -(xb - xa) * out)
            face((DK, "hazard", 1), [(xa, B.G0 + 0.94, za), (xb, B.G0 + 0.94, zb), (xb, B.G0 + 1.03, zb), (xa, B.G0 + 1.03, za)], n, 1.0)


for s in (-1, 1):
    for wz, f, ads, shut, door in ((WN, 1, (21.2, 36.5), 17.6, 28.5), (WS, -1, (22.6, 34.6), 39.5, 31.2)):
        for ax in ads:
            wall_ad(s * ax, wz, f)
        shutter(s * shut, wz, f)
        wall_door(s * door, wz, f, "white" if f > 0 else "amber")
        # Conduit and a main along the wall over the frames, risers, lamps.
        zc = wz + f * 0.05
        pipe((DK, "steel", 1), (s * 16.4, 3.3, zc), (s * 43.6, 3.3, zc), 0.03, segs=4, col=PIPE_C)
        pipe((DK, "steel", 1), (s * 16.4, 3.45, zc), (s * 43.6, 3.45, zc), 0.03, segs=4, col=PIPE_C)
        pipe((DK, "steel", 0), (s * 16.4, 4.1, wz + f * 0.13), (s * 43.6, 4.1, wz + f * 0.13), 0.1, segs=6, col=GAS_C if f > 0 else PIPE_C)
        for rx in (19.25, 38.6, 43.7) if f > 0 else (20.3, 32.35, 43.7):
            pipe((DK, "steel", 1), (s * rx, B.G0, wz + f * 0.09), (s * rx, 4.1, wz + f * 0.09), 0.06, segs=5, col=PIPE_C)
            box((DK, "steel", 1), s * rx - 0.09, s * rx + 0.09, 1.3, 1.36, *sorted((wz, wz + f * 0.16)), scale=0.5, col=PIPE_C)
        for lx in (23.4, 34.0, 40.2) if f > 0 else (25.3, 37.0, 42.0):
            wall_lamp(s * lx, 3.0, wz, f)
    # Down the middle: planters of shrubs, the camera mast, a standing
    # advert toward the lane; a charging post by the bench; pallets and a
    # barrel by the shutters, a heap against the wall by the skip.
    P.place("deck_shrub", s * 31.4, B.G0, plan.DECK_Z + 0.3, district=DK)
    P.place("deck_shrub", s * 37.0, B.G0, plan.DECK_Z, district=DK)
    camera_mast(s * 25.3, plan.DECK_Z - 0.9)
    P.place("lightbox", s * 40.6, B.G0, plan.DECK_Z, math.pi / 2, district=DK)
    P.place("charge_post", s * 35.4, B.G0, plan.DECK_Z + 0.4, -s * math.pi / 2, district=DK)
    P.place("pallets", s * 38.6, B.G0, WS - 0.8, 0.2, district=DK)
    P.place("barrel", s * 41.5, B.G0, WS - 0.5, district=DK)
    P.place("pallets", s * 16.8, B.G0, WN + 0.75, -0.15, district=DK)
    P.place("rubbish", s * 43.2, B.G0, WN + 0.75, 0.0, district=DK)
    # Tape round one pier of each bent (the other has somebody on it).
    taped(s * 38.0, ZS - 2.0)
    taped(s * HERO, ZN + 2.0 if s > 0 else ZS - 2.0)
# A lit grate under each plume of steam in the passages.
P.place("grate_glow", -35.5, B.G0, plan.DECK_Z - 1.2, district=DK)
P.place("grate_glow", 41.0, B.G0, plan.DECK_Z + 1.6, district=DK)
# The plaza's yard under the deck coming down: a mesh fence across its
# mouth, an amber lamp on every post.
for k in range(5):
    zf = ZN + 0.4 + k * 2.3
    cylinder((DK, "steel", 0), 52.5, zf, B.G0, B.G0 + 2.5, 0.04, segs=5, cap=False, col=STEEL_LT)
    box((DK, "glow", 0), 52.42, 52.58, B.G0 + 2.5, B.G0 + 2.62, zf - 0.08, zf + 0.08, scale=0.5, col=WALL_LAMP)
    light(DK, 52.5, 2.5, zf, "amber", 1.8)
    if k < 4 and k != 2:        # the gate's panel stands open
        P.place("fence_mesh", 52.5, B.G0, zf + 1.15, math.pi / 2, district=DK)
P.place("fence_mesh", 53.5, B.G0, ZN + 0.4 + 2 * 2.3 + 0.2, 0.35, district=DK)

# ---------------------------------------------------------------------------
# LOOKOUTS. Bays hung outside the walkway's rail on brackets, where there is
# open air beside the deck (the west street at the turn and along the ramp,
# the lane behind the avenue's west row): a steel floor, a rail on three
# sides with a line of light under it, a yellow gate in the walkway's rail.
# Whoever stops on the deck stands here, at the outer rail, 1.4 m or more
# from the walk-through's line.
# ---------------------------------------------------------------------------
BAY = 1.8
BAY_FLOOR = (0.1, 0.11, 0.12, 1.0)


def bay(axis, a, b, yf):
    """A lookout from a to b along the run ("x": off the deck's south edge,
    "z": off the ramp's west edge). Returns its floor's height."""
    mid = (a + b) / 2
    y = yf(mid) + WALK_UP
    if axis == "x":
        x0, x1, z0, z1 = a, b, ZS, ZS + BAY
        runs = (((x0, z1), (x1, z1)), ((x0, z0), (x0, z1)), ((x1, z0), (x1, z1)))
    else:
        x0, x1, z0, z1 = XW - BAY, XW, a, b
        runs = (((x0, z0), (x0, z1)), ((x0, z0), (x1, z0)), ((x0, z1), (x1, z1)))
    box((DK, "steel", 0), x0, x1, y - 0.14, y, z0, z1, scale=0.5, col=BAY_FLOOR, bottom=True)
    for k, ((xa, za), (xb, zb)) in enumerate(runs):
        for yy, t, det in ((y + 1.04, 0.07, 0), (y + 0.56, 0.035, 1), (y + 0.1, 0.035, 1)):
            box((DK, "steel", det), min(xa, xb) - t / 2, max(xa, xb) + t / 2, yy, yy + t, min(za, zb) - t / 2, max(za, zb) + t / 2, scale=0.5, col=STEEL_LT, bottom=True)
        m = max(1, round(math.hypot(xb - xa, zb - za) / 1.1))
        for j in range(m + 1):
            px, pz = xa + (xb - xa) * j / m, za + (zb - za) * j / m
            box((DK, "steel", 1), px - 0.03, px + 0.03, y, y + 1.04, pz - 0.03, pz + 0.03, scale=0.5, col=STEEL_LT)
        if k == 0:      # the line of light under the outer rail
            box((DK, "glow", 0), min(xa, xb), max(xa, xb) + 0.02, y + 1.0, y + 1.035, min(za, zb), max(za, zb) + 0.02, scale=0.5, col=EDGE_TEAL, bottom=True)
    for t in (0.15, 0.85):
        v = a + (b - a) * t
        if axis == "x":
            pipe((DK, "steel", 0), (v, y - 0.14, z1 - 0.1), (v, y - 1.3, ZS + 0.02), 0.045, segs=4, col=STEEL_LT)
            pipe((DK, "steel", 1), (v, y - 0.14, z0 + 0.9), (v, y - 0.72, ZS + 0.02), 0.03, segs=4, col=STEEL_LT)
        else:
            pipe((DK, "steel", 0), (x0 + 0.1, y - 0.14, v), (XW - 0.02, y - 1.3, v), 0.045, segs=4, col=STEEL_LT)
            pipe((DK, "steel", 1), (x1 - 0.9, y - 0.14, v), (XW - 0.02, y - 0.72, v), 0.03, segs=4, col=STEEL_LT)
    # The gate: a yellow leaf in the walkway's rail, both faces.
    if axis == "x":
        vface((DK, "hazard", 1), "z", ZS + 0.012, mid - 0.5, mid + 0.5, y, yf(mid) + RAIL_H - 0.04, 1)
        vface((DK, "hazard", 1), "z", z_rail - 0.012, mid - 0.5, mid + 0.5, y, yf(mid) + RAIL_H - 0.04, -1)
        pool(mid, y + 1.0, ZS + BAY / 2, "teal", 1.6)
    else:
        vface((DK, "hazard", 1), "x", XW - 0.012, mid - 0.5, mid + 0.5, y, yf(mid) + RAIL_H - 0.04, -1)
        vface((DK, "hazard", 1), "x", x_rail + 0.012, mid - 0.5, mid + 0.5, y, yf(mid) + RAIL_H - 0.04, 1)
        pool(XW - BAY / 2, y + 1.0, mid, "teal", 1.6)
    return y


# At the turn's outer corner, under the board, over the west street.
y = bay("x", XW + 0.6, XE - 0.6, DY)
for x, dz, yaw, pose in ((-83.0, 1.35, 0.0, "idle"), (-82.1, 1.3, 0.25, "phone"), (-80.4, 1.1, math.pi / 2, "talk"), (-79.5, 1.1, -math.pi / 2, "talk"),
                         (-78.0, 1.45, math.pi, "lean"), (-77.0, 1.3, -0.2, "smoke")):
    stand(x, ZS + dz, yaw, pose, y)
# Over the lane behind the avenue's west row.
y = bay("x", -49.4, -44.6, DY)
for x, dz, yaw, pose in ((-48.5, 1.45, math.pi, "lean"), (-47.2, 1.3, 0.1, "smoke"), (-45.6, 1.3, -0.15, "idle")):
    stand(x, ZS + dz, yaw, pose, y)
# Along the ramp, over the west service lane, between the boards on its rail.
for zc, crew in ((-134.0, (("lean", 0.9, math.pi / 2), ("phone", -0.7, -math.pi / 2 - 0.2))),
                 (-117.5, (("talk", -0.45, 0.0), ("talk", 0.45, math.pi))),
                 (-100.5, (("idle", 0.8, -math.pi / 2), ("smoke", -0.6, -math.pi / 2 + 0.3)))):
    y = bay("z", zc - 1.6, zc + 1.6, RY)
    for pose, dz, yaw in crew:
        stand(XW - (1.5 if pose == "lean" else 1.25), zc + dz, yaw, pose, y)
