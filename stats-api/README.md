# Signal — analytics for aliyounes.dev

A collector and a private dashboard. The portfolio stays on GitHub Pages; this
is a separate Vercel project that happens to live in the same repository.

```
aliyounes.dev            ──beacon──▶   stats.aliyounes.dev
(GitHub Pages, static)                 (Vercel functions + Neon Postgres)
                                              │
                                              ├─ POST /api/collect   ← the site
                                              ├─ GET  /api/query     ← the dashboard
                                              └─ GET  /             ← the dashboard
```

## What it answers

Ordinary analytics tells you a number of people came. This tells you **which
organisation's network they came from**, how far they read, and whether they
opened the résumé — because that is the question a portfolio actually has.

```
ORGANISATION                KIND       WHERE     SESS  AVG TIME  SCROLL  RÉSUMÉ  DEEPEST
Amazon Corporate Services   corporate  Seattle      2    3m 10s     88%       1  experience
Northeastern University     education  Boston       1    1m 05s     42%       —  projects
Consumer networks           consumer   Boston       1        9s     18%       —  hero
```

The reverse lookup only resolves networks, never people. Residential ISPs are
collapsed into one row, because forty Comcast subscribers listed separately
bury the one row that says *Google LLC*.

---

## Deploy

### 1. Database

Any Postgres works. Neon is the default because it is free and the driver here
speaks its HTTP protocol, which suits serverless better than a pooled TCP
connection.

```bash
# Vercel dashboard → Storage → Neon, or:
vercel integration add neon
```

Then apply the schema once:

```bash
psql "$DATABASE_URL" -f schema.sql
```

### 2. Project

From the repository root:

```bash
cd stats-api
vercel link          # create a NEW project — do not link it to the portfolio
vercel --prod
```

In the Vercel project settings, set **Root Directory** to `stats-api`.

### 3. Environment variables

| Variable         | Required | What it is                                                        |
| ---------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`   | yes      | Postgres connection string. Neon sets this for you.                |
| `STATS_KEY`      | yes      | The dashboard password. `openssl rand -hex 24`.                    |
| `IP_SALT`        | yes      | Salt for the IP hash. `openssl rand -hex 32`. Rotating it makes every previous visitor a new stranger. |
| `IPINFO_TOKEN`   | no       | ipinfo.io token, free tier is 50k lookups/month. **Without it there is no organisation column** — the rest still works. |

```bash
vercel env add STATS_KEY production
vercel env add IP_SALT production
vercel env add IPINFO_TOKEN production
```

### 4. Domain

Add `stats.aliyounes.dev` to the Vercel project, then at the DNS host:

```
CNAME   stats   cname.vercel-dns.com.
```

The apex `aliyounes.dev` is untouched and keeps pointing at GitHub Pages.

### 5. Point the site at it

In the **portfolio** project (not this one), the beacon reads a build-time
variable. For the GitHub Pages build, add it to `.github/workflows/deploy.yml`:

```yaml
      - run: npm run build
        env:
          VITE_STATS_ENDPOINT: https://stats.aliyounes.dev/api/collect
```

Unset, the beacon does nothing at all — no requests, no storage, no listeners.
That is the intended behaviour for a fork or a local build.

### 6. Open it

```
https://stats.aliyounes.dev/?k=<STATS_KEY>
```

The key is stored in `localStorage` and stripped from the address bar on first
load, so the URL stops carrying it. There is a *sign out of this device* link
at the bottom of the dashboard.

---

## Run it locally

```bash
createdb ay_stats
psql ay_stats -f schema.sql
npm install

DATABASE_URL=postgres://localhost/ay_stats \
STATS_KEY=dev IP_SALT=dev \
npm run dev                      # http://localhost:3311
```

`lib/db.js` picks node-postgres when `DATABASE_URL` points at localhost and the
Neon HTTP driver otherwise, so the same handlers run in both places.

To send it real traffic, add to the portfolio's `.env.local`:

```
VITE_STATS_ENDPOINT=http://localhost:3311/api/collect
```

`http://localhost:5199` and `:5173` are already in the collector's CORS
allow-list.

---

## Privacy

Stated in the site footer, and true:

- **No cookies.** A session id in `sessionStorage`, a visitor id in
  `localStorage`. Both random, neither derived from anything about the person.
- **No raw IP is stored.** It is used once to resolve the network's
  organisation, then hashed with `IP_SALT` and discarded.
- **GPC and DNT are honoured.** `src/lib/beacon.js` checks
  `navigator.globalPrivacyControl` and `navigator.doNotTrack` before it does
  anything, and returns without registering a single listener if either is set.
  Global Privacy Control is legally binding in California, Colorado and
  Connecticut, among others.
- **No cursor tracking, keystrokes, form contents or session replay.**

> **Worth knowing:** GPC is on by default in some browsers and extensions, and
> Chrome exposes it when the user enables it. Traffic from those visitors is
> not recorded at all — that is the deal the footer makes. If your own browser
> has GPC on you will not see your own visits, which is the usual reason the
> dashboard looks emptier than expected.

## Bots

Stored, flagged, and excluded from the dashboard by default rather than dropped
at the door — a row you can exclude is evidence, a row you never wrote is a gap
you cannot explain later. `?bots=1`, or the **BOTS** button, includes them, which
is how you check the classifier is not eating real traffic.

Three signals: user-agent, datacentre/VPN network (a browser session genuinely
originating inside AWS or Hetzner is not a reader), and an implausible viewport.
