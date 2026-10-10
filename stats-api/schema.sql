-- stats-api/schema.sql — the whole data model.
--
-- Apply once, by hand, against the Neon database:
--   psql "$DATABASE_URL" -f schema.sql
--
-- Five tables. `visitor` is one browser over time; `session` is one visit by
-- it; `event` is a thing that happened during a visit. `link` is a tracked
-- link Ali hands out, and `hit` is a request that is not a beacon: a short
-- link being followed, or a chat app fetching the preview image. Everything
-- the dashboard shows is an aggregate over these, computed at read time —
-- there is no rollup table, because at this volume (a personal site, hundreds
-- of visits a month) rolling up would be inventing a performance problem in
-- order to solve it.
--
-- WHAT IS STORED
--
--   The IP address, in `session.ip` and `hit.ip`. It is what makes "same
--   person, cleared their storage" and "same office as last week" answerable,
--   and it lets a network be looked up again later. The dashboard is private
--   and the site footer says visits are logged.
--
-- WHAT IS NOT
--
--   Names, emails, cursor tracks, keystrokes, form contents, or anything
--   resembling a session recording. Console commands are stored by name only,
--   never their arguments.

CREATE TABLE IF NOT EXISTS visitor (
  -- The random id the beacon keeps in localStorage. When storage is blocked
  -- the collector substitutes 'ipua:' + a hash of IP and user agent, so a
  -- private window still groups its own visits.
  id          text PRIMARY KEY,
  first_seen  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now(),
  sessions    integer NOT NULL DEFAULT 0,
  -- The tracked-link code of the first visit that carried one. A recruiter
  -- who opened their link once and comes back by typing the address is still
  -- that recruiter.
  first_src   text,
  -- Set by hand from the dashboard. `kind` overrides the automatic verdict.
  label       text,
  kind        text,                          -- recruiter | friend | me | other
  note        text
);

CREATE TABLE IF NOT EXISTS session (
  id              uuid PRIMARY KEY,
  visitor_id      text REFERENCES visitor(id) ON DELETE CASCADE,
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),

  -- Network. `org` is the useful column: "Amazon.com, Inc.", "Northeastern
  -- University", "Comcast Cable". Residential ISPs are the overwhelming
  -- majority and are not interesting individually.
  ip              text,
  org             text,
  asn             text,
  as_domain       text,                      -- "amazon.com", "northeastern.edu"
  org_kind        text,                      -- corporate | education | consumer | hosting | relay | unknown
  is_proxy        boolean,
  is_mobile_net   boolean,

  -- Place, from Vercel's edge. City is right on home broadband, often the
  -- carrier's hub on a phone, and the exit city on a VPN.
  country         text,
  region          text,
  city            text,
  postal          text,
  latitude        double precision,
  longitude       double precision,
  ip_timezone     text,

  -- What the browser says about itself. A browser clock in Boston behind an
  -- IP in Seattle is a VPN.
  client_tz       text,
  lang            text,
  screen_w        integer,
  screen_h        integer,

  -- Where they came from. `src` is a tracked-link code (?s=…).
  referrer        text,
  referrer_host   text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  src             text,
  landing_path    text,
  shell           text,                      -- cinematic | plain, at landing

  -- What they were using.
  user_agent      text,
  browser         text,
  os              text,
  is_mobile       boolean,
  viewport_w      integer,
  viewport_h      integer,

  -- Verdict. Bots are kept rather than dropped: a row you can exclude is
  -- evidence, a row you never wrote is a gap you cannot explain later.
  --
  -- `hard_bot_reason` is decided once, from things that cannot change (user
  -- agent, webdriver, viewport). `bot_reason` is re-decided on every batch,
  -- because a datacentre network on its own proves nothing: Amazon's offices
  -- share an AS with AWS, and a visit from one that scrolls and reads is a
  -- person. See collect.js.
  hard_bot_reason text,
  bot_reason      text,
  is_bot          boolean GENERATED ALWAYS AS (bot_reason IS NOT NULL) STORED,
  is_me           boolean NOT NULL DEFAULT false,

  -- Denormalised engagement, updated as events arrive. Kept on the session so
  -- the dashboard's headline table is one scan instead of a join per row.
  max_scroll_pct  integer NOT NULL DEFAULT 0,
  total_ms        integer NOT NULL DEFAULT 0,
  event_count     integer NOT NULL DEFAULT 0,
  resume_hits     integer NOT NULL DEFAULT 0,
  deepest_section text,

  -- Which alerts this visit has already sent, so a long visit pings once.
  alerts          text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS event (
  id          bigserial PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  -- When it happened in the browser, not when the batch arrived. Batches are
  -- twelve seconds apart, which would otherwise flatten a timeline.
  at          timestamptz NOT NULL DEFAULT now(),

  -- pageview | section | resume | outbound | contact | click | door |
  -- console | command | intro | scroll | end
  type        text NOT NULL,
  path        text,
  name        text,        -- section id, button label, link href, command name
  dwell_ms    integer,
  meta        jsonb
);

CREATE TABLE IF NOT EXISTS link (
  code        text PRIMARY KEY,
  label       text NOT NULL,                 -- "Jane Doe, Amazon SDE intern"
  kind        text NOT NULL DEFAULT 'recruiter', -- recruiter | friend | channel
  target      text NOT NULL DEFAULT 'site',  -- site | recruiters | resume
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hit (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  kind        text NOT NULL,                 -- go | preview
  code        text,                          -- the link, for kind = go
  platform    text,                          -- Slack, Discord, iMessage…, for kind = preview
  ip          text,
  user_agent  text,
  referrer    text,
  org         text,
  org_kind    text,
  city        text,
  region      text,
  country     text
);

CREATE INDEX IF NOT EXISTS event_session_idx   ON event (session_id);
CREATE INDEX IF NOT EXISTS event_at_idx        ON event (at DESC);
CREATE INDEX IF NOT EXISTS event_type_at_idx   ON event (type, at DESC);
CREATE INDEX IF NOT EXISTS session_started_idx ON session (started_at DESC);
CREATE INDEX IF NOT EXISTS session_visitor_idx ON session (visitor_id);
CREATE INDEX IF NOT EXISTS session_ip_idx      ON session (ip);
CREATE INDEX IF NOT EXISTS session_org_idx     ON session (org);
CREATE INDEX IF NOT EXISTS session_src_idx     ON session (src);
-- "Who is on the site right now" scans by last_seen_at.
CREATE INDEX IF NOT EXISTS session_live_idx    ON session (last_seen_at DESC);
-- The dashboard's default view is "real humans, newest first". Without this
-- the headline query sorts the whole table on every load.
CREATE INDEX IF NOT EXISTS session_human_idx   ON session (started_at DESC) WHERE NOT is_bot;
CREATE INDEX IF NOT EXISTS hit_at_idx          ON hit (at DESC);
