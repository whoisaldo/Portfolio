from ncw.kit import *  # noqa: F401,F403 (the shared kit: primitives, materials, street constants)
from ncw.road import road

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
