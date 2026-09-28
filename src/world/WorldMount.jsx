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
//               section, about 70% behind a section being read.
//
// With the city off (`fx world off`, reduced motion, no GPU, WebGL failure)
// none of this renders and <html data-world="off"> gives back exactly the
// site it replaced: the plate in the hero, black sections, no smoothing.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import NightCity from "../components/NightCity";
import { useEnv } from "../lib/env";
import { hasGpuAcceleration } from "../lib/gpu";
import { usePrefersReducedMotion } from "../hooks";
import { INTRO_START } from "../lib/intro";
import { findWork } from "../data/work";
import { startScrollStage } from "./scroll-stage";
import { setStage, setWorld } from "./stage";
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
  const on = Boolean(env.world) && !reduced && gpu && !failed;
  const { pathname } = useLocation();

  const canvasRef = useRef(null);
  const scrimRef = useRef(null);
  const scrollRef = useRef(null);
  const liveRef = useRef(false);
  liveRef.current = live;

  // Before the first paint, so the page never shows a frame of the wrong
  // backgrounds: the sections go transparent and the hero drops its own
  // plate only while this layer is there to show through.
  useLayoutEffect(() => {
    document.documentElement.dataset.world = on ? "on" : "off";
    return () => {
      delete document.documentElement.dataset.world;
    };
  }, [on]);

  // Lenis and the shot maths run only while the city does.
  useEffect(() => {
    if (!on) return undefined;
    const s = startScrollStage({ scrim: scrimRef.current });
    scrollRef.current = s;
    return () => {
      scrollRef.current = null;
      s.stop();
    };
  }, [on]);

  useEffect(() => {
    setStage({ route: routeOf(pathname) });
    scrollRef.current?.resync();
  }, [pathname]);

  // Build the city after first paint, or at once if the door already asked
  // for it, and dispose it on the way out. `build` bumps to rebuild from
  // scratch: on an intro replay and after a lost WebGL context comes back.
  useEffect(() => {
    if (!on) return undefined;
    let alive = true;
    let world = null;
    const tier = pickTier();
    setStage({ status: "loading" });

    const start = () => {
      loadWorld(tier)
        .then(async (mod) => {
          if (!alive || !canvasRef.current) return;
          world = mod.createWorldScene(canvasRef.current, {
            tier,
            onFirstFrame: () => alive && setLive(true),
            onLost: () => alive && setLive(false),
          });
          setWorld(world);
          await world.warm();
          if (alive) setStage({ status: "ready" });
        })
        .catch((err) => {
          if (!alive) return;
          if (import.meta.env.DEV) console.warn("[world] the city did not load; keeping the plate", err);
          setStage({ status: "failed" });
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
      setStage({ status: "off" });
      setLive(false);
    };
  }, [on, build]);

  // An intro replay starts from a clean city: dispose everything and build
  // again from the cached chunk and model. The first intro keeps the city
  // the door warmed, which has never drawn a live frame yet.
  useEffect(() => {
    const onStart = () => {
      if (liveRef.current) setBuild((b) => b + 1);
    };
    window.addEventListener(INTRO_START, onStart);
    return () => window.removeEventListener(INTRO_START, onStart);
  }, []);

  // A lost context shows the poster; a restored one rebuilds on a new canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !on) return undefined;
    const onRestored = () => setBuild((b) => b + 1);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => canvas.removeEventListener("webglcontextrestored", onRestored);
  }, [on, build]);

  if (!on) return null;

  return (
    <div className="world-layer fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <NightCity className={`world-poster absolute inset-0 block ${live ? "is-covered" : ""}`} />
      <canvas
        key={build}
        ref={canvasRef}
        className={`world-canvas absolute inset-0 w-full h-full ${live ? "is-live" : ""}`}
      />
      <div ref={scrimRef} className="world-scrim absolute inset-0" />
    </div>
  );
}
