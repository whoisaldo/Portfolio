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
// caption that does not exist on a phone, and five of these seven photos need
// their sentence to make sense at all.
import React from "react";
import { motion } from "framer-motion";
import { teardown } from "../data/life";
import Picture from "../components/Picture";

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
      className="relative bg-ink border-t border-hud/15 grain"
    >
      <div className="gutter pt-24 md:pt-32 pb-24 md:pb-32">
        {/* ---- header ------------------------------------------------------
            Same device as Work: one display word, one sentence under it. */}
        <motion.div
          {...reveal}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <h2
            className="serif-display text-primary leading-[0.9]"
            style={{ fontSize: "clamp(2.75rem, 7vw, 5.5rem)" }}
          >
            {teardown.title}
          </h2>
          <p className="mt-6 prose-dark max-w-[60ch]">{teardown.lede}</p>
        </motion.div>

        <div className="hud-rule mt-12 mb-10" aria-hidden="true" />

        {/* ---- the wall ----------------------------------------------------
            `xl:mr-20` keeps the third column clear of the section index in
            Chrome.jsx, which is `fixed right-6` from xl up. `.gutter` sets
            padding-inline and is emitted after Tailwind's utilities, so a
            `pr-*` class here would lose to it — the clearance has to be a
            margin. Same reason as the hero portrait. */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 lg:gap-8 xl:mr-20">
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
                             transition-[filter,transform] duration-500 ease-out
                             group-hover:saturate-100 group-hover:scale-[1.015]"
                />
                {/* Index and date ride on the image so the caption below stays
                    prose and nothing else. */}
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3
                                bg-gradient-to-b from-ink/80 to-transparent pointer-events-none">
                  <span className="mono-label text-hud-soft">
                    {String(i + 1).padStart(2, "0")} / {total}
                  </span>
                  {p.date && (
                    <span className="mono-label text-dim text-right">{p.date}</span>
                  )}
                </div>
              </div>

              <figcaption className="mt-4">
                <h3 className="heading-text text-primary text-[1.0625rem]">
                  {p.title}
                </h3>
                <p className="mt-2 prose-dark text-[0.9375rem] leading-[1.65]">
                  {p.body}
                </p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
