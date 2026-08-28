// stats-api/api/collect.js — the beacon endpoint.
//
//   POST https://stats.aliyounes.dev/api/collect
//
// Called by src/lib/beacon.js on the portfolio. Accepts a batch of events for
// one session, upserts the session row and appends the events.
//
// Design constraints, in order of importance:
//
//   1. Never break the page it is measuring. Every failure path returns 204.
//      A visitor must never see a console error, a CORS warning or a hung
//      request because the analytics database is down.
//   2. Never block the page. The client sends via navigator.sendBeacon, which
//      is fire-and-forget; this endpoint's response body is never read.
//   3. Idempotent-ish on session. The client sends the same session id with
//      every batch, so the first insert wins and later batches update it.
import { sql } from "../lib/db.js";
import {
  clientIp, hashIp, lookupIp, botReason, parseUa, refHost,
} from "../lib/enrich.js";

// The site is on GitHub Pages at aliyounes.dev while this runs on Vercel, so
// every beacon is cross-origin and needs an explicit allow-list. Localhost is
// included so `npm run dev` produces real rows against a scratch database.
const ALLOWED = new Set([
  "https://aliyounes.dev",
  "https://www.aliyounes.dev",
  "http://localhost:5199",
  "http://localhost:5173",
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Trim to a column-safe length. Nothing here is worth an oversized row. */
const cap = (v, n) => (typeof v === "string" ? v.slice(0, n) : null);
const int = (v, max = 2_147_483_647) =>
  Number.isFinite(v) ? Math.max(0, Math.min(Math.trunc(v), max)) : null;

const ALLOWED_TYPES = new Set([
  "pageview", "section", "resume", "outbound", "project", "scroll", "end",
]);

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();
  // An unknown origin is refused here rather than in the browser: sendBeacon
  // ignores the CORS response, so a spoofed sender would otherwise write rows.
  if (origin && !ALLOWED.has(origin)) return res.status(204).end();

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || !UUID.test(body.sid || "")) return res.status(204).end();

    const events = Array.isArray(body.events) ? body.events.slice(0, 60) : [];
    const ua = cap(req.headers["user-agent"], 400);
    const { browser, os, isMobile } = parseUa(ua || "");

    // ---- session ----------------------------------------------------------
    // The enrichment lookup only runs on the first batch of a session. Later
    // batches carry the same id, so re-resolving the same address would spend
    // an ipinfo call per beacon to learn what is already in the row.
    const [existing] = await sql`
      SELECT id, is_bot FROM session WHERE id = ${body.sid} LIMIT 1
    `;

    if (!existing) {
      const ip = clientIp(req);
      const geo = await lookupIp(ip, process.env.IPINFO_TOKEN);
      const reason = botReason({
        userAgent: ua,
        orgKind: geo.org_kind,
        viewportW: body.vw,
        hasJs: true,
      });

      await sql`
        INSERT INTO session (
          id, visitor_hash, ip_hash, org, asn, country, region, city, org_kind,
          referrer, referrer_host, utm_source, utm_medium, utm_campaign,
          landing_path, user_agent, browser, os, is_mobile,
          viewport_w, viewport_h, is_bot, bot_reason
        ) VALUES (
          ${body.sid},
          ${cap(body.vid, 64)},
          ${hashIp(ip, process.env.IP_SALT)},
          ${geo.org ?? null}, ${geo.asn ?? null}, ${geo.country ?? null},
          ${geo.region ?? null}, ${geo.city ?? null}, ${geo.org_kind ?? "unknown"},
          ${cap(body.ref, 500)}, ${cap(refHost(body.ref), 160)},
          ${cap(body.utm_source, 120)}, ${cap(body.utm_medium, 120)},
          ${cap(body.utm_campaign, 120)},
          ${cap(body.path, 300)}, ${ua}, ${browser}, ${os}, ${isMobile},
          ${int(body.vw, 32767)}, ${int(body.vh, 32767)},
          ${reason !== null}, ${reason}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // ---- events -----------------------------------------------------------
    const rows = events
      .filter((e) => e && ALLOWED_TYPES.has(e.t))
      .map((e) => ({
        session_id: body.sid,
        type: e.t,
        path: cap(e.p ?? body.path, 300),
        name: cap(e.n, 200),
        dwell_ms: int(e.d, 86_400_000),
        meta: e.m && typeof e.m === "object" ? e.m : null,
      }));

    if (rows.length) {
      // One multi-row INSERT rather than a loop: on a serverless HTTP driver
      // each statement is its own round trip, so a 40-event flush would be 40
      // sequential requests and would routinely outlive the function.
      await sql`
        INSERT INTO event (session_id, type, path, name, dwell_ms, meta)
        SELECT
          (r->>'session_id')::uuid, r->>'type', r->>'path',
          r->>'name', (r->>'dwell_ms')::int, (r->'meta')::jsonb
        FROM jsonb_array_elements(${JSON.stringify(rows)}::jsonb) AS r
      `;
    }

    // ---- denormalised engagement -----------------------------------------
    // GREATEST rather than assignment: batches can arrive out of order, and a
    // late flush carrying an early scroll depth must not walk the maximum back.
    const scroll = int(body.scroll, 100);
    const dwell = int(body.ms, 86_400_000);
    const resumeHits = rows.filter((r) => r.type === "resume").length;
    const deepest = cap(body.deepest, 60);

    await sql`
      UPDATE session SET
        last_seen_at    = now(),
        max_scroll_pct  = GREATEST(max_scroll_pct, ${scroll ?? 0}),
        total_ms        = GREATEST(total_ms, ${dwell ?? 0}),
        event_count     = event_count + ${rows.length},
        resume_hits     = resume_hits + ${resumeHits},
        deepest_section = COALESCE(${deepest}, deepest_section)
      WHERE id = ${body.sid}
    `;

    return res.status(204).end();
  } catch (err) {
    // Logged for the Vercel console, invisible to the visitor. A 500 here
    // would surface as a failed request in their devtools for no benefit.
    console.error("collect:", err?.message || err);
    return res.status(204).end();
  }
}
