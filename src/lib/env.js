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

let state = load();
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

export function getEnv() {
  return state;
}

/** Set one or more switches. Returns the new state. */
export function setEnv(patch) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode. The switch still applies for this page.
  }
  apply();
  subs.forEach((fn) => fn());
  return state;
}

export function resetEnv() {
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
