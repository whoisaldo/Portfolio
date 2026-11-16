// test/static-copy.test.mjs: a blog page is served with its text in
// #static-copy, ahead of #root (scripts/static-pages.mjs). It goes as soon as
// React puts something in its place, the page or the error page, and stays
// while React is only waiting for a part of the page to load. The faults and
// the parts here are made up; the post is a published one.
import { window } from "./dom.mjs";
import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import React, { act, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { readdirSync } from "node:fs";
import { loadModule, unload } from "./page.mjs";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const h = React.createElement;

let ErrorBoundary, Root, useStaticCopyGone;
before(async () => {
  ({ default: ErrorBoundary } = await loadModule("/src/components/ErrorBoundary.jsx"));
  ({ default: Root } = await loadModule("/src/Root.jsx"));
  ({ useStaticCopyGone } = await loadModule("/src/front/lib.js"));
});
after(unload);

let root = null;
let host = null;
let quiet = null;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  if (quiet) console.error = quiet;
  document.body.innerHTML = "";
  root = host = quiet = null;
});

/** The served page: the copy, then an empty #root. */
function served() {
  document.body.innerHTML = '<div id="static-copy"><main><h1>The served copy</h1></main></div><div id="root"></div>';
  host = document.getElementById("root");
  root = createRoot(host);
}
// A boolean, so a failure does not print a happy-dom element, which walks its whole window.
const copy = () => document.getElementById("static-copy") !== null;
/** console.error, kept: a fault the boundary catches is logged, by it and by React. */
function logged() {
  const said = [];
  quiet = console.error;
  console.error = (...args) => said.push(args.map(String).join(" "));
  return said;
}
/** As Root.jsx draws it. */
const guarded = (child) => h(ErrorBoundary, { resetKey: "k" }, h(Suspense, { fallback: null }, child));
/** Until `done()`, a lazy part through Vite taking what it takes, for up to ten seconds. */
async function settle(done) {
  for (let i = 0; i < 1000 && !done(); i++) await act(() => new Promise((r) => setTimeout(r, 10)));
}

test("a page that throws as it renders: the error page shows alone", async () => {
  const said = logged();
  function Broken() {
    throw new Error("A made-up render fault.");
  }
  served();
  await act(async () => root.render(guarded(h(Broken))));
  assert.ok(!copy(), "the copy is gone");
  assert.match(document.body.textContent, /Render fault/);
  assert.doesNotMatch(document.body.textContent, /The served copy/);
  assert.ok(said.some((s) => s.includes("[ErrorBoundary]")));
});

test("a page that throws after its first render, on a later one: the error page shows alone", async () => {
  logged();
  let fail = null;
  function Later() {
    const [n, set] = React.useState(0);
    fail = () => set(1);
    if (n) throw new Error("A made-up render fault, later.");
    return h("p", null, "Waiting to fail.");
  }
  served();
  await act(async () => root.render(guarded(h(Later))));
  assert.ok(copy(), "a part that is not the page leaves the copy");
  await act(async () => fail());
  assert.ok(!copy(), "the copy is gone");
  assert.match(document.body.textContent, /Render fault/);
});

test("a part still loading keeps the copy; the page, once in, takes its place", async () => {
  let arrive;
  const Part = lazy(() => new Promise((r) => (arrive = r)));
  function Page() {
    useStaticCopyGone();
    return h("main", null, h("h1", null, "The page"));
  }
  served();
  await act(async () => root.render(guarded(h(Part))));
  assert.ok(copy(), "only waiting: the copy stays");
  assert.equal(host.textContent, "");
  await act(async () => arrive({ default: Page }));
  assert.ok(!copy(), "the copy is gone");
  assert.equal(document.querySelectorAll("h1").length, 1);
  assert.equal(document.querySelector("h1").textContent, "The page");
});

test("a part that does not load: the error page shows alone", async () => {
  logged();
  // Not one of the messages that mean a deploy replaced the file, which
  // reloads the page (new-build.test.mjs); this is the fault shown after.
  const Part = lazy(() => Promise.reject(new TypeError("A made-up network failure.")));
  served();
  await act(async () => root.render(guarded(h(Part))));
  await settle(() => /Render fault/.test(document.body.textContent));
  assert.ok(!copy(), "the copy is gone");
  assert.match(document.body.textContent, /Render fault/);
  assert.doesNotMatch(document.body.textContent, /The served copy/);
});

// The whole way, through the site's own Root and Front and the post's own
// chunk, as a reader opening the post's address gets it.
test("a published post opened at its address: the page replaces the copy, once", async () => {
  const slug = readdirSync(new URL("../src/blog/", import.meta.url)).find((f) => f.endsWith(".md")).replace(/\.md$/, "");
  served();
  await act(async () => root.render(h(MemoryRouter, { initialEntries: [`/blog/${slug}/`] }, h(Root))));
  await settle(() => !copy() || /Render fault/.test(document.body.textContent));
  assert.ok(!copy(), "the copy is gone");
  assert.equal(document.querySelectorAll("h1").length, 1);
  assert.ok(document.querySelector("main article .post-body"), "the post itself");
  assert.doesNotMatch(document.body.textContent, /The served copy|Render fault/);
});
