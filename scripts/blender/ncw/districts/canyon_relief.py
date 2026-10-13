"""What stands out of a canyon wall between its signs (ARL_JWwKdDs@22,
ax5YUmkWf_Y@131): balconies with their rails and pots, air conditioners
under windows, small lit boards, conduits up the face. Seen from a crossing,
a lookout or a flying car a face was a plain grid of windows.

Everything here is proud of a face the hero's lens sees at a glance, so it
stands only where the line from the lens through it runs on into the
canyon's own walls (under the lower of the face's two neighbours' roofs,
clear of the face's ends), and only on the lot line's plain floors.
"""
import math

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import canyon_kit as C
from ncw.districts import canyon_mass as M
from ncw.districts.canyon_kit import CB, fl, dim

POT = (0.03, 0.06, 0.035, 1)


def _balc(k, hue):
    """A balcony 2.6 m wide off a wall (its back at z 0, out toward +z): a
    slab with its edge, a rail of bars, a pot with a plant, a stool, a lamp
    over the door, and the room behind it lit through its door and window
    (a balcony seen from a crossing or a flying car is a lit one)."""
    for x0, x1, y0, y1, kk in ((-1.05, -0.2, 0.02, 2.15, 0.42), (0.05, 1.15, 0.95, 2.1, 0.32)):
        quad(k("glow"), (x0, y0, 0.012), (x1, y0, 0.012), (x1, y1, 0.012), (x0, y1, 0.012), col=dim(hue, kk))
    quad(k("glow"), (-1.25, -0.17, 0.96), (1.25, -0.17, 0.96), (1.25, -0.13, 0.96), (-1.25, -0.13, 0.96), col=dim(hue, 0.5))
    box(k("trim"), -1.3, 1.3, -0.16, 0.0, 0.0, 0.95, scale=1.0, col=(0.05, 0.055, 0.07, 1), bottom=True)
    box(k("metal"), -1.3, 1.3, 0.98, 1.03, 0.9, 0.95, scale=0.5)
    for x0, x1, z0, z1 in ((-1.3, -1.26, 0.0, 0.95), (1.26, 1.3, 0.0, 0.95)):
        box(k("metal"), x0, x1, 0.98, 1.03, z0, z1, scale=0.5)
    x = -1.2
    while x < 1.25:
        box(k("metal"), x - 0.015, x + 0.015, 0.0, 0.98, 0.91, 0.94, scale=0.5)
        x += 0.24
    box(k("trim"), 0.55, 0.95, 0.0, 0.4, 0.15, 0.5, scale=1.0, col=(0.09, 0.05, 0.04, 1))
    box(k("trim"), 0.5, 1.0, 0.4, 0.95, 0.12, 0.55, scale=1.0, col=POT)
    cylinder(k("metal"), -0.6, 0.45, 0.0, 0.45, 0.03, segs=4, cap=False)
    cylinder(k("trim"), -0.6, 0.45, 0.45, 0.5, 0.17, segs=7, col=(0.2, 0.06, 0.05, 1))
    box(k("glow"), -0.08, 0.08, 2.35, 2.45, 0.02, 0.1, scale=0.5, col=GLOW[hue])


@P.proto("cy_balc", box=(1.3, 0.6, 0.5), reach=380, detail=True)
def _cy_balc(k):
    _balc(k, "amber")


@P.proto("cy_balc_c", box=(1.3, 0.6, 0.5), reach=380, detail=True)
def _cy_balc_c(k):
    _balc(k, "cyan")


def balc(x, y, z, yaw, key=CB):
    """A balcony, its room's light warm or (one in three, by where it is)
    cool."""
    P.place("cy_balc_c" if int(abs(x) * 7.0 + abs(z) * 3.0 + y) % 3 == 0 else "cy_balc", x, y, z, yaw, district=key)


@P.proto("cy_acpair", box=(0.5, 0.8, 0.35), reach=300, detail=True)
def _cy_acpair(k):
    """Two air conditioners on a bracket one over the other (back at z 0),
    a drip pipe down from them."""
    for y in (0.0, 0.72):
        box(k("trim"), -0.45, 0.45, y, y + 0.6, 0.06, 0.6, scale=0.6, col=(0.32, 0.33, 0.34, 1))
        quad(k("trim"), (-0.35, y + 0.08, 0.605), (0.15, y + 0.08, 0.605), (0.15, y + 0.52, 0.605), (-0.35, y + 0.52, 0.605), col=(0.02, 0.02, 0.025, 1))
    box(k("metal"), -0.5, 0.5, -0.06, 0.0, 0.0, 0.62, scale=0.5)
    cylinder(k("metal"), 0.38, 0.1, -1.4, 0.0, 0.02, segs=4, cap=False)


def _safe_top(U, rows):
    """How high on a unit's street face things may stand proud of it: under
    the roofs of the faces on either side of it along the row (where the
    line from the hero's lens through them runs on into a wall)."""
    L, h = U["lot"], U["h"]
    hs = [h]
    for N in rows:
        if N is not L and (abs(N["z1"] - L["z0"]) < 6.0 or abs(N["z0"] - L["z1"]) < 6.0):
            hs.append(N["h"])
    return min(hs) - 4.0


def _spot(U, s0, s1, y0, y1):
    """How far proud of the lot line the face stands behind a rectangle, if
    it is one plane there (not across a tier's edge, a cut into the face or
    a service floor), else None."""
    for q in U["holes"]:
        if q["s0"] - 0.3 < s1 and q["s1"] + 0.3 > s0 and q["y0"] - 0.3 < y1 and q["y1"] + 0.3 > y0:
            return None
    for z in U["zones"]:
        if z["kind"] == "svc" and z["y0"] - 0.1 < y1 and z["y1"] + 0.1 > y0:
            return None
    om = M.off(U, s0, s1, y0, y1)
    if M.off(U, s0, s0 + 0.1, y0, y1) != om or M.off(U, s1 - 0.1, s1, y0, y1) != om:
        return None
    if any(p["y0"] - 0.4 < y1 and p["y0"] + 0.4 > y0 or p["y1"] - 0.4 < y1 and p["y1"] + 0.4 > y0
           for p in U["proud"] if p["s0"] < s1 and p["s1"] > s0):
        return None
    return om


def street(U, taken, rows, r):
    """Balconies, pairs of air conditioners, small lit boards and conduits
    over a tower's street face, bay by bay and floor by floor, clear of its
    signs (`taken`), its tiers' edges and its cuts."""
    L = U["lot"]
    st, ph, h = U["st"], L["ph"], U["h"]
    w = st.width
    bays = max(1, round(w / CELL_W))
    bw = w / bays
    top = _safe_top(U, rows)
    tcol = B.TRIM[U["tint"]]
    k0, k1 = int((ph - SHOP_H) / CELL_H) + 2, int((min(top, h - 4.0) - SHOP_H) / CELL_H)
    edge = [(p["s0"], p["s1"]) for p in U["proud"]]
    n = 0
    for k in range(k0, k1):
        y = fl(k)
        for b in range(1, bays - 1):
            s = (b + 0.5) * bw + r.uniform(-0.3, 0.3)
            roll = r.random()
            if roll < 0.15:
                rect = (s - 1.45, s + 1.45, y - 0.3, y + 2.6)
                base = _spot(U, *rect)
                # (A balcony only off the lot line's own face: off a tier it
                # would stand further out than the hero's picture allows.)
                if base == 0.0 and M._free(taken, rect, pad=0.2):
                    taken.append(rect)
                    x, _, z = st.p(st.at(s), 0.0, 0.0)
                    balc(x, y, z, st.yaw)
                    n += 1
            elif roll < 0.44:
                rect = (s - 0.55, s + 0.55, y - 1.5, y + 1.5)
                base = _spot(U, *rect)
                if base is not None and M._free(taken, rect, pad=0.1):
                    taken.append(rect)
                    x, _, z = st.p(st.at(s), 0.0, base)
                    P.place("cy_acpair", x, y + 0.1, z, st.yaw, district=CB)
                    n += 1
            elif roll < 0.5:
                size = r.choice(("pm", "ps", "pm"))
                sw, sh = ST_SIZES[size]
                rect = (s - sw / 2 - 0.2, s + sw / 2 + 0.2, y + 1.3, y + 1.5 + sh)
                if _spot(U, *rect) == 0.0 and M._free(taken, rect, pad=0.2):
                    taken.append(rect)
                    C.board(st, s, y + 1.4 + sh / 2, size, r, key=CB)
                    n += 1
    # A conduit or two up the face from the podium to the roof's line of
    # safety, a box at its foot.
    for _ in range(r.choice((0, 1, 1, 2))):
        s = r.uniform(2.0, w - 2.0)
        if any(abs(s - a) < 0.6 or abs(s - c) < 0.6 for a, c in edge) or not M._free(taken, (s - 0.2, s + 0.2, ph, top), pad=0.1):
            continue
        x, _, z = st.p(st.at(s), 0.0, 0.0)
        P.place("pipe_v", x, ph + 0.2, z, st.yaw, sy=top - ph - 0.4, district=CB)
        st.box((CB, "trim", 1), s - 0.3, s + 0.3, ph + 0.3, ph + 1.0, 0.0, 0.25, col=tcol)
    return n


def side(f, y0, y1, r, key=CB):
    """The same on a tower's side wall over a slot (a lookout's walls): runs
    of air conditioners, a balcony here and there, a conduit with its
    boxes. The caller keeps y0..y1 where the hero's lens does not see it."""
    w = f.width
    if w < 6.0 or y1 - y0 < 4.0:
        return 0
    n = 0
    k = max(1, int((y0 - SHOP_H) / CELL_H) + 1)
    while fl(k) < y1 - 2.6:
        y = fl(k)
        s = 1.4
        while s < w - 1.4:
            roll = r.random()
            x, _, z = f.p(f.at(s), 0.0, 0.0)
            if roll < 0.12 and s < w - 1.5:
                balc(x, y, z, f.yaw, key)
                n += 1
                s += 3.2
                continue
            if roll < 0.36:
                P.place("cy_acpair", x, y + 0.1, z, f.yaw, district=key)
                n += 1
            s += r.uniform(1.6, 3.0)
        k += 1
    s = r.uniform(1.0, w - 1.0)
    x, _, z = f.p(f.at(s), 0.0, 0.0)
    P.place("pipe_v", x, y0 + 0.2, z, f.yaw, sy=y1 - y0 - 0.6, district=key)
    y = y0 + 1.5
    while y < y1 - 1.0:
        f.box((key, "trim", 1), s - 0.18, s + 0.18, y, y + 0.4, 0.0, 0.2, col=(0.1, 0.1, 0.12, 1))
        y += r.uniform(5.0, 9.0)
    return n


def _rect(f, s0, s1, y0, y1, out):
    """The box a thing s0..s1 along a face, y0..y1 up it, `out` proud of it
    fills (lo, hi)."""
    a, b = f.p(f.at(s0), y0, 0.0), f.p(f.at(s1), y1, out)
    return tuple(min(a[i], b[i]) for i in range(3)), tuple(max(a[i], b[i]) for i in range(3))


def tops(f, y0, y1, r, ok, tcol, key=CB):
    """A tower's top over its slab as a flying car, a crossing or the
    neighbour's roof sees it (ax5YUmkWf_Y@131, x4ztgjvfU60@22): ledges at
    their own spacing, so no one window module runs up the whole face; a
    column of balconies; a cluster of air conditioners round a conduit;
    and on some a tall strip of light or a big lit board. `ok(lo, hi)`:
    whether a box may stand there (out of the hero's lens)."""
    w = f.width
    if w < 5.0 or y1 - y0 < 6.0:
        return 0
    n = 0
    y = y0 + CELL_H * r.choice((2, 3))
    while y < y1 - 2.5:
        if ok(*_rect(f, 0.0, w, y - 0.3, y + 0.05, 0.45)):
            f.ledge((key, "trim", 0), 0.0, w, y - 0.3, 0.3, 0.4, tcol)
            n += 1
        y += CELL_H * r.choice((2, 3, 3, 4, 5))
    k0 = int((y0 - SHOP_H) / CELL_H) + 1
    floors = [fl(k) for k in range(k0, 200) if fl(k) < y1 - 3.0]
    # A column of balconies, one a floor here and there gone.
    if w >= 7.0 and floors:
        s = r.uniform(1.8, w - 1.8)
        for y in floors:
            if r.random() < 0.72 and ok(*_rect(f, s - 1.35, s + 1.35, y - 0.2, y + 2.5, 1.0)):
                x, _, z = f.p(f.at(s), 0.0, 0.0)
                balc(x, y, z, f.yaw, key)
                n += 1
        taken = (s - 1.6, s + 1.6)
    else:
        taken = (-9.0, -9.0)
    # Air conditioners in a cluster a few floors deep round a conduit.
    if floors:
        c = r.uniform(1.2, w - 1.2)
        for _ in range(4):
            if not taken[0] - 1.5 < c < taken[1] + 1.5:
                break
            c = r.uniform(1.2, w - 1.2)
        k = r.randrange(len(floors))
        for y in floors[k:k + r.randint(2, 4)]:
            for dc in (-1.2, 0.0, 1.2):
                s = c + dc
                if 0.6 < s < w - 0.6 and not taken[0] < s < taken[1] and r.random() < 0.8 and ok(*_rect(f, s - 0.5, s + 0.5, y, y + 1.5, 0.7)):
                    x, _, z = f.p(f.at(s), 0.0, 0.0)
                    P.place("cy_acpair", x, y + 0.15, z, f.yaw, district=key)
                    n += 1
        s = min(w - 0.4, c + 1.9)
        if ok(*_rect(f, s - 0.2, s + 0.2, y0, y1 - 1.0, 0.3)):
            x, _, z = f.p(f.at(s), 0.0, 0.0)
            P.place("pipe_v", x, y0 + 0.2, z, f.yaw, sy=y1 - y0 - 1.4, district=key)
    # A big vertical sign near the top (a blade's design at twice its size,
    # its edges lit) over a strip of coloured light down the face, or a big
    # lit board. (A plain pale strip read as a blank sign.)
    roll = r.random()
    big = w >= 12.0 and y1 - y0 >= 18.0
    strip = None
    if (roll < 0.4 or big) and y1 - y0 > 14.0:
        sw, sh = 2.4, 10.0
        s = r.choice((r.uniform(1.7, 2.6), r.uniform(w - 2.6, w - 1.7)))
        hh = min(y1 - y0 - 3.0, r.uniform(12.0, 26.0))
        ya = y1 - 1.5 - hh
        if hh >= sh + 1.5 and ok(*_rect(f, s - 1.45, s + 1.45, ya - 0.2, ya + hh + 0.2, 0.8)):
            hue = r.choice(("cyan", "cyan", "amber", "teal", "blue", "pink"))
            strip = s
            yb = ya + hh - sh
            f.box((key, "board_frame", 0), s - sw / 2 - 0.15, s + sw / 2 + 0.15, yb - 0.15, ya + hh + 0.15, 0.25, 0.55)
            cx, cy, cz = f.p(f.at(s), yb + sh / 2, 0.57)
            sign(C.own_name("bl"), cx, cy, cz, sw, sh, f.yaw, district=key, label=False)
            for e in (-1, 1):
                f.quad((key, "neon_" + hue, 0), s + e * (sw / 2 + 0.06) - 0.06, s + e * (sw / 2 + 0.06) + 0.06, yb - 0.1, ya + hh + 0.1, 0.58)
            f.box((key, "board_frame", 0), s - 0.62, s + 0.62, ya - 0.15, yb - 0.15, 0.25, 0.55)
            f.quad((key, "glow", 0), s - 0.5, s + 0.5, ya, yb - 0.4, 0.56, col=C.dim(hue, 0.7))
            yy = ya + 1.1
            while yy < yb - 0.8:
                f.quad((key, "glow", 0), s - 0.5, s + 0.5, yy, yy + 0.09, 0.565, col=C.dim(hue, 0.25))
                yy += r.choice((0.9, 1.3, 1.3, 2.2))
            n += 1
    if (0.4 <= roll < 0.75 or big) and w >= 8.0:
        bw = min(w - 2.0, r.choice((5.6, 6.5, 7.5)))
        bh = bw * 1.2 / 2.8
        s = r.uniform(1.0 + bw / 2, w - 1.0 - bw / 2)
        for _ in range(6):
            if strip is None or abs(s - strip) > bw / 2 + 1.0:
                break
            s = r.uniform(1.0 + bw / 2, w - 1.0 - bw / 2)
        y = y1 - 1.6 - bh / 2
        if strip is not None and abs(s - strip) <= bw / 2 + 1.0:
            y = -99.0
        if y - bh / 2 > y0 + 1.0 and ok(*_rect(f, s - bw / 2 - 0.1, s + bw / 2 + 0.1, y - bh / 2 - 0.1, y + bh / 2 + 0.1, 0.6)):
            f.box((key, "board_frame", 0), s - bw / 2 - 0.1, s + bw / 2 + 0.1, y - bh / 2 - 0.1, y + bh / 2 + 0.1, 0.0, 0.45)
            cx, cy, cz = f.p(f.at(s), y, 0.47)
            sign(C.own_name("pm"), cx, cy, cz, bw, bh, f.yaw, district=key, label=False)
            n += 1
    return n


def _cut(runs, gaps):
    """Runs (a, b) along a face with spans (g0, g1) taken out of them."""
    for g0, g1 in gaps:
        nxt = []
        for a, b in runs:
            if g1 <= a or g0 >= b:
                nxt.append((a, b))
                continue
            if g0 - a > 0.8:
                nxt.append((a, g0))
            if b - g1 > 0.8:
                nxt.append((g1, b))
        runs = nxt
    return runs


def lines(f, y0, y1, r, ok, hues, key=CB, out=0.07, skip=(), s0=0.25, s1=None):
    """Lines of neon along a face's floor edges (x4ztgjvfU60@22: a tower's
    floors drawn in light): every few floors between y0 and y1, a run now
    and then broken, mostly the building's own hue. `skip`: rectangles
    (s0, s1, y0, y1) to keep clear (its signs)."""
    s1 = f.width - 0.25 if s1 is None else s1
    if s1 - s0 < 4.0 or y1 - y0 < CELL_H * 2:
        return 0
    every = r.choice((2, 3, 3, 4))
    k = int((y0 - SHOP_H) / CELL_H) + 1 + r.randrange(every)
    n = 0
    while fl(k) < y1 - 1.0:
        y = fl(k)
        if r.random() < 0.85:
            hue = hues[0] if r.random() < 0.75 else r.choice(hues)
            runs = [(s0, s1)]
            if r.random() < 0.35 and s1 - s0 > 10.0:
                g, gw = r.uniform(s0 + (s1 - s0) * 0.25, s0 + (s1 - s0) * 0.75), r.uniform(1.5, 4.0)
                runs = [(s0, g - gw / 2), (g + gw / 2, s1)]
            runs = _cut(runs, [(a - 0.2, b + 0.2) for a, b, c, d in skip if c - 0.3 < y + 0.12 and d + 0.3 > y])
            for a, b in runs:
                if b - a > 1.0 and ok(*_rect(f, a, b, y, y + 0.14, out + 0.02)):
                    f.quad((key, "neon_" + hue, 0), a, b, y + 0.02, y + 0.12, out)
                    n += 1
        k += every
    return n


def vsign(f, s, yb, hue, key=CB, k=2.0, out=0.1):
    """A big vertical sign flat on a face: a blade's design at k times its
    size in a frame, its long edges lit. Returns the rectangle it takes."""
    sw, sh = 1.2 * k, 5.0 * k
    f.box((key, "board_frame", 0), s - sw / 2 - 0.15, s + sw / 2 + 0.15, yb - 0.15, yb + sh + 0.15, out, out + 0.3)
    cx, cy, cz = f.p(f.at(s), yb + sh / 2, out + 0.32)
    sign(C.own_name("bl"), cx, cy, cz, sw, sh, f.yaw, district=key, label=False)
    for e in (-1, 1):
        f.quad((key, "neon_" + hue, 0), s + e * (sw / 2 + 0.06) - 0.06, s + e * (sw / 2 + 0.06) + 0.06, yb - 0.1, yb + sh + 0.1, out + 0.33)
    return (s - sw / 2 - 0.3, s + sw / 2 + 0.3, yb - 0.3, yb + sh + 0.3)


def upper(f, y0, y1, r, ok, hues, key=CB, taken=None, sign_rate=0.75):
    """The upper floors of a face as the show's canyon has them lit
    (x4ztgjvfU60@22, ARL_JWwKdDs@22): a big vertical sign high on it, lines
    of neon along its floor edges round it. `taken`: rectangles already
    used on the face (kept clear, and the sign's added)."""
    taken = [] if taken is None else taken
    w = f.width
    n = 0
    if w >= 8.0 and y1 - y0 >= 16.0 and r.random() < sign_rate:
        kk = r.choice((2.0, 2.0, 2.5))
        sw, sh = 1.2 * kk, 5.0 * kk
        for _ in range(6):
            s = r.choice((r.uniform(sw / 2 + 0.8, w * 0.3), r.uniform(w * 0.7, w - sw / 2 - 0.8)))
            yb = r.uniform(max(y0 + 2.0, y1 - sh - 10.0), y1 - sh - 1.5)
            rect = (s - sw / 2 - 0.3, s + sw / 2 + 0.3, yb - 0.3, yb + sh + 0.3)
            if ok(*_rect(f, rect[0], rect[1], rect[2], rect[3], 0.5)) and C._free(taken, rect):
                vsign(f, s, yb, r.choice(hues), key, kk)
                n += 1
                break
    return n + lines(f, y0, y1, r, ok, hues, key, skip=taken)


def street_lights(U, taken, rows, r):
    """A street face's upper floors lit: a big vertical sign flat on it and
    lines of neon along its floor edges, both edge on to the hero's lens,
    where the face is one plane, under its neighbours' roofs and clear of
    its signs, its tiers and its cuts."""
    L = U["lot"]
    st, ph, h = U["st"], L["ph"], U["h"]
    w = st.width
    top = min(_safe_top(U, rows), h - 3.0)
    n = 0
    if w >= 10.0 and top - ph - 14.0 >= 12.0 and r.random() < 0.65:
        sw, sh = 2.4, 10.0
        for _ in range(6):
            s = r.uniform(sw / 2 + 1.6, w - sw / 2 - 1.6)
            yb = r.uniform(ph + 14.0, top - sh)
            rect = (s - sw / 2 - 0.3, s + sw / 2 + 0.3, yb - 0.3, yb + sh + 0.3)
            base = _spot(U, *rect)
            if base is not None and M._free(taken, rect, pad=0.2):
                vsign(st, s, yb, r.choice(U["hues"]), CB, 2.0, out=base + 0.1)
                n += 1
                break
    # (On the lot line's face and on the fronts of the tiers standing out of
    # it, each at its own depth; a megaslab's edge carries its own.)
    every = r.choice((2, 2, 3, 4))
    k = int((ph + CELL_H * 2 - SHOP_H) / CELL_H) + r.randrange(every)
    while fl(k) < top:
        y = fl(k)
        svc = any(z["kind"] == "svc" and z["y0"] - 0.1 < y + 0.14 and z["y1"] + 0.1 > y for z in U["zones"])
        if not svc and r.random() < 0.85:
            hue = U["hues"][0] if r.random() < 0.75 else r.choice(U["hues"])
            hit = lambda q: q["y0"] - 0.3 < y + 0.14 and q["y1"] + 0.3 > y
            signs = [(a - 0.2, b + 0.2) for a, b, c, d in taken if c - 0.3 < y + 0.14 and d + 0.3 > y]
            spans = [(a, b, 0.0) for a, b in _cut([(0.3, w - 0.3)], [(q["s0"] - 0.2, q["s1"] + 0.2) for q in U["proud"] + U["holes"] if hit(q)] + signs)]
            for q in U["proud"]:
                if q["y0"] + 0.3 < y and q["y1"] - 0.3 > y + 0.14:
                    spans += [(a, b, q["out"]) for a, b in _cut([(q["s0"] + q["c"] + 0.2, q["s1"] - q["c"] - 0.2)], signs)]
            for a, b, o in spans:
                if b - a > 1.0:
                    st.quad((CB, "neon_" + hue, 0), a, b, y + 0.02, y + 0.12, o + 0.07)
                    n += 1
        k += every
    for ft in U["feat"]:
        if ft[0] == "slab" and ft[3] < top + 4.0 and r.random() < 0.8:
            _, a, b, y, o = ft
            st.quad((CB, "neon_" + r.choice(U["hues"]), 0), a + 0.3, b - 0.3, y - 0.52, y - 0.42, o + 0.02)
            n += 1
    return n
