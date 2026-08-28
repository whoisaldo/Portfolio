// src/components/Experience.jsx — the service record, as an index that opens.
//
// The previous pass kept each collapsed row carrying its summary sentence AND
// its metrics, reasoning that this made the ledger scannable without opening
// anything. In practice it put five roles' worth of prose, four metric grids
// and five toggles on screen at once: wide became dense, and the section read
// as a wall. This version inverts the ratio.
//
//   Collapsed  company, role, period. Nothing else. Five rows you can scan in
//              a couple of seconds, which is what anyone does first. All closed
//              by default — the opener already says which one is worth reading.
//   Expanded   the depth, one entry at a time, as full-width horizontal bands
//              (lede → numbers → highlights → coursework → case study). See the
//              note on the panel itself for why bands replaced parallel
//              columns; the short version is that columns of very different
//              lengths left most of the row empty.
//
// Prose in here sits at 16-17px in `text-muted`, not 15px in `text-dim`. The
// old pairing computed to roughly 4.2:1 against the ink ground — under the AA
// floor for body text, and the section's most common complaint.
//
// Logos sit in the index row, not behind the toggle — they identify the entry,
// so they have to be there before anything is opened. They are rendered with
// no plate and no blend mode because the assets are pre-normalised by
// `npm run logos` (trimmed to the mark, keyed to transparency). An earlier pass
// put them on a bone plate, which was solving a problem the assets did not
// have: the three opaque ones ship a #000 ground, not a white one.
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { experiences } from "../data/experience";
import { workPhotos } from "../data/life";
import { hexToRgbTriplet } from "../lib/image";
import Picture from "./Picture";

const roleCount = experiences.filter((e) => e.type === "work").length;
const degreeCount = experiences.length - roleCount;

export default function Experience() {
  const [open, setOpen] = useState(() => new Set());

  // Rows open independently: closing Philips to read Northeastern would be a
  // pointless forced choice.
  const toggle = (i) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section id="experience" className="relative gutter py-28 md:py-36 bg-ink">
      {/* Section device: a mono label out in the margin against a display
          sentence — the inverse of the projects opener, which puts the big word
          left and the supporting sentence right. No two sections open alike. */}
      <header className="grid gap-x-10 gap-y-6 lg:grid-cols-12 mb-16 md:mb-20">
        <div className="lg:col-span-3">
          <h2 className="mono-label text-signal-soft">Experience</h2>
          <p className="mono-label text-faint mt-2">
            {roleCount} roles · {degreeCount} degree
          </p>
        </div>
        <p className="lg:col-span-9 serif-display italic text-primary text-2xl md:text-4xl leading-[1.15] max-w-[30ch]">
          Most recent first. The Philips co-op is the one worth reading — it
          took two attempts to get right.
        </p>
      </header>

      <ol className="border-t border-hud/20">
        {experiences.map((exp, i) => (
          <ExperienceRow
            key={exp.company + exp.period}
            exp={exp}
            isOpen={open.has(i)}
            onToggle={() => toggle(i)}
          />
        ))}
      </ol>
    </section>
  );
}

function ExperienceRow({ exp, isOpen, onToggle }) {
  const panelId = `exp-${exp.company.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <li className="border-b border-hud/20" style={{ "--accent": hexToRgbTriplet(exp.accent) }}>
      {/* ---- index row ---------------------------------------------------- */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="group w-full text-left py-7 md:py-9 grid grid-cols-12 gap-x-6 gap-y-3 items-center"
      >
        <span className="col-span-12 md:col-span-4 flex items-center gap-5">
          {/* No plate, no blend mode. The logos are pre-normalised by
              `npm run logos`: trimmed to the mark so all five carry the same
              optical weight at one height, and keyed to transparency so the
              three assets that shipped an opaque #000 ground no longer need
              anything painted behind them. */}
          <img
            src={exp.logo}
            alt=""
            aria-hidden="true"
            width="132"
            height="56"
            // An explicit height is load-bearing: awslogosvg.svg declares
            // width="100%" with only a viewBox, so it has no intrinsic width
            // and `w-auto h-auto` collapsed every logo to 0x0.
            className="h-12 md:h-14 w-auto max-w-[132px] shrink-0 object-contain opacity-95
                       transition-all duration-300 group-hover:opacity-100"
            style={{ filter: "drop-shadow(0 0 22px rgb(var(--accent) / 0.35))" }}
            loading="lazy"
          />
          <span className="serif-display italic text-primary text-2xl md:text-3xl leading-none">
            {exp.company}
          </span>
        </span>

        <span className="col-span-12 md:col-span-5 text-sm text-muted">
          {exp.title}
          {exp.badge && (
            <span className="ml-3 mono-label text-ember align-middle">{exp.badge}</span>
          )}
        </span>

        <span className="col-span-9 md:col-span-2 mono-label text-dim">{exp.period}</span>

        <span className="col-span-3 md:col-span-1 flex justify-end">
          <span
            className="inline-flex h-7 w-7 items-center justify-center border transition-colors duration-200 group-hover:border-hud-soft"
            style={{
              borderColor: isOpen ? "rgb(var(--accent))" : "rgb(109 95 168 / 0.35)",
              color: isOpen ? "rgb(var(--accent))" : undefined,
            }}
          >
            {isOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          </span>
        </span>
      </button>

      {/* ---- detail ------------------------------------------------------- */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            {/* Horizontal bands, not parallel columns.

                The previous pass ran identity / narrative / supporting-block as
                three independent tracks. They carry very different amounts of
                text, so they ended at very different heights: the rail and the
                paragraph stopped around 700px while the right-hand track — four
                highlights stacked in the narrowest column on the row — ran past
                1400px. Everything below the paragraph was an L-shaped void
                across two thirds of the width, and the column holding the most
                words was the one with the least room to hold them.

                Reading top to bottom instead fixes both. Each band owns the
                full width and is sized to its own content: the lede sets a
                readable measure, the numbers spread into a strip instead of
                stacking 2x2 in a gutter, and the highlights run two-up so four
                of them are two rows deep rather than four. Nothing sits in a
                narrow track while a wide one holds nothing. */}
            <div className="pb-16 md:pb-24">
              {/* band 1 — identity rail + the lede. The logo is in the index
                  row, since it identifies the entry and must be visible before
                  any click. */}
              <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
                <div className="lg:col-span-3">
                  <dl className="space-y-5">
                    {exp.subtitle && (
                      <div>
                        <dt className="mono-label text-faint mb-1.5">Focus</dt>
                        <dd className="text-sm text-muted leading-relaxed">{exp.subtitle}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="mono-label text-faint mb-1.5">Where</dt>
                      <dd className="text-sm text-muted">{exp.location}</dd>
                    </div>
                    {exp.skills && (
                      <div className="pt-5 border-t border-hud/15">
                        <dt className="mono-label text-faint mb-2.5">Stack</dt>
                        <dd>
                          <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
                            {exp.skills.map((s) => (
                              <li key={s} className="mono-label text-dim">{s}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* The one paragraph everyone reads, so it is set as a lede. */}
                <p className="lg:col-span-9 prose-dark prose-lede max-w-[62ch]">
                  {exp.description}
                </p>
              </div>

              {/* band 2 — the numbers, as an instrument strip. Hairline
                  dividers rather than four figures floating in a row: the
                  rules are what make it read as one panel instead of four
                  unrelated statistics. */}
              {exp.metrics && (
                <dl
                  className={`mt-12 md:mt-14 border-y border-hud/20 divide-y divide-hud/15 md:divide-y-0 md:divide-x md:divide-hud/15 grid grid-cols-1 sm:grid-cols-2 ${
                    // Northeastern carries three, everything else four. Hard-coding
                    // four columns left that entry with an empty quarter — the same
                    // hole this pass exists to remove, just smaller.
                    exp.metrics.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"
                  }`}
                >
                  {exp.metrics.map((m) => (
                    <div key={m.label} className="px-0 md:px-8 first:md:pl-0 py-7 md:py-8">
                      <dt
                        className="serif-display italic text-3xl md:text-[2.75rem] leading-none"
                        style={{ color: "rgb(var(--accent))" }}
                      >
                        {m.value}
                      </dt>
                      <dd className="mono-label text-dim mt-3.5">{m.label}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* band 3 — the depth, two-up on real surfaces.

                  These were bare paragraphs sitting directly on the page
                  ground, which is most of why the panel read as unstyled text
                  rather than as an interface: nothing contained them, so the
                  space around them was void rather than margin. On a raised
                  card each one fills its cell, and the rule under the numeral
                  gives the block an internal edge to hang from. */}
              {exp.highlights && (
                <ol className="mt-12 md:mt-14 grid gap-5 md:grid-cols-2">
                  {exp.highlights.map((h, i) => (
                    <li
                      key={h.title}
                      className="border border-hud/20 bg-ink-raised/50 p-7 md:p-9"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <span
                          className="mono-label"
                          style={{ color: "rgb(var(--accent))" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="h-px flex-1 bg-hud/20" aria-hidden="true" />
                      </div>
                      <h4 className="heading-text text-primary text-lg md:text-xl mb-3.5 leading-snug">
                        {h.title}
                      </h4>
                      <p className="prose-dark">{h.description}</p>
                    </li>
                  ))}
                </ol>
              )}

              {/* band 3b — photographs, where the entry has any.
                  Keyed by company in src/data/life.js, so an entry with no
                  photos renders exactly as it did before. These sit after the
                  highlights on purpose: for the AWS row the Kiro still is
                  evidence for highlight 04, and evidence belongs after the
                  claim rather than in front of it. */}
              {workPhotos[exp.company] && (
                <ul className="mt-12 md:mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {workPhotos[exp.company].map((p) => (
                    <li key={p.caption} className="group">
                      <div className="relative overflow-hidden border border-hud/20 bg-ink-raised">
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url("${p.image.lqip}")` }}
                        />
                        <Picture
                          sources={p.image}
                          alt={p.alt}
                          loading="lazy"
                          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                          className="relative w-full h-auto saturate-[0.85]
                                     transition-[filter] duration-500 group-hover:saturate-100"
                        />
                      </div>
                      <p className="mt-3 mono-label text-dim">{p.caption}</p>
                      {p.note && (
                        <p className="mt-2 prose-dark text-[0.9375rem] leading-[1.6]">
                          {p.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* band 4 — coursework, as a wrapped row. It was a stacked list
                  in the old right-hand track, which made five short strings
                  five lines tall. */}
              {exp.coursework && (
                <div className="mt-12 md:mt-14">
                  <h4 className="mono-label text-faint mb-5">Coursework</h4>
                  <ul className="flex flex-wrap gap-3">
                    {exp.coursework.map((c) => (
                      <li
                        key={c}
                        className="prose-dark border border-hud/20 bg-ink-raised/50 px-5 py-3"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* band 5 — long-form. Full width on purpose: the measure is set
                  per row inside, so the labels can sit out in the margin. */}
              {exp.caseStudy && (
                <div className="mt-14 md:mt-16">
                  <CaseStudy cs={exp.caseStudy} company={exp.company} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

// One row of the case study: its label sits out in the margin, the content
// runs in a fixed column beside it. Same device as the section opener, and it
// is why the case study no longer hugs the left edge with a third of the row
// empty next to it — prose still gets a ~70ch measure, but the space beside it
// now reads as a margin holding the labels rather than as a gap.
function Row({ label, children, className = "" }) {
  return (
    <div className={`grid gap-x-10 gap-y-3 lg:grid-cols-12 ${className}`}>
      <h4 className="mono-label text-faint lg:col-span-3 lg:pt-1">{label}</h4>
      <div className="lg:col-span-9 max-w-[70ch]">{children}</div>
    </div>
  );
}

// The two-attempt arc is the point of this entry: the first approach failed,
// and saying so is what makes the second one credible. It gets equal space.
function CaseStudy({ cs, company }) {
  return (
    <div>
      <p className="serif-display italic text-primary text-xl md:text-2xl leading-[1.3] mb-12 max-w-[46ch]">
        {cs.tagline}
      </p>

      <Row label="The problem" className="mb-14">
        <p className="prose-dark">{cs.problem}</p>
      </Row>

      {/* Side by side rather than stacked. The two attempts are the argument
          of this entry — one abandoned, one shipped — and putting them in a
          row lets the pair be compared at a glance instead of remembered
          across a scroll. It also gives the widest band on the panel real
          content to occupy. */}
      <div className="mb-14">
        <h4 className="mono-label text-faint mb-5">Two attempts</h4>
        <ol className="grid gap-5 lg:grid-cols-2">
          {cs.attempts.map((a, i) => {
            const shipped = i === cs.attempts.length - 1;
            const status = shipped ? "#36d686" : "#ff3d64";
            return (
              <li
                key={a.label}
                className="border border-hud/20 bg-ink-raised/50 p-7 md:p-9 border-t-2"
                style={{ borderTopColor: status }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span
                    className="h-2 w-2 shrink-0"
                    style={{
                      backgroundColor: shipped ? status : "transparent",
                      border: shipped ? "none" : `1px solid ${status}`,
                    }}
                    aria-hidden="true"
                  />
                  <span className="mono-label" style={{ color: status }}>
                    {a.label} · {shipped ? "Shipped" : "Abandoned"}
                  </span>
                </div>
                <h5 className="heading-text text-primary text-lg md:text-xl mb-3.5 leading-snug">
                  {a.title}
                </h5>
                <p className="prose-dark">{a.body}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <blockquote className="border-y border-hud/20 py-8 mb-12">
        <p className="serif-display italic text-primary text-xl md:text-2xl leading-[1.3]">
          {cs.pullQuote}
        </p>
      </blockquote>

      <div className="mb-14">
        <h4 className="mono-label text-faint mb-5">Deep dives</h4>
        <div className="grid gap-4 lg:grid-cols-2">
          {cs.deepDives.map((d) => (
            <details
              key={d.title}
              className="group border border-hud/20 bg-ink-raised/50 open:bg-ink-raised"
            >
              <summary className="cursor-pointer list-none px-7 py-5 flex items-center justify-between gap-4 heading-text text-primary text-base hover:text-signal-soft transition-colors">
                {d.title}
                <span className="mono-label text-faint shrink-0 group-open:hidden">open</span>
                <span className="mono-label text-faint shrink-0 hidden group-open:inline">
                  close
                </span>
              </summary>
              <p className="prose-dark px-7 pb-7">{d.body}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Two-up: four one-line results stacked in a column left three quarters
          of the band empty beside them. */}
      <div className="mb-14">
        <h4 className="mono-label text-faint mb-5">Outcome</h4>
        <ul className="grid gap-x-10 gap-y-4 lg:grid-cols-2">
          {cs.outcome.map((o) => (
            <li key={o} className="flex gap-3.5 prose-dark">
              <span
                className="shrink-0 pt-[0.42em]"
                style={{ color: "rgb(var(--accent))" }}
                aria-hidden="true"
              >
                <span className="block h-px w-4 bg-current" />
              </span>
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </div>

      <Row label={`Also at ${company}`}>
        <p className="prose-dark">{cs.contributor}</p>
      </Row>
    </div>
  );
}
