// src/front/private/budget.js: how much a draft's comments may hold together.
//
// The stats service answers every comment on a draft at once
// (GET /api/draft-comments), and an answer from a Vercel function is at
// most 4.5 MB. So a draft's comments are held to a budget in bytes, its
// lib/private.js's COMMENT_BYTES, 1.5 MB under that: each text (body,
// passage and its context, a suggested edit's words, anchor) counted as JSON
// writes it, in UTF-8, quotes and escapes included, an empty one too (""),
// and 1 KB more for each comment's ids, times and names. The service refuses a write that would take a draft past it
// (413) and writes nothing. The page checks a review against it before
// sending one (./review.js), so a review too large is never sent, and none
// of it is lost.
//
// A normal review is far from it: forty comments of a few lines each on
// whole paragraphs of about 950 characters, each with an anchor, come to
// about 135 KB, under 5% of it.

export const COMMENT_BYTES = { draft: 3_000_000, each: 1024 };

// The most one anchors request may be. One the service can take is never
// more than the budget, 3 MB, plus 80 bytes for each of its at most 500
// anchors' thread and keys: every anchor it takes is counted in the budget.
// Anything longer would be refused for the budget anyway, and past 4.5 MB by
// Vercel before the service sees it, so it is not sent.
export const ANCHORS_MOST = 4_000_000;

const utf8 = new TextEncoder();

/** A value's bytes as JSON writes it, in UTF-8. */
export const jsonBytes = (v) => utf8.encode(JSON.stringify(v)).length;

/** A text's bytes as the budget counts it, 2 for ""; 0 for none. */
const textBytes = (t) => (typeof t === "string" ? jsonBytes(t) : 0);

// The service keeps a deleted passage as an anchor of empty texts.
const GONE = { exact: "", prefix: "", suffix: "" };

/**
 * A comment as the budget counts it: one as the service answers with it
 * (`quote`, `suggestion`, `anchor`), or one of the review's ({body, quote}).
 */
export function commentBytes(c) {
  const q = c.quote;
  const a = c.anchor?.gone ? GONE : c.anchor;
  return COMMENT_BYTES.each + textBytes(c.body) + textBytes(q?.exact) + textBytes(q?.prefix) + textBytes(q?.suffix) + textBytes(c.suggestion) + textBytes(a?.exact) + textBytes(a?.prefix) + textBytes(a?.suffix);
}

/** Bytes as the messages say them: "240 KB", "1.2 MB", rounded up. */
export function bytesText(n) {
  return n < 1_000_000 ? `${Math.max(1, Math.ceil(n / 1000))} KB` : `${Math.ceil(n / 100_000) / 10} MB`;
}

/** Why something `over` bytes past the budget can't go in, then what to do (`then`). As the service says it. */
export function overBudget(over, then) {
  return `That's ${bytesText(over)} more than this draft's comments have room for: they hold ${bytesText(COMMENT_BYTES.draft)} in all, so they always load at once. ${then}`;
}

const KEPT = "These passages' new places weren't saved: each comment keeps the place it had. Shorten the longest passages, or delete comments you're done with.";

/** Why an anchors request (its body) is too large to send; "" when it is not. */
export function anchorsTooLarge(body) {
  const bytes = jsonBytes(body);
  return bytes > ANCHORS_MOST ? overBudget(bytes - COMMENT_BYTES.draft, KEPT) : "";
}
