# Ali Younes — Portfolio

Personal portfolio for Ali Younes — Computer Science & Political Science at Northeastern University, previous SWE Co-op at Philips, current SDE Intern at AWS CloudFormation (IaC).

Live: **[aliyounes.dev](https://aliyounes.dev)**

## Stack

- React 19 + Vite 7
- Tailwind CSS 3 (custom `ink` / `bone` / `signal` design tokens)
- Framer Motion for entrances and micro-interactions
- Editorial brutalist visual direction — Fraunces (display) paired with JetBrains Mono (UI)

## Run locally

```bash
git clone https://github.com/whoisaldo/portfolio.git
cd portfolio
npm install
npm run dev
```

Build:

```bash
npm run build      # outputs to dist/
npm run preview    # serves the build locally
```

## Structure

- `src/App.jsx` — root composition (Hero → Projects → Experience → Terminal → Resume → Contact)
- `src/components/` — section components
- `src/assets/` — project screenshots and logos
- `public/resume.pdf` — current résumé (served at `/resume.pdf`)
