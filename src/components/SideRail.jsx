// src/components/SideRail.jsx — left spine + right scroll-spy rail with progress bar
import React, { useEffect, useState } from "react";

const sections = [
  { id: "hero",       numeral: "I",   label: "Cover" },
  { id: "projects",   numeral: "II",  label: "Projects" },
  { id: "experience", numeral: "III", label: "Experience" },
  { id: "terminal",   numeral: "IV",  label: "Terminal" },
  { id: "resume",     numeral: "V",   label: "Résumé" },
  { id: "contact",    numeral: "VI",  label: "Contact" },
];

export default function SideRail() {
  const [active, setActive] = useState("hero");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    let lastPct = -1;
    const compute = () => {
      raf = 0;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = docHeight > 0 ? scrollTop / docHeight : 0;
      const pct = Math.round(ratio * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        setProgress(ratio);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.05, 0.25, 0.5, 0.75] }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const activeSection = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <>
      {/* LEFT SPINE — issue identity */}
      <aside
        aria-hidden="true"
        className="fixed left-0 top-0 z-30 hidden lg:flex flex-col items-center justify-between h-screen w-12 pointer-events-none"
      >
        <div className="pt-24 flex flex-col items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hud opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-hud" />
          </span>
          <span className="font-mono text-[9px] tracking-[0.3em] text-bone/45 rotate-180 vertical-rl">
            RUNNING
          </span>
        </div>

        <div className="vertical-rl font-mono text-[10px] tracking-[0.45em] text-bone/45 uppercase select-none">
          Vol. <span className="text-bone/80">XXVI</span>
          <span className="mx-2 text-hud">⁂</span>
          N° <span className="text-bone/80">01</span>
          <span className="mx-2 text-hud">⁂</span>
          Edition IV
        </div>

        <div className="pb-8 flex flex-col items-center gap-2">
          <span className="font-mono text-[9px] tracking-[0.3em] text-hud/60">↓</span>
        </div>
      </aside>

      {/* RIGHT RAIL — section index with scroll-spy */}
      <aside className="fixed right-0 top-0 z-30 hidden lg:flex flex-col items-center justify-center h-screen w-16 pointer-events-none">
        <div className="relative flex flex-col items-center gap-5 pointer-events-auto">
          {sections.map((s) => {
            const isActive = s.id === active;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-label={s.label}
                data-hud-target="link"
                className="group relative flex items-center gap-2"
              >
                <span
                  className={`font-mono text-[10px] tracking-[0.2em] uppercase transition-all duration-500 ${
                    isActive ? "text-hud" : "text-bone/45"
                  } absolute right-9 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100`}
                >
                  {s.label}
                </span>
                <span
                  className={`block transition-all duration-500 ${
                    isActive
                      ? "h-px w-7 bg-hud"
                      : "h-px w-3 bg-bone/30 group-hover:w-5 group-hover:bg-bone/70"
                  }`}
                />
                {/* Bracket-framed mini panel for active state */}
                <span
                  className={`relative bracket-frame font-mono text-[9px] tracking-[0.18em] uppercase px-1.5 py-0.5 transition-all duration-500 ${
                    isActive
                      ? "text-hud border border-hud/50 bg-hud/5"
                      : "text-bone/45 border border-transparent"
                  }`}
                >
                  {isActive && (
                    <>
                      <span aria-hidden className="bracket-corner tl sm" />
                      <span aria-hidden className="bracket-corner tr sm" />
                      <span aria-hidden className="bracket-corner bl sm" />
                      <span aria-hidden className="bracket-corner br sm" />
                    </>
                  )}
                  {s.numeral}
                </span>
              </a>
            );
          })}
        </div>

        {/* Vertical progress bar with numeric readout */}
        <div className="absolute bottom-10 right-4 flex flex-col items-center gap-2 pointer-events-none">
          <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-hud/70 tabular-nums">
            {`< ${String(Math.round(progress * 100)).padStart(2, "0")}% >`}
          </span>
          <div className="h-32 w-px bg-bone/10 overflow-hidden">
            <span
              className="block w-full bg-gradient-to-b from-hud to-signal"
              style={{ height: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Current numeral ghosted top-right */}
        <div className="absolute top-24 right-3 font-display italic text-2xl text-hud/15 select-none pointer-events-none">
          {activeSection.numeral}.
        </div>
      </aside>
    </>
  );
}
