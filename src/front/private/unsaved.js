// src/front/private/unsaved.js: an edit to a draft that the server has not
// confirmed yet, kept in this browser.
//
// The editor (./editor/DraftEditor.jsx) writes the whole draft here as Ali
// types and clears it once a save is in. If the tab closes or the network
// drops first, the draft page offers it back next time, as long as it is
// newer than what the server has. Here, not in the editor's chunk, so the
// draft page can ask without loading the editor.

const key = (slug) => `draft-editor:${slug}`;

/** {slug, title, date, summary, body, base, at} or null. */
export function readUnsaved(slug) {
  try {
    const v = JSON.parse(localStorage.getItem(key(slug)));
    return v && typeof v.body === "string" ? v : null;
  } catch {
    return null;
  }
}

export function writeUnsaved(slug, value) {
  try {
    localStorage.setItem(key(slug), JSON.stringify({ ...value, slug, at: Date.now() }));
  } catch {
    // Full or blocked storage: the server copy is all there is.
  }
}

export function clearUnsaved(slug) {
  try {
    localStorage.removeItem(key(slug));
  } catch {
    // As above.
  }
}

/**
 * Whether a kept edit is worth offering for `draft`, the server's copy: it
 * differs from it, and it is newer, because it was made on top of this very
 * copy or after it was saved.
 */
export function newerThan(kept, draft) {
  if (!kept) return false;
  const same = kept.body === draft.body && kept.title === draft.title && kept.date === draft.date && kept.summary === draft.summary;
  if (same) return false;
  if (kept.base === draft.updated_at) return true;
  const saved = Date.parse(draft.updated_at);
  return Number.isFinite(saved) && kept.at > saved;
}

// ---- comment passages' new places ------------------------------------------------

const anchorsKey = (slug) => `draft-editor-anchors:${slug}`;
const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * New places for comment passages that the server has not confirmed, each
 * with the body they are places in and the `updated_at` of the save that
 * wrote it: [{body, base, changes, at}], `changes` as the anchors endpoint
 * takes them, `base` null while that save has not answered. They go with
 * their base, and the server takes them only while it still has that save,
 * so a reader never gets a place in text the draft doesn't have; the editor
 * keeps them here before sending, and the draft page sends whatever is left
 * (./PrivateBlog.jsx).
 */
export function readAnchors(slug) {
  try {
    const v = JSON.parse(localStorage.getItem(anchorsKey(slug)));
    return Array.isArray(v)
      ? v.filter((e) => typeof e?.body === "string" && (e.base == null || typeof e.base === "string") && Array.isArray(e.changes) && Date.now() - e.at < WEEK)
      : [];
  } catch {
    return [];
  }
}

/** Keeps `changes` for `body`, saved at `base`, in place of any kept for it; none forgets them. */
export function keepAnchors(slug, body, changes, base = null) {
  const list = readAnchors(slug).filter((e) => e.body !== body);
  if (changes?.length) list.push({ body, base, changes, at: Date.now() });
  try {
    if (list.length) localStorage.setItem(anchorsKey(slug), JSON.stringify(list.slice(-4)));
    else localStorage.removeItem(anchorsKey(slug));
  } catch {
    // As above: then they are only in the open editor.
  }
}
