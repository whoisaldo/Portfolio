// src/lib/lenis.js — Lenis smooth scroll singleton
import Lenis from "lenis";

let instance = null;
let rafId = null;

export function initLenis() {
  if (instance) return instance;

  try {
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) return null;

    instance = new Lenis({
      duration: 0.9,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      lerp: 0.13,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.6,
    });

    const loop = (time) => {
      instance?.raf(time);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return instance;
  } catch (err) {
    console.warn("[lenis] init failed; falling back to native scroll", err);
    instance = null;
    return null;
  }
}

export function destroyLenis() {
  if (rafId) cancelAnimationFrame(rafId);
  instance?.destroy();
  instance = null;
  rafId = null;
}

export function getLenis() {
  return instance;
}
