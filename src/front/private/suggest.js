// src/front/private/suggest.js: a suggested edit's words against the passage
// they are for.
//
// A suggestion is a thread whose first comment also carries the words a
// reader would put in place of the passage they quoted. Its card shows the
// words that change struck through and the words that replace them, between
// the words of the passage that stay; Accept (./accept.js) changes those same
// words in the draft, and nothing else.

/**
 * What changes between a passage (`old`) and the words suggested for it:
 * [from, to) of the passage, out to whole words, and what takes its place.
 * What the two start and end with alike stays, a run of whitespace of any
 * kind alike. [from, to) is empty for words only added, unless `whole`, when
 * it takes in the word after them (the one before, at the end), so there is
 * always a word of the passage to find.
 */
export function editRegion(old, text, { whole = false } = {}) {
  const a = old.replace(/\s/g, " ");
  const b = text.replace(/\s/g, " ");
  const most = Math.min(a.length, b.length);
  let start = 0;
  while (start < most && a[start] === b[start]) start++;
  let same = 0;
  while (same < most - start && a[a.length - 1 - same] === b[b.length - 1 - same]) same++;
  let from = start;
  let to = a.length - same;
  // Not from inside a word: "colour" to "color" is that word, not a "u".
  const inWord = (i) => i > 0 && i < a.length && /\S/.test(a[i - 1]) && /\S/.test(a[i]);
  while (inWord(from)) from--;
  while (inWord(to)) to++;
  if (whole) {
    while (!/\S/.test(a.slice(from, to))) {
      if (to < a.length) {
        while (to < a.length && /\s/.test(a[to])) to++;
        while (to < a.length && /\S/.test(a[to])) to++;
      } else if (from > 0) {
        while (from > 0 && /\s/.test(a[from - 1])) from--;
        while (from > 0 && /\S/.test(a[from - 1])) from--;
      } else break;
    }
  }
  return { from, to, insert: text.slice(from, text.length - (a.length - to)) };
}

// The words kept either side of a change, on a card, at most about this long.
const AROUND = 80;

/**
 * A suggestion as its card shows it: the passage's words before the change
 * (`lead`), the words it takes out (`removed`) and puts in (`added`), and the
 * words after (`tail`). A long passage's lead and tail are cut to the words
 * nearest the change, with "…" for the rest, as a long quote is shortened.
 */
export function suggestionParts(old, text) {
  const words = text.trim();
  const { from, to, insert } = editRegion(old, words);
  let lead = old.slice(0, from);
  let tail = old.slice(to);
  if (lead.length > AROUND) {
    const cut = lead.slice(-AROUND);
    lead = `…${cut.slice(cut.search(/\s/) + 1)}`;
  }
  if (tail.length > AROUND) {
    const cut = tail.slice(0, AROUND);
    const space = cut.search(/\s\S*$/);
    tail = `${space > 0 ? cut.slice(0, space) : cut}…`;
  }
  return { lead, removed: old.slice(from, to), added: insert, tail };
}
