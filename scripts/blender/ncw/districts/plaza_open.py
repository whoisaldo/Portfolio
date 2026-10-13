"""Corpo Plaza's open stone and its edges, filled (KvMY1uzSC1E@43,
Fn9gKhU_2_Q@81, YRL74JmhVgk@18): the square's south half carries a cafe of
parasol tables, a round bench under a tree, hologram pillars and the people
at them; the causeway over the hub is a deck with lines of light in it,
pale bands, plates and lit rail feet, people at its rails; the south
terrace has parasol tables; and B2's storeys over the south street are
rooms, balconies and units, not a plain wall.

Kept clear: the walkers' lines (z -230, z -196) by a metre, the braindance's
fixed camera at (90, 2.2, -199) and its view south-east, the low camera's way
up x 76..86 (nothing there over 2 m), the koi's air over the hub (nothing
over 6 m within 22 m of its centre), the Work shot's frame (nothing north of
z -232 here). Built before plaza_paving, so its lamps light the stone.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza_hub import HX, HZ, RK, KY, CW, KW
from ncw.districts.plaza_square import G, TY

ro = random.Random(9300)
SEAT = 0.47


def table(cx, cz, y, seats, hues, lamp="amber", who=2, r=1.45, top=2.65):
    """A round table under a parasol, chairs round it, `who` of them taken."""
    cylinder((PL, "metal", 1), cx, cz, y, y + 0.72, 0.04, segs=5)
    cylinder((PL, "trim", 0), cx, cz, y + 0.72, y + 0.76, 0.42, segs=10, col=(0.2, 0.18, 0.16, 1.0))
    a0 = ro.uniform(0, math.tau)
    taken = 0
    for i in range(seats):
        a = a0 + i * math.tau / seats + ro.uniform(-0.2, 0.2)
        px, pz = cx + 0.78 * math.sin(a), cz + 0.78 * math.cos(a)
        oriented_box((PL, "trim", 0), px, y + 0.22, pz, 0.42, 0.44, 0.42, a, scale=0.5, col=(0.12, 0.12, 0.13, 1.0))
        bx_, bz_ = px + 0.2 * math.sin(a), pz + 0.2 * math.cos(a)
        oriented_box((PL, "trim", 0), bx_, y + 0.66, bz_, 0.42, 0.44, 0.05, a, scale=0.5, col=(0.12, 0.12, 0.13, 1.0))
        if taken < who:
            stand(px, pz, a + math.pi, "sit", y=y + SEAT)
            taken += 1
    parasol(cx, cz, y, r=r, top=top, hues=hues, lamp=lamp)
    shine(cx, y + 1.2, cz, lamp, 4.0)


def holo_pillar(cx, cz, y, h, hue, hue2="white", r=0.55):
    """A hologram column (Fn9gKhU_2_Q@81): a lit core on a round plinth,
    rings of light up it, its light on the stone."""
    cylinder((PL, "concrete", 0), cx, cz, y, y + 0.35, r + 0.35, segs=12)
    ring((PL, "glow", 0), cx, cz, r + 0.2, r + 0.32, y + 0.36, n=16, col=dim(hue, 0.9))
    cylinder((PL, "glow", 0), cx, cz, y + 0.35, y + h, 0.07, segs=6, col=dim(hue2, 0.6))
    holo_wrap(cx, cz, y + 0.6, y + h, r, hue, hue2)
    shine(cx, y + 1.0, cz, hue if hue in TINT else "white", 5.0)
    light(PL, cx, y + h * 0.6, cz, hue, 3.0)


# ---------------------------------------------------------------------------
# The square's south half.
# ---------------------------------------------------------------------------
# A cafe on the open stone between the carpet and the hub's beds.
for (cx, cz, hues, lamp, who) in ((60.4, -209.4, ("yellow", "white"), "amber", 2), (67.4, -211.4, ("teal", "white"), "white", 3),
                                  (70.9, -209.2, ("red", "white"), "amber", 1)):
    table(cx, cz, G, 4, hues, lamp, who)
for (px, pz, yaw, pose) in ((68.8, -213.1, 2.4, "talk"), (69.5, -213.7, 2.4 + math.pi, "talk"), (71.6, -211.9, -1.2, "phone"),
                            (60.6, -212.2, 0.6, "carry")):
    stand(px, pz, yaw, pose, y=G)
holo_pillar(74.2, -212.0, G, 4.6, "cyan")
# A round bench under a tree, people on it facing every way, a pillar by it.
BX, BZ = 67.6, -202.0
for s in range(12):
    a0, a1 = s * math.tau / 12, (s + 1) * math.tau / 12
    for (rr0, rr1, y0, y1, col) in ((1.05, 1.55, G, G + 0.44, (0.36, 0.35, 0.33, 1.0)), (1.05, 1.15, G + 0.44, G + 0.9, (0.3, 0.29, 0.27, 1.0))):
        quad((PL, "trim", 0), (BX + rr1 * math.cos(a1), y0, BZ + rr1 * math.sin(a1)), (BX + rr1 * math.cos(a0), y0, BZ + rr1 * math.sin(a0)),
             (BX + rr1 * math.cos(a0), y1, BZ + rr1 * math.sin(a0)), (BX + rr1 * math.cos(a1), y1, BZ + rr1 * math.sin(a1)), col=col)
        up_poly((PL, "trim", 0), [(BX + rr0 * math.cos(a0), BZ + rr0 * math.sin(a0)), (BX + rr1 * math.cos(a0), BZ + rr1 * math.sin(a0)),
                                  (BX + rr1 * math.cos(a1), BZ + rr1 * math.sin(a1)), (BX + rr0 * math.cos(a1), BZ + rr0 * math.sin(a1))], y1, col)
ring((PL, "glow", 0), BX, BZ, 1.56, 1.62, G + 0.08, n=24, col=dim("amber", 0.7))
turf(ngon(BX, BZ, 1.05, 12), G + 0.86, ro)
P.place("tree_round", BX, G + 0.86, BZ, 1.1, sy=0.92, district=PL)
for k, (a, pose) in enumerate(((0.3, "sit"), (1.4, "sit"), (2.2, "sit"), (3.7, "sit"), (4.9, "sit"))):
    stand(BX + 1.35 * math.cos(a), BZ + 1.35 * math.sin(a), math.atan2(math.cos(a), math.sin(a)), pose, y=G + SEAT)
stand(70.6, -200.4, -2.0, "phone", y=G)
stand(64.5, -203.4, 0.9, "talk", y=G)
stand(65.2, -202.7, 0.9 + math.pi, "talk", y=G)
shine(BX, 0.8, BZ + 2.2, "amber", 4.0)
holo_pillar(75.1, -203.4, G, 4.2, "teal", "yellow")
# On the low camera's way up to the board (x 76..86, nothing over 2 m):
# a knot of three, a man with a bag going the other way.
for (px, pz, yaw, pose) in ((79.6, -201.8, 0.4, "talk"), (80.4, -202.4, 0.4 + math.pi, "talk"), (80.6, -201.2, -1.9, "phone"),
                            (82.2, -209.6, 2.9, "carry")):
    stand(px, pz, yaw, pose, y=G)

# ---------------------------------------------------------------------------
# The causeway: lines of light along its edges, a pale band across it every
# 6.8 m with a plate in its middle, the glass's foot lit so each rail reads
# as glass, and people at the rails (the walkers keep its middle).
# ---------------------------------------------------------------------------
Z0, Z1 = CW[0] + KW, CW[1] - KW
for z in (Z0 + 0.35, Z1 - 0.35):
    half = math.sqrt(RK * RK - (z - HZ) ** 2) - 0.6
    gline("teal", HX - half, z, HX + half, z, G + 0.012, w=0.07)
for k in range(-2, 3):
    x = HX + k * 6.8
    up_poly((PL, "trim", 0), [(x - 0.3, Z0 + 0.6), (x + 0.3, Z0 + 0.6), (x + 0.3, Z1 - 0.6), (x - 0.3, Z1 - 0.6)], G + 0.011, (0.42, 0.41, 0.4, 1.0))
    cylinder((PL, "metal", 1), x, (Z0 + Z1) / 2, G, G + 0.025, 0.42, segs=12)
    for z in (Z0 + 0.35, Z1 - 0.35):
        box((PL, "neon_white", 0), x - 0.08, x + 0.08, G + 0.006, G + 0.03, z - 0.08, z + 0.08, scale=0.5)
for z, dz in ((CW[0] + KW / 2, 0.06), (CW[1] - KW / 2, -0.06)):
    half = math.sqrt((RK - KW) ** 2 - (z - HZ) ** 2)
    box((PL, "glow", 0), HX - half + 0.3, HX + half - 0.3, KY, KY + 0.03, min(z + dz, z + dz * 2.5), max(z + dz, z + dz * 2.5), scale=1.0,
        col=dim("amber", 0.4))
for pts, face in (([(55.6, -231.9), (56.4, -232.05)], math.pi), ([(69.8, -231.95), (70.7, -232.1), (71.5, -231.8)], math.pi),
                  ([(82.6, -228.1), (83.4, -227.95)], 0.0), ([(62.8, -228.05), (63.6, -228.2), (64.4, -228.0)], 0.0)):
    for i, (x, z) in enumerate(pts):
        if i < 2:
            ox, oz = pts[1 - i]
            stand(x, z, math.atan2(ox - x, oz - z) + ro.uniform(-0.2, 0.2), "talk", y=G)
        else:
            stand(x, z, face + ro.uniform(-0.4, 0.4), ro.choice(("idle", "phone", "lean")), y=G)
stand(74.6, -231.3, 1.5, "phone", y=G)

# ---------------------------------------------------------------------------
# The south terrace's floor: parasol tables between its benches and palms,
# and who sits at them.
# ---------------------------------------------------------------------------
for (cx, cz, hues, who) in ((95.6, -212.4, ("teal", "white"), 2), (96.0, -220.6, ("yellow", "white"), 2)):
    table(cx, cz, TY, 3, hues, "amber", who, r=1.3, top=TY + 2.5)
stand(99.6, -223.2, -0.8, "idle", y=TY + 0.02)
stand(95.0, -217.2, 1.3, "phone", y=TY + 0.02)

# ---------------------------------------------------------------------------
# B2's two storeys over the south street (z -10): rooms with their lights
# on or off, curtains and blinds, balconies with rails and plants on the
# upper floor, units under some sills, a down pipe, and two columns of type
# on brackets. East of x 66: the lane's end of this face is in the hero's
# wet road and keeps the wall it had.
# ---------------------------------------------------------------------------
F2 = B.Face("+z", -10.0, 52.0, 108.0)
s0, s1 = 14.4, 55.6
WALL = (0.17, 0.085, 0.08, 1.0)
F2.quad((PL, "trim", 0), s0, s1, SHOP_H + 0.45, 11.3, 0.03, col=WALL)
for y0 in (SHOP_H + 0.45, 8.0, 11.3 - 0.12):
    F2.box((PL, "trim", 0), s0, s1, y0 - 0.06, y0 + 0.06, 0.03, 0.14, col=(0.24, 0.2, 0.19, 1.0), scale=2.0)
rb2 = random.Random(9350)
for floor, (fy, top) in enumerate(((SHOP_H + 0.45, 8.0), (8.0, 11.3))):
    s = s0 + 0.9
    while s + 1.6 < s1 - 0.5:
        w, h = 1.6, 1.75
        wy = fy + 0.85
        F2.box((PL, "trim", 0), s - 0.08, s + w + 0.08, wy - 0.08, wy + h + 0.08, 0.03, 0.09, col=(0.08, 0.07, 0.07, 1.0), scale=1.0)
        k = rb2.random()
        if k < 0.2:
            col = (0.02, 0.022, 0.03, 1.0)
        else:
            warm = rb2.random() < 0.7
            kk = rb2.uniform(0.45, 1.0)
            col = (0.62 * kk, 0.38 * kk, 0.18 * kk, 1.0) if warm else (0.3 * kk, 0.36 * kk, 0.46 * kk, 1.0)
        F2.quad((PL, "glow", 0), s, s + w, wy, wy + h, 0.1, col=col)
        style = rb2.random()
        if k >= 0.2 and style < 0.35:
            # Blinds: slats across, half drawn.
            drop = rb2.uniform(0.3, 1.0) * h
            yy = wy + h - 0.1
            while yy > wy + h - drop:
                F2.quad((PL, "glow", 0), s, s + w, yy - 0.05, yy, 0.105, col=tuple(c * 0.45 for c in col[:3]) + (1.0,))
                yy -= 0.12
        elif k >= 0.2 and style < 0.65:
            # Curtains drawn to the sides.
            cw = rb2.uniform(0.25, 0.5)
            ccol = tuple(c * 0.35 for c in col[:3]) + (1.0,)
            F2.quad((PL, "glow", 0), s, s + cw, wy, wy + h, 0.105, col=ccol)
            F2.quad((PL, "glow", 0), s + w - cw * rb2.uniform(0.6, 1.2), s + w, wy, wy + h, 0.105, col=ccol)
        F2.box((PL, "trim", 0), s - 0.1, s + w + 0.1, wy - 0.12, wy - 0.04, 0.03, 0.22, col=(0.3, 0.28, 0.26, 1.0), scale=1.0)
        if floor == 1 and rb2.random() < 0.45:
            # A balcony: a slab, a rail of bars, a plant or a chair on it.
            F2.box((PL, "concrete", 0), s - 0.35, s + w + 0.35, fy - 0.02, fy + 0.14, 0.03, 0.95, scale=1.5)
            F2.box((PL, "metal", 1), s - 0.35, s + w + 0.35, fy + 1.0, fy + 1.05, 0.88, 0.95, scale=0.5)
            for b in range(int((w + 0.7) / 0.14) + 1):
                sb = s - 0.35 + b * 0.14
                F2.box((PL, "metal", 1), sb - 0.012, sb + 0.012, fy + 0.14, fy + 1.0, 0.9, 0.93, scale=0.5)
            px_, _, pz_ = F2.p(F2.at(s + rb2.uniform(0.2, w - 0.2)), 0.0, 0.5)
            P.place("shrub", px_, fy + 0.14, pz_, rb2.uniform(0, 6.28), sy=1.3, district=PL)
        elif rb2.random() < 0.3:
            px_, _, pz_ = F2.p(F2.at(s + w / 2), 0.0, 0.03)
            P.place("ac_wall", px_, wy - 0.6, pz_, 0.0, district=PL)
        s += w + rb2.uniform(1.3, 1.9)
px_, _, pz_ = F2.p(F2.at(34.6), 0.0, 0.03)
P.place("pipe_v", px_, SHOP_H, pz_, 0.0, sy=1.6, district=PL)
for sx, size, kk in ((24.0, "bm", 1.55), (47.0, "bm", 1.55)):
    out = 0.18 + ST_SIZES[size][0] * kk / 2
    px_, _, pz_ = F2.p(F2.at(sx), 0.0, out)
    big_sign(size, kk, px_, SHOP_H + 0.6 + ST_SIZES[size][1] * kk / 2, pz_, math.pi / 2)
    for yy in (SHOP_H + 0.9, SHOP_H + ST_SIZES[size][1] * kk):
        F2.box((PL, "metal", 1), sx - 0.05, sx + 0.05, yy, yy + 0.1, 0.03, 0.2)
