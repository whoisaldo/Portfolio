// src/components/IntroCinematic.jsx: the intro, choreographed to the track.
//
// This replaced BootSequence.jsx, which was a seven-second wash: a CRT
// aperture, a breach-protocol matrix, the name resolving out of noise and
// three typed lines of voice, all on a stopwatch. The better parts of it are
// still here (the matrix, the readout, the voice), but the stopwatch is gone.
// Every visual beat is now a position in the song, read off the audio clock
// each frame, so the car launches on the frame the drums come in whether the
// download took two seconds or ten. See src/lib/cues.js for the numbers and
// how they were measured.
//
// The shape, in song seconds:
//
//    8.9  the moon. Two silhouettes on the rim of a crescent moon, looking
//         down at the city, and the arpeggio. The readout slides in, the
//         matrix builds, three lines of voice type on the vocal entries.
//   26.1  ignition. A synth swell; headlights bloom from the bottom edge, an
//         engine turns over, the moon recedes and a road fades in under it.
//   30.1  the drop. The drums enter and a car slides in from the right,
//         sideways, tyres lit, dragging the black away behind it: the page
//         is revealed in the car's wake, right to left.
//   33.6  the car is gone, the overlay with it, and the music ducks to a bed.
//
// Rules kept from the boot it replaced, since a cinematic is a standing
// invitation to break all of them:
//
//   1. IT CAN ALWAYS BE LEFT. A Skip button, Escape, Enter and Space all end
//      it immediately, and the page underneath was rendered from the first
//      frame. Under prefers-reduced-motion it never starts at all.
//   2. NO INVENTED TELEMETRY. The readout in the corner prints measured
//      values only. The hex matrix and the car are unambiguously fiction and
//      are staged as such: nothing here dresses ornament up as a readout.
//   3. IT ENDS ON ITS OWN. The song clock ends it; if there is no song, a
//      plain timer runs the identical timeline. No rescue timer exists
//      because there is nothing for one to rescue.
//
// The reader's second visit in the same tab gets the short version: one bar
// of the quiet before the drums, then the drift. The full one is a click away
// in the footer, and ?intro=full forces it.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDecode, useKonami, useTypewriter } from "../hooks";
import { profile } from "../data/profile";
import { featuredProjects } from "../data/projects";
import { experiences } from "../data/experience";
import { workSlugs } from "../data/work";
import { img } from "../data/images";
import Picture from "./Picture";
import { INTRO_START, markIntroSeen, replayIntro, setIntroDone } from "../lib/intro";
import { audioContext } from "../lib/audio";
import { AMBIENT_EVENT, getLevels, isPlaying, isTrackPlaying, setDuck, songTime } from "../lib/ambient";
import { cancelIntroSfx, scheduleIntroSfx } from "../lib/intro-sfx";
import * as C from "../lib/cues";

const MOON = img("Intro/Moon");
const CAR = img("Intro/Car");

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

// Breach protocol. The hex pairs are the ones Cyberpunk 2077's hacking
// minigame uses. Pure ornament, labelled as such: a picture of a code matrix,
// not a readout claiming to be one.
const HEX = ["1C", "55", "E9", "BD", "7A", "FF"];
const GRID = 5;

// Voice, not data. Centred, in the prose register, and shaped so nobody could
// mistake it for a readout. The opener and the middle rotate; the closer is
// fixed because it is the line the reader is meant to leave on.
const OPENERS = ["wake up, choom.", "eyes up, choom.", "deck's warm, choom.", "rise and shine, choom."];
const MIDDLES = ["signal's clean.", "ice is down.", "no daemons on the line.", "flatlined the handshake."];
const CLOSER = "preem. you're in.";

// Constants of the build rather than of the render, so they are counted once.
const LIVE_COUNT = featuredProjects.filter((p) => p.status === "live").length;
const ROLE_COUNT = experiences.filter((e) => e.type === "work").length;

const clamp = (p) => Math.min(1, Math.max(0, p));
const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 3);
const easeIn = (p) => Math.pow(clamp(p), 3);

/** The car's rendered width, in CSS px, for the viewport we actually have. */
function carWidthPx() {
  const w = window.innerWidth;
  return w < 640 ? w * 0.96 : Math.min(980, Math.max(300, w * 0.72));
}

/**
 * Where the car is at song time `s`.
 *
 * x and y are offsets of the car's centre from the screen centre, in vw and
 * vh; rot in degrees; speed is 0..1 and drives the light trails and the
 * smoke. Three legs: a fast slide in that bleeds off speed as the rear steps
 * out, a beat of counter-steer at the apex, and the launch out of frame.
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
  // A gentler curve than the entry's so the launch is visible from its
  // first frames rather than sitting still and then vanishing.
  const p = Math.pow(clamp((d - holdEnd) / (outEnd - holdEnd)), 2.5);
  return { x: -17 - p * 190, y: -2 + p * 9, rot: -13 + p * 10, scale: 0.98 + p * 0.4, speed: 0.3 + p * 0.7 };
}

/** 0 before ignition, 1 at the drop: how far the moon has receded. */
const recede = (s) => easeIn(clamp((s - C.IGNITION) / (C.DROP - C.IGNITION)));

/** One typed line of the boot's voice. */
function VoiceLine({ text, on, caret }) {
  const [typed, done] = useTypewriter(text, { active: on, duration: 640 });
  return (
    <motion.span
      className="mono-ui text-volt block"
      initial={{ opacity: 0 }}
      animate={{ opacity: on ? 1 : 0 }}
      transition={{ duration: 0.18 }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{typed}</span>
      {caret && (
        <span
          aria-hidden="true"
          className={`inline-block w-[0.55em] h-[1em] translate-y-[0.15em] ml-1 bg-volt ${done ? "animate-caret" : ""}`}
        />
      )}
    </motion.span>
  );
}

/** The name, resolving out of character noise once `on` flips. */
function NameDecode({ text, on, burst }) {
  const shown = useDecode(text, { active: on, duration: 900 });
  return (
    <motion.span
      className={`font-display font-bold uppercase text-primary block leading-none ${burst ? "chromatic-aberration" : ""}`}
      style={{ fontSize: "clamp(2.2rem, 7vw, 5.5rem)", letterSpacing: "0.01em", "--burst": burst ? 1 : 0 }}
      initial={{ opacity: 0, scaleX: 1.06 }}
      animate={{ opacity: on ? 1 : 0, scaleX: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 0.9, 0.25, 1] }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </motion.span>
  );
}

/** A starfield in one box-shadow. Deterministic per run so it does not
 *  re-roll on rerender. */
function starfield(seed, count) {
  let x = seed;
  const rnd = () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
  const dots = [];
  for (let i = 0; i < count; i++) {
    const px = (rnd() * 100).toFixed(2);
    const py = (rnd() * 100).toFixed(2);
    const a = (0.25 + rnd() * 0.7).toFixed(2);
    dots.push(`${px}vw ${py}vh 0 0 rgb(236 234 228 / ${a})`);
  }
  return dots.join(", ");
}

const FLAGS = {
  credit: false, readout: false, matrix: false, name: false, kicked: false,
  voice: [false, false, false], tuning: false,
};

export default function IntroCinematic() {
  const [run, setRun] = useState(null);
  const [phase, setPhase] = useState("moon");
  const [flags, setFlags] = useState(FLAGS);
  const [puffs, setPuffs] = useState([]);

  const overlayRef = useRef(null);
  const worldRef = useRef(null);
  const moonRef = useRef(null);
  const dimRef = useRef(null);
  const roadRef = useRef(null);
  const glowRef = useRef(null);
  const carRef = useRef(null);
  const trailRef = useRef(null);
  const clockRef = useRef(null);
  const doneRef = useRef(true);
  const lastPuffRef = useRef(0);
  const puffIdRef = useRef(0);
  const flagsRef = useRef(FLAGS);

  // Up up down down left right left right B A, anywhere on the page.
  useKonami(() => replayIntro({ greeting: "breach protocol accepted, choom." }));

  // The gate, the footer and the Konami code all start it the same way.
  useEffect(() => {
    const onStart = (e) => {
      const d = e.detail || {};
      doneRef.current = false;
      clockRef.current = null;
      flagsRef.current = FLAGS;
      lastPuffRef.current = 0;
      setFlags(FLAGS);
      setPuffs([]);
      setPhase("moon");
      setRun({
        id: Date.now(),
        mode: d.mode === "short" ? "short" : "full",
        withSound: Boolean(d.withSound),
        greeting: d.greeting ?? null,
      });
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

  const matrix = useMemo(
    () =>
      Array.from({ length: GRID }, () =>
        Array.from({ length: GRID }, () => ({
          hex: HEX[Math.floor(Math.random() * HEX.length)],
          hot: Math.random() < 0.18,
        })),
      ),
    // run is the signal that a fresh matrix is wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run],
  );

  const stars = useMemo(() => (run ? starfield(run.id, 140) : ""), [run]);

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
    setIntroDone(true);
    if (window.scrollY) window.scrollTo({ top: 0, behavior: "instant" });
    setRun(null);
  }, []);

  // Escape, Enter or Space leaves. The wheel is swallowed so the page under
  // the overlay stays at the top for the reveal.
  useEffect(() => {
    if (!run) return;
    const onKey = (e) => {
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
        const a = cur[k];
        const b = patch[k];
        const same = Array.isArray(a) ? a.every((v, i) => v === b[i]) : a === b;
        if (!same) {
          next[k] = b;
          changed = true;
        }
      }
      if (changed) {
        flagsRef.current = next;
        setFlags(next);
      }
    };

    // Song seconds right now, or null while still waiting for the track.
    const now = () => {
      const c = clockRef.current;
      if (!c) return null;
      if (c.kind === "song") {
        const s = songTime();
        if (s !== null) return s;
      }
      return c.base + (performance.now() - c.origin) / 1000;
    };

    const arm = () => {
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
        clockRef.current = { kind: "timer", origin: performance.now(), base };
      } else {
        return false;
      }
      if (run.withSound && ac && ac.state === "running") {
        const s0 = now();
        const t0 = ac.currentTime;
        scheduleIntroSfx((cue) => t0 + (cue - s0));
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

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!arm()) {
        setFlag({ tuning: run.withSound && performance.now() - armedAt > 900 });
        return;
      }
      const s = now();
      if (s === null) return;

      if (s >= C.REVEAL) {
        finish();
        return;
      }
      if (s >= C.HERO_IN) setIntroDone(true);

      // ---- flags that gate React content ------------------------------
      const withTrack = run.withSound && isTrackPlaying();
      setFlag({
        tuning: false,
        credit: withTrack && s >= base + 0.8,
        readout: s >= C.READOUT_AT,
        matrix: s >= C.READOUT_AT + 1.2,
        name: s >= C.IGNITION,
        kicked: s >= C.KICK,
        voice: lines.map((_, i) =>
          run.mode === "short" ? s >= base + 0.1 : s >= C.VOICE_AT[i],
        ),
      });
      const nextPhase = s >= C.DROP ? "drift" : s >= C.IGNITION ? "ignition" : "moon";
      setPhase((p) => (p === nextPhase ? p : nextPhase));

      // ---- the world: moon, dim, road, glow, shake ---------------------
      const r = recede(s);
      const push = clamp((s - C.SONG_START) / (C.IGNITION - C.SONG_START));
      if (moonRef.current) {
        moonRef.current.style.transform = `translate3d(0, ${(-7 * r).toFixed(2)}vh, 0) scale(${(1 + 0.05 * push + 0.14 * r).toFixed(4)})`;
      }
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
      if (worldRef.current) {
        worldRef.current.style.transform = amp
          ? `translate(${((Math.random() - 0.5) * amp).toFixed(1)}px, ${((Math.random() - 0.5) * amp).toFixed(1)}px)`
          : "";
      }

      // ---- the car, and the wipe it drags behind it -------------------
      if (s >= C.DROP && s < C.CAR_GONE) {
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
        // The reveal edge trails the car's rear by a couple of vw, with the
        // top of the cut leading the bottom so the tear runs with the drift.
        const edge = Math.max(-25, 50 + pose.x + 0.42 * Wvw * pose.scale + 2);
        if (overlayRef.current) {
          overlayRef.current.style.clipPath = `polygon(0 0, ${(edge + 10).toFixed(2)}vw 0, ${edge.toFixed(2)}vw 100%, 0 100%)`;
        }
        if (pose.speed > 0.2) spawnPuffs(s, pose, W);
      } else if (carRef.current) {
        carRef.current.style.opacity = "0";
      }
    };

    // Dev only: a scrub for tuning the cues without sitting through the
    // song. `window.__intro.seek(30.0)` jumps the timeline to any second of
    // the track. It replaces the clock with a timer, so it is for silent
    // runs; with the track playing the song's own clock wins next frame.
    if (import.meta.env.DEV) {
      window.__intro = {
        seek: (s) => {
          clockRef.current = { kind: "timer", origin: performance.now(), base: s };
        },
        levels: getLevels,
        now,
      };
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (import.meta.env.DEV) delete window.__intro;
    };
  }, [run, lines, finish]);

  const readout = [
    ["display", `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}x`],
    ["work", `${featuredProjects.length} projects, ${LIVE_COUNT} live`],
    ["record", `${ROLE_COUNT} roles, ${experiences.length - ROLE_COUNT} degree`],
    ["pages", `${workSlugs.length} routes`],
  ];

  const target = profile.name.toUpperCase();
  const drifting = phase === "drift";

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
            <div ref={worldRef} className="absolute inset-0">
              {/* Stars behind the plate, so the parallax has something to
                  move against. */}
              <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                <span className="intro-star" style={{ boxShadow: stars }} />
              </div>

              {/* The moon. Pushes in slowly through the whole phrase, then
                  recedes and pans toward the city at ignition. */}
              <div ref={moonRef} className="absolute inset-0 will-change-transform" style={{ transformOrigin: "50% 60%" }}>
                <Picture
                  sources={MOON}
                  alt="Two figures sitting on the rim of a crescent moon, looking down at a neon city on Earth."
                  sizes="100vw"
                  loading="eager"
                  fetchPriority="high"
                  className="absolute inset-0 w-full h-full object-cover object-[30%_50%] md:object-[50%_50%]"
                />
              </div>

              {/* Darkens the moon as the car's world takes over. */}
              <div ref={dimRef} className="absolute inset-0 bg-ink-deep opacity-0" aria-hidden="true" />

              {/* The road: a floor for the car, and a horizon. */}
              <div ref={roadRef} className="absolute inset-0 opacity-0" aria-hidden="true">
                <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-ink-deep via-ink-deep/90 to-transparent" />
                <div className="absolute inset-x-0 top-[62%] h-px bg-volt/30" />
                <div className="absolute inset-x-0 top-[62%] h-40 intro-road" />
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

              <div className="absolute inset-0 crt-grid opacity-40" aria-hidden="true" />
              <div className="absolute inset-0 intro-scanlines" aria-hidden="true" />

              {/* ---- text ---------------------------------------------- */}

              {/* Credit, top left. Only while the track is really playing. */}
              <motion.p
                className="absolute top-6 left-6 md:top-8 md:left-10 mono-micro text-dim max-w-[50vw] md:max-w-[60vw]"
                initial={{ opacity: 0 }}
                animate={{ opacity: flags.credit ? 1 : 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-volt">Now playing</span> · {TRACK.title} · {TRACK.artist}
              </motion.p>

              {/* Breach protocol, top right. Ornament, labelled as such. */}
              <motion.div
                className="absolute top-6 right-6 md:top-8 md:right-10 flex flex-col items-end gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: flags.matrix && !drifting ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                aria-hidden="true"
              >
                <p className="mono-micro text-dim">Breach protocol</p>
                <div className="grid gap-x-3 gap-y-1.5" style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}>
                  {matrix.flatMap((row, y) =>
                    row.map((cell, x) => (
                      <motion.span
                        key={`${y}-${x}`}
                        className={`mono-micro tabular-nums text-center ${cell.hot ? "text-volt" : "text-dim"}`}
                        initial={{ opacity: 0, y: -3 }}
                        animate={{ opacity: flags.matrix ? (cell.hot ? 1 : 0.5) : 0, y: 0 }}
                        transition={{ duration: 0.16, delay: flags.matrix ? (y * GRID + x) * 0.028 : 0 }}
                      >
                        {cell.hex}
                      </motion.span>
                    )),
                  )}
                </div>
              </motion.div>

              {/* The voice and the name. Right column on wide screens, low on
                  a phone where the figures sit in the middle of the frame. */}
              <div className="absolute inset-x-0 bottom-[24%] px-6 text-center md:text-left md:px-0 md:left-[50%] md:right-[8%] md:bottom-auto md:top-1/2 md:-translate-y-1/2">
                <div className="flex flex-col items-center md:items-start gap-2">
                  {lines.map((line, i) => (
                    <VoiceLine key={`${run.id}-${i}`} text={line} on={flags.voice[i]} caret={i === lines.length - 1} />
                  ))}
                </div>
                <div className="mt-6 md:mt-8">
                  <NameDecode key={`name-${run.id}`} text={target} on={flags.name} burst={flags.kicked} />
                  <motion.span
                    className="mt-4 block h-px bg-volt mx-auto md:mx-0"
                    initial={{ width: 0 }}
                    animate={{ width: flags.name ? "min(22rem, 60vw)" : 0 }}
                    transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 0.9, 0.25, 1] }}
                  />
                </div>
              </div>

              {/* Measured readout, bottom left. Four lines, none made up. */}
              <div className="absolute bottom-16 left-6 md:bottom-8 md:left-10 flex flex-col gap-1.5">
                {readout.map(([label, value], i) => (
                  <motion.span
                    key={label}
                    className="mono-micro text-dim flex gap-3"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: flags.readout ? 1 : 0, x: flags.readout ? 0 : -6 }}
                    transition={{ duration: 0.18, delay: flags.readout ? i * 0.1 : 0 }}
                  >
                    <span className="text-volt w-14 shrink-0">{label}</span>
                    {value}
                  </motion.span>
                ))}
              </div>

              {/* Waiting on the download, said plainly. */}
              <motion.p
                className="absolute bottom-16 md:bottom-8 inset-x-0 text-center mono-micro text-dim"
                initial={{ opacity: 0 }}
                animate={{ opacity: flags.tuning ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                aria-live="polite"
              >
                {flags.tuning ? "tuning in" : ""}
                {flags.tuning && <span className="inline-block w-[0.5em] h-[0.9em] translate-y-[0.15em] ml-1 bg-volt animate-caret" aria-hidden="true" />}
              </motion.p>

              {/* Hazard flash on the first kick. */}
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

            {/* Skip. Always there, always the same place. */}
            <button
              type="button"
              onClick={finish}
              className="absolute bottom-5 right-5 md:bottom-8 md:right-10 mono-label text-dim hover:text-volt focus-visible:text-volt transition-colors py-2"
            >
              <span className="ink-underline">Skip intro</span>
              <span className="ml-3 text-faint" aria-hidden="true">esc</span>
            </button>
          </motion.div>

          {/* The car, above the overlay and outside its clip, so it stays
              whole while the black tears away behind it. */}
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
              {/* Light trails off the tail lights: anchored at the rear and
                  growing away from it, to the right, which is where the car
                  has just been. They sit inside the car's box so they rotate
                  with the body. */}
              <div ref={trailRef} className="absolute left-[92%] top-[34%] w-[70vw] origin-left" style={{ transform: "scaleX(0)" }}>
                <div className="intro-trail h-[3px]" />
                <div className="intro-trail h-[3px] mt-[5%]" style={{ opacity: 0.7 }} />
              </div>
              {/* Headlight cones. */}
              <div className="intro-beam left-[4%] top-[50%]" />
              <div className="intro-beam left-[36%] top-[52%]" />
              {/* The reflection, flipped under the wheel line and blurred. */}
              <div className="absolute left-0 top-[46%] w-full intro-reflection">
                <Picture sources={CAR} alt="" sizes="72vw" loading="eager" className="w-full h-auto" />
              </div>
              <Picture
                sources={CAR}
                alt="A yellow sports car mid-drift, headlights on."
                sizes="72vw"
                loading="eager"
                fetchPriority="high"
                className="relative w-full h-auto"
              />
            </div>
          </div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
