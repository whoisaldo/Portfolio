// src/world/soundscape.js: the city, heard.
//
// With sound on, the street is heard as well as seen, under the music: rain
// on everything (on the garage's roof, from inside it), the low drone of a
// city at night, the air going past on a flight, thunder after each flash as
// many seconds later as the strike was far, the train on the viaduct while it
// crosses, the nearest AV going over, and now and then the police AV's siren
// from corpo row. Each of those is where the city draws it: its level is its
// distance from the lens, its side is its bearing, and its pitch is its speed
// toward or away (Doppler, from the speed of sound). All of it is noise and
// oscillators made here, so none of it is downloaded.
//
// It keeps the rules everything with a sound keeps (src/lib/audio.js): no
// context of its own and nothing before the reader has let sound in, the
// reader's volume over all of it, and nothing at all with sound off. It goes
// to the speakers on its own rather than through the music's bus, so the
// meter the city's lights move to hears the track alone. And it is quiet
// whenever the city rests: a cover, a hidden tab, the intro (which has its
// own sounds), the braindance.
import * as THREE from "three";
import { getVolume, runningContext, soundEnabled } from "../lib/audio.js";

const SOUND = 343;
// All of it, under the reader's volume: a bed under the track, not over it.
const LEVEL = 0.34;
// How often the voices are placed, in seconds (audio params, not pixels).
const TICK = 0.05;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (v, a, b) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Seconds of noise, white, pink or brown, whose end runs into its start. */
function noise(ac, kind, seconds, channels = 1) {
  const n = Math.floor(ac.sampleRate * seconds);
  const fade = Math.floor(ac.sampleRate * 0.05);
  const buffer = ac.createBuffer(channels, n, ac.sampleRate);
  const raw = new Float32Array(n + fade);
  for (let c = 0; c < channels; c++) {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") raw[i] = w * 0.5;
      else if (kind === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        raw[i] = last * 3.5;
      }
    }
    const out = buffer.getChannelData(c);
    out.set(raw.subarray(0, n));
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      out[i] = raw[i] * k + raw[n + i] * (1 - k);
    }
  }
  return buffer;
}

export function createSoundscape({ reduced = false } = {}) {
  let ac = null;
  let g = null;
  let active = false;
  let enabled = soundEnabled();
  let volume = getVolume();
  let poll = 0;
  let tick = 0;
  let heard = -1;
  const listener = new THREE.Vector3();
  const right = new THREE.Vector3();
  const _to = new THREE.Vector3();

  const set = (param, v, tc = 0.08) => param.setTargetAtTime(v, ac.currentTime, tc);

  // The whole graph, once, the first time sound is wanted with a context
  // already running.
  const build = (context) => {
    ac = context;
    const filter = (type, f, q = 0.7) => {
      const b = ac.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };
    const gain = (v = 0) => {
      const n = ac.createGain();
      n.gain.value = v;
      return n;
    };
    const sources = [];
    const loop = (buffer) => {
      const s = ac.createBufferSource();
      s.buffer = buffer;
      s.loop = true;
      s.start(ac.currentTime, Math.random() * buffer.duration);
      sources.push(s);
      return s;
    };
    const osc = (type, f) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.start();
      sources.push(o);
      return o;
    };
    const out = gain(0);
    out.connect(ac.destination);
    const white = noise(ac, "white", 2.5, 2);
    const pink = noise(ac, "pink", 3, 2);
    const brown = noise(ac, "brown", 4);

    // A thing in the city with a sound: through the air (higher frequencies
    // lost with distance), its level, and its side.
    const voice = (input, ref) => {
      const air = filter("lowpass", 12000);
      const level = gain();
      const side = ac.createStereoPanner();
      input.connect(air).connect(level).connect(side).connect(out);
      return { air, level, side, ref, d: null };
    };

    // The rain: a hiss of drops on everything, and the patter under it.
    const hissTone = filter("lowpass", 8000);
    const hiss = gain();
    loop(white).connect(filter("highpass", 1600)).connect(hissTone).connect(hiss).connect(out);
    const patterTone = filter("bandpass", 420, 0.6);
    const patter = gain();
    loop(pink).connect(patterTone).connect(patter).connect(out);

    // The city's drone: traffic a long way off, and the mains in every sign.
    const drone = gain();
    loop(brown).connect(filter("lowpass", 140)).connect(drone).connect(out);
    const hum = gain();
    osc("sine", 60).connect(hum).connect(out);
    osc("sine", 120).connect(gain(0.5)).connect(hum);

    // The air past the lens, rising with speed.
    const airBand = filter("bandpass", 500, 0.5);
    const air = gain();
    loop(white).connect(airBand).connect(air).connect(out);

    // The siren: a wail, rising and falling every three and a third seconds,
    // in bursts (`siren.next`).
    const sirenTone = osc("sawtooth", 960);
    const wail = osc("sine", 0.3);
    wail.connect(gain(330)).connect(sirenTone.frequency);
    const sirenBurst = gain();
    sirenTone.connect(filter("lowpass", 2200)).connect(sirenBurst);
    const siren = { ...voice(sirenBurst, 30), tone: sirenTone, burst: sirenBurst, next: 6 + Math.random() * 10 };

    // The train: its rumble, and the wheels on the rail joints.
    const trainIn = gain(1);
    loop(brown).connect(filter("lowpass", 260)).connect(gain(1.4)).connect(trainIn);
    const clack = gain(0.5);
    osc("square", 2.9).connect(gain(0.5)).connect(clack.gain);
    loop(pink).connect(filter("bandpass", 700, 1.5)).connect(clack).connect(trainIn);
    const train = voice(trainIn, 60);

    // An AV: a turbine's note and the jet's whine over it.
    const turbine = osc("sawtooth", 74);
    const whine = filter("bandpass", 1800, 1);
    const avIn = gain(1);
    turbine.connect(filter("lowpass", 520)).connect(gain(0.5)).connect(avIn);
    loop(white).connect(whine).connect(gain(0.6)).connect(avIn);
    const av = { ...voice(avIn, 22), turbine, whine, at: null };

    g = { out, sources, white, brown, filter, gain, hiss, hissTone, patter, patterTone, drone, hum, air, airBand, siren, train, av };
  };

  // How loud the whole city is: the reader's volume, if sound is on and the
  // city is running.
  const level = () => {
    if (!g) return;
    const on = enabled && active ? 1 : 0;
    set(g.out.gain, on * volume * LEVEL, on ? 0.35 : 0.2);
  };

  /** Place a voice at `at` (or nowhere, null) and return its Doppler factor. */
  const place = (v, at, loudness, dt) => {
    if (!at) {
      v.d = null;
      set(v.level.gain, 0, 0.3);
      return 1;
    }
    _to.subVectors(at, listener);
    const d = Math.max(1, _to.length());
    const rate = v.d === null ? 0 : (d - v.d) / dt;
    v.d = d;
    set(v.level.gain, loudness * Math.min(1, v.ref / d));
    set(v.air.frequency, clamp(18000 / (1 + d / 80), 260, 16000));
    set(v.side.pan, clamp(_to.dot(right) / d, -1, 1) * 0.85);
    return clamp(SOUND / (SOUND + rate), 0.8, 1.25);
  };

  const onSound = () => {
    enabled = soundEnabled();
    volume = getVolume();
    level();
  };
  window.addEventListener("aly:sound", onSound);

  return {
    /** Whether the city is running (its loop, not a cover or the intro). */
    setActive(on) {
      active = on;
      level();
    },
    /**
     * Once a frame of the page's own loop: where the lens is and how fast it
     * is going (m/s), whether it rains and whether the lens is in the
     * shelter, and traffic.js's `voices`.
     */
    update(dt, camera, { speed = 0, wet = true, inside = false, voices = null } = {}) {
      // The preference and the volume, twice a second (the slider sets
      // them without a word).
      poll -= dt;
      if (poll <= 0) {
        poll = 0.5;
        const was = `${enabled}|${volume}`;
        enabled = soundEnabled();
        volume = getVolume();
        if (`${enabled}|${volume}` !== was) level();
      }
      if (!enabled || !active) return;
      if (!g) {
        const context = runningContext();
        if (!context) return;
        build(context);
        level();
      }
      if (ac.state !== "running") return;
      tick += dt;
      if (tick < TICK) return;
      const step = tick;
      tick = 0;
      listener.copy(camera.position);
      right.setFromMatrixColumn(camera.matrixWorld, 0);

      // The rain, through the garage's roof from inside.
      const rain = wet ? 1 : 0;
      if (heard !== rain + (inside ? 2 : 0)) {
        heard = rain + (inside ? 2 : 0);
        set(g.hiss.gain, rain * (inside ? 0.05 : 0.16), 0.4);
        set(g.hissTone.frequency, inside ? 1500 : 8000, 0.4);
        set(g.patter.gain, rain * (inside ? 0.5 : 0.3), 0.4);
        set(g.patterTone.frequency, inside ? 240 : 420, 0.4);
        set(g.drone.gain, inside ? 0.3 : 0.55, 0.4);
        set(g.hum.gain, inside ? 0.012 : 0.006, 0.4);
      }

      // The air, from about a run up, over the rain on a fast flight.
      const rush = reduced ? 0 : smooth(speed, 8, 120);
      set(g.air.gain, 1.8 * rush, 0.12);
      set(g.airBand.frequency, 380 + Math.min(speed, 320) * 7, 0.12);

      // The police, in bursts: a wail or two every half a minute or so.
      const on = voices?.on !== false;
      const s = g.siren;
      s.next -= step;
      if (s.next <= 0) {
        s.next = 24 + Math.random() * 26;
        const t = ac.currentTime;
        const hold = Math.random() < 0.5 ? 6.7 : 3.4;
        s.burst.gain.cancelScheduledValues(t);
        s.burst.gain.setTargetAtTime(1, t, 0.15);
        s.burst.gain.setTargetAtTime(0, t + hold, 0.3);
      }
      const ds = place(s, on ? voices?.police : null, 1.6, step);
      set(s.tone.detune, 1200 * Math.log2(ds), 0.1);

      // The train, while it crosses.
      place(g.train, on && voices?.train ? voices.train : null, 1.4, step);

      // The nearest AV.
      let near = null;
      let best = Infinity;
      if (on && voices?.avs) {
        for (const p of voices.avs) {
          const d = p.distanceToSquared(listener);
          if (d < best) {
            best = d;
            near = p;
          }
        }
      }
      // A different AV is nearest: no Doppler from the jump between them.
      if (near !== g.av.at) {
        g.av.at = near;
        g.av.d = null;
      }
      const da = place(g.av, near, 0.6, step);
      set(g.av.turbine.detune, 1200 * Math.log2(da), 0.1);
      set(g.av.whine.frequency, 1800 * da, 0.1);
    },
    /**
     * Thunder, for a flash `distance` metres off at `at` (x, z), as strong
     * as `k`: as many seconds later as sound takes to come that far, lower
     * and longer the further it was, with a crack first if it was close.
     */
    strike(at, distance, k = 1) {
      if (!g || !enabled || !active || ac.state !== "running") return;
      const t = ac.currentTime + distance / SOUND;
      const near = clamp(1 - (distance - 500) / 900, 0, 1);
      _to.set(at.x - listener.x, 0, at.y - listener.z);
      const pan = clamp(_to.dot(right) / Math.max(1, _to.length()), -1, 1) * 0.7;
      const side = ac.createStereoPanner();
      side.pan.value = pan;
      side.connect(g.out);
      const rumble = ac.createBufferSource();
      rumble.buffer = g.brown;
      rumble.loop = true;
      const tone = g.filter("lowpass", 150 + 650 * near);
      const env = g.gain(0);
      rumble.connect(tone).connect(env).connect(side);
      const peak = 2.2 * k * (0.4 + 0.6 * near);
      // A first roll, then a second, longer one: thunder rolls.
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(peak, t + 0.08 + 0.3 * (1 - near));
      env.gain.setTargetAtTime(peak * 0.3, t + 0.45, 0.4);
      const again = t + 1 + Math.random() * 0.9;
      env.gain.setTargetAtTime(peak * 0.75, again, 0.18);
      env.gain.setTargetAtTime(0, again + 0.5, 1.3);
      rumble.start(t, Math.random() * 3);
      rumble.stop(again + 7);
      rumble.onended = () => side.disconnect();
      if (near > 0.45) {
        const crack = ac.createBufferSource();
        crack.buffer = g.white;
        const cenv = g.gain(0);
        crack.connect(g.filter("highpass", 1400)).connect(cenv).connect(side);
        cenv.gain.setValueAtTime(0.9 * k * near, t);
        cenv.gain.setTargetAtTime(0, t + 0.02, 0.09);
        crack.start(t, Math.random());
        crack.stop(t + 0.8);
      }
    },
    /** Dev: how far off each voice is and how loud it is now. */
    inspect() {
      if (!g) return null;
      const v = (x) => ({ d: x.d === null ? null : Math.round(x.d), level: +x.level.gain.value.toFixed(4) });
      return { out: +g.out.gain.value.toFixed(3), air: +g.air.gain.value.toFixed(3), siren: { ...v(g.siren), burst: +g.siren.burst.gain.value.toFixed(2) }, train: v(g.train), av: v(g.av) };
    },
    dispose() {
      window.removeEventListener("aly:sound", onSound);
      if (!g) return;
      const t = ac.currentTime;
      g.out.gain.cancelScheduledValues(t);
      g.out.gain.setTargetAtTime(0, t, 0.05);
      const { out, sources } = g;
      window.setTimeout(() => {
        for (const s of sources) {
          try {
            s.stop();
          } catch {
            // Never started, or already stopped.
          }
        }
        out.disconnect();
      }, 300);
      g = null;
    },
  };
}
