// src/front/quotes.js: finding a quoted passage in a post, and marking it.
//
// A quote comment stores the words it quotes and a few either side of them,
// the way a W3C TextQuoteSelector does, rather than a position in the HTML.
// A position breaks the first time Ali fixes a typo above it; the words keep
// working until the quoted words themselves change, and when they do the
// comment still shows, just without a highlight in the text.
//
// Both halves read the post through one index: its text with every run of
// whitespace made one space, or one line break where a paragraph, heading or
// list item ends, and for each character the text node and offset it came
// from. Quoting and finding the quote again use the same index, so they agree
// on what the text is whatever the HTML looks like. Embeds and videos are
// left out of it: they are not the post's words.

const SKIP = "[data-embed], video, audio, script, style, button, svg";
const BLOCK = new Set([
  "P", "LI", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6",
  "BLOCKQUOTE", "PRE", "FIGURE", "FIGCAPTION", "DIV", "TABLE", "TR", "TD", "TH", "HR", "BR",
]);
const CONTEXT = 32;

/** The post's text, and where each character of it lives. */
export function indexText(root) {
  const chars = [];
  const nodes = [];
  const offsets = [];
  const space = (ch) => {
    // A space after a space adds nothing; a line break wins over a space.
    if (!chars.length) return;
    const last = chars.length - 1;
    if (chars[last] === " " || chars[last] === "\n") {
      if (ch === "\n") chars[last] = "\n";
      return;
    }
    chars.push(ch);
    nodes.push(null);
    offsets.push(0);
  };
  const walk = (el) => {
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        const v = n.nodeValue;
        for (let i = 0; i < v.length; i++) {
          if (/\s/.test(v[i])) {
            const before = chars.length;
            space(" ");
            // A real space, so it can be wrapped and its position compared.
            if (chars.length > before) {
              nodes[nodes.length - 1] = n;
              offsets[offsets.length - 1] = i;
            }
          } else {
            chars.push(v[i]);
            nodes.push(n);
            offsets.push(i);
          }
        }
      } else if (n.nodeType === 1 && !n.matches(SKIP)) {
        const block = BLOCK.has(n.tagName);
        if (block) space("\n");
        walk(n);
        if (block) space("\n");
      }
    }
  };
  walk(root);
  return { text: chars.join(""), nodes, offsets };
}

/** True when a selection is somewhere a quote can come from. */
export function quotable(root, range) {
  const inside = (node) => {
    const el = node.nodeType === 1 ? node : node.parentElement;
    return el && root.contains(el) && !el.closest(SKIP);
  };
  return inside(range.startContainer) && inside(range.endContainer);
}

/**
 * The quote a selection makes: its words, trimmed, and the words either side.
 * Null when it selects nothing that counts.
 */
export function quoteFromRange(index, range, max) {
  const { text, nodes, offsets } = index;
  // The characters in the range, by their place in the document. Index order
  // is document order, so the first and last are found by bisection.
  const at = (i, end) => {
    // A line break between blocks has no node; it sits where the next
    // character does.
    let j = i;
    while (j < nodes.length && !nodes[j]) j++;
    if (j === nodes.length) return 1;
    return range.comparePoint(nodes[j], offsets[j] + (end && j === i ? 1 : 0));
  };
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (at(mid, false) < 0) lo = mid + 1;
    else hi = mid;
  }
  let start = lo;
  lo = start;
  hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (at(mid, true) <= 0) lo = mid + 1;
    else hi = mid;
  }
  let end = lo;
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  if (end <= start) return null;
  const trimmed = end - start > max;
  if (trimmed) end = start + max;
  return {
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
    trimmed,
  };
}

/**
 * Where a stored quote is in the text now, as [start, end), or null.
 *
 * A highlight on the wrong passage is worse than none, so the words alone are
 * not enough. Each place they occur is scored by how many characters of the
 * stored prefix and suffix still match the text around it, counted outward
 * from the quote. The best place is highlighted only when
 *
 *   - its context agrees: at least three quarters of the stored prefix and
 *     suffix together still match, and
 *   - it clearly wins: where the words occur more than once, it matches at
 *     least a quarter of the stored context more than any other place.
 *
 * Otherwise there is no highlight, and the comment is listed without one.
 */
export function findQuote(index, quote) {
  // Matched with line breaks read as spaces, so a quote survives a paragraph
  // being split or joined around it.
  const flat = (s) => s.replace(/\s/g, " ");
  const hay = flat(index.text);
  const needle = flat(quote.exact);
  if (!needle.trim()) return null;
  const pre = flat(quote.prefix || "");
  const suf = flat(quote.suffix || "");
  const context = pre.length + suf.length;
  const places = [];
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + 1)) {
    const end = at + needle.length;
    let score = 0;
    while (score < pre.length && hay[at - 1 - score] === pre[pre.length - 1 - score]) score++;
    for (let i = 0; i < suf.length && hay[end + i] === suf[i]; i++) score++;
    places.push({ at, end, score });
  }
  places.sort((a, b) => b.score - a.score);
  const [best, next] = places;
  if (!best || best.score < context * 0.75) return null;
  if (next && best.score - next.score < Math.max(1, context / 4)) return null;
  return [best.at, best.end];
}

/**
 * Joins quotes whose passages overlap into one highlight, so no highlight is
 * ever inside another's link. Takes [{id, at}] in the order the comments are
 * listed, `at` from findQuote, and returns [{at, ids}] covering the joined
 * passage, with the ids in that same order.
 */
export function groupQuotes(found) {
  const order = new Map(found.map((f, i) => [f.id, i]));
  const groups = [];
  for (const f of [...found].sort((a, b) => a.at[0] - b.at[0])) {
    const g = groups[groups.length - 1];
    if (g && f.at[0] < g.at[1]) {
      g.at = [g.at[0], Math.max(g.at[1], f.at[1])];
      g.ids.push(f.id);
    } else {
      groups.push({ at: [...f.at], ids: [f.id] });
    }
  }
  for (const g of groups) g.ids.sort((a, b) => order.get(a) - order.get(b));
  return groups;
}

/**
 * Wraps [start, end) of the index in highlights that link to the comment.
 * One <mark> per text node the passage crosses; the first carries the id the
 * comment links back to. Inside a link of the post's own the mark is plain,
 * because a link cannot hold another. Returns the elements it added.
 */
export function markQuote(index, [start, end], id, label) {
  const runs = [];
  for (let i = start; i < end; i++) {
    const node = index.nodes[i];
    if (!node) continue;
    const run = runs[runs.length - 1];
    if (run && run.node === node) run.to = index.offsets[i] + 1;
    else runs.push({ node, from: index.offsets[i], to: index.offsets[i] + 1 });
  }
  const added = [];
  for (const { node, from, to } of runs) {
    if (!node.nodeValue.slice(from, to).trim()) continue;
    const middle = from > 0 ? node.splitText(from) : node;
    if (to - from < middle.nodeValue.length) middle.splitText(to - from);
    const mark = document.createElement("mark");
    mark.className = "post-quote";
    mark.dataset.quote = id;
    let outer = mark;
    if (!middle.parentElement.closest("a")) {
      outer = document.createElement("a");
      outer.className = "post-quote-link";
      outer.href = `#comment-${id}`;
      outer.title = label;
      outer.dataset.quote = id;
    }
    if (!added.length) outer.id = `quote-${id}`;
    middle.replaceWith(outer);
    if (outer !== mark) outer.append(mark);
    mark.append(middle);
    added.push(outer);
  }
  return added;
}

/** Puts the text back the way the post rendered it. */
export function unmark(elements) {
  for (const el of elements) {
    const parent = el.parentNode;
    if (!parent) continue;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    // Joins the split text back into one node. Only where the post's own
    // Markdown is, which React never touches after it is set: normalize()
    // reaches every descendant, and an embed's nodes belong to React.
    if (!parent.querySelector("[data-embed]")) parent.normalize();
  }
}
