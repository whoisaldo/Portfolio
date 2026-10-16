"""The shop itself: its lifts, its jacks and stands, its roll-up door and its
man door.

What moves is a prototype of its own, so a pose is where it is set down and
not another copy of the whole: a lift's arms are `garage_lift2_arms`, placed
on the lift's own spot at LIFT2_RISE up when it is raised; a door's frame and
tracks are one prototype and its curtain of sections another per pose
(closed, half, open), since its sections bend round the track's curve. A
scissor lift's legs lean differently at each height, so it has a prototype
a pose. The `place_*` helpers set an assembly down whole.

Sizes are a real shop's: a two-post lift of the 4.5 t class (posts 3.75 m,
3.2 m apart inside), a drive-on scissor that rises 1.2 m, a single-car door
3 m square and a double one the size of the city's garage opening (6 m by
4.6 m).
"""
import math

from mathutils import Vector

from ncw.kit import box, cylinder, pipe, quad
from ncw.props import proto
from ncw.garage.shapes import (
    ALU, BLACK_PAINT, CABLE, CHROME, GUN, GUN_DARK, OFFWHITE, RED, RED_DARK, RUBBER, STEEL_MID, WHITE_PAINT, YELLOW,
    beam, cable, flat, flat_rect, frame_of, obox, place_in, revolve, shade, soft, words,
)

# ---------------------------------------------------------------------------
# The two-post lift. The car drives in along z between the posts; the arms
# swing in under its sills. LIFT2_PAD is the pads' top with the arms down;
# raised, the arms (and the car on them) go up LIFT2_RISE.
# ---------------------------------------------------------------------------
LIFT2_X = 1.62
LIFT2_H = 3.75
LIFT2_PAD = 0.2
LIFT2_RISE = 1.75
# Where the pads stand, arms swung in (x either side, z fore and aft of the
# posts' line): under the jacking points of a car of about 2.9 m wheelbase
# set with its middle between the posts.
LIFT2_PADS = (0.62, 1.02)


def _sorted(a, b):
    return (a, b) if a <= b else (b, a)


@proto("garage_lift2", box=(1.8, 1.88, 0.3))
def _lift2(k):
    """A two-post overhead lift: each post a pressed C channel open toward
    the bay, its hydraulic cylinder and chrome rod inside with the chain
    sheave at its top, the lock ladder up its back; a base plate, hazard
    bands at the foot; across the top the beam with its padded shut-off bar,
    the equaliser cables and the hydraulic line; the power unit (motor,
    pump, reservoir, the up button and the lowering lever) on the left
    post."""
    t, n, hz = k("trim"), k("trim", 1), k("hazard")
    H = LIFT2_H
    for s in (-1, 1):
        x0, x1 = _sorted(s * 1.46, s * 1.78)
        bx0, bx1 = _sorted(s * 1.42, s * 1.84)
        box(t, bx0, bx1, 0.0, 0.022, -0.25, 0.25, col=GUN_DARK)
        wx0, wx1 = _sorted(s * 1.752, s * 1.78)
        box(t, wx0, wx1, 0.022, H, -0.15, 0.15, col=GUN)
        for zf in (-1, 1):
            za, zb = _sorted(zf * 0.136, zf * 0.15)
            box(t, x0, x1, 0.022, H, za, zb, col=GUN)
            lx0, lx1 = _sorted(s * 1.46, s * 1.495)
            la, lb = _sorted(zf * 0.1, zf * 0.136)
            box(t, lx0, lx1, 0.022, H, la, lb, col=GUN)
            # Hazard bands on each flange's face at the foot.
            for i in range(3):
                y = 0.08 + i * 0.16
                f0, f1 = _sorted(zf * 0.1505, zf * 0.153)
                box(hz, x0 + 0.01, x1 - 0.01, y, y + 0.08, f0, f1)
        box(t, x0, x1, H, H + 0.012, -0.15, 0.15, col=GUN_DARK)
        cylinder(t, s * 1.66, 0.0, 0.022, 2.36, 0.056, segs=10, col=BLACK_PAINT)
        cylinder(t, s * 1.66, 0.0, 2.36, 2.62, 0.03, segs=8, col=CHROME)
        pipe(t, (s * 1.66, 2.69, -0.05), (s * 1.66, 2.69, 0.05), 0.075, segs=10, col=GUN_DARK, caps=True)
        # The lifting chain from the sheave down to the carriage's top.
        cx0, cx1 = _sorted(s * 1.585, s * 1.6)
        box(t, cx0, cx1, 0.8, 2.7, -0.012, 0.012, col=STEEL_MID)
        # The lock ladder up the web, its teeth near by only.
        lx0, lx1 = _sorted(s * 1.72, s * 1.752)
        box(t, lx0, lx1, 0.3, 2.6, -0.035, 0.035, col=STEEL_MID)
        for i in range(19):
            y = 0.42 + i * 0.115
            tx0, tx1 = _sorted(s * 1.705, s * 1.72)
            box(n, tx0, tx1, y, y + 0.03, -0.03, 0.03, col=STEEL_MID)
        # Anchor bolts in the base plate.
        for bz in (-0.19, 0.19):
            for bxo in (1.47, 1.79):
                cylinder(n, s * bxo, bz, 0.022, 0.05, 0.014, segs=6, col=STEEL_MID)
    # The overhead beam, its shut-off bar hung under it on two links.
    box(t, -1.78, 1.78, H - 0.16, H, -0.075, 0.075, col=GUN, bottom=True)
    for x in (-0.9, 0.9):
        box(t, x - 0.015, x + 0.015, H - 0.36, H - 0.16, -0.012, 0.012, col=GUN_DARK)
    pipe(t, (-1.25, H - 0.37, 0.0), (1.25, H - 0.37, 0.0), 0.022, segs=8, col=GUN_DARK, caps=True)
    pipe(t, (-0.7, H - 0.37, 0.0), (0.7, H - 0.37, 0.0), 0.04, segs=8, col=YELLOW, caps=True)
    # The equaliser cables over the beam and the hydraulic line to the far post.
    for z in (-0.1, 0.1):
        cable(t, ((-1.66, 2.7, z * 0.5), (-1.66, H + 0.03, z), (1.66, H + 0.03, z), (1.66, 2.7, z * 0.5)), 0.006, col=CHROME, segs=4)
    cable(t, ((-1.86, 1.5, 0.0), (-1.82, 1.9, 0.0), (-1.81, H + 0.06, 0.0), (1.81, H + 0.06, 0.0), (1.81, H - 0.25, 0.0), (1.7, 2.45, 0.0)), 0.011, col=CABLE)
    # The power unit on the left post's outside face.
    box(t, -1.84, -1.78, 1.02, 1.82, -0.13, 0.13, col=GUN_DARK)
    box(t, -2.04, -1.86, 1.04, 1.38, -0.11, 0.11, col=OFFWHITE, bottom=True)
    box(t, -2.0, -1.84, 1.38, 1.46, -0.09, 0.09, col=STEEL_MID)
    cylinder(t, -1.94, 0.0, 1.46, 1.8, 0.088, segs=10, col=BLACK_PAINT)
    cylinder(t, -1.94, 0.0, 1.8, 1.83, 0.06, segs=8, col=GUN_DARK)
    box(t, -1.86, -1.78, 1.5, 1.66, 0.13, 0.19, col=BLACK_PAINT)
    cylinder(n, -1.82, 0.19, 1.555, 1.6, 0.022, segs=8, col=(0.02, 0.18, 0.04, 1))
    beam(n, (-2.0, 1.4, 0.1), (-2.1, 1.33, 0.22), 0.01, 0.01, col=BLACK_PAINT)
    revolve(n, (-2.1, 1.33, 0.22), (0, 0, 1), ((0.0, 0.02), (0.06, 0.02), (0.06, 0.0)), segs=6, col=RED_DARK)


def _lift2_carriages(k, pads):
    t, n = k("trim"), k("trim", 1)
    px, pz = pads
    for s in (-1, 1):
        x0, x1 = _sorted(s * 1.3, s * 1.46)
        box(t, x0, x1, 0.05, 0.8, -0.17, 0.17, col=GUN_DARK, bottom=True)
        sx0, sx1 = _sorted(s * 1.46, s * 1.6)
        box(t, sx0, sx1, 0.1, 0.72, -0.085, 0.085, col=GUN_DARK, bottom=True)
        box(t, x0 - 0.005, x1 + 0.005, 0.76, 0.8, -0.175, 0.175, col=YELLOW)
        for zf in (-1, 1):
            b0, b1 = _sorted(s * 1.22, s * 1.3)
            z0, z1 = _sorted(zf * 0.06, zf * 0.2)
            box(t, b0, b1, 0.06, 0.2, z0, z1, col=GUN_DARK, bottom=True)
            pv = Vector((s * 1.26, 0.12, zf * 0.13))
            q = Vector((s * px, 0.12, zf * pz))
            mid = pv + (q - pv) * 0.58
            beam(t, tuple(pv), tuple(mid), 0.06, 0.045, col=YELLOW)
            beam(t, tuple(mid - (q - pv).normalized() * 0.05), tuple(q), 0.045, 0.034, col=shade(YELLOW, 0.85))
            cylinder(t, pv.x, pv.z, 0.04, 0.215, 0.032, segs=8, col=CHROME)
            cylinder(n, pv.x, pv.z, 0.166, 0.18, 0.075, segs=12, col=GUN_DARK)
            cylinder(t, q.x, q.z, 0.08, 0.165, 0.06, segs=10, col=GUN_DARK)
            cylinder(t, q.x, q.z, 0.165, LIFT2_PAD, 0.075, segs=12, col=RUBBER)
            cylinder(n, q.x, q.z, 0.08, 0.15, 0.02, segs=6, col=CHROME)


@proto("garage_lift2_arms", box=(1.6, 0.42, 1.12))
def _lift2_arms(k):
    """The two carriages that ride the posts and the four arms on them,
    swung in under a car's jacking points (LIFT2_PADS): each arm two
    telescoping stages of yellow box section, its pivot pin and the
    toothed restraint gear over it, and a round pad on a screw at its end.
    Placed on the lift's spot, up LIFT2_RISE when raised."""
    _lift2_carriages(k, LIFT2_PADS)


@proto("garage_lift2_arms_out", box=(1.6, 0.42, 1.3))
def _lift2_arms_out(k):
    """The carriages with the arms swung out along the drive line, front
    ones forward and rear ones back, as they are left for a car to drive
    in between the posts."""
    _lift2_carriages(k, LIFT2_PADS_OUT)


# The pads with the arms swung out of the way.
LIFT2_PADS_OUT = (1.12, 1.24)


def place_lift2(x, z, yaw=0.0, raised=False, arms="in", pad_at=LIFT2_PAD, y=0.0, district=None):
    """A two-post lift and its arms, the car's line along the prop's z:
    `arms` "in" under a car, "out" to drive in (never raised); `pad_at` the
    pads' top with the arms down (a car's sill height: the carriages ride
    up with them), LIFT2_RISE higher raised."""
    at = frame_of(x, y, z, yaw)
    place_in(at, yaw, "garage_lift2", 0, 0, 0, district=district)
    name = "garage_lift2_arms_out" if arms == "out" and not raised else "garage_lift2_arms"
    place_in(at, yaw, name, 0, pad_at - LIFT2_PAD + (LIFT2_RISE if raised else 0.0), 0, district=district)


# ---------------------------------------------------------------------------
# The drive-on scissor lift: two runways side by side, each on its scissor
# legs over a base frame, ramps down at the ends when it is down and flipped
# up as wheel stops when it is up. SCISSOR_TOP is the runways' top in each
# pose; a car's tyres stand on it.
# ---------------------------------------------------------------------------
SCISSOR_X = 0.8
SCISSOR_TOP = {"down": 0.12, "up": 1.2}
_LEG = 1.75


def _scissor(k, top):
    t, n = k("trim"), k("trim", 1)
    lo, hi = 0.045, top - 0.05
    h = hi - lo
    span = math.sqrt(max(_LEG * _LEG - h * h, 0.0))
    zf = -0.875
    zs = zf + span
    for s in (-1, 1):
        cx = s * SCISSOR_X
        box(t, cx - 0.22, cx + 0.22, 0.0, 0.045, -0.95, 0.95, col=GUN_DARK)
        for side in (-1, 1):
            lx = cx + side * 0.19
            beam(t, (lx, lo, zf), (lx, hi, zs), 0.018, 0.045, col=GUN)
            beam(t, (lx + side * 0.04, lo, zs), (lx + side * 0.04, hi, zf), 0.018, 0.045, col=GUN)
            # The rollers that run the legs' free ends along base and runway.
            pipe(n, (lx - 0.03, lo, zs), (lx + 0.07, lo, zs), 0.03, segs=8, col=BLACK_PAINT, caps=True)
        mz, my = (zf + zs) / 2, (lo + hi) / 2
        pipe(t, (cx - 0.23, my, mz), (cx + 0.27, my, mz), 0.022, segs=8, col=CHROME, caps=True)
        if h > 0.3:
            # The ram, from the base frame up to the legs' middle pin.
            a = Vector((cx, 0.07, zs - 0.15))
            b = Vector((cx, my - 0.05, mz + 0.05))
            m = a + (b - a) * 0.62
            pipe(t, tuple(a), tuple(m), 0.045, segs=10, col=BLACK_PAINT, caps=True)
            pipe(t, tuple(m), tuple(b), 0.025, segs=8, col=CHROME, caps=True)
        # The runway: a channel open underneath, a raised tread strip near by.
        box(t, cx - 0.28, cx + 0.28, top - 0.012, top, -1.0, 1.0, col=GUN, bottom=True)
        for xx in (cx - 0.28, cx + 0.26):
            box(t, xx, xx + 0.02, top - 0.1, top, -1.0, 1.0, col=GUN, bottom=True)
        for e in (-1.0, 1.0):
            box(t, cx - 0.28, cx + 0.28, top - 0.1, top, e - 0.01 if e > 0 else e, e + 0.01 if e < 0 else e, col=GUN)
        for i in range(12):
            z = -0.9 + i * 0.165
            box(n, cx - 0.24, cx + 0.24, top, top + 0.006, z, z + 0.05, col=STEEL_MID)
        box(k("hazard"), cx + 0.282, cx + 0.286, top - 0.08, top - 0.02, -0.98, 0.98)
        # Ramps: down to the floor at the ends, or flipped up as stops.
        for e in (-1, 1):
            if top < 0.3:
                a, b = (cx, top - 0.006, e * 1.0), (cx, 0.006, e * 1.42)
            else:
                a, b = (cx, top, e * 0.98), (cx, top + 0.38, e * 1.1)
            beam(t, a, b, 0.27, 0.01, col=STEEL_MID)


@proto("garage_scissor_down", box=(1.1, 0.06, 1.42))
def _scissor_down(k):
    """The drive-on scissor lift down: its runways 0.12 m up, the legs
    folded flat inside them, the ramps down to the floor."""
    _scissor(k, SCISSOR_TOP["down"])


@proto("garage_scissor_up", box=(1.1, 0.6, 1.1))
def _scissor_up(k):
    """The drive-on scissor lift up: runways at 1.2 m on their crossed
    legs and rams, the ramps flipped up as wheel stops."""
    _scissor(k, SCISSOR_TOP["up"])


@proto("garage_scissor_power", box=(0.25, 0.55, 0.2), reach=200)
def _scissor_power(k):
    """The scissor's power unit on castors: a cabinet, the motor on top,
    the control box with its buttons, the hoses coiled on their hook."""
    t, n = k("trim"), k("trim", 1)
    box(t, -0.22, 0.22, 0.08, 0.95, -0.17, 0.17, col=GUN)
    box(t, -0.23, 0.23, 0.95, 0.97, -0.18, 0.18, col=GUN_DARK)
    cylinder(t, 0.0, 0.0, 0.97, 1.22, 0.085, segs=10, col=BLACK_PAINT)
    box(t, -0.14, 0.14, 0.62, 0.86, 0.17, 0.22, col=WHITE_PAINT)
    for i, col in enumerate(((0.02, 0.2, 0.04, 1), (0.25, 0.02, 0.02, 1), (0.25, 0.2, 0.02, 1))):
        cylinder(n, -0.08 + i * 0.08, 0.225, 0.7, 0.72, 0.02, segs=8, col=col)
    revolve(t, (0.24, 0.55, 0.0), (1, 0, 0), _torus(0.16, 0.025), segs=12, col=(0.02, 0.02, 0.022, 1))
    for x in (-0.18, 0.18):
        for z in (-0.13, 0.13):
            pipe(n, (x - 0.02, 0.04, z), (x + 0.02, 0.04, z), 0.04, segs=8, col=RUBBER, caps=True)


def _torus(R, r, n=6):
    """A torus's section for `revolve`: a circle of r at R from the axis."""
    return [(r * math.sin(i * math.tau / n), R - r * math.cos(i * math.tau / n)) for i in range(n + 1)]


def place_scissor(x, z, yaw=0.0, raised=False, y=0.0, district=None):
    at = frame_of(x, y, z, yaw)
    place_in(at, yaw, "garage_scissor_up" if raised else "garage_scissor_down", 0, 0, 0, district=district)
    place_in(at, yaw, "garage_scissor_power", -1.65, 0, -0.6, turn=math.pi / 2, district=district)


# ---------------------------------------------------------------------------
# Jacks, stands, a creeper, chocks.
# ---------------------------------------------------------------------------
@proto("garage_jack_stand", box=(0.16, 0.26, 0.16), reach=160, detail=True)
def _jack_stand(k):
    """A three-tonne jack stand: four legs splayed from a square foot to
    the sleeve, the toothed column in it with its saddle, the ratchet
    lever."""
    t = k("trim")
    for x in (-1, 1):
        for z in (-1, 1):
            beam(t, (x * 0.14, 0.0, z * 0.14), (x * 0.035, 0.3, z * 0.035), 0.012, 0.02, col=RED)
    for x in (-1, 1):
        beam(t, (x * 0.14, 0.02, -0.14), (x * 0.14, 0.02, 0.14), 0.01, 0.02, col=RED_DARK)
    box(t, -0.04, 0.04, 0.26, 0.34, -0.04, 0.04, col=RED)
    box(t, -0.026, 0.026, 0.34, 0.47, -0.026, 0.026, col=STEEL_MID)
    for x in (-1, 1):
        box(t, x * 0.045 - 0.012, x * 0.045 + 0.012, 0.47, 0.51, -0.03, 0.03, col=STEEL_MID)
    box(t, -0.035, 0.035, 0.465, 0.48, -0.03, 0.03, col=STEEL_MID)
    beam(t, (0.04, 0.32, 0.0), (0.16, 0.36, 0.0), 0.012, 0.008, col=RED_DARK)


@proto("garage_floor_jack", box=(0.2, 0.15, 0.62), reach=200)
def _floor_jack(k):
    """A low-profile trolley jack, saddle forward: the chassis on its two
    front wheels and rear castors, the lift arm down with its saddle at
    0.1 m, the pump and its ram at the back, the handle up at forty-five
    degrees."""
    t, n = k("trim"), k("trim", 1)
    for x in (-0.15, 0.13):
        box(t, x, x + 0.02, 0.04, 0.14, -0.32, 0.38, col=RED)
    box(t, -0.15, 0.15, 0.04, 0.06, -0.32, -0.12, col=RED)
    box(t, -0.15, 0.15, 0.12, 0.14, -0.32, -0.2, col=RED)
    for x in (-0.18, 0.18):
        pipe(t, (x - 0.025, 0.05, 0.3), (x + 0.025, 0.05, 0.3), 0.05, segs=10, col=RUBBER, caps=True)
        pipe(n, (x - 0.026, 0.05, 0.3), (x + 0.026, 0.05, 0.3), 0.022, segs=6, col=STEEL_MID, caps=True)
    for x in (-0.12, 0.12):
        cylinder(t, x, -0.3, 0.0, 0.05, 0.035, segs=8, col=RUBBER)
    beam(t, (0.0, 0.08, -0.18), (0.0, 0.095, 0.42), 0.05, 0.022, col=RED_DARK)
    cylinder(t, 0.0, 0.43, 0.08, 0.1, 0.06, segs=12, col=STEEL_MID)
    cylinder(t, 0.0, 0.43, 0.1, 0.112, 0.055, segs=12, col=RUBBER)
    pipe(t, (0.0, 0.09, -0.2), (0.0, 0.15, 0.0), 0.03, segs=8, col=CHROME, caps=True)
    pipe(t, (-0.07, 0.1, -0.24), (0.07, 0.1, -0.24), 0.04, segs=8, col=RED_DARK, caps=True)
    pipe(t, (0.0, 0.14, -0.28), (0.0, 0.92, -1.06), 0.016, segs=6, col=BLACK_PAINT, caps=True)
    pipe(t, (-0.07, 0.92, -1.06), (0.07, 0.92, -1.06), 0.016, segs=6, col=RUBBER, caps=True)


@proto("garage_creeper", box=(0.24, 0.1, 0.52), reach=200, detail=True)
def _creeper(k):
    """A mechanic's creeper: a padded board on a tube frame with its
    headrest, on six castors."""
    t, n = k("trim"), k("trim", 1)
    soft(t, (0.0, 0.1, -0.04), (1, 0, 0), (0, 1, 0), 0.2, 0.025, 0.46, 0.015, col=(0.012, 0.012, 0.014, 1))
    soft(t, (0.0, 0.15, 0.35), (1, 0, 0), (0, 1, 0), 0.18, 0.03, 0.11, 0.018, col=(0.015, 0.015, 0.018, 1))
    for x in (-0.22, 0.22):
        pipe(t, (x, 0.08, -0.5), (x, 0.08, 0.46), 0.012, segs=6, col=RED, caps=True)
    for z in (-0.5, 0.46):
        pipe(t, (-0.22, 0.08, z), (0.22, 0.08, z), 0.012, segs=6, col=RED, caps=True)
    for x in (-0.2, 0.2):
        for z in (-0.45, 0.0, 0.42):
            cylinder(n, x, z, 0.04, 0.07, 0.012, segs=6, col=STEEL_MID)
            pipe(t, (x - 0.012, 0.03, z), (x + 0.012, 0.03, z), 0.03, segs=8, col=RUBBER, caps=True)


@proto("garage_wheel_chock", box=(0.08, 0.06, 0.13), reach=120, detail=True)
def _wheel_chock(k):
    """A rubber wheel chock: a wedge, its face to the tyre (+z), a grip
    rib across its slope."""
    t = k("trim")
    col = (0.45, 0.3, 0.012, 1)
    w, l, h = 0.075, 0.13, 0.11
    a, b, c, d = (-w, 0.0, l), (w, 0.0, l), (w, 0.0, -l), (-w, 0.0, -l)
    e, f = (-w, h, l * 0.6), (w, h, l * 0.6)
    quad(t, a, b, f, e, col=col)
    quad(t, b, c, (w, h * 0.2, -l), f, col=shade(col, 0.85))
    quad(t, c, d, (-w, h * 0.2, -l), (w, h * 0.2, -l), col=shade(col, 0.8))
    quad(t, d, a, e, (-w, h * 0.2, -l), col=shade(col, 0.85))
    quad(t, e, f, (w, h * 0.2, -l), (-w, h * 0.2, -l), col=col)


# ---------------------------------------------------------------------------
# The roll-up door: a sectional door on its tracks. The frame (both tracks,
# their hangers, the torsion shaft and springs over the header, the opener's
# rail and motor) is one prototype; the curtain of sections, with the
# opener's trolley and arm, is another a pose. The prototype's z 0 is the
# inside face of the wall, its front (+z) the street: the tracks run back
# into the building under the ceiling.
# ---------------------------------------------------------------------------
DOORS = {"s": (3.0, 3.0, 4), "w": (6.0, 4.6, 6)}
_DOOR_R = 0.38
DOOR_OPEN = {"closed": 0.0, "half": 0.45, "open": 1.0}


def _track(H, s):
    """A point (y, z) on the door's track, s metres along it from the floor:
    up the jamb, round the curve over the header, back under the ceiling."""
    yc, R = H - 0.12, _DOOR_R
    if s <= yc:
        return s, 0.0
    arc = math.pi / 2 * R
    if s <= yc + arc:
        a = (s - yc) / R
        return yc + R * math.sin(a), -(R - R * math.cos(a))
    return yc + R, -R - (s - yc - arc)


def door_clearance(size):
    """How high the door's tracks and opener stand: the ceiling above the
    opening must clear this (metres above the floor)."""
    W, H, _ = DOORS[size]
    return H - 0.12 + _DOOR_R + 0.62


def _door_frame(k, W, H):
    t, n = k("trim"), k("trim", 1)
    yc, R = H - 0.12, _DOOR_R
    top = yc + R
    depth = H + 0.45
    for s in (-1, 1):
        x = s * (W / 2 + 0.06)
        xa, xb = _sorted(x, x + s * 0.05)
        # The vertical track: an angle on the jamb and its channel.
        box(t, xa, xb, 0.0, yc, -0.06, -0.004, col=ALU)
        box(t, xa - 0.006, xb + 0.006, 0.0, yc, -0.004, 0.0, col=ALU)
        # The curve, in short straight lengths, and the horizontal run.
        pts = [_track(H, yc + i * (math.pi / 2 * R) / 6) for i in range(7)]
        for (y0, z0), (y1, z1) in zip(pts, pts[1:]):
            beam(t, ((xa + xb) / 2, y0, z0 - 0.03), ((xa + xb) / 2, y1, z1 - 0.03), 0.025, 0.028, col=ALU, ends=False)
        beam(t, ((xa + xb) / 2, top, -R - 0.03), ((xa + xb) / 2, top, -depth), 0.025, 0.028, col=ALU)
        # Hangers from the ceiling to the horizontal track.
        for zz in (-R - 0.9, -depth + 0.1):
            box(t, (xa + xb) / 2 - 0.012, (xa + xb) / 2 + 0.012, top + 0.03, top + 0.62, zz - 0.02, zz + 0.02, col=STEEL_MID)
        # The end bearing plate for the shaft.
        box(t, xa, xb, H + 0.1, H + 0.42, -0.2, -0.02, col=STEEL_MID)
    # The torsion shaft over the header, its cable drums and its springs.
    sy, sz = H + 0.26, -0.11
    pipe(t, (-W / 2 - 0.1, sy, sz), (W / 2 + 0.1, sy, sz), 0.016, segs=8, col=STEEL_MID)
    for s in (-1, 1):
        pipe(t, (s * (W / 2 - 0.05), sy, sz), (s * (W / 2 + 0.05), sy, sz), 0.06, segs=10, col=GUN_DARK, caps=True)
    for s in (-1, 1):
        for i in range(10 if W > 4 else 6):
            x = s * (0.12 + i * 0.06)
            pipe(n, (x - 0.026, sy, sz), (x + 0.026, sy, sz), 0.045, segs=8, col=(0.02, 0.022, 0.025, 1), caps=True)
        pipe(t, (s * 0.1, sy, sz), (s * (0.15 + (10 if W > 4 else 6) * 0.06), sy, sz), 0.04, segs=8, col=(0.02, 0.022, 0.025, 1))
    box(t, -0.08, 0.08, H + 0.1, H + 0.44, -0.04, -0.01, col=STEEL_MID)
    # The opener: its rail from the header back to the motor, hung from the
    # ceiling, and the motor with its lamp lens under it.
    ry = top + 0.12
    box(t, -0.025, 0.025, ry - 0.03, ry + 0.03, -depth - 0.25, -0.12, col=STEEL_MID, bottom=True)
    mz = -depth - 0.25
    box(t, -0.2, 0.2, ry - 0.12, ry + 0.12, mz - 0.42, mz, col=WHITE_PAINT, bottom=True)
    quad(k("glow"), (-0.12, ry - 0.121, mz - 0.1), (0.12, ry - 0.121, mz - 0.1), (0.12, ry - 0.121, mz - 0.32), (-0.12, ry - 0.121, mz - 0.32),
         col=(0.9, 0.85, 0.7, 1))
    for zz in (mz - 0.2, -depth * 0.5):
        box(t, -0.01, 0.01, ry + 0.03, top + 0.62, zz - 0.02, zz + 0.02, col=STEEL_MID)
    # The wall's push button beside the opening (inside).
    box(n, W / 2 + 0.3, W / 2 + 0.38, 1.35, 1.47, 0.0, 0.03, col=WHITE_PAINT)
    cylinder(n, W / 2 + 0.34, 0.035, 1.39, 1.43, 0.018, segs=8, col=(0.25, 0.02, 0.02, 1))


def _door_curtain(k, W, H, n, f):
    """The door's sections, f of the way open (0 shut, 1 open): each panel a
    rigid slab between its two hinges on the track, ribbed, a row of
    windows in one, a hazard stripe and a rubber seal on the bottom one;
    hinges and rollers near by; the opener's trolley and its arm."""
    t, near = k("trim"), k("trim", 1)
    yc, R = H - 0.12, _DOOR_R
    sh = H / n
    s0 = f * (yc + 0.3)
    hu = W / 2
    pts = []
    for i in range(n):
        ya, za = _track(H, s0 + i * sh)
        yb, zb = _track(H, s0 + (i + 1) * sh)
        A, B = Vector((0, ya, za)), Vector((0, yb, zb))
        up = (B - A).normalized()
        c = (A + B) / 2
        obox(t, tuple(c), (1, 0, 0), tuple(up), hu, (B - A).length / 2 - 0.004, 0.022, col=GUN, scale=1.0)
        # Two pressed ribs across the outside face, and the edge stiles.
        # The section's outside: toward the street shut, the ceiling open.
        out = Vector((1, 0, 0)).cross(up)
        for r in (0.3, 0.7):
            rc = A + (B - A) * r + out * 0.024
            obox(t, tuple(rc), (1, 0, 0), tuple(up), hu - 0.12, 0.012, 0.004, col=shade(GUN, 1.25), skip=("-w",))
        if i == n - 2:
            # The windows: dark glass in a row across the section.
            m = max(3, int(W / 0.75))
            for j in range(m):
                wx = -hu + (j + 0.5) * W / m
                wc = A + (B - A) * 0.5 + out * 0.0235
                obox(k("glass_dark"), (wx, wc.y, wc.z), (1, 0, 0), tuple(up), W / m * 0.32, sh * 0.22, 0.003, skip=("-w",))
        if i == 0:
            bc = A + up * 0.06 + out * 0.0235
            obox(k("hazard"), tuple(bc), (1, 0, 0), tuple(up), hu - 0.05, 0.04, 0.002, skip=("-w",))
            obox(t, tuple(A + up * 0.012), (1, 0, 0), tuple(up), hu, 0.014, 0.028, col=RUBBER)
            # The handle and the lock, outside.
            obox(t, tuple(A + up * 0.3 + out * 0.03), (1, 0, 0), tuple(up), 0.11, 0.015, 0.012, col=CHROME)
        for x in (-hu + 0.02, hu - 0.02):
            obox(t, (x, c.y, c.z), (1, 0, 0), tuple(up), 0.02, (B - A).length / 2 - 0.004, 0.024, col=shade(GUN, 0.8))
        pts.append((A, B, up, out))
        # Hinges at the joint above, and a roller into each track.
        for x in (-hu + 0.2, 0.0, hu - 0.2):
            obox(near, tuple(B - out * 0.03 + Vector((x, 0, 0))), (1, 0, 0), tuple(up), 0.03, 0.05, 0.006, col=STEEL_MID)
        for s in (-1, 1):
            pipe(near, (s * hu, B.y, B.z - 0.03), (s * (hu + 0.085), B.y, B.z - 0.03), 0.008, segs=5, col=STEEL_MID)
            pipe(near, (s * (hu + 0.05), B.y, B.z - 0.03), (s * (hu + 0.08), B.y, B.z - 0.03), 0.024, segs=8, col=RUBBER, caps=True)
    # The opener's trolley on its rail and the arm down to the top section.
    A, B, up, out = pts[-1]
    top = yc + R
    ry = top + 0.12
    tz = min(B.z - 0.55, -0.35)
    box(t, -0.04, 0.04, ry - 0.07, ry - 0.025, tz - 0.08, tz + 0.08, col=GUN_DARK, bottom=True)
    brk = B - up * 0.12 - out * 0.03
    cable(t, (tuple(brk), (0.0, (brk.y + ry) / 2 + 0.05, (brk.z + tz) / 2 + 0.05), (0.0, ry - 0.06, tz)), 0.014, col=STEEL_MID, segs=6)


for _size, (_w, _h, _n) in DOORS.items():
    def _frame(k, _w=_w, _h=_h):
        _door_frame(k, _w, _h)
    _frame.__doc__ = f"The {_w:g} m by {_h:g} m roll-up door's frame: tracks, hangers, torsion shaft and springs, the opener's rail and motor."
    proto(f"garage_door_{_size}_frame", box=(_w / 2 + 0.12, 0.3, 0.06))(_frame)
    for _pose, _f in DOOR_OPEN.items():
        def _curtain(k, _w=_w, _h=_h, _n=_n, _f=_f):
            _door_curtain(k, _w, _h, _n, _f)
        _curtain.__doc__ = f"The {_w:g} m by {_h:g} m roll-up door's {_n} sections, {_pose}."
        proto(f"garage_door_{_size}_{_pose}", box=(_w / 2, _h / 2 if _f < 0.5 else 0.1, 0.03 if _f == 0 else 0.5))(_curtain)


def place_door(x, z, yaw=0.0, size="w", pose="closed", y=0.0, district=None):
    """A roll-up door with its frame, its z 0 on the wall's inside face and
    its front (+z) toward the street."""
    at = frame_of(x, y, z, yaw)
    place_in(at, yaw, f"garage_door_{size}_frame", 0, 0, 0, district=district)
    place_in(at, yaw, f"garage_door_{size}_{pose}", 0, 0, 0, district=district)


@proto("garage_man_door", box=(0.56, 1.12, 0.06))
def _man_door(k):
    """A steel man door, 0.95 by 2.15 m, its outside toward +z: frame, the
    leaf with its wired glass vision panel and kick plate, a lever outside,
    the push bar and the closer inside, and over it inside a lit EXIT sign."""
    t, n = k("trim"), k("trim", 1)
    W, H = 0.95, 2.15
    for x in (-W / 2 - 0.05, W / 2):
        box(t, x, x + 0.05, 0.0, H + 0.05, -0.05, 0.05, col=GUN_DARK)
    box(t, -W / 2 - 0.05, W / 2 + 0.05, H, H + 0.05, -0.05, 0.05, col=GUN_DARK)
    box(k("door"), -W / 2 + 0.005, W / 2 - 0.005, 0.01, H - 0.005, -0.022, 0.022, bottom=True)
    quad(k("glass_dark"), (-0.13, 1.25, 0.0225), (0.13, 1.25, 0.0225), (0.13, 1.85, 0.0225), (-0.13, 1.85, 0.0225))
    quad(k("glass_dark"), (0.13, 1.25, -0.0225), (-0.13, 1.25, -0.0225), (-0.13, 1.85, -0.0225), (0.13, 1.85, -0.0225))
    for z0, z1 in ((0.022, 0.026), (-0.026, -0.022)):
        box(t, -0.15, 0.15, 1.23, 1.25, z0, z1, col=STEEL_MID)
        box(t, -0.15, 0.15, 1.85, 1.87, z0, z1, col=STEEL_MID)
        box(t, -0.15, -0.13, 1.25, 1.85, z0, z1, col=STEEL_MID)
        box(t, 0.13, 0.15, 1.25, 1.85, z0, z1, col=STEEL_MID)
        box(t, -W / 2 + 0.02, W / 2 - 0.02, 0.02, 0.27, z0, z1, col=shade(CHROME, 0.7))
    # Outside: the lever and its rose.
    pipe(t, (0.38, 1.02, 0.022), (0.38, 1.02, 0.07), 0.02, segs=8, col=CHROME, caps=True)
    pipe(t, (0.38, 1.02, 0.065), (0.26, 1.02, 0.065), 0.011, segs=6, col=CHROME, caps=True)
    # Inside: the push bar on its two end boxes, and the closer at the top.
    for x in (-0.38, 0.36):
        box(t, x - 0.03, x + 0.05, 0.96, 1.08, -0.08, -0.022, col=shade(CHROME, 0.8))
    box(t, -0.36, 0.36, 0.99, 1.05, -0.075, -0.035, col=CHROME)
    box(t, 0.1, 0.42, 2.0, 2.08, -0.09, -0.022, col=shade(CHROME, 0.75))
    beam(t, (0.36, 2.04, -0.07), (0.05, 2.12, -0.2), 0.012, 0.008, col=CHROME)
    beam(t, (0.05, 2.12, -0.2), (-0.1, 2.15, -0.06), 0.012, 0.008, col=CHROME)
    # The EXIT sign over the frame, inside (its face looking -z).
    box(t, -0.2, 0.2, H + 0.12, H + 0.32, -0.12, -0.05, col=WHITE_PAINT)
    quad(k("glow"), (0.18, H + 0.14, -0.121), (-0.18, H + 0.14, -0.121), (-0.18, H + 0.3, -0.121), (0.18, H + 0.3, -0.121), col=(0.004, 0.06, 0.012, 1))
    words(k("glow"), "EXIT", (0.0, H + 0.22, -0.123), (-1, 0, 0), (0, 1, 0), 0.28, 0.1, 0.016, (0.05, 0.9, 0.2, 1))


# ---------------------------------------------------------------------------
# The city's own shutter. The garage's opening (6 m by 4.6 m) keeps the
# roller shutter src/world/garage.js already rolls: the named quad
# garage_door, SHUTTER_PLANE out from the wall's inside face, rising into
# the drum box over the opening (districts/garage.py). This is what stands
# round it inside: the guides in the reveal, the fascia over the drum, the
# motor on the drum's end with its hand chain, the threshold seal and the
# push-button station. Front (+z) toward the street, as the doors above.
# ---------------------------------------------------------------------------
SHUTTER = (6.0, 4.6)
SHUTTER_PLANE = 0.38


@proto("garage_shutter_w", box=(3.6, 0.3, 0.46))
def _shutter_w(k):
    """The fittings of the city's 6 m by 4.6 m roller shutter, inside: its
    guide channels either side of the curtain, the fascia plate over the
    drum, the drive motor on the drum's right end with its hand chain
    looped down for a power cut, the rubber threshold seal, the up/stop/
    down station on the wall."""
    t, n = k("trim"), k("trim", 1)
    W, H = SHUTTER
    p = SHUTTER_PLANE
    for s in (-1, 1):
        x0, x1 = _sorted(s * (W / 2 - 0.07), s * W / 2)
        for z0, z1 in ((p - 0.07, p - 0.035), (p + 0.035, p + 0.07)):
            box(t, x0, x1, 0.0, H, z0, z1, col=GUN)
        box(t, x0 + (0.0 if s > 0 else 0.04), x1 - (0.04 if s > 0 else 0.0), 0.0, H, p - 0.07, p + 0.07, col=GUN_DARK)
        for i in range(6):
            y = 0.4 + i * 0.75
            box(n, x0 - 0.01, x1 + 0.01, y, y + 0.05, p - 0.08, p - 0.07, col=STEEL_MID)
    box(t, -W / 2 - 0.2, W / 2 + 0.2, H, H + 0.6, -0.12, -0.1, col=GUN_DARK, bottom=True)
    box(k("hazard"), -W / 2 - 0.2, W / 2 + 0.2, H + 0.02, H + 0.08, -0.124, -0.12)
    box(t, -W / 2, W / 2, 0.0, 0.015, p - 0.04, p + 0.04, col=RUBBER)
    # The motor, its gearbox and the hand chain, in the room in front of the
    # drum's right end (the wall is solid beside the opening).
    mx, mz = W / 2 + 0.35, -0.26
    pipe(t, (W / 2, H + 0.3, mz), (mx + 0.2, H + 0.3, mz), 0.11, segs=12, col=GUN, caps=True)
    box(t, mx + 0.2, mx + 0.42, H + 0.12, H + 0.48, mz - 0.16, mz + 0.16, col=BLACK_PAINT, bottom=True)
    pipe(t, (mx + 0.42, H + 0.3, mz), (mx + 0.46, H + 0.3, mz), 0.13, segs=12, col=GUN_DARK, caps=True)
    for zc in (mz - 0.08, mz + 0.08):
        pts = [(mx + 0.44, H + 0.17, zc), (mx + 0.44, H - 1.4, zc), (mx + 0.44, 1.25, zc + (0.04 if zc < mz else -0.04))]
        cable(n, pts, 0.005, col=STEEL_MID, segs=4)
    cable(t, ((mx + 0.3, H + 0.12, mz), (mx + 0.3, H - 0.2, -0.03), (W / 2 + 0.3, H - 0.4, -0.02), (W / 2 + 0.3, 1.6, -0.02)), 0.008, col=CABLE)
    # The station: up, stop, down.
    box(t, W / 2 + 0.22, W / 2 + 0.38, 1.25, 1.6, -0.06, 0.0, col=YELLOW)
    for i, col in enumerate(((0.05, 0.05, 0.05, 1), (0.6, 0.03, 0.02, 1), (0.05, 0.05, 0.05, 1))):
        pipe(n, (W / 2 + 0.3, 1.52 - i * 0.1, -0.06), (W / 2 + 0.3, 1.52 - i * 0.1, -0.075), 0.022, segs=8, col=col, caps=True)


# ---------------------------------------------------------------------------
# The S6's bay: a flush service pad, no posts (nothing tall in front of its
# mirrors and grille), and painted bay lines.
# ---------------------------------------------------------------------------
@proto("garage_service_pad", box=(1.1, 0.01, 1.05), reach=220)
def _service_pad(k):
    """A flush in-ground lift's pad: its two runway plates level with the
    floor (an in-ground scissor, down) in their steel frames, a hinged
    access hatch between them, hazard chevrons on the plates' ends and the
    wheel stops' marks."""
    t, n, hz = k("trim"), k("trim", 1), k("hazard")
    for s in (-1, 1):
        cx = s * 0.8
        quad(t, (cx - 0.3, 0.004, 1.02), (cx + 0.3, 0.004, 1.02), (cx + 0.3, 0.004, -1.02), (cx - 0.3, 0.004, -1.02), col=STEEL_MID)
        for (x0, x1, z0, z1) in ((cx - 0.33, cx + 0.33, 1.02, 1.05), (cx - 0.33, cx + 0.33, -1.05, -1.02), (cx - 0.33, cx - 0.3, -1.02, 1.02), (cx + 0.3, cx + 0.33, -1.02, 1.02)):
            box(t, x0, x1, 0.0, 0.006, z0, z1, col=GUN_DARK)
        for i in range(14):
            z = -0.95 + i * 0.14
            box(n, cx - 0.26, cx + 0.26, 0.004, 0.007, z, z + 0.04, col=shade(STEEL_MID, 1.2))
        for e in (-1, 1):
            for j in range(3):
                x = cx - 0.24 + j * 0.2
                flat(hz, [(x, e * 0.98), (x + 0.1, e * 0.98), (x + 0.16, e * 0.9), (x + 0.06, e * 0.9)], 0.005)
    flat_rect(t, -0.42, 0.42, -0.4, 0.4, 0.003, col=GUN_DARK)
    for x in (-0.42, 0.4):
        box(n, x, x + 0.02, 0.0, 0.005, -0.4, 0.4, col=STEEL_MID)
    box(n, -0.06, 0.06, 0.003, 0.008, 0.3, 0.34, col=CHROME)


@proto("garage_bay_lines", box=(1.75, 0.01, 3.05), reach=260)
def _bay_lines(k):
    """A bay painted out in yellow, 3.5 by 6.1 m: its outline in 60 mm
    lines broken at the corners, a centre tick at each end, a wheel stop
    bar across the front."""
    hz = k("hazard")
    W, L, w = 1.75, 3.05, 0.03
    for (x0, x1, z0, z1) in ((-W, -W + 2 * w, -L + 0.4, L - 0.4), (W - 2 * w, W, -L + 0.4, L - 0.4),
                             (-W + 0.4, W - 0.4, L - 2 * w, L), (-W + 0.4, W - 0.4, -L, -L + 2 * w),
                             (-0.03, 0.03, L - 0.5, L - 0.1), (-0.03, 0.03, -L + 0.1, -L + 0.5), (-0.7, 0.7, 2.25, 2.33)):
        flat_rect(hz, x0, x1, z0, z1, 0.004)
    # Each corner's two short arms, the outline broken before them.
    for sx in (-1, 1):
        for sz in (-1, 1):
            x, z = sx * W, sz * L
            flat_rect(hz, x, x - sx * 0.25, z, z - sz * 2 * w, 0.004)
            flat_rect(hz, x, x - sx * 2 * w, z, z - sz * 0.25, 0.004)
