// test/links.test.mjs: which addresses a draft's links may have, by every
// way the editor makes a link, and plain text pasted as it is. Every text
// here is made up.
import "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import { PASTE_RULES, extensions } from "../src/front/private/editor/schema.js";
import { fromMarkdown, toMarkdown } from "../src/front/private/editor/markdown.js";
import { safeAutoLink, safeHref } from "../src/front/private/editor/links.js";

const REFUSED = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "JAVASCRIPT:alert(1)",
  "  javascript:alert(1)",
  "\u0001\u0010 javascript:alert(1)",
  "java\tscript:alert(1)",
  "java\nscript:alert(1)",
  "java\r\nscript:alert(1)",
  "jav\ta\nsc\rript:alert(1)",
  "javascript\t:alert(1)",
  "&#106;avascript:alert(1)",
  "&#x6A;avascript:alert(1)",
  "&#106avascript:alert(1)",
  "javascript&#58;alert(1)",
  "javascript&#x3a;alert(1)",
  "javascript&colon;alert(1)",
  "javascript&amp;colon;alert(1)",
  "java&#x09;script:alert(1)",
  "java&Tab;script:alert(1)",
  " &#106;avascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "DATA:text/html;base64,PHNjcmlwdD4=",
  "vbscript:msgbox(1)",
  "VBScript:msgbox(1)",
  "file:///etc/hosts",
  "ftp://example.com/a",
  "//example.com/a",
  "/\\example.com/a",
  "/&#47;example.com/a",
  "/&sol;example.com",
  "example.com",
  "",
  "   ",
  null,
];

const ALLOWED = [
  ["https://example.com/a?b=1&c=2#d", "https://example.com/a?b=1&c=2#d"],
  ["HTTP://EXAMPLE.COM", "HTTP://EXAMPLE.COM"],
  ["  https://example.com  ", "https://example.com"],
  ["https://exa\tmple.com", "https://example.com"],
  ["mailto:someone@example.com", "mailto:someone@example.com"],
  ["/blog/a-made-up-post/", "/blog/a-made-up-post/"],
  ["#a-heading", "#a-heading"],
];

test("only http, https, mailto, paths on this site and places on the page are links", () => {
  for (const raw of REFUSED) assert.equal(safeHref(raw), null, JSON.stringify(raw));
  for (const [raw, stored] of ALLOWED) assert.equal(safeHref(raw), stored, JSON.stringify(raw));
});

test("a bare address found in text is linked only as a web address or an email", () => {
  assert.equal(safeAutoLink("example.com"), true);
  assert.equal(safeAutoLink("someone@example.com"), true);
  assert.equal(safeAutoLink("https://example.com"), true);
  assert.equal(safeAutoLink("javascript:alert(1)"), false);
  assert.equal(safeAutoLink("ftp://example.com"), false);
});

function setup(md = "A short made-up paragraph.\n") {
  const element = document.createElement("div");
  document.body.append(element);
  return new Editor({ element, extensions: extensions(), enablePasteRules: PASTE_RULES, content: fromMarkdown(md).doc, injectCSS: false });
}

const links = (editor) => {
  const out = [];
  editor.state.doc.descendants((n) => n.marks.forEach((m) => m.type.name === "link" && out.push(m.attrs.href)));
  return out;
};

test("setLink refuses an address the check refuses", () => {
  const editor = setup();
  for (const href of ["javascript:alert(1)", "java\tscript:alert(1)", "&#106;avascript:alert(1)", "data:text/html,x", "vbscript:x"]) {
    editor.commands.setTextSelection({ from: 3, to: 8 });
    assert.equal(editor.commands.setLink({ href }), false, href);
  }
  assert.deepEqual(links(editor), []);
  editor.commands.setTextSelection({ from: 3, to: 8 });
  assert.equal(editor.commands.setLink({ href: "https://example.com" }), true);
  assert.deepEqual(links(editor), ["https://example.com"]);
  editor.destroy();
});

test("a pasted or dropped <a> keeps only an address the check allows", () => {
  const editor = setup();
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  editor.view.pasteHTML(
    '<p><a href="javascript:alert(1)">one</a> <a href=" &#106;avascript:alert(1)">two</a> <a href="java&#x09;script:x">three</a> <a href="data:text/html,x">four</a> <a href="vbscript:x">five</a> <a href="/blog/x/">six</a> <a href="https://example.com/">seven</a></p>',
  );
  assert.deepEqual(links(editor), ["/blog/x/", "https://example.com/"]);
  assert.ok(editor.state.doc.textContent.includes("one two three four five six seven"), "the words stay, as text");
  editor.destroy();
});

test("plain text pastes as it is: no Markdown read into marks, an address still a link", () => {
  const editor = setup();
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  editor.view.pasteText(" **notbold** _notitalic_ `notcode` ~~notstruck~~ https://example.com/page");
  const marks = new Set();
  editor.state.doc.descendants((n) => n.marks.forEach((m) => marks.add(m.type.name)));
  assert.deepEqual([...marks], ["link"]);
  assert.deepEqual(links(editor), ["https://example.com/page"]);
  assert.match(toMarkdown(editor.state.doc), /\\\*\\\*notbold\\\*\\\*/);
  editor.destroy();
});

test("typing Markdown still formats, as before", () => {
  const editor = setup("\n");
  editor.commands.focus("end");
  // An input rule runs on text typed, as the editor's own handleTextInput does.
  const type = (text) => {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp("handleTextInput", (f) => f(editor.view, from, to, text, () => editor.state.tr.insertText(text, from, to)));
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(text, from, to));
  };
  for (const ch of "**word**") type(ch);
  const marks = new Set();
  editor.state.doc.descendants((n) => n.marks.forEach((m) => marks.add(m.type.name)));
  assert.ok(marks.has("bold"));
  editor.destroy();
});
