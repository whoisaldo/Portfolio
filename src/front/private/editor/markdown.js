// src/front/private/editor/markdown.js: a draft's Markdown into the editor and
// back out.
//
// In: the body is lexed by the same `marked` the site renders it with, and
// the editor's document is built from its tokens. A top-level block the
// editor cannot hold exactly (raw HTML, a table, a link reference, a task
// list, a paragraph with inline HTML other than a highlight or the tags
// written below) becomes a raw block that keeps its Markdown byte for byte.
//
// Out: each block is written as Markdown again. A block nobody touched is
// written as it came, from `keep` (a WeakMap from the editor's own node
// objects, which ProseMirror reuses for every block a change does not reach),
// so saving after a one-word fix changes one paragraph of the file, not all
// of them. An edited paragraph is checked by reading it back; if it would
// read differently, italic is written with underscores instead, and failing
// that the marks are written as HTML tags (<strong>, <em>, <a href>…).
//
// Before the editor opens, canEdit() writes the whole draft without `keep`
// and compares what the two render to: their words, their formatting and
// their raw HTML blocks. If anything differs, the editor does not open.
import { marked } from "marked";
import { indexText } from "../../quotes.js";

class Unsupported extends Error {}

const HL_OPEN = /^<span data-hl="(yellow|green|blue|pink|purple)">$/;
const ENTITY = /&(?:#(\d+)|#x([0-9a-f]+)|([a-z][a-z0-9]*));/gi;

/** HTML character references in Markdown text, as the browser will show them. */
function decode(s) {
  return s.replace(ENTITY, (m, dec, hex, name) => {
    try {
      if (dec) return String.fromCodePoint(Number(dec)) || "\uFFFD";
      if (hex) return String.fromCodePoint(parseInt(hex, 16)) || "\uFFFD";
    } catch {
      return "\uFFFD";
    }
    // A textarea reads character references and no tags.
    const el = document.createElement("textarea");
    el.innerHTML = `&${name};`;
    return el.value;
  });
}

const trimRaw = (raw) => raw.replace(/\n+$/, "");

/**
 * The editor's document for a draft's body, as ProseMirror JSON, and each
 * top-level block's Markdown as it was written, in the same order.
 */
export function fromMarkdown(md) {
  const content = [];
  const raws = [];
  for (const t of marked.lexer(md)) {
    if (t.type === "space") continue;
    let node;
    try {
      [node] = block(t);
    } catch (err) {
      if (!(err instanceof Unsupported)) throw err;
      node = null;
    }
    content.push(node || { type: "rawBlock", attrs: { source: trimRaw(t.raw) } });
    raws.push(trimRaw(t.raw));
  }
  if (!content.length) content.push({ type: "paragraph" });
  return { doc: { type: "doc", content }, raws };
}

function blocks(tokens) {
  return tokens.flatMap(block);
}

function block(t) {
  switch (t.type) {
    case "space":
      return [];
    case "paragraph":
      return [{ type: "paragraph", ...inlineContent(t.tokens) }];
    case "text":
      // A tight list item's text.
      return [{ type: "paragraph", ...inlineContent(t.tokens || [{ type: "text", text: t.text }]) }];
    case "heading":
      return [{ type: "heading", attrs: { level: t.depth }, ...inlineContent(t.tokens) }];
    case "code":
      return [{ type: "codeBlock", attrs: { language: t.lang || null }, ...(t.text ? { content: [{ type: "text", text: t.text }] } : {}) }];
    case "hr":
      return [{ type: "horizontalRule" }];
    case "blockquote": {
      const content = blocks(t.tokens);
      return [{ type: "blockquote", content: content.length ? content : [{ type: "paragraph" }] }];
    }
    case "list": {
      if (t.items.some((i) => i.task)) throw new Unsupported();
      const items = t.items.map((item) => {
        const content = blocks(item.tokens);
        if (!content.length) content.push({ type: "paragraph" });
        if (content[0].type !== "paragraph") throw new Unsupported();
        return { type: "listItem", content };
      });
      return [
        t.ordered
          ? { type: "orderedList", attrs: { start: t.start === "" ? 1 : t.start, loose: t.loose }, content: items }
          : { type: "bulletList", attrs: { loose: t.loose }, content: items },
      ];
    }
    default:
      // html, table, def and anything newer: kept as written.
      throw new Unsupported();
  }
}

function inlineContent(tokens) {
  const out = [];
  const state = { open: [], depth: 0 };
  inline(tokens || [], [], out, state);
  if (state.open.length) throw new Unsupported();
  return out.length ? { content: out } : {};
}

/**
 * The inline tags a draft may hold, as the writer below writes them where
 * Markdown's own can't say it (a!**b** is not bold): exactly these, nothing
 * else, so any other inline HTML still keeps its paragraph raw.
 */
const TAGS = { "<strong>": "bold", "<em>": "italic", "<del>": "strike", "<code>": "code" };
const A_OPEN = /^<a href="([^"<>]*)"(?: title="([^"<>]*)")?>$/;
const CLOSE = { highlight: "</span>", link: "</a>", bold: "</strong>", italic: "</em>", strike: "</del>", code: "</code>" };

/** An opening tag as a mark, or null. */
function openTag(raw) {
  const hl = HL_OPEN.exec(raw);
  if (hl) return { type: "highlight", attrs: { color: hl[1] } };
  if (TAGS[raw]) return { type: TAGS[raw] };
  const a = A_OPEN.exec(raw);
  return a ? { type: "link", attrs: { href: decode(a[1]), title: a[2] ? decode(a[2]) : null } } : null;
}

/** Marks plus one more, which must be of a type not there yet. */
function plus(marks, mark) {
  if (marks.some((m) => m.type === mark.type)) throw new Unsupported();
  return [...marks, mark];
}

function inline(tokens, marks, out, state) {
  // Tags opened and not yet closed, each closed where it was opened: not
  // inside a ** or a link it began outside of.
  const withOpen = () => state.open.reduce((all, o) => plus(all, o.mark), marks);
  const text = (s) => {
    // A soft line break is a space on the page.
    s = s.replace(/\n/g, " ");
    if (s) out.push({ type: "text", text: s, marks: withOpen() });
  };
  for (const t of tokens) {
    switch (t.type) {
      case "text":
        if (t.tokens) inline(t.tokens, marks, out, state);
        else text(decode(t.text));
        break;
      case "escape":
        text(decode(t.text));
        break;
      case "strong":
      case "em":
      case "del":
      case "link": {
        const mark =
          t.type === "link"
            ? { type: "link", attrs: { href: t.href, title: t.title || null } }
            : { type: { strong: "bold", em: "italic", del: "strike" }[t.type] };
        state.depth++;
        inline(t.tokens, plus(marks, mark), out, state);
        state.depth--;
        break;
      }
      case "codespan":
        if (t.text) out.push({ type: "text", text: t.text, marks: plus(withOpen(), { type: "code" }) });
        break;
      case "image":
        out.push({ type: "image", attrs: { src: t.href, alt: t.text || "", title: t.title || null }, marks: withOpen() });
        break;
      case "br":
        out.push({ type: "hardBreak", marks: withOpen() });
        break;
      case "html": {
        const mark = openTag(t.raw);
        const top = state.open[state.open.length - 1];
        if (mark) {
          plus(withOpen(), mark);
          state.open.push({ mark, depth: state.depth });
        } else if (top && t.raw === CLOSE[top.mark.type] && top.depth === state.depth) state.open.pop();
        else throw new Unsupported();
        break;
      }
      default:
        throw new Unsupported();
    }
  }
}

// ---- out --------------------------------------------------------------------

// Outermost first. Code is innermost: nothing is read inside a code span.
const RANK = { highlight: 0, link: 1, bold: 2, italic: 3, strike: 4, code: 5 };
const FLANKED = new Set(["bold", "italic", "strike"]);

/**
 * The document as Markdown. `keep`, a WeakMap from top-level nodes to the
 * Markdown they were read from, writes the untouched ones as they were.
 */
export function toMarkdown(doc, { keep } = {}) {
  const out = [];
  let prev = null; // {type, marker} of the last block written
  doc.forEach((node) => {
    let s = keep?.get(node);
    const list = node.type.name === "bulletList" || node.type.name === "orderedList";
    let marker = list ? (s != null ? listMarker(node, s) : null) : null;
    // Two lists of one kind next to each other are one list in Markdown,
    // unless the second uses another marker.
    if (list && prev?.type === node.type.name && (marker == null || marker === prev.marker)) {
      marker = otherMarker(node, prev.marker);
      s = null;
    }
    if (s == null) {
      if (list) marker ??= otherMarker(node, null);
      s = writeBlock(node, marker);
    }
    if (s == null) return;
    out.push(s);
    prev = { type: node.type.name, marker };
  });
  return out.length ? `${out.join("\n\n")}\n` : "";
}

function listMarker(node, raw) {
  if (node.type.name === "bulletList") return raw.trimStart()[0];
  return /^\s*\d+([.)])/.exec(raw)?.[1] ?? ".";
}

function otherMarker(node, used) {
  if (node.type.name === "bulletList") return used === "-" ? "*" : "-";
  return used === "." ? ")" : ".";
}

function writeBlock(node, marker) {
  switch (node.type.name) {
    case "paragraph": {
      const s = writeInline(node);
      return s.trim() ? s : null;
    }
    case "heading": {
      // A heading has no line breaks, and #s at its end would be read as
      // closing the heading.
      const s = writeInline(node, { breaks: " " }).replace(/(^|\s)(#+)(\s*)$/, "$1\\$2$3");
      return s.trim() ? `${"#".repeat(node.attrs.level)} ${s}` : null;
    }
    case "codeBlock": {
      const text = node.textContent;
      const run = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
      const fence = "`".repeat(run + 1);
      return `${fence}${node.attrs.language || ""}\n${text}\n${fence}`;
    }
    case "blockquote": {
      const inner = [];
      node.forEach((child) => {
        const s = writeBlock(child, otherMarker(child, null));
        if (s != null) inner.push(s);
      });
      return inner.join("\n\n").split("\n").map((l) => (l ? `> ${l}` : ">")).join("\n") || ">";
    }
    case "horizontalRule":
      return "---";
    case "bulletList":
    case "orderedList":
      return writeList(node, marker);
    case "rawBlock":
      return node.attrs.source;
    default:
      throw new Error(`Cannot write a ${node.type.name} as Markdown`);
  }
}

function writeList(node, marker) {
  const ordered = node.type.name === "orderedList";
  // An item with two paragraphs in a row can only be written loose.
  let loose = node.attrs.loose;
  node.forEach((item) => {
    for (let i = 1; i < item.childCount; i++) {
      if (item.child(i).type.name === "paragraph" && item.child(i - 1).type.name === "paragraph") loose = true;
    }
  });
  const items = [];
  node.forEach((item, _, i) => {
    const mark = ordered ? `${node.attrs.start + i}${marker} ` : `${marker} `;
    const indent = " ".repeat(mark.length);
    const parts = [];
    item.forEach((child) => parts.push(writeBlock(child, otherMarker(child, null)) ?? ""));
    const lines = parts.join(loose ? "\n\n" : "\n").split("\n");
    items.push([mark + lines[0], ...lines.slice(1).map((l) => (l ? indent + l : ""))].join("\n").trimEnd());
  });
  return items.join(loose ? "\n\n" : "\n");
}

/**
 * The ways to write a paragraph's marks, Markdown's own first. Where those
 * can't say it (a**!b** is not bold, its ** being between a letter and a
 * mark), the marks are written as the HTML tags `marked` passes through,
 * which look the same on the page and read back into the same marks.
 */
const FORMS = [
  { italic: "*", tags: new Set() },
  { italic: "_", tags: new Set() },
  { italic: "*", tags: new Set(["bold", "italic", "strike"]) },
  { italic: "*", tags: new Set(["bold", "italic", "strike", "link"]) },
  { italic: "*", tags: new Set(["bold", "italic", "strike", "link", "code"]) },
];

/**
 * A paragraph's or heading's text as Markdown, checked by reading it back:
 * the first form that reads back as the same text with the same marks.
 */
function writeInline(node, opts = {}) {
  for (const form of FORMS) {
    const s = inlineMarkdown(node, { ...opts, ...form });
    if (!node.content.size || sameInline(s, node, opts)) return s;
  }
  // Not seen in testing: the last form has nothing left that depends on its
  // neighbours. Should it happen, the draft is not saved rather than changed.
  throw new Error("This paragraph's formatting can't be written as Markdown");
}

function sameInline(md, node, { breaks } = {}) {
  let read;
  try {
    const tokens = marked.lexer(md).filter((t) => t.type !== "space");
    if (tokens.length !== 1 || tokens[0].type !== "paragraph") return false;
    read = inlineContent(tokens[0].tokens).content || [];
  } catch {
    return false;
  }
  return signature(read) === signature(node.toJSON().content || [], breaks);
}

/**
 * Inline content, character by character with its marks, to compare two.
 * Bold, italic and strikethrough on a space at the edge of a run are written
 * outside it (inlineMarkdown), so they are not compared. A heading has no
 * line breaks, and writes each as a space (`breaks`).
 */
function signature(content, breaks) {
  const markKey = (m) => (m.type === "link" ? `link:${m.attrs.href}|${m.attrs.title || ""}` : m.type === "highlight" ? `hl:${m.attrs.color}` : m.type);
  const marks = (n, ch) => (n.marks || []).filter((m) => !(FLANKED.has(m.type) && /\s/.test(ch))).map(markKey).sort().join(",");
  const sig = [];
  for (const n of content) {
    // A line break in text is read back as the space it shows as.
    if (n.type === "text") for (const ch of n.text.replace(/\n/g, " ")) sig.push([marks(n, ch), ch]);
    else if (n.type === "hardBreak" && breaks === " ") sig.push([marks(n, " "), " "]);
    else sig.push([marks(n), `<${n.type}:${n.attrs?.src || ""}|${n.attrs?.alt || ""}>`]);
  }
  // Space and line breaks at the end, and space at the start, are not
  // written (or not read): a paragraph's text is trimmed.
  while (sig.length && (sig[sig.length - 1][1] === "<hardBreak:|>" || /^\s$/.test(sig[sig.length - 1][1]))) sig.pop();
  while (sig.length && /^\s$/.test(sig[0][1])) sig.shift();
  return JSON.stringify(sig);
}

function inlineMarkdown(node, { breaks = "\\\n", italic, tags }) {
  const items = [];
  node.forEach((child) => items.push(child));
  // Line breaks at the end of a paragraph show nothing, and a backslash
  // there would.
  while (items.length && items[items.length - 1].type.name === "hardBreak") items.pop();

  const sorted = (marks) => [...marks].sort((a, b) => RANK[a.type.name] - RANK[b.type.name]);
  const has = (marks, m) => marks.some((x) => x.eq(m));
  const segments = [];
  for (const child of items) {
    const marks = sorted(child.marks);
    // A line break inside text shows on the page as a space, and written as
    // one it can't start a block or end in a hard break.
    const text = child.isText ? child.text.replace(/\r\n?|\n/g, " ") : null;
    if (!child.isText || marks.some((m) => m.type.name === "code")) segments.push({ node: child, text, marks });
    else for (const part of text.match(/\s+|\S+/g)) segments.push({ text: part, marks, space: /^\s/.test(part) });
  }
  // ** bold ** is not bold in Markdown: bold, italic and strikethrough on
  // spaces are kept only between characters that have them too. Decided by
  // the characters either side alone, so writing what was read writes the
  // same again.
  const left = [];
  for (let i = 0, last = []; i < segments.length; i++) {
    left[i] = last;
    if (!segments[i].space) last = segments[i].marks;
  }
  for (let i = segments.length - 1, next = []; i >= 0; i--) {
    const seg = segments[i];
    if (!seg.space) next = seg.marks;
    else seg.marks = seg.marks.filter((m) => !FLANKED.has(m.type.name) || (has(left[i], m) && has(next, m)));
  }

  let out = "";
  let open = [];
  const delim = (m, closing) => {
    const name = m.type.name;
    if (tags.has(name)) return closing ? CLOSE[name] : name === "link" ? linkTag(m.attrs) : OPEN[name];
    switch (name) {
      case "highlight":
        return closing ? "</span>" : `<span data-hl="${m.attrs.color}">`;
      case "link":
        return closing ? `](${linkTarget(m.attrs.href, m.attrs.title)})` : "[";
      case "bold":
        return "**";
      case "italic":
        return italic;
      case "strike":
        return "~~";
      default:
        return "";
    }
  };
  // How far each segment's marks run from it, so that of two marks opening
  // together the one that runs longer goes outside: **[text](url).** stays
  // that, rather than becoming a link with the bold cut short.
  const run = (i, m) => {
    let n = 0;
    while (i + n < segments.length && has(segments[i + n].marks, m)) n++;
    return n;
  };
  segments.forEach((seg, i) => {
    const code = seg.marks.find((m) => m.type.name === "code");
    // Marks already open stay open, in their order; new ones open inside.
    const fresh = seg.marks.filter((m) => m !== code && !has(open, m)).sort((a, b) => run(i, b) - run(i, a));
    const want = [...open.filter((m) => has(seg.marks, m)), ...fresh];
    let k = 0;
    while (k < open.length && k < want.length && open[k].eq(want[k])) k++;
    for (let j = open.length - 1; j >= k; j--) out += delim(open[j], true);
    for (let j = k; j < want.length; j++) out += delim(want[j], false);
    open = want;
    if (seg.node && !seg.node.isText) out += seg.node.type.name === "hardBreak" ? breaks : image(seg.node);
    else if (code) out += tags.has("code") ? `<code>${escapeText(seg.text)}</code>` : codeSpan(seg.text);
    else out += escapeText(seg.text);
  });
  for (let j = open.length - 1; j >= 0; j--) out += delim(open[j], true);
  return escapeLineStarts(out);
}

function escapeText(s) {
  return s
    .replace(/[\\`*_[\]<~]/g, "\\$&")
    .replace(/&(?=#?[a-z0-9]+;)/gi, "&amp;")
    // Not links unless they are marked as links: GFM would link bare addresses.
    .replace(/:\/\//g, ":\\/\\/")
    .replace(/\bwww\./gi, (m) => `${m.slice(0, 3)}\\.`)
    .replace(/@/g, "\\@");
}

/** What a line of a paragraph must not start with, lest it be another block. */
function escapeLineStarts(s) {
  return s
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s+/, "")
        .replace(/^(#{1,6})(?=\s|$)/, "\\$1")
        .replace(/^>/, "\\>")
        .replace(/^([-+])(?=\s|$)/, "\\$1")
        .replace(/^(\d+)([.)])(?=\s|$)/, "$1\\$2")
        .replace(/^(=+|-+)(\s*)$/, "\\$1$2"),
    )
    .join("\n");
}

function codeSpan(text) {
  const run = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = "`".repeat(run + 1);
  const pad = /^[\s`]|[\s`]$/.test(text) ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

const OPEN = { bold: "<strong>", italic: "<em>", strike: "<del>" };
const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const linkTag = ({ href, title }) => `<a href="${attr(href || "")}"${title ? ` title="${attr(title)}"` : ""}>`;

function linkTarget(href, title) {
  let target = href || "";
  if (/[\s()<>]/.test(target)) target = `<${target.replace(/[<>]/g, "\\$&")}>`;
  return title ? `${target} "${title.replace(/["\\]/g, "\\$&")}"` : target;
}

function image(node) {
  const { src, alt, title } = node.attrs;
  return `![${(alt || "").replace(/[\\[\]]/g, "\\$&")}](${linkTarget(src, title)})`;
}

// ---- the guard -----------------------------------------------------------------

/** What `marked` renders a body to, parsed but inert: nothing in it loads. */
function rendered(md) {
  const t = document.createElement("template");
  t.innerHTML = marked.parse(md);
  return t.content;
}

/** The raw HTML blocks in a body, in order, as written. */
export function rawHtmlBlocks(md) {
  const found = [];
  marked.walkTokens(marked.lexer(md), (t) => {
    if (t.type === "html" && t.block) found.push(trimRaw(t.raw));
  });
  return found;
}

const FORMAT = "strong, em, del, code, a, img, span[data-hl], h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote, pre, hr";

/**
 * Every formatting element a body renders to, with what it holds. Sorted:
 * **[a](u)** and [**a**](u) are the same on the page.
 */
function formatting(root) {
  const flat = (s) => s.replace(/\s+/g, " ").trim();
  return [...root.querySelectorAll(FORMAT)].map((el) => {
    const key = el.tagName === "A" ? `a:${el.getAttribute("href")}|${el.getAttribute("title") || ""}` : el.tagName === "IMG" ? `img:${el.getAttribute("src")}|${el.getAttribute("alt") || ""}` : el.tagName === "SPAN" ? `hl:${el.dataset.hl}` : el.tagName;
    return `${key}\u0001${flat(el.textContent)}`;
  }).sort();
}

/**
 * Whether the editor can open a body and write it back without changing what
 * it shows: the same words (indexText, as the comments read them), the same
 * formatting, and the same raw HTML blocks byte for byte. `build` makes the
 * editor's document from the JSON, as the editor will (schema.nodeFromJSON).
 */
export function canEdit(md, build) {
  let out;
  try {
    const node = build(fromMarkdown(md).doc);
    node.check();
    out = toMarkdown(node);
  } catch (err) {
    console.warn("editor: could not read the draft", err);
    return { ok: false, why: "read" };
  }
  const a = rendered(md);
  const b = rendered(out);
  if (indexText(a).text !== indexText(b).text) return { ok: false, why: "text", out };
  if (JSON.stringify(rawHtmlBlocks(md)) !== JSON.stringify(rawHtmlBlocks(out))) return { ok: false, why: "raw", out };
  if (JSON.stringify(formatting(a)) !== JSON.stringify(formatting(b))) return { ok: false, why: "format", out };
  return { ok: true, out };
}
