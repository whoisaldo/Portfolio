// src/components/Hero.jsx
//
// What was removed a while back, and stays removed:
//
//   "MISSION_BRIEFING // 001 · SUBJECT: ALI_YOUNES"   invented framing
//   a 7-row "vitals" panel                            six of its seven rows
//                                                     were ornament: a live
//                                                     clock, 42.3601°N
//                                                     71.0589°W, "IV · vol.
//                                                     xxvi", "uplink ● stable"
//                                                     and a version string
//   "architecting scalable enterprise infrastructure" typed one character at a
//                                                     time as the first
//                                                     sentence on the site
//
// Every one of those would look completely at home in a Cyberpunk 2077 hero,
// which is exactly why this file names them. The theme changed; the rule did
// not. Three facts sit under the name and all three are checkable.
//
// The name is the design. It runs the full width of the gutter at a size
// nothing else on the site approaches, and it resolves out of character noise
// once, on load: the only place the decode fires without a scroll.
import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Github, Linkedin, Mail } from "lucide-react";
import { profile, links } from "../data/profile";
import { portrait } from "../data/life";
import { scrollToSection } from "../lib/scroll";
import Picture from "./Picture";
import Panel from "./ui/Panel";
import Glitch from "./ui/Glitch";

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
      {/* One grid, and nothing else. The violet radial bloom that used to sit
          behind this is gone: an ambient glow with no light source behind it
          is decoration, and this design spends its glow budget on the two
          places something is actually emitting: the boot line-scan and the
          focus ring. */}
      <div className="absolute inset-0 crt-grid opacity-60 pointer-events-none" aria-hidden="true" />

      <div className="relative w-full">
        {/* ---- name ------------------------------------------------------- */}
        <motion.h1
          {...rise}
          transition={{ duration: 0.9, ease: [0.16, 0.9, 0.25, 1] }}
          className="font-display uppercase text-display-hero text-primary"
        >
          <Glitch duration={780}>{profile.first.toUpperCase()}</Glitch>{" "}
          <Glitch duration={780} className="text-volt">
            {profile.last.toUpperCase()}
          </Glitch>
        </motion.h1>

        {/* Everything under the name shares a row with the portrait at lg and
            up. The name itself stays full-bleed above it: its size is driven
            by `vw`, not by this container, so putting it in a column would
            only make it overlap the photograph. */}
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <div className="order-2 lg:order-1 min-w-0">
            {/* ---- the line ------------------------------------------------ */}
            <motion.p
              {...rise}
              transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 0.9, 0.25, 1] }}
              className="font-display font-medium uppercase text-muted max-w-[26ch]"
              style={{ fontSize: "clamp(1.05rem, 1.9vw, 1.6rem)", lineHeight: 1.3, letterSpacing: "0.02em" }}
            >
              Systems, iOS and web. Boston.
            </motion.p>

            {/* ---- ledger -------------------------------------------------- */}
            {/* Three facts, all checkable, in three chamfered cells. */}
            <motion.dl
              {...rise}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 0.9, 0.25, 1] }}
              className="mt-12 grid gap-2.5 sm:grid-cols-3"
            >
              <Panel innerClassName="px-5 py-5">
                <dt className="mono-label text-volt mb-2.5 flex items-center gap-2">
                  {/* The one pulsing thing on the page. There were seven. It
                      belongs to the only row reporting something current, and
                      it is the sole sanctioned border-radius on the site. */}
                  <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                    <span className="animate-signal-ping absolute inline-flex h-full w-full rounded-full bg-volt" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt" />
                  </span>
                  Now
                </dt>
                <dd className="text-[0.9375rem] text-muted leading-relaxed">
                  {profile.now.role} at {profile.now.org}
                  <span className="block text-dim">
                    {profile.now.detail} · {profile.now.location}
                  </span>
                </dd>
              </Panel>

              <Panel innerClassName="px-5 py-5">
                <dt className="mono-label text-dim mb-2.5">Previously</dt>
                <dd className="text-[0.9375rem] text-muted leading-relaxed">
                  {profile.prev.role} at {profile.prev.org}
                  <span className="block text-dim">
                    {profile.prev.period} · {profile.prev.location}
                  </span>
                </dd>
              </Panel>

              <Panel innerClassName="px-5 py-5">
                <dt className="mono-label text-dim mb-2.5">Studying</dt>
                <dd className="text-[0.9375rem] text-muted leading-relaxed">
                  {profile.degree}
                  <span className="block text-dim">
                    {profile.school} · Class of {profile.gradYear}
                  </span>
                </dd>
              </Panel>
            </motion.dl>

            {/* ---- actions ------------------------------------------------- */}
            <motion.div
              {...rise}
              transition={{ duration: 0.8, delay: 0.28, ease: [0.16, 0.9, 0.25, 1] }}
              className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-4"
            >
              <Panel
                as="button"
                type="button"
                size="sm"
                onClick={() => scrollToSection("projects")}
                edge="bg-volt hover:bg-volt-deep transition-colors duration-200"
                fill="bg-volt"
                className="scan-beam-host group"
                innerClassName="inline-flex items-center gap-2.5 px-7 py-3.5 mono-ui font-bold text-ink"
              >
                See the work
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Panel>

              <Panel
                as="a"
                size="sm"
                href={pdf}
                download="Ali_Younes_Resume.pdf"
                edge="bg-ink-line hover:bg-volt transition-colors duration-200"
                fill="bg-ink"
                className="group"
                innerClassName="inline-flex items-center px-7 py-3.5 mono-ui text-muted transition-colors duration-200 group-hover:text-primary"
              >
                Résumé
              </Panel>

              <div className="flex items-center gap-5 sm:ml-4">
                <a
                  href={links.github}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                  className="text-dim hover:text-volt transition-colors"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href={links.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="text-dim hover:text-volt transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href={links.email}
                  aria-label="Email"
                  className="text-dim hover:text-volt transition-colors"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>

          {/* ---- portrait ------------------------------------------------- */}
          {/* Framed like the rest of the chrome rather than dropped in as a
              round avatar, and held at 82% saturation so it sits in the page
              instead of on top of it. Full colour on hover: the one place an
              image reacts to the cursor, which is affordable precisely because
              nothing else here does.

              The registration ticks sit on the two corners the chamfer does
              NOT cut. A tick drawn over a 45° cut reads as a rendering
              mistake; on the square corners it reads as a mark.

              `xl:mr-16` clears the section index in Chrome.jsx, which is
              `fixed right-6` from xl up. The hero is the only block whose
              content runs flush to the right gutter, so it is the only one
              that has to move out of the way. */}
          <motion.figure
            {...rise}
            transition={{ duration: 0.9, delay: 0.36, ease: [0.16, 0.9, 0.25, 1] }}
            className="order-1 lg:order-2 group relative w-40 sm:w-52 lg:w-[17rem] xl:w-[19rem] xl:mr-16 shrink-0"
          >
            {/* `.tick-frame` wraps the plate ONLY, not the whole <figure>. The
                ticks are absolutely positioned against their frame, so with
                the figure as the frame the two bottom marks landed at the
                bottom of the caption instead of the bottom of the photograph,
                reading as stray glyphs in the text rather than as corner
                registration on the image. */}
            <div className="tick-frame relative">
              <Panel
                edge="bg-ink-line group-hover:bg-volt transition-colors duration-300"
                fill="bg-ink-raised"
                innerClassName="relative overflow-hidden"
              >
                {/* The 20px LQIP, scaled up. The frame is never an empty box,
                    even on a cold load. */}
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
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/70 to-transparent"
                />
              </Panel>

              <span className="tick tr" aria-hidden="true" />
              <span className="tick bl" aria-hidden="true" />
            </div>

            {/* No index number here. The Teardown wall numbers its plates
                "01 / 07" because there are seven of them and the reading order
                is non-obvious in a column layout. There is exactly one
                photograph in the hero, so a "01" beside it counts nothing: it
                is the same decorative metadata this page already had stripped
                out once, and at 160px wide it was also shoving the caption
                onto two lines. */}
            <figcaption className="mt-3 mono-micro text-dim">
              {portrait.caption}
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}
