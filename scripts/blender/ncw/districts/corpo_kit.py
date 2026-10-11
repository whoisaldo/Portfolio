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
# in this district moves the street's own count (kit.st_name).
_names = random.Random(60606)


def st_id(size):
    return f"st_{size}_{_names.randrange(1009)}"


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


def glass_col(r, lit=(0.45, 0.8), warm=(0.0, 0.45)):
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


def screen(cx, cy, cz, w, h, yaw, r, frame=True, depth=0.3, back=False):
    """A flat screen: an advert with no words in a dark steel frame."""
    B.billboard(CO, cx, cy, cz, w, h, yaw, r, frame=frame, back=back, depth=depth)


def screen_stack(cx, cz, y0, w, heights, yaw, r, gap=0.5, depth=0.3):
    """Screens stacked one over another up a face (the far city's screen
    towers, in small)."""
    y = y0
    for h in heights:
        screen(cx, y + h / 2, cz, w, h, yaw, r, depth=depth)
        y += h + gap
    return y


def st_blade(x, y, z, size, yaw, bracket=None):
    """One of the street's standard signs as a blade: both faces painted,
    in its frame, turned any way (`yaw` is the way its first face looks)."""
    w, h = ST_SIZES[size]
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box(k("board_frame"), x, y, z, w + 0.12, h + 0.14, 0.16, yaw, scale=1.0)
    sid = st_id(size)
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


def totem(x, z, yaw, r, h=5.2, colour="cyan", sizes=("bx", "ps", "ps")):
    """A freestanding sign pylon on a forecourt: a dark slab on a foot, a
    line of light up each edge, standard signs on both faces."""
    oriented_box(k("trim"), x, G0 + h / 2, z, 1.5, h, 0.32, yaw, scale=1.0, col=BLACK)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    for s in (-1, 1):
        oriented_box(k("neon_" + colour), x + rx * s * 0.78, G0 + h / 2, z + rz * s * 0.78, 0.06, h - 0.3, 0.34, yaw, scale=1.0)
    nx, nz = math.sin(yaw), math.cos(yaw)
    y = G0 + h - 0.5
    for size in sizes:
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
    for p, q in (((xa, za), (xb, zb)), ((xb, zb), (xa, za))):
        quad(k("glass_dark", 1), (p[0], y, p[1]), (q[0], y, q[1]), (q[0], y + h, q[1]), (p[0], y + h, p[1]))
    dx, dz = xb - xa, zb - za
    key = k("glow") if glow else k("neon_" + colour)
    oriented_box(key, (xa + xb) / 2, y + h + 0.03, (za + zb) / 2, math.hypot(dx, dz), 0.06, 0.08, math.atan2(-dz, dx), scale=1.0,
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
    oriented_box(k("neon_" + colour, 1), x, G0 + h + 0.04, z, w + 0.1, 0.06, d + 0.1, yaw, scale=1.0)
    light(CO, x + nx * 1.4, 1.4, z + nz * 1.4, colour, 3.0)


def booth(x, z, yaw, r):
    """A security booth: glazed above the sill and lit inside, a flat roof
    with a lamp under its eave, a camera on it."""
    oriented_box(k("trim"), x, G0 + 0.5, z, 2.0, 1.0, 1.6, yaw, scale=1.0, col=STONE)
    oriented_box(k("trim"), x, G0 + 2.5, z, 2.3, 0.14, 1.9, yaw, scale=1.0, col=BLACK)
    nx, nz = math.sin(yaw), math.cos(yaw)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    for ang, off, w in ((yaw, 0.8, 1.9), (yaw + math.pi, 0.8, 1.9), (yaw + math.pi / 2, 1.0, 1.5), (yaw - math.pi / 2, 1.0, 1.5)):
        ax, az = math.sin(ang), math.cos(ang)
        rotated_quad(k("neon_white"), x + ax * off, G0 + 1.7, z + az * off, w, 1.35, ang)
    for sx in (-1, 1):
        for sz in (-1, 1):
            oriented_box(k("metal", 1), x + rx * sx * 0.97 + nx * sz * 0.77, G0 + 1.7, z + rz * sx * 0.97 + nz * sz * 0.77, 0.08, 1.4, 0.08, yaw, scale=0.5)
    glow_box(x - 0.06, x + 0.06, G0 + 2.57, G0 + 2.7, z - 0.06, z + 0.06, "red", 1)
    light(CO, x + nx * 1.6, 1.6, z + nz * 1.6, "white", 3.0)


def tube_post(x, z, yaw, colour="white", h=6.2, arm=1.5):
    """A tall forecourt lamp: a slim post carrying horizontal tubes
    (BnnbP7pCIvQ@43, layout only)."""
    cylinder(k("metal"), x, z, G0, G0 + h, 0.07, segs=6)
    for j, y in enumerate((h - 0.3, h - 1.0)):
        oriented_box(k("neon_" + colour), x, G0 + y, z, arm * 2 - j * 0.5, 0.09, 0.09, yaw, scale=1.0)
    light(CO, x, h - 1.2, z, colour, 5.0)


def light_strip_ground(x0, x1, z0, z1, colour="cyan", y=G0 + 0.012):
    """A line of light set into the paving."""
    quad(k("glow"), (x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0), col=GLOW[colour])


def stripes(x0, x1, z0, z1, y=G0 + 0.01, step=1.8, w=0.9, col=YELLOW, along="x", skew=0.0):
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


def paving_band(x0, x1, z0, z1, col=STONE, y=G0 + 0.006):
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
    for i in range(12):
        a = i * math.tau / 12
        glow_box(cx + math.cos(a) * (r - 0.3) - 0.12, cx + math.cos(a) * (r - 0.3) + 0.12, y + 0.25, y + 0.37,
                 cz + math.sin(a) * (r - 0.3) - 0.12, cz + math.sin(a) * (r - 0.3) + 0.12, colour)


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
    for i in range(nx):
        for j in range(nz):
            xa, xb = x0 + (x1 - x0) * i / nx, x0 + (x1 - x0) * (i + 1) / nx
            za, zb = z0 + (z1 - z0) * j / nz, z0 + (z1 - z0) * (j + 1) / nz
            a, b, c, d = (xa, hgt(xa, zb), zb), (xb, hgt(xb, zb), zb), (xb, hgt(xb, za), za), (xa, hgt(xa, za), za)
            tris = ((a, b, c), (a, c, d)) if (i + j) % 2 == 0 else ((a, b, d), (b, c, d))
            for t in tris:
                g = rr.uniform(0.1, 0.34)
                poly(k("glow"), list(t), [(0, 0), (1, 0), (0.5, 1)], (base[0] * g, base[1] * g, base[2] * g, 1))
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
    cylinder(k("metal"), x, z, y + 0.3, y + h, r, segs=10, cap=False)
    cylinder(k("dark"), x, z, y + h - 0.25, y + h - 0.2, r * 0.96, segs=10)


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
        f.quad(k("trim"), 0.0, w, 0.0, 0.5, 0.02, col=BLACK)
        f.quad(k("corporate"), 0.35, w - 0.35, 0.5, top - 0.7, 0.03, col=glass_col(r, lit=(0.8, 1.0)))
        f.quad(k("trim"), 0.0, w, top - 0.7, top, 0.03, col=BLACK)
        f.box(k("neon_" + colour), 0.4, w - 0.4, top - 0.78, top - 0.7, 0.03, 0.09)
        for e in (0.0, w - 0.35):
            f.box(k("trim"), e, e + 0.35, 0.0, top, 0.0, 0.12, col=tcol)
        # Doors: a pair of dark portals a third of the way along.
        n = max(1, int(w // 16))
        for i in range(n):
            s = w * (i + 0.5) / n + (r.uniform(-1.5, 1.5) if w > 12 else 0.0)
            f.box(k("trim"), s - 1.7, s + 1.7, 0.0, 3.1, 0.03, 0.22, col=BLACK)
            f.quad(k("glow"), s - 1.5, s - 0.08, G0, 2.8, 0.23, col=tuple(c * 0.5 for c in GLOW["white"][:3]) + (1,))
            f.quad(k("glow"), s + 0.08, s + 1.5, G0, 2.8, 0.23, col=tuple(c * 0.5 for c in GLOW["white"][:3]) + (1,))
            lx, _, lz = f.p(f.at(s), 0.0, 1.2)
            light(CO, lx, 2.6, lz, "white", 4.0)
            if canopy:
                f.box(k("trim"), s - 3.4, s + 3.4, 3.5, 3.75, 0.0, canopy, col=BLACK)
                f.box(k("neon_" + colour), s - 3.2, s + 3.2, 3.44, 3.5, canopy - 0.4, canopy - 0.3)
                f.box(k("glow", 1), s - 2.6, s + 2.6, 3.47, 3.5, 0.5, canopy - 0.8, col=GLOW["white"])
    elif kind == "shop":
        B.shopfront(CO, f, r, 0.0, w, tint, sign_rate=0.3, awning_rate=0.0, palette=["cyan", "white", "teal", "blue"])
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
        f.ledge(k("trim", 1), 0.0, w, top * 0.5, 0.2, 0.12, tcol)


def fins(f, y0, y1, step, out=0.45, wide=0.3, col=BLACK, detail=0, s0=0.0, s1=None):
    """Vertical fins standing out from a face (ax5YUmkWf_Y@39)."""
    s1 = f.width if s1 is None else s1
    n = max(1, round((s1 - s0) / step))
    for i in range(n + 1):
        s = s0 + (s1 - s0) * i / n
        f.box(k("trim", detail), s - wide / 2, s + wide / 2, y0, y1, 0.0, out, col=col)


def strip_v(x, z, y0, y1, colour, glow=True, w=0.16):
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
               colour="cyan", lit=(0.45, 0.8), warm=(0.0, 0.45), style=5, top_band=None, terrace_rail=True, crown=True):
    """A corporate block: a stone podium to `base` with its fronts (see
    front()), a shaft in `tiers` ((fraction of the height it ends at, inset
    on every side from the podium), ...), glass or windows, optional fins
    and lines of light up its corners, a parapet drawn in light and a lit
    band under it. Returns the top tier's rectangle and height."""
    r = random.Random(seed)
    fronts = fronts or {}
    tnum = B.TINTS[tint]
    solid(x0, x1, 0.0, base, z0, z1, podium)
    B.COLLISION.append(("box", x0, x1, 0.0, base, z0, z1, CO))
    for name, f in B.faces_of(x0, x1, z0, z1).items():
        front(f, base, fronts.get(name, "blank"), r, tnum, colour, canopy if fronts.get(name) in ("glass", "shop") else 0.0)
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
        edge_line(a0, a1, b0, b1, top - 1.6, top_band, h=0.45, out=0.12)
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
    if lamps:
        for cx, cz in ((x0 + 0.2, z0 + 0.2), (x0 + 0.2, z1 - 0.2), (x1 - 0.2, z0 + 0.2), (x1 - 0.2, z1 - 0.2)):
            aviation(cx, y + 1.0, cz)
