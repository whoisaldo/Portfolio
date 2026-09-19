// src/components/IntroCinematic.jsx: the intro, choreographed to the track.
//
// Every visual beat is a position in the song, read off the audio clock each
// frame, so the car launches on the frame the drums come in whether the
// download took two seconds or ten. See src/lib/cues.js for the numbers and
// how they were measured.
//
// The shape, in song seconds:
//
//    8.9  the moon. Two figures on the lunar surface with their backs to us,
//         Earth enormous above them, and the arpeggio. Dust drifts up
//         through the frame, a star falls, Earth's glow breathes with the
//         music.
//   16.75 the first title card tears in with a digital stutter. Three of
//         them, on the three vocal entries, each one big enough to be the
//         only thing on screen.
//   26.1  ignition. A synth swell; the last card is gone and the name
//         resolves out of noise in its place, headlights bloom from the
//         right edge, an engine turns over, the moon recedes behind a road.
//   30.1  the drop. The drums enter and a car comes in from the right, in
//         three dimensions this time: it yaws into a slide with its tail to
//         the camera, the front wheels counter-steer, smoke pours off the
//         rears, the page is revealed in its wake right to left, and the car
//         powers away up the road toward the skyline.
//   33.6  the car is gone, the overlay with it, and the music ducks to a bed.
//
// An earlier cut of this filled the quiet phrase with a breach-protocol hex
// matrix and a four-line measured readout. Both were honest, and both were
// clutter: a viewer with sixteen seconds of moonlight in front of them was
// reading small mono text in two corners instead. They are gone. What is
// left on screen before the car is the plate, the credit, and the cards.
//
// Rules, since a cinematic is a standing invitation to break all of them:
//
//   1. IT CAN ALWAYS BE LEFT. A Skip button, Escape, Enter and Space all end
//      it immediately, and the page underneath was rendered from the first
//      frame. Under prefers-reduced-motion it never starts at all.
//   2. NO INVENTED TELEMETRY. Nothing here dresses ornament up as a readout.
//   3. IT ENDS ON ITS OWN. The song clock ends it; if there is no song, a
//      plain timer runs the identical timeline.
//   4. IT DEGRADES. The 3D car needs WebGL and a 600 kB chunk that is only
//      fetched once the door is on screen. If either is missing when the
//      drums come in, the flat car from the first version drives the same
//      path instead.
//
// The reader's second visit in the same tab gets the short version: one bar
// of the quiet before the drums, then the drift. The full one is a click away
// in the footer, and ?intro=full forces it.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDecode, useKonami, useMediaQuery } from "../hooks";
import { profile } from "../data/profile";
import { img } from "../data/images";
import { s4Poster } from "../data/s4";
import Picture from "./Picture";
import { INTRO_START, markIntroSeen, setIntroDone, useReplayIntro } from "../lib/intro";
import { audioContext } from "../lib/audio";
import { AMBIENT_EVENT, getLevels, isPlaying, isTrackPlaying, setDuck, songTime } from "../lib/ambient";
import { cancelIntroSfx, scheduleIntroSfx } from "../lib/intro-sfx";
import { loadDrift } from "../lib/drift";
import * as C from "../lib/cues";

// Two cuts of the moon: the 16:9 plate, and a portrait plate painted from it
// for phones, where a cover-fit of the wide one lost both sides of Earth.
const MOON = img("Intro/Moon");
const MOON_PORTRAIT = img("Intro/MoonPortrait");
const CAR = s4Poster;

// The track, credited. Only shown while it is actually playing.
const TRACK = {
  title: "I Really Want to Stay at Your House",
  artist: "Rosa Walton & Hallie Coggins",
};

// How long to hold the black for the track to start before running the
// timeline on a timer instead. The bytes were prefetched while the door was
// up, so this is normally a few hundred milliseconds of decode; six seconds
// covers a slow connection without the reader ever wondering if it broke.
const WAIT_FOR_TRACK_MS = 6000;

// Voice, not data. The opener and the middle rotate; the closer is fixed
// because it is the line the reader is meant to leave on.
const OPENERS = ["wake up, choom.", "eyes up, choom.", "deck's warm, choom.", "rise and shine, choom."];
const MIDDLES = ["signal's clean.", "ice is down.", "no daemons on the line.", "flatlined the handshake."];
const CLOSER = "preem. you're in.";

// Two falling stars, on quiet beats of the arpeggio, at different places in
// the sky.
const METEORS = [
  { at: 12.0, x: "64%", y: "8%", angle: "22deg" },
  { at: 22.4, x: "28%", y: "5%", angle: "16deg" },
];

const clamp = (p) => Math.min(1, Math.max(0, p));
const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 3);
const easeIn = (p) => Math.pow(clamp(p), 3);

/** The flat car's rendered width, in CSS px, for the viewport we have. */
function carWidthPx() {
  const w = window.innerWidth;
  return w < 640 ? w * 0.96 : Math.min(980, Math.max(300, w * 0.72));
}

/**
 * Where the flat car is at song time `s`. The fallback path, used only when
 * the 3D scene could not be built. Three legs: a fast slide in that bleeds
 * off speed as the rear steps out, a beat of counter-steer at the apex, and
 * the launch out of frame.
 */
function carPose(s) {
  const d = s - C.DROP;
  const inDur = 1.15;
  const holdEnd = C.WIPE_START - C.DROP;
  const outEnd = C.CAR_GONE - C.DROP;
  if (d < inDur) {
    const p = easeOut(d / inDur);
    return { x: 82 - p * 94, y: 3 - p * 5, rot: 5 - p * 24, scale: 0.72 + p * 0.23, speed: 1 - p * 0.75 };
  }
  if (d < holdEnd) {
    const p = clamp((d - inDur) / (holdEnd - inDur));
    return { x: -12 - p * 5, y: -2, rot: -19 + p * 6, scale: 0.95 + p * 0.03, speed: 0.25 };
  }
  const p = Math.pow(clamp((d - holdEnd) / (outEnd - holdEnd)), 2.5);
  return { x: -17 - p * 190, y: -2 + p * 9, rot: -13 + p * 10, scale: 0.98 + p * 0.4, speed: 0.3 + p * 0.7 };
}

/** 0 before ignition, 1 at the drop: how far the moon has receded. */
const recede = (s) => easeIn(clamp((s - C.IGNITION) / (C.DROP - C.IGNITION)));

/**
 * Camera shake of amplitude `amp` px at song time `s`: three sines per axis
 * at unrelated frequencies, so the frame rumbles. The first cut drew a fresh
 * random offset every frame, and a car moving smoothly through a frame that
 * lands somewhere new sixty times a second is a car that jitters. This is
 * continuous between frames, and a function of the song, so a still is the
 * same still every time.
 */
function rumble(s, amp) {
  const t = s * Math.PI * 2;
  const x = 0.5 * Math.sin(t * 7.3) + 0.3 * Math.sin(t * 11.9 + 1.7) + 0.2 * Math.sin(t * 15.1 + 0.4);
  const y = 0.5 * Math.sin(t * 8.1 + 2.1) + 0.3 * Math.sin(t * 12.7 + 0.9) + 0.2 * Math.sin(t * 16.3 + 2.6);
  return `translate(${(x * amp * 0.5).toFixed(2)}px, ${(y * amp * 0.5).toFixed(2)}px)`;
}

/** One title card. Tears in through CSS slices with a magenta and a cyan
 *  copy offset behind it, holds, and tears out. */
function TitleCard({ text, out }) {
  return (
    <motion.p
      className="font-display font-bold text-primary leading-[0.95] tracking-[-0.01em]"
      style={{ fontSize: "clamp(2.5rem, 8vw, 7rem)", textWrap: "balance" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: out ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: out ? 0.26 : 0.04 }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" data-text={text} className={`intro-card-text ${out ? "is-out" : "is-in"}`}>
        {text}
      </span>
    </motion.p>
  );
}

/**
 * The name, resolving out of character noise once `on` flips.
 *
 * The finished string is laid out invisibly and the animated copy sits on
 * top of it, anchored at the left. Random glyphs are wider or narrower than
 * the letters they stand in for, and a centred line re-centres on every
 * frame of that, which reads as the whole name shivering. Anchored, only the
 * right edge moves.
 */
function NameDecode({ text, on, burst }) {
  const shown = useDecode(text, { active: on, duration: 900 });
  return (
    <motion.span
      className={`font-display font-bold uppercase text-primary block leading-none ${burst ? "chromatic-aberration" : ""}`}
      style={{ fontSize: "clamp(2.6rem, 9vw, 8rem)", letterSpacing: "0.01em", "--burst": burst ? 1 : 0 }}
      initial={{ opacity: 0, scaleX: 1.06 }}
      animate={{ opacity: on ? 1 : 0, scaleX: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 0.9, 0.25, 1] }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="relative inline-block whitespace-nowrap">
        <span className="invisible">{text}</span>
        <span className="absolute left-0 top-0">{shown}</span>
      </span>
    </motion.span>
  );
}

/** Deterministic pseudo-random numbers, so a rerender never re-rolls the sky. */
function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

/** A starfield in one box-shadow. */
function starfield(seed, count) {
  const rnd = rng(seed);
  const dots = [];
  for (let i = 0; i < count; i++) {
    const px = (rnd() * 100).toFixed(2);
    const py = (rnd() * 100).toFixed(2);
    const a = (0.25 + rnd() * 0.7).toFixed(2);
    dots.push(`${px}vw ${py}vh 0 0 rgb(236 234 228 / ${a})`);
  }
  return dots.join(", ");
}

/** Moon dust: slow motes rising through the frame. */
function motesOf(seed, count) {
  const rnd = rng(seed ^ 0x9e3779b9);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(rnd() * 100).toFixed(2)}%`,
    top: `${(30 + rnd() * 75).toFixed(2)}%`,
    s: `${(1.5 + rnd() * 2.5).toFixed(1)}px`,
    d: `${(9 + rnd() * 9).toFixed(1)}s`,
    delay: `${(-rnd() * 14).toFixed(1)}s`,
    dx: `${((rnd() - 0.5) * 60).toFixed(0)}px`,
    o: (0.35 + rnd() * 0.5).toFixed(2),
  }));
}

const FLAGS = {
  credit: false,
  card: -1,
  cardOut: false,
  name: false,
  kicked: false,
  tuning: false,
  meteor: -1,
};

export default function IntroCinematic() {
  const [run, setRun] = useState(null);
  const [phase, setPhase] = useState("moon");
  const [flags, setFlags] = useState(FLAGS);
  const [puffs, setPuffs] = useState([]);
  const portrait = useMediaQuery("(orientation: portrait)");

  const overlayRef = useRef(null);
  const worldRef = useRef(null);
  const moonRef = useRef(null);
  const earthRef = useRef(null);
  const dimRef = useRef(null);
  const roadRef = useRef(null);
  const glowRef = useRef(null);
  const carRef = useRef(null);
  const trailRef = useRef(null);
  const canvasRef = useRef(null);
  const threeRef = useRef(null);
  const threeFailedRef = useRef(false);
  const driftModRef = useRef(null);
  const clockRef = useRef(null);
  const doneRef = useRef(true);
  const lastPuffRef = useRef(0);
  const puffIdRef = useRef(0);
  const flagsRef = useRef(FLAGS);

  // Up up down down left right left right B A, anywhere on the page.
  const replayIntro = useReplayIntro();
  useKonami(() => replayIntro({ greeting: "breach protocol accepted, choom." }));

  // The gate, the console and the Konami code all start it the same way.
  useEffect(() => {
    const onStart = (e) => {
      const d = e.detail || {};
      doneRef.current = false;
      clockRef.current = null;
      flagsRef.current = FLAGS;
      lastPuffRef.current = 0;
      threeFailedRef.current = false;
      setFlags(FLAGS);
      setPuffs([]);
      setPhase("moon");
      setRun({
        id: Date.now(),
        // Same clock as a key event's timeStamp; see the skip handler below.
        startedAt: performance.now(),
        mode: d.mode === "short" ? "short" : "full",
        withSound: Boolean(d.withSound),
        greeting: d.greeting ?? null,
      });
      // The 3D chunk. Usually already in flight from the gate; either way
      // the promise is shared and a failure means the flat car.
      loadDrift()
        .then((m) => { driftModRef.current = m; })
        .catch(() => { threeFailedRef.current = true; });
    };
    window.addEventListener(INTRO_START, onStart);
    return () => window.removeEventListener(INTRO_START, onStart);
  }, []);

  // Picked once per run. The opener and the middle rotate; the closer lands.
  const lines = useMemo(() => {
    if (!run) return [];
    const closer = run.greeting ?? CLOSER;
    if (run.mode === "short") return [closer];
    return [
      OPENERS[Math.floor(Math.random() * OPENERS.length)],
      MIDDLES[Math.floor(Math.random() * MIDDLES.length)],
      closer,
    ];
  }, [run]);

  // When each card is on screen, in song seconds. A card leaves a beat
  // before the next arrives; the last leaves as the name takes its place.
  const cards = useMemo(() => {
    if (!run) return [];
    if (run.mode === "short") return [[C.SHORT_START + 0.1, C.DROP - 0.9]];
    return lines.map((_, i) => [
      C.VOICE_AT[i],
      i < lines.length - 1 ? C.VOICE_AT[i + 1] - 0.3 : C.IGNITION - 0.15,
    ]);
  }, [run, lines]);
  const nameAt = run?.mode === "short" ? C.DROP - 0.85 : C.IGNITION;

  const stars = useMemo(() => (run ? starfield(run.id, 150) : ""), [run]);
  const motes = useMemo(() => (run ? motesOf(run.id, 34) : []), [run]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    markIntroSeen();
    cancelIntroSfx();
    setDuck(C.CRUISE_GAIN, C.DUCK_SECONDS);
    // A skip during the wait for the track: the start still in flight will
    // arrive at intro gain, so duck it the moment it lands.
    if (!isPlaying()) {
      const once = () => {
        window.removeEventListener(AMBIENT_EVENT, once);
        setDuck(C.CRUISE_GAIN, 0.5);
      };
      window.addEventListener(AMBIENT_EVENT, once);
    }
    threeRef.current?.dispose();
    threeRef.current = null;
    setIntroDone(true);
    if (window.scrollY) window.scrollTo({ top: 0, behavior: "instant" });
    setRun(null);
  }, []);

  // Escape, Enter or Space leaves. The wheel is swallowed so the page under
  // the overlay stays at the top for the reveal.
  useEffect(() => {
    if (!run) return;
    const onKey = (e) => {
      // A key that asked for this run cannot also skip it. The console's
      // `intro` runs on the Enter that submits the line, and that keydown is
      // still on its way up when this listener is attached, with window its
      // last stop: without this the command started the cinematic and killed
      // it in the same keystroke. (A button is safe either way, because the
      // browser fires its click after the keydown is finished with.)
      if (e.timeStamp < run.startedAt) return;
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        finish();
      }
    };
    const swallow = (e) => e.preventDefault();
    window.addEventListener("keydown", onKey);
    const el = overlayRef.current;
    el?.addEventListener("wheel", swallow, { passive: false });
    el?.addEventListener("touchmove", swallow, { passive: false });
    document.documentElement.setAttribute("data-intro", "true");
    return () => {
      window.removeEventListener("keydown", onKey);
      el?.removeEventListener("wheel", swallow);
      el?.removeEventListener("touchmove", swallow);
      document.documentElement.removeAttribute("data-intro");
    };
  }, [run, finish]);

  // The clock and the frame loop.
  useEffect(() => {
    if (!run) return;
    const base = run.mode === "short" ? C.SHORT_START : C.SONG_START;
    const armedAt = performance.now();
    let raf = 0;

    const setFlag = (patch) => {
      const cur = flagsRef.current;
      let changed = false;
      const next = { ...cur };
      for (const k of Object.keys(patch)) {
        if (cur[k] !== patch[k]) {
          next[k] = patch[k];
          changed = true;
        }
      }
      if (changed) {
        flagsRef.current = next;
        setFlags(next);
      }
    };

    // The song clock, smoothed.
    //
    // songTime() is read off AudioContext.currentTime, which does not flow:
    // it steps once per render quantum, and the main thread sees the steps
    // land in bursts. Sampled once per frame, the song advanced 0 ms on one
    // frame and 26 ms on the next against a 16 ms frame. A car crossing the
    // screen at a thousand pixels a second was therefore up to twenty pixels
    // from where it belonged, a different amount every frame, which is what
    // judder is. So the frame runs on its own timestamp, which is regular,
    // and the audio clock only steers it: the estimate is pulled toward the
    // audio clock by a fraction of the gap each frame, which averages the
    // steps out, while a gap too large to be quantisation (a stalled track,
    // a seek) is honoured at once. Position in the song is still what
    // decides every beat; only the sub-frame noise is gone.
    const sync = { song: 0, frame: 0, live: false };
    const steer = (raw, frame) => {
      if (!sync.live) {
        sync.song = raw;
        sync.frame = frame;
        sync.live = true;
        return raw;
      }
      const est = sync.song + (frame - sync.frame) / 1000;
      sync.frame = frame;
      const gap = raw - est;
      if (gap > 0.1) {
        // The track is well ahead: it jumped, or we were away. Catch up.
        sync.song = raw;
      } else if (gap < -0.1) {
        // The track is well behind: it has stalled. Hold with it.
        // (sync.song stays where it is.)
      } else {
        sync.song = est + gap * 0.04;
      }
      return sync.song;
    };

    // Song seconds at the frame stamped `frame`, or null while still
    // waiting for the track.
    const now = (frame) => {
      const c = clockRef.current;
      if (!c) return null;
      if (c.kind === "song") {
        const raw = songTime();
        if (raw !== null) return steer(raw, frame);
        // The track has gone (the reader turned it off mid-run). Carry on
        // from where it left, on a timer, rather than stopping the film.
        clockRef.current = { kind: "timer", origin: frame, base: sync.live ? sync.song : base };
        return clockRef.current.base;
      }
      if (c.hold) return c.base;
      return c.base + (frame - c.origin) / 1000;
    };

    // The 3D scene, built the moment its chunk and the model have arrived,
    // which is normally before the first frame: the gate started them
    // downloading when it appeared. Building it is the one expensive
    // synchronous thing the intro does, and here it lands on the black
    // before the moon, or at worst somewhere in the quiet, instead of
    // right before a title card. The scene then compiles its shaders and
    // draws a hidden frame with the car in view (see warm() in
    // drift-scene.js), so the first frame of the drift has nothing left
    // to set up. Its canvas stays at opacity 0 until the car is due.
    const buildScene = () => {
      const mod = driftModRef.current;
      if (threeRef.current || threeFailedRef.current || !mod || !canvasRef.current) return;
      try {
        const three = mod.createDriftScene(canvasRef.current);
        threeRef.current = three;
        three.warm().catch((err) => {
          if (import.meta.env.DEV) console.warn("[intro] 3D warm-up failed; the first frame compiles instead", err);
        });
      } catch (err) {
        threeFailedRef.current = true;
        threeRef.current = null;
        if (import.meta.env.DEV) console.warn("[intro] 3D car unavailable, using the flat one", err);
      }
    };

    const arm = (frame) => {
      if (clockRef.current) return true;
      const ac = audioContext();
      if (run.withSound && isTrackPlaying() && ac) {
        clockRef.current = { kind: "song" };
      } else if (
        !run.withSound ||
        (isPlaying() && !isTrackPlaying()) ||
        performance.now() - armedAt > WAIT_FOR_TRACK_MS
      ) {
        // No track, or the synth fallback: the same timeline on a timer.
        clockRef.current = { kind: "timer", origin: frame, base };
      } else {
        return false;
      }
      if (run.withSound && ac && ac.state === "running") {
        const s0 = now(frame);
        const t0 = ac.currentTime;
        scheduleIntroSfx((cue) => t0 + (cue - s0), { cards: cards.map((c) => c[0]), name: nameAt });
      }
      return true;
    };

    const spawnPuffs = (s, pose, W) => {
      const stamp = performance.now();
      if (stamp - lastPuffRef.current < 42) return;
      lastPuffRef.current = stamp;
      const H = W * (2 / 3);
      const cx = window.innerWidth * (0.5 + pose.x / 100);
      const cy = window.innerHeight * (0.54 + pose.y / 100);
      const rad = (pose.rot * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const at = (dx, dy) => {
        const lx = dx * W * pose.scale;
        const ly = dy * H * pose.scale;
        return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
      };
      const fresh = [at(0.4, 0.11), at(0.47, 0.13)].map((p) => ({
        id: puffIdRef.current++,
        x: p.x,
        y: p.y,
        size: 60 + Math.random() * 70 * (0.6 + pose.speed),
        dx: (Math.random() * 80 + 30) * (pose.speed > 0.5 ? 1 : 0.5),
        born: stamp,
      }));
      setPuffs((prev) => [...prev.filter((p) => stamp - p.born < 1300), ...fresh].slice(-48));
    };

    const wipe = (edge) => {
      if (!overlayRef.current) return;
      const e = Math.max(-25, edge);
      overlayRef.current.style.clipPath = `polygon(0 0, ${(e + 10).toFixed(2)}vw 0, ${e.toFixed(2)}vw 100%, 0 100%)`;
    };

    // `stamp` is the frame's own timestamp, the time this frame is for: the
    // same clock as performance.now(), read at the start of the frame rather
    // than at whatever point in it this callback happened to run.
    let lastS = null;
    const frame = (stamp) => {
      raf = requestAnimationFrame(frame);
      buildScene();
      if (!arm(stamp)) {
        setFlag({ tuning: run.withSound && performance.now() - armedAt > 900 });
        return;
      }
      const s = now(stamp);
      lastS = s;
      if (s === null) return;

      if (s >= C.REVEAL) {
        finish();
        return;
      }
      if (s >= C.HERO_IN) setIntroDone(true);

      // ---- flags that gate React content ------------------------------
      const withTrack = run.withSound && isTrackPlaying();
      let card = -1;
      let cardOut = false;
      for (let i = 0; i < cards.length; i++) {
        const [on, off] = cards[i];
        if (s >= on && s < off) {
          card = i;
          cardOut = s >= off - 0.24;
          break;
        }
      }
      let meteor = -1;
      for (let i = 0; i < METEORS.length; i++) {
        if (s >= METEORS[i].at && s < METEORS[i].at + 1.6) meteor = i;
      }
      setFlag({
        tuning: false,
        credit: withTrack && s >= base + 0.8,
        card,
        cardOut,
        name: s >= nameAt,
        kicked: s >= C.KICK,
        meteor,
      });
      const nextPhase = s >= C.DROP ? "drift" : s >= C.IGNITION ? "ignition" : "moon";
      setPhase((p) => (p === nextPhase ? p : nextPhase));

      // ---- the world: moon, dim, road, glow, shake ---------------------
      const r = recede(s);
      const push = clamp((s - C.SONG_START) / (C.IGNITION - C.SONG_START));
      if (moonRef.current) {
        moonRef.current.style.transform = `translate3d(0, ${(-7 * r).toFixed(2)}vh, 0) scale(${(1 + 0.06 * push + 0.14 * r).toFixed(4)})`;
      }
      if (earthRef.current) earthRef.current.style.opacity = (1 - r).toFixed(3);
      if (dimRef.current) dimRef.current.style.opacity = (0.62 * r).toFixed(3);
      if (roadRef.current) roadRef.current.style.opacity = r.toFixed(3);
      if (glowRef.current) {
        const fade = s < C.DROP ? 1 : Math.max(0, 1 - (s - C.DROP) / 0.6);
        glowRef.current.style.opacity = (r * fade).toFixed(3);
      }
      let amp = 0;
      const d = s - C.DROP;
      if (d >= 0 && d < 1.2) amp = 6 * (1 - d / 1.2);
      if (s >= C.KICK && s < C.KICK + 0.35) amp += 10 * (1 - (s - C.KICK) / 0.35);
      const shake = amp ? rumble(s, amp) : "";
      if (worldRef.current) worldRef.current.style.transform = shake;
      if (canvasRef.current) canvasRef.current.style.transform = shake;

      // ---- the car ----------------------------------------------------
      const three = threeRef.current;

      if (three && s >= C.DROP - 0.4 && s < C.CAR_GONE) {
        // The car dissolves into the distance over the last half second
        // before the reveal, so the page never sees it cut off.
        if (canvasRef.current) {
          canvasRef.current.style.opacity = clamp((C.REVEAL - s) / 0.5).toFixed(3);
        }
        three.render(s);
        if (s >= C.DROP) {
          // The edge trails the car's rear while it is close, then runs
          // ahead of it as the car recedes: a car driving off toward the
          // horizon stops moving across the screen long before the black
          // is gone, and the reveal has to finish for HERO_IN.
          const e = three.edgeVw();
          const lead = 45 * Math.pow(clamp((s - C.DROP - 2.2) / 1.1), 1.6);
          wipe(e === null ? -25 : e + 1.5 - lead);
        }
      } else if (!three && s >= C.DROP && s < C.CAR_GONE) {
        const pose = carPose(s);
        const W = carWidthPx();
        const Wvw = (W / window.innerWidth) * 100;
        if (carRef.current) {
          carRef.current.style.opacity = "1";
          carRef.current.style.width = `${W}px`;
          carRef.current.style.transform =
            `translate(-50%, -50%) translate(${pose.x.toFixed(2)}vw, ${pose.y.toFixed(2)}vh) ` +
            `rotate(${pose.rot.toFixed(2)}deg) scale(${pose.scale.toFixed(3)})`;
        }
        if (trailRef.current) trailRef.current.style.transform = `scaleX(${pose.speed.toFixed(3)})`;
        wipe(50 + pose.x + 0.42 * Wvw * pose.scale + 2);
        if (pose.speed > 0.2) spawnPuffs(s, pose, W);
      } else {
        if (carRef.current) carRef.current.style.opacity = "0";
        if (s >= C.CAR_GONE) {
          wipe(-25);
          if (canvasRef.current) canvasRef.current.style.opacity = "0";
        }
      }
    };

    // Dev only: a scrub for tuning the cues without sitting through the
    // song. `window.__intro.seek(30.0)` jumps the timeline to any second of
    // the track; `seek(30.0, true)` holds it there, frozen, for a still.
    // Both replace the clock with a timer, so they are for silent runs;
    // with the track playing the song's own clock wins next frame.
    if (import.meta.env.DEV) {
      window.__intro = {
        seek: (s, hold = false) => {
          clockRef.current = { kind: "timer", origin: performance.now(), base: s, hold };
        },
        levels: getLevels,
        now: () => lastS,
        three: () => Boolean(threeRef.current),
      };
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      threeRef.current?.dispose();
      threeRef.current = null;
      if (import.meta.env.DEV) delete window.__intro;
    };
  }, [run, lines, cards, nameAt, finish]);

  const target = profile.name.toUpperCase();
  const drifting = phase === "drift";
  const textOn = flags.card >= 0 || flags.name;

  return (
    <AnimatePresence>
      {run && (
        <React.Fragment key={run.id}>
          {/* The overlay. Everything but the car lives in here, because this
              is the element the wipe clips away. */}
          <motion.div
            ref={overlayRef}
            className="fixed inset-0 z-[110] overflow-hidden bg-ink-deep select-none"
            // Opaque from its first frame: the gate's own fade is the
            // transition, and this has to be solid black underneath it.
            initial={false}
            role="dialog"
            aria-label="Intro"
          >
            {/* Its own layer, because the shake moves it every frame of the
                drop and a transform on a layer costs nothing, where a
                transform on a painted box repaints the moon. */}
            <div ref={worldRef} className="absolute inset-0 will-change-transform">
              {/* Stars behind the plate, so the push-in has something to
                  move against. */}
              <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                <span className="intro-star" style={{ boxShadow: stars }} />
              </div>

              {/* The moon. Pushes in slowly through the whole phrase, then
                  recedes at ignition. */}
              <div ref={moonRef} className="absolute inset-0 will-change-transform" style={{ transformOrigin: "50% 62%" }}>
                <Picture
                  sources={portrait ? MOON_PORTRAIT : MOON}
                  alt="Two figures sitting on the surface of the moon with their backs to us, looking up at Earth."
                  sizes="100vw"
                  loading="eager"
                  fetchPriority="high"
                  className={`absolute inset-0 w-full h-full object-cover ${portrait ? "object-[50%_62%]" : "object-[50%_55%]"}`}
                />
              </div>

              {/* Earth's glow, breathing with the music through --level. */}
              <div ref={earthRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="intro-earthglow" data-reactive="" />
                {/* Moon dust. */}
                {motes.map((m) => (
                  <span
                    key={m.id}
                    className="intro-mote"
                    style={{ left: m.left, top: m.top, "--s": m.s, "--d": m.d, "--delay": m.delay, "--dx": m.dx, "--o": m.o }}
                  />
                ))}
              </div>

              {/* A falling star. */}
              {flags.meteor >= 0 && (
                <span
                  key={`meteor-${run.id}-${flags.meteor}`}
                  className="intro-meteor"
                  style={{ "--mx": METEORS[flags.meteor].x, "--my": METEORS[flags.meteor].y, "--ma": METEORS[flags.meteor].angle }}
                  aria-hidden="true"
                />
              )}

              {/* Darkens the moon as the car's world takes over. */}
              <div ref={dimRef} className="absolute inset-0 bg-ink-deep opacity-0" aria-hidden="true" />

              {/* The road: a floor for the car, and a horizon. The line sits
                  a third of the way down because that is where the 3D
                  scene's own horizon falls; the two floors have to agree or
                  the car drives above the road as it recedes. */}
              <div ref={roadRef} className="absolute inset-0 opacity-0" aria-hidden="true">
                <div className="absolute inset-x-0 bottom-0 h-[66%] bg-ink-deep" />
                <div className="absolute inset-x-0 bottom-[66%] h-[10%] bg-gradient-to-t from-ink-deep to-transparent" />
                <div className="absolute inset-x-0 top-[34%] h-px bg-volt/30" />
                <div className="absolute inset-x-0 top-[34%] h-48 intro-road" />
              </div>

              {/* Headlights before the car: a bloom from the bottom right. */}
              <div
                ref={glowRef}
                className="absolute inset-0 opacity-0 pointer-events-none"
                aria-hidden="true"
                style={{
                  background:
                    "radial-gradient(60vw 34vh at 88% 74%, rgb(252 238 10 / 0.3), rgb(252 238 10 / 0.06) 45%, transparent 70%)",
                }}
              />

              <div className="absolute inset-0 crt-grid opacity-30" aria-hidden="true" />
              <div className="absolute inset-0 intro-scanlines" aria-hidden="true" />

              {/* ---- text ---------------------------------------------- */}

              {/* A soft dark behind the words, so they read over Earth. */}
              <motion.div
                className="intro-textscrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: textOn && !drifting ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                aria-hidden="true"
              />

              {/* Credit, top left. Only while the track is really playing. */}
              <motion.p
                className="absolute top-6 left-6 md:top-8 md:left-10 mono-micro cine-micro text-muted max-w-[50vw] md:max-w-[60vw]"
                style={{ textShadow: "0 1px 2px rgb(5 5 6 / 0.9), 0 0 12px rgb(5 5 6 / 0.9)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: flags.credit ? 1 : 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-volt">Now playing</span> · {TRACK.title} · {TRACK.artist}
              </motion.p>

              {/* The cards, then the name, in the same place: centre of the
                  frame, a little above the middle, where the sky is. One
                  grid cell holds both, so the name waiting invisibly under a
                  card never pushes the card up; they share a centre. */}
              <div className="absolute inset-x-0 top-[42%] -translate-y-1/2 px-6 text-center grid place-items-center">
                <div className="col-start-1 row-start-1 w-full">
                  <AnimatePresence>
                    {flags.card >= 0 && (
                      <TitleCard key={`${run.id}-card-${flags.card}`} text={lines[flags.card]} out={flags.cardOut} />
                    )}
                  </AnimatePresence>
                </div>
                {flags.card >= 0 && !flags.cardOut && (
                  <span key={`flare-${run.id}-${flags.card}`} className="intro-flare" aria-hidden="true" />
                )}
                <div className="col-start-1 row-start-1 w-full">
                  <NameDecode key={`name-${run.id}`} text={target} on={flags.name} burst={flags.kicked} />
                  <motion.span
                    className="mt-5 block h-px bg-volt mx-auto"
                    initial={{ width: 0 }}
                    animate={{ width: flags.name ? "min(24rem, 62vw)" : 0 }}
                    transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 0.9, 0.25, 1] }}
                  />
                </div>
              </div>

              {/* Waiting on the download, said plainly. */}
              <motion.p
                className="absolute bottom-16 md:bottom-8 inset-x-0 text-center mono-micro cine-micro cine-dim"
                initial={{ opacity: 0 }}
                animate={{ opacity: flags.tuning ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                aria-live="polite"
              >
                {flags.tuning ? "tuning in" : ""}
                {flags.tuning && <span className="inline-block w-[0.5em] h-[0.9em] translate-y-[0.15em] ml-1 bg-volt animate-caret" aria-hidden="true" />}
              </motion.p>

              {/* Hazard flash on the first kick, as the car's tail swings at
                  the lens. */}
              {flags.kicked && (
                <>
                  <motion.div
                    className="absolute inset-0 bg-volt pointer-events-none"
                    initial={{ opacity: 0.4 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    aria-hidden="true"
                  />
                  <motion.div
                    className="hazard absolute inset-x-0 top-1/2 -translate-y-1/2 h-16 pointer-events-none"
                    initial={{ scaleX: 0, opacity: 0.35 }}
                    animate={{ scaleX: 1, opacity: 0 }}
                    transition={{ duration: 0.55, ease: "linear" }}
                    style={{ transformOrigin: "right center" }}
                    aria-hidden="true"
                  />
                </>
              )}
            </div>

          </motion.div>

          {/* Skip. Always there, always the same place. In its own layer
              above the overlay, because the overlay is the element the wipe
              clips away, and a control that vanishes two seconds before the
              thing it controls has ended is not always there. */}
          <div className="fixed inset-0 z-[112] pointer-events-none" aria-hidden="false">
            <button
              type="button"
              onClick={finish}
              className="pointer-events-auto absolute bottom-5 right-5 md:bottom-8 md:right-10 mono-label cine-label text-muted hover:text-volt focus-visible:text-volt transition-colors py-2"
            >
              <span className="ink-underline">Skip intro</span>
              <span className="ml-3 cine-dim" aria-hidden="true">esc</span>
            </button>
          </div>

          {/* The 3D car, above the overlay and outside its clip, so it stays
              whole while the black tears away behind it. */}
          <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[111] w-full h-full pointer-events-none opacity-0"
            aria-hidden="true"
          />

          {/* The flat car, for when there is no WebGL. Same place in the
              stack; driven only if the scene above could not be built. */}
          <div className="fixed inset-0 z-[111] pointer-events-none overflow-hidden" aria-hidden="true">
            {puffs.map((p) => (
              <span
                key={p.id}
                className="intro-puff"
                style={{ left: p.x, top: p.y, width: p.size, height: p.size, "--puff-dx": `${p.dx}px` }}
              />
            ))}
            <div
              ref={carRef}
              className="absolute left-1/2 top-[54%] opacity-0 will-change-transform"
              style={{ width: 0 }}
            >
              <div ref={trailRef} className="absolute left-[92%] top-[34%] w-[70vw] origin-left" style={{ transform: "scaleX(0)" }}>
                <div className="intro-trail h-[3px]" />
                <div className="intro-trail h-[3px] mt-[5%]" style={{ opacity: 0.7 }} />
              </div>
              <div className="intro-beam left-[4%] top-[50%]" />
              <div className="intro-beam left-[36%] top-[52%]" />
              <div className="absolute left-0 top-[46%] w-full intro-reflection">
                <Picture sources={CAR} alt="" sizes="72vw" loading="eager" className="w-full h-auto" />
              </div>
              <Picture
                sources={CAR}
                alt="My grey Audi S4 mid-drift."
                sizes="72vw"
                loading="eager"
                className="relative w-full h-auto"
              />
            </div>
          </div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
