// src/sections/Stack.jsx — the stack, grouped.
//
// `skills` has lived in src/data/profile.js this whole time and rendered
// nowhere except inside the terminal easter egg, which meant the answer to the
// most common question a recruiter opens a portfolio with was hidden behind a
// keystroke nobody is told about.
//
// The note in profile.js is worth repeating here, because this is the section
// that would break it: an earlier version rendered ASCII proficiency bars —
// 20/20 for TypeScript, 16/20 for C++ — which is "React 90%" wearing a
// monospace hat. Self-declared proficiency is not a fact, and this repo only
// prints facts. So these are grouped, never ranked, and there is no meter
// anywhere in this file.
//
// Rust and C++ each appear twice, under Languages and again under Systems.
// That is the data being honest about the fact that a language and the work
// you do in it are different axes, not a duplication bug.
import React from "react";
import { motion } from "framer-motion";
import { skills } from "../data/profile";
import Panel from "../components/ui/Panel";
import Glitch from "../components/ui/Glitch";

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
};

export default function Stack() {
  return (
    <section id="stack" className="relative bg-ink">
      <div className="gutter pb-24 md:pb-32">
        <motion.header {...reveal} transition={{ duration: 0.6 }} className="rail-clear">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <div>
              <p className="mono-label text-volt mb-4">04 — Stack</p>
              <Glitch
                as="h2"
                className="font-display uppercase text-display-1 text-primary block"
              >
                Stack
              </Glitch>
            </div>
            <p className="prose-dark max-w-[38ch]">
              Grouped by what it is for, not ranked. Nothing here has a
              percentage next to it on purpose.
            </p>
          </div>
          <div className="edge-rule mt-10" />
        </motion.header>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 rail-clear">
          {skills.map((group, i) => (
            <motion.li
              key={group.group}
              {...reveal}
              transition={{ duration: 0.5, delay: Math.min(i, 3) * 0.05 }}
              className="h-full"
            >
              <Panel
                className="group h-full"
                edge="bg-ink-line hover:bg-volt transition-colors duration-300"
                innerClassName="flex flex-col p-6 h-full"
              >
                <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-ink-line">
                  <h3 className="mono-label text-primary transition-colors duration-200 group-hover:text-volt">
                    {group.group}
                  </h3>
                  <span className="mono-micro text-faint">
                    {String(group.items.length).padStart(2, "0")}
                  </span>
                </div>

                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="chamfer chamfer-sm bg-ink px-2.5 py-1.5 mono-micro text-muted"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </Panel>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
