// src/components/Projects.jsx
import React from "react";
import { motion } from "framer-motion";
import MotionSection from "./MotionSection";
import { ExternalLink } from "lucide-react";

const projects = [
  {
    title: "Moops Bookstore",
    blurb: "Full-stack social book tracking platform with user auth, reading lists, reviews, and Google Books API integration. Deployed on Heroku + GitHub Pages with MongoDB Atlas.",
    tech: ["React", "TypeScript", "Node.js", "MongoDB"],
    gh: "https://github.com/whoisaldo/MoopBookstore",
    live: "https://whoisaldo.github.io/MoopBookstore",
    featured: true,
  },
  {
    title: "Portfolio",
    blurb: "This site — Vite + React + Tailwind, resume embed, animations, and deploy.",
    tech: ["React", "Vite", "Tailwind"],
    gh: "https://github.com/whoisaldo/Portfolio",
  },
  {
    title: "Exerly-Fitness",
    blurb: "Comprehensive fitness platform with workout tracking, nutrition logging, sleep monitoring, progress analytics, and user authentication. Working on implementing OpenAI's API for 'Exerly Coach' AI assistant.",
    tech: ["React", "Node", "MongoDB"],
    gh: "https://github.com/whoisaldo/Exerly-Fitness",
    live: "https://whoisaldo.github.io/Exerly-Fitness/#/",
    featured: true,
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

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {projects.map((p) => (
          <motion.article
            key={p.title}
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="group relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50
                       bg-white/90 dark:bg-neutral-900/80 backdrop-blur-xl p-8 
                       shadow-lg hover:shadow-2xl transition-all duration-300
                       hover:border-gray-300/50 dark:hover:border-gray-600/50
                       before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r 
                       before:from-indigo-500/5 before:to-purple-500/5 before:opacity-0 
                       hover:before:opacity-100 before:transition-opacity before:duration-300"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                  {p.title}
                </h3>
                <div className="flex items-center gap-3">
                  {p.featured && (
                    <span className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 
                                   text-white px-3 py-1 text-xs font-semibold shadow-sm">
                      Featured
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {p.tech.slice(0, 4).map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-gray-200 dark:border-gray-700 
                               px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400
                               bg-gray-50 dark:bg-gray-800/50 group-hover:bg-indigo-50 
                               dark:group-hover:bg-indigo-900/20 group-hover:border-indigo-300 
                               dark:group-hover:border-indigo-600 transition-all duration-200"
                  >
                    {tech}
                  </span>
                ))}
                {p.tech.length > 4 && (
                  <span className="rounded-full border border-gray-200 dark:border-gray-700 
                                 px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-500
                                 bg-gray-50 dark:bg-gray-800/50">
                    +{p.tech.length - 4} more
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                {p.blurb}
              </p>

              <div className="flex items-center gap-4">
                {p.gh && (
                  <a
                    className="group/link inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                               text-sm font-medium text-gray-700 dark:text-gray-300
                               bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/20
                               hover:text-indigo-600 dark:hover:text-indigo-400
                               transition-all duration-200 hover:scale-105 hover:shadow-md"
                    href={p.gh}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                    </svg>
                    GitHub
                    <svg className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                {p.live && (
                  <a
                    className="group/link inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                               text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500
                               hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 
                               hover:scale-105 hover:shadow-lg"
                    href={p.live}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={16} className="group-hover/link:scale-110 transition-transform duration-200" />
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </MotionSection>
  );
}
