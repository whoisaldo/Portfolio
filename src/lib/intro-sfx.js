// src/lib/intro-sfx.js: the car, synthesised.
//
// No audio file. Every sound here is built from oscillators and noise buffers
// at call time, which means zero bytes on the wire, no licence to track, and
// nothing to decode. The whole thing is a few dozen lines of scheduling.
//
// The track leads. These are scheduled against the same clock the cinematic
// reads (src/lib/cues.js) and mixed well under the song, so they read as the
// car in the scene rather than as a second soundtrack. Each layer is a real
// thing a car does: a starter motor turning over, the engine catching and
// settling to an idle, revs climbing through the run-up to the drop, tyres
// breaking loose on the beat, and the doppler drop of a car that has left.
//
// Everything joins the ambient bus, so it follows the reader's volume and is
// heard by the analyser like anything else. Nothing here plays unless the
// cinematic asks, and cancel() silences all of it on a skip.
import { audioContext } from "./audio";
import { ambientBus } from "./ambient";
import { CAR_GONE, DROP, IGNITION, KICK, WIPE_START } from "./cues";

let live = [];

/** White noise, `duration` seconds long. */
function noiseBuffer(ac, duration) {
  const frames = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Band-passed noise with a gain envelope. Returns the source. */
function noise(ac, out, { at, duration, freq, q = 1, gain, attack = 0.02, release = 0.15 }) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, duration + release);

  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = q;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.setValueAtTime(gain, at + duration);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration + release);

  src.connect(band).connect(g).connect(out);
  src.start(at);
  src.stop(at + duration + release + 0.05);
  live.push(src);
  return { src, band, g };
}

/** One oscillator with a lowpass and an envelope. Returns the nodes. */
function tone(ac, out, { at, duration, type = "sawtooth", from, to, gain, filter, attack = 0.012, release = 0.2, detune = 0 }) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(from, at);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(to, at + duration);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + attack);
  g.gain.setValueAtTime(gain, at + duration);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration + release);

  let node = osc;
  if (filter) {
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = filter.q ?? 0.8;
    f.frequency.setValueAtTime(filter.from, at);
    f.frequency.exponentialRampToValueAtTime(filter.to ?? filter.from, at + duration);
    node = osc.connect(f);
  }
  node.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + duration + release + 0.05);
  live.push(osc);
  return { osc, g };
}

/**
 * Schedule the whole car against the song.
 *
 * `at(cue)` converts seconds-of-song into AudioContext time, which is the
 * cinematic's job to know: it owns the clock. Cues already in the past are
 * skipped rather than played late, so a short intro that starts a bar before
 * the drop simply never hears the ignition.
 */
export function scheduleIntroSfx(at) {
  const ac = audioContext();
  const out = ambientBus();
  if (!ac || !out || ac.state !== "running") return;
  cancelIntroSfx();

  const now = ac.currentTime + 0.02;
  const future = (cue) => Math.max(now, at(cue));
  const skipped = (cue) => at(cue) < now - 0.05;

  // --- ignition -----------------------------------------------------------
  if (!skipped(IGNITION)) {
    const t = future(IGNITION);
    // Starter motor: a low saw chopped by a fast square LFO on its gain, which
    // is what a crank actually sounds like: lumps, not a tone.
    const crank = tone(ac, out, { at: t, duration: 0.42, type: "sawtooth", from: 36, to: 44, gain: 0.07, filter: { from: 380, to: 520 }, release: 0.08 });
    const lfo = ac.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 11;
    const depth = ac.createGain();
    depth.gain.value = 0.035;
    lfo.connect(depth).connect(crank.g.gain);
    lfo.start(t);
    lfo.stop(t + 0.5);
    live.push(lfo);

    // The catch: pitch jumps and the filter opens as the engine takes.
    tone(ac, out, { at: t + 0.42, duration: 0.55, type: "sawtooth", from: 58, to: 92, gain: 0.085, filter: { from: 320, to: 1500 }, attack: 0.03, release: 0.25 });

    // Idle that climbs all the way to the drop. Two saws a few cents apart
    // plus a sub, which is the cheapest convincing engine there is.
    const runUp = DROP - (IGNITION + 0.9);
    tone(ac, out, { at: t + 0.9, duration: runUp, type: "sawtooth", from: 70, to: 165, gain: 0.05, filter: { from: 520, to: 1900 }, attack: 0.15, release: 0.3 });
    tone(ac, out, { at: t + 0.9, duration: runUp, type: "sawtooth", from: 70, to: 165, gain: 0.04, filter: { from: 520, to: 1900 }, attack: 0.15, release: 0.3, detune: 9 });
    tone(ac, out, { at: t + 0.9, duration: runUp, type: "sine", from: 35, to: 82, gain: 0.06, attack: 0.2, release: 0.3 });
  }

  // --- the drop: tyres and revs ------------------------------------------
  if (!skipped(DROP)) {
    const t = future(DROP);
    // Tyre screech: noise through a high, narrow bandpass whose centre wobbles,
    // because a locked screech is a whistle and a wobbling one is rubber.
    const s = noise(ac, out, { at: t, duration: 1.25, freq: 2400, q: 7, gain: 0.07, attack: 0.05, release: 0.35 });
    const wob = ac.createOscillator();
    wob.type = "sine";
    wob.frequency.value = 8.5;
    const wobDepth = ac.createGain();
    wobDepth.gain.value = 320;
    wob.connect(wobDepth).connect(s.band.frequency);
    wob.start(t);
    wob.stop(t + 1.7);
    live.push(wob);

    // Revs through the slide.
    tone(ac, out, { at: t, duration: 1.3, type: "sawtooth", from: 165, to: 400, gain: 0.08, filter: { from: 1300, to: 3000 }, attack: 0.03, release: 0.12 });
    tone(ac, out, { at: t, duration: 1.3, type: "sawtooth", from: 165, to: 400, gain: 0.06, filter: { from: 1300, to: 3000 }, attack: 0.03, release: 0.12, detune: -8 });
  }

  // --- the first kick: a thump under the hazard flash -----------------------
  if (!skipped(KICK)) {
    const t = future(KICK);
    tone(ac, out, { at: t, duration: 0.32, type: "sine", from: 88, to: 40, gain: 0.3, attack: 0.008, release: 0.1 });
  }

  // --- launch: the car leaves, and its pitch leaves with it -----------------
  if (!skipped(WIPE_START)) {
    const t = future(WIPE_START);
    const run = CAR_GONE - WIPE_START;
    tone(ac, out, { at: t, duration: run * 0.62, type: "sawtooth", from: 260, to: 640, gain: 0.085, filter: { from: 2000, to: 4200 }, attack: 0.02, release: 0.05 });
    // Doppler: the pitch falls as it passes, and the level with it.
    tone(ac, out, { at: t + run * 0.62, duration: run * 0.38, type: "sawtooth", from: 640, to: 250, gain: 0.07, filter: { from: 4200, to: 900 }, attack: 0.01, release: 0.3 });
    // The whoosh of the air it moved.
    const w = noise(ac, out, { at: t + 0.15, duration: run * 0.7, freq: 900, q: 1.2, gain: 0.045, attack: 0.1, release: 0.4 });
    w.band.frequency.exponentialRampToValueAtTime(5200, t + 0.15 + run * 0.7);
  }
}

/** Silence everything scheduled, now. Used by skip. */
export function cancelIntroSfx() {
  const ac = audioContext();
  const t = ac ? ac.currentTime : 0;
  for (const node of live) {
    try { node.stop(t); } catch { /* already stopped */ }
  }
  live = [];
}
