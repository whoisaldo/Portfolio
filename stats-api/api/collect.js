// stats-api/api/collect.js — the beacon endpoint.
//
//   POST https://stats.aliyounes.dev/api/collect
//
// Called by src/lib/beacon.js on the portfolio, and by public/resume/index.html
// on its way to the PDF. Accepts a batch of events for one session, upserts the
// visitor and session rows, appends the events, and sends any alert the batch
// has earned.
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
  clientIp, fallbackVisitorId, geoFromHeaders, lookupIp, hardBotReason,
  isRelay, isBigTech, parseUa, refHost,
} from "../lib/enrich.js";
import { cap, int, jsonBody, allowedOrigin, linkCode } from "../lib/http.js";
import { notify, whoLine } from "../lib/notify.js";
import { score } from "../lib/score.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_TYPES = new Set([
  "pageview", "section", "resume", "outbound", "contact", "click", "door",
  "console", "command", "intro", "project", "scroll", "end",
]);

const DAY_MS = 86_400_000;

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigin(origin)) {
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
  if (origin && !allowedOrigin(origin)) return res.status(204).end();

  try {
    const body = jsonBody(req);
    if (!body || !UUID.test(body.sid || "")) return res.status(204).end();

    const events = Array.isArray(body.events) ? body.events.slice(0, 60) : [];
    const ua = cap(req.headers["user-agent"], 400);
    const me = body.me === 1 || body.me === true;
    const src = linkCode(body.s);

    // ---- visitor + session --------------------------------------------------
    // The enrichment lookup only runs on the first batch of a session. Later
    // batches carry the same id, so re-resolving the same address would spend
    // a lookup per beacon to learn what is already in the row.
    const [existing] = await sql`SELECT id FROM session WHERE id = ${body.sid} LIMIT 1`;

    if (!existing) {
      const ip = clientIp(req);
      const { browser, os, isMobile } = parseUa(ua || "");
      const geo = geoFromHeaders(req.headers);
      const net = await lookupIp(ip, process.env.IPINFO_TOKEN);
      const orgKind = isRelay(net.org, browser) ? "relay" : net.org_kind ?? "unknown";
      const hard = hardBotReason({ userAgent: ua, viewportW: body.vw, webdriver: body.wd === 1 });
      const vid = cap(body.vid, 64) || fallbackVisitorId(ip, ua);
      const path = cap(body.path, 300);

      // A visitor marked "me" stays marked: every later session from that
      // browser is flagged without the client having to say so again.
      const [visitor] = await sql`
        INSERT INTO visitor (id, sessions, first_src, kind, label)
        VALUES (${vid}, 1, ${src}, ${me ? "me" : null}, ${me ? "Me" : null})
        ON CONFLICT (id) DO UPDATE SET
          last_seen = now(),
          sessions  = visitor.sessions + 1,
          first_src = COALESCE(visitor.first_src, EXCLUDED.first_src),
          kind      = CASE WHEN ${me} THEN 'me' ELSE visitor.kind END,
          label     = CASE WHEN ${me} THEN COALESCE(visitor.label, 'Me') ELSE visitor.label END
        RETURNING kind
      `;

      await sql`
        INSERT INTO session (
          id, visitor_id, ip, org, asn, as_domain, org_kind, is_proxy, is_mobile_net,
          country, region, city, postal, latitude, longitude, ip_timezone,
          client_tz, lang, screen_w, screen_h,
          referrer, referrer_host, utm_source, utm_medium, utm_campaign, src,
          landing_path, shell, user_agent, browser, os, is_mobile,
          viewport_w, viewport_h, hard_bot_reason, bot_reason, is_me
        ) VALUES (
          ${body.sid}, ${vid}, ${cap(ip, 64)},
          ${net.org ?? null}, ${net.asn ?? null}, ${net.as_domain ?? null}, ${orgKind},
          ${net.is_proxy ?? null}, ${net.is_mobile_net ?? null},
          ${geo.country ?? net.country ?? null}, ${geo.region}, ${geo.city}, ${geo.postal},
          ${geo.latitude}, ${geo.longitude}, ${geo.ip_timezone},
          ${cap(body.tz, 64)}, ${cap(body.lang, 35)},
          ${int(body.sw, 32767)}, ${int(body.sh, 32767)},
          ${cap(body.ref, 500)}, ${cap(refHost(body.ref), 160)},
          ${cap(body.utm_source, 120)}, ${cap(body.utm_medium, 120)},
          ${cap(body.utm_campaign, 120)}, ${src},
          ${path}, ${path?.startsWith("/recruiters") ? "plain" : "cinematic"},
          ${ua}, ${browser}, ${os}, ${isMobile},
          ${int(body.vw, 32767)}, ${int(body.vh, 32767)},
          ${hard}, ${hard ?? (orgKind === "hosting" ? "datacenter" : null)},
          ${me || visitor?.kind === "me"}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // ---- events -------------------------------------------------------------
    // Each event carries the browser's clock. Trusted only within a day of
    // ours: a wrong system clock would otherwise file a visit under 1970.
    const now = Date.now();
    const rows = events
      .filter((e) => e && ALLOWED_TYPES.has(e.t))
      .map((e) => ({
        session_id: body.sid,
        at: new Date(Number.isFinite(e.ts) && Math.abs(e.ts - now) < DAY_MS ? e.ts : now).toISOString(),
        type: e.t,
        path: cap(e.p ?? body.path, 300),
        name: cap(e.n, 200),
        dwell_ms: int(e.d, DAY_MS),
        meta: e.m && typeof e.m === "object" ? e.m : null,
      }));

    if (rows.length) {
      // One multi-row INSERT rather than a loop: on a serverless HTTP driver
      // each statement is its own round trip, so a 40-event flush would be 40
      // sequential requests and would routinely outlive the function.
      await sql`
        INSERT INTO event (session_id, at, type, path, name, dwell_ms, meta)
        SELECT
          (r->>'session_id')::uuid, (r->>'at')::timestamptz, r->>'type', r->>'path',
          r->>'name', (r->>'dwell_ms')::int, (r->'meta')::jsonb
        FROM jsonb_array_elements(${JSON.stringify(rows)}::jsonb) AS r
      `;
    }

    // ---- engagement and verdict ---------------------------------------------
    // GREATEST rather than assignment: batches can arrive out of order, and a
    // late flush carrying an early scroll depth must not walk the maximum back.
    //
    // The verdict is re-decided here, from the new values (Postgres evaluates
    // every SET expression against the old row, hence the repetition). A
    // datacentre network is a bot only until the visit shows four seconds on
    // screen and either a scroll or a second event, or opens the résumé (the
    // /resume redirect page has no time to show). Amazon's, Google's and
    // Microsoft's offices share an AS with their clouds, and the people
    // working in them are exactly who this dashboard exists to see.
    const scroll = int(body.scroll, 100) ?? 0;
    const dwell = int(body.ms, DAY_MS) ?? 0;
    const resumeHits = rows.filter((r) => r.type === "resume").length;
    const deepest = cap(body.deepest, 60);

    await sql`
      UPDATE session SET
        last_seen_at    = now(),
        max_scroll_pct  = GREATEST(max_scroll_pct, ${scroll}),
        total_ms        = GREATEST(total_ms, ${dwell}),
        event_count     = event_count + ${rows.length},
        resume_hits     = resume_hits + ${resumeHits},
        deepest_section = COALESCE(${deepest}, deepest_section),
        src             = COALESCE(src, ${src}),
        is_me           = is_me OR ${me},
        bot_reason      = COALESCE(hard_bot_reason, CASE
          WHEN org_kind = 'hosting' AND resume_hits + ${resumeHits} = 0 AND NOT (
            GREATEST(total_ms, ${dwell}) >= 4000
            AND (GREATEST(max_scroll_pct, ${scroll}) > 0 OR event_count + ${rows.length} > 1)
          ) THEN 'datacenter' END)
      WHERE id = ${body.sid}
    `;

    await alert(body.sid);
    return res.status(204).end();
  } catch (err) {
    // Logged for the Vercel console, invisible to the visitor. A 500 here
    // would surface as a failed request in their devtools for no benefit.
    console.error("collect:", err?.message || err);
    return res.status(204).end();
  }
}

/** The alerts this session has earned and not yet sent, as [key, title]. */
export function dueAlerts(s) {
  if (!s || s.is_me || s.is_bot || s.visitor_kind === "me") return [];
  const out = [];
  if (s.src) out.push(["link", `Tracked link opened: ${s.link_label || s.src}`]);
  if (s.resume_hits > 0) out.push(["resume", "Résumé opened"]);
  if (s.visitor_label && s.visitor_sessions > 1) {
    out.push(["return", `${s.visitor_label} is back (visit ${s.visitor_sessions})`]);
  }
  if (s.org_kind === "corporate" || (s.org_kind === "hosting" && isBigTech(s.as_domain, s.org))) {
    out.push(["org", `Visitor from ${s.org}`]);
  }
  return out.filter(([key]) => !s.alerts.includes(key));
}

async function alert(sid) {
  if (!process.env.NTFY_TOPIC && !process.env.DISCORD_WEBHOOK_URL) return;
  const [s] = await sql`
    SELECT s.*, v.label AS visitor_label, v.kind AS visitor_kind, v.sessions AS visitor_sessions,
           l.label AS link_label, l.kind AS link_kind
    FROM session s
    LEFT JOIN visitor v ON v.id = s.visitor_id
    LEFT JOIN link l ON l.code = s.src
    WHERE s.id = ${sid}
  `;
  const due = dueAlerts(s);
  if (!due.length) return;

  // Claimed in the database before sending, so two batches racing in from
  // the same visit cannot both send the same alert.
  const keys = due.map(([k]) => k);
  const [claimed] = await sql`
    UPDATE session SET alerts = alerts || ${keys}::text[]
    WHERE id = ${sid} AND NOT (alerts && ${keys}::text[])
    RETURNING id
  `;
  if (!claimed) return;

  const verdict = score(s).verdict;
  const detail = [
    whoLine(s),
    `from ${s.referrer_host || "direct"}${s.landing_path ? ` → ${s.landing_path}` : ""}`,
    `${s.browser} on ${s.os}${s.is_mobile ? " (phone)" : ""}`,
    verdict === "unknown" ? null : `looks like: ${verdict}`,
  ].filter(Boolean).join("\n");
  await notify(due.map(([, t]) => t).join(" · "), detail, `#/s/${sid}`);
}
