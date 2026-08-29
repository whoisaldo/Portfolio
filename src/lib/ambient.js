// src/lib/ambient.js: the background loop.
//
// TWO SOURCES, ONE BUS
//
// The brief asked for "I Really Want to Stay At Your House", the Rosa Walton /
// Hallie Coggins song Edgerunners is built around.
//
// This module will play it, and takes no position on whether it should. What
// it will not do is go and get it: fetching a commercial master from wherever
// one can be found is not something this repo is going to do on its own. So
// the file is treated as something the owner supplies deliberately.
//
//   Drop an audio file at  public/audio/ambient.m4a
//
// and it plays. Nothing else changes. On start the loop looks for that file
// first and uses it if it is there; if it is absent, or the request fails, it
// falls back to the synthesised piece below without an error and without the
// reader noticing a difference in how anything behaves.
//
// The file currently there was supplied by the owner. It arrived as a 9.4 MB
// 320kbps MP3 and ships as a 3.8 MB 128kbps AAC, which is transparent for
// something playing quietly under a page and is 60% less to download. It is
// fetched only when a reader turns sound on, never on load, so anyone who
// declines the prompt never pays for it at all.
//
// The fallback is an original piece written to sit in the same room as the
// song: dreamy minor synthpop, slow, no drums, meant to be noticed once and
// then forgotten about. Both sources route through the same gain node and the
// same volume preference, so the rest of the app never has to know which one
// is playing.
//
// HOW IT RUNS
//
// A lookahead scheduler, which is the standard shape for Web Audio timing:
// setInterval cannot be trusted to fire on the beat, so the interval only asks
// "what falls inside the next 600ms" and schedules those notes at exact
// AudioContext times. Timer jitter stops mattering because the timer never
// decides when a note sounds, only when it is queued.
// The `.js` is explicit, unlike everywhere else in this codebase, because node
// ESM will not resolve an extensionless specifier and
// scripts/check-audio-single.mjs imports this file directly. Vite is happy
// either way.
import { audioContext, getVolume } from "./boot-audio.js";

// A minor, 85bpm, four bars. i - VI - III - VII, which is the most durable
// wistful progression there is and the reason half of synthwave uses it.
const BPM = 85;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// A3 C4 E4 G4 / F3 A3 C4 E4 / C3 E3 G3 B3 / G3 B3 D4 F4
const BARS = [
  { root: 45, chord: [57, 60, 64, 67] },
  { root: 41, chord: [53, 57, 60, 64] },
  { root: 48, chord: [52, 55, 59, 64] },
  { root: 43, chord: [55, 59, 62, 65] },
];

const LOOKAHEAD_MS = 250;
const SCHEDULE_AHEAD = 0.6;

// Each layer's own level. The user volume multiplies these rather than
// replacing them, so the balance between pad, arp and bass never changes.
const PAD = 0.045;
const ARP = 0.03;
const BASS = 0.06;

let master = null;
let timer = null;
let nextBar = 0;
let barIndex = 0;
let fileSource = null;
// Non-null while a start is in flight. See startAmbient().
let starting = null;

function ensureMaster(ac) {
  if (master) return master;
  master = ac.createGain();
  master.gain.value = 0;
  master.connect(ac.destination);
  return master;
}

/** A soft sustained voice for the pad. */
function pad(ac, at, freq, duration) {
  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  // A little detune per voice so the chord breathes instead of sitting still.
  osc.detune.value = (Math.random() - 0.5) * 8;

  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  lp.Q.value = 0.6;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(PAD, at + duration * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(lp).connect(g).connect(master);
  osc.start(at);
  osc.stop(at + duration + 0.1);
}

/** A short plucked note for the arpeggio. */
function pluck(ac, at, freq) {
  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(ARP, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);

  osc.connect(g).connect(master);
  osc.start(at);
  osc.stop(at + 0.6);
}

function bass(ac, at, freq, duration) {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(BASS, at + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(g).connect(master);
  osc.start(at);
  osc.stop(at + duration + 0.1);
}

function scheduleBar(ac, at, index) {
  const { root, chord } = BARS[index % BARS.length];

  chord.forEach((n) => pad(ac, at, midi(n), BAR));
  bass(ac, at, midi(root - 12), BAR * 0.9);

  // Eighth notes walking up and back down the chord, so the figure never
  // resolves on the same note two bars running.
  for (let i = 0; i < 8; i++) {
    const shape = [0, 1, 2, 3, 2, 1, 2, 3];
    pluck(ac, at + i * (BEAT / 2), midi(chord[shape[i]] + 12));
  }
}

function tick() {
  const ac = audioContext();
  if (!ac || ac.state !== "running") return;

  while (nextBar < ac.currentTime + SCHEDULE_AHEAD) {
    scheduleBar(ac, nextBar, barIndex);
    nextBar += BAR;
    barIndex += 1;
  }
}

/** True while the loop (or a file) is running. */
export function isPlaying() {
  return timer !== null || fileSource !== null;
}

/** Push the current volume preference into the running mix. */
export function applyVolume() {
  const ac = audioContext();
  if (!ac || !master) return;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setTargetAtTime(getVolume(), ac.currentTime, 0.08);
}

/** Where a supplied track is looked for. See the note at the top of the file. */
// `import.meta.env?.` rather than `import.meta.env.` so this module can be
// imported by plain node. Vite always defines env; node does not, and
// scripts/check-audio-single.mjs needs to import this file to test it.
const TRACK_URL = (import.meta.env?.BASE_URL || "/") + "audio/ambient.m4a";

/**
 * Start playing. Must be called from, or after, a user gesture.
 *
 * Prefers a real file at TRACK_URL and falls back to the synthesised loop when
 * there is not one. Returns false only when audio is still suspended.
 */
export function startAmbient() {
  const ac = audioContext();
  if (!ac || ac.state !== "running") return Promise.resolve(false);
  if (isPlaying()) return Promise.resolve(true);

  // Coalesce. Two callers firing on the same click is not hypothetical: it is
  // what happened here, because the prompt started the music and the callback
  // it invokes started it again. Both got past the isPlaying() check, both
  // fetched and decoded the same 3.9 MB file, and then each one's stopAmbient()
  // tore down the source the other had just created. The result was two full
  // decodes and silence.
  //
  // An `isPlaying()` check cannot fix that on its own, because nothing is
  // playing yet while the fetch is in flight. The latch has to cover the whole
  // async span, not just its endpoints.
  if (!starting) {
    starting = (async () => {
      if (await playFile(TRACK_URL)) return true;
      return startSynth();
    })().finally(() => { starting = null; });
  }
  return starting;
}

/** The synthesised fallback. */
function startSynth() {
  const ac = audioContext();
  if (!ac || ac.state !== "running" || timer !== null) return isPlaying();

  ensureMaster(ac);
  // Eight seconds to reach full. Music that arrives abruptly on a portfolio
  // reads as a mistake; music that fades up reads as a choice.
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.setTargetAtTime(getVolume(), ac.currentTime, 2.6);

  nextBar = ac.currentTime + 0.15;
  barIndex = 0;
  tick();
  timer = setInterval(tick, LOOKAHEAD_MS);
  return true;
}

/** Fade out and stop scheduling. */
export function stopAmbient() {
  const ac = audioContext();
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  if (fileSource) {
    try { fileSource.stop(); } catch { /* already stopped */ }
    fileSource = null;
  }
  if (ac && master) {
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(0.0001, ac.currentTime, 0.4);
  }
}

/**
 * Play an audio file on the same bus as the synthesised loop.
 *
 * Returns false rather than throwing when the file is absent, which is the
 * normal case: a 404 from the dev server or from GitHub Pages is how this
 * module learns that no track has been supplied. A missing file must never
 * surface as an error, because "no track" is a valid state.
 */
export async function playFile(url, { loop = true } = {}) {
  const ac = audioContext();
  if (!ac || ac.state !== "running") return false;

  let buffer;
  try {
    const res = await fetch(url);
    // A dev server and a static host both answer a missing path with HTML, so
    // check the status rather than trusting decodeAudioData to reject.
    if (!res.ok) return false;
    buffer = await ac.decodeAudioData(await res.arrayBuffer());
  } catch {
    return false;
  }

  stopAmbient();
  ensureMaster(ac);

  fileSource = ac.createBufferSource();
  fileSource.buffer = buffer;
  fileSource.loop = loop;
  fileSource.connect(master);

  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.setTargetAtTime(getVolume(), ac.currentTime, 2.6);

  fileSource.start();
  return true;
}
