"""Corpo Plaza from a flying car's height (ax5YUmkWf_Y@9, mH2wmyeiIpA@144):
every free stretch of the plaza's roofs carries the kit's roof plant (a
stair hut, tanks on stilts, condensers backed by ducts, turbine vents,
dishes, masts with red lamps, cable trays) and the lower roofs a planted
bed where they have room, so no roof is a plain slab of pavers; and the
towers carry tall boards and vertical signs up their faces.

Built after everything else on the roofs (plaza_roofs.roof_decks has laid
its pavers), so it sees what stands there: the plaza's geometry and props
already on a roof mark it taken. Every piece is checked against the page's
caps (plaza_blocks.checked: the Work shot's line, the hero's masses) and
left out where it would stand over one.
"""
from collections import defaultdict

from ncw.kit import *  # noqa: F401,F403
from ncw import kit as K
from ncw import buildings as B
from ncw import props as P
from ncw.districts.plaza_parts import *  # noqa: F401,F403
from ncw.districts.plaza_blocks import checked
from ncw.districts.plaza_crowns import covered, PADS

CELL = 8.0


def _stands():
    """What of the plaza's stands above some level: each face's box,
    bucketed by 8 m cells of the ground plan."""
    grid = defaultdict(list)
    for key, b in K.batches.items():
        if not (isinstance(key, tuple) and key[0] == PL):
            continue
        V = b.verts
        for f in b.faces:
            xs = [V[i][0] for i in f]
            ys = [V[i][2] for i in f]
            if max(ys) < 10.0:
                continue
            zs = [-V[i][1] for i in f]
            bb = (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))
            for i in range(int(math.floor(bb[0] / CELL)), int(math.floor(bb[1] / CELL)) + 1):
                for j in range(int(math.floor(bb[4] / CELL)), int(math.floor(bb[5] / CELL)) + 1):
                    grid[(i, j)].append(bb)
    return grid


def _free_grid(x0, x1, z0, z1, y, grid, edge=1.2):
    """1 m cells of a roof: True where nothing of the plaza's stands."""
    nx, nz = int((x1 - x0 - 2 * edge) // 1.0), int((z1 - z0 - 2 * edge) // 1.0)
    if nx < 2 or nz < 2:
        return None
    ox, oz = x0 + edge, z0 + edge
    free = [[True] * nx for _ in range(nz)]

    def mark(a0, a1, b0, b1):
        for j in range(max(0, int(math.floor(b0 - oz))), min(nz, int(math.ceil(b1 - oz)))):
            row = free[j]
            for i in range(max(0, int(math.floor(a0 - ox))), min(nx, int(math.ceil(a1 - ox)))):
                row[i] = False

    seen = set()
    for i in range(int(math.floor(x0 / CELL)), int(math.floor(x1 / CELL)) + 1):
        for j in range(int(math.floor(z0 / CELL)), int(math.floor(z1 / CELL)) + 1):
            for bb in grid.get((i, j), ()):
                if id(bb) in seen:
                    continue
                seen.add(id(bb))
                if bb[3] > y + 0.05 and bb[2] < y + 12.0 and bb[1] > x0 and bb[0] < x1 and bb[5] > z0 and bb[4] < z1:
                    mark(bb[0] - 0.3, bb[1] + 0.3, bb[4] - 0.3, bb[5] + 0.3)
    for (name, px, py, pz, yaw, sy, sxz, d) in P.INSTANCES:
        if d == PL and abs(py - y) < 0.8 and x0 - 2 < px < x1 + 2 and z0 - 2 < pz < z1 + 2:
            hx, _, hz = P.PROTOS[name]["box"]
            rr = max(hx, hz) * sxz + 0.4
            mark(px - rr, px + rr, pz - rr, pz + rr)
    for j in range(nz):
        for i in range(nx):
            if free[j][i] and covered(ox + i + 0.5, oz + j + 0.5, y):
                free[j][i] = False
    return free, ox, oz


def _fits(free, ox, oz, a0, a1, b0, b1):
    nz, nx = len(free), len(free[0])
    i0, i1 = int(math.floor(a0 - ox)), int(math.ceil(a1 - ox))
    j0, j1 = int(math.floor(b0 - oz)), int(math.ceil(b1 - oz))
    if i0 < 0 or j0 < 0 or i1 > nx or j1 > nz:
        return False
    return all(free[j][i] for j in range(j0, j1) for i in range(i0, i1))


def _take(free, ox, oz, a0, a1, b0, b1):
    for j in range(max(0, int(math.floor(b0 - oz))), min(len(free), int(math.ceil(b1 - oz)))):
        for i in range(max(0, int(math.floor(a0 - ox))), min(len(free[0]), int(math.ceil(a1 - ox)))):
            free[j][i] = False


def _largest(free):
    """The largest free rectangle of cells: (i0, i1, j0, j1)."""
    nz, nx = len(free), len(free[0])
    h = [0] * nx
    best, out = 0, None
    for j in range(nz):
        for i in range(nx):
            h[i] = h[i] + 1 if free[j][i] else 0
        stack = []
        for i in range(nx + 1):
            cur = h[i] if i < nx else 0
            start = i
            while stack and stack[-1][1] >= cur:
                s, hh = stack.pop()
                if hh * (i - s) > best:
                    best, out = hh * (i - s), (s, i, j - hh + 1, j + 1)
                start = s
            stack.append((start, cur))
    return out


# What a roof carries: (prototype, width, depth, height) at yaw 0.
KIT = {"roof_hut": (2.6, 2.5, 2.85), "roof_tank": (2.6, 2.6, 4.8), "roof_condenser": (3.6, 1.0, 1.2), "roof_duct": (4.0, 0.6, 1.1),
       "roof_vent": (0.7, 0.7, 1.0), "roof_dish": (1.8, 1.8, 2.0), "roof_mast": (0.8, 0.8, 8.2), "roof_tray": (3.0, 0.3, 0.45)}
AERIAL_LENS = (150.0, -120.0)
STEAM = []
LOG = []


def _put(name, free, ox, oz, y, r, tries=80, margin=0.4, yaws=(0.0, math.pi / 2), sy=1.0, near=None, what="roof kit"):
    w, d, h = KIT[name]
    cells = [(i, j) for j, row in enumerate(free) for i, v in enumerate(row) if v]
    if not cells:
        return None
    for _ in range(tries):
        yaw = r.choice(yaws)
        ww, dd = (w, d) if abs(math.sin(yaw)) < 0.5 else (d, w)
        if near:
            cx, cz = near[0] + r.uniform(-near[2], near[2]), near[1] + r.uniform(-near[2], near[2])
        else:
            # (A corner of the piece on a free cell, so a strip round a
            # tower is tried as often as an open roof.)
            i, j = r.choice(cells)
            cx = ox + i + r.choice((0.5 + margin + ww / 2, 0.5 - margin - ww / 2 + 1.0, 0.5))
            cz = oz + j + r.choice((0.5 + margin + dd / 2, 0.5 - margin - dd / 2 + 1.0, 0.5))
        a0, a1, b0, b1 = cx - ww / 2 - margin, cx + ww / 2 + margin, cz - dd / 2 - margin, cz + dd / 2 + margin
        if not _fits(free, ox, oz, a0, a1, b0, b1):
            continue
        top = y + h * sy + 0.3
        # (Nothing new where the hero's wet road sees the roofs.)
        if in_mirror(cx - ww / 2 - 2.0, cx + ww / 2 + 2.0, cz - dd / 2 - 2.0, cz + dd / 2 + 2.0):
            continue
        # (The Experience shot's frame passes over the north strip at 60 m.)
        if cx > 108.0 and cz < -420.0 and top > 60.0:
            continue
        try:
            checked(cx - ww / 2, cx + ww / 2, cz - dd / 2, cz + dd / 2, top, what)
        except ValueError:
            continue
        P.place(name, cx, y, cz, yaw, sy=sy, district=PL)
        _take(free, ox, oz, a0, a1, b0, b1)
        return cx, cz, yaw
    return None


def roof_kit(x0, x1, z0, z1, y, seed, grid, garden=True, masts=True):
    """Dress what is free of one roof with the kit's roof plant."""
    got = _free_grid(x0, x1, z0, z1, y, grid)
    if not got:
        return 0
    free, ox, oz = got
    area = sum(map(sum, free))
    LOG.append(f"({x0:.0f}..{x1:.0f}, {z0:.0f}..{z1:.0f}, y {y:.1f}) free {area}")
    if area < 24:
        return 0
    r = random.Random(seed)
    n = 0
    # A planted bed where a low roof has a clear stretch (the street's
    # light does not climb: the bed carries its own lamps).
    if garden and y < 50.0 and area >= 90:
        rect = _largest(free)
        if rect:
            i0, i1, j0, j1 = rect
            if (i1 - i0) >= 7 and (j1 - j0) >= 5:
                a0, a1 = ox + i0 + 0.6, ox + min(i1, i0 + 16) - 0.6
                b0, b1 = oz + j0 + 0.6, oz + min(j1, j0 + 12) - 0.6
                try:
                    if in_mirror(a0 - 2.0, a1 + 2.0, b0 - 2.0, b1 + 2.0):
                        raise ValueError("roof bed: in the hero's mirror")
                    checked(a0, a1, b0, b1, y + 4.4, "roof bed")
                    lawn(a0, a1, b0, b1, y)
                    _take(free, ox, oz, a0 - 0.6, a1 + 0.6, b0 - 0.6, b1 + 0.6)
                    n += 1
                except ValueError:
                    pass
    if area >= 90:
        n += bool(_put("roof_hut", free, ox, oz, y, r, yaws=(0.0, math.pi / 2, math.pi, -math.pi / 2)))
    for _ in range(1 + (area >= 520)):
        if area >= 140:
            n += bool(_put("roof_tank", free, ox, oz, y, r, margin=0.7))
    for _ in range(1 + (area >= 300)):
        got_c = _put("roof_condenser", free, ox, oz, y, r) if area >= 50 else None
        if got_c:
            n += 1
            cx, cz, yaw = got_c
            # The condensers' duct away from their backs.
            bx, bz = cx - math.sin(yaw) * 1.4, cz - math.cos(yaw) * 1.4
            for k in range(r.randrange(1, 4)):
                if _put("roof_duct", free, ox, oz, y, r, tries=12, margin=0.2, near=(bx + math.cos(yaw) * 4.0 * k, bz - math.sin(yaw) * 4.0 * k, 0.6),
                        yaws=(yaw,)):
                    n += 1
            STEAM.append((cx, y + 1.3, cz))
    for _ in range(min(6, int(area // 35))):
        n += bool(_put("roof_vent", free, ox, oz, y, r, margin=0.6))
    if area >= 70:
        far = math.hypot((x0 + x1) / 2 - AERIAL_LENS[0], (z0 + z1) / 2 - AERIAL_LENS[1]) > 30.0
        if masts and far and y > 25.0 and r.random() < 0.6:
            n += bool(_put("roof_mast", free, ox, oz, y, r, sy=r.choice((1.0, 1.25))))
        else:
            n += bool(_put("roof_dish", free, ox, oz, y, r, yaws=(0.0, 1.2, 2.4, 3.6, 4.8)))
    for _ in range(int(area >= 100) + int(area >= 400)):
        n += bool(_put("roof_tray", free, ox, oz, y, r, margin=0.3))
    return n


def dress_roofs(skip=(), low=()):
    grid = _stands()
    seen, total, roofs = set(), 0, 0
    for idx, (d, x0, x1, z0, z1, y) in enumerate(list(B.ROOFS)):
        key = (round(x0, 1), round(x1, 1), round(z0, 1), round(z1, 1), round(y, 1))
        if d != PL or key in seen or key in PADS or x1 - x0 < 4.0 or z1 - z0 < 4.0:
            continue
        seen.add(key)
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        if any(a0 <= cx <= a1 and b0 <= cz <= b1 for a0, a1, b0, b1 in skip + low):
            continue
        got = roof_kit(x0, x1, z0, z1, y, 9100 + idx, grid)
        if LOG and LOG[-1].startswith(f"({x0:.0f}"):
            LOG[-1] += f" got {got}"
        total += got
        roofs += got > 0
    print(f"plaza: roof kit on {roofs} roofs, {total} pieces")
    print("plaza: roofs " + "; ".join(LOG))
    for i, (x, y, z) in enumerate(STEAM[::3]):
        empty(f"anchor_steam_zz_roof_plaza_{i}", (x, y, z))


dress_roofs(skip=((80.0, 108.0, -168.0, -132.0),), low=((48.0, 108.0, -284.0, -264.0),))


# ---------------------------------------------------------------------------
# Boards up the towers' faces (mH2wmyeiIpA@144: flat screens mid face, lit
# signs up a tower). Each a tall advert the site draws, held a metre off its
# wall on struts clear of the fins, a line of light along its head and foot,
# floodlights on arms over it and a red lamp at its top corners. None west of
# x 60 (the bake runs every light there down the hero's road), none where
# the Work shot, the hero or plaza-aerial's lens would find it.
# ---------------------------------------------------------------------------
def tower_board(cx, cy, cz, w, h, yaw, seed, hue="cyan", off=1.15):
    """A board on a tower's face: (cx, cz) is the wall's plane under its
    middle, the board's face `off` out from it, facing `yaw`."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    bx_, bz_ = cx + nx * off, cz + nz * off
    screen(bx_, cy, bz_, w, h, yaw, random.Random(seed), back=False, depth=0.5)
    pl = Plane(bx_, cy, bz_, yaw)
    for v0, v1 in ((h / 2 + 0.24, h / 2 + 0.36), (-h / 2 - 0.36, -h / 2 - 0.24)):
        pl.rect((PL, "glow", 0), -w / 2 - 0.2, w / 2 + 0.2, v0, v1, dim(hue, 0.75), d=0.04)
    for u in (-w / 2 + 0.3, w / 2 - 0.3):
        for v in (-h / 2 + 0.6, 0.0, h / 2 - 0.6):
            px, py, pz = pl.at(u, v, -0.55)
            qx, _, qz = pl.at(u, v, -off)
            box((PL, "metal", 1), min(px, qx) - 0.06, max(px, qx) + 0.06, py - 0.06, py + 0.06, min(pz, qz) - 0.06, max(pz, qz) + 0.06, scale=0.5)
        lx, ly, lz = pl.at(u, h / 2 + 0.4, -0.3)
        box((PL, "glow", 1), lx - 0.15, lx + 0.15, ly, ly + 0.3, lz - 0.15, lz + 0.15, scale=0.5, col=GLOW["red"])
    n = max(2, int(w / 3.0))
    for i in range(n):
        u = -w / 2 + w * (i + 0.5) / n
        ax, ay, az = pl.at(u, h / 2 + 0.5, -0.2)
        hx, _, hz = pl.at(u, h / 2 + 0.5, 1.2)
        box((PL, "metal", 1), min(ax, hx) - 0.05, max(ax, hx) + 0.05, ay - 0.05, ay + 0.05, min(az, hz) - 0.05, max(az, hz) + 0.05, scale=0.5)
        box((PL, "neon_white", 0), hx - 0.22, hx + 0.22, ay - 0.16, ay - 0.04, hz - 0.22, hz + 0.22, scale=0.5)
    checked(min(bx_, cx) - w / 2, max(bx_, cx) + w / 2, min(bz_, cz) - w / 2, max(bz_, cz) + w / 2, cy + h / 2 + 0.8, "tower board")


def tower_blade(cx, cy, cz, w, h, along, seed, hue="cyan"):
    """A double-faced board standing straight out of a wall (`along`: the
    yaw it reaches out along), on arms at its head and foot."""
    yaw = along - math.pi / 2
    screen(cx, cy, cz, w, h, yaw, random.Random(seed), back=True, depth=0.6)
    pl = Plane(cx, cy, cz, yaw)
    for d in (0.05, -0.65):
        for v0, v1 in ((h / 2 + 0.24, h / 2 + 0.36), (-h / 2 - 0.36, -h / 2 - 0.24)):
            q = Plane(*pl.at(0.0, 0.0, d), yaw if d > 0 else yaw + math.pi)
            q.rect((PL, "glow", 0), -w / 2 - 0.2, w / 2 + 0.2, v0, v1, dim(hue, 0.75))
    # (u runs out from the wall: its arms reach back to it from u = -w/2.)
    for v in (h / 2 - 1.0, -h / 2 + 1.0, 0.0):
        px, py, pz = pl.at(-w / 2, v, -0.3)
        qx, _, qz = pl.at(-w / 2 - 0.8, v, -0.3)
        box((PL, "metal", 0), min(px, qx) - 0.1, max(px, qx) + 0.1, py - 0.12, py + 0.12, min(pz, qz) - 0.1, max(pz, qz) + 0.1, scale=0.5)
    lx, ly, lz = pl.at(w / 2, h / 2 + 0.4, -0.3)
    box((PL, "glow", 1), lx - 0.15, lx + 0.15, ly, ly + 0.3, lz - 0.15, lz + 0.15, scale=0.5, col=GLOW["red"])
    checked(cx - w, cx + w, cz - w, cz + w, cy + h / 2 + 0.8, "tower blade")


# D1: a blade out of its shaft's second step over the junction (at its
# north end: at its south end it was a third of plaza-aerial), and a board
# on its face to the square (plaza-aerial's near-blank face; the square's
# east sky).
tower_blade(152.6 - 0.75 - 1.8, 84.0, -158.6, 3.6, 21.0, -math.pi / 2, 9201, hue="yellow")
tower_board(159.5, 50.0, -164.0, 8.0, 26.0, math.pi, 9202, hue="teal", off=1.2)
# B1's tower, over its corner block's park. (D2's and D3's faces to the
# road stay as they were: the hero's wet road sees them down the deck.)
tower_board(77.0, 30.0, -150.0, 6.0, 18.0, math.pi / 2, 9203, hue="teal")
# The north quarter: T1 and T3 to the courts south of them (a flying car
# over the square sees them over the board's block), C1 to T1, T4 and B5's
# top to the x 120 road.
tower_board(67.0, 36.0, -352.0, 7.0, 24.0, 0.0, 9205, hue="amber", off=0.4)
tower_board(72.0, 39.0, -408.0, 7.0, 26.0, 0.0, 9206, hue="white", off=0.4)
tower_board(66.0, 27.0, -338.0, 7.0, 22.0, math.pi, 9207, hue="teal", off=0.4)
tower_board(104.0, 34.0, -428.0, 7.0, 22.0, math.pi / 2, 9208, hue="green", off=1.1)
tower_board(102.0, 49.6, -335.0, 5.0, 12.0, math.pi / 2, 9209, hue="teal", off=1.1)
# Columns of type up two faces to the road (the site paints the words).
big_sign("bm", 4.5, 135.2, 14.8 + 1.4 + 7.2, -149.0, -math.pi / 2, double=False)
big_sign("bl", 4.0, 104.9, 30.0 + 10.0, -386.0, math.pi / 2, double=False)


# ---------------------------------------------------------------------------
# The square's four side screens (board_1..4: the site shows the Work
# entries on them, mostly dark UI) read from the terraces and the air as
# black panels: each is now a lit fixture, a bezel of light round its
# screen, a status ticker under it, red lamps at its top corners, and on
# the two on masts floodlights on arms over it and braces back to the masts.
# (The two on the canyon's back wall, west of x 60, carry only glow: a lamp
# there runs down the hero's road. board_5..7 are the Work shot's: as built.)
# ---------------------------------------------------------------------------
SIDE_BOARDS = ((44.6, 12.0, -205.0, 9.0, 6.0, math.radians(90)), (44.6, 12.0, -228.0, 9.0, 6.0, math.radians(90)),
               (109.4, 12.0, -205.0, 9.0, 6.0, math.radians(-90)), (109.4, 12.0, -228.0, 9.0, 6.0, math.radians(-90)))
for i, hue in ((1, "cyan"), (2, "amber"), (3, "teal"), (4, "yellow")):
    cx, cy, cz, w, h, yaw = SIDE_BOARDS[i - 1]
    pl = Plane(cx, cy, cz, yaw)
    e = 0.13
    for (u0, u1, v0, v1) in ((-w / 2 - e, w / 2 + e, h / 2, h / 2 + e), (-w / 2 - e, w / 2 + e, -h / 2 - e, -h / 2),
                             (-w / 2 - e, -w / 2, -h / 2, h / 2), (w / 2, w / 2 + e, -h / 2, h / 2)):
        pl.rect((PL, "glow", 0), u0, u1, v0, v1, dim(hue, 0.8), d=0.02)
    # (The ticker: a bar of light under the frame, its status lamps.)
    pl.rect((PL, "glow", 0), -w / 2, w / 2, -h / 2 - 0.62, -h / 2 - 0.36, dim("white", 0.55), d=0.04)
    for u, lamp in ((-w / 2 + 0.25, "green"), (-w / 2 + 0.55, "green"), (w / 2 - 0.3, "amber")):
        px, py, pz = pl.at(u, -h / 2 - 0.49, 0.08)
        box((PL, "glow", 1), px - 0.06, px + 0.06, py - 0.06, py + 0.06, pz - 0.06, pz + 0.06, scale=0.5, col=GLOW[lamp])
    bx0, by0, bz0 = pl.at(-w / 2, -h / 2 - 0.7, 0.03)
    bx1, by1, bz1 = pl.at(w / 2, -h / 2 - 0.3, -0.3)
    box((PL, "board_frame", 0), min(bx0, bx1), max(bx0, bx1), by0, by1, min(bz0, bz1), max(bz0, bz1), scale=1.0)
    for u in (-w / 2 - 0.1, w / 2 + 0.1):
        lx, ly, lz = pl.at(u, h / 2 + 0.3, -0.1)
        box((PL, "glow", 1), lx - 0.12, lx + 0.12, ly, ly + 0.24, lz - 0.12, lz + 0.12, scale=0.5, col=GLOW["red"])
    if cx < 60.0:
        continue
    for u in (-w * 0.33, 0.0, w * 0.33):
        ax, ay, az = pl.at(u, h / 2 + 0.35, -0.2)
        hx, _, hz = pl.at(u, h / 2 + 0.35, 1.1)
        box((PL, "metal", 1), min(ax, hx) - 0.05, max(ax, hx) + 0.05, ay - 0.05, ay + 0.05, min(az, hz) - 0.05, max(az, hz) + 0.05, scale=0.5)
        box((PL, "neon_white", 0), hx - 0.2, hx + 0.2, ay - 0.14, ay - 0.04, hz - 0.2, hz + 0.2, scale=0.5)
        light(PL, hx, ay - 1.5, hz, "white", 3.0)
    for mz in (cz - 4.0, cz + 4.0):
        for (ya, yb) in ((9.3, 12.2), (14.7, 12.2)):
            pipe((PL, "metal", 1), (107.65, ya, mz), (109.45, yb, mz + (1.6 if mz < cz else -1.6)), 0.05, segs=4)

