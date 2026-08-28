// src/components/Hero.jsx
//
// What was removed and why:
//
//   "MISSION_BRIEFING // 001 — SUBJECT: ALI_YOUNES"   invented framing
//   a 7-row "vitals" panel                            six of its seven rows were
//                                                     ornament: a live clock,
//                                                     42.3601°N 71.0589°W,
//                                                     "IV — vol. xxvi",
//                                                     "uplink ● stable", and a
//                                                     version string
//   "architecting scalable enterprise infrastructure" typed one character at a
//                                                     time as the first sentence
//                                                     on the site — four words,
//                                                     three of them LinkedIn
//
// The replacement states scope and stops. No thesis, no claim — the eight
// projects and the Philips case study do the arguing, which is the rule
// docs/PROJECT_CONTEXT.md sets for this repo: a reader should find the
// portfolio understated, never overstated.
//
// What stayed: the Fraunces italic name at display scale. It is the strongest
// piece of design on the site and it does not need help.
//
// The layout is wide rather than a centred column — the name runs across the
// gutter and the facts sit under it as a horizontal ledger.
import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Github, Linkedin, Mail } from "lucide-react";
import { profile, links } from "../data/profile";
import { portrait } from "../data/life";
import { scrollToSection } from "../lib/scroll";
import Picture from "./Picture";

const rise = {
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
};

export default function Hero() {
  const pdf = (import.meta.env.BASE_URL || "/") + "resume.pdf";

  return (
    <section
      id="hero"
      className="relative min-h-[100svh] flex flex-col justify-center gutter pt-32 pb-16 overflow-hidden"
    >
      {/* One bloom, one grid. The old hero stacked a bloom, a CRT grid, a
          diagonal rule, film grain and scanlines simultaneously. */}
      <div className="absolute inset-0 crt-grid opacity-40 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute -top-40 right-[-10%] w-[46rem] h-[46rem] signal-bloom blur-3xl opacity-40 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative w-full">
        {/* ---- name ------------------------------------------------------- */}
        <motion.h1
          {...rise}
          transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          className="serif-display text-primary leading-[0.82] tracking-[-0.04em]"
          style={{ fontSize: "clamp(4rem, 16vw, 17rem)" }}
        >
          <span className="italic">{profile.first}</span>{" "}
          <span className="italic text-signal">{profile.last}</span>
        </motion.h1>

        {/* Everything under the name shares a row with the portrait at lg and
            up. The name itself stays full-bleed above it: its size is driven by
            `vw`, not by this container, so putting it in a column would only
            make it overlap the photograph. */}
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <div className="order-2 lg:order-1 min-w-0">
        {/* ---- the line --------------------------------------------------- */}
        <motion.p
          {...rise}
          transition={{ duration: 0.8, delay: 0.12, ease: [0.2, 0.7, 0.2, 1] }}
          className="font-serif italic text-muted max-w-[34ch]"
          style={{ fontSize: "clamp(1.15rem, 2vw, 1.75rem)", lineHeight: 1.35 }}
        >
          Systems, iOS and web. Boston.
        </motion.p>

        {/* ---- ledger ----------------------------------------------------- */}
        {/* A row across the full gutter rather than a boxed panel in a right
            column. Three facts, all checkable. */}
        <motion.dl
          {...rise}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
          className="mt-14 grid gap-px bg-hud/15 border-y border-hud/15 sm:grid-cols-3"
        >
          <div className="bg-ink px-5 py-5">
            <dt className="mono-label text-ember mb-2 flex items-center gap-2">
              {/* The one pulsing dot on the page. There were seven. */}
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="animate-signal-ping absolute inline-flex h-full w-full rounded-full bg-ember" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ember" />
              </span>
              Now
            </dt>
            <dd className="text-sm text-muted leading-relaxed">
              {profile.now.role} at {profile.now.org}
              <span className="block text-dim">
                {profile.now.detail} · {profile.now.location}
              </span>
            </dd>
          </div>

          <div className="bg-ink px-5 py-5">
            <dt className="mono-label text-dim mb-2">Previously</dt>
            <dd className="text-sm text-muted leading-relaxed">
              {profile.prev.role} at {profile.prev.org}
              <span className="block text-dim">
                {profile.prev.period} · {profile.prev.location}
              </span>
            </dd>
          </div>

          <div className="bg-ink px-5 py-5">
            <dt className="mono-label text-dim mb-2">Studying</dt>
            <dd className="text-sm text-muted leading-relaxed">
              {profile.degree}
              <span className="block text-dim">
                {profile.school} · Class of {profile.gradYear}
              </span>
            </dd>
          </div>
        </motion.dl>

        {/* ---- actions ---------------------------------------------------- */}
        <motion.div
          {...rise}
          transition={{ duration: 0.8, delay: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
          className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-4"
        >
          <button
            type="button"
            onClick={() => scrollToSection("projects")}
            className="scan-beam-host group inline-flex items-center gap-2.5 px-7 py-3.5 bg-signal text-ink
                       mono-ui font-bold hover:bg-signal-soft transition-colors duration-200"
          >
            See the work
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <a
            href={pdf}
            download="Ali_Younes_Resume.pdf"
            className="inline-flex items-center gap-2 px-7 py-3.5 mono-ui border border-hud/40 text-muted
                       hover:border-hud-soft hover:text-primary transition-colors duration-200"
          >
            Résumé
          </a>

          <div className="flex items-center gap-5 sm:ml-4">
            <a
              href={links.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="text-dim hover:text-signal-soft transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href={links.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="text-dim hover:text-signal-soft transition-colors"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href={links.email}
              aria-label="Email"
              className="text-dim hover:text-signal-soft transition-colors"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
          </div>

          {/* ---- portrait ------------------------------------------------- */}
          {/* Framed like the rest of the chrome rather than dropped in as a
              round avatar, and held at 82% saturation so it sits in the violet
              ground instead of on top of it. Full colour on hover — the one
              place on the page where an image reacts to the cursor, which is
              affordable precisely because nothing else here does.

              The `xl:mr-16` clears the section index in Chrome.jsx, which is
              `fixed right-6` from xl up and whose active label reaches roughly
              7rem in from the edge. The hero is the only block whose content
              runs flush to the right gutter, so it is the only one that has to
              move out of its way. */}
          <motion.figure
            {...rise}
            transition={{ duration: 0.9, delay: 0.36, ease: [0.2, 0.7, 0.2, 1] }}
            className="order-1 lg:order-2 group relative w-40 sm:w-52 lg:w-[17rem] xl:w-[19rem] xl:mr-16 shrink-0"
          >
            <div className="relative overflow-hidden border border-hud/25">
              {/* The 20px LQIP, scaled up. Same trick as the reel's ambient
                  plate: the frame is never an empty box, even on a cold load. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${portrait.image.lqip}")` }}
              />
              <Picture
                sources={portrait.image}
                alt={portrait.alt}
                sizes="(min-width: 1280px) 19rem, (min-width: 1024px) 17rem, (min-width: 640px) 13rem, 10rem"
                fetchPriority="high"
                className="relative w-full h-auto saturate-[0.82] contrast-[1.04]
                           transition-[filter] duration-500 group-hover:saturate-100"
              />
              {/* Grades the base of the photo into the page so the frame does
                  not read as a sticker. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/70 to-transparent"
              />
            </div>
            <figcaption className="mt-3 mono-label text-dim flex items-center justify-between gap-3">
              <span>{portrait.caption}</span>
              <span className="text-hud/70" aria-hidden="true">01</span>
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}
