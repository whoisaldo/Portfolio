// src/components/EntryGate.jsx: the door.
//
// This site spent three versions removing a gate and now has one again, so the
// distinction is worth writing down rather than discovering later.
//
// The gate that was removed held the page for 1.6s behind fake terminal
// output, asked for nothing, gave nothing, rendered over the navbar, and
// needed a rescue timer because it could fail to dismiss itself. It was a
// loading screen that was not loading anything.
//
// This one asks a question that genuinely has to be asked. An AudioContext
// stays suspended until the page sees a real gesture, so there is no
// arrangement of code that makes a first visit audible without a click. The
// choice was between harvesting an unrelated click later or asking for one up
// front. Asking is the honest version, and once you are asking, the door is
// the right place to do it.
//
// What keeps it from being the old mistake:
//
//   It loads something real, and says so. On a first open the screen is a
//   loading screen (Preloader): the city's downloads and its build, the car
//   on the door, the garage, the music, a bar by the bytes, a few seconds on
//   a good connection. Every line is a real download or a real step, done
//   when it is done; nothing is scripted. It holds nobody past thirty
//   seconds, and the way out is on it from the first frame.
//   Then it resolves on input, not on a timer. It waits, and the moment the
//   reader answers it carries them in: the car on it turns to the lens and
//   takes the camera down its beams into the intro (src/three/door-car.js),
//   about a second and a half, on the song, which starts with it.
//   Both answers are equal. "Enter silent" is the same size as "Enter with
//   sound", a menu item like it, not a grey link under it. Only activating
//   one enters the site; background clicks and Escape leave the choice
//   unanswered.
//   It cannot fail to dismiss. Dismissal is a state change from a click; the
//   way in opens the door when it ends, or on a timer if the car is lost
//   under it. No audio call is awaited before it opens, so a browser refusing
//   to start audio still gets you inside.
//   It appears on every page load, because that is how often a browser needs
//   the gesture, and because it is the loading screen. A reader who chose
//   silence once answers it again rather than watching the city build in
//   front of them; skipping it for them is how a phone that had muted once
//   came to land on a page whose assets had not loaded.
//   The page underneath is fully rendered the whole time, so a crawler that
//   ignores overlays reads a complete document.
//   It offers the way out. "For recruiters" goes to /recruiters, a plain
//   version of the site with none of this on it, because the reader with the
//   least time is the one this door most needs to not detain. It is the
//   menu's third item, the size of the two answers, and it is on the loading
//   screen too.
//
// The loading screen is also what keeps the door smooth: the city's build,
// the garage's, the car's are long frames, and they all land behind it,
// where nothing moves but a bar drawn by a transform. A reader who clicks
// before the city is in anyway (the screen gave up after thirty seconds, or
// the door was put back up from the footer) is held after the click, with
// what is still on its way in one line and on the ring under the car; the
// intro decides as it starts whether the city is ready, and one that is not
// costs the whole run its voxel moon and its live street. The city arriving
// is what lets them through; thirty seconds is only the most it holds them,
// after which the intro runs on its still pictures as it always did. The
// intro's own pieces come down while the door is up as well (prefetchTrack(),
// loadDrift() and <Preload /> below), so the click starts the song in a few
// hundred milliseconds.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Briefcase, ScanEye, Volume2, VolumeX } from "lucide-react";
import { useFocusTrap, useMediaQuery, usePrefersReducedMotion } from "../hooks";
import { glitchTick } from "../lib/ui-sfx";
import { profile } from "../data/profile";
import { img } from "../data/images";
import { s4Poster } from "../data/s4";
import {
  hasBeenAsked,
  markAsked,
  shouldGate,
  setSoundEnabled,
  unlockAudio,
} from "../lib/audio";
import { prefetchTrack, startAmbient, stopAmbient } from "../lib/ambient";
import { loadDrift } from "../lib/drift";
import { garageExpected, garageWarm } from "../lib/garage3d";
import { prefetchWorld } from "../world/load";
import { coverWorld, stage, subscribeStage, useStage } from "../world/stage";
import { LOAD_STEPS, markBytes, useBytes, useLoaded } from "../world/progress";
import { pickTier } from "../world/quality";
import { DOOR_OPEN, introModeForThisLoad, setIntroDone, startIntro } from "../lib/intro";
import { CRUISE_GAIN, DROP, INTRO_GAIN, LEAVE_SECONDS, SHORT_START, SONG_START } from "../lib/cues";
import { GpuNoticeShort } from "./GpuNotice";
import { hasGpuAcceleration } from "../lib/gpu";
import Picture from "./Picture";
import { track } from "../lib/beacon";

/**
 * The intro's two plates, rendered invisibly with the exact markup and
 * `sizes` the cinematic uses, so the browser picks and caches the same
 * candidate. A <link rel=preload> cannot express a <picture>'s format
 * negotiation; this can.
 */
function Preload() {
  const portrait = useMediaQuery("(orientation: portrait)");
  return (
    <div aria-hidden="true" className="fixed w-px h-px overflow-hidden opacity-0 pointer-events-none -z-10">
      <Picture sources={img(portrait ? "Intro/MoonPortrait" : "Intro/Moon")} sizes="100vw" loading="eager" fetchPriority="low" />
      <Picture sources={s4Poster} sizes="72vw" loading="eager" fetchPriority="low" />
    </div>
  );
}

// How often the name takes a hit, and by how much that is allowed to wander.
// Exactly three seconds would read as a metronome; a glitch that arrives on
// the beat is a progress bar.
const GLITCH_EVERY_MS = 3000;
const GLITCH_JITTER_MS = 900;
const GLITCH_LENGTH_MS = 300; // must match `gate-hit` in index.css

// The longest a reader who clicked is held for the city. Past it the intro
// runs on its still pictures, as it does for a city that never loads.
const WAIT_FOR_CITY_MS = 30000;

// The way in: how long the car takes to carry the reader through the door
// (src/three/door-car.js). The song starts this much earlier in the track,
// so it reaches the point the intro is choreographed to as the door opens.
const LAUNCH_MS = 1300;
// Headlamps: at rest, on full beam (the sound answer under the pointer or
// the focus), down to running lights (the silent one).
const LIGHTS = { rest: 0.6, sound: 1, silent: 0.12 };

// The door's words.
const COPY = {
  status: "Awaiting input",
  loading: "Loading the city",
  line: (returning) => (returning ? "Welcome back, choom." : "Best with sound on, choom."),
  sound: "Enter with sound",
  silent: "Enter silent",
  note: (returning) =>
    returning
      ? "Browsers ask for a click on every visit before they play audio. The city loads while you choose."
      : "Your browser needs one click before it can play audio. Volume and mute live bottom left.",
  intro: "The intro runs about 25 seconds. Esc skips it.",
  braindanceItem: "Braindance",
  braindanceNew: "New",
  braindanceLine: "The city on its own. One recorded night with my work hidden in it, about four minutes, desktop only.",
  recruitersItem: "For recruiters",
  recruitersLine: "The plain version: experience, projects, skills and the résumé.",
  loadNote: "The intro starts the moment the city is in. Past thirty seconds, it starts on still pictures.",
  preloading: "Loading assets",
  preloaded: "Ready",
};

// The loading screen's lines, one per thing it waits on, in its order.
const ASSETS = {
  code: "City code",
  city: "Streets and towers",
  car: "The city's S4",
  voxel: "The voxel moon",
  holo: "The hologram",
  ads: "Ads",
  koi: "Koi",
  moon: "Garage monitor",
  build: "Building the city",
  doorCar: "The S4 on the door",
  garage: "The garage",
  music: "The music",
};
// What each weighs on the bar, in kB: the files' sizes (a download's own
// total takes over once it reports one), and for the two builds about the
// download they take as long as.
const ASSET_KB = { code: 440, city: 3400, car: 2040, voxel: 80, holo: 150, ads: 230, koi: 80, moon: 70, build: 1200, doorCar: 835, garage: 3500, music: 3900 };

// What the door waits on, as a sentence names it (src/world/progress.js says
// what each key is).
const NOUNS = {
  code: "the city's code",
  city: "streets and towers",
  car: "the S4",
  voxel: "the voxel moon",
  holo: "the hologram",
  ads: "the ads",
  koi: "the koi",
  moon: "the garage monitor",
};

/** Whether entering now would start the intro before the city is ready. */
function cityLoading() {
  return document.documentElement.dataset.world === "on" && stage.status === "loading";
}

/** The city's downloads still out, and how many of the steps are done
 *  (each download, then the city built: the stage turning "ready"). */
function useCityProgress() {
  const loaded = useLoaded();
  const { status } = useStage();
  const left = LOAD_STEPS.filter((key) => !loaded.includes(key));
  const done = LOAD_STEPS.length - left.length + (status === "ready" ? 1 : 0);
  return { left, done, total: LOAD_STEPS.length + 1 };
}

/** "Waiting on streets and towers and the S4", or the last step. */
function waitingOn(left) {
  if (!left.length) return "Building the city";
  const names = left.map((key) => NOUNS[key]);
  const shown = names.slice(0, 2).join(left.length > 2 ? ", " : " and ");
  return `Waiting on ${shown}${left.length > 2 ? ` and ${left.length - 2} more` : ""}`;
}

/**
 * Where the choice was, while the door holds a reader for the city: what it
 * is waiting on, in one line, how far along, and how long since the click.
 * The ring under the car draws how far along too.
 */
function LoadingLine({ className = "" }) {
  const { left, done, total } = useCityProgress();
  const [seconds, setSeconds] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    // The button that was clicked is gone; keep focus inside the door.
    ref.current?.focus();
    const t0 = performance.now();
    const id = window.setInterval(() => setSeconds(Math.floor((performance.now() - t0) / 1000)), 250);
    return () => window.clearInterval(id);
  }, []);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div ref={ref} tabIndex={-1} className={`focus-visible:shadow-none ${className}`}>
      <p className="font-display text-display-3 text-primary" role="status">
        {waitingOn(left)}
      </p>
      <p className="mt-2 mono-label text-dim tabular-nums">
        {done} of {total} · {clock}
      </p>
      <p className="mt-5 max-w-[30rem] font-sans text-[1.0625rem] leading-[1.55] text-muted">{COPY.loadNote}</p>
    </div>
  );
}

/** The hazard tape along the top edge. */
function Tape() {
  return <div className="hazard absolute inset-x-0 top-0 h-1.5 opacity-30" aria-hidden="true" />;
}

/**
 * The loading screen: the first thing a reader sees while the site's assets
 * arrive and the city builds, a few seconds on a good connection. Every line
 * is a real download or a real step, done when it is done; the bar moves by
 * a transform, so it keeps moving smoothly while the city's build holds the
 * main thread. The way out to /recruiters is on it too.
 */
function Preloader({ steps, leaving }) {
  const done = steps.filter((s) => s.done).length;
  const total = steps.length || 1;
  const weight = steps.reduce((a, s) => a + s.weight, 0) || 1;
  const share = steps.reduce((a, s) => a + s.weight * s.fraction, 0) / weight;
  const pct = Math.floor(100 * share);
  const next = steps.find((s) => !s.done);
  return (
    <div
      className={`absolute inset-0 flex flex-col justify-between py-10 md:py-14 transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}
    >
      <span />
      <div className="mx-auto w-full max-w-[40rem]">
        <p className="mono-label text-volt flex items-center gap-2.5">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="animate-signal-ping absolute inline-flex h-full w-full rounded-full bg-volt" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt" />
          </span>
          {done >= total ? COPY.preloaded : COPY.preloading}
        </p>
        <div className="mt-6 flex items-end justify-between gap-6">
          <p className="font-display text-[clamp(3rem,8vw,5.5rem)] font-bold leading-none text-primary tabular-nums" role="status" aria-live="polite">
            {pct}%
          </p>
          <p className="mono-label text-dim tabular-nums pb-2">
            {done} of {total}
          </p>
        </div>
        <div className="chamfer-sm mt-5 p-px bg-volt/50">
          <div className="chamfer-sm relative h-4 overflow-hidden bg-ink">
            <div
              className="absolute inset-0 origin-left bg-volt transition-transform duration-500 ease-out"
              style={{ transform: `scaleX(${share})` }}
            />
            <div className="hazard absolute inset-0 opacity-25 mix-blend-multiply" aria-hidden="true" />
          </div>
        </div>
        <p className="mt-4 font-sans text-[1.0625rem] text-muted">{next ? ASSETS[next.key] : COPY.preloaded}</p>
      </div>
      <RecruitersItem className="-ml-1 opacity-80" />
    </div>
  );
}

function Status({ waiting }) {
  return (
    <p className="mono-label text-volt flex items-center gap-2.5">
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        <span className="animate-signal-ping absolute inline-flex h-full w-full rounded-full bg-volt" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt" />
      </span>
      {waiting ? COPY.loading : COPY.status}
    </p>
  );
}

/** The name, carrying the door's glitch (see .gate-glitch in index.css). */
function Name({ hit, className = "" }) {
  return (
    <div className={`gate-glitch relative ${hit ? "is-hit" : ""}`}>
      <h1 className={`font-display uppercase text-primary leading-[0.9] ${className}`}>{profile.name}</h1>
      <span className="gate-tear" aria-hidden="true" />
    </div>
  );
}

/** Why the door asks, in a sentence or two of prose; and the GPU warning. */
function Note({ returning, mode, className = "" }) {
  return (
    <div className={className}>
      <p className="font-sans text-[1rem] leading-[1.55] text-muted">
        {COPY.note(returning)}
        {mode === "full" && <span className="block mt-1 text-dim">{COPY.intro}</span>}
      </p>
      {/* A browser drawing on the CPU is told so here, before it chooses
          the twenty-five seconds. The long form is the toast in
          GpuNotice.jsx. See src/lib/gpu.js. */}
      {!hasGpuAcceleration() && (
        <div className="mt-4">
          <GpuNoticeShort />
        </div>
      )}
    </div>
  );
}

/** The S4 on the door (src/three/door-car.js): a canvas over the whole
 *  door, behind its words, with the car drawn over the layout's slot for it
 *  (`anchor`) so the way in can take it to the middle of the screen. Started
 *  once the door is up and faded in on its first frame; never on a browser
 *  drawing without a GPU. `api` gets its controls (setLights, setProgress,
 *  launch). */
function DoorCar({ anchor, api, progress, busy, hidden, onReady }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const live = useRef({ progress, busy });
  live.current = { progress, busy };
  useEffect(() => {
    api.current?.setProgress(progress);
  }, [api, progress]);
  useEffect(() => {
    api.current?.setBusy(busy);
  }, [api, busy]);
  const shown = ready && !hidden;
  useEffect(() => {
    if (!hasGpuAcceleration()) return undefined;
    let alive = true;
    let car = null;
    import("../three/door-car.js")
      .then(({ mountDoorCar }) => {
        if (!alive || !ref.current) return;
        car = mountDoorCar(ref.current, {
          anchor,
          reduced,
          onReady: () => {
            if (!alive) return;
            setReady(true);
            readyRef.current?.();
          },
        });
        car.setProgress(live.current.progress);
        car.setBusy(live.current.busy);
        api.current = car;
        if (import.meta.env.DEV) window.__doorCar = car;
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (car && api.current === car) api.current = null;
      car?.stop();
    };
  }, [anchor, api, reduced]);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 h-full w-full transition-opacity duration-1000 ${shown ? "opacity-100" : "opacity-0"}`}
    />
  );
}

const MENU_ITEM =
  "group flex items-center gap-4 py-2 font-display uppercase font-semibold text-[clamp(1.625rem,3.2vw,2.5rem)] leading-none text-muted transition-colors hover:text-volt focus-visible:text-volt focus-visible:shadow-none";
const MENU_MARK = "w-4 text-volt opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100";

/** The two answers as a game's menu: the same size, the one under the
 *  pointer or the focus marked. */
function Menu({ enter, lights, className = "" }) {
  const over = (level) => ({
    onPointerEnter: () => lights?.(level),
    onPointerLeave: () => lights?.(LIGHTS.rest),
    onFocus: () => lights?.(level),
    onBlur: () => lights?.(LIGHTS.rest),
  });
  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <button type="button" autoFocus data-autofocus="" onClick={() => enter(true)} className={MENU_ITEM} {...over(LIGHTS.sound)}>
        <span className={MENU_MARK} aria-hidden="true">▸</span>
        <Volume2 className="w-6 h-6 shrink-0" aria-hidden="true" />
        {COPY.sound}
      </button>
      <button type="button" onClick={() => enter(false)} className={MENU_ITEM} {...over(LIGHTS.silent)}>
        <span className={MENU_MARK} aria-hidden="true">▸</span>
        <VolumeX className="w-6 h-6 shrink-0" aria-hidden="true" />
        {COPY.silent}
      </button>
    </div>
  );
}

/** The third way in, the braindance (src/braindance): the city with no page
 *  in front of it. A menu item like the others, offered only where it can
 *  run (a mouse and a wide screen; it says so itself anywhere else). Its
 *  click is the gesture the braindance's sound needs. */
function BraindanceItem({ className = "" }) {
  const fits = useMediaQuery("(pointer: fine) and (min-width: 900px)");
  if (!fits || !hasGpuAcceleration()) return null;
  return (
    <div className={className}>
      <Link to="/braindance" state={{ jack: true }} onClick={() => unlockAudio()} className={MENU_ITEM}>
        <span className={MENU_MARK} aria-hidden="true">▸</span>
        <ScanEye className="w-6 h-6 shrink-0" aria-hidden="true" />
        {COPY.braindanceItem}
        <span className="mono-label bg-volt px-1.5 py-1 text-ink">{COPY.braindanceNew}</span>
      </Link>
      <p className="pl-[4.5rem] max-w-[34rem] font-sans text-[0.9375rem] leading-[1.5] text-dim">{COPY.braindanceLine}</p>
    </div>
  );
}

/** The way out as the menu's third item, the same size as the two answers,
 *  and a line under it saying where it goes. Still there while the door
 *  holds for the city. */
function RecruitersItem({ className = "" }) {
  return (
    <div className={className}>
      <Link to="/recruiters" className={MENU_ITEM}>
        <span className={MENU_MARK} aria-hidden="true">▸</span>
        <Briefcase className="w-6 h-6 shrink-0" aria-hidden="true" />
        {COPY.recruitersItem}
        <ArrowUpRight className="-ml-2 w-5 h-5 shrink-0" aria-hidden="true" />
      </Link>
      <p className="pl-[4.5rem] font-sans text-[0.9375rem] leading-[1.5] text-dim">{COPY.recruitersLine}</p>
    </div>
  );
}

export default function EntryGate({ onEnter }) {
  // /recruiters links back here with this. The plain version's way across is
  // to the entrance, not to the page behind it, so the door goes up whatever
  // the sound preference says and the intro behind it is the whole one.
  const asked = useLocation().state?.door === true;
  const [open, setOpen] = useState(() => asked || shouldGate());
  // Someone who has been here before does not need the explanation again, just
  // the click. Read on mount and then only when the door is deliberately
  // reopened, because markAsked() runs before the exit animation finishes and
  // would otherwise reword the panel mid-fade.
  const [returning, setReturning] = useState(hasBeenAsked);
  const [mode, setMode] = useState(() => (asked ? "full" : introModeForThisLoad()));
  const [hit, setHit] = useState(false);
  const panelRef = useRef(null);

  // The way back, from the footer. Reopening the door means the whole choice
  // again, not just the film: sound, silence, or the plain version. The music
  // stops because the door is the one part of this site that is always quiet,
  // and the intro is the full one, because a reader who asks for the entrance
  // by name is not asking for the short version.
  useEffect(() => {
    const onDoor = () => {
      stopAmbient({ fade: LEAVE_SECONDS });
      setMode("full");
      setReturning(hasBeenAsked());
      setOpen(true);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener(DOOR_OPEN, onDoor);
    return () => window.removeEventListener(DOOR_OPEN, onDoor);
  }, []);

  // Start the downloads the moment the door is on screen: the track, and
  // the 3D chunk the drift needs. Neither is awaited anywhere; the intro
  // simply finds them ready.
  useEffect(() => {
    if (!open) return;
    prefetchTrack((got, total) => markBytes("music", got, total));
    if (mode !== "off") loadDrift().catch(() => {});
    // The city behind the page, too: its chunk and its model, so a reader
    // who clicks through lands in it rather than on its poster.
    prefetchWorld();
  }, [open, mode]);

  // Nothing behind a closed door needs drawing.
  useEffect(() => {
    coverWorld("door", open);
    return () => coverWorld("door", false);
  }, [open]);

  // Get audio running as early as the browser will allow, so the glitch has
  // its tick. Two attempts, because there are two kinds of visit:
  //
  //   On mount, for the reader whose context is already running (the door
  //   reopened from the footer) and for the browser that has decided this
  //   origin may play without asking. unlockAudio() is a no-op when it cannot
  //   work; it does not throw and it does not block the door.
  //
  //   Then on the first gesture of any kind. Not the buttons: a pointerdown
  //   on the heading, a Tab, a touch on a phone. Those are what the spec
  //   counts as user activation, and the first one that arrives is the
  //   earliest moment a tick can be audible. Before it there is nothing any
  //   code can do, which is the sentence this panel is on screen to say.
  //   These listeners only unlock the glitch sound. Entering the site and
  //   starting the track stay on the buttons below.
  useEffect(() => {
    if (!open) return undefined;
    let done = false;
    unlockAudio().then((ok) => { done = ok; });

    const wake = () => {
      if (done) return;
      done = true;
      unlockAudio();
    };
    const opts = { passive: true, capture: true };
    document.addEventListener("pointerdown", wake, opts);
    document.addEventListener("keydown", wake, opts);
    document.addEventListener("touchstart", wake, opts);
    return () => {
      document.removeEventListener("pointerdown", wake, opts);
      document.removeEventListener("keydown", wake, opts);
      document.removeEventListener("touchstart", wake, opts);
    };
  }, [open]);

  // The hit. A self-rescheduling timeout rather than setInterval, because the
  // gap is different every time and an interval cannot vary. The class comes
  // off after the animation's own length so the next hit can put it back on:
  // re-adding a class that is already there restarts nothing.
  //
  // Not requestAnimationFrame: this tab can be in the background while the
  // door waits, rAF is throttled to a crawl there, and a glitch that stalls
  // and then fires six times when you switch back is worse than no glitch.
  useEffect(() => {
    if (!open) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let next = 0;
    let clear = 0;
    const fire = () => {
      setHit(true);
      // Sound and picture on the same tick. Silent until audio is permitted,
      // which on a first load is exactly what the panel is explaining.
      glitchTick();
      clear = window.setTimeout(() => setHit(false), GLITCH_LENGTH_MS);
      next = window.setTimeout(fire, GLITCH_EVERY_MS + Math.random() * GLITCH_JITTER_MS);
    };
    next = window.setTimeout(fire, 1200);
    return () => {
      window.clearTimeout(next);
      window.clearTimeout(clear);
      setHit(false);
    };
  }, [open]);


  // Set while the door holds a reader for the city: the way through, called
  // once, by whichever comes first of the city and the thirty seconds.
  const goRef = useRef(null);
  const [waiting, setWaiting] = useState(false);
  // The car: its slot in the layout, its controls, and whether it is
  // carrying the reader through ("words": the words are going; "car": the
  // way in is running).
  const carSlot = useRef(null);
  const carApi = useRef(null);
  const [launching, setLaunching] = useState(null);
  const leaving = useRef(false);
  const setCarLights = useCallback((level) => carApi.current?.setLights(level), []);
  const { status: cityStatus } = useStage();
  const city = useCityProgress();
  const cityProgress = cityStatus === "ready" ? 1 : cityStatus === "loading" ? city.done / city.total : null;
  // Everything downloaded and the city still not in: its build, the long
  // frames, is under way.
  const cityBuilding = cityStatus === "loading" && city.left.length === 0;

  // The loading screen: on the door's first opening, while the city, the
  // door's car, the garage and the music arrive. "on", then "leaving" (it
  // fades as the door's words come up), then "off". A door put back up later
  // has its city cached and goes without it.
  const [preload, setPreload] = useState(() => (open ? "on" : "off"));
  const [doorCarReady, setDoorCarReady] = useState(false);
  const [musicReady, setMusicReady] = useState(false);
  const [garageReady, setGarageReady] = useState(false);
  const [garageWanted, setGarageWanted] = useState(false);
  useEffect(() => {
    garageWarm.then(() => setGarageReady(true));
    // After every effect of the first commit: the garage says it is coming
    // as it mounts. And a city that is off leaves nothing to wait for.
    const id = window.setTimeout(() => {
      setGarageWanted(garageExpected());
      if (document.documentElement.dataset.world !== "on") setPreload("off");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (open) prefetchTrack().then(() => setMusicReady(true));
  }, [open]);
  const bytes = useBytes();
  const [tier] = useState(pickTier);
  const assets = [
    ...LOAD_STEPS.map((key) => ({ key, done: !city.left.includes(key) })),
    { key: "build", done: cityStatus === "ready" },
    ...(hasGpuAcceleration() ? [{ key: "doorCar", done: doorCarReady }] : []),
    ...(garageWanted ? [{ key: "garage", done: garageReady }] : []),
    { key: "music", done: musicReady },
  ].map((a) => {
    const b = bytes[a.key];
    // A download in flight counts its bytes up to nine tenths; the last
    // tenth is it actually being ready (parsed, built, compiled).
    const fraction = a.done ? 1 : b ? 0.9 * Math.min(1, b[0] / b[1]) : 0;
    const weight = a.key === "city" && tier === "phone" ? 1500 : ASSET_KB[a.key];
    return { ...a, fraction, weight };
  });
  const allLoaded = assets.every((a) => a.done);
  useEffect(() => {
    if (preload !== "on") return undefined;
    // All in: a beat at 100%, then the door. Or the most it holds anyone.
    const id = window.setTimeout(() => setPreload("leaving"), allLoaded ? 350 : WAIT_FOR_CITY_MS);
    return () => window.clearTimeout(id);
  }, [preload, allLoaded]);
  useEffect(() => {
    if (preload !== "leaving") return undefined;
    panelRef.current?.querySelector("[data-autofocus]")?.focus();
    const id = window.setTimeout(() => setPreload("off"), 500);
    return () => window.clearTimeout(id);
  }, [preload]);
  useEffect(() => {
    if (open) leaving.current = false;
  }, [open]);

  const enter = (withSound) => {
    if (goRef.current || leaving.current) return;
    leaving.current = true;
    markAsked();
    track("door", withSound ? "sound" : "silent");
    setSoundEnabled(withSound);
    // This click is the gesture the whole screen exists to collect, so the
    // audio is woken here even when the song waits for the city below.
    const audio = withSound ? unlockAudio() : null;

    let gone = false;
    let through = false;
    const open_ = () => {
      if (through) return;
      through = true;
      // Close, unconditionally. Whatever audio does next, the reader is
      // already through the door.
      setLaunching(null);
      setOpen(false);
      onEnter?.(withSound);
      if (mode === "off") {
        setIntroDone(true);
        return;
      }
      // Put the site back in its pre-intro state. Already true on a first
      // load; it matters when the door has been reopened over a page that is
      // live, so the navbar arrives after the reveal the way it does on
      // arrival.
      setIntroDone(false);
      startIntro({ mode, withSound });
    };
    const go = () => {
      if (gone) return;
      gone = true;
      goRef.current = null;
      setWaiting(false);
      const car = carApi.current;
      const lead = car?.canLaunch() ? LAUNCH_MS : 0;

      let started = Promise.resolve();
      if (audio) {
        // The song starts from the point the intro is choreographed to, less
        // the way in, and the cinematic reads its clock from it: the door
        // opens as the track reaches that point.
        const offset = (mode === "short" ? SHORT_START : mode === "off" ? DROP : SONG_START) - lead / 1000;
        const gain = mode === "off" ? CRUISE_GAIN : INTRO_GAIN;
        started = audio.then(() => startAmbient({ offset, gain, fade: 0.25 }));
      }
      if (!lead) {
        open_();
        return;
      }
      // The words go at once; the car goes with the first of the song (or
      // 0.6 s on, whichever is sooner). And the door opens however the way
      // in ends, even if the car is lost under it.
      setLaunching("words");
      const wait = (ms) => new Promise((r) => window.setTimeout(r, ms));
      Promise.race([started, wait(600)])
        .then(() => {
          setLaunching("car");
          return Promise.race([car.launch(LAUNCH_MS), wait(LAUNCH_MS + 900)]);
        })
        .then(open_);
    };

    // The intro opens on the city's voxel moon, and cuts to the live street,
    // only if the city is ready when it starts. A reader who clicks before
    // that waits here for it, at most WAIT_FOR_CITY_MS.
    if (mode !== "off" && cityLoading()) {
      goRef.current = go;
      setWaiting(true);
      return;
    }
    go();
  };

  // The hold: through the door when the city stops loading (ready, or
  // failed, or switched off) or when the time runs out.
  useEffect(() => {
    if (!waiting) return undefined;
    const check = () => {
      if (!cityLoading()) goRef.current?.();
    };
    const unsubscribe = subscribeStage(check);
    const cap = window.setTimeout(() => goRef.current?.(), WAIT_FOR_CITY_MS);
    check();
    return () => {
      unsubscribe();
      window.clearTimeout(cap);
    };
  }, [waiting]);

  // Keep focus and the scroll lock inside the door until a button is chosen.
  // Escape and backdrop clicks used to call enter(false), which started the
  // silent intro and saved a sound preference without a button being used.
  // The trap's optional Escape callback stays unset so it makes no choice.
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    document.documentElement.setAttribute("data-gated", "true");
    return () => document.documentElement.removeAttribute("data-gated");
  }, [open]);

  const line = COPY.line(returning);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-[120] bg-ink-deep overflow-y-auto gutter ${launching === "car" ? "is-launching" : ""}`}
          style={{ "--door-launch": `${LAUNCH_MS}ms` }}
          data-intro-layer=""
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.42, ease: [0.16, 0.9, 0.25, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Enter the site"
        >
          <div className="fixed inset-0 crt-grid opacity-70 pointer-events-none" aria-hidden="true" />
          <DoorCar
            anchor={carSlot}
            api={carApi}
            progress={waiting ? cityProgress : null}
            busy={cityBuilding}
            hidden={preload === "on"}
            onReady={() => setDoorCarReady(true)}
          />
          <Tape />
          <div className="hazard fixed inset-x-0 bottom-0 h-1.5 opacity-30" aria-hidden="true" />
          {mode !== "off" && <Preload />}

          <motion.div
            ref={panelRef}
            className="relative mx-auto min-h-full w-full max-w-[84rem]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 0.9, 0.25, 1] }}
          >
            {preload !== "off" && <Preloader steps={assets} leaving={preload === "leaving"} />}
            {/* A game's start screen: who, the question and the two answers,
                and the way out as a third, read top to bottom on the left; the
                car on the right; the small print along the foot. */}
            <div
              className={`door-words flex min-h-[100svh] flex-col justify-between gap-12 py-10 md:py-14 ${launching ? "is-out" : ""} ${preload === "on" ? "is-hidden" : ""}`}
              inert={preload === "on" || undefined}
            >
              <Status waiting={waiting} />
              <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div>
                  <Name hit={hit} className="text-display-1" />
                  <p className="mt-5 font-sans text-[clamp(1.25rem,1.8vw,1.5rem)] leading-snug text-muted">{line}</p>
                  {waiting ? (
                    <>
                      <LoadingLine className="mt-10" />
                      <RecruitersItem className="mt-8 -ml-1" />
                    </>
                  ) : (
                    <div className="mt-10 -ml-1">
                      <Menu enter={enter} lights={setCarLights} />
                      <BraindanceItem className="mt-2" />
                      <RecruitersItem className="mt-2" />
                    </div>
                  )}
                </div>
                <div ref={carSlot} className="h-44 w-full md:h-auto md:aspect-[4/3]" aria-hidden="true" />
              </div>
              {waiting ? <span /> : <Note returning={returning} mode={mode} className="max-w-[30rem]" />}
            </div>
          </motion.div>
          {/* The way in's light and its last frame: the lamps' glare, then
              black, which is where the intro begins. See index.css. */}
          <div className="door-flare" aria-hidden="true" />
          <div className="door-black" aria-hidden="true" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
