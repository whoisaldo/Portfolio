"""The city behind the page: the kit the site's live world is built from.

Run through Blender MCP (execute_blender_code) with PROJECT_ROOT defined, or
headless from a terminal:

    python scripts/blender/run_mcp.py --script scripts/blender/build_night_city_world.py

It creates or replaces ONE scene, Night_City_World, and never clears or
edits another (Ali_S4_Final and Night_City_Garage live in the same Blender
session). Its datablocks are prefixed NCW_ and only NCW_ orphans are swept.
The scene is written on its own with bpy.data.libraries.write to
design/night-city-world/night-city-world.blend, and exported as
design/night-city-world/world-source.glb for scripts/optimize-world.mjs.

Frame: world metres, +x right, +y up, +z toward the hero lens, the avenue
running toward -z. It extends the intro drift's frame (src/lib/drift-scene.js)
so the drift, its contact shadow and its reflection carry over unchanged.
Blender is Z-up, so a world point (x, y, z) is Blender (x, -z, y); the glTF
exporter's +Y-up conversion turns that back into (x, y, z) in the GLB.

What the site reads by name (src/world/city.js, scripts/check-world.mjs):
  cam_<shot>, cam_<shot>_target (+ _b variants for shots that move)
  anchor_curb_hero, anchor_garage_bay, anchor_billboard_main,
  anchor_tower_<slug>, anchor_moon, anchor_holo, car_<stop>
  road_spline (an empty whose `points` extra is the road, sampled every metre)
  sign_<id>, board_main, board_<n>, crown_<slug>, holo_figure, moon_disc
Material names are a contract too: NCW_facade gets the window shader,
NCW_asphalt the wet road, NCW_neon_<colour> the neon, and so on.
"""
import bpy
import math
import random
from collections import defaultdict
from pathlib import Path
from mathutils import Vector

try:
    ROOT = Path(PROJECT_ROOT)  # noqa: F821 (injected by run_mcp.py / the MCP call)
except NameError as missing:
    raise RuntimeError("Define PROJECT_ROOT first: run this through scripts/blender/run_mcp.py") from missing

OUT = ROOT / "design/night-city-world"
TEX = OUT / "textures"
GARAGE_TEX = ROOT / "design/night-city-garage/textures"
OUT.mkdir(parents=True, exist_ok=True)
NAME = "Night_City_World"
PREFIX = "NCW_"
rnd = random.Random(2077)

# ---------------------------------------------------------------------------
# A clean slate for this scene only.
# ---------------------------------------------------------------------------
old = bpy.data.scenes.get(NAME)
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in list(old.collection.children_recursive):
        bpy.data.collections.remove(coll)
    bpy.data.scenes.remove(old)
for store in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.lights,
              bpy.data.cameras, bpy.data.worlds, bpy.data.images, bpy.data.fonts):
    for block in list(store):
        if block.name.startswith(PREFIX) and block.users == 0:
            store.remove(block)

scene = bpy.data.scenes.new(NAME)
scene.unit_settings.system = "METRIC"
export_coll = bpy.data.collections.new(PREFIX + "export")
preview_coll = bpy.data.collections.new(PREFIX + "preview")
scene.collection.children.link(export_coll)
scene.collection.children.link(preview_coll)


def P(x, y, z):
    """World metres to Blender coordinates."""
    return (x, -z, y)


def linear(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def rgb(hex_color):
    return tuple(linear(int(hex_color[i:i + 2], 16) / 255) for i in (0, 2, 4))


# ---------------------------------------------------------------------------
# Materials. Names are the contract with src/world/city.js; the node trees
# are for Blender's own viewport and the Cycles reference render.
# ---------------------------------------------------------------------------
MATS = {}


def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def material(name, hex_color, metal=0.0, rough=0.6, emit=0.0):
    mat = bpy.data.materials.new(PREFIX + name)
    mat.use_nodes = True
    bsdf = principled(mat)
    col = (*rgb(hex_color), 1)
    bsdf.inputs["Base Color"].default_value = col
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = rough
    if emit:
        bsdf.inputs["Emission Color"].default_value = col
        bsdf.inputs["Emission Strength"].default_value = emit
    mat.diffuse_color = col
    MATS[name] = mat
    return mat


def image(path, non_color=False):
    """Reuse only this builder's own image of that file; never adopt (and
    rename) a datablock another scene loaded from the same path."""
    name = PREFIX + Path(path).stem
    img = bpy.data.images.get(name)
    if img is None or Path(bpy.path.abspath(img.filepath)) != Path(path):
        img = bpy.data.images.load(str(path), check_existing=False)
        img.name = name
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    return img


def textured(name, folder, asset, tint=None, rough_scale=1.0, normal=0.6):
    mat = material(name, tint or "ffffff")
    nt = mat.node_tree
    bsdf = principled(mat)
    col = nt.nodes.new("ShaderNodeTexImage")
    col.image = image(folder / f"{asset}_1K-JPG_Color.jpg")
    if tint:
        # Held down toward the tint: the painted-metal map is safety orange,
        # which reads as rust on every rail in the city.
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        nt.links.new(col.outputs["Color"], mix.inputs[6])
        mix.inputs[7].default_value = (*rgb(tint), 1)
        nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    else:
        nt.links.new(col.outputs["Color"], bsdf.inputs["Base Color"])
    rough = nt.nodes.new("ShaderNodeTexImage")
    rough.image = image(folder / f"{asset}_1K-JPG_Roughness.jpg", True)
    if rough_scale != 1.0:
        mul = nt.nodes.new("ShaderNodeMath")
        mul.operation = "MULTIPLY"
        mul.inputs[1].default_value = rough_scale
        nt.links.new(rough.outputs["Color"], mul.inputs[0])
        nt.links.new(mul.outputs[0], bsdf.inputs["Roughness"])
    else:
        nt.links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])
    nor = nt.nodes.new("ShaderNodeTexImage")
    nor.image = image(folder / f"{asset}_1K-JPG_NormalGL.jpg", True)
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nmap.inputs["Strength"].default_value = normal
    nt.links.new(nor.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


# Surfaces (ambientCG, CC0). The road carries most of the colour, as in the
# plate: dark, cracked, wet. Its roughness is pulled down for the preview.
textured("asphalt", TEX, "Asphalt026C", rough_scale=0.35, normal=0.8)
textured("sidewalk", GARAGE_TEX, "Concrete048", normal=0.4)
textured("concrete", GARAGE_TEX, "Concrete023", normal=0.5)
# The garage's own walls: the same concrete, lit brighter on the site, as
# the garage room is.
textured("garage_wall", GARAGE_TEX, "Concrete023", normal=0.5)


def painted(name, path):
    """A wall painted at night: an original facade elevation (generated for
    this kit, see the design README) as the colour and the light at once."""
    mat = material(name, "ffffff", rough=0.85)
    nt = mat.node_tree
    bsdf = principled(mat)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image(path)
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 1.0
    return mat


# The avenue's and the canyon's walls: three painted apartment elevations,
# tiled FACADE_TILE metres (w, h) at a time. Everywhere else keeps the
# window shader.
FACADE_TILE = (16.0, 24.0)
for i in range(3):
    painted(f"facade_t{i}", TEX / f"facade-{i + 1}.jpg")
# The garage's walls inside are the garage viewer's own: its room's back,
# magenta and cyan walls, each photographed head-on in that viewer under its
# own lights with the car hidden (see the design README), so the room the
# flight comes into is the room the viewer opens on.
for name in ("back", "magenta", "cyan"):
    painted(f"garage_wall_{name}", TEX / f"garage-wall-{name}.jpg")
# Rails, units, brackets: small and dark, so plain paint rather than three
# more texture maps in the download.
material("metal", "34373d", metal=0.55, rough=0.45)
material("paint", "b9b7ae", rough=0.35)
material("kerb", "3d3f44", rough=0.7)
material("dark", "0b0c0f", rough=0.8)
material("roof", "17181c", rough=0.9)
# The rooftop's own roof, wet: the site traces the signs in its puddles.
material("roof_wet", "121317", rough=0.15)
material("glass_dark", "0d1418", metal=0.6, rough=0.12)
material("corporate", "10161f", metal=0.5, rough=0.15)
material("lobby", "e8e4da", emit=1.2)
material("shop", "ffb77a", emit=0.9)
material("lantern", "ff5a3c", emit=3.0)
material("awning", "5a2440", emit=0.6)
material("board_frame", "15161a", metal=0.7, rough=0.3)
material("door", "2a2d33", metal=0.6, rough=0.45)
material("garage_floor", "3a3c40", rough=0.35)

NEON = {
    "pink": "ff2e88", "magenta": "ff3fd2", "cyan": "27dcf2", "teal": "2ee6c8",
    "blue": "2f6bff", "amber": "ffb254", "red": "ff003c", "green": "39ff9a",
    "white": "eceae4", "purple": "a24bff", "yellow": "fcee0a",
}
for key, hex_color in NEON.items():
    material("neon_" + key, hex_color, emit=6.0)
# The garage's own fixtures are tubes, not neon: the site strikes them on as
# the camera turns to the door (src/world/garage.js). One material, each
# tube's colour on its vertices, so the whole room is one draw. Its door,
# its monitor and its shop furniture are here too.
material("tube", "ffffff", emit=6.0)
TUBE = {key: (*rgb(NEON[key]), 1) for key in ("pink", "cyan", "white", "amber")}
material("door_panel", "4a4e55", metal=0.6, rough=0.4)
material("screen", "0d1016", emit=1.0)
material("tool_red", "6e1c22", metal=0.35, rough=0.45)
material("hazard", "d1a51e", rough=0.6)

# The window shader, approximated in nodes for the viewport and Cycles.
# UV is in window cells (1 u = one bay, 1 v = one storey); the colour
# attribute carries the building's own lit fraction (R), window style (G)
# and warmth (B). src/world/city.js replaces this with the same idea in GLSL.
facade = material("facade", "1a1c21", rough=0.85)


def build_facade_nodes(mat):
    nt = mat.node_tree
    bsdf = principled(mat)
    uv = nt.nodes.new("ShaderNodeUVMap")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(uv.outputs["UV"], sep.inputs[0])
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    split = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(attr.outputs["Color"], split.inputs["Color"])

    def math(op, a, b=None, value=None):
        n = nt.nodes.new("ShaderNodeMath")
        n.operation = op
        for i, src in enumerate((a, b)):
            if src is None:
                continue
            if isinstance(src, (int, float)):
                n.inputs[i].default_value = src
            else:
                nt.links.new(src, n.inputs[i])
        if value is not None:
            n.inputs[1].default_value = value
        return n.outputs[0]

    fu = math("FRACT", sep.outputs["X"])
    fv = math("FRACT", sep.outputs["Y"])
    cu = math("FLOOR", sep.outputs["X"])
    cv = math("FLOOR", sep.outputs["Y"])
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(cu, comb.inputs["X"])
    nt.links.new(cv, comb.inputs["Y"])
    noise = nt.nodes.new("ShaderNodeTexWhiteNoise")
    noise.noise_dimensions = "3D"
    nt.links.new(comb.outputs["Vector"], noise.inputs["Vector"])
    # Inside the pane: margins of 18% across and 22% up.
    inu = math("MULTIPLY", math("GREATER_THAN", fu, 0.18), math("LESS_THAN", fu, 0.82))
    inv = math("MULTIPLY", math("GREATER_THAN", fv, 0.22), math("LESS_THAN", fv, 0.86))
    pane = math("MULTIPLY", inu, inv)
    lit = math("LESS_THAN", noise.outputs["Value"], split.outputs["Red"])
    glow = math("MULTIPLY", pane, lit)
    warm = nt.nodes.new("ShaderNodeMix")
    warm.data_type = "RGBA"
    # Sockets by index: the float, vector and colour variants share names.
    warm.inputs[6].default_value = (0.35, 0.55, 0.85, 1)
    warm.inputs[7].default_value = (1.0, 0.62, 0.3, 1)
    nt.links.new(split.outputs["Blue"], warm.inputs[0])
    nt.links.new(warm.outputs[2], bsdf.inputs["Emission Color"])
    strength = math("MULTIPLY", glow, 1.6)
    nt.links.new(strength, bsdf.inputs["Emission Strength"])
    rough = math("SUBTRACT", 0.85, math("MULTIPLY", pane, 0.75))
    nt.links.new(rough, bsdf.inputs["Roughness"])


build_facade_nodes(facade)

for name in ("sign", "board", "holo", "crown", "moon"):
    material(name, "ffffff", emit=1.5)


# ---------------------------------------------------------------------------
# Geometry batches: everything static and alike is one mesh per district,
# material and level of detail, so the city draws in a few dozen calls.
# ---------------------------------------------------------------------------
class Batch:
    def __init__(self):
        self.verts = []
        self.faces = []
        self.uvs = []
        self.cols = []


batches = defaultdict(Batch)


def poly(key, pts, uvs, col=(1, 1, 1, 1)):
    b = batches[key]
    base = len(b.verts)
    b.verts.extend(P(*p) for p in pts)
    b.faces.append(tuple(range(base, base + len(pts))))
    b.uvs.extend(uvs)
    b.cols.extend([col] * len(pts))


def quad(key, a, b, c, d, uvs=((0, 0), (1, 0), (1, 1), (0, 1)), col=(1, 1, 1, 1)):
    poly(key, (a, b, c, d), uvs, col)


def box(key, x0, x1, y0, y1, z0, z1, scale=2.0, col=(1, 1, 1, 1), bottom=False):
    """An axis-aligned box with world-projected UVs (one tile per `scale` m)."""
    s = 1.0 / scale
    faces = [
        # +x, -x
        ((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1), lambda p: (-p[2] * s, p[1] * s)),
        ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0), lambda p: (p[2] * s, p[1] * s)),
        # +z, -z
        ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), lambda p: (p[0] * s, p[1] * s)),
        ((x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0), lambda p: (-p[0] * s, p[1] * s)),
        # top
        ((x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0), lambda p: (p[0] * s, -p[2] * s)),
    ]
    if bottom:
        faces.append(((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), lambda p: (p[0] * s, p[2] * s)))
    for a, b, c, d, uvf in faces:
        quad(key, a, b, c, d, tuple(uvf(p) for p in (a, b, c, d)), col)


def ground(key, x0, x1, z0, z1, y=0.0, scale=6.0):
    s = 1.0 / scale
    pts = ((x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0))
    quad(key, *pts, uvs=tuple((p[0] * s, -p[2] * s) for p in pts))


def cylinder(key, cx, cz, y0, y1, r, segs=12, col=(1, 1, 1, 1), cap=True):
    ring = [(cx + r * math.cos(t), cz + r * math.sin(t)) for t in
            (i * math.tau / segs for i in range(segs))]
    for i in range(segs):
        (ax, az), (bx, bz) = ring[i], ring[(i + 1) % segs]
        u0, u1 = i / segs * 2, (i + 1) / segs * 2
        quad(key, (bx, y0, bz), (ax, y0, az), (ax, y1, az), (bx, y1, bz),
             ((u1, 0), (u0, 0), (u0, (y1 - y0) / 2), (u1, (y1 - y0) / 2)), col)
    if cap:
        poly(key, [(x, y1, z) for x, z in reversed(ring)], [((x - cx) / r, (z - cz) / r) for x, z in reversed(ring)], col)


def rotated_quad(key, cx, cy, cz, w, h, yaw, uvs=((0, 0), (1, 0), (1, 1), (0, 1)), col=(1, 1, 1, 1), depth=0.0):
    """A vertical quad centred at (cx, cy, cz) facing `yaw` (0 faces +z)."""
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)
    ox, oz = cx + nx * depth, cz + nz * depth
    a = (ox - rx * w / 2, cy - h / 2, oz - rz * w / 2)
    b = (ox + rx * w / 2, cy - h / 2, oz + rz * w / 2)
    c = (ox + rx * w / 2, cy + h / 2, oz + rz * w / 2)
    d = (ox - rx * w / 2, cy + h / 2, oz - rz * w / 2)
    quad(key, a, b, c, d, uvs, col)


def oriented_box(key, cx, cy, cz, w, h, d, yaw, scale=1.0, col=(1, 1, 1, 1)):
    """A box of width w (along yaw's right), height h and depth d."""
    rx, rz = math.cos(yaw), -math.sin(yaw)
    nx, nz = math.sin(yaw), math.cos(yaw)

    def at(u, v, t):
        return (cx + rx * u + nx * t, cy + v, cz + rz * u + nz * t)

    hw, hd = w / 2, d / 2
    s = 1.0 / scale
    corners = {
        "front": (at(-hw, -h / 2, hd), at(hw, -h / 2, hd), at(hw, h / 2, hd), at(-hw, h / 2, hd), w, h),
        "back": (at(hw, -h / 2, -hd), at(-hw, -h / 2, -hd), at(-hw, h / 2, -hd), at(hw, h / 2, -hd), w, h),
        "left": (at(-hw, -h / 2, -hd), at(-hw, -h / 2, hd), at(-hw, h / 2, hd), at(-hw, h / 2, -hd), d, h),
        "right": (at(hw, -h / 2, hd), at(hw, -h / 2, -hd), at(hw, h / 2, -hd), at(hw, h / 2, hd), d, h),
        "top": (at(-hw, h / 2, hd), at(hw, h / 2, hd), at(hw, h / 2, -hd), at(-hw, h / 2, -hd), w, d),
    }
    for a, b, c, dd, fw, fh in corners.values():
        quad(key, a, b, c, dd, ((0, 0), (fw * s, 0), (fw * s, fh * s), (0, fh * s)), col)


# ---------------------------------------------------------------------------
# Named objects: the pieces the site finds by name.
# ---------------------------------------------------------------------------
def link(obj, coll=export_coll):
    coll.objects.link(obj)
    return obj


def named_quad(name, mat_name, cx, cy, cz, w, h, yaw, double=False, props=None):
    mesh = bpy.data.meshes.new(PREFIX + name)
    rx, rz = math.cos(yaw), -math.sin(yaw)
    pts = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    verts = [P(cx + rx * u, cy + v, cz + rz * u) for u, v in pts]
    faces = [(0, 1, 2, 3)]
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
    if double:
        # The back, a hair behind, reading the same way round from behind.
        nx, nz = math.sin(yaw), math.cos(yaw)
        back = [P(cx + rx * u - nx * 0.02, cy + v, cz + rz * u - nz * 0.02) for u, v in pts]
        verts += back
        faces.append((5, 4, 7, 6))
        uvs += [(1, 0), (0, 0), (0, 1), (1, 1)]
    mesh.from_pydata(verts, [], faces)
    uv_layer = mesh.uv_layers.new(name="UVMap")
    loops = []
    for f in faces:
        for vi in f:
            loops.append(uvs[vi])
    for i, uv in enumerate(loops):
        uv_layer.data[i].uv = uv
    mesh.materials.append(MATS[mat_name])
    obj = bpy.data.objects.new(name, mesh)
    for k, v in (props or {}).items():
        obj[k] = v
    return link(obj)


def empty(name, pos, yaw=0.0, props=None, size=1.0):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = size
    obj.location = P(*pos)
    obj.rotation_euler = (0, 0, yaw)
    for k, v in (props or {}).items():
        obj[k] = v
    return link(obj)


SIGNS = []  # (id, preview text) for the preview text objects


def sign(sid, cx, cy, cz, w, h, yaw, double=False, preview=None, district="avenue", label=True):
    """A sign face. Its words and colours are copy, in src/data/world.js."""
    named_quad("sign_" + sid, "sign", cx, cy, cz, w, h, yaw, double,
               {"sign": sid, "district": district, "w": w, "h": h, "double": int(double)})
    if label:
        SIGNS.append((sid, preview or sid.upper(), (cx, cy, cz), w, h, yaw))


# The street's standard sign sizes (w, h in metres), as SIGN_SIZES in
# src/data/world.js: blades small, medium and large, panels small and
# medium, and a square light box. The site paints one design per size and
# hands them out in turn, so every face here is one of a few dozen designs.
ST_SIZES = {"bs": (0.8, 2.0), "bm": (1.0, 3.2), "bl": (1.2, 5.0), "ps": (1.8, 0.8), "pm": (2.8, 1.2), "bx": (1.2, 1.2)}
ST_COUNT = {}


def st_name(size):
    n = ST_COUNT.get(size, 0)
    ST_COUNT[size] = n + 1
    return f"st_{size}_{n}"


# ---------------------------------------------------------------------------
# THE AVENUE. The hero shot looks up it from the intersection: wet asphalt,
# a dashed centre line to the vanishing point, shopfronts and blade signs
# down both sides, Kiroshi on the left, Nicola on the right, the overpass
# with its teal sign, and far off the holographic figure and the ARASAKA
# crest. Everything the plate shows, standing where the drift's camera sees
# it. The hero camera sees about ten degrees above the horizon, so the city
# reads in its lower storeys and its signs, and the tall things are far.
# ---------------------------------------------------------------------------
AV = "avenue"
ROAD_HALF = 10.0
WALK = 14.0
AV_NORTH = -172.0


def road_markings(district, x0, x1, z0, z1, along="z"):
    k = (district, "paint", 0)
    if along == "z":
        # Dashed centre line (broad, so it leads a low lens to the vanishing
        # point), faint lane dashes, solid edges.
        z = z1
        while z - 4.5 > z0:
            quad(k, (-0.15, 0.012, z), (0.15, 0.012, z), (0.15, 0.012, z - 4.5), (-0.15, 0.012, z - 4.5))
            z -= 9.0
        for lx in (-5.0, 5.0):
            z = z1 - 4.5
            while z - 2.0 > z0:
                quad(k, (lx - 0.06, 0.011, z), (lx + 0.06, 0.011, z), (lx + 0.06, 0.011, z - 2.0), (lx - 0.06, 0.011, z - 2.0))
                z -= 9.0
        for ex in (-9.3, 9.3):
            quad(k, (ex - 0.07, 0.011, z1), (ex + 0.07, 0.011, z1), (ex + 0.07, 0.011, z0), (ex - 0.07, 0.011, z0))


def crosswalk(district, x0, x1, zc, depth=3.4, along="x"):
    k = (district, "paint", 0)
    if along == "x":
        x = x0
        while x < x1:
            quad(k, (x, 0.013, zc + depth / 2), (x + 0.7, 0.013, zc + depth / 2),
                 (x + 0.7, 0.013, zc - depth / 2), (x, 0.013, zc - depth / 2))
            x += 1.4
    else:
        z = x0
        while z < x1:
            quad(k, (zc - depth / 2, 0.013, z + 0.7), (zc + depth / 2, 0.013, z + 0.7),
                 (zc + depth / 2, 0.013, z), (zc - depth / 2, 0.013, z))
            z += 1.4


def kerb_and_walk(district, side, z0, z1, x_road=ROAD_HALF, x_wall=WALK):
    s = 1 if side > 0 else -1
    xa, xb = sorted((s * x_road, s * (x_road + 0.3)))
    box((district, "kerb", 0), xa, xb, 0, 0.15, z0, z1, scale=1.0)
    wa, wb = sorted((s * (x_road + 0.3), s * x_wall))
    ground((district, "sidewalk", 0), wa, wb, z0, z1, y=0.15, scale=2.0)


# Road surfaces: the avenue, the cross street at the intersection, and the
# junction at its north end.
ground((AV, "asphalt", 0), -ROAD_HALF, ROAD_HALF, AV_NORTH, 60, scale=6.0)
ground((AV, "asphalt", 0), -90, -ROAD_HALF, -6, 8, scale=6.0)
ground((AV, "asphalt", 0), ROAD_HALF, 90, -6, 8, scale=6.0)
road_markings(AV, -ROAD_HALF, ROAD_HALF, AV_NORTH + 2, -9)
road_markings(AV, -ROAD_HALF, ROAD_HALF, 11, 60)
crosswalk(AV, -9.2, 9.2, -8.3)
# The south one a few metres back from the junction: the hero's lens stands
# at z 10, and its bars would lie right under it.
crosswalk(AV, -9.2, 9.2, 13.4)
# Through the junction, the lanes' own dashed guides, so the road nearest
# the hero's lens leads up the avenue like the rest of it.
for lx, w in ((0.0, 0.15), (-5.0, 0.06), (5.0, 0.06)):
    z = 8.0
    while z - 1.0 > -6.2:
        quad((AV, "paint", 0), (lx - w, 0.011, z), (lx + w, 0.011, z), (lx + w, 0.011, z - 1.0), (lx - w, 0.011, z - 1.0))
        z -= 2.0
for side in (-1, 1):
    kerb_and_walk(AV, side, AV_NORTH, -6)
    kerb_and_walk(AV, side, 8, 60)
    # The cross street's pavements.
    x_in = side * WALK
    x_out = side * 90
    xa, xb = sorted((x_in, x_out))
    ground((AV, "sidewalk", 0), xa, xb, -10, -6, y=0.15, scale=2.0)
    ground((AV, "sidewalk", 0), xa, xb, 8, 12, y=0.15, scale=2.0)

# Drains and manholes on the wet road.
for x, z in ((-8.9, -24), (8.9, -41), (-8.9, -63), (8.9, -88), (-8.9, -112), (8.9, -140)):
    box((AV, "dark", 1), x - 0.3, x + 0.3, 0, 0.018, z - 0.5, z + 0.5, scale=0.5)
for x, z in ((2.4, -18), (-3.1, -52), (3.3, -96)):
    cylinder((AV, "metal", 1), x, z, 0, 0.02, 0.38, segs=16)


# Buildings. Each lot is a mass with windows on its street face (the facade
# shader draws them from the UV cells), a lit shopfront at street level with
# an awning, and on its face the kit of the district: ledges, AC units,
# balconies, pipes and fire escapes, chosen per lot from a seed.
CELL_W, CELL_H, SHOP_H = 3.2, 3.4, 4.6


def _mass_sides(x0, x1, z0, z1, y0, y1):
    return {
        "+x": ((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1), abs(z1 - z0)),
        "-x": ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0), abs(z1 - z0)),
        "+z": ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), abs(x1 - x0)),
        "-z": ((x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0), abs(x1 - x0)),
    }


def mass(district, x0, x1, z0, z1, y0, y1, seed, faces="all", col=None, roof=True, painted=None, roof_mat="roof"):
    r = random.Random(seed)
    if col is None:
        col = (r.uniform(0.12, 0.5), r.randrange(0, 5) / 8.0, r.uniform(0.2, 1.0), 1.0)
    if painted is not None:
        # A painted wall: UVs in tiles of the elevation, each building from a
        # different place in it so neighbours never line up.
        k = (district, f"facade_t{painted}", 0)
        tw, th = FACADE_TILE
        ou, ov = r.uniform(0, 1), r.choice((0.0, 0.5))
        vs = lambda y: ov + (y - SHOP_H) / th  # noqa: E731
        for name, (a, b, c, d, length) in _mass_sides(x0, x1, z0, z1, y0, y1).items():
            if faces != "all" and name not in faces:
                continue
            u1 = ou + length / tw
            quad(k, a, b, c, d, ((ou, vs(y0)), (u1, vs(y0)), (u1, vs(y1)), (ou, vs(y1))), col)
        if roof:
            quad((district, roof_mat, 0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0),
                 ((0, 0), ((x1 - x0) / 4, 0), ((x1 - x0) / 4, (z1 - z0) / 4), (0, (z1 - z0) / 4)))
        return col
    k = (district, "facade", 0)
    ou, ov = r.uniform(0, 40), r.uniform(0, 40)
    vs = lambda y: ov + (y - SHOP_H) / CELL_H  # noqa: E731
    sides = {
        "+x": ((x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1), abs(z1 - z0)),
        "-x": ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0), abs(z1 - z0)),
        "+z": ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), abs(x1 - x0)),
        "-z": ((x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0), abs(x1 - x0)),
    }
    for name, (a, b, c, d, length) in sides.items():
        if faces != "all" and name not in faces:
            continue
        u1 = ou + length / CELL_W
        quad(k, a, b, c, d, ((ou, vs(y0)), (u1, vs(y0)), (u1, vs(y1)), (ou, vs(y1))), col)
    if roof:
        quad((district, roof_mat, 0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0),
             ((0, 0), ((x1 - x0) / 4, 0), ((x1 - x0) / 4, (z1 - z0) / 4), (0, (z1 - z0) / 4)))
    return col


def shopfront(district, side, z0, z1, seed, awning=True):
    """The lit ground floor of a lot on the avenue, facing the street."""
    r = random.Random(seed)
    s = 1 if side > 0 else -1
    xf = s * WALK
    # Recessed glazing with a warm interior, and a dark bulkhead below it.
    a, b = (z0 + 0.4, z1 - 0.4)
    glass = (district, "shop", 0)
    # Facing the street: -x on the right-hand side, +x on the left. The
    # colour attribute is the shop's own light: brightness, hue, and whether
    # it is open at all, for the site's shopfront shader.
    lit = (r.uniform(0.25, 1.0), r.random(), 1.0 if r.random() < 0.8 else 0.0, 1.0)
    pts = ((xf, 0.55, a), (xf, 0.55, b), (xf, 3.3, b), (xf, 3.3, a)) if s > 0 else \
        ((xf, 0.55, b), (xf, 0.55, a), (xf, 3.3, a), (xf, 3.3, b))
    quad(glass, *pts, col=lit)
    xs = sorted((xf, xf - s * 0.12))
    box((district, "dark", 0), xs[0], xs[1], 0.15, 0.55, a, b, scale=1.0)
    box((district, "dark", 0), xs[0], xs[1], 3.3, SHOP_H, a, b, scale=1.0)
    # Pilasters between shop bays.
    for z in (z0 + 0.2, z1 - 0.2):
        pa, pb = sorted((xf, xf - s * 0.45))
        box((district, "concrete", 0), pa, pb, 0.15, SHOP_H, z - 0.2, z + 0.2, scale=1.5)
    if awning:
        colour = r.choice(["pink", "cyan", "red", "amber", "purple", "teal"])
        ya, yb = 3.55, 3.95
        xa, xb = sorted((xf, xf - s * 1.6))
        # A sloped fabric awning falling away from the wall, dyed its colour
        # (the vertex colour) and lit through from the shop under it: its
        # top for the rain and the flights, its underside for the street.
        top_in, top_out = (xf, ya + 0.4), (xf - s * 1.6, ya)
        pts = ((top_in[0], top_in[1], a), (top_out[0], top_out[1], a),
               (top_out[0], top_out[1], b), (top_in[0], top_in[1], b))
        uvs = ((0, 0), (1, 0), (1, 1), (0, 1))
        if s < 0:
            pts = (pts[1], pts[0], pts[3], pts[2])
            uvs = ((1, 0), (0, 0), (0, 1), (1, 1))
        dye = tuple(int(NEON[colour][i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
        quad((district, "awning", 1), *pts, uvs=uvs, col=dye)
        quad((district, "awning", 1), pts[0], pts[3], pts[2], pts[1], uvs=(uvs[0], uvs[3], uvs[2], uvs[1]), col=dye)
        # Its lit edge.
        box((district, "neon_" + colour, 0), min(top_out[0], top_out[0] - s * 0.04), max(top_out[0], top_out[0] - s * 0.04),
            ya - 0.08, ya, a, b, scale=1.0)
    return r


def corner_shop(district, xa, xb, z, seed):
    """The ground floor of a corner lot, on its face to the intersection."""
    r = random.Random(seed)
    lit = (r.uniform(0.5, 1.0), r.random(), 1.0, 1.0)
    a, b = xa + 0.4, xb - 0.4
    quad((district, "shop", 0), (a, 0.55, z), (b, 0.55, z), (b, 3.3, z), (a, 3.3, z), col=lit)
    box((district, "dark", 0), a, b, 0.15, 0.55, z, z + 0.12, scale=1.0)
    box((district, "dark", 0), a, b, 3.3, SHOP_H, z, z + 0.12, scale=1.0)


def lanterns(district, side, z0, z1, y=3.1):
    s = 1 if side > 0 else -1
    x = s * (WALK - 1.2)
    z = z0 + 0.8
    while z < z1 - 0.5:
        cylinder((district, "lantern", 1), x, z, y - 0.28, y + 0.28, 0.2, segs=8)
        z += 1.6


def ac_units(district, side, z0, z1, y0, y1, seed):
    r = random.Random(seed)
    s = 1 if side > 0 else -1
    for _ in range(r.randrange(2, 6)):
        y = r.uniform(y0, y1)
        z = r.uniform(z0 + 1, z1 - 1)
        xa, xb = sorted((s * WALK, s * (WALK - 0.55)))
        box((district, "metal", 1), xa, xb, y, y + 0.55, z - 0.4, z + 0.4, scale=0.6)


def ledges(district, side, z0, z1, y0, y1, step=CELL_H):
    s = 1 if side > 0 else -1
    y = y0
    while y < y1 - 0.5:
        xa, xb = sorted((s * WALK, s * (WALK - 0.25)))
        box((district, "concrete", 0), xa, xb, y - 0.12, y, z0, z1, scale=2.0)
        y += step


def fire_escape(district, side, zc, y0, y1):
    s = 1 if side > 0 else -1
    x_out = s * (WALK - 1.1)
    y = y0
    k = (district, "metal", 1)
    while y < y1:
        xa, xb = sorted((s * WALK, x_out))
        box(k, xa, xb, y, y + 0.06, zc - 2.2, zc + 2.2, scale=0.5)
        # Railings.
        ra, rb = sorted((x_out, x_out + s * 0.05))
        box(k, ra, rb, y, y + 1.0, zc - 2.2, zc + 2.2, scale=0.5)
        # The stair to the next landing.
        quad(k, (x_out - s * 0.1, y + 0.06, zc - 2.0), (x_out - s * 0.9, y + 0.06, zc - 2.0),
             (x_out - s * 0.9, y + CELL_H, zc + 1.6), (x_out - s * 0.1, y + CELL_H, zc + 1.6))
        y += CELL_H


PANEL_COLOURS = ["pink", "cyan", "magenta", "amber", "red", "blue", "teal", "purple", "green", "white"]


def clutter(district, side, z0, z1, top, seed):
    """The signs a Night City facade collects: blades standing out from the
    wall at every height and boards flat on it, each one a standard sign the
    site paints (ST_SIZES), plus neon along the ledges. Most are blades
    because the street is seen end-on: a board flat on a wall is a sliver
    from the intersection, a blade faces the lens."""
    r = random.Random(seed)
    s = 1 if side > 0 else -1
    ceiling = max(SHOP_H + 2.4, min(top - 1.0, 26.0))
    for _ in range(r.randrange(6, 12)):
        if r.random() < 0.66:
            # A blade, painted on both faces, reading up and down the street.
            size = r.choices(["bs", "bm", "bl", "bx"], weights=[3, 4, 2, 2])[0]
            w, h = ST_SIZES[size]
            y = r.uniform(SHOP_H + 0.6 + h / 2, max(SHOP_H + 0.7 + h / 2, ceiling - h / 2))
            z = r.uniform(z0 + 0.6, z1 - 0.6)
            x = s * (WALK - 0.35 - w / 2)
            xa, xb = sorted((x - w / 2 - 0.06, x + w / 2 + 0.06))
            box((district, "board_frame", 0), xa, xb, y - h / 2 - 0.07, y + h / 2 + 0.07, z - 0.08, z + 0.08, scale=1.0)
            sid = st_name(size)
            sign(sid, x, y, z + 0.09, w, h, 0.0, district=district, label=False)
            sign(sid + "_b", x, y, z - 0.09, w, h, math.pi, district=district, label=False)
            ya = y + h / 2 + 0.07
            ba, bb = sorted((s * WALK, x))
            box((district, "metal", 1), ba, bb, ya, ya + 0.07, z - 0.04, z + 0.04, scale=0.5)
        else:
            # A board flat on the wall, facing the street.
            size = r.choices(["ps", "pm", "bx"], weights=[4, 3, 2])[0]
            w, h = ST_SIZES[size]
            y = r.uniform(SHOP_H + 0.5 + h / 2, max(SHOP_H + 0.6 + h / 2, ceiling - h / 2))
            if z1 - z0 < w + 1.0:
                continue
            z = r.uniform(z0 + w / 2 + 0.5, z1 - w / 2 - 0.5)
            out = r.uniform(0.12, 0.45)
            xa, xb = sorted((s * WALK, s * (WALK - out)))
            box((district, "board_frame", 0), xa, xb, y - h / 2 - 0.07, y + h / 2 + 0.07, z - w / 2 - 0.07, z + w / 2 + 0.07, scale=1.0)
            sign(st_name(size), s * (WALK - out - 0.015), y, z, w, h, -s * math.pi / 2, district=district, label=False)
    for _ in range(r.randrange(0, 3)):
        y = r.choice([SHOP_H + CELL_H * k for k in range(1, 5)]) + 0.05
        if y > top - 1:
            continue
        colour = r.choice(PANEL_COLOURS)
        xa, xb = sorted((s * (WALK - 0.26), s * (WALK - 0.3)))
        box((district, "neon_" + colour, 0), xa, xb, y, y + 0.08, z0 + 0.4, z1 - 0.4, scale=1.0)


def blade(district, side, sid, z, y, h, w=0.9, colour="pink", preview=None):
    """A vertical sign sticking out from the wall, readable up the street."""
    s = 1 if side > 0 else -1
    x = s * (WALK - 0.25 - w / 2)
    xa, xb = sorted((x - w / 2 - 0.05, x + w / 2 + 0.05))
    box((district, "board_frame", 0), xa, xb, y - h / 2 - 0.08, y + h / 2 + 0.08, z - 0.09, z + 0.09, scale=1.0)
    sign(sid, x, y, z + 0.1, w, h, 0.0, double=False, preview=preview, district=district)
    sign(sid + "_b", x, y, z - 0.1, w, h, math.pi, double=False, preview=preview, district=district)
    # Its bracket back to the wall.
    ya = y + h / 2 + 0.08
    xa, xb = sorted((s * WALK, x))
    box((district, "metal", 1), xa, xb, ya, ya + 0.08, z - 0.04, z + 0.04, scale=0.5)


# The lots, north of the intersection. (z_start, depth along the street,
# height) per side. The hero's camera is low, so the first few lots tower
# out of its frame; past them each roof is a little lower in its eye than
# the one before (on the left about 0.38 of the lot's distance falling to
# 0.29; on the right, past Nicola, a steeper 0.27, as the plate has it), and
# the roofs step down toward the vanishing point under a band of sky.
HERO_EYE_Z = 10.0
LOTS = {
    -1: [(-10, 11, 16), (-21, 9, 24), (-30, 14, 19), (-44, 12, 21), (-56, 10, 23), (-66, 12, 29),
         (-84, 13, 27), (-97, 11, 37), (-108, 15, 33), (-123, 12, 44), (-135, 14, 38), (-149, 12, 49),
         (-161, 9, 46)],
    1: [(-10, 13, 18), (-23, 10, 22), (-33, 12, 27), (-45, 16, 17), (-61, 10, 19), (-71, 13, 22),
        (-86, 12, 26), (-98, 14, 29), (-112, 11, 33), (-123, 15, 36), (-138, 12, 40), (-150, 10, 43),
        (-160, 10, 44)],
}
for side, lots in LOTS.items():
    s = side
    for i, (z_start, depth, height) in enumerate(lots):
        z1, z0 = z_start, z_start - depth
        seed = 1000 + (i * 37 if s > 0 else i * 53 + 7)
        x_front, x_back = (WALK, WALK + 22) if s > 0 else (-WALK - 22, -WALK)
        xa, xb = (WALK, WALK + 22) if s > 0 else (-WALK - 22, -WALK)
        mass(AV, xa, xb, z0, z1, SHOP_H, height, seed, painted=(i + (0 if s > 0 else 1)) % 3)
        # The ground floor as its own dark volume, set back behind the
        # shopfront's glass (in its plane the glass would lose to it), and on
        # the corner lots behind a second shopfront facing the intersection.
        corner = i == 0
        box((AV, "dark", 0), xa + (0.3 if s > 0 else 0), xb - (0.3 if s < 0 else 0), 0.15, SHOP_H, z0, z1 - (0.3 if corner else 0), scale=2.0)
        r = shopfront(AV, s, z0, z1, seed)
        if corner:
            corner_shop(AV, xa, xb, z1, seed + 5)
        if r.random() < 0.18:
            lanterns(AV, s, z0, z1)
        ledges(AV, s, z0, z1, SHOP_H + CELL_H, height)
        clutter(AV, s, z0, z1, height, seed + 11)
        ac_units(AV, s, z0, z1, SHOP_H + 1, min(height - 2, 22), seed + 1)
        if r.random() < 0.3 and height > 20:
            fire_escape(AV, s, (z0 + z1) / 2, SHOP_H + 0.5, min(height - 3, 26))
        # A setback crown on the taller lots, kept under the line the roofs
        # step down along, and roof clutter.
        crown = min(r.uniform(5, 14), 0.33 * (HERO_EYE_Z - z_start) - height)
        if height > 30 and crown > 3:
            ia, ib = (xa + 3, xb - 5) if s > 0 else (xa + 5, xb - 3)
            mass(AV, ia, ib, z0 + 2, z1 - 2, height, height + crown, seed + 3)
        for _ in range(r.randrange(1, 4)):
            cx = r.uniform(xa + 2, xb - 2)
            cz = r.uniform(z0 + 1.5, z1 - 1.5)
            box((AV, "metal", 1), cx - 0.8, cx + 0.8, height, height + 1.1, cz - 0.6, cz + 0.6, scale=0.8)

# Blade signs down both sides: the plate's vertical Japanese signs. The ids
# are keys into WORLD_SIGNS in src/data/world.js, which holds their words.
blade(AV, -1, "ramen", -16.5, 7.2, 5.6, 1.1, preview="ラーメン")
blade(AV, -1, "mirai", -36.0, 8.0, 4.8, 0.9, preview="未来の目")
blade(AV, -1, "bar", -60.5, 6.2, 2.4, 1.2, preview="BAR")
blade(AV, -1, "hotel", -79.0, 8.6, 5.0, 0.9, preview="ホテル")
blade(AV, -1, "karaoke", -104.0, 9.5, 5.2, 1.0, preview="カラオケ")
blade(AV, 1, "shinsen", -28.0, 7.4, 5.2, 1.0, preview="新鮮な寿司")
blade(AV, 1, "shokuji", -47.5, 6.4, 3.6, 0.9, preview="食事処")
blade(AV, 1, "yoru", -65.0, 7.0, 3.2, 0.9, preview="夜の味")
blade(AV, 1, "bento", -90.0, 8.2, 4.4, 0.9, preview="弁当")
blade(AV, 1, "pachinko", -115.0, 10.0, 6.0, 1.1, preview="パチンコ")
# More words in the band the hero frames: near the camera the frame's top is
# a few metres up, further off it is the height of the fourth storey.
blade(AV, -1, "izakaya", -24.5, 5.4, 3.6, 1.0, preview="居酒屋")
blade(AV, -1, "yakitori", -48.5, 8.0, 4.8, 1.0, preview="焼き鳥")
blade(AV, -1, "denno", -71.0, 11.0, 6.4, 1.1, preview="電脳")
blade(AV, -1, "sakaba", -92.0, 12.0, 5.0, 1.0, preview="酒場")
blade(AV, 1, "kusuri", -21.0, 5.2, 3.4, 1.0, preview="薬局")
blade(AV, 1, "arcade", -55.0, 9.5, 6.0, 1.1, preview="ARCADE")
blade(AV, 1, "mirai2", -78.0, 11.5, 6.2, 1.0, preview="未来")
blade(AV, 1, "kaiten", -102.0, 12.5, 5.6, 1.0, preview="回転寿司")

# Horizontal shop signs over the awnings.
sign("menya", -WALK + 0.06, 4.2, -26.5, 4.5, 0.9, math.pi / 2, preview="麺屋")
sign("sushi", WALK - 0.06, 4.3, -38.5, 3.6, 0.9, -math.pi / 2, preview="寿司 SUSHI")
sign("maneki", WALK - 0.06, 5.6, -52.0, 2.2, 2.6, -math.pi / 2, preview="招き猫")

# The avenue's two big screens: Kiroshi on the left, Nicola on the right,
# as the plate has them. They are screens, not signs: each shows an original
# advertising image with the brand set over it on the site (src/world/ads.js),
# so they are named ad_<id>. Each is turned most of the way to the hero's
# lens and sized to stand in its frame from just over the shops to just under
# the top, a quarter of the way in from either side, where the plate has them.
KIROSHI = (-11.3, 8.35, -21.0, 5.7, 8.5, math.radians(30))
NICOLA = (11.0, 9.95, -26.0, 6.6, 9.9, math.radians(-28))
for sid, (cx, cy, cz, w, h, yaw) in (("kiroshi", KIROSHI), ("nicola", NICOLA)):
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((AV, "board_frame", 0), cx - nx * 0.25, cy, cz - nz * 0.25, w + 0.6, h + 0.6, 0.4, yaw, scale=1.0)
    named_quad("ad_" + sid, "sign", cx, cy, cz, w, h, yaw, props={"district": AV, "ad": sid})
    # Two struts back to the wall.
    for dy in (-h / 3, h / 3):
        oriented_box((AV, "metal", 1), cx - nx * 1.3, cy + dy, cz - nz * 1.3, 0.2, 0.2, 2.4, yaw, scale=0.5)

# Further up, a second pair: the portrait camera sees a narrow cone, mostly
# of the avenue's far half, and it gets its Kiroshi and Nicola there.
KIROSHI_FAR = (-12.0, 17.0, -136.0, 7.0, 10.5, math.radians(24))
NICOLA_FAR = (11.8, 19.0, -166.0, 7.0, 10.5, math.radians(-24))
for sid, (cx, cy, cz, w, h, yaw) in (("kiroshi_far", KIROSHI_FAR), ("nicola_far", NICOLA_FAR)):
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((AV, "board_frame", 0), cx - nx * 0.2, cy, cz - nz * 0.2, w + 0.6, h + 0.6, 0.4, yaw, scale=1.0)
    named_quad("ad_" + sid, "sign", cx, cy, cz, w, h, yaw, props={"district": AV, "ad": sid.replace("_far", "")})

# The overpass: a concrete deck on two piers crossing the avenue, a rail
# along its edge, lights underneath, and its teal sign.
OVER_Z = -80.0
box((AV, "concrete", 0), -46, 46, 7.2, 8.5, OVER_Z - 3.2, OVER_Z + 3.2, scale=3.0)
for px in (-17.5, 17.5):
    box((AV, "concrete", 0), px - 0.8, px + 0.8, 0, 7.2, OVER_Z - 1.2, OVER_Z + 1.2, scale=2.0)
for zz in (OVER_Z - 3.25, OVER_Z + 3.15):
    box((AV, "metal", 1), -46, 46, 8.5, 9.6, zz, zz + 0.1, scale=0.8)
box((AV, "neon_teal", 0), -12, 12, 7.1, 7.18, OVER_Z + 3.0, OVER_Z + 3.1, scale=1.0)
for lx in range(-40, 41, 8):
    box((AV, "neon_white", 1), lx - 0.8, lx + 0.8, 7.1, 7.16, OVER_Z - 0.3, OVER_Z + 0.3, scale=1.0)
sign("sora", -6.0, 9.2, OVER_Z + 3.35, 6.4, 1.3, 0.0, preview="空き未来へ")
box((AV, "board_frame", 0), -9.4, -2.6, 8.4, 10.0, OVER_Z + 3.1, OVER_Z + 3.3, scale=1.0)

# Strings of light across the avenue: festoons between the facades.
for z in (-22.0, -40.0, -58.0, -99.0, -128.0):
    k = (AV, "neon_amber", 1)
    for i in range(24):
        t = i / 24
        x = -WALK + t * 2 * WALK
        y = 7.6 - 1.4 * math.sin(math.pi * t)
        cylinder(k, x, z, y - 0.07, y + 0.07, 0.07, segs=6, cap=False)

# Cables slung across the avenue between the facades, dark against the glow.
cable_rng = random.Random(9090)
for _ in range(14):
    z = cable_rng.uniform(-170.0, -12.0)
    y0 = cable_rng.uniform(8.0, 16.0)
    sag = cable_rng.uniform(0.8, 2.4)
    k = (AV, "dark", 1)
    steps = 16
    for i in range(steps):
        t0, t1 = i / steps, (i + 1) / steps
        x0 = -WALK + t0 * 2 * WALK
        x1 = -WALK + t1 * 2 * WALK
        ya = y0 - sag * math.sin(math.pi * t0)
        yb = y0 - sag * math.sin(math.pi * t1)
        quad(k, (x0, ya - 0.03, z), (x1, yb - 0.03, z), (x1, yb + 0.03, z), (x0, ya + 0.03, z))
        quad(k, (x1, yb - 0.03, z), (x0, ya - 0.03, z), (x0, ya + 0.03, z), (x1, yb + 0.03, z))

# Street lamps: sodium heads on thin poles along both kerbs. Each head has
# an anchor (anchor_lamp_<n>) the site hangs a shaft of light from, in the
# haze.
LAMPS = []
for side in (-1, 1):
    for z in (-14, -46, -78, -110, -142):
        x = side * (ROAD_HALF + 0.9)
        cylinder((AV, "metal", 1), x, z, 0.15, 6.4, 0.08, segs=8)
        hx = x - side * 1.4
        xa, xb = sorted((x, hx))
        box((AV, "metal", 1), xa, xb, 6.3, 6.42, z - 0.07, z + 0.07, scale=0.5)
        box((AV, "neon_amber", 0), hx - 0.35, hx + 0.35, 6.2, 6.3, z - 0.15, z + 0.15, scale=0.5)
        LAMPS.append((hx, 6.2, z))

# Two manholes up the avenue breathe steam into the signs' light (the site
# draws it from anchor_steam_<n>).
for i, (x, z) in enumerate(((4.0, -8.0), (-6.0, -30.0))):
    cylinder((AV, "metal", 1), x, z, 0.0, 0.025, 0.42, segs=16)
    empty(f"anchor_steam_street_{i}", (x, 0.05, z))

# Vending machines and bollards at the kerb.
for side, z, colour in ((-1, -19.5, "cyan"), (-1, -20.6, "pink"), (1, -36.0, "amber"), (1, -71.0, "cyan")):
    s = side
    xa, xb = sorted((s * (WALK - 0.1), s * (WALK - 0.95)))
    box((AV, "metal", 1), xa, xb, 0.15, 2.05, z - 0.5, z + 0.5, scale=0.6)
    face_x = s * (WALK - 0.96)
    fa, fb = sorted((face_x, face_x - s * 0.02))
    box((AV, "neon_" + colour, 1), fa, fb, 0.8, 1.9, z - 0.4, z + 0.4, scale=0.5)

# ---------------------------------------------------------------------------
# THE FAR AVENUE. Past the cross street the avenue runs on as a canyon of
# towers, lit windows and tall vertical signs, to the holographic figure at
# its end and the ARASAKA crest beside it. The hero looks straight down it:
# this is the vanishing point, and on a phone it is most of the picture.
# ---------------------------------------------------------------------------
FA = "far"
ground((FA, "asphalt", 0), -ROAD_HALF, ROAD_HALF, -700, -186, scale=6.0)
road_markings(FA, -ROAD_HALF, ROAD_HALF, -700, -188)
for side in (-1, 1):
    kerb_and_walk(FA, side, -700, -186)
# Heights that fall away in the hero's eye: from the low camera each lot
# stands a little shorter than the one before it, so the canyon's roofs
# converge on the horizon and open a slot of sky at its end, where the
# figure and ARASAKA stand in the glow.
FAR_LOTS = {
    -1: [(-188, 30, 52), (-218, 34, 57), (-252, 36, 60), (-288, 40, 66), (-328, 44, 62),
         (-372, 50, 67), (-422, 60, 63), (-482, 70, 64)],
    1: [(-188, 34, 47), (-222, 36, 58), (-258, 40, 51), (-298, 44, 64), (-342, 50, 57),
        (-392, 56, 62), (-448, 66, 56)],
}
VERT_SIGNS = ["neon_magenta", "neon_cyan", "neon_pink", "neon_amber", "neon_blue", "neon_purple"]
for side, lots in FAR_LOTS.items():
    s = side
    for i, (z_start, depth, height) in enumerate(lots):
        z1, z0 = z_start, z_start - depth
        xa, xb = (WALK, WALK + 30) if s > 0 else (-WALK - 30, -WALK)
        seed = 4700 + i * 13 + (0 if s > 0 else 500)
        mass(FA, xa, xb, z0, z1, SHOP_H, height, seed, painted=(i + (1 if s > 0 else 2)) % 3)
        box((FA, "dark", 0), xa, xb, 0.15, SHOP_H, z0, z1, scale=2.0)
        box((FA, "shop", 0), min(s * WALK, s * (WALK - 0.02)), max(s * WALK, s * (WALK - 0.02)), 0.6, 3.3, z0 + 1, z1 - 1, scale=2.0)
        clutter(FA, s, z0, z1, height, seed + 7)
        # A tall vertical sign on most lots, facing down the avenue, the
        # plate's column of type running up the facades.
        if i % 3 != 2:
            h = min(height * 0.5, 40.0)
            x = s * (WALK - 1.6)
            sid = f"far_{'l' if s < 0 else 'r'}{i}"
            sign(sid, x, SHOP_H + 3 + h / 2, z1 - 3.0, 2.2, h, 0.0, preview="夜", district=FA)
            box((FA, "board_frame", 0), x - 1.25, x + 1.25, SHOP_H + 2.8, SHOP_H + 3.2 + h, z1 - 3.25, z1 - 3.05, scale=1.0)

# The figure's image is 2:3; the plane matches it. Huge, as the plate has
# her: from the hero camera her waist is over the canyon's last roofs and
# her head at the top of the frame, past the last lots, over the road's end.
HOLO = (-12.4, 154.0, -570.0, 104.0, 156.0)
hx, hy, hz, hw, hh = HOLO
named_quad("holo_figure", "holo", hx, hy, hz, hw, hh, 0.0, props={"district": FA})
empty("anchor_holo", (hx, hy, hz))
# Her slogan on a tall blade on the canyon's right, on the one lot there
# without a column of its own.
sign("beauty", WALK - 2.5, SHOP_H + 18.0, -261.0, 4.4, 30.0, 0.0, preview="美しさは、力だ", district=FA)
box((FA, "board_frame", 0), WALK - 4.75, WALK - 0.25, SHOP_H + 2.8, SHOP_H + 33.2, -261.25, -261.05, scale=1.0)

# ARASAKA's tower stands right of her, a block off the avenue, its name in
# the band of sky between her and the canyon's right-hand roofs, turned to
# the hero's lens, where the plate has it.
ARASAKA = (75.0, -490.0)
ax, az = ARASAKA
mass(FA, ax - 26, ax + 26, az - 26, az + 26, SHOP_H, 110, 4501, col=(0.3, 0.5, 0.2, 1))
mass(FA, ax - 22, ax + 22, az - 22, az + 22, 110, 182, 4502, col=(0.22, 0.5, 0.2, 1))
box((FA, "dark", 0), ax - 26, ax + 26, 0, SHOP_H, az - 26, az + 26, scale=4.0)
box((FA, "neon_red", 0), ax - 22.3, ax + 22.3, 180.2, 182.2, az - 22.3, az + 22.3, scale=1.0)
box((FA, "neon_red", 0), ax - 26.3, ax + 26.3, 108.0, 110.0, az - 26.3, az + 26.3, scale=1.0)
sign("arasaka", ax, 159.0, az + 22.6, 44.0, 15.0, 0.0, preview="ARASAKA", district=FA)

# The skyline over the canyon's end: landmark towers a kilometre off, in the
# band of sky the hero sees between the roofs, each stepped back twice and
# crowned in its own colour with a mast and a red light. The far city
# (src/world/skyline.js) keeps clear of them.
SK = "skyline"


def megatower(x, z, w, h, colour, seed):
    r = random.Random(seed)
    tiers = ((0.0, 0.52, 1.0), (0.52, 0.8, 0.78), (0.8, 1.0, 0.56))
    for i, (a, b, k) in enumerate(tiers):
        hw = w * k / 2
        y0, y1 = max(SHOP_H, h * a), h * b
        mass(SK, x - hw, x + hw, z - hw, z + hw, y0, y1, seed + i, col=(r.uniform(0.55, 0.85), r.randrange(0, 5) / 8.0, r.uniform(0.2, 0.9), 1))
        # A lit band at each setback, and one round the crown.
        box((SK, "neon_" + colour, 0), x - hw - 0.4, x + hw + 0.4, y1 - 3.2, y1 - 0.4, z - hw - 0.4, z + hw + 0.4, scale=1.0)
    # Light fins up the corners of the upper two tiers.
    for a, b, k in tiers[1:]:
        hw = w * k / 2
        for dx, dz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
            box((SK, "neon_" + colour, 0), x + dx * hw - 1.0, x + dx * hw + 1.0, h * a, h * b - 3.2, z + dz * hw - 1.0, z + dz * hw + 1.0, scale=1.0)
    # The mast and its light.
    mh = h * r.uniform(0.1, 0.18)
    box((SK, "metal", 0), x - 1.2, x + 1.2, h, h + mh, z - 1.2, z + 1.2, scale=1.0)
    box((SK, "neon_red", 0), x - 2.0, x + 2.0, h + mh, h + mh + 3.0, z - 2.0, z + 2.0, scale=1.0)


MEGATOWERS = [
    (-150.0, -900.0, 50.0, 330.0, "cyan"),
    (-300.0, -1150.0, 60.0, 420.0, "pink"),
    (-40.0, -1300.0, 56.0, 480.0, "purple"),
    (120.0, -1400.0, 60.0, 520.0, "blue"),
    (330.0, -1000.0, 46.0, 300.0, "amber"),
]
for i, (x, z, w, h, colour) in enumerate(MEGATOWERS):
    megatower(x, z, w, h, colour, 5200 + i * 17)
    empty(f"anchor_mega_{i}", (x, h, z), props={"size": w})

# ---------------------------------------------------------------------------
# THE PLAZA. East along the cross street from the avenue: a paved square
# with the giant board on its north side and smaller boards around it. The
# board shows the Work deck's current entry.
# ---------------------------------------------------------------------------
PL = "plaza"
CROSS_Z0, CROSS_Z1 = -186.0, AV_NORTH
ground((PL, "asphalt", 0), -60, 150, CROSS_Z0, CROSS_Z1, scale=6.0)
ground((PL, "asphalt", 0), -ROAD_HALF, ROAD_HALF, CROSS_Z0, CROSS_Z1, y=0.001, scale=6.0)
for x in list(range(-56, -12, 9)) + list(range(14, 146, 9)):
    quad((PL, "paint", 0), (x, 0.012, -178.9), (x + 3, 0.012, -178.9), (x + 3, 0.012, -179.1), (x, 0.012, -179.1))
crosswalk(PL, -9.2, 9.2, -189.5)
PX0, PX1, PZ0, PZ1 = 48.0, 110.0, -262.0, -187.0
ground((PL, "sidewalk", 0), PX0, PX1, PZ0, PZ1, y=0.15, scale=2.0)
box((PL, "kerb", 0), PX0, PX1, 0, 0.15, PZ1 - 0.3, PZ1, scale=1.0)
BOARD = (79.0, 26.0, -263.0, 27.0, 18.0)
bx, by, bz, bw, bh = BOARD
named_quad("board_main", "board", bx, by, bz, bw, bh, 0.0, props={"board": 0, "district": PL})
empty("anchor_billboard_main", (bx, by, bz))
box((PL, "board_frame", 0), bx - bw / 2 - 0.8, bx + bw / 2 + 0.8, by - bh / 2 - 0.8, by + bh / 2 + 0.8, bz - 1.2, bz - 0.05, scale=2.0)
box((PL, "neon_yellow", 0), bx - bw / 2 - 0.8, bx + bw / 2 + 0.8, by - bh / 2 - 0.9, by - bh / 2 - 0.7, bz - 0.05, bz + 0.1, scale=1.0)
for px in (bx - 9, bx + 9):
    box((PL, "metal", 0), px - 0.6, px + 0.6, 0, by - bh / 2 - 0.8, bz - 1.2, bz - 0.2, scale=1.0)
# A board this size hangs in a steel housing bolted over the flats behind
# it: a dark field wider than the screen and the two boards beside it (so
# the screens, not the lit rooms round them, are what the eye finds),
# ribbed, with a catwalk along its foot and a red lamp on each top corner.
HX0, HX1 = bx - bw / 2 - 10.5, bx + bw / 2 + 10.5
HY0, HY1 = by - bh / 2 - 3.2, by + bh / 2 + 3.6
box((PL, "board_frame", 0), HX0, HX1, HY0, HY1, -264.0, -263.85, scale=2.0)
for y in [HY0 + 0.4 + k * 3.1 for k in range(int((HY1 - HY0) / 3.1))]:
    box((PL, "metal", 1), HX0 + 0.3, HX1 - 0.3, y, y + 0.14, -263.85, -263.7, scale=0.5)
box((PL, "metal", 0), HX0, HX1, by - bh / 2 - 1.5, by - bh / 2 - 1.35, -263.85, -262.3, scale=1.0)
box((PL, "metal", 1), HX0, HX1, by - bh / 2 - 0.45, by - bh / 2 - 0.4, -262.35, -262.3, scale=0.5)
for x in (HX0 + 0.4, HX1 - 0.4):
    box((PL, "neon_red", 0), x - 0.2, x + 0.2, HY1 - 0.5, HY1 - 0.1, -263.85, -263.6, scale=0.5)
SMALL_BOARDS = [
    (44.6, 12.0, -205.0, 9.0, 6.0, math.radians(90)),
    (44.6, 12.0, -228.0, 9.0, 6.0, math.radians(90)),
    (109.4, 12.0, -205.0, 9.0, 6.0, math.radians(-90)),
    (109.4, 12.0, -228.0, 9.0, 6.0, math.radians(-90)),
    (60.0, 19.0, -260.5, 8.0, 5.3, 0.0),
    (98.0, 19.0, -260.5, 8.0, 5.3, 0.0),
    (79.0, 7.0, -260.5, 12.0, 4.0, 0.0),
]
for i, (cx, cy, cz, w, h, yaw) in enumerate(SMALL_BOARDS, start=1):
    named_quad(f"board_{i}", "board", cx, cy, cz, w, h, yaw, props={"board": i, "district": PL})
    nx, nz = math.sin(yaw), math.cos(yaw)
    oriented_box((PL, "board_frame", 0), cx - nx * 0.3, cy, cz - nz * 0.3, w + 0.5, h + 0.5, 0.5, yaw, scale=1.0)
# The blocks round the square and along the cross street are the avenue's
# kind: painted apartment walls, lived in, with the board hung on one. The
# camera cranes past them on its way from the hero to the board.
for i, (x0, x1, z0, z1, h, seed) in enumerate(((PX0, PX1, -284.0, -264.0, 44, 5103), (PX1, 140.0, -262.0, -188.0, 38, 5105))):
    mass(PL, x0, x1, z0, z1, SHOP_H, h, seed, painted=i)
    box((PL, "dark", 0), x0, x1, 0, SHOP_H, z0, z1, scale=2.0)
# The south side of the cross street, east of the avenue.
for i, (x0, x1, h, seed) in enumerate(((38, 60, 24, 5201), (60, 80, 30, 5202), (80, 104, 22, 5203), (104, 140, 28, 5204))):
    mass(PL, x0, x1, -170, -150, SHOP_H, h, seed, painted=(i + 2) % 3)
    box((PL, "dark", 0), x0, x1, 0, SHOP_H, -170, -150, scale=2.0)

# ---------------------------------------------------------------------------
# CORPO ROW. One tower per role, in experience.js order, west to east along a
# wide boulevard: a glass tower over a lit double-height lobby, stepped back
# once if it is tall, with a light fin up each corner and a dark glass crown.
# The fins and the band round the crown are one mesh per tower
# (crown_<slug>) the site lights in the organisation's own colour; the
# crown's face to the boulevard carries the organisation's logo
# (logo_<slug>, a slot the site sizes to the mark), and so does its face to
# the east (logo_<slug>_e), which the rooftop looks at; a vertical sign
# (sign_tower_<slug>) carries its name as type.
# ---------------------------------------------------------------------------
CO = "corpo"
TOWERS = [
    ("philips-zero-touch", 128), ("pinnatec-auto", 112), ("pawtograder", 104),
    ("aws-cloudformation", 146), ("top-choice-realty", 98), ("robert-defalco-realty", 108),
    ("northeastern", 124),
]
BOULEVARD_Z = -330.0
CORPO_X0 = 150.0
LOBBY_H = 8.0
CROWN_H = 16.0
ground((CO, "asphalt", 0), 110, 460, BOULEVARD_Z - 9, BOULEVARD_Z + 9, scale=6.0)
ground((CO, "asphalt", 0), 112, 128, BOULEVARD_Z + 9, CROSS_Z0, scale=6.0)
for x in range(114, 456, 9):
    quad((CO, "paint", 0), (x, 0.012, BOULEVARD_Z + 0.1), (x + 3, 0.012, BOULEVARD_Z + 0.1),
         (x + 3, 0.012, BOULEVARD_Z - 0.1), (x, 0.012, BOULEVARD_Z - 0.1))
ground((CO, "sidewalk", 0), 110, 460, BOULEVARD_Z - 14, BOULEVARD_Z - 9, y=0.15, scale=2.0)
ground((CO, "sidewalk", 0), 128, 460, BOULEVARD_Z + 9, BOULEVARD_Z + 14, y=0.15, scale=2.0)


def curtain(x0, x1, z0, z1, y0, y1, col, roof=True):
    """A glass curtain wall. The site's corporate shader draws its floors,
    mullions and light from world position; the colour is the tower's lit
    fraction, its warmth and a seed."""
    for a_, b_, c_, d_, length in _mass_sides(x0, x1, z0, z1, y0, y1).values():
        quad((CO, "corporate", 0), a_, b_, c_, d_, ((0, 0), (length, 0), (length, y1 - y0), (0, y1 - y0)), col)
    if roof:
        quad((CO, "roof", 0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0))


def lit_box(verts, faces, uvs, x0, x1, y0, y1, z0, z1, u):
    """A box's four sides into a mesh being built by hand, every corner at
    u (the site's towers shader reads u as what the piece is)."""
    for a_, b_, c_, d_, _ in _mass_sides(x0, x1, z0, z1, y0, y1).values():
        base = len(verts)
        verts.extend(P(*q) for q in (a_, b_, c_, d_))
        faces.append((base, base + 1, base + 2, base + 3))
        uvs.extend([(u, 0), (u, 0), (u, 1), (u, 1)])


for i, (slug, height) in enumerate(TOWERS):
    tx = CORPO_X0 + i * 38
    tz = BOULEVARD_Z - 30
    half = 13
    seed = 6000 + i
    r = random.Random(seed)
    col = (r.uniform(0.5, 0.75), r.random(), r.random(), 1.0)
    # The lobby: a lit glass box set back under a canopy, the core behind.
    box((CO, "dark", 0), tx - half, tx + half, 0, LOBBY_H, tz - half, tz + half - 1.6, scale=2.0)
    quad((CO, "lobby", 0), (tx - half + 0.6, 0.15, tz + half - 1.5), (tx + half - 0.6, 0.15, tz + half - 1.5),
         (tx + half - 0.6, LOBBY_H, tz + half - 1.5), (tx - half + 0.6, LOBBY_H, tz + half - 1.5),
         ((0, 0), (1, 0), (1, 1), (0, 1)), (r.random(), r.random(), 1.0, 1.0))
    box((CO, "metal", 0), tx - half, tx + half, LOBBY_H - 0.5, LOBBY_H, tz + half - 1.6, tz + half + 3.0, scale=1.0)
    # The shaft, stepped back once on the tall ones.
    step = height * 0.7 if height > 110 else None
    inset = 2.5 if step else 0.0
    if step:
        curtain(tx - half, tx + half, tz - half, tz + half, LOBBY_H, step, col)
        curtain(tx - half + inset, tx + half - inset, tz - half + inset, tz + half - inset, step, height, col)
    else:
        curtain(tx - half, tx + half, tz - half, tz + half, LOBBY_H, height, col)
    # The crown: a dark glass box, the logo on its faces to the boulevard
    # and to the rooftop, which sees the boulevard's face almost edge on.
    cw = half - inset - 1.5
    box((CO, "glass_dark", 0), tx - cw, tx + cw, height, height + CROWN_H, tz - cw, tz + cw, scale=2.0)
    top = height + CROWN_H
    empty("logo_" + slug, (tx, height + CROWN_H / 2, tz + cw + 0.06), props={"w": cw * 2 - 3.0, "h": CROWN_H - 3.0})
    empty("logo_" + slug + "_e", (tx + cw + 0.06, height + CROWN_H / 2, tz), yaw=math.pi / 2,
          props={"w": cw * 2 - 3.0, "h": CROWN_H - 3.0})
    # The accent: a fin up each corner of the shaft, a ring at the step, a
    # band round the top of the crown.
    verts, faces, uvs = [], [], []
    for sx, sz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        fx, fz = tx + sx * half, tz + sz * half
        lit_box(verts, faces, uvs, fx - 0.45, fx + 0.45, LOBBY_H + 1.0, step or height, fz - 0.45, fz + 0.45, 2.0)
        if step:
            gx, gz = tx + sx * (half - inset), tz + sz * (half - inset)
            lit_box(verts, faces, uvs, gx - 0.4, gx + 0.4, step, height, gz - 0.4, gz + 0.4, 2.0)
    if step:
        lit_box(verts, faces, uvs, tx - half - 0.1, tx + half + 0.1, step - 0.9, step, tz - half - 0.1, tz + half + 0.1, 0.5)
    lit_box(verts, faces, uvs, tx - cw - 0.15, tx + cw + 0.15, top - 2.2, top, tz - cw - 0.15, tz + cw + 0.15, 0.5)
    crown = bpy.data.meshes.new(PREFIX + "crown_" + slug)
    crown.from_pydata(verts, [], faces)
    layer = crown.uv_layers.new(name="UVMap")
    li = 0
    for f in faces:
        for vi in f:
            layer.data[li].uv = uvs[vi]
            li += 1
    crown.materials.append(MATS["crown"])
    obj = link(bpy.data.objects.new("crown_" + slug, crown))
    obj["tower"] = slug
    # The name, as type, on a tall sign below the step.
    sign_top = (step or height) - 4.0
    sign_bottom = LOBBY_H + 4.0
    sign("tower_" + slug, tx + half - 2.6, (sign_top + sign_bottom) / 2, tz + half + 0.08, 2.6, sign_top - sign_bottom, 0.0,
         preview=slug.upper(), district=CO)
    empty("anchor_tower_" + slug, (tx, top + 1.8, tz), props={"height": top})
for i in range(8):
    x0 = 130 + i * 40
    h = 22 + (i * 7) % 18
    mass(CO, x0, x0 + 34, BOULEVARD_Z + 14, BOULEVARD_Z + 40, SHOP_H, h, 6100 + i)
    box((CO, "dark", 0), x0, x0 + 34, 0, SHOP_H, BOULEVARD_Z + 14, BOULEVARD_Z + 40, scale=2.0)
    box((CO, "neon_" + ["cyan", "pink", "amber", "purple"][i % 4], 0), x0 + 2, x0 + 32, SHOP_H - 0.6, SHOP_H - 0.45,
        BOULEVARD_Z + 13.9, BOULEVARD_Z + 14.05, scale=1.0)

# ---------------------------------------------------------------------------
# THE ROOFTOP. About and Stack share it: a mid-height roof at the east end of
# corpo row, looking back west over the city. Water tanks, AC units,
# antennas, and nearby the AFTERLIFE and RIPPERDOC signs.
# ---------------------------------------------------------------------------
RF = "rooftop"
STREET_X = 440.0
RX0, RX1, RZ0, RZ1, RH = 452.0, 484.0, -300.0, -258.0, 34.0
mass(RF, RX0, RX1, RZ0, RZ1, SHOP_H, RH, 7001, roof_mat="roof_wet")
box((RF, "dark", 0), RX0, RX1, 0, SHOP_H, RZ0, RZ1, scale=2.0)
for (a0, a1, b0, b1) in ((RX0, RX1, RZ1 - 0.4, RZ1), (RX0, RX1, RZ0, RZ0 + 0.4), (RX0, RX0 + 0.4, RZ0, RZ1), (RX1 - 0.4, RX1, RZ0, RZ1)):
    box((RF, "concrete", 0), a0, a1, RH, RH + 1.1, b0, b1, scale=1.5)
for (cx, cz) in ((476.0, -270.0), (477.5, -285.0)):
    for lx, lz in ((-1.4, -1.4), (1.4, -1.4), (1.4, 1.4), (-1.4, 1.4)):
        box((RF, "metal", 1), cx + lx - 0.1, cx + lx + 0.1, RH, RH + 3.0, cz + lz - 0.1, cz + lz + 0.1, scale=0.5)
    cylinder((RF, "metal", 0), cx, cz, RH + 3.0, RH + 7.2, 2.1, segs=20)
    cylinder((RF, "dark", 1), cx, cz, RH + 7.2, RH + 7.6, 2.2, segs=20)
r = random.Random(7100)
for _ in range(9):
    cx, cz = r.uniform(RX0 + 3, RX1 - 8), r.uniform(RZ0 + 3, RZ1 - 3)
    box((RF, "metal", 1), cx - 1.0, cx + 1.0, RH, RH + 1.2, cz - 0.8, cz + 0.8, scale=0.8)
    cylinder((RF, "dark", 1), cx, cz, RH + 1.2, RH + 1.25, 0.55, segs=12)
for (cx, cz, h) in ((458.0, -296.0, 14.0), (482.0, -262.0, 9.0), (466.0, -262.0, 6.0)):
    cylinder((RF, "metal", 1), cx, cz, RH, RH + h, 0.09, segs=6)
    cylinder((RF, "neon_red", 0), cx, cz, RH + h, RH + h + 0.35, 0.16, segs=8)
# Two exhaust stacks between the camera and the signs, venting steam the
# site draws (anchor_steam_<n>) into the signs' light.
for i, (cx, cz, h) in enumerate(((466.0, -272.0, 1.6), (461.5, -268.5, 1.1))):
    cylinder((RF, "metal", 1), cx, cz, RH, RH + h, 0.28, segs=12)
    cylinder((RF, "dark", 1), cx, cz, RH + h, RH + h + 0.08, 0.34, segs=12)
    empty(f"anchor_steam_roof_{i}", (cx, RH + h + 0.1, cz))
# Rooftop signs are double-sided: they face the street, and the roof sees
# their other side.
RIPPER = (457.0, RH + 4.4, -283.0, math.radians(38))
rx_, ry_, rz_, ryaw = RIPPER
sign("ripperdoc", rx_, ry_, rz_, 9.0, 2.2, ryaw, double=True, preview="+ RIPPERDOC", district=RF)
for du in (-3.2, 3.2):
    oriented_box((RF, "metal", 1), rx_ + du * math.cos(ryaw), RH + 1.6, rz_ - du * math.sin(ryaw),
                 0.16, 3.2, 0.16, ryaw, scale=0.5)
mass(RF, 402.0, 432.0, -300.0, -262.0, SHOP_H, 30.0, 7201)
box((RF, "dark", 0), 402.0, 432.0, 0, SHOP_H, -300.0, -262.0, scale=2.0)
# A hair proud of its frame's face, or the two fight for the same pixels.
sign("afterlife", 431.26, 38.0, -281.0, 13.0, 3.0, math.radians(90), preview="AFTERLIFE", district=RF)
box((RF, "board_frame", 0), 430.6, 431.2, 36.2, 39.8, -288.0, -274.0, scale=1.0)
for dz in (-5.0, 5.0):
    box((RF, "metal", 1), 430.7, 431.0, 30.0, 36.2, -281.0 + dz - 0.1, -281.0 + dz + 0.1, scale=0.5)
mass(RF, 380.0, 410.0, -250.0, -222.0, SHOP_H, 58.0, 7301)
box((RF, "dark", 0), 380.0, 410.0, 0, SHOP_H, -250.0, -222.0, scale=2.0)
sign("militech", 410.4, 61.0, -236.0, 12.0, 2.6, math.radians(90), preview="MILITECH", district=RF)
ground((RF, "asphalt", 0), STREET_X - 8, STREET_X + 8, -322, -190, scale=6.0)
ground((RF, "sidewalk", 0), STREET_X + 8, STREET_X + 12, -300, -190, y=0.15, scale=2.0)
ground((RF, "sidewalk", 0), STREET_X - 12, STREET_X - 8, -300, -190, y=0.15, scale=2.0)

# ---------------------------------------------------------------------------
# THE GARAGE. A workshop on the street below the rooftop with a roll-up door
# (garage_door, which the site rolls up as the car comes): magenta fixtures
# on one wall, cyan on the other, as in the garage room. The car pulls in
# forward and stops on anchor_garage_bay facing +x, and the flight ends on
# GarageModel's front preset in the car's own space: in front of the car,
# looking back at it and out of the door.
# ---------------------------------------------------------------------------
GA = "garage"
GX0, GX1, GZ0, GZ1, GH = 452.0, 476.0, -230.0, -200.0, 8.0
DOOR_Z0, DOOR_Z1, DOOR_H = -218.0, -212.0, 4.6
BAY = (462.0, 0.0, -215.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, 0, GH, GZ0, DOOR_Z0, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, 0, GH, DOOR_Z1, GZ1, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX0 + 0.5, DOOR_H, GH, DOOR_Z0, DOOR_Z1, scale=2.0)
box((GA, "garage_wall", 0), GX1 - 0.5, GX1, 0, GH, GZ0, GZ1, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX1, 0, GH, GZ0, GZ0 + 0.5, scale=2.0)
box((GA, "garage_wall", 0), GX0, GX1, 0, GH, GZ1 - 0.5, GZ1, scale=2.0)
# The viewer's walls on these, a centimetre proud, at the viewer room's own
# scale set to this room's height (its 5.8 m to 8): the wall behind the car
# round the door (the viewer's front preset looks back past the car at it),
# its magenta wall on the car's passenger side (+z here) and its cyan wall on
# the driver's.
ROOM_K = GH / 5.8
bw = 14.6 * ROOM_K
zl, zr = -215.0 + bw / 2, -215.0 - bw / 2
u = lambda z: (zl - z) / bw  # noqa: E731
xw = GX0 + 0.51
for (za, zb, y0) in ((zl, DOOR_Z1, 0.0), (DOOR_Z0, zr, 0.0), (DOOR_Z1, DOOR_Z0, DOOR_H)):
    quad((GA, "garage_wall_back", 0), (xw, y0, za), (xw, y0, zb), (xw, GH, zb), (xw, GH, za),
         ((u(za), y0 / GH), (u(zb), y0 / GH), (u(zb), 1), (u(za), 1)))
sw = 17.0 * ROOM_K
u0, u1 = (sw - 23.0) / 2 / sw, 1 - (sw - 23.0) / 2 / sw
zp, zc = GZ1 - 0.51, GZ0 + 0.51
quad((GA, "garage_wall_magenta", 0), (GX1 - 0.5, 0, zp), (GX0 + 0.5, 0, zp), (GX0 + 0.5, GH, zp), (GX1 - 0.5, GH, zp),
     ((u0, 0), (u1, 0), (u1, 1), (u0, 1)))
quad((GA, "garage_wall_cyan", 0), (GX0 + 0.5, 0, zc), (GX1 - 0.5, 0, zc), (GX1 - 0.5, GH, zc), (GX0 + 0.5, GH, zc),
     ((u0, 0), (u1, 0), (u1, 1), (u0, 1)))
# Closed underneath: from inside, the ceiling the tubes hang from.
box((GA, "roof", 0), GX0, GX1, GH - 0.3, GH, GZ0, GZ1, scale=4.0, bottom=True)
mass(GA, GX0 - 0.02, GX1, GZ0, GZ1, SHOP_H, GH, 8002, faces=("-x", "+z"), roof=False)
ground((GA, "garage_floor", 0), GX0 + 0.5, GX1 - 0.5, GZ0 + 0.5, GZ1 - 0.5, y=0.01, scale=3.0)
box((GA, "door", 0), GX0 - 0.1, GX0 + 0.6, DOOR_H, DOOR_H + 0.55, DOOR_Z0 - 0.2, DOOR_Z1 + 0.2, scale=0.6)
box((GA, "neon_yellow", 0), GX0 - 0.12, GX0 - 0.08, 0.1, DOOR_H, DOOR_Z0 - 0.15, DOOR_Z0 - 0.05, scale=1.0)
box((GA, "neon_yellow", 0), GX0 - 0.12, GX0 - 0.08, 0.1, DOOR_H, DOOR_Z1 + 0.05, DOOR_Z1 + 0.15, scale=1.0)
# Over the door, outside: the bay's number, as the garage section has it,
# and a caged lamp either side, pooling amber on the pavement (no shaft in
# the haze: a wall lamp this close to the door would throw it indoors).
sign("bay", GX0 - 0.16, 6.25, (DOOR_Z0 + DOOR_Z1) / 2, 4.4, 1.1, -math.pi / 2, preview="BAY 01", district=GA)
# On the corner, a blade with the shop's name as the viewer's own room
# carries it (AFTERLIFE AUTO, in the garage room's cyan), turned along the
# street so the flight down it sees the garage coming.
sign("garage_blade", GX0 - 0.95, 5.2, GZ0 + 1.2, 1.2, 5.4, 0.0, double=True, preview="AFTERLIFE AUTO", district=GA)
for y in (2.7, 7.7):
    box((GA, "metal", 1), GX0 - 0.35, GX0, y - 0.05, y + 0.05, GZ0 + 1.15, GZ0 + 1.25, scale=0.5)
for z in (DOOR_Z0 - 1.1, DOOR_Z1 + 1.1):
    box((GA, "metal", 1), GX0 - 0.42, GX0 - 0.02, 5.2, 5.52, z - 0.2, z + 0.2, scale=0.5)
    box((GA, "neon_amber", 0), GX0 - 0.38, GX0 - 0.06, 5.16, 5.2, z - 0.16, z + 0.16, scale=0.5)
# Fixtures, as in the garage room: magenta on the car's passenger side
# (car -X, which is world +z in this bay), cyan on the driver's side, white
# overhead, so from GarageModel's front preset magenta is on the left.
box((GA, "tube", 0), GX0 + 2, GX1 - 2, 3.0, 3.12, GZ1 - 0.62, GZ1 - 0.5, scale=1.0, col=TUBE["pink"])
box((GA, "tube", 0), GX0 + 2, GX1 - 2, 3.0, 3.12, GZ0 + 0.5, GZ0 + 0.62, scale=1.0, col=TUBE["cyan"])
# (The washes that were high on each wall are the painted walls' own tubes
# now: the room's light comes off its walls, src/world/city.js.)
for z in (-219.5, -210.5):
    box((GA, "tube", 0), GX0 + 3, GX1 - 3, GH - 0.42, GH - 0.36, z - 0.06, z + 0.06, scale=1.0, col=TUBE["white"])
    box((GA, "tube", 0), GX0 + 3, GX1 - 3, GH - 0.36, GH - 0.33, z - 0.9, z + 0.9, scale=1.0, col=TUBE["white"])
box((GA, "metal", 1), GX1 - 1.4, GX1 - 0.5, 0, 0.95, -224, -206, scale=0.8)
box((GA, "tube", 0), GX1 - 0.56, GX1 - 0.5, 2.4, 2.46, -224, -206, scale=1.0, col=TUBE["amber"])
# The door itself, down, in the opening's guides; the site rolls it up into
# its drum (the "door" box over the opening) and back down behind a reader
# going back up the page.
named_quad("garage_door", "door_panel", GX0 + 0.12, DOOR_H / 2, (DOOR_Z0 + DOOR_Z1) / 2,
           DOOR_Z1 - DOOR_Z0 + 0.1, DOOR_H, -math.pi / 2, double=True)
# Over the bench, the monitor the garage's own room has, facing the door:
# the site plays the intro's moon on it.
named_quad("garage_screen", "screen", GX1 - 0.56, 3.55, -215.0, 3.4, 1.9, -math.pi / 2)
box((GA, "metal", 1), GX1 - 0.54, GX1 - 0.5, 2.5, 4.6, -216.9, -213.1, scale=1.0)
# Shop furniture, low and to the sides of the camera's way in: red tool
# chests and a pegboard on the cyan wall, tyres by the door, ducting and a
# hoist beam overhead, and the bay painted out on the floor round the car.
for x0 in (464.0, 466.4, 468.8):
    box((GA, "tool_red", 1), x0, x0 + 2.1, 0, 1.05, GZ0 + 0.5, GZ0 + 1.25, scale=1.0)
    for y in (0.3, 0.55, 0.8):
        box((GA, "dark", 1), x0 + 0.1, x0 + 2.0, y, y + 0.03, GZ0 + 1.25, GZ0 + 1.27, scale=1.0)
    box((GA, "metal", 1), x0 + 0.2, x0 + 1.9, 1.05, 1.1, GZ0 + 0.5, GZ0 + 1.3, scale=1.0)
box((GA, "dark", 1), 464.0, 471.0, 1.5, 3.1, GZ0 + 0.5, GZ0 + 0.56, scale=1.0)
for i in range(9):
    x = 464.5 + i * 0.72
    box((GA, "metal", 1), x, x + 0.08, 1.9 + (i % 3) * 0.3, 2.6 + (i % 2) * 0.2, GZ0 + 0.56, GZ0 + 0.62, scale=1.0)
for k, (tx, tz) in enumerate(((453.6, -222.4), (453.6, -221.3), (454.7, -222.4))):
    cylinder((GA, "dark", 1), tx, tz, 0.0, 0.9 if k < 2 else 0.6, 0.34, segs=12)
for z in (-224.0, -206.0):
    box((GA, "metal", 1), GX0 + 0.6, GX1 - 0.6, GH - 1.05, GH - 0.75, z - 0.18, z + 0.18, scale=1.0)
box((GA, "hazard", 0), 468.3, 468.6, GH - 0.72, GH - 0.42, GZ0 + 1, GZ1 - 1, scale=1.0)
box((GA, "metal", 1), 468.4, 468.5, 5.2, GH - 0.72, -219.05, -218.95, scale=1.0)
box((GA, "hazard", 1), 468.25, 468.65, 4.95, 5.2, -219.2, -218.8, scale=1.0)
for (a0, a1, b0, b1) in ((458.9, 465.1, -216.45, -216.3), (458.9, 465.1, -213.7, -213.55),
                         (458.9, 459.05, -216.45, -213.55), (464.95, 465.1, -216.45, -213.55)):
    box((GA, "hazard", 0), a0, a1, 0.011, 0.016, b0, b1, scale=1.0)
for i in range(8):
    z0 = DOOR_Z0 + 0.1 + i * 0.75
    box((GA, "hazard", 0), GX0 + 0.55, GX0 + 1.0, 0.011, 0.016, z0, z0 + 0.36, scale=1.0)
empty("anchor_garage_bay", BAY, yaw=math.pi / 2)
# Under the roof it does not rain: the site's rain skips this box.
empty("anchor_shelter_garage", (GX0, 0.0, GZ0), props={"size": [GX1 - GX0, GH - 0.3, GZ1 - GZ0]})
# The garage's street is lived in too: painted walls either side of the
# door and across the street from it, which the flight in comes down past.
# They stand wall to wall with it: a slot either side let the far city's
# ground through, a few metres from the flight's lens.
mass(GA, GX0, GX1, -258.0, -230.0, SHOP_H, 22.0, 8101, painted=0)
box((GA, "dark", 0), GX0, GX1, 0, SHOP_H, -258.0, -230.0, scale=2.0)
# Its roof, wet, is Contact's foreground: it holds the sky's glow.
mass(GA, GX0, GX1, -200.0, -176.0, SHOP_H, 7.0, 8102, painted=1, roof_mat="roof_wet")
box((GA, "dark", 0), GX0, GX1, 0, SHOP_H, -200.0, -176.0, scale=2.0)
mass(GA, 410.0, STREET_X - 12, -250.0, -190.0, SHOP_H, 26.0, 8201, painted=2)
box((GA, "dark", 0), 410.0, STREET_X - 12, 0, SHOP_H, -250.0, -190.0, scale=2.0)
# Its ground floor faces the garage door: lit shops and a strip of neon, so
# the street outside the door is not a black hole from inside the bay.
box((GA, "shop", 0), STREET_X - 12.02, STREET_X - 12.0, 0.6, 3.3, -246.0, -194.0, scale=2.0)
box((GA, "neon_pink", 0), STREET_X - 12.05, STREET_X - 11.9, 3.9, 4.05, -246.0, -194.0, scale=1.0)
box((GA, "neon_cyan", 0), STREET_X - 12.05, STREET_X - 11.9, 5.6, 5.7, -238.0, -202.0, scale=1.0)
for z in (-236.0, -214.0, -196.0):
    cylinder((GA, "metal", 1), STREET_X - 9.0, z, 0.15, 6.2, 0.08, segs=8)
    box((GA, "neon_amber", 0), STREET_X - 8.2, STREET_X - 7.4, 6.0, 6.1, z - 0.15, z + 0.15, scale=0.5)
    LAMPS.append((STREET_X - 7.8, 6.0, z))
for i, pos in enumerate(LAMPS):
    empty(f"anchor_lamp_{i}", pos)
for (a0, a1, b0, b1) in ((GX0, GX1, GZ1 - 0.3, GZ1), (GX0, GX1, GZ0, GZ0 + 0.3), (GX0, GX0 + 0.3, GZ0, GZ1)):
    box((GA, "concrete", 0), a0, a1, GH, GH + 0.9, b0, b1, scale=1.5)
cylinder((GA, "metal", 1), 472.0, -226.0, GH, GH + 7.0, 0.07, segs=6)
cylinder((GA, "neon_red", 0), 472.0, -226.0, GH + 7.0, GH + 7.3, 0.14, segs=8)

# The moon: a huge disc over the southern skyline, which only the Contact
# shot looks at. The site maps the intro's own moon image onto it.
MOON = (760.0, 330.0, 440.0, 150.0)
mx, my, mz, mr = MOON
to_cam = Vector((458.0 - mx, 12.0 - my, -206.0 - mz)).normalized()
moon_yaw = math.atan2(to_cam.x, to_cam.z)
named_quad("moon_disc", "moon", mx, my, mz, mr * 2, mr * 2, moon_yaw, props={"district": "sky"})
empty("anchor_moon", (mx, my, mz), props={"radius": mr})

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

# ---------------------------------------------------------------------------
# Preview only: sign words, a few lamps, the night. None of this exports.
# ---------------------------------------------------------------------------
# Its own font datablock, never one another scene loaded from the same file,
# and not packed: the words are a preview on this Mac, not part of the kit.
font = bpy.data.fonts.get(PREFIX + "preview_font")
if font is None:
    font = bpy.data.fonts.load("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", check_existing=False)
    font.name = PREFIX + "preview_font"
for sid, text, (cx, cy, cz), w, h, yaw in SIGNS:
    data = bpy.data.curves.new(PREFIX + "txt_" + sid, "FONT")
    vertical = h > w * 1.6
    data.body = "\n".join(text) if vertical else text
    data.font = font
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = min(w / max(1, len(text)) * 1.5, h * 0.7) if not vertical else min(w * 0.8, h / max(1, len(text)) * 0.9)
    data.space_line = 0.95
    obj = bpy.data.objects.new(PREFIX + "txt_" + sid, data)
    nx, nz = math.sin(yaw), math.cos(yaw)
    obj.location = P(cx + nx * 0.03, cy, cz + nz * 0.03)
    obj.rotation_euler = (math.pi / 2, 0, yaw)
    data.materials.append(MATS["neon_white"])
    link(obj, preview_coll)

world = bpy.data.worlds.new(PREFIX + "night")
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (*rgb("0b0a12"), 1)
bg.inputs["Strength"].default_value = 0.6
scene.world = world


def lamp(name, pos, hex_color, power, radius=0.5):
    data = bpy.data.lights.new(PREFIX + name, "POINT")
    data.color = rgb(hex_color)
    data.energy = power
    data.shadow_soft_size = radius
    obj = bpy.data.objects.new(PREFIX + name, data)
    obj.location = P(*pos)
    link(obj, preview_coll)


for i, (x, z, c) in enumerate(((-11, -16.5, "ff2e88"), (11.5, -28, "27dcf2"), (-11, -47, "2f6bff"), (11, -60, "ff003c"),
                               (-11, -80, "2ee6c8"), (11, -52, "27dcf2"), (0, -80, "2ee6c8"), (-11, -104, "ff3fd2"),
                               (11, -115, "ff2e88"), (0, -140, "ffb254"))):
    lamp(f"spill_{i}", (x, 5.0, z), c, 3500)
lamp("board_spill", (79.0, 20.0, -250.0), "fcee0a", 40000, 4.0)
lamp("garage_pink", (464.0, 3.0, -203.0), "ff278d", 2500)
lamp("garage_cyan", (464.0, 3.0, -227.0), "27dcf2", 2500)

# ---------------------------------------------------------------------------
# Finish the batches into meshes, one per (district, material, detail).
# ---------------------------------------------------------------------------
tri_count = 0
for (district, mat_name, detail), b in batches.items():
    if not b.faces:
        continue
    mesh = bpy.data.meshes.new(f"{PREFIX}{district}_{mat_name}_{detail}")
    mesh.from_pydata(b.verts, [], b.faces)
    uv_layer = mesh.uv_layers.new(name="UVMap")
    col_layer = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="CORNER")
    mesh.color_attributes.active_color = col_layer
    mesh.color_attributes.render_color_index = 0
    li = 0
    for f in mesh.polygons:
        for loop_index in f.loop_indices:
            uv_layer.data[loop_index].uv = b.uvs[li]
            col_layer.data[loop_index].color = b.cols[li]
            li += 1
    mesh.materials.append(MATS[mat_name])
    mesh.validate()
    obj = bpy.data.objects.new(f"{district}_{mat_name}" + ("_detail" if detail else ""), mesh)
    obj["district"] = district
    obj["detail"] = detail
    link(obj)
    tri_count += sum(len(p.vertices) - 2 for p in mesh.polygons)

# ---------------------------------------------------------------------------
# Render settings for the Cycles reference, then save and export.
# ---------------------------------------------------------------------------
scene.render.engine = "CYCLES"
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.render.resolution_x = 1600
scene.render.resolution_y = 1000
scene.view_settings.view_transform = "AgX"
scene.render.image_settings.file_format = "PNG"

bpy.context.window.scene = scene
for obj in scene.objects:
    obj.select_set(False)
exported = [o for o in export_coll.objects]
for obj in exported:
    obj.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT / "world-source.glb"), export_format="GLB", use_selection=True,
    use_active_scene=True, export_apply=True, export_extras=True, export_cameras=False,
    export_lights=False, export_yup=True, export_vertex_color="NAME", export_vertex_color_name="Col",
    export_all_vertex_colors=False,
)
for obj in exported:
    obj.select_set(False)
bpy.data.libraries.write(str(OUT / "night-city-world.blend"), {scene}, path_remap="RELATIVE_ALL",
                         fake_user=True, compress=True)
print({"scene": scene.name, "objects": len(scene.objects), "exported": len(exported),
       "meshes": len([o for o in exported if o.type == "MESH"]), "triangles": tri_count,
       "signs": len(SIGNS), "road_points": len(road)})
