// src/lib/intro.js: the intro's state, shared without a provider.
//
// Two things need to know whether the intro is over: the hero (its entrance
// waits for the reveal) and the navbar (slides in after). A reopened door
// puts both back. A context provider for one boolean is more ceremony than the
// boolean deserves, so this is a module-level value with a subscribe function
// and a useSyncExternalStore hook over it. Same shape as the DOM-event
// signalling the boot used to use, with a readable current value added.
//
// Also owns the two decisions the gate has to make before it starts anything:
// which version of the intro this page load gets, and whether the reader has
// already watched it in this tab.
import { useCallback, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { shouldGate, soundEnabled, unlockAudio } from "./audio";
import { startAmbient, stopAmbient } from "./ambient";
import { loadDrift } from "./drift";
import { INTRO_GAIN, SONG_START } from "./cues";

const SEEN_KEY = "aly.intro.v1";

/** Fired by the gate when the reader is through the door. */
export const INTRO_START = "aly:intro-start";

// Done from the start whenever the door is not going to open at all: a
// reader who chose silence never sees the gate, so there is nothing to wait
// for and the hero should simply animate in.
let done = typeof window === "undefined" ? true : !shouldGate();
const subs = new Set();

export function introDone() {
  return done;
}

export function setIntroDone(next) {
  if (done === next) return;
  done = next;
  subs.forEach((fn) => fn());
}

function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** True once the site is live. Rerenders the caller when it changes. */
export function useIntroDone() {
  return useSyncExternalStore(subscribe, introDone, () => true);
}

/**
 * Start the cinematic. `detail`:
 *   mode      "full" | "short"
 *   withSound whether the track is expected to be playing
 *   greeting  an override for the closing line (the Konami code uses this)
 */
export function startIntro(detail) {
  window.dispatchEvent(new CustomEvent(INTRO_START, { detail }));
}

/**
 * Run the full version again, from the footer or the Konami code.
 *
 * Restarts the track from the intro's start point when sound is on. Both
 * callers are user gestures, so the context is allowed to resume here; if the
 * reader chose silence the timeline simply runs on the timer.
 */
export function replayIntro(extra = {}) {
  const withSound = soundEnabled();
  loadDrift().catch(() => {});
  setIntroDone(false);
  window.scrollTo({ top: 0, behavior: "instant" });
  if (withSound) {
    stopAmbient();
    unlockAudio().then(() => startAmbient({ offset: SONG_START, gain: INTRO_GAIN, fade: 0.25 }));
  }
  startIntro({ mode: "full", withSound, replay: true, ...extra });
}

/** Fired to put the door back up after the reader is already inside. */
export const DOOR_OPEN = "aly:door-open";

/**
 * Back to the entrance.
 *
 * The front of this site is the door, not the cinematic on its own: it is
 * where the reader chooses sound, silence, or the plain version at
 * /recruiters. So the footer's way back reopens the door rather than throwing
 * the intro at whatever page happens to be on screen. From a case study it
 * routes home first, and the gate takes it from there.
 */
export function useReturnToDoor() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(() => {
    if (pathname !== "/") navigate("/");
    window.dispatchEvent(new CustomEvent(DOOR_OPEN));
  }, [navigate, pathname]);
}

/**
 * The cinematic itself, with no door in front of it: the console's `intro`
 * and the Konami code, both of which ask for the film by name and one of
 * which has its own closing line to deliver.
 *
 * It still plays on the landing page and nowhere else. Asked for from a case
 * study it goes home first, rather than running the whole entrance over a
 * page that is not the entrance and leaving the reader where they started.
 */
export function useReplayIntro() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(
    (extra) => {
      // Both in the one handler, so React commits the route change and the
      // overlay in the same render and no frame of the landing page is ever
      // shown before the black drops.
      if (pathname !== "/") navigate("/");
      replayIntro(extra);
    },
    [navigate, pathname],
  );
}

export function hasSeenIntro() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode. It will simply play again next load.
  }
}

/**
 * Which intro this load gets.
 *
 *   ?intro=off    none. Straight in, music at the drop.
 *   ?intro=full   the whole thing, even on a repeat visit
 *   ?intro=short  the drift only
 *   (nothing)     full on the first visit in this tab, short after that
 *
 * Reduced motion always means "off": a 25-second choreography is exactly the
 * kind of thing that preference exists to decline.
 */
export function introModeForThisLoad() {
  if (typeof window === "undefined") return "off";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "off";
  const param = new URLSearchParams(window.location.search).get("intro");
  if (param === "off" || param === "full" || param === "short") return param;
  return hasSeenIntro() ? "short" : "full";
}
