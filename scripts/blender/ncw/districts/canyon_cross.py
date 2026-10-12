"""What crosses the canyon: megastructure (ARL_JWwKdDs@22, x4ztgjvfU60@22).

A slab of four storeys from wall to wall in two tiers, the upper stepped
back from the lower on both faces: rows of small lit windows right across
each storey (a ribbon of amber or cyan behind mullions, a pane dark here and
there), slab edges and ribs standing out of the faces, three large screens
and two brand boards hung on each face, a step of roof behind a kerb between
the tiers, a soffit of lit coffers with trays of pipe and things hung under
it, and at each wall a heavy pier of cast concrete corbelled out over the
pavement (which runs on under it).

The first stands in the hero's eye between the megablock's roofline and the
figure's waist, and fills exactly that: far.py says what stopped it there.
The second stands behind the first in that eye, which never sees it.
"""
import math

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw.districts import canyon_kit as C
from ncw.districts import canyon_mass as M
from ncw.districts.canyon_kit import FA, CB

HULL = (0.03, 0.04, 0.065, 1)       # slate navy
CHORD = (0.016, 0.02, 0.032, 1)
MULL = (0.01, 0.012, 0.018, 1)


def ribbon(key, f, y0, y1, hue, r, pane=1.4, k=0.3, out=0.02):
    """A row of small lit windows right across a face: a ribbon of light
    behind mullions, a pane dark here and there."""
    w = f.width
    f.quad((key, "glow", 0), 0.3, w - 0.3, y0, y1, out, col=C.dim(hue, k))
    n = max(2, round((w - 0.6) / pane))
    for i in range(n + 1):
        s = 0.3 + (w - 0.6) * i / n
        dark = i < n and r.random() < 0.14
        f.quad((key, "trim", 0), s - 0.09, s + ((w - 0.6) / n - 0.09 if dark else 0.09), y0 - 0.02, y1 + 0.02, out + 0.02, col=MULL)


def _signal(key, x, y, z, hue):
    """A lane signal hung under a crossing: a dark box, an arrow of light on
    both its faces."""
    box((key, "board_frame", 0), x - 0.6, x + 0.6, y, y + 1.0, z - 0.14, z + 0.14, scale=1.0, bottom=True)
    c = GLOW[hue]
    for sg in (1, -1):
        zz = z + sg * 0.15
        pts = [(x - 0.34 * sg, y + 0.52, zz), (x, y + 0.14, zz), (x + 0.34 * sg, y + 0.52, zz)]
        poly((key, "glow", 0), pts, [(0, 0), (0.5, 1), (1, 0)], c)
        q = ((x - 0.1 * sg, y + 0.5, zz), (x + 0.1 * sg, y + 0.5, zz), (x + 0.1 * sg, y + 0.86, zz), (x - 0.1 * sg, y + 0.86, zz))
        quad((key, "glow", 0), *q, col=c)


def megastructure(zn, zs, y0, y1, r, occ, south=FA, key=CB, step=1.5, feet=(5.0, 5.0), tray=(-13.0, 13.0), drops=(), hang=None,
                  plant=0.5):
    """From wall to wall between zn and zs, its foot at y0 and its top at
    y1. `south` keys what the hero's lens sees of it (its hull and its south
    face); `key` the rest. `feet`: how low the west and east piers come.
    `tray`: the stretch of its soffit that carries pipes; `drops`: (x, how
    far it hangs, "signal" or a hue) things hung under it; `hang`: (x, how
    many) a column of small boards hung under it. `plant`: how high its
    roof's plant may stand. Returns the boxes it fills, for the lens checks."""
    x0, x1 = -WALK, WALK
    ym = (y0 + y1) / 2
    zc = (zn + zs) / 2
    box((south, "trim", 0), x0, x1, y0, ym, zn, zs, scale=2.0, col=HULL, bottom=True)
    box((south, "trim", 0), x0, x1, ym, y1, zn + step, zs - step, scale=2.0, col=HULL)
    hues = ["amber", "cyan", "yellow", "cyan", "amber", "cyan", "amber", "yellow"]
    r.shuffle(hues)
    # (s along the face from its left as the street sees it, width, height, the height of its middle over y0, True: hung on the upper tier)
    layout = {"+z": (((7.2, 7.2, 4.6, 2.9), (15.3, 4.4, 8.4, 5.9), (22.5, 5.8, 5.0, 8.3)), ((7.0, 5.4, ym - y0 + 3.5, True), (22.6, 4.2, 2.3, False))),
              "-z": (((6.4, 5.0, 8.0, 5.6), (13.9, 8.0, 4.4, 2.8), (22.4, 6.0, 5.2, 8.5)), ((14.0, 5.4, ym - y0 + 3.5, True), (22.4, 4.2, 2.3, False)))}
    for name, zl, zu, k2 in (("+z", zs, zs - step, south), ("-z", zn, zn + step, key)):
        lo, up = B.Face(name, zl, x0, x1), B.Face(name, zu, x0, x1)
        w = lo.width
        ribbon(k2, lo, y0 + 1.2, y0 + 2.7, hues.pop(), r)
        ribbon(k2, lo, y0 + 3.5, y0 + 5.0, hues.pop(), r)
        ribbon(k2, up, ym + 0.8, ym + 2.3, hues.pop(), r)
        ribbon(k2, up, ym + 3.1, ym + 4.6, hues.pop(), r)
        # The lower chord with its line of light, the slab's edge between
        # the two rows, the step's kerb; the upper tier's, and its crown.
        C.fbox((key, "trim", 0), lo, 0.0, w, y0, y0 + 0.9, 0.0, 0.4, CHORD)
        lo.quad((k2, "glow", 0), 0.3, w - 0.3, y0 + 0.3, y0 + 0.45, 0.41, col=C.dim("cyan", 0.8))
        lo.ledge((key, "trim", 0), 0.0, w, y0 + 2.95, 0.3, 0.3, CHORD)
        C.over((key, "roof", 0), lo, 0.0, w, -step, 0.0, ym + 0.02)
        lo.box((k2, "trim", 0), 0.0, w, ym, ym + 0.45, -0.2, 0.0, col=CHORD)
        up.ledge((key, "trim", 0), 0.0, w, ym + 2.56, 0.28, 0.25, CHORD)
        up.quad((k2, "glow", 0), 0.4, w - 0.4, y1 - 0.8, y1 - 0.5, 0.03, col=C.dim("white", 0.4))
        up.box((k2, "trim", 0), 0.0, w, y1, y1 + 0.25, -0.25, 0.0, col=CHORD)
        for i in range(5):
            s = w * (i + 0.5) / 5 + (1.4 if i % 2 else -1.4)
            lo.box((key, "trim", 1), s - 0.25, s + 0.25, y0 + 0.9, ym, 0.0, 0.5, col=CHORD)
            up.box((key, "trim", 1), s - 0.2, s + 0.2, ym + 0.45, y1, 0.0, 0.35, col=CHORD)
        for i in range(6):
            s = 1.5 + (w - 3.0) * i / 5
            C.over((key, "glow", 0), lo, s - 0.15, s + 0.15, -step * 0.5 - 0.15, -step * 0.5 + 0.15, ym + 0.06, GLOW["amber" if i % 2 else "cyan"])
        # Its screens, each on brackets off the lower face (the site gives
        # each board its advert by where it stands, so no two neighbours
        # show the same); its brand boards flat on the wall.
        screens, brands = layout[name]
        for s, bw, bh, dy in screens:
            yc = min(max(y0 + dy, y0 + bh / 2 + 0.25), y1 - bh / 2 - 0.3)
            cx, _, cz = lo.p(lo.at(s), yc, 0.9)
            C.advert(k2, key, cx, yc, cz, bw, bh, lo.yaw, r)
            for ds in (-bw * 0.3, bw * 0.3):
                lo.box((key, "metal", 1), s + ds - 0.06, s + ds + 0.06, max(yc - bh / 2, y0 + 0.2), min(yc + bh / 2, ym - 0.2), 0.0, 0.76)
        for s, bw, dy, upper in brands:
            f = up if upper else lo
            bh = bw * 1.2 / 2.8
            yc = y0 + dy
            f.box((key, "board_frame", 0), s - bw / 2 - 0.08, s + bw / 2 + 0.08, yc - bh / 2 - 0.08, yc + bh / 2 + 0.08, 0.0, 0.3)
            cx, _, cz = f.p(f.at(s), yc, 0.315)
            sign(st_name("pm"), cx, yc, cz, bw, bh, f.yaw, district=k2, label=False)
    # Its soffit: coffers of light in two rows, each a pool on the road; a
    # tray of pipes slung along it on hangers; and what hangs from it.
    for i, x in enumerate((-11.0, -6.6, -2.2, 2.2, 6.6, 11.0)):
        for zz in (zc - (zs - zn) * 0.24, zc + (zs - zn) * 0.24):
            hue = "white" if i % 2 else "cyan"
            box((south if zz > zc else key, "glow", 0), x - 1.4, x + 1.4, y0 - 0.05, y0, zz - 0.4, zz + 0.4, scale=0.5, col=C.dim(hue, 0.85), bottom=True)
            if i % 2 == 0 or zz > zc:
                light(key, x, y0, zz, hue, 6.5)
    for dz, rad in ((-0.5, 0.11), (-0.18, 0.08), (0.3, 0.14)):
        box((key, "metal", 1), tray[0], tray[1], y0 - 0.36, y0 - 0.36 + 2 * rad, zc + dz - rad, zc + dz + rad, scale=1.0, bottom=True)
    x = tray[0] + 1.0
    while x < tray[1]:
        box((key, "metal", 1), x - 0.04, x + 0.04, y0 - 0.42, y0, zc - 0.7, zc + 0.5, scale=0.5, bottom=True)
        x += 4.4
    boxes = [((x0, y0 - 0.45, zn - 1.0), (x1, y1 + 0.3, zs + 1.0))]
    for x, drop, kind in drops:
        box((key, "metal", 1), x - 0.04, x + 0.04, y0 - drop + 0.9, y0, zc - 0.04, zc + 0.04, scale=0.5)
        if kind == "signal":
            _signal(key, x, y0 - drop, zc, "green" if x > 0 else "amber")
        else:
            box((key, "glow", 0), x - 0.22, x + 0.22, y0 - drop, y0 - drop + 0.9, zc - 0.22, zc + 0.22, scale=0.5, col=C.dim(kind, 0.8), bottom=True)
        boxes.append(((x - 0.7, y0 - drop, zc - 0.3), (x + 0.7, y0, zc + 0.3)))
    if hang is not None:
        hx, n = hang
        yy = y0 - 0.3
        for _ in range(n):
            size = r.choice(("ps", "bx", "ps"))
            sw, sh = ST_SIZES[size]
            yy -= sh + 0.2
            box((key, "board_frame", 0), hx - sw / 2 - 0.06, hx + sw / 2 + 0.06, yy - 0.06, yy + sh + 0.06, zc - 0.07, zc + 0.07, scale=1.0)
            sid = st_name(size)
            sign(sid, hx, yy + sh / 2, zc + 0.08, sw, sh, 0.0, district=south, label=False)
            sign(sid + "_b", hx, yy + sh / 2, zc - 0.08, sw, sh, math.pi, district=key, label=False)
        box((key, "metal", 1), hx - 0.06, hx + 0.06, yy, y0, zc - 0.06, zc + 0.06, scale=0.5)
        boxes.append(((hx - 1.0, yy, zc - 0.2), (hx + 1.0, y0, zc + 0.2)))
    # Its roof: tar behind the kerb, a walk of pale slabs, strips of
    # skylight, low hatches, lamps round it and red ones at its corners.
    za, zb = zn + step, zs - step
    C.roof(key, x0, x1, za, zb, y1 + 0.005)
    if plant >= 1.6:
        C.roof_plant(key, x0 + 1.0, x1 - 1.0, za + 0.5, zb - 0.5, y1, r, plant)
    else:
        C.flat((key, "trim", 0), x0 + 0.5, x1 - 0.5, zc - 0.45, zc + 0.45, y1 + 0.03, C.PALE)
        x = x0 + 3.0
        while x < x1 - 3.0:
            for zz in (zc - (zb - za) * 0.3, zc + (zb - za) * 0.3):
                if r.random() < 0.6:
                    for k in (-1, 0, 1):
                        C.flat((key, "glow", 0), x + k * 0.7 - 0.2, x + k * 0.7 + 0.2, zz - 0.5, zz + 0.5, y1 + 0.14, C.dim(r.choice(("white", "amber", "cyan")), 0.5))
                    box((key, "trim", 1), x - 1.05, x + 1.05, y1, y1 + 0.13, zz - 0.6, zz + 0.6, scale=1.0, col=B.TRIM[5])
                else:
                    box((key, "trim", 0), x - 0.5, x + 0.5, y1, y1 + min(plant, 0.4), zz - 0.5, zz + 0.5, scale=1.0, col=B.TRIM[5])
            x += 4.6
    C.roof_edge(key, x0 + 0.6, x1 - 0.6, za + 0.5, zb - 0.5, y1, "amber", every=4.0)
    for x in (x0 + 0.6, x1 - 0.6):
        for zz in (za + 0.2, zb - 0.2):
            box((south if zz > zc else key, "glow", 0), x - 0.12, x + 0.12, y1 + 0.25, y1 + 0.45, zz - 0.12, zz + 0.12, scale=0.5, col=GLOW["red"])
    # The piers: cast concrete corbelled off each wall from over head height
    # (the pavement runs on under them), as far out as the hero's picture
    # allows, a pilaster under each end, a lit soffit, a line of light up
    # the face, signs up one edge, a poster on the cheek the street meets.
    for side, foot in zip((-1, 1), feet):
        f = B.Face("+x" if side < 0 else "-x", side * WALK, zn - 1.0, zs + 1.0)
        w = f.width
        # (Where the full pier would stand across something the hero
        # frames, a slim one.)
        out = M._most(occ, f, 0.0, w, foot, y0, 2.2) or M._most(occ, f, 0.0, w, foot, y0, 0.75)
        print("CANYON pier", side, "z", zn, zs, "foot", foot, "out", out)
        if out < 0.5:
            continue
        C.fbox((key, "castconcrete", 0), f, 0.0, w, foot, y0 + 0.9, 0.0, out, M.CONC)
        boxes.append(M.box_of(f, 0.0, w, foot, y0, 0.0, out))
        y = foot + 6.0
        while y < y0 - 2.0:
            f.ledge((key, "castconcrete", 1), 0.0, w, y, 0.3, out + 0.14, M.CONC)
            y += 6.8
        if foot < 8.0:
            for s in (0.0, w - 0.6):
                f.box((key, "castconcrete", 0), s, s + 0.6, 0.0, foot, 0.0, 0.4, col=M.CONC)
            for s in (w * 0.25, w * 0.75):
                C.under((key, "glow", 0), f, s - 1.0, s + 1.0, out * 0.3, out * 0.3 + 0.3, foot - 0.015, C.dim("white", 0.8))
                light(key, *f.p(f.at(s), foot - 0.6, out * 0.5), "white", 4.0)
        f.quad((key, "glow", 0), w / 2 - 0.09, w / 2 + 0.09, foot + 0.8, y0 - 0.5, out + 0.02, col=C.dim("cyan", 0.6))
        n = max(2, min(5, int((y0 - foot - 3.0) / 1.9)))
        for i in range(n):
            yc = foot + 2.2 + i * 1.75
            cx, _, cz = f.p(f.at(1.5), yc, out + 0.03)
            sign(st_name("bx"), cx, yc, cz, 1.5, 1.5, f.yaw, district=key, label=False)
        # (Its cheeks: a poster on each, lit from over it.)
        for zz, yaw in ((zs + 1.0, 0.0), (zn - 1.0, math.pi)):
            if out >= 1.6:
                cx = side * (WALK - out / 2)
                B.billboard(key, cx, foot + 3.2, zz + (0.1 if yaw == 0.0 else -0.1), out - 0.5, 3.0, yaw, r, frame=True, back=False, depth=0.08)
                box((key, "glow", 0), cx - 0.4, cx + 0.4, foot + 4.95, foot + 5.05, min(zz, zz + (0.3 if yaw == 0.0 else -0.3)), max(zz, zz + (0.3 if yaw == 0.0 else -0.3)),
                    scale=0.5, col=C.dim("white", 0.8), bottom=True)
    return boxes
