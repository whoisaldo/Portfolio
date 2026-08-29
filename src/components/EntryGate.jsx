// src/components/EntryGate.jsx: the door.
//
// This site spent three versions removing a gate and now has one again, so the
// distinction is worth writing down rather than discovering later.
//
// The gate that was removed (see BootSequence.jsx) held the page for 1.6s
// behind fake terminal output, asked for nothing, gave nothing, rendered over
// the navbar, and needed a rescue timer because it could fail to dismiss
// itself. It was a loading screen that was not loading anything.
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
//   It is shown once, ever, and never again.
//   The page underneath is fully rendered the whole time, so a crawler that
//   ignores overlays reads a complete document.
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useFocusTrap } from "../hooks";
import { profile } from "../data/profile";
import {
  hasBeenAsked,
  markAsked,
  replayBoot,
  setSoundEnabled,
  unlockAudio,
} from "../lib/boot-audio";
import { startAmbient } from "../lib/ambient";
import Panel from "./ui/Panel";

export default function EntryGate({ onEnter }) {
  const [open, setOpen] = useState(() => !hasBeenAsked());
  const panelRef = useRef(null);

  const enter = (withSound) => {
    // Close first, unconditionally. Whatever audio does next, the reader is
    // already through the door.
    markAsked();
    setSoundEnabled(withSound);
    setOpen(false);
    onEnter?.(withSound);

    if (withSound) {
      // This click is the gesture the whole screen exists to collect.
      unlockAudio().then(() => startAmbient());
    }
    replayBoot();
  };

  // Escape leaves silent. useFocusTrap owns the scroll lock and focus
  // restoration; see the note in src/hooks about not adding a second lock.
  useFocusTrap(panelRef, open, () => enter(false));

  useEffect(() => {
    if (!open) return;
    document.documentElement.setAttribute("data-gated", "true");
    return () => document.documentElement.removeAttribute("data-gated");
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] bg-ink-deep flex items-center justify-center gutter"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 0.9, 0.25, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Enter the site"
          onClick={(e) => { if (e.target === e.currentTarget) enter(false); }}
        >
          <div className="absolute inset-0 crt-grid opacity-70 pointer-events-none" aria-hidden="true" />
          <div className="hazard absolute inset-x-0 top-0 h-1.5 opacity-30" aria-hidden="true" />
          <div className="hazard absolute inset-x-0 bottom-0 h-1.5 opacity-30" aria-hidden="true" />

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
                Turn your sound on for the best experience, choom :)
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
                  Enter with sound
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

              <p className="mt-6 mono-micro text-faint leading-relaxed">
                Your browser needs a click before it will play audio. Volume
                lives bottom left, and either choice is changeable there.
              </p>

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
