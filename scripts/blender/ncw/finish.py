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
# rest streams in behind it, west and east of the avenue.
PACK_OF = {"japantown": "west", "deck": "west", "mega": "west",
           "plaza": "east", "corpo": "east", "rooftop": "east", "afterlife": "east", "santo": "east"}

for (district, mat_name, detail), b in batches.items():
    if not b.faces:
        continue
    if district.startswith("proto/"):
        name = district[6:]
        mesh = _mesh(f"proto_{name}_{mat_name}", b.verts, b.faces, b.uvs, b.cols, mat_name)
        obj = bpy.data.objects.new(f"proto_{name}_{mat_name}", mesh)
        obj["proto"] = name
        obj["detail"] = 1 if _props.PROTOS[name]["detail"] else 0
        link(obj)
        proto_tris += sum(len(p.vertices) - 2 for p in mesh.polygons)
        continue
    mesh = _mesh(f"{district}_{mat_name}_{detail}", b.verts, b.faces, b.uvs, b.cols, mat_name)
    obj = bpy.data.objects.new(f"{district}_{mat_name}" + ("_detail" if detail else ""), mesh)
    obj["district"] = district
    obj["detail"] = detail
    obj["pack"] = PACK_OF.get(district, "core")
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
