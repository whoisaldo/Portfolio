from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw.road import road

# ---------------------------------------------------------------------------
# Finish the batches into meshes: the kit's one per district, material and
# detail (the site merges them per material and cuts the result into tiles
# the camera culls, src/world/merge.js); the props' prototypes (props.py) one
# per prototype and material, at the origin, which the site instances.
# ---------------------------------------------------------------------------
from ncw import props as _props  # noqa: E402
from ncw import exports as _exports  # noqa: E402

_props.build_protos()
empty("signs_index", (0, 0, 0), props={"ids": STREET_SIGN_IDS})
# Everyone the districts stood somewhere: x, y, z, yaw, pose (kit.POSES), flat.
if PEOPLE:
    empty("anchor_people", (0, 0, 0), props={"stand": [v for p in PEOPLE for v in p]})
tri_count = 0
proto_tris = 0


def _smooth(mesh, angle=math.radians(35.0)):
    """Round where it is round: the batches give every face its own
    vertices, so weld them, shade smooth and keep the edges sharper than
    `angle` sharp (a tyre's tread is smooth, a box's corners are not)."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(mesh)
    bm.free()
    mesh.shade_smooth()
    mesh.set_sharp_from_angle(angle=angle)


def _mesh(name, verts, faces, uvs, cols, mat_name, smooth=False):
    mesh = bpy.data.meshes.new(PREFIX + name)
    mesh.from_pydata(verts, [], faces)
    uv_layer = mesh.uv_layers.new(name="UVMap")
    col_layer = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="CORNER")
    mesh.color_attributes.active_color = col_layer
    mesh.color_attributes.render_color_index = 0
    li = 0
    for f in mesh.polygons:
        for loop_index in f.loop_indices:
            uv_layer.data[loop_index].uv = uvs[li]
            col_layer.data[loop_index].color = cols[li]
            li += 1
    mesh.materials.append(MATS[mat_name])
    mesh.validate()
    if smooth:
        _smooth(mesh)
    return mesh


# Which GLB a district's bulk goes in (scripts/optimize-world.mjs): the
# core is what the hero needs, and every named piece, anchor and prototype
# (and the garage, whose painted walls carry the core's own textures); the
# rest streams in behind it, a pack per district. A district's key with
# "_b" (what the hero cannot see of it) goes in that district's pack.
PACK_OF = {"japantown": "japantown", "deck": "deck", "mega": "mega",
           "plaza": "plaza", "corpo": "corpo", "rooftop": "afterlife", "afterlife": "afterlife",
           "avenue_s": "south", "santo": "santo", "canyon_b": "canyon"}
# The workshop inside the garage (districts/garage_interior.py) is a pack
# of its own, which the page asks for as the reader nears the Garage section
# rather than with the districts: one key a visibility sector, each kept as
# its own batch (and tagged visibilitySector) so the site can cull the room
# by what a camera sees of it through the door and the office's window.
from ncw.districts import garage_interior as _garage_in  # noqa: E402
for _sector in _garage_in.SECTORS:
    PACK_OF[_sector] = "garage"


# Every other batch is the street's ("exterior") but for the faces of it
# the room owns (garage_interior.owner: the shell's inside, its door's
# reveals and panel, the office's glazing), which go in a batch of their own
# for each sector they are in. The whole city carries the label, so a
# material the street and a room share is still one batch the site merges
# for the street's every district, and the room's shares merge with the
# pack's own of that sector. Nothing is moved between packs.
def _owned(district, b):
    """{owner: (verts, faces, uvs, cols)}: the batch, split by who owns
    each face, the street's share first."""
    if district in _garage_in.SECTORS:
        return {district: (b.verts, b.faces, b.uvs, b.cols)}
    lo, hi = _garage_in.SHELL_NEAR
    world = lambda v: (v[0], v[2], -v[1])  # noqa: E731 (Blender's back to world metres, kit.P undone)
    if not any(all(lo[k] <= w[k] <= hi[k] for k in range(3)) for w in map(world, b.verts)):
        return {"exterior": (b.verts, b.faces, b.uvs, b.cols)}
    parts = {}
    corner = 0
    for face in b.faces:
        owner = _garage_in.owner([world(b.verts[i]) for i in face])
        faces, uvs, cols, at = parts.setdefault(owner, ([], [], [], {}))
        # (The batch's vertices this share uses, renumbered in first use.)
        faces.append(tuple(at.setdefault(i, len(at)) for i in face))
        uvs.extend(b.uvs[corner:corner + len(face)])
        cols.extend(b.cols[corner:corner + len(face)])
        corner += len(face)
    return {owner: ([b.verts[i] for i in parts[owner][3]], *parts[owner][:3])
            for owner in sorted(parts, key=lambda o: (o != "exterior", o))}

# A prototype that only one district's pack sets down rides in that pack and
# not in the core, which stays the size of what the hero needs (the kit's
# own lamps, bins and the rest stand on every street and stay in the core).
_PROTO_PACKS = {}
for _name, *_rest, _district in _props.INSTANCES:
    _PROTO_PACKS.setdefault(_name, set()).add({**PACK_OF, "canyon": "canyon"}.get(_district, "core"))


def _proto_pack(name):
    base = name[:-len(_props.NEAR)] if name.endswith(_props.NEAR) else name
    packs = _PROTO_PACKS.get(base, {"core"})
    return next(iter(packs)) if len(packs) == 1 else "core"


# The garage's kit registers more prototypes than its layout sets down: one
# nobody placed is left out of the export, not left to default to the core.
def _unplaced_garage(name):
    base = (name[:-len(_props.NEAR)] if name.endswith(_props.NEAR) else name).split(_props.SHAPE)[0]
    return base.startswith("garage_") and base not in _PROTO_PACKS


for district, flat in LIGHTS.items():
    empty(f"anchor_lights_{district}", (0, 0, 0), props={"lights": flat, "pack": PACK_OF.get(district, "core")})

for (district, mat_name, detail), b in batches.items():
    if not b.faces:
        continue
    if district.startswith("proto/"):
        name = district[6:]
        if _unplaced_garage(name):
            continue
        # The garage's kit is turned and rounded (tyres, drums, a tank, the
        # lift's rams): smooth-shaded, its edges kept.
        mesh = _mesh(f"proto_{name}_{mat_name}", b.verts, b.faces, b.uvs, b.cols, mat_name, smooth=name.startswith("garage_"))
        obj = bpy.data.objects.new(f"proto_{name}_{mat_name}", mesh)
        obj["proto"] = name
        obj["detail"] = 1 if _props.PROTOS[name]["detail"] else 0
        obj["pack"] = _proto_pack(name)
        link(obj)
        proto_tris += sum(len(p.vertices) - 2 for p in mesh.polygons)
        continue
    name = f"{district}_{mat_name}" + ("_detail" if detail else "")
    for owner, (verts, faces, uvs, cols) in _owned(district, b).items():
        # (The street's share keeps the batch's names; a share the room owns
        # is named for its sector after them, unless it is all there is.)
        own = "" if owner in ("exterior", district) or len(faces) == len(b.faces) else f"_{owner}"
        mesh = _mesh(f"{district}_{mat_name}_{detail}{own}", verts, faces, uvs, cols, mat_name, smooth=district in _garage_in.SECTORS)
        obj = bpy.data.objects.new(name + own, mesh)
        obj["district"] = district
        obj["detail"] = detail
        obj["pack"] = PACK_OF.get(district, "core")
        obj["visibilitySector"] = owner
        link(obj)
        tri_count += sum(len(p.vertices) - 2 for p in mesh.polygons)

_exports.write_all(OUT)

# The named meshes outside the workshop's pack (the door the site rolls up,
# the monitor's screen, the signs, boards and the rest) each whole: one
# owner a mesh, or the build stops, since a named piece cannot be split.
for _obj in export_coll.objects:
    if _obj.type != "MESH" or _obj.name.startswith("proto_") or "visibilitySector" in _obj or _obj.get("pack") == "garage":
        continue
    _owners = {_garage_in.owner([(w.x, w.z, -w.y) for w in (_obj.matrix_world @ _obj.data.vertices[i].co for i in poly.vertices)])
               for poly in _obj.data.polygons}
    if len(_owners) > 1:
        raise RuntimeError(f"{_obj.name} has faces both the street and the workshop own: {sorted(_owners)}")
    _obj["visibilitySector"] = _owners.pop() if _owners else "exterior"

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

# Headless (blender -b) has no window to show the scene in.
if bpy.context.window:
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
       "meshes": len([o for o in exported if o.type == "MESH"]), "triangles": tri_count, "proto_triangles": proto_tris,
       "props": len(_props.INSTANCES), "signs": len(SIGNS), "road_points": len(road)})
