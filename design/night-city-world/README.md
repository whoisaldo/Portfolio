# Night City, live

One live, scroll-driven city behind the whole portfolio on `/` and
`/work/:slug`, in place of the still plate the hero used to sit on and the
flat black under every other section. The camera holds a shot per section
and flies between them as the reader scrolls; Ali's S4 drives the same road
and ends parked in the garage; the intro's drift happens in this city too.
The plate (`public/scenes/night-city/neon-*.webp`) survives as the poster the
city fades in over, and as the whole of the fallback.

It is a Blender kit (the hero avenue and every set piece a shot looks at)
plus a procedural far city, drawn by vanilla three.js with one pmndrs
`postprocessing` pass. `/recruiters` mounts none of it.

## Source and assets

- `night-city-world.blend` holds one scene, `Night_City_World`. It is built
  by `scripts/blender/build_night_city_world.py` through the Blender MCP
  (`execute_blender_code` with `PROJECT_ROOT` defined first), or headless:
  `python scripts/blender/run_mcp.py --script scripts/blender/build_night_city_world.py`.
  The builder creates only its own scene and its own `NCW_` datablocks, never
  touches `Ali_S4_Final` or `Night_City_Garage`, writes the scene alone to the
  `.blend` with `bpy.data.libraries.write`, and exports `world-source.glb`
  (git-ignored) next to it.
- `npm run world:assets` (`scripts/optimize-world.mjs`, glTF Transform: prune,
  dedup of accessors, meshes and textures, weld, WebP textures, Meshopt)
  writes `public/scenes/world/world-high.glb` (1.84 MB, 1024 px textures) and
  `world-phone.glb` (0.66 MB, 512 px textures, every prop the builder tagged
  as detail dropped), `moon.webp` and `holo.webp`, and
  `src/data/world-assets.js` with content hashes. Budgets: 3.5 MB and 1.5 MB.
- The kit, in the site's frame (+x right, +y up, +z toward the hero lens,
  metres, the drift's own frame): the avenue (a Kiroshi and a Nicola board
  each side, blade signs, the overpass with 空き未来へ, sodium lamps, cables,
  vending machines, shopfronts), a canyon of vertical signs to the
  holographic figure and the ARASAKA tower, the billboard plaza
  (`board_main` and seven more), corpo row (one tower per role in
  `experience.js`, a crown slot and a name slot each), the rooftop (tanks, AC
  units, antennas, RIPPERDOC, AFTERLIFE, MILITECH), the garage (roll-up door
  open, magenta fixtures on the car's passenger side and cyan on the
  driver's, as in the garage room), and the moon disc. About 24,000
  triangles.
- Named empties the site reads: `cam_<shot>` and `cam_<shot>_target` (and
  `_b` variants for shots that move while they hold), the flight waypoints
  `cam_garage_edge`, `cam_garage_street`, `cam_garage_across`,
  `cam_garage_door`, `cam_contact_door`, `cam_contact_via`, the anchors
  `anchor_curb_hero`, `anchor_curb_hero_portrait`, `anchor_garage_bay`,
  `anchor_billboard_main`, `anchor_tower_<slug>`, `anchor_lamp_<n>`,
  `anchor_shelter_garage`, `anchor_moon`, `anchor_holo`, the car's stops
  `car_<stop>`, and `road_spline`, whose `points` extra is the road sampled a
  metre apart. `npm run check:world` asserts all of them.
- Camera-match cameras `Cam_Hero_Wide` (16:10) and `Cam_Hero_Portrait`
  (390:844) use the drift's camera formula. Their viewport renders and a
  Cycles reference of the wide one sit beside the plate in
  `cam_hero_*-compare-review.png` and `cam_hero_wide-cycles-compare.png`
  (local, git-ignored).
- Sign words are copy and live in `src/data/world.js`. The site sets them in
  Chakra Petch (and a system CJK face for the Japanese) on a canvas atlas at
  runtime: type, never a logo.

## References

- The plate, `public/scenes/night-city/neon-wide.webp` and
  `neon-portrait.webp`, is the art target for the hero shot: Kiroshi left,
  Nicola right, the holographic figure and the ARASAKA tower at the end of
  the street, the overpass, the wet road carrying the colour.
- The four rooftop signs and their colours are the ones `Skyline.jsx` carried
  (Arasaka `#ff003c`, Militech `#fcee0a`, Afterlife `#ff2e88`, Ripperdoc
  `#eceae4` with its cross); that component and `RoadTraffic.jsx` are gone,
  and their signs and traffic are this city's.
- [ambientCG Asphalt 026 C](https://ambientcg.com/view?id=Asphalt026C) is the
  road (re-encoded 1K JPGs in `textures/`). The sidewalk, the concrete and the
  garage's walls reuse the garage's
  [Concrete 048](https://ambientcg.com/view?id=Concrete048) and
  [Concrete 023](https://ambientcg.com/view?id=Concrete023) in place. All
  [CC0](https://docs.ambientcg.com/license/). Poly Haven was not used (its
  integration is switched off in Ali's Blender addon, and the addon was left
  as it was).
- `textures/holo-figure.jpg`, the holographic woman, is an original image
  generated for this with Codex image generation (the `codex-image` skill,
  two variants, the first kept), from this prompt: "a towering holographic
  advertisement figure of a woman, waist up, facing the viewer, sharp
  chin-length bob haircut, calm confident expression, one hand raised beside
  her face with the index finger pointing up, wearing a high-collared jacket.
  Rendered entirely as a violet and magenta hologram: glowing edges, fine
  horizontal scanlines, slight translucency, a few thin bright vertical light
  seams, subtle digital noise at the edges. Pure black background (#000000)
  everywhere outside the figure so it can be blended additively. Portrait
  orientation 1024x1536. Original character, not any existing person or game
  character; no text, no logos, no watermark." It is served as
  `public/scenes/world/holo.webp`.
- The Contact moon is `design/night-city-garage/textures/moon.jpg`, the
  intro's own David-and-Lucy moon still, on a disc over the southern
  skyline: a bookend to the intro by picture as well as by shape.
- The engine's shape (a fixed mount behind the page, sections that opt in
  with `data-shot`, hold-then-morph scroll maths, damped camera) follows
  naman0r/namanrusia.dev PR #10. Nothing of its look is used.

## Behaviour

- `src/world/stage.js` is the store; `scroll-stage.js` owns Lenis, measures
  the `[data-shot]` sections and turns the scroll into a continuous shot
  position (hold while a section fills the screen, fly while the next rises
  to 20% from the top) and writes the scrim's darkness as `--world-dim`.
  `WorldMount.jsx` renders the poster, the canvas and the scrim, builds the
  city after first paint (or while the door is up) and crossfades on its
  first frame.
- The hero is the drift's own end camera. The reading sections hold the
  city at about 30% behind them; the hero and Contact hold it at full. Open
  flights go up, across and down, lifted by a height field of the kit
  (`clearance.js`); the garage and Contact flights run through the named
  waypoints, and the garage flight looks at the car. Crossing the middle of
  a flight fires the braindance glitch (slices, scanlines, an RGB split that
  hits harder on the bass).
- The Work deck's entry is the plaza board's art, swapped through the same
  glitch; the Experience card being read lights its tower's crown; the
  garage flight ends on `GarageModel`'s own front preset in the car's bay,
  and once it has landed the viewer covers the city (dim 0.85, the loop
  stopped). `/work/<project>` holds the plaza with that project on the
  board, `/work/<role>` its tower, and route changes fly.
- The S4 is the garage's GLB with the intro's rig, lamps, smoke and trails
  (`src/three/drift/`). Its distance along the road is a damped function of
  the scroll; it steers by the road's curvature, brakes into each stop,
  backs up when the reader scrolls up, and parks at the hero's curb (the
  right-hand curb: every left-hand spot sat behind the name, the tagline or
  the photograph) and in the garage bay.
- The intro plays in this city when it is ready by `CITY_IN`: the moon
  dissolves to the live city, the drift runs on the song clock and parks at
  the curb instead of vanishing, the handoff glitches through the city's
  pass, and the page arrives over the same camera. Otherwise the plate path
  runs as it always has.
- Switches: `fx world off` gives back the plate and black sections;
  `signs`, `haze` (the far haze and the lamps' light shafts), `wet` (rain,
  the planar reflection and the road's sheen), `traffic` and `reactive`
  reach the city directly.
- Tiers (`quality.js`): high (DPR 1.5, 2.2 MP cap, 512 planar reflection,
  6,000 rain streaks, 10 AVs and 4 road cars, SMAA) and phone (DPR 1.25,
  0.9 MP, baked reflection streaks, 2,000 rain, 4 and 2, half-scale bloom).
  The first two seconds on screen are timed and a p95 over budget sheds
  pixels, then the reflection, then half the rain. No GPU, reduced motion,
  `fx world off` or a WebGL failure mean no city at all; a lost context shows
  the poster and rebuilds on restore. The loop stops when the tab is hidden
  and under the door, the console, the expanded deck and the garage viewer.

## Verification

- `npm run check:world` decodes both GLBs and checks the shots, the anchors,
  the towers, the boards, the road, the garage preset and the budgets.
  `npm run check:drift` holds the drift's path to the original: 1,083
  samples identical for the first 3.8 seconds, and the parking curve joining
  at the same position, heading and speed.
- Draw calls a frame (every pass): 163 on high (mirror 28, scene 113, post
  22), 115 on the phone; 372,000 and 184,000 triangles.
- Frame time on devbox1 (M1 Max, Chrome, Metal): headed, p95 13.5 ms on high
  at 1440x900 and 13.7 ms on the phone tier at 390x844 (the display's own
  11.8 ms cadence at p50); headless at 60 Hz, every frame on time (p95
  16.7 ms); with vsync off, the work itself is p95 3.5 ms (high, pixel ratio
  1.3) and 3.0 ms (phone).
- Three intro replays rebuild the city with `renderer.info.memory` at 101
  geometries and 50 textures each time.
- Review files (`*-viewport.png`, `*-review.png`, `*-cycles*.png`,
  `world-source.glb`, `mcp.log`) stay local and are git-ignored.
