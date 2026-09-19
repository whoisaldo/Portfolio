"""Run in Blender after build_night_city.py to reproduce the camera plates.

These are the geometry renders used to create the final detailed paintovers.
Rendering does not overwrite the approved final market-*.png images.
"""
import bpy
from pathlib import Path

root = Path('/Users/aldo/Desktop/Portfolio')
scene = bpy.data.scenes['Night_City_Street']
bpy.context.window.scene = scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
for orientation in ['wide', 'portrait']:
    scene.camera = next(o for o in scene.objects
                        if o.type == 'CAMERA' and orientation in o.name)
    scene.render.resolution_x = scene.camera['width']
    scene.render.resolution_y = scene.camera['height']
    scene.render.filepath = str(root / 'design/night-city' / f'blockout-{orientation}.png')
    bpy.ops.render.render(write_still=True)
