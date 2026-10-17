# Night City garage

An orbitable Blender room built around Ali's existing Audi S4. The reference is the industrial garage image supplied in this conversation: magenta fixtures on the left, cyan on the right, a warm tool bench, exposed ducting, an overhead hoist, worn cabinets and a reflective concrete floor.

The room contains a framed Adam Smasher illustration, Maine's detached arm cannon on a workbench cradle, a three-dimensional yellow jacket with reflective bands and a teal Edgerunners mark, and a mint-and-pink Guts display. The braindance monitor plays a six-second muted loop of the same Lucy-and-David moon image used by the opening cinematic. A small screen shader adds scanlines and intermittent registration errors.

## Source and assets

- `night-city-garage.blend` contains the editable room, lights and a separate copy of the unchanged S4 for previewing.
- `scripts/blender/build_night_city_garage.py` constructs only its own `Night_City_Garage` scene through Blender MCP. It batches the room to 28 meshes and exports the active scene's selected room meshes. It never changes the S4 source scene or model.
- `node scripts/optimize-garage.mjs` compresses the room GLB with Meshopt and WebP textures. The browser asset is about 3 MB, plus a 274 KB braindance video. The existing S4 remains a separate shared asset.
- `src/three/garage-room.js` supplies room lighting, disposable cloned resources and monitor playback. `garage-floor.js` supplies a rough planar reflection of the room and car. `garage-scene.js` preserves the car's hood, markers and view controls.

The room is real geometry. The poster and the monitor image are textures on that geometry. Browser lighting and postprocessing are tuned separately from the Blender preview.

Ali's two attached inspiration images guide composition and lighting. The source images are not served by the website.

## Behavior and verification

The room loads near the garage section rather than during the intro. Its renderer and muted video pause off screen and when the document is hidden. Reduced motion uses the packaged still on the monitor and immediate camera/hood changes. WebGL failure offers the existing photographs. The original five car views remain; Explore garage approaches the workbench. Full screen and the parts overlay can be toggled independently.

Browser checks cover desktop and phone framing, all character props, active video playback, pausing off screen, the five camera views, camera bounds, keyboard orbit/zoom, hood controls, full screen, switching to photographs, resource disposal and remounting. Reduced motion and unavailable WebGL were checked separately. The intro's new street, glitch cue, matching city frames and teardown were checked on both viewports. The original drift evaluator matched at 1,083 samples. A live soundtrack run had no page errors, with a 13.4 ms 95th-percentile frame interval on devbox1. Final garage checks at device scale factor 2 measured 13.6 ms on the phone viewport and 13.0 ms at desktop full screen. The renderer caps large-canvas pixel count, uses a 512-square rough reflection, and updates the stationary shadow map only when the hood moves. Its frame is mostly the eight rect area lights (about three quarters of it, measured by switching them off in place); the floor's reflection is drawn without them, since the puddles show the self-lit tubes and monitor (the same picture to within a few levels in 99% of its pixels, about six milliseconds a frame cheaper on devbox1). While the camera holds, the ambient occlusion is kept from the last moving frame, the room is drawn every other frame (only the monitor changes, at thirty frames a second at most) and the reflection every other one of those; under reduced motion a settled room is not drawn again until something moves. Anything that moves draws every frame.

Review files `browser-preview.png`, `workbench-preview.png`, `blender-preview.png`, `preview.mp4` and `verification.json` are local artifacts excluded from Git.

## Prop kit (the Night City workshop)

The new garage is furnished from a kit of the city's own kind: `scripts/blender/ncw/garage/`
registers prototypes (`ncw/props.py` `@proto`), each built once at the origin with its front toward
+z and its base at y 0, in metres, in the city kit's materials (`trim` with its paint on the vertices
for nearly everything; `glow` and the garage's `tube` for light; `hazard`, `door`, `glass_dark`,
`clearglass`, `print`, `face` and `worn` where the city already uses them). Nothing in it has a
material, a texture or a shader of its own. Importing `ncw.garage` registers the prototypes; the
world builder exports whichever a layout places, as `proto_<name>_<material>` meshes the site
instances. Small ornament is drawn through `k(material, 1)`, so it becomes `<name>__near`: drawn
near by only, and never on a phone, which is how the city's phone tier lightens a prop.

- `shapes.py`: a box on any axes, a bar between two points, a shape turned about any axis, a hung
  cable, words in the city sign maker's strokes (with figures for the bay numbers), a prop's frame
  for setting parts of an assembly down, and the kit's linear paint colours.
- `shop.py`: the two-post lift with its carriages, telescoping arms and screw pads (set by
  `place_lift2` under a car's four supports, Ali's S4's by default; arms out; raised), the
  drive-on scissor lift with 4.4 m runways (down, up) and its power unit, the flush service pad and bay lines, jacks, stands, a creeper, chocks,
  the sectional roll-up door (3 m and 6 m, closed, half, open, with its tracks and opener), the
  fittings of the city's own roller shutter, a man door.
- `bench.py`: the roll cab and its top box, a utility cart, the workbench and vise, the pegboard
  and its tools, the under-hood light, a hand lamp and a lamp reel, tyres, a wheel, a tyre stack,
  the tyre rack, the tyre changer and balancer, the compressor, a hose reel, the oil drain, a drum
  pump and a parts washer (both on the city's drum), shelving, cable tray, conduit, overhead
  battens and shop lights, the 4.5 m task light, the work light on its stand, the tune cart with
  its laptop and OBD lead, a parts table, a welder, a drip tray.
- `lounge.py`: the couch, a fridge, a side table, the coffee; extinguisher, first aid, floor and
  trench drains, oil stains, tyre marks, BAY 01 and BAY 02, a cable ramp; the AFTERLIFE AUTO sign
  in neon (with WATSON / BAY 01 as the old room's sign had it), neon OPEN, neon spanners, posters
  and a lightbox (the city's own adverts), the monitor's bezel.
- `identity.py`: the old Explore-garage room's signature pieces, rebuilt from this folder's
  `night-city-garage.blend` and `scripts/blender/build_night_city_garage.py` as kit prototypes:
  David's yellow jacket draped over its rolling stool (`garage_jacket_chair`), Maine's arm cannon
  in its service cradle (`garage_maine_cradle`), Rebecca's Guts on its pegs (`garage_guts_pegs`),
  the Adam Smasher print's frame and taped backing (`garage_smasher_frame`), the braindance
  monitor at the old screen's size with its label and deck (`garage_bd_monitor`), the amber bench
  strip and the pink and cyan wall tubes, and `place_workbench`, which sets the old back wall down
  as one composition. The art is not in the kit: the frame and the monitor leave `SMASHER_ART`
  and `BD_SCREEN` for the layout's named, UV-mapped `garage_identity_poster` and `garage_screen`
  (`smasher_art()` and `monitor_screen()` give them placed), which take `textures/adam-smasher.jpg`
  and `textures/moon.jpg`. These are fictional display props of Cyberpunk: Edgerunners characters,
  set dressing as they were in the old room, and they keep their shapes and colours on a phone.

The preview builds headless from the repository root:

    blender -b --factory-startup --python scripts/blender/build_garage_props.py
    blender -b --factory-startup --python scripts/blender/build_garage_props.py -- --render DIR

The first writes `garage-props.json` (every prototype's triangles, near-only triangles, materials,
whole extent `box`, measured `bounds`, collision `solids`, whether a phone drops it; each
assembly's extent; the lifts' measured fit against `public/models/ali-s4.glb`) and
`garage-props.blend` (every prop in rows by kind beside a 1.75 m figure). It stops if a
prototype's geometry leaves its box. The second also renders a front three-quarter tile of each
prop (the old room's pieces also with only their phone geometry), the old back wall composed
from the Afterlife workbench station's views, the lifts with the S4 on them, the published solids
as red boxes, and an overview under the
garage's kind of light, cool strips overhead and a warm practical low at the side. The Blender
materials are previews drawn front faces only, as the site draws them: the site draws `worn`,
`print` and `face` with its own shaders.

A prototype's `box` is its whole extent, what the site culls by. What of it stands in the way is
`PROTOS[name]["solids"]` (boxes in its own frame; an empty list for a floor mark or an arm under a
car): a lift's posts and beam, a door's tracks, the shutter's guides, not the open floor between.
