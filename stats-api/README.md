# Signal — analytics for aliyounes.dev

A collector and a private dashboard. The portfolio stays on GitHub Pages; this
is a separate Vercel project (`sidebandstudio/aliyounes-stats`) that happens to
live in the same repository.

```
aliyounes.dev            ──beacon──▶   stats.aliyounes.dev
(GitHub Pages, static)                 (Vercel functions + Neon Postgres)
                                              │
                                              ├─ POST /api/collect   ← the site's beacon, and /resume
                                              ├─ GET  /og.png        ← chat apps drawing a link preview
                                              ├─ GET  /go/<code>     ← tracked short links
                                              ├─ GET  /api/query     ← the dashboard (signed in)
                                              ├─ POST /api/admin     ← labels, links (signed in)
                                              ├─ /api/auth           ← sign in / out
                                              └─ GET  /              ← the dashboard
```

## What it answers

Who is reading the site, and whether they look like a recruiter or a friend.

- **Who.** The network each visit came from ("Amazon.com, Inc.", "Northeastern
  University", "Comcast"), the city, region, ZIP and coordinates Vercel
  resolves the IP to, the browser's own timezone and language, device, screen.
- **Again?** A random visitor id in localStorage ties visits from one browser
  together: visit count, first and last seen, the full history. Other browsers
  seen at the same IP are listed as possible matches, not merged.
- **How they got here.** Referrer, UTM tags, and tracked links (`?s=<code>`)
  made per person or channel in the dashboard. A visitor keeps the link they
  first came through, so a recruiter who opened their link once and comes back
  by typing the address is still that recruiter.
- **What they did.** Every page, each section's reading time, scroll depth,
  résumé opens, outbound/email clicks, buttons pressed, the door (sound or
  silent), the intro, the console and the names of commands typed in it.
- **Where it was shared.** The site's og:image is served from here, so each
  time Slack, Discord, iMessage, LinkedIn, WhatsApp… draws a preview of a pasted
  link, the fetch is recorded with the app's name.
- **Recruiter or friend.** `lib/score.js` adds up weak signals (tracked link,
  ATS or LinkedIn referrer, company network, landing on `/recruiters`, weekday
  hours in their timezone, résumé open — versus social referrers, campus or
  home network in MA, phone, evenings, the console) and shows the reasons. A
  label set by hand overrides it.
- **Right now.** Who is on the site, from a 45-second heartbeat.

Alerts go to a phone (ntfy) and/or Discord when a tracked link is opened, the
résumé is opened, a company network visits, a labelled visitor comes back, or
the site is shared somewhere.

---

## Deploy

Already deployed. This is how, for a rebuild.

### 1. Project and database

```bash
cd stats-api
vercel project add aliyounes-stats --scope sidebandstudio
vercel link --project aliyounes-stats --scope sidebandstudio
vercel integration add neon --name aliyounes-stats-db -m region=iad1   # sets DATABASE_URL
vercel env pull /tmp/stats.env && set -a && . /tmp/stats.env && set +a
npm run schema
rm /tmp/stats.env
```

`schema.sql` is all `IF NOT EXISTS`, so re-running it is harmless.

### 2. Environment variables

| Variable              | Required | What it is |
| --------------------- | -------- | ---------- |
| `DATABASE_URL`        | yes      | Postgres connection string. The Neon integration sets it. |
| `STATS_KEY`           | yes      | The dashboard password. Changing it signs every device out. |
| `IPINFO_TOKEN`        | no       | ipinfo.io Lite token (free, no rate limit). Gives the network's name **and domain**, which classifies far better. Without it, ip-api.com's free endpoint is used, which is rate-limited per source IP and Vercel's are shared. |
| `NTFY_TOPIC`          | no       | Push alerts through ntfy.sh. Install the ntfy app and subscribe to this topic. The topic name is the secret. |
| `DISCORD_WEBHOOK_URL` | no       | Alerts as Discord messages. |
| `EXTRA_ORIGINS`       | no       | Comma-separated extra origins allowed to send beacons, e.g. a preview address. |
| `PUBLIC_URL`          | no       | Where alert links point. Defaults to `https://stats.aliyounes.dev`. |

```bash
vercel env add STATS_KEY production
vercel deploy --prod
```

### 3. Domain

`stats.aliyounes.dev` is added to the project. At Namecheap, one record:

```
CNAME   stats   cname.vercel-dns.com.        (or: A  stats  76.76.21.21)
```

The apex `aliyounes.dev` is untouched and keeps pointing at GitHub Pages.

### 4. The site

The beacon reads `VITE_STATS_ENDPOINT` at build time, set in
`.github/workflows/deploy.yml`. Unset, it does nothing at all — no requests, no
storage, no listeners. `public/resume/index.html` and the og:image in
`index.html` name `stats.aliyounes.dev` directly, because neither is built.

### 5. Open it

`https://stats.aliyounes.dev/`, then the password. The session is an HttpOnly,
SameSite=Strict cookie that lasts 30 days.

To keep your own visits out of the numbers, open `https://aliyounes.dev/?ay=me`
once in each browser you use. They are still stored, marked as you, and shown
only with **Me** on. `?ay=notme` undoes it. Labelling a visitor "me" in the
dashboard does the same for a browser after the fact.

---

## Run it locally

```bash
createdb ay_stats
psql ay_stats -f schema.sql
npm install

DATABASE_URL=postgres://localhost/ay_stats STATS_KEY=dev npm run dev   # http://localhost:3311
```

`lib/db.js` picks node-postgres when `DATABASE_URL` points at localhost and the
Neon HTTP driver otherwise, so the same handlers run in both places.

To send it real traffic, add to the portfolio's `.env.local`:

```
VITE_STATS_ENDPOINT=http://localhost:3311/api/collect
```

`http://localhost:5199` and `:5173` are already in the collector's CORS
allow-list.

## Tests

```bash
npm test                                                          # unit tests only
createdb ay_stats_test && psql ay_stats_test -f schema.sql
TEST_DATABASE_URL=postgres://localhost/ay_stats_test npm test     # plus the handlers end to end
```

The end-to-end tests empty the database they are given. Never point them at
production.

---

## Privacy

Stated in both site footers ("Visits are logged · no cookies"), and true:

- **No cookies** on the portfolio. A session id in `sessionStorage`, a visitor
  id in `localStorage`. Both random, neither derived from anything about the
  person. (The dashboard has one cookie, for Ali's login.)
- **The IP is stored.** It is what makes "same person, new browser" and "same
  office as last week" answerable, and it lets a network be looked up again.
  The dashboard is private.
- **GPC and DNT are honoured.** `src/lib/beacon.js` and `public/resume/index.html`
  check `navigator.globalPrivacyControl` and `navigator.doNotTrack` first and
  send nothing if either is set.
- **No cursor tracking, keystrokes, form contents or session replay.** Console
  commands are recorded by name only, never their arguments.

> **Worth knowing:** GPC is on by default in Brave and DuckDuckGo, and in
> Firefox and Chrome when the user turns it on. Those visitors are not recorded
> at all. If your own browser has GPC on you will not see your own visits.

## Bots

Stored, flagged, and excluded from the dashboard by default rather than dropped
at the door — a row you can exclude is evidence, a row you never wrote is a gap
you cannot explain later. The **Bots** button includes them, which is how you
check the classifier is not eating real traffic.

Hard signals decide once: a bot user agent, `navigator.webdriver`, an
impossible viewport. A datacentre network does **not** decide on its own,
because Amazon, Google and Microsoft route their offices through the same AS as
their clouds: a visit from one is a bot only until it shows four seconds on
screen and a scroll or a second event, or opens the résumé. Safari on
Cloudflare/Akamai/Fastly is iCloud Private Relay, a person with a hidden
network, and is labelled as such.
