-- stats-api/schema.sql — the whole data model.
--
-- Apply once, by hand, against the Neon database:
--   psql "$DATABASE_URL" -f schema.sql
--
-- Two tables. `session` is one visit by one person; `event` is a thing that
-- happened during it. Everything the dashboard shows is an aggregate over
-- these, computed at read time — there is no rollup table, because at this
-- volume (a personal site, hundreds of visits a month) rolling up would be
-- inventing a performance problem in order to solve it.
--
-- WHAT IS DELIBERATELY NOT STORED
--
--   The IP address. `ip_hash` is sha256(ip + IP_SALT) truncated to 16 bytes:
--   enough to recognise the same visitor across sessions, not enough to
--   recover the address. The salt lives in an env var, never in the repo. If
--   the salt is rotated, every prior visitor becomes a new stranger — which is
--   the correct and intended property.
--
--   Names, emails, cursor tracks, keystrokes, form contents, or anything
--   resembling a session recording. `org` is the reverse lookup of the network
--   the request came from, which is the same class of fact a webserver access
--   log has held since 1995.

CREATE TABLE IF NOT EXISTS session (
  id              uuid PRIMARY KEY,
  visitor_hash    text,                       -- stable across sessions, from the client
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),

  -- Network identity. `org` is the useful column: "Amazon Corporate Services",
  -- "Northeastern University", "Comcast Cable". Residential ISPs are the
  -- overwhelming majority and are not interesting individually.
  ip_hash         text,
  org             text,
  asn             text,
  country         text,
  region          text,
  city            text,
  org_kind        text,                       -- corporate | education | consumer | hosting | unknown

  -- Where they came from.
  referrer        text,
  referrer_host   text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  landing_path    text,

  -- What they were using.
  user_agent      text,
  browser         text,
  os              text,
  is_mobile       boolean,
  viewport_w      integer,
  viewport_h      integer,

  -- Verdict. Bots are kept rather than dropped: a row you can exclude is
  -- evidence, a row you never wrote is a gap you cannot explain later.
  is_bot          boolean NOT NULL DEFAULT false,
  bot_reason      text,

  -- Denormalised engagement, updated as events arrive. Kept on the session so
  -- the dashboard's headline table is one scan instead of a join per row.
  max_scroll_pct  integer NOT NULL DEFAULT 0,
  total_ms        integer NOT NULL DEFAULT 0,
  event_count     integer NOT NULL DEFAULT 0,
  resume_hits     integer NOT NULL DEFAULT 0,
  deepest_section text
);

CREATE TABLE IF NOT EXISTS event (
  id          bigserial PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  at          timestamptz NOT NULL DEFAULT now(),

  -- pageview | section | resume | outbound | project | scroll | end
  type        text NOT NULL,
  path        text,
  name        text,        -- section id, project slug, or link href
  dwell_ms    integer,
  meta        jsonb
);

CREATE INDEX IF NOT EXISTS event_session_idx  ON event (session_id);
CREATE INDEX IF NOT EXISTS event_at_idx       ON event (at DESC);
CREATE INDEX IF NOT EXISTS event_type_at_idx  ON event (type, at DESC);
CREATE INDEX IF NOT EXISTS session_started_idx ON session (started_at DESC);
CREATE INDEX IF NOT EXISTS session_org_idx     ON session (org);
-- The dashboard's default view is "real humans, newest first". Without this
-- the headline query sorts the whole table on every load.
CREATE INDEX IF NOT EXISTS session_human_idx   ON session (started_at DESC) WHERE NOT is_bot;
