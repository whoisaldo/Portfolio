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
import React, { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Chrome from "../components/Chrome";
import Hero from "../components/Hero";
import ProjectsSection from "../components/projects/ProjectsSection";
import ExperienceIndex from "../components/ExperienceIndex";
import About from "../sections/About";
import Stack from "../sections/Stack";
import Contact from "../sections/Contact";
import Glitch from "../components/ui/Glitch";
// Register retained legacy requests with the synchronous shell, before
// the lazy section or console has been requested. This imports no car data.
import "../lib/garage";
import { jumpToY, scrollToSection } from "../lib/scroll";
import { useEnv } from "../lib/env";
import { hasGpuAcceleration } from "../lib/gpu";
import { usePrefersReducedMotion } from "../hooks";
import { getGarageView, loadGarageSection, prepareGarageSection, setGarageView, useGarageView, useGarageSectionReady } from "../lib/garage3d";
import { GARAGE_BEATS, GARAGE_STATIONS } from "../data/world";
import { garageScrollFor, resyncScrollStage } from "../world/scroll-stage";
import { getWorld, setStage, stage, useStage } from "../world/stage";

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

// Where each station, and each beat inside the S6's visit, is in it, 0..1.
const STATION_P = { ...Object.fromEntries(GARAGE_STATIONS.map((st) => [st.id, st.p])), ...GARAGE_BEATS };
const stationAt = (p) => GARAGE_STATIONS.reduce((at, st) => (p >= st.p - 0.07 ? st.id : at), GARAGE_STATIONS[0].id);

/** The visit's readiness (agents/B5/CONTRACT.md 2.2), from the world's own
 *  state and the room's: whether the section can be the visit now, and if
 *  not, why not. */
function useAvailability(room) {
  const { status, garageWorld, context } = useStage();
  const reduced = usePrefersReducedMotion();
  const env = useEnv();
  const [gpu] = useState(() => hasGpuAcceleration());
  const worldReady = status === "ready" || garageWorld === "ready";
  if (!env.world) return { availability: "off", reason: null, worldReady };
  if (context === "lost") return { availability: "lost", reason: null, worldReady };
  if (context === "restoring") return { availability: "restoring", reason: null, worldReady };
  if (!gpu) return { availability: "unsupported", reason: null, worldReady };
  if (status === "failed" || garageWorld === "failed") return { availability: "failed", reason: "the city did not load", worldReady };
  if (!worldReady) {
    const loading = status === "loading" || garageWorld === "loading";
    // Under reduced motion the city is built only as the reader nears the
    // garage (src/world/WorldMount.jsx): until then it has not started.
    return { availability: loading ? "loading" : reduced ? "idle" : "off", reason: null, worldReady };
  }
  return { availability: room.state, reason: room.reason, worldReady };
}

/** The permanent semantic section. Its lazy content survives height changes.
 *  Text is usable until the complete room is ready, and after context loss.
 *  A ready room appears automatically. A reader already past it keeps that
 *  natural-height pass and sees the room on their next approach. */
function GarageShell({ onMounted, onLayout }) {
  const sectionRef = useRef(null);
  const [ledeSlot, setLedeSlot] = useState(null);
  const [, setAttempt] = useState(0);
  const authorized = useGarageSectionReady();
  const garage = useGarageView();
  const reduced = usePrefersReducedMotion();
  const { context } = useStage();
  const [approaching, setApproaching] = useState(false);
  const [room, setRoom] = useState({ state: "idle", reason: null });
  const [roomTry, setRoomTry] = useState(0);
  const { availability, reason, worldReady } = useAvailability(room);
  useEffect(() => {
    if (!worldReady) return undefined;
    let alive = true;
    const go = () => {
      const g = getWorld()?.garage;
      if (!alive || !g) return;
      setRoom({ state: "loading", reason: null });
      g.prepare().then(
        (complete) => alive && setRoom(complete ? { state: "ready", reason: null } : { state: "failed", reason: "The workshop is not available yet." }),
        (err) => alive && setRoom({ state: "failed", reason: err?.message ?? "The garage did not load." }),
      );
    };
    let id = null;
    if (roomTry || approaching) go();
    else id = window.requestIdleCallback ? window.requestIdleCallback(go, { timeout: 4000 }) : window.setTimeout(go, 1500);
    return () => {
      alive = false;
      if (id === null) return;
      if (window.cancelIdleCallback) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [worldReady, context, roomTry, approaching]);
  useEffect(() => setGarageView({ availability, reason }), [availability, reason]);

  const can = availability === "ready" && authorized;
  const [layout, setLayout] = useState("text");
  const cinematic = layout === "cinematic";
  const [auto, setAuto] = useState(false);
  const [fallback, setFallback] = useState(null);
  const [restoreAnchor, setRestoreAnchor] = useState(null);
  const [still, setStill] = useState(false);
  const savedP = useRef(null);
  const selectionKey = garage.selection ? `${garage.selection.carId}:${garage.selection.modId}` : "";
  const previousSelection = useRef(selectionKey);
  useLayoutEffect(() => {
    // A deliberate text selection during recovery replaces the old pose.
    // Incidental layout/availability changes keep the saved in-flight p.
    if (!cinematic && previousSelection.current !== selectionKey) savedP.current = null;
    previousSelection.current = selectionKey;
  }, [selectionKey, cinematic]);
  useEffect(() => {
    const r = sectionRef.current?.getBoundingClientRect();
    setAuto(can && (layout === "cinematic" || Boolean(r && r.bottom > 0)));
  }, [can, approaching, layout]);
  const want = can && (auto || garage.film) ? "cinematic" : "text";

  // ---- the transaction ----------------------------------------------------------
  const pending = useRef(null);
  useLayoutEffect(() => {
    if (want === layout) return;
    const el = sectionRef.current;
    if (!el) return;
    const vh = window.innerHeight;
    const r = el.getBoundingClientRect();
    const active = document.activeElement;
    const focusKey = active && el.contains(active) ? active.closest("[data-garage-anchor]")?.dataset.garageAnchor ?? "heading" : null;
    const going = want === "cinematic" && r.top < vh && r.bottom > 0
      ? { p: savedP.current ?? STATION_P[getGarageView().textStation] ?? 0 }
      : null;
    const station = stationAt(stage.garageProgress);
    let anchor = null;
    if (going) anchor = { kind: "p", p: going.p };
    else if (r.bottom <= 0) anchor = { kind: "past", height: r.height };
    else if (r.top < vh) {
      const on = focusKey && focusKey !== "heading" ? active : null;
      const box = on?.getBoundingClientRect();
      const visible = box && on.getClientRects().length > 0 && getComputedStyle(on).visibility !== "hidden" && box.bottom > 0 && box.top < vh;
      const heading = el.querySelector('[data-garage-anchor="heading"]');
      // The control the reader is on; else the station's heading, the shop's
      // own leaving the shop wall for the photographs.
      const key = visible ? focusKey : layout === "cinematic" && station === "shop" ? "shop" : "heading";
      const from = visible ? box.top : (heading?.getBoundingClientRect().top ?? r.top);
      anchor = { kind: "element", key, offset: from };
    }
    pending.current = { anchor, focus: focusKey, y: window.scrollY };
    document.documentElement.style.overflowAnchor = "none";
    if (want === "text" && layout === "cinematic") {
      savedP.current = stage.garageProgress;
      setFallback(station);
    }
    setRestoreAnchor(focusKey);
    setStill(true);
    setLayout(want);
  }, [want, layout]);

  // Near enough that the garage's city is worth building under reduced
  // motion (src/world/WorldMount.jsx).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !window.IntersectionObserver) return undefined;
    const io = new IntersectionObserver(([e]) => {
      setApproaching(e.isIntersecting);
      if (e.isIntersecting) setStage({ garageNear: true });
    }, { rootMargin: "150% 0px 150% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The camera behind the photographs waits at their station (Look and the
  // film see it); in the visit the scroll has it.
  const hold = !cinematic && can ? STATION_P[garage.textStation] ?? 0 : null;
  useLayoutEffect(() => {
    setStage({ garageVisit: cinematic, garageHold: cinematic ? null : hold });
  }, [cinematic, hold]);
  useEffect(() => () => setStage({ garageVisit: false, garageHold: null }), []);

  useLayoutEffect(() => {
    const t = pending.current;
    pending.current = null;
    if (!t) return undefined;
    const el = sectionRef.current;
    const visible = (node) => node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
    const target = (key) => [...el.querySelectorAll("[data-garage-anchor]")].find((node) => node.dataset.garageAnchor === key && visible(node))
      ?? el.querySelector('[data-garage-anchor="heading"]');
    setStage({ garageCut: stage.garageCut + 1 });
    resyncScrollStage();
    const a = t.anchor;
    const correct = () => {
      resyncScrollStage();
      let y = null;
      if (a?.kind === "p") y = garageScrollFor(a.p);
      else if (a?.kind === "past") y = t.y + el.getBoundingClientRect().height - a.height;
      else if (a?.kind === "element") y = window.scrollY + target(a.key).getBoundingClientRect().top - a.offset;
      if (y !== null) {
        jumpToY(Math.max(0, Math.round(y)));
        resyncScrollStage();
        onLayout?.();
      }
    };
    correct();
    if (t.focus) target(t.focus)?.focus({ preventScroll: true });
    let cancelled = false;
    let raf = 0;
    const cancel = () => {
      cancelled = true;
      document.documentElement.style.overflowAnchor = "";
    };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"];
    events.forEach((name) => window.addEventListener(name, cancel, { once: true, passive: true }));
    // Fonts can change the replacement's bounds after commit. Correct only
    // this transaction, and stop as soon as the reader takes over.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      raf = requestAnimationFrame(() => {
        if (!cancelled) correct();
        document.documentElement.style.overflowAnchor = "";
      });
    });
    return () => {
      cancel();
      cancelAnimationFrame(raf);
      events.forEach((name) => window.removeEventListener(name, cancel));
    };
  }, [layout, onLayout]);

  const retry = useCallback(() => {
    if (!getWorld()) window.dispatchEvent(new Event("aly:world-retry"));
    setRoomTry((n) => n + 1);
  }, []);
  const loading = <p className="mt-12 prose-dark text-dim rail-clear" role="status">Loading the garage.</p>;

  const boundary = (
    <GarageBoundary onRetry={() => setAttempt((n) => n + 1)}>
      {authorized ? <Suspense fallback={loading}>
        <GarageMounted onMounted={onMounted}>
          <GarageImpl
            ledeSlot={cinematic ? null : ledeSlot}
            cinematic={cinematic}
            availability={availability}
            reason={reason}
            reduced={reduced}
            fallback={fallback}
            still={still}
            restoreAnchor={restoreAnchor}
            onRetry={retry}
          />
        </GarageMounted>
      </Suspense> : loading}
    </GarageBoundary>
  );
  // One tree for both layouts: the section and the boundary under it are
  // the same elements either way, so the section's component is never
  // mounted again by a change of layout.
  return (
    <section
      ref={sectionRef}
      id="garage"
      data-shot="garage"
      data-garage-layout={layout}
      className={cinematic ? "relative world-clear" : "relative bg-ink border-t border-ink-line grain"}
      style={cinematic ? { height: "700svh" } : undefined}
    >
      <div className={cinematic ? "sticky top-0 h-[100svh] overflow-hidden" : "gutter pt-24 md:pt-32 pb-24 md:pb-32"}>
        {cinematic ? (
          <div className="gutter pt-20 md:pt-24 rail-clear">
            <p data-garage-anchor="heading" tabIndex={-1} className="mono-label text-volt focus:outline-none">
              05 // Garage
            </p>
            <h2 className="sr-only">Garage</h2>
          </div>
        ) : (
          <motion.div
            initial={still || reduced ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.7 }}
            className="rail-clear"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <div>
                <p data-garage-anchor="heading" tabIndex={-1} className="mono-label text-volt mb-4 focus:outline-none">
                  05 // Garage
                </p>
                <Glitch as="h2" className="font-display uppercase text-display-1 text-primary block">
                  Garage
                </Glitch>
              </div>
              <div ref={setLedeSlot} />
            </div>
            <div className="edge-rule mt-10" aria-hidden="true" />
          </motion.div>
        )}
        {boundary}
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
  const { status } = useStage();
  const env = useEnv();
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (status !== "ready" && status !== "failed" && env.world && !reduced) return undefined;
    const prepare = () => prepareGarageSection({ idle: true });
    if (document.readyState === "complete") prepare();
    else window.addEventListener("load", prepare, { once: true });
    return () => window.removeEventListener("load", prepare);
  }, [status, env.world, reduced]);
  const onGarageMounted = useCallback(() => {
    if (pending.current) scrollToSection(pending.current);
  }, []);
  // The garage changed layout under the reader and put their view back
  // itself: a retry of the link must not move it again.
  const onGarageLayout = useCallback(() => {
    pending.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // The Teardown section became the garage; a link to #teardown still lands.
    const raw = window.location.hash.slice(1);
    const hash = raw === "teardown" ? "garage" : raw;
    // The garage's chunk: at once for a link that lands at or past it,
    // otherwise once the page has loaded and is idle.
    if (AFTER_GARAGE.includes(raw)) prepareGarageSection();
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
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
    // (Only while the link is still to land: once the reader or the
    // garage's own layout has moved the page, a retry would undo it.)
    const go = () => pending.current && scrollToSection(hash);
    const raf = requestAnimationFrame(go);
    const timers = [0, 120, 400].map((d) => setTimeout(go, d));
    window.addEventListener("load", go, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("load", go);
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
        <GarageShell onMounted={onGarageMounted} onLayout={onGarageLayout} />
        <Contact />
      </main>
    </>
  );
}
