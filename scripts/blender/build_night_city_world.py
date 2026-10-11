"""The city behind the page: the kit the site's live world is built from.

Run through Blender MCP (execute_blender_code) with PROJECT_ROOT defined, or
headless from a terminal:

    python scripts/blender/run_mcp.py --script scripts/blender/build_night_city_world.py

It creates or replaces ONE scene, Night_City_World, and never clears or
edits another (Ali_S4_Final and Night_City_Garage live in the same Blender
session). Its datablocks are prefixed NCW_ and only NCW_ orphans are swept.
The scene is written on its own with bpy.data.libraries.write to
design/night-city-world/night-city-world.blend, and exported as
design/night-city-world/world-source.glb for scripts/optimize-world.mjs.

Frame: world metres, +x right, +y up, +z toward the hero lens, the avenue
running toward -z. It extends the intro drift's frame (src/lib/drift-scene.js)
so the drift, its contact shadow and its reflection carry over unchanged.
Blender is Z-up, so a world point (x, y, z) is Blender (x, -z, y); the glTF
exporter's +Y-up conversion turns that back into (x, y, z) in the GLB.

What the site reads by name (src/world/city.js, scripts/check-world.mjs):
  cam_<shot>, cam_<shot>_target (+ _b variants for shots that move)
  anchor_curb_hero, anchor_garage_bay, anchor_billboard_main,
  anchor_tower_<slug>, anchor_moon, anchor_holo, car_<stop>
  road_spline (an empty whose `points` extra is the road, sampled every metre)
  sign_<id>, board_main, board_<n>, crown_<slug>, holo_figure, moon_disc
Material names are a contract too: NCW_facade gets the window shader,
NCW_asphalt the wet road, NCW_neon_<colour> the neon, and so on.

The code is a package beside this file, `ncw/`: `kit.py` (the scene, the
materials, the primitives and the builders every district shares), one
module per district under `districts/`, then the road, the cameras, the
Blender preview and the export (`finish.py`). Each module runs on import, in
the order below, which is the order the city has always been built in: the
roofs the hero looks along are dressed once the canyon's masses are known,
and sign and lamp numbers follow the order things were placed.
"""
import importlib
import sys
from pathlib import Path

try:
    ROOT = Path(PROJECT_ROOT)  # noqa: F821 (injected by run_mcp.py / the MCP call)
except NameError as missing:
    raise RuntimeError("Define PROJECT_ROOT first: run this through scripts/blender/run_mcp.py") from missing

# A fresh import every run: a Blender session that built the city once keeps
# the modules, and each one builds its part of the scene as it is imported.
HERE = str(ROOT / "scripts/blender")
if HERE not in sys.path:
    sys.path.insert(0, HERE)
for name in [m for m in sys.modules if m == "ncw" or m.startswith("ncw.")]:
    del sys.modules[name]
import ncw  # noqa: E402

ncw.ROOT = ROOT
for module in (
    "kit",
    "streets",
    "districts.avenue",
    "districts.far",
    "districts.skyline",
    "districts.plaza",
    "districts.corpo",
    "districts.rooftop",
    "districts.garage",
    "districts.sky",
    "road",
    "cameras",
    "preview",
    "finish",
):
    importlib.import_module("ncw." + module)
