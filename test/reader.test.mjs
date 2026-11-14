// test/reader.test.mjs: a reader's words on a private draft, through every
// edge the page meets: a reload, a phone throwing the tab away, the list and
// back, a session that ran out, another account in another tab, a lost
// answer, a slow send, a draft taken away, a screen turned. The real page
// (./page.mjs) against a made-up service; every word here is made up.
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  API, button, click, field, load, mount, press, reload, resize, selectAnd, service, settle, storage, text, type, unload, unmount, until,
} from "./page.mjs";

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
  const first = fake.posts()[0].body.id;
  assert.match(first, /^[0-9a-f-]{36}$/);
  await reload(PrivateBlog, fake);
  await until(() => field("Comment on the selected passage"), "the composer, back");
  await click(button("Comment", composer()));
  await until(() => !composer(), "sent");
  assert.equal(fake.posts().at(-1).body.id, first);
  assert.equal(fake.comments.length, 1);
});

test("5: words changed after a failed send get a new id; a 409 about the id shows the service's words and lets it go", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("fishing boats");
  await type(field("Comment on the selected passage"), "First made-up words.");
  fake.hooks.push(async (req) => (req.method === "POST" ? "network" : undefined));
  await click(button("Comment", composer()));
  await until(() => composer()?.querySelector('[role="alert"]'), "the error");
  await click(button("Comment", composer()));
  await until(() => fake.posts().length === 2, "a second try");
  const [a, b] = fake.posts().map((p) => p.body.id);
  assert.equal(a, b, "the very same words keep their id");
  await type(field("Comment on the selected passage"), "Changed made-up words.");
  await click(button("Comment", composer()));
  await until(() => fake.posts().length === 3, "a third try");
  const c = fake.posts()[2].body.id;
  assert.notEqual(c, a);
  // The service has that id for something else.
  fake.hooks = [async (req) => (req.method === "POST" && req.body.id === c ? new Response(JSON.stringify({ error: "Made-up: that id is taken.", field: "id" }), { status: 409 }) : undefined)];
  await click(button("Comment", composer()));
  await until(() => composer()?.textContent.includes("Made-up: that id is taken."), "the service's words");
  await click(button("Comment", composer()));
  await until(() => !composer(), "sent");
  const d = fake.posts().at(-1).body.id;
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

/** Runs `fn` inside React's act(). */
async function act(fn) {
  const { act: reactAct } = await import("react");
  await reactAct(async () => {
    fn();
  });
  await settle();
}
