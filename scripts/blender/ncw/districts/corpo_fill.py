"""Corpo Row's last pass: the backs, flanks and walls a lane, a mews, the
gaps and the roofs see, filled as buildings lived in (a window on every
floor, lit or dark, air conditioners, a sign; meters, pipes, bills and
crates at their feet between the doors), the gaps' planting broken up so
the people behind it stand clear, and the guideway's piers dressed. Built
last (corpo.py imports it after the line), on dice of its own, so nothing
dealt before it changes."""
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import corpo_kit as K
from ncw.districts.corpo_north import TOWER_X, T_BACK, BACK1, GAP_X
from ncw.districts.corpo_south import S1, S1_BACK, S3, MEWS_B

CO = "corpo"


def door_spans(f, margin=0.5):
    """Where a face has its doors (a back's, a dock's), as spans along it."""
    out = []
    for mat in ("door", "door_panel"):
        b = batches.get((CO, mat, 0))
        if not b:
            continue
        for face in b.faces:
            ws = [(b.verts[i][0], b.verts[i][2], -b.verts[i][1]) for i in face]
            if f.nx == 0:
                if any(abs(z - f.plane) > 0.3 for _, _, z in ws):
                    continue
                al = [x for x, _, _ in ws]
            else:
                if any(abs(x - f.plane) > 0.3 for x, _, _ in ws):
                    continue
                al = [z for _, _, z in ws]
            lo, hi = min(al), max(al)
            if hi < f.a0 or lo > f.a1:
                continue
            sa, sb = sorted((abs(lo - f.left), abs(hi - f.left)))
            out.append((sa - margin, sb + margin))
    return tuple(out)


def wall_top(x0, x1, z, side):
    """How high a wall stands at z (a block's back, its own first tier's
    top): the highest roof the district has listed whose edge is on it."""
    best = 0.0
    for d, a0, a1, b0, b1, y in B.ROOFS:
        if d != CO or a1 < x0 + 1.0 or a0 > x1 - 1.0:
            continue
        if abs((b1 if side > 0 else b0) - z) < 0.3:
            best = max(best, y)
    return best


# The towers' backs over the lane: three floors of windows over the doors,
# clear of the stair up the middle; meters, pipes, bills and crates at the
# foot between the doors.
for i, tx in enumerate(TOWER_X):
    f = B.Face("-z", T_BACK - 0.02, tx - 13.0, tx + 13.0)
    rv = random.Random(9400 + i)
    K.back_floors(f, 5.6, 16.4, rv, lit=0.42, keep=((10.2, 15.8),))
    K.foot_fill(f, rv, keep=door_spans(f) + ((10.2, 15.8),))

# The south side's backs on the first mews, and the plaza street's lots'
# backs on the second: every floor of them up to their first setback.
for j, (x0, x1, h) in enumerate(S1):
    f = B.Face("+z", S1_BACK, x0, x1)
    rv = random.Random(9420 + j)
    top = min(wall_top(x0, x1, S1_BACK, 1) or h, h) - 1.2
    K.back_floors(f, 5.6, top, rv, lit=0.45)
    K.foot_fill(f, rv, keep=door_spans(f))
for j, (x0, x1, h) in enumerate(S3):
    f = B.Face("-z", MEWS_B[1], x0, x1)
    rv = random.Random(9440 + j)
    top = min(wall_top(x0, x1, MEWS_B[1], -1) or 12.0, h) - 1.2
    K.back_floors(f, 5.6, top, rv, lit=0.5)
    K.foot_fill(f, rv, keep=door_spans(f))

# The back row's fronts across the lane, under the track.
for j, (x0, x1) in enumerate([(137.0, 182.0), (188.0, 226.0), (232.0, 262.0), (268.0, 298.0), (304.0, 338.0), (344.0, 378.0), (384.0, 428.0)]):
    f = B.Face("+z", BACK1, x0, x1)
    rv = random.Random(9460 + j)
    K.back_floors(f, 5.6, 16.8, rv, lit=0.4)
    K.foot_fill(f, rv, keep=door_spans(f))

# The towers' flanks in the gaps: a floor of windows over the side doors.
for j, gx in enumerate(GAP_X):
    for f in (B.Face("+x", gx - 6.0, -373.0, -354.0), B.Face("-x", gx + 6.0, -373.0, -354.0)):
        rv = random.Random(9480 + j * 2 + (f.nx > 0))
        K.back_floors(f, 3.4, 8.0, rv, lit=0.55, pitch=3.0, keep=door_spans(f, 0.8), ac=0.15)


# More people on the south pavement against the fronts, from the second
# tower east (the line's people, corpo_line.life, thrown again on its own
# dice to find where they stand), one between each two of them: in ones and
# twos, at the shutters and the shop windows, off the walkers' lines.
def _south_people():
    from ncw.districts.corpo_line import PIERS, FACADE
    rl = random.Random(9311)
    xs = []
    x = 141.0
    while x < 375.0:
        if all(abs(x - p) > 3.5 for p in PIERS):
            n = rl.choice((1, 1, 2, 2, 3))
            if n == 1:
                rl.choice(("idle", "phone", "smoke", "lean", "phone", "idle"))
                rl.uniform(-0.6, 0.6)
            else:
                rl.uniform(0.0, 6.28)
            xs.append(x)
        x += rl.uniform(9.0, 16.0)
    rp = random.Random(9501)
    for a, b in zip(xs, xs[1:]):
        m = (a + b) / 2 + rp.uniform(-1.0, 1.0)
        if b - a < 7.0 or m < 180.0 or any(abs(m - p) < 3.5 for p in PIERS):
            continue
        if rp.random() < 0.55:
            pose = rp.choice(("idle", "phone", "lean", "smoke", "idle"))
            stand(m, FACADE - (0.42 if pose == "lean" else 0.62), math.pi + rp.uniform(-0.7, 0.7), pose)
        else:
            K.talk(m, FACADE - 0.72, rp.choice((1.57, -1.57)) + rp.uniform(-0.3, 0.3), 2)


_south_people()


# The campus podiums' parapets, seen across their roofs: a glass rail on
# top lit along its edge, so from a roof the edge is a terrace's and not a
# plain dark slab.
def _campus_edges():
    from ncw.districts.corpo_south import CAMPUS, CAMPUS_LOTS
    z0, z1 = CAMPUS
    for j, (x0, x1) in enumerate(CAMPUS_LOTS):
        hue = ("amber", "cyan")[j % 2]
        for (xa, za), (xb, zb) in (((x0 + 0.15, z0 + 0.15), (x1 - 0.15, z0 + 0.15)), ((x0 + 0.15, z1 - 0.15), (x1 - 0.15, z1 - 0.15)),
                                   ((x0 + 0.15, z0 + 0.15), (x0 + 0.15, z1 - 0.15)), ((x1 - 0.15, z0 + 0.15), (x1 - 0.15, z1 - 0.15))):
            K.rail(xa, za, xb, zb, 12.7, hue, h=0.55, glow=True)


_campus_edges()
