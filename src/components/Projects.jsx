// src/components/Projects.jsx
import React from "react";
import { motion } from "framer-motion";
import MotionSection from "./MotionSection";

const projects = [
  {
    title: "Portfolio",
    blurb: "This site — Vite + React + Tailwind, resume embed, routing, and deploy.",
    tech: ["React", "Vite", "Tailwind"],
    gh: "https://github.com/whoisaldo/Portfolio",
    live: "",
  },
  {
    title: "Exerly-Fitness",
    blurb: "Gym/health tracker: workouts, calories, sleep, auth, dashboards.",
    tech: ["React", "Node", "MongoDB"],
    gh: "https://github.com/whoisaldo/Exerly-Fitness",
  },
  {
    title: "CS3520-Summer-2025",
    blurb: "C++ coursework: nested containers, Makefiles, GDB, CLI formatting.",
    tech: ["C++", "GDB", "Makefile"],
    gh: "https://github.com/whoisaldo/CS3520-Summer-2025",
  },
  {
    title: "Password-Generator",
    blurb: "Configurable generator across Java + Swift experiments.",
    tech: ["Java", "Swift"],
    gh: "https://github.com/whoisaldo/Password-Generator",
  },
  {
    title: "Grade-Calculator",
    blurb: "Weighted categories, simple desktop UI, export support.",
    tech: ["Java", "GUI"],
    gh: "https://github.com/whoisaldo/Grade-Calculator",
  },
];

export default function Projects() {
  return (
    <MotionSection id="projects" className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="font-display text-3xl font-bold">Featured Projects</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        A few things I’ve built and shipped.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {projects.map((p) => (
          <motion.article
            key={p.title}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className="group rounded-2xl border border-black/5 dark:border-white/10
                       bg-white/80 dark:bg-neutral-900/60 backdrop-blur p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                {p.tech.slice(0, 3).join(" • ")}
              </div>
            </div>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{p.blurb}</p>

            <div className="mt-4 flex gap-4 text-sm">
              <a className="text-indigo-600 hover:underline" href={p.gh} target="_blank" rel="noreferrer">
                GitHub →
              </a>
              {p.live && (
                <a className="text-indigo-600 hover:underline" href={p.live} target="_blank" rel="noreferrer">
                  Live →
                </a>
              )}
            </div>
          </motion.article>
        ))}
      </div>
    </MotionSection>
  );
}
