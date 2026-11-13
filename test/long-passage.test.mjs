// test/long-passage.test.mjs: a draft comment on a whole paragraph, or on
// several, is quoted whole, placed again whole in the read view and in the
// editor, and one longer than a comment holds is refused, never cut short.
// A passage quoted before, cut at 500 characters inside a word, is still
// placed. Every text is made up.
import "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import { extensions } from "../src/front/private/editor/schema.js";
import { fromMarkdown } from "../src/front/private/editor/markdown.js";
import { commentAnchors } from "../src/front/private/editor/anchors.js";
import { indexText, quoteFromRange } from "../src/front/quotes.js";
import { QUOTE_MAX, findWhole, grewTooLong, quoteAt, tooLong } from "../src/front/private/place.js";

/** A made-up paragraph of about 950 characters, its sentences numbered from `n`. */
const paragraph = (word, n = 1) =>
  Array.from({ length: 17 }, (_, i) => `Sentence ${n + i} of the ${word} paragraph runs on for a while.`).join(" ");
const FIRST = paragraph("first");
const SECOND = paragraph("second", 20);
const THIRD = paragraph("third", 40);
const BODY = `## A heading\n\nA short opening line.\n\n${FIRST}\n\n${SECOND}\n\n${THIRD}\n\nA short closing line.\n`;

/** The read view's text of BODY, as DraftComments renders it. */
function render() {
  const t = document.createElement("template");
  t.innerHTML = globalThis.__marked.marked.parse(BODY);
  document.body.replaceChildren(t.content);
  return document.body;
}

/** A selection from the first character of `from` to the last of `to`, both in the index's text. */
function select(index, from, to = from) {
  const at = index.text.indexOf(from);
  const last = index.text.indexOf(to, at) + to.length - 1;
  const range = document.createRange();
  range.setStart(index.nodes[at], index.offsets[at]);
  range.setEnd(index.nodes[last], index.offsets[last] + 1);
  return range;
}

/** As the read view quotes a selection: whole, however long. */
const quoteOf = (index, range) => {
  const { exact, prefix, suffix } = quoteFromRange(index, range, Infinity);
  return { exact, prefix, suffix };
};

test.before(async () => {
  globalThis.__marked = await import("marked");
});

test("a whole paragraph of about 950 characters is quoted whole and found again whole", () => {
  assert.ok(FIRST.length > 900 && FIRST.length < 1000, `${FIRST.length}`);
  const index = indexText(render());
  const q = quoteOf(index, select(index, FIRST));
  assert.equal(q.exact, FIRST);
  assert.equal(q.exact.length, FIRST.length);
  assert.equal(tooLong(q), "");
  const at = findWhole(index, q);
  assert.deepEqual(at, [index.text.indexOf(FIRST), index.text.indexOf(FIRST) + FIRST.length]);
  assert.deepEqual(quoteAt(index, at), q);
});

test("a selection across three paragraphs is quoted whole, line breaks and all, and found again", () => {
  const index = indexText(render());
  const q = quoteOf(index, select(index, FIRST, THIRD));
  assert.equal(q.exact, `${FIRST}\n${SECOND}\n${THIRD}`);
  assert.ok(q.exact.length > 2800 && q.exact.length <= QUOTE_MAX);
  assert.equal(tooLong(q), "");
  const at = findWhole(index, q);
  assert.equal(index.text.slice(...at), q.exact);
});

test("a selection longer than a comment holds is refused, saying by how much", () => {
  const long = `${FIRST} ${SECOND} ${THIRD} ${paragraph("fourth", 60)} ${paragraph("fifth", 80)} ${paragraph("sixth", 100)}`;
  assert.ok(long.length > QUOTE_MAX);
  document.body.innerHTML = `<p>${long}</p>`;
  const index = indexText(document.body);
  const q = quoteFromRange(index, select(index, long), Infinity);
  assert.equal(q.exact, long, "not cut short");
  assert.equal(q.trimmed, false);
  const over = long.length - QUOTE_MAX;
  assert.equal(tooLong(q), `This passage is ${over.toLocaleString("en-US")} characters over the 5,000 a comment can hold. Select a shorter one to comment on it.`);
  assert.equal(tooLong({ exact: "x".repeat(QUOTE_MAX + 1) }), "This passage is 1 character over the 5,000 a comment can hold. Select a shorter one to comment on it.");
  assert.equal(tooLong({ exact: "x".repeat(QUOTE_MAX) }), "");
  assert.equal(tooLong(null), "");
});

test("a passage quoted before, cut at 500 characters inside a word, is still placed there", () => {
  const index = indexText(render());
  // As the read view quoted it then: the first 500 characters, ending inside a word.
  const old = quoteFromRange(index, select(index, FIRST), 500);
  assert.equal(old.trimmed, true);
  assert.equal(old.exact, FIRST.slice(0, 500));
  assert.match(FIRST.slice(499, 501), /^\p{L}\p{L}$/u, "cut inside a word");
  const at = findWhole(index, old);
  assert.deepEqual(at, [index.text.indexOf(FIRST), index.text.indexOf(FIRST) + 500]);
});

test("long passages are placed quickly in a long draft", () => {
  const paragraphs = Array.from({ length: 200 }, (_, i) => paragraph(`number ${i}`, i * 17));
  document.body.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join("");
  const index = indexText(document.body);
  assert.ok(index.text.length > 190_000);
  const quotes = Array.from({ length: 100 }, (_, i) => {
    const from = paragraphs[i * 2];
    return quoteOf(index, select(index, from, paragraphs[i * 2 + 4] ?? from));
  });
  const started = performance.now();
  for (const q of quotes) assert.equal(index.text.slice(...findWhole(index, q)), q.exact);
  const took = performance.now() - started;
  assert.ok(took < 2000, `${Math.round(took)} ms for 100 passages of up to ${Math.max(...quotes.map((q) => q.exact.length))} characters`);
});

test("the editor places a whole paragraph and a passage across paragraphs, and sends them whole", () => {
  const index = indexText(render());
  const one = quoteOf(index, select(index, FIRST));
  const three = quoteOf(index, select(index, FIRST, THIRD));
  const { extension, handle } = commentAnchors();
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: [...extensions(), extension], content: fromMarkdown(BODY).doc, injectCSS: false });
  handle.setItems([{ id: "t-one", find: one }, { id: "t-three", find: three }]);
  let found;
  handle.subscribe((f) => (found = f));
  assert.ok(found.placed.has("t-one") && found.placed.has("t-three"));
  let q = handle.quotes();
  assert.deepEqual(q.get("t-one"), one, "as the read view quoted it");
  assert.deepEqual(q.get("t-three"), three);

  // An edit inside the second paragraph: the long passage keeps all of it.
  let pos = null;
  editor.state.doc.descendants((node, p) => {
    if (pos == null && node.isText && node.text.includes("Sentence 25 ")) pos = p + node.text.indexOf("Sentence 25 ");
  });
  editor.commands.insertContentAt(pos, "An added sentence. ");
  q = handle.quotes();
  assert.equal(q.get("t-three").exact, three.exact.replace("Sentence 25 ", "An added sentence. Sentence 25 "));
  assert.deepEqual(q.get("t-one"), one, "the first paragraph is as it was");
  editor.destroy();
});

/** A made-up passage of exactly QUOTE_MAX characters, a paragraph of its own. */
const FULL = (() => {
  const t = Array.from({ length: 6 }, (_, i) => paragraph(`full ${i}`, i * 17)).join(" ").slice(0, QUOTE_MAX - 1) + ".";
  assert.equal(t.length, QUOTE_MAX);
  return t;
})();
const FULL_BODY = `A short opening line.\n\n${FULL}\n\nA short closing line.\n`;

/** An editor on `body`, with the comments' anchors, and a way to read what they say now. */
function editorOn(body, items) {
  const { extension, handle } = commentAnchors();
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: [...extensions(), extension], content: fromMarkdown(body).doc, injectCSS: false });
  handle.setItems(items);
  const found = () => {
    let f;
    handle.subscribe((x) => (f = x))();
    return f;
  };
  /** Where `text` starts in the document. */
  const at = (text) => {
    let pos = null;
    editor.state.doc.descendants((node, p) => {
      if (pos == null && node.isText && node.text.includes(text)) pos = p + node.text.indexOf(text);
    });
    return pos;
  };
  return { editor, handle, found, at };
}

test("a passage edits make longer than a comment holds is never cut short: its last place is kept, and its card says so", () => {
  document.body.innerHTML = "";
  const t = document.createElement("template");
  t.innerHTML = globalThis.__marked.marked.parse(FULL_BODY);
  document.body.replaceChildren(t.content);
  const index = indexText(document.body);
  const q = quoteOf(index, select(index, FULL));
  assert.equal(q.exact.length, QUOTE_MAX);
  document.body.innerHTML = "";

  // Published, its anchor this passage: what the server has for it.
  const { editor, handle, found, at } = editorOn(FULL_BODY, [{ id: "t-full", find: q, quote: q }]);
  assert.ok(found().placed.has("t-full"));
  assert.deepEqual(handle.quotes().get("t-full"), q);
  assert.deepEqual(handle.changes(handle.quotes()), [], "nothing to send");

  // Thirteen characters typed inside it: 5,013.
  const pos = at("Sentence 20 ");
  assert.ok(pos != null);
  editor.commands.insertContentAt(pos, "Added words. ");
  assert.equal("Added words. ".length, 13);
  assert.equal(found().long.get("t-full"), QUOTE_MAX + 13, "the card is told its length");
  assert.ok(found().placed.has("t-full"), "and the editor still marks all of it");
  assert.equal(handle.quotes().has("t-full"), false, "not read as 5,000 of it, nor as anything");
  assert.deepEqual(handle.changes(handle.quotes()), [], "so the server keeps the place it had");
  assert.equal(grewTooLong(5013), "This passage is now 5,013 characters, 13 more than the 5,000 a comment can hold, so its new place isn't saved and the comment keeps the one it had. Shorten the passage by 13 characters to save where it is now.");
  assert.match(grewTooLong(5001), /Shorten the passage by 1 character to save/);

  // Shortened again, by more than it grew: its new place goes, whole.
  editor.commands.deleteRange({ from: pos, to: pos + 13 + 12 });
  assert.equal(found().long.size, 0, "the card says nothing now");
  const now = handle.quotes().get("t-full");
  assert.equal(now.exact, FULL.replace("Added words. ", "").replace(FULL.slice(FULL.indexOf("Sentence 20 "), FULL.indexOf("Sentence 20 ") + 12), ""));
  assert.equal(now.exact.length, QUOTE_MAX - 12);
  assert.deepEqual(handle.changes(handle.quotes()), [{ thread: "t-full", ...now }]);
  editor.destroy();
});

test("one still pending, grown past what a comment holds, keeps the passage it had too", () => {
  const index = indexText(render());
  const one = quoteOf(index, select(index, FIRST));
  const { editor, handle, found, at } = editorOn(BODY, [{ id: "p-one", find: null, quote: one, pending: true }]);
  assert.ok(found().placed.has("p-one"));
  editor.commands.insertContentAt(at("Sentence 5 "), "More made-up words. ".repeat(250));
  assert.ok(found().long.get("p-one") > QUOTE_MAX);
  assert.equal(handle.quotes().has("p-one"), false, "nothing for the review to follow");
  editor.destroy();
});
