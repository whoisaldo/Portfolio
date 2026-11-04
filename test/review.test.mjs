// test/review.test.mjs: Ali's review of a draft (src/front/private/review.js),
// the comments kept in his browser until he publishes them. Every text is
// made up.
import { window } from "./dom.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REVIEW, addPending, cleanBody, dropSent, editPending, followPending, isReviewKey, locked, newId, publishReview,
  publishingNow, readReview, removePending, toBatch,
} from "../src/front/private/review.js";

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

test("letting go of what was sent leaves one edited since", () => {
  const a = addPending(SLUG, { body: "As sent." });
  const b = addPending(SLUG, { body: "Before an edit." });
  const sent = readReview(SLUG);
  editPending(SLUG, b.id, "After the snapshot.");
  dropSent(SLUG, sent);
  assert.deepEqual(readReview(SLUG).map((x) => [x.id, x.body]), [[b.id, "After the snapshot."]]);
  assert.ok(a.id);
});

/** A stats service for publishReview: comments by id, as Ali sees his own. */
function server() {
  const has = new Map();
  const calls = [];
  const asShown = (c) => ({ id: c.id, body: cleanBody(c.body), mine: true, thread: null });
  return {
    has,
    calls,
    send: async (list) => {
      calls.push(["send", list.map((c) => c.id)]);
      const taken = list.filter((c) => has.has(c.id) && has.get(c.id).body !== cleanBody(c.body)).map((c) => c.id);
      if (taken.length) throw Object.assign(new Error("In already with other text."), { status: 409, data: { ids: taken } });
      for (const c of list) if (!has.has(c.id)) has.set(c.id, asShown(c));
      return list.map((c) => has.get(c.id));
    },
    edit: async (id, body) => {
      calls.push(["edit", id, body]);
      if (!has.has(id)) throw Object.assign(new Error("That comment was deleted."), { status: 404 });
      has.get(id).body = cleanBody(body);
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
