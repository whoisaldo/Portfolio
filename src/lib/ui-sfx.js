// src/lib/ui-sfx.js: the interface blips.
//
// Cyberpunk 2077's menus click. Very quietly, very briefly, and only on the
// things you can act on, which is exactly the budget here: a 20ms tick when
// the pointer lands on a link or a button, and a two-note confirm on a click.
// Both are synthesised, both join the ambient bus so they follow the volume
// slider, and neither plays unless the reader chose sound and the context is
// already running. There is no arrangement of code that makes a blip play
// before the reader has clicked through the door, which is the correct
// arrangement.
//
// Touch gets no hover blip: on a phone `pointerover` fires on the tap itself,
// a beat before the click, and two sounds for one gesture reads as a bug.
//
// glitchTick() is the one sound here that nothing clicked for, and the one
// that ignores the sound preference: the door fires it on each glitch hit and
// Ali asked for it on for everybody. It is 14ms at a twentieth of the hover
// blip's gain, and the button that turns the site quiet is six inches away
// from it on the same panel.
//
// It still cannot beat the browser. An AudioContext is suspended until the
// document has seen a gesture, so on a cold load the first hits are silent
// and the ticking starts the moment the reader touches anything at all. See
// the unlock in EntryGate.jsx, which listens for that first gesture.
import { audioContext, soundEnabled } from "./audio";
import { ambientBus } from "./ambient";

const INTERACTIVE = "a[href], button, [role='button'], input[type='range']";
const HOVER_GAP_MS = 70;

function ready() {
  if (!soundEnabled()) return null;
  const ac = audioContext();
  if (!ac || ac.state !== "running") return null;
  const out = ambientBus();
  return out ? { ac, out } : null;
}

function blip(ac, out, { at, freq, duration, gain, type = "square" }) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** The tick on hover. */
export function hoverBlip() {
  const a = ready();
  if (!a) return;
  blip(a.ac, a.out, { at: a.ac.currentTime, freq: 1900, duration: 0.022, gain: 0.011 });
}

/** The confirm on click: two notes a fourth apart, ascending. */
export function clickBlip() {
  const a = ready();
  if (!a) return;
  const t = a.ac.currentTime;
  blip(a.ac, a.out, { at: t, freq: 1046, duration: 0.05, gain: 0.02, type: "triangle" });
  blip(a.ac, a.out, { at: t + 0.055, freq: 1397, duration: 0.07, gain: 0.02, type: "triangle" });
}

/**
 * The tick on a glitch hit. Not a tone: a 14ms burst of noise through a tight
 * bandpass, which is a "tik" rather than a beep, plus one short square
 * transient under it so it has an edge on a laptop speaker.
 *
 * Does NOT go through ready(): this one ignores the sound preference on
 * purpose. It still routes through the ambient bus, so the volume slider
 * governs it like everything else, and it still cannot play while the context
 * is suspended, because nothing can.
 */
export function glitchTick() {
  const ac = audioContext();
  if (!ac || ac.state !== "running") return;
  const out = ambientBus();
  if (!out) return;
  const t = ac.currentTime;
  const DURATION = 0.014;

  // One mono buffer of white noise, built per hit. 14ms at 48kHz is ~672
  // samples; caching it would save nothing and would pin a buffer to a
  // context that may be torn down.
  const frames = Math.max(1, Math.ceil(DURATION * ac.sampleRate));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(2600, t);
  bp.Q.value = 3.2;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.055, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + DURATION);

  src.connect(bp).connect(g).connect(out);
  src.start(t);
  src.stop(t + DURATION + 0.01);

  blip(ac, out, { at: t, freq: 3200, duration: 0.01, gain: 0.014 });
}

/**
 * Listen on the document for the two gestures. Returns a detach function so a
 * hot reload does not stack listeners.
 */
export function attachUiSfx() {
  let lastHover = 0;
  let lastTarget = null;

  const onOver = (e) => {
    if (e.pointerType === "touch") return;
    const el = e.target?.closest?.(INTERACTIVE);
    if (!el || el === lastTarget) return;
    lastTarget = el;
    const now = performance.now();
    if (now - lastHover < HOVER_GAP_MS) return;
    lastHover = now;
    hoverBlip();
  };
  const onOut = (e) => {
    const el = e.target?.closest?.(INTERACTIVE);
    if (el && el === lastTarget && !el.contains(e.relatedTarget)) lastTarget = null;
  };
  const onClick = (e) => {
    if (e.target?.closest?.(INTERACTIVE)) clickBlip();
  };

  document.addEventListener("pointerover", onOver, { passive: true });
  document.addEventListener("pointerout", onOut, { passive: true });
  document.addEventListener("click", onClick, { passive: true });
  return () => {
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("pointerout", onOut);
    document.removeEventListener("click", onClick);
  };
}
