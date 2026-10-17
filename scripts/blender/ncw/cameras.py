from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)

# ---------------------------------------------------------------------------
# Cameras, as empties the site reads, plus two real cameras on the hero's
# anchors (16:10 and a phone) for Blender's own view of it.
# ---------------------------------------------------------------------------


# The hero is a low camera in the avenue, an eye over the wet road looking
# straight up it (the drift has its own camera, and the site glides from one
# to the other); a phone stands further back and a little higher, so its
# narrow frame still holds both screens and her.
SHOT_CAMERAS = {
    "hero": ((0.6, 0.6, 10.0), (0.6, 0.6, -60.0)),
    "projects": ((73.0, 13.0, -204.0), (79.0, 27.0, -263.0)),
    # Corpo row from the boulevard's south kerb, looking up the row on a
    # diagonal so every crown and its logo reads, dollying east as the
    # reader goes down the roles.
    "experience": ((120.0, 30.0, -230.0), (190.0, 112.0, -360.0)),
    "experience_b": ((330.0, 30.0, -230.0), (400.0, 112.0, -360.0)),
    "about": ((476.0, 37.4, -266.0), (380.0, 44.0, -318.0)),
    # Stack starts a quarter of the way into its pan, so the cut from About
    # turns the camera as well as glitching it.
    "stack": ((476.0, 37.4, -266.0), (380.0, 46.0, -284.0)),
    "stack_b": (None, (380.0, 38.0, -214.0)),
    # The garage's arrival (cam_garage stays its name for the page's shot):
    # from the rear apron by the door, both cars, their rears to it.
    "garage": ((453.8, 2.2, -225.0), (462.0, 0.45, -219.0)),
    # The moon sits right of the email headline, over the sky it is meant to
    # read against, clear of the navigation and the links below.
    "contact": ((456.0, 10.4, -203.0), (554.0, 48.5, -110.0)),
}
for shot, (pos, tgt) in SHOT_CAMERAS.items():
    base, suffix = (shot[:-2], "_b") if shot.endswith("_b") else (shot, "")
    if pos is not None:
        empty(f"cam_{base}{suffix}", pos)
    empty(f"cam_{base}_target{suffix}", tgt)
empty("cam_hero_portrait", (0.6, 0.75, 30.0))
empty("cam_hero_target_portrait", (0.6, 0.75, -60.0))
# A phone's Contact: the moon smaller (the site scales it) and up in the
# top corner, because the column of links fills the rest of a portrait
# screen.
empty("cam_contact_target_portrait", (529.6, 28.2, -89.7))
# Waypoints the flights run through where a straight line would hit a
# wall: off the rooftop's edge, down into the street behind the car, across
# to the far kerb where the open door lines up with the bay, in at the door
# (clear of both its edges); and out of the door and up over the garage's
# parapet for Contact. cam_garage_swing, round the S4's rear quarter, was
# the old room's way to its viewer's front preset: the page's flights still
# name it until they move onto the workshop's own paths above.
# ---------------------------------------------------------------------------
# Inside the garage. Six stations the section's scroll stops at (p, where
# its progress lands on each), and the closer poses the parts and the
# demonstrations use; each a wide camera and an independent portrait one
# (cam_garage_<id>, _target, _portrait, _target_portrait), lenses in
# vertical degrees on the empty (fov, fov_portrait). The paths between them
# are GARAGE_ROUTE below, with what the camera looks at on the way; the
# room they run through is districts/garage_interior.py, and all of it goes
# to the site in design/night-city-world/garage-layout.json as well.
# ---------------------------------------------------------------------------
GARAGE_STATIONS = [
    # id, p, (wide camera, target, fov), (portrait camera, target, fov)
    # (Wide: lower and in the arrival pocket than PLAN's first [454, 2.7,
    # -222.8], so the S6's own bumper does not hide its tyres' contact.)
    ("arrival", 0.0, ((453.8, 2.2, -225.0), (462.0, 0.45, -219.0), 58), ((454.0, 3.6, -228.6), (461.5, 0.8, -220.0), 84)),
    ("s4", 0.2, ((468.5, 1.8, -210.8), (462.8, 0.85, -215.0), 48), ((469.4, 2.3, -211.3), (462.5, 0.85, -215.0), 60)),
    # (A phone looks steeper into each bay, so the open engine sits in the
    # picture's clear upper part, over the collapsed part card.)
    ("s4_bay", 0.4, ((466.4, 3.15, -215.9), (463.3, 1.05, -215.0), 44), ((466.9, 3.45, -215.6), (464.086, 0.6, -215.137), 58)),
    ("s6", 0.6, ((467.8, 1.55, -225.6), (462.5, 0.8, -222.0), 48), ((470.0, 2.1, -226.0), (462.5, 0.8, -222.0), 60)),
    ("s6_bay", 0.8, ((466.7, 3.45, -222.8), (463.3, 1.05, -222.0), 44), ((467.2, 3.65, -222.5), (464.224, 0.6, -222.118), 58)),
    # Afterlife workbench, the old room's Explore view at a workshop's
    # size: 8 m back and some 25 degrees off square, as that view stood to
    # its back wall, the benches running away under the amber strip, the
    # moon's screen and AFTERLIFE AUTO over them, the jacket on its chair in
    # front, Guts and the Smasher print either side; a phone from the aisle
    # between the bays, square to the wall at a standing eye's height and
    # looking down, so the whole of it (Guts to the print, the jacket to
    # the sign) stands over the shop's text reader (from y 435 of 844).
    ("shop", 1.0, ((467.6, 2.5, -212.2), (475.1, 2.35, -215.6), 60), ((466.0, 1.6, -218.5), (475.1, -0.22, -215.6), 87)),
]
GARAGE_POSES = [
    # Inspection poses the tour and the parts reach between stations.
    ("s4_rear", ((456.6, 1.5, -211.8), (460.2, 0.7, -215.0), 50), ((456.2, 1.75, -211.2), (460.2, 0.75, -215.0), 62)),
    ("s6_rear", ((456.0, 1.6, -225.9), (460.3, 0.7, -222.0), 50), ((455.6, 1.85, -226.4), (460.3, 0.75, -222.0), 62)),
    ("s6_stance", ((465.0, 0.72, -225.4), (463.5, 0.45, -222.9), 46), ((465.0, 0.72, -225.8), (463.5, 0.45, -222.9), 52)),
    # Cabin cuts (never flown to: a closed window is between): from the
    # back seat between the front ones, on the head unit.
    ("s4_cabin", ((461.25, 1.12, -215.0), (462.75, 0.92, -215.0), 52), ((461.2, 1.12, -215.0), (462.75, 0.95, -215.0), 64)),
    ("s6_cabin", ((461.2, 1.14, -222.0), (462.8, 0.93, -222.0), 52), ((461.15, 1.14, -222.0), (462.8, 0.96, -222.0), 64)),
]
for gid, *rest in GARAGE_STATIONS + [(g, None, *r) for g, *r in GARAGE_POSES]:
    (wpos, wtgt, wfov), (ppos, ptgt, pfov) = rest[-2], rest[-1]
    name = "cam_garage" if gid == "arrival" else f"cam_garage_{gid}"
    extras = {"fov": float(wfov), "fov_portrait": float(pfov), "station": gid}
    if rest[0] is not None:
        extras["p"] = rest[0]
    if gid != "arrival":
        empty(name, wpos, props=extras)
        empty(name + "_target", wtgt)
    else:
        for k, v in extras.items():
            bpy.data.objects["cam_garage"][k] = v
        # The arrival under its own name too, with the other stations.
        empty("cam_garage_arrival", wpos, props=extras)
        empty("cam_garage_arrival_target", wtgt)
        empty("cam_garage_arrival_portrait", ppos)
        empty("cam_garage_arrival_target_portrait", ptgt)
    empty(name + "_portrait", ppos)
    empty(name + "_target_portrait", ptgt)

# The paths between them. Each route (its id fixed by the site's contract)
# runs from one pose to another through its controls, the interior points
# of the page's centripetal Catmull-Rom (cam_garage_path_<route>_<NN>; a
# portrait control of the same NN replaces the wide one on a phone), and
# looks at its gaze anchors on the way (cam_garage_gaze_<route>_<NN>, each
# fully weighted at arc fraction `u`; none: along the path, then the
# destination's target; a third element (u, point) is a phone's own). The graph's junctions are anchor_garage_node_<id>:
# the camera leaves the room only by apron, door, outside.
# The middle of the Smasher print (districts/garage_interior.py, ART).
SMASHER_AT = (475.4, 4.13, -212.5)
GARAGE_NODES = {
    "outside": (446.0, 2.3, -216.5),
    "door": (452.0, 2.4, -215.2),
    "apron": (455.0, 2.8, -216.2),
    "s4_flank": (462.0, 2.6, -210.0),
    "s6_flank": (462.0, 2.0, -226.8),
    "aisle": (470.0, 2.6, -218.5),
}
GARAGE_ROUTES = {
    # id: (from, to, wide controls, {NN: portrait control}, gaze [(u, point or pose target)])
    "entry": ("outside", "arrival", [(451.5, 2.4, -215.3), (455.0, 2.8, -216.2), (455.2, 2.8, -219.6)],
              {3: (455.0, 3.2, -220.4)}, [(0.0, (458.0, 1.4, -215.2)), (0.55, (460.5, 0.9, -217.5)), (1.0, "arrival")]),
    "arrival_s4": ("arrival", "s4", [(455.0, 2.8, -210.0), (468.0, 2.6, -210.0)], {1: (455.2, 3.0, -210.4)},
                   [(0.0, "arrival"), (0.3, "s4_rear"), (0.7, (461.2, 0.8, -213.6)), (1.0, "s4")]),
    "s4_s4bay": ("s4", "s4_bay", [(467.8, 2.4, -212.6)], {}, []),
    "s4bay_s6rear": ("s4_bay", "s6_rear", [(470.0, 3.0, -215.9), (470.0, 2.8, -226.8), (456.0, 2.0, -226.8)],
                     {3: (456.0, 2.3, -227.2)}, [(0.0, "s4_bay"), (0.3, (470.0, 1.6, -221.0)), (0.62, (466.0, 1.0, -226.0)), (1.0, "s6_rear")]),
    "s6rear_s6": ("s6_rear", "s6", [(456.0, 2.0, -226.8), (468.0, 2.0, -226.8)], {1: (456.0, 2.3, -227.2)},
                  [(0.0, "s6_rear"), (0.45, (461.6, 0.8, -223.4)), (1.0, "s6")]),
    "s6_stance": ("s6", "s6_stance", [], {}, []),
    "stance_s6bay": ("s6_stance", "s6_bay", [(466.4, 1.8, -224.8)], {}, [(0.0, "s6_stance"), (1.0, "s6_bay")]),
    # (A phone swings up to the Smasher print, six metres off it, holds on
    # it, and pulls back down the aisle to the whole wall.)
    "s6bay_shop": ("s6_bay", "shop", [(467.3, 3.0, -221.0), (467.4, 2.6, -218.0), (467.5, 2.55, -215.0)],
                   {1: (468.8, 3.1, -220.3), 2: (470.9, 2.6, -216.9), 3: (470.4, 2.3, -215.2)},
                   [(0.0, "s6_bay"), (0.35, (475.0, 1.3, -220.4), (0.3, SMASHER_AT)), (0.65, (474.6, 2.7, -218.2), (0.62, SMASHER_AT)),
                    (0.85, (473.6, 1.3, -216.9), (0.84, (475.1, 2.0, -215.4))), (1.0, "shop")]),
    "exit": ("shop", "outside", [(466.6, 2.9, -218.4), (458.2, 3.0, -219.0), (455.0, 2.7, -216.5), (451.5, 2.4, -215.3)], {1: (465.2, 2.4, -218.6)},
             [(0.0, "shop"), (0.4, (460.0, 1.6, -218.6)), (0.8, (447.0, 2.2, -216.4)), (1.0, (440.0, 2.6, -217.0))]),
    "apron_s4rear": ("apron", "s4_rear", [(455.6, 2.2, -213.4)], {}, [(1.0, "s4_rear")]),
    "apron_s6rear": ("apron", "s6_rear", [(455.4, 2.3, -222.6)], {}, [(1.0, "s6_rear")]),
}
# The default visit over the section's scroll, p 0 to 1: the station holds,
# the routes between, and what the cars do (hood: 0 shut, 1 open; drop: 0
# normal, 1 lowered), as (p, value) keys; PLAN.md's table.
GARAGE_ROUTE = [
    # p0, p1, route id (None: a hold at `at`), at, states
    (0.0, 0.06, None, "arrival", {}),
    (0.06, 0.14, "arrival_s4", None, {}),
    (0.14, 0.23, None, "s4", {}),
    (0.23, 0.30, "s4_s4bay", None, {"s4_hood": [(0.26, 0.0), (0.30, 1.0)]}),
    (0.30, 0.42, None, "s4_bay", {}),
    (0.42, 0.49, "s4bay_s6rear", None, {"s4_hood": [(0.42, 1.0), (0.46, 0.0)]}),
    (0.49, 0.54, None, "s6_rear", {}),
    (0.54, 0.58, "s6rear_s6", None, {}),
    (0.58, 0.61, None, "s6", {}),
    (0.61, 0.635, "s6_stance", None, {}),
    (0.635, 0.655, None, "s6_stance", {}),
    (0.655, 0.685, None, "s6_stance", {"s6_drop": [(0.655, 0.0), (0.685, 1.0)]}),
    (0.685, 0.705, None, "s6_stance", {}),
    (0.705, 0.77, "stance_s6bay", None, {"s6_drop": [(0.705, 1.0), (0.73, 0.0)], "s6_hood": [(0.73, 0.0), (0.77, 1.0)]}),
    (0.77, 0.86, None, "s6_bay", {}),
    (0.86, 0.94, "s6bay_shop", None, {"s6_hood": [(0.86, 1.0), (0.90, 0.0)]}),
    (0.94, 1.0, None, "shop", {}),
]
_POSE = {g: (r[-2], r[-1]) for g, *r in GARAGE_STATIONS + [(g, None, *r) for g, *r in GARAGE_POSES]}


def garage_point(ref, portrait=False):
    """A route's end or gaze: a node, a pose's camera, a pose's target (as
    a gaze), or a point."""
    if not isinstance(ref, str):
        return ref
    if ref in GARAGE_NODES:
        return GARAGE_NODES[ref]
    return _POSE[ref][1 if portrait else 0][0]


for nid, pos in GARAGE_NODES.items():
    links = ",".join(r for r, (a, b, *_) in GARAGE_ROUTES.items() if nid in (a, b))
    empty(f"anchor_garage_node_{nid}", pos, props={"links": links})
for rid, (a, b, ctrl, portrait, gaze) in GARAGE_ROUTES.items():
    for i, c in enumerate(ctrl, 1):
        empty(f"cam_garage_path_{rid}_{i:02d}", c, props={"route": rid, "from": a, "to": b})
        if i in portrait:
            empty(f"cam_garage_path_{rid}_{i:02d}_portrait", portrait[i], props={"route": rid})
    for i, (u, g, *own) in enumerate(gaze, 1):
        wide = g if not isinstance(g, str) else _POSE[g][0][1] if g in _POSE else GARAGE_NODES[g]
        tall = g if not isinstance(g, str) else _POSE[g][1][1] if g in _POSE else GARAGE_NODES[g]
        ut, tall = own[0] if own else (u, tall)
        empty(f"cam_garage_gaze_{rid}_{i:02d}", wide, props={"u": float(u), "route": rid})
        if tall != wide or ut != u:
            empty(f"cam_garage_gaze_{rid}_{i:02d}_portrait", tall, props={"u": float(ut), "route": rid})

empty("cam_garage_edge", (441.0, 35.5, -266.0))
empty("cam_garage_street", (437.0, 4.5, -248.0))
empty("cam_garage_across", (433.0, 2.8, -222.0))
empty("cam_garage_door", (446.0, 2.3, -216.5))
empty("cam_garage_in", (451.5, 2.4, -215.3))
empty("cam_garage_swing", (460.0, 2.8, -222.0))
empty("cam_contact_via", (441.0, 9.0, -213.0))


def real_camera(name, aspect, pos, tgt, fov=30.0, w=1600, shift=0.0):
    data = bpy.data.cameras.new(PREFIX + name)
    cam = bpy.data.objects.new(name, data)
    link(cam, preview_coll)
    cam.location = P(*pos)
    cam.rotation_euler = (Vector(P(*tgt)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    data.sensor_fit = "VERTICAL"
    data.sensor_height = 24
    data.lens = 24 / (2 * math.tan(math.radians(fov / 2)))
    data.clip_end = 3000
    # The site's lens shift (a fraction of the frame's height, up), in
    # Blender's units: a fraction of the frame's longer side.
    data.shift_y = shift * min(1.0, 1.0 / aspect)
    cam["aspect"] = aspect
    cam["width"] = w
    cam["height"] = round(w / aspect)
    return cam


real_camera("Cam_Hero_Wide", 1.6, *SHOT_CAMERAS["hero"], fov=50, w=1600, shift=-0.06)
real_camera("Cam_Hero_Portrait", 390 / 844, (0.6, 0.75, 30.0), (0.6, 0.75, -60.0), fov=62, w=780, shift=-0.085)
for shot in ("projects", "experience", "about", "stack", "garage", "contact"):
    pos, tgt = SHOT_CAMERAS[shot]
    real_camera(f"cam_view_{shot}", 1.6, pos, tgt, fov={"garage": 58, "projects": 38, "experience": 40, "contact": 42}.get(shot, 42))
# Blender's own view of every garage station and pose, wide and portrait.
for gid, *rest in GARAGE_STATIONS + [(g, None, *r) for g, *r in GARAGE_POSES]:
    (wpos, wtgt, wfov), (ppos, ptgt, pfov) = rest[-2], rest[-1]
    real_camera(f"cam_view_garage_{gid}", 1440 / 900, wpos, wtgt, fov=wfov, w=1440)
    real_camera(f"cam_view_garage_{gid}_portrait", 390 / 844, ppos, ptgt, fov=pfov, w=780)
scene.camera = bpy.data.objects["Cam_Hero_Wide"]
