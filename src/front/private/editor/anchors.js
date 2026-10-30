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
// text that changed". Undoing the deletion brings the words back inside it.
// A passage in a raw block (a video's caption) is the whole block, outlined;
// deleting the block deletes it.
//
// quotes() reads each passage's words and context off the editor's DOM as a
// reader's selection would have them, for the anchors the server keeps after
// a save (./DraftEditor.jsx).
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { findQuote, groupQuotes, indexText, quoteFromRange } from "../../quotes.js";

const key = new PluginKey("commentAnchors");
// As the read view quotes a selection.
const MAX = 500;

const EMPTY = { ranges: new Map(), items: [], emphasis: { active: [], hover: [] }, deco: DecorationSet.empty };

const same = (a, b) => (a || []).length === (b || []).length && (a || []).every((x, i) => x === b[i]);

/** Undo and redo carry this meta (prosemirror-history's plugin key). */
const fromHistory = (tr) => Boolean(tr.getMeta("history$"));

/**
 * Each passage through a change. Words typed just before or just after a
 * passage are not part of it. A passage whose words are all deleted is empty,
 * and remembers them and the words either side (`lost`): an undo or redo
 * that puts them back, even one that replaces the whole text (after "Load the
 * latest"), finds them again where the change put text back, and only there,
 * by the same words-and-context rule the comments use (findQuote).
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
 * Where a lost passage is between `from` and `to`, if findQuote is sure. It
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
  const found = lost.exact && findQuote({ text: flat }, lost);
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
 *   setItems(items)     the threads, [{id, find, resolved, hidden}]: `find` is
 *                       {exact, prefix, suffix} to look for, null for none
 *   emphasize(a, h)     the thread ids in hand and hovered
 *   subscribe(fn)       fn(found) after every change, found as the comments
 *                       margin reads it: {placed, groups, marks, settled}
 *   quotes()            Map of id → {exact, prefix, suffix}, or {gone: true}
 *                       for a passage deleted entirely
 *   changes(quotes)     of those, the ones that differ from what the server
 *                       has, as the anchors endpoint takes them
 *   sent(changes)       the server has them now
 *   reset()             find every passage again (a new document)
 *   findMissing()       look again for the threads with no passage at all,
 *                       after an undo or redo
 */
export function commentAnchors() {
  let view = null;
  const listeners = new Set();
  let frame = 0;
  let searched = new Set();
  // The quote or anchor each passage was found by, and what the server has
  // for it: that, then whatever it last took, an empty one for gone. Apart,
  // so a raw block an undo brings back after its deletion was saved is its
  // words again, not that deletion.
  let words = new Map();
  let known = new Map();

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

  /** Each thread not looked for yet, looked for in the editor's text. */
  const search = (items) => {
    const add = [];
    const todo = items.filter((t) => !searched.has(t.id));
    if (!todo.length) return add;
    let index = null;
    for (const t of todo) {
      searched.add(t.id);
      if (!t.find?.exact) continue;
      index ??= indexText(view.dom);
      const at = findQuote(index, t.find);
      const range = at && toRange(view, index, at);
      if (range) {
        add.push([t.id, range]);
        const q = { exact: t.find.exact, prefix: t.find.prefix || "", suffix: t.find.suffix || "" };
        words.set(t.id, q);
        known.set(t.id, q);
      }
    }
    return add;
  };

  const handle = {
    setItems(items) {
      if (!view) return;
      const tr = view.state.tr.setMeta(key, { items, add: search(items) });
      view.dispatch(tr.setMeta("addToHistory", false));
    },
    emphasize(active, hover) {
      const now = state().emphasis;
      if (!view || (same(now.active, active) && same(now.hover, hover))) return;
      const tr = view.state.tr.setMeta(key, { emphasis: { active: active || [], hover: hover || [] } }).setMeta("addToHistory", false);
      // A click on a passage makes its thread the one in hand before the
      // browser has told ProseMirror where the click put the caret (that
      // comes with "selectionchange", after the click). Redrawn without it,
      // the passage would get the caret back where it was before the click.
      const caret = unreadSelection(view);
      if (caret) tr.setSelection(caret);
      view.dispatch(tr);
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
      for (const { thread, exact, prefix, suffix } of changes) known.set(thread, { exact, prefix, suffix });
    },
    reset() {
      searched = new Set();
      words = new Map();
      known = new Map();
      if (!view) return;
      const { items } = state();
      view.dispatch(view.state.tr.setMeta(key, { reset: true }).setMeta("addToHistory", false));
      handle.setItems(items);
    },
    // A thread not found in a version that was restored has no range to map,
    // so undoing the restore cannot bring its passage back by itself: it is
    // looked for again in the text the undo brought back.
    findMissing() {
      if (!view) return;
      const { ranges, items } = state();
      const missing = items.filter((t) => !ranges.has(t.id) && searched.has(t.id));
      if (!missing.length) return;
      for (const t of missing) searched.delete(t.id);
      handle.setItems(items);
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
 * read it yet, as a TextSelection; else null.
 */
function unreadSelection(view) {
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

/** A document range as a DOM Range over the editor's text. */
function domRange(view, from, to) {
  const a = view.domAtPos(from, 1);
  const b = view.domAtPos(to, -1);
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}
