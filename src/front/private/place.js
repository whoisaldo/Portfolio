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
// the editor store this much). Less of it, all one word, means the text began
// or ended there.
const CONTEXT = 32;
const WORD = "[\\p{L}\\p{N}\\p{M}]";
const FIRST = new RegExp(`^${WORD}*`, "u");
const LAST = new RegExp(`${WORD}*$`, "u");
const STARTS = new RegExp(`^${WORD}`, "u");
const ENDS = new RegExp(`${WORD}$`, "u");
/** The letters, digits and combining marks at the end of `s`. */
const tailFrag = (s) => LAST.exec(s)[0];
/** The letters, digits and combining marks at the start of `s`. */
const headFrag = (s) => FIRST.exec(s)[0];
/** Whether the character just before `i` in `s` is part of a word. */
const wordBefore = (s, i) => i > 0 && ENDS.test(s.slice(Math.max(0, i - 2), i));
/** Whether the character at `i` in `s` is part of a word. */
const wordAt = (s, i) => STARTS.test(s.slice(i, i + 2));
// As findQuote matches: with line breaks read as spaces.
const flat = (s) => s.replace(/\s/g, " ");

/**
 * Whether the words at `at` start where the prefix says they can: at a
 * word's edge, or after exactly the part of a word the prefix ends with. That
 * part starts at an edge too, unless the prefix is a whole context of word
 * characters, whose word may have begun before it.
 */
function startsRight(hay, at, words, pre) {
  if (!STARTS.test(words)) return true;
  const part = tailFrag(pre);
  const from = at - part.length;
  if (from < 0 || hay.slice(from, at) !== part) return false;
  if (part.length === pre.length && pre.length >= CONTEXT) return true;
  return !wordBefore(hay, from);
}

/** The same at the words' end, with the suffix. */
function endsRight(hay, end, words, suf) {
  if (!ENDS.test(words)) return true;
  const part = headFrag(suf);
  const to = end + part.length;
  if (hay.slice(end, to) !== part) return false;
  if (part.length === suf.length && suf.length >= CONTEXT) return true;
  return !wordAt(hay, to);
}

/** Where a quote is in the text now, as [start, end), by findQuote's rule among the places its context allows; or null. */
export function findWhole(index, quote) {
  const words = flat(quote?.exact || "");
  if (!words.trim()) return null;
  const hay = flat(index.text);
  const pre = flat(quote.prefix || "");
  const suf = flat(quote.suffix || "");
  const context = pre.length + suf.length;
  const places = [];
  for (let at = hay.indexOf(words); at !== -1; at = hay.indexOf(words, at + 1)) {
    const end = at + words.length;
    if (!startsRight(hay, at, words, pre) || !endsRight(hay, end, words, suf)) continue;
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
