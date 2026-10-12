"""The canyon's street faces as towers in three parts: a base, a body, a top.

From the hero's low lens a canyon wall is two lines, its lot line and its
roof's edge, and neither moves (far.py). So a tower's massing is hung on
that plane where the lens sees it only against the canyon's own walls
(`clear`): tiers that stand proud of the face over the signs and step back
to the lot line under the roof, each with a lit soffit and a step of roof on
top; a bay cantilevered out of the middle of a face; slabs a floor deep with
bracing between them; a lift's shaft, risers, a strip of signs; balconies in
rows. Between them the face is cut into floors of different windows (the
show's bands of amber and cyan, lit a whole floor at a time, with dark floors
between) and service floors with no windows at all. No two neighbours are
built to the same recipe, nor the two sides of the street.
"""
import math
import random

from ncw import kit as K
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import canyon_kit as C
from ncw.districts.canyon_kit import FA, CB, fl

RECIPES = ("zig", "balc", "mega", "corp", "slot")
# The figure's slogan on its blade (far.py): nothing may stand across it.
BLADE = ((9.2, 7.3, -261.3), (13.8, 37.9, -260.95))
SVC = (0.012, 0.014, 0.02, 1)        # a service floor's wall
LOUVRE = (0.05, 0.056, 0.07, 1)
CONC = (0.1, 0.105, 0.12, 1)         # cast concrete, in the canyon's navy night
LIGHTS = ("white", "cyan", "yellow", "amber", "teal")


def clear(occ, lo, hi):
    """Whether a box standing off a street face leaves the hero's picture as
    it was: every line from its lens through the box runs on into one of the
    canyon's own masses (it is seen against a wall: never against the sky,
    the figure or the megablock), and it lies across neither what the hero
    frames nor the figure's slogan."""
    if C.covers(occ, lo, hi):
        return False
    for e in HERO_EYES:
        for u in (0.0, 0.5, 1.0):
            for v in (0.0, 0.5, 1.0):
                q = (BLADE[0][0] + (BLADE[1][0] - BLADE[0][0]) * u, BLADE[0][1] + (BLADE[1][1] - BLADE[0][1]) * v, BLADE[0][2])
                if K._crosses(e, q, lo, hi):
                    return False
        for x in (lo[0], hi[0]):
            for y in (lo[1], hi[1]):
                for j in range(5):
                    p = (x, y, lo[2] + (hi[2] - lo[2]) * j / 4)
                    far = tuple(e[i] + (p[i] - e[i]) * 6.0 for i in range(3))
                    if not any(K._crosses(p, far, mlo, mhi) for mlo, mhi in occ):
                        return False
    return True


def box_of(f, s0, s1, y0, y1, w0, w1):
    a, b = f.p(f.at(s0), y0, w0), f.p(f.at(s1), y1, w1)
    return (min(a[0], b[0]), y0, min(a[2], b[2])), (max(a[0], b[0]), y1, max(a[2], b[2]))


def _most(occ, f, s0, s1, y0, y1, want):
    """As far proud of the face as the hero's picture allows, `want` or less."""
    for out in (want, want * 0.7, want * 0.45):
        if clear(occ, *box_of(f, s0, s1, y0, y1, 0.0, out)):
            return round(out, 2)
    return 0.0


def _around(f, pieces, cross, y0, y1, least=4.0):
    """Stretches of a face (s0, s1) with the landings of what crosses the
    avenue between y0 and y1 taken out of them."""
    for zc, half, cy0, cy1 in cross:
        if cy1 + 1.5 < y0 or cy0 - 1.5 > y1 or zc + half + 0.6 < f.a0 or zc - half - 0.6 > f.a1:
            continue
        a, b = sorted((C.s_of(f, min(max(zc - half - 0.6, f.a0), f.a1)), C.s_of(f, min(max(zc + half + 0.6, f.a0), f.a1))))
        nxt = []
        for p0, p1 in pieces:
            if b <= p0 or a >= p1:
                nxt.append((p0, p1))
                continue
            if a - p0 >= least:
                nxt.append((p0, a))
            if p1 - b >= least:
                nxt.append((b, p1))
        pieces = nxt
    return pieces


def plan(U, idx, occ, cross):
    """Lay a unit's street face out: its floors in zones from the podium to
    the roof, what stands proud of it, and what runs up it. `cross`: what
    crosses the avenue (z, half its depth, y0, y1). Fills U["zones"],
    U["proud"], U["feat"], U["belt"] (where the proud part starts)."""
    L = U["lot"]
    side, ph, h, st = L["side"], L["ph"], U["h"], U["st"]
    w = st.width
    r = random.Random(6100 + idx * 37 + (0 if side > 0 else 900))
    rec = RECIPES[(idx * 2 + (3 if side > 0 else 0)) % len(RECIPES)]
    kp = round((ph - SHOP_H) / CELL_H)
    kt = int((h - 0.3 - SHOP_H) / CELL_H)
    nb = kt - kp
    warm = U["warmth"]
    # The stretch a tier may stand on: in from both ends (the pipes' and the
    # corner's), and clear of the lot's column of type at its south end.
    tall = U["k"] == 0 and L["i"] % 3 != 2
    south = 5.8 if tall else 1.4
    sa, sb = (south, w - 1.4) if side < 0 else (1.4, w - south)
    zones, proud, feat, holes = [], [], [], []

    def zone(k0, k1, style, lit, wm=None, kind="win", inset=1.5):
        y1 = h if k1 is None else fl(k1)
        if y1 - fl(k0) > 0.3:
            zones.append(dict(y0=fl(k0), y1=y1, kind=kind, style=style, lit=lit, warm=warm if wm is None else wm))
            # A service floor is set back behind the face between the
            # tower's corners (unless something lands on the face there).
            if kind == "svc" and inset and _around(st, [(1.2, w - 1.2)], cross, fl(k0), y1) == [(1.2, w - 1.2)]:
                holes.append(dict(s0=1.2, s1=w - 1.2, y0=fl(k0), y1=y1, d=inset, kind="svc"))

    def bite(s0, s1, k0, k1, d, kind):
        for a, b in _around(st, [(s0, s1)], cross, fl(k0), fl(k1), least=s1 - s0):
            holes.append(dict(s0=a, s1=b, y0=fl(k0), y1=fl(k1), d=d, kind=kind))

    def stand(k0, k1, want, style, lit, wm, pieces=None, cut=None):
        y0, y1 = fl(k0), fl(k1)
        hue = r.choice(LIGHTS)
        for s0, s1 in _around(st, pieces or [(sa, sb)], cross, y0, y1):
            out = _most(occ, st, s0, s1, y0, y1, want)
            if out >= 0.5:
                proud.append(dict(s0=s0, s1=s1, y0=y0, y1=y1, out=out, c=min(out, 1.6) if cut is None else cut, style=style, lit=lit, warm=wm, hue=hue))

    if rec == "zig":
        # Bands of light to a service floor, then two tiers proud of the
        # face, the lower the further, and the top back on the lot line.
        k1 = kp + max(3, round(nb * 0.36))
        k3 = kt - max(3, round(nb * 0.2))
        k2 = min(k1 + max(2, round(nb * 0.24)), k3)
        zone(kp, k1 - 1, 5, 0.25)
        zone(k1 - 1, k1, 0, 0, kind="svc")
        zone(k1, k2, 4, 0.85, 0.2)
        stand(k1, k2, 2.3, 4, 0.85, 0.2)
        if k3 > k2:
            zone(k2, k3, 5, 0.4)
            stand(k2, k3, 1.15, 5, 0.4, warm, cut=0.0)
        zone(k3, None, 2, 0.5, 0.7)
        feat += [("riser", 0.9), ("strip", 0.42)]
    elif rec == "mega":
        # A megabuilding's frame: every fourth floor a slab standing out of
        # the face with a dark floor under it, bracing between the slabs.
        k, j = kp, 0
        while k + 4 <= kt - 1:
            zone(k, k + 3, 5, (0.15, 0.5, 0.3)[j % 3])
            zone(k + 3, k + 4, 0, 0, kind="svc")
            y = fl(k + 4)
            want = 1.5 if y < h * 0.5 else 1.0 if y < h * 0.72 else 0.5
            for s0, s1 in _around(st, [(0.0, w)], cross, y - 1.0, y):
                out = _most(occ, st, s0, s1, y - 0.9, y, want)
                if out >= 0.3:
                    feat.append(("slab", s0, s1, y, out))
            feat.append(("brace", fl(k), fl(k + 3)))
            k, j = k + 4, j + 1
        zone(k, None, 4, 0.6, 0.3)
        feat += [("riser", 0.12)]
    elif rec == "balc":
        # Homes: paired windows, balconies in rows, a service floor half way
        # up, a lift's shaft up the face.
        km = kp + nb // 2
        zone(kp, km, 0, 0.55)
        zone(km, km + 1, 0, 0, kind="svc")
        zone(km + 1, kt - 2, 1, 0.6)
        zone(kt - 2, None, 3, 0.7, 0.85)
        # And a terrace three floors high cut into the face over it.
        tw = min(max(9.6, w * 0.3), w * 0.5)
        ts = w * (0.3 if idx % 2 else 0.62) - tw / 2
        if km + 4 <= kt - 3:
            bite(ts, ts + tw, km + 1, km + 4, 3.6, "terrace")
        feat += [("shaft", 0.74 if idx % 2 else 0.2, kt - 3), ("rows", kp + 1, km, 0), ("rows", km + 1, kt - 2, 1)]
    elif rec == "corp":
        # Offices: a curtain wall, a bay of three floors cantilevered out of
        # the middle of it, a service floor over that, a lit top.
        k1 = kp + max(4, round(nb * 0.4))
        k2 = min(k1 + 3, kt - 4)
        zone(kp, k1, 4, 0.7, 0.25)
        if k2 > k1:
            zone(k1, k2, 4, 0.95, 0.15)
            m = (sa + sb) / 2
            half = min((sb - sa) / 2, max(6.4, w * 0.28))
            stand(k1, k2, 2.2, 4, 0.95, 0.15, pieces=[(m - half, m + half)])
            zone(k2, k2 + 1, 0, 0, kind="svc")
            k2 += 1
        zone(k2, kt - 2, 2, 0.5, 0.35)
        zone(kt - 2, None, 4, 0.95, 0.2)
        feat += [("shaft", 0.14, kt - 3), ("strip", 0.86)]
    else:
        # Three shafts side by side, slots of dark between them, each shaft
        # proud of the face to its own height.
        k1 = kp + max(3, round(nb * 0.3))
        zone(kp, k1, 2, 0.5)
        tops = [kt - 3, kt - 5, kt - 4]
        r.shuffle(tops)
        wd = (sb - sa - 2 * 1.8) / 3
        cuts = sorted(set([k1] + [max(k1 + 2, t) for t in tops] + [kt - 2]))
        for a, b in zip(cuts, cuts[1:]):
            zone(a, b, 5, 0.3)
        zone(max(cuts), None, 2, 0.6, 0.75)
        for n in range(3):
            s0 = sa + n * (wd + 1.8)
            if wd >= 4.0:
                stand(k1, max(k1 + 2, tops[n]), (1.2, 1.8, 0.9)[n], (5, 2, 1)[n], (0.35, 0.6, 0.7)[n], warm, pieces=[(s0, s0 + wd)], cut=0.0)
            if n and wd >= 4.0:
                bite(s0 - 1.8, s0, kp, kt - 2, 2.6, "slot")
        feat += [("riser", 0.06)]
    # A tower's top differs from its neighbour's: a lit lantern floor, a dark
    # plant floor with red lamps, a band of adverts, fins of light.
    feat.append(("top", ("lantern", "plant", "adverts", "fins")[(idx + (2 if side > 0 else 0)) % 4]))
    # Cut the zones where a proud piece begins or ends inside one.
    for y in sorted({p[k] for p in proud + holes for k in ("y0", "y1")}):
        for z in list(zones):
            if z["y0"] + 0.01 < y < z["y1"] - 0.01:
                zones.remove(z)
                zones += [dict(z, y1=y), dict(z, y0=y)]
    zones.sort(key=lambda z: z["y0"])
    belt = min([p["y0"] for p in proud] + [z["y0"] for z in zones if z["kind"] == "svc"] + [h])
    U.update(zones=zones, proud=proud, holes=holes, feat=feat, belt=belt, recipe=rec, mr=r, south_keep=south)
    print("CANYON face", side, L["i"], U["k"], rec, "h", h, "proud", [(round(p["y0"], 1), round(p["y1"], 1), p["out"]) for p in proud],
          "slabs", [f[4] for f in feat if f[0] == "slab"])


def off(U, s0, s1, y0, y1):
    """How far proud of the lot line the face stands behind a rectangle."""
    return max([p["out"] for p in U["proud"] if p["s0"] < s1 and p["s1"] > s0 and p["y0"] < y1 and p["y1"] > y0] + [0.0])


def plain(U, y):
    """Whether the face is on the lot line, with windows, at a height."""
    return not any(p["y0"] - 0.3 < y < p["y1"] + 0.3 for p in U["proud"] + U["holes"]) and not any(z["kind"] == "svc" and z["y0"] - 0.1 < y < z["y1"] + 0.3 for z in U["zones"])


def face(U):
    """The unit's street, south and north faces in their zones (the first
    two in the core: the hero's lens has them from its first frame)."""
    st, so, no, tint, ov = U["st"], U["so"], U["no"], U["tint"], U["ov"]
    for z in U["zones"]:
        y0, y1 = z["y0"], z["y1"]
        svc = z["kind"] == "svc"
        col = None if svc else B.wall_col(z["lit"], z["style"], z["warm"], tint)

        def fill(f, key, s0, s1):
            if svc:
                if s1 - s0 > 0.05:
                    f.quad((key, "trim", 0), s0, s1, y0, y1, 0.0, col=SVC)
            else:
                C.wall(key, f, y0, y1, col, ov, s0, s1)
        fill(so, FA, 0.0, so.width)
        fill(no, CB, 0.0, no.width)
        s = 0.0
        for a, b in sorted((p["s0"], p["s1"]) for p in U["proud"] + U["holes"] if p["y0"] <= y0 + 0.01 and p["y1"] >= y1 - 0.01):
            fill(st, FA, s, a)
            s = max(s, b)
        fill(st, FA, s, st.width)
    for p in U["proud"]:
        col = B.wall_col(p["lit"], p["style"], p["warm"], tint)
        C.wall(FA, st, p["y0"], p["y1"], col, ov + 3, p["s0"] + p["c"], p["s1"] - p["c"], out=p["out"])
    # What is cut into the face: the back of each hole and the side of it
    # that looks down the avenue are the hero's (so no hole is ever open).
    south_first = st.right > st.left
    for q in U["holes"]:
        s0, s1, y0, y1, d = q["s0"], q["s1"], q["y0"], q["y1"], q["d"]
        if q["kind"] == "terrace":
            C.wall(FA, st, y0, y1, B.wall_col(0.95, 4, 0.8, tint), ov + 5, s0, s1, out=-d)
        else:
            st.quad((FA, "trim", 0), s0, s1, y0, y1, -d, col=SVC)
        a0, a1 = st.at(s0), st.at(s1)
        quad((FA if south_first else CB, "trim", 0), st.p(a0, y0, 0.0), st.p(a0, y0, -d), st.p(a0, y1, -d), st.p(a0, y1, 0.0), col=B.TRIM[tint])
        quad((CB if south_first else FA, "trim", 0), st.p(a1, y0, -d), st.p(a1, y0, 0.0), st.p(a1, y1, 0.0), st.p(a1, y1, -d), col=B.TRIM[tint])


def _prism(f, p, tcol):
    """A volume proud of a face: its cheeks (square, or cut at 45 degrees),
    its soffit with two lines of light in it, and on top a step of roof
    behind a kerb, lamps along it."""
    s0, s1, y0, y1, out, c = p["s0"], p["s1"], p["y0"], p["y1"], p["out"], p["c"]
    a0, a1, b0, b1 = f.at(s0), f.at(s0 + c), f.at(s1 - c), f.at(s1)
    for pa, wa, pb, wb in ((a0, 0.0, a1, out), (b0, out, b1, 0.0)):
        quad((CB, "trim", 0), f.p(pa, y0, wa), f.p(pb, y0, wb), f.p(pb, y1, wb), f.p(pa, y1, wa), col=tcol)
    ring = ((a0, 0.0), (b1, 0.0), (b0, out), (a1, out))
    poly((CB, "trim", 0), [f.p(a, y0, wd) for a, wd in ring], [(0, 0)] * 4, B.DARK_TRIM)
    poly((CB, "roof", 0), [f.p(a, y1, wd) for a, wd in reversed(ring)], [(0, 0), (1, 0), (1, 1), (0, 1)])
    lamp = C.dim(p["hue"], 0.85)
    for wd in (out * 0.28, out * 0.7):
        C.under((CB, "glow", 0), f, s0 + c + 0.3, s1 - c - 0.3, wd, wd + 0.16, y0 - 0.015, lamp)
    f.box((CB, "trim", 1), s0 + c, s1 - c, y1, y1 + 0.45, out - 0.2, out, col=tcol)
    n = max(1, round((s1 - s0) / 5.0))
    for i in range(n):
        s = s0 + (s1 - s0) * (i + 0.5) / n
        C.over((CB, "glow", 0), f, s - 0.16, s + 0.16, out * 0.5 - 0.16, out * 0.5 + 0.16, y1 + 0.05, GLOW[p["hue"]])


def _service(f, s0, s1, y0, y1, r, base=0.0):
    """A floor with no windows: louvres in runs, vents standing off it, a
    pipe along its foot, pilot lamps under its head."""
    hh = y1 - y0
    s = s0 + r.uniform(0.5, 2.0)
    while s < s1 - 3.0:
        ln = min(r.uniform(3.0, 7.0), s1 - s - 0.5)
        roll = r.random()
        if roll < 0.6:
            for i in range(4):
                yy = y0 + hh * (0.24 + 0.15 * i)
                f.quad((CB, "trim", 1), s, s + ln, yy, yy + hh * 0.07, base + 0.04, col=LOUVRE)
        elif roll < 0.85:
            ln = min(ln, 2.4)
            f.box((CB, "metal", 1), s, s + ln, y0 + 0.5, y1 - 0.6, base, base + 0.45)
        s += ln + r.uniform(0.8, 2.5)
    f.box((CB, "metal", 1), s0 + 0.3, s1 - 0.3, y0 + 0.16, y0 + 0.34, base, base + 0.18)
    n = max(1, int((s1 - s0) / 9.0))
    for i in range(n):
        sx = s0 + (s1 - s0) * (i + 0.5) / n
        f.quad((CB, "glow", 0), sx - 0.1, sx + 0.1, y1 - 0.5, y1 - 0.3, base + 0.05, col=GLOW[r.choice(("red", "amber", "red"))])


def _hole(U, q, r):
    """The inside of what is cut into a face: its floor and its ceiling,
    and what it holds. A service floor: plant along its back wall, a rail of
    pipe at its edge. A terrace: a lit ceiling, a rail, planters and trees,
    people at the rail. A slot between two shafts: pipes up it, a line of
    light, red lamps."""
    st, tint = U["st"], U["tint"]
    s0, s1, y0, y1, d = q["s0"], q["s1"], q["y0"], q["y1"], q["d"]
    C.over((CB, "roof", 0), st, s0, s1, -d, 0.0, y0)
    C.under((CB, "trim", 0), st, s0, s1, -d, 0.0, y1, B.DARK_TRIM)
    if q["kind"] == "svc":
        _service(st, s0 + 0.3, s1 - 0.3, y0, y1, r, base=-d)
        st.box((CB, "metal", 1), s0, s1, y0 + 0.9, y0 + 1.0, -0.14, -0.04)
        n = max(2, round((s1 - s0) / 6.4))
        for i in range(n + 1):
            s = min(max(s0 + (s1 - s0) * i / n, s0 + 0.15), s1 - 0.15)
            st.box((CB, "trim", 0), s - 0.15, s + 0.15, y0, y1, -0.3, 0.0, col=B.TRIM[tint])
        C.under((CB, "glow", 0), st, s0 + 0.5, s1 - 0.5, -d * 0.55, -d * 0.55 + 0.12, y1 - 0.015, C.dim(r.choice(("amber", "red", "amber", "cyan")), 0.5))
    elif q["kind"] == "terrace":
        hue = r.choice(("amber", "yellow", "white"))
        for wd in (-d * 0.75, -d * 0.3):
            C.under((CB, "glow", 0), st, s0 + 0.4, s1 - 0.4, wd, wd + 0.18, y1 - 0.015, C.dim(hue, 0.9))
        st.box((CB, "trim", 0), s0, s1, y0, y0 + 0.25, -0.3, 0.0, col=B.DARK_TRIM)
        st.box((CB, "metal", 0), s0, s1, y0 + 1.08, y0 + 1.14, -0.2, -0.1)
        n = max(2, round((s1 - s0) / 1.9))
        for i in range(n + 1):
            s = min(max(s0 + (s1 - s0) * i / n, s0 + 0.03), s1 - 0.03)
            st.box((CB, "metal", 1), s - 0.03, s + 0.03, y0 + 0.25, y0 + 1.08, -0.18, -0.12)
        st.quad((CB, "glow", 0), s0 + 0.3, s1 - 0.3, y0 + 0.02, y0 + 0.1, -d + 0.03, col=C.dim(hue, 0.7))
        for s in (s0 + 1.2, s1 - 1.2):
            x, _, z = st.p(st.at(s), 0.0, -d + 1.1)
            P.place("planter_tree", x, y0, z, district=CB)
        s = s0 + 3.6
        while s < s1 - 3.4:
            x, _, z = st.p(st.at(s), 0.0, -0.8)
            if r.random() < 0.55:
                P.place("cy_planter", x, y0, z, math.pi / 2, district=CB)
            else:
                # (Someone looking out over the rail, or with their back to it.)
                K.stand(x, z, st.yaw + r.uniform(-0.4, 0.4), r.choice(("idle", "phone", "smoke")), y0)
                if r.random() < 0.5:
                    x2, _, z2 = st.p(st.at(s + 0.9), 0.0, -0.5)
                    K.stand(x2, z2, st.yaw + math.pi, "lean", y0)
            s += r.uniform(2.6, 4.2)
    else:
        for e in (s0 + 0.35, s0 + 0.8, s1 - 0.45):
            st.box((CB, "metal", 1), e - 0.11, e + 0.11, y0, y1 - r.uniform(0.0, 6.0), -d, -d + 0.26)
        m = (s0 + s1) / 2
        st.quad((CB, "glow", 0), m + 0.1, m + 0.22, y0 + 0.5, y1 - 0.5, -d + 0.02, col=C.dim(r.choice(("cyan", "amber", "teal")), 0.6))
        y = y0 + 6.0
        while y < y1 - 2.0:
            st.box((CB, "trim", 1), s0, s1, y, y + 0.14, -d, -d + 0.9, col=B.TRIM[tint])
            st.quad((CB, "glow", 0), m - 0.5, m - 0.26, y + 0.3, y + 0.54, -d + 0.02, col=GLOW["red"])
            y += 10.2


def _spot(U, frac, wd, cross):
    """Where along the face something `wd` wide may run up it, about `frac`
    of the way from its north end: clear of the lot's column of type, the
    figure's slogan and what crosses the avenue. None if nowhere."""
    st, side = U["st"], U["lot"]["side"]
    w = st.width
    for f in (frac, frac + 0.12, frac - 0.12, 1.0 - frac, 0.5):
        zc = st.a0 + (st.a1 - st.a0) * min(max(f, 0.05), 0.95)
        if st.a1 - zc < U["south_keep"] + wd or zc - st.a0 < 1.2 + wd / 2:
            continue
        if side > 0 and abs(zc + 261.0) < 4.5:
            continue
        if any(abs(zc - z) < half + 1.4 + wd / 2 for z, half, _, _ in cross):
            continue
        s = C.s_of(st, zc)
        if all(s + wd / 2 + 0.6 < a or s - wd / 2 - 0.6 > b for a, b in U["spots"]):
            U["spots"].append((s - wd / 2, s + wd / 2))
            return s
    return None


def reserve(U, occ, cross):
    """Place what runs up the face (a lift's shaft, risers, a strip of
    signs) and return the rectangles of wall it takes, so that no sign is
    hung across it."""
    L = U["lot"]
    st, ph, h = U["st"], L["ph"], U["h"]
    U["spots"] = [(p["s0"] - 0.1, p["s0"] + 0.1) for p in U["proud"]] + [(p["s1"] - 0.1, p["s1"] + 0.1) for p in U["proud"]]
    U["spots"] += [(q["s0"], q["s1"]) for q in U["holes"] if q["kind"] != "svc"]
    taken, placed = [(q["s0"] - 0.3, q["s1"] + 0.3, q["y0"] - 0.6, q["y1"] + 0.3) for q in U["holes"]], []
    for ft in U["feat"]:
        kind = ft[0]
        if kind == "shaft":
            s = _spot(U, ft[1], 3.2, cross)
            y1 = fl(ft[2])
            if s is None or y1 - ph < 12.0:
                continue
            out = _most(occ, st, s - 1.5, s + 1.5, ph, y1, 1.7)
            if out >= 0.7:
                placed.append(("shaft", s, ph, y1, out))
                taken.append((s - 2.0, s + 2.0, ph - 1.0, y1 + 0.5))
        elif kind == "riser":
            s = _spot(U, ft[1], 2.2, cross)
            if s is not None:
                placed.append(("riser", s, ph, h - 2.5))
                taken.append((s - 1.3, s + 1.3, ph - 0.5, h))
        elif kind == "strip":
            s = _spot(U, ft[1], 1.7, cross)
            y1 = min(U["belt"] - 0.8, ph + 15.0)
            if s is not None and y1 - ph > 6.0:
                placed.append(("strip", s, ph + 1.4, y1))
                taken.append((s - 1.1, s + 1.1, ph + 0.8, y1 + 0.4))
        elif kind == "slab":
            placed.append(ft)
            taken.append((ft[1], ft[2], ft[3] - 1.3, ft[3] + 0.3))
        else:
            placed.append(ft)
    U["placed"] = placed
    return taken


def _free(taken, rect, pad=0.3):
    s0, s1, y0, y1 = rect
    return all(not (s0 - pad < a1 and s1 + pad > a0 and y0 - pad < b1 and y1 + pad > b0) for a0, a1, b0, b1 in taken)


def relief(U, taken):
    """Everything that gives the face depth, in the canyon's pack: the
    proud volumes, the service floors' plant, slabs and bracing, the shaft,
    the risers, the strip of signs, balconies in rows, the top."""
    L = U["lot"]
    side, ph, h, st = L["side"], L["ph"], U["h"], U["st"]
    r, w = U["mr"], st.width
    tcol = B.TRIM[U["tint"]]
    for p in U["proud"]:
        _prism(st, p, tcol)
    inset = {(q["y0"], q["y1"]) for q in U["holes"] if q["kind"] == "svc"}
    for z in U["zones"]:
        if z["kind"] == "svc" and (z["y0"], z["y1"]) not in inset:
            _service(st, 0.4, w - 0.4, z["y0"], z["y1"], r)
    for q in U["holes"]:
        _hole(U, q, r)
    for ft in U["placed"]:
        kind = ft[0]
        if kind == "slab":
            _, s0, s1, y, out = ft
            st.ledge((CB, "castconcrete", 0), s0, s1, y - 0.9, 0.9, out, CONC)
            C.over((CB, "roof", 0), st, s0, s1, 0.0, out, y + 0.01)
            hue = r.choice(("amber", "yellow", "cyan", "white"))
            C.under((CB, "glow", 0), st, s0 + 0.4, s1 - 0.4, out * 0.45, out * 0.45 + 0.16, y - 0.915, C.dim(hue, 0.9))
        elif kind == "brace":
            _, y0, y1 = ft
            n = max(1, round(w / 10.5))
            for b in range(n):
                s0, s1 = w * b / n + 0.5, w * (b + 1) / n - 0.5
                if _free(taken, (s0, s1, y0 + 0.3, y1 - 0.3), pad=0.0):
                    C.brace(CB, st, s0, s1, y0 + 0.2, y1 - 0.2, CONC, wd=0.3, out=0.22)
        elif kind == "shaft":
            _, s, y0, y1, out = ft
            # A lift's shaft: a glazed box up the face, its landings lit,
            # a line of light up each edge, the car a block of warm light.
            C.fbox((CB, "trim", 0), st, s - 1.5, s + 1.5, y0, y1 + 1.2, 0.0, out, B.DARK_TRIM)
            C.wall(CB, st, y0 + 0.4, y1, B.wall_col(0.95, 4, 0.2, U["tint"]), 1, s - 1.2, s + 1.2, out=out + 0.02)
            for e in (s - 1.44, s + 1.3):
                st.quad((CB, "glow", 0), e, e + 0.14, y0, y1 + 1.0, out + 0.03, col=C.dim("cyan", 0.55))
            yc = y0 + (y1 - y0) * r.uniform(0.25, 0.8)
            st.quad((CB, "glow", 0), s - 1.0, s + 1.0, yc, yc + 2.3, out + 0.04, col=C.dim("amber", 0.75))
            st.box((CB, "glow", 0), s - 0.15, s + 0.15, y1 + 1.2, y1 + 1.5, out * 0.5 - 0.15, out * 0.5 + 0.15, col=GLOW["red"])
        elif kind == "riser":
            _, s, y0, y1 = ft
            for dx, k in ((-0.75, 1.0), (0.0, 0.94), (0.75, 0.86)):
                x, _, z = st.p(st.at(s + dx), 0.0, 0.0)
                P.place("cy_duct", x, y0, z, st.yaw, sy=(y1 - y0) * k, district=CB)
            y = y0 + 5.0
            while y < y1 - 1.0:
                st.box((CB, "metal", 1), s - 1.2, s + 1.2, y, y + 0.12, 0.0, 0.7)
                y += 6.8
        elif kind == "strip":
            _, s, y0, y1 = ft
            # A strip of signs up the face: light boxes one over another on
            # a dark spine, a line of light down each side of it.
            st.box((CB, "board_frame", 0), s - 0.85, s + 0.85, y0 - 0.2, y1 + 0.2, 0.0, 0.3)
            n = max(2, int((y1 - y0) / 1.75))
            for i in range(n):
                yc = y0 + (y1 - y0) * (i + 0.5) / n
                cx, _, cz = st.p(st.at(s), yc, 0.32)
                sign(st_name("bx"), cx, yc, cz, 1.5, min(1.5, (y1 - y0) / n - 0.2), st.yaw, district=CB, label=False)
            hue = r.choice(("cyan", "yellow", "amber"))
            for e in (s - 0.95, s + 0.85):
                st.quad((CB, "glow", 0), e, e + 0.1, y0 - 0.2, y1 + 0.2, 0.31, col=C.dim(hue, 0.7))
        elif kind == "rows":
            _, k0, k1, phase = ft
            # Balconies in rows, a floor at a time: two runs to a floor,
            # woven floor by floor, a line of light under each.
            runs = ((w * 0.06, w * 0.44), (w * 0.56, w * 0.94))
            for k in range(k0, k1):
                s0, s1 = runs[(k + phase) % 2]
                y = fl(k)
                base = off(U, s0, s1, y - 0.2, y + 1.2)
                if not plain(U, y + 0.5) or not _free(taken, (s0, s1, y - 0.3, y + 1.3)):
                    continue
                C.balcony(CB, st, s0, s1, y, tcol, out=1.1, base=base)
                C.under((CB, "glow", 0), st, s0 + 0.3, s1 - 0.3, base + 0.5, base + 0.62, y - 0.155, C.dim(("amber", "cyan")[k % 2], 0.6))
        elif kind == "top":
            y1 = h - 0.2
            if ft[1] == "lantern":
                st.quad((CB, "glow", 0), 0.5, w - 0.5, y1 - 1.5, y1 - 0.9, 0.04, col=C.dim(r.choice(("white", "cyan", "yellow")), 0.5))
                for s in (0.5, w - 0.62):
                    st.quad((CB, "glow", 0), s, s + 0.12, y1 - 7.0, y1 - 0.9, 0.04, col=C.dim("white", 0.5))
            elif ft[1] == "plant":
                st.quad((CB, "trim", 0), 0.0, w, y1 - 3.3, y1 + 0.1, 0.03, col=SVC)
                _service(st, 0.4, w - 0.4, y1 - 3.3, y1, r)
            elif ft[1] == "adverts":
                s = r.uniform(1.5, 4.0)
                while s + 5.0 < w - 1.5:
                    bw = min(r.uniform(5.0, 9.0), w - 1.5 - s)
                    cx, cy, cz = st.p(st.at(s + bw / 2), y1 - 2.6, 0.22)
                    C.advert(CB, CB, cx, cy, cz, bw, 3.0, st.yaw, r, depth=0.2)
                    s += bw + r.uniform(1.5, 5.0)
            else:
                hue = r.choice(("cyan", "amber", "yellow"))
                n = max(2, round(w / 3.2))
                for i in range(n + 1):
                    s = min(max(w * i / n, 0.2), w - 0.2)
                    st.quad((CB, "glow", 0), s - 0.07, s + 0.07, y1 - 6.4, y1 - 0.6, 0.04, col=C.dim(hue, 0.6))


def base_col(L, col, tint):
    """A podium's own windows, by its lot (so the base differs from the
    body over it and from the next lot's): bands, ribbons, small old
    windows in a heavy wall, a curtain wall. Its warmth stays as drawn."""
    v = (L["i"] + (0 if L["side"] < 0 else 2)) % 4
    style, lit = ((5, 0.3), (2, 0.5), (3, 0.6), (4, 0.6))[v]
    return v, B.wall_col(lit, style, col[2], tint)


def base(L, st, v, canopy, notch, arcade):
    """What makes a podium a base: a deep cornice at its head (a step of
    roof behind a kerb, lamps on it, a line of light in its soffit) and, at
    the pavement, a canopy over the shops with lit panels under it or heavy
    piers between them, each with its lamp. `notch`: stretches of the face
    (s0, s1) to leave clear (a column of type, a mast, a crossing's pier)."""
    side, ph = L["side"], L["ph"]
    w = st.width
    r = random.Random(6700 + L["i"] * 11 + (0 if side > 0 else 300) + int(st.a0))
    runs = [(0.0, w)]
    for a, b in notch:
        nxt = []
        for p0, p1 in runs:
            if b <= p0 or a >= p1:
                nxt.append((p0, p1))
                continue
            if a - p0 > 1.5:
                nxt.append((p0, a))
            if p1 - b > 1.5:
                nxt.append((b, p1))
        runs = nxt
    out = (1.6, 1.0, 1.6, 1.3)[v]
    hue = r.choice(("amber", "yellow", "cyan", "white"))
    for s0, s1 in runs:
        st.ledge((CB, "castconcrete", 0), s0, s1, ph - 0.62, 0.64, out, CONC)
        C.over((CB, "roof", 0), st, s0, s1, 0.0, out, ph + 0.03)
        st.box((CB, "trim", 1), s0, s1, ph + 0.02, ph + 0.4, out - 0.18, out, col=CONC)
        C.under((CB, "glow", 0), st, s0 + 0.4, s1 - 0.4, out * 0.5, out * 0.5 + 0.16, ph - 0.635, C.dim(hue, 0.9))
        n = max(1, round((s1 - s0) / 6.0))
        for i in range(n):
            s = s0 + (s1 - s0) * (i + 0.5) / n
            C.over((CB, "glow", 0), st, s - 0.14, s + 0.14, out * 0.5 - 0.14, out * 0.5 + 0.14, ph + 0.08, GLOW[hue])
    if arcade:
        return
    if v in (1, 3) and not canopy:
        # A canopy over the shops the whole length of the base: a slab on
        # brackets, panels of light under it.
        ch = r.choice(("white", "amber", "cyan"))
        for s0, s1 in runs:
            C.fbox((CB, "trim", 0), st, s0 + 0.3, s1 - 0.3, SHOP_H - 0.02, SHOP_H + 0.22, 0.0, 1.9, B.DARK_TRIM)
            s = s0 + 2.0
            while s < s1 - 1.5:
                C.under((CB, "glow", 0), st, s - 0.9, s + 0.9, 0.7, 1.0, SHOP_H - 0.03, C.dim(ch, 0.8))
                light(CB, *st.p(st.at(s), 3.6, 1.2), ch, 3.0)
                s += 4.8
    elif v in (0, 2):
        # Heavy piers between the shops, a lamp on each.
        bays = max(1, round(w / CELL_W))
        for b in range(0, bays + 1, 2):
            s = min(max(b * w / bays, 0.36), w - 0.36)
            if not any(p0 + 0.4 <= s <= p1 - 0.4 for p0, p1 in runs) and not any(abs(s - e) < 0.5 for e in (0.36, w - 0.36)):
                continue
            st.box((CB, "castconcrete", 0), s - 0.36, s + 0.36, 0.0, SHOP_H + 1.0, 0.0, 0.5, col=CONC)
            st.box((CB, "castconcrete", 0), s - 0.46, s + 0.46, 0.0, 0.7, 0.0, 0.6, col=CONC)
            st.box((CB, "glow", 0), s - 0.1, s + 0.1, 2.9, 3.15, 0.5, 0.58, col=GLOW["amber"])
            light(CB, *st.p(st.at(s), 2.8, 1.2), "amber", 2.5)
