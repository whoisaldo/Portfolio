// src/world/scroll-stage.js: the page, measured in shots.
//
// The city holds a camera shot per section and flies between them as the
// reader scrolls. This turns window.scrollY into the number that drives that:
// a continuous `position`, where 2.0 means "holding the Experience shot" and
// 2.4 means "40% of the way from Experience to About". The rule is the one the
// reference used and it is the right one for a page of tall sections:
//
//   HOLD shot i while section i fills the screen, so a reader who stops to
//   read is reading over a still frame;
//   MORPH while the next section rises from the bottom of the viewport to 20%
//   from the top, so every flight happens while the boundary between two
//   sections is on screen, which is when the reader is between two things
//   anyway;
//
//   holdEnd_i   = max(top_i - 0.2vh, top_i + height_i - vh)
//   nextStart_i = top_{i+1} - 0.2vh
//
// and the bottom of the page finishes the last morph, because the contact
// section is shorter than a screen and would otherwise never arrive.
//
// It also owns Lenis. Lenis smooths the wheel into a glide, which is what
// makes a scroll-driven camera read as a camera move instead of a slideshow;
// it is created only while the city is on (never under reduced motion, never
// with `fx world off`), and handed to src/lib/scroll.js so every programmatic
// jump goes through the same instance.
//
// Nothing here renders React. The per-frame numbers are written straight onto
// the stage object (src/world/stage.js) for the world's frame loop to read,
// and the one number the page itself needs, the scrim's darkness, is written
// as a custom property on the scrim element alone, so a scrolled frame
// restyles one element and not the document.
import Lenis from "lenis";
import { attachLenis } from "../lib/scroll";
import { loadGarage3d } from "../lib/garage3d";
import { stage, setStage, setHolding, garageCovers, subscribeStage } from "./stage";
import { shotDim, routeDim, COVER_DIM } from "../data/world";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Where the reader is, in shots, at scroll `y`. Pure, so the same numbers
 * come out of a test as out of the page.
 */
export function positionAt(shots, y, vh, maxScroll) {
  const n = shots.length;
  if (!n) return 0;
  for (let i = 0; i < n - 1; i++) {
    const a = shots[i];
    const b = shots[i + 1];
    let nextStart = b.top - 0.2 * vh;
    if (i === n - 2) nextStart = Math.min(nextStart, maxScroll);
    const holdEnd = Math.min(Math.max(a.top - 0.2 * vh, a.top + a.height - vh), nextStart);
    if (y < holdEnd) return i;
    if (y < nextStart) return i + (y - holdEnd) / Math.max(1, nextStart - holdEnd);
  }
  return n - 1;
}

/** 0 to 1 per shot: how far the middle of the viewport is through it. */
export function localsAt(shots, y, vh, out = []) {
  const mid = y + vh / 2;
  out.length = shots.length;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    out[i] = clamp((mid - s.top) / Math.max(1, s.height), 0, 1);
  }
  return out;
}

/**
 * The scrim's darkness for a stage position. Reading shots sit at their own
 * level; the dim eases between them and lifts almost all the way off at the
 * middle of every flight, because a camera move is the one moment there is
 * nothing to read and the city is the show.
 */
export function dimAt(shots, position) {
  if (!shots.length) return 0;
  const i = clamp(Math.floor(position), 0, shots.length - 1);
  const j = Math.min(i + 1, shots.length - 1);
  const f = position - i;
  const a = shotDim(shots[i].id);
  const b = shotDim(shots[j].id);
  const base = a + (b - a) * smooth(f);
  const lift = Math.pow(Math.sin(Math.PI * f), 2) * 0.9;
  return base * (1 - lift);
}

/**
 * Start measuring and, unless `smooth` is false, smoothing. Returns the
 * teardown. `scrim` is the element whose `--world-dim` this writes.
 */
export function startScrollStage({ scrim = null, smooth: useLenis = true } = {}) {
  let lenis = null;
  if (useLenis) {
    lenis = new Lenis({ lerp: 0.1, autoRaf: false, anchors: false });
    attachLenis(lenis);
  }

  let vh = window.innerHeight;
  let maxScroll = 0;
  let raf = 0;
  let written = -1;
  let dim = 0;
  let last = 0;
  let garageAsked = false;

  const measure = () => {
    const sy = window.scrollY;
    vh = window.innerHeight;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    const shots = [...document.querySelectorAll("[data-shot]")].map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.dataset.shot, top: r.top + sy, height: r.height };
    });
    shots.sort((p, q) => p.top - q.top);
    stage.shots = shots;
    setStage({ layout: stage.layout + 1 });
  };

  const update = (now) => {
    const y = window.scrollY;
    const shots = stage.shots;
    stage.position = positionAt(shots, y, vh, maxScroll);
    localsAt(shots, y, vh, stage.locals);

    // The section under the middle of the viewport, for anything that wants
    // a name rather than a number.
    const mid = y + vh / 2;
    let section = shots[0]?.id ?? "hero";
    for (const s of shots) if (s.top <= mid) section = s.id;
    if (section !== stage.section) setStage({ section });
    const k = Math.round(stage.position);
    setHolding(Math.abs(stage.position - k) < 0.01 ? shots[k]?.id ?? null : null);

    // The garage's viewer is heavy: start fetching it once the reader is
    // past Stack, so it is ready by the time the flight lands in the bay.
    if (!garageAsked) {
      const stack = shots.findIndex((s) => s.id === "stack");
      if (stack >= 0 && stage.position > stack) {
        garageAsked = true;
        loadGarage3d().catch(() => {});
      }
    }

    // The dim: the shot's own level on the home page, the route's on a case
    // study, darker still while the garage's viewer has the screen. Damped,
    // so an overlay arriving or a route changing fades rather than cuts.
    let goal = stage.route.kind === "home" ? dimAt(shots, stage.position) : routeDim(stage.route);
    if (garageCovers()) goal = Math.max(goal, COVER_DIM.garage);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    dim += (goal - dim) * (1 - Math.exp(-dt * 6));
    if (!dt) dim = goal;
    stage.dim = dim;
    if (scrim && Math.abs(dim - written) > 0.002) {
      written = dim;
      scrim.style.setProperty("--world-dim", dim.toFixed(3));
    }
  };

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    lenis?.raf(now);
    update(now);
  };

  // Re-measure whenever the document's height changes: fonts and key art
  // landing, a route change, the garage switching bays, the deck expanding.
  const ro = new ResizeObserver(() => measure());
  ro.observe(document.body);
  window.addEventListener("resize", measure);
  document.fonts?.ready.then(measure).catch(() => {});
  let coverCount = stage.covers.size;
  const unsub = subscribeStage(() => {
    if (stage.covers.size !== coverCount) {
      coverCount = stage.covers.size;
      measure();
    }
  });

  // Mouse position for the camera's tilt. Touch never tilts: a finger on a
  // phone is scrolling, and a view that leans as it scrolls is seasick.
  const onPointer = (e) => {
    if (e.pointerType !== "mouse") return;
    stage.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    stage.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  measure();
  raf = requestAnimationFrame(frame);
  // Dev only: `window.__stage` is the live stage, for checking the maths.
  if (import.meta.env.DEV) window.__stage = stage;

  return {
    measure,
    lenis,
    /** After a route change: Lenis forgets any glide it was in the middle
     *  of, and takes the window's scroll position as its own. */
    resync() {
      lenis?.resize();
      measure();
    },
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onPointer);
      if (lenis) {
        attachLenis(null);
        lenis.destroy();
      }
      stage.position = 0;
      stage.dim = 0;
      scrim?.style.removeProperty("--world-dim");
    },
  };
}
