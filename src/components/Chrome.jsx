// src/components/Chrome.jsx: the single persistent overlay.
//
// Replaces SideRail.jsx and hud/HUDOverlay.jsx, which between them put six
// things on screen at once: a left "Vol. XXVI / Edition IV" spine, a right
// Roman-numeral index, four corner brackets, a live clock, a scroll
// percentage, map coordinates, and an "uplink_stable" dot. Two of those
// duplicated the same IntersectionObserver logic, and five of the readouts
// were invented.
//
// What survives is what reports real state: where you are in the document, and
// how far through it you are. Both are true, both are useful, and neither
// needs a costume. That rule is worth restating here because a cyberpunk theme
// is a standing invitation to put the fake coordinates back. It is not an
// invitation this file accepts.
import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { sections } from "../data/site";
import { scrollToSection } from "../lib/scroll";
import {
  getVolume,
  replayBoot,
  setSoundEnabled,
  setVolume,
  soundEnabled,
  unlockAudio,
} from "../lib/boot-audio";
import { applyVolume, startAmbient, stopAmbient } from "../lib/ambient";

export default function Chrome() {
  const [active, setActive] = useState(sections[0].id);
  const [progress, setProgress] = useState(0);
  const [sound, setSound] = useState(() => soundEnabled());
  const [volume, setVol] = useState(() => getVolume());

  // Turning sound on replays the boot. Two reasons, and the second is the load
  // bearing one: it shows the reader what they just switched on, and the click
  // itself is the user gesture browsers require before an AudioContext will
  // leave the suspended state. Enabling and demonstrating are the same action,
  // so there is no way to end up with sound "on" and nothing ever audible.
  const toggleSound = async () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) {
      await unlockAudio();
      startAmbient();
      replayBoot();
    } else {
      stopAmbient();
    }
  };

  // The slider writes through to the running mix on every input event rather
  // than on release, because a volume control you cannot hear while dragging
  // is a volume control you have to guess at.
  const onVolume = (e) => {
    const v = setVolume(parseFloat(e.target.value));
    setVol(v);
    applyVolume();
  };

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);

    // Deliberately NOT an IntersectionObserver ranked by intersectionRatio: a
    // tall section's ratio (viewport / section) is always small, so a short
    // neighbour outranks it even when it fills the screen. "Which section
    // covers the middle of the viewport" is the question actually being asked,
    // so ask it directly.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);

        const mid = window.innerHeight / 2;
        let current = els[0]?.id ?? sections[0].id;
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (r.top <= mid && r.bottom > mid) { current = el.id; break; }
          if (r.top <= mid) current = el.id;
        }
        setActive(current);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Reading progress. One hairline across the top of the viewport. */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] h-px bg-transparent pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-volt origin-left transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Section index, right edge. Clickable, so it is navigation rather than
          decoration; the Roman numerals it replaces were neither. It carries
          all seven sections, including the two the top bar leaves out. */}
      <nav
        aria-label="Sections"
        className="hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 flex-col gap-1 items-end"
      >
        {sections.map((s) => {
          const on = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollToSection(s.id)}
              aria-current={on ? "true" : undefined}
              className="group flex items-center gap-3 py-1.5 focus-visible:outline-none"
            >
              <span
                className={`mono-micro chamfer chamfer-sm px-2 py-1 transition-colors duration-300 ${
                  on
                    ? "text-primary bg-ink/90"
                    : "text-transparent group-hover:text-dim group-hover:bg-ink/90"
                }`}
              >
                {s.label}
              </span>
              {/* The tick itself is the indicator: it lengthens and goes volt
                  for the section you are in. */}
              <span
                className={`block h-px transition-all duration-300 ease-out ${
                  on ? "w-8 bg-volt" : "w-4 bg-ink-line group-hover:w-6"
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* Sound. Bottom left, quiet until you look for it. It is a preference
          control on a page that has deliberately little chrome, so it stays at
          icon size and only names itself on hover. */}
      <div className="group fixed bottom-5 left-5 z-50 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          aria-label={sound ? "Turn sound off" : "Turn sound on and replay the boot"}
          className="p-2 text-faint transition-colors duration-200 hover:text-volt
                     focus-visible:text-volt"
        >
          {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* The slider is revealed rather than always shown: it is only
            meaningful while something is audible, and a permanent control in
            the corner of a page this quiet would be the loudest thing on it.
            `focus-within` is in the condition so it is reachable by keyboard
            without a pointer ever hovering. */}
        <div
          className={`flex items-center gap-3 transition-opacity duration-200 ${
            sound
              ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={onVolume}
            aria-label="Volume"
            className="w-24 h-1 cursor-pointer [accent-color:#fcee0a]"
          />
          <span className="mono-micro text-dim tabular-nums w-8">
            {Math.round(volume * 100)}
          </span>
        </div>
      </div>

      {/* Asks once, on a first visit, and only because a browser will not let
          audio start without a click to hang it on. */}
    </>
  );
}
