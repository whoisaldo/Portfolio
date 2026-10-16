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
    "garage": ((454.0, 2.7, -222.8), (462.0, 0.4, -218.5)),
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
    ("arrival", 0.0, ((454.0, 2.7, -222.8), (462.0, 0.4, -218.5), 58), ((454.0, 3.6, -228.6), (461.5, 0.8, -220.0), 84)),
    ("s4", 0.2, ((468.5, 1.8, -210.8), (462.8, 0.85, -215.0), 48), ((469.4, 2.3, -211.3), (462.5, 0.85, -215.0), 60)),
    ("s4_bay", 0.4, ((466.4, 3.15, -215.9), (463.3, 1.05, -215.0), 44), ((466.9, 3.45, -215.6), (463.25, 1.05, -215.0), 58)),
    ("s6", 0.6, ((467.8, 1.55, -225.6), (462.5, 0.8, -222.0), 48), ((470.0, 2.1, -226.0), (462.5, 0.8, -222.0), 60)),
    ("s6_bay", 0.8, ((466.7, 3.45, -222.8), (463.3, 1.05, -222.0), 44), ((467.2, 3.65, -222.5), (463.3, 1.05, -222.0), 58)),
    ("shop", 1.0, ((468.5, 2.2, -214.5), (475.1, 2.2, -215.0), 58), ((469.0, 2.5, -220.5), (475.1, 2.6, -220.5), 64)),
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

# The path graph: nodes the camera may pass (wide and portrait where they
# differ), and the edges of the visit between them, each a polyline of
# controls for the page's centripetal Catmull-Rom with the points it looks
# at on the way (gaze, in order). The default visit is GARAGE_ROUTE: the
# scroll's p from 0 to 1, the station holds, the flights between, and what
# the cars do over them (hood: 0 shut, 1 open; drop: 0 normal, 1 lowered).
GARAGE_NODES = {
    "street_door": (446.0, 2.3, -216.5),
    "door_in": (451.5, 2.4, -215.3),
    "apron_in": (455.0, 2.8, -216.2),
    "apron_s": (455.0, 2.8, -210.0),
    "s4_flank": (468.0, 2.6, -210.0),
    "aisle_s": (470.0, 3.0, -215.9),
    "aisle_n": (470.0, 2.8, -226.8),
    "north_w": (456.0, 2.0, -226.8),
    "north_e": (468.0, 2.0, -226.8),
    "s6_aisle": (469.0, 3.0, -222.8),
    "shop_s": (469.0, 2.5, -214.5),
    "aisle_mid": (470.0, 2.6, -218.5),
    "gap_w": (458.2, 3.0, -219.0),
    "apron_out": (455.0, 2.7, -216.5),
}
GARAGE_NODES_PORTRAIT = {
    "apron_in": (455.0, 3.2, -216.2),
    "apron_s": (455.2, 3.0, -210.4),
    "north_w": (456.0, 2.3, -227.2),
}
GARAGE_ROUTE = [
    # p0, p1, from, to, via (node ids), gaze (points or pose ids), what moves
    (0.0, 0.06, "arrival", "arrival", [], [], {}),
    (0.06, 0.14, "arrival", "s4", ["apron_s", "s4_flank"], ["s4_rear_target", (460.2, 0.8, -213.6), "s4_target"], {}),
    (0.14, 0.23, "s4", "s4", [], [], {}),
    (0.23, 0.30, "s4", "s4_bay", [], ["s4_target", "s4_bay_target"], {"s4_hood": [(0.26, 0.0), (0.30, 1.0)]}),
    (0.30, 0.42, "s4_bay", "s4_bay", [], [], {"s4_hood": [(0.30, 1.0)]}),
    (0.42, 0.49, "s4_bay", "s6_rear", ["aisle_s", "aisle_n", "north_w"],
     [(470.0, 1.6, -221.0), (466.0, 1.0, -226.0), "s6_rear_target"], {"s4_hood": [(0.42, 1.0), (0.46, 0.0)]}),
    (0.49, 0.54, "s6_rear", "s6_rear", [], [], {}),
    (0.54, 0.58, "s6_rear", "s6", ["north_w", "north_e"], ["s6_rear_target", (461.6, 0.8, -223.4), "s6_target"], {}),
    (0.58, 0.61, "s6", "s6", [], [], {}),
    (0.61, 0.635, "s6", "s6_stance", [], ["s6_target", "s6_stance_target"], {}),
    (0.635, 0.655, "s6_stance", "s6_stance", [], [], {"s6_drop": [(0.635, 0.0)]}),
    (0.655, 0.685, "s6_stance", "s6_stance", [], [], {"s6_drop": [(0.655, 0.0), (0.685, 1.0)]}),
    (0.685, 0.705, "s6_stance", "s6_stance", [], [], {"s6_drop": [(0.685, 1.0)]}),
    (0.705, 0.77, "s6_stance", "s6_bay", [], ["s6_stance_target", "s6_bay_target"],
     {"s6_drop": [(0.705, 1.0), (0.73, 0.0)], "s6_hood": [(0.73, 0.0), (0.77, 1.0)]}),
    (0.77, 0.86, "s6_bay", "s6_bay", [], [], {"s6_hood": [(0.77, 1.0)]}),
    (0.86, 0.94, "s6_bay", "shop", ["s6_aisle", "shop_s"], ["s6_bay_target", (473.5, 1.2, -219.0), "shop_target"],
     {"s6_hood": [(0.86, 1.0), (0.90, 0.0)]}),
    (0.94, 1.0, "shop", "shop", [], [], {}),
]
# The ways in and out, the outdoor flight's ends at street_door: in from
# Stack (the existing street anchors, then the door, behind the cars along
# the apron), and out from the shop wall to Contact (the aisle, the gap
# between the bays, the door). And the graph's other edges, which a part or
# a station asked for out of order takes: none crosses a car.
GARAGE_ENTRY = ["cam_garage_edge", "cam_garage_street", "cam_garage_across", "street_door", "door_in", "apron_in", "arrival"]
GARAGE_EXIT = ["shop", "aisle_mid", "gap_w", "apron_out", "door_in", "street_door", "cam_contact_via", "cam_contact"]
GARAGE_EDGES = [
    ("arrival", "apron_in", []), ("apron_in", "door_in", []), ("door_in", "street_door", []),
    ("arrival", "s4", ["apron_s", "s4_flank"]), ("apron_s", "s4_rear", []), ("s4", "s4_bay", []),
    ("s4_bay", "aisle_s", []), ("aisle_s", "aisle_mid", []), ("aisle_mid", "aisle_n", []),
    ("aisle_n", "north_e", []), ("north_e", "north_w", []), ("north_w", "s6_rear", []), ("north_w", "arrival", []),
    ("north_e", "s6", []), ("s6", "s6_stance", []), ("s6_stance", "s6_bay", []), ("s6_bay", "s6_aisle", []),
    ("s6_aisle", "aisle_mid", []), ("s6_aisle", "shop_s", []), ("shop_s", "shop", []), ("s4", "shop_s", []),
    ("shop", "aisle_mid", []), ("aisle_mid", "gap_w", []), ("gap_w", "apron_out", []), ("apron_out", "door_in", []),
    ("apron_out", "arrival", []),
]
for nid, pos in GARAGE_NODES.items():
    empty(f"path_garage_{nid}", pos)
    if nid in GARAGE_NODES_PORTRAIT:
        empty(f"path_garage_{nid}_portrait", GARAGE_NODES_PORTRAIT[nid])

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
