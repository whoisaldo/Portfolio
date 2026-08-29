// src/components/projects/OtherProjects.jsx: the auxiliary index.
//
// A wide multi-column list rather than the narrow accordion stack it replaced.
// These are small things and the layout should say so: no images, no expand,
// no per-row hover recipe, just a scannable index.
//
// These get no chamfered panel each. Seven chamfers in a row would flatten the
// distinction between this list and the eight things above it that actually
// carry a case study, and the whole job of this section is to read as smaller.
import React from "react";
import { ArrowUpRight } from "lucide-react";

export default function OtherProjects({ projects, startIndex = 0 }) {
  return (
    <div className="gutter pt-24 md:pt-32 pb-28 md:pb-36">
      <div className="flex items-baseline gap-6 mb-10">
        <h2 className="font-display uppercase text-primary text-2xl md:text-3xl font-semibold">
          Also
        </h2>
        <span className="mono-label text-faint">
          coursework · experiments · tools
        </span>
      </div>

      {/* Hairlines come from a border on each cell, not from `gap-px` over a
          tinted container. The old technique draws the rules by letting the
          container's background show through one-pixel gaps, which works only
          while the last row is full: with seven items in a three-up grid the
          two unfilled cells showed that background as a solid lighter block. */}
      <ul className="grid border-t border-l border-ink-line sm:grid-cols-2 xl:grid-cols-3 rail-clear">
        {projects.map((p, i) => (
          <li key={p.title} className="bg-ink border-r border-b border-ink-line">
            <a
              href={p.github}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full flex-col gap-3 p-6 transition-colors hover:bg-ink-raised"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="mono-micro text-faint">
                  {String(startIndex + i + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-faint transition-all group-hover:text-volt group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <h3 className="font-display uppercase text-display-3 text-primary transition-colors group-hover:text-volt">
                {p.title}
              </h3>
              <p className="prose-dark grow text-[0.9375rem] leading-[1.6]">
                {p.description}
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {p.tech.map((t) => (
                  <li key={t} className="mono-micro text-dim">{t}</li>
                ))}
              </ul>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
