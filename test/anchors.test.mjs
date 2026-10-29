// test/anchors.test.mjs: comment passages following edits in the editor.
// Every text here is made up.
import "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import { extensions } from "../src/front/private/editor/schema.js";
import { fromMarkdown } from "../src/front/private/editor/markdown.js";
import { commentAnchors } from "../src/front/private/editor/anchors.js";
import { indexText, quoteFromRange } from "../src/front/quotes.js";

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

test("text typed where a deleted passage was does not bring it back", () => {
  const { editor, handle } = setup();
  const from = posOf(editor, "lighthouse keeper");
  editor.commands.deleteRange({ from, to: from + "lighthouse keeper".length });
  editor.commands.insertContentAt(from, "lighthouse keeper");
  assert.deepEqual(handle.quotes().get("t-keeper"), { gone: true });
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
