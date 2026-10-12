"""The square's stone, laid last (plaza.py imports this after everything
that stands on the square), so every slab is lit by what stands near it.

Wet stone in big slabs (YRL74JmhVgk@18, @133: the road paint's wet, mirrored
surface in stone's colours): small flags along the shops under the board,
slabs round the hub, a diagonal carpet on the open stone south of it, long
narrow courses down the plaza street's side, the terraces' feet and floors
in their own bond, a ring of radial stones round the hub and the causeway
across it. Joints are open to a dark bed.

Each slab's corners carry the stone's tone under the light that reaches
them (plaza_parts.lit_at: every shine() and wash() set down before this
runs): bright under a lamp, in front of a shop window, before the board and
under the koi, and the night's blue between. The bake alone cannot do it:
away from the avenue the site lifts all the light it finds toward one
brightness.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza_hub import HX, HZ, RK, RO, CW, KW, STAIR, NSEG, STEP, at, BEDS, BED_R, BED_Y, bed_plan, in_bed
from ncw import props as P
from ncw.districts.plaza_square import X0, X1, Z0, Z1, G, TY, TX, TN, TS, COURT, SX

rs = random.Random(8900)
STONE = ((0.27, 0.28, 0.31), (0.27, 0.28, 0.31), (0.33, 0.34, 0.37), (0.44, 0.45, 0.48), (0.13, 0.135, 0.15))
PALE = ((0.3, 0.3, 0.32), (0.36, 0.36, 0.38), (0.42, 0.42, 0.45), (0.22, 0.22, 0.24))
KEY = (PL, "paint", 0)

for piece in rect_minus_disc(X0, X1, Z0, Z1, HX, HZ, RK - 0.02):
    up_poly((PL, "dark", 0), piece, G - 0.03)


def pave(x0, x1, z0, z1, depths=(2.4, 3.6), widths=(2.4, 4.8), y=G, tones=STONE, cut=(HX, HZ, RO)):
    z = z1
    while z > z0 + 0.3:
        d = min(rs.choice(depths), z - z0)
        if z - d - z0 < min(depths) * 0.6:
            d = z - z0
        x = x0
        while x < x1 - 0.3:
            w = min(rs.uniform(*widths), x1 - x)
            if x1 - (x + w) < widths[0] * 0.6:
                w = x1 - x
            t, k = rs.choice(tones), rs.uniform(0.86, 1.14)
            lit_slab(KEY, x + 0.03, x + w - 0.03, z - d + 0.03, z - 0.03, y, (t[0] * k, t[1] * k, t[2] * k), cut=cut)
            x += w
        z -= d


def court(x0, x1, z0, z1, d=2.0, b=0.5):
    """A carpet of stone laid on the diagonal in bands of three tones,
    inside a dark border (mH2wmyeiIpA@182's striped paving)."""
    for (a0, a1, c0, c1) in ((x0, x1, z0, z0 + b), (x0, x1, z1 - b, z1), (x0, x0 + b, z0 + b, z1 - b), (x1 - b, x1, z0 + b, z1 - b)):
        lit_slab(KEY, a0 + 0.02, a1 - 0.02, c0 + 0.02, c1 - 0.02, G, (0.16, 0.165, 0.19))
    inner = [(1, 0, x1 - b - 0.02), (-1, 0, -(x0 + b + 0.02)), (0, 1, z1 - b - 0.02), (0, -1, -(z0 + b + 0.02))]
    tones = ((0.42, 0.43, 0.46), (0.27, 0.28, 0.31), (0.16, 0.17, 0.19))
    h, g = d / 2, 0.035
    for i in range(int((x1 - x0) / h) + 2):
        for j in range(int((z1 - z0) / h) + 2):
            if (i + j) % 2:
                continue
            cx, cz = x0 + i * h, z0 + j * h
            piece = clip_planes([(cx - h + g, cz), (cx, cz - h + g), (cx + h - g, cz), (cx, cz + h - g)], inner)
            if len(piece) >= 3:
                t, k = tones[((i - j) // 2) % 3], rs.uniform(0.92, 1.08)
                lit_poly(KEY, piece, G, (t[0] * k, t[1] * k, t[2] * k))


for rect, depths, widths in (((X0, SX, Z0, -255.6), (1.6,), (1.6, 3.2)),
                             ((X0, SX, -255.6, COURT[2]), (2.4, 3.6), (2.4, 4.8)),
                             ((X0, COURT[0], COURT[2], COURT[3]), (2.4,), (2.4, 3.6)),
                             ((COURT[1], SX, COURT[2], COURT[3]), (2.4,), (1.3, 2.6)),
                             ((X0, SX, COURT[3], Z1), (1.2,), (2.4, 4.2)),
                             ((SX, X1, TS[1], Z1), (1.2,), (2.4, 4.2)),
                             ((SX, TX, STAIR[3], TS[1]), (2.4,), (2.4, 4.2)),
                             ((SX, TX, TS[0], STAIR[2]), (2.0, 3.0), (2.4, 4.2)),
                             ((SX, X1, TN[1], TS[0]), (2.0,), (2.0, 4.0)),
                             ((SX, TX, Z0, TN[1]), (2.4, 3.6), (2.4, 4.2))):
    pave(*rect, depths, widths)
court(*COURT)

# Round the hub: two courses of radial stones, each two sectors long, the
# courses breaking joint.
RM = (RK + RO) / 2
for course, (r0, r1) in enumerate(((RK, RM), (RM, RO))):
    tones = []
    for _ in range(NSEG // 2):
        t, k = rs.choice(STONE[1:4]), rs.uniform(0.86, 1.14)
        tones.append((t[0] * k, t[1] * k, t[2] * k))
    for i in range(NSEG):
        first = (i + course) % 2 == 0
        tone = tones[((i + course) // 2) % (NSEG // 2)]
        a0, a1 = i * STEP + (0.03 / r0 if first else 0.0), (i + 1) * STEP - (0.0 if first else 0.03 / r0)
        lit_poly(KEY, [at(r0 + 0.02, a0), at(r0 + 0.02, a1), at(r1 - 0.02, a1), at(r1 - 0.02, a0)], G, tone)

# The beds' lawn (plaza_hub.py built their kerbs, hedges and trees): turf in
# small pieces, each under the light that reaches it.
for a0, a1 in BEDS:
    for band in ((BED_R[0] + 0.18, BED_R[0] + 0.9), (BED_R[0] + 0.9, BED_R[1] - 0.95), (BED_R[1] - 0.95, BED_R[1] - 0.18)):
        for piece in bed_plan(a0 + 0.18 / BED_R[0], a1 - 0.18 / BED_R[0], *band, step=0.055):
            turf(piece, BED_Y - 0.03, rs)
for name, x, y, z, *_ in P.INSTANCES:
    if name not in ("tree_round", "grass_tuft", "hedge_soft") and y < 1.0 and in_bed(x, z):
        print(f"plaza: {name} stands in a hub bed at ({x:.1f}, {z:.1f})")
for (x, y, z, *_rest) in PEOPLE:
    if y < 1.0 and y > -1.0 and in_bed(x, z):
        print(f"plaza: someone stands in a hub bed at ({x:.1f}, {z:.1f})")

# The causeway's own slabs, across the well.
rim = disc_planes(HX, HZ, RK, NSEG)
for k in range(5):
    t, kk = rs.choice(STONE), rs.uniform(0.86, 1.14)
    for j in range(4):
        xa, xb = HX - 17.0 + k * 6.8 + j * 1.7, HX - 17.0 + k * 6.8 + (j + 1) * 1.7
        piece = clip_planes([(xa + (0.03 if j == 0 else 0.0), CW[0] + KW), (xb - (0.03 if j == 3 else 0.0), CW[0] + KW),
                             (xb - (0.03 if j == 3 else 0.0), CW[1] - KW), (xa + (0.03 if j == 0 else 0.0), CW[1] - KW)], rim)
        if len(piece) >= 3:
            lit_poly(KEY, piece, G, (t[0] * kk, t[1] * kk, t[2] * kk))

# The terraces' floors: pale flags in courses across them.
for (za, zb) in (TN, TS):
    pave(TX + 0.08, X1 - 0.08, za + 0.08, zb - 0.08, (2.0,), (1.6, 3.2), y=TY + 0.012, tones=PALE, cut=None)
