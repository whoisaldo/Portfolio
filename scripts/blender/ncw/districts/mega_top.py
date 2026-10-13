"""The megabuilding's roofs as places people use, from a flying car or a
neighbour's roof: the slab's, the arm's over the market hall, the wings'
and the back blocks' east of the canyon.

roof_full() fills a roof's open ground in cells: plant (painted units with
their fans and grilles, tanks on stands, vent stacks), pipe runs on
sleepers, shacks with their lights on, a fenced edge, washing on lines, a
board on legs, crates with people sat on them, and under all of it the
roof itself patched with tar, seamed, stained and holding puddles. Every
piece on a megablock roof goes through mega_roofs.ok(): the hero's lens
looks along those roofs from 755 m and keeps its outline.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B  # noqa: F401
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_roofs import ok, shack
from ncw.districts.mega_wings import AX0, AX1, AZ0, AZ1, ARM_TOP, T1, T2, T1_TOP, PT, WX1

PAINTS = (PALE, CREAM, BLUEGREY, TEAL_PAINT, dim(YEL_OLD, 0.8), dim(RUST, 0.9), (0.2, 0.22, 0.2, 1.0))
HUES = ("pink", "cyan", "amber", "white", "teal")


def surface(x0, x1, z0, z1, top, r):
    """The roof's own ground: tar patches, seams, stains, puddles."""
    y = top + 0.012
    for _ in range(int((x1 - x0) * (z1 - z0) / 60) + 2):
        w, d = r.uniform(1.5, 5.0), r.uniform(1.0, 4.0)
        cx, cz = r.uniform(x0 + w / 2, x1 - w / 2), r.uniform(z0 + d / 2, z1 - d / 2)
        hquad((D, "trim", 1), cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, y, col=r.choice((BLACK, dim(CONC, 0.6), (0.07, 0.07, 0.08, 1.0))))
    x = x0 + r.uniform(3.0, 6.0)
    while x < x1 - 1.0:
        hquad((D, "trim", 1), x - 0.06, x + 0.06, z0 + 0.3, z1 - 0.3, y + 0.003, col=BLACK)
        x += r.uniform(4.0, 7.0)
    for _ in range(int((x1 - x0) * (z1 - z0) / 90) + 1):
        w, d = r.uniform(1.2, 3.6), r.uniform(0.8, 2.6)
        cx, cz = r.uniform(x0 + w / 2 + 0.5, x1 - w / 2 - 0.5), r.uniform(z0 + d / 2 + 0.5, z1 - d / 2 - 0.5)
        hquad((D, "roof_wet", 0), cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, y + 0.006, scale=4.0)


def ac_unit(x, z, top, r, guard):
    w, d, h = r.uniform(1.4, 2.6), r.uniform(1.1, 1.8), r.uniform(1.0, 1.7)
    if guard and not ok(x - w / 2, x + w / 2, z - d / 2, z + d / 2, top, top + h + 0.2):
        return
    tbox(x - w / 2, x + w / 2, top, top + h, z - d / 2, z + d / 2, r.choice(PAINTS))
    box((D, "dark", 1), x - w / 2 - 0.08, x + w / 2 + 0.08, top + h, top + h + 0.08, z - d / 2 - 0.08, z + d / 2 + 0.08, scale=1.0)
    for i in range(int(w // 1.0)):
        cylinder((D, "dark", 1), x - w / 2 + 0.5 + i * 1.0, z, top + h + 0.08, top + h + 0.14, 0.38, segs=8)
    rotated_quad((D, "trim", 1), x, top + h * 0.45, z + d / 2 + 0.01, w - 0.3, h * 0.55, 0.0, col=BLACK)
    if r.random() < 0.5:
        rotated_quad((D, "glow", 1), x + w / 2 - 0.25, top + h * 0.85, z + d / 2 + 0.012, 0.1, 0.08, 0.0, col=GLOW[r.choice(("green", "red", "amber"))])


def tank_stand(x, z, top, r, guard):
    rr, h, legs = r.uniform(0.9, 1.5), r.uniform(1.8, 3.0), r.uniform(1.0, 2.2)
    if guard and not ok(x - rr, x + rr, z - rr, z + rr, top, top + legs + h + 0.4):
        return
    for sx in (-1, 1):
        for sz in (-1, 1):
            box((D, "metal", 1), x + sx * rr * 0.7 - 0.06, x + sx * rr * 0.7 + 0.06, top, top + legs, z + sz * rr * 0.7 - 0.06, z + sz * rr * 0.7 + 0.06, scale=0.5)
    tbox(x - rr, x + rr, top + legs - 0.12, top + legs, z - rr, z + rr, STEEL)
    cylinder((D, "trim", 0), x, z, top + legs, top + legs + h, rr, segs=10, col=r.choice((PALE, CREAM, BLUEGREY, dim(RUST, 1.1))))
    cylinder((D, "dark", 1), x, z, top + legs + h, top + legs + h + 0.25, rr * 0.9, segs=10)


def plant_room(x, z, top, r, guard):
    """A plant room: a big painted box with louvres, a door lit over it, a
    duct out of its roof."""
    w, d, h = r.uniform(2.6, 3.8), r.uniform(2.2, 3.2), r.uniform(2.2, 3.0)
    if guard and not ok(x - w / 2, x + w / 2, z - d / 2, z + d / 2, top, top + h + 1.2):
        return
    col = r.choice(PAINTS)
    tbox(x - w / 2, x + w / 2, top, top + h, z - d / 2, z + d / 2, col)
    box((D, "dark", 1), x - w / 2 - 0.1, x + w / 2 + 0.1, top + h, top + h + 0.12, z - d / 2 - 0.1, z + d / 2 + 0.1, scale=1.0)
    yaw = r.choice((0.0, math.pi))
    zf = z + (d / 2 + 0.01) * (1 if yaw == 0.0 else -1)
    rotated_quad((D, "door_panel", 0), x - w / 4, top + 1.05, zf, 0.9, 2.1, yaw)
    rotated_quad((D, "glow", 0), x - w / 4, top + 2.25, zf, 0.5, 0.12, yaw, col=dim(GLOW[r.choice(("white", "amber", "green"))], 0.7))
    for i in range(4):
        rotated_quad((D, "trim", 1), x + w / 4, top + 0.6 + i * 0.45, zf, w / 3, 0.22, yaw, col=BLACK)
    box((D, "metal", 1), x + w / 2 - 1.0, x + w / 2 - 0.3, top + h, top + h + 1.0, z - 0.35, z + 0.35, scale=1.0)
    light(D, x - w / 4, top + 2.2, zf + (1.0 if yaw == 0.0 else -1.0), "white", 2.4)


def vents(x, z, top, r, guard):
    for i in range(r.randint(2, 4)):
        vx, vz, h = x + r.uniform(-1.4, 1.4), z + r.uniform(-1.0, 1.0), r.uniform(0.6, 1.6)
        if guard and not ok(vx - 0.3, vx + 0.3, vz - 0.3, vz + 0.3, top, top + h + 0.2):
            continue
        cylinder((D, "metal", 1), vx, vz, top, top + h, r.choice((0.12, 0.18, 0.25)), segs=6)
        cylinder((D, "dark", 1), vx, vz, top + h, top + h + 0.08, 0.3, segs=6)


def washing(x, z, top, r, guard, along="x"):
    L = r.uniform(3.0, 5.0)
    a, b = ((x - L / 2, z), (x + L / 2, z)) if along == "x" else ((x, z - L / 2), (x, z + L / 2))
    if guard and not ok(min(a[0], b[0]) - 0.2, max(a[0], b[0]) + 0.2, min(a[1], b[1]) - 0.2, max(a[1], b[1]) + 0.2, top, top + 2.1):
        return
    for p in (a, b):
        box((D, "metal", 1), p[0] - 0.04, p[0] + 0.04, top, top + 2.0, p[1] - 0.04, p[1] + 0.04, scale=0.5)
    cable((a[0], top + 1.95, a[1]), (b[0], top + 1.95, b[1]), 0.12, steps=4, r=0.012)
    n = int(L // 0.8)
    for i in range(n):
        if r.random() < 0.25:
            continue
        t0, t1 = (i + 0.1) / n, (i + 0.85) / n
        p0 = (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0)
        p1 = (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)
        drop = r.uniform(0.5, 1.0)
        cloth((p0[0], top + 1.9 - drop, p0[1]), (p1[0], top + 1.9 - drop, p1[1]), (p1[0], top + 1.9, p1[1]), (p0[0], top + 1.9, p0[1]), r.choice(HUES))


def sitters(x, z, top, r, guard):
    if guard and not ok(x - 1.2, x + 1.2, z - 1.2, z + 1.2, top, top + 1.6):
        return
    P.place("crates", x, top, z, r.uniform(0, 3.0))
    stand(x + 0.9, z, -math.pi / 2, "sit", top + 0.45)
    if r.random() < 0.6:
        stand(x - 0.9, z + 0.2, math.pi / 2 + r.uniform(-0.4, 0.4), r.choice(("sit", "smoke", "idle")), top + (0.45 if r.random() < 0.5 else 0.0))
    if r.random() < 0.5:
        P.place("drum", x + r.uniform(-1.5, 1.5), top, z + 1.3)


def fence(x0, x1, z, top, guard):
    if guard and not ok(x0, x1, z - 0.1, z + 0.1, top, top + 2.0):
        return
    steel_rail((x0, z), (x1, z), top, h=1.9, posts=2.0)
    box((D, "trim", 1), x0, x1, top + 0.05, top + 0.25, z - 0.02, z + 0.02, scale=1.0, col=dim(YEL, 0.6))


def roof_full(x0, x1, z0, z1, top, seed, guard=False, keep=(), people=0.5, lamps=True):
    """Fill a roof: its ground, then a cell every 5 to 7 m holding one thing.
    `keep`: (x0, x1, z0, z1) stretches left clear (pads, walks, existing
    plant)."""
    r = random.Random(seed)
    surface(x0, x1, z0, z1, top, r)
    cell = 4.2
    nx, nz = max(1, int((x1 - x0) // cell)), max(1, int((z1 - z0) // cell))
    kinds = ("ac", "ac", "tank", "vents", "wash", "sit", "ac", "vents", "shack", "fence", "pipes", "board", "plant", "plant", "tank")
    for i in range(nx):
        for j in range(nz):
            cx = x0 + (i + 0.5) * (x1 - x0) / nx + r.uniform(-1.0, 1.0)
            cz = z0 + (j + 0.5) * (z1 - z0) / nz + r.uniform(-1.0, 1.0)
            if any(a - 1.3 < cx < b + 1.3 and c - 1.3 < cz < d + 1.3 for a, b, c, d in keep):
                continue
            k = r.choice(kinds)
            if k == "ac":
                ac_unit(cx, cz, top, r, guard)
                if r.random() < 0.5:
                    ac_unit(cx + r.choice((-2.4, 2.4)), cz + r.uniform(-0.6, 0.6), top, r, guard)
            elif k == "tank":
                tank_stand(cx, cz, top, r, guard)
            elif k == "plant":
                plant_room(cx, cz, top, r, guard)
            elif k == "vents":
                vents(cx, cz, top, r, guard)
            elif k == "wash":
                washing(cx, cz, top, r, guard, r.choice(("x", "z")))
            elif k == "sit" and r.random() < people * 2:
                sitters(cx, cz, top, r, guard)
            elif k == "shack":
                shack(cx, cz, top, colour=r.choice(("amber", "cyan", "pink")), yaw=r.choice((0.0, math.pi / 2, math.pi, -math.pi / 2)), r=r)
            elif k == "fence":
                fence(cx - 2.6, cx + 2.6, cz, top, guard)
            elif k == "pipes":
                L = r.uniform(4.0, 6.0)
                if not guard or ok(cx - L / 2, cx + L / 2, cz - 0.5, cz + 0.5, top, top + 0.9):
                    for dz, rr, col in ((0.0, 0.14, RUST), (0.36, 0.09, STEEL), (-0.32, 0.11, TEAL_PAINT)):
                        rpipe((cx - L / 2, top + 0.55, cz + dz), (cx + L / 2, top + 0.55, cz + dz), rr, col=col)
                    for t in (-0.4, 0.0, 0.4):
                        tbox(cx + t * L - 0.1, cx + t * L + 0.1, top, top + 0.42, cz - 0.55, cz + 0.55, STEEL)
            elif k == "board":
                if not guard or ok(cx - 2.0, cx + 2.0, cz - 0.4, cz + 0.4, top, top + 3.6):
                    yaw = r.choice((0.0, math.pi, math.pi / 2, -math.pi / 2)) + r.uniform(-0.3, 0.3)
                    angled_sign(cx, top + 2.4, cz, r.choice(("bm", "bl", "ps")), yaw)
                    for du in (-0.8, 0.8):
                        px, pz = cx + math.cos(yaw) * du, cz - math.sin(yaw) * du
                        box((D, "metal", 1), px - 0.05, px + 0.05, top, top + 1.8, pz - 0.05, pz + 0.05, scale=0.5)
    if lamps:
        for i in range(nx):
            for j in range(nz):
                if (i + j) % 2 == 0:
                    lx = x0 + (i + 0.5) * (x1 - x0) / nx
                    lz = z0 + (j + 0.5) * (z1 - z0) / nz
                    light(D, lx, top + 2.5, lz, r.choice(("amber", "white", "pink", "cyan")), 3.2)


# ---------------------------------------------------------------------------
# The slab's east roof (83 m) round its pad, and the middle section's
# east wall over it: lit doors, pipes, units, a sign, a ladder.
# ---------------------------------------------------------------------------
ET = MB_SECTIONS[2][2]
roof_full(19.0, 47.0, -789.0, -746.0, ET, 5301, guard=True, keep=((24.0, 42.0, -785.0, -767.0), (25.0, 29.0, -764.0, -759.0), (43.0, 47.0, -763.0, -754.0)))
MT = MB_SECTIONS[1][2]
fx = face("+x", 18.0, -790.0, -749.0)
for (s, w) in ((9.0, 1.2), (26.0, 1.4)):
    fx.quad((D, "door_panel", 0), s - w / 2, s + w / 2, ET, ET + 2.3, 0.03)
    fx.quad((D, "glow", 0), s - w / 2 - 0.1, s + w / 2 + 0.1, ET + 2.4, ET + 2.55, 0.05, col=dim(GLOW["white"], 0.5))
    light(D, 19.5, ET + 2.0, fx.at(s), "white", 3.0)
for s in (4.0, 15.0, 21.0, 33.0, 37.5):
    P.place("ac_wall", *fx.p(fx.at(s), ET + 3.2, 0.0), fx.yaw)
for (s, rr, col) in ((12.0, 0.12, RUST), (12.4, 0.07, STEEL), (30.5, 0.1, TEAL_PAINT)):
    rpipe(fx.p(fx.at(s), ET, 0.2), fx.p(fx.at(s), MT - 0.2, 0.2), rr, col=col)
rpipe(fx.p(fx.at(1.0), ET + 4.6, 0.2), fx.p(fx.at(40.0), ET + 4.6, 0.2), 0.1, col=RUST)
angled_sign(18.2, ET + 3.9, fx.at(18.0), "bm", math.pi / 2, back=False)
for i in range(8):
    fbox(fx, (D, "metal", 1), 23.4, 24.0, ET + 0.4 + i * 0.7, ET + 0.46 + i * 0.7, 0.0, 0.3)

# ---------------------------------------------------------------------------
# The arm's roof over the market hall (25 m): its open middle filled, and
# the board on it standing on a frame of its own.
# ---------------------------------------------------------------------------
# (Clear: the pad, the walk down the middle, the skylights and shacks, and
# the sweep's own point on this roof, mg13 at (84, -722).)
roof_full(AX0 + 1.0, AX1 - 5.0, AZ0 + 2.0, AZ1 - 4.0, ARM_TOP, 5311, keep=((67.0, 77.0, -721.0, -711.0), (65.0, 103.0, -715.8, -714.2),
          (85.0, 99.0, -732.0, -728.0), (82.0, 86.0, -724.5, -719.5), (89.0, 93.0, -744.0, -739.0), (94.0, 98.0, -730.0, -725.0)), people=0.8)
RB = (72.0, -719.0, -math.pi / 2 + 0.22)
rx, rz = math.cos(RB[2]), -math.sin(RB[2])
bnx, bnz = math.sin(RB[2]), math.cos(RB[2])
for du in (-5.6, -1.9, 1.9, 5.6):
    for back in (0.6, 2.4):
        px, pz = RB[0] + rx * du - bnx * back, RB[1] + rz * du - bnz * back
        box((D, "metal", 0), px - 0.16, px + 0.16, ARM_TOP, ARM_TOP + 2.4 + 6.4, pz - 0.16, pz + 0.16, scale=0.5)
    a = (RB[0] + rx * du - bnx * 0.6, RB[1] + rz * du - bnz * 0.6)
    b = (RB[0] + rx * du - bnx * 2.4, RB[1] + rz * du - bnz * 2.4)
    for (y0, y1) in ((ARM_TOP + 0.4, ARM_TOP + 4.6), (ARM_TOP + 4.6, ARM_TOP + 8.4)):
        pipe((D, "metal", 1), (a[0], y0, a[1]), (b[0], y1, b[1]), 0.06, segs=4)
for y in (ARM_TOP + 2.2, ARM_TOP + 8.6):
    pa = (RB[0] - rx * 6.6 - bnx * 1.5, RB[1] - rz * 6.6 - bnz * 1.5)
    pb = (RB[0] + rx * 6.6 - bnx * 1.5, RB[1] + rz * 6.6 - bnz * 1.5)
    pipe((D, "metal", 0), (pa[0], y, pa[1]), (pb[0], y, pb[1]), 0.12, segs=4)
# A catwalk under its face with lamps that light it from below.
cw = (RB[0] + bnx * 0.9, RB[1] + bnz * 0.9)
oriented_box((D, "metal", 1), cw[0], ARM_TOP + 2.25, cw[1], 13.2, 0.1, 1.0, RB[2], scale=0.5)
for du in (-4.5, -1.5, 1.5, 4.5):
    px, pz = cw[0] + rx * du, cw[1] + rz * du
    box((D, "glow", 0), px - 0.2, px + 0.2, ARM_TOP + 2.3, ARM_TOP + 2.5, pz - 0.2, pz + 0.2, scale=0.5, col=dim(GLOW["white"], 0.8))

# ---------------------------------------------------------------------------
# The west wing's podium roof round its tower, and the tower's lower roof.
# ---------------------------------------------------------------------------
roof_full(T1[1] + 1.0, WX1 - 4.0, -786.0, -748.0, PT, 5321, people=0.8)
roof_full(T1[0] + 1.0, T1[1] - 1.0, T2[3] + 1.0, T1[3] - 1.0, T1_TOP, 5322)

# ---------------------------------------------------------------------------
# The back blocks east of the canyon (mega_east.py), from the flying lanes:
# their roofs filled round their crowns and boards, and on the low ones a
# rooftop storey or two of their own (flats built on, a lit sign on each),
# so the roofline steps.
# ---------------------------------------------------------------------------
EAST = (  # x0, x1, z0, z1, top, crown or board area kept clear
    (68.0, 90.0, -692.0, -664.0, floor_y(13), (73.0, 85.0, -682.0, -674.0)),
    (96.0, 128.0, -692.0, -660.0, floor_y(8), (102.0, 122.0, -686.0, -666.0)),
    (52.0, 64.0, -676.0, -640.0, floor_y(7), (54.0, 62.0, -662.0, -654.0)),
    (70.0, 92.0, -658.0, -630.0, floor_y(18), (74.0, 88.0, -654.0, -634.0)),
    (98.0, 128.0, -654.0, -630.0, floor_y(5), (105.0, 121.0, -646.0, -638.0)),
    (52.0, 76.0, -594.0, -564.0, floor_y(11), (58.0, 70.0, -583.0, -575.0)),
    (82.0, 104.0, -590.0, -564.0, floor_y(16), (86.0, 100.0, -586.0, -568.0)),
    (110.0, 130.0, -590.0, -562.0, floor_y(6), (115.0, 125.0, -580.0, -572.0)),
)
for i, (x0, x1, z0, z1, top, kp) in enumerate(EAST):
    roof_full(x0 + 1.0, x1 - 1.0, z0 + 1.0, z1 - 1.0, top, 5401 + i, keep=(kp,), people=0.6)
_rp = random.Random(5420)
for (x0, x1, z0, z1, top, k, hue) in ((99.5, 108.0, -652.5, -647.0, floor_y(5), 2, "pink"), (111.5, 128.5, -591.0, -584.0, floor_y(6), 3, "cyan"),
                                      (52.5, 59.0, -675.0, -666.0, floor_y(7), 2, "amber"), (118.0, 127.0, -691.0, -684.0, floor_y(8), 2, "teal")):
    y1 = top + k * CELL_H
    fs = shell(x0, x1, z0, z1, top, y1, B.wall_col(_rp.uniform(0.55, 0.85), _rp.choice((0, 5, 6)), _rp.uniform(0.4, 1.0), _rp.choice((1, 3, 5, 6))), 5430 + int(x0))
    parapet(x0, x1, z0, z1, y1, rim=hue)
    f = fs["+z"]
    angled_sign(*f.p(f.at(f.width / 2), y1 + 1.6, 0.4), "bl", 0.0, back=False)
    for name in ("+x", "-x"):
        g = fs[name]
        g.ledge((D, "trim", 1), 0.2, g.width - 0.2, top + CELL_H - 0.2, 0.2, 0.25, CONC)
    roof_full(x0 + 0.6, x1 - 0.6, z0 + 0.6, z1 - 0.6, y1, 5440 + int(x0), lamps=False)

