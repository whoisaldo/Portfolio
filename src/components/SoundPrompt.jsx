// src/components/SoundPrompt.jsx: the one time this site asks for anything.
//
// It exists because of a hard browser rule rather than a design whim. An
// AudioContext stays suspended until the page has seen a real user gesture, so
// "sound on by default" cannot actually produce a sound on a first visit no
// matter what preference is stored. Something has to be clicked. A prompt is
// the honest way to ask for that click instead of waiting to harvest an
// unrelated one.
//
// Rules it follows:
//
//   Asked once, ever. Both answers are recorded. A prompt that returns after
//   being dismissed is worse than no prompt at all.
//   Never blocks. No overlay, no focus trap, no dimming. It is a card in a
//   corner and the site is fully usable with it sitting there ignored.
//   Arrives first. It is the opening move, before the reader has decided
//   whether to care, because someone who turns sound on at second three
//   experiences a different site than someone who finds the toggle at minute
//   two. It sits above the boot overlay rather than queueing behind it: the
//   boot is 2.2s of atmosphere and this is the thing that makes the
//   atmosphere audible, so waiting would be backwards.
//   Says what it will do. "Turn it on" starts music and replays the boot with
//   sound, and the copy says so, because a button that quietly starts audio is
//   the thing everyone hates.
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, X } from "lucide-react";
import {
  hasBeenAsked,
  markAsked,
  replayBoot,
  setSoundEnabled,
  unlockAudio,
} from "../lib/boot-audio";
import { startAmbient } from "../lib/ambient";
import Panel from "./ui/Panel";

// Just past first paint. Long enough not to flash in before the page has
// drawn, short enough to be the first thing a reader is asked.
const DELAY = 500;

export default function SoundPrompt({ onDecided }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (hasBeenAsked()) return;
    const t = setTimeout(() => setShow(true), DELAY);
    return () => clearTimeout(t);
  }, []);

  const decide = async (enabled) => {
    markAsked();
    setSoundEnabled(enabled);
    setShow(false);
    onDecided?.(enabled);
    if (!enabled) return;

    // This click is the gesture the whole prompt exists to collect.
    await unlockAudio();
    startAmbient();
    replayBoot();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: [0.16, 0.9, 0.25, 1] }}
          className="fixed bottom-5 right-5 z-[110] w-[min(20rem,calc(100vw-2.5rem))]"
          role="dialog"
          aria-label="Enable sound"
        >
          <Panel edge="bg-volt" fill="bg-ink-raised" innerClassName="p-5">
            <div className="flex items-start justify-between gap-4">
              <p className="mono-label text-volt flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5" />
                Sound
              </p>
              <button
                type="button"
                onClick={() => decide(false)}
                aria-label="Keep sound off"
                className="-m-1 p-1 text-faint transition-colors hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-3 prose-dark text-[0.9375rem] leading-[1.55]">
              Turn your sound on for the best experience, choom :)
            </p>

            <div className="mt-5 flex items-center gap-3">
              <Panel
                as="button"
                type="button"
                size="sm"
                onClick={() => decide(true)}
                edge="bg-volt hover:bg-volt-deep transition-colors duration-200"
                fill="bg-volt"
                className="scan-beam-host"
                innerClassName="px-4 py-2.5 mono-ui font-bold text-ink"
              >
                Turn it on
              </Panel>
              <button
                type="button"
                onClick={() => decide(false)}
                className="mono-ui text-dim transition-colors hover:text-primary"
              >
                No thanks
              </button>
            </div>

            <p className="mt-4 mono-micro text-faint leading-relaxed">
              Your browser needs a click before it will play audio. Volume is
              bottom left, and you can switch it off there any time.
            </p>
          </Panel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
