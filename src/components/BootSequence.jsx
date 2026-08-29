// src/components/BootSequence.jsx: first-visit power-on.
//
// The version before last was a gate: a full-screen z-[100] overlay that held
// the page hostage for 1.6s behind fake terminal output --
//   > UPLINK........OK
//   > AUTH..........OK
//   > ENTRY_GRANTED
// -- none of which described anything that was happening. It rendered on top
// of the navbar, so the two collided on load, and it needed a 4s "force
// reveal" timer in App.jsx because it could fail to dismiss itself.
//
// This one is a wash, not a gate:
//   - the page is fully rendered and interactive underneath from frame one
//   - pointer-events: none, so it cannot swallow a click
//   - ~950ms, and any key, click or scroll ends it immediately
//   - no invented telemetry. A line-scan and the name resolving, which is the
//     one thing the animation is actually about. The cyberpunk pass did not
//     put the fake boot log back, and it should stay out.
//
// The character scramble that used to be inlined here is now useDecode() in
// src/hooks: section headings wanted the same effect, so there is one copy.
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion, useDecode } from "../hooks";
import { profile } from "../data/profile";

const SEEN_KEY = "aly.boot.v4";
const DURATION = 950;

export default function BootSequence({ onDone }) {
  const reduced = usePrefersReducedMotion();
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SEEN_KEY) !== "1";
  });
  const doneRef = useRef(false);

  const target = profile.name.toUpperCase();
  const text = useDecode(target, { active: show, duration: DURATION * 0.72 });

  useEffect(() => {
    if (!show) {
      onDone?.();
      return;
    }
    if (reduced) {
      finish();
      return;
    }

    const timer = setTimeout(finish, DURATION);
    const skip = () => finish();

    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    window.addEventListener("wheel", skip, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("wheel", skip);
    };

    function finish() {
      if (doneRef.current) return;
      doneRef.current = true;
      sessionStorage.setItem(SEEN_KEY, "1");
      setShow(false);
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, reduced]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          // pointer-events-none is the whole difference between a wash and a
          // gate: the page beneath is live from the first frame.
          className="fixed inset-0 z-[100] pointer-events-none bg-ink-deep flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 0.9, 0.25, 1] }}
          aria-hidden="true"
        >
          {/* CRT line-scan across the void. One of exactly two places on the
              site where anything glows; the other is the focus ring. A glow
              needs an implied light source, and a scanning beam is one. */}
          <motion.div
            className="absolute left-0 right-0 h-px bg-volt"
            initial={{ top: "0%", opacity: 0 }}
            animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: DURATION / 1000, ease: "linear" }}
            style={{ boxShadow: "0 0 24px 2px rgb(252 238 10 / 0.5)" }}
          />
          <span className="mono-label text-volt text-sm md:text-base">
            {text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
