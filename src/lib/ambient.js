// src/lib/ambient.js: the background track, and the clock the intro runs on.
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
// and it plays. On start the loop looks for that file first and uses it if it
// is there; if it is absent, or the request fails, it falls back to the
// synthesised piece below without an error.
//
// The file currently there was supplied by the owner. It arrived as a 9.4 MB
// 320kbps MP3 and ships as a 3.8 MB 128kbps AAC, which is transparent for
// something playing under a page and is 60% less to download. It is fetched
// only once the door is on screen for a reader who has sound on, never for
// anyone who declined, so a silent visit never pays for it at all.
//
// The fallback is an original piece written to sit in the same room as the
// song: dreamy minor synthpop, slow, no drums, meant to be noticed once and
// then forgotten about. Both sources route through the same bus and the same
// volume preference, so the rest of the app never has to know which one is
// playing.
//
// THE CLOCK
//
// The intro cinematic is choreographed to the track, so this module also
// reports where in the file playback is (songTime), to the sample. A buffer
// source has no currentTime of its own; it is derived from the context clock
// and the offset the source was started at. See src/lib/cues.js for what the
// numbers mean.
//
// THE BUS
//
//   source -> master (the reader's volume) -> duck (intro vs cruise)
//          -> analyser (levels for the music-reactive chrome) -> out
//
// The car sounds and the UI blips join at `master`, so they follow the volume
// slider and show up in the analyser, but they never fight the reader's
// setting.
//
// HOW THE SYNTH RUNS
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
import { audioContext, getVolume } from "./audio.js";

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

// Default fade-in time constant. This was 2.6s, which reaches only about 17%
// of target after half a second and 32% after one. Music that quiet for that
// long does not read as "fading in", it reads as "not working", and that is
// exactly how it was reported. 0.7s is still a fade and is clearly audible
// inside a second. The intro passes something shorter, because its first
// phrase starts a tenth of a second after playback does.
const FADE_IN = 0.7;

// Each layer's own level. The user volume multiplies these rather than
// replacing them, so the balance between pad, arp and bass never changes.
const PAD = 0.045;
const ARP = 0.03;
const BASS = 0.06;

/** Fired on window with { detail: { playing } } whenever playback starts or
 *  stops. The music-reactive chrome listens for it. */
export const AMBIENT_EVENT = "aly:ambient";

let master = null;
let duck = null;
let analyser = null;
let duckTarget = 1;
let timer = null;
let nextBar = 0;
let barIndex = 0;
let fileSource = null;
// A source that has been told to stop at the end of a fade and is still
// sounding. Held only so the next start can cut it dead; see stopAmbient().
let fading = null;
// Bumped by every stop. A start that was still fetching when one happened
// checks this and abandons: crossing to the plain version while the track is
// mid-download should not start it a few seconds later, over there.
let stopSeq = 0;
// Non-null while a start is in flight. See startAmbient().
let starting = null;

// The clock. All three are only meaningful while fileSource is non-null.
let fileStartedAt = 0; // context time at which the source started
let fileOffset = 0; // seconds into the file it started from
let fileDuration = 0;

// The track's bytes, fetched ahead of the click, and the decoded buffer,
// kept so a replay never fetches or decodes twice.
let prefetched = null;
let decodedTrack = null;

function announce(playing) {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") return;
  window.dispatchEvent?.(new CustomEvent(AMBIENT_EVENT, { detail: { playing } }));
}

function ensureMaster(ac) {
  if (master) return master;
  master = ac.createGain();
  master.gain.value = 0;
  duck = ac.createGain();
  duck.gain.value = duckTarget;
  analyser = ac.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.55;
  // A narrower window than the default -100..-30 dB, so a track playing at
  // half volume still moves the meter.
  analyser.minDecibels = -72;
  analyser.maxDecibels = -12;
  master.connect(duck).connect(analyser).connect(ac.destination);
  return master;
}

/** The bus everything else joins. Creates it if needed; null without audio. */
export function ambientBus() {
  const ac = audioContext();
  if (!ac) return null;
  return ensureMaster(ac);
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

/** True only while the real track is running, which is when songTime() is
 *  meaningful. The synth has no timeline to choreograph against. */
export function isTrackPlaying() {
  return fileSource !== null;
}

/**
 * Seconds into the file, or null when the track is not playing. Wraps at the
 * end of the file because the source loops.
 */
export function songTime() {
  const ac = audioContext();
  if (!ac || !fileSource) return null;
  const t = fileOffset + (ac.currentTime - fileStartedAt);
  return fileDuration > 0 ? t % fileDuration : t;
}

/** Push the current volume preference into the running mix. */
export function applyVolume() {
  const ac = audioContext();
  if (!ac || !master) return;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setTargetAtTime(getVolume(), ac.currentTime, 0.08);
}

/**
 * The intro-versus-cruise multiplier, on top of the reader's volume. Takes
 * `seconds` to get there; 0 is immediate. Remembered, so a call before the
 * bus exists is honoured when it is built.
 */
export function setDuck(scale, seconds = 0) {
  duckTarget = scale;
  const ac = audioContext();
  if (!ac || !duck) return;
  duck.gain.cancelScheduledValues(ac.currentTime);
  if (seconds <= 0) {
    duck.gain.setValueAtTime(scale, ac.currentTime);
  } else {
    // setTargetAtTime reaches ~95% of the way in three time constants.
    duck.gain.setTargetAtTime(scale, ac.currentTime, seconds / 3);
  }
}

const bins = new Uint8Array(256);

/**
 * Where the music is right now, 0 to 1, for the chrome that moves with it.
 *
 *   bass   the kick region, roughly 90 to 280 Hz
 *   level  everything up to about 4.5 kHz
 *
 * Both are shaped so that a sustained pad reads as a low floor and a kick
 * reads as a hit: the raw meter sits high on a dense master and would peg
 * anything driven straight from it.
 */
export function getLevels() {
  if (!analyser || !isPlaying()) return { level: 0, bass: 0 };
  analyser.getByteFrequencyData(bins);
  let b = 0;
  for (let i = 1; i <= 3; i++) b += bins[i];
  b /= 3 * 255;
  let l = 0;
  for (let i = 1; i <= 48; i++) l += bins[i];
  l /= 48 * 255;
  const shape = (v, floor, span) => Math.min(1, Math.max(0, (v - floor) / span));
  // The raw means are returned as well, for calibrating the two floors
  // against a real track rather than guessing.
  // Floors measured against the supplied track on 2026-09-16: the quiet
  // intro sits around 0.15 / 0.25 raw, the drums around 0.35 / 0.6, and the
  // site plays 3.5 dB under the intro, which is roughly 0.06 on this scale.
  return { level: shape(l, 0.16, 0.4), bass: shape(b, 0.36, 0.38), rawLevel: l, rawBass: b };
}

/** Where a supplied track is looked for. See the note at the top of the file. */
// `import.meta.env?.` rather than `import.meta.env.` so this module can be
// imported by plain node. Vite always defines env; node does not, and
// scripts/check-audio-single.mjs needs to import this file to test it.
const TRACK_URL = (import.meta.env?.BASE_URL || "/") + "audio/ambient.m4a";

/**
 * Fetch the track's bytes without playing them. Called by the gate the moment
 * it appears, so the seconds a reader spends reading the door are the seconds
 * the 3.8 MB download needs, and the click that follows starts the song
 * inside a few hundred milliseconds instead of after a spinner.
 *
 * Needs no gesture: a fetch is not an AudioContext.
 */
/** Forget the fetched and decoded track. For a replaced file, and for the
 *  test harness, which needs each case to start cold. */
export function forgetTrack() {
  prefetched = null;
  decodedTrack = null;
}

export function prefetchTrack() {
  if (!prefetched) {
    prefetched = fetch(TRACK_URL)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .catch(() => null);
  }
  return prefetched;
}

/**
 * Start playing. Must be called from, or after, a user gesture.
 *
 *   offset  seconds into the file to start from
 *   gain    the duck multiplier to start at (INTRO_GAIN or CRUISE_GAIN)
 *   fade    fade-in time constant, seconds
 *
 * Prefers a real file at TRACK_URL and falls back to the synthesised loop when
 * there is not one. Returns false only when audio is still suspended.
 */
export function startAmbient(opts = {}) {
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
      const seq = stopSeq;
      if (await playFile(TRACK_URL, opts)) return true;
      // Nothing to fall back to if the reason there is no file is that the
      // reader left while it was loading.
      if (seq !== stopSeq) return false;
      return startSynth(opts);
    })().finally(() => { starting = null; });
  }
  return starting;
}

/** The synthesised fallback. */
function startSynth({ gain = 1 } = {}) {
  const ac = audioContext();
  if (!ac || ac.state !== "running" || timer !== null) return isPlaying();

  ensureMaster(ac);
  setDuck(gain);
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.setTargetAtTime(getVolume(), ac.currentTime, FADE_IN);

  nextBar = ac.currentTime + 0.15;
  barIndex = 0;
  tick();
  timer = setInterval(tick, LOOKAHEAD_MS);
  announce(true);
  return true;
}

/**
 * Stop.
 *
 *   fade  seconds to fade over. Zero, the default, cuts.
 *
 * Without a fade the source is stopped on the spot, which is what every
 * caller that is about to start something else wants: playFile() calls this
 * before it begins, and a tail bleeding into the new start would be two
 * copies of the same track a few bars apart.
 *
 * With one, the gain ramps down and the source is told to stop at the end of
 * it, so the music leaves rather than disappears. The ramp is exponential, so
 * the time constant is a third of the fade: inaudible well before the source
 * actually ends. The fading source is kept in `fading` because the master
 * gain is shared, and a start during the tail would drag it back up and play
 * both at once. Any stop, including the one inside playFile(), cuts it first.
 */
export function stopAmbient({ fade = 0 } = {}) {
  const ac = audioContext();
  const was = isPlaying();
  stopSeq += 1;
  // Already leaving, and nothing new has started since: let the tail finish.
  // Two route changes inside the plain version should not chop the fade the
  // first one began.
  if (!was && fading && fade > 0) return;
  if (fading) {
    try { fading.stop(); } catch { /* already ended */ }
    fading = null;
  }
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  if (ac && master) {
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(0.0001, ac.currentTime, fade > 0 ? fade / 3 : 0.4);
  }
  if (fileSource) {
    const source = fileSource;
    fileSource = null;
    if (fade > 0 && ac) {
      fading = source;
      source.onended = () => { if (fading === source) fading = null; };
      try { source.stop(ac.currentTime + fade); } catch { /* already stopped */ }
    } else {
      try { source.stop(); } catch { /* already stopped */ }
    }
  }
  if (was) announce(false);
}

/**
 * Play an audio file on the same bus as the synthesised loop.
 *
 * Returns false rather than throwing when the file is absent, which is the
 * normal case: a 404 from the dev server or from GitHub Pages is how this
 * module learns that no track has been supplied. A missing file must never
 * surface as an error, because "no track" is a valid state.
 */
export async function playFile(url, { loop = true, offset = 0, gain = 1, fade = FADE_IN } = {}) {
  const ac = audioContext();
  if (!ac || ac.state !== "running") return false;

  const seq = stopSeq;
  let buffer;
  try {
    if (url === TRACK_URL && decodedTrack) {
      buffer = decodedTrack;
    } else {
      let bytes = null;
      if (url === TRACK_URL && prefetched) {
        bytes = await prefetched;
      }
      if (!bytes) {
        // A dev server and a static host both answer a missing path with
        // HTML, so check the status rather than trusting decodeAudioData to
        // reject.
        const res = await fetch(url);
        if (!res.ok) return false;
        bytes = await res.arrayBuffer();
      }
      // decodeAudioData detaches the buffer it is handed. Decode a copy so the
      // prefetched bytes stay usable if this decode is ever repeated.
      buffer = await ac.decodeAudioData(bytes.slice(0));
      if (url === TRACK_URL) decodedTrack = buffer;
    }
  } catch {
    return false;
  }

  // A stop landed while this was fetching or decoding. The reader has moved
  // on; do not start behind them.
  if (seq !== stopSeq) return false;

  stopAmbient();
  ensureMaster(ac);
  setDuck(gain);

  fileSource = ac.createBufferSource();
  fileSource.buffer = buffer;
  fileSource.loop = loop;
  fileSource.connect(master);

  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.setTargetAtTime(getVolume(), ac.currentTime, fade);

  fileOffset = offset;
  fileStartedAt = ac.currentTime;
  fileDuration = buffer.duration || 0;
  fileSource.start(0, offset);
  announce(true);
  return true;
}
