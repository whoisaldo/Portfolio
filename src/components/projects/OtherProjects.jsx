// src/components/projects/OtherProjects.jsx — the auxiliary index.
//
// A wide multi-column list rather than the narrow accordion stack it replaces.
// These are small things and the layout should say so: no images, no expand,
// no per-row hover recipe -- just a scannable index.
import React from "react";
import { ArrowUpRight } from "lucide-react";

export default function OtherProjects({ projects, startIndex = 0 }) {
  return (
    <div className="gutter pt-24 md:pt-32 pb-28 md:pb-36">
      <div className="flex items-baseline gap-6 mb-10">
        <h2 className="serif-display italic text-primary text-3xl md:text-4xl">
          Also
        </h2>
        <span className="mono-label text-faint">
          coursework · experiments · tools
        </span>
      </div>

      {/* Hairlines come from a border on each cell, not from `gap-px` over a
          tinted container. The old technique draws the rules by letting the
          container's background show through one-pixel gaps, which works only
          while the last row is full — with seven items in a three-up grid the
          two unfilled cells showed that background as a solid lighter block. */}
      <ul className="grid border-t border-l border-hud/15 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((p, i) => (
          <li key={p.title} className="bg-ink border-r border-b border-hud/15">
            <a
              href={p.github}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full flex-col gap-3 p-6 transition-colors hover:bg-ink-raised"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="mono-label text-faint tabular-nums">
                  {String(startIndex + i + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-faint transition-all group-hover:text-signal-soft group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <h3 className="heading-text text-primary text-xl leading-snug">
                {p.title}
              </h3>
              <p className="prose-dark grow">
                {p.description}
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {p.tech.map((t) => (
                  <li key={t} className="mono-ui text-dim">{t}</li>
                ))}
              </ul>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
