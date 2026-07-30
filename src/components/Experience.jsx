// src/components/Experience.jsx — the work ledger.
//
// Composition: a wide two-column ledger. Identity (logo, company, period,
// location) is pinned in a narrow left column; everything the reader is
// actually here for runs across a much wider right column. The old version was
// a max-w-5xl accordion hung off a decorative timeline rail down the middle of
// a 1456px viewport, which is a large part of why the page read as one narrow
// ribbon.
//
// Section device: the header IS row zero of the ledger — mono meta in the
// narrow column, the sentence in the wide one, sitting on the same rule every
// row uses. Deliberately the inverse of the projects header (big word left,
// supporting sentence right), so no two sections open the same way.
//
// Why an accordion rather than all-expanded: rendered in full this is roughly
// eight screens, and the Philips case study alone is longer than the other
// four entries combined — expanded by default it would push the education row
// a very long way down. Collapsed rows still carry company, role, dates,
// location, the summary sentence AND the metrics, so the ledger is scannable
// without opening anything; only the deep detail sits behind the toggle. Rows
// open independently (a Set, not a single index) because closing Philips to
// read Northeastern is a pointless forced choice. AWS is open by default
// because it is the current role, and the Philips toggle reads "Read the case
// study" rather than "Details" so the best writing on the site advertises
// itself instead of hiding behind a generic label.
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { experiences } from "../data/experience";
import { hexToRgbTriplet } from "../lib/image";

const accentStyle = { color: "rgb(var(--accent))" };
const accentBg = { backgroundColor: "rgb(var(--accent))" };

const workCount = experiences.filter((e) => e.type === "work").length;
const eduCount = experiences.length - workCount;

/** Skills and coursework render identically — one shape, used twice. */
function LabelledTags({ label, items }) {
  return (
    <div className="grid gap-x-8 gap-y-3 lg:grid-cols-[9rem_minmax(0,1fr)]">
      <h5 className="mono-label text-hud-soft lg:pt-1">{label}</h5>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {items.map((item) => (
          <li key={item} className="mono-label text-dim">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One labelled block inside the case study. Label narrow-left, prose wide-right. */
function Passage({ label, children }) {
  return (
    <div className="grid gap-x-8 gap-y-3 lg:grid-cols-[9rem_minmax(0,1fr)]">
      <h5 className="mono-label text-hud-soft lg:pt-1.5">{label}</h5>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function CaseStudy({ study, company }) {
  return (
    <div className="mt-10 space-y-10 border-t border-hud/20 pt-10">
      <p className="serif-display italic text-primary text-xl md:text-2xl xl:text-[1.75rem] leading-[1.25] max-w-[46ch]">
        {study.tagline}
      </p>

      <Passage label="The problem">
        <p className="font-serif text-muted text-[15px] xl:text-base leading-[1.7] max-w-[78ch]">
          {study.problem}
        </p>
      </Passage>

      {/* The two-attempt arc. A shared rail with a hollow marker on the
          abandoned approach and a filled one on the shipped approach — the
          failure is the point of the story, so it gets equal space rather than
          being folded into a footnote. Stacked, not side-by-side: side-by-side
          reads as a comparison, and this is a sequence. */}
      <Passage label="Two attempts">
        <ol className="space-y-8 border-l border-hud/25 pl-7">
          {study.attempts.map((attempt, i) => {
            const shipped = i === study.attempts.length - 1;
            return (
              <li key={attempt.label} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[33px] top-1.5 h-2.5 w-2.5 border ${
                    shipped ? "border-ok bg-ok" : "border-err"
                  }`}
                />
                <p className={`mono-label ${shipped ? "text-ok" : "text-err"}`}>
                  {attempt.label}
                </p>
                <h6 className="font-serif text-primary text-lg xl:text-xl leading-snug mt-2">
                  {attempt.title}
                </h6>
                <p className="font-serif text-muted text-[15px] leading-[1.7] mt-3 max-w-[78ch]">
                  {attempt.body}
                </p>
              </li>
            );
          })}
        </ol>
      </Passage>

      {/* Breaks the label/prose rhythm on purpose — it is the one line in the
          section that should stop you. */}
      {study.pullQuote && (
        <figure className="border-y border-hud/20 py-9">
          <blockquote className="serif-display italic text-primary text-2xl md:text-3xl xl:text-4xl leading-[1.15] max-w-[26ch]">
            {study.pullQuote}
          </blockquote>
        </figure>
      )}

      <Passage label="Deep dives">
        <div className="border-t border-hud/15">
          {study.deepDives.map((dive) => (
            <details key={dive.title} className="group border-b border-hud/15">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 [&::-webkit-details-marker]:hidden">
                <span className="font-serif text-primary text-lg leading-snug">
                  {dive.title}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-dim transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="font-serif text-muted text-[15px] leading-[1.7] pb-6 max-w-[78ch]">
                {dive.body}
              </p>
            </details>
          ))}
        </div>
      </Passage>

      <Passage label="Outcome">
        <ul className="space-y-3">
          {study.outcome.map((line) => (
            <li
              key={line}
              className="flex gap-4 font-serif text-muted text-[15px] leading-[1.7]"
            >
              <span
                aria-hidden="true"
                className="mt-3 h-px w-4 shrink-0"
                style={accentBg}
              />
              <span className="max-w-[74ch]">{line}</span>
            </li>
          ))}
        </ul>
      </Passage>

      {study.contributor && (
        <Passage label={`Also at ${company}`}>
          <p className="font-serif text-muted text-[15px] leading-[1.7] max-w-[78ch]">
            {study.contributor}
          </p>
        </Passage>
      )}
    </div>
  );
}

export default function Experience() {
  const [openRows, setOpenRows] = useState(() => new Set([0]));

  const toggle = (index) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <section id="experience" className="relative bg-ink">
      <div className="gutter pt-24 md:pt-32 pb-28 md:pb-36">
        <header className="grid gap-x-10 gap-y-5 border-t border-hud/40 pt-7 lg:grid-cols-12">
          <div className="lg:col-span-4 xl:col-span-3">
            <h2 className="mono-label text-hud-soft">Experience</h2>
            <p className="mono-label text-faint mt-3">
              {workCount} roles · {eduCount} degree
            </p>
          </div>
          <p className="serif-display italic text-primary text-3xl md:text-5xl xl:text-6xl leading-[1.05] max-w-[20ch] lg:col-span-8 xl:col-span-9">
            Most recent first. The Philips co-op is the one worth reading — it
            took two attempts to get right.
          </p>
        </header>

        <div>
          {experiences.map((exp, index) => {
            const isOpen = openRows.has(index);
            const panelId = `experience-panel-${index}`;

            return (
              <motion.article
                key={exp.company}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
                style={{ "--accent": hexToRgbTriplet(exp.accent) }}
                className="grid gap-x-10 gap-y-7 border-t border-hud/15 py-10 md:py-12 lg:grid-cols-12"
              >
                {/* ---- identity, narrow column ---------------------------- */}
                <div className="lg:col-span-4 xl:col-span-3">
                  <div className="flex items-center gap-4">
                    <span
                      aria-hidden="true"
                      className="h-10 w-[3px] shrink-0"
                      style={accentBg}
                    />
                    {exp.logo && (
                      <span
                        className={`flex h-14 w-28 items-center justify-center overflow-hidden ${
                          exp.logoPlate ? "bg-bone p-2" : ""
                        }`}
                      >
                        <img
                          src={exp.logo}
                          alt=""
                          width={112}
                          height={56}
                          loading="lazy"
                          decoding="async"
                          className="max-h-full max-w-full object-contain"
                        />
                      </span>
                    )}
                  </div>

                  <h3 className="serif-display italic text-primary text-2xl xl:text-3xl leading-tight mt-5">
                    {exp.company}
                  </h3>

                  <p className="mono-label text-dim mt-4">{exp.period}</p>
                  <p className="mono-label text-faint mt-2">{exp.location}</p>

                  {exp.badge && (
                    <p className="mono-label text-ember mt-4">{exp.badge}</p>
                  )}
                </div>

                {/* ---- detail, wide column -------------------------------- */}
                <div className="min-w-0 lg:col-span-8 xl:col-span-9">
                  <h4 className="font-serif text-primary text-xl xl:text-2xl leading-snug">
                    {exp.title}
                    {exp.subtitle && (
                      <span className="text-dim"> · {exp.subtitle}</span>
                    )}
                  </h4>

                  <p className="font-serif text-muted text-[15px] xl:text-base leading-[1.7] mt-4 max-w-[78ch]">
                    {exp.description}
                  </p>

                  {/* Numbers stay visible when the row is collapsed — a ledger
                      that hides its figures is not a ledger. */}
                  {exp.metrics && (
                    <dl className="flex flex-wrap gap-x-14 gap-y-6 border-t border-hud/15 mt-8 pt-7">
                      {exp.metrics.map((metric) => (
                        <div key={metric.label} className="flex flex-col-reverse">
                          <dt className="mono-label text-faint mt-2.5">
                            {metric.label}
                          </dt>
                          <dd
                            className="serif-display italic text-3xl xl:text-4xl leading-none"
                            style={accentStyle}
                          >
                            {metric.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="group inline-flex items-center gap-3 border border-hud/40 px-5 py-2.5 mt-8
                               mono-label text-muted transition-colors duration-200
                               hover:border-hud-soft hover:text-primary"
                  >
                    {isOpen
                      ? "Hide details"
                      : exp.caseStudy
                        ? "Read the case study"
                        : "Show details"}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        key="panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        {exp.caseStudy && (
                          <CaseStudy
                            study={exp.caseStudy}
                            company={exp.company}
                          />
                        )}

                        {/* Suppressed when a case study is present — the case
                            study already says all of this, at length. */}
                        {exp.highlights && !exp.caseStudy && (
                          <div className="mt-10 border-t border-hud/20 pt-10">
                            <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
                              {exp.highlights.map((h) => (
                                <div key={h.title}>
                                  <h5 className="font-serif text-primary text-lg leading-snug">
                                    {h.title}
                                  </h5>
                                  <p className="font-serif text-muted text-[15px] leading-[1.7] mt-2">
                                    {h.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(exp.skills || exp.coursework) && (
                          <div className="mt-10 space-y-8 border-t border-hud/20 pt-10">
                            {exp.skills && (
                              <LabelledTags label="Stack" items={exp.skills} />
                            )}
                            {exp.coursework && (
                              <LabelledTags
                                label="Coursework"
                                items={exp.coursework}
                              />
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
