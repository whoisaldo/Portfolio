// test/suggest.test.mjs: suggested edits. What a suggestion changes, how
// Accept finds the passage and replaces it in a draft's Markdown or in the
// editor's document, what it refuses, and that a mark that fails is pressed
// again without the text changing twice. Every text is made up.
import { window } from "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { marked } from "marked";
import { Editor } from "@tiptap/core";
import { extensions } from "../src/front/private/editor/schema.js";
import { fromMarkdown, toMarkdown } from "../src/front/private/editor/markdown.js";
import { commentAnchors } from "../src/front/private/editor/anchors.js";
import { indexText } from "../src/front/quotes.js";
import { quoteAt } from "../src/front/private/place.js";
import { editRegion, suggestionParts } from "../src/front/private/suggest.js";
import { TRIES, WHY, acceptSuggestion, editorText, locate, pageText, replaceInMarkdown } from "../src/front/private/accept.js";

// Node has a localStorage of its own, unusable without a file: happy-dom's instead.
Object.defineProperty(globalThis, "localStorage", { value: window.localStorage, configurable: true, writable: true });

const SLUG = "made-up-draft";

/** The read view's text of a body, as the comments index it. */
function indexOf(body) {
  const t = document.createElement("template");
  t.innerHTML = marked.parse(body);
  return indexText(t.content);
}

/** A reader's quote of the `nth` place `words` are in the body's text, with its context. */
function quoteOf(body, words, nth = 0) {
  const index = indexOf(body);
  let at = -1;
  for (let i = 0; i <= nth; i++) at = index.text.indexOf(words, at + 1);
  assert.ok(at >= 0, `"${words}" is in the text`);
  return quoteAt(index, [at, at + words.length]);
}

/** A suggestion thread as the margin has it (toThreads). */
function thread(quote, suggestion, { id = "t-1", find = quote } = {}) {
  return { id, root: { id, suggestion, accepted: null }, quote, find, gone: false, replies: [], resolved: null };
}

/** The stats service, as far as Accept talks to it, keeping one draft. */
function server(body) {
  const s = {
    draft: { slug: SLUG, title: "A made-up title", date: "2026-11-14", summary: "A made-up summary.", body, updated_at: "2026-11-14T10:00:00.000001Z" },
    saves: [],
    anchors: [],
    // Set to make the next save land and its answer be lost.
    loseAnswer: false,
  };
  let n = 1;
  s.request = async (path, opts = {}) => {
    if (path.startsWith("/api/drafts?slug=")) return { status: 200, data: { draft: { ...s.draft } } };
    if (path === "/api/drafts" && opts.method === "PUT") {
      if (opts.body.base !== s.draft.updated_at) throw Object.assign(new Error("This draft changed somewhere else."), { status: 409 });
      s.saves.push(opts.body);
      s.draft = { ...s.draft, body: opts.body.body, updated_at: `2026-11-14T10:00:0${n++}.000001Z` };
      if (s.loseAnswer) {
        s.loseAnswer = false;
        throw Object.assign(new Error("Couldn't reach the server."), { status: 0 });
      }
      return { status: 200, data: { draft: { ...s.draft } } };
    }
    if (path === "/api/draft-comments?a=anchors" && opts.method === "PUT") {
      s.anchors.push(opts.body);
      return { status: 200, data: { ok: true, ignored: [] } };
    }
    throw new Error(`unexpected request ${path}`);
  };
  return s;
}

/** Accept through the draft on `s`, with a mark that fails while `marks.fail`. */
function accepting(s, t, threads = [t]) {
  const marks = { fail: 0, done: [] };
  const run = () =>
    acceptSuggestion({
      slug: SLUG,
      t,
      target: pageText({ slug: SLUG, threads, request: s.request }),
      mark: async (id) => {
        if (marks.fail > 0) {
          marks.fail--;
          throw new Error("Couldn't reach the server.");
        }
        marks.done.push(id);
      },
    });
  return { run, marks };
}

test.beforeEach(() => localStorage.clear());

// ---- what a suggestion changes ------------------------------------------------------

test("a suggestion changes whole words of its passage, and only those that differ", () => {
  const old = "the colour of the old harbour wall";
  const r = editRegion(old, "the color of the old harbour wall");
  assert.equal(old.slice(r.from, r.to), "colour");
  assert.equal(r.insert, "color");
  const del = editRegion("a very big cat", "a big cat");
  assert.equal("a very big cat".slice(del.from, del.to), "very ");
  assert.equal(del.insert, "");
  // Words only added: nothing taken out, unless a word to find is wanted.
  const add = editRegion("the cat sat", "the black cat sat");
  assert.equal(add.from, add.to);
  assert.equal(add.insert, "black ");
  const whole = editRegion("the cat sat", "the black cat sat", { whole: true });
  assert.equal("the cat sat".slice(whole.from, whole.to), "cat");
  assert.equal(whole.insert, "black cat");
  // Whitespace of any kind is alike.
  const lines = editRegion("end of one.\nStart of two", "end of one. Start of the second");
  assert.equal("end of one.\nStart of two".slice(lines.from, lines.to), "two");
});

test("a card shows the change between the words that stay, a long passage cut short either side", () => {
  const p = suggestionParts("the cat sat on the mat", "the dog sat on the mat");
  assert.deepEqual(p, { lead: "the ", removed: "cat", added: "dog", tail: " sat on the mat" });
  const long = `${"word ".repeat(60)}cat ${"more ".repeat(60)}`.trim();
  const q = suggestionParts(long, long.replace("cat", "dog"));
  assert.equal(q.removed, "cat");
  assert.equal(q.added, "dog");
  assert.ok(q.lead.startsWith("…word ") && q.lead.length <= 82, q.lead);
  assert.ok(q.tail.endsWith("more…") && q.tail.length <= 82, q.tail);
  // A deletion has nothing added; the suggested words' own edges don't count.
  assert.equal(suggestionParts("a very big cat", "  a big cat\n").added, "");
});

// ---- accepting it in the draft's Markdown ------------------------------------------------

const HARBOUR = `## The harbour

The ferry left at dawn and the gulls followed it out past the breakwater, calling all the way.

A second paragraph about the lighthouse keeper, who kept a ledger of every ship that passed.
`;

test("Accept replaces the passage in the Markdown, saves it as a version onto the text it read, then marks the thread", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out");
  const { run, marks } = accepting(s, t);
  await run();
  assert.equal(s.saves.length, 1);
  assert.equal(s.saves[0].kind, "manual");
  assert.equal(s.saves[0].base, "2026-11-14T10:00:00.000001Z");
  assert.equal(s.saves[0].body, HARBOUR.replace("gulls followed it out", "gulls chased it out"));
  assert.equal(s.saves[0].title, "A made-up title");
  assert.deepEqual(marks.done, ["t-1"]);
  // The thread's passage is the new words, in the text just saved.
  assert.equal(s.anchors.length, 1);
  assert.equal(s.anchors[0].base, s.draft.updated_at);
  const mine = s.anchors[0].anchors.find((a) => a.thread === "t-1");
  assert.equal(mine.exact, "gulls chased it out");
  assert.equal(localStorage.getItem(`draft-accepted:${SLUG}`), null);
});

test("a mark that fails is pressed again without the text changing twice", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "lighthouse keeper"), "lighthouse keeper and her dog");
  const { run, marks } = accepting(s, t);
  marks.fail = 1;
  await assert.rejects(run, /has the edit, but the suggestion couldn't be marked accepted: .*Press Accept again/);
  assert.equal(s.saves.length, 1);
  assert.deepEqual(marks.done, []);
  await run();
  assert.equal(s.saves.length, 1, "no second save");
  assert.deepEqual(marks.done, ["t-1"]);
  assert.equal(s.draft.body, HARBOUR.replace("lighthouse keeper", "lighthouse keeper and her dog"));
});

test("a save whose answer was lost is found in the text, and not made again", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "past the breakwater"), "beyond the breakwater");
  const { run, marks } = accepting(s, t);
  s.loseAnswer = true;
  await assert.rejects(run, /Couldn't reach the server/);
  assert.equal(s.saves.length, 1);
  assert.deepEqual(marks.done, []);
  // Nothing in this browser says it went in: the text does.
  assert.equal(localStorage.getItem(`draft-accepted:${SLUG}`), null);
  await run();
  assert.equal(s.saves.length, 1, "no second save");
  assert.deepEqual(marks.done, ["t-1"]);
  assert.equal(s.draft.body, HARBOUR.replace("past the breakwater", "beyond the breakwater"));
});

test("a deletion pressed again after its mark failed is not made twice, and its passage is saved as deleted", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "calling all the way"), "");
  const { run, marks } = accepting(s, t);
  marks.fail = 1;
  await assert.rejects(run);
  localStorage.clear(); // as from another browser: the text alone says
  await run();
  assert.equal(s.saves.length, 1);
  assert.equal(s.draft.body, HARBOUR.replace("calling all the way", ""));
  assert.deepEqual(s.anchors[0].anchors.find((a) => a.thread === "t-1"), { thread: "t-1", exact: "", prefix: "", suffix: "" });
});

test("only the words that change are replaced: formatting around them stays", async () => {
  const body = "The **quick** brown fox jumps over the lazy dog.\n";
  const s = server(body);
  const t = thread(quoteOf(body, "quick brown fox"), "quick brown cat");
  await accepting(s, t).run();
  assert.equal(s.draft.body, "The **quick** brown cat jumps over the lazy dog.\n");
});

test("the suggested words are written to read as typed, Markdown's characters and all", async () => {
  const body = "A plain line about a cat and a dog.\n";
  const s = server(body);
  const t = thread(quoteOf(body, "a cat"), "a *real* cat");
  await accepting(s, t).run();
  assert.equal(indexOf(s.draft.body).text.trim(), "A plain line about a *real* cat and a dog.");
  assert.doesNotMatch(marked.parse(s.draft.body), /<em>/);
});

test("of words that occur twice, the reader's place is changed, by its context", async () => {
  const body = "The cat sat on the mat by the door.\n\nLater on the cat sat on the hat by the stove.\n";
  const s = server(body);
  const t = thread(quoteOf(body, "cat sat", 1), "dog sat");
  await accepting(s, t).run();
  assert.equal(s.draft.body, "The cat sat on the mat by the door.\n\nLater on the dog sat on the hat by the stove.\n");
});

test("words also in a link's address or its text are changed only where the passage is", async () => {
  const body = "Read [the guide](/guide) first, then the guide itself.\n";
  const s = server(body);
  const t = thread(quoteOf(body, "the guide itself"), "the manual itself");
  await accepting(s, t).run();
  assert.equal(s.draft.body, "Read [the guide](/guide) first, then the manual itself.\n");
});

test("a passage over two paragraphs keeps its paragraph break", async () => {
  const body = "The first paragraph ends here.\n\nThe second one starts there.\n";
  const s = server(body);
  const t = thread(quoteOf(body, "ends here.\nThe second"), "ends now.\nThe second");
  await accepting(s, t).run();
  assert.equal(s.draft.body, "The first paragraph ends now.\n\nThe second one starts there.\n");
});

test("threads beside the change are kept where they are; one the change overlaps keeps its place", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "gulls followed it out"), "seabirds followed it out");
  const near = thread(quoteOf(HARBOUR, "ferry left at dawn and the"), "x", { id: "t-near" });
  const over = thread(quoteOf(HARBOUR, "the gulls"), "x", { id: "t-over" });
  const far = thread(quoteOf(HARBOUR, "kept a ledger"), "x", { id: "t-far" });
  await accepting(s, t, [t, near, over, far]).run();
  const sent = new Map(s.anchors[0].anchors.map((a) => [a.thread, a]));
  assert.equal(sent.get("t-near").exact, "ferry left at dawn and the");
  assert.ok(sent.get("t-near").suffix.startsWith(" seabirds followed"), sent.get("t-near").suffix);
  assert.equal(sent.has("t-over"), false);
  assert.equal(sent.has("t-far"), false, "its context did not change");
});

test("Accept refuses, changing nothing, when the passage is not there exactly once or its words changed", async () => {
  // The same words with the same context, twice.
  const line = "A long and very ordinary sentence that says the same thing in the same words, again and again and again.";
  const twice = `${line}\n\n${line}\n`;
  const s1 = server(twice);
  await assert.rejects(accepting(s1, thread(quoteOf(twice, "the same thing"), "one thing")).run, { message: WHY.missing });
  // Edited since: the words the reader quoted are gone.
  const s2 = server(HARBOUR.replace("gulls followed", "terns followed"));
  await assert.rejects(accepting(s2, thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out")).run, { message: WHY.missing });
  // Edited in the editor, which moved the passage onto other words.
  const now = HARBOUR.replace("gulls followed", "terns followed");
  const s3 = server(now);
  const moved = thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out", { find: quoteOf(now, "terns followed it out") });
  await assert.rejects(accepting(s3, moved).run, { message: WHY.edited });
  // Formatting across the words that change.
  const bold = "The **quick** brown fox jumps.\n";
  const s4 = server(bold);
  await assert.rejects(accepting(s4, thread(quoteOf(bold, "quick brown"), "slow green")).run, { message: WHY.format });
  for (const s of [s1, s2, s3, s4]) {
    assert.equal(s.saves.length, 0);
    assert.equal(s.anchors.length, 0);
  }
});

test("a draft saved somewhere else meanwhile is not written over, and the thread is not marked", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out");
  const target = pageText({ slug: SLUG, threads: [t], request: s.request });
  const read = target.read;
  // Saved by another tab between the read and the save.
  target.read = async () => {
    const index = await read();
    s.draft = { ...s.draft, updated_at: "2026-11-14T11:00:00.000001Z" };
    return index;
  };
  let marked = false;
  await assert.rejects(acceptSuggestion({ slug: SLUG, t, target, mark: async () => (marked = true) }), { message: WHY.changed });
  assert.equal(marked, false);
  assert.equal(s.draft.body, HARBOUR);
});

test("replaceInMarkdown tries at most TRIES places, the nearest first", () => {
  const body = `${Array.from({ length: 40 }, (_, i) => `Line ${i} has the word in it.`).join("\n\n")}\n`;
  const index = indexOf(body);
  const at = index.text.indexOf("Line 37 has the word");
  const start = index.text.indexOf("word", at);
  const done = replaceInMarkdown(body, index, [start, start + 4], "term");
  assert.ok(TRIES < 40);
  assert.equal(done.body, body.replace("Line 37 has the word", "Line 37 has the term"));
});

test("a passage whose suggested words are in place of it already is located as accepted", () => {
  const before = "Hello";
  const t = thread(quoteOf(before, "Hello"), "Hello!");
  assert.deepEqual(locate(indexOf(before), t), { at: [0, 5] });
  assert.deepEqual(locate(indexOf("Hello!"), t), { applied: true });
});

// ---- accepting it in the editor's document -------------------------------------------------

function editing(body) {
  const { extension, handle } = commentAnchors();
  const element = document.createElement("div");
  document.body.append(element);
  const doc = fromMarkdown(body).doc;
  const editor = new Editor({ element, extensions: [...extensions(), extension], content: doc, injectCSS: false });
  const saves = [];
  // What DraftEditor adds to the handle: here the text is saved at once.
  handle.base = () => null;
  handle.saveVersion = async () => {
    saves.push(toMarkdown(editor.state.doc));
    return true;
  };
  return { editor, handle, saves };
}

test("with the editor open, Accept changes the editor's own text, saves it as a version, and keeps the passage on the new words", async () => {
  const { editor, handle, saves } = editing(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out");
  handle.setItems([{ id: t.id, find: t.find }]);
  const marks = [];
  let fail = 1;
  const mark = async (id) => {
    if (fail-- > 0) throw new Error("Couldn't reach the server.");
    marks.push(id);
  };
  await assert.rejects(acceptSuggestion({ slug: SLUG, t, target: editorText(handle), mark }));
  assert.equal(saves.length, 1);
  assert.equal(saves[0], HARBOUR.replace("gulls followed it out", "gulls chased it out"));
  assert.equal(handle.quotes().get(t.id).exact, "gulls chased it out");
  // Pressed again: marked, the text as it was.
  await acceptSuggestion({ slug: SLUG, t, target: editorText(handle), mark });
  assert.deepEqual(marks, [t.id]);
  assert.equal(saves.length, 1);
  assert.equal(toMarkdown(editor.state.doc), saves[0]);
  // One step of the undo history.
  editor.commands.undo();
  assert.equal(toMarkdown(editor.state.doc), HARBOUR);
  editor.destroy();
});

test("in the editor, words across formatting or paragraphs are refused, and nothing changes", async () => {
  const body = "The **quick** brown fox jumps.\n\nA second line.\n";
  const { editor, handle, saves } = editing(body);
  const across = thread(quoteOf(body, "quick brown"), "slow green");
  await assert.rejects(acceptSuggestion({ slug: SLUG, t: across, target: editorText(handle), mark: async () => {} }), { message: WHY.format });
  const lines = thread(quoteOf(body, "jumps.\nA second"), "jumps and a second");
  await assert.rejects(acceptSuggestion({ slug: SLUG, t: lines, target: editorText(handle), mark: async () => {} }), { message: WHY.format });
  assert.equal(saves.length, 0);
  assert.equal(toMarkdown(editor.state.doc), body);
  // Words within one formatting are changed in it.
  const inside = thread(quoteOf(body, "brown fox"), "brown cat");
  await acceptSuggestion({ slug: SLUG, t: inside, target: editorText(handle), mark: async () => {} });
  assert.equal(saves.at(-1), "The **quick** brown cat jumps.\n\nA second line.\n");
  editor.destroy();
});

test("in the editor, text it has not saved yet is saved before the thread is marked", async () => {
  const { editor, handle, saves } = editing(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "kept a ledger"), "kept a diary");
  let saved = false;
  handle.saveVersion = async () => {
    saves.push(toMarkdown(editor.state.doc));
    return saved;
  };
  const marks = [];
  const mark = async (id) => marks.push(id);
  await assert.rejects(acceptSuggestion({ slug: SLUG, t, target: editorText(handle), mark }), { message: WHY.unsaved });
  assert.deepEqual(marks, []);
  saved = true;
  await acceptSuggestion({ slug: SLUG, t, target: editorText(handle), mark });
  assert.deepEqual(marks, [t.id]);
  assert.equal(saves.length, 2);
  assert.equal(saves[1], HARBOUR.replace("kept a ledger", "kept a diary"));
  editor.destroy();
});
