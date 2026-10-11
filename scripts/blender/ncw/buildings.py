"""One building on one lot, the way every district's ordinary blocks are made.

A lot is a rectangle with a face to its street. The building on it is one
or more tiers (a body to its height, and over a setback, a narrower one),
and every face of a tier that anybody can see is built: on a street, a
ground floor of shops (glass set back behind pilasters, a fascia, a door
to the flats above, awnings, a sign over each shop), storeys of windows over
it (the facade shader draws them, a room behind each pane, from the window
cells this lays out: whole bays across each face, storeys on the true floor
lines), ledges along the floor lines, balconies, air conditioners and
downpipes, a fire escape; a face toward a lower neighbour is built from the
neighbour's roof up; a face toward a taller one is not built at all. The
roof has its parapet and what a roof holds: tanks, a stair hut with its door
lit, plant, antennas, now and then a sign on posts.

Sizes are real: 3.2 m bays, a 4.6 m shop floor, 3.4 m storeys, a door 2.4 m
high. Each building's numbers (how lit, which windows, how warm, which wall
colour) ride on its facade's vertices for the window shader; its trim (the
ledges, slabs, pilasters, fascias, parapets) is the `trim` material with its
colour on the vertices.

`Lot.sides` says what each of the four faces looks onto:
  street   a street: the full ground floor and storeys
  open     an alley, a yard, a plaza: storeys, a plain ground floor
  back     the block's inside: storeys over a plinth, no shops
  party    a neighbour against it: built only above the neighbour's height
"""
import math
from dataclasses import dataclass, field

from ncw.kit import *  # noqa: F401,F403
from ncw import props as P

# Wall colours (the facade shader's palette, by index in the colour's
# alpha) and the trim that goes with each: charcoal, navy, teal-black, plum,
# brown, concrete, rust, pale.
TINTS = {"charcoal": 0, "navy": 1, "teal": 2, "plum": 3, "brown": 4, "concrete": 5, "rust": 6, "pale": 7}
TRIM = [(0.085, 0.085, 0.095, 1), (0.06, 0.075, 0.12, 1), (0.05, 0.1, 0.105, 1), (0.1, 0.065, 0.11, 1),
        (0.12, 0.1, 0.08, 1), (0.16, 0.16, 0.17, 1), (0.19, 0.11, 0.06, 1), (0.24, 0.24, 0.25, 1)]
DARK_TRIM = (0.03, 0.03, 0.035, 1)
REC = 0.25          # shop glass set back behind the wall's plane
PIL = 0.08          # pilasters stand this far proud
G0 = 0.15           # the pavement's level

COLLISION = []      # ("box", x0, x1, y0, y1, z0, z1, district)
ROOFS = []          # (district, x0, x1, z0, z1, y) flat roofs, for drones and the export


def billboard(district, cx, cy, cz, w, h, yaw, r, frame=True, back=True, depth=0.35):
    """A billboard: a lit advert with no words (the site draws it), in a dark
    steel frame, its back the frame's or another advert."""
    col = (r.randrange(8) / 8.0 + 0.01, r.randrange(8) / 8.0 + 0.01, r.random(), 1.0)
    rotated_quad((district, "billboard", 0), cx, cy, cz, w, h, yaw, col=col)
    if frame:
        nx, nz = math.sin(yaw), math.cos(yaw)
        oriented_box((district, "board_frame", 0), cx - nx * (depth / 2 + 0.02), cy, cz - nz * (depth / 2 + 0.02), w + 0.4, h + 0.4, depth, yaw, scale=1.0)
        if back:
            col2 = (r.randrange(8) / 8.0 + 0.01, r.randrange(8) / 8.0 + 0.01, r.random(), 1.0)
            rotated_quad((district, "billboard", 0), cx - nx * (depth + 0.06), cy, cz - nz * (depth + 0.06), w, h, yaw + math.pi, col=col2)


def ground_rect(district, x0, x1, z0, z1, mat="sidewalk", y=G0):
    """Paved ground at the pavement's level: a lane, a yard, a court."""
    s = 0.5
    pts = ((x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0))
    quad((district, mat, 0), *pts, uvs=tuple((q[0] * s, -q[2] * s) for q in pts))


def wall_col(lit, style, warmth, tint):
    return (lit, style / 8.0, warmth, (tint + 0.5) / 8.0)


@dataclass
class Lot:
    x0: float
    x1: float
    z0: float
    z1: float
    front: str
    sides: dict = field(default_factory=dict)       # "+x" -> "street" | "open" | "back" | "party"
    neighbours: dict = field(default_factory=dict)  # "+x" -> neighbour height, for party faces
    district: str = ""


class Face:
    """An axis-aligned vertical face: outward normal along +x, -x, +z or -z,
    at `plane` (its x for an x face, its z for a z face), from a0 to a1
    along the other axis."""

    def __init__(self, name, plane, a0, a1):
        self.name = name
        self.nx, self.nz = {"+x": (1, 0), "-x": (-1, 0), "+z": (0, 1), "-z": (0, -1)}[name]
        self.plane = plane
        self.a0, self.a1 = min(a0, a1), max(a0, a1)
        # Left to right as seen from outside runs along t = (nz, -nx).
        t_along = self.nz if self.nx == 0 else -self.nx
        self.left, self.right = (self.a0, self.a1) if t_along > 0 else (self.a1, self.a0)
        self.yaw = math.atan2(self.nx, self.nz)

    @property
    def width(self):
        return self.a1 - self.a0

    def p(self, a, y, w=0.0):
        if self.nx != 0:
            return (self.plane + self.nx * w, y, a)
        return (a, y, self.plane + self.nz * w)

    def at(self, s):
        """The point s metres from the face's left edge, along it."""
        return self.left + (s if self.right > self.left else -s)

    def quad(self, key, s0, s1, y0, y1, w=0.0, uvs=None, col=(1, 1, 1, 1)):
        """A quad on the face's plane (pushed out w), facing out, from s0 to
        s1 metres from its left edge."""
        a, b = self.at(s0), self.at(s1)
        quad(key, self.p(a, y0, w), self.p(b, y0, w), self.p(b, y1, w), self.p(a, y1, w),
             uvs or ((0, 0), (s1 - s0, 0), (s1 - s0, y1 - y0), (0, y1 - y0)), col)

    def box(self, key, s0, s1, y0, y1, w0, w1, col=(1, 1, 1, 1), scale=1.0):
        """A box standing out from the face, w0..w1 out from its plane."""
        a, b = self.at(s0), self.at(s1)
        pa, pb = self.p(a, y0, w0), self.p(b, y1, w1)
        box(key, min(pa[0], pb[0]), max(pa[0], pb[0]), y0, y1, min(pa[2], pb[2]), max(pa[2], pb[2]), scale=scale, col=col)

    def ledge(self, key, s0, s1, y, h, out, col, caps=True):
        """A run of ledge: its face, top and underside (and its ends)."""
        a, b = self.at(s0), self.at(s1)
        f0, f1 = self.p(a, y, out), self.p(b, y, out)
        w0, w1 = self.p(a, y, 0.0), self.p(b, y, 0.0)
        top = y + h
        quad(key, f0, f1, (f1[0], top, f1[2]), (f0[0], top, f0[2]), col=col)
        quad(key, (w0[0], top, w0[2]), (f0[0], top, f0[2]), (f1[0], top, f1[2]), (w1[0], top, w1[2]), col=col)
        quad(key, w1, f1, f0, w0, col=col)
        if caps:
            quad(key, w0, f0, (f0[0], top, f0[2]), (w0[0], top, w0[2]), col=col)
            quad(key, f1, w1, (w1[0], top, w1[2]), (f1[0], top, f1[2]), col=col)


def faces_of(x0, x1, z0, z1):
    return {"+x": Face("+x", x1, z0, z1), "-x": Face("-x", x0, z0, z1),
            "+z": Face("+z", z1, x0, x1), "-z": Face("-z", z0, x0, x1)}


# ---------------------------------------------------------------------------
# The parts of a building.
# ---------------------------------------------------------------------------
def facade_wall(key, f, y0, y1, col, ov, s0=0.0, s1=None):
    """Window cells over a face: whole bays across it, storeys on the floor
    lines from SHOP_H (v integer at every floor)."""
    s1 = f.width if s1 is None else s1
    w = s1 - s0
    if w < 0.5 or y1 - y0 < 0.3:
        return
    bays = max(1, round(w / CELL_W))
    u0, u1 = 0.0, float(bays)
    v0, v1 = ov + (y0 - SHOP_H) / CELL_H, ov + (y1 - SHOP_H) / CELL_H
    f.quad(key, s0, s1, y0, y1, 0.0, ((u0, v0), (u1, v0), (u1, v1), (u0, v1)), col)


def shopfront(district, f, r, s0, s1, tint, sign_rate=0.6, awning_rate=0.55, door=True, palette=None):
    """A ground floor of shops along a face, s0..s1 from its left edge."""
    w = s1 - s0
    if w < 2.4:
        f.quad((district, "trim", 0), s0, s1, 0.0, SHOP_H, 0.0, col=DARK_TRIM)
        return
    tcol = TRIM[tint]
    bays = max(1, round(w / CELL_W))
    bw = w / bays
    # Shops of one to three bays; one bay near the middle is the door to the
    # flats above.
    door_bay = r.randrange(1, bays - 1) if door and bays >= 3 else (-1 if not door or bays < 2 else bays - 1)
    shops = []
    i = 0
    while i < bays:
        if i == door_bay:
            shops.append(("door", i, i + 1))
            i += 1
            continue
        n = min(r.choice((1, 1, 2, 2, 3)), bays - i)
        if door_bay > i and i + n > door_bay:
            n = door_bay - i
        shops.append(("shop", i, i + n))
        i += n
    colours = palette or ["pink", "cyan", "red", "amber", "purple", "teal"]
    for kind, b0, b1 in shops:
        a, b = s0 + b0 * bw, s0 + b1 * bw
        # Pilasters either side, from the ground to the fascia's top.
        for e in (a, b):
            f.box((district, "trim", 0), e - 0.2, e + 0.2, 0.0, SHOP_H, -REC - 0.02, PIL, col=tcol)
        if kind == "door":
            # The door to the stairs, set back in its own lobby, a lamp over it.
            f.box((district, "trim", 0), a + 0.2, b - 0.2, 0.0, G0, -0.9, 0.0, col=DARK_TRIM)
            f.quad((district, "door", 0), a + 0.55, b - 0.55, G0, 2.45, -0.9)
            f.quad((district, "trim", 0), a + 0.2, b - 0.55, G0, 2.45, -0.91, col=DARK_TRIM)
            f.quad((district, "trim", 0), a + 0.2, b - 0.2, 2.45, SHOP_H, 0.0, col=DARK_TRIM)
            for e, d in ((a + 0.2, 1), (b - 0.2, -1)):
                # The lobby's side walls.
                pa, pb = f.p(f.at(e), 0.0, -0.9), f.p(f.at(e), 0.0, 0.0)
                y0_, y1_ = 0.0, SHOP_H
                if d > 0:
                    quad((district, "trim", 0), pa, pb, (pb[0], y1_, pb[2]), (pa[0], y1_, pa[2]), col=DARK_TRIM)
                else:
                    quad((district, "trim", 0), pb, pa, (pa[0], y1_, pa[2]), (pb[0], y1_, pb[2]), col=DARK_TRIM)
            mid = (a + b) / 2
            # Its ceiling, and a lamp in it over the door.
            f.box((district, "trim", 0), a + 0.2, b - 0.2, 2.44, 2.46, -0.9, 0.0, col=DARK_TRIM)
            f.box((district, "glow", 0), mid - 0.15, mid + 0.15, 2.38, 2.44, -0.6, -0.4, col=GLOW["white"])
            continue
        lit = (r.uniform(0.35, 1.0), r.random(), 1.0 if r.random() < 0.92 else 0.0, 1.0)
        # The glass, set back, and the bulkhead under it.
        f.quad((district, "shop", 0), a + 0.2, b - 0.2, 0.55, 3.3, -REC, col=lit)
        f.quad((district, "trim", 0), a + 0.2, b - 0.2, G0, 0.55, -REC + 0.01, col=DARK_TRIM)
        # The fascia over it, flush with the wall, and the soffit between.
        f.quad((district, "trim", 0), a + 0.2, b - 0.2, 3.3, SHOP_H, 0.0, col=DARK_TRIM)
        f.box((district, "trim", 0), a + 0.2, b - 0.2, 3.28, 3.3, -REC, 0.0, col=DARK_TRIM)
        colour = r.choice(colours)
        if r.random() < awning_rate:
            awning(district, f, a + 0.25, b - 0.25, colour)
        if r.random() < sign_rate and b - a > 2.2:
            size = "pm" if b - a > 4.0 else "ps"
            sw, sh = ST_SIZES[size]
            mid = f.at((a + b) / 2)
            cx, cy, cz = f.p(mid, 3.95, 0.06)
            box_key = (district, "board_frame", 0)
            f.box(box_key, (a + b) / 2 - sw / 2 - 0.06, (a + b) / 2 + sw / 2 + 0.06, 3.95 - sh / 2 - 0.06, 3.95 + sh / 2 + 0.06, 0.0, 0.05)
            sign(st_name(size), cx, cy, cz, sw, sh, f.yaw, district=district, label=False)
        elif r.random() < 0.5:
            f.box((district, "neon_" + colour, 0), a + 0.4, b - 0.4, 3.32, 3.4, 0.0, 0.05)


def back_ground(district, f, r, tcol):
    """The ground floor of a back: weathered wall, back doors with a lamp
    each (some with a cyan tube over them, as the show's back passages are
    lit, Zuzys9Ld_5M@87), a small sign by a door now and then, a shutter
    for deliveries."""
    w = f.width
    # Bare concrete at street level, stained by the rain.
    f.quad((district, "concrete", 0), 0.0, w, 0.0, SHOP_H, 0.0, uvs=((0, 0), (w / 3.0, 0), (w / 3.0, SHOP_H / 3.0), (0, SHOP_H / 3.0)))
    # Caged lamps along it, one every few metres over head height, neon so
    # the bake carries their light onto the lane and the wall facing it: a
    # back street is dark, not black.
    lamp_s = r.uniform(2.0, 5.0)
    while lamp_s < w - 1.0:
        hue = "amber" if r.random() < 0.7 else "white"
        f.box((district, "neon_" + hue, 0), lamp_s - 0.18, lamp_s + 0.18, 3.75, 3.95, 0.05, 0.3)
        f.box((district, "metal", 1), lamp_s - 0.22, lamp_s + 0.22, 3.95, 4.02, 0.0, 0.34)
        light(district, *f.p(f.at(lamp_s), 3.8, 0.8), hue, 3.0)
        lamp_s += r.uniform(5.0, 8.0)
    s = r.uniform(1.5, 4.0)
    while s < w - 1.5:
        if r.random() < 0.22 and s + 3.6 < w - 0.5:
            # A roller shutter, down, a lamp over it.
            f.quad((district, "door_panel", 0), s, s + 3.2, G0, 3.0, 0.03)
            f.box((district, "metal", 1), s - 0.05, s + 3.25, 3.0, 3.3, 0.0, 0.25)
            f.box((district, "glow", 0), s + 1.4, s + 1.8, 3.42, 3.52, 0.05, 0.2, col=GLOW["white"])
            light(district, *f.p(f.at(s + 1.6), 3.4, 0.8), "white", 2.0)
            s += r.uniform(7.0, 12.0)
            continue
        f.quad((district, "door", 0), s, s + 1.1, G0, 2.3, 0.03)
        f.box((district, "metal", 1), s - 0.08, s + 1.18, 2.3, 2.4, 0.0, 0.12)
        mid = s + 0.55
        # By the door, what a back street keeps there.
        pick = r.random()
        if pick < 0.75 and s + 3.6 < w:
            px_, _, pz_ = f.p(f.at(s + 2.3), G0, 0.7)
            P.place("dumpster" if pick < 0.3 else "bags" if pick < 0.6 else "crates", px_, G0, pz_, f.yaw, district=district)
        roll = r.random()
        # (Neon, not glow: at a door's height it lights the lane, in the bake.)
        if roll < 0.35:
            f.box((district, "neon_cyan", 0), s - 0.3, s + 1.4, 2.62, 2.7, 0.04, 0.1)
            light(district, *f.p(f.at(mid), 2.6, 0.8), "cyan", 3.5)
        else:
            hue = "amber" if roll < 0.8 else "pink"
            f.box((district, "neon_" + hue, 0), mid - 0.12, mid + 0.12, 2.55, 2.75, 0.05, 0.2)
            light(district, *f.p(f.at(mid), 2.6, 0.8), hue, 3.0)
        if r.random() < 0.25 and s + 3.2 < w:
            sw, sh = ST_SIZES["ps"]
            cx, cy, cz = f.p(f.at(s + 2.3), 2.9, 0.06)
            f.box((district, "board_frame", 0), s + 2.3 - sw / 2 - 0.05, s + 2.3 + sw / 2 + 0.05, 2.9 - sh / 2 - 0.05, 2.9 + sh / 2 + 0.05, 0.0, 0.05)
            sign(st_name("ps"), cx, cy, cz, sw, sh, f.yaw, district=district, label=False)
        s += r.uniform(6.0, 13.0)


def clutter_back(district, f, r, y0, y1):
    """What a back collects: downpipes, air conditioners on brackets, a fire
    escape on the taller ones."""
    for _ in range(r.randrange(1, 3)):
        s = r.uniform(0.4, f.width - 0.4)
        px, py, pz = f.p(f.at(s), y0, 0.0)
        P.place("pipe_v", px, py, pz, f.yaw, sy=y1 - y0, district=district)
    floors = int((y1 - SHOP_H) / CELL_H)
    bays = max(1, round(f.width / CELL_W))
    for fl in range(floors):
        for b in range(bays):
            if r.random() < 0.3:
                ax, ay, az = f.p(f.at((b + 0.5) * f.width / bays + r.uniform(-0.8, 0.8)), SHOP_H + fl * CELL_H + 0.05, 0.0)
                P.place("ac_wall", ax, ay, az, f.yaw, district=district)
    if y1 > 14 and f.width > 8 and r.random() < 0.35:
        fire_escape(district, f, r.uniform(3.0, f.width - 3.0), SHOP_H + 0.5, min(y1 - 3.0, 36.0))


def awning(district, f, s0, s1, colour, out=1.6, y=3.55):
    """A sloped cloth awning off the wall, dyed and lit through from the shop
    under it, its lit hem along the front."""
    dye = tuple(int(NEON[colour][i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
    a, b = f.at(s0), f.at(s1)
    ti, to = y + 0.4, y
    p = (f.p(a, ti, 0.0), f.p(b, ti, 0.0), f.p(b, to, out), f.p(a, to, out))
    quad((district, "awning", 1), p[0], p[1], p[2], p[3], uvs=((0, 0), (1, 0), (1, 1), (0, 1)), col=dye)
    quad((district, "awning", 1), p[1], p[0], p[3], p[2], uvs=((1, 0), (0, 0), (0, 1), (1, 1)), col=dye)
    f.box((district, "neon_" + colour, 0), s0, s1, y - 0.08, y, out - 0.04, out)


def canopy(district, f, s0, s1, out, y, tint, colour="white"):
    """A flat canopy over the pavement, lit along its underside (the
    crossing's canopy in Fn9gKhU_2_Q@69)."""
    f.box((district, "trim", 0), s0, s1, y, y + 0.3, 0.0, out, col=TRIM[tint])
    f.box((district, "neon_" + colour, 0), s0 + 0.3, s1 - 0.3, y - 0.03, y, out - 0.5, out - 0.35)


def balcony(district, f, s0, s1, y, tint, glass=False, out=1.15):
    """A slab off the wall at a floor line, a parapet round it."""
    col = TRIM[tint]
    f.box((district, "trim", 1), s0, s1, y - 0.16, y, 0.0, out, col=col)
    key = (district, "glass_dark", 1) if glass else (district, "trim", 1)
    pcol = (1, 1, 1, 1) if glass else col
    # The front and both ends, both ways round (seen from the street and from
    # the window behind).
    for flip in (False, True):
        a, b = f.at(s0), f.at(s1)
        pa, pb = f.p(a, y, out), f.p(b, y, out)
        q = [pa, pb, (pb[0], y + 1.0, pb[2]), (pa[0], y + 1.0, pa[2])]
        quad(key, *(q if not flip else [q[1], q[0], q[3], q[2]]), col=pcol)
        for e in (a, b):
            w0, w1 = f.p(e, y, 0.0), f.p(e, y, out)
            q = [w0, w1, (w1[0], y + 1.0, w1[2]), (w0[0], y + 1.0, w0[2])]
            quad(key, *(q if not flip else [q[1], q[0], q[3], q[2]]), col=pcol)
    f.box((district, "metal", 1), s0, s1, y + 1.0, y + 1.06, out - 0.05, out + 0.01)


def fire_escape(district, f, s, y0, y1):
    """A fire escape down a face centred s from its left edge: a landing at
    every floor, its rail, and the stair to the next."""
    k = (district, "metal", 1)
    y = y0
    while y < y1:
        f.box(k, s - 2.2, s + 2.2, y, y + 0.06, 0.0, 1.1)
        f.box(k, s - 2.2, s + 2.2, y, y + 1.0, 1.05, 1.1)
        a0, a1 = f.at(s - 2.0), f.at(s + 1.6)
        quad(k, f.p(a0, y + 0.06, 0.95), f.p(a0, y + 0.06, 0.2), f.p(a1, y + CELL_H, 0.2), f.p(a1, y + CELL_H, 0.95))
        quad(k, f.p(a0, y + 0.06, 0.2), f.p(a0, y + 0.06, 0.95), f.p(a1, y + CELL_H, 0.95), f.p(a1, y + CELL_H, 0.2))
        y += CELL_H


def face_signs(district, f, r, s0, s1, top, density=1.0, colours=None, blades=True):
    """The signs a facade collects: blades standing out from it at every
    height (read up and down the street, painted both sides), boards flat on
    it, neon along a ledge. Each is one of the street's standard signs (the
    site paints them, ST_SIZES)."""
    ceiling = max(SHOP_H + 2.4, min(top - 1.0, 30.0))
    count = int(round(r.uniform(0.25, 0.5) * (s1 - s0) * density))
    for _ in range(count):
        if blades and r.random() < 0.18:
            # A stack: small boards one over another on a frame, each its
            # own, the column of small red and orange boards the show hangs
            # off its blocks (ARL_JWwKdDs@21).
            n = r.randrange(3, 6)
            s = r.uniform(s0 + 0.8, s1 - 0.8)
            y = r.uniform(SHOP_H + 1.0, max(SHOP_H + 1.2, ceiling - n * 1.0))
            out = 0.9
            a = f.at(s)
            for j in range(n):
                size = r.choice(("ps", "ps", "bx"))
                w, h = ST_SIZES[size]
                yy = y + j * 1.05
                pa = f.p(a, yy, out)
                if f.nx != 0:
                    box((district, "board_frame", 0), pa[0] - w / 2 - 0.05, pa[0] + w / 2 + 0.05, yy - h / 2 - 0.05, yy + h / 2 + 0.05, a - 0.06, a + 0.06, scale=1.0)
                    sid = st_name(size)
                    sign(sid, pa[0], yy, a + 0.07, w, h, 0.0, district=district, label=False)
                    sign(sid + "_b", pa[0], yy, a - 0.07, w, h, math.pi, district=district, label=False)
                else:
                    box((district, "board_frame", 0), a - 0.06, a + 0.06, yy - h / 2 - 0.05, yy + h / 2 + 0.05, pa[2] - w / 2 - 0.05, pa[2] + w / 2 + 0.05, scale=1.0)
                    sid = st_name(size)
                    sign(sid, a + 0.07, yy, pa[2], w, h, math.pi / 2, district=district, label=False)
                    sign(sid + "_b", a - 0.07, yy, pa[2], w, h, -math.pi / 2, district=district, label=False)
            f.box((district, "metal", 1), s - 0.05, s + 0.05, y - 0.6, y + n * 1.05, 0.0, out - 0.6)
            continue
        if blades and r.random() < 0.65:
            size = r.choices(["bs", "bm", "bl", "bx"], weights=[3, 4, 3, 1])[0]
            w, h = ST_SIZES[size]
            y = r.uniform(SHOP_H + 0.6 + h / 2, max(SHOP_H + 0.7 + h / 2, ceiling - h / 2))
            s = r.uniform(s0 + 0.6, s1 - 0.6)
            out = 0.35 + w / 2
            a = f.at(s)
            # The blade's frame, edge on to the wall, and its two faces.
            pa = f.p(a, y, out)
            if f.nx != 0:
                box((district, "board_frame", 0), pa[0] - w / 2 - 0.06, pa[0] + w / 2 + 0.06, y - h / 2 - 0.07, y + h / 2 + 0.07,
                    a - 0.08, a + 0.08, scale=1.0)
                sid = st_name(size)
                sign(sid, pa[0], y, a + 0.09, w, h, 0.0, district=district, label=False)
                sign(sid + "_b", pa[0], y, a - 0.09, w, h, math.pi, district=district, label=False)
            else:
                box((district, "board_frame", 0), a - 0.08, a + 0.08, y - h / 2 - 0.07, y + h / 2 + 0.07,
                    pa[2] - w / 2 - 0.06, pa[2] + w / 2 + 0.06, scale=1.0)
                sid = st_name(size)
                sign(sid, a + 0.09, y, pa[2], w, h, math.pi / 2, district=district, label=False)
                sign(sid + "_b", a - 0.09, y, pa[2], w, h, -math.pi / 2, district=district, label=False)
            # Its bracket back to the wall.
            f.box((district, "metal", 1), s - 0.04, s + 0.04, y + h / 2 + 0.07, y + h / 2 + 0.14, 0.0, out)
        else:
            size = r.choices(["ps", "pm", "bx"], weights=[4, 4, 1])[0]
            w, h = ST_SIZES[size]
            if s1 - s0 < w + 1.0:
                continue
            y = r.uniform(SHOP_H + 0.5 + h / 2, max(SHOP_H + 0.6 + h / 2, ceiling - h / 2))
            s = r.uniform(s0 + w / 2 + 0.5, s1 - w / 2 - 0.5)
            out = r.uniform(0.12, 0.4)
            f.box((district, "board_frame", 0), s - w / 2 - 0.07, s + w / 2 + 0.07, y - h / 2 - 0.07, y + h / 2 + 0.07, 0.0, out)
            cx, cy, cz = f.p(f.at(s), y, out + 0.015)
            sign(st_name(size), cx, cy, cz, w, h, f.yaw, district=district, label=False)
    for _ in range(r.randrange(0, 3)):
        y = r.choice([SHOP_H + CELL_H * k for k in range(1, 6)]) + 0.05
        if y > top - 1:
            continue
        f.box((district, "neon_" + r.choice(colours or PANEL_COLOURS), 0), s0 + 0.4, s1 - 0.4, y, y + 0.08, 0.26, 0.3)


def tall_sign(district, f, s, y0, h, sid, w=2.2, out=1.6):
    """A tall vertical sign standing out from a face, edge on to it, both
    sides painted: the canyon's columns of type, read up and down the
    street."""
    a = f.at(s)
    cx, _, cz = f.p(a, 0.0, out)
    if f.nx != 0:
        box((district, "board_frame", 0), cx - w / 2 - 0.1, cx + w / 2 + 0.1, y0 - 0.2, y0 + h + 0.2, a - 0.12, a + 0.12, scale=1.0)
        sign(sid, cx, y0 + h / 2, a + 0.13, w, h, 0.0, district=district, label=False)
        sign(sid + "_b", cx, y0 + h / 2, a - 0.13, w, h, math.pi, district=district, label=False)
    else:
        box((district, "board_frame", 0), a - 0.12, a + 0.12, y0 - 0.2, y0 + h + 0.2, cz - w / 2 - 0.1, cz + w / 2 + 0.1, scale=1.0)
        sign(sid, a + 0.13, y0 + h / 2, cz, w, h, math.pi / 2, district=district, label=False)
        sign(sid + "_b", a - 0.13, y0 + h / 2, cz, w, h, -math.pi / 2, district=district, label=False)
    for y in (y0 + 0.5, y0 + h - 0.5):
        f.box((district, "metal", 1), s - 0.05, s + 0.05, y, y + 0.1, 0.0, out - w / 2)


def roof_dress(district, x0, x1, z0, z1, top, r, cap=6.0, face=None, hero=False, sign_rate=0.35, parapet=True, tint=0):
    """What stands on a flat roof: its parapet, then by the roof's own draw
    a water tank, a stair hut with its door lit, air conditioners, a plant
    room, an antenna, a dish, now and then a sign on posts. Nothing over
    `cap`. `hero`: a roof the hero looks along keeps only what its lens
    cannot see (kit.hero_sees, kit.hero_covers)."""
    # A roof the hero looks along keeps clear of what it frames over the
    # canyon (ARASAKA's name, the figure, the megablock's cyan sign); what
    # stands against its own band of sky stays under the cap.
    fits = (lambda lo, hi: not hero_covers(lo, hi)) if hero else (lambda lo, hi: True)
    ROOFS.append((district, x0, x1, z0, z1, top))
    if parapet:
        t, ph = 0.3, 0.95
        for (a0, a1, b0, b1) in ((x0, x1, z1 - t, z1), (x0, x1, z0, z0 + t), (x0, x0 + t, z0 + t, z1 - t), (x1 - t, x1, z0 + t, z1 - t)):
            if fits((a0, top, b0), (a1, top + ph, b1)):
                box((district, "trim", 0), a0, a1, top, top + ph, b0, b1, scale=1.5, col=TRIM[tint])
    w, d = x1 - x0, z1 - z0
    if not hero and parapet and r.random() < 0.32:
        # A thin line of light round the parapet's top: from the air, the
        # city's dark roofs drawn in cyan and amber (ARL_JWwKdDs@23).
        colour = r.choice(("cyan", "cyan", "amber", "pink", "teal"))
        walls((district, "neon_" + colour, 0), [(x0 - 0.04, z1 + 0.04), (x1 + 0.04, z1 + 0.04), (x1 + 0.04, z0 - 0.04), (x0 - 0.04, z0 - 0.04)],
              top + 0.84, top + 0.93, (1, 1, 1, 1))
    if w < 6 or d < 6 or cap <= 0.5:
        return
    if not hero and cap >= 5.0 and max(w, d) > 10.0 and r.random() < 0.3:
        # A billboard on the roof, on its steel legs, turned to the street.
        yaw = face if face is not None else (0.0 if w >= d else math.pi / 2)
        bw = min(max(w, d) * 0.7, 14.0)
        bh = bw * 0.4
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        by = top + 2.2 + bh / 2
        if fits((cx - bw / 2, top, cz - bw / 2), (cx + bw / 2, by + bh / 2 + 0.3, cz + bw / 2)):
            billboard(district, cx, by, cz, bw, bh, yaw, r)
            for du in (-bw * 0.35, bw * 0.35):
                px_, pz_ = cx + math.cos(yaw) * du, cz - math.sin(yaw) * du
                box((district, "metal", 1), px_ - 0.12, px_ + 0.12, top, by - bh / 2, pz_ - 0.12, pz_ + 0.12, scale=0.5)
            return
    nx, nz = max(1, int(w // 6.5)), max(1, int(d // 6.5))
    plots = [(x0 + 1.2 + (i + 0.5) * (w - 2.4) / nx, z0 + 1.2 + (j + 0.5) * (d - 2.4) / nz,
              (w - 2.4) / nx, (d - 2.4) / nz) for i in range(nx) for j in range(nz)]
    r.shuffle(plots)
    signed = False
    for k_, (px, pz, pw, pd) in enumerate(plots[:8]):
        kind = r.random()
        if k_ == 0 and cap >= 4.4 and min(pw, pd) > 3.2:
            if fits((px - 1.5, top, pz - 1.5), (px + 1.5, top + 4.4, pz + 1.5)):
                P.place("tank_roof", px, top, pz, r.uniform(0, 6.28), district=district)
        elif k_ == 1 and min(pw, pd) > 3.0 and cap >= 2.5:
            hw_, hd_, hh_ = min(1.6, pw * 0.4), min(1.4, pd * 0.4), min(2.7, cap - 0.2)
            if not fits((px - hw_, top, pz - hd_ - 0.2), (px + hw_, top + hh_, pz + hd_ + 0.2)):
                continue
            box((district, "trim", 0), px - hw_, px + hw_, top, top + hh_, pz - hd_, pz + hd_, scale=1.5, col=TRIM[tint])
            box((district, "dark", 1), px - hw_ - 0.1, px + hw_ + 0.1, top + hh_, top + hh_ + 0.12, pz - hd_ - 0.1, pz + hd_ + 0.1, scale=1.0)
            side = r.choice((-1, 1))
            dz = pz + side * (hd_ + 0.02)
            q = ((px - 0.45, top, dz), (px + 0.45, top, dz), (px + 0.45, top + 2.0, dz), (px - 0.45, top + 2.0, dz))
            quad((district, "glow", 0), *(q if side > 0 else (q[1], q[0], q[3], q[2])), col=GLOW["amber"])
        elif kind < 0.4:
            n = r.randrange(1, 4)
            for m in range(n):
                ax = px - pw * 0.3 + m * 1.6
                if ax + 0.7 > px + pw / 2:
                    break
                if fits((ax - 0.7, top, pz - 0.5), (ax + 0.7, top + 1.0, pz + 0.5)):
                    P.place("ac_roof", ax, top, pz, 0.0, district=district)
        elif kind < 0.62 and cap >= 2.4:
            pw2, pd2 = pw * 0.36, pd * 0.32
            ph2 = min(2.4, cap - 0.4)
            if not fits((px - pw2 - 0.1, top, pz - pd2 - 0.1), (px + pw2 + 0.1, top + ph2 + 0.12, pz + pd2 + 0.1)):
                continue
            box((district, "metal", 0), px - pw2, px + pw2, top, top + ph2, pz - pd2, pz + pd2, scale=1.0)
            box((district, "dark", 1), px - pw2 - 0.1, px + pw2 + 0.1, top + ph2, top + ph2 + 0.12, pz - pd2 - 0.1, pz + pd2 + 0.1, scale=1.0)
        elif kind < 0.78 and cap >= 5.0:
            ah = min(cap, 4.5 + r.random() * 3.0)
            if fits((px - 0.7, top, pz - 0.1), (px + 0.7, top + ah + 0.2, pz + 0.1)):
                P.place("antenna", px, top, pz, r.uniform(0, 3.14), sy=ah / 6.0, district=district)
        elif kind < 0.86 and cap >= 2.2:
            if fits((px - 0.8, top, pz - 0.8), (px + 0.8, top + 2.2, pz + 0.8)):
                P.place("dish", px, top, pz, r.uniform(0, 6.28), district=district)
        elif not signed and cap >= 5.0 and max(pw, pd) > 5.0 and r.random() < sign_rate:
            yaw = face if face is not None else (0.0 if w >= d else math.pi / 2)
            sw, sh = min(5.6, max(pw, pd) * 0.8), 1.9
            sy = top + min(cap, 5.4) - sh / 2 - 0.2
            if not fits((px - sw / 2 - 0.2, top, pz - sw / 2 - 0.2), (px + sw / 2 + 0.2, sy + sh / 2 + 0.2, pz + sw / 2 + 0.2)):
                continue
            signed = True
            for du in (-sw * 0.38, sw * 0.38):
                cxp, czp = px + math.cos(yaw) * du, pz - math.sin(yaw) * du
                box((district, "metal", 1), cxp - 0.08, cxp + 0.08, top, sy - sh / 2, czp - 0.08, czp + 0.08, scale=0.5)
            oriented_box((district, "board_frame", 0), px, sy, pz, sw + 0.3, sh + 0.3, 0.22, yaw, scale=1.0)
            colour = r.choice(ROOF_SIGN_COLOURS)
            nxf, nzf = math.sin(yaw), math.cos(yaw)
            strokes = [((u0 + u1) / 2 * sw, (v0 + v1) / 2 * sh, (u1 - u0) * sw, (v1 - v0) * sh)
                       for (u0, u1, v0, v1) in ((-0.5, 0.5, 0.44, 0.5), (-0.5, 0.5, -0.5, -0.44), (-0.5, -0.47, -0.5, 0.5), (0.47, 0.5, -0.5, 0.5))]
            for g in range(3):
                gu = (-1 + g) * sw * 0.28
                for _ in range(r.randrange(2, 4)):
                    vert = r.random() < 0.5
                    su = r.uniform(-0.08, 0.08) * sw
                    sv = r.uniform(-0.25, 0.25) * sh
                    gw, gh = (0.14, sh * r.uniform(0.35, 0.6)) if vert else (sw * r.uniform(0.12, 0.2), 0.14)
                    strokes.append((gu + su, sv, gw, gh))
            for sd, fy in ((1, yaw), (-1, yaw + math.pi)):
                ox, oz = px + nxf * 0.12 * sd, pz + nzf * 0.12 * sd
                for cu, cv, gw, gh in strokes:
                    rotated_quad((district, "glow", 0), ox + math.cos(yaw) * cu, sy + cv, oz - math.sin(yaw) * cu, gw, gh, fy, col=GLOW[colour])


# ---------------------------------------------------------------------------
# The building.
# ---------------------------------------------------------------------------
STYLE_DEFAULTS = dict(
    windows=(0, 1, 3), lit=(0.3, 0.75), warmth=(0.2, 0.95), tints=("charcoal", "navy", "teal", "plum"),
    ledge_every=(1, 2), ledge_out=0.18, balcony=0.18, balcony_glass=0.3, ac=0.22, pipes=0.5, fire_escape=0.3,
    awning=0.55, shop_sign=0.6, signs=1.0, sign_colours=None, shop_colours=None, setback=0.3, setback_in=(2.5, 4.5),
    canopy=0.1, cornice=0.5, roof_cap=6.0, roof_sign=0.35, back_windows=True,
)


def building(lot, height, r, style=None, hero=False, signs=True, setback=None, ground="shops", tint=None,
             window=None, crown_band=None, roof=True, base=0.0, defer_roof=None):
    """Build a building on `lot` up to `height`. `base`: where it stands (a
    crown on a roof stands on that roof: no ground floor, every face open).
    `defer_roof`: a list to put its top roof in instead of dressing it now
    (the hero's roofs are dressed once every mass it looks over is known).
    Returns its tiers (x0, x1, z0, z1, y0, y1)."""
    st = dict(STYLE_DEFAULTS)
    st.update(style or {})
    D = lot.district
    tint = TINTS[r.choice(st["tints"])] if tint is None else (TINTS[tint] if isinstance(tint, str) else tint)
    wstyle = r.choice(st["windows"]) if window is None else window
    col = wall_col(r.uniform(*st["lit"]), wstyle, r.uniform(*st["warmth"]), tint)
    # Its back: smaller windows, fewer lit, the same wall.
    back_col = wall_col(col[0] * 0.75, 6 if wstyle not in (2, 4) else wstyle, col[2], tint)
    tcol = TRIM[tint]
    ov = r.randrange(0, 40)

    # Tiers: the body, and over a setback on its street faces a narrower one.
    tiers = [(lot.x0, lot.x1, lot.z0, lot.z1, base, height)]
    if base > 0:
        setback = False
        lot.sides = {k: ("party" if v == "party" else "open") for k, v in lot.sides.items()}
    if setback is None:
        setback = height > 24 and r.random() < st["setback"]
    if setback:
        hs = SHOP_H + CELL_H * max(2, int((height - SHOP_H) / CELL_H * r.uniform(0.55, 0.8)))
        inset = r.uniform(*st["setback_in"])
        x0, x1, z0, z1 = lot.x0, lot.x1, lot.z0, lot.z1
        for name, kind in lot.sides.items():
            if kind in ("street", "open"):
                if name == "+x":
                    x1 -= inset
                elif name == "-x":
                    x0 += inset
                elif name == "+z":
                    z1 -= inset
                else:
                    z0 += inset
        if x1 - x0 > 5 and z1 - z0 > 5 and height - hs > CELL_H:
            tiers = [(lot.x0, lot.x1, lot.z0, lot.z1, 0.0, hs), (x0, x1, z0, z1, hs, height)]

    for ti, (x0, x1, z0, z1, y0, y1) in enumerate(tiers):
        COLLISION.append(("box", x0, x1, y0, y1, z0, z1, D))
        fs = faces_of(x0, x1, z0, z1)
        lot_planes = {"+x": lot.x1, "-x": lot.x0, "+z": lot.z1, "-z": lot.z0}
        for name, f in fs.items():
            kind = lot.sides.get(name, "back")
            on_lot_line = abs(f.plane - lot_planes[name]) < 1e-6
            if not on_lot_line:
                kind = "open"  # a setback's face over its own terrace
            if kind == "party":
                nb = lot.neighbours.get(name, 0.0)
                lo = max(y0, nb)
                if lo >= y1 - 0.3:
                    continue
                if y1 - lo > 9.0 and f.width > 9.0 and r.random() < 0.4:
                    # A side wall over a lower neighbour: blank, as they are,
                    # and sold to a billboard.
                    f.quad((D, "trim", 0), 0.0, f.width, lo, y1, 0.0, col=tcol)
                    bw = min(f.width - 2.0, 16.0)
                    bh = min(y1 - lo - 3.0, bw * 0.6)
                    cx, cy, cz = f.p(f.at(f.width / 2), lo + 1.5 + bh / 2, 0.25)
                    billboard(D, cx, cy, cz, bw, bh, f.yaw, r, back=False, depth=0.3)
                    continue
                facade_wall((D, "facade", 0), f, lo, y1, col, ov)
                continue
            if kind == "street" and ti == 0:
                facade_wall((D, "facade", 0), f, SHOP_H, y1, col, ov)
                if ground == "shops":
                    shopfront(D, f, r, 0.0, f.width, tint, st["shop_sign"], st["awning"], palette=st["shop_colours"])
                elif ground == "lobby":
                    f.quad((D, "lobby", 0), 0.6, f.width - 0.6, G0, SHOP_H - 0.6, -0.3, col=(r.random(), r.random(), 1, 1))
                    f.quad((D, "trim", 0), 0.0, f.width, SHOP_H - 0.6, SHOP_H, 0.0, col=tcol)
                else:
                    f.quad((D, "trim", 0), 0.0, f.width, 0.0, SHOP_H, 0.0, col=DARK_TRIM)
                # The fascia's ledge over the shops.
                f.ledge((D, "trim", 0), 0.0, f.width, SHOP_H - 0.05, 0.3, 0.35, tcol)
                if r.random() < st["canopy"]:
                    canopy(D, f, 0.3, f.width - 0.3, 2.4, SHOP_H - 0.6, tint, r.choice(("white", "cyan", "amber")))
            elif kind in ("street", "open", "back") or ti > 0:
                if ti == 0 and kind != "street" and y0 < 1.0:
                    if kind == "back" and not st["back_windows"]:
                        f.quad((D, "trim", 0), 0.0, f.width, 0.0, y1, 0.0, col=tcol)
                        continue
                    # A back or a side over a lane: a solid ground floor with
                    # its back doors (each with a caged lamp over it, now and
                    # then a shutter for deliveries), then storeys of the
                    # small windows a building turns to its back.
                    back_ground(D, f, r, tcol)
                    facade_wall((D, "facade", 0), f, SHOP_H, y1, back_col if kind == "back" else col, ov)
                else:
                    facade_wall((D, "facade", 0), f, y0, y1, back_col if kind == "back" else col, ov)
                if kind == "back" and ti == 0:
                    clutter_back(D, f, r, max(y0, 0.0), y1)
            # Ledges along the floor lines, and what hangs on a facade.
            if kind in ("street", "open") or ti > 0:
                every = r.choice(st["ledge_every"]) if isinstance(st["ledge_every"], tuple) else st["ledge_every"]
                first = SHOP_H + CELL_H
                y = first
                while every and y < y1 - 1.0:
                    if y > y0 + 0.5:
                        f.ledge((D, "trim", 1 if kind != "street" else 0), 0.0, f.width, y - 0.22, 0.22, st["ledge_out"], tcol)
                    y += CELL_H * every
                # The cornice at the top.
                if r.random() < st["cornice"]:
                    f.ledge((D, "trim", 0), 0.0, f.width, y1 - 0.55, 0.55, 0.35, tcol)
                bays = max(1, round(f.width / CELL_W))
                bw = f.width / bays
                floors = int((y1 - max(y0, SHOP_H)) / CELL_H)
                base = max(y0, SHOP_H) if y0 > 0 else SHOP_H
                for fl in range(floors):
                    fy = base + fl * CELL_H
                    if fy < y0 + 0.1 and ti > 0:
                        continue
                    for b in range(bays):
                        s = (b + 0.5) * bw
                        roll = r.random()
                        if fl > 0 and roll < st["balcony"] and fy + 1.2 < y1:
                            balcony(D, f, s - bw / 2 + 0.25, s + bw / 2 - 0.25, fy, tint, glass=r.random() < st["balcony_glass"])
                        elif roll < st["balcony"] + st["ac"]:
                            ax, ay, az = f.p(f.at(s + r.uniform(-0.6, 0.6)), fy + 0.05, 0.0)
                            P.place("ac_wall", ax, ay, az, f.yaw, district=D)
                if r.random() < st["pipes"] and y1 > 8:
                    s = r.choice((0.35, f.width - 0.35))
                    px_, py_, pz_ = f.p(f.at(s), max(y0, 0.0), 0.0)
                    P.place("pipe_v", px_, py_, pz_, f.yaw, sy=(y1 - max(y0, 0.0)), district=D)
                if kind == "street" and ti == 0 and y1 > 14 and r.random() < st["fire_escape"] and f.width > 7:
                    fire_escape(D, f, r.uniform(3.0, f.width - 3.0), SHOP_H + 0.5, min(y1 - 3.0, 40.0))
                if signs and kind == "street":
                    face_signs(D, f, r, 0.5, f.width - 0.5, y1, st["signs"], st["sign_colours"])
        # Roofs: the top tier's, and the terrace a setback leaves.
        top_tier = ti == len(tiers) - 1
        if top_tier:
            quad((D, "roof", 0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0),
                 ((0, 0), ((x1 - x0) / 4, 0), ((x1 - x0) / 4, (z1 - z0) / 4), (0, (z1 - z0) / 4)))
            if crown_band:
                walls((D, "neon_" + crown_band, 0), [(x0 - 0.15, z1 + 0.15), (x1 + 0.15, z1 + 0.15), (x1 + 0.15, z0 - 0.15), (x0 - 0.15, z0 - 0.15)],
                      y1 - 1.6, y1 - 1.2, (1, 1, 1, 1))
            if defer_roof is not None:
                defer_roof.append((D, x0, x1, z0, z1, y1, r.randrange(1 << 30), st["roof_cap"], None, tint))
            elif roof:
                roof_dress(D, x0, x1, z0, z1, y1, r, cap=st["roof_cap"], hero=hero, sign_rate=st["roof_sign"], tint=tint)
        else:
            ux0, ux1, uz0, uz1 = tiers[ti + 1][:4]
            for (a0, a1, b0, b1) in ((x0, ux0, z0, z1), (ux1, x1, z0, z1), (ux0, ux1, z0, uz0), (ux0, ux1, uz1, z1)):
                if a1 - a0 > 0.05 and b1 - b0 > 0.05:
                    quad((D, "roof", 0), (a0, y1, b1), (a1, y1, b1), (a1, y1, b0), (a0, y1, b0),
                         ((0, 0), ((a1 - a0) / 4, 0), ((a1 - a0) / 4, (b1 - b0) / 4), (0, (b1 - b0) / 4)))
            # The terrace's parapet along its outer edges.
            for name, kind in lot.sides.items():
                if kind not in ("street", "open"):
                    continue
                f = fs[name]
                f.box((D, "trim", 0), 0.0, f.width, y1, y1 + 1.0, -0.3, 0.0, col=tcol)
            ROOFS.append((D, x0, x1, z0, z1, y1))
    return tiers


def row(district, street_face, a0, a1, depth, plane, heights, widths, r, style=None, ends=("street", "street"),
        back="back", hero=False, **kw):
    """A row of lots along a street face: `street_face` the outward normal of
    the street side ("+x" if the street is to +x), `plane` the lot line,
    from a0 to a1 along it, `depth` deep. `heights(i, a)` and `widths(i)`
    give each lot's. The row's two end faces are `ends` (what they look
    onto: a street at a corner, open, party). Returns the lots built, with
    their heights."""
    lots = []
    a = a0
    i = 0
    while a < a1 - 2.0:
        w = widths(i)
        if a1 - (a + w) < 4.0:
            w = a1 - a
        lots.append([a, a + w, heights(i, a + w / 2)])
        a += w
        i += 1
    out = []
    n = len(lots)
    for j, (la, lb, h) in enumerate(lots):
        if street_face in ("+x", "-x"):
            x0, x1 = (plane - depth, plane) if street_face == "+x" else (plane, plane + depth)
            z0, z1 = la, lb
            lo_name, hi_name = "-z", "+z"
            back_name = "-x" if street_face == "+x" else "+x"
        else:
            z0, z1 = (plane - depth, plane) if street_face == "+z" else (plane, plane + depth)
            x0, x1 = la, lb
            lo_name, hi_name = "-x", "+x"
            back_name = "-z" if street_face == "+z" else "+z"
        sides = {street_face: "street", back_name: back}
        nb = {}
        sides[lo_name] = ends[0] if j == 0 else "party"
        sides[hi_name] = ends[1] if j == n - 1 else "party"
        if j > 0:
            nb[lo_name] = lots[j - 1][2]
        if j < n - 1:
            nb[hi_name] = lots[j + 1][2]
        lot = Lot(x0, x1, z0, z1, street_face, sides, nb, district)
        tiers = building(lot, h, r, style=style, hero=hero, **kw)
        out.append((lot, h, tiers))
    return out
