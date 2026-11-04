// test/review.test.mjs: Ali's review of a draft (src/front/private/review.js),
// the comments kept in his browser until he publishes them. Every text is
// made up.
import { window } from "./dom.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REVIEW, addPending, cleanBody, dropSent, editPending, followPending, isReviewKey, keepPublishedPlace, locked, movedHere, movePending, newId,
  publishReview, publishedAsIs, publishingNow, readReview, removePending, toBatch,
} from "../src/front/private/review.js";
import { indexText } from "../src/front/quotes.js";
import { findWhole } from "../src/front/private/place.js";

// Node has a localStorage of its own, unusable without a file, so dom.mjs
// leaves it be; here it is the page's.
const useStorage = (s) => Object.defineProperty(globalThis, "localStorage", { value: s, configurable: true, writable: true });
useStorage(window.localStorage);

// Web Locks as a browser has them: one holder at a time, the rest in turn.
const queues = new Map();
const fakeLocks = {
  request(name, fn) {
    const run = (queues.get(name) || Promise.resolve()).then(() => fn());
    queues.set(name, run.catch(() => {}));
    return run;
  },
};
const useLocks = (locks) => Object.defineProperty(globalThis.navigator, "locks", { value: locks, configurable: true });

const SLUG = "test-draft";
const QUOTE = { exact: "Lorem draft", prefix: "Before the ", suffix: " and after." };
const keys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));

beforeEach(() => {
  useStorage(window.localStorage);
  localStorage.clear();
  useLocks(fakeLocks);
});

test("comments are kept in the order written, and read back as a reload would", () => {
  const a = addPending(SLUG, { body: "First.", quote: QUOTE });
  const b = addPending(SLUG, { body: "On the whole draft." });
  const c = addPending(SLUG, { body: "Third.", quote: { exact: "ipsum" } });
  assert.deepEqual(readReview(SLUG).map((x) => x.id), [a.id, b.id, c.id]);
  assert.deepEqual(readReview(SLUG)[0].quote, QUOTE);
  assert.equal(readReview(SLUG)[1].quote, null);
  assert.deepEqual(readReview(SLUG)[2].quote, { exact: "ipsum", prefix: "", suffix: "" }, "missing context is empty");
  assert.deepEqual(readReview("another-draft"), [], "each draft has its own");
});

test("one is edited or deleted, and the rest are left as they were", () => {
  const a = addPending(SLUG, { body: "First.", quote: QUOTE });
  const b = addPending(SLUG, { body: "Second." });
  const c = addPending(SLUG, { body: "Third." });
  assert.equal(editPending(SLUG, b.id, "Second, edited."), true);
  removePending(SLUG, [a.id]);
  assert.deepEqual(readReview(SLUG).map((x) => [x.id, x.body]), [[b.id, "Second, edited."], [c.id, "Third."]]);
  removePending(SLUG, [b.id, c.id]);
  assert.deepEqual(keys(), [], "an empty review leaves nothing behind");
  assert.equal(editPending(SLUG, b.id, "Too late."), false, "one gone is not written back");
  assert.deepEqual(keys(), []);
});

/**
 * Two tabs' storage as Chrome keeps it: each reads its own copy, and what one
 * writes reaches the other a moment later.
 */
function twoTabs() {
  const shared = new Map();
  const tab = () => {
    const mine = new Map(shared);
    const self = {
      mine,
      get length() { return mine.size; },
      key: (i) => [...mine.keys()][i] ?? null,
      getItem: (k) => mine.get(k) ?? null,
      setItem(k, v) { mine.set(k, String(v)); spread(self, (m) => m.set(k, String(v))); },
      removeItem(k) { mine.delete(k); spread(self, (m) => m.delete(k)); },
      clear() { mine.clear(); },
    };
    return self;
  };
  const tabs = [tab(), tab()];
  const late = [];
  function spread(from, change) {
    change(shared);
    for (const t of tabs) if (t !== from) late.push(() => change(t.mine));
  }
  return { tabs, arrive: () => late.splice(0).forEach((f) => f()) };
}

test("two tabs adding at once both keep their comment, though neither had seen the other's", () => {
  const { tabs: [one, two], arrive } = twoTabs();
  useStorage(one);
  const a = addPending(SLUG, { body: "From one tab." });
  useStorage(two);
  const b = addPending(SLUG, { body: "From the other." });
  editPending(SLUG, b.id, "From the other, edited.");
  useStorage(one);
  removePending(SLUG, [addPending(SLUG, { body: "Gone again." }).id]);
  arrive();
  for (const t of [one, two]) {
    useStorage(t);
    assert.deepEqual(readReview(SLUG).map((x) => [x.id, x.body]), [[a.id, "From one tab."], [b.id, "From the other, edited."]]);
  }
});

test("what is stored is checked before it is used", () => {
  localStorage.setItem(`draft-review:${SLUG}:x`, "not json");
  localStorage.setItem(`draft-review:${SLUG}:y`, JSON.stringify({ id: "y", body: "x", quote: { exact: 2 }, at: 1 }));
  const other = { id: newId(), body: "Under another key.", quote: null, at: 1 };
  localStorage.setItem(`draft-review:${SLUG}:z`, JSON.stringify(other));
  assert.deepEqual(readReview(SLUG), []);
  const ok = { id: newId(), body: "Kept.", quote: null, at: 1 };
  localStorage.setItem(`draft-review:${SLUG}:${ok.id}`, JSON.stringify(ok));
  assert.deepEqual(readReview(SLUG), [ok]);
});

test("a browser that will not keep a comment says so, rather than losing it quietly", () => {
  useStorage({ length: 0, key: () => null, getItem: () => null, removeItem() {}, setItem() { throw new Error("QuotaExceededError"); } });
  assert.throws(() => addPending(SLUG, { body: "Too much." }), /won't keep the comment/);
});

test(`a review holds ${MAX_REVIEW}, and says so for one more`, () => {
  for (let i = 0; i < MAX_REVIEW; i++) addPending(SLUG, { body: `Note ${i}.` });
  assert.throws(() => addPending(SLUG, { body: "One more." }), /at most/);
  assert.equal(readReview(SLUG).length, MAX_REVIEW);
});

test("ids are version 4 UUIDs, each its own", () => {
  const ids = new Set(Array.from({ length: 500 }, newId));
  assert.equal(ids.size, 500);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("the review goes to the service as its batch endpoint takes it", () => {
  const a = addPending(SLUG, { body: "First.", quote: QUOTE });
  const b = addPending(SLUG, { body: "Second." });
  assert.deepEqual(toBatch(readReview(SLUG)), [
    { id: a.id, body: "First.", quote: "Lorem draft", prefix: "Before the ", suffix: " and after." },
    { id: b.id, body: "Second." },
  ]);
});

test("a passage the editor moved is kept where it is now, and one deleted where it was", () => {
  const a = addPending(SLUG, { body: "On a moved passage.", quote: QUOTE });
  const b = addPending(SLUG, { body: "On a deleted one.", quote: QUOTE });
  const c = addPending(SLUG, { body: "On the whole draft." });
  const moved = { exact: "Lorem draft", prefix: "A new line, then ", suffix: " and after." };
  const quotes = new Map([[a.id, moved], [b.id, { gone: true }], [c.id, moved], ["someone-else", moved]]);
  assert.equal(followPending(SLUG, quotes), 1);
  // As a reload reads it.
  const [ra, rb, rc] = readReview(SLUG);
  assert.deepEqual(ra.quote, moved);
  assert.deepEqual(rb.quote, QUOTE);
  assert.equal(rc.quote, null, "one on the whole draft has no passage to move");
  assert.equal(followPending(SLUG, quotes), 0, "where it is already");
  assert.deepEqual(toBatch([ra])[0], { id: a.id, body: "On a moved passage.", quote: "Lorem draft", prefix: "A new line, then ", suffix: " and after." });
});

test("letting go of what was sent leaves one edited or moved since", () => {
  const a = addPending(SLUG, { body: "As sent." });
  const b = addPending(SLUG, { body: "Before an edit." });
  const c = addPending(SLUG, { body: "Before a move.", quote: QUOTE });
  const sent = readReview(SLUG);
  editPending(SLUG, b.id, "After the snapshot.");
  movePending(SLUG, c.id, { ...QUOTE, prefix: "Moved before the " });
  dropSent(SLUG, sent);
  assert.deepEqual(readReview(SLUG).map((x) => [x.id, x.body]), [[b.id, "After the snapshot."], [c.id, "Before a move."]]);
  assert.ok(a.id);
});

test("one is in already only with its text and its passage, where the server has it now", () => {
  const c = addPending(SLUG, { body: "On a passage.", quote: QUOTE });
  const moved = { exact: "Lorem draft", prefix: "Moved before the ", suffix: " and after." };
  const there = { id: c.id, body: "On a passage.", quote: QUOTE, mine: true, thread: null };
  assert.equal(publishedAsIs(c, there), true);
  assert.equal(publishedAsIs({ ...c, quote: moved }, there), false, "a moved passage is still to publish");
  assert.equal(publishedAsIs({ ...c, quote: moved }, { ...there, anchor: moved }), true, "the server's anchor is where it is");
  assert.equal(publishedAsIs(c, { ...there, anchor: { gone: true } }), false);
  assert.equal(publishedAsIs({ ...c, body: "Other." }, there), false);
  assert.equal(publishedAsIs(c, undefined), false);
});

/**
 * A stats service for publishReview: comments by id, as Ali sees his own,
 * and the draft's updated_at (`saved`), which an anchor must name as its base.
 */
function server() {
  const has = new Map();
  const at = { saved: "v1" };
  const calls = [];
  const asShown = (c) => ({ id: c.id, body: cleanBody(c.body), quote: c.quote ?? null, anchor: null, mine: true, thread: null });
  // As the batch endpoint compares them: the text, and the quote as sent (never the anchor).
  const differs = (c) => has.get(c.id).body !== cleanBody(c.body) || JSON.stringify(has.get(c.id).quote) !== JSON.stringify(c.quote ?? null);
  return {
    has,
    calls,
    at,
    send: async (list) => {
      calls.push(["send", list.map((c) => c.id)]);
      const taken = list.filter((c) => has.has(c.id) && differs(c)).map((c) => c.id);
      if (taken.length) throw Object.assign(new Error("In already with other text."), { status: 409, data: { ids: taken } });
      for (const c of list) if (!has.has(c.id)) has.set(c.id, asShown(c));
      return list.map((c) => has.get(c.id));
    },
    edit: async (id, body) => {
      calls.push(["edit", id, body]);
      if (!has.has(id)) throw Object.assign(new Error("That comment was deleted."), { status: 404 });
      has.get(id).body = cleanBody(body);
    },
    anchor: async (id, quote, base) => {
      calls.push(["anchor", id, quote]);
      if (base !== at.saved) throw Object.assign(new Error("This draft was saved since."), { status: 409, data: { draft_updated_at: at.saved } });
      if (!has.has(id)) return false;
      has.get(id).anchor = quote;
      return true;
    },
    refresh: async () => [...has.values()],
  };
}

test("a 40-comment review goes in one request, and is let go once it is in", async () => {
  const list = Array.from({ length: 40 }, (_, i) => addPending(SLUG, { body: `Note ${i}.` }));
  const s = server();
  assert.equal(await publishReview(SLUG, { posted: new Map(), ...s }), 40);
  assert.deepEqual(s.calls, [["send", list.map((c) => c.id)]]);
  assert.deepEqual(readReview(SLUG), []);
  assert.equal(publishingNow(SLUG), false);
});

test("while one tab publishes, every tab sees it, and an edit waits for it and goes to the published comment", async () => {
  const a = addPending(SLUG, { body: "Before." });
  const s = server();
  let during = null;
  let edited = null;
  const send = async (list) => {
    during = { flag: publishingNow(SLUG), key: isReviewKey(SLUG, `draft-review-publishing:${SLUG}`) };
    // Another tab saves an edit now: it waits for the lock.
    edited = locked(SLUG, () => editPending(SLUG, a.id, "After."));
    await new Promise((r) => setTimeout(r, 10));
    return s.send(list);
  };
  await publishReview(SLUG, { posted: new Map(), ...s, send });
  assert.deepEqual(during, { flag: true, key: true });
  assert.equal(await edited, false, "the comment is published by then: the page sends the edit to it");
  assert.equal(publishingNow(SLUG), false);
});

test("an edit that lands after the snapshot is never lost: the published comment takes it", async () => {
  // A page without Web Locks, as over plain http: the edit is not held off.
  useLocks(undefined);
  const a = addPending(SLUG, { body: "As written." });
  const b = addPending(SLUG, { body: "Untouched." });
  const s = server();
  const send = async (list) => {
    editPending(SLUG, a.id, "Edited during the publish.");
    return s.send(list);
  };
  assert.equal(await publishReview(SLUG, { posted: new Map(), ...s, send }), 2);
  assert.deepEqual(s.calls, [["send", [a.id, b.id]], ["edit", a.id, "Edited during the publish."]]);
  assert.equal(s.has.get(a.id).body, "Edited during the publish.");
  assert.deepEqual(readReview(SLUG), []);
});

test("a publish that fails keeps every comment, and lets go of the flag", async () => {
  addPending(SLUG, { body: "Kept." });
  const send = async () => {
    throw Object.assign(new Error("Couldn't reach the server."), { status: 0 });
  };
  await assert.rejects(publishReview(SLUG, { posted: new Map(), ...server(), send }), /reach/);
  assert.equal(readReview(SLUG).length, 1);
  assert.equal(publishingNow(SLUG), false);
});

test("one the server has with older text is sent as an edit, and the rest are published", async () => {
  const a = addPending(SLUG, { body: "First, as first sent." });
  const s = server();
  await s.send([a]); // its answer was lost
  s.calls.length = 0;
  editPending(SLUG, a.id, "First, revised.");
  const b = addPending(SLUG, { body: "New since." });
  // The page had not polled since: it sends both, and the server refuses them.
  assert.equal(await publishReview(SLUG, { posted: new Map(), ...s }), 2, "the edit is its going in");
  assert.deepEqual(s.calls, [["send", [a.id, b.id]], ["edit", a.id, "First, revised."], ["send", [b.id]]]);
  assert.equal(s.has.get(a.id).body, "First, revised.");
  assert.ok(s.has.has(b.id));
  assert.deepEqual(readReview(SLUG), []);
});

test("a review that is only an edit to one in already says it went in", async () => {
  const a = addPending(SLUG, { body: "As first sent." });
  const s = server();
  await s.send([a]); // its answer was lost
  s.calls.length = 0;
  editPending(SLUG, a.id, "Revised since.");
  assert.equal(await publishReview(SLUG, { posted: new Map(), ...s }), 1, "not 0, which would show no publish at all");
  assert.deepEqual(s.calls, [["send", [a.id]], ["edit", a.id, "Revised since."]]);
  assert.deepEqual(readReview(SLUG), []);
});

test("one in already exactly as written is let go without being sent", async () => {
  const a = addPending(SLUG, { body: "Same  \n\n\n\nhere. " });
  const s = server();
  await s.send([a]);
  s.calls.length = 0;
  assert.equal(await publishReview(SLUG, { posted: new Map(s.has), ...s }), 0);
  assert.deepEqual(s.calls, [], "a space is not an edit");
  assert.deepEqual(readReview(SLUG), []);
});

test("one whose id the server has for something else is published under a new one", async () => {
  const a = addPending(SLUG, { body: "Mine." });
  const s = server();
  s.has.set(a.id, { id: a.id, body: "A reader's.", mine: false, thread: null });
  assert.equal(await publishReview(SLUG, { posted: new Map(), ...s }), 1);
  const ids = [...s.has.keys()];
  assert.equal(ids.length, 2);
  assert.equal(s.has.get(ids[1]).body, "Mine.");
  assert.equal(s.has.get(a.id).body, "A reader's.", "left as it was");
  assert.deepEqual(readReview(SLUG), []);
});

test("one added while a publish runs waits for the next", async () => {
  const a = addPending(SLUG, { body: "In the snapshot." });
  const s = server();
  let later = null;
  const send = async (list) => {
    later = addPending(SLUG, { body: "Written meanwhile." });
    return s.send(list);
  };
  assert.equal(await publishReview(SLUG, { posted: new Map(), ...s, send }), 1);
  assert.deepEqual([...s.has.keys()], [a.id]);
  assert.deepEqual(readReview(SLUG).map((c) => c.id), [later.id]);
});

test("one moved after a publish whose answer was lost keeps its new passage, sent as its anchor", async () => {
  const a = addPending(SLUG, { body: "On a passage.", quote: QUOTE, base: "v1" });
  const s = server();
  await s.send([a]); // in, but its answer was lost
  s.calls.length = 0;
  // An edit to the draft moves the passage, and is saved.
  s.at.saved = "v2";
  const moved = { exact: "Lorem draft, revised", prefix: "Before the ", suffix: " and after." };
  assert.equal(movePending(SLUG, a.id, moved, "v2"), true);
  // Not polled since: the server's has the first passage, and the page keeps this one.
  assert.equal(publishedAsIs(readReview(SLUG)[0], s.has.get(a.id)), false);
  assert.equal(await publishReview(SLUG, { posted: new Map(), ...s }), 1);
  assert.deepEqual(s.calls, [["send", [a.id]], ["anchor", a.id, moved]]);
  assert.deepEqual(s.has.get(a.id).quote, QUOTE, "the quote as first sent stays");
  assert.deepEqual(s.has.get(a.id).anchor, moved, "and the passage is where it moved");
  assert.equal(s.has.size, 1, "posted once");
  assert.deepEqual(readReview(SLUG), []);
});

test("one moved and deleted on the server since is kept, and published anew where it is", async () => {
  const a = addPending(SLUG, { body: "On a passage.", quote: QUOTE, base: "v1" });
  const s = server();
  await s.send([a]);
  const moved = { ...QUOTE, prefix: "Moved before the " };
  movePending(SLUG, a.id, moved, "v1");
  const posted = new Map(s.has);
  s.has.delete(a.id); // deleted in another tab, after the last poll
  assert.equal(await publishReview(SLUG, { posted, ...s }), 1);
  const [only] = [...s.has.values()];
  assert.notEqual(only.id, a.id);
  assert.deepEqual(only.quote, moved);
  assert.deepEqual(readReview(SLUG), []);
});

test("a passage kept for text saved over in another tab is not sent onto that tab's: it waits, and goes once found in the new text", async () => {
  const { tabs: [one, two], arrive } = twoTabs();
  const s = server();
  useStorage(one);
  const a = addPending(SLUG, { body: "On a passage.", quote: QUOTE, base: "v1" });
  await s.send([a]); // in, but its answer was lost
  // This tab's editor revises the comment and moves its passage, in the text saved at v1.
  const moved = { exact: "Lorem draft", prefix: "Moved before the ", suffix: " and after." };
  editPending(SLUG, a.id, "On a passage, revised.");
  movePending(SLUG, a.id, moved, "v1");
  const b = addPending(SLUG, { body: "On the whole draft." });
  arrive();
  // The other tab saves newer text, and its editor anchors the thread there.
  useStorage(two);
  s.at.saved = "v2";
  const theirs = { exact: "Lorem draft", prefix: "Newer text before the ", suffix: " and after." };
  assert.equal(await s.anchor(a.id, theirs, "v2"), true);
  s.calls.length = 0;
  // Publishing from the first tab, not polled since.
  useStorage(one);
  await assert.rejects(publishReview(SLUG, { posted: new Map(), ...s }), (err) => err.status === 409 && err.data.id === a.id);
  assert.deepEqual(s.has.get(a.id).anchor, theirs, "the newer text's passage is left as it is");
  assert.equal(s.has.get(a.id).body, "On a passage, revised.", "the revised text went in");
  assert.ok(s.has.has(b.id), "the rest of the review went in");
  const [kept] = readReview(SLUG);
  assert.deepEqual([readReview(SLUG).length, kept.id, kept.body, kept.quote, kept.base], [1, a.id, "On a passage, revised.", moved, "v1"], "pending as it was");
  assert.equal(publishingNow(SLUG), false);
  // Published again before it is found in the new text: refused again, and still pending.
  await assert.rejects(publishReview(SLUG, { posted: new Map(s.has), ...s }), (err) => err.status === 409);
  assert.deepEqual(s.has.get(a.id).anchor, theirs);
  assert.deepEqual(readReview(SLUG).map((c) => [c.id, c.quote]), [[a.id, moved]]);
  // The page finds it in the text saved at v2, and keeps it for that text; then it goes.
  const found = { exact: "Lorem draft", prefix: "Moved, in newer text, before the ", suffix: " and after." };
  assert.equal(followPending(SLUG, new Map([[a.id, found]]), "v2"), 1);
  assert.equal(await publishReview(SLUG, { posted: new Map(s.has), ...s }), 1);
  assert.deepEqual(s.has.get(a.id).anchor, found);
  assert.deepEqual(readReview(SLUG), []);
});

test("a passage read off text not saved yet is not sent as an anchor", async () => {
  const a = addPending(SLUG, { body: "On a passage.", quote: QUOTE, base: "v1" });
  const s = server();
  await s.send([a]);
  s.calls.length = 0;
  const moved = { ...QUOTE, prefix: "Typed before the " };
  movePending(SLUG, a.id, moved, null);
  await assert.rejects(publishReview(SLUG, { posted: new Map(s.has), ...s }), (err) => err.status === 409 && err.data.id === a.id);
  assert.deepEqual(s.calls, []);
  assert.deepEqual(readReview(SLUG)[0].quote, moved);
  // Saved: the same passage, now in text the server has.
  assert.equal(movePending(SLUG, a.id, moved, "v1"), true, "the same passage in saved text is kept for it");
  assert.equal(await publishReview(SLUG, { posted: new Map(s.has), ...s }), 1);
  assert.deepEqual(s.has.get(a.id).anchor, moved);
});

test("a held passage an edit nearby left nowhere to be found keeps the published one, and the review publishes cleanly after", async () => {
  const s = server();
  const a = addPending(SLUG, { body: "On a passage.", quote: QUOTE, base: "v1" });
  await s.send([a]);
  // Moved here, in the text saved at v1, and revised.
  const moved = { exact: "Lorem draft", prefix: "Now a moved ", suffix: " at the end." };
  movePending(SLUG, a.id, moved, "v1");
  editPending(SLUG, a.id, "On a passage, revised.");
  // Another tab edits around it and saves, and anchors the thread there.
  s.at.saved = "v2";
  const theirs = { exact: "Lorem draft", prefix: "Now a much moved ", suffix: ", near the end." };
  assert.equal(await s.anchor(a.id, theirs, "v2"), true);
  await assert.rejects(publishReview(SLUG, { posted: new Map(s.has), ...s }), (err) => err.status === 409 && err.data.id === a.id);
  assert.equal(s.has.get(a.id).body, "On a passage, revised.", "the revised text went in");
  // The read view looks for it in the text saved at v2, and it is not there.
  const article = document.createElement("article");
  article.innerHTML = "<p>Before the Lorem draft and after. Now a much moved Lorem draft, near the end.</p>";
  assert.equal(findWhole(indexText(article), moved), null);
  const [held] = readReview(SLUG);
  assert.equal(movedHere(held, s.has.get(a.id)), true, "held: its card says so");
  // Kept where the server has it: with nothing else to send, it is let go.
  assert.equal(keepPublishedPlace(SLUG, a.id, s.has.get(a.id)), true);
  assert.deepEqual(readReview(SLUG), []);
  assert.equal(publishedAsIs(held, s.has.get(a.id)), false, "and nothing of it was published");
  assert.deepEqual(s.has.get(a.id).anchor, theirs);
  // The review publishes as usual after.
  const b = addPending(SLUG, { body: "On the whole draft." });
  s.calls.length = 0;
  assert.equal(await publishReview(SLUG, { posted: new Map(s.has), ...s }), 1);
  assert.deepEqual(s.calls, [["send", [b.id]]]);
  assert.deepEqual(readReview(SLUG), []);
  assert.equal(keepPublishedPlace(SLUG, a.id, s.has.get(a.id)), false, "one not pending is left alone");
});

test("a held passage kept where the server has it still sends text edited since, and no anchor", async () => {
  const s = server();
  const a = addPending(SLUG, { body: "On a passage.", quote: QUOTE, base: "v1" });
  await s.send([a]);
  movePending(SLUG, a.id, { ...QUOTE, prefix: "Moved before the " }, null);
  await assert.rejects(publishReview(SLUG, { posted: new Map(s.has), ...s }), (err) => err.status === 409);
  editPending(SLUG, a.id, "Edited while held.");
  assert.equal(keepPublishedPlace(SLUG, a.id, s.has.get(a.id)), true);
  const [kept] = readReview(SLUG);
  assert.deepEqual([kept.body, kept.quote, movedHere(kept, s.has.get(a.id))], ["Edited while held.", QUOTE, false]);
  s.calls.length = 0;
  assert.equal(await publishReview(SLUG, { posted: new Map(s.has), ...s }), 1);
  assert.deepEqual(s.calls, [["edit", a.id, "Edited while held."]]);
  assert.deepEqual(readReview(SLUG), []);
});
