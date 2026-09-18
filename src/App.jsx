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
// worth doing until it matters. (/recruiters is the one exception: the
// workflow writes it a real index.html, because it is the address that goes
// on a résumé.)
//
// Two shells, not one. Everything under / is the cinematic: the door, the
// intro, the reticle, the console, the music-reactive chrome. Everything
// under /recruiters is the plain version of the same content, and it mounts
// NONE of that: no gate, no audio, no cursor, no scanlines, no effects. The
// split is made here, above both, so that nothing from one can leak into the
// other by accident. The two shells share the data files and nothing else.
import React, { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./sections/Footer";
import IntroCinematic from "./components/IntroCinematic";
import EntryGate from "./components/EntryGate";
import ErrorBoundary from "./components/ErrorBoundary";
import Console from "./components/Console";
import Cursor from "./components/Cursor";
import GpuNotice from "./components/GpuNotice";
import Home from "./routes/Home";
import WorkPage from "./routes/WorkPage";
import { stopAmbient } from "./lib/ambient";
import { LEAVE_SECONDS } from "./lib/cues";
import { initBeacon } from "./lib/beacon";
import { attachUiSfx } from "./lib/ui-sfx";
import { startReactive } from "./lib/reactive";
import { initEnv, LOW_POWER, setSessionEnv } from "./lib/env";
import { hasGpuAcceleration } from "./lib/gpu";

// The plain version is its own chunk: the cinematic never downloads it, and
// it never downloads the cinematic.
const Recruiters = lazy(() => import("./routes/Recruiters"));
const RecruiterWork = lazy(() => import("./routes/RecruiterWork"));

const isRecruiters = (pathname) =>
  pathname === "/recruiters" || pathname.startsWith("/recruiters/");

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Analytics. Its own effect so it cannot interfere with anything a page does
  // on mount, and it returns its own teardown so a hot reload does not leave a
  // second set of listeners attached. Both shells count.
  useEffect(() => initBeacon(), []);

  // The music belongs to the cinematic. Crossing to the plain version takes it
  // with it, because the AudioContext is module state and nothing over there
  // unmounts it: the track simply kept playing over a page that has no volume
  // control on it to stop with. The preference is left alone, so the door is
  // still there with the sound on when the reader comes back, and a stop this
  // side of a download in flight cancels that too.
  useEffect(() => {
    if (isRecruiters(pathname)) stopAmbient({ fade: LEAVE_SECONDS });
  }, [pathname]);

  if (isRecruiters(pathname)) {
    return (
      <ErrorBoundary>
        {/* No placeholder. An empty .rp picked up index.css's old ivory ground
            before recruiters.css had loaded, and flashed it across a page that
            opens dark. The body underneath is already near-black. */}
        <Suspense fallback={null}>
          <Routes>
            <Route path="/recruiters" element={<Recruiters />} />
            <Route path="/recruiters/work/:slug" element={<RecruiterWork />} />
            <Route path="/recruiters/*" element={<Recruiters />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  return <Cinematic />;
}

/** The site as designed: the door, the intro, and the page. */
function Cinematic() {
  // The interface blips and the music-reactive CSS variables. Both are
  // document-level listeners that return their own teardown. The environment
  // switches are mirrored onto <html> once so the CSS sees them from the
  // first frame.
  useEffect(() => attachUiSfx(), []);
  useEffect(() => startReactive(), []);
  useEffect(() => { initEnv(); }, []);

  // A browser drawing on the CPU gets the city turned down for this visit,
  // and is told so. The probe is one WebGL request, answered once per load
  // (src/lib/gpu.js). The switches it flips are the console's own, held in
  // a session layer that never reaches storage (src/lib/env.js), so
  // `fx reset` puts everything back for a reader who wants it regardless.
  // Only this shell: the plain version has nothing on it that needs a GPU.
  const [lowPower] = useState(() => !hasGpuAcceleration());
  useEffect(() => {
    if (lowPower) setSessionEnv(LOW_POWER);
  }, [lowPower]);

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
          {/* Backtick anywhere, the button in the header, or /console. */}
          <Console />
          <Cursor />
          <GpuNotice show={lowPower} />

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
