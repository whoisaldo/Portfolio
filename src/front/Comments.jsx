// src/front/Comments.jsx: the comments under a post, and quoting a passage.
//
// The comments live in the stats service (stats.aliyounes.dev), not here: the
// site is static on GitHub Pages and has nowhere to keep them. Its address is
// VITE_COMMENTS_API, set at build time in .github/workflows/deploy.yml. Unset,
// as in a fork or a plain `npm run dev`, there is no section at all.
//
// Nothing here is on the way to the post's first paint. The list is asked for
// once the browser is idle after it, or sooner if the reader scrolls near the
// section or arrived by a link to a comment. It cannot wait for the section
// to scroll into view, because a quote comment's highlight is in the text
// above it, where the reader is. If the request fails the post reads exactly
// the same and the section says so.
//
// A reader can select words in the post and press "Comment on this" (or C),
// which puts the passage in the form. Approved quote comments are found again
// in the text (./quotes.js) and highlighted, each linking to its comment and
// each comment linking back. Comments on overlapping passages share one
// highlight, which leads to the first of them, and each of them links to the
// others.
//
// Everything a reader wrote is rendered as text by React, never as HTML.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { MessageSquareQuote, X } from "lucide-react";
import { SectionLabel } from "./parts";
import { findQuote, groupQuotes, indexText, markQuote, quotable, quoteFromRange, unmark } from "./quotes";
import "./comments.css";

const API = (import.meta.env.VITE_COMMENTS_API || "").replace(/\/+$/, "");
// The same limits the stats service holds them to.
const LIMIT = { name: 60, body: 2000, quote: 500 };

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
// The rule src/lib/scroll.js keeps for the playground: a short hop is
// smooth, a long one just arrives. From a passage near the top of a post to
// the form under it, a smooth scroll runs for seconds.
function behaviour(el) {
  const far = Math.abs(el.getBoundingClientRect().top) > window.innerHeight * 3;
  return far || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
const typing = (el) => el?.closest?.("input, textarea, select, [contenteditable]") || el?.isContentEditable;

/** @param {{slug: string, body: React.RefObject<HTMLElement>}} props */
export default function Comments(props) {
  return API ? <Thread {...props} /> : null;
}

function Thread({ slug, body }) {
  const section = useRef(null);
  const [{ status, list }, load] = useComments(slug, section);
  const anchored = useHighlights(body, status === "ready" ? list : null);
  const form = useRef(null);
  const [draft, setDraft] = useState(null);
  const [sent, setSent] = useState(null);

  // A link to a comment or its passage lands before the comments exist, so
  // the browser has nothing to scroll to. Once they do, go there.
  useEffect(() => {
    if (status !== "ready") return;
    if (!/^#(comment|quote)-/.test(location.hash)) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "center" });
  }, [status]);

  const quote = useCallback((q) => {
    window.getSelection()?.removeAllRanges();
    // Rendered now, so the form is in its final place before it is scrolled
    // to, and focused inside the press so a phone opens its keyboard.
    flushSync(() => {
      setDraft(q);
      setSent(null);
    });
    const f = form.current;
    if (!f) return;
    f.scrollIntoView({ block: "center", behavior: behaviour(f) });
    f.elements.body.focus({ preventScroll: true });
  }, []);

  return (
    <section ref={section} aria-labelledby="comments-title" className="mt-16">
      <SectionLabel id="comments-title">
        Comments{status === "ready" && list.length > 0 && <span className="comments-count"> {list.length}</span>}
      </SectionLabel>

      {status === "loading" && <p className="mt-6 text-sm text-dim">Loading comments…</p>}
      {status === "error" && (
        <p className="mt-6 text-sm text-muted">
          Comments couldn't load right now. The post is all here.{" "}
          <button type="button" className="comments-retry" onClick={load}>
            Try again
          </button>
        </p>
      )}
      {status === "ready" && list.length === 0 && <p className="mt-6 text-sm text-dim">No comments yet.</p>}
      {status === "ready" && list.length > 0 && (
        <ol className="comments-list">
          {list.map((c) => {
            const passage = anchored.get(c.id);
            const also = passage ? list.filter((o) => o.id !== c.id && passage.includes(o.id)) : [];
            return <Comment key={c.id} comment={c} passage={passage?.[0]} also={also} />;
          })}
        </ol>
      )}

      {sent ? (
        <Sent name={sent} onAgain={() => setSent(null)} />
      ) : (
        <CommentForm
          ref={form}
          slug={slug}
          draft={draft}
          onDropQuote={() => setDraft(null)}
          onSent={(name) => {
            setDraft(null);
            setSent(name);
          }}
        />
      )}

      <QuoteButton body={body} onQuote={quote} />
    </section>
  );
}

/** Asks the stats service for the approved comments, once, when it is time to. */
function useComments(slug, section) {
  const [state, setState] = useState({ status: "idle", list: [] });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const res = await fetch(`${API}/api/comments?post=${encodeURIComponent(slug)}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { comments } = await res.json();
      setState({ status: "ready", list: Array.isArray(comments) ? comments : [] });
    } catch {
      setState({ status: "error", list: [] });
    }
  }, [slug]);

  useEffect(() => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      load();
    };
    if (/^#(comment|quote)-/.test(location.hash)) {
      start();
      return;
    }
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 3000 })
      : setTimeout(start, 1500);
    const near = new IntersectionObserver(([e]) => e.isIntersecting && start(), { rootMargin: "800px 0px" });
    if (section.current) near.observe(section.current);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
      near.disconnect();
    };
  }, [load, section]);

  return [state, load];
}

/**
 * Highlights each approved quote in the post. Returns, for each comment whose
 * passage was found, the ids of every comment sharing its highlight, the
 * first being the one the highlight is named for. The rest no longer match
 * the text and are listed without one.
 */
function useHighlights(body, list) {
  const [found, setFound] = useState(() => new Map());
  useLayoutEffect(() => {
    const root = body.current;
    if (!root || !list) return;
    const added = [];
    const passages = new Map();
    // A highlight is worth less than the post it sits in. Whatever goes wrong
    // placing one, the text stays readable and the comment is listed.
    const placed = [];
    try {
      const index = indexText(root);
      for (const c of list) {
        const at = c.quote && findQuote(index, c.quote);
        if (at) placed.push({ id: c.id, at });
      }
    } catch (err) {
      console.warn("comments: could not find the quotes", err);
    }
    const names = new Map(list.map((c) => [c.id, c.name]));
    for (const { at, ids } of groupQuotes(placed)) {
      try {
        // Re-read before every highlight: wrapping one splits text nodes. The
        // text itself does not change, so the positions found above hold.
        const label = ids.length > 1 ? `${ids.length} comments on this passage` : `Comment by ${names.get(ids[0])}`;
        const marks = markQuote(indexText(root), at, ids[0], label);
        if (marks.length) {
          added.push(...marks);
          for (const id of ids) passages.set(id, ids);
        }
      } catch (err) {
        console.warn("comments: could not highlight a quote", err);
      }
    }
    setFound(passages);
    return () => unmark(added);
  }, [body, list]);
  return found;
}

/**
 * @param {{comment: object, passage?: string, also: object[]}} props
 *   passage: the id the comment's highlight is named for, when it has one.
 *   also: the other comments on the same highlight.
 */
function Comment({ comment: c, passage, also }) {
  return (
    <li id={`comment-${c.id}`} className="comment">
      <p className="text-sm">
        <span className="comment-name">{c.name}</span>
        <span className="text-dim" aria-hidden="true">
          {" "}
          ·{" "}
        </span>
        <time className="text-dim tabular-nums" dateTime={c.created_at}>
          {dateFormat.format(new Date(c.created_at))}
        </time>
      </p>
      {c.quote && (
        <blockquote className="comment-quote">
          {passage ? (
            <a href={`#quote-${passage}`} title="Show this passage in the post">
              {c.quote.exact}
            </a>
          ) : (
            c.quote.exact
          )}
        </blockquote>
      )}
      {also.length > 0 && (
        <p className="comment-also">
          Also on this passage:{" "}
          {also.map((o, i) => (
            <React.Fragment key={o.id}>
              {i > 0 && ", "}
              <a href={`#comment-${o.id}`}>{o.name}</a>
            </React.Fragment>
          ))}
        </p>
      )}
      <p className="comment-body">{c.body}</p>
    </li>
  );
}

const CommentForm = React.forwardRef(function CommentForm({ slug, draft, onDropQuote, onSent }, ref) {
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [length, setLength] = useState(0);

  async function submit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const name = f.elements.name.value.trim();
    const text = f.elements.body.value.trim();
    const missing = {};
    if (!name) missing.name = "Add a name. Any name is fine.";
    if (!text) missing.body = "Write a comment first.";
    if (missing.name || missing.body) {
      setErrors(missing);
      f.elements[missing.name ? "name" : "body"].focus();
      return;
    }

    setSending(true);
    setErrors({});
    try {
      // text/plain, like the beacon, so the browser sends it without a
      // preflight round trip first.
      const res = await fetch(`${API}/api/comments`, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({
          post: slug,
          name,
          body: text,
          quote: draft?.exact,
          prefix: draft?.prefix,
          suffix: draft?.suffix,
          website: f.elements.website.value,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        f.reset();
        setLength(0);
        onSent(name);
        return;
      }
      if (res.status === 503) {
        setErrors({ form: "Comments are closed right now, so this one wasn't sent. Your text is still here." });
      } else if (data.field === "name" || data.field === "body") {
        setErrors({ [data.field]: data.error });
        f.elements[data.field].focus();
      } else {
        setErrors({ form: data.error || "Your comment didn't send. Try again in a minute." });
      }
    } catch {
      setErrors({ form: "Your comment didn't send. Check your connection and try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <form ref={ref} onSubmit={submit} noValidate className="comment-form" aria-labelledby="comment-form-title">
      <h3 id="comment-form-title" className="font-display text-base font-semibold text-bone">
        Leave a comment
      </h3>

      {draft && (
        <div className="comment-draft">
          <p className="text-sm text-dim">Commenting on</p>
          <blockquote className="comment-quote">
            {draft.exact}
            {draft.trimmed && "…"}
          </blockquote>
          <button type="button" className="comment-draft-drop" onClick={onDropQuote}>
            <X className="size-3.5" aria-hidden="true" /> Remove quote
          </button>
        </div>
      )}

      <div className="comment-field">
        <label htmlFor="comment-name">Name</label>
        <input
          id="comment-name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={LIMIT.name}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "comment-name-error" : undefined}
        />
        {errors.name && (
          <p id="comment-name-error" className="comment-error">
            {errors.name}
          </p>
        )}
      </div>

      <div className="comment-field">
        <label htmlFor="comment-body">Comment</label>
        <textarea
          id="comment-body"
          name="body"
          rows={5}
          maxLength={LIMIT.body}
          onChange={(e) => setLength(e.target.value.length)}
          aria-invalid={errors.body ? true : undefined}
          aria-describedby={errors.body ? "comment-body-error comment-body-count" : "comment-body-count"}
        />
        <p id="comment-body-count" className="comment-count" aria-live={length > LIMIT.body - 100 ? "polite" : "off"}>
          {length > LIMIT.body - 300 ? `${LIMIT.body - length} characters left` : ""}
        </p>
        {errors.body && (
          <p id="comment-body-error" className="comment-error">
            {errors.body}
          </p>
        )}
      </div>

      {/* For robots. A person never sees it, so anything typed here is not
          from one; the stats service drops the comment and says it worked. */}
      <div className="comment-hp" aria-hidden="true">
        <label htmlFor="comment-website">Website</label>
        <input id="comment-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {errors.form && (
        <p role="alert" className="comment-error mt-5">
          {errors.form}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="comment-submit chamfer chamfer-sm mt-5 inline-flex items-center gap-2.5 bg-volt px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-bone"
      >
        {sending ? "Sending…" : "Post comment"}
      </button>
    </form>
  );
});

function Sent({ name, onAgain }) {
  const box = useRef(null);
  // Focus follows the form that just disappeared, so a screen reader reads
  // this out and the keyboard is not dropped at the top of the page.
  useEffect(() => box.current?.focus(), []);
  return (
    <div ref={box} tabIndex={-1} role="status" className="comment-sent">
      <p className="font-semibold text-bone">Thanks, {name}. Your comment is waiting for approval.</p>
      <p className="mt-1 text-sm text-muted">I read every comment first. Once I approve it, it shows up here.</p>
      <button type="button" className="comments-retry mt-3" onClick={onAgain}>
        Write another
      </button>
    </div>
  );
}

/**
 * The button that appears under a selection in the post. Mouse: after the
 * button is released. Touch: under the phone's own selection handles, below
 * its copy menu. Keyboard: C quotes whatever is selected, and Escape hides it.
 */
function QuoteButton({ body, onQuote }) {
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
      const p = current.current;
      if (!p || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || typing(e.target)) return;
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        onQuote(p.quote);
        setPick(null);
      } else if (e.key === "Escape") {
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
  }, [body, onQuote]);

  if (!pick) return null;
  // Centred under the end of the selection, kept inside the screen.
  const width = button.current?.offsetWidth ?? 180;
  const min = window.scrollX + 8;
  const max = window.scrollX + document.documentElement.clientWidth - width - 8;
  const left = Math.max(min, Math.min(pick.x - width / 2, max));
  return createPortal(
    <button
      ref={button}
      type="button"
      className="quote-button chamfer chamfer-sm"
      style={{ top: pick.top + 10, left }}
      aria-keyshortcuts="c"
      // Keeps the selection: a mouse press would otherwise clear it.
      onPointerDown={(e) => e.pointerType === "mouse" && e.preventDefault()}
      onClick={() => {
        onQuote(pick.quote);
        setPick(null);
      }}
    >
      <MessageSquareQuote className="size-4" aria-hidden="true" />
      Comment on this
      <kbd aria-hidden="true">C</kbd>
    </button>,
    document.body,
  );
}
