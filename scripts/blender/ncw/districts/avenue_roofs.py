"""Kabuki Avenue's roofs, seen from the deck, from a roof and from the air.

From above the avenue's rows were one plateau: every lot a flat dark roof
at its street height. Behind each lot's street front, where the hero's low
lens cannot see (kit.hero_sees, with the rows' own masses in its way), the
back of the lot goes on up some storeys, so the roofs step and the lanes
are deep; and every roof is worked on (D6ia1wjO7sg@220, ARL_JWwKdDs@23),
each its own way (`fill`, below). What stands on a roof the hero looks
along is tested against its lens piece by piece, so the plate's roofline
stays as framed; the south pack's own roofs (the arm's, the south row's,
the blocks') are dressed here instead of by the kit.
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import avenue_kit as K

TIMBER = (0.12, 0.08, 0.05, 1)
AV_KEY = "avenue"


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


def panels(D, x0, x1, z0, z1, top):
    z = z0
    while z + 1.2 <= z1:
        a, b, c, d = (x0, top + 0.35, z + 1.1), (x1, top + 0.35, z + 1.1), (x1, top + 1.0, z), (x0, top + 1.0, z)
        quad((D, "glass_dark", 1), a, b, c, d)
        quad((D, "metal", 1), b, a, d, c)
        z += 1.7


QUEUE = []      # roofs the generator built for the south pack, dressed here instead
PENT = dict(windows=(0, 1, 3, 6), lit=(0.45, 0.9), warmth=(0.3, 1.0), tints=("charcoal", "navy", "teal", "plum", "brown"))


def kit_roof(gen, AVS):
    """Stands in for buildings.roof_dress while the south pack's buildings
    are built: the kit's dressing is drawn for nobody (its draws made as
    they were) and the roof is queued for `dress_queue`."""
    def roof_dress(district, x0, x1, z0, z1, top, r, cap=6.0, face=None, hero=False, sign_rate=0.35, parapet=True, tint=0):
        if district != AVS or hero:
            return gen(district, x0, x1, z0, z1, top, r, cap=cap, face=face, hero=hero, sign_rate=sign_rate, parapet=parapet, tint=tint)
        gen("void", x0, x1, z0, z1, top, r, cap=cap, face=face, hero=hero, sign_rate=sign_rate, parapet=parapet, tint=tint)
        QUEUE.append((x0, x1, z0, z1, top, tint, parapet, cap))
    return roof_dress


def dress_queue(D, seed=6400):
    """The queued roofs dressed: the arm's, the south row's, the blocks'
    behind them, the yard's shed. Each faces its street with any board."""
    rng = random.Random(seed)
    for (x0, x1, z0, z1, top, tint, parapet, cap) in QUEUE:
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        face = math.pi if cz < 42.0 and abs(cx) > 44.0 else -math.copysign(math.pi / 2, cx)
        # (All of them behind the hero's lenses: kit.hero_sees, which looks
        # every way, is not asked.)
        dress(D, x0, x1, z0, z1, top, random.Random(rng.randrange(1 << 30)), tint=tint, lane_yaw=face, parapet=parapet,
              check=False, style=PENT, deep=cap >= 4.5)


def inland(x, z):
    """Whether a pool of light on an avenue roof here stays on the roofs: off
    the lanes behind the rows, the avenue's own facades and road, the cross
    streets at either end and the deck's gap."""
    return 21.0 <= abs(x) <= 38.0 and -162.0 <= z <= -16.0 and not -92.0 < z < -68.0


def dress(D, x0, x1, z0, z1, top, rng, tint=0, lane_yaw=0.0, parapet=False, check=True, taken=(), style=None, deep=True):
    """A roof's parapet (tested piece by piece against the hero's lens when
    `check`) and what stands on it (`fill`). `tint`: an index into
    buildings.TRIM; `lane_yaw`: the way a board or sign on it turns."""
    ok = hidden if check else (lambda lo, hi: True)
    w, d = x1 - x0, z1 - z0
    if parapet:
        t = 0.3
        for (a0, a1, b0, b1) in ((x0, x1, z1 - t, z1), (x0, x1, z0, z0 + t), (x0, x0 + t, z0 + t, z1 - t), (x1 - t, x1, z0 + t, z1 - t)):
            if ok((a0, top, b0), (a1, top + 0.95, b1)):
                box((D, "trim", 0), a0, a1, top, top + 0.95, b0, b1, scale=1.5, col=B.TRIM[tint])
    if w < 4.0 or d < 4.0:
        return
    B.ROOFS.append((D, x0, x1, z0, z1, top))
    fill(D, x0, x1, z0, z1, top, rng, tint=tint, face=lane_yaw, ok=ok, taken=taken, style=style, deep=deep)


def rear(D, lots, walk, depth, style, seed=6100):
    """Behind each of the avenue's lots: its back raised some storeys where
    the hero cannot see it, and every roof the lens cannot see dressed, the
    lot's own round what the kit stands on it. `lots`: (side, z0, z1,
    height, crowned) as built."""
    for n, (s, z0, z1, h, crowned) in enumerate(lots):
        rng = random.Random(seed + n * 29)
        xa, xb = sorted((s * walk, s * (walk + depth)))
        lane_yaw = s * math.pi / 2
        lot_tint = random.Random(seed + n * 29 + 1).randrange(len(B.TRIM))
        if crowned:
            # The lot's roof round its crown (the crown's own the kit dresses).
            ia, ib = (xa + 5, xb - 3) if s > 0 else (xa + 3, xb - 5)
            taken, _ = kit_taken(AV_KEY, xa, xb, z0, z1, h)
            fill(D, xa, xb, z0, z1, h, rng, tint=lot_tint, face=lane_yaw, ok=hidden, taken=taken + [(ia - 0.4, ib + 0.4, z0 + 1.6, z1 - 1.6)], deep=False, low=True)
            # And the crown's roof, round the kit's plant on it: what the
            # air sees of the lot.
            for t in HERO_ROOFS:
                if t[0] == AV_KEY and abs(t[1] - ia) < 1e-6 and abs(t[2] - ib) < 1e-6 and abs(t[3] - (z0 + 2)) < 1e-6:
                    ctaken, _ = kit_taken(AV_KEY, t[1], t[2], t[3], t[4], t[5])
                    fill(D, t[1], t[2], t[3], t[4], t[5], rng, tint=lot_tint, face=lane_yaw, ok=hidden, taken=ctaken, deep=False, low=True)
            continue
        back = s * (walk + depth)
        front = s * (walk + rng.choice((10.0, 12.0, 14.0, 16.0)))
        x0, x1 = sorted((front, back))
        # The lamp on the street front's own roof, as it has always stood:
        # its pool lights the upper floors the hero looks up at (the bake's
        # height channel), so it stays where and as it was; its post only
        # where the hero cannot see it.
        fx, fz = s * max(21.5, (walk + abs(front)) / 2), (z0 + z1) / 2
        if inland(fx, fz):
            hue = ("white", "cyan", "amber")[n % 3]
            for dx, dz in ((0.0, 0.0), (1.5, 0.0), (-1.5, 0.0), (0.0, 1.5), (0.0, -1.5)):
                light(D, fx + dx, h + 2.0, fz + dz, hue, 9.0)
            if hidden((fx - 0.3, h, fz - 0.3), (fx + 0.3, h + 3.4, fz + 0.3)):
                box((D, "metal", 1), fx - 0.05, fx + 0.05, h, h + 3.2, fz - 0.05, fz + 0.05, scale=0.5)
                box((D, "glow", 0), fx - 0.25, fx + 0.25, h + 3.2, h + 3.3, fz - 0.25, fz + 0.25, scale=0.5, col=GLOW[hue])
        add = CELL_H * rng.choice((0, 2, 3, 3, 4, 5, 6))
        if z1 - z0 < 8.0:
            add = min(add, CELL_H * 3)
        while add > 0 and not hidden((x0 - 0.6, h, z0 - 0.3), (x1 + 0.6, h + add + 1.4, z1 + 0.3)):
            add -= CELL_H
        taken, _ = kit_taken(AV_KEY, xa, xb, z0, z1, h)
        if add > 0:
            sides = {"+x": "open", "-x": "open", "+z": "open", "-z": "open"}
            tint = rng.choice(style["tints"])
            B.building(B.Lot(x0, x1, z0, z1, "-x" if s > 0 else "+x", sides, {}, D), h + add, rng,
                       style=dict(style, balcony=0.12, ac=0.3, pipes=0.3, cornice=0.2), base=h, signs=False, roof=False, tint=tint)
            top = h + add
            dress(D, x0, x1, z0, z1, top, rng, tint=B.TINTS[tint], lane_yaw=lane_yaw, parapet=True, style=style)
            if h + add > 40 and hidden((back - s * 1.5 - 0.3, top, z0), (back - s * 1.5 + 0.3, top + 7.5, z0 + 1.2)):
                P.place("antenna", back - s * 1.5, top, z0 + 1.0, 0.0, sy=1.1, district=D)
            # The lot's own roof in front of it, round the kit's plant.
            fa, fb = sorted((s * walk, front))
            fill(D, fa, fb, z0, z1, h, rng, tint=lot_tint, face=-lane_yaw, ok=hidden, taken=[t for t in taken if t[0] < fb and t[1] > fa], deep=False, low=True)
        else:
            fill(D, xa, xb, z0, z1, h, rng, tint=lot_tint, face=lane_yaw, ok=hidden, taken=taken, style=style, low=True)


# ---------------------------------------------------------------------------
# A roof that is worked on (ARL_JWwKdDs@23, D6ia1wjO7sg@220): a walkway of
# pavers down it under lamps on posts, its felt patched in other tones, and
# either side of the walkway plant end to end, no two roofs alike: banks of
# condensers on skids with their ducts, a tank on stilts, a stair hut, a
# penthouse, cooling towers, flues, masts with red lamps, dishes, skylights,
# panels, stores, a garden, a sign on a lattice, a board on a steel frame
# with its catwalk and lamps. No line of light round the parapet.
# ---------------------------------------------------------------------------
PAVERS = ((0.4, 0.39, 0.37, 1), (0.36, 0.37, 0.39, 1), (0.42, 0.39, 0.33, 1), (0.38, 0.36, 0.4, 1))
FELT = ((0.05, 0.052, 0.058, 1), (0.1, 0.105, 0.1, 1), (0.08, 0.07, 0.06, 1), (0.13, 0.12, 0.1, 1), (0.06, 0.075, 0.085, 1), (0.11, 0.09, 0.08, 1))
GALV = (0.42, 0.43, 0.44, 1)
PAINTED = ((0.2, 0.21, 0.23, 1), (0.42, 0.17, 0.08, 1), (0.12, 0.24, 0.27, 1), (0.5, 0.36, 0.07, 1), (0.34, 0.34, 0.31, 1), (0.16, 0.26, 0.14, 1))
TANK_COLS = ((0.42, 0.42, 0.43, 1), (0.46, 0.41, 0.31, 1), (0.24, 0.3, 0.37, 1), (0.44, 0.22, 0.12, 1), (0.2, 0.32, 0.25, 1), (0.5, 0.5, 0.48, 1))
ROOF_STEAM = [0]


def lit_ok(x, z):
    """Whether a roof's lamp may light the map here. The bake is one map for
    every height, its wash ten metres wide and its height channel shared:
    a roof's pool within that of a street the hero frames (the avenue and
    the arm, the south street, the deck's gap) or of a lane would light
    that street's walls or move what its signs throw. So none there."""
    ax = abs(x)
    if ax < 25.0 and z < 92.0:
        return False
    if -21.0 < z < 23.0:
        return False
    if -94.0 < z < -66.0 and ax < 60.0:
        return False
    if 41.0 < ax < 55.0 and z < 92.0:
        return False
    if 39.0 < z < 51.0 and ax > 41.0:
        return False
    return True


def lit(D, x, y, z, hue, power):
    if lit_ok(x, z):
        light(D, x, y, z, hue, power)


def flat(D, x0, x1, z0, z1, y, mat, col, detail=0):
    quad((D, mat, detail), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0),
         uvs=((x0 / 2, -z1 / 2), (x1 / 2, -z1 / 2), (x1 / 2, -z0 / 2), (x0 / 2, -z0 / 2)), col=col)


class Roof:
    """One roof being dressed: its district, its top, its stream, what on it
    is taken, and the test each piece passes (the hero's lens)."""

    def __init__(self, D, x0, x1, z0, z1, top, rng, ok, taken=()):
        self.D, self.top, self.rng, self.ok = D, top, rng, ok
        self.x0, self.x1, self.z0, self.z1 = x0, x1, z0, z1
        self.taken = list(taken)
        self.once = set()

    def free(self, x0, x1, z0, z1):
        return all(x1 <= a0 or x0 >= a1 or z1 <= b0 or z0 >= b1 for (a0, a1, b0, b1) in self.taken)

    def claim(self, x0, x1, z0, z1, h):
        if not self.free(x0, x1, z0, z1) or not self.ok((x0, self.top, z0), (x1, self.top + h, z1)):
            return False
        self.taken.append((x0, x1, z0, z1))
        return True


def red_lamp(D, x, y, z):
    box((D, "metal", 1), x - 0.06, x + 0.06, y - 0.25, y, z - 0.06, z + 0.06, scale=0.5)
    box((D, "glow", 0), x - 0.11, x + 0.11, y, y + 0.2, z - 0.11, z + 0.11, scale=0.5, col=GLOW["red"])


def lamp_post(D, x, z, top, hue, h=3.4, arm=(0.0, 0.0), power=8.0):
    """A lamp on a post over a roof, its head on a short arm, its pool on
    the walkway under it."""
    hx, hz = x + arm[0], z + arm[1]
    box((D, "metal", 1), x - 0.05, x + 0.05, top, top + h, z - 0.05, z + 0.05, scale=0.5)
    if arm != (0.0, 0.0):
        pipe((D, "metal", 1), (x, top + h - 0.05, z), (hx, top + h - 0.05, hz), 0.03, segs=3)
    box((D, "dark", 1), hx - 0.22, hx + 0.22, top + h - 0.12, top + h + 0.02, hz - 0.16, hz + 0.16, scale=0.5)
    box((D, "glow", 0), hx - 0.18, hx + 0.18, top + h - 0.16, top + h - 0.12, hz - 0.12, hz + 0.12, scale=0.5, col=GLOW[hue])
    for dx, dz in ((0.0, 0.0), (1.4, 0.0), (-1.4, 0.0), (0.0, 1.4), (0.0, -1.4)):
        lit(D, hx + dx, top + 1.6, hz + dz, hue, power if dx == dz == 0.0 else power * 0.7)


def ac_bank(R, x0, x1, z0, z1):
    """Condensers in a row or two on a steel skid, a duct along their backs
    into a hood."""
    D, top, rng = R.D, R.top, R.rng
    along_x = x1 - x0 >= z1 - z0
    L, A = (x1 - x0, z1 - z0) if along_x else (z1 - z0, x1 - x0)
    n = max(1, min(6, int((L - 0.4) // 1.65)))
    rows = 2 if A >= 3.4 else 1
    if not R.claim(x0, x1, z0, z1, 1.8):
        return False
    col = rng.choice(PAINTED)
    box((D, "steel", 1), x0 + 0.1, x1 - 0.1, top, top + 0.16, z0 + 0.1, z1 - 0.1, scale=1.0, col=col)
    for j in range(rows):
        for k in range(n):
            u = (x0 if along_x else z0) + 0.95 + k * 1.65
            v = (z0 if along_x else x0) + 0.75 + j * 1.9
            x, z = (u, v) if along_x else (v, u)
            P.place("ac_roof", x, top + 0.16, z, 0.0 if along_x else math.pi / 2, district=D)
    # Its controller's lamps along the skid's front.
    led = GLOW[rng.choice(("green", "green", "amber", "red", "cyan"))]
    for k in range(n):
        u = (x0 if along_x else z0) + 0.95 + k * 1.65
        lx, lz = (u, z0 + 0.06) if along_x else (x0 + 0.06, u)
        box((D, "glow", 1), lx - 0.05, lx + 0.05, top + 0.05, top + 0.12, lz - 0.05, lz + 0.05, scale=0.5, col=led)
    # The duct: along the far side at knee height, up and into a hood.
    v = (z1 if along_x else x1) - 0.35
    if along_x:
        box((D, "steel", 0), x0 + 0.4, x1 - 0.9, top + 0.3, top + 0.85, v - 0.27, v + 0.27, scale=1.0, col=GALV)
        box((D, "steel", 0), x1 - 1.2, x1 - 0.3, top + 0.3, top + 1.9, v - 0.45, v + 0.27, scale=1.0, col=GALV)
        box((D, "dark", 1), x1 - 1.3, x1 - 0.2, top + 1.9, top + 2.02, v - 0.55, v + 0.35, scale=0.5)
    else:
        box((D, "steel", 0), v - 0.27, v + 0.27, top + 0.3, top + 0.85, z0 + 0.4, z1 - 0.9, scale=1.0, col=GALV)
        box((D, "steel", 0), v - 0.45, v + 0.27, top + 0.3, top + 1.9, z1 - 1.2, z1 - 0.3, scale=1.0, col=GALV)
        box((D, "dark", 1), v - 0.55, v + 0.35, top + 1.9, top + 2.02, z1 - 1.3, z1 - 0.2, scale=0.5)
    return True


def tank_stilts(R, x0, x1, z0, z1):
    """A water tank on a steel stand: four legs braced, a platform, the
    tank in rolled plate, its lid, a ladder, a red lamp."""
    D, top, rng = R.D, R.top, R.rng
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    r = min(1.6, (min(x1 - x0, z1 - z0) - 0.6) / 2)
    if r < 0.9:
        return False
    legs = rng.uniform(2.0, 3.6)
    th = rng.uniform(2.2, 3.4)
    if not R.claim(cx - r - 0.3, cx + r + 0.3, cz - r - 0.3, cz + r + 0.3, legs + th + 0.9):
        return False
    q = r * 0.72
    for lx, lz in ((-q, -q), (-q, q), (q, -q), (q, q)):
        box((D, "steel", 0), cx + lx - 0.09, cx + lx + 0.09, top, top + legs, cz + lz - 0.09, cz + lz + 0.09, scale=0.5, col=PAINTED[0])
    for (ax, az, bx, bz) in ((-q, -q, q, q), (q, -q, -q, q)):
        pipe((D, "steel", 1), (cx + ax, top + 0.3, cz + az), (cx + bx, top + legs - 0.2, cz + bz), 0.035, segs=3, col=PAINTED[0])
    box((D, "steel", 1), cx - q - 0.05, cx + q + 0.05, top + legs * 0.5, top + legs * 0.5 + 0.1, cz - q - 0.05, cz + q + 0.05, scale=0.5, col=PAINTED[0])
    box((D, "steel", 0), cx - r - 0.2, cx + r + 0.2, top + legs - 0.15, top + legs, cz - r - 0.2, cz + r + 0.2, scale=1.0, col=PAINTED[0])
    col = rng.choice(TANK_COLS)
    cylinder((D, "tankplate", 0), cx, cz, top + legs, top + legs + th, r, segs=12, col=col)
    cylinder((D, "tankplate", 1), cx, cz, top + legs + th, top + legs + th + 0.45, r * 0.55, segs=10, col=col)
    for y in (top + legs + th * 0.33, top + legs + th * 0.66):
        cylinder((D, "dark", 1), cx, cz, y, y + 0.08, r + 0.03, segs=12, cap=False)
    lx = cx + r + 0.12
    for dz in (-0.22, 0.22):
        box((D, "metal", 1), lx - 0.03, lx + 0.03, top, top + legs + th, cz + dz - 0.03, cz + dz + 0.03, scale=0.5)
    y = top + 0.4
    while y < top + legs + th:
        box((D, "metal", 1), lx - 0.025, lx + 0.025, y, y + 0.04, cz - 0.22, cz + 0.22, scale=0.5)
        y += 0.42
    red_lamp(D, cx, top + legs + th + 0.45, cz)
    box((D, "glow", 0), lx - 0.1, lx + 0.1, top + legs + th + 0.1, top + legs + th + 0.25, cz - 0.1, cz + 0.1, scale=0.5, col=GLOW["amber"])
    lit(D, cx, top + 1.0, cz, "amber", 8.0)
    return True


def hut(R, x0, x1, z0, z1, tint):
    """A stair hut: rendered block, its door lit under a caged lamp, a
    vent on its roof, a pool of light at its door."""
    D, top, rng = R.D, R.top, R.rng
    w, d = min(3.0, x1 - x0), min(2.6, z1 - z0)
    if w < 2.0 or d < 2.0:
        return False
    hx0, hz0 = x0 + (x1 - x0 - w) / 2, z0 + (z1 - z0 - d) / 2
    hx1, hz1 = hx0 + w, hz0 + d
    if not R.claim(hx0, hx1, hz0, hz1, 3.4):
        return False
    h = rng.uniform(2.6, 3.1)
    box((D, "plaster", 0), hx0, hx1, top, top + h, hz0, hz1, scale=1.5, col=tuple(min(1.0, c * 1.7) for c in B.TRIM[tint][:3]) + (1,))
    box((D, "dark", 1), hx0 - 0.12, hx1 + 0.12, top + h, top + h + 0.14, hz0 - 0.12, hz1 + 0.12, scale=1.0)
    side = rng.choice((-1, 1))
    zf = hz1 + 0.02 if side > 0 else hz0 - 0.02
    cx = (hx0 + hx1) / 2
    pts = [(cx - 0.45, top, zf), (cx + 0.45, top, zf), (cx + 0.45, top + 2.05, zf), (cx - 0.45, top + 2.05, zf)]
    if side < 0:
        pts = [pts[1], pts[0], pts[3], pts[2]]
    hue = rng.choice(("amber", "amber", "white", "cyan"))
    quad((D, "glow", 0), *pts, col=tuple(v * 0.55 for v in GLOW[hue][:3]) + (1,))
    box((D, "glow", 0), cx - 0.12, cx + 0.12, top + 2.25, top + 2.45, min(zf, zf + side * 0.16), max(zf, zf + side * 0.16), scale=0.5, col=GLOW["amber"])
    lit(D, cx, top + 1.2, zf + side * 1.2, hue, 5.0)
    cylinder((D, "steel", 1), hx0 + 0.5, hz0 + 0.5, top + h + 0.14, top + h + 0.9, 0.16, segs=6, col=GALV)
    wz = (hz0 + hz1) / 2
    quad((D, "glow", 0), (hx1 + 0.02, top + 1.3, wz + 0.4), (hx1 + 0.02, top + 1.3, wz - 0.4), (hx1 + 0.02, top + 2.0, wz - 0.4), (hx1 + 0.02, top + 2.0, wz + 0.4),
         col=tuple(v * 0.35 for v in GLOW[rng.choice(("amber", "white", "cyan"))][:3]) + (1,))
    if rng.random() < 0.5:
        K.st_face(D, K.st_id("ps"), (cx, top + h - 0.5, zf + side * 0.03), (side * 1.0, 0.0, 0.0), K.UP, 1.4, 0.62)
    return True


def cooling(R, x0, x1, z0, z1):
    """A cooling tower: a ribbed drum, its fan's grille, a pipe off it."""
    D, top, rng = R.D, R.top, R.rng
    r = min(1.3, (min(x1 - x0, z1 - z0) - 0.4) / 2)
    if r < 0.8:
        return False
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    h = rng.uniform(1.8, 2.6)
    if not R.claim(cx - r - 0.2, cx + r + 0.2, cz - r - 0.2, cz + r + 0.2, h + 0.3):
        return False
    cylinder((D, "corrugated", 0), cx, cz, top, top + h, r, segs=10, col=rng.choice(PAINTED))
    cylinder((D, "dark", 1), cx, cz, top + h, top + h + 0.25, r * 0.86, segs=10)
    cylinder((D, "metal", 1), cx, cz, top + h + 0.05, top + h + 0.3, 0.18, segs=6)
    cylinder((D, "glow", 0), cx, cz, top + h - 0.32, top + h - 0.24, r + 0.03, segs=10, cap=False,
             col=tuple(v * 0.5 for v in GLOW[rng.choice(("amber", "cyan", "white"))][:3]) + (1,))
    pipe((D, "steel", 1), (cx + r, top + 0.5, cz), (cx + r + 0.6, top + 0.5, cz), 0.14, segs=5, col=GALV)
    return True


def flues(R, x0, x1, z0, z1):
    """Vent stacks in a cluster, capped, one breathing steam now and then."""
    D, top, rng = R.D, R.top, R.rng
    if not R.claim(x0, x1, z0, z1, 4.0):
        return False
    n = rng.randrange(2, 5)
    for k in range(n):
        x, z = rng.uniform(x0 + 0.35, x1 - 0.35), rng.uniform(z0 + 0.35, z1 - 0.35)
        r, h = rng.uniform(0.12, 0.3), rng.uniform(1.2, 3.8)
        cylinder((D, "steel", 0), x, z, top, top + h, r, segs=6, col=rng.choice((GALV, PAINTED[0], PAINTED[1])))
        cylinder((D, "dark", 1), x, z, top + h + 0.12, top + h + 0.2, r * 1.6, segs=6)
        box((D, "metal", 1), x - 0.03, x + 0.03, top + h, top + h + 0.12, z - 0.03, z + 0.03, scale=0.5)
        if k == 0 and ROOF_STEAM[0] < 8 and rng.random() < 0.3:
            ROOF_STEAM[0] += 1
            empty(f"anchor_steam_avroof_{ROOF_STEAM[0]}", (x, top + h + 0.25, z))
    return True


def mast(R, x0, x1, z0, z1):
    """A lattice mast or two on the roof, guyed, red lamps up them."""
    D, top, rng = R.D, R.top, R.rng
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    sy = rng.uniform(1.0, 2.0)
    if not R.claim(cx - 0.8, cx + 0.8, cz - 0.8, cz + 0.8, 6.0 * sy + 0.3):
        return False
    P.place("antenna", cx, top, cz, rng.uniform(0, 3.1), sy=sy, district=D)
    for a in (0.4, 2.5, 4.6):
        K.cable(D, (cx, top + 6.0 * sy * 0.7, cz), (cx + math.cos(a) * 2.2, top, cz + math.sin(a) * 2.2), 0.05, steps=2)
    if sy > 1.4:
        red_lamp(D, cx + 0.1, top + 6.0 * sy * 0.5, cz)
    if rng.random() < 0.6:
        P.place("dish", cx + 0.9, top, cz - 0.6, rng.uniform(0, 6.28), district=D)
    return True


def dishes(R, x0, x1, z0, z1):
    D, top, rng = R.D, R.top, R.rng
    if not R.claim(x0, x1, z0, z1, 2.3):
        return False
    n = rng.randrange(1, 4)
    for k in range(n):
        P.place("dish", x0 + 0.8 + k * (x1 - x0 - 1.6) / max(1, n - 1) if n > 1 else (x0 + x1) / 2, top, rng.uniform(z0 + 0.8, max(z0 + 0.8, z1 - 0.8)), rng.uniform(0, 6.28), district=D)
    box((D, "steel", 0), x0 + 0.2, x0 + 0.9, top, top + 1.4, z1 - 0.8, z1 - 0.2, scale=0.5, col=rng.choice(PAINTED))
    box((D, "glow", 0), x0 + 0.4, x0 + 0.5, top + 1.1, top + 1.18, z1 - 0.83, z1 - 0.8, scale=0.5, col=GLOW["green"])
    return True


def roof_lights(R, x0, x1, z0, z1):
    """Skylights in a row: lit glazing on a dark upstand."""
    D, top, rng = R.D, R.top, R.rng
    if not R.claim(x0, x1, z0, z1, 0.6):
        return False
    along_x = x1 - x0 >= z1 - z0
    u, end = (x0 + 0.2, x1 - 0.2) if along_x else (z0 + 0.2, z1 - 0.2)
    while u + 1.4 <= end:
        if along_x:
            box((D, "trim", 1), u, u + 1.4, top, top + 0.35, z0 + 0.2, z1 - 0.2, scale=1.0, col=B.DARK_TRIM)
            quad((D, "skylight", 0), (u + 0.1, top + 0.36, z1 - 0.3), (u + 1.3, top + 0.36, z1 - 0.3), (u + 1.3, top + 0.55, z0 + 0.3), (u + 0.1, top + 0.55, z0 + 0.3),
                 col=(rng.uniform(0.2, 0.7), rng.random(), rng.random(), 1))
        else:
            box((D, "trim", 1), x0 + 0.2, x1 - 0.2, top, top + 0.35, u, u + 1.4, scale=1.0, col=B.DARK_TRIM)
            quad((D, "skylight", 0), (x0 + 0.3, top + 0.55, u + 1.3), (x1 - 0.3, top + 0.36, u + 1.3), (x1 - 0.3, top + 0.36, u + 0.1), (x0 + 0.3, top + 0.55, u + 0.1),
                 col=(rng.uniform(0.2, 0.7), rng.random(), rng.random(), 1))
        u += 2.0
    return True


def solar(R, x0, x1, z0, z1):
    D, top = R.D, R.top
    if not R.claim(x0, x1, z0, z1, 1.2):
        return False
    panels(D, x0 + 0.2, x1 - 0.2, z0 + 0.2, z1 - 0.2, top)
    return True


def stores(R, x0, x1, z0, z1):
    """What is kept on a roof: pallets, crates, drums, a tarp over a heap."""
    D, top, rng = R.D, R.top, R.rng
    if not R.claim(x0, x1, z0, z1, 1.6):
        return False
    for _ in range(rng.randrange(2, 5)):
        P.place(rng.choice(("pallets", "crates", "drum", "barrel", "crates")), rng.uniform(x0 + 0.5, x1 - 0.5), top, rng.uniform(z0 + 0.5, z1 - 0.5),
                rng.uniform(0, 3.1), district=D)
    if rng.random() < 0.5:
        tx, tz = rng.uniform(x0 + 0.8, x1 - 0.8), rng.uniform(z0 + 0.8, z1 - 0.8)
        box((D, "trim", 1), tx - 0.7, tx + 0.7, top, top + 0.7, tz - 0.55, tz + 0.55, scale=1.0, col=rng.choice(K.PLASTIC))
    return True


def garden(R, x0, x1, z0, z1):
    D, top, rng = R.D, R.top, R.rng
    if min(x1 - x0, z1 - z0) < 4.0 or not lit_ok(x0, z0) or not lit_ok(x1, z1) or not R.claim(x0, x1, z0, z1, 3.2):
        return False
    K.roof_garden(D, x0, x1, z0, z1, top, rng)
    stand((x0 + x1) / 2, z0 + 2.4, 0.0, "sit", y=top + 0.48)
    if rng.random() < 0.6:
        stand(x1 - 0.6, (z0 + z1) / 2, math.pi / 2, "lean", y=top + 0.08)
    return True


def framed_board(R, cx, cz, yaw, w):
    """A board on a steel frame over a roof, turned to a street: legs and
    braces, a catwalk along its foot with a rail, lamps on arms lighting it."""
    D, top, rng = R.D, R.top, R.rng
    h = w * rng.uniform(0.42, 0.56)
    lift = rng.uniform(2.4, 4.0)
    by = top + lift + h / 2
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    r_ = w / 2 + 0.4
    if not R.free(cx - r_, cx + r_, cz - r_, cz + r_) or not R.ok((cx - r_, top, cz - r_), (cx + r_, by + h / 2 + 0.5, cz + r_)):
        return False
    R.taken.append((cx - r_, cx + r_, cz - 1.6, cz + 1.6) if abs(rz) < 0.5 else (cx - 1.6, cx + 1.6, cz - r_, cz + r_))
    B.billboard(D, cx, by, cz, w, h, yaw, rng)
    col = rng.choice(PAINTED[:3])
    legs = [(-w * 0.42, 0), (0.0, 0), (w * 0.42, 0)] if w > 8.0 else [(-w * 0.38, 0), (w * 0.38, 0)]
    for du, _ in legs:
        px, pz = cx + rx * du - nx * 0.5, cz + rz * du - nz * 0.5
        box((D, "steel", 0), px - 0.12, px + 0.12, top, by + h / 2, pz - 0.12, pz + 0.12, scale=0.5, col=col)
        bx, bz = px - nx * 2.0, pz - nz * 2.0
        box((D, "steel", 1), bx - 0.09, bx + 0.09, top, by - h * 0.1, bz - 0.09, bz + 0.09, scale=0.5, col=col)
        pipe((D, "steel", 1), (bx, top + 0.3, bz), (px, by - h / 2, pz), 0.05, segs=3, col=col)
        pipe((D, "steel", 1), (bx, by - h * 0.1, bz), (px, by + h * 0.25, pz), 0.05, segs=3, col=col)
    for (ua, ub) in zip(legs, legs[1:]):
        a = (cx + rx * ua[0] - nx * 0.5, cz + rz * ua[0] - nz * 0.5)
        b = (cx + rx * ub[0] - nx * 0.5, cz + rz * ub[0] - nz * 0.5)
        pipe((D, "steel", 1), (a[0], top + 0.4, a[1]), (b[0], by - h / 2, b[1]), 0.04, segs=3, col=col)
        pipe((D, "steel", 1), (a[0], by - h / 2, a[1]), (b[0], top + 0.4, b[1]), 0.04, segs=3, col=col)
    # The catwalk along its foot, out in front, a rail and the lamps' arms.
    cy = by - h / 2 - 0.3
    oriented_box((D, "steel", 0), cx + nx * 0.45, cy, cz + nz * 0.45, w + 0.4, 0.08, 0.9, yaw, scale=0.5, col=PAINTED[0])
    for k in range(5 if w > 8.0 else 3):
        du = -w / 2 + (k + 0.5) * w / (5 if w > 8.0 else 3)
        ax_, az_ = cx + rx * du + nx * 0.85, cz + rz * du + nz * 0.85
        pipe((D, "metal", 1), (ax_, cy, az_), (ax_ + nx * 0.5, cy + 0.6, az_ + nz * 0.5), 0.03, segs=3)
        oriented_box((D, "glow", 0), ax_ + nx * 0.5, cy + 0.66, az_ + nz * 0.5, 0.36, 0.12, 0.2, yaw, scale=0.5, col=GLOW["white"])
    rail_y = cy + 1.0
    a, b = (cx - rx * w / 2 + nx * 0.9, cz - rz * w / 2 + nz * 0.9), (cx + rx * w / 2 + nx * 0.9, cz + rz * w / 2 + nz * 0.9)
    pipe((D, "metal", 1), (a[0], rail_y, a[1]), (b[0], rail_y, b[1]), 0.03, segs=3)
    if rng.random() < 0.5:
        for du in (-w / 2, w / 2):
            red_lamp(D, cx + rx * du, by + h / 2 + 0.25, cz + rz * du)
    return True


def penthouse(R, x0, x1, z0, z1, tint, style):
    """A storey or two built on the roof, its own windows lit, its roof
    with a little plant."""
    D, top, rng = R.D, R.top, R.rng
    hh = CELL_H * rng.choice((1, 1, 2))
    if not R.claim(x0 - 0.2, x1 + 0.2, z0 - 0.2, z1 + 0.2, hh + 1.2):
        return False
    sides = {"+x": "open", "-x": "open", "+z": "open", "-z": "open"}
    B.building(B.Lot(x0, x1, z0, z1, "+z", sides, {}, D), top + hh, rng,
               style=dict(style, balcony=0.15, ac=0.3, pipes=0.3, cornice=0.0), base=top, signs=False, roof=False, tint=tint)
    t2 = top + hh
    for (a0, a1, b0, b1) in ((x0, x1, z1 - 0.25, z1), (x0, x1, z0, z0 + 0.25), (x0, x0 + 0.25, z0, z1), (x1 - 0.25, x1, z0, z1)):
        box((D, "trim", 0), a0, a1, t2, t2 + 0.7, b0, b1, scale=1.5, col=B.TRIM[tint])
    for k in range(min(3, int((x1 - x0 - 1.0) // 1.7))):
        P.place("ac_roof", x0 + 1.0 + k * 1.7, t2, (z0 + z1) / 2, 0.0, district=D)
    if rng.random() < 0.6:
        P.place("antenna", x1 - 0.6, t2, z0 + 0.6, 0.0, sy=rng.uniform(0.6, 1.1), district=D)
    return True


def low_plant(R, x0, x1, z0, z1):
    """What lies under a parapet's height: a duct run on sleepers between
    mushroom vents, a hatch with its lamp, a cable tray."""
    D, top, rng = R.D, R.top, R.rng
    if not R.claim(x0, x1, z0, z1, 0.8):
        return False
    along_x = x1 - x0 >= z1 - z0
    c = (z0 + z1) / 2 if along_x else (x0 + x1) / 2
    if along_x:
        box((D, "steel", 0), x0 + 0.3, x1 - 0.3, top + 0.12, top + 0.62, c - 0.25, c + 0.25, scale=1.0, col=GALV)
    else:
        box((D, "steel", 0), c - 0.25, c + 0.25, top + 0.12, top + 0.62, z0 + 0.3, z1 - 0.3, scale=1.0, col=GALV)
    for t in (0.0, 1.0):
        u = (x0 + 0.3 + t * (x1 - x0 - 0.6)) if along_x else (z0 + 0.3 + t * (z1 - z0 - 0.6))
        vx, vz = (u, c + 0.7) if along_x else (c + 0.7, u)
        cylinder((D, "steel", 1), vx, vz, top, top + 0.45, 0.2, segs=6, col=GALV)
        cylinder((D, "dark", 1), vx, vz, top + 0.45, top + 0.55, 0.32, segs=6)
    hx, hz = (x0 + x1) / 2 + (0.0 if along_x else -0.9), (z0 + z1) / 2 + (-0.9 if along_x else 0.0)
    box((D, "trim", 0), hx - 0.5, hx + 0.5, top, top + 0.45, hz - 0.5, hz + 0.5, scale=1.0, col=rng.choice(PAINTED))
    box((D, "glow", 0), hx - 0.08, hx + 0.08, top + 0.45, top + 0.55, hz - 0.08, hz + 0.08, scale=0.5, col=GLOW[rng.choice(("amber", "green", "red"))])
    return True


def fill(D, x0, x1, z0, z1, top, rng, tint=None, face=None, ok=None, taken=(), style=None, deep=True, low=False):
    """Dress a roof end to end (see the note above). `tint`: its building's
    tint (an index into buildings.TRIM); `face`: the yaw a board or sign on
    it turns to; `ok`: the hero's test for each piece; `taken`: what already
    stands on it (x0, x1, z0, z1); `deep`: the roof is big enough, and far
    enough from the hero, for a penthouse or a board; `low`: a roof inside
    its parapet over every eye the hero has (all under a metre up), so
    nothing on it lower than its parapet can be seen from them whatever
    ok() says."""
    ok = ok or (lambda lo, hi: True)
    if low:
        ok_ = ok
        ok = lambda lo, hi: hi[1] <= top + 0.85 or ok_(lo, hi)  # noqa: E731
    tint = tint if tint is not None else rng.randrange(len(B.TRIM))
    w, d = x1 - x0, z1 - z0
    if w < 4.0 or d < 4.0:
        return
    R = Roof(D, x0, x1, z0, z1, top, rng, ok, taken)
    ix0, ix1, iz0, iz1 = x0 + 0.7, x1 - 0.7, z0 + 0.7, z1 - 0.7
    along_x = w >= d
    L0, L1 = (ix0, ix1) if along_x else (iz0, iz1)
    A0, A1 = (iz0, iz1) if along_x else (ix0, ix1)
    span_ = A1 - A0

    def rect(u0, u1, v0, v1):
        return (u0, u1, v0, v1) if along_x else (v0, v1, u0, u1)

    # The felt, patched: two or three sheets in other tones.
    for _ in range(rng.randrange(1, 4)):
        pu0 = rng.uniform(L0, L1 - 2.0)
        pu1 = min(L1, pu0 + rng.uniform(3.0, 9.0))
        pv0 = rng.uniform(A0, max(A0, A1 - 2.5))
        pv1 = min(A1, pv0 + rng.uniform(2.5, 6.0))
        a, b, c, e = rect(pu0, pu1, pv0, pv1)
        if ok((a, top, c), (b, top + 0.05, e)):
            flat(D, a, b, c, e, top + 0.025, "castconcrete", rng.choice(FELT), detail=1)
    # The walkway: down the middle on a wide roof, by one edge on a narrow.
    if span_ >= 8.0:
        wv = rng.uniform(A0 + span_ * 0.35, A1 - span_ * 0.35)
        walk = (wv - 0.7, wv + 0.7)
        strips = [(A0, walk[0] - 0.25), (walk[1] + 0.25, A1)]
    elif span_ >= 4.0:
        side = rng.random() < 0.5
        walk = (A0, A0 + 0.9) if side else (A1 - 0.9, A1)
        strips = [(walk[1] + 0.2, A1)] if side else [(A0, walk[0] - 0.2)]
    else:
        walk = None
        strips = [(A0, A1)]
    hue = rng.choice(("white", "white", "amber", "cyan", "amber", "pink"))
    if walk:
        a, b, c, e = rect(L0, L1, walk[0], walk[1])
        if ok((a, top, c), (b, top + 0.06, e)):
            flat(D, a, b, c, e, top + 0.04, "trim", rng.choice(PAVERS))
            # A pipe pair on sleepers along its edge.
            pv = walk[1] + 0.12
            for k, rr in enumerate((0.07, 0.05)):
                p0 = rect(L0 + 0.3, L1 - 0.3, pv + k * 0.18, pv + k * 0.18)
                pipe((D, "steel", 1), (p0[0], top + 0.2, p0[2]), (p0[1], top + 0.2, p0[3]), rr, segs=4, col=(GALV, PAINTED[1])[k])
        # A line of light let into each of its edges (and, once the plant
        # stands, paths off it across to the parapet between): the roof cut
        # into plots, its ways drawn in light from the air.
        mk = tuple(v * 0.4 for v in GLOW[rng.choice(("amber", "amber", "cyan", "white", "green", "teal"))][:3]) + (1,)
        for v in walk:
            a, b, c, e = rect(L0 + 0.3, L1 - 0.3, v - 0.04, v + 0.04)
            if ok((a, top, c), (b, top + 0.08, e)):
                flat(D, a, b, c, e, top + 0.06, "glow", mk)
        # Lamps on posts along it, every seven to ten metres, their pools on
        # it; where a post would show to the hero, a bollard lamp.
        u = L0 + rng.uniform(1.5, 3.0)
        while u < L1 - 1.0:
            v = walk[1] + 0.15 if rng.random() < 0.5 else walk[0] - 0.15
            lx, lz = (u, v) if along_x else (v, u)
            arm = (0.0, (walk[0] + walk[1]) / 2 - v) if along_x else ((walk[0] + walk[1]) / 2 - v, 0.0)
            if R.claim(lx - 0.15, lx + 0.15, lz - 0.15, lz + 0.15, 3.5):
                lamp_post(D, lx, lz, top, hue, arm=arm, power=12.0)
            elif R.claim(lx - 0.12, lx + 0.12, lz - 0.12, lz + 0.12, 0.7):
                box((D, "metal", 1), lx - 0.08, lx + 0.08, top, top + 0.55, lz - 0.08, lz + 0.08, scale=0.5)
                box((D, "glow", 0), lx - 0.1, lx + 0.1, top + 0.55, top + 0.68, lz - 0.1, lz + 0.1, scale=0.5, col=GLOW[hue])
                for dx, dz in ((0.0, 0.0), (1.2, 0.0), (-1.2, 0.0), (0.0, 1.2), (0.0, -1.2)):
                    lit(D, lx + dx, top + 0.6, lz + dz, hue, 10.0)
            u += rng.uniform(6.0, 9.0)
    # A board on a frame at one end, turned to the street, on a big roof.
    if deep and face is not None and max(w, d) > 11.0 and rng.random() < 0.4:
        bw = min(min(w, d) - 1.5, rng.uniform(7.0, 11.0))
        if bw >= 5.0:
            end = rng.choice((0, 1))
            uc = (L0 + 2.2) if end == 0 else (L1 - 2.2)
            vc = (A0 + A1) / 2
            bx, bz = (uc, vc) if along_x else (vc, uc)
            framed_board(R, bx, bz, face + rng.uniform(-0.3, 0.3), bw)
    # Either side of it, plant end to end.
    kinds = ["ac", "tank", "cool", "flues", "mast", "dishes", "skylights", "solar", "stores", "garden", "sign", "pent"]
    wts = [5.0, 2.2, 1.6, 1.8, 1.4, 1.2, 1.4, 1.0, 1.4, 0.9, 1.1, 1.2]
    hut_at = rng.randrange(len(strips))
    for si, (v0, v1) in enumerate(strips):
        sw = v1 - v0
        if sw < 1.2:
            continue
        u = L0 + rng.uniform(0.0, 1.0)
        first = True
        while u < L1 - 1.0:
            if first and si == hut_at and "hut" not in R.once and sw >= 2.0:
                kind = "hut"
            else:
                kind = rng.choices(kinds, weights=wts)[0]
            first = False
            if kind in R.once:
                kind = "ac"
            ln = {"ac": rng.choice((3.6, 5.2, 6.8, 8.4)), "tank": 3.6, "cool": 2.8, "flues": 2.0, "mast": 1.8, "dishes": 2.6,
                  "skylights": rng.choice((4.2, 6.2)), "solar": rng.choice((3.6, 5.4)), "stores": 2.6, "garden": 6.0,
                  "sign": 4.0, "pent": rng.uniform(5.0, 8.0), "hut": 3.4}[kind]
            ln = min(ln, L1 - u)
            if ln < 1.6:
                break
            # How far across the strip it reaches: plant from the strip's
            # outer edge, the rest left for walking round it.
            reach = min(sw, {"ac": 3.8, "tank": 3.6, "cool": 2.8, "flues": 1.8, "mast": 1.8, "dishes": 2.2, "skylights": 3.0,
                             "solar": 3.6, "stores": 2.4, "garden": 6.0, "sign": 3.0, "pent": 7.0, "hut": 2.8}[kind])
            outer = v0 if si == 0 and len(strips) > 1 else v1
            va, vb = (outer, outer + reach) if outer == v0 else (outer - reach, outer)
            fx0, fx1, fz0, fz1 = rect(u, u + ln, va, vb)
            done = False
            if kind == "ac":
                done = ac_bank(R, fx0, fx1, fz0, fz1)
            elif kind == "tank":
                done = tank_stilts(R, fx0, fx1, fz0, fz1)
            elif kind == "cool":
                done = cooling(R, fx0, fx1, fz0, fz1)
            elif kind == "flues":
                done = flues(R, fx0, fx1, fz0, fz1)
            elif kind == "mast":
                done = mast(R, fx0, fx1, fz0, fz1)
            elif kind == "dishes":
                done = dishes(R, fx0, fx1, fz0, fz1)
            elif kind == "skylights":
                done = roof_lights(R, fx0, fx1, fz0, fz1)
            elif kind == "solar":
                done = solar(R, fx0, fx1, fz0, fz1)
            elif kind == "stores":
                done = stores(R, fx0, fx1, fz0, fz1)
            elif kind == "garden":
                done = garden(R, fx0, fx1, fz0, fz1)
            elif kind == "hut":
                done = hut(R, fx0, fx1, fz0, fz1, tint)
            elif kind == "sign" and deep:
                size, scale = rng.choice((("pm", 2.2), ("pm", 2.8), ("ps", 3.0), ("bl", 1.5), ("bm", 2.0)))
                sw_, sh_ = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
                scx, scz = (fx0 + fx1) / 2, (fz0 + fz1) / 2
                r_ = sw_ / 2 + 0.3
                if R.claim(scx - r_, scx + r_, scz - 1.2, scz + 1.2, 1.8 + sh_):
                    sign_on_frame(D, scx, scz, top, (face or 0.0) + rng.uniform(-0.4, 0.4), size, scale)
                    done = True
            elif kind == "pent" and deep and style is not None and reach >= 4.0:
                done = penthouse(R, fx0, fx1, fz0, fz1, tint, style)
            if not done and low:
                done = (roof_lights if rng.random() < 0.45 else low_plant)(R, fx0, fx1, fz0, fz1)
            if done and kind in ("hut", "garden", "sign", "pent"):
                R.once.add(kind)
            u += (ln if done else 1.0) + rng.uniform(0.4, 1.4)
    # Paths off the walkway to the parapet, through the gaps the plant left.
    if walk:
        u = L0 + rng.uniform(1.0, 3.0)
        pc = rng.choice(PAVERS)
        while u < L1 - 1.0:
            laid = False
            for (v0, v1) in strips:
                if v1 - v0 < 1.5:
                    continue
                a, b, c, e = rect(u - 0.35, u + 0.35, v0, v1)
                if R.free(a, b, c, e) and ok((a, top, c), (b, top + 0.06, e)):
                    flat(D, a, b, c, e, top + 0.035, "trim", pc)
                    R.taken.append((a, b, c, e))
                    laid = True
            u += rng.uniform(4.0, 6.5) if laid else 0.6
    # Red lamps on the corners of a tall roof.
    if top > 22.0:
        for (cx, cz) in ((x0 + 0.15, z0 + 0.15), (x1 - 0.15, z1 - 0.15), (x0 + 0.15, z1 - 0.15), (x1 - 0.15, z0 + 0.15)):
            if rng.random() < 0.7 and ok((cx - 0.15, top, cz - 0.15), (cx + 0.15, top + 1.4, cz + 0.15)):
                red_lamp(D, cx, top + 1.15, cz)


def kit_taken(D, x0, x1, z0, z1, top):
    """Where the kit's dressing of a hero roof stands (buildings.roof_dress
    with hero=True, run after this module): its draws replayed from its
    seed, each piece's footprint (x0, x1, z0, z1) with a step round it."""
    for t in HERO_ROOFS:
        if not (t[0] == D and abs(t[1] - x0) < 1e-6 and abs(t[2] - x1) < 1e-6 and abs(t[3] - z0) < 1e-6 and abs(t[4] - z1) < 1e-6 and abs(t[5] - top) < 1e-6):
            continue
        cap = t[7]
        w, d = x1 - x0, z1 - z0
        if w < 6 or d < 6 or cap <= 0.5:
            return [], True
        fits = lambda lo, hi: not hero_covers(lo, hi)  # noqa: E731
        r = random.Random(t[6])
        nx, nz = max(1, int(w // 6.5)), max(1, int(d // 6.5))
        plots = [(x0 + 1.2 + (i + 0.5) * (w - 2.4) / nx, z0 + 1.2 + (j + 0.5) * (d - 2.4) / nz,
                  (w - 2.4) / nx, (d - 2.4) / nz) for i in range(nx) for j in range(nz)]
        r.shuffle(plots)
        out = []
        m_ = 0.35
        for k_, (px, pz, pw, pd) in enumerate(plots[:8]):
            kind = r.random()
            if k_ == 0 and cap >= 4.4 and min(pw, pd) > 3.2:
                if fits((px - 1.5, top, pz - 1.5), (px + 1.5, top + 4.4, pz + 1.5)):
                    r.uniform(0, 6.28)
                    out.append((px - 1.5 - m_, px + 1.5 + m_, pz - 1.5 - m_, pz + 1.5 + m_))
            elif k_ == 1 and min(pw, pd) > 3.0 and cap >= 2.5:
                hw_, hd_, hh_ = min(1.6, pw * 0.4), min(1.4, pd * 0.4), min(2.7, cap - 0.2)
                if not fits((px - hw_, top, pz - hd_ - 0.2), (px + hw_, top + hh_, pz + hd_ + 0.2)):
                    continue
                r.choice((-1, 1))
                out.append((px - hw_ - m_, px + hw_ + m_, pz - hd_ - 0.2 - m_ - 1.0, pz + hd_ + 0.2 + m_ + 1.0))
            elif kind < 0.4:
                n = r.randrange(1, 4)
                xs = []
                for m in range(n):
                    ax = px - pw * 0.3 + m * 1.6
                    if ax + 0.7 > px + pw / 2:
                        break
                    if fits((ax - 0.7, top, pz - 0.5), (ax + 0.7, top + 1.0, pz + 0.5)):
                        xs.append(ax)
                if xs:
                    out.append((min(xs) - 0.7 - m_, max(xs) + 0.7 + m_, pz - 0.5 - m_, pz + 0.5 + m_))
            elif kind < 0.62 and cap >= 2.4:
                pw2, pd2, ph2 = pw * 0.36, pd * 0.32, min(2.4, cap - 0.4)
                if not fits((px - pw2 - 0.1, top, pz - pd2 - 0.1), (px + pw2 + 0.1, top + ph2 + 0.12, pz + pd2 + 0.1)):
                    continue
                out.append((px - pw2 - 0.1 - m_, px + pw2 + 0.1 + m_, pz - pd2 - 0.1 - m_, pz + pd2 + 0.1 + m_))
            elif kind < 0.78 and cap >= 5.0:
                ah = min(cap, 4.5 + r.random() * 3.0)
                if fits((px - 0.7, top, pz - 0.1), (px + 0.7, top + ah + 0.2, pz + 0.1)):
                    r.uniform(0, 3.14)
                    out.append((px - 0.7 - m_, px + 0.7 + m_, pz - 0.3 - m_, pz + 0.3 + m_))
            elif kind < 0.86 and cap >= 2.2:
                if fits((px - 0.8, top, pz - 0.8), (px + 0.8, top + 2.2, pz + 0.8)):
                    r.uniform(0, 6.28)
                    out.append((px - 0.8 - m_, px + 0.8 + m_, pz - 0.8 - m_, pz + 0.8 + m_))
            elif cap >= 5.0:
                # (A sign on posts: its draws do not matter past here, the
                # roof's last plots being further signs at most.)
                out.append((px - 3.0, px + 3.0, pz - 3.0, pz + 3.0))
        return out, True
    return [], False
