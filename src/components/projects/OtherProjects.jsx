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

      <ul className="grid gap-px bg-hud/15 border border-hud/15 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((p, i) => (
          <li key={p.title} className="bg-ink">
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
              <h3 className="font-serif text-primary text-lg leading-snug">
                {p.title}
              </h3>
              <p className="text-sm text-dim leading-relaxed grow">
                {p.description}
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {p.tech.map((t) => (
                  <li key={t} className="mono-label text-faint">{t}</li>
                ))}
              </ul>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
