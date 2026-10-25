// src/front/Front.jsx: the homepage, the blog and the work pages, the first
// thing at aliyounes.dev.
//
// A shell of its own, so none of the cinematic comes with it. No door, no
// intro, no audio, no city, no cursor. It also replaced /recruiters, the
// plain version of the site, which forwards here now (Root.jsx).
// Root.jsx routes here before App.jsx is ever downloaded, so this page costs
// what it shows and nothing more.
import React, { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { initBeacon, pageview } from "../lib/beacon";
import FrontHome from "./FrontHome";
import BlogIndex from "./BlogIndex";
import "./front.css";

const BlogPost = lazy(() => import("./BlogPost"));
const WorkPage = lazy(() => import("./WorkPage"));

// Where the reader was on each page of this tab's history, by entry, so Back
// and Forward put them there. The browser would, but the playground turns
// its restoration off (App.jsx), and every entry made after that inherits
// it, so this shell keeps its own and turns it off too. Mirrored to the
// tab's sessionStorage, the last hundred entries of it, so a reload, which
// keeps the entry and its key, keeps the place too. Any other new visit
// starts afresh.
const SAVED = "front:places";
const places = new Map(reloaded() ? stored() : []);
// Back's place, still to land if the page was a chunk not yet in (Late).
let pending = null;

export default function Front() {
  const { pathname, key } = useLocation();
  const navigation = useNavigationType();

  // The playground counts its visits; so does this.
  useEffect(() => initBeacon(), []);
  useEffect(() => pageview(), [pathname]);

  // Turns off the playground's scanlines while this shell is up; see front.css.
  useLayoutEffect(() => {
    document.body.classList.add("front");
    return () => document.body.classList.remove("front");
  }, []);

  // Kept as the reader scrolls rather than read on the way out: by the time
  // a route change commits, the next page is already in, and the old offset
  // can be clipped to its height.
  useLayoutEffect(() => {
    window.history.scrollRestoration = "manual";
    const keep = () => places.set(key, window.scrollY);
    window.addEventListener("scroll", keep, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("scroll", keep);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [key]);

  // A new page starts at its top. Back, forward and reload go to where the
  // reader was on that entry, or its top if this shell never saw it.
  useLayoutEffect(() => {
    if (navigation !== "POP") {
      window.scrollTo(0, 0);
      return undefined;
    }
    const y = places.get(key) ?? 0;
    land(y);
    pending = y;
    return () => {
      pending = null;
    };
  }, [key, navigation]);

  return (
    <div className="min-h-dvh bg-ink font-sans text-bone">
      <Routes>
        <Route path="/" element={<FrontHome />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route
          path="/blog/:slug"
          element={
            <Late>
              <BlogPost />
            </Late>
          }
        />
        <Route
          path="/work/:slug"
          element={
            <Late>
              <WorkPage />
            </Late>
          }
        />
        {/* Root.jsx sends everything under /blog/ and /work/ here, so a
            deeper path gets the not-found page its section already has,
            with no slug to find, rather than an empty page. */}
        <Route
          path="/blog/*"
          element={
            <Late>
              <BlogPost />
            </Late>
          }
        />
        <Route
          path="/work/*"
          element={
            <Late>
              <WorkPage />
            </Late>
          }
        />
      </Routes>
    </div>
  );
}

function reloaded() {
  return performance.getEntriesByType?.("navigation")[0]?.type === "reload";
}

// Storage can be off or full; the place is a nicety, so either way goes on.
function stored() {
  try {
    return JSON.parse(sessionStorage.getItem(SAVED)) ?? [];
  } catch {
    return [];
  }
}

function save() {
  try {
    sessionStorage.setItem(SAVED, JSON.stringify([...places].slice(-100)));
  } catch {
    // Kept in memory only.
  }
}

// Puts the reader at y and keeps them there while the page's fonts come in.
// The browser would otherwise follow the text it landed on as it reflows,
// and the place would drift by the difference on every reload.
function land(y) {
  const root = document.documentElement;
  window.scrollTo(0, y);
  root.style.overflowAnchor = "none";
  document.fonts.ready.then(() => {
    root.style.overflowAnchor = "";
  });
}

/** A page in a chunk of its own, and Back's place landed again once it is in. */
function Late({ children }) {
  return (
    <Suspense fallback={null}>
      {children}
      <Landed />
    </Suspense>
  );
}

function Landed() {
  useLayoutEffect(() => {
    if (pending !== null) land(pending);
    pending = null;
  }, []);
  return null;
}
