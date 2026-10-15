"""What stands on the Afterlife Block's roofs.

The rooftop, the braindance's cameras and a flying car look down on every
roof here, so each is worked like a floor: banks of condensers on skids
(the kit's roof unit, instanced), ducts on legs, painted pipes on sleepers,
cable trays, sheds with a lit door and window, solar panes, washing lines,
hatches, tanks, dishes, stacks of pallets, and a lamp every few metres with its
pool on the deck (afterlife_kit.pool: the site's own light on a low roof, a
drawn pool on a high one). Built from the kit's primitives
in materials this district's pack already carries.
"""
import math

from ncw.kit import *  # noqa: F401,F403
from ncw import props as P
from ncw.districts import afterlife_kit as K

SKID = (0.085, 0.09, 0.1, 1)
DUCT = (0.21, 0.22, 0.235, 1)         # galvanised sheet
SHED = [(0.13, 0.05, 0.03, 1), (0.04, 0.085, 0.11, 1), (0.1, 0.1, 0.095, 1), (0.045, 0.08, 0.055, 1), (0.12, 0.09, 0.03, 1)]
CLOTH = [(0.5, 0.48, 0.42, 1), (0.3, 0.06, 0.07, 1), (0.07, 0.17, 0.3, 1), (0.42, 0.3, 0.06, 1), (0.1, 0.25, 0.14, 1), (0.34, 0.12, 0.3, 1)]


def _axes(yaw):
    """A yaw's right (along a row) and front, on the ground."""
    return (math.cos(yaw), -math.sin(yaw)), (math.sin(yaw), math.cos(yaw))


def lamp(D, x, z, y, hue, h=2.4, power=6.0):
    """A bulkhead lamp on a post, and its pool on the deck."""
    cylinder((D, "metal", 1), x, z, y, y + h, 0.04, segs=4)
    box((D, "glow", 0), x - 0.11, x + 0.11, y + h, y + h + 0.16, z - 0.11, z + 0.11, scale=0.5, col=GLOW[hue])
    K.pool(D, x, z, y, hue, power)


def bank(D, x, z, y, n, yaw, rng):
    """A bank of n condensers in a row on a steel skid, a header pipe behind
    them, a status lamp on every other one."""
    (rx, rz), (nx, nz) = _axes(yaw)
    length = n * 1.6
    for side in (-0.4, 0.4):
        oriented_box((D, "steel", 1), x + nx * side, y + 0.06, z + nz * side, length + 0.3, 0.12, 0.1, yaw, col=SKID)
    for i in range(n):
        u = (i - (n - 1) / 2) * 1.6
        P.place("ac_roof", x + rx * u, y + 0.12, z + rz * u, yaw, district=D)
        if i % 2 == 0:
            rotated_quad((D, "glow", 1), x + rx * (u + 0.5) + nx * 0.51, y + 0.85, z + rz * (u + 0.5) + nz * 0.51, 0.1, 0.1, yaw,
                         col=GLOW[rng.choice(("green", "amber", "red"))])
    a = (x - rx * length / 2 - nx * 0.72, y + 0.55, z - rz * length / 2 - nz * 0.72)
    b = (x + rx * length / 2 - nx * 0.72, y + 0.55, z + rz * length / 2 - nz * 0.72)
    pipe((D, "steel", 1), a, b, 0.06, segs=5, col=rng.choice(K.PIPE_PAINT))
    pipe((D, "steel", 1), b, (b[0], y, b[2]), 0.06, segs=5, col=K.PIPE_PAINT[0])


def duct(D, a, b, y, rng, w=0.6, h=0.45, lift=0.35):
    """A sheet duct across a roof from a to b (x, z; square to the walls),
    on legs, flanged every length, dropping into the roof at a and ending
    in a cowl at b."""
    (xa, za), (xb, zb) = a, b
    along_x = abs(xb - xa) >= abs(zb - za)
    y0, y1 = y + lift, y + lift + h
    if along_x:
        box((D, "steel", 0), min(xa, xb), max(xa, xb), y0, y1, za - w / 2, za + w / 2, scale=1.0, col=DUCT, bottom=True)
    else:
        box((D, "steel", 0), xa - w / 2, xa + w / 2, y0, y1, min(za, zb), max(za, zb), scale=1.0, col=DUCT, bottom=True)
    length = abs(xb - xa) if along_x else abs(zb - za)
    n = max(2, int(length / 2.2))
    for i in range(n + 1):
        t = i / n
        px, pz = xa + (xb - xa) * t, za + (zb - za) * t
        hx, hz = (0.03, w / 2 + 0.03) if along_x else (w / 2 + 0.03, 0.03)
        box((D, "dark", 1), px - hx, px + hx, y0 - 0.03, y1 + 0.03, pz - hz, pz + hz, scale=1.0)
        if 0 < i < n or n == 2:
            for sd in (-1, 1):
                lx, lz = (px, pz + sd * (w / 2 - 0.05)) if along_x else (px + sd * (w / 2 - 0.05), pz)
                box((D, "dark", 1), lx - 0.03, lx + 0.03, y, y0, lz - 0.03, lz + 0.03, scale=1.0)
    box((D, "steel", 0), xa - w / 2, xa + w / 2, y, y0, za - w / 2, za + w / 2, scale=1.0, col=DUCT)
    box((D, "steel", 0), xb - w * 0.42, xb + w * 0.42, y1, y1 + 0.3, zb - w * 0.42, zb + w * 0.42, scale=1.0, col=DUCT)
    box((D, "dark", 1), xb - w * 0.6, xb + w * 0.6, y1 + 0.3, y1 + 0.38, zb - w * 0.6, zb + w * 0.6, scale=1.0, bottom=True)


def pipes(D, a, b, y, rng, n=3, loop=True):
    """Painted pipes across a roof on sleepers, one of them with an
    expansion loop standing up out of the run."""
    (xa, za), (xb, zb) = a, b
    length = math.hypot(xb - xa, zb - za)
    ux, uz = (xb - xa) / length, (zb - za) / length
    px, pz = -uz, ux
    off = -(n - 1) * 0.13
    for k in range(n):
        rad = rng.choice((0.05, 0.07, 0.09))
        o = off + k * 0.26
        col = rng.choice(K.PIPE_PAINT)
        p0, p1 = (xa + px * o, y + 0.22 + rad, za + pz * o), (xb + px * o, y + 0.22 + rad, zb + pz * o)
        if loop and k == n - 1 and length > 3.0:
            t = rng.uniform(0.35, 0.65)
            m0 = (xa + ux * (length * t - 0.5) + px * o, p0[1], za + uz * (length * t - 0.5) + pz * o)
            m1 = (xa + ux * (length * t + 0.5) + px * o, p0[1], za + uz * (length * t + 0.5) + pz * o)
            pipe((D, "steel", 1), p0, m0, rad, segs=5, col=col)
            pipe((D, "steel", 1), m1, p1, rad, segs=5, col=col)
            for q in (m0, m1):
                pipe((D, "steel", 1), q, (q[0], q[1] + 0.8, q[2]), rad, segs=5, col=col)
            pipe((D, "steel", 1), (m0[0], m0[1] + 0.8, m0[2]), (m1[0], m1[1] + 0.8, m1[2]), rad, segs=5, col=col)
        else:
            pipe((D, "steel", 1), p0, p1, rad, segs=5, col=col)
    for i in range(max(2, int(length / 2.0)) + 1):
        t = i / max(2, int(length / 2.0))
        oriented_box((D, "dark", 1), xa + (xb - xa) * t, y + 0.11, za + (zb - za) * t, n * 0.26 + 0.3, 0.22, 0.14, math.atan2(ux, uz), scale=1.0)


def tray(D, a, b, y, rng):
    """A cable tray across a roof on short stands, its cables in it."""
    (xa, za), (xb, zb) = a, b
    length = math.hypot(xb - xa, zb - za)
    ux, uz = (xb - xa) / length, (zb - za) / length
    yaw = math.atan2(ux, uz)
    oriented_box((D, "metal", 1), (xa + xb) / 2, y + 0.44, (za + zb) / 2, 0.4, 0.05, length, yaw, scale=1.0)
    for k in range(3):
        o = -0.12 + k * 0.12
        pipe((D, "dark", 1), (xa - uz * o, y + 0.5, za + ux * o), (xb - uz * o, y + 0.5, zb + ux * o), 0.03, segs=3)
    for i in range(max(2, int(length / 1.8)) + 1):
        t = i / max(2, int(length / 1.8))
        oriented_box((D, "metal", 1), xa + (xb - xa) * t, y + 0.21, za + (zb - za) * t, 0.3, 0.42, 0.05, yaw, scale=1.0)


def shed(D, x, z, y, yaw, rng, hue="amber", w=2.6, d=2.2, h=2.3):
    """A shed somebody keeps on a roof: ribbed steel, a flat lid, its door
    open on a lit room, a lit window round the side, a lamp over the door."""
    (rx, rz), (nx, nz) = _axes(yaw)
    oriented_box((D, "container", 0), x, y + h / 2, z, w, h, d, yaw, scale=1.0, col=rng.choice(SHED))
    oriented_box((D, "metal", 1), x, y + h + 0.05, z, w + 0.4, 0.1, d + 0.4, yaw, scale=1.0)
    c = GLOW[hue]
    fx, fz = x + nx * (d / 2 + 0.012), z + nz * (d / 2 + 0.012)
    rotated_quad((D, "glow", 0), fx - rx * w * 0.2, y + 0.98, fz - rz * w * 0.2, 0.82, 1.9, yaw, col=(c[0] * 0.4, c[1] * 0.4, c[2] * 0.4, 1))
    rotated_quad((D, "glow", 0), x + rx * (w / 2 + 0.012), y + 1.45, z + rz * (w / 2 + 0.012), 0.8, 0.55, yaw + math.pi / 2,
                 col=(c[0] * 0.3, c[1] * 0.3, c[2] * 0.3, 1))
    box((D, "glow", 1), fx - rx * w * 0.2 - 0.09, fx - rx * w * 0.2 + 0.09, y + 2.02, y + 2.12, fz - 0.09, fz + 0.09, scale=0.5, col=c)
    K.pool(D, x + nx * (d / 2 + 1.1), z + nz * (d / 2 + 1.1), y, hue, 5.5)


def panels(D, x0, x1, z0, z1, y):
    """Rows of solar panes tilted to the south on their frames."""
    z = z0
    while z + 1.05 <= z1 + 1e-6:
        a, b, c, d = (x0, y + 0.3, z + 1.0), (x1, y + 0.3, z + 1.0), (x1, y + 0.85, z), (x0, y + 0.85, z)
        quad((D, "glass_dark", 0), a, b, c, d)
        quad((D, "metal", 1), b, a, d, c)
        n = max(1, int((x1 - x0) / 1.1))
        for i in range(n + 1):
            px = x0 + (x1 - x0) * i / n
            quad((D, "metal", 1), (px - 0.02, y + 0.305, z + 1.0), (px + 0.02, y + 0.305, z + 1.0), (px + 0.02, y + 0.855, z), (px - 0.02, y + 0.855, z))
        for px in (x0 + 0.2, x1 - 0.2):
            box((D, "metal", 1), px - 0.03, px + 0.03, y, y + 0.85, z + 0.02, z + 0.08, scale=1.0)
        z += 1.45


def washing(D, a, b, y, rng):
    """A washing line between two poles, the day's wash on it."""
    (xa, za), (xb, zb) = a, b
    for (px, pz) in (a, b):
        cylinder((D, "metal", 1), px, pz, y, y + 2.05, 0.035, segs=4)
    pipe((D, "dark", 1), (xa, y + 2.0, za), (xb, y + 2.0, zb), 0.012, segs=3)
    length = math.hypot(xb - xa, zb - za)
    ux, uz = (xb - xa) / length, (zb - za) / length
    t = 0.35
    while t < length - 0.9:
        w, h = rng.uniform(0.4, 0.85), rng.uniform(0.45, 1.1)
        p0, p1 = (xa + ux * t, y + 2.0, za + uz * t), (xa + ux * (t + w), y + 2.0, za + uz * (t + w))
        q0, q1 = (p0[0], y + 2.0 - h, p0[2]), (p1[0], y + 2.0 - h, p1[2])
        col = rng.choice(CLOTH)
        quad((D, "trim", 1), q0, q1, p1, p0, col=col)
        quad((D, "trim", 1), q1, q0, p0, p1, col=col)
        t += w + rng.uniform(0.08, 0.5)


def hatch(D, x, z, y, yaw, hue):
    """A roof hatch standing open on the light of the stair under it."""
    (rx, rz), (nx, nz) = _axes(yaw)
    oriented_box((D, "metal", 1), x, y + 0.2, z, 1.2, 0.4, 1.2, yaw, scale=1.0)
    c = GLOW[hue]
    cs = [(x + rx * u + nx * v, y + 0.41, z + rz * u + nz * v) for u, v in ((-0.5, 0.5), (0.5, 0.5), (0.5, -0.5), (-0.5, -0.5))]
    quad((D, "glow", 0), *cs, col=(c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 1))
    bx, bz, tx, tz = x - nx * 0.6, z - nz * 0.6, x - nx * 0.95, z - nz * 0.95
    lid = [(bx - rx * 0.6, y + 0.4, bz - rz * 0.6), (bx + rx * 0.6, y + 0.4, bz + rz * 0.6), (tx + rx * 0.6, y + 1.45, tz + rz * 0.6),
           (tx - rx * 0.6, y + 1.45, tz - rz * 0.6)]
    quad((D, "metal", 1), *lid)
    quad((D, "metal", 1), lid[1], lid[0], lid[3], lid[2])
    K.pool(D, x + nx * 0.9, z + nz * 0.9, y, hue, 4.5)


def tank(D, x, z, y, yaw, rng, hue="amber"):
    """A water tank (the kit's) with its feed pipe and a lamp under it."""
    P.place("tank_roof", x, y, z, yaw, district=D)
    box((D, "glow", 1), x - 0.09, x + 0.09, y + 1.72, y + 1.82, z - 0.09, z + 0.09, scale=0.5, col=GLOW[hue])
    pipe((D, "steel", 1), (x + 1.2, y + 1.95, z), (x + 1.2, y, z), 0.06, segs=5, col=K.PIPE_PAINT[2])
    K.pool(D, x, z, y, hue, 4.5)


TALL = {"shed": 2.6, "tank": 4.5, "dishes": 2.4, "washing": 2.2, "lamp": 1.0, "bank": 1.2, "duct": 1.25, "panels": 0.95, "hatch": 1.6,
        "tray": 0.6, "pipes": 0.5, "stack": 1.0}
DECK = ("bank", "shed", "pipes", "lamp", "duct", "panels", "washing", "tank", "bank", "tray", "hatch", "dishes", "stack", "lamp", "shed", "pipes")


def _hits(r, keep, m=0.25):
    return any(r[0] < k[1] + m and r[1] > k[0] - m and r[2] < k[3] + m and r[3] > k[2] - m for k in keep)


def fill(D, x0, x1, z0, z1, y, rng, keep=(), hues=("cyan", "amber", "white"), hmax=9.0, cell=4.4, inset=0.8, skip=0.1):
    """Work a roof's free floor: the rectangle in cells, each cell clear of
    `keep` (what already stands there, as x0, x1, z0, z1) given the next
    thing from a shuffled deck that fits under `hmax` (a height, or a
    function of where: the line a camera sees over), so no two neighbours
    are alike and no stretch is bare."""
    w, d = x1 - x0 - 2 * inset, z1 - z0 - 2 * inset
    if w < 1.6 or d < 1.6:
        return
    nx, nz = max(1, round(w / cell)), max(1, round(d / cell))
    cw, cd = w / nx, d / nz
    deck, lit = [], 0
    for i in range(nx):
        for j in range(nz):
            a0, b0 = x0 + inset + i * cw, z0 + inset + j * cd
            r = (a0 + 0.3, a0 + cw - 0.3, b0 + 0.3, b0 + cd - 0.3)
            if _hits(r, keep) or rng.random() < skip:
                continue
            cx, cz, rw, rd = (r[0] + r[1]) / 2, (r[2] + r[3]) / 2, r[1] - r[0], r[3] - r[2]
            top = hmax(cx, cz) if callable(hmax) else hmax
            small = min(rw, rd) < 2.5
            kind = None
            for _ in range(len(DECK) + 1):
                if not deck:
                    deck = list(DECK)
                    rng.shuffle(deck)
                k = deck.pop()
                if TALL[k] <= top and not (small and k in ("shed", "tank", "panels", "hatch")):
                    kind = k
                    break
            if kind is None:
                continue
            hue = hues[lit % len(hues)]
            along_x = rw >= rd if abs(rw - rd) > 0.4 else rng.random() < 0.5
            side = rng.choice((-0.25, 0.25))
            if along_x:
                a, b = (r[0], cz + rd * side), (r[1], cz + rd * side)
            else:
                a, b = (cx + rw * side, r[2]), (cx + rw * side, r[3])
            if rng.random() < 0.5:
                a, b = b, a
            if kind == "bank":
                bank(D, cx, cz, y, max(1, int((rw if along_x else rd) / 1.6)), (0.0 if along_x else math.pi / 2) + rng.choice((0.0, math.pi)), rng)
            elif kind == "duct":
                duct(D, a, b, y, rng)
            elif kind == "pipes":
                pipes(D, a, b, y, rng, n=rng.randrange(2, 5), loop=top >= 1.3)
            elif kind == "tray":
                tray(D, a, b, y, rng)
            elif kind == "shed":
                shed(D, cx, cz, y, rng.randrange(4) * math.pi / 2, rng, hue, w=min(2.8, rw - 0.6), d=min(2.3, rd - 0.9))
                lit += 1
            elif kind == "panels":
                panels(D, r[0] + 0.2, r[1] - 0.2, r[2] + 0.2, r[3] - 0.2, y)
            elif kind == "washing":
                washing(D, a, b, y, rng)
                P.place("crates", cx, y, cz, rng.uniform(0, 3), district=D)
            elif kind == "hatch":
                hatch(D, cx, cz, y, rng.randrange(4) * math.pi / 2, hue)
                lit += 1
            elif kind == "tank":
                tank(D, cx, cz, y, rng.uniform(0, 3), rng, hue)
                lit += 1
            elif kind == "dishes":
                for k_ in range(2):
                    P.place("dish", cx + (k_ - 0.5) * 1.3, y, cz + rng.uniform(-0.5, 0.5), rng.uniform(0, 6.2), sxz=rng.uniform(0.8, 1.3), district=D)
                box((D, "metal", 1), cx - 0.3, cx + 0.3, y, y + 1.0, cz + 0.8, cz + 1.15, scale=1.0)
                box((D, "glow", 1), cx - 0.2, cx - 0.14, y + 0.8, y + 0.86, cz + 0.78, cz + 0.8, scale=0.5, col=GLOW["green"])
            elif kind == "stack":
                for name, ox, oz in (("pallets", -0.6, 0.0), ("barrel", 0.6, -0.5), ("barrel", 0.75, 0.25), ("crates", 0.0, 0.9)):
                    P.place(name, cx + ox, y, cz + oz, rng.uniform(0, 3), district=D)
            else:
                lamp(D, cx, cz, y, hue, h=min(2.4, max(0.7, top - 0.3)))
                P.place("drum", cx + 0.5, y, cz + 0.3, district=D)
                lit += 1
            # What is not lit of itself has a low lamp by it now and then.
            if kind in ("bank", "duct", "pipes", "tray", "panels", "stack", "dishes", "washing") and rng.random() < 0.5 and top >= 1.0:
                lamp(D, min(max(r[0], x0 + 2.4), x1 - 2.4), min(max(r[2], z0 + 2.4), z1 - 2.4), y, hue, h=0.8, power=5.0)
                lit += 1


def ring(D, outer, inner, y, rng, **kw):
    """The floor left round something that stands in a roof's middle (a
    penthouse, a crown): the four strips between `outer` and `inner` (each
    x0, x1, z0, z1), worked one by one."""
    (x0, x1, z0, z1), (a0, a1, b0, b1) = outer, inner
    keep = list(kw.pop("keep", ()))
    for r in ((x0, x1, z0, b0), (x0, x1, b1, z1), (x0, a0, b0, b1), (a1, x1, b0, b1)):
        fill(D, *r, y, rng, keep=keep, inset=0.25, **kw)
