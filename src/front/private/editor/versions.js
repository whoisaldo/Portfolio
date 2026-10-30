// src/front/private/editor/versions.js: a draft's saved versions, as the
// version history (./History.jsx) lists and compares them.
//
// The stats service keeps every save as a revision, with a kind that says
// what made it. Here they get the plain names Docs would give them, and are
// grouped by the day they were saved on, in the reader's own time zone.
//
// "Show changes" compares the rendered text, not the Markdown: a version and
// the current text are each rendered as the post would be, split into their
// blocks (headings, paragraphs, list items, captions), and the blocks are
// lined up first and compared word by word only where they differ. So a
// sentence moved into a list, or a paragraph rewrapped, reads as the change
// to the words it is, and none of the Markdown's punctuation shows.
import { diffArrays, diffWords } from "diff";

const KINDS = {
  autosave: "Edits",
  manual: "Saved version",
  restore: "Restored",
  upload: "Uploaded",
  original: "Before editing",
};

/** What a revision's kind is called in the list. */
export const kindLabel = (kind) => KINDS[kind] || "Saved";

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Revisions, newest first, as runs of one day each:
 * [{key, label: "Today" | "Yesterday" | "Tuesday, October 27", items}].
 * A day in another year says the year too.
 */
export function byDay(revisions, now = new Date()) {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const long = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });
  const withYear = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });
  const out = [];
  for (const r of revisions) {
    const at = new Date(r.at);
    const key = dayKey(at);
    if (out.at(-1)?.key !== key) {
      const label = key === today ? "Today" : key === yesterday ? "Yesterday" : at.getFullYear() === now.getFullYear() ? long.format(at) : withYear.format(at);
      out.push({ key, label, items: [] });
    }
    out.at(-1).items.push(r);
  }
  return out;
}

// ---- the text as blocks -------------------------------------------------------

const BLOCK = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "BLOCKQUOTE", "PRE", "FIGCAPTION", "TD", "TH", "DT", "DD"]);
const MEDIA = "img, video, audio, iframe, [data-embed]";
const MEDIA_LABEL = { IMG: "Picture", VIDEO: "Video", AUDIO: "Audio", IFRAME: "Embedded page" };

const holdsBlocks = (el) => [...el.querySelectorAll("*")].some((n) => BLOCK.has(n.tagName));

function media(el) {
  const label = el.matches("[data-embed]") ? "Live embed" : MEDIA_LABEL[el.tagName];
  return { type: "media", text: "", label, key: el.getAttribute("data-embed") || el.getAttribute("src") || el.querySelector("source")?.getAttribute("src") || "" };
}

/** What kind of block an element's text is, as the history draws it. */
function typeOf(el) {
  if (el.closest("li")) return { type: "li", list: el.closest("li").parentElement?.tagName === "OL" ? "ol" : "ul" };
  if (el.closest("blockquote")) return { type: "quote" };
  if (/^H[1-6]$/.test(el.tagName)) return { type: el.tagName.toLowerCase() };
  if (el.tagName === "FIGCAPTION") return { type: "caption" };
  if (el.tagName === "PRE") return { type: "pre" };
  return { type: "p" };
}

/**
 * The blocks of rendered HTML, in order: [{type, text, list?}] for text, its
 * whitespace collapsed, and {type: "media", label, key} for a picture, a
 * video or an embed. A list item's own words and the list inside it are
 * blocks of their own.
 */
export function textBlocks(html) {
  const t = document.createElement("template");
  t.innerHTML = html;
  const out = [];
  const walk = (el) => {
    let text = "";
    const found = [];
    const flush = () => {
      const words = text.replace(/\s+/g, " ").trim();
      if (words && BLOCK.has(el.tagName)) out.push({ ...typeOf(el), text: words });
      out.push(...found.splice(0));
      text = "";
    };
    for (const n of el.childNodes) {
      if (n.nodeType === 3) text += n.nodeValue;
      else if (n.nodeType !== 1) continue;
      else if (n.tagName === "BR") text += " ";
      else if (n.matches(MEDIA)) {
        found.push(media(n));
        // An embed's placeholder and a video's fallback are not words.
      } else if (BLOCK.has(n.tagName) || holdsBlocks(n)) {
        flush();
        walk(n);
      } else {
        text += n.textContent;
        for (const m of n.querySelectorAll(MEDIA)) found.push(media(m));
      }
    }
    flush();
  };
  walk(t.content);
  return out;
}

// ---- comparing ------------------------------------------------------------------

const sameBlock = (a, b) => a.type === b.type && a.text === b.text && a.key === b.key && a.list === b.list;

/** [{text, change: "same" | "added" | "removed"}], word by word. */
export function wordDiff(from, to) {
  return diffWords(from, to).map((p) => ({ text: p.value, change: p.added ? "added" : p.removed ? "removed" : "same" }));
}

const words = (s) => s.split(/\s+/).filter(Boolean).length;

/**
 * Whether `b` reads as `a` edited, rather than another block: at least
 * two-fifths of the longer one's words are in both.
 */
function alike(a, b) {
  if (a.type === "media" || b.type === "media") return false;
  const kept = wordDiff(a.text, b.text)
    .filter((p) => p.change === "same")
    .reduce((n, p) => n + words(p.text), 0);
  return kept / Math.max(words(a.text), words(b.text), 1) >= 0.4;
}

/**
 * How `to` differs from `from`, block by block, in `to`'s order with what
 * `from` alone had where it was: [{...block, change, parts?}], `change`
 * "same", "added" (only in `to`), "removed" (only in `from`) or "changed",
 * which has `parts` from wordDiff. Within a run of differing blocks, each of
 * `from`'s is paired with the next of `to`'s that reads as it edited, so an
 * edited paragraph is one block with its changed words, and a new one in
 * between is added whole.
 */
export function blockDiff(from, to) {
  const out = [];
  const runs = diffArrays(from, to, { comparator: sameBlock });
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (!run.added && !run.removed) {
      for (const b of run.value) out.push({ ...b, change: "same" });
      continue;
    }
    // A run removed and a run added next to it are one change.
    const next = runs[i + 1];
    const removed = run.removed ? run.value : [];
    const added = run.added ? run.value : [];
    if (next && (next.added || next.removed) && next.added !== run.added) {
      (next.added ? added : removed).push(...next.value);
      i++;
    }
    let j = 0;
    for (const r of removed) {
      let k = j;
      while (k < added.length && !alike(r, added[k])) k++;
      if (k === added.length) {
        out.push({ ...r, change: "removed" });
        continue;
      }
      for (; j < k; j++) out.push({ ...added[j], change: "added" });
      out.push({ ...added[k], change: "changed", parts: wordDiff(r.text, added[k].text) });
      j = k + 1;
    }
    for (; j < added.length; j++) out.push({ ...added[j], change: "added" });
  }
  return out;
}
