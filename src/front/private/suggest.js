// src/front/private/suggest.js: a suggested edit's words against the passage
// they are for.
//
// A suggestion is a thread whose first comment also carries the words a
// reader would put in place of the passage they quoted. Its card shows the
// words that change struck through and the words that replace them, between
// the words of the passage that stay; Accept (./accept.js) changes those same
// words in the draft, and nothing else.

// Characters a suggestion pasted from a word processor or a web page may
// carry, that show nothing and mean nothing in prose: a zero-width space, a
// word joiner, a byte order mark and a soft hyphen. Joiners that make one
// emoji of several (U+200D) or keep letters apart (U+200C), and the
// no-break space, mean something, and stay.
const INVISIBLE = /[\u200B\u2060\uFEFF\u00AD]/g;

/** A suggestion's words without the characters that show nothing (INVISIBLE). */
export const visibleWords = (text) => text.replace(INVISIBLE, "");

const spaced = (s) => visibleWords(s).trim().replace(/\s+/g, " ");

/**
 * Whether suggested words are the passage's own, read the same way: without
 * INVISIBLE, and with space of any kind alike. Such a suggestion changes
 * nothing, and is neither sent nor accepted.
 */
export const sameAsPassage = (words, passage) => spaced(words) === spaced(passage);

/**
 * What changes between a passage (`old`) and the words suggested for it:
 * [from, to) of the passage, out to whole words, and what takes its place.
 * What the two start and end with alike stays, a run of whitespace of any
 * kind alike; with `lines`, a line break only like a line break. [from, to)
 * is empty for words only added, unless `whole`, when it takes in the word
 * after them (the one before, at the end), so there is always a word of the
 * passage to find.
 */
export function editRegion(old, text, { whole = false, lines = false } = {}) {
  const space = lines ? /[^\S\n]/g : /\s/g;
  const a = old.replace(space, " ");
  const b = text.replace(space, " ");
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

/**
 * What a suggestion changes in its passage as the text has it now
 * (`passage`), to show there: {from, to, insert}, [from, to) of the passage
 * struck through and `insert` put after it, as its card shows them
 * (suggestionParts). Null when the passage is no longer the words the
 * suggestion was made on (`quoted`), space of any kind alike, or the
 * suggestion changes nothing: then nothing is shown in the text.
 */
export function changeIn(passage, quoted, text) {
  const flat = (s) => s.replace(/\s/g, " ");
  if (flat(passage) !== flat(quoted) || sameAsPassage(text, passage)) return null;
  return editRegion(passage, visibleWords(text).trim());
}

// The words kept either side of a change, on a card, at most about this long.
const AROUND = 80;

// On a card cut to a few lines: the words kept either side, and of a long
// run of words taken out, its start and its end.
const BRIEF = { around: 24, removed: 64, start: 36, end: 20 };

/** The end of `s`, about `most` long, from a whole word, after "…". */
const endOf = (s, most) => {
  const cut = s.slice(-most);
  return `…${cut.slice(cut.search(/\s/) + 1)}`;
};
/** The start of `s`, about `most` long, to a whole word, before "…". */
const startOf = (s, most) => {
  const cut = s.slice(0, most);
  const space = cut.search(/\s\S*$/);
  return `${space > 0 ? cut.slice(0, space) : cut}…`;
};

/**
 * A suggestion as its card shows it: the passage's words before the change
 * (`lead`), the words it takes out (`removed`) and puts in (`added`), and the
 * words after (`tail`), the suggestion read without INVISIBLE, as Accept
 * puts it in. A long passage's lead and tail are cut to the words
 * nearest the change, with "…" for the rest, as a long quote is shortened.
 * `brief`, for a card cut to a few lines: less of both, and a long run of
 * words taken out is its start and its end, so the words put in are not
 * pushed out of sight by the words they replace.
 */
export function suggestionParts(old, text, { brief = false } = {}) {
  const words = visibleWords(text).trim();
  const { from, to, insert } = editRegion(old, words);
  const around = brief ? BRIEF.around : AROUND;
  let lead = old.slice(0, from);
  let tail = old.slice(to);
  let removed = old.slice(from, to);
  if (lead.length > around) lead = endOf(lead, around);
  if (tail.length > around) tail = startOf(tail, around);
  if (brief && removed.length > BRIEF.removed) removed = `${startOf(removed, BRIEF.start).slice(0, -1)} … ${endOf(removed, BRIEF.end).slice(1)}`;
  return { lead, removed, added: insert, tail };
}

/**
 * What a suggestion's card offers Ali: Accept ("accept") while it is open,
 * on a margin card not in hand too, beside Resolve, so one press takes the
 * edit; what it changes is shown in the text under the mouse. Never while he
 * edits the draft (`editing`): Accept changes the draft as saved
 * (./accept.js), and the editor saves its own copy of the same text, so the
 * card says to finish editing first ("finish"). Else null, nothing.
 */
export const acceptOffered = ({ accepted, resolved, editing }) => (accepted || resolved ? null : editing ? "finish" : "accept");

/**
 * What Accept said on each suggestion's card, by thread: a refusal, or that
 * the draft changed or the save is not confirmed. Kept above the cards, as a
 * card moved from one list to another (its passage found, or not, in the
 * text the page fetched again) is drawn afresh, without what it held. A
 * message stays until Ali presses Accept on that card again ("press"),
 * dismisses it ("dismiss") or leaves it: another card, or none, taken in
 * hand ("leave", `keep` the ids in hand now). Once the thread is accepted,
 * acceptNote has none.
 */
export function acceptNotes(notes, e) {
  if (e.type === "fail") return new Map(notes).set(e.id, e.message);
  const gone = e.type === "leave" ? [...notes.keys()].filter((id) => !e.keep.includes(id)) : notes.has(e.id) ? [e.id] : [];
  if (!gone.length) return notes;
  const next = new Map(notes);
  for (const id of gone) next.delete(id);
  return next;
}

/** What Accept said on thread `t`'s card (acceptNotes), "" for nothing. */
export const acceptNote = (notes, t) => (t.root.accepted ? "" : notes.get(t.id) || "");
