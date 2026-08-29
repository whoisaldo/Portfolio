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
import { Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./sections/Footer";
import BootSequence from "./components/BootSequence";
import EntryGate from "./components/EntryGate";
import ErrorBoundary from "./components/ErrorBoundary";
import Console from "./components/Console";
import Home from "./routes/Home";
import WorkPage from "./routes/WorkPage";
import { initBeacon } from "./lib/beacon";

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Analytics. Its own effect so it cannot interfere with anything a page does
  // on mount, and it returns its own teardown so a hot reload does not leave a
  // second set of listeners attached.
  useEffect(() => initBeacon(), []);

  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-ink text-bone font-mono">
          {/* The boot sequence is an entrance for the site, not for every page.
              Replaying it when someone follows a link from one case study to
              the next would be theatre in the way of the content. */}
          {/* The door, then the boot, then the site. The gate mounts in the
              shell rather than on the home page because a reader who arrives
              on a deep link to a case study is still arriving for the first
              time. It shows once, ever. */}
          <EntryGate />
          {pathname === "/" && <BootSequence />}

          <Navbar />
          {/* Backtick anywhere, or /console. Not in the nav. */}
          <Console />

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
