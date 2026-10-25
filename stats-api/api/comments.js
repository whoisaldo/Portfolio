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
//
// Without STATS_KEY (which signs the links) or a channel to send the push on,
// no comment could ever be approved, so none is taken: the POST answers 503
// and the site says comments are closed.
import { waitUntil } from "@vercel/functions";
import { sql, transaction } from "../lib/db.js";
import { clientIp } from "../lib/enrich.js";
import { allowedOrigin, jsonBody } from "../lib/http.js";
import { canNotify, notify } from "../lib/notify.js";
import { commentToken, ipHash, isPost, publicComment, readComment } from "../lib/comments.js";

// Per address: a short burst, then a day's worth. For everyone: an hour's.
const LIMITS = { perTenMinutes: 3, perDay: 12, allPerHour: 40 };

// The count and the insert are one statement, run after a lock every new
// comment takes, so two comments arriving at once are counted one after the
// other. Counted and inserted separately, a burst of requests all read the
// same count before any of them was stored, and all got in. The lock is
// released when the transaction ends.
const LOCK = "SELECT pg_advisory_xact_lock(hashtext('ay-comment-insert'))";
const INSERT = `
  WITH n AS (
    SELECT
      count(*) FILTER (WHERE ip_hash = $7 AND created_at > now() - interval '10 minutes')::int AS burst,
      count(*) FILTER (WHERE ip_hash = $7)::int AS day,
      count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int AS everyone
    FROM comment
    WHERE created_at > now() - interval '1 day'
  ), added AS (
    INSERT INTO comment (post, name, body, quote, quote_prefix, quote_suffix, ip_hash)
    SELECT $1, $2, $3, $4, $5, $6, $7 FROM n
    WHERE n.burst < $8 AND n.day < $9 AND n.everyone < $10
    RETURNING id
  )
  SELECT n.burst, n.day, n.everyone, (SELECT id FROM added) AS id FROM n
`;

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
  if (!isPost(post)) return res.status(404).json({ error: "no such post" });
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
  if (!process.env.STATS_KEY || !canNotify()) {
    console.error("comments: closed, STATS_KEY or a push channel (NTFY_TOPIC, DISCORD_WEBHOOK_URL) is not set");
    return res.status(503).json({ error: "Comments are closed right now." });
  }

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
    const [, [row]] = await transaction([
      [LOCK],
      [INSERT, [
        post, name, body, quote?.exact ?? null, quote?.prefix ?? null, quote?.suffix ?? null, hash,
        LIMITS.perTenMinutes, LIMITS.perDay, LIMITS.allPerHour,
      ]],
    ]);
    if (!row.id) {
      if (row.burst >= LIMITS.perTenMinutes || row.day >= LIMITS.perDay) {
        return res.status(429).json({ error: "That's a lot of comments at once. Try again in a few minutes." });
      }
      return res.status(429).json({ error: "Comments are busy right now. Try again in an hour." });
    }

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
