// src/components/BootSequence.jsx: first-visit power-on.
//
// This has been through three versions and the middle one is the reason the
// rules below are written down.
//
//   v1  a gate. A full-screen z-[100] overlay that held the page hostage for
//       1.6s behind fake terminal output:
//         > UPLINK........OK
//         > AUTH..........OK
//         > ENTRY_GRANTED
//       None of it described anything that was happening. It rendered over the
//       navbar, so the two collided on load, and it needed a 4s "force reveal"
//       timer in App.jsx because it could fail to dismiss itself.
//   v2  a wash. ~950ms, a line-scan and the name resolving, nothing invented.
//   v3  this. Same wash, given the structure a boot screen wants, without
//       reopening any of the three holes v1 fell into.
//
// The three rules, since a "cyberpunk boot sequence" is a standing invitation
// to break all of them:
//
//   1. NEVER A GATE. pointer-events: none, the page rendered and interactive
//      underneath from frame one, and any key, pointer or wheel event ends it
//      immediately. Nothing here can trap a reader.
//   2. NO INVENTED TELEMETRY. The readout prints measured values only: the
//      real viewport, and counts derived from the data modules at render time.
//      If a project ships, the boot screen says so, because it is counting.
//      There is no ENTRY_GRANTED and there will not be one.
//   3. IT ENDS ON ITS OWN. One timeout owns dismissal. No second timer exists
//      to rescue it, because there is nothing for one to rescue.
//
// Sound is on by default and can be switched off, which is a preference, not
// a permission. See src/lib/boot-audio.js: browsers suspend audio until a user
// gesture, so a first visit in a fresh browser is silent regardless, and there
// is no way around that from script. What happens instead is that a blocked
// cue arms a silent unlock, so the reader's next click makes later boots
// audible. The toggle in Chrome.jsx replays the sequence when switched on, so
// the gesture that enables sound is also the one that demonstrates it.
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion, useDecode } from "../hooks";
import { profile } from "../data/profile";
import { featuredProjects } from "../data/projects";
import { experiences } from "../data/experience";
import { workSlugs } from "../data/work";
import { BOOT_REPLAY, armAudioUnlock, playBootSound, soundEnabled } from "../lib/boot-audio";

const SEEN_KEY = "aly.boot.v5";

// One timeline, in ms, so the sound in boot-audio.js can be written against
// the same numbers rather than guessed at.
const T = {
  aperture: 260,   // the CRT opening out of a hairline
  readout: 340,    // first readout line
  line: 110,       // gap between readout lines
  name: 600,       // the name starts resolving
  greet: 1180,     // the line of voice under it
  burst: 1500,     // chromatic split as it lands
  glitch: 900,     // scanline tears start
  total: 2200,     // everything is gone by here
};

// Voice, not data. These are the only invented words in the sequence and they
// are deliberately shaped so nobody could mistake them for a readout: centred,
// in the prose voice, under the name. The measured lines stay in the corner in
// mono where they have always been. Flavour is fine; flavour dressed up as
// instrumentation is what rule 2 forbids.
//
// One is picked per run, which also means a replay is not identical to the
// boot that preceded it.
const GREETINGS = [
  "wake up, choom.",
  "eyes up, choom.",
  "deck's warm, choom.",
  "preem. you're in.",
];

// Constants of the build rather than of the render, so they are counted once.
const LIVE_COUNT = featuredProjects.filter((p) => p.status === "live").length;
const ROLE_COUNT = experiences.filter((e) => e.type === "work").length;

export default function BootSequence() {
  const reduced = usePrefersReducedMotion();

  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SEEN_KEY) !== "1";
  });
  // Bumped on replay. Used as a key so the subtree remounts, which is what
  // resets useDecode: it settles once by design and will not re-scramble on
  // its own.
  const [runId, setRunId] = useState(0);
  const [burst, setBurst] = useState(false);
  const [tear, setTear] = useState(false);
  const doneRef = useRef(false);

  // Measured, not invented. Rule 2. Read on every render rather than memoised,
  // so a replay after a window resize reports the window you actually have.
  const readout = [
    ["display", `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}x`],
    ["work", `${featuredProjects.length} projects, ${LIVE_COUNT} live`],
    ["record", `${ROLE_COUNT} roles, ${experiences.length - ROLE_COUNT} degree`],
    ["pages", `${workSlugs.length} routes`],
  ];

  // The sound toggle asks for a rerun.
  useEffect(() => {
    const onReplay = () => {
      doneRef.current = false;
      setBurst(false);
      setTear(false);
      setRunId((n) => n + 1);
      setShow(true);
    };
    window.addEventListener(BOOT_REPLAY, onReplay);
    return () => window.removeEventListener(BOOT_REPLAY, onReplay);
  }, []);

  // Re-picked whenever runId changes, so a replay says something different.
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

  const target = profile.name.toUpperCase();
  const text = useDecode(target, { active: show, duration: T.total - T.name - 200 });

  useEffect(() => {
    if (!show) return;
    if (reduced) {
      finish();
      return;
    }

    // playBootSound() reports false when autoplay policy has the context
    // suspended, which is the normal case on a first load. Rather than lose
    // the preference to it, arm a silent unlock so the reader's next click
    // makes every later boot in this session audible.
    let disarm;
    if (soundEnabled() && !playBootSound()) disarm = armAudioUnlock();

    const burstTimer = setTimeout(() => setBurst(true), T.burst);
    const tearTimer = setTimeout(() => setTear(true), T.glitch);
    const endTimer = setTimeout(finish, T.total);
    const skip = () => finish();

    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    window.addEventListener("wheel", skip, { passive: true });

    return () => {
      disarm?.();
      clearTimeout(burstTimer);
      clearTimeout(tearTimer);
      clearTimeout(endTimer);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("wheel", skip);
    };

    function finish() {
      if (doneRef.current) return;
      doneRef.current = true;
      sessionStorage.setItem(SEEN_KEY, "1");
      setShow(false);
    }
  }, [show, runId, reduced]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={runId}
          // pointer-events-none is the whole difference between a wash and a
          // gate: the page beneath is live from the first frame. Rule 1.
          className="fixed inset-0 z-[100] pointer-events-none bg-ink-deep overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 0.9, 0.25, 1] }}
          aria-hidden="true"
        >
          {/* The aperture. Everything scales out of a 4px-tall hairline, which
              is how a CRT actually wakes up: the raster opens vertically from
              the centre rather than fading in. */}
          <motion.div
            className="absolute inset-0 origin-center"
            initial={{ scaleY: 0.005 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: T.aperture / 1000, delay: 0.04, ease: [0.16, 0.9, 0.25, 1] }}
          >
            <div className="absolute inset-0 crt-grid opacity-70" />

            {/* The name, centred, resolving out of character noise. */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gutter">
              <motion.span
                className={`font-display font-bold uppercase text-primary text-center leading-none ${
                  burst ? "chromatic-aberration" : ""
                }`}
                style={{
                  fontSize: "clamp(1.75rem, 6vw, 4.5rem)",
                  letterSpacing: "0.02em",
                  "--burst": burst ? 1 : 0,
                }}
                initial={{ opacity: 0, scaleX: 1.06 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.35, delay: T.name / 1000, ease: [0.16, 0.9, 0.25, 1] }}
              >
                {text}
              </motion.span>

              {/* A rule that draws out from the centre under the name. */}
              <motion.span
                className="mt-5 block h-px bg-volt"
                initial={{ width: 0 }}
                animate={{ width: "min(22rem, 60vw)" }}
                transition={{ duration: 0.5, delay: (T.name + 120) / 1000, ease: [0.16, 0.9, 0.25, 1] }}
              />

              {/* The one line of voice. See GREETINGS. */}
              <motion.span
                className="mt-5 mono-ui text-volt"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: T.greet / 1000 }}
              >
                {greeting}
              </motion.span>
            </div>

            {/* Measured readout, bottom left. Four lines, none of them made up. */}
            <div className="absolute bottom-0 left-0 gutter pb-8 flex flex-col gap-1.5">
              {readout.map(([label, value], i) => (
                <motion.span
                  key={label}
                  className="mono-micro text-dim flex gap-3"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: (T.readout + i * T.line) / 1000 }}
                >
                  <span className="text-volt w-14 shrink-0">{label}</span>
                  {value}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Signal tears. Three bands that displace horizontally for a few
              frames each, the way a bad feed drops sync. They are the flash in
              the sequence, and they are cheap: three divs, transform only, all
              of them gone before the exit fade starts. */}
          {tear && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              {[
                { top: "22%", h: 14, dur: 0.24, dx: 26, delay: 0 },
                { top: "54%", h: 8, dur: 0.18, dx: -34, delay: 0.12 },
                { top: "71%", h: 20, dur: 0.3, dx: 18, delay: 0.26 },
              ].map((band, i) => (
                <motion.div
                  key={i}
                  className="absolute left-0 right-0 bg-volt/12 backdrop-brightness-150"
                  style={{ top: band.top, height: band.h }}
                  initial={{ x: 0, opacity: 0 }}
                  animate={{ x: [0, band.dx, -band.dx / 2, 0], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: band.dur, delay: band.delay, times: [0, 0.3, 0.7, 1] }}
                />
              ))}
            </div>
          )}

          {/* The scan line, travelling the full height. One of exactly two
              places on the site where anything glows; the other is the focus
              ring. A glow needs an implied light source, and a beam is one. */}
          <motion.div
            className="absolute left-0 right-0 h-px bg-volt"
            initial={{ top: "0%", opacity: 0 }}
            animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: (T.total - 200) / 1000, delay: 0.1, ease: "linear" }}
            style={{ boxShadow: "0 0 24px 2px rgb(252 238 10 / 0.5)" }}
          />

          {/* Hazard tape sweeps across as it closes. The third and last place
              this pattern appears on the site, after the Work divider and the
              footer, which is the whole budget for it. */}
          <motion.div
            className="hazard absolute inset-x-0 top-1/2 -translate-y-1/2 h-16 opacity-0"
            aria-hidden="true"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1], opacity: [0, 0.22, 0] }}
            transition={{ duration: 0.6, delay: (T.total - 700) / 1000, times: [0, 0.45, 1] }}
            style={{ transformOrigin: "left center" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
