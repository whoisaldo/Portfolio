# scripts/blender/build_s4_door.py: the S4 on the door.
#
# Run in Blender through the MCP, as the world builder is:
#   execute_blender_code: PROJECT_ROOT = "<repo>"; exec(open(PROJECT_ROOT + "/scripts/blender/build_s4_door.py").read())
# or headless: blender -b --python scripts/blender/build_s4_door.py -- <repo>
# then: node scripts/optimize-door-car.mjs
#
# Ali's S4 (design/audi-s4/ali-s4.blend, scene Ali_S4_Final) as the door shows
# it: every part seen from outside, at its full detail. Left out: the engine
# bay under the closed hood, the hood's liner and struts, and the grilles'
# honeycomb (49,000 triangles behind their own dark backing, finer than a
# pixel at the door's size). Cycles bakes ambient occlusion into each part's
# vertex colours, with a floor under the car for the contact: the panel gaps,
# the wheel arches, under the bumpers and the sills. The door multiplies it
# into the paint (src/three/door-car.js). Built in a scene of its own; the
# open session's other scenes are not touched and nothing is saved.
import os
import re
import sys

import bpy

ROOT = globals().get("PROJECT_ROOT") or (sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.getcwd())
SRC = os.path.join(ROOT, "design", "audi-s4", "ali-s4.blend")
OUT = os.path.join(ROOT, "design", "audi-s4", "door-source.glb")
DROP = re.compile(r"honeycomb|hood_acoustic_liner|hood_strut|strut_top", re.I)
AO_DISTANCE = 0.45
AO_SAMPLES = globals().get("AO_SAMPLES", 64)


def chain(o):
    names = []
    p = o.parent
    while p:
        names.append(p.name)
        p = p.parent
    return names


# The source, appended once as a scene of its own.
src = bpy.data.scenes.get("Door_S4_Source")
if src is None:
    with bpy.data.libraries.load(SRC, link=False) as (_, data):
        data.scenes = ["Ali_S4_Final"]
    src = data.scenes[0]
    src.name = "Door_S4_Source"

window = bpy.context.window
home = window.scene if window else None

# The door's scene, rebuilt from nothing on every run.
dst = bpy.data.scenes.get("Door_S4") or bpy.data.scenes.new("Door_S4")
for ob in list(dst.collection.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
layer = dst.view_layers[0]

# A scene nobody has looked at has no depsgraph yet: evaluate it as the shown one.
if window:
    window.scene = src
    dg = bpy.context.evaluated_depsgraph_get()
else:
    with bpy.context.temp_override(scene=src, view_layer=src.view_layers[0]):
        dg = bpy.context.evaluated_depsgraph_get()
parts = []
for o in src.objects:
    if o.type != "MESH" or o.hide_render or "engine_bay" in chain(o) or DROP.search(o.name):
        continue
    ev = o.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    me.transform(ev.matrix_world)
    if any(slot.link == "OBJECT" for slot in o.material_slots):
        me.materials.clear()
        for slot in o.material_slots:
            me.materials.append(slot.material)
    for name in [a.name for a in me.color_attributes]:
        me.color_attributes.remove(me.color_attributes[name])
    ao = me.color_attributes.new("AO", "BYTE_COLOR", "POINT")
    me.color_attributes.active_color = ao
    ob = bpy.data.objects.new("door_" + re.sub(r"\.\d+$", "", o.name), me)
    dst.collection.objects.link(ob)
    parts.append(ob)

# A floor for the bake to find the car's contact with, never exported.
floor_me = bpy.data.meshes.new("door_floor")
floor_me.from_pydata([(-8, -8, 0), (8, -8, 0), (8, 8, 0), (-8, 8, 0)], [], [(0, 1, 2, 3)])
floor = bpy.data.objects.new("door_floor", floor_me)
dst.collection.objects.link(floor)

dst.render.engine = "CYCLES"
dst.cycles.samples = AO_SAMPLES
if dst.world is None:
    dst.world = bpy.data.worlds.new("Door_S4_World")
dst.world.light_settings.distance = AO_DISTANCE



def run(op, **kw):
    """An operator on the door's parts, in the door's scene. With a window the
    window shows that scene: overriding the context's scene under a window
    showing another one crashed Blender's depsgraph inside the exporter."""
    for ob in dst.objects:
        ob.select_set(ob in parts, view_layer=layer)
    layer.objects.active = parts[0]
    if window:
        window.scene = dst
        with bpy.context.temp_override(active_object=parts[0], object=parts[0], selected_objects=parts):
            return op(**kw)
    with bpy.context.temp_override(scene=dst, view_layer=layer, active_object=parts[0], object=parts[0], selected_objects=parts):
        return op(**kw)


run(bpy.ops.object.bake, type="AO", target="VERTEX_COLORS")

bpy.data.objects.remove(floor, do_unlink=True)
bpy.data.meshes.remove(floor_me)

tris = 0
for ob in parts:
    ob.data.calc_loop_triangles()
    tris += len(ob.data.loop_triangles)
run(
    bpy.ops.export_scene.gltf,
    filepath=OUT,
    export_format="GLB",
    use_selection=True,
    # Only this scene: by default the exporter writes every scene in the file.
    use_active_scene=True,
    export_apply=True,
    export_materials="EXPORT",
    export_image_format="WEBP",
    export_vertex_color="ACTIVE",
    export_all_vertex_colors=False,
    export_yup=True,
)
if window and home:
    window.scene = home
print(f"DOOR_S4 {len(parts)} parts, {tris} triangles, wrote {OUT} ({os.path.getsize(OUT)} bytes)")
