// src/front/private/owner.jsx: Ali's History and Publish buttons, on a draft
// he is reading and in the editor's toolbar, and New draft on the list.
//
// A chunk of its own, which the private blog loads only when the viewer is
// Ali (../PrivateBlog.jsx), so a reader never downloads it. What the buttons
// open, the version history with its comparing, the Publish dialog and the
// new-draft form, are chunks of their own too (./editor/), fetched the first
// time Ali presses one.
//
// In the editor the buttons work through its session (./editor/DraftEditor.jsx):
// a restore replaces the editor's text in one undoable step, a publish saves
// what is typed first. On a draft being read, restoring opens the editor and
// restores there, so it is the same step either way.
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { FilePlus2, History as HistoryIcon } from "lucide-react";
import { request } from "./api";
import { publicText, publishState } from "./published";
import "./owner.css";

const History = lazy(() => import("./editor/History"));
const Publish = lazy(() => import("./editor/Publish"));
const NewDraft = lazy(() => import("./editor/NewDraft"));

// ---- what is known about each draft's public copy ------------------------------------

// slug -> {published, basis}: the last publish the server told of, and the
// public text it was up to date for (published.js). Kept here, not with the
// page's draft, because the editor hands back a draft whose `published` is
// still the one it opened with.
const records = new Map();

/** Learns from a draft the server sent, unless what is known is newer. */
function learn(draft) {
  if (!draft || !("published" in draft)) return records.get(draft?.slug) ?? null;
  const p = draft.published;
  const have = records.get(draft.slug);
  if (have?.published === p) return have;
  if (have?.published && (!p || Date.parse(p.at) < Date.parse(have.published.at))) return have;
  const record = { published: p, basis: p?.current ? publicText(draft) : null };
  records.set(draft.slug, record);
  return record;
}

// One publish at a time, whichever button it starts from.
let publishing = false;

/**
 * @param {{draft: object, rewrite: (html: string) => string, session?: object,
 *   onRestore?: (version: object) => void, onDraft?: (draft: object) => void}} props
 *   In the editor, `session` is its session; on a draft being read,
 *   `onRestore` opens the editor to restore a version, and `onDraft` takes
 *   the draft as the server has it after a save or a publish.
 */
export function OwnerTools({ draft: shown, rewrite, session, onRestore, onDraft }) {
  const draft = session ? session.draft() : shown;
  // Learning is idempotent, and the editor's draft is a new object every time.
  const record = learn(draft);
  const [, setLearned] = useState(0);
  const [open, setOpen] = useState(null); // "history" | {publish: draft, or null while saving}
  const [note, setNote] = useState("");

  const state = publishState(record?.published, draft, record?.basis);
  const saving = Boolean(session) && session.status.state === "saving";

  const editing = Boolean(session);
  const flush = useCallback(() => (session ? session.flush() : Promise.resolve(true)), [session]);

  // History's actions, the same in both places.
  const actions = {
    flush,
    current: () => (session ? session.draft() : shown),
    async saveVersion() {
      if (session) return session.saveAs("manual");
      const { title, date, summary, body, updated_at: base } = shown;
      const { data } = await request("/api/drafts", { method: "PUT", body: { slug: shown.slug, title, date, summary, body, base, kind: "manual" } });
      onDraft?.({ ...shown, ...data.draft });
      return true;
    },
    restore: (version) => (session ? session.restoreVersion(version) : (onRestore(version), true)),
  };

  const startPublish = async () => {
    if (publishing) return;
    publishing = true;
    setNote("");
    setOpen({ publish: null });
    try {
      if (!(await flush())) {
        setOpen(null);
        setNote("The draft isn't saved yet, so it can't be published. Try again once it says Saved.");
        publishing = false;
        return;
      }
      setOpen({ publish: session ? session.draft() : shown });
    } catch {
      setOpen(null);
      publishing = false;
    }
  };
  const published = (latest) => {
    learn(latest);
    setLearned((n) => n + 1);
    if (!session) onDraft?.(latest);
  };

  // Back to the text where the caret was, as Docs does, once a dialog
  // opened from the toolbar closes.
  const close = () => {
    setOpen(null);
    if (session) requestAnimationFrame(() => session.editor?.commands.focus());
  };
  const closePublish = () => {
    publishing = false;
    close();
  };

  const busy = open?.publish !== undefined;
  const update = state.state === "changed";
  const dialogs = (
    <Suspense fallback={null}>
      {open === "history" && <History slug={draft.slug} rewrite={rewrite} actions={actions} editing={editing} onClose={close} />}
      {open?.publish && <Publish draft={open.publish} update={state.state !== "none"} standing={state} onPublished={published} onClose={closePublish} />}
    </Suspense>
  );
  const noted = note && (
    <span className="owner-note" role="alert">
      {note}
    </span>
  );

  // In the editor's one row: History as an icon, and the public post's
  // state on Publish itself, its words in the tooltip, so the save status
  // is the only line of words.
  if (editing)
    return (
      <>
        {/* As the toolbar's own buttons (editor/Toolbar.jsx), which are in the editor's chunk. */}
        <button
          type="button"
          className="editor-tool owner-history"
          aria-label="Version history"
          title="Version history"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen("history")}
        >
          <HistoryIcon className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`owner-publish is-${state.state} chamfer chamfer-sm`}
          title={update ? `${state.label}. Press to update it.` : state.label}
          aria-label={`${update ? "Update public post" : "Publish"}, ${state.label}`}
          disabled={saving || busy}
          onMouseDown={(e) => e.preventDefault()}
          onClick={startPublish}
        >
          <span className="owner-dot" aria-hidden="true" />
          {open?.publish === null ? "Saving…" : update ? "Update" : "Publish"}
        </button>
        {noted}
        {dialogs}
      </>
    );

  return (
    <span className="owner-tools">
      <button type="button" className="private-edit owner-tool" onClick={() => setOpen("history")} title="Version history">
        <HistoryIcon className="size-3.5" aria-hidden="true" /> History
      </button>
      <button type="button" className={`private-edit owner-tool owner-publish-read is-${state.state}`} disabled={busy} onClick={startPublish} title={state.label}>
        <span className="owner-dot" aria-hidden="true" /> {open?.publish === null ? "Saving…" : state.action}
      </button>
      <span className={`owner-state is-${state.state}`}>
        {state.live ? (
          <>
            <a href={state.live} target="_blank" rel="noreferrer" className="owner-live">
              Published
            </a>
            {state.label.slice("Published".length)}
          </>
        ) : (
          state.label
        )}
      </span>
      {noted}
      {dialogs}
    </span>
  );
}

/**
 * What goes in the editor's toolbar (`place` "actions"): History and
 * Publish. In its More menu ("menu"), History, once the row is too narrow
 * for its button, which stays in the row hidden and is what the item
 * presses. `then` runs once with the session, when the editor is up: what
 * the read view asked the editor to do, a restore or the caret into a new
 * draft's text.
 */
export function EditorTools({ session, place, then, rewrite }) {
  const done = useRef(false);
  useEffect(() => {
    if (place !== "actions" || !then || done.current || !session.editor) return;
    done.current = true;
    then(session);
  }, [session, then, place]);
  if (place === "menu")
    return (
      <button
        type="button"
        role="menuitem"
        className="editor-menu-item"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => e.currentTarget.closest(".editor-bar-row")?.querySelector(".owner-history")?.click()}
      >
        <HistoryIcon className="size-4" aria-hidden="true" />
        <span>Version history</span>
      </button>
    );
  return <OwnerTools session={session} rewrite={rewrite} />;
}
/** "New draft" on the list of drafts, and its form under it. */
export function NewDraftButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="private-edit owner-new" onClick={() => setOpen(true)} disabled={open}>
        <FilePlus2 className="size-3.5" aria-hidden="true" /> New draft
      </button>
      {open && (
        <Suspense fallback={<p className="owner-loading">Opening…</p>}>
          <NewDraft onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
