// src/front/private/place.js: where a draft comment's passage is, for the
// read view and the editor.
//
// findQuote (../quotes.js, which the public blog's comments load too, so it
// is left as it is) places a quote where its words are and most of their
// context agrees. For the drafts, a place that starts or ends inside a word
// is not the quote's either, unless the quote's own context has that same
// character there (a reader can select part of a word). findQuote can put a
// short quote with context on one side only inside another word whose
// letters before it it does not look at.

import { findQuote } from "../quotes.js";

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
 * Where the read view puts a thread ({find, quote, gone}, as DraftComments
 * has it): by its anchor; for a passage deleted, by the reader's quote should
 * its words be back.
 */
export function findThread(index, t) {
  return findWhole(index, t.find) || (t.gone && findWhole(index, t.quote)) || null;
}
