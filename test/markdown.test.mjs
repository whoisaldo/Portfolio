// test/markdown.test.mjs: a draft's Markdown into the editor and back.
// Every text here is made up.
import "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import { extensions } from "../src/front/private/editor/schema.js";
import { canEdit, fromMarkdown, rawHtmlBlocks, toMarkdown } from "../src/front/private/editor/markdown.js";

const schema = getSchema(extensions());
const build = (json) => schema.nodeFromJSON(json);
const load = (md) => build(fromMarkdown(md).doc);
const roundTrip = (md) => toMarkdown(load(md));

const FIGURE =
  '<figure><video controls playsinline preload="metadata" width="1280" height="720" poster="/blog/sample-post/poster.jpg" src="/blog/sample-post/reel.mp4" aria-label="A short clip"></video><figcaption>The clip, in one take.</figcaption></figure>';
const EMBED = '<div data-embed="eddies-compare"></div>';

const EVERYTHING = `Opening paragraph with **bold**, *italic*, \`inline code\` and [a link](https://example.com/page "Its title").

## A second-level heading

### A third-level heading

- first point
- second point with **weight**
  - a nested point

1. step one
2. step two

3. a loose list after

![A drawn map](/blog/sample-post/map.png)

${FIGURE}

Some <span data-hl="yellow">yellow words</span>, then <span data-hl="pink">pink with **bold** inside</span>.

${EMBED}

> A quoted line.

\`\`\`js
const answer = 42;
\`\`\`

---

Last words.
`;

test("every construct survives the round trip and passes the guard", () => {
  const out = roundTrip(EVERYTHING);
  assert.equal(canEdit(EVERYTHING, build).ok, true);
  // Writing what was read back changes nothing more.
  assert.equal(roundTrip(out), out);
  assert.deepEqual(load(out).toJSON(), load(EVERYTHING).toJSON());
  assert.ok(out.includes("**bold**"));
  assert.ok(out.includes("*italic*"));
  assert.ok(out.includes("`inline code`"));
  assert.ok(out.includes('[a link](https://example.com/page "Its title")'));
  assert.ok(out.includes("## A second-level heading\n"));
  assert.ok(out.includes("### A third-level heading\n"));
  assert.ok(out.includes("- first point\n- second point with **weight**\n  - a nested point"));
  assert.ok(out.includes("![A drawn map](/blog/sample-post/map.png)"));
  assert.ok(out.includes('<span data-hl="pink">pink with **bold** inside</span>'));
  assert.ok(out.includes("> A quoted line."));
  assert.ok(out.includes("```js\nconst answer = 42;\n```"));
});

test("raw HTML blocks are atoms and come back byte for byte", () => {
  const doc = load(EVERYTHING);
  const raws = [];
  doc.forEach((n) => n.type.name === "rawBlock" && raws.push(n.attrs.source));
  assert.deepEqual(raws, [FIGURE, EMBED]);
  assert.deepEqual(rawHtmlBlocks(roundTrip(EVERYTHING)), [FIGURE, EMBED]);
  assert.ok(roundTrip(EVERYTHING).includes(`\n\n${FIGURE}\n\n`));
});

test("what the editor does not model is kept as written", () => {
  const md = [
    "| a | b |\n| - | - |\n| 1 | 2 |",
    "A paragraph with <kbd>inline HTML</kbd> in it.",
    "- [ ] a task\n- [x] done",
    "An <span data-hl=\"yellow\">unclosed highlight.",
    "[ref]: https://example.com/ref",
  ].join("\n\n");
  const doc = load(md);
  const types = [];
  doc.forEach((n) => types.push(n.type.name));
  assert.deepEqual(types, ["rawBlock", "rawBlock", "rawBlock", "rawBlock", "rawBlock"]);
  assert.equal(roundTrip(md), `${md}\n`);
  assert.equal(canEdit(md, build).ok, true);
});

test("text that looks like Markdown stays text", () => {
  const md = "Plain \\*stars\\*, \\_unders\\_, \\[brackets\\], a \\<tag> and AT&amp;T, 2 \\< 3.\n\n1986\\. A year, not a list.\n\n\\# Not a heading\n\nhttps\\://example.com is not a link, nor is name\\@example.com.";
  const out = roundTrip(md);
  assert.equal(canEdit(md, build).ok, true);
  assert.equal(roundTrip(out), out);
  assert.deepEqual(load(out).toJSON(), load(md).toJSON());
});

test("bold, italic and links that meet are written so they read back the same", () => {
  for (const md of [
    "**[linked bold](/a).** after",
    "**bold***italic*",
    "*italic* **bold** ***both***",
    "[**bold link**](/b) and [*it* plain](/c)",
    "**bold with `code` inside** and [`code link`](/d)",
    "a\\\nhard break",
  ]) {
    const out = roundTrip(md);
    assert.deepEqual(load(out).toJSON(), load(md).toJSON(), md);
    assert.equal(canEdit(md, build).ok, true, md);
  }
});

test("untouched blocks are written exactly as they came; edited ones afresh", () => {
  const md = "A paragraph written\nacross two lines with __old bold__.\n\n* starred\n* list\n\nThird one.\n";
  const { doc: json, raws } = fromMarkdown(md);
  const doc = build(json);
  const keep = new WeakMap();
  doc.forEach((n, _, i) => keep.set(n, raws[i]));
  assert.equal(toMarkdown(doc, { keep }), md);

  // Change the last paragraph; ProseMirror keeps the other two nodes as they were.
  const changed = doc.copy(doc.content.replaceChild(2, schema.node("paragraph", null, schema.text("Third one, edited."))));
  assert.equal(toMarkdown(changed, { keep }), "A paragraph written\nacross two lines with __old bold__.\n\n* starred\n* list\n\nThird one, edited.\n");
});

test("two lists of one kind side by side stay two lists", () => {
  const doc = schema.node("doc", null, [
    schema.node("bulletList", null, [schema.node("listItem", null, [schema.node("paragraph", null, schema.text("one"))])]),
    schema.node("bulletList", null, [schema.node("listItem", null, [schema.node("paragraph", null, schema.text("two"))])]),
  ]);
  const out = toMarkdown(doc);
  assert.equal(out, "- one\n\n* two\n");
  assert.equal(load(out).childCount, 2);
});

test("the guard refuses a draft it cannot write back exactly", () => {
  // Two links to one address, side by side, are one link in the editor.
  const md = "See [this](https://example.com/x)[ and that](https://example.com/x).";
  const r = canEdit(md, build);
  assert.equal(r.ok, false);
  assert.equal(r.why, "format");
  // And a body the editor cannot read at all.
  const strict = getSchema(extensions().filter((e) => e.name !== "highlight"));
  assert.equal(canEdit('Some <span data-hl="blue">blue</span>.', (j) => strict.nodeFromJSON(j)).ok, false);
});

// ---- highlights ----------------------------------------------------------------

const hl = (color) => schema.marks.highlight.create({ color });

test("a highlight is stored as <span data-hl> and never nests", () => {
  // "abcdef" yellow, then "cd" made green: three runs, one colour each.
  let p = schema.node("paragraph", null, schema.text("abcdef", [hl("yellow")]));
  let doc = schema.node("doc", null, [p]);
  const green = hl("green");
  p = doc.firstChild;
  const marked = [];
  p.forEach((t, offset) => {
    const parts = [
      [0, 2, t.marks],
      [2, 4, green.addToSet(t.marks)],
      [4, 6, t.marks],
    ];
    for (const [a, b, marks] of parts) marked.push(schema.text(t.text.slice(a - offset, b - offset), marks));
  });
  doc = schema.node("doc", null, [schema.node("paragraph", null, marked)]);
  const out = toMarkdown(doc);
  assert.equal(out, '<span data-hl="yellow">ab</span><span data-hl="green">cd</span><span data-hl="yellow">ef</span>\n');
  assert.ok(!/<span[^>]*>[^<]*<span/.test(out));
});

test("a highlight across two paragraphs is two spans, one in each", () => {
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text("first "), schema.text("end of one", [hl("blue")])]),
    schema.node("paragraph", null, [schema.text("start of two", [hl("blue")]), schema.text(" rest")]),
  ]);
  assert.equal(toMarkdown(doc), 'first <span data-hl="blue">end of one</span>\n\n<span data-hl="blue">start of two</span> rest\n');
  assert.equal(canEdit(toMarkdown(doc), build).ok, true);
});

test("whitespace at the edge of a highlight or bold stays readable", () => {
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text("x"), schema.text(" spaced bold ", [schema.marks.bold.create()]), schema.text("y")]),
  ]);
  assert.equal(toMarkdown(doc), "x **spaced bold** y\n");
});
