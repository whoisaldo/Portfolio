// src/routes/Home.jsx: the single scrolling page.
//
// Everything that used to be App.jsx's body lives here, unchanged. App.jsx is
// now the router and the shell; this is one of two things the shell can show.
//
// The hash-restoration effect is here rather than in App because it is about
// THIS page's sections. On /work/:slug there are no sections to restore to,
// and running it there would be a no-op at best and a scroll fight at worst.
//
// The garage is the one section that is not in this module's chunk. It is
// the heaviest thing on the page and the last thing a reader reaches, and
// /recruiters downloads the same entry, so it is a lazy chunk
// (src/lib/garage3d.js) behind a shell that is here from the first paint:
// the section element, its id, its heading and a line saying it is on its
// way. A link to #garage has somewhere to land before the chunk does, and
// nothing about the garage delays the hero or the door.
import React, { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Chrome from "../components/Chrome";
import Hero from "../components/Hero";
import ProjectsSection from "../components/projects/ProjectsSection";
import ExperienceIndex from "../components/ExperienceIndex";
import About from "../sections/About";
import Stack from "../sections/Stack";
import Contact from "../sections/Contact";
import Glitch from "../components/ui/Glitch";
import { scrollToSection } from "../lib/scroll";
import { loadGarageSection, prepareGarageSection } from "../lib/garage3d";

// Sections after which a deep link lands: the garage's chunk changes their
// position when it arrives, so a link to one of them asks for it at once.
const AFTER_GARAGE = ["garage", "teardown", "contact"];

// React.lazy keeps a rejection for good; a retry needs a new one.
const lazyGarage = () => lazy(loadGarageSection);
let GarageImpl = lazyGarage();

/** The garage's chunk failed to load (or threw): say so, and offer it again. */
class GarageBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    if (import.meta.env.DEV) console.warn("[garage] section unavailable", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mt-12 rail-clear" role="alert">
        <p className="prose-dark text-dim">The garage did not load.</p>
        <button
          type="button"
          className="mt-4 mono-micro text-volt ink-underline"
          onClick={() => {
            GarageImpl = lazyGarage();
            this.setState({ failed: false });
            this.props.onRetry?.();
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}

/** The garage's section as the page's first paint has it; the rest of it
 *  (src/sections/Garage.jsx) fills it in when its chunk arrives. */
function GarageShell({ onMounted }) {
  const [ledeSlot, setLedeSlot] = useState(null);
  const [, setAttempt] = useState(0);
  return (
    <section id="garage" data-shot="garage" className="relative bg-ink border-t border-ink-line grain world-clear">
      <div className="gutter pt-24 md:pt-32 pb-24 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-70px" }}
          transition={{ duration: 0.7 }}
          className="rail-clear"
        >
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div>
              <p className="mono-label text-volt mb-4">05 // Garage</p>
              <Glitch as="h2" className="font-display uppercase text-display-1 text-primary block">
                Garage
              </Glitch>
            </div>
            <div ref={setLedeSlot} />
          </div>
          <div className="edge-rule mt-10" aria-hidden="true" />
        </motion.div>
        <GarageBoundary onRetry={() => setAttempt((n) => n + 1)}>
          <Suspense
            fallback={
              <p className="mt-12 min-h-[40svh] prose-dark text-dim rail-clear" role="status">
                Opening the garage.
              </p>
            }
          >
            <GarageMounted onMounted={onMounted}>
              <GarageImpl ledeSlot={ledeSlot} />
            </GarageMounted>
          </Suspense>
        </GarageBoundary>
      </div>
    </section>
  );
}

/** Tells the page once the garage's own content has committed. */
function GarageMounted({ onMounted, children }) {
  useEffect(() => {
    onMounted?.();
  }, [onMounted]);
  return children;
}

export default function Home() {
  // The deep link still to land, until the reader takes the scroll over
  // themselves; the garage's chunk arriving lands it once more.
  const pending = useRef(null);
  const onGarageMounted = useCallback(() => {
    if (pending.current) scrollToSection(pending.current);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // The Teardown section became the garage; a link to #teardown still lands.
    const raw = window.location.hash.slice(1);
    const hash = raw === "teardown" ? "garage" : raw;
    // The garage's chunk: at once for a link that lands at or past it,
    // otherwise once the page has loaded and is idle.
    const later = () => prepareGarageSection({ idle: true });
    if (AFTER_GARAGE.includes(raw)) prepareGarageSection();
    else if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    if (!hash) {
      window.scrollTo(0, 0);
      return () => window.removeEventListener("load", later);
    }
    pending.current = hash;
    const mine = () => {
      pending.current = null;
    };
    const taken = ["wheel", "touchstart", "keydown", "pointerdown"];
    taken.forEach((type) => window.addEventListener(type, mine, { once: true, passive: true }));

    // Deep links need to be re-applied after mount: at parse time the target
    // section does not exist yet (React has not rendered), so the browser's own
    // hash scroll has nothing to find and silently gives up at the top. Doing
    // it again on `load` corrects for the layout shift as fonts and key art
    // land. Without that, /#contact lands short by a screen or more.
    //
    // This now also carries the return trip from a case study: /work/x links
    // back to /#projects, which arrives as a client-side navigation with no
    // browser hash handling of its own at all.
    // Tried several times rather than once, because "the section is at its
    // final position" is not a moment this page can identify. Key art and two
    // variable fonts land after first paint and move everything below them, so
    // a single early call lands short by a screen or more.
    //
    // Deliberately not requestAnimationFrame alone: rAF is throttled to a
    // crawl in a background tab, so a link opened with cmd-click would never
    // scroll at all: it would just sit at the top when the reader switched to
    // it. A timeout still fires there.
    const go = () => scrollToSection(hash);
    const raf = requestAnimationFrame(go);
    const timers = [0, 120, 400].map((d) => setTimeout(go, d));
    window.addEventListener("load", go, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("load", go);
      window.removeEventListener("load", later);
      taken.forEach((type) => window.removeEventListener(type, mine));
      pending.current = null;
    };
  }, []);

  return (
    <>
      <Chrome />
      <main>
        <Hero />
        <ProjectsSection />
        <ExperienceIndex />
        <About />
        <Stack />
        <GarageShell onMounted={onGarageMounted} />
        <Contact />
      </main>
    </>
  );
}
