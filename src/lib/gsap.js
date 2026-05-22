// src/lib/gsap.js — GSAP + ScrollTrigger setup, wired through Lenis
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { getLenis } from "./lenis";

let registered = false;

export function setupGsap() {
  if (registered) return;
  try {
    gsap.registerPlugin(ScrollTrigger);
    // NOTE: We do NOT drive lenis.raf from gsap.ticker — lenis already runs its
    // own requestAnimationFrame loop in lib/lenis.js. Stepping it twice causes
    // double-time scroll. We only forward lenis scroll events to ScrollTrigger
    // so any future ScrollTrigger usage stays in sync.
    const lenis = getLenis();
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
    }
    registered = true;
  } catch (err) {
    console.warn("[gsap] setup failed", err);
  }
}

export { gsap, ScrollTrigger };
