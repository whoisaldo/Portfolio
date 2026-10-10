// stats-api/api/og.js — the preview image, served from here so it can be counted.
//
//   GET https://stats.aliyounes.dev/og.png        (rewritten to /api/og)
//
// The portfolio's og:image points here. When someone pastes aliyounes.dev into
// Slack, Discord, iMessage or LinkedIn, that app fetches the image to draw the
// preview, and its user agent says which app it is. That is the only trace a
// share leaves: the page itself is on GitHub Pages, whose logs are not ours.
//
// The bytes come from the portfolio's own /og.png, cached in memory for an
// hour, so there is one image and it lives with the site. If that fetch fails
// the request is redirected there instead, which still draws the preview.
import { previewPlatform } from "../lib/enrich.js";
import { recordHit } from "../lib/hits.js";

const SOURCE = "https://aliyounes.dev/og.png";
let cached = null; // { buf, at }

async function image() {
  if (cached && Date.now() - cached.at < 3_600_000) return cached.buf;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3000);
  try {
    const res = await fetch(SOURCE, { signal: ctl.signal });
    if (!res.ok) return cached?.buf ?? null;
    cached = { buf: Buffer.from(await res.arrayBuffer()), at: Date.now() };
    return cached.buf;
  } catch {
    return cached?.buf ?? null;
  } finally {
    clearTimeout(timer);
  }
}

// Search engines index the image on their own schedule. Recorded, never alerted.
const QUIET = new Set(["Google", "Bing", "Apple"]);

export default async function handler(req, res) {
  const platform = previewPlatform(req.headers["user-agent"]);
  recordHit(req, {
    kind: "preview",
    platform: platform || "unknown",
    alert: platform && !QUIET.has(platform)
      ? { title: `aliyounes.dev was shared on ${platform}`, dedupeMinutes: 30 }
      : null,
  });

  const buf = await image();
  if (!buf) {
    res.statusCode = 302;
    res.setHeader("Location", SOURCE);
    return res.end();
  }
  // Browser-cacheable but not CDN-cacheable: Vercel's edge only stores a
  // function's response when told to with s-maxage, and a cached response
  // would never reach this handler to be counted.
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=600");
  res.setHeader("Content-Length", buf.length);
  res.statusCode = 200;
  res.end(buf);
}
