// src/front/private/place.js: where a draft comment's passage is, for the
// read view and the editor.
//
// Placed as findQuote (../quotes.js, which the public blog's comments load
// too, so it is left as it is) places a quote: where its words are and most
// of their context agrees, clearly more than anywhere else. For the drafts,
// a place that starts or ends inside a word is not the quote's either, unless
// the quote's own context has that same part of the word there (a reader can
// select part of a word). Such places are dropped before the others are
// ranked, so one inside another word can neither take a quote nor tie with
// its real passage.

// As much context as a quote stores either side of its words (quotes.js and
// the editor store this much). Less of it means the text began or ended there.
const CONTEXT = 32;
// A letter, digit or combining mark, tested on one whole character.
const WORD = /[\p{L}\p{N}\p{M}]/u;
// An apostrophe or hyphen between two of those is part of the word, as in
// "don't" or "re-entry"; elsewhere it is a quote mark or a dash.
const JOINS = new Set(["'", "\u2019", "-", "\u2010", "\u2011"]);
// As findQuote matches: with line breaks read as spaces.
const flat = (s) => s.replace(/\s/g, " ");

/** The character ending at `i` in `s`, both halves of a surrogate pair; or "". */
function charBefore(s, i) {
  if (i <= 0) return "";
  return s.slice(i >= 2 && s.codePointAt(i - 2) > 0xffff ? i - 2 : i - 1, i);
}

/** The character starting at `i` in `s`; or "". */
function charAt(s, i) {
  return i < s.length ? String.fromCodePoint(s.codePointAt(i)) : "";
}

const SHUT = { start: false, end: false };

/**
 * Whether the character at `i` in `s` is part of a word. Where `s` is cut
 * from longer text (`open.start`, `open.end`), the unknown character beyond
 * the cut may be a letter.
 */
function wordAt(s, i, open = SHUT) {
  const c = charAt(s, i);
  if (!c || WORD.test(c)) return Boolean(c);
  if (!JOINS.has(c)) return false;
  const before = charBefore(s, i);
  const after = charAt(s, i + c.length);
  return (before ? WORD.test(before) : open.start) && (after ? WORD.test(after) : open.end);
}

/** Whether the character just before `i` in `s` is part of a word. */
const wordBefore = (s, i, open = SHUT) => i > 0 && wordAt(s, i - charBefore(s, i).length, open);

/**
 * What the text must have beside a quote's words, as its own context says:
 * where they start (end) inside a word, exactly the part of the word the
 * prefix ends (suffix starts) with, which starts (ends) at a word's edge
 * unless it reaches the end of a context that was cut short, whose word may
 * have gone on past it; where they start (end) at a word's edge, the same
 * edge. Null for a side whose words start (end) with no word.
 */
function rule(pre, words, suf) {
  // A context cut through a character leaves half of it, which is not read.
  const open = { start: pre.length >= CONTEXT, end: suf.length >= CONTEXT };
  if (/^[\udc00-\udfff]/.test(pre)) pre = pre.slice(1);
  if (/[\ud800-\udbff]$/.test(suf)) suf = suf.slice(0, -1);
  const text = pre + words + suf;
  const at = pre.length;
  const end = at + words.length;
  let from = at;
  while (wordBefore(text, from, open)) from -= charBefore(text, from).length;
  let to = end;
  while (wordAt(text, to, open)) to += charAt(text, to).length;
  return {
    start: wordAt(text, at, open) ? { part: text.slice(from, at), free: open.start && from === 0 } : null,
    end: wordBefore(text, end, open) ? { part: text.slice(end, to), free: open.end && to === text.length } : null,
  };
}

/** Whether the words at [at, end) in `hay` have beside them what `want` (from rule) asks. */
function fits(hay, at, end, want) {
  if (want.start) {
    const from = at - want.start.part.length;
    if (from < 0 || hay.slice(from, at) !== want.start.part) return false;
    if (!want.start.free && wordBefore(hay, from)) return false;
  }
  if (want.end) {
    const to = end + want.end.part.length;
    if (hay.slice(end, to) !== want.end.part) return false;
    if (!want.end.free && wordAt(hay, to)) return false;
  }
  return true;
}

/** Where a quote is in the text now, as [start, end), by findQuote's rule among the places its context allows; or null. */
export function findWhole(index, quote) {
  const words = flat(quote?.exact || "");
  if (!words.trim()) return null;
  const hay = flat(index.text);
  const pre = flat(quote.prefix || "");
  const suf = flat(quote.suffix || "");
  const context = pre.length + suf.length;
  const want = rule(pre, words, suf);
  const places = [];
  for (let at = hay.indexOf(words); at !== -1; at = hay.indexOf(words, at + 1)) {
    const end = at + words.length;
    if (!fits(hay, at, end, want)) continue;
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
 * Where the read view puts a thread ({find, quote, gone}, as DraftComments
 * has it): by its anchor; for a passage deleted, by the reader's quote should
 * its words be back.
 */
export function findThread(index, t) {
  return findWhole(index, t.find) || (t.gone && findWhole(index, t.quote)) || null;
}
