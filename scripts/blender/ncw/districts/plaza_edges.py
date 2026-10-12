"""Who waits at the plaza's road edges (KvMY1uzSC1E@29, Fn9gKhU_2_Q@74):
security either side of each lobby's doors, a fare at the kerb by each of
the lobbies' taxis and a patrolman out of his car, people at the corners of
the district's junctions waiting to cross, a queue at a cart on the
square's edge by the plaza street, and people on the walkway over the x 120
road.

Kept clear: the walk camera's line (the pavement's middle, 2.5 m from the
lot line) by a metre, so whoever stands here is within 1.5 m of the lot
line or at the kerb, 3.6 m out; the road itself (the traffic agent parks
in the bays and stands taxis at z -79 and -112 and a patrol car at
(126.5, -158.8)); and whatever already stands: a spot taken by a prop or a
person slides along the kerb, or is left out.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza_corp import WX0, WX1, WZ0, WY
from ncw.districts import plaza_fronts as PF
import ncw.kit as K

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
    (((111.6, -165.4), (111.6, -164.6)), E, ("idle", "phone"), "z"),
    (((105.9, -171.6), (105.1, -171.6)), N, ("phone", "idle"), "x"),
    (((128.4, -165.4), (128.4, -166.4)), W_, ("idle", "idle"), "z"),
    (((134.2, -171.6), (135.0, -171.6)), N, ("idle", "phone"), "x"),
    (((105.4, -186.4), (104.6, -186.4)), S, ("idle", "phone"), "x"),
    (((111.6, -12.4), (111.6, -13.25)), E, ("phone", "idle"), "z"),
    (((128.4, -12.4), (128.4, -13.3)), W_, ("idle", "phone"), "z"),
    (((134.1, -6.4), (134.9, -6.4)), S, ("phone", "idle"), "x"),
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

# ---------------------------------------------------------------------------
# The roads' edges in light (ax5YUmkWf_Y@9, YRL74JmhVgk@30): a stud of teal
# every two metres along the top of every kerb the plaza's own frontages
# face, and the kerb's light on the road and the pavement beside it, so from
# the air the district's streets are drawn in dotted light and from the road
# the wet asphalt gives the line back. Short of every crossing's painted
# kerb (4.6 to 8 m out from a junction's square, and 1.5 m more), and none
# west of x 62, where the bake's streak map would run them down the hero's
# road.
# ---------------------------------------------------------------------------
STUD, PITCH, POOL = 0.36, 2.0, 8.0
KERBS = (  # (the axis the kerb runs along, its top's middle, the way to the road, from, to)
    ("z", 111.85, 1, -305.0, -197.0), ("z", 111.85, 1, -161.0, -98.0), ("z", 111.85, 1, -62.0, -17.0),
    ("z", 128.15, -1, -161.0, -98.0), ("z", 128.15, -1, -89.0, -71.0), ("z", 128.15, -1, -62.0, -17.0),
    ("x", -171.85, -1, 62.0, 101.0), ("x", -171.85, -1, 139.0, 168.0),
    ("x", -186.15, 1, 62.0, 101.0),
    ("x", -6.15, 1, 62.0, 101.0), ("x", -6.15, 1, 139.0, 168.0),
)
for along, line, out, a0, a1 in KERBS:
    # (Each stud a block let into the kerb: its top, seen from the air, and
    # its face standing 2 cm proud of the kerb's, seen from the road.)
    u0, u1 = sorted((line - out * 0.05, line + out * 0.17))
    n = int((a1 - a0) / PITCH)
    lead = (a1 - a0 - n * PITCH) / 2
    for i in range(n + 1):
        a = a0 + lead + i * PITCH
        if along == "z":
            box((PL, "neon_teal", 0), u0, u1, 0.04, 0.157, a - STUD / 2, a + STUD / 2, scale=1.0)
        else:
            box((PL, "neon_teal", 0), a - STUD / 2, a + STUD / 2, 0.04, 0.157, u0, u1, scale=1.0)
    k = max(1, int(round((a1 - a0) / POOL)))
    for i in range(k + 1):
        a = a0 + (a1 - a0) * i / k
        x, z = (line, a) if along == "z" else (a, line)
        light(PL, x, 0.35, z, "teal", 2.2)

# ---------------------------------------------------------------------------
# And the lane between D and Santo (x 170 to 176, sd15) a street of its own:
# along the podiums' backs, fronts built out a little over the back doors,
# shops under their boards and awnings, screens, a dock now and then, with
# the old wall between them; each front closed at its ends back to the wall.
# (The kit's sides stay "open": made "street", every other face of these
# podiums would be dealt again and D1's kit signs would run into D2's. Built
# here, last of the plaza's signs, so no sign hung before it changes its id.)
LANE = B.Face("+x", 170.35, -167.0, -11.0)
LANE_BAYS = ((-10.4, -21.0, "shop", "yellow"), (-22.5, -30.5, "screens", "green"), (-32.0, -40.0, "shop", "amber"), (-42.0, -48.0, "dock", "yellow"),
             (-50.0, -58.0, "shop", "teal"), (-61.5, -69.5, "screens", "teal"), (-71.0, -80.0, "shop", "green"), (-81.5, -89.5, "dock", "yellow"),
             (-90.5, -98.0, "shop", "amber"), (-99.5, -107.5, "shop", "amber"), (-109.0, -117.0, "screens", "green"), (-118.5, -124.5, "shop", "teal"),
             (-127.5, -135.5, "shop", "yellow"), (-137.0, -145.0, "shop", "teal"), (-146.5, -154.5, "screens", "amber"), (-156.0, -165.0, "shop", "green"))
rl = random.Random(8870)
SHOPS0, AWNINGS0 = len(K.batches[(PL, "shop", 0)].faces), len(K.batches[(PL, "awning", 1)].faces)
for z_hi, z_lo, kind, hue in LANE_BAYS:
    s0, s1 = -11.0 - z_hi, -11.0 - z_lo
    front_bay(LANE, s0, s1, kind, rl, colour=hue)
    for z in (z_hi, z_lo):
        box((PL, "trim", 0), 170.0, 170.47, 0.0, 4.3, z - 0.1, z + 0.1, scale=2.0, col=B.DARK_TRIM)
    box((PL, "trim", 0), 170.0, 170.47, 4.28, 4.34, z_lo, z_hi, scale=2.0, col=B.DARK_TRIM)
# A blade at the lane's mouth, turned to the south street.
blade_off(B.Face("+x", 170.0, -60.0, -10.0), 1.2, 4.6, "bm", 2.4, angle=0.4)
# (What the back doors kept at them stands aside where a front now is.)
P.INSTANCES[:] = [i for i in P.INSTANCES if not (i[0] in ("dumpster", "bags", "crates") and i[7] == PL and 170.4 < i[1] < 171.2
                                                  and any(zl - 1.6 < i[3] < zh + 1.6 for zh, zl, _, _ in LANE_BAYS))]
PF.dress_awnings(AWNINGS0)
PF.dress_shops(SHOPS0)

# In the lane between D and Santo: somebody at a shop window here and there,
# a pair talking, one at the screens, one sat on a dock's step.
for (x, z, yaw, pose) in ((171.05, -16.4, W_, "phone"), (171.0, -35.2, W_, "idle"), (171.1, -53.8, W_ + 0.3, "lean"), (171.05, -75.0, N, "talk"),
                          (171.05, -75.85, S, "talk"), (171.0, -86.0, W_, "idle"), (171.05, -103.0, W_, "phone"), (171.0, -112.6, W_, "idle"),
                          (171.05, -131.0, W_ - 0.3, "smoke"), (171.0, -150.0, W_, "idle"), (171.05, -160.4, W_, "phone")):
    put(x, z, yaw, pose, slide=(0.0, 0.5, -0.5))
