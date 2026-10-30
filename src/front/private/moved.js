// src/front/private/moved.js: finding a passage that was edited around.
//
// findQuote (../quotes.js) places a quote only where most of the words
// around it are still the same, because a highlight on the wrong passage is
// worse than none. A private draft is edited under its comments, though, and
// a passage deleted and then brought back (a version restored, an undo) can
// come back with new words beside it. Its thread should still be beside it.
// So for those: when the passage's words occur exactly once in the text, half
// of the words around them agreeing is enough. Kept here rather than in
// ../quotes.js, which the public blog's comments load too.
import { findQuote } from "../quotes.js";

/** Where a quote is, as findQuote finds it or, failing that, as a moved passage; or null. */
export function findMoved(index, quote) {
  const found = findQuote(index, quote);
  if (found) return found;
  // As findQuote reads the text: line breaks as spaces.
  const flat = (s) => s.replace(/\s/g, " ");
  const hay = flat(index.text);
  const needle = flat(quote.exact || "");
  if (!needle.trim()) return null;
  const at = hay.indexOf(needle);
  if (at === -1 || hay.indexOf(needle, at + 1) !== -1) return null;
  const end = at + needle.length;
  const pre = flat(quote.prefix || "");
  const suf = flat(quote.suffix || "");
  let score = 0;
  while (score < pre.length && hay[at - 1 - score] === pre[pre.length - 1 - score]) score++;
  for (let i = 0; i < suf.length && hay[end + i] === suf[i]; i++) score++;
  return score >= (pre.length + suf.length) * 0.5 ? [at, end] : null;
}
