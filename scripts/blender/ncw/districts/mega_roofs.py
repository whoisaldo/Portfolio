"""The megabuilding's roofs, and what lies behind it.

From a flying car a megabuilding's roof is a place: a landing pad with its
markings and lights, cooling plant and ducts, tanks, dishes, masts, stair
huts with their doors lit, a rail round the light well's mouth, shacks and
washing where people live up there, the edges drawn in light. The hero's
lens looks along these roofs from 755 m, a little under them: each piece is
only set down where `kit.hero_sees` says the lens cannot see it over the
block's own front edge, so the block's outline against the sky stays the
plate's.

Behind the block: a service lane (z -800..-790) to a lit wall where the far
city takes over, the links that land the bridge to the tower, and the yard
east of the east wing with its transformers and pylons.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403

SKIPPED = []


def ok(x0, x1, z0, z1, y0, y1):
    """Whether the hero cannot see a box standing on a roof."""
    seen = hero_sees((x0, y0, z0), (x1, y1, z1))
    if seen:
        SKIPPED.append((round(x0), round(z0), round(y1 - y0, 1)))
    return not seen


def unit(x0, x1, z0, z1, top, h, mat="metal", lid=True):
    """A piece of plant: a sheet-metal box, a dark lid."""
    if not ok(x0, x1, z0, z1, top, top + h + 0.15):
        return False
    box((D, mat, 0), x0, x1, top, top + h, z0, z1, scale=1.0)
    if lid:
        box((D, "dark", 1), x0 - 0.1, x1 + 0.1, top + h, top + h + 0.12, z0 - 0.1, z1 + 0.1, scale=1.0)
    return True


def tower(x, z, top, r=1.6, h=3.0):
    """A cooling tower: a drum on a skirt, its fan a dark disc."""
    if not ok(x - r, x + r, z - r, z + r, top, top + h + 0.3):
        return
    cylinder((D, "metal", 0), x, z, top, top + h, r, segs=10)
    cylinder((D, "dark", 1), x, z, top + h, top + h + 0.2, r * 0.8, segs=10)


def hut(x, z, top, yaw_door=0.0, hue="amber", w=1.7, d=1.5, h=2.7):
    """A stair hut, its door lit."""
    if not ok(x - w, x + w, z - d, z + d, top, top + h + 0.15):
        return
    tbox(x - w, x + w, top, top + h, z - d, z + d, CONC, scale=1.5)
    box((D, "dark", 1), x - w - 0.1, x + w + 0.1, top + h, top + h + 0.12, z - d - 0.1, z + d + 0.1, scale=1.0)
    nx, nz = math.sin(yaw_door), math.cos(yaw_door)
    rotated_quad((D, "glow", 0), x + nx * (w + 0.02), top + 1.0, z + nz * (d + 0.02), 0.9, 2.0, yaw_door, col=GLOW[hue])


def prop(name, x, z, top, yaw=0.0, sy=1.0, h=1.0, r=0.8):
    if ok(x - r, x + r, z - r, z + r, top, top + h):
        P.place(name, x, top, z, yaw, sy=sy)


def edge(x0, x1, z0, z1, top, sides, rim=None, h=0.95, piece=6.0):
    """Parapets on the sides named, in pieces, each only where the hero
    cannot see it."""
    for name in sides:
        a0, a1 = (x0, x1) if name in ("+z", "-z") else (z0, z1)
        n = max(1, round((a1 - a0) / piece))
        for i in range(n):
            pa, pb = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
            if name in ("+z", "-z"):
                zz = z1 if name == "+z" else z0
                if ok(pa, pb, min(zz, zz + 0.3) if name == "-z" else zz - 0.3, max(zz, zz + 0.3) if name == "-z" else zz, top, top + h):
                    parapet(pa, pb, z0, z1, top, sides=(name,), rim=rim, h=h)
            else:
                xx = x1 if name == "+x" else x0
                if ok(xx - 0.3 if name == "+x" else xx, xx if name == "+x" else xx + 0.3, pa, pb, top, top + h):
                    parapet(x0, x1, pa, pb, top, sides=(name,), rim=rim, h=h)


def flat_strokes(lines, y, col, w=0.35):
    """Paint on a roof: straight lines ((x0, z0), (x1, z1)), each a strip."""
    for (a, b) in lines:
        dx, dz = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dz)
        px, pz = -dz / length * w / 2, dx / length * w / 2
        pts = [(a[0] - px, y, a[1] - pz), (b[0] - px, y, b[1] - pz), (b[0] + px, y, b[1] + pz), (a[0] + px, y, a[1] + pz)]
        # Wound to face up whichever way the line runs.
        n = (pts[1][2] - pts[0][2]) * (pts[2][0] - pts[0][0]) - (pts[1][0] - pts[0][0]) * (pts[2][2] - pts[0][2])
        if n < 0:
            pts.reverse()
        quad((D, "trim", 0), *pts, col=col)


def pad(cx, cz, top, half=8.0, name="H"):
    """A landing pad: a raised deck, its border and its letter painted, lights
    round its edge, a beacon at each corner."""
    y = top + 0.5
    if not ok(cx - half, cx + half, cz - half, cz + half, top, y + 0.35):
        return
    tbox(cx - half, cx + half, top, y, cz - half, cz + half, STEEL, scale=2.0)
    e = half - 0.5
    flat_strokes([((cx - e, cz - e), (cx + e, cz - e)), ((cx + e, cz - e), (cx + e, cz + e)), ((cx + e, cz + e), (cx - e, cz + e)),
                  ((cx - e, cz + e), (cx - e, cz - e))], y + 0.012, YEL, w=0.4)
    g = half * 0.42
    ring = [(cx + math.cos(i * math.tau / 16) * g * 1.25, cz + math.sin(i * math.tau / 16) * g * 1.25) for i in range(16)]
    flat_strokes(list(zip(ring, ring[1:] + ring[:1])), y + 0.012, PALE, w=0.3)
    flat_strokes([((cx - g * 0.55, cz - g * 0.7), (cx - g * 0.55, cz + g * 0.7)), ((cx + g * 0.55, cz - g * 0.7), (cx + g * 0.55, cz + g * 0.7)),
                  ((cx - g * 0.55, cz), (cx + g * 0.55, cz))], y + 0.014, YEL, w=0.5)
    n = 6
    for i in range(n):
        for (px, pz) in ((cx - half + (i + 0.5) * 2 * half / n, cz - half), (cx - half + (i + 0.5) * 2 * half / n, cz + half),
                         (cx - half, cz - half + (i + 0.5) * 2 * half / n), (cx + half, cz - half + (i + 0.5) * 2 * half / n)):
            box((D, "glow", 1), px - 0.12, px + 0.12, y, y + 0.1, pz - 0.12, pz + 0.12, scale=0.5, col=GLOW["green"])
    for sx in (-1, 1):
        for sz in (-1, 1):
            box((D, "glow", 0), cx + sx * half - 0.15, cx + sx * half + 0.15, y, y + 0.3, cz + sz * half - 0.15, cz + sz * half + 0.15, scale=0.5, col=GLOW["red"])
    # Steps down to the roof on one side.
    stairs("x", cz - 1.0, cz + 1.0, cx - half - 1.2, cx - half, top, y, steps=3, key=(D, "metal", 1))


def shack(x, z, top, w=2.6, d=2.2, h=2.3, colour="amber", yaw=0.0, r=None):
    """Where somebody lives on the roof: a box of sheet and board with a lit
    window, a cloth out over its door."""
    if not ok(x - w / 2 - 1.2, x + w / 2 + 1.2, z - d / 2 - 1.2, z + d / 2 + 1.2, top, top + h + 0.4):
        return
    oriented_box((D, "trim", 0), x, top + h / 2, z, w, h, d, yaw, col=RUST if (r and r.random() < 0.5) else TEAL_PAINT)
    nx, nz = math.sin(yaw), math.cos(yaw)
    rotated_quad((D, "glow", 0), x + nx * (d / 2 + 0.02) + math.cos(yaw) * 0.5, top + 1.3, z + nz * (d / 2 + 0.02) - math.sin(yaw) * 0.5, 0.9, 0.8, yaw,
                 col=dim(GLOW[colour], 0.5))
    a = (x + math.cos(yaw) * -w / 2, z - math.sin(yaw) * -w / 2)
    b = (x + math.cos(yaw) * w / 2, z - math.sin(yaw) * w / 2)
    cloth((a[0] + nx * d / 2, top + h, a[1] + nz * d / 2), (b[0] + nx * d / 2, top + h, b[1] + nz * d / 2),
          (b[0] + nx * (d / 2 + 1.5), top + h - 0.5, b[1] + nz * (d / 2 + 1.5)), (a[0] + nx * (d / 2 + 1.5), top + h - 0.5, a[1] + nz * (d / 2 + 1.5)),
          "pink" if colour == "amber" else "amber")
    stand(x + nx * (d / 2 + 0.9), z + nz * (d / 2 + 0.9), yaw, "sit" if (r and r.random() < 0.5) else "idle", top)


def run_duct(pts, top, w=0.9, h=0.7):
    """Ducting across a roof, along a line of (x, z) points (axis-aligned legs)."""
    for (a, b) in zip(pts, pts[1:]):
        x0, x1 = min(a[0], b[0]) - w / 2, max(a[0], b[0]) + w / 2
        z0, z1 = min(a[1], b[1]) - w / 2, max(a[1], b[1]) + w / 2
        if ok(x0, x1, z0, z1, top, top + h + 0.3):
            box((D, "metal", 1), x0, x1, top + 0.3, top + 0.3 + h, z0, z1, scale=1.0, bottom=True)


_r = random.Random(8501)
(WX0, WX1, WT, _), (MX0, MX1, MT, _), (EX0_, EX1_, ET, _) = MB_SECTIONS
wx0, wx1, wz0, wz1 = WELL

# ---------------------------------------------------------------------------
# East roof (83 m): the landing pad.
# ---------------------------------------------------------------------------
pad(33.0, -776.0, ET, half=8.0)
edge(EX0_, EX1_, MB_ZB, MB_ZF, ET, ("-z", "+x"), rim="amber")
run_duct([(45.6, -787.0), (45.6, -752.0)], ET)
run_duct([(20.6, -787.6), (44.0, -787.6)], ET, w=0.8, h=0.6)
hut(27.0, -761.6, ET, yaw_door=math.pi / 2, hue="amber")
tower(44.6, -757.0, ET, r=1.5, h=2.4)
tower(44.6, -761.0, ET, r=1.5, h=2.4)
for x in (20.4, 22.4, 24.4):
    prop("ac_roof", x, -786.4, ET, h=1.0)
prop("tank_roof", 29.0, -787.0, ET, 0.4, h=4.4, r=1.5)
prop("dish", 43.4, -786.0, ET, 2.0, h=2.2)
prop("antenna", 46.6, -788.6, ET, 0.3, sy=0.7, h=4.4, r=0.7)
# A mast with a windsock's lamp by the pad, short enough to stay under the lens' line.
if ok(42.6, 43.0, -766.2, -765.8, ET, ET + 2.2):
    cylinder((D, "metal", 1), 42.8, -766.0, ET, ET + 2.0, 0.05, segs=4, cap=False)
    box((D, "glow", 0), 42.7, 42.9, ET + 2.0, ET + 2.2, -766.1, -765.9, scale=0.5, col=GLOW["amber"])
for (x, z, yaw, pose) in ((24.2, -771.0, math.pi / 2, "idle"), (24.0, -779.6, math.pi / 2, "phone"), (46.9, -770.0, math.pi / 2, "idle"),
                          (36.0, -788.9, math.pi, "smoke"), (30.2, -765.2, 0.0, "talk"), (31.2, -765.0, math.pi, "talk")):
    stand(x, z, yaw, pose, ET)

# ---------------------------------------------------------------------------
# Middle roof (89 m): round the well's mouth.
# ---------------------------------------------------------------------------
if ok(wx0, wx1, wz1, wz1 + 0.1, MT, MT + 1.1):
    for (a, b) in (((wx0 - 0.15, wz1 + 0.15), (wx1 + 0.15, wz1 + 0.15)), ((wx1 + 0.15, wz1 + 0.15), (wx1 + 0.15, wz0 - 0.15)),
                   ((wx1 + 0.15, wz0 - 0.15), (wx0 - 0.15, wz0 - 0.15)), ((wx0 - 0.15, wz0 - 0.15), (wx0 - 0.15, wz1 + 0.15))):
        steel_rail(a, b, MT, posts=3.0)
edge(MX0, MX1, MB_ZB, MB_ZF - MB_REC, MT, ("-z", "+x"), rim="pink")
for x in (-15.0, -12.6, 12.6, 15.0):
    for z in (-778.0, -772.0, -766.0):
        prop("ac_roof", x, z, MT, h=1.0)
unit(10.6, 16.4, -787.6, -784.6, MT, 1.6)
unit(-11.6, -9.6, -788.6, -784.6, MT, 2.0)
hut(-14.0, -786.6, MT, yaw_door=0.0, hue="amber", h=2.6)
prop("dish", 10.0, -787.0, MT, 4.0, h=2.2)
for (x, z, yaw, pose) in ((-4.0, wz1 + 0.8, math.pi, "idle"), (3.2, wz1 + 0.8, math.pi, "phone"), (wx1 + 0.8, -772.0, -math.pi / 2, "idle"),
                          (wx0 - 0.8, -776.4, math.pi / 2, "smoke"), (0.6, wz0 - 0.8, 0.0, "idle")):
    stand(x, z, yaw, pose, MT)

# ---------------------------------------------------------------------------
# West roof (95 m): plant round the core's own, tanks along the back, a
# sign turned to the north, where people have moved in.
# ---------------------------------------------------------------------------
edge(WX0, WX1, MB_ZB, MB_ZF, WT, ("-z", "-x"), rim="cyan")
run_duct([(-46.0, -787.0), (-46.0, -756.0)], WT)
run_duct([(-46.0, -776.0), (-40.6, -776.0)], WT, w=0.8, h=0.6)
for x in (-44.0, -38.4, -22.4):
    prop("tank_roof", x, -786.8, WT, _r.uniform(0, 6.28), h=4.4, r=1.5)
tower(-23.0, -779.6, WT, r=1.6, h=2.6)
tower(-23.0, -775.4, WT, r=1.6, h=2.6)
hut(-33.0, -787.4, WT, yaw_door=0.0, hue="amber", h=2.6)
prop("dish", -28.4, -787.2, WT, 3.4, h=2.2)
prop("dish", -20.6, -787.6, WT, 2.2, h=2.2)
for z in (-768.0, -765.4):
    prop("ac_roof", -44.0, z, WT, h=1.0)
    prop("ac_roof", -41.8, z, WT, h=1.0)
shack(-36.4, -764.6, WT, yaw=math.pi, r=_r)
shack(-30.6, -765.2, WT, colour="pink", yaw=math.pi + 0.3, r=_r)
shack(-25.6, -767.4, WT, colour="cyan", yaw=math.pi - 0.4, r=_r)
# A roof sign at the back edge, to the north: tubes on a frame.
if ok(-44.0, -32.0, -789.6, -789.0, WT, WT + 4.6):
    oriented_box((D, "board_frame", 0), -38.0, WT + 2.9, -789.3, 11.0, 2.8, 0.25, math.pi, scale=1.0)
    for dx in (-4.6, 4.6):
        box((D, "metal", 1), -38.0 + dx - 0.1, -38.0 + dx + 0.1, WT, WT + 1.5, -789.4, -789.2, scale=0.5)
    strokes((D, "glow", 0), "H4", -38.0, WT + 2.9, -789.44, 1.9, math.pi, GLOW["pink"], weight=0.16)
for (x, z, yaw, pose) in ((-47.0, -770.0, -math.pi / 2, "idle"), (-47.0, -760.4, -math.pi / 2, "phone"), (-34.0, -789.0, math.pi, "idle"),
                          (-28.0, -769.0, 0.4, "talk"), (-27.2, -768.2, 3.6, "talk")):
    stand(x, z, yaw, pose, WT)

# ---------------------------------------------------------------------------
# The bridge to the tower (mega.py, at 58..64 m) lands at both ends: a link
# off the block's back corner, another onto the tower's face.
# ---------------------------------------------------------------------------
tbox(-52.0, -40.0, 58.0, 64.0, -800.0, MB_ZB, BLUEGREY, bottom=True)
tbox(-74.0, -62.0, 58.0, 64.0, -816.0, -812.0, BLUEGREY, bottom=True)
rotated_quad((D, "glow", 0), -43.0, 61.4, -800.03, 5.0, 1.6, math.pi, col=dim(GLOW["white"], 0.2))
rotated_quad((D, "glow", 0), -68.0, 61.4, -811.97, 11.0, 1.6, 0.0, col=dim(GLOW["white"], 0.2))
rotated_quad((D, "glow", 0), -39.97, 61.4, -795.0, 8.0, 1.6, math.pi / 2, col=dim(GLOW["white"], 0.2))
# The lift core that carries the link, standing in the lane.
tbox(-52.0, -45.0, 0.0, 58.0, -797.0, MB_ZB, BLUEGREY)
box((D, "glow", 1), -48.75, -48.25, 5.0, 56.0, -797.03, -797.0, scale=1.0, col=dim(GLOW["white"], 0.22))
box((D, "neon_purple", 0), -52.06, -52.0, 8.0, 54.0, -794.0, -793.7, scale=1.0)

# ---------------------------------------------------------------------------
# The service lane behind the block (z -800..-790) and the wall where the
# far city takes over: lamps along it, gates, pipes, skips, containers.
# ---------------------------------------------------------------------------
LX0, LX1, LZ = -94.0, 132.0, -800.0
B.ground_rect(D, LX0, LX1, LZ, MB_ZB)
WALL_Z = LZ + 0.4
cbox(LX0, LX1, 0.0, 3.4, LZ, WALL_Z)
tbox(LX0, LX1, 3.4, 3.55, LZ - 0.08, WALL_Z + 0.08, BLACK)
rpipe((LX0 + 1.0, 2.6, WALL_Z + 0.2), (LX1 - 1.0, 2.6, WALL_Z + 0.2), 0.12)
rpipe((LX0 + 1.0, 2.2, WALL_Z + 0.16), (60.0, 2.2, WALL_Z + 0.16), 0.07, col=STEEL)
_x = LX0 + 5.0
_i = 0
while _x < LX1 - 3.0:
    hue = ("amber", "amber", "white", "cyan")[_i % 4]
    wall_lamp(_x, 3.0, WALL_Z, 0, 1, hue, 3.0)
    _x += 11.0 + (_i % 3) * 1.5
    _i += 1
for gx in (-70.0, -20.0, 30.0, 96.0):
    quad((D, "door_panel", 0), (gx - 2.2, G0, WALL_Z + 0.02), (gx + 2.2, G0, WALL_Z + 0.02), (gx + 2.2, 3.0, WALL_Z + 0.02), (gx - 2.2, 3.0, WALL_Z + 0.02))
    tbox(gx - 2.4, gx + 2.4, 3.0, 3.3, WALL_Z, WALL_Z + 0.1, YEL_OLD, detail=1)
CONTAINER = (RUST, TEAL_PAINT, YEL_OLD, BLUEGREY, RED_PAINT)
for (x, z, n, yaw) in ((-84.0, -796.4, 2, 0.0), (-40.0, -796.8, 1, 0.0), (8.0, -796.6, 2, 0.0), (52.0, -796.6, 1, 0.0), (78.0, -796.8, 2, 0.0)):
    for j in range(n):
        tbox(x - 3.05, x + 3.05, G0 + j * 2.6, G0 + 2.6 + j * 2.6, z - 1.22, z + 1.22, _r.choice(CONTAINER), scale=1.2)
for (x, name, yaw) in ((-60.0, "dumpster", 0.0), (-58.0, "bags", 0.3), (-8.0, "crates", 0.0), (24.0, "drum", 0.0), (24.8, "drum", 0.0), (66.0, "dumpster", 0.0),
                       (88.0, "crates", 0.4), (-76.0, "bags", 0.0)):
    P.place(name, x, G0, WALL_Z + 1.2, yaw)
for (x, z, yaw, pose) in ((-62.0, -794.0, 0.6, "smoke"), (10.6, -793.0, math.pi, "squat"), (64.0, -794.4, 2.0, "phone"), (-22.0, -797.6, 0.0, "lean")):
    stand(x, z, yaw, pose, G0)

# ---------------------------------------------------------------------------
# The yard east of the east wing (x 104..132, z -790..-700): the block's
# substation. Transformers in a fenced compound, two pylons, tanks.
# ---------------------------------------------------------------------------
YX0, YX1, YZ0, YZ1 = 104.0, 132.0, MB_ZB, -700.0
B.ground_rect(D, YX0, YX1, YZ0, YZ1, mat="concrete")
cbox(YX1 - 0.3, YX1, 0.0, 3.0, YZ0, YZ1)                                 # its east wall
tbox(YX1 - 0.36, YX1 + 0.06, 3.0, 3.14, YZ0, YZ1, BLACK)
cbox(YX0 + 6.0, YX1, 0.0, 3.0, YZ1 - 0.3, YZ1)                           # and its south, a gate left in it
for z in (-786.0, -770.0, -754.0, -738.0, -722.0, -706.0):
    wall_lamp(YX1 - 0.3, 2.7, z, -1, 0, "amber" if int(z) % 4 else "white", 3.0)
TRANSFORMERS = []
for i, z in enumerate((-780.0, -770.0, -760.0, -750.0)):
    for x in (114.0, 123.0):
        tbox(x - 2.2, x + 2.2, G0, G0 + 0.4, z - 1.6, z + 1.6, BLACK)
        box((D, "metal", 0), x - 1.8, x + 1.8, G0 + 0.4, G0 + 3.2, z - 1.2, z + 1.2, scale=1.0)
        for fx in (-1.9, 1.9):
            for j in range(4):
                box((D, "metal", 1), x + fx - 0.12, x + fx + 0.12, G0 + 0.7, G0 + 2.9, z - 0.9 + j * 0.6 - 0.04, z - 0.9 + j * 0.6 + 0.04, scale=0.5)
        for bz in (-0.7, 0.0, 0.7):
            cylinder((D, "glass_dark", 1), x, z + bz, G0 + 3.2, G0 + 4.3, 0.12, segs=6)
        box((D, "glow", 1), x - 0.2, x + 0.2, G0 + 1.6, G0 + 1.9, z + 1.2, z + 1.23, scale=0.5, col=dim(GLOW["green" if (i + int(x)) % 3 else "red"], 0.6))
        TRANSFORMERS.append((x, G0 + 4.3, z))
    light(D, 118.5, 4.0, z, "white" if i % 2 else "cyan", 2.6)
# The bus bars over them, on gantries.
for z in (-784.0, -765.0, -746.0):
    for x in (110.0, 127.0):
        box((D, "metal", 1), x - 0.1, x + 0.1, G0, G0 + 7.0, z - 0.1, z + 0.1, scale=0.5)
    box((D, "metal", 1), 109.8, 127.2, G0 + 6.8, G0 + 7.0, z - 0.12, z + 0.12, scale=0.5)
for x in (114.0, 118.5, 123.0):
    cable((x, G0 + 6.7, -784.0), (x, G0 + 6.7, -765.0), 0.5, r=0.03)
    cable((x, G0 + 6.7, -765.0), (x, G0 + 6.7, -746.0), 0.5, r=0.03)
# A fence round the compound: posts, rails, a hazard board.
for (a, b) in (((108.0, -788.0), (129.0, -788.0)), ((129.0, -788.0), (129.0, -743.0)), ((129.0, -743.0), (108.0, -743.0)), ((108.0, -743.0), (108.0, -788.0))):
    steel_rail(a, b, G0, h=2.2, posts=3.5)
tbox(107.9, 107.96, 1.0, 2.0, -766.0, -764.4, YEL)
poly((D, "trim", 1), [(107.88, 1.2, -764.7), (107.88, 1.2, -765.7), (107.88, 1.85, -765.2)], [(0, 0), (1, 0), (0.5, 1)], BLACK)
YARD_PYLONS = (pylon(112.0, -730.0, h=30.0, w0=1.9, yaw_arms="x"), pylon(124.0, -712.0, h=27.0, w0=1.8, yaw_arms="z"))
for tip, tr in zip(YARD_PYLONS[0][:2], TRANSFORMERS[-2:]):
    bundle(tip, tr, sag=2.0, n=2)
bundle(YARD_PYLONS[0][2], YARD_PYLONS[1][2], sag=2.4, n=3)
bundle(YARD_PYLONS[0][3], YARD_PYLONS[1][3], sag=2.8, n=2)
# Tanks and a shed by the gate, somebody on a break.
for (x, z) in ((126.0, -734.0), (126.0, -729.0)):
    cylinder((D, "metal", 0), x, z, G0, G0 + 5.4, 2.0, segs=12)
    cylinder((D, "trim", 1), x, z, G0 + 5.4, G0 + 5.6, 2.08, segs=12, col=YEL_OLD)
tbox(106.0, 111.0, G0, G0 + 2.8, -724.0, -718.0, TEAL_PAINT)
box((D, "glow", 0), 111.0, 111.03, G0 + 1.1, G0 + 2.1, -722.6, -720.2, scale=0.5, col=dim(GLOW["cyan"], 0.35))
tbox(105.8, 111.2, G0 + 2.8, G0 + 2.95, -724.2, -717.8, BLACK, bottom=True)
for (x, z, yaw, pose) in ((112.4, -721.0, math.pi / 2, "smoke"), (113.0, -719.6, -2.0, "idle"), (120.0, -741.0, 0.0, "phone"), (109.0, -704.0, 0.0, "idle")):
    stand(x, z, yaw, pose, G0)
P.place("drum", 111.6, G0, -717.4)
P.place("drum", 112.3, G0, -717.2)
P.place("crates", 116.0, G0, -703.0, 0.2)
P.place("dumpster", 121.0, G0, -701.6, math.pi)
P.place("lamp_short", 106.0, G0, -706.0)
P.place("lamp_short", 106.0, G0, -734.0)
empty("anchor_steam_mega_4", (118.5, 0.3, -741.0))
print("mega roofs: kept off the hero's roofline:", len(SKIPPED), SKIPPED[:12])
