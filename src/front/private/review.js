// src/front/private/review.js: Ali's review of a draft, the comments he has
// written on it and not published yet, kept in this browser.
//
// As in a code review: he comments on as many passages as he likes, each
// edited or deleted freely, then publishes them all at
// once (POST /api/draft-comments?a=batch). The stats service takes every one
// of them or none, so whatever revises the draft from them has the whole
// round together.
//
// Here rather than on the server: until he publishes, nothing but this
// browser is to have them, so nothing else should have to leave them out.
// Kept by the draft's slug alone, not by
// its text: a pending passage is found again by its words and context, as a
// published one is, and the editor keeps it where an edit moved it
// (./DraftComments.jsx).
//
// Each comment is a key of its own, so two tabs adding at once never write
// over each other: a tab's storage can be a moment behind another's, and a
// list read and written back whole would drop what it had not seen yet. A
// change to one comment is made holding this draft's lock (the Web Locks
// API, where the page has it), and so is a publish, from its snapshot to
// letting go of what went in. While one is publishing, a flag says so to
// every tab, which then leaves the comments alone.
//
// Each comment has the id it will be published under. A publish sent again
// after its answer was lost posts nothing twice. One the server has already
// is let go once its text and passage there are the ones here. Other text
// there is sent as an edit, and another passage as its anchor (where the
// editor says a published passage is now), so a word changed or a passage
// moved after a send is never lost.
//
// A passage is kept with `base`, the draft's updated_at of the text it was
// found in (null for text not saved yet), and its anchor goes with that base:
// the server refuses it (409) once the draft has been saved since, and the
// comment stays pending, its text and passage as they were, until its
// passage is found again in the draft as saved now.
//
// A review goes in one request, so whatever reads the comments sees it whole
// or not at all. One that would take the draft's comments past what they may
// hold (./budget.js) is not sent: the publish throws a 413 saying by how
// much, nothing is published and every comment stays here. It names the
// first of them that fit, which a publish can be told to send alone
// (`only`), the rest staying for the next.

import { COMMENT_BYTES, commentBytes, overBudget } from "./budget.js";

const prefix = (slug) => `draft-review:${slug}:`;
const flagKey = (slug) => `draft-review-publishing:${slug}`;

/** True for a storage event's key that changes this draft's review, or its publishing. */
export const isReviewKey = (slug, key) => key === null || key.startsWith(prefix(slug)) || key === flagKey(slug);

// As many as one publish sends (the stats service's MAX_BATCH).
export const MAX_REVIEW = 500;
// A publish's flag is let go after this, should its tab have closed mid-way.
const FLAG_FOR = 60_000;

const isQuote = (q) => q && typeof q.exact === "string" && typeof q.prefix === "string" && typeof q.suffix === "string";
const valid = (c) =>
  typeof c?.id === "string" && typeof c.body === "string" && (c.quote === null || isQuote(c.quote)) && (c.base == null || typeof c.base === "string") && Number.isFinite(c.at);
const quoteOf = (q) => q && { exact: q.exact, prefix: q.prefix || "", suffix: q.suffix || "" };

/** A body as the stats service stores it (lib/comments.js, cleanText), to tell an edit from a space. */
export const cleanBody = (v) =>
  v.normalize("NFC").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

const sameQuote = (a, b) => (!a || !b ? !a && !b : a.exact === b.exact && (a.prefix || "") === (b.prefix || "") && (a.suffix || "") === (b.suffix || ""));
/** Where the server has a comment's passage: its anchor, its quote while it has none. */
const placeOf = (there) => (there.anchor?.exact ? there.anchor : there.anchor?.gone ? { exact: "" } : there.quote);

/** True when `there`, the server's comment, is this pending one exactly: Ali's own, with its text and passage. */
export const publishedAsIs = (c, there) => own(there) && there.body === cleanBody(c.body) && sameQuote(placeOf(there), c.quote);

/** [{id, body, quote: {exact, prefix, suffix} | null, base, at}], in the order they were written. */
export function readReview(slug) {
  const out = [];
  try {
    const p = prefix(slug);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(p)) continue;
      try {
        const c = JSON.parse(localStorage.getItem(k));
        if (valid(c) && k === p + c.id) out.push(c);
      } catch {
        // Not one of ours.
      }
    }
  } catch {
    return [];
  }
  return out.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
}

function readOne(slug, id) {
  try {
    const c = JSON.parse(localStorage.getItem(prefix(slug) + id));
    return valid(c) && c.id === id ? c : null;
  } catch {
    return null;
  }
}

function write(slug, c) {
  try {
    localStorage.setItem(prefix(slug) + c.id, JSON.stringify(c));
  } catch {
    throw new Error("This browser won't keep the comment. Free up its storage, or allow it for this site, and try again.");
  }
}

const drop = (slug, id) => localStorage.removeItem(prefix(slug) + id);

/**
 * Runs fn holding this draft's review, in every tab of this browser that has
 * Web Locks; at once where it has not (a page over plain http), and then
 * the checks on each comment's text are what keep a change.
 */
export function locked(slug, fn) {
  const locks = globalThis.navigator?.locks;
  return locks?.request ? locks.request(`draft-review:${slug}`, fn) : Promise.resolve().then(fn);
}

// Each tab's comments in the order it wrote them, two in one millisecond too.
let last = 0;

/** Adds a comment to the review and returns it. Throws when storage refuses it, or the review is full. */
export function addPending(slug, { body, quote = null, base = null }) {
  if (readReview(slug).length >= MAX_REVIEW) {
    throw new Error(`A review holds ${MAX_REVIEW} comments at most. Publish these, then add more.`);
  }
  last = Math.max(Date.now(), last + 1);
  const c = { id: newId(), body, quote: quoteOf(quote), base: quote ? base : null, at: last };
  write(slug, c);
  return c;
}

/** False when the comment is not pending any more: published, or deleted in another tab. */
export function editPending(slug, id, body) {
  const c = readOne(slug, id);
  if (!c) return false;
  write(slug, { ...c, body });
  return true;
}

/**
 * Keeps a pending passage where it is now in the text saved at `base` (null
 * for text not saved yet). True when it had moved, or that text is not the
 * one it was kept for.
 */
export function movePending(slug, id, quote, base = null) {
  const c = readOne(slug, id);
  const q = quoteOf(quote);
  if (!c?.quote || (sameQuote(c.quote, q) && (c.base ?? null) === base)) return false;
  write(slug, { ...c, quote: q, base });
  return true;
}

/** True when `there`, Ali's published thread, is on another passage than the one kept here for it: a move still to send. */
export const movedHere = (c, there) => Boolean(c?.quote) && own(there) && Boolean(there.quote) && !sameQuote(placeOf(there), c.quote);

/**
 * Lets go of where a published one's passage was moved here, and keeps it
 * where the server has it (`there`): for a passage not to be found in the
 * draft as saved now. One with nothing else to send is let go; text edited
 * since still goes, as an edit. False when it is not pending any more.
 */
export function keepPublishedPlace(slug, id, there) {
  const c = readOne(slug, id);
  if (!c || !movedHere(c, there)) return false;
  const next = { ...c, quote: quoteOf(placeOf(there)), base: null };
  if (publishedAsIs(next, there)) drop(slug, id);
  else write(slug, next);
  return true;
}

/** Each pending passage in `quotes` (id → quote, or {gone: true}) kept where it is in the text saved at `base`; how many had moved. */
export function followPending(slug, quotes, base = null) {
  return readReview(slug).filter((c) => quotes.get(c.id) && !quotes.get(c.id).gone && movePending(slug, c.id, quotes.get(c.id), base)).length;
}

export function removePending(slug, ids) {
  for (const id of ids) drop(slug, id);
}

/** Lets go of each of these that is still as it was then: one edited or moved since stays. */
export function dropSent(slug, list) {
  for (const c of list) {
    const now = readOne(slug, c.id);
    if (now?.body === c.body && sameQuote(now.quote, c.quote)) drop(slug, c.id);
  }
}

/** The comment again under a new id, which it returns: the server's under its old one is not this. */
function renew(slug, id) {
  const c = readOne(slug, id);
  if (!c) return null;
  const next = { ...c, id: newId() };
  write(slug, next);
  drop(slug, id);
  return next.id;
}

/** True while a tab is publishing this draft's review. */
export function publishingNow(slug) {
  return publishingUntil(slug) > Date.now();
}

/** When the flag a publish raised lapses, should its tab have gone; 0 for none. */
export function publishingUntil(slug) {
  try {
    const at = Number(localStorage.getItem(flagKey(slug)));
    return at > 0 ? at + FLAG_FOR : 0;
  } catch {
    return 0;
  }
}

function flag(slug, on) {
  try {
    if (on) localStorage.setItem(flagKey(slug), String(Date.now()));
    else localStorage.removeItem(flagKey(slug));
  } catch {
    // Other tabs go by the lock alone.
  }
}

/** Ali's own thread, as the server shows it to him. */
export const own = (c) => Boolean(c?.mine && !c.thread);

/**
 * Publishes the review as it is now, holding it from that snapshot to
 * letting go of what went in, and returns how many went in, an edit to one
 * in already counted as its going in. `posted` is the
 * server's comments by id, as last polled; `send(list)` the batch request,
 * resolving to the comments it answers with; `edit(id, body)` an edit of a
 * published one; `anchor(id, quote, base)` moves a published one's passage,
 * found in the text saved at `base`, resolving to false when the server has
 * no such thread any more and throwing a 409 when the draft was saved since;
 * `refresh()` polls, resolving to the server's comments. With `only`, a
 * set of ids, those alone are published, and the rest wait.
 *
 * One the server has already is published: with other text there, the text
 * here goes as an edit, and with another passage, the passage here goes as
 * its anchor. The rest are sent in one request, all or none, unless they
 * would take the draft past its budget: then none is, and the publish
 * throws a 413 naming those that fit (`data.fits`). When the server has
 * one of them under its id with other text or another passage (a publish
 * whose answer was lost, changed since), it refuses them all (409, naming
 * it): it is sent as an edit or an anchor then, or under a new id when the
 * server's is not his thread, and the rest are sent again. One added while
 * this runs waits for the next publish.
 *
 * A passage found in text the server no longer has (or never had: text not
 * saved yet) is not sent. Its comment stays pending as it is, the rest go,
 * and the publish then throws a 409 naming it.
 */
export function publishReview(slug, { posted, send, edit, anchor, refresh, only = null }) {
  return locked(slug, async () => {
    const ids = new Set(readReview(slug).map((c) => c.id).filter((id) => !only || only.has(id)));
    let known = posted;
    const went = new Set();
    let refused = false;
    // Their passages are in text older than the server's.
    const stale = new Set();
    const again = (id) => {
      const next = renew(slug, id);
      if (next) ids.add(next);
    };
    try {
      for (;;) {
        flag(slug, true);
        for (const c of readReview(slug).filter((x) => ids.has(x.id) && known.has(x.id) && !stale.has(x.id))) {
          const there = known.get(c.id);
          // One on the whole draft is not one on a passage, nor the other way.
          if (!own(there) || !c.quote !== !there.quote) {
            again(c.id);
            continue;
          }
          if (cleanBody(c.body) !== there.body) {
            try {
              await edit(c.id, c.body);
            } catch (err) {
              // Deleted since it was published: this text is kept, to publish anew.
              if (err?.status !== 404) throw err;
              again(c.id);
              continue;
            }
            went.add(c.id);
          }
          if (!sameQuote(placeOf(there), c.quote)) {
            let placed;
            try {
              placed = c.base ? await anchor(c.id, c.quote, c.base) : null;
            } catch (err) {
              if (err?.status !== 409) throw err;
            }
            if (placed == null) {
              stale.add(c.id);
              continue;
            }
            // Deleted since it was published: kept, to publish anew.
            if (!placed) {
              again(c.id);
              continue;
            }
            went.add(c.id);
          }
          dropSent(slug, [c]);
        }
        const list = readReview(slug).filter((c) => ids.has(c.id) && !known.has(c.id)).slice(0, MAX_REVIEW);
        if (!list.length) {
          if (!stale.size) return went.size;
          throw Object.assign(new Error("The draft was saved since its passage was placed. It is kept here, and goes once its passage is found in the draft as saved."), {
            status: 409,
            data: { id: [...stale][0] },
          });
        }
        tooLarge(list, known);
        try {
          const got = await send(list);
          dropSent(slug, list);
          for (const c of list) went.add(c.id);
          // One edited after the snapshot is published now: the next round sends its edit.
          known = new Map([...known, ...got.map((c) => [c.id, c])]);
        } catch (err) {
          if (err?.status !== 409 || !Array.isArray(err.data?.ids) || refused) throw err;
          refused = true;
          known = new Map((await refresh()).map((c) => [c.id, c]));
          for (const id of err.data.ids) if (!known.has(id)) again(id);
        }
      }
    } finally {
      flag(slug, false);
    }
  });
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

/**
 * Throws a 413 when `list`, the comments to publish, would take the draft's
 * comments (`known`, the server's by id) past their budget, saying by how
 * much: none is sent then. `data.fits` is the ids of the first of them that
 * would go in, as many as fit, in order.
 */
export function tooLarge(list, known) {
  let room = COMMENT_BYTES.draft;
  for (const c of known.values()) room -= commentBytes(c);
  const sizes = list.map((c) => commentBytes({ body: cleanBody(c.body), quote: c.quote }));
  const total = sizes.reduce((a, b) => a + b, 0);
  if (total <= room) return;
  let fits = 0;
  for (let used = 0; fits < sizes.length && used + sizes[fits] <= room; fits++) used += sizes[fits];
  const then = fits
    ? `Nothing was published. Shorten or delete some, or publish the first ${fits} now and the rest after.`
    : "Nothing was published. Shorten these, or delete comments on this draft you're done with.";
  throw Object.assign(new Error(`This review is too large to publish at once. ${overBudget(total - room, then)}`), {
    status: 413,
    data: { fits: list.slice(0, fits).map((c) => c.id) },
  });
}
