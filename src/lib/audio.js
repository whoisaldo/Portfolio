// src/lib/audio.js: the one AudioContext, the volume preference, and the door.
//
// This was boot-audio.js, and most of it was a synthesised VHS boot cue. The
// cue went when the boot became the intro cinematic (see
// src/components/IntroCinematic.jsx), which is choreographed to the real track
// instead of to a stopwatch, and the car sounds that took its place live in
// intro-sfx.js. What stays here is everything the rest of the app shares.
//
// Two rules this module will not break:
//
//   1. It never creates an AudioContext before the page has been interacted
//      with. Chrome logs a warning for a context constructed outside a user
//      gesture and leaves it suspended anyway, so there is nothing to gain and
//      a dirty console to lose. The context is built lazily on the first real
//      gesture and reused after that.
//   2. Every sound on the site routes through a gain the reader controls. A
//      portfolio that shouts at a recruiter in an open-plan office has cost
//      its owner the interview.

const VOLUME_KEY = "aly.volume.v1";
const DEFAULT_VOLUME = 0.55;

let ctx = null;

/**
 * Lazily construct the context. Safe to call from a click handler, and the one
 * place a context is ever made: the track, the car and the UI blips share it,
 * so a browser only ever sees this site open one.
 */
export function audioContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/**
 * One volume for everything, 0 to 1, persisted.
 *
 * Scaled rather than absolute: it multiplies each source's own gain, so the
 * track, the car and the blips keep their relative balance and none can be
 * pushed past the ceiling its own mix sets. Turning this to 1 does not make
 * the site loud, it makes it as loud as it was designed to get.
 */
export function getVolume() {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function setVolume(v) {
  const clamped = Math.min(1, Math.max(0, v));
  try {
    localStorage.setItem(VOLUME_KEY, String(clamped));
  } catch {
    // Storage unavailable. The value still applies for this page.
  }
  return clamped;
}

/**
 * Unlock audio from inside a click handler and report whether it worked.
 * Calling this outside a gesture is harmless; it just resolves false.
 */
export async function unlockAudio() {
  const ac = audioContext();
  if (!ac) return false;
  try {
    await ac.resume();
  } catch {
    return false;
  }
  return ac.state === "running";
}

// ---------------------------------------------------------------------------
// Preference
// ---------------------------------------------------------------------------

const SOUND_KEY = "aly.sound.v1";

/**
 * Sound is on unless it has been switched off.
 *
 * Note what this can and cannot do. It sets the preference, not the
 * permission: browsers keep an AudioContext suspended until the page has seen
 * a user gesture, so nothing is audible until the reader clicks through the
 * door. The three states are deliberate: absent means never chosen, so
 * default on; "0" means chosen off and must survive; "1" means chosen on.
 */
export function soundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    // Private mode, or storage disabled. The preference just does not persist.
  }
}

// ---------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------
// Whether to show the entry gate, which is NOT the same question as whether
// the reader has seen it before.
//
// A browser grants audio permission per document, not per person. Every page
// load starts with the context suspended and needs its own gesture, so a gate
// shown only on a first visit means every visit after that is silent unless
// the reader hunts for the toggle. That is what shipped first and it was
// wrong.
//
// So the rule is about the preference, not the history:
//
//   sound on (or never chosen)  -> show the door, every load. One click is
//                                  the price of audio and there is no way
//                                  around it.
//   sound explicitly off        -> never show it. They answered already, and
//                                  the answer does not need a gesture to
//                                  honour.
//
// `hasBeenAsked` survives, demoted: it no longer decides whether the door
// appears, only how much explaining it does when it does.

const ASKED_KEY = "aly.sound.asked.v1";

/** Does the entry gate need to appear on this page load? */
export function shouldGate() {
  return soundEnabled();
}

export function hasBeenAsked() {
  try {
    return localStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return true; // No storage means no way to remember a dismissal. Do not ask.
  }
}

export function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, "1");
  } catch {
    // Nothing to do. The prompt simply will not persist its dismissal.
  }
}
