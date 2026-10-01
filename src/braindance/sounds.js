// src/braindance/sounds.js: the city's own sounds, synthesized.
//
// No recordings: everything here is oscillators and noise on the shared
// AudioContext, so the braindance adds no download for its sound.
//
//   the S4     a supercharged 3.0 V6. Its firing note is three pulses a
//              turn of the crank, from an engine speed worked out of the
//              car's speed through six gears, so it climbs and drops a
//              note at each change; a sub an octave down for the burble; a
//              blower whine that rises with the revs, as a dual-pulley
//              supercharger's does. Through a soft clipper and a filter
//              that opens with the throttle. Tyres hiss on the wet road
//              with speed. All of it placed where the car is, heard from
//              where the camera is.
//   the rain   pink-ish noise, louder at street level.
//   the roof   somebody's beacon, keying ALDO in Morse, there to be found.
//   the editor the scanner charging, a scan landing, a layer switching, an
//              achievement, a cut.
//
// A paused braindance is silent apart from the rain's hush, as an editor
// holding a frame would be. Fast forward raises every pitch with the tape.

const MORSE = ".- .-.. -.. ---";

function noiseBuffer(ac, seconds = 2) {
  const buffer = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const d = buffer.getChannelData(0);
  // Paul Kellet's pink filter, cheap version.
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
  }
  return buffer;
}

function clipper(ac, amount = 3) {
  const shaper = ac.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  shaper.curve = curve;
  shaper.oversample = "2x";
  return shaper;
}

// Gears by speed, m/s: where each starts.
const GEARS = [0, 7, 13, 20, 28, 37];
function rpmFor(v) {
  const s = Math.abs(v);
  if (s < 0.3) return 780;
  let g = 0;
  while (g + 1 < GEARS.length && s >= GEARS[g + 1]) g++;
  const lo = GEARS[g];
  const hi = GEARS[g + 1] ?? lo + 14;
  const k = (s - lo) / (hi - lo);
  return 1500 + k * (g === 0 ? 2600 : 1900) + g * 120;
}

export function createSounds(audio) {
  const ac = audio.context;
  const out = audio.city;
  const noise = noiseBuffer(ac);
  const now = () => ac.currentTime;

  // ---- the car ----
  const panner = ac.createPanner();
  panner.panningModel = "HRTF";
  panner.distanceModel = "inverse";
  panner.refDistance = 5;
  panner.rolloffFactor = 1.1;
  panner.maxDistance = 400;
  const carBus = ac.createGain();
  carBus.gain.value = 0;
  carBus.connect(panner).connect(out);

  const engineTone = ac.createBiquadFilter();
  engineTone.type = "lowpass";
  engineTone.frequency.value = 500;
  engineTone.Q.value = 1.2;
  const clip = clipper(ac, 2.6);
  const engineGain = ac.createGain();
  engineGain.gain.value = 0.24;
  clip.connect(engineTone).connect(engineGain).connect(carBus);
  const fire = ac.createOscillator();
  fire.type = "sawtooth";
  const sub = ac.createOscillator();
  sub.type = "sawtooth";
  const odd = ac.createOscillator();
  odd.type = "square";
  const fireG = ac.createGain();
  fireG.gain.value = 0.5;
  const subG = ac.createGain();
  subG.gain.value = 0.55;
  const oddG = ac.createGain();
  oddG.gain.value = 0.12;
  fire.connect(fireG).connect(clip);
  sub.connect(subG).connect(clip);
  odd.connect(oddG).connect(clip);
  // A slow wobble on the firing note, as a real idle never sits still.
  const wobble = ac.createOscillator();
  wobble.frequency.value = 6.5;
  const wobbleG = ac.createGain();
  wobbleG.gain.value = 1.2;
  wobble.connect(wobbleG);
  wobbleG.connect(fire.frequency);
  wobbleG.connect(sub.frequency);

  const whine = ac.createOscillator();
  whine.type = "sine";
  const whineG = ac.createGain();
  whineG.gain.value = 0;
  whine.connect(whineG).connect(carBus);

  const tyre = ac.createBufferSource();
  tyre.buffer = noise;
  tyre.loop = true;
  const tyreTone = ac.createBiquadFilter();
  tyreTone.type = "bandpass";
  tyreTone.frequency.value = 900;
  tyreTone.Q.value = 0.6;
  const tyreG = ac.createGain();
  tyreG.gain.value = 0;
  tyre.connect(tyreTone).connect(tyreG).connect(carBus);

  // ---- the rain ----
  const rain = ac.createBufferSource();
  rain.buffer = noise;
  rain.loop = true;
  rain.playbackRate.value = 0.93;
  const rainHi = ac.createBiquadFilter();
  rainHi.type = "highpass";
  rainHi.frequency.value = 700;
  const rainLo = ac.createBiquadFilter();
  rainLo.type = "lowpass";
  rainLo.frequency.value = 7000;
  const rainG = ac.createGain();
  rainG.gain.value = 0;
  rain.connect(rainHi).connect(rainLo).connect(rainG).connect(out);

  // ---- the beacon on the roof ----
  const beaconPan = ac.createPanner();
  beaconPan.panningModel = "HRTF";
  beaconPan.distanceModel = "inverse";
  beaconPan.refDistance = 3;
  beaconPan.rolloffFactor = 1.4;
  const beacon = ac.createOscillator();
  beacon.type = "sine";
  beacon.frequency.value = 1180;
  const key = ac.createGain();
  key.gain.value = 0;
  const beaconG = ac.createGain();
  beaconG.gain.value = 0.0;
  beacon.connect(key).connect(beaconG).connect(beaconPan).connect(out);
  // The message, as on/off steps of one unit (dot 1, dash 3, gaps 1 and 3,
  // a long rest at the end), looped.
  const steps = [];
  for (const ch of MORSE) {
    if (ch === ".") steps.push(1, 0);
    else if (ch === "-") steps.push(1, 1, 1, 0);
    else steps.push(0, 0);
  }
  steps.push(0, 0, 0, 0, 0, 0, 0, 0);
  const UNIT = 0.085;
  let beaconAt = 0;

  for (const o of [fire, sub, odd, wobble, whine, tyre, rain, beacon]) o.start();

  const lastPos = { x: 0, y: 0, z: 0 };
  let lastV = 0;
  let live = 0;

  const setListener = (cam, fwd) => {
    const l = ac.listener;
    if (l.positionX) {
      l.positionX.setTargetAtTime(cam.x, now(), 0.03);
      l.positionY.setTargetAtTime(cam.y, now(), 0.03);
      l.positionZ.setTargetAtTime(cam.z, now(), 0.03);
      l.forwardX.setTargetAtTime(fwd.x, now(), 0.03);
      l.forwardY.setTargetAtTime(fwd.y, now(), 0.03);
      l.forwardZ.setTargetAtTime(fwd.z, now(), 0.03);
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(cam.x, cam.y, cam.z);
      l.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  };
  const place = (p, x, y, z) => {
    if (p.positionX) {
      p.positionX.setTargetAtTime(x, now(), 0.03);
      p.positionY.setTargetAtTime(y, now(), 0.03);
      p.positionZ.setTargetAtTime(z, now(), 0.03);
    } else p.setPosition(x, y, z);
  };

  // ---- the editor's own sounds ----
  const blip = (freq, dur, type = "sine", gain = 0.08, slide = 0) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, now());
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, now() + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(gain, now() + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
    o.connect(g).connect(out);
    o.start();
    o.stop(now() + dur + 0.05);
  };
  const burst = (dur = 0.12, gain = 0.06, freq = 2400) => {
    const s = ac.createBufferSource();
    s.buffer = noise;
    const f = ac.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, now());
    g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
    s.connect(f).connect(g).connect(out);
    s.start(now(), Math.random());
    s.stop(now() + dur + 0.02);
  };
  let charge = null;

  return {
    /**
     * Once a frame: `car` { x, y, z, heading, v } in recording time,
     * `cam` and `fwd` the camera, `rate` the tape's speed (1, 2, 4), and
     * whether it is playing.
     */
    update(dt, { car, cam, fwd, playing, rate = 1, beaconAt: roof }) {
      live += ((playing ? 1 : 0) - live) * Math.min(1, dt * 10);
      setListener(cam, fwd);
      place(panner, car.x, 0.6, car.z);
      const v = Math.abs(car.v) * rate;
      const accel = dt > 0 ? (v - lastV) / dt : 0;
      lastV = v;
      const rpm = rpmFor(v / rate) * (rate > 1 ? 1 + (rate - 1) * 0.35 : 1);
      const f = (rpm / 60) * 1.5;
      const t = now();
      fire.frequency.setTargetAtTime(f, t, 0.06);
      sub.frequency.setTargetAtTime(f / 2, t, 0.06);
      odd.frequency.setTargetAtTime(f * 1.5, t, 0.06);
      whine.frequency.setTargetAtTime(rpm / 3.1, t, 0.08);
      const load = Math.min(1, Math.max(0, 0.25 + accel * 0.08));
      engineTone.frequency.setTargetAtTime(380 + rpm * 0.18 + load * 900, t, 0.08);
      whineG.gain.setTargetAtTime((0.012 + Math.min(1, rpm / 5000) * 0.03) * live, t, 0.1);
      tyreG.gain.setTargetAtTime(Math.min(0.12, v * 0.006) * live, t, 0.1);
      carBus.gain.setTargetAtTime(0.9 * live, t, 0.05);
      // The rain: louder down in the street, a hush when paused.
      const street = 1 - Math.min(1, Math.max(0, (cam.y - 4) / 40));
      rainG.gain.setTargetAtTime((0.05 + 0.07 * street) * (0.35 + 0.65 * live), t, 0.2);
      rain.playbackRate.setTargetAtTime(0.93 * (rate > 1 ? 1 + (rate - 1) * 0.2 : 1), t, 0.1);
      // The beacon, keyed on the audio clock.
      if (roof) {
        place(beaconPan, roof.x, roof.y, roof.z);
        beaconG.gain.setTargetAtTime(0.05 * live, t, 0.1);
        if (beaconAt < t) beaconAt = t;
        while (beaconAt < t + 0.3) {
          const step = Math.floor(beaconAt / UNIT) % steps.length;
          key.gain.setValueAtTime(steps[step] ? 1 : 0, beaconAt);
          beaconAt += UNIT;
        }
      } else {
        beaconG.gain.setTargetAtTime(0, t, 0.1);
      }
      lastPos.x = car.x;
      lastPos.z = car.z;
    },
    /** The scanner's charge, 0..1, while a click is held on a clue. */
    charging(p) {
      if (p > 0 && !charge) {
        const o = ac.createOscillator();
        o.type = "triangle";
        const g = ac.createGain();
        g.gain.value = 0;
        o.connect(g).connect(out);
        o.start();
        charge = { o, g };
      }
      if (!charge) return;
      charge.o.frequency.setTargetAtTime(380 + p * 900, now(), 0.02);
      charge.g.gain.setTargetAtTime(p > 0 ? 0.035 : 0, now(), 0.03);
      if (p <= 0) {
        const c = charge;
        charge = null;
        c.o.stop(now() + 0.2);
      }
    },
    scanned() {
      blip(880, 0.12, "triangle", 0.07);
      window.setTimeout(() => blip(1320, 0.22, "triangle", 0.06), 70);
      burst(0.08, 0.03, 4200);
    },
    achievement() {
      [660, 880, 1100, 1320].forEach((f, i) => window.setTimeout(() => blip(f, 0.25, "square", 0.025), i * 70));
    },
    layer(name) {
      const f = name === "audio" ? 420 : name === "thermal" ? 220 : 640;
      blip(f, 0.35, "sawtooth", 0.025, 2.2);
      burst(0.3, 0.02, 1200);
    },
    /** An incoming holocall: two short tones, twice. */
    ring() {
      [0, 0.16, 0.6, 0.76].forEach((at, i) => window.setTimeout(() => blip(i % 2 ? 1250 : 990, 0.13, "sine", 0.05), at * 1000));
    },
    cut() {
      burst(0.09, 0.025, 3000);
    },
    tick() {
      blip(1600, 0.03, "square", 0.015);
    },
    dispose() {
      for (const o of [fire, sub, odd, wobble, whine, tyre, rain, beacon]) {
        try {
          o.stop();
        } catch {
          // Stopped.
        }
      }
      charge?.o.stop();
      carBus.disconnect();
      panner.disconnect();
      rainG.disconnect();
      beaconPan.disconnect();
    },
  };
}
