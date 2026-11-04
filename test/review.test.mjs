// test/review.test.mjs: Ali's review of a draft (src/front/private/review.js),
// the comments kept in his browser until he publishes them. Every text is
// made up.
import { window } from "./dom.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { addPending, editPending, newId, readReview, removePending, reviewKey, toBatch } from "../src/front/private/review.js";

// Node has a localStorage of its own, unusable without a file, so dom.mjs
// leaves it be; here it is the page's.
Object.defineProperty(globalThis, "localStorage", { value: window.localStorage, configurable: true, writable: true });

const SLUG = "test-draft";
const QUOTE = { exact: "Lorem draft", prefix: "Before the ", suffix: " and after." };

beforeEach(() => localStorage.clear());

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
  editPending(SLUG, b.id, "Second, edited.");
  removePending(SLUG, [a.id]);
  assert.deepEqual(readReview(SLUG).map((x) => [x.id, x.body]), [[b.id, "Second, edited."], [c.id, "Third."]]);
  removePending(SLUG, [b.id, c.id]);
  assert.equal(localStorage.getItem(reviewKey(SLUG)), null, "an empty review leaves nothing behind");
});

test("each change starts from what is stored, so two tabs add to one review", () => {
  const a = addPending(SLUG, { body: "From one tab." });
  // Another tab wrote this after the first one last read.
  localStorage.setItem(reviewKey(SLUG), JSON.stringify([...readReview(SLUG), { id: newId(), body: "From another.", quote: null, at: 1 }]));
  addPending(SLUG, { body: "From the first again." });
  assert.deepEqual(readReview(SLUG).map((x) => x.body), ["From one tab.", "From another.", "From the first again."]);
  assert.equal(readReview(SLUG)[0].id, a.id);
});

test("what is stored is checked before it is used", () => {
  localStorage.setItem(reviewKey(SLUG), "not json");
  assert.deepEqual(readReview(SLUG), []);
  localStorage.setItem(reviewKey(SLUG), JSON.stringify({ id: "x" }));
  assert.deepEqual(readReview(SLUG), []);
  const ok = { id: newId(), body: "Kept.", quote: null, at: 1 };
  localStorage.setItem(reviewKey(SLUG), JSON.stringify([ok, { id: 1, body: "x", quote: null, at: 1 }, { id: "y", body: "x", quote: { exact: 2 }, at: 1 }, null]));
  assert.deepEqual(readReview(SLUG), [ok]);
});

test("a browser that will not keep a comment says so, rather than losing it quietly", () => {
  const full = { getItem: () => null, removeItem() {}, setItem() { throw new Error("QuotaExceededError"); } };
  Object.defineProperty(globalThis, "localStorage", { value: full, configurable: true, writable: true });
  try {
    assert.throws(() => addPending(SLUG, { body: "Too much." }), /won't keep the comment/);
  } finally {
    Object.defineProperty(globalThis, "localStorage", { value: window.localStorage, configurable: true, writable: true });
  }
  assert.deepEqual(readReview(SLUG), []);
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
