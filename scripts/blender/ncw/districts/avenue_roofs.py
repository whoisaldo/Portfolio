"""Kabuki Avenue's roofs, seen from the deck, from a roof and from the air.

From above the avenue's rows were one plateau: every lot a flat dark roof
at its street height. Behind each lot's street front, where the hero's low
lens cannot see (kit.hero_sees, with the rows' own masses in its way), the
back of the lot goes on up some storeys, so the roofs step and the lanes
are deep; and every roof that lens cannot see is lived on or worked on
(D6ia1wjO7sg@220, ARL_JWwKdDs@23): a garden under a pergola's lamps, a sign
on a lattice frame, a billboard turned to the lane, a landing pad ringed
with light, rooms built on the roof with their windows lit, a washing line,
skylights, panels, plant. What stands on a roof is tested against the
hero's lens piece by piece, so the plate's roofline stays as framed.
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import avenue_kit as K

TIMBER = (0.12, 0.08, 0.05, 1)


def hidden(lo, hi):
    """Whether the hero's lens sees nothing of a box (and it is across
    nothing the lens frames over the canyon)."""
    return not (hero_sees(lo, hi) or hero_covers(lo, hi))


def sign_on_frame(D, cx, cz, top, yaw, size, scale, both=True):
    """A sign standing on a roof on its lattice: two legs, struts back, a
    walkway rail under it; painted on both sides."""
    w, h = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
    y = top + 1.5 + h / 2
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    for du in (-w * 0.38, w * 0.38):
        px, pz = cx + rx * du, cz + rz * du
        pipe((D, "metal", 1), (px, top, pz), (px, y + h / 2, pz), 0.07, segs=4)
        pipe((D, "metal", 1), (px, y, pz), (px - nx * 1.8, top, pz - nz * 1.8), 0.05, segs=3)
    pipe((D, "metal", 1), (cx - rx * w / 2, top + 1.3, cz - rz * w / 2), (cx + rx * w / 2, top + 1.3, cz + rz * w / 2), 0.04, segs=3)
    oriented_box((D, "board_frame", 0), cx, y, cz, w + 0.25, h + 0.25, 0.24, yaw, scale=1.0)
    K.st_face(D, K.st_id(size), (cx + nx * 0.13, y, cz + nz * 0.13), (rx, 0.0, rz), K.UP, w, h)
    if both:
        K.st_face(D, K.st_id(size), (cx - nx * 0.13, y, cz - nz * 0.13), (-rx, 0.0, -rz), K.UP, w, h)
    return y + h / 2


def pad(D, cx, cz, top, r, hue="cyan"):
    """A landing pad: a dark disc, a ring and a cross of light, lamps round
    its rim."""
    cylinder((D, "dark", 0), cx, cz, top, top + 0.12, r, segs=14)
    y = top + 0.13
    n = 14
    for i in range(n):
        a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
        pts = [(cx + math.cos(a) * rr, y, cz + math.sin(a) * rr) for a, rr in ((a0, r * 0.78), (a1, r * 0.78), (a1, r * 0.7), (a0, r * 0.7))]
        quad((D, "glow", 0), pts[3], pts[2], pts[1], pts[0], col=GLOW[hue])
        if i % 2 == 0:
            box((D, "glow", 0), cx + math.cos(a0) * r - 0.1, cx + math.cos(a0) * r + 0.1, top + 0.12, top + 0.3,
                cz + math.sin(a0) * r - 0.1, cz + math.sin(a0) * r + 0.1, scale=0.5, col=GLOW["amber"])
    for (hw, hd) in ((r * 0.42, 0.14), (0.14, r * 0.42)):
        quad((D, "glow", 0), (cx - hw, y, cz + hd), (cx + hw, y, cz + hd), (cx + hw, y, cz - hd), (cx - hw, y, cz - hd), col=GLOW["white"])


def shack(D, x0, x1, z0, z1, top, rng, tint):
    """A room built on a roof: its windows lit, a tin roof, a door's lamp."""
    col = B.wall_col(rng.uniform(0.8, 1.0), 6, rng.uniform(0.5, 1.0), tint)
    ov = 7.0 - (top - SHOP_H) / CELL_H
    for f in B.faces_of(x0, x1, z0, z1).values():
        B.facade_wall((D, "facade", 0), f, top, top + CELL_H, col, ov)
    box((D, "metal", 0), x0 - 0.25, x1 + 0.25, top + CELL_H, top + CELL_H + 0.12, z0 - 0.25, z1 + 0.25, scale=1.0)
    box((D, "glow", 0), x0 + 0.5, x0 + 0.8, top + 2.3, top + 2.42, z1 + 0.02, z1 + 0.14, scale=0.5, col=GLOW["amber"])


def skylights(D, x0, x1, z0, z1, top, rng):
    hue = rng.choice(("amber", "cyan", "white", "pink"))
    dim = tuple(v * rng.uniform(0.12, 0.3) for v in GLOW[hue][:3]) + (1,)
    x = x0
    while x + 1.6 <= x1:
        box((D, "trim", 1), x, x + 1.6, top, top + 0.3, z0, z1, scale=1.0, col=B.DARK_TRIM)
        quad((D, "glow", 0), (x + 0.12, top + 0.31, z1 - 0.12), (x + 1.48, top + 0.31, z1 - 0.12), (x + 1.48, top + 0.31, z0 + 0.12), (x + 0.12, top + 0.31, z0 + 0.12), col=dim)
        x += 2.3


def panels(D, x0, x1, z0, z1, top):
    z = z0
    while z + 1.2 <= z1:
        a, b, c, d = (x0, top + 0.35, z + 1.1), (x1, top + 0.35, z + 1.1), (x1, top + 1.0, z), (x0, top + 1.0, z)
        quad((D, "glass_dark", 1), a, b, c, d)
        quad((D, "metal", 1), b, a, d, c)
        z += 1.7


def edge_light(D, x0, x1, z0, z1, top, hue, sides):
    """A thin line of light lying along some of a parapet's top: the roofs
    drawn in cyan and amber from the air (glow: it lights no street)."""
    y0, y1 = top + 0.95, top + 1.0
    for name in sides:
        if name == "+x":
            box((D, "glow", 0), x1 - 0.22, x1 - 0.06, y0, y1, z0, z1, scale=1.0, col=GLOW[hue])
        elif name == "-x":
            box((D, "glow", 0), x0 + 0.06, x0 + 0.22, y0, y1, z0, z1, scale=1.0, col=GLOW[hue])
        elif name == "+z":
            box((D, "glow", 0), x0, x1, y0, y1, z1 - 0.22, z1 - 0.06, scale=1.0, col=GLOW[hue])
        else:
            box((D, "glow", 0), x0, x1, y0, y1, z0 + 0.06, z0 + 0.22, scale=1.0, col=GLOW[hue])


def light_roofs(D, roofs, seed=6400):
    """Lines of light on the parapets of roofs the generator dressed (the
    arm's, the south street's row's, the blocks' behind them)."""
    rng = random.Random(seed)
    for (d, x0, x1, z0, z1, top) in roofs:
        if d != D or x1 - x0 < 5 or z1 - z0 < 5:
            continue
        roll = rng.random()
        hue = rng.choice(("cyan", "cyan", "amber", "amber", "pink", "teal", "green", "purple"))
        if roll < 0.4:
            edge_light(D, x0, x1, z0, z1, top, hue, ("+x", "-x", "+z", "-z"))
        elif roll < 0.75:
            edge_light(D, x0, x1, z0, z1, top, hue, rng.sample(("+x", "-x", "+z", "-z"), 2))
        # Work lamps down the middle of it, clear of its edges.
        w, d = x1 - x0, z1 - z0
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        if min(w, d) < 11.0:
            work_lamp(D, cx, cz, top, rng.choice(LAMP_HUES), wide=False)
        else:
            for t in ((0.3, 0.7) if max(w, d) >= 20.0 else (0.5,)):
                lx, lz = (x0 + w * t, cz) if w >= d else (cx, z0 + d * t)
                work_lamp(D, lx, lz, top, rng.choice(LAMP_HUES))
            if rng.random() < 0.35:
                # An advert on a scaffold over the roof, turned to the street
                # (the south street north of it, or the arm).
                yaw = math.pi if cz < 42.0 and abs(cx) > 44.0 else -math.copysign(math.pi / 2, cx)
                bw = min((w if cz < 42.0 and abs(cx) > 44.0 else d) - 1.5, rng.uniform(7.0, 11.0))
                bh = bw * rng.uniform(0.45, 0.6)
                by = top + 2.4 + bh / 2
                B.billboard(D, cx, by, cz, bw, bh, yaw + rng.uniform(-0.25, 0.25), rng)
                for du in (-bw * 0.35, bw * 0.35):
                    px_, pz_ = cx + math.cos(yaw) * du, cz - math.sin(yaw) * du
                    box((D, "metal", 1), px_ - 0.12, px_ + 0.12, top, by - bh / 2, pz_ - 0.12, pz_ + 0.12, scale=0.5)


def inland(x, z):
    """Whether a pool of light on an avenue roof here stays on the roofs: off
    the lanes behind the rows, the avenue's own facades and road, the cross
    streets at either end and the deck's gap."""
    return 21.0 <= abs(x) <= 38.0 and -162.0 <= z <= -16.0 and not -92.0 < z < -68.0


def work_lamp(D, x, z, top, hue, pole=True, wide=True):
    """A lamp on a pole over a roof, and its pool: at a roof's height the
    bake gives a third of what it gives a street, so a wide pool is five
    points a cell apart. What stands on the roof is seen in it from the air."""
    if pole:
        box((D, "metal", 1), x - 0.05, x + 0.05, top, top + 3.2, z - 0.05, z + 0.05, scale=0.5)
        box((D, "glow", 0), x - 0.25, x + 0.25, top + 3.2, top + 3.3, z - 0.25, z + 0.25, scale=0.5, col=GLOW[hue])
    for dx, dz in (((0.0, 0.0), (1.5, 0.0), (-1.5, 0.0), (0.0, 1.5), (0.0, -1.5)) if wide else ((0.0, 0.0),)):
        light(D, x + dx, top + 2.0, z + dz, hue, 9.0)
    # The roof's own felt is too dark to hold a pool: the lamp stands on a
    # terrace of paving that does.
    r = 3.6 if wide else 2.2
    rx, rz = r * (0.75 + 0.5 * ((x * 0.37) % 1.0)), r * (0.75 + 0.5 * ((z * 0.53) % 1.0))
    pts = ((x - rx, top + 0.03, z + rz), (x + rx, top + 0.03, z + rz), (x + rx, top + 0.03, z - rz), (x - rx, top + 0.03, z - rz))
    quad((D, "trim", 0), *pts, uvs=tuple((c[0] / 2.0, -c[2] / 2.0) for c in pts), col=(0.4, 0.4, 0.44, 1))


LAMP_HUES = ("white", "cyan", "amber", "white", "pink")
PADS = [0]   # one landing pad in the district, no more


def hut(D, x0, x1, z0, z1, top, tint, rng):
    """A stair hut: its door lit, a lamp over it, a cap."""
    box((D, "trim", 0), x0, x1, top, top + 2.6, z0, z1, scale=1.5, col=B.TRIM[tint])
    box((D, "dark", 1), x0 - 0.1, x1 + 0.1, top + 2.6, top + 2.72, z0 - 0.1, z1 + 0.1, scale=1.0)
    cx = (x0 + x1) / 2
    quad((D, "glow", 0), (cx - 0.45, top, z1 + 0.02), (cx + 0.45, top, z1 + 0.02), (cx + 0.45, top + 2.0, z1 + 0.02), (cx - 0.45, top + 2.0, z1 + 0.02),
         col=tuple(v * 0.6 for v in GLOW[rng.choice(("amber", "amber", "white", "cyan"))][:3]) + (1,))


def dress(D, x0, x1, z0, z1, top, rng, tint=0, lane_yaw=0.0, parapet=False, check=True):
    """What one roof (or the back of one) holds: always its plant (a stair
    hut, condensers in a row, a duct and a vent stack, a tank, a dish, a
    mast), and in the room that leaves one thing of its own: a garden, a
    sign on a frame, rooms, skylights, panels, the district's one pad.
    `lane_yaw`: the way its sign turns. Every piece is tested against the
    hero's lens when `check`."""
    ok = hidden if check else (lambda lo, hi: True)
    w, d = x1 - x0, z1 - z0
    if parapet:
        t = 0.3
        for (a0, a1, b0, b1) in ((x0, x1, z1 - t, z1), (x0, x1, z0, z0 + t), (x0, x0 + t, z0 + t, z1 - t), (x1 - t, x1, z0 + t, z1 - t)):
            if ok((a0, top, b0), (a1, top + 0.95, b1)):
                box((D, "trim", 0), a0, a1, top, top + 0.95, b0, b1, scale=1.5, col=B.TRIM[tint])
    if w < 5.0 or d < 5.0:
        return
    B.ROOFS.append((D, x0, x1, z0, z1, top))
    ix0, ix1, iz0, iz1 = x0 + 0.8, x1 - 0.8, z0 + 0.8, z1 - 0.8
    # Three stretches along the roof's longer side: plant at both ends, the
    # roof's own thing between.
    along_x = w >= d
    lo, hi = (ix0, ix1) if along_x else (iz0, iz1)
    third = (hi - lo) / 3
    zone = lambda k: ((lo + k * third, lo + (k + 1) * third, iz0, iz1) if along_x else (ix0, ix1, lo + k * third, lo + (k + 1) * third))  # noqa: E731
    ends = [0, 2]
    rng.shuffle(ends)
    # One end: the hut, a tank beside it, a mast.
    ax0, ax1, az0, az1 = zone(ends[0])
    if ok((ax0, top, az0), (ax0 + 2.6, top + 2.8, az0 + 2.2)):
        hut(D, ax0 + 0.2, ax0 + 2.6, az0 + 0.2, az0 + 2.2, top, tint, rng)
    if ax1 - ax0 > 6.2 or az1 - az0 > 6.0:
        tx, tz = (ax1 - 1.7, az1 - 1.7)
        if rng.random() < 0.6 and ok((tx - 1.5, top, tz - 1.5), (tx + 1.5, top + 4.5, tz + 1.5)):
            P.place("tank_roof", tx, top, tz, rng.uniform(0, 6.28), district=D)
        elif ok((tx - 0.8, top, tz - 0.8), (tx + 0.8, top + 2.2, tz + 0.8)):
            P.place("dish", tx, top, tz, rng.uniform(0, 6.28), district=D)
    if rng.random() < 0.55 and ok((ax1 - 0.9, top, az0), (ax1, top + 7.5, az0 + 0.9)):
        P.place("antenna", ax1 - 0.5, top, az0 + 0.5, rng.uniform(0, 3.1), sy=rng.uniform(0.7, 1.2), district=D)
    # The other end: condensers in rows, a duct from them to a vent stack.
    bx0, bx1, bz0, bz1 = zone(ends[1])
    if ok((bx0, top, bz0), (bx1, top + 1.9, bz1)):
        rows = 1 if bz1 - bz0 < 5.5 else 2
        for j in range(rows):
            n = max(1, int((bx1 - bx0 - 0.4) // 1.7))
            for k in range(min(n, 5)):
                P.place("ac_roof", bx0 + 0.9 + k * 1.7, top, bz0 + 0.7 + j * 2.1, 0.0, district=D)
        zz = bz1 - 0.9
        box((D, "metal", 1), bx0 + 0.3, bx1 - 0.6, top + 0.35, top + 0.85, zz - 0.25, zz + 0.25, scale=0.8)
        cylinder((D, "metal", 0), bx1 - 0.7, zz, top, top + 1.8, 0.38, segs=8)
        cylinder((D, "dark", 1), bx1 - 0.7, zz, top + 1.8, top + 1.9, 0.46, segs=8)
    if rng.random() < 0.5 and ok((bx0, top, bz1 - 1.6), (bx0 + 1.6, top + 2.2, bz1)):
        P.place("dish", bx0 + 0.8, top, bz1 - 2.0, rng.uniform(0, 6.28), district=D)
    # A work lamp over each end.
    for k in (0, 2):
        qx0, qx1, qz0, qz1 = zone(k)
        lx, lz = (qx0 + qx1) / 2, (qz0 + qz1) / 2
        lx = math.copysign(min(abs(lx), 38.0), lx)
        if inland(lx, lz) and ok((lx - 0.3, top, lz - 0.3), (lx + 0.3, top + 3.4, lz + 0.3)):
            work_lamp(D, lx, lz, top, rng.choice(LAMP_HUES))
    # Between them.
    mx0, mx1, mz0, mz1 = zone(1)
    cx, cz = (mx0 + mx1) / 2, (mz0 + mz1) / 2
    mw, md = mx1 - mx0, mz1 - mz0
    themes = ["garden", "sign", "shacks", "skylights", "panels", "none", "billboard"]
    weights = [1.5, 2.0, 1.6, 1.4, 0.9, 0.5, 2.4]
    if min(mw, md) > 8.5 and PADS[0] < 1:
        themes.append("pad")
        weights.append(1.0)
    theme = rng.choices(themes, weights=weights)[0]
    if theme == "garden" and min(mw, md) > 5.6 and ok((mx0, top, mz0), (mx1, top + 4.5, mz1)):
        gx1, gz1 = min(mx1, mx0 + 9.0), min(mz1, mz0 + 9.0)
        K.roof_garden(D, mx0, gx1, mz0, gz1, top, rng)
        stand((mx0 + gx1) / 2, mz0 + 2.6, 0.0, "sit", y=top + 0.48)
        if rng.random() < 0.6:
            stand(gx1 - 0.5, (mz0 + gz1) / 2, math.pi / 2, "lean", y=top + 0.08)
            stand(gx1 - 1.3, (mz0 + gz1) / 2 + 0.6, -math.pi / 2 + 0.6, "talk", y=top + 0.08)
    elif theme == "sign":
        size, scale = rng.choice((("pm", 2.2), ("pm", 3.0), ("ps", 3.2), ("bl", 1.6), ("bm", 2.2)))
        sw, sh = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
        yaw = lane_yaw + rng.uniform(-0.45, 0.45)
        r_ = sw / 2 + 0.4
        if ok((cx - r_, top, cz - r_), (cx + r_, top + 1.8 + sh, cz + r_)):
            sign_on_frame(D, cx, cz, top, yaw, size, scale)
    elif theme == "billboard":
        # An advert on a scaffold, turned to the avenue over the roofs.
        bw = min(d - 1.0, rng.uniform(7.0, 11.0))
        bh = bw * rng.uniform(0.45, 0.6)
        yaw = -lane_yaw + rng.uniform(-0.3, 0.3)
        by = top + 2.2 + bh / 2
        r_ = bw / 2 + 0.3
        bz = (z0 + z1) / 2
        if bw >= 5.0 and ok((cx - r_, top, bz - r_), (cx + r_, by + bh / 2 + 0.3, bz + r_)):
            B.billboard(D, cx, by, bz, bw, bh, yaw, rng)
            for du in (-bw * 0.35, bw * 0.35):
                px_, pz_ = cx + math.cos(yaw) * du, bz - math.sin(yaw) * du
                box((D, "metal", 1), px_ - 0.12, px_ + 0.12, top, by - bh / 2, pz_ - 0.12, pz_ + 0.12, scale=0.5)
    elif theme == "shacks":
        z = mz0
        while z + 3.2 < mz1:
            sw_, sd_ = rng.uniform(3.0, max(3.1, min(6.4, mw))), rng.uniform(3.0, 4.2)
            sx0 = rng.uniform(mx0, max(mx0, mx1 - sw_))
            if z + sd_ <= mz1 and ok((sx0 - 0.3, top, z - 0.3), (sx0 + sw_ + 0.3, top + CELL_H + 0.3, z + sd_ + 0.3)):
                shack(D, sx0, sx0 + sw_, z, z + sd_, top, rng, tint)
            z += sd_ + rng.uniform(1.5, 4.0)
        if md > 6 and ok((mx0, top, mz0), (mx1, top + 2.6, mz1)):
            K.laundry(D, (mx0 + 0.3, top + 2.3, mz0 + 0.5), (mx1 - 0.3, top + 2.3, mz1 - 0.5), rng)
    elif theme == "skylights":
        if ok((mx0, top, mz0), (mx1, top + 0.4, mz1)):
            skylights(D, mx0 + 0.3, mx1 - 0.3, cz - min(1.6, md * 0.25), cz + min(1.6, md * 0.25), top, rng)
    elif theme == "panels":
        if ok((mx0, top, mz0), (mx1, top + 1.1, mz1)):
            panels(D, mx0 + 0.4, mx1 - 0.4, mz0 + 0.4, mz1 - 0.4, top)
    elif theme == "pad":
        r_ = min(mw, md) / 2 - 0.6
        if ok((cx - r_, top, cz - r_), (cx + r_, top + 0.4, cz + r_)):
            pad(D, cx, cz, top, r_, rng.choice(("cyan", "amber", "pink")))
            PADS[0] += 1


def rear(D, lots, walk, depth, style, seed=6100):
    """Behind each of the avenue's lots: its back raised some storeys where
    the hero cannot see it, and the roofs dressed. `lots`: (side, z0, z1,
    height, crowned) as built."""
    for n, (s, z0, z1, h, crowned) in enumerate(lots):
        rng = random.Random(seed + n * 29)
        if crowned:
            continue
        back = s * (walk + depth)
        front = s * (walk + rng.choice((10.0, 12.0, 14.0, 16.0)))
        x0, x1 = sorted((front, back))
        lane_yaw = s * math.pi / 2
        # The street front's own roof: a pool of light on what the kit
        # stood there (and the lamp itself where the hero cannot see it).
        fx, fz = s * max(21.5, (walk + abs(front)) / 2), (z0 + z1) / 2
        if inland(fx, fz):
            work_lamp(D, fx, fz, h, ("white", "cyan", "amber")[n % 3], pole=hidden((fx - 0.3, h, fz - 0.3), (fx + 0.3, h + 3.4, fz + 0.3)))
        add = CELL_H * rng.choice((0, 2, 3, 3, 4, 5, 6))
        if z1 - z0 < 8.0:
            add = min(add, CELL_H * 3)
        while add > 0 and not hidden((x0 - 0.6, h, z0 - 0.3), (x1 + 0.6, h + add + 1.4, z1 + 0.3)):
            add -= CELL_H
        if add > 0:
            sides = {"+x": "open", "-x": "open", "+z": "open", "-z": "open"}
            tint = rng.choice(style["tints"])
            B.building(B.Lot(x0, x1, z0, z1, "-x" if s > 0 else "+x", sides, {}, D), h + add, rng,
                       style=dict(style, balcony=0.12, ac=0.3, pipes=0.3, cornice=0.2), base=h, signs=False, roof=False, tint=tint)
            top = h + add
            dress(D, x0, x1, z0, z1, top, rng, tint=B.TINTS[tint], lane_yaw=lane_yaw, parapet=True)
            hue = rng.choice(("cyan", "cyan", "amber", "pink", "teal", "green"))
            if rng.random() < 0.6 and hidden((x0, top, z0), (x1, top + 1.2, z1)):
                edge_light(D, x0, x1, z0, z1, top, hue, ("+x" if s > 0 else "-x", "+z", "-z") if rng.random() < 0.5 else ("+x" if s > 0 else "-x",))
            if h + add > 40 and hidden((back - s * 1.5 - 0.3, top, z0), (back - s * 1.5 + 0.3, top + 7.5, z0 + 1.2)):
                P.place("antenna", back - s * 1.5, top, z0 + 1.0, 0.0, sy=1.1, district=D)
        else:
            # No higher: its own roof keeps what the generator stands on it,
            # and a line of light along its lane edge.
            if rng.random() < 0.6 and hidden((x0, h, z0), (x1, h + 1.2, z1)):
                edge_light(D, x0, x1, z0, z1, h, rng.choice(("cyan", "amber", "pink")), ("+x" if s > 0 else "-x",))
            if inland(s * 32.0, fz):
                work_lamp(D, s * 32.0, fz, h, ("amber", "white", "cyan")[n % 3], pole=hidden((s * 32.0 - 0.3, h, fz - 0.3), (s * 32.0 + 0.3, h + 3.4, fz + 0.3)))
