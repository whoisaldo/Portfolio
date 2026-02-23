// src/components/TechStackMarquee.jsx - OPTIMIZED with CSS animation
import React from "react";

const techStack = [
  "React", "TypeScript", "C++", "Java", "Lua", "Python",
  "Node.js", "MongoDB", "Git", "Linux", "Tailwind", "Framer Motion"
];

export default function TechStackMarquee() {
  return (
    <section className="relative py-14 overflow-hidden bg-[#0a0a0f]">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-500 via-red-600 to-rose-500 bg-clip-text text-transparent">
          Tech Stack
        </h2>
      </div>

      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10 pointer-events-none" />

        {/* CSS Marquee - no JS animation */}
        <div className="flex overflow-hidden">
          <div className="flex gap-4 animate-marquee">
            {[...techStack, ...techStack].map((tech, i) => (
              <div
                key={`a-${i}`}
                className="flex-shrink-0 px-5 py-2.5 rounded-lg bg-[#12121a]/70 border border-white/5 
                           hover:border-red-500/30 hover:bg-red-500/5 transition-colors duration-200"
              >
                <span className="font-medium text-neutral-300 whitespace-nowrap">{tech}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 animate-marquee" aria-hidden="true">
            {[...techStack, ...techStack].map((tech, i) => (
              <div
                key={`b-${i}`}
                className="flex-shrink-0 px-5 py-2.5 rounded-lg bg-[#12121a]/70 border border-white/5 
                           hover:border-red-500/30 hover:bg-red-500/5 transition-colors duration-200"
              >
                <span className="font-medium text-neutral-300 whitespace-nowrap">{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
