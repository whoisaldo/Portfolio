// stats-api/lib/comments.js — what the comment endpoints share.
//
// Readers comment on a blog post with a name and nothing else, and every
// comment waits for Ali. He approves or deletes it from the push on his phone,
// whose two links carry a token signed here. There is no account and no
// comment admin page, so the token is the whole of the authority: it names one
// comment and one action, and nothing else.
//
// Both secrets are derived from STATS_KEY rather than set separately. It is
// already required, already private, and changing it already means "sign
// everything out", which is the right thing to happen to old approve links.
import crypto from "node:crypto";

// A post is named by its slug, the name of its file in the site's src/blog/.
// Any slug-shaped name is taken rather than a list of posts kept here, so a new
// post takes comments without a deploy of this project. A comment on a post
// that does not exist is one Ali reads and deletes, like any other he would
// not approve.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True when `v` could be a post's slug. */
export const isPost = (v) => typeof v === "string" && v.length <= 80 && SLUG.test(v);

export const LIMITS = { name: 60, body: 2000, quote: 500, context: 64 };

export const ACTIONS = new Set(["approve", "delete"]);

const derive = (label) => crypto.createHmac("sha256", process.env.STATS_KEY || "").update(label).digest();

/** The approve or delete token for one comment. */
export function commentToken(id, action) {
  return crypto.createHmac("sha256", derive("ay-comment-moderation"))
    .update(`${id}:${action}`).digest("base64url").slice(0, 32);
}

/** True when `token` is the one for this comment and this action. */
export function tokenOk(id, action, token) {
  if (!process.env.STATS_KEY || !ACTIONS.has(action) || typeof id !== "string" || typeof token !== "string") return false;
  const want = Buffer.from(commentToken(id, action));
  const got = Buffer.from(token);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/**
 * The rate limit's key. A keyed hash, so the raw address is never stored and
 * the column is useless to anyone without STATS_KEY.
 */
export function ipHash(ip) {
  return crypto.createHmac("sha256", derive("ay-comment-ip")).update(ip || "unknown").digest("base64url").slice(0, 32);
}

// Control characters, except newline and tab, and the bidirectional overrides
// that can make a name read backwards. The text is shown as text, so none of
// this is about markup; it is about a comment looking like what it says.
// eslint-disable-next-line no-control-regex
const JUNK = /[\u0000-\u0008\u000b-\u001f\u007f‪-‮⁦-⁩]/g;

/** One line: no newlines, runs of space collapsed. */
export function cleanLine(v) {
  if (typeof v !== "string") return "";
  return v.normalize("NFC").replace(JUNK, "").replace(/\s+/g, " ").trim();
}

/** Paragraphs kept, at most one blank line between them. */
export function cleanText(v) {
  if (typeof v !== "string") return "";
  return v.normalize("NFC").replace(/\r\n?/g, "\n").replace(JUNK, "")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * A comment from the request body, or the reason it is not one.
 * @returns {{ok: true, value: object} | {ok: false, field: string, error: string}}
 */
export function readComment(b) {
  const post = typeof b?.post === "string" ? b.post : "";
  if (!isPost(post)) return { ok: false, field: "post", error: "That post doesn't take comments." };

  const name = cleanLine(b.name);
  if (!name) return { ok: false, field: "name", error: "Add a name." };
  if (name.length > LIMITS.name) return { ok: false, field: "name", error: `Keep the name under ${LIMITS.name} characters.` };

  const body = cleanText(b.body);
  if (!body) return { ok: false, field: "body", error: "Write a comment." };
  if (body.length > LIMITS.body) return { ok: false, field: "body", error: `Keep the comment under ${LIMITS.body} characters.` };

  // The quote is kept exactly as selected, whitespace and all, because the
  // page finds it again by matching it against its own text.
  let quote = null;
  if (b.quote != null && b.quote !== "") {
    const exact = typeof b.quote === "string" ? b.quote.replace(JUNK, "") : "";
    if (!exact.trim()) return { ok: false, field: "quote", error: "That quote is empty." };
    if (exact.length > LIMITS.quote) return { ok: false, field: "quote", error: `Quote under ${LIMITS.quote} characters.` };
    // The text just before and after it, nearest end kept, which tells two
    // copies of the same words apart.
    const text = (v) => (typeof v === "string" ? v.replace(JUNK, "") : "");
    quote = {
      exact,
      prefix: text(b.prefix).slice(-LIMITS.context),
      suffix: text(b.suffix).slice(0, LIMITS.context),
    };
  }
  return { ok: true, value: { post, name, body, quote } };
}

/** A row as the site sees it. Never the IP hash, never the status. */
export function publicComment(r) {
  return {
    id: r.id,
    name: r.name,
    body: r.body,
    quote: r.quote ? { exact: r.quote, prefix: r.quote_prefix || "", suffix: r.quote_suffix || "" } : null,
    created_at: r.created_at,
  };
}
