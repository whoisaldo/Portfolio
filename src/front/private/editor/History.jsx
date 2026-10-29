// src/front/private/editor/History.jsx: a draft's version history, as Docs
// shows one.
//
// A chunk of its own, with the comparing (./versions.js and the `diff`
// library), loaded the first time Ali presses History (../owner.jsx).
//
// The whole screen: the version picked, read-only, in the post's own
// typography, and beside it every saved version, newest first and grouped
// by day, the current text on top. "Show changes" marks the words that
// differ from the current text. "Restore this version" saves anything not
// yet saved first, so it is in the history too, asks, and then puts the
// version in the editor as one undoable step (DraftEditor's restoreVersion).
// A restore deletes nothing: the comments stay, and any on words the version
// does not have are listed under "On text that changed".
//
// On a phone the list is the screen, and a version opens over it.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { ArchiveRestore, ArrowLeft, Bookmark } from "lucide-react";
import { ApiError, request } from "../api";
import { blockDiff, byDay, kindLabel, textBlocks, wordDiff } from "./versions";
import Modal from "./Modal";

const WIDE = "(min-width: 900px)";
// As the post's own date line has it (../posts.js), written out here so this
// chunk asks nothing of the public pages' chunks.
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatDate = (iso) => dateFormat.format(new Date(`${iso}T12:00:00`));
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const when = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
const count = new Intl.NumberFormat("en-US");

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

/**
 * @param {{slug: string, rewrite: (html: string) => string, editing: boolean, onClose: () => void,
 *   actions: {flush: () => Promise<boolean>, current: () => object, saveVersion: () => Promise<boolean>,
 *   restore: (version: object) => Promise<boolean> | boolean}}} props
 */
export default function History({ slug, rewrite, actions, editing, onClose }) {
  const act = useRef(actions);
  act.current = actions;
  const wide = useMedia(WIDE);
  const [list, setList] = useState({ status: "loading", revisions: [] });
  const [current, setCurrent] = useState(() => actions.current());
  const [picked, setPicked] = useState("current");
  const [versions, setVersions] = useState({}); // id -> revision, "loading" or "error"
  const [changes, setChanges] = useState(false);
  const [asking, setAsking] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [pane, setPane] = useState("list");

  // What the editor has not saved yet goes in first, so the list ends with it.
  const load = useCallback(async () => {
    setList((l) => ({ ...l, status: l.revisions.length ? "ready" : "loading" }));
    try {
      await act.current.flush().catch(() => false);
      setCurrent(act.current.current());
      const { data } = await request(`/api/drafts?slug=${encodeURIComponent(slug)}&history=1`);
      setList({ status: "ready", revisions: data.revisions });
    } catch {
      setList((l) => ({ ...l, status: "error" }));
    }
  }, [slug]);
  useEffect(() => {
    load();
  }, [load]);

  const open = useCallback(
    async (id) => {
      setPicked(id);
      setMessage("");
      setPane("version");
      if (id === "current" || typeof versions[id] === "object") return;
      setVersions((v) => ({ ...v, [id]: "loading" }));
      try {
        const { data } = await request(`/api/drafts?slug=${encodeURIComponent(slug)}&revision=${id}`);
        setVersions((v) => ({ ...v, [id]: data.revision }));
      } catch {
        setVersions((v) => ({ ...v, [id]: "error" }));
      }
    },
    [slug, versions],
  );

  // The newest revision is the current text when it was the last save.
  const revisions = list.revisions;
  const top = revisions[0]?.at === current.updated_at ? revisions[0] : null;
  const rest = top ? revisions.slice(1) : revisions;
  const days = byDay(rest);

  const version = picked === "current" ? null : versions[picked];
  const ready = typeof version === "object" && version !== null;
  const meta = revisions.find((r) => r.id === picked);

  const saveVersion = async () => {
    setBusy("save");
    setMessage("");
    try {
      const ok = await act.current.saveVersion();
      if (!ok) setMessage("The version wasn't saved. Check the editor's save status and try again.");
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError && err.status === 409 ? "This draft was saved somewhere else. Close the history and reload to see the latest." : err.message);
    } finally {
      setBusy("");
    }
  };

  const askRestore = async () => {
    setMessage("");
    setBusy("restore");
    const saved = await act.current.flush().catch(() => false);
    setBusy("");
    if (!saved) {
      setMessage("Your latest changes aren't saved yet, so they wouldn't be in the history. Try again once the editor says Saved.");
      return;
    }
    setAsking(version);
  };
  const restore = async () => {
    const v = asking;
    setAsking(null);
    setBusy("restore");
    await act.current.restore(v);
    setBusy("");
    onClose();
  };

  const list_ = (
    <aside className="history-list" aria-label="Versions">
      <button type="button" className="history-save" onClick={saveVersion} disabled={Boolean(busy)}>
        <Bookmark className="size-3.5" aria-hidden="true" /> {busy === "save" ? "Saving…" : "Save a version"}
      </button>
      <p className="history-hint">Edits close together are kept as one version. Save one to keep this moment on its own.</p>
      {list.status === "error" && (
        <p className="history-hint" role="alert">
          The versions couldn't load.{" "}
          <button type="button" className="private-link" onClick={load}>
            Try again
          </button>
        </p>
      )}
      <ol className="history-days">
        <li>
          <ol>
            <Row id="current" picked={picked} onPick={open} title="Current version" at={current.updated_at} kind={top?.kind} words={top?.words} />
          </ol>
        </li>
        {list.status === "loading" && <li className="history-hint">Loading versions…</li>}
        {days.map((d) => (
          <li key={d.key}>
            <h3 className="history-day">{d.label}</h3>
            <ol>
              {d.items.map((r) => (
                <Row key={r.id} id={r.id} picked={picked} onPick={open} at={r.at} kind={r.kind} words={r.words} />
              ))}
            </ol>
          </li>
        ))}
        {list.status === "ready" && !revisions.length && <li className="history-hint">Versions are kept from the first save on.</li>}
      </ol>
    </aside>
  );

  const showing = picked === "current" ? current : ready ? version : null;
  const view = (
    <section className="history-view" aria-label="The version">
      {!wide && (
        <button type="button" className="history-back" onClick={() => setPane("list")}>
          <ArrowLeft className="size-3.5" aria-hidden="true" /> All versions
        </button>
      )}
      <div className="history-bar">
        <p className="history-which">
          {picked === "current" ? "Current version" : meta ? `${when.format(new Date(meta.at))} · ${kindLabel(meta.kind)}` : "A version"}
        </p>
        <label className={`draft-switch${picked === "current" ? " is-off" : ""}`}>
          <input type="checkbox" checked={changes && picked !== "current"} disabled={picked === "current" || !ready} onChange={(e) => setChanges(e.target.checked)} />
          Show changes
        </label>
        {picked !== "current" && (
          <button type="button" className="private-primary chamfer chamfer-sm history-restore" disabled={!ready || Boolean(busy)} onClick={askRestore}>
            <ArchiveRestore className="size-3.5" aria-hidden="true" /> {busy === "restore" ? "Saving first…" : "Restore this version"}
          </button>
        )}
      </div>
      {message && (
        <p className="private-notice" role="alert">
          {message}
        </p>
      )}
      <div className="history-page">
        {version === "loading" && <p className="history-hint">Loading the version…</p>}
        {version === "error" && <p className="history-hint">That version couldn't load. Pick it again to retry.</p>}
        {showing && <Version version={showing} current={current} rewrite={rewrite} changes={changes && picked !== "current"} />}
      </div>
    </section>
  );

  return (
    <Modal label="Version history" className="history" onClose={onClose}>
      <header className="history-head">
        <button type="button" className="history-close" onClick={onClose}>
          <ArrowLeft className="size-4" aria-hidden="true" /> {editing ? "Back to editing" : "Back to the draft"}
        </button>
        <h2 className="history-title">Version history</h2>
      </header>
      <div className="history-main">
        {(wide || pane === "version") && view}
        {(wide || pane === "list") && list_}
      </div>
      {asking && (
        <Modal label="Restore this version?" className="owner-ask" onClose={() => setAsking(null)}>
          <h2 className="owner-ask-title">Restore this version?</h2>
          <p>
            The text from {when.format(new Date(asking.at))} replaces what the draft says now. What it says now stays in the version history, and{" "}
            {mac ? "⌘Z" : "Ctrl+Z"} in the editor brings it straight back.
          </p>
          <p>Comments on text that isn't in that version are listed under "On text that changed". Nothing is deleted.</p>
          <div className="owner-ask-buttons">
            <button type="button" className="private-primary chamfer chamfer-sm" onClick={restore} autoFocus>
              Restore
            </button>
            <button type="button" className="draft-text-button" onClick={() => setAsking(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

/** The current version's time: today's as a time, another day's with its date. */
const stamp = (at) => (new Date(at).toDateString() === new Date().toDateString() ? time : short).format(new Date(at));
const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function Row({ id, picked, onPick, title, at, kind, words }) {
  const on = picked === id;
  return (
    <li>
      <button type="button" className={`history-row${on ? " is-on" : ""}`} aria-current={on ? "true" : undefined} onClick={() => onPick(id)}>
        <span className="history-time">{title || time.format(new Date(at))}</span>
        <span className="history-meta">{[title && at && stamp(at), kind && kindLabel(kind), words != null && `${count.format(words)} words`].filter(Boolean).join(" · ")}</span>
      </button>
    </li>
  );
}

/** A version as the post would show it, or its changes from the current text. */
function Version({ version, current, rewrite, changes }) {
  const html = useMemo(() => rewrite(marked.parse(version.body)), [version, rewrite]);
  const diff = useMemo(() => (changes ? blockDiff(textBlocks(rewrite(marked.parse(current.body))), textBlocks(html)) : null), [changes, current, html, rewrite]);
  const title = changes && version.title !== current.title ? <Words parts={wordDiff(current.title, version.title)} /> : version.title;
  const same = diff && diff.every((b) => b.change === "same") && version.title === current.title;
  return (
    <article>
      {changes && (
        <p className="history-legend">
          Compared with the current text: <ins>only in this version</ins> <del>only in the current text</del>
          {same && <span> · No differences in the text.</span>}
        </p>
      )}
      <h1 className="mt-8 font-display text-3xl font-semibold leading-tight text-bone text-balance sm:text-4xl">{title}</h1>
      <p className="mt-4 text-sm tabular-nums text-dim">
        <time dateTime={version.date}>{formatDate(version.date)}</time>
      </p>
      {diff ? <Changes blocks={diff} /> : <div className="post-body mt-10" dangerouslySetInnerHTML={{ __html: html }} />}
    </article>
  );
}

function Words({ parts }) {
  return parts.map((p, i) => (p.change === "added" ? <ins key={i}>{p.text}</ins> : p.change === "removed" ? <del key={i}>{p.text}</del> : <React.Fragment key={i}>{p.text}</React.Fragment>));
}

const TAGS = { h1: "h2", h2: "h2", h3: "h3", h4: "h4", h5: "h4", h6: "h4", p: "p", caption: "p", pre: "pre", quote: "blockquote" };

/** The compared blocks, drawn as the post's, a list's items in their list. */
function Changes({ blocks }) {
  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "li") {
      const items = [];
      while (blocks[i]?.type === "li" && blocks[i].list === b.list) items.push(blocks[i++]);
      i--;
      const List = b.list;
      out.push(
        <List key={i}>
          {items.map((it, j) => (
            <li key={j} className={`history-block is-${it.change}`}>
              <Content block={it} />
            </li>
          ))}
        </List>,
      );
      continue;
    }
    const Tag = b.type === "media" ? "p" : TAGS[b.type] || "p";
    out.push(
      <Tag key={i} className={`history-block is-${b.change}${b.type === "media" ? " history-media" : ""}${b.type === "caption" ? " history-caption" : ""}`}>
        <Content block={b} />
      </Tag>,
    );
  }
  return <div className="post-body history-changes mt-10">{out}</div>;
}

function Content({ block }) {
  const text = block.type === "media" ? `${block.label}${block.key ? `: ${block.key.split("/").pop()}` : ""}` : block.text;
  if (block.change === "changed") return <Words parts={block.parts} />;
  if (block.change === "added") return <ins>{text}</ins>;
  if (block.change === "removed") return <del>{text}</del>;
  return text;
}
