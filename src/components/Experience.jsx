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
//   Expanded   the depth, one entry at a time, on a ~70ch measure with real
//              room around it.
//
// Logos moved into the expanded panel and out of the index. Two reasons: the
// index is cleaner as pure typography, and these logos cannot share one
// treatment at small size — awslogosvg.svg is `fill="#000000"`, invisible on
// ink without a light plate, while Topchoicerealtylogo.jpeg is opaque with its
// own white ground. One bone plate in the panel is consistent and deliberate;
// the same plate shrunk into a row reads as a sticker.
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
        className="group w-full text-left py-7 md:py-9 grid grid-cols-12 gap-x-6 gap-y-2 items-baseline"
      >
        <span className="col-span-12 md:col-span-4 serif-display italic text-primary text-2xl md:text-3xl leading-none">
          {exp.company}
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
            <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12 pb-14 md:pb-20">
              {/* identity */}
              <div className="lg:col-span-3">
                {/* One bone plate for every logo. The set is heterogeneous —
                    a black-fill SVG, a blue-fill SVG, a red PNG, a JPEG with
                    its own opaque white ground — so no filter or blend mode
                    normalises them; a light plate does. Sized generously
                    because the AWS asset is a cloud glyph with "aws" knocked
                    out of it, which is unreadable much below this. */}
                <span className="inline-flex h-20 w-[132px] items-center justify-center bg-bone px-4 mb-7">
                  <img
                    src={exp.logo}
                    alt={exp.company}
                    width="120"
                    height="56"
                    // An explicit height is load-bearing, not cosmetic:
                    // awslogosvg.svg declares width="100%" with only a viewBox,
                    // so it has no intrinsic width. Under `w-auto h-auto` the
                    // image resolved to 0x0 and every logo silently vanished.
                    // Fixing the height lets the viewBox supply the ratio.
                    className="h-14 w-auto max-w-[104px] object-contain"
                    loading="lazy"
                  />
                </span>
                <dl className="space-y-4">
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
                </dl>
              </div>

              {/* substance, on a readable measure */}
              <div className="lg:col-span-9 max-w-[70ch]">
                <p className="font-serif text-muted text-[15px] md:text-base leading-[1.65]">
                  {exp.description}
                </p>

                {exp.metrics && (
                  <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
                    {exp.metrics.map((m) => (
                      <div key={m.label}>
                        <dt
                          className="serif-display italic text-2xl md:text-3xl leading-none"
                          style={{ color: "rgb(var(--accent))" }}
                        >
                          {m.value}
                        </dt>
                        <dd className="mono-label text-faint mt-2">{m.label}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {exp.caseStudy && <CaseStudy cs={exp.caseStudy} company={exp.company} />}

                {exp.highlights && !exp.caseStudy && (
                  <ul className="mt-10 grid md:grid-cols-2 gap-x-10 gap-y-7">
                    {exp.highlights.map((h) => (
                      <li key={h.title}>
                        <h4 className="text-primary text-sm mb-1.5">{h.title}</h4>
                        <p className="text-sm text-dim leading-relaxed">{h.description}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {exp.coursework && (
                  <div className="mt-10">
                    <h4 className="mono-label text-faint mb-3">Coursework</h4>
                    <ul className="flex flex-wrap gap-x-5 gap-y-2">
                      {exp.coursework.map((c) => (
                        <li key={c} className="text-sm text-dim">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {exp.skills && (
                  <div className="mt-10 pt-7 border-t border-hud/15">
                    <h4 className="mono-label text-faint mb-3">Stack</h4>
                    <ul className="flex flex-wrap gap-x-5 gap-y-2">
                      {exp.skills.map((s) => (
                        <li key={s} className="mono-label text-dim">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

// The two-attempt arc is the point of this entry: the first approach failed,
// and saying so is what makes the second one credible. It gets equal space.
function CaseStudy({ cs, company }) {
  return (
    <div className="mt-12">
      <p className="serif-display italic text-primary text-xl md:text-2xl leading-[1.3] mb-9">
        {cs.tagline}
      </p>

      <h4 className="mono-label text-faint mb-3">The problem</h4>
      <p className="font-serif text-muted text-[15px] leading-[1.65] mb-11">{cs.problem}</p>

      <h4 className="mono-label text-faint mb-6">Two attempts</h4>
      <ol className="space-y-8 mb-11">
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
              <h5 className="text-primary text-sm mb-2">
                <span className="mono-label text-faint mr-3">{a.label}</span>
                {a.title}
              </h5>
              <p className="font-serif text-dim text-[15px] leading-[1.65]">{a.body}</p>
            </li>
          );
        })}
      </ol>

      <blockquote className="border-y border-hud/20 py-8 mb-11">
        <p className="serif-display italic text-primary text-xl md:text-2xl leading-[1.3]">
          {cs.pullQuote}
        </p>
      </blockquote>

      <div className="space-y-3 mb-11">
        {cs.deepDives.map((d) => (
          <details key={d.title} className="group border border-hud/20">
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 text-sm text-muted hover:text-primary transition-colors">
              {d.title}
              <span className="mono-label text-faint group-open:hidden">open</span>
              <span className="mono-label text-faint hidden group-open:inline">close</span>
            </summary>
            <p className="font-serif text-dim text-[15px] leading-[1.65] px-5 pb-5">
              {d.body}
            </p>
          </details>
        ))}
      </div>

      <h4 className="mono-label text-faint mb-4">Outcome</h4>
      <ul className="space-y-3 mb-11">
        {cs.outcome.map((o) => (
          <li key={o} className="flex gap-3 text-sm text-muted leading-relaxed">
            <span style={{ color: "rgb(var(--accent))" }} aria-hidden="true">—</span>
            <span>{o}</span>
          </li>
        ))}
      </ul>

      <h4 className="mono-label text-faint mb-3">Also at {company}</h4>
      <p className="font-serif text-dim text-[15px] leading-[1.65]">{cs.contributor}</p>
    </div>
  );
}
