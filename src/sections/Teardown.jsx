// src/sections/Teardown.jsx — the photographs that are not screenshots.
//
// Layout is CSS multi-column, not a grid. The seven photos run from 1022x850
// to 1440x1800; forcing them into fixed grid cells means either cropping them
// all to one ratio or leaving ragged gaps under the short ones. Columns let
// each plate keep its own height and simply stack. The cost is reading order —
// content flows down each column and then across, rather than left-to-right —
// which is the normal contract for a photo wall and is why the numbering is
// rendered explicitly rather than implied by position.
//
// Captions are never hover-gated. A caption that only exists on :hover is a
// caption that does not exist on a phone.
//
// Three of the seven have no caption body at all, by design — see the note in
// src/data/life.js. They carry a title and a date and stop there, because the
// rest needs context only Ali has.
import React from "react";
import { motion } from "framer-motion";
import { teardown } from "../data/life";
import Picture from "../components/Picture";
import Panel from "../components/ui/Panel";
import Glitch from "../components/ui/Glitch";

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
};

export default function Teardown() {
  const total = String(teardown.photos.length).padStart(2, "0");

  return (
    <section
      id={teardown.id}
      className="relative bg-ink border-t border-ink-line grain"
    >
      <div className="gutter pt-24 md:pt-32 pb-24 md:pb-32">
        {/* ---- header ------------------------------------------------------
            Same device as Work: one display word, one sentence under it. */}
        <motion.div
          {...reveal}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <p className="mono-label text-volt mb-4">05 — Teardown</p>
          <Glitch
            as="h2"
            className="font-display uppercase text-display-1 text-primary block"
          >
            {teardown.title}
          </Glitch>
          <p className="mt-6 prose-dark max-w-[60ch]">{teardown.lede}</p>
        </motion.div>

        <div className="edge-rule mt-12 mb-10" aria-hidden="true" />

        {/* ---- the wall ----------------------------------------------------
            `.rail-clear` keeps the third column clear of the section index
            in Chrome.jsx. See the note on that class in index.css for why the
            clearance has to be a margin and not padding. */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 lg:gap-8 rail-clear">
          {teardown.photos.map((p, i) => (
            <motion.figure
              key={p.slug}
              {...reveal}
              transition={{ duration: 0.6, delay: Math.min(i, 3) * 0.05 }}
              // break-inside-avoid keeps a plate from being sliced across a
              // column boundary; without it the caption routinely lands in the
              // next column from its photograph.
              className="group mb-6 lg:mb-8 break-inside-avoid"
            >
              <Panel
                corner="br"
                edge="bg-ink-line group-hover:bg-volt transition-colors duration-300"
                innerClassName="relative overflow-hidden"
              >
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
                             transition-[filter,transform] duration-500 ease-out
                             group-hover:saturate-100 group-hover:scale-[1.015]"
                />
                {/* Index and date ride on the image so the caption below stays
                    prose and nothing else. */}
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3
                                bg-gradient-to-b from-ink/85 to-transparent pointer-events-none">
                  <span className="mono-micro text-dim">
                    {String(i + 1).padStart(2, "0")} / {total}
                  </span>
                  {p.date && (
                    <span className="mono-micro text-dim text-right">{p.date}</span>
                  )}
                </div>
              </Panel>

              <figcaption className="mt-4">
                <h3 className="font-display uppercase font-semibold text-primary text-[1.0625rem] tracking-tight">
                  {p.title}
                </h3>
                {p.body && (
                  <p className="mt-2 prose-dark text-[0.9375rem] leading-[1.65]">
                    {p.body}
                  </p>
                )}
              </figcaption>
            </motion.figure>
          ))}
        </div>

        {/* The rest of it. These used to live in the console's `interests`
            output; the console is an easter egg now, so without this they would
            have left the site with it. */}
        {teardown.notPictured?.length > 0 && (
          <motion.div
            {...reveal}
            transition={{ duration: 0.6 }}
            className="mt-6 grid gap-x-10 gap-y-4 lg:grid-cols-12"
          >
            <h3 className="mono-label text-volt lg:col-span-2 lg:pt-1">
              Not pictured
            </h3>
            <ul className="min-w-0 lg:col-span-10 space-y-3 max-w-[68ch]">
              {teardown.notPictured.map((line) => (
                <li key={line} className="flex gap-4 prose-dark">
                  <span
                    className="mt-[0.7em] h-px w-5 shrink-0 bg-volt/60"
                    aria-hidden="true"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </section>
  );
}
