// test/reader.test.mjs: a reader's words on a private draft, through every
// edge the page meets: a reload, a phone throwing the tab away, the list and
// back, a session that ran out, another account in another tab, a lost
// answer, a slow send, a draft taken away, a screen turned. The real page
// (./page.mjs) against a made-up service; every word here is made up.
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  API, BODY, READERS, button, click, field, load, mount, press, reload, resize, selectAnd, service, settle, storage, text, type, unload, unmount, until,
} from "./page.mjs";
import { markOf } from "../src/front/private/unsaved.js";

let PrivateBlog;
before(async () => {
  ({ PrivateBlog } = await load());
});
after(unload);
beforeEach(() => localStorage.clear());
afterEach(unmount);

const composer = () => document.querySelector('[data-card="new"]');
const pendingPassage = () => document.querySelector(".is-pending")?.textContent;
const signedIn = (name) => until(() => text().includes(`Signed in as ${name}`), `signed in as ${name}`);
const poll = async () => {
  await settle();
  document.dispatchEvent(new window.Event("visibilitychange"));
  await settle(30);
};
const kept = (fake, who = "reader.ada") => storage()[`draft-unsent:${who}:${fake.draft.slug}`];

/** A thread already on the draft, started by `by`. */
function seed(fake, { by = "ada", body = "A made-up first thought.", quote = "lighthouse keeper", suggestion = null } = {}) {
  const r = { ada: "Ada Reader", bo: "Bo Reader" }[by];
  const c = {
    id: crypto.randomUUID(), thread: null, body, by, author: { name: r, owner: false }, suggestion, resolved: null, accepted: null, anchor: null,
    quote: quote && { exact: quote, prefix: "", suffix: "" }, created_at: "2026-01-01T00:00:05.000Z", edited_at: null,
  };
  fake.comments.push(c);
  return c;
}

/** Opens a thread's card in the margin by its passage. */
async function openThread(quote) {
  const mark = await until(() => [...document.querySelectorAll("[data-threads]")].find((m) => m.textContent.includes(quote) && !m.classList.contains("is-pending")), `the highlight on "${quote}"`);
  await click(mark);
}

/** A request held until `release()`, then answered as usual, or as `then` says. */
function hold(fake, match) {
  let release;
  const gate = new Promise((r) => (release = r));
  fake.hooks.push(async (req) => (match(req) ? gate : undefined));
  return () => release();
}

// ---- 1. Unsent words survive ---------------------------------------------------------

test("1: a comment typed and not sent is back in its composer, on its passage, after a reload", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "A made-up thought about boats.");
  await reload(PrivateBlog, fake);
  const box = await until(() => field("Comment on the selected passage"), "the composer, open again");
  assert.equal(box.value, "A made-up thought about boats.");
  await until(() => pendingPassage() === "fishing boats", "its passage highlighted");
  // Sent, it is let go.
  await click(button("Comment", composer()));
  await until(() => fake.posts().length === 1, "the comment sent");
  assert.equal(fake.posts()[0].body.quote, "fishing boats");
  await settle(500);
  assert.equal(kept(fake), undefined);
});

test("1: a suggestion's words and note, a reply and an edit come back after the list and back", async () => {
  const fake = service();
  const mine = seed(fake, { body: "An older made-up note." });
  await mount(PrivateBlog, fake);
  // An edit of their own comment, then a reply on the same card.
  await openThread("lighthouse keeper");
  await click(button("Edit", document.querySelector(`[data-card="${mine.id}"]`)));
  await type(field("Edit your comment"), "A newer made-up note.");
  await type(field("Reply"), "A made-up reply.");
  // A suggestion on another passage.
  await selectAnd("harbour wall", "Suggest edit");
  await type(field("What the selected words should say"), "harbour steps");
  await type(field("A note on your suggestion (optional)"), "Steps fit better.");
  // To the list and back.
  await click(document.querySelector('a[href="/privateblog"]'));
  await until(() => text().includes("No drafts right now") || document.querySelector('a[href="/privateblog/made-up"]'), "the list");
  await click(document.querySelector('a[href="/privateblog/made-up"]'));
  await until(() => field("What the selected words should say"), "the suggestion, open again");
  assert.equal(field("What the selected words should say").value, "harbour steps");
  assert.equal(field("A note on your suggestion (optional)").value, "Steps fit better.");
  assert.equal(pendingPassage(), "harbour wall");
  // The edit is open again on its card; the reply is back when the card is.
  assert.equal(field("Edit your comment")?.value, "A newer made-up note.");
  await openThread("lighthouse keeper");
  assert.equal(field("Reply")?.value, "A made-up reply.");
});

test("1: a reply being typed is open again on its card after a reload", async () => {
  const fake = service();
  seed(fake);
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  await type(field("Reply"), "A made-up reply, half done.");
  await reload(PrivateBlog, fake);
  const box = await until(() => field("Reply"), "the reply box, open again");
  assert.equal(box.value, "A made-up reply, half done.");
});

test("1: on a phone, the sheet opens again with the words in it after the tab was thrown away", async () => {
  const fake = service();
  await mount(PrivateBlog, fake, { width: 390 });
  await selectAnd("evening fog", "Suggest edit");
  await type(field("What the selected words should say"), "morning mist");
  await reload(PrivateBlog, fake, { width: 390 });
  const box = await until(() => document.querySelector("dialog.draft-sheet[open]") && field("What the selected words should say"), "the sheet, open again");
  assert.equal(box.value, "morning mist");
});

test("1: a session that ran out loses nothing: signed in again, the words are back", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Typed as the session ran out.");
  fake.signedIn = null;
  await poll();
  await until(() => document.querySelector('form[aria-label="Sign in"]'), "the sign-in form");
  fake.signedIn = { name: "Ada Reader", username: "ada", owner: false };
  fake.hooks.push(async (req) => (req.query.a === "login" ? new Response(JSON.stringify({ viewer: fake.signedIn }), { status: 200 }) : undefined));
  await type(document.querySelector("#private-username"), "ada");
  await type(document.querySelector("#private-password"), "made-up");
  await act(() => document.querySelector('form[aria-label="Sign in"]').requestSubmit());
  const box = await until(() => field("Comment on the selected passage"), "the composer, back");
  assert.equal(box.value, "Typed as the session ran out.");
});

test("1: a reader's own Sign out keeps their words for them, and no one else sees them", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Ada's made-up words.");
  await click(button("Sign out"));
  await until(() => document.querySelector('form[aria-label="Sign in"]'), "the sign-in form");
  assert.equal(kept(fake).slots && Object.values(kept(fake).slots)[0].body, "Ada's made-up words.");
  // Bo signs in on this browser: nothing of Ada's.
  fake.signedIn = { name: "Bo Reader", username: "bo", owner: false };
  await reload(PrivateBlog, fake);
  await signedIn("Bo Reader");
  await settle(50);
  assert.ok(!text().includes("Ada's made-up words."));
  assert.equal(composer(), null);
  // Ada again: back.
  fake.signedIn = { name: "Ada Reader", username: "ada", owner: false };
  await reload(PrivateBlog, fake);
  assert.equal((await until(() => field("Comment on the selected passage"), "Ada's composer")).value, "Ada's made-up words.");
});

test("1: with storage refused, typing and sending work as before, and nothing reaches the page", async () => {
  const fake = service();
  const proto = Object.getPrototypeOf(localStorage);
  const real = { setItem: proto.setItem, getItem: proto.getItem };
  proto.setItem = () => {
    throw new DOMException("full", "QuotaExceededError");
  };
  proto.getItem = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  const errors = [];
  const onError = (e) => errors.push(e);
  window.addEventListener("error", onError);
  try {
    await mount(PrivateBlog, fake);
    await selectAnd("fishing boats");
    await type(field("Comment on the selected passage"), "Kept in memory only.");
    await settle(600);
    await act(() => document.dispatchEvent(new window.Event("visibilitychange")));
    assert.equal(field("Comment on the selected passage").value, "Kept in memory only.");
    await click(button("Comment", composer()));
    await until(() => fake.posts().length === 1, "the comment sent");
    assert.deepEqual(errors, []);
  } finally {
    Object.assign(proto, real);
    window.removeEventListener("error", onError);
  }
});

// ---- 2. Words never go out under another name ----------------------------------------

test("2: another account signed in in another tab: the page shows it from scratch, and keeps the first one's words", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Ada's made-up words.");
  fake.signedIn = { name: "Bo Reader", username: "bo", owner: false };
  await act(() => window.dispatchEvent(new window.Event("focus")));
  await signedIn("Bo Reader");
  await settle(50);
  assert.ok(!text().includes("Ada's made-up words."));
  assert.equal(field("Comment on the selected passage"), null);
  assert.equal(Object.values(kept(fake).slots)[0].body, "Ada's made-up words.");
  assert.match(text(), /signed in as Bo Reader, from another tab/i);
});

test("2: every create says who the page believes is signed in, and a 409 about it stores nothing", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Ada's made-up words.");
  // Bo signs in elsewhere, and this tab has not heard yet.
  fake.signedIn = { name: "Bo Reader", username: "bo", owner: false };
  await click(button("Comment", composer()));
  await until(() => fake.posts().length === 1, "the send");
  assert.equal(fake.posts()[0].body.as, "ada");
  await signedIn("Bo Reader");
  assert.equal(fake.comments.length, 0);
  assert.equal(Object.values(kept(fake).slots)[0].body, "Ada's made-up words.");
});

// ---- 3. Typed words only go with their passage ---------------------------------------

test("3: a comment with words stays on its passage when another is picked, and says to send or cancel it first", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "This is about the boats only.");
  await selectAnd("evening fog");
  assert.equal(pendingPassage(), "fishing boats");
  assert.equal(field("Comment on the selected passage").value, "This is about the boats only.");
  assert.match(composer().textContent, /Send or cancel this first/);
  // Nor does a suggestion take them.
  await selectAnd("evening fog", "Suggest edit");
  assert.equal(pendingPassage(), "fishing boats");
  assert.equal(field("What the selected words should say"), null);
  await click(button("Comment", composer()));
  await until(() => fake.posts().length === 1, "the send");
  assert.equal(fake.posts()[0].body.quote, "fishing boats");
  assert.equal(fake.posts()[0].body.body, "This is about the boats only.");
});

test("3: a suggestion with words stays too; an empty composer moves to the new passage", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  // Nothing typed: it moves.
  await selectAnd("fishing boats");
  await selectAnd("evening fog");
  assert.equal(pendingPassage(), "evening fog");
  await click(button("Cancel", composer()));
  // A suggestion with words stays.
  await selectAnd("harbour wall", "Suggest edit");
  await type(field("What the selected words should say"), "harbour steps");
  await selectAnd("evening fog");
  assert.equal(pendingPassage(), "harbour wall");
  assert.equal(field("What the selected words should say").value, "harbour steps");
  assert.equal(field("Comment on the selected passage"), null);
  assert.match(composer().textContent, /Send or cancel this first/);
});

test("3: on a phone, a sheet closed with words in it opens again on its own passage", async () => {
  const fake = service();
  await mount(PrivateBlog, fake, { width: 390 });
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Only about the boats.");
  await click(button("", document.querySelector("dialog.draft-sheet")) || document.querySelector(".draft-sheet-close"));
  await until(() => !document.querySelector("dialog.draft-sheet"), "the sheet closed");
  await selectAnd("evening fog");
  const sheet = await until(() => document.querySelector("dialog.draft-sheet[open]"), "the sheet");
  assert.equal(field("Comment on the selected passage", sheet).value, "Only about the boats.");
  assert.equal(sheet.querySelector(".draft-quote")?.textContent, "fishing boats");
  assert.match(sheet.textContent, /Send or cancel this first/);
  await click(button("Comment", sheet));
  await until(() => fake.posts().length === 1, "the send");
  assert.equal(fake.posts()[0].body.quote, "fishing boats");
});

// ---- 4. Nothing typed during a send is lost ------------------------------------------

test("4: while a send is in flight its fields are read-only and it cannot be cancelled", async () => {
  const fake = service();
  const mine = seed(fake);
  await mount(PrivateBlog, fake);
  const release = hold(fake, (r) => r.method !== "GET");

  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "A made-up comment.");
  await click(button("Comment", composer()));
  assert.equal(field("Comment on the selected passage").readOnly, true, "comment");
  assert.equal(button("Cancel", composer()).disabled, true, "comment cancel");
  await press(field("Comment on the selected passage"), "Escape");
  assert.ok(field("Comment on the selected passage"), "Escape does not close it");
  release();
  await until(() => !composer(), "the comment sent");

  const release2 = hold(fake, (r) => r.method !== "GET");
  await openThread("lighthouse keeper");
  await type(field("Reply"), "A made-up reply.");
  await click(button("Reply", document.querySelector(`[data-card="${mine.id}"] .draft-box`)));
  assert.equal(field("Reply").readOnly, true, "reply");
  await click(button("Edit", document.querySelector(`[data-card="${mine.id}"]`)));
  await type(field("Edit your comment"), "Edited, made up.");
  await click(button("Save"));
  assert.equal(field("Edit your comment").readOnly, true, "edit");
  assert.equal(button("Cancel", document.querySelector(`[data-card="${mine.id}"]`)).disabled, true, "edit cancel");
  release2();
  await until(() => !field("Edit your comment"), "the edit saved");

  const release3 = hold(fake, (r) => r.method !== "GET");
  await selectAnd("harbour wall", "Suggest edit");
  await type(field("What the selected words should say"), "harbour steps");
  await type(field("A note on your suggestion (optional)"), "A made-up note.");
  await click(button("Suggest"));
  assert.equal(field("What the selected words should say").readOnly, true, "suggestion words");
  assert.equal(field("A note on your suggestion (optional)").readOnly, true, "suggestion note");
  assert.equal(button("Cancel", composer()).disabled, true, "suggestion cancel");
  release3();
  await until(() => !composer(), "the suggestion sent");
});

// ---- 5. A retry never duplicates -----------------------------------------------------

test("5: a send whose answer was lost, tried again, is one comment, even after a reload", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Sent once, made up.");
  // The service stores it, and the answer never arrives.
  let lose = true;
  fake.hooks.push(async (req) => {
    if (req.method !== "POST" || !lose) return;
    lose = false;
    fake.hooks.shift();
    await fake.fetch(`${API}${req.path}`, { method: "POST", body: JSON.stringify(req.body) });
    return "network";
  });
  await click(button("Comment", composer()));
  await until(() => composer()?.querySelector('[role="alert"]'), "the connection error");
  assert.equal(fake.comments.length, 1);
  const first = fake.posts()[0].body.key;
  assert.match(first, /^[0-9a-f-]{36}$/);
  assert.equal(fake.posts()[0].body.id, undefined, "the key, never an id");
  assert.notEqual(fake.comments[0].id, first, "the comment's id is the service's");
  await reload(PrivateBlog, fake);
  await until(() => field("Comment on the selected passage"), "the composer, back");
  await click(button("Comment", composer()));
  await until(() => !composer(), "sent");
  assert.equal(fake.posts().at(-1).body.key, first);
  assert.equal(fake.comments.length, 1);
});

test("5: words changed after a failed send get a new key; a 409 about the key shows the service's words and lets it go", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "First made-up words.");
  fake.hooks.push(async (req) => (req.method === "POST" ? "network" : undefined));
  await click(button("Comment", composer()));
  await until(() => composer()?.querySelector('[role="alert"]'), "the error");
  await click(button("Comment", composer()));
  await until(() => fake.posts().length === 2, "a second try");
  const [a, b] = fake.posts().map((p) => p.body.key);
  assert.equal(a, b, "the very same words keep their key");
  await type(field("Comment on the selected passage"), "Changed made-up words.");
  await click(button("Comment", composer()));
  await until(() => fake.posts().length === 3, "a third try");
  const c = fake.posts()[2].body.key;
  assert.notEqual(c, a);
  // The service has that key for something else.
  fake.hooks = [async (req) => (req.method === "POST" && req.body.key === c ? new Response(JSON.stringify({ error: "Made-up: that key is taken.", field: "key" }), { status: 409 }) : undefined)];
  await click(button("Comment", composer()));
  await until(() => composer()?.textContent.includes("Made-up: that key is taken."), "the service's words");
  await click(button("Comment", composer()));
  await until(() => !composer(), "sent");
  const d = fake.posts().at(-1).body.key;
  assert.notEqual(d, c);
  assert.equal(fake.comments.length, 1);
});

// ---- 6. Sign out that failed says so -------------------------------------------------

test("6: a sign-out that failed keeps the reader signed in, says so, and can be tried again", async () => {
  const fake = service();
  fake.failLogout = true;
  await mount(PrivateBlog, fake);
  await signedIn("Ada Reader");
  await click(button("Sign out"));
  await settle(30);
  assert.ok(text().includes("Signed in as Ada Reader"));
  assert.match(text(), /Couldn't sign out/);
  assert.equal(document.querySelector('form[aria-label="Sign in"]'), null);
  fake.failLogout = false;
  await click(button("Sign out"));
  await until(() => document.querySelector('form[aria-label="Sign in"]'), "signed out");
});

// ---- 7. A draft taken away is said to be gone ----------------------------------------

test("7: a draft taken away while open says it is gone, offers the list, stops asking, and keeps the words", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Typed before it went.");
  fake.readers.delete("ada");
  await poll();
  await until(() => /no longer available/i.test(text()), "word that the draft is gone");
  assert.ok(document.querySelector('a[href="/privateblog"]'));
  const asked = fake.requests.filter((r) => r.path === "/api/draft-comments").length;
  await poll();
  await poll();
  assert.equal(fake.requests.filter((r) => r.path === "/api/draft-comments").length, asked);
  assert.equal(Object.values(kept(fake).slots)[0].body, "Typed before it went.");
});

test("7: a first comments request answering 404 does not leave the page loading", async () => {
  const fake = service();
  fake.hooks.push(async (req) => (req.path === "/api/draft-comments" ? new Response(JSON.stringify({ error: "not found" }), { status: 404 }) : undefined));
  await mount(PrivateBlog, fake);
  await until(() => /no longer available/i.test(text()), "word that the draft is gone");
  assert.ok(!/Loading comments/.test(text()));
});

// ---- 8. An emptied field stays empty -------------------------------------------------

test("8: a suggestion emptied to a deletion is still one when reopened, and after a reload", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("harbour wall", "Suggest edit");
  await type(field("What the selected words should say"), "");
  await type(field("A note on your suggestion (optional)"), "Please remove these.");
  await press(field("What the selected words should say"), "Escape");
  await selectAnd("harbour wall", "Suggest edit");
  assert.equal(field("What the selected words should say").value, "");
  assert.equal(field("A note on your suggestion (optional)").value, "Please remove these.");
  await reload(PrivateBlog, fake);
  assert.equal((await until(() => field("What the selected words should say"), "the suggestion")).value, "");
});

test("8: an emptied note or edit stays empty, not the words it had", async () => {
  const fake = service();
  const mine = seed(fake, { body: "A made-up note to drop.", quote: "lighthouse keeper", suggestion: "lamp keeper" });
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  await click(button("Edit", document.querySelector(`[data-card="${mine.id}"]`)));
  await type(field("Edit your note"), "");
  await reload(PrivateBlog, fake);
  assert.equal((await until(() => field("Edit your note"), "the edit, open again")).value, "");
});

// ---- 9. The composer follows the layout ----------------------------------------------

test("9: a composer open in the margin is in the sheet when the screen narrows, and back when it widens", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Typed before turning.");
  await resize(800);
  const sheet = await until(() => document.querySelector("dialog.draft-sheet[open]"), "the sheet");
  assert.equal(field("Comment on the selected passage", sheet)?.value, "Typed before turning.");
  await type(field("Comment on the selected passage", sheet), "Typed before turning, and after.");
  await resize(1300);
  await settle(50);
  assert.equal(field("Comment on the selected passage", composer())?.value, "Typed before turning, and after.");
  assert.equal(pendingPassage(), "fishing boats");
});

test("9: a reply open on a card follows the screen both ways", async () => {
  const fake = service();
  seed(fake);
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  await type(field("Reply"), "A made-up reply.");
  await resize(800);
  const sheet = await until(() => document.querySelector("dialog.draft-sheet[open]"), "the sheet");
  assert.equal(field("Reply", sheet)?.value, "A made-up reply.");
  await resize(1300);
  await settle(50);
  assert.equal(field("Reply")?.value, "A made-up reply.");
});

// ---- 10. A failed load is not "No comments yet" -------------------------------------

test("10: on a phone, comments that could not load are said to have failed, not to be none", async () => {
  const fake = service();
  fake.hooks.push(async (req) => (req.path === "/api/draft-comments" && req.method === "GET" ? new Response(JSON.stringify({ error: "made-up failure" }), { status: 500 }) : undefined));
  await mount(PrivateBlog, fake, { width: 390 });
  const fab = await until(() => document.querySelector(".draft-fab"), "the corner button");
  await settle(30);
  assert.match(fab.getAttribute("aria-label"), /couldn't load/i);
  assert.match(fab.textContent, /retrying/i);
  await click(fab);
  const sheet = await until(() => document.querySelector("dialog.draft-sheet[open]"), "the sheet");
  assert.match(sheet.textContent, /Comments couldn't load\. Retrying\./);
  assert.ok(!/No comments yet/.test(sheet.textContent));
});

// ---- 11. Two small ones --------------------------------------------------------------

test("11: on a phone, the sheet for a suggestion just sent is titled for a suggestion", async () => {
  const fake = service();
  await mount(PrivateBlog, fake, { width: 390 });
  await selectAnd("harbour wall", "Suggest edit");
  await type(field("What the selected words should say"), "harbour steps");
  await click(button("Suggest"));
  const sheet = await until(() => fake.comments.length === 1 && document.querySelector(`dialog.draft-sheet[open] [data-card="${fake.comments[0].id}"]`) && document.querySelector("dialog.draft-sheet"), "the sheet with its card");
  assert.equal(sheet.querySelector("h2").textContent, "Suggested edit");
});

test("11: Suggest disabled because nothing changed says why", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("harbour wall", "Suggest edit");
  assert.equal(button("Suggest").disabled, true);
  assert.match(composer().textContent, /Same words as the passage/);
  await type(field("What the selected words should say"), "harbour  wall ");
  assert.equal(button("Suggest").disabled, true);
  assert.match(composer().textContent, /Same words as the passage/);
  await type(field("What the selected words should say"), "harbour steps");
  assert.ok(!/Same words as the passage/.test(composer().textContent));
});

// ---- round 2: a comment's length -------------------------------------------------------

const FULL = "That's as long as a comment can be: 5,000 characters.";
const FULL_SUGGESTION = "That's as long as a suggestion can be: 5,000 characters.";
const words = (n) => "made up ".repeat(Math.ceil(n / 8)).slice(0, n);

test("P2: a comment, a reply, an edit and a suggestion's note hold 5,000 characters, and a box that is full says so", async () => {
  const fake = service();
  const mine = seed(fake, { body: "An older made-up note." });
  await mount(PrivateBlog, fake);
  // A comment.
  await selectAnd("fishing boats");
  const box = field("Comment on the selected passage");
  assert.equal(box.maxLength, 5000);
  await type(box, words(4999));
  assert.ok(!text().includes(FULL), "not full yet");
  assert.match(text(), /1 characters left|1 character left/);
  await type(box, words(5000));
  assert.ok(composer().textContent.includes(FULL), "full");
  await click(button("Cancel", composer()));
  // A reply and an edit.
  await openThread("lighthouse keeper");
  const card = () => document.querySelector(`[data-card="${mine.id}"]`);
  assert.equal(field("Reply").maxLength, 5000);
  await type(field("Reply"), words(5000));
  assert.equal(card().textContent.split(FULL).length, 2, "the reply says it is full, once");
  await click(button("Edit", card()));
  assert.equal(field("Edit your comment").maxLength, 5000);
  await type(field("Edit your comment"), words(5000));
  assert.equal(card().textContent.split(FULL).length, 3, "and the edit");
  // A suggestion's note; its words say so too.
  await selectAnd("harbour wall", "Suggest edit");
  const note = field("A note on your suggestion (optional)");
  assert.equal(note.maxLength, 5000);
  await type(note, words(5000));
  assert.ok(composer().textContent.includes(FULL));
  assert.ok(!composer().textContent.includes(FULL_SUGGESTION));
  await type(field("What the selected words should say"), words(5000));
  assert.ok(composer().textContent.includes(FULL_SUGGESTION));
  // Sent whole.
  await click(button("Suggest", composer()));
  await until(() => fake.posts().length === 1, "the suggestion sent");
  assert.equal(fake.posts()[0].body.body.length, 5000);
});

// ---- round 2: invisible characters in a suggestion ----------------------------------------

test("P3: a suggestion that differs from the passage only by invisible characters cannot be sent", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("harbour wall", "Suggest edit");
  for (const w of ["harbour​ wall", "har­bour wall", "﻿harbour wall⁠"]) {
    await type(field("What the selected words should say"), w);
    assert.equal(button("Suggest").disabled, true, JSON.stringify(w));
    assert.match(composer().textContent, /Same words as the passage/);
  }
  await press(field("What the selected words should say"), "Enter", { ctrlKey: true });
  assert.equal(fake.posts().length, 0);
  // A joiner is a real difference.
  await type(field("What the selected words should say"), "harbour‍wall");
  assert.equal(button("Suggest").disabled, false);
});

// ---- round 2: signed out on a write --------------------------------------------------------

/** The comments asked for after a write never answer, as on a slow network: only the write's own 401 can say the session ended. */
const stallReads = (fake) => fake.hooks.push((req) => (req.method === "GET" && req.path === "/api/draft-comments" && !fake.signedIn ? new Promise(() => {}) : undefined));

/** The sign-in view, with the note that says the words are kept. */
async function signedOutView() {
  await until(() => document.querySelector('form[aria-label="Sign in"]'), "the sign-in form");
  assert.match(text(), /You've been signed out\. Anything you hadn't sent is kept in this browser for when you sign in again\./);
}

/** Ada signs in again from the sign-in form. */
async function signInAgain(fake) {
  fake.hooks.push(async (req) => (req.query.a === "login" ? new Response(JSON.stringify({ viewer: fake.signedIn }), { status: 200 }) : undefined));
  fake.signedIn = { name: "Ada Reader", username: "ada", owner: false };
  await type(document.querySelector("#private-username"), "ada");
  await type(document.querySelector("#private-password"), "made-up");
  await act(() => document.querySelector('form[aria-label="Sign in"]').requestSubmit());
  await signedIn("Ada Reader");
}

test("P4: a 401 on a new comment signs the page out with its note, and the words are back on signing in", async () => {
  const fake = service();
  stallReads(fake);
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Sent as the session ended.");
  fake.signedIn = null;
  await press(field("Comment on the selected passage"), "Enter", { ctrlKey: true });
  await signedOutView();
  assert.equal(fake.posts().length, 1);
  assert.equal(fake.comments.length, 0);
  await signInAgain(fake);
  const box = await until(() => field("Comment on the selected passage"), "the composer, back");
  assert.equal(box.value, "Sent as the session ended.");
  await until(() => pendingPassage() === "fishing boats", "on its passage");
});

test("P4: a 401 on a reply signs the page out, and the reply is back on signing in", async () => {
  const fake = service();
  seed(fake);
  stallReads(fake);
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  await type(field("Reply"), "A made-up reply sent too late.");
  fake.signedIn = null;
  await press(field("Reply"), "Enter", { ctrlKey: true });
  await signedOutView();
  await signInAgain(fake);
  const box = await until(() => field("Reply"), "the reply box, back");
  assert.equal(box.value, "A made-up reply sent too late.");
  assert.equal(fake.comments.length, 1);
});

test("P4: a 401 on an edit signs the page out, and the edit is back on signing in", async () => {
  const fake = service();
  const mine = seed(fake, { body: "An older made-up note." });
  stallReads(fake);
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  await click(button("Edit", document.querySelector(`[data-card="${mine.id}"]`)));
  await type(field("Edit your comment"), "A newer made-up note.");
  fake.signedIn = null;
  await press(field("Edit your comment"), "Enter", { ctrlKey: true });
  await signedOutView();
  assert.equal(mine.body, "An older made-up note.");
  await signInAgain(fake);
  const box = await until(() => field("Edit your comment"), "the edit, back");
  assert.equal(box.value, "A newer made-up note.");
});

test("P4: a 401 on a delete signs the page out, deletes nothing, and the words being typed are back on signing in", async () => {
  const fake = service();
  const mine = seed(fake);
  stallReads(fake);
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Typed before the delete.");
  await openThread("lighthouse keeper");
  fake.signedIn = null;
  const confirm = window.confirm;
  window.confirm = () => true;
  try {
    await click(button("Delete", document.querySelector(`[data-card="${mine.id}"]`)));
  } finally {
    window.confirm = confirm;
  }
  await signedOutView();
  assert.ok(fake.requests.some((r) => r.method === "DELETE"));
  assert.equal(fake.comments.length, 1);
  await signInAgain(fake);
  const box = await until(() => field("Comment on the selected passage"), "the composer, back");
  assert.equal(box.value, "Typed before the delete.");
});

// ---- round 3: R1. Ali's editor keeps its latest typing when it is taken down -----------

const editorText = () => document.querySelector('[aria-label="Draft text"]');
const editorCopy = () => localStorage.getItem("draft-editor:made-up");

/** Ali's page with the editor open on the made-up draft. */
async function openEditor(fake) {
  await mount(PrivateBlog, fake);
  await click(await until(() => button("Edit"), "Edit"));
  return until(() => editorText()?.editor && editorText(), "the editor", 8000);
}
const typeInEditor = (dom, words) =>
  act(() => {
    dom.editor.commands.focus("end");
    dom.editor.commands.insertContent(words);
  });

test("R1: the editor taken down by another account signing in keeps the latest words in this browser", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  await typeInEditor(dom, " Made-up last words.");
  // Another account signs in, and the check on focus hears it before the
  // editor's own copy is due.
  fake.signedIn = READERS.ada;
  await act(() => window.dispatchEvent(new window.Event("focus")));
  await signedIn("Ada Reader");
  assert.equal(editorText(), null);
  assert.match(editorCopy() ?? "", /Made-up last words\./);
});

test("R1: Done after a save leaves no copy behind", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  await typeInEditor(dom, " Saved, made up.");
  await click(button("Done"));
  await until(() => !editorText(), "the editor closed");
  await settle(400);
  assert.match(fake.draft.body, /Saved, made up\./);
  assert.equal(editorCopy(), null);
});

test("R1: changes discarded for the latest leave no copy behind once the editor closes", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  await typeInEditor(dom, " Discarded, made up.");
  // Saved somewhere else meanwhile.
  fake.draft = { ...fake.draft, body: "Made-up text saved elsewhere.", updated_at: "2026-01-02T00:00:00.000Z" };
  const confirm = window.confirm;
  try {
    window.confirm = () => false; // stay in the editor when Done finds the conflict
    await click(button("Done"));
    await until(() => button("Load the latest"), "the conflict");
    window.confirm = () => true;
    await click(button("Load the latest"));
    await until(() => !button("Load the latest"), "the latest loaded");
    await typeInEditor(dom, "");
    await click(button("Done"));
  } finally {
    window.confirm = confirm;
  }
  await until(() => !editorText(), "the editor closed");
  await settle(400);
  assert.equal(editorCopy(), null);
});

// ---- R2. A send in flight stays in flight across the layout and the sheet ---------------

/** Each kind of box: how to open it with words, its field and its send button. */
const KINDS = {
  comment: {
    open: async () => {
      await selectAnd("fishing boats");
      await type(field("Comment on the selected passage"), "A made-up comment in flight.");
    },
    field: () => field("Comment on the selected passage"),
    send: () => button(/^(Comment|Sending…)$/, composer()),
    write: "POST",
  },
  suggestion: {
    open: async () => {
      await selectAnd("harbour wall", "Suggest edit");
      await type(field("What the selected words should say"), "harbour steps");
    },
    field: () => field("What the selected words should say"),
    send: () => button(/^(Suggest|Sending…)$/, composer()),
    write: "POST",
  },
  reply: {
    open: async (fake, wide) => {
      await openMine(fake, wide);
      await type(field("Reply"), "A made-up reply in flight.");
    },
    field: () => field("Reply"),
    send: () => button(/^(Reply|Sending…)$/, field("Reply")?.closest("form") ?? document.createElement("form")),
    write: "POST",
  },
  edit: {
    open: async (fake, wide) => {
      const card = await openMine(fake, wide);
      await click(button("Edit", card));
      await type(field("Edit your comment"), "A made-up edit in flight.");
    },
    field: () => field("Edit your comment"),
    send: () => button(/^(Save|Sending…)$/, field("Edit your comment")?.closest("form") ?? document.createElement("form")),
    write: "PATCH",
  },
};

/** The seeded thread opened: in the margin, or in the sheet on a phone. */
async function openMine(fake, wide) {
  const id = fake.comments[0].id;
  if (wide) await openThread("lighthouse keeper");
  else await click(await until(() => [...document.querySelectorAll("[data-threads]")].find((m) => m.textContent.includes("lighthouse keeper")), "the highlight"));
  return until(() => document.querySelector(`[data-card="${id}"]`), "its card");
}

const writes = (fake, method) => fake.requests.filter((r) => r.method === method && r.path === "/api/draft-comments").length;

async function inFlight(kind, k, what) {
  assert.equal(k.field()?.readOnly, true, `${kind}: read-only ${what}`);
  assert.equal(k.send()?.disabled, true, `${kind}: send disabled ${what}`);
}

for (const [kind, k] of Object.entries(KINDS)) {
  test(`R2: a ${kind} sending stays sending across the 1240 px width both ways, sent once, and nothing typed since is lost`, async () => {
    for (const [from, to] of [[1300, 390], [390, 1300]]) {
      localStorage.clear();
      const fake = service();
      seed(fake, { body: "An original made-up note." });
      await mount(PrivateBlog, fake, { width: from });
      await k.open(fake, from === 1300);
      const release = hold(fake, (r) => r.method === k.write);
      await click(k.send());
      await until(() => writes(fake, k.write) === 1, "the send");
      await inFlight(kind, k, `before the resize from ${from}`);
      await resize(to);
      await until(() => k.field(), `the ${kind} box after the resize to ${to}`);
      await inFlight(kind, k, `after the resize to ${to}`);
      await click(k.send());
      await resize(from);
      await until(() => k.field(), `the ${kind} box back at ${from}`);
      await inFlight(kind, k, `back at ${from}`);
      await press(k.field(), "Enter", { ctrlKey: true });
      release();
      await until(() => !k.field() || k.field().value === "", `the ${kind} sent`);
      await settle(500);
      assert.equal(writes(fake, k.write), 1, `${kind}: sent once`);
      assert.equal(kept(fake), undefined, `${kind}: nothing left kept`);
      await unmount();
    }
  });

  test(`R2: closing the phone sheet while a ${kind} is sending does not discard it`, async () => {
    const fake = service();
    seed(fake, { body: "An original made-up note." });
    await mount(PrivateBlog, fake, { width: 390 });
    await k.open(fake, false);
    const release = hold(fake, (r) => r.method === k.write);
    await click(k.send());
    await until(() => writes(fake, k.write) === 1, "the send");
    await click(document.querySelector(".draft-sheet-close"));
    if (!document.querySelector("dialog.draft-sheet[open]")) {
      // A thread's sheet closes; its box is still sending when it is opened again.
      await openMine(fake, false);
    }
    await until(() => k.field(), `the ${kind} box`);
    await inFlight(kind, k, "after Close");
    release();
    await until(() => !k.field() || k.field().value === "", `the ${kind} sent`);
    await settle(500);
    assert.equal(writes(fake, k.write), 1, `${kind}: sent once`);
    assert.equal(kept(fake), undefined, `${kind}: nothing left kept`);
    if (k.write === "POST") assert.equal(fake.comments.length, 2, `${kind}: stored once`);
    else assert.equal(fake.comments[0].body, "A made-up edit in flight.");
  });
}

// ---- R3. One message, one key, in every tab ----------------------------------------------

test("R3: emptied and typed again after a lost answer, the same words go with the same key: one comment", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Identical made-up words.");
  // The service stores it, and the answer never arrives.
  let lose = true;
  fake.hooks.push(async (req) => {
    if (req.method !== "POST" || !lose) return;
    lose = false;
    fake.hooks.shift();
    await fake.fetch(`${API}${req.path}`, { method: "POST", body: JSON.stringify(req.body) });
    return "network";
  });
  await click(button("Comment", composer()));
  await until(() => composer()?.querySelector('[role="alert"]'), "the connection error");
  await type(field("Comment on the selected passage"), "");
  await type(field("Comment on the selected passage"), "Identical made-up words.");
  await click(button("Comment", composer()));
  await until(() => !composer(), "sent");
  const keys = fake.posts().map((p) => p.body.key);
  assert.match(keys[0], /^[0-9a-f-]{36}$/);
  assert.equal(new Set(keys).size, 1, "one key");
  assert.equal(fake.comments.length, 1, "one comment");
  assert.ok(document.querySelector(`[data-card="${fake.comments[0].id}"]`), "its card, by the service's id");
});

// ---- R4. Words kept for something that is gone are shown, not hidden ---------------------

const orphan = () => document.querySelector(".draft-orphan");

test("R4: a reply kept for a thread deleted elsewhere is shown once with a Discard, and never put on another thread", async () => {
  const fake = service();
  const gone = seed(fake);
  seed(fake, { quote: "fishing boats", body: "Another made-up thought." });
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  await type(field("Reply"), "A stranded made-up reply.");
  await unmount();
  fake.comments = fake.comments.filter((c) => c.id !== gone.id);
  await mount(PrivateBlog, fake);
  const note = await until(orphan, "the notice");
  assert.equal(note.querySelector("p").textContent, "A reply you hadn't sent was for a comment that has been deleted.");
  assert.equal(note.querySelector(".draft-orphan-words").textContent, "A stranded made-up reply.");
  assert.equal(text().split("A stranded made-up reply.").length, 2, "shown once");
  assert.equal(field("Reply"), null);
  await openThread("fishing boats");
  assert.equal(field("Reply").value, "", "not on another thread");
  await click(button("Discard", orphan()));
  assert.equal(orphan(), null);
  await settle(500);
  assert.equal(kept(fake), undefined);
});

test("R4: an edit kept for a comment deleted elsewhere is shown in the phone's sheet", async () => {
  const fake = service();
  const mine = seed(fake, { body: "An original made-up note." });
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  await click(button("Edit", document.querySelector(`[data-card="${mine.id}"]`)));
  await type(field("Edit your comment"), "A stranded made-up edit.");
  await unmount();
  fake.comments = [];
  await mount(PrivateBlog, fake, { width: 390 });
  const sheet = await until(() => document.querySelector("dialog.draft-sheet[open]"), "the sheet");
  const note = await until(() => sheet.querySelector(".draft-orphan"), "the notice in the sheet");
  assert.equal(note.querySelector("p").textContent, "An edit you hadn't saved was for a comment that has been deleted.");
  assert.equal(note.querySelector(".draft-orphan-words").textContent, "A stranded made-up edit.");
  await click(button("Discard", note));
  assert.equal(sheet.querySelector(".draft-orphan"), null);
});

test("R4: a thread deleted while a reply is being typed in it shows the reply in the margin", async () => {
  const fake = service();
  seed(fake);
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  await type(field("Reply"), "Typed as it went, made up.");
  fake.comments = [];
  await poll();
  const note = await until(orphan, "the notice");
  assert.ok(note.closest(".draft-margin"), "in the margin");
  assert.equal(note.querySelector(".draft-orphan-words").textContent, "Typed as it went, made up.");
});

// ---- R5. Bringing a reply back waits for the comments ------------------------------------

test("R5: a reply comes back once the comments load, even when the first request for them failed", async () => {
  const fake = service();
  const c = seed(fake);
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  await type(field("Reply"), "Back after the outage, made up.");
  await unmount();
  let fail = true;
  fake.hooks.push(async (r) => (r.path === "/api/draft-comments" && r.method === "GET" && fail ? new Response(JSON.stringify({ error: "made-up outage" }), { status: 500 }) : undefined));
  await mount(PrivateBlog, fake);
  await settle(100);
  fail = false;
  await poll();
  await until(() => document.querySelector(`[data-card="${c.id}"]`), "the card");
  const box = await until(() => field("Reply"), "the reply, back");
  assert.equal(box.value, "Back after the outage, made up.");
});

// ---- R7. Only a clear answer changes who the page shows ---------------------------------

test("R7: a check on focus that fails, times out or answers unclearly changes nothing", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Kept through a bad answer.");
  // Someone else really is signed in now; the page never hears so clearly.
  fake.signedIn = READERS.bo;
  const answers = {
    "no connection": () => "network",
    "a timeout": () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    },
    "a 500": () => new Response(JSON.stringify({ error: "made-up failure" }), { status: 500 }),
    "a 401": () => new Response(JSON.stringify({ error: "made-up" }), { status: 401 }),
    "a 404": () => new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
    "a 204": () => new Response(null, { status: 204 }),
    "a 200 naming no one": () => new Response(JSON.stringify({}), { status: 200 }),
  };
  for (const [what, answer] of Object.entries(answers)) {
    fake.hooks = [async (req) => (req.path === "/api/reader" ? answer() : undefined)];
    await act(() => window.dispatchEvent(new window.Event("focus")));
    await settle(30);
    assert.ok(text().includes("Signed in as Ada Reader"), `${what}: still Ada`);
    assert.equal(field("Comment on the selected passage")?.value, "Kept through a bad answer.", `${what}: the box as it was`);
    assert.ok(!/signed out|now signed in as/i.test(text()), `${what}: no note`);
  }
  // A clear answer naming someone else does change it.
  fake.hooks = [];
  await act(() => window.dispatchEvent(new window.Event("focus")));
  await signedIn("Bo Reader");
});

/** Runs `fn` inside React's act(). */
async function act(fn) {
  const { act: reactAct } = await import("react");
  await reactAct(async () => {
    fn();
  });
  await settle();
}

// ---- round 4: T1. A drag that starts on a highlighted word selects text ------------------

/** The highlight on `quote`, the link a reader tabs to. */
const highlight = (quote) => until(() => [...document.querySelectorAll("a[data-threads]")].find((m) => m.textContent.includes(quote)), `the highlight on "${quote}"`);
const isOpen = (id) => document.querySelector(`[data-card="${id}"]`)?.classList.contains("is-active");

test("T1: a highlight cannot be dragged as a link, so a drag on it selects words", async () => {
  const fake = service();
  seed(fake);
  await mount(PrivateBlog, fake);
  const mark = await highlight("lighthouse keeper");
  assert.equal(mark.getAttribute("draggable"), "false");
  // Pressed with the mouse it is not a link (a browser starts no selection on one), and is again at once.
  const href = mark.getAttribute("href");
  mark.firstChild.dispatchEvent(new window.PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0 }));
  assert.equal(mark.hasAttribute("href"), false);
  await settle(10);
  assert.equal(mark.getAttribute("href"), href);
  // A finger is left as it is.
  mark.firstChild.dispatchEvent(new window.PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", button: 0 }));
  assert.equal(mark.getAttribute("href"), href);
});

test("T1: the click that ends a drag-selection on a highlight does not open its card; a plain click and Enter do", async () => {
  const fake = service();
  const c = seed(fake);
  await mount(PrivateBlog, fake);
  const mark = await highlight("lighthouse keeper");
  // The mouse went down on "lighthouse" and up on "keeper": words are selected.
  const range = document.createRange();
  range.setStart(mark.firstChild.firstChild, 0);
  range.setEnd(mark.firstChild.firstChild, "lighthouse".length);
  let ended;
  await act(() => {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ended = new window.MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
    mark.dispatchEvent(ended);
  });
  assert.ok(!isOpen(c.id), "the card stays closed");
  assert.equal(ended.defaultPrevented, true, "the link is not followed");
  assert.equal(window.getSelection().toString(), "lighthouse", "the words stay selected");
  // A plain click, nothing selected.
  await act(() => {
    window.getSelection().removeAllRanges();
    mark.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
  });
  await until(() => isOpen(c.id), "the card open on a click");
  await press(mark.ownerDocument.body, "Escape");
  await until(() => !isOpen(c.id), "the card closed");
  // Enter on the link (a click with no mouse), even with words selected elsewhere.
  await act(() => {
    window.getSelection().addRange(range);
    mark.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 }));
  });
  await until(() => isOpen(c.id), "the card open on Enter");
});

// ---- T3. Resolve and Sign out show they are working ---------------------------------------

test("T3: Resolve is disabled and says it is resolving while its request is out, and a second press sends nothing", async () => {
  const fake = service();
  seed(fake);
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  const release = hold(fake, (r) => r.method === "PATCH");
  const resolve = document.querySelector('button[aria-label="Resolve this thread"]');
  // Two presses before the page has drawn again, then one more after.
  await act(() => {
    resolve.click();
    resolve.click();
  });
  const busy = await until(() => button("Resolving…"), "the busy Resolve");
  assert.equal(busy.disabled, true);
  await click(busy);
  assert.equal(writes(fake, "PATCH"), 1);
  release();
  await until(() => !button("Resolving…"), "the resolve done");
  assert.equal(writes(fake, "PATCH"), 1);
});

test("T3: Reopen is disabled and says it is reopening while its request is out", async () => {
  const fake = service();
  const c = seed(fake);
  c.resolved = { by: "Ali", at: "2026-01-01T00:00:06.000Z" };
  await mount(PrivateBlog, fake);
  const show = await until(() => [...document.querySelectorAll('input[type="checkbox"]')].find((i) => i.closest("label")?.textContent.includes("Show resolved")), "Show resolved");
  await click(show);
  const reopen = await until(() => button("Reopen"), "Reopen");
  const release = hold(fake, (r) => r.method === "PATCH");
  await act(() => {
    reopen.click();
    reopen.click();
  });
  const busy = await until(() => button("Reopening…"), "the busy Reopen");
  assert.equal(busy.disabled, true);
  await click(busy);
  assert.equal(writes(fake, "PATCH"), 1);
  release();
  await until(() => !button("Reopening…"), "the reopen done");
  assert.equal(writes(fake, "PATCH"), 1);
});

test("T3: Sign out is disabled and says it is signing out while its request is out, and a second press sends nothing", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await signedIn("Ada Reader");
  const release = hold(fake, (r) => r.query.a === "logout");
  const out = button("Sign out");
  await act(() => {
    out.click();
    out.click();
  });
  const busy = await until(() => button("Signing out…"), "the busy Sign out");
  assert.equal(busy.disabled, true);
  await click(busy);
  const logouts = () => fake.requests.filter((r) => r.query.a === "logout").length;
  assert.equal(logouts(), 1);
  release();
  await until(() => document.querySelector('form[aria-label="Sign in"]'), "signed out");
  assert.equal(logouts(), 1);
});

// ---- T4. The group of cards that cannot be placed says something true --------------------

test("T4: a passage whose words appear twice is listed with words that do not say it was edited", async () => {
  const fake = service();
  fake.draft.body = `${BODY}\n\nThe tide was out.\n\nThe tide was out.`;
  const c = seed(fake, { quote: "The tide was out." });
  await mount(PrivateBlog, fake);
  const card = await until(() => document.querySelector(`.draft-after-title ~ .draft-list [data-card="${c.id}"]`), "the card under the text that changed");
  assert.ok(card);
  const said = document.querySelector(".draft-after-title + .draft-empty").textContent;
  assert.equal(said, "These passages were edited after the comment, or their words appear in more than one place, so they aren't highlighted.");
});

// ---- T5. Escape gives focus back to the highlight ----------------------------------------

test("T5: a card opened from its highlight by the keyboard and closed with Escape gives focus back to the highlight", async () => {
  const fake = service();
  const c = seed(fake);
  await mount(PrivateBlog, fake);
  const mark = await highlight("lighthouse keeper");
  await act(() => {
    mark.focus();
    mark.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 }));
  });
  await until(() => isOpen(c.id), "the card open");
  // Tabbed into the card, out of the reply box, then Escape.
  const inCard = document.querySelector('button[aria-label="Resolve this thread"]');
  await act(() => inCard.focus());
  await press(inCard, "Escape");
  await until(() => !isOpen(c.id), "the card closed");
  const back = document.activeElement;
  assert.ok(back === document.getElementById(`quote-${c.id}`), `focus on the highlight, not on ${back?.tagName} ${back?.getAttribute?.("aria-label") ?? ""}`);
});

test("T5: so does Enter as Firefox sends it, a click with a detail of 1 after the key", async () => {
  const fake = service();
  const c = seed(fake);
  await mount(PrivateBlog, fake);
  const mark = await highlight("lighthouse keeper");
  await act(() => {
    mark.focus();
    mark.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    mark.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
  });
  await until(() => isOpen(c.id), "the card open");
  const inCard = document.querySelector('button[aria-label="Resolve this thread"]');
  await act(() => inCard.focus());
  await press(inCard, "Escape");
  await until(() => !isOpen(c.id), "the card closed");
  assert.ok(document.activeElement === document.getElementById(`quote-${c.id}`), "focus on the highlight");
});

// ---- T6. The editor's save after it is gone, and a check that got no answer --------------

test("T6a: a save still out when the editor is taken down finishes without an error and writes nothing from it", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  // The service stores the save at once; its answer comes only on release().
  let release;
  const gate = new Promise((r) => (release = r));
  let first = true;
  fake.hooks.push(async (req) => {
    if (!first || req.method !== "PUT" || req.path !== "/api/drafts") return;
    first = false;
    const answer = await fake.fetch(`${API}${req.path}`, { method: "PUT", body: JSON.stringify(req.body) });
    await gate;
    return answer;
  });
  await typeInEditor(dom, " Made-up words saved late.");
  await until(() => fake.requests.some((r) => r.method === "PUT" && r.path === "/api/drafts"), "the save out", 4000);
  const errors = [];
  const heard = (err) => errors.push(err);
  process.on("unhandledRejection", heard);
  try {
    fake.signedIn = READERS.ada;
    await act(() => window.dispatchEvent(new window.Event("focus")));
    await signedIn("Ada Reader");
    const copy = editorCopy();
    assert.match(copy ?? "", /Made-up words saved late\./);
    release();
    await settle(200);
    assert.deepEqual(errors.map(String), []);
    assert.equal(editorCopy(), copy, "nothing written after the editor was gone");
    assert.match(fake.draft.body, /Made-up words saved late\./);
    // The save carried everything the copy had: it goes when Ali opens the draft again.
    await nowSignedIn(fake, "owner");
    await until(() => button("Edit"), "the draft");
    await settle(100);
    assert.equal(offered(), false);
    assert.equal(editorCopy(), null, "nothing left to offer");
  } finally {
    process.off("unhandledRejection", heard);
  }
});

test("T6b: after a comments 404, an identity check that gets no answer leaves the page as it is, and the comments are asked again", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "Kept through the outage.");
  // One comments request answers 404, and the identity check after it gets nothing back.
  let outage = true;
  fake.hooks.push(async (req) => {
    if (!outage) return;
    if (req.path === "/api/reader") return "network";
    if (req.path === "/api/draft-comments" && req.method === "GET") return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  });
  await poll();
  await until(() => fake.requests.some((r) => r.path === "/api/reader" && r.query.a !== "logout"), "the identity check");
  await settle(50);
  assert.ok(!document.querySelector('form[aria-label="Sign in"]'), "not signed out");
  assert.ok(!/no longer available|signed out/i.test(text()), "no note");
  assert.ok(text().includes("Signed in as Ada Reader"));
  assert.equal(field("Comment on the selected passage")?.value, "Kept through the outage.");
  // The outage over, the comments are asked for again and come.
  outage = false;
  const asked = fake.requests.filter((r) => r.path === "/api/draft-comments").length;
  await poll();
  await until(() => fake.requests.filter((r) => r.path === "/api/draft-comments").length > asked, "the comments asked again");
  seed(fake, { quote: "harbour wall", body: "A made-up note after the outage." });
  await poll();
  await until(() => text().includes("A made-up note after the outage."), "the comments, fresh");
});

// ---- round 5: M1. Words typed after a save began are never lost ---------------------------

const offered = () => text().includes("weren't saved");
const copyOf = () => JSON.parse(editorCopy() ?? "null");
const savesOut = (fake) => fake.requests.filter((r) => r.method === "PUT" && r.path === "/api/drafts").length;
/** Who is signed in changes, and the check on focus hears it. */
async function nowSignedIn(fake, who) {
  fake.signedIn = READERS[who];
  await act(() => window.dispatchEvent(new window.Event("focus")));
  await signedIn(READERS[who].name);
}
/** Errors that reach the page unheld, until stop(). */
function heardErrors() {
  const errors = [];
  const heard = (err) => errors.push(String(err));
  process.on("unhandledRejection", heard);
  process.on("uncaughtException", heard);
  return { errors, stop: () => (process.off("unhandledRejection", heard), process.off("uncaughtException", heard)) };
}
/**
 * Ali's saves of the draft held until release(), then answered by the
 * service, whose clock is now, as a real service's is: the save is later
 * than anything the page did meanwhile. `fail` answers them with a 500.
 */
function holdSaves(fake, { fail = false } = {}) {
  let release;
  const gate = new Promise((r) => (release = r));
  let inner = false;
  fake.hooks.push(async (req) => {
    if (inner || req.method !== "PUT" || req.path !== "/api/drafts") return;
    // The session it went with, whoever signs in meanwhile.
    const by = fake.signedIn;
    await gate;
    if (fail) return new Response(JSON.stringify({ error: "A made-up failure." }), { status: 500 });
    fake.clock = Math.ceil((Date.now() - Date.UTC(2026, 0, 1)) / 1000) + 1;
    const now = fake.signedIn;
    inner = true;
    fake.signedIn = by;
    try {
      return await fake.fetch(`${API}${req.path}`, { method: "PUT", body: JSON.stringify(req.body) });
    } finally {
      inner = false;
      fake.signedIn = now;
    }
  });
  return () => release();
}

test("M1: words typed after a save began, the editor taken down before it answered, are offered when Ali opens the draft again", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const release = holdSaves(fake);
  await typeInEditor(dom, " Saved while switching, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Typed after the save began, made up.");
  const { errors, stop } = heardErrors();
  try {
    await nowSignedIn(fake, "ada");
    assert.equal(Boolean(editorText()), false);
    release();
    await settle(200);
    assert.match(fake.draft.body, /Saved while switching, made up\./);
    assert.doesNotMatch(fake.draft.body, /Typed after the save began/);
    assert.equal(copyOf()?.sent, markOf(fake.draft), "the copy carries the mark of the save that went in");
    await nowSignedIn(fake, "owner");
    await until(offered, "the offer of the later words");
    assert.match(copyOf()?.body ?? "", /Saved while switching, made up\. Typed after the save began, made up\./);
    await click(button("Restore them"));
    const back = await until(() => editorText()?.editor && editorText(), "the editor, restored", 8000);
    assert.match(back.textContent, /Typed after the save began, made up\./);
    assert.deepEqual(errors, []);
  } finally {
    stop();
  }
});

test("M1: a late save that carried everything leaves no copy and no offer", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const release = holdSaves(fake);
  await typeInEditor(dom, " All of it saved late, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await nowSignedIn(fake, "ada");
  release();
  await settle(200);
  assert.match(fake.draft.body, /All of it saved late, made up\./);
  await nowSignedIn(fake, "owner");
  await until(() => button("Edit"), "the draft");
  await settle(100);
  assert.equal(offered(), false);
  assert.equal(editorCopy(), null);
});

test("M1: a copy discarded before the late save answers stays discarded", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const release = holdSaves(fake);
  await typeInEditor(dom, " Saved, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Then discarded, made up.");
  await nowSignedIn(fake, "ada");
  await nowSignedIn(fake, "owner");
  await until(offered, "the offer");
  const confirm = window.confirm;
  try {
    window.confirm = () => true;
    await click(button("Discard"));
  } finally {
    window.confirm = confirm;
  }
  assert.equal(editorCopy(), null);
  release();
  await settle(200);
  assert.equal(editorCopy(), null, "not written again");
  await reload(PrivateBlog, fake);
  await until(() => button("Edit"), "the draft");
  await settle(100);
  assert.equal(offered(), false);
});

test("M1: after Load the latest, the editor taken down leaves no copy and no offer", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  await typeInEditor(dom, " Lost to the latest, made up.");
  fake.draft = { ...fake.draft, body: "Made-up text saved elsewhere.", updated_at: "2026-01-02T00:00:00.000Z" };
  const confirm = window.confirm;
  try {
    window.confirm = () => false;
    await click(button("Done"));
    await until(() => button("Load the latest"), "the conflict");
    window.confirm = () => true;
    await click(button("Load the latest"));
    await until(() => !button("Load the latest"), "the latest loaded");
  } finally {
    window.confirm = confirm;
  }
  await nowSignedIn(fake, "ada");
  await settle(200);
  assert.equal(editorCopy(), null);
  await nowSignedIn(fake, "owner");
  await until(() => button("Edit"), "the draft");
  await settle(100);
  assert.equal(offered(), false);
});

test("M1: a late save that fails leaves the copy as the editor's teardown wrote it", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const release = holdSaves(fake, { fail: true });
  await typeInEditor(dom, " Not saved, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Nor this, made up.");
  await nowSignedIn(fake, "ada");
  const copy = editorCopy();
  assert.match(copy ?? "", /Nor this, made up\./);
  release();
  await settle(200);
  assert.equal(editorCopy(), copy);
});

test("M1: Done pressed while a save is out, the editor taken down, asks nothing and loses nothing", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const release = holdSaves(fake);
  await typeInEditor(dom, " Before Done, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " After the save began, made up.");
  const asked = [];
  const confirm = window.confirm;
  const { errors, stop } = heardErrors();
  try {
    window.confirm = (q) => (asked.push(q), true);
    await click(button("Done"));
    await nowSignedIn(fake, "ada");
    release();
    await settle(300);
    assert.deepEqual(asked, [], "nothing asked of an editor that is gone");
    assert.deepEqual(errors, []);
    await nowSignedIn(fake, "owner");
    await until(offered, "the offer of the later words");
    assert.match(copyOf()?.body ?? "", /After the save began, made up\./);
  } finally {
    window.confirm = confirm;
    stop();
  }
});

test("M1: Done's last send of the passages' places, answered after the editor was taken down, throws nothing", async () => {
  const fake = service({ who: "owner" });
  seed(fake, { quote: "evening fog" });
  const dom = await openEditor(fake);
  // The first send of the places fails; Done sends them again, and that one is held.
  let anchors = 0;
  let release;
  const gate = new Promise((r) => (release = r));
  fake.hooks.push(async (req) => {
    if (req.query.a !== "anchors") return;
    if (++anchors === 1) return new Response(JSON.stringify({ error: "A made-up failure." }), { status: 500 });
    await gate;
  });
  await typeInEditor(dom, " Placed again, made up.");
  const asked = [];
  const confirm = window.confirm;
  const { errors, stop } = heardErrors();
  try {
    window.confirm = (q) => (asked.push(q), true);
    await click(button("Done"));
    await until(() => anchors === 2, "Done's send of the places", 4000);
    await nowSignedIn(fake, "ada");
    release();
    await settle(300);
    assert.deepEqual(errors, []);
    assert.deepEqual(asked, []);
    assert.match(fake.draft.body, /Placed again, made up\./);
  } finally {
    window.confirm = confirm;
    stop();
  }
});

test("M1: a version restored from the history, its save answered after the editor was taken down, throws nothing", async () => {
  const fake = service({ who: "owner" });
  const older = { id: "r-made-up", at: "2026-01-01T00:00:00.500Z", kind: "manual", words: 4, title: "A made-up draft", date: "2026-01-01", summary: "Made up.", body: "An older made-up text." };
  fake.hooks.push(async (req) => {
    if (req.method !== "GET" || req.path !== "/api/drafts") return;
    if (req.query.history) return new Response(JSON.stringify({ revisions: [older] }), { status: 200 });
    if (req.query.revision) return new Response(JSON.stringify({ revision: older }), { status: 200 });
  });
  await openEditor(fake);
  await click(await until(() => document.querySelector('button[aria-label="Version history"]'), "History"));
  const row = await until(() => [...document.querySelectorAll(".history-row")].find((b) => !b.textContent.includes("Current version")), "the older version", 8000);
  await click(row);
  await click(await until(() => button("Restore this version"), "Restore this version"));
  await until(() => button("Restore"), "the question");
  const release = holdSaves(fake);
  const { errors, stop } = heardErrors();
  try {
    await click(button("Restore"));
    await until(() => savesOut(fake), "the restore's save", 4000);
    await nowSignedIn(fake, "ada");
    release();
    await settle(300);
    assert.deepEqual(errors, []);
    assert.equal(fake.draft.body.trim(), "An older made-up text.");
    await nowSignedIn(fake, "owner");
    await until(() => button("Edit"), "the draft");
    await settle(100);
    assert.equal(offered(), false, "the restore is saved: nothing to offer");
    assert.equal(editorCopy(), null);
  } finally {
    stop();
  }
});

// ---- round 6: a save that lands after the page went away ---------------------------------

/**
 * Ali's next save of the draft held in two steps: land() stores it in the
 * service, with the service's clock at now; answer() then gives the page the
 * service's answer. A save never answered is one whose page went away first.
 * `fail` answers it with a 500 and stores nothing.
 */
function holdSaveApart(fake, { fail = false } = {}) {
  let land, answer;
  const landed = new Promise((r) => (land = r));
  const answered = new Promise((r) => (answer = r));
  let taken = false;
  let inner = false;
  fake.hooks.push(async (req) => {
    if (taken || inner || req.method !== "PUT" || req.path !== "/api/drafts") return;
    taken = true;
    const by = fake.signedIn;
    await landed;
    let res;
    if (fail) res = new Response(JSON.stringify({ error: "A made-up failure." }), { status: 500 });
    else {
      fake.clock = Math.ceil((Date.now() - Date.UTC(2026, 0, 1)) / 1000) + 1;
      const now = fake.signedIn;
      inner = true;
      fake.signedIn = by;
      try {
        res = await fake.fetch(`${API}${req.path}`, { method: "PUT", body: JSON.stringify(req.body) });
      } finally {
        inner = false;
        fake.signedIn = now;
      }
    }
    await answered;
    return res;
  });
  return { land: () => land(), answer: () => answer() };
}
const sentSaves = (fake) => fake.requests.filter((r) => r.method === "PUT" && r.path === "/api/drafts");
/** Restores the offered words and answers the editor's text. */
async function restoreOffer() {
  await click(button("Restore them"));
  return (await until(() => editorText()?.editor && editorText(), "the editor, restored", 8000)).textContent;
}
/** Ali opens the draft again, the page as a reload leaves it. */
async function reopened(fake) {
  await reload(PrivateBlog, fake);
  await until(() => button("Edit"), "the draft");
  await settle(100);
}

test("R6: the copy carries a mark of what each save sends, written as it is sent", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const save = holdSaveApart(fake);
  await typeInEditor(dom, " Marked as sent, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  const sent = sentSaves(fake)[0].body;
  const copy = copyOf();
  assert.equal(copy?.body, sent.body, "the copy is the text as it was sent");
  assert.equal(copy?.sent, markOf(sent));
  // Typing on keeps the mark.
  await typeInEditor(dom, " Typed on, made up.");
  await until(() => /Typed on/.test(copyOf()?.body ?? ""), "the copy with the later words");
  assert.equal(copyOf().sent, markOf(sent));
  // Answered with the editor open: the mark goes, the copy is on top of the new save.
  save.land();
  save.answer();
  await until(() => savesOut(fake) >= 2, "the save of the later words", 4000);
  await until(() => editorCopy() === null, "the copy gone once everything is in", 4000);
  assert.match(fake.draft.body, /Typed on, made up\./);
});

test("R6: a reload while a save is out, the save landing during the navigation and never answered: the later words are offered", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const save = holdSaveApart(fake);
  await typeInEditor(dom, " Saved before the reload, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Later words before the reload, made up.");
  await until(() => /Later words before the reload/.test(copyOf()?.body ?? ""), "the copy with the later words");
  const { errors, stop } = heardErrors();
  try {
    await unmount();
    save.land();
    await until(() => /Saved before the reload/.test(fake.draft.body), "the save in");
    assert.doesNotMatch(fake.draft.body, /Later words/);
    await mount(PrivateBlog, fake);
    await until(offered, "the offer of the later words");
    assert.match(copyOf()?.body ?? "", /Saved before the reload, made up\. Later words before the reload, made up\./);
    assert.match(await restoreOffer(), /Saved before the reload, made up\. Later words before the reload, made up\./);
    assert.deepEqual(errors, []);
  } finally {
    stop();
  }
});

test("R6: the editor taken down, the save landing, Ali back and the page loaded before the save's answer: the later words are offered, and stay after it", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const save = holdSaveApart(fake);
  await typeInEditor(dom, " First saved sentence, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Later words at risk, made up.");
  const { errors, stop } = heardErrors();
  try {
    await nowSignedIn(fake, "ada");
    save.land();
    await until(() => /First saved sentence/.test(fake.draft.body), "the save in");
    const loads = fake.requests.filter((r) => r.method === "GET" && r.path === "/api/drafts" && r.query.slug).length;
    await nowSignedIn(fake, "owner");
    await until(() => fake.requests.filter((r) => r.method === "GET" && r.path === "/api/drafts" && r.query.slug).length > loads, "the draft loaded again");
    await settle(100);
    assert.equal(offered(), true, "offered before the answer");
    save.answer();
    await settle(200);
    assert.equal(offered(), true, "still offered after it");
    assert.match(copyOf()?.body ?? "", /Later words at risk, made up\./);
    assert.match(await restoreOffer(), /First saved sentence, made up\. Later words at risk, made up\./);
    assert.deepEqual(errors, []);
  } finally {
    stop();
  }
});

test("R6: a reload while a save is out, the save landing only after the next page judged the copy: offered then, and after another reload", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const save = holdSaveApart(fake);
  await typeInEditor(dom, " Landed late, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Typed before the reload, made up.");
  await unmount();
  await mount(PrivateBlog, fake);
  await until(offered, "the offer, the save not in yet");
  save.land();
  await until(() => /Landed late/.test(fake.draft.body), "the save in");
  await reopened(fake);
  assert.equal(offered(), true, "still offered once it is in");
  assert.match(await restoreOffer(), /Landed late, made up\. Typed before the reload, made up\./);
});

test("R6: a reload while a save is out that carried everything: no offer, the copy gone", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const save = holdSaveApart(fake);
  await typeInEditor(dom, " All of it, saved during the reload, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await unmount();
  save.land();
  await until(() => /saved during the reload/.test(fake.draft.body), "the save in");
  await reopened(fake);
  assert.equal(offered(), false);
  assert.equal(editorCopy(), null);
});

test("R6: a reload while a save is out that never reaches the service: the words are offered on top of the old saved text", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  holdSaveApart(fake);
  await typeInEditor(dom, " Never reached the service, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Nor this, made up.");
  await unmount();
  await mount(PrivateBlog, fake);
  await until(offered, "the offer");
  assert.equal(fake.draft.body, BODY);
  assert.match(await restoreOffer(), /Never reached the service, made up\. Nor this, made up\./);
});

test("R6: a late save that fails, the editor taken down: the words are offered on top of the old saved text", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const save = holdSaveApart(fake, { fail: true });
  await typeInEditor(dom, " Failed late, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Typed after, made up.");
  await nowSignedIn(fake, "ada");
  save.land();
  save.answer();
  await settle(200);
  assert.equal(fake.draft.body, BODY);
  await nowSignedIn(fake, "owner");
  await until(offered, "the offer");
  assert.match(await restoreOffer(), /Failed late, made up\. Typed after, made up\./);
});

test("R6: a save the service refuses with the editor open drops the mark and keeps the copy", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const save = holdSaveApart(fake, { fail: true });
  // Retries fail too, so the copy is looked at between them.
  fake.hooks.push(async (req) => (sentSaves(fake).length > 1 && req.method === "PUT" && req.path === "/api/drafts" ? new Response(JSON.stringify({ error: "A made-up failure." }), { status: 500 }) : undefined));
  await typeInEditor(dom, " Failed with the editor open, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  assert.ok(copyOf()?.sent);
  save.land();
  save.answer();
  await until(() => text().includes("Offline, retrying"), "the failure heard");
  assert.match(copyOf()?.body ?? "", /Failed with the editor open, made up\./);
  assert.equal(copyOf()?.sent ?? null, null, "no mark");
  await reopened(fake);
  assert.equal(offered(), true);
});

test("R6: a save the browser got no answer to, which landed all the same, the page then reloaded: the later words are offered", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  // The service stores the first save, and the browser hears nothing back,
  // as when a navigation cuts the request off after it was sent.
  let first = true;
  let land;
  const landed = new Promise((r) => (land = r));
  fake.hooks.push(async (req) => {
    if (!first || req.method !== "PUT" || req.path !== "/api/drafts") return;
    first = false;
    await landed;
    fake.draft = { ...fake.draft, ...req.body, slug: fake.draft.slug, updated_at: new Date().toISOString() };
    return "network";
  });
  await typeInEditor(dom, " Landed unheard, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Typed while it was out, made up.");
  await until(() => /Typed while it was out/.test(copyOf()?.body ?? ""), "the later words in the copy");
  land();
  await until(() => text().includes("Offline, retrying"), "no answer heard");
  assert.match(fake.draft.body, /Landed unheard, made up\./);
  assert.equal(copyOf()?.sent, markOf(fake.draft), "the mark stays: the save may have landed");
  await unmount();
  await mount(PrivateBlog, fake);
  await until(offered, "the offer of the later words");
  assert.match(await restoreOffer(), /Landed unheard, made up\. Typed while it was out, made up\./);
});

test("R6: a stale copy whose mark is of an earlier save, the draft saved since from another device: removed, not offered", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const save = holdSaveApart(fake);
  await typeInEditor(dom, " Saved here first, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Typed here after, made up.");
  await nowSignedIn(fake, "ada");
  save.land();
  save.answer();
  await until(() => /Saved here first/.test(fake.draft.body), "the save in");
  await settle(100);
  // Another device saves newer text a moment later.
  fake.draft = { ...fake.draft, body: "Made-up text saved on another device.", updated_at: new Date(Date.now() + 5000).toISOString() };
  await nowSignedIn(fake, "owner");
  await until(() => button("Edit"), "the draft");
  await settle(100);
  assert.equal(offered(), false);
  assert.equal(editorCopy(), null);
});

test("R6: Done with everything saved leaves no copy and no offer", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  await typeInEditor(dom, " Done with it, made up.");
  await click(button("Done"));
  await until(() => !editorText(), "the editor closed", 4000);
  assert.match(fake.draft.body, /Done with it, made up\./);
  assert.equal(editorCopy(), null);
  await reopened(fake);
  assert.equal(offered(), false);
});

test("R6: an offer of words typed after a late save, discarded, stays discarded", async () => {
  const fake = service({ who: "owner" });
  const dom = await openEditor(fake);
  const save = holdSaveApart(fake);
  await typeInEditor(dom, " Saved before, made up.");
  await until(() => savesOut(fake), "the save out", 4000);
  await typeInEditor(dom, " Then discarded, made up.");
  await unmount();
  save.land();
  await until(() => /Saved before/.test(fake.draft.body), "the save in");
  await mount(PrivateBlog, fake);
  await until(offered, "the offer");
  const confirm = window.confirm;
  try {
    window.confirm = () => true;
    await click(button("Discard"));
  } finally {
    window.confirm = confirm;
  }
  assert.equal(editorCopy(), null);
  await reopened(fake);
  assert.equal(offered(), false);
});

// ---- M2. A phone sheet the browser closes by itself never leaves the page stuck -----------

/** The page and its dialog agree: locked only while a sheet is shown, and no sheet hidden. */
function agree(what) {
  const locked = document.documentElement.classList.contains("draft-sheet-open");
  const dialog = document.querySelector("dialog.draft-sheet");
  assert.equal(locked, Boolean(dialog?.open), `${what}: the page locked ${locked}, a sheet shown ${Boolean(dialog?.open)}`);
  if (dialog) assert.ok(dialog.open, `${what}: a sheet in the page is shown`);
}

for (const kind of ["comment", "suggestion", "reply"]) {
  test(`M2: on a phone, the browser closing the sheet while a ${kind} is sending leaves no page stuck`, async () => {
    const k = KINDS[kind];
    const fake = service();
    seed(fake, { body: "An original made-up note." });
    await mount(PrivateBlog, fake, { width: 390 });
    await k.open(fake, false);
    const release = hold(fake, (r) => r.method === k.write);
    await click(k.send());
    await until(() => writes(fake, k.write) === 1, "the send");
    // What a browser does on a second Escape, or a back gesture: the dialog's own close().
    await act(() => document.querySelector("dialog.draft-sheet").close());
    await settle();
    agree(`${kind}, closed by the browser mid-send`);
    release();
    await until(() => fake.comments.length === 2, `the ${kind} stored`);
    await settle(300);
    agree(`${kind}, sent`);
    assert.equal(writes(fake, k.write), 1, "sent once");
    // The corner button opens the sheet; Close lets it go.
    await click(document.querySelector(".draft-fab"));
    const sheet = await until(() => document.querySelector("dialog.draft-sheet[open]"), "the sheet from the corner button");
    agree(`${kind}, the corner button`);
    await click(sheet.querySelector(".draft-sheet-close"));
    await until(() => !document.querySelector("dialog.draft-sheet"), "the sheet closed");
    agree(`${kind}, closed`);
    // A new comment opens its sheet.
    await selectAnd("evening fog");
    await until(() => document.querySelector("dialog.draft-sheet[open]") && field("Comment on the selected passage"), "a new comment's sheet");
    agree(`${kind}, a new comment`);
  });
}

// ---- S1. A bad value in the browser's storage never blanks the page ------------------------

test("S1: kept slots of the wrong shape are dropped, that slot only, and the page loads", async () => {
  const at = Date.now();
  const shapes = {
    "a body that is a number": { "reply:x": { body: 5, at } },
    "a new comment with no passage": { 'new:comment:["a","",""]': { kind: "comment", body: "words", at } },
    "a suggestion whose passage is null": { 'new:suggest:["a","",""]': { kind: "suggest", quote: null, words: "w", note: "", at } },
    "a suggestion whose words are a number": { 'new:suggest:["a","",""]': { kind: "suggest", quote: { exact: "a", prefix: "", suffix: "" }, words: 7, note: "", at } },
    "a passage whose words are not a string": { 'new:comment:["a","",""]': { kind: "comment", quote: { exact: ["a"] }, body: "words", at } },
    "slots that are a list": ["x"],
    "a slot that is a string": { general: "hello" },
    "a time that is not a number": { general: { body: "words", at: "yesterday" } },
    "a key that is an object": { general: { body: "words", key: {}, at } },
    "a reply with a kind": { "reply:x": { kind: "suggest", body: "words", at } },
    "a new comment's words with no kind or passage": { 'new:comment:["a","",""]': { body: "words", at } },
  };
  for (const [what, slots] of Object.entries(shapes)) {
    localStorage.clear();
    const fake = service();
    seed(fake);
    const good = { general: { body: "Kept good words, made up.", key: crypto.randomUUID(), at: at + 1 } };
    const all = Array.isArray(slots) ? slots : { ...slots, ...good };
    localStorage.setItem("draft-unsent:reader.ada:made-up", JSON.stringify({ slots: all }));
    const { errors, stop } = heardErrors();
    try {
      await mount(PrivateBlog, fake);
      await until(() => text().includes("The lighthouse keeper rose"), `${what}: the draft`);
      await until(() => document.querySelector(`[data-card="${fake.comments[0].id}"]`), `${what}: the comments`);
      assert.ok(text().includes("Signed in as Ada Reader"), `${what}: signed in`);
      assert.deepEqual(errors, [], what);
      if (!Array.isArray(slots)) assert.equal(field("Comment on the whole draft")?.value, "Kept good words, made up.", `${what}: the good slot beside it is back`);
      assert.ok(!orphan(), `${what}: nothing shown for it`);
    } finally {
      stop();
    }
    await unmount();
  }
});

test("S1: Ali's kept copy of the wrong shape is dropped, not offered, and the draft loads", async () => {
  for (const bad of [{ body: "Made-up words.", title: 5, date: "2026-01-01", summary: "", at: Date.now() }, { body: "Made-up words.", title: "T", date: "2026-01-01", summary: "", at: "yesterday" }]) {
    localStorage.clear();
    localStorage.setItem("draft-editor:made-up", JSON.stringify({ ...bad, base: "2026-01-01T00:00:01.000Z", slug: "made-up" }));
    const fake = service({ who: "owner" });
    await mount(PrivateBlog, fake);
    await until(() => button("Edit"), "the draft");
    await settle(50);
    assert.equal(offered(), false);
    await unmount();
  }
});

// ---- S2. An old error does not come back --------------------------------------------------

/** The error shown on the box holding `label`, or null. */
const errorOn = (label) => field(label)?.closest("form")?.querySelector('[role="alert"]')?.textContent ?? null;
const failWrites = (fake) => {
  const hook = async (req) => (req.method === "POST" ? new Response(JSON.stringify({ error: "A made-up wait of 4 minutes." }), { status: 429 }) : undefined);
  fake.hooks.push(hook);
  return () => fake.hooks.splice(fake.hooks.indexOf(hook), 1);
};

test("S2: a failed reply's error goes once its card is closed with Escape, or another card is opened", async () => {
  const fake = service();
  const c = seed(fake);
  seed(fake, { quote: "fishing boats", body: "Another made-up thought." });
  await mount(PrivateBlog, fake);
  for (const close of ["Escape", "another card"]) {
    await openThread("lighthouse keeper");
    await type(field("Reply"), "A reply that fails, made up.");
    const mend = failWrites(fake);
    await click(button("Reply", document.querySelector(`[data-card="${c.id}"]`)));
    await until(() => errorOn("Reply"), "the error");
    mend();
    if (close === "Escape") await press(document.querySelector('button[aria-label="Resolve this thread"]'), "Escape");
    else await openThread("fishing boats");
    await until(() => !isOpen(c.id), `closed by ${close}`);
    await openThread("lighthouse keeper");
    const box = await until(() => field("Reply", document.querySelector(`[data-card="${c.id}"]`)), "the reply box again");
    assert.equal(box.value, "A reply that fails, made up.", `${close}: the words are kept`);
    assert.equal(errorOn("Reply"), null, `${close}: the old error is gone`);
  }
});

test("S2: a failed comment's error goes once it is closed with Escape; on a phone, once its sheet is closed", async () => {
  for (const width of [1300, 390]) {
    localStorage.clear();
    const fake = service();
    await mount(PrivateBlog, fake, { width });
    await selectAnd("fishing boats");
    await type(field("Comment on the selected passage"), "A comment that fails, made up.");
    const mend = failWrites(fake);
    await click(button("Comment", composer()));
    await until(() => errorOn("Comment on the selected passage"), "the error");
    mend();
    if (width > 1240) await press(field("Comment on the selected passage"), "Escape");
    else await click(document.querySelector(".draft-sheet-close"));
    await until(() => !field("Comment on the selected passage"), "the composer closed");
    await selectAnd("fishing boats");
    const box = await until(() => field("Comment on the selected passage"), "the composer again");
    assert.equal(box.value, "A comment that fails, made up.", `${width}: the words are kept`);
    assert.equal(errorOn("Comment on the selected passage"), null, `${width}: the old error is gone`);
    await unmount();
  }
});

test("S2: a failed send's error stays on its box across the layout both ways while it is open", async () => {
  const fake = service();
  const c = seed(fake);
  await mount(PrivateBlog, fake);
  await openThread("lighthouse keeper");
  await type(field("Reply"), "A reply that fails, made up.");
  failWrites(fake);
  await click(button("Reply", document.querySelector(`[data-card="${c.id}"]`)));
  await until(() => errorOn("Reply"), "the error");
  await resize(390);
  await until(() => field("Reply"), "the reply in the sheet");
  assert.equal(errorOn("Reply"), "A made-up wait of 4 minutes.", "in the sheet");
  await resize(1300);
  await until(() => field("Reply"), "the reply in the margin");
  assert.equal(errorOn("Reply"), "A made-up wait of 4 minutes.", "back in the margin");
});

// ---- S3. A reply that waited to come back does not open after the person moved on ----------

test("S3: a reply waiting for the comments does not open by itself once the person has sent something; it is in its box when they open the card", async () => {
  for (const width of [1300, 390]) {
    localStorage.clear();
    const fake = service();
    const c = seed(fake);
    await mount(PrivateBlog, fake);
    await openThread("lighthouse keeper");
    await type(field("Reply"), "Kept for later, made up.");
    await unmount();
    let fail = true;
    fake.hooks.push(async (r) => (r.path === "/api/draft-comments" && r.method === "GET" && fail ? new Response(JSON.stringify({ error: "made-up outage" }), { status: 500 }) : undefined));
    await mount(PrivateBlog, fake, { width });
    await settle(100);
    await selectAnd("fishing boats");
    await type(field("Comment on the selected passage"), "Sent meanwhile, made up.");
    await click(button("Comment", composer()));
    await until(() => !field("Comment on the selected passage"), "sent");
    if (width < 1240) await click(document.querySelector(".draft-sheet-close"));
    fail = false;
    await poll();
    await until(() => document.querySelector(`[data-card="${c.id}"]`) || document.querySelector(".draft-fab")?.textContent.match(/\d/), "the comments");
    await settle(100);
    assert.equal(Boolean(field("Reply", document.querySelector(`[data-card="${c.id}"]`) ?? document.createElement("div"))), false, `${width}: nothing opened by itself`);
    if (width > 1240) assert.ok(!isOpen(c.id), "its card is not in hand");
    else assert.equal(Boolean(document.querySelector("dialog.draft-sheet")), false, "no sheet");
    if (width > 1240) await openThread("lighthouse keeper");
    else await click(await until(() => [...document.querySelectorAll("[data-threads]")].find((m) => m.textContent.includes("lighthouse keeper")), "the highlight"));
    const box = await until(() => field("Reply", document.querySelector(`[data-card="${c.id}"]`) ?? document.createElement("div")), "the reply box");
    assert.equal(box.value, "Kept for later, made up.", `${width}: the words are there`);
    await unmount();
  }
});
