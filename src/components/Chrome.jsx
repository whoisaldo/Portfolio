// src/components/Chrome.jsx — the single persistent overlay.
//
// Replaces SideRail.jsx and hud/HUDOverlay.jsx, which between them put six
// things on screen at once: a left "Vol. XXVI / Edition IV" spine, a right
// Roman-numeral index, four corner brackets, a live clock, a scroll
// percentage, map coordinates, and an "uplink_stable" dot. Two of those
// duplicated the same IntersectionObserver logic, and five of the readouts
// were invented — the site's own rule is that a reader should be able to check
// what it claims.
//
// What survives is what reports real state: where you are in the document, and
// how far through it you are. Both are true, both are useful, and neither
// needs a costume.
import React, { useEffect, useState } from "react";
import { sections } from "../data/site";
import { scrollToSection } from "../lib/scroll";

export default function Chrome() {
  const [active, setActive] = useState(sections[0].id);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);

    // Deliberately NOT an IntersectionObserver ranked by intersectionRatio:
    // the projects section is 460vh tall, so its ratio (viewport / section) is
    // always small and a short neighbouring section outranks it even when it
    // fills the screen. "Which section covers the middle of the viewport" is
    // the question actually being asked, so ask it directly.
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
          className="h-full bg-signal origin-left transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Section index, right edge. Clickable, so it is navigation rather than
          decoration — the Roman numerals it replaces were neither. */}
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
                className={`mono-label px-2 py-0.5 transition-colors duration-300 ${
                  on
                    ? "text-muted bg-ink/85"
                    : "text-transparent group-hover:text-faint group-hover:bg-ink/85"
                }`}
              >
                {s.label}
              </span>
              <span
                className={`block h-px transition-all duration-300 ease-out ${
                  on ? "w-8 bg-signal-soft" : "w-4 bg-hud/50 group-hover:w-6"
                }`}
              />
            </button>
          );
        })}
      </nav>
    </>
  );
}
