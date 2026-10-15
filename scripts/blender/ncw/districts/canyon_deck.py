"""The canyon's decks lived on (D6ia1wjO7sg@220, YRL74JmhVgk@30): a
terrace's floor and a lookout's were broad dark planes with a table on
them. Now between the tables and the rail people stand in twos and threes
with drinks, sit at more tables, and planters, heaters, a vending machine
and lit boards over the bar fill what is left; each on its own dice, so the
lot's draws run on as they did.
"""
import math

from ncw.kit import *  # noqa: F401,F403
from ncw import props as P
from ncw.districts import canyon_kit as C
from ncw.districts.canyon_kit import CB


def _group(x, z, y, r, n=None):
    """Two or three people standing together, turned to each other."""
    n = n or r.choice((2, 2, 3))
    a0 = r.uniform(0, math.tau)
    for k in range(n):
        a = a0 + k * math.tau / n
        stand(x + 0.5 * math.cos(a), z + 0.5 * math.sin(a), math.atan2(-math.cos(a), -math.sin(a)), r.choice(("talk", "talk", "idle", "phone", "smoke")), y)


def _heater(x, z, y):
    """A patio heater: a post, a hood, its glow under the hood."""
    cylinder((CB, "metal", 1), x, z, y, y + 2.2, 0.05, segs=6)
    cylinder((CB, "metal", 1), x, z, y + 2.2, y + 2.3, 0.42, segs=10)
    cylinder((CB, "glow", 0), x, z, y + 1.95, y + 2.2, 0.12, segs=8, col=C.dim("amber", 0.9))
    light(CB, x, y + 1.9, z, "amber", 5.0)


def terrace(sb, dz0, bz1, t, wall_x, edge, side, cols, r):
    """Between a terrace's columns of tables (`cols`, their x) and its rail:
    groups standing, more tables, planters along it, heaters (where there
    is room); people at the bar; boards lit over the bar on the slab's wall
    (`sb`)."""
    near = min(cols, key=lambda c: abs(c - edge)) if cols else wall_x
    x_out = (near + edge) / 2 if abs(edge - near) >= 3.4 else None
    x_in = wall_x + side * 2.7
    z = dz0 + 2.2
    k = 0
    while z < bz1 - 2.4:
        kind = k % 4 if x_out is not None else -1
        if kind == 0:
            _group(x_out, z + r.uniform(-0.4, 0.4), t + 0.03, r)
        elif kind == 1:
            P.place("cy_table", x_out, t + 0.03, z, 0.0, district=CB)
            for i in (0, 1, 2):
                if r.random() < 0.7:
                    a = i * math.tau / 3 + 0.5
                    stand(x_out + 0.85 * math.cos(a), z + 0.85 * math.sin(a), math.atan2(-math.cos(a), -math.sin(a)), "sit", t + 0.53)
        elif kind == 2:
            P.place("cy_planter", x_out, t + 0.03, z, math.pi / 2, district=CB)
        elif kind == 3:
            _heater(x_out, z, t + 0.03)
            _group(x_out, z + 1.3, t + 0.03, r, 2)
        # (By the bar, people standing at it with a drink.)
        if r.random() < 0.45:
            stand(x_in, z + r.uniform(-0.6, 0.6), -side * math.pi / 2 + math.pi, r.choice(("idle", "phone", "lean")), t + 0.03)
        z += 3.4
        k += 1
    # Lit boards on the slab's wall over the bar, in words.
    w = sb.width
    for s in (w * 0.3, w * 0.7):
        if 2.0 < s < w - 2.0:
            C.board(sb, s, t + 3.6, r.choice(("pm", "ps")), r, key=CB)


def lookout(side, u0, sd, z0, z1, top, xof, r, table_u):
    """Along a lookout's deck: planters against both walls, a bench, a
    vending machine by the terrace's end, a group at the rail's end and
    one half way along."""
    zm = (z0 + z1) / 2
    u = u0 + 3.0
    k = 0
    while u < sd - 1.6:
        x = xof(side, u)
        if abs(u - table_u) < 2.2:
            u += 3.6
            k += 1
            continue
        if k % 2 == 0:
            P.place("cy_planter", x, top + 0.03, z0 + 0.45, 0.0, district=CB)
        else:
            P.place("bench", x, top + 0.03, z0 + 0.5, 0.0, district=CB)
            if r.random() < 0.6:
                stand(x + r.uniform(-0.4, 0.4), z0 + 0.5, 0.0, "sit", top + 0.51)
        if k % 3 == 1:
            P.place("cy_planter", x, top + 0.03, z1 - 0.45, 0.0, district=CB)
        u += 3.6
        k += 1
    P.place("vending", xof(side, sd - 0.8), top + 0.03, z1 - 0.6, math.pi, district=CB)
    light(CB, xof(side, sd - 0.8), top + 1.6, z1 - 1.4, "white", 3.0)
    _group(xof(side, (u0 + sd) / 2 - 2.4), zm + 0.7, top + 0.03, r)
