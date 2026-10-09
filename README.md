# Ali Younes · Portfolio

Personal portfolio for Ali Younes. Computer Science and Political Science at
Northeastern University; back at Philips part-time, lead full stack engineer
at Pinnatec Auto, on Pawtograder's grading server, and an SDE intern on AWS
CloudFormation in summer 2026.

Live: **[aliyounes.dev](https://aliyounes.dev)**

## Stack

- React 19 + Vite 7
- Tailwind CSS 3, with `ink` / `bone` / `volt` / `fuchsia` design tokens
- Framer Motion for entrances and micro-interactions
- Cyberpunk 2077 / Edgerunners visual direction: Chakra Petch for display,
  Barlow for prose, JetBrains Mono for data
- An intro cinematic choreographed to the track: the moon (built of voxels
  in the city's own renderer when the city is ready), three title cards,
  then a car that drifts the page in on the beat. Every cue is a
  measurement of the audio file, recorded in `src/lib/cues.js`
- A live Night City behind the page (`src/world/`): vanilla three.js and one
  pmndrs `postprocessing` pass, a Blender-built kit plus procedural far
  towers, a camera shot per section, and Ali's S4 driving the road between
  them. It is a lazy chunk after first paint; the still plate is its poster
  and, with no GPU, reduced motion or `fx world off`, the whole of it
- Lenis smooths the scroll while the city is on, so a scroll reads as a
  camera move
- three.js is never part of the main bundle: the city, the intro's car and
  the garage viewer each load it on demand

## Run locally

```bash
git clone https://github.com/whoisaldo/portfolio.git
cd portfolio
npm install
npm run dev
```

Build and check:

```bash
npm run build        # outputs to dist/
npm run preview      # serves the build locally
npm run lint
npm run check:audio  # asserts the background track cannot double up
npm run check:s4     # the S4 GLB's wheel rig, hood and parts
npm run check:world  # the city's GLBs: shots, anchors, towers, road, budgets
npm run check:drift  # the intro's drift path, sample for sample against main
scripts/check-sensitive.py dist  # no phone numbers, no emails but aldo@ and hello@sideband.studio
```

Asset pipelines, run only when the source images change:

```bash
npm run images   # key art and screenshots  -> AVIF/WebP + LQIP
npm run photos   # the Teardown photographs -> AVIF/WebP + LQIP
npm run logos    # normalises the Experience logos
npm run og       # regenerates public/og.png
```

The city behind the page is rebuilt from Blender, then optimised:

```bash
python scripts/blender/run_mcp.py --script scripts/blender/build_night_city_world.py
npm run world:assets   # -> public/scenes/world/world-high.glb, world-phone.glb
```

## Structure

- `src/App.jsx` the router, and the split between the three shells: the
  cinematic (entry gate, intro, navbar, reticle cursor, console, footer) under
  `/`, the plain version under `/recruiters`, which mounts none of that, and
  the braindance under `/braindance`
- `src/routes/` the scrolling home page, `/work/:slug` for the 15 detail
  pages (8 projects, 7 roles), and `Recruiters.jsx` + `RecruiterWork.jsx`:
  the plain, light, conventional portfolio at `/recruiters`, reading the
  same data files as everything else and sharing no component with them
- `src/components/` and `src/sections/` the page sections
- `src/components/IntroCinematic.jsx` the intro. Runs on the song's clock;
  `?intro=off`, `?intro=short` and `?intro=full` override the default of
  full once per tab, short after
- `src/components/projects/WorkDeck.jsx` the work section: a rail of every
  project, a screen for one, and an expanded view with the screenshots. Five
  screens switch to a working model of the project ("Try it"); the models
  are `src/components/demos/`, each flagged SIMULATED, none of them talking
  to the real product
- `src/sections/Garage.jsx` the garage: the S4 with a numbered marker on
  every part, a detail card with a close crop of the real photograph, and
  the parts sheet. Two bays behind one bezel switch: the model
  (`src/components/GarageModel.jsx`, a three.js scene in
  `src/lib/garage-scene.js` around Ali's own S4, the GLB from
  `design/audi-s4` that the intro drifts too, with its hood on a hinge)
  and five photographs (front, engine bay, rear, a wheel, the cabin). This
  branch opens on the model. `src/data/garage.js` is the data, transcribed
  from Ali's own build list, with an anchor on a named node of the model
  for every part; the rest of the old Teardown (the 328xi, the bench, the
  two competitions) sits under the bay
- `src/world/` the live city behind every page of the cinematic shell:
  `WorldMount.jsx` (the poster, the canvas and the scrim, mounted in
  `App.jsx` above the routes), `stage.js` (the store), `scroll-stage.js`
  (Lenis and the shot maths), `world-scene.js` and the pieces it draws with.
  The shot list and the signs' words are `src/data/world.js`; the Blender
  kit and how it was built are in `design/night-city-world/README.md`. It
  replaced `Skyline.jsx` and `RoadTraffic.jsx`, which are gone: their signs
  and their traffic are the city's now
- `src/braindance/` the braindance: the same city with no page in front of
  it, as a four-minute recording cut to the song that can be played, paused,
  scrubbed, rewound and orbited, with the portfolio hidden in it as clues to
  scan on three layers (visual, audio, thermal). `recording.js` is the
  choreography (the car's drive, the shots, the board and the towers, all a
  function of time), `engine.js` drives the city through `renderDirected`,
  `layers.js` is the post effect that rebuilds world positions from depth for
  the layers, the outlines and the reconstruction, `scanner.js` and
  `places.js` say where and when each clue is, `sounds.js` synthesizes the
  car, the rain and the editor's sounds. Every word is `src/data/braindance.js`
- `src/components/ui/` the chamfered `Panel` primitive, the decode effect,
  and `CoverBox`, the cover-fit frame that keeps the garage's markers pinned
  to the picture under any crop
- `src/data/` all content. Copy lives here, never in a component
- `src/components/Console.jsx` and `Terminal.jsx` the console: the backtick,
  the terminal button in the header, or `/console`. Its commands can open the
  garage (`garage pulley`), jump to a section, drive the sound, and switch
  the environment (`fx world off`, `fx haze off`, `fx signs on`, `fx reset`) through
  `src/lib/env.js`, whose switches land on `<html>` as `data-fx-*`
- `src/lib/` scroll behaviour, the analytics beacon, and the audio:
  `audio.js` (the context and the volume), `ambient.js` (the track, its
  clock, the analyser), `cues.js` (the timeline), `intro-sfx.js` (the car,
  the glitch, the decode ticks), `ui-sfx.js` (the blips), `reactive.js` (the
  `--bass` / `--level` variables), `drift.js` and `drift-scene.js` (the 3D
  drift over the plate, which is the intro when the city is off or late)
- `src/three/drift/` the drift itself: the path (its keys and spline, and the
  curve it parks along), the rig, the lamps and beams, the smoke and the
  trails, shared by the plate's drift and the city's
- `src/three/car/` loads the custom Audi S4 GLB for the intro and Garage.
  The Blender source, reference decisions and rebuild instructions are in
  `design/audi-s4/README.md`. `npm run check:s4` validates its wheel rig.
- `src/assets/Intro/` the generated art: the moon plate, the skyline, the
  original flat car art, and the small top-down car
  the hero's traffic used before the live city. See `docs/PROJECT_CONTEXT.md`, "Intro art"
- `public/audio/ambient.m4a` background track, prefetched while the door is
  up and played only after the reader clicks through it
- `public/resume.pdf` current résumé, served at `/resume.pdf` and `/resume`.
  It is the portfolio cut, with no phone number and aldo@sideband.studio as
  the email; the Resume repo's `portfolio.yml` builds it and pushes it here

## Three ways in

`/` is the site as designed. `/recruiters` is the same content with none of
the cinema: no door, no intro, no sound, no reticle, no effects, light rather
than black, one column. "Recruiters press this" on the door, in the header
and in the footer goes there, and the plain page links back. The deploy
workflow writes `/recruiters` its own `index.html`, so the address on a
résumé answers with a 200.

`/braindance` is the third: the city alone, as a recorded night to play and
search, desktop only. It is an item on the door's menu and `jackin` in the
console, and it gets its own `index.html` in the deploy as well.

## Notes

Every claim on the site is meant to be checkable against a repository, a live
site, or the GitHub API. `docs/PROJECT_CONTEXT.md` records that audit, including
what was removed for failing it. Read it before editing any copy.

Two house rules that are easy to break by accident: no em dashes anywhere, and
no invented telemetry. The deck's status bar reports which entry and how many;
the intro's car and its title cards are staged as the fiction they are.
