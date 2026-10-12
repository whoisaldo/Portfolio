"""Corpo Row's own pieces: what a corporate centre is made of.

Glass masses on the towers' own curtain-wall shader, concrete podiums,
screens with no words, lines of light, glass rails lit along their top edge,
planters and hedges, stairs with light in their risers, booths and kiosks,
landing pads, skylights, cooling plant, and signs turned off their walls.
All of it from the shared kit's primitives and materials, keyed "corpo", so
it merges into draws the city already makes and streams with the district's
pack. Small ornament is detail (a phone's pack leaves it out).
"""
import math
import random

from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P

CO = "corpo"
G0 = B.G0
STOREY = 3.8        # the curtain wall's floors (the corporate shader's), over
BASE = 8.0          # a base this high

# Painted and cast things, linear colours for the trim material.
CONCRETE = (0.17, 0.17, 0.18, 1)
PALE = (0.3, 0.31, 0.33, 1)
STONE = (0.105, 0.11, 0.125, 1)
STEEL = (0.055, 0.06, 0.07, 1)
BLACK = (0.022, 0.024, 0.03, 1)
TEAL = (0.05, 0.16, 0.15, 1)
HEDGE = (0.035, 0.11, 0.06, 1)
SOIL = (0.03, 0.025, 0.02, 1)
YELLOW = (0.62, 0.47, 0.06, 1)
RED = (0.4, 0.05, 0.05, 1)
TRAIN = (0.7, 0.5, 0.06, 1)

# Signs here take their designs from a stream of their own, so nothing built
# in this district moves the street's own count (kit.st_name), and only the
# street's designs a corporate row would carry (the site hands a face named
# st_<size>_<n> the n-th design of its size, src/data/world.js STREET_SIGNS
# then src/world/sign-words.js): clinics, pharmacies, cyberware, electronics,
# exchange, the hours, and the pictograms that are marks rather than menus.
_names = random.Random(60606)
DESIGNS = {
    "bs": (4, 7, 8, 9, 12, 14, 15, 18),
    "bm": (5, 7, 8, 9, 10, 14, 15, 21),
    "bl": (1, 4, 8, 10, 11, 14),
    "ps": (0, 6, 10, 13),
    "pm": (1, 2, 4, 7, 8, 11, 12, 15),
    "bx": (3, 4, 6, 8, 10, 12, 13, 14, 16, 19),
}
ARROW, BOLT, CROSS, CHIP, EYE, STAR = 16, 8, 4, 13, 3, 14     # some of the bx pictograms, by name


def st_id(size, n=None):
    return f"st_{size}_{_names.choice(DESIGNS[size]) if n is None else n}"


def k(mat, detail=0):
    return (CO, mat, detail)


def glow_box(x0, x1, y0, y1, z0, z1, colour, detail=0):
    """Light that does not reach the ground's bake: high up, or small."""
    box(k("glow", detail), x0, x1, y0, y1, z0, z1, scale=1.0, col=GLOW[colour])


def neon_box(x0, x1, y0, y1, z0, z1, colour, detail=0):
    """Light the bake carries onto the ground and the walls near it."""
    box(k("neon_" + colour, detail), x0, x1, y0, y1, z0, z1, scale=1.0)


def solid(x0, x1, y0, y1, z0, z1, col=CONCRETE, detail=0, bottom=False):
    box(k("trim", detail), x0, x1, y0, y1, z0, z1, scale=2.0, col=col, bottom=bottom)


def rect(x0, x1, z0, z1):
    """A rectangle's outline, walked as kit.walls wants it."""
    return [(x0, z1), (x1, z1), (x1, z0), (x0, z0)]


def roof_quad(x0, x1, z0, z1, y, mat="roof"):
    quad(k(mat), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0),
         ((0, 0), ((x1 - x0) / 4, 0), ((x1 - x0) / 4, (z1 - z0) / 4), (0, (z1 - z0) / 4)))


def glass_col(r, lit=(0.5, 0.86), warm=(0.0, 0.45)):
    """A curtain wall's own numbers: lit fraction, warmth, seed."""
    return (r.uniform(*lit), r.uniform(*warm), r.random(), 1.0)


def glass(x0, x1, z0, z1, y0, y1, col, faces="all", roof=True):
    """A glass mass on the towers' curtain-wall shader (floors 3.8 m apart
    from 8 m up, drawn from world position, a floor of desks and light
    behind every pane)."""
    sides = {"+z": ((x0, z1), (x1, z1)), "+x": ((x1, z1), (x1, z0)), "-z": ((x1, z0), (x0, z0)), "-x": ((x0, z0), (x0, z1))}
    for name, ((xa, za), (xb, zb)) in sides.items():
        if faces != "all" and name not in faces:
            continue
        length = math.hypot(xb - xa, zb - za)
        quad(k("corporate"), (xa, y0, za), (xb, y0, zb), (xb, y1, zb), (xa, y1, za),
             ((0, 0), (length, 0), (length, y1 - y0), (0, y1 - y0)), col)
    if roof:
        roof_quad(x0, x1, z0, z1, y1)
        B.ROOFS.append((CO, x0, x1, z0, z1, y1))
    B.COLLISION.append(("box", x0, x1, y0, y1, z0, z1, CO))


def windows(x0, x1, z0, z1, y0, y1, r, style=5, tint="navy", lit=(0.4, 0.8), warm=(0.05, 0.5), faces="all", roof=True, col=None):
    """A mass on the window shader: whole bays on each face, storeys on the
    floor lines. Returns its colour."""
    if col is None:
        col = B.wall_col(r.uniform(*lit), style, r.uniform(*warm), B.TINTS[tint])
    ov = r.randrange(0, 40)
    for name, f in B.faces_of(x0, x1, z0, z1).items():
        if faces != "all" and name not in faces:
            continue
        B.facade_wall(k("facade"), f, y0, y1, col, ov)
    if roof:
        roof_quad(x0, x1, z0, z1, y1)
        B.ROOFS.append((CO, x0, x1, z0, z1, y1))
    B.COLLISION.append(("box", x0, x1, y0, y1, z0, z1, CO))
    return col


def parapet(x0, x1, z0, z1, y, col=STONE, h=1.0, t=0.3, edge=None, glow=True):
    """A roof's parapet, and along its top a thin line of light: from the
    air the district's roofs are drawn in cyan and amber."""
    for (a0, a1, b0, b1) in ((x0, x1, z1 - t, z1), (x0, x1, z0, z0 + t), (x0, x0 + t, z0 + t, z1 - t), (x1 - t, x1, z0 + t, z1 - t)):
        solid(a0, a1, y, y + h, b0, b1, col)
    if edge:
        key = k("glow") if glow else k("neon_" + edge)
        c = GLOW[edge] if glow else (1, 1, 1, 1)
        walls(key, rect(x0 - 0.04, x1 + 0.04, z0 - 0.04, z1 + 0.04), y + h - 0.12, y + h - 0.02, c)


def edge_line(x0, x1, z0, z1, y, colour, h=0.12, glow=True, out=0.05):
    """A line of light round a plan at height y."""
    key = k("glow") if glow else k("neon_" + colour)
    walls(key, rect(x0 - out, x1 + out, z0 - out, z1 + out), y, y + h, GLOW[colour] if glow else (1, 1, 1, 1))


def aviation(x, y, z, detail=1):
    glow_box(x - 0.22, x + 0.22, y, y + 0.36, z - 0.22, z + 0.22, "red", detail)


def mast(x, z, y0, h, lamps=2):
    """A lattice mast in outline: a tapering pole, crossarms, red lamps."""
    cylinder(k("metal"), x, z, y0, y0 + h * 0.5, 0.3, segs=6)
    cylinder(k("metal"), x, z, y0 + h * 0.5, y0 + h, 0.12, segs=5)
    glow_box(x - 0.2, x + 0.2, y0 + h, y0 + h + 0.4, z - 0.2, z + 0.2, "red")
    for j in range(lamps):
        y = y0 + h * (0.35 + 0.3 * j)
        box(k("metal", 1), x - 1.1, x + 1.1, y, y + 0.08, z - 0.05, z + 0.05, scale=0.5)
        aviation(x - 1.1, y + 0.08, z)
        aviation(x + 1.1, y + 0.08, z)


# The advert shader's palette (0 pink, 1 cyan, 2 amber, 3 purple, 4 green,
# 5 magenta, 6 blue, 7 yellow), as (subject and frame, field) pairs a
# corporate screen opens on: blue and cyan with a little amber, and for a
# wall of screens cyan, blue and magenta (ax5YUmkWf_Y@9).
COLD = ((6, 1), (1, 6), (6, 2), (2, 6), (1, 6), (6, 1), (1, 4))
MEDIA = ((1, 6), (6, 1), (1, 5), (5, 1), (6, 3), (3, 6), (1, 6))
WARM = ((2, 6), (2, 7), (7, 2), (6, 2), (2, 5))


def _fract(x):
    return x - math.floor(x)


def _hash12(px, py):
    """src/world/glsl.js hash12, for choosing a board's seed."""
    p = [_fract(px * 0.1031), _fract(py * 0.1031), _fract(px * 0.1031)]
    d = p[0] * (p[1] + 33.33) + p[1] * (p[2] + 33.33) + p[2] * (p[0] + 33.33)
    p = [v + d for v in p]
    return _fract((p[0] + p[1]) * p[2])


def board_col(r, pal=None):
    """A billboard's numbers (palette, shape, seed). `pal`: (subject, field)
    palette pairs to open on. The advert shader steps a board through the
    palette every nine to fifteen seconds from its seed, its field's colour
    three to five steps on by a hash of the seed; this picks a seed (one of
    the 256 an 8-bit vertex colour holds) whose first advert, over the
    opening seconds of the city's clock when the page's shots are held, is
    one of the pairs."""
    g = r.randrange(8) / 8.0 + 0.06
    if pal is None:
        return (r.randrange(8) / 8.0 + 0.06, g, r.randrange(256) / 255.0, 1.0)
    want = r.choice(pal)
    step = (want[1] - want[0] - 3) % 8
    order = list(range(256))
    r.shuffle(order)
    for n in order:
        seed = n * 97.0 / 255.0
        q = (12.0 + seed * 3.0) / (9.0 + 6.0 * _fract(seed * 1.3))
        if not 0.12 < _fract(q) < 0.8:
            continue
        slot = math.floor(q)
        h3 = _hash12(slot, seed) * 3.0
        if step <= 2 and math.floor(h3) == step and 0.06 < _fract(h3) < 0.94:
            return (((want[0] - slot) % 8 + 0.5) / 8.0, g, n / 255.0, 1.0)
    return (r.randrange(8) / 8.0 + 0.06, g, r.randrange(256) / 255.0, 1.0)


# Every advert this district hangs, so the build can say when two near each
# other would show the same one (ad_report).
ADS = []


def ad_art(cx, cy, cz, w, h, yaw):
    """Which of the city's adverts a board shows over the opening seconds of
    the city's clock (src/world/materials.js, billboard: dealt from where the
    board's left edge and foot stand, in 4 m cells): "w0".."w15" one of the
    sixteen wide ones, "t0".."t7" one of the eight tall."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    rx, rz = nz, -nx
    fx = cx * rx + cz * rz - w / 2
    fy = cy - h / 2
    fz = cx * nx + cz * nz
    board = math.floor(fx / 4.0 + 0.412) * 7 + math.floor(fy / 4.0 + 0.412) * 5 + math.floor(fz / 4.0 + 0.412) * 3
    pick = board + 1
    return f"t{(pick * 3) % 8}" if w / h < 0.85 else f"w{pick % 16}"


def bb(cx, cy, cz, w, h, yaw, col, detail=0):
    """An advert's face."""
    ADS.append((ad_art(cx, cy, cz, w, h, yaw), cx, cy, cz, yaw, w, h))
    rotated_quad(k("billboard", detail), cx, cy, cz, w, h, yaw, col=col)


def ad_report(reach=34.0):
    """Print every pair of adverts near each other and facing much the same
    way that show the same advert (posters within 12 m, boards within
    `reach`)."""
    n = 0
    for i, a in enumerate(ADS):
        for b in ADS[i + 1:]:
            d = math.dist(a[1:4], b[1:4])
            near = reach if min(a[5], b[5]) > 3.0 else 12.0
            if a[0] != b[0] or d > near or d < 0.6 or math.cos(a[4] - b[4]) < 0.3:
                continue
            n += 1
            print(f"AD REPEAT {a[0]} at ({a[1]:.1f}, {a[2]:.1f}, {a[3]:.1f}) {a[5]:.1f}x{a[6]:.1f} and ({b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}) {b[5]:.1f}x{b[6]:.1f}")
    print(f"AD BOARDS {len(ADS)} repeats {n}")


def screen(cx, cy, cz, w, h, yaw, r, frame=True, depth=0.3, back=False, pal=None, detail=0):
    """A flat screen: an advert with no words in a dark steel frame."""
    bb(cx, cy, cz, w, h, yaw, board_col(r, pal), detail)
    if frame:
        nx, nz = math.sin(yaw), math.cos(yaw)
        oriented_box(k("board_frame", detail), cx - nx * (depth / 2 + 0.02), cy, cz - nz * (depth / 2 + 0.02), w + 0.4, h + 0.4, depth, yaw, scale=1.0)
        if back:
            bb(cx - nx * (depth + 0.06), cy, cz - nz * (depth + 0.06), w, h, yaw + math.pi, board_col(r, pal), detail)


def panel(cx, cy, cz, w, h, yaw, colour, dim=1.0, glow=True):
    """A plain lit panel (a light box, a screen showing one colour)."""
    if glow:
        c = GLOW[colour]
        rotated_quad(k("glow"), cx, cy, cz, w, h, yaw, col=(c[0] * dim, c[1] * dim, c[2] * dim, 1.0))
    else:
        rotated_quad(k("neon_" + colour), cx, cy, cz, w, h, yaw)


def screen_stack(cx, cz, y0, w, heights, yaw, r, gap=0.5, depth=0.3, pal=None):
    """Screens stacked one over another up a face (the far city's screen
    towers, in small)."""
    y = y0
    for h in heights:
        screen(cx, y + h / 2, cz, w, h, yaw, r, depth=depth, pal=pal)
        y += h + gap
    return y


def st_blade(x, y, z, size, yaw, bracket=None, n=None):
    """One of the street's standard signs as a blade: both faces painted,
    in its frame, turned any way (`yaw` is the way its first face looks)."""
    w, h = ST_SIZES[size]
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box(k("board_frame"), x, y, z, w + 0.12, h + 0.14, 0.16, yaw, scale=1.0)
    sid = st_id(size, n)
    sign(sid, x + nx * 0.09, y, z + nz * 0.09, w, h, yaw, district=CO, label=False)
    sign(sid + "_b", x - nx * 0.09, y, z - nz * 0.09, w, h, yaw + math.pi, district=CO, label=False)
    if bracket:
        bx, bz = bracket
        pipe(k("metal", 1), (bx, y + h / 2 + 0.1, bz), (x, y + h / 2 + 0.1, z), 0.035, segs=4)


def st_board(x, y, z, size, yaw, out=0.12):
    """A standard sign flat on something, facing yaw, its frame behind it."""
    w, h = ST_SIZES[size]
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box(k("board_frame"), x - nx * out / 2, y, z - nz * out / 2, w + 0.14, h + 0.14, out, yaw, scale=1.0)
    sign(st_id(size), x + nx * 0.015, y, z + nz * 0.015, w, h, yaw, district=CO, label=False)


def totem(x, z, yaw, r, h=5.2, colour="cyan", sizes=("bx", "bx")):
    """A freestanding sign pylon on a forecourt: a dark slab on a foot, a
    thin line of light up each edge, standard signs on both faces (the
    square icon boxes and the blades: a lobby's pylon carries marks, not a
    shop's words)."""
    colour = "cyan" if colour == "white" else colour
    oriented_box(k("trim"), x, G0 + h / 2, z, 1.5, h, 0.32, yaw, scale=1.0, col=BLACK)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    for s in (-1, 1):
        oriented_box(k("neon_" + colour), x + rx * s * 0.77, G0 + h / 2, z + rz * s * 0.77, 0.05, h - 0.3, 0.1, yaw, scale=1.0)
    nx, nz = math.sin(yaw), math.cos(yaw)
    y = G0 + h - 0.5
    for size in sizes:
        size = "bx" if size in ("ps", "pm") else size
        w, hh = ST_SIZES[size]
        y -= hh / 2 + 0.25
        if y - hh / 2 < G0 + 0.6:
            break
        sid = st_id(size)
        sc = min(1.0, 1.3 / w)
        sign(sid, x + nx * 0.17, y, z + nz * 0.17, w * sc, hh * sc, yaw, district=CO, label=False)
        sign(sid + "_b", x - nx * 0.17, y, z - nz * 0.17, w * sc, hh * sc, yaw + math.pi, district=CO, label=False)
        y -= hh / 2
    light(CO, x + nx * 0.8, 2.0, z + nz * 0.8, colour, 2.5)


def rail(xa, za, xb, zb, y, colour="cyan", h=1.05, glow=False):
    """A glass balustrade from a to b at height y: the pane seen from both
    sides, its top edge lit (KvMY1uzSC1E@43)."""
    colour = "cyan" if colour == "white" else colour     # (white tube blooms into a bar)
    for p, q in (((xa, za), (xb, zb)), ((xb, zb), (xa, za))):
        quad(k("glass_dark", 1), (p[0], y, p[1]), (q[0], y, q[1]), (q[0], y + h, q[1]), (p[0], y + h, p[1]))
    dx, dz = xb - xa, zb - za
    key = k("glow") if glow else k("neon_" + colour)
    oriented_box(key, (xa + xb) / 2, y + h + 0.02, (za + zb) / 2, math.hypot(dx, dz), 0.04, 0.05, math.atan2(-dz, dx), scale=1.0,
                 col=GLOW[colour] if glow else (1, 1, 1, 1))


def planter(x0, x1, z0, z1, y=G0, h=0.55, hedge=0.7, lit=None, col=CONCRETE):
    """A concrete planter bed with a clipped hedge in it, and (lit) a line
    of light under its rim on its long sides."""
    solid(x0, x1, y, y + h, z0, z1, col)
    if hedge:
        solid(x0 + 0.18, x1 - 0.18, y + h, y + h + hedge, z0 + 0.18, z1 - 0.18, HEDGE)
    if lit:
        if x1 - x0 >= z1 - z0:
            neon_box(x0 + 0.1, x1 - 0.1, y + 0.06, y + 0.12, z1, z1 + 0.03, lit, 1)
            neon_box(x0 + 0.1, x1 - 0.1, y + 0.06, y + 0.12, z0 - 0.03, z0, lit, 1)
        else:
            neon_box(x1, x1 + 0.03, y + 0.06, y + 0.12, z0 + 0.1, z1 - 0.1, lit, 1)
            neon_box(x0 - 0.03, x0, y + 0.06, y + 0.12, z0 + 0.1, z1 - 0.1, lit, 1)


def stairs_z(x0, x1, z_foot, z_top, y0, y1, colour="cyan", col=CONCRETE):
    """Stairs climbing along z from z_foot (at y0) to z_top (at y1), solid
    under, a strip of light in every other riser (KvMY1uzSC1E@29)."""
    n = max(2, round((y1 - y0) / 0.17))
    d = (z_top - z_foot) / n
    for i in range(n):
        za, zb = sorted((z_foot + d * i, z_top))
        ya = y0 + (y1 - y0) * (i + 1) / n
        solid(x0, x1, y0, ya, za, zb, col)
        if i % 2 == 0:
            zf = z_foot + d * i
            z0, z1 = sorted((zf, zf - math.copysign(0.03, d)))
            neon_box(x0 + 0.3, x1 - 0.3, ya - 0.1, ya - 0.05, z0, z1, colour, 1)


def stairs_x(z0, z1, x_foot, x_top, y0, y1, colour="cyan", col=CONCRETE):
    n = max(2, round((y1 - y0) / 0.17))
    d = (x_top - x_foot) / n
    for i in range(n):
        xa, xb = sorted((x_foot + d * i, x_top))
        ya = y0 + (y1 - y0) * (i + 1) / n
        solid(xa, xb, y0, ya, z0, z1, col)
        if i % 2 == 0:
            xf = x_foot + d * i
            x0, x1 = sorted((xf, xf - math.copysign(0.03, d)))
            neon_box(x0, x1, ya - 0.1, ya - 0.05, z0 + 0.3, z1 - 0.3, colour, 1)


def kiosk(x, z, yaw, colour="cyan", w=2.2, d=1.4, h=2.5):
    """A low lit booth on the pavement (YRL74JmhVgk@30): a dark box, its
    front a glowing panel, a line of light round its roof."""
    oriented_box(k("trim"), x, G0 + h / 2, z, w, h, d, yaw, scale=1.0, col=BLACK)
    nx, nz = math.sin(yaw), math.cos(yaw)
    rotated_quad(k("neon_" + colour), x + nx * (d / 2 + 0.02), G0 + 1.45, z + nz * (d / 2 + 0.02), w - 0.4, 1.5, yaw)
    c = GLOW[colour]
    rotated_quad(k("glow"), x - nx * (d / 2 + 0.02), G0 + 1.6, z - nz * (d / 2 + 0.02), w - 0.8, 0.9, yaw + math.pi, col=(c[0] * 0.4, c[1] * 0.4, c[2] * 0.4, 1.0))
    oriented_box(k("neon_" + colour, 1), x, G0 + h + 0.04, z, w + 0.1, 0.06, d + 0.1, yaw, scale=1.0)
    light(CO, x + nx * 1.4, 1.4, z + nz * 1.4, colour, 3.0)


def booth(x, z, yaw, r, hue="white"):
    """A security booth: glazed above the sill and lit inside, a flat roof
    with a line of light under its eave, a camera lamp on it."""
    oriented_box(k("trim"), x, G0 + 0.55, z, 2.0, 1.1, 1.6, yaw, scale=1.0, col=STONE)
    oriented_box(k("trim"), x, G0 + 2.5, z, 2.3, 0.16, 1.9, yaw, scale=1.0, col=BLACK)
    oriented_box(k("trim"), x, G0 + 1.75, z, 1.96, 1.3, 1.56, yaw, scale=1.0, col=BLACK)
    nx, nz = math.sin(yaw), math.cos(yaw)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    c = GLOW["cyan"]
    for ang, off, w in ((yaw, 0.79, 1.6), (yaw + math.pi, 0.79, 1.6), (yaw + math.pi / 2, 0.99, 1.2), (yaw - math.pi / 2, 0.99, 1.2)):
        ax, az = math.sin(ang), math.cos(ang)
        rotated_quad(k("glass_dark"), x + ax * off, G0 + 1.8, z + az * off, w, 0.8, ang)
        # A monitor's glow low in the window.
        rotated_quad(k("glow", 1), x + ax * (off + 0.01), G0 + 1.58, z + az * (off + 0.01), w * 0.34, 0.26, ang, col=(c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 1.0))
    for sx in (-1, 1):
        for sz in (-1, 1):
            oriented_box(k("metal", 1), x + rx * sx * 0.97 + nx * sz * 0.77, G0 + 1.75, z + rz * sx * 0.97 + nz * sz * 0.77, 0.1, 1.3, 0.1, yaw, scale=0.5)
    oriented_box(k("neon_" + hue, 1), x, G0 + 2.39, z, 2.34, 0.05, 1.94, yaw, scale=1.0)
    glow_box(x - 0.06, x + 0.06, G0 + 2.58, G0 + 2.72, z - 0.06, z + 0.06, "red", 1)
    light(CO, x + nx * 1.6, 1.6, z + nz * 1.6, hue, 2.5)


def ad_panel(x, z, yaw, r, pal=None, w=1.3, h=1.9):
    """A lit poster panel on the pavement, an advert on both faces
    (BnnbP7pCIvQ@29, layout only): a slim dark case on a foot."""
    oriented_box(k("trim"), x, G0 + 0.3, z, 0.5, 0.6, 0.2, yaw, scale=1.0, col=BLACK)
    oriented_box(k("board_frame"), x, G0 + 0.6 + h / 2, z, w + 0.14, h + 0.14, 0.16, yaw, scale=1.0)
    nx, nz = math.sin(yaw), math.cos(yaw)
    for s_, ang in ((1, yaw), (-1, yaw + math.pi)):
        bb(x + nx * 0.09 * s_, G0 + 0.6 + h / 2, z + nz * 0.09 * s_, w, h, ang, board_col(r, pal))


def tube_post(x, z, yaw, colour="white", h=6.2, arm=1.5):
    """A tall forecourt lamp: a slim post carrying horizontal tubes
    (BnnbP7pCIvQ@43, layout only)."""
    cylinder(k("metal"), x, z, G0, G0 + h, 0.07, segs=6)
    for j, y in enumerate((h - 0.3, h - 1.0)):
        oriented_box(k("neon_" + colour), x, G0 + y, z, arm * 2 - j * 0.5, 0.09, 0.09, yaw, scale=1.0)
    light(CO, x, h - 1.2, z, colour, 5.0)


def light_strip_ground(x0, x1, z0, z1, colour="cyan", y=G0 + 0.024):
    """A line of light set into the paving."""
    quad(k("glow"), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0), col=GLOW[colour])


def stripes(x0, x1, z0, z1, y=G0 + 0.018, step=1.8, w=0.9, col=YELLOW, along="x", skew=0.0):
    """Yellow and dark striped paving (mH2wmyeiIpA@182): bars across a
    strip, every `step` metres, skewed into chevrons if asked."""
    key = k("trim", 1)
    if along == "x":
        x = x0
        while x + w <= x1 + 1e-6:
            quad(key, (x + skew, y, z1), (x + w + skew, y, z1), (x + w, y, z0), (x, y, z0), col=col)
            x += step
    else:
        z = z0
        while z + w <= z1 + 1e-6:
            quad(key, (x0, y, z + w + skew), (x1, y, z + w), (x1, y, z), (x0, y, z + skew), col=col)
            z += step


def paving_band(x0, x1, z0, z1, col=STONE, y=G0 + 0.012):
    """A band of darker or paler stone let into the paving."""
    quad(k("trim"), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0), col=col)


def pad(cx, cz, y, r=7.0, colour="green"):
    """A landing pad on a roof: a dark deck, a painted ring and cross, lamps
    round its edge."""
    cylinder(k("trim"), cx, cz, y, y + 0.25, r, segs=20, col=BLACK)
    segs = 20
    for i in range(segs):
        a0, a1 = i * math.tau / segs, (i + 1) * math.tau / segs
        for rr, w, col in ((r * 0.72, 0.28, YELLOW),):
            p = [(cx + math.cos(a) * q, y + 0.27, cz + math.sin(a) * q) for a, q in ((a0, rr), (a0, rr + w), (a1, rr + w), (a1, rr))]
            quad(k("trim", 1), p[1], p[0], p[3], p[2], col=col)
    for ang in (0.0, math.pi / 2):
        oriented_box(k("trim", 1), cx, y + 0.27, cz, r * 0.8, 0.02, 0.3, ang, scale=1.0, col=YELLOW)
    for i in range(16):
        a = i * math.tau / 16
        glow_box(cx + math.cos(a) * (r - 0.3) - 0.18, cx + math.cos(a) * (r - 0.3) + 0.18, y + 0.25, y + 0.42,
                 cz + math.sin(a) * (r - 0.3) - 0.18, cz + math.sin(a) * (r - 0.3) + 0.18, colour)
        if i % 4 == 0:
            light(CO, cx + math.cos(a) * (r - 1.5), y + 1.0, cz + math.sin(a) * (r - 1.5), colour, 3.0)
    c = GLOW["white"]
    for ang in (math.pi / 4, 3 * math.pi / 4):
        oriented_box(k("glow"), cx, y + 0.28, cz, r * 0.5, 0.02, 0.12, ang, scale=1.0, col=(c[0] * 0.35, c[1] * 0.35, c[2] * 0.35, 1.0))


def skylight(x0, x1, z0, z1, y, rise=1.6, colour="white", nx=4, nz=3):
    """A triangulated glass roof over an atrium, lit from under (the sunken
    skylight of PzkEqhVByw4@86): a low faceted dome of glowing panes between
    dark ribs, on a kerb."""
    solid(x0 - 0.3, x1 + 0.3, y, y + 0.4, z0 - 0.3, z1 + 0.3, STONE)
    y0 = y + 0.4
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2

    def hgt(x, z):
        u, v = (x - cx) / ((x1 - x0) / 2), (z - cz) / ((z1 - z0) / 2)
        return y0 + rise * max(0.0, 1.0 - u * u) * max(0.0, 1.0 - v * v)

    rr = random.Random(int(x0 * 7 + z0 * 13))
    base = GLOW[colour]
    white = GLOW["white"]
    for i in range(nx):
        for j in range(nz):
            xa, xb = x0 + (x1 - x0) * i / nx, x0 + (x1 - x0) * (i + 1) / nx
            za, zb = z0 + (z1 - z0) * j / nz, z0 + (z1 - z0) * (j + 1) / nz
            a, b, c, d = (xa, hgt(xa, zb), zb), (xb, hgt(xb, zb), zb), (xb, hgt(xb, za), za), (xa, hgt(xa, za), za)
            tris = ((a, b, c), (a, c, d)) if (i + j) % 2 == 0 else ((a, b, d), (b, c, d))
            for t in tris:
                # Each pane its own: most dim (a dark floor under it), some lit.
                g = rr.choice((0.2, 0.25, 0.3, 0.35, 0.5, 0.7, 1.0))
                m = rr.uniform(0.3, 0.8)
                top_ = max(base[:3]) or 1.0
                col = tuple((base[n] / top_ * m + (1 - m)) * g for n in range(3)) + (1,)
                poly(k("skylight"), list(t), [(0, 0), (1, 0), (0.5, 1)], col)
    # Ribs along the grid's lines, a hair over the glass.
    for i in range(nx + 1):
        x = x0 + (x1 - x0) * i / nx
        for j in range(nz):
            za, zb = z0 + (z1 - z0) * j / nz, z0 + (z1 - z0) * (j + 1) / nz
            pipe(k("metal", 1), (x, hgt(x, za) + 0.03, za), (x, hgt(x, zb) + 0.03, zb), 0.06, segs=3)
    for j in range(nz + 1):
        z = z0 + (z1 - z0) * j / nz
        for i in range(nx):
            xa, xb = x0 + (x1 - x0) * i / nx, x0 + (x1 - x0) * (i + 1) / nx
            pipe(k("metal", 1), (xa, hgt(xa, z) + 0.03, z), (xb, hgt(xb, z) + 0.03, z), 0.06, segs=3)


def cooler(x, z, y, r=1.5, h=2.4):
    """A cooling tower on a roof: a drum on a skid, its fan a dark disc
    under a lit rim."""
    solid(x - r - 0.2, x + r + 0.2, y, y + 0.3, z - r - 0.2, z + r + 0.2, STEEL)
    cylinder(k("tankplate"), x, z, y + 0.3, y + h, r, segs=10, cap=False, col=(0.2, 0.21, 0.22, 1.0))
    cylinder(k("dark"), x, z, y + h - 0.25, y + h - 0.2, r * 0.96, segs=10)
    # A band of louvres round its foot with light behind them, a ladder up
    # its side to a rail round the top, a pipe to the skid, a red lamp.
    cylinder(k("glow", 1), x, z, y + 0.42, y + 0.7, r + 0.02, segs=10, cap=False, col=tuple(c * 0.25 for c in GLOW["amber"][:3]) + (1.0,))
    for dz in (-0.22, 0.22):
        box(k("metal", 1), x + r + 0.04, x + r + 0.09, y + 0.3, y + h + 0.5, z + dz - 0.025, z + dz + 0.025, scale=1.0)
    for i in range(int(h / 0.45)):
        box(k("metal", 1), x + r + 0.04, x + r + 0.08, y + 0.6 + i * 0.45, y + 0.64 + i * 0.45, z - 0.22, z + 0.22, scale=1.0)
    cylinder(k("metal", 1), x, z, y + h + 0.42, y + h + 0.48, r + 0.03, segs=10, cap=False)
    pipe(k("trim", 1), (x - r * 0.6, y + h * 0.55, z - r), (x - r * 0.6, y + h * 0.55, z - r - 0.5), 0.12, segs=5, col=STEEL)
    pipe(k("trim", 1), (x - r * 0.6, y + h * 0.55, z - r - 0.5), (x - r * 0.6, y + 0.3, z - r - 0.5), 0.12, segs=5, col=STEEL)
    aviation(x - r * 0.7, y + h, z + r * 0.7)


def chiller(x0, x1, z0, z1, y, h=2.2):
    """A packaged plant unit: a steel box, louvres drawn as a dark band,
    two fans on top."""
    box(k("metal"), x0, x1, y, y + h, z0, z1, scale=1.0)
    box(k("dark", 1), x0 - 0.02, x1 + 0.02, y + h * 0.3, y + h * 0.75, z0 - 0.02, z1 + 0.02, scale=1.0)
    n = max(1, int((x1 - x0) // 2.2)) if x1 - x0 >= z1 - z0 else 1
    m = max(1, int((z1 - z0) // 2.2)) if z1 - z0 > x1 - x0 else 1
    for i in range(n):
        for j in range(m):
            cylinder(k("dark", 1), x0 + (x1 - x0) * (i + 0.5) / n, z0 + (z1 - z0) * (j + 0.5) / m, y + h, y + h + 0.12,
                     min(0.8, (x1 - x0) / n * 0.4, (z1 - z0) / m * 0.4), segs=8)


def duct_run(pts, r=0.35, col=STEEL):
    """A duct along a roof through points (x, y, z)."""
    for a, b in zip(pts, pts[1:]):
        pipe(k("metal", 1), a, b, r, segs=5)


def bollards(x0, x1, z, step=2.4, proto="bollard_cube"):
    x = x0
    while x <= x1 + 1e-6:
        P.place(proto, x, G0, z, district=CO)
        x += step


def bollards_z(z0, z1, x, step=2.4, proto="bollard_cube"):
    z = z0
    while z <= z1 + 1e-6:
        P.place(proto, x, G0, z, district=CO)
        z += step


def door_lamp(x, y, z, hue="white", power=3.0, nx=0.0, nz=1.0):
    """A small lamp over a door or under a soffit, and its pool on the ground."""
    glow_box(x - 0.16, x + 0.16, y, y + 0.08, z - 0.16, z + 0.16, hue, 1)
    light(CO, x + nx * 0.8, y - 0.3, z + nz * 0.8, hue, power)


def talk(x, z, yaw=0.0, n=2, d=0.55, y=0.0):
    """People standing talking: two or three round a point."""
    for i in range(n):
        a = yaw + i * math.tau / n
        stand(x + math.sin(a) * d, z + math.cos(a) * d, a + math.pi, "talk", y)


def ground(cells, x0, x1, z0, z1, default="sidewalk"):
    """Pave a rectangle without overlaps: `cells` are (x0, x1, z0, z1,
    material) rectangles laid over the default paving; the ground is cut
    along all their edges so no two pieces share a square metre."""
    xs = sorted({x0, x1, *[c[0] for c in cells], *[c[1] for c in cells]})
    zs = sorted({z0, z1, *[c[2] for c in cells], *[c[3] for c in cells]})
    xs = [x for x in xs if x0 <= x <= x1]
    zs = [z for z in zs if z0 <= z <= z1]
    for za, zb in zip(zs, zs[1:]):
        run = None
        for xa, xb in zip(xs, xs[1:]):
            mx, mz = (xa + xb) / 2, (za + zb) / 2
            mat = default
            for c in cells:
                if c[0] <= mx <= c[1] and c[2] <= mz <= c[3]:
                    mat = c[4]
                    break
            if run and run[2] == mat:
                run[1] = xb
            else:
                if run and run[2]:
                    _ground_piece(run[0], run[1], za, zb, run[2])
                run = [xa, xb, mat]
        if run and run[2]:
            _ground_piece(run[0], run[1], za, zb, run[2])


def _ground_piece(x0, x1, z0, z1, mat):
    y, s = G0, 0.5
    pts = ((x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0))
    quad(k(mat), *pts, uvs=tuple((q[0] * s, -q[2] * s) for q in pts))


# ---------------------------------------------------------------------------
# A corporate block: a podium with fronts, a shaft in tiers, a crown.
# ---------------------------------------------------------------------------
def front(f, top, kind, r, tint=1, colour="cyan", canopy=0.0):
    """One face of a podium, from the ground to `top`:
      glass   a lobby front: curtain glass over a plinth, doors in dark
              frames, a fascia with a line of light under it
      shop    showrooms: the street's shop glass (rooms behind it, cool
              light) under a band of curtain glass
      dock    a back: bare concrete, doors and shutters, caged lamps
      blank   stone, grooved by a ledge
      none    nothing (a neighbour stands against it)
    `canopy`: a flat canopy this far out over the doors, lit underneath."""
    w = f.width
    if kind == "none" or w < 0.6:
        return
    tcol = B.TRIM[tint]
    if kind == "glass":
        showrooms(f, r, tint, colour, lobby=True)
        f.quad(k("corporate"), 0.35, w - 0.35, SHOP_H + 0.35, top - 0.7, 0.03, col=glass_col(r, lit=(0.8, 1.0)))
        f.quad(k("trim"), 0.0, w, SHOP_H, SHOP_H + 0.35, 0.03, col=tcol)
        f.quad(k("trim"), 0.0, w, top - 0.7, top, 0.03, col=BLACK)
        f.box(k("neon_" + colour), 0.4, w - 0.4, top - 0.78, top - 0.7, 0.03, 0.09)
        for e in (0.0, w - 0.35):
            f.box(k("trim"), e, e + 0.35, 0.0, top, 0.0, 0.12, col=tcol)
        # Doors: a dark portal a third of the way along, the house's mark
        # raised over it in the house's one colour, a canopy over that.
        n = max(1, int(w // 16))
        for i in range(n):
            s = w * (i + 0.5) / n + (r.uniform(-1.5, 1.5) if w > 12 else 0.0)
            ptop = min(top - 1.3, 5.6)
            door_portal(f, s, colour, r.randrange(4), top=ptop)
            if canopy:
                f.box(k("trim"), s - 3.4, s + 3.4, ptop, ptop + 0.25, 0.0, canopy, col=BLACK)
                f.box(k("neon_" + colour), s - 3.2, s + 3.2, ptop - 0.06, ptop, canopy - 0.4, canopy - 0.3)
    elif kind == "shop":
        showrooms(f, r, tint, colour)
        f.quad(k("corporate"), 0.35, w - 0.35, SHOP_H + 0.35, top - 0.5, 0.03, col=glass_col(r, lit=(0.7, 1.0)))
        f.quad(k("trim"), 0.0, w, SHOP_H, SHOP_H + 0.35, 0.03, col=tcol)
        f.quad(k("trim"), 0.0, w, top - 0.5, top, 0.03, col=BLACK)
        f.box(k("neon_" + colour), 0.4, w - 0.4, top - 0.58, top - 0.5, 0.03, 0.09)
        if canopy:
            f.box(k("trim"), 0.3, w - 0.3, SHOP_H - 0.25, SHOP_H, 0.0, canopy, col=BLACK)
            f.box(k("neon_" + colour), 0.6, w - 0.6, SHOP_H - 0.31, SHOP_H - 0.25, canopy - 0.4, canopy - 0.3)
    elif kind == "dock":
        B.back_ground(CO, f, r, tcol)
        f.ledge(k("trim"), 0.0, w, SHOP_H, 0.25, 0.2, tcol)
    else:
        wall_front(f, top, r, tint, colour)


def showrooms(f, r, tint, colour, lobby=False):
    """A ground floor of showrooms along a face: glass set back behind
    pilasters, a room behind every bay (the street's shop glass, lit cool
    with a warm one now and then), a dark fascia with a line of light or a
    sign on it. `lobby`: a lobby's front: longer runs of glass, all cool,
    no shop signs."""
    w = f.width
    tcol = B.TRIM[tint]
    bays = max(1, round(w / CELL_W))
    bw = w / bays
    i = 0
    while i < bays:
        n = min(r.choice((3, 4, 4, 5) if lobby else (2, 2, 3, 3, 4)), bays - i)
        if bays - (i + n) == 1:
            n += 1
        a, b = i * bw, (i + n) * bw
        for e in (a, b):
            f.box(k("trim"), max(0.0, e - 0.2), min(w, e + 0.2), 0.0, SHOP_H, -B.REC - 0.02, B.PIL, col=tcol)
        cool = lobby or r.random() < 0.72
        # (A lobby's glass is held down: its front is its frame and its one colour.)
        lit = (r.uniform(0.3, 0.55) if lobby else r.uniform(0.55, 1.0), r.uniform(0.88, 1.0) if cool else r.uniform(0.0, 0.45), 1.0 if r.random() < 0.95 else 0.0, 1.0)
        f.quad(k("shop"), a + 0.2, b - 0.2, 0.55, 3.3, -B.REC, col=lit)
        f.quad(k("trim"), a + 0.2, b - 0.2, G0, 0.55, -B.REC + 0.01, col=BLACK)
        f.quad(k("trim"), a + 0.2, b - 0.2, 3.3, SHOP_H, 0.0, col=BLACK)
        f.box(k("trim"), a + 0.2, b - 0.2, 3.28, 3.3, -B.REC, 0.0, col=BLACK)
        mid = (a + b) / 2
        roll = 0.5 if lobby else r.random()
        if roll < 0.3 and b - a > 4.0:
            sw, sh = ST_SIZES["pm"]
            cx, cy, cz = f.p(f.at(mid), 3.95, 0.07)
            f.box(k("board_frame"), mid - sw / 2 - 0.06, mid + sw / 2 + 0.06, 3.95 - sh / 2 - 0.06, 3.95 + sh / 2 + 0.06, 0.0, 0.06)
            sign(st_id("pm"), cx, cy, cz, sw, sh, f.yaw, district=CO, label=False)
        elif roll < 0.8:
            f.box(k("neon_" + (colour if cool else "amber")), a + 0.5, b - 0.5, 3.36, 3.43, 0.0, 0.05)
        i += n


def wall_front(f, top, r, tint, colour):
    """A podium's wall onto a lane, not left blank: pilasters every bay and
    between them a lit vitrine, a door under louvres, a slot of light, or a
    small sign and a lamp; a ledge under its top."""
    w = f.width
    tcol = B.TRIM[tint]
    n = max(1, round(w / 6.4))
    bw = w / n
    for i in range(n + 1):
        e = min(max(i * bw, 0.22), w - 0.22)
        f.box(k("trim", 1), e - 0.22, e + 0.22, 0.0, top, 0.0, 0.14, col=tcol)
    for i in range(n):
        a, b = i * bw + 0.6, (i + 1) * bw - 0.6
        mid = (a + b) / 2
        if b - a < 2.0:
            continue
        roll = r.random()
        if roll < 0.32 and b - a > 3.6:
            f.box(k("trim"), mid - 1.75, mid + 1.75, 0.3, 3.55, 0.0, 0.1, col=BLACK)
            f.quad(k("shop"), mid - 1.5, mid + 1.5, 0.55, 3.3, 0.11, col=(r.uniform(0.6, 1.0), r.uniform(0.88, 1.0), 1.0, 1.0))
            lx, _, lz = f.p(f.at(mid), 0.0, 1.0)
            light(CO, lx, 2.0, lz, "cyan", 3.0)
        elif roll < 0.58:
            f.box(k("dark", 1), a, b, top * 0.5, top * 0.5 + 1.8, 0.0, 0.08)
            f.quad(k("door"), mid - 0.55, mid + 0.55, G0, 2.3, 0.03)
            f.box(k("metal", 1), mid - 0.63, mid + 0.63, 2.3, 2.4, 0.0, 0.12)
            hue = r.choice(("amber", "white", "cyan"))
            f.box(k("neon_" + hue), mid - 0.14, mid + 0.14, 2.56, 2.72, 0.05, 0.2)
            lx, _, lz = f.p(f.at(mid), 0.0, 0.8)
            light(CO, lx, 2.6, lz, hue, 3.0)
        elif roll < 0.8:
            f.box(k("neon_" + colour), mid - 0.06, mid + 0.06, 0.7, top - 1.0, 0.0, 0.05)
            lx, _, lz = f.p(f.at(mid), 0.0, 0.8)
            light(CO, lx, 3.0, lz, colour, 3.0)
        else:
            size = r.choice(("ps", "bx", "pm"))
            sw, sh = ST_SIZES[size]
            if b - a > sw + 0.4:
                cx, cy, cz = f.p(f.at(mid), 3.2, 0.08)
                f.box(k("board_frame"), mid - sw / 2 - 0.06, mid + sw / 2 + 0.06, 3.2 - sh / 2 - 0.06, 3.2 + sh / 2 + 0.06, 0.0, 0.07)
                sign(st_id(size), cx, cy, cz, sw, sh, f.yaw, district=CO, label=False)
    f.ledge(k("trim", 1), 0.0, w, top - 0.5, 0.2, 0.12, tcol)


def podium_walls(x0, x1, z0, z1, top, fronts, r, tint=1, colour="cyan", canopy=0.0, col=STONE):
    """A podium: its stone top, and each face a wall with its front (see
    front()); where shops or a back's doors stand in the wall it starts
    over them, and against a neighbour there is none."""
    quad(k("trim"), (x0, top, z1), (x1, top, z1), (x1, top, z0), (x0, top, z0), col=col)
    B.COLLISION.append(("box", x0, x1, 0.0, top, z0, z1, CO))
    for name, f in B.faces_of(x0, x1, z0, z1).items():
        kind = fronts.get(name, "blank")
        if kind == "none":
            continue
        f.quad(k("trim"), 0.0, f.width, SHOP_H if kind in ("shop", "dock", "glass") else 0.0, top, 0.0, col=col)
        front(f, top, kind, r, tint, colour, canopy if kind in ("glass", "shop") else 0.0)


def fins(f, y0, y1, step, out=0.45, wide=0.3, col=BLACK, detail=0, s0=0.0, s1=None):
    """Vertical fins standing out from a face (ax5YUmkWf_Y@39)."""
    s1 = f.width if s1 is None else s1
    n = max(1, round((s1 - s0) / step))
    for i in range(n + 1):
        s = s0 + (s1 - s0) * i / n
        f.box(k("trim", detail), s - wide / 2, s + wide / 2, y0, y1, 0.0, out, col=col)


def strip_v(x, z, y0, y1, colour, glow=True, w=0.09):
    """A vertical line of light (a tower's corner, a slot in a facade)."""
    if glow:
        glow_box(x - w, x + w, y0, y1, z - w, z + w, colour)
    else:
        neon_box(x - w, x + w, y0, y1, z - w, z + w, colour)


def storey_line(y):
    """The nearest curtain-wall floor line at or under y."""
    return BASE + STOREY * math.floor((y - BASE) / STOREY + 1e-6)


def corp_block(x0, x1, z0, z1, h, seed, skin="glass", tint="navy", base=BASE, tiers=((1.0, 0.0),), fronts=None,
               fin_step=0.0, fin_faces=("+z",), corners=None, edge="cyan", cap=6.0, podium=STONE, canopy=0.0,
               colour="cyan", lit=(0.5, 0.86), warm=(0.0, 0.45), style=5, top_band=None, terrace_rail=True, crown=True):
    """A corporate block: a stone podium to `base` with its fronts (see
    front()), a shaft in `tiers` ((fraction of the height it ends at, inset
    on every side from the podium), ...), glass or windows, optional fins
    and lines of light up its corners, a parapet drawn in light and a lit
    band under it. Returns the top tier's rectangle and height."""
    r = random.Random(seed)
    fronts = fronts or {}
    tnum = B.TINTS[tint]
    podium_walls(x0, x1, z0, z1, base, fronts, r, tnum, colour, canopy, podium)
    gcol = glass_col(r, lit, warm)
    wcol = B.wall_col(r.uniform(*lit), style, r.uniform(*warm), tnum)
    y = base
    prev = (x0, x1, z0, z1)
    out = None
    for ti, (frac, inset) in enumerate(tiers):
        y1 = base + (h - base) * frac
        ins = inset if isinstance(inset, tuple) else (inset, inset, inset, inset)   # -x, +x, -z, +z
        a0, a1, b0, b1 = x0 + ins[0], x1 - ins[1], z0 + ins[2], z1 - ins[3]
        last = ti == len(tiers) - 1
        if skin == "glass":
            glass(a0, a1, b0, b1, y, y1, gcol, roof=False)
        else:
            windows(a0, a1, b0, b1, y, y1, r, style=style, tint=tint, roof=False, col=wcol)
        # The roof under this tier (the terrace its inset leaves; the
        # podium's own top is stone) and a rail.
        if ti > 0:
            roof_quad(*prev, y)
        if ti > 0 or any(ins):
            B.ROOFS.append((CO, *prev, y))
            if terrace_rail:
                px0, px1, pz0, pz1 = prev
                if ins[3] > 1.2:
                    rail(px0 + 0.1, pz1 - 0.1, px1 - 0.1, pz1 - 0.1, y, colour, glow=y > 14)
                if ins[2] > 1.2:
                    rail(px0 + 0.1, pz0 + 0.1, px1 - 0.1, pz0 + 0.1, y, colour, glow=y > 14)
                if ins[0] > 1.2:
                    rail(px0 + 0.1, pz0 + 0.1, px0 + 0.1, pz1 - 0.1, y, colour, glow=y > 14)
                if ins[1] > 1.2:
                    rail(px1 - 0.1, pz0 + 0.1, px1 - 0.1, pz1 - 0.1, y, colour, glow=y > 14)
        if fin_step:
            for name, f in B.faces_of(a0, a1, b0, b1).items():
                if name in fin_faces:
                    fins(f, y, y1, fin_step, detail=0 if name == "+z" or name == "-z" else 1)
        if corners:
            for cx, cz in ((a0, b0), (a0, b1), (a1, b0), (a1, b1)):
                strip_v(cx, cz, y + 0.5, y1, corners)
        prev = (a0, a1, b0, b1)
        y = y1
        out = (a0, a1, b0, b1, y1)
    a0, a1, b0, b1, top = out
    roof_quad(a0, a1, b0, b1, top)
    B.ROOFS.append((CO, a0, a1, b0, b1, top))
    if crown:
        parapet(a0, a1, b0, b1, top, col=B.TRIM[tnum], edge=edge)
    if top_band:
        edge_line(a0, a1, b0, b1, top - 1.5, top_band, h=0.28, out=0.12)
    return out


def roof_plant(x0, x1, z0, z1, y, r, cap=5.0, density=1.0, lamps=True, tall=True):
    """What a corporate roof holds: packaged plant in rows, cooling drums,
    ducts between them, a stair hut with its door lit, dishes, a lamp on
    every corner; nothing over `cap`."""
    w, d = x1 - x0, z1 - z0
    if w < 6 or d < 6:
        return
    nx, nz = max(1, int(w // 8)), max(1, int(d // 8))
    plots = [(x0 + 1.4 + (i + 0.5) * (w - 2.8) / nx, z0 + 1.4 + (j + 0.5) * (d - 2.8) / nz, (w - 2.8) / nx, (d - 2.8) / nz)
             for i in range(nx) for j in range(nz)]
    r.shuffle(plots)
    used = []
    for n_, (px, pz, pw, pd) in enumerate(plots[:max(2, int(len(plots) * 0.7 * density))]):
        roll = r.random()
        if n_ == 0 and cap >= 2.6:
            hw, hd, hh = min(1.8, pw * 0.35), min(1.5, pd * 0.35), min(2.7, cap - 0.2)
            solid(px - hw, px + hw, y, y + hh, pz - hd, pz + hd, STONE)
            side = r.choice((-1, 1))
            dz = pz + side * (hd + 0.02)
            q = ((px - 0.45, y, dz), (px + 0.45, y, dz), (px + 0.45, y + 2.0, dz), (px - 0.45, y + 2.0, dz))
            quad(k("glow"), *(q if side > 0 else (q[1], q[0], q[3], q[2])), col=GLOW["amber"])
        elif roll < 0.4 and cap >= 2.4:
            chiller(px - pw * 0.36, px + pw * 0.36, pz - pd * 0.28, pz + pd * 0.28, y, h=min(2.2, cap - 0.3))
            used.append((px, pz))
        elif roll < 0.62 and cap >= 3.0 and min(pw, pd) > 4.0:
            rr = min(1.5, min(pw, pd) * 0.3)
            cooler(px - rr * 1.1, pz, y, r=rr, h=min(2.6, cap - 0.3))
            if pw > rr * 4.6:
                cooler(px + rr * 1.1, pz, y, r=rr, h=min(2.6, cap - 0.3))
            used.append((px, pz))
        elif roll < 0.78:
            for m in range(r.randrange(2, 4)):
                ax = px - pw * 0.3 + m * 1.7
                if ax + 0.7 < px + pw / 2:
                    P.place("ac_roof", ax, y, pz, 0.0, district=CO)
        elif roll < 0.9 and cap >= 2.2:
            P.place("dish", px, y, pz, r.uniform(0, 6.28), district=CO)
        elif tall and cap >= 5.0:
            P.place("antenna", px, y, pz, r.uniform(0, 3.14), sy=min(cap, 4.5 + r.random() * 2.5) / 6.0, district=CO)
    for a, b in zip(used, used[1:]):
        duct_run([(a[0], y + 0.5, a[1]), (b[0], y + 0.5, a[1]), (b[0], y + 0.5, b[1])], r=0.28)
    # Rooflights on a plot nothing stands on, and lamps along the walkway.
    spare = plots[max(2, int(len(plots) * 0.7 * density)):]
    for px, pz, pw, pd in spare[:2]:
        if min(pw, pd) > 3.0:
            roof_windows(px - pw * 0.34, px + pw * 0.34, pz - pd * 0.3, pz + pd * 0.3, y, n=2, colour=r.choice(("white", "amber", "cyan")))
    if plots:
        light(CO, plots[0][0], y + 2.0, plots[0][1], "amber", 3.0)
    if lamps:
        for cx, cz in ((x0 + 0.2, z0 + 0.2), (x0 + 0.2, z1 - 0.2), (x1 - 0.2, z0 + 0.2), (x1 - 0.2, z1 - 0.2)):
            aviation(cx, y + 1.0, cz)


# ---------------------------------------------------------------------------
# Roofs at night, from the air: what reads is light.
# ---------------------------------------------------------------------------
def roof_lights(x0, x1, z0, z1, y, colour="amber", step=6.0, inset=1.0, pool=2.0):
    """Marker lamps round a roof's walkway, each a small pool of light."""
    pts = []
    x = x0 + inset
    while x <= x1 - inset + 1e-6:
        pts += [(x, z0 + inset), (x, z1 - inset)]
        x += step
    z = z0 + inset + step
    while z <= z1 - inset - step + 1e-6:
        pts += [(x0 + inset, z), (x1 - inset, z)]
        z += step
    for i, (px, pz) in enumerate(pts):
        glow_box(px - 0.1, px + 0.1, y, y + 0.34, pz - 0.1, pz + 0.1, colour, 1)
        if i % 2 == 0:
            light(CO, px, y + 0.5, pz, colour, pool)


def roof_windows(x0, x1, z0, z1, y, n=3, colour="white", dim=0.22):
    """Strip rooflights in a row: glass lit from the floor under, in dark
    kerbs. From the air a roof with people under it."""
    c = GLOW[colour]
    m = max(c[:3]) or 1.0
    col = (0.25 + 0.6 * c[0] / m, 0.25 + 0.6 * c[1] / m, 0.25 + 0.6 * c[2] / m, 1.0)     # (the skylight material: bars and panes, tinted)
    along_x = x1 - x0 >= z1 - z0
    for i in range(n):
        if along_x:
            a = z0 + (z1 - z0) * (i + 0.2) / n
            b = z0 + (z1 - z0) * (i + 0.8) / n
            ax0, ax1, az0, az1 = x0, x1, a, b
        else:
            a = x0 + (x1 - x0) * (i + 0.2) / n
            b = x0 + (x1 - x0) * (i + 0.8) / n
            ax0, ax1, az0, az1 = a, b, z0, z1
        solid(ax0 - 0.15, ax1 + 0.15, y, y + 0.3, az0 - 0.15, az1 + 0.15, BLACK)
        quad(k("skylight"), (ax0, y + 0.31, az1), (ax1, y + 0.31, az1), (ax1, y + 0.31, az0), (ax0, y + 0.31, az0), col=col)
        light(CO, (ax0 + ax1) / 2, y + 1.0, (az0 + az1) / 2, colour, 2.5)


def steam(name, x, y, z, roof=False):
    """A vent that breathes steam (src/world/steam.js draws one for every
    empty of this name; the roof kind rises higher)."""
    empty(f"anchor_steam_{'roof_' if roof else ''}corpo_{name}", (x, y, z))


def tubes_over(a, b, z0, z1, y, hue, step=9.0, along="z", power=3.0):
    """Tubes of light slung across a lane (a, b its two walls) every `step`
    metres from z0 to z1 (or along x, swapped)."""
    v = z0
    while v <= z1 + 1e-6:
        if along == "z":
            neon_box(a + 0.2, b - 0.2, y, y + 0.08, v - 0.04, v + 0.04, hue, 1)
            light(CO, (a + b) / 2, y - 0.8, v, hue, power)
        else:
            neon_box(v - 0.04, v + 0.04, y, y + 0.08, a + 0.2, b - 0.2, hue, 1)
            light(CO, v, y - 0.8, (a + b) / 2, hue, power)
        v += step


def services(f, r, top=9.0, density=1.0):
    """A wall's services, so a lane's wall is a back and not a plane: pipes
    in twos and threes from the ground to the parapet, air conditioners in
    rows and stacks, a duct on brackets, conduit run to a box with a lamp
    on it, a small sign."""
    w = f.width
    s = r.uniform(0.8, 2.5)
    while s < w - 1.2:
        roll = r.random()
        if roll < 0.12 and s + 4.4 < w - 0.6:
            # A shuttered bay framed in hazard yellow, a lamp over it.
            f.box(k("trim"), s, s + 4.0, 0.0, 4.2, 0.0, 0.12, col=BLACK)
            f.quad(k("door_panel"), s + 0.35, s + 3.65, G0, 3.7, 0.13)
            for a, b in ((s, s + 0.35), (s + 3.65, s + 4.0)):
                f.box(k("trim", 1), a, b, G0, 3.7, 0.12, 0.17, col=YELLOW)
            f.box(k("trim", 1), s, s + 4.0, 3.7, 4.05, 0.12, 0.17, col=YELLOW)
            hue = r.choice(("amber", "red", "white"))
            f.box(k("neon_" + hue), s + 1.7, s + 2.3, 4.3, 4.46, 0.0, 0.2)
            lx, _, lz = f.p(f.at(s + 2.0), 0.0, 1.4)
            light(CO, lx, 3.6, lz, hue, 5.0)
            s += 4.0
        elif roll < 0.2 and s + 3.0 < w - 0.6 and top > 7.0:
            # Louvres with light behind them.
            c = GLOW[r.choice(("amber", "cyan"))]
            f.box(k("glow"), s, s + 2.6, 5.0, 6.6, 0.0, 0.03, col=(c[0] * 0.2, c[1] * 0.2, c[2] * 0.2, 1.0))
            for i in range(7):
                f.box(k("dark", 1), s - 0.05, s + 2.65, 5.0 + i * 0.24, 5.12 + i * 0.24, 0.0, 0.1)
            s += 2.6
        elif roll < 0.4:
            for n in range(r.randrange(1, 4)):
                px, _, pz = f.p(f.at(s + n * 0.26), 0.0, 0.0)
                P.place("pipe_v", px, G0, pz, f.yaw, sy=max(3.0, top - 0.4 - r.uniform(0.0, 1.5)), district=CO)
            f.box(k("metal", 1), s - 0.1, s + 0.75, 1.6, 1.68, 0.0, 0.22)
            s += 0.6
        elif roll < 0.58:
            n = r.randrange(1, 4)
            stack = r.random() < 0.4
            row = r.choice((4.4, 5.5, 6.5))
            for m in range(n):
                ax, ay, az = f.p(f.at(s + (0.0 if stack else m * 1.1)), min(top - 1.0, (5.0 + m * 0.9) if stack else row), 0.0)
                P.place("ac_wall", ax, ay, az, f.yaw, district=CO)
            s += 0.5 if stack else n * 1.1
        elif roll < 0.74 and s + 4.2 < w - 0.5:
            length = min(r.uniform(4.0, 9.0), w - 0.6 - s)
            yy = min(top - 1.2, r.choice((5.4, 6.4, 7.2)))
            f.box(k("steel", 1), s, s + length, yy, yy + 0.55, 0.06, 0.62, col=STEEL)
            for d in (0.4, length - 0.4):
                f.box(k("metal", 1), s + d - 0.04, s + d + 0.04, yy - 0.45, yy, 0.0, 0.5)
            f.box(k("dark", 1), s + length - 0.5, s + length - 0.1, yy + 0.1, yy + 0.45, 0.62, 0.64)
            s += length
        elif roll < 0.88 and s + 3.2 < w - 0.5:
            length = min(r.uniform(3.0, 7.0), w - 0.6 - s)
            yy = r.uniform(3.6, 4.2)
            for dy in (0.0, 0.09, 0.18):
                f.box(k("metal", 1), s, s + length, yy + dy, yy + dy + 0.04, 0.0, 0.05)
            f.box(k("trim", 1), s + length - 0.5, s + length, yy - 1.0, yy - 0.3, 0.0, 0.16, col=STEEL)
            f.box(k("glow", 1), s + length - 0.2, s + length - 0.13, yy - 0.52, yy - 0.45, 0.16, 0.18, col=GLOW[r.choice(("green", "amber", "red"))])
            s += length
        else:
            size = r.choice(("ps", "bs", "bx"))
            sw, sh = ST_SIZES[size]
            if s + sw < w - 0.4 and 5.0 + sh < top:
                cx, cy, cz = f.p(f.at(s + sw / 2), 5.0 + sh / 2, 0.08)
                f.box(k("board_frame"), s - 0.06, s + sw + 0.06, 5.0 - 0.06, 5.0 + sh + 0.06, 0.0, 0.07)
                sign(st_id(size), cx, cy, cz, sw, sh, f.yaw, district=CO, label=False)
            s += sw
        s += r.uniform(2.2, 4.5) / density


def risers(f, r, y0, y1):
    """A tall back's upper wall: service risers in steel from y0 to the
    top, air conditioners in columns floor by floor beside them, a slot of
    stair light."""
    w = f.width
    n = max(1, round(w / 13.0))
    for i in range(n):
        s = w * (i + 0.5) / n + r.uniform(-2.5, 2.5)
        rw = r.uniform(0.7, 1.3)
        f.box(k("steel"), s, s + rw, y0, y1 - r.uniform(0.5, 2.5), 0.0, 0.6, col=STEEL)
        side = r.choice((-1, 1))
        y = y0 + 1.5
        while y < y1 - 2.0:
            if r.random() < 0.6:
                ax, ay, az = f.p(f.at(s + (rw + 0.7 if side > 0 else -0.7)), y, 0.0)
                P.place("ac_wall", ax, ay, az, f.yaw, district=CO)
            y += 3.4
        hue = r.choice(("amber", "cyan", "white"))
        c = GLOW[hue]
        t = s - side * 2.2
        if 0.6 < t < w - 0.6:
            f.box(k("glow"), t - 0.1, t + 0.1, y0 + 1.0, y1 - 2.0, 0.0, 0.04, col=(c[0] * 0.3, c[1] * 0.3, c[2] * 0.3, 1.0))


def advert(cx, cy, cz, w, h, yaw, pick, seed=0.31, depth=0.12):
    """One of the city's adverts by number (eight wide, four tall), in a
    frame: boards sharing a seed change together, so a wall of them given
    different numbers never shows one advert twice."""
    bb(cx, cy, cz, w, h, yaw, (0.06, (pick % 8 + 0.5) / 8.0, seed, 1.0))
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box(k("board_frame"), cx - nx * (depth / 2 + 0.02), cy, cz - nz * (depth / 2 + 0.02), w + 0.3, h + 0.3, depth, yaw, scale=1.0)


def skin(p0, p1, y0, y1, r, seed, lit=(0.25, 0.55), hot=0.38, warm=(0.7, 1.0), force=None, belts=(), bright=(0.75, 1.0), detail=0):
    """Curtain wall from the outline p0 at y0 to p1 at y1 (the same count of
    points: a battered wall if they differ), in panels about three floors
    by 9 m. The corporate shader draws floors and rooms from world position;
    a panel's colour is its share of lit floors, its warmth and the
    building's seed. Each run of three floors along a face has a share of
    its own (`hot` of them nearly all lit, the rest somewhere in `lit`) and
    each panel in it a little more or less, so a face is lit in runs of
    floors, not in spots. `belts`: (ya, yb) bands lit from end to end, a sky
    lobby's floors. `force`: {edge: (lit, warm)} for a whole edge."""
    spans, y = [], y0
    for ba, bb_ in sorted(belts):
        ba, bb_ = max(ba, y0), min(bb_, y1)
        if bb_ - ba < 1.0 or ba < y - 1e-6:
            continue
        if ba - y > 1.0:
            spans.append((y, ba, False))
        else:
            ba = y
        spans.append((ba, bb_, True))
        y = bb_
    if y1 - y > 1.0 or not spans:
        spans.append((y, y1, False))
    else:
        spans[-1] = (spans[-1][0], y1, spans[-1][2])
    rows = []
    for ya, yb, belt in spans:
        nb = 1 if belt else max(1, round((yb - ya) / (STOREY * 3)))
        rows += [(ya + (yb - ya) * v / nb, ya + (yb - ya) * (v + 1) / nb, belt) for v in range(nb)]
    n = len(p0)
    for i in range(n):
        a0, b0, a1, b1 = p0[i], p0[(i + 1) % n], p1[i], p1[(i + 1) % n]
        length = math.hypot(b0[0] - a0[0], b0[1] - a0[1])
        m = max(1, round(length / 9.0))

        def pt(f, y_):
            g = (y_ - y0) / (y1 - y0)
            xa, za = a0[0] + (a1[0] - a0[0]) * g, a0[1] + (a1[1] - a0[1]) * g
            xb, zb = b0[0] + (b1[0] - b0[0]) * g, b0[1] + (b1[1] - b0[1]) * g
            return (xa + (xb - xa) * f, y_, za + (zb - za) * f)

        for ya, yb, belt in rows:
            base = r.uniform(*bright) if r.random() < hot else r.uniform(*lit)
            for j in range(m):
                if force and i in force:
                    c = (force[i][0], force[i][1], seed, 1.0)
                elif belt:
                    c = (1.0, max(warm[1], 0.9), seed, 1.0)
                else:
                    c = (min(1.0, max(0.02, base + r.uniform(-0.12, 0.12))), r.uniform(*warm), seed, 1.0)
                quad(k("corporate", detail), pt(j / m, ya), pt((j + 1) / m, ya), pt((j + 1) / m, yb), pt(j / m, yb),
                     ((0, 0), (length / m, 0), (length / m, yb - ya), (0, yb - ya)), c)


def floor_at(n):
    """The height of the curtain wall's n-th floor line."""
    return BASE + STOREY * n


# The street's large blades and light boxes that a tower's face can carry
# many times their size: the design and the colour its tubes are.
WORDS = {"bl": ((1, "magenta"), (4, "cyan"), (8, "cyan"), (10, "teal"), (11, "yellow"), (14, "green"), (7, "blue")),
         "bm": ((5, "green"), (9, "blue"), (21, "blue"), (16, "cyan"), (15, "magenta")),
         "bx": ((13, "cyan"), (14, "yellow"), (3, "blue"), (22, "white"), (25, "magenta"), (19, "blue"), (27, "green"), (10, "purple"), (8, "yellow"))}


def big_sign(cx, cy, cz, size, scale, yaw, pick, depth=0.05, lines=True, detail=0):
    """One of the street's sign designs many times its size on a tower's
    face, in a dark frame with a line of its own light down each edge: a
    column of characters or a mark, read from across the boulevard."""
    n, hue = WORDS[size][pick % len(WORDS[size])]
    w, h = ST_SIZES[size][0] * scale, ST_SIZES[size][1] * scale
    nx, nz = math.sin(yaw), math.cos(yaw)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    oriented_box(k("board_frame", detail), cx - nx * (depth / 2 + 0.01), cy, cz - nz * (depth / 2 + 0.01), w + 0.5, h + 0.5, depth, yaw, scale=1.0)
    sign(f"st_{size}_{n}", cx + nx * 0.012, cy, cz + nz * 0.012, w, h, yaw, district=CO, label=False)
    if lines:
        c = GLOW[hue]
        for s_ in (-1, 1):
            rotated_quad(k("glow", detail), cx + rx * s_ * (w / 2 + 0.16) + nx * 0.014, cy, cz + rz * s_ * (w / 2 + 0.16) + nz * 0.014, 0.1, h + 0.3, yaw,
                         col=(c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 1.0))
    return w, h


# ---------------------------------------------------------------------------
# A lobby's front: a dark frame, one colour of light, a raised mark.
# ---------------------------------------------------------------------------
# The seven houses' own colours (src/data/experience.js, the colour the site
# lights each crown in) and the nearest of the city's lamp colours, for the
# pool a lobby's light leaves on its forecourt.
BRAND = (("4FC3F7", "cyan", 1.0), ("98F8C8", "green", 0.9), ("ECEAE4", "amber", 0.5), ("FF9900", "amber", 1.0), ("B5B606", "yellow", 1.0), ("F52333", "red", 1.0),
         ("C8102E", "red", 1.0))        # (the third's is white: held down, a lobby is not a white box)
FRAME = (0.03, 0.032, 0.04, 1)       # a lobby's dark frame


def brand(i, dim=1.0):
    c = rgb(BRAND[i % len(BRAND)][0])
    dim *= BRAND[i % len(BRAND)][2]
    return (c[0] * dim, c[1] * dim, c[2] * dim, 1.0)


def bar2d(cx, cy, cz, yaw, a, b, wide, depth, col, side=0.3, detail=0):
    """A bar of light raised off a face: from a to b ((across, up) metres
    from the face's point (cx, cy, cz), which looks along yaw), `wide` and
    standing `depth` out; its face in `col`, its sides dimmer, so it reads
    as cut metal with a lit front and not as paint."""
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    du, dv = b[0] - a[0], b[1] - a[1]
    ln = math.hypot(du, dv) or 1.0
    pu, pv = -dv / ln * wide / 2, du / ln * wide / 2
    cs = [(a[0] - pu, a[1] - pv), (b[0] - pu, b[1] - pv), (b[0] + pu, b[1] + pv), (a[0] + pu, a[1] + pv)]

    def at(u, v, w):
        return (cx + rx * u + nx * w, cy + v, cz + rz * u + nz * w)

    if (cs[1][0] - cs[0][0]) * (cs[2][1] - cs[1][1]) - (cs[1][1] - cs[0][1]) * (cs[2][0] - cs[1][0]) < 0:
        cs = cs[::-1]
    quad(k("glow", detail), *(at(u, v, depth) for u, v in cs), col=col)
    sc = (col[0] * side, col[1] * side, col[2] * side, 1.0)
    for j in range(4):
        (u0, v0), (u1, v1) = cs[j], cs[(j + 1) % 4]
        quad(k("glow", detail), at(u0, v0, 0.0), at(u1, v1, 0.0), at(u1, v1, depth), at(u0, v0, depth), col=sc)


def mark3d(which, cx, cy, cz, size, yaw, col, depth=0.22, detail=0):
    """A house's mark, raised and lit, `size` high: 0 a broken ring round a
    dot, 1 three bars stepping up, 2 a diamond round a dot, 3 two rings
    linked (the marks the site's lobby wall carries, by tower)."""
    s = size / 2
    t = size * 0.11

    def ring(ox, rad, skip=()):
        n = 10
        for j in range(n):
            if j in skip:
                continue
            a0, a1 = j * math.tau / n, (j + 1) * math.tau / n
            bar2d(cx, cy, cz, yaw, (ox + rad * math.cos(a0), rad * math.sin(a0)), (ox + rad * math.cos(a1), rad * math.sin(a1)), t, depth, col, detail=detail)

    which %= 4
    if which == 0:
        ring(0.0, s * 0.86, skip=(1, 6))
        bar2d(cx, cy, cz, yaw, (-t * 0.9, 0.0), (t * 0.9, 0.0), t * 1.8, depth, col, detail=detail)
    elif which == 1:
        for j in range(3):
            u = (j - 1) * s * 0.62
            bar2d(cx, cy, cz, yaw, (u, -s), (u, -s + size * (0.45 + 0.275 * j)), s * 0.4, depth, col, detail=detail)
    elif which == 2:
        pts = ((0.0, s), (s * 0.82, 0.0), (0.0, -s), (-s * 0.82, 0.0))
        for j in range(4):
            bar2d(cx, cy, cz, yaw, pts[j], pts[(j + 1) % 4], t, depth, col, detail=detail)
        bar2d(cx, cy, cz, yaw, (-t * 0.9, 0.0), (t * 0.9, 0.0), t * 1.8, depth, col, detail=detail)
    else:
        ring(-s * 0.42, s * 0.62)
        ring(s * 0.42, s * 0.62)


def door_portal(f, s, colour, which, half=2.6, top=5.6, out=0.34, wings=0.0):
    """A way in, built on a face s metres along it: a dark surround standing
    out of the wall to `top`, doors of dark glass in it with a seam of light
    between them, a line of the house's one colour up either side of them
    and across over them, the house's mark raised over that and lit, and
    its pool of that colour on the pavement. `wings`: this much more
    surround either side, a panel of dim light behind dark bars in each."""
    c = GLOW[colour]
    f.box(k("trim"), s - half - wings, s + half + wings, 0.0, top, 0.02, out, col=FRAME)
    dw = min(1.5, half - 0.9)
    # Two leaves of glass with the hall's light dim behind them, each in
    # its frame, a push bar across it and a kick plate at its foot.
    inside = (c[0] * 0.07 + 0.012, c[1] * 0.07 + 0.012, c[2] * 0.07 + 0.014, 1.0)
    for e in (-1, 1):
        a, b = sorted((s + e * 0.04, s + e * dw))
        f.quad(k("glow"), a, b, G0, 2.8, out + 0.012, col=inside)
        f.quad(k("glass_dark", 1), a + 0.1, b - 0.1, G0 + 0.3, 2.66, out + 0.02)
        for u in (a, b - 0.08):
            f.box(k("trim", 1), u, u + 0.08, G0, 2.8, out + 0.012, out + 0.06, col=BLACK)
        f.box(k("trim", 1), a, b, 2.7, 2.8, out + 0.012, out + 0.06, col=BLACK)
        f.box(k("trim", 1), a, b, G0, G0 + 0.3, out + 0.012, out + 0.06, col=STEEL)
        f.box(k("metal", 1), a + 0.14, b - 0.14, G0 + 1.0, G0 + 1.06, out + 0.06, out + 0.11)
    for e in (-1, 1):
        f.box(k("glow"), s + e * (dw + 0.25) - 0.04, s + e * (dw + 0.25) + 0.04, G0 + 0.2, 3.0, out, out + 0.05, col=c)
    f.box(k("glow"), s - dw - 0.29, s + dw + 0.29, 3.0, 3.08, out, out + 0.05, col=c)
    size = min(1.7, top - 3.75)
    px, _, pz = f.p(f.at(s), 0.0, out)
    mark3d(which, px, (3.08 + top) / 2 + 0.02, pz, size, f.yaw, c, depth=0.16)
    for e in (-1, 1) if wings else ():
        m = s + e * (half + wings / 2)
        f.box(k("glow"), m - wings / 2 + 0.3, m + wings / 2 - 0.3, 0.7, top - 0.9, out, out + 0.02, col=(c[0] * 0.16, c[1] * 0.16, c[2] * 0.16, 1.0))
        n = max(2, round((wings - 0.6) / 0.5))
        for j in range(n + 1):
            u = m - wings / 2 + 0.3 + (wings - 0.6) * j / n
            f.box(k("trim", 1), u - 0.05, u + 0.05, 0.7, top - 0.9, out + 0.02, out + 0.1, col=FRAME)
    lx, _, lz = f.p(f.at(s), 0.0, 1.4)
    light(CO, lx, 2.6, lz, colour, 4.5)


def fin_screen(f, s0, s1, y0, y1, step=1.1, wide=0.24, out0=0.12, out1=0.6, col=FRAME, detail=0):
    """Dark fins standing before a lit wall of glass, from s0 to s1 along a
    face: what is behind shows in slivers."""
    n = max(1, round((s1 - s0) / step))
    for j in range(n + 1):
        s = s0 + (s1 - s0) * j / n
        f.box(k("trim", detail), s - wide / 2, s + wide / 2, y0, y1, out0, out1, col=col)


GREENS = ((0.016, 0.055, 0.028, 1), (0.024, 0.07, 0.028, 1), (0.016, 0.046, 0.036, 1), (0.032, 0.064, 0.022, 1))


def shrubs(xa, xb, zc, y, r, spread=0.3, hmax=0.55):
    """Planting along a strip: shrubs in clusters of two to four, each a
    low mound of seven sides and a smaller one on it, in four dark greens,
    blades of a taller grass standing among them, gaps between."""
    x = xa
    while x < xb - 0.4:
        for _ in range(r.randrange(2, 5)):
            if x > xb - 0.4:
                break
            rad = r.uniform(0.26, 0.46)
            h = r.uniform(hmax * 0.45, hmax)
            cz = zc + r.uniform(-spread, spread)
            col = r.choice(GREENS)
            cylinder(k("trim"), x, cz, y, y + h, rad, segs=7, col=col)
            cylinder(k("trim", 1), x + r.uniform(-0.1, 0.1), cz + r.uniform(-0.1, 0.1), y + h, y + h + rad * 0.45, rad * 0.6, segs=5,
                     col=tuple(c * 1.3 for c in col[:3]) + (1,))
            x += rad * r.uniform(1.3, 1.9)
        # Grass: thin blades, leaning.
        gx, gz = x + 0.2, zc + r.uniform(-spread, spread)
        for _ in range(3):
            yaw = r.uniform(0.0, math.pi)
            lean = r.uniform(-0.12, 0.12)
            hh = hmax * r.uniform(0.9, 1.5)
            for turn in (0.0, math.pi):
                rotated_quad(k("trim", 1), gx + lean, y + hh / 2, gz, 0.1, hh, yaw + turn, col=(0.03, 0.08, 0.03, 1))
            gx += 0.12
        x += r.uniform(0.4, 1.2)


def block_seat(x, z, w=1.8, yaw=0.0, hue=None):
    """A block of cast concrete to sit on, a line of light under its edge."""
    oriented_box(k("castconcrete"), x, G0 + 0.24, z, w, 0.48, 0.6, yaw, scale=1.0, col=(0.22, 0.22, 0.22, 1.0))
    if hue:
        oriented_box(k("neon_" + hue, 1), x, G0 + 0.04, z, w - 0.1, 0.04, 0.64, yaw, scale=1.0)


def lane_dress(f, r, density=1.0, hues=("cyan", "amber", "white"), top=9.0, high=0.0):
    """What a lane's wall carries between its doors, so no stretch of it is
    dark or bare: vending machines lit cyan and amber, posters in frames,
    bulkhead lamps, a pipe run with indicator lamps, crates and bins; each
    lit thing a pool of light on the lane."""
    w = f.width
    # A lamp high on the wall every few metres, washing it and the lane, so
    # no stretch between the lit things is black.
    s = r.uniform(2.0, 4.5)
    j = r.randrange(3)
    while s < w - 1.0:
        hue = hues[j % len(hues)]
        f.box(k("neon_" + hue, 1), s - 0.16, s + 0.16, 4.72, 4.86, 0.03, 0.2)
        f.box(k("metal", 1), s - 0.2, s + 0.2, 4.86, 4.92, 0.0, 0.24)
        lx, _, lz = f.p(f.at(s), 0.0, 0.9)
        light(CO, lx, 4.2, lz, hue, 3.0)
        s += r.uniform(6.5, 8.5)
        j += 1
    s = r.uniform(1.5, 4.0)
    while s < w - 1.8:
        roll = r.random()
        px, _, pz = f.p(f.at(s), 0.0, 0.46)
        lx, _, lz = f.p(f.at(s), 0.0, 1.5)
        if roll < 0.2:
            P.place("vending" if r.random() < 0.6 else "vending_warm", px, G0, pz, f.yaw, district=CO)
            if r.random() < 0.6 and s + 1.2 < w - 1.0:
                qx, _, qz = f.p(f.at(s + 1.08), 0.0, 0.46)
                P.place("vending_warm" if r.random() < 0.5 else "vending", qx, G0, qz, f.yaw, district=CO)
            light(CO, lx, 1.4, lz, "cyan", 4.0)
        elif roll < 0.42:
            pw, ph = r.choice(((1.3, 1.9), (1.3, 1.9), (2.4, 1.5)))
            cx, cy, cz = f.p(f.at(s), 2.3, 0.09)
            f.box(k("board_frame"), s - pw / 2 - 0.07, s + pw / 2 + 0.07, 2.3 - ph / 2 - 0.07, 2.3 + ph / 2 + 0.07, 0.0, 0.08)
            bb(cx, cy, cz, pw, ph, f.yaw, board_col(r, None))
            light(CO, lx, 2.0, lz, r.choice(hues), 3.0)
        elif roll < 0.64:
            hue = r.choice(hues)
            f.box(k("neon_" + hue), s - 0.22, s + 0.22, 3.2, 3.38, 0.04, 0.24)
            f.box(k("metal", 1), s - 0.26, s + 0.26, 3.38, 3.45, 0.0, 0.28)
            light(CO, lx, 3.0, lz, hue, 5.0)
        elif roll < 0.8 and s + 5.0 < w - 0.5:
            f.box(k("metal", 1), s, s + 5.0, 3.7, 3.95, 0.03, 0.3)
            f.box(k("metal", 1), s, s + 5.0, 4.1, 4.22, 0.03, 0.18)
            for d, hue in ((0.6, "green"), (2.4, "amber"), (4.2, "red")):
                f.box(k("glow", 1), s + d, s + d + 0.1, 3.78, 3.88, 0.3, 0.32, col=GLOW[hue])
            s += 3.0
        else:
            P.place(r.choice(("crates", "bags", "bin", "drum", "dumpster")), px, G0, pz, f.yaw, district=CO)
        s += r.uniform(4.0, 7.5) / density
    services(f, r, top, density)
    if high > top + 6.0:
        risers(f, r, top + 1.0, high)


def holo_sign(x, z, yaw, r, hue="cyan", y=7.4, size=3.4, n=None, base=G0):
    """A sign on a pole drawn in light, a hexagon with a pictogram in it
    (the hexagonal sign over the forecourt in YRL74JmhVgk@30, without its
    words): two rings of tube, bars like lines of type under the mark, the
    same on both faces."""
    cylinder(k("metal"), x, z, base, y - size / 2 - 0.2, 0.09, segs=6)
    cylinder(k("metal"), x, z, base, base + 0.5, 0.2, segs=6)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    col = GLOW[hue]
    dim = (col[0] * 0.45, col[1] * 0.45, col[2] * 0.45, 1.0)

    def at(u, v, w=0.0):
        return (x + rx * u + nx * w, y + v, z + rz * u + nz * w)

    for rad, c, rr in ((size / 2, col, 0.055), (size / 2 - 0.28, dim, 0.035)):
        pts = [(rad * math.cos(math.radians(60 * i)), rad * math.sin(math.radians(60 * i)) * 0.92) for i in range(6)]
        for (u0, v0), (u1, v1) in zip(pts, pts[1:] + pts[:1]):
            pipe(k("glow"), at(u0, v0), at(u1, v1), rr, segs=4, col=c)
    sw = size * 0.42
    sid = st_id("bx", n)
    for s_, ang in ((1, yaw), (-1, yaw + math.pi)):
        sign(sid if s_ > 0 else sid + "_b", x + nx * 0.05 * s_, y + size * 0.1, z + nz * 0.05 * s_, sw, sw, ang, district=CO, label=False)
    for j, wd in enumerate((0.5, 0.32)):
        v = -size * 0.22 - j * 0.24
        pipe(k("glow"), at(-size * wd / 2, v), at(size * wd / 2, v), 0.04, segs=4, col=dim)
    light(CO, x + nx * 1.5, 3.0, z + nz * 1.5, hue, 4.0)
    light(CO, x - nx * 1.5, 3.0, z - nz * 1.5, hue, 4.0)
