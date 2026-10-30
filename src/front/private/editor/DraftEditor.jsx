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
// readers find them where they now are; until the server has them, they are
// kept in this browser too and tried again.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Suspense } from "react";
import { createPortal } from "react-dom";
import { Editor, Extension } from "@tiptap/core";
import { isHistoryTransaction } from "@tiptap/pm/history";
import { TextSelection } from "@tiptap/pm/state";
import { marked } from "marked";
import { ApiError, mediaUrl, request, uploadMedia } from "../api";
import { clearUnsaved, keepAnchors, writeUnsaved } from "../unsaved";
import { embeds } from "../../embeds";
import { canEdit, fromMarkdown, toMarkdown } from "./markdown";
import { PASTE_RULES, extensions, metaChange, replaceAll } from "./schema";
import { REFUSED, safeHref } from "./links";
import { commentAnchors, readSelection } from "./anchors";
import { Details, Toolbar } from "./Toolbar";
import "./editor.css";

const WAIT = 1500;
const SEARCH = 400;
const BACKOFF = [2000, 4000, 8000, 16_000, 30_000];
// keepalive requests are limited to 64 KB, body and all.
const KEEPALIVE = 60_000;
const PICTURES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };
// How long "Offline, retrying" lasts before the bar under the toolbar says so too.
const OFFLINE_BAR = 4000;
const STATUS = { saved: "Saved", pending: "Saving…", saving: "Saving…", offline: "Offline, retrying", conflict: "Changed elsewhere" };

// A transaction that only copies the fields onto the document.
const FIELDS = "draftFields";

const sameDraft = (a, b) => a.title === b.title && a.date === b.date && a.summary === b.summary && a.body === b.body;

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
 *   onLost: () => void, slot?: (session: object, place: "actions" | "menu") => React.ReactNode,
 * }} props
 *   `restore` is an unsaved edit from this browser to start from; `slot`
 *   renders with the editing session (see `session` below) into the
 *   toolbar, between the save status and Done ("actions"), and into its
 *   More menu once the row has folded that far ("menu").
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
      pending: null, // {body, base, changes}: passages' places in the body saved at base, not confirmed yet
      sending: null,
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
      let p;
      try {
        p = payload();
      } catch {
        return; // the save says why
      }
      if (s.current.baseline && sameDraft(p, s.current.baseline)) clearUnsaved(slug);
      else writeUnsaved(slug, { ...p, base: s.current.base });
    }, 300);
  }, [payload, slug]);

  /**
   * Sends the passages' new places in the text the server has, after that
   * text. While the editor's text is the server's they are read off it
   * afresh; while more is being typed, those kept for the server's text go.
   * Each goes with the save it is for as its base. Until the server has them
   * they are kept in this browser (../unsaved.js), the status is not
   * "Saved", and they are tried again, later and later. Once the draft has
   * been saved somewhere else since, the server refuses them (409): they are
   * dropped, as that session sends places for its own text, and this one
   * says the draft changed, as a save would. True when nothing is left to
   * send.
   */
  const sendAnchors = useCallback(
    async ({ keepalive = false } = {}) => {
      const st = s.current;
      // One at a time; one sent for older text is not this one.
      while (st.sending) await st.sending;
      if (st.conflict || !st.baseline || !st.editor) return false;
      if (sameDraft(payload(), st.baseline)) {
        const changes = st.anchors.changes(st.anchors.quotes());
        st.pending = changes.length ? { body: st.baseline.body, base: st.base, changes } : null;
        keepAnchors(slug, st.baseline.body, changes, st.base);
      }
      const pending = st.pending?.base === st.base ? st.pending : null;
      if (!pending) return true;
      st.sending = (async () => {
        try {
          const body = { draft: slug, anchors: pending.changes, base: pending.base };
          await request("/api/draft-comments?a=anchors", { method: "PUT", body, keepalive: keepalive && JSON.stringify(body).length < KEEPALIVE });
          st.anchors.sent(pending.changes);
          st.tries = 0;
          if (st.pending === pending) {
            st.pending = null;
            keepAnchors(slug, pending.body, null);
          }
          for (const fn of st.saved) fn();
          return true;
        } catch (err) {
          console.warn("comments: the passages' new places were not saved", err);
          if (err instanceof ApiError && err.status === 409) {
            if (st.pending === pending) st.pending = null;
            keepAnchors(slug, pending.body, null);
            const latest = await request(`/api/drafts?slug=${encodeURIComponent(slug)}`).then(({ data }) => data.draft, () => null);
            if (latest && latest.updated_at !== st.base && !st.conflict) {
              st.conflict = latest;
              setConflict(latest);
              setStatus({ state: "conflict" });
            } else if (!st.conflict) setStatus({ state: "error", message: "This draft was saved somewhere else. Press Done and open it again." });
          } else if (err instanceof ApiError && err.status === 404) onLost();
          else if (!(err instanceof ApiError) || err.status === 0 || err.status >= 500 || err.status === 429) {
            setStatus({ state: "offline" });
            clearTimeout(st.retry);
            st.retry = setTimeout(() => st.save(), BACKOFF[Math.min(st.tries++, BACKOFF.length - 1)]);
          } else setStatus({ state: "error", message: err.message });
          return false;
        } finally {
          st.sending = null;
        }
      })();
      return st.sending;
    },
    [slug, payload, onLost],
  );

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
      let p;
      try {
        p = payload();
      } catch (err) {
        // Text that can't be written as Markdown (./markdown.js) is not
        // saved as anything else.
        setStatus({ state: "error", message: err.message });
        return;
      }
      if (kind === "autosave" && sameDraft(p, st.baseline)) {
        clearUnsaved(slug);
        if ((await sendAnchors({ keepalive })) && sameDraft(payload(), st.baseline)) setStatus({ state: "saved" });
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
            if ((await sendAnchors({ keepalive })) && sameDraft(payload(), p)) setStatus({ state: "saved" });
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
  s.current.save = save;

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
    // Word and Excel put a picture of what was copied beside its text: the
    // text is what was meant. A picture copied from a page comes with HTML
    // that is only that picture, and is the picture.
    const pictureOnly = (html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return !doc.body.textContent.trim() && doc.body.querySelectorAll("img").length > 0;
    };

    const { doc, raws } = fromMarkdown(start.body);
    const ed = new Editor({
      element: mount.current,
      enablePasteRules: PASTE_RULES,
      extensions: [...extensions({ ...tools, known: st.known }), extension, shortcuts],
      // The title, date and summary on the document too (./schema.js).
      content: { ...doc, attrs: { meta: metaRef.current } },
      editorProps: {
        attributes: { class: "post-body editor-body", "aria-label": "Draft text", spellcheck: "true" },
        // Pasted, cut, copied and a shortcut (Cmd/Ctrl) applied where the
        // selection is on screen: right after a click or a key that moved
        // it, the state can still have the one before (./anchors.js,
        // readSelection). Other keys move and type as the browser does.
        handleDOMEvents: {
          paste: (view) => void readSelection(view),
          cut: (view) => void readSelection(view),
          copy: (view) => void readSelection(view),
          keydown: (view, event) => void ((event.metaKey || event.ctrlKey) && !event.isComposing && readSelection(view)),
        },
        handlePaste(view, event) {
          const data = event.clipboardData;
          const pics = files(data?.files);
          if (!pics.length) return false;
          const html = data.getData("text/html");
          if (html.trim() ? !pictureOnly(html) : data.getData("text/plain").trim()) return false;
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
    // The caret at the start of the text, as Docs opens a document, not on
    // the video or embed a draft may start with: selected, it would leave
    // the text style and the like with nothing to work on.
    const caret = TextSelection.findFrom(ed.state.doc.resolve(0), 1, true);
    if (caret) ed.view.dispatch(ed.state.tr.setSelection(caret).setMeta("addToHistory", false));
    remember(ed.state.doc, restore ? [] : raws);
    // What the server has: for a restored edit, the server's own copy.
    st.baseline = restore ? { title: draft.title, date: draft.date, summary: draft.summary, body: draft.body } : { ...metaRef.current, body: toMarkdown(ed.state.doc, { keep: st.keep }) };

    let frame = 0;
    const onTransaction = ({ transaction }) => {
      for (const spot of st.spots) spot.pos = transaction.mapping.map(spot.pos);
      // A restore, or its undo or redo, sets the title, date and summary.
      const m = metaChange(transaction);
      if (m && m !== metaRef.current) {
        metaRef.current = m;
        setMeta(m);
      }
      if (transaction.docChanged && !transaction.getMeta(FIELDS)) changed();
      // Threads with no passage are looked for in the text once it is on
      // screen: at once after an undo or redo, and after typing or a paste
      // once it pauses, before the save that sends what is found.
      if (transaction.docChanged) {
        clearTimeout(st.search);
        if (isHistoryTransaction(transaction)) queueMicrotask(() => st.anchors.findMissing());
        else st.search = setTimeout(() => st.anchors.findMissing(), SEARCH);
      }
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
      clearTimeout(st.search);
      ed.off("transaction", onTransaction);
      ed.off("blur", onBlur);
      onBridge(null);
      ed.destroy();
      st.editor = null;
    };
    // Made once for the life of this editing session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saved at once when the page is hidden or closed, as far as the browser
  // lets. Text sent now may only reach the server after the page is gone,
  // and its passages' places with it: they are kept for the next page to send
  // once the server has that text.
  useEffect(() => {
    const leave = () => {
      const st = s.current;
      if (!st.editor || !st.baseline || st.conflict) return;
      try {
        const p = payload();
        if (!sameDraft(p, st.baseline)) keepAnchors(slug, p.body, st.anchors.changes(st.anchors.quotes()));
      } catch {
        // The save says why.
      }
      save({ keepalive: true });
    };
    const hidden = () => document.visibilityState === "hidden" && leave();
    const gone = () => leave();
    const online = () => s.current.retry && save();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", gone);
    window.addEventListener("online", online);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", gone);
      window.removeEventListener("online", online);
    };
  }, [save, payload, slug]);

  /**
   * The fields onto the document, outside the undo history (each field has
   * its own), so that undoing a restore brings back what they said before it.
   */
  const copyFields = useCallback((m) => {
    const ed = s.current.editor;
    ed?.view.dispatch(ed.state.tr.setDocAttribute("meta", m).setMeta("addToHistory", false).setMeta(FIELDS, true));
  }, []);

  const setField = (name, value) => {
    const m = { ...metaRef.current, [name]: value };
    metaRef.current = m;
    setMeta(m);
    copyFields(m);
    changed();
  };

  /** Saves what is left, anchors too. True when the server has everything. */
  const flush = useCallback(async () => {
    await save();
    while (s.current.flight) await s.current.flight;
    const sent = await sendAnchors();
    return sent && !s.current.conflict && sameDraft(payload(), s.current.baseline);
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
      st.pending = null;
      st.base = next.updated_at;
      st.latest = { ...st.latest, ...next };
      st.editor.commands.setContent(doc, { emitUpdate: false });
      remember(st.editor.state.doc, raws);
      const m = { title: next.title, date: next.date, summary: next.summary };
      metaRef.current = m;
      setMeta(m);
      copyFields(m);
      st.baseline = { ...m, body: serialize() };
      clearUnsaved(slug);
      setConflict(null);
      setStatus({ state: "saved" });
      st.anchors.reset();
      return true;
    },
    [remember, serialize, slug, copyFields],
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
   * restore. The text, title, date and summary are replaced in one step of
   * its own in the undo history, so Cmd+Z brings back all four as they were
   * and redo the version's again (./schema.js). The passages are then found again in the
   * new text, as after "Load the latest", by their anchors or their
   * readers' quotes, those saved as deleted too, and saved after the save
   * as usual. A thread whose words are not in it is not found, and is
   * listed under "On text that changed", its anchor kept as it was.
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
      ed.view.dispatch(replaceAll(ed.state, doc, { title: version.title, date: version.date, summary: version.summary }));
      // Each block as the version wrote it. Added to what is kept, not in
      // place of it, so an undo writes back the blocks it brings back as
      // they were written too.
      ed.state.doc.forEach((n, _, i) => {
        if (raws[i] != null) st.keep.set(n, raws[i]);
        if (n.type.name === "rawBlock") st.known.add(n.attrs.source);
      });
      st.anchors.reset();
      return saveAs("restore");
    },
    [saveAs],
  );

  const keepMine = () => {
    const st = s.current;
    // The server's copy is the other one now, so a save of this one goes
    // ahead even with nothing typed since.
    const { title, date, summary, body } = st.conflict;
    st.baseline = { title, date, summary, body };
    st.latest = { ...st.latest, ...st.conflict };
    st.base = st.conflict.updated_at;
    st.conflict = null;
    // The other session may have sent its own places for the passages:
    // they are all sent again after this save, for this text.
    st.anchors.forget();
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

  // Offline for more than a moment: said in words under the toolbar, as a
  // save that failed or was refused is at once. Timed from the first failure,
  // through the retries' own "Saving…".
  const [stuck, setStuck] = useState(false);
  const since = useRef(0);
  useEffect(() => {
    const now = status.state;
    if (now !== "offline" && (now !== "saving" || !since.current)) {
      since.current = 0;
      return setStuck(false);
    }
    since.current ||= Date.now();
    const t = setTimeout(() => setStuck(true), Math.max(0, OFFLINE_BAR - (Date.now() - since.current)));
    return () => clearTimeout(t);
  }, [status.state]);

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
          <Toolbar
            editor={editor}
            label={label}
            state={state}
            uploading={uploads > 0}
            leaving={leaving}
            onDone={done}
            onLink={() => openLink.current()}
            actions={slot?.(session, "actions")}
            menu={slot?.(session, "menu")}
          />
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
          {state === "error" && (
            <div className="editor-alert is-error" role="alert">
              <p>Not saved: {status.message}</p>
              {!status.field && (
                <button type="button" className="draft-text-button" onClick={() => save()}>
                  Try again
                </button>
              )}
            </div>
          )}
          {(state === "offline" || state === "saving") && stuck && (
            <div className="editor-alert is-error" role="status">
              <p>Offline, retrying. What you type is kept in this browser until the server has it.</p>
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

/** Cmd/Ctrl + K: the address for the selection, or for the link the caret is in. */
function LinkBox({ at, editor, onClose }) {
  const [href, setHref] = useState(at.href);
  const [refused, setRefused] = useState(false);
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
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      onClose();
      return;
    }
    // The address checked here too: inserted with nothing selected, it is
    // not made by setLink, which checks its own.
    const url = safeHref(href);
    if (!url) {
      setRefused(true);
      input.current?.focus();
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) chain.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    else chain.setLink({ href: url }).run();
    onClose();
  };
  return createPortal(
    // Not the browser's own check of a URL field: a path on this site is a
    // link too, and ./links.js is the check.
    <form className="editor-link" noValidate style={{ top: at.top, left: Math.max(8, Math.min(at.left, window.scrollX + document.documentElement.clientWidth - 328)) }} onSubmit={apply}>
      <input
        ref={input}
        type="url"
        value={href}
        placeholder="Paste or type a link"
        aria-label="Link address"
        aria-invalid={refused || undefined}
        aria-describedby={refused ? "editor-link-refused" : undefined}
        onChange={(e) => {
          setHref(e.target.value);
          setRefused(false);
        }}
        onKeyDown={(e) => e.key === "Escape" && close()}
        onBlur={(e) => !e.currentTarget.form.contains(e.relatedTarget) && onClose()}
      />
      <button type="submit" className="draft-text-button">
        {href.trim() ? "Apply" : "Remove"}
      </button>
      {refused && (
        <p id="editor-link-refused" className="editor-link-refused" role="alert">
          {REFUSED}
        </p>
      )}
    </form>,
    document.body,
  );
}
