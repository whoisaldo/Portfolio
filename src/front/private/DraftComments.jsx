// src/front/private/DraftComments.jsx: comments on a private draft, the way
// Google Docs does them, in the site's own style.
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
// Nor is it lost by closing what it was typed in. A comment, a comment on
// the whole draft or a reply that was not sent is kept, and is back in its
// box when the box opens again. Only sending it or pressing Cancel lets it go.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { Check, MessageSquare, MessageSquarePlus, X } from "lucide-react";
import { findQuote, groupQuotes, indexText, markQuote, quotable, quoteFromRange, unmark } from "../quotes";
import { ApiError, request } from "./api";

// As in stats-api/lib/comments.js.
const LIMIT = { body: 2000, quote: 500 };
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
 * The draft's comments from stats-api, kept fresh, and the ways to change
 * them. A change is shown as soon as stats-api accepts it and then asked for
 * again, so what the page shows is always what everyone else sees.
 */
function useThreads(slug, onLost) {
  const [state, setState] = useState({ status: "loading", comments: [] });
  const version = useRef(null);
  const busy = useRef(false);

  const poll = useCallback(async (force = false) => {
    if (busy.current && !force) return;
    busy.current = true;
    try {
      const v = !force && version.current ? `&v=${encodeURIComponent(version.current)}` : "";
      const { status, data } = await request(`/api/draft-comments?draft=${encodeURIComponent(slug)}${v}`, { timeout: 10_000 });
      if (status === 204) return;
      version.current = data.v;
      setState({ status: "ready", comments: data.comments });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) onLost();
      else setState((s) => (s.status === "loading" ? { ...s, status: "error" } : s));
    } finally {
      busy.current = false;
    }
  }, [slug, onLost]);

  useEffect(() => {
    let timer = 0;
    let stopped = false;
    const tick = async () => {
      clearTimeout(timer);
      await poll();
      if (stopped) return;
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
      create: (fields) =>
        after(request("/api/draft-comments", { method: "POST", body: { draft: slug, ...fields } })).then(({ data }) => {
          merge(data.comment);
          return data.comment;
        }),
      edit: (id, body) =>
        after(request("/api/draft-comments", { method: "PATCH", body: { id, body } })).then(({ data }) => merge(data.comment)),
      resolve: (id, resolved) =>
        after(request("/api/draft-comments", { method: "PATCH", body: { id, resolved } })).then(({ data }) => merge(data.comment)),
      remove: (id) =>
        after(request(`/api/draft-comments?id=${encodeURIComponent(id)}`, { method: "DELETE" })).then(() =>
          setState((s) => ({ ...s, comments: s.comments.filter((c) => c.id !== id && c.thread !== id) })),
        ),
    };
  }, [slug, poll]);

  return [state, act];
}

const byTime = (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);

/** Comments into threads: each first comment with its replies, oldest first. */
function toThreads(comments) {
  const threads = new Map();
  for (const c of comments) if (!c.thread) threads.set(c.id, { id: c.id, root: c, replies: [], quote: c.quote, resolved: c.resolved });
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
function useAnchors(body, items) {
  const key = JSON.stringify(items.map((i) => [i.id, Boolean(i.resolved), i.quote?.exact, i.quote?.prefix, i.quote?.suffix]));
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
        const at = t.quote && findQuote(index, t.quote);
        if (at) placedAt.push({ id: t.id, at });
      }
    } catch (err) {
      console.warn("comments: could not find the passages", err);
    }
    const resolved = new Set(list.filter((t) => t.resolved).map((t) => t.id));
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

/** @param {{slug: string, body: React.RefObject<HTMLElement>, viewer: object, onLost: () => void}} props */
export default function DraftComments({ slug, body, viewer, onLost }) {
  const wide = useMedia(WIDE);
  const now = useNow(30_000);
  const [{ status, comments }, act] = useThreads(slug, onLost);
  const threads = useMemo(() => toThreads(comments), [comments]);

  const [showResolved, setShowResolved] = useState(false);
  const [active, setActive] = useState(null); // a thread's id, "new" or "general"
  const [hover, setHover] = useState(null); // the ids on a hovered passage or card
  const [pending, setPending] = useState(null); // the passage a new thread is on
  const [sheet, setSheet] = useState(null); // {ids} | {all: true} | {compose: "new" | "general"}
  // Unsent text by "new", "general" or a thread's id. A ref: a box reads it
  // only when it opens, so typing renders nothing here.
  const unsent = useRef(new Map()).current;

  const visible = useMemo(
    () => threads.filter((t) => showResolved || !t.resolved || t.id === active),
    [threads, showResolved, active],
  );
  const items = useMemo(
    () => (pending ? [...visible, { id: "new", quote: pending.quote, resolved: null }] : visible),
    [visible, pending],
  );
  const found = useAnchors(body, items);
  const inText = visible.filter((t) => found.placed.has(t.id));
  const changed = visible.filter((t) => t.quote && !found.placed.has(t.id));
  const general = visible.filter((t) => !t.quote);
  // A new passage is normally found where it was selected. If its words and
  // context are not unique enough to find, its card goes to the top.
  const showNew = Boolean(pending) && (found.placed.has("new") || found.settled);
  const open = threads.filter((t) => !t.resolved).length;
  const resolvedCount = threads.length - open;

  // Threads that were active and then vanished (deleted by someone else) let go.
  useEffect(() => {
    if (active && active !== "new" && active !== "general" && status === "ready" && !threads.some((t) => t.id === active)) setActive(null);
  }, [active, threads, status]);

  const startNew = useCallback(
    (quote) => {
      window.getSelection()?.removeAllRanges();
      setPending({ quote });
      setActive("new");
      if (!wide) setSheet({ compose: "new" });
    },
    [wide],
  );
  const cancelNew = useCallback(() => {
    setPending(null);
    setActive((a) => (a === "new" || a === "general" ? null : a));
    setSheet((s) => (s?.compose ? null : s));
  }, []);

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
  }, [body, wide, focusThread]);

  // The active and hovered passages, emphasised.
  useEffect(() => {
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
  }, [active, hover, found]);

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

  const shared = { viewer, now, act, onLost, unsent };
  const card = (t, extra = {}) => (
    <Thread
      key={t.id}
      t={t}
      {...shared}
      active={active === t.id}
      related={(found.groups.get(active) || []).includes(t.id) || (hover || []).includes(t.id)}
      onActivate={() => focusThread(t.id)}
      onHover={(on) => setHover(on ? found.groups.get(t.id) || [t.id] : null)}
      onResolved={() => setActive((a) => (a === t.id ? null : a))}
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
              resolved={resolvedCount}
              showResolved={showResolved}
              onShowResolved={setShowResolved}
              onGeneral={startGeneral}
              loading={status === "loading"}
              failed={status === "error"}
            />
          }
        >
          {inText.map((t) => card(t))}
          {showNew && (
            <Composer key="new" id="new" quote={pending.quote} act={act} unsent={unsent} onDone={(c) => { setPending(null); setActive(c.id); }} onCancel={cancelNew} />
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
            <Composer id="general" act={act} unsent={unsent} onDone={(c) => setActive(c.id)} onCancel={cancelNew} />
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
      </section>

      <SelectButton body={body} onComment={startNew} />

      {!wide &&
        createPortal(
          <button type="button" className="draft-fab chamfer chamfer-sm" onClick={() => setSheet({ all: true })} aria-label={`Comments: ${open} open`}>
            <MessageSquare className="size-4" aria-hidden="true" />
            <span className="tabular-nums">{open}</span>
          </button>,
          document.body,
        )}

      {!wide && sheet && (
        <Sheet
          title={sheet.compose ? (sheet.compose === "new" ? "New comment" : "Comment on the whole draft") : sheet.all ? "Comments" : "Comment"}
          onClose={() => (sheet.compose ? cancelNew() : setSheet(null))}
        >
          {sheet.compose === "new" && pending && (
            <Composer id="new" quote={pending.quote} showQuote act={act} unsent={unsent} onDone={(c) => { setPending(null); setActive(null); setSheet({ ids: [c.id] }); }} onCancel={cancelNew} />
          )}
          {sheet.compose === "general" && (
            <Composer id="general" act={act} unsent={unsent} onDone={(c) => { setActive(null); setSheet({ ids: [c.id] }); }} onCancel={cancelNew} />
          )}
          {sheet.ids && (
            <div className="draft-list">
              {sheet.ids.map((id) => threads.find((t) => t.id === id)).filter(Boolean).map((t) => card(t, { showQuote: true, active: true }))}
              {sheet.ids.every((id) => !threads.some((t) => t.id === id)) && <p className="draft-empty">This thread was deleted.</p>}
            </div>
          )}
          {sheet.all && (
            <>
              <Toolbar open={open} resolved={resolvedCount} showResolved={showResolved} onShowResolved={setShowResolved} onGeneral={startGeneral} />
              {visible.length === 0 && <p className="draft-empty">No comments yet. Select words in the draft to comment on them.</p>}
              <Group title="In the text" threads={inText} render={(t) => card(t, { showQuote: true, onActivate: () => setSheet({ ids: [t.id] }) })} />
              <Group title="On the whole draft" threads={general} render={(t) => card(t, { onActivate: () => setSheet({ ids: [t.id] }) })} />
              <Group title="On text that changed" threads={changed} render={(t) => card(t, { showQuote: true, onActivate: () => setSheet({ ids: [t.id] }) })} />
            </>
          )}
        </Sheet>
      )}
    </>
  );
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

function Toolbar({ open, resolved, showResolved, onShowResolved, onGeneral, loading, failed }) {
  return (
    <div className="draft-toolbar">
      <p className="draft-count">
        {loading ? "Loading comments…" : failed ? "Comments couldn't load. Retrying." : `${open} open ${open === 1 ? "thread" : "threads"}`}
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
function Thread({ t, viewer, now, act, unsent, active, related, onActivate, onHover, onResolved, showQuote }) {
  const [error, setError] = useState("");
  const resolved = t.resolved;

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
      className={`draft-card${active ? " is-active" : ""}${related && !active ? " is-related" : ""}${resolved ? " is-resolved" : ""}`}
      onClick={(e) => !active && !e.target.closest("button, a, textarea") && onActivate()}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {resolved && (
        <p className="draft-resolved">
          <Check className="size-3.5" aria-hidden="true" /> Resolved by {resolved.by}
        </p>
      )}
      {showQuote && t.quote && <blockquote className="draft-quote">{t.quote.exact}</blockquote>}
      <Comment c={t.root} now={now} viewer={viewer} act={act} onError={setError}>
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
      {t.replies.map((r) => (
        <Comment key={r.id} c={r} now={now} viewer={viewer} act={act} onError={setError} reply />
      ))}
      {error && (
        <p role="alert" className="private-error">
          {error}
        </p>
      )}
      <ReplyBox thread={t.id} act={act} unsent={unsent} active={active} onActivate={onActivate} />
    </article>
  );
}

function Comment({ c, now, viewer, act, onError, reply, children }) {
  const [editing, setEditing] = useState(false);
  const initial = (c.author.name.trim()[0] || "?").toUpperCase();
  const canDelete = c.mine || viewer.owner;

  async function remove() {
    const what = reply ? "this reply" : "this comment and its replies";
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
          <time dateTime={c.created_at} title={new Date(c.created_at).toLocaleString()}>
            {ago(c.created_at, now)}
            {c.edited_at && " · edited"}
          </time>
        </p>
        {children}
      </div>
      {editing ? (
        <EditBox c={c} act={act} onDone={() => setEditing(false)} />
      ) : (
        <p className="draft-body">{c.body}</p>
      )}
      {!editing && (c.mine || canDelete) && (
        <p className="draft-actions">
          {c.mine && (
            <button type="button" onClick={() => setEditing(true)}>
              Edit
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

/** Box props that keep its unsent text in `unsent` under `key`. */
const kept = (unsent, key) => ({
  initial: unsent.get(key) || "",
  onText: (text) => (text ? unsent.set(key, text) : unsent.delete(key)),
});

/**
 * A textarea that grows with what is typed, sends on Ctrl/Cmd+Enter.
 * `onText` hears every change, and "" once it is sent or cancelled; Escape
 * closes without cancelling.
 */
function Box({ initial = "", placeholder, label, submit, onCancel, onText, autoFocus, sendLabel = "Comment" }) {
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
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await submit(text);
      change("");
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
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e);
          if (e.key === "Escape") onCancel?.();
        }}
      />
      {text.length > LIMIT.body - 200 && <p className="draft-left tabular-nums">{LIMIT.body - text.length} characters left</p>}
      {error && (
        <p role="alert" className="private-error">
          {error}
        </p>
      )}
      <div className="draft-box-buttons">
        <button type="submit" className="private-primary chamfer chamfer-sm" disabled={sending || !text.trim()}>
          {sending ? "Sending…" : sendLabel}
        </button>
        {onCancel && (
          <button type="button" className="draft-text-button" onClick={() => { onText?.(""); onCancel(); }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function EditBox({ c, act, onDone }) {
  return (
    <Box
      initial={c.body}
      label="Edit your comment"
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
  return <Box {...kept(unsent, thread)} placeholder="Reply" label="Reply" sendLabel="Reply" submit={(text) => act.create({ body: text, thread })} />;
}

/** The card a new thread is written in, focused as soon as it opens. */
function Composer({ id, quote, showQuote, act, unsent, onDone, onCancel }) {
  return (
    <div data-card={id} className="draft-card is-active is-composer">
      {showQuote && quote && <blockquote className="draft-quote">{quote.exact}</blockquote>}
      <Box
        {...kept(unsent, id)}
        autoFocus
        placeholder={quote ? "Comment on this passage" : "Comment on the whole draft"}
        label={quote ? "Comment on the selected passage" : "Comment on the whole draft"}
        submit={async (text) => {
          const c = await act.create(quote ? { body: text, quote: quote.exact, prefix: quote.prefix, suffix: quote.suffix } : { body: text });
          onDone(c);
        }}
        onCancel={onCancel}
      />
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
      onClose={() => close.current()}
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
 * get no button.
 */
function SelectButton({ body, onComment }) {
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
        q = quoteFromRange(indexText(root), range, LIMIT.quote);
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

  if (!pick) return null;
  const width = button.current?.offsetWidth ?? 130;
  const min = window.scrollX + 8;
  const max = window.scrollX + document.documentElement.clientWidth - width - 8;
  const left = Math.max(min, Math.min(pick.x - width / 2, max));
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  return createPortal(
    <button
      ref={button}
      type="button"
      className="draft-select chamfer chamfer-sm"
      style={{ top: pick.top + 10, left }}
      aria-keyshortcuts={mac ? "Meta+Alt+M" : "Control+Alt+M"}
      // Keeps the selection: a mouse press would otherwise clear it.
      onPointerDown={(e) => e.pointerType === "mouse" && e.preventDefault()}
      onClick={() => {
        onComment(pick.quote);
        setPick(null);
      }}
    >
      <MessageSquarePlus className="size-4" aria-hidden="true" />
      Comment
      <kbd aria-hidden="true">{mac ? "⌘⌥M" : "Ctrl+Alt+M"}</kbd>
    </button>,
    document.body,
  );
}
