// src/components/projects/ProjectIndex.jsx — the work, all of it, at once.
//
// This replaced a scroll-pinned reel that showed eight projects one at a time
// across roughly 460vh. The reel looked good and cost too much: a reader with
// forty seconds saw two projects, could not compare any of them, and could not
// tell how many there were without scrolling to the end. Nobody scans a
// carousel. They leave.
//
// A grid answers the questions a reader actually arrives with. How many are
// there. Which one is worth opening. Every card carries the same four things
// in the same place, so comparing them takes no effort.
//
// Colour is load-bearing here rather than decorative: `--accent` is volt on a
// live project and fuchsia on one still in development (see the note above
// `const LIVE` in src/data/projects.js). Six yellow cards and two magenta ones
// means a reader can see what is shipped before reading a word.
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import ProjectImage from "./ProjectImage";
import Panel from "../ui/Panel";
import { hexToRgbTriplet } from "../../lib/image";

export default function ProjectIndex({ projects }) {
  const total = String(projects.length).padStart(2, "0");

  return (
    <ol className="gutter rail-clear grid gap-x-8 gap-y-14 lg:grid-cols-2">
      {projects.map((p, i) => (
        <motion.li
          key={p.slug}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: Math.min(i % 2, 1) * 0.06 }}
          style={{ "--accent": hexToRgbTriplet(p.accent) }}
        >
          <Link to={`/work/${p.slug}`} className="group block focus-visible:outline-none">
            {/* Key art, in a frame cut at the bottom-right only. The top-left
                corner carries the index and the status flag, and a 45° cut
                under a label just eats the label. */}
            <Panel
              corner="br"
              edge="bg-ink-line transition-colors duration-300"
              fill="bg-ink-raised"
              className="group-hover:bg-accent group-focus-visible:bg-accent"
              innerClassName="relative aspect-[3/2] overflow-hidden"
            >
              {p.images?.[0]?.lqip && (
                <div
                  aria-hidden="true"
                  className="ambient-plate"
                  style={{ backgroundImage: `url("${p.images[0].lqip}")` }}
                />
              )}
              <ProjectImage
                image={p.images?.[0]}
                alt={`${p.title} key art`}
                loading={i < 2 ? "eager" : "lazy"}
                sizes="(min-width: 1024px) 46vw, 92vw"
                className="relative w-full h-full object-cover transition-transform duration-700 ease-out
                           group-hover:scale-[1.03]"
              />
              {/* Scrim at the top only, where the labels are. An earlier
                  version graded the bottom instead, which darkened the plate
                  without making anything more readable. The key art is already
                  around 90% near-black by design, so it cannot afford a second
                  layer of shade for decoration. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink/85 to-transparent"
              />

              <div className="absolute inset-x-0 top-0 flex items-center gap-3 p-4">
                <span className="mono-micro text-dim">
                  {String(i + 1).padStart(2, "0")} / {total}
                </span>
                <span
                  className="chamfer chamfer-sm mono-micro px-2 py-1 text-ink font-bold"
                  style={{ backgroundColor: "rgb(var(--accent))" }}
                >
                  {p.status === "live" ? "Live" : p.status}
                </span>
              </div>
            </Panel>

            <div className="pt-5">
              <div className="flex items-baseline justify-between gap-4">
                <h3
                  className="font-display uppercase text-display-2 text-primary
                             transition-colors duration-200 group-hover:text-accent"
                >
                  {p.title}
                </h3>
                <ArrowUpRight
                  className="w-5 h-5 shrink-0 text-dim transition-all duration-200
                             group-hover:text-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>

              <p className="mt-4 prose-dark max-w-[52ch]">{p.why}</p>

              <ul className="mt-5 flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Stack">
                {p.tech.slice(0, 5).map((t) => (
                  <li key={t} className="mono-micro text-dim">{t}</li>
                ))}
                {p.tech.length > 5 && (
                  <li className="mono-micro text-faint">+{p.tech.length - 5}</li>
                )}
              </ul>
            </div>
          </Link>
        </motion.li>
      ))}
    </ol>
  );
}
