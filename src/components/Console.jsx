// src/components/Console.jsx: the console, behind a keystroke.
//
// Terminal.jsx used to be the fifth section of the page. It is a thousand
// lines of virtual filesystem and forty-four commands, most of which restated
// content the page already showed, so as a section it was a second website
// inside the website, and it sat between Experience and Contact in the reading
// path of every recruiter who ever opened the site.
//
// It is too good to delete and wrong to put in the way. So: press the backtick
// key anywhere on the site and it opens.
//
// Discoverability is deliberately low but not zero. Three ways in:
//
//   1. `  or ~ from anywhere (not while typing in a field)
//   2. a console.log printed once on load, for anyone who opens devtools,
//      which, on a software engineer's portfolio, is a decent share of the
//      people worth impressing
//   3. /console as a URL
//
// No visible button. A hint in the UI would make it a feature again, and the
// whole point is that it is not one.
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "../hooks";

// Code-split. This is a thousand lines that most visitors will never open;
// making everyone download it on first paint to support an easter egg would be
// a bad trade.
const Terminal = lazy(() => import("./Terminal"));

const HINT = "ali_younes.dev";

export default function Console() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useFocusTrap(panelRef, open, close);

  // The devtools hint. Printed once, styled enough to be noticed while
  // scrolling a log, and not so loud that it reads as an ad.
  useEffect(() => {
    if (typeof window === "undefined" || window.__ay_hint) return;
    window.__ay_hint = true;
    console.log(
      `%c${HINT}%c\n\nThere is a shell in here. Press %c\`%c to open it.`,
      "color:#fcee0a;font:600 15px ui-monospace,monospace",
      "color:#8a8780;font:13px ui-monospace,monospace",
      "color:#eceae4;background:#24242a;padding:1px 5px;border-radius:3px;font:13px ui-monospace,monospace",
      "color:#8a8780;font:13px ui-monospace,monospace",
    );
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "`" && e.key !== "~") return;
      // Never steal the key from someone typing, including from the console's
      // own input once it is open, where a backtick is just a character.
      const t = e.target;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // /console is the third way in, and the one you can put in a message.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.replace(/\/+$/, "") === "/console") setOpen(true);
  }, []);

  // NOTE: no body-scroll lock here. useFocusTrap already does it, and also
  // compensates for the scrollbar width so the page does not shift sideways as
  // the overlay opens. An earlier version of this file locked scroll a second
  // time, which was not merely redundant: both effects save the previous value
  // to restore on cleanup, so whichever ran second captured "hidden" as the
  // value to put back, and closing the console left the page unscrollable.

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-ink-deep/95 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Console"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
            className="relative w-full max-w-[1180px] my-6"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close console"
              className="absolute right-6 top-6 z-10 inline-flex h-9 w-9 items-center justify-center
                         border border-ink-line text-dim hover:text-primary hover:border-volt
                         transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <Suspense
              fallback={
                <p className="gutter py-16 mono-label text-dim">opening shell…</p>
              }
            >
              <Terminal onExit={close} />
            </Suspense>

            <p className="gutter pb-10 mono-label text-faint">
              esc to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
