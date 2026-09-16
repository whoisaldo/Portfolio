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
