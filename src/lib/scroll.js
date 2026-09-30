// src/lib/scroll.js: scrolling that behaves across a multi-viewport page.
//
// `html { scroll-behavior: smooth }` used to be global. With a 460vh pinned
// reel in the middle of the page, a smooth jump from the hero to the contact
// section animates for several seconds, strobing through all eight projects on
// the way. Short hops still want smooth; long ones want to just arrive.
//
// When the city is live behind the page, Lenis owns the scroll (see
// src/world/scroll-stage.js, which creates it and hands it over with
// attachLenis). Every jump then goes through Lenis, so the smoothing and the
// jump never fight over the same frame, and the rule above carries over as
// `immediate` for anything over three viewports. With the city off there is
// no Lenis and this is the plain window scroll it always was.

const LONG_JUMP_VIEWPORTS = 3;

let lenis = null;
const holds = new Set();

/** The scroll stage hands its Lenis over here, and takes it back (null). */
export function attachLenis(instance) {
  lenis = instance;
  if (lenis) syncHolds();
}

function syncHolds() {
  if (!lenis) return;
  if (holds.size) lenis.stop();
  else lenis.start();
}

/**
 * Hold the page still (`on`) or let it go. The door, the intro, the console
 * and the expanded deck each hold it by their own key, because Lenis scrolls
 * the window programmatically and `overflow: hidden` on the body does not stop
 * a programmatic scroll. Released only when every key has let go.
 */
export function holdScroll(key, on) {
  if (on) holds.add(key);
  else holds.delete(key);
  syncHolds();
}

/** Scroll to an absolute Y: smooth when close, instant when far. */
export function scrollToY(y) {
  const distance = Math.abs(y - window.scrollY);
  const far = distance > window.innerHeight * LONG_JUMP_VIEWPORTS;
  if (lenis) {
    lenis.scrollTo(y, { immediate: far || prefersReducedMotion(), force: true });
    return;
  }
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
