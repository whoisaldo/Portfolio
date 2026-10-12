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
WOOD, BARK, BLOSSOM, FROND = 0.25, 0.5, 0.75, 1.0


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


def tube(key, pts, radii, segs=6, col=(1, 1, 1, 1)):
    """A bent, tapering limb through `pts`, `radii[i]` thick at each."""
    pts = [Vector(p) for p in pts]
    rings = []
    for i, p in enumerate(pts):
        w = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        ref = Vector((1, 0, 0)) if abs(w.x) < 0.9 else Vector((0, 0, 1))
        u = w.cross(ref).normalized()
        v = w.cross(u).normalized()
        rings.append([tuple(p + (u * math.cos(t) + v * math.sin(t)) * radii[i]) for t in (n * math.tau / segs for n in range(segs))])
    for n, (a, b) in enumerate(zip(rings, rings[1:])):
        for i in range(segs):
            j = (i + 1) % segs
            quad(key, a[i], a[j], b[j], b[i], ((i / segs, n), ((i + 1) / segs, n), ((i + 1) / segs, n + 1), (i / segs, n + 1)), col)


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
    box(k("concrete"), -0.76, 0.76, 0.0, h - 0.1, -0.76, 0.76, scale=1.0)
    box(k("trim"), -0.8, 0.8, h - 0.1, h, -0.8, 0.8, scale=1.0, col=stone)
    quad(k("trim"), (-0.64, h + 0.012, 0.64), (0.64, h + 0.012, 0.64), (0.64, h + 0.012, -0.64), (-0.64, h + 0.012, -0.64), col=(0.07, 0.055, 0.045, 1))
    for yaw in (0.0, math.pi / 2, math.pi, -math.pi / 2):
        rotated_quad(k("glow"), math.sin(yaw) * 0.763, h - 0.14, math.cos(yaw) * 0.763, 1.44, 0.035, yaw, col=lamp)
    for x, z in ((0.34, 0.36), (-0.36, -0.3)):
        quad(k("glow"), (x - 0.06, h + 0.02, z + 0.06), (x + 0.06, h + 0.02, z + 0.06), (x + 0.06, h + 0.02, z - 0.06), (x - 0.06, h + 0.02, z - 0.06), col=lamp)


# ---------------------------------------------------------------------------
# The prototypes. Sizes are real: a bollard is a metre, a lamp seven.
# ---------------------------------------------------------------------------
@proto("lamp_sodium", box=(0.15, 3.5, 0.15))
def _lamp_sodium(k):
    """A street lamp: a pole, a long arm out over the road (toward +z), a
    sodium head (Zq4zTcIM0yQ@107, JtqIas3bYhg@64)."""
    cylinder(k("metal"), 0.0, 0.0, 0.0, 7.2, 0.09, segs=8)
    cylinder(k("metal"), 0.0, 0.0, 0.0, 0.5, 0.16, segs=8)
    box(k("metal"), -0.05, 0.05, 7.05, 7.17, 0.0, 2.1, scale=0.5)
    box(k("metal"), -0.22, 0.22, 6.92, 7.12, 1.75, 2.45, scale=0.5)
    box(k("neon_amber"), -0.18, 0.18, 6.88, 6.92, 1.8, 2.4, scale=0.5)


@proto("lamp_short", box=(0.12, 2.0, 0.12), reach=380)
def _lamp_short(k):
    """A pavement lamp column, an orange glass head (KvMY1uzSC1E@94)."""
    cylinder(k("metal"), 0.0, 0.0, 0.0, 3.6, 0.07, segs=8)
    cylinder(k("neon_amber"), 0.0, 0.0, 3.6, 4.3, 0.13, segs=8)
    cylinder(k("metal"), 0.0, 0.0, 4.3, 4.38, 0.16, segs=8)


@proto("bollard", box=(0.12, 0.5, 0.12), reach=260)
def _bollard(k):
    """A black steel bollard with a reflective band (Zq4zTcIM0yQ@40)."""
    cylinder(k("dark"), 0.0, 0.0, 0.0, 0.95, 0.11, segs=8)
    cylinder(k("glow"), 0.0, 0.0, 0.72, 0.78, 0.115, segs=8, col=GLOW["amber"])


@proto("bollard_cube", box=(0.3, 0.3, 0.3), reach=260)
def _bollard_cube(k):
    """A concrete cube, corpo plazas' kind (Fn9gKhU_2_Q@77)."""
    box(k("concrete"), -0.3, 0.3, 0.0, 0.6, -0.3, 0.3, scale=1.0)


@proto("bin", box=(0.3, 0.5, 0.3), reach=260, detail=True)
def _bin(k):
    cylinder(k("metal"), 0.0, 0.0, 0.0, 0.95, 0.28, segs=10)
    cylinder(k("dark"), 0.0, 0.0, 0.95, 1.02, 0.3, segs=10)


@proto("vending", box=(0.5, 1.0, 0.4))
def _vending(k):
    """A vending machine against a wall, its lit face toward +z."""
    box(k("metal"), -0.48, 0.48, 0.0, 1.95, -0.4, 0.4, scale=0.6)
    box(k("glow"), -0.4, 0.4, 0.75, 1.82, 0.4, 0.42, scale=0.5, col=GLOW["cyan"])
    box(k("glow"), -0.4, 0.4, 0.28, 0.5, 0.4, 0.42, scale=0.5, col=GLOW["white"])


@proto("vending_warm", box=(0.5, 1.0, 0.4))
def _vending_warm(k):
    box(k("metal"), -0.48, 0.48, 0.0, 1.95, -0.4, 0.4, scale=0.6)
    box(k("glow"), -0.4, 0.4, 0.75, 1.82, 0.4, 0.42, scale=0.5, col=GLOW["amber"])
    box(k("glow"), -0.4, 0.4, 0.28, 0.5, 0.4, 0.42, scale=0.5, col=GLOW["pink"])


@proto("food_box", box=(0.35, 0.6, 0.3), reach=300, detail=True)
def _food_box(k):
    """An Insta Food box: a yellow lit cabinet on a post (Fn9gKhU_2_Q@34)."""
    box(k("metal"), -0.06, 0.06, 0.0, 0.7, -0.06, 0.06, scale=0.5)
    box(k("glow"), -0.33, 0.33, 0.7, 1.3, -0.26, 0.26, scale=0.5, col=GLOW["yellow"])


@proto("signal_box", box=(0.3, 0.7, 0.25), reach=300, detail=True)
def _signal_box(k):
    """A crossing's signal box on its post, the walk figure lit
    (Zq4zTcIM0yQ@40)."""
    cylinder(k("metal"), 0.0, 0.0, 0.0, 2.9, 0.06, segs=6)
    box(k("dark"), -0.22, 0.22, 2.2, 2.85, -0.12, 0.14, scale=0.5)
    box(k("glow"), -0.14, 0.14, 2.32, 2.72, 0.14, 0.15, scale=0.5, col=GLOW["yellow"])


@proto("traffic_light", box=(0.15, 3.0, 0.15))
def _traffic_light(k):
    """A signal mast with its arm out over the lanes (toward +z) and the
    head on it."""
    cylinder(k("metal"), 0.0, 0.0, 0.0, 6.0, 0.1, segs=8)
    box(k("metal"), -0.05, 0.05, 5.8, 5.92, 0.0, 4.5, scale=0.5)
    box(k("dark"), -0.18, 0.18, 4.9, 5.8, 4.2, 4.5, scale=0.5)
    box(k("glow"), -0.11, 0.11, 5.48, 5.7, 4.5, 4.52, scale=0.5, col=GLOW["red"])


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
    """A blossom tree in a low stone planter (KvMY1uzSC1E@94): a dark trunk
    that twists as it climbs, three limbs, and the blossom in pads at their
    ends, tier over tier."""
    planter(k, 0.6, GLOW["white"], stone=(0.42, 0.4, 0.42, 1))
    bark = (0.13, 0.09, 0.085, WOOD)
    tube(k("plant"), ((0.0, 0.5, 0.0), (0.13, 1.05, 0.06), (-0.09, 1.65, 0.13), (0.1, 2.25, 0.0), (0.02, 2.8, -0.1)),
         (0.21, 0.16, 0.135, 0.11, 0.08), segs=6, col=bark)
    for limb in (((-0.09, 1.65, 0.13), (-0.42, 2.1, 0.36), (-0.6, 2.55, 0.5)),
                 ((0.1, 2.25, 0.0), (0.45, 2.6, -0.22), (0.6, 3.0, -0.34)),
                 ((0.02, 2.8, -0.1), (0.0, 3.3, -0.3), (-0.12, 3.7, -0.42))):
        tube(k("plant"), limb, (0.085, 0.06, 0.04), segs=4, col=bark)
    pink, rose, pale = (0.8, 0.27, 0.46), (0.74, 0.17, 0.36), (0.82, 0.45, 0.58)
    for cx, cy, cz, r, col in ((-0.62, 2.62, 0.52, 0.8, pink), (0.62, 3.08, -0.36, 0.82, rose), (-0.12, 3.82, -0.44, 0.78, pale),
                               (-0.1, 3.2, 0.2, 0.7, rose), (0.42, 2.5, 0.5, 0.52, pale), (-0.52, 3.3, -0.5, 0.56, pink)):
        pad(k("plant"), cx, cy, cz, r, col)


@proto("bench", box=(1.0, 0.25, 0.3), reach=220, detail=True)
def _bench(k):
    box(k("metal"), -0.95, 0.95, 0.42, 0.48, -0.25, 0.25, scale=0.6)
    for x in (-0.8, 0.8):
        box(k("dark"), x - 0.05, x + 0.05, 0.0, 0.42, -0.2, 0.2, scale=0.5)


@proto("cctv", box=(0.1, 2.5, 0.1), reach=300, detail=True)
def _cctv(k):
    cylinder(k("metal"), 0.0, 0.0, 0.0, 4.8, 0.07, segs=6)
    for yaw in (0.3, 2.4, 4.4):
        oriented_box(k("dark"), math.sin(yaw) * 0.25, 4.6, math.cos(yaw) * 0.25, 0.14, 0.14, 0.4, yaw, scale=0.5)
    box(k("glow"), -0.03, 0.03, 4.85, 4.9, -0.03, 0.03, scale=0.5, col=GLOW["red"])


@proto("ac_wall", box=(0.4, 0.3, 0.3), reach=320, detail=True)
def _ac_wall(k):
    """An air conditioner hung on a wall (its back at z 0, out toward +z),
    its fan's grille drawn as a dark disc."""
    box(k("metal"), -0.42, 0.42, 0.0, 0.58, 0.0, 0.5, scale=0.6)
    quad(k("dark"), (-0.32, 0.08, 0.505), (0.12, 0.08, 0.505), (0.12, 0.5, 0.505), (-0.32, 0.5, 0.505))


@proto("ac_roof", box=(0.7, 0.5, 0.5), reach=420, detail=True)
def _ac_roof(k):
    box(k("metal"), -0.7, 0.7, 0.0, 0.95, -0.5, 0.5, scale=0.8)
    cylinder(k("dark"), 0.0, 0.0, 0.95, 1.0, 0.36, segs=10)


@proto("pipe_v", box=(0.08, 0.5, 0.08), reach=260, detail=True)
def _pipe_v(k):
    """A downpipe a metre long (stretched by sy), off the wall at z 0.12."""
    cylinder(k("metal"), 0.0, 0.12, 0.0, 1.0, 0.06, segs=6, cap=False)


@proto("lantern", box=(0.2, 0.3, 0.2), reach=320, detail=True)
def _lantern(k):
    cylinder(k("lantern"), 0.0, 0.0, -0.28, 0.28, 0.2, segs=8)
    cylinder(k("dark"), 0.0, 0.0, 0.28, 0.33, 0.12, segs=8)


@proto("drum", box=(0.3, 0.45, 0.3), reach=260, detail=True)
def _drum(k):
    cylinder(k("trim"), 0.0, 0.0, 0.0, 0.88, 0.29, segs=10, col=(0.36, 0.14, 0.07, 1))


@proto("hydrant", box=(0.15, 0.4, 0.15), reach=200, detail=True)
def _hydrant(k):
    """A hydrant, red paint on iron, its cap and its two outlets."""
    red = (0.42, 0.06, 0.05, 1)
    cylinder(k("trim"), 0.0, 0.0, 0.0, 0.62, 0.12, segs=10, col=red)
    cylinder(k("trim"), 0.0, 0.0, 0.62, 0.74, 0.1, segs=10, col=red)
    cylinder(k("trim"), 0.0, 0.0, 0.74, 0.8, 0.05, segs=6, col=(0.2, 0.2, 0.22, 1))
    for yaw in (0.0, math.pi):
        oriented_box(k("trim"), math.sin(yaw) * 0.14, 0.42, math.cos(yaw) * 0.14, 0.1, 0.1, 0.12, yaw, scale=0.5, col=red)


@proto("phone_booth", box=(0.5, 1.2, 0.5))
def _phone_booth(k):
    box(k("metal"), -0.5, 0.5, 0.0, 0.12, -0.5, 0.5, scale=0.6)
    for x in (-0.47, 0.47):
        box(k("metal"), x - 0.03, x + 0.03, 0.12, 2.3, -0.47, 0.47, scale=0.5)
    box(k("glow"), -0.5, 0.5, 2.3, 2.5, -0.5, 0.5, scale=0.5, col=GLOW["cyan"])
    box(k("glass_dark"), -0.44, 0.44, 0.3, 2.2, -0.46, -0.44, scale=0.5)


@proto("tank_roof", box=(1.4, 2.2, 1.4), reach=700)
def _tank_roof(k):
    """A water tank on its stand, a roof's signature."""
    for lx, lz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        box(k("metal"), lx * 0.95 - 0.08, lx * 0.95 + 0.08, 0.0, 1.9, lz * 0.95 - 0.08, lz * 0.95 + 0.08, scale=0.5)
    cylinder(k("metal"), 0.0, 0.0, 1.9, 4.1, 1.35, segs=10)
    cylinder(k("dark"), 0.0, 0.0, 4.1, 4.35, 1.42, segs=10)


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
            cylinder(k("dark"), x, z, 0.0, 0.18, 0.09, segs=6)


@proto("bags", box=(0.7, 0.35, 0.5), reach=220, detail=True)
def _bags(k):
    """Bin bags heaped by a door: black plastic, lumpy."""
    for (x, z, r_, h) in ((-0.35, 0.0, 0.32, 0.55), (0.2, 0.15, 0.36, 0.62), (0.3, -0.3, 0.26, 0.45), (-0.1, -0.35, 0.24, 0.4)):
        oriented_box(k("trim"), x, h / 2, z, r_ * 1.6, h, r_ * 1.5, x * 2.0, scale=1.0, col=(0.02, 0.02, 0.025, 1))


@proto("crates", box=(0.6, 0.6, 0.6), reach=220, detail=True)
def _crates(k):
    """Crates stacked on a pallet."""
    wood = (0.2, 0.13, 0.07, 1)
    box(k("trim"), -0.6, 0.6, 0.0, 0.14, -0.5, 0.5, scale=1.0, col=wood)
    box(k("trim"), -0.55, 0.0, 0.14, 0.7, -0.45, 0.45, scale=1.0, col=(0.24, 0.16, 0.09, 1))
    box(k("trim"), 0.05, 0.55, 0.14, 0.6, -0.4, 0.3, scale=1.0, col=wood)
    box(k("trim"), -0.45, 0.1, 0.7, 1.15, -0.35, 0.35, scale=1.0, col=(0.26, 0.18, 0.1, 1))
