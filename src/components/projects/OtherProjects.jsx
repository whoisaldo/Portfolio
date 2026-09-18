// src/components/projects/OtherProjects.jsx: the auxiliary index.
//
// A wide multi-column list rather than the narrow accordion stack it replaced.
// These are small things and the layout should say so: no images, no per-row
// hover recipe, just a scannable index.
//
// These get no chamfered panel each. Seven chamfers in a row would flatten the
// distinction between this list and the eight things above it that actually
// carry a case study, and the whole job of this section is to read as smaller.
//
// COLLAPSED BY DEFAULT (2026-09-17). Seven cells in a three-up grid ran to
// three rows and about a screen and a half of a page that had already made its
// case above. A coursework repo does not get to take the same room as Eternal
// Monitor. One row shows, the rest are one button away, and the button says
// how many are behind it so nobody has to guess whether it is worth pressing.
//
// The hidden items are removed from the DOM rather than hidden with CSS. A
// `hidden` attribute would keep seven links in the tab order and seven items
// in the list a screen reader announces, which is the same problem in a
// quieter form.
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Plus, Minus } from "lucide-react";

// One row at the widest breakpoint. Below that the grid is two-up or one-up
// and three cells is still the smallest useful sample.
const COLLAPSED = 3;

export default function OtherProjects({ projects, startIndex = 0 }) {
  const [open, setOpen] = useState(false);
  const shown = open ? projects : projects.slice(0, COLLAPSED);
  const hidden = projects.length - COLLAPSED;

  // No bottom padding at all. This block used to carry pb-36, which reserved
  // a screenful under a list that is now three cells tall, and the gap read as
  // a rendering fault rather than as breathing room. Experience opens with its
  // own py-28/py-36 immediately below, which is the whole section break; a
  // second one stacked on top of it is what was wrong.
  return (
    <div className="gutter pt-24 md:pt-32">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-10">
        <h2 className="font-display uppercase text-primary text-2xl md:text-3xl font-semibold">
          Also
        </h2>
        <span className="mono-label text-dim">
          coursework · experiments · tools
        </span>
        <span className="mono-micro text-faint tabular-nums ml-auto">
          {String(projects.length).padStart(2, "0")}
        </span>
      </div>

      {/* Hairlines come from a border on each cell, not from `gap-px` over a
          tinted container. The old technique draws the rules by letting the
          container's background show through one-pixel gaps, which works only
          while the last row is full: with seven items in a three-up grid the
          two unfilled cells showed that background as a solid lighter block. */}
      <ul
        id="also-list"
        className="grid border-t border-l border-ink-line sm:grid-cols-2 xl:grid-cols-3 rail-clear"
      >
        {shown.map((p, i) => (
          // The first three are static. Anything past them arrived because
          // the reader asked for it, so it fades up rather than appearing
          // fully formed, staggered off its own position in the row.
          //
          // Deliberately NOT a height animation on the container: this is a
          // responsive grid whose row count changes with the breakpoint, so
          // an animated height is a measured number that is wrong at every
          // size but the one it was measured at. The grid reflows instantly
          // and the cells catch up, which is the cheap, correct version.
          <motion.li
            key={p.title}
            className="bg-ink border-r border-b border-ink-line"
            initial={i < COLLAPSED ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.32,
              delay: Math.max(0, i - COLLAPSED) * 0.05,
              ease: [0.16, 0.9, 0.25, 1],
            }}
          >
            <a
              href={p.github}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full flex-col gap-3 p-6 transition-colors hover:bg-ink-raised"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="mono-micro text-faint tabular-nums">
                  {String(startIndex + i + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-faint transition-all group-hover:text-volt group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <h3 className="font-display uppercase text-display-3 text-primary transition-colors group-hover:text-volt">
                {p.title}
              </h3>
              <p className="prose-dark grow text-[0.9375rem] leading-[1.6]">
                {p.description}
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {p.tech.map((t) => (
                  <li key={t} className="mono-micro text-dim">{t}</li>
                ))}
              </ul>
            </a>
          </motion.li>
        ))}
      </ul>

      {/* The control sits under the grid and spans it, so it reads as the last
          row of the list rather than as a stray button beside it. It carries
          the same hairline the cells do, which is what makes the join
          continuous. */}
      {hidden > 0 && (
        <div className="border-b border-x border-ink-line rail-clear -mt-px">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="also-list"
            className="group w-full flex items-center justify-center gap-3 px-6 py-4
                       mono-ui text-dim transition-colors hover:bg-ink-raised hover:text-volt
                       focus-visible:bg-ink-raised focus-visible:text-volt"
          >
            {open ? (
              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {open ? "Show fewer" : `Show ${hidden} more`}
          </button>
        </div>
      )}
    </div>
  );
}
