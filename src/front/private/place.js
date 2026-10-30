// src/front/private/place.js: where a draft comment's passage is, for the
// read view and the editor.
//
// findQuote (../quotes.js, which the public blog's comments load too, so it
// is left as it is) places a quote where its words are and most of their
// context agrees. Two things are added here, for the drafts alone:
//
//   - A place that starts or ends inside a word is not the quote's, unless
//     the quote's own context has that same character there (a reader can
//     select part of a word). findQuote can put a short quote with context on
//     one side only inside another word whose letters before it it does not
//     look at.
//   - A draft is edited under its comments, and a version restored can have
//     its passage with context the thread has had on each side, but at
//     different times: the words before it as one anchor had them and the
//     words after it as another, or as the reader's quote. Such a place is
//     the thread's when the words before it agree with the prefix of some
//     context the thread has had and the words after it with the suffix of
//     some context it has had, each at the three quarters findQuote asks of
//     its context, and no other place does. An empty side agrees only at the
//     start or end of the text.

import { findQuote } from "../quotes.js";

// As findQuote reads the text: line breaks as spaces.
const flat = (s) => s.replace(/\s/g, " ");
const WORD = /[\p{L}\p{N}]/u;
const inWord = (a, b) => Boolean(a && b) && WORD.test(a) && WORD.test(b);

/** Whether [at, end) of `text` starts and ends where the quote's own context says it can. */
function wholeWords(text, [at, end], quote) {
  if (inWord(text[at - 1], text[at]) && text[at - 1] !== (quote.prefix || "").slice(-1)) return false;
  if (inWord(text[end - 1], text[end]) && text[end] !== (quote.suffix || "")[0]) return false;
  return true;
}

/** findQuote's place for a quote, unless it starts or ends inside a word; or null. */
export function findWhole(index, quote) {
  const at = quote?.exact ? findQuote(index, quote) : null;
  return at && wholeWords(index.text, at, quote) ? at : null;
}

/**
 * The one place where a thread's words are with the words before them as one
 * of its contexts had them and the words after them as one had them, as
 * {at, quote} with the quote it is on there; or null, for none or more than
 * one. Every context's words are looked for.
 */
export function findBySides(index, quotes) {
  const hay = flat(index.text);
  const all = quotes.filter((q) => q?.exact?.trim()).map((q) => ({ exact: flat(q.exact), prefix: flat(q.prefix || ""), suffix: flat(q.suffix || "") }));
  const before = (at, pre) => {
    if (!pre) return !hay.slice(0, at).trim();
    let n = 0;
    while (n < pre.length && hay[at - 1 - n] === pre[pre.length - 1 - n]) n++;
    return n >= pre.length * 0.75;
  };
  const after = (end, suf) => {
    if (!suf) return !hay.slice(end).trim();
    let n = 0;
    while (n < suf.length && hay[end + n] === suf[n]) n++;
    return n >= suf.length * 0.75;
  };
  const hits = new Map();
  for (const exact of new Set(all.map((q) => q.exact))) {
    for (let at = hay.indexOf(exact); at !== -1; at = hay.indexOf(exact, at + 1)) {
      const end = at + exact.length;
      const pre = all.find((q) => before(at, q.prefix));
      const suf = all.find((q) => after(end, q.suffix));
      if (!pre || !suf) continue;
      // Agreeing context ends at the words, so they start and end where it
      // says they can: whole words, or part of one as that context had it.
      hits.set(`${at} ${end}`, { at: [at, end], quote: { exact: index.text.slice(at, end), prefix: pre.prefix, suffix: suf.suffix } });
    }
  }
  return hits.size === 1 ? [...hits.values()][0] : null;
}

/**
 * Where the read view puts a thread ({find, quote, gone}, as DraftComments
 * has it): by its anchor; for a passage deleted, by the reader's quote should
 * its words be back; failing those, by both of them, each side as one had it.
 */
export function findThread(index, t) {
  return findWhole(index, t.find) || (t.gone && findWhole(index, t.quote)) || findBySides(index, [t.find, t.quote])?.at || null;
}
