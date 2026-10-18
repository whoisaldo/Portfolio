"""Kabuki Avenue's big signs off the hero's lens: the kinds the show hangs
over its streets besides blades and small boxes (review m9: "most signs are
perpendicular blades or small square boxes of similar size").

Multi-storey vertical signs flat on the arm's and the south row's upper
floors, their long edges lit (x4ztgjvfU60@18); advert drums wrapped round
the corners where the arm meets the south street (Fn9gKhU_2_Q@70's ring
screen, small); screens swung out on trusses from a corner; letters on the
arm's tall roofs. All of it south of the hero's eyes and out of the phone
hero's narrow frame (z 33 and on down the arm), in the south pack.
"""
import math

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw.districts import avenue_upper as UP
from ncw.districts import avenue_mass as M

HUES = ("pink", "cyan", "amber", "magenta", "green", "red", "purple", "teal")


def big_verticals(D, f, spans, rng, rate=0.7, clear=()):
    """On face f, over each lot's shops: now and then a vertical sign two to
    three times a blade's size flat on its upper floors, in its frame, its
    long edges lit. `spans`: (a0, a1, top) along the face (world) to each
    lot's street front's top; `clear`: stretches left alone."""
    taken = UP._taken(f)
    for (a0, a1, top) in spans:
        if rng.random() > rate:
            continue
        k = rng.choice((2.0, 2.5, 3.0))
        lo = SHOP_H + CELL_H * 0.6
        if top - 0.8 - 5.0 * k < lo:
            k = (top - 0.8 - lo) / 5.0
            if k < 1.5:
                continue
        sw, sh = 1.2 * k, 5.0 * k
        lo_a, hi_a = min(a0, a1) + sw / 2 + 0.6, max(a0, a1) - sw / 2 - 0.6
        if hi_a <= lo_a:
            continue
        for _ in range(8):
            a = rng.uniform(lo_a, hi_a)
            if any(c0 - sw < a < c1 + sw for c0, c1 in clear):
                continue
            y = rng.uniform(lo, top - 0.8 - sh)
            if all(abs(a - ta) > sw / 2 + thw + 0.15 or abs(y + sh / 2 - ty) > sh / 2 + thh + 0.15 for ta, ty, thw, thh in taken):
                M.vsign(D, f, abs(a - f.left), y, rng.choice(HUES), k=k, out=0.1)
                taken.append((a, y + sh / 2, sw / 2 + 0.3, sh / 2 + 0.3))
                break


def corner_drum(D, cx, cz, y0, rng, corner, r=2.1, h=5.0):
    """A drum of adverts round a building's corner, high over the
    pavement: three bands of screens, rings of light between, a dark
    underside with a ring of lamps, struts back to the two walls it wraps
    (`corner`: the corner (x, z); its walls run from it away from the
    drum), a lamp on a mast on top."""
    n = 30
    top = y0 + h

    def at(a, y, rr=r):
        return (cx + rr * math.cos(a), y, cz + rr * math.sin(a))
    cylinder((D, "trim", 0), cx, cz, y0, top, r - 0.05, segs=n, col=B.DARK_TRIM)
    bands = ((y0 + 0.12, y0 + 1.55), (y0 + 1.7, y0 + 3.3), (y0 + 3.45, top - 0.12))
    for bi, (ya, yb) in enumerate(bands):
        phase = bi * 0.7
        for k in range(3):
            col = (rng.randrange(8) / 8.0 + 0.01, rng.randrange(8) / 8.0 + 0.01, rng.random(), 1.0)
            for j in range(n // 3):
                lo = phase + (k * (n // 3) + j) * math.tau / n
                hi = lo + math.tau / n
                u_lo, u_hi = 1.0 - j / (n // 3), 1.0 - (j + 1) / (n // 3)
                quad((D, "billboard", 0), at(hi, ya), at(lo, ya), at(lo, yb), at(hi, yb), uvs=((u_hi, 0), (u_lo, 0), (u_lo, 1), (u_hi, 1)), col=col)
    hue_a, hue_b = rng.sample(HUES, 2)
    for yy, hue in ((y0 - 0.02, hue_a), (bands[0][1] + 0.03, hue_b), (bands[1][1] + 0.03, hue_a), (top - 0.08, hue_b)):
        cylinder((D, "neon_" + hue, 0), cx, cz, yy, yy + 0.1, r + 0.03, segs=n, cap=False)
    for i in range(n):
        a0, a1 = i * math.tau / n, (i + 1) * math.tau / n
        poly((D, "trim", 0), [(cx, y0, cz), at(a1, y0, r - 0.05), at(a0, y0, r - 0.05)], [(0.5, 0.5), (1, 0), (0, 0)], B.DARK_TRIM)
    for i in range(8):
        p = at(i * math.tau / 8, y0 - 0.03, r * 0.7)
        box((D, "glow", 0), p[0] - 0.08, p[0] + 0.08, y0 - 0.05, y0 - 0.02, p[2] - 0.08, p[2] + 0.08, scale=0.5, col=GLOW["white"])
    # Struts back to the two walls a pace from the corner.
    sx, sz = math.copysign(1.0, corner[0] - cx), math.copysign(1.0, corner[1] - cz)
    for yy in (y0 + 0.6, top - 0.6):
        pipe((D, "metal", 1), (cx, yy, cz), (corner[0], yy, corner[1] + sz * 1.5), 0.07, segs=4)
        pipe((D, "metal", 1), (cx, yy, cz), (corner[0] + sx * 1.5, yy, corner[1]), 0.07, segs=4)
    cylinder((D, "metal", 1), cx, cz, top, top + 1.8, 0.05, segs=4, cap=False)
    box((D, "glow", 0), cx - 0.1, cx + 0.1, top + 1.8, top + 2.0, cz - 0.1, cz + 0.1, scale=0.5, col=GLOW["red"])
    for k, hue in enumerate((hue_a, hue_b, "white", hue_a)):
        a = k * math.tau / 4 + 0.4
        light(D, cx + 2.6 * math.cos(a), 2.5, cz + 2.6 * math.sin(a), hue, 6.0)


def swung_screen(D, x, z, y0, w, h, yaw, rng, back):
    """A screen swung out over a street on two trusses back to a wall, a
    catwalk under it, lamps over it (the show's corner screens,
    KvMY1uzSC1E@95). (x, z): its middle; `back`: the point on the wall the
    trusses go to."""
    cy = y0 + h / 2
    B.billboard(D, x, cy, z, w, h, yaw, rng, back=True, depth=0.34)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    for du in (-w * 0.32, w * 0.32):
        px, pz = x + rx * du, z + rz * du
        for yy in (y0 + 0.4, y0 + h - 0.4):
            pipe((D, "metal", 0), (px, yy, pz), (back[0], yy, back[1]), 0.07, segs=4)
        pipe((D, "metal", 1), (px, y0 + 0.4, pz), (back[0], y0 + h - 0.4, back[1]), 0.05, segs=3)
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((D, "steel", 0), x + nx * 0.5, y0 - 0.2, z + nz * 0.5, w + 0.4, 0.08, 0.9, yaw, scale=0.5, col=(0.12, 0.12, 0.13, 1))
    for k in range(3):
        du = -w / 2 + (k + 0.5) * w / 3
        oriented_box((D, "glow", 0), x + rx * du + nx * 0.9, y0 + h + 0.35, z + rz * du + nz * 0.9, 0.4, 0.1, 0.22, yaw, scale=0.5, col=GLOW["white"])
    light(D, x + nx * 3.0, 2.5, z + nz * 3.0, rng.choice(("pink", "cyan", "amber")), 7.0)
