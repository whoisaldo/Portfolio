"""The hub: the square's middle is glass (PzkEqhVByw4@86, M6VoEJdoHi8@8, and
from the air the lit disc of ax5YUmkWf_Y@9).

A round well 32 m across, as wide as the square leaves between the canyon's
lane and the terraces' stair, roofed in triangulated glazing on dark bars:
some panes lit teal, most clear, and through them the concourse below (its
shop windows round the wall, lamps, trees, carts, people). The promenade
crosses it on a causeway (the walkers' line at z -230 stays at ground
level), a kerb and a glass balustrade run round both halves, a ring of
radial paving and a line of light lie round that, and spokes of light run
out over the square's slabs to its edges. Over the causeway a koi swims
(YRL74JmhVgk@18): a fish 19 m long drawn in neon tube on three slim gates.

Heights: the Work shot's frame (a phone's is the lower) passes 7.4 m over
the causeway and the braindance's cameras never come under 14 m here, so
the koi's highest tube is at 6.9 m and nothing else is over 2 m.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403

G = 0.15
HX, HZ = 70.0, -234.0
RP, RK, RO = 16.0, 16.9, 21.0   # the well's wall, the kerb's outer edge, the paved ring's
CW = (-233.0, -227.0)            # the causeway
KW = 0.45                        # its kerbs, and the ring kerb's top
KY = 0.5
YG = 0.4                         # the glazing
FLOOR = -5.2
STAIR = (83.6, 92.0, -220.0, -205.0)   # the terrace's stair (plaza_square.py builds it)
NSEG = 48
STEP = math.tau / NSEG
SOUTH = [(0.0, -1.0, -CW[1])]
NORTH = [(0.0, 1.0, CW[0])]
LOBES = (SOUTH, NORTH)
rh = random.Random(8600)


def at(r, a):
    return (HX + r * math.cos(a), HZ + r * math.sin(a))


def off(dx, dz):
    return (HX + dx, HZ + dz)


def bar(key, p, q, top, w, h):
    """A steel bar from p to q (x, z), its top at `top`."""
    length = math.hypot(q[0] - p[0], q[1] - p[1])
    if length > 0.08:
        oriented_box(key, (p[0] + q[0]) / 2, top - h / 2, (p[1] + q[1]) / 2, length, h, w, math.atan2(-(q[1] - p[1]), q[0] - p[0]), scale=1.0)


# ---------------------------------------------------------------------------
# Round it: a ring of radial paving (each stone two sectors long, the two
# courses breaking joint), a line of light at its outer edge, spokes of
# light out over the slabs to the square's edges.
# ---------------------------------------------------------------------------
STONE = ((0.27, 0.28, 0.31), (0.33, 0.34, 0.37), (0.44, 0.45, 0.48), (0.2, 0.21, 0.24))
RM = (RK + RO) / 2
for course, (r0, r1) in enumerate(((RK, RM), (RM, RO))):
    tones = []
    for _ in range(NSEG // 2):
        t, k = rh.choice(STONE), rh.uniform(0.86, 1.14)
        tones.append((t[0] * k, t[1] * k, t[2] * k, 1.0))
    for i in range(NSEG):
        first = (i + course) % 2 == 0
        tone = tones[((i + course) // 2) % (NSEG // 2)]
        a0, a1 = i * STEP + (0.03 / r0 if first else 0.0), (i + 1) * STEP - (0.0 if first else 0.03 / r0)
        up_poly((PL, "paint", 0), [at(r0 + 0.02, a0), at(r0 + 0.02, a1), at(r1 - 0.02, a1), at(r1 - 0.02, a0)], G, tone)
ring((PL, "neon_teal", 0), HX, HZ, RO + 0.05, RO + 0.17, G + 0.012, n=NSEG)


def free(x, z):
    """Open paving: not the stair, not past the square's edges, and east of
    the terraces' foot only along the passage between them."""
    if STAIR[0] - 0.3 < x < STAIR[1] + 0.3 and STAIR[2] - 0.3 < z < STAIR[3] + 0.3:
        return False
    if x > 91.6:
        return x < 107.4 and -233.6 < z < -226.4
    return x > 48.7 and -260.2 < z < -191.9


for i in range(16):
    a = (i + 0.5) * math.tau / 16
    r1 = RO + 0.5
    while r1 < 46.0 and free(*at(r1 + 0.5, a)):
        r1 += 0.5
    if r1 > RO + 2.5:
        gline("teal", *at(RO + 0.5, a), *at(r1, a), G + 0.012, w=0.09)

# ---------------------------------------------------------------------------
# The kerb round each half of the well, lit along its foot.
# ---------------------------------------------------------------------------
OUTER = ([(0.0, -1.0, -(CW[1] - KW))], [(0.0, 1.0, CW[0] + KW)])
for i in range(NSEG):
    a0, a1 = i * STEP, (i + 1) * STEP
    sector = [at(RP, a0), at(RP, a1), at(RK, a1), at(RK, a0)]
    for lobe, outer in zip(LOBES, OUTER):
        top = clip_planes(sector, lobe)
        if top:
            up_poly((PL, "concrete", 0), top, KY, scale=1.5)
        s = seg_clip(at(RP, a0), at(RP, a1), lobe)
        if s:
            vwall((PL, "concrete", 0), s[0], s[1], G - 0.5, KY)
        s = seg_clip(at(RK, a1), at(RK, a0), outer)
        if s:
            vwall((PL, "concrete", 0), s[0], s[1], G - 0.03, KY)
        s = seg_clip(at(RK + 0.02, a1), at(RK + 0.02, a0), outer)
        if s:
            vwall((PL, "neon_cyan", 0), s[0], s[1], G + 0.02, G + 0.08)

# ---------------------------------------------------------------------------
# The causeway: the promenade's own slabs on a deck across the well, a kerb
# down each side, columns under it, its soffit lit.
# ---------------------------------------------------------------------------
rim = disc_planes(HX, HZ, RK, NSEG)
well = disc_planes(HX, HZ, RP, NSEG)
up_poly((PL, "dark", 0), clip_planes([(HX - 17, CW[0]), (HX + 17, CW[0]), (HX + 17, CW[1]), (HX - 17, CW[1])], rim), G - 0.03)
for k in range(5):
    xa, xb = HX - 17.0 + k * 6.8, HX - 17.0 + (k + 1) * 6.8
    t, kk = rh.choice(STONE), rh.uniform(0.86, 1.14)
    piece = clip_planes([(xa + 0.03, CW[0] + KW), (xb - 0.03, CW[0] + KW), (xb - 0.03, CW[1] - KW), (xa + 0.03, CW[1] - KW)], rim)
    if piece:
        up_poly((PL, "paint", 0), piece, G, (t[0] * kk, t[1] * kk, t[2] * kk, 1.0))
for (z0, z1, face) in ((CW[0], CW[0] + KW, CW[0] + KW), (CW[1] - KW, CW[1], CW[1] - KW)):
    up_poly((PL, "concrete", 0), clip_planes([(HX - 17, z0), (HX + 17, z0), (HX + 17, z1), (HX - 17, z1)], rim), KY, scale=1.5)
    half = math.sqrt(RK * RK - (face - HZ) ** 2)
    a, b = (HX - half, face), (HX + half, face)
    vwall((PL, "concrete", 0), *((a, b) if face == z1 else (b, a)), G, KY)
for z, south in ((CW[0], False), (CW[1], True)):
    half = math.sqrt(RP * RP - (z - HZ) ** 2)
    a, b = (HX - half, z), (HX + half, z)
    vwall((PL, "concrete", 0), *((a, b) if south else (b, a)), G - 0.5, KY)
down_poly((PL, "concrete", 0), clip_planes([(HX - 17, CW[0]), (HX + 17, CW[0]), (HX + 17, CW[1]), (HX - 17, CW[1])], well), G - 0.5, scale=1.5)
for dx in (-9.0, 0.0, 9.0):
    for z in (CW[0] + 0.7, CW[1] - 0.7):
        cylinder((PL, "concrete", 0), HX + dx, z, FLOOR, G - 0.5, 0.32, segs=8, cap=False)
for dx in (-12.0, -4.5, 4.5, 12.0):
    box((PL, "glow", 0), HX + dx - 1.3, HX + dx + 1.3, G - 0.56, G - 0.5, -230.12, -229.88, scale=1.0, col=dim("white", 1.0), bottom=True)


def lobe_loop(r, zline, south):
    """Round one half of the well at radius r and back along the causeway."""
    t = math.asin((zline - HZ) / r)
    a0, a1 = (t, math.pi - t) if south else (math.pi - t, math.tau + t)
    inner = [k * STEP for k in range(2 * NSEG) if a0 + 0.02 < k * STEP < a1 - 0.02]
    return [at(r, a) for a in [a0] + inner + [a1]]


RB = RK - KW
RAIL_Z = (CW[0] + KW / 2, CW[1] - KW / 2)
balustrade(lobe_loop(RB, RAIL_Z[1], True), KY, colour="teal", close=True)
balustrade(lobe_loop(RB, RAIL_Z[0], False), KY, colour="teal", close=True)

# ---------------------------------------------------------------------------
# The glazing: a lattice of triangles on dark bars over each half, deep
# beams under it running in to the middle; panes lit toward the rim, clear
# over the middle.
# ---------------------------------------------------------------------------
S = 2.6
VX, VZ = S / 2, S * math.sqrt(3) / 2
glass = disc_planes(HX, HZ, RP - 0.03, NSEG)


def lat(a, b):
    return (HX + 0.4 + a * S + b * VX, HZ + 0.3 + b * VZ)


for lobe in LOBES:
    planes = glass + lobe
    for a in range(-18, 18):
        for b in range(-9, 9):
            p00, p10, p01, p11 = lat(a, b), lat(a + 1, b), lat(a, b + 1), lat(a + 1, b + 1)
            if min(math.hypot(p[0] - HX, p[1] - HZ) for p in (p00, p10, p01, p11)) > RP + S:
                continue
            for tri in ((p00, p10, p01), (p10, p11, p01)):
                piece = clip_planes(tri, planes)
                if len(piece) < 3:
                    continue
                f = math.hypot(sum(p[0] for p in piece) / len(piece) - HX, sum(p[1] for p in piece) / len(piece) - HZ) / RP
                if rh.random() < 0.08 + 0.42 * f * f:
                    tone = dim("teal", rh.uniform(0.1, 0.34)) if rh.random() < 0.86 else dim("white", rh.uniform(0.14, 0.24))
                    up_poly((PL, "glow", 0), piece, YG, tone)
            for p, q in ((p00, p10), (p00, p01), (p10, p01)):
                s = seg_clip(p, q, planes)
                if s:
                    bar((PL, "board_frame", 0), s[0], s[1], YG + 0.05, 0.11, 0.14)
    for i in range(16):
        a = (i + 0.5) * math.tau / 16
        s = seg_clip(at(1.2, a), at(RP - 0.05, a), lobe)
        if s:
            bar((PL, "board_frame", 0), s[0], s[1], YG - 0.09, 0.3, 0.42)

# ---------------------------------------------------------------------------
# The concourse under it: a paved floor with rings of light, the wall a
# round of shop windows between piers under small adverts, a cove of light
# at its head.
# ---------------------------------------------------------------------------
up_poly((PL, "dark", 0), [at(RP, i * STEP) for i in range(NSEG)], FLOOR - 0.06, scale=2.0)
# Its floor is lit stone, warm and pale, in rings of big slabs: from the
# square it is the light in the well, and what stands on it is seen against it.
for j, n in enumerate((8, 16, 24, 32)):
    r0, r1 = (0.0, 3.9, 7.9, 11.9)[j] + 0.05, (3.9, 7.9, 11.9, RP - 0.5)[j] - 0.05
    for i in range(n):
        a0, a1 = (i + 0.5 * (j % 2)) * math.tau / n, (i + 1 + 0.5 * (j % 2)) * math.tau / n
        g0 = 0.05 / max(r0, 1.0)
        edge = 1.4 if j == 3 else 1.0   # brighter by the shop windows
        tone = dim("white", rh.uniform(0.9, 1.4) * edge) if rh.random() < 0.7 else dim("amber", rh.uniform(0.3, 0.45) * edge)
        tone = tone if rh.random() < 0.9 else dim("teal", 0.4)
        up_poly((PL, "glow", 0), [at(r0, a0 + g0), at(r0, a1 - g0), at(r1, a1 - g0), at(r1, a0 + g0)] if j else [at(0.0, 0.0), at(r1, a0 + g0), at(r1, a1 - g0)],
                FLOOR, tone)
for r, colour in ((6.0, "teal"), (11.2, "cyan")):
    ring((PL, "glow", 0), HX, HZ, r, r + 0.14, FLOOR + 0.012, n=32, col=dim(colour, 0.6))
for i in range(8):
    a = i * math.tau / 8 + 0.2
    (ax, az), (bx_, bz_) = at(6.3, a), at(11.0, a)
    px, pz = -math.sin(a) * 0.06, math.cos(a) * 0.06
    up_poly((PL, "glow", 0), [(ax - px, az - pz), (bx_ - px, bz_ - pz), (bx_ + px, bz_ + pz), (ax + px, az + pz)], FLOOR + 0.012, dim("teal", 0.5))
WINDOWS = (("amber", 0.34), ("white", 0.5), ("teal", 0.32), ("pink", 0.24), ("amber", 0.42), ("cyan", 0.26))
shop = WINDOWS[0]
for i in range(NSEG):
    a0, a1 = i * STEP, (i + 1) * STEP
    vwall((PL, "concrete", 0), at(RP, a0), at(RP, a1), FLOOR, G - 0.5)
    vwall((PL, "glow", 0), at(RP - 0.04, a0), at(RP - 0.04, a1), -0.62, -0.5, dim("cyan", 0.6))
    if i % 3 == 0:
        am = (a0 + a1) / 2
        vwall((PL, "glow", 1), at(RP - 0.05, am - 0.004), at(RP - 0.05, am + 0.004), FLOOR + 0.3, -0.9, dim("teal", 0.7))
        shop = rh.choice(WINDOWS)
        continue
    d = 0.1 / RP
    vwall((PL, "glow", 0), at(RP - 0.05, a0 + d), at(RP - 0.05, a1 - d), FLOOR + 0.45, FLOOR + 3.0, dim(shop[0], shop[1] * rh.uniform(0.85, 1.15)))
    if rh.random() < 0.5:
        vwall((PL, "billboard", 0), at(RP - 0.05, a0 + d), at(RP - 0.05, a1 - d), FLOOR + 3.25, FLOOR + 4.3,
              (rh.randrange(8) / 8.0 + 0.01, rh.randrange(8) / 8.0 + 0.01, rh.random(), 1.0), fit=True)
    else:
        vwall((PL, "glow", 1), at(RP - 0.05, a0 + d), at(RP - 0.05, a1 - d), FLOOR + 3.3, FLOOR + 3.42, dim("white", 0.7))


def face_in(dx, dz):
    """The way to turn to look at the well's middle from (dx, dz)."""
    return math.atan2(-dx, -dz)


# What stands down there (nothing over 4.6 m: the glazing is 5.6 up).
for dx, dz in ((-10.0, -8.0), (10.0, -8.0), (0.0, -13.2), (-10.0, 9.6), (10.0, 9.6), (0.0, 13.4)):
    P.place("lamp_short", HX + dx, FLOOR, HZ + dz, district=PL)
    light(PL, HX + dx, 3.0, HZ + dz, "amber", 6.0)
for dx, dz in ((-7.0, -5.0), (7.0, -5.0), (-4.5, -12.0), (4.5, -12.0), (-6.0, 10.6), (6.0, 10.6)):
    P.place("planter_tree", HX + dx, FLOOR, HZ + dz, rh.uniform(0, 6.28), district=PL)
    light(PL, HX + dx, 1.0, HZ + dz, "white", 3.0)
for dx, dz in ((0.0, -7.6), (0.0, 10.6)):
    P.place("ad_drum", HX + dx, FLOOR, HZ + dz, district=PL)
for dx, dz, yaw in ((-3.2, -7.6, -math.pi / 2), (3.2, -7.6, math.pi / 2), (-3.0, 13.0, math.pi), (3.0, 13.0, math.pi)):
    P.place("bench", HX + dx, FLOOR, HZ + dz, yaw, district=PL)
for dx, dz in ((-9.6, -11.2), (9.6, -11.2)):
    yaw = face_in(dx, dz)
    P.place("food_cart", HX + dx, FLOOR, HZ + dz, yaw, district=PL)
    stand(HX + dx - 0.9 * math.sin(yaw), HZ + dz - 0.9 * math.cos(yaw), yaw, "vendor", y=FLOOR)
    for j, (o, pose) in enumerate(((1.5, "idle"), (2.4, "phone"), (3.3, "idle"))):
        stand(HX + dx + o * math.sin(yaw) + 0.25 * j, HZ + dz + o * math.cos(yaw), yaw + math.pi, pose, y=FLOOR)
for a in (4.56, 4.7, 4.84, 1.5, 1.64):
    x, z = at(RP - 0.6, a)
    P.place("vending" if a > 3 else "vending_warm", x, FLOOR, z, face_in(x - HX, z - HZ), district=PL)
for dx, dz, yaw in ((-13.0, -3.6, math.pi / 2), (13.0, -3.6, -math.pi / 2), (-4.5, 4.0, 0.0), (4.5, 4.0, 0.0)):
    P.place("lightbox", HX + dx, FLOOR, HZ + dz, yaw, district=PL)
for dx, dz, yaw, pose in ((1.5, -6.6, 2.4, "talk"), (2.3, -7.3, 2.4 + math.pi, "talk"), (-3.2, -7.9, -math.pi / 2, "sit"), (3.2, -7.2, math.pi / 2, "sit"),
                          (-6.2, -3.6, 0.6, "phone"), (6.0, -6.6, -2.0, "idle"), (-1.6, -11.0, 0.3, "talk"), (-0.8, -10.2, 0.3 + math.pi, "talk"),
                          (-2.2, -14.6, 0.0, "idle"), (1.0, -14.5, 0.2, "phone"), (12.2, -5.0, -1.2, "idle"), (-12.4, -5.6, 1.3, "smoke"),
                          (4.0, -2.6, math.pi, "idle"), (5.0, -2.2, math.pi, "idle"), (-8.2, -1.8, 1.9, "phone"),
                          (-2.6, 3.4, 0.0, "idle"), (3.2, 4.6, math.pi, "phone"), (9.4, 3.0, -1.0, "lean"),
                          (-3.0, 12.6, math.pi, "sit"), (2.7, 12.6, math.pi, "sit"), (3.4, 12.6, math.pi, "sit"),
                          (1.4, 9.4, 2.8, "talk"), (2.1, 8.6, 2.8 + math.pi, "talk"), (-8.4, 8.4, 0.9, "phone"), (8.6, 11.4, -2.4, "idle"),
                          (-0.6, 14.9, math.pi, "idle"), (-11.6, 8.6, 1.4, "squat")):
    stand(HX + dx, HZ + dz, yaw, pose, y=FLOOR + (0.47 if pose == "sit" else 0.0))
# Its light: the windows' on the floor, and the well's on the square round it.
for i in range(12):
    light(PL, *at(12.6, (i + 0.5) * math.tau / 12)[:1], 2.0, at(12.6, (i + 0.5) * math.tau / 12)[1], "white" if i % 3 else "amber", 6.0)
for dx, dz in ((-5.0, -3.0), (5.0, -3.0), (-9.0, 3.0), (0.0, 3.0), (9.0, 3.0), (0.0, -9.5), (0.0, 9.0)):
    light(PL, HX + dx, 2.5, HZ + dz, "white", 5.0)
for i in range(16):
    a = i * math.tau / 16
    light(PL, at(RK + 1.4, a)[0], 0.6, at(RK + 1.4, a)[1], "teal", 6.0)
    light(PL, at(RO + 1.6, a + 0.2)[0], 0.4, at(RO + 1.6, a + 0.2)[1], "cyan", 3.0)

# ---------------------------------------------------------------------------
# The koi: neon tube on three gates over the causeway, its head to the
# stair. Body amber, two bands and the fins pink.
# ---------------------------------------------------------------------------
KX, KY0, KZ, KL = 76.0, 4.5, -228.0, 15.0
PROFILE = ((0.0, 0.12), (0.05, 0.75), (0.13, 1.15), (0.25, 1.38), (0.4, 1.4), (0.55, 1.22), (0.7, 0.92), (0.83, 0.6), (0.93, 0.38), (1.0, 0.26))
STATIONS = (0.05, 0.13, 0.25, 0.4, 0.55, 0.7, 0.83, 0.93)


def girth(s):
    for (s0, h0), (s1, h1) in zip(PROFILE, PROFILE[1:]):
        if s <= s1:
            return h0 + (h1 - h0) * (s - s0) / (s1 - s0)
    return PROFILE[-1][1]


def spine(s):
    return (KX - KL * s, KY0 + 0.18 * math.sin(3.0 * s), KZ + (0.35 + 1.25 * s) * math.sin(4.6 * s + 0.5))


def skin(s, phi, lift=0.0, out=0.0):
    """A point on the body at s along it, phi round it (0 its back, pi/2 its
    south flank)."""
    x, y, z = spine(s)
    h = girth(s)
    return (x, y + (h + lift) * math.cos(phi), z + (0.58 * h + out) * math.sin(phi))


def tube(colour, pts, r=0.08):
    for a, b in zip(pts, pts[1:]):
        pipe((PL, "neon_" + colour, 0), a, b, r, segs=4)


for k, s in enumerate(STATIONS):
    hoop = [skin(s, j * math.tau / 8) for j in range(8)]
    tube("pink" if k in (2, 5) else "amber", hoop + hoop[:1], r=0.065)
for phi in (0.0, math.pi / 2, math.pi, 3 * math.pi / 2):
    tube("amber", [spine(0.0)] + [skin(s, phi) for s in STATIONS] + [skin(1.0, phi)])
tx, ty, tz = spine(1.0)
tube("pink", [(tx, ty + 0.26, tz), (tx - 1.6, ty + 1.5, tz - 0.4), (tx - 3.4, ty + 2.1, tz - 0.9), (tx - 2.3, ty + 0.1, tz - 0.7),
              (tx - 3.2, ty - 1.9, tz - 0.9), (tx - 1.5, ty - 1.3, tz - 0.4), (tx, ty - 0.26, tz)])
tube("pink", [(tx - 2.9, ty + 1.25, tz - 0.75), (tx, ty, tz), (tx - 2.8, ty - 1.1, tz - 0.75)], r=0.06)
tube("pink", [skin(0.25, 0.0), skin(0.31, 0.0, 0.75), skin(0.42, 0.0, 0.8), skin(0.52, 0.0, 0.55), skin(0.6, 0.0)])
for phi in (math.pi / 2, 3 * math.pi / 2):
    x, y, z = skin(0.22, phi)
    side = 1.0 if phi < math.pi else -1.0
    tube("pink", [(x, y - 0.5, z), (x - 1.5, y - 1.5, z + side * 1.3), (x - 2.3, y - 1.0, z + side * 0.5), skin(0.33, phi)], r=0.06)
    nx, ny, nz = spine(0.0)
    tube("pink", [(nx, ny, nz), (nx + 0.8, ny - 0.6, nz + side * 0.45)], r=0.05)
    ex, ey, ez = skin(0.07, phi, out=0.04)
    eye = [(ex + 0.24 * math.cos(j * math.tau / 6), ey + 0.3 + 0.24 * math.sin(j * math.tau / 6), ez) for j in range(6)]
    tube("white", eye + eye[:1], r=0.045)
for x in (73.0, 68.0, 63.5):
    s = (KX - x) / KL
    yb = spine(s)[1] - girth(s) - 0.06
    for z in RAIL_Z:
        cylinder((PL, "metal", 0), x, z, KY, yb, 0.06, segs=5)
    pipe((PL, "metal", 0), (x, yb, RAIL_Z[0]), (x, yb, RAIL_Z[1]), 0.05, segs=4)
for x in (62.0, 66.5, 71.0, 75.0):
    light(PL, x, 3.0, -228.4, "amber", 5.0)
light(PL, 58.5, 3.0, -229.4, "pink", 5.0)
