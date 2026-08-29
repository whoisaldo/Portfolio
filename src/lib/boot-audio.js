// src/lib/boot-audio.js: the boot chime, synthesised.
//
// No audio file. Every sound here is built from oscillators and a noise buffer
// at call time, which means zero bytes on the wire, no third-party request, no
// licence to track, and nothing to decode before it can play. The whole cue is
// about 40 lines of scheduling.
//
// Two rules this module will not break:
//
//   1. It never creates an AudioContext before the page has been interacted
//      with. Chrome logs a warning for a context constructed outside a user
//      gesture and leaves it suspended anyway, so there is nothing to gain and
//      a dirty console to lose. The context is built lazily on the first real
//      gesture and reused after that.
//   2. Master gain is capped. Everything routes through one gain node held at
//      a level that cannot startle someone who forgot their volume was up.
//      A portfolio that shouts at a recruiter in an open-plan office has cost
//      its owner the interview.
//
// Autoplay policy is treated as a fact to design around rather than a bug to
// work around: `play()` resolves to false when the context is blocked, and the
// caller simply gets a silent boot.

const MASTER_GAIN = 0.16;
const VOLUME_KEY = "aly.volume.v1";
const DEFAULT_VOLUME = 0.55;

let ctx = null;

/**
 * Lazily construct the context. Safe to call from a click handler, and the one
 * place a context is ever made: the boot cue and the ambient loop share it, so
 * a browser only ever sees this site open one.
 */
export function audioContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

const context = audioContext;

/**
 * One volume for everything, 0 to 1, persisted.
 *
 * Scaled rather than absolute: it multiplies each source's own gain, so the
 * cue and the music keep their relative balance and neither can be pushed past
 * the ceiling its own mix sets. Turning this to 1 does not make the site loud,
 * it makes it as loud as it was designed to get.
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

/** Noise with a bandpass sliding across it. The sound of losing tracking. */
function sweep(ac, out, at, duration, fromHz, toHz, gain) {
  const frames = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 4;
  band.frequency.setValueAtTime(fromHz, at);
  band.frequency.exponentialRampToValueAtTime(toHz, at + duration);

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
 * It is a VHS deck, and every layer is a real artefact of one rather than a
 * synth patch chosen to sound futuristic: a transport spinning up with wow and
 * flutter on it, tape hiss under everything, 60Hz mains hum from an unshielded
 * analogue path, the head-switching clicks that land at the bottom of a frame,
 * and two tracking errors where a bandpass runs across noise.
 *
 * The shape follows what is on screen. Engage under the aperture, data blips
 * while the breach matrix fills, tracking errors timed to the visual signal
 * tears at T.glitch, a low thump as the name locks, and a bare fifth under the
 * greeting. If BootSequence's timeline moves, these move with it.
 */
export function playBootSound() {
  // Bail before constructing anything if the page has not been interacted with
  // yet. Chrome logs "The AudioContext was not allowed to start" for a context
  // built outside a gesture, and with sound defaulting to on that warning would
  // greet every first load. `userActivation` is not universal, so where it is
  // missing we fall through and let the state check below do the work.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false;

  const ac = context();
  if (!ac) return false;

  // Suspended means no gesture has unlocked audio on this page yet. Ask, but
  // do not wait: a boot cue that arrives late is worse than one that is absent.
  if (ac.state === "suspended") ac.resume().catch(() => {});
  if (ac.state !== "running") return false;

  const master = ac.createGain();
  master.gain.value = MASTER_GAIN * getVolume();
  master.connect(ac.destination);

  const t = ac.currentTime + 0.02;

  // --- tape engage --------------------------------------------------------
  // A saw dragged up through a closing filter with vibrato on it. This is the
  // sound of a transport spinning up to speed: the pitch is unstable while it
  // gets there, which is what the LFO on `detune` is doing.
  const engage = ac.createOscillator();
  engage.type = "sawtooth";
  engage.frequency.setValueAtTime(70, t);
  engage.frequency.exponentialRampToValueAtTime(210, t + 0.55);

  const wow = ac.createOscillator();          // wow and flutter
  wow.type = "sine";
  wow.frequency.value = 7.5;
  const wowDepth = ac.createGain();
  wowDepth.gain.setValueAtTime(90, t);
  wowDepth.gain.exponentialRampToValueAtTime(6, t + 0.7);
  wow.connect(wowDepth).connect(engage.detune);
  wow.start(t);
  wow.stop(t + 0.9);

  const engageLp = ac.createBiquadFilter();
  engageLp.type = "lowpass";
  engageLp.frequency.setValueAtTime(300, t);
  engageLp.frequency.exponentialRampToValueAtTime(1800, t + 0.6);

  const engageGain = ac.createGain();
  engageGain.gain.setValueAtTime(0.0001, t);
  engageGain.gain.exponentialRampToValueAtTime(0.075, t + 0.05);
  engageGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

  engage.connect(engageLp).connect(engageGain).connect(master);
  engage.start(t);
  engage.stop(t + 0.9);

  // --- static bed ---------------------------------------------------------
  // Runs under the whole sequence. Tape hiss is the thing that makes the rest
  // read as VHS rather than as generic synth.
  noise(ac, master, t, 2.9, 3200, 0.028);

  // --- mains hum ----------------------------------------------------------
  // 60Hz, barely there. Cheap and it does a lot: an unshielded analogue path
  // is the reason old tape captures buzz.
  tone(ac, master, { at: t, duration: 2.6, type: "sine", from: 60, gain: 0.02 });

  // --- head-switching pops ------------------------------------------------
  // The clicks at the bottom of a VHS frame where the head swaps. Short,
  // bright and irregular, because a regular one would read as a metronome.
  [0.34, 0.72, 1.06, 1.94].forEach((at, i) => {
    noise(ac, master, t + at, 0.03, 5200 + i * 700, 0.075);
  });

  // --- data blips over the breach matrix ----------------------------------
  // Four pips while the hex grid fills. Quiet, high, and out of the way.
  [0.45, 0.62, 0.79, 0.96].forEach((at, i) => {
    tone(ac, master, {
      at: t + at, duration: 0.04,
      type: "square", from: 1500 + i * 260, gain: 0.028,
    });
  });

  // --- tracking error -----------------------------------------------------
  // Timed to the visual signal tears at T.glitch. A noise sweep with a bandpass
  // running down it, which is the sound of a head losing the track.
  sweep(ac, master, t + 1.12, 0.3, 4800, 500, 0.09);
  sweep(ac, master, t + 1.38, 0.18, 900, 3600, 0.055);

  // --- lock ---------------------------------------------------------------
  // The name arriving. A low thump as the picture settles.
  tone(ac, master, { at: t + 1.68, duration: 0.4, type: "sine", from: 90, to: 42, gain: 0.5 });

  // --- resolve ------------------------------------------------------------
  // A bare fifth under the greeting, slightly detuned so it is not sterile.
  tone(ac, master, { at: t + 2.42, duration: 0.6, type: "sine", from: 330, gain: 0.12 });
  tone(ac, master, { at: t + 2.42, duration: 0.6, type: "sine", from: 494.5, gain: 0.085 });
  noise(ac, master, t + 2.42, 0.35, 5600, 0.03);

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

/**
 * Sound is on unless it has been switched off.
 *
 * Note what this can and cannot do. It sets the preference, not the
 * permission: browsers keep an AudioContext suspended until the page has seen
 * a user gesture, so the very first load in a fresh browser is silent whatever
 * this returns. Chrome relaxes that for origins the user actually engages
 * with, so it starts working by itself on repeat visits, and armAudioUnlock()
 * below gets there sooner.
 *
 * The three states are deliberate: absent means never chosen, so default on;
 * "0" means chosen off and must survive; "1" means chosen on.
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

/**
 * Ask BootSequence to run again. No-op when nothing is listening.
 *
 * `detail.greeting` overrides the line of voice for that run, which is how the
 * Konami easter egg says something the normal rotation never will.
 */
export function replayBoot(detail = {}) {
  window.dispatchEvent(new CustomEvent(BOOT_REPLAY, { detail }));
}

/**
 * Unlock audio on the reader's next interaction, without making a sound.
 *
 * Called when the boot cue was blocked by autoplay policy. It deliberately
 * does NOT play anything when it fires: a chime that goes off because someone
 * clicked a project card reads as a bug, not as a feature. All it does is get
 * the context out of `suspended`, so the next boot in this session is audible
 * and the browser sees the engagement that makes future loads audible too.
 */
export function armAudioUnlock() {
  const events = ["pointerdown", "keydown", "touchstart"];
  const once = () => {
    events.forEach((e) => window.removeEventListener(e, once));
    unlockAudio();
  };
  events.forEach((e) => window.addEventListener(e, once, { once: true, passive: true }));
  return () => events.forEach((e) => window.removeEventListener(e, once));
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
