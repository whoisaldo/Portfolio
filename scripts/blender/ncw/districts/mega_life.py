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

# The stair: people sat on its steps in ones and twos, others going up and
# down it, a knot at its foot, more on the terrace by the gates.
for step in (1, 2, 3, 5, 6, 8, 10, 11):
    n = _r.choice((1, 1, 2))
    for _ in range(n):
        x = _r.uniform(SX0 + 0.4, SX1 - 0.4)
        z = SFOOT + (TZ - SFOOT) * (step + 0.5) / 12
        y = G0 + (TY - G0) * step / 12
        if _r.random() < 0.55:
            stand(x, z, _r.uniform(-0.4, 0.4), "sit", y)
        else:
            stand(x, z, math.pi if _r.random() < 0.6 else 0.0, _r.choice(("idle", "phone")), y + (TY - G0) / 24)
for (x, dz) in ((30.4, -1.0), (31.2, -1.6), (34.6, -1.3), (35.5, -0.8), (36.6, -1.9), (33.0, -2.4)):
    stand(x, SFOOT + dz, _r.uniform(0, math.tau), _r.choice(("idle", "talk", "phone", "smoke")), G0)
talkers(32.1, SFOOT - 3.0, G0, n=3, turn=0.9)
for (x, z) in ((27.0, FP + 1.2), (28.4, FP + 2.1), (31.5, FP + 2.9), (37.6, FP + 2.6), (40.8, FP + 1.4), (43.6, TZ - 1.0)):
    stand(x, z, _r.uniform(-0.6, 0.6) + (math.pi if _r.random() < 0.4 else 0.0), _r.choice(POSES[:5]), TY)

# The avenue's pavements north of the viaduct (x 10.5..14 either side):
# knots of two and three at uneven gaps, one sat on the kerb, one squatting,
# one leaning on a pier's leg, and the litter of a pavement at night.
for s in (-1, 1):
    z = -566.0 + _r.uniform(0.0, 6.0)
    while z > -704.0:
        if abs(z - RAIL_Z) < 4.0:
            z -= 6.0
            continue
        # (Off the walkers' lines and the walk camera's, x 11..13.2: at the
        # kerb's edge or against the lot line.)
        x = s * _r.uniform(13.45, 13.7)
        kind = _r.random()
        if kind < 0.35:
            talkers(s * 13.45, z, G0, n=_r.choice((2, 3)), r=0.34, turn=_r.uniform(0, math.tau))
        elif kind < 0.55:
            stand(s * 10.75, z, s * -math.pi / 2 + _r.uniform(-0.3, 0.3), "sit", G0 + 0.15)
        elif kind < 0.7:
            stand(s * 13.75, z, s * -math.pi / 2, "lean", G0)
        elif kind < 0.85:
            stand(x, z, _r.uniform(0, math.tau), "squat", G0)
            P.place("bags", s * 13.75, G0, z + 0.6, _r.uniform(0, 3.0))
        else:
            stand(x, z, _r.uniform(0, math.tau), _r.choice(("phone", "smoke")), G0)
        if _r.random() < 0.4:
            P.place(_r.choice(("rubbish", "bags", "rubbish", "crates")), s * _r.uniform(13.4, 13.8), G0, z + _r.uniform(-2.0, 2.0), _r.uniform(0, 3.0))
        z -= _r.uniform(7.0, 19.0)

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
dress(fCw, ARM_TOP, 4, 5651, [(9.0, 15.0)], people_rate=0.1, weights=(0.2, 0.5, 0.3))
numeral("H4", AX0 - 0.1, ARM_TOP - 2.6, -712.0, 3.6, -math.pi / 2, lit=0.9, pad=0.8)
for (s, rr, col) in ((1.2, 0.12, RUST), (1.55, 0.07, STEEL), (22.4, 0.1, TEAL_PAINT)):
    x, _, z = fCw.p(fCw.at(s), 0.0, 0.2)
    rpipe((x, PT if s < 5 else SHOP_H, z), (x, ARM_TOP - 0.4, z), rr, col=col)
fWS = face("+z", ST_N, WX0, WX1)
weather(fWS, 0.4, fWS.width - 0.4, G0, 4.4, 5652, posters=False)
for s in (5.0, 13.5, 21.0, 30.5, 39.0):
    x, _, z = fWS.p(fWS.at(s), 0.0, 0.0)
    blade(x, 4.3, z + 0.9, _r.choice(("bs", "bm")), along="z")
