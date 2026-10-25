// stats-api/api/comments.js — comments on the blog's posts.
//
//   GET  /api/comments?post=<slug>   the approved comments, oldest first
//   POST /api/comments               { post, name, body, quote?, prefix?, suffix?, website }
//
// Called by src/front/Comments.jsx. A new comment is stored as pending and Ali
// gets a push with Approve and Delete links (api/moderate.js). Nothing shows
// on the site until he approves it, so the reader is only ever told "waiting
// for approval", and the POST answers with nothing about other comments.
//
// Spam is held off in layers, cheapest first: an Origin the site's own,
// a honeypot field a person never sees, a rate limit per address (kept only
// as a keyed hash) and a ceiling for everyone at once, so a flood cannot turn
// into a flood of pushes. Ali's approval is the last layer and the one that
// actually decides.
import { waitUntil } from "@vercel/functions";
import { sql } from "../lib/db.js";
import { clientIp } from "../lib/enrich.js";
import { allowedOrigin, jsonBody } from "../lib/http.js";
import { notify } from "../lib/notify.js";
import { POSTS, commentToken, ipHash, publicComment, readComment } from "../lib/comments.js";

// Per address: a short burst, then a day's worth. For everyone: an hour's.
const LIMITS = { perTenMinutes: 3, perDay: 12, allPerHour: 40 };

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return list(req, res);
  if (req.method === "POST") return create(req, res);
  return res.status(405).end();
}

async function list(req, res) {
  const post = String(req.query?.post || "");
  if (!POSTS.has(post)) return res.status(404).json({ error: "no such post" });
  try {
    const rows = await sql`
      SELECT id, name, body, quote, quote_prefix, quote_suffix, created_at
      FROM comment
      WHERE post = ${post} AND status = 'approved'
      ORDER BY created_at, id
    `;
    // Briefly, at the edge as well as in the browser: an approval shows within
    // a minute, and a post that is being read a lot costs one query a minute.
    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ comments: rows.map(publicComment) });
  } catch (err) {
    console.error("comments:", err?.message || err);
    return res.status(500).json({ error: "Comments couldn't be read." });
  }
}

async function create(req, res) {
  res.setHeader("Cache-Control", "no-store");
  // A browser always says where a cross-site POST comes from. A script that
  // leaves the header out is not the comment box.
  if (!allowedOrigin(req.headers.origin)) return res.status(403).json({ error: "Comments are only taken from aliyounes.dev." });

  const b = jsonBody(req);
  if (!b) return res.status(400).json({ error: "That didn't arrive as a comment." });
  // The honeypot. A person never sees the field, so anything in it was typed
  // by a robot, which is told it worked and is never stored.
  if (typeof b.website === "string" && b.website.trim()) return res.status(202).json({ status: "pending" });

  const c = readComment(b);
  if (!c.ok) return res.status(400).json({ error: c.error, field: c.field });
  const { post, name, body, quote } = c.value;

  try {
    const hash = ipHash(clientIp(req));
    const [n] = await sql`
      SELECT
        count(*) FILTER (WHERE ip_hash = ${hash} AND created_at > now() - interval '10 minutes')::int AS burst,
        count(*) FILTER (WHERE ip_hash = ${hash})::int AS day,
        count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int AS everyone
      FROM comment
      WHERE created_at > now() - interval '1 day'
    `;
    if (n.burst >= LIMITS.perTenMinutes || n.day >= LIMITS.perDay) {
      return res.status(429).json({ error: "That's a lot of comments at once. Try again in a few minutes." });
    }
    if (n.everyone >= LIMITS.allPerHour) {
      return res.status(429).json({ error: "Comments are busy right now. Try again in an hour." });
    }

    const [row] = await sql`
      INSERT INTO comment (post, name, body, quote, quote_prefix, quote_suffix, ip_hash)
      VALUES (${post}, ${name}, ${body}, ${quote?.exact ?? null}, ${quote?.prefix ?? null}, ${quote?.suffix ?? null}, ${hash})
      RETURNING id
    `;

    // After the answer, so the reader never waits on ntfy.
    const detail = [`From: ${name}`, ...(quote ? [`On: "${quote.exact}"`] : []), "", body].join("\n");
    const link = (action) => `api/moderate?id=${row.id}&a=${action}&t=${commentToken(row.id, action)}`;
    waitUntil(
      notify(`New comment on ${post}`, detail, link("approve"), [
        { label: "Approve", path: link("approve") },
        { label: "Delete", path: link("delete") },
      ]).catch((err) => console.error("comments: notify", err?.message || err)),
    );

    return res.status(202).json({ status: "pending" });
  } catch (err) {
    console.error("comments:", err?.message || err);
    return res.status(500).json({ error: "The comment couldn't be saved. Try again in a minute." });
  }
}
