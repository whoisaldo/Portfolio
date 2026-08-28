// stats-api/api/query.js — everything the dashboard reads, in one response.
//
//   GET https://stats.aliyounes.dev/api/query?k=<STATS_KEY>&days=30
//
// One endpoint returning one object rather than a REST surface: the dashboard
// is a single page that renders all of it at once, so splitting this into
// eight routes would only add eight round trips.
//
// The key is compared in constant time and the endpoint is marked noindex and
// no-store. It is a bearer secret in a query string, which is acceptable for
// exactly one reason — the only party who ever holds the URL is Ali. Do not
// extend this pattern to anything a third party would be handed.
import { sql } from "../lib/db.js";
import crypto from "node:crypto";

/** Length-safe, timing-safe string compare. */
function secretEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  // Hashing first makes both sides fixed-width.
  const ah = crypto.createHash("sha256").update(ab).digest();
  const bh = crypto.createHash("sha256").update(bb).digest();
  return crypto.timingSafeEqual(ah, bh);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  const key = req.query?.k || "";
  if (!process.env.STATS_KEY || !secretEq(String(key), process.env.STATS_KEY)) {
    // 404, not 401: an unauthenticated caller learns nothing about whether
    // this path exists.
    return res.status(404).json({ error: "not found" });
  }

  // Clamped so a hand-edited URL cannot ask for an unbounded scan.
  const days = Math.min(Math.max(parseInt(req.query?.days, 10) || 30, 1), 365);
  // Bots are stored but excluded by default. `?bots=1` includes them, which is
  // how you check the classifier is not eating real traffic.
  const includeBots = req.query?.bots === "1";
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  try {
    const [
      totals, orgs, recent, referrers, sections, pages,
      daily, devices, countries, resumeSessions,
    ] = await Promise.all([
      // ---- headline numbers ---------------------------------------------
      sql`
        SELECT
          count(*)::int                                            AS sessions,
          count(DISTINCT visitor_hash)::int                        AS visitors,
          count(*) FILTER (WHERE resume_hits > 0)::int             AS resume_sessions,
          count(*) FILTER (WHERE org_kind IN ('corporate','education'))::int AS named_org_sessions,
          -- A session with one event never scrolled and never moved on. That is
          -- the standard bounce definition and it is the number that tells you
          -- whether the top of the page is working.
          count(*) FILTER (WHERE event_count <= 1)::int            AS bounces,
          COALESCE(round(avg(total_ms) FILTER (WHERE total_ms > 0))::int, 0) AS avg_ms,
          COALESCE(round(
            percentile_cont(0.5) WITHIN GROUP (ORDER BY total_ms)
            FILTER (WHERE total_ms > 0)
          )::int, 0)                                               AS median_ms,
          COALESCE(round(avg(max_scroll_pct))::int, 0)             AS avg_scroll
        FROM session
        WHERE started_at >= ${since} AND (${includeBots} OR NOT is_bot)
      `,

      // ---- who ------------------------------------------------------------
      // Consumer ISPs are collapsed into one row. Listing forty Comcast
      // subscribers separately buries the one row that says "Google LLC".
      sql`
        SELECT
          CASE WHEN org_kind IN ('consumer','unknown','hosting')
               THEN initcap(org_kind) || ' networks'
               ELSE COALESCE(org, 'Unknown') END           AS label,
          org_kind,
          count(*)::int                                    AS sessions,
          count(DISTINCT visitor_hash)::int                AS visitors,
          max(started_at)                                  AS last_seen,
          COALESCE(round(avg(total_ms))::int, 0)           AS avg_ms,
          COALESCE(max(max_scroll_pct), 0)::int            AS max_scroll,
          sum(resume_hits)::int                            AS resume_hits,
          (array_agg(DISTINCT city) FILTER (WHERE city IS NOT NULL))[1:3] AS cities,
          (array_agg(deepest_section ORDER BY max_scroll_pct DESC)
             FILTER (WHERE deepest_section IS NOT NULL))[1]  AS deepest
        FROM session
        WHERE started_at >= ${since} AND (${includeBots} OR NOT is_bot)
        GROUP BY 1, 2
        ORDER BY
          -- Named organisations first regardless of volume: one visit from a
          -- company is the thing worth seeing, forty from an ISP is weather.
          CASE org_kind WHEN 'corporate' THEN 0 WHEN 'education' THEN 1 ELSE 2 END,
          sessions DESC
        LIMIT 60
      `,

      // ---- the feed --------------------------------------------------------
      sql`
        SELECT
          id, started_at, org, org_kind, city, region, country,
          referrer_host, browser, os, is_mobile, max_scroll_pct,
          total_ms, event_count, resume_hits, deepest_section,
          is_bot, bot_reason, landing_path
        FROM session
        WHERE started_at >= ${since} AND (${includeBots} OR NOT is_bot)
        ORDER BY started_at DESC
        LIMIT 100
      `,

      sql`
        SELECT COALESCE(referrer_host, '(direct)') AS host,
               count(*)::int AS sessions,
               sum(resume_hits)::int AS resume_hits,
               COALESCE(round(avg(max_scroll_pct))::int, 0) AS avg_scroll
        FROM session
        WHERE started_at >= ${since} AND (${includeBots} OR NOT is_bot)
        GROUP BY 1 ORDER BY sessions DESC LIMIT 20
      `,

      // ---- what they read --------------------------------------------------
      // Dwell is sourced from `section` events, which the client emits when a
      // section leaves the viewport carrying the time it was visible.
      sql`
        SELECT e.name                                       AS section,
               count(DISTINCT e.session_id)::int            AS sessions,
               COALESCE(round(avg(e.dwell_ms))::int, 0)     AS avg_ms,
               COALESCE(sum(e.dwell_ms), 0)::bigint         AS total_ms
        FROM event e JOIN session s ON s.id = e.session_id
        WHERE e.type = 'section' AND e.at >= ${since}
          AND e.name IS NOT NULL AND (${includeBots} OR NOT s.is_bot)
        GROUP BY 1 ORDER BY sessions DESC LIMIT 30
      `,

      sql`
        SELECT COALESCE(e.path, '/')                        AS path,
               count(*)::int                                AS views,
               count(DISTINCT e.session_id)::int            AS sessions
        FROM event e JOIN session s ON s.id = e.session_id
        WHERE e.type = 'pageview' AND e.at >= ${since}
          AND (${includeBots} OR NOT s.is_bot)
        GROUP BY 1 ORDER BY views DESC LIMIT 30
      `,

      sql`
        SELECT to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day,
               count(*)::int AS sessions,
               count(*) FILTER (WHERE org_kind IN ('corporate','education'))::int AS named,
               sum(resume_hits)::int AS resume_hits
        FROM session
        WHERE started_at >= ${since} AND (${includeBots} OR NOT is_bot)
        GROUP BY 1 ORDER BY 1 ASC
      `,

      sql`
        SELECT browser, os, is_mobile, count(*)::int AS sessions
        FROM session
        WHERE started_at >= ${since} AND (${includeBots} OR NOT is_bot)
        GROUP BY 1,2,3 ORDER BY sessions DESC LIMIT 20
      `,

      sql`
        SELECT COALESCE(country, '??') AS country,
               COALESCE(region, '') AS region,
               count(*)::int AS sessions
        FROM session
        WHERE started_at >= ${since} AND (${includeBots} OR NOT is_bot)
        GROUP BY 1,2 ORDER BY sessions DESC LIMIT 25
      `,

      // ---- the conversion --------------------------------------------------
      // Who downloaded the résumé, and what they had read first. This is the
      // single most useful query here.
      sql`
        SELECT s.id, s.started_at,
               COALESCE(s.org, initcap(s.org_kind) || ' network') AS org,
               s.org_kind, s.city, s.country, s.referrer_host,
               s.max_scroll_pct, s.total_ms, s.deepest_section
        FROM session s
        WHERE s.resume_hits > 0 AND s.started_at >= ${since}
          AND (${includeBots} OR NOT s.is_bot)
        ORDER BY s.started_at DESC LIMIT 60
      `,
    ]);

    // Bot volume is always reported, even when bots are excluded from
    // everything else — otherwise a misfiring classifier looks like a quiet week.
    const [botCount] = await sql`
      SELECT count(*)::int AS n,
             count(*) FILTER (WHERE bot_reason = 'datacenter')::int AS datacenter,
             count(*) FILTER (WHERE bot_reason = 'ua')::int AS ua
      FROM session WHERE started_at >= ${since} AND is_bot
    `;

    return res.status(200).json({
      generated_at: new Date().toISOString(),
      days,
      include_bots: includeBots,
      totals: totals[0],
      bots: botCount,
      orgs, recent, referrers, sections, pages, daily, devices, countries,
      resume_sessions: resumeSessions,
    });
  } catch (err) {
    console.error("query:", err?.message || err);
    return res.status(500).json({ error: "query failed" });
  }
}
