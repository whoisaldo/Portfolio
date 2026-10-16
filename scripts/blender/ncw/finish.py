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


def _mesh(name, verts, faces, uvs, cols, mat_name):
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
        mesh = _mesh(f"proto_{name}_{mat_name}", b.verts, b.faces, b.uvs, b.cols, mat_name)
        obj = bpy.data.objects.new(f"proto_{name}_{mat_name}", mesh)
        obj["proto"] = name
        obj["detail"] = 1 if _props.PROTOS[name]["detail"] else 0
        obj["pack"] = _proto_pack(name)
        link(obj)
        proto_tris += sum(len(p.vertices) - 2 for p in mesh.polygons)
        continue
    mesh = _mesh(f"{district}_{mat_name}_{detail}", b.verts, b.faces, b.uvs, b.cols, mat_name)
    obj = bpy.data.objects.new(f"{district}_{mat_name}" + ("_detail" if detail else ""), mesh)
    obj["district"] = district
    obj["detail"] = detail
    obj["pack"] = PACK_OF.get(district, "core")
    if district in _garage_in.SECTORS:
        obj["visibilitySector"] = district
    link(obj)
    tri_count += sum(len(p.vertices) - 2 for p in mesh.polygons)

_exports.write_all(OUT)

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
