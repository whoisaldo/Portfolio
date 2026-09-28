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
  writes `public/scenes/world/world-high.glb` (2.50 MB, 1024 px textures) and
  `world-phone.glb` (0.90 MB, 512 px textures, every prop the builder tagged
  as detail dropped), `moon.webp`, `holo.webp`, the two screens'
  `ad-kiroshi.webp` and `ad-nicola.webp`, the koi's `koi-magenta.webp` and
  `koi-cyan.webp`, the shop interiors' `shops-high.webp` and
  `shops-phone.webp`, and `src/data/world-assets.js` with content hashes.
  Budgets: 3.5 MB and 1.5 MB.
- The kit, in the site's frame (+x right, +y up, +z toward the hero lens,
  metres, the drift's own frame): the avenue (the Kiroshi and Nicola screens,
  blade signs and the clutter of standard signs every facade collects, the
  overpass with 空き未来へ, sodium lamps, cables, vending machines, lit
  shopfronts under dyed awnings and paper lanterns, painted walls), a canyon
  of vertical signs whose roofs step down to a band of sky, the holographic
  figure and the ARASAKA tower in it, five landmark towers a kilometre off
  (`anchor_mega_<n>`), the billboard plaza
  (`board_main` and seven more), corpo row (one tower per role in
  `experience.js`, a crown slot and a name slot each), the rooftop (tanks, AC
  units, antennas, RIPPERDOC, AFTERLIFE, MILITECH), the garage (roll-up door
  open, magenta fixtures on the car's passenger side and cyan on the
  driver's, as in the garage room), and the moon disc. About 23,000
  triangles.
- Named empties the site reads: `cam_<shot>` and `cam_<shot>_target` (and
  `_b` variants for shots that move while they hold, `_portrait` ones where a
  phone has its own), the flight waypoints
  `cam_garage_edge`, `cam_garage_street`, `cam_garage_across`,
  `cam_garage_door`, `cam_contact_door`, `cam_contact_via`, the anchors
  `anchor_curb_hero`, `anchor_curb_hero_portrait`, `anchor_garage_bay`,
  `anchor_billboard_main`, `anchor_tower_<slug>`, `anchor_lamp_<n>`,
  `anchor_shelter_garage`, `anchor_moon`, `anchor_holo`, `anchor_mega_<n>`
  (with the tower's size, so the far city keeps clear), the car's stops
  `car_<stop>`, and `road_spline`, whose `points` extra is the road sampled a
  metre apart. `npm run check:world` asserts all of them.
- Camera-match cameras `Cam_Hero_Wide` (16:10) and `Cam_Hero_Portrait`
  (390:844) stand on the hero's anchors with its lens and lens shift, for
  Blender's own view of it.
- Sign words are copy and live in `src/data/world.js`. The site sets them in
  Chakra Petch (and a system CJK face for the Japanese) on a canvas atlas at
  runtime: type, never a logo. The street's standard signs (`sign_st_<size>_<n>`,
  six sizes, a few hundred faces) share a few dozen designs painted once per
  size (`STREET_SIGNS`): neon tube on a dark board, lit boxes with dark
  letters, bulb marquees, pictograms.

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
- Every other image the city shows that is not Ali's own work is also an
  original generated with the `codex-image` skill (Codex image generation),
  the kept variant named. None has any text in it: the words on them are the
  site's type.
  - `textures/ad-kiroshi.jpg` (variant 1 of 2), Kiroshi's screen: "Use case:
    ads-marketing. Asset type: a vertical digital billboard texture inside a
    3D cyberpunk city at night (an advertisement for a fictional eye-implant
    brand; the brand name is added later as type). Primary request: an
    extreme close-up of a young woman's face in three-quarter view, one eye
    replaced by a luminous cybernetic optic with concentric glowing rings and
    a fine aperture iris, thin circuit lines glowing faintly under the skin
    around it. Style/medium: glossy high-end commercial photography,
    cinematic, razor sharp, premium beauty campaign. Composition/framing: the
    face fills the upper two thirds of the frame, the optic eye near the
    upper centre; the lower third fades to a clean dark blue gradient with
    nothing in it, left empty for overlaid type. Lighting/mood: cold blue key
    light from the side, cyan rim light, deep crushed blacks, luminous eye.
    Color palette: electric blue #2f7bff, cyan #27dcf2, white highlights,
    near-black. Constraints: no text, no letters, no logos, no watermark; an
    original person, not a real person and not any game character. Avoid:
    garbled lettering, extra eyes, distorted anatomy, frames or borders."
  - `textures/ad-nicola.jpg` (variant 1 of 2), Nicola's: "Use case:
    ads-marketing. Asset type: a vertical digital billboard texture inside a
    3D cyberpunk city at night (an advertisement for a fictional cola; the
    brand name is added later as type). Primary request: a single ice-cold
    blank aluminium soda can, deep red, beaded with condensation, bursting up
    through a frozen splash of dark cola with ice shards and fizz.
    Style/medium: glossy commercial product photography, hyper-real, high
    speed flash freeze. Composition/framing: the can centred slightly high
    and tilted, the splash around its base; the lower third fades to a clean
    deep crimson gradient with nothing in it, left empty for overlaid type.
    Lighting/mood: hot red backlight, a white rim light along the can's
    edge, dramatic contrast. Color palette: crimson #ff2438, deep red, black,
    white highlights. Constraints: the can is completely blank, no label
    text, no logo, no letters anywhere; no watermark. Avoid: any writing on
    the can, garbled lettering, borders."
  - `textures/holo-koi-magenta.jpg` and `holo-koi-cyan.jpg` (both variants),
    the koi: "Use case: stylized-concept. Asset type: a hologram texture for
    a 3D night city, blended additively over the sky (black means
    transparent). Primary request: one large elegant koi fish seen from the
    side, swimming left to right, long flowing fins and tail, rendered
    entirely as a glowing holographic projection. Style/medium: luminous
    hologram: bright magenta and cyan light, fine horizontal scanlines, soft
    glow, faint wireframe contour lines along the body, slight translucency,
    a few scattered light particles trailing from the tail.
    Composition/framing: the whole fish in frame with generous empty margin,
    horizontal, centred. Color palette: hot magenta #ff3fd2, cyan #27dcf2,
    white core highlights, everything else pure black #000000. Constraints:
    pure black background everywhere outside the fish; no text, no logos, no
    watermark. Avoid: water, bubbles, background scenery, frames." Each was
    flattened onto black.
  - `textures/facade-1.jpg` to `facade-3.jpg` (all three variants), the
    painted walls of the avenue and the canyon: "Use case: stylized-concept.
    Asset type: a building facade texture for a 3D night city, mapped flat
    onto a wall (it must read as a flat front elevation). Primary request: a
    strictly orthographic, straight-on front elevation of one tall narrow
    apartment building in a dense neon-lit Asian-inspired cyberpunk district
    at night, eight storeys: rows of windows, some warmly lit with curtains
    and silhouettes of plants, some cold blue from screens, some dark; small
    balconies with railings and laundry, air-conditioning units, drain
    pipes, cables, a few small glowing neon strips and small blank sign
    boxes on the wall, grime and rain streaks on concrete. Style/medium:
    detailed digital matte painting, cinematic, rich texture.
    Composition/framing: the facade fills the entire frame edge to edge,
    perfectly flat and frontal like an architectural elevation drawing, no
    perspective, no vanishing lines, no sky, no street, no ground, no
    neighbouring buildings. Lighting/mood: night; the light comes only from
    the windows and neon; wet concrete with subtle magenta and cyan
    reflections from signs off frame. Color palette: dark charcoal concrete,
    warm amber windows, cyan and magenta neon accents. Constraints: no
    readable text, no letters, no logos, no watermark. Avoid: perspective
    distortion, people in the foreground, sky, borders, readable writing."
  - `textures/shops/*.jpg`, the eight rooms behind the shop windows (one
    variant each, cropped to a bay's 3.2 by 2.75 m), all from one prompt with
    the room, its light and its palette changed: "Use case:
    photorealistic-natural. Asset type: texture for a 3D street scene: the
    room seen through a shop window at night. Primary request: a straight-on,
    eye-level, one-point-perspective view into the interior of [the room], as
    seen from the street through its front window. The back wall is centred
    and square to the camera, the room about three metres deep, a strip of
    floor at the bottom and ceiling at the top. Style/medium: photographic,
    cinematic night photography, 35mm lens, sharp, richly detailed, lived-in
    and cluttered. Composition/framing: the interior fills the whole frame
    edge to edge; no window frame, no glass, no street, no reflections.
    Lighting/mood: [its light]; the room glows against the night outside, a
    little haze in the air. Color palette: [its palette]. Constraints: no
    text, no letters, no numbers, no characters, no logos, no readable
    signage, no watermark; any people are small, seen from behind or
    side-on, never looking at the camera. Avoid: text, garbled lettering,
    logos, fisheye distortion, a window frame." The rooms: a tiny ramen bar
    (warm tungsten; amber, deep red, dark wood), a late-night convenience
    store (cool fluorescent; white, cyan), an electronics and cybernetic
    implant repair shop (cyan and magenta neon; teal, magenta, gunmetal), a
    small izakaya (paper lamps; amber, honey, dark brown), a late-night
    pharmacy (cool white with a green tint), a narrow game arcade (violet,
    hot pink, electric blue), a back-street cybernetic clinic (magenta,
    violet, steel) and a steamy dumpling shop (orange, gold, dark red).
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
- The hero is a low lens in the avenue: an eye 0.6 m over the wet road,
  level, looking straight up it with a 50 degree lens and a lens shift that
  puts the horizon 44% from the top (a phone stands further back with its
  own anchors, 42%), so verticals stay vertical and the street towers the
  way the plate's does. It breathes while it holds: a hand-held sway of a
  fraction of a degree and a metre's push up the avenue over forty seconds.
  The intro's drift keeps its own camera and glides into this one over the
  handoff. The reading sections hold the city at about 30% behind them; the
  hero and Contact hold it at full. Open
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
- The avenue, as the hero sees it. Kiroshi and Nicola are screens
  (`src/world/ads.js`): the generated advertising image pushes in slowly
  toward its subject under the brand's words, set as type, with scanlines,
  a slow refresh band and, every few seconds, a quarter second of tearing.
  Two holographic koi (`src/world/koi.js`) chase each other round a figure
  of eight a few metres over the road, their bodies swimming, doubled in
  the wet road. The walls are painted elevations lit by the signs' spill.
  The shop windows look into rooms (interior mapping in
  `src/world/materials.js`: the eye's ray is traced into a room box per
  bay and the point it reaches projected back onto one of the eight
  photographed rooms, so a passing camera sees along their shelves), with
  the odd figure against the light, dyed awnings lit from under, paper
  lanterns and roller shutters on the ones that are shut. Past the canyon's
  roofs a band of sky holds the figure, ARASAKA and the landmark towers,
  and the fog brightens with distance into the lit city's glow, pink and
  strongest toward downtown, the way the plate's street ends; the road
  mirrors that glow at its far end.
- The grade (`src/world/post.js`): the Khronos neutral tone map, which keeps
  a tube's hue as it brightens, then a grade in the same pass (blacks lifted
  a hair toward violet, mids pushed more saturated than highlights, cool
  shadows, warm tops, a gentle S). Scanlines only in the glitch.
- Switches: `fx world off` gives back the plate and black sections;
  `signs`, `haze` (the far haze and the lamps' light shafts), `wet` (rain,
  the planar reflection and the road's sheen), `traffic` and `reactive`
  reach the city directly.
- Tiers (`quality.js`): high (DPR 1.5, 2.2 MP cap, a 1024 by 512 planar
  reflection, 6,000 rain streaks, 10 AVs and 4 road cars, SMAA, a 4096 sign
  atlas) and phone (DPR 1.25, 0.9 MP, a 512 by 256 reflection, 2,000 rain,
  4 and 2, half-scale bloom, a 2048 sign atlas at half the pixels a metre).
  The mirror is smeared down the road, never across it, so streaks keep hard
  sides; baked streaks lie faintly under it and are the whole reflection
  once a slow device has shed it.
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
