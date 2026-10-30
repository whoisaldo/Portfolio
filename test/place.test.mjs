// test/place.test.mjs: findWhole places a quote just as findQuote does
// wherever its words start and end at a word's edge, places every passage
// still as it was quoted, and never one in a word that has changed. Every
// text is made up.
import "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { findQuote, indexText, quoteFromRange } from "../src/front/quotes.js";
import { findWhole } from "../src/front/private/place.js";

/** A seeded generator of numbers in [0, 1). */
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = ["it", "orbit", "rabbit", "the", "path", "sun", "a", "élan", "lan", "42", "follows"];
const GAPS = [" ", " ", " ", "  ", "\n", ", ", ". ", " (", ") ", " - ", "\n\n"];

test("where every place of a quote's words starts and ends at a word's edge, findWhole places it as findQuote does", () => {
  const rand = random(20261030);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const words = (n) => Array.from({ length: n }, () => pick(WORDS));
  const join = (list) => list.map((w, i) => (i ? pick(GAPS) : "") + w).join("");
  const edge = /[\p{L}\p{N}\p{M}]/u;
  let cases = 0;
  let placed = 0;
  let several = 0;
  while (cases < 3000) {
    // A quote of whole words, with its context as it was quoted.
    const before = join(words(Math.floor(rand() * 8)));
    const exact = join(words(1 + Math.floor(rand() * 3)));
    const after = join(words(Math.floor(rand() * 8)));
    const lead = before ? pick(GAPS) : "";
    const trail = after ? pick(GAPS) : "";
    const original = before + lead + exact + trail + after;
    const at = before.length + lead.length;
    const quote = {
      exact,
      prefix: original.slice(Math.max(0, at - 32), at),
      suffix: original.slice(at + exact.length, at + exact.length + 32),
    };
    // Then a text with those words, sometimes as quoted, sometimes in new
    // words, sometimes more than once.
    const parts = [];
    for (let i = Math.floor(rand() * 4); i >= 0; i--) {
      const r = rand();
      parts.push(r < 0.3 ? original : r < 0.7 ? join([...words(Math.floor(rand() * 5)), exact, ...words(Math.floor(rand() * 5))]) : join(words(1 + Math.floor(rand() * 6))));
    }
    const text = parts.join(pick(GAPS));
    const flat = text.replace(/\s/g, " ");
    const needle = exact.replace(/\s/g, " ");
    const places = [];
    for (let i = flat.indexOf(needle); i !== -1; i = flat.indexOf(needle, i + 1)) places.push(i);
    if (!places.every((i) => !edge.test(flat[i - 1] || "") && !edge.test(flat[i + needle.length] || ""))) continue;
    cases++;
    const want = findQuote({ text }, quote);
    assert.deepEqual(findWhole({ text }, quote), want, JSON.stringify({ text, quote }));
    if (want) placed++;
    if (places.length > 1) several++;
  }
  // Not only one kind of case.
  assert.ok(placed > 500 && cases - placed > 500 && several > 500, JSON.stringify({ placed, several }));
});

// The words after a one-word passage, as a quote stores them.
const SUN = " follows the path around the sun.";
const SUN32 = SUN.slice(0, 32);

test("a letter outside the basic plane is part of its word, before a passage or after it", () => {
  const quote = { exact: "it", prefix: "", suffix: SUN32 };
  assert.equal(findWhole({ text: `\u{10400}it${SUN}` }, quote), null);
  assert.equal(findWhole({ text: `\u{1D504}it${SUN}` }, quote), null);
  assert.deepEqual(findWhole({ text: `it${SUN}` }, quote), [0, 2]);
  const end = { exact: "orb", prefix: "The clerk called the final witness ".slice(-32), suffix: "." };
  assert.equal(findWhole({ text: "The clerk called the final witness orb\u{10428}." }, end), null);
  assert.deepEqual(findWhole({ text: "The clerk called the final witness orb." }, end), [35, 38]);
  // Or as the part of a word a quote starts inside.
  const inside = { exact: "it", prefix: "\u{10400}", suffix: SUN32 };
  assert.deepEqual(findWhole({ text: `\u{10400}it${SUN}` }, inside), [2, 4]);
  assert.equal(findWhole({ text: `\u{1D504}it${SUN}` }, inside), null);
  assert.equal(findWhole({ text: `a\u{10400}it${SUN}` }, inside), null);
});

test("an apostrophe or hyphen inside a word is part of it, and one at a word's edge is not", () => {
  for (const join of ["'", "\u2019", "-", "\u2010", "\u2011"]) {
    const quote = { exact: "t", prefix: `don${join}`, suffix: SUN32 };
    assert.deepEqual(findWhole({ text: `don${join}t${SUN}` }, quote), [4, 5], join);
    assert.equal(findWhole({ text: `won${join}t${SUN}` }, quote), null, join);
    assert.equal(findWhole({ text: `t${SUN}` }, quote), null, join);
    // A quote of the start of the word, which goes on past the joiner.
    const start = { exact: "don", prefix: "", suffix: `${join}t${SUN}`.slice(0, 32) };
    assert.deepEqual(findWhole({ text: `don${join}t${SUN}` }, start), [0, 3], join);
    assert.equal(findWhole({ text: `don${join}tx${SUN}` }, start), null, join);
  }
  const entry = { exact: "entry", prefix: "no-", suffix: SUN32 };
  assert.deepEqual(findWhole({ text: `no-entry${SUN}` }, entry), [3, 8]);
  assert.equal(findWhole({ text: `re-entry${SUN}` }, entry), null);
  // A word after a joiner is not at a word's edge.
  const word = { exact: "entry", prefix: "", suffix: SUN32 };
  assert.equal(findWhole({ text: `re-entry${SUN}` }, word), null);
  assert.equal(findWhole({ text: `don't${SUN}` }, { exact: "t", prefix: "", suffix: SUN32 }), null);
  // A quote mark or a dash between spaces is at an edge.
  const said = { exact: "tis", prefix: "She said '", suffix: SUN32 };
  assert.deepEqual(findWhole({ text: `She said 'tis${SUN}` }, said), [10, 13]);
  const dash = { exact: "entry", prefix: "The way - ", suffix: SUN32 };
  assert.deepEqual(findWhole({ text: `The way - entry${SUN}` }, dash), [10, 15]);
});

test("a context cut through a letter outside the basic plane still places its passage", () => {
  const text = `it${"a".repeat(31)}\u{10400}`;
  const quote = { exact: "it", prefix: "", suffix: text.slice(2, 34) };
  assert.deepEqual(findQuote({ text }, quote), [0, 2]);
  assert.deepEqual(findWhole({ text }, quote), [0, 2]);
  const before = `\u{10400}${"a".repeat(31)}it${SUN}`;
  const after = { exact: "it", prefix: before.slice(1, 33), suffix: SUN32 };
  assert.deepEqual(findWhole({ text: before }, after), [33, 35]);
  // The part of a word it has is still needed.
  assert.equal(findWhole({ text: `it${"a".repeat(30)}b\u{10400}` }, quote), null);
});

// Words for the texts below: their pieces, the marks that join two of them,
// the marks at their edges, and what goes between them.
const PIECES = ["ba", "ro", "it", "sun", "kel", "mo", "tra", "vi", "nd", "e", "é", "e\u0301", "ü", "\u{10400}", "\u{1D504}", "\u{10428}", "4", "27", "x"];
const JOINERS = ["'", "\u2019", "-", "\u2010", "\u2011"];
const STANDALONE = ["\u{1F642}", "\u2764\uFE0F", "\u{1F44D}\u{1F3FD}", "1984", "&"];
const OPEN = ["", "", "", "", "'", "\u2018", "\"", "("];
const CLOSE = ["", "", "", "", "'", "\u2019", "\"", ")", ",", ".", ";", "!", "?", ":"];
const GAP = [" ", " ", " ", " ", " - ", " \u2010 ", " \u2014 "];

const LETTER = /[\p{L}\p{N}\p{M}]/u;

/** Each character of `text` with where it starts, and whether it is part of a word (as findWhole reads one). */
function characters(text) {
  const out = [];
  for (let i = 0; i < text.length; ) {
    const c = String.fromCodePoint(text.codePointAt(i));
    out.push({ c, i, letter: LETTER.test(c) });
    i += c.length;
  }
  out.forEach((x, k) => {
    x.word = x.letter || (JOINERS.includes(x.c) && Boolean(out[k - 1]?.letter && out[k + 1]?.letter));
  });
  return out;
}

test("on seeded texts, a passage still as it was quoted is placed there, and none is placed on a word that changed beside it", () => {
  const rand = random(20261031);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const word = () => {
    let w = "";
    for (let n = 1 + Math.floor(rand() * 4); n > 0; n--) w += pick(PIECES);
    if (rand() < 0.25) w += pick(JOINERS) + pick(PIECES) + (rand() < 0.5 ? pick(PIECES) : "");
    if (rand() < 0.08) w = pick(STANDALONE);
    return pick(OPEN) + w + pick(CLOSE);
  };
  const paragraph = () => Array.from({ length: 2 + Math.floor(rand() * 14) }, word).reduce((p, w) => p + pick(GAP) + w);
  const counts = { intact: 0, duplicates: 0, partial: 0, partialJoiner: 0, partialWide: 0, cutInside: 0, changed: 0, changedJoiner: 0, changedWide: 0 };
  const wide = (s) => /[\u{10000}-\u{10FFFF}]/u.test(s);
  const joined = (chars, a, b) => chars.slice(a, b).some((x) => x.word && !x.letter);
  /** The characters of the word around character `k`, as [first, past last]. */
  const span = (chars, k) => {
    let from = k;
    let to = k + 1;
    while (from > 0 && chars[from - 1].word) from--;
    while (to < chars.length && chars[to].word) to++;
    return [from, to];
  };

  while (counts.intact < 5000 || counts.changed < 5000) {
    const root = document.createElement("div");
    for (let n = 1 + Math.floor(rand() * 4); n > 0; n--) {
      const p = document.createElement("p");
      p.textContent = paragraph();
      root.append(p);
    }
    const index = indexText(root);
    const { text } = index;
    const chars = characters(text);
    // A selection between two characters, often inside a word.
    let a = Math.floor(rand() * chars.length);
    let b = Math.min(chars.length, a + 1 + Math.floor(rand() * 12));
    while (a < b && /\s/.test(chars[a].c)) a++;
    while (b > a && /\s/.test(chars[b - 1].c)) b--;
    if (a >= b) continue;
    const start = chars[a].i;
    const end = chars[b - 1].i + chars[b - 1].c.length;
    const range = document.createRange();
    range.setStart(index.nodes[start], index.offsets[start]);
    range.setEnd(index.nodes[end - 1], index.offsets[end - 1] + 1);
    const made = quoteFromRange(index, range, 500);
    const quote = { exact: made.exact, prefix: made.prefix, suffix: made.suffix };
    assert.equal(quote.exact, text.slice(start, end));
    const inside = { start: a > 0 && chars[a - 1].word && chars[a].word, end: b < chars.length && chars[b - 1].word && chars[b].word };

    // (a) As it was quoted: placed there, unless the same words with the
    // same context are somewhere else too.
    const flat = text.replace(/\s/g, " ");
    const fq = { exact: quote.exact.replace(/\s/g, " "), prefix: quote.prefix.replace(/\s/g, " "), suffix: quote.suffix.replace(/\s/g, " ") };
    let same = 0;
    for (let i = flat.indexOf(fq.exact); i !== -1; i = flat.indexOf(fq.exact, i + 1)) {
      const j = i + fq.exact.length;
      if (flat.slice(i - fq.prefix.length, i) === fq.prefix && flat.slice(j, j + fq.suffix.length) === fq.suffix) same++;
    }
    const found = findWhole(index, quote);
    if (same > 1) {
      assert.ok(found === null || (found[0] === start && found[1] === end), JSON.stringify({ text, quote, found }));
      counts.duplicates++;
    } else {
      assert.deepEqual(found, [start, end], JSON.stringify({ text, quote }));
    }
    counts.intact++;
    if (/^[\udc00-\udfff]/.test(quote.prefix) || /[\ud800-\udbff]$/.test(quote.suffix)) counts.cutInside++;
    const side = inside.start && (!inside.end || rand() < 0.5) ? "start" : inside.end ? "end" : null;
    if (!side) continue;
    const [from, to] = span(chars, side === "start" ? a : b - 1);
    const lo = chars[from].i;
    const hi = chars[to - 1].i + chars[to - 1].c.length;
    counts.partial++;
    if (joined(chars, from, to)) counts.partialJoiner++;
    if (wide(text.slice(lo, hi))) counts.partialWide++;

    // (b) One letter changed in the part of that word its context has: not
    // placed on that word.
    const stored = side === "start"
      ? chars.slice(from, a).filter((x) => x.letter && x.i >= start - quote.prefix.length)
      : chars.slice(b, to).filter((x) => x.letter && x.i + x.c.length <= end + quote.suffix.length);
    if (!stored.length) continue;
    const x = pick(stored);
    const other = x.c.length === 2 ? (x.c === "\u{10400}" ? "\u{10428}" : "\u{10400}") : x.c === "q" ? "z" : "q";
    const changed = text.slice(0, x.i) + other + text.slice(x.i + x.c.length);
    const at = findWhole({ text: changed }, quote);
    assert.ok(!at || at[1] <= lo || at[0] >= hi, JSON.stringify({ changed, quote, at, word: [lo, hi] }));
    counts.changed++;
    if (joined(chars, from, to)) counts.changedJoiner++;
    if (wide(text.slice(lo, hi))) counts.changedWide++;
  }
  console.log(JSON.stringify(counts));
  // Every kind of case, many times.
  for (const [k, n] of Object.entries(counts)) if (k !== "duplicates" && k !== "cutInside") assert.ok(n > 1000, `${k}: ${n}`);
  assert.ok(counts.cutInside > 50, `cutInside: ${counts.cutInside}`);
});
