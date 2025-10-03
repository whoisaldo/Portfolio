// src/components/Hero.jsx
import React from "react";
import { Github, Linkedin, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import MotionSection from "./MotionSection";

export default function Hero() {
  // Use base-aware path so resume works on GitHub Pages (/Portfolio/)
  const pdf = import.meta.env.BASE_URL + "resume.pdf";

  return (
    <MotionSection className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 h-64
                    bg-gradient-to-r from-indigo-400/20 via-fuchsia-400/20 to-purple-400/20
                    blur-3xl"
      />
      <div className="max-w-6xl mx-auto px-4 pt-14 pb-10">
        <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          Lebanese-American • Boston, MA • Northeastern ’27
        </p>

        <motion.h1
          className="mt-3 font-display text-4xl sm:text-5xl font-extrabold leading-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Building clean, intuitive software.
        </motion.h1>

        <motion.p
          className="mt-4 max-w-2xl text-neutral-600 dark:text-neutral-300"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Full-stack developer who loves performance, great UX, and shipping fast.
          Passionate about cars, game development, and solving puzzles—on screen and off.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-wrap gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <a
            href="#projects"
            className="group relative rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600
                       px-6 py-3 text-white font-medium shadow-lg hover:shadow-xl 
                       hover:translate-y-[-2px] transition-all duration-300
                       before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-r 
                       before:from-indigo-700 before:to-fuchsia-700 before:opacity-0 
                       hover:before:opacity-100 before:transition-opacity before:duration-300"
          >
            <span className="relative z-10">See Projects</span>
          </a>

          <a
            href={pdf}
            className="group rounded-full border border-gray-200 dark:border-gray-700 
                       px-6 py-3 font-medium text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600
                       hover:translate-y-[-1px] transition-all duration-300 shadow-sm hover:shadow-md"
            download
          >
            Download Resume
          </a>

          <a
            href="https://whoisaldo.github.io/Exerly-Fitness/#/"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 
                       px-5 py-3 font-medium text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600
                       hover:translate-y-[-1px] transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <ExternalLink size={16} className="group-hover:scale-110 transition-transform duration-300" /> 
            Try Exerly
          </a>

          <a
            href="https://github.com/whoisaldo"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 
                       px-5 py-3 font-medium text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600
                       hover:translate-y-[-1px] transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Github size={16} className="group-hover:scale-110 transition-transform duration-300" /> 
            GitHub
          </a>

          <a
            href="https://www.linkedin.com/in/ali-younes-41a2b4296/"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 
                       px-5 py-3 font-medium text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600
                       hover:translate-y-[-1px] transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Linkedin size={16} className="group-hover:scale-110 transition-transform duration-300" /> 
            LinkedIn
          </a>
        </motion.div>
      </div>
    </MotionSection>
  );
}
