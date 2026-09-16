// src/App.jsx: the shell and the router.
//
// This used to be the whole page. It is now the frame around two of them: the
// scrolling home page, and a case study at /work/:slug.
//
// GitHub Pages has no server-side routing, so the deploy workflow copies
// index.html to 404.html and every unknown path falls through to this app,
// which then matches the route on the client. That works for a reader, with
// one caveat worth knowing: the fallback is served with an HTTP 404 status, so
// a crawler asked to index /work/philips-zero-touch is told the page does not
// exist even though it renders. Links shared with a person are fine; search
// engines are not. Fixing that properly means either pre-rendering each route
// to its own index.html at build time, or moving to a host that can rewrite. Not
// worth doing until it matters.
import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./sections/Footer";
import IntroCinematic from "./components/IntroCinematic";
import EntryGate from "./components/EntryGate";
import ErrorBoundary from "./components/ErrorBoundary";
import Console from "./components/Console";
import Cursor from "./components/Cursor";
import Home from "./routes/Home";
import WorkPage from "./routes/WorkPage";
import { initBeacon } from "./lib/beacon";
import { attachUiSfx } from "./lib/ui-sfx";
import { startReactive } from "./lib/reactive";

export default function App() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Analytics. Its own effect so it cannot interfere with anything a page does
  // on mount, and it returns its own teardown so a hot reload does not leave a
  // second set of listeners attached.
  useEffect(() => initBeacon(), []);

  // The interface blips and the music-reactive CSS variables. Both are
  // document-level listeners that return their own teardown.
  useEffect(() => attachUiSfx(), []);
  useEffect(() => startReactive(), []);

  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-ink text-bone font-mono">
          {/* The door, then the intro, then the site. Both mount in the
              shell rather than on the home page because a reader who arrives
              on a deep link to a case study is still arriving for the first
              time. The intro runs once per tab; following a link from one
              case study to the next never replays it. */}
          <EntryGate />
          <IntroCinematic />

          <Navbar />
          {/* Backtick anywhere, or /console. Not in the nav. */}
          <Console />
          <Cursor />

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/work/:slug" element={<WorkPage />} />
            {/* Anything else is a mistyped URL. On a site with six sections the
                home page is a better answer than a 404 screen. */}
            <Route path="*" element={<Home />} />
          </Routes>

          <Footer />
        </div>
      </MotionConfig>
    </ErrorBoundary>
  );
}
