// src/components/projects/ProjectIndex.jsx — the work, all of it, at once.
//
// This replaces a scroll-pinned reel that showed eight projects one at a time
// across roughly 460vh. The reel looked good and cost too much: a reader with
// forty seconds saw two projects, could not compare any of them, and could not
// tell how many there were without scrolling to the end. Nobody scans a
// carousel. They leave.
//
// A grid answers the questions a reader actually arrives with. How many are
// there. Which one is worth opening. Every card carries the same four things
// in the same place, so comparing them takes no effort.
//
// The depth moved to /work/:slug, which is why the home page no longer needs
// to hold it. Each card is one link to one page. There is no modal any more.
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import ProjectImage from "./ProjectImage";
import { hexToRgbTriplet } from "../../lib/image";

export default function ProjectIndex({ projects }) {
  const total = String(projects.length).padStart(2, "0");

  return (
    <ol className="gutter grid gap-x-8 gap-y-14 lg:grid-cols-2 xl:mr-20">
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
            {/* Key art. The 20px LQIP scaled up sits behind it, so the frame is
                never an empty box while the plate decodes. */}
            <div className="relative aspect-[3/2] overflow-hidden border border-hud/20 bg-ink-raised">
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
                className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink/75 to-transparent"
              />

              <div className="absolute inset-x-0 top-0 flex items-center gap-3 p-4">
                <span className="mono-label text-hud-soft">
                  {String(i + 1).padStart(2, "0")} / {total}
                </span>
                {p.status === "live" && (
                  <span className="mono-label text-ember">Live</span>
                )}
                {p.status && p.status !== "live" && (
                  <span className="mono-label text-dim">{p.status}</span>
                )}
              </div>

              {/* The border lights to the project's own accent on hover, so the
                  card you are pointing at is unambiguous in a grid of eight. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 border opacity-0 transition-opacity duration-300
                           group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{ borderColor: "rgb(var(--accent))" }}
              />
            </div>

            <div className="pt-5">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="serif-display italic text-primary text-3xl md:text-4xl leading-none">
                  {p.title}
                </h3>
                <ArrowUpRight
                  className="w-5 h-5 shrink-0 text-dim transition-all duration-200
                             group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>

              <p className="mt-4 prose-dark max-w-[52ch]">{p.why}</p>

              <ul className="mt-5 flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Stack">
                {p.tech.slice(0, 5).map((t) => (
                  <li key={t} className="mono-label text-dim">{t}</li>
                ))}
                {p.tech.length > 5 && (
                  <li className="mono-label text-faint">+{p.tech.length - 5}</li>
                )}
              </ul>
            </div>
          </Link>
        </motion.li>
      ))}
    </ol>
  );
}
