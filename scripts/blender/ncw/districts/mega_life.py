"""People where people are: the NCART stair and terrace packed, knots of
them on the avenue's pavements under the viaduct (never a row at the
kerb), sat on steps and kerbs, leaning on piers, squatting by the
vending; and what lies about at the kerbs and in the lanes.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import props as P
from ncw.districts.mega_kit import *  # noqa: F401,F403
from ncw.districts.mega_base import SX0, SX1, SFOOT, TZ, TY, FP

_r = random.Random(5601)
POSES = ("idle", "phone", "talk", "smoke", "idle", "lean", "squat")

# The stair: people in knots, not a row to a step: two talking by the left
# rail low down, three sat close together half way up, one climbing, one on
# a phone by the right rail, a pair at the top; the rest of each tread clear.
def _on(step, x, pose, yaw):
    z = SFOOT + (TZ - SFOOT) * (step + 0.5) / 12 + _r.uniform(-0.12, 0.12)
    # (The tread under that z is the step's own top, one riser up.)
    y = G0 + (TY - G0) * (step + 1) / 12
    stand(x, z, yaw, pose, y)


W = SX1 - SX0
_on(1, SX0 + 0.5, "talk", 1.2)
_on(1, SX0 + 1.15, "talk", -1.9)
_on(3, SX1 - 0.6, "sit", -0.3)
_on(5, SX0 + W * 0.36, "sit", 0.2)
_on(5, SX0 + W * 0.36 + 0.62, "sit", -0.15)
_on(6, SX0 + W * 0.36 + 0.3, "sit", 0.1)
_on(7, SX0 + W * 0.62, "idle", math.pi + 0.2)
_on(8, SX1 - 0.45, "phone", -math.pi / 2)
_on(10, SX0 + 0.8, "sit", 0.5)
_on(11, SX0 + W * 0.55, "talk", 0.9)
_on(11, SX0 + W * 0.55 + 0.7, "talk", -2.3)
for (x, dz) in ((30.4, -1.0), (31.2, -1.6), (34.6, -1.3), (35.5, -0.8), (36.6, -1.9), (33.0, -2.4)):
    stand(x, SFOOT + dz, _r.uniform(0, math.tau), _r.choice(("idle", "talk", "phone", "smoke")), G0)
talkers(32.1, SFOOT - 3.0, G0, n=3, turn=0.9)
for (x, z) in ((27.0, FP + 1.2), (28.4, FP + 2.1), (31.5, FP + 2.9), (37.6, FP + 2.6), (40.8, FP + 1.4), (43.6, TZ - 1.0)):
    stand(x, z, _r.uniform(-0.6, 0.6) + (math.pi if _r.random() < 0.4 else 0.0), _r.choice(POSES[:5]), TY)

# The avenue's pavements north of the viaduct (x 10.5..14 either side):
# knots of two and three at uneven gaps, one sat on the kerb, one squatting,
# one leaning on a pier's leg, and the litter of a pavement at night.
for s in (-1, 1):
    # Groups, not a file: two to four people round one spot, some at the
    # kerb and some against the wall at once, the gaps between groups
    # uneven (the walkers keep x 11..13.2).
    z = -566.0 - _r.uniform(2.0, 10.0)
    while z > -704.0:
        if abs(z - RAIL_Z) < 5.0:
            z -= 6.0
            continue
        n = _r.choice((2, 2, 3, 3, 4))
        for i in range(n):
            zi = z + _r.uniform(-1.6, 1.6)
            kind = _r.random()
            if kind < 0.3:
                stand(s * _r.uniform(10.5, 10.85), zi, s * -math.pi / 2 + _r.uniform(-0.6, 0.6), "sit", G0 + 0.15)
            elif kind < 0.45:
                stand(s * _r.uniform(13.55, 13.8), zi, s * -math.pi / 2 + _r.uniform(-0.3, 0.3), "lean", G0)
            elif kind < 0.6:
                stand(s * _r.uniform(13.3, 13.8), zi, _r.uniform(0, math.tau), "squat", G0)
            else:
                stand(s * _r.uniform(13.3, 13.85), zi, _r.uniform(0, math.tau), _r.choice(("phone", "smoke", "talk", "idle")), G0)
        if _r.random() < 0.5:
            P.place(_r.choice(("rubbish", "bags", "rubbish", "crates")), s * _r.uniform(13.4, 13.8), G0, z + _r.uniform(-3.0, 3.0), _r.uniform(0, 3.0))
        z -= _r.choice((9.0, 14.0, 22.0, 30.0)) + _r.uniform(-2.0, 2.0)

# ---------------------------------------------------------------------------
# The court's wall over the market hall (the arm's west face, x 64, 11..25 m):
# floors of balconies and units over the board, the block's number big and
# lit at its top, pipes down it. And the west wing's shop frontage, which a
# walker passes at arm's length: stickers, stencils, water, a hazard foot,
# blades hung over the pavement above head height.
# ---------------------------------------------------------------------------
from ncw.districts.mega_face import dress  # noqa: E402
from ncw.districts.mega_wings import AX0, ARM_TOP, WX0, WX1, PT  # noqa: E402
from ncw.districts.mega_void import weather  # noqa: E402
fCw = face("-x", AX0, ST_N, ST_S)
dress(fCw, ARM_TOP, 4, 5651, [(9.0, 15.0)], [(15.6, 24.4, 16.0, 25.4)], people_rate=0.1, weights=(0.2, 0.5, 0.3))
numeral("H4", AX0 - 0.1, ARM_TOP - 2.6, -712.0, 3.6, -math.pi / 2, lit=0.9, pad=0.8)
for (s, rr, col) in ((1.2, 0.12, RUST), (1.55, 0.07, STEEL), (22.4, 0.1, TEAL_PAINT)):
    x, _, z = fCw.p(fCw.at(s), 0.0, 0.2)
    rpipe((x, PT if s < 5 else SHOP_H, z), (x, ARM_TOP - 0.4, z), rr, col=col)
fWS = face("+z", ST_N, WX0, WX1)
weather(fWS, 0.4, fWS.width - 0.4, G0, 4.4, 5652, posters=False)
for s in (5.0, 13.5, 21.0, 30.5, 39.0):
    x, _, z = fWS.p(fWS.at(s), 0.0, 0.0)
    blade(x, 4.3, z + 0.9, _r.choice(("bs", "bm")), along="z")

# ---------------------------------------------------------------------------
# The street's north pavement, which the walk follows from the avenue to the
# west wing (z -729.8), and the forecourt beside it: knots of people against
# the frontage and at the kerb every few metres, more round the forecourt's
# columns outside the hero's slot (x -15..16), each clear of whoever and
# whatever already stands there.
# ---------------------------------------------------------------------------
import ncw.kit as _K  # noqa: E402
from ncw import buildings as B  # noqa: E402

_rl = random.Random(5650)


def _free(x, z, rad=0.75):
    if any(abs(p[0] - x) < rad and abs(p[2] - z) < rad for p in _K.PEOPLE):
        return False
    if any(c[0] == "box" and c[1] - 0.35 < x < c[2] + 0.35 and c[5] - 0.35 < z < c[6] + 0.35 and c[3] < G0 + 1.6 for c in B.COLLISION):
        return False
    return not any(abs(i[1] - x) < rad + 0.5 and abs(i[3] - z) < rad + 0.5 and i[2] < G0 + 3.0 for i in P.INSTANCES)


def _knot(x, z, n, back_yaw, y=G0):
    placed = 0
    for i in range(n):
        xi, zi = x + _rl.uniform(-0.9, 0.9), z + _rl.uniform(-0.25, 0.25)
        if not _free(xi, zi):
            continue
        pose = _rl.choice(("talk", "idle", "phone", "lean", "smoke", "talk"))
        yaw = back_yaw + (math.pi if pose == "lean" else 0.0) + _rl.uniform(-0.7, 0.7)
        stand(xi, zi, yaw, pose, y)
        placed += 1
    return placed


x = 26.0
while x > -92.0:
    if not (28.5 < x < 38.5):                                   # the NCART stair's foot has its own
        # Against the frontage (facing the street, +z), or at the kerb
        # (facing the frontage, or sat on it facing the road).
        if _rl.random() < 0.7:
            _knot(x, -731.55, _rl.choice((1, 2, 2, 3)), 0.0)
        if _rl.random() < 0.35:
            zk = -728.35
            if _free(x + 2.0, zk):
                if _rl.random() < 0.5:
                    stand(x + 2.0, zk, 0.0 + _rl.uniform(-0.4, 0.4), "sit", G0 + 0.15)
                else:
                    stand(x + 2.0, zk, math.pi + _rl.uniform(-0.5, 0.5), _rl.choice(("idle", "phone", "smoke")), G0)
    x -= _rl.uniform(5.0, 9.0)
for (cx, cz) in ((-19.0, -737.5), (-24.5, -741.8), (-31.0, -736.6), (-38.5, -740.2), (-44.0, -735.4),
                 (19.5, -738.0), (24.0, -742.2), (41.0, -737.4), (45.5, -741.0)):
    _knot(cx, cz, _rl.choice((2, 3, 3, 4)), _rl.uniform(0, math.tau))
