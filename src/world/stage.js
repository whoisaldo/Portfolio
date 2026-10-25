// src/world/stage.js: where the reader is in the city, shared without a provider.
//
// The city behind the page is one three.js scene that has to know a handful
// of things about the page in front of it: how far down it the reader is, in
// shots rather than pixels; which Work deck entry is on the screen; which
// role card is being read; whether something opaque is covering the whole
// viewport. None of the components that know those
// things should own the world or be its parent, and the world should not
// have to reach into React to find them out.
//
// So this is the same shape as src/lib/intro.js: module state, a subscribe
// function, and a useSyncExternalStore hook over it. Two kinds of field live
// here and they are treated differently on purpose:
//
//   Per frame   position, locals, garageProgress, dim, pointer, ui, look. Written by the
//               scroll stage and the modes sixty times a second and read by
//               the world's own frame loop straight off `stage`. Changing
//               them notifies nobody: a React render per scrolled frame is
//               exactly the cost this avoids.
//   Discrete    section, activeProject, activeRole, paused, status.
//               Written rarely, through set(), which notifies subscribers.
//
// `covers` lists opaque overlays such as the door and the console. The
// workshop shares this renderer and never covers it with another canvas.
import { useSyncExternalStore } from "react";

export const stage = {
  // [{ id, top, height }] in document pixels, measured from [data-shot].
  shots: [],
  // Continuous shot index: 1.4 is 40% of the way from shot 1 to shot 2.
  position: 0,
  // Per shot, 0 to 1: how far the viewport's middle has travelled through it.
  locals: [],
  // The visit inside the garage, 0 at its arrival to 1 at the shop wall:
  // how far through the Garage shot's hold the scroll is (scroll-stage.js).
  garageProgress: 0,
  // Whether the Garage section is in its cinematic layout, so the camera
  // makes the visit inside (src/world/garage.js) rather than holding on
  // the old viewer's pose.
  garageVisit: false,
  // The visit held at one progress while the section shows its photographs
  // and the visit is ready (the station those photographs are of), so Look
  // and the film over the photographs see the same place; null otherwise.
  garageHold: null,
  // Bumped when the section changes layout: the camera cuts to where the
  // new layout has it rather than flying the route there.
  garageCut: 0,
  // Whether the reader has come within a screen and a half of the garage
  // (src/routes/Home.jsx): under reduced motion its city is built then.
  garageNear: false,
  // The shot id under the middle of the viewport.
  section: "hero",
  // -1..1 on both axes; mouse only, never touch.
  pointer: { x: 0, y: 0 },
  // How much of the page is up over the city, 0 to 1: 1 normally, easing to
  // 0 while Look or Cinema has put it away (src/world/modes.js). The frost
  // behind the page's panes follows it.
  ui: 1,
  // Look mode's drag, radians: how far the reader has turned the camera
  // away from the shot (yaw right, pitch up). Eases back to 0 on release.
  look: { yaw: 0, pitch: 0 },
  // Index into featuredProjects of the Work deck's current entry.
  activeProject: 0,
  // Slug of the role card being read, or null; `activeRoles` is every card
  // crossing the middle of the viewport (two, side by side, on a wide grid).
  activeRole: null,
  activeRoles: [],
  // The scrim's opacity: 0 is the whole city, 1 is black.
  dim: 0,
  // True while the world is not drawing (tab hidden, or covered).
  paused: false,
  // "off" | "loading" | "ready" | "failed": the live world, not the poster.
  status: "off",
  // The same for the world built for the garage alone, under reduced motion
  // (src/world/WorldMount.jsx): the page stays the still page it is without
  // a city, so nothing that offers Look or the film hears of this one.
  garageWorld: "off",
  // "ok", "lost" (the GPU took the WebGL context away) or "restoring" (it
  // gave it back and the city is being built again on it).
  context: "ok",
  // "stage" while the scroll drives the camera; "cinematic" while the intro
  // does (src/components/IntroCinematic.jsx), when the world's own loop rests.
  mode: "stage",
  // Why the world is hidden right now: a Set of keys.
  covers: new Set(),
  // The shot id being held (no flight under way), or null mid-flight.
  holding: null,
  // "page" normally; "look" or "cinema" while the page is put away and the
  // city is the whole screen (src/world/modes.js).
  view: "page",
  // Bumped whenever the page is re-measured.
  layout: 0,
};

const subs = new Set();
let snapshot = { ...stage };

function notify() {
  snapshot = { ...stage };
  subs.forEach((fn) => fn());
}

function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** Change discrete fields and tell subscribers. Per-frame fields are written
 *  onto `stage` directly by the scroll stage and never go through here. */
export function setStage(patch) {
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    if (stage[k] !== v) {
      stage[k] = v;
      changed = true;
    }
  }
  if (changed) notify();
}

/** The discrete fields, rerendering the caller when one of them changes. */
export function useStage() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export function subscribeStage(fn) {
  return subscribe(fn);
}

function recomputePaused() {
  const hidden = typeof document !== "undefined" && document.hidden;
  const covered = stage.covers.size > 0;
  setStage({ paused: hidden || covered });
}

/** The view changed (src/world/modes.js): the covers mean something else. */
export function refreshPaused() {
  recomputePaused();
}

/**
 * Something opaque covers the viewport (`on`), or stopped covering it. The
 * key is the reason, so two overlays can come and go in any order.
 */
export function coverWorld(key, on) {
  const had = stage.covers.has(key);
  if (on === had) return;
  if (on) stage.covers.add(key);
  else stage.covers.delete(key);
  recomputePaused();
  notify();
}

/** The scroll stage says which shot is being held (null mid-flight). */
export function setHolding(id) {
  if (id === stage.holding) return;
  stage.holding = id;
  recomputePaused();
  notify();
}

export function setActiveProject(index) {
  setStage({ activeProject: index });
}

/** One slug, a list of them (a row of cards), or null. */
export function setActiveRole(slugs) {
  const list = Array.isArray(slugs) ? slugs : slugs ? [slugs] : [];
  if (list.join(" ") === stage.activeRoles.join(" ")) return;
  setStage({ activeRole: list[0] ?? null, activeRoles: list });
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", recomputePaused);
}

// The live world, once it exists. The intro asks for it by name at CITY_IN
// and drives its cinematic mode; nothing else holds a reference.
let world = null;

export function getWorld() {
  return stage.status === "ready" || stage.garageWorld === "ready" ? world : null;
}

export function setWorld(next) {
  world = next;
}
