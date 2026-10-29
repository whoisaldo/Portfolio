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
//
// quotes() reads each passage's words and context off the editor's DOM as a
// reader's selection would have them, for the anchors the server keeps after
// a save (./DraftEditor.jsx).
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { findQuote, groupQuotes, indexText, quoteFromRange } from "../../quotes.js";

const key = new PluginKey("commentAnchors");
// As the read view quotes a selection.
const MAX = 500;

const EMPTY = { ranges: new Map(), items: [], emphasis: { active: [], hover: [] }, deco: DecorationSet.empty };

const same = (a = [], b = []) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Undo and redo carry this meta (prosemirror-history's plugin key). */
const fromHistory = (tr) => Boolean(tr.getMeta("history$"));

function mapRanges(ranges, tr) {
  if (!tr.docChanged) return ranges;
  const next = new Map();
  const undoing = fromHistory(tr);
  for (const [id, r] of ranges) {
    if (r.from < r.to) {
      // Words typed just before or just after a passage are not part of it.
      const from = tr.mapping.map(r.from, 1);
      const to = tr.mapping.map(r.to, -1);
      next.set(id, from < to ? { from, to } : { from: to, to: to });
    } else {
      // An emptied passage stays empty, unless an undo puts words back where it was.
      next.set(id, undoing ? { from: tr.mapping.map(r.from, -1), to: tr.mapping.map(r.to, 1) } : { from: tr.mapping.map(r.from), to: tr.mapping.map(r.from) });
    }
  }
  return next;
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
 *   reset()             find every passage again (a new document)
 */
export function commentAnchors() {
  let view = null;
  const listeners = new Set();
  let frame = 0;
  let searched = new Set();

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
      if (range) add.push([t.id, range]);
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
      view.dispatch(view.state.tr.setMeta(key, { emphasis: { active: active || [], hover: hover || [] } }).setMeta("addToHistory", false));
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
        if (r.from < r.to) {
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
    reset() {
      searched = new Set();
      if (!view) return;
      const { items } = state();
      view.dispatch(view.state.tr.setMeta(key, { reset: true }).setMeta("addToHistory", false));
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

/** [start, end) of an indexText index as a document range, or null. */
export function toRange(view, index, [start, end]) {
  let i = start;
  while (i < end && !index.nodes[i]) i++;
  let j = end - 1;
  while (j > i && !index.nodes[j]) j--;
  if (i >= end || !index.nodes[j]) return null;
  const from = view.posAtDOM(index.nodes[i], index.offsets[i], 1);
  const to = view.posAtDOM(index.nodes[j], index.offsets[j] + 1, -1);
  return from < to ? { from, to } : null;
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
