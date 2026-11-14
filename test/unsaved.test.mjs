// test/unsaved.test.mjs: when an edit kept in this browser is offered back
// against the server's copy of the draft (../src/front/private/unsaved.js).
// Every text here is made up.
import { window } from "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { markOf, newerThan, readUnsaved, writeUnsaved } from "../src/front/private/unsaved.js";

// Node has a storage global of its own, unset without a file: the browser's here.
Object.defineProperty(globalThis, "localStorage", { value: window.localStorage, configurable: true, writable: true });

const SAVED = { title: "A made-up title", date: "2026-02-01", summary: "A made-up summary.", body: "Made-up words, saved." };
const LATER = { ...SAVED, body: "Made-up words, saved. Typed after." };
const at = (iso) => Date.parse(iso);
const draft = (fields, updated_at) => ({ slug: "made-up", ...fields, updated_at });

test("the same text as saved is not offered, whatever it carries", () => {
  const d = draft(SAVED, "2026-02-01T10:00:05.000Z");
  assert.equal(newerThan({ ...SAVED, base: d.updated_at, at: at("2026-02-01T10:00:09.000Z") }, d), false);
  assert.equal(newerThan({ ...SAVED, base: "2026-02-01T10:00:00.000Z", sent: markOf(SAVED), at: at("2026-02-01T10:00:01.000Z") }, d), false);
});

test("an edit made on top of the saved text is offered", () => {
  const d = draft(SAVED, "2026-02-01T10:00:05.000Z");
  assert.equal(newerThan({ ...LATER, base: d.updated_at, at: at("2026-02-01T10:00:01.000Z") }, d), true);
});

test("an edit whose save landed after it was kept is offered: the saved text is what its mark describes", () => {
  const d = draft(SAVED, "2026-02-01T10:00:05.000Z");
  // Kept on top of the save before, and before this one landed.
  assert.equal(newerThan({ ...LATER, base: "2026-02-01T10:00:00.000Z", sent: markOf(SAVED), at: at("2026-02-01T10:00:02.000Z") }, d), true);
});

test("an edit whose mark is of other text, older than the saved text, is not offered", () => {
  const d = draft({ ...SAVED, body: "Made-up words saved on another device." }, "2026-02-01T10:00:05.000Z");
  assert.equal(newerThan({ ...LATER, base: "2026-02-01T10:00:00.000Z", sent: markOf(SAVED), at: at("2026-02-01T10:00:02.000Z") }, d), false);
  assert.equal(newerThan({ ...LATER, base: "2026-02-01T10:00:00.000Z", at: at("2026-02-01T10:00:02.000Z") }, d), false);
});

test("the mark is of all four fields, title and summary as the server keeps them", () => {
  assert.equal(markOf({ ...SAVED, title: `  ${SAVED.title} `, summary: `${SAVED.summary} ` }), markOf(SAVED));
  for (const f of ["title", "date", "summary", "body"]) assert.notEqual(markOf({ ...SAVED, [f]: `${SAVED[f]}x` }), markOf(SAVED), f);
  // Where one field ends and the next starts is part of it.
  assert.notEqual(markOf({ ...SAVED, title: "ab", summary: "c" }), markOf({ ...SAVED, title: "a", summary: "bc" }));
});

test("the mark is kept with the copy, and a copy whose mark is not a string is not offered", () => {
  localStorage.clear();
  writeUnsaved("made-up", { ...LATER, base: null, sent: markOf(SAVED) });
  assert.equal(readUnsaved("made-up").sent, markOf(SAVED));
  localStorage.setItem("draft-editor:made-up", JSON.stringify({ ...LATER, base: null, sent: 4, at: 1 }));
  assert.equal(readUnsaved("made-up"), null);
  localStorage.clear();
});
