// stats-api/lib/hits.js — recording a request that is not a beacon.
//
// Two kinds: a tracked short link being followed (/go/<code>) and a chat app
// fetching the preview image (/og.png). Both answer the visitor first and
// record afterwards, through waitUntil, so the network lookup never delays a
// redirect or an image. Off Vercel, waitUntil has no request to extend and the
// promise simply runs on in the long-lived dev server.
import { waitUntil } from "@vercel/functions";
import { sql } from "./db.js";
import { clientIp, geoFromHeaders, lookupIp } from "./enrich.js";
import { cap } from "./http.js";
import { notify } from "./notify.js";

/**
 * @param {object} req
 * @param {{kind: "go"|"preview", code?: string|null, platform?: string|null,
 *          alert?: {title: string, dedupeMinutes: number}|null}} what
 */
export function recordHit(req, what) {
  waitUntil(
    (async () => {
      try {
        const ip = clientIp(req);
        const geo = geoFromHeaders(req.headers);
        const net = await lookupIp(ip, process.env.IPINFO_TOKEN);

        // Dedupe before inserting, against hits that are already there: the
        // same person following the same link twice in a minute, or Slack
        // fetching the image three times for one paste, is one alert.
        let quiet = true;
        if (what.alert) {
          const [recent] = await sql`
            SELECT 1 FROM hit
            WHERE kind = ${what.kind}
              AND COALESCE(code, '') = COALESCE(${what.code ?? null}, '')
              AND COALESCE(platform, '') = COALESCE(${what.platform ?? null}, '')
              AND (${what.kind === "preview"} OR ip = ${cap(ip, 64)})
              AND at > now() - make_interval(mins => ${what.alert.dedupeMinutes})
            LIMIT 1
          `;
          quiet = Boolean(recent);
        }

        await sql`
          INSERT INTO hit (kind, code, platform, ip, user_agent, referrer, org, org_kind, city, region, country)
          VALUES (
            ${what.kind}, ${what.code ?? null}, ${what.platform ?? null}, ${cap(ip, 64)},
            ${cap(req.headers["user-agent"], 400)}, ${cap(req.headers.referer, 500)},
            ${net.org ?? null}, ${net.org_kind ?? null},
            ${geo.city}, ${geo.region}, ${geo.country ?? net.country ?? null}
          )
        `;

        if (what.alert && !quiet) {
          const place = [geo.city, geo.region, geo.country].filter(Boolean).join(", ");
          await notify(
            what.alert.title,
            [net.org, place].filter(Boolean).join(" · ") || "unknown network",
            "#/hits",
          );
        }
      } catch (err) {
        console.error("hit:", err?.message || err);
      }
    })(),
  );
}
