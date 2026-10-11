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


def dress(D, x0, x1, z0, z1, top, rng, tint=0, lane_yaw=0.0, parapet=False, check=True):
    """What one roof (or the back of one) holds. `lane_yaw`: the way its
    signs and boards turn (toward the lane behind it)."""
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
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    ix0, ix1, iz0, iz1 = x0 + 0.8, x1 - 0.8, z0 + 0.8, z1 - 0.8
    themes = ["garden", "sign", "billboard", "shacks", "plant", "skylights", "panels", "tank"]
    weights = [1.6, 1.8, 1.3, 1.6, 1.2, 1.3, 0.8, 1.0]
    if min(w, d) > 10.5:
        themes.append("pad")
        weights.append(0.6)
    theme = rng.choices(themes, weights=weights)[0]
    if theme == "garden" and ok((ix0, top, iz0), (ix1, top + 4.5, iz1)):
        gx1 = min(ix1, ix0 + 9.0)
        gz1 = min(iz1, iz0 + 9.0)
        K.roof_garden(D, ix0, gx1, iz0, gz1, top, rng)
        if gx1 - ix0 > 5.5 and gz1 - iz0 > 5.5:
            stand((ix0 + gx1) / 2, iz0 + 2.6, 0.0, "sit", y=top + 0.48)
        if rng.random() < 0.6:
            stand(gx1 - 0.5, (iz0 + gz1) / 2, math.pi / 2, "lean", y=top + 0.08)
            stand(gx1 - 1.3, (iz0 + gz1) / 2 + 0.6, -math.pi / 2 + 0.6, "talk", y=top + 0.08)
    elif theme == "sign":
        size, scale = rng.choice((("pm", 2.2), ("pm", 3.0), ("ps", 3.2), ("bx", 3.0), ("bl", 1.6)))
        sw, sh = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
        yaw = lane_yaw + rng.uniform(-0.45, 0.45)
        r_ = sw / 2 + 0.4
        if 2 * r_ < min(w, d) + 3.0 and ok((cx - r_, top, cz - r_), (cx + r_, top + 1.8 + sh, cz + r_)):
            sign_on_frame(D, cx, cz, top, yaw, size, scale)
    elif theme == "billboard":
        bw = min(max(w, d) - 2.0, rng.uniform(8.0, 13.0))
        bh = bw * rng.uniform(0.4, 0.55)
        yaw = lane_yaw + rng.uniform(-0.5, 0.5)
        by = top + 2.0 + bh / 2
        r_ = bw / 2 + 0.3
        if ok((cx - r_, top, cz - r_), (cx + r_, by + bh / 2 + 0.3, cz + r_)):
            B.billboard(D, cx, by, cz, bw, bh, yaw, rng)
            for du in (-bw * 0.35, bw * 0.35):
                px_, pz_ = cx + math.cos(yaw) * du, cz - math.sin(yaw) * du
                box((D, "metal", 1), px_ - 0.12, px_ + 0.12, top, by - bh / 2, pz_ - 0.12, pz_ + 0.12, scale=0.5)
    elif theme == "shacks":
        z = iz0
        while z + 3.6 < iz1:
            sw_, sd_ = rng.uniform(3.2, min(6.4, ix1 - ix0)), rng.uniform(3.0, 4.2)
            sx0 = rng.uniform(ix0, max(ix0, ix1 - sw_))
            if z + sd_ <= iz1 and ok((sx0 - 0.3, top, z - 0.3), (sx0 + sw_ + 0.3, top + CELL_H + 0.3, z + sd_ + 0.3)):
                shack(D, sx0, sx0 + sw_, z, z + sd_, top, rng, tint)
            z += sd_ + rng.uniform(1.5, 4.0)
        if d > 7 and ok((ix0, top, iz0), (ix1, top + 2.6, iz1)):
            K.laundry(D, (ix0 + 0.3, top + 2.3, iz0 + 0.5), (ix1 - 0.3, top + 2.3, iz1 - 0.5), rng)
    elif theme == "plant":
        if ok((ix0, top, iz0), (ix1, top + 2.6, iz1)):
            box((D, "metal", 0), cx - w * 0.2, cx + w * 0.2, top, top + 2.3, cz - d * 0.18, cz + d * 0.18, scale=1.0)
            box((D, "metal", 1), ix0 + 0.4, cx - w * 0.2, top + 0.5, top + 1.1, cz - 0.3, cz + 0.3, scale=0.8)
            for k in range(int((ix1 - ix0 - 1.0) // 1.7)):
                P.place("ac_roof", ix0 + 0.9 + k * 1.7, top, iz0 + 0.7, 0.0, district=D)
            box((D, "glow", 0), cx - 0.1, cx + 0.1, top + 2.3, top + 2.5, cz - 0.1, cz + 0.1, scale=0.5, col=GLOW["red"])
    elif theme == "skylights":
        if ok((ix0, top, iz0), (ix1, top + 0.4, iz1)):
            skylights(D, ix0 + 0.5, ix1 - 0.5, cz - min(1.6, d * 0.2), cz + min(1.6, d * 0.2), top, rng)
            if d > 9:
                skylights(D, ix0 + 0.5, ix1 - 0.5, iz0 + 0.4, iz0 + 2.0, top, rng)
    elif theme == "panels":
        if ok((ix0, top, iz0), (ix1, top + 1.1, iz1)):
            panels(D, ix0 + 0.4, ix1 - 0.4, iz0 + 0.4, iz1 - 0.4, top)
    elif theme == "tank":
        if ok((cx - 1.6, top, cz - 1.6), (cx + 1.6, top + 4.5, cz + 1.6)):
            P.place("tank_roof", cx, top, cz, rng.uniform(0, 6.28), district=D)
        if w > 8 and ok((ix1 - 1.0, top, iz0), (ix1, top + 7.5, iz0 + 1.0)):
            P.place("antenna", ix1 - 0.6, top, iz0 + 0.6, rng.uniform(0, 3.1), sy=rng.uniform(0.8, 1.2), district=D)
    else:
        r_ = min(w, d) / 2 - 1.2
        if ok((cx - r_, top, cz - r_), (cx + r_, top + 0.4, cz + r_)):
            pad(D, cx, cz, top, r_, rng.choice(("cyan", "amber", "pink")))
    # Small things on most roofs, wherever the theme left room at the edge.
    if rng.random() < 0.5 and ok((ix0, top, iz1 - 1.6), (ix0 + 1.6, top + 2.2, iz1)):
        P.place("dish", ix0 + 0.8, top, iz1 - 0.8, rng.uniform(0, 6.28), district=D)
    if rng.random() < 0.4 and ok((ix1 - 1.0, top, iz1 - 1.0), (ix1, top + 7.0, iz1)):
        P.place("antenna", ix1 - 0.5, top, iz1 - 0.5, rng.uniform(0, 3.1), sy=rng.uniform(0.7, 1.1), district=D)


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
