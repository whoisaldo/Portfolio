// src/braindance/store.js: the braindance's state, shared without a provider.
//
// The same shape as src/world/stage.js. Two kinds of field, treated
// differently on purpose:
//
//   Per frame   time, speed, car, camera, labels. Written by the engine's
//               loop sixty times a second and read by the parts of the HUD
//               that draw every frame (the playhead, the minimap, the scan
//               labels) off `bd` directly, in their own animation frames.
//               Writing them notifies nobody.
//   Discrete    everything else: playing, the layer, the chapter, the
//               clues found, the mode. Written through set(), which tells
//               subscribers, so React renders when one of them changes and
//               never because a frame went by.
import { useSyncExternalStore } from "react";

export const bd = {
  // ---- per frame ----
  // Seconds into the recording.
  time: 0,
  // The car: where it is on the map and which way it points.
  car: { x: 0, z: 0, heading: 0, speed: 0 },
  // The camera, for the minimap's cone.
  camera: { x: 0, z: 0, yaw: 0 },
  // Screen positions of the clues in view: [{ id, x, y, visible }].
  labels: [],

  // ---- discrete ----
  // "boot" | "loading" | "ready" | "failed"
  status: "boot",
  playing: false,
  // 1 forward, -1 rewinding; and how fast (1, 2, 4).
  direction: 1,
  rate: 1,
  // "visual" | "audio" | "thermal"
  layer: "visual",
  // "play" (the recording's own camera), "edit" (orbiting a paused moment),
  // "photo" (photo mode)
  mode: "play",
  chapter: 0,
  // Ids of the clues scanned, and the one whose card is open.
  found: [],
  open: null,
  // The clue under the pointer, and how far a scan of it has got (0..1).
  hover: null,
  scan: 0,
  // Achievements unlocked this visit and before (ids).
  unlocked: [],
  // Toasts on screen: [{ id, kind, title, line }].
  toasts: [],
  hud: true,
  journal: false,
  help: false,
  muted: false,
  ended: false,
  // Fractions of the load, for the loading line.
  progress: 0,
  // Photo mode: lens change in degrees, roll in degrees, filter, stamp.
  photo: { fov: 0, roll: 0, filter: "off", stamp: true },
  // The Konami code's reward.
  overdrive: false,
};

const subs = new Set();
let snapshot = { ...bd };

function notify() {
  snapshot = { ...bd };
  subs.forEach((fn) => fn());
}

export function set(patch) {
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    if (bd[k] !== v) {
      bd[k] = v;
      changed = true;
    }
  }
  if (changed) notify();
}

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** The discrete fields, rerendering the caller when one of them changes. */
export function useBd() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

let toastId = 0;
/** A toast for a few seconds: a clue scanned, an achievement, a hint. */
export function toast(kind, title, line = "", ms = 4200) {
  const id = ++toastId;
  set({ toasts: [...bd.toasts, { id, kind, title, line }].slice(-3) });
  window.setTimeout(() => set({ toasts: bd.toasts.filter((t) => t.id !== id) }), ms);
}

/** Put everything back as it was for a fresh visit to the route. */
export function resetBd() {
  Object.assign(bd, {
    time: 0,
    labels: [],
    status: "boot",
    playing: false,
    direction: 1,
    rate: 1,
    layer: "visual",
    mode: "play",
    chapter: 0,
    open: null,
    hover: null,
    scan: 0,
    toasts: [],
    hud: true,
    journal: false,
    help: false,
    ended: false,
    progress: 0,
    photo: { fov: 0, roll: 0, filter: "off", stamp: true },
    overdrive: false,
  });
  notify();
}

// A few moments the sound wants to hear about (a scan, an achievement)
// without the modules that cause them knowing about it.
const listeners = new Map();
export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event)?.delete(fn);
}
export function emit(event, detail) {
  listeners.get(event)?.forEach((fn) => fn(detail));
}
