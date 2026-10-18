"""The canyon's skyline from the air (mH2wmyeiIpA@32, ARL_JWwKdDs@22).

From a flying car the canyon's towers were flat-topped boxes. Behind the
hero's roofline, wherever no lens of the page's sees it (canyon_kit's
hidden_top), a tower now steps back as it rises: a setback block of storeys
on the back of its slab's roof, a second step on its crown, red beacons at
their corners, masts in clusters, and boards on frames on the roofs turned
to the traffic over the avenue.
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import canyon_kit as C
from ncw.districts import canyon_relief as REL
from ncw.districts.canyon_kit import CB

RED = GLOW["red"]


def beacons(key, x0, x1, z0, z1, y, h=0.25):
    """Red lamps at a roof's four corners."""
    for px in (x0 + 0.35, x1 - 0.35):
        for pz in (z0 + 0.35, z1 - 0.35):
            box((key, "glow", 0), px - 0.13, px + 0.13, y, y + h, pz - 0.13, pz + 0.13, scale=0.5, col=RED)


def _block(key, x0, x1, z0, z1, y0, y1, col, ov, tcol, hue, r):
    """Storeys on a roof: windows round it, a dark plant floor at its foot,
    a band of light under its parapet, its roof edged in lamps, beacons."""
    for f in B.faces_of(x0, x1, z0, z1).values():
        f.quad((key, "trim", 0), 0.0, f.width, y0, y0 + 1.2, 0.0, col=(0.012, 0.014, 0.02, 1))
        C.wall(key, f, y0 + 1.2, y1 - 0.4, col, ov)
        C.strip(key, f, 0.3, f.width - 0.3, y1 - 1.0, y1 - 0.75, hue, out=0.05)
        C.parapet(key, f, y1, tcol, h=0.7)
    C.roof(key, x0, x1, z0, z1, y1)
    C.roof_edge(key, x0 + 0.5, x1 - 0.5, z0 + 0.5, z1 - 0.5, y1, "amber" if r.random() < 0.5 else "white", every=4.2)
    beacons(key, x0, x1, z0, z1, y1 + 0.7)
    B.ROOFS.append((key, x0, x1, z0, z1, y1))
    B.COLLISION.append(("box", x0, x1, y0, y1, z0, z1, "canyon"))


def setback(U, x0, x1, zn, zs, y, occ, plaza, side, r):
    """A block of storeys stepped back on the back of a slab's roof, as tall
    as the lenses allow (six metres at least), its roof with plant, a mast
    or a board. Returns its z range, or None."""
    if x1 - x0 < 4.5 or zs - zn < 12.0:
        return None
    L = min(zs - zn - 5.0, max(11.0, (zs - zn) * r.uniform(0.45, 0.7)))
    zc = (zn + zs) / 2 + r.uniform(-0.2, 0.2) * (zs - zn - L)
    for length in (L, L * 0.7):
        z0, z1 = zc - length / 2, zc + length / 2
        top = C.hidden_top(occ, x0, x1, z0, z1, y, y + r.uniform(10.0, 20.0), plaza=plaza, step=1.0, pad=0.3, least=6.0)
        if top:
            break
    else:
        return None
    # (Its parapet and beacons stand a metre over its roof: they too stay
    # under what the lenses allow.)
    top -= 1.0
    top = y + math.floor((top - y - 1.2) / CELL_H) * CELL_H + 1.2
    hue = r.choice(("cyan", "amber", "white", "teal", "red"))
    _block(CB, x0, x1, z0, z1, y, top, B.wall_col(min(0.7, U["lit"] + 0.1), U["house"], U["warmth"], U["tint"]), U["ov"] + 7,
           B.TRIM[U["tint"]], hue, r)
    occ.append(((x0, 0.0, z0), (x1, top, z1)))
    # Its walls as a top's are (ledges, units, a strip or a board; their
    # own dice), where the lenses do not see them.
    ok = lambda lo, hi: C.hidden(occ, lo, hi, plaza=plaza)
    for i, f in enumerate(B.faces_of(x0, x1, z0, z1).values()):
        REL.tops(f, y + 1.2, top - 0.4, random.Random(int(abs(z0) * 10) + i), ok, B.TRIM[U["tint"]])
    # On its roof: plant as high as the lenses allow, and a mast or a
    # board turned to the avenue's air.
    cap = C.hidden_top(occ, x0, x1, z0, z1, top, top + 6.0, plaza=plaza, step=1.0, pad=0.2, least=1.0)
    C.roof_plant(CB, x0 + 0.6, x1 - 0.6, z0 + 0.6, z1 - 0.6, top, r, (cap - top) if cap else 0.0)
    if r.random() < 0.55:
        roof_sign(x0, x1, z0, z1, top, occ, plaza, side, r)
    else:
        mast(x0, x1, z0, z1, top, occ, plaza, r)
    print("CANYON setback", side, round(x0, 1), round(x1, 1), round(z0, 1), round(z1, 1), "from", y, "to", round(top, 1))
    return z0, z1


def mast(x0, x1, z0, z1, y, occ, plaza, r, n=None):
    """A cluster of lattice masts on a roof, each as tall as the lenses
    allow, red lamps up them."""
    n = n or r.choice((1, 2, 2, 3))
    placed = 0
    for k in range(n):
        mx = x0 + (x1 - x0) * r.uniform(0.25, 0.75)
        mz = z0 + (z1 - z0) * (k + 0.5) / n
        mtop = C.hidden_top(occ, mx - 0.5, mx + 0.5, mz - 0.5, mz + 0.5, y, y + r.uniform(9.0, 22.0), plaza=plaza, pad=0.3, least=5.0)
        if mtop:
            P.place("cy_mast", mx, y, mz, r.uniform(0, 1.5), sy=(mtop - y) / 16.3, district=CB)
            placed += 1
    return placed


def roof_sign(x0, x1, z0, z1, y, occ, plaza, side, r):
    """A large board on a lattice frame on a roof, lit, turned to the
    traffic over the avenue (and a little down it), as tall as the lenses
    allow. Says whether it stood."""
    bw = min(9.0, max(z1 - z0 - 2.0, 4.0))
    for bh in (bw * 0.5, bw * 0.38):
        lift = 1.6
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        lo_, hi_ = (cx - 1.0, y, cz - bw / 2), (cx + 1.0, y + lift + bh, cz + bw / 2)
        if C.hidden(occ, (lo_[0] - 0.3, lo_[1], lo_[2] - 0.3), (hi_[0] + 0.3, hi_[1] + 0.3, hi_[2] + 0.3), plaza):
            break
    else:
        return False
    # (Facing the avenue: toward x 0, turned a little south or north.)
    yaw = (-math.pi / 2 if side > 0 else math.pi / 2) + r.uniform(-0.35, 0.35)
    cy = y + lift + bh / 2
    C.advert(CB, CB, cx, cy, cz, bw, bh, yaw, r, depth=0.3)
    C.board_back(CB, cx, cy, cz, bw, bh, yaw, r.choice(("cyan", "amber", "yellow")), depth=0.3)
    nx, nz = math.sin(yaw), math.cos(yaw)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    for u in (-bw * 0.36, 0.0, bw * 0.36):
        lx, lz = cx + rx * u - nx * 0.5, cz + rz * u - nz * 0.5
        box((CB, "metal", 0), lx - 0.07, lx + 0.07, y, cy + bh / 2 - 0.2, lz - 0.07, lz + 0.07, scale=0.5)
        lx2, lz2 = lx - nx * 1.2, lz - nz * 1.2
        box((CB, "metal", 1), lx2 - 0.06, lx2 + 0.06, y, cy - 0.3, lz2 - 0.06, lz2 + 0.06, scale=0.5)
    # A catwalk under its face, lamps on arms lighting it from below.
    box((CB, "metal", 1), cx - bw / 2 * abs(rx) - 0.6 * abs(nx) - 0.3, cx + bw / 2 * abs(rx) + 0.6 * abs(nx) + 0.3, y + lift - 0.12, y + lift - 0.04,
        cz - bw / 2 * abs(rz) - 0.6 * abs(nz) - 0.3, cz + bw / 2 * abs(rz) + 0.6 * abs(nz) + 0.3, scale=0.5, bottom=True)
    for u in (-bw * 0.3, bw * 0.3):
        lx, lz = cx + rx * u + nx * 0.7, cz + rz * u + nz * 0.7
        box((CB, "glow", 0), lx - 0.12, lx + 0.12, y + lift - 0.05, y + lift + 0.1, lz - 0.12, lz + 0.12, scale=0.5, col=C.dim("white", 0.8))
    occ.append(((cx - 1.2, 0.0, cz - bw / 2), (cx + 1.2, cy + bh / 2, cz + bw / 2)))
    return True


def crown_step(U, side, occ, plaza, r):
    """A second step on a crown, over its half on the lane's side (the mast
    stands beside it), with its own band of light, beacons and a cluster of
    masts or a board on it."""
    cx0, cx1, cz0, cz1, ct = U["crown"]
    mx = (cx0 + cx1) / 2
    if side > 0:
        a0, a1 = mx + 1.4, cx1 - 1.6
    else:
        a0, a1 = cx0 + 1.6, mx - 1.4
    b0, b1 = cz0 + 1.6, cz1 - 1.6
    if a1 - a0 < 3.0 or b1 - b0 < 5.0:
        return
    top = C.hidden_top(occ, a0, a1, b0, b1, ct, ct + r.uniform(6.0, 12.0), plaza=plaza, step=1.0, pad=0.3, least=4.0)
    if not top:
        beacons(CB, cx0, cx1, cz0, cz1, ct + 0.05)
        return
    top -= 1.0
    hue = r.choice(("cyan", "amber", "white", "red"))
    _block(CB, a0, a1, b0, b1, ct, top, B.wall_col(min(0.75, U["lit"] + 0.15), U["house"], U["warmth"], U["tint"]), U["ov"] + 11,
           B.TRIM[U["tint"]], hue, r)
    occ.append(((a0, 0.0, b0), (a1, top, b1)))
    beacons(CB, cx0, cx1, cz0, cz1, ct + 0.05)
    if r.random() < 0.4 and b1 - b0 > 7.0:
        roof_sign(a0, a1, b0, b1, top, occ, plaza, side, r)
    else:
        mast(a0, a1, b0, b1, top, occ, plaza, r, n=2)
    print("CANYON crown step", side, round(a0, 1), round(a1, 1), round(b0, 1), round(b1, 1), "from", round(ct, 1), "to", round(top, 1))
