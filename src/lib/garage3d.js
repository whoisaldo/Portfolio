// src/lib/garage3d.js: the doors to the garage.
//
// Two lazy chunks, the same shape as drift.js. The section itself
// (src/sections/Garage.jsx, its parts list, photographs and controls) is
// not in the main bundle: the page renders a shell for it at once
// (src/routes/Home.jsx) and fetches the rest when the page is idle, sooner
// when the reader heads for it. And the old viewer's scene, three.js and
// all, is fetched only once the section is up and the city is in.
//
// Each promise is shared, so a second caller never fetches twice, and a
// failed load resets, so a retry gets a second chance. The door's loading
// screen waits for neither: the garage is never in the way of the hero.
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

/** Fetch the section now (a deep link, a part asked for, the reader past
 *  Stack), or once the page is idle (`idle`). Never rejects. */
export function prepareGarageSection({ idle = false } = {}) {
  if (typeof window === "undefined") return;
  const go = () => loadGarageSection().catch(() => {});
  if (!idle) return go();
  if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 4000 });
  else window.setTimeout(go, 1500);
}

// The section's layout: "photos" (the page as it reads, at its natural
// height) or "cinematic" (seven screens of scroll with the city's camera
// making the visit inside the garage, src/world/garage.js). Photos until
// the visit is ready to be the default; in a dev build `?garage=visit`
// opts in.
let mode =
  import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("garage") === "visit"
    ? "cinematic"
    : "photos";
const modeSubs = new Set();

export function getGarageMode() {
  return mode;
}

export function setGarageMode(next) {
  if (next === mode) return;
  mode = next;
  modeSubs.forEach((fn) => fn());
}

const subscribeMode = (fn) => {
  modeSubs.add(fn);
  return () => modeSubs.delete(fn);
};

/** The section's layout, rerendering the caller when it changes. */
export function useGarageMode() {
  return useSyncExternalStore(subscribeMode, getGarageMode, getGarageMode);
}

let promise = null;

export function loadGarage3d() {
  if (!promise) {
    promise = import("./garage-scene.js")
      .then(async (mod) => {
        await mod.preloadGarage();
        return mod;
      })
      .catch((err) => {
        promise = null;
        throw err;
      });
  }
  return promise;
}
