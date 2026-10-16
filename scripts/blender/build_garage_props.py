"""The garage's prop kit, laid out for a look: every prototype of ncw/garage
built as the city builds its own (props.build_protos), set down in rows by
category beside a 1.75 m scale figure, under the light the garage will have
(cool strips overhead, a warm practical low at the side), and rendered: one
front three-quarter tile a prop and an overview.

Headless only, from the repository root (it imports the city's kit, which
replaces any Night_City_World scene in its session, so it refuses to run in
a live Blender):

    blender -b --factory-startup --python scripts/blender/build_garage_props.py -- [--render DIR] [--samples N]

It writes design/night-city-garage/garage-props.json (each prototype's
triangles, near-only triangles, materials and footprint) and saves the
preview scene to design/night-city-garage/garage-props.blend. With --render
it renders tiles/<n>-<name>.png and overview.png into DIR (Cycles on the
GPU); the contact sheet is assembled from them outside Blender.

Its Blender materials are the kit's, with the vertex colours wired in for
the preview (trim's paint, glow's and tube's light); the site draws `worn`,
`print` and `face` with shaders of its own (src/world/prop-surfaces.js), so
here they are only stand-ins: painted steel, card and a lit panel.
"""
import argparse
import importlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

if not bpy.app.background:
    raise RuntimeError("Run this headless (blender -b): it replaces the session's Night_City_World scene")

try:
    ROOT = Path(PROJECT_ROOT)  # noqa: F821 (when run through run_mcp.py)
except NameError:
    ROOT = Path(__file__).resolve().parents[2]

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument("--render", default=None)
parser.add_argument("--samples", type=int, default=48)
parser.add_argument("--only", default=None, help="comma-separated tile names to render")
args = parser.parse_args(argv)

HERE = str(ROOT / "scripts/blender")
if HERE not in sys.path:
    sys.path.insert(0, HERE)
for name in [m for m in sys.modules if m == "ncw" or m.startswith("ncw.")]:
    del sys.modules[name]
import ncw  # noqa: E402

ncw.ROOT = ROOT
kit = importlib.import_module("ncw.kit")
NP = importlib.import_module("ncw.props")
G = importlib.import_module("ncw.garage")
from ncw.garage import bench, shop  # noqa: E402

OUT = ROOT / "design/night-city-garage"
NP.build_protos()

# ---------------------------------------------------------------------------
# The prototypes as meshes, one per prototype and material (finish.py's way).
# ---------------------------------------------------------------------------
WANT = [n for n in NP.PROTOS if n.startswith("garage_") and not n.endswith(NP.NEAR)] + ["drum"]
meshes = {}
stats = {}
for (key, mat_name, _), b in kit.batches.items():
    if not key.startswith("proto/") or not b.faces:
        continue
    name = key[6:]
    base = name[:-len(NP.NEAR)] if name.endswith(NP.NEAR) else name
    if base not in WANT:
        continue
    mesh = bpy.data.meshes.new(f"GP_proto_{name}_{mat_name}")
    mesh.from_pydata(b.verts, [], b.faces)
    uv = mesh.uv_layers.new(name="UVMap")
    col = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="CORNER")
    li = 0
    for f in mesh.polygons:
        for loop_index in f.loop_indices:
            uv.data[loop_index].uv = b.uvs[li]
            col.data[loop_index].color = b.cols[li]
            li += 1
    mesh.materials.append(kit.MATS[mat_name])
    mesh.validate()
    meshes.setdefault(base, []).append(mesh)
    tris = sum(len(f) - 2 for f in b.faces)
    s = stats.setdefault(base, {"triangles": 0, "near_triangles": 0, "materials": set()})
    s["near_triangles" if name.endswith(NP.NEAR) else "triangles"] += tris
    s["materials"].add(mat_name)

report = {}
for name in WANT:
    p = NP.PROTOS[name]
    s = stats.get(name, {"triangles": 0, "near_triangles": 0, "materials": set()})
    fn = p["build"]
    report[name] = {"triangles": s["triangles"], "near_triangles": s["near_triangles"], "materials": sorted(s["materials"]),
                    "box": list(p["box"]), "detail": p["detail"], "reach": p["reach"],
                    "about": " ".join((fn.__doc__ or "").split())}
total = sum(r["triangles"] + r["near_triangles"] for n, r in report.items() if n != "drum")
(OUT / "garage-props.json").write_text(json.dumps({
    "note": "the garage's prototypes (scripts/blender/ncw/garage): triangles drawn always, triangles drawn near by only "
            "(<name>__near, never on a phone), the kit materials each wears, its footprint (half sizes), whether a phone drops it",
    "total_triangles": total, "protos": {n: r for n, r in report.items() if n != "drum"}}, indent=1))

# ---------------------------------------------------------------------------
# The preview's own scene, its materials wired to the vertex colours.
# ---------------------------------------------------------------------------
scene = bpy.data.scenes.new("Night_City_Garage_Props")
if bpy.context.window:
    bpy.context.window.scene = scene
scene.unit_settings.system = "METRIC"


def wire(mat_name, emit=False, base=None):
    mat = kit.MATS.get(mat_name)
    if mat is None:
        return
    nt = mat.node_tree
    bsdf = kit.principled(mat)
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    if base is not None:
        bsdf.inputs["Base Color"].default_value = (*base, 1)
        bsdf.inputs["Emission Strength"].default_value = 0.0
        return
    if emit:
        bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
        nt.links.new(attr.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 4.0
    else:
        nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])


wire("trim")
wire("glow", emit=True)
wire("tube", emit=True)
wire("worn", base=(0.05, 0.07, 0.12))
wire("print", base=(0.32, 0.24, 0.15))
face = kit.MATS["face"]
kit.principled(face).inputs["Emission Strength"].default_value = 1.2
kit.principled(face).inputs["Emission Color"].default_value = (0.35, 0.4, 0.6, 1)

# ---------------------------------------------------------------------------
# The assemblies: what each tile shows, built with the kit's own helpers.
# ---------------------------------------------------------------------------


def one(name, *more, y=0.0):
    """One prototype (and any more beside it), `y` up off the floor: what
    hangs from a ceiling or a hood is shown hanging."""
    def f():
        NP.place(name, 0, y, 0, 0, district="garage")
        for m, mx, my, mz, myaw in more:
            NP.place(m, mx, my, mz, myaw, district="garage")
    return f


TILES = [
    ("Lifts and jacks", [
        ("lift2_down", "Two-post lift, arms down", lambda: shop.place_lift2(0, 0, district="garage"), {}),
        ("lift2_up", "Two-post lift, raised", lambda: shop.place_lift2(0, 0, raised=True, district="garage"), {}),
        ("lift2_out", "Two-post lift, arms out", lambda: shop.place_lift2(0, 0, arms="out", district="garage"), {}),
        ("scissor_down", "Scissor lift down, power unit", lambda: shop.place_scissor(0, 0, district="garage"), {}),
        ("scissor_up", "Scissor lift up, power unit", lambda: shop.place_scissor(0, 0, raised=True, district="garage"), {}),
        ("jack_stands", "Jack stands (pair)", one("garage_jack_stand", ("garage_jack_stand", 0.45, 0, 0.1, 0.4)), {}),
        ("floor_jack", "Floor jack", one("garage_floor_jack"), {}),
        ("creeper", "Creeper", one("garage_creeper"), {}),
        ("chocks", "Wheel chocks", one("garage_wheel_chock", ("garage_wheel_chock", 0.3, 0, 0.05, 0.2)), {}),
        ("service_pad", "Flush service pad (S6 bay)", one("garage_service_pad"), {"el": 50}),
        ("bay_lines", "Bay lines", one("garage_bay_lines"), {"el": 55}),
    ]),
    ("Doors", [
        ("door_s_closed", "Roll-up door 3 x 3 m, closed", lambda: shop.place_door(0, 0, size="s", pose="closed", district="garage"), {"az": -145}),
        ("door_s_half", "Roll-up door 3 x 3 m, half", lambda: shop.place_door(0, 0, size="s", pose="half", district="garage"), {"az": -145}),
        ("door_s_open", "Roll-up door 3 x 3 m, open", lambda: shop.place_door(0, 0, size="s", pose="open", district="garage"), {"az": -145}),
        ("door_w_closed", "Roll-up door 6 x 4.6 m, closed", lambda: shop.place_door(0, 0, size="w", pose="closed", district="garage"), {"az": -145}),
        ("door_w_half", "Roll-up door 6 x 4.6 m, half", lambda: shop.place_door(0, 0, size="w", pose="half", district="garage"), {"az": -145}),
        ("door_w_open", "Roll-up door 6 x 4.6 m, open", lambda: shop.place_door(0, 0, size="w", pose="open", district="garage"), {"az": -145}),
        ("door_w_street", "Roll-up door 6 x 4.6 m, from the street", lambda: shop.place_door(0, 0, size="w", pose="closed", district="garage"), {"az": 30}),
        ("man_door", "Man door, outside", one("garage_man_door"), {"az": 30}),
        ("man_door_in", "Man door, inside", one("garage_man_door"), {"az": -150}),
        ("shutter_w", "The city shutter's fittings, inside", one("garage_shutter_w"), {"az": -150}),
    ]),
    ("Benches and tools", [
        ("tool_cab", "Roll cab and top box", one("garage_tool_cab", ("garage_tool_top", 0, bench.TOP_ON_CAB, 0, 0)), {}),
        ("tool_cart", "Utility cart", one("garage_tool_cart"), {}),
        ("bench", "Workbench and vise", one("garage_bench"), {}),
        ("pegboard", "Pegboard and tools", one("garage_pegboard"), {"wall": True, "az": 20}),
        ("hood_light", "Under-hood light", one("garage_hood_light", y=1.2), {"el": 30}),
        ("hand_lamp", "Hand lamp", one("garage_hand_lamp"), {}),
        ("lamp_reel", "Lamp on a reel", one("garage_lamp_reel"), {"wall": True}),
        ("tune_cart", "Tune cart, laptop, OBD lead", one("garage_tune_cart"), {"az": 60}),
        ("parts_table", "Parts table", one("garage_parts_table"), {"el": 35}),
        ("welder", "MIG welder on its cart", one("garage_welder"), {}),
        ("drip_tray", "Drip tray", one("garage_drip_tray"), {"el": 40}),
    ]),
    ("Tyres", [
        ("tyre", "Tyre", one("garage_tyre"), {"az": 60}),
        ("wheel", "Wheel and tyre", one("garage_wheel"), {"az": 60}),
        ("tyre_stack", "Tyre stack", one("garage_tyre_stack"), {}),
        ("tyre_rack", "Tyre rack, filled", lambda: bench.place_tyre_rack(0, 0, seed=3, district="garage"), {}),
        ("tyre_changer", "Tyre changer", one("garage_tyre_changer"), {}),
        ("balancer", "Wheel balancer", one("garage_balancer"), {}),
    ]),
    ("Air, oil, storage", [
        ("compressor", "Air compressor", one("garage_compressor"), {}),
        ("hose_reel", "Air hose reel", one("garage_hose_reel"), {"wall": True}),
        ("oil_drain", "Oil drain", one("garage_oil_drain"), {}),
        ("drum_pump", "Drum (the city's) and pump", lambda: bench.place_drum_pump(0, 0, district="garage"), {}),
        ("parts_washer", "Parts washer on a drum", lambda: bench.place_parts_washer(0, 0, district="garage"), {}),
        ("shelving", "Shelving and parts", one("garage_shelving"), {}),
        ("cable_tray", "Cable tray", one("garage_cable_tray", y=2.4), {"el": 10}),
        ("conduit", "Conduit, drop, junction box", one("garage_conduit", ("garage_conduit_drop", 1.0, 0, 0, 0), ("garage_junction_box", -1.5, 3.0, 0, 0), y=3.0), {"wall": True}),
        ("led_batten", "LED batten", one("garage_led_batten", y=2.2), {"el": 8}),
        ("fluoro", "Twin-tube shop light", one("garage_fluoro", y=2.2), {"el": 8}),
        ("task_light", "Task light 4.5 x 0.35 m", one("garage_task_light", y=2.4), {"el": 8}),
        ("work_light", "Work light on a stand", one("garage_work_light"), {}),
    ]),
    ("Lounge and dressing", [
        ("couch", "Couch", one("garage_couch"), {}),
        ("fridge", "Fridge", one("garage_fridge"), {}),
        ("side_table", "Side table", one("garage_side_table"), {"el": 35}),
        ("coffee", "Coffee station", one("garage_coffee"), {}),
        ("extinguisher", "Extinguisher", one("garage_extinguisher"), {"wall": True}),
        ("first_aid", "First aid box", one("garage_first_aid"), {"wall": True}),
        ("drains", "Floor drain, trench drain", one("garage_floor_drain", ("garage_trench_drain", 0, 0, 0.6, 0)), {"el": 55}),
        ("stains", "Oil stains, tyre marks", one("garage_stain_a", ("garage_stain_b", 1.2, 0, 0.3, 0), ("garage_stain_c", -0.6, 0, 1.0, 0.3), ("garage_tyre_marks", 0.5, 0, -1.4, 0)), {"el": 60}),
        ("bay_numbers", "Bay numbers, cable ramp", one("garage_bay_01", ("garage_bay_02", 0, 0, -1.2, 0), ("garage_cable_ramp", 0, 0, 1.0, 0)), {"el": 60, "az": 10}),
    ]),
    ("Signs", [
        ("shop_sign", "Shop sign", one("garage_shop_sign"), {"wall": True, "az": 15}),
        ("neon_open", "Neon OPEN", one("garage_neon_open"), {"wall": True, "az": 15}),
        ("neon_wrench", "Neon spanners", one("garage_neon_wrench"), {"wall": True, "az": 15}),
        ("posters", "Posters, lightbox", one("garage_poster_tall", ("garage_poster_wide", 1.1, 0.0, 0, 0), ("garage_poster_lit", -1.0, -0.2, 0, 0)), {"wall": True, "az": 15}),
        ("monitor", "Monitor bezel", one("garage_monitor"), {"wall": True, "az": 15}),
    ]),
]

coll_root = bpy.data.collections.new("GP_props")
scene.collection.children.link(coll_root)
placed = []
# Each kind starts a line of its own; a line wraps at LINE metres. Lines
# run along +x and stack down the kit's -z (Blender +y), 1.5 m apart.
LINE = 24.0
row_z = 0.0
line = []
line_starts = []


def close_line():
    global row_z, line
    if not line:
        return
    d = row_z - min(p["lo"].y for p in line)
    for p in line:
        for o in p["objects"]:
            o.location.y += d
        p["lo"].y += d
        p["hi"].y += d
    line_starts.append(line[0])
    row_z = max(p["hi"].y for p in line) + 1.5
    line = []


for category, tiles in TILES:
    close_line()
    x = 0.0
    for tile_name, label, build, opts in tiles:
        NP.INSTANCES.clear()
        build()
        insts = list(NP.INSTANCES)
        coll = bpy.data.collections.new("GP_" + tile_name)
        coll_root.children.link(coll)
        lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
        objs = []
        for name, ix, iy, iz, yaw, sy, sxz, _ in insts:
            for m in meshes.get(name, []):
                o = bpy.data.objects.new(m.name.replace("GP_proto_", "garage_" if not name.startswith("garage_") else ""), m)
                o.rotation_euler = (0, 0, yaw)
                o.scale = (sxz, sxz, sy)
                o.location = kit.P(ix, iy, iz)
                coll.objects.link(o)
                objs.append(o)
        for o in objs:
            for v in o.data.vertices:
                w = o.matrix_basis @ v.co
                lo = Vector(map(min, lo, w))
                hi = Vector(map(max, hi, w))
        size = hi - lo
        if x > 0 and x + size.x > LINE:
            close_line()
            x = 0.0
        shift = Vector((x - lo.x, 0, 0))
        for o in objs:
            o.location += shift
        rec = {"name": tile_name, "label": label, "category": category, "coll": coll, "lo": lo + shift, "hi": hi + shift, "opts": opts,
               "objects": objs}
        placed.append(rec)
        line.append(rec)
        x += size.x + 1.0
close_line()

# ---------------------------------------------------------------------------
# The scale figure, at each row's start, and the room: a floor, a wall.
# ---------------------------------------------------------------------------
def figure_mesh():
    """A 1.75 m figure: legs, hips, torso, arms, neck, head."""
    key = ("preview/figure", "trim", 0)
    kit.batches.pop(key, None)
    grey = (0.25, 0.25, 0.26, 1)
    kit.box(key, -0.17, -0.03, 0.0, 0.86, -0.09, 0.09, col=grey)
    kit.box(key, 0.03, 0.17, 0.0, 0.86, -0.09, 0.09, col=grey)
    kit.box(key, -0.19, 0.19, 0.86, 1.02, -0.11, 0.11, col=grey)
    kit.box(key, -0.21, 0.21, 1.02, 1.48, -0.12, 0.12, col=grey)
    for x0 in (-0.3, 0.21):
        kit.box(key, x0, x0 + 0.09, 0.78, 1.46, -0.05, 0.05, col=grey)
    kit.box(key, -0.05, 0.05, 1.48, 1.55, -0.05, 0.05, col=grey)
    kit.box(key, -0.1, 0.1, 1.55, 1.75, -0.11, 0.11, col=grey)
    b = kit.batches[key]
    mesh = bpy.data.meshes.new("GP_scale_figure")
    mesh.from_pydata(b.verts, [], b.faces)
    col = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="CORNER")
    for i in range(len(col.data)):
        col.data[i].color = grey
    mesh.materials.append(kit.MATS["trim"])
    return mesh


fig = figure_mesh()
figures = []
for i, first in enumerate(line_starts):
    o = bpy.data.objects.new(f"GP_scale_figure_{i}", fig)
    o.location = (-1.2, (first["lo"].y + first["hi"].y) / 2, 0.0)
    scene.collection.objects.link(o)
    figures.append(o)

span_x = max(p["hi"].x for p in placed) + 2
span_y = row_z + 2
floor = bpy.data.meshes.new("GP_floor")
floor.from_pydata([(-6, -4, 0), (span_x + 4, -4, 0), (span_x + 4, span_y + 4, 0), (-6, span_y + 4, 0)], [], [(0, 1, 2, 3)])
floor.materials.append(kit.MATS["garage_floor"])
floor_obj = bpy.data.objects.new("GP_floor", floor)
scene.collection.objects.link(floor_obj)

wall = bpy.data.meshes.new("GP_wall")
wall.from_pydata([(-1.5, 0.0, -0.01), (1.5, 0.0, -0.01), (1.5, 0.0, 3.2), (-1.5, 0.0, 3.2)], [], [(0, 1, 2, 3)])
uvw = wall.uv_layers.new(name="UVMap")
for i, uvv in enumerate(((0, 0), (1.5, 0), (1.5, 1.6), (0, 1.6))):
    uvw.data[i].uv = uvv
wall.materials.append(kit.MATS["garage_wall"])
wall_obj = bpy.data.objects.new("GP_wall", wall)
scene.collection.objects.link(wall_obj)
wall_obj.hide_render = True

world = bpy.data.worlds.new("GP_night")
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.004, 0.005, 0.01, 1)
bg.inputs["Strength"].default_value = 1.0
scene.world = world

# ---------------------------------------------------------------------------
# The light: two cool strips overhead and a warm practical low at one side,
# set to each tile's size; and the camera, front three-quarter.
# ---------------------------------------------------------------------------


def area(name, size, colour, energy):
    data = bpy.data.lights.new(name, "AREA")
    data.shape = "RECTANGLE"
    data.size, data.size_y = size
    data.color = colour
    data.energy = energy
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    return obj


strip_a = area("GP_strip_a", (2.4, 0.12), (0.78, 0.88, 1.0), 400)
strip_b = area("GP_strip_b", (2.4, 0.12), (0.78, 0.88, 1.0), 250)
warm_data = bpy.data.lights.new("GP_practical", "POINT")
warm_data.color = (1.0, 0.6, 0.28)
warm_data.shadow_soft_size = 0.15
warm = bpy.data.objects.new("GP_practical", warm_data)
scene.collection.objects.link(warm)

cam_data = bpy.data.cameras.new("GP_camera")
cam_data.lens = 40
cam = bpy.data.objects.new("GP_camera", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam


def frame(lo, hi, az=35.0, el=22.0, wall=False, aspect=4 / 3, zoom=1.0):
    """Light and frame the box lo..hi (Blender coordinates): the camera at
    `az` degrees round from the front (+kit z, Blender -y) toward +x, `el`
    up, far enough for the whole box."""
    c = (lo + hi) / 2
    r = max((hi - lo).length / 2, 0.15)
    a, e = math.radians(az), math.radians(el)
    d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    fov = 2 * math.atan(18 / cam_data.lens / aspect)
    dist = r / math.sin(fov / 2) * 1.02 * zoom
    cam.location = c + d * dist
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    cam_data.clip_start = max(0.01, dist - r * 2)
    cam_data.clip_end = dist + r * 4
    s = max(r, 0.4)
    strip_a.location = Vector((c.x, c.y - s * 0.6, hi.z + s * 1.1))
    strip_b.location = Vector((c.x, c.y + s * 0.9, hi.z + s * 1.3))
    for st, e_ in ((strip_a, 140), (strip_b, 70)):
        st.data.size = max(1.2, 2.4 * s)
        st.data.energy = e_ * s * s
        st.rotation_euler = (0, 0, 0)
    warm.location = Vector((c.x - s * 1.3, c.y - s * 0.9, lo.z + (hi.z - lo.z) * 0.45 + 0.2))
    warm_data.energy = 45 * s * s
    wall_obj.hide_render = not wall
    if wall:
        # (Blender +y is the kit's -z: the prop's back, on the wall.)
        wall_obj.location = Vector((c.x, hi.y + 0.002, 0))
        wall_obj.scale = (max(1.0, (hi.x - lo.x) / 2.6 + 0.6), 1, max(1.0, hi.z / 3.0 + 0.2))


scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for dev in prefs.devices:
        dev.use = dev.type != "CPU"
    scene.cycles.device = "GPU"
except (TypeError, ValueError):
    scene.cycles.device = "CPU"
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.view_settings.view_transform = "AgX"
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False

if args.render:
    out = Path(args.render)
    (out / "tiles").mkdir(parents=True, exist_ok=True)
    only = set(args.only.split(",")) if args.only else None
    manifest = []
    scene.render.resolution_x, scene.render.resolution_y = 400, 300
    for f in figures:
        f.hide_render = True
    for i, p in enumerate(placed):
        if only and p["name"] not in only:
            continue
        for q in placed:
            q["coll"].hide_render = q is not p
        o = p["opts"]
        frame(p["lo"], p["hi"], az=o.get("az", 35.0), el=o.get("el", 22.0), wall=o.get("wall", False))
        path = out / "tiles" / f"{i:02d}-{p['name']}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True, scene=scene.name)
        manifest.append({"file": path.name, "name": p["name"], "label": p["label"], "category": p["category"]})
    if not only:
        (out / "tiles.json").write_text(json.dumps(manifest, indent=1))
        # The overview: every row, the scale figures, from high at the front.
        for q in placed:
            q["coll"].hide_render = False
        for f in figures:
            f.hide_render = False
        wall_obj.hide_render = True
        scene.render.resolution_x, scene.render.resolution_y = 1800, 1100
        lo = Vector((-1.6, min(p["lo"].y for p in placed), 0.0))
        hi = Vector((max(p["hi"].x for p in placed), max(p["hi"].y for p in placed), 3.0))
        frame(lo, hi, az=8.0, el=52.0, aspect=1800 / 1100, zoom=0.8)
        cam_data.lens = 40
        for st in (strip_a, strip_b):
            st.data.size = hi.x - lo.x
            st.data.size_y = 1.0
            st.location.z = 9.0
        strip_a.data.energy = strip_b.data.energy = 20000
        warm_data.energy = 9000
        scene.render.filepath = str(out / "overview.png")
        bpy.ops.render.render(write_still=True, scene=scene.name)

for q in placed:
    q["coll"].hide_render = False
wall_obj.hide_render = True
bpy.data.libraries.write(str(OUT / "garage-props.blend"), {scene}, path_remap="RELATIVE_ALL", fake_user=True, compress=True)
print(json.dumps({"protos": len(report) - 1, "total_triangles": total, "tiles": len(placed)}))
