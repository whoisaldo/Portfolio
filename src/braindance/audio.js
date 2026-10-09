// src/braindance/audio.js: the braindance's sound.
//
// The same AudioContext as the rest of the site (src/lib/audio.js), so the
// door's click is the gesture that lets it play, but its own graph: the
// cinematic's player (src/lib/ambient.js) loops a track forward and fades,
// and a braindance has to seek, run at two and four times, and run
// backwards.
//
//   the deck     the song, decoded once. Forward playback is the buffer at
//                a playback rate, so fast forward is tape fast (pitched up,
//                as a braindance's is). Rewind plays a reversed copy of the
//                buffer, made the first time it is asked for, so going
//                back sounds like going back.
//   the bus      music and the city into one gain (volume, mute), then an
//                analyser the city's music-reactive light reads, then out.
//   the layers   the audio layer pulls the music down and back (a lowpass,
//                like hearing it through a wall) so the city's own sounds
//                come forward; thermal takes the top off a little.
import { audioContext, getVolume } from "../lib/audio.js";

const TRACK_URL = (import.meta.env?.BASE_URL || "/") + "audio/ambient.m4a";

let decoded = null;

/** The song, fetched and decoded once per page (the cinematic's download is
 *  usually already in the browser's cache). */
function loadTrack(ac) {
  if (!decoded) {
    decoded = fetch(TRACK_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`track ${r.status}`);
        return r.arrayBuffer();
      })
      .then((bytes) => ac.decodeAudioData(bytes))
      .catch((err) => {
        decoded = null;
        throw err;
      });
  }
  return decoded;
}

function reverse(ac, buffer) {
  const out = ac.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0, n = src.length; i < n; i++) dst[i] = src[n - 1 - i];
  }
  return out;
}

const bins = new Uint8Array(256);

export function createAudio() {
  const ac = audioContext();
  if (!ac) return null;

  const master = ac.createGain();
  master.gain.value = 0;
  const analyser = ac.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.55;
  analyser.minDecibels = -72;
  analyser.maxDecibels = -12;
  master.connect(analyser).connect(ac.destination);

  // The music's own strip: a lowpass the layers move, then its level.
  const musicTone = ac.createBiquadFilter();
  musicTone.type = "lowpass";
  musicTone.frequency.value = 20000;
  musicTone.Q.value = 0.7;
  const music = ac.createGain();
  music.gain.value = 1;
  musicTone.connect(music).connect(master);
  // The city's sounds (the engine, the rain, the sound clues) join here.
  const city = ac.createGain();
  city.gain.value = 1;
  city.connect(master);

  let buffer = null;
  let backwards = null;
  let source = null;
  let startedAt = 0;
  let startOffset = 0;
  let rate = 1;
  let dir = 1;
  let paused = 0;
  let muted = false;
  // The radio: the song on or off. Off, the deck keeps the clock and the
  // city keeps its sounds.
  let radio = true;
  let layerGain = 1;

  const level = () => (muted ? 0 : getVolume() * 1.6);

  const stopSource = () => {
    if (!source) return;
    try {
      source.onended = null;
      source.stop();
    } catch {
      // Already stopped.
    }
    source.disconnect();
    source = null;
  };

  const api = {
    context: ac,
    /** The bus the city's sounds connect to. */
    city,
    get ready() {
      return Boolean(buffer);
    },
    get duration() {
      return buffer?.duration ?? 0;
    },
    async load() {
      buffer = await loadTrack(ac);
      master.gain.setTargetAtTime(level(), ac.currentTime, 0.2);
      return buffer;
    },
    /** Play from `t` seconds at `r` times, forward (1) or back (-1). */
    play(t, r = 1, d = 1) {
      if (!buffer || ac.state !== "running") return false;
      stopSource();
      rate = r;
      dir = d;
      const at = Math.min(Math.max(0, t), buffer.duration - 0.01);
      if (d < 0 && !backwards) backwards = reverse(ac, buffer);
      source = ac.createBufferSource();
      source.buffer = d < 0 ? backwards : buffer;
      source.playbackRate.value = r;
      source.connect(musicTone);
      startedAt = ac.currentTime;
      startOffset = at;
      source.start(0, d < 0 ? buffer.duration - at : at);
      return true;
    },
    pause() {
      paused = api.time() ?? paused;
      stopSource();
    },
    get playing() {
      return Boolean(source);
    },
    /** The deck's position in the song, or null when nothing is playing. */
    time() {
      if (!source) return null;
      const run = (ac.currentTime - startedAt) * rate;
      return dir > 0 ? startOffset + run : startOffset - run;
    },
    /** 0..1 levels for the city's music-reactive light, as ambient.js
     *  shapes them, so the city reacts the same here as on the page. */
    levels() {
      if (!source) return { level: 0, bass: 0 };
      analyser.getByteFrequencyData(bins);
      let b = 0;
      for (let i = 1; i <= 3; i++) b += bins[i];
      b /= 3 * 255;
      let l = 0;
      for (let i = 1; i <= 48; i++) l += bins[i];
      l /= 48 * 255;
      const shape = (v, floor, span) => Math.min(1, Math.max(0, (v - floor) / span));
      return { level: shape(l, 0.16, 0.4), bass: shape(b, 0.36, 0.38) };
    },
    /** The spectrum, for the radio's meter: 0..255 per bin. */
    spectrum(out) {
      analyser.getByteFrequencyData(out);
      return out;
    },
    setLayer(layer) {
      const now = ac.currentTime;
      const tone = layer === "audio" ? 650 : layer === "thermal" ? 5200 : 20000;
      layerGain = layer === "audio" ? 0.55 : 1;
      musicTone.frequency.setTargetAtTime(tone, now, 0.12);
      music.gain.setTargetAtTime(radio ? layerGain : 0, now, 0.12);
      city.gain.setTargetAtTime(layer === "audio" ? 1.8 : 1, now, 0.12);
    },
    setRadio(on) {
      radio = on;
      music.gain.setTargetAtTime(on ? layerGain : 0, ac.currentTime, 0.15);
    },
    setMuted(m) {
      muted = m;
      master.gain.setTargetAtTime(level(), ac.currentTime, 0.08);
    },
    dispose() {
      stopSource();
      master.gain.setTargetAtTime(0, ac.currentTime, 0.05);
      window.setTimeout(() => {
        master.disconnect();
        analyser.disconnect();
        musicTone.disconnect();
        music.disconnect();
        city.disconnect();
      }, 300);
    },
  };
  return api;
}
