// test/place.test.mjs: findWhole places a quote just as findQuote does
// wherever its words start and end at a word's edge, and reads a word as
// whole characters, with the apostrophes and hyphens inside it. Every text is
// made up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findQuote } from "../src/front/quotes.js";
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
