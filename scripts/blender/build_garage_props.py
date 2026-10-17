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

# What each prototype's geometry (near parts too) spans in its own frame,
# and whether its `box` holds it: symmetric about the origin across, its
# base at y 0. A few hang from their origin (HUNG) and go below it.
HUNG = {"garage_hood_light", "garage_lift2_pad", "garage_cable_tray", "garage_conduit", "garage_junction_box",
        "garage_poster_tall", "garage_poster_wide", "garage_poster_lit", "garage_shop_sign"}
bounds = {}
for mesh_list in meshes.values():
    for m in mesh_list:
        base = m.name[len("GP_proto_"):]
        base = next(n for n in sorted(WANT, key=len, reverse=True) if base.startswith(n + "_"))
        lo, hi = bounds.setdefault(base, ([1e9] * 3, [-1e9] * 3))
        for v in m.vertices:
            # Blender (x, y, z) is the kit's (x, -z, y).
            for i, c in enumerate((v.co.x, v.co.z, -v.co.y)):
                lo[i], hi[i] = min(lo[i], c), max(hi[i], c)
bad = []
for name, (lo, hi) in bounds.items():
    hx, hy, hz = NP.PROTOS[name]["box"]
    over = [max(-lo[0], hi[0]) - hx, hi[1] - 2 * hy, max(-lo[2], hi[2]) - hz, (0.0 if name in HUNG else -lo[1] - 0.005)]
    if name != "drum" and max(over) > 0.005:
        bad.append(f"{name}: spans x {lo[0]:.3f}..{hi[0]:.3f} y {lo[1]:.3f}..{hi[1]:.3f} z {lo[2]:.3f}..{hi[2]:.3f}, box {hx}, {hy}, {hz}")
if bad:
    raise SystemExit("prototype boxes that do not hold their geometry:\n  " + "\n  ".join(bad))

report = {}
for name in WANT:
    p = NP.PROTOS[name]
    s = stats.get(name, {"triangles": 0, "near_triangles": 0, "materials": set()})
    fn = p["build"]
    lo, hi = bounds.get(name, ([0.0] * 3, [0.0] * 3))
    report[name] = {"triangles": s["triangles"], "near_triangles": s["near_triangles"], "materials": sorted(s["materials"]),
                    "box": list(p["box"]), "bounds": {"min": [round(v, 3) for v in lo], "max": [round(v, 3) for v in hi]},
                    "solids": [[round(v, 3) for v in b] for b in p["solids"]] if "solids" in p else None,
                    "detail": p["detail"], "reach": p["reach"],
                    "about": " ".join((fn.__doc__ or "").split())}
total = sum(r["triangles"] + r["near_triangles"] for n, r in report.items() if n != "drum")

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


def front_only(mat_name):
    """The site draws the kit's materials front faces only (three.js's
    FrontSide): so does the preview, a face seen from behind letting the
    light through as if it were not there."""
    mat = kit.MATS.get(mat_name)
    if mat is None:
        return
    nt = mat.node_tree
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    link = next(lk for lk in nt.links if lk.to_node == out and lk.to_socket.name == "Surface")
    shader = link.from_socket
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    clear = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(geo.outputs["Backfacing"], mix.inputs["Fac"])
    nt.links.new(shader, mix.inputs[1])
    nt.links.new(clear.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])


wire("trim")
wire("glow", emit=True)
wire("tube", emit=True)
for _m in ("trim", "glow", "tube", "hazard"):
    front_only(_m)
wire("worn", base=(0.05, 0.07, 0.12))
wire("print", base=(0.32, 0.24, 0.15))
face = kit.MATS["face"]
kit.principled(face).inputs["Emission Strength"].default_value = 1.2
kit.principled(face).inputs["Emission Color"].default_value = (0.35, 0.4, 0.6, 1)

# ---------------------------------------------------------------------------
# The assemblies: what each tile shows, built with the kit's own helpers.
# ---------------------------------------------------------------------------


def one(name, *more, y=0.0, z=0.0):
    """One prototype (and any more beside it), `y` up off the floor: what
    hangs from a ceiling or a hood is shown hanging."""
    def f():
        NP.place(name, 0, y, z, 0, district="garage")
        for m, mx, my, mz, myaw in more:
            NP.place(m, mx, my, mz, myaw, district="garage")
    return f


# ---------------------------------------------------------------------------
# Ali's S4 (public/models/ali-s4.glb), for the tiles that prove the lifts
# fit it: one mesh in its own frame (its origin on the floor between its
# axles, front +z), and one with the opening hood left off.
# ---------------------------------------------------------------------------
S4 = ROOT / "public/models/ali-s4.glb"
# Nodes the GLB carries outside its scene, which the site never draws.
S4_UNUSED = {"Cube", "MCP_Setup_Test_Cube"}


def s4_meshes():
    import bmesh
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(S4))
    new = [o for o in bpy.data.objects if o not in before]

    def in_hood(o):
        while o is not None:
            if o.name.startswith("opening_hood"):
                return True
            o = o.parent
        return False
    out = []
    for label, keep in (("GP_S4", lambda o: True), ("GP_S4_hood_open", lambda o: not in_hood(o))):
        bm, mats = bmesh.new(), []
        for o in new:
            if o.type != "MESH" or o.name.split(".")[0] in S4_UNUSED or not keep(o):
                continue
            me = o.data.copy()
            me.transform(o.matrix_world)
            for poly in me.polygons:
                poly.material_index += len(mats)
            mats.extend(me.materials)
            bm.from_mesh(me)
            bpy.data.meshes.remove(me)
        mesh = bpy.data.meshes.new(label)
        bm.to_mesh(mesh)
        bm.free()
        for m in mats:
            mesh.materials.append(m)
        out.append(mesh)
    for o in new:
        bpy.data.objects.remove(o)
    return out


S4_MESH, S4_OPEN = s4_meshes()


def s4(y=0.0, mesh=None):
    """The S4 standing at the origin, `y` up (on a raised lift)."""
    o = bpy.data.objects.new("GP_S4", mesh or S4_MESH)
    o.location = kit.P(0, y, 0)
    return [o]


def with_s4(build, y=0.0, mesh=None):
    def f():
        build()
        return s4(y, mesh)
    return f


TILES = [
    ("Fit (Ali's S4)", [
        ("s4_lift2_down", "S4 on the two-post lift, down", with_s4(lambda: shop.place_lift2(0, 0, district="garage")), {"az": 35, "el": 12}),
        ("s4_pad_front", "S4's front supports on the pads", with_s4(lambda: shop.place_lift2(0, 0, district="garage")),
         {"eye": (2.3, 0.12, 1.25), "look": (0.0, 0.12, 0.8), "lens": 32}),
        ("s4_pad_rear", "S4's rear supports on the pads", with_s4(lambda: shop.place_lift2(0, 0, district="garage")),
         {"eye": (2.3, 0.13, -1.3), "look": (0.0, 0.13, -0.85), "lens": 32}),
        ("s4_lift2_under", "S4 on the lift, from under the floor", with_s4(lambda: shop.place_lift2(0, 0, district="garage")),
         {"az": 25, "el": -35, "under": True, "focus": ((-1.9, 0.0, -1.6), (1.9, 0.4, 1.6))}),
        ("s4_lift2_up", "S4 on the two-post lift, raised", with_s4(lambda: shop.place_lift2(0, 0, raised=True, district="garage"), y=shop.LIFT2_RISE),
         {"az": 35, "el": 8}),
        ("s4_scissor_down", "S4 on the scissor lift, down", with_s4(lambda: shop.place_scissor(0, 0, district="garage"), y=shop.SCISSOR_TOP["down"]),
         {"az": 70, "el": 10}),
        ("s4_scissor_up", "S4 on the scissor lift, up", with_s4(lambda: shop.place_scissor(0, 0, raised=True, district="garage"), y=shop.SCISSOR_TOP["up"]),
         {"az": 70, "el": 6}),
        ("s4_hood_light", "Under-hood light, from the S4's engine", with_s4(one("garage_hood_light", y=1.25, z=1.45), mesh=S4_OPEN),
         {"eye": (0.55, 0.86, 2.0), "look": (-0.1, 1.05, 1.3), "lens": 18}),
    ]),
    ("Collision (published solids)", [
        ("lift2_solids", "Two-post lift's solids, S4 pads", lambda: shop.place_lift2(0, 0, district="garage"), {"az": 20, "el": 18, "solids": True}),
        ("shutter_solids", "City shutter fittings' solids", one("garage_shutter_w"), {"az": -150, "solids": True}),
        ("door_w_open_solids", "Roll-up door 6 m open, solids", lambda: shop.place_door(0, 0, size="w", pose="open", district="garage"),
         {"az": -145, "solids": True}),
        ("tyre_machines_solids", "Tyre changer, balancer: solids", one("garage_tyre_changer", ("garage_balancer", 2.0, 0, 0, 0)),
         {"solids": True}),
        ("tune_cart_solids", "Tune cart's solid (the lead is air)", one("garage_tune_cart"), {"az": 60, "solids": True}),
    ]),
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

# Each tile's assembly (the lift and its arms, a door and its frame), set
# down at the origin with yaw 0: what it spans, in the kit's frame.
assemblies = {}
SOLID_MAT = bpy.data.materials.new("GP_solid")
SOLID_MAT.use_nodes = True
_sb = kit.principled(SOLID_MAT)
_sb.inputs["Base Color"].default_value = (0.9, 0.08, 0.05, 1)
_sb.inputs["Emission Color"].default_value = (0.9, 0.08, 0.05, 1)
_sb.inputs["Emission Strength"].default_value = 0.6
_sb.inputs["Alpha"].default_value = 0.28


def solid_obj(name, x, y, z, yaw, sy, sxz):
    """An instance's solids (what collision.json gets from ncw/garage's
    published solids) as translucent red boxes."""
    verts, faces = [], []
    for (x0, y0, z0), (x1, y1, z1) in G.shapes.world_solids(name, x, y, z, yaw, sy, sxz):
        b = len(verts)
        verts += [kit.P(xx, yy, zz) for yy in (y0, y1) for zz in (z0, z1) for xx in (x0, x1)]
        faces += [(b + i for i in f) for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3))]
    mesh = bpy.data.meshes.new(f"GP_solids_{name}")
    mesh.from_pydata(verts, [], [tuple(f) for f in faces])
    mesh.materials.append(SOLID_MAT)
    return bpy.data.objects.new(f"GP_solids_{name}", mesh)


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
        p["dy"] += d
    line_starts.append(line[0])
    row_z = max(p["hi"].y for p in line) + 1.5
    line = []


for category, tiles in TILES:
    close_line()
    x = 0.0
    for tile_name, label, build, opts in tiles:
        NP.INSTANCES.clear()
        extra = build() or []
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
        if opts.get("solids"):
            extra = extra + [solid_obj(n, ix, iy, iz, yaw, sy, sxz) for n, ix, iy, iz, yaw, sy, sxz, _ in insts]
        if not extra:
            assemblies[tile_name] = {"label": label, "min": [round(lo.x, 3), round(lo.z, 3), round(-hi.y, 3)],
                                     "max": [round(hi.x, 3), round(hi.z, 3), round(-lo.y, 3)]}
        for o in extra:
            coll.objects.link(o)
            objs.append(o)
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
               "objects": objs, "origin": shift.x, "dy": 0.0}
        placed.append(rec)
        line.append(rec)
        x += size.x + 1.0
close_line()

# ---------------------------------------------------------------------------
# The fit, measured: each lift pad against the S4's underside straight over
# it, what lies under the car along each arm, where its tyres stand.
# ---------------------------------------------------------------------------
def fit():
    from mathutils.bvhtree import BVHTree
    car = BVHTree.FromPolygons([v.co for v in S4_MESH.vertices], [list(f.vertices) for f in S4_MESH.polygons])

    def above(x, y, z):
        """How far up from the kit's (x, y, z) the car's underside is."""
        hit = car.ray_cast(Vector(kit.P(x, y, z)), Vector((0, 0, 1)), 3.0)
        return hit[3] if hit[0] is not None else None
    pads = []
    for px, pz, top in shop.LIFT2_PADS_S4:
        ring = [(px, pz)] + [(px + r * math.cos(a * math.tau / 8), pz + r * math.sin(a * math.tau / 8)) for r in (0.04, 0.072) for a in range(8)]
        gaps = [above(x, top, z) for x, z in ring]
        (vx, vz), turn, reach, _ = shop.lift2_arm((px, pz, top))
        # Along the arm, from the pin to the pad: the car's underside over
        # the arm's top (pin and gear included).
        under = [above(vx + (px - vx) * f, shop.LIFT2_ARM_TOP + 0.04, vz + (pz - vz) * f) for f in [i / 20 for i in range(21)]]
        pads.append({"pad": [px, pz, top], "reach": round(reach, 3), "turn_deg": round(math.degrees(turn), 1),
                     "gap_min_mm": round(min(g for g in gaps if g is not None) * 1000, 1),
                     "gap_max_mm": round(max(g for g in gaps if g is not None) * 1000, 1), "misses": sum(g is None for g in gaps),
                     "arm_clear_min_mm": round(min(g for g in under if g is not None) * 1000, 1)})
    # The tyres' contact: the car's points within 10 mm of the floor.
    low = [(v.co.x, -v.co.y) for v in S4_MESH.vertices if v.co.z < 0.01]
    tyres = []
    for sx in (-1, 1):
        for sz in (-1, 1):
            q = [(x, z) for x, z in low if x * sx > 0 and z * sz > 0]
            tyres.append({"x": [round(min(x for x, _ in q), 3), round(max(x for x, _ in q), 3)],
                          "z": [round(min(z for _, z in q), 3), round(max(z for _, z in q), 3)]})
    run = shop.SCISSOR_RUN / 2
    on = all(0.52 <= abs(t["x"][0]) and abs(t["x"][1]) <= 1.08 and max(abs(v) for v in t["z"]) <= run for t in tyres)
    return {"car": str(S4.relative_to(ROOT)), "lift2_pads": pads, "tyres_on_floor": tyres,
            "scissor": {"runway_half_length": run, "runway_x": [0.52, 1.08], "tyres_on_runways": on,
                        "runway_past_tyres_m": round(run - max(max(abs(v) for v in t["z"]) for t in tyres), 3)}}


FIT = fit()
(OUT / "garage-props.json").write_text(json.dumps({
    "note": "the garage's prototypes (scripts/blender/ncw/garage): triangles drawn always, triangles drawn near by only "
            "(<name>__near, never on a phone), the kit materials each wears, its box (half sizes x, y, z, base at y 0: the "
            "whole extent, what the site culls by), its bounds (the geometry's min and max in its own frame), its solids "
            "(x0, x1, y0, y1, z0, z1 boxes in its own frame: what stands in the way; [] nothing; null the box), whether a "
            "phone drops it. assemblies: each preview tile's assembly at the origin, yaw 0, its min and max. fit: the lifts "
            "against Ali's S4.",
    "total_triangles": total, "protos": {n: r for n, r in report.items() if n != "drum"},
    "assemblies": assemblies, "fit": FIT}, indent=1))


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


def frame(lo, hi, az=35.0, el=22.0, wall=False, aspect=4 / 3, zoom=1.0, under=False):
    """Light and frame the box lo..hi (Blender coordinates): the camera at
    `az` degrees round from the front (+kit z, Blender -y) toward +x, `el`
    up, far enough for the whole box. `under`: the floor taken away and
    the practical set below, for a look from beneath."""
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
    floor_obj.hide_render = under
    if under:
        warm.location = Vector((c.x - s * 0.4, c.y - s * 0.5, -s * 0.8))
        warm_data.energy = 90 * s * s
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
        lo, hi = p["lo"], p["hi"]
        if "focus" in o:
            # A part of the tile, in the kit's frame from the tile's origin.
            (fx0, fy0, fz0), (fx1, fy1, fz1) = o["focus"]
            ox = p["origin"]
            lo, hi = Vector((ox + fx0, -fz1 + p["dy"], fy0)), Vector((ox + fx1, -fz0 + p["dy"], fy1))
        frame(lo, hi, az=o.get("az", 35.0), el=o.get("el", 22.0), wall=o.get("wall", False), under=o.get("under", False))
        cam_data.lens = o.get("lens", 40)
        if "eye" in o:
            # A camera set by hand, in the kit's frame from the tile's origin.
            eye, look = (Vector(kit.P(*v)) + Vector((p["origin"], p["dy"], 0)) for v in (o["eye"], o["look"]))
            cam.location = eye
            cam.rotation_euler = (look - eye).to_track_quat("-Z", "Y").to_euler()
            cam_data.clip_start, cam_data.clip_end = 0.02, 40.0
        path = out / "tiles" / f"{i:02d}-{p['name']}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True, scene=scene.name)
        manifest.append({"file": path.name, "name": p["name"], "label": p["label"], "category": p["category"]})
    if only:
        (out / "tiles-only.json").write_text(json.dumps(manifest, indent=1))
    else:
        (out / "tiles.json").write_text(json.dumps(manifest, indent=1))
        # The overview: every row, the scale figures, from high at the front.
        for q in placed:
            q["coll"].hide_render = False
        for f in figures:
            f.hide_render = False
        wall_obj.hide_render = True
        floor_obj.hide_render = False
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
floor_obj.hide_render = False
# The S4 stays out of the saved scene (it is the site's own model, 2 MB of
# it), and so do the solids' boxes; their tiles keep the props.
for q in placed:
    for o in [o for o in q["coll"].objects if o.data in (S4_MESH, S4_OPEN) or o.name.startswith("GP_solids_")]:
        q["coll"].objects.unlink(o)
bpy.data.libraries.write(str(OUT / "garage-props.blend"), {scene}, path_remap="RELATIVE_ALL", fake_user=True, compress=True)
print(json.dumps({"protos": len(report) - 1, "total_triangles": total, "tiles": len(placed), "fit": FIT}))
