"""Kabuki Avenue at street level, and its signs hung the way the show hangs
them.

`face_signs` stands in for the generator's while the avenue's buildings are
built: the same signs, drawn from each building's random stream in the same
order (so nothing else on a facade moves and the street's count of signs
runs as it did), but no longer all square to the wall: every blade is
turned its own way on its bracket, a stack's mast is turned, a board hangs
off the wall at one end (ax5YUmkWf_Y@111, Fn9gKhU_2_Q@38).

`build` sets down what the pavements carry beyond the kit's furniture:
stalls built against the walls with their keepers, kiosks and a cart on the
corners, A-boards, small signs hung over the pavement under every fascia,
cables with boards, bulbs and lanterns across the south street and the
arm, a gate of signs over each lane's mouth, manholes that steam, and the
people who stand about all of it. The avenue's own pavements north of the
junction are in the hero: they get the small things only, by the wall, in
the core; the rest streams with the south pack.
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import avenue_kit as K
from ncw.districts import avenue_lanes as LN

G0 = B.G0
# How face_signs names a sign: the street's own count (kit.st_name) for the
# hero's lots, so their designs stay as they were; avenue.py switches it to
# avenue_kit.st_id for the buildings the hero does not see.
NAME = [st_name]
# What hangs on a facade already, for `upper` to keep clear of: (face name,
# plane, where along it, height, half width, half height).
SIGNED = []
# What `upper` hung in its turn, for `more_signs`; and what stands by a
# frontage's wall, for `south_fill`: (face name, plane, from, to along it).
UPPER = []
STANDS = []


def _turn_rng(f, s, y):
    return random.Random(int((f.plane * 131 + f.at(s) * 17 + y * 7) * 100) & 0xFFFFFF)


def face_signs(district, f, r, s0, s1, top, density=1.0, colours=None, blades=True):
    """buildings.face_signs, turned: see the module's note. Every draw from
    `r` and every st_name is made as the generator makes it."""
    ceiling = max(SHOP_H + 2.4, min(top - 1.0, 30.0))
    count = int(round(r.uniform(0.25, 0.5) * (s1 - s0) * density))
    for _ in range(count):
        if blades and r.random() < 0.18:
            n = r.randrange(3, 6)
            s = r.uniform(s0 + 0.8, s1 - 0.8)
            y = r.uniform(SHOP_H + 1.0, max(SHOP_H + 1.2, ceiling - n * 1.0))
            SIGNED.append((f.name, f.plane, f.at(s), y + n * 0.5, 1.0, n * 0.55 + 0.6))
            t = _turn_rng(f, s, y)
            d = K.turned(f, t.choice((-1, 1)) * t.uniform(0.12, 0.55))
            p = f.p(f.at(s), y, 0.0)
            for j in range(n):
                size = r.choice(("ps", "ps", "bx"))
                w, h = ST_SIZES[size]
                K.blade(district, (p[0], p[2]), d, y + j * 1.05, size, gap=max(0.15, 0.9 - w / 2), bracket=False, sid=NAME[0](size))
            pipe((district, "metal", 1), (p[0] + d[0] * 0.08, y - 0.6, p[2] + d[1] * 0.08), (p[0] + d[0] * 0.08, y + n * 1.05, p[2] + d[1] * 0.08), 0.045, segs=4)
            for yy in (y - 0.35, y + n * 1.05 - 0.4):
                pipe((district, "metal", 1), (p[0], yy, p[2]), (p[0] + d[0] * 1.5, yy, p[2] + d[1] * 1.5), 0.03, segs=3)
            continue
        if blades and r.random() < 0.65:
            size = r.choices(["bs", "bm", "bl", "bx"], weights=[3, 4, 3, 1])[0]
            w, h = ST_SIZES[size]
            y = r.uniform(SHOP_H + 0.6 + h / 2, max(SHOP_H + 0.7 + h / 2, ceiling - h / 2))
            s = r.uniform(s0 + 0.6, s1 - 0.6)
            SIGNED.append((f.name, f.plane, f.at(s), y, 0.5, h / 2))
            t = _turn_rng(f, s, y)
            ang = t.choice((-1, 1)) * t.uniform(0.1, 0.5) if t.random() < 0.85 else 0.0
            K.face_blade(district, f, s, y, size, ang, gap=t.uniform(0.2, 0.6), sid=NAME[0](size))
        else:
            size = r.choices(["ps", "pm", "bx"], weights=[4, 4, 1])[0]
            w, h = ST_SIZES[size]
            if s1 - s0 < w + 1.0:
                continue
            y = r.uniform(SHOP_H + 0.5 + h / 2, max(SHOP_H + 0.6 + h / 2, ceiling - h / 2))
            s = r.uniform(s0 + w / 2 + 0.5, s1 - w / 2 - 0.5)
            out = r.uniform(0.12, 0.4)
            sid = NAME[0](size)
            SIGNED.append((f.name, f.plane, f.at(s), y, w / 2 + 0.3, h / 2))
            t = _turn_rng(f, s, y)
            # Hung off the wall at one end: its face turned up or down the
            # street, the other end on the wall.
            ang = t.choice((-1, 1)) * t.uniform(0.08, 0.32)
            d = K.turned(f, ang)
            tx, tz = (f.p(f.at(1.0), 0)[0] - f.p(f.at(0.0), 0)[0]), (f.p(f.at(1.0), 0)[2] - f.p(f.at(0.0), 0)[2])
            ca, sa = math.cos(ang), math.sin(ang)
            right = (tx * ca - f.nx * sa, 0.0, tz * ca - f.nz * sa)
            off = out + abs(sa) * w / 2 + 0.05
            c = f.p(f.at(s), y, off)
            yaw = math.atan2(d[0], d[1])
            oriented_box((district, "board_frame", 0), c[0] - d[0] * 0.07, y, c[2] - d[1] * 0.07, w + 0.14, h + 0.14, 0.12, yaw, scale=1.0)
            K.st_face(district, sid, c, right, K.UP, w, h)
            wp = f.p(f.at(s), y, 0.0)
            for dy in (-h * 0.3, h * 0.3):
                pipe((district, "metal", 1), (wp[0], y + dy, wp[2]), (c[0] - d[0] * 0.1, y + dy, c[2] - d[1] * 0.1), 0.025, segs=3)
    for _ in range(r.randrange(0, 3)):
        y = r.choice([SHOP_H + CELL_H * k for k in range(1, 6)]) + 0.05
        if y > top - 1:
            continue
        f.box((district, "neon_" + r.choice(colours or PANEL_COLOURS), 0), s0 + 0.4, s1 - 0.4, y, y + 0.08, 0.26, 0.3)


def upper(D, f, lots, rng, taken=(), cap=24.0):
    """What a thin facade carries over its shops, flat to the wall (a lens
    that looks along the wall sees a sliver of it): boards in frames, and
    condensers one over another by a downpipe. `lots`: (a0, a1, height)
    along the face; `taken`: (where along it, height, half width, half
    height) of what hangs there already, with what face_signs hung and the
    generator's own condensers."""
    taken = list(taken) + [t[2:] for t in SIGNED if t[0] == f.name and abs(t[1] - f.plane) < 1e-6]
    for (name, x, y, z, *_rest) in P.INSTANCES:
        if name == "ac_wall" and abs((x if f.nx else z) - f.plane) < 0.01:
            taken.append((z if f.nx else x, y + 0.3, 0.45, 0.35))

    def free(a, y, hw, hh):
        return all(abs(a - ta) > hw + thw + 0.3 or abs(y - ty) > hh + thh + 0.3 for ta, ty, thw, thh in taken)
    for a0, a1, h in lots:
        top = min(h - 1.2, cap)
        floors = int((top - SHOP_H) / CELL_H)
        bays = max(1, round((a1 - a0) / CELL_W))
        for _ in range(max(2, round((a1 - a0) / 3.0))):
            if rng.random() < 0.55:
                size, scale = rng.choice((("pm", 1.3), ("ps", 1.5), ("bx", 1.6), ("bm", 1.2), ("bl", 1.0), ("pm", 1.0)))
                hw, hh = ST_SIZES[size][0] * scale / 2, ST_SIZES[size][1] * scale / 2
                if top - hh <= SHOP_H + 1.0 + hh:
                    continue
                for _try in range(8):
                    a, y = rng.uniform(a0 + hw + 0.4, a1 - hw - 0.4), rng.uniform(SHOP_H + 1.0 + hh, top - hh)
                    if free(a, y, hw, hh):
                        K.board(D, f, s_of(f, a), y, size, out=0.12, scale=scale)
                        taken.append((a, y, hw, hh))
                        UPPER.append((f.name, f.plane, a, y, hw, hh))
                        break
            elif floors >= 2:
                for _try in range(8):
                    a = a0 + (rng.randrange(bays) + 0.5) * (a1 - a0) / bays + rng.uniform(-0.5, 0.5)
                    n = rng.randrange(2, min(floors, 4) + 1)
                    y0 = SHOP_H + rng.randrange(0, floors - n + 1) * CELL_H
                    if free(a, y0 + n * CELL_H / 2, 0.7, n * CELL_H / 2):
                        for k in range(n):
                            px, py, pz = f.p(a, y0 + k * CELL_H + 0.05, 0.0)
                            P.place("ac_wall", px, py, pz, f.yaw, district=D)
                        px, _, pz = f.p(a + 0.56, SHOP_H, 0.0)
                        P.place("pipe_v", px, SHOP_H, pz, f.yaw, sy=y0 + (n - 1) * CELL_H + 0.6 - SHOP_H, district=D)
                        taken.append((a, y0 + n * CELL_H / 2, 0.7, n * CELL_H / 2))
                        UPPER.append((f.name, f.plane, a, y0 + n * CELL_H / 2, 0.7, n * CELL_H / 2))
                        break


def s_of(f, a):
    """How far along a face the world coordinate a is."""
    return abs(a - f.left)


def hung(D, f, a0, a1, rng, every=(5.0, 9.0), y=2.95, skip=()):
    """Small signs hung over the pavement under a frontage's fascias, each
    on its bracket and turned a little, from a0 to a1 (world) along f."""
    lo, hi = sorted((s_of(f, a0), s_of(f, a1)))
    s = lo + rng.uniform(1.5, 4.0)
    while s < hi - 1.0:
        a = f.at(s)
        if not any(k0 < a < k1 for k0, k1 in skip):
            size, scale = rng.choice((("bx", 0.55), ("ps", 0.5), ("bs", 0.5), ("bx", 0.7), ("bs", 0.62)))
            h = ST_SIZES[size][1] * scale
            K.face_blade(D, f, s, y + h / 2, size, rng.uniform(-0.35, 0.35), gap=rng.uniform(0.25, 0.7), scale=scale)
        s += rng.uniform(*every)


def span(D, a, b, rng, kind=None):
    """A cable across a street between two facades, and what hangs on it."""
    kind = kind or rng.choice(("board", "bulbs", "lanterns", "cables", "board"))
    sag = math.dist(a, b) * rng.uniform(0.04, 0.07)
    if kind == "cables":
        for _ in range(rng.randrange(2, 4)):
            o = rng.uniform(-0.8, 0.8)
            LN.ribbon(D, (a[0] + o, a[1] + rng.uniform(0, 3), a[2] + o), (b[0] + o, b[1] + rng.uniform(0, 3), b[2] + o), sag * rng.uniform(0.7, 1.5), steps=8)
        return
    pts = LN.ribbon(D, a, b, sag, steps=12)
    if kind == "board":
        for i in rng.sample(range(3, 10), rng.choice((1, 2))):
            p, q = pts[i], pts[i + 1]
            K.hanging_board(D, p, q, min(p[1], q[1]) - rng.uniform(0.9, 1.3), rng.choice(("ps", "pm", "bx")), rng)
    elif kind == "bulbs":
        for p in pts[1:-1]:
            cylinder((D, "neon_amber", 1), p[0], p[2], p[1] - 0.18, p[1] - 0.03, 0.07, segs=4, cap=False)
    else:
        for p, q in zip(pts[1:-1], pts[2:]):
            for t in (0.0, 0.5):
                P.place("lantern", p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t - 0.36, p[2] + (q[2] - p[2]) * t, district=D)


def gateway(D, x0, x1, z, facing, rng, y=4.7):
    """A lane's mouth: a beam across it between two posts, a board on it
    turned to the street, lanterns under the beam."""
    for x in (x0 + 0.15, x1 - 0.15):
        box((D, "metal", 0), x - 0.1, x + 0.1, 0.0, y + 0.3, z - 0.1, z + 0.1, scale=0.5)
    box((D, "metal", 0), x0, x1, y, y + 0.3, z - 0.12, z + 0.12, scale=0.5)
    size, scale = ("pm", min(1.5, (x1 - x0 - 1.0) / ST_SIZES["pm"][0]))
    sw, sh = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
    cx = (x0 + x1) / 2
    box((D, "board_frame", 0), cx - sw / 2 - 0.08, cx + sw / 2 + 0.08, y + 0.3, y + 0.46 + sh, z - 0.08, z + 0.08, scale=1.0)
    K.st_face(D, K.st_id(size), (cx, y + 0.38 + sh / 2, z + facing * 0.09), (facing * 1.0, 0.0, 0.0), K.UP, sw, sh)
    K.st_face(D, K.st_id(size), (cx, y + 0.38 + sh / 2, z - facing * 0.09), (-facing * 1.0, 0.0, 0.0), K.UP, sw, sh)
    n = int((x1 - x0 - 0.8) / 0.8)
    for k in range(n):
        P.place("lantern", x0 + 0.6 + k * (x1 - x0 - 1.2) / max(1, n - 1), y - 0.34, z, district=D)
    hue = rng.choice(("pink", "cyan", "green", "amber"))
    box((D, "neon_" + hue, 0), x0 + 0.3, x1 - 0.3, y - 0.05, y, z + facing * 0.12, z + facing * 0.16, scale=0.5)


def manhole_steam(D, name, x, z):
    cylinder((D, "metal", 1), x, z, 0.0, 0.025, 0.42, segs=12)
    empty(f"anchor_steam_street_{name}", (x, 0.05, z))


def planter_box(D, f, s, rng, w=1.6):
    """A low planter against a wall: a box of earth and what grows in it,
    lit from its foot. Off the hero's avenue the plants are clumps of long
    leaves; on it they stay the blocks its pack has room for."""
    f.box((D, "trim", 1), s - w / 2, s + w / 2, G0, 0.6, 0.05, 0.5, col=(0.09, 0.09, 0.1, 1))
    green = rng.choice(((0.1, 0.3, 0.14, 1), (0.14, 0.34, 0.1, 1), (0.08, 0.26, 0.17, 1)))
    n = max(2, int(w / 0.45))
    for k in range(n):
        px, _, pz = f.p(f.at(s - w / 2 + 0.25 + k * (w - 0.5) / (n - 1)), 0.0, 0.28)
        hh = rng.uniform(0.9, 2.0)
        turn = rng.uniform(0, 1.5)
        if D == "avenue":
            oriented_box((D, "trim", 1), px, 0.6 + hh / 2, pz, 0.34, hh, 0.3, turn, scale=1.0, col=green)
        else:
            leaves(D, px, 0.6, pz, hh, turn)
    p = f.p(f.at(s), 0.6, 0.6)
    light(D, p[0], 0.8, p[2], "green", 2.0)
    if D != "avenue":
        light(D, p[0], 1.4, p[2], "white", 2.0)


LEAF = ((0.13, 0.42, 0.16, 1), (0.24, 0.5, 0.12, 1), (0.08, 0.3, 0.2, 1))


def leaves(D, x, y, z, h, turn, n=5):
    """A clump of long leaves standing out of the earth, each leaning its
    own way: seen from both sides."""
    k = (D, "trim", 1)
    for j in range(n):
        a = turn + j * math.tau / n
        dx, dz = math.cos(a), math.sin(a)
        tx, tz = -dz, dx
        hh = h * (1.0 - 0.14 * (j % 3))
        lean = (0.16 + 0.07 * (j % 3)) * hh
        col = LEAF[j % 3]
        b = (x + dx * 0.05, y, z + dz * 0.05)
        m = (x + dx * (0.05 + lean * 0.4), y + hh * 0.55, z + dz * (0.05 + lean * 0.4))
        t = (x + dx * (0.05 + lean), y + hh, z + dz * (0.05 + lean))
        a0, b0 = (b[0] - tx * 0.06, y, b[2] - tz * 0.06), (b[0] + tx * 0.06, y, b[2] + tz * 0.06)
        a1, b1 = (m[0] - tx * 0.11, m[1], m[2] - tz * 0.11), (m[0] + tx * 0.11, m[1], m[2] + tz * 0.11)
        quad(k, a0, b0, b1, a1, col=col)
        quad(k, b0, a0, a1, b1, col=col)
        poly(k, [a1, b1, t], [(0, 0), (1, 0), (0.5, 1)], col)
        poly(k, [b1, a1, t], [(1, 0), (0, 0), (0.5, 1)], col)


def frontage(D, f, a0, a1, rng, stalls=(), yatai_w=(2.4, 3.0), boards=True, planters=True, vending=True, hang=True, skip=()):
    """A stretch of pavement by a frontage (not one the walk camera runs
    along): stalls at the given places (world coordinate along the face),
    and between them A-boards, a planter, vending, by the wall; small signs
    hung under the fascias."""
    taken = []
    for a in stalls:
        w = rng.uniform(*yatai_w)
        K.yatai(D, f, s_of(f, a), rng, w=w)
        taken.append((a - w / 2 - 1.2, a + w / 2 + 1.2))
        STANDS.append((f.name, f.plane, a - w / 2 - 1.2, a + w / 2 + 1.2))
    lo, hi = sorted((s_of(f, a0), s_of(f, a1)))
    s = lo + rng.uniform(2.0, 5.0)
    while s < hi - 2.0:
        a = f.at(s)
        if not any(k0 < a < k1 for k0, k1 in list(taken) + list(skip)):
            roll = rng.random()
            if roll < 0.75:
                STANDS.append((f.name, f.plane, a - 1.6, a + 2.2))
            if roll < 0.3 and boards:
                p = f.p(a, 0.0, rng.uniform(0.75, 0.95))
                K.a_board(D, p[0], p[2], f.yaw + math.pi / 2 + rng.uniform(-0.4, 0.4), rng)
            elif roll < 0.5 and planters:
                planter_box(D, f, s, rng, w=rng.choice((1.2, 1.6, 2.2)))
            elif roll < 0.65 and vending:
                for i in range(rng.choice((1, 2))):
                    p = f.p(f.at(s + i * 1.06), 0.0, 0.02)
                    K.vendor(D, p[0], p[2], f.yaw, rng)
            elif roll < 0.75:
                p = f.p(a, 0.0, 0.55)
                P.place(rng.choice(("crates", "food_box", "bin")), p[0], G0, p[2], f.yaw, district=D)
        s += rng.uniform(4.0, 8.0)
    if hang:
        hung(D, f, a0, a1, rng, skip=taken)


def build(AV, AVS, lane_w, lane_e):
    """`lane_w`, `lane_e`: the x of each lane behind the avenue's rows, as
    (my wall, the far wall)."""
    rng = random.Random(7300)
    # ---- The avenue north of the junction: in the hero, so by the wall and
    # small. West side: four stalls, boards, planters; both sides: signs
    # hung under the fascias. East side: the braindance's crowd stands from
    # z -112 to -36, where the pavement is left as it was.
    fw = B.Face("+x", -WALK, -168.0, -10.0)
    fe = B.Face("-x", WALK, -168.0, -10.0)
    gap = [(-88.0, -72.0)]
    names = K.use_names(K.CORE_NAMES)
    # (What already stands by the west wall: Kiroshi's screen, the vending
    # pair, the palms and their benches, a phone booth, a food box, bins.)
    west_taken = gap + [(-28.0, -15.0), (-44.5, -37.5), (-54.0, -50.0), (-66.5, -62.5), (-99.5, -92.0), (-125.5, -118.5),
                        (-155.5, -148.0), (-21.0, -17.0), (-48.0, -44.0), (-101.0, -97.0), (-136.0, -132.0)]
    frontage(AV, fw, -168.0, -10.0, rng, stalls=(-33.0, -70.0, -111.0, -142.5), vending=False, skip=west_taken)
    hung(AV, fe, -168.0, -10.0, rng, skip=gap + [(-125.0, -117.0)])
    for z in (-14.5, -31.5, -114.5, -151.5):
        K.a_board(AV, 13.05, z, math.pi + rng.uniform(-0.3, 0.3), rng)
    # (The loop's walk goes up the middle of this pavement, x 11.8: what
    # stands here keeps to the wall.) Two stalls at its far end.
    for z in (-146.0, -157.5):
        K.yatai(AV, fe, s_of(fe, z), rng, w=2.6)
    K.use_names(names)

    # ---- Junction B's south corners: a kiosk and a cart on the corner
    # squares (the walkers' lines stop short of them), stalls and boards
    # along the plaza street's south pavement, a marquee on each corner lot
    # with its soffit lit, a tall sign on each corner turned to the crossing,
    # manholes steaming in the road, people.
    for sx in (-1, 1):
        f = B.Face("-z", -168.0, sx * WALK if sx > 0 else -WALK - 30.0, sx * WALK + 30.0 if sx > 0 else -WALK)
        frontage(AVS, f, sx * 16.0, sx * 43.0, rng, stalls=(sx * 24.0, sx * 36.5), planters=True)
        c0, c1 = sorted((s_of(f, sx * 14.3), s_of(f, sx * 21.0)))
        B.canopy(AVS, f, c0, c1, 2.6, 4.95, 1, rng.choice(("white", "cyan", "pink")))
        # A board on the lot's north wall, over the plaza street, and its
        # light on the crossing; a street lamp at the corner.
        bw, bh = rng.uniform(9.0, 12.0), rng.uniform(5.0, 6.5)
        B.billboard(AVS, sx * (WALK + rng.uniform(11.0, 18.0)), 9.5 + bh / 2, -168.32, bw, bh, math.pi, rng, back=False, depth=0.3)
        P.place("lamp_sodium", sx * 10.7, G0, -163.0, -sx * math.pi / 2, district=AVS)
        for (lx, lz, hue) in ((sx * 12.0, -170.0, "amber"), (sx * 7.0, -171.0, "white"), (sx * 20.0, -170.5, "pink" if sx < 0 else "cyan"), (sx * 3.0, -174.0, "amber")):
            light(AVS, lx, 2.5, lz, hue, 6.0)
        # The corner's tall sign, on the diagonal.
        d = (-sx * 0.7071, -0.7071)
        if sx > 0:
            K.blade(AVS, (sx * WALK, -168.0), d, 11.0, "bl", gap=0.5, scale=1.9)
        else:
            K.st_id("bl")  # (the west corner's lower blade made way for the advert drum; the signs' names run on as they did)
        K.blade(AVS, (sx * WALK, -168.0), d, 19.5, "bx", gap=0.5, scale=1.9)
        for yy in (6.4, 15.6) if sx > 0 else (15.6,):
            pipe((AVS, "metal", 1), (sx * WALK, yy, -168.0), (sx * WALK + d[0] * 2.6, yy, -168.0 + d[1] * 2.6), 0.06, segs=4)
    # (The walk goes up the middle of the avenue's east pavement and on
    # across the plaza street: the east corner keeps that line clear.)
    K.kiosk(AVS, -12.3, -170.1, 2.5, rng)
    stand(-11.2, -171.3, 2.5 + math.pi, "idle", y=G0)
    stand(-10.7, -170.3, 2.5 + math.pi - 0.4, "phone", y=G0)
    K.food_cart(AVS, 13.4, -170.9, -math.pi / 2, rng, colour="red")
    stand(14.15, -170.9, -math.pi / 2, "vendor", y=G0)
    stand(12.75, -171.7, math.pi / 2 - 0.5, "idle", y=G0)
    manhole_steam(AVS, "b0", -5.5, -176.0)
    manhole_steam(AVS, "b1", 6.5, -182.5)
    for (x, z, yaw, pose) in ((-10.9, -168.6, 2.6, "smoke"), (18.5, -168.9, math.pi, "lean"),
                              (-29.0, -168.9, math.pi, "lean"), (40.5, -169.0, math.pi - 0.4, "phone")):
        stand(x, z, yaw, pose, y=G0)

    # ---- The south street. Its south pavement: stalls against the row and
    # the arm's corner lots; its north pavement west of the avenue the same
    # (east of it the walk passes along the shops); cables across it with
    # boards, bulbs and lanterns; a gate over each lane's mouth.
    fs_w = B.Face("-z", 12.0, -66.0, -WALK)
    fs_e = B.Face("-z", 12.0, WALK, 108.0)
    frontage(AVS, fs_w, -64.0, -15.5, rng, stalls=(-58.0, -38.0, -23.0))
    frontage(AVS, fs_e, 15.5, 106.0, rng, stalls=(22.0, 37.0, 60.0, 76.0, 93.0))
    fn_w = B.Face("+z", -10.0, -WALK - 30.0, -WALK)
    frontage(AVS, fn_w, -43.0, -15.5, rng, stalls=(-33.0, -21.0))
    fn_e = B.Face("+z", -10.0, WALK, WALK + 30.0)
    frontage(AVS, fn_e, 15.5, 43.0, rng, stalls=(24.0, 36.0), vending=False)
    x = -62.0
    while x < 106.0:
        if abs(x) > 17.0 and not (lane_w[1] - 1 < x < lane_w[0] + 1) and not (lane_e[0] - 1 < x < lane_e[1] + 1):
            span(AVS, (x, rng.uniform(7.0, 10.0), -10.0), (x + rng.uniform(-3, 3), rng.uniform(7.0, 10.0), 12.0), rng)
        x += rng.uniform(7.0, 12.0)
    for (xa, xb) in (sorted(lane_w), sorted(lane_e)):
        gateway(AVS, xa, xb, -10.4, 1, rng)
        gateway(AVS, xa, xb, -167.6, -1, rng)
    manhole_steam(AVS, "s0", -30.0, 3.5)
    manhole_steam(AVS, "s1", 58.0, -2.0)
    # Kiosks on the junction's two south corners, behind the hero's lens.
    K.kiosk(AVS, 12.4, 10.3, -math.pi + 0.6, rng)
    K.kiosk(AVS, -12.4, 10.3, math.pi - 0.6, rng)
    for (x, z, yaw, pose) in ((11.4, 8.8, 0.6, "idle"), (10.8, 9.5, 0.4, "phone"), (-11.3, 8.8, -0.6, "idle"), (-10.6, 11.6, 2.0, "squat"),
                              (-46.5, -9.2, 0.0, "smoke"), (48.6, -11.4, 0.3, "talk"), (47.8, -12.2, 2.8, "talk"), (70.0, 8.5, math.pi, "squat"),
                              (-52.0, 8.5, math.pi, "phone"), (30.0, 8.45, math.pi, "idle")):
        stand(x, z, yaw, pose, y=G0)

    # ---- The south arm: stalls and boards along both pavements, cables
    # across it south of the phone hero's frame, steam in the road.
    fa_w = B.Face("+x", -WALK, 12.0, 88.0)
    fa_e = B.Face("-x", WALK, 12.0, 88.0)
    frontage(AVS, fa_w, 13.5, 87.0, rng, stalls=(21.0, 39.0, 58.0, 74.0))
    frontage(AVS, fa_e, 13.5, 87.0, rng, stalls=(30.0, 48.0, 67.0, 82.0))
    z = 36.0
    while z < 86.0:
        span(AVS, (-WALK, rng.uniform(7.5, 11.0), z), (WALK, rng.uniform(7.5, 11.0), z + rng.uniform(-3, 3)), rng)
        z += rng.uniform(6.5, 10.0)
    manhole_steam(AVS, "a0", 5.5, 46.0)
    manhole_steam(AVS, "a1", -4.5, 71.0)
    for (x, z, yaw, pose) in ((10.6, 44.0, -1.5, "squat"), (-10.6, 30.0, 1.5, "smoke"), (10.55, 63.0, -1.6, "phone"), (-10.5, 80.0, 1.4, "idle"),
                              (13.2, 55.0, -1.57, "lean"), (-13.2, 46.5, 1.57, "lean")):
        stand(x, z, yaw, pose, y=G0)
    south_fill(AVS)
    # The street's two large forms: an advert drum on a column over the
    # kiosk on junction B's south-west corner, and a canopy cantilevered
    # over the south street's south pavement between its two lamp posts.
    big = random.Random(7360)
    advert_drum(AVS, -12.3, -170.1, big)
    marquee(AVS, 57.5, 80.5, big)
    corner_b(AVS, fw)


def more_signs(D, f, lots, rng, cap=26.0, clear=()):
    """Over a thin facade's shops, in the gaps of what hangs there: columns
    of small boards on a mast and tall blades, every one turned its own
    way. `lots`: (a0, a1, height) along f; `clear`: stretches of f left
    alone."""
    taken = [t[2:] for t in SIGNED + UPPER if t[0] == f.name and abs(t[1] - f.plane) < 1e-6]
    for (name, x, y, z, *_rest) in P.INSTANCES:
        if name == "ac_wall" and abs((x if f.nx else z) - f.plane) < 0.01:
            taken.append((z if f.nx else x, y + 0.3, 0.45, 0.35))

    def free(a, y, hw, hh):
        return all(abs(a - ta) > hw + thw + 0.4 or abs(y - ty) > hh + thh + 0.4 for ta, ty, thw, thh in taken)
    for a0, a1, h in lots:
        top = min(h - 1.5, cap)
        for _ in range(max(2, round((a1 - a0) / 4.5))):
            n = rng.randrange(3, 6)
            size, scale = rng.choice((("bl", 1.3), ("bm", 1.5), ("bl", 1.0), ("bm", 1.9), ("bx", 2.0)))
            stacked = rng.random() < 0.5
            hw, hh = (1.1, n * 0.525 + 0.3) if stacked else (ST_SIZES[size][0] * scale / 2 + 0.4, ST_SIZES[size][1] * scale / 2)
            if top - hh <= SHOP_H + 1.2 + hh:
                continue
            for _try in range(10):
                a, y = rng.uniform(a0 + 1.2, a1 - 1.2), rng.uniform(SHOP_H + 1.2 + hh, top - hh)
                if free(a, y, hw, hh) and not any(c0 < a < c1 for c0, c1 in clear):
                    ang = rng.choice((-1, 1)) * rng.uniform(0.15, 0.6)
                    if stacked:
                        K.stack(D, f, s_of(f, a), y - n * 0.525 + 0.3, n, ang)
                    else:
                        K.face_blade(D, f, s_of(f, a), y, size, ang, gap=rng.uniform(0.3, 0.7), scale=scale)
                    taken.append((a, y, hw, hh))
                    UPPER.append((f.name, f.plane, a, y, hw, hh))
                    break


def clear_of(f, a, hw):
    """Nothing stands by f's wall within hw of a."""
    return not any(n == f.name and abs(pl - f.plane) < 1e-6 and lo - hw < a < hi + hw for (n, pl, lo, hi) in STANDS)


def wall_kiosk(D, f, a, rng, step=1.5):
    """A shallow kiosk with its back to a frontage, at the first clear place
    from a on, somebody buying; where it went, or None."""
    for k in range(8):
        if clear_of(f, a, 1.7):
            px, _, pz = f.p(a, 0.0, 0.55)
            K.kiosk(D, px, pz, f.yaw, rng, w=2.4, d=1.0)
            STANDS.append((f.name, f.plane, a - 1.7, a + 1.7))
            # Somebody at its end, turned to it along the wall.
            side = rng.choice((-1, 1))
            q = f.p(a + side * 1.75, 0.0, 0.8)
            yaw = math.atan2(-side, 0.0) if f.nx == 0 else math.atan2(0.0, -side)
            stand(q[0], q[2], yaw, rng.choice(("idle", "phone")), y=G0)
            return a
        a += step
    return None


def kerb_row(D, along, kerb, into, items, rng):
    """What stands on a pavement's kerb strip: `along` the axis the kerb
    runs on ("x" or "z"), `kerb` its line, `into` +1 or -1 toward the
    shops; items (where along it, "bench" | "tree" | "sit" | a pose)."""
    c = kerb + into * 0.3
    for a, what in items:
        x, z = (a, c) if along == "x" else (c, a)
        toward = (math.pi if into < 0 else 0.0) if along == "x" else (-math.pi / 2 if into < 0 else math.pi / 2)
        if what in ("bench", "sit"):
            P.place("bench", x, G0, z, 0.0 if along == "x" else math.pi / 2, district=D)
            if what == "sit":
                o = rng.uniform(-0.5, 0.5)
                stand(x + (o if along == "x" else 0.0), z + (o if along == "z" else 0.0), toward, "sit", y=G0 + 0.48)
        elif what == "tree":
            P.place(rng.choice(("planter_tree", "planter_palm")), x, G0, z + (into * 0.12 if along == "x" else 0.0), rng.uniform(0, 6.28), sxz=0.7, district=D)
            light(D, x, 1.2, z, rng.choice(("pink", "cyan", "amber")), 2.5)
        else:
            stand(x, z, toward + math.pi + rng.uniform(-0.5, 0.5), what, y=G0)


def south_fill(D):
    """The south street's and the arm's pavements, filled as the avenue's
    are: the long north pavement east of the east lane (the plaza block's
    podium) gets stalls, kiosks, boards, vending and signs under its
    fascias; every kerb strip benches, trees in planters and people on
    them; kiosks and people along the south side. All of it by the wall or
    on the kerb: the pavement's middle is the walkers'."""
    rng = random.Random(7350)
    fp = B.Face("+z", -10.0, 52.0, 108.0)
    plaza_vending = (63.6, 66.6)
    STANDS.append((fp.name, fp.plane) + plaza_vending)
    frontage(D, fp, 54.0, 106.5, rng, stalls=(58.5, 76.0, 92.5), skip=[plaza_vending])
    for a in (68.5, 85.0, 99.5):
        wall_kiosk(D, fp, a, rng)
    kerb_row(D, "x", -6.0, -1, ((60.5, "sit"), (72.5, "bench"), (74.5, "tree"), (84.0, "sit"), (91.0, "tree"), (93.0, "sit"), (104.5, "bench"),
                               (106.3, "tree"), (62.4, "phone"), (82.2, "squat"), (95.2, "smoke"), (55.0, "idle")), rng)
    for (x, z, yaw, pose) in ((70.8, -9.3, 1.3, "talk"), (71.7, -9.2, -1.7, "talk"), (88.0, -9.6, 0.0, "lean"), (103.0, -9.5, 0.3, "phone"),
                              (56.2, -9.5, 0.0, "lean"), (80.3, -9.3, 0.9, "idle")):
        stand(x, z, yaw, pose, y=G0)
    # The south side, east and west of the arm, and the north side west of
    # the avenue: kiosks in the gaps, the kerbs.
    fs_e = B.Face("-z", 12.0, WALK, 108.0)
    fs_w = B.Face("-z", 12.0, -66.0, -WALK)
    fn_w = B.Face("+z", -10.0, -WALK - 30.0, -WALK)
    for f, places in ((fs_e, (29.0, 49.0, 68.0, 86.0, 101.0)), (fs_w, (-48.0, -30.0)), (fn_w, (-27.0,))):
        for a in places:
            wall_kiosk(D, f, a, rng)
    kerb_row(D, "x", 8.0, 1, ((27.5, "sit"), (33.0, "tree"), (46.0, "bench"), (57.0, "tree"), (64.0, "sit"), (79.0, "bench"), (89.5, "tree"),
                              (96.0, "sit"), (42.0, "smoke"), (61.0, "squat"), (73.5, "phone"), (99.0, "idle"),
                              (-24.0, "sit"), (-33.0, "tree"), (-45.0, "bench"), (-52.0, "tree"), (-62.5, "sit"), (-40.0, "phone")), rng)
    kerb_row(D, "x", -6.0, -1, ((-25.0, "sit"), (-30.5, "tree"), (-38.5, "bench"), (-34.0, "squat")), rng)
    for (x, z, yaw, pose) in ((45.2, 11.3, 1.4, "talk"), (46.1, 11.2, -1.6, "talk"), (72.5, 11.7, math.pi, "lean"), (90.5, 11.4, 2.6, "phone"),
                              (104.0, 11.6, math.pi, "lean"), (-34.5, 11.6, math.pi, "lean"), (-55.0, 11.3, 2.4, "smoke")):
        stand(x, z, yaw, pose, y=G0)
    # The arm's kerbs, south of the phone hero's frame.
    kerb_row(D, "z", 10.0, 1, ((36.5, "sit"), (41.0, "tree"), (56.0, "bench"), (71.0, "tree"), (75.5, "sit"), (59.0, "phone")), rng)
    kerb_row(D, "z", -10.0, -1, ((42.5, "bench"), (47.0, "tree"), (58.0, "sit"), (73.5, "tree"), (77.0, "bench"), (69.0, "smoke")), rng)


def advert_drum(D, x, z, rng, y0=9.0, r=1.8, base=2.66):
    """An advert drum on a column (the show's street corners carry them): a
    steel column ringed with light, struts up to a short drum 9 to 12 m up,
    two bands of adverts round it, three to a band, rings of light at the
    bands' edges, its underside dark over the pavement's pools, a red lamp
    on a mast on top."""
    cylinder((D, "trim", 0), x, z, base, y0, 0.42, segs=10, col=K.STEEL, cap=False)
    for yy, hue in ((4.2, "cyan"), (6.6, "pink")):
        cylinder((D, "neon_" + hue, 0), x, z, yy, yy + 0.1, 0.45, segs=10, cap=False)
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        pipe((D, "metal", 1), (x + 0.4 * math.cos(a), y0 - 1.5, z + 0.4 * math.sin(a)), (x + (r - 0.3) * math.cos(a), y0, z + (r - 0.3) * math.sin(a)), 0.06, segs=4)
    top = y0 + 3.0
    n = 30

    def at(a, y, rr=r):
        return (x + rr * math.cos(a), y, z + rr * math.sin(a))
    cylinder((D, "trim", 0), x, z, y0, top, r - 0.04, segs=n, col=B.DARK_TRIM)
    for i in range(n):
        a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
        poly((D, "trim", 0), [(x, y0, z), at(a0, y0, r - 0.04), at(a1, y0, r - 0.04)], [(0.5, 0.5), (0, 0), (1, 0)], B.DARK_TRIM)
    for yy, hue in ((y0 - 0.02, "pink"), (y0 + 1.3, "cyan"), (top - 0.08, "pink")):
        cylinder((D, "neon_" + hue, 0), x, z, yy, yy + 0.1, r + 0.03, segs=n, cap=False)
    for (ya, yb, phase) in ((y0 + 0.12, y0 + 1.26, 0.0), (y0 + 1.44, top - 0.12, math.pi / 3)):
        for k in range(3):
            col = (rng.randrange(8) / 8.0 + 0.01, rng.randrange(8) / 8.0 + 0.01, rng.random(), 1.0)
            for j in range(n // 3):
                lo = phase + (k * (n // 3) + j) * math.tau / n
                hi = lo + math.tau / n
                u_lo, u_hi = 1.0 - j / (n // 3), 1.0 - (j + 1) / (n // 3)
                quad((D, "billboard", 0), at(hi, ya), at(lo, ya), at(lo, yb), at(hi, yb), uvs=((u_hi, 0), (u_lo, 0), (u_lo, 1), (u_hi, 1)), col=col)
    cylinder((D, "metal", 1), x, z, top, top + 2.2, 0.05, segs=4, cap=False)
    box((D, "glow", 0), x - 0.1, x + 0.1, top + 2.2, top + 2.42, z - 0.1, z + 0.1, scale=0.5, col=GLOW["red"])
    for k, hue in enumerate(("pink", "cyan", "white", "pink", "cyan")):
        a = k * math.tau / 5 + 0.6
        light(D, x + 2.2 * math.cos(a), 2.5, z + 2.2 * math.sin(a), hue, 6.0)


def marquee(D, x0, x1, rng, z_wall=12.0, out=4.4, y=4.8):
    """A canopy cantilevered over the south street's south pavement, from
    the fascias to the kerb: a dark slab hung on rods from the wall, strip
    lights across its soffit and their pools on the pavement, a band of
    light along its edge, boards standing on it turned to the street."""
    zf = z_wall - out
    box((D, "trim", 0), x0, x1, y, y + 0.3, zf, z_wall - 0.05, scale=1.0, col=B.DARK_TRIM, bottom=True)
    box((D, "neon_cyan", 0), x0, x1, y + 0.03, y + 0.15, zf - 0.04, zf, scale=1.0)
    box((D, "neon_pink", 0), x0, x1, y + 0.3, y + 0.36, zf, zf + 0.06, scale=1.0)
    for xe in (x0 - 0.04, x1):
        box((D, "neon_cyan", 0), xe, xe + 0.04, y + 0.03, y + 0.15, zf, z_wall - 0.4, scale=1.0)
    n = round((x1 - x0) / 2.3)
    for k in range(n):
        x = x0 + (k + 0.5) * (x1 - x0) / n
        box((D, "neon_white", 0), x - 0.07, x + 0.07, y - 0.04, y, zf + 0.5, z_wall - 0.7, scale=0.5, bottom=True)
        if k % 2 == 0:
            light(D, x, 2.6, zf + out / 2, rng.choice(("white", "cyan", "white", "pink")), 6.0)
    m = round((x1 - x0) / 4.6)
    for k in range(m + 1):
        x = x0 + 0.3 + k * (x1 - x0 - 0.6) / m
        pipe((D, "metal", 1), (x, y + 0.3, zf + 0.9), (x, y + 4.4, z_wall - 0.02), 0.05, segs=4)
        box((D, "metal", 1), x - 0.12, x + 0.12, y + 0.3, y + 0.42, zf + 0.75, zf + 1.05, scale=0.5)
    sw, sh = ST_SIZES["ps"][0] * 1.5, ST_SIZES["ps"][1] * 1.5
    b = round((x1 - x0) / 5.6)
    for k in range(b):
        x = x0 + (k + 0.5) * (x1 - x0) / b + rng.uniform(-0.5, 0.5)
        cy = y + 0.46 + sh / 2
        box((D, "board_frame", 0), x - sw / 2 - 0.07, x + sw / 2 + 0.07, cy - sh / 2 - 0.07, cy + sh / 2 + 0.07, zf + 0.1, zf + 0.26, scale=1.0)
        sid = K.st_id("ps")
        K.st_face(D, sid, (x, cy, zf + 0.085), (-1.0, 0.0, 0.0), K.UP, sw, sh)
        K.st_face(D, sid + "_b", (x, cy, zf + 0.275), (1.0, 0.0, 0.0), K.UP, sw, sh)


def totem(D, x, z, yaw, size="bm", scale=0.95):
    """A sign standing on the pavement on its own plinth, lit both sides."""
    w, h = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
    c, s_ = math.cos(yaw), math.sin(yaw)
    cy = G0 + 0.45 + h / 2
    oriented_box((D, "trim", 0), x, G0 + 0.2, z, w + 0.3, 0.4, 0.5, yaw, scale=1.0, col=B.DARK_TRIM)
    oriented_box((D, "board_frame", 0), x, cy, z, w + 0.14, h + 0.14, 0.18, yaw, scale=1.0)
    sid = K.st_id(size)
    K.st_face(D, sid, (x + s_ * 0.1, cy, z + c * 0.1), (c, 0.0, -s_), K.UP, w, h)
    K.st_face(D, sid + "_b", (x - s_ * 0.1, cy, z - c * 0.1), (-c, 0.0, s_), K.UP, w, h)


def corner_b(D, fw):
    """Junction B's south corners, as lit and as peopled as junction A's:
    a sign on a plinth on the east corner (west of it the drum), vending
    by both walls, people, pools of light. The walk's line up the east
    pavement (x 11.8) and the crossings stay clear. `fw`: the avenue's
    west frontage, for what stands by it already."""
    rng = random.Random(7370)
    totem(D, 13.25, -168.75, 0.0)
    for k in range(2):
        K.vendor(D, WALK - 0.03, -166.6 + k * 1.06, -math.pi / 2, rng)
    if clear_of(fw, -166.1, 1.3):
        for k in range(2):
            K.vendor(D, -WALK + 0.03, -166.6 + k * 1.06, math.pi / 2, rng)
    for (x, z, yaw, pose) in ((13.1, -169.75, 0.5, "talk"), (13.75, -169.6, -2.4, "talk"), (13.3, -164.4, -math.pi / 2, "lean"),
                              (-13.45, -171.2, 0.9, "talk"), (-12.7, -171.8, -2.3, "talk"), (-13.3, -164.4, math.pi / 2, "lean")):
        stand(x, z, yaw, pose, y=G0)
    for (x, z, hue, power) in ((12.6, -169.2, "pink", 7.0), (13.8, -171.4, "amber", 7.0), (11.2, -170.8, "white", 6.0),
                               (12.8, -164.5, "cyan", 5.0), (-12.8, -164.5, "pink", 5.0)):
        light(D, x, 2.5, z, hue, power)


def markings(D, rng):
    """What the show paints and stands along its streets (Fn9gKhU_2_Q@70,
    XMaaEjT0LhU@65, KvMY1uzSC1E@95), on the arm and the south street out of
    the hero's frames: words in the road for the driver coming up to them,
    kerbs painted yellow and worn, guard rails along the kerb where people
    cross to the stalls, two more kiosks, and people standing about the
    pavements in twos and threes."""
    white = (0.62, 0.62, 0.58, 1)
    # Words in the road, each in the lane of the driver it is written for
    # (traffic keeps to the right). The arm, south of the phone hero's frame
    # (z 30): SLOW for the driver going north up its east half, BUS by the
    # west kerb going south.
    K.road_word(D, "SLOW", 5.0, 42.0, (0.0, -1.0), rng=rng, col=white)
    K.road_word(D, "BUS", -5.2, 70.0, (0.0, 1.0), rng=rng, col=(0.6, 0.45, 0.07, 1))
    # The south street, either side of the junction, past the hero's frames:
    # STOP for the driver coming up to it, SLOW further out going west.
    K.road_word(D, "STOP", 27.0, -2.6, (-1.0, 0.0), rng=rng, col=white)
    K.road_word(D, "STOP", -27.0, 4.6, (1.0, 0.0), rng=rng, col=white)
    K.road_word(D, "SLOW", 70.0, -2.6, (-1.0, 0.0), rng=rng, col=white)
    # Yellow kerbs, worn.
    for sx in (-1, 1):
        K.kerb_paint(D, "z", sx * ROAD_HALF, 36.0, 86.0, -sx, rng)
    for (a, b) in ((-62.0, -22.0), (22.0, 104.0)):
        K.kerb_paint(D, "x", -6.0, a, b, 1, rng)
        K.kerb_paint(D, "x", 8.0, a, b, -1, rng)
    # Guard rails along the arm's kerbs by the crossings to the stalls.
    for sx in (-1, 1):
        for (z0, z1) in ((40.0, 48.0), (64.0, 70.0)):
            z = z0 + 1.0
            while z < z1:
                P.place("railing", sx * (ROAD_HALF + 0.3), G0, z, math.pi / 2, district=D)
                z += 2.0
    # Two more kiosks, on the arm and the south street's east pavement.
    K.kiosk(D, -12.3, 62.6, math.pi / 2, rng)
    K.kiosk(D, 86.0, 10.4, math.pi, rng)
    stand(-11.0, 63.4, -math.pi / 2, "phone", y=G0)
    stand(85.2, 9.0, 0.3, "idle", y=G0)
    # People on the south street's and the arm's pavements, by the kerb.
    poses = ("idle", "phone", "talk", "smoke", "idle", "talk", "lean", "squat")
    spots = [(sx * (ROAD_HALF + 0.55), z, sx) for sx in (-1, 1) for z in range(37, 86, 7)]
    spots += [(x, -6.55, -1) for x in list(range(-60, -20, 8)) + list(range(22, 104, 8))]
    spots += [(x, 8.55, 1) for x in list(range(-60, -20, 9)) + list(range(24, 104, 9))]
    for (x, z, side) in spots:
        if rng.random() < 0.3:
            continue
        x += rng.uniform(-1.5, 1.5) if abs(z) < 12 else 0.0
        z += 0.0 if abs(z) < 12 else rng.uniform(-1.5, 1.5)
        n = rng.choice((1, 2, 2, 3))
        for k in range(n):
            dx, dz = (0.0, k * 0.75) if abs(z) > 12 else (k * 0.75, 0.0)
            face = rng.uniform(0, math.tau) if n == 1 else (math.atan2(-dx, -dz) if k else math.atan2(dx + 0.01, dz + 0.01))
            pose = rng.choice(poses) if n == 1 else rng.choice(("talk", "talk", "smoke", "phone", "idle"))
            stand(x + dx, z + dz, face, pose, y=G0)
