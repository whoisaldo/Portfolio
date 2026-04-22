// src/components/TechStackMarquee.jsx — Mono ticker tape
import React from "react";

const techStack = [
  "React", "TypeScript", "Node.js", "Rust", "Swift", "SwiftUI",
  "C#", ".NET", "C++", "Python", "Go", "Java", "Lua",
  "AWS", "MongoDB", "Express", "Tailwind", "Framer Motion",
  "Gemini", "Linux", "PowerShell", "Git", "DXGI", "Metal",
  "VideoToolbox", "H.264", "JWT", "REST", "PyInstaller", "Electron",
];

export default function TechStackMarquee() {
  return (
    <section className="relative py-16 md:py-20 bg-ink border-y border-bone/10 overflow-hidden grain">
      <div className="max-w-7xl mx-auto px-6 md:px-10 mb-8 flex items-baseline justify-between gap-4">
        <div>
          <div className="mono-label text-signal/80 mb-2">§ 03 — Stack</div>
          <h2 className="serif-display italic text-3xl md:text-5xl text-bone">what I build with.</h2>
        </div>
        <div className="mono-label text-bone/45 hidden sm:block">feed · live</div>
      </div>

      {/* Ticker row 1 */}
      <div className="relative overflow-hidden border-y border-bone/10 bg-ink/60">
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-ink to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-ink to-transparent z-10 pointer-events-none" />
        <div className="flex animate-marquee py-4 whitespace-nowrap">
          {[...techStack, ...techStack].map((t, i) => (
            <span
              key={`a-${i}`}
              className="shrink-0 font-mono text-sm md:text-base text-bone/80 px-6 flex items-center gap-6"
            >
              <span className="text-signal">●</span>
              <span className="uppercase tracking-[0.08em]">{t}</span>
              <span className="text-bone/20">/</span>
            </span>
          ))}
        </div>
      </div>

      {/* Ticker row 2 — counter direction */}
      <div className="relative overflow-hidden border-b border-bone/10 bg-ink/40">
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-ink to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-ink to-transparent z-10 pointer-events-none" />
        <div className="flex animate-ticker py-3 whitespace-nowrap" style={{ animationDirection: 'reverse' }}>
          {[...techStack.slice().reverse(), ...techStack.slice().reverse()].map((t, i) => (
            <span
              key={`b-${i}`}
              className="shrink-0 font-mono text-xs md:text-sm text-bone/45 px-5 flex items-center gap-5"
            >
              <span className="uppercase tracking-[0.22em]">{t}</span>
              <span className="text-bone/15">◇</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
