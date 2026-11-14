// test/page.mjs: the private blog's real page (./src/front/private/), mounted
// in happy-dom, against a stats service made up here.
//
// The page's modules are loaded through Vite, as the dev server loads them,
// so JSX and the CSS imports need nothing else. Every request goes to the
// fake service below through `fetch`; nothing leaves the process. Its
// readers, drafts and words are all made up.
//
// The service keeps the contract the page is written against: a create
// (POST /api/draft-comments) may carry `id`, a UUID the page made for the
// message, and `as`, the username the page believes is signed in. Sent again
// with the same id, the same person, draft, thread and words, it answers 200
// with the comment it has and writes nothing; anything else holding that id
// is a 409 with `field: "id"`. An `as` that is not the signed-in reader is a
// 409 with `field: "as"`, and nothing is written. `legacy: true` makes it the
// service as live before that, which ignores both.
import { window } from "./dom.mjs";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Node has storage globals of its own, unset without a file: the browser's here.
for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
process.env.VITE_COMMENTS_API = "https://stats.test";
export const API = process.env.VITE_COMMENTS_API;

let vite = null;
/** The page's modules, loaded once per test file. */
export async function load() {
  vite ??= await createServer({
    configFile: false,
    root: new URL("..", import.meta.url).pathname,
    plugins: [react()],
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true, hmr: false, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  return {
    PrivateBlog: (await vite.ssrLoadModule("/src/front/private/PrivateBlog.jsx")).default,
  };
}
export const unload = async () => {
  await vite?.close();
  vite = null;
};

export const READERS = {
  ada: { name: "Ada Reader", username: "ada", owner: false },
  bo: { name: "Bo Reader", username: "bo", owner: false },
  owner: { name: "Ali", username: null, owner: true },
};

export const BODY = [
  "The lighthouse keeper rose before the gulls and climbed the stairs twice.",
  "",
  "By the harbour wall the fishing boats waited for the tide to turn.",
  "",
  "A short last line about the evening fog.",
].join("\n");

const iso = (n) => new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A made-up stats service: one browser's cookie, its readers' drafts and their threads. */
export function service({ who = "ada", legacy = false } = {}) {
  const s = {
    signedIn: who && READERS[who],
    legacy,
    draft: { slug: "made-up", title: "A made-up draft", date: "2026-01-01", summary: "Made up.", body: BODY, updated_at: iso(1) },
    // Who may read the draft.
    readers: new Set(["ada", "bo"]),
    comments: [],
    requests: [],
    // Per path, a function (req) => Promise<"respond"> to hold or fail a request.
    hooks: [],
    failLogout: false,
    clock: 10,
  };
  const can = () => s.signedIn && (s.signedIn.owner || s.readers.has(s.signedIn.username));
  const json = (status, data) => new Response(data == null ? null : JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  const view = (c) => ({ ...c, mine: !!s.signedIn && c.by === (s.signedIn.username ?? "owner") });
  const seen = () => s.comments.filter((c) => s.signedIn.owner || c.by === s.signedIn.username || (c.thread && s.comments.find((r) => r.id === c.thread)?.by === s.signedIn.username)).map(view);

  function create(b) {
    const by = s.signedIn.username ?? "owner";
    if (!s.legacy) {
      if (b.as !== undefined && (s.signedIn.owner || b.as !== s.signedIn.username)) return json(409, { error: "You're signed in as someone else in this browser now.", field: "as" });
      if (b.id !== undefined && !UUID.test(b.id)) return json(400, { error: "That id isn't one.", field: "id" });
    }
    const fields = { thread: b.thread ?? null, body: b.body ?? "", quote: b.quote ? { exact: b.quote, prefix: b.prefix ?? "", suffix: b.suffix ?? "" } : null, suggestion: b.suggestion ?? null };
    if (!s.legacy && b.id !== undefined) {
      const had = s.comments.find((c) => c.id === b.id);
      if (had) {
        const same = had.by === by && !had.deleted && JSON.stringify([had.thread, had.body, had.quote, had.suggestion]) === JSON.stringify([fields.thread, fields.body, fields.quote, fields.suggestion]);
        return same ? json(200, { comment: view(had) }) : json(409, { error: "That message was already sent as something else. Send it again.", field: "id" });
      }
    }
    const c = {
      id: !s.legacy && b.id !== undefined ? b.id : crypto.randomUUID(),
      ...fields,
      by,
      author: { name: s.signedIn.name, owner: s.signedIn.owner },
      resolved: null,
      accepted: null,
      anchor: null,
      created_at: iso(s.clock++),
      edited_at: null,
    };
    s.comments.push(c);
    return json(201, { comment: view(c) });
  }

  async function answer(url, init = {}) {
    const u = new URL(url);
    const method = init.method || "GET";
    const body = init.body ? JSON.parse(init.body) : null;
    const req = { method, path: u.pathname, query: Object.fromEntries(u.searchParams), body, as: s.signedIn?.username ?? null };
    s.requests.push(req);
    for (const hook of s.hooks) {
      const r = await hook(req);
      if (r === "network") throw new TypeError("Failed to fetch");
      if (r instanceof Response) return r;
    }
    if (u.pathname === "/api/reader") {
      if (u.searchParams.get("a") === "logout") {
        if (s.failLogout) throw new TypeError("Failed to fetch");
        s.signedIn = null;
        return json(200, { viewer: null });
      }
      return json(200, { viewer: s.signedIn ? { ...s.signedIn } : null });
    }
    if (u.pathname === "/api/drafts") {
      if (!s.signedIn) return json(404, { error: "not found" });
      if (u.searchParams.has("slug")) return u.searchParams.get("slug") === s.draft.slug && can() ? json(200, { draft: s.draft }) : json(404, { error: "not found" });
      return json(200, { drafts: can() ? [{ slug: s.draft.slug, title: s.draft.title, date: s.draft.date, summary: s.draft.summary }] : [] });
    }
    if (u.pathname === "/api/draft-comments") {
      if (!can()) return json(404, { error: "not found" });
      if (method === "GET") return json(200, { v: String(s.comments.length), comments: seen(), draft_updated_at: s.draft.updated_at });
      if (method === "POST") return create(body);
      if (method === "PATCH") {
        const c = s.comments.find((x) => x.id === body.id);
        if (!c) return json(404, { error: "not found" });
        if ("body" in body) Object.assign(c, { body: body.body, edited_at: iso(s.clock++) });
        return json(200, { comment: view(c) });
      }
    }
    return json(400, { error: "not here" });
  }
  s.fetch = (url, init) => answer(String(url), init);
  s.posts = () => s.requests.filter((r) => r.method === "POST" && r.path === "/api/draft-comments");
  return s;
}

// ---- the page ----------------------------------------------------------------

let root = null;
let host = null;

/** Lets every pending promise, timer of `ms` and effect run, inside act(). */
export async function settle(ms = 0) {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, ms ? ms / 4 : 0));
    });
  }
}

/** Waits until `fn()` is truthy, or fails saying `what`. */
export async function until(fn, what, timeout = 3000) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}\n${document.body.textContent.slice(0, 1500)}`);
    await settle(20);
  }
}

/** The screen's width: the comments are a margin from 1240 px, a sheet below. */
export async function resize(width) {
  // happy-dom's media queries take each listener to start out not matching,
  // so a margin-wide screen would never be heard to narrow: the width it has
  // is said once first (a pixel more: the same width is no resize).
  await act(async () => window.happyDOM.setViewport({ width: window.innerWidth + 1, height: 900 }));
  await act(async () => window.happyDOM.setViewport({ width, height: 900 }));
  await settle();
}

/** Mounts the page at `path` with `fake` as the service, at `width`. */
export async function mount(PrivateBlog, fake, { path = "/privateblog/made-up", width = 1300 } = {}) {
  globalThis.fetch = fake.fetch;
  window.happyDOM.setViewport({ width, height: 900 });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(Routes, null, React.createElement(Route, { path: "/privateblog/*", element: React.createElement(PrivateBlog) })),
      ),
    ),
  );
  await settle();
}

/** Takes the page away, as a reload or a tab the phone threw away does; what the page keeps on leaving is kept. */
export async function unmount() {
  if (!root) return;
  await act(async () => window.dispatchEvent(new window.Event("pagehide")));
  await act(async () => root.unmount());
  host.remove();
  root = host = null;
  document.body.replaceChildren();
}

/** A reload: the page away and back, the browser's storage as it was. */
export async function reload(PrivateBlog, fake, opts) {
  await unmount();
  await mount(PrivateBlog, fake, opts);
}

/** Types `value` into a textarea or input as a person does: React hears an input event. */
export async function type(el, value) {
  await act(async () => {
    const proto = el instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

export async function click(el) {
  await act(async () => el.click());
  await settle();
}

export async function press(el, key, mods = {}) {
  await act(async () => el.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mods })));
  await settle();
}

/** The button whose text is `name` exactly (or matches it), within `inside`. */
export const button = (name, inside = document) =>
  [...inside.querySelectorAll("button")].find((b) => (name instanceof RegExp ? name.test(b.textContent.trim()) : b.textContent.trim() === name));

/** A textarea by its label. */
export const field = (label, inside = document) => inside.querySelector(`textarea[aria-label="${label}"]`);

/**
 * Selects the words `text` in the draft and presses the button by the
 * selection, "Comment" or "Suggest edit", as a reader does.
 */
export async function selectAnd(text, which = "Comment") {
  const article = await until(() => document.querySelector(".post-body"), "the draft's text");
  const walker = document.createTreeWalker(article, window.NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode()) && !node.data.includes(text));
  if (!node) throw new Error(`no "${text}" in the draft`);
  const at = node.data.indexOf(text);
  const range = document.createRange();
  range.setStart(node, at);
  range.setEnd(node, at + text.length);
  await act(async () => {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new window.Event("selectionchange"));
  });
  const b = await until(() => button(which === "Comment" ? /^Comment/ : which, document.querySelector(".draft-select-group") || document.createElement("div")), `the "${which}" button by the selection`);
  await click(b);
}

/** What is kept in this browser's storage for the draft, by key. */
export function storage(prefix = "draft-unsent:") {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(prefix)) out[k] = JSON.parse(localStorage.getItem(k));
  }
  return out;
}

/** The page's whole text, spaces folded. */
export const text = () => document.body.textContent.replace(/\s+/g, " ");
