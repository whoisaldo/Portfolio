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
// worth doing until it matters. (/playground and /braindance are the
// exceptions: the workflow writes each a real index.html.)
//
// The homepage at / and the blog are not in here at all: Root.jsx sends them
// to src/front/ before this module loads. So did /recruiters, the plain
// version of this site, until the homepage made it redundant; its address
// forwards to / now.
//
// Two shells, not one. Everything but the braindance is the cinematic, with
// its scrolling page at /playground: the door, the intro, the reticle, the
// console, the music-reactive chrome. The split is made here, above both, so
// that nothing from one can leak into the other by accident.
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
import ViewModes from "./components/ViewModes";
import Home from "./routes/Home";
import WorkPage from "./routes/WorkPage";
import { stopAmbient } from "./lib/ambient";
import { runningContext } from "./lib/audio";
import { LEAVE_SECONDS } from "./lib/cues";
import { initBeacon, pageview } from "./lib/beacon";
import { attachUiSfx } from "./lib/ui-sfx";
import { startReactive } from "./lib/reactive";
import { initEnv, LOW_POWER, setSessionEnv } from "./lib/env";
import { PLAYGROUND } from "./data/site";
import { hasGpuAcceleration } from "./lib/gpu";
import WorldMount from "./world/WorldMount";

// The other way in, the braindance: the city with no page in front of it.
// Its own chunk and its own shell.
const Braindance = lazy(() => import("./braindance/Braindance"));

const isBraindance = (pathname) => pathname === "/braindance" || pathname.startsWith("/braindance/");

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Analytics. Its own effect so it cannot interfere with anything a page does
  // on mount, and it returns its own teardown so a hot reload does not leave a
  // second set of listeners attached. Every shell counts.
  useEffect(() => initBeacon(), []);
  // One view per route. Declared after initBeacon so, on the first render,
  // the beacon is listening before the first view is reported.
  useEffect(() => pageview(), [pathname]);

  // The music belongs to the cinematic. Leaving for the homepage or the blog
  // unmounts this whole module, but the AudioContext is module state and
  // would keep the track playing over a page with no volume control on it.
  // The preference is left alone, so the door is still there with the sound
  // on when the reader comes back, and a stop this side of a download in
  // flight cancels that too. Only when sound was ever let run: stopAmbient
  // makes a context if there is none, and a context nobody clicked for is
  // exactly what src/lib/audio.js exists to prevent.
  useEffect(() => () => {
    if (runningContext()) stopAmbient({ fade: LEAVE_SECONDS });
  }, []);

  if (isBraindance(pathname)) {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Braindance />
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
        <div className="min-h-screen bg-ink text-bone font-mono" data-shell="">
          {/* The city behind every page of this shell: a still plate first,
              the live world over it once it has loaded, and a scrim that
              steps it back behind anything being read. First in the tree,
              so everything after it paints on top. */}
          <WorldMount />

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
          {/* Look (H) and Cinema (C): the page put away, the city on its own. */}
          <ViewModes />
          <Cursor />
          <GpuNotice show={lowPower} />

          <Routes>
            <Route path={PLAYGROUND} element={<Home />} />
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
