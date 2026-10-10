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
  dedup of accessors, meshes and textures, weld, WebP textures, Meshopt; and
  first every map and vertex attribute no shader reads taken off: roughness
  and normal maps but the road's, UVs and vertex colours on plain paint and
  neon, colours where only UVs are read)
  writes `public/scenes/world/world-high.glb` (2.54 MB, 1024 px textures) and
  `world-phone.glb` (1.16 MB, 512 px textures, every prop the builder tagged
  as detail dropped), `moon.webp`, `holo.webp`, the two screens'
  `ad-kiroshi.webp` and `ad-nicola.webp`, the koi's `koi-magenta.webp` and
  `koi-cyan.webp`, the shop interiors' `shops-high.webp` and
  `shops-phone.webp`, corpo row's `logos.webp`, `earth.webp` (the portrait
  intro plate's own Earth, cropped square round its disc, which the voxel
  moon samples a voxel at a time), and `src/data/world-assets.js` with
  content hashes (and the logos' rectangles).
  Budgets: 3.5 MB and 1.5 MB.
- The kit, in the site's frame (+x right, +y up, +z toward the hero lens,
  metres, the drift's own frame): the avenue (the Kiroshi and Nicola screens,
  blade signs and the clutter of standard signs every facade collects, the
  overpass with 空き未来へ, sodium lamps, cables, vending machines, lit
  shopfronts under dyed awnings and paper lanterns, painted walls), a canyon
  of vertical signs whose roofs step down to a band of sky, the holographic
  figure and the ARASAKA tower in it (a podium with a lit lobby, a shaft
  with its corners cut back, the red bands, the name's square face, and a
  dark head ringed with red fins under a mast), the canyon running on to
  the glow at its end and a rail viaduct crossing it there (`anchor_rail`,
  the line the site runs a lit train along) to a megabuilding across the
  avenue (three sections, the middle set back, decks lit from under every
  nineteen metres, a bridge to the stepped tower behind it), five landmark
  towers a kilometre off (`anchor_mega_<n>`, each its own design on a
  podium: a needle stepped three times to a spire, blocks stacked off
  centre, a slab with a raked top, an open crown of posts and a lit ring,
  a ziggurat; lit bands at their setbacks, no fins on their corners, one
  kept clear of the figure), the billboard plaza (`board_main` and seven more; the
  big one and the two beside it hang in a dark steel housing, ribbed, with a
  catwalk, floodlights and red corner lamps, bolted over a block of painted flats, so the
  screens and not the lit rooms round them carry the shot; the square's
  other blocks and the cross street's south side are painted flats too),
  roofs that are lived on (every lot's: a parapet and, by its own draw, a
  water tank on its stand, a stair hut with its door lit, air conditioners,
  a plant room, an antenna with a red lamp, now and then a sign on two posts
  whose strokes are drawn in light; on the avenue none of it over 4.5 m, so
  the hero's band of sky keeps its line; the plaza's east block left bare,
  because the Experience camera stands inside it), corpo row's south side as
  a street (shops along the boulevard under lit awnings, the signs a street
  collects hung off the fronts, flats and offices over them, some set back
  over a terrace, an alley between each pair with a lit sign across its
  mouth),
  corpo row (one glass tower per role in
  `experience.js` over a lit lobby (a double-height hall traced behind the
  glass: a ceiling of light panels the polished floor holds again, the lift
  core with the tower's colour across it, a desk, columns, now and then
  somebody crossing), each its own shape: a square plan with
  its corners cut back, stepped back once or twice, a line of light up the
  inside of each cut and a thin ring at each setback, a ribbed glass crown
  (`crown_glass`) with bands at its foot and top, on some a screen of blades
  over the roof or a mast, red lamps on its corners, and a crown slot, a
  logo slot `logo_<slug>` and a name slot each), the rooftop (tanks, AC
  units, antennas, a stair hut with its door open, condensers, pipes on
  sleepers, dishes, a rail along the edge and a string of bulbs, RIPPERDOC,
  AFTERLIFE on a block of painted flats over lit shops that faces the
  garage street, MILITECH stepped back over a yellow band with its name
  hung on the plant room on its roof), the garage (a roll-up
  door, `garage_door`, down in its opening; inside, the garage viewer's
  own walls, photographed (below); magenta tubes on the car's passenger
  side and cyan on the driver's, as in the garage room, all one `tube`
  material with each tube's colour on its vertices; the monitor over the
  bench, `garage_screen`; red tool chests, a pegboard, tyres, ducting and a
  hoist; the bay painted out round the car; BAY 01 over the door, a caged
  lamp either side and the shop's name on a blade at the corner; painted
  flats either side of it and across the street, shops under the flats
  next door, a second shutter, the office window, a cyan strip under its
  parapet, bollards, tyres, a skip and two more sodium lamps; both walls of
  the street hung with signs, air conditioners and a fire escape, cables
  across it and a string of lights at its corner), and the moon
  disc. About 49,000 triangles.
- Light high over the street (the rooftop signs, the huts' doorways) is
  `NCW_glow_<colour>`: the neon shader, but left out of the light the site
  bakes onto the ground and into the road (`src/world/city.js` bakes
  `neon_` only), which a sign forty metres up does not reach.
- Named empties the site reads: `cam_<shot>` and `cam_<shot>_target` (and
  `_b` variants for shots that move while they hold, `_portrait` ones where a
  phone has its own), the flight waypoints
  `cam_garage_edge`, `cam_garage_street`, `cam_garage_across`,
  `cam_garage_door`, `cam_garage_in`, `cam_garage_swing`, `cam_contact_via`,
  the anchors
  `anchor_curb_hero`, `anchor_curb_hero_portrait`, `anchor_garage_bay`,
  `anchor_billboard_main`, `anchor_tower_<slug>`, `anchor_lamp_<n>`,
  `anchor_shelter_garage`, `anchor_moon`, `anchor_holo`, `anchor_mega_<n>`
  (with the tower's size, so the far city keeps clear), `anchor_rail`, the
  lamps `lamp_<name>` (a point with `color`, `reach` and `power`: the
  doorway, the bulbs and the signs on the roof, the garage's wall lamps,
  the board's floodlights; the site lights the kit round them with them,
  twelve at most, see `lampsAt` in `src/world/glsl.js`), the car's stops
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

## The AV

The traffic's aerial vehicle (`src/world/av-model.js`) is an original
design built with the `codex-3d` skill (GPT-6.1 Sol, max reasoning) and
revised once after review: the first build's ducts read as car tyres and its
canopy as a bubble, at 8,850 triangles; the kept revision has thin-walled
fan shrouds tilted 10 degrees outboard, a lower fighter canopy and a shoulder
crease, at 2,424. Its brief: a low wedge coupe with no wheels, four vectored
thruster pods at the corners, seven named materials (hull, trim, glass,
lamp_head, lamp_tail, glow_thruster, glow_accent), 5.2 by 3.6 m, no text,
no logos, no brand cues. `src/world/traffic.js` merges it by those names
into one instanced draw.

## The cars

The street's cars (`src/world/traffic-cars.js`) are three original designs
built the same way: a compact hatch, a long low sedan with a fastback and a
shoulder crease, and a cab-forward van, lofted shells with their arches cut,
a glasshouse set into the waist, full-width light bars and revolved wheels,
1,694, 1,692 and 1,800 triangles, eight named materials (body, trim, glass,
tyre, rim, lamp_head, lamp_tail, glow_accent), no badge, no text, no brand.
They replaced two stacked boxes. `traffic.js` merges each kind into one
instanced draw with a night shader (wet paint giving back the lit street,
grounded toward the sills, tinted glass, lit bars on the moving ones), gives
each car its own paint and accent from a seeded draw, runs twice the tier's
count (two to a lane on a desktop, one on a phone, evenly spaced at the
lane's speed so none meet), fades them in and out with a dither where the
loop ends, and parks a few more up the avenue's left kerb and down the
garage street, one with its hazards blinking.

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
  garage's walls outside the viewer's pictures reuse the garage's
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
- The garage's walls inside (`textures/garage-wall-back.jpg`,
  `garage-wall-magenta.jpg`, `garage-wall-cyan.jpg`) are the garage viewer's
  room itself, photographed in the viewer on the dev server through
  `window.__garage.rendering`: the car hidden, a lens outside the room square
  to each wall, its field fitted to the wall's 5.8 m and its near plane
  about three metres short of the wall, so the wall's own props show and
  the walls in between drop out, rendered through the viewer's own composer
  at 1600 px across. The builder hangs them a
  centimetre proud of the kit's walls at the viewer room's scale set to this
  room's height: the back wall (AFTERLIFE AUTO, the moon monitor, the bench
  and the tool wall) round the door, the magenta wall on the car's passenger
  side and the cyan on the driver's. The viewer's fourth wall, its shut
  roll-up door, is black and is left out.
- The Contact moon (`src/world/moon.js`) is the intro's moon seen from the
  street, drawn in one shader on a card turned square to the camera over
  the southern skyline: a pale disc of square cells, as the intro's is
  built, each its own grey, with darker seas and a few craters; lit from
  the upper left, so a sliver of it is in shadow and its dark side is a
  faint Earthshine blue; and on its upper rim the two of them from behind,
  sitting, his hair in spikes and hers a bob, dark against it with its
  light on their edges. Only the Contact camera looks that way, so every
  other frame culls it. The painted David-and-Lucy still
  (`design/night-city-garage/textures/moon.jpg`) is the garage monitor's.
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
  waypoints, looking first where they are going (a little further along
  their own path), so the camera goes over the rooftop's edge before it
  looks down into the street and out of the door before it looks up at the
  moon. The garage flight then keeps the car in frame: it comes in at the
  door behind it and orbits it at six metres, rear three-quarter to side to
  front, onto the viewer's own front preset, and Contact leaves the same
  way round. Crossing the middle of a flight fires the braindance glitch
  (slices, scanlines, an RGB split that hits harder on the bass).
- The Work deck's entry is the plaza board's art, swapped through the same
  glitch. Corpo row is seen from the boulevard's kerb looking up the row on a
  diagonal, dollying east down the roles: each tower's crown carries its
  organisation's logo (`src/world/logos.js`), the Experience section's own
  marks from `src/assets/PreviousExperience` in their dark-ground forms
  (AWS's wordmark and smile without the cloud, Pawtograder's husky without
  its disc), keyed and packed into one atlas at build time, lit as signs in
  their own colours. The card being read lights its tower in full: a
  scanline sweeps down the logo as it comes on and light runs up the fins
  in the organisation's colour. The glass is drawn from world position
  (`corporate` in `materials.js`): whole office floors lit or dark behind
  mullions, rows of fixtures, desks and screens against them, the city's
  glow in the glass. The
  garage flight ends on `GarageModel`'s own front preset in the car's bay,
  and once it has landed the viewer covers the city (dim 0.85, the loop
  stopped). `/work/<project>` holds the plaza with that project on the
  board, `/work/<role>` its tower, and route changes fly.
- The S4 is the garage's GLB with the intro's rig, lamps, smoke and trails
  (`src/three/drift/`). Its distance along the road is a damped function of
  the scroll; it steers by the road's curvature, brakes into each stop,
  backs up when the reader scrolls up, and parks at the hero's curb (the
  right-hand curb: every left-hand spot sat behind the name, the tagline or
  the photograph) and in the garage bay. It draws in about a dozen calls:
  every plain part a rig node carries (a wheel, a knuckle, the body) is one
  mesh on one physical material that reads each part's colour, roughness,
  metalness and clearcoat from its vertices, so it shades exactly as the
  parts' own materials did; the lamps, carbon and plates keep theirs, and
  what the shut hood hides is left out. Its paint and glass reflect a night
  street (thin strips of the street's neon on black, two tubes overhead),
  and in the bay it is lit the way the viewer lights its room: area lights
  for the white tubes overhead and the magenta and cyan along the walls,
  faded in as it comes through the door.
- The intro plays in this city when it is ready by `CITY_IN`: the moon
  dissolves to the live city, the drift runs on the song clock and parks at
  the curb instead of vanishing, the handoff glitches through the city's
  pass, and the page arrives over the same camera. Otherwise the plate path
  runs as it always has.
- When the city is ready as the intro starts, the moon is the city's too
  (`src/world/voxel-moon.js`): a second scene through the same post chain,
  all instanced cubes (about 69,000 on high, 27,000 on a phone, about thirty
  draws, each cube drawn as the three faces its viewer can see, and the
  island's shadow pass as the two sides each column turns from the sun) and
  a function of the song second. The figures print in and an
  island of voxel columns builds out from under them while a voxel Earth
  assembles (the portrait plate's disc, drawn again in a dozen flat colours,
  land and cloud standing proud, a real terminator, its lights as points on
  the night side); a meteor at 12.0; the cards over the painting's framing;
  a second meteor striking the big crater on the track's onset at 23.1,
  both figures turning to it; a crane out to the side showing the island
  floating with its rim crumbling; the island turning to signal and
  streaming into Earth as the camera dives after it; and in the bar before
  the drums Earth's tiles flipping over a ring per beat (28.89, 29.37,
  29.85) from where the street vanishes in the drift's frame, the street
  behind them on the drop. A low raking sun with a shadow map (drawn only
  while the island moves), Earthshine, voxel occlusion and bevels on real
  edges light it. The world draws one hidden street frame as the crane
  starts, so the reveal's first frame has nothing left to warm. A replay
  keeps the city it has; `beginIntro` resets the car, the route and the
  camera.
- The garage (`src/world/garage.js`): the roll-up door is a function of the
  scroll, up just before the car reaches it and down again behind it going
  back, rattling while it moves; the car drives into a dark room, and as
  the camera turns to face the door the tubes strike on a fixture at a time
  and the room fills with their light (`garageRoom` in `glsl.js`), which
  spills out across the wet street (`doorPool`); the viewer's walls come on
  with them. Drips fall off the drum; the monitor plays the intro's moon.
- The avenue, as the hero sees it. Kiroshi and Nicola are screens
  (`src/world/ads.js`): the generated advertising image pushes in slowly
  toward its subject under the brand's words, set as type, with scanlines,
  a slow refresh band and, every few seconds, a quarter second of tearing.
  Two holographic koi (`src/world/koi.js`) chase each other across the
  avenue, their bodies swimming, doubled in the wet road. On a wide screen
  they swim in the strip of sky between the nav and the name: the hero's
  own lens sets their height (`fit`) so the loop's middle sits an eighth of
  the way down the frame whatever the screen's size; a phone has them under
  the name. People walk both pavements (`src/world/crowd.js`, forty on a
  desktop, sixteen on a phone): silhouettes on upright cards, alone and in
  pairs, some under umbrellas whose lit rims double in the road, legs and
  arms tied to the distance walked, one draw. Steam breathes out of two
  manholes and two rooftop stacks (`src/world/steam.js`, anchored in the
  kit), lit by whatever light is where it is and brighter with a sign
  behind it. The walls are painted elevations lit by the signs' spill.
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
- Past the kit (`src/world/skyline.js`): a few thousand buildings on a
  jittered grid, their windows the kit's shader. Each is shaped in the
  vertex shader from one shared mesh and its own numbers: up to four
  stacked tiers (podium, shaft, setbacks, crown or spire), a square plan or,
  for some towers, one with its corners cut back, a parapet round the top
  roof and a terrace on every setback; an upper tier often stands off
  centre. Blocks under 60 m wear the avenue's painted elevations, and a wide
  one is split into two buildings of different heights; some faces carry a
  vertical neon sign or a strip of neon along a floor line. Towers are one
  of five kinds (stepped back twice, a slab with its plant on top, a
  ziggurat, a dark glass crown with lit edges, a podium and a spire), some
  lit at their setbacks in warm light, a few carrying a screen the height of
  a dozen floors that changes its advert every nine seconds. Roofs within a
  kilometre carry a kit (tanks and a stair hut with its door lit, plant and
  cooling towers, a telecom mast with dishes and lamps, a neon sign on two
  posts whose strokes read as lettering without being any). Every
  placement, footprint and height cap is the one the boxes had, so the
  hero's band of sky and Contact's moon keep their clearances; spires and
  masts stand only where nothing was capped, and signs only outside the
  hero's view. Seven draws for the buildings and their roofs, each culled
  on the CPU to what the frustum sees (the visible instances packed into
  the buffers when the set changes), which keeps the vertex work under what
  the boxes cost; one tall roof in seven wears a lit band and every roof
  over 92 m (or its spire's tip) a red aviation lamp, blinking in three
  groups (one draw, steady under reduced motion); a few towers stand under
  Contact's moon so it rises out of a skyline. The sky dome is
  the rest, at no extra draw: near-black overhead and the lit city's glow at
  the horizon; a broken deck of cloud at 520 m lit from under in that glow's
  colour, darker between the clouds, drifting; three slow searchlights from
  downtown and the south-east (under the `haze` switch); and below the
  horizon the far city's own ground, a street grid on the towers' 46 m
  blocks with a lamp every eleven and a half metres down each kerb, their
  pools running into lines, lit shopfronts and the odd car's lights moving
  along, spread into their streets past a pixel so nothing sparkles.
- Floors that hold their light (`src/world/wet.js`): the rooftop's wet roof
  under About and Stack, and the garage's sealed floor, trace the eye's ray
  off the floor against each lit rectangle over them (the two rooftop signs,
  read from the sign atlas; the garage's tubes) instead of drawing the city
  a second time: AFTERLIFE reads backwards in a puddle, the rain rings it,
  and the garage's tubes strike on in the floor with the tubes.
- Windows are rooms (`WINDOWS` in `glsl.js`): a run of bays on a floor
  shares its light, floors differ, the light is mostly warm or cool white
  with the odd television or neon room, and each pane has its frame,
  mullions and, in homes, a transom, with blinds, curtains or a figure at
  the glass.
- The grade (`src/world/post.js`): the Khronos neutral tone map, which keeps
  a tube's hue as it brightens, then a grade in the same pass (blacks lifted
  a hair toward violet, mids pushed more saturated than highlights, cool
  shadows, warm tops, a gentle S). Scanlines only in the glitch.
- Switches: `fx world off` gives back the plate and black sections;
  `signs`, `haze` (the far haze and the lamps' light shafts), `wet` (rain,
  the planar reflection and the road's sheen), `traffic` and `reactive`
  reach the city directly.
- Tiers (`quality.js`): high (DPR 1.5, 2.2 MP cap, a 1024 by 512 planar
  reflection, 9,000 rain streaks, 10 AVs and 4 road cars (8 driven, see The
  cars), SMAA, a 4096 sign
  atlas) and phone (DPR 1.25, 0.9 MP, a 512 by 256 reflection, 3,000 rain,
  4 AVs and 2 road cars (4 driven), half-scale bloom, a 2048 sign atlas at
  half the pixels a metre).
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
- Draw calls a frame (every pass): the hero 144 on high and 123 on a phone;
  the most anywhere 154, at the end of the garage flight, where the road's
  mirror still draws through the door; the held reading shots 68 to 85 on
  high and 61 to 71 on a phone. Triangles: the hero 210,000 and 171,000; the
  voxel moon's frames with its shadow pass 598,000 and 233,000.
- Frame time on devbox1 (M1 Max, Chrome, Metal): headed, p95 13.4 ms at the
  hero on high at 1440x900 (13.8 ms scrolling) and 13.6 ms on the phone tier
  at 390x844, against the display's own 11.8 ms cadence at p50; headless at
  60 Hz, every frame on time (p95 16.7 to 16.8 ms); with vsync off, the work
  itself is p95 4.5 ms at the hero on high (pixel ratio 1.3) and 3.3 ms on the
  phone tier. Nothing was shed. Across the meteor strike no frame is over
  25 ms, capped or not, on either tier.
- A footer or Konami replay keeps the city; putting the door back up rebuilds
  it, with `renderer.info.memory` back to its first count (99 geometries and
  71 textures, and 71 programs, after three of each).
- Review files (`*-viewport.png`, `*-review.png`, `*-cycles*.png`,
  `world-source.glb`, `mcp.log`) stay local and are git-ignored.
