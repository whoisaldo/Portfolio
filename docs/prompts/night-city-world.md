# Night City, live: one 3D world behind the whole portfolio

> For Aldo: this is written to run under `/goal` in Claude Code from the repo
> root on your Mac. Before starting: open Blender, press `N`, open the
> **MCP for Blender** tab and click **Start MCP Server**, and check that
> `claude mcp list` shows `blender` connected. Then start the goal with the
> one-line condition from our chat, which points here. Everything below the
> line is the prompt. Every decision in "Decisions already made" came from our
> Q&A; edit that section if you change your mind.

---

## 0. Role and mission

You are the lead creative technologist on aliyounes.dev, Ali "Aldo" Younes's
portfolio (React 19, Vite 7, Tailwind 3, Framer Motion, vanilla three.js
0.186). The site is a Cyberpunk 2077 / Edgerunners piece with an intro
cinematic choreographed to a song, a live 3D Audi S4, and a Night City
garage.

Today the hero sits on a **still image** (`public/scenes/night-city/neon-wide.webp`
and `neon-portrait.webp`), and every section below it is flat carbon black.
Your job is to replace that with **one live, scroll-driven 3D Night City that
sits behind the entire page**. The camera flies to a new "shot" for each
section and holds while the reader reads. Ali's S4 drives through the city as
you scroll and ends parked in the garage. The intro's drift happens *inside*
this same live city, so the intro, the hero and the rest of the page are one
continuous world.

The bar is a portfolio people screen-record and send to each other. It must
still read as *this* site: same chrome, same copy, same restraint in the UI,
same references. The world changes, the voice does not.

**This runs autonomously under `/goal`. Nobody is watching to answer
questions**, so do not stop to ask. Where this document leaves a choice open,
take the conservative option that keeps the site working and the house rules
intact, record it, and keep going. The run is finished only when every item
in section 14, "Definition of done", holds and you have printed the DONE
REPORT it specifies.

Work in this order:

1. Read the files in section 2.
2. Run the Blender MCP preflight (section 8.1). If it fails, stop there and
   report the fix. Nothing else in this document can be met without it.
3. Write a concrete plan (files, modules, Blender scene contents, the shot list
   with camera numbers, budgets, the commit sequence) to
   `docs/prompts/night-city-world.progress.local.md`. That filename is
   git-ignored by the existing `*.local.md` rule. Keep it as a live checklist:
   tick items as they land, and note every judgement call you make. Re-read it
   after any context compaction before continuing.
4. Build it end to end, committing as you go (section 13).
5. Verify (section 12), open the PR, and print the DONE REPORT (section 14).

---

## 1. Decisions already made (do not re-litigate)

| Topic | Decision |
| --- | --- |
| Scope | **Whole page, one city.** A fixed full-screen canvas behind every section on `/` and `/work/:slug`. Never on `/recruiters`. |
| City build | **Blender + procedural.** A hand-built hero avenue and key set pieces made in Blender via Ali's Blender MCP pipeline, exported as a Meshopt GLB, plus instanced procedural towers, emissive window shaders, and live billboard planes for the far city. |
| Intro | **Drift in the live city.** The intro's drift runs inside the new world (same renderer, same scene). No plate, no cut at the handoff. The plate survives only as a fallback and loading poster. |
| The S4 | **It drives you through.** Scroll is the throttle: the car rolls ahead of the camera between shots and ends parked in the garage bay. |
| Set pieces | **All four:** (1) billboards show Ali's work, (2) corpo towers for each job, (3) the moon at Contact, (4) street life: rain, steam, flying AVs, 3D road traffic, signs that pulse with the track. |
| Readability | **Dim behind reading.** The world drops to about 30% behind reading sections and returns to full brightness in the hero, during transitions and at Contact. Section backgrounds go transparent; the chamfered `Panel`s stay solid ink. |
| Stack | **Vanilla three.js + Lenis.** Match the repo's imperative `createXScene(canvas)` modules and lazy chunks. No React Three Fiber, no drei. Lenis smooths the scroll, and a custom scroll stage computes the shots. |
| Devices | **Tiered.** Full world on desktop; a lighter phone tier; CPU-only browsers (the `gpu.js` probe), `prefers-reduced-motion` and `fx world off` fall back to today's static plate and black sections. |
| Transitions | **Flight + braindance glitch.** A damped camera flight between shots with a brief registration-error glitch at the midpoint (the slice + scanline language the intro handoff already uses), plus a chromatic split that hits harder on `--bass`. |
| Garage | **Hand off to the viewer.** The world flies to the garage's open roll-up door on a pose matched to `GarageModel`'s `front` preset, then dims and **pauses** while the existing interactive garage canvas is on screen. `garage-scene.js` behavior stays untouched. |
| Shipping | **One branch, one PR.** Branch `feat/night-city-world` from `main`, phased commits (section 13), one PR at the end. Do not merge it. |
| Blender | **The Blender MCP is required** (`ahujasid/mcp-for-blender`, registered in Claude Code as `blender`) for building, inspecting and visually checking the world. All Blender MCP calls happen in the main session, never delegated to a subagent. |
| Run mode | **Autonomous under `/goal`.** No questions mid-run; judgement calls go in the progress log and the PR's "Decisions I made" section. |

---

## 2. Read first, in this order

1. `README.md`, then `docs/PROJECT_CONTEXT.md` **if it exists locally**. It is
   the claims audit the README tells you to read before touching copy. It is
   not on GitHub, most likely because `.gitignore`'s `*Context.md` matches it
   case-insensitively on macOS (`core.ignorecase`), so check the local working
   tree. If it is not there either, carry on without it.
2. `src/App.jsx` (the two shells; the world mounts in `Cinematic` only),
   `src/routes/Home.jsx` (section order and hash restoration), `src/data/site.js`.
3. `src/components/Hero.jsx`, `src/components/NightCity.jsx` (the plate being
   replaced), and `src/components/IntroCinematic.jsx` (especially the frame loop
   from about line 390 and the handoff layers from about line 700).
4. `src/lib/cues.js` (every intro time is a measurement of the song; never
   move one), `src/lib/intro.js`, `src/lib/drift.js`, `src/lib/drift-scene.js`
   (the spline, camera formula, smoke, trails, beams, contact shadow and
   reflection), `src/three/car/*`.
5. `src/lib/garage-scene.js` (PRESETS, composer, pixel caps, disposal),
   `src/three/garage-room.js`, `src/three/garage-floor.js`,
   `src/components/GarageModel.jsx`, `src/sections/Garage.jsx`.
6. `src/lib/env.js` (FX switches, `LOW_POWER`, the session layer), `src/lib/gpu.js`,
   `src/components/GpuNotice.jsx`, `src/lib/reactive.js`, `src/lib/ambient.js`
   (`getLevels()`), `src/lib/scroll.js`, `src/components/Chrome.jsx`.
7. `src/components/projects/WorkDeck.jsx` (the deck's `index` state, about line 378),
   `src/components/ExperienceIndex.jsx`, `src/sections/About.jsx`,
   `src/sections/Stack.jsx`, `src/sections/Contact.jsx`, `src/sections/Footer.jsx`.
8. `tailwind.config.js` (the palette notes at the top are law) and `src/index.css`.
9. `design/night-city/REFERENCES.md`, `design/night-city-garage/README.md`,
   `design/audi-s4/README.md`, `scripts/blender/*.py`, `scripts/optimize-*.mjs`.
10. `src/components/Skyline.jsx` and `src/components/RoadTraffic.jsx`. Both are
    **orphaned** (nothing imports them since the neon plate replaced them), but
    their sign list and traffic idea are exactly what the 3D city revives.
    Port what is useful, then delete them and their `sky-*` CSS in this PR.

Open the plate itself (`public/scenes/night-city/neon-wide.webp`) and look at
it. It is the art target for the hero shot.

---

## 3. What exists today (so you do not rediscover it)

**The hero plate.** An AI-assisted paintover of a neon avenue at night: wet
cracked asphalt with long magenta, cyan and amber reflections, a centre
dashed line to a vanishing point, a KIROSHI "Better you, a brighter tomorrow"
billboard (blue, left), a NICOLA "Taste tomorrow" can billboard (red, right),
an ARASAKA crest on a distant tower, a giant purple holographic woman in the
centre distance, an overpass with a teal "空き未来へ" sign, ramen, sushi and
maneki-neko neon, lanterns, flying AV silhouettes. `Hero.jsx` lays
`from-ink/90 via-ink/65 to-ink/35` (left to right) and a bottom-to-ink
gradient over it. The name, ledger and CTAs sit on the left; the portrait sits
on the right.

**The intro.** The door (`EntryGate`) waits for a click and prefetches the
track and car. The cinematic runs on the song clock: the moon (David and Lucy,
backs to us, Earth rising), three title cards ("wake up, choom." / "signal's
clean." / "preem. you're in."), the city fading in at `CITY_IN` 27.0 to
`CITY_READY` 30.45, the drift on `DROP` 30.1, apex at `WIPE_START` 31.5, the
page arriving from `HANDOFF` 33.8 / `HERO_IN` 33.9, the car gone by `CAR_GONE`
35.1, input released at `REVEAL` 35.65. `?intro=off|short|full` overrides.
Three registration-error slices of the plate (`data-handoff-signal`) plus a
scanline layer glitch the handoff. The hero uses the exact same framing, so
there is no cut.

**The drift camera** (`drift-scene.js`, about line 620): fov 30, metres, +x
right, +z toward the lens, the car powers away toward -z. Per aspect:
`frac = aspect < 1 ? 1.05 : aspect < 1.3 ? 0.82 : 0.66`,
`dist = 4.6 / (2 * frac * tan(fov/2) * aspect)`,
`camera.position = (0.6, 0.8 + 0.12 * dist, APEX_Z + dist)`,
`lookAt(-0.4, 0.7, 1.8)`, with `APEX_Z = 5.6`. The path is a C2 cubic spline
in time through `KEYS` (t, x, z, slip). A drift evaluator was verified
identical at 1,083 samples across three viewport scales; keep that property.

**The garage.** Its own WebGL context with an addon `EffectComposer` (SSAO,
UnrealBloom, SMAA, Output), a pixel-count cap, a 512-square rough planar
floor reflection, and pausing off screen and when the tab is hidden.
`PRESETS.front = { position: [3.6, 1.75, 5.8], target: [0, 1.4, -1] }` in car
space (car faces +Z, driver side +X, rests on y = 0). Room GLB about 2.9 MB,
car GLB about 2.0 MB (shared; `object.js` hands out disposable instances).

**Environment switches** (`env.js`): `signs`, `haze`, `wet`, `reactive`,
`cursor`, `scanlines`, `traffic`, mirrored to `<html data-fx-*>`, exposed by
the console as `fx <name> on|off`, `fx reset`. `LOW_POWER` holds the GPU-hungry
ones off for one page load when `gpu.js` finds no acceleration. Because the
Skyline and traffic are orphaned, `signs`, `haze` and `traffic` currently do
almost nothing. The world gives them meaning again.

**Music reactivity.** `reactive.js` writes `--bass` and `--level` onto
`[data-reactive]` elements only while the track plays. The world must NOT go
through CSS for this. Call `getLevels()` from `ambient.js` in the world's own
frame loop and apply the same asymmetric smoothing (attack 0.7, decay 0.12 for
bass; 0.4 and 0.1 for level). Silence means stillness.

**Scrolling.** `scroll.js` jumps instantly for distances over 3 viewports
(smooth jumps across a tall page strobe every section). `Home.jsx` re-applies
hash scrolls at rAF, 0, 120 and 400 ms and on `load`. `Chrome.jsx` tracks the
active section and progress from `window.scrollY`. The intro swallows wheel
and touchmove while it runs. `history.scrollRestoration = "manual"`.

**Sections.** Order: `hero`, `projects` (01 // Work), `experience`
(02 // Experience), `about` (03 // About), `stack` (04 // Stack), `garage`
(05 // Garage), `contact` (06), then the footer. Every section root paints
`bg-ink`: ProjectsSection.jsx:18, ExperienceIndex.jsx:47, About.jsx:55,
Stack.jsx:89, Garage.jsx:175, Contact.jsx:50, Footer.jsx:34.

**The reference.** Aldo's inspiration is naman0r/namanrusia.dev PR #10 ("one
voxel scene that morphs through every page"). Borrow its *engine shape*, not
its look:
- `SceneMount`: a fixed `inset-0 z-0 pointer-events-none aria-hidden` wrapper,
  a WebGL check, and the scene mounted after first paint via
  `requestIdleCallback` (1200 ms timeout).
- `ScrollStage`: sections opt in with `data-shot`, are measured into
  `{id, shot, top, height}` with a `ResizeObserver` on `body`, and produce a
  continuous `position` (1.4 means 40% of the way from shot 1 to shot 2).
  **Hold** shot i while its section fills the screen; **morph** while the next
  section rises from the bottom of the viewport to 20% from the top:
  `holdEnd = max(top_i - 0.2vh, top_i + height_i - vh)`,
  `nextStart = top_{i+1} - 0.2vh`, and the bottom of the page finishes the last
  morph. Also per-section `locals[i]` (0..1 progress by the viewport middle),
  pointer tilt, and `visibilitychange` pausing.
- The scene damps toward the goal: `pos += (goal - pos) * (1 - exp(-dt * 5))`.
- It dims to 30% on phones except on title screens.
Do NOT borrow the voxels, the dither pass, the cobalt palette or Next.js.

---

## 4. Art direction: the world bible

**The world is atmosphere; the chrome stays disciplined.** The site's rules
(one pulsing dot, `Glitch` fires once and never loops, volt at most about 5% of
a screen, no fake readouts) govern the DOM UI and do not loosen. The city is
the layer those rules put behind glass, the way the plate was. Its motion is
slow and ambient (rain, drifting AVs, flicker), and it steps back to about 30%
whenever someone is reading.

**Palette.**
- UI tokens are unchanged: `ink` #0a0a0c ground, `bone` #eceae4 text, `volt`
  #fcee0a primary, `fuchsia` #ff2e88 secondary, `blood` #ff003c, `ok` #00e5a0.
  Cyan stays out of the UI (it is only half of `.chromatic-aberration`).
- The world uses the world's own neon, as the plate does: magenta, hot pink,
  cyan, electric blue, sodium amber, Arasaka red. Keep the sky and unlit
  geometry near-black and neutral (CP2077's black is the absence of light,
  not a dark blue). Light comes from signage, windows and headlights, never
  from a blue ambient fill.
- Grade: ACES filmic, exposure about 1.0; bloom threshold high enough that
  only emissives bloom. Wet ground carries most of the colour, as in the plate.

**Canon to keep (all of it already on the site):** Night City; Arasaka,
Militech, Kiroshi, Nicola, the Afterlife, a ripperdoc clinic's white-and-red
cross (the site's rooftop sign colours are in `Skyline.jsx`: Arasaka `#ff003c`,
Militech `#fcee0a`, Afterlife `#ff2e88`, Ripperdoc `#eceae4` with a cross);
"choom", "preem", "Eddies"; the Operator dossier; Ali's handle "Ripperdoc";
the moon and David and Lucy; David's yellow jacket; the braindance monitor;
the Adam Smasher poster, Maine's arm cannon and Rebecca's Guts in the garage;
the Edgerunners magenta; the song ("I Really Want to Stay at Your House").

**Legal and honesty rules for art.** Signage is **type**, not ripped logos:
render brand names in Chakra Petch onto canvas textures at runtime (after
`document.fonts.ready`), as `Skyline.jsx` did with HTML text. No downloaded game
screenshots are served (see `REFERENCES.md`). Generated imagery must be
original. Surface textures come from ambientCG (CC0), as before.

**Signage.** Port `Skyline.jsx`'s four signs into data, and add the plate's
Kiroshi, Nicola and ARASAKA crest set, and the ramen/sushi/maneki-neko neon
(Japanese type allowed; use a CJK-capable system font for those textures and
fall back gracefully). Flicker is per-sign, sparse, seeded, and off under the
`signs` switch.

---

## 5. The shot list

Every section root gets `data-shot="<id>"`. The shot registry lives in
`src/data/world.js` (copy lives in `src/data`, never in a component). All
camera numbers are metres in the world frame, which **extends the drift's
frame**: +x right, +y up, +z toward the hero lens, the avenue running toward
-z. Build the Blender scene in that frame so the drift math, the contact
shadow and the reflection all carry over.

Each shot defines: camera position and target (or a small path for its
`local` progress), fov, portrait variants, world dim level, the car's state,
and what reacts.

1. **`hero` (title screen, dim 0).** Exactly the drift's end camera
   (formula above, per aspect), looking up the live avenue that replaces the
   plate: same composition, Kiroshi left, Nicola right, the holo figure and
   ARASAKA tower in the distance, overpass, wet road. The S4 is **parked at
   the left curb up the avenue**, small, outside the band behind the name and
   the ledger (measure at 1440x900 and 390x844, as `Skyline.jsx`'s comments
   did). Rain, AVs, flicker, and neon breathing with the track. Pointer tilt of
   a degree or two, never on touch.

2. **`projects` (dim 0.3 while reading).** The camera cranes up to the
   **billboard plaza**. The giant holo board shows the **active Work deck
   entry's key art** (`src/assets/KeyArt/KeyArt_<X>-1024.webp`, via
   `src/data/images.js`). Changing the deck's `index` swaps the texture through
   a holo glitch (scanline sweep, RGB split, a few frames of noise). Smaller
   boards cycle the other seven slowly. The live/building status colour
   (`LIVE` volt, `BUILDING` fuchsia, in `projects.js`) tints the board's frame.
   Emit the deck's selection into the world store; do not make the world a
   child of the deck. While the deck is expanded to the viewport, pause
   rendering (it covers the screen).

3. **`experience` (dim 0.3).** A slow lateral dolly down **corpo row**:
   one tower per role in `experience.js` order, each crowned in that role's
   real `accent` (Philips `#4FC3F7`, Pinnatec `#98F8C8`, Pawtograder `#ECEAE4`,
   AWS `#FF9900`, Top Choice `#B5B606`, DeFalco `#F52333`, Northeastern
   `#C8102E`) with the org name as a vertical sign. A tower's crown lights up
   when its card is the active card (IntersectionObserver, or `locals`),
   and the camera's dolly position follows the section's `local` progress.
   Derive the towers from `experience.js`; do not duplicate the data.
   No logos, no invented floor counts, no fake tickers.

4. **`about` and 5. **`stack` (share one shot, dim 0.3).** A mid-height
   rooftop: water tanks, AC units, antennas, the **Afterlife** and
   **RIPPERDOC** signs nearby (the dossier says "Occupation: Ripperdoc").
   Stack continues the same shot with a slow pan across the skyline driven
   by `local`. Nothing that pretends to be data.

6. **`garage` (flight, then handoff).** The camera drops back to street
   level and follows the S4 to a garage with its **roll-up door open**,
   magenta fixtures left and cyan right, echoing the garage room. The car
   pulls in; the flight ends on a pose that matches `PRESETS.front` in car
   space, so the swap to the interactive viewer reads as continuous. When
   `GarageModel`'s canvas intersects the viewport, dim the world to about 15%
   and **stop its render loop**, so only one heavy context runs. Resume when
   the viewer leaves. Start `preloadGarage()` when `position` passes `stack`.

7. **`contact` (title screen, dim 0) and the footer.** The camera rises to the
   roof above the garage and tilts up to a **huge moon** over the skyline
   (texture: `design/night-city-garage/textures/moon.jpg`, served through the
   optimise pipeline): a bookend to the intro's moon. The email headline reads
   over the sky. The footer holds this shot. "Back to the entrance" still
   replays the intro.

**`/work/:slug`.** The world persists across routes because it mounts in the
`Cinematic` shell, not in `Home`. A project page holds a dimmed (0.2) shot in
front of the billboard showing *that* project's key art; a role page holds
on *that* role's tower. Route changes fly rather than cut. Returning to
`/#projects` flies back.

**The car between shots.** One road spline through the districts
(avenue, plaza, corpo row, rooftops at street level below, garage). The car's
distance along it is a damped function of the stage position, so scroll is the
throttle: wheels spin with speed, the front wheels steer with the curve's
curvature (reuse the rig: `steer_fl`/`steer_fr` about Y, wheel groups spin
about X), brake lights brighten when decelerating, and headlight pools on the
wet road reuse the drift's beams. Scrolling back up reverses it. It never
drifts outside the intro.

---

## 6. The intro, unified

The intro drift must happen in the live world.

- Refactor `drift-scene.js` into reusable pieces (car rig, smoke, trails, beams,
  contact, reflection) that both the intro timeline and the world import.
  The world owns the renderer; the intro drives a "cinematic" mode of it.
- **Keep `KEYS` and the spline byte-identical for t <= 3.8 s** and keep the
  evaluator check passing. After that, instead of vanishing into haze at
  `CAR_GONE`, the car decelerates and parks at the hero's curb mark. Do that
  with a separate parking curve blended C1 at t = 3.8 s. Do not append keys
  to the existing natural spline, because its tridiagonal solve would shift
  every earlier segment.
- The overlay's moon layer dissolves to reveal the live canvas beneath at
  `CITY_IN`..`CITY_READY`. The three registration-error slices and the scanline
  layer become the same **braindance glitch pass** used for section
  transitions (section 7), fired on the existing cue times, with no DOM copies
  of the plate.
- **Do not move any cue** in `cues.js`. `HANDOFF`, `HERO_IN` and `REVEAL` keep
  their meaning. `data-handoff-content` keeps working.
- The door already prefetches the car during its wait. Have it also prefetch
  the world chunk and the world GLB. If the world is not ready by `CITY_IN`,
  run today's plate path for this visit and crossfade to the live world once
  it is ready (the hero camera is plate-matched, so the swap is quiet).
- `?intro=off|short|full`, replay from the footer, and the Konami greeting all
  keep working. Lenis is stopped while the intro holds input and started at
  `REVEAL`.

---

## 7. Architecture

Create a `src/world/` module family (names are suggestions; keep the repo's
file-header comment style: why, not what).

- `src/world/stage.js`: the store, the same shape as the reference's `stage`
  and this repo's `intro.js`: module state plus `useSyncExternalStore`, no
  provider. Fields: `shots`, `position`, `locals`, `section`, `pointer`,
  `activeProject`, `activeRole`, `dim`, `paused`, `route`.
- `src/world/scroll-stage.js`: owns Lenis (`lerp` about 0.1; skip under reduced
  motion), measures `[data-shot]`, computes `position` and `locals` with the
  hold/morph maths above, and writes the dim into a CSS variable on a single
  fixed scrim element (no React state per frame). Re-measure on
  `ResizeObserver`, font load, route change and deck expand/collapse.
- Route `scroll.js` through Lenis: `lenis.scrollTo(y, { immediate: far })`, so
  jumps over 3 viewports stay instant. `Home.jsx`'s timed hash re-application
  keeps working. Add `data-lenis-prevent` to the console/terminal, the deck's
  scrolling rail and demo panes, and the garage canvas (OrbitControls uses the
  wheel).
- `src/world/WorldMount.jsx`: mounted in `App.jsx`'s `Cinematic` shell above
  the routes, `fixed inset-0 z-0 pointer-events-none aria-hidden`. It renders
  the plate (`NightCity`) immediately as the poster, lazy-imports the world
  chunk after first paint (or during the door wait), and crossfades to the
  canvas on its first rendered frame. It does not mount on `/recruiters`.
- `src/world/world-scene.js`: `createWorldScene(canvas, opts)` returning
  `{ setStage, setQuality, pause, resume, dispose }`, in the same style as
  `createDriftScene` and `createGarageScene`. It owns the renderer, the camera
  rig (damped toward the blended shot pose, `exp(-dt*k)` smoothing,
  `dt` clamped to 1/20), the GLB world, procedural towers, signage, billboards,
  rain, AVs, traffic, the car, and post.
- `src/world/shots.js`: evaluates shot poses from `src/data/world.js` plus the
  anchors (named empties) read from the GLB, so moving a camera in Blender
  moves it on the site.
- **Post:** use pmndrs `postprocessing` (one merged `EffectPass`: bloom with a
  luminance threshold, chromatic aberration fed by the glitch envelope and bass,
  subtle noise and vignette; SMAA on the high tier only), plus one custom
  **braindance glitch** effect (horizontal slice offsets, scanlines, a brief RGB
  split) driven by a 0..1 envelope that peaks at each flight's midpoint and on
  the intro cues. Leave the garage's addon composer alone.
- **Section backgrounds:** add a `world-clear` class to each section root that
  paints `bg-ink`, with `html[data-world="on"] .world-clear { background: transparent; }`.
  Panels keep their fills. Add the scrim: a fixed black layer between the canvas
  and the content whose opacity is `var(--world-dim)`. Hero and Contact read 0,
  reading sections read about 0.7 (so the world shows at about 30%), and the
  garage viewer reads about 0.85. Keep `Hero.jsx`'s existing gradients and tune
  them against the live frame.
- **Env switches:** add `world: "the city behind the page"` to `FX` (on by
  default; off in `LOW_POWER`). `fx world off` gives exactly today's site: plate
  hero, black sections. The existing switches get real meaning again: `signs`
  (3D signage and flicker), `haze` (height fog and volumetric light shafts),
  `wet` (rain, puddle normals, planar reflection), `traffic` (AVs and road cars),
  `reactive` (music drive). The console's `fx` listing picks them up
  automatically from `FX`.
- **Lifecycle:** pause on `document.hidden`, while the garage viewer is on
  screen, while the deck is expanded, and while the console covers the page.
  Dispose everything on unmount and on intro replay, verified (no growth in
  `renderer.info.memory` across three replays).

---

## 8. Blender work (the Blender MCP is required)

The server is `ahujasid/mcp-for-blender` (formerly `blender-mcp`; the old
`blender-mcp` command still works and is what `design/audi-s4/README.md`
calls). It talks to an addon inside the running Blender over a local socket
on port 9876. In this session its tools are `mcp__blender__<tool>`.

### 8.1 Preflight (before any other build work)

1. Call `get_addon_status`, then `get_scene_info`. Both must answer. If
   either fails, stop the run and print exactly this fix for Ali: install the
   addon with `uvx mcp-for-blender install-addon`; in Blender press `N`, open the
   **MCP for Blender** tab and click **Start MCP Server**; register the server
   with `claude mcp add blender -- uvx mcp-for-blender` if `claude mcp list` does
   not show it; then restart the goal.
2. Confirm the scenes you must not touch are present and leave them alone:
   `Ali_S4_Final` (the car) and `Night_City_Garage` (the room). The world
   builder creates only its own scene.
3. Do every Blender MCP call yourself in the main session. Do not hand Blender
   work to a subagent, so it runs on the model this session was launched with.

### 8.2 How to use the tools

- `execute_blender_code` runs the builder. **Every change to the world must
  land in `scripts/blender/build_night_city_world.py` first** and be applied by
  running that file's contents, so the scene can always be rebuilt from Git.
  Ad-hoc code is for inspection and experiments only, never for the final
  state. Inject `PROJECT_ROOT` the way `run_mcp.py` does, not the hard-coded
  `/Users/aldo/Desktop/Portfolio` the older builders use.
- `get_viewport_screenshot` is your eyes. After each build step, frame
  `Cam_Hero_Wide` and `Cam_Hero_Portrait` and compare them with
  `public/scenes/night-city/neon-wide.webp` and `neon-portrait.webp` (layout,
  vanishing point, sign placement, where the light sits on the wet road).
  Iterate until the composition matches. Also screenshot each `cam_<shot>` pose.
- `get_scene_info` and `get_object_info` check that anchors, names, transforms
  and triangle counts match what the JS and `check:world` expect.
- `bpy_api_lookup` and `describe_node_type` answer bpy and shader-node API
  questions for Blender's installed version before you guess.
- Poly Haven tools (`search_polyhaven_assets`, `download_polyhaven_asset`,
  `set_texture`) are allowed for surfaces and HDRIs: Poly Haven is CC0, like
  ambientCG. Record each asset and its link in the design README's references.
- Do not use Sketchfab or Poly Pizza models unless the licence is CC0 and
  recorded. Do not use the paid or AI generation tools (Hyper3D, Hunyuan3D,
  Tripo). Build the geometry yourself.
- Generalise `scripts/blender/run_mcp.py` to take `--script <path>` (keeping
  `build_s4.py` as the default so the S4 rebuild command still works), so the
  world can also be rebuilt headless from a terminal:
  `python scripts/blender/run_mcp.py --script scripts/blender/build_night_city_world.py`.

### 8.3 What to build

- New builder: `scripts/blender/build_night_city_world.py`. It creates **only**
  a `Night_City_World` scene (never clears or edits other scenes) in a new
  `design/night-city-world/night-city-world.blend`.
- A modular kit: avenue segments with kerbs, lane paint and drains; 4 to 6
  facade variants with emissive window masks (varied per instance in the
  shader); the overpass; billboard frames; the corpo tower shells with
  crown emissive slots; rooftop props; the garage exterior with the roll-up
  door; the contact rooftop.
- **Named empties as anchors:** `cam_<shot>` and `cam_<shot>_target` for each
  shot, `anchor_billboard_main`, `anchor_tower_<slug>`, `anchor_curb_hero`,
  `anchor_garage_bay`, and the road spline as a named curve exported as points.
  The JS reads these by name, like the garage reads car nodes.
- Camera-match cameras `Cam_Hero_Wide` (16:10) and `Cam_Hero_Portrait`
  (390:844) to the drift formula, as the old Night City scene did.
  Render a Cycles reference of the hero shot and compare it to
  `neon-wide.webp` side by side. Commit the builder and the `.blend`; keep
  review PNGs local (extend `.gitignore` like the other design folders).
- Export plus `scripts/optimize-world.mjs` (glTF Transform: dedup, weld,
  Meshopt, WebP textures at 1K max, atlased where possible). Produce a
  **desktop GLB and a phone LOD GLB**. Add `npm run world:assets`.
- The far city stays procedural: `InstancedMesh` towers with a window shader
  (hash-lit windows, a few blinking), generated in a ring beyond the kit.
- Document it in `design/night-city-world/README.md` with the same sections
  as the garage README (source and assets, references, behaviour and
  verification), and add a "Current version: live world" section to
  `design/night-city/REFERENCES.md`.

---

## 9. Budgets and quality tiers

| | High (desktop) | Phone | Fallback |
| --- | --- | --- | --- |
| Trigger | GPU probe passes, not coarse pointer | coarse pointer or width < 768 | no GPU, reduced motion, `fx world off`, WebGL failure |
| Pixels | DPR <= 1.5, cap about 2.2 MP | DPR <= 1.25, cap about 0.9 MP | the plate |
| Reflection | 512 planar, rough | none (baked streak texture) | n/a |
| Rain | about 6k instanced streaks, 1 draw | about 2k | n/a |
| AVs / road cars | 10 / 4 | 4 / 2 | n/a |
| Post | bloom + CA + glitch + noise + SMAA | half-res bloom + glitch | n/a |
| World GLB | <= 3.5 MB | <= 1.5 MB | 0 |

- Frame time: p95 <= 16.7 ms on desktop at 1440x900 and on Ali's devbox1
  Chrome (the garage measured 13.0 to 13.6 ms there; aim for similar), and
  p95 <= 22 ms on the phone tier. Draw calls under about 150; triangles under
  about 500k on high.
- **Adaptive:** sample frame times for 2 s after `REVEAL`. If p95 is over the
  budget, drop a tier (pixels first, then reflection, then rain density)
  without a visible pop.
- Main entry bundle grows by no more than about 15 KB gzip (Lenis plus the
  mount). three.js, postprocessing and the world live in lazy chunks; keep the
  existing large-chunk warning from getting worse and say what it is in the PR.
- The plate is the first paint and LCP candidate; the world never delays it.

---

## 10. Accessibility and fallbacks

- `prefers-reduced-motion`: no world, today's plate hero and black sections,
  no Lenis. (The intro already skips under reduced motion.)
- The canvas and scrim are `aria-hidden`; keyboard focus, tab order, the
  skip behaviour and the console are unaffected. Text contrast over the
  dimmed world must meet what `tailwind.config.js`'s text levels promise
  (`dim` at about 5.4:1, `faint` at about 3.0:1): measure it on screenshots at
  the brightest frame of each reading shot.
- WebGL context loss: show the plate, keep the page usable, and restore on
  `webglcontextrestored`.
- `/recruiters` mounts none of this. Verify it by building and checking that
  the recruiters chunk does not import `src/world/`.

---

## 11. House rules (these break easily)

- **No em dashes anywhere**: code, comments, copy, commit messages, PR text,
  docs. Before every commit, `git diff main -U0 -- . | grep '^+' | grep $'\u2014'`
  (U+2014, the em dash) must print nothing. Two older comments on `main`
  (`deploy.yml`, `.gitignore`) already have one; leave them alone.
- **No invented telemetry.** No fake coordinates, clocks, uplink status,
  frame counters or "system_idle" in the UI or painted into the world. Billboards
  show Ali's real key art; towers show real orgs in their real colours.
- **Copy lives in `src/data`.** Do not change any existing copy. New
  world content (sign text, shot data) goes in `src/data/world.js`.
- **Every claim stays checkable** (README, notes). The world adds no claims.
- Keep the palette rules in `tailwind.config.js`: no `text-cyan`, volt stays
  scarce in the UI.
- Match the codebase: long "why" comments at the top of each module, the same
  naming, no TypeScript, ESLint clean.
- Commit messages read like the existing history (a plain sentence saying what
  changed and why, e.g. "The drift moves on the clock instead of the curve, and
  the car arrives already compiled").
- Update `README.md` (Stack; Structure: `src/world/`, the removal of
  `Skyline.jsx` and `RoadTraffic.jsx`, the new scripts; the "Run locally" asset
  commands).

---

## 12. Verification (all must pass before the PR)

Automated:
- `npm run build`, `npm run lint`, `npm run check:audio`, `npm run check:s4`,
  `git diff --check`.
- The drift evaluator: identical position, heading, slip and speed at the same
  1,083 samples for t <= 3.8 s.
- A new `npm run check:world` (Node, like `check:s4`): decodes both GLBs, checks
  every `cam_*` anchor exists for every `data-shot` id in `src/data/site.js`,
  checks the tower anchors cover every slug in `experience.js` and the road
  spline reaches `anchor_garage_bay`, and asserts GLB and texture size budgets.

In the browser (Playwright against `npm run dev`, headed Chrome with GPU, plus
Ali's devbox1):
- Screenshots of every shot at 1440x900 and 390x844, both held and mid-flight,
  saved locally (gitignored) and attached to the PR.
- The intro in full, short and off; the handoff has no cut; the car parks at
  the curb; replay three times without memory growth.
- Scroll the whole page down and back up: the car drives, reverses, and parks
  in the bay; the garage handoff pauses the world (check `renderer.info.render.frame`
  stops advancing) and resumes it.
- Deep links (`/#garage`, `/#contact`, `/#teardown`) and a long nav jump land
  instantly and on target; short hops are smooth.
- `/work/<project>` and `/work/<role>` hold the right shot; back to `/#projects`
  flies back.
- The Work deck: selecting each entry swaps the billboard with the glitch.
- `fx world off`, `fx reset`, each other `fx` switch, `LOW_POWER` (disable GPU
  acceleration), reduced motion, forced context loss, and `/recruiters`.
- Frame-time p95 for each tier, reported in the PR.

**Hard lines.** Nobody can approve an exception mid-run, so these are simply
off limits. If one looks necessary, take the conservative path and list it
under "Decisions I made" in the PR:
- changing any existing copy or any cue time;
- replacing or removing the plate files (they are the poster and the fallback);
- adding a runtime dependency beyond `lenis` and `postprocessing`;
- missing a budget in section 9 by more than 20% (cut detail instead);
- changing `garage-scene.js` behaviour;
- anything that changes `/recruiters`;
- editing the `Ali_S4_Final` or `Night_City_Garage` Blender scenes.

---

## 13. Delivery

One branch, `feat/night-city-world`, from an up-to-date `main`. One PR, not
merged. Suggested commit sequence (each builds and lints):

1. The scroll stage and Lenis, with section roots opted into `data-shot`;
   `scroll.js` goes through it. No visual change yet.
2. `WorldMount` with the plate as poster, the `world` switch, the scrim and
   `world-clear`; a greybox world to prove the camera maths.
3. The Blender kit, the builder script, the optimise script, and both GLBs.
4. The hero shot matched to the plate: signage, rain, AVs, reflection, post.
5. Shots for Work (billboards bound to the deck), Experience (towers bound to
   cards), About and Stack (rooftop), and Contact (the moon).
6. The car on the road spline, the garage flight, and the viewer handoff.
7. The intro unified: the drift pieces in the world, the parking curve, the
   glitch pass on the cues.
8. `/work/:slug` shots and route flights.
9. Tiers, adaptive quality, fallbacks, lifecycle and disposal.
10. `check:world`, README and design docs; delete `Skyline.jsx` and
    `RoadTraffic.jsx` and their CSS.

Push the branch and open the PR against `main` with `gh pr create`. Put in
the PR description: what changed and why; the shot list with screenshots at
both viewports; a short screen recording of the full scroll; frame-time numbers
per tier; bundle and asset deltas; what was verified and how; **"Decisions I
made"** (every judgement call from the progress log); and anything left open.
No em dashes.

---

## 14. Definition of done

The goal is met only when **all** of these hold. Finish with a message headed
`DONE REPORT` that lists each item with its evidence: the command you ran and
its exit code, the file path, the count, or the URL. An item without evidence
does not count.

1. The Blender MCP preflight passed. `scripts/blender/build_night_city_world.py`
   exists, rebuilds `Night_City_World` through `execute_blender_code` without
   error, and the `.blend` is committed. Viewport screenshots of
   `Cam_Hero_Wide` and `Cam_Hero_Portrait` were compared with the plate.
2. Both world GLBs exist, were produced by `npm run world:assets`, and are
   within the section 9 budgets (print their sizes).
3. `npm run build`, `npm run lint`, `npm run check:audio`, `npm run check:s4` and
   the new `npm run check:world` each exit 0; `git diff --check` is clean.
4. The drift evaluator matches the original at all 1,083 samples for t <= 3.8 s.
5. Every section id in `src/data/site.js` has a `data-shot` in the DOM and a
   shot in `src/data/world.js`; every experience slug has a tower; every
   featured project's key art reaches the billboard.
6. Playwright screenshots exist for every shot, held and mid-flight, at
   1440x900 and 390x844, plus the intro handoff, the garage handoff, a
   `/work/<project>` page, a `/work/<role>` page, `fx world off`, reduced motion
   and no-GPU. You have looked at each one.
7. Frame-time p95 was measured for the high and phone tiers and meets section 9,
   or the adaptive tier drop is shown bringing it inside budget.
8. `/recruiters` is unchanged: its chunk does not import `src/world/`, and a
   screenshot matches `main`.
9. `git diff main -U0 -- . | grep '^+' | grep $'\u2014'` prints nothing (no em
   dash added anywhere). No existing copy or cue time changed
   (show `git diff main -- src/data src/lib/cues.js`, which touches only new
   world data).
10. `README.md`, `design/night-city-world/README.md` and
    `design/night-city/REFERENCES.md` are updated, and `Skyline.jsx` and
    `RoadTraffic.jsx` are gone with nothing importing them.
11. `feat/night-city-world` is pushed, and the PR is open against `main`
    (print its URL) with the description from section 13. It is not merged.
