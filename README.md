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
- An intro cinematic choreographed to the track: the moon, three title
  cards, then a car that drifts the page in on the beat. Every cue is a
  measurement of the audio file, recorded in `src/lib/cues.js`
- three.js for the car, loaded on demand for the four seconds it is on
  screen and never part of the main bundle

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
```

Asset pipelines, run only when the source images change:

```bash
npm run images   # key art and screenshots  -> AVIF/WebP + LQIP
npm run photos   # the Teardown photographs -> AVIF/WebP + LQIP
npm run logos    # normalises the Experience logos
npm run og       # regenerates public/og.png
```

## Structure

- `src/App.jsx` the router, and the split between the two shells: the
  cinematic (entry gate, intro, navbar, reticle cursor, console, footer) under
  `/`, and the plain version under `/recruiters`, which mounts none of that
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
  and the photographs themselves. This branch opens on the model.
  `src/data/garage.js` is the data, transcribed from Ali's own build list,
  with an anchor on a named node of the model for every part; the rest of
  the old Teardown (the 328xi, the bench, the two competitions) sits under
  the bay
- `src/components/Skyline.jsx` the city behind the hero, alive: rooftop
  signage, drifting haze, the signs mirrored in the water, all of it
  breathing with the track through the same `--bass` / `--level` variables
- `src/components/RoadTraffic.jsx` the four small cars on the hero's road
- `src/components/ui/` the chamfered `Panel` primitive, the decode effect,
  and `CoverBox`, the cover-fit frame that keeps the garage's markers and
  the skyline's signs pinned to the picture under any crop
- `src/data/` all content. Copy lives here, never in a component
- `src/components/Console.jsx` and `Terminal.jsx` the console: the backtick,
  the terminal button in the header, or `/console`. Its commands can open the
  garage (`garage pulley`), jump to a section, drive the sound, and switch
  the environment (`fx haze off`, `fx signs on`, `fx reset`) through
  `src/lib/env.js`, whose switches land on `<html>` as `data-fx-*`
- `src/lib/` scroll behaviour, the analytics beacon, and the audio:
  `audio.js` (the context and the volume), `ambient.js` (the track, its
  clock, the analyser), `cues.js` (the timeline), `intro-sfx.js` (the car,
  the glitch, the decode ticks), `ui-sfx.js` (the blips), `reactive.js` (the
  `--bass` / `--level` variables), `drift.js` and `drift-scene.js` (the 3D
  drift: the path, the camera, the smoke, the trails, the light on the floor)
- `src/three/car/` loads the custom Audi S4 GLB for the intro and Garage.
  The Blender source, reference decisions and rebuild instructions are in
  `design/audi-s4/README.md`. `npm run check:s4` validates its wheel rig.
- `src/assets/Intro/` the generated art: the moon plate, the skyline, the
  original flat car art, and the small top-down car
  the hero's traffic uses. See `docs/PROJECT_CONTEXT.md`, "Intro art"
- `public/audio/ambient.m4a` background track, prefetched while the door is
  up and played only after the reader clicks through it
- `public/resume.pdf` current résumé, served at `/resume.pdf` and `/resume`

## Two versions

`/` is the site as designed. `/recruiters` is the same content with none of
the cinema: no door, no intro, no sound, no reticle, no effects, light rather
than black, one column. "Recruiters press this" on the door, in the header
and in the footer goes there, and the plain page links back. The deploy
workflow writes `/recruiters` its own `index.html`, so the address on a
résumé answers with a 200.

## Notes

Every claim on the site is meant to be checkable against a repository, a live
site, or the GitHub API. `docs/PROJECT_CONTEXT.md` records that audit, including
what was removed for failing it. Read it before editing any copy.

Two house rules that are easy to break by accident: no em dashes anywhere, and
no invented telemetry. The deck's status bar reports which entry and how many;
the intro's car and its title cards are staged as the fiction they are.
