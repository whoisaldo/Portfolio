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

test("written a moment after typing, at once on flush; dropped when sent or cancelled", async () => {
  const s = typedStore("reader.ada", "made-up", { wait: 20 });
  s.set("reply:t1", { body: "A made-up reply." });
  assert.equal(localStorage.getItem(typedKey("reader.ada", "made-up")), null);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(stored(typedKey("reader.ada", "made-up")).slots["reply:t1"].body, "A made-up reply.");
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
    assert.ok(s.idFor("general", { body: "Only in memory." }));
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

test("an id is made once per message: the very same words keep it, through a reload; changed words get another", () => {
  let n = 0;
  const make = () => `00000000-0000-4000-8000-00000000000${++n}`;
  const s = typedStore("reader.ada", "made-up");
  const fields = { body: "Made up.", thread: "t1" };
  s.set("reply:t1", { body: "Made up." });
  const a = s.idFor("reply:t1", fields, make);
  assert.equal(typedStore("reader.ada", "made-up").idFor("reply:t1", fields, make), a, "kept with the words at once");
  s.set("reply:t1", { body: "Made up, changed." });
  assert.equal(s.get("reply:t1").id, a, "typing keeps it until it is sent");
  const b = s.idFor("reply:t1", { body: "Made up, changed.", thread: "t1" }, make);
  assert.notEqual(b, a);
  s.forgetId("reply:t1");
  assert.notEqual(s.idFor("reply:t1", { body: "Made up, changed.", thread: "t1" }, make), b);
  assert.match(newId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("sendTyped sends the id; a 409 about the id lets it go, and is thrown on", async () => {
  const s = typedStore("reader.ada", "made-up");
  s.set("general", { body: "Made up." });
  const sent = [];
  await assert.rejects(
    sendTyped(s, "general", { body: "Made up." }, async (f) => {
      sent.push(f.id);
      throw Object.assign(new Error("Taken, made up."), { status: 409, field: "id" });
    }),
    /Taken, made up/,
  );
  assert.equal(s.get("general").id, undefined);
  await sendTyped(s, "general", { body: "Made up." }, async (f) => sent.push(f.id));
  assert.equal(sent.length, 2);
  assert.notEqual(sent[0], sent[1]);
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
