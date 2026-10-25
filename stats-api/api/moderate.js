// stats-api/api/moderate.js — approving or deleting a comment from the push.
//
//   GET  /api/moderate?id=<id>&a=approve|delete&t=<token>   a page that asks
//   POST /api/moderate?id=<id>&a=approve|delete&t=<token>   does it
//
// The links in Ali's push lead here. Opening one only shows the comment and a
// button, because opening is not a decision: ntfy, Discord, iMessage and every
// link previewer fetch a URL to draw it, and a mail scanner follows links to
// check them. Only the POST from that button acts.
//
// The token (lib/comments.js) is signed over the comment's id and the action,
// so an Approve link cannot delete and neither works for another comment.
// It does not expire: the Delete link in the push still removes the comment
// after it was approved, which is how Ali takes one down later.
import { sql } from "../lib/db.js";
import { tokenOk } from "../lib/comments.js";

const SITE = "https://aliyounes.dev";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  // The token is in this page's address; it must not leave in a Referer.
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  );

  const id = String(req.query?.id || "");
  const action = String(req.query?.a || "");
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();
  if (!UUID.test(id) || !tokenOk(id, action, String(req.query?.t || ""))) {
    return page(res, 404, "This link doesn't work", "<p>It may have been copied wrong.</p>");
  }

  try {
    const [c] = await sql`SELECT id, post, name, body, quote, status, created_at FROM comment WHERE id = ${id}`;
    if (!c) return page(res, 410, "Already gone", "<p>This comment was deleted.</p>");
    const where = `${SITE}/blog/${c.post}/`;

    if (req.method === "GET") {
      if (action === "approve" && c.status === "approved") {
        return page(res, 200, "Already approved", `${card(c)}<p><a href="${where}#comment-${c.id}">See it on the post</a></p>`);
      }
      const verb = action === "approve" ? "Approve" : "Delete";
      return page(res, 200, `${verb} this comment?`, `${card(c)}
        <form method="post"><button class="${action}" type="submit">${verb} comment</button></form>`);
    }

    if (action === "approve") {
      await sql`UPDATE comment SET status = 'approved', approved_at = now() WHERE id = ${id} AND status = 'pending'`;
      return page(res, 200, "Approved", `${card({ ...c, status: "approved" })}
        <p>It shows on <a href="${where}#comment-${c.id}">the post</a> within a minute.</p>`);
    }
    await sql`DELETE FROM comment WHERE id = ${id}`;
    return page(res, 200, "Deleted", `<p>${esc(c.name)}'s comment on ${esc(c.post)} is gone.</p>`);
  } catch (err) {
    console.error("moderate:", err?.message || err);
    return page(res, 500, "Something went wrong", "<p>Nothing was changed. Try the link again in a minute.</p>");
  }
}

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function card(c) {
  const when = new Date(c.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
  return `<article>
    <p class="meta">${esc(c.post)} · ${esc(when)} · ${c.status}</p>
    <p class="name">${esc(c.name)}</p>
    ${c.quote ? `<blockquote>${esc(c.quote)}</blockquote>` : ""}
    <p class="body">${esc(c.body)}</p>
  </article>`;
}

function page(res, status, title, inner) {
  res.statusCode = status;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} · Comments</title>
<style>
  body { margin: 0; background: #0a0a0c; color: #eceae4; font: 17px/1.6 system-ui, sans-serif; }
  main { max-width: 34rem; margin: 0 auto; padding: 2.5rem 1.25rem; }
  h1 { font-size: 1.4rem; margin: 0 0 1.25rem; }
  article { background: #131316; border: 1px solid #24242a; padding: 1rem 1.1rem; }
  .meta { margin: 0; font-size: 0.85rem; color: rgb(236 234 228 / 0.6); }
  .name { margin: 0.4rem 0 0; font-weight: 600; }
  blockquote { margin: 0.75rem 0 0; padding-left: 0.9rem; border-left: 2px solid #fcee0a; color: rgb(236 234 228 / 0.75); white-space: pre-wrap; }
  .body { margin: 0.75rem 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  form { margin-top: 1.5rem; }
  button { font: inherit; font-weight: 600; border: 0; padding: 0.85rem 1.5rem; width: 100%; cursor: pointer; }
  button.approve { background: #fcee0a; color: #0a0a0c; }
  button.delete { background: #ff003c; color: #fff; }
  button:focus-visible { outline: 2px solid #eceae4; outline-offset: 3px; }
  a { color: #fcee0a; }
</style></head>
<body><main><h1>${esc(title)}</h1>${inner}</main></body></html>`);
}
