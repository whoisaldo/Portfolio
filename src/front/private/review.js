// src/front/private/review.js: Ali's review of a draft, the comments he has
// written on it and not published yet, kept in this browser.
//
// As in a code review: he comments on as many passages as he likes, each seen
// only by him and edited or deleted as freely, then publishes them all at
// once (POST /api/draft-comments?a=batch). The stats service takes every one
// of them or none, so whatever revises the draft from them has the whole
// round together.
//
// Here rather than on the server: nobody else is to see them, so nothing
// else should have to leave them out. Kept by the draft's slug alone, not by
// its text: a pending passage is found again by its words and context, as a
// published one is, so an edit to the draft leaves the review as it is. Each
// change reads what is stored first, so two tabs add to one review.
//
// Each comment has the id it will be published under. A publish sent again
// after its answer was lost posts nothing twice, and a comment the server
// has already is let go (./DraftComments.jsx).

export const reviewKey = (slug) => `draft-review:${slug}`;

const isQuote = (q) => q && typeof q.exact === "string" && typeof q.prefix === "string" && typeof q.suffix === "string";

/** [{id, body, quote: {exact, prefix, suffix} | null, at}], in the order they were written. */
export function readReview(slug) {
  try {
    const v = JSON.parse(localStorage.getItem(reviewKey(slug)));
    return Array.isArray(v)
      ? v.filter((c) => typeof c?.id === "string" && typeof c.body === "string" && (c.quote === null || isQuote(c.quote)) && Number.isFinite(c.at))
      : [];
  } catch {
    return [];
  }
}

function write(slug, list) {
  try {
    if (list.length) localStorage.setItem(reviewKey(slug), JSON.stringify(list));
    else localStorage.removeItem(reviewKey(slug));
  } catch {
    throw new Error("This browser won't keep the comment. Free up its storage, or allow it for this site, and try again.");
  }
}

/** Adds a comment to the review and returns it. Throws when storage refuses it. */
export function addPending(slug, { body, quote = null }) {
  const c = { id: newId(), body, quote: quote && { exact: quote.exact, prefix: quote.prefix || "", suffix: quote.suffix || "" }, at: Date.now() };
  write(slug, [...readReview(slug), c]);
  return c;
}

export function editPending(slug, id, body) {
  write(slug, readReview(slug).map((c) => (c.id === id ? { ...c, body } : c)));
}

export function removePending(slug, ids) {
  const gone = new Set(ids);
  write(slug, readReview(slug).filter((c) => !gone.has(c.id)));
}

/**
 * A random (version 4) UUID. crypto.randomUUID is only on secure pages, and a
 * preview over plain http is not one; getRandomValues is on every page.
 */
export function newId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The review as the batch endpoint takes it. */
export const toBatch = (list) =>
  list.map(({ id, body, quote }) => (quote ? { id, body, quote: quote.exact, prefix: quote.prefix, suffix: quote.suffix } : { id, body }));
