// src/components/Experience.jsx - the roles, open.
//
// This was a 483-line accordion. Every row was collapsed by default, so the
// Philips case study, which is the best writing on the site, was invisible
// until someone thought to click a plus sign. It also carried a full inline
// renderer for that case study, which /work/:slug now does better and with
// more room.
//
// So the accordion is gone and the panel renderer went with it. What is left
// is a ledger you can read straight down: who, what, when, the numbers, and a
// link to the long version for the three roles that have one.
//
// Logos sit in the row rather than behind a toggle because they identify the
// entry. They are pre-normalised by `npm run logos`, trimmed to the mark and
// keyed to transparency, so one CSS height gives five logos of equal optical
// weight with no plate and no blend mode.
import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { experiences } from "../data/experience";
import { hasWorkPage } from "../data/work";
import { hexToRgbTriplet } from "../lib/image";

const roleCount = experiences.filter((e) => e.type === "work").length;
const degreeCount = experiences.length - roleCount;

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

export default function Experience() {
  return (
    <section id="experience" className="relative gutter py-28 md:py-36 bg-ink">
      <header className="grid gap-x-10 gap-y-6 lg:grid-cols-12 mb-16 md:mb-20">
        <div className="lg:col-span-3">
          <h2 className="mono-label text-signal-soft">Experience</h2>
          <p className="mono-label text-faint mt-2">
            {roleCount} roles, {degreeCount} degree
          </p>
        </div>
        <p className="lg:col-span-9 serif-display italic text-primary text-2xl md:text-4xl leading-[1.15] max-w-[30ch]">
          Most recent first. Read the Philips one. It took two attempts to get
          right and the first attempt is in there too.
        </p>
      </header>

      <ol className="border-t border-hud/20 xl:mr-20">
        {experiences.map((exp) => (
          <ExperienceRow key={exp.company + exp.period} exp={exp} />
        ))}
      </ol>
    </section>
  );
}

function ExperienceRow({ exp }) {
  return (
    <motion.li
      {...reveal}
      transition={{ duration: 0.55 }}
      className="border-b border-hud/20 py-10 md:py-14"
      style={{ "--accent": hexToRgbTriplet(exp.accent) }}
    >
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-12">
        {/* ---- who ------------------------------------------------------- */}
        <div className="lg:col-span-4">
          <img
            src={exp.logo}
            alt=""
            aria-hidden="true"
            width="132"
            height="56"
            // An explicit height is load-bearing. awslogosvg.svg declares
            // width="100%" with only a viewBox, so it has no intrinsic width
            // and `w-auto h-auto` collapses every logo to 0x0.
            className="h-11 md:h-12 w-auto max-w-[132px] object-contain opacity-95 mb-5"
            style={{ filter: "drop-shadow(0 0 22px rgb(var(--accent) / 0.35))" }}
            loading="lazy"
          />
          <h3 className="serif-display italic text-primary text-2xl md:text-3xl leading-none">
            {exp.company}
          </h3>
          <p className="mt-3 text-sm text-muted">
            {exp.title}
            {exp.badge && (
              <span className="ml-3 mono-label text-ember align-middle">{exp.badge}</span>
            )}
          </p>
          <p className="mt-2 mono-label text-dim">
            {exp.period}
          </p>
          <p className="mt-1 mono-label text-faint">{exp.location}</p>

          {exp.subtitle && (
            <p className="mt-5 pt-5 border-t border-hud/15 text-sm text-muted leading-relaxed">
              {exp.subtitle}
            </p>
          )}
        </div>

        {/* ---- what ------------------------------------------------------ */}
        <div className="lg:col-span-8 min-w-0">
          <p className="prose-dark prose-lede max-w-[62ch]">{exp.description}</p>

          {exp.metrics && (
            <dl
              className={`mt-9 border-y border-hud/20 divide-y divide-hud/15 md:divide-y-0 md:divide-x md:divide-hud/15
                          grid grid-cols-2 ${
                            exp.metrics.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"
                          }`}
            >
              {exp.metrics.map((m) => (
                <div key={m.label} className="px-0 md:px-6 first:md:pl-0 py-6">
                  <dt className="sr-only">{m.label}</dt>
                  <dd>
                    <span
                      className="serif-display block text-2xl md:text-3xl leading-none"
                      style={{ color: "rgb(var(--accent))" }}
                    >
                      {m.value}
                    </span>
                    <span className="mono-label text-dim block mt-2.5">{m.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {exp.coursework && (
            <ul className="mt-8 flex flex-wrap gap-2.5">
              {exp.coursework.map((c) => (
                <li
                  key={c}
                  className="mono-label text-dim border border-hud/20 px-3 py-1.5"
                >
                  {c}
                </li>
              ))}
            </ul>
          )}

          {exp.skills && (
            <ul className="mt-8 flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Stack">
              {exp.skills.map((s) => (
                <li key={s} className="mono-label text-dim">{s}</li>
              ))}
            </ul>
          )}

          {hasWorkPage(exp.slug) && (
            <Link
              to={`/work/${exp.slug}`}
              className="scan-beam-host group mt-9 inline-flex items-center gap-3 px-6 py-3.5
                         mono-ui font-bold border transition-colors"
              style={{ borderColor: "rgb(var(--accent) / 0.55)", color: "rgb(var(--accent))" }}
            >
              {exp.caseStudy ? "Read the case study" : "Read the full write-up"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
    </motion.li>
  );
}
