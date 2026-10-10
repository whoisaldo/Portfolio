// stats-api/api/query.js — everything the dashboard reads.
//
//   GET /api/query?days=30                 the whole dashboard, one object
//   GET /api/query?view=visitor&id=<id>    one visitor, every visit, every event
//   GET /api/query?view=session&id=<uuid>  one visit and its timeline
//
// Add &bots=1 to include sessions classified as robots, and &me=1 to include
// Ali's own. Both are excluded by default.
//
// The main view fetches the window's sessions once and aggregates them here
// rather than in eight GROUP BY queries. At a personal site's volume that is
// a few hundred rows, and it is what lets every row carry a recruiter/friend
// score, which is JavaScript, not SQL.
import { sql, query } from "../lib/db.js";
import { authed, privateHeaders } from "../lib/auth.js";
import { isBigTech } from "../lib/enrich.js";
import { score } from "../lib/score.js";

// One session row, with the visitor and link it belongs to and the few event
// facts the score needs. Shared by all three views. A visitor who first came
// through a tracked link carries that link on every later visit too.
const SESSION_SELECT = `
  SELECT s.id, s.visitor_id, s.started_at, s.last_seen_at, s.ip, s.org, s.asn, s.as_domain,
         s.org_kind, s.is_proxy, s.is_mobile_net, s.country, s.region, s.city, s.postal,
         s.latitude, s.longitude, s.ip_timezone, s.client_tz, s.lang, s.screen_w, s.screen_h,
         s.referrer, s.referrer_host, s.utm_source, s.utm_medium, s.utm_campaign, s.src,
         s.landing_path, s.shell, s.user_agent, s.browser, s.os, s.is_mobile, s.viewport_w,
         s.viewport_h, s.bot_reason, s.is_bot, s.is_me, s.max_scroll_pct, s.total_ms,
         s.event_count, s.resume_hits, s.deepest_section, s.alerts,
         v.label AS visitor_label, v.kind AS visitor_kind, v.note AS visitor_note,
         v.sessions AS visitor_sessions, v.first_seen AS visitor_first_seen,
         COALESCE(s.src, v.first_src) AS link_code, l.label AS link_label, l.kind AS link_kind,
         x.used_console, x.door_sound, x.saw_plain, x.pages, x.projects
  FROM session s
  LEFT JOIN visitor v ON v.id = s.visitor_id
  LEFT JOIN link l ON l.code = COALESCE(s.src, v.first_src)
  LEFT JOIN LATERAL (
    SELECT bool_or(e.type IN ('console', 'command'))                      AS used_console,
           bool_or(e.type = 'door' AND e.name = 'sound')                   AS door_sound,
           bool_or(e.type = 'pageview' AND e.path LIKE '/recruiters%')     AS saw_plain,
           count(*) FILTER (WHERE e.type = 'pageview')::int                AS pages,
           array_agg(DISTINCT substring(e.path FROM '/work/([^/?#]+)'))
             FILTER (WHERE e.type = 'pageview' AND e.path LIKE '%/work/%') AS projects
    FROM event e WHERE e.session_id = s.id
  ) x ON true
`;

const isMe = (s) => s.is_me || s.visitor_kind === "me";
const scored = (rows) => rows.map((s) => ({ ...s, score: score(s) }));

/** "Amazon.com, Inc." for the interesting networks, a bucket for the rest. */
function orgLabel(s) {
  if (s.org_kind === "relay") return "iCloud Private Relay";
  if (s.org_kind === "consumer") return "Home networks";
  if (s.org_kind === "unknown" || !s.org) return "Unknown networks";
  if (s.org_kind === "hosting") return isBigTech(s.as_domain, s.org) ? s.org : `${s.org} (cloud/VPN)`;
  return s.org;
}

/**
 * What to call a person's network: its real name. The buckets above are for
 * the networks table; "Home networks" is not a name for someone.
 */
const netName = (s) => (s.org_kind === "relay" ? "iCloud Private Relay" : s.org || "Unknown network");

const NAMED = (s) =>
  s.org_kind === "corporate" || s.org_kind === "education" ||
  (s.org_kind === "hosting" && isBigTech(s.as_domain, s.org));

/** YYYY-MM-DD in Boston, which is where "today" is for the person reading this. */
const dayOf = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

function countBy(rows, key, extra = () => ({})) {
  const m = new Map();
  for (const r of rows) {
    const k = key(r);
    if (k == null) continue;
    const o = m.get(k) || { key: k, sessions: 0, ...extra() };
    o.sessions++;
    m.set(k, o);
  }
  return [...m.values()].sort((a, b) => b.sessions - a.sessions);
}

/** Every visitor in the window, with what they did and what they look like. */
function visitorsOf(rows) {
  const m = new Map();
  for (const s of rows) {
    let v = m.get(s.visitor_id);
    if (!v) {
      v = {
        id: s.visitor_id, label: s.visitor_label, kind: s.visitor_kind, note: s.visitor_note,
        total_sessions: s.visitor_sessions, first_seen: s.visitor_first_seen,
        last_seen: s.last_seen_at, last: s, sessions: 0, total_ms: 0, resume_hits: 0,
        recruiter: 0, friend: 0, reasons: new Map(), orgs: new Set(), places: new Set(),
        link: s.link_code ? (s.link_label || s.link_code) : null,
      };
      m.set(s.visitor_id, v);
    }
    v.sessions++;
    v.total_ms += s.total_ms;
    v.resume_hits += s.resume_hits;
    v.recruiter += s.score.recruiter;
    v.friend += s.score.friend;
    for (const r of s.score.reasons) v.reasons.set(r.text, r.side);
    v.orgs.add(netName(s));
    const place = [s.city, s.region].filter(Boolean).join(", ");
    if (place) v.places.add(place);
  }
  return [...m.values()].map((v) => {
    const verdict =
      v.kind && v.kind !== "other" ? v.kind
      : v.recruiter - v.friend >= 2 ? "recruiter"
      : v.friend - v.recruiter >= 2 ? "friend" : "unknown";
    const l = v.last;
    return {
      id: v.id, label: v.label, kind: v.kind, note: v.note, verdict,
      recruiter: v.recruiter, friend: v.friend,
      reasons: [...v.reasons].slice(0, 8).map(([text, side]) => ({ text, side })),
      total_sessions: v.total_sessions, sessions: v.sessions,
      first_seen: v.first_seen, last_seen: v.last_seen,
      total_ms: v.total_ms, resume_hits: v.resume_hits, link: v.link,
      orgs: [...v.orgs], places: [...v.places].slice(0, 4),
      org: l.org, org_kind: l.org_kind, as_domain: l.as_domain, city: l.city, region: l.region,
      country: l.country, browser: l.browser, os: l.os, is_mobile: l.is_mobile,
    };
  });
}

// Fields the session lists need. The full row is only sent for one session.
function brief(s) {
  return {
    id: s.id, visitor_id: s.visitor_id, started_at: s.started_at, last_seen_at: s.last_seen_at,
    org: s.org, org_kind: s.org_kind, org_label: netName(s), as_domain: s.as_domain, city: s.city, region: s.region,
    country: s.country, referrer_host: s.referrer_host, src: s.src, link_label: s.link_label,
    landing_path: s.landing_path, browser: s.browser, os: s.os, is_mobile: s.is_mobile,
    max_scroll_pct: s.max_scroll_pct, total_ms: s.total_ms, event_count: s.event_count,
    resume_hits: s.resume_hits, deepest_section: s.deepest_section, pages: s.pages,
    projects: s.projects, is_bot: s.is_bot, bot_reason: s.bot_reason, me: isMe(s),
    visitor_label: s.visitor_label, visitor_sessions: s.visitor_sessions,
    verdict: s.score.verdict, reasons: s.score.reasons,
  };
}

async function main({ days, includeBots, includeMe }) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [all, sections, pages, clicks, links, strays, hits] = await Promise.all([
    query(SESSION_SELECT + " WHERE s.started_at >= $1 ORDER BY s.started_at DESC LIMIT 5000", [since]),

    // Dwell is sourced from `section` events, which the client emits when a
    // section leaves the viewport carrying the time it was visible.
    sql`
      SELECT e.name AS section, count(DISTINCT e.session_id)::int AS sessions,
             COALESCE(round(avg(e.dwell_ms))::int, 0) AS avg_ms
      FROM event e JOIN session s ON s.id = e.session_id LEFT JOIN visitor v ON v.id = s.visitor_id
      WHERE e.type = 'section' AND e.at >= ${since} AND e.name IS NOT NULL
        AND (${includeBots} OR NOT s.is_bot)
        AND (${includeMe} OR NOT (s.is_me OR COALESCE(v.kind, '') = 'me'))
      GROUP BY 1 ORDER BY sessions DESC LIMIT 30
    `,
    sql`
      SELECT COALESCE(e.path, '/') AS path, count(*)::int AS views,
             count(DISTINCT e.session_id)::int AS sessions
      FROM event e JOIN session s ON s.id = e.session_id LEFT JOIN visitor v ON v.id = s.visitor_id
      WHERE e.type = 'pageview' AND e.at >= ${since}
        AND (${includeBots} OR NOT s.is_bot)
        AND (${includeMe} OR NOT (s.is_me OR COALESCE(v.kind, '') = 'me'))
      GROUP BY 1 ORDER BY views DESC LIMIT 30
    `,
    // What people pressed: buttons, outbound links, email, console commands.
    sql`
      SELECT e.type, e.name, count(*)::int AS n, count(DISTINCT e.session_id)::int AS sessions
      FROM event e JOIN session s ON s.id = e.session_id LEFT JOIN visitor v ON v.id = s.visitor_id
      WHERE e.type IN ('click', 'outbound', 'contact', 'command', 'resume', 'door', 'console', 'intro')
        AND e.at >= ${since} AND e.name IS NOT NULL
        AND (${includeBots} OR NOT s.is_bot)
        AND (${includeMe} OR NOT (s.is_me OR COALESCE(v.kind, '') = 'me'))
      GROUP BY 1, 2 ORDER BY sessions DESC, n DESC LIMIT 50
    `,
    // Links are listed for all time: a link made in March and opened in
    // October should still show its March click.
    sql`
      SELECT l.code, l.label, l.kind, l.target, l.note, l.created_at,
        (SELECT count(*) FROM session s WHERE s.src = l.code AND NOT s.is_bot AND NOT s.is_me)::int AS visits,
        (SELECT max(started_at) FROM session s WHERE s.src = l.code AND NOT s.is_bot AND NOT s.is_me) AS last_visit,
        (SELECT count(*) FROM hit h WHERE h.code = l.code AND h.kind = 'go')::int AS clicks,
        (SELECT max(at) FROM hit h WHERE h.code = l.code AND h.kind = 'go') AS last_click,
        (SELECT count(*) FROM hit h WHERE h.code = l.code AND h.kind = 'preview')::int AS previews
      FROM link l ORDER BY l.created_at DESC
    `,
    // ?s= codes nobody made a link for: typed by hand, or an old link.
    sql`
      SELECT src AS code, count(*)::int AS visits, max(started_at) AS last_visit
      FROM session WHERE src IS NOT NULL AND src NOT IN (SELECT code FROM link) AND NOT is_bot
      GROUP BY src ORDER BY last_visit DESC LIMIT 30
    `,
    sql`
      SELECT id, at, kind, code, platform, org, org_kind, city, region, country, user_agent
      FROM hit WHERE at >= ${since} ORDER BY at DESC LIMIT 200
    `,
  ]);

  const bots = all.filter((s) => s.is_bot && !isMe(s));
  const rows = scored(all.filter((s) => (includeBots || !s.is_bot) && (includeMe || !isMe(s))));
  const timed = rows.filter((s) => s.total_ms > 0).map((s) => s.total_ms);
  const visitors = visitorsOf(rows);

  // Every day of the window gets a slot, so gaps read as gaps rather than as
  // a run of busy days.
  const byDay = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const day = dayOf(Date.now() - i * 86_400_000);
    byDay.set(day, { day, sessions: 0, recruiter: 0, resume_hits: 0 });
  }
  for (const s of rows) {
    const d = byDay.get(dayOf(s.started_at));
    if (!d) continue;
    d.sessions++;
    if (s.score.verdict === "recruiter") d.recruiter++;
    d.resume_hits += s.resume_hits;
  }

  const orgMap = new Map();
  for (const s of rows) {
    const label = orgLabel(s);
    const o = orgMap.get(label) || {
      label, org_kind: s.org_kind, sessions: 0, visitors: new Set(), last_seen: s.started_at,
      ms: 0, max_scroll: 0, resume_hits: 0, cities: new Set(), recruiter: 0,
    };
    o.sessions++;
    o.visitors.add(s.visitor_id);
    o.ms += s.total_ms;
    o.max_scroll = Math.max(o.max_scroll, s.max_scroll_pct);
    o.resume_hits += s.resume_hits;
    if (s.city) o.cities.add(s.city);
    if (s.score.verdict === "recruiter") o.recruiter++;
    orgMap.set(label, o);
  }
  const rank = (o) => (o.label.endsWith(" networks") || o.org_kind === "relay" ? 1 : 0);
  const orgs = [...orgMap.values()]
    .map((o) => ({ ...o, visitors: o.visitors.size, avg_ms: Math.round(o.ms / o.sessions), cities: [...o.cities].slice(0, 3) }))
    // Named organisations first regardless of volume: one visit from a
    // company is the thing worth seeing, forty from an ISP is weather.
    .sort((a, b) => rank(a) - rank(b) || b.sessions - a.sessions)
    .slice(0, 60);

  const live = scored(all.filter((s) => Date.now() - new Date(s.last_seen_at) < 120_000 && !s.is_bot)).map(brief);

  return {
    generated_at: new Date().toISOString(),
    days,
    include_bots: includeBots,
    include_me: includeMe,
    totals: {
      sessions: rows.length,
      visitors: visitors.length,
      returning: visitors.filter((v) => v.total_sessions > 1).length,
      resume_sessions: rows.filter((s) => s.resume_hits > 0).length,
      named_org_sessions: rows.filter(NAMED).length,
      recruiter: rows.filter((s) => s.score.verdict === "recruiter").length,
      friend: rows.filter((s) => s.score.verdict === "friend").length,
      // A session with one event never scrolled and never moved on. That is
      // the standard bounce definition and it is the number that tells you
      // whether the top of the page is working.
      bounces: rows.filter((s) => s.event_count <= 1).length,
      avg_ms: timed.length ? Math.round(timed.reduce((a, b) => a + b, 0) / timed.length) : 0,
      median_ms: median(timed),
      avg_scroll: rows.length ? Math.round(rows.reduce((a, s) => a + s.max_scroll_pct, 0) / rows.length) : 0,
    },
    // Bot volume is always reported, even when bots are excluded from
    // everything else — otherwise a misfiring classifier looks like a quiet week.
    bots: {
      n: bots.length,
      datacenter: bots.filter((s) => s.bot_reason === "datacenter").length,
      ua: bots.filter((s) => s.bot_reason === "ua" || s.bot_reason === "no-ua").length,
      other: bots.filter((s) => !["datacenter", "ua", "no-ua"].includes(s.bot_reason)).length,
    },
    live,
    daily: [...byDay.values()],
    orgs,
    visitors: visitors.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen)),
    recent: rows.slice(0, 200).map(brief),
    resume_sessions: rows.filter((s) => s.resume_hits > 0).slice(0, 60).map(brief),
    referrers: countBy(rows, (s) => s.referrer_host || "(direct)", () => ({ resume_hits: 0 }))
      .map((r) => ({ ...r, resume_hits: rows.filter((s) => (s.referrer_host || "(direct)") === r.key && s.resume_hits).length }))
      .slice(0, 25),
    places: countBy(rows, (s) => [s.city, s.region, s.country].filter(Boolean).join(", ") || null).slice(0, 40),
    devices: countBy(rows, (s) => `${s.browser} · ${s.os}${s.is_mobile ? " · phone" : ""}`).slice(0, 20),
    sections, pages, clicks, links, strays, hits,
  };
}

async function visitor(id) {
  const [v] = await sql`SELECT * FROM visitor WHERE id = ${id}`;
  if (!v) return null;
  const [sessions, events, siblings] = await Promise.all([
    query(SESSION_SELECT + " WHERE s.visitor_id = $1 ORDER BY s.started_at DESC LIMIT 200", [id]),
    sql`
      SELECT e.session_id, e.at, e.type, e.path, e.name, e.dwell_ms
      FROM event e JOIN session s ON s.id = e.session_id
      WHERE s.visitor_id = ${id} ORDER BY e.at ASC LIMIT 4000
    `,
    // Other browsers seen at the same address. On a home connection that is
    // usually the same person on another device; at an office, a university
    // or a phone carrier it is just neighbours, so it is shown, not merged.
    sql`
      SELECT s2.visitor_id AS id, max(v2.label) AS label, max(v2.kind) AS kind,
             count(DISTINCT s2.id)::int AS sessions, max(s2.started_at) AS last_seen,
             max(s2.org) AS org, max(s2.browser || ' · ' || s2.os) AS device
      FROM session s1
      JOIN session s2 ON s2.ip = s1.ip AND s2.visitor_id <> s1.visitor_id
      LEFT JOIN visitor v2 ON v2.id = s2.visitor_id
      WHERE s1.visitor_id = ${id} AND s1.ip IS NOT NULL
      GROUP BY s2.visitor_id ORDER BY last_seen DESC LIMIT 20
    `,
  ]);
  const rows = scored(sessions);
  return {
    visitor: v,
    summary: visitorsOf(rows)[0] || null,
    sessions: rows.map((s) => ({ ...brief(s), ip: s.ip, lang: s.lang, client_tz: s.client_tz, referrer: s.referrer })),
    events,
    siblings,
  };
}

async function session(id) {
  const [s] = await query(SESSION_SELECT + " WHERE s.id = $1", [id]);
  if (!s) return null;
  const events = await sql`
    SELECT at, type, path, name, dwell_ms, meta FROM event WHERE session_id = ${id} ORDER BY at ASC, id ASC LIMIT 2000
  `;
  return { session: { ...s, score: score(s), org_label: netName(s), me: isMe(s) }, events };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  privateHeaders(res);
  if (!authed(req)) return res.status(404).json({ error: "not found" });

  const q = req.query || {};
  try {
    if (q.view === "visitor") {
      const d = await visitor(String(q.id || "").slice(0, 64));
      return d ? res.status(200).json(d) : res.status(404).json({ error: "no such visitor" });
    }
    if (q.view === "session") {
      if (!UUID.test(q.id || "")) return res.status(404).json({ error: "no such session" });
      const d = await session(q.id);
      return d ? res.status(200).json(d) : res.status(404).json({ error: "no such session" });
    }
    // Clamped so a hand-edited URL cannot ask for an unbounded scan.
    const days = Math.min(Math.max(parseInt(q.days, 10) || 30, 1), 365);
    return res.status(200).json(await main({ days, includeBots: q.bots === "1", includeMe: q.me === "1" }));
  } catch (err) {
    console.error("query:", err?.message || err);
    return res.status(500).json({ error: "query failed" });
  }
}
