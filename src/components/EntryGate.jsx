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
//   It resolves on input, not on a timer. Nothing here counts down. It waits,
//   and the moment the reader answers it leaves.
//   Both answers are equal. "Enter silent" is a real button, not a grey link
//   under the real button. Only activating a button enters the site;
//   background clicks and Escape leave the choice unanswered.
//   It cannot fail to dismiss. Dismissal is a state change from a click. No
//   audio call is awaited before it closes, so a browser refusing to start
//   audio still gets you inside.
//   It appears on every page load for anyone who wants sound, because that is
//   how often a browser needs the gesture. Anyone who explicitly chose
//   silence never sees it at all.
//   The page underneath is fully rendered the whole time, so a crawler that
//   ignores overlays reads a complete document.
//   It offers the way out. "Recruiters press this" goes to /recruiters, a
//   plain version of the site with none of this on it, because the reader
//   with the least time is the one this door most needs to not detain.
//
// It is also, quietly, the loading screen the intro needs: the seconds a
// reader spends on this panel are the seconds the track's 3.8 MB, the two
// intro plates and the 3D car's chunk take to arrive, so the click that
// follows starts the song in a few hundred milliseconds. See prefetchTrack(),
// loadDrift() and <Preload /> below.
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Volume2, VolumeX } from "lucide-react";
import { useFocusTrap, useMediaQuery } from "../hooks";
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
import { DOOR_OPEN, introModeForThisLoad, setIntroDone, startIntro } from "../lib/intro";
import { CRUISE_GAIN, DROP, INTRO_GAIN, LEAVE_SECONDS, SHORT_START, SONG_START } from "../lib/cues";
import Panel from "./ui/Panel";
import { GpuNoticeShort } from "./GpuNotice";
import { hasGpuAcceleration } from "../lib/gpu";
import Picture from "./Picture";

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

// How often the panel takes a hit, and by how much that is allowed to wander.
// Exactly three seconds would read as a metronome; a glitch that arrives on
// the beat is a progress bar.
const GLITCH_EVERY_MS = 3000;
const GLITCH_JITTER_MS = 900;
const GLITCH_LENGTH_MS = 300; // must match `gate-hit` in index.css

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
    prefetchTrack();
    if (mode !== "off") loadDrift().catch(() => {});
  }, [open, mode]);

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


  const enter = (withSound) => {
    // Close first, unconditionally. Whatever audio does next, the reader is
    // already through the door.
    markAsked();
    setSoundEnabled(withSound);
    setOpen(false);
    onEnter?.(withSound);

    if (withSound) {
      // This click is the gesture the whole screen exists to collect. The
      // song starts here, from the point the intro is choreographed to, and
      // the cinematic reads its clock from there on.
      const offset = mode === "short" ? SHORT_START : mode === "off" ? DROP : SONG_START;
      const gain = mode === "off" ? CRUISE_GAIN : INTRO_GAIN;
      unlockAudio().then(() => startAmbient({ offset, gain, fade: 0.25 }));
    }

    if (mode === "off") {
      setIntroDone(true);
      return;
    }
    // Put the site back in its pre-intro state. Already true on a first load;
    // it matters when the door has been reopened over a page that is live, so
    // the navbar arrives after the reveal the way it does on arrival.
    setIntroDone(false);
    startIntro({ mode, withSound });
  };

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

  const intro =
    mode === "off"
      ? null
      : mode === "short"
        ? "Short intro this time: one bar, then the drift. The full one is in the footer."
        : "The intro runs about twenty-five seconds and is skippable at any point.";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] bg-ink-deep flex items-center justify-center gutter"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.42, ease: [0.16, 0.9, 0.25, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Enter the site"
        >
          <div className="absolute inset-0 crt-grid opacity-70 pointer-events-none" aria-hidden="true" />
          <div className="hazard absolute inset-x-0 top-0 h-1.5 opacity-30" aria-hidden="true" />
          <div className="hazard absolute inset-x-0 bottom-0 h-1.5 opacity-30" aria-hidden="true" />
          {mode !== "off" && <Preload />}

          <motion.div
            ref={panelRef}
            className="relative w-full max-w-[34rem]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 0.9, 0.25, 1] }}
          >
          {/* The glitch owns its own element. It has to: Framer animates
              `transform` on this panel's entrance, and a CSS animation on the
              same element fights it for the same property, which is how the
              first version of the hit came out as a 2px nudge with none of the
              chroma on it. Nothing else ever animates this wrapper. */}
          <div className={`tick-frame gate-glitch relative ${hit ? "is-hit" : ""}`}>
            <Panel edge="bg-volt" fill="bg-ink" innerClassName="p-7 md:p-9">
              <p className="mono-label text-volt flex items-center gap-2.5">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="animate-signal-ping absolute inline-flex h-full w-full rounded-full bg-volt" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt" />
                </span>
                Awaiting input
              </p>

              <h1 className="mt-6 font-display uppercase text-display-2 text-primary leading-none">
                {profile.name}
              </h1>

              <p className="mt-5 prose-dark">
                {returning
                  ? "Welcome back, choom. One click and the sound is on :)"
                  : "Turn your sound on for the best experience, choom :)"}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Panel
                  as="button"
                  type="button"
                  size="sm"
                  autoFocus
                  onClick={() => enter(true)}
                  edge="bg-volt hover:bg-volt-deep transition-colors duration-200"
                  fill="bg-volt"
                  className="scan-beam-host group"
                  innerClassName="inline-flex items-center gap-2.5 px-5 py-3.5 mono-ui font-bold text-ink"
                >
                  <Volume2 className="w-4 h-4" />
                  {returning ? "Enter" : "Enter with sound"}
                </Panel>

                <Panel
                  as="button"
                  type="button"
                  size="sm"
                  onClick={() => enter(false)}
                  edge="bg-ink-line hover:bg-volt transition-colors duration-200"
                  fill="bg-ink"
                  className="group"
                  innerClassName="inline-flex items-center gap-2.5 px-5 py-3.5 mono-ui text-muted transition-colors group-hover:text-primary"
                >
                  <VolumeX className="w-4 h-4" />
                  Enter silent
                </Panel>
              </div>

              {/* This was 11px uppercase mono at 0.18em tracking and 46%
                  opacity: two paragraphs of explanation set in the face this
                  design reserves for one-word labels, on the first screen
                  anybody sees. It is prose, so it is prose. */}
              <p className="mt-6 text-[0.9375rem] leading-[1.6] text-muted">
                {returning
                  ? "Browsers need a click on every page load before they will play audio. Entering silent stops this appearing again."
                  : "Your browser needs a click before it will play audio. Volume lives bottom left, and either choice is changeable there."}
                {intro && <span className="block mt-2 text-dim">{intro}</span>}
              </p>

              {/* A browser drawing on the CPU is told so here, before it
                  chooses the twenty-five seconds. The long form, with where
                  the switch is, is the toast in GpuNotice.jsx, which waits
                  until the door is down. See src/lib/gpu.js. */}
              {!hasGpuAcceleration() && (
                <div className="mt-6">
                  <GpuNoticeShort />
                </div>
              )}

              {/* The way out, for the reader with the least time. A plain
                  page: no intro, no sound, no effects, the same content. */}
              <Link
                to="/recruiters"
                // `items-start`, not `items-center`: on a phone the sentence
                // wraps to four lines and a vertically centred arrow lands in
                // the middle of them, reading as a glyph inside the text.
                className="group mt-6 flex items-start justify-between gap-4 border-t border-ink-line pt-5 transition-colors"
              >
                <span className="min-w-0">
                  <span className="mono-ui font-bold text-volt block">Recruiters press this</span>
                  <span className="block mt-1.5 text-[0.9375rem] leading-[1.6] text-muted">
                    The plain version. Experience, projects, skills and the résumé, with none of the above.
                  </span>
                </span>
                <ArrowUpRight className="w-4 h-4 mt-0.5 shrink-0 text-volt transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </Panel>

            {/* The tear, over the panel and under the corner marks. */}
            <span className="gate-tear chamfer" aria-hidden="true" />

            {/* Outside the Panel on purpose. `clip-path` removes anything the
                element paints past the cut, so ticks placed inside a chamfered
                box are clipped away at exactly the corners they mark. */}
            <span className="tick tl" aria-hidden="true" />

            <span className="tick tr" aria-hidden="true" />
            <span className="tick bl" aria-hidden="true" />
            <span className="tick br" aria-hidden="true" />
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
