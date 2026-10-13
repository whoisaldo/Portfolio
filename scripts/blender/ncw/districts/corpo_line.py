"""Corpo Row's boulevard line (BnnbP7pCIvQ@30, Fn9gKhU_2_Q@75): a heavy
guideway of cast concrete along the boulevard's south kerb, twenty metres
up, so that the street has it overhead from end to end: a box girder with a
keel whose soffit arches between its piers, a yellow stripe along each
fascia over a line of white light, its underside lit amber, lamps on posts
along its parapet and a contact wire on portals. Its piers stand in the
mouths of the south side's alleys (none on a pavement or a lane), each a
column under a haunched arm reaching out over the pavement to the deck. At
either end a station hangs off the south side's fronts on corbels: glazed
to the boulevard, lit, people on its platforms; a train stands in the
western one.

The braindance's cameras ride beside the car on the boulevard's south
lanes and look north, and the fixed one at the east end looks west along
the towers' fronts: all of this stands south of z -317, behind them.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B
from ncw import props as P
from ncw.districts import corpo_kit as K

CO = "corpo"
LINE_Z = -320.3
LINE_Y = 20.5             # the running surface
HW = 3.0                  # the deck's half width
SLAB = LINE_Y - 2.2       # the girder's soffit
W_STATION = (138.0, 167.0)
E_STATION = (344.0, 366.0)
PIERS = (169.0, 209.0, 249.0, 289.0, 329.0, 368.0)   # the south side's alleys
PIER_Z = -309.4
PIER_TOP = 15.1
CONC = (0.2, 0.2, 0.21, 1.0)
KEEL = (0.15, 0.15, 0.16, 1.0)
FACADE = -316.0           # the south side's lot line
G0 = B.G0


def k(mat, detail=0):
    return (CO, mat, detail)


def wash(a, b, c, d, low, high):
    """A quad of light (a, b its foot, c, d its head) fading from `low` at
    its foot to `high` at its head: concrete lit from the street under it."""
    from ncw import kit as KT
    bt = KT.batches[k("glow")]
    base = len(bt.verts)
    bt.verts.extend(KT.P(*q) for q in (a, b, c, d))
    bt.faces.append((base, base + 1, base + 2, base + 3))
    bt.uvs.extend(((0, 0), (1, 0), (1, 1), (0, 1)))
    bt.cols.extend((low, low, high, high))


def keel(xa, xb, deep_a, deep_b, kw=1.9, n=12):
    """The keel under the slab from xa to xb, its soffit an arch: deepest
    over a pier (deep_a, deep_b below the slab, 0 where there is none) and
    half a metre at mid span."""
    z0, z1 = LINE_Z - kw, LINE_Z + kw

    def yb(t):
        x = xa + (xb - xa) * t
        dip = deep_a * (1.0 - math.sin(math.pi * min(t, 0.5))) ** 2 + deep_b * (1.0 - math.sin(math.pi * max(t, 0.5))) ** 2
        return x, SLAB - 0.5 - dip

    pts = [yb(i / n) for i in range(n + 1)]
    lit = tuple(c * 0.55 for c in GLOW["amber"][:3]) + (1.0,)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        # A line of light along the arch on each side, a hand over its edge.
        quad(k("glow"), (x1, y1 + 0.12, z0 - 0.02), (x0, y0 + 0.12, z0 - 0.02), (x0, y0 + 0.26, z0 - 0.02), (x1, y1 + 0.26, z0 - 0.02), col=lit)
        quad(k("glow"), (x0, y0 + 0.12, z1 + 0.02), (x1, y1 + 0.12, z1 + 0.02), (x1, y1 + 0.26, z1 + 0.02), (x0, y0 + 0.26, z1 + 0.02), col=lit)
        quad(k("castconcrete"), (x1, y1, z0), (x0, y0, z0), (x0, SLAB, z0), (x1, SLAB, z0),
             ((x1 / 3, y1 / 3), (x0 / 3, y0 / 3), (x0 / 3, SLAB / 3), (x1 / 3, SLAB / 3)), KEEL)
        quad(k("castconcrete"), (x0, y0, z1), (x1, y1, z1), (x1, SLAB, z1), (x0, SLAB, z1),
             ((x0 / 3, y0 / 3), (x1 / 3, y1 / 3), (x1 / 3, SLAB / 3), (x0 / 3, SLAB / 3)), KEEL)
        quad(k("castconcrete"), (x0, y0, z0), (x1, y1, z0), (x1, y1, z1), (x0, y0, z1),
             ((x0 / 3, z0 / 3), (x1 / 3, z0 / 3), (x1 / 3, z1 / 3), (x0 / 3, z1 / 3)), KEEL)


def deck(xa, xb):
    """The girder from xa to xb: slab, fasciae, stripes, the lit underside,
    upstands with a rail on posts, the running rails on sleepers."""
    z = LINE_Z
    box(k("castconcrete"), xa, xb, SLAB, LINE_Y, z - HW, z + HW, scale=3.0, col=CONC, bottom=True)
    belly = tuple(c * 0.85 for c in GLOW["amber"][:3]) + (1.0,)
    for s in (-1, 1):
        za, zb = sorted((z + s * (HW - 0.45), z + s * (HW - 0.7)))
        box(k("glow"), xa + 0.4, xb - 0.4, SLAB - 0.03, SLAB, za, zb, scale=1.0, col=belly, bottom=True)
        za, zb = sorted((z + s * HW, z + s * (HW + 0.03)))
        box(k("glow"), xa, xb, LINE_Y - 0.95, LINE_Y - 0.55, za, zb, scale=1.0, col=(0.34, 0.25, 0.03, 1.0))
        K.neon_box(xa, xb, SLAB + 0.25, SLAB + 0.37, za, zb, "white")
        za, zb = sorted((z + s * (HW - 0.3), z + s * HW))
        box(k("castconcrete"), xa, xb, LINE_Y, LINE_Y + 1.0, za, zb, scale=3.0, col=CONC)
        zr = z + s * (HW - 0.15)
        box(k("steel"), xa, xb, LINE_Y + 1.22, LINE_Y + 1.3, zr - 0.04, zr + 0.04, scale=1.0, col=K.TEAL)
        x = xa + 1.2
        while x < xb - 0.5:
            box(k("steel", 1), x - 0.04, x + 0.04, LINE_Y + 1.0, LINE_Y + 1.22, zr - 0.04, zr + 0.04, scale=1.0, col=K.TEAL)
            x += 2.4
    for s in (-1, 1):
        ze, zf = sorted((z + s * 0.72, z + s * 0.86))
        box(k("metal"), xa, xb, LINE_Y + 0.08, LINE_Y + 0.24, ze, zf, scale=1.0)
    x = xa + 0.5
    while x < xb - 0.3:
        quad(k("dark", 1), (x - 0.13, LINE_Y + 0.08, z + 1.2), (x + 0.13, LINE_Y + 0.08, z + 1.2), (x + 0.13, LINE_Y + 0.08, z - 1.2),
             (x - 0.13, LINE_Y + 0.08, z - 1.2))
        x += 0.9
    box(k("metal", 1), xa, xb, LINE_Y + 4.7, LINE_Y + 4.74, z - 0.025, z + 0.025, scale=1.0)
    # The girder's faces lit from the street under them, and the soffit
    # either side of the keel lit warm toward its edges.
    lo, hi = (0.075, 0.068, 0.06, 1.0), (0.018, 0.018, 0.022, 1.0)
    za, zb = z - HW - 0.01, z + HW + 0.01
    wash((xb, SLAB, za), (xa, SLAB, za), (xa, LINE_Y - 0.97, za), (xb, LINE_Y - 0.97, za), lo, hi)
    wash((xa, SLAB, zb), (xb, SLAB, zb), (xb, LINE_Y - 0.97, zb), (xa, LINE_Y - 0.97, zb), lo, hi)
    edge, mid = (0.075, 0.05, 0.02, 1.0), (0.02, 0.015, 0.01, 1.0)
    for s in (-1, 1):
        zo, zi = z + s * (HW - 0.02), z + s * 1.95
        if s < 0:
            wash((xa, SLAB - 0.01, zo), (xb, SLAB - 0.01, zo), (xb, SLAB - 0.01, zi), (xa, SLAB - 0.01, zi), edge, mid)
        else:
            wash((xb, SLAB - 0.01, zo), (xa, SLAB - 0.01, zo), (xa, SLAB - 0.01, zi), (xb, SLAB - 0.01, zi), edge, mid)


def pier(px):
    """A column in an alley's mouth under a haunched arm out to the deck,
    on a striped plinth, a sign and a lamp on it."""
    z0, z1 = PIER_Z - 1.2, PIER_Z + 1.2
    box(k("castconcrete"), px - 1.2, px + 1.2, G0, PIER_TOP, z0, z1, scale=2.0, col=CONC)
    # Uplit from its plinth on its face to the street.
    wash((px + 1.2, G0 + 1.5, z0 - 0.01), (px - 1.2, G0 + 1.5, z0 - 0.01), (px - 1.2, PIER_TOP, z0 - 0.01), (px + 1.2, PIER_TOP, z0 - 0.01),
         (0.09, 0.075, 0.055, 1.0), (0.012, 0.012, 0.015, 1.0))
    B.COLLISION.append(("box", px - 1.2, px + 1.2, G0, PIER_TOP, z0, z1, CO))
    # The arm: its sides a five-sided profile, deepest over the column.
    tip = LINE_Z - HW - 0.3
    prof = [(z1, SLAB), (tip, SLAB), (tip, SLAB - 1.0), (z0, PIER_TOP), (z1, PIER_TOP)]
    for sx in (-1, 1):
        x = px + sx * 1.0
        pts = [(x, y, zz) for zz, y in (prof if sx < 0 else prof[::-1])]
        poly(k("castconcrete"), pts, [(zz / 3, y / 3) for _, y, zz in pts], CONC)
    quad(k("castconcrete"), (px - 1.0, SLAB - 1.0, tip), (px + 1.0, SLAB - 1.0, tip), (px + 1.0, PIER_TOP, z0), (px - 1.0, PIER_TOP, z0),
         ((0, 0), (0.7, 0), (0.7, 4), (0, 4)), CONC)
    quad(k("castconcrete"), (px - 1.0, SLAB, tip), (px + 1.0, SLAB, tip), (px + 1.0, SLAB - 1.0, tip), (px - 1.0, SLAB - 1.0, tip), col=CONC)
    quad(k("castconcrete"), (px + 1.0, SLAB, z1), (px - 1.0, SLAB, z1), (px - 1.0, PIER_TOP, z1), (px + 1.0, PIER_TOP, z1), col=CONC)
    # A line of amber light along the arm's top edge, two lamps under it.
    for sx in (-1, 1):
        xa, xb = sorted((px + sx * 1.0, px + sx * 1.03))
        K.neon_box(xa, xb, SLAB - 0.35, SLAB - 0.2, tip + 0.4, z1 - 0.4, "amber", 1)
    for zz in (LINE_Z, (LINE_Z + FACADE) / 2):
        yb = SLAB - 1.0 + (PIER_TOP - SLAB + 1.0) * (zz - tip) / (z0 - tip)
        box(k("glow"), px - 0.4, px + 0.4, yb - 0.05, yb, zz - 0.25, zz + 0.25, scale=1.0, col=GLOW["white"], bottom=True)
        light(CO, px, 10.0, zz, "white", 4.0)
    # The plinth, striped, and a sign on the column's face to the street.
    box(k("trim", 1), px - 1.35, px + 1.35, G0, G0 + 1.5, z0 - 0.15, z1 + 0.15, scale=1.0, col=K.STONE)
    for yy in (0.25, 0.75, 1.25):
        box(k("trim", 1), px - 1.37, px + 1.37, G0 + yy, G0 + yy + 0.25, z0 - 0.17, z1 + 0.17, scale=1.0, col=K.YELLOW)
    K.st_board(px, 4.2, z0 - 0.02, "bx", math.pi)
    K.glow_box(px - 0.5, px + 0.5, 5.3, 5.38, z0 - 0.3, z0 - 0.02, "amber", 1)
    # The column cast in lifts, a dark joint every 2.4 m; steel cladding
    # to head height with its bolts' line; on each side to the boulevard's
    # traffic a lit panel of the line's map, a lamp over it; a cable tray up
    # its back. (A bare tan column at the kerb read as a placeholder.)
    for yy in [G0 + 1.5 + 2.4 * n for n in range(1, 6)]:
        box(k("trim", 1), px - 1.215, px + 1.215, yy, yy + 0.05, z0 - 0.015, z1 + 0.015, scale=1.0, col=(0.08, 0.08, 0.085, 1.0))
    box(k("trim"), px - 1.26, px + 1.26, G0 + 1.5, G0 + 2.6, z0 - 0.06, z1 + 0.06, scale=1.0, col=K.STEEL)
    box(k("metal", 1), px - 1.27, px + 1.27, G0 + 2.5, G0 + 2.54, z0 - 0.07, z1 + 0.07, scale=1.0)
    for sx in (-1, 1):
        xf = px + sx * 1.2
        xa, xb = sorted((xf, xf + sx * 0.12))
        box(k("trim"), xa, xb, 3.0, 5.6, PIER_Z - 0.75, PIER_Z + 0.75, scale=1.0, col=K.BLACK)
        xa, xb = sorted((xf + sx * 0.12, xf + sx * 0.14))
        box(k("glow"), xa, xb, 3.15, 5.45, PIER_Z - 0.62, PIER_Z + 0.62, scale=1.0, col=(0.16, 0.2, 0.24, 1.0))
        for n in range(4):
            yy = 3.5 + n * 0.5
            xa, xb = sorted((xf + sx * 0.14, xf + sx * 0.15))
            box(k("glow", 1), xa, xb, yy, yy + 0.06, PIER_Z - 0.5, PIER_Z + 0.5 - 0.2 * n, scale=1.0, col=GLOW[("amber", "cyan", "white", "pink")[n]])
        xa, xb = sorted((xf, xf + sx * 0.4))
        box(k("metal", 1), xa, xb, 5.75, 5.85, PIER_Z - 0.3, PIER_Z + 0.3, scale=1.0)
        xa, xb = sorted((xf + sx * 0.3, xf + sx * 0.4))
        box(k("glow", 1), xa, xb, 5.7, 5.75, PIER_Z - 0.25, PIER_Z + 0.25, scale=1.0, col=GLOW["white"])
    box(k("steel", 1), px - 0.3, px + 0.3, G0 + 2.6, PIER_TOP, z1, z1 + 0.18, scale=1.0, col=K.STEEL)


def portal_frame(px):
    """Steel posts either side of the track and a beam over it, a lamp on
    each post, the wire's hanger."""
    for s in (-1, 1):
        zp = LINE_Z + s * 2.5
        box(k("steel"), px - 0.09, px + 0.09, LINE_Y + 0.4, LINE_Y + 5.6, zp - 0.09, zp + 0.09, scale=1.0, col=K.TEAL)
        K.glow_box(px - 0.22, px + 0.22, LINE_Y + 5.1, LINE_Y + 5.22, zp - s * 0.9 - 0.3, zp - s * 0.9 + 0.3, "white")
    box(k("steel"), px - 0.09, px + 0.09, LINE_Y + 5.4, LINE_Y + 5.6, LINE_Z - 2.6, LINE_Z + 2.6, scale=1.0, col=K.TEAL)
    K.aviation(px, LINE_Y + 5.6, LINE_Z)


def lamp_post(x, s):
    """A lamp on a post on the parapet, its head over the track's edge."""
    zp = LINE_Z + s * (HW - 0.15)
    box(k("steel"), x - 0.07, x + 0.07, LINE_Y + 1.0, LINE_Y + 4.3, zp - 0.07, zp + 0.07, scale=1.0, col=K.STEEL)
    za, zb = sorted((zp, zp - s * 0.9))
    box(k("steel"), x - 0.06, x + 0.06, LINE_Y + 4.2, LINE_Y + 4.3, za, zb, scale=1.0, col=K.STEEL)
    box(k("glow"), x - 0.3, x + 0.3, LINE_Y + 4.08, LINE_Y + 4.2, za + 0.1, zb - 0.1, scale=1.0, col=GLOW["amber"], bottom=True)
    light(CO, x, LINE_Y + 3.0, zp - s * 0.6, "amber", 3.5)


def corbel(x, w=1.2):
    """A bracket out of a front under a station's floor."""
    z0, z1 = LINE_Z - HW + 0.4, FACADE
    prof = [(z1, SLAB), (z0, SLAB), (z1, SLAB - 4.5)]
    for sx in (-1, 1):
        xx = x + sx * w / 2
        pts = [(xx, y, zz) for zz, y in (prof if sx < 0 else prof[::-1])]
        poly(k("castconcrete"), pts, [(zz / 3, y / 3) for _, y, zz in pts], CONC)
    quad(k("castconcrete"), (x - w / 2, SLAB, z0), (x + w / 2, SLAB, z0), (x + w / 2, SLAB - 4.5, z1), (x - w / 2, SLAB - 4.5, z1), col=CONC)


def station(x0, x1, r, closed, train=False, sign_n=0):
    """A station hung off the south side's fronts: platforms either side of
    the track, glazed to the boulevard, a lit soffit, a word along its
    fascia, people waiting; `closed` ends are walls with a lit portal."""
    zn, zs = LINE_Z - HW - 1.6, FACADE - 0.15
    top = LINE_Y + 0.95
    roof = LINE_Y + 6.2
    box(k("castconcrete"), x0, x1, SLAB, LINE_Y, zn, LINE_Z - HW, scale=3.0, col=CONC, bottom=True)
    box(k("castconcrete"), x0, x1, SLAB, LINE_Y, LINE_Z + HW, zs, scale=3.0, col=CONC, bottom=True)
    for za, zb in ((zn, LINE_Z - 1.75), (LINE_Z + 1.75, zs)):
        box(k("trim"), x0, x1, LINE_Y, top, za, zb, scale=2.0, col=K.STONE)
    for ze, s in ((LINE_Z - 1.75, -1), (LINE_Z + 1.75, 1)):
        za, zb = sorted((ze, ze - s * 0.14))
        K.neon_box(x0 + 0.3, x1 - 0.3, top - 0.05, top, za, zb, "yellow")
    # The north wall: glass in a dark frame, a lit transom, a dark spandrel
    # under it with the yellow stripe carried on.
    quad(k("clearglass"), (x1, top, zn), (x0, top, zn), (x0, roof - 0.6, zn), (x1, roof - 0.6, zn), col=(0.55, 0.7, 0.75, 1.0))
    n = max(2, int((x1 - x0) / 2.4))
    for i in range(n + 1):
        xm = x0 + (x1 - x0) * i / n
        box(k("metal"), xm - 0.08, xm + 0.08, top, roof - 0.6, zn - 0.12, zn + 0.02, scale=1.0)
    K.neon_box(x0, x1, top + 2.6, top + 2.7, zn - 0.13, zn - 0.08, "white")
    box(k("trim"), x0, x1, SLAB, LINE_Y, zn - 0.05, zn, scale=1.0, col=K.BLACK)
    box(k("glow"), x0, x1, LINE_Y - 0.95, LINE_Y - 0.55, zn - 0.08, zn - 0.05, scale=1.0, col=(0.34, 0.25, 0.03, 1.0))
    # The roof, its fascia and a word along it, the soffit's lines of light.
    box(k("castconcrete"), x0 - 0.3, x1 + 0.3, roof - 0.6, roof + 0.4, zn - 0.4, zs, scale=3.0, col=CONC, bottom=True)
    box(k("trim"), x0 - 0.3, x1 + 0.3, roof - 0.6, roof - 0.48, zn - 0.43, zn - 0.4, scale=1.0, col=K.YELLOW)
    for zz in (LINE_Z - 2.6, LINE_Z, LINE_Z + 2.6):
        box(k("glow"), x0 + 0.5, x1 - 0.5, roof - 0.63, roof - 0.6, zz - 0.12, zz + 0.12, scale=1.0, col=GLOW["white"], bottom=True)
    for j, sx in enumerate((x0 + 7.0, x1 - 7.0)):
        K.st_board(sx, roof - 1.45, zn - 0.2, "pm", math.pi)
    # Its back: the front it hangs off, adverts on it, benches, machines.
    for j, ax in enumerate((x0 + 6.0, x1 - 6.0)):
        K.advert(ax, top + 2.4, zs - 0.08, 4.2, 2.4, math.pi, j + sign_n * 2, seed=0.61 + 0.07 * sign_n, depth=0.05)
    for bx in (x0 + 10.0, x1 - 10.5):
        box(k("metal", 1), bx - 1.0, bx + 1.0, top + 0.45, top + 0.53, zs - 1.2, zs - 0.7, scale=0.5)
        box(k("dark", 1), bx - 0.9, bx + 0.9, top, top + 0.45, zs - 1.1, zs - 0.8, scale=0.5)
    P.place("vending", x0 + 3.0, top, zs - 0.5, math.pi, district=CO)
    P.place("vending_warm", x1 - 3.0, top, zs - 0.5, math.pi, district=CO)
    for px, pz, yaw, pose in ((x0 + 4.5, zn + 0.9, 0.0, "phone"), (x0 + 9.0, zn + 1.0, 0.4, "idle"), (x0 + 9.6, zn + 1.1, -2.6, "talk"),
                              (x1 - 7.0, zn + 0.9, 0.0, "idle"), (x0 + 13.0, zs - 1.6, math.pi, "talk"), (x0 + 13.6, zs - 1.7, 0.4, "talk"),
                              (x1 - 9.0, zs - 1.0, math.pi, "sit")):
        stand(px, pz, yaw, pose, top + (0.45 if pose == "sit" else 0.0))
    for lx in (x0 + 5.0, (x0 + x1) / 2, x1 - 5.0):
        light(CO, lx, top + 3.0, LINE_Z - 3.5, "white", 5.0)
    # The closed ends: a wall with a lit portal round the track.
    for xe, s in closed:
        xa, xb = sorted((xe, xe + s * 0.5))
        box(k("castconcrete"), xa, xb, SLAB, roof - 0.6, zn, zs, scale=3.0, col=CONC)
        xc, xd = sorted((xe - s * 0.03, xe))
        for zz in (LINE_Z - 2.0, LINE_Z + 2.0):
            K.glow_box(xc, xd, LINE_Y + 0.2, LINE_Y + 4.6, zz - 0.08, zz + 0.08, "amber")
        K.glow_box(xc, xd, LINE_Y + 4.6, LINE_Y + 4.72, LINE_Z - 2.0, LINE_Z + 2.0, "amber")
        quad(k("dark"), (xe + s * 0.02, LINE_Y, LINE_Z + 1.92 * s), (xe + s * 0.02, LINE_Y, LINE_Z - 1.92 * s),
             (xe + s * 0.02, LINE_Y + 4.55, LINE_Z - 1.92 * s), (xe + s * 0.02, LINE_Y + 4.55, LINE_Z + 1.92 * s))
    for cx in (x0 + 9.0, x1 - 4.0):
        corbel(cx)
    if train:
        # A train standing: two cars, dark under a band of its livery, a
        # band of lit windows and the carriage behind them, doors.
        tx0 = x0 + 1.8
        for c in range(2):
            a, b = tx0 + c * 12.4, tx0 + c * 12.4 + 12.0
            box(k("trim"), a, b, LINE_Y + 0.3, LINE_Y + 1.4, LINE_Z - 1.4, LINE_Z + 1.4, scale=2.0, col=K.BLACK, bottom=True)
            box(k("trim"), a, b, LINE_Y + 1.4, LINE_Y + 3.6, LINE_Z - 1.45, LINE_Z + 1.45, scale=2.0, col=(0.5, 0.52, 0.55, 1.0))
            box(k("trim"), a, b, LINE_Y + 1.5, LINE_Y + 1.85, LINE_Z - 1.47, LINE_Z + 1.47, scale=2.0, col=(0.03, 0.3, 0.34, 1.0))
            for s in (-1, 1):
                zc, zd = sorted((LINE_Z + s * 1.45, LINE_Z + s * 1.48))
                box(k("glow"), a + 0.6, b - 0.6, LINE_Y + 2.15, LINE_Y + 3.05, zc, zd, scale=1.0, col=(0.34, 0.31, 0.26, 1.0))
                for d in (a + 2.6, b - 2.6):
                    box(k("trim", 1), d - 0.6, d + 0.6, LINE_Y + 1.9, LINE_Y + 3.4, zc - 0.01 * s, zd + 0.02 * s, scale=1.0, col=(0.03, 0.3, 0.34, 1.0))
        e = tx0 + 12.4 + 12.0
        for zz in (LINE_Z - 0.9, LINE_Z + 0.9):
            K.glow_box(e, e + 0.04, LINE_Y + 1.7, LINE_Y + 2.0, zz - 0.25, zz + 0.25, "white", 1)


def line():
    r = random.Random(9301)
    xa, xb = W_STATION[0], E_STATION[1]
    deck(xa, xb)
    supports = [W_STATION[1]] + [p for p in PIERS if W_STATION[1] < p < E_STATION[0]] + [E_STATION[0]]
    deep = {p: 1.5 for p in PIERS}
    for a, b in zip(supports, supports[1:]):
        keel(a, b, deep.get(a, 0.0), deep.get(b, 0.0))
    for px in PIERS:
        pier(px)
        portal_frame(px)
    x = W_STATION[1] + 4.75
    j = 0
    while x < E_STATION[0] - 3.0:
        if all(abs(x - p) > 3.0 for p in PIERS):
            lamp_post(x, (-1, 1)[j % 2])
            j += 1
        x += 9.5
    # Blades hung from the soffit's south half at mid span, each turned a
    # little off the street's line, on two rods; a drive along the boulevard
    # reads them under the deck. (Over its north half nothing hangs: the
    # braindance car's cameras look up past its edge at the towers.)
    sup = [p for p in PIERS if W_STATION[1] < p < E_STATION[0]]
    for j, (a, b) in enumerate(zip([W_STATION[1]] + sup, sup + [E_STATION[0]])):
        for f, size in ((0.38, "bm"), (0.66, "bl")):
            x = a + (b - a) * f
            w, h = K.ST_SIZES[size] if hasattr(K, "ST_SIZES") else ST_SIZES[size]
            zc = LINE_Z + 1.9 + 0.5 * (j % 2)
            yc = SLAB - 0.6 - h / 2
            K.st_blade(x, yc, zc, size, -math.pi / 2 + math.radians((-8, 6, 10, -5, 4, -10)[j % 6]))
            for dz in (-w / 2 + 0.1, w / 2 - 0.1):
                box(k("metal", 1), x - 0.02, x + 0.02, yc + h / 2, SLAB, zc + dz - 0.02, zc + dz + 0.02, scale=0.5)
            light(CO, x - 1.5, yc - h / 2 - 0.5, zc, ("amber", "white", "cyan")[j % 3], 3.0)
    station(*W_STATION, r, closed=((W_STATION[0], 1),), train=True, sign_n=2)
    station(*E_STATION, r, closed=((E_STATION[1], -1),), sign_n=4)


line()


def life():
    """More people on the boulevard's pavements, off the walkers' lines
    (against the lot lines: the south side's from x 140 to 376, the north
    side's east of the braindance's views, x 280 to 450), in ones, twos and
    threes, and a second blade sign off each south front, higher and
    turned the other way."""
    rl = random.Random(9311)
    poses = ("idle", "phone", "smoke", "lean", "phone", "idle")
    x = 141.0
    while x < 375.0:
        if all(abs(x - p) > 3.5 for p in PIERS):
            n = rl.choice((1, 1, 2, 2, 3))
            if n == 1:
                pose = rl.choice(poses)
                stand(x, FACADE - (0.42 if pose == "lean" else 0.62), math.pi + rl.uniform(-0.6, 0.6), pose)
            else:
                K.talk(x, FACADE - 0.7, rl.uniform(0.0, math.tau), n)
        x += rl.uniform(9.0, 16.0)
    x = 281.0
    while x < 449.0:
        if not (288.0 < x < 290.0):
            n = rl.choice((1, 2, 2, 3))
            if n == 1:
                stand(x, -343.45, rl.uniform(-0.6, 0.6), rl.choice(poses[:3]))
            else:
                K.talk(x, -343.4, rl.uniform(0.0, math.tau), n)
        x += rl.uniform(10.0, 17.0)
    # A second blade off each south front, higher, turned the other way.
    from ncw.districts.corpo_south import S1, LOT_S
    for j, (x0, x1, h) in enumerate(S1[:6]):
        bx = x0 + 1.0
        K.st_blade(bx, 9.6 + (j % 2) * 1.6, LOT_S - 1.1, ("bl", "bm")[j % 2], math.radians(90 - (16 if j % 2 else -20)), bracket=(bx, LOT_S),
                   n=K.DESIGNS[("bl", "bm")[j % 2]][(j * 3 + 1) % len(K.DESIGNS[("bl", "bm")[j % 2]])])


life()
