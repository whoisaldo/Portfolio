"""Who waits at the plaza's road edges (KvMY1uzSC1E@29, Fn9gKhU_2_Q@74):
security either side of each lobby's doors, a fare at the kerb by each of
the lobbies' taxis and a patrolman out of his car, people at the corners of
the district's junctions waiting to cross, a queue at a cart on the
square's edge by the plaza street, and people on the walkway over the x 120
road.

Kept clear: the walk camera's line (the pavement's middle, 2.5 m from the
lot line) by a metre, so whoever stands here is within 1.5 m of the lot
line or at the kerb, 3.45 m out; the road itself (the traffic agent parks
in the bays and stands taxis at z -79 and -112 and a patrol car at
(126.5, -158.8)); and whatever already stands: a spot taken by a prop or a
person slides along the kerb, or is left out.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza_corp import WX0, WX1, WZ0, WY

G = 0.15
rq = random.Random(8800)


def free(x, z, y=G, reach=0.85, apart=0.62):
    """Nothing within reach of (x, z) at this level: no prop, no person."""
    for i in P.INSTANCES:
        if abs(i[1] - x) < reach and abs(i[3] - z) < reach and -0.5 < i[2] - y < 2.0:
            return False
    return not any(abs(p[0] - x) < apart and abs(p[2] - z) < apart and abs(p[1] - y) < 1.0 for p in PEOPLE)


def put(x, z, yaw, pose, y=G, slide=(0.0, 0.5, -0.5, 1.0, -1.0), along="z"):
    """Someone at (x, z), or slid along the kerb to the nearest free spot."""
    for s in slide:
        px, pz = (x, z + s) if along == "z" else (x + s, z)
        if free(px, pz, y):
            stand(px, pz, yaw + rq.uniform(-0.2, 0.2), pose, y=y)
            return True
    print(f"plaza: no free spot for somebody at ({x}, {z})")
    return False


E, W_, N, S = math.pi / 2, -math.pi / 2, math.pi, 0.0

# Security: a second guard at each lobby, on the other side of its doors
# from lobby_front's (z mid + 2.9), clear of the knot that stands there.
for mid in (-111.0, -79.0):
    put(131.38, mid - 4.0, W_, "idle")
# A fare at the kerb by each taxi, between the lobby's bollards, and somebody
# coming out of the doors to it with a bag.
for z in (-111.0, -79.0):
    put(128.35, z, W_, "phone")
    put(130.7, z + 0.9, W_ + 0.35, "carry", slide=(0.0, 0.4, -0.4))
# The patrol car's officer out at the kerb, talking to somebody.
put(128.4, -157.0, S, "talk")
put(128.4, -157.85, N, "talk")

# At the corners: people waiting to cross, at the kerb's edge, turned to the
# road they wait on. Junction F's south corners (B1's, D1's), the square's
# corner on the plaza street, the south street's junction (B2's, D4's).
CORNERS = (
    (((111.45, -165.4), (111.5, -164.6)), E, ("idle", "phone"), "z"),
    (((105.9, -171.45), (105.1, -171.5)), N, ("phone", "idle"), "x"),
    (((128.55, -165.4), (128.4, -166.4)), W_, ("idle", "idle"), "z"),
    (((134.2, -171.45), (135.0, -171.55), (135.7, -171.4)), N, ("idle", "phone", "smoke"), "x"),
    (((105.4, -186.55), (104.6, -186.6)), S, ("idle", "phone"), "x"),
    (((111.45, -12.4), (111.5, -13.25)), E, ("phone", "idle"), "z"),
    (((128.55, -12.4), (128.45, -13.3)), W_, ("idle", "phone"), "z"),
    (((134.1, -6.55), (134.9, -6.6)), S, ("phone", "idle"), "x"),
)
for pts, yaw, poses, along in CORNERS:
    for (x, z), pose in zip(pts, poses):
        put(x, z, yaw, pose, slide=(0.0, 0.4, -0.4), along=along)

# At the shelter on the square's edge by the plaza street: two on its seat
# and one at its open end, waiting.
for x, pose in ((65.25, "sit"), (66.55, "sit")):
    if not any(abs(p[0] - x) < 0.6 and abs(p[2] + 193.0) < 0.6 for p in PEOPLE):
        stand(x, -193.0, S + rq.uniform(-0.2, 0.2), pose, y=G + 0.48)
put(68.05, -192.3, S, "phone", along="x", slide=(0.0, 0.4))

# A queue at the takeaway hatch in D3's shop on the x 120 road (the deck's
# landing, in front of anyone walking or driving north from the south
# street): a lit counter and its menu in the shop's south bay, the first
# at the counter turned to it, the rest along the wall behind, turned to
# the head of the line.
fq = B.Face("-x", 132.0, -98.0, -60.0)
fq.box((PL, "metal", 0), 35.4, 36.9, 0.98, 1.06, 0.06, 0.42)
fq.box((PL, "metal", 1), 35.4, 36.9, 0.62, 0.98, 0.06, 0.1)
fq.box((PL, "glow", 0), 35.5, 36.8, 1.06, 1.09, 0.08, 0.4, col=dim("yellow", 0.5))
fq.box((PL, "board_frame", 0), 35.3, 37.0, 2.2, 2.95, 0.06, 0.12)
fq.box((PL, "glow", 0), 35.4, 36.9, 2.28, 2.87, 0.12, 0.14, col=dim("yellow", 1.1))
qx, _, qz = fq.p(fq.at(36.15), 0.0, 0.62)
light(PL, qx, 2.4, qz, "yellow", 3.5)
put(qx, qz, E, "queue", slide=(0.0,))
for i, pose in enumerate(("queue", "phone", "queue", "idle", "queue")):
    put(qx, qz - 0.95 - 0.78 * i, S, pose, slide=(0.0, -0.2))

# On the walkway: two at its north rail looking at the junction and the
# square, one crossing.
for x, pose, yaw in ((115.2, "rail", N), (116.0, "rail", N + 0.3), (124.6, "idle", E)):
    stand(x, WZ0 + 0.45 if pose == "rail" else -157.6, yaw, pose, y=WY)
assert WX0 < 115.2 and 124.6 < WX1
