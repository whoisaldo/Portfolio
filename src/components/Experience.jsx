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
import { hexToRgbTriplet } from "../lib/image";

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

                {/* The one paragraph everyone reads, so it gets the size of a
                    lede rather than of body copy — and `muted` rather than the
                    old `dim`, which sat at 48% opacity and under 4.5:1. */}
                <p className="lg:col-span-9 font-serif text-muted text-[17px] md:text-xl leading-[1.65] max-w-[68ch]">
                  {exp.description}
                </p>
              </div>

              {/* band 2 — the numbers, as an instrument strip. Four across the
                  full width: in the old 400px track, two-up meant labels like
                  "line + branch on new code" wrapped and collided. */}
              {exp.metrics && (
                <dl
                  className={`mt-14 md:mt-16 pt-10 border-t border-hud/20 grid grid-cols-2 gap-x-10 gap-y-10 ${
                    // Northeastern carries three, everything else four. Hard-coding
                    // four columns left that entry with an empty quarter — the same
                    // hole this pass exists to remove, just smaller.
                    exp.metrics.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"
                  }`}
                >
                  {exp.metrics.map((m) => (
                    <div key={m.label}>
                      <dt
                        className="serif-display italic text-3xl md:text-4xl leading-none"
                        style={{ color: "rgb(var(--accent))" }}
                      >
                        {m.value}
                      </dt>
                      <dd className="mono-label text-faint mt-3">{m.label}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* band 3 — the depth, two-up. Numbered because the section is
                  built as an index, and the numerals give each entry a hard
                  left edge to start from. */}
              {exp.highlights && (
                <ol className="mt-14 md:mt-16 grid gap-x-14 gap-y-12 md:grid-cols-2">
                  {exp.highlights.map((h, i) => (
                    <li key={h.title} className="max-w-[56ch]">
                      <span
                        className="mono-label block mb-3"
                        style={{ color: "rgb(var(--accent) / 0.7)" }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h4 className="text-primary text-base md:text-lg mb-2.5 leading-snug">
                        {h.title}
                      </h4>
                      <p className="font-serif text-muted text-[16px] md:text-[17px] leading-[1.65]">
                        {h.description}
                      </p>
                    </li>
                  ))}
                </ol>
              )}

              {/* band 4 — coursework, as a wrapped row. It was a stacked list
                  in the old right-hand track, which made five short strings
                  five lines tall. */}
              {exp.coursework && (
                <div className="mt-14 md:mt-16">
                  <h4 className="mono-label text-faint mb-5">Coursework</h4>
                  <ul className="flex flex-wrap gap-x-3 gap-y-3">
                    {exp.coursework.map((c) => (
                      <li
                        key={c}
                        className="font-serif text-muted text-[16px] border border-hud/20 px-4 py-2"
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

      <Row label="The problem" className="mb-12">
        <p className="font-serif text-muted text-[16px] md:text-[17px] leading-[1.65]">
          {cs.problem}
        </p>
      </Row>

      <Row label="Two attempts" className="mb-12">
      <ol className="space-y-8">
        {cs.attempts.map((a, i) => {
          const shipped = i === cs.attempts.length - 1;
          return (
            <li key={a.label} className="pl-7 relative">
              <span
                className="absolute left-0 top-[0.45rem] h-2.5 w-2.5"
                style={{
                  backgroundColor: shipped ? "#36d686" : "transparent",
                  border: shipped ? "none" : "1px solid #ff3d64",
                }}
                aria-hidden="true"
              />
              <h5 className="text-primary text-base mb-2">
                <span className="mono-label text-faint mr-3">{a.label}</span>
                {a.title}
              </h5>
              <p className="font-serif text-muted text-[16px] md:text-[17px] leading-[1.65]">
                {a.body}
              </p>
            </li>
          );
        })}
      </ol>
      </Row>

      <blockquote className="border-y border-hud/20 py-8 mb-12">
        <p className="serif-display italic text-primary text-xl md:text-2xl leading-[1.3]">
          {cs.pullQuote}
        </p>
      </blockquote>

      <Row label="Deep dives" className="mb-12">
      <div className="space-y-3">
        {cs.deepDives.map((d) => (
          <details key={d.title} className="group border border-hud/20">
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 text-sm text-muted hover:text-primary transition-colors">
              {d.title}
              <span className="mono-label text-faint group-open:hidden">open</span>
              <span className="mono-label text-faint hidden group-open:inline">close</span>
            </summary>
            <p className="font-serif text-muted text-[16px] md:text-[17px] leading-[1.65] px-5 pb-5">
              {d.body}
            </p>
          </details>
        ))}
      </div>
      </Row>

      <Row label="Outcome" className="mb-12">
        <ul className="space-y-3">
          {cs.outcome.map((o) => (
            <li key={o} className="flex gap-3 text-[16px] text-muted leading-relaxed">
              <span style={{ color: "rgb(var(--accent))" }} aria-hidden="true">—</span>
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </Row>

      <Row label={`Also at ${company}`}>
        <p className="font-serif text-muted text-[16px] md:text-[17px] leading-[1.65]">
          {cs.contributor}
        </p>
      </Row>
    </div>
  );
}
