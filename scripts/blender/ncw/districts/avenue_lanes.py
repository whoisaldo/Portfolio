"""Kabuki Avenue's service lanes: the backs of its lots and what stands and
hangs between them.

The show's back passages (Fn9gKhU_2_Q@1, Zuzys9Ld_5M@87) are lit by tubes
overhead and caged lamps on the walls, green and cyan and amber, and are
full: pipes and ducts with small indicator lamps, shutters, grilles, drums,
bags, shelving, boxes, a wet floor carrying the light. `wall` builds the
ground floor of one lot's back that way (doors, a kitchen's lit door, a
loading bay, a barred window, vending, a poster, cabinets, stacks; a duct
or pipes over the doors, a tube, blades at angles up the wall over them);
`Lane` builds the lane itself: a wet carriageway between two concrete
aprons, cables, tubes, lanterns, washing and signs slung across it, and
along the far wall stalls, vending, lamp posts hung with signs, scooters,
pallets, drums, steam.
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import avenue_kit as K

G0 = B.G0
PLINTH = (0.035, 0.035, 0.04, 1)
# The painted band along the foot of a back wall, one colour a building.
DADO = [(0.04, 0.1, 0.08, 1), (0.04, 0.06, 0.14, 1), (0.14, 0.045, 0.04, 1), (0.16, 0.12, 0.04, 1), (0.09, 0.09, 0.1, 1),
        (0.1, 0.05, 0.12, 1), (0.03, 0.1, 0.12, 1)]
HUES = {
    "green": ("green", "green", "cyan", "amber", "white", "teal"),
    "blue": ("cyan", "cyan", "blue", "pink", "white", "purple"),
    "warm": ("amber", "pink", "red", "amber", "cyan", "white"),
}


def ribbon(D, a, b, sag, steps=6, w=0.045, detail=1):
    """A cable from a to b as a thin upright ribbon, both faces: what a
    cable across a lane is from anywhere along the lane."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * math.sin(math.pi * t), a[2] + (b[2] - a[2]) * t))
    k = (D, "dark", detail)
    for p, q in zip(pts, pts[1:]):
        quad(k, (p[0], p[1] - w / 2, p[2]), (q[0], q[1] - w / 2, q[2]), (q[0], q[1] + w / 2, q[2]), (p[0], p[1] + w / 2, p[2]))
        quad(k, (q[0], q[1] - w / 2, q[2]), (p[0], p[1] - w / 2, p[2]), (p[0], p[1] + w / 2, p[2]), (q[0], q[1] + w / 2, q[2]))
    return pts


def ladder(D, f, s, y0, y1, out=1.0):
    """A fire escape's drop ladder: two rails and its rungs."""
    k = (D, "metal", 1)
    for e in (s - 0.25, s + 0.25):
        f.quad(k, e - 0.025, e + 0.025, y0, y1, out)
    y = y0 + 0.3
    while y < y1:
        f.quad(k, s - 0.25, s + 0.25, y, y + 0.04, out)
        y += 0.32


def person(f, s, out, pose, turn=0.0, apron=0.9):
    """Someone by a wall: s along the face, `out` metres off it, facing out
    from it (turned `turn`), on the apron or down on the lane."""
    x, _, z = f.p(f.at(s), 0.0, out)
    stand(x, z, f.yaw + turn, pose, y=G0 if out < apron else 0.0)


def wall(D, f, rng, height, tcol, escapes=(), hues="green", dens=1.0, vents=None):
    """The ground floor of a lot's back on a lane, and what hangs on the
    back over it. `escapes`: where along the face (world coordinate) a fire
    escape already comes down. `vents`: a list to add (name-less) steam
    points to, for the lane to place."""
    w = f.width
    pal = HUES[hues]
    f.quad((D, "concrete", 0), 0.0, w, 0.0, SHOP_H, 0.0, uvs=((0, 0), (w / 3.0, 0), (w / 3.0, SHOP_H / 3.0), (0, SHOP_H / 3.0)))
    # A painted band along its foot and a pale line over it; the wall cast
    # in panels, a seam between each, a joint across at door height.
    dado = rng.choice(DADO)
    dh = rng.choice((1.1, 1.3, 1.5))
    f.quad((D, "trim", 0), 0.0, w, G0, dh, 0.012, col=dado)
    f.quad((D, "trim", 1), 0.0, w, dh, dh + 0.05, 0.013, col=tuple(min(1.0, v * 3.0 + 0.05) for v in dado[:3]) + (1,))
    f.quad((D, "dark", 1), 0.0, w, 2.95, 2.99, 0.011)
    seam = rng.choice((1.6, 2.0, 2.4))
    e = seam * rng.uniform(0.3, 0.9)
    while e < w - 0.3:
        f.quad((D, "dark", 1), e - 0.02, e + 0.02, dh + 0.05, SHOP_H - 0.2, 0.011)
        e += seam
    f.ledge((D, "trim", 0), 0.0, w, SHOP_H - 0.16, 0.22, 0.12, tcol, caps=False)
    # Its own dim light along it, so the wall is a wall between the pools.
    e = rng.uniform(1.0, 2.5)
    while e < w - 0.5:
        light(D, *f.p(f.at(e), 2.2, 1.0), rng.choice(pal + ("amber",)), rng.uniform(1.6, 2.6))
        e += rng.uniform(3.0, 4.5)
    busy = []   # spans along the wall whose band over the doors is taken
    doors = 0
    s = rng.uniform(0.5, 1.6)
    kinds = (("door", 1.3, 3.0), ("lit", 2.5, 2.2), ("shutter", 3.5, 1.0), ("bay", 3.5, 1.3), ("window", 2.1, 1.6),
             ("vending", 2.2, 0.9), ("poster", 2.4, 1.2), ("cabinet", 1.9, 1.2), ("stack", 2.0, 2.2), ("units", 1.9, 1.0),
             ("posters", 2.6, 1.8), ("meters", 1.8, 1.3))
    last = ""
    while s < w - 1.4:
        room = w - 0.4 - s
        fit = [k for k in kinds if k[1] <= room and k[0] != last]
        if not fit:
            break
        if doors == 0 and room < 5.0 and any(k[0] == "door" for k in fit):
            kind, kw = "door", 1.3
        else:
            kind, kw, _ = rng.choices(fit, weights=[k[2] for k in fit])[0]
        last = kind
        if kind == "door":
            doors += 1
            f.quad((D, "door", 0), s, s + 1.1, G0, 2.3, 0.03)
            f.box((D, "metal", 1), s - 0.08, s + 1.18, 2.3, 2.4, 0.0, 0.12)
            hue = rng.choice(pal)
            mid = s + 0.55
            f.box((D, "neon_" + hue, 0), mid - 0.14, mid + 0.14, 2.52, 2.74, 0.05, 0.22)
            light(D, *f.p(f.at(mid), 2.6, 0.9), hue, 4.0)
            if rng.random() < 0.35 and room > 3.4:
                K.board(D, f, s + 2.2, 2.75, "ps", out=0.08)
                kw = 3.3
            if rng.random() < 0.3:
                # Somebody out of the back door for a smoke.
                person(f, s + 1.55, 0.45, rng.choice(("smoke", "smoke", "lean", "phone")), rng.uniform(-0.5, 0.5))
        elif kind == "lit":
            doors += 1
            K.lit_door(D, f, s, rng, hue=rng.choice(("amber", "amber", "white", pal[0], "pink")))
            if vents is not None and rng.random() < 0.5:
                vents.append(f.p(f.at(s + 0.5), 0.0, 1.5))
            roll = rng.random()
            if roll < 0.3:
                person(f, s - 0.45, 0.4, rng.choice(("lean", "smoke")), rng.uniform(-0.3, 0.3))
            elif roll < 0.5:
                person(f, s - 0.5, 0.55, "squat", rng.uniform(-0.6, 0.6))
            elif roll < 0.65:
                person(f, s + 0.1, 1.5, "talk", math.pi / 2 + 0.25)
                person(f, s + 1.1, 1.6, "talk", -math.pi / 2 - 0.25)
        elif kind == "shutter":
            f.quad((D, "door_panel", 0), s, s + 3.2, G0, 3.0, 0.03)
            f.box((D, "metal", 1), s - 0.05, s + 3.25, 3.0, 3.3, 0.0, 0.25)
            f.quad((D, "hazard", 1), s - 0.05, s + 3.25, 3.3, 3.4, 0.03)
            f.box((D, "neon_white", 0), s + 1.4, s + 1.8, 3.42, 3.52, 0.05, 0.2)
            light(D, *f.p(f.at(s + 1.6), 3.4, 0.9), "white", 3.0)
            busy.append((s - 0.2, s + 3.4))
        elif kind == "bay":
            # A loading bay with its shutter up: the store behind it lit, a
            # pallet on its threshold.
            f.box((D, "trim", 0), s - 0.12, s + 3.32, G0, 3.12, -0.02, 0.07, col=PLINTH)
            f.quad((D, "shop", 0), s, s + 3.2, G0, 2.75, 0.075, col=(rng.uniform(0.7, 1.0), rng.random(), 1.0, 1.0))
            f.box((D, "door_panel", 0), s, s + 3.2, 2.75, 3.1, 0.07, 0.3)
            hue = rng.choice(("amber", "white", pal[1]))
            light(D, *f.p(f.at(s + 1.6), 0.5, 1.6), hue, 5.0)
            light(D, *f.p(f.at(s + 1.6), 2.4, 0.7), hue, 3.0)
            px, _, pz = f.p(f.at(s + rng.uniform(0.9, 2.3)), G0, 1.0)
            P.place(rng.choice(("crates", "crates", "bags")), px, G0, pz, f.yaw + rng.uniform(-0.3, 0.3), district=D)
            if rng.random() < 0.35:
                person(f, s + 0.5, 0.6, rng.choice(("idle", "phone", "smoke")), rng.uniform(-0.8, 0.8))
            busy.append((s - 0.2, s + 3.4))
        elif kind == "window":
            # A kitchen's window, barred, its extractor over it.
            ww = 1.7
            f.box((D, "trim", 0), s - 0.08, s + ww + 0.08, 1.3, 2.5, 0.0, 0.05, col=PLINTH)
            f.quad((D, "shop", 0), s, s + ww, 1.38, 2.42, 0.055, col=(rng.uniform(0.6, 1.0), rng.random(), 1.0, 1.0))
            for i in range(1, 6):
                e = s + ww * i / 6
                f.quad((D, "dark", 1), e - 0.02, e + 0.02, 1.38, 2.42, 0.075)
            f.box((D, "metal", 1), s + ww / 2 - 0.32, s + ww / 2 + 0.32, 2.7, 3.3, 0.0, 0.45)
            light(D, *f.p(f.at(s + ww / 2), 1.6, 1.0), "amber", 3.0)
            if vents is not None and rng.random() < 0.4:
                vents.append(f.p(f.at(s + ww / 2), 0.0, 1.1))
            busy.append((s - 0.2, s + ww + 0.2))
        elif kind == "vending":
            n = rng.choice((1, 2, 2))
            for i in range(n):
                px, _, pz = f.p(f.at(s + 0.55 + i * 1.06), G0, 0.02)
                K.vendor(D, px, pz, f.yaw, rng)
            if rng.random() < 0.4:
                person(f, s + 0.5, 1.25, rng.choice(("idle", "phone")), math.pi + rng.uniform(-0.3, 0.3))
            kw = n * 1.06 + 0.2
        elif kind == "posters":
            kw = K.fly_posters(D, f, s, rng) + 0.1
        elif kind == "meters":
            # Meters in a row under a conduit, a lamp on each, and the
            # conduit up the wall.
            n = rng.randrange(3, 6)
            for i in range(n):
                e = s + 0.1 + i * 0.36
                f.box((D, "metal", 1), e, e + 0.26, 1.25, 1.65, 0.0, 0.13)
                f.quad((D, "glow", 1), e + 0.09, e + 0.17, 1.52, 1.58, 0.135, col=GLOW[rng.choice(("green", "green", "amber", "red"))])
            f.box((D, "dark", 1), s, s + n * 0.36 + 0.1, 1.7, 1.76, 0.0, 0.08)
            px, _, pz = f.p(f.at(s + 0.05), 1.76, 0.0)
            P.place("pipe_v", px, 1.76, pz, f.yaw, sy=SHOP_H - 1.9, district=D)
            kw = n * 0.36 + 0.3
        elif kind == "poster":
            pw = rng.choice((1.5, 1.9))
            K.poster(D, f, s + pw / 2 + 0.1, 2.25, pw, rng.choice((1.9, 2.3)), rng)
            kw = pw + 0.3
        elif kind == "cabinet":
            for (c0, cw, ch) in ((0.0, 0.8, 1.75), (0.85, 0.65, 1.35)):
                f.box((D, "metal", 1), s + c0, s + c0 + cw, G0, G0 + ch, 0.0, 0.34)
                f.quad((D, "glow", 0), s + c0 + cw / 2 - 0.04, s + c0 + cw / 2 + 0.04, G0 + ch - 0.3, G0 + ch - 0.22, 0.345,
                       col=GLOW[rng.choice(("green", "red", "cyan", "amber"))])
            px, _, pz = f.p(f.at(s + 0.4), G0 + 1.75, 0.0)
            P.place("pipe_v", px, G0 + 1.75, pz, f.yaw, sy=SHOP_H - 2.0, district=D)
        elif kind == "stack":
            pick = rng.random()
            px, _, pz = f.p(f.at(s + 1.0), G0, 0.75)
            if pick < 0.2:
                P.place("dumpster", px, G0, pz, f.yaw, district=D)
            elif pick < 0.4:
                P.place("bags", px, G0, pz, f.yaw + rng.uniform(-0.6, 0.6), district=D)
                P.place("bags", *f.p(f.at(s + 1.7), G0, 0.6), f.yaw + 1.3, district=D)
            elif pick < 0.55:
                for i in range(rng.randrange(2, 4)):
                    P.place("drum", *f.p(f.at(s + 0.4 + i * 0.62), G0, 0.4 + 0.3 * (i % 2)), district=D)
            elif pick < 0.7:
                K.gas_bottles(D, *f.p(f.at(s + 0.6), 0.0, 0.3)[::2], rng)
                P.place("crates", *f.p(f.at(s + 1.5), G0, 0.7), f.yaw, district=D)
            elif pick < 0.85:
                K.boxes_heap(D, px, pz, rng)
            else:
                K.pallet(D, px, pz, f.yaw + rng.uniform(-0.2, 0.2), rng)
        else:
            for i in range(rng.choice((1, 2))):
                px, _, pz = f.p(f.at(s + 0.8 + i * 1.55), G0, 0.55)
                P.place("ac_roof", px, G0, pz, f.yaw, district=D)
            kw = 1.7 + 1.55 * (i)
        s += kw + rng.uniform(0.15, 0.8)
    # Over the doors: a duct with its indicator lamps, or pipes on brackets.
    if w > 5.0:
        if rng.random() < 0.5:
            a = rng.uniform(0.2, w * 0.3)
            K.duct(D, f, a, rng.uniform(w * 0.6, w - 0.2), 3.56, rng)
        else:
            K.pipes_run(D, f, 0.15, w - 0.15, 4.05, rng, n=rng.choice((2, 2, 3)))
    # A tube on the wall where the band is free, and its pool on the lane.
    for _ in range(max(1, round(w / 9.0 * dens))):
        tl = rng.uniform(1.2, 2.2)
        for _try in range(6):
            a = rng.uniform(0.3, max(0.4, w - tl - 0.3))
            if not any(a < b1 and a + tl > b0 for b0, b1 in busy):
                hue = rng.choice(pal[:3])
                K.tube(D, f.p(f.at(a), 3.12, 0.16), f.p(f.at(a + tl), 3.12, 0.16), hue, power=6.5)
                busy.append((a - 0.3, a + tl + 0.3))
                break
    # A line of light under the first floor's sill on some backs.
    if rng.random() < 0.3 * dens:
        K.neon_bar(D, f, 0.4, w - 0.4, SHOP_H + 0.12, rng.choice(pal), out=0.16)
    # Blades at angles up the wall, small boards, a stack: a back door has a
    # name too (ax5YUmkWf_Y@111).
    top = min(height - 1.5, 15.0)
    clear = lambda a: all(abs(a - e) > 3.0 for e in escapes)  # noqa: E731
    n = max(1, round(w / 5.5 * dens * rng.uniform(0.7, 1.5)))
    for _ in range(n):
        ss = rng.uniform(0.7, w - 0.7)
        if not clear(f.at(ss)):
            continue
        roll = rng.random()
        ang = rng.choice((-1, 1)) * rng.uniform(0.15, 0.6)
        if roll < 0.5:
            size = rng.choices(("bs", "bm", "bl", "bx"), weights=(4, 4, 1, 2))[0]
            hh = ST_SIZES[size][1]
            if top - hh / 2 < 5.3 + hh / 2:
                continue
            K.face_blade(D, f, ss, rng.uniform(5.3 + hh / 2, top - hh / 2), size, ang, gap=rng.uniform(0.25, 0.7))
        elif roll < 0.72 and top > 10.0:
            K.stack(D, f, ss, rng.uniform(5.6, top - 4.4), rng.randrange(3, 5), ang)
        elif w > 4.5:
            size = rng.choice(("ps", "pm", "bx"))
            sw, sh = ST_SIZES[size]
            ss = min(max(ss, sw / 2 + 0.3), w - sw / 2 - 0.3)
            if top - 1.0 > 5.4:
                K.board(D, f, ss, rng.uniform(5.4, top - 1.0), size, out=rng.uniform(0.1, 0.3), roll=rng.uniform(-0.06, 0.06))
    for e in escapes:
        sl = abs(e - f.left) - 1.5
        if 0.6 < sl < w - 0.6:
            ladder(D, f, sl, 2.5, SHOP_H + 0.5)


class Lane:
    """A lane between my wall and the far one. `axis` "z": it runs along z,
    `mine` and `far` are the two walls' x; "x": along x, the walls' z.
    `a`..`b` along it. `skip`: stretches along it to leave bare of anything
    standing or hanging (another district's structure crosses there)."""

    def __init__(self, D, name, axis, mine, far, a, b, seed, hues="green", skip=(), dens=1.0, aprons=(0.9, 1.5)):
        self.D, self.name, self.axis, self.mine, self.far = D, name, axis, mine, far
        self.a, self.b = a, b
        self.dir = 1.0 if far > mine else -1.0
        self.width = abs(far - mine)
        self.rng = random.Random(seed)
        self.pal = HUES[hues]
        self.skip = skip
        self.dens = dens
        self.aprons = aprons
        self.vents = []
        self.n_vent = 0

    def pt(self, u, v, y=0.0):
        c = self.mine + self.dir * u
        return (c, y, v) if self.axis == "z" else (v, y, c)

    def yaw(self, to_far):
        d = self.dir if to_far else -self.dir
        return (d * math.pi / 2) if self.axis == "z" else (0.0 if d > 0 else math.pi)

    def free(self, v, m=0.0):
        return not any(s0 - m < v < s1 + m for s0, s1 in self.skip)

    def rect(self, key, u0, u1, v0, v1, y0, y1=None, scale=2.0):
        p, q = self.pt(u0, v0), self.pt(u1, v1)
        x0, x1 = sorted((p[0], q[0]))
        z0, z1 = sorted((p[2], q[2]))
        if y1 is None:
            s = 1.0 / scale
            pts = ((x0, y0, z1), (x1, y0, z1), (x1, y0, z0), (x0, y0, z0))
            quad(key, *pts, uvs=tuple((c[0] * s, -c[2] * s) for c in pts))
        else:
            box(key, x0, x1, y0, y1, z0, z1, scale=scale)

    def ground(self, mouths=()):
        """A wet carriageway down the middle, a concrete apron along each
        wall, a drain down the centre line, manholes; at a mouth the kerb
        dropped to the street's pavement."""
        D, W = self.D, self.width
        a0, a1 = self.aprons
        self.rect((D, "asphalt", 0), a0, W - a1, self.a, self.b, 0.0, scale=6.0)
        self.rect((D, "sidewalk", 0), 0.0, a0, self.a, self.b, 0.0, G0)
        self.rect((D, "sidewalk", 0), W - a1, W, self.a, self.b, 0.0, G0)
        mid = (a0 + W - a1) / 2
        self.rect((D, "dark", 1), mid - 0.14, mid + 0.14, self.a + 0.5, self.b - 0.5, 0.012, scale=0.5)
        v = self.a + self.rng.uniform(6, 14)
        while v < self.b - 4:
            x, _, z = self.pt(mid + self.rng.uniform(-1.0, 1.0), v)
            cylinder((D, "metal", 1), x, z, 0.0, 0.02, 0.38, segs=10)
            v += self.rng.uniform(16, 30)
        v = self.a + 2.5
        while v < self.b - 1.0:
            p = self.pt(mid + self.rng.uniform(-0.8, 0.8), v)
            light(D, p[0], 2.0, p[2], self.rng.choice(self.pal), self.rng.uniform(1.4, 2.4))
            v += self.rng.uniform(4.0, 6.0)
        for v, d in mouths:
            # The lane's end against a street's pavement: a short ramp.
            p0, p1 = self.pt(a0, v), self.pt(W - a1, v)
            q0, q1 = self.pt(a0, v - d * 0.9), self.pt(W - a1, v - d * 0.9)
            pts = [(p0[0], G0, p0[2]), (p1[0], G0, p1[2]), (q1[0], 0.0, q1[2]), (q0[0], 0.0, q0[2])]
            quad((D, "kerb", 0), *pts)
            quad((D, "kerb", 0), *reversed(pts))

    def vent(self, x, z):
        self.n_vent += 1
        box((self.D, "metal", 1), x - 0.4, x + 0.4, 0.0, 0.06, z - 0.4, z + 0.4, scale=0.5)
        empty(f"anchor_steam_lane_{self.name}{self.n_vent}", (x, 0.2, z))

    def overhead(self, spacing=(8.0, 13.0)):
        """What is slung from wall to wall: cable bundles, tubes hung under
        them (the lane's light), strings of lanterns and of bulbs, a sign on
        two wires, washing higher up."""
        D, W, r = self.D, self.width, self.rng
        v = self.a + r.uniform(3.0, 7.0)
        last = ""
        while v < self.b - 3.0:
            if self.free(v, 1.5):
                kind = r.choices(("tube", "tube_along", "lanterns", "bulbs", "board", "cables", "washing"),
                                 weights=(3.0, 2.0, 1.6, 1.2, 1.6, 1.6, 1.4))[0]
                if kind == last:
                    kind = "cables"
                last = kind
                y0, y1 = r.uniform(5.2, 6.4), r.uniform(5.2, 6.4)
                pa, pb = self.pt(0.0, v, y0), self.pt(W, v + r.uniform(-1.5, 1.5), y1)
                if kind == "tube":
                    pts = ribbon(D, pa, pb, r.uniform(0.3, 0.6))
                    hue = r.choice(self.pal[:3])
                    u0 = r.uniform(W * 0.22, W * 0.4)
                    ta, tb = self.pt(u0, v, 4.25), self.pt(u0 + r.uniform(1.4, 2.2), v, 4.25)
                    K.tube(D, ta, tb, hue, power=8.0, hang=min(p[1] for p in pts))
                elif kind == "tube_along":
                    ribbon(D, pa, pb, 0.4)
                    hue = r.choice(self.pal[:3])
                    u0 = r.uniform(W * 0.35, W * 0.6)
                    ta, tb = self.pt(u0, v - 1.0, 4.4), self.pt(u0, v + 1.0, 4.4)
                    K.tube(D, ta, tb, hue, power=8.0, hang=min(y0, y1) - 0.35)
                elif kind == "lanterns":
                    pts = ribbon(D, self.pt(0.0, v, 4.9), self.pt(W, v, 4.9), 0.55, steps=8)
                    for p in pts[1:-1]:
                        P.place("lantern", p[0], p[1] - 0.36, p[2], district=D)
                elif kind == "bulbs":
                    pts = ribbon(D, self.pt(0.0, v, 4.7), self.pt(W, v, 5.0), 0.7, steps=10, w=0.03)
                    for p in pts[1:-1]:
                        cylinder((D, "neon_amber", 1), p[0], p[2], p[1] - 0.17, p[1] - 0.03, 0.06, segs=4, cap=False)
                    m = pts[len(pts) // 2]
                    light(D, m[0], 4.0, m[2], "amber", 4.0)
                elif kind == "board":
                    ribbon(D, pa, pb, 0.25)
                    K.hanging_board(D, pa, pb, min(y0, y1) - r.uniform(1.0, 1.5), r.choice(("ps", "pm", "bx", "ps")), r)
                elif kind == "cables":
                    for _ in range(r.randrange(2, 5)):
                        o = r.uniform(-0.5, 0.5)
                        ribbon(D, self.pt(0.0, v + o, y0 + r.uniform(0, 2.5)), self.pt(W, v + o + r.uniform(-2, 2), y1 + r.uniform(0, 2.5)),
                               r.uniform(0.3, 1.1))
                else:
                    K.laundry(D, self.pt(0.0, v, r.uniform(7.0, 9.5)), self.pt(W, v + r.uniform(-1.0, 1.0), r.uniform(7.0, 9.5)), r)
            v += r.uniform(*spacing) / self.dens

    def far_side(self, spacing=(5.5, 9.0), stalls=True):
        """Along the far wall: a food stall on its own slab, vending, a lamp
        post hung with signs, scooters, pallets and crates, drums, a skip, a
        tree in a tub, cable from post to post."""
        D, W, r = self.D, self.width, self.rng
        face = self.yaw(False)
        v = self.a + r.uniform(2.5, 6.0)
        last = ""
        posts = []
        while v < self.b - 2.5:
            if self.free(v, 3.0):
                kinds = ["post", "vending", "scooters", "pallets", "drums", "skip", "tree", "boxes", "sign"]
                weights = [2.2, 1.2, 1.3, 1.6, 1.0, 1.0, 0.8, 1.4, 1.4]
                if stalls and W >= 6.0:
                    kinds.append("stall")
                    weights.append(1.6)
                kind = r.choices(kinds, weights=weights)[0]
                if kind == last:
                    kind = "post"
                last = kind
                at = lambda u, dv=0.0: self.pt(W - u, v + dv)  # noqa: E731 (u metres off the far wall)
                if kind == "stall":
                    p = at(1.0)
                    sw = r.choice((2.4, 2.8, 3.2))
                    self.rect((D, "sidewalk", 0), W - 3.2, W - self.aprons[1], v - sw / 2 - 0.5, v + sw / 2 + 0.5, 0.0, G0)
                    K.stall(D, p[0], p[2], face, r, colour=r.choice(("red", "amber", "pink", "cyan")), w=sw)
                    if r.random() < 0.6:
                        q = at(1.1, sw / 2 + 1.3)
                        K.umbrella(D, q[0], q[2], r.choice(("red", "amber", "cyan", "pink")), r=1.0, h=2.1)
                        for dv in (-0.45, 0.45):
                            qq = at(1.1, sw / 2 + 1.3 + dv)
                            K.stool(D, qq[0], qq[2], (0.05, 0.14, 0.2, 1))
                    self.vents.append(self.pt(W - 0.9, v + 0.3))
                    v += sw
                elif kind == "post":
                    p = at(0.35)
                    posts.append((p[0], p[2]))
                    cylinder((D, "metal", 1), p[0], p[2], G0, 6.2, 0.07, segs=5, cap=False)
                    hue = r.choice(self.pal)
                    arm = self.pt(W - 1.5, v, 5.6)
                    pipe((D, "metal", 1), (p[0], 5.7, p[2]), arm, 0.035, segs=4)
                    box((D, "neon_" + hue, 0), arm[0] - 0.2, arm[0] + 0.2, 5.48, 5.56, arm[2] - 0.2, arm[2] + 0.2, scale=0.5)
                    light(D, arm[0], 4.5, arm[2], hue, 6.0)
                    # A blade or two on the post, each turned its own way.
                    out = (-self.dir, 0.0) if self.axis == "z" else (0.0, -self.dir)
                    for k in range(r.randrange(1, 3)):
                        ang = r.uniform(-0.9, 0.9)
                        ca, sa = math.cos(ang), math.sin(ang)
                        d2 = (out[0] * ca - out[1] * sa, out[0] * sa + out[1] * ca)
                        size = r.choice(("bs", "bs", "bx", "ps"))
                        K.blade(D, (p[0], p[2]), d2, 2.9 + k * 1.75 + ST_SIZES[size][1] / 2 * 0.2, size, gap=0.12, bracket=False)
                elif kind == "vending":
                    n = r.choice((2, 3))
                    for i in range(n):
                        q = at(0.04, (i - (n - 1) / 2) * 1.06)
                        K.vendor(D, q[0], q[2], face, r)
                    if r.random() < 0.5:
                        q = at(1.35, r.uniform(-0.5, 0.5))
                        stand(q[0], q[2], face + math.pi, r.choice(("idle", "phone")), y=G0 if 1.35 < self.aprons[1] else 0.0)
                elif kind == "scooters":
                    for i in range(r.randrange(2, 5)):
                        q = at(0.9, (i - 1) * 0.75)
                        K.scooter(D, q[0], q[2], face + r.uniform(-0.25, 0.25), r)
                    if r.random() < 0.35:
                        q = at(1.0, -1.6)
                        stand(q[0], q[2], face + r.uniform(-1.0, 1.0), r.choice(("phone", "smoke", "idle")), y=G0)
                elif kind == "pallets":
                    for i in range(r.randrange(1, 3)):
                        q = at(0.8, i * 1.35)
                        K.pallet(D, q[0], q[2], face + r.uniform(-0.15, 0.15), r)
                    if r.random() < 0.5:
                        q = at(0.7, -1.2)
                        P.place("crates", q[0], G0, q[2], face, district=D)
                elif kind == "drums":
                    for i in range(r.randrange(3, 6)):
                        q = at(0.4 + 0.5 * (i % 2), i * 0.55)
                        P.place("drum", q[0], G0, q[2], district=D)
                elif kind == "skip":
                    q = at(0.7)
                    P.place("dumpster", q[0], G0, q[2], face, district=D)
                    q = at(0.6, 1.5)
                    P.place("bags", q[0], G0, q[2], r.uniform(0, 3), district=D)
                elif kind == "tree":
                    q = at(0.95)
                    P.place("planter_tree", q[0], G0, q[2], r.uniform(0, 6.28), district=D)
                    light(D, q[0], 1.2, q[2], "pink", 2.5)
                elif kind == "boxes":
                    q = at(0.6)
                    K.boxes_heap(D, q[0], q[2], r, n=r.randrange(4, 8))
                    q = at(0.45, 1.3)
                    K.gas_bottles(D, q[0], q[2], r)
                else:
                    # A sign on its own two legs against the far wall, lit.
                    size = r.choice(("pm", "ps", "pm"))
                    sw, sh = ST_SIZES[size]
                    q = at(0.3)
                    yy = r.uniform(2.9, 3.6)
                    for dv in (-sw * 0.4, sw * 0.4):
                        qq = at(0.3, dv)
                        cylinder((D, "metal", 1), qq[0], qq[2], G0, yy + sh / 2, 0.04, segs=4, cap=False)
                    oriented_box((D, "board_frame", 0), q[0], yy, q[2], sw + 0.12, sh + 0.12, 0.1, face, scale=1.0)
                    nx, nz = math.sin(face), math.cos(face)
                    K.st_face(D, K.st_id(size), (q[0] + nx * 0.06, yy, q[2] + nz * 0.06), (math.cos(face), 0.0, -math.sin(face)), K.UP, sw, sh)
            v += r.uniform(*spacing) / self.dens
        # Cable from post to post, sagging, and now and then down to a wall.
        for (x0, z0), (x1, z1) in zip(posts, posts[1:]):
            if math.hypot(x1 - x0, z1 - z0) < 45.0 and self.free((z0 + z1) / 2 if self.axis == "z" else (x0 + x1) / 2):
                for dy in (0.0, -0.35):
                    K.cable(D, (x0, 6.1 + dy, z0), (x1, 6.1 + dy, z1), r.uniform(0.5, 1.0), r=0.03, steps=6)

    def rack(self, y=4.5):
        """A pipe rack on its own stanchions along the far wall: three
        pipes, a drop to the ground now and then, small lamps on the
        stanchions, a tube hung under it here and there."""
        D, W, r = self.D, self.width, self.rng
        cuts = sorted(self.skip)
        runs, at = [], self.a + 1.0
        for s0, s1 in cuts:
            if s0 > at:
                runs.append((at, min(s0, self.b - 1.0)))
            at = max(at, s1)
        if at < self.b - 1.0:
            runs.append((at, self.b - 1.0))
        cols = ((0.3, 0.2, 0.05, 1), (0.2, 0.2, 0.22, 1), (0.22, 0.07, 0.05, 1))
        for v0, v1 in runs:
            if v1 - v0 < 6:
                continue
            for k, (du, dy, rr) in enumerate(((0.55, 0.0, 0.11), (0.82, 0.03, 0.08), (0.62, 0.3, 0.06))):
                pipe((D, "trim", 0), self.pt(W - du, v0, y + dy), self.pt(W - du, v1, y + dy), rr, segs=5, col=cols[k], caps=True)
            v, n = v0 + 0.6, 0
            while v < v1:
                p = self.pt(W - 0.7, v)
                box((D, "metal", 1), p[0] - 0.06, p[0] + 0.06, G0, y + 0.5, p[2] - 0.06, p[2] + 0.06, scale=0.5)
                q0, q1 = self.pt(W - 1.0, v), self.pt(W - 0.3, v)
                box((D, "metal", 1), min(q0[0], q1[0]) - 0.04, max(q0[0], q1[0]) + 0.04, y - 0.2, y - 0.12, min(q0[2], q1[2]) - 0.04, max(q0[2], q1[2]) + 0.04, scale=0.5)
                if n % 2 == 0:
                    g = self.pt(W - 0.77, v, y - 0.6)
                    box((D, "glow", 0), g[0] - 0.05, g[0] + 0.05, g[1], g[1] + 0.1, g[2] - 0.05, g[2] + 0.05, scale=0.5, col=GLOW[r.choice(("cyan", "green", "red", "amber"))])
                if n % 3 == 1:
                    d0 = self.pt(W - 0.55, v + 0.3, y)
                    pipe((D, "trim", 1), d0, (d0[0], G0, d0[2]), 0.07, segs=5, col=cols[0])
                if n % 4 == 2:
                    hue = r.choice(self.pal[:3])
                    K.tube(D, self.pt(W - 0.95, v + 1.0, y - 0.55), self.pt(W - 0.95, v + 2.6, y - 0.55), hue, power=6.0, hang=y - 0.15)
                v += r.uniform(5.0, 7.0)
                n += 1

    def steam(self, most=4):
        """Vents where a kitchen's door or a stall stands (the site draws
        steam from each)."""
        r = self.rng
        pts = [p for p in self.vents if self.free(p[2] if self.axis == "z" else p[0], 1.0)]
        r.shuffle(pts)
        for p in pts[:most]:
            self.vent(p[0], p[2])

    def people(self, every=(18.0, 30.0)):
        """Two or three in the lane itself, talking, where it is not
        somebody else's."""
        r, W = self.rng, self.width
        v = self.a + r.uniform(6.0, 14.0)
        while v < self.b - 4.0:
            if self.free(v, 2.0):
                u = r.uniform(self.aprons[0] + 0.5, W - self.aprons[1] - 1.2)
                p, q = self.pt(u, v), self.pt(u + r.uniform(-0.3, 0.3), v + 0.9)
                along = 0.0 if self.axis == "z" else math.pi / 2
                stand(p[0], p[2], along, "talk")
                stand(q[0], q[2], along + math.pi, r.choice(("talk", "smoke")))
                if r.random() < 0.4:
                    t = self.pt(u + 0.8, v + 0.45)
                    stand(t[0], t[2], self.yaw(False) if self.axis == "z" else self.yaw(False), "idle")
            v += r.uniform(*every) / self.dens

    def build(self, mouths=(), stalls=True, most_steam=4, rack=False):
        self.ground(mouths)
        self.overhead()
        self.far_side(stalls=stalls)
        if rack:
            self.rack()
        self.steam(most_steam)
        self.people()
