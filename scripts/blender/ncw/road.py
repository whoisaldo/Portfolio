from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw.districts.garage import BAY

# ---------------------------------------------------------------------------
# The road the car drives, from the hero's curb to the garage bay, sampled
# every metre into the `points` extra on road_spline (world coordinates).
# ---------------------------------------------------------------------------
ROAD = [
    (8.6, -37.0), (8.5, -70.0), (8.4, -100.0), (8.4, -125.0), (8.6, -150.0), (8.8, -166.0), (11.5, -175.5),
    (18.0, -179.0), (30.0, -179.5), (60.0, -180.0), (100.0, -180.0), (115.0, -186.0), (120.0, -200.0),
    (120.0, -300.0), (124.0, -318.0), (136.0, -328.0), (250.0, -328.0), (420.0, -328.0), (436.0, -322.0),
    (440.0, -306.0), (440.5, -260.0), (440.0, -228.0), (444.0, -217.0), (452.0, -215.0), (462.0, -215.0),
]


def catmull(points, step=1.0):
    """The road through `points`, as a Catmull-Rom curve walked at an even
    `step` metres: sampled densely first, then resampled by arc length, so
    a long straight next to a tight corner is still a metre a point."""
    pts = [Vector((x, 0.0, z)) for x, z in points]
    ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    dense = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        seg = max(8, int((p2 - p1).length / 0.1))
        for j in range(seg):
            t = j / seg
            t2, t3 = t * t, t * t * t
            p = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
            dense.append(p)
    dense.append(pts[-1])
    out = [dense[0].copy()]
    carry = 0.0
    for a, b in zip(dense, dense[1:]):
        a = a.copy()
        length = (b - a).length
        while carry + length >= step:
            p = a.lerp(b, (step - carry) / length)
            out.append(p)
            length = (b - p).length
            a = p
            carry = 0.0
        carry += length
    if (out[-1] - pts[-1]).length > 0.05:
        out.append(pts[-1].copy())
    return out


road = catmull(ROAD)
flat = []
for p in road:
    flat += [round(p.x, 3), 0.0, round(p.z, 3)]
empty("road_spline", (0, 0, 0), props={"points": flat})
# A visible copy for Blender only.
curve = bpy.data.curves.new(PREFIX + "road_preview", "CURVE")
curve.dimensions = "3D"
spl = curve.splines.new("POLY")
spl.points.add(len(road) - 1)
for sp, p in zip(spl.points, road):
    sp.co = (*P(p.x, 0.3, p.z), 1)
curve.bevel_depth = 0.08
link(bpy.data.objects.new(PREFIX + "road_preview", curve), preview_coll)

# Where the car waits for each shot; the site projects these onto the road.
# The curb mark is two marks on the right-hand curb: a landscape hero and a
# portrait hero see different parts of the avenue, and the parked car has to
# sit clear of the name, the tagline, the ledger and the photograph in both.
# The left curb was the brief, and it was measured first: at 1440x900 every
# point of it up to the cross street lands behind the name or the tagline,
# and at 390x844 behind the photograph. See design/night-city-world/README.md.
empty("anchor_curb_hero", (8.6, 0.0, -37.0), yaw=math.pi)
empty("anchor_curb_hero_portrait", (8.4, 0.0, -125.0), yaw=math.pi)
for key, pos in (("plaza", (80.0, 0.0, -180.0)), ("corpo_a", (150.0, 0.0, -328.0)),
                 ("corpo_b", (378.0, 0.0, -328.0)), ("rooftop", (440.5, 0.0, -275.0)),
                 ("bay", BAY)):
    empty("car_" + key, pos)
