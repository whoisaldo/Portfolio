// src/world/stage.js: where the reader is in the city, shared without a provider.
//
// The city behind the page is one three.js scene that has to know a handful
// of things about the page in front of it: how far down it the reader is, in
// shots rather than pixels; which Work deck entry is on the screen; which
// role card is being read; whether something opaque is covering the whole
// viewport; which route is showing. None of the components that know those
// things should own the world or be its parent, and the world should not
// have to reach into React to find them out.
//
// So this is the same shape as src/lib/intro.js: module state, a subscribe
// function, and a useSyncExternalStore hook over it. Two kinds of field live
// here and they are treated differently on purpose:
//
//   Per frame   position, locals, dim, pointer. Written by the scroll stage
//               sixty times a second and read by the world's own frame loop
//               straight off `stage`. Changing them notifies nobody: a React
//               render per scrolled frame is exactly the cost this avoids.
//   Discrete    section, activeProject, activeRole, route, paused, status.
//               Written rarely, through set(), which notifies subscribers.
//
// `covers` is the list of reasons the world is hidden: the door, an expanded
// deck, the console, the garage's own 3D viewer. While any of them is up the
// world stops drawing, because a frame nobody can see still costs a frame.
// The garage's viewer is the one exception to "any": it comes on screen
// while the camera is still flying into the garage, and that flight is the
// point of the section, so the viewer only covers the city once the flight
// has landed (`holding` is the shot being held).
import { useSyncExternalStore } from "react";

export const stage = {
  // [{ id, top, height }] in document pixels, measured from [data-shot].
  shots: [],
  // Continuous shot index: 1.4 is 40% of the way from shot 1 to shot 2.
  position: 0,
  // Per shot, 0 to 1: how far the viewport's middle has travelled through it.
  locals: [],
  // The shot id under the middle of the viewport.
  section: "hero",
  // -1..1 on both axes; mouse only, never touch.
  pointer: { x: 0, y: 0 },
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
  // { kind: "home" } | { kind: "project" | "role", slug, index }
  route: { kind: "home" },
  // "off" | "loading" | "ready" | "failed": the live world, not the poster.
  status: "off",
  // "stage" while the scroll drives the camera; "cinematic" while the intro
  // does (src/components/IntroCinematic.jsx), when the world's own loop rests.
  mode: "stage",
  // Why the world is hidden right now: a Set of keys.
  covers: new Set(),
  // The shot id being held (no flight under way), or null mid-flight.
  holding: null,
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
  const covered = [...stage.covers].some((key) => key !== "garage" || stage.holding === "garage");
  setStage({ paused: hidden || covered });
}

/** Whether the garage's viewer is covering the city right now. */
export function garageCovers() {
  return stage.covers.has("garage") && stage.holding === "garage";
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
  return stage.status === "ready" ? world : null;
}

export function setWorld(next) {
  world = next;
}
