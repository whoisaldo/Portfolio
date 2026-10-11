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
"""
import math

from ncw.kit import *  # noqa: F401,F403

PROTOS = {}
INSTANCES = []


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
    for name, p in PROTOS.items():
        def k(mat, detail=0, _n=name):
            return ("proto/" + _n, mat, detail)
        p["build"](k)


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
    """A palm in a square concrete planter (Fn9gKhU_2_Q@69)."""
    box(k("concrete"), -0.8, 0.8, 0.0, 0.7, -0.8, 0.8, scale=1.0)
    box(k("dark"), -0.68, 0.68, 0.7, 0.72, -0.68, 0.68, scale=1.0)
    cylinder(k("trim"), 0.0, 0.0, 0.7, 6.8, 0.16, segs=7, col=(0.16, 0.12, 0.1, 1))
    for i in range(7):
        t = i / 7 * math.tau
        dx, dz = math.cos(t), math.sin(t)
        # A frond: a long leaf drooping out from the crown.
        a = (dx * 0.1, 6.8, dz * 0.1)
        b = (dx * 1.6, 6.9, dz * 1.6)
        c = (dx * 2.6, 6.1, dz * 2.6)
        w = 0.32
        px, pz = -dz * w, dx * w
        for (p0, p1) in ((a, b), (b, c)):
            quad(k("trim"), (p0[0] - px, p0[1], p0[2] - pz), (p0[0] + px, p0[1], p0[2] + pz),
                 (p1[0] + px * 0.6, p1[1], p1[2] + pz * 0.6), (p1[0] - px * 0.6, p1[1], p1[2] - pz * 0.6),
                 col=(0.05, 0.09, 0.07, 1))
            quad(k("trim"), (p0[0] + px, p0[1], p0[2] + pz), (p0[0] - px, p0[1], p0[2] - pz),
                 (p1[0] - px * 0.6, p1[1], p1[2] - pz * 0.6), (p1[0] + px * 0.6, p1[1], p1[2] + pz * 0.6),
                 col=(0.05, 0.09, 0.07, 1))


@proto("planter_tree", box=(0.8, 1.5, 0.8))
def _planter_tree(k):
    """A tree in a stone planter, its crown a dark mass catching the signs'
    light (KvMY1uzSC1E@94 has it in blossom)."""
    box(k("concrete"), -0.8, 0.8, 0.0, 0.6, -0.8, 0.8, scale=1.0)
    cylinder(k("trim"), 0.0, 0.0, 0.6, 2.6, 0.12, segs=6, col=(0.14, 0.1, 0.09, 1))
    for (cx, cy, cz, r) in ((0.0, 3.3, 0.0, 1.3), (0.6, 2.9, 0.3, 0.9), (-0.5, 3.0, -0.4, 0.9)):
        oriented_box(k("trim"), cx, cy, cz, r * 1.6, r * 1.2, r * 1.6, 0.4, scale=1.0, col=(0.07, 0.05, 0.08, 1))


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
