// src/front/private/place.js: where a draft comment's passage is, for the
// read view and the editor.
//
// findQuote (../quotes.js, which the public blog's comments load too, so it
// is left as it is) places a quote where its words are and most of their
// context agrees. For the drafts, a place that starts or ends inside a word
// is not the quote's either, unless the quote's own context has that same
// part of the word there (a reader can select part of a word): findQuote can
// put a short quote inside another word whose letters before or after it it
// does not count.

import { findQuote } from "../quotes.js";

// Longer than any context a quote stores, so a word's part read from this
// much text is all of it, or longer than the context's.
const WINDOW = 100;
/** The letters and digits at the end of `s`, back to its last other character. */
const tail = (s) => /[\p{L}\p{N}]*$/u.exec(s)[0];
/** The letters and digits at the start of `s`, up to its first other character. */
const head = (s) => /^[\p{L}\p{N}]*/u.exec(s)[0];

/**
 * Whether [at, end) of `text` starts and ends where the quote's own context
 * says it can: at a word's edge, or inside a word whose part before (or
 * after) it is exactly the part the quote's prefix ends with (or its suffix
 * starts with).
 */
function wholeWords(text, [at, end], quote) {
  const words = text.slice(at, end);
  const before = head(words) && tail(text.slice(Math.max(0, at - WINDOW), at));
  if (before && before !== tail(quote.prefix || "")) return false;
  const after = tail(words) && head(text.slice(end, end + WINDOW));
  if (after && after !== head(quote.suffix || "")) return false;
  return true;
}

/** findQuote's place for a quote, unless it starts or ends inside a word its context does not have it in; or null. */
export function findWhole(index, quote) {
  const at = quote?.exact ? findQuote(index, quote) : null;
  return at && wholeWords(index.text, at, quote) ? at : null;
}

/**
 * Where the read view puts a thread ({find, quote, gone}, as DraftComments
 * has it): by its anchor; for a passage deleted, by the reader's quote should
 * its words be back.
 */
export function findThread(index, t) {
  return findWhole(index, t.find) || (t.gone && findWhole(index, t.quote)) || null;
}
