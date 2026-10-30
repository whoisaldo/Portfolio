// src/front/private/editor/address.js: a new draft's address and date
// (./NewDraft.jsx).
//
// A draft's address is its slug, /privateblog/<slug> now and /blog/<slug>
// once published, and the stats service takes lowercase letters, digits and
// single hyphens, at most 80 characters. The form offers one made from the
// title, and keeps what Ali types instead once he changes it.

const MAX = 80;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LETTERS = { ß: "ss", æ: "ae", œ: "oe", ø: "o", ł: "l" };

/** "Ali's Harbour Notes, part 2!" -> "alis-harbour-notes-part-2". */
export function addressFrom(title) {
  const plain = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Letters that are not a plain letter and an accent.
    .replace(/[ßæœøł]/g, (c) => LETTERS[c])
    // An apostrophe joins its word: "Ali's" is "alis", not "ali-s".
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Cut at a word where it is too long.
  if (plain.length <= MAX) return plain;
  const cut = plain.slice(0, MAX + 1);
  const at = cut.lastIndexOf("-");
  return (at > 0 ? cut.slice(0, at) : plain.slice(0, MAX)).replace(/-+$/, "");
}

/**
 * The address as it is typed: lowercase, and anything else a hyphen, one at
 * a time. A hyphen at the end stays, for the next word.
 */
export const typedAddress = (v) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-/, "")
    .slice(0, MAX);

export const isAddress = (v) => typeof v === "string" && v.length <= MAX && SLUG.test(v);

/** Today in this browser's time zone, as YYYY-MM-DD. */
export function today(d = new Date()) {
  const two = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}
