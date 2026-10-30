// test/anchors.test.mjs: comment passages following edits in the editor.
// Every text here is made up.
import "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import { extensions, replaceAll } from "../src/front/private/editor/schema.js";
import { fromMarkdown } from "../src/front/private/editor/markdown.js";
import { commentAnchors } from "../src/front/private/editor/anchors.js";
import { findQuote, indexText, quoteFromRange } from "../src/front/quotes.js";
import { findThread, findWhole } from "../src/front/private/place.js";

const BODY = `## The harbour

The ferry left at dawn and the gulls followed it out past the breakwater, calling all the way.

A second paragraph about the lighthouse keeper, who kept a ledger of every ship that passed.
`;

/** The quote a reader's selection of `words` in the read view would make. */
function readerQuote(words) {
  const t = document.createElement("template");
  const { marked } = globalThis.__marked;
  t.innerHTML = marked.parse(BODY);
  const root = document.createElement("div");
  root.append(t.content);
  const index = indexText(root);
  const at = index.text.indexOf(words);
  const range = document.createRange();
  range.setStart(index.nodes[at], index.offsets[at]);
  const last = at + words.length - 1;
  range.setEnd(index.nodes[last], index.offsets[last] + 1);
  const q = quoteFromRange(index, range, 500);
  return { exact: q.exact, prefix: q.prefix, suffix: q.suffix };
}

function setup() {
  const { extension, handle } = commentAnchors();
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: [...extensions(), extension], content: fromMarkdown(BODY).doc, injectCSS: false });
  const ferry = readerQuote("gulls followed it out");
  const keeper = readerQuote("lighthouse keeper");
  handle.setItems([
    { id: "t-ferry", find: ferry },
    { id: "t-keeper", find: keeper },
    { id: "t-lost", find: { exact: "words that are nowhere", prefix: "", suffix: "" } },
  ]);
  return { editor, handle, ferry, keeper };
}

/** The document position of `words` in the editor's text. */
function posOf(editor, words) {
  let found = null;
  editor.state.doc.descendants((node, pos) => {
    if (found == null && node.isText && node.text.includes(words)) found = pos + node.text.indexOf(words);
  });
  return found;
}

test.before(async () => {
  globalThis.__marked = await import("marked");
});

test("passages are found in the editor and drawn as decorations", () => {
  const { editor, handle } = setup();
  let found;
  handle.subscribe((f) => (found = f));
  assert.ok(found.placed.has("t-ferry"));
  assert.ok(found.placed.has("t-keeper"));
  assert.ok(!found.placed.has("t-lost"));
  const marks = found.marks.get("t-ferry");
  assert.equal(marks.map((m) => m.textContent).join(""), "gulls followed it out");
  assert.equal(marks[0].tagName, "MARK");
  assert.ok(marks[0].classList.contains("post-quote"));
  // Nothing has changed, so nothing needs saving.
  const q = handle.quotes();
  assert.deepEqual(q.get("t-ferry"), readerQuote("gulls followed it out"));
  assert.equal(q.has("t-lost"), false);
  editor.destroy();
});

test("an edit inside a passage stays in it", () => {
  const { editor, handle, ferry } = setup();
  editor.commands.insertContentAt(posOf(editor, "followed") + "followed".length, " and circled");
  const q = handle.quotes().get("t-ferry");
  assert.equal(q.exact, "gulls followed and circled it out");
  assert.equal(q.prefix, ferry.prefix);
  assert.equal(q.suffix, ferry.suffix);
  editor.destroy();
});

test("words typed before a passage move it, and change only its context", () => {
  const { editor, handle, keeper } = setup();
  editor.commands.insertContentAt(posOf(editor, "lighthouse"), "old ");
  const q = handle.quotes().get("t-keeper");
  assert.equal(q.exact, "lighthouse keeper");
  assert.notEqual(q.prefix, keeper.prefix);
  assert.ok(q.prefix.endsWith("about the old "));
  assert.equal(q.suffix, keeper.suffix);
  // Typing right before it is not inside it either.
  assert.equal(editor.state.doc.textBetween(...range(handle, editor, "t-keeper")), "lighthouse keeper");
  editor.destroy();
});

test("a passage deleted entirely is gone, and undo brings it back", async () => {
  const { editor, handle } = setup();
  let found;
  handle.subscribe((f) => (found = f));
  const from = posOf(editor, "gulls followed it out");
  editor.commands.deleteRange({ from: from - 1, to: from + "gulls followed it out".length + 1 });
  assert.deepEqual(handle.quotes().get("t-ferry"), { gone: true });
  await new Promise((done) => requestAnimationFrame(done));
  assert.ok(!found.placed.has("t-ferry"));
  editor.commands.undo();
  assert.equal(handle.quotes().get("t-ferry").exact, "gulls followed it out");
  editor.destroy();
});

/** A tracked passage's document range, read through its decoration. */
function range(handle, editor, id) {
  const marks = handle.quotes() && editor.view.dom.querySelectorAll(`[data-threads~="${id}"]`);
  const from = editor.view.posAtDOM(marks[0].firstChild, 0);
  const last = marks[marks.length - 1].lastChild;
  return [from, editor.view.posAtDOM(last, last.length)];
}

test("only passages that changed are sent, and a deleted one as empty", () => {
  const { editor, handle } = setup();
  assert.deepEqual(handle.changes(handle.quotes()), []);

  editor.commands.insertContentAt(posOf(editor, "followed") + "followed".length, " and circled");
  const first = handle.changes(handle.quotes());
  assert.deepEqual(first.map((c) => [c.thread, c.exact]), [["t-ferry", "gulls followed and circled it out"]]);
  handle.sent(first);
  assert.deepEqual(handle.changes(handle.quotes()), []);

  const from = posOf(editor, "lighthouse keeper");
  editor.commands.deleteRange({ from, to: from + "lighthouse keeper".length });
  assert.deepEqual(handle.changes(handle.quotes()), [{ thread: "t-keeper", exact: "", prefix: "", suffix: "" }]);
  editor.destroy();
});

test("undo after deleting everything puts each passage back on its own words", () => {
  const { editor, handle, ferry } = setup();
  editor.commands.selectAll();
  editor.commands.deleteSelection();
  assert.deepEqual(handle.quotes().get("t-ferry"), { gone: true });
  editor.commands.undo();
  assert.deepEqual(handle.quotes().get("t-ferry"), ferry);
  assert.equal(handle.quotes().get("t-keeper").exact, "lighthouse keeper");
  assert.deepEqual(handle.changes(handle.quotes()), []);
  editor.destroy();
});

test("undo after the whole text is replaced finds the passages again", () => {
  const { editor, handle, ferry } = setup();
  // As "Load the latest" does: the text replaced, the passages looked for afresh.
  editor.commands.setContent(fromMarkdown(BODY.replace("ferry", "boat")).doc, { emitUpdate: false });
  handle.reset();
  assert.equal(handle.quotes().get("t-keeper").exact, "lighthouse keeper");
  editor.commands.undo();
  assert.deepEqual(handle.quotes().get("t-ferry"), ferry);
  assert.equal(handle.quotes().get("t-keeper").exact, "lighthouse keeper");
  editor.destroy();
});

test("undoing a restore that had no place for a passage finds it again", () => {
  const { editor, handle, ferry } = setup();
  // As restoring a version does: a text without the passage, looked for afresh.
  editor.commands.setContent(fromMarkdown(BODY.replace("the gulls followed it out", "nobody saw it")).doc, { emitUpdate: false });
  handle.reset();
  assert.equal(handle.quotes().has("t-ferry"), false);
  editor.commands.undo();
  assert.equal(handle.quotes().has("t-ferry"), false);
  handle.findMissing();
  assert.deepEqual(handle.quotes().get("t-ferry"), ferry);
  // Found as the server has it, so there is nothing to send for it.
  assert.deepEqual(handle.changes(handle.quotes()), []);
  // A thread nowhere in the text stays unplaced.
  assert.equal(handle.quotes().has("t-lost"), false);
  editor.destroy();
});

test("text typed where a deleted passage was is not it, until the passage is looked for again", () => {
  const { editor, handle, keeper } = setup();
  const from = posOf(editor, "lighthouse keeper");
  editor.commands.deleteRange({ from, to: from + "lighthouse keeper".length });
  editor.commands.insertContentAt(from, "lighthouse keeper");
  assert.deepEqual(handle.quotes().get("t-keeper"), { gone: true });
  // As the editor does once typing pauses: its words and context are back.
  handle.findMissing();
  assert.deepEqual(handle.quotes().get("t-keeper"), keeper);
  editor.destroy();
});

test("an undo tells repeated words apart by the words around them", () => {
  const { editor, handle } = setup();
  // "the" is everywhere; the thread is on the one before "breakwater".
  const at = posOf(editor, "the breakwater");
  handle.setItems([{ id: "t-the", find: { exact: "the", prefix: "it out past ", suffix: " breakwater, calling all the way" } }]);
  assert.equal(handle.quotes().get("t-the").exact, "the");
  editor.commands.selectAll();
  editor.commands.deleteSelection();
  editor.commands.undo();
  const q = handle.quotes().get("t-the");
  assert.equal(q.exact, "the");
  assert.ok(q.suffix.startsWith(" breakwater"));
  void at;
  editor.destroy();
});

test("a passage in a raw block is the whole block, kept until the block is deleted", async () => {
  const md = "Before the picture.\n\n<figure><figcaption>A tin boat on a pond at noon</figcaption></figure>\n\nAfter the picture.\n";
  const { extension, handle } = commentAnchors();
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: [...extensions(), extension], content: fromMarkdown(md).doc, injectCSS: false });
  const find = { exact: "boat", prefix: "A tin ", suffix: " on a pond" };
  handle.setItems([{ id: "t-boat", find }]);
  let found;
  handle.subscribe((f) => (found = f));
  await new Promise((done) => requestAnimationFrame(done));
  assert.ok(found.placed.has("t-boat"));
  // Its card goes beside the block, which is outlined.
  const marked = found.marks.get("t-boat");
  assert.equal(marked.length, 1);
  assert.equal(marked[0].querySelector("figcaption")?.textContent, "A tin boat on a pond at noon");
  assert.ok(marked[0].classList.contains("editor-raw-quoted"));
  // Unchanged while the block is: nothing to send, even after edits around it.
  assert.deepEqual(handle.quotes().get("t-boat"), find);
  editor.commands.insertContentAt(posOf(editor, "After"), "Just ");
  editor.commands.insertContentAt(posOf(editor, "picture."), "small ");
  assert.deepEqual(handle.changes(handle.quotes()), []);
  // Deleting the block deletes the passage; undo brings it back.
  let at = null;
  editor.state.doc.forEach((n, pos) => n.type.name === "rawBlock" && (at = pos));
  editor.commands.deleteRange({ from: at, to: at + 1 });
  assert.deepEqual(handle.changes(handle.quotes()), [{ thread: "t-boat", exact: "", prefix: "", suffix: "" }]);
  editor.commands.undo();
  assert.deepEqual(handle.quotes().get("t-boat"), find);
  editor.destroy();
});

test("a raw block deleted, saved as gone, then undone, is sent again on its words", () => {
  const md = "Before the picture.\n\n<figure><figcaption>A tin boat on a pond at noon</figcaption></figure>\n\nAfter the picture.\n";
  const { extension, handle } = commentAnchors();
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: [...extensions(), extension], content: fromMarkdown(md).doc, injectCSS: false });
  const find = { exact: "boat", prefix: "A tin ", suffix: " on a pond" };
  handle.setItems([{ id: "t-boat", find }]);
  let at = null;
  editor.state.doc.forEach((n, pos) => n.type.name === "rawBlock" && (at = pos));
  editor.commands.deleteRange({ from: at, to: at + 1 });
  const gone = handle.changes(handle.quotes());
  assert.deepEqual(gone, [{ thread: "t-boat", exact: "", prefix: "", suffix: "" }]);
  handle.sent(gone);
  assert.deepEqual(handle.changes(handle.quotes()), []);
  editor.commands.undo();
  assert.deepEqual(handle.quotes().get("t-boat"), find);
  const back = handle.changes(handle.quotes());
  assert.deepEqual(back, [{ thread: "t-boat", ...find }]);
  handle.sent(back);
  assert.deepEqual(handle.changes(handle.quotes()), []);
  editor.destroy();
});

test("a passage deleted, saved as gone, then undone, is sent again on its words", () => {
  const { editor, handle, ferry } = setup();
  const from = posOf(editor, "gulls followed it out");
  editor.commands.deleteRange({ from, to: from + "gulls followed it out".length });
  const gone = handle.changes(handle.quotes());
  assert.deepEqual(gone, [{ thread: "t-ferry", exact: "", prefix: "", suffix: "" }]);
  handle.sent(gone);
  editor.commands.undo();
  assert.deepEqual(handle.changes(handle.quotes()), [{ thread: "t-ferry", ...ferry }]);
  editor.destroy();
});

test("a thread saved as gone is found again by its reader's quote when a restore brings its words back, and sent", () => {
  const { editor, handle, ferry } = setup();
  // The server has the passage as deleted: only the reader's quote is left.
  handle.setItems([
    { id: "t-ferry", find: null, quote: ferry, gone: true },
    { id: "t-lost", find: null, quote: { exact: "words that are nowhere", prefix: "", suffix: "" }, gone: true },
  ]);
  assert.equal(handle.quotes().has("t-ferry"), true, "its words are in the text");
  assert.deepEqual(handle.changes(handle.quotes()), [{ thread: "t-ferry", ...ferry }]);
  // Gone from the text, as the server has it: nothing to send.
  editor.commands.setContent(fromMarkdown(BODY.replace("the gulls followed it out", "nobody saw it")).doc, { emitUpdate: false });
  handle.reset();
  assert.equal(handle.quotes().has("t-ferry"), false);
  assert.deepEqual(handle.changes(handle.quotes()), []);
  // A version with the words restored: found, and sent on them.
  editor.commands.setContent(fromMarkdown(BODY).doc, { emitUpdate: false });
  handle.reset();
  assert.deepEqual(handle.quotes().get("t-ferry"), ferry);
  const back = handle.changes(handle.quotes());
  assert.deepEqual(back, [{ thread: "t-ferry", ...ferry }]);
  handle.sent(back);
  assert.deepEqual(handle.changes(handle.quotes()), []);
  assert.equal(handle.quotes().has("t-lost"), false);
  editor.destroy();
});

test("a thread with no passage is found again when its words are pasted back", () => {
  const { editor, handle, ferry } = setup();
  handle.setItems([{ id: "t-ferry", find: null, quote: ferry, gone: true }]);
  const from = posOf(editor, "gulls followed it out");
  editor.commands.deleteRange({ from, to: from + "gulls followed it out".length });
  handle.reset();
  assert.equal(handle.quotes().has("t-ferry"), false);
  editor.commands.insertContentAt(from, "gulls followed it out");
  handle.findMissing();
  assert.deepEqual(handle.quotes().get("t-ferry"), ferry);
  assert.deepEqual(handle.changes(handle.quotes()), [{ thread: "t-ferry", ...ferry }]);
  editor.destroy();
});

test("a thread whose anchor is not in the text is found by its reader's quote, and its place sent", () => {
  const { editor, handle, ferry } = setup();
  const moved = { exact: "gulls flew it out", prefix: ferry.prefix, suffix: ferry.suffix };
  handle.setItems([{ id: "t-ferry", find: moved, quote: ferry, gone: false }]);
  assert.deepEqual(handle.quotes().get("t-ferry"), ferry);
  assert.deepEqual(handle.changes(handle.quotes()), [{ thread: "t-ferry", ...ferry }]);
  editor.destroy();
});

test("after Keep mine every passage is sent again, a deleted one as deleted", () => {
  const { editor, handle, ferry, keeper } = setup();
  assert.deepEqual(handle.changes(handle.quotes()), []);
  const from = posOf(editor, "lighthouse keeper");
  editor.commands.deleteRange({ from, to: from + "lighthouse keeper".length });
  handle.sent(handle.changes(handle.quotes()));
  assert.deepEqual(handle.changes(handle.quotes()), []);
  handle.forget();
  const all = handle.changes(handle.quotes());
  assert.deepEqual(all.sort((a, b) => a.thread.localeCompare(b.thread)), [
    { thread: "t-ferry", ...ferry },
    { thread: "t-keeper", exact: "", prefix: "", suffix: "" },
  ]);
  handle.sent(all);
  assert.deepEqual(handle.changes(handle.quotes()), []);
  void keeper;
  editor.destroy();
});

test("the comments saying the server has a passage elsewhere makes it differ, so it is sent", () => {
  const { editor, handle, ferry, keeper } = setup();
  // Another session moved it; the next poll says so.
  handle.setItems([
    { id: "t-ferry", find: { exact: "gulls followed", prefix: ferry.prefix, suffix: " it out" }, quote: ferry },
    { id: "t-keeper", find: keeper, quote: keeper },
  ]);
  assert.deepEqual(handle.changes(handle.quotes()), [{ thread: "t-ferry", ...ferry }]);
  editor.destroy();
});

// Words pasted into the words after a passage, saved; the version before
// them restored, and the restore undone: the passage is beside its words
// again, on them, not sent as deleted.
const HARBOUR = `## Notes

Morning notes from the harbour office, written in pencil. The ferry left at dawn and the gulls followed it out past the breakwater, calling all the way to the lighthouse and back again before noon.
`;

test("undoing a restore puts a passage back on its words even with words pasted beside it", () => {
  const { extension, handle } = commentAnchors();
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: [...extensions(), extension], content: fromMarkdown(HARBOUR).doc, injectCSS: false });
  const text = indexText(editor.view.dom).text;
  const at = text.indexOf("gulls followed");
  const quote = { exact: "gulls followed", prefix: text.slice(at - 32, at), suffix: text.slice(at + 14, at + 46) };
  handle.setItems([{ id: "t-gulls", find: quote, quote, gone: false }]);
  assert.deepEqual(handle.quotes().get("t-gulls"), quote);

  // A paste 14 characters into the words after it: under three quarters of
  // its context is left, so the reader's quote alone no longer finds it.
  editor.commands.insertContentAt(posOf(editor, "gulls followed") + 14 + 14, " PASTED PLAIN PASTED BOLD");
  assert.equal(findQuote(indexText(editor.view.dom), quote), null);
  const moved = handle.quotes().get("t-gulls");
  assert.equal(moved.exact, "gulls followed");
  assert.notEqual(moved.suffix, quote.suffix);
  const saved = handle.changes(handle.quotes());
  assert.deepEqual(saved, [{ thread: "t-gulls", ...moved }]);
  handle.sent(saved);
  handle.setItems([{ id: "t-gulls", find: moved, quote, gone: false }]);

  // The version before the paste restored, as DraftEditor does it.
  editor.view.dispatch(replaceAll(editor.state, fromMarkdown(HARBOUR).doc, null));
  handle.reset();
  assert.deepEqual(handle.quotes().get("t-gulls"), quote);
  const restored = handle.changes(handle.quotes());
  assert.deepEqual(restored, [{ thread: "t-gulls", ...quote }]);
  handle.sent(restored);
  handle.setItems([{ id: "t-gulls", find: quote, quote, gone: false }]);

  // The restore undone: the paste is back, and so is the passage, on its words.
  editor.commands.undo();
  assert.ok(editor.state.doc.textContent.includes("PASTED PLAIN"));
  handle.findMissing();
  assert.deepEqual(handle.quotes().get("t-gulls"), moved);
  assert.deepEqual(handle.changes(handle.quotes()), [{ thread: "t-gulls", ...moved }]);
  editor.destroy();
});

// A one-word quote whose passage was deleted and saved as gone, then a text
// where the word is only part of another word, with the quote's words after
// it but none before: it is not that passage, in the editor or the read view.
const LEDGER = `## Notes

The keeper wrote the date in the ledger, then underlined it twice in red pencil from the drawer by the door.
`;

test("a gone one-word quote is not put on part of another word that has only its words after it", () => {
  const { extension, handle } = commentAnchors();
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: [...extensions(), extension], content: fromMarkdown(LEDGER).doc, injectCSS: false });
  const text = indexText(editor.view.dom).text;
  const at = text.indexOf(" it ") + 1;
  const quote = { exact: "it", prefix: text.slice(at - 32, at), suffix: text.slice(at + 2, at + 34) };
  handle.setItems([{ id: "t-it", find: quote, quote, gone: false }]);
  assert.deepEqual(handle.quotes().get("t-it"), quote);

  // The passage deleted and saved as gone.
  editor.commands.setContent(fromMarkdown("A wholly new paragraph.\n").doc);
  handle.findMissing();
  const gone = handle.changes(handle.quotes());
  assert.deepEqual(gone, [{ thread: "t-it", exact: "", prefix: "", suffix: "" }]);
  handle.sent(gone);
  handle.setItems([{ id: "t-it", find: null, quote, gone: true }]);

  // A new sentence ending in a word with "it" inside it, then the quote's words after it.
  editor.commands.setContent(fromMarkdown(`A separate example: bullshit${quote.suffix}\n`).doc);
  handle.findMissing();
  const index = indexText(editor.view.dom);
  assert.equal(index.text.indexOf("it"), index.text.lastIndexOf("it"), "the word occurs once, inside another");
  assert.ok(index.text.includes(`bullshit${quote.suffix}`));
  assert.deepEqual(handle.quotes().get("t-it"), { gone: true });
  assert.deepEqual(handle.changes(handle.quotes()), []);
  // The read view looks for a gone thread by the reader's quote the same way.
  assert.equal(findQuote(index, quote), null);
  editor.destroy();
});
// A passage with a word added just before it (saved, and kept as a version),
// then a word just after it (saved): the server's anchor has both, the
// reader's quote neither. The version between restored has the words before
// the passage as the anchor has them and those after it as the quote does.
const V2 = HARBOUR.replace("the gulls followed it", "the grey gulls followed closely it");
const V1 = HARBOUR.replace("the gulls followed", "the grey gulls followed");

/** The reader's quote of `words` in HARBOUR and the anchor of them in V2, as the editor reads each. */
function harbourQuotes(words) {
  const read = (md) => {
    const element = document.createElement("div");
    const ed = new Editor({ element, extensions: extensions(), content: fromMarkdown(md).doc, injectCSS: false });
    const text = indexText(ed.view.dom).text;
    ed.destroy();
    return text;
  };
  const quote = (text) => {
    const at = text.indexOf(words);
    return { exact: words, prefix: text.slice(Math.max(0, at - 32), at), suffix: text.slice(at + words.length, at + words.length + 32) };
  };
  return { quote: quote(read(HARBOUR)), anchor: quote(read(V2)) };
}

function harbourEditor(md, items) {
  const { extension, handle } = commentAnchors();
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: [...extensions(), extension], content: fromMarkdown(md).doc, injectCSS: false });
  handle.setItems(items);
  return { editor, handle };
}

/** The threads the editor lists, and those of them it has a passage for. */
function listed(handle) {
  let f = null;
  handle.subscribe((x) => (f = x))();
  return { ids: f.key.split(" "), placed: f.placed };
}

test("a version restored between edits on both sides of a passage leaves its thread listed without a passage, on no other words", () => {
  const { quote, anchor } = harbourQuotes("gulls followed");
  assert.ok(anchor.prefix.endsWith("grey ") && anchor.suffix.startsWith(" closely"));
  const { editor, handle } = harbourEditor(V2, [{ id: "t-gulls", find: anchor, quote, gone: false }]);
  assert.deepEqual(handle.quotes().get("t-gulls"), anchor);
  editor.view.dispatch(replaceAll(editor.state, fromMarkdown(V1).doc, null));
  handle.reset();
  const index = indexText(editor.view.dom);
  // No one context agrees on both sides.
  assert.equal(findQuote(index, anchor), null);
  assert.equal(findQuote(index, quote), null);
  // Not placed, so nothing is sent: the server keeps the anchor it has, and
  // the thread is listed with the reader's quote.
  assert.equal(handle.quotes().has("t-gulls"), false);
  assert.deepEqual(handle.changes(handle.quotes()), []);
  const { ids, placed } = listed(handle);
  assert.ok(ids.includes("t-gulls"));
  assert.equal(placed.has("t-gulls"), false);
  assert.equal(editor.view.dom.querySelector('[data-threads~="t-gulls"]'), null);
  handle.findMissing();
  assert.equal(handle.quotes().has("t-gulls"), false);
  // The read view too, with the anchor or once it is gone.
  assert.equal(findThread(index, { find: anchor, quote, gone: false }), null);
  assert.equal(findThread(index, { find: null, quote, gone: true }), null);
  editor.destroy();
});

test("a place whose words before agree with a context the thread had but whose words after agree with none is not its", () => {
  const { quote, anchor } = harbourQuotes("gulls followed");
  const { editor, handle } = harbourEditor(V2, [{ id: "t-gulls", find: anchor, quote, gone: false }]);
  const other = HARBOUR.replace("the gulls followed it out past", "the grey gulls followed nobody along the quay past");
  editor.view.dispatch(replaceAll(editor.state, fromMarkdown(other).doc, null));
  handle.reset();
  // Not placed, so nothing is sent: the server keeps the anchor it has.
  assert.equal(handle.quotes().has("t-gulls"), false);
  assert.deepEqual(handle.changes(handle.quotes()), []);
  const index = indexText(editor.view.dom);
  assert.equal(findThread(index, { find: anchor, quote, gone: false }), null);
  assert.equal(findThread(index, { find: null, quote, gone: true }), null);
  editor.destroy();
});

test("a thread's words in two places that each agree with its contexts are placed in neither", () => {
  const { quote, anchor } = harbourQuotes("gulls followed");
  const { editor, handle } = harbourEditor(V2, [{ id: "t-gulls", find: anchor, quote, gone: false }]);
  // One place with the anchor's words before and the quote's after, one the other way round.
  const twice = `${V1.trim()}\n\nAgain. The ferry left at dawn and the gulls followed closely it out past the breakwater, calling all the way.\n`;
  editor.view.dispatch(replaceAll(editor.state, fromMarkdown(twice).doc, null));
  handle.reset();
  const index = indexText(editor.view.dom);
  assert.equal(index.text.split("gulls followed").length - 1, 2);
  assert.equal(findQuote(index, anchor), null);
  assert.equal(findQuote(index, quote), null);
  assert.equal(handle.quotes().has("t-gulls"), false);
  assert.equal(findThread(index, { find: anchor, quote, gone: false }), null);
  editor.destroy();
});

/**
 * Every way a thread with these two contexts can be looked for, in `md`: the
 * read view with either as the anchor or the quote of a gone thread, and the
 * editor's search when it opens there, after a restore to it from `from`,
 * after a paste of it, once its passage is saved as gone, and after an undo
 * that puts it back. Each the passage's words, or null.
 */
function everyPath(from, md, q1, q2) {
  const out = {};
  const words = (editor, handle) => {
    const q = handle.quotes().get("t-x");
    const marks = [...editor.view.dom.querySelectorAll('[data-threads~="t-x"]')].map((m) => m.textContent).join("");
    assert.equal(Boolean(q && !q.gone), Boolean(marks), "the passage drawn is the one read");
    return marks || null;
  };
  const text = (md) => {
    const { editor } = harbourEditor(md, []);
    const t = indexText(editor.view.dom);
    editor.destroy();
    return t;
  };
  const index = text(md);
  const read = (t) => {
    const at = findThread(index, t);
    return at && index.text.slice(...at);
  };
  out.readAnchor = read({ find: q2, quote: q1, gone: false });
  out.readOther = read({ find: q1, quote: q2, gone: false });
  out.readGone = read({ find: null, quote: q1, gone: true });
  out.readGoneOther = read({ find: null, quote: q2, gone: true });

  let e = harbourEditor(md, [{ id: "t-x", find: q2, quote: q1, gone: false }]);
  out.open = words(e.editor, e.handle);
  e.editor.destroy();

  e = harbourEditor(from, [{ id: "t-x", find: q2, quote: q1, gone: false }]);
  assert.ok(e.handle.quotes().has("t-x"), "placed in the text it is from");
  e.editor.view.dispatch(replaceAll(e.editor.state, fromMarkdown(md).doc, null));
  e.handle.reset();
  out.restore = words(e.editor, e.handle);
  e.editor.destroy();

  e = harbourEditor(from, [{ id: "t-x", find: q2, quote: q1, gone: false }]);
  e.editor.commands.setContent(fromMarkdown(md).doc);
  e.handle.findMissing();
  out.paste = words(e.editor, e.handle);
  if (!out.paste) {
    e.handle.sent(e.handle.changes(e.handle.quotes()));
    e.handle.setItems([{ id: "t-x", find: null, quote: q1, gone: true }]);
    e.handle.findMissing();
    out.gone = words(e.editor, e.handle);
    e.editor.view.dispatch(replaceAll(e.editor.state, fromMarkdown("A wholly new paragraph.\n").doc, null));
    e.editor.commands.undo();
    e.handle.findMissing();
    out.undo = words(e.editor, e.handle);
  }
  e.editor.destroy();
  return out;
}

test("a place with the words before it as one context had them and those after as another is not the thread's, by any path", () => {
  const P1 = "The surveyor wrote the figure down as ";
  const S1 = " and shut the notebook before the rain came.";
  const P2 = "The baker chalked the price beside ";
  const S2 = " on the board outside the shop this morning.";
  const q1 = { exact: "it", prefix: P1.slice(-32), suffix: S1.slice(0, 32) };
  const q2 = { exact: "it", prefix: P2.slice(-32), suffix: S2.slice(0, 32) };
  const from = `${P2}it${S2}\n`;
  // The words before one, those after the other, and the passage elsewhere
  // with new words either side.
  const hybrid = `A separate example. ${P1}it${S2}\n\nThe passage is now here: it stands on its own.\n`;
  assert.equal(findWhole({ text: hybrid }, q1), null);
  assert.equal(findWhole({ text: hybrid }, q2), null);
  const none = everyPath(from, hybrid, q1, q2);
  assert.deepEqual(Object.entries(none).filter(([, w]) => w !== null), []);
  assert.ok("undo" in none);

  // With the passage elsewhere as the reader quoted it, it is placed there, and only there.
  const real = `A separate example. ${P1}it${S2}\n\nThen: ${P1}it${S1}\n`;
  const index = { text: real };
  const at = findThread(index, { find: q2, quote: q1, gone: true });
  assert.deepEqual(at, [real.lastIndexOf("it" + S1), real.lastIndexOf("it" + S1) + 2]);
  const e = harbourEditor(from, [{ id: "t-x", find: null, quote: q1, gone: true }]);
  e.editor.view.dispatch(replaceAll(e.editor.state, fromMarkdown(real).doc, null));
  e.handle.reset();
  const placed = e.handle.quotes().get("t-x");
  assert.equal(placed.exact, "it");
  assert.ok(placed.suffix.startsWith(S1.slice(0, 20)));
  e.editor.destroy();
});

// A one-word quote at the very start of a text, so with no words before it.
const OPENING = `It was late when the ferry came in past the breakwater lights.
`;

test("a quote with no words before it is not put inside another word, by any path", () => {
  const S = " was late when the ferry came in";
  const quote = { exact: "it", prefix: "", suffix: S };
  // findQuote alone does put it there.
  assert.deepEqual(findQuote({ text: `A separate example: bullshit${S}` }, quote), [26, 28]);
  assert.equal(findWhole({ text: `A separate example: bullshit${S}` }, quote), null);

  const opening = OPENING.replace("It", "it");
  const other = `A separate example: bullshit${S}.\n`;
  // At the start of the text it is the passage.
  const first = harbourEditor(opening, [{ id: "t-it", find: quote, quote, gone: false }]);
  assert.deepEqual(first.handle.quotes().get("t-it"), quote);
  assert.deepEqual(first.handle.changes(first.handle.quotes()), []);
  first.editor.destroy();
  // Inside another word: not by any path.
  const all = everyPath(opening, other, quote, quote);
  assert.deepEqual(Object.entries(all).filter(([, w]) => w !== null), []);
  assert.ok("undo" in all);
});

test("a quote whose context has part of a word is placed in that word, and not inside another that ends or starts the same", () => {
  // As the brief puts it: the letters before it are all of the prefix.
  const quote = { exact: "it", prefix: "orb", suffix: " follows the path" };
  assert.deepEqual(findWhole({ text: "orbit follows the path" }, quote), [3, 5]);
  // findQuote alone puts it inside "rabbit": its prefix's last letter agrees.
  assert.deepEqual(findQuote({ text: "rabbit follows the path" }, quote), [4, 6]);
  assert.equal(findWhole({ text: "rabbit follows the path" }, quote), null);
  assert.equal(findWhole({ text: "a orbit follows the path" }, { ...quote, prefix: "rb" }), null);
  const rabbit = everyPath("orbit follows the path.\n", "rabbit follows the path.\n", quote, quote);
  assert.deepEqual(Object.entries(rabbit).filter(([, w]) => w !== null), []);
  // Placed in its own word by every path.
  const orbit = everyPath("Then orbit follows the path again.\n", "orbit follows the path.\n", quote, quote);
  assert.deepEqual(orbit, { readAnchor: "it", readOther: "it", readGone: "it", readGoneOther: "it", open: "it", restore: "it", paste: "it" });

  // The same after it: the word's rest must be the suffix's first letters.
  const end = { exact: "orb", prefix: "Far out the ", suffix: "it" };
  assert.deepEqual(findWhole({ text: "Far out the orbit follows the path" }, end), [12, 15]);
  assert.deepEqual(findQuote({ text: "Far out the orbital follows the path" }, end), [12, 15]);
  assert.equal(findWhole({ text: "Far out the orbital follows the path" }, end), null);
  // Letters of other alphabets are letters too.
  const greek = { exact: "ος", prefix: "λόγ", suffix: " follows the path" };
  assert.deepEqual(findWhole({ text: "λόγος follows the path" }, greek), [3, 5]);
  assert.equal(findWhole({ text: "νόμος follows the path" }, greek), null);
});

test("a quote of part of a word, as a reader may select it, is still placed on it, and only in its own word", () => {
  const text = "The keeper underlined it twice in red pencil from the drawer by the door.";
  const at = text.indexOf("lined");
  const quote = { exact: "lined it", prefix: text.slice(at - 32 < 0 ? 0 : at - 32, at), suffix: text.slice(at + 8, at + 40) };
  assert.deepEqual(findWhole({ text }, quote), [at, at + 8]);
  assert.deepEqual(findThread({ text }, { find: quote, quote, gone: false }), [at, at + 8]);
  // In another word ending the same, with all of its context after it, not.
  const other = text.replace("underlined", "outlined");
  assert.ok(findQuote({ text: other }, { ...quote, prefix: "under" }));
  assert.equal(findWhole({ text: other }, { ...quote, prefix: "under" }), null);
  assert.equal(findThread({ text: other }, { find: { ...quote, prefix: "under" }, quote, gone: true }), null);
  // The editor reads a selection of it the same way and keeps it there.
  const md = `${text}\n`;
  const e = harbourEditor(md, [{ id: "t-x", find: quote, quote, gone: false }]);
  assert.deepEqual(e.handle.quotes().get("t-x"), quote);
  assert.deepEqual(e.handle.changes(e.handle.quotes()), []);
  e.editor.destroy();
});
