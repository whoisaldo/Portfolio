"""Build Ali's 2013 S6 from the CC-BY A6 C7. Run through Blender MCP or --python.

Blender coordinates: X left, -Y forward, Z up. glTF converts this to X left,
+Z forward, Y up. All dimensions are metres. See design/audi-s6/README.md.
"""
import bpy
import bmesh
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(globals().get('PROJECT_ROOT', '/Users/aldo/Desktop/Portfolio'))
SOURCE = ROOT / 'design/audi-s6/source'
SCENE_NAME = globals().get('SCENE_NAME', 'Ali_S6_Final')

old = bpy.data.scenes.get(SCENE_NAME)
if old:
    # Free this build's own data only: the live Blender may hold other work.
    owned = {obj.data for obj in old.objects if obj.data}
    owned |= {m for obj in old.objects for m in getattr(obj.data, 'materials', []) if m}
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(old)
    for block in sorted(owned, key=lambda b: isinstance(b, bpy.types.Material)):
        if block.users == 0 or (block.users == 1 and block.use_fake_user):
            bpy.data.batch_remove([block])
    for image in [i for i in bpy.data.images if i.name.startswith('S6_') and i.users == 0]:
        bpy.data.images.remove(image)
if bpy.app.background:
    # Headless there is no window to switch; the operators the kit calls act
    # on the context scene, so build in it.
    scene = bpy.context.scene
    for obj in list(scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    scene.name = SCENE_NAME
else:
    scene = bpy.data.scenes.new(SCENE_NAME)
    bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'


def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def rgba(hex_color):
    return tuple(linear(int(hex_color[i:i+2], 16) / 255) for i in (0, 2, 4)) + (1,)


def material(name, color, metal=0, rough=.4, coat=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = rgba(color)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = .13
    m.diffuse_color = rgba(color)
    return m


def bsdf(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def pattern(name, size, shade):
    """A small packed RGBA image from shade(x, y) -> (r, g, b, a), linear."""
    image = bpy.data.images.new(name, width=size, height=size, alpha=True)
    pixels = []
    for y in range(size):
        for x in range(size):
            pixels.extend(shade(x, y))
    image.pixels[:] = pixels
    image.pack()
    return image


def textured(m, image, alpha=False):
    n = m.node_tree.nodes.new('ShaderNodeTexImage')
    n.image = image
    m.node_tree.links.new(n.outputs['Color'], bsdf(m).inputs['Base Color'])
    if alpha:
        m.node_tree.links.new(n.outputs['Alpha'], bsdf(m).inputs['Alpha'])
        m.surface_render_method = 'DITHERED'
    return m


def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.parent = parent
    return obj


# Materials whose image repeats across the part: mesh() gives them box UVs.
TILED = set()


def mesh(name, verts, faces, mat, parent=None, smooth=False, tile=40):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.parent = parent
    if mat:
        data.materials.append(mat)
    if smooth:
        for p in data.polygons:
            p.use_smooth = True
    if mat in TILED:
        uv = data.uv_layers.new(name='TileUV')
        for p in data.polygons:
            axis = max(range(3), key=lambda i: abs(p.normal[i]))
            axes = [i for i in range(3) if i != axis]
            for li in p.loop_indices:
                co = data.vertices[data.loops[li].vertex_index].co
                uv.data[li].uv = (co[axes[0]] * tile, co[axes[1]] * tile)
    return obj


def bevel(obj, width=.004, segments=2):
    mod = obj.modifiers.new('Rounded manufacturing edges', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    return obj


def box(name, loc, size, mat, parent=None, radius=.004):
    x, y, z = (s / 2 for s in size)
    vs = [(loc[0] + a * x, loc[1] + b * y, loc[2] + c * z) for a, b, c in [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1), (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]]
    obj = mesh(name, vs, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], mat, parent)
    return bevel(obj, radius) if radius else obj


def smooth_path(points, steps=8):
    """Catmull-Rom through the points, so a hose is drawn by its bends."""
    points = [Vector(p) for p in points]
    result = []
    for i in range(len(points) - 1):
        a, b, c, d = points[max(0, i - 1)], points[i], points[i + 1], points[min(len(points) - 1, i + 2)]
        for j in range(steps):
            t = j / steps
            result.append(.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t))
    return result + [points[-1]]


def tube(name, points, radius, mat, parent=None, cyclic=False, sides=8, radii=None, caps=False):
    """A tube along points. radii, if given, is one radius per point."""
    vs, fs = [], []
    points = [Vector(p) for p in points]
    n = len(points)
    for i, p in enumerate(points):
        if cyclic:
            direction = points[(i + 1) % n] - points[i - 1]
        else:
            direction = points[min(i + 1, n - 1)] - points[max(i - 1, 0)]
        direction.normalize()
        helper = Vector((0, 0, 1)) if abs(direction.z) < .9 else Vector((1, 0, 0))
        u = direction.cross(helper).normalized()
        v = direction.cross(u).normalized()
        r = radii[i] if radii else radius
        for j in range(sides):
            t = j * 2 * math.pi / sides
            vs.append(tuple(p + r * (u * math.cos(t) + v * math.sin(t))))
    for i in range(n if cyclic else n - 1):
        for j in range(sides):
            a, b = i * sides, ((i + 1) % n) * sides
            fs.append((a + j, a + (j + 1) % sides, b + (j + 1) % sides, b + j))
    if caps and not cyclic:
        fs.append(tuple(reversed(range(sides))))
        fs.append(tuple(range((n - 1) * sides, n * sides)))
    return mesh(name, vs, fs, mat, parent, True)


def lathe(name, profile, mat, parent=None, segments=48, axis='X'):
    """Revolve (along, radius) pairs about the local axis."""
    vs, fs = [], []
    for a, r in profile:
        for i in range(segments):
            t = i * 2 * math.pi / segments
            c, s = math.cos(t) * r, math.sin(t) * r
            vs.append({'X': (a, s, c), 'Y': (c, a, s), 'Z': (c, s, a)}[axis])
    for j in range(len(profile) - 1):
        for i in range(segments):
            fs.append((j * segments + i, j * segments + (i + 1) % segments, (j + 1) * segments + (i + 1) % segments, (j + 1) * segments + i))
    return mesh(name, vs, fs, mat, parent, True)


def cylinder(name, location, radius, depth, mat, parent=None, segments=32, axis='Z'):
    obj = lathe(name, [(0, 0), (0, radius), (depth, radius), (depth, 0)], mat, parent, segments, axis)
    obj.location = location
    return obj


def text(name, word, location, size, mat, parent=None, rotation=(0, 0, 0), extrude=.0003, font=None, spacing=1.0):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = word
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.size = size
    curve.extrude = extrude
    curve.resolution_u = 3
    curve.space_character = spacing
    if font:
        curve.font = font
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation
    curve.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    return obj


def remove_faces(obj, predicate):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if predicate(f)], context='FACES')
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def join(objects, name=None):
    """Apply modifiers and join rigid parts that share a parent and material."""
    objects = [o for o in objects if o.type == 'MESH']
    if not objects:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        for mod in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    if name:
        objects[0].name = name
        objects[0].data.name = name
    return objects[0]

# ---- end of the kit ----

# 255/40 R19 on the standard 19-inch five-parallel-S-spoke wheel, 8.5 J.
# The wheel is provisional: none of Ali's photos shows a wheel face.
RIM_R = 19 * .0254 / 2
WHEEL_R = RIM_R + .255 * .40
WHEELBASE = 2.912
TRACK = {'f': 1.615, 'r': 1.606}


def build_wheel(code, side, pivot, mats):
    """One wheel group under pivot, spinning about local X. side 'l' is +X."""
    sign = 1 if side == 'l' else -1
    wheel = empty('wheel_' + code + side, parent=pivot)
    signed = lambda profile: [(sign * x, r) for x, r in profile]
    half = .108
    lathe('tyre_' + code + side, signed([(-.126, RIM_R + .012), (-.129, RIM_R + .04), (-.124, RIM_R + .075), (-.112, WHEEL_R - .003), (-.09, WHEEL_R), (.09, WHEEL_R), (.112, WHEEL_R - .003), (.124, RIM_R + .075), (.129, RIM_R + .04), (.126, RIM_R + .012)]), mats['rubber'], wheel, 64)
    lathe('rim_barrel_' + code + side, signed([(-half, RIM_R + .01), (-half, RIM_R - .006), (half - .02, RIM_R - .006), (half, RIM_R - .002), (half + .012, RIM_R + .01), (half + .016, RIM_R + .004), (half + .012, RIM_R - .014), (half - .01, RIM_R - .02)]), mats['wheel'], wheel, 72)
    lathe('hub_' + code + side, signed([(half - .03, 0), (half - .03, .07), (half - .004, .072), (half + .004, .064), (half + .004, 0)]), mats['wheel'], wheel, 40)
    face = half + .006
    for k in range(5):
        base = k * 2 * math.pi / 5
        for arm in [-1, 1]:
            # Each pair leaves the hub close together and bows apart into
            # the rim in a shallow S, as on Audi's 2013 US wheel chart (E).
            stations = [(.064, .026, .022, face), (.11, .07, .018, face + .005), (.165, .14, .016, face + .003), (.205, .2, .015, face - .006), (RIM_R - .006, .245, .014, face - .017)]
            vs = []
            for r, offset, width, axial in stations:
                t = base + arm * offset + .05 * math.sin((r - .066) / (RIM_R - .074) * math.pi)
                for depth in [axial, axial - .032]:
                    for edge in [-1, 1]:
                        vs.append((sign * depth, math.sin(t) * r + math.cos(t) * width * edge, math.cos(t) * r - math.sin(t) * width * edge))
            fs = [(0, 2, 3, 1), (16, 17, 19, 18)]
            for j in range(4):
                a, b = j * 4, j * 4 + 4
                fs.extend([(a, b, b + 1, a + 1), (a + 2, a + 3, b + 3, b + 2), (a, a + 2, b + 2, b), (a + 1, b + 1, b + 3, a + 3)])
            if sign < 0:
                fs = [tuple(reversed(f)) for f in fs]
            bevel(mesh('S_spoke', vs, fs, mats['wheel'], wheel), .003, 1)
    lathe('centre_cap_' + code + side, signed([(face + .004, 0), (face + .004, .052), (face + .008, .054), (face + .011, .05), (face + .012, 0)]), mats['wheel_dark'], wheel, 36)
    for j in range(5):
        t = j * 2 * math.pi / 5 + math.pi / 5
        cylinder('wheel_bolt', (sign * (face - .004), math.sin(t) * .062, math.cos(t) * .062), .009, sign * .012, mats['steel'], wheel, 6, 'X')
    for offset in [-.017, -.006, .006, .017]:
        tube('cap_ring', [(sign * (face + .0125), offset + .0075 * math.cos(i * math.pi / 8), .0062 * math.sin(i * math.pi / 8)) for i in range(16)], .0009, mats['steel'], wheel, True, 4)
    # Ventilated discs turn with the wheel: 400 mm front, 356 mm rear.
    disc = .2 if code == 'f' else .178
    lathe('brake_disc_' + code + side, signed([(.006, .09), (.006, disc), (.034, disc), (.034, .09)]), mats['disc'], wheel, 64)
    lathe('brake_disc_hat_' + code + side, signed([(.02, 0), (.02, .095), (.05, .095), (.05, 0)]), mats['wheel_dark'], wheel, 32)
    # The calipers do not spin: they ride on the knuckle (or the axle).
    box('brake_caliper_' + code + side, (sign * .022, disc - .016, .0), (.06 if code == 'f' else .05, .07, .2 if code == 'f' else .16), mats['caliper'], pivot, .018)
    if code == 'f':
        box('caliper_S6_mark', (sign * .053, disc - .014, .0), (.002, .018, .05), mats['badge_red'], pivot, .001)
    return wheel


# Until the CC-BY base is in design/audi-s6/source/, the build stops at the
# S6's own parts on their provisional sockets (s6_parts.py).
exec((ROOT / 'scripts/blender/s6_parts.py').read_text())
