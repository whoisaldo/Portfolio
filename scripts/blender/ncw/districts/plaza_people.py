"""Who is on the square, in groups of two to five with gaps between them
(KvMY1uzSC1E@29, @43): round the hub's rail and on its kerb, at the
causeway's rails and under the koi, sitting in rows on the stairs, at the
terraces' edges looking over the square, in knots on the open stone, at the
shops under the board, before the long adverts, at the kiosks, at the
towers' lobby doors and on the roof gardens. Nobody stands at one interval
along a rail.

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


def cluster(pts, face, y=G, poses=("idle", "phone", "idle", "lean")):
    """Two to five people at a rail or a window, close together: the two
    at one end turned to each other, the rest looking `face`'s way, each a
    little their own. Nobody is a row: clusters are set down with gaps
    between them, never at one interval."""
    for i, (x, z) in enumerate(pts):
        if i < 2 and len(pts) >= 2:
            ox, oz = pts[1 - i]
            stand(x, z, math.atan2(ox - x, oz - z) + rp.uniform(-0.2, 0.2), "talk", y=y)
        else:
            stand(x, z, face + rp.uniform(-0.5, 0.5), rp.choice(poses), y=y)


def ring_cluster(deg, n, sitting=0, gap=3.1):
    """n people at the hub's rail from `deg` round it, the first `sitting`
    of them on the kerb with their backs to the well."""
    for i in range(n):
        a = math.radians(deg + i * gap + rp.uniform(-0.5, 0.5))
        inward = math.atan2(-math.cos(a), -math.sin(a))
        if i < sitting:
            x, z = at(RK - 0.2, a)
            stand(x, z, inward + math.pi + rp.uniform(-0.3, 0.3), "sit", y=KY)
        else:
            x, z = at(RK + 0.42 + rp.uniform(0.0, 0.35), a)
            turn = (0.9 if i % 2 else -0.9) if n - sitting >= 2 and i >= n - 2 else rp.uniform(-0.25, 0.25)
            stand(x, z, inward + turn, "talk" if abs(turn) > 0.5 else rp.choice(("idle", "phone", "lean")), y=G)


# Round the hub: clusters of two to five at the rail and on the kerb, at
# uneven places round it, wide gaps between.
for deg, n, sitting in ((38, 4, 2), (71, 2, 0), (112, 5, 3), (149, 2, 2), (201, 3, 0), (243, 5, 2), (262, 2, 0), (301, 2, 1), (333, 3, 1)):
    ring_cluster(deg, n, sitting)
# On the causeway: three clusters at its rails over the well and a knot off
# the walkers' line, looking up at the koi.
cluster([(59.6, -227.8), (60.5, -227.75), (61.3, -227.9)], 0.0)
cluster([(72.4, -227.8), (73.2, -227.85), (74.3, -227.7), (75.0, -227.9)], 0.0)
cluster([(64.0, -232.2), (64.9, -232.25)], math.pi)
cluster([(77.4, -232.2), (78.3, -232.15), (79.0, -232.3)], math.pi)
knot(67.6, -228.7, 3, r=0.6)

# On the stairs: rows sitting on a step, pairs standing on the flight.
run_, rise_ = (STAIR[1] - STAIR[0]) / 28, (TY + 0.01 - G) / 28
for i, zs, pose in ((3, (-219.0, -218.3, -217.6), "sit"), (7, (-211.0, -210.3), "sit"), (9, (-214.4,), "idle"), (10, (-213.6,), "phone"),
                    (13, (-208.0, -207.3, -206.6), "sit"), (18, (-216.6, -215.9), "sit"), (22, (-209.2,), "phone"),
                    (24, (-218.6,), "idle"), (25, (-217.8,), "idle"), (15, (-211.6, -210.9), "sit")):
    for z in zs:
        stand(STAIR[0] + (i + 0.5) * run_, z, -math.pi / 2 + rp.uniform(-0.25, 0.25), pose, y=G + (i + 1) * rise_)

# At the terraces' edges: clusters at the west rails over the square, at
# the rails over the passage and on the bridge; knots on their floors, at
# the kiosk and the benches.
W = -math.pi / 2
cluster([(93.0, -259.4), (93.05, -258.5), (93.0, -257.7)], W, y=TF)
cluster([(93.0, -248.6), (93.1, -247.8)], W, y=TF)
cluster([(93.0, -239.6), (93.05, -238.8), (93.0, -238.0), (93.1, -237.1)], W, y=TF)
cluster([(93.0, -224.6), (93.05, -223.8), (93.0, -222.9)], W, y=TF)
cluster([(93.0, -203.6), (93.1, -202.8)], W, y=TF)
cluster([(105.4, -225.0), (106.3, -225.05), (107.1, -224.9)], math.pi, y=TF)
cluster([(93.6, -235.0), (94.5, -235.05)], 0.0, y=TF)
cluster([(95.85, -231.8), (95.9, -230.9)], W, y=TF)
stand(104.2, -229.6, math.pi / 2, "lean", y=TF)
for cx, cz, n in ((96.6, -258.6, 3), (103.4, -244.2, 4), (99.4, -237.6, 2), (97.0, -222.4, 3), (100.6, -208.6, 5), (96.4, -216.0, 2), (104.6, -203.4, 2)):
    knot(cx, cz, n, y=TF)
for (px, pz, yaw) in ((96.0, -243.4, 0.0), (96.4, -240.2, math.pi), (97.9, -241.5, -math.pi / 2), (104.3, -247.6, math.pi), (103.6, -251.0, 0.0)):
    stand(px, pz, yaw, "sit", y=TF + 0.47)

# On the open stone south of the hub and west of it, at the kiosk, and at
# the shop windows under the board: clusters at four of the shops, gaps
# between.
for cx, cz, n in ((62.6, -209.4, 4), (72.4, -203.4, 3), (78.2, -210.4, 5), (66.2, -199.4, 2), (80.6, -199.6, 3), (56.2, -207.9, 3),
                  (52.2, -234.4, 2), (54.8, -249.6, 2), (88.4, -244.6, 3), (88.6, -239.8, 2), (56.4, -221.6, 2), (84.8, -258.2, 4)):
    knot(cx, cz, n)
cluster([(53.6, -259.4), (54.5, -259.2), (55.3, -259.5)], math.pi)
cluster([(66.4, -259.3), (67.3, -259.1), (68.1, -259.4), (69.0, -258.9)], math.pi)
stand(74.6, -259.2, math.pi, "phone", y=G)
cluster([(82.6, -259.2), (83.5, -259.4)], math.pi)
cluster([(88.4, -259.3), (89.2, -259.0), (90.0, -259.4)], math.pi)
cluster([(100.4, -233.2), (101.2, -233.3)], 0.0)
cluster([(94.2, -226.7), (95.0, -226.6)], math.pi)
# Before the long adverts: somebody reading each.
for (px, pz, yaw, pose) in ((70.2, -207.5, 0.0, "idle"),
                            (52.4, -237.4, -math.pi / 2, "phone"), (67.6, -250.6, math.pi, "idle"), (66.6, -250.8, math.pi, "idle")):
    stand(px, pz, yaw, pose, y=G)

# At the towers' lobby doors on the x 120 road: by each door three people
# close together and one off on their own (within 0.8 m of the glass: the
# pavement's walkers pass outside them). On the roof gardens: knots, people
# on the benches, somebody at the parapet looking over the square.
for mid, lone in ((-111.0, -119.4), (-79.0, -70.4)):
    stand(131.35, mid - 1.6, math.pi, "talk", y=G)
    stand(131.35, mid - 2.5, 0.0, "talk", y=G)
    stand(130.95, mid - 2.05, math.pi / 2, "phone", y=G)
    stand(131.3, lone, -math.pi / 2, "smoke", y=G)
RY = 18.22
for cx, cz, n in ((88.0, -146.0, 3), (101.0, -141.4, 4), (94.0, -151.6, 2), (86.4, -158.4, 3), (103.0, -160.2, 2)):
    knot(cx, cz, n, y=RY)
for (px, pz, yaw) in ((88.0, -147.6, 0.0), (88.6, -147.6, 0.0), (100.0, -144.4, math.pi), (92.4, -139.5, math.pi / 2), (95.6, -153.0, -math.pi / 2)):
    stand(px, pz, yaw, "sit", y=RY + 0.47)
cluster([(90.0, -167.2), (90.9, -167.25), (91.7, -167.1)], math.pi, y=RY)
cluster([(104.6, -167.2), (105.4, -167.25)], math.pi, y=RY)
along([(70.0, -44.3), (70.9, -44.4), (88.0, -44.2)], 0.0, y=11.4, poses=("idle", "phone"))
knot(137.2, -40.0, 3, y=11.4)
