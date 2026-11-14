// test/typed.test.mjs: a person's unsent words on a draft, kept in this
// browser (../src/front/private/typed.js). Every word here is made up.
import { window } from "./dom.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
const { hasWords, newId, passageSlot, sendTyped, startPassage, sweepTyped, toReopen, typedKey, typedStore, who } = await import("../src/front/private/typed.js");

const DAY = 24 * 60 * 60 * 1000;
const quote = (exact, prefix = "", suffix = "") => ({ exact, prefix, suffix });
const stored = (key) => JSON.parse(localStorage.getItem(key));

beforeEach(() => localStorage.clear());

test("kept per person and per draft: a reader by username, Ali as one value, never another's", () => {
  assert.equal(who({ name: "Ada", username: "ada", owner: false }), "reader.ada");
  assert.equal(who({ name: "Ali", username: null, owner: true }), "owner");
  assert.equal(who({ name: "Owner", username: "owner", owner: false }), "reader.owner");
  assert.equal(who(null), null);
  assert.equal(typedKey("reader.ada", "made-up"), "draft-unsent:reader.ada:made-up");

  const ada = typedStore("reader.ada", "made-up", { wait: 0 });
  ada.set("general", { body: "Ada's made-up words." });
  ada.flush();
  assert.equal(typedStore("reader.bo", "made-up").has("general"), false);
  assert.equal(typedStore("reader.ada", "another-draft").has("general"), false);
  assert.equal(typedStore("reader.ada", "made-up").get("general").body, "Ada's made-up words.");
});

test("written at once when first kept, a moment after later typing, at once on flush; dropped when sent or cancelled", async () => {
  const s = typedStore("reader.ada", "made-up", { wait: 20 });
  s.set("reply:t1", { body: "A made-up reply." });
  assert.equal(stored(typedKey("reader.ada", "made-up")).slots["reply:t1"].body, "A made-up reply.");
  s.set("reply:t1", { body: "A made-up reply, longer." });
  assert.equal(stored(typedKey("reader.ada", "made-up")).slots["reply:t1"].body, "A made-up reply.");
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(stored(typedKey("reader.ada", "made-up")).slots["reply:t1"].body, "A made-up reply, longer.");
  s.drop("reply:t1");
  s.flush();
  assert.equal(localStorage.getItem(typedKey("reader.ada", "made-up")), null);
});

test("another tab's slots on the same draft are left as it has them", () => {
  const one = typedStore("reader.ada", "made-up");
  const two = typedStore("reader.ada", "made-up");
  one.set("reply:t1", { body: "From one tab." });
  one.flush();
  two.set("reply:t2", { body: "From another." });
  two.flush();
  assert.deepEqual(Object.keys(stored(typedKey("reader.ada", "made-up")).slots).sort(), ["reply:t1", "reply:t2"]);
});

test("slots older than 30 days are dropped, here and on every other draft", () => {
  let now = Date.UTC(2026, 0, 1);
  const s = typedStore("reader.ada", "made-up", { now: () => now });
  s.set("general", { body: "Old made-up words." });
  s.flush();
  const other = typedStore("reader.bo", "other", { now: () => now });
  other.set("general", { body: "Old too." });
  other.flush();
  now += 31 * DAY;
  assert.equal(typedStore("reader.ada", "made-up", { now: () => now }).has("general"), false);
  sweepTyped(now);
  assert.equal(localStorage.getItem(typedKey("reader.bo", "other")), null);
});

test("storage that refuses or throws changes nothing in memory, and nothing throws", () => {
  const proto = Object.getPrototypeOf(localStorage);
  const real = { setItem: proto.setItem, getItem: proto.getItem, key: proto.key };
  proto.setItem = proto.getItem = proto.key = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  try {
    const s = typedStore("reader.ada", "made-up");
    s.set("general", { body: "Only in memory." });
    s.flush();
    sweepTyped();
    assert.equal(s.get("general").body, "Only in memory.");
    assert.ok(s.keyFor("general", { body: "Only in memory." }));
  } finally {
    Object.assign(proto, real);
  }
  // Unreadable JSON is nothing kept.
  localStorage.setItem(typedKey("reader.ada", "made-up"), "{not json");
  assert.equal(typedStore("reader.ada", "made-up").latest().length, 0);
});

test("absent and empty differ: a deletion and an emptied edit are kept as empty", () => {
  const s = typedStore("reader.ada", "made-up");
  const q = quote("Delete these words");
  const slot = passageSlot("suggest", q);
  s.set(slot, { kind: "suggest", quote: q, words: "", note: "" });
  s.set("edit:c1", { body: "" });
  s.flush();
  const back = typedStore("reader.ada", "made-up");
  assert.equal(back.get(slot).words, "");
  assert.equal(back.get("edit:c1").body, "");
  assert.equal(hasWords(slot, back.get(slot)), true);
  assert.equal(hasWords("edit:c1", back.get("edit:c1")), true);
  assert.equal(hasWords(slot, { kind: "suggest", quote: q, words: q.exact, note: "" }), false);
  assert.equal(hasWords("general", { body: "  " }), false);
});

const K = typedKey("reader.ada", "made-up");
const counter = () => {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
};

test("R3: a key is made when a slot is first kept and stored with it at once; typing and the first send keep it", () => {
  const s = typedStore("reader.ada", "made-up", { make: counter() });
  s.set("reply:t1", { body: "Made up." });
  const k = stored(K).slots["reply:t1"].key;
  assert.equal(k, "00000000-0000-4000-8000-000000000001");
  assert.equal(typedStore("reader.ada", "made-up").get("reply:t1").key, k, "a second tab restoring it has the same key");
  s.set("reply:t1", { body: "Made up, more." });
  assert.equal(s.get("reply:t1").key, k, "typing keeps it");
  assert.equal(s.keyFor("reply:t1", { body: "Made up, more.", thread: "t1" }), k, "the first send uses it");
  assert.equal(typedStore("reader.ada", "made-up").get("reply:t1").keyFor !== undefined, true, "what it was sent with, kept at once");
  // An edit sends no key, and is given none.
  s.set("edit:c1", { body: "An edit, made up." });
  assert.equal(s.get("edit:c1").key, undefined);
  assert.match(newId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("R3: the key is kept apart from the words: emptied and typed again after an unanswered send, the same words keep it", () => {
  const s = typedStore("reader.ada", "made-up", { make: counter() });
  s.set("general", { body: "Same made-up words." });
  const a = s.keyFor("general", { body: "Same made-up words." });
  s.clear("general");
  s.flush();
  assert.equal(hasWords("general", s.get("general")), false, "nothing to open a box for");
  assert.equal(typedStore("reader.ada", "made-up").get("general").key, a, "the key stays, through a reload");
  s.set("general", { body: "Same made-up words." });
  assert.equal(s.keyFor("general", { body: "Same made-up words." }), a);
  // Changed words after a send was tried: a new key.
  s.set("general", { body: "Other made-up words." });
  const b = s.keyFor("general", { body: "Other made-up words." });
  assert.notEqual(b, a);
  // Cancelled: the key goes with the words.
  s.drop("general");
  s.set("general", { body: "Other made-up words." });
  assert.notEqual(s.get("general").key, b);
});

test("R3: before a send the key is read from storage: two tabs with the same words send one key", () => {
  // Restored in a second tab, as the review had it.
  const a = typedStore("reader.ada", "made-up");
  a.set("general", { body: "Same draft open in both tabs" });
  a.flush();
  const b = typedStore("reader.ada", "made-up");
  const fields = { body: "Same draft open in both tabs" };
  assert.equal(a.keyFor("general", fields), b.keyFor("general", fields));
  // Both open before either kept anything, the same words typed in each.
  localStorage.clear();
  const c = typedStore("reader.ada", "made-up");
  const d = typedStore("reader.ada", "made-up");
  c.set("general", { body: "Typed in both, made up." });
  d.set("general", { body: "Typed in both, made up." });
  const same = { body: "Typed in both, made up." };
  assert.equal(c.keyFor("general", same), d.keyFor("general", same));
  // One tab sent and heard nothing; the other then types the same words: still one key.
  localStorage.clear();
  const e = typedStore("reader.ada", "made-up");
  const f = typedStore("reader.ada", "made-up");
  e.set("general", same);
  const sent = e.keyFor("general", same);
  f.set("general", same);
  assert.equal(f.keyFor("general", same), sent);
  // Other words in the other tab: their key is not taken.
  localStorage.clear();
  const g = typedStore("reader.ada", "made-up");
  const h = typedStore("reader.ada", "made-up");
  g.set("general", { body: "One tab's words." });
  h.set("general", { body: "The other tab's words." });
  const mine = h.get("general").key;
  assert.notEqual(mine, g.get("general").key);
  assert.equal(h.keyFor("general", { body: "The other tab's words." }), mine);
  assert.equal(g.keyFor("general", { body: "One tab's words." }), g.get("general").key);
  assert.notEqual(g.get("general").key, mine);
});

test("R3: sendTyped sends the key and no id; a 409 about the key lets it go, and is thrown on", async () => {
  const s = typedStore("reader.ada", "made-up");
  s.set("general", { body: "Made up." });
  const sent = [];
  await assert.rejects(
    sendTyped(s, "general", { body: "Made up." }, async (f) => {
      sent.push(f);
      throw Object.assign(new Error("Taken, made up."), { status: 409, field: "key" });
    }),
    /Taken, made up/,
  );
  await sendTyped(s, "general", { body: "Made up." }, async (f) => sent.push(f));
  assert.equal(sent.length, 2);
  assert.equal(sent[0].id, undefined);
  assert.match(sent[0].key, /^[0-9a-f-]{36}$/);
  assert.notEqual(sent[0].key, sent[1].key);
  // Another 409, not about the key, keeps it.
  const kept = s.get("general").key;
  await assert.rejects(sendTyped(s, "general", { body: "Made up." }, async () => {
    throw Object.assign(new Error("Someone else, made up."), { status: 409, field: "as" });
  }));
  assert.equal(s.get("general").key, kept);
});

test("R2: a confirmed send clears only what it sent", () => {
  const s = typedStore("reader.ada", "made-up");
  s.set("general", { body: "Sent, made up." });
  const snapshot = s.get("general");
  const k = s.keyFor("general", { body: "Sent, made up." });
  s.set("general", { body: "Sent, made up, and typed since." });
  s.sent("general", snapshot);
  assert.equal(s.get("general").body, "Sent, made up, and typed since.", "words typed since stay");
  assert.notEqual(s.get("general").key, k, "with a key of their own");
  s.sent("general", s.get("general"));
  assert.equal(s.has("general"), false);
});

test("R6: a tab removes from storage only the version of a slot it knows", () => {
  // The review's case: the first tab's send erased the second tab's newer words.
  const a = typedStore("reader.ada", "made-up");
  a.set("general", { body: "Original shared draft" });
  a.flush();
  const b = typedStore("reader.ada", "made-up");
  b.set("general", { body: "Newer text in second tab" });
  b.flush();
  a.drop("general");
  a.flush();
  assert.equal(stored(K)?.slots.general?.body, "Newer text in second tab");
  // The version a tab knows does go.
  b.drop("general");
  b.flush();
  assert.equal(localStorage.getItem(K), null);
  // After a send too: the second tab's words, read and left as they were, go; newer ones stay.
  const c = typedStore("reader.ada", "made-up");
  c.set("reply:t1", { body: "A made-up reply." });
  c.flush();
  const d = typedStore("reader.ada", "made-up");
  assert.equal(d.get("reply:t1").body, "A made-up reply.");
  const snapshot = c.get("reply:t1");
  c.keyFor("reply:t1", { body: "A made-up reply.", thread: "t1" });
  c.sent("reply:t1", snapshot);
  c.flush();
  assert.equal(localStorage.getItem(K), null);
  const e = typedStore("reader.ada", "made-up");
  e.set("reply:t2", { body: "Sent from one tab." });
  e.flush();
  const f = typedStore("reader.ada", "made-up");
  f.set("reply:t2", { body: "Changed in the other tab." });
  f.flush();
  const shot = e.get("reply:t2");
  e.sent("reply:t2", shot);
  e.flush();
  assert.equal(stored(K).slots["reply:t2"].body, "Changed in the other tab.");
});

test("a composer with words keeps its passage: another passage, or the other kind, opens it instead", () => {
  const s = typedStore("reader.ada", "made-up");
  const a = passageSlot("comment", quote("first passage", "before ", " after"));
  const b = passageSlot("comment", quote("second passage"));
  // The same words elsewhere in the text are another passage.
  assert.notEqual(a, passageSlot("comment", quote("first passage", "other ", " context")));
  assert.deepEqual(startPassage(s, b, a), { slot: b, blocked: false }, "nothing typed: it moves");
  s.set(a, { kind: "comment", quote: quote("first passage", "before ", " after"), body: "About the first." });
  assert.deepEqual(startPassage(s, b, a), { slot: a, blocked: true });
  assert.deepEqual(startPassage(s, b, null), { slot: a, blocked: true }, "closed, it still holds them");
  assert.deepEqual(startPassage(s, passageSlot("suggest", quote("first passage", "before ", " after")), a), { slot: a, blocked: true });
  assert.deepEqual(startPassage(s, a, a), { slot: a, blocked: false }, "its own passage again");
});

test("the box to open again is the one typed in last that still has a place", () => {
  let now = 1000;
  const s = typedStore("reader.ada", "made-up", { now: () => now });
  s.set("reply:gone", { body: "On a thread deleted since." });
  now++;
  s.set("general", { body: "On the whole draft." });
  now++;
  s.set("reply:gone-too", { body: "Newest, nowhere." });
  assert.equal(toReopen(s, (slot) => !slot.startsWith("reply:")), "general");
  assert.equal(toReopen(s, () => false), null);
});
