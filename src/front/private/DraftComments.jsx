// src/front/private/DraftComments.jsx: comments on a private draft, the way
// Google Docs does them, in the site's own style. Unlike Docs, a thread is
// seen only by the reader who started it and by Ali, who sees every thread:
// the stats service sends each viewer only theirs.
//
// On a wide screen the article keeps its column and the comments take a
// margin to its right. Each thread's card sits level with the passage it is
// about. Cards stack without overlapping, and the active one is placed
// exactly at its passage, nudged toward the text, with the others moving
// out of its way above and below, which is Docs' layout. Hovering a passage
// lifts its card; clicking one, or the card, makes it the active thread and
// brings the two together.
//
// On a phone there is no margin. The passages stay highlighted; tapping one
// opens its thread in a sheet from the bottom, and a button in the corner
// opens every thread as a list.
//
// To comment, select words in the draft and press "Comment" (or Ctrl/Cmd +
// Alt + M, as in Docs). A comment on the whole draft, rather than a passage,
// starts from under the text, where those threads are listed together with
// any whose passage was edited away ("On text that changed").
//
// A reader can also press "Suggest edit" by a selection: its words open in a
// box, to be changed into what they should say, with a note if they like.
// The thread's card shows the words that change struck through and the new
// ones marked as added (./suggest.js). Ali has "Accept" on it once it is
// open, showing the whole change (a margin card not in hand is cut to its
// opening lines): it puts the new words in the draft, saves that as a version, and marks the thread
// accepted and resolved with the same save (./accept.js). Only in the read
// view: while he edits, the card says to press Done first, as the editor
// saves its own copy of the same text. An accepted thread's passage is the
// new words; one whose words are gone (a deletion) is listed under the text,
// under "Accepted edits", not with the passages that changed.
//
// Passages are found again by their words and context (../quotes.js, shared
// with the public comments), so a draft can be edited under its comments.
// Overlapping passages are one highlight that leads to every thread on it.
//
// The threads are polled every few seconds while the page is in front, and
// every half minute when it is not; an unchanged draft answers with no body.
// What a reader is typing is never moved or lost by what arrives: the active
// card is the fixed point of the layout, and highlights wait to be redrawn
// until no text is selected. Everything anyone wrote is rendered as text.
//
// Nor is it lost by closing what it was typed in. A comment, a suggestion, a
// comment on the whole draft, a reply or an edit that was not sent is kept,
// and is back in its box when the box opens again. Only sending it or
// pressing Cancel lets it go. It is kept in the browser too, for this person
// on this draft (./typed.js): after a reload, a session that ran out or the
// list and back, the box last typed in is open again with its words. Words
// typed for a passage go only with that passage: another passage picked
// while they are unsent opens them, to send or cancel first. While a box is
// sending, it cannot be typed in or cancelled; each new message carries an
// id made once, so sending it again after a lost answer is one message, and
// a reader's says whose it is (`as`), so it never goes under another name.
//
// A thread's passage is where its `anchor` says, once Ali has edited the
// draft around it (the editor keeps anchors up to date, ./editor/), and where
// the reader's own quote says until then. An anchor of {gone: true} is a
// passage deleted, found again by the reader's quote should its words come
// back. The reader's quote never changes, and a card whose passage was
// edited says what it was first on.
//
// While Ali edits (`bridge`, from ./editor/DraftEditor.jsx), the cards are the
// same but for Accept (above), and the passages are the editor's decorations, which follow his edits
// as he types, and there is no "Comment" button: a selection there is for
// formatting.
//
// Ali's own new threads are a review, as in a code review (./review.js): each
// is kept in his browser as pending, edited or deleted freely, until "Publish"
// at the foot of the screen sends them all at once. Published, they are still
// his alone: no reader sees a thread he starts.
// The service takes all of them or none, and names the one it refused; until
// they are in, they stay pending. While they go, no tab changes them: an edit
// open then waits, and is the published comment's once they are in. A
// pending passage the editor moves is kept where it moved, with the save its
// text is, and one kept for text older than the page's is found again in the
// text now. His replies, edits and resolves are sent as he makes them, as
// everyone's are.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { Check, MessageSquare, MessageSquarePlus, PencilLine, Send, X } from "lucide-react";
import { groupQuotes, indexText, markQuote, quotable, quoteFromRange, unmark } from "../quotes";
import { ApiError, request } from "./api";
import { QUOTE_MAX, findThread, findWhole, grewTooLong, quoteAt, tooLong } from "./place";
import { acceptNote, acceptNotes, acceptOffered, sameAsPassage, suggestionParts } from "./suggest";
import { selectLeft } from "./select";
import { passageSlot, sendTyped, startPassage, sweepTyped, toReopen, typedStore, who } from "./typed";
import { addPending, dropSent, editPending, followPending, isReviewKey, keepPublishedPlace, locked, movedHere, publishedAsIs, publishReview, publishingNow, publishingUntil, readReview, removePending, toBatch } from "./review";

// As the stats service has them.
const LIMIT = { body: 5000, quote: QUOTE_MAX };

/** Under a box at its limit (`most`), in place of what is left: that it is full, of a `what`. */
const full = (what, most) => `That's as long as ${what} can be: ${most.toLocaleString("en-US")} characters.`;

/** What is left of a box's `most` once it is near it, or that it is full. */
function Left({ length, most, what = "a comment" }) {
  if (length >= most) return <p className="draft-left">{full(what, most)}</p>;
  if (length > most - 200) return <p className="draft-left tabular-nums">{most - length} characters left</p>;
  return null;
}
const WIDE = "(min-width: 1240px)";
const POLL = { visible: 4000, hidden: 30_000 };
const GAP = 10;

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** "just now", "2 min ago", "3 h ago", "yesterday", "Oct 24". */
function ago(iso, now) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  const days = Math.round(s / 86_400);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  return dateFormat.format(new Date(iso));
}

const typing = (el) => el?.closest?.("input, textarea, select, [contenteditable]");

function useMedia(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** The time, refreshed now and then, so "2 min ago" stays true. */
function useNow(every) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

/**
 * The draft's comments from the stats service, kept fresh, and the ways to change
 * them. A change is shown as soon as the service accepts it and then asked for
 * again, so what the page shows is always what the service has.
 */
function useThreads(slug, onLost, onDraftChange, as, onSomeoneElse) {
  const [state, setState] = useState({ status: "loading", comments: [] });
  const heard = useRef(onDraftChange);
  heard.current = onDraftChange;
  const elsewhere = useRef(onSomeoneElse);
  elsewhere.current = onSomeoneElse;
  const version = useRef(null);
  const busy = useRef(false);
  // The newest time any poll said the draft was saved, passed on after every
  // poll, a 204 or a failure too: the draft page asks for the draft until
  // it has that one.
  const saved = useRef(null);
  // A 404: signed out, or the draft is no longer theirs. The page finds out
  // which (`onLost`), once, and nothing more is asked about this draft.
  const lost = useRef(false);
  // A 401 from any request here: the session ended. The page asks who is
  // signed in (`onSomeoneElse`), and signed out, shows the sign-in with what
  // was typed kept (./typed.js). The failed request still throws, so what it
  // was sending stays where it was typed.
  const ask = useCallback(
    (path, opts) =>
      request(path, opts).catch((err) => {
        if (err instanceof ApiError && err.status === 401) elsewhere.current?.();
        throw err;
      }),
    [],
  );

  const poll = useCallback(async (force = false) => {
    if (lost.current || (busy.current && !force)) return;
    busy.current = true;
    try {
      const v = !force && version.current ? `&v=${encodeURIComponent(version.current)}` : "";
      const { status, data } = await ask(`/api/draft-comments?draft=${encodeURIComponent(slug)}${v}`, { timeout: 10_000 });
      if (status !== 204) {
        version.current = data.v;
        setState({ status: "ready", comments: data.comments });
        if (data.draft_updated_at && !(saved.current && data.draft_updated_at <= saved.current)) saved.current = data.draft_updated_at;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        if (!lost.current) {
          lost.current = true;
          onLost();
        }
      } else setState((s) => (s.status === "loading" ? { ...s, status: "error" } : s));
    } finally {
      busy.current = false;
    }
    if (saved.current) heard.current?.(saved.current);
  }, [slug, onLost, ask]);

  useEffect(() => {
    let timer = 0;
    let stopped = false;
    const tick = async () => {
      clearTimeout(timer);
      await poll();
      if (stopped || lost.current) return;
      clearTimeout(timer);
      timer = setTimeout(tick, document.visibilityState === "visible" ? POLL.visible : POLL.hidden);
    };
    const back = () => document.visibilityState === "visible" && tick();
    tick();
    document.addEventListener("visibilitychange", back);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", back);
    };
  }, [poll]);

  // Each returns the comment it changed, and throws an ApiError to show.
  const act = useMemo(() => {
    const merge = (c) =>
      setState((s) => ({ ...s, comments: [...s.comments.filter((o) => o.id !== c.id), c].sort(byTime) }));
    const after = (p) => p.finally(() => poll(true));
    return {
      // `as`: who the page shows signed in, a reader's username (Ali's page
      // sends none). Someone else signed in on this browser since, the
      // service stores nothing and says so, and the page asks who it is now.
      create: (fields) =>
        after(ask("/api/draft-comments", { method: "POST", body: { draft: slug, ...fields, ...(as ? { as } : {}) } }))
          .then(({ data }) => {
            merge(data.comment);
            return data.comment;
          })
          .catch((err) => {
            if (!(err instanceof ApiError && err.status === 409 && err.field === "as")) throw err;
            elsewhere.current?.();
            throw new ApiError(SOMEONE_ELSE, 409, "as", err.data);
          }),
      edit: (id, body) =>
        after(ask("/api/draft-comments", { method: "PATCH", body: { id, body } })).then(({ data }) => merge(data.comment)),
      resolve: (id, resolved) =>
        after(ask("/api/draft-comments", { method: "PATCH", body: { id, resolved } })).then(({ data }) => merge(data.comment)),
      remove: (id) =>
        after(ask(`/api/draft-comments?id=${encodeURIComponent(id)}`, { method: "DELETE" })).then(() =>
          setState((s) => ({ ...s, comments: s.comments.filter((c) => c.id !== id && c.thread !== id) })),
        ),
      // Where a published passage is now in the text saved at `base`. False when the server has no such
      // thread; a 409 when the draft was saved since, and nothing is written.
      anchor: (id, quote, base) =>
        after(ask("/api/draft-comments?a=anchors", { method: "PUT", body: { draft: slug, base, anchors: [{ thread: id, ...quote }] } })).then(
          ({ data }) => !data.ignored?.includes(id),
        ),
      // Any other request, a 401 heard as these hear it (Accept's).
      request: ask,
      // Every comment as the server has it now, or an ApiError: never the last poll's.
      list: () => ask(`/api/draft-comments?draft=${encodeURIComponent(slug)}`, { timeout: 10_000 }).then(({ data }) => data.comments),
      // Ali's review, all of it in one request.
      publish: (list) =>
        after(ask("/api/draft-comments?a=batch", { method: "POST", body: { draft: slug, comments: toBatch(list) }, timeout: 20_000 })).then(({ data }) => {
          data.comments.forEach(merge);
          return data.comments;
        }),
    };
  }, [slug, poll, as, ask]);

  return [state, act, poll];
}

const SOMEONE_ELSE = "This browser is signed in as someone else now, so this wasn't sent. Your words are kept.";

/**
 * This person's unsent words on this draft (./typed.js): kept in the
 * browser a moment after each change, and at once when the page is hidden,
 * left or closed.
 */
function useTyped(viewer, slug) {
  const person = who(viewer);
  const store = useMemo(() => typedStore(person, slug), [person, slug]);
  useEffect(() => {
    sweepTyped();
    const now = () => store.flush();
    const hidden = () => document.visibilityState === "hidden" && store.flush();
    window.addEventListener("pagehide", now);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pagehide", now);
      document.removeEventListener("visibilitychange", hidden);
      store.flush();
    };
  }, [store]);
  return store;
}

/** The thread a reply's or an edit's slot (./typed.js) is on, while it is there; null for others. */
function threadOfSlot(threads, slot) {
  const at = slot.indexOf(":");
  const [kind, id] = [slot.slice(0, at), slot.slice(at + 1)];
  if (kind === "reply") return threads.find((t) => t.id === id && !t.pending)?.id ?? null;
  if (kind === "edit") return threads.find((t) => t.id === id || t.replies.some((r) => r.id === id))?.id ?? null;
  return null;
}

const byTime = (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);

/**
 * Ali's review of this draft (./review.js), and the ways to change it. Read
 * again whenever another tab changes it. `publishing` while a tab, this one
 * or another, is publishing it: nothing in it is to change then. Adding
 * throws an Error to show when the browser would not keep it; an edit
 * resolves to false when the comment was published or deleted meanwhile.
 */
function useReview(slug, on) {
  const [list, setList] = useState(() => (on ? readReview(slug) : []));
  const [publishing, setPublishing] = useState(() => on && publishingNow(slug));
  useEffect(() => {
    if (!on) {
      setList([]);
      setPublishing(false);
      return;
    }
    let lapse = 0;
    const load = () => {
      setList(readReview(slug));
      setPublishing(publishingNow(slug));
      // A flag left by a tab that closed mid-way lapses.
      clearTimeout(lapse);
      if (publishingNow(slug)) lapse = setTimeout(load, publishingUntil(slug) - Date.now() + 50);
    };
    load();
    const heard = (e) => isReviewKey(slug, e.key) && load();
    window.addEventListener("storage", heard);
    return () => {
      clearTimeout(lapse);
      window.removeEventListener("storage", heard);
    };
  }, [slug, on]);
  return useMemo(() => {
    const load = () => setList(readReview(slug));
    const then = (fn) => (...args) => {
      try {
        return fn(...args);
      } finally {
        load();
      }
    };
    const held = (fn) => (...args) => locked(slug, () => fn(...args)).finally(load);
    return {
      list: on ? list : [],
      publishing: on && publishing,
      add: then((fields) => addPending(slug, fields)),
      edit: held((id, body) => editPending(slug, id, body)),
      remove: held((ids) => removePending(slug, ids)),
      // Each that is still as it was, let go: the server has it so.
      drop: held((sent) => dropSent(slug, sent)),
      // A published one's passage kept where the server has it, its move here let go.
      keep: held((id, there) => keepPublishedPlace(slug, id, there)),
      // Pending passages where they are now in the text saved at `base`: a Map of id → quote.
      follow: (quotes, base) => locked(slug, () => followPending(slug, quotes, base)).then((moved) => moved && load()),
      publish: (opts) => {
        setPublishing(true);
        return publishReview(slug, opts).finally(() => {
          load();
          setPublishing(publishingNow(slug));
        });
      },
    };
  }, [slug, on, list, publishing]);
}

/**
 * Keeps Ali's pending passages where the editor has them, so a publish sends
 * them there and a reload finds them there. The function returned does it;
 * it is called a moment after each change and before a publish, and the page
 * does it as it goes, with no waiting for the lock then.
 */
function useFollow(slug, bridge, review, on) {
  const latest = useRef(review);
  latest.current = review;
  useEffect(() => {
    if (!bridge || !on) return;
    const going = () => followPending(slug, bridge.quotes(), bridge.base());
    window.addEventListener("pagehide", going);
    return () => window.removeEventListener("pagehide", going);
  }, [slug, bridge, on]);
  return useCallback(async () => {
    if (bridge && on) await latest.current.follow(bridge.quotes(), bridge.base());
  }, [bridge, on]);
}

/** A pending comment as a thread, so it is placed and listed as threads are. */
const pendingThread = (c) => ({ id: c.id, pending: c, root: null, replies: [], quote: c.quote, find: c.quote, gone: false, resolved: null });

/**
 * Comments into threads: each first comment with its replies, oldest first.
 * `quote` is the passage as the reader quoted it; `find` is what to look for
 * in the text now: the anchor when the editor has moved it, null when its
 * passage was deleted (`gone`: then the reader's quote is looked for, in
 * case its words are back).
 */
function toThreads(comments) {
  const threads = new Map();
  for (const c of comments) {
    if (c.thread) continue;
    const anchor = c.anchor && typeof c.anchor === "object" ? c.anchor : null;
    const find = anchor?.gone ? null : anchor?.exact ? anchor : c.quote;
    threads.set(c.id, { id: c.id, root: c, replies: [], quote: c.quote, find, gone: Boolean(anchor?.gone), resolved: c.resolved });
  }
  for (const c of comments) if (c.thread) threads.get(c.thread)?.replies.push(c);
  return [...threads.values()];
}

/**
 * Highlights each thread's passage, and a passage being commented on now.
 * Returns which threads were placed, the ids sharing each one's highlight,
 * and the highlight's elements. Redrawn only when the passages change, and
 * never while the reader has words in the draft selected: redrawing splits
 * and rejoins text nodes, which would drop the selection.
 */
function useAnchors(body, items, bodyKey) {
  // `bodyKey` is the text's: new text (or the text back after editing) is
  // marked afresh.
  const key = JSON.stringify([bodyKey, ...items.map((i) => [i.id, Boolean(i.resolved), Boolean(i.gone), Boolean(i.pending), i.find?.exact, i.find?.prefix, i.find?.suffix])]);
  const latest = useRef(items);
  latest.current = items;
  const [drawn, setDrawn] = useState(null);
  const [found, setFound] = useState(() => ({ key: null, placed: new Set(), groups: new Map(), marks: new Map() }));

  useEffect(() => {
    if (key === drawn) return;
    const free = () => {
      const sel = window.getSelection();
      return !sel || sel.isCollapsed || !body.current?.contains(sel.anchorNode);
    };
    if (free()) {
      setDrawn(key);
      return;
    }
    const retry = () => free() && setDrawn(key);
    document.addEventListener("selectionchange", retry);
    return () => document.removeEventListener("selectionchange", retry);
  }, [key, drawn, body]);

  useLayoutEffect(() => {
    const root = body.current;
    if (drawn === null || !root) return;
    const list = latest.current;
    const placedAt = [];
    try {
      const index = indexText(root);
      for (const t of list) {
        // A passage deleted and then brought back (a version restored) is
        // where its reader's words are (./place.js).
        const at = findThread(index, t);
        if (at) placedAt.push({ id: t.id, at });
      }
    } catch (err) {
      console.warn("comments: could not find the passages", err);
    }
    const resolved = new Set(list.filter((t) => t.resolved).map((t) => t.id));
    const review = new Set(list.filter((t) => t.pending).map((t) => t.id));
    const added = [];
    const next = { key: drawn, placed: new Set(), groups: new Map(), marks: new Map() };
    for (const { at, ids } of groupQuotes(placedAt)) {
      try {
        const label = ids.length > 1 ? `${ids.length} threads on this passage` : "Show the comment";
        const els = markQuote(indexText(root), at, ids[0], label);
        if (!els.length) continue;
        for (const el of els) {
          el.dataset.threads = ids.join(" ");
          el.classList.toggle("is-pending", ids.includes("new"));
          el.classList.toggle("is-review", ids.some((id) => review.has(id)));
          el.classList.toggle("is-resolved", ids.every((id) => resolved.has(id)));
        }
        added.push(...els);
        for (const id of ids) {
          next.placed.add(id);
          next.groups.set(id, ids);
          next.marks.set(id, els);
        }
      } catch (err) {
        console.warn("comments: could not highlight a passage", err);
      }
    }
    setFound(next);
    return () => unmark(added);
  }, [drawn, body]);

  // `settled`: the highlights drawn are for the passages asked for, so one
  // that is not placed is not in the text, rather than not drawn yet.
  return { ...found, settled: found.key === key };
}

const NOWHERE = { current: null };
const NOTHING = { key: null, placed: new Set(), groups: new Map(), marks: new Map(), settled: false };

/**
 * The passages as the editor has them, in the shape useAnchors gives. Every
 * thread is handed over, hidden ones too, so a resolved thread's passage is
 * kept up to date as well. A pending one has no `find`: the server has no
 * thread for it, so it is looked for by its quote and no anchor is sent;
 * its quote follows it instead (useFollow).
 */
function useEditorAnchors(bridge, threads, visible) {
  const [found, setFound] = useState(NOTHING);
  useEffect(() => (bridge ? bridge.subscribe(setFound) : setFound(NOTHING)), [bridge]);
  const shown = new Set(visible.map((t) => t.id));
  const items = threads.map((t) => ({ id: t.id, find: t.pending ? null : t.find, quote: t.quote, gone: t.gone, resolved: Boolean(t.resolved), pending: Boolean(t.pending), hidden: !shown.has(t.id) }));
  const key = JSON.stringify(items);
  const latest = useRef(items);
  latest.current = items;
  useEffect(() => {
    bridge?.setItems(latest.current);
  }, [bridge, key]);
  return found;
}

/**
 * @param {{slug: string, body: React.RefObject<HTMLElement>, viewer: object, onLost: () => void,
 *   bodyKey?: string, bridge?: object, onDraftChange?: (updatedAt: string) => void, onRecheck?: () => void}} props
 *   `bodyKey` is the updated_at of the draft's text shown; `bridge` is the editor's,
 *   while Ali edits; `onDraftChange` hears after every poll the newest updated_at the polls have said;
 *   `onRecheck` asks who is signed in, when the service says it is someone else.
 */
export default function DraftComments({ slug, body: readBody, viewer, onLost, bodyKey, bridge, onDraftChange, onRecheck }) {
  const wide = useMedia(WIDE);
  const now = useNow(30_000);
  const [{ status, comments }, act, poll] = useThreads(slug, onLost, onDraftChange, viewer.owner ? null : viewer.username, onRecheck);
  const review = useReview(slug, viewer.owner);
  // Publishing: `failed` is the comment the service refused, if it named one;
  // `fits`, for a review too large to publish at once, the first of it that would go in.
  const [publishing, setPublishing] = useState({ busy: false, error: "", failed: null, done: 0, fits: null });
  // One the server has already as it is here, text and passage (a publish
  // whose answer was lost), is let go, and a publish that seemed to fail is
  // shown as the one that went in. One there with other text or another
  // passage (edited or moved after it was sent) is still to publish, as an
  // edit or an anchor: counted, though its card is the server's.
  const posted = useMemo(() => new Map(comments.map((c) => [c.id, c])), [comments]);
  const inAlready = useCallback((c) => publishedAsIs(c, posted.get(c.id)), [posted]);
  const waiting = useMemo(() => review.list.filter((c) => !inAlready(c)), [review.list, inAlready]);
  const pendingList = useMemo(() => waiting.filter((c) => !posted.has(c.id)), [waiting, posted]);
  useEffect(() => {
    const done = review.list.filter(inAlready);
    if (!done.length || review.publishing) return;
    review.drop(done);
    setPublishing((p) => (p.error ? { busy: false, error: "", failed: null, done: done.length, fits: null } : p));
  }, [review, inAlready]);
  const published = useMemo(() => toThreads(comments), [comments]);
  const threads = useMemo(() => [...published, ...pendingList.map(pendingThread)], [published, pendingList]);
  // His published threads whose passage he moved here, the move refused, or
  // kept for other text than the one shown and not found in it (one found
  // is kept for it, below). Each card says so, and keeps the published
  // passage or has it chosen again in the text shown.
  const held = useMemo(
    () => new Set(waiting.filter((c) => movedHere(c, posted.get(c.id)) && (c.id === publishing.failed || (!bridge && bodyKey && c.base !== bodyKey))).map((c) => c.id)),
    [waiting, posted, publishing.failed, bridge, bodyKey],
  );
  // The element holding the draft's text: the article's, or the editor's.
  const editorDom = bridge?.dom;
  const body = useMemo(() => (bridge ? { current: editorDom } : readBody), [bridge, editorDom, readBody]);
  // After the editor saves new anchors, they are fetched at once.
  useEffect(() => bridge?.onAnchorsSaved(() => poll(true)), [bridge, poll]);
  const follow = useFollow(slug, bridge, review, viewer.owner);

  const [showResolved, setShowResolved] = useState(false);
  const [active, setActive] = useState(null); // a thread's id, "new" or "general"
  const [hover, setHover] = useState(null); // the ids on a hovered passage or card
  // The passage a new thread is on: {quote, suggest, slot, blocked}. `slot`
  // is its words' (./typed.js), by the passage and the kind; `blocked` when
  // another passage was picked while this one held words.
  const [pending, setPending] = useState(null);
  const [sheet, setSheet] = useState(null); // {ids} | {all: true} | {compose: "new" | "general"}
  const [placing, setPlacing] = useState(null); // a held thread whose passage is being chosen again
  // Unsent words by slot (./typed.js), this person's on this draft, kept in
  // the browser. A box reads them only when it opens, so typing renders
  // nothing here.
  const unsent = useTyped(viewer, slug);
  // What Accept said on each card (./suggest.js acceptNotes), here and not
  // in the card, which is drawn afresh whenever it moves to another list.
  // Taking another card in hand, or none, lets it go: the card in hand is
  // `active` in the margin, the sheet's on a phone.
  const [notes, noteAccept] = useReducer(acceptNotes, new Map());
  const hand = (wide ? [active] : sheet?.ids || []).join(" ");
  useEffect(() => noteAccept({ type: "leave", keep: hand.split(" ") }), [hand]);

  const visible = useMemo(
    () => threads.filter((t) => showResolved || !t.resolved || t.id === active || held.has(t.id)),
    [threads, showResolved, active, held],
  );
  const items = useMemo(
    () => (pending ? [...visible, { id: "new", quote: pending.quote, find: pending.quote, resolved: null }] : visible),
    [visible, pending],
  );
  const read = useAnchors(bridge ? NOWHERE : readBody, bridge ? [] : items, bridge ? "editing" : bodyKey);
  const live = useEditorAnchors(bridge, threads, visible);
  const found = bridge ? live : read;
  // A pending passage an edit moved is kept where it is now, a moment after.
  useEffect(() => {
    const t = setTimeout(follow, 400);
    return () => clearTimeout(t);
  }, [follow, live]);
  // One kept for other text (saved since, or not saved then) is found again
  // in the text shown, and kept for it. One not found stays as it was.
  useEffect(() => {
    const root = readBody.current;
    if (bridge || !root || !bodyKey || review.publishing) return;
    const old = review.list.filter((c) => c.quote && c.base !== bodyKey);
    if (!old.length) return;
    const quotes = new Map();
    try {
      const index = indexText(root);
      for (const c of old) {
        const at = findWhole(index, c.quote);
        if (at) quotes.set(c.id, quoteAt(index, at));
      }
    } catch (err) {
      console.warn("comments: could not find the pending passages", err);
    }
    if (quotes.size) review.follow(quotes, bodyKey);
  }, [bridge, readBody, bodyKey, review]);
  const inText = visible.filter((t) => found.placed.has(t.id));
  // An accepted suggestion's words are not lost when its passage is not in
  // the text: they were changed by accepting it.
  const changed = visible.filter((t) => t.quote && !found.placed.has(t.id) && !t.root?.accepted);
  const acceptedAway = visible.filter((t) => t.quote && !found.placed.has(t.id) && t.root?.accepted);
  const general = visible.filter((t) => !t.quote);
  // A new passage is normally found where it was selected. If its words and
  // context are not unique enough to find, its card goes to the top.
  const showNew = Boolean(pending) && (found.placed.has("new") || found.settled);
  const open = published.filter((t) => !t.resolved).length;
  const resolvedCount = published.length - open;

  // Threads that were active and then vanished (deleted by someone else) let go.
  useEffect(() => {
    if (active && active !== "new" && active !== "general" && status === "ready" && !threads.some((t) => t.id === active)) setActive(null);
  }, [active, threads, status]);

  // `suggest`: a suggested edit, rather than a comment. A composer holding
  // words for another passage, open or closed, stays on its own and opens
  // instead, saying to send or cancel it first (./typed.js startPassage).
  const startNew = useCallback(
    (quote, suggest = false) => {
      window.getSelection()?.removeAllRanges();
      const target = passageSlot(suggest ? "suggest" : "comment", quote);
      const { slot, blocked } = startPassage(unsent, target, pending?.slot);
      if (blocked) {
        const kept = slot === pending?.slot ? pending : unsent.get(slot);
        setPending({ quote: kept.quote, suggest: slot === pending?.slot ? kept.suggest : kept.kind === "suggest", slot, blocked: true });
      } else setPending({ quote, suggest, slot });
      setActive("new");
      if (!wide) setSheet({ compose: "new" });
      else if (blocked) requestAnimationFrame(() => document.querySelector('[data-card="new"]')?.scrollIntoView({ block: "center", behavior: smoothly() }));
    },
    [wide, unsent, pending],
  );
  const suggestNew = useCallback((quote) => startNew(quote, true), [startNew]);
  const cancelNew = useCallback(() => {
    setPending(null);
    setActive((a) => (a === "new" || a === "general" ? null : a));
    setSheet((s) => (s?.compose ? null : s));
  }, []);

  // The box last typed in, open again when the page opens with its words
  // (./typed.js): a new thread's composer on its passage, a reply or an edit
  // on its card. On a phone, in the sheet. Once the comments are in, so a
  // reply's thread is there to open.
  const reopened = useRef(false);
  useEffect(() => {
    if (reopened.current || status === "loading") return;
    reopened.current = true;
    const slot = toReopen(unsent, (s) => s === "general" || s.startsWith("new:") || Boolean(threadOfSlot(threads, s)));
    if (!slot) return;
    if (slot === "general") {
      setActive("general");
      requestAnimationFrame(() => document.getElementById("draft-general")?.scrollIntoView({ block: "center" }));
    } else if (slot.startsWith("new:")) {
      const e = unsent.get(slot);
      setPending({ quote: e.quote, suggest: e.kind === "suggest", slot });
      setActive("new");
      if (!wide) setSheet({ compose: "new" });
    } else {
      const id = threadOfSlot(threads, slot);
      if (!wide) setSheet({ ids: [id] });
      else {
        setActive(id);
        requestAnimationFrame(() => document.getElementById(`thread-${id}`)?.scrollIntoView({ block: "center" }));
      }
    }
  }, [status, threads, unsent, wide]);

  // Across the width where the margin becomes a sheet, either way, what is
  // open stays open, with its passage and its words: a new thread's composer,
  // and a thread in hand with a reply or an edit in it.
  const layout = useRef({ wide, pending, active, sheet, threads });
  useEffect(() => {
    const was = layout.current;
    layout.current = { wide, pending, active, sheet, threads };
    if (was.wide === wide) return;
    if (!wide) {
      if (was.pending) setSheet({ compose: "new" });
      else if (was.active && was.active !== "general" && was.threads.some((t) => t.id === was.active)) setSheet({ ids: [was.active] });
      return;
    }
    const s = was.sheet;
    if (s?.compose === "general") setActive("general");
    else if (s?.ids?.length) {
      // The one typed in, of several on one passage.
      const typing = (id) => unsent.latest().some(([slot]) => threadOfSlot(threads, slot) === id);
      setActive(s.ids.find(typing) || s.ids[0]);
    }
    setSheet(null);
  }, [wide, pending, active, sheet, threads, unsent]);

  const startGeneral = useCallback(() => {
    setPending(null);
    if (!wide && sheet) {
      setSheet({ compose: "general" });
      return;
    }
    setSheet(null);
    flushSync(() => setActive("general"));
    document.getElementById("draft-general")?.scrollIntoView({ block: "center", behavior: smoothly() });
  }, [wide, sheet]);

  /** Makes a thread the active one and brings its passage into view. */
  const focusThread = useCallback(
    (id, { scroll = true } = {}) => {
      setActive(id);
      const el = found.marks.get(id)?.[0];
      if (!scroll || !el) return;
      const r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 80) el.scrollIntoView({ block: "center", behavior: smoothly() });
    },
    [found],
  );

  // Hovering and clicking a passage.
  useEffect(() => {
    const root = body.current;
    if (!root) return;
    const idsOf = (target) => target.closest?.("[data-threads]")?.dataset.threads.split(" ").filter((id) => id !== "new");
    const click = (e) => {
      const ids = idsOf(e.target);
      if (!ids?.length) return;
      // Editing on a phone, a tap is for the caret; the corner button has the threads.
      if (bridge && !wide) return;
      e.preventDefault();
      if (wide) focusThread(ids[0], { scroll: false });
      else setSheet({ ids });
    };
    const over = (e) => setHover(idsOf(e.target) || null);
    const out = (e) => !e.relatedTarget?.closest?.("[data-threads]") && setHover(null);
    root.addEventListener("click", click);
    root.addEventListener("mouseover", over);
    root.addEventListener("mouseout", out);
    return () => {
      root.removeEventListener("click", click);
      root.removeEventListener("mouseover", over);
      root.removeEventListener("mouseout", out);
    };
  }, [body, wide, focusThread, bridge]);

  // The active and hovered passages, emphasised. In the editor, by its
  // decorations: ProseMirror redraws its own elements.
  const activeIds = active ? found.groups.get(active) : null;
  useEffect(() => {
    if (bridge) bridge.emphasize(activeIds, hover);
  }, [bridge, activeIds, hover]);
  useEffect(() => {
    if (bridge) return;
    const on = [];
    const mark = (ids, cls) => {
      for (const el of ids ? found.marks.get(ids[0]) || [] : []) {
        el.classList.add(cls);
        on.push([el, cls]);
      }
    };
    mark(active && found.groups.get(active), "is-active");
    mark(hover, "is-hover");
    return () => on.forEach(([el, cls]) => el.classList.remove(cls));
  }, [active, hover, found, bridge]);

  // A click anywhere else lets an existing thread go; a comment being
  // written stays until it is sent or cancelled. Escape does the same.
  useEffect(() => {
    if (!active || active === "new" || active === "general") return;
    const away = (e) => {
      if (e.target.closest?.(".draft-card, [data-threads], .draft-sheet, .draft-select")) return;
      setActive(null);
    };
    const key = (e) => e.key === "Escape" && !typing(e.target) && setActive(null);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [active]);

  // A link to a thread (the push Ali gets carries one) opens it once it is in.
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current || status !== "ready") return;
    const id = /^#thread-([0-9a-f-]{36})$/i.exec(location.hash)?.[1];
    const t = id && threads.find((x) => x.id === id);
    if (!t) return;
    if (t.resolved && !showResolved) return setShowResolved(true);
    if (!found.settled) return; // its highlight is still being drawn
    arrived.current = true;
    if (!wide && found.placed.has(id)) setSheet({ ids: [id] });
    else focusThread(id);
    if (!found.placed.has(id)) requestAnimationFrame(() => document.getElementById(`thread-${id}`)?.scrollIntoView({ block: "center" }));
  }, [status, threads, found, wide, focusThread, showResolved]);

  // `only`: the ids of the first of a review too large to publish at once, sent alone.
  const publish = useCallback(async (only = null) => {
    if (!waiting.length) return;
    setPublishing({ busy: true, error: "", failed: null, done: 0, fits: null });
    try {
      // Each passage where it is now, first.
      await follow();
      const done = await review.publish({ posted, send: act.publish, edit: act.edit, anchor: act.anchor, refresh: act.list, only: only && new Set(only) });
      setPublishing({ busy: false, error: "", failed: null, done, fits: null });
    } catch (err) {
      const failed = err.data?.id ?? null;
      const fits = err.status === 413 && err.data?.fits?.length ? err.data.fits : null;
      setPublishing({ busy: false, error: err.message, failed, done: 0, fits });
      // The one refused is brought into view, to be fixed.
      if (failed) {
        focusThread(failed);
        if (!wide && found.placed.has(failed)) setSheet({ ids: [failed] });
        if (!found.placed.has(failed)) requestAnimationFrame(() => document.getElementById(`thread-${failed}`)?.scrollIntoView({ block: "center" }));
      }
    }
  }, [act, review, waiting, posted, follow, focusThread, found, wide]);
  const settle = useCallback(() => setPublishing((p) => ({ ...p, done: 0 })), []);
  // An edit to the one refused takes its error away: the next publish says anew.
  const fixed = useCallback((id) => setPublishing((p) => (p.failed === id ? { ...p, error: "", failed: null } : p)), []);
  // A held one's way out: its move let go for the passage the server has now,
  // or its passage chosen again.
  const keep = useCallback(
    (id) => act.list().then((now) => review.keep(id, now.find((c) => c.id === id))).then(() => { fixed(id); poll(true); }),
    [act, review, fixed, poll],
  );
  const place = useCallback(
    (quote) => {
      const id = placing;
      setPlacing(null);
      window.getSelection()?.removeAllRanges();
      review.follow(new Map([[id, quote]]), bodyKey).then(() => fixed(id));
    },
    [placing, review, bodyKey, fixed],
  );
  useEffect(() => {
    if (placing && !held.has(placing)) setPlacing(null);
  }, [placing, held]);
  // The bar points at a card only when there is one marked.
  const marked = threads.some((t) => t.id === publishing.failed) ? publishing.failed : null;

  // Ali's Accept on a suggestion, through the draft as the server has it
  // (./accept.js). Not offered while he edits (`bridge`).
  const accept = useCallback(
    async (t) => {
      let mod;
      try {
        mod = await import("./accept");
      } catch {
        throw new Error("Accept couldn't load. Check your connection and try again.");
      }
      const target = mod.pageText({ slug, threads: published, request: act.request });
      const acceptedNow = (id) => act.list().then((list) => list.find((c) => c.id === id)?.accepted ?? null);
      try {
        await mod.acceptSuggestion({ t, target, acceptedNow });
      } finally {
        // The thread as the service has it now, accepted or not, and the draft saved with it.
        poll(true);
      }
    },
    [slug, published, act, poll],
  );

  const shared = { viewer, now, act, onLost, unsent, onAccept: viewer.owner ? accept : null, onNote: noteAccept, editing: !!bridge };
  const card = (t, extra = {}) => t.pending ? (
    <PendingThread
      key={t.id}
      t={t}
      viewer={viewer}
      review={review}
      act={act}
      unsent={unsent}
      error={publishing.failed === t.id ? publishing.error : ""}
      busy={publishing.busy || review.publishing}
      onFixed={fixed}
      long={found.long?.get(t.id)}
      active={active === t.id}
      related={(found.groups.get(active) || []).includes(t.id) || (hover || []).includes(t.id)}
      onActivate={() => focusThread(t.id)}
      onHover={(on) => setHover(on ? found.groups.get(t.id) || [t.id] : null)}
      {...extra}
    />
  ) : (
    <Thread
      key={t.id}
      t={t}
      {...shared}
      note={acceptNote(notes, t)}
      active={active === t.id}
      related={(found.groups.get(active) || []).includes(t.id) || (hover || []).includes(t.id)}
      onActivate={() => focusThread(t.id)}
      onHover={(on) => setHover(on ? found.groups.get(t.id) || [t.id] : null)}
      onResolved={() => setActive((a) => (a === t.id ? null : a))}
      placed={found.placed.has(t.id)}
      long={found.long?.get(t.id)}
      failure={publishing.failed === t.id ? publishing.error : ""}
      move={
        held.has(t.id)
          ? {
              busy: publishing.busy || review.publishing,
              placing: placing === t.id,
              onKeep: () => keep(t.id),
              // Chosen by a selection in the page: not the editor's, which is for
              // formatting, nor behind a phone's sheet.
              onPlace: bridge || !wide ? null : () => setPlacing((p) => (p === t.id ? null : t.id)),
            }
          : null
      }
      {...extra}
    />
  );

  return (
    <>
      {wide && (
        <Margin
          body={body}
          found={found}
          active={active}
          order={[...inText.map((t) => t.id), ...(showNew ? ["new"] : [])]}
          toolbar={
            <Toolbar
              open={open}
              pending={waiting.length}
              resolved={resolvedCount}
              showResolved={showResolved}
              onShowResolved={setShowResolved}
              onGeneral={startGeneral}
              loading={status === "loading"}
              failed={status === "error"}
            />
          }
        >
          {inText.map((t) => card(t, { inMargin: true }))}
          {showNew && (
            // Keyed by its passage: words never stay in a box that moves to another.
            // A passage no longer in the text is quoted in it.
            <Composer key={pending.slot} id="new" slot={pending.slot} quote={pending.quote} suggest={pending.suggest} blocked={pending.blocked} showQuote={!found.placed.has("new")} act={act} review={viewer.owner ? review : null} base={bridge ? null : bodyKey} unsent={unsent} onDone={(c) => { setPending(null); setActive(c.id); }} onCancel={cancelNew} />
          )}
        </Margin>
      )}

      <section className="draft-after" aria-label="Comments on the whole draft">
        <div className="draft-after-head">
          <h2 className="font-display text-lg font-semibold text-bone">Comments on the whole draft</h2>
          {active !== "general" && (
            <button type="button" className="draft-text-button" onClick={startGeneral}>
              <MessageSquarePlus className="size-4" aria-hidden="true" /> Add one
            </button>
          )}
        </div>
        {active === "general" && (wide || !sheet) && (
          <div id="draft-general">
            <Composer id="general" slot="general" act={act} review={viewer.owner ? review : null} unsent={unsent} onDone={(c) => setActive(c.id)} onCancel={cancelNew} />
          </div>
        )}
        {general.length > 0 ? (
          <div className="draft-list">{general.map((t) => card(t))}</div>
        ) : (
          active !== "general" && <p className="draft-empty">None yet. Select words in the draft to comment on them.</p>
        )}
        {changed.length > 0 && (
          <>
            <h2 className="draft-after-title font-display text-lg font-semibold text-bone">On text that changed</h2>
            <p className="draft-empty">These passages were edited after the comment, so they are no longer highlighted.</p>
            <div className="draft-list">{changed.map((t) => card(t, { showQuote: true }))}</div>
          </>
        )}
        {acceptedAway.length > 0 && (
          <>
            <h2 className="draft-after-title font-display text-lg font-semibold text-bone">Accepted edits</h2>
            <p className="draft-empty">These suggestions were accepted, so the words they were on are no longer in the draft.</p>
            <div className="draft-list">{acceptedAway.map((t) => card(t, { showQuote: true }))}</div>
          </>
        )}
      </section>

      {!bridge && (
        <SelectButton
          body={body}
          onComment={placing ? place : startNew}
          // Ali edits the text himself, so suggesting is a reader's.
          onSuggest={placing || viewer.owner ? null : suggestNew}
          label={placing ? "Move here" : "Comment"}
        />
      )}

      {viewer.owner && (waiting.length > 0 || publishing.done > 0) &&
        createPortal(<ReviewBar count={waiting.length} {...publishing} fits={publishing.fits?.filter((id) => waiting.some((c) => c.id === id))} failed={marked} busy={publishing.busy || review.publishing} onPublish={() => publish()} onPublishFirst={() => publish(publishing.fits)} onSettled={settle} />, document.body)}

      {!wide &&
        createPortal(
          // Until the comments are in, no count: a failed load is not "none".
          <button
            type="button"
            className="draft-fab chamfer chamfer-sm"
            onClick={() => setSheet({ all: true })}
            aria-label={status === "error" ? "Comments couldn't load. Retrying." : status === "loading" ? "Comments: loading" : `Comments: ${open} open`}
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            {status === "error" ? <span>Couldn't load, retrying</span> : <span className="tabular-nums">{status === "loading" ? "…" : open}</span>}
          </button>,
          document.body,
        )}

      {!wide && sheet && (
        <Sheet
          title={sheet.compose ? (sheet.compose === "new" ? (pending?.suggest ? "Suggest an edit" : "New comment") : "Comment on the whole draft") : sheet.all ? "Comments" : sheetTitle(sheet.ids, threads)}
          onClose={() => (sheet.compose ? cancelNew() : setSheet(null))}
        >
          {sheet.compose === "new" && pending && (
            <Composer key={pending.slot} id="new" slot={pending.slot} quote={pending.quote} suggest={pending.suggest} blocked={pending.blocked} showQuote act={act} review={viewer.owner ? review : null} base={bridge ? null : bodyKey} unsent={unsent} onDone={(c) => { setPending(null); setActive(null); setSheet({ ids: [c.id] }); }} onCancel={cancelNew} />
          )}
          {sheet.compose === "general" && (
            <Composer id="general" slot="general" act={act} review={viewer.owner ? review : null} unsent={unsent} onDone={(c) => { setActive(null); setSheet({ ids: [c.id] }); }} onCancel={cancelNew} />
          )}
          {sheet.ids && (
            <div className="draft-list">
              {sheet.ids.map((id) => threads.find((t) => t.id === id)).filter(Boolean).map((t) => card(t, { showQuote: true, active: true }))}
              {sheet.ids.every((id) => !threads.some((t) => t.id === id)) && <p className="draft-empty">This thread was deleted.</p>}
            </div>
          )}
          {sheet.all && (
            <>
              <Toolbar open={open} pending={waiting.length} resolved={resolvedCount} showResolved={showResolved} onShowResolved={setShowResolved} onGeneral={startGeneral} loading={status === "loading"} failed={status === "error"} />
              {status === "ready" && visible.length === 0 && <p className="draft-empty">No comments yet. Select words in the draft to comment on them.</p>}
              <Group title="In the text" threads={inText} render={(t) => card(t, { showQuote: true, onActivate: () => setSheet({ ids: [t.id] }) })} />
              <Group title="On the whole draft" threads={general} render={(t) => card(t, { onActivate: () => setSheet({ ids: [t.id] }) })} />
              <Group title="On text that changed" threads={changed} render={(t) => card(t, { showQuote: true, onActivate: () => setSheet({ ids: [t.id] }) })} />
              <Group title="Accepted edits" threads={acceptedAway} render={(t) => card(t, { showQuote: true, onActivate: () => setSheet({ ids: [t.id] }) })} />
            </>
          )}
        </Sheet>
      )}
    </>
  );
}

/** A thread's sheet on a phone: a suggestion's is titled for one. */
function sheetTitle(ids, threads) {
  const shown = ids.map((id) => threads.find((t) => t.id === id)).filter(Boolean);
  return shown.length && shown.every((t) => t.quote && t.root?.suggestion != null) ? "Suggested edit" : "Comment";
}

const smoothly = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

function Group({ title, threads, render }) {
  if (!threads.length) return null;
  return (
    <>
      <h3 className="draft-group">{title}</h3>
      <div className="draft-list">{threads.map(render)}</div>
    </>
  );
}

function Toolbar({ open, pending, resolved, showResolved, onShowResolved, onGeneral, loading, failed }) {
  return (
    <div className="draft-toolbar">
      <p className="draft-count">
        {loading ? "Loading comments…" : failed ? "Comments couldn't load. Retrying." : `${open} open ${open === 1 ? "thread" : "threads"}`}
        {pending > 0 && <span className="draft-count-pending tabular-nums"> · {pending} pending</span>}
      </p>
      <div className="draft-toolbar-row">
        <label className="draft-switch">
          <input type="checkbox" checked={showResolved} onChange={(e) => onShowResolved(e.target.checked)} />
          Show resolved{resolved > 0 && <span className="tabular-nums"> ({resolved})</span>}
        </label>
        <button type="button" className="draft-text-button" onClick={onGeneral}>
          <MessageSquarePlus className="size-4" aria-hidden="true" /> On the whole draft
        </button>
      </div>
    </div>
  );
}

/**
 * The comments margin. Each card's place is worked out from its passage's
 * position after every render, and whenever the text or a card changes size.
 * Positions are written straight to the cards' style, so placing them never
 * renders anything again.
 */
function Margin({ body, found, active, order, toolbar, children }) {
  const margin = useRef(null);
  const bar = useRef(null);
  const place = useRef(() => {});

  place.current = () => {
    const m = margin.current;
    if (!m) return;
    const base = m.getBoundingClientRect().top;
    const floor = (bar.current?.offsetHeight || 0) + GAP * 2;
    const cards = order
      .map((id, i) => {
        const el = m.querySelector(`[data-card="${id}"]`);
        const mark = found.marks.get(id)?.[0];
        return el && { id, el, i, y: mark ? mark.getBoundingClientRect().top - base - 6 : floor, h: el.offsetHeight };
      })
      .filter(Boolean)
      .sort((a, b) => a.y - b.y || a.i - b.i);
    const top = new Array(cards.length);
    const at = cards.findIndex((c) => c.id === active);
    if (at === -1) {
      let bottom = floor - GAP;
      cards.forEach((c, i) => {
        top[i] = Math.max(c.y, bottom + GAP);
        bottom = top[i] + c.h;
      });
    } else {
      // Docs: the active card is exactly at its passage; the rest give way.
      top[at] = Math.max(cards[at].y, floor);
      for (let i = at - 1; i >= 0; i--) top[i] = Math.min(cards[i].y, top[i + 1] - GAP - cards[i].h);
      for (let i = at + 1; i < cards.length; i++) top[i] = Math.max(cards[i].y, top[i - 1] + cards[i - 1].h + GAP);
      // Anything pushed above the toolbar comes back down below it.
      for (let i = 0; i < cards.length; i++) top[i] = Math.max(top[i], i ? top[i - 1] + cards[i - 1].h + GAP : floor);
    }
    let end = 0;
    cards.forEach((c, i) => {
      c.el.style.transform = `translate(${c.id === active ? -14 : 0}px, ${top[i]}px)`;
      end = Math.max(end, top[i] + c.h);
    });
    m.style.height = `${end}px`;
    // Placed once without motion; after that, cards glide to new places.
    requestAnimationFrame(() => m.classList.add("is-placed"));
  };

  useLayoutEffect(() => place.current());

  useEffect(() => {
    let frame = 0;
    const soon = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place.current());
    };
    const ro = new ResizeObserver(soon);
    if (body.current) ro.observe(body.current);
    if (margin.current) for (const el of margin.current.querySelectorAll("[data-card]")) ro.observe(el);
    window.addEventListener("resize", soon);
    document.fonts?.ready.then(soon);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", soon);
    };
  });

  return (
    <aside ref={margin} className="draft-margin" aria-label="Comments">
      <div ref={bar}>{toolbar}</div>
      {children}
    </aside>
  );
}

/** One thread: its first comment, its replies, and a box to reply. */
function Thread({ t, viewer, now, act, unsent, onAccept, editing, note, onNote, active, related, onActivate, onHover, onResolved, showQuote, inMargin, placed, long, failure, move }) {
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const resolved = t.resolved;
  // A suggested edit's new words, "" to delete the passage; null for a comment.
  const suggestion = t.quote ? (t.root.suggestion ?? null) : null;
  const accepted = t.root.accepted;
  // In the margin a thread that is not in hand is a summary, as in Docs: the
  // first comment's opening lines and a count of replies. A long card would
  // otherwise push every card below it away from its passage.
  const compact = inMargin && !active;
  const replies = t.replies.length;
  // Accept, or word to press Done first while he edits (./suggest.js).
  const offer = onAccept ? acceptOffered({ accepted, resolved, clamped: compact, editing }) : null;

  async function run(p) {
    setError("");
    try {
      await p;
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <article
      id={`thread-${t.id}`}
      data-card={t.id}
      className={`draft-card${failure ? " is-failed" : ""}${active ? " is-active" : ""}${related && !active ? " is-related" : ""}${resolved ? " is-resolved" : ""}`}
      onClick={(e) => !active && !e.target.closest("button, a, textarea") && onActivate()}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {/* Accepted says so itself, below. */}
      {resolved && !accepted && (
        <p className="draft-resolved">
          <Check className="size-3.5" aria-hidden="true" /> Resolved by {resolved.by}
        </p>
      )}
      {/* A suggestion shows its passage as the words it changes, wherever it is listed. */}
      {suggestion != null ? (
        <Suggestion
          old={t.quote.exact}
          text={suggestion}
          accepted={accepted}
          clamp={compact}
          busy={accepting}
          finish={offer === "finish"}
          onAccept={
            offer === "accept"
              ? async () => {
                  setAccepting(true);
                  setError("");
                  onNote({ type: "press", id: t.id });
                  try {
                    await onAccept(t);
                    onResolved();
                  } catch (err) {
                    // Said above the card: this one may be gone by now.
                    onNote({ type: "fail", id: t.id, message: err.message });
                  }
                  setAccepting(false);
                }
              : null
          }
        />
      ) : (
        showQuote && t.quote && <blockquote className="draft-quote">{placed && t.find ? t.find.exact : t.quote.exact}</blockquote>
      )}
      {/* Its passage was edited: what the reader first commented on. In the
          list of changed passages, that is the quote above already. */}
      {suggestion == null && t.quote && t.find && t.find !== t.quote && t.find.exact !== t.quote.exact && (placed || !showQuote) && (
        <p className="draft-original">
          <span>Originally on:</span> {t.quote.exact}
        </p>
      )}
      <Comment c={t.root} now={now} viewer={viewer} act={act} unsent={unsent} onError={setError} clamp={compact} onMore={onActivate}>
        {resolved ? (
          <button type="button" className="draft-text-button" onClick={() => run(act.resolve(t.id, false))}>
            Reopen
          </button>
        ) : (
          <button
            type="button"
            className="draft-icon-button"
            title="Resolve"
            aria-label="Resolve this thread"
            // Resolving lets the thread go, so it hides at once, as in Docs.
            // One resolved by someone else stays while it is in hand.
            onClick={() => run(act.resolve(t.id, true).then(onResolved))}
          >
            <Check className="size-4" aria-hidden="true" />
          </button>
        )}
      </Comment>
      {compact
        ? replies > 0 && (
            <button type="button" className="draft-more" onClick={onActivate}>
              {replies} {replies === 1 ? "reply" : "replies"}
            </button>
          )
        : t.replies.map((r) => <Comment key={r.id} c={r} now={now} viewer={viewer} act={act} unsent={unsent} onError={setError} reply />)}
      {/* His move of its passage, held: what the server has is kept, or the
          passage is chosen again. */}
      {move && (
        <div className="draft-held">
          <p>
            <span className="draft-badge">Pending</span> You moved this comment to a passage that isn't in the draft as saved now.
          </p>
          <p className="draft-held-actions">
            <button type="button" onClick={() => run(move.onKeep())} disabled={move.busy}>
              Keep the published passage
            </button>
            {move.onPlace && (
              <button type="button" onClick={move.onPlace} disabled={move.busy}>
                {move.placing ? "Cancel" : "Choose the passage again"}
              </button>
            )}
          </p>
          {move.placing && (
            <p className="draft-left" role="status">
              Select the words it is on now, then press Move here.
            </p>
          )}
        </div>
      )}
      <TooLong characters={long} />
      {(error || note || failure) && (
        <p role="alert" className="private-error">
          {error || note || failure}
          {!error && note && (
            <>
              {" "}
              <button type="button" className="draft-text-button" onClick={() => onNote({ type: "dismiss", id: t.id })}>
                Dismiss
              </button>
            </>
          )}
        </p>
      )}
      {!compact && <ReplyBox thread={t.id} act={act} unsent={unsent} active={active} onActivate={onActivate} />}
    </article>
  );
}

/**
 * A suggested edit on its card: the words it takes out struck through and
 * the words it puts in marked as added, between the passage's words that
 * stay (./suggest.js). In the margin, a thread not in hand shows its opening
 * lines. Ali's has Accept while it is open and shows the whole change
 * (`onAccept`, ./suggest.js acceptOffered), and in its place, while he
 * edits, word to press Done first (`finish`).
 */
function Suggestion({ old, text, accepted, clamp, busy, finish, onAccept }) {
  const { lead, removed, added, tail } = suggestionParts(old, text);
  return (
    <div className="draft-suggestion">
      <p className="draft-suggest-head">
        <span>
          {accepted ? (
            <>
              <Check className="size-3.5" aria-hidden="true" /> Accepted
            </>
          ) : (
            "Suggested edit"
          )}
        </span>
        {onAccept && (
          <button type="button" className="draft-text-button" onClick={onAccept} disabled={busy}>
            <Check className="size-4" aria-hidden="true" /> {busy ? "Accepting…" : "Accept"}
          </button>
        )}
        {finish && <span>Press Done to accept it</span>}
      </p>
      <p className={`draft-suggest${clamp ? " is-clamped" : ""}`}>
        {lead}
        {removed && (
          <del>
            <span className="sr-only">Delete: </span>
            {removed}
          </del>
        )}
        {added && (
          <ins>
            <span className="sr-only">Add: </span>
            {added}
          </ins>
        )}
        {tail}
      </p>
    </div>
  );
}

/**
 * One of Ali's comments not published yet. Its passage is marked as his
 * other threads' are, with a dashed line; it has no replies or resolve, as
 * it is not on the service yet. While it is being published, from any tab, it is
 * left as it is: an edit open then waits, and is the published one's after.
 */
function PendingThread({ t, viewer, review, act, unsent, error, busy, onFixed, long, active, related, onActivate, onHover, showQuote, inMargin }) {
  const [problem, setProblem] = useState("");
  const c = t.pending;
  const comment = { id: c.id, author: { name: viewer.name, owner: true }, body: c.body, created_at: new Date(c.at).toISOString(), mine: !busy };
  const local = useMemo(
    () => ({
      edit: async (id, body) => {
        // Published meanwhile: the edit is made to it there.
        if (!(await review.edit(id, body))) await act.edit(id, body);
        onFixed(id);
      },
      remove: (id) => review.remove([id]),
    }),
    [review, act, onFixed],
  );
  return (
    <article
      id={`thread-${t.id}`}
      data-card={t.id}
      className={`draft-card is-review${error ? " is-failed" : ""}${active ? " is-active" : ""}${related && !active ? " is-related" : ""}`}
      onClick={(e) => !active && !e.target.closest("button, a, textarea") && onActivate()}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {showQuote && t.quote && <blockquote className="draft-quote">{t.quote.exact}</blockquote>}
      <Comment c={comment} viewer={viewer} act={local} unsent={unsent} locked={busy} onError={setProblem} clamp={inMargin && !active} onMore={onActivate} pending />
      <TooLong characters={long} />
      {(error || problem) && (
        <p role="alert" className="private-error">
          {error || problem}
        </p>
      )}
    </article>
  );
}

/**
 * In the editor, on a card whose passage edits made longer than a comment
 * holds (`characters`, its length now): its new place is not saved, and
 * the comment keeps the one it had, until the passage is shortened.
 */
function TooLong({ characters }) {
  if (!characters) return null;
  return (
    <p className="draft-held" role="status">
      <span className="draft-badge">Too long</span> {grewTooLong(characters)}
    </p>
  );
}

/**
 * Ali's review, at the foot of the screen while it has comments: how many,
 * and the button that publishes them all. A publish that fails keeps every
 * one, says why, and is sent again from the same button. One too large to
 * publish at once (`fits`, the first of it that would go in) can also send
 * just those.
 */
function ReviewBar({ count, busy, error, failed, done, fits, onPublish, onPublishFirst, onSettled }) {
  // "Published", for a moment after the last of them is in.
  useEffect(() => {
    if (!done || count) return;
    const t = setTimeout(onSettled, 4000);
    return () => clearTimeout(t);
  }, [done, count, onSettled]);
  const n = (k) => `${k} ${k === 1 ? "comment" : "comments"}`;
  return (
    <section className="draft-review" aria-label="Your review">
      <p className="draft-review-text" role="status">
        {count ? (
          <>
            <b className="tabular-nums">{n(count)}</b> pending, kept in this browser until you publish.
          </>
        ) : (
          `Published ${n(done)}.`
        )}
      </p>
      {error && count > 0 && (
        <p role="alert" className="private-error">
          {failed ? `The comment marked in red couldn't go in: ${error}` : error} Every comment that didn't go in is still here.
        </p>
      )}
      {count > 0 && fits?.length > 0 && !busy && (
        <button type="button" className="draft-text-button draft-review-first" onClick={onPublishFirst}>
          Publish the first {n(fits.length)}
        </button>
      )}
      {count > 0 && (
        <button type="button" className="private-primary chamfer chamfer-sm" onClick={onPublish} disabled={busy}>
          <Send className="size-4" aria-hidden="true" /> {busy ? "Publishing…" : `Publish ${n(count)}`}
        </button>
      )}
    </section>
  );
}

function Comment({ c, now, viewer, act, unsent, locked, onError, reply, clamp, onMore, pending, children }) {
  // An edit not saved is open again when its comment is back: a pending
  // one's, once it is published, on the published card.
  const [editing, setEditing] = useState(() => Boolean(unsent?.has(`edit:${c.id}`)));
  const text = useRef(null);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const el = text.current;
    setCut(Boolean(clamp && el && el.scrollHeight > el.clientHeight + 1));
  }, [clamp, c.body]);
  const initial = (c.author.name.trim()[0] || "?").toUpperCase();
  // A pending comment is only ever his own, and left alone while it is published.
  const canDelete = c.mine || (viewer.owner && !pending);

  async function remove() {
    const what = pending ? "this pending comment" : reply ? "this reply" : "this comment and its replies";
    if (!window.confirm(`Delete ${what}?`)) return;
    try {
      await act.remove(c.id);
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <div className={`draft-comment${reply ? " is-reply" : ""}`}>
      <div className="draft-comment-head">
        <span className={`draft-avatar${c.author.owner ? " is-owner" : ""}`} aria-hidden="true">
          {initial}
        </span>
        <p className="draft-meta">
          <span className="draft-author">{c.author.name}</span>
          {pending ? (
            <span className="draft-badge">Pending</span>
          ) : (
            <time dateTime={c.created_at} title={new Date(c.created_at).toLocaleString()}>
              {ago(c.created_at, now)}
              {c.edited_at && " · edited"}
            </time>
          )}
        </p>
        {children}
      </div>
      {editing ? (
        <EditBox c={c} act={act} unsent={unsent} locked={locked} onDone={() => setEditing(false)} />
      ) : (
        <>
          {/* A suggestion's note may be empty. */}
          {c.body && (
            <p ref={text} className={`draft-body${clamp ? " is-clamped" : ""}`}>
              {c.body}
            </p>
          )}
          {clamp && cut && (
            <button type="button" className="draft-more" onClick={onMore}>
              See more
            </button>
          )}
        </>
      )}
      {!editing && (c.mine || canDelete) && (
        <p className="draft-actions">
          {c.mine && (
            <button type="button" onClick={() => setEditing(true)}>
              {c.suggestion != null && !c.body ? "Add a note" : "Edit"}
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={remove}>
              Delete
            </button>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * Box props that keep its unsent text in `unsent` (./typed.js) under `slot`,
 * with `fields` (a new thread's passage and kind). `fallback` is the text a
 * box opens with when nothing is kept: one kept empty opens empty.
 */
const kept = (unsent, slot, { fields = {}, fallback = "" } = {}) => ({
  initial: unsent.has(slot) ? (unsent.get(slot).body ?? fallback) : fallback,
  // Back to how it opened is nothing to keep; an edit emptied is something.
  onText: (body) => (body === fallback ? unsent.drop(slot) : unsent.set(slot, { ...fields, body })),
  onForget: () => unsent.drop(slot),
});

/**
 * A textarea that grows with what is typed, sends on Ctrl/Cmd+Enter.
 * `onText` hears every change, and `onForget` once it is sent or cancelled;
 * Escape closes without cancelling. While `held` (why, to show) it is not
 * sent and its text is left as it is; while `refused` (why, to show) it is
 * not sent, and its text can still be written. `optional`: it can be sent
 * empty. While it is sending, its text is read-only and it cannot be
 * cancelled or closed: what is sent is what it shows.
 */
function Box({ initial = "", placeholder, label, submit, onCancel, onText, onForget, autoFocus, sendLabel = "Comment", held, refused, optional, note }) {
  const [text, setText] = useState(initial);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const area = useRef(null);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);
  useEffect(() => {
    const el = area.current;
    if (!autoFocus || !el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, [autoFocus]);

  function change(value) {
    setText(value);
    onText?.(value);
  }

  async function send(e) {
    e?.preventDefault();
    if ((!text.trim() && !optional) || sending || held || refused) return;
    setSending(true);
    setError("");
    try {
      await submit(text);
      setText("");
      onForget?.();
    } catch (err) {
      setError(err.message);
      area.current?.focus();
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="draft-box" onSubmit={send}>
      <textarea
        ref={area}
        rows={1}
        value={text}
        maxLength={LIMIT.body}
        placeholder={placeholder}
        aria-label={label}
        readOnly={Boolean(held) || sending}
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e);
          if (e.key === "Escape" && !sending) onCancel?.();
        }}
      />
      {note && (
        <p className="draft-left" role="status">
          {note}
        </p>
      )}
      <Left length={text.length} most={LIMIT.body} />
      {held && (
        <p className="draft-left" role="status">
          {held}
        </p>
      )}
      {refused && (
        <p role="alert" className="private-error">
          {refused}
        </p>
      )}
      {error && (
        <p role="alert" className="private-error">
          {error}
        </p>
      )}
      <div className="draft-box-buttons">
        <button type="submit" className="private-primary chamfer chamfer-sm" disabled={sending || (!text.trim() && !optional) || Boolean(held) || Boolean(refused)}>
          {sending ? "Sending…" : sendLabel}
        </button>
        {onCancel && (
          <button type="button" className="draft-text-button" disabled={sending} onClick={() => { onForget?.(); onCancel(); }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/** Its text not saved yet is kept in `unsent`, as "edit:<id>", until it is saved or cancelled; emptied, it is kept empty. */
function EditBox({ c, act, unsent, locked, onDone }) {
  const keep = unsent ? kept(unsent, `edit:${c.id}`, { fallback: c.body }) : { initial: c.body };
  // A suggestion's note, which may be left empty.
  const note = c.suggestion != null;
  return (
    <Box
      initial={keep.initial}
      onText={keep.onText}
      onForget={keep.onForget}
      held={locked && "Publishing. Save once it's in."}
      optional={note}
      placeholder={note ? "Add a note (optional)" : undefined}
      label={note ? "Edit your note" : "Edit your comment"}
      sendLabel="Save"
      autoFocus
      submit={async (text) => {
        await act.edit(c.id, text);
        onDone();
      }}
      onCancel={onDone}
    />
  );
}

/** "Reply" until the thread is active, then a box. */
function ReplyBox({ thread, act, unsent, active, onActivate }) {
  if (!active) {
    return (
      <button type="button" className="draft-reply-ghost" onClick={onActivate}>
        Reply
      </button>
    );
  }
  const slot = `reply:${thread}`;
  return <Box {...kept(unsent, slot)} placeholder="Reply" label="Reply" sendLabel="Reply" submit={(text) => sendTyped(unsent, slot, { body: text, thread }, act.create)} />;
}

/**
 * The card a new thread is written in, focused as soon as it opens. Ali's
 * goes into his review (`review`), to be published with the rest, its
 * passage kept with `base`, the updated_at of the text it is in. A
 * reader's suggested edit (`suggest`) is written in SuggestComposer. Its
 * words are kept in `unsent` under `slot`, with the passage they are for.
 * `blocked`: another passage was picked while this one held words.
 */
const BLOCKED = "Send or cancel this first, then start another.";

function Composer({ id, slot, quote, suggest, blocked, showQuote, act, review, base, unsent, onDone, onCancel }) {
  if (suggest && quote) return <SuggestComposer id={id} slot={slot} quote={quote} blocked={blocked} showQuote={showQuote} act={act} unsent={unsent} onDone={onDone} onCancel={onCancel} />;
  return (
    <div data-card={id} className="draft-card is-active is-composer">
      {showQuote && quote && <blockquote className="draft-quote">{quote.exact}</blockquote>}
      <Box
        {...kept(unsent, slot, { fields: quote ? { kind: "comment", quote } : {} })}
        note={blocked ? BLOCKED : ""}
        autoFocus
        placeholder={quote ? "Comment on this passage" : "Comment on the whole draft"}
        label={quote ? "Comment on the selected passage" : "Comment on the whole draft"}
        sendLabel={review ? "Add to review" : undefined}
        refused={quote ? tooLong(quote) : ""}
        submit={async (text) => {
          const c = review
            ? review.add({ body: text, quote, base })
            : await sendTyped(unsent, slot, quote ? { body: text, quote: quote.exact, prefix: quote.prefix, suffix: quote.suffix } : { body: text }, act.create);
          onDone(c);
        }}
        onCancel={onCancel}
      />
    </div>
  );
}

/** A textarea that grows with what is typed. */
function Grow({ value, ...props }) {
  const area = useRef(null);
  useLayoutEffect(() => {
    const el = area.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={area} rows={1} value={value} {...props} />;
}

/**
 * The card a suggested edit is written in: the passage's words, ready to be
 * changed into what they should say, and a note, which may be left empty. So
 * may the words, which suggests deleting the passage. Words the same as the
 * passage's are not sent, and it says so. Both are kept unsent together, as
 * a comment is, under `slot`, this passage's: words emptied stay empty.
 */
function SuggestComposer({ id, slot, quote, blocked, showQuote, act, unsent, onDone, onCancel }) {
  const keptNow = unsent.get(slot);
  const [words, setWords] = useState(() => keptNow?.words ?? quote.exact);
  const [note, setNote] = useState(() => keptNow?.note ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const first = useRef(null);
  useEffect(() => {
    const el = first.current?.querySelector("textarea");
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const same = sameAsPassage(words, quote.exact);
  const refused = tooLong(quote);
  const forget = () => unsent.drop(slot);
  // Both kept as one; as it opened, nothing is kept.
  const keep = (w, n) => (w === quote.exact && n === "" ? forget() : unsent.set(slot, { kind: "suggest", quote, words: w, note: n }));

  async function send(e) {
    e?.preventDefault();
    if (sending || same || refused) return;
    setSending(true);
    setError("");
    try {
      const c = await sendTyped(unsent, slot, { quote: quote.exact, prefix: quote.prefix, suffix: quote.suffix, suggestion: words, body: note }, act.create);
      forget();
      onDone(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }
  const keys = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e);
    if (e.key === "Escape" && !sending) onCancel?.();
  };

  return (
    <div data-card={id} className="draft-card is-active is-composer">
      {showQuote && <blockquote className="draft-quote">{quote.exact}</blockquote>}
      <form ref={first} className="draft-box" onSubmit={send}>
        <p className="draft-suggest-head">Suggest an edit</p>
        <Grow
          value={words}
          maxLength={LIMIT.quote}
          aria-label="What the selected words should say"
          readOnly={sending}
          onChange={(e) => {
            setWords(e.target.value);
            keep(e.target.value, note);
          }}
          onKeyDown={keys}
        />
        {words.length >= LIMIT.quote && <p className="draft-left">{full("a suggestion", LIMIT.quote)}</p>}
        <Grow
          value={note}
          maxLength={LIMIT.body}
          placeholder="Add a note (optional)"
          aria-label="A note on your suggestion (optional)"
          readOnly={sending}
          onChange={(e) => {
            setNote(e.target.value);
            keep(words, e.target.value);
          }}
          onKeyDown={keys}
        />
        <Left length={note.length} most={LIMIT.body} />
        {!words.trim() && !refused && (
          <p className="draft-left" role="status">
            Sent like this, it suggests deleting the passage.
          </p>
        )}
        {same && !refused && (
          <p className="draft-left" role="status">
            Same words as the passage. Change them to suggest an edit.
          </p>
        )}
        {blocked && (
          <p className="draft-left" role="status">
            {BLOCKED}
          </p>
        )}
        {(refused || error) && (
          <p role="alert" className="private-error">
            {refused || error}
          </p>
        )}
        <div className="draft-box-buttons">
          <button type="submit" className="private-primary chamfer chamfer-sm" disabled={sending || same || Boolean(refused)}>
            {sending ? "Sending…" : "Suggest"}
          </button>
          <button type="button" className="draft-text-button" disabled={sending} onClick={() => { forget(); onCancel(); }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * A sheet from the bottom of a phone's screen, over a dimmed page. A modal
 * <dialog>: the page behind it is inert, so neither Tab nor a screen reader
 * can wander out of it, and Escape closes it.
 */
function Sheet({ title, onClose, children }) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  // Closed by its going away (the screen widened past it, say), not by the person: nothing to cancel.
  const going = useRef(false);
  // What it holds waits until it is open, so a composer inside can size
  // itself and take focus: a closed dialog is display: none.
  const [open, setOpen] = useState(false);
  // Once, when it opens: focus goes in, and back where it was when it closes.
  useLayoutEffect(() => {
    const el = dialog.current;
    const back = document.activeElement;
    el.showModal();
    el.querySelector(".draft-sheet-close")?.focus({ preventScroll: true });
    document.documentElement.classList.add("draft-sheet-open");
    setOpen(true);
    return () => {
      going.current = true;
      el.close();
      document.documentElement.classList.remove("draft-sheet-open");
      back?.focus?.({ preventScroll: true });
    };
  }, []);

  return createPortal(
    // The browser's Escape would close the dialog behind React's back, so it
    // closes the way the Close button does. If the browser closes it anyway,
    // the sheet goes too.
    <dialog
      ref={dialog}
      className="draft-sheet"
      aria-label={title}
      onCancel={(e) => { e.preventDefault(); close.current(); }}
      onClose={() => !going.current && close.current()}
    >
      {/* A tap outside closes it. Hidden from screen readers, which have the
          Close button and Escape. */}
      <div className="draft-sheet-backdrop" aria-hidden="true" onClick={onClose} />
      <div className="draft-sheet-panel">
        <div className="draft-sheet-head">
          <span className="draft-sheet-grip" aria-hidden="true" />
          <h2 className="font-display text-base font-semibold text-bone">{title}</h2>
          <button type="button" className="draft-sheet-close draft-icon-button" aria-label="Close" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="draft-sheet-body">{open && children}</div>
      </div>
    </dialog>,
    document.body,
  );
}

/**
 * "Comment", by a selection in the draft. Mouse: once the button is let go.
 * Touch: under the phone's own selection handles. Keyboard: Ctrl/Cmd + Alt +
 * M, Docs' shortcut, comments on whatever is selected. Selections in an
 * embed, the video or the comments themselves are not the draft's words and
 * get no button. With `onSuggest`, "Suggest edit" is beside it.
 */
function SelectButton({ body, onComment, onSuggest, label }) {
  const [pick, setPick] = useState(null);
  const current = useRef(null);
  const button = useRef(null);
  current.current = pick;

  useEffect(() => {
    let frame = 0;
    let hiding = 0;
    let dragging = false;
    const hide = () => {
      // Late, so a tap on the button still lands: on a phone the tap clears
      // the selection before the click arrives.
      clearTimeout(hiding);
      hiding = setTimeout(() => setPick(null), 250);
    };
    const read = () => {
      frame = 0;
      const root = body.current;
      const sel = window.getSelection();
      if (dragging || !root || !sel || sel.isCollapsed || !sel.rangeCount) return hide();
      const range = sel.getRangeAt(0);
      if (!quotable(root, range)) return hide();
      let q = null;
      try {
        // Whole, however long: a passage over the limit is refused in the
        // comment box, which says by how much, never cut short here.
        q = quoteFromRange(indexText(root), range, Infinity);
      } catch {
        // A selection the index cannot place. No button, nothing broken.
      }
      if (!q) return hide();
      const rects = [...range.getClientRects()].filter((r) => r.width > 0);
      const r = rects[rects.length - 1] ?? range.getBoundingClientRect();
      clearTimeout(hiding);
      setPick({ quote: q, top: r.bottom + window.scrollY, x: r.right + window.scrollX });
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    const down = (e) => {
      if (e.pointerType === "mouse" && !button.current?.contains(e.target)) dragging = true;
    };
    const up = () => {
      dragging = false;
      soon();
    };
    const key = (e) => {
      if (e.code === "KeyM" && e.altKey && (e.metaKey || e.ctrlKey)) {
        const p = current.current;
        if (!p) return;
        e.preventDefault();
        onComment(p.quote);
        setPick(null);
      } else if (e.key === "Escape" && current.current) {
        setPick(null);
      }
    };
    document.addEventListener("selectionchange", soon);
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", up);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", soon);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hiding);
      document.removeEventListener("selectionchange", soon);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", soon);
    };
  }, [body, onComment]);

  // Placed once drawn, before it is seen, by its width as drawn: the
  // buttons' width depends on their labels and the screen.
  useLayoutEffect(() => {
    const el = button.current;
    if (el && pick) el.style.left = `${selectLeft(pick.x, el.offsetWidth, document.documentElement.clientWidth, window.scrollX)}px`;
  });

  if (!pick) return null;
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  return createPortal(
    <div
      ref={button}
      className="draft-select-group"
      style={{ top: pick.top + 10 }}
      // Keeps the selection: a mouse press would otherwise clear it.
      onPointerDown={(e) => e.pointerType === "mouse" && e.preventDefault()}
    >
      <button
        type="button"
        className="draft-select chamfer chamfer-sm"
        aria-keyshortcuts={mac ? "Meta+Alt+M" : "Control+Alt+M"}
        onClick={() => {
          onComment(pick.quote);
          setPick(null);
        }}
      >
        <MessageSquarePlus className="size-4" aria-hidden="true" />
        {label}
        <kbd aria-hidden="true">{mac ? "⌘⌥M" : "Ctrl+Alt+M"}</kbd>
      </button>
      {onSuggest && (
        <button
          type="button"
          className="draft-select chamfer chamfer-sm"
          onClick={() => {
            onSuggest(pick.quote);
            setPick(null);
          }}
        >
          <PencilLine className="size-4" aria-hidden="true" />
          Suggest edit
        </button>
      )}
    </div>,
    document.body,
  );
}
