// test/suggest.test.mjs: suggested edits. What a suggestion changes, how
// Accept finds the passage and replaces it in a draft's Markdown or in the
// editor's document, what it refuses, and that the text and the mark are
// saved together, so a press after one that failed, here or anywhere else,
// never changes the text twice. Every text is made up.
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

// Node has a localStorage of its own, unusable without a file: happy-dom's instead,
// to show Accept keeps nothing in it.
Object.defineProperty(globalThis, "localStorage", { value: window.localStorage, configurable: true, writable: true });

const SLUG = "made-up-draft";
// A thread's id: the service takes only a uuid for `accept`.
const ID = "0b9f6a1e-4c2d-4e8f-9a3b-5d6e7f809a1b";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
function thread(quote, suggestion, { id = ID, find = quote } = {}) {
  return { id, root: { id, suggestion, accepted: null }, quote, find, gone: false, replies: [], resolved: null };
}

/** A refusal as ./api.js throws it (ApiError): the status, the field, what came back. */
const refusal = (status, error, data = {}) => Object.assign(new Error(error), { status, field: data.field, data: { error, ...data } });

/**
 * The stats service, as far as Accept talks to it, keeping one draft and its
 * suggestion threads. A save with `accept` is as the contract has it: the
 * text and the mark together, or neither.
 */
function server(body, { ids = [ID] } = {}) {
  const s = {
    draft: { slug: SLUG, title: "A made-up title", date: "2026-11-14", summary: "A made-up summary.", body, updated_at: "2026-11-14T10:00:00.000001Z" },
    // Every save of the text that landed, with `accept` or without.
    saves: [],
    // Every thread marked on its own (`PATCH { id, accepted: true }`).
    marks: [],
    anchors: [],
    // The passage it has for each thread, the last anchor sent.
    held: new Map(),
    // Each suggestion thread on the draft: when it was accepted, else null.
    accepted: new Map(ids.map((id) => [id, null])),
    // Set to make the next save land and its answer be lost.
    loseAnswer: false,
    // Set to make the next save fail before it lands.
    dropSave: false,
    // Set to have another tab save the draft just before the next save arrives.
    savedElsewhere: false,
    // Which refusal it gives first when both apply: the thread's, or the stale base's.
    threadFirst: false,
    // Saves held until this many have arrived, then let through together.
    together: 0,
  };
  let n = 1;
  const stamp = () => `2026-11-14T10:00:${String(n++).padStart(2, "0")}.000001Z`;
  const held = [];
  s.request = async (path, opts = {}) => {
    if (path.startsWith("/api/drafts?slug=")) return { status: 200, data: { draft: { ...s.draft } } };
    if (path.startsWith("/api/draft-comments?draft=")) {
      return { status: 200, data: { comments: [...s.accepted].map(([id, at]) => ({ id, thread: null, accepted: at && { at } })) } };
    }
    if (path === "/api/drafts" && opts.method === "PUT") {
      if (s.together) {
        await new Promise((go) => {
          held.push(go);
          if (held.length === s.together) {
            s.together = 0;
            held.splice(0).forEach((g) => g());
          }
        });
      }
      if (s.dropSave) {
        s.dropSave = false;
        throw refusal(0, "Couldn't reach the server.");
      }
      if (s.savedElsewhere) {
        s.savedElsewhere = false;
        s.draft = { ...s.draft, updated_at: stamp() };
      }
      const b = opts.body;
      const accept = b.accept;
      if (accept !== undefined && (typeof accept !== "string" || !UUID.test(accept))) throw refusal(400, "That isn't a suggestion.", { field: "accept" });
      if (accept !== undefined && !b.base) throw refusal(400, "A new draft has no suggestions.", { field: "accept" });
      const thread = () => {
        if (accept === undefined) return;
        if (!s.accepted.has(accept)) throw refusal(404, "That suggestion isn't on this draft.", { field: "accept" });
        const at = s.accepted.get(accept);
        if (at) throw refusal(409, "That suggestion is already accepted.", { field: "accept", accepted: { id: accept, at } });
      };
      if (s.threadFirst) thread();
      if (b.base !== s.draft.updated_at) throw refusal(409, "This draft changed somewhere else.", { draft: { ...s.draft } });
      thread();
      // In one transaction: the text, its revision and the mark.
      s.saves.push(b);
      s.draft = { ...s.draft, body: b.body, updated_at: stamp() };
      if (accept !== undefined) s.accepted.set(accept, s.draft.updated_at);
      if (s.loseAnswer) {
        s.loseAnswer = false;
        throw refusal(0, "Couldn't reach the server.");
      }
      return { status: 200, data: { draft: { ...s.draft }, ...(accept !== undefined ? { accepted: { id: accept, at: s.draft.updated_at } } : {}) } };
    }
    if (path === "/api/draft-comments" && opts.method === "PATCH" && opts.body.accepted === true) {
      const { id } = opts.body;
      if (!s.accepted.has(id)) throw refusal(404, "That comment isn't there.");
      if (!s.accepted.get(id)) s.accepted.set(id, "2026-11-14T13:00:00.000001Z");
      s.marks.push(id);
      return { status: 200, data: { comment: { id, accepted: { at: s.accepted.get(id) } } } };
    }
    if (path === "/api/draft-comments?a=anchors" && opts.method === "PUT") {
      s.anchors.push(opts.body);
      for (const a of opts.body.anchors) s.held.set(a.thread, a);
      return { status: 200, data: { ok: true, ignored: [] } };
    }
    throw new Error(`unexpected request ${path}`);
  };
  /** A thread as a page opened now has it: its passage and whether it is accepted, as the server has them (toThreads). */
  s.seen = (t) => {
    const a = s.held.get(t.id);
    const at = s.accepted.get(t.id);
    const root = { ...t.root, accepted: at ? { at } : null };
    if (!a) return { ...t, root };
    return a.exact ? { ...t, root, find: { exact: a.exact, prefix: a.prefix, suffix: a.suffix }, gone: false } : { ...t, root, find: null, gone: true };
  };
  /** Another tab saving the text. */
  s.edit = (next) => {
    s.draft = { ...s.draft, body: next, updated_at: stamp() };
  };
  return s;
}

/** Whether a thread is accepted, asked of the service as ./DraftComments.jsx asks it. */
const acceptedOn = (s) => (id) => s.request(`/api/draft-comments?draft=${SLUG}`).then(({ data }) => data.comments.find((c) => c.id === id)?.accepted ?? null);

/** One press of Accept with the editor closed, as ./DraftComments.jsx makes it. */
const press = (s, t, threads = [t]) => acceptSuggestion({ t, target: pageText({ slug: SLUG, threads, request: s.request }), acceptedNow: acceptedOn(s) });

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

test("Accept replaces the passage in the Markdown and saves it as a version onto the text it read, the thread accepted by the same save", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out");
  await press(s, t);
  assert.equal(s.saves.length, 1);
  assert.equal(s.saves[0].kind, "manual");
  assert.equal(s.saves[0].base, "2026-11-14T10:00:00.000001Z");
  assert.equal(s.saves[0].accept, ID);
  assert.equal(s.saves[0].body, HARBOUR.replace("gulls followed it out", "gulls chased it out"));
  assert.equal(s.saves[0].title, "A made-up title");
  assert.ok(s.accepted.get(ID));
  assert.deepEqual(s.marks, [], "no mark of its own");
  // The thread's passage is the new words, in the text just saved.
  assert.equal(s.anchors.length, 1);
  assert.equal(s.anchors[0].base, s.draft.updated_at);
  const mine = s.anchors[0].anchors.find((a) => a.thread === ID);
  assert.equal(mine.exact, "gulls chased it out");
  // Nothing is kept in the browser.
  assert.equal(localStorage.length, 0);
});

test("a thread the service has as accepted already is left as it is: nothing is read or saved", async () => {
  const s = server(HARBOUR);
  s.accepted.set(ID, "2026-11-14T09:00:00.000001Z");
  const t = thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out");
  const asked = [];
  const request = s.request;
  s.request = (path, opts) => (asked.push(path), request(path, opts));
  await press(s, t);
  assert.deepEqual(asked, [`/api/draft-comments?draft=${SLUG}`]);
  assert.equal(s.saves.length, 0);
  assert.equal(s.draft.body, HARBOUR);
});

test("a save the service refuses as already accepted changes nothing, and is shown as accepted", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out");
  // Accepted elsewhere between this press's question and its save.
  const target = pageText({ slug: SLUG, threads: [t], request: s.request });
  const acceptedNow = async () => {
    s.accepted.set(ID, "2026-11-14T09:00:00.000001Z");
    return null;
  };
  await acceptSuggestion({ t, target, acceptedNow });
  assert.equal(s.saves.length, 0);
  assert.equal(s.anchors.length, 0);
  assert.equal(s.draft.body, HARBOUR);
});

test("a thread deleted meanwhile is refused with the service's reason, and nothing is written", async () => {
  const s = server(HARBOUR, { ids: [] });
  const t = thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out");
  await assert.rejects(press(s, t), { message: "That suggestion isn't on this draft." });
  assert.equal(s.saves.length, 0);
  assert.equal(s.draft.body, HARBOUR);
});

test("a deletion saves its passage as deleted", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "calling all the way"), "");
  await press(s, t);
  assert.equal(s.saves.length, 1);
  assert.equal(s.draft.body, HARBOUR.replace("calling all the way", ""));
  assert.deepEqual(s.anchors[0].anchors.find((a) => a.thread === ID), { thread: ID, exact: "", prefix: "", suffix: "" });
});

test("only the words that change are replaced: formatting around them stays", async () => {
  const body = "The **quick** brown fox jumps over the lazy dog.\n";
  const s = server(body);
  await press(s, thread(quoteOf(body, "quick brown fox"), "quick brown cat"));
  assert.equal(s.draft.body, "The **quick** brown cat jumps over the lazy dog.\n");
});

test("the suggested words are written to read as typed, Markdown's characters and all", async () => {
  const body = "A plain line about a cat and a dog.\n";
  const s = server(body);
  await press(s, thread(quoteOf(body, "a cat"), "a *real* cat"));
  assert.equal(indexOf(s.draft.body).text.trim(), "A plain line about a *real* cat and a dog.");
  assert.doesNotMatch(marked.parse(s.draft.body), /<em>/);
});

test("of words that occur twice, the reader's place is changed, by its context", async () => {
  const body = "The cat sat on the mat by the door.\n\nLater on the cat sat on the hat by the stove.\n";
  const s = server(body);
  await press(s, thread(quoteOf(body, "cat sat", 1), "dog sat"));
  assert.equal(s.draft.body, "The cat sat on the mat by the door.\n\nLater on the dog sat on the hat by the stove.\n");
});

test("words also in a link's address or its text are changed only where the passage is", async () => {
  const body = "Read [the guide](/guide) first, then the guide itself.\n";
  const s = server(body);
  await press(s, thread(quoteOf(body, "the guide itself"), "the manual itself"));
  assert.equal(s.draft.body, "Read [the guide](/guide) first, then the manual itself.\n");
});

test("a passage over two paragraphs keeps its paragraph break", async () => {
  const body = "The first paragraph ends here.\n\nThe second one starts there.\n";
  const s = server(body);
  await press(s, thread(quoteOf(body, "ends here.\nThe second"), "ends now.\nThe second"));
  assert.equal(s.draft.body, "The first paragraph ends now.\n\nThe second one starts there.\n");
});

test("threads beside the change are kept where they are; one the change overlaps keeps its place", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "gulls followed it out"), "seabirds followed it out");
  const near = thread(quoteOf(HARBOUR, "ferry left at dawn and the"), "x", { id: "t-near" });
  const over = thread(quoteOf(HARBOUR, "the gulls"), "x", { id: "t-over" });
  const far = thread(quoteOf(HARBOUR, "kept a ledger"), "x", { id: "t-far" });
  await press(s, t, [t, near, over, far]);
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
  await assert.rejects(press(s1, thread(quoteOf(twice, "the same thing"), "one thing")), { message: WHY.missing });
  // Edited since: the words the reader quoted are gone.
  const s2 = server(HARBOUR.replace("gulls followed", "terns followed"));
  await assert.rejects(press(s2, thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out")), { message: WHY.missing });
  // Edited in the editor, which moved the passage onto other words.
  const now = HARBOUR.replace("gulls followed", "terns followed");
  const s3 = server(now);
  const moved = thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out", { find: quoteOf(now, "terns followed it out") });
  await assert.rejects(press(s3, moved), { message: WHY.edited });
  // Formatting across the words that change.
  const bold = "The **quick** brown fox jumps.\n";
  const s4 = server(bold);
  await assert.rejects(press(s4, thread(quoteOf(bold, "quick brown"), "slow green")), { message: WHY.format });
  for (const s of [s1, s2, s3, s4]) {
    assert.equal(s.saves.length, 0);
    assert.equal(s.anchors.length, 0);
    assert.equal(s.accepted.get(ID), null);
  }
});

test("a draft saved somewhere else meanwhile is not written over, and the thread is not accepted", async () => {
  const s = server(HARBOUR);
  s.savedElsewhere = true;
  await assert.rejects(press(s, thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out")), { message: WHY.changed });
  assert.equal(s.saves.length, 0);
  assert.equal(s.accepted.get(ID), null);
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

test("text that only looks as if the edit were made is not taken for it", () => {
  const before = "Hello";
  const t = thread(quoteOf(before, "Hello"), "Hello!");
  assert.deepEqual(locate(indexOf(before), t), { at: [0, 5] });
  // The words there, the passage on the old ones: refused.
  assert.ok(locate(indexOf("Hello!"), t).why);
  // The passage on the new words: refused too, as is any not on the reader's words.
  assert.ok(locate(indexOf("Hello!"), { ...t, find: quoteOf("Hello!", "Hello!") }).why);
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

// ---- a press after one that failed -----------------------------------------------------

const TRICKY = [
  ["an expansion whose old words are inside the new ones", "Here a big cat rests by the fire.\n", "big cat", "very big cat"],
  ["a shortening, with a long context after it", "A very big cat rests beside the warm fireplace every evening.\n", "very big cat", "big cat"],
  ["a deletion of the whole passage", "Here a very big cat rests by the fire.\n", "very big cat", ""],
  ["a word put twice, the same as the one before it", "I saw the cat run off.\n", "the cat", "the the cat"],
  ["words already just before the passage", "There was a red fox and a grey fox.\n", "grey fox", "red fox"],
  ["punctuation only", "It rained, and then it was done\n", "it was done", "it was done."],
  ["capitals only", "We flew to paris in the spring.\n", "paris", "Paris"],
];

// How a first press fails: the save lands and its answer is lost, the save
// never lands, or the draft was saved somewhere else just before it.
const FIRST = {
  "the answer lost": { set: (s) => (s.loseAnswer = true), why: WHY.unknown, landed: true },
  "the save failing": { set: (s) => (s.dropSave = true), why: WHY.unknown, landed: false },
  "a stale base": { set: (s) => (s.savedElsewhere = true), why: WHY.changed, landed: false },
};

for (const [what, body, words, suggestion] of TRICKY) {
  test(`${what}: a press that fails, then one here or from a fresh page, saves the text once`, async () => {
    const after = body.replace(words, suggestion);
    for (const [how, first] of Object.entries(FIRST)) {
      for (const again of ["here", "from a fresh page"]) {
        const label = `${how}, pressed again ${again}`;
        const s = server(body);
        const t = thread(quoteOf(body, words), suggestion);
        first.set(s);
        await assert.rejects(press(s, t), { message: first.why }, label);
        assert.equal(s.saves.length, first.landed ? 1 : 0, label);
        assert.equal(s.draft.body, first.landed ? after : body, label);
        await press(s, again === "here" ? t : s.seen(t));
        assert.equal(s.saves.length, 1, `${label}: saved once`);
        assert.equal(s.draft.body, after, label);
        assert.ok(s.accepted.get(ID), label);
        assert.deepEqual(s.marks, [], label);
        // Once more, from anywhere: nothing.
        await press(s, s.seen(t));
        assert.equal(s.saves.length, 1, label);
      }
    }
  });
}

test("a deletion saved with its answer lost, the words then put back and the text revised: a second press changes nothing", async () => {
  const body = "The brown fox jumps over the fence and disappears into the forest.\n";
  const s = server(body);
  const t = thread(quoteOf(body, "brown fox"), "");
  s.loseAnswer = true;
  await assert.rejects(press(s, t), { message: WHY.unknown });
  assert.equal(s.draft.body, body.replace("brown fox", ""));
  // Restored and revised, here or on another device.
  const revised = "At dawn, a brown fox runs through the garden and vanishes behind the shed.\n";
  s.edit(revised);
  await press(s, s.seen(t));
  await press(s, t);
  assert.equal(s.saves.length, 1);
  assert.equal(s.draft.body, revised);
  assert.deepEqual(s.marks, []);
});

test("a save with its answer lost, the paragraph then pasted again: a second press does not change the copy", async () => {
  const p = "The long road led across the fields where a big cat rested beside the river beneath the willow trees.";
  const s = server(`${p}\n`);
  const t = thread(quoteOf(`${p}\n`, "big cat"), "very big cat");
  s.loseAnswer = true;
  await assert.rejects(press(s, t), { message: WHY.unknown });
  const pasted = `${p.replace("big cat", "very big cat")}\n\n${p}\n`;
  s.edit(pasted);
  await press(s, t);
  await press(s, s.seen(t));
  assert.equal(s.saves.length, 1);
  assert.equal(s.draft.body, pasted);
});

test("two tabs pressing Accept at once save the text once, whichever refusal the service gives first", async () => {
  for (const threadFirst of [false, true]) {
    const body = HARBOUR;
    const s = server(body);
    s.threadFirst = threadFirst;
    s.together = 2;
    const t = thread(quoteOf(body, "kept a ledger"), "kept a diary");
    const both = await Promise.allSettled([press(s, t), press(s, s.seen(t))]);
    assert.equal(s.saves.length, 1);
    assert.equal(s.draft.body, body.replace("kept a ledger", "kept a diary"));
    assert.ok(s.accepted.get(ID));
    // The other is told the draft changed, or shown accepted.
    const refused = both.filter((r) => r.status === "rejected");
    assert.ok(refused.every((r) => r.reason.message === WHY.changed));
    assert.equal(refused.length, threadFirst ? 0 : 1);
    // Pressed again, it changes nothing.
    await press(s, t);
    assert.equal(s.saves.length, 1);
  }
});

// ---- accepting it in the editor's document -------------------------------------------------

/**
 * The editor open on the draft as `s` has it now, with what DraftEditor adds
 * to the comments' handle: its save, as far as Accept sees it. A save the
 * service refuses as stale opens a conflict, and nothing is saved until it
 * is settled ("Keep mine").
 */
function editing(s, threads = []) {
  const { extension, handle } = commentAnchors();
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({ element, extensions: [...extensions(), extension], content: fromMarkdown(s.draft.body).doc, injectCSS: false });
  const e = { editor, handle, saved: s.draft.body, base: s.draft.updated_at, conflict: null };
  e.text = () => toMarkdown(editor.state.doc);
  handle.base = () => (!e.conflict && e.text() === e.saved ? e.base : null);
  const put = async (fields) => {
    if (e.conflict) return undefined;
    const body = e.text();
    const { title, date, summary } = s.draft;
    try {
      const { data } = await s.request("/api/drafts", { method: "PUT", body: { slug: SLUG, title, date, summary, body, base: e.base, ...fields } });
      e.saved = body;
      e.base = data.draft.updated_at;
      return data;
    } catch (err) {
      if (err.status === 409 && err.data?.draft) e.conflict = err.data.draft;
      return err;
    }
  };
  handle.saveAccepted = (id) => put({ kind: "manual", accept: id });
  e.autosave = () => put({ kind: "autosave" });
  e.keepMine = () => {
    e.base = e.conflict.updated_at;
    e.conflict = null;
    return put({ kind: "autosave" });
  };
  const mark = (id) => s.request("/api/draft-comments", { method: "PATCH", body: { id, accepted: true } });
  e.press = (t) => acceptSuggestion({ t, target: editorText(handle, mark), acceptedNow: acceptedOn(s) });
  handle.setItems(threads);
  return e;
}

/** `word`, where it first is in the editor's text, typed over with `text`. */
function type(editor, word, text) {
  let from = -1;
  editor.state.doc.descendants((node, pos) => {
    if (from < 0 && node.isText && node.text.includes(word)) from = pos + node.text.indexOf(word);
  });
  editor.view.dispatch(editor.state.tr.insertText(text, from, from + word.length));
}

test("with the editor open, Accept changes the editor's own text and its save carries the mark", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "gulls followed it out"), "gulls chased it out");
  const e = editing(s, [t]);
  await e.press(t);
  const after = HARBOUR.replace("gulls followed it out", "gulls chased it out");
  assert.equal(s.saves.length, 1);
  assert.equal(s.saves[0].body, after);
  assert.equal(s.saves[0].kind, "manual");
  assert.equal(s.saves[0].accept, ID);
  assert.ok(s.accepted.get(ID));
  assert.deepEqual(s.marks, []);
  assert.equal(e.handle.quotes().get(ID).exact, "gulls chased it out");
  assert.equal(e.handle.passage(ID), "gulls chased it out");
  // One step of the undo history.
  e.editor.commands.undo();
  assert.equal(e.text(), HARBOUR);
  e.editor.destroy();
});

test("in the editor, words across formatting or paragraphs are refused, and nothing changes", async () => {
  const body = "The **quick** brown fox jumps.\n\nA second line.\n";
  const s = server(body, { ids: [ID, "1c0a7b2f-5d3e-4f90-8b4c-6e7f8091a2b3", "2d1b8c30-6e4f-4a01-9c5d-7f8091a2b3c4"] });
  const across = thread(quoteOf(body, "quick brown"), "slow green");
  const lines = thread(quoteOf(body, "jumps.\nA second"), "jumps and a second", { id: "1c0a7b2f-5d3e-4f90-8b4c-6e7f8091a2b3" });
  const inside = thread(quoteOf(body, "brown fox"), "brown cat", { id: "2d1b8c30-6e4f-4a01-9c5d-7f8091a2b3c4" });
  const e = editing(s, [across, lines, inside]);
  await assert.rejects(e.press(across), { message: WHY.format });
  await assert.rejects(e.press(lines), { message: WHY.format });
  assert.equal(s.saves.length, 0);
  assert.equal(e.text(), body);
  // Words within one formatting are changed in it.
  await e.press(inside);
  assert.equal(s.saves.at(-1).body, "The **quick** brown cat jumps.\n\nA second line.\n");
  e.editor.destroy();
});

for (const [what, body, words, suggestion] of TRICKY) {
  test(`${what}, in the editor: a press that fails, then one here or in a fresh editor, saves the text once`, async () => {
    const after = body.replace(words, suggestion);
    for (const [how, first] of Object.entries(FIRST)) {
      for (const again of ["here", "here, after an autosave", "in a fresh editor"]) {
        const label = `${how}, pressed again ${again}`;
        const s = server(body);
        const t = thread(quoteOf(body, words), suggestion);
        const e = editing(s, [t]);
        first.set(s);
        await assert.rejects(e.press(t), { message: first.why === WHY.changed ? WHY.unsaved : first.why }, label);
        assert.equal(s.saves.length, first.landed ? 1 : 0, label);
        // The change is in the editor either way, once.
        assert.equal(e.text(), after, label);
        let second = e;
        if (again === "in a fresh editor") second = editing(s, [s.seen(t)]);
        else if (again === "here, after an autosave") {
          // A conflict is settled first: the editor's text kept.
          if (e.conflict) await e.keepMine();
          else await e.autosave();
        }
        if (again === "here" && e.conflict) {
          // Nothing is saved while the conflict is open.
          await assert.rejects(e.press(t), { message: WHY.unsaved }, label);
          assert.equal(s.saves.length, 0, label);
          await e.keepMine();
        }
        await second.press(t);
        assert.equal(s.draft.body, after, label);
        assert.equal(second.text(), after, `${label}: not put in twice`);
        assert.ok(s.accepted.get(ID), label);
        // Saved once: with the mark, or by an autosave or "Keep mine" and then marked.
        assert.equal(s.saves.length, 1, `${label}: saved once`);
        assert.equal(s.saves.filter((b) => b.accept).length + s.marks.length, 1, label);
        // Once more: nothing.
        await second.press(t);
        assert.equal(second.text(), after, label);
        if (second !== e) second.editor.destroy();
        e.editor.destroy();
      }
    }
  });
}

test("in the editor, a press after the change was undone puts it in once, on the text as it is, and saves it with the mark", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "kept a ledger"), "kept a diary");
  const e = editing(s, [t]);
  s.dropSave = true;
  await assert.rejects(e.press(t), { message: WHY.unknown });
  e.editor.commands.undo();
  assert.equal(e.text(), HARBOUR);
  assert.equal(e.handle.passage(ID), "kept a ledger");
  await e.press(t);
  const after = HARBOUR.replace("kept a ledger", "kept a diary");
  assert.equal(e.text(), after);
  assert.deepEqual(s.saves.map((b) => [b.body, b.accept]), [[after, ID]]);
  e.editor.destroy();
});

test("in the editor, a press after the new words were edited is a first press on the text as it is: refused here", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "kept a ledger"), "kept a diary");
  const e = editing(s, [t]);
  s.dropSave = true;
  await assert.rejects(e.press(t), { message: WHY.unknown });
  // "diary" changed by hand to "journal".
  type(e.editor, "diary", "journal");
  assert.equal(e.handle.passage(ID), "kept a journal");
  await assert.rejects(e.press(t), (err) => [WHY.edited, WHY.missing].includes(err.message));
  assert.equal(s.saves.length, 0);
  assert.equal(s.accepted.get(ID), null);
  e.editor.destroy();
});

test("in the editor, the passage put back by hand onto the suggested words is saved with the mark, the words not put in again", async () => {
  const s = server(HARBOUR);
  const t = thread(quoteOf(HARBOUR, "kept a ledger"), "kept a diary");
  const e = editing(s, [t]);
  type(e.editor, "ledger", "diary");
  assert.equal(e.handle.passage(ID), "kept a diary");
  // Saved by an autosave: only the mark is missing.
  await e.autosave();
  await e.press(t);
  assert.equal(e.text(), HARBOUR.replace("kept a ledger", "kept a diary"));
  assert.equal(s.saves.length, 1);
  assert.deepEqual(s.marks, [ID]);
  e.editor.destroy();
});

test("the editor and a page pressing Accept at once save the text once", async () => {
  for (const threadFirst of [false, true]) {
    const s = server(HARBOUR);
    s.threadFirst = threadFirst;
    const t = thread(quoteOf(HARBOUR, "kept a ledger"), "kept a diary");
    const e = editing(s, [t]);
    s.together = 2;
    await Promise.allSettled([e.press(t), press(s, s.seen(t))]);
    const after = HARBOUR.replace("kept a ledger", "kept a diary");
    assert.equal(s.saves.length, 1);
    assert.equal(s.draft.body, after);
    assert.ok(s.accepted.get(ID));
    // The editor has the change once, saved or not; kept, it is the same text.
    assert.equal(e.text(), after);
    if (e.conflict) await e.keepMine();
    await e.press(t);
    assert.equal(s.draft.body, after);
    assert.equal(e.text(), after);
    e.editor.destroy();
  }
});

test("Undo after an Accept in the editor undoes only the Accept, not the typing just before or after it", async () => {
  const body = "A cat sits here.\n";
  const s = server(body);
  const t0 = thread(quoteOf(body, "cat"), "dog");
  const e = editing(s);
  const { editor } = e;
  // Typed just before the passage, a moment before Accept.
  editor.view.dispatch(editor.state.tr.insertText("!", 3));
  const typed = e.text();
  assert.equal(typed, "A !cat sits here.\n");
  // The passage as the server has it once that was saved.
  const t = { ...t0, find: quoteOf(typed, "cat") };
  e.handle.setItems([t]);
  await e.press(t);
  assert.equal(e.text(), "A !dog sits here.\n");
  assert.equal(s.saves[0].body, "A !dog sits here.\n");
  // Typed just after the new word, a moment after.
  editor.view.dispatch(editor.state.tr.insertText("?", 7));
  assert.equal(e.text(), "A !dog? sits here.\n");
  editor.commands.undo();
  assert.equal(e.text(), "A !dog sits here.\n");
  editor.commands.undo();
  assert.equal(e.text(), "A !cat sits here.\n");
  editor.commands.undo();
  assert.equal(e.text(), body);
  editor.destroy();
});

// ---- the card ------------------------------------------------------------------------------

test("Accept is offered only on a card that shows the whole change: not on a margin card cut to its opening lines", () => {
  assert.equal(acceptOffered({ accepted: null, resolved: null, clamped: false }), true);
  assert.equal(acceptOffered({ accepted: null, resolved: null, clamped: true }), false);
  assert.equal(acceptOffered({ accepted: { at: "2026-11-14T10:00:00Z" }, resolved: null, clamped: false }), false);
  assert.equal(acceptOffered({ accepted: null, resolved: { by: "Ali" }, clamped: false }), false);
});
