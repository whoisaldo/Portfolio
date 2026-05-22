// src/components/hud/BootSequence.jsx — first-visit boot animation
import React, { useEffect, useState, useRef } from "react";

const KEY = "er.boot.v2.seen";

const LINES = [
  "> ETERNAL_REVERSE // EDITION_IV",
  "> UPLINK........................OK",
  "> AUTH..........................OK",
  "> LOADING ALI_YOUNES.PORTFOLIO",
];

export default function BootSequence({ onDone }) {
  // Decide once, at mount, whether to run.
  const [phase, setPhase] = useState(() => {
    if (typeof window === "undefined") return "done";
    if (sessionStorage.getItem(KEY) === "1") return "done";
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return reduced ? "reduced" : "running";
  });
  const [visibleLines, setVisibleLines] = useState(0);
  const [progress, setProgress] = useState(0);
  const [granted, setGranted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (phase === "done") {
      onDoneRef.current?.();
      return;
    }

    if (phase === "reduced") {
      sessionStorage.setItem(KEY, "1");
      const t = setTimeout(() => {
        setExiting(true);
        setTimeout(() => { setPhase("done"); onDoneRef.current?.(); }, 200);
      }, 150);
      return () => clearTimeout(t);
    }

    // Running — full sequence
    const timers = [];
    const finish = () => {
      sessionStorage.setItem(KEY, "1");
      setExiting(true);
      timers.push(setTimeout(() => { setPhase("done"); onDoneRef.current?.(); }, 400));
    };

    // Stagger lines
    LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 400 + i * 180));
    });
    timers.push(setTimeout(() => setProgress(100), 1100));
    timers.push(setTimeout(() => setGranted(true), 1300));
    timers.push(setTimeout(finish, 1600));

    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        timers.forEach(clearTimeout);
        finish();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      role="presentation"
      className={`fixed inset-0 z-[100] bg-ink-deep text-bone font-mono overflow-hidden transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
    >
      {/* Scanlines */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, rgba(103,232,249,0.6) 0 1px, transparent 1px 3px)",
        }}
      />
      <div className="absolute inset-0 crt-grid opacity-50 pointer-events-none" />

      {/* Corner brackets */}
      <span aria-hidden className="absolute top-6 left-6 w-5 h-5 border-t border-l border-hud/80" />
      <span aria-hidden className="absolute top-6 right-6 w-5 h-5 border-t border-r border-hud/80" />
      <span aria-hidden className="absolute bottom-6 left-6 w-5 h-5 border-b border-l border-hud/80" />
      <span aria-hidden className="absolute bottom-6 right-6 w-5 h-5 border-b border-r border-hud/80" />

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        <div className="text-[10px] tracking-[0.4em] text-hud/70 uppercase mb-8">
          ▸ system_boot
        </div>

        <div className="text-xs md:text-sm space-y-2 min-w-[300px] max-w-[480px]">
          {LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} className="text-bone/85">
              {line}
              {i === visibleLines - 1 && !granted && (
                <span className="boot-cursor text-hud ml-1">▮</span>
              )}
            </div>
          ))}

          {visibleLines >= LINES.length && (
            <div className="pt-4 pb-2">
              <div className="h-px w-full bg-bone/15 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-hud via-hud to-signal transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {granted && (
            <div className="text-signal font-bold tracking-[0.2em]">
              &gt; ENTRY_GRANTED <span className="text-hud">●</span>
            </div>
          )}
        </div>
      </div>

      {/* Skip */}
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(KEY, "1");
          setExiting(true);
          setTimeout(() => { setPhase("done"); onDoneRef.current?.(); }, 200);
        }}
        className="absolute bottom-6 right-12 text-[10px] tracking-[0.3em] text-bone/40 hover:text-hud uppercase font-mono transition-colors"
      >
        [esc] skip
      </button>

      {/* Edition stamp */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.45em] text-hud/50 uppercase font-mono">
        Vol. XXVI · N° 01 · Edition IV
      </div>
    </div>
  );
}
