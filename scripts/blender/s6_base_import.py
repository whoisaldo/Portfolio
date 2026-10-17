"""Bring the A6 C7 sedan base into the S6's frame, once, as a local intermediate.

Run headless, with autoexec off:

    blender -b --factory-startup --disable-autoexec --python scripts/blender/s6_base_import.py

It reads the base model (an A6 C7 sedan, the 2015 facelift, as an FBX) from
outside the repository and writes design/audi-s6/base/a6c7-base.blend, which
is gitignored: neither the model nor anything copied from it is committed.
build_s6.py loads that file and converts the car (scripts/blender/s6_base.py).

Nothing is changed here but the frame and the names, so every conversion
step stays in s6_base.py:
- the FBX's armature is dropped and every mesh is frozen in its rest pose;
- the car is turned to face -Y (the base faces +Y) and scaled about the
  middle of its wheelbase to the 2013 S6's 2,912 mm, with its wheel centres
  at the 255/40 R19 tyre's radius, so the rig's pivots land on its axles;
- each object and material keeps its name in the file as `base_key`, so the
  converter finds them whatever Blender renames them to in a busy session.
"""
import bpy
import os
import sys
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(os.environ.get('S6_BASE_FBX', '/Users/aldo/Library/Caches/garage-revamp/download-free/koelkast-a6c7/source/inner/Audi A6 C7 Limousine.fbx'))
OUTPUT = ROOT / 'design/audi-s6/base/a6c7-base.blend'
WHEELBASE = 2.912
WHEEL_R = 19 * .0254 / 2 + .255 * .40

if not SOURCE.exists():
    sys.exit(f'The base model is not at {SOURCE}. Set S6_BASE_FBX to its path.')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(SOURCE), use_image_search=False)
scene = bpy.context.scene

# Freeze every mesh in its rest pose, then drop the armature and its empties.
for obj in scene.objects:
    obj['base_key'] = obj.name
for m in bpy.data.materials:
    m['base_key'] = m.name
meshes = [o for o in scene.objects if o.type == 'MESH']
for obj in meshes:
    world = obj.matrix_world.copy()
    for mod in list(obj.modifiers):
        obj.modifiers.remove(mod)
    obj.vertex_groups.clear()
    obj.parent = None
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    obj.data.transform(world)
    if world.determinant() < 0:
        obj.data.flip_normals()
    obj.matrix_world = Matrix.Identity(4)
for obj in [o for o in scene.objects if o.type != 'MESH']:
    bpy.data.objects.remove(obj, do_unlink=True)

# The wheel centres, from the four tyres' bounds.
def centre(obj):
    vs = [v.co for v in obj.data.vertices]
    return Vector([(min(v[i] for v in vs) + max(v[i] for v in vs)) / 2 for i in range(3)])
wheels = [centre(o) for o in meshes if o['base_key'].startswith('wheel_')]
front = [c for c in wheels if c.y > 0]
rear = [c for c in wheels if c.y < 0]
yf, yr = sum(c.y for c in front) / len(front), sum(c.y for c in rear) / len(rear)
zc = sum(c.z for c in wheels) / len(wheels)
k = WHEELBASE / (yf - yr)
# Turn 180 degrees about Z (the base's +Y forward becomes -Y), scale, and set the axles.
frame = Matrix.Translation((0, 0, WHEEL_R)) @ Matrix.Diagonal((-k, -k, k, 1)) @ Matrix.Translation((0, -(yf + yr) / 2, -zc))
for obj in meshes:
    obj.data.transform(frame)
    obj.data.update()
scene['base_scale'] = k
scene['base_source'] = SOURCE.name
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.data.libraries.write(str(OUTPUT), set(meshes), fake_user=True, compress=True)
print(f'Base written to {OUTPUT}: {len(meshes)} meshes, scale {k:.5f}, wheelbase {(yf - yr) * k:.4f} m.')
