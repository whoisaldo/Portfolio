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
- An intro cinematic choreographed to the track: the moon, then a car that
  drifts the page in on the beat. Every cue is a measurement of the audio
  file, recorded in `src/lib/cues.js`

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

- `src/App.jsx` shell and router: entry gate, intro cinematic, navbar,
  reticle cursor, footer
- `src/routes/` the scrolling home page, and `/work/:slug` for the 15 detail
  pages (8 projects, 7 roles)
- `src/components/` and `src/sections/` the page sections
- `src/components/IntroCinematic.jsx` the intro. Runs on the song's clock;
  `?intro=off`, `?intro=short` and `?intro=full` override the default of
  full once per tab, short after
- `src/components/ui/` the chamfered `Panel` primitive and the decode effect
- `src/data/` all content. Copy lives here, never in a component
- `src/lib/` scroll behaviour, the analytics beacon, and the audio:
  `audio.js` (the context and the volume), `ambient.js` (the track, its
  clock, the analyser), `cues.js` (the timeline), `intro-sfx.js` (the car),
  `ui-sfx.js` (the blips), `reactive.js` (the `--bass` / `--level` variables)
- `src/assets/Intro/` the three generated plates: the moon, the car, the
  skyline. See `docs/PROJECT_CONTEXT.md`, "Intro art"
- `public/audio/ambient.m4a` background track, prefetched while the door is
  up and played only after the reader clicks through it
- `public/resume.pdf` current résumé, served at `/resume.pdf` and `/resume`

## Notes

Every claim on the site is meant to be checkable against a repository, a live
site, or the GitHub API. `docs/PROJECT_CONTEXT.md` records that audit, including
what was removed for failing it. Read it before editing any copy.

Two house rules that are easy to break by accident: no em dashes anywhere, and
no invented telemetry. The intro's readout prints measured values only; the
car and the hex matrix are staged as the fiction they are.
