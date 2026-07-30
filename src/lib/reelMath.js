// src/lib/reelMath.js — pure geometry for the projects reel.
//
// Everything visual in the reel derives from ONE number: the eased index.
// The old implementation computed the rail's click target with a different
// formula than the one driving the panel:
//
//   const stepH = (total * 60 + 40) / total / 100 * window.innerHeight;  // 65vh
//   const target = start + stepH * (i + 0.5);
//
// ...but `useScroll({offset:["start start","end end"]})` normalises over
// (wrapperHeight - viewportHeight) = 420vh, not the 520vh that formula assumes.
// The two drifted apart by a growing amount, which is why clicking "03" landed
// on project 05. The fix is not a corrected constant — it is having a single
// pair of inverse functions used in both directions, which is what this file is.
//
// Invariant, asserted by scripts/check-reel-math.mjs:
//   Math.round(easedIndex(progressForIndex(i, n), n)) === i   for every i < n

/** Scroll budget per project, in vh. Wrapper height = N * PER_VH + 100. */
export const PER_VH = 45;

// Within one project's slot: hold, wipe, hold. The wipe occupies the middle
// 42%, which gives a detent — a "channel change" — without scroll-snap, and
// therefore without trapping the user or fighting the modal.
const DWELL_IN = 0.3;
const DWELL_OUT = 0.72;

const smoothstep = (t) => t * t * (3 - 2 * t);

/** Total height of the scroll wrapper, in vh, for `n` projects. */
export const wrapperVh = (n) => n * PER_VH + 100;

/**
 * Map scroll progress (0..1 across the pinned wrapper) to a continuous index.
 * Integer values mean "settled on that project"; fractional means mid-wipe.
 */
export function easedIndex(p, n) {
  if (n <= 1) return 0;
  const u = Math.max(0, Math.min(n, p * n));
  const i = Math.min(n - 1, Math.floor(u));
  if (i >= n - 1) return n - 1;
  const f = u - i;
  if (f <= DWELL_IN) return i;
  if (f >= DWELL_OUT) return i + 1;
  return i + smoothstep((f - DWELL_IN) / (DWELL_OUT - DWELL_IN));
}

/**
 * The inverse: scroll progress that lands squarely in project `i`'s hold.
 * 0.15 sits in the middle of the leading dwell, so the target is a settled
 * frame — not a half-finished wipe.
 */
export function progressForIndex(i, n) {
  if (n <= 1) return 0;
  return (Math.max(0, Math.min(n - 1, i)) + 0.15) / n;
}

// Track geometry, in vw. Kept in viewport units on purpose: a `translateX`
// expressed in vw survives a window resize with no listener and no
// recalculation, which removes a whole class of desync.
export const CARD_VW = 72;
export const GAP_VW = 4;
export const STEP_VW = CARD_VW + GAP_VW;
/** Offset that centres card 0 in the viewport. */
export const LEAD_VW = (100 - CARD_VW) / 2;

/**
 * translateX for the track, in pixels, given a continuous index and the
 * viewport width.
 *
 * Pixels rather than a "…vw" string on purpose: framer-motion does not
 * interpolate arbitrary CSS units through `useTransform` into `style.x`, and
 * silently pins the transform when handed one. The caller re-renders on resize,
 * which is cheap because resizes are rare.
 */
export const trackXPx = (v, viewportWidth) =>
  (LEAD_VW - v * STEP_VW) * (viewportWidth / 100);
