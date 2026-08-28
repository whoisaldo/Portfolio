// src/components/projects/ProjectStack.jsx
//
// The reel's fallback: narrow viewports, touch devices, and anyone with
// prefers-reduced-motion. Same content, no pin, no horizontal translation, no
// 460vh wrapper -- scroll-jacking someone who has asked the OS for less motion
// is the thing the preference exists to prevent.
//
// Only one of this and ProjectReel is ever mounted. The previous build kept
// both trees in the DOM at all times and hid one with `lg:hidden`, which meant
// phones downloaded and laid out the desktop version too.
import React from "react";
import { motion } from "framer-motion";
import { ExternalLink, Github, ArrowUpRight } from "lucide-react";
import ProjectImage from "./ProjectImage";
import { hexToRgbTriplet } from "../../lib/image";

export default function ProjectStack({ projects, onOpen }) {
  return (
    <div className="gutter">
      <ol className="space-y-24 md:space-y-32">
        {projects.map((p, i) => (
          <motion.li
            key={p.slug}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
            style={{ "--accent": hexToRgbTriplet(p.accent) }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span
                className="h-2 w-2 shrink-0"
                style={{ backgroundColor: "rgb(var(--accent))" }}
                aria-hidden="true"
              />
              <span className="mono-ui text-dim">
                {String(i + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
              </span>
              {p.status === "live" && <span className="mono-ui text-ember">live</span>}
            </div>

            <div className="relative aspect-[3/2] bracket-frame mb-6">
              {p.images?.[0]?.lqip && (
                <div
                  className="ambient-plate"
                  style={{ backgroundImage: `url("${p.images[0].lqip}")` }}
                  aria-hidden="true"
                />
              )}
              <ProjectImage
                image={p.images?.[0]}
                alt={`${p.title} — key art`}
                sizes="92vw"
                className="relative w-full h-full object-contain"
                loading={i < 2 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
              />
              <span className="bracket-corner tl" />
              <span className="bracket-corner tr" />
              <span className="bracket-corner bl" />
              <span className="bracket-corner br" />
            </div>

            <h3 className="serif-display italic text-primary text-3xl sm:text-4xl leading-[0.95] mb-3">
              {p.title}
            </h3>
            <p className="mono-ui text-signal-soft mb-5">{p.tagline}</p>
            <p className="prose-dark prose-lede mb-4 max-w-[54ch]">{p.why}</p>
            <p className="prose-dark text-[0.9375rem] leading-[1.65] text-dim mb-7 max-w-[54ch]">
              {p.description}
            </p>

            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mb-6" aria-label="Stack">
              {p.tech.slice(0, 6).map((t) => (
                <li key={t} className="mono-ui text-dim">{t}</li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onOpen(i)}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 mono-ui font-bold text-ink"
                style={{ backgroundColor: "rgb(var(--accent))" }}
              >
                Open
                <ArrowUpRight className="w-4 h-4" />
              </button>
              {p.live && (
                <a
                  href={p.live}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 mono-ui border border-hud/40 text-muted"
                >
                  <ExternalLink className="w-4 h-4" />
                  Live
                </a>
              )}
              {p.github && (
                <a
                  href={p.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 mono-ui border border-hud/25 text-dim"
                >
                  <Github className="w-4 h-4" />
                  Source
                </a>
              )}
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
