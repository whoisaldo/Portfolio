// test/new-build.test.mjs: a page left open across a deploy. A part of the
// site not loaded yet is asked for by its old file name, which the deploy
// removed: the page loads again, once, and the root error boundary lets go
// of a fault when the person goes somewhere else.
import { window } from "./dom.mjs";
import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { loadModule, unload } from "./page.mjs";
import { AGAIN_AFTER, isMissingPart, reloadOnce } from "../src/lib/stale-build.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** A sessionStorage of its own; `broken` throws as a blocked one does. */
function store({ broken = false } = {}) {
  const m = new Map();
  return {
    getItem: (k) => {
      if (broken) throw new Error("blocked");
      return m.has(k) ? m.get(k) : null;
    },
    setItem: (k, v) => {
      if (broken) throw new Error("blocked");
      m.set(k, String(v));
    },
  };
}

// ---- the decision ------------------------------------------------------------------------

test("T2: the first missing part reloads; another soon after does not; one long after does", () => {
  const s = store();
  const t = 1_800_000_000_000;
  assert.equal(reloadOnce(s, t), true);
  assert.equal(reloadOnce(s, t + 1000), false, "not again at once");
  assert.equal(reloadOnce(s, t + AGAIN_AFTER - 1), false, "not again within the window");
  assert.equal(reloadOnce(s, t + AGAIN_AFTER), true, "a later deploy reloads again");
  assert.equal(reloadOnce(s, t + AGAIN_AFTER + 1), false);
});

test("T2: with nowhere to keep the mark, or offline, there is no reload", () => {
  assert.equal(reloadOnce(store({ broken: true }), 1), false);
  assert.equal(reloadOnce(null, 1), false);
  assert.equal(reloadOnce(store(), 1, false), false);
});

test("T2: a mark from the future (a clock set back) does not stop the reload for ever", () => {
  const s = store();
  s.setItem("reloaded-for-new-build", "5000000000000");
  assert.equal(reloadOnce(s, 1_800_000_000_000), true);
});

test("T2: the failures that mean a part's file is gone, in each engine's words", () => {
  for (const m of [
    "Failed to fetch dynamically imported module: http://site.test/assets/WorkPage-abc.js",
    "error loading dynamically imported module: http://site.test/assets/WorkPage-abc.js",
    "Importing a module script failed.",
    "Unable to preload CSS for /assets/work-abc.css",
  ])
    assert.equal(isMissingPart(new TypeError(m)), true, m);
  for (const m of ["Cannot read properties of null (reading 'x')", "not found"]) assert.equal(isMissingPart(new Error(m)), false, m);
  assert.equal(isMissingPart(null), false);
});

// ---- the boundary --------------------------------------------------------------------------

let ErrorBoundary;
before(async () => {
  ({ default: ErrorBoundary } = await loadModule("/src/components/ErrorBoundary.jsx"));
});
after(unload);

let root = null;
let host = null;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  root = host = null;
});

let go = null;
function Page() {
  const { pathname } = useLocation();
  go = useNavigate();
  if (pathname === "/broken") throw new Error("A made-up render fault.");
  if (pathname === "/gone") throw new TypeError("Failed to fetch dynamically imported module: http://site.test/assets/Gone-abc.js");
  return React.createElement("p", null, `The page at ${pathname}`);
}
/** The boundary as Root.jsx puts it: let go on each navigation. */
function Guarded() {
  const { key } = useLocation();
  return React.createElement(ErrorBoundary, { resetKey: key }, React.createElement(Page));
}
async function show(path) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(Routes, null, React.createElement(Route, { path: "*", element: React.createElement(Guarded) })))),
  );
}
const said = () => host.textContent;

test("T2: the boundary's fault clears when the person goes elsewhere, by a link or Back", async () => {
  const quiet = console.error;
  console.error = () => {};
  try {
    await show("/fine");
    assert.match(said(), /The page at \/fine/);
    await act(async () => go("/broken"));
    assert.match(said(), /Render fault/i);
    await act(async () => go(-1));
    assert.match(said(), /The page at \/fine/, "Back");
    await act(async () => go("/broken"));
    await act(async () => go("/elsewhere"));
    assert.match(said(), /The page at \/elsewhere/, "a link");
  } finally {
    console.error = quiet;
  }
});

test("T2: a part whose file is gone reaching the boundary reloads the page once", async () => {
  const quiet = console.error;
  console.error = () => {};
  const reload = window.location.reload;
  let reloads = 0;
  window.location.reload = () => reloads++;
  sessionStorage.clear();
  try {
    await show("/gone");
    assert.equal(reloads, 1);
    // The reload did not help (the same failure soon after): the fault shows, and no second reload.
    await act(async () => go("/fine"));
    await act(async () => go("/gone"));
    assert.equal(reloads, 1);
    assert.match(said(), /Render fault/i);
    // Any other fault: no reload.
    sessionStorage.clear();
    await act(async () => go("/broken"));
    assert.equal(reloads, 1);
  } finally {
    window.location.reload = reload;
    console.error = quiet;
    sessionStorage.clear();
  }
});
