"""Street furniture and wall clutter, placed as instances of a few prototypes.

A city carries thousands of the same few things: lamps, bollards, bins,
vending machines, air conditioners, planters. Built into the kit's meshes
they would be most of the download; here each is built once, at the origin
facing +z (its front), as `proto_<name>_<material>` meshes, and every one
the districts place is a row of numbers (which prototype, where, which way,
how tall), written to props-source.json for scripts/optimize-world.mjs to
pack and src/world/props.js to draw, one instanced draw per prototype and
material, culled per instance.

A prototype's `box` is its footprint for collision.json (half sizes x, y,
z, in its own frame, its base at y 0); `detail` drops it from the phone.

Small ornament (a bolt, a chain, a coin slot) is drawn through `k(material,
1)`: it becomes a prototype of its own, `<name>__near`, tagged detail and
with a short reach, which nobody places; the site draws it wherever its
prototype stands, near by only, and a phone not at all.

Plants wear a material of their own, `plant`, that only the site's props
draw (src/world/prop-surfaces.js): the vertex colour is the part's colour
and its alpha says what it is (WOOD, BARK, BLOSSOM, FROND); a frond's UV runs
u across it and v from the crown to its tip, a blossom pad's from its
middle (0.5, 0.5) out to its rim.

A prototype may have other shapes, `<name>__v1`, `<name>__v2` ..., which
nobody places either: the site deals the instances of `<name>` among it and
them from where each stands (src/world/prop-deal.js), and gives each a
design of its own besides (a lantern's colour, a machine's front), so a
district goes on placing the one name and the street is not one model.
"""
import math
import random

from mathutils import Vector

from ncw.kit import *  # noqa: F401,F403

PROTOS = {}
INSTANCES = []
NEAR = "__near"
NEAR_REACH = 42.0

material("plant", "24402c", rough=0.8)
# And a front the site draws whole (a vending machine's): one quad, uv 0 to 1
# across and up it, its vertex colour the light it gives the street.
material("face", "8a94a4", emit=1.0)
# And the same for what is printed, not lit (a lamp's banner).
material("print", "6a6258", rough=0.9)
# A lamp's light in the wet air under its head (lamp_air below).
material("halo", "ffb254", emit=1.0)
# A lantern (the site draws it lit from inside, each its own colour, some
# dark). What a part of it is, in its vertex colour's alpha: the paper (its
# red 1 where it is turned about its axis, 0 where it is a flat pane; u once
# round or across it, v up it), a bulb, or a dark fitting of its own colour.
material("paper", "ff5a3c", emit=1.0)
PAPER, BULB, FITTING = 1.0, 0.75, 0.5
SHAPE = "__v"
WOOD, BARK, BLOSSOM, FROND = 0.25, 0.5, 0.75, 1.0
# A tree's wood on a round limb (`tube(..., smooth=True)`): its uv carries
# the limb's own normal (x and z, halved about 0.5), so the site lights it
# as a round thing and runs its bark unbroken across its facets.
LIMB = 0.125
# Which front a `face` or a `print` is, in its vertex colour's alpha (tenths).
SIGNAL, PHONE, GRATE, RAIL, FOOD, MESH, BANNER, BOARD, POSTER, VENDING = (i / 10 for i in range(1, 11))
# And two more `print`s, in twentieths: a box, a crate, a pallet or a sheet
# of paper (CARTON: the red of its vertex colour is a seed of the thing's
# own, its green 1 on a top and 0.5 on a side, its blue what it is, below)
# and a bin bag or a heap (BAG: turned, u once round it, v up it; blue 1 a
# heap).
CARTON, BAG = 0.95, 0.85
BOXED, TIMBER, SODDEN, SHEET, INSIDE = 0.0, 0.25, 0.5, 0.75, 1.0
# The kit's bare steel and its black, as `trim` colours (one draw a prototype).
STEEL, BLACK, CAST = (0.034, 0.038, 0.048, 1), (0.0045, 0.005, 0.0065, 1), (0.02, 0.022, 0.028, 1)


def proto(name, box=(0.3, 0.5, 0.3), detail=False, reach=None):
    """Register a prototype builder. The builder draws at the origin, front
    toward +z, through `k(material, detail=0)` batch keys. `reach`: the
    distance past which it is not drawn (small things), None for always."""
    def register(fn):
        PROTOS[name] = {"build": fn, "box": box, "detail": detail, "reach": reach}
        return fn
    return register


def place(name, x, y, z, yaw=0.0, sy=1.0, sxz=1.0, district=None):
    """One instance: `yaw` turns its front from +z (0) toward +x (pi/2);
    `sy` stretches it up (a pipe's length), `sxz` scales it across."""
    if name not in PROTOS:
        raise KeyError(f"no prototype {name}")
    if district is None:
        from ncw import plan
        district = plan.district_at(x, z)
    INSTANCES.append((name, x, y, z, yaw, sy, sxz, district))


def build_protos():
    for name, p in list(PROTOS.items()):
        near = []

        def k(mat, detail=0, _n=name, _near=near):
            if detail:
                _near.append(mat)
                return ("proto/" + _n + NEAR, mat, 0)
            return ("proto/" + _n, mat, 0)
        p["build"](k)
        if near:
            PROTOS[name + NEAR] = {"build": None, "box": p["box"], "detail": True, "reach": NEAR_REACH}


# ---------------------------------------------------------------------------
# Shapes the prototypes are turned and bent from.
# ---------------------------------------------------------------------------
def lathe(key, cx, cz, prof, segs=8, col=(1, 1, 1, 1), cap=True):
    """A turned shape about a vertical axis: `prof` is (y, radius) pairs from
    the bottom up."""
    rings = [[(cx + r * math.cos(i * math.tau / segs), y, cz + r * math.sin(i * math.tau / segs)) for i in range(segs)]
             for y, r in prof]
    for lo, hi in zip(rings, rings[1:]):
        for i in range(segs):
            j = (i + 1) % segs
            u0, u1 = i / segs * 2, (i + 1) / segs * 2
            quad(key, lo[j], lo[i], hi[i], hi[j], ((u1, lo[0][1] / 2), (u0, lo[0][1] / 2), (u0, hi[0][1] / 2), (u1, hi[0][1] / 2)), col)
    if cap:
        poly(key, list(reversed(rings[-1])), [(0.5, 0.5)] * segs, col)


def tube(key, pts, radii, segs=6, col=(1, 1, 1, 1), cap=False, smooth=False):
    """A bent, tapering limb through `pts`, `radii[i]` thick at each, its
    far end closed if `cap`. `smooth`: its uv is its own normal (see LIMB),
    for the `plant` material."""
    pts = [Vector(p) for p in pts]
    rings = []
    out = []
    for i, p in enumerate(pts):
        w = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        ref = Vector((1, 0, 0)) if abs(w.x) < 0.9 else Vector((0, 0, 1))
        u = w.cross(ref).normalized()
        v = w.cross(u).normalized()
        dirs = [u * math.cos(t) + v * math.sin(t) for t in (n * math.tau / segs for n in range(segs))]
        rings.append([tuple(p + d * radii[i]) for d in dirs])
        out.append([(0.5 + 0.5 * d.x, 0.5 + 0.5 * d.z) for d in dirs])
    for n, (a, b) in enumerate(zip(rings, rings[1:])):
        for i in range(segs):
            j = (i + 1) % segs
            uvs = ((i / segs, n), ((i + 1) / segs, n), ((i + 1) / segs, n + 1), (i / segs, n + 1))
            if smooth:
                uvs = (out[n][i], out[n][j], out[n + 1][j], out[n + 1][i])
            quad(key, a[i], a[j], b[j], b[i], uvs, col)
    if cap:
        poly(key, rings[-1], [(0.5 + 0.5 * w.x, 0.5 + 0.5 * w.z) if smooth else (0.5, 0.5)] * segs, col)


def turned(key, prof, segs=8, col=(1, 0, 0, PAPER), cx=0.0, cz=0.0, ends=""):
    """A lantern's part, turned about a vertical axis: `prof` is (y, radius)
    from the bottom up; u runs once round it and v from its foot to its top,
    as the `paper` material reads them. `ends`: "t", "b" close them."""
    y0, y1 = prof[0][0], prof[-1][0]
    rings = [[((cx + r * math.cos(i * math.tau / segs), y, cz + r * math.sin(i * math.tau / segs)), (i / segs, (y - y0) / (y1 - y0)))
              for i in range(segs + 1)] for y, r in prof]
    for lo, hi in zip(rings, rings[1:]):
        for i in range(segs):
            quad(key, lo[i + 1][0], lo[i][0], hi[i][0], hi[i + 1][0], (lo[i + 1][1], lo[i][1], hi[i][1], hi[i + 1][1]), col)
    if "t" in ends:
        poly(key, [p for p, _ in reversed(rings[-1][:segs])], [(0.5, 1.0)] * segs, col)
    if "b" in ends:
        poly(key, [p for p, _ in rings[0][:segs]], [(0.5, 0.0)] * segs, col)


def frond(key, base, yaw, pitch, length, bend, width, col, segs=4, vee=True):
    """A palm frond from `base`: out along `yaw`, leaving at `pitch` and
    bending down `bend` radians by its tip; the rib with a blade to each
    side, hanging a little below it (`vee`), or one flat blade."""
    dx, dz = math.sin(yaw), math.cos(yaw)
    across = Vector((dz, 0, -dx)) * (width / 2)
    col = (*col[:3], FROND)
    rib = [Vector(base)]
    hang = []
    for i in range(segs + 1):
        ang = pitch - bend * (i / segs) ** 1.2
        hang.append(Vector((dx * math.sin(ang), -math.cos(ang), dz * math.sin(ang))) * (0.2 * width if vee else 0.0))
        if i < segs:
            mid = pitch - bend * ((i + 0.5) / segs) ** 1.2
            rib.append(rib[-1] + Vector((dx * math.cos(mid), math.sin(mid), dz * math.cos(mid))) * (length / segs))
    for i in range(segs):
        r0, r1 = rib[i], rib[i + 1]
        v0, v1 = i / segs, (i + 1) / segs
        l0, l1, e0, e1 = r0 - across + hang[i], r1 - across + hang[i + 1], r0 + across + hang[i], r1 + across + hang[i + 1]
        if vee:
            quad(key, tuple(l0), tuple(r0), tuple(r1), tuple(l1), ((0.0, v0), (0.5, v0), (0.5, v1), (0.0, v1)), col)
            quad(key, tuple(r0), tuple(e0), tuple(e1), tuple(r1), ((0.5, v0), (1.0, v0), (1.0, v1), (0.5, v1)), col)
        else:
            quad(key, tuple(l0), tuple(e0), tuple(e1), tuple(l1), ((0.0, v0), (1.0, v0), (1.0, v1), (0.0, v1)), col)


def pad(key, cx, cy, cz, r, col, segs=7):
    """A pad of blossom or leaves: a shallow dome r across, its rim drooping."""
    col = (*col[:3], BLOSSOM)

    def ring(f, y):
        return [((cx + r * f * math.cos(t), cy + y, cz + r * f * math.sin(t)), (0.5 + 0.5 * f * math.cos(t), 0.5 + 0.5 * f * math.sin(t)))
                for t in ((i + 0.5 * (f < 1)) * math.tau / segs for i in range(segs))]
    mid, rim = ring(0.55, 0.2 * r), ring(1.0, -0.06 * r)
    top = ((cx, cy + 0.3 * r, cz), (0.5, 0.5))
    for i in range(segs):
        j = (i + 1) % segs
        poly(key, [top[0], mid[i][0], mid[j][0]], [top[1], mid[i][1], mid[j][1]], col)
        poly(key, [mid[i][0], rim[j][0], mid[j][0]], [mid[i][1], rim[j][1], mid[j][1]], col)
        poly(key, [mid[i][0], rim[i][0], rim[j][0]], [mid[i][1], rim[i][1], rim[j][1]], col)


def planter(k, h, lamp, stone=(0.5, 0.5, 0.52, 1)):
    """A square planter 1.6 m across and h high: a concrete body under a
    stone rim, earth in it, a strip of light let in under the rim on every
    side, and two lamps in the earth turned up at what grows there."""
    box(k("trim"), -0.76, 0.76, 0.0, h - 0.1, -0.76, 0.76, scale=1.0, col=(0.15, 0.155, 0.165, 1))
    box(k("trim"), -0.8, 0.8, h - 0.1, h, -0.8, 0.8, scale=1.0, col=stone)
    quad(k("trim"), (-0.64, h + 0.012, 0.64), (0.64, h + 0.012, 0.64), (0.64, h + 0.012, -0.64), (-0.64, h + 0.012, -0.64), col=(0.07, 0.055, 0.045, 1))
    for yaw in (0.0, math.pi / 2, math.pi, -math.pi / 2):
        rotated_quad(k("glow"), math.sin(yaw) * 0.763, h - 0.14, math.cos(yaw) * 0.763, 1.44, 0.035, yaw, col=lamp)
    for x, z in ((0.34, 0.36), (-0.36, -0.3)):
        quad(k("glow"), (x - 0.06, h + 0.02, z + 0.06), (x + 0.06, h + 0.02, z + 0.06), (x + 0.06, h + 0.02, z - 0.06), (x - 0.06, h + 0.02, z - 0.06), col=lamp)


def face(k, kind, cx, cy, cz, w, h, yaw, light=(0.5, 0.5, 0.5), mat="face"):
    """A front the site draws (`kind`: VENDING, POSTER, FOOD ...), w by h,
    facing yaw; `light` is the light it gives the street."""
    rotated_quad(k(mat), cx, cy, cz, w, h, yaw, col=(*light[:3], kind))


def carton(k, x0, x1, y0, y1, z0, z1, seed, what=BOXED, yaw=0.0, top=True):
    """A box the site draws on four sides and its top (`print` quads): by
    where it stands and `seed`, a carton with its tape, its print, a label
    and straps, a wooden crate with a stencil or a plastic one; or `what`
    (TIMBER: pallets stacked). Turned `yaw` about its own middle."""
    cx, cz, c, s_ = (x0 + x1) / 2, (z0 + z1) / 2, math.cos(yaw), math.sin(yaw)

    def at(x, y, z):
        return (cx + (x - cx) * c + (z - cz) * s_, y, cz - (x - cx) * s_ + (z - cz) * c)
    key = k("print")
    for (xa, za), (xb, zb) in (((x0, z1), (x1, z1)), ((x1, z1), (x1, z0)), ((x1, z0), (x0, z0)), ((x0, z0), (x0, z1))):
        quad(key, at(xa, y0, za), at(xb, y0, zb), at(xb, y1, zb), at(xa, y1, za), col=(seed, 0.5, what, CARTON))
    if top:
        quad(key, at(x0, y1, z1), at(x1, y1, z1), at(x1, y1, z0), at(x0, y1, z0), col=(seed, 1.0, what, CARTON))


def litter(k, x, z, w, d, yaw, seed, what=SHEET):
    """Something flat on the ground: a sheet of paper, or (SODDEN) a carton
    trodden flat, its edges torn."""
    c, s_ = math.cos(yaw), math.sin(yaw)
    quad(k("print"), *((x + px * c + pz * s_, 0.012, z - px * s_ + pz * c) for px, pz in ((-w / 2, d / 2), (w / 2, d / 2), (w / 2, -d / 2), (-w / 2, -d / 2))),
         col=(seed, 1.0, what, CARTON))


def lamp_air(k, y, z, fall, colour):
    """The light in the rain under a lamp whose head is at height y, z out
    from its post: a quad in the lamp's own plane, which the site turns to
    the eye and draws as a glow at the head and a veil falling `fall`
    metres (src/world/shafts.js). Its uv is metres across and metres below
    the head."""
    x, over = 2.2, -1.2
    quad(k("halo"), (-x, y - fall, z), (x, y - fall, z), (x, y - over, z), (-x, y - over, z),
         ((-x, fall), (x, fall), (x, over), (-x, over)), (*colour[:3], fall / 10.0))


# ---------------------------------------------------------------------------
# The prototypes. Sizes are real: a bollard is a metre, a lamp seven.
# ---------------------------------------------------------------------------
@proto("lamp_sodium", box=(0.15, 3.5, 0.15))
def _lamp_sodium(k):
    """A street lamp (Zq4zTcIM0yQ@107, JtqIas3bYhg@64): a cast base, a
    tapering column, a swan neck out over the road (toward +z) to a sodium
    head with its lens underneath; on the pavement side a bracket for a
    banner."""
    steel, cast, housing = (0.05, 0.054, 0.064, 1), (0.03, 0.032, 0.04, 1), (0.02, 0.021, 0.026, 1)
    t = k("trim")
    lathe(t, 0.0, 0.0, ((0.0, 0.16), (0.42, 0.16), (0.52, 0.1)), segs=6, col=cast, cap=False)
    lathe(t, 0.0, 0.0, ((0.52, 0.095), (3.6, 0.082), (6.9, 0.066)), segs=6, col=steel, cap=False)
    tube(t, ((0.0, 6.8, 0.0), (0.0, 7.18, 0.4), (0.0, 7.3, 1.1), (0.0, 7.22, 1.8)), (0.06, 0.055, 0.05, 0.045), segs=4, col=steel)
    box(t, -0.21, 0.21, 7.05, 7.2, 1.72, 2.46, scale=0.5, col=housing)
    # The lens, and its lit edge so the head reads from the side.
    quad(k("neon_amber"), (-0.18, 7.02, 1.77), (0.18, 7.02, 1.77), (0.18, 7.02, 2.41), (-0.18, 7.02, 2.41))
    for yaw, cx, cz, w in ((0.0, 0.0, 2.41, 0.36), (math.pi, 0.0, 1.77, 0.36), (math.pi / 2, 0.18, 2.09, 0.64), (-math.pi / 2, -0.18, 2.09, 0.64)):
        rotated_quad(k("neon_amber"), cx, 7.035, cz, w, 0.03, yaw)
    lamp_air(k, 7.02, 2.09, 4.8, GLOW["amber"])
    # The banner's bracket, and the banner (one lamp in two flies one).
    box(t, -0.02, 0.02, 4.86, 4.9, -0.78, -0.06, scale=0.5, col=cast)
    rotated_quad(k("print"), 0.0, 4.06, -0.42, 0.6, 1.6, math.pi / 2, col=(0.3, 0.3, 0.3, BANNER))
    # The access door in the base and a junction box, on the pavement side.
    quad(t, (-0.07, 0.08, -0.165), (-0.07, 0.36, -0.165), (0.07, 0.36, -0.165), (0.07, 0.08, -0.165), col=steel)
    box(t, -0.09, 0.09, 2.3, 2.62, -0.2, -0.085, scale=0.5, col=cast)


@proto("lamp_short", box=(0.12, 2.0, 0.12), reach=380)
def _lamp_short(k):
    """A pavement lamp column (KvMY1uzSC1E@94): a foot, a slim post, a
    cradle, a tall lantern of orange glass under a hat."""
    cast = (0.028, 0.03, 0.038, 1)
    t = k("trim")
    lathe(t, 0.0, 0.0, ((0.0, 0.125), (0.3, 0.125), (0.4, 0.07), (3.48, 0.058), (3.6, 0.15)), segs=6, col=cast, cap=False)
    lathe(k("neon_amber"), 0.0, 0.0, ((3.6, 0.13), (4.3, 0.13)), segs=6, cap=False)
    lathe(t, 0.0, 0.0, ((4.3, 0.2), (4.47, 0.04)), segs=6, col=cast)
    lamp_air(k, 3.95, 0.0, 2.6, GLOW["amber"])
    # The lantern's glazing bars.
    for i in range(6):
        a = i * math.tau / 6
        rotated_quad(t, 0.134 * math.cos(a), 3.95, 0.134 * math.sin(a), 0.022, 0.7, math.pi / 2 - a, col=cast)


@proto("bollard", box=(0.12, 0.5, 0.12), reach=260, detail=True)
def _bollard(k):
    """A black steel bollard: a foot, a reflective band under a domed cap
    (Zq4zTcIM0yQ@40)."""
    lathe(k("trim"), 0.0, 0.0, ((0.0, 0.125), (0.07, 0.105), (0.72, 0.105)), segs=6, col=CAST, cap=False)
    lathe(k("glow"), 0.0, 0.0, ((0.72, 0.112), (0.78, 0.112)), segs=6, col=GLOW["amber"], cap=False)
    lathe(k("trim"), 0.0, 0.0, ((0.78, 0.105), (0.95, 0.07)), segs=6, col=CAST)


@proto("bollard_cube", box=(0.3, 0.3, 0.3), reach=260, detail=True)
def _bollard_cube(k):
    """A concrete cube, corpo plazas' kind (Fn9gKhU_2_Q@77)."""
    box(k("concrete"), -0.3, 0.3, 0.0, 0.6, -0.3, 0.3, scale=1.0)


@proto("bin", box=(0.3, 0.5, 0.3), reach=260, detail=True)
def _bin(k):
    """A litter bin: a drum with the city's yellow band, a hooded top, its
    mouth to the front."""
    green = (0.03, 0.045, 0.045, 1)
    lathe(k("trim"), 0.0, 0.0, ((0.0, 0.25), (0.62, 0.28)), segs=7, col=green, cap=False)
    lathe(k("trim"), 0.0, 0.0, ((0.62, 0.285), (0.72, 0.285)), segs=7, col=(0.4, 0.3, 0.03, 1), cap=False)
    lathe(k("trim"), 0.0, 0.0, ((0.72, 0.28), (0.92, 0.29), (1.02, 0.2)), segs=7, col=green)
    rotated_quad(k("trim"), 0.0, 0.83, 0.294, 0.26, 0.1, 0.0, col=BLACK)


def _vending_machine(k, light):
    """A vending machine, its back to a wall and its front toward +z: the
    cabinet with a hood over the header, and the front, which the site draws
    whole and each machine its own (the window of cans, the header, the
    screen and keypad, the coin slot, the tray)."""
    body = (0.045, 0.048, 0.056, 1)
    box(k("trim"), -0.48, 0.48, 0.0, 1.95, -0.4, 0.4, scale=1.0, col=body)
    box(k("trim"), -0.5, 0.5, 1.9, 1.97, 0.4, 0.45, scale=1.0, col=body)
    rotated_quad(k("face"), 0.0, 0.975, 0.406, 0.96, 1.95, 0.0, col=(*light, VENDING))


@proto("vending", box=(0.5, 1.0, 0.4))
def _vending(k):
    _vending_machine(k, tuple((a + b) / 2 for a, b in zip(GLOW["cyan"][:3], GLOW["white"][:3])))


@proto("vending_warm", box=(0.5, 1.0, 0.4))
def _vending_warm(k):
    _vending_machine(k, tuple((a + b) / 2 for a, b in zip(GLOW["amber"][:3], GLOW["pink"][:3])))


@proto("food_box", box=(0.35, 0.6, 0.3), reach=300, detail=True)
def _food_box(k):
    """An Insta Food box (Fn9gKhU_2_Q@34): a yellow cabinet on a post, its
    menu lit on both faces."""
    box(k("trim"), -0.06, 0.06, 0.0, 0.7, -0.06, 0.06, scale=0.5, col=CAST)
    box(k("trim"), -0.35, 0.35, 0.68, 1.32, -0.26, 0.26, scale=0.5, col=(0.3, 0.24, 0.03, 1))
    for yaw, z in ((0.0, 0.266), (math.pi, -0.266)):
        face(k, FOOD, 0.0, 1.0, z, 0.66, 0.6, yaw, GLOW["yellow"])


@proto("signal_box", box=(0.3, 0.7, 0.25), reach=300, detail=True)
def _signal_box(k):
    """A crossing's signal on its post (Zq4zTcIM0yQ@40): the walking figure
    lit and the seconds left over it, under a hood; the button's box below."""
    lathe(k("trim"), 0.0, 0.0, ((0.0, 0.06), (2.9, 0.06)), segs=6, col=CAST)
    box(k("trim"), -0.22, 0.22, 2.2, 2.85, -0.12, 0.14, scale=0.5, col=BLACK)
    face(k, SIGNAL, 0.0, 2.52, 0.146, 0.28, 0.4, 0.0, GLOW["yellow"])
    box(k("trim"), -0.24, 0.24, 2.85, 2.88, -0.12, 0.27, scale=0.5, col=CAST)
    box(k("trim"), -0.07, 0.07, 1.0, 1.2, 0.05, 0.13, scale=0.5, col=(0.3, 0.24, 0.03, 1))


@proto("traffic_light", box=(0.15, 3.0, 0.15))
def _traffic_light(k):
    """A signal mast: a cast base, a column, its arm out over the lanes
    (toward +z) and the head hung on it, three lenses to the traffic it
    stops (which comes from +x), the red one lit."""
    t = k("trim")
    lathe(t, 0.0, 0.0, ((0.0, 0.18), (0.5, 0.18), (0.6, 0.1), (6.0, 0.085)), segs=6, col=CAST)
    tube(t, ((0.0, 5.86, 0.0), (0.0, 5.86, 4.5)), (0.055, 0.045), segs=4, col=STEEL, cap=True)
    box(t, -0.13, 0.13, 4.85, 5.8, 4.1, 4.42, scale=0.5, col=BLACK)
    for y, col in ((5.55, GLOW["red"]), (5.3, tuple(v * 0.12 for v in GLOW["amber"][:3]) + (1,)), (5.05, tuple(v * 0.1 for v in GLOW["green"][:3]) + (1,))):
        rotated_quad(k("glow"), 0.136, y, 4.26, 0.2, 0.2, math.pi / 2, col=col)
    # The head's backplate and the arm's brace.
    rotated_quad(t, -0.134, 5.32, 4.26, 0.46, 1.06, -math.pi / 2, col=CAST)
    tube(t, ((0.0, 5.1, 0.07), (0.0, 5.8, 1.0)), (0.03, 0.03), segs=4, col=STEEL)


@proto("planter_palm", box=(0.8, 1.5, 0.8))
def _planter_palm(k):
    """A palm in a lit square planter (Fn9gKhU_2_Q@77, YRL74JmhVgk@30): a
    ringed trunk leaning a little, the boot of old frond bases under the
    crown, and the crown itself: young fronds standing, the season's arching
    out and over, last year's hanging brown under them."""
    planter(k, 0.7, GLOW["amber"])
    bark = (0.2, 0.165, 0.135, BARK)
    trunk = ((0.0, 0.62, 0.0), (0.04, 1.5, 0.02), (0.14, 3.1, 0.05), (0.27, 4.8, 0.06), (0.36, 6.2, 0.04))
    tube(k("plant"), trunk, (0.2, 0.15, 0.13, 0.12, 0.115), segs=6, col=bark)
    tube(k("plant"), ((0.36, 6.2, 0.04), (0.385, 6.5, 0.035), (0.4, 6.82, 0.03)), (0.12, 0.2, 0.11), segs=6, col=(0.15, 0.14, 0.09, BARK))
    top = (0.4, 6.75, 0.03)
    rng = random.Random(11)
    tiers = ((5, (0.95, 1.25), (1.5, 1.9), (2.5, 2.8), (0.13, 0.33, 0.15), 4, True),
             (5, (0.25, 0.55), (1.35, 1.65), (2.75, 3.0), (0.11, 0.29, 0.13), 4, True),
             (4, (-0.35, -0.05), (0.9, 1.2), (2.3, 2.6), (0.2, 0.22, 0.09), 3, False))
    for n, pitch, bend, length, col, segs, vee in tiers:
        turn = rng.uniform(0.0, math.tau)
        for i in range(n):
            yaw = turn + (i + rng.uniform(-0.22, 0.22)) * math.tau / n
            frond(k("plant"), top, yaw, rng.uniform(*pitch), rng.uniform(*length), rng.uniform(*bend), 1.0, col, segs, vee)


@proto("planter_tree", box=(0.8, 1.5, 0.8))
def _planter_tree(k):
    """A blossom tree in a low stone planter (KvMY1uzSC1E@94): a dark round
    trunk, flared at the root, that twists as it climbs, three limbs and
    three boughs off them, and the blossom in pads at their ends, tier over
    tier."""
    planter(k, 0.6, GLOW["white"], stone=(0.42, 0.4, 0.42, 1))
    bark = (0.105, 0.078, 0.07, LIMB)
    w = k("plant")
    tube(w, ((0.0, 0.5, 0.0), (0.02, 0.64, 0.01), (0.1, 0.95, 0.05), (0.09, 1.32, 0.1), (-0.07, 1.68, 0.13), (-0.02, 2.0, 0.07),
             (0.1, 2.28, 0.0), (0.06, 2.58, -0.06), (0.02, 2.84, -0.1)),
         (0.3, 0.2, 0.165, 0.15, 0.14, 0.125, 0.11, 0.095, 0.08), segs=8, col=bark, smooth=True)
    for limb in (((-0.07, 1.68, 0.13), (-0.27, 1.9, 0.25), (-0.45, 2.2, 0.38), (-0.6, 2.55, 0.5)),
                 ((0.1, 2.28, 0.0), (0.3, 2.44, -0.12), (0.47, 2.7, -0.24), (0.6, 3.0, -0.34)),
                 ((0.02, 2.84, -0.1), (0.04, 3.1, -0.2), (-0.03, 3.4, -0.32), (-0.12, 3.7, -0.42))):
        tube(w, limb, (0.095, 0.078, 0.058, 0.04), segs=6, col=bark, smooth=True)
    for bough in (((-0.02, 2.0, 0.07), (0.18, 2.2, 0.3), (0.4, 2.45, 0.48)),
                  ((0.04, 3.1, -0.2), (-0.25, 3.2, -0.36), (-0.5, 3.28, -0.48)),
                  ((-0.45, 2.2, 0.38), (-0.3, 2.7, 0.3), (-0.12, 3.15, 0.2))):
        tube(w, bough, (0.06, 0.045, 0.03), segs=5, col=bark, smooth=True)
    pink, rose, pale = (0.8, 0.27, 0.46), (0.74, 0.17, 0.36), (0.82, 0.45, 0.58)
    for cx, cy, cz, r, col in ((-0.62, 2.62, 0.52, 0.8, pink), (0.62, 3.08, -0.36, 0.82, rose), (-0.12, 3.82, -0.44, 0.78, pale),
                               (-0.1, 3.2, 0.2, 0.7, rose), (0.42, 2.5, 0.5, 0.52, pale), (-0.52, 3.3, -0.5, 0.56, pink)):
        pad(k("plant"), cx, cy, cz, r, col)


@proto("bench", box=(1.0, 0.25, 0.3), reach=220, detail=True)
def _bench(k):
    """A bench, its front toward +z: a slatted seat and a back on two cast
    frames."""
    slat = (0.16, 0.1, 0.06, 1)
    box(k("trim"), -0.95, 0.95, 0.42, 0.47, -0.22, 0.25, scale=0.6, col=slat)
    box(k("trim"), -0.95, 0.95, 0.56, 0.86, -0.27, -0.23, scale=0.6, col=slat)
    for x in (-0.8, 0.8):
        box(k("trim"), x - 0.04, x + 0.04, 0.0, 0.42, -0.2, 0.2, scale=0.5, col=CAST)
        box(k("trim"), x - 0.03, x + 0.03, 0.42, 0.86, -0.3, -0.26, scale=0.5, col=CAST)


@proto("cctv", box=(0.1, 2.5, 0.1), reach=300, detail=True)
def _cctv(k):
    cylinder(k("trim"), 0.0, 0.0, 0.0, 4.8, 0.07, segs=6, col=STEEL)
    for yaw in (0.3, 2.4, 4.4):
        oriented_box(k("trim"), math.sin(yaw) * 0.25, 4.6, math.cos(yaw) * 0.25, 0.14, 0.14, 0.4, yaw, scale=0.5, col=BLACK)
    box(k("glow"), -0.03, 0.03, 4.85, 4.9, -0.03, 0.03, scale=0.5, col=GLOW["red"])


@proto("ac_wall", box=(0.4, 0.3, 0.3), reach=320, detail=True)
def _ac_wall(k):
    """An air conditioner hung on a wall (its back at z 0, out toward +z),
    its fan's grille drawn as a dark disc."""
    box(k("trim"), -0.42, 0.42, 0.0, 0.58, 0.0, 0.5, scale=0.6, col=STEEL)
    quad(k("trim"), (-0.32, 0.08, 0.505), (0.12, 0.08, 0.505), (0.12, 0.5, 0.505), (-0.32, 0.5, 0.505), col=BLACK)


@proto("ac_roof", box=(0.7, 0.5, 0.5), reach=420, detail=True)
def _ac_roof(k):
    box(k("trim"), -0.7, 0.7, 0.0, 0.95, -0.5, 0.5, scale=0.8, col=STEEL)
    cylinder(k("trim"), 0.0, 0.0, 0.95, 1.0, 0.36, segs=10, col=BLACK)


@proto("pipe_v", box=(0.08, 0.5, 0.08), reach=260, detail=True)
def _pipe_v(k):
    """A downpipe a metre long (stretched by sy), off the wall at z 0.12."""
    cylinder(k("metal"), 0.0, 0.12, 0.0, 1.0, 0.06, segs=6, cap=False)


# A lantern hangs by its top; the origin is its middle. Four shapes under the
# one name (the site deals them row by row, and their colours).
LANTERN = {"box": (0.2, 0.3, 0.2), "reach": 320, "detail": True}
HOOP, FRAME, CORD = (0.012, 0.01, 0.01, FITTING), (0.03, 0.017, 0.012, FITTING), (0.006, 0.006, 0.007, FITTING)


def _tassel(key, y, drop=0.09):
    """A lantern's tassel: two strips, crossed, hanging from y."""
    for yaw in (0.0, math.pi / 2):
        rotated_quad(key, 0.0, y - drop / 2, 0.0, 0.035, drop, yaw, col=(0.3, 0.06, 0.03, FITTING))


@proto("lantern", **LANTERN)
def _lantern(k):
    """A round paper lantern: a black hoop at its top and its foot, a
    tassel under it."""
    p = k("paper")
    turned(p, ((-0.24, 0.1), (-0.18, 0.16), (-0.065, 0.2), (0.065, 0.2), (0.18, 0.16), (0.24, 0.1)))
    turned(p, ((0.24, 0.105), (0.3, 0.09)), col=HOOP, ends="t")
    turned(p, ((-0.28, 0.09), (-0.24, 0.105)), col=HOOP, ends="b")
    _tassel(p, -0.28)


@proto("lantern" + SHAPE + "1", **LANTERN)
def _lantern_long(k):
    """A long one: a cylinder of paper, barely bellied, capped at both
    ends, a tassel under it."""
    p = k("paper")
    turned(p, ((-0.25, 0.115), (-0.2, 0.135), (0.2, 0.135), (0.25, 0.115)))
    turned(p, ((0.25, 0.12), (0.31, 0.105)), col=HOOP, ends="t")
    turned(p, ((-0.29, 0.105), (-0.25, 0.12)), col=HOOP, ends="b")
    _tassel(p, -0.29)


@proto("lantern" + SHAPE + "2", **LANTERN)
def _lantern_box(k):
    """A square one in a wooden frame: four panes of paper (the site draws
    their lattice) between corner posts, under a top with a knob, on a foot."""
    p = k("paper")
    for yaw in (0.0, math.pi / 2, math.pi, -math.pi / 2):
        rotated_quad(p, math.sin(yaw) * 0.125, 0.0, math.cos(yaw) * 0.125, 0.25, 0.46, yaw, col=(0, 0, 0, PAPER))
    box(p, -0.155, 0.155, 0.23, 0.275, -0.155, 0.155, scale=1.0, col=FRAME)
    box(p, -0.06, 0.06, 0.275, 0.31, -0.06, 0.06, scale=1.0, col=FRAME)
    box(p, -0.155, 0.155, -0.275, -0.23, -0.155, 0.155, scale=1.0, col=FRAME, bottom=True)
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(p, sx * 0.136 - 0.017, sx * 0.136 + 0.017, -0.23, 0.23, sz * 0.136 - 0.017, sz * 0.136 + 0.017, scale=1.0, col=FRAME)


@proto("lantern" + SHAPE + "3", **LANTERN)
def _lantern_bulbs(k):
    """A drop of three bulbs on a cord, each in its socket."""
    p = k("paper")
    for yaw in (0.0, math.pi / 2):
        rotated_quad(p, 0.0, 0.04, 0.0, 0.014, 0.54, yaw, col=CORD)
    for y, x, z in ((0.17, 0.035, 0.0), (-0.03, -0.03, 0.02), (-0.22, 0.012, -0.035)):
        turned(p, ((y - 0.058, 0.014), (y - 0.04, 0.043), (y, 0.058), (y + 0.036, 0.045), (y + 0.052, 0.03)), segs=6, col=(1, 0, 0, BULB), cx=x, cz=z, ends="b")
        turned(p, ((y + 0.05, 0.032), (y + 0.09, 0.03)), segs=5, col=CORD, cx=x, cz=z, ends="t")


@proto("drum", box=(0.3, 0.45, 0.3), reach=260, detail=True)
def _drum(k):
    """An oil drum, rusted, with its two hoops."""
    rust = (0.36, 0.14, 0.07, 1)
    lathe(k("trim"), 0.0, 0.0, ((0.0, 0.285), (0.88, 0.285)), segs=8, col=rust)
    for y in (0.28, 0.58):
        lathe(k("trim"), 0.0, 0.0, ((y, 0.3), (y + 0.04, 0.3)), segs=8, col=(0.25, 0.1, 0.05, 1), cap=False)


@proto("hydrant", box=(0.15, 0.4, 0.15), reach=200, detail=True)
def _hydrant(k):
    """A hydrant: red paint on iron, a flanged barrel under a bonnet worn to
    the metal, the nut on top, two hose outlets and the pumper's to the
    front, each under its cap."""
    red, worn, iron = (0.42, 0.06, 0.05, 1), (0.3, 0.17, 0.14, 1), (0.1, 0.1, 0.11, 1)
    t = k("trim")
    lathe(t, 0.0, 0.0, ((0.0, 0.15), (0.045, 0.15), (0.06, 0.1), (0.5, 0.1), (0.515, 0.135), (0.555, 0.135), (0.57, 0.1)), segs=7, col=red, cap=False)
    lathe(t, 0.0, 0.0, ((0.57, 0.1), (0.66, 0.085), (0.71, 0.05)), segs=7, col=worn)
    lathe(t, 0.0, 0.0, ((0.71, 0.032), (0.77, 0.032)), segs=5, col=iron)
    for a, b, r in (((-0.09, 0.4, 0.0), (-0.165, 0.4, 0.0), 0.047), ((0.09, 0.4, 0.0), (0.165, 0.4, 0.0), 0.047), ((0.0, 0.34, 0.09), (0.0, 0.34, 0.17), 0.062)):
        tube(t, (a, b), (r, r), segs=5, col=iron, cap=True)
    # Near by: the bolts round its foot and the caps' chains.
    for i in range(6):
        a = (i + 0.5) * math.tau / 6
        x, z = 0.125 * math.cos(a), 0.125 * math.sin(a)
        quad(k("trim", 1), (x - 0.013, 0.049, z + 0.013), (x + 0.013, 0.049, z + 0.013), (x + 0.013, 0.049, z - 0.013), (x - 0.013, 0.049, z - 0.013), col=iron)
    for s_ in (-1, 1):
        a, m, b = (s_ * 0.16, 0.37, 0.0), (s_ * 0.135, 0.27, 0.05), (s_ * 0.085, 0.3, 0.07)
        for p0, p1 in ((a, m), (m, b)):
            for q0, q1 in ((p0, p1), (p1, p0)):
                quad(k("trim", 1), (q0[0], q0[1] - 0.006, q0[2]), (q1[0], q1[1] - 0.006, q1[2]), (q1[0], q1[1] + 0.006, q1[2]), (q0[0], q0[1] + 0.006, q0[2]), col=iron)


@proto("phone_booth", box=(0.5, 1.2, 0.5))
def _phone_booth(k):
    """A phone booth open to +z: two sides and a back of dark glass under a
    lit top, the phone's panel on the back."""
    box(k("trim"), -0.5, 0.5, 0.0, 0.12, -0.5, 0.5, scale=0.6, col=STEEL)
    for x in (-0.47, 0.47):
        box(k("trim"), x - 0.03, x + 0.03, 0.12, 2.3, -0.47, 0.47, scale=0.5, col=STEEL)
    box(k("glow"), -0.5, 0.5, 2.3, 2.5, -0.5, 0.5, scale=0.5, col=GLOW["cyan"])
    box(k("trim"), -0.44, 0.44, 0.3, 2.2, -0.46, -0.44, scale=0.5, col=(0.008, 0.012, 0.016, 1))
    face(k, PHONE, 0.0, 1.35, -0.43, 0.5, 0.9, 0.0, GLOW["cyan"])


@proto("tank_roof", box=(1.4, 2.2, 1.4), reach=700)
def _tank_roof(k):
    """A water tank on its stand, a roof's signature."""
    for lx, lz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        box(k("trim"), lx * 0.95 - 0.08, lx * 0.95 + 0.08, 0.0, 1.9, lz * 0.95 - 0.08, lz * 0.95 + 0.08, scale=0.5, col=STEEL)
    cylinder(k("trim"), 0.0, 0.0, 1.9, 4.1, 1.35, segs=10, col=STEEL)
    cylinder(k("trim"), 0.0, 0.0, 4.1, 4.35, 1.42, segs=10, col=BLACK)


@proto("antenna", box=(0.1, 3.0, 0.1), reach=700)
def _antenna(k):
    """An antenna, guyed, its red lamp at the tip (6 m, stretched by sy)."""
    cylinder(k("metal"), 0.0, 0.0, 0.0, 6.0, 0.06, segs=4, cap=False)
    for y in (3.3, 4.8):
        box(k("metal"), -0.7, 0.7, y, y + 0.05, -0.03, 0.03, scale=0.5)
    box(k("glow"), -0.1, 0.1, 6.0, 6.2, -0.1, 0.1, scale=0.5, col=GLOW["red"])


@proto("dish", box=(0.6, 0.8, 0.6), reach=420, detail=True)
def _dish(k):
    box(k("metal"), -0.05, 0.05, 0.0, 1.1, -0.05, 0.05, scale=0.5)
    dish(k("metal"), (0.0, 1.5, 0.0), (0.0, 0.6, 0.8), 0.7)


@proto("barrier", box=(1.0, 0.45, 0.25), reach=260, detail=True)
def _barrier(k):
    """A road barrier, striped."""
    box(k("hazard"), -1.0, 1.0, 0.55, 0.85, -0.04, 0.04, scale=0.5)
    for x in (-0.85, 0.85):
        box(k("dark"), x - 0.04, x + 0.04, 0.0, 0.85, -0.25, 0.25, scale=0.5)


@proto("warning_tri", box=(0.4, 0.4, 0.05), reach=260, detail=True)
def _warning_tri(k):
    """A red warning triangle, as the megabuilding's columns are hung with
    them (Fn9gKhU_2_Q@24); its face toward +z."""
    poly(k("glow"), [(-0.4, 0.0, 0.02), (0.4, 0.0, 0.02), (0.0, 0.7, 0.02)], [(0, 0), (1, 0), (0.5, 1)], GLOW["red"])
    poly(k("dark"), [(0.4, 0.0, -0.02), (-0.4, 0.0, -0.02), (0.0, 0.7, -0.02)], [(0, 0), (1, 0), (0.5, 1)])


@proto("pole_utility", box=(0.15, 4.5, 0.15), reach=700)
def _pole_utility(k):
    """A wooden utility pole with two crossarms (JtqIas3bYhg@80)."""
    cylinder(k("trim"), 0.0, 0.0, 0.0, 9.0, 0.13, segs=6, col=(0.12, 0.09, 0.07, 1))
    for y in (8.2, 7.4):
        box(k("trim"), -1.1, 1.1, y, y + 0.12, -0.06, 0.06, scale=0.5, col=(0.12, 0.09, 0.07, 1))


@proto("dumpster", box=(0.9, 0.6, 0.55), reach=300, detail=True)
def _dumpster(k):
    """A skip against a back wall: painted steel, its lid, its wheels."""
    col = (0.06, 0.16, 0.1, 1)
    box(k("trim"), -0.9, 0.9, 0.18, 1.2, -0.55, 0.55, scale=1.0, col=col)
    box(k("trim"), -0.95, 0.95, 1.2, 1.28, -0.6, 0.6, scale=1.0, col=(0.05, 0.12, 0.08, 1))
    for x in (-0.7, 0.7):
        for z in (-0.4, 0.4):
            cylinder(k("trim"), x, z, 0.0, 0.18, 0.09, segs=6, col=BLACK)


@proto("bags", box=(0.7, 0.35, 0.5), reach=220, detail=True)
def _bags(k):
    """Bin bags heaped by a door: plastic, slumped, drawn in at the neck
    they are tied by and flared over it (the site draws their creases and
    the street's glint on them; most are black)."""
    for x, z, r_, h, seed in ((-0.33, 0.02, 0.3, 0.52, 0.15), (0.22, 0.14, 0.34, 0.6, 0.45), (0.2, -0.28, 0.24, 0.42, 0.8)):
        turned(k("print"), ((0.0, r_ * 0.8), (h * 0.38, r_), (h * 0.8, r_ * 0.36), (h * 0.9, r_ * 0.12), (h, r_ * 0.2)),
               segs=6, col=(seed, 0, 0, BAG), cx=x, cz=z, ends="t")


@proto("crates", box=(0.6, 0.6, 0.6), reach=220, detail=True)
def _crates(k):
    """Goods on a pallet: cartons taped, printed, labelled and strapped, a
    wooden crate or a plastic one among them (the site draws them, every
    pallet's its own), dirtier toward the ground; the small one on top is
    open, one flap up and one torn down."""
    carton(k, -0.6, 0.6, 0.0, 0.14, -0.5, 0.5, 0.1, TIMBER)
    carton(k, -0.56, -0.02, 0.14, 0.68, -0.44, 0.44, 0.23, yaw=0.03)
    carton(k, 0.04, 0.56, 0.14, 0.58, -0.4, 0.28, 0.47, yaw=-0.06)
    carton(k, -0.47, 0.07, 0.68, 1.1, -0.33, 0.33, 0.71, yaw=0.2)
    carton(k, 0.14, 0.5, 0.58, 0.84, -0.28, 0.1, 0.89, top=False)
    p = k("print")
    quad(p, (0.15, 0.8, 0.09), (0.49, 0.8, 0.09), (0.49, 0.8, -0.27), (0.15, 0.8, -0.27), col=(0.89, 1.0, INSIDE, CARTON))
    quad(p, (0.14, 0.84, 0.1), (0.5, 0.84, 0.1), (0.5, 0.96, 0.2), (0.14, 0.96, 0.2), col=(0.89, 0.5, BOXED, CARTON))
    quad(p, (0.5, 0.84, -0.28), (0.14, 0.84, -0.28), (0.14, 0.67, -0.31), (0.5, 0.67, -0.31), col=(0.89, 0.5, SODDEN, CARTON))


# ---------------------------------------------------------------------------
# More of what a street has (the catalogue: agents/props/CATALOGUE.md).
# ---------------------------------------------------------------------------
ADVERT = (0.55, 0.45, 0.65)


@proto("lightbox", box=(0.5, 1.1, 0.14), reach=400)
def _lightbox(k):
    """A standing advert, 1 m by 2.2: a lit box on a plinth with an advert on
    each face (the site draws them, every box its own, no words)."""
    box(k("trim"), -0.42, 0.42, 0.0, 0.42, -0.1, 0.1, scale=0.5, col=CAST)
    box(k("trim"), -0.5, 0.5, 0.42, 2.2, -0.12, 0.12, scale=0.5, col=CAST)
    for yaw, z in ((0.0, 0.126), (math.pi, -0.126)):
        face(k, POSTER, 0.0, 1.31, z, 0.9, 1.66, yaw, ADVERT)


@proto("ad_drum", box=(0.75, 1.5, 0.75), reach=500)
def _ad_drum(k):
    """An advertising drum for a corner (Fn9gKhU_2_Q@69): a foot, a lit band
    of adverts 2.1 m high round it, a cap."""
    lathe(k("trim"), 0.0, 0.0, ((0.0, 0.62), (0.5, 0.62)), segs=9, col=CAST, cap=False)
    for i in range(9):
        a, b = i * math.tau / 9, (i + 1) * math.tau / 9
        ur, ul = 1 - (i % 3) / 3, 1 - (i % 3 + 1) / 3
        quad(k("face"), (0.7 * math.cos(b), 0.5, 0.7 * math.sin(b)), (0.7 * math.cos(a), 0.5, 0.7 * math.sin(a)),
             (0.7 * math.cos(a), 2.6, 0.7 * math.sin(a)), (0.7 * math.cos(b), 2.6, 0.7 * math.sin(b)),
             ((ul, 0), (ur, 0), (ur, 1), (ul, 1)), (*ADVERT, POSTER))
    lathe(k("trim"), 0.0, 0.0, ((2.6, 0.74), (2.72, 0.74), (2.95, 0.25)), segs=9, col=CAST)


@proto("charge_post", box=(0.2, 0.75, 0.12), reach=260, detail=True)
def _charge_post(k):
    """A phone and charging post: a slab 1.5 m high, a lit panel on its
    front (a screen, keys, a reader)."""
    box(k("trim"), -0.2, 0.2, 0.0, 1.5, -0.1, 0.1, scale=0.5, col=CAST)
    face(k, PHONE, 0.0, 0.98, 0.106, 0.36, 0.65, 0.0, GLOW["cyan"])


@proto("grate_glow", box=(0.6, 0.02, 0.3), reach=200, detail=True)
def _grate_glow(k):
    """A grate in the pavement, 1.2 m by 0.6, with warm light under its
    bars (set a steam anchor over it)."""
    quad(k("face"), (-0.6, 0.012, 0.3), (0.6, 0.012, 0.3), (0.6, 0.012, -0.3), (-0.6, 0.012, -0.3), col=(*GLOW["amber"][:3], GRATE))


@proto("drain", box=(0.5, 0.02, 0.3), reach=70, detail=True)
def _drain(k):
    """A kerb drain, 1 m by 0.6: bars over a slot with a glint of water down
    it (streets.py sets one every 25 to 30 m along each kerb)."""
    quad(k("face"), (-0.5, 0.019, 0.3), (0.5, 0.019, 0.3), (0.5, 0.019, -0.3), (-0.5, 0.019, -0.3), col=(0.008, 0.013, 0.015, GRATE))


@proto("fence_mesh", box=(1.2, 1.0, 0.05), reach=300, detail=True)
def _fence_mesh(k):
    """A mesh fence panel 2.4 m wide and 2 m high: its frame and the wire,
    cut out of one quad by the site (set panels 2.4 m apart)."""
    face(k, MESH, 0.0, 1.0, 0.0, 2.4, 2.0, 0.0, mat="print")


@proto("railing", box=(1.0, 0.55, 0.05), reach=220, detail=True)
def _railing(k):
    """A kerb's guard rail 2 m long and 1.1 high: posts, two rails and the
    bars between, cut out of one quad by the site (set them 2 m apart)."""
    face(k, RAIL, 0.0, 0.55, 0.0, 2.0, 1.1, 0.0, mat="print")


@proto("aframe", box=(0.3, 0.5, 0.3), reach=180, detail=True)
def _aframe(k):
    """A standing A-frame: two printed boards leaning together, an advert
    on each."""
    for s_ in (1, -1):
        quad(k("print"), (-0.3, 0.0, s_ * 0.27), (0.3, 0.0, s_ * 0.27), (0.3, 1.0, s_ * 0.03), (-0.3, 1.0, s_ * 0.03), col=(0.5, 0.5, 0.5, BOARD))


@proto("pallets", box=(0.6, 0.38, 0.5), reach=220, detail=True)
def _pallets(k):
    """Four pallets stacked, the top one askew: their boards and blocks, a
    strap round the three under it, and the dark between them (the site
    draws them)."""
    carton(k, -0.6, 0.6, 0.0, 0.45, -0.5, 0.5, 0.3, TIMBER)
    carton(k, -0.58, 0.62, 0.45, 0.6, -0.5, 0.5, 0.6, TIMBER, yaw=0.09)


@proto("barrel", box=(0.31, 0.45, 0.31), reach=260, detail=True)
def _barrel(k):
    """A plastic barrel, blue, bulged at the middle."""
    lathe(k("trim"), 0.0, 0.0, ((0.0, 0.26), (0.3, 0.31), (0.62, 0.31), (0.9, 0.27)), segs=7, col=(0.03, 0.09, 0.22, 1))


@proto("rubbish", box=(0.9, 0.3, 0.7), reach=220, detail=True)
def _rubbish(k):
    """A rubbish heap against a wall (its back at -z): a slumped mound of
    what was swept there, a tied bag and a box on it, a carton trodden flat
    and sheets of paper loose in front (the site draws them)."""
    p = k("print")
    turned(p, ((0.0, 0.6), (0.24, 0.42), (0.46, 0.12)), segs=7, col=(0.3, 0, 1, BAG), cz=-0.1, ends="t")
    turned(p, ((0.0, 0.24), (0.2, 0.3), (0.42, 0.11), (0.48, 0.04), (0.54, 0.07)), segs=6, col=(0.6, 0, 0, BAG), cx=0.45, cz=0.05, ends="t")
    carton(k, -0.7, -0.2, 0.0, 0.4, -0.03, 0.33, 0.4, yaw=0.5)
    litter(k, 0.1, 0.56, 0.3, 0.21, 0.3, 0.2)
    litter(k, -0.62, 0.5, 0.3, 0.21, -0.5, 0.7)
    litter(k, 0.6, 0.42, 0.5, 0.34, 1.1, 0.5, SODDEN)


@proto("food_cart", box=(1.0, 1.15, 0.6), reach=320)
def _food_cart(k):
    """A food cart, its counter to +z: a steel body on two wheels with its
    menu lit on the front, a canopy on four posts with a strip of light
    under its edge."""
    box(k("trim"), -0.95, 0.95, 0.45, 1.0, -0.5, 0.5, scale=0.6, col=(0.1, 0.105, 0.115, 1))
    box(k("trim"), -1.0, 1.0, 1.0, 1.05, -0.6, 0.6, scale=0.6, col=STEEL)
    box(k("trim"), -1.0, 1.0, 2.1, 2.2, -0.6, 0.6, scale=0.6, col=(0.3, 0.05, 0.06, 1))
    face(k, FOOD, 0.0, 0.73, 0.506, 0.55, 0.5, 0.0, GLOW["yellow"])
    rotated_quad(k("glow"), 0.0, 2.07, 0.6, 1.96, 0.05, 0.0, col=GLOW["amber"])
    for s_ in (-1, 1):
        tube(k("trim"), ((0.0, 0.3, s_ * 0.5), (0.0, 0.3, s_ * 0.58)), (0.3, 0.3), segs=7, col=BLACK, cap=s_ > 0)
        for x in (-0.94, 0.94):
            box(k("trim"), x - 0.025, x + 0.025, 1.05, 2.1, s_ * 0.54 - 0.025, s_ * 0.54 + 0.025, scale=0.5, col=STEEL)

