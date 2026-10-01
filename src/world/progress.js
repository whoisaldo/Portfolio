// src/world/progress.js: what the city has loaded so far, for the door.
//
// A reader who clicks through the door before the city is ready waits there
// for it (src/components/EntryGate.jsx), looking at this list. So each key is
// a real download, marked when it finishes: load.js marks the city's code,
// world-scene.js's preloadWorld each of its assets. Nothing here is timed or
// guessed. The step after these, the city built and its shaders compiled, is
// the stage's status turning "ready" (src/world/stage.js).
import { useSyncExternalStore } from "react";

export const LOAD_STEPS = ["code", "city", "car", "voxel", "holo", "ads", "koi", "moon"];

const loaded = new Set();
const subs = new Set();
let snapshot = [];

export function markLoaded(key) {
  if (loaded.has(key)) return;
  loaded.add(key);
  snapshot = [...loaded];
  subs.forEach((fn) => fn());
}

function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** The keys that have finished, rerendering the caller as each one does. */
export function useLoaded() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
