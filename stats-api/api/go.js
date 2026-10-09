// stats-api/api/go.js — tracked short links.
//
//   GET https://stats.aliyounes.dev/go/<code>     (rewritten to /api/go?c=<code>)
//
// Made in the dashboard, one per person or channel: "Jane at Amazon", "the
// résumé PDF", "the group chat". Following one records the click and sends
// the reader on: to the site with ?s=<code> so the beacon can tie the visit to
// the link, or straight to the PDF, which runs no JavaScript and so can only
// be counted here.
//
// The redirect never waits on the database. If the lookup fails the reader
// still lands on the site.
import { sql } from "../lib/db.js";
import { linkCode } from "../lib/http.js";
import { previewPlatform } from "../lib/enrich.js";
import { recordHit } from "../lib/hits.js";

const SITE = "https://aliyounes.dev";

export default async function handler(req, res) {
  const code = linkCode(req.query?.c);
  let location = SITE + "/";
  let link = null;

  if (code) {
    try {
      [link] = await sql`SELECT code, label, target FROM link WHERE code = ${code}`;
    } catch (err) {
      console.error("go:", err?.message || err);
    }
    location =
      link?.target === "resume" ? `${SITE}/resume.pdf`
      : link?.target === "recruiters" ? `${SITE}/recruiters?s=${code}`
      : `${SITE}/?s=${code}`;

    // A chat app unfurling the short link is not a click. It is still worth
    // recording, as a preview, so the dashboard shows where it was pasted.
    const platform = previewPlatform(req.headers["user-agent"]);
    recordHit(req, {
      kind: platform ? "preview" : "go",
      code,
      platform,
      // Links to the site alert from the visit itself, which knows far more.
      // A link to the PDF has no visit, so it alerts here.
      alert: !platform && link?.target === "resume"
        ? { title: `Résumé link opened: ${link.label}`, dedupeMinutes: 60 }
        : null,
    });
  }

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
}
