// src/lib/env.js: the environment switches.
//
// The console can turn parts of the world off: the skyline's signage, the
// haze, the wet road, the music-reactive lighting, the reticle, the
// scanlines, the traffic. Each switch is one boolean here, persisted, and
// mirrored onto <html> as a data attribute (data-fx-signs="off" and so on)
// so the CSS that draws the thing can simply stop drawing it. Components
// that need to know (the traffic, the reticle) read the same store through
// useEnv().
//
// Nothing here is a preference dialog. It exists so that `haze off` in the
// terminal does something, and so that a reader who finds the effects too
// much has a way to say so that survives a reload.
//
// Two layers since 2026-09-18. `saved` is the reader's own choices, kept in
// storage. `session` is a fallback for this page load only: when the browser
// has no graphics acceleration (src/lib/gpu.js) the effects that need a GPU
// are switched off here, in memory, and never written anywhere, so a reader
// who fixes Chrome tomorrow gets the whole city back without knowing this
// existed. An explicit choice (`fx haze on` in the console) beats the
// fallback for that one switch and is saved as usual; `fx reset` clears both.
import { useSyncExternalStore } from "react";

const KEY = "aly.env.v1";

export const FX = {
  signs: "the skyline's signage",
  haze: "the haze drifting across the city",
  wet: "the wet road and its reflections",
  reactive: "lighting that moves with the music",
  cursor: "the reticle cursor",
  scanlines: "the scanlines and grain over the page",
  traffic: "the cars on the hero's road",
};

const DEFAULTS = Object.fromEntries(Object.keys(FX).map((k) => [k, true]));

/** What a browser without graphics acceleration can afford. The signage
 *  stays: it is painted once and holds still. Everything that blends, blurs
 *  or repaints every frame goes. */
export const LOW_POWER = {
  haze: false,
  wet: false,
  reactive: false,
  cursor: false,
  scanlines: false,
  traffic: false,
};

let saved = load();
let session = {};
let state = { ...saved };
const subs = new Set();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

function apply() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const k of Object.keys(FX)) {
    root.setAttribute(`data-fx-${k}`, state[k] ? "on" : "off");
  }
}

function commit() {
  state = { ...saved, ...session };
  apply();
  subs.forEach((fn) => fn());
  return state;
}

export function getEnv() {
  return state;
}

/** Set one or more switches. Saved, and returned as the new state. */
export function setEnv(patch) {
  saved = { ...saved, ...patch };
  // An explicit choice beats the session fallback for that switch.
  for (const k of Object.keys(patch)) delete session[k];
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Private mode. The switch still applies for this page.
  }
  return commit();
}

/** Switches for this page load only. Nothing here reaches storage. */
export function setSessionEnv(patch) {
  session = { ...session, ...patch };
  return commit();
}

/** True while the session fallback is holding any switch off. */
export function isLowPower() {
  return Object.keys(session).length > 0;
}

export function resetEnv() {
  session = {};
  return setEnv({ ...DEFAULTS });
}

function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** The whole state, rerendering the caller when any switch changes. */
export function useEnv() {
  return useSyncExternalStore(subscribe, getEnv, () => DEFAULTS);
}

/** Mirror the state onto <html> once on boot. */
export function initEnv() {
  apply();
}
