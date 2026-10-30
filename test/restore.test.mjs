// test/restore.test.mjs: restoring a version is one step in the undo
// history, its title, date and summary with its text. Every text here is
// made up.
import "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import { extensions, metaChange, replaceAll } from "../src/front/private/editor/schema.js";
import { fromMarkdown, toMarkdown } from "../src/front/private/editor/markdown.js";

const NOW = { title: "A walk to the mill", date: "2026-10-29", summary: "Where the river bends." };
const OLD = { title: "An older title", date: "2026-10-01", summary: "An older summary." };

function setup() {
  const element = document.createElement("div");
  document.body.append(element);
  const { doc } = fromMarkdown("The mill wheel turns all day.\n");
  const editor = new Editor({ element, extensions: extensions(), content: { ...doc, attrs: { meta: NOW } }, injectCSS: false });
  // The editor copies each field change onto the document as DraftEditor does.
  const seen = [];
  editor.on("transaction", ({ transaction }) => {
    const m = metaChange(transaction);
    if (m) seen.push(m);
  });
  return { editor, seen };
}

const body = (editor) => toMarkdown(editor.state.doc).trim();

test("undoing a restore brings back the text, title, date and summary together, and redo the version's", () => {
  const { editor, seen } = setup();
  editor.view.dispatch(replaceAll(editor.state, fromMarkdown("An older paragraph.\n").doc, OLD));
  assert.equal(body(editor), "An older paragraph.");
  assert.deepEqual(editor.state.doc.attrs.meta, OLD);
  assert.deepEqual(seen.at(-1), OLD);

  editor.commands.undo();
  assert.equal(body(editor), "The mill wheel turns all day.");
  assert.deepEqual(editor.state.doc.attrs.meta, NOW);
  assert.deepEqual(seen.at(-1), NOW, "the fields hear of it");

  editor.commands.redo();
  assert.equal(body(editor), "An older paragraph.");
  assert.deepEqual(editor.state.doc.attrs.meta, OLD);
  assert.deepEqual(seen.at(-1), OLD);
  editor.destroy();
});

test("the fields typed in before a restore are what its undo brings back, and are not undone themselves", () => {
  const { editor } = setup();
  const typed = { ...NOW, title: "A walk to the old mill" };
  editor.view.dispatch(editor.state.tr.setDocAttribute("meta", typed).setMeta("addToHistory", false));
  assert.equal(editor.can().undo(), false, "a field's change is not in the text's history");
  editor.view.dispatch(replaceAll(editor.state, fromMarkdown("An older paragraph.\n").doc, OLD));
  // A field changed after the restore, then the restore undone.
  editor.view.dispatch(editor.state.tr.setDocAttribute("meta", { ...OLD, summary: "Changed after." }).setMeta("addToHistory", false));
  editor.commands.undo();
  assert.deepEqual(editor.state.doc.attrs.meta, typed);
  assert.equal(body(editor), "The mill wheel turns all day.");
  editor.destroy();
});

test("the title, date and summary are never written into the Markdown", () => {
  const { editor } = setup();
  assert.equal(toMarkdown(editor.state.doc), "The mill wheel turns all day.\n");
  editor.destroy();
});
