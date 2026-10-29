// src/front/private/editor/DraftEditor.jsx: Ali editing a draft in place.
//
// A lazy chunk of its own, with TipTap and ProseMirror in it, loaded only
// when Ali presses Edit on a draft (../PrivateBlog.jsx). Readers never fetch
// it.
//
// The editor takes the article body's place, in the same column with the
// same `post-body` styles, so editing looks like the post. Its toolbar sits
// above the title and stays at the top of the screen; the title is typed in
// place, the date and summary under it. Both are portalled into slots the
// draft page leaves for them (`hosts`), so the page around stays the one the
// read view has, comments margin and all.
//
// Saving is Docs' autosave: 1.5 s after typing stops, and at once when the
// editor loses focus or the tab is hidden or closed. A save sends the whole
// draft with the `updated_at` it was based on; the server refuses one based
// on an older copy (409), and Ali chooses between the latest and his own. A
// save never replaces the document in the editor, so undo reaches back past
// it. Until a save is confirmed the draft is also kept in this browser
// (../unsaved.js). After each save, the comment passages whose words or
// context changed are sent to the server as their threads' anchors, so
// readers find them where they now are.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Suspense } from "react";
import { createPortal } from "react-dom";
import { Editor, Extension } from "@tiptap/core";
import { closeHistory, isHistoryTransaction } from "@tiptap/pm/history";
import { marked } from "marked";
import { Bold, Code, Highlighter, Italic, Link2, List, ListOrdered, Redo2, Undo2 } from "lucide-react";
import { ApiError, mediaUrl, request, uploadMedia } from "../api";
import { clearUnsaved, writeUnsaved } from "../unsaved";
import { embeds } from "../../embeds";
import { canEdit, fromMarkdown, toMarkdown } from "./markdown";
import { COLORS, extensions } from "./schema";
import { commentAnchors } from "./anchors";
import "./editor.css";

const WAIT = 1500;
const BACKOFF = [2000, 4000, 8000, 16_000, 30_000];
// keepalive requests are limited to 64 KB, body and all.
const KEEPALIVE = 60_000;
const PICTURES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };
const STATUS = { saved: "Saved", pending: "Saving…", saving: "Saving…", offline: "Offline, retrying", conflict: "Changed elsewhere" };

const sameDraft = (a, b) => a.title === b.title && a.date === b.date && a.summary === b.summary && a.body === b.body;
const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const keys = (k) => (mac ? k.replace("Mod+", "⌘").replace("Shift+", "⇧") : k.replace("Mod+", "Ctrl+"));

/** A name for an uploaded picture the draft does not have yet, as the server allows them. */
function mediaName(file, taken) {
  const ext = PICTURES[file.type];
  const stem =
    (file.name || "")
      .replace(/\.[^.]*$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^[^a-z0-9]+|[-.]+$/g, "")
      .slice(0, 60) || "picture";
  for (let n = 0; ; n++) {
    const name = `${stem}-${Date.now().toString(36)}${n ? `-${n}` : ""}.${ext}`;
    if (!taken.has(name)) {
      taken.add(name);
      return name;
    }
  }
}

/**
 * @param {{
 *   draft: object, rewrite: (html: string) => string, hosts: {head: Element | null, title: Element | null},
 *   restore: object | null, onBridge: (bridge: object | null) => void, onDone: (draft: object) => void,
 *   onLost: () => void, slot?: (session: object) => React.ReactNode,
 * }} props
 *   `restore` is an unsaved edit from this browser to start from; `slot`
 *   renders into the toolbar's free space with the editing session (see
 *   `session` below).
 */
export default function DraftEditor({ draft, rewrite, hosts, restore, onBridge, onDone, onLost, slot }) {
  const slug = draft.slug;
  const mount = useRef(null);
  const [editor, setEditor] = useState(null);
  const start = restore || draft;
  const [meta, setMeta] = useState({ title: start.title, date: start.date, summary: start.summary });
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const [status, setStatus] = useState({ state: restore ? "pending" : "saved" });
  const [conflict, setConflict] = useState(null);
  const [notice, setNotice] = useState("");
  const [uploads, setUploads] = useState(0);
  const [link, setLink] = useState(null); // {href, top, left} while the link box is open
  const [slots, setSlots] = useState([]);
  const [, setTick] = useState(0);

  // What the saving works with, outside React: changed on every keystroke.
  const s = useRef(null);
  if (!s.current) {
    s.current = {
      base: draft.updated_at,
      baseline: null, // the last copy the server confirmed, {title, date, summary, body}
      latest: draft, // the server's draft as of the last save
      keep: new WeakMap(),
      timer: 0,
      retry: 0,
      tries: 0,
      flight: null,
      again: false,
      anchorsDue: false,
      saved: new Set(),
      taken: new Set(draft.media || []),
      spots: new Set(),
      known: new Set(),
      conflict: null,
    };
  }

  const prefix = `/blog/${slug}/`;
  const tools = useMemo(() => {
    const base = mediaUrl(slug, "");
    return {
      show: (src) => (src?.startsWith(prefix) ? mediaUrl(slug, src.slice(prefix.length)) : src),
      // A pasted picture is the draft's if it is in the draft, by either of its addresses.
      own: (src) => (!src ? null : src.startsWith(prefix) ? src : src.startsWith(base) ? prefix + decodeURIComponent(src.slice(base.length)) : null),
      render: (source) => rewrite(marked.parse(source)),
    };
  }, [slug, prefix, rewrite]);

  const openLink = useRef(() => {});
  const serialize = useCallback(() => toMarkdown(s.current.editor.state.doc, { keep: s.current.keep }), []);
  const payload = useCallback(() => ({ ...metaRef.current, body: serialize() }), [serialize]);

  /** Each top-level block, remembered with the Markdown it came from. */
  const remember = useCallback((doc, raws) => {
    const keep = new WeakMap();
    doc.forEach((n, _, i) => {
      if (raws[i] != null) keep.set(n, raws[i]);
      if (n.type.name === "rawBlock") s.current.known.add(n.attrs.source);
    });
    s.current.keep = keep;
  }, []);

  const keepLocal = useCallback(() => {
    clearTimeout(s.current.local);
    s.current.local = setTimeout(() => {
      const p = payload();
      if (s.current.baseline && sameDraft(p, s.current.baseline)) clearUnsaved(slug);
      else writeUnsaved(slug, { ...p, base: s.current.base });
    }, 300);
  }, [payload, slug]);

  const sendAnchors = useCallback(async () => {
    const st = s.current;
    const changes = st.anchors.changes(st.anchors.quotes());
    st.anchorsDue = false;
    if (!changes.length) return;
    try {
      await request("/api/draft-comments?a=anchors", { method: "PUT", body: { draft: slug, anchors: changes } });
      st.anchors.sent(changes);
      for (const fn of st.saved) fn();
    } catch (err) {
      // Tried again with the next save, or on Done.
      st.anchorsDue = true;
      console.warn("comments: the passages' new places were not saved", err);
    }
  }, [slug]);

  // `kind` is the revision the save makes in the history: "manual" and
  // "restore" are kept as revisions of their own, and sent even when the
  // text is what the server has.
  const save = useCallback(
    async ({ keepalive = false, kind = "autosave" } = {}) => {
      const st = s.current;
      clearTimeout(st.timer);
      if (!st.editor || st.conflict) return;
      if (st.flight) {
        st.again = true;
        return st.flight;
      }
      const p = payload();
      if (kind === "autosave" && sameDraft(p, st.baseline)) {
        clearUnsaved(slug);
        setStatus({ state: "saved" });
        if (st.anchorsDue) await sendAnchors();
        return;
      }
      st.flight = (async () => {
        setStatus({ state: "saving" });
        try {
          const body = { slug, ...p, base: st.base, kind };
          const { data } = await request("/api/drafts", { method: "PUT", body, keepalive: keepalive && JSON.stringify(body).length < KEEPALIVE });
          st.base = data.draft.updated_at;
          st.baseline = p;
          st.latest = { ...st.latest, ...data.draft, ...p };
          st.tries = 0;
          // The anchors are for the text that was saved: if more was typed
          // meanwhile, the next save sends them.
          if (sameDraft(payload(), p)) {
            clearUnsaved(slug);
            setStatus({ state: "saved" });
            await sendAnchors();
          } else st.again = true;
        } catch (err) {
          if (!(err instanceof ApiError)) throw err;
          if (err.status === 409 && err.data?.draft) {
            st.conflict = err.data.draft;
            setConflict(err.data.draft);
            setStatus({ state: "conflict" });
          } else if (err.status === 0 || err.status >= 500 || err.status === 429) {
            setStatus({ state: "offline" });
            clearTimeout(st.retry);
            st.retry = setTimeout(() => save(), BACKOFF[Math.min(st.tries++, BACKOFF.length - 1)]);
          } else if (err.status === 404) {
            onLost();
          } else {
            setStatus({ state: "error", message: err.message, field: err.field });
          }
        } finally {
          st.flight = null;
          if (st.again) {
            st.again = false;
            st.timer = setTimeout(() => save(), 0);
          }
        }
      })();
      return st.flight;
    },
    [payload, slug, sendAnchors, onLost],
  );

  const changed = useCallback(() => {
    const st = s.current;
    keepLocal();
    if (st.conflict) return;
    setStatus((v) => (v.state === "saving" || v.state === "offline" ? v : { state: "pending" }));
    clearTimeout(st.timer);
    st.timer = setTimeout(() => save(), WAIT);
  }, [keepLocal, save]);

  // ---- the editor --------------------------------------------------------------

  useLayoutEffect(() => {
    const st = s.current;
    const { extension, handle } = commentAnchors();
    st.anchors = handle;
    const shortcuts = Extension.create({
      name: "draftShortcuts",
      addKeyboardShortcuts: () => ({
        "Mod-k": () => {
          openLink.current();
          return true;
        },
      }),
    });

    const upload = async (files, at) => {
      const pictures = files.filter((f) => PICTURES[f.type]);
      if (!pictures.length) {
        setNotice("Only JPG, PNG, WebP, AVIF and GIF pictures can be added.");
        return;
      }
      const spot = { pos: at };
      st.spots.add(spot);
      try {
        for (const file of pictures) {
          const name = mediaName(file, st.taken);
          setUploads((n) => n + 1);
          try {
            await uploadMedia(slug, name, file);
            st.editor
              ?.chain()
              .insertContentAt(spot.pos, { type: "image", attrs: { src: prefix + name, alt: "" } })
              .run();
            spot.pos = st.editor ? st.editor.state.selection.to : spot.pos;
          } catch (err) {
            setNotice(`A picture couldn't upload: ${err.message}`);
          } finally {
            setUploads((n) => n - 1);
          }
        }
      } finally {
        st.spots.delete(spot);
      }
    };
    const files = (list) => [...(list || [])].filter((f) => f.type.startsWith("image/"));

    const { doc, raws } = fromMarkdown(start.body);
    const ed = new Editor({
      element: mount.current,
      extensions: [...extensions({ ...tools, known: st.known }), extension, shortcuts],
      content: doc,
      editorProps: {
        attributes: { class: "post-body editor-body", "aria-label": "Draft text", spellcheck: "true" },
        handlePaste(view, event) {
          const pics = files(event.clipboardData?.files);
          if (!pics.length) return false;
          event.preventDefault();
          ed.commands.deleteSelection();
          upload(pics, view.state.selection.from);
          return true;
        },
        handleDrop(view, event, _slice, moved) {
          const pics = files(event.dataTransfer?.files);
          if (moved || !pics.length) return false;
          event.preventDefault();
          const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from;
          upload(pics, at);
          return true;
        },
      },
    });
    st.editor = ed;
    remember(ed.state.doc, restore ? [] : raws);
    // What the server has: for a restored edit, the server's own copy.
    st.baseline = restore ? { title: draft.title, date: draft.date, summary: draft.summary, body: draft.body } : { ...metaRef.current, body: toMarkdown(ed.state.doc, { keep: st.keep }) };

    let frame = 0;
    const onTransaction = ({ transaction }) => {
      for (const spot of st.spots) spot.pos = transaction.mapping.map(spot.pos);
      if (transaction.docChanged) changed();
      // Once the undone text is on screen, where the passages are looked for.
      if (transaction.docChanged && isHistoryTransaction(transaction)) queueMicrotask(() => st.anchors.findMissing());
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          setTick((t) => t + 1);
          const found = [...ed.view.dom.querySelectorAll("[data-embed]")];
          setSlots((prev) => (prev.length === found.length && prev.every((el, i) => el === found[i]) ? prev : found));
        });
    };
    const onBlur = () => save();
    ed.on("transaction", onTransaction);
    ed.on("blur", onBlur);
    setEditor(ed);
    setSlots([...ed.view.dom.querySelectorAll("[data-embed]")]);
    if (restore) changed();

    // The comments' handle on the passages (./anchors.js), and word of when
    // their new places are saved.
    handle.onAnchorsSaved = (fn) => {
      st.saved.add(fn);
      return () => st.saved.delete(fn);
    };
    onBridge(handle);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(st.timer);
      clearTimeout(st.retry);
      clearTimeout(st.local);
      ed.off("transaction", onTransaction);
      ed.off("blur", onBlur);
      onBridge(null);
      ed.destroy();
      st.editor = null;
    };
    // Made once for the life of this editing session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saved at once when the page is hidden or closed, as far as the browser lets.
  useEffect(() => {
    const hidden = () => document.visibilityState === "hidden" && save({ keepalive: true });
    const gone = () => save({ keepalive: true });
    const online = () => s.current.retry && save();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", gone);
    window.addEventListener("online", online);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", gone);
      window.removeEventListener("online", online);
    };
  }, [save]);

  const setField = (name, value) => {
    setMeta((m) => ({ ...m, [name]: value }));
    metaRef.current = { ...metaRef.current, [name]: value };
    changed();
  };

  /** Saves what is left, anchors too. True when the server has everything. */
  const flush = useCallback(async () => {
    await save();
    while (s.current.flight) await s.current.flight;
    if (s.current.anchorsDue) await sendAnchors();
    return !s.current.conflict && sameDraft(payload(), s.current.baseline) && !s.current.anchorsDue;
  }, [save, sendAnchors, payload]);

  /**
   * Puts a whole draft from the server in the editor: the latest, after a
   * conflict (and, later, a version from the history). Undo still reaches
   * what was there.
   */
  const replace = useCallback(
    (next) => {
      const st = s.current;
      if (!canEdit(next.body, (json) => st.editor.schema.nodeFromJSON(json)).ok) {
        setNotice("That version has formatting the editor can't keep exactly. Press Done to read it.");
        return false;
      }
      const { doc, raws } = fromMarkdown(next.body);
      clearTimeout(st.timer);
      st.conflict = null;
      st.base = next.updated_at;
      st.latest = { ...st.latest, ...next };
      st.editor.commands.setContent(doc, { emitUpdate: false });
      remember(st.editor.state.doc, raws);
      const m = { title: next.title, date: next.date, summary: next.summary };
      metaRef.current = m;
      setMeta(m);
      st.baseline = { ...m, body: serialize() };
      clearUnsaved(slug);
      setConflict(null);
      setStatus({ state: "saved" });
      st.anchors.reset();
      return true;
    },
    [remember, serialize, slug],
  );

  /**
   * Saves the text as it is now as a revision of its own, `kind` "manual"
   * (Save a version) or "restore". True once the server has it.
   */
  const saveAs = useCallback(
    async (kind) => {
      while (s.current.flight) await s.current.flight;
      await save({ kind });
      return !s.current.conflict && sameDraft(payload(), s.current.baseline);
    },
    [save, payload],
  );

  /**
   * Puts a version from the history in the editor and saves it as a
   * restore. The text is replaced in one step of its own in the undo
   * history, so Cmd+Z brings back what was there; the title, date and
   * summary are the version's too. The passages are then found again in the
   * new text, as after "Load the latest", and saved after the save as
   * usual. A thread whose words are not in it is not found, and is listed
   * under "On text that changed", its anchor kept as it was.
   */
  const restoreVersion = useCallback(
    async (version) => {
      const st = s.current;
      const ed = st.editor;
      if (!ed || st.conflict) return false;
      if (!canEdit(version.body, (json) => ed.schema.nodeFromJSON(json)).ok) {
        setNotice("That version has formatting the editor can't keep exactly, so it can't be restored here.");
        return false;
      }
      const { doc, raws } = fromMarkdown(version.body);
      const next = ed.schema.nodeFromJSON(doc);
      ed.view.dispatch(closeHistory(ed.state.tr.replaceWith(0, ed.state.doc.content.size, next.content)));
      // Each block as the version wrote it. Added to what is kept, not in
      // place of it, so an undo writes back the blocks it brings back as
      // they were written too.
      ed.state.doc.forEach((n, _, i) => {
        if (raws[i] != null) st.keep.set(n, raws[i]);
        if (n.type.name === "rawBlock") st.known.add(n.attrs.source);
      });
      const m = { title: version.title, date: version.date, summary: version.summary };
      metaRef.current = m;
      setMeta(m);
      st.anchors.reset();
      return saveAs("restore");
    },
    [saveAs],
  );

  const keepMine = () => {
    const st = s.current;
    st.base = st.conflict.updated_at;
    st.conflict = null;
    setConflict(null);
    setStatus({ state: "pending" });
    save();
  };
  const loadLatest = () => {
    if (!window.confirm("Discard your changes since the last save and load the latest version? Your saves so far stay in the version history.")) return;
    replace(s.current.conflict);
  };

  const [leaving, setLeaving] = useState(false);
  const done = async () => {
    setLeaving(true);
    const all = await flush().catch(() => false);
    setLeaving(false);
    if (!all && !window.confirm("Some changes aren't saved yet. They stay in this browser and will be offered next time you open this draft. Stop editing anyway?")) return;
    onDone({ ...s.current.latest, ...s.current.baseline });
  };

  // Everything the editing session offers to what goes in the toolbar's
  // free space, the History and Publish buttons (../owner.jsx).
  const session = { editor, slug, draft: () => ({ ...s.current.latest, ...s.current.baseline, updated_at: s.current.base }), payload, status, flush, replace, saveAs, restoreVersion };

  openLink.current = () => {
    const ed = s.current.editor;
    if (!ed) return;
    const { from } = ed.state.selection;
    const c = ed.view.coordsAtPos(from);
    setLink({ href: ed.getAttributes("link").href || "", top: c.bottom + window.scrollY + 8, left: c.left + window.scrollX });
  };

  // ---- what it looks like --------------------------------------------------------

  const state = status.state;
  const label = uploads ? "Uploading a picture…" : state === "error" ? `Not saved: ${status.message}` : STATUS[state];

  return (
    <>
      <div ref={mount} className="editor-mount" />
      {editor &&
        slots.map((el, i) => {
          const Embed = embeds[el.dataset.embed];
          return Embed
            ? createPortal(
                <Suspense fallback={null}>
                  <Embed />
                </Suspense>,
                el,
                `${el.dataset.embed}-${i}`,
              )
            : null;
        })}
      {editor && hosts.head && createPortal(
        <div className="editor-bar-wrap">
          <Toolbar editor={editor} label={label} state={state} leaving={leaving} onDone={done} onLink={() => openLink.current()}>
            {slot?.(session)}
          </Toolbar>
          {conflict && (
            <div className="editor-alert" role="alert">
              <p>This draft was saved somewhere else since you started.</p>
              <button type="button" className="draft-text-button" onClick={loadLatest}>
                Load the latest
              </button>
              <button type="button" className="draft-text-button" onClick={keepMine}>
                Keep mine
              </button>
            </div>
          )}
          {notice && (
            <div className="editor-alert" role="status">
              <p>{notice}</p>
              <button type="button" className="draft-text-button" onClick={() => setNotice("")}>
                OK
              </button>
            </div>
          )}
        </div>,
        hosts.head,
      )}
      {hosts.title &&
        createPortal(
          <Details meta={meta} minutes={draft.minutes} field={status.state === "error" ? status.field : null} onField={setField} onBlur={() => save()} onEnter={() => editor?.commands.focus("start")} />,
          hosts.title,
        )}
      {link && editor && <LinkBox at={link} editor={editor} onClose={() => setLink(null)} />}
    </>
  );
}

/** The title as the page shows it, typed in place, and the date and summary under it. */
function Details({ meta, minutes, field, onField, onBlur, onEnter }) {
  const title = useRef(null);
  useLayoutEffect(() => {
    const el = title.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [meta.title]);
  return (
    <>
      <textarea
        ref={title}
        rows={1}
        className={`editor-title mt-8 font-display text-3xl font-semibold leading-tight text-bone text-balance sm:text-4xl${field === "title" ? " is-wrong" : ""}`}
        value={meta.title}
        maxLength={200}
        aria-label="Title"
        placeholder="Title"
        // One line: a pasted line break becomes a space.
        onChange={(e) => onField("title", e.target.value.replace(/\s*\n\s*/g, " "))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
        onBlur={onBlur}
      />
      <div className="editor-details">
        <label className={field === "date" ? "is-wrong" : undefined}>
          <span>Date</span>
          <input type="date" value={meta.date} onChange={(e) => onField("date", e.target.value)} onBlur={onBlur} />
        </label>
        <span className="editor-minutes tabular-nums">{minutes} min read</span>
        <label className={`editor-summary${field === "summary" ? " is-wrong" : ""}`}>
          <span>Summary</span>
          <input type="text" value={meta.summary} maxLength={500} onChange={(e) => onField("summary", e.target.value.replace(/\s*\n\s*/g, " "))} onBlur={onBlur} />
        </label>
      </div>
    </>
  );
}

/** A toolbar button that leaves the editor's focus and selection where they are. */
function Tool({ label, keys: shortcut, active, disabled, onPress, children }) {
  return (
    <button
      type="button"
      className={`editor-tool${active ? " is-on" : ""}`}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={shortcut ? `${label} (${keys(shortcut)})` : label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, label, state, leaving, onDone, onLink, children }) {
  const run = () => editor.chain().focus();
  const level = [2, 3].find((l) => editor.isActive("heading", { level: l }));
  const style = level ? `h${level}` : editor.isActive("paragraph") ? "p" : "";
  // The colours open under their button, over the text.
  const [picking, setPicking] = useState(null); // {left} while open
  const last = editor.storage.highlight.last;
  const pick = (e) => {
    const bar = e.currentTarget.closest(".editor-bar-wrap").getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    setPicking((v) => (v ? null : { left: r.left - bar.left - 32 }));
  };

  return (
    <>
      <div className="editor-bar" role="toolbar" aria-label="Formatting">
        <Tool label="Undo" keys="Mod+Z" disabled={!editor.can().undo()} onPress={() => run().undo().run()}>
          <Undo2 className="size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Redo" keys={mac ? "Mod+Shift+Z" : "Mod+Y"} disabled={!editor.can().redo()} onPress={() => run().redo().run()}>
          <Redo2 className="size-4" aria-hidden="true" />
        </Tool>
        <span className="editor-sep" aria-hidden="true" />
        <select
          className="editor-block"
          aria-label="Text style"
          value={style}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") run().setParagraph().run();
            else run().setHeading({ level: Number(v.slice(1)) }).run();
          }}
        >
          {style === "" && <option value="">—</option>}
          <option value="p">Normal text</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <span className="editor-sep" aria-hidden="true" />
        <Tool label="Bold" keys="Mod+B" active={editor.isActive("bold")} onPress={() => run().toggleBold().run()}>
          <Bold className="size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Italic" keys="Mod+I" active={editor.isActive("italic")} onPress={() => run().toggleItalic().run()}>
          <Italic className="size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Code" keys="Mod+E" active={editor.isActive("code")} onPress={() => run().toggleCode().run()}>
          <Code className="size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Link" keys="Mod+K" active={editor.isActive("link")} onPress={onLink}>
          <Link2 className="size-4" aria-hidden="true" />
        </Tool>
        <span className="editor-picker">
          <Tool label={`Highlight ${last}`} keys="Mod+Shift+H" active={editor.isActive("highlight")} onPress={() => run().setHighlight(last).run()}>
            <Highlighter className="size-4" aria-hidden="true" />
            <span className="editor-swatch" data-color={last} aria-hidden="true" />
          </Tool>
          <button type="button" className="editor-tool editor-more" aria-label="Highlight colours" aria-expanded={Boolean(picking)} onMouseDown={(e) => e.preventDefault()} onClick={pick}>
            ▾
          </button>
        </span>
        <span className="editor-sep" aria-hidden="true" />
        <Tool label="Bulleted list" keys="Mod+Shift+8" active={editor.isActive("bulletList")} onPress={() => run().toggleBulletList().run()}>
          <List className="size-4" aria-hidden="true" />
        </Tool>
        <Tool label="Numbered list" keys="Mod+Shift+7" active={editor.isActive("orderedList")} onPress={() => run().toggleOrderedList().run()}>
          <ListOrdered className="size-4" aria-hidden="true" />
        </Tool>
        <span className="editor-slot">{children}</span>
        <span className="editor-end">
          <span className={`editor-status is-${state}`} role="status" aria-live="polite">
            {label}
          </span>
          <button type="button" className="private-primary chamfer chamfer-sm editor-done" disabled={leaving} onClick={onDone}>
            {leaving ? "Saving…" : "Done"}
          </button>
        </span>
      </div>
      {picking && (
        <span className="editor-colors" role="menu" aria-label="Highlight colour" style={{ left: Math.max(0, picking.left) }}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="menuitem"
              className="editor-color"
              data-color={c}
              aria-label={c}
              title={c}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                run().setHighlight(c).run();
                setPicking(null);
              }}
            />
          ))}
          <button
            type="button"
            role="menuitem"
            className="editor-color is-none"
            aria-label="Remove highlight"
            title="Remove highlight"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              run().unsetHighlight().run();
              setPicking(null);
            }}
          >
            ⌀
          </button>
        </span>
      )}
    </>
  );
}

/** Cmd/Ctrl + K: the address for the selection, or for the link the caret is in. */
function LinkBox({ at, editor, onClose }) {
  const [href, setHref] = useState(at.href);
  const input = useRef(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  const close = () => {
    onClose();
    editor.commands.focus();
  };
  const apply = (e) => {
    e.preventDefault();
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) chain.unsetLink().run();
    else if (editor.state.selection.empty && !editor.isActive("link")) chain.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    else chain.setLink({ href: url }).run();
    onClose();
  };
  return createPortal(
    <form className="editor-link" style={{ top: at.top, left: Math.max(8, Math.min(at.left, window.scrollX + document.documentElement.clientWidth - 328)) }} onSubmit={apply}>
      <input
        ref={input}
        type="url"
        value={href}
        placeholder="Paste or type a link"
        aria-label="Link address"
        onChange={(e) => setHref(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && close()}
        onBlur={(e) => !e.currentTarget.form.contains(e.relatedTarget) && onClose()}
      />
      <button type="submit" className="draft-text-button">
        {href.trim() ? "Apply" : "Remove"}
      </button>
    </form>,
    document.body,
  );
}
