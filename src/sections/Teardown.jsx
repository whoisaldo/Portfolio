// src/sections/Teardown.jsx: the photographs that are not screenshots.
//
// This was a CSS multi-column wall: plates of wildly different heights flowing
// down three columns, captions tucked underneath at chrome size. Three things
// were wrong with it.
//
//   Reading order. Multi-column flows down each column and then across, so the
//   numbering had to be printed explicitly to tell you where you were. If a
//   layout needs a legend, the layout is the problem.
//
//   No structure. Two different cars, a workbench and two competitions sat
//   adjacent with nothing saying which was which. It read as scatter because
//   it was scatter.
//
//   The captions were the point and were sized like a footnote. They are Ali's
//   own account of each photograph, which is the most interesting thing in the
//   section, and they were set smaller than everything around them.
//
// So: four labelled groups, each with a line of context, and a uniform grid
// inside each. Every plate is the same 4:3 frame, which is what kills the
// ragged-wall effect. Captions are prose at reading size, directly under the
// photograph they describe.
//
// A uniform frame means cropping, and two of the S4 shots are tall phone
// photographs where the car sits nowhere near the middle. `focus` in life.js
// carries a literal Tailwind object-position class per photograph, computed
// from where the subject actually is in that frame rather than picked by eye.
// It is a full class string rather than a keyword because Tailwind scans
// source text: `object-[center_64%]` built by interpolation would never be
// emitted, while the same string sitting in the data file is found.
//
// Captions are never hover-gated. A caption that only exists on :hover is a
// caption that does not exist on a phone.
import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
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
  return (
    <section
      id={teardown.id}
      className="relative bg-ink border-t border-ink-line grain"
    >
      <div className="gutter pt-24 md:pt-32 pb-24 md:pb-32">
        {/* ---- header ---------------------------------------------------- */}
        <motion.div {...reveal} transition={{ duration: 0.7 }} className="rail-clear">
          <p className="mono-label text-volt mb-4">05 // Teardown</p>
          <Glitch
            as="h2"
            className="font-display uppercase text-display-1 text-primary block"
          >
            {teardown.title}
          </Glitch>
          <p className="mt-6 prose-dark max-w-[60ch]">{teardown.lede}</p>
          <div className="edge-rule mt-12" aria-hidden="true" />
        </motion.div>

        {/* ---- the groups ------------------------------------------------ */}
        <div className="mt-14 space-y-16 md:space-y-20 rail-clear">
          {teardown.groups.map((group) => {
            const photos = teardown.photos.filter((p) => p.group === group.id);
            if (!photos.length) return null;

            return (
              <section key={group.id} aria-label={group.label}>
                <header className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pb-5 border-b border-ink-line">
                  <h3 className="font-display uppercase text-display-3 text-primary">
                    {group.label}
                  </h3>
                  <p className="mono-label text-dim">{group.note}</p>
                </header>

                <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((p, i) => (
                    <motion.li
                      key={p.slug}
                      {...reveal}
                      transition={{ duration: 0.5, delay: Math.min(i, 2) * 0.05 }}
                      className="group"
                    >
                      <Panel
                        corner="br"
                        edge="bg-ink-line group-hover:bg-volt transition-colors duration-300"
                        innerClassName="relative aspect-[4/3] overflow-hidden"
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
                          className={`relative w-full h-full object-cover saturate-[0.9]
                                      transition-[filter,transform] duration-500 ease-out
                                      group-hover:saturate-100 group-hover:scale-[1.02]
                                      ${p.focus ?? "object-center"}`}
                        />
                        {p.date && (
                          <span className="absolute top-0 right-0 m-3 mono-micro text-dim
                                           bg-ink/80 px-2 py-1 chamfer chamfer-sm">
                            {p.date}
                          </span>
                        )}
                      </Panel>

                      <figcaption className="mt-4">
                        <h4 className="font-display uppercase font-semibold text-primary text-[1.0625rem] tracking-tight">
                          {p.title}
                        </h4>
                        {p.body && (
                          <p className="mt-2 prose-dark text-[0.9375rem] leading-[1.6]">
                            {p.body}
                          </p>
                        )}
                        {/* A caption that cites something gets to link it. The
                            wrestling result is the only claim in this section
                            a reader can check against a third party, so it
                            carries the source. */}
                        {p.link && (
                          <a
                            href={p.link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-2 mono-micro text-dim
                                       transition-colors hover:text-volt"
                          >
                            <span className="ink-underline">{p.link.label}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </figcaption>
                    </motion.li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
