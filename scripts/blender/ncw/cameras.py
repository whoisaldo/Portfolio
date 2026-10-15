from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw.districts.garage import BAY

# ---------------------------------------------------------------------------
# Cameras, as empties the site reads, plus two real cameras on the hero's
# anchors (16:10 and a phone) for Blender's own view of it.
# ---------------------------------------------------------------------------


GARAGE_FRONT = ((3.6, 1.75, 5.8), (0.0, 1.4, -1.0))


def bay_point(local):
    # The bay faces +x: car-space (x, y, z) -> world (bx + z, y, bz - x).
    x, y, z = local
    return (BAY[0] + z, y, BAY[2] - x)


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
    "garage": (bay_point(GARAGE_FRONT[0]), bay_point(GARAGE_FRONT[1])),
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
# (clear of both its edges), and round the car at six metres off its rear
# quarter on the driver's side (world -z here), so the camera orbits it to
# the front rather than brushing its flank; then back round the same way,
# out of the door and up over the garage's parapet for Contact.
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
    real_camera(f"cam_view_{shot}", 1.6, pos, tgt, fov={"garage": 48, "projects": 38, "experience": 40, "contact": 42}.get(shot, 42))
scene.camera = bpy.data.objects["Cam_Hero_Wide"]
