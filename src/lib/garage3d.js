// src/lib/garage3d.js: shared preparation for the lazy garage section.
//
// The synchronous shell mounts the implementation only after this scheduler
// releases it. Ordinary entry waits for a hero frame and idle time; hashes,
// requests and approaching Stack prioritize the same shared import.
import { useSyncExternalStore } from "react";

let section = null;

export function loadGarageSection() {
  if (!section) {
    section = import("../sections/Garage.jsx").catch((err) => {
      section = null;
      throw err;
    });
  }
  return section;
}

let authorized = false;
let scheduled = false;
let idleId = null;
const sectionSubs = new Set();
const sectionSnapshot = () => authorized;
const subscribeSection = (fn) => {
  sectionSubs.add(fn);
  return () => sectionSubs.delete(fn);
};
export const useGarageSectionReady = () => useSyncExternalStore(subscribeSection, sectionSnapshot, sectionSnapshot);

/** Authorize the one import, after a painted page, optionally at idle. */
export function prepareGarageSection({ idle = false } = {}) {
  if (typeof window === "undefined" || authorized) return;
  const go = () => {
    if (authorized) return;
    authorized = true;
    sectionSubs.forEach((fn) => fn());
    loadGarageSection().catch(() => {});
  };
  if (!idle && idleId !== null) {
    if (window.cancelIdleCallback) window.cancelIdleCallback(idleId);
    else clearTimeout(idleId);
    idleId = null;
    go();
    return;
  }
  if (scheduled && idle) return;
  scheduled = true;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (authorized) return;
    if (idle) idleId = window.requestIdleCallback ? window.requestIdleCallback(go, { timeout: 4000 }) : window.setTimeout(go, 1500);
    else go();
  }));
}

// Readiness, rather than a query or entrance action, decides whether the
// automatic immersive visit can be shown in production.
export const visitEnabled = () => true;

// What the section's shell (src/routes/Home.jsx) decides its layout from,
// shared with the film, which reads it without rendering:
//
//   availability  the visit's readiness, agents/B5/CONTRACT.md 2.2: "off",
//                 "unsupported", "idle", "loading", "ready", "failed",
//                 "lost" or "restoring"
//   reason        what failed, when it did
//   film          the film holds the visit for its pass through the garage
//   textStation   the text car/part/workbench mapped to the visit's progress
const view = { availability: "off", reason: null, film: false, textStation: "arrival" };
let viewSnap = { ...view };
const viewSubs = new Set();

export function getGarageView() {
  return viewSnap;
}

export function setGarageView(patch) {
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    if (view[k] !== v) {
      view[k] = v;
      changed = true;
    }
  }
  if (!changed) return;
  viewSnap = { ...view };
  viewSubs.forEach((fn) => fn());
}

const subscribeView = (fn) => {
  viewSubs.add(fn);
  return () => viewSubs.delete(fn);
};

/** The section's layout inputs, rerendering the caller when one changes. */
export function useGarageView() {
  return useSyncExternalStore(subscribeView, getGarageView, getGarageView);
}

/** Whether the film can make its pass through the visit now. */
export function filmCanVisit() {
  return view.availability === "ready";
}
