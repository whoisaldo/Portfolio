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
//   under the real button. Escape does the same thing, and so does clicking
//   the backdrop.
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
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Volume2, VolumeX } from "lucide-react";
import { useFocusTrap, useMediaQuery } from "../hooks";
import { profile } from "../data/profile";
import { img } from "../data/images";
import {
  hasBeenAsked,
  markAsked,
  shouldGate,
  setSoundEnabled,
  unlockAudio,
} from "../lib/audio";
import { prefetchTrack, startAmbient } from "../lib/ambient";
import { loadDrift } from "../lib/drift";
import { introModeForThisLoad, setIntroDone, startIntro } from "../lib/intro";
import { CRUISE_GAIN, DROP, INTRO_GAIN, SHORT_START, SONG_START } from "../lib/cues";
import Panel from "./ui/Panel";
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
      <Picture sources={img("Intro/Car")} sizes="72vw" loading="eager" fetchPriority="low" />
    </div>
  );
}

export default function EntryGate({ onEnter }) {
  const [open, setOpen] = useState(shouldGate);
  // Someone who has been here before does not need the explanation again, just
  // the click. Read once on mount, because markAsked() runs before the exit
  // animation finishes and would otherwise reword the panel mid-fade.
  const [returning] = useState(hasBeenAsked);
  const [mode] = useState(introModeForThisLoad);
  const panelRef = useRef(null);

  // Start the downloads the moment the door is on screen: the track, and
  // the 3D chunk the drift needs. Neither is awaited anywhere; the intro
  // simply finds them ready.
  useEffect(() => {
    if (!open) return;
    prefetchTrack();
    if (mode !== "off") loadDrift().catch(() => {});
  }, [open, mode]);

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
    startIntro({ mode, withSound });
  };

  // Escape leaves silent. useFocusTrap owns the scroll lock and focus
  // restoration; see the note in src/hooks about not adding a second lock.
  useFocusTrap(panelRef, open, () => enter(false));

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
          onClick={(e) => { if (e.target === e.currentTarget) enter(false); }}
        >
          <div className="absolute inset-0 crt-grid opacity-70 pointer-events-none" aria-hidden="true" />
          <div className="hazard absolute inset-x-0 top-0 h-1.5 opacity-30" aria-hidden="true" />
          <div className="hazard absolute inset-x-0 bottom-0 h-1.5 opacity-30" aria-hidden="true" />
          {mode !== "off" && <Preload />}

          <motion.div
            ref={panelRef}
            className="tick-frame relative w-full max-w-[34rem]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 0.9, 0.25, 1] }}
          >
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

              <p className="mt-6 mono-label text-dim leading-relaxed">
                {returning
                  ? "Browsers need a click on every page load before they will play audio. Entering silent stops this appearing again."
                  : "Your browser needs a click before it will play audio. Volume lives bottom left, and either choice is changeable there."}
                {intro && <span className="block mt-2">{intro}</span>}
              </p>

              {/* The way out, for the reader with the least time. A plain
                  page: no intro, no sound, no effects, the same content. */}
              <Link
                to="/recruiters"
                className="group mt-6 flex items-center justify-between gap-4 border-t border-ink-line pt-5 transition-colors"
              >
                <span className="min-w-0">
                  <span className="mono-ui font-bold text-volt block">Recruiters press this</span>
                  <span className="mono-label text-dim block mt-1.5">
                    The plain version. Experience, projects, skills and the résumé, with none of the above.
                  </span>
                </span>
                <ArrowUpRight className="w-4 h-4 shrink-0 text-volt transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </Panel>

            {/* Outside the Panel on purpose. `clip-path` removes anything the
                element paints past the cut, so ticks placed inside a chamfered
                box are clipped away at exactly the corners they mark. */}
            <span className="tick tl" aria-hidden="true" />
            <span className="tick tr" aria-hidden="true" />
            <span className="tick bl" aria-hidden="true" />
            <span className="tick br" aria-hidden="true" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
