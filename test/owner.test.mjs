// test/owner.test.mjs: Ali's side of suggested edits on a private draft.
// Accept and Resolve on every card, held across a card drawn afresh, the
// change each open suggestion would make shown in the text at rest, and
// threads on overlapping words each lighting their own. The real page
// (./page.mjs) against a made-up service; every word here is made up.
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { act } from "react";
import { marked } from "marked";
import { indexText } from "../src/front/quotes.js";
import { quoteAt } from "../src/front/private/place.js";
import { BODY, button, click, field, load, mount, selectAnd, service, settle, type, unload, unmount, until } from "./page.mjs";

let PrivateBlog;
before(async () => {
  ({ PrivateBlog } = await load());
});
after(unload);
beforeEach(() => localStorage.clear());
afterEach(unmount);

/** A reader's quote of `words` in a draft's text, with its context, as the page takes it. */
function quoteOf(draftBody, words) {
  const t = document.createElement("template");
  t.innerHTML = marked.parse(draftBody);
  const index = indexText(t.content);
  const at = index.text.indexOf(words);
  assert.ok(at >= 0, `"${words}" is in the text`);
  return quoteAt(index, [at, at + words.length]);
}

let clock = 0;
/**
 * A thread already on the draft, started by a reader, each one later than
 * the last. Its quote has the context it was taken with in `from`, the text
 * then: Accept finds a passage only by all of it.
 */
function seed(fake, { by = "ada", body = "A made-up first thought.", quote = "lighthouse keeper", from = fake.draft.body, suggestion = null, anchor = null, resolved = null } = {}) {
  const r = { ada: "Ada Reader", bo: "Bo Reader" }[by];
  const c = {
    id: crypto.randomUUID(), thread: null, body, by, author: { name: r, owner: false }, suggestion, resolved, accepted: null, anchor,
    quote: quoteOf(from, quote), created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, ++clock)).toISOString(), edited_at: null,
  };
  fake.comments.push(c);
  return c;
}

/** A request held until `release()`, then answered as usual. */
function hold(fake, match) {
  let release;
  const gate = new Promise((r) => (release = r));
  fake.hooks.push(async (req) => (match(req) ? gate : undefined));
  return () => release();
}

const poll = async () => {
  await settle();
  document.dispatchEvent(new window.Event("visibilitychange"));
  await settle(30);
};

const body = () => document.querySelector(".post-body");
const card = (id) => document.querySelector(`[data-card="${id}"]`);
const inMargin = (id) => document.querySelector(`.draft-margin [data-card="${id}"]`);
const inSheet = (id) => document.querySelector(`dialog.draft-sheet[open] [data-card="${id}"]`);
const sheetOpen = () => document.querySelector("dialog.draft-sheet[open]");
const acceptIn = (el) => el?.querySelector('button[aria-label="Accept this suggestion"]') ?? null;
const resolveIn = (el) => el?.querySelector('button[aria-label="Resolve this thread"]') ?? null;
/** The highlights in the text, each piece a passage is drawn in. */
const pieces = () => [...(body()?.querySelectorAll("[data-threads]") ?? [])];
const highlight = (words) => until(() => pieces().find((m) => m.textContent.includes(words) && !m.classList.contains("is-pending")), `the highlight on "${words}"`);
/** What the text shows as taken out, and as put in. */
const struck = () => [...body().querySelectorAll(".draft-piece.is-del")].map((el) => el.textContent);
const added = () => [...body().querySelectorAll("[data-ins]")].map((el) => el.dataset.ins);
const saves = (fake) => fake.requests.filter((r) => r.method === "PUT" && r.path === "/api/drafts");
const accepts = (fake, id) => saves(fake).filter((r) => r.body.accept === id).length;
const patches = (fake) => fake.requests.filter((r) => r.method === "PATCH" && r.path === "/api/draft-comments").length;

/**
 * A node's children as the text has them, text nodes one by one: a text
 * split and not joined back again shows here, where the HTML looks the same.
 */
const shape = (node) =>
  [...node.childNodes].map((n) => (n.nodeType === 3 ? JSON.stringify(n.data) : `<${n.nodeName}${n.getAttribute?.("href") ? ` ${n.getAttribute("href")}` : ""}>[${shape(n)}]`)).join(" ");

/** The draft's text and its shape with no threads on it, as `body` renders. */
async function unmarked(draftBody = BODY) {
  const fake = service({ who: "owner" });
  fake.draft.body = draftBody;
  await mount(PrivateBlog, fake);
  await until(() => body() && document.querySelector(".draft-margin"), "the draft and its margin");
  await settle(50);
  const out = { text: body().textContent, shape: shape(body()) };
  await unmount();
  return out;
}

/** The text before `el` within `within`. */
function textBefore(el, within) {
  let s = "";
  const walker = document.createTreeWalker(within, window.NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (el.compareDocumentPosition(n) & window.Node.DOCUMENT_POSITION_PRECEDING) s += n.data;
  return s;
}

/** Moves the mouse onto a card or off it, as React hears it: over and out, bubbling, from outside the page. */
const hover = (el, on) => act(async () => el.dispatchEvent(new window.MouseEvent(on ? "mouseover" : "mouseout", { bubbles: true, relatedTarget: null })));

// ---- 3. Accept beside Resolve -----------------------------------------------------------

test("3: every open suggestion's card in the margin has Accept just before Resolve, in one place, whether it is in hand or not", async () => {
  const fake = service({ who: "owner" });
  const boats = seed(fake, { quote: "fishing boats", suggestion: "fishing ships" });
  const fog = seed(fake, { quote: "evening fog", suggestion: "morning mist" });
  await mount(PrivateBlog, fake);
  await until(() => inMargin(boats.id) && inMargin(fog.id), "both cards in the margin");
  // One taken in hand, the other left as it rests.
  await click(await highlight("evening fog"));
  await until(() => card(fog.id).classList.contains("is-active"), "the fog card in hand");
  assert.equal(card(boats.id).classList.contains("is-active"), false);
  for (const t of [boats, fog]) {
    const accept = acceptIn(card(t.id));
    const resolve = resolveIn(card(t.id));
    assert.ok(accept && resolve, `Accept and Resolve on ${t.suggestion}`);
    assert.equal(accept.nextElementSibling, resolve, "Accept is immediately before Resolve");
    assert.ok(accept.parentElement.matches(".draft-card-actions") && accept.parentElement === resolve.parentElement);
    assert.equal(card(t.id).querySelectorAll(".draft-card-actions").length, 1);
  }
});

test("3: a comment's card has Resolve and no Accept", async () => {
  const fake = service({ who: "owner" });
  const c = seed(fake);
  await mount(PrivateBlog, fake);
  const el = await until(() => inMargin(c.id), "the comment's card");
  assert.ok(resolveIn(el.querySelector(".draft-card-actions")));
  assert.equal(acceptIn(el), null);
  assert.equal(button("Accepting…", el), undefined);
});

test("3: a reader never gets Accept, on their own suggestion or anywhere", async () => {
  const fake = service();
  const s = seed(fake, { quote: "fishing boats", suggestion: "fishing ships" });
  await mount(PrivateBlog, fake);
  const el = await until(() => inMargin(s.id), "the reader's suggestion card");
  // Their own thread they can resolve.
  assert.ok(resolveIn(el));
  assert.equal(document.querySelector('button[aria-label="Accept this suggestion"]'), null);
  await click(await highlight("fishing boats"));
  await until(() => card(s.id).classList.contains("is-active"), "the card in hand");
  assert.equal(document.querySelector('button[aria-label="Accept this suggestion"]'), null);
});

test("3: a resolved suggestion shown with Show resolved has Reopen where Accept and Resolve were, and no Accept", async () => {
  const fake = service({ who: "owner" });
  const s = seed(fake, { quote: "fishing boats", suggestion: "fishing ships", resolved: { by: "Ali", at: "2026-01-01T00:00:06.000Z" } });
  await mount(PrivateBlog, fake);
  const show = await until(() => [...document.querySelectorAll('input[type="checkbox"]')].find((i) => i.closest("label")?.textContent.includes("Show resolved")), "Show resolved");
  await click(show);
  const el = await until(() => inMargin(s.id), "the resolved card");
  const actions = el.querySelector(".draft-card-actions");
  assert.ok(button("Reopen", actions), "Reopen in the card's actions");
  assert.equal(acceptIn(el), null);
  assert.equal(resolveIn(el), null);
});

// ---- 4. Accept from a card at rest ------------------------------------------------------

test("4: Accept pressed on a card not in hand saves the suggested words once, with the thread, and the card leaves the margin", async () => {
  const fake = service({ who: "owner" });
  const s = seed(fake, { quote: "fishing boats", suggestion: "fishing ships" });
  await mount(PrivateBlog, fake);
  const el = await until(() => inMargin(s.id), "the suggestion's card");
  assert.equal(el.classList.contains("is-active"), false);
  await click(acceptIn(el));
  await until(() => !inMargin(s.id), "the card gone from the margin");
  await until(() => body().textContent.includes("the fishing ships waited"), "the suggested words in the text");
  assert.ok(!body().textContent.includes("fishing boats"));
  assert.equal(accepts(fake, s.id), 1, "one save carrying the thread");
  assert.ok(fake.comments.find((c) => c.id === s.id).accepted, "the thread accepted by that save");
  await settle(300);
  assert.equal(accepts(fake, s.id), 1);
});

// ---- 5. Accept and Resolve held across a card drawn afresh -------------------------------

test("5: on a phone, while Accept is out, the sheet closed and opened again shows Accepting… with no Resolve, and one save is sent", async () => {
  const fake = service({ who: "owner" });
  const s = seed(fake, { quote: "fishing boats", suggestion: "fishing ships" });
  await mount(PrivateBlog, fake, { width: 390 });
  await click(await highlight("fishing boats"));
  const el = await until(() => inSheet(s.id), "the thread's sheet");
  const release = hold(fake, (r) => r.method === "PUT" && r.path === "/api/drafts");
  const accept = acceptIn(el);
  // Two presses before the page draws again.
  await act(async () => {
    accept.click();
    accept.click();
  });
  await until(() => button("Accepting…", inSheet(s.id) ?? document.createElement("div")), "Accepting… in the sheet");
  await until(() => saves(fake).length === 1, "the save sent");
  await click(document.querySelector(".draft-sheet-close"));
  await until(() => !sheetOpen(), "the sheet closed");
  await click(await highlight("fishing boats"));
  const again = await until(() => inSheet(s.id), "the sheet open again");
  const busy = await until(() => button("Accepting…", again), "Accepting… on the card drawn afresh");
  assert.equal(busy.disabled, true);
  assert.equal(resolveIn(again), null, "no Resolve while it is accepting");
  assert.equal(button("Resolving…", again), undefined);
  assert.equal(acceptIn(again), null);
  await click(busy);
  release();
  await until(() => fake.comments.find((c) => c.id === s.id).accepted, "accepted");
  await settle(300);
  assert.equal(accepts(fake, s.id), 1, "one save");
});

test("5: on a phone, while Resolve is out, the sheet closed and opened again shows Resolving… with no Accept, and one resolve is sent", async () => {
  const fake = service({ who: "owner" });
  const s = seed(fake, { quote: "fishing boats", suggestion: "fishing ships" });
  await mount(PrivateBlog, fake, { width: 390 });
  await click(await highlight("fishing boats"));
  const el = await until(() => inSheet(s.id), "the thread's sheet");
  const release = hold(fake, (r) => r.method === "PATCH");
  const resolve = resolveIn(el);
  await act(async () => {
    resolve.click();
    resolve.click();
  });
  await until(() => patches(fake) === 1, "the resolve sent");
  await click(document.querySelector(".draft-sheet-close"));
  await until(() => !sheetOpen(), "the sheet closed");
  await click(await highlight("fishing boats"));
  const again = await until(() => inSheet(s.id), "the sheet open again");
  const busy = await until(() => button("Resolving…", again), "Resolving… on the card drawn afresh");
  assert.equal(busy.disabled, true);
  assert.equal(acceptIn(again), null, "no Accept while it is resolving");
  assert.equal(button("Accepting…", again), undefined);
  await click(busy);
  release();
  await until(() => fake.comments.find((c) => c.id === s.id).resolved, "resolved");
  await settle(300);
  assert.equal(patches(fake), 1, "one resolve");
  assert.equal(saves(fake).length, 0, "nothing accepted");
});

// ---- 6. The change shown in the text at rest --------------------------------------------

// Each a suggestion and the draft it is on: what it strikes, what it puts in,
// and for words only added, the passage's words before the place they go.
const CHANGES = {
  "a replacement": { quote: "fishing boats waited", suggestion: "fishing ships waited", del: ["boats"], ins: "ships" },
  "a deletion of some words": { quote: "fishing boats waited", suggestion: "boats waited", del: ["fishing "], ins: null },
  "the whole passage deleted": { quote: "fishing boats", suggestion: "", del: ["fishing boats"], ins: null },
  "words added at the passage's start": { quote: "fishing boats", suggestion: "small fishing boats", del: [], ins: "small ", before: "" },
  "words added in the passage's middle": { quote: "fishing boats", suggestion: "fishing old boats", del: [], ins: "old ", before: "fishing " },
  "words added at the passage's end": { quote: "fishing boats", suggestion: "fishing boats there", del: [], ins: " there", before: "fishing boats" },
  "a passage running out of bold text": {
    body: BODY.replace("lighthouse keeper rose", "lighthouse **keeper** rose"),
    quote: "lighthouse keeper rose",
    suggestion: "lighthouse watchman woke",
    del: ["keeper", " rose"],
    ins: "watchman woke",
  },
  "a passage running into a link": {
    body: BODY.replace("harbour wall", "[harbour wall](https://example.test/wall)"),
    quote: "harbour wall the fishing",
    suggestion: "harbour steps the fishing",
    del: ["wall"],
    ins: "steps",
  },
};

for (const [name, k] of Object.entries(CHANGES)) {
  test(`6: ${name} is shown in the text at rest without changing its text, and resolved, the text is as it was`, async () => {
    const plain = await unmarked(k.body);
    const fake = service({ who: "owner" });
    if (k.body) fake.draft.body = k.body;
    const s = seed(fake, { quote: k.quote, suggestion: k.suggestion });
    await mount(PrivateBlog, fake);
    const el = await until(() => inMargin(s.id), "the suggestion's card");
    await highlight(k.quote.split(" ")[0]);
    await until(() => body().querySelector(".draft-ins"), "the change drawn");
    assert.deepEqual(struck(), k.del, "the words struck");
    assert.deepEqual(added(), k.ins ? [k.ins] : [], "the words put in");
    const ins = body().querySelector(".draft-ins");
    assert.equal(ins.textContent, "", "the place for the new words holds none");
    assert.ok(ins.closest("[data-threads]"), "inside the highlight");
    if (k.before !== undefined) assert.equal(textBefore(ins, ins.closest("[data-threads]")), k.before, "where the new words go");
    assert.equal(body().textContent, plain.text, "the draft's text as with no threads");
    // Resolved from its card at rest: nothing of it is left in the text.
    await click(resolveIn(el));
    await until(() => !pieces().length, "the highlight gone");
    assert.equal(body().querySelector(".draft-piece, .draft-ins, mark"), null);
    assert.equal(shape(body()), plain.shape, "the text nodes joined back as they were");
  });
}

test("6: a suggestion deleted elsewhere leaves nothing in the text, its text nodes joined back", async () => {
  const plain = await unmarked();
  const fake = service({ who: "owner" });
  const s = seed(fake, { quote: "fishing boats waited", suggestion: "fishing ships waited" });
  await mount(PrivateBlog, fake);
  await until(() => struck().length, "the change drawn");
  fake.comments = fake.comments.filter((c) => c.id !== s.id);
  await poll();
  await until(() => !pieces().length, "the highlight gone");
  assert.equal(body().querySelector(".draft-piece, .draft-ins, mark"), null);
  assert.equal(shape(body()), plain.shape);
});

// ---- 7. A passage edited since ---------------------------------------------------------

test("7: a suggestion whose passage was edited since shows no change in the text", async () => {
  const fake = service({ who: "owner" });
  fake.draft.body = BODY.replace("fishing boats", "fishing dinghies");
  const s = seed(fake, { quote: "fishing boats", from: BODY, suggestion: "fishing ships", anchor: quoteOf(fake.draft.body, "fishing dinghies") });
  await mount(PrivateBlog, fake);
  await until(() => inMargin(s.id), "the suggestion's card");
  const mark = await highlight("fishing dinghies");
  assert.equal(mark.dataset.threads, s.id);
  await settle(50);
  assert.equal(body().querySelector(".draft-piece, .draft-ins"), null, "nothing struck or put in");
  // Taken in hand it is not shown either: it would change other words.
  await click(mark);
  await until(() => card(s.id).classList.contains("is-active"), "the card in hand");
  assert.deepEqual(struck(), []);
  assert.deepEqual(added(), []);
});

// ---- 8. A comment and a suggestion on overlapping words ------------------------------------

const SENTENCE = "The lighthouse keeper rose before the gulls and climbed the stairs twice.";

test("8: a suggestion inside a commented sentence is its own piece of the sentence, leading to the suggestion first", async () => {
  const fake = service({ who: "owner" });
  const c = seed(fake, { quote: SENTENCE });
  const s = seed(fake, { quote: "rose before the gulls", suggestion: "woke before the gulls" });
  await mount(PrivateBlog, fake);
  await until(() => inMargin(c.id) && inMargin(s.id) && pieces().length >= 3, "the sentence in pieces");
  const inner = pieces().filter((p) => p.dataset.threads === `${s.id} ${c.id}`);
  const outer = pieces().filter((p) => p.dataset.threads === c.id);
  assert.equal(inner.map((p) => p.textContent).join(""), "rose before the gulls");
  assert.equal(outer.map((p) => p.textContent).join("|"), "The lighthouse keeper | and climbed the stairs twice.");
  assert.equal(inner.length + outer.length, pieces().length, "every piece leads to those two, and no other way");
  // Each piece takes its own thread in hand.
  await click(inner[0]);
  await until(() => document.querySelector(".draft-card.is-active")?.dataset.card === s.id, "the suggestion in hand");
  await click(outer[0]);
  await until(() => document.querySelector(".draft-card.is-active")?.dataset.card === c.id, "the comment in hand");
  await click(outer[1]);
  assert.equal(document.querySelector(".draft-card.is-active")?.dataset.card, c.id);
});

test("8: hovering the suggestion's card lights only its words; hovering the comment's lights the whole sentence", async () => {
  const fake = service({ who: "owner" });
  const c = seed(fake, { quote: SENTENCE });
  const s = seed(fake, { quote: "rose before the gulls", suggestion: "woke before the gulls" });
  await mount(PrivateBlog, fake);
  await until(() => inMargin(c.id) && inMargin(s.id) && pieces().length >= 3, "the sentence in pieces");
  const lit = () => pieces().filter((p) => p.classList.contains("is-hover"));
  await hover(card(s.id), true);
  await until(() => lit().length, "the suggestion's words lit");
  assert.deepEqual(lit().map((p) => p.dataset.threads), pieces().filter((p) => p.dataset.threads.startsWith(s.id)).map((p) => p.dataset.threads));
  assert.equal(lit().map((p) => p.textContent).join(""), "rose before the gulls");
  await hover(card(s.id), false);
  await until(() => !lit().length, "nothing lit");
  await hover(card(c.id), true);
  await until(() => lit().length, "the comment's words lit");
  assert.equal(lit().length, pieces().length, "every piece of the sentence");
  await hover(card(c.id), false);
  await until(() => !lit().length, "nothing lit");
});

// ---- 9. Two suggestions on overlapping words ------------------------------------------------

test("9: of two suggestions on overlapping words, the earlier one's change is shown at rest, the other's only in hand, never both", async () => {
  const fake = service({ who: "owner" });
  const first = seed(fake, { quote: "fishing boats waited", suggestion: "fishing boats lingered" });
  const second = seed(fake, { quote: "waited for the tide", suggestion: "waited for the flood" });
  await mount(PrivateBlog, fake);
  await until(() => inMargin(first.id) && inMargin(second.id) && struck().length, "both cards and a change");
  assert.deepEqual(struck(), ["waited"]);
  assert.deepEqual(added(), ["lingered"]);
  // The other taken in hand from its card: its change instead.
  await click(card(second.id));
  await until(() => card(second.id).classList.contains("is-active"), "the second in hand");
  await until(() => added()[0] === "flood", "the second's change");
  assert.deepEqual(struck(), ["tide"]);
  assert.deepEqual(added(), ["flood"]);
  // And back.
  await click(card(first.id));
  await until(() => card(first.id).classList.contains("is-active"), "the first in hand");
  await until(() => added()[0] === "lingered", "the first's change");
  assert.deepEqual(struck(), ["waited"]);
  assert.deepEqual(added(), ["lingered"]);
});

// ---- 10. A suggestion being written ---------------------------------------------------------

const pendingStruck = () => [...body().querySelectorAll(".is-pending .draft-piece.is-del")].map((el) => el.textContent);
const pendingAdded = () => [...body().querySelectorAll(".is-pending [data-ins]")].map((el) => el.dataset.ins);

test("10: a reader's suggestion being written is shown in the text a moment after typing; started again after Cancel, only once typed in", async () => {
  const fake = service();
  await mount(PrivateBlog, fake);
  await selectAnd("harbour wall", "Suggest edit");
  await until(() => body().querySelector(".is-pending"), "the pending passage");
  await type(field("What the selected words should say"), "harbour steps");
  // Not at once: the page waits for typing to pause.
  assert.deepEqual(pendingStruck(), []);
  await settle(200);
  await until(() => pendingStruck().length, "the change in the text");
  assert.deepEqual(pendingStruck(), ["wall"]);
  assert.deepEqual(pendingAdded(), ["steps"]);
  await click(button("Cancel", document.querySelector('[data-card="new"]')));
  await until(() => !document.querySelector('[data-card="new"]'), "the composer gone");
  assert.equal(body().querySelector(".draft-piece, .draft-ins"), null, "nothing left of it in the text");
  // The same words again: the box opens with the passage's own words, which change nothing.
  await selectAnd("harbour wall", "Suggest edit");
  await until(() => body().querySelector(".is-pending"), "the pending passage again");
  assert.equal(field("What the selected words should say").value, "harbour wall");
  await settle(300);
  assert.deepEqual(pendingStruck(), []);
  assert.deepEqual(pendingAdded(), []);
  await type(field("What the selected words should say"), "harbour gate");
  await settle(200);
  await until(() => pendingAdded().length, "the new change in the text");
  assert.deepEqual(pendingStruck(), ["wall"]);
  assert.deepEqual(pendingAdded(), ["gate"]);
});

test("10: on a phone, a suggestion being written in the sheet is shown in the text the same way", async () => {
  const fake = service();
  await mount(PrivateBlog, fake, { width: 390 });
  await selectAnd("harbour wall", "Suggest edit");
  const box = await until(() => sheetOpen() && field("What the selected words should say", sheetOpen()), "the composer in the sheet");
  await type(box, "harbour steps");
  await settle(200);
  await until(() => pendingStruck().length, "the change in the text");
  assert.deepEqual(pendingStruck(), ["wall"]);
  assert.deepEqual(pendingAdded(), ["steps"]);
  assert.ok(sheetOpen(), "with the sheet still open");
});

// ---- 11. A sheet of one thread lets it go ---------------------------------------------------

test("11: on a phone, Resolve in a sheet holding one thread closes the sheet", async () => {
  const fake = service({ who: "owner" });
  const s = seed(fake, { quote: "fishing boats", suggestion: "fishing ships" });
  await mount(PrivateBlog, fake, { width: 390 });
  await click(await highlight("fishing boats"));
  await click(resolveIn(await until(() => inSheet(s.id), "the thread's sheet")));
  await until(() => !sheetOpen(), "the sheet closed");
  assert.ok(fake.comments.find((c) => c.id === s.id).resolved);
});

test("11: on a phone, Accept in a sheet holding one thread closes the sheet", async () => {
  const fake = service({ who: "owner" });
  const s = seed(fake, { quote: "fishing boats", suggestion: "fishing ships" });
  await mount(PrivateBlog, fake, { width: 390 });
  await click(await highlight("fishing boats"));
  await click(acceptIn(await until(() => inSheet(s.id), "the thread's sheet")));
  await until(() => !sheetOpen(), "the sheet closed");
  assert.ok(fake.comments.find((c) => c.id === s.id).accepted);
});
