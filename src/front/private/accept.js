// src/front/private/accept.js: Ali accepting a suggested edit.
//
// Loaded the first time he presses Accept on one (./DraftComments.jsx), so a
// reader never fetches it. Accept puts the suggested words in place of the
// passage in the draft's text, saves that as a version of its own in the
// draft's history ("Saved version"), and only once the server has the text
// marks the thread accepted, which resolves it. It never guesses:
//
// - The passage is looked for as the read view places a thread (./place.js),
//   by its words and context, in one place clearly or not at all, and its
//   words there must still be the ones the reader quoted. If not, nothing
//   changes, and Ali is told to make the edit by hand.
// - Only the words that change are replaced (./suggest.js, editRegion), so
//   formatting on the words around them stays as it is.
// - With the editor open, the change is made in the editor's own document
//   (./editor/anchors.js, replaceWords) and the editor saves it, so its next
//   save neither conflicts with the change nor writes over it, and Cmd+Z
//   undoes it. There only words within one paragraph, all with the same
//   formatting, are changed.
// - Without the editor, the change is made in the draft's Markdown as the
//   server has it now, and saved onto exactly that text: the save names the
//   updated_at it started from, and one saved since is refused (409). The
//   words that change are looked for in the Markdown, and each place they
//   are is tried, those nearest the passage's place among them first, up to
//   TRIES: a place counts only if the draft with the change made there
//   renders to exactly the text expected, the change where the passage is,
//   with the same formatting. A place inside a link's address, a picture's
//   description or a comment changes the wrong thing or nothing, and does not
//   count. One place counts, or nothing is changed.
//
// Once the server has the text, this browser remembers that the thread's
// edit is in until the thread is marked, so a mark that fails is pressed
// again without the text changing twice. A save whose answer never came is
// caught too: the suggested words already where the passage was, by its
// context, count as the edit made.
//
// After a change in the Markdown the accepted thread's passage is moved to
// the new words (deleted, for a deletion), and the threads beside the change
// to where they are in the new text, as the editor does after a save. A
// thread whose passage the change overlapped keeps its place, and is listed
// with the passages that changed.
import { marked } from "marked";
import { indexText } from "../quotes.js";
import { findThread, findWhole, quoteAt } from "./place.js";
import { escapeText } from "./editor/markdown.js";
import { editRegion } from "./suggest.js";

export const WHY = {
  missing: "This passage isn't in the draft exactly once as it is now, so nothing was changed. Make this edit by hand.",
  edited: "This passage was edited after the suggestion was made, so nothing was changed. Make this edit by hand.",
  format: "Formatting in this passage is in the way, so nothing was changed. Make this edit by hand.",
  changed: "The draft was saved somewhere else just now, so nothing was changed. Press Accept again.",
  unsaved: "The edit is in the editor but isn't saved yet. Press Accept again once it's saved; it won't be made twice.",
};

// As much context as a passage keeps either side (./place.js).
const CONTEXT = 32;
// The places in the Markdown tried for the words that change.
export const TRIES = 12;

// Whitespace as the comments' index (../quotes.js) writes it: one space, or
// one line break where a block ends.
const norm = (s) => s.replace(/\s+/g, (m) => (m.includes("\n") ? "\n" : " ")).trim();
const flat = (s) => norm(s).replace(/\n/g, " ");

/** The suggested words, without space at either end. */
const wordsOf = (t) => t.root.suggestion.trim();

/**
 * Where the suggested words already are in place of the passage, by the
 * context it had when quoted or has now. For a deletion, where the words
 * either side of it now meet, when both say something. Null when not.
 */
function appliedAt(index, t) {
  const words = wordsOf(t);
  for (const c of [t.find, t.quote]) {
    if (!c) continue;
    if (words) {
      const at = findWhole(index, { exact: norm(words), prefix: c.prefix || "", suffix: c.suffix || "" });
      if (at) return at;
    } else if ((c.prefix || "").trim() && (c.suffix || "").trim()) {
      // Without a word a context was cut through at its far end.
      const prefix = c.prefix.length >= CONTEXT ? c.prefix.replace(/^\S*\s/, "") : c.prefix;
      const suffix = c.suffix.length >= CONTEXT ? c.suffix.replace(/\s\S*$/, "") : c.suffix;
      const at = findWhole(index, { exact: norm(prefix + suffix), prefix: "", suffix: "" });
      if (at) return at;
    }
  }
  return null;
}

/**
 * Where a suggestion's passage is in the text an index reads: {at} to change
 * it, {applied: true} when the suggested words are there already, or {why},
 * a key of WHY. The suggested words are looked for first, so a passage the
 * new words begin with is not changed again; for a deletion, the passage
 * first, as the words either side may be found with it still between them.
 */
export function locate(index, t) {
  const deleting = !wordsOf(t);
  if (!deleting && appliedAt(index, t)) return { applied: true };
  const at = findThread(index, t);
  if (at && flat(index.text.slice(at[0], at[1])) === flat(t.quote.exact)) return { at };
  if (deleting && appliedAt(index, t)) return { applied: true };
  return { why: at ? "edited" : "missing" };
}

/** What `marked` renders a body to, inert, as the read view has it. */
function render(md) {
  const t = document.createElement("template");
  t.innerHTML = marked.parse(md);
  return t.content;
}

const SHAPE = "strong, em, del, code, a, img, span[data-hl], h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, pre, hr, table, figure, video, iframe";
/** The formatting a body renders to, in order, without its words. */
const shape = (root) =>
  [...root.querySelectorAll(SHAPE)].map((el) => [el.tagName, el.getAttribute("href"), el.getAttribute("src"), el.getAttribute("alt"), el.getAttribute("data-hl")].join("|")).join("\n");

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The draft's Markdown with the words at [start, end) of its text (`index`,
 * of the body rendered) replaced by `insert`: {body, index} with the new
 * text's index, or {why}. Each place those words are written in the Markdown,
 * a run of space matching any run, is tried with `insert` as written, then
 * with its line breaks as paragraph breaks, then with Markdown's characters
 * escaped; the first that renders as expected is that place's.
 */
export function replaceInMarkdown(body, index, [start, end], insert) {
  const words = index.text.slice(start, end);
  const expected = norm(index.text.slice(0, start) + insert + index.text.slice(end));
  const before = shape(render(body));
  const source = words.split(/(\s+)/).filter(Boolean).map((p) => (/^\s/.test(p) ? "\\s+" : escapeRe(p))).join("");
  const places = [];
  const re = new RegExp(source, "g");
  for (let m = re.exec(body); m; m = re.exec(body)) {
    places.push([m.index, m.index + m[0].length]);
    re.lastIndex = m.index + 1;
  }
  // Which of the words' places in the text this is: the same one in the
  // Markdown is likeliest, so the nearest are tried first.
  const hay = index.text.replace(/\s/g, " ");
  const needle = words.replace(/\s/g, " ");
  let nth = 0;
  for (let i = hay.indexOf(needle); i !== -1 && i < start; i = hay.indexOf(needle, i + 1)) nth++;
  const tries = places.map((p, i) => ({ p, d: Math.abs(i - nth) })).sort((a, b) => a.d - b.d).slice(0, TRIES);
  const forms = [...new Set([insert, insert.replace(/\n+/g, "\n\n"), escapeText(insert), escapeText(insert).replace(/\n+/g, "\n\n")])];
  const found = new Map();
  for (const { p: [a, b] } of tries) {
    for (const form of forms) {
      const next = body.slice(0, a) + form + body.slice(b);
      const root = render(next);
      const after = indexText(root);
      if (norm(after.text) === expected && shape(root) === before) {
        found.set(next, after);
        break;
      }
    }
  }
  if (found.size !== 1) return { why: found.size ? "missing" : "format" };
  const [[next, after]] = found;
  return { body: next, index: after };
}

/**
 * The anchors after a change in the Markdown at [start, end) of the text,
 * in the passage at `at`: the accepted thread's on the new words, or deleted;
 * each other thread clear of the change where its words are now, when its
 * context changed. Ali's pending threads follow by themselves (./review.js).
 */
function anchorsAfter(t, threads, before, after, at, [start, end]) {
  const out = [];
  const words = wordsOf(t);
  if (!words) out.push({ thread: t.id, exact: "", prefix: "", suffix: "" });
  else {
    const now = findWhole(after, { exact: norm(words), prefix: before.text.slice(Math.max(0, at[0] - CONTEXT), at[0]), suffix: before.text.slice(at[1], at[1] + CONTEXT) });
    if (now) out.push({ thread: t.id, ...quoteAt(after, now) });
  }
  const shift = after.text.length - before.text.length;
  const head = after.text.startsWith(before.text.slice(0, start));
  const tail = after.text.endsWith(before.text.slice(end));
  for (const o of threads) {
    if (o.id === t.id || o.pending || !o.find) continue;
    const was = findThread(before, o);
    const moved = !was ? null : was[1] <= start && head ? was : was[0] >= end && tail ? [was[0] + shift, was[1] + shift] : null;
    if (!moved) continue;
    const q = quoteAt(after, moved);
    if (q.exact === o.find.exact && q.prefix === (o.find.prefix || "") && q.suffix === (o.find.suffix || "")) continue;
    out.push({ thread: o.id, ...q });
  }
  return out;
}

/**
 * Accept through the draft as the server has it, the editor closed.
 * `request` is ./api.js's; `threads` the published threads.
 */
export function pageText({ slug, threads, request }) {
  let draft = null;
  return {
    async read() {
      ({ draft } = (await request(`/api/drafts?slug=${encodeURIComponent(slug)}`)).data);
      return indexText(render(draft.body));
    },
    // The text was just read from the server.
    save: async () => true,
    async replace(t, index, at, region) {
      const span = [at[0] + region.from, at[0] + region.to];
      const done = replaceInMarkdown(draft.body, index, span, region.insert);
      if (done.why) throw new Error(WHY[done.why]);
      let saved;
      try {
        const { title, date, summary, updated_at: base } = draft;
        ({ draft: saved } = (await request("/api/drafts", { method: "PUT", body: { slug, title, date, summary, body: done.body, base, kind: "manual" } })).data);
      } catch (err) {
        if (err.status === 409) throw new Error(WHY.changed);
        throw err;
      }
      const anchors = anchorsAfter(t, threads, index, done.index, at, span);
      // The text is in either way: a passage not moved is listed with the changed ones.
      if (anchors.length) {
        await request("/api/draft-comments?a=anchors", { method: "PUT", body: { draft: slug, base: saved.updated_at, anchors } }).catch((err) =>
          console.warn("comments: the passages' new places were not saved", err),
        );
      }
      return true;
    },
  };
}

/**
 * Accept through the editor's own document, while it is open. `bridge` is
 * its handle (./editor/anchors.js, ./editor/DraftEditor.jsx).
 */
export function editorText(bridge) {
  return {
    read: async () => indexText(bridge.dom),
    // In the editor already: saved unless it has changes the server lacks.
    save: async () => bridge.base() != null || bridge.saveVersion(),
    async replace(t, index, at, region) {
      if (!bridge.replaceWords(index, [at[0] + region.from, at[0] + region.to], region.insert, t.id, at)) throw new Error(WHY.format);
      return bridge.saveVersion();
    },
  };
}

// The threads whose edit the server has and that are not marked yet, by draft.
const key = (slug) => `draft-accepted:${slug}`;

function savedHere(slug) {
  try {
    const ids = JSON.parse(localStorage.getItem(key(slug)));
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function keepSaved(slug, id, on) {
  const ids = savedHere(slug);
  if (on) ids.add(id);
  else ids.delete(id);
  try {
    if (ids.size) localStorage.setItem(key(slug), JSON.stringify([...ids]));
    else localStorage.removeItem(key(slug));
  } catch {
    // Blocked storage: a retry finds the edit in the text instead.
  }
}

/**
 * Accepts the suggestion thread `t` through `target` (pageText or
 * editorText), then marks it with `mark(id)`. Throws an Error to show; once
 * the text is saved, pressing again only marks it.
 */
export async function acceptSuggestion({ slug, t, target, mark }) {
  if (!savedHere(slug).has(t.id)) {
    const index = await target.read();
    const where = locate(index, t);
    if (where.why) throw new Error(WHY[where.why]);
    const region = where.at && editRegion(index.text.slice(where.at[0], where.at[1]), wordsOf(t), { whole: true });
    const saved = where.applied ? await target.save() : await target.replace(t, index, where.at, region);
    if (!saved) throw new Error(WHY.unsaved);
    keepSaved(slug, t.id, true);
  }
  try {
    await mark(t.id);
  } catch (err) {
    throw new Error(`The draft has the edit, but the suggestion couldn't be marked accepted: ${err.message} Press Accept again to finish; the text won't change twice.`);
  }
  keepSaved(slug, t.id, false);
}
