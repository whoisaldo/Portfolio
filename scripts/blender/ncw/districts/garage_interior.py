from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw import props as NP
from ncw.districts.garage import GX0, GX1, GZ0, GZ1, GH, DOOR_Z0, DOOR_Z1, DOOR_H, BAY, OFFICE_WIN, SCREEN_FOOT, SCREEN_Z
# The garage's prop kit (ncw/garage, its own builder's): importing it
# registers its prototypes, which this layout places and nothing redraws.
from ncw.garage import shop as GS, bench as GB, lounge as GL  # noqa: F401
from ncw.garage.shapes import frame_of, place_in

# ---------------------------------------------------------------------------
# THE GARAGE, INSIDE. The workshop the page's Garage section flies into: two
# bays with Ali's two cars in them (they come from their own loaders and are
# never part of this), a rear apron behind them by the door, an aisle in
# front of their noses, the shop wall across the back with the bench and
# the photo boards, and an office on a mezzanine in the south-west corner
# over a parts room, its window on the street. A steel roof on trusses, a
# duct along the north wall, cable trays, and the task lights hung over each
# car. Every prop is a prototype from the kit (ncw/garage) placed here; the
# architecture, the boards and the marks on the floor are drawn here.
#
# It streams in a pack of its own (finish.py, "garage"), after the hero is
# up, and only the street's shell (districts/garage.py) is in the core. Its
# batches are keyed by a visibility sector, not by the district, so the site
# can cull the room by what each camera sees through the door and the
# office's window (design/night-city-world/garage-layout.json):
#
#   garage_apron      behind the cars, from the door to their rears
#   garage_s4         bay 01 and the south of the aisle
#   garage_s6         bay 02 and the north of the aisle
#   garage_shop       the shop wall and the bench in front of it
#   garage_mezzanine  the office, the parts room under it, its stair
#
# The page's cameras for it, the paths between them and what they look at
# on the way are in ncw/cameras.py and LAYOUT below; GARAGE (exports.py)
# writes them out with the room's lights, boards, portals and collision.
# ---------------------------------------------------------------------------
X0, X1, Z0, Z1 = GX0 + 0.5, GX1 - 0.5, GZ0 + 0.5, GZ1 - 0.5
CEIL = GH - 0.3
S6_BAY = (462.0, 0.0, -222.0)
APRON, S4, S6, SHOP, MEZ = "garage_apron", "garage_s4", "garage_s6", "garage_shop", "garage_mezzanine"
SECTORS = (APRON, S4, S6, SHOP, MEZ)
# The mezzanine: its office over a parts room, a landing in front of the
# office's door, the stair up the south wall to it.
MZ_X1, MZ_Z0, MZ_Y = 458.2, -207.5, 3.2
OFFICE_X1 = 457.2
STAIR_X0, STAIR_X1, STAIR_Z0 = MZ_X1, 462.8, -201.55
SPLIT_X = (458.6, 463.2, 472.5)
SPLIT_Z = (-218.5, -207.6, -201.7)


def sector(x, z):
    """Which visibility sector a point of the room (x, z) is in."""
    if x < 458.6 and z > -207.6:
        return MEZ
    if x < 463.2 and z > -201.7:
        return MEZ
    if x < 458.6:
        return APRON
    if x >= 472.5:
        return SHOP
    return S4 if z >= -218.5 else S6


# What each sector covers, for the site (first match wins, as sector()).
SECTOR_BOXES = [
    {"sector": MEZ, "min": [X0, 0.0, -207.6], "max": [458.6, CEIL, Z1]},
    {"sector": MEZ, "min": [458.6, 0.0, -201.7], "max": [463.2, CEIL, Z1]},
    {"sector": APRON, "min": [GX0, 0.0, Z0], "max": [458.6, CEIL, -207.6]},
    {"sector": SHOP, "min": [472.5, 0.0, Z0], "max": [X1, CEIL, Z1]},
    {"sector": S4, "min": [458.6, 0.0, -218.5], "max": [472.5, CEIL, Z1]},
    {"sector": S6, "min": [458.6, 0.0, Z0], "max": [472.5, CEIL, -218.5]},
]


def key(x, z, mat, detail=0):
    return (sector(x, z), mat, detail)


def sbox(mat, x0, x1, y0, y1, z0, z1, scale=1.0, col=(1, 1, 1, 1), detail=0, bottom=False):
    """A box, cut where it crosses from one sector into another so each
    piece is drawn (and culled) with the sector it stands in."""
    xs = [x0] + [v for v in SPLIT_X if x0 < v < x1] + [x1]
    zs = [z0] + [v for v in SPLIT_Z if z0 < v < z1] + [z1]
    for xa, xb in zip(xs, xs[1:]):
        for za, zb in zip(zs, zs[1:]):
            box(key((xa + xb) / 2, (za + zb) / 2, mat, detail), xa, xb, y0, y1, za, zb, scale=scale, col=col, bottom=bottom)


# ---------------------------------------------------------------------------
# Materials. The workshop's own surfaces have maps of their own, which ride
# in its pack (scripts/optimize-world.mjs keeps them there, and only there);
# the rest is the city's kit. design/night-city-world/garage-materials.json
# records each one's slots, UVs and colour spaces for the site.
#
#   garage_workshop_wall    painted block over a tiled dado, one atlas
#   garage_workshop_floor   sealed graphite concrete, satin: colour,
#                           roughness and a normal map
#   garage_threshold_wet    the first two metres in from the door, where the
#                           street's rain is walked in (the site lights it
#                           with the wet floor's traces, not a mirror)
#   garage_shop_photos      the boards' photographs, one atlas the optimizer
#                           packs from the Garage section's own pictures
# ---------------------------------------------------------------------------
MAPS = {
    "wall": TEX / "garage-workshop-wall-v1.jpg",
    "floor": TEX / "garage-workshop-floor-v1.jpg",
    "floor_mr": TEX / "garage-workshop-floor-mr-v1.jpg",
    "floor_n": TEX / "garage-workshop-floor-normal-v1.jpg",
}
# Metres each map covers: the wall's atlas WALL_U along a wall and two bands
# of WALL_V (the dado below, a strip of block above), the floor's FLOOR_M
# square.
WALL_U, WALL_V, FLOOR_M = 2.8, 1.4, 5.0


def _pixels(path):
    import numpy as np
    img = bpy.data.images.load(str(path), check_existing=False)
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)[:, :, :3]


def _save(path, rgb):
    import numpy as np
    h, w, _ = rgb.shape
    img = bpy.data.images.new(PREFIX + "gen_" + path.stem, w, h)
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.ones((h, w, 1), np.float32)], axis=2)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    img.filepath_raw = str(path)
    img.file_format = "JPEG"
    scene.render.image_settings.quality = 92
    img.save(filepath=str(path), quality=92)
    bpy.data.images.remove(img)


def _blobs(n, size, rng, r0, r1, depth0, depth1):
    """A tileable field of soft round marks: n of them, radius r0..r1 px."""
    import numpy as np
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    f = np.zeros((size, size), np.float32)
    for _ in range(n):
        cx, cy = rng.uniform(0, size), rng.uniform(0, size)
        r = rng.uniform(r0, r1)
        dx = np.minimum(abs(xx - cx), size - abs(xx - cx))
        dy = np.minimum(abs(yy - cy), size - abs(yy - cy))
        f = np.maximum(f, rng.uniform(depth0, depth1) * np.exp(-(dx * dx + dy * dy) / (2 * r * r)))
    return f


def make_maps():
    """The workshop's maps, drawn once from the kit's own CC0 concrete
    (ambientCG Concrete023) and kept beside the city's other sources: the
    generator's version is in each file's name, so a change here writes new
    files rather than quietly replacing the old."""
    import numpy as np
    if all(p.exists() for p in MAPS.values()):
        return
    rng = np.random.default_rng(1215)
    S = 1024
    cc = _pixels(GARAGE_TEX / "Concrete023_1K-JPG_Color.jpg")
    cr = _pixels(GARAGE_TEX / "Concrete023_1K-JPG_Roughness.jpg")[:, :, 0]
    cn = _pixels(GARAGE_TEX / "Concrete023_1K-JPG_NormalGL.jpg")
    lum = cc @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    grain = (lum - lum.mean()) / (lum.std() + 1e-6)

    # The floor: sealed graphite concrete, a saw-cut joint every 2.5 m (the
    # map's edge and its middle), broad patches where it has been mopped and
    # where it has not, and the drips and smears of oil a working bay keeps
    # (the big stains are props of their own, placed where the cars stand).
    patches = _blobs(26, S, rng, 60, 180, 0.04, 0.12)
    oil = _blobs(70, S, rng, 3, 16, 0.25, 0.6)
    v = 0.255 + 0.03 * grain - patches - 0.12 * oil
    joint = np.zeros((S, S), np.float32)
    for c in (0, S // 2):
        for d in range(-2, 3):
            joint[:, (c + d) % S] = np.maximum(joint[:, (c + d) % S], 1.0 - abs(d) / 2.5)
            joint[(c + d) % S, :] = np.maximum(joint[(c + d) % S, :], 1.0 - abs(d) / 2.5)
    v = v * (1.0 - 0.55 * joint)
    floor = np.stack([v * 1.0, v * 0.985, v * 0.96], axis=2)
    rough = np.clip(0.44 + 0.22 * (cr - cr.mean()) - 0.25 * oil + 0.2 * patches, 0.24, 0.68)
    mr = np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], axis=2)
    n = cn * 2.0 - 1.0
    n = n * np.array([0.35, 0.35, 1.0], np.float32)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    nrm = n * 0.5 + 0.5

    # The wall: the dado's glazed tiles below (v 0 to 0.5: 16 across and 8 up
    # a band, 175 mm square, a dark course at its top, dirtier toward the
    # floor) and painted block above (v 0.5 to 1: 400 by 200 mm in stretcher
    # bond, the paint over the block's own pitting).
    wall = np.zeros((S, S, 3), np.float32)
    H = S // 2
    yy, xx = np.mgrid[0:H, 0:S].astype(np.float32)
    tw = S / 16
    th = H / 8
    tile_i = (xx // tw).astype(int)
    tile_j = (yy // th).astype(int)
    tone = rng.uniform(0.93, 1.05, (8, 16)).astype(np.float32)[tile_j, tile_i]
    gx = np.minimum(xx % tw, tw - xx % tw)
    gy = np.minimum(yy % th, th - yy % th)
    grout = np.clip(2.2 - np.minimum(gx, gy), 0, 1)
    edge = np.clip(4.0 - np.minimum(gx, gy), 0, 1) * (1 - grout)
    tile = np.array([0.66, 0.67, 0.66], np.float32) * tone[..., None] * (1 + 0.06 * edge[..., None])
    course = (tile_j == 7)[..., None]
    tile = np.where(course, np.array([0.13, 0.14, 0.15], np.float32) * tone[..., None], tile)
    tile = tile * (1 - grout[..., None]) + np.array([0.27, 0.26, 0.24], np.float32) * grout[..., None]
    dirt = np.clip(1.0 - yy / (H * 0.45), 0, 1) ** 1.6
    splash = _blobs(40, S, rng, 2, 9, 0.15, 0.45)[:H]
    tile = tile * (1 - 0.42 * dirt[..., None]) * (1 - splash[..., None] * dirt[..., None])
    tile = tile * (1 + 0.04 * grain[:H, :, None])
    wall[:H] = tile
    yy2, xx2 = np.mgrid[0:H, 0:S].astype(np.float32)
    row = np.floor(yy2 * 7 / H).astype(int)
    shift = (row % 2) * (S / 14)
    bx = (xx2 + shift) % (S / 7)
    by = (yy2 * 7 / H) % 1.0 * (H / 7)
    mort = np.clip(2.6 - np.minimum(np.minimum(bx, S / 7 - bx), np.minimum(by, H / 7 - by)), 0, 1)
    block_tone = rng.uniform(0.95, 1.04, (7, 8)).astype(np.float32)[row, ((xx2 + shift) // (S / 7)).astype(int) % 8]
    paint = np.array([0.47, 0.47, 0.455], np.float32) * block_tone[..., None]
    paint = paint * (1 + 0.07 * grain[H:, :, None])
    streak = _blobs(30, S, rng, 4, 14, 0.03, 0.09)[H:]
    paint = paint * (1 - streak[..., None]) * (1 - 0.35 * mort[..., None])
    wall[H:] = paint
    _save(MAPS["wall"], wall)
    _save(MAPS["floor"], floor)
    _save(MAPS["floor_mr"], mr)
    _save(MAPS["floor_n"], nrm)


make_maps()


def mapped(name, base, mr=None, normal=None, rough=0.8, emit=0.0):
    mat = material(name, "ffffff", rough=rough)
    nt = mat.node_tree
    bsdf = principled(mat)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image(base)
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    if emit:
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emit
    if mr is not None:
        # glTF's metallic-roughness map: roughness in green, metal in blue.
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = image(mr, True)
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(t.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
        nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    if normal is not None:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = image(normal, True)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(t.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


mapped("garage_workshop_wall", MAPS["wall"], rough=0.82)
mapped("garage_workshop_floor", MAPS["floor"], mr=MAPS["floor_mr"], normal=MAPS["floor_n"], rough=0.45)
material("garage_threshold_wet", "1a1b1e", rough=0.12)
# The photo atlas is drawn by the optimizer (from src/assets/photos, the
# pictures the Garage section already shows); the build only needs where
# each lands on it, PHOTO_TILES, and a stand-in for Blender's own preview.
material("garage_shop_photos", "c8c4ba", rough=0.6, emit=0.35)

# ---------------------------------------------------------------------------
# The floor: the satin concrete everywhere a car or a walker goes, the wet
# threshold in from the door, the S6's service pad, and the bays' marks.
# The parts room under the mezzanine is shut and has no floor of its own.
# ---------------------------------------------------------------------------
FLOOR_Y, WET_Y, MARK_Y = 0.012, 0.014, 0.017
THRESHOLD_X = GX0 + 2.5


def floor_rect(mat, x0, x1, z0, z1, y, scale):
    xs = [x0] + [v for v in SPLIT_X if x0 < v < x1] + [x1]
    zs = [z0] + [v for v in SPLIT_Z if z0 < v < z1] + [z1]
    for xa, xb in zip(xs, xs[1:]):
        for za, zb in zip(zs, zs[1:]):
            ground(key((xa + xb) / 2, (za + zb) / 2, mat), xa, xb, za, zb, y=y, scale=scale)


# In from the door: the wet strip across the opening, the floor round it.
floor_rect("garage_threshold_wet", GX0, THRESHOLD_X, DOOR_Z0, DOOR_Z1, WET_Y, FLOOR_M)
for (x0, x1, z0, z1) in ((X0, THRESHOLD_X, Z0, DOOR_Z0), (X0, THRESHOLD_X, DOOR_Z1, MZ_Z0),
                         (THRESHOLD_X, MZ_X1, Z0, MZ_Z0),
                         (MZ_X1, X1, Z0, Z1)):
    if x1 > x0 and z1 > z0:
        floor_rect("garage_workshop_floor", x0, x1, z0, z1, FLOOR_Y, FLOOR_M)
# Bay 01's box painted round the S4 (the lift stands in it), bay 02's a
# steel service pad under the S6, flush, its edge angle round it; down the
# S6's north side a white stripe a hand's width off its tyres and a tick
# across it at the front axle: what the stance view reads its drop against.
for (a0, a1, b0, b1) in ((458.9, 465.1, -216.95, -216.8), (458.9, 465.1, -213.2, -213.05),
                         (458.9, 459.05, -216.95, -213.05), (464.95, 465.1, -216.95, -213.05)):
    box(key((a0 + a1) / 2, (b0 + b1) / 2, "hazard"), a0, a1, FLOOR_Y, MARK_Y, b0, b1, scale=1.0)
PAD = (459.1, 465.0, -223.05, -220.95)
box(key(462.0, -222.0, "dark"), PAD[0], PAD[1], FLOOR_Y, FLOOR_Y + 0.004, PAD[2], PAD[3], scale=1.0)
for (a0, a1, b0, b1) in ((PAD[0], PAD[1], PAD[2] - 0.06, PAD[2]), (PAD[0], PAD[1], PAD[3], PAD[3] + 0.06),
                         (PAD[0] - 0.06, PAD[0], PAD[2] - 0.06, PAD[3] + 0.06), (PAD[1], PAD[1] + 0.06, PAD[2] - 0.06, PAD[3] + 0.06)):
    box(key((a0 + a1) / 2, (b0 + b1) / 2, "metal"), a0, a1, FLOOR_Y, FLOOR_Y + 0.006, b0, b1, scale=1.0)
STANCE_STRIPE_Z = -223.34
WHITE_LINE = (0.62, 0.62, 0.6, 1)
box(key(462.5, STANCE_STRIPE_Z, "trim"), 459.4, 466.2, FLOOR_Y, MARK_Y, STANCE_STRIPE_Z - 0.04, STANCE_STRIPE_Z + 0.04, scale=1.0, col=WHITE_LINE)
S6_FRONT_AXLE_X = S6_BAY[0] + 1.456
box(key(S6_FRONT_AXLE_X, STANCE_STRIPE_Z, "trim"), S6_FRONT_AXLE_X - 0.02, S6_FRONT_AXLE_X + 0.02, FLOOR_Y, MARK_Y,
    STANCE_STRIPE_Z - 0.3, STANCE_STRIPE_Z + 0.04, scale=1.0, col=WHITE_LINE)
# The apron's walk line from the door to the shop wall, along the south of
# the second bay's door: yellow, as the bay's box is.
for (a0, a1) in ((454.6, 458.4),):
    box(key((a0 + a1) / 2, -219.6, "hazard"), a0, a1, FLOOR_Y, MARK_Y, -219.68, -219.6, scale=1.0)

# ---------------------------------------------------------------------------
# The walls inside, a couple of centimetres proud of the shell's own: the
# tiled dado up to 1.4 m, painted block above in strips the atlas's height
# (so its block coursing runs unbroken up the wall), cut round the openings.
# `along` runs the wall's length, `face` is its plane (x or z), `normal`
# which way it looks; `y0` is the floor it stands on (the office's is the
# mezzanine's).
# ---------------------------------------------------------------------------
PROUD = 0.02


def wall(axis, face, normal, a0, a1, y0, y1, holes=(), floor=0.0):
    us = sorted({a0, a1, *[v for h in holes for v in h[:2] if a0 < v < a1]})
    ys = {y0, y1}
    y = floor + WALL_V
    while y < y1:
        if y > y0:
            ys.add(y)
        y += WALL_V
    ys |= {v for h in holes for v in h[2:] if y0 < v < y1}
    ys = sorted(ys)
    p = face + normal * PROUD
    for ua, ub in zip(us, us[1:]):
        for ya, yb in zip(ys, ys[1:]):
            um, ym = (ua + ub) / 2, (ya + yb) / 2
            if any(h[0] <= um <= h[1] and h[2] <= ym <= h[3] for h in holes):
                continue
            band = int((ym - floor) // WALL_V)
            base = floor + band * WALL_V

            def v(yv):
                t = (yv - base) / WALL_V
                return 0.5 * t if band == 0 else 0.5 + 0.5 * t
            if axis == "x":
                # A wall along x at z = face.
                pts = [(ua, ya, p), (ub, ya, p), (ub, yb, p), (ua, yb, p)]
                uvs = [(ua / WALL_U, v(ya)), (ub / WALL_U, v(ya)), (ub / WALL_U, v(yb)), (ua / WALL_U, v(yb))]
                k = key(um, face + normal * 0.5, "garage_workshop_wall")
            else:
                pts = [(p, ya, ua), (p, ya, ub), (p, yb, ub), (p, yb, ua)]
                uvs = [(-ua / WALL_U, v(ya)), (-ub / WALL_U, v(ya)), (-ub / WALL_U, v(yb)), (-ua / WALL_U, v(yb))]
                k = key(face + normal * 0.5, um, "garage_workshop_wall")
            # Wound to face `normal`.
            flip = (normal < 0) if axis == "x" else (normal > 0)
            if flip:
                pts, uvs = pts[::-1], uvs[::-1]
            quad(k, *pts, uvs=tuple(uvs))


# The front wall (the door's), from inside: the door, the office's window,
# the parts room behind the mezzanine's shut underside.
BAY2_DOOR = (-228.6, -222.6)
wall("z", X0, 1, Z0, MZ_Z0, 0.0, CEIL, holes=[(DOOR_Z0, DOOR_Z1, 0.0, DOOR_H), (BAY2_DOOR[0], BAY2_DOOR[1], 0.0, DOOR_H)])
wall("z", X0, 1, MZ_Z0, Z1, MZ_Y, CEIL, holes=[(OFFICE_WIN[0], OFFICE_WIN[1], OFFICE_WIN[2], OFFICE_WIN[3])], floor=MZ_Y)
# The shop wall, the north (S6) wall and the south (S4) wall.
wall("z", X1, -1, Z0, Z1, 0.0, CEIL)
wall("x", Z0, 1, X0, X1, 0.0, CEIL)
wall("x", Z1, -1, MZ_X1, X1, 0.0, CEIL)
wall("x", Z1, -1, X0, MZ_X1, MZ_Y, CEIL, floor=MZ_Y)
# The door's reveal and head inside, in the shell's concrete, and the
# shutter's guides down each jamb.
for z0, z1 in ((DOOR_Z0 - 0.09, DOOR_Z0), (DOOR_Z1, DOOR_Z1 + 0.09)):
    sbox("metal", X0 - 0.02, X0 + 0.06, 0.0, DOOR_H, z0, z1)
sbox("hazard", X0 - 0.01, X0 + 0.04, DOOR_H - 0.12, DOOR_H, DOOR_Z0 - 0.09, DOOR_Z1 + 0.09)

# ---------------------------------------------------------------------------
# The roof: a corrugated steel deck on purlins, carried by nine trusses
# across the room's width. Their spacing puts one over each car's middle
# and one over each bay's outer flank, which the task lights hang from.
# ---------------------------------------------------------------------------
TRUSS_Z = (-228.0, -225.0, -222.0, -218.5, -215.0, -212.0, -208.5, -205.0, -201.8)
CHORD_LO, CHORD_HI = 6.25, 7.42
STEEL_DARK = (0.03, 0.032, 0.036, 1)
STEEL_GREY = (0.16, 0.165, 0.17, 1)
for (xa, xb) in ((X0, 458.6), (458.6, 463.2), (463.2, 472.5), (472.5, X1)):
    for (za, zb) in ((Z0, -218.5), (-218.5, -207.6), (-207.6, -201.7), (-201.7, Z1)):
        quad(key((xa + xb) / 2, (za + zb) / 2, "corrugated"), (xa, CEIL - 0.02, za), (xb, CEIL - 0.02, za),
             (xb, CEIL - 0.02, zb), (xa, CEIL - 0.02, zb), col=STEEL_GREY)
for zt in TRUSS_Z:
    sbox("steel", X0, X1, CHORD_LO, CHORD_LO + 0.18, zt - 0.12, zt + 0.12, col=STEEL_DARK, bottom=True)
    sbox("steel", X0, X1, CHORD_HI, CHORD_HI + 0.18, zt - 0.1, zt + 0.1, col=STEEL_DARK, bottom=True)
    n = 10
    for i in range(n + 1):
        x = X0 + (X1 - X0) * i / n
        sbox("steel", x - 0.05, x + 0.05, CHORD_LO + 0.18, CHORD_HI, zt - 0.05, zt + 0.05, col=STEEL_DARK)
        if i < n:
            x2 = X0 + (X1 - X0) * (i + 1) / n
            a, b = ((x, CHORD_LO + 0.18, zt), (x2, CHORD_HI, zt)) if i % 2 == 0 else ((x, CHORD_HI, zt), (x2, CHORD_LO + 0.18, zt))
            pipe(key((x + x2) / 2, zt, "steel"), a, b, 0.04, segs=6, col=STEEL_DARK)
    # The bearing plates where each end sits on the wall.
    for x0, x1 in ((X0, X0 + 0.3), (X1 - 0.3, X1)):
        sbox("steel", x0, x1, CHORD_LO - 0.35, CHORD_LO, zt - 0.15, zt + 0.15, col=STEEL_DARK, detail=1)
for xp in (455.0, 460.5, 466.0, 471.5):
    sbox("steel", xp - 0.04, xp + 0.04, CHORD_HI + 0.18, CEIL - 0.02, Z0, Z1, col=STEEL_DARK)

# A spiral duct along the north wall under the deck, three diffusers off it.
DUCT_Z, DUCT_Y, DUCT_R = -228.72, 6.75, 0.3
for (xa, xb) in ((453.0, 458.6), (458.6, 472.5), (472.5, 475.0)):
    pipe(key((xa + xb) / 2, DUCT_Z, "steel"), (xa, DUCT_Y, DUCT_Z), (xb, DUCT_Y, DUCT_Z), DUCT_R, segs=14, col=(0.24, 0.245, 0.25, 1))
for xd in (456.0, 463.5, 470.0):
    sbox("steel", xd - 0.28, xd + 0.28, DUCT_Y - DUCT_R - 0.26, DUCT_Y - DUCT_R + 0.04, DUCT_Z - 0.28, DUCT_Z + 0.28, col=(0.24, 0.245, 0.25, 1))
    sbox("dark", xd - 0.24, xd + 0.24, DUCT_Y - DUCT_R - 0.262, DUCT_Y - DUCT_R - 0.25, DUCT_Z - 0.24, DUCT_Z + 0.24)
for xh in (455.0, 460.5, 466.0, 471.5):
    sbox("steel", xh - 0.02, xh + 0.02, DUCT_Y, CEIL - 0.02, DUCT_Z - 0.02, DUCT_Z + 0.02, col=STEEL_DARK, detail=1)

# ---------------------------------------------------------------------------
# The mezzanine: a steel deck on two columns over the parts room, the office
# on it (glazed to the shop and the street), a landing in front of its door
# and a stair up the south wall. Its underside is shut: block walls, the
# parts room's door and a lit window.
# ---------------------------------------------------------------------------
sbox("concrete", X0, MZ_X1, MZ_Y - 0.2, MZ_Y, MZ_Z0, Z1, scale=2.0)
sbox("steel", MZ_X1 - 0.2, MZ_X1, MZ_Y - 0.45, MZ_Y, MZ_Z0, Z1, col=STEEL_DARK, bottom=True)
sbox("steel", X0, MZ_X1, MZ_Y - 0.45, MZ_Y, MZ_Z0, MZ_Z0 + 0.2, col=STEEL_DARK, bottom=True)
for (cx, cz) in ((MZ_X1 - 0.1, MZ_Z0 + 0.1), (455.3, MZ_Z0 + 0.1)):
    sbox("steel", cx - 0.1, cx + 0.1, 0.0, MZ_Y - 0.45, cz - 0.1, cz + 0.1, col=STEEL_DARK)
# The parts room's walls, block and dado as the room's, its door (the kit's
# man door, its outside toward the shop) and a lit window.
UNDER_Y = MZ_Y - 0.45
PR_DOOR = (-205.0, -204.05)
PR_WIN = (-203.4, -201.6, 1.0, 2.2)
wall("z", MZ_X1 - 0.21, 1, MZ_Z0 + 0.2, Z1, 0.0, UNDER_Y, holes=[(PR_DOOR[0] - 0.05, PR_DOOR[1] + 0.05, 0.0, 2.2), PR_WIN])
wall("x", MZ_Z0 + 0.21, -1, X0, MZ_X1 - 0.21, 0.0, UNDER_Y)
NP.place("garage_man_door", MZ_X1 - 0.19, 0.0, sum(PR_DOOR) / 2, math.pi / 2, district=MEZ)
quad(key(457.9, -202.5, "lobby"), (MZ_X1 - 0.3, PR_WIN[2], PR_WIN[1]), (MZ_X1 - 0.3, PR_WIN[2], PR_WIN[0]),
     (MZ_X1 - 0.3, PR_WIN[3], PR_WIN[0]), (MZ_X1 - 0.3, PR_WIN[3], PR_WIN[1]))
quad(key(457.9, -202.5, "clearglass"), (MZ_X1 - 0.18, PR_WIN[2], PR_WIN[1]), (MZ_X1 - 0.18, PR_WIN[2], PR_WIN[0]),
     (MZ_X1 - 0.18, PR_WIN[3], PR_WIN[0]), (MZ_X1 - 0.18, PR_WIN[3], PR_WIN[1]), col=(0.55, 0.62, 0.66, 1))
for (y0, y1, z0, z1) in ((PR_WIN[2] - 0.05, PR_WIN[2], PR_WIN[0] - 0.05, PR_WIN[1] + 0.05),
                         (PR_WIN[3], PR_WIN[3] + 0.05, PR_WIN[0] - 0.05, PR_WIN[1] + 0.05),
                         (PR_WIN[2], PR_WIN[3], PR_WIN[0] - 0.05, PR_WIN[0]), (PR_WIN[2], PR_WIN[3], PR_WIN[1], PR_WIN[1] + 0.05)):
    sbox("metal", MZ_X1 - 0.2, MZ_X1 - 0.16, y0, y1, z0, z1)

# The office: glazed on its two open sides in a steel frame, its door onto
# the landing by the stair's head, a flat roof, fluorescents in it.
OFFICE_TOP = MZ_Y + 2.6
GLASS = (0.55, 0.62, 0.66, 1)


def glass(k, a, b, c, d):
    """A pane, seen from both sides."""
    quad(k, a, b, c, d, col=GLASS)
    quad(k, d, c, b, a, col=GLASS)


sbox("steel", X0, OFFICE_X1 + 0.06, OFFICE_TOP, OFFICE_TOP + 0.14, MZ_Z0, Z1, col=STEEL_DARK)
OFFICE_DOOR = (-202.35, -201.4)
for (z0, z1) in ((MZ_Z0 + 0.06, OFFICE_DOOR[0]), (OFFICE_DOOR[1], Z1)):
    glass(key(OFFICE_X1, (z0 + z1) / 2, "clearglass"), (OFFICE_X1, MZ_Y + 0.9, z1), (OFFICE_X1, MZ_Y + 0.9, z0),
          (OFFICE_X1, OFFICE_TOP, z0), (OFFICE_X1, OFFICE_TOP, z1))
    sbox("steel", OFFICE_X1 - 0.03, OFFICE_X1 + 0.03, MZ_Y, MZ_Y + 0.9, z0, z1, col=STEEL_GREY)
glass(key(455.0, MZ_Z0, "clearglass"), (X0, MZ_Y + 0.9, MZ_Z0), (OFFICE_X1, MZ_Y + 0.9, MZ_Z0),
      (OFFICE_X1, OFFICE_TOP, MZ_Z0), (X0, OFFICE_TOP, MZ_Z0))
sbox("steel", X0, OFFICE_X1, MZ_Y, MZ_Y + 0.9, MZ_Z0 - 0.03, MZ_Z0 + 0.03, col=STEEL_GREY)
for zm in [MZ_Z0 + 0.06 + i * (OFFICE_DOOR[0] - MZ_Z0 - 0.06) / 4 for i in range(5)] + [OFFICE_DOOR[1], Z1 - 0.03]:
    sbox("steel", OFFICE_X1 - 0.04, OFFICE_X1 + 0.04, MZ_Y, OFFICE_TOP, zm - 0.03, zm + 0.03, col=STEEL_DARK)
for xm in (X0 + 0.03, 453.98, 455.46, 456.94, OFFICE_X1):
    sbox("steel", xm - 0.03, xm + 0.03, MZ_Y, OFFICE_TOP, MZ_Z0 - 0.04, MZ_Z0 + 0.04, col=STEEL_DARK)
for y in (MZ_Y + 0.9, OFFICE_TOP - 0.04):
    sbox("steel", OFFICE_X1 - 0.04, OFFICE_X1 + 0.04, y - 0.03, y + 0.03, MZ_Z0, Z1, col=STEEL_DARK)
    sbox("steel", X0, OFFICE_X1, y - 0.03, y + 0.03, MZ_Z0 - 0.04, MZ_Z0 + 0.04, col=STEEL_DARK)
sbox("door", OFFICE_X1 - 0.025, OFFICE_X1 + 0.025, MZ_Y, MZ_Y + 2.1, OFFICE_DOOR[0], OFFICE_DOOR[1])
sbox("steel", OFFICE_X1 - 0.04, OFFICE_X1 + 0.04, MZ_Y + 2.1, MZ_Y + 2.16, OFFICE_DOOR[0], OFFICE_DOOR[1], col=STEEL_DARK)
# Inside, its floor's own finish and its ceiling.
quad(key(455.0, -204.0, "garage_workshop_floor"), (X0, MZ_Y + 0.004, Z1), (OFFICE_X1, MZ_Y + 0.004, Z1),
     (OFFICE_X1, MZ_Y + 0.004, MZ_Z0), (X0, MZ_Y + 0.004, MZ_Z0),
     uvs=tuple((x / FLOOR_M, -z / FLOOR_M) for x, z in ((X0, Z1), (OFFICE_X1, Z1), (OFFICE_X1, MZ_Z0), (X0, MZ_Z0))))
quad(key(455.0, -204.0, "trim"), (X0, OFFICE_TOP, MZ_Z0), (OFFICE_X1, OFFICE_TOP, MZ_Z0),
     (OFFICE_X1, OFFICE_TOP, Z1), (X0, OFFICE_TOP, Z1), col=(0.42, 0.42, 0.41, 1))

# The guardrail round the landing: posts, a top rail at 1.07 m, a knee rail
# and a toe board, in safety yellow.
RAIL = (0.33, 0.24, 0.02, 1)
for (a, b) in (((MZ_X1 - 0.05, MZ_Z0 + 0.05), (MZ_X1 - 0.05, STAIR_Z0 - 0.02)), ((OFFICE_X1 + 0.05, MZ_Z0 + 0.05), (MZ_X1 - 0.05, MZ_Z0 + 0.05))):
    (ax, az), (bx, bz) = a, b
    for y in (MZ_Y + 1.07, MZ_Y + 0.55):
        pipe(key((ax + bx) / 2, (az + bz) / 2, "steel"), (ax, y, az), (bx, y, bz), 0.024, segs=6, col=RAIL)
    sbox("steel", min(ax, bx) - 0.01, max(ax, bx) + 0.01, MZ_Y, MZ_Y + 0.12, min(az, bz) - 0.01, max(az, bz) + 0.01, col=RAIL)
    length = math.hypot(bx - ax, bz - az)
    for i in range(int(length / 1.2) + 2):
        t = min(1.0, i * 1.2 / length)
        px, pz = ax + (bx - ax) * t, az + (bz - az) * t
        sbox("steel", px - 0.025, px + 0.025, MZ_Y, MZ_Y + 1.07, pz - 0.025, pz + 0.025, col=RAIL)

# The stair: a straight flight up the south wall from the bay's side to the
# landing, eighteen risers of 178 mm on 270 mm treads, steel stringers, a
# handrail on its open side.
RISERS = 18
RISE = MZ_Y / RISERS
GOING = (STAIR_X1 - STAIR_X0) / (RISERS - 1)
for i in range(RISERS - 1):
    x1 = STAIR_X1 - i * GOING
    y = RISE * (i + 1)
    sbox("steel", x1 - GOING - 0.01, x1, y - 0.04, y, STAIR_Z0 + 0.05, Z1 - 0.03, col=STEEL_GREY)
for z0, z1 in ((STAIR_Z0, STAIR_Z0 + 0.05), (Z1 - 0.06, Z1 - 0.01)):
    zc = (z0 + z1) / 2
    for k_ in range(3):
        xa, xb = STAIR_X1 + 0.15 - k_ * (STAIR_X1 + 0.15 - STAIR_X0) / 3, STAIR_X1 + 0.15 - (k_ + 1) * (STAIR_X1 + 0.15 - STAIR_X0) / 3
        ya, yb = (STAIR_X1 + 0.15 - xa) / (STAIR_X1 + 0.15 - STAIR_X0) * MZ_Y, (STAIR_X1 + 0.15 - xb) / (STAIR_X1 + 0.15 - STAIR_X0) * MZ_Y
        k2 = key((xa + xb) / 2, zc, "steel")
        quad(k2, (xa, ya - 0.24, z1), (xb, yb - 0.24, z1), (xb, yb, z1), (xa, ya, z1), col=STEEL_DARK)
        quad(k2, (xb, yb - 0.24, z0), (xa, ya - 0.24, z0), (xa, ya, z0), (xb, yb, z0), col=STEEL_DARK)
        quad(k2, (xa, ya - 0.24, z0), (xb, yb - 0.24, z0), (xb, yb - 0.24, z1), (xa, ya - 0.24, z1), col=STEEL_DARK)
for i in range(4):
    t = i / 3
    px = STAIR_X1 - t * (STAIR_X1 - STAIR_X0 - 0.1)
    py = (STAIR_X1 - px) / (STAIR_X1 - STAIR_X0) * MZ_Y
    sbox("steel", px - 0.02, px + 0.02, py, py + 0.95, STAIR_Z0 + 0.005, STAIR_Z0 + 0.045, col=RAIL)
pipe(key(460.5, STAIR_Z0, "steel"), (STAIR_X1 + 0.1, 0.95, STAIR_Z0 + 0.025), (STAIR_X0, MZ_Y + 1.07, STAIR_Z0 + 0.025), 0.022, segs=6, col=RAIL)

# ---------------------------------------------------------------------------
# Light. Each car has a bank of four LED battens over its roof (two rows of
# two, 4.8 m by 0.3 m of diffuser) hung from the truss over its middle, and
# a single row over its outer flank for its wheels and its mirror; twin
# fluorescents over the apron, the aisle and the shop wall; the bench's
# amber strip, a cyan line along the north wall and a short magenta one
# along the south: the city's colours kept to edges, the cars under a
# neutral white. Every fixture is a kit prototype; LIGHTS records each one's
# actual diffusers (its luminous faces), where it aims and its colour, as
# anchor_garage_light_<id> for the site and in garage-layout.json.
# ---------------------------------------------------------------------------
LIGHTS_G = []
BATTEN_Y = CHORD_LO - GB.LED_DROP
FLUORO_Y = CHORD_LO - GB.FLUORO_DROP


def batten_bank(lid, kind, x0, zt, rows, aim, cct, sector_):
    faces = []
    for dz in rows:
        for xc in (x0 - 1.2, x0 + 1.2):
            NP.place("garage_led_batten", xc, BATTEN_Y, zt + dz, 0.0, district=sector_)
            faces.append([xc, BATTEN_Y, zt + dz, 2.36, 0.08])
    LIGHTS_G.append({"id": lid, "kind": kind, "proto": "garage_led_batten", "faces": faces, "normal": [0, -1, 0],
                     "aim": list(aim), "cct": cct, "sector": sector_})


batten_bank("s4_task", "task", 462.0, -215.0, (-0.11, 0.11), (462.6, 0.9, -215.0), 4300, S4)
batten_bank("s6_task", "task", 462.0, -222.0, (-0.11, 0.11), (462.6, 0.9, -222.0), 4300, S6)
batten_bank("s4_flank", "flank", 462.4, -212.0, (0.0,), (462.6, 0.45, -214.0), 4300, S4)
batten_bank("s6_flank", "flank", 462.4, -225.0, (0.0,), (462.6, 0.45, -223.0), 4300, S6)


def fluoro(lid, x, zt, aim, sector_, cct=4000):
    NP.place("garage_fluoro", x, FLUORO_Y, zt, 0.0, district=sector_)
    LIGHTS_G.append({"id": lid, "kind": "fluoro", "proto": "garage_fluoro", "normal": [0, -1, 0], "aim": list(aim), "cct": cct,
                     "faces": [[x, FLUORO_Y + 0.02, zt - 0.045, 1.2, 0.026], [x, FLUORO_Y + 0.02, zt + 0.045, 1.2, 0.026]],
                     "sector": sector_})


fluoro("apron_n", 455.6, -225.0, (455.6, 0.0, -225.0), APRON)
fluoro("apron_s", 455.6, -212.0, (455.6, 0.0, -212.0), APRON)
fluoro("aisle_n", 469.6, -222.0, (469.6, 0.0, -222.0), S6)
fluoro("aisle_s", 469.6, -215.0, (469.6, 0.0, -215.0), S4)
for zt, gid in ((-222.0, "shop_bmw"), (-218.5, "shop_n"), (-215.0, "shop_bench"), (-212.0, "shop_s"), (-208.5, "shop_comp")):
    fluoro(gid, 473.4, zt, (475.3, 2.2, zt), SHOP)
# The office's own, on its ceiling.
for zt in (-205.8, -202.6):
    NP.place("garage_fluoro", 454.8, OFFICE_TOP - 0.5, zt, 0.0, district=MEZ)
    LIGHTS_G.append({"id": f"office_{'n' if zt < -204 else 's'}", "kind": "fluoro", "proto": "garage_fluoro", "normal": [0, -1, 0],
                     "aim": [454.8, MZ_Y, zt], "cct": 4000, "sector": MEZ,
                     "faces": [[454.8, OFFICE_TOP - 0.48, zt, 1.2, 0.12]]})
# The colour: tubes in the room's one tube material (struck on as the old
# room's were), along the north wall, over the south wall's chests, and the
# bench's amber over the pegboard.
ACCENTS = (
    ("north_cyan", "cyan", (454.0, 474.0), 2.95, Z0, 1),
    ("south_magenta", "pink", (464.0, 470.0), 3.05, Z1, -1),
)
for aid, hue, (xa, xb), y, zf, nz in ACCENTS:
    z0, z1 = sorted((zf + nz * 0.04, zf + nz * 0.12))
    sbox("tube", xa, xb, y, y + 0.08, z0, z1, col=TUBE[hue])
    sbox("metal", xa - 0.05, xb + 0.05, y + 0.08, y + 0.11, min(zf, zf + nz * 0.14), max(zf, zf + nz * 0.14))
    LIGHTS_G.append({"id": aid, "kind": "accent", "proto": None, "faces": [[(xa + xb) / 2, y + 0.04, (z0 + z1) / 2, xb - xa, 0.08]],
                     "normal": [0, 0, nz], "aim": [(xa + xb) / 2, 0.0, zf + nz * 2.5], "hue": hue, "sector": sector((xa + xb) / 2, zf + nz)})
BENCH_Z = -215.5
sbox("tube", X1 - 0.12, X1 - 0.05, 2.36, 2.42, BENCH_Z - 1.3, BENCH_Z + 1.3, col=TUBE["amber"])
LIGHTS_G.append({"id": "bench_amber", "kind": "accent", "proto": None, "faces": [[X1 - 0.085, 2.39, BENCH_Z, 0.07, 2.6]],
                 "normal": [-1, 0, 0], "aim": [X1 - 1.0, 0.9, BENCH_Z], "hue": "amber", "sector": SHOP})
# Work lights on stands by each car's nose, for its open bay: the kit has
# none yet (agents/G1/REQUESTS.md), so for now only where they stand and
# aim, outside every camera's way, between the bays.
for lid, at, aim, sec in (("s4_work", (465.3, 2.1, -217.55), (463.3, 0.95, -215.0), S4),
                          ("s6_work", (465.3, 2.1, -219.45), (463.3, 0.95, -222.0), S6)):
    LIGHTS_G.append({"id": lid, "kind": "work", "proto": None, "pending": "G1 stand work light", "at": list(at),
                     "faces": [[at[0], at[1], at[2], 0.22, 0.16]], "normal": [0, 0, 0], "aim": list(aim), "cct": 4300, "sector": sec})

# ---------------------------------------------------------------------------
# The shop wall: three photo boards over the bench and the chests, the
# Garage section's "Also in the shop" in the room: the BMW, the bench, the
# competitions. Each photograph is a rectangle of the one atlas (the
# optimizer packs it from src/assets/photos), PHOTO_TILES its place there.
# ---------------------------------------------------------------------------
PHOTO_TILES = ["bmw-carplay-retrofit", "bmw-engine-bay", "bmw-tuning-module", "iphone-teardown", "breadboard",
               "sumo-robot", "wrestling", "rubiks-cube"]
ATLAS_COLS, ATLAS_ROWS = 4, 2
BOARDS = (
    ("bmw", -220.5, ("bmw-carplay-retrofit", "bmw-engine-bay", "bmw-tuning-module")),
    ("bench", BENCH_Z, ("iphone-teardown", "breadboard", "sumo-robot")),
    ("competing", -210.5, ("wrestling", "rubiks-cube")),
)
BOARD_Y0, BOARD_Y1, BOARD_W = 2.55, 3.65, 2.6
PHOTO_W, PHOTO_H = 0.74, 0.555
BOARDS_OUT = []
xb_ = X1 - PROUD
for gid, zc, items in BOARDS:
    z0, z1 = zc - BOARD_W / 2, zc + BOARD_W / 2
    # The board: a dark felt panel in a steel frame, on standoffs.
    sbox("board_frame", xb_ - 0.04, xb_, BOARD_Y0, BOARD_Y1, z0, z1)
    for (y0, y1, za, zb) in ((BOARD_Y0 - 0.04, BOARD_Y0, z0 - 0.04, z1 + 0.04), (BOARD_Y1, BOARD_Y1 + 0.04, z0 - 0.04, z1 + 0.04),
                             (BOARD_Y0, BOARD_Y1, z0 - 0.04, z0), (BOARD_Y0, BOARD_Y1, z1, z1 + 0.04)):
        sbox("metal", xb_ - 0.06, xb_, y0, y1, za, zb)
    gap = (BOARD_W - len(items) * PHOTO_W) / (len(items) + 1)
    photos = []
    for i, name in enumerate(items):
        pz1 = z1 - gap - i * (PHOTO_W + gap)
        pz0 = pz1 - PHOTO_W
        py0 = (BOARD_Y0 + BOARD_Y1) / 2 - PHOTO_H / 2 + 0.03
        t = PHOTO_TILES.index(name)
        u0, v1 = (t % ATLAS_COLS) / ATLAS_COLS, 1 - (t // ATLAS_COLS) / ATLAS_ROWS
        u1, v0 = u0 + 1 / ATLAS_COLS, v1 - 1 / ATLAS_ROWS
        xp = xb_ - 0.045
        # Facing -x (into the room): left to right as seen from it is +z to -z.
        quad(key(xp, zc, "garage_shop_photos"), (xp, py0, pz1), (xp, py0, pz0), (xp, py0 + PHOTO_H, pz0), (xp, py0 + PHOTO_H, pz1),
             uvs=((u0, v0), (u1, v0), (u1, v1), (u0, v1)))
        sbox("trim", xp + 0.002, xp + 0.006, py0 - 0.02, py0 + PHOTO_H + 0.02, pz0 - 0.02, pz1 + 0.02, col=(0.85, 0.84, 0.8, 1))
        photos.append({"id": name, "center": [round(xp, 3), round(py0 + PHOTO_H / 2, 3), round((pz0 + pz1) / 2, 3)],
                       "size": [PHOTO_W, PHOTO_H], "uv": [round(u0, 4), round(v0, 4), round(u1, 4), round(v1, 4)]})
    BOARDS_OUT.append({"id": gid, "center": [round(xb_ - 0.04, 3), (BOARD_Y0 + BOARD_Y1) / 2, zc], "size": [BOARD_W, BOARD_Y1 - BOARD_Y0],
                       "normal": [-1, 0, 0], "photos": photos})
    empty(f"anchor_garage_board_{gid}", (xb_ - 0.05, (BOARD_Y0 + BOARD_Y1) / 2, zc), yaw=-math.pi / 2,
          props={"w": BOARD_W, "h": BOARD_Y1 - BOARD_Y0, "sector": SHOP})

# ---------------------------------------------------------------------------
# The props, the kit's, set down where a shop has them.
# ---------------------------------------------------------------------------
R = random.Random(2013)
# Bay 01: the two-post lift, arms swung in under the S4's sills, its car on
# the floor; posts either side of the car's middle, the power unit on the
# south post, away from the gap between the bays.
LIFT_X = 461.6
GS.place_lift2(LIFT_X, BAY[2], math.pi / 2, district=S4)
# The S4's corner of work: a floor jack and two stands by its nose, a
# creeper by its door, a drain cart and the oil it has dripped.
NP.place("garage_floor_jack", 465.9, 0.0, -212.75, math.pi * 0.62, district=S4)
for (x, z) in ((465.0, -212.55), (465.35, -212.25)):
    NP.place("garage_jack_stand", x, 0.0, z, R.uniform(0, 1.5), district=S4)
NP.place("garage_creeper", 462.6, 0.0, -213.05, math.pi / 2 + 0.08, district=S4)
NP.place("garage_oil_drain", 466.2, 0.0, -217.3, 0.4, district=S4)
NP.place("garage_stain_a", 463.4, 0.0, -215.1, 0.3, district=S4)
NP.place("garage_stain_b", 466.1, 0.0, -217.0, 1.2, district=S4)
NP.place("garage_tyre_marks", 456.2, 0.0, -215.0, math.pi / 2, district=APRON)
NP.place("garage_bay_01", 457.3, 0.0, -215.0, -math.pi / 2, district=APRON)
# Bay 02: chocks at the S6's rear wheels, the tune cart at its driver's
# door, its OBD lead to the port under the dash (the kit's TUNE_PLUG).
NP.place("garage_bay_02", 457.3, 0.0, -222.0, -math.pi / 2, district=APRON)
for z in (-222.82, -221.18):
    NP.place("garage_wheel_chock", S6_BAY[0] - 1.456 - 0.42, 0.0, z, math.pi / 2, district=S6)
TUNE_AT = (461.8, -222.45 - GB.TUNE_PLUG[2])
NP.place("garage_tune_cart", TUNE_AT[0], 0.0, TUNE_AT[1], 0.0, district=S6)
NP.place("garage_stain_c", 464.6, 0.0, -222.3, 0.1, district=S6)
NP.place("garage_floor_drain", 469.6, 0.0, -218.5, 0.0, district=S6)
NP.place("garage_trench_drain", THRESHOLD_X + 0.15, 0.0, (DOOR_Z0 + DOOR_Z1) / 2, math.pi / 2, sxz=1.95, district=APRON)
# The second bay's door, closed, on the front wall inside (the street sees
# its painted sections, districts/garage.py), its tracks back under the
# deck over the apron.
GS.place_door(X0 + PROUD + 0.03, sum(BAY2_DOOR) / 2, -math.pi / 2, size="w", pose="closed", district=APRON)
# The south wall: a run of red chests under the magenta strip, the hose
# reel and the compressor in the corner by the shop wall.
for i, x in enumerate((464.6, 465.75, 466.9, 468.05)):
    NP.place("garage_tool_cab", x, 0.0, Z1 - 0.27, math.pi, district=S4)
    if i % 2 == 0:
        NP.place("garage_tool_top", x, GB.TOP_ON_CAB, Z1 - 0.27, math.pi, district=S4)
NP.place("garage_tool_cart", 469.4, 0.0, Z1 - 0.6, math.pi + 0.25, district=S4)
ON_WALL = PROUD + 0.003
NP.place("garage_hose_reel", 470.9, 0.0, Z1 - ON_WALL, math.pi, district=S4)
NP.place("garage_compressor", 474.6, 0.0, Z1 - 0.45, math.pi + 0.5, district=SHOP)
NP.place("garage_extinguisher", 471.8, 0.0, Z1 - ON_WALL, math.pi, district=S4)
# The shop wall, south to north: shelving, the bench under its pegboard,
# chests under the BMW's board, the tyre changer and balancer, the tyre
# rack in the north corner; the parts table and the washer in front of it.
for z in (-202.0, -203.9):
    NP.place("garage_shelving", X1 - 0.33, 0.0, z, -math.pi / 2, sxz=0.95, district=SHOP)
NP.place("garage_bench", X1 - 0.4, 0.0, BENCH_Z, -math.pi / 2, district=SHOP)
NP.place("garage_pegboard", X1 - ON_WALL, 0.0, BENCH_Z, -math.pi / 2, district=SHOP)
GB.place_parts_washer(X1 - 0.4, -212.75, -math.pi / 2, district=SHOP)
NP.place("garage_parts_table", 473.4, 0.0, -206.6, -math.pi / 2, district=SHOP)
# The monitor over the bench's board, its screen the street's garage_screen
# (districts/garage.py sets that down in the bezel's MONITOR_SCREEN).
NP.place("garage_monitor", X1 - ON_WALL, SCREEN_FOOT, SCREEN_Z, -math.pi / 2, district=SHOP)
for z in (-221.06, -219.94):
    NP.place("garage_tool_cab", X1 - 0.27, 0.0, z, -math.pi / 2, district=SHOP)
    NP.place("garage_tool_top", X1 - 0.27, GB.TOP_ON_CAB, z, -math.pi / 2, district=SHOP)
NP.place("garage_balancer", X1 - 0.5, 0.0, -223.4, -math.pi / 2, district=SHOP)
NP.place("garage_tyre_changer", X1 - 0.6, 0.0, -225.3, -math.pi / 2 + 0.2, district=SHOP)
GB.place_tyre_rack(472.8, -227.8, 0.0, fill=0.8, seed=6, district=SHOP)
NP.place("garage_tyre_stack", 474.7, 0.0, -228.75, 0.3, district=SHOP)
NP.place("garage_neon_wrench", X1 - ON_WALL, 2.45, -206.2, -math.pi / 2, district=SHOP)
NP.place("garage_first_aid", X1 - ON_WALL, 0.0, -207.6, -math.pi / 2, district=SHOP)
# The shop's sign over the shop wall's boards, where the door's view ends.
NP.place("garage_shop_sign", X1 - ON_WALL, 4.35, -206.2, -math.pi / 2, district=SHOP)
# Cable tray down the gap between the bays, under its truss; conduit to
# the bench and the tune cart's corner.
for i in range(7):
    NP.place("garage_cable_tray", 454.0 + i * 3.0 + 1.5, CHORD_LO - GB.TRAY_DROP, -218.5, 0.0, district=sector(454.0 + i * 3.0 + 1.5, -218.5))
for i in range(4):
    NP.place("garage_conduit", X1 - ON_WALL, 3.3, -226.0 + i * 3.0 + 1.5, -math.pi / 2, district=SHOP)
NP.place("garage_conduit_drop", X1 - ON_WALL, 0.0, -213.9, -math.pi / 2, district=SHOP)
NP.place("garage_conduit_drop", X1 - ON_WALL, 0.0, -217.3, -math.pi / 2, district=SHOP)
# By the door inside: an extinguisher and the floor drain; the posters on
# the office's glass-free wall bits.
NP.place("garage_extinguisher", X0 + ON_WALL, 0.0, DOOR_Z0 - 0.6, math.pi / 2, district=APRON)
NP.place("garage_poster_wide", X0 + ON_WALL, 1.6, -210.0, math.pi / 2, district=APRON)
NP.place("garage_poster_tall", X0 + ON_WALL, 1.5, -220.2, math.pi / 2, district=APRON)
NP.place("garage_poster_lit", X1 - ON_WALL, 1.1, -208.9, -math.pi / 2, district=SHOP)
# The office: the couch under the street window, a side table, the fridge
# and the coffee along the south wall, the monitor on it.
NP.place("garage_couch", X0 + 0.5, MZ_Y, -204.5, math.pi / 2, district=MEZ)
NP.place("garage_side_table", X0 + 0.45, MZ_Y, -206.6, math.pi / 2, district=MEZ)
NP.place("garage_fridge", 453.2, MZ_Y, Z1 - 0.35, math.pi, district=MEZ)
NP.place("garage_coffee", 454.1, MZ_Y, Z1 - 0.3, math.pi, district=MEZ)
NP.place("garage_neon_open", X0 + 0.06, MZ_Y + 2.05, -203.2, -math.pi / 2, district=MEZ)

# ---------------------------------------------------------------------------
# What the site needs before the pack: both cars' marks (the S4's is the
# garage district's anchor_garage_bay), each sector's box, the two portals
# the street and the room see each other through, and the lights.
# ---------------------------------------------------------------------------
empty("anchor_garage_s6", S6_BAY, yaw=math.pi / 2)
PORTALS = {
    "door": {"plane": "x", "x": GX0, "z": [DOOR_Z0, DOOR_Z1], "y": [0.0, DOOR_H],
             "corners": [[GX0, 0.0, DOOR_Z0], [GX0, 0.0, DOOR_Z1], [GX0, DOOR_H, DOOR_Z1], [GX0, DOOR_H, DOOR_Z0]],
             "inside": APRON},
    "office_window": {"plane": "x", "x": GX0, "z": [OFFICE_WIN[0], OFFICE_WIN[1]], "y": [OFFICE_WIN[2], OFFICE_WIN[3]],
                      "corners": [[GX0, OFFICE_WIN[2], OFFICE_WIN[0]], [GX0, OFFICE_WIN[2], OFFICE_WIN[1]],
                                  [GX0, OFFICE_WIN[3], OFFICE_WIN[1]], [GX0, OFFICE_WIN[3], OFFICE_WIN[0]]],
                      "inside": MEZ},
}
for pid, p in PORTALS.items():
    c = p["corners"]
    empty(f"anchor_garage_portal_{pid}", tuple(sum(v[i] for v in c) / 4 for i in range(3)),
          props={"w": p["z"][1] - p["z"][0], "h": p["y"][1] - p["y"][0], "inside": p["inside"]})
for L in LIGHTS_G:
    at = L.get("at") or [sum(f[i] for f in L["faces"]) / len(L["faces"]) for i in range(3)]
    flat = [round(v, 3) for f in L["faces"] for v in f]
    empty(f"anchor_garage_light_{L['id']}", tuple(at),
          props={"kind": L["kind"], "faces": flat, "aim": [round(v, 3) for v in L["aim"]], "sector": L["sector"],
                 **({"cct": L["cct"]} if "cct" in L else {}), **({"hue": L["hue"]} if "hue" in L else {})})

# ---------------------------------------------------------------------------
# Collision, independent of what is drawn: what a walker or a car meets
# (nav, to 2.2 m up) and what a camera must keep its distance from (camera:
# the same and everything overhead). Boxes, world metres; the props add
# their own from their footprints (exports.py), and the cars are the site's.
# ---------------------------------------------------------------------------
COLLIDE = []


def solid(kind, x0, x1, y0, y1, z0, z1, nav=True, camera=True):
    COLLIDE.append({"kind": kind, "min": [round(x0, 3), round(y0, 3), round(z0, 3)], "max": [round(x1, 3), round(y1, 3), round(z1, 3)],
                    "nav": nav, "camera": camera})


solid("wall_front_n", GX0, X0, 0.0, GH, Z0, DOOR_Z0)
solid("wall_front_s", GX0, X0, 0.0, GH, DOOR_Z1, Z1)
solid("wall_front_head", GX0, X0, DOOR_H, GH, DOOR_Z0, DOOR_Z1, nav=False)
solid("wall_shop", X1, GX1, 0.0, GH, Z0, Z1)
solid("wall_north", GX0, GX1, 0.0, GH, GZ0, Z0)
solid("wall_south", GX0, GX1, 0.0, GH, Z1, GZ1)
solid("roof", GX0, GX1, CEIL - 0.02, GH, GZ0, GZ1, nav=False)
solid("door_drum", GX0 - 0.1, GX0 + 0.6, DOOR_H, DOOR_H + 0.55, DOOR_Z0 - 0.2, DOOR_Z1 + 0.2, nav=False)
solid("parts_room", X0, MZ_X1, 0.0, MZ_Y, MZ_Z0, Z1)
solid("office", X0, OFFICE_X1 + 0.05, MZ_Y, OFFICE_TOP + 0.14, MZ_Z0 - 0.05, Z1, nav=False)
solid("landing_rail_x", MZ_X1 - 0.08, MZ_X1, MZ_Y, MZ_Y + 1.1, MZ_Z0, STAIR_Z0, nav=False)
solid("landing_rail_z", OFFICE_X1, MZ_X1, MZ_Y, MZ_Y + 1.1, MZ_Z0, MZ_Z0 + 0.08, nav=False)
solid("stair", STAIR_X0, STAIR_X1 + 0.15, 0.0, MZ_Y + 1.1, STAIR_Z0 - 0.03, Z1)
for zt in TRUSS_Z:
    solid(f"truss_{zt:g}", X0, X1, CHORD_LO, CHORD_HI + 0.18, zt - 0.12, zt + 0.12, nav=False)
solid("duct", 453.0, 475.0, DUCT_Y - DUCT_R - 0.26, DUCT_Y + DUCT_R, DUCT_Z - DUCT_R, DUCT_Z + DUCT_R, nav=False)
solid("cable_tray", 454.0, 475.0, CHORD_LO - GB.TRAY_DROP - 0.05, CHORD_LO, -218.75, -218.25, nav=False)
for zt in (-215.0, -222.0, -212.0, -225.0):
    solid(f"battens_{zt:g}", 459.6, 464.4, BATTEN_Y - 0.02, CHORD_LO, zt - 0.2, zt + 0.2, nav=False)
solid("bay2_door_tracks", X0, X0 + 5.8, 4.3, 5.75, -228.9, -222.3, nav=False)
solid("bay2_door", X0, X0 + 0.12, 0.0, 4.86, -228.9, -222.3, nav=False)
solid("boards", X1 - 0.08, X1, BOARD_Y0 - 0.05, BOARD_Y1 + 0.05, -221.85, -209.15, nav=False)
solid("monitor", X1 - 0.3, X1, SCREEN_FOOT - 0.1, SCREEN_FOOT + 1.05, SCREEN_Z - 0.85, SCREEN_Z + 0.85, nav=False)
solid("sign", X1 - 0.12, X1, 4.3, 5.35, -207.95, -204.45, nav=False)
# The lift: its posts (with the south one's power unit) and its beam.
for zc_, zs in ((BAY[2] - GS.LIFT2_X, -1), (BAY[2] + GS.LIFT2_X, 1)):
    solid(f"lift_post_{'n' if zs < 0 else 's'}", LIFT_X - 0.26, LIFT_X + 0.26, 0.0, GS.LIFT2_H + 0.02,
          min(zc_ - zs * 0.16, zc_ + zs * (0.22 if zs < 0 else 0.42)), max(zc_ - zs * 0.16, zc_ + zs * (0.22 if zs < 0 else 0.42)))
solid("lift_beam", LIFT_X - 0.08, LIFT_X + 0.08, GS.LIFT2_H - 0.4, GS.LIFT2_H + 0.08, BAY[2] - 1.84, BAY[2] + 1.84, nav=False)

GARAGE = {
    "frame": "world metres, +x east, +y up, +z south",
    "room": {"min": [X0, 0.0, Z0], "max": [X1, CEIL, Z1], "shell": {"min": [GX0, 0.0, GZ0], "max": [GX1, GH, GZ1]}},
    "bays": {"s4": {"at": list(BAY), "yaw": round(math.pi / 2, 4), "anchor": "anchor_garage_bay"},
             "s6": {"at": list(S6_BAY), "yaw": round(math.pi / 2, 4), "anchor": "anchor_garage_s6",
                    "stance": {"stripe_z": STANCE_STRIPE_Z, "front_axle_x": round(S6_FRONT_AXLE_X, 3), "pad": list(PAD)}}},
    "sectors": SECTOR_BOXES,
    "portals": PORTALS,
    "lights": LIGHTS_G,
    "boards": BOARDS_OUT,
    "photo_atlas": {"tiles": PHOTO_TILES, "cols": ATLAS_COLS, "rows": ATLAS_ROWS, "source": "src/assets/photos/<id>.jpg"},
    "collision": COLLIDE,
    "mezzanine": {"floor_y": MZ_Y, "slab": [X0, MZ_Z0, MZ_X1, Z1], "office": [X0, MZ_Z0, OFFICE_X1, Z1],
                  "stair": {"x": [STAIR_X0, STAIR_X1], "z": [STAIR_Z0, Z1], "risers": RISERS, "rise": round(RISE, 4), "going": round(GOING, 4),
                            "foot_x": STAIR_X1, "head_x": STAIR_X0}},
}
