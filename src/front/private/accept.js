// src/front/private/accept.js: Ali accepting a suggested edit.
//
// Loaded the first time he presses Accept on one (./DraftComments.jsx), so a
// reader never fetches it. Accept puts the suggested words in place of the
// passage in the draft's text and saves that as a version of its own in the
// draft's history ("Saved version"), and the same save marks the thread
// accepted, which resolves it: the stats service makes both or neither
// (`PUT /api/drafts` with `accept`). So a thread is accepted exactly when its
// edit was saved, and the service is the only record of it. Each press starts
// by asking the service whether the thread is accepted; if it is, nothing is
// changed. A press after one whose answer never came needs nothing else, and
// two at once, in two tabs or on two devices, change the text once: the
// service refuses the second (409). It never guesses:
//
// - The passage is looked for where the thread is (./place.js): by its
//   anchor, or the reader's quote while it has none. It must be there with
//   all of its context as it was taken, character for character, in one
//   place only (exactlyAt), and its words there must still be the ones the
//   reader quoted. The read view's placement, by most of the context, is not
//   enough here: after an edit made inside a passage or beside it, its old
//   words are still found that way with the edit in their context ("big
//   cat" in "a very big cat"). If not, nothing changes, and Ali is told to
//   make the edit by hand.
// - Only the words that change are replaced (./suggest.js, editRegion), so
//   formatting on the words around them stays as it is.
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
// - With the editor open, the change is made in the editor's own document
//   (./editor/anchors.js, replaceWords), as a step of its own that Cmd+Z
//   undoes, and the editor's own save carries the mark, so its next save
//   neither conflicts with the change nor writes over it. There only words
//   within one paragraph, all with the same formatting, are changed. A save
//   that fails leaves the change in the editor, not saved, and the thread
//   not accepted. The editor keeps the thread's passage on the new words,
//   so a press after that goes by it: when the passage there reads as the
//   suggested words, the words are not put in again, and the text is only
//   saved with the mark, or marked (`PATCH`) when an autosave took it
//   already. Undone or edited since, it is a first press on the text as it
//   is.
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
  unknown: "The server didn't answer, so it isn't confirmed that the edit was saved. Pressing Accept again is safe: it won't make it twice.",
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

// As the read view matches: line breaks read as spaces, one for one.
const spaced = (s) => s.replace(/\s/g, " ");

/**
 * Where a quote's words are with all of their context as it was taken: the
 * text just before them ending with its prefix and just after them starting
 * with its suffix, character for character, a context shorter than CONTEXT
 * meeting the text's start or end, space aside. [start, end) when that is
 * one place in the text, else null.
 */
export function exactlyAt(index, q) {
  const words = spaced(q?.exact || "");
  if (!words.trim()) return null;
  const hay = spaced(index.text);
  let pre = spaced(q.prefix || "");
  let suf = spaced(q.suffix || "");
  const open = { start: pre.length >= CONTEXT, end: suf.length >= CONTEXT };
  // A context cut through a character keeps half of it, stored as U+FFFD
  // (./place.js): not read.
  if (open.start && /^[\udc00-\udfff\ufffd]/.test(pre)) pre = pre.slice(1);
  if (open.end && /[\ud800-\udbff\ufffd]$/.test(suf)) suf = suf.slice(0, -1);
  const places = [];
  for (let at = hay.indexOf(words); at !== -1; at = hay.indexOf(words, at + 1)) {
    const end = at + words.length;
    const from = at - pre.length;
    const to = end + suf.length;
    if (from < 0 || hay.slice(from, at) !== pre || hay.slice(end, to) !== suf) continue;
    if ((!open.start && hay.slice(0, from).trim()) || (!open.end && hay.slice(to).trim())) continue;
    places.push([at, end]);
  }
  return places.length === 1 ? places[0] : null;
}

/**
 * Where a suggestion's passage is in the text an index reads: {at} to change
 * it, or {why}, a key of WHY. The passage at its place is changed whatever
 * else is there.
 */
export function locate(index, t) {
  const place = t.find || (t.gone ? t.quote : null);
  const at = place && exactlyAt(index, place);
  if (at && flat(index.text.slice(at[0], at[1])) === flat(t.quote.exact)) return { at };
  return { why: findThread(index, t) ? "edited" : "missing" };
}

/** Where the passage is and what changes in it, or throws the Error to show. */
function edit(index, t) {
  const where = locate(index, t);
  if (where.why) throw new Error(WHY[where.why]);
  return { at: where.at, region: editRegion(index.text.slice(where.at[0], where.at[1]), wordsOf(t), { whole: true }) };
}

// A failure the server may or may not have acted on: nothing came back, or
// something between gave up.
const unknown = (err) => !err?.status || err.status >= 500;

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
  return {
    async accept(t) {
      const { draft } = (await request(`/api/drafts?slug=${encodeURIComponent(slug)}`)).data;
      const index = indexText(render(draft.body));
      const { at, region } = edit(index, t);
      const span = [at[0] + region.from, at[0] + region.to];
      const done = replaceInMarkdown(draft.body, index, span, region.insert);
      if (done.why) throw new Error(WHY[done.why]);
      let saved;
      try {
        const { title, date, summary, updated_at: base } = draft;
        ({ draft: saved } = (await request("/api/drafts", { method: "PUT", body: { slug, title, date, summary, body: done.body, base, kind: "manual", accept: t.id } })).data);
      } catch (err) {
        // Accepted meanwhile, by another tab or device: nothing was written, and it is shown so.
        if (err.status === 409 && err.field === "accept") return;
        if (err.status === 409) throw new Error(WHY.changed);
        if (unknown(err)) throw new Error(WHY.unknown);
        throw err;
      }
      const anchors = anchorsAfter(t, threads, index, done.index, at, span);
      // The text is in either way: a passage not moved is listed with the changed ones.
      if (anchors.length) {
        await request("/api/draft-comments?a=anchors", { method: "PUT", body: { draft: slug, base: saved.updated_at, anchors } }).catch((err) =>
          console.warn("comments: the passages' new places were not saved", err),
        );
      }
    },
  };
}

/**
 * Accept through the editor's own document, while it is open. `bridge` is
 * its handle (./editor/anchors.js, ./editor/DraftEditor.jsx); `mark(id)`
 * marks a thread accepted on its own (`PATCH`).
 */
export function editorText(bridge, mark) {
  return {
    async accept(t) {
      // The editor's passage for the thread reads as the suggested words: put
      // in by an earlier press, or by hand, and not to be put in again.
      const there = bridge.passage(t.id);
      if (there == null || flat(there) !== flat(wordsOf(t))) {
        const index = indexText(bridge.dom);
        const { at, region } = edit(index, t);
        if (!bridge.replaceWords(index, [at[0] + region.from, at[0] + region.to], region.insert, t.id, at)) throw new Error(WHY.format);
      } else if (bridge.base() != null) {
        // Saved already, by an autosave: the text the server has is the editor's.
        await mark(t.id);
        return;
      }
      const out = await bridge.saveAccepted(t.id);
      if (out?.accepted) return;
      if (out?.status === 409 && out.field === "accept") return;
      if (out && unknown(out)) throw new Error(WHY.unknown);
      if (out?.field === "accept") throw new Error(out.message);
      throw new Error(WHY.unsaved);
    },
  };
}

/**
 * Accepts the suggestion thread `t` through `target` (pageText or
 * editorText), unless `acceptedNow(id)`, the thread as the service has it
 * now, says it is accepted already. Throws an Error to show.
 */
export async function acceptSuggestion({ t, target, acceptedNow }) {
  if (await acceptedNow(t.id)) return;
  await target.accept(t);
}
