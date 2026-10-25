// scripts/check-quotes.mjs: asserts when a quote comment is highlighted.
//
// A quote is found again by its words and the words either side of them
// (src/front/quotes.js). The bug this guards against was a deleted passage
// whose comment moved to the nearest look-alike, and two comments on one
// passage where the second could not be reached. Run this whenever
// quotes.js changes.
//
//   node scripts/check-quotes.mjs

import { findQuote, groupQuotes } from "../src/front/quotes.js";

let failures = 0;
const fail = (msg) => { console.error("  FAIL " + msg); failures++; };
const same = (got, want, msg) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${msg}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
// findQuote reads only the index's text.
const find = (text, quote) => findQuote({ text }, quote);
const at = (text, words, from = 0) => {
  const i = text.indexOf(words, from);
  return [i, i + words.length];
};

const post =
  "I built the city first. The live city took 20 days. The whole thing, from the first sketch to the reel, took seven weeks.\n" +
  "Apples are nice. The city is red.\nBananas are nice. The city is blue.\n";
const live = { exact: "The live city took 20 days.", prefix: "I built the city first. ", suffix: " The whole thing, from the first" };
const blue = { exact: "The city", prefix: "Bananas are nice. ", suffix: " is blue." };

// 1. Once, with its context: highlighted.
same(find(post, live), at(post, live.exact), "a passage that is there");

// 2. Once, but the context has moved on a little: still highlighted. A word
//    changed 20 characters before the quote leaves most of it agreeing.
const edited = post.replace("I built", "I made");
same(find(edited, live), at(edited, live.exact), "an edit some way off");

// 3. Paragraphs split or joined around a quote do not matter.
const split = post.replace(" The whole thing", "\nThe whole thing");
same(find(split, live), at(split, live.exact), "a paragraph split after it");

// 4. Twice, and one place's context clearly wins: that place.
same(find(post, blue), at(post, "The city", post.indexOf("Bananas")), "the second of two");

// 5. The passage deleted, a look-alike left: nothing, not the look-alike.
const gone = post.replace("Bananas are nice. The city is blue.\n", "");
same(find(gone, blue), null, "a deleted passage");

// 6. The quoted words changed: nothing.
same(find(post.replace("20 days", "three weeks"), live), null, "changed words");

// 7. Twice with the same context, so neither wins: nothing.
const twice = "Intro. Same words here. Outro.\nIntro. Same words here. Outro.\n";
same(find(twice, { exact: "Same words", prefix: "Intro. ", suffix: " here. Outro." }), null, "two identical places");

// 8. Twice, the context agreeing a little better at one, but not clearly.
const close = "He said the city glows at night, and then left.\nShe said the city glows at noon, and then left.\n";
same(find(close, { exact: "the city glows", prefix: "x said ", suffix: " at ni" }), null, "a narrow win");

// 9. No stored context at all: only a single place counts.
same(find(post, { exact: "seven weeks", prefix: "", suffix: "" }), at(post, "seven weeks"), "no context, once");
same(find(twice, { exact: "Same words", prefix: "", suffix: "" }), null, "no context, twice");
same(find(post, { exact: "   ", prefix: "", suffix: "" }), null, "blank words");

// 10. Overlapping and identical passages make one group; the rest stay apart.
same(
  groupQuotes([
    { id: "a", at: [10, 20] },
    { id: "b", at: [40, 50] },
    { id: "c", at: [15, 30] },
    { id: "d", at: [10, 20] },
    { id: "e", at: [30, 35] },
  ]),
  [
    { at: [10, 30], ids: ["a", "c", "d"] },
    { at: [30, 35], ids: ["e"] },
    { at: [40, 50], ids: ["b"] },
  ],
  "groups",
);
// The ids keep the comments' order, not the passages'.
same(groupQuotes([{ id: "x", at: [5, 9] }, { id: "y", at: [0, 6] }]), [{ at: [0, 9], ids: ["x", "y"] }], "group order");

if (failures) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("quotes: all checks passed.");
