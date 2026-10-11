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
    """A low planter against a wall: a box of earth, bamboo or a shrub lit
    from its foot."""
    f.box((D, "trim", 1), s - w / 2, s + w / 2, G0, 0.6, 0.05, 0.5, col=(0.09, 0.09, 0.1, 1))
    green = rng.choice(((0.1, 0.3, 0.14, 1), (0.14, 0.34, 0.1, 1), (0.3, 0.12, 0.22, 1)))
    n = max(2, int(w / 0.45))
    for k in range(n):
        px, _, pz = f.p(f.at(s - w / 2 + 0.25 + k * (w - 0.5) / (n - 1)), 0.0, 0.28)
        hh = rng.uniform(0.9, 2.0)
        oriented_box((D, "trim", 1), px, 0.6 + hh / 2, pz, 0.34, hh, 0.3, rng.uniform(0, 1.5), scale=1.0, col=green)
    p = f.p(f.at(s), 0.6, 0.6)
    light(D, p[0], 0.8, p[2], "green", 2.0)


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
    lo, hi = sorted((s_of(f, a0), s_of(f, a1)))
    s = lo + rng.uniform(2.0, 5.0)
    while s < hi - 2.0:
        a = f.at(s)
        if not any(k0 < a < k1 for k0, k1 in list(taken) + list(skip)):
            roll = rng.random()
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
    # small. West side: three stalls, boards, planters; both sides: signs
    # hung under the fascias. East side: the walk runs along the shops and
    # the braindance's crowd stands from z -112 to -36: the wall is left clear.
    fw = B.Face("+x", -WALK, -168.0, -10.0)
    fe = B.Face("-x", WALK, -168.0, -10.0)
    gap = [(-88.0, -72.0)]
    # (What already stands by the west wall: Kiroshi's screen, the vending
    # pair, the palms and their benches, a phone booth, a food box, bins.)
    west_taken = gap + [(-28.0, -15.0), (-44.5, -37.5), (-54.0, -50.0), (-66.5, -62.5), (-99.5, -92.0), (-125.5, -118.5),
                        (-155.5, -148.0), (-21.0, -17.0), (-48.0, -44.0), (-101.0, -97.0), (-136.0, -132.0)]
    frontage(AV, fw, -168.0, -10.0, rng, stalls=(-33.0, -70.0, -111.0, -142.5), vending=False, skip=west_taken)
    hung(AV, fe, -168.0, -10.0, rng, skip=gap + [(-125.0, -117.0)])
    for z in (-14.5, -31.5, -114.5, -131.0, -147.0, -161.0):
        K.a_board(AV, 12.75, z, math.pi + rng.uniform(-0.3, 0.3), rng)

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
        K.blade(AVS, (sx * WALK, -168.0), d, 11.0, "bl", gap=0.5, scale=1.9)
        K.blade(AVS, (sx * WALK, -168.0), d, 19.5, "bx", gap=0.5, scale=1.9)
        for yy in (6.4, 15.6):
            pipe((AVS, "metal", 1), (sx * WALK, yy, -168.0), (sx * WALK + d[0] * 2.6, yy, -168.0 + d[1] * 2.6), 0.06, segs=4)
    # (The walk goes up the avenue's east pavement by the shops and on
    # across the plaza street: the east corner keeps that line clear.)
    K.kiosk(AVS, -12.3, -170.1, 2.5, rng)
    stand(-11.2, -171.3, 2.5 + math.pi, "idle", y=G0)
    stand(-10.7, -170.3, 2.5 + math.pi - 0.4, "phone", y=G0)
    K.food_cart(AVS, 11.5, -170.6, -2.5, rng, colour="red")
    stand(11.5 + 0.45, -170.6 + 0.6, -2.5, "vendor", y=G0)
    stand(10.8, -171.6, -2.5 + math.pi, "idle", y=G0)
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
    hung(AVS, fn_e, 16.0, 43.0, rng)
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
                              (-46.5, -9.2, 0.0, "smoke"), (48.8, -8.8, 0.3, "talk"), (48.2, -8.0, 2.8, "talk"), (70.0, 8.5, math.pi, "squat"),
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
