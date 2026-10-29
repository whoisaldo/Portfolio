// src/front/private/editor/schema.js: what a draft can hold in the editor.
//
// The pieces of a post as TipTap (ProseMirror) has them: paragraphs, headings,
// lists, quotes, code, rules, and inline bold, italic, strikethrough, code,
// links, pictures, line breaks and Ali's highlight colours. Everything else
// in a draft's Markdown, the video's <figure>, an embed's placeholder, a
// table, is a "raw" block: shown as the post shows it, not editable, and
// written back exactly as it came (./markdown.js).
//
// No React and no imports from the site that need Vite, so the tests can
// build the same schema in Node.
import { Extension, Mark, Node } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { StarterKit } from "@tiptap/starter-kit";
import { Code } from "@tiptap/extension-code";
import { Link } from "@tiptap/extension-link";
import { marked } from "marked";

/** Ali's highlight colours, as `<span data-hl="…">` stores them. */
export const COLORS = ["yellow", "green", "blue", "pink", "purple"];

/**
 * A highlight. One colour at a time: a mark of a type excludes another of the
 * same type, so highlights never nest, and marks live on text inside a block,
 * so one never crosses a block's end.
 */
const Highlight = Mark.create({
  name: "highlight",
  addStorage: () => ({ last: "yellow" }),
  addAttributes() {
    return {
      color: {
        default: "yellow",
        parseHTML: (el) => el.getAttribute("data-hl"),
        renderHTML: (attrs) => ({ "data-hl": attrs.color }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-hl]", getAttrs: (el) => (COLORS.includes(el.getAttribute("data-hl")) ? null : false) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
  addCommands() {
    return {
      setHighlight:
        (color) =>
        ({ commands }) => {
          this.storage.last = color;
          return commands.setMark(this.name, { color });
        },
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
  addKeyboardShortcuts() {
    // Docs' "highlight again": the last colour picked.
    return { "Mod-Shift-h": () => this.editor.commands.setHighlight(this.storage.last) };
  },
});

/**
 * A picture in the text, `![alt](src)`. `src` stays the address the post
 * will have, /blog/<slug>/<file>; `options.show` is where the editor loads
 * it from. A picture pasted from elsewhere is kept only if it is this
 * draft's own (`options.own` names it), so nothing from another site is
 * hotlinked into a post.
 */
const Picture = Node.create({
  name: "image",
  inline: true,
  group: "inline",
  atom: true,
  draggable: true,
  addOptions: () => ({ show: (src) => src, own: (src) => src }),
  addAttributes() {
    return {
      src: { default: null, parseHTML: (el) => this.options.own(el.getAttribute("data-src") || el.getAttribute("src")) },
      alt: { default: "", parseHTML: (el) => el.getAttribute("alt") || "" },
      title: { default: null, parseHTML: (el) => el.getAttribute("title") },
    };
  },
  parseHTML() {
    return [{ tag: "img[src]", getAttrs: (el) => (this.options.own(el.getAttribute("data-src") || el.getAttribute("src")) ? null : false) }];
  },
  renderHTML({ node }) {
    const { src, alt, title } = node.attrs;
    return ["img", { src: this.options.show(src), "data-src": src, alt, ...(title ? { title } : {}) }];
  },
});

/**
 * Markdown the editor does not model, kept as it was written. It shows as the
 * post shows it (options.render, the private blog's media rewrite included)
 * and cannot be typed into; it can be selected, moved and deleted whole.
 *
 * Copied, it carries its Markdown in data-markdown. Pasted back, that is
 * taken only for a block this draft has had (options.known), so a page that
 * plants such a <div> in what is copied from it cannot put HTML in a draft.
 */
const Raw = Node.create({
  name: "rawBlock",
  group: "block",
  atom: true,
  selectable: true,
  addOptions: () => ({ render: (source) => marked.parse(source), known: new Set() }),
  addAttributes() {
    return { source: { default: "", rendered: false } };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-markdown]",
        getAttrs: (el) => {
          const source = el.getAttribute("data-markdown");
          return this.options.known.has(source) ? { source } : false;
        },
      },
    ];
  },
  renderHTML({ node }) {
    const dom = document.createElement("div");
    dom.dataset.markdown = node.attrs.source;
    dom.innerHTML = this.options.render(node.attrs.source);
    return { dom };
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "editor-raw";
      dom.contentEditable = "false";
      dom.innerHTML = this.options.render(node.attrs.source);
      return {
        dom,
        // Its contents are the post's, and an embed's are React's: nothing
        // that changes in there is a change to the document.
        ignoreMutation: () => true,
        // A video's controls and an embed's buttons work as they do on the page.
        stopEvent: (e) => Boolean(e.target.closest?.("video, audio, button, input, select, textarea, a, [data-embed] *")),
      };
    };
  },
});

/** A list remembers whether its items were spaced apart ("loose"), as Markdown says. */
const Loose = Extension.create({
  name: "looseLists",
  addGlobalAttributes: () => [
    { types: ["bulletList", "orderedList"], attributes: { loose: { default: false, rendered: false } } },
  ],
});

/**
 * The draft's title, date and summary, {title, date, summary}, kept on the
 * document as well as in the fields, so a change to them made in the same
 * transaction as one to the text (restoring a version) is undone and redone
 * with it. Never written to the Markdown.
 */
const Meta = Extension.create({
  name: "draftMeta",
  addGlobalAttributes: () => [{ types: ["doc"], attributes: { meta: { default: null, rendered: false } } }],
});

/**
 * A transaction putting a whole draft in the editor, `doc` (JSON, as
 * ./markdown.js makes it) for the text and `meta` for the title, date and
 * summary: one step of its own in the undo history, so Cmd+Z brings all four
 * back together.
 */
export function replaceAll(state, doc, meta) {
  const next = state.schema.nodeFromJSON(doc);
  return closeHistory(state.tr.replaceWith(0, state.doc.content.size, next.content).setDocAttribute("meta", meta));
}

/** The title, date and summary a transaction leaves on the document, when it changed them; else null. */
export const metaChange = (tr) => (tr.doc.attrs.meta && tr.doc.attrs.meta !== tr.before.attrs.meta ? tr.doc.attrs.meta : null);

/**
 * Markdown's link title, `[text](href "title")`, which TipTap's link has no
 * place for. A pasted link's target, rel and class are not Markdown, so they
 * are not read.
 */
const TitledLink = Link.extend({
  addAttributes() {
    const none = { default: null, parseHTML: () => null };
    return { ...this.parent?.(), target: none, rel: none, class: none, title: { default: null } };
  },
});

/**
 * The extensions, with what only the page knows: `show(src)` maps a picture
 * to where it loads from, `own(src)` says which pasted pictures are the
 * draft's (returning its stored address), `render(source)` draws a raw block,
 * `known` lists the raw blocks a paste may bring back.
 */
export function extensions({ show, own, render, known } = {}) {
  return [
    StarterKit.configure({
      // Not Markdown: nothing could write it down.
      underline: false,
      code: false,
      link: false,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
    }),
    // Markdown's code can sit inside a link, bold or a highlight.
    Code.extend({ excludes: "" }),
    TitledLink.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { target: null, rel: null, class: null },
    }),
    Highlight,
    Picture.configure({ ...(show && { show }), ...(own && { own }) }),
    Raw.configure({ ...(render && { render }), ...(known && { known }) }),
    Loose,
    Meta,
  ];
}
