// src/sections/Stack.jsx: the stack, grouped, with the marks on it.
//
// `skills` has lived in src/data/profile.js this whole time and rendered
// nowhere except inside the terminal easter egg, which meant the answer to the
// most common question a recruiter opens a portfolio with was hidden behind a
// keystroke nobody is told about.
//
// The note in profile.js is worth repeating here, because this is the section
// that would break it: an earlier version rendered ASCII proficiency bars
// (20/20 for TypeScript, 16/20 for C++), which is "React 90%" wearing a
// monospace hat. Self-declared proficiency is not a fact, and this repo only
// prints facts. So these are grouped, never ranked, and there is no meter
// anywhere in this file.
//
// Rust and C++ each appear twice, under Languages and again under Systems.
// That is the data being honest about the fact that a language and the work
// you do in it are different axes, not a duplication bug.
//
// THE MARKS (2026-09-17). This was fifty-five identical grey chips of 10px
// uppercase mono, which is the least scannable way to present the one section
// a reader scans. A logo is recognised before it is read, so every entry now
// carries its own: real single-path marks from simple-icons, baked into
// src/data/stack-icons.js by `npm run icons`, drawn in the brand's own colour
// lifted clear of the carbon ground.
//
// Sixteen entries have no mark. AWS, OpenAI, C#, PowerShell and VS Code were
// removed from simple-icons over trademark policy, and DXGI, Metal,
// VideoToolbox and H.264 are APIs that never had a logo. Those get a monogram
// tile in the chrome colour. Deliberately NOT a redrawn approximation of a
// trademark: a monogram says "no mark", a bad AWS logo says something false.
//
// `--mark` carries the brand colour to CSS so one rule in index.css lights
// fifty-five different hovers without fifty-five Tailwind variants.
import React from "react";
import { motion } from "framer-motion";
import { skills } from "../data/profile";
import { iconFor } from "../data/stack-icons";
import Panel from "../components/ui/Panel";
import Glitch from "../components/ui/Glitch";

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
};

const CHROME = "#7d7b76";

/** One 18px mark: the brand's path where there is one, letters where there
 *  is not. Hidden from the accessibility tree either way, because the name
 *  is right next to it and a screen reader should not hear it twice. */
function Mark({ name }) {
  const icon = iconFor(name);

  if (icon.path) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-[18px] h-[18px] shrink-0 opacity-85 transition-opacity duration-200 group-hover:opacity-100"
        fill="currentColor"
        style={{ color: icon.color }}
        aria-hidden="true"
        focusable="false"
      >
        <path d={icon.path} />
      </svg>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="w-[18px] h-[18px] shrink-0 grid place-items-center border
                 font-mono font-bold leading-none tracking-tight transition-opacity duration-200
                 opacity-75 group-hover:opacity-100"
      style={{
        color: CHROME,
        borderColor: "#3a3a41",
        fontSize: icon.mono.length > 2 ? "0.5rem" : "0.5625rem",
      }}
    >
      {icon.mono}
    </span>
  );
}

export default function Stack() {
  return (
    <section id="stack" className="relative bg-ink">
      <div className="gutter pb-24 md:pb-32">
        <motion.header {...reveal} transition={{ duration: 0.6 }} className="rail-clear">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <div>
              <p className="mono-label text-volt mb-4">04 // Stack</p>
              <Glitch
                as="h2"
                className="font-display uppercase text-display-1 text-primary block"
              >
                Stack
              </Glitch>
            </div>
            <p className="prose-dark max-w-[40ch]">
              Grouped by what it is for, never ranked. No bars and no
              percentages. I can talk about anything on this list, which is the
              whole bar for being on it.
            </p>
          </div>
          <div className="edge-rule mt-10" />
        </motion.header>

        <ul className="mt-12 grid gap-5 items-start md:grid-cols-2 xl:grid-cols-3 rail-clear">
          {skills.map((group, i) => (
            <motion.li
              key={group.group}
              {...reveal}
              transition={{ duration: 0.5, delay: Math.min(i, 3) * 0.05 }}
            >
              {/* Natural height, not `h-full`. Stretching every module to its
                  row left Tools and Frontend with a third of a panel of void
                  under them, which is the same wasted room this pass took out
                  of the Also list. */}
              <Panel edge="bg-ink-line" innerClassName="flex flex-col">
                {/* The module header. Hazard tick, name, count: the same bar
                    the garage bay wears, so the two read as the same machine. */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-line">
                  <span className="hazard h-1.5 w-6 opacity-40 shrink-0" aria-hidden="true" />
                  <h3 className="mono-label text-primary">{group.group}</h3>
                  <span className="mono-micro text-faint tabular-nums ml-auto">
                    {String(group.items.length).padStart(2, "0")}
                  </span>
                </div>

                <ul className="flex flex-wrap gap-1.5 p-4">
                  {group.items.map((item) => {
                    const icon = iconFor(item);
                    return (
                      <Panel
                        as="li"
                        key={item}
                        size="sm"
                        edge="stack-chip"
                        fill="bg-ink"
                        className="group"
                        innerClassName="flex items-center gap-2 pl-2 pr-2.5 py-1.5"
                        style={{ "--mark": icon.color ?? CHROME }}
                      >
                        <Mark name={item} />
                        <span className="text-[0.8125rem] leading-none text-muted transition-colors duration-200 group-hover:text-primary whitespace-nowrap">
                          {item}
                        </span>
                      </Panel>
                    );
                  })}
                </ul>
              </Panel>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
