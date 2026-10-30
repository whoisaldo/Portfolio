// test/place.test.mjs: findWhole places a quote just as findQuote does
// wherever its words start and end at a word's edge. Every text is made up.
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
