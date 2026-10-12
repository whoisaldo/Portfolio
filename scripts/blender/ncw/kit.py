"""The shared kit every district of the city is built from.

Scene setup, materials (whose names are the contract with src/world/city.js),
the geometry batches and primitives, the named objects the site reads, the
street standard (lanes, kerbs, storeys) and the builders a district uses:
masses, prisms, roofs, shopfronts, signs, fire escapes. A district module
imports all of it; the order the modules run in is the order the old single
script ran in, so the export is the same file.
"""
import bpy
import math
import random
from collections import defaultdict
from pathlib import Path
from mathutils import Vector

import ncw

ROOT = Path(ncw.ROOT)

OUT = ROOT / "design/night-city-world"
TEX = OUT / "textures"
GARAGE_TEX = ROOT / "design/night-city-garage/textures"
OUT.mkdir(parents=True, exist_ok=True)
NAME = "Night_City_World"
PREFIX = "NCW_"

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
material("crown_glass", "0d1418", metal=0.6, rough=0.12)
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
# The same light high over the street, which the site leaves out of the
# light it bakes onto the ground (src/world/city.js): rooftop signs, a stair
# hut's door, an antenna's lamp. One material, each piece's colour on its
# vertices (as the garage's tubes), so all of it is one draw.
material("glow", "ffffff", emit=6.0)
GLOW = {key: (*rgb(hex_color), 1) for key, hex_color in NEON.items()}
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
# Ledges, slabs, pilasters, parapets, fascias: one material, each piece's
# own colour on its vertices (its building's tint), lit by the street like
# any surface, so every building's trim in a district is one draw.
material("trim", "ffffff", rough=0.8)
# Surfaces dressed as what they are made of (src/world/kinds.js draws each
# in world space, no UVs needed), each piece's own colour on its vertices:
# sheet cladding for sheds and depots, a container's ribbed side, a tank's
# rolled plate in bands, painted steel for gantries, frames and canopies,
# board-marked poured concrete for piers, decks and parapets, and render.
for _kind, _rough in (("corrugated", 0.6), ("container", 0.6), ("tankplate", 0.55), ("steel", 0.5), ("castconcrete", 0.9), ("plaster", 0.85)):
    material(_kind, "ffffff", rough=_rough)
# A roof light: glazing with bars every 1.2 m and each pane its own
# brightness, never past white (src/world/materials.js).
material("skylight", "ffffff", emit=1.2)
# A billboard with no words (src/world/materials.js draws its adverts):
# each board's palette, shape and seed in its vertex colour.
material("billboard", "ffffff", emit=1.5)

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
# The same windows, for the vista's end (the site fogs it less).
build_facade_nodes(material("facade_end", "1a1c21", rough=0.85))

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


def pipe(key, a, b, r, segs=8, col=(1, 1, 1, 1), caps=False):
    """A cylinder from point a to point b (any direction), radius r."""
    ax = Vector(b) - Vector(a)
    length = ax.length
    w = ax.normalized()
    up = Vector((0, 1, 0)) if abs(w.y) < 0.9 else Vector((1, 0, 0))
    u = w.cross(up).normalized()
    v = w.cross(u).normalized()
    ring = [(u * math.cos(t) + v * math.sin(t)) * r for t in (i * math.tau / segs for i in range(segs))]
    A, B = Vector(a), Vector(b)
    for i in range(segs):
        p0, p1 = ring[i], ring[(i + 1) % segs]
        quad(key, tuple(A + p0), tuple(A + p1), tuple(B + p1), tuple(B + p0),
             ((i / segs, 0), ((i + 1) / segs, 0), ((i + 1) / segs, length), (i / segs, length)), col)
    if caps:
        poly(key, [tuple(B + p) for p in ring], [(0.5 + p.dot(u) / (2 * r), 0.5 + p.dot(v) / (2 * r)) for p in ring], col)
        poly(key, [tuple(A + p) for p in reversed(ring)], [(0.5, 0.5)] * segs, col)


def dish(key, c, facing, r, depth=0.35, segs=14, col=(1, 1, 1, 1)):
    """A satellite dish: a shallow bowl of radius r opening toward `facing`,
    its back a cone to a feed arm."""
    w = Vector(facing).normalized()
    up = Vector((0, 1, 0)) if abs(w.y) < 0.9 else Vector((1, 0, 0))
    u = w.cross(up).normalized()
    v = w.cross(u).normalized()
    C = Vector(c)
    rim = [C + (u * math.cos(t) + v * math.sin(t)) * r for t in (i * math.tau / segs for i in range(segs))]
    back = C - w * depth
    for i in range(segs):
        p0, p1 = rim[i], rim[(i + 1) % segs]
        # The bowl's face and its back, both sides of the rim.
        poly(key, [tuple(back + w * depth * 0.4), tuple(p0), tuple(p1)], [(0.5, 0.5), (0, 1), (1, 1)], col)
        poly(key, [tuple(back), tuple(p1), tuple(p0)], [(0.5, 0.5), (1, 1), (0, 1)], col)
    pipe(key, tuple(C + w * 0.05), tuple(C + w * r * 0.9), 0.025, segs=4, col=col)


def site_lamp(name, pos, hex_color, reach, power=1.0):
    """A lamp the site lights nearby surfaces with (src/world/glsl.js,
    lampsAt): a point, a colour, how far its light reaches."""
    empty("lamp_" + name, pos, props={"color": hex_color, "reach": reach, "power": power})


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


# People who stand about (the walkers come from streets.life): a district
# sets them down where its stalls, queues, benches, doorways and roof decks
# are, and the site draws them (src/world/crowd.js, from anchor_people).
POSES = ("idle", "talk", "lean", "sit", "phone", "squat", "vendor", "smoke")
PEOPLE = []


def stand(x, z, yaw=0.0, pose="idle", y=0.0):
    """Someone at (x, y, z), world metres, y at their feet (a seat's top for
    "sit"), facing yaw: radians about +y, 0 looking toward +z (south), pi/2
    toward +x (east). "talk" faces a partner (set two down facing each
    other), "lean" has a wall or a rail behind them, "vendor" stands behind
    a counter facing out, "squat" is low at a kerb or a doorway."""
    PEOPLE.append((round(x, 2), round(y, 2), round(z, 2), round(yaw, 3), POSES.index(pose)))


SIGNS = []  # (id, preview text) for the preview text objects


# The street's standard signs (st_<size>_<n>, a few thousand faces) are not
# a mesh each: a glTF mesh costs about a kilobyte before its first triangle.
# They are batched per district into one mesh of the sign material, each
# face's index in STREET_SIGN_IDS written exactly into its vertices' colour
# (three bytes, which the GLB's 8-bit colour keeps), and the ids on an empty,
# signs_index; src/world/city.js cuts the batch back into faces.
STREET_SIGN_IDS = []


def sign(sid, cx, cy, cz, w, h, yaw, double=False, preview=None, district="avenue", label=True):
    """A sign face. Its words and colours are copy, in src/data/world.js."""
    if sid.startswith("st_") and not label and not double:
        i = len(STREET_SIGN_IDS)
        STREET_SIGN_IDS.append(sid)
        col = ((i % 256) / 255.0, ((i // 256) % 256) / 255.0, (i // 65536) / 255.0, 1.0)
        rotated_quad((district, "sign", 0), cx, cy, cz, w, h, yaw, col=col)
        return
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


def mass(district, x0, x1, z0, z1, y0, y1, seed, faces="all", col=None, roof=True, painted=None, roof_mat="roof", mat="facade"):
    r = random.Random(seed)
    if col is None:
        col = (r.uniform(0.28, 0.62), r.randrange(0, 5) / 8.0, r.uniform(0.2, 1.0), 1.0)
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
    k = (district, mat, 0)
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


def walls(key, outline, y0, y1, col):
    """Vertical faces along a closed outline, outward normals."""
    for (xa, za), (xb, zb) in zip(outline, outline[1:] + outline[:1]):
        length = math.hypot(xb - xa, zb - za)
        quad(key, (xa, y0, za), (xb, y0, zb), (xb, y1, zb), (xa, y1, za),
             ((0, 0), (length, 0), (length, y1 - y0), (0, y1 - y0)), col)


def cut_rect(cx, cz, hx, hz, c=0.0):
    """A rectangle of half sizes hx and hz with its corners cut back c,
    walked with the outside on the left of each edge, as notched() is."""
    if c <= 0:
        pts = [(-hx, hz), (hx, hz), (hx, -hz), (-hx, -hz)]
    else:
        pts = [(-hx + c, hz), (hx - c, hz), (hx, hz - c), (hx, -hz + c), (hx - c, -hz), (-hx + c, -hz),
               (-hx, -hz + c), (-hx, hz - c)]
    return [(cx + x, cz + z) for x, z in pts]


def prism(district, outline, y0, y1, seed, col=None, mat="facade", roof=True, roof_mat="roof"):
    """A mass on any plan: walls along the outline with the facade shader's
    window cells running on round its corners, and a flat roof. The plan's
    own centre is the roof's UV origin."""
    r = random.Random(seed)
    if col is None:
        col = (r.uniform(0.28, 0.62), r.randrange(0, 5) / 8.0, r.uniform(0.2, 1.0), 1.0)
    k = (district, mat, 0)
    u = r.uniform(0, 40)
    ov = r.uniform(0, 40)
    v0, v1 = ov + (y0 - SHOP_H) / CELL_H, ov + (y1 - SHOP_H) / CELL_H
    for (xa, za), (xb, zb) in zip(outline, outline[1:] + outline[:1]):
        u1 = u + math.hypot(xb - xa, zb - za) / CELL_W
        quad(k, (xa, y0, za), (xb, y0, zb), (xb, y1, zb), (xa, y1, za), ((u, v0), (u1, v0), (u1, v1), (u, v1)), col)
        u = u1
    if roof:
        poly((district, roof_mat, 0), [(x, y1, z) for x, z in outline], [(x / 4, z / 4) for x, z in outline])
    return col


def band(district, outline, y0, y1, colour, out=0.4):
    """A lit band round a plan, standing `out` proud of its walls."""
    xs = [x for x, _ in outline]
    zs = [z for _, z in outline]
    cx, cz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    hx, hz = (max(xs) - min(xs)) / 2, (max(zs) - min(zs)) / 2
    grown = [(cx + (x - cx) * (hx + out) / hx, cz + (z - cz) * (hz + out) / hz) for x, z in outline]
    walls((district, "neon_" + colour, 0), grown, y0, y1, (1, 1, 1, 1))


ROOF_SIGN_COLOURS = ["pink", "cyan", "amber", "magenta", "green", "purple", "red", "teal"]


# The hero's lens (16:10 at rest and a metre into its push, and a phone's)
# and what it frames over the canyon: ARASAKA's name, the figure above the
# last roofs, the megablock's cyan sign at the vanishing point. A roof the
# hero looks along is dressed only with what it cannot see: nothing that
# shows over the canyon's own masses (HERO_MASSES, the lots and their
# crowns, filled as they are built) and nothing across those three, so the
# plate's band of sky keeps its line.
HERO_EYES = ((0.6, 0.6, 10.0), (0.6, 0.6, 9.0), (0.6, 0.8, 30.0))
HERO_KEEP = (((53.0, 151.5, -467.4), (97.0, 166.5, -467.4)),
             ((-64.4, 110.0, -570.0), (39.6, 232.0, -570.0)),
             ((-10.1, 14.0, -748.6), (-7.9, 74.0, -748.6)))
HERO_MASSES = []


def _crosses(o, p, lo, hi):
    """Whether the segment o->p passes through the box lo..hi."""
    t0, t1 = 0.0, 1.0
    for i in range(3):
        dd = p[i] - o[i]
        if abs(dd) < 1e-9:
            if o[i] < lo[i] or o[i] > hi[i]:
                return False
            continue
        ta, tb = (lo[i] - o[i]) / dd, (hi[i] - o[i]) / dd
        if ta > tb:
            ta, tb = tb, ta
        t0, t1 = max(t0, ta), min(t1, tb)
        if t0 > t1:
            return False
    return True


def hero_covers(lo, hi):
    """Whether a box lies across anything the hero frames over the canyon."""
    for e in HERO_EYES:
        for a, b in HERO_KEEP:
            for u in (0.0, 0.25, 0.5, 0.75, 1.0):
                for v in (0.0, 0.25, 0.5, 0.75, 1.0):
                    q = (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * v, a[2])
                    if _crosses(e, q, lo, hi):
                        return True
    return False


def hero_sees(lo, hi):
    """Whether the hero's lens sees any of a box's top over the canyon's own
    masses."""
    y = hi[1]
    for e in HERO_EYES:
        for x in (lo[0], (lo[0] + hi[0]) / 2, hi[0]):
            for z in (lo[2], (lo[2] + hi[2]) / 2, hi[2]):
                if not any(_crosses(e, (x, y, z), mlo, mhi) for mlo, mhi in HERO_MASSES):
                    return True
    return False


def dress_roof(district, x0, x1, z0, z1, top, seed, cap=6.0, face=None, parapet=True, hero=False):
    """What stands on a city roof: a parapet round its edge and, by the
    roof's own draw, a water tank on its stand, a stair hut with its door
    lit, air conditioners, a plant room, an antenna with a lamp at its tip,
    and now and then a sign on two posts, its strokes drawn in light. Nothing
    rises more than `cap` metres (a roof in a framed band of sky keeps it
    low). A sign faces `face` (a yaw; 0 is +z) or the roof's long side.
    `hero`: a roof the hero looks along keeps only what its lens cannot
    see (hero_sees, hero_covers), parapet and all, so the canyon's roofline
    in the hero is the one the plate was matched to."""
    r = random.Random(seed)
    w, d = x1 - x0, z1 - z0
    fits = lambda lo, hi: not hero or not (hero_sees(lo, hi) or hero_covers(lo, hi))
    if parapet:
        t, ph = 0.3, 0.9
        for (a0, a1, b0, b1) in ((x0, x1, z1 - t, z1), (x0, x1, z0, z0 + t), (x0, x0 + t, z0 + t, z1 - t),
                                 (x1 - t, x1, z0 + t, z1 - t)):
            if hero and (hero_sees((a0, top, b0), (a1, top + ph, b1)) or hero_covers((a0, top, b0), (a1, top + ph, b1))):
                continue
            box((district, "concrete", 0), a0, a1, top, top + ph, b0, b1, scale=1.5)
    if w < 7 or d < 7:
        return
    # A grid of plots on the roof, one thing on each, clear of the parapet.
    nx, nz = max(1, int(w // 7)), max(1, int(d // 7))
    plots = [(x0 + 1.2 + (i + 0.5) * (w - 2.4) / nx, z0 + 1.2 + (j + 0.5) * (d - 2.4) / nz,
              (w - 2.4) / nx, (d - 2.4) / nz) for i in range(nx) for j in range(nz)]
    r.shuffle(plots)
    signed = False
    for k, (px, pz, pw, pd) in enumerate(plots[:6]):
        kind = r.random()
        if k == 0 and cap >= 4.0 and min(pw, pd) > 3.2:
            # A water tank on its stand, the roof's signature.
            rr = min(1.4, min(pw, pd) * 0.3)
            legs = min(1.9, cap - 2.6)
            if not fits((px - rr * 1.06, top, pz - rr * 1.06), (px + rr * 1.06, top + legs + 2.45, pz + rr * 1.06)):
                continue
            for lx, lz in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
                box((district, "metal", 1), px + lx * rr * 0.7 - 0.08, px + lx * rr * 0.7 + 0.08, top, top + legs,
                    pz + lz * rr * 0.7 - 0.08, pz + lz * rr * 0.7 + 0.08, scale=0.5)
            cylinder((district, "metal", 0), px, pz, top + legs, top + legs + 2.2, rr, segs=8)
            cylinder((district, "dark", 0), px, pz, top + legs + 2.2, top + legs + 2.45, rr * 1.06, segs=8)
        elif k == 1 and min(pw, pd) > 3.0:
            # A stair hut, its door lit and a lamp over it.
            hw_, hd_, hh_ = min(1.7, pw * 0.4), min(1.4, pd * 0.4), min(2.7, cap - 0.2)
            if not fits((px - hw_, top, pz - hd_ - 0.2), (px + hw_, top + max(hh_, 2.4), pz + hd_ + 0.2)):
                continue
            box((district, "concrete", 0), px - hw_, px + hw_, top, top + hh_, pz - hd_, pz + hd_, scale=1.5)
            side = r.choice((-1, 1))
            dz = pz + side * (hd_ + 0.02)
            if side > 0:
                quad((district, "glow", 0), (px - 0.45, top, dz), (px + 0.45, top, dz), (px + 0.45, top + 2.0, dz), (px - 0.45, top + 2.0, dz), col=GLOW["amber"])
            else:
                quad((district, "glow", 0), (px + 0.45, top, dz), (px - 0.45, top, dz), (px - 0.45, top + 2.0, dz), (px + 0.45, top + 2.0, dz), col=GLOW["amber"])
            box((district, "glow", 0), px - 0.12, px + 0.12, top + 2.25, top + 2.4, dz - 0.1 * side - 0.06, dz - 0.1 * side + 0.06, scale=0.5, col=GLOW["white"])
        elif kind < 0.45:
            # Air conditioners, a pair or three in a row.
            count = r.randrange(2, 4)
            if not fits((px - pw * 0.3 - 0.7, top, pz - 0.5), (px + pw / 2, top + 0.95, pz + 0.5)):
                continue
            for n in range(count):
                ax_ = px - pw * 0.3 + n * 1.6
                if ax_ + 0.7 > px + pw / 2:
                    break
                box((district, "metal", 1), ax_ - 0.7, ax_ + 0.7, top, top + 0.95, pz - 0.5, pz + 0.5, scale=0.8)
        elif kind < 0.7:
            # A plant room with a duct running off it.
            pw2, pd2 = pw * 0.36, pd * 0.32
            ph2 = min(2.4, cap - 0.4)
            if not fits((px - pw2 - 0.1, top, pz - pd2 - 0.1), (px + pw2 + pw * 0.3, top + ph2 + 0.12, pz + pd2 + 0.1)):
                continue
            box((district, "metal", 0), px - pw2, px + pw2, top, top + ph2, pz - pd2, pz + pd2, scale=1.0)
            box((district, "dark", 1), px - pw2 - 0.1, px + pw2 + 0.1, top + ph2, top + ph2 + 0.12, pz - pd2 - 0.1, pz + pd2 + 0.1, scale=1.0)
            box((district, "metal", 1), px + pw2, px + pw2 + pw * 0.3, top + 0.4, top + 1.0, pz - 0.3, pz + 0.3, scale=0.8)
        elif kind < 0.86 and cap >= 5.0:
            # An antenna, guyed, a red lamp at its tip.
            ah = min(cap, 4.5 + r.random() * 3.0)
            if not fits((px - 0.7, top, pz - 0.1), (px + 0.7, top + ah + 0.2, pz + 0.1)):
                continue
            cylinder((district, "metal", 1), px, pz, top, top + ah, 0.06, segs=4, cap=False)
            for y in (top + ah * 0.55, top + ah * 0.8):
                box((district, "metal", 1), px - 0.7, px + 0.7, y, y + 0.05, pz - 0.03, pz + 0.03, scale=0.5)
            box((district, "glow", 0), px - 0.1, px + 0.1, top + ah, top + ah + 0.2, pz - 0.1, pz + 0.1, scale=0.5, col=GLOW["red"])
        elif not signed and cap >= 5.0 and max(pw, pd) > 5.0:
            # A sign on two posts, facing the street.
            yaw = face if face is not None else (0.0 if w >= d else math.pi / 2)
            sw, sh = min(5.6, max(pw, pd) * 0.8), 1.9
            sy = top + min(cap, 5.4) - sh / 2 - 0.2
            if not fits((px - sw / 2 - 0.2, top, pz - sw / 2 - 0.2), (px + sw / 2 + 0.2, sy + sh / 2 + 0.2, pz + sw / 2 + 0.2)):
                continue
            signed = True
            for du in (-sw * 0.38, sw * 0.38):
                cxp, czp = px + math.cos(yaw) * du, pz - math.sin(yaw) * du
                box((district, "metal", 1), cxp - 0.08, cxp + 0.08, top, sy - sh / 2, czp - 0.08, czp + 0.08, scale=0.5)
            oriented_box((district, "board_frame", 0), px, sy, pz, sw + 0.3, sh + 0.3, 0.22, yaw, scale=1.0)
            colour = r.choice(ROOF_SIGN_COLOURS)
            nxf, nzf = math.sin(yaw), math.cos(yaw)
            # The tube round its edge and three characters' worth of strokes,
            # drawn on both faces (a quad each, facing out).
            strokes = [((u0 + u1) / 2 * sw, (v0 + v1) / 2 * sh, (u1 - u0) * sw, (v1 - v0) * sh)
                       for (u0, u1, v0, v1) in ((-0.5, 0.5, 0.44, 0.5), (-0.5, 0.5, -0.5, -0.44), (-0.5, -0.47, -0.5, 0.5), (0.47, 0.5, -0.5, 0.5))]
            for g in range(3):
                gu = (-1 + g) * sw * 0.28
                for _ in range(r.randrange(2, 4)):
                    vert = r.random() < 0.5
                    su = r.uniform(-0.08, 0.08) * sw
                    sv = r.uniform(-0.25, 0.25) * sh
                    gw, gh = (0.14, sh * r.uniform(0.35, 0.6)) if vert else (sw * r.uniform(0.12, 0.2), 0.14)
                    strokes.append((gu + su, sv, gw, gh))
            for sd, fy in ((1, yaw), (-1, yaw + math.pi)):
                ox, oz = px + nxf * 0.12 * sd, pz + nzf * 0.12 * sd
                for cu, cv, gw, gh in strokes:
                    rotated_quad((district, "glow", 0), ox + math.cos(yaw) * cu, sy + cv, oz - math.sin(yaw) * cu, gw, gh, fy, col=GLOW[colour])


def shopfront(district, side, z0, z1, seed, awning=True, xf=None):
    """The lit ground floor of a lot on the avenue, facing the street (or on
    any wall along z, at xf)."""
    r = random.Random(seed)
    s = 1 if side > 0 else -1
    xf = s * WALK if xf is None else xf
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


def ac_units(district, side, z0, z1, y0, y1, seed, xw=None):
    r = random.Random(seed)
    s = 1 if side > 0 else -1
    W = s * WALK if xw is None else xw
    for _ in range(r.randrange(2, 6)):
        y = r.uniform(y0, y1)
        z = r.uniform(z0 + 1, z1 - 1)
        xa, xb = sorted((W, W - s * 0.55))
        box((district, "metal", 1), xa, xb, y, y + 0.55, z - 0.4, z + 0.4, scale=0.6)


def ledges(district, side, z0, z1, y0, y1, step=CELL_H):
    s = 1 if side > 0 else -1
    y = y0
    while y < y1 - 0.5:
        xa, xb = sorted((s * WALK, s * (WALK - 0.25)))
        box((district, "concrete", 0), xa, xb, y - 0.12, y, z0, z1, scale=2.0)
        y += step


def fire_escape(district, side, zc, y0, y1, xw=None):
    s = 1 if side > 0 else -1
    W = s * WALK if xw is None else xw
    x_out = W - s * 1.1
    y = y0
    k = (district, "metal", 1)
    while y < y1:
        xa, xb = sorted((W, x_out))
        box(k, xa, xb, y, y + 0.06, zc - 2.2, zc + 2.2, scale=0.5)
        # Railings.
        ra, rb = sorted((x_out, x_out + s * 0.05))
        box(k, ra, rb, y, y + 1.0, zc - 2.2, zc + 2.2, scale=0.5)
        # The stair to the next landing.
        quad(k, (x_out - s * 0.1, y + 0.06, zc - 2.0), (x_out - s * 0.9, y + 0.06, zc - 2.0),
             (x_out - s * 0.9, y + CELL_H, zc + 1.6), (x_out - s * 0.1, y + CELL_H, zc + 1.6))
        y += CELL_H


PANEL_COLOURS = ["pink", "cyan", "magenta", "amber", "red", "blue", "teal", "purple", "green", "white"]


def clutter(district, side, z0, z1, top, seed, xw=None):
    """The signs a Night City facade collects: blades standing out from the
    wall at every height and boards flat on it, each one a standard sign the
    site paints (ST_SIZES), plus neon along the ledges. Most are blades
    because the street is seen end-on: a board flat on a wall is a sliver
    from the intersection, a blade faces the lens. The wall is the avenue's
    (WALK) unless `xw` puts it elsewhere; `side` says which way it faces."""
    r = random.Random(seed)
    s = 1 if side > 0 else -1
    W = s * WALK if xw is None else xw
    ceiling = max(SHOP_H + 2.4, min(top - 1.0, 26.0))
    for _ in range(r.randrange(6, 12)):
        if r.random() < 0.66:
            # A blade, painted on both faces, reading up and down the street.
            size = r.choices(["bs", "bm", "bl", "bx"], weights=[3, 4, 2, 2])[0]
            w, h = ST_SIZES[size]
            y = r.uniform(SHOP_H + 0.6 + h / 2, max(SHOP_H + 0.7 + h / 2, ceiling - h / 2))
            z = r.uniform(z0 + 0.6, z1 - 0.6)
            x = W - s * (0.35 + w / 2)
            xa, xb = sorted((x - w / 2 - 0.06, x + w / 2 + 0.06))
            box((district, "board_frame", 0), xa, xb, y - h / 2 - 0.07, y + h / 2 + 0.07, z - 0.08, z + 0.08, scale=1.0)
            sid = st_name(size)
            sign(sid, x, y, z + 0.09, w, h, 0.0, district=district, label=False)
            sign(sid + "_b", x, y, z - 0.09, w, h, math.pi, district=district, label=False)
            ya = y + h / 2 + 0.07
            ba, bb = sorted((W, x))
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
            xa, xb = sorted((W, W - s * out))
            box((district, "board_frame", 0), xa, xb, y - h / 2 - 0.07, y + h / 2 + 0.07, z - w / 2 - 0.07, z + w / 2 + 0.07, scale=1.0)
            sign(st_name(size), W - s * (out + 0.015), y, z, w, h, -s * math.pi / 2, district=district, label=False)
    for _ in range(r.randrange(0, 3)):
        y = r.choice([SHOP_H + CELL_H * k for k in range(1, 5)]) + 0.05
        if y > top - 1:
            continue
        colour = r.choice(PANEL_COLOURS)
        xa, xb = sorted((W - s * 0.26, W - s * 0.3))
        box((district, "neon_" + colour, 0), xa, xb, y, y + 0.08, z0 + 0.4, z1 - 0.4, scale=1.0)


def frontage_x(district, x0, x1, zf, seed, facing=-1, awning=True):
    """A row of lit shops along a wall that runs along x (the boulevard's
    kind), facing `facing` z: glass a hair proud of the dark ground floor
    with the site's rooms behind it, a bulkhead and a fascia, pilasters
    between the shops, a dyed awning lit through from under and its lit
    hem, and some shops shut behind their shutters (the shop shader's own
    choice, from the colour)."""
    r = random.Random(seed)
    f = 1 if facing > 0 else -1
    zg = zf + f * 0.03
    x = x0
    while x < x1 - 2.5:
        w = min(x1 - x, r.choice((6.4, 6.4, 9.6, 12.8)))
        if x1 - (x + w) < 3.2:
            w = x1 - x
        a, b = x + 0.4, x + w - 0.4
        lit = (r.uniform(0.25, 1.0), r.random(), 1.0 if r.random() < 0.8 else 0.0, 1.0)
        pts = ((b, 0.55, zg), (a, 0.55, zg), (a, 3.3, zg), (b, 3.3, zg)) if f < 0 else ((a, 0.55, zg), (b, 0.55, zg), (b, 3.3, zg), (a, 3.3, zg))
        quad((district, "shop", 0), *pts, col=lit)
        za, zb = sorted((zf, zf + f * 0.14))
        box((district, "dark", 0), a, b, 0.15, 0.55, za, zb, scale=1.0)
        box((district, "dark", 0), a, b, 3.3, SHOP_H, za, zb, scale=1.0)
        pa, pb = sorted((zf, zf + f * 0.45))
        box((district, "concrete", 0), x, x + 0.4, 0.15, SHOP_H, pa, pb, scale=1.5)
        if awning and r.random() < 0.7:
            colour = r.choice(["pink", "cyan", "red", "amber", "purple", "teal"])
            ya = 3.55
            out = 1.6
            top_in, top_out = (zf, ya + 0.4), (zf + f * out, ya)
            p_ = ((a, top_in[1], top_in[0]), (a, top_out[1], top_out[0]), (b, top_out[1], top_out[0]), (b, top_in[1], top_in[0]))
            uvs = ((0, 0), (1, 0), (1, 1), (0, 1))
            if f > 0:
                p_ = (p_[0], p_[3], p_[2], p_[1])
                uvs = ((0, 0), (0, 1), (1, 1), (1, 0))
            dye = tuple(int(NEON[colour][i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
            quad((district, "awning", 1), *p_, uvs=uvs, col=dye)
            quad((district, "awning", 1), p_[0], p_[3], p_[2], p_[1], uvs=(uvs[0], uvs[3], uvs[2], uvs[1]), col=dye)
            ea, eb = sorted((top_out[0], top_out[0] + f * 0.04))
            box((district, "neon_" + colour, 0), a, b, ya - 0.08, ya, ea, eb, scale=1.0)
        x += w
    box((district, "concrete", 0), x1 - 0.4, x1, 0.15, SHOP_H, *sorted((zf, zf + f * 0.45)), scale=1.5)


def clutter_x(district, x0, x1, zf, top, seed, facing=-1):
    """clutter() for a wall running along x: blades standing out from it,
    read along the street from both ends, boards flat on it, and neon along
    a ledge."""
    r = random.Random(seed)
    f = 1 if facing > 0 else -1
    ceiling = max(SHOP_H + 2.4, min(top - 1.0, 26.0))
    for _ in range(r.randrange(4, 9)):
        if r.random() < 0.6:
            size = r.choices(["bs", "bm", "bl", "bx"], weights=[3, 4, 2, 2])[0]
            w, h = ST_SIZES[size]
            y = r.uniform(SHOP_H + 0.6 + h / 2, max(SHOP_H + 0.7 + h / 2, ceiling - h / 2))
            x = r.uniform(x0 + 0.8, x1 - 0.8)
            z = zf + f * (0.35 + w / 2)
            za, zb = sorted((z - w / 2 - 0.06, z + w / 2 + 0.06))
            box((district, "board_frame", 0), x - 0.08, x + 0.08, y - h / 2 - 0.07, y + h / 2 + 0.07, za, zb, scale=1.0)
            sid = st_name(size)
            sign(sid, x + 0.09, y, z, w, h, math.pi / 2, district=district, label=False)
            sign(sid + "_b", x - 0.09, y, z, w, h, -math.pi / 2, district=district, label=False)
            ya = y + h / 2 + 0.07
            ba, bb = sorted((zf, z))
            box((district, "metal", 1), x - 0.04, x + 0.04, ya, ya + 0.07, ba, bb, scale=0.5)
        else:
            size = r.choices(["ps", "pm", "bx"], weights=[4, 3, 2])[0]
            w, h = ST_SIZES[size]
            if x1 - x0 < w + 1.0:
                continue
            y = r.uniform(SHOP_H + 0.5 + h / 2, max(SHOP_H + 0.6 + h / 2, ceiling - h / 2))
            x = r.uniform(x0 + w / 2 + 0.5, x1 - w / 2 - 0.5)
            out = r.uniform(0.12, 0.45)
            za, zb = sorted((zf, zf + f * out))
            box((district, "board_frame", 0), x - w / 2 - 0.07, x + w / 2 + 0.07, y - h / 2 - 0.07, y + h / 2 + 0.07, za, zb, scale=1.0)
            sign(st_name(size), x, y, zf + f * (out + 0.015), w, h, 0.0 if f > 0 else math.pi, district=district, label=False)
    for _ in range(r.randrange(0, 3)):
        y = r.choice([SHOP_H + CELL_H * k for k in range(1, 5)]) + 0.05
        if y > top - 1:
            continue
        za, zb = sorted((zf + f * 0.26, zf + f * 0.3))
        box((district, "neon_" + r.choice(PANEL_COLOURS), 0), x0 + 0.4, x1 - 0.4, y, y + 0.08, za, zb, scale=1.0)


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


# Shared between districts: every roof the hero looks along, dressed once all
# the masses it looks over are known (the avenue's and the canyon's), and the
# street lamps (avenue and garage street), whose anchors are numbered in the
# order they were placed.
HERO_ROOFS = []
LAMPS = []

# Small lamps (a lane's caged lamps, a door's, a shutter's) light far more
# than their few square centimetres of glow would in the bake, so each is
# also a point of light on the ground: per district, a flat list of
# [x, y, z] in decimetres, the hue's index in LIGHT_HUES and the power in
# tenths, written on an empty in that district's pack (finish.py) and pooled
# by src/world/spill.js.
LIGHT_HUES = ["pink", "magenta", "cyan", "teal", "blue", "amber", "red", "green", "white", "purple", "yellow"]
LIGHTS = {}


def light(district, x, y, z, hue, power):
    LIGHTS.setdefault(district, []).extend(
        (round(x * 10), round(y * 10), round(z * 10), LIGHT_HUES.index(hue), round(power * 10)))
