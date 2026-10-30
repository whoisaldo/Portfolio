// src/front/private/editor/anchors.js: the comments' passages while the draft
// is being edited.
//
// The read view finds each thread's passage by its words and context
// (../../quotes.js) and wraps it in <mark>s. The editor's DOM belongs to
// ProseMirror, so here a passage is found the same way once, on the editor's
// DOM, turned into a document range, and from then on that range is mapped
// through every change, so it follows the words as they move and grows or
// shrinks as they are edited. It is drawn with decorations, which ProseMirror
// renders itself, as <mark class="post-quote" data-threads="…"> so the read
// view's styles and the comments' own click and hover handling apply as they
// are.
//
// A passage deleted entirely is a range of nothing: its thread goes to "On
// text that changed". Undoing the deletion brings the words back inside it,
// and a thread with no passage is looked for again after each change, so
// words brought back any other way (restoring a version, pasting) have their
// thread again too.
// A passage in a raw block (a video's caption) is the whole block, outlined;
// deleting the block deletes it.
//
// quotes() reads each passage's words and context off the editor's DOM as a
// reader's selection would have them, for the anchors the server keeps after
// a save (./DraftEditor.jsx).
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { groupQuotes, indexText, quoteFromRange } from "../../quotes.js";
import { findBySides, findWhole } from "../place.js";

const key = new PluginKey("commentAnchors");
// As the read view quotes a selection.
const MAX = 500;

const EMPTY = { ranges: new Map(), items: [], emphasis: { active: [], hover: [] }, deco: DecorationSet.empty };

const GONE = { exact: "", prefix: "", suffix: "" };
// Differs from every place a passage can have, so it is sent.
const UNSENT = { exact: null };
const quoteOf = (q) => ({ exact: q.exact, prefix: q.prefix || "", suffix: q.suffix || "" });
/** What the server has for a thread: its anchor, the reader's quote while it has none, empty once deleted. */
const held = (t) => (t.gone ? GONE : t.find?.exact ? quoteOf(t.find) : null);

const same = (a, b) => (a || []).length === (b || []).length && (a || []).every((x, i) => x === b[i]);

/** Undo and redo carry this meta (prosemirror-history's plugin key). */
const fromHistory = (tr) => Boolean(tr.getMeta("history$"));

/**
 * Each passage through a change. Words typed just before or just after a
 * passage are not part of it. A passage whose words are all deleted is empty,
 * and remembers them and the words either side (`lost`): an undo or redo
 * that puts them back, even one that replaces the whole text (after "Load the
 * latest"), finds them again where the change put text back, and only there,
 * by the same words-and-context rule the comments use (findWhole).
 */
function mapRanges(ranges, tr) {
  if (!tr.docChanged) return ranges;
  const next = new Map();
  // What an undo or redo put back: the span of the text its steps replaced.
  let changed = null;
  if (fromHistory(tr)) {
    const maps = tr.mapping.maps;
    maps.forEach((map, i) =>
      map.forEach((_a, _b, start, end) => {
        for (let j = i + 1; j < maps.length; j++) {
          start = maps[j].map(start, -1);
          end = maps[j].map(end, 1);
        }
        changed = changed ? [Math.min(changed[0], start), Math.max(changed[1], end)] : [start, end];
      }),
    );
  }
  for (const [id, r] of ranges) {
    const lost = r.from < r.to ? passage(tr.before, r.from, r.to) : r.lost;
    const from = tr.mapping.map(r.from, 1);
    const to = tr.mapping.map(r.to, -1);
    if (r.from < r.to && from < to) {
      next.set(id, { from, to });
      continue;
    }
    const near = changed && to >= changed[0] && to <= changed[1];
    const back = near && lost && findText(tr.doc, changed[0], changed[1], lost);
    next.set(id, back || { from: to, to, lost });
  }
  return next;
}

const CONTEXT = 32;
const flatText = (doc, from, to) => doc.textBetween(from, to, "\n", "\ufffc");

/** A passage's words and the words either side, as findQuote takes them. */
function passage(doc, from, to) {
  // A raw block's range is between blocks, and so is the line either side.
  const line = (pos, text) => (text && !doc.resolve(pos).parent.inlineContent ? "\n" : "");
  const before = flatText(doc, Math.max(0, from - CONTEXT * 2), from);
  const after = flatText(doc, to, Math.min(doc.content.size, to + CONTEXT * 2));
  return {
    exact: flatText(doc, from, to),
    prefix: (before + line(from, before)).slice(-CONTEXT),
    suffix: (line(to, after) + after).slice(0, CONTEXT),
  };
}

/**
 * Where a lost passage is between `from` and `to`, if findWhole is sure. It
 * reads a little either side too, for the passage's context.
 */
function findText(doc, inFrom, inTo, lost) {
  const from = Math.max(0, inFrom - CONTEXT * 4);
  const to = Math.min(doc.content.size, inTo + CONTEXT * 4);
  let flat = "";
  const at = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText) {
      const start = Math.max(from, pos);
      const end = Math.min(to, pos + node.text.length);
      for (let p = start; p < end; p++) {
        flat += node.text[p - pos];
        at.push(p);
      }
    } else {
      // As textBetween reads it: a block, a raw one too, starts a line.
      if (node.isBlock && flat && !flat.endsWith("\n")) {
        flat += "\n";
        at.push(pos);
      }
      if (node.isLeaf && pos >= from && pos < to) {
        flat += "\ufffc";
        at.push(pos);
      }
    }
  });
  const found = findWhole({ text: flat }, lost);
  if (!found) return null;
  const range = { from: at[found[0]], to: at[found[1] - 1] + 1 };
  return range.from >= inFrom && range.to <= inTo ? range : null;
}

function decorations(doc, { ranges, items, emphasis }) {
  const placed = items.filter((t) => !t.hidden && ranges.get(t.id)?.from < ranges.get(t.id)?.to).map((t) => ({ id: t.id, at: [ranges.get(t.id).from, ranges.get(t.id).to] }));
  const resolved = new Set(items.filter((t) => t.resolved).map((t) => t.id));
  const out = [];
  for (const { at, ids } of groupQuotes(placed)) {
    const cls = ["post-quote"];
    if (ids.some((id) => emphasis.active.includes(id))) cls.push("is-active");
    if (ids.some((id) => emphasis.hover.includes(id))) cls.push("is-hover");
    if (ids.every((id) => resolved.has(id))) cls.push("is-resolved");
    const attrs = { class: cls.join(" "), "data-threads": ids.join(" ") };
    out.push(Decoration.inline(at[0], at[1], { nodeName: "mark", ...attrs }));
    // A passage in a raw block (a video's caption) has no text of the
    // editor's own to wrap, so the block is marked instead.
    doc.nodesBetween(at[0], at[1], (node, pos) => {
      if (node.type.name === "rawBlock") out.push(Decoration.node(pos, pos + node.nodeSize, { class: `editor-raw-quoted ${cls.slice(1).join(" ")}`, "data-threads": ids.join(" ") }));
    });
  }
  return DecorationSet.create(doc, out);
}

/**
 * The TipTap extension that keeps the passages, and the comments' handle on
 * it once the editor is up (`attach(editor)`):
 *
 *   setItems(items)     the threads, [{id, find, quote, gone, resolved, hidden}]:
 *                       `find` is {exact, prefix, suffix} to look for (the
 *                       anchor, or the reader's `quote` while there is none),
 *                       null for none; `gone` when the server has the
 *                       passage as deleted
 *   emphasize(a, h)     the thread ids in hand and hovered
 *   subscribe(fn)       fn(found) after every change, found as the comments
 *                       margin reads it: {placed, groups, marks, settled}
 *   quotes()            Map of id → {exact, prefix, suffix}, or {gone: true}
 *                       for a passage deleted entirely
 *   changes(quotes)     of those, the ones that differ from what the server
 *                       has, as the anchors endpoint takes them
 *   sent(changes)       the server has them now
 *   reset()             find every passage again (a new document)
 *   forget()            send every passage again after the next save
 *   findMissing()       look again for the threads with no passage, after a
 *                       change that may have brought their words back
 */
export function commentAnchors() {
  let view = null;
  const listeners = new Set();
  let frame = 0;
  let searched = new Set();
  // The quote or anchor each passage was found by, and what the server has
  // for it: what the comments say, then whatever it last took, an empty one
  // for gone. Apart, so a raw block an undo brings back after its deletion
  // was saved is its words again, not that deletion.
  let words = new Map();
  const known = new Map();
  const heard = new Map();
  // The words and context each passage had in the texts a restore or "Load
  // the latest" replaced, newest first: undoing one puts that text back,
  // with the passage on those words.
  const past = new Map();
  const PAST = 4;
  // Every context each thread has had that this session knows of, newest
  // first: its reader's quote, its anchors as the server had them and as
  // they were sent, the words a deleted passage was on and those `past`
  // keeps. A restored text can have its passage with the words before it as
  // one had them and those after it as another.
  const seen = new Map();
  const SEEN = 20;
  const see = (id, q) => {
    if (!q?.exact) return;
    const list = (seen.get(id) || []).filter((p) => p.exact !== q.exact || p.prefix !== q.prefix || p.suffix !== q.suffix);
    seen.set(id, [quoteOf(q), ...list].slice(0, SEEN));
  };

  const state = () => (view ? key.getState(view.state) : EMPTY);

  const found = () => {
    const { ranges, items } = state();
    const placed = new Set();
    const groups = new Map();
    const list = items.filter((t) => !t.hidden && ranges.get(t.id)?.from < ranges.get(t.id)?.to).map((t) => ({ id: t.id, at: [ranges.get(t.id).from, ranges.get(t.id).to] }));
    for (const { ids } of groupQuotes(list)) {
      for (const id of ids) {
        placed.add(id);
        groups.set(id, ids);
      }
    }
    const dom = view?.dom;
    // Looked up when asked: ProseMirror redraws a decoration's elements
    // whenever the text inside it changes.
    const marks = { get: (id) => (dom && placed.has(id) ? [...dom.querySelectorAll(`[data-threads~="${id}"]`)] : undefined) };
    return { key: items.map((t) => t.id).join(" "), placed, groups, marks, settled: true };
  };

  const emit = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const f = found();
      for (const fn of listeners) fn(f);
    });
  };

  /**
   * Each thread not looked for yet, looked for in the editor's text: by the
   * words it was last on (`lost`, for a passage deleted here), by those it
   * had in a text a restore replaced, then by its anchor, then by the
   * reader's own quote, so a thread whose passage was deleted and saved as
   * gone is found again when its words come back. Failing all of those, where
   * its words are with the words either side as some context it has had
   * has them (../place.js).
   */
  const search = (items, lost = new Map()) => {
    const add = [];
    const todo = items.filter((t) => !searched.has(t.id));
    if (!todo.length) return add;
    let index = null;
    for (const t of todo) {
      searched.add(t.id);
      const by = [lost.get(t.id), ...(past.get(t.id) || []), t.find, t.quote].filter((q) => q?.exact);
      let hit = null;
      for (const q of by) {
        index ??= indexText(view.dom);
        const at = findWhole(index, q);
        const range = at && toRange(view, index, at);
        if (range) {
          hit = [range, q];
          break;
        }
      }
      if (!hit && (by.length || seen.has(t.id))) {
        index ??= indexText(view.dom);
        const sides = findBySides(index, [...by, ...(seen.get(t.id) || [])]);
        const range = sides && toRange(view, index, sides.at);
        if (range) hit = [range, sides.quote];
      }
      if (!hit) continue;
      add.push([t.id, hit[0]]);
      words.set(t.id, quoteOf(hit[1]));
    }
    return add;
  };

  /** A passage's words in a text about to be replaced, kept for an undo that brings it back. */
  const keepPast = (id, q) => {
    if (!q?.exact) return;
    see(id, q);
    const list = (past.get(id) || []).filter((p) => p.exact !== q.exact || p.prefix !== q.prefix || p.suffix !== q.suffix);
    past.set(id, [quoteOf(q), ...list].slice(0, PAST));
  };

  /**
   * What the server has for each thread, as the comments say it, whenever
   * that changes: a passage then differing from it is sent. Kept through a
   * new document: it is the server's, not the text's.
   */
  const hear = (items) => {
    for (const t of items) {
      see(t.id, t.quote);
      see(t.id, t.find);
      const has = held(t);
      const said = JSON.stringify(has);
      if (heard.get(t.id) === said) continue;
      heard.set(t.id, said);
      if (has) known.set(t.id, has);
      else known.delete(t.id);
    }
  };

  /**
   * A change to the passages alone, outside the undo history. It can redraw
   * them, and a redraw puts ProseMirror's selection on the page: so the
   * browser's, when ProseMirror has not read it yet (a click, or Shift and an
   * arrow, a moment ago), goes with it rather than being put back as it was.
   */
  const send = (meta) => {
    const tr = view.state.tr.setMeta(key, meta).setMeta("addToHistory", false);
    const caret = unreadSelection(view);
    if (caret) tr.setSelection(caret);
    view.dispatch(tr);
  };

  const handle = {
    setItems(items) {
      if (!view) return;
      hear(items);
      send({ items, add: search(items) });
    },
    emphasize(active, hover) {
      const now = state().emphasis;
      if (!view || (same(now.active, active) && same(now.hover, hover))) return;
      // A click on a passage makes its thread the one in hand before the
      // browser has told ProseMirror where the click put the caret: sent
      // with it, the caret stays where the click put it.
      send({ emphasis: { active: active || [], hover: hover || [] } });
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(found());
      return () => listeners.delete(fn);
    },
    quotes() {
      const out = new Map();
      if (!view) return out;
      const index = indexText(view.dom);
      for (const [id, r] of state().ranges) {
        let q = null;
        // A passage in a raw block keeps the words it was found by for as
        // long as the block is there: its text can't be edited, and the
        // block's whole range is not the reader's words.
        if (r.from < r.to && words.has(id) && holdsAtom(view.state.doc, r)) q = words.get(id);
        else if (r.from < r.to) {
          try {
            q = quoteFromRange(index, domRange(view, r.from, r.to), MAX);
          } catch (err) {
            console.warn("comments: could not read a passage", err);
            continue;
          }
        }
        out.set(id, q ? { exact: q.exact, prefix: q.prefix, suffix: q.suffix } : { gone: true });
      }
      return out;
    },
    changes(quotes) {
      const out = [];
      for (const [id, q] of quotes) {
        const was = known.get(id);
        const now = q.gone ? { exact: "", prefix: "", suffix: "" } : q;
        if (!was || (was.exact === now.exact && was.prefix === now.prefix && was.suffix === now.suffix)) continue;
        out.push({ thread: id, ...now });
      }
      return out;
    },
    sent(changes) {
      for (const { thread, exact, prefix, suffix } of changes) {
        known.set(thread, { exact, prefix, suffix });
        see(thread, { exact, prefix, suffix });
      }
    },
    reset() {
      searched = new Set();
      words = new Map();
      if (!view) return;
      const { items, ranges } = state();
      // The text was just replaced: each passage was in the one before it.
      for (const [id, r] of ranges) keepPast(id, r.lost);
      send({ reset: true });
      handle.setItems(items);
    },
    // After "Keep mine": the server may have places another session sent, so
    // every passage is sent again, a deleted one as deleted.
    forget() {
      for (const id of state().ranges.keys()) known.set(id, UNSENT);
    },
    // A thread with no passage, never found or deleted, is looked for again
    // in the text as it is now: an undo, a restore, a paste or typing may
    // have brought its words back.
    findMissing() {
      if (!view) return;
      const { ranges, items } = state();
      const lost = new Map();
      const missing = items.filter((t) => {
        const r = ranges.get(t.id);
        return searched.has(t.id) && !(r?.from < r?.to) && (r?.lost?.exact || past.has(t.id) || seen.has(t.id) || t.find?.exact || t.quote?.exact);
      });
      if (!missing.length) return;
      for (const t of missing) {
        searched.delete(t.id);
        if (ranges.get(t.id)?.lost) {
          lost.set(t.id, ranges.get(t.id).lost);
          see(t.id, ranges.get(t.id).lost);
        }
      }
      const add = search(items, lost);
      if (add.length) send({ add });
    },
    get dom() {
      return view?.dom ?? null;
    },
  };

  const plugin = new Plugin({
    key,
    state: {
      init: () => EMPTY,
      apply(tr, prev, _old, next) {
        const meta = tr.getMeta(key);
        let ranges = mapRanges(prev.ranges, tr);
        let { items, emphasis } = prev;
        if (meta?.reset) ranges = new Map();
        if (meta?.add?.length) {
          ranges = new Map(ranges);
          for (const [id, r] of meta.add) ranges.set(id, r);
        }
        if (meta?.items) items = meta.items;
        if (meta?.emphasis) emphasis = meta.emphasis;
        if (!meta && !tr.docChanged) return prev;
        const s = { ranges, items, emphasis };
        return { ...s, deco: decorations(next.doc, s) };
      },
    },
    props: {
      decorations: (s) => key.getState(s).deco,
    },
    view(v) {
      view = v;
      return {
        update: (_v, prevState) => {
          if (key.getState(v.state) !== key.getState(prevState)) emit();
        },
        destroy: () => {
          cancelAnimationFrame(frame);
          view = null;
        },
      };
    },
  });

  const extension = Extension.create({
    name: "commentAnchors",
    addProseMirrorPlugins: () => [plugin],
  });

  return { extension, handle };
}

/**
 * [start, end) of an indexText index as a document range, or null. An end in
 * a raw block (words in a video's caption) is that whole block: the editor
 * has no positions inside it.
 */
export function toRange(view, index, [start, end]) {
  let i = start;
  while (i < end && !index.nodes[i]) i++;
  let j = end - 1;
  while (j > i && !index.nodes[j]) j--;
  if (i >= end || !index.nodes[j]) return null;
  const from = atomAround(view, index.nodes[i])?.from ?? view.posAtDOM(index.nodes[i], index.offsets[i], 1);
  const to = atomAround(view, index.nodes[j])?.to ?? view.posAtDOM(index.nodes[j], index.offsets[j] + 1, -1);
  return from < to ? { from, to } : null;
}

/** The block atom whose drawing holds a DOM node, as a document range, or null. */
function atomAround(view, dom) {
  let found = null;
  view.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.isBlock && node.isAtom && view.nodeDOM(pos)?.contains(dom)) found = { from: pos, to: pos + node.nodeSize };
    return !node.isAtom;
  });
  return found;
}

const holdsAtom = (doc, { from, to }) => {
  let any = false;
  doc.nodesBetween(from, to, (node) => {
    if (node.isBlock && node.isAtom) any = true;
    return !any;
  });
  return any;
};

/**
 * The browser's selection in the editor's text when ProseMirror has not
 * read it yet, as a TextSelection; else null. ProseMirror reads it on
 * "selectionchange", which the browser sends a moment after a click or a
 * key moved it.
 */
export function unreadSelection(view) {
  const sel = view.root.getSelection?.() ?? document.getSelection();
  if (!view.hasFocus() || !sel?.anchorNode || !view.dom.contains(sel.anchorNode) || !view.dom.contains(sel.focusNode)) return null;
  let anchor;
  let head;
  try {
    anchor = view.posAtDOM(sel.anchorNode, sel.anchorOffset);
    head = view.posAtDOM(sel.focusNode, sel.focusOffset);
  } catch {
    return null;
  }
  const { doc, selection } = view.state;
  if (anchor < 0 || head < 0 || !doc.resolve(anchor).parent.inlineContent || !doc.resolve(head).parent.inlineContent) return null;
  const next = TextSelection.create(doc, anchor, head);
  return next.eq(selection) ? null : next;
}

/**
 * Takes the browser's selection into the editor's state when ProseMirror has
 * not read it yet, so a command acts on the selection the page shows.
 */
export function readSelection(view) {
  const sel = unreadSelection(view);
  if (sel) view.dispatch(view.state.tr.setSelection(sel).setMeta("addToHistory", false));
}

/** A document range as a DOM Range over the editor's text. */
function domRange(view, from, to) {
  const a = view.domAtPos(from, 1);
  const b = view.domAtPos(to, -1);
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}
