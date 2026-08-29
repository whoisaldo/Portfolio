// src/lib/scroll.js: scrolling that behaves across a multi-viewport page.
//
// `html { scroll-behavior: smooth }` used to be global. With a 460vh pinned
// reel in the middle of the page, a smooth jump from the hero to the contact
// section animates for several seconds, strobing through all eight projects on
// the way. Short hops still want smooth; long ones want to just arrive.

const LONG_JUMP_VIEWPORTS = 3;

/** Scroll to an absolute Y: smooth when close, instant when far. */
export function scrollToY(y) {
  const distance = Math.abs(y - window.scrollY);
  const far = distance > window.innerHeight * LONG_JUMP_VIEWPORTS;
  window.scrollTo({
    top: y,
    behavior: far || prefersReducedMotion() ? "instant" : "smooth",
  });
}

/** Scroll an element into view, clearing the fixed navbar. */
export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  scrollToY(el.getBoundingClientRect().top + window.scrollY - offset);
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
