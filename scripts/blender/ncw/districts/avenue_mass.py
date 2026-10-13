"""Kabuki Avenue's skyline where the hero's lens cannot see it.

From a roof or a flying car the district read as a field of flat boxes of
one height (review m9). The show stacks its blocks: slabs of fifteen to
thirty storeys among the low ones, setbacks, a megablock stepping up in
terraces, bridges between towers, every roof worked on and the tall ones
crowned with signs and letters (ARL_JWwKdDs@23, ax5YUmkWf_Y@10,
x4ztgjvfU60@18). All of it stands south of the hero's eyes (z 12 and on),
in the south pack: the megablock behind the arm's east lots, two slabs
behind its west lots, and the bridges across the arm and the lanes.
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import avenue_kit as K
from ncw.districts import avenue_roofs as RF

G0 = B.G0
OPEN = {"+x": "open", "-x": "open", "+z": "open", "-z": "open"}
# A tower's own look: its windows of any module, fewer of them lit than the
# avenue's, and little hung on it but its units (the bays are many).
TOWER = dict(windows=(0, 1, 2, 3, 4, 5, 6), lit=(0.38, 0.72), warmth=(0.1, 1.0),
             tints=("charcoal", "navy", "teal", "plum", "concrete", "brown", "charcoal"),
             balcony=0.035, balcony_glass=0.6, ac=0.16, pipes=0.6, fire_escape=0.0, signs=0.0,
             cornice=0.5, roof_cap=6.0, setback=0.0, ledge_every=(1, 2, 2, 3))
EDGE_HUES = ("cyan", "pink", "amber", "magenta", "teal", "purple", "red", "green")
TOWERS = []    # every tier built here: (x0, x1, z0, z1, y0, y1)


def vsign(D, f, s, yb, hue, k=2.5, out=0.12):
    """A big vertical sign flat on a face: a blade's design k times its size
    in a frame, its long edges lit."""
    sw, sh = 1.2 * k, 5.0 * k
    f.box((D, "board_frame", 0), s - sw / 2 - 0.15, s + sw / 2 + 0.15, yb - 0.15, yb + sh + 0.15, out, out + 0.3)
    K.board(D, f, s, yb + sh / 2, "bl", out=out + 0.31, frame=False, scale=k)
    for e in (-1, 1):
        f.box((D, "neon_" + hue, 0), s + e * (sw / 2 + 0.08) - 0.06, s + e * (sw / 2 + 0.08) + 0.06, yb - 0.1, yb + sh + 0.1, out + 0.3, out + 0.36)
    return (s - sw / 2 - 0.4, s + sw / 2 + 0.4, yb - 0.4, yb + sh + 0.4)


def wall_screen(D, f, s, yb, w, h, rng, out=0.25):
    """An advert screen bolted flat to a face, lit, in its frame."""
    cx, cy, cz = f.p(f.at(s), yb + h / 2, out + 0.2)
    B.billboard(D, cx, cy, cz, w, h, f.yaw, rng, back=False, depth=0.3)
    return (s - w / 2 - 0.4, s + w / 2 + 0.4, yb - 0.4, yb + h + 0.4)


def edge_lines(D, f, y0, y1, rng, hues, every=(3, 4, 5), share=(0.35, 1.0), skip=()):
    """Lines of neon along a face's floor edges every few floors, each run
    its own length, starting from one end or the other (the show's towers
    carry them, x4ztgjvfU60@22)."""
    w = f.width
    k = rng.choice(every)
    y = SHOP_H + CELL_H * k
    while y < y1 - 1.5:
        if y > y0 + 1.0 and rng.random() < 0.75:
            L = w * rng.uniform(*share)
            a = 0.0 if rng.random() < 0.5 else w - L
            b = a + L
            if not any(s0 < b and s1 > a and t0 < y + 0.2 and t1 > y for (s0, s1, t0, t1) in skip):
                f.box((D, "neon_" + rng.choice(hues), 0), a, b, y - 0.05, y + 0.06, 0.0, 0.08)
        y += CELL_H * rng.choice(every)


def crown_edge(D, x0, x1, z0, z1, top, hue, rng, sides=None):
    """A line of light along some of a roof's edges at its parapet's foot,
    outside it: the roof drawn in light from the air on the sides it is
    seen from, not ringed."""
    sides = sides or rng.sample(("+x", "-x", "+z", "-z"), rng.randrange(1, 4))
    for name, f in B.faces_of(x0, x1, z0, z1).items():
        if name in sides:
            f.box((D, "neon_" + hue, 0), 0.0, f.width, top - 0.35, top - 0.22, 0.0, 0.09)


# Block letters for a word on a roof: strokes on a 3 x 5 grid (x0, y0, x1, y1).
LETTERS = dict(K.GLYPHS)
LETTERS.update({
    "B": ((0, 0, 1, 5), (1, 4, 2, 5), (1, 2, 2, 3), (1, 0, 2, 1), (2, 3, 3, 4.7), (2, 0.3, 3, 2)),
    "A": ((0, 0, 1, 5), (2, 0, 3, 5), (1, 4, 2, 5), (1, 2, 2, 3)),
    "E": ((0, 0, 1, 5), (1, 4, 3, 5), (1, 2, 2.5, 3), (1, 0, 3, 1)),
    "H": ((0, 0, 1, 5), (2, 0, 3, 5), (1, 2, 2, 3)),
    "I": ((1, 1, 2, 4), (0, 4, 3, 5), (0, 0, 3, 1)),
    "K": ((0, 0, 1, 5), (1, 2, 2, 3), (2, 3, 3, 5), (2, 0, 3, 2)),
    "R": ((0, 0, 1, 5), (1, 4, 3, 5), (2, 3, 3, 4), (1, 2, 3, 3), (2, 0, 3, 2)),
    "C": ((0, 0, 1, 5), (1, 4, 3, 5), (1, 0, 3, 1)),
    "N": ((0, 0, 1, 5), (2, 0, 3, 5), (1, 3, 1.5, 4), (1.5, 2, 2, 3)),
    "Y": ((0, 3, 1, 5), (2, 3, 3, 5), (0, 2, 3, 3), (1, 0, 2, 2)),
})


def roof_word(D, word, cx, cz, top, yaw, h, hue, rng):
    """A word in lit block letters on a lattice over a roof (the show's
    roof letters), turned to yaw (its face toward yaw); its frame dark, a
    catwalk along its foot, the letters lit both sides."""
    cw = h / 5.0
    lw, gap = 3 * cw, cw * 0.9
    n = len(word)
    total = n * lw + (n - 1) * gap
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    lift = rng.uniform(1.6, 2.6)
    y0 = top + lift
    # The lattice: posts behind every letter, braces back, a rail.
    for i in range(n + 1):
        u = -total / 2 + i * (lw + gap) - gap / 2
        u = max(-total / 2, min(total / 2, u))
        px, pz = cx + rx * u - nx * 0.5, cz + rz * u - nz * 0.5
        box((D, "metal", 0), px - 0.1, px + 0.1, top, y0 + h, pz - 0.1, pz + 0.1, scale=0.5)
        pipe((D, "metal", 1), (px, y0 + h * 0.6, pz), (px - nx * 2.2, top, pz - nz * 2.2), 0.05, segs=3)
    for yy in (y0 - 0.1, y0 + h + 0.1):
        a = (cx - rx * total / 2 - nx * 0.5, yy, cz - rz * total / 2 - nz * 0.5)
        b = (cx + rx * total / 2 - nx * 0.5, yy, cz + rz * total / 2 - nz * 0.5)
        pipe((D, "metal", 0), a, b, 0.08, segs=4)
    oriented_box((D, "steel", 0), cx + nx * 0.1, y0 - 0.35, cz + nz * 0.1, total + 0.6, 0.08, 1.0, yaw, scale=0.5, col=(0.12, 0.12, 0.13, 1))
    col = GLOW[hue]
    dim = tuple(v * 0.45 for v in col[:3]) + (1,)
    for i, ch in enumerate(word):
        ox = -total / 2 + i * (lw + gap)
        for (a0, b0, a1, b1) in LETTERS.get(ch, ()):
            uc = ox + (a0 + a1) / 2 * cw
            vc = y0 + (b0 + b1) / 2 * cw
            w_, h_ = (a1 - a0) * cw - 0.06, (b1 - b0) * cw - 0.06
            # The letter's can, dark, and its lit faces front and back.
            oriented_box((D, "dark", 0), cx + rx * uc, vc, cz + rz * uc, w_, h_, 0.3, yaw, scale=0.5)
            rotated_quad((D, "glow", 0), cx + rx * uc + nx * 0.16, vc, cz + rz * uc + nz * 0.16, w_ - 0.08, h_ - 0.08, yaw, col=col)
            rotated_quad((D, "glow", 0), cx + rx * uc - nx * 0.16, vc, cz + rz * uc - nz * 0.16, w_ - 0.08, h_ - 0.08, yaw + math.pi, col=dim)
    # Its light on the roof under it (the bake's height channel is the
    # roof's own here, behind every eye the hero has).
    for t in (-0.3, 0.0, 0.3):
        RF.lit(D, cx + rx * total * t + nx * 2.0, top + 1.0, cz + rz * total * t + nz * 2.0, hue, 8.0)
    return total


def stepped(D, lot, tiers, rng, style, face_yaw, ground=None, edge=None, lines=None, words=None, signs=(), base=0.0, keep=None):
    """A building in steps: `lot` the ground tier's (its sides as the
    generator takes them; None for one standing on a roof at `base`),
    `tiers` [(x0, x1, z0, z1, top)] from the ground up, each standing on the
    one before; every roof and terrace dressed (avenue_roofs) round the tier
    on it. `edge`: a hue for lines of light along the top tiers' edges;
    `lines`: hues for lines of neon along the floor edges; `words`: (word,
    tier, yaw, h, hue) roof letters; `signs`: (tier, face, s, yb, kind,
    hue) big signs on faces; `keep`: {tier: [(x0, x1, z0, z1)]} more of a
    roof that something else stands on."""
    q = []
    built = []
    for i, (x0, x1, z0, z1, top) in enumerate(tiers):
        if i == 0 and lot is not None:
            L = B.Lot(x0, x1, z0, z1, lot.front, dict(lot.sides), dict(lot.neighbours), D)
        else:
            L = B.Lot(x0, x1, z0, z1, "+z", dict(OPEN), {}, D)
        B.building(L, top, rng, style=style, base=base, signs=False, defer_roof=q, setback=False,
                   ground=ground or "blank")
        built.append((x0, x1, z0, z1, base, top))
        TOWERS.append(built[-1])
        base = top
    # Big signs and screens on the faces, then lines of neon round them.
    taken = {}
    for (ti, name, s, yb, kind, hue) in signs:
        x0, x1, z0, z1, y0, y1 = built[ti]
        f = B.faces_of(x0, x1, z0, z1)[name]
        f = B.Face(f.name, f.plane, f.a0, f.a1)
        if kind == "v":
            rect = vsign(D, f, s, yb, hue, k=rng.choice((2.5, 3.0)))
        else:
            w, h = kind
            rect = wall_screen(D, f, s, yb, w, h, rng)
        taken.setdefault((ti, name), []).append(rect)
    if lines:
        for ti, (x0, x1, z0, z1, y0, y1) in enumerate(built):
            for name, f in B.faces_of(x0, x1, z0, z1).items():
                if rng.random() < 0.7:
                    edge_lines(D, f, max(y0, SHOP_H + CELL_H * 2), y1, rng, lines, skip=taken.get((ti, name), ()))
    # The roofs: each round the tier that stands on it.
    for i, t in enumerate(q):
        (_, x0, x1, z0, z1, y1, seed, cap, _f, tint) = t
        tk = list((keep or {}).get(i, ()))
        if i + 1 < len(built):
            a0, a1, b0, b1 = built[i + 1][:4]
            tk.append((a0 - 0.9, a1 + 0.9, b0 - 0.9, b1 + 0.9))
        for (word, wt, yaw, h, hue) in (words or ()):
            if wt == i:
                tk.append(_word_spot(D, word, built[i], yaw, h, hue, rng))
        RF.dress(D, x0, x1, z0, z1, y1, random.Random(seed), tint=tint, lane_yaw=face_yaw, parapet=True, check=False,
                 taken=tk, style=RF.PENT, deep=True)
        if edge and (i == len(q) - 1 or rng.random() < 0.6):
            crown_edge(D, x0, x1, z0, z1, y1, edge, rng)
    return built


def _word_spot(D, word, tier, yaw, h, hue, rng):
    """Roof letters along the edge of a tier's roof that faces yaw; returns
    the strip they take."""
    x0, x1, z0, z1, _y0, top = tier
    nx, nz = math.sin(yaw), math.cos(yaw)
    if abs(nx) > 0.5:
        cx = x1 - 2.2 if nx > 0 else x0 + 2.2
        cz = (z0 + z1) / 2
        roof_word(D, word, cx, cz, top, yaw, h, hue, rng)
        return (cx - 3.2, cx + 3.2, z0, z1)
    cz = z1 - 2.2 if nz > 0 else z0 + 2.2
    cx = (x0 + x1) / 2
    roof_word(D, word, cx, cz, top, yaw, h, hue, rng)
    return (x0, x1, cz - 3.2, cz + 3.2)


def bridge(D, a, b, y, rng, w=3.2, h=3.4, hue="cyan", sign=True):
    """A skybridge from a to b ((x, z), along x or z): a glazed corridor on
    a dark frame, its rooms' light along both sides, a line of neon under
    its edges, lamps under its soffit, a sign on each side; people in it."""
    along_x = abs(b[0] - a[0]) > abs(b[1] - a[1])
    if along_x:
        x0, x1 = sorted((a[0], b[0]))
        z0, z1 = a[1] - w / 2, a[1] + w / 2
    else:
        z0, z1 = sorted((a[1], b[1]))
        x0, x1 = a[0] - w / 2, a[0] + w / 2
    frame = (0.07, 0.075, 0.085, 1)
    box((D, "trim", 0), x0, x1, y, y + 0.45, z0, z1, scale=1.0, col=frame)
    box((D, "trim", 0), x0, x1, y + h - 0.4, y + h, z0, z1, scale=1.0, col=frame)
    L = (x1 - x0) if along_x else (z1 - z0)
    room = tuple(v * rng.uniform(0.12, 0.18) for v in rng.choice(((1.0, 0.62, 0.35), (0.55, 0.75, 1.0), (1.0, 0.5, 0.75)))) + (1,)
    for side in (0, 1):
        if along_x:
            z = z0 - 0.01 if side == 0 else z1 + 0.01
            f = B.Face("-z" if side == 0 else "+z", z, x0, x1)
        else:
            x = x0 - 0.01 if side == 0 else x1 + 0.01
            f = B.Face("-x" if side == 0 else "+x", x, z0, z1)
        f.quad((D, "glow", 0), 0.0, L, y + 0.45, y + h - 0.4, 0.0, col=room)
        # Mullions every 1.2 m, a transom, the neon under its edge.
        s = 0.0
        while s <= L:
            f.box((D, "trim", 0), s - 0.08, s + 0.08, y + 0.45, y + h - 0.4, 0.0, 0.07, col=frame)
            s += 1.2
        f.box((D, "trim", 0), 0.0, L, y + h - 1.15, y + h - 1.05, 0.0, 0.07, col=frame)
        f.box((D, "neon_" + hue, 0), 0.0, L, y + 0.02, y + 0.12, 0.0, 0.08)
        if sign and L > 8.0:
            K.board(D, f, L / 2 + rng.uniform(-L * 0.2, L * 0.2), y + h + 0.9, rng.choice(("pm", "ps")), out=0.1, scale=1.4)
    # Its soffit lamps, and someone crossing.
    n = max(1, int(L // 6))
    for k in range(n):
        t = (k + 0.5) / n
        px = x0 + (x1 - x0) * t if along_x else (x0 + x1) / 2
        pz = (z0 + z1) / 2 if along_x else z0 + (z1 - z0) * t
        box((D, "glow", 0), px - 0.25, px + 0.25, y - 0.04, y, pz - 0.25, pz + 0.25, scale=0.5, col=GLOW["white"])
    for k in range(rng.randrange(1, 3)):
        t = rng.uniform(0.2, 0.8)
        px = x0 + (x1 - x0) * t if along_x else (x0 + x1) / 2 + rng.uniform(-0.6, 0.6)
        pz = (z0 + z1) / 2 + rng.uniform(-0.6, 0.6) if along_x else z0 + (z1 - z0) * t
        stand(px, pz, (math.pi / 2 if along_x else 0.0) + (math.pi if rng.random() < 0.5 else 0.0), "idle", y=y + 0.45)
    B.COLLISION.append(("box", x0, x1, y, y + h, z0, z1, D))


# ---------------------------------------------------------------------------
# The blocks behind the arm.
# ---------------------------------------------------------------------------
def storeys(n):
    return SHOP_H + CELL_H * n


def megablock(D):
    """Behind the arm's east lots, from the lane to Santo Domingo's side:
    a podium of eight storeys over the whole block, a body of sixteen on
    it set back from the lanes, and on that a tower of twenty-eight and a
    block of twenty-one, the tower crowned again; terraces on every step,
    big signs up its faces, lines of neon round it, letters on its roof."""
    rng = random.Random(8801)
    sides = {"-x": "back", "+x": "back", "-z": "back", "+z": "back"}
    B.ground_rect(D, 50.0, 108.0, 48.0, 92.0)
    st = dict(TOWER, tints=("navy", "charcoal", "teal"))
    lot = B.Lot(51.0, 107.0, 49.0, 91.0, "-z", sides, {}, D)
    tiers = [(51.0, 107.0, 49.0, 91.0, storeys(7)),
             (58.0, 106.0, 55.0, 90.0, storeys(15)),
             (82.0, 104.0, 62.0, 88.0, storeys(27)),
             (88.0, 99.0, 68.0, 82.0, storeys(30))]
    stepped(D, lot, tiers, rng, st, math.pi, edge="cyan", lines=("cyan", "magenta", "amber"),
            words=[("KABUKI", 2, -math.pi / 2, 4.2, "pink"), ("HOTEL", 0, -math.pi / 2, 3.4, "amber")],
            signs=[(1, "-x", 6.0, storeys(9), "v", "pink"), (1, "-z", 34.0, storeys(10), "v", "cyan"),
                   (2, "-x", 8.0, storeys(19), "v", "amber"), (2, "-z", 6.0, storeys(17), (12.0, 7.0), ""),
                   (0, "-z", 40.0, storeys(3), (14.0, 8.0), ""), (2, "+x", 13.0, storeys(20), "v", "magenta")],
            keep={1: [(59.1, 78.9, 56.1, 74.9)]})
    # The lower block on the body's west half, on its roof.
    stepped(D, None, [(60.0, 78.0, 57.0, 74.0, storeys(20))], random.Random(8802),
            dict(TOWER, tints=("plum", "brown", "concrete")), -math.pi / 2, edge="amber", lines=("amber", "pink"),
            words=[("BAR", 0, -math.pi / 2, 3.4, "cyan")],
            signs=[(0, "-z", 9.0, storeys(16), "v", "green")], base=storeys(15))
    # Lamps down the alleys at its foot, its doors' light.
    for z in range(52, 91, 6):
        light(D, 50.6, 3.0, z + rng.uniform(-1, 1), rng.choice(("amber", "amber", "cyan", "white")), 5.0)
    for x in range(54, 106, 7):
        light(D, x + rng.uniform(-1, 1), 3.0, 91.6, rng.choice(("amber", "amber", "white")), 5.0)


def west_slabs(D):
    """Behind the arm's west lots, from the lane to the district's edge: two
    slabs, one of eighteen storeys crowned again, one of twelve, a bridge
    between them at the tenth."""
    rng = random.Random(8811)
    B.ground_rect(D, -66.0, -50.0, 48.0, 92.0)
    sides = {"+x": "back", "-x": "open", "-z": "back", "+z": "back"}
    st = dict(TOWER, tints=("teal", "charcoal", "plum"))
    a = stepped(D, B.Lot(-65.0, -51.0, 49.0, 69.0, "+x", sides, {}, D),
                [(-65.0, -51.0, 49.0, 69.0, storeys(17)), (-63.0, -54.0, 52.0, 65.0, storeys(20))],
                rng, st, math.pi / 2, edge="magenta", lines=("magenta", "cyan"),
                words=[("LOTUS", 1, math.pi / 2, 3.0, "magenta")],
                signs=[(0, "+x", 10.0, storeys(6), "v", "cyan"), (0, "-z", 7.0, storeys(9), "v", "amber")])
    b = stepped(D, B.Lot(-65.0, -51.0, 72.0, 91.0, "+x", sides, {}, D),
                [(-65.0, -51.0, 72.0, 91.0, storeys(11))],
                random.Random(8812), dict(TOWER, tints=("brown", "navy")), math.pi / 2, edge="amber", lines=("amber",),
                signs=[(0, "+x", 9.5, storeys(3), (9.0, 5.5), "")])
    bridge(D, (-58.0, a[0][3]), (-58.0, b[0][2]), storeys(9), rng, w=3.0, hue="magenta", sign=False)
    for z in range(51, 91, 6):
        light(D, -50.6, 3.0, z + rng.uniform(-1, 1), rng.choice(("amber", "green", "white")), 5.0)


def build(D):
    megablock(D)
    west_slabs(D)
