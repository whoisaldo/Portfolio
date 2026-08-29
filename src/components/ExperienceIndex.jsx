// src/components/ExperienceIndex.jsx: the roles, as files you open.
//
// History of this section, because it explains the shape:
//
//   v1  a 483-line accordion. Every row collapsed by default, so the Philips
//       case study, the best writing on the site, was invisible until
//       someone thought to click a plus sign.
//   v2  a flat ledger you read straight down. Better, but it buried the way
//       in: the only route to a detail page was a text link at the end of a
//       long row, and only three of the five rows had one at all.
//   v3  this. Five cards, five destinations, and the affordance is the whole
//       card rather than a link inside it.
//
// The hierarchy is deliberate rather than decorative. The current role gets a
// full-width card with its lede and all four numbers; the rest share a
// two-column grid. A reader scanning for "what is he doing now" should not
// have to compare five equal boxes to find out.
//
// Logos sit in the card because they identify the entry faster than the name
// does. They are pre-normalised by `npm run logos`, trimmed to the mark and
// keyed to transparency, so one CSS height gives five logos of equal optical
// weight with no plate and no blend mode.
//
// `--accent` here is the company's REAL brand colour, unlike the project grid
// where it encodes status. AWS orange, Philips blue and Northeastern red are
// identity; changing them to fit a palette would be changing a fact.
import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { experiences } from "../data/experience";
import { hasWorkPage } from "../data/work";
import { hexToRgbTriplet } from "../lib/image";
import Panel from "./ui/Panel";
import Glitch from "./ui/Glitch";

const roleCount = experiences.filter((e) => e.type === "work").length;
const degreeCount = experiences.length - roleCount;

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

export default function ExperienceIndex() {
  const [current, ...rest] = experiences;

  return (
    <section id="experience" className="relative gutter py-28 md:py-36 bg-ink">
      <header className="rail-clear mb-14 md:mb-16">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div>
            <p className="mono-label text-volt mb-4">02 // Experience</p>
            <Glitch
              as="h2"
              className="font-display uppercase text-display-1 text-primary block"
            >
              Experience
            </Glitch>
          </div>
          <div className="max-w-[42ch]">
            <p className="prose-dark">
              Most recent first. Read the Philips one. It took two attempts to
              get right and the first attempt is in there too.
            </p>
            <p className="mono-label text-dim mt-4">
              {roleCount} roles · {degreeCount} degree · every one opens
            </p>
          </div>
        </div>
        <div className="edge-rule mt-10" />
      </header>

      {/* One grid, five list items. The featured card spans both columns
          rather than living in a wrapper of its own, so the list a screen
          reader announces has five entries in it and not two. */}
      <ol className="grid gap-5 lg:grid-cols-2 rail-clear">
        <ExperienceCard exp={current} index={0} featured />
        {rest.map((exp, i) => (
          <ExperienceCard
            key={exp.company + exp.period}
            exp={exp}
            index={i + 1}
          />
        ))}
      </ol>
    </section>
  );
}

function ExperienceCard({ exp, index, featured = false }) {
  const openable = hasWorkPage(exp.slug);
  // Four numbers is right for the featured card and too many for a half-width
  // one, where they would wrap to two cramped rows.
  const metrics = exp.metrics?.slice(0, featured ? 4 : 2);

  const body = (
    <>
      <div className="flex items-start justify-between gap-6">
        <img
          src={exp.logo}
          alt=""
          aria-hidden="true"
          width="132"
          height="56"
          // An explicit height is load-bearing. awslogosvg.svg declares
          // width="100%" with only a viewBox, so it has no intrinsic width and
          // `w-auto h-auto` collapses every logo to 0x0.
          className="h-10 md:h-11 w-auto max-w-[132px] object-contain opacity-95"
          loading="lazy"
        />
        <div className="flex items-center gap-3 shrink-0">
          {exp.badge && (
            <span className="chamfer chamfer-sm mono-micro px-2 py-1 bg-volt text-ink font-bold">
              {exp.badge}
            </span>
          )}
          <span className="mono-micro text-faint">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>

      <h3
        className={`mt-6 font-display uppercase text-primary transition-colors duration-200 ${
          featured ? "text-display-2" : "text-display-3"
        } ${openable ? "group-hover:text-accent" : ""}`}
      >
        {exp.company}
      </h3>

      <p className="mt-2.5 text-[0.9375rem] text-muted leading-snug">{exp.title}</p>
      {exp.subtitle && (
        <p className="mt-1.5 mono-micro text-dim">{exp.subtitle}</p>
      )}

      <p className="mt-4 mono-label text-dim">
        {exp.period} · <span className="text-faint">{exp.location}</span>
      </p>

      {featured && (
        <p className="prose-dark prose-lede mt-7 max-w-[62ch]">
          {exp.description}
        </p>
      )}

      {metrics && (
        <dl
          className={`mt-7 grid gap-px bg-ink-line border-y border-ink-line ${
            featured ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"
          }`}
        >
          {metrics.map((m) => (
            <div key={m.label} className="bg-ink-raised px-4 py-5">
              <dt className="sr-only">{m.label}</dt>
              <dd>
                <span
                  className="font-display font-bold block text-xl md:text-2xl leading-none"
                  style={{ color: "rgb(var(--accent))" }}
                >
                  {m.value}
                </span>
                <span className="mono-micro text-dim block mt-2.5">{m.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {exp.coursework && !featured && (
        <ul className="mt-6 flex flex-wrap gap-1.5">
          {exp.coursework.slice(0, 3).map((c) => (
            <li key={c} className="mono-micro text-dim chamfer chamfer-sm bg-ink px-2.5 py-1.5">
              {c}
            </li>
          ))}
          {exp.coursework.length > 3 && (
            <li className="mono-micro text-faint self-center px-1">
              +{exp.coursework.length - 3}
            </li>
          )}
        </ul>
      )}

      {/* The affordance. It is the same width as the card's content and sits
          at the bottom of every card, so "this opens" is answered in the same
          place five times rather than five different places. */}
      {openable && (
        // `mt-auto` pins this to the bottom of the card. Two cards side by
        // side hold different amounts of copy, and an affordance that floats
        // at the end of the text lands at a different height in each one,
        // which is exactly the inconsistency that made the previous version's
        // click target hard to find.
        <span className="mt-auto block pt-8">
          <span className="flex items-center justify-between gap-4 border-t border-ink-line pt-5">
            <span className="mono-ui font-bold text-accent">
              {exp.caseStudy ? "Read the case study" : "Open the full file"}
            </span>
            <ArrowUpRight
              className="w-4 h-4 shrink-0 text-accent transition-transform duration-200
                         group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </span>
      )}
    </>
  );

  const shell = (
    <Panel
      as={openable ? Link : "div"}
      {...(openable ? { to: `/work/${exp.slug}` } : {})}
      edge={
        openable
          ? "bg-ink-line hover:bg-accent focus-visible:bg-accent transition-colors duration-300"
          : "bg-ink-line"
      }
      fill="bg-ink-raised"
      className={`group block h-full ${openable ? "focus-visible:outline-none" : ""}`}
      innerClassName={`flex flex-col p-6 md:p-8 ${featured ? "lg:p-10" : ""}`}
    >
      {body}
    </Panel>
  );

  return (
    <motion.li
      {...reveal}
      transition={{ duration: 0.5, delay: Math.min(index, 3) * 0.05 }}
      style={{ "--accent": hexToRgbTriplet(exp.accent) }}
      className={`h-full ${featured ? "lg:col-span-2" : ""}`}
    >
      {shell}
    </motion.li>
  );
}
