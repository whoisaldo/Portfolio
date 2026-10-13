"""Corpo Plaza's skyline: what a tower carries above its glass, and what a
roof shows a flying car (mH2wmyeiIpA@143, PzkEqhVByw4@86, KvMY1uzSC1E@29,
ax5YUmkWf_Y@9).

The show's corporate towers step in as they rise, hang a lit box of floors
out over the street, and end in steel: an open crown wrapped in rails of
light, a blade wall with the house's mark, a mark on a truss, a mast. Their
roofs are lit floors packed with big plant. These are those pieces: a
cantilevered box of floors (`cantilever`), a curtain wall hung on a kit
building's storeys (`reclad`: the site's office glass in place of painted
window cells, which from the air and from across a road were a checker of
flat squares), crowns (`crown_lantern`, `crown_fin`), a house's mark on a
truss (`roof_logo`), and roofs that read from the air: a floodlit deck of
pavers over every roof (`roof_decks`), cooling towers, tanks, plant houses
and landing pads drawn lit (`cooling`, `tanks`, `plant_house`, `lit_pad`).

A roof takes almost none of the street's baked light and the site's roof
material is near black, so everything here that must read from the air is
`glow` in low values: lit steel and lit concrete, not lamps.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw.districts.plaza_parts import *  # noqa: F401,F403


def fbox(f, key, s0, s1, y0, y1, w0, w1, col=(1, 1, 1, 1), scale=1.0, bottom=False):
    """Face.box with an underside."""
    pa, pb = f.p(f.at(s0), y0, w0), f.p(f.at(s1), y1, w1)
    box(key, min(pa[0], pb[0]), max(pa[0], pb[0]), y0, y1, min(pa[2], pb[2]), max(pa[2], pb[2]), scale=scale, col=col, bottom=bottom)


def cantilever(f, s0, s1, y0, y1, out, seed, accent="teal", lit=0.92, warm=0.3, tint=1):
    """A box of floors hung out of a face `f` (a buildings.Face), s0..s1
    along it: the site's office glass on three sides between a dark roof
    slab and a dark floor slab, panels of light in its soffit and a line of
    light round its foot, a steel post at each outer corner."""
    r = random.Random(seed)
    pa, pb = f.p(f.at(s0), y0, 0.0), f.p(f.at(s1), y1, out)
    f.box((PL, "corporate", 0), s0, s1, y0, y1, 0.0, out,
          col=glass_col(lit, warm, r.random(), at=(min(pa[0], pb[0]), max(pa[0], pb[0]), min(pa[2], pb[2]), max(pa[2], pb[2]))))
    f.box((PL, "trim", 0), s0 - 0.2, s1 + 0.2, y1 - 0.05, y1 + 0.4, 0.0, out + 0.2, col=B.TRIM[tint], scale=2.0)
    fbox(f, (PL, "trim", 0), s0 - 0.2, s1 + 0.2, y0 - 0.4, y0 + 0.05, 0.0, out + 0.2, col=B.TRIM[tint], scale=2.0, bottom=True)
    n = max(1, int((s1 - s0) / 3.2))
    for i in range(n):
        sa, sb = s0 + (s1 - s0) * (i + 0.18) / n, s0 + (s1 - s0) * (i + 0.82) / n
        fbox(f, (PL, "glow", 0), sa, sb, y0 - 0.44, y0 - 0.4, out * 0.25, out * 0.8, col=dim(accent if i % 2 else "white", 0.8), bottom=True)
    f.box((PL, "glow", 0), s0, s1, y0 - 0.26, y0 - 0.12, out + 0.2, out + 0.23, col=dim(accent, 0.8))
    for s in (s0, s1):
        f.box((PL, "trim", 0), s - 0.16, s + 0.16, y0, y1, out - 0.12, out + 0.14, col=B.TRIM[tint])


def reclad(x0, x1, z0, z1, y0, y1, seed, faces=("+x", "-x", "+z", "-z"), lit=0.76, warm=0.3, fin=None, every=3, k=0.25, out=0.08, tint=1,
           band=None, step=(2.2, 3.0), skip=None):
    """A curtain wall hung on a mass's faces from y0 to y1: the site's office
    glass (it resolves into floors, mullions and lit rooms), a dark band at
    its head and its foot, fins standing off it (`fin`: the colour of the
    line of light one fin in `every` carries, None for plain fins, False for
    none), `band`: a line of light under its head. `skip`: {face: [(s0, s1)]}
    stretches of a face left as they are (a screen hangs there)."""
    r = random.Random(seed)
    for name, f in B.faces_of(x0, x1, z0, z1).items():
        if name not in faces:
            continue
        gaps = sorted((skip or {}).get(name, ()))
        runs, s = [], 0.0
        for a, b in gaps:
            if a - s > 0.5:
                runs.append((s, a))
            s = b
        if f.width - s > 0.5:
            runs.append((s, f.width))
        for a, b in runs:
            n = max(1, int((b - a) / 17.0))
            for i in range(n):
                f.quad((PL, "corporate", 0), a + (b - a) * i / n, a + (b - a) * (i + 1) / n, y0, y1, out,
                       col=glass_col(min(1.0, lit * r.uniform(0.86, 1.14)), warm, r.random(), at=(x0, x1, z0, z1) if not lane_face(*f.p(f.at(a), 0, 0)[::2], *f.p(f.at(b), 0, 0)[::2]) else (44.0, 64.0, -170.0, 20.0)))
            f.box((PL, "trim", 0), a, b, y1 - 0.45, y1 + 0.05, 0.0, out + 0.22, col=B.TRIM[tint], scale=2.0)
            f.box((PL, "trim", 0), a, b, y0 - 0.05, y0 + 0.4, 0.0, out + 0.22, col=B.TRIM[tint], scale=2.0)
            if fin is not False and b - a > 3.0:
                fin_row(f, a + 0.6, b - 0.6, y0 + 0.4, y1 - 0.45, r, step=step, out=out + 0.45, lit=fin, every=every, k=k, tint=tint)
            if band:
                f.box((PL, "glow", 0), a + 0.4, b - 0.4, y1 - 0.3, y1 - 0.2, out + 0.22, out + 0.25, col=dim(band, 0.6))


# ---------------------------------------------------------------------------
# Crowns.
# ---------------------------------------------------------------------------
def crown_lantern(x0, x1, z0, z1, top, h, accent, k=0.5, rails=3, core="white"):
    """An open steel crown: posts round the roof, rails of light between
    them, a cap frame, and inside it a plant room whose roof is lit."""
    w, d = x1 - x0, z1 - z0
    nx, nz = max(1, int(round(w / 5.0))), max(1, int(round(d / 5.0)))
    posts = [(x0 + w * i / nx, z) for i in range(nx + 1) for z in (z0, z1)] + [(x, z0 + d * j / nz) for j in range(1, nz) for x in (x0, x1)]
    for px, pz in posts:
        box((PL, "metal", 0), px - 0.2, px + 0.2, top, top + h, pz - 0.2, pz + 0.2, scale=1.0)
    for (a0, a1, b0, b1) in ((x0 - 0.24, x1 + 0.24, z0 - 0.24, z0 + 0.24), (x0 - 0.24, x1 + 0.24, z1 - 0.24, z1 + 0.24),
                             (x0 - 0.24, x0 + 0.24, z0, z1), (x1 - 0.24, x1 + 0.24, z0, z1)):
        box((PL, "metal", 0), a0, a1, top + h - 0.4, top + h, b0, b1, scale=1.0)
    for i in range(rails):
        y = top + h * (i + 0.8) / (rails + 0.6)
        col = dim(accent if i % 2 == 0 else "white", k)
        for (a0, a1, b0, b1) in ((x0, x1, z0 - 0.3, z0 - 0.22), (x0, x1, z1 + 0.22, z1 + 0.3), (x0 - 0.3, x0 - 0.22, z0, z1), (x1 + 0.22, x1 + 0.3, z0, z1)):
            box((PL, "glow", 0), a0, a1, y, y + 0.32, b0, b1, scale=1.0, col=col)
    if core:
        cx0, cx1, cz0, cz1 = x0 + w * 0.2, x1 - w * 0.2, z0 + d * 0.2, z1 - d * 0.2
        box((PL, "trim", 0), cx0, cx1, top, top + h * 0.62, cz0, cz1, scale=2.0, col=B.TRIM[0])
        up_poly((PL, "glow", 0), [(cx0 + 0.3, cz0 + 0.3), (cx1 - 0.3, cz0 + 0.3), (cx1 - 0.3, cz1 - 0.3), (cx0 + 0.3, cz1 - 0.3)], top + h * 0.62 + 0.03,
                (0.1, 0.11, 0.12, 1.0))
        walls((PL, "glow", 0), [(cx0 - 0.03, cz1 + 0.03), (cx1 + 0.03, cz1 + 0.03), (cx1 + 0.03, cz0 - 0.03), (cx0 - 0.03, cz0 - 0.03)],
              top + h * 0.3, top + h * 0.36, dim(core, 0.5))
    corner_lamps(x0, x1, z0, z1, top + h)


def crown_fin(x0, x1, z0, z1, top, h, side, accent, mark=None, thick=1.1):
    """A blade wall standing over one edge of a roof (`side`: "+x", "-x",
    "+z", "-z"), taller at one end: dark steel in bays, a line of light up
    each bay's joint and along its head, the house's mark on both faces."""
    f = B.faces_of(x0, x1, z0, z1)[side]
    n = max(2, int(round(f.width / 4.0)))
    for i in range(n):
        a, b = f.width * i / n, f.width * (i + 1) / n
        hh = h * (0.62 + 0.38 * (i + 1) / n)
        f.box((PL, "trim", 0), a + 0.04, b - 0.04, top, top + hh, -thick, 0.0, col=B.TRIM[1 if i % 2 else 0], scale=2.0)
        for w in (0.0, -thick):
            pa, pb = f.p(f.at(a), 0.0, w + (0.03 if w == 0.0 else -0.03)), f.p(f.at(a + 0.08), 0.0, w)
            box((PL, "glow", 0), min(pa[0], pb[0]), max(pa[0], pb[0]), top + 0.4, top + hh - 0.3, min(pa[2], pb[2]), max(pa[2], pb[2]), scale=1.0, col=dim(accent, 0.45))
        f.box((PL, "glow", 0), a + 0.1, b - 0.1, top + hh - 0.02, top + hh + 0.1, -thick + 0.1, -0.1, col=dim(accent, 0.7))
    if mark:
        cx, _, cz = f.p(f.at(f.width * 0.6), 0.0, 0.0)
        size = min(h * 0.62, f.width * 0.3)
        emblem(mark, cx + f.nx * 0.08, top + h * 0.5, cz + f.nz * 0.08, size, f.yaw, accent)
        emblem(mark, cx - f.nx * (thick + 0.08), top + h * 0.5, cz - f.nz * (thick + 0.08), size, f.yaw + math.pi, accent)
    px, _, pz = f.p(f.at(f.width - 0.5), 0.0, -thick / 2)
    box((PL, "glow", 1), px - 0.2, px + 0.2, top + h, top + h + 0.4, pz - 0.2, pz + 0.2, scale=0.5, col=GLOW["red"])


def roof_logo(cx, cz, y, size, yaw, kind, colour, legs=2.2, back=True):
    """A house's mark standing on a roof: a dark board on a steel truss, the
    mark in light on its face (and its back), a line of light under it."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    cy = y + legs + size * 0.66
    oriented_box((PL, "board_frame", 0), cx, cy, cz, size * 1.5, size * 1.32, 0.3, yaw, scale=1.0)
    emblem(kind, cx + nx * 0.16, cy, cz + nz * 0.16, size, yaw, colour)
    if back:
        emblem(kind, cx - nx * 0.16, cy, cz - nz * 0.16, size, yaw + math.pi, colour)
    pl = Plane(cx, 0.0, cz, yaw)
    for u in (-size * 0.6, 0.0, size * 0.6):
        px, _, pz = pl.at(u, 0.0, -0.1)
        oriented_box((PL, "metal", 0), px, y + legs / 2, pz, 0.22, legs, 0.22, yaw, scale=0.5)
        bx_, _, bz_ = pl.at(u, 0.0, -size * 0.5)
        pipe((PL, "metal", 1), (bx_, y, bz_), (px, cy, pz), 0.06, segs=4)
    oriented_box((PL, "glow", 0), cx + nx * 0.17, y + legs - 0.12, cz + nz * 0.17, size * 1.5, 0.1, 0.04, yaw, scale=1.0, col=dim(colour, 0.6))


# ---------------------------------------------------------------------------
# Roofs from the air.
# ---------------------------------------------------------------------------
FLOOD = {"white": (0.78, 0.84, 1.0), "teal": (0.3, 1.0, 0.82), "amber": (1.0, 0.66, 0.3), "green": (0.36, 1.0, 0.56), "yellow": (1.0, 0.9, 0.3),
         "cyan": (0.34, 0.84, 1.0)}
NIGHT = (0.21, 0.235, 0.3)
PADS = []      # landing pads' own roofs: the decks leave them alone
STEEL_LIT = (0.085, 0.09, 0.1)


def lit_steel(k=1.0, warm=0.0):
    return (STEEL_LIT[0] * k * (1.0 + warm), STEEL_LIT[1] * k, STEEL_LIT[2] * k * (1.0 - warm), 1.0)


def covered(x, z, y):
    """Whether a mass of the plaza stands on a roof at (x, z), rising from
    its level y."""
    return any(c[0] == "box" and c[7] == PL and c[1] - 0.05 <= x <= c[2] + 0.05 and c[5] - 0.05 <= z <= c[6] + 0.05 and c[3] <= y + 0.2 < c[4] - 0.5 for c in B.COLLISION)


def roof_decks(skip=(), low=()):
    """Every flat roof of the plaza as a floor seen from the air: pavers of
    light (grey concrete under the night, brighter in a pool round each of
    its floodlight masts, each roof's pools one colour), so a roof is a lit
    deck with dark joints and not a black slab. `skip`: (x0, x1, z0, z1)
    rectangles left alone; `low`: roofs (the same) a camera looks up at from
    the south, whose masts stand seven metres back from that edge."""
    hues = ("white", "teal", "amber", "white", "green", "yellow", "white", "cyan")
    seen = set()
    for n, (d, x0, x1, z0, z1, y) in enumerate(list(B.ROOFS)):
        key = (round(x0, 1), round(x1, 1), round(z0, 1), round(z1, 1), round(y, 1))
        if d != PL or key in seen or key in PADS or x1 - x0 < 2.5 or z1 - z0 < 2.5:
            continue
        seen.add(key)
        if any(a0 <= (x0 + x1) / 2 <= a1 and b0 <= (z0 + z1) / 2 <= b1 for a0, a1, b0, b1 in skip):
            continue
        r = random.Random(8990 + n)
        shy = any(a0 <= (x0 + x1) / 2 <= a1 and b0 <= (z0 + z1) / 2 <= b1 for a0, a1, b0, b1 in low)
        hue = hues[n % len(hues)]
        cell = 4.0
        nx, nz = max(1, int(round((x1 - x0 - 0.8) / cell))), max(1, int(round((z1 - z0 - 0.8) / cell)))
        cw, cd = (x1 - x0 - 0.8) / nx, (z1 - z0 - 0.8) / nz
        # Its floodlights: one to every 180 square metres or so of open roof,
        # each on a short mast, where no tower stands.
        pools = []
        want = max(1, int((x1 - x0) * (z1 - z0) / 180.0))
        for _ in range(want * 6):
            if len(pools) >= want:
                break
            px, pz = r.uniform(x0 + 1.5, x1 - 1.5), r.uniform(z0 + 1.5, z1 - (7.0 if shy else 1.5))
            if covered(px, pz, y) or any((px - q[0]) ** 2 + (pz - q[1]) ** 2 < 64.0 for q in pools):
                continue
            pools.append((px, pz, r.uniform(5.0, 7.5), FLOOD[hue], r.uniform(0.7, 1.0)))
            box((PL, "steel", 1), px - 0.05, px + 0.05, y, y + 2.6, pz - 0.05, pz + 0.05, scale=0.5, col=STEEL_D)
            box((PL, "glow", 0), px - 0.22, px + 0.22, y + 2.6, y + 2.78, pz - 0.22, pz + 0.22, scale=0.5, col=(*FLOOD[hue], 1.0))
        for i in range(nx):
            for j in range(nz):
                xa, za = x0 + 0.4 + i * cw, z0 + 0.4 + j * cd
                if covered(xa + cw / 2, za + cd / 2, y):
                    continue
                kk = r.uniform(0.88, 1.1) * 0.2
                lit_poly((PL, "glow", 0), [(xa + 0.04, za + 0.04), (xa + cw - 0.04, za + 0.04), (xa + cw - 0.04, za + cd - 0.04), (xa + 0.04, za + cd - 0.04)],
                         y + 0.03, (kk, kk, kk), pools=pools, dark=NIGHT)


def cooling(cx, cz, y, n=2, r=1.7, h=3.4, along="x", hue="white"):
    """Cooling towers in a row on a steel frame: lit drums, a bright rim
    round each dark fan well, a red lamp at the row's end."""
    for i in range(n):
        o = (i - (n - 1) / 2) * (2 * r + 0.5)
        x, z = (cx + o, cz) if along == "x" else (cx, cz + o)
        box((PL, "steel", 0), x - r * 0.8, x + r * 0.8, y, y + 0.5, z - r * 0.8, z + r * 0.8, scale=1.0, col=STEEL_D)
        for s in range(10):
            a0, a1 = s * math.tau / 10, (s + 1) * math.tau / 10
            sh = 0.55 + 0.45 * math.cos((a0 + a1) / 2 - 0.9)
            quad((PL, "glow", 0), (x + r * math.cos(a1), y + 0.5, z + r * math.sin(a1)), (x + r * math.cos(a0), y + 0.5, z + r * math.sin(a0)),
                 (x + r * 0.86 * math.cos(a0), y + h, z + r * 0.86 * math.sin(a0)), (x + r * 0.86 * math.cos(a1), y + h, z + r * 0.86 * math.sin(a1)),
                 col=lit_steel(0.45 + 0.75 * sh))
        ring((PL, "glow", 0), x, z, r * 0.62, r * 0.88, y + h, n=10, col=(*[c * 0.3 for c in FLOOD[hue]], 1.0))
        up_poly((PL, "dark", 0), [(x + r * 0.62 * math.cos(s * math.tau / 10), z + r * 0.62 * math.sin(s * math.tau / 10)) for s in range(10)], y + h - 0.35)
    ex, ez = (cx + n * (r + 0.25), cz) if along == "x" else (cx, cz + n * (r + 0.25))
    box((PL, "glow", 1), ex - 0.14, ex + 0.14, y + h, y + h + 0.3, ez - 0.14, ez + 0.14, scale=0.5, col=GLOW["red"])


def tanks(cx, cz, y, n=3, r=1.3, h=3.6, along="x", warm=0.0):
    """Tanks standing in a row: lit steel, a pale domed head, a band, a
    pipe along their feet."""
    for i in range(n):
        o = (i - (n - 1) / 2) * (2 * r + 0.4)
        x, z = (cx + o, cz) if along == "x" else (cx, cz + o)
        for s in range(8):
            a0, a1 = s * math.tau / 8, (s + 1) * math.tau / 8
            sh = 0.5 + 0.5 * math.cos((a0 + a1) / 2 - 0.9)
            quad((PL, "glow", 0), (x + r * math.cos(a1), y, z + r * math.sin(a1)), (x + r * math.cos(a0), y, z + r * math.sin(a0)),
                 (x + r * math.cos(a0), y + h, z + r * math.sin(a0)), (x + r * math.cos(a1), y + h, z + r * math.sin(a1)), col=lit_steel(0.4 + 0.8 * sh, warm))
            up_tri((PL, "glow", 0), (x + r * math.cos(a0), y + h, z + r * math.sin(a0)), (x, y + h + r * 0.4, z), (x + r * math.cos(a1), y + h, z + r * math.sin(a1)),
                   lit_steel(1.5, warm))
        cylinder((PL, "steel", 1), x, z, y + h * 0.55, y + h * 0.62, r + 0.04, segs=8, col=STEEL_D, cap=False)
    a = (n - 1) / 2 * (2 * r + 0.4) + r
    p0, p1 = ((cx - a, y + 0.3, cz + r + 0.25), (cx + a, y + 0.3, cz + r + 0.25)) if along == "x" else ((cx + r + 0.25, y + 0.3, cz - a), (cx + r + 0.25, y + 0.3, cz + a))
    pipe((PL, "steel", 1), p0, p1, 0.12, segs=5, col=STEEL_D)


def plant_house(x0, x1, z0, z1, y, h=3.0, hue="amber", warm=0.0):
    """A plant house: louvred walls in lit steel, lines of light through the
    louvres, a pale roof with a hatch, a lit door and its light on an apron."""
    box((PL, "glow", 0), x0, x1, y, y + h, z0, z1, scale=1.0, col=lit_steel(0.62, warm))
    up_poly((PL, "glow", 0), [(x0 + 0.1, z0 + 0.1), (x1 - 0.1, z0 + 0.1), (x1 - 0.1, z1 - 0.1), (x0 + 0.1, z1 - 0.1)], y + h + 0.02, lit_steel(1.25, warm))
    box((PL, "steel", 0), x0 - 0.12, x1 + 0.12, y + h, y + h + 0.12, z0 - 0.12, z1 + 0.12, scale=1.0, col=STEEL_D)
    for yy in (y + h * 0.45, y + h * 0.62, y + h * 0.79):
        walls((PL, "glow", 1), [(x0 - 0.02, z1 + 0.02), (x1 + 0.02, z1 + 0.02), (x1 + 0.02, z0 - 0.02), (x0 - 0.02, z0 - 0.02)], yy, yy + 0.07, dim(hue, 0.5))
    mx = (x0 + x1) / 2
    box((PL, "glow", 0), mx - 0.5, mx + 0.5, y + 0.05, y + 2.1, z1, z1 + 0.04, scale=1.0, col=dim(hue, 0.8))
    up_poly((PL, "glow", 0), [(mx - 1.8, z1 + 0.05), (mx + 1.8, z1 + 0.05), (mx + 1.2, z1 + 2.4), (mx - 1.2, z1 + 2.4)], y + 0.04, (*[c * 0.16 for c in FLOOD.get(hue, FLOOD["amber"])], 1.0))
    hx = x0 + (x1 - x0) * 0.3
    box((PL, "steel", 1), hx - 0.5, hx + 0.5, y + h + 0.12, y + h + 0.5, z0 + 0.5, z0 + 1.5, scale=1.0, col=STEEL_D)


def lit_pad(cx, cz, y, r, hue="yellow", mark="H"):
    """A landing pad drawn lit: a pale deck, a wide ring and a mark in
    light, lamps round its rim turn about the pad's colour and red."""
    cylinder((PL, "concrete", 0), cx, cz, y, y + 0.45, r, segs=20)
    up_poly((PL, "glow", 0), ngon(cx, cz, r - 0.15, 20), y + 0.47, (0.07, 0.075, 0.085, 1.0))
    ring((PL, "glow", 0), cx, cz, r * 0.7, r * 0.84, y + 0.49, n=20, col=dim(hue, 0.6))
    s = r * 0.34
    bars = (((-s, -s), (-s, s)), ((s, -s), (s, s)), ((-s, 0.0), (s, 0.0))) if mark == "H" else (((-s, 0.0), (s, 0.0)), ((0.0, -s), (0.0, s)))
    for (ax, az), (bx_, bz_) in bars:
        a0, a1, b0, b1 = (ax - 0.32, ax + 0.32, az, bz_) if ax == bx_ else (ax, bx_, az - 0.32, az + 0.32)
        up_poly((PL, "glow", 0), [(cx + a0, cz + b0), (cx + a1, cz + b0), (cx + a1, cz + b1), (cx + a0, cz + b1)], y + 0.5, dim("white", 0.9))
    for i in range(16):
        a = i * math.tau / 16
        lx, lz = cx + (r - 0.3) * math.cos(a), cz + (r - 0.3) * math.sin(a)
        box((PL, "glow", 0), lx - 0.15, lx + 0.15, y + 0.45, y + 0.65, lz - 0.15, lz + 0.15, scale=0.5, col=GLOW["red" if i % 2 else hue])
    B.ROOFS.append((PL, cx - r, cx + r, cz - r, cz + r, y + 0.45))
    PADS.append((round(cx - r, 1), round(cx + r, 1), round(cz - r, 1), round(cz + r, 1), round(y + 0.45, 1)))
