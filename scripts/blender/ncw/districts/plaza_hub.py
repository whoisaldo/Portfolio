"""The hub: the square's middle is glass (PzkEqhVByw4@86, M6VoEJdoHi8@8, and
from the air the lit disc of ax5YUmkWf_Y@9).

A round well 32 m across, as wide as the square leaves between the canyon's
lane and the terraces' stair, roofed in triangulated glazing on dark bars:
every pane clear glass (dark, blue-teal, giving back the sky), a steel disc
at each joint, and through all of it the concourse below (its shop windows
round the wall, lamps, trees, carts, people). The promenade
crosses it on a causeway (the walkers' line at z -230 stays at ground
level), a kerb and a glass balustrade run round both halves, a ring of
radial paving and a dashed line of amber lie round that, and six spokes of
white light run out over the square's slabs to its edges. Over it two hologram koi turn
(YRL74JmhVgk@18; src/world/plaza-koi.js draws them, circling this centre at
y 14.5 and y 30, fins down to about y 6): nothing solid stands over the hub
above 2 m, and the square takes their light: amber and orange pools on the
ring's paving, the kerb and the glazing's bars, and low on the fronts that
face the hub.
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
YG = 0.4                         # the glazing at its rim
# The glazing swells to a shallow dome (PzkEqhVByw4@86). How far: the site's
# clear glass is a mirror of the street only while it lies within a metre of
# the ground and near flat (materials.js, clearGlass), so the dome rises
# 0.55 m, each pane tilted its own way and giving back its own piece of the
# koi and the signs. (No camera's line stops it there: the Work shot's frame
# passes 7 m over it and the braindance's low camera looks over it at 8 m.)
DOME = 0.55
# Round it, outside the walk at the rail: beds of lawn inside stone kerbs, a
# low hedge along their outer edge, round trees in them. Angles as at()
# takes them (0 east, a quarter turn south). The gaps: the causeway's two
# ends, the stair's corner, and a way through to the rail between every two
# beds.
BED_R = (18.8, 20.8)
BEDS = ((1.03, 1.43), (1.71, 2.25), (2.47, 2.72), (3.16, 3.82), (4.04, 4.57), (4.85, 5.39), (5.61, 6.12))
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
# Round it: a ring of radial paving (plaza_paving.py lays it), a dashed line
# of light at its outer edge, spokes of light out over the slabs to the
# square's edges.
# ---------------------------------------------------------------------------
# (The line round it is the koi's amber, in dashes: every other stone.)
for i in range(0, NSEG, 2):
    a0, a1 = i * STEP + 0.012, (i + 1) * STEP - 0.012
    up_poly((PL, "neon_amber", 0), [at(RO + 0.05, a0), at(RO + 0.05, a1), at(RO + 0.17, a1), at(RO + 0.17, a0)], G + 0.012)


def free(x, z):
    """Open paving: not the stair, not past the square's edges, and east of
    the terraces' foot only along the passage between them."""
    if STAIR[0] - 0.3 < x < STAIR[1] + 0.3 and STAIR[2] - 0.3 < z < STAIR[3] + 0.3:
        return False
    if x > 91.6:
        return x < 107.4 and -233.6 < z < -226.4
    return x > 48.7 and -260.2 < z < -191.9


# (No spokes of white light out over the slabs: from the air they were
# stray strips across the water.)

# ---------------------------------------------------------------------------
# The kerb round each half of the well.
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

# (The kerb is stones a little over two metres long: an open joint between
# them across the top and down the face, a lip along the top's outer edge,
# damp under some joints, and at its foot a slot drain under a steel grating
# round the whole of it.)
STONE_LIP = (0.2, 0.2, 0.215, 1.0)
for i in range(NSEG):
    a0, a1 = i * STEP, (i + 1) * STEP
    for outer in OUTER:
        s = seg_clip(at(RK + 0.035, a1), at(RK + 0.035, a0), outer)
        if s:
            vwall((PL, "trim", 1), s[0], s[1], KY - 0.09, KY + 0.004, STONE_LIP)
            piece = clip_planes([at(RK - 0.02, a0), at(RK - 0.02, a1), at(RK + 0.035, a1), at(RK + 0.035, a0)], outer)
            if piece:
                up_poly((PL, "trim", 1), piece, KY + 0.004, STONE_LIP)
        piece = clip_planes([at(RK + 0.06, a0), at(RK + 0.06, a1), at(RK + 0.3, a1), at(RK + 0.3, a0)], outer)
        if piece:
            up_poly((PL, "metal", 1), piece, G + 0.004, scale=0.5)
        for k in range(3):
            b0, b1 = a0 + STEP * (k + 0.12) / 3, a0 + STEP * (k + 0.88) / 3
            piece = clip_planes([at(RK + 0.11, b0), at(RK + 0.11, b1), at(RK + 0.25, b1), at(RK + 0.25, b0)], outer)
            if piece:
                up_poly((PL, "dark", 1), piece, G + 0.008)
        if i % 2 == 0:
            d = 0.012 / RK
            piece = clip_planes([at(RP, a0 - d), at(RP, a0 + d), at(RK + 0.036, a0 + d), at(RK + 0.036, a0 - d)], outer)
            if piece:
                up_poly((PL, "dark", 1), piece, KY + 0.006)
                s = seg_clip(at(RK + 0.037, a0 + d), at(RK + 0.037, a0 - d), outer)
                if s:
                    vwall((PL, "dark", 1), s[0], s[1], G, KY)
                if rh.random() < 0.45:
                    # Damp down the face under the joint.
                    w = rh.uniform(0.05, 0.12) / RK
                    p0, p1, p2 = at(RK + 0.004, a0 + w), at(RK + 0.004, a0 - w), at(RK + 0.004, a0 + rh.uniform(-w, w))
                    yb = G + rh.uniform(0.0, 0.14)
                    poly((PL, "trim", 1), [(p0[0], KY - 0.09, p0[1]), (p1[0], KY - 0.09, p1[1]), (p2[0], yb, p2[1])], [(0, 1), (1, 1), (0.5, 0)],
                         (0.045, 0.04, 0.036, 1.0))

# ---------------------------------------------------------------------------
# The causeway: the promenade's own slabs on a deck across the well, a kerb
# down each side, columns under it, its soffit lit.
# ---------------------------------------------------------------------------
rim = disc_planes(HX, HZ, RK, NSEG)
well = disc_planes(HX, HZ, RP, NSEG)
# (Its deck under the slabs lies under the ground's plane, as the square's
# bed does, out of the road's mirror: plaza_paving.py.)
up_poly((PL, "dark", 0), clip_planes([(HX - 17, CW[0]), (HX + 17, CW[0]), (HX + 17, CW[1]), (HX - 17, CW[1])], rim), -0.06)
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


def bed_plan(a0, a1, r0, r1, step=0.07):
    """A bed's plan in pieces along its arc."""
    n = max(1, int(math.ceil((a1 - a0) / step)))
    return [[at(r0, a0 + (a1 - a0) * i / n), at(r0, a0 + (a1 - a0) * (i + 1) / n), at(r1, a0 + (a1 - a0) * (i + 1) / n), at(r1, a0 + (a1 - a0) * i / n)]
            for i in range(n)]


BED_Y = G + 0.3
KERB = (PL, "concrete", 0)
rbed = random.Random(8650)
for bi, (a0, a1) in enumerate(BEDS):
    r0, r1 = BED_R
    hue = ("teal", "green", "yellow", "teal", "green", "teal", "yellow")[bi % 7]
    for piece in bed_plan(a0, a1, r0, r1):
        # The kerb: its face to the hub and to the square, its top.
        vwall(KERB, piece[1], piece[0], G, BED_Y)
        vwall(KERB, piece[3], piece[2], G, BED_Y)
    for piece in bed_plan(a0, a1, r0, r0 + 0.18) + bed_plan(a0, a1, r1 - 0.18, r1):
        up_poly(KERB, piece, BED_Y, scale=1.5)
    for a, flip in ((a0, False), (a1, True)):
        e0, e1 = at(r0, a), at(r1, a)
        vwall(KERB, *((e0, e1) if flip else (e1, e0)), G, BED_Y)
        d = (0.18 / r0) * (-1 if flip else 1)
        up_poly(KERB, [at(r0 + 0.18, a), at(r1 - 0.18, a), at(r1 - 0.18, a + d), at(r0 + 0.18, a + d)], BED_Y, scale=1.5)
    # A line of light under the kerb's lip, toward the rail.
    for piece in bed_plan(a0 + 0.01, a1 - 0.01, r0 - 0.012, r0 - 0.012, step=0.16):
        vwall((PL, "glow", 0), piece[1], piece[0], BED_Y - 0.1, BED_Y - 0.06, dim(hue, 0.6))
    # The hedge along the outer edge, in two-metre lengths round the arc.
    n = max(1, int(round((a1 - a0) * (r1 - 0.55) / 2.0)))
    for i in range(n):
        b0, b1 = a0 + 0.03 + (a1 - a0 - 0.06) * i / n, a0 + 0.03 + (a1 - a0 - 0.06) * (i + 1) / n
        hedge_run(*at(r1 - 0.55, b0), *at(r1 - 0.55, b1), BED_Y - 0.04, 0.62)
    # Round trees down its middle (lower north of z -250, under the Work
    # shot's frame), each lit from its foot; grass in clumps.
    n = max(1, int(round((a1 - a0) * 19.6 / 5.2)))
    for i in range(n):
        x, z = at(19.55, a0 + (a1 - a0) * (i + 0.5) / n + rbed.uniform(-0.02, 0.02))
        P.place("tree_round", x, BED_Y - 0.02, z, rbed.uniform(0, 6.28), sy=(0.86 if z < -249.0 else rbed.uniform(0.95, 1.05)), sxz=rbed.uniform(0.9, 1.05), district=PL)
        shine(x, 1.4, z, hue, 3.2)
    for _ in range(int((a1 - a0) * 19.6 * 2.6)):
        x, z = at(rbed.uniform(r0 + 0.3, r1 - 0.9), rbed.uniform(a0 + 0.02, a1 - 0.02))
        P.place("grass_tuft", x, BED_Y, z, rbed.uniform(0, 6.28), sy=rbed.uniform(0.7, 1.5), sxz=rbed.uniform(0.8, 1.3), district=PL)


def in_bed(x, z, pad=0.25):
    r, a = math.hypot(x - HX, z - HZ), math.atan2(z - HZ, x - HX) % math.tau
    return BED_R[0] - pad < r < BED_R[1] + pad and any(a0 - pad / r < a < a1 + pad / r for a0, a1 in BEDS)


def lobe_loop(r, zline, south):
    """Round one half of the well at radius r and back along the causeway."""
    t = math.asin((zline - HZ) / r)
    a0, a1 = (t, math.pi - t) if south else (math.pi - t, math.tau + t)
    inner = [k * STEP for k in range(2 * NSEG) if a0 + 0.02 < k * STEP < a1 - 0.02]
    return [at(r, a) for a in [a0] + inner + [a1]]


RB = RK - KW
RAIL_Z = (CW[0] + KW / 2, CW[1] - KW / 2)
balustrade(lobe_loop(RB, RAIL_Z[1], True), KY, colour="amber", close=True, k=0.45)
balustrade(lobe_loop(RB, RAIL_Z[0], False), KY, colour="amber", close=True, k=0.45)

# ---------------------------------------------------------------------------
# The glazing (PzkEqhVByw4@86): a lattice of triangles over each half, every
# pane clear glass, on steel bars a quarter of a metre deep with a disc at
# each joint, deep beams under it running in to the middle.
# ---------------------------------------------------------------------------
S = 2.6
VX, VZ = S / 2, S * math.sqrt(3) / 2
BAR_D = 0.25
glass = disc_planes(HX, HZ, RP - 0.03, NSEG)
inside = disc_planes(HX, HZ, RP - 0.35, NSEG)


def lat(a, b):
    return (HX + 0.4 + a * S + b * VX, HZ + 0.3 + b * VZ)


def gy(x, z):
    """The dome's height over (x, z)."""
    return YG + DOME * max(0.0, 1.0 - ((x - HX) ** 2 + (z - HZ) ** 2) / (RP * RP))


def face3(key, pts, col=(1, 1, 1, 1), up=1.0):
    """A flat polygon of (x, y, z) points, wound to face up (or down)."""
    (ax, ay, az), (bx_, by_, bz_), (cx, cy, cz) = pts[0], pts[1], pts[2]
    ny = (bz_ - az) * (cx - ax) - (bx_ - ax) * (cz - az)
    if ny * up < 0:
        pts = list(reversed(pts))
    poly(key, pts, [(p[0] / 2.0, -p[2] / 2.0) for p in pts], col)


def bar3(key, p, q, w, h):
    """A steel bar whose top runs from p to q (x, y, z), w wide, h deep:
    its top and both flanks."""
    dx, dz = q[0] - p[0], q[2] - p[2]
    length = math.hypot(dx, dz)
    if length < 0.08:
        return
    ox, oz = -dz / length * w / 2, dx / length * w / 2
    a, b, c, d = (p[0] - ox, p[1], p[2] - oz), (q[0] - ox, q[1], q[2] - oz), (q[0] + ox, q[1], q[2] + oz), (p[0] + ox, p[1], p[2] + oz)
    face3(key, [a, b, c, d])
    for (e, f), sx, sz in (((a, b), -ox, -oz), ((d, c), ox, oz)):
        pts = [e, f, (f[0], f[1] - h, f[2]), (e[0], e[1] - h, e[2])]
        nx = (pts[1][1] - pts[0][1]) * (pts[2][2] - pts[0][2]) - (pts[1][2] - pts[0][2]) * (pts[2][1] - pts[0][1])
        nz = (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[1][1] - pts[0][1]) * (pts[2][0] - pts[0][0])
        if nx * sx + nz * sz < 0:
            pts.reverse()
        poly(key, pts, [(0, 0), (length, 0), (length, h), (0, h)])


def on_plane(tri):
    """The height over (x, z) of the pane through three lattice nodes."""
    (ax, az), (bx_, bz_), (cx, cz) = tri
    ay, by_, cy = gy(ax, az), gy(bx_, bz_), gy(cx, cz)
    det = (bx_ - ax) * (cz - az) - (cx - ax) * (bz_ - az)
    gx = ((by_ - ay) * (cz - az) - (cy - ay) * (bz_ - az)) / det
    gz = ((bx_ - ax) * (cy - ay) - (cx - ax) * (by_ - ay)) / det
    return lambda x, z: ay + gx * (x - ax) + gz * (z - az)


for lobe, edge in zip(LOBES, ((0.0, -1.0, -(CW[1] + 0.3)), (0.0, 1.0, CW[0] - 0.3))):
    planes = glass + lobe
    for a in range(-18, 18):
        for b in range(-9, 9):
            p00, p10, p01, p11 = lat(a, b), lat(a + 1, b), lat(a, b + 1), lat(a + 1, b + 1)
            if min(math.hypot(p[0] - HX, p[1] - HZ) for p in (p00, p10, p01, p11)) > RP + S:
                continue
            for tri in ((p00, p10, p01), (p10, p11, p01)):
                piece = clip_planes(tri, planes)
                if len(piece) >= 3:
                    v = rh.uniform(0.8, 1.0)
                    h = on_plane(tri)
                    face3((PL, "clearglass", 0), [(x, h(x, z), z) for x, z in piece], (v, v, v, 1.0))
            for p, q in ((p00, p10), (p00, p01), (p10, p01)):
                s = seg_clip(p, q, planes)
                if s:
                    bar3((PL, "board_frame", 0), (s[0][0], gy(*s[0]) + 0.05, s[0][1]), (s[1][0], gy(*s[1]) + 0.05, s[1][1]), 0.1, BAR_D)
            # The joint: a steel disc proud of the bars (a phone goes without).
            if all(nx * p00[0] + nz * p00[1] <= d for nx, nz, d in inside + [edge]):
                cylinder((PL, "metal", 1), p00[0], p00[1], gy(*p00) + 0.05, gy(*p00) + 0.1, 0.2, segs=6)
    for i in range(16):
        a = (i + 0.5) * math.tau / 16
        s = seg_clip(at(1.2, a), at(RP - 0.05, a), lobe)
        if s:
            bar3((PL, "board_frame", 0), (s[0][0], gy(*s[0]) - 0.2, s[0][1]), (s[1][0], gy(*s[1]) - 0.2, s[1][1]), 0.3, 0.42)
# Where the dome meets the causeway its edge stands over the kerb: a steel
# upstand along each side, as high as the glass is there, a line of light
# along its head.
for z, south in ((CW[0], False), (CW[1], True)):
    half = math.sqrt(RP * RP - (z - HZ) ** 2)
    m = 14
    for j in range(m):
        xa, xb = HX - half + 2 * half * j / m, HX - half + 2 * half * (j + 1) / m
        ya, yb = gy(xa, z) + 0.07, gy(xb, z) + 0.07
        pts = [(xa, KY - 0.02, z), (xb, KY - 0.02, z), (xb, yb, z), (xa, ya, z)]
        if south:
            pts = [pts[1], pts[0], pts[3], pts[2]]
        poly((PL, "board_frame", 0), pts, [(0, 0), (1, 0), (1, 1), (0, 1)])
        d = 0.012 if south else -0.012
        quad((PL, "glow", 1), *( [(xb, yb - 0.05, z - d), (xa, ya - 0.05, z - d), (xa, ya - 0.015, z - d), (xb, yb - 0.015, z - d)] if south else
                                 [(xa, ya - 0.05, z - d), (xb, yb - 0.05, z - d), (xb, yb - 0.015, z - d), (xa, ya - 0.015, z - d)]), col=dim("teal", 0.5))

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
        # (One warm pale stone, each slab a little its own: seen through the
        # glass it is a lit floor, not a pane's colour.)
        kk = rh.uniform(0.86, 1.12) * edge
        tone = (0.3 * kk, 0.27 * kk, 0.225 * kk, 1.0)
        up_poly((PL, "glow", 0), [at(r0, a0 + g0), at(r0, a1 - g0), at(r1, a1 - g0), at(r1, a0 + g0)] if j else [at(0.0, 0.0), at(r1, a0 + g0), at(r1, a1 - g0)],
                FLOOR, tone)
for r, colour in ((6.0, "teal"), (11.2, "cyan")):
    ring((PL, "glow", 0), HX, HZ, r, r + 0.14, FLOOR + 0.012, n=32, col=dim(colour, 0.6))
for i in range(8):
    a = i * math.tau / 8 + 0.2
    (ax, az), (bx_, bz_) = at(6.3, a), at(11.0, a)
    px, pz = -math.sin(a) * 0.06, math.cos(a) * 0.06
    up_poly((PL, "glow", 0), [(ax - px, az - pz), (bx_ - px, bz_ - pz), (bx_ + px, bz_ + pz), (ax + px, az + pz)], FLOOR + 0.012, dim("teal", 0.5))
WINDOWS = (("amber", 0.34), ("white", 0.5), ("teal", 0.32), ("green", 0.24), ("amber", 0.42), ("cyan", 0.26))
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
# The koi's light (they turn overhead, orange and gold): pools on the ring's
# paving, on the kerb, on the glazing's bars, and the same warm wash over
# the whole of the hub and a little way out.
for i in range(12):
    a = (i + 0.5) * math.tau / 12
    x, z = at(RK + 2.0, a)
    shine(x, 1.2, z, "amber", 6.5 if i % 2 else 4.5)
    if i % 2 == 0:
        shine(x, 1.2, z, "red", 1.2)
for i in range(8):
    a = i * math.tau / 8 + 0.2
    x, z = at(RK - 0.45, a)
    if abs(z - (CW[0] + CW[1]) / 2) > 4.0:
        light(PL, x, 0.9, z, "amber", 3.0)
for r, n in ((5.5, 4), (11.5, 8)):
    for i in range(n):
        a = (i + 0.5) * math.tau / n
        x, z = at(r, a)
        if abs(z - (CW[0] + CW[1]) / 2) > 4.2:
            light(PL, x, 0.9, z, "amber" if (i + n) % 3 else "yellow", 4.0)
for x in (60.0, 66.5, 73.5, 80.0):
    shine(x, 0.8, (CW[0] + CW[1]) / 2, "amber", 4.0)
