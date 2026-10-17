// src/world/WorldMount.jsx: the city behind the page, mounted once.
//
// Lives in App.jsx's cinematic shell, above the routes, so it survives a
// route change and a case study flies rather than cuts. Never under
// /recruiters: that shell does not render this component at all.
//
// Three layers, fixed, behind everything, aria-hidden:
//
//   the poster  the neon plate (NightCity.jsx), painted on the first frame
//               exactly as the hero used to paint it. It is the page's first
//               paint and its LCP, and the city never delays it.
//   the canvas  the live city, lazily imported after first paint (or while
//               the door is up), crossfaded over the poster on its first
//               real frame. The plate and the hero shot share one camera,
//               so the crossfade is quiet.
//   the scrim   black, at the opacity the scroll stage writes into
//               `--world-dim`: nothing over the hero and the contact
//               section, about a third behind a section being read.
//   the chapter the number of the section a flight is headed for, huge and
//               drawn in outline, on the city and under the page: it comes
//               up as a flight gets going and the page steps back, and is
//               gone again as the next shot lands (scroll-stage.js).
//
// With the city off (`fx world off`, reduced motion, no GPU, WebGL failure)
// none of this renders and <html data-world="off"> gives back exactly the
// site it replaced: the plate in the hero, black sections, no smoothing.
//
// Reduced motion keeps that still page everywhere but in the garage, whose
// visit is a place rather than a flight (src/routes/Home.jsx). There the
// city is built for the garage alone as the reader nears it, on the one
// canvas as ever: <html data-world> stays "off" (so nothing else on the page
// changes, and Look and the film are not offered), <html data-world-garage>
// says it is there, and the canvas shows only while the garage's visit is
// up on screen. The page scrolls natively, the camera cuts from pose to
// pose, nothing moves by itself, and the loop rests whenever the visit is
// not on screen. Its readiness is `garageWorld` on the stage, not `status`.
//
// A lost WebGL context is said at once (`context` on the stage: "lost",
// then "restoring" while the city is built again on a new canvas), so the
// garage can give way to its text without waiting on anything.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import NightCity from "../components/NightCity";
import { useEnv } from "../lib/env";
import { hasGpuAcceleration } from "../lib/gpu";
import { usePrefersReducedMotion } from "../hooks";
import { DOOR_OPEN } from "../lib/intro";
import { visitEnabled } from "../lib/garage3d";
import { findWork } from "../data/work";
import { startScrollStage } from "./scroll-stage";
import { coverWorld, setStage, setWorld, stage, useStage } from "./stage";
import { loadWorld } from "./load";
import { pickTier } from "./quality";

/** The route, as the world understands it. */
function routeOf(pathname) {
  const m = pathname.match(/^\/work\/([^/]+)/);
  if (!m) return { kind: "home" };
  const hit = findWork(decodeURIComponent(m[1]));
  return hit ? { kind: hit.kind, slug: hit.entry.slug } : { kind: "home" };
}

export default function WorldMount() {
  const env = useEnv();
  const reduced = usePrefersReducedMotion();
  const [gpu] = useState(() => hasGpuAcceleration());
  const [failed, setFailed] = useState(false);
  const [build, setBuild] = useState(0);
  const [live, setLive] = useState(false);
  const { garageNear, section, garageVisit } = useStage();
  // Once the reader has come near the garage, the garage's city stays built.
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (garageNear) setNear(true);
  }, [garageNear]);
  const full = Boolean(env.world) && !reduced && gpu && !failed;
  const garageOnly = Boolean(env.world) && reduced && gpu && !failed && visitEnabled() && near;
  const on = full || garageOnly;
  const statusKey = full ? "status" : "garageWorld";
  const { pathname } = useLocation();

  const canvasRef = useRef(null);
  const scrimRef = useRef(null);
  const chapterRef = useRef(null);
  const scrollRef = useRef(null);
  const liveRef = useRef(false);
  liveRef.current = live;

  // Before the first paint, so the page never shows a frame of the wrong
  // backgrounds: the sections go transparent and the hero drops its own
  // plate only while this layer is there to show through.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.world = full ? "on" : "off";
    if (garageOnly) root.dataset.worldGarage = "on";
    return () => {
      delete root.dataset.world;
      delete root.dataset.worldGarage;
    };
  }, [full, garageOnly]);

  // Lenis and the shot maths run only while the city does; for the garage
  // alone, without Lenis (native scroll) and without the chapter card.
  useEffect(() => {
    if (!on) return undefined;
    const s = startScrollStage({ scrim: scrimRef.current, chapter: full ? chapterRef.current : null, smooth: full });
    scrollRef.current = s;
    return () => {
      scrollRef.current = null;
      s.stop();
    };
  }, [on, full]);

  // The garage's city under reduced motion: resting, and its canvas hidden,
  // unless the garage's visit is on screen; shown only once a frame of the
  // visit has been drawn, never one left over from the warm-up.
  const showing = garageOnly && section === "garage" && garageVisit;
  useEffect(() => {
    if (!garageOnly) return undefined;
    coverWorld("still", !showing);
    let raf = 0;
    const root = document.documentElement;
    if (showing && live) raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => (root.dataset.worldGarage = "shown"))));
    else root.dataset.worldGarage = "on";
    return () => {
      cancelAnimationFrame(raf);
      coverWorld("still", false);
    };
  }, [garageOnly, showing, live]);

  useEffect(() => {
    setStage({ route: routeOf(pathname) });
    scrollRef.current?.resync();
  }, [pathname]);

  // Build the city after first paint, or at once if the door already asked
  // for it, and dispose it on the way out. `build` bumps to rebuild from
  // scratch: when the door is put back up, and after a lost WebGL context
  // comes back.
  useEffect(() => {
    if (!on) return undefined;
    let alive = true;
    let world = null;
    const tier = pickTier();
    const key = statusKey;
    let didFail = false;
    setStage({ [key]: "loading", ...(stage.context === "lost" ? { context: "restoring" } : {}) });

    const start = () => {
      loadWorld(tier)
        .then(async (mod) => {
          if (!alive || !canvasRef.current) return;
          world = mod.createWorldScene(canvasRef.current, {
            tier,
            reduced,
            onFirstFrame: () => alive && setLive(true),
            // A lost context shows the poster, and the city is not ready
            // again until the restored one has been rebuilt.
            onLost: () => {
              if (!alive) return;
              setLive(false);
              setStage({ [key]: "loading", context: "lost" });
            },
          });
          setWorld(world);
          await world.warm();
          if (alive) setStage({ [key]: "ready", context: "ok" });
        })
        .catch((err) => {
          if (!alive) return;
          if (import.meta.env.DEV) console.warn("[world] the city did not load; keeping the plate", err);
          didFail = true;
          setStage({ [key]: "failed", context: "ok" });
          setFailed(true);
        });
    };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1200 })
      : window.setTimeout(start, 200);

    return () => {
      alive = false;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      world?.dispose();
      setWorld(null);
      setStage({ [key]: didFail ? "failed" : "off" });
      setLive(false);
    };
  }, [on, build, statusKey, reduced]);

  // Retry repairs this renderer lifecycle without reopening the intro.
  useEffect(() => {
    const retry = () => { setFailed(false); setBuild((n) => n + 1); };
    window.addEventListener("aly:world-retry", retry);
    return () => window.removeEventListener("aly:world-retry", retry);
  }, []);

  // A reader sent back to the door gets a clean city: dispose everything
  // and build again from the cached chunk and model while the door is up. A
  // replay from the footer or the Konami code keeps the city it has, because
  // the intro opens on the city's own voxel moon from its first frame;
  // beginIntro puts the car back on its mark and drops the route and the
  // shot the page left the city on.
  useEffect(() => {
    const onDoor = () => {
      if (liveRef.current) setBuild((b) => b + 1);
    };
    window.addEventListener(DOOR_OPEN, onDoor);
    return () => window.removeEventListener(DOOR_OPEN, onDoor);
  }, []);

  // A lost context shows the poster; a restored one rebuilds on a new canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !on) return undefined;
    const onRestored = () => setBuild((b) => b + 1);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => canvas.removeEventListener("webglcontextrestored", onRestored);
  }, [on, build, statusKey]);

  if (!on) return null;

  // (The garage's city alone has no poster to cover and no chapter card:
  // the page it sits under is the still one.)
  return (
    <div className="world-layer fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {full && <NightCity className={`world-poster absolute inset-0 block ${live ? "is-covered" : ""}`} />}
      <canvas
        key={`${build}-${statusKey}`}
        ref={canvasRef}
        className={`world-canvas absolute inset-0 w-full h-full ${live ? "is-live" : ""}`}
      />
      <div ref={scrimRef} className="world-scrim absolute inset-0" />
      {full && (
        <div ref={chapterRef} className="world-chapter absolute inset-0">
          <div className="world-chapter-card">
            <span data-chapter-num="" className="world-chapter-num" />
            <span data-chapter-label="" className="world-chapter-label mono-label" />
          </div>
        </div>
      )}
    </div>
  );
}
