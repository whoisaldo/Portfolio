"""What Corpo Plaza's pavements carry, and who stands on them.

The x 120 road, the plaza street and the south street are streets.py's
(their lamps, signals and crossings too). Along the plaza's own frontages
this adds what a walker passes: cube bollards and planters at the kerb,
bins, hydrants, cameras, short lamps between the tall ones, vending
machines by the doors (few kinds: every prototype's material is a draw); the blocks' corners carry big signs turned
45 degrees to both streets, the towers tall blades; and people stand about:
at doors, against walls, in pairs talking, on their phones under the signs.

Kept clear: the walkers' two lines on every pavement (1.4 m and 3.0 m from
the lot line) and the walk camera's between them (2.5 m): what stands is
within 0.7 m of the lot line or in the kerb's last 0.6 m.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403

G = 0.15
POSES_WALL = ("lean", "lean", "phone", "smoke", "idle")
# What the streets have already stood at their kerbs (lamps, signals,
# poles): nothing of the plaza's is set down within three metres of one, so
# a walker never passes a knot of posts.
STREET_POSTS = [(i[1], i[3]) for i in P.INSTANCES if i[0] in ("lamp_sodium", "traffic_light", "signal_box", "pole_utility", "phone_booth")]


def free_kerb(x, z, reach=3.0):
    return not any(abs(px - x) < 1.6 and abs(pz - z) < reach or abs(pz - z) < 1.6 and abs(px - x) < reach for px, pz in STREET_POSTS)


def frontage(axis, lot, out, a0, a1, seed, people=1.6, skip=(), palms=True, wall=True):
    """Dress the pavement in front of a frontage. `axis` "x": the lot line
    is x = lot and it runs a0..a1 along z; "z": the line is z = lot, along
    x. `out`: +1 or -1, the way the street lies from the lot line."""
    r = random.Random(seed)

    def at(a, d):
        return (lot + out * d, a) if axis == "x" else (a, lot + out * d)

    yaw_out = math.atan2(out, 0.0) if axis == "x" else (0.0 if out > 0 else math.pi)
    clear = lambda a: not any(s0 <= a <= s1 for s0, s1 in skip)  # noqa: E731
    along_yaw = 0.0 if axis == "x" else math.pi / 2
    taken = []
    # The kerb's edge: cubes in runs, a bin, a hydrant, a camera, a standing
    # advert turned to the walkers, a charging post, a short lamp.
    a = a0 + r.uniform(3.0, 6.0)
    while a < a1 - 3.0:
        if clear(a):
            pick = r.random()
            x, z = at(a, 3.72)
            if not free_kerb(x, z):
                pass
            elif pick < 0.26:
                for k in range(r.randrange(2, 5)):
                    xx, zz = at(a + k * 1.5, 3.72)
                    if a + k * 1.5 < a1 - 1.0 and clear(a + k * 1.5):
                        P.place("bollard_cube", xx, G, zz, district=PL)
            elif pick < 0.37:
                P.place("bin", x, G, z, district=PL)
            elif pick < 0.44:
                P.place("hydrant", x, G, z, district=PL)
            elif pick < 0.54:
                P.place("cctv", x, G, z, district=PL)
            elif pick < 0.73:
                P.place("lightbox", x, G, z, along_yaw, district=PL)
            elif pick < 0.8:
                P.place("charge_post", x, G, z, yaw_out + math.pi, district=PL)
            else:
                P.place("lamp_short", x, G, z, district=PL)
                lx, lz = at(a, 2.4)
                light(PL, lx, 3.0, lz, "amber", 4.0)
        a += r.uniform(5.5, 9.5)
    # Palms at the kerb, slender, lit from their planters (YRL74JmhVgk@30).
    a = a0 + r.uniform(9.0, 16.0)
    while palms and a < a1 - 6.0:
        if clear(a) and free_kerb(*at(a, 3.62), reach=4.0):
            x, z = at(a, 3.62)
            P.place("planter_palm", x, G, z, r.uniform(0, 6.28), sy=r.uniform(1.05, 1.25), sxz=0.55, district=PL)
            light(PL, *at(a, 2.6)[:1], 1.2, at(a, 2.6)[1], "amber", 3.5)
        a += r.uniform(20.0, 30.0)
    # Against the wall: a row of vending machines, a bench with someone on
    # it, a shop's board; and now and then a lit grate in the paving.
    a = a0 + r.uniform(6.0, 12.0)
    while wall and a < a1 - 5.0:
        if clear(a) and clear(a + 2.4):
            pick = r.random()
            if pick < 0.4:
                n = r.randrange(2, 4)
                for k in range(n):
                    x, z = at(a + k * 1.08, 0.5)
                    P.place("vending" if (k + n) % 2 else "vending_warm", x, G, z, yaw_out, district=PL)
                taken.append((a - 1.2, a + n * 1.08 + 0.6))
            elif pick < 0.66:
                x, z = at(a, 0.36)
                P.place("bench", x, G, z, yaw_out, district=PL)
                if r.random() < 0.7:
                    sx_, sz_ = at(a + r.choice((-0.45, 0.4)), 0.4)
                    stand(sx_, sz_, yaw_out, "sit", y=G + 0.48)
                taken.append((a - 1.8, a + 1.8))
            elif pick < 0.86:
                x, z = at(a, 0.5)
                P.place("aframe", x, G, z, along_yaw, district=PL)
                taken.append((a - 0.9, a + 0.9))
        a += r.uniform(11.0, 19.0)
    a = a0 + r.uniform(10.0, 25.0)
    while a < a1 - 4.0:
        if clear(a):
            x, z = at(a, 2.2)
            P.place("grate_glow", x, G, z, along_yaw + math.pi / 2, district=PL)
        a += r.uniform(30.0, 45.0)
    # People: singles against the wall or at a window, pairs talking.
    a = a0 + r.uniform(2.0, 5.0)
    while people > 0 and a < a1 - 2.0:
        if clear(a) and not any(t0 <= a <= t1 for t0, t1 in taken):
            pick = r.random()
            x, z = at(a, 0.62)
            if pick < 0.5:
                pose = r.choice(POSES_WALL)
                stand(x, z, yaw_out + (0.0 if pose in ("lean", "smoke") or r.random() < 0.5 else math.pi) + r.uniform(-0.3, 0.3), pose, y=G)
            elif pick < 0.75:
                bx_, bz_ = at(a + 0.9, 0.7)
                along = math.atan2(bx_ - x, bz_ - z)
                stand(x, z, along, "talk", y=G)
                stand(bx_, bz_, along + math.pi, "talk", y=G)
                if r.random() < 0.4:
                    cx_, cz_ = at(a + 0.45, 0.45)
                    stand(cx_, cz_, yaw_out, "talk", y=G)
            elif pick < 0.85:
                kx, kz = at(a, 3.7)
                stand(kx, kz, yaw_out + math.pi + r.uniform(-0.5, 0.5), r.choice(("squat", "phone", "idle")), y=G)
        a += r.uniform(6.0, 11.0) / people


# The x 120 road's west side: B2, B1, the board's block, B5; its east side:
# D. The plaza street's south side: B1 and D1. The south street's north
# side: B2 and D4. (The terraces' own pavement is plaza_square.py's.)
frontage("x", 108.0, 1, -62.0, -12.0, 8501)
frontage("x", 108.0, 1, -166.0, -98.0, 8502)
frontage("x", 108.0, 1, -342.0, -266.0, 8503)
frontage("x", 108.0, 1, -262.0, -202.0, 8509, people=0, skip=((-236.0, -224.0),))
frontage("x", 132.0, -1, -166.0, -12.0, 8504, skip=((-126.0, -60.0),))
frontage("x", 132.0, -1, -124.0, -62.0, 8510, people=0, wall=False, skip=((-118.0, -104.0), (-86.0, -72.0)))
frontage("z", -168.0, -1, 54.0, 106.0, 8505)
frontage("z", -168.0, -1, 134.0, 168.0, 8506)
frontage("z", -10.0, 1, 54.0, 106.0, 8507)
frontage("z", -10.0, 1, 134.0, 168.0, 8508)

# Corner signs: each block's corner to a junction carries one, turned to
# face the junction's middle.
corner_sign(108.0, -168.0, 6.0, "bl", 2.2, math.radians(135))      # B1 to the plaza street's junction
corner_sign(132.0, -168.0, 5.6, "bl", 1.8, math.radians(-135))     # D1 to the same
corner_sign(108.0, -95.0, 3.2, "bl", 1.6, math.radians(45))        # B1 to the deck's landing
corner_sign(108.0, -65.0, 3.2, "bl", 1.6, math.radians(135))       # B2 to the deck's landing
corner_sign(108.0, -10.0, 5.2, "bl", 1.15, math.radians(45))       # B2 to the south street
corner_sign(132.0, -10.0, 6.4, "bx", 3.0, math.radians(-45))       # D4 to the south street
corner_sign(108.0, -344.0, 6.0, "bl", 2.0, math.radians(135))      # B5 to the boulevard

# Tall blades on the slabs' faces to the road, standing out from the wall.
blade_off(B.Face("+x", 104.0, -124.0, -100.0), 6.0, 17.0, "bl", 2.8)
blade_off(B.Face("+x", 104.0, -124.0, -100.0), 18.5, 22.0, "bm", 3.0)
blade_off(B.Face("-x", 142.0, -56.0, -14.0), 8.0, 15.0, "bl", 2.6)
blade_off(B.Face("+x", 104.0, -392.0, -356.0), 30.0, 28.0, "bl", 3.0)
blade_off(B.Face("+x", 108.0, -344.0, -310.0), 3.5, 9.0, "bm", 2.4)
blade_off(B.Face("-x", 137.0, -123.0, -101.0), 3.0, 14.0, "bl", 2.6, angle=0.5)
blade_off(B.Face("+z", -13.0, 56.0, 106.0), 44.0, 14.0, "bl", 2.6)
blade_off(B.Face("-z", -62.0, 62.0, 98.0), 4.0, 13.5, "bm", 2.4)
blade_off(B.Face("+z", -100.0, 62.0, 104.0), 36.5, 14.0, "bl", 2.6, angle=-0.4)

# ---------------------------------------------------------------------------
# The courts of the north quarter: the yard behind the board's block, the
# lanes between the towers. Nobody drives here; from the towers and the air
# they are lit paths with trees, and on foot a place people step out to.
# ---------------------------------------------------------------------------
rc = random.Random(8520)
for (px, pz, yaw) in ((57.0, -288.0, math.pi / 2), (73.0, -288.0, -math.pi / 2)):
    P.place("lamp_plaza", px, G, pz, yaw, district=PL)
    light(PL, px + 1.8 * math.sin(yaw), 3.0, pz, "white", 7.0)
for px in (61.5, 68.5):
    P.place("planter_tree", px, G, -289.5, rc.uniform(0, 6.28), district=PL)
    light(PL, px, 1.0, -289.5, "white", 3.0)
P.place("bench", 65.0, G, -290.6, math.pi, district=PL)
P.place("bench", 65.0, G, -285.4, 0.0, district=PL)
P.place("vending", 58.0, G, -284.5, math.pi, district=PL)
P.place("vending", 59.2, G, -284.5, math.pi, district=PL)
P.place("bin", 71.0, G, -284.8, district=PL)
gline("cyan", 53.0, -291.4, 77.0, -291.4, G + 0.012)
for (px, pz, yaw, pose) in ((64.6, -290.6, math.pi, "sit"), (60.4, -285.6, math.pi, "phone"), (70.0, -286.2, 0.6, "smoke"),
                            (70.6, -288.0, -2.2, "talk"), (69.7, -288.7, 0.9, "talk")):
    stand(px, pz, yaw, pose, y=G + (0.48 if pose == "sit" else 0.0))
# The lanes: a line of light down each, a pool at each crossing, trees
# where two meet.
for (x0, z0, x1, z1) in ((54.5, -346.0, 105.5, -346.0), (54.5, -399.0, 105.5, -399.0), (76.0, -342.0, 76.0, -294.0), (81.0, -395.0, 81.0, -350.0)):
    gline("cyan" if z0 == z1 else "amber", x0, z0, x1, z1, G + 0.012, w=0.07)
for (px, pz) in ((76.0, -346.0), (81.0, -399.0), (106.5, -346.0), (106.5, -399.0), (53.0, -346.0), (53.0, -399.0)):
    light(PL, px, 2.0, pz, "white", 5.0)
for (px, pz) in ((58.0, -399.0), (72.0, -399.0), (94.0, -399.0), (104.0, -399.0)):
    P.place("planter_tree", px, G, pz, rc.uniform(0, 6.28), sxz=0.8, district=PL)
    light(PL, px, 1.0, pz, "white", 3.0)
for (px, pz, yaw, pose) in ((75.2, -330.0, math.pi / 2, "smoke"), (88.0, -398.4, 0.0, "phone"), (62.0, -399.6, 2.0, "talk"), (62.9, -400.2, -1.1, "talk")):
    stand(px, pz, yaw, pose, y=G)
