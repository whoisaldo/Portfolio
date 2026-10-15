"""Kabuki Avenue's people at something: off the hero's frames (the arm and
the south street's south side), the show's street at night is people doing
things, not only walking or standing (review m9, "no vendors at work, no
police and no small scenes"): food carts with their cooks and a queue, a
patrol stopping somebody, a scooter being fixed at the kerb, a delivery
carried in, people sitting on a step, smoking by a door, talking in knots.

Each scene stands only where nothing else does (props, people, the lots),
and everyone in it is placed by kit.stand, so the crowd draws them (their
looks are the crowd's, dealt by where they stand).
"""
import math

from ncw.kit import *  # noqa: F401,F403
from ncw import props as P
from ncw.districts import avenue_kit as K

G0 = K.G0

# Where somebody in uniform stands (src/world/crowd.js OFFICERS matches a
# district's stand by position: these are sent to the coordinator).
PATROL = []


def clear(x, z, r, y=0.15):
    """Nothing standing within r of (x, z) at the pavement's level: no prop
    on the ground, nobody standing."""
    for (name, px, py, pz, *_rest) in P.INSTANCES:
        if abs(py - y) < 1.2 and abs(px - x) < r + 0.6 and abs(pz - z) < r + 0.6 and name not in ("lantern", "ac_wall", "pipe_v", "cctv", "drain", "grate_glow"):
            BLOCKED.append(((x, z), name, (px, pz)))
            return False
    for (px, py, pz, *_rest) in PEOPLE:
        if abs(py - y) < 1.0 and math.hypot(px - x, pz - z) < r:
            BLOCKED.append(((x, z), "person", (px, pz)))
            return False
    return True


BLOCKED = []
STEPS = (0.0, 1.5, -1.5, 3.0, -3.0, 4.5, -4.5, 6.0, -6.0, 7.5, -7.5, 9.0, -9.0)


def find(x, z, r, axis, front=None):
    """The nearest spot along the street (axis "x" or "z") from (x, z) where
    nothing stands within r, and (front: (dx, dz, r2)) nothing in front of
    it either; None if there is none within 9 m."""
    for d in STEPS:
        px, pz = (x + d, z) if axis == "x" else (x, z + d)
        if clear(px, pz, r) and (front is None or clear(px + front[0], pz + front[1], front[2])):
            return px, pz
    return None


def cart(D, x, z, yaw, rng, queue=2):
    """A food cart, its counter to yaw, its cook behind it, a queue in
    front, steam off its pot."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    P.place("food_cart", x, G0, z, yaw, district=D)
    stand(x - nx * 0.95, z - nz * 0.95, yaw, "vendor", y=G0)
    for k in range(queue):
        d = 1.1 + k * 0.75
        q = (x + nx * d + rng.uniform(-0.2, 0.2), z + nz * d + rng.uniform(-0.2, 0.2))
        stand(q[0], q[1], yaw + math.pi + rng.uniform(-0.3, 0.3), "queue" if k else rng.choice(("idle", "phone")), y=G0)
    empty(f"anchor_steam_zz_stall_avc{int(abs(x) * 10)}_{int(abs(z) * 10)}", (x - nx * 0.3, G0 + 1.15, z - nz * 0.3))
    light(D, x + nx * 1.2, 1.4, z + nz * 1.2, rng.choice(("amber", "white", "pink")), 5.0)


def patrol(x, z, yaw, rng, suspect=True):
    """Two officers stopping somebody at the kerb."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    a = (x - rx * 0.45, z - rz * 0.45)
    b = (x + rx * 0.5 + nx * 0.15, z + rz * 0.5 + nz * 0.15)
    stand(a[0], a[1], yaw, "talk", y=G0)
    stand(b[0], b[1], yaw - 0.4, "idle", y=G0)
    PATROL.extend([(round(a[0], 2), round(a[1], 2)), (round(b[0], 2), round(b[1], 2))])
    if suspect:
        stand(x + nx * 0.95, z + nz * 0.95, yaw + math.pi, rng.choice(("talk", "idle")), y=G0)


def scooter_fix(D, x, z, yaw, rng):
    """A scooter at the kerb, somebody crouched at its wheel, a friend over
    them, a lamp on the ground."""
    K.scooter(D, x, z, yaw, rng)
    nx, nz = math.sin(yaw), math.cos(yaw)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    stand(x + rx * 0.7, z + rz * 0.7, yaw - math.pi / 2, "squat", y=G0)
    stand(x + rx * 1.3 + nx * 0.6, z + rz * 1.3 + nz * 0.6, yaw - math.pi / 2 - 0.5, "smoke", y=G0)
    box((D, "glow", 0), x + rx * 0.5 - 0.06, x + rx * 0.5 + 0.06, G0, G0 + 0.12, z + rz * 0.5 - 0.06, z + rz * 0.5 + 0.06, scale=0.5, col=GLOW["white"])
    light(D, x + rx * 0.6, 0.5, z + rz * 0.6, "white", 3.0)


def delivery(D, x, z, yaw, rng):
    """A delivery carried in: crates on a pallet by a door, two carrying
    one between them."""
    nx, nz = math.sin(yaw), math.cos(yaw)
    P.place("pallets", x, G0, z, yaw, district=D)
    P.place("crates", x + nz * 0.9, G0, z - nx * 0.9, yaw + 0.3, district=D)
    stand(x + nx * 1.4, z + nz * 1.4, yaw + math.pi / 2, "carry", y=G0)


def knot(x, z, n, rng, poses=("talk", "talk", "smoke", "phone", "idle")):
    """People in a knot, facing in."""
    for k in range(n):
        a = k * math.tau / n + rng.uniform(-0.3, 0.3)
        px, pz = x + math.cos(a) * 0.55, z + math.sin(a) * 0.55
        stand(px, pz, math.atan2(x - px, z - pz), rng.choice(poses), y=G0)


def build(D, rng, walk=14.0, kerb=10.0):
    """The arm's pavements (z 36 and on, out of the phone hero's frame) and
    the south street's south pavement (out of the hero's)."""
    # Food carts against the arm's walls, their counters to the pavement,
    # and along the south street's south pavement.
    for (sx, z) in ((1, 45.5), (-1, 58.0), (1, 69.5), (-1, 81.0)):
        at = find(sx * (walk - 1.35), z, 1.6, "z", front=(-sx * 1.7, 0.0, 1.0))
        if at and 38.0 < at[1] < 86.0:
            cart(D, at[0], at[1], -sx * math.pi / 2, rng, queue=rng.randrange(1, 4))
    for x in (-58.0, 33.0, 62.0, 94.0):
        at = find(x, 12.0 - 1.35, 1.6, "x", front=(0.0, -1.7, 1.0))
        if at and (abs(at[0]) > 22.0):
            cart(D, at[0], at[1], math.pi, rng, queue=rng.randrange(1, 4))
    # A patrol stopping somebody, on the south street east of the arm and
    # on the arm past its first crossing.
    for (x, z, yaw, axis) in ((26.0, 9.9, math.pi, "x"), (-11.6, 50.0, math.pi / 2, "z")):
        at = find(x, z, 1.2, axis)
        if at and (axis == "z" or abs(at[0]) > 20.0) and (axis == "x" or at[1] > 38.0):
            patrol(at[0], at[1], yaw, rng)
    # A scooter being fixed at the kerb, a delivery at a door, knots of
    # people, somebody sitting on a step.
    for (sx, z) in ((-1, 52.0), (1, 77.0)):
        at = find(sx * (kerb + 0.9), z, 1.5, "z")
        if at and at[1] > 38.0:
            scooter_fix(D, at[0], at[1], 0.0, rng)
    for (x, z, yaw, axis) in ((-40.0, 10.9, math.pi, "x"), (78.0, 10.9, math.pi, "x"), (12.9, 63.0, -math.pi / 2, "z")):
        at = find(x, z, 1.6, axis)
        if at:
            delivery(D, at[0], at[1], yaw, rng)
    for (x, z, axis) in ((-12.0, 41.0, "z"), (11.9, 55.0, "z"), (-11.8, 72.0, "z"), (12.0, 84.0, "z"), (-48.0, 9.8, "x"), (-26.0, 9.9, "x"),
                         (40.0, 9.8, "x"), (70.0, 9.8, "x"), (101.0, 9.8, "x")):
        at = find(x, z, 1.3, axis)
        if at and (axis == "x" or at[1] > 38.0) and (axis == "z" or abs(at[0]) > 20.0):
            knot(at[0], at[1], rng.randrange(2, 5), rng)
    for (x, z, yaw, axis) in ((-13.55, 66.0, math.pi / 2, "z"), (13.55, 50.0, -math.pi / 2, "z"), (52.0, 11.6, math.pi, "x"), (-35.0, 11.6, math.pi, "x")):
        at = find(x, z, 0.9, axis)
        if at:
            stand(at[0], at[1], yaw, "floor", y=G0)
