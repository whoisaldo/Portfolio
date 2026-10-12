"""Who is on the square, in groups (KvMY1uzSC1E@29, @43): round the hub's
rail and on its kerb, along the causeway's rails and under the koi, sitting
in rows on the stairs, at the terraces' edges looking over the square, in
knots on the open stone, at the shops under the board, at the kiosks, at
the towers' lobby doors and on the roof gardens.

Kept clear: the walkers' lines (z -230 down the causeway's middle, z -196
along the plaza street's side) by a metre either way, and the braindance's
camera at (90, 2.2, -199).
"""
from ncw.kit import *  # noqa: F401,F403
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza_hub import HX, HZ, RK, KY, STAIR, at
from ncw.districts.plaza_square import G, TY

rp = random.Random(8700)
TF = TY + 0.02


def knot(cx, cz, n, y=G, r=0.75):
    """n people standing in a ring, turned to each other."""
    a0 = rp.uniform(0, math.tau)
    for i in range(n):
        a = a0 + i * math.tau / n + rp.uniform(-0.25, 0.25)
        rr = r * rp.uniform(0.8, 1.2) * (0.62 if n == 2 else 1.0)
        pose = "talk" if i < 2 or rp.random() < 0.45 else rp.choice(("idle", "phone", "smoke"))
        stand(cx + rr * math.sin(a), cz + rr * math.cos(a), a + math.pi, pose, y=y)


def along(pts, yaw, y=G, poses=("idle", "idle", "phone", "lean")):
    """People at (x, z) points all turned one way (a rail, a shop window)."""
    for x, z in pts:
        stand(x, z, yaw + rp.uniform(-0.3, 0.3), rp.choice(poses), y=y)


# Round the hub: standing at the rail looking down through the glass, and
# sitting on the kerb with their backs to it.
for deg, kind in ((36, "s"), (39, "s"), (43, "i"), (58, "i"), (61, "i"), (74, "s"), (77, "s"), (80, "s"), (93, "i"), (96, "p"),
                  (108, "i"), (111, "i"), (114, "s"), (128, "s"), (131, "s"), (144, "i"), (147, "p"),
                  (196, "i"), (199, "i"), (214, "s"), (217, "s"), (232, "i"), (235, "p"), (238, "i"), (255, "s"), (258, "s"), (261, "s"),
                  (275, "i"), (278, "i"), (292, "p"), (305, "s"), (308, "s"), (322, "i"), (325, "i"), (328, "p"), (343, "i"), (346, "s")):
    a = math.radians(deg + rp.uniform(-0.6, 0.6))
    if kind == "s":
        x, z = at(RK - 0.2, a)
        stand(x, z, math.atan2(math.cos(a), math.sin(a)) + rp.uniform(-0.3, 0.3), "sit", y=KY)
    else:
        x, z = at(RK + 0.42, a)
        stand(x, z, math.atan2(-math.cos(a), -math.sin(a)) + rp.uniform(-0.2, 0.2), "phone" if kind == "p" else "idle", y=G)
# On the causeway: at its rails over each half, and under the koi looking up.
along([(x, -227.78) for x in (60.0, 60.8, 66.5, 72.2, 74.0, 74.8, 79.5)], 0.0)
along([(x, -232.22) for x in (58.0, 63.5, 64.3, 66.9, 76.5, 77.3, 81.0)], math.pi)
stand(66.4, -228.5, 1.2, "idle", y=G)
stand(67.2, -228.9, 1.4, "phone", y=G)

# On the stairs: rows sitting on a step, pairs standing on the flight.
run_, rise_ = (STAIR[1] - STAIR[0]) / 28, (TY + 0.01 - G) / 28
for i, zs, pose in ((3, (-219.0, -218.3, -217.6), "sit"), (7, (-211.0, -210.3), "sit"), (9, (-214.4,), "idle"), (10, (-213.6,), "phone"),
                    (13, (-208.0, -207.3, -206.6), "sit"), (18, (-216.6, -215.9), "sit"), (22, (-209.2,), "phone"),
                    (24, (-218.6,), "idle"), (25, (-217.8,), "idle"), (15, (-211.6, -210.9), "sit")):
    for z in zs:
        stand(STAIR[0] + (i + 0.5) * run_, z, -math.pi / 2 + rp.uniform(-0.25, 0.25), pose, y=G + (i + 1) * rise_)

# At the terraces' edges: along the west rails over the square, the rails
# over the passage, the bridge; and knots on their floors, at the kiosk.
along([(93.0, z) for z in (-259.6, -258.8, -254.2, -253.4, -252.6, -246.6, -244.0, -243.2, -238.4, -237.6)], -math.pi / 2, y=TF)
along([(93.0, z) for z in (-225.0, -224.2, -223.4, -221.4, -204.2, -203.4)], -math.pi / 2, y=TF)
along([(x, -225.0) for x in (93.6, 94.4, 105.6, 106.4, 107.2)], math.pi, y=TF)
along([(x, -235.0) for x in (93.4, 94.2, 105.8, 106.8)], 0.0, y=TF)
along([(95.85, z) for z in (-232.4, -231.6, -227.4)], -math.pi / 2, y=TF)
along([(104.2, z) for z in (-231.0, -229.2)], math.pi / 2, y=TF)
for cx, cz, n in ((96.6, -258.6, 3), (103.4, -250.0, 4), (97.6, -238.2, 2), (97.0, -222.4, 3), (100.6, -208.6, 4), (96.4, -215.4, 2)):
    knot(cx, cz, n, y=TF)

# On the open stone south of the hub and west of it, at the kiosk, and at
# the shop windows under the board.
for cx, cz, n in ((62.0, -209.2, 4), (72.4, -204.6, 3), (78.2, -210.4, 5), (66.2, -199.4, 2), (80.6, -199.6, 3), (56.2, -207.9, 3),
                  (51.6, -238.4, 2), (54.8, -249.6, 2), (88.4, -244.6, 3), (88.6, -239.8, 2), (56.4, -221.6, 2), (84.8, -258.2, 4)):
    knot(cx, cz, n)
along([(x, -259.4 + 0.5 * (i % 2)) for i, x in enumerate((53.4, 54.2, 57.6, 58.4, 59.2, 67.6, 68.5, 73.2, 74.0, 78.2, 83.0, 83.8, 88.6, 89.4))], math.pi,
      poses=("idle", "idle", "phone"))
along([(100.4, -233.2), (101.2, -233.3)], 0.0)
along([(94.2, -226.7), (95.0, -226.6)], math.pi)

# At the towers' lobby doors on the x 120 road (within 0.8 m of the glass:
# the pavement's walkers pass outside them), and on the roof gardens.
for pair, phone, idle, smoke in (((-106.2, -107.0), -112.0, -103.4, -121.6), ((-72.6, -73.4), -79.0, -69.4, -89.6), ((-92.4, -93.2), -64.6, -95.6, -62.4)):
    stand(131.3, pair[0], math.pi, "talk", y=G)
    stand(131.3, pair[1], 0.0, "talk", y=G)
    stand(131.25, phone, -math.pi / 2 + 0.3, "phone", y=G)
    stand(131.25, idle, math.pi / 2, "idle", y=G)
    stand(131.3, smoke, -math.pi / 2, "smoke", y=G)
knot(88.0, -146.0, 3, y=18.2)
knot(101.0, -141.0, 4, y=18.2)
along([(70.0, -44.3), (70.9, -44.4), (88.0, -44.2)], 0.0, y=11.4, poses=("idle", "phone"))
knot(137.2, -40.0, 3, y=11.4)
