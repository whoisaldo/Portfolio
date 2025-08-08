// src/components/Hero.jsx
import React from "react";
import { Github, Linkedin } from "lucide-react";
import { motion } from "framer-motion";
import MotionSection from "./MotionSection";

export default function Hero() {
  return (
    <MotionSection className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-64
                      bg-gradient-to-r from-indigo-400/20 via-fuchsia-400/20 to-purple-400/20
                      blur-3xl" />
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
          Building clean, human-centered software.
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
          className="mt-6 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <a
            href="#projects"
            className="rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600
                       px-5 py-2 text-white shadow-glow hover:translate-y-[-1px] transition"
          >
            See Projects
          </a>
          <a
            href="/resume.pdf"
            className="rounded-full border px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5"
            download
          >
            Download Resume
          </a>
          <a
            href="https://github.com/whoisaldo"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2"
          >
            <Github size={16} /> GitHub
          </a>
          <a
            href="https://linkedin.com/in/aliyounes"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2"
          >
            <Linkedin size={16} /> LinkedIn
          </a>
        </motion.div>
      </div>
    </MotionSection>
  );
}
