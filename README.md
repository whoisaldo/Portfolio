# Ali Younes · Portfolio

Personal portfolio for Ali Younes. Computer Science and Political Science at
Northeastern University, previously a SWE co-op at Philips, currently an SDE
intern on AWS CloudFormation.

Live: **[aliyounes.dev](https://aliyounes.dev)**

## Stack

- React 19 + Vite 7
- Tailwind CSS 3, with `ink` / `bone` / `volt` / `fuchsia` design tokens
- Framer Motion for entrances and micro-interactions
- Cyberpunk 2077 / Edgerunners visual direction: Chakra Petch for display,
  Barlow for prose, JetBrains Mono for data

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

- `src/App.jsx` shell and router: entry gate, boot sequence, navbar, footer
- `src/routes/` the scrolling home page, and `/work/:slug` for the 13 detail
  pages (8 projects, 5 roles)
- `src/components/` and `src/sections/` the page sections
- `src/components/ui/` the chamfered `Panel` primitive and the decode effect
- `src/data/` all content. Copy lives here, never in a component
- `src/lib/` scroll behaviour, the analytics beacon, and the audio
- `public/audio/ambient.m4a` background track, fetched only when a reader
  turns sound on
- `public/resume.pdf` current résumé, served at `/resume.pdf` and `/resume`

## Notes

Every claim on the site is meant to be checkable against a repository, a live
site, or the GitHub API. `docs/PROJECT_CONTEXT.md` records that audit, including
what was removed for failing it. Read it before editing any copy.

Two house rules that are easy to break by accident: no em dashes anywhere, and
no invented telemetry. The boot sequence prints measured values only.
