// src/lib/boot-audio.js: the boot chime, synthesised.
//
// No audio file. Every sound here is built from oscillators and a noise buffer
// at call time, which means zero bytes on the wire, no third-party request, no
// licence to track, and nothing to decode before it can play. The whole cue is
// about 40 lines of scheduling.
//
// Two rules this module will not break:
//
//   1. It never creates an AudioContext at import time. Chrome logs a warning
//      for a context constructed outside a user gesture and leaves it
//      suspended anyway, so the context is built lazily on the first real
//      click and reused after that.
//   2. Master gain is capped. Everything routes through one gain node held at
//      a level that cannot startle someone who forgot their volume was up.
//      A portfolio that shouts at a recruiter in an open-plan office has cost
//      its owner the interview.
//
// Autoplay policy is treated as a fact to design around rather than a bug to
// work around: `play()` resolves to false when the context is blocked, and the
// caller simply gets a silent boot.

const MASTER_GAIN = 0.16;

let ctx = null;

/** Lazily construct the context. Safe to call from a click handler. */
function context() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/** One short noise burst, band-passed. The static behind the power-on. */
function noise(ac, out, at, duration, freq, gain) {
  const frames = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = 0.8;

  const g = ac.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  src.connect(band).connect(g).connect(out);
  src.start(at);
  src.stop(at + duration);
}

/** One oscillator with an exponential decay envelope. */
function tone(ac, out, { at, duration, type, from, to, gain, filter }) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(to, at + duration);

  const g = ac.createGain();
  // A 12ms attack rather than an instant one: a hard start on a low sine is a
  // click, and the click is the loudest part of the sound.
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  let node = osc;
  if (filter) {
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(filter.from, at);
    f.frequency.exponentialRampToValueAtTime(filter.to, at + duration);
    node = osc.connect(f);
  }
  node.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + duration + 0.05);
}

/**
 * Schedule the boot cue. Returns true if it will actually be heard.
 *
 * The shape follows what is on screen rather than being decorative: a sub
 * thump under the CRT opening, a filtered sweep while the scan line travels,
 * three pips as the readout prints, and a two-note resolve as the name lands.
 */
export function playBootSound() {
  const ac = context();
  if (!ac) return false;

  // Suspended means no gesture has unlocked audio on this page yet. Ask, but
  // do not wait: a boot cue that arrives late is worse than one that is absent.
  if (ac.state === "suspended") ac.resume().catch(() => {});
  if (ac.state !== "running") return false;

  const master = ac.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ac.destination);

  const t = ac.currentTime + 0.02;

  // Power-on: a sub that drops away, plus the static of a tube waking up.
  tone(ac, master, { at: t, duration: 0.42, type: "sine", from: 62, to: 28, gain: 0.9 });
  noise(ac, master, t, 0.18, 2400, 0.10);

  // The scan line travelling: a saw pulled up through a closing lowpass.
  tone(ac, master, {
    at: t + 0.12, duration: 0.5, type: "sawtooth",
    from: 140, to: 900, gain: 0.05,
    filter: { from: 400, to: 2600 },
  });

  // Three pips for the readout lines.
  [0, 1, 2].forEach((i) => {
    tone(ac, master, {
      at: t + 0.34 + i * 0.1, duration: 0.05,
      type: "square", from: 1180 + i * 320, gain: 0.045,
    });
  });

  // The name landing: a bare fifth, slightly detuned so it is not sterile.
  tone(ac, master, { at: t + 0.78, duration: 0.55, type: "sine", from: 330, gain: 0.13 });
  tone(ac, master, { at: t + 0.78, duration: 0.55, type: "sine", from: 494.5, gain: 0.09 });
  noise(ac, master, t + 0.78, 0.3, 5200, 0.03);

  return true;
}

/**
 * Unlock audio from inside a click handler and report whether it worked.
 * Calling this outside a gesture is harmless; it just resolves false.
 */
export async function unlockAudio() {
  const ac = context();
  if (!ac) return false;
  try {
    await ac.resume();
  } catch {
    return false;
  }
  return ac.state === "running";
}

// ---------------------------------------------------------------------------
// Preference + replay
// ---------------------------------------------------------------------------
// These live here rather than in the component because a module that exports
// both a component and plain functions loses React Fast Refresh. Same reason
// src/lib/image.js exists. The replay signal is a DOM event rather than
// context or a store: exactly one listener, in a different subtree from the
// only dispatcher, and a CustomEvent is smaller than a provider.

const SOUND_KEY = "aly.sound.v1";

export const BOOT_REPLAY = "aly:boot-replay";

/** Sound is opt-in. Absent preference means off. */
export function soundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    // Private mode, or storage disabled. The preference just does not persist.
  }
}

/** Ask BootSequence to run again. No-op when nothing is listening. */
export function replayBoot() {
  window.dispatchEvent(new CustomEvent(BOOT_REPLAY));
}
