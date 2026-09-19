# Night City garage

An orbitable Blender room built around Ali's existing Audi S4. The reference is the industrial garage image supplied in this conversation: magenta fixtures on the left, cyan on the right, a warm tool bench, exposed ducting, an overhead hoist, worn cabinets and a reflective concrete floor.

The room contains a framed Adam Smasher illustration, Maine's detached arm cannon on a workbench cradle, a three-dimensional yellow jacket with reflective bands and a teal Edgerunners mark, and a mint-and-pink Guts display. The braindance monitor plays a six-second muted loop of the same Lucy-and-David moon image used by the opening cinematic. A small screen shader adds scanlines and intermittent registration errors.

## Source and assets

- `night-city-garage.blend` contains the editable room, lights and a separate copy of the unchanged S4 for previewing.
- `scripts/blender/build_night_city_garage.py` constructs only its own `Night_City_Garage` scene through Blender MCP. It batches the room to 28 meshes and exports the active scene's selected room meshes. It never changes the S4 source scene or model.
- `node scripts/optimize-garage.mjs` compresses the room GLB with Meshopt and WebP textures. The browser asset is about 3 MB, plus a 274 KB braindance video. The existing S4 remains a separate shared asset.
- `src/three/garage-room.js` supplies room lighting, disposable cloned resources and monitor playback. `garage-floor.js` supplies a rough planar reflection of the room and car. `garage-scene.js` preserves the car's hood, markers and view controls.

The room is real geometry. The poster and the monitor image are textures on that geometry. Browser lighting and postprocessing are tuned separately from the Blender preview.

## References

- [Official Edgerunners character art](https://www.cyberpunk.net/en/edgerunners) was used to check Adam Smasher, David, Lucy and Maine. The Smasher poster is an original generated illustration based on that character reference.
- [CDPR's Edgerunners update announcement](https://blog.playstation.com/?p=369114) documents David's jacket and Rebecca's Guts in the game.
- [ambientCG Concrete 023](https://ambientcg.com/view?id=Concrete023), [Concrete 048](https://ambientcg.com/view?id=Concrete048) and [Painted Metal 004](https://ambientcg.com/view?id=PaintedMetal004) provide the surface maps. These assets are [CC0](https://docs.ambientcg.com/license/).
- Ali's two attached inspiration images guide composition and lighting. The source images are not served by the website.

## Behavior and verification

The room loads near the garage section rather than during the intro. Its renderer and muted video pause off screen and when the document is hidden. Reduced motion uses the packaged still on the monitor and immediate camera/hood changes. WebGL failure offers the existing photographs. The original five car views remain; Explore garage approaches the workbench. Full screen and the parts overlay can be toggled independently.

Browser checks cover desktop and phone framing, all character props, active video playback, pausing off screen, the five camera views, camera bounds, keyboard orbit/zoom, hood controls, full screen, switching to photographs, resource disposal and remounting. Reduced motion and unavailable WebGL were checked separately. The intro's new street, glitch cue, matching city frames and teardown were checked on both viewports. The original drift evaluator matched at 1,083 samples. A live soundtrack run had no page errors, with a 13.4 ms 95th-percentile frame interval on devbox1. Final garage checks at device scale factor 2 measured 13.6 ms on the phone viewport and 13.0 ms at desktop full screen. The renderer caps large-canvas pixel count, uses a 512-square rough reflection, and updates the stationary shadow map only when the hood moves.

Review files `browser-preview.png`, `workbench-preview.png`, `blender-preview.png`, `preview.mp4` and `verification.json` are local artifacts excluded from Git.
