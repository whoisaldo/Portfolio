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
import { acceptOffered, editRegion, suggestionParts } from "../src/front/private/suggest.js";
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
    // The passage it has for each thread, the last anchor sent.
    held: new Map(),
    // Set to make the next save land and its answer be lost.
    loseAnswer: false,
    // Set to make the next save fail before it lands.
    dropSave: false,
  };
  let n = 1;
  s.request = async (path, opts = {}) => {
    if (path.startsWith("/api/drafts?slug=")) return { status: 200, data: { draft: { ...s.draft } } };
    if (path === "/api/drafts" && opts.method === "PUT") {
      if (s.dropSave) {
        s.dropSave = false;
        throw Object.assign(new Error("Couldn't reach the server."), { status: 0 });
      }
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
      for (const a of opts.body.anchors) s.held.set(a.thread, a);
      return { status: 200, data: { ok: true, ignored: [] } };
    }
    throw new Error(`unexpected request ${path}`);
  };
  /** A thread as the margin has it once it has heard the server's passage for it (toThreads). */
  s.seen = (t) => {
    const a = s.held.get(t.id);
    if (!a) return t;
    return a.exact ? { ...t, find: { exact: a.exact, prefix: a.prefix, suffix: a.suffix }, gone: false } : { ...t, find: null, gone: true };
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

test("a save whose answer was lost is known by this browser's record of it, and not made again", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "past the breakwater"), "beyond the breakwater");
  const { run, marks } = accepting(s, t);
  s.loseAnswer = true;
  await assert.rejects(run, /Couldn't reach the server/);
  assert.equal(s.saves.length, 1);
  assert.deepEqual(marks.done, []);
  // Written before the save was sent: the draft as that save made it.
  assert.ok(localStorage.getItem(`draft-accepted:${SLUG}`));
  await run();
  assert.equal(s.saves.length, 1, "no second save");
  assert.deepEqual(marks.done, ["t-1"]);
  assert.equal(s.draft.body, HARBOUR.replace("past the breakwater", "beyond the breakwater"));
  assert.equal(localStorage.getItem(`draft-accepted:${SLUG}`), null);
});

test("a save whose answer was lost, pressed again from another browser, is refused: the text alone is no proof", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "past the breakwater"), "beyond the breakwater");
  const { run, marks } = accepting(s, t);
  s.loseAnswer = true;
  await assert.rejects(run, /Couldn't reach the server/);
  localStorage.clear();
  await assert.rejects(run, { message: WHY.missing });
  assert.equal(s.saves.length, 1, "no second save");
  assert.deepEqual(marks.done, []);
});

test("a save that never landed is made on the next press, once", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "past the breakwater"), "beyond the breakwater");
  const { run, marks } = accepting(s, t);
  s.dropSave = true;
  await assert.rejects(run, /Couldn't reach the server/);
  assert.equal(s.saves.length, 0);
  await run();
  assert.equal(s.saves.length, 1);
  assert.deepEqual(marks.done, ["t-1"]);
  assert.equal(s.draft.body, HARBOUR.replace("past the breakwater", "beyond the breakwater"));
});

test("a deletion pressed again after its mark failed is not made twice, and its passage is saved as deleted", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "calling all the way"), "");
  const { run, marks } = accepting(s, t);
  marks.fail = 1;
  await assert.rejects(run);
  localStorage.clear(); // as from another browser, once it has the passage as the server has it now: deleted
  await accepting(s, s.seen(t)).run();
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

test("text that only looks as if the edit were made is not taken for it: the thread's passage on the new words is", () => {
  const before = "Hello";
  const t = thread(quoteOf(before, "Hello"), "Hello!");
  assert.deepEqual(locate(indexOf(before), t), { at: [0, 5] });
  // The words there, but the server still has the thread on the old ones.
  assert.ok(locate(indexOf("Hello!"), t).why);
  // Moved onto the new words, by Accept or the editor, and they are there.
  const moved = { ...t, find: quoteOf("Hello!", "Hello!") };
  assert.deepEqual(locate(indexOf("Hello!"), moved), { applied: true });
  assert.ok(locate(indexOf("Hello! Hi."), moved).why, "not where the passage has them");
});

test("the passage beside an edit made around it is not taken for the passage at its place", () => {
  // Shortened: the new words are inside the old, and most of the context agrees.
  const body = "A very big cat rests beside the warm fireplace every evening.";
  const t = thread(quoteOf(body, "very big cat"), "big cat");
  assert.deepEqual(locate(indexOf(body), t), { at: [2, 14] });
  assert.ok(locate(indexOf(body.replace("very big cat", "big cat")), t).why);
  // Lengthened: the old words are inside the new.
  const short = "A big cat rests beside the warm fireplace every evening.";
  const u = thread(quoteOf(short, "big cat"), "very big cat");
  assert.ok(locate(indexOf(short.replace("big cat", "very big cat")), u).why);
});

const TRICKY = [
  ["an expansion whose old words are inside the new ones", "Here a big cat rests by the fire.\n", "big cat", "very big cat"],
  ["a shortening, with a long context after it", "A very big cat rests beside the warm fireplace every evening.\n", "very big cat", "big cat"],
  ["a deletion of the whole passage", "Here a very big cat rests by the fire.\n", "very big cat", ""],
  ["a word put twice, the same as the one before it", "I saw the cat run off.\n", "the cat", "the the cat"],
  ["words already just before the passage", "There was a red fox and a grey fox.\n", "grey fox", "red fox"],
  ["punctuation only", "It rained, and then it was done\n", "it was done", "it was done."],
  ["capitals only", "We flew to paris in the spring.\n", "paris", "Paris"],
];

for (const [what, body, words, suggestion] of TRICKY) {
  test(`${what}: changed once, then a second press marks it or refuses, never changes it again`, async () => {
    const after = body.replace(words, suggestion);
    const start = () => {
      localStorage.clear();
      const s = server(body);
      return { s, t: thread(quoteOf(body, words), suggestion) };
    };
    {
      const { s, t } = start();
      const { run, marks } = accepting(s, t);
      await run();
      assert.equal(s.saves.length, 1, "saved");
      assert.equal(s.draft.body, after);
      assert.deepEqual(marks.done, [t.id]);
    }
    // The first press fails after the save: its mark, or the save's answer.
    for (const fails of ["mark", "answer"]) {
      // Pressed again here; in another browser once it has the thread as the
      // server has it now; in another browser before it has.
      for (const again of ["here", "elsewhere", "elsewhere, before it heard"]) {
        const label = `${fails} lost, pressed again ${again}`;
        const { s, t } = start();
        const first = accepting(s, t);
        if (fails === "mark") first.marks.fail = 1;
        else s.loseAnswer = true;
        await assert.rejects(first.run);
        assert.equal(s.draft.body, after, label);
        if (again !== "here") localStorage.clear();
        const second = accepting(s, again === "elsewhere" ? s.seen(t) : t);
        // The thread's new place is sent only after an answer that came.
        if (again === "here" || (again === "elsewhere" && fails === "mark")) {
          await second.run();
          assert.deepEqual(second.marks.done, [t.id], label);
        } else {
          await assert.rejects(second.run, (err) => [WHY.edited, WHY.missing].includes(err.message), label);
          assert.deepEqual(second.marks.done, [], label);
        }
        assert.equal(s.saves.length, 1, `${label}: no second save`);
        assert.equal(s.draft.body, after, label);
      }
    }
  });
}

test("a record of a save is not trusted once the draft has changed: put back to the old words, the edit is made again, once", async () => {
  const body = "The brown fox jumps over the fence and disappears into the forest.\n";
  const s = server(body);
  const t = thread(quoteOf(body, "brown fox"), "red fox");
  const { run, marks } = accepting(s, t);
  marks.fail = 1;
  await assert.rejects(run);
  assert.equal(s.saves.length, 1);
  // The version before restored and saved, here or in another tab.
  s.draft = { ...s.draft, body, updated_at: "2026-11-14T12:00:00.000001Z" };
  await run();
  assert.equal(s.saves.length, 2, "read and saved again");
  assert.equal(s.saves[1].base, "2026-11-14T12:00:00.000001Z");
  assert.equal(s.draft.body, body.replace("brown fox", "red fox"));
  assert.deepEqual(marks.done, ["t-1"]);
  assert.equal(localStorage.getItem(`draft-accepted:${SLUG}`), null);
});

test("a record of a save is dropped when the draft has changed and the passage is not at its place: refused, not marked", async () => {
  const body = "The brown fox jumps over the fence and disappears into the forest.\n";
  const s = server(body);
  const t = thread(quoteOf(body, "brown fox"), "red fox");
  const { run, marks } = accepting(s, t);
  marks.fail = 1;
  await assert.rejects(run);
  const now = "The grey fox jumps over the fence and disappears into the forest.\n";
  s.draft = { ...s.draft, body: now, updated_at: "2026-11-14T12:00:00.000001Z" };
  await assert.rejects(run, (err) => [WHY.edited, WHY.missing].includes(err.message));
  assert.equal(s.saves.length, 1);
  assert.equal(s.draft.body, now);
  assert.deepEqual(marks.done, []);
  assert.equal(localStorage.getItem(`draft-accepted:${SLUG}`), null);
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
  let saved = body;
  handle.text = () => toMarkdown(editor.state.doc);
  handle.base = () => (handle.text() === saved ? "2026-11-14T10:00:00.000001Z" : null);
  handle.saveVersion = async () => {
    saved = toMarkdown(editor.state.doc);
    saves.push(saved);
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

test("with the editor open, a retry reads the editor's text: an undo since is made again, once, and saved", async () => {
  const { editor, handle, saves } = editing(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "kept a ledger"), "kept a diary");
  handle.setItems([{ id: t.id, find: t.find }]);
  const marks = [];
  let fail = 1;
  const mark = async (id) => {
    if (fail-- > 0) throw new Error("Couldn't reach the server.");
    marks.push(id);
  };
  await assert.rejects(acceptSuggestion({ slug: SLUG, t, target: editorText(handle), mark }));
  assert.equal(saves.length, 1);
  const after = HARBOUR.replace("kept a ledger", "kept a diary");
  // Undone, not saved yet: made again in the editor, which is then the text saved.
  editor.commands.undo();
  assert.equal(toMarkdown(editor.state.doc), HARBOUR);
  fail = 1;
  await assert.rejects(acceptSuggestion({ slug: SLUG, t, target: editorText(handle), mark }));
  assert.equal(toMarkdown(editor.state.doc), after);
  assert.equal(saves.length, 1);
  // Undone and saved: made again, and saved.
  editor.commands.undo();
  await handle.saveVersion();
  assert.equal(saves[1], HARBOUR);
  await acceptSuggestion({ slug: SLUG, t, target: editorText(handle), mark });
  assert.deepEqual(marks, [t.id]);
  assert.equal(saves.length, 3);
  assert.equal(saves[2], after);
  assert.equal(toMarkdown(editor.state.doc), after);
  editor.destroy();
});

test("with the editor open, a retry whose edit is in the editor but not saved since saves it before marking", async () => {
  const { editor, handle, saves } = editing(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "kept a ledger"), "kept a diary");
  handle.setItems([{ id: t.id, find: t.find }]);
  const marks = [];
  let fail = 1;
  const mark = async (id) => {
    if (fail-- > 0) throw new Error("Couldn't reach the server.");
    marks.push(id);
  };
  await assert.rejects(acceptSuggestion({ slug: SLUG, t, target: editorText(handle), mark }));
  // Undone and saved, then redone and not saved.
  editor.commands.undo();
  await handle.saveVersion();
  editor.commands.redo();
  assert.equal(saves.length, 2);
  await acceptSuggestion({ slug: SLUG, t, target: editorText(handle), mark });
  assert.equal(saves.length, 3);
  assert.equal(saves[2], HARBOUR.replace("kept a ledger", "kept a diary"));
  assert.deepEqual(marks, [t.id]);
  assert.equal(toMarkdown(editor.state.doc), saves[2], "not made twice");
  editor.destroy();
});

test("Undo after an Accept in the editor undoes only the Accept, not the typing just before or after it", async () => {
  const body = "A cat sits here.\n";
  const { editor, handle } = editing(body);
  // Typed just before the passage, a moment before Accept.
  editor.view.dispatch(editor.state.tr.insertText("!", 3));
  const typed = toMarkdown(editor.state.doc);
  assert.equal(typed, "A !cat sits here.\n");
  // The passage as the server has it once that was saved.
  const t = thread(quoteOf(body, "cat"), "dog", { find: quoteOf(typed, "cat") });
  handle.setItems([{ id: t.id, find: t.find }]);
  await acceptSuggestion({ slug: SLUG, t, target: editorText(handle), mark: async () => {} });
  assert.equal(toMarkdown(editor.state.doc), "A !dog sits here.\n");
  // Typed just after the new word, a moment after.
  editor.view.dispatch(editor.state.tr.insertText("?", 7));
  assert.equal(toMarkdown(editor.state.doc), "A !dog? sits here.\n");
  editor.commands.undo();
  assert.equal(toMarkdown(editor.state.doc), "A !dog sits here.\n");
  editor.commands.undo();
  assert.equal(toMarkdown(editor.state.doc), "A !cat sits here.\n");
  editor.commands.undo();
  assert.equal(toMarkdown(editor.state.doc), body);
  editor.destroy();
});

// ---- the card ------------------------------------------------------------------------------

test("Accept is offered only on a card that shows the whole change: not on a margin card cut to its opening lines", () => {
  assert.equal(acceptOffered({ accepted: null, resolved: null, clamped: false }), true);
  assert.equal(acceptOffered({ accepted: null, resolved: null, clamped: true }), false);
  assert.equal(acceptOffered({ accepted: { at: "2026-11-14T10:00:00Z" }, resolved: null, clamped: false }), false);
  assert.equal(acceptOffered({ accepted: null, resolved: { by: "Ali" }, clamped: false }), false);
});
