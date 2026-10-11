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
import { sections as SECTIONS } from "../data/site";

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

/**
 * The scroll range [start, end] over which shot `i` holds: from where the
 * flight in lands (its section's top 20% from the top of the viewport) to
 * where the flight out begins. The last shot holds only at the bottom of
 * the page. The film (src/components/cinema/) flies between these.
 */
export function holdRange(shots, i, vh, maxScroll) {
  const n = shots.length;
  const a = shots[i];
  if (!a) return [0, 0];
  if (i === n - 1) return [maxScroll, maxScroll];
  const b = shots[i + 1];
  let nextStart = b.top - 0.2 * vh;
  if (i === n - 2) nextStart = Math.min(nextStart, maxScroll);
  const end = Math.min(Math.max(a.top - 0.2 * vh, a.top + a.height - vh), nextStart);
  const start = i === 0 ? 0 : clamp(a.top - 0.2 * vh, 0, end);
  return [start, end];
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
 * How far section `i` has stepped back for the camera at stage position
 * `position`, 0 to 1. While its shot holds it is all there; as a flight
 * away from it gets going its panes and prose thin to YIELD_MIN, so the
 * middle of every flight is the city's, and the next section firms up
 * again as its shot lands (its heading reaching 20% from the top, which is
 * where a reader starts reading it). Headings never yield: they are how a
 * reader knows where the flight is going. The CSS reads the same number
 * as `--yield` on the section (index.css), and the frost behind its panes
 * (src/world/glass.js) is computed from it here.
 */
export const YIELD_MIN = 0.3;
export function yieldAt(position, i) {
  const d = Math.abs(position - i);
  return 1 - (1 - YIELD_MIN) * smooth(clamp((d - 0.06) / 0.38, 0, 1));
}

/**
 * The scrim's darkness for a stage position. Reading shots sit at their own
 * level; the dim eases between them and lifts part of the way off at the
 * middle of every flight, where the camera move is the show. Only part: by
 * the middle of a flight the next section's heading is already rising into
 * the frame, and it has to read over the city it arrives on.
 */
export function dimAt(shots, position) {
  if (!shots.length) return 0;
  const i = clamp(Math.floor(position), 0, shots.length - 1);
  const j = Math.min(i + 1, shots.length - 1);
  const f = position - i;
  const a = shotDim(shots[i].id);
  const b = shotDim(shots[j].id);
  const base = a + (b - a) * smooth(f);
  const lift = Math.pow(Math.sin(Math.PI * f), 2) * 0.4;
  return base * (1 - lift);
}

/**
 * The chapter card's strength mid-flight, 0 to 1: nothing while a shot
 * holds, all of it at the middle of the flight, when the page has stepped
 * back and the city has the frame (src/world/WorldMount.jsx draws the card
 * in the world layer, under the page).
 */
export function chapterAt(position) {
  const f = position - Math.floor(position);
  return Math.pow(Math.sin(Math.PI * f), 2);
}

/** "02 // Experience": a section's number and name, as its own heading labels it. */
export function chapterLabel(id) {
  const i = SECTIONS.findIndex((s) => s.id === id);
  return i < 0 ? null : { num: String(i).padStart(2, "0"), name: SECTIONS[i].label };
}

/**
 * Start measuring and, unless `smooth` is false, smoothing. Returns the
 * teardown. `scrim` is the element whose `--world-dim` this writes;
 * `chapter` the chapter card (its number and label are filled in here, its
 * strength written as `--chapter` and its drift as `--chapter-x`).
 */
export function startScrollStage({ scrim = null, chapter = null, smooth: useLenis = true } = {}) {
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
  // The chapter card: where the flight is headed (the section the reader is
  // scrolling toward, so a flight back up names the shot it is going back
  // to), and what was last written on the card.
  const card = {
    num: chapter?.querySelector("[data-chapter-num]") ?? null,
    label: chapter?.querySelector("[data-chapter-label]") ?? null,
    id: null,
    k: -1,
    x: 0,
    dir: 1,
    at: 0,
  };

  // Each section's element and the yield last written on it.
  let sections = [];
  const measure = () => {
    const sy = window.scrollY;
    vh = window.innerHeight;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    const found = [...document.querySelectorAll("[data-shot]")].map((el) => {
      const r = el.getBoundingClientRect();
      return { shot: { id: el.dataset.shot, top: r.top + sy, height: r.height }, el };
    });
    found.sort((p, q) => p.shot.top - q.shot.top);
    stage.shots = found.map((f) => f.shot);
    sections = found.map((f) => ({ el: f.el, written: -1 }));
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
    // With the page put away (Look, Cinema) there is nothing to read over
    // the city and nothing to dim it for.
    if (stage.view !== "page") goal = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    dim += (goal - dim) * (1 - Math.exp(-dt * 6));
    if (!dt) dim = goal;
    stage.dim = dim;
    if (scrim && Math.abs(dim - written) > 0.002) {
      written = dim;
      scrim.style.setProperty("--world-dim", dim.toFixed(3));
    }

    // The chapter card. Mid-flight on the home page only: a case study's
    // flight is the route's, on the clock, and names nothing.
    if (chapter) {
      const p = stage.position;
      if (Math.abs(p - card.at) > 1e-4) card.dir = p > card.at ? 1 : -1;
      card.at = p;
      const i = Math.floor(p);
      const to = shots[card.dir > 0 ? Math.min(i + 1, shots.length - 1) : i]?.id ?? null;
      const k = stage.route.kind === "home" && shots.length > 1 ? chapterAt(p) : 0;
      if (to && to !== card.id) {
        const c = chapterLabel(to);
        if (c) {
          card.id = to;
          if (card.num) card.num.textContent = c.num;
          if (card.label) card.label.textContent = `${c.num} // ${c.name}`;
        }
      }
      // Drifting across the frame with the flight, a little: the number
      // enters from the side the camera is travelling toward.
      const x = (p - i - 0.5) * -card.dir;
      if (Math.abs(k - card.k) > 0.004 || Math.abs(x - card.x) > 0.004) {
        card.k = k;
        card.x = x;
        chapter.style.setProperty("--chapter", k.toFixed(3));
        chapter.style.setProperty("--chapter-x", x.toFixed(3));
      }
    }

    // Each section's yield, on the section alone, only when it moves. A
    // case study has no shots to fly between and yields nothing.
    const home = stage.route.kind === "home";
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const k = home ? yieldAt(stage.position, i) : 1;
      if (Math.abs(k - s.written) > 0.01 || (k === 1 && s.written !== 1)) {
        s.written = k;
        s.el.style.setProperty("--yield", k.toFixed(3));
      }
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
      chapter?.style.removeProperty("--chapter");
      for (const s of sections) s.el.style.removeProperty("--yield");
    },
  };
}
